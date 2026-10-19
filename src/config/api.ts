// Dynamically resolve API URL: uses VITE_API_BASE_URL if set, or relative path / localhost
const metaEnv = (import.meta as any).env || {};

function resolveApiBaseUrl(): string {
  let envUrl = (metaEnv.VITE_API_BASE_URL as string || '').trim();
  
  if (!envUrl) {
    return metaEnv.DEV ? 'http://localhost:8000' : '';
  }

  // Remove accidental surrounding quotes
  envUrl = envUrl.replace(/^['"]|['"]$/g, '');

  // Strip trailing slashes
  envUrl = envUrl.replace(/\/+$/, '');

  // If a domain host was provided without protocol (e.g. "web-production-xxx.up.railway.app"),
  // prepend https:// so fetch() does not treat it as a relative URL on static hosting (e.g. Vercel)
  if (envUrl && !/^https?:\/\//i.test(envUrl) && !envUrl.startsWith('/')) {
    envUrl = `https://${envUrl}`;
  }

  return envUrl;
}

export const API_BASE_URL = resolveApiBaseUrl();

if (!metaEnv.VITE_API_BASE_URL && !metaEnv.DEV) {
  console.warn(
    "[AssetFlow Advisory] VITE_API_BASE_URL is not configured in Vercel. " +
    "Backend API calls to /api/* will hit this static host unless VITE_API_BASE_URL " +
    "is set to your Railway backend URL (e.g., https://your-railway-app.up.railway.app)."
  );
}


