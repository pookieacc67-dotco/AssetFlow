<div align="center">

# ⚡ AssetFlow
### *Next-Generation AI-Powered Enterprise Asset & Resource Management System*

[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Gemini AI](https://img.shields.io/badge/Google-Gemini_AI-8E75B2?logo=google&logoColor=white)](https://ai.google.dev/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

<p align="center">
  <b>AssetFlow</b> is an intelligent, full-stack enterprise platform designed to automate physical and digital asset lifecycles, optimize corporate resource bookings with natural language processing, track telemetry and maintenance schedules, and provide autonomous AI-driven recommendations.
</p>

</div>

---

## 📑 Table of Contents
- [✨ Key Features](#-key-features)
- [🏗️ System Architecture](#-system-architecture)
- [🛠️ Tech Stack](#-tech-stack)
- [🚀 Quick Start (Local Setup)](#-quick-start-local-setup)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Environment Variables](#2-environment-variables)
  - [3. Backend Setup (FastAPI)](#3-backend-setup-fastapi)
  - [4. Frontend Setup (React + Vite)](#4-frontend-setup-react--vite)
- [🐳 Docker & Containerization](#-docker--containerization)
- [🗄️ Database Schema & Services](#-database-schema--services)
- [👥 Collaboration & Contributing](#-collaboration--contributing)
- [🛡️ Security & Privacy](#-security--privacy)
- [📄 License](#-license)

---

## ✨ Key Features

### 🤖 1. Autonomous AI Asset Intelligence
- **AI Recommendation Engine:** Powered by Google Gemini AI to analyze user workload requirements (e.g., GPU/RAM/Storage specs) and match the optimal asset instantly.
- **Smart Natural Language Booking:** Book conference rooms, workstations, or hardware using plain English (e.g., *"Reserve room 402 tomorrow from 2 PM to 4 PM for design review"*).
- **Automated Strategic Reports:** Generate executive health summaries and asset depreciation forecasts with a single click.

### 📦 2. Enterprise Asset Lifecycle Management
- **Registration & Telemetry:** Real-time tracking of asset conditions, battery levels, firmware versions, health scores, and physical/GPS locations.
- **Maintenance & Incident Tracking:** Log issues, schedule preventative maintenance, and record technician notes.
- **Multi-Tenant Organizations:** Isolated data structures with organization ID scoping and role-based access control (Admin, Manager, Member, Viewer).

### 🔐 3. Authentication & Security
- **Multi-Provider Firebase Auth:** One-click OAuth with Google and GitHub, plus standard Email/Password authentication.
- **Session Protection:** Automatic token verification with protected API endpoints.

### 💻 4. Modern Desktop-First UX
- **Interactive Dashboards:** Real-time metrics, status breakdowns, and interactive data visualizations.
- **Responsive Advisory:** Smart mobile detection modal guiding users to Desktop Mode on mobile browsers for optimal productivity.

---

## 🏗️ System Architecture

```mermaid
graph TD
    A[React 18 + Vite Frontend] -->|REST API / JSON| B[FastAPI Backend :8000]
    A -->|OAuth / Auth State| C[Firebase Authentication]
    
    B -->|Structured Prompts| D[Google Gemini 2.5 Flash]
    B -->|PostgreSQL / ORM| E[Supabase DB / SQLite Engine]
    
    subgraph Core AI Microservices
        D --> F[Smart Resource Parser]
        D --> G[Asset Recommendation Agent]
        D --> H[Strategic Health Reporter]
    end
    
    subgraph Data Layer
        E --> I[16 Relational Tables]
        I --> J[Assets, Bookings, Telemetry, Audits]
    end
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite |
| **Backend** | Python 3.11+, FastAPI, Uvicorn, Pydantic, SQLAlchemy |
| **AI / LLM** | Google GenAI SDK (`gemini-2.5-flash`) |
| **Database** | Supabase (PostgreSQL) & Local SQLite fallback |
| **Authentication** | Firebase Authentication (Email/Password, Google OAuth, GitHub OAuth) |
| **DevOps / Container** | Docker, Docker Compose, Nginx |

---

## 🚀 Quick Start (Local Setup)

### 1. Clone Repository
```bash
git clone https://github.com/pookieacc67-dotco/AssetFlow.git
cd AssetFlow
```

### 2. Environment Variables
Create your local `.env` file from the provided example template:
```bash
cp .env.example .env
```
Update `.env` with your credentials:
```env
# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Firebase Authentication
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Supabase (Optional for Cloud DB)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
```

---

### 3. Backend Setup (FastAPI)
```bash
# Navigate to backend directory
cd backend

# Create virtual environment (optional)
python -m venv venv

# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend API docs available at: `http://127.0.0.1:8000/docs`*

---

### 4. Frontend Setup (React + Vite)
In a separate terminal window:
```bash
# Install frontend dependencies
npm install

# Start Vite development server
npm run dev
```
*Frontend will be running at: `http://localhost:3001` or `http://localhost:5173`*

---

## 🐳 Docker & Containerization

Run the entire full-stack application with a single command using Docker Compose:

```bash
docker-compose up --build -d
```

- **Frontend:** `http://localhost:3000`
- **Backend API:** `http://localhost:8000`
- **Swagger Docs:** `http://localhost:8000/docs`

To stop all services:
```bash
docker-compose down
```

---

## 🗄️ Database Schema & Services

The platform utilizes a structured 16-table relational schema:
- `organizations` & `organization_members` (Multi-tenancy & RBAC)
- `assets`, `asset_categories`, `asset_locations` (Inventory & Lifecycle)
- `bookings`, `booking_recurrences` (Scheduling & Smart Reservation)
- `telemetry_readings`, `telemetry_alerts` (IoT & Real-Time Monitoring)
- `maintenance_logs`, `issue_reports` (Service & SLA Records)
- `audit_logs` (Security compliance & activity tracking)

*Full SQL schema and migrations are in [`backend/app/db/schema.sql`](backend/app/db/schema.sql).*

---

## 👥 Collaboration & Contributing

We welcome contributions! To maintain a clean and collaborative codebase:

1. **Fork or Branch:**
   ```bash
   git checkout -b feature/amazing-feature
   ```
2. **Commit your changes:**
   ```bash
   git commit -m "feat: implement asset telemetry charts"
   ```
3. **Push to branch:**
   ```bash
   git push origin feature/amazing-feature
   ```
4. **Open a Pull Request** on GitHub.

---

## 🛡️ Security & Privacy
- Sensitive credentials (`.env`, private keys) are strictly excluded from version control.
- Role-Based Access Control (RBAC) ensures strict data separation across tenant organizations.

---

## 📄 License
This project is licensed under the **MIT License** — feel free to use and extend for personal or commercial projects.

---

<div align="center">
  <b>Built with ❤️ by the AssetFlow Team</b>
</div>
