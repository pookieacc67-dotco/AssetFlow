import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID
};

let app: any;
let auth: any;

// Only initialize if a valid api key exists to prevent crashing on load
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "your-firebase-api-key") {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  } catch (err) {
    console.error("[AssetFlow Firebase] Initialization error:", err);
    app = { options: {} };
    auth = { app: { options: {} } };
  }
} else {
  // Offline/Mock auth fallback
  app = { options: {} };
  auth = { app: { options: {} } };
}

export { app, auth };
