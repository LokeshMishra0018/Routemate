# ==========================================
# RouteMate Backend - Multi-Stage Dockerfile
# ==========================================

# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package manifests
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code and build config
COPY tsconfig.json ./
COPY src ./src/

# Compile TypeScript to JavaScript in dist/
RUN npm run build

# Prune devDependencies to reduce image size
RUN npm prune --production

# ==========================================
# Stage 2: Production Runtime
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000
ENV HOST=0.0.0.0

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Install curl for docker healthcheck
RUN apk add --no-cache curl

# Copy production artifacts from builder
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Create uploads directory with write permissions
RUN mkdir -p /app/uploads/private && chown -R nodejs:nodejs /app/uploads

# Switch to non-root user
USER nodejs

# Expose API port
EXPOSE 5000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start Fastify server
CMD ["node", "dist/server.js"]
