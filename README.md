# OrrDDM Quote Studio

מערכת מלאה לניהול הצעות מחיר לעסק OrrDDM.

## Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS (RTL Hebrew)
- **Backend:** Node.js + Express
- **Database:** SQLite (better-sqlite3)
- **PDF:** Puppeteer (server-side)
- **Font:** Google Sans Variable

---

## Quick Start (Local Dev)

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Install dependencies
```bash
# From project root:
cd backend && npm install
cd ../frontend && npm install
```

### 2. Seed the database with sample data
```bash
cd backend && npm run seed
```

### 3. Start dev servers (two terminals)
```bash
# Terminal 1 — Backend (port 3001)
cd backend && npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### .env (optional)
Copy `backend/.env.example` to `backend/.env` and adjust:
```
PORT=3001
FRONTEND_URL=http://localhost:5173
```

---

## Production Build (Docker)

```bash
docker-compose up --build -d
```

App available at [http://localhost:3001](http://localhost:3001)

Data persisted in Docker volumes `quote_data` and `quote_uploads`.

---

## Deploy to Railway

1. Push to GitHub
2. Create new Railway project → "Deploy from GitHub repo"
3. Railway auto-detects the `Dockerfile`
4. Set env var: `PORT=3001`
5. Deploy → visit the provided URL

---

## Deploy to Render

1. New Web Service → connect GitHub repo
2. **Runtime:** Docker
3. **Dockerfile path:** `./Dockerfile`
4. **Port:** 3001
5. Add a **Persistent Disk** at `/app/backend/data` (for SQLite)

---

## Features

- **Dashboard** — stats, filterable quotes table, quick actions
- **Quote Builder** — full RTL editor with dynamic sections, pricing calculator, discount, VAT
- **Public View Page** (`/p/:token`) — beautiful read-only quote, client signature, PDF download
- **Templates** — save/load/manage reusable quote templates
- **Settings** — business profile, branding, VAT, defaults for all quote fields
- **PDF Export** — Puppeteer renders the print page server-side

## Project Structure

```
orrddm-quote-studio/
├── backend/
│   ├── src/
│   │   ├── index.js        # Express server
│   │   ├── db.js           # SQLite setup + schema + defaults
│   │   ├── seed.js         # Sample data seed
│   │   └── routes/
│   │       ├── quotes.js   # Quote CRUD + public + sign
│   │       ├── templates.js
│   │       ├── settings.js
│   │       └── pdf.js      # Puppeteer PDF
│   └── data/               # SQLite DB file (auto-created)
├── frontend/
│   └── src/
│       ├── App.jsx          # Router + Settings context
│       ├── api.js           # Axios API client
│       ├── components/      # Layout, StatusBadge, Modal
│       └── pages/
│           ├── Dashboard.jsx
│           ├── QuoteBuilder.jsx
│           ├── QuoteView.jsx   # Public
│           ├── Templates.jsx
│           └── Settings.jsx
├── Dockerfile
├── docker-compose.yml
└── railway.toml
```
