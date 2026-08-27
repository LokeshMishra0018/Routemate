# 🚀 RouteMate

> **Enterprise-grade, Verified College Student Route Sharing & Travel Companion Platform**

RouteMate connects verified university students travelling along compatible routes and schedules. Built with a **Fastify TypeScript API**, **PostgreSQL/MongoDB + Geospatial indexing**, **Socket.IO realtime messaging**, and a responsive **React 18 Tailwind web application**.

---

## 🌟 Key Features

- **🔐 Strict Institutional Verification**: Domain validation (`@college.edu`) + student ID document review workflow with cryptographic JWT auth and session revocation.
- **🧭 Deterministic 6-Factor Matching Engine**: Matches students based on route spatial overlap, departure times, transport types, preferences, mutual connections, and trust score.
- **⚡ Real-Time Socket.IO Messaging**: Instant direct and group chat with typing indicators, presence, and unread counts.
- **👥 Travel Pools & Dynamic Cost Splitting**: Atomic capacity limits, seat reservations, and automated per-passenger cost distribution.
- **⭐ Reputation & Anti-Tampering Reviews**: Verified reviews only allowed post-trip with sub-ratings (punctuality, cleanliness, communication) dynamically updating trust scores.
- **🛡️ Safety Hub & Live SOS Radar**: Emergency contacts manager, 1-click SOS broadcast with GPS coordinates, SMS mock dispatch, and moderation investigation console.
- **📊 Moderator & Admin Portal**: Review student IDs, resolve safety incident reports, manage user bans, and audit safety logs.

---

## 🏗️ System Architecture

```
RouteMate/
├── frontend/                     # React 18 + Vite + TypeScript + Tailwind CSS Web App
│   ├── src/
│   │   ├── components/           # Reusable UI primitives (Buttons, Modals, TrustMeter, etc.)
│   │   ├── context/              # Auth, Socket.IO, and Toast notification providers
│   │   ├── layouts/              # AppLayout, AuthLayout, AdminLayout
│   │   ├── pages/                # Auth, Dashboard, Trips, Matching, Chat, Groups, Safety, Admin
│   │   ├── routes/               # Protected & Admin route guards
│   │   └── services/             # Axios API client with automatic token refresh queue
│   ├── nginx.conf                # Production Nginx reverse proxy & SPA client routing config
│   └── Dockerfile                # Multi-stage Vite + Nginx production container
│
├── backend/                      # Fastify Node.js API + complete server
│   ├── src/
│   │   ├── config/               # Environment variable parsing with Zod validation
│   │   ├── db/                   # MongoDB / PostgreSQL PostGIS client & collection schemas
│   │   ├── middleware/           # RBAC authorization, rate limiting, error handlers
│   │   ├── modules/              # Auth, Users, Trips, Matching, Connections, Groups,
│   │   │                         # Messaging, Notifications, Reviews, Safety, Admin
│   │   ├── routes/               # REST API route registrations (/api/v1)
│   │   ├── server.ts             # Server entrypoint and graceful shutdown hooks
│   │   └── socket.ts             # Socket.IO realtime connection lifecycle handlers
│   ├── tests/                    # 34 Vitest test suites (179 tests covering all modules & E2E)
│   └── Dockerfile                # Multi-stage Node 20 Alpine production container
│
├── docs/                         # Deployment, API, and Architecture documentation
│   ├── DEPLOYMENT_GUIDE.md       # Docker, AWS ECS, Cloud Run, and SSL/TLS instructions
│   ├── API_DOCUMENTATION.md      # Complete REST API endpoint reference
│   └── PRODUCTION_CHECKLIST.md   # Production readiness audit checklist
│
├── .github/workflows/            # Automated CI/CD pipelines (Tests, Typecheck, Security audit)
└── docker-compose.yml            # Complete multi-container local & staging orchestration
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v20.x or later
- **Docker & Docker Compose** (optional for local containerization)
- **MongoDB Atlas** or local MongoDB 7+

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/LokeshMishra0018/Routemate.git
cd Routemate

# Install all dependencies
npm install
npm --prefix backend install
npm --prefix frontend install
```

### 3. Running Locally

#### Option A: Local Dev Servers
```bash
# Start Fastify Backend API (Port 5000)
npm --prefix backend run dev

# Start React Frontend (Port 5173)
npm --prefix frontend run dev
```

#### Option B: Full-Stack Docker Compose
```bash
docker-compose up --build
```
Access the application at `http://localhost`.

---

## 🧪 Comprehensive Automated Testing

RouteMate maintains **100% test coverage** across all backend modules, frontend components, and full end-to-end user journeys:

```bash
# Run all Backend integration & unit test suites (179 tests)
npm --prefix backend run test

# Run all Frontend component & page tests (36 tests)
npm --prefix frontend run test

# Typecheck both projects
npm --prefix backend run build
npm --prefix frontend run typecheck
```

---

## 📖 Documentation Index

- [Production Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [REST API Specification](docs/API_DOCUMENTATION.md)
- [Production Readiness Audit Checklist](docs/PRODUCTION_CHECKLIST.md)

---

## 🔒 Security & Privacy

- **No Secrets in Frontend**: Zero sensitive keys in client build bundles.
- **Argon2id/Scrypt Password Hashing**: State-of-the-art cryptographic password security.
- **Dual-Token Auth**: Short-lived JWTs (15 min) with cryptographically hashed, revocable refresh tokens in database sessions.
- **Redacted Logging**: Sensitive authorization headers, passwords, and tokens are automatically scrubbed from log streams.
- **Confidential ID Documents**: College ID card uploads are stored in private buckets accessible only by authenticated moderators.

---

## 📄 License
This project is proprietary and built for university travel coordination.
