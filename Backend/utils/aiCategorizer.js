'use strict';

// Gemini AI categorizer utility (Node.js CommonJS)
// Env var required: GOOGLE_GENAI_API_KEY

let cachedClient = null;
let cachedModel = null;

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

function buildPrompt(text, categories) {
  return [
    'You are an assistant for classifying citizen municipal issue reports.',
    'Return ONLY the single best matching category name verbatim from the list. If nothing fits, respond with UNKNOWN.',
    `Available categories: ${categories.map(c => c.name).join(', ')}`,
    `Report description: "${text.replace(/\s+/g,' ').slice(0,2000)}"`,
    'Answer:'
  ].join('\n');
}

async function categorizeReportAI(reportText, categories) {
  if (!reportText || !Array.isArray(categories) || categories.length === 0) return null;
  try {
    const model = getModel();
    if (!model.generateContent) throw new Error('Model API unavailable');
    const prompt = buildPrompt(reportText, categories);
    const result = await model.generateContent(prompt);
    const response = await result.response; // newer SDK pattern
    let text = '';
    if (response?.text) {
      text = response.text().trim();
    } else {
      // fallback older shape
      text = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    }
    if (!text) return null;
    const cleaned = text.replace(/^["'`\s]+|["'`\s]+$/g,'').split(/\r?\n|,/)[0].trim();
    if (!cleaned) return null;
    // Try to map to one of provided categories (case-insensitive exact match)
    const match = categories.find(c => c.name.toLowerCase() === cleaned.toLowerCase());
    return match ? match.name : cleaned; // return cleaned even if UNKNOWN or not matched
  } catch (err) {
    console.error('categorizeReportAI error:', err.message);
    return null; // fail soft so app still works
  }
}

module.exports = { categorizeReportAI };
