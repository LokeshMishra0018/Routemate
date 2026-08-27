# RouteMate

> Intelligent travel companions for verified college students.

## Architecture

RouteMate is built as a modular full-stack application:
- `backend/`: Node.js + Fastify + TypeScript + MongoDB Atlas + Socket.IO (Complete Server & API)
- `frontend/`: React + Vite + TypeScript (Phase 8)

## Quick Start (Phase 1 Backend)

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
Ensure `MONGODB_URI` and `MONGODB_DB_NAME` are configured.

### 3. Run Development Server
```bash
npm run dev
```

The server starts on `http://localhost:4000`.

### 4. Run Tests & Type Checks
```bash
npm test
npm run typecheck
npm run lint
```
