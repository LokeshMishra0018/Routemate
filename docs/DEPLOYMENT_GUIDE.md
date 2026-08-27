# RouteMate Production Deployment Guide

This manual covers production infrastructure orchestration, Docker container deployment, environment configurations, security hardening, and monitoring for RouteMate.

---

## 1. Architecture Overview

```
                          [ Internet Traffic ]
                                   │
                                   ▼
                   [ Nginx Web Server / SSL Termination ]
                           (Port 80 / Port 443)
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
   [ React SPA Frontend ]                    [ Fastify Node.js API ]
   (Static Assets in Nginx)                  (Port 5000 / PM2 / Docker)
                                                        │
                                    ┌───────────────────┴───────────────────┐
                                    ▼                                       ▼
                       [ PostgreSQL + PostGIS ]                    [ Redis 7+ Cache ]
                         (Geospatial Engine)                      (Presence & Queues)
```

---

## 2. Production Environment Configuration

Create a `.env.production` in both `backend/` and `frontend/` (or pass via cloud environment variables):

### Backend Environment Variables (`backend/.env.production`)
```ini
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://routemate_admin:SECURE_PASSWORD@pg-host:5432/routemate_prod?schema=public&sslmode=require

# Redis
REDIS_URL=rediss://default:SECURE_REDIS_PASSWORD@redis-host:6379

# Cryptography & Security
JWT_SECRET=super_secret_jwt_random_key_min_32_chars_2026!
JWT_REFRESH_SECRET=super_secret_refresh_jwt_random_key_min_32_chars_2026!
COOKIE_SECRET=super_secret_cookie_random_key_min_32_chars_2026!

# CORS
CORS_ORIGIN=https://routemate.app,https://www.routemate.app

# Storage
STORAGE_PROVIDER=s3
AWS_REGION=ap-south-1
AWS_BUCKET_NAME=routemate-private-documents
AWS_ACCESS_KEY_ID=your_key_id
AWS_SECRET_ACCESS_KEY=your_secret_key

# Email Provider
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=noreply@routemate.app

# SMS & Emergency Dispatch
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
```

### Frontend Environment Variables (`frontend/.env.production`)
```ini
VITE_API_URL=https://api.routemate.app
VITE_SOCKET_URL=https://api.routemate.app
```

---

## 3. Docker Container Deployment

### Local Staging with Docker Compose
```bash
# 1. Build and start all services in detached mode
docker-compose up --build -d

# 2. View running containers and health status
docker-compose ps

# 3. View real-time logs
docker-compose logs -f backend
```

### Standalone Production Docker Builds

#### Backend Image
```bash
docker build -t routemate/backend:latest ./backend
docker run -d \
  --name routemate-backend \
  --restart always \
  -p 5000:5000 \
  --env-file backend/.env.production \
  routemate/backend:latest
```

#### Frontend Image
```bash
docker build -t routemate/frontend:latest ./frontend
docker run -d \
  --name routemate-frontend \
  --restart always \
  -p 80:80 \
  routemate/frontend:latest
```

---

## 4. Cloud Platform Deployments

### A. AWS ECS (Elastic Container Service) with Fargate
1. Push images to AWS ECR (`aws ecr get-login-password`, `docker push`).
2. Provision RDS PostgreSQL with PostGIS extension enabled (`CREATE EXTENSION postgis;`).
3. Provision ElastiCache Redis cluster.
4. Deploy Application Load Balancer with ACM SSL/TLS certificates routing `/api/*` and `/socket.io/*` to Backend Fargate service and `/*` to Frontend service.

### B. Google Cloud Run
```bash
# Deploy Backend
gcloud run deploy routemate-backend \
  --image gcr.io/YOUR_PROJECT/routemate-backend:latest \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,PORT=5000

# Deploy Frontend
gcloud run deploy routemate-frontend \
  --image gcr.io/YOUR_PROJECT/routemate-frontend:latest \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated
```

---

## 5. Security & Maintenance Checklist

1. **SSL/TLS**: Ensure HTTP Strict Transport Security (HSTS) is enabled with a minimum 1-year max-age.
2. **Rate Limiting**: Rate limit profile `/api/v1/auth/*` to max 10 requests per minute per IP to protect against brute-force attacks.
3. **Database Backups**: Schedule daily automated point-in-time recovery (PITR) snapshots in PostgreSQL.
4. **Log Redaction**: Verify that sensitive authorization tokens and passwords are automatically redacted from production log streams.
