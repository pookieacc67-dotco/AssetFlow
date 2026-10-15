// Dynamically resolve API URL: uses VITE_API_BASE_URL if set, or relative path / localhost
const metaEnv = (import.meta as any).env || {};
export const API_BASE_URL = metaEnv.VITE_API_BASE_URL 
  ? (metaEnv.VITE_API_BASE_URL as string).replace(/\/+$/, '') 
  : (metaEnv.DEV ? 'http://localhost:8000' : '');

if (!metaEnv.VITE_API_BASE_URL && !metaEnv.DEV) {
  console.warn(
    "[AssetFlow Advisory] VITE_API_BASE_URL is not configured in Vercel. " +
    "Backend API calls to /api/* will hit this static host unless VITE_API_BASE_URL " +
    "is set to your Railway backend URL (e.g., https://your-railway-app.up.railway.app)."
  );
}

