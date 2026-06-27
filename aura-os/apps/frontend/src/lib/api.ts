import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Read token synchronously from the store's current state first,
    // falling back to localStorage only on initial load.
    const state = useAuthStore.getState();
    const token = state.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // Fallback: read from localStorage for initial page load
      try {
        const stored = localStorage.getItem('aura-auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.state?.accessToken) {
            config.headers.Authorization = `Bearer ${parsed.state.accessToken}`;
          }
        }
      } catch {
        // ignore parse errors
      }
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        // Clear auth store first to prevent token refresh loops
        useAuthStore.getState().logout();
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
