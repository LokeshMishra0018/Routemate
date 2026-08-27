# RouteMate Architecture

## 1. System Overview

RouteMate is built as a modular monolith web application designed to connect verified college students travelling on compatible routes.

```text
                    RouteMate System
                           |
        ┌──────────────────┴──────────────────┐
        │                                     │
    frontend/                              backend/
(React + Vite + TS)                  (Fastify + Node.js + TS)
        │                                     │
        └──────────── HTTPS / WSS ────────────┘
                                              │
                                        MongoDB Atlas
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
                  Redis                 Object Storage              Socket.IO
          (Rate Limit / Cache)        (Private Documents)          (Realtime)
```

## 2. Backend Directory Structure (`backend/`)

```text
backend/
├── src/
│   ├── config/             # Zod-validated environment config
│   ├── db/                 # MongoDB client, collections, indexes, seed scripts
│   ├── lib/                # Socket.IO & third-party service abstractions
│   ├── middleware/         # Error handler, 404 handler, request logging
│   ├── plugins/            # Fastify security & validation plugins
│   ├── routes/             # Health, ready, API v1 routes
│   ├── utils/              # Standardized response & custom error classes
│   ├── app.ts              # Fastify application factory (testable without port binding)
│   └── server.ts           # Production server entrypoint
├── tests/
│   ├── unit/               # Config, error handling, index definitions
│   └── integration/        # Health, readiness, security, validation
├── package.json
├── tsconfig.json
└── .env.example
```

## 3. Key Design Principles

1. **Backend-First & Modular Structure:** All server-side business logic, validation, and security reside in `backend/`.
2. **Layered Separation:** Route → Validation → Handler → Service → Repository → MongoDB.
3. **Fail-Safe Startup & Degradation:** Server validates all configuration at startup and performs graceful degradation and shutdown.
4. **Defensive Validation:** Zod schemas validate every API boundary.
5. **Standardized Responses:** All endpoints return `{ success: true, data: ... }` or `{ success: false, error: { code, message, details } }`.
