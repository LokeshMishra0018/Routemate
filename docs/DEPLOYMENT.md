# RouteMate Deployment Guide

## 1. Backend Service (`backend/`)

### Runtime Requirements
- Node.js >= 20.x LTS
- MongoDB Atlas cluster (MongoDB >= 6.0)
- Optional Redis instance (for distributed caching and multi-instance rate limiting)

### Environment Configuration
Configure the following in your production environment / orchestrator:

| Variable | Description | Requirement | Example |
|---|---|---|---|
| `NODE_ENV` | Environment mode | Required | `production` |
| `PORT` | Listening port | Optional (Default: `4000`) | `4000` |
| `HOST` | Binding address | Optional (Default: `0.0.0.0`) | `0.0.0.0` |
| `MONGODB_URI` | MongoDB Atlas Connection String | **Required in Production** | `mongodb+srv://user:pass@cluster.mongodb.net` |
| `MONGODB_DB_NAME` | Database name | **Required in Production** | `routemate_prod` |
| `CORS_ORIGIN` | Allowed web origins (no wildcard `*` in prod) | Required in Production | `https://routemate.app` |
| `SOCKET_CORS_ORIGIN` | Allowed Socket.IO origins (no wildcard `*` in prod) | Required in Production | `https://routemate.app` |
| `RATE_LIMIT_MAX` | Max requests per time window | Optional (Default: `100`) | `100` |
| `RATE_LIMIT_TIME_WINDOW_MS` | Rate limit window in ms | Optional (Default: `60000`) | `60000` |
| `RATE_LIMIT_ALLOW_LIST` | Comma-separated allowlist IPs | Optional (Default: empty) | `10.0.0.1,10.0.0.2` |
| `LOG_LEVEL` | Pino log level | Optional (Default: `info`) | `info` |

### Production Startup vs. Development Mode
- **Production (`NODE_ENV=production`):** `MONGODB_URI` and `MONGODB_DB_NAME` are strictly enforced. If MongoDB fails to connect on startup, the process halts (`process.exit(1)`).
- **Development/Test (`NODE_ENV=development` / `NODE_ENV=test`):** Uses safe local defaults (`mongodb://127.0.0.1:27017`). If MongoDB is not running locally, the server logs a warning and boots in degraded mode, with `GET /health` responding 200 and `GET /ready` reporting 503.

### Production Build & Execution
```bash
cd backend
npm install --omit=dev
npm run build
npm start
```
