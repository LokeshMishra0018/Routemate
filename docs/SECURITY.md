# RouteMate Security Architecture

## 1. Core Principles
1. **Server-Side Authorization:** The backend strictly verifies roles, user ownership, and access permissions. React frontend guards are purely UX conveniences.
2. **Defensive Validation:** All request inputs (body, query, params, headers) are validated via Zod schemas before reaching business logic handlers.
3. **No Secret Leaks:** Fastify logger automatically redacts sensitive attributes (`password`, `passwordHash`, `token`, `refreshToken`, `authorization`, `cookie`).
4. **Security Headers:** `@fastify/helmet` enforces `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and strict HTTPS HSTS in production.
5. **CORS Isolation:** Explicit origin whitelisting configured via `CORS_ORIGIN`. Unrestricted wildcard `*` is disabled for authenticated requests.
6. **Rate Limiting:** Protects endpoints against brute-force and resource exhaustion attacks.
