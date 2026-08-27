# RouteMate API Specification

## Base URL
`/api/v1`

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 100,
    "totalPages": 5,
    "hasNextPage": true
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email address"
      }
    ]
  }
}
```

## Phase 1 Implemented Endpoints

### 1. Liveness Probe
- **Path:** `GET /health`
- **Auth:** Public
- **Description:** Checks if the Node.js / Fastify process is alive.
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "status": "healthy",
      "service": "routemate-backend",
      "uptime": 12.34,
      "timestamp": "2026-08-27T19:00:00.000Z",
      "memoryUsage": { ... }
    }
  }
  ```

### 2. Readiness Probe
- **Path:** `GET /ready`
- **Auth:** Public
- **Description:** Checks connectivity to database dependencies (MongoDB Atlas).
- **Response (Ready):**
  ```json
  {
    "success": true,
    "data": {
      "status": "ready",
      "service": "routemate-backend",
      "timestamp": "2026-08-27T19:00:00.000Z",
      "dependencies": {
        "mongodb": {
          "connected": true,
          "databaseName": "routemate_dev",
          "pingMs": 4
        }
      }
    }
  }
  ```

### 3. API v1 Root
- **Path:** `GET /api/v1`
- **Auth:** Public
- **Description:** Returns API version information.
