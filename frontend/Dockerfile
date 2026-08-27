# ==========================================
# RouteMate Frontend - Multi-Stage Dockerfile
# ==========================================

# Stage 1: Build static bundle with Vite
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code and build config
COPY index.html vite.config.ts tsconfig.json tailwind.config.js postcss.config.js ./
COPY public ./public/
COPY src ./src/

# Build production bundle in dist/
RUN npm run build

# ==========================================
# Stage 2: Serve via Nginx Alpine
# ==========================================
FROM nginx:1.25-alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration with SPA fallback & reverse proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose web server port
EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
