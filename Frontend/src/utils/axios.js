'use strict';

import Axios from 'axios';

// Support both CRA-style and Vite-style env vars with sensible fallback
const baseURL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) 
  || process.env.REACT_APP_API_URL 
  || 'http://localhost:5000/api';

const api = Axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  },
  withCredentials: false
});

// Request interceptor (add hooks for future auth headers if needed)
api.interceptors.request.use(
  (config) => {
    // Example: attach additional headers if needed later
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('[API ERROR]', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('[API ERROR] No response received', error.message);
    } else {
      console.error('[API ERROR] Request setup error', error.message);
    }
    return Promise.reject(error);
  }
);

export { baseURL };
export default api;
