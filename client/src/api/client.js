// ============================================================
//  One shared axios instance for every API call.
//  It automatically adds the login token to each request.
// ============================================================
import axios from 'axios';

// Comes from client/.env (Vite only exposes vars starting with VITE_).
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ---------- Token storage ----------
// Wrapped in try/catch because localStorage can throw
// (e.g. some private-browsing modes block it).
const TOKEN_KEY = 'bhr_token';

export const tokenStorage = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* ignore - user just won't stay logged in after refresh */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

// ---------- The axios instance ----------
const api = axios.create({ baseURL: `${API_URL}/api` });

// Runs before EVERY request: attach "Authorization: Bearer <token>".
api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Turns any axios error into a friendly sentence for the UI.
export function getErrorMessage(err) {
  if (err.response?.data?.message) return err.response.data.message; // our server's message
  if (err.request) return 'Cannot reach the server. Is the backend running?';
  return err.message || 'Something went wrong';
}

export default api;
