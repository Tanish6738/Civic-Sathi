"use strict";

// Gemini AI categorizer utility (Node.js CommonJS)
// Env var required: GOOGLE_GENAI_API_KEY

let cachedClient = null;
let cachedModel = null;

// Lazy require for DB models only when extended info requested to avoid circular / startup cost
let DepartmentModel = null;

function initClient() {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GOOGLE_GENAI_API_KEY');
  }
  // Correct package & class
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  cachedClient = new GoogleGenerativeAI(apiKey);
  return cachedClient;
}

function getModel() {
  if (cachedModel) return cachedModel;
  const client = initClient();
  cachedModel = client.getGenerativeModel({ model: 'gemini-2.0-flash' });
  return cachedModel;
}

function buildPrompt(text, categories, { multi = false, max = 3 }) {
  const baseLines = [
    'You are an assistant for classifying citizen municipal issue reports.',
    `Available categories: ${categories.map(c => c.name).join(', ')}`,
    `Report description: "${text.replace(/\s+/g, ' ').slice(0, 2000)}"`
  ];
  if (!multi) {
    baseLines.push(
      'Return ONLY the single best matching category name verbatim from the list. If nothing fits, respond with UNKNOWN.',
      'Answer:'
    );
  } else {
    baseLines.push(
      `Return a comma-separated list (no bullets, no extra words) of up to ${max} category names (verbatim) ranked by relevance (best first).`,
      'If none fit, respond with UNKNOWN. Do not include explanations.',
      'Answer:'
    );
  }
  return baseLines.join('\n');
}

/**
 * Categorize a report via Gemini model.
 * Backwards compatible: default return (no options.includeOfficerContact/includeSuggestions) is a string category name (or null / UNKNOWN fallback).
 * When opts.includeOfficerContact = true, returns an object:
 *   { category, officerContact, raw }
 * When opts.includeSuggestions = true, returns an extended object:
 *   { category, officerContact, officers?, suggestions: [{id,name}], raw }
 *   - category: primary (first) suggestion
 *   - suggestions: ordered list up to maxSuggestions (includes primary first)
 *   - officers: array of all officers (if includeAllOfficers true) for departments owning suggested categories
 *   - officerContact: first officer with phone from primary category's department
 * Officer contact chosen as the first officer in the owning department having a phone number.
 * @param {string} reportText
 * @param {Array<{_id:any,name:string}>} categories
 * @param {Object} [opts]
 * @param {boolean} [opts.includeOfficerContact=false]
 * @param {boolean} [opts.includeSuggestions=false]
 * @param {number} [opts.maxSuggestions=3]
 * @param {boolean} [opts.includeAllOfficers=false]
 */
async function categorizeReportAI(reportText, categories, opts = {}) {
  if (!reportText || !Array.isArray(categories) || categories.length === 0) {
    if (opts.includeOfficerContact || opts.includeSuggestions) {
      return { category: null, officerContact: null, suggestions: [], raw: null };
    }
    return null;
  }
  const {
    includeOfficerContact = false,
    includeSuggestions = false,
    maxSuggestions = 3,
    includeAllOfficers = false
  } = opts;
  try {
    const model = getModel();
    if (!model.generateContent) throw new Error("Model API unavailable");
    const prompt = buildPrompt(reportText, categories, { multi: includeSuggestions, max: Math.min(Math.max(maxSuggestions,1),10) });
    const result = await model.generateContent(prompt);
    const response = await result.response; // newer SDK pattern
    let text = "";
    if (response?.text) {
      text = response.text().trim();
    } else {
      // fallback older shape
      text = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    }
    if (!text) {
      if (includeOfficerContact || includeSuggestions) return { category: null, officerContact: null, suggestions: [], raw: null };
      return null;
    }
    const cleanedAll = text.replace(/^["'`\s]+|["'`\s]+$/g, "").replace(/\s+/g, ' ');

    // Build suggestions list if requested
    let suggestionNames = [];
    if (includeSuggestions) {
      suggestionNames = cleanedAll.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
    } else {
      suggestionNames = [cleanedAll.split(/\r?\n|,/)[0].trim()];
    }
    // Normalize & map to known categories (case-insensitive exact match)
    const lowerToCat = new Map(categories.map(c => [c.name.toLowerCase(), c]));
    const matchedCats = [];
    for (const name of suggestionNames) {
      const key = name.toLowerCase();
      if (lowerToCat.has(key) && !matchedCats.find(mc => mc._id.equals(lowerToCat.get(key)._id))) {
        matchedCats.push(lowerToCat.get(key));
      } else if (name.toUpperCase() === 'UNKNOWN' && !matchedCats.length) {
        // treat UNKNOWN as no match
      }
      if (matchedCats.length >= maxSuggestions) break;
    }
    const primary = matchedCats[0] || null;

    if (!includeOfficerContact && !includeSuggestions) {
      // Original simple return path
      return primary ? primary.name : (suggestionNames[0] || null);
    }

    // Officer data lookups
    let officerContact = null;
    let allOfficers = [];
    if (primary || (includeAllOfficers && matchedCats.length)) {
      try {
        if (!DepartmentModel) DepartmentModel = require("../models/Department");
        // Fetch departments for all matched categories (unique category ids)
        const catIds = matchedCats.map(c => c._id);
        if (catIds.length) {
          const depts = await DepartmentModel.find({ categories: { $in: catIds } })
            .populate('officers', 'name phone email');
          for (const dept of depts) {
            if (Array.isArray(dept.officers)) {
              for (const o of dept.officers) {
                if (includeAllOfficers) {
                  if (!allOfficers.find(x => String(x.id) === String(o._id))) {
                    allOfficers.push({ id: o._id, name: o.name, phone: o.phone, email: o.email });
                  }
                }
                if (!officerContact && primary && dept.categories.find(cid => String(cid) === String(primary._id))) {
                  if (o.phone) {
                    officerContact = { id: o._id, name: o.name, phone: o.phone, email: o.email };
                  }
                }
              }
            }
          }
        }
      } catch (depErr) {
        console.error('categorizeReportAI department lookup error:', depErr.message);
      }
    }

    const resultObj = {
      category: primary ? primary.name : (suggestionNames[0] || null),
      officerContact: officerContact,
      raw: cleanedAll
    };
    if (includeSuggestions) {
      resultObj.suggestions = matchedCats.map(c => ({ id: c._id, name: c.name }));
    }
    if (includeAllOfficers) {
      resultObj.officers = allOfficers;
    }
    return resultObj;
  } catch (err) {
    console.error("categorizeReportAI error:", err.message);
    if (includeOfficerContact || includeSuggestions) return { category: null, officerContact: null, suggestions: [], raw: null };
    return null; // fail soft
  }
}

module.exports = { categorizeReportAI };
