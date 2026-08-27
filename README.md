# RouteMate

> Intelligent travel companions for verified college students.

## Architecture

RouteMate is built as a modular full-stack application:
- `backend/`: Node.js + Fastify + TypeScript + MongoDB Atlas + Socket.IO (Complete Server & API)
- `frontend/`: React + Vite + TypeScript (Phase 8)

## Quick Start (Phase 1 Backend Foundation)

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
In development, safe local defaults (`mongodb://127.0.0.1:27017`) are applied. In production, `MONGODB_URI` and `MONGODB_DB_NAME` are strictly required.

### 3. Run Development Server
```bash
npm run dev
```

The server starts on `http://localhost:4000`.

### 4. Run Tests & Quality Checks
```bash
npm test
npm run typecheck
npm run lint
npm run build
```
