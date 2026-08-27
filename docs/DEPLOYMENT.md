# RouteMate Deployment Guide

## 1. Backend Service (`backend/`)

### Runtime Requirements
- Node.js >= 20.x LTS
- MongoDB Atlas cluster (MongoDB >= 6.0)
- Optional Redis instance (for distributed caching and multi-instance rate limiting)

### Environment Configuration
Configure the following in your production environment / orchestrator:

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Listening port | `4000` |
| `HOST` | Binding address | `0.0.0.0` |
| `MONGODB_URI` | MongoDB Atlas Connection String | `mongodb+srv://...` |
| `MONGODB_DB_NAME` | Database name | `routemate_prod` |
| `CORS_ORIGIN` | Allowed web origins | `https://routemate.app` |
| `SOCKET_CORS_ORIGIN` | Allowed Socket.IO origins | `https://routemate.app` |
| `LOG_LEVEL` | Pino log level | `info` |

### Production Build & Execution
```bash
cd backend
npm install --omit=dev
npm run build
npm start
```
