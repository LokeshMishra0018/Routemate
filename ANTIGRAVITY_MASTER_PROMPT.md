# RouteMate --- Antigravity Master Build Prompt

## Production-Grade Full-Stack Web Application

> **This is the master engineering instruction for Antigravity.**
>
> Build RouteMate as a production-oriented web application, not a
> throwaway prototype.
>
> **Required architecture:** one repository with exactly two application
> folders:
>
> -   `frontend/` → React web application
> -   `backend/` → Node.js API **and the complete server**
>
> Do **not** create `apps/web`, `apps/api`, `server/`, `api/`,
> `backend-server/`, Next.js, React Native, Expo, Flutter, or native
> mobile applications.

------------------------------------------------------------------------

# 1. ROLE AND OBJECTIVE

Act as the lead architect and full-stack engineering team responsible
for RouteMate.

You are responsible for: - backend architecture - database
architecture - API design - authentication - authorization - security -
matching algorithms - React frontend - realtime communication -
testing - performance - accessibility - DevOps/deployment documentation

Build a maintainable, secure, testable, scalable web application that
can realistically evolve into a production SaaS.

Priorities:

1.  Security
2.  Correctness
3.  Data integrity
4.  Maintainability
5.  Testability
6.  Performance
7.  Accessibility
8.  UX
9.  Scalability
10. Visual polish

Never claim a feature is complete when it is mocked, hardcoded, or only
partially wired.

------------------------------------------------------------------------

# 2. PRODUCT

RouteMate helps verified college students discover other verified
students travelling on the same or compatible routes and around
compatible times.

Example:

Student A: - Ghaziabad → Raxaul - 10 September - Train

Student B: - Delhi → Raxaul - 10 September - Train

RouteMate should recognize meaningful route compatibility rather than
merely comparing destination strings.

Matching can consider: - source - destination - intermediate stops -
route overlap - travel date - departure time - arrival time - transport
type - preferences - availability - verification - blocks - trip status

Return: - match score 0--100 - score components - human-readable reasons

------------------------------------------------------------------------

# 3. PLATFORM

This is a **web application only**.

Use: - React - Vite - TypeScript - React Router

It must be responsive on: - desktop - laptop - tablet - mobile browsers

Do NOT create: - React Native - Expo - Flutter - Android application -
iOS application - native mobile application - Next.js

------------------------------------------------------------------------

# 4. REQUIRED TECHNOLOGY STACK

## Frontend

Use:

-   React
-   Vite
-   TypeScript
-   React Router
-   TanStack Query
-   Tailwind CSS
-   shadcn/ui
-   React Hook Form
-   Zod
-   Socket.IO client where required

## Backend

Use:

-   Node.js
-   TypeScript
-   Fastify
-   Zod
-   official MongoDB Node.js driver
-   Socket.IO server

The **entire Node.js server lives inside `backend/`**.

The backend is responsible for: - Fastify application - HTTP server -
Socket.IO server - routes - authentication - authorization - business
logic - repositories - database access - background/application
services - validation - security - logging - health checks

Do not create a separate top-level server folder.

## Database

Use: - MongoDB Atlas

Prefer the official MongoDB driver over Mongoose unless the repository
already has a strong reason to use another approach.

## Authentication

Implement secure backend authentication:

-   email/password
-   Argon2id password hashing
-   email verification
-   short-lived access tokens
-   secure refresh-token rotation
-   server-side session records
-   HttpOnly/Secure/SameSite cookies where appropriate
-   password reset
-   logout/revocation

Never store plaintext passwords.

Never put backend secrets in React.

## Storage

Use S3-compatible private object storage for: - profile images - college
ID documents

Abstract storage behind a backend service.

## Realtime

Use Socket.IO for: - chat - typing indicators where appropriate -
presence where appropriate - realtime notifications

Socket connections must be authenticated and authorized server-side.

## Cache / distributed rate limiting

Use Redis where production requirements justify: - distributed rate
limiting - caching - short-lived coordination

## Testing

Use: - Vitest - Playwright - Fastify API/integration tests - MongoDB
test database strategy

## Code quality

Use: - strict TypeScript - ESLint - Prettier

------------------------------------------------------------------------

# 5. REQUIRED REPOSITORY STRUCTURE

The repository MUST have this structure:

``` text
RouteMate/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── onboarding/
│   │   │   ├── profile/
│   │   │   ├── verification/
│   │   │   ├── trips/
│   │   │   ├── matches/
│   │   │   ├── connections/
│   │   │   ├── chat/
│   │   │   ├── groups/
│   │   │   ├── reviews/
│   │   │   ├── notifications/
│   │   │   ├── safety/
│   │   │   └── admin/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── api/
│   │   ├── lib/
│   │   ├── types/
│   │   ├── validators/
│   │   ├── routes/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── .env.example
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── db/
│   │   ├── plugins/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── colleges/
│   │   │   ├── verification/
│   │   │   ├── trips/
│   │   │   ├── matching/
│   │   │   ├── connections/
│   │   │   ├── messaging/
│   │   │   ├── groups/
│   │   │   ├── reviews/
│   │   │   ├── notifications/
│   │   │   ├── safety/
│   │   │   └── admin/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── schemas/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── lib/
│   │   ├── app.ts
│   │   └── server.ts
│   │
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   │
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── docs/
│   ├── PRODUCT_SPEC.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API.md
│   ├── SECURITY.md
│   ├── DEPLOYMENT.md
│   └── BUILD_PLAN.md
│
├── scripts/
├── .gitignore
├── README.md
└── package.json
```

## Critical structure rule

`backend/` is the **complete backend/server application**.

That means:

``` text
backend/
├── src/
│   ├── app.ts
│   └── server.ts
```

`server.ts` must start: - Fastify - HTTP server - Socket.IO - required
backend plugins/services

`app.ts` should construct/configure the Fastify application in a
testable way without necessarily starting the network listener.

Do not put the server outside `backend/`.

Do not create a separate `server/` folder.

------------------------------------------------------------------------

# 6. ROOT PACKAGE

The root may contain a minimal package manager/workspace configuration
for convenient development commands.

For example:

``` text
npm run dev
npm run dev:frontend
npm run dev:backend
npm run test
npm run lint
npm run typecheck
npm run build
```

These commands may delegate into `frontend/` and `backend/`.

The root must NOT contain application business logic.

------------------------------------------------------------------------

# 7. BACKEND-FIRST RULE

Start with the backend.

Do NOT begin by building a beautiful frontend with fake APIs.

Order:

1.  backend foundation
2.  MongoDB Atlas connection
3.  configuration
4.  authentication foundation
5.  collections
6.  indexes
7.  validation
8.  authorization
9.  API conventions
10. automated backend tests
11. frontend integration

The React frontend must ultimately consume the real backend API.

No production feature may depend on hardcoded fake API responses.

------------------------------------------------------------------------

# 8. ARCHITECTURE

Use a modular monolith initially.

``` text
                    RouteMate
                       |
          ┌────────────┴────────────┐
          │                         │
      frontend/                  backend/
          │                         │
 React + Vite                  Fastify API
 TypeScript                    Node.js
 React Router                  TypeScript
 TanStack Query                     │
          │                         │
          └──────── HTTPS ──────────┘
                                    │
                              MongoDB Atlas
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                  │
              Redis           Object Storage       Socket.IO
```

Additional external services may include: - email provider -
maps/geocoding provider - optional AI provider

Do not introduce microservices unless genuinely required.

------------------------------------------------------------------------

# 9. DATA MODEL

Core MongoDB collections:

``` text
users
profiles
colleges
verificationRequests
trips
matches
connections
conversations
messages
groups
groupMembers
reviews
notifications
reports
blocks
recurringTrips
adminActions
badges
userBadges
sessions
```

Add supporting collections only when justified.

Do not put the entire application into one document.

------------------------------------------------------------------------

# 10. EMBEDDING VS REFERENCES

Embed bounded, tightly-owned data such as: - trip.stops\[\] -
trip.preferences - trip.costSharing - trip.meetingPoint

Reference independently growing entities: - users - profiles - trips -
matches - connections - conversations - messages - reviews - reports -
notifications - sessions - adminActions

Document decisions in `docs/DATABASE.md`.

------------------------------------------------------------------------

# 11. USERS

Suggested fields:

``` text
_id
email
emailNormalized
passwordHash
role
status
emailVerifiedAt
lastLoginAt
createdAt
updatedAt
```

Roles: - student - moderator - admin

Statuses: - active - suspended - deactivated

Requirements: - unique normalized email - never expose passwordHash -
registration cannot assign role - normal clients cannot change
role/status

------------------------------------------------------------------------

# 12. PROFILES

Suggested:

``` text
_id
userId
fullName
collegeId
academicYear
gender
bio
avatarUrl
verificationStatus
trustScore
averageRating
completedTripCount
connectionCount
createdAt
updatedAt
```

`userId` should be unique.

Client cannot arbitrarily set: - role - verificationStatus - trustScore

------------------------------------------------------------------------

# 13. COLLEGES

Suggested:

``` text
_id
name
domain
isActive
createdAt
updatedAt
```

Use unique normalized domain.

Seed KIET with: - name: KIET - domain: kiet.edu

Do not scatter this domain through application code.

------------------------------------------------------------------------

# 14. VERIFICATION

Suggested:

``` text
_id
userId
collegeId
documentStorageKey
documentMimeType
documentSize
status
reviewerId
reviewedAt
rejectionReason
createdAt
updatedAt
```

Statuses: - pending - approved - rejected

Rules: - user can submit own request - documents are private - only
moderator/admin reviews - audit important decisions - avoid duplicate
document copies

------------------------------------------------------------------------

# 15. TRIPS

Suggested:

``` text
_id
userId

source: {
  name,
  normalizedName,
  coordinates: {
    type: "Point",
    coordinates: [longitude, latitude]
  }
}

destination: {
  name,
  normalizedName,
  coordinates: {
    type: "Point",
    coordinates: [longitude, latitude]
  }
}

travelDate
departureTime
estimatedArrivalTime
transportType
status

stops: [
  {
    name,
    normalizedName,
    coordinates: {
      type: "Point",
      coordinates: [longitude, latitude]
    },
    sequenceNumber,
    estimatedArrivalTime
  }
]

preferences: {
  genderPreference,
  conversationPreference,
  smokingPreference,
  other
}

costSharing: {
  enabled,
  estimatedTotalCost,
  currency
}

availableSeats
notes
createdAt
updatedAt
```

Transport: - train - bus - flight - cab - personal_vehicle - other

Status: - planning - confirmed - upcoming - travelling - completed -
cancelled

Use GeoJSON correctly and create appropriate `2dsphere` indexes.

------------------------------------------------------------------------

# 16. MATCHES

Suggested:

``` text
_id
tripId
candidateTripId
userId
candidateUserId
score
routeScore
destinationScore
dateScore
timeScore
transportScore
preferenceScore
explanation[]
status
createdAt
updatedAt
```

Statuses: - active - dismissed - expired - connected

Rules: - no self-match - prevent duplicate active pairs - filter
blocked/suspended/ineligible users - respect trip status and
verification rules

------------------------------------------------------------------------

# 17. CONNECTIONS

Suggested:

``` text
_id
requesterId
recipientId
tripId
candidateTripId
status
createdAt
updatedAt
```

Statuses: - pending - accepted - rejected - cancelled - blocked

Rules: - no self-connection - prevent duplicate pending relationships -
blocked users cannot create prohibited relationships - server-side
authorization

------------------------------------------------------------------------

# 18. CHAT

Collections: - conversations - messages

Conversation:

``` text
_id
type
createdBy
tripId
groupId
createdAt
updatedAt
lastMessageAt
```

Types: - direct - group

Message:

``` text
_id
conversationId
senderId
body
messageType
createdAt
updatedAt
deletedAt
read state
```

Only members can access messages.

Socket.IO connections must be: - authenticated - authorized - scoped to
permitted conversations

------------------------------------------------------------------------

# 19. GROUPS

Support: - owner - members - invitations - join - leave - removal where
authorized - max capacity - trip association - group chat

Protect capacity atomically.

------------------------------------------------------------------------

# 20. REVIEWS

Suggested:

``` text
_id
reviewerId
revieweeId
tripId
connectionId
communication
punctuality
behaviour
overall
comment
createdAt
updatedAt
```

Rules: - ratings 1--5 - no self-review - no duplicate eligible review -
only legitimate completed-trip relationships - backend calculates
eligibility

------------------------------------------------------------------------

# 21. NOTIFICATIONS

Suggested:

``` text
_id
userId
type
title
body
data
readAt
createdAt
```

Types: - new_match - connection_request - connection_accepted -
new_message - verification_update - trip_reminder - review_available -
group_invitation - report_update

Indexes: - userId + createdAt - userId + readAt

------------------------------------------------------------------------

# 22. REPORTS

Suggested:

``` text
_id
reporterId
reportedUserId
type
description
status
assignedTo
resolution
resolvedAt
createdAt
updatedAt
```

Types: - fake_identity - harassment - inappropriate_behavior - scam -
suspicious_activity - other

Statuses: - open - investigating - resolved - dismissed

Only authorized moderators/admins can access the queue.

------------------------------------------------------------------------

# 23. BLOCKS

Suggested:

``` text
_id
blockerId
blockedUserId
createdAt
```

Constraints: - no self-block - unique blocker/blocked pair

Blocks must affect: - matching - discovery - connection requests -
messaging - group invitations where appropriate

------------------------------------------------------------------------

# 24. SESSIONS

Suggested:

``` text
_id
userId
refreshTokenHash
deviceInfo
ipMetadata
expiresAt
revokedAt
createdAt
lastUsedAt
```

Use TTL indexing where appropriate.

Never store raw refresh tokens if avoidable.

Implement: - rotation - reuse detection where practical - revocation -
expiration

------------------------------------------------------------------------

# 25. ADMIN AUDIT

Suggested:

``` text
_id
actorUserId
actionType
targetUserId
targetResourceId
metadata
createdAt
```

Examples: - verification_approved - verification_rejected -
user_suspended - user_unsuspended - report_resolved - report_dismissed -
role_changed - moderation_action

Do not log secrets or private document contents.

------------------------------------------------------------------------

# 26. INDEXING

At minimum evaluate:

``` text
users.emailNormalized unique
profiles.userId unique
colleges.domain unique
verificationRequests.status + createdAt
verificationRequests.userId + createdAt
trips.userId + travelDate
trips.travelDate + status
trips.destination.normalizedName + travelDate
trips.source.normalizedName + travelDate
trips.source.coordinates 2dsphere
trips.destination.coordinates 2dsphere
matches.tripId + status
matches.candidateTripId + status
connections.requesterId + status
connections.recipientId + status
messages.conversationId + createdAt
notifications.userId + createdAt
notifications.userId + readAt
reports.status + createdAt
blocks.blockerId + blockedUserId unique
sessions.userId
sessions.expiresAt TTL
```

Use explain plans for important queries.

Avoid unnecessary indexes.

------------------------------------------------------------------------

# 27. TRANSACTIONS AND ATOMICITY

Use MongoDB transactions for multi-document operations where atomicity
is required.

Examples:

Connection acceptance: - update connection - create conversation -
create membership

Verification approval: - update verification - update profile - create
notification - write audit action

Group join: - verify capacity - add member atomically

Use unique indexes and atomic operators to prevent races.

------------------------------------------------------------------------

# 28. BACKEND MODULE ARCHITECTURE

Each module should generally contain:

``` text
routes
schemas
controller/handler
service
repository
types
tests
```

Example:

``` text
backend/src/modules/trips/
├── trips.routes.ts
├── trips.schemas.ts
├── trips.service.ts
├── trips.repository.ts
├── trips.types.ts
└── trips.test.ts
```

Business logic belongs in services.

MongoDB-specific logic belongs in repositories.

HTTP-specific logic belongs in routes/controllers.

------------------------------------------------------------------------

# 29. BACKEND SERVER ARCHITECTURE

The complete server is inside `backend/`.

Recommended:

``` text
backend/src/
├── app.ts
└── server.ts
```

Responsibilities:

### `app.ts`

Construct the Fastify application.

It should: - register plugins - register validation - register security
middleware - register routes - register error handlers - configure
logging - expose the app for tests

It should be possible to import the app in tests without starting a
network listener.

### `server.ts`

This is the actual production server entry point.

It should: 1. load and validate environment 2. initialize MongoDB 3.
initialize Redis if enabled 4. create Fastify app 5. create/use the HTTP
server 6. initialize Socket.IO on that server 7. register graceful
shutdown 8. listen on configured host/port 9. log startup 10. close all
resources cleanly on shutdown

Conceptually:

``` text
backend/src/server.ts
        |
        +--> configuration
        |
        +--> MongoDB
        |
        +--> Redis
        |
        +--> Fastify app
        |
        +--> HTTP server
        |
        +--> Socket.IO
        |
        +--> graceful shutdown
        |
        +--> listen
```

Do not create a separate server application outside `backend/`.

------------------------------------------------------------------------

# 30. API

Base path:

``` text
/api/v1
```

Core routes:

``` text
POST   /auth/register
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
POST   /auth/forgot-password
POST   /auth/reset-password
POST   /auth/verify-email
GET    /me
PATCH  /me

POST   /verification
GET    /verification/me

POST   /trips
GET    /trips
GET    /trips/:id
PATCH  /trips/:id
DELETE /trips/:id

GET    /matches
GET    /matches/:id
POST   /matches/:id/dismiss

POST   /connections
GET    /connections
PATCH  /connections/:id

GET    /conversations
GET    /conversations/:id/messages
POST   /conversations/:id/messages

POST   /groups
GET    /groups
GET    /groups/:id
POST   /groups/:id/join
POST   /groups/:id/leave

POST   /reviews
GET    /users/:id/reviews

GET    /notifications
PATCH  /notifications/:id/read

POST   /blocks
DELETE /blocks/:userId

POST   /reports

GET    /admin/overview
GET    /admin/users
GET    /admin/verifications
PATCH  /admin/verifications/:id
GET    /admin/reports
PATCH  /admin/reports/:id
POST   /admin/users/:id/suspend
POST   /admin/users/:id/unsuspend
```

Adapt for consistency when necessary.

------------------------------------------------------------------------

# 31. VALIDATION AND RESPONSES

Use Zod at every API boundary.

Success:

``` json
{
  "success": true,
  "data": {}
}
```

List:

``` json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "hasNextPage": false
  }
}
```

Error:

``` json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid trip date",
    "details": {}
  }
}
```

Never expose: - stack traces - raw MongoDB errors - internal file
paths - secrets

------------------------------------------------------------------------

# 32. MATCHING ENGINE

The matching engine is a core differentiator and must be
framework-independent.

Recommended:

``` text
backend/src/modules/matching/
├── candidate-retrieval.ts
├── route-scoring.ts
├── destination-scoring.ts
├── date-scoring.ts
├── time-scoring.ts
├── transport-scoring.ts
├── preference-scoring.ts
├── match-score.ts
├── match-explanation.ts
├── matching.service.ts
└── matching.test.ts
```

Pipeline:

``` text
Candidate Retrieval
→ Hard Eligibility Filters
→ Route Analysis
→ Destination Compatibility
→ Date Compatibility
→ Time Compatibility
→ Transport Compatibility
→ Preference Compatibility
→ Weighted Score
→ Explanation
→ Persist Match
```

Initial weights:

``` text
Route overlap          35%
Destination            20%
Travel date            15%
Departure time         10%
Transport              10%
Preferences            10%
```

Total: 100%.

Normalize score to 0--100.

------------------------------------------------------------------------

# 33. ROUTE MATCHING

Do not simply compare destination strings.

Consider: - source similarity - destination similarity - stop overlap -
stop order - route segment overlap - geographic proximity - transport
compatibility

Example:

A:

``` text
Ghaziabad
New Delhi
Lucknow
Gorakhpur
Raxaul
```

B:

``` text
Delhi
Lucknow
Gorakhpur
Raxaul
```

should produce a strong compatibility signal.

Design the engine so a future routing provider can be integrated without
rewriting scoring.

------------------------------------------------------------------------

# 34. TIME AND DATE MATCHING

Use centralized configurable thresholds.

Illustrative: - same time → excellent - \<30 min → very good - 30--90
min → good - 1.5--3 hours → moderate - large difference → low

Default date behavior: - exact date strongest - tolerance only if
product rules allow it

Do not match unrelated dates simply because destinations match.

------------------------------------------------------------------------

# 35. MATCH EXPLANATIONS

Explanations must derive from actual score components.

Example:

``` text
Same destination
Same travel date
Same transport type
82% route overlap
Departure times are 45 minutes apart
```

Never fabricate reasons.

------------------------------------------------------------------------

# 36. CANDIDATE RETRIEVAL

Never load every trip into Node.js.

Use MongoDB filters for: - travel date - trip status - eligibility -
transport where useful - destination/source region where useful -
blocked users - suspended users

Then score a bounded candidate set.

Use pagination or candidate limits.

------------------------------------------------------------------------

# 37. AI

AI is optional.

Architecture:

``` text
MongoDB retrieval
→ deterministic matching
→ deterministic explanation
→ optional AI enhancement
```

If `AI_API_KEY` is absent: - matching still works - explanations still
work - app does not crash

AI must never decide: - authorization - verification approval -
suspension - security permissions

------------------------------------------------------------------------

# 38. SECURITY

Implement: - authentication - authorization - Argon2id password
hashing - refresh-token rotation - validation - rate limiting - secure
cookies where appropriate - CORS - security headers - request size
limits - private storage - safe error handling - audit logging -
dependency review

Never trust: - client role - client user ID - client ownership - client
verification status - client trust score

------------------------------------------------------------------------

# 39. RATE LIMITING

Protect: - registration - login - password reset - verification
submission - file uploads - connection requests - messages - reports -
admin-sensitive operations

Use Redis for distributed production rate limiting.

Provide reasonable development fallback if Redis is unavailable, but do
not silently pretend distributed protection exists in production.

------------------------------------------------------------------------

# 40. CORS AND HEADERS

Production CORS must use configured trusted origins.

Do not use unrestricted `*` for authenticated APIs.

Configure appropriate: - Content-Security-Policy -
X-Content-Type-Options - Referrer-Policy - frame protection - HSTS in
HTTPS production

------------------------------------------------------------------------

# 41. FILE UPLOADS

Validate server-side: - file size - MIME - extension - ownership -
authorization

Use randomized/controlled storage keys.

Never expose public identity-document URLs.

------------------------------------------------------------------------

# 42. LOGGING AND OBSERVABILITY

Use structured logs and request/correlation IDs.

Never log: - passwords - access/refresh tokens - secrets - private
identity documents - message bodies - unnecessary sensitive personal
information

Provide:

``` text
GET /health
GET /ready
```

Prepare integration points for: - error tracking - metrics - DB
monitoring - auth failures - matching latency - upload failures -
realtime failures

------------------------------------------------------------------------

# 43. FRONTEND

After backend foundation is stable, build the React app against the real
API.

Use: - React - Vite - TypeScript - React Router - TanStack Query - React
Hook Form - Zod - Tailwind - shadcn/ui - Socket.IO client

Do not duplicate core business logic in React.

------------------------------------------------------------------------

# 44. FRONTEND ROUTES

Potential routes:

``` text
/
/login
/register
/verify-email
/forgot-password
/reset-password
/onboarding

/dashboard
/profile
/profile/edit

/trips
/trips/new
/trips/:id
/trips/:id/edit

/matches
/matches/:id

/connections
/connections/requests

/messages
/messages/:conversationId

/groups
/groups/:id

/notifications
/settings
/safety

/admin
/admin/users
/admin/verifications
/admin/reports
/admin/analytics
```

------------------------------------------------------------------------

# 45. UX AND DESIGN

RouteMate should feel: - trustworthy - modern - clean -
student-friendly - accessible - responsive

Provide: - clear hierarchy - empty states - skeleton loading - retry
states - validation - destructive-action confirmation - consistent
toasts/alerts

Avoid excessive animation.

Reusable components: - Button - Input - Select - Textarea - FormField -
Card - Badge - Avatar - Dialog - Drawer - Tabs - Table - Dropdown -
Tooltip - Alert - Toast - Skeleton - Pagination - EmptyState -
ErrorState

------------------------------------------------------------------------

# 46. ACCESSIBILITY AND RESPONSIVENESS

Use: - semantic HTML - labels - keyboard navigation - focus indicators -
accessible dialogs - accessible errors - adequate contrast -
screen-reader-friendly states

Test: - mobile browser - tablet - laptop - desktop - large desktop

Support light/dark themes with design tokens.

------------------------------------------------------------------------

# 47. FRONTEND DATA

Use TanStack Query for: - caching - loading - errors - invalidation -
refetching - safe optimistic updates

Every async page handles: - loading - success - empty - error - retry

------------------------------------------------------------------------

# 48. MAPS AND MEETING POINTS

Create a map/geocoding/routing abstraction.

Potential capabilities: - location search - source/destination - route
visualization - stops - meeting point - distance compatibility

If no map provider is configured: - core app still works - provide text
fallback - do not crash

Do not expose precise personal location unnecessarily.

------------------------------------------------------------------------

# 49. RECURRING TRIPS

Support: - weekly days - weekends - custom days

Avoid generating unlimited trips.

Use a recurring definition plus controlled trip instances where
appropriate.

------------------------------------------------------------------------

# 50. PRIVACY AND ACCOUNT DELETION

Minimize personal data.

Do not expose: - private email unless explicitly allowed - identity
documents - private messages - moderation notes - sensitive location
information

Design account deletion/deactivation carefully around: - sessions -
profiles - documents - trips - connections - messages - reviews -
reports - audit records

Anonymize records that must legally/audit-wise be retained.

------------------------------------------------------------------------

# 51. ADMIN

Admin dashboard must contain real data.

Overview: - total users - verified users - pending verification - active
trips - completed trips - connections - reports - growth metrics

Verification: - queue - document review - approve/reject - rejection
reason

Users: - search - filters - profile - verification state -
suspend/unsuspend

Reports: - queue - investigate - resolve - dismiss

Audit: - action history

------------------------------------------------------------------------

# 52. TESTING

Use: - unit tests - integration tests - API tests - database tests -
authorization/security tests - E2E tests

Unit-test: - matching - route overlap - time/date scoring - transport -
preferences - trust score - validators - utilities

API-test: - auth - profiles - trips - matching - connections -
messaging - verification - reviews - reports - blocks - admin

------------------------------------------------------------------------

# 53. SECURITY TESTS

Explicitly verify:

``` text
Student A cannot modify Student B's trip.
Student A cannot read Student B's private verification data.
Student cannot access admin APIs.
Student cannot change own role.
Student cannot change own verification status.
Student cannot change own trust score.
Non-member cannot read a conversation.
Blocked users cannot create prohibited interactions.
Suspended users cannot perform normal protected actions.
```

------------------------------------------------------------------------

# 54. E2E FLOWS

Use Playwright.

Flow 1:

``` text
Register
→ verify email
→ onboarding
→ profile
```

Flow 2:

``` text
Create trip
→ search
→ view match
```

Flow 3:

``` text
Send connection
→ accept
→ conversation
```

Flow 4:

``` text
Send message
→ recipient receives
```

Flow 5:

``` text
Complete trip
→ review eligibility
→ submit review
```

Flow 6:

``` text
Submit ID
→ admin reviews
→ approve/reject
```

Flow 7:

``` text
Report
→ admin investigates
→ resolve
```

------------------------------------------------------------------------

# 55. SEED DATA

Use fictional data only.

Seed: - KIET - fictional students - fictional trips - stops - matches -
connections - notifications - reviews

Do not hardcode demo users into React components.

Do not use real personal data.

------------------------------------------------------------------------

# 56. PERFORMANCE

Avoid: - N+1 queries - fetching all trips - fetching all messages - huge
payloads - unnecessary realtime subscriptions - client-side filtering of
huge datasets

Use: - indexes - projections - pagination - bounded candidate
retrieval - caching - query invalidation - lazy loading

Use cursor pagination for high-volume message feeds where appropriate.

------------------------------------------------------------------------

# 57. DEPLOYMENT

Document: - frontend deployment - backend deployment - MongoDB Atlas
configuration - object storage - Socket.IO deployment - Redis - email -
maps - environment variables - index setup - backup/recovery -
monitoring - domains - CORS

Never claim deployment is tested if it is not.

The production backend deployment must deploy the application contained
in:

``` text
backend/
```

The production frontend deployment must deploy:

``` text
frontend/
```

------------------------------------------------------------------------

# 58. CI/CD

CI should run:

``` text
install
lint
typecheck
unit tests
API/integration tests
build
```

E2E can run in a dedicated CI job.

Known failing tests must never be hidden.

------------------------------------------------------------------------

# 59. DOCUMENTATION

Maintain:

``` text
docs/PRODUCT_SPEC.md
docs/ARCHITECTURE.md
docs/DATABASE.md
docs/API.md
docs/SECURITY.md
docs/DEPLOYMENT.md
docs/BUILD_PLAN.md
README.md
```

Documentation must reflect actual implementation.

------------------------------------------------------------------------

# 60. DEVELOPMENT WORKFLOW

For every phase:

1.  Inspect current repository.
2.  Read relevant documentation.
3.  State a concise plan.
4.  Implement incrementally.
5.  Run relevant tests.
6.  Run typecheck.
7.  Run lint.
8.  Run build where relevant.
9.  Fix failures.
10. Update documentation.
11. Report exactly what was implemented.
12. Report anything incomplete.

Use:

``` text
PHASE: <number>

IMPLEMENTED:
- ...

TESTED:
- ...

SECURITY VERIFIED:
- ...

DOCUMENTATION UPDATED:
- ...

REMAINING:
- ...

KNOWN LIMITATIONS:
- ...
```

------------------------------------------------------------------------

# 61. NINE-PHASE BUILD PLAN

## PHASE 1 --- BACKEND FOUNDATION + MONGODB ATLAS

Build only the backend foundation first.

Build inside `backend/`: - Node.js + TypeScript - Fastify - `app.ts` -
`server.ts` - HTTP server - Socket.IO foundation - strict TS -
ESLint/Prettier - environment validation - MongoDB Atlas connection -
database abstraction - graceful startup/shutdown - health/readiness -
structured logging - request IDs - global error handler - API
versioning - Zod foundation - CORS - security headers - request limits -
rate-limit abstraction - modular service/repository architecture -
initial collections - indexes - seed mechanism - backend tests -
documentation

Acceptance: - backend starts from `backend/` - Atlas connection works -
`/health` works - `/ready` works - invalid config fails clearly -
error/validation handling works - indexes work - Socket.IO server
initializes - graceful shutdown works - tests pass

Do not build the main frontend.

------------------------------------------------------------------------

## PHASE 2 --- AUTH + USERS + COLLEGES + VERIFICATION

Build inside `backend/`: - registration - login - email normalization -
Argon2id - email verification - refresh sessions - refresh rotation -
logout - password reset - profiles - colleges - KIET seed -
institutional domain rules - verification submission - private document
storage abstraction - admin/moderator review - roles - audit actions -
verification notifications

Acceptance:

``` text
register
→ verify email
→ login
→ profile
→ submit verification
```

Admin:

``` text
pending verification
→ review
→ approve/reject
→ audit
```

Security tests must pass.

------------------------------------------------------------------------

## PHASE 3 --- TRIPS + ROUTES + SEARCH

Build: - trip CRUD - statuses - source/destination - dates/times -
transport - stops - preferences - cost sharing - seats - geospatial
data - 2dsphere indexes - trip search - pagination - recurring-trip
foundation - meeting-point foundation

Acceptance:

``` text
verified user
→ create trip
→ add stops
→ edit
→ search
→ view
→ cancel/complete
```

Unauthorized modification must fail.

------------------------------------------------------------------------

## PHASE 4 --- MATCHING ENGINE

Build: - candidate retrieval - hard filters - route overlap -
destination scoring - date scoring - time scoring - transport scoring -
preference scoring - weighted final score - explanation - blocked-user
filtering - verification/status filtering - persistence - duplicate
prevention - unit tests - representative performance tests

Acceptance: - deterministic scores - correct components - correct
explanations - efficient candidate retrieval - no self-match - no
blocked matches - no duplicates

No AI dependency.

------------------------------------------------------------------------

## PHASE 5 --- CONNECTIONS + CHAT + NOTIFICATIONS

Build: - connection requests - accept/reject/cancel - duplicate
prevention - authorization - direct conversations - messages -
Socket.IO - realtime auth - unread counts - read state - message
validation - notifications - realtime notifications - email
abstraction - group-chat foundation

Acceptance:

``` text
match
→ connection
→ acceptance
→ conversation
→ realtime message
→ notification
```

------------------------------------------------------------------------

## PHASE 6 --- GROUPS + COST SHARING + RECURRING + MAPS

Build: - groups - invitations - membership - ownership - capacity -
atomic joining - group chat - cost sharing - recurring trips - trip
instances - meeting points - map/geocoding abstraction - graceful map
fallback

Acceptance: - group can be created - members can join/invite/leave -
capacity cannot be exceeded - costs calculate correctly

No payment processing.

------------------------------------------------------------------------

## PHASE 7 --- REVIEWS + TRUST + SAFETY + ADMIN

Build: - review eligibility - reviews - ratings - trust score -
reports - blocks - moderation - suspension - admin dashboard -
verification dashboard - user management - reports dashboard - real
analytics - audit logs - safety guidance

Acceptance:

``` text
completed trip
→ review eligible
→ review
→ trust update
```

Safety:

``` text
report/block
→ restrictions
→ moderation
→ resolution
→ audit
```

Admin operations must be server-protected.

------------------------------------------------------------------------

## PHASE 8 --- REACT FRONTEND + COMPLETE UX

Build inside `frontend/`: - React + Vite - TypeScript - routing - auth -
onboarding - profile - verification - trips - search - matches -
connections - chat - groups - notifications - reviews - safety -
settings - admin - responsive design - dark mode - loading/empty/error
states - accessibility - TanStack Query - forms - validation - reusable
design system - Socket.IO client integration

Acceptance:

The major user journey works in the browser using real APIs and real
MongoDB data.

No fake production data.

------------------------------------------------------------------------

## PHASE 9 --- PRODUCTION HARDENING + QA + DEPLOYMENT

Run: - full unit tests - API/integration tests - security tests -
Playwright E2E - authorization tests - lint - typecheck - production
build

Review: - rate limiting - CORS - security headers - secrets -
dependencies - indexes - query plans - performance - accessibility -
responsive UI - error handling - logging - monitoring -
backups/recovery - deployment - CI/CD - README - known limitations

Do not call the project production-ready until critical checks pass.

------------------------------------------------------------------------

# 62. STOP CONDITIONS

Do not move forward while a previous phase has: - broken core tests -
broken TypeScript - broken database connection - critical security
flaw - critical authorization flaw - corrupt data model - failing
required setup

Fix foundations first.

Ask for clarification only when: - required credentials are
unavailable - a destructive migration needs approval - requirements
directly contradict each other - a legal/security policy requires
product-owner input - a paid external service is required and cannot
safely be assumed

For normal engineering decisions, use sound judgment and continue.

------------------------------------------------------------------------

# 63. DO NOT OVERENGINEER

Production-ready does not mean: - microservices everywhere -
Kubernetes - event sourcing - unnecessary queues - excessive
abstractions

Start with a modular monolith.

Scale individual modules only when actual requirements justify it.

------------------------------------------------------------------------

# 64. DO NOT UNDERSPECIFY

Do not build: - fake login - fake matching - fake verification - fake
chat - fake dashboard - fake analytics

Implemented features must use real application architecture.

------------------------------------------------------------------------

# 65. NO MAGIC ADMIN

Never implement:

``` text
if email === "admin@example.com"
```

Use roles and server-side authorization.

------------------------------------------------------------------------

# 66. NO CLIENT-SIDE SECURITY

React guards are UX only.

The backend must enforce: - authentication - authorization - ownership -
role permissions - safety rules

------------------------------------------------------------------------

# 67. NO SECRETS IN FRONTEND

Never expose: - JWT signing secrets - refresh secrets - MongoDB
credentials - S3 secrets - SMTP credentials - Redis credentials - AI
secrets

Never use a `VITE_` variable for a backend secret.

------------------------------------------------------------------------

# 68. DTOs

Never blindly return raw MongoDB documents.

Use DTOs/serializers.

Public profile data may include: - id - name - college - academic year -
bio - avatar - verification status - trust score - rating

Do not expose: - passwordHash - session data - private moderation data -
verification storage key - private email - internal security metadata

unless explicitly authorized.

------------------------------------------------------------------------

# 69. FINAL USER JOURNEY

``` text
Visitor
→ Landing page
→ Register
→ Verify institutional email
→ Onboarding
→ Profile
→ College ID verification
→ Verified account
→ Create trip
→ Discover compatible students
→ View match
→ Send connection
→ Connection accepted
→ Chat
→ Coordinate trip
→ Complete trip
→ Review
→ Trust score update
```

Admin:

``` text
Admin login
→ Dashboard
→ Verification queue
→ Review ID
→ Approve/reject
→ Audit
```

Safety:

``` text
User
→ Report/block
→ Moderation
→ Admin resolution
→ Audit
```

------------------------------------------------------------------------

# 70. PRODUCTION READINESS CHECKLIST

Before declaring production-ready:

``` text
[ ] Core journeys work end-to-end
[ ] Authentication secure
[ ] Password hashing secure
[ ] Session management secure
[ ] Server authorization enforced
[ ] Private documents protected
[ ] MongoDB indexes reviewed
[ ] Important queries reviewed
[ ] Rate limiting addressed
[ ] CORS configured
[ ] Security headers configured
[ ] Input validation complete
[ ] Error leakage prevented
[ ] Security tests pass
[ ] E2E tests pass
[ ] Accessibility reviewed
[ ] Responsive UI reviewed
[ ] Logging safe
[ ] Monitoring plan exists
[ ] Backups/recovery documented
[ ] CI passes
[ ] Deployment documented
[ ] Secrets managed correctly
[ ] Known limitations documented
```

If any critical item is missing, explicitly state it.

------------------------------------------------------------------------

# 71. FIRST ACTION

Before significant implementation:

1.  Inspect the repository.
2.  Determine whether it is empty or partially implemented.
3.  Inspect package/config files.
4.  Inspect source code.
5.  Inspect documentation.
6.  Inspect environment files without exposing secret values.
7.  Ensure the repository uses `frontend/` and `backend/`.
8.  Ensure all Node.js server code is inside `backend/`.
9.  Create/update `docs/BUILD_PLAN.md`.
10. Propose the Phase 1 plan.
11. Start Phase 1 only.
12. Verify Phase 1 before moving on.

Do not destroy existing functionality.

------------------------------------------------------------------------

# 72. FINAL COMMAND

Build RouteMate as a serious production-oriented full-stack web
application.

Required repository architecture:

``` text
RouteMate/
├── frontend/     # React web application
├── backend/      # Node.js + Fastify API + complete server
├── docs/
├── scripts/
└── root config
```

Required technology:

``` text
Frontend:
React + Vite + TypeScript

Backend:
Node.js + Fastify + TypeScript

Database:
MongoDB Atlas

Realtime:
Socket.IO

Optional infrastructure:
Redis
Private Object Storage
Email Provider
Maps Provider
Optional AI Provider
```

Implementation order:

``` text
PHASE 1 → Backend foundation
PHASE 2 → Auth + users + verification
PHASE 3 → Trips + routes
PHASE 4 → Matching engine
PHASE 5 → Connections + chat + notifications
PHASE 6 → Groups + cost sharing + recurring + maps
PHASE 7 → Reviews + trust + safety + admin
PHASE 8 → React frontend
PHASE 9 → Production hardening + QA + deployment
```

Do not skip phases.

Do not build a fake prototype.

Do not expose secrets.

Do not create a mobile application.

Do not use Next.js.

Do not create a separate server folder.

**All server-side code must live under `backend/`.**

Do not make AI mandatory.

Do not hardcode business data.

Do not put critical business logic entirely in the frontend.

Keep: - business logic in services - MongoDB operations in
repositories - validation at boundaries - HTTP concerns in
routes/controllers - security enforced server-side - server startup in
`backend/src/server.ts` - Fastify app construction in
`backend/src/app.ts`

Test every important feature.

Maintain documentation throughout.

At the end of each phase report:

``` text
IMPLEMENTED
TESTED
SECURITY VERIFIED
DOCUMENTATION UPDATED
REMAINING
KNOWN LIMITATIONS
```

Never claim incomplete work is complete.

## BEGIN NOW

**Begin with PHASE 1 --- BACKEND FOUNDATION + MONGODB ATLAS.**

Do not start Phase 2 until Phase 1 is implemented, tested, documented,
and verified.
