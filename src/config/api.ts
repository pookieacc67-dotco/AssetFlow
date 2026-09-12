// Dynamically resolve API URL: uses VITE_API_BASE_URL if set, or relative path / localhost
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL 
  ? (import.meta.env.VITE_API_BASE_URL as string).replace(/\/+$/, '') 
  : (import.meta.env.DEV ? 'http://localhost:8000' : '');
