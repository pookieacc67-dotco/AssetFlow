# 🚀 AssetFlow Professional Production Deployment Guide

This guide walks you through deploying **AssetFlow** with zero errors, following industry best practices:
- **Frontend (React + Vite + Tailwind CSS):** Deployed to **[Vercel](https://vercel.com)**
- **Backend (FastAPI + Python 3.11/3.13 + Uvicorn):** Deployed to **[Railway](https://railway.app)**
- **Database:** Supabase PostgreSQL, Railway PostgreSQL plugin, or persistent SQLite engine
- **Authentication:** Firebase Authentication

---

## 🏗️ Architecture Overview

```mermaid
flowchart LR
    User[End User / Browser] -->|HTTPS| Vercel[Vercel: React Vite Frontend]
    Vercel -->|REST API / JSON| Railway[Railway: FastAPI Backend]
    Vercel -->|Auth Tokens / OAuth| Firebase[Firebase Authentication]
    Railway -->|GenAI Calls| Gemini[Google Gemini AI]
    Railway -->|SQL Queries| DB[(PostgreSQL / SQLite)]
```

---

## 📋 Pre-Flight Checklist

Before you deploy, verify your local code builds without any syntax or type errors:

```bash
# 1. Verify TypeScript types and linting
npm run lint

# 2. Test the production frontend build
npm run build

# 3. Test backend syntax
python -c "import main; print(main.app)"
```

---

## Step 1: Push Your Code to GitHub

Make sure all changes are committed and pushed to your remote GitHub repository:

```bash
git add .
git commit -m "chore: configure production deployment for Vercel and Railway"
git push origin main
```

---

## Step 2: Deploy Backend to Railway

> **Deploy the backend first** so you obtain your live Railway backend URL to supply to the frontend.

### 2.1 Create Railway Project
1. Log in to **[Railway.app](https://railway.app)**.
2. Click **"+ New Project"** -> **"Deploy from GitHub repo"**.
3. Select your **AssetFlow** repository.
4. Click **"Deploy Now"**.

### 2.2 Configure Build & Start Settings
Railway will automatically read [`railway.json`](railway.json) and [`nixpacks.toml`](nixpacks.toml) configured in this repository:
- **Builder:** `NIXPACKS` (Python provider configured in `nixpacks.toml`)
- **Start Command:** `sh start.sh`

*(Alternative: If you prefer Docker, in Service Settings -> Build -> set Builder to **Dockerfile** with path `backend/Dockerfile`)*.

### 2.3 Set Backend Environment Variables in Railway
Navigate to your Railway service -> **"Variables"** tab, and add:

| Variable Name | Required | Description / Example |
|---|---|---|
| `GEMINI_API_KEY` | **Yes** | Your Google Gemini API Key from [AI Studio](https://aistudio.google.com/) |
| `DATABASE_URL` | *Optional* | `postgresql://postgres:password@host:5432/postgres` (if using Supabase or Railway Postgres plugin). Leave empty to use SQLite. |
| `ALLOWED_ORIGINS` | *Optional* | `*` (default allows all Vercel domains) or comma-separated: `https://your-app.vercel.app,http://localhost:5173` |

*(Tip: To attach a PostgreSQL database on Railway, click **"+ New"** in your Railway project canvas -> **"Database"** -> **"Add PostgreSQL"**. Railway automatically connects the `DATABASE_URL` variable to your service!)*

### 2.4 Generate Public Domain
1. In your Railway service, go to **"Settings"** -> **"Networking"** -> **"Public Networking"**.
2. Click **"Generate Domain"**.
3. Copy the URL (for example: `https://assetflow-production.up.railway.app`).

### 2.5 Verify Backend Deployment
Open your browser and navigate to:
- `https://your-backend.up.railway.app/api/health` -> should return `{"status":"healthy","service":"AssetFlow","version":"1.0.0"}`
- `https://your-backend.up.railway.app/docs` -> interactive Swagger documentation

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Import Project into Vercel
1. Log in to **[Vercel](https://vercel.com)**.
2. Click **"Add New..."** -> **"Project"**.
3. Select your **AssetFlow** GitHub repository and click **"Import"**.

### 3.2 Configure Build & Output Settings
Vercel automatically detects **Vite**:
- **Framework Preset:** `Vite`
- **Root Directory:** `./`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

### 3.3 Set Frontend Environment Variables in Vercel
Expand **"Environment Variables"** in the Vercel setup wizard, and add:

| Variable Name | Value / Description |
|---|---|
| `VITE_API_BASE_URL` | **`https://your-backend.up.railway.app`** *(your Railway URL without trailing slash)* |
| `VITE_FIREBASE_API_KEY` | Your Firebase API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Your Firebase Auth Domain (`project-id.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | Your Firebase Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Your Firebase Storage Bucket (`project-id.firebasestorage.app`) |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Your Firebase Messaging Sender ID |
| `VITE_FIREBASE_APP_ID` | Your Firebase App ID |

### 3.4 Deploy
Click **"Deploy"**. Vercel will install dependencies, build the Vite bundle, and deploy your site to global edge CDN in under 1 minute.
Your live site will be ready at: `https://assetflow-xxx.vercel.app`.

---

## Step 4: Post-Deployment Security & Integration

### 4.1 Authorize Vercel Domain in Firebase
To allow users to sign in with Google OAuth / Email on your Vercel URL:
1. Go to the **[Firebase Console](https://console.firebase.google.com/)**.
2. Select your project -> **"Authentication"** -> **"Settings"** tab.
3. Click **"Authorized domains"**.
4. Click **"Add domain"** and enter your Vercel domain (e.g. `your-app.vercel.app`).

---

## 🛠️ Troubleshooting & Professional FAQ

### 1. "Unexpected token '<', '<!doctype '... is not valid JSON"
- **Cause:** `VITE_API_BASE_URL` is missing or incorrect in Vercel, so requests hit Vercel's static router instead of Railway, returning `index.html`.
- **Fix:** In Vercel -> Project Settings -> Environment Variables, ensure `VITE_API_BASE_URL` is set to `https://your-railway-app.up.railway.app` (no trailing slash). Then trigger a redeploy.

### 2. "CORS error: No 'Access-Control-Allow-Origin' header is present"
- **Cause:** Wildcard origin conflicts with credential mode or backend blocked the domain.
- **Fix:** AssetFlow's `backend/app/main.py` is configured with regex reflection (`https?://.*`) to support all Vercel subdomains dynamically. If you set `ALLOWED_ORIGINS` manually in Railway, ensure your exact Vercel production domain is included.

### 3. Railway "Application failed to respond" / Port Mismatch
- **Cause:** Railway assigns a random dynamic port through `$PORT`.
- **Fix:** Both [`start.sh`](start.sh) and [`backend/Dockerfile`](backend/Dockerfile) bind dynamically to `${PORT:-8000}`, guaranteeing compatibility.

### 4. Database Persistence on Railway
- **Option A (Recommended):** Add a PostgreSQL plugin inside Railway, which automatically sets `DATABASE_URL`.
- **Option B (Supabase):** Set `DATABASE_URL` in Railway variables to your Supabase PostgreSQL connection string.
- **Option C (SQLite):** Add a Railway Volume mounted to `/app` or `/app/backend` to persist `assetflow.db` across redeploys.
