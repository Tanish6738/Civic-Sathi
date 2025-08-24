'use strict';

import Axios from 'axios';

// Base URL resolution
// Priority:
// 1. Explicit env (VITE_API_URL or REACT_APP_API_URL)
// 2. Production heuristic (served from vercel domain) -> use Render backend
// 3. Local fallback http://localhost:3001/api
const PROD_BACKEND = 'https://civic-sathi-backend.onrender.com';
function resolveBaseURL(){
  const explicit = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
    || process.env.REACT_APP_API_URL;
  if (explicit) return normalize(explicit);
  if (typeof window !== 'undefined') {
    const host = window.location.host;
    if (/civic-sathi-v2\.vercel\.app$/i.test(host)) {
      return `${PROD_BACKEND}/api`;
    }
  }
  return 'http://localhost:3001/api';
}
function normalize(u){
  // ensure single /api suffix (backend mounts routes at /api/...)
  if (!/https?:/i.test(u)) return u; // leave untouched if malformed / relative env
  const trimmed = u.replace(/\/$/, '');
  if (/\/api$/i.test(trimmed)) return trimmed; // already ends with /api
  if (/\/api\//i.test(trimmed)) return trimmed; // already contains /api/
  return trimmed + '/api';
}
const baseURL = resolveBaseURL();
if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
  console.info('[API] Base URL resolved to:', baseURL);
}

const api = Axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  },
  // Allow cookie auth if explicitly enabled (e.g. VITE_API_WITH_CREDENTIALS=true)
  withCredentials: !!(typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_WITH_CREDENTIALS)
});

// Helper to ensure absolute URL (prevents accidental same‑origin fallback like http://localhost:3000)
function absolutize(config){
  try {
    const url = config.url || '';
    // If url already absolute, leave as is.
    if (/^https?:\/\//i.test(url)) return config;
    // Build absolute from instance baseURL
    const root = config.baseURL || baseURL;
    const abs = new URL(url.replace(/^\//,'') , root.endsWith('/') ? root : root + '/').toString();
    config.url = abs; // set absolute so devtools shows full intended target
  } catch(_) { /* noop */ }
  return config;
}

// Simple token storage for clerk id (can be replaced with context)
let currentClerkId = null;
export function setClerkId(id){ currentClerkId = id; }

// Request interceptor with basic dev logging
api.interceptors.request.use(
  (config) => {
    absolutize(config);
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      console.debug('[API REQUEST]', config.method?.toUpperCase(), config.url, config.data || '');
    }
    if (currentClerkId && !config.headers['x-clerk-id']) {
      config.headers['x-clerk-id'] = currentClerkId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => {
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      console.debug('[API RESPONSE]', response.config.method?.toUpperCase(), response.config.url, '->', response.status);
    }
    return response;
  },
  (error) => {
    const method = error.config?.method?.toUpperCase();
    const url = error.config?.url;
    if (error.response) {
      console.error('[API ERROR]', method, url, '->', error.response.status, error.response.data);
    } else if (error.request) {
      // Detect ad / privacy blocker signature
      const blocked = /ERR_BLOCKED_BY_CLIENT/i.test(error.message) || (error.code === 'ERR_BLOCKED_BY_CLIENT');
      if (blocked) {
        console.error('[API ERROR] Blocked by client extension (ad/privacy blocker?)', method, url, error.message);
      } else {
        console.error('[API ERROR] No response received', method, url, error.message);
      }
    } else {
      console.error('[API ERROR] Request setup error', error.message);
    }
    return Promise.reject(error);
  }
);

// Lightweight retry helper (ex: apiRetry(() => api.get('/foo')))
export async function apiRetry(fn, { retries = 2, delay = 400 } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try { return await fn(); } catch (e) {
      lastErr = e;
      if (i === retries) break;
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
  throw lastErr;
}

export { baseURL };
export default api;
