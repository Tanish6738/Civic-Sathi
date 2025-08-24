'use strict';

import Axios from 'axios';

// Support both env styles; backend server.js defaults to 3001 so use that as fallback.
const baseURL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
  || process.env.REACT_APP_API_URL
  || 'http://localhost:3001/api';

const api = Axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  },
  withCredentials: false
});

// Simple token storage for clerk id (can be replaced with context)
let currentClerkId = null;
export function setClerkId(id){ currentClerkId = id; }

// Request interceptor with basic dev logging
api.interceptors.request.use(
  (config) => {
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      console.debug('[API REQUEST]', config.method?.toUpperCase(), config.baseURL + config.url, config.data || '');
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
    if (error.response) {
      console.error('[API ERROR]', error.config?.method?.toUpperCase(), error.config?.url, '->', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('[API ERROR] No response received', error.config?.method?.toUpperCase(), error.config?.url, error.message);
    } else {
      console.error('[API ERROR] Request setup error', error.message);
    }
    return Promise.reject(error);
  }
);

export { baseURL };
export default api;
