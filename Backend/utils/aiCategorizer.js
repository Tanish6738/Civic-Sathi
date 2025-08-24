'use strict';

// Google Gemini AI categorizer utility
// Requires env var: GOOGLE_GENAI_API_KEY

let client = null;

async function getClient() {
  if (client) return client;
  try {
    const { GoogleGenerativeAI } = require('@google/genai');
    client = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || '');
    return client;
  } catch (err) {
    console.error('Failed to init GoogleGenerativeAI client:', err.message);
    throw new Error('AI client init failed');
  }
}

function buildPrompt(text, categories) {
  return `You are an assistant for classifying citizen municipal issue reports.\n` +
    `Return ONLY the single best matching category name verbatim from the provided list.\n` +
    `If nothing fits, respond with "UNKNOWN".\n\n` +
    `Available categories: ${categories.map(c => c.name).join(', ')}\n` +
    `Report description: "${text.replace(/\n+/g,' ').slice(0,2000)}"\n` +
    `Answer:`;
}

async function categorizeReportAI(reportText, categories) {
  if (!reportText || !Array.isArray(categories) || categories.length === 0) return null;
  try {
    const genAI = await getClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = buildPrompt(reportText, categories);
    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.().trim();
    if (!text) return null;
    // Clean output (handle quotes / punctuation)
    return text.replace(/^['"`\s]+|['"`\s]+$/g,'').split(/\n|,/)[0].trim();
  } catch (err) {
    console.error('categorizeReportAI error:', err.message);
    return null; // fail soft
  }
}

module.exports = { categorizeReportAI };
