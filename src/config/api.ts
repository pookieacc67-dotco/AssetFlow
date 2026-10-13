// Dynamically resolve API URL: uses VITE_API_BASE_URL if set, or relative path / localhost
const metaEnv = (import.meta as any).env || {};
export const API_BASE_URL = metaEnv.VITE_API_BASE_URL 
  ? (metaEnv.VITE_API_BASE_URL as string).replace(/\/+$/, '') 
  : (metaEnv.DEV ? 'http://localhost:8000' : '');

