# RouteMate — Real-World Admin Intelligence & Operations Command Center

## Implementation Specification for Antigravity

> **Objective:** Transform the existing RouteMate Admin Portal into a production-grade operations and intelligence command center inspired by the operational principles of platforms such as PostHog/Mixpanel and Uber's internal operations tooling.
>
> **Critical requirement:** This is NOT a prototype/demo implementation. Preserve existing RouteMate functionality and architecture where practical, and implement the new system with production-quality security, privacy, observability, scalability, error handling, validation, testing, and maintainability.

---

# 1. IMPORTANT IMPLEMENTATION RULES

Before modifying code:

1. Inspect the complete existing RouteMate frontend and backend.
2. Identify the existing:
   - authentication/authorization flow
   - Socket.IO/WebSocket implementation
   - MongoDB models and connection layer
   - admin routes/services/controllers
   - frontend routing
   - admin layout/dashboard
   - shared TypeScript types
   - error-handling middleware
   - logging/observability infrastructure
3. Do NOT replace working architecture merely to implement this feature.
4. Reuse existing abstractions where they are production-safe.
5. Do NOT introduce duplicate authentication, database connections, socket servers, or competing state-management systems.
6. Do NOT hard-code fake analytics values.
7. Do NOT use mock data in production paths.
8. If an expected backend/frontend component already exists, extend it rather than creating a parallel implementation.
9. Run existing tests/builds before and after changes.
10. Keep all existing student-facing RouteMate functionality working.

---

# 2. PRODUCT VISION

The Admin Portal becomes the operational command center for RouteMate.

Administrators should be able to understand:

- who is online right now
- what broad area of the application users are currently using
- current platform activity
- onboarding conversion
- user retention
- search demand
- unmet travel demand
- ride/trip operations
- matching performance
- safety/reporting operations
- system health
- API errors and latency

The platform must provide useful operational visibility without becoming an unnecessarily invasive surveillance system.

---

# 3. PRIVACY AND SECURITY PRINCIPLES

## 3.1 Presence data

The live presence registry may contain:

- userId
- display name
- avatar URL
- college
- branch/year if already available and appropriate
- role
- current application path
- readable current activity
- device category
- browser/client information
- connectedAt
- lastPingAt
- idle state
- session duration

### IP address

Do NOT expose raw IP addresses in the normal admin live-user UI.

If IP is already required for security/audit purposes:

- keep it restricted to security/audit tooling
- never expose it in general analytics
- do not persist it unnecessarily
- document retention requirements
- avoid displaying precise geolocation

## 3.2 Clickstream

Do NOT implement unrestricted recording of every mouse click or keystroke.

Use an explicit event taxonomy.

Examples:

```text
USER_REGISTERED
EMAIL_VERIFIED
ID_UPLOADED
ID_APPROVED
SEARCH_PERFORMED
TRIP_VIEWED
MATCHES_VIEWED
CO_TRAVEL_REQUESTED
CO_TRAVEL_ACCEPTED
TRIP_CREATED
TRIP_JOINED
TRIP_CANCELLED
TRIP_COMPLETED
MESSAGE_SENT
PROFILE_VIEWED
FILTER_CHANGED
LOGIN_SUCCESS
LOGIN_FAILED
LOGOUT
```

Never collect:

- passwords
- authentication tokens
- message contents
- private form contents
- payment credentials
- unnecessary personal data
- keystrokes

Telemetry metadata must be deliberately allow-listed.

## 3.3 Admin authorization

All admin analytics and operations endpoints must enforce server-side authorization.

Never rely only on hiding frontend routes.

At minimum:

```text
Authenticated
    ↓
Admin role
    ↓
Permission for requested operation
```

Destructive operations such as cancelling a trip require additional authorization and audit logging.

---

# 4. TARGET ARCHITECTURE

Implement the following logical architecture:

```text
                         ROUTEMATE
                            |
             +--------------+--------------+
             |                             |
       Student Web App              Admin Command Center
             |                             |
             +--------------+--------------+
                            |
                     API + Socket.IO
                            |
             +--------------+--------------+
             |              |              |
         Presence        Telemetry      Operations
             |              |              |
      Shared Presence   Event Buffer     MongoDB
       (Redis-ready)         |              |
             |          Aggregation         |
             +--------------+--------------+
                            |
                     Analytics Services
                            |
       +--------------------+--------------------+
       |                    |                    |
     Funnels             Demand              System
     Cohorts             Search              Health
```

---

# 5. SCALABILITY REQUIREMENT

The implementation must work correctly on a single backend instance.

However, do NOT tightly couple the architecture to process-local memory.

Design the presence abstraction so that it can later support:

```text
Load Balancer
      |
+-----+-----+
|           |
API #1     API #2
|           |
+-----+-----+
      |
 Redis / Shared Presence
```

Create a clean abstraction such as:

```ts
interface PresenceStore {
  setPresence(...): Promise<void> | void;
  removePresence(...): Promise<void> | void;
  getPresence(...): Promise<...> | ...;
  getAllPresence(...): Promise<...> | ...;
}
```

An in-memory implementation may be used initially.

Do not make business logic depend directly on a global `Map`.

---

# 6. BACKEND — REAL-TIME PRESENCE ENGINE

## 6.1 Modify socket gateway

Locate the existing Socket.IO/WebSocket implementation, expected file:

```text
backend/src/.../socket.ts
```

Adapt the actual project path if different.

Implement a presence registry containing:

```ts
interface LivePresence {
  socketId: string;
  userId: string;

  name: string;
  email?: string;
  avatarUrl?: string;
  college?: string;
  role?: string;

  currentPath: string;
  currentAction: string;

  device: {
    type: "mobile" | "desktop" | "tablet" | "unknown";
    browser?: string;
    os?: string;
  };

  connectedAt: string;
  lastPingAt: string;

  isIdle: boolean;
}
```

Do not expose internal-only fields through public API responses.

---

# 7. SOCKET EVENTS

## 7.1 Client → server

### `presence:heartbeat`

Payload:

```ts
{
  path: string;
  action: string;
  isIdle: boolean;
  device?: {
    type: "mobile" | "desktop" | "tablet" | "unknown";
    browser?: string;
    os?: string;
  };
}
```

Server responsibilities:

1. Validate payload.
2. Verify authenticated socket user.
3. Sanitize path/action.
4. Update presence.
5. Update `lastPingAt`.
6. Broadcast appropriate presence update to authorized admin clients.

Heartbeat interval:

```text
15 seconds
```

The server must tolerate missed heartbeats.

Recommended presence timeout:

```text
30–45 seconds
```

Do not immediately mark a user offline because of one missed heartbeat.

---

## 7.2 `telemetry:event`

Payload:

```ts
{
  eventType: TelemetryEventType;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}
```

The server must:

- validate event type
- validate metadata
- enforce metadata allow-lists
- attach authenticated user ID server-side
- assign event ID server-side
- normalize timestamp server-side where appropriate
- prevent clients from impersonating another user
- prevent clients from claiming admin privileges

---

# 8. TELEMETRY EVENT MODEL

Create a strongly typed event taxonomy.

Example:

```ts
export enum TelemetryEventType {
  USER_REGISTERED = "USER_REGISTERED",
  EMAIL_VERIFIED = "EMAIL_VERIFIED",
  ID_UPLOADED = "ID_UPLOADED",
  ID_APPROVED = "ID_APPROVED",

  SEARCH_PERFORMED = "SEARCH_PERFORMED",
  TRIP_VIEWED = "TRIP_VIEWED",
  MATCHES_VIEWED = "MATCHES_VIEWED",

  CO_TRAVEL_REQUESTED = "CO_TRAVEL_REQUESTED",
  CO_TRAVEL_ACCEPTED = "CO_TRAVEL_ACCEPTED",

  TRIP_CREATED = "TRIP_CREATED",
  TRIP_JOINED = "TRIP_JOINED",
  TRIP_CANCELLED = "TRIP_CANCELLED",
  TRIP_COMPLETED = "TRIP_COMPLETED",

  MESSAGE_SENT = "MESSAGE_SENT",
  PROFILE_VIEWED = "PROFILE_VIEWED",
  FILTER_CHANGED = "FILTER_CHANGED",

  LOGIN_SUCCESS = "LOGIN_SUCCESS",
  LOGIN_FAILED = "LOGIN_FAILED",
  LOGOUT = "LOGOUT"
}
```

Do not create dozens of overlapping events without a clear analytical purpose.

---

# 9. LIVE EVENT BUFFER

Implement a bounded in-memory live event buffer.

Requirements:

- maximum recent events: 500
- newest events first
- automatic eviction
- no unbounded memory growth
- no blocking database writes on the Socket.IO event path

Example logical flow:

```text
Student Event
     |
 Socket.IO
     |
Validation
     |
Bounded Event Buffer
     |
     +----> Admin live stream
     |
     +----> Async persistence/aggregation
                    |
                  MongoDB
```

Important:

The event buffer is for live operations.

MongoDB is the durable source for historical analytics.

---

# 10. TELEMETRY PERSISTENCE

Create or extend a collection/model such as:

```text
user_activity_logs
```

Suggested schema:

```ts
{
  _id: ObjectId,

  eventId: string,
  userId: ObjectId,

  eventType: string,

  timestamp: Date,

  metadata: {
    from?: string,
    to?: string,
    tripId?: string,
    resultCount?: number,
    filterName?: string,
    filterValue?: string
  },

  sessionId?: string
}
```

Only persist useful, allow-listed metadata.

Never persist arbitrary client objects blindly.

Add indexes based on actual query patterns, likely:

```text
{ userId: 1, timestamp: -1 }
{ eventType: 1, timestamp: -1 }
{ timestamp: -1 }
```

Review indexes against existing MongoDB indexes before creating duplicates.

---

# 11. LIVE PRESENCE METHODS

Add service methods:

```ts
getLivePresenceDashboard()
getLiveActiveUsersList()
getLiveEventStream(limit)
getRealtimeSummary()
```

`getRealtimeSummary()` should calculate:

```text
live user count
active page distribution
mobile/desktop distribution
idle users
peak users today
recent event count
```

Do not calculate "peak today" from current users only.

Maintain an appropriate daily metric or derive it from durable presence/session telemetry.

---

# 12. SESSION MANAGEMENT

A session should contain:

```text
sessionId
userId
startedAt
endedAt
duration
device
entryPath
exitPath
```

Do not create a new durable session on every heartbeat.

A reasonable model:

```text
login / app entry
     ↓
session starts
     ↓
heartbeats update activity
     ↓
disconnect/timeout
     ↓
session ends
```

Sessionization must tolerate browser refreshes and temporary network failures.

---

# 13. FRONTEND PRESENCE TRACKER

Create:

```text
usePresenceTracker.ts
```

Adapt to the project's actual routing solution.

Responsibilities:

- detect route changes
- detect user interaction
- detect focus/blur
- detect idle state
- send heartbeat every ~15 seconds
- clean up listeners/timers
- reconnect safely after Socket.IO reconnect
- avoid duplicate timers
- avoid memory leaks

Idle threshold:

```text
2 minutes
```

Possible activity events:

```text
mousemove
mousedown
keydown
scroll
touchstart
focus
```

Do not record these raw interactions as telemetry events.

They only update the idle state.

---

# 14. READABLE ACTIVITY MAPPING

Create a centralized function:

```ts
getReadableAction(pathname: string): string
```

Examples:

```text
/trips
    → Browsing Trips

/trips/new
    → Creating a Trip

/matches
    → Browsing Matches

/messages
    → Viewing Messages

/messages/:id
    → Chatting

/profile
    → Viewing Profile
```

Route-specific actions may override generic route descriptions.

Example:

```text
Searching: CV Raman → Anand Vihar
```

must only be generated from explicitly permitted search metadata.

Do not infer private activity.

---

# 15. ADMIN LIVE SOCKET CHANNEL

Create an authorized admin Socket.IO room/channel.

Example conceptual flow:

```text
Admin connects
    ↓
Authenticate
    ↓
Verify admin role
    ↓
Join admin:live room
    ↓
Receive:
  presence:update
  presence:remove
  telemetry:new
  realtime:summary
```

Never broadcast student telemetry to arbitrary connected clients.

---

# 16. ADMIN SERVICE — ANALYTICS

Modify:

```text
admin.service.ts
```

Add the following services.

---

## 16.1 Live Presence

```ts
getLivePresenceDashboard()
```

Returns:

```ts
{
  users: LiveActiveUser[];
  summary: RealtimeSummary;
}
```

---

## 16.2 User Funnel Analytics

Implement six stages:

```text
Registered
   ↓
Email Verified
   ↓
ID Uploaded
   ↓
ID Approved
   ↓
First Search
   ↓
First Completed Trip
```

For each stage:

```ts
{
  stageName: string;
  count: number;
  conversionRate: number;
  dropoffRate: number;
}
```

Important:

Define cohort semantics clearly.

Example:

- registered users in selected period
- users who reached subsequent milestones
- conversion relative to previous stage and/or initial cohort

Document the formula.

Do not mix users from unrelated time periods without explicitly stating so.

---

# 17. RETENTION ANALYTICS

Support:

```text
7-day retention
30-day retention
```

Recommended definition:

```text
Day 0 = user's first meaningful activity / registration cohort date

7-day retained =
user performs qualifying activity during days 7–13

30-day retained =
user performs qualifying activity during days 30–36
```

Use one consistent definition across the UI.

Clearly label retention methodology.

---

# 18. SEARCH DEMAND ANALYTICS

Implement:

```ts
getSearchDemandAnalytics()
```

Track:

```text
pickup
drop
search timestamp
result count
matched trips
```

Return:

```ts
interface SearchDemandItem {
  from: string;
  to: string;

  searchCount: number;
  matchedTripsCount: number;
  unmetDemand: number;
}
```

Define unmet demand consistently.

Recommended initial definition:

```text
unmetDemand = searches resulting in zero matching trips
```

Avoid simply calculating:

```text
searches - matchedTrips
```

because one trip can satisfy multiple searches/users.

---

# 19. ZERO-RESULT / UNMET DEMAND

Create a ranking such as:

```text
CV Raman → Anand Vihar
42 zero-result searches
17:00–19:00
```

Support time-of-day aggregation:

```text
00:00–02:00
02:00–04:00
...
22:00–24:00
```

The admin should be able to identify:

- high-demand routes
- zero-result routes
- peak demand hours
- demand by day
- demand trends

---

# 20. MOBILITY PERFORMANCE

Implement:

```ts
getMobilityPerformanceAnalytics()
```

Metrics:

```text
total trips published
active trips
completed trips
cancelled trips
seat utilization
shared commute spend
estimated carbon savings
```

Only calculate spend/carbon metrics if RouteMate has sufficient real data.

If a metric depends on an assumption, make the assumption configurable and clearly display it.

Example:

```text
Estimated carbon savings
based on configurable vehicle/emission assumptions
```

Never present estimated environmental metrics as measured facts.

---

# 21. MATCHING INTELLIGENCE

Create:

```ts
getMatchingPerformanceAnalytics()
```

Possible metrics:

```text
total matching requests
successful matches
match success rate
average match time
p50 match time
p95 match time
requests with zero matches
```

If the existing matching engine already records scores/reasons, expose useful aggregate information.

Do not expose sensitive internal scoring information unnecessarily.

---

# 22. SYSTEM HEALTH TELEMETRY

Implement:

```ts
getSystemHealthAndErrors()
```

Metrics:

```text
RPM / request throughput
p50 latency
p95 latency
p99 latency
4xx rate
5xx rate
401 rate
authentication failures
active sockets
database connections
memory usage
process uptime
```

These must come from real instrumentation.

Do not estimate them from database activity.

---

# 23. REQUEST METRICS MIDDLEWARE

If the backend does not already have request metrics:

Implement lightweight middleware that records:

```text
method
route
status code
duration
timestamp
```

Aggregate in memory with bounded structures.

For production observability, design the metrics layer so it can later integrate with:

```text
OpenTelemetry
Prometheus
Grafana
```

without rewriting business services.

Do not add heavyweight infrastructure unless the existing deployment supports it.

---

# 24. ERROR TELEMETRY

Track:

```text
400
401
403
404
409
429
500
502
503
```

At minimum expose:

```text
total requests
successful requests
4xx errors
5xx errors
authentication failures
```

Do not store sensitive request bodies in error logs.

Redact:

```text
authorization headers
cookies
passwords
tokens
private message content
```

---

# 25. ADMIN API ROUTES

Modify:

```text
admin.routes.ts
```

Create protected endpoints:

```text
GET /api/v1/admin/live/users
GET /api/v1/admin/live/events

GET /api/v1/admin/analytics/funnel
GET /api/v1/admin/analytics/demand
GET /api/v1/admin/analytics/system
GET /api/v1/admin/analytics/mobility
GET /api/v1/admin/analytics/matching

GET /api/v1/admin/trips
POST /api/v1/admin/trips/:id/cancel

GET /api/v1/admin/matching/stats
```

Use existing API versioning conventions if different.

---

# 26. ADMIN TRIP DISPATCH

Create:

```text
/admin/trips
```

Capabilities:

- search trips
- filter by status
- filter by time
- view trip details
- view participants
- view seats
- view pickup/drop
- cancel trip where authorized

Cancellation must:

1. validate trip ID
2. verify authorization
3. verify trip state
4. perform transactional/atomic state update where appropriate
5. notify affected users through existing notification infrastructure
6. create an audit event
7. return clear success/error response

Do not allow arbitrary state transitions.

---

# 27. ADMIN AUDIT LOG

Create or reuse:

```text
admin_audit_logs
```

Record sensitive administrative actions:

```text
adminId
action
resourceType
resourceId
timestamp
reason
metadata
```

Examples:

```text
TRIP_CANCELLED
USER_VERIFICATION_APPROVED
USER_SUSPENDED
REPORT_RESOLVED
```

Never store unnecessary sensitive information.

---

# 28. TYPESCRIPT TYPES

Modify:

```text
types/index.ts
```

Add:

```ts
interface LiveActiveUser {
  userId: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  college?: string;
  branch?: string;
  currentPath: string;
  currentAction: string;
  device: {
    type: "mobile" | "desktop" | "tablet" | "unknown";
    browser?: string;
    os?: string;
  };
  connectedAt: string;
  lastPingAt: string;
  isIdle: boolean;
  sessionDurationSeconds: number;
}

interface LiveTelemetryEvent {
  id: string;
  userId: string;
  userName: string;
  eventType: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface FunnelStage {
  stageName: string;
  count: number;
  conversionRate: number;
  dropoffRate: number;
}

interface SearchDemandItem {
  from: string;
  to: string;
  searchCount: number;
  matchedTripsCount: number;
  unmetDemand: number;
}

interface SystemHealthStats {
  rpm: number;
  apiLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorRatePercent: number;
  activeSockets: number;
  memoryUsageMb: number;
  uptimeSeconds: number;
}
```

Adapt naming to existing conventions.

---

# 29. ADMIN SIDEBAR

Modify:

```text
AdminLayout.tsx
```

Use the following hierarchy:

```text
⚡ REAL-TIME OPERATIONS

├── Live Users & Activity
│   /admin/live
│
├── Executive Overview
│   /admin
│
├── Trips Master Dispatch
│   /admin/trips


📈 INTELLIGENCE & ANALYTICS

├── User Funnels & Cohorts
│   /admin/users-funnel
│
├── Search & Unmet Demand
│   /admin/demand
│
├── Matching Intelligence
│   /admin/matching
│
├── Commute Circles & Groups
│   /admin/groups


🛡️ TRUST, SAFETY & SYSTEM

├── ID Verifications Queue
│   /admin/verifications
│
├── Safety Reports & Disputes
│   /admin/reports
│
├── Active SOS Monitor
│   /admin/sos
│
├── System & Error Telemetry
│   /admin/system
```

Preserve existing sidebar functionality.

---

# 30. ADMIN LIVE USERS PAGE

Create:

```text
AdminLiveUsersPage.tsx
```

Route:

```text
/admin/live
```

The page should show:

### Header KPIs

```text
🟢 Online Now
Active Sessions
Idle Users
Mobile %
Desktop %
```

### Live table

Columns:

```text
Student
College / Branch
Current Screen
Current Activity
Device
Session Duration
Status
```

Examples:

```text
🟢 Searching for Ride
🟡 Browsing Matches
💬 Chatting
🚗 Creating Trip
👤 Viewing Profile
💤 Idle 4m
```

Do not show raw IP.

---

# 31. LIVE USER UPDATES

Admin live page should use Socket.IO for live updates.

Do NOT rely exclusively on repeated REST polling.

Fallback polling may be implemented if socket connection fails.

Example:

```text
Socket connected
    ↓
live updates

Socket disconnected
    ↓
show "Reconnecting..."
    ↓
optional REST refresh
    ↓
Socket reconnect
    ↓
resynchronize full state
```

---

# 32. USER CLICKSTREAM INSPECTOR

Provide:

```text
Inspect User Clickstream
```

Open a modal/drawer.

Show a session timeline:

```text
02:10:03
Opened Matches

02:10:11
Searched:
CV Raman → Anand Vihar

02:10:18
Viewed Trip #123

02:10:29
Requested Co-Travel
```

Important:

- Show only allow-listed events.
- Never expose message contents.
- Do not expose passwords/tokens/private form data.
- Apply admin permission checks.
- Make access to detailed clickstream auditable if appropriate.

---

# 33. EXECUTIVE OVERVIEW

Modify:

```text
AdminDashboardPage.tsx
```

Display:

### Business KPIs

```text
Total Users
Online Now
Trips Today
Completed Trips
Active Trips
Searches Today
Match Success Rate
ID Verification Queue
```

### Live event stream

Example:

```text
🟢 12:31
A student searched for:
CV Raman → Anand Vihar

🚗 12:30
New trip published

🤝 12:29
Co-travel request accepted

✅ 12:27
Trip completed
```

### Activity trend

Display real historical data.

Do not use fake "rush hour" curves.

---

# 34. DEMAND ANALYTICS PAGE

Create:

```text
AdminDemandAnalyticsPage.tsx
```

Route:

```text
/admin/demand
```

Sections:

1. Top demanded routes
2. Zero-result routes
3. Hourly demand heatmap
4. Demand by day
5. Search-to-trip availability
6. Unserved Demand Alerts

Example alert:

```text
HIGH UNMET DEMAND

CV Raman → Anand Vihar

18 zero-result searches
Peak: 17:00–19:00
```

---

# 35. USER FUNNEL PAGE

Create:

```text
AdminUserFunnelPage.tsx
```

Route:

```text
/admin/users-funnel
```

Display:

```text
Registered
    ↓ 91%
Email Verified
    ↓ 84%
ID Uploaded
    ↓ 76%
ID Approved
    ↓ 68%
First Search
    ↓ 43%
First Completed Trip
```

Each stage must have:

- count
- conversion %
- drop-off %
- tooltip explaining calculation

Add:

```text
7-Day Retention
30-Day Retention
```

---

# 36. SYSTEM HEALTH PAGE

Create:

```text
AdminSystemHealthPage.tsx
```

Route:

```text
/admin/system
```

Display:

### Latency

```text
p50
p95
p99
```

### HTTP status

```text
2xx
4xx
5xx
401
404
500
```

### Infrastructure

```text
Active sockets
Database connections
Memory usage
Process uptime
```

### Health state

```text
Healthy
Degraded
Critical
```

Use thresholds from configuration, not hard-coded magic values spread across components.

---

# 37. MATCHING PAGE

Create or extend:

```text
/admin/matching
```

Show:

```text
Match requests
Successful matches
No-match requests
Match success rate
Average matching time
p50 matching time
p95 matching time
```

If the matching engine supports explainability, show aggregate reasons such as:

```text
No route overlap
No available seats
Time mismatch
Distance threshold
Preference mismatch
```

Do not expose sensitive personal attributes unnecessarily.

---

# 38. GROUPS PAGE

Connect:

```text
/admin/groups
```

Show existing RouteMate commute circles/groups.

Possible dimensions:

```text
Hostel
Route
College
Destination
Active members
```

Reuse existing group functionality instead of duplicating it.

---

# 39. VERIFICATIONS PAGE

Preserve and enhance:

```text
/admin/verifications
```

Show:

```text
Pending
Approved
Rejected
```

Verification must remain a controlled administrative workflow unless the existing product has a trustworthy automated verification mechanism.

Do not claim an uploaded student ID is genuine solely because OCR succeeded.

---

# 40. REPORTS AND SAFETY

Connect:

```text
/admin/reports
/admin/sos
```

These pages must be treated as higher-sensitivity operational areas.

Require stronger authorization where appropriate.

For SOS:

- never invent GPS data
- display only actual client-provided/authorized location data
- show data freshness
- clearly distinguish active vs stale location
- log administrative access where appropriate

---

# 41. FRONTEND ROUTING

Modify:

```text
routes/index.tsx
```

Add:

```text
/admin/live
/admin/users-funnel
/admin/demand
/admin/system
/admin/trips
/admin/matching
/admin/groups
```

Ensure existing routes remain unchanged.

Use route guards.

---

# 42. API RESPONSE CONTRACT

Use a consistent response structure matching the existing backend.

If no standard exists, use:

```ts
{
  success: true,
  data: ...
}
```

Errors:

```ts
{
  success: false,
  error: {
    code: "SOME_ERROR_CODE",
    message: "Human-readable message"
  }
}
```

Do not expose stack traces to clients.

---

# 43. FRONTEND ERROR STATES

Every analytics page must support:

```text
Loading
Loaded
Empty
Partial data
Error
Unauthorized
Socket disconnected
Reconnecting
```

Never show blank screens.

Example:

```text
Unable to load live activity.

Retry
```

For socket failure:

```text
Live connection interrupted.
Showing last synchronized data.
Reconnecting...
```

---

# 44. PERFORMANCE REQUIREMENTS

## Student application

Telemetry must have minimal impact.

Requirements:

- no blocking database request from the browser
- no telemetry request for every mouse movement
- heartbeat every ~15 seconds
- debounce/throttle where appropriate
- bounded client-side buffers
- cleanup on unmount
- socket reconnection with backoff

## Backend

Requirements:

- bounded in-memory collections
- no unbounded event arrays
- no expensive aggregation on every heartbeat
- avoid N+1 database queries
- use appropriate indexes
- paginate historical analytics where needed

---

# 45. RATE LIMITING

Protect telemetry endpoints/socket events.

Recommended safeguards:

```text
heartbeat:
maximum expected rate ≈ 1 per 10–15 seconds

telemetry:
bounded per-user rate

admin REST endpoints:
normal API rate limits

trip cancellation:
strict authorization + validation
```

Server must not trust the client to self-limit.

---

# 46. SOCKET RECONNECTION

Implement:

```text
disconnect
    ↓
reconnect with exponential backoff
    ↓
authenticate
    ↓
resend current presence
    ↓
synchronize state
```

Avoid duplicate event subscriptions.

---

# 47. DATA RETENTION

Do not retain raw activity indefinitely.

Introduce configurable retention policies.

Example defaults:

```text
Live presence:
ephemeral

Live event buffer:
last 500 events

Detailed activity logs:
configurable historical window

System metrics:
configurable retention

Admin audit logs:
longer retention according to security requirements
```

Make retention configurable rather than scattering constants throughout the application.

---

# 48. SECURITY REQUIREMENTS

Validate all server inputs.

Protect against:

```text
XSS
NoSQL injection
authorization bypass
IDOR
socket impersonation
event spoofing
rate abuse
log injection
oversized telemetry payloads
```

Never accept:

```text
userId
role
admin status
email
```

from the telemetry client as authoritative identity fields.

Derive identity from the authenticated socket/session.

---

# 49. OBSERVABILITY

The implementation should have structured logs for important operations.

Example:

```text
INFO  socket connected
INFO  presence updated
INFO  telemetry accepted
WARN  telemetry validation failed
WARN  socket heartbeat timeout
ERROR analytics query failed
ERROR trip cancellation failed
```

Do not log sensitive payloads.

Prefer structured logs:

```ts
logger.info({
  event: "telemetry.accepted",
  userId,
  eventType
});
```

---

# 50. DATABASE SAFETY

Before adding MongoDB indexes:

1. inspect existing indexes
2. identify actual query patterns
3. avoid duplicates
4. verify index creation strategy for deployment

Analytics queries must avoid collection scans where practical.

For high-volume data, consider:

```text
pre-aggregated daily/hourly metrics
```

instead of repeatedly running expensive full-history aggregations.

---

# 51. ANALYTICS AGGREGATION STRATEGY

For early RouteMate scale:

```text
MongoDB aggregation pipelines
+
bounded in-memory live metrics
```

may be sufficient.

Design the analytics service so it can later move heavy workloads to:

```text
Redis
ClickHouse
PostgreSQL analytics store
BigQuery
OpenTelemetry/Prometheus
```

without changing frontend contracts.

Do not introduce those systems merely for architectural fashion.

---

# 52. CACHING

Analytics endpoints can use short-lived caching where useful.

Examples:

```text
Executive overview:
5–15 seconds

Demand analytics:
30–60 seconds

Funnel:
30–60 seconds

System metrics:
5 seconds or live stream
```

Do not cache highly dynamic presence data for long periods.

---

# 53. ACCESS CONTROL MATRIX

Implement server-side permission checks.

Example:

| Area | Admin | Super Admin |
|---|---:|---:|
| Dashboard | ✓ | ✓ |
| Live users | ✓ | ✓ |
| Funnel | ✓ | ✓ |
| Demand | ✓ | ✓ |
| System | ✓ | ✓ |
| Verifications | ✓ | ✓ |
| Reports | ✓ | ✓ |
| SOS | ✓ | ✓ |
| Cancel trip | Restricted | ✓ |
| User suspension | Restricted | ✓ |
| Audit logs | Read | ✓ |

Adapt this to the existing RouteMate role model.

Do not create a conflicting role system if one already exists.

---

# 54. TYPES AND VALIDATION

Use the project's existing validation library.

If none exists, introduce a single validation approach rather than multiple libraries.

Validate:

```text
socket payloads
query params
route params
request bodies
telemetry metadata
admin filters
pagination
date ranges
```

Reject malformed input early.

---

# 55. PAGINATION

Historical endpoints must support pagination.

Example:

```text
GET /admin/live/events?limit=50
GET /admin/trips?page=1&limit=25
```

Enforce server-side maximum limits.

Never allow:

```text
limit=1000000
```

---

# 56. DATE AND TIME

Store timestamps in UTC.

Convert to the admin user's display timezone in the frontend.

Be consistent across:

```text
sessions
events
trips
analytics
system metrics
```

For RouteMate's campus use cases, display local time in the UI where appropriate.

---

# 57. FRONTEND UI QUALITY

The Admin Portal should feel like an actual operations command center.

Design characteristics:

- information dense but readable
- responsive
- dark/light theme compatible if existing system supports it
- clear status colors
- strong hierarchy
- charts with meaningful labels
- skeleton loading
- empty states
- tooltips for metrics
- accessible controls
- keyboard navigability
- no excessive animation

Do not overuse gradients or decorative cards.

The dashboard should prioritize operational information.

---

# 58. REAL-TIME STATUS INDICATORS

Use consistent states:

```text
🟢 Healthy / Active
🟡 Idle / Degraded
🔴 Critical / Offline
⚪ Unknown
```

Do not use color alone to communicate state.

Include accessible text.

---

# 59. LIVE EVENT DESCRIPTION

Create a server/client formatter that turns typed events into readable descriptions.

Examples:

```text
SEARCH_PERFORMED
→ Searched CV Raman → Anand Vihar

TRIP_CREATED
→ Published a new trip

TRIP_JOINED
→ Joined a trip

CO_TRAVEL_REQUESTED
→ Requested to co-travel

MESSAGE_SENT
→ Sent a message
```

Never display message content.

---

# 60. EVENT DEDUPLICATION

Protect against duplicate telemetry caused by:

- React Strict Mode
- retries
- reconnects
- double-clicks
- browser refreshes

Use event IDs or client-generated idempotency keys where appropriate.

The server remains authoritative.

---

# 61. TESTING REQUIREMENTS

## Backend unit tests

Test:

```text
presence registration
presence update
presence timeout
disconnect cleanup
heartbeat validation
telemetry validation
event buffering
event eviction
admin authorization
funnel calculation
retention calculation
demand calculation
matching metrics
trip cancellation authorization
```

## Backend integration tests

Test:

```text
authenticated socket connection
admin socket connection
student socket cannot receive admin stream
REST admin authorization
MongoDB analytics queries
trip cancellation
audit logging
```

---

# 62. FRONTEND TESTING

Test:

```text
presence tracker lifecycle
route changes
idle detection
socket reconnect
live table updates
analytics loading
analytics error
empty data
clickstream modal
admin route guards
```

---

# 63. BUILD VERIFICATION

Run:

```powershell
cd f:\GITHUB\Routemate\backend
npm run build
```

and:

```powershell
cd f:\GITHUB\Routemate\frontend
npm run build
```

Also run the project's existing lint/test/typecheck commands if available.

Do not stop at "code compiles".

---

# 64. MANUAL VERIFICATION — LIVE PRESENCE

### Step 1

Run backend and frontend.

### Step 2

Open the student application in:

```text
Browser A
```

### Step 3

Open admin portal in:

```text
Browser B
```

### Step 4

Student navigates:

```text
/trips
/matches
/messages
```

Expected:

Admin live dashboard updates almost immediately.

Verify:

```text
current screen
current readable action
device
session duration
active/idle state
```

---

# 65. MANUAL VERIFICATION — TELEMETRY

Perform:

```text
search
view trip
change filter
request co-travel
create trip
```

Verify:

```text
event appears in live stream
correct user identity
correct event type
timestamp
allowed metadata only
```

Verify that:

```text
passwords
tokens
message contents
raw keystrokes
```

never appear in telemetry.

---

# 66. MANUAL VERIFICATION — FUNNEL

Create/test users at different onboarding stages.

Verify:

```text
Registered
Email Verified
ID Uploaded
ID Approved
First Search
First Completed Trip
```

Check:

```text
counts
conversion
drop-off
retention
```

against known test data.

---

# 67. MANUAL VERIFICATION — DEMAND

Perform searches:

```text
Route A → Route B
```

where:

```text
matching trips exist
```

and:

```text
no matching trips exist
```

Verify that zero-result searches are correctly identified.

Verify hourly grouping.

---

# 68. MANUAL VERIFICATION — SYSTEM

Generate normal API requests and controlled errors.

Verify:

```text
RPM
latency
p50
p95
p99
4xx
5xx
401
active sockets
memory
uptime
```

Update in real time or according to the configured refresh interval.

---

# 69. FAILURE TESTING

Test:

```text
MongoDB unavailable
Socket.IO disconnected
student network disconnected
admin network disconnected
invalid telemetry payload
expired authentication
unauthorized admin request
duplicate event
very large telemetry payload
rapid telemetry events
```

Expected behavior:

- no application crash
- clear error state
- automatic reconnect where appropriate
- no memory leak
- no data corruption
- no unauthorized access
- graceful degradation

---

# 70. IMPLEMENTATION ORDER

Implement in this order:

## Phase 1 — Existing Architecture Audit

Inspect:

```text
frontend
backend
MongoDB
authentication
Socket.IO
admin
routing
types
logging
```

Do not code yet.

## Phase 2 — Backend Foundations

Implement:

```text
telemetry event types
presence abstraction
presence registry
Socket.IO events
bounded event buffer
validation
```

## Phase 3 — Persistence

Implement:

```text
activity log model
indexes
session tracking
audit logs
```

## Phase 4 — Observability

Implement:

```text
request metrics
latency metrics
error counters
socket metrics
memory/uptime
```

## Phase 5 — Analytics Services

Implement:

```text
funnel
retention
demand
mobility
matching
system health
```

## Phase 6 — REST APIs

Implement and protect:

```text
/live
/analytics
/trips
/matching
```

## Phase 7 — Student Client

Implement:

```text
usePresenceTracker
telemetry helper
route activity mapping
socket reconnect
```

## Phase 8 — Admin UI

Implement:

```text
live
dashboard
funnel
demand
system
trips
matching
groups
```

## Phase 9 — Security

Review:

```text
RBAC
validation
rate limiting
privacy
audit
data exposure
```

## Phase 10 — Testing

Run:

```text
unit
integration
frontend
build
manual verification
failure testing
```

---

# 71. DO NOT BREAK EXISTING ROUTEMATE FEATURES

Before finishing, verify existing functionality such as:

```text
authentication
email verification
ID upload
ID verification
trip creation
trip search
matching
co-travel requests
messaging
profiles
groups
notifications
admin verification
admin reports
```

still works.

Do not modify unrelated behavior.

---

# 72. IMPLEMENTATION QUALITY BAR

The implementation is NOT complete if:

- it only displays hard-coded numbers
- it uses mock analytics
- it polls everything instead of using real-time events where appropriate
- it stores unlimited events in memory
- it exposes raw IP addresses unnecessarily
- it records raw clicks/keystrokes
- it trusts client-provided user IDs
- it lacks admin authorization
- it lacks error states
- it lacks reconnection handling
- it lacks tests
- it breaks existing routes
- it creates duplicate database infrastructure
- it compiles but has no real data path

---

# 73. DEFINITION OF DONE

The feature is complete only when all of the following are true:

### Real-time

- [ ] Student presence reaches backend.
- [ ] Admin sees online users.
- [ ] Current screen updates.
- [ ] Readable activity updates.
- [ ] Idle state works.
- [ ] Device information works.
- [ ] Session duration works.
- [ ] Disconnect cleanup works.
- [ ] Socket reconnect works.

### Telemetry

- [ ] Typed event taxonomy exists.
- [ ] Events are validated.
- [ ] Event buffer is bounded.
- [ ] Historical events persist safely.
- [ ] Sensitive data is excluded.
- [ ] Live event stream works.

### Analytics

- [ ] Funnel works.
- [ ] Retention works.
- [ ] Search demand works.
- [ ] Zero-result demand works.
- [ ] Mobility metrics use real data.
- [ ] Matching metrics use real data.
- [ ] System health uses real instrumentation.

### Admin

- [ ] `/admin/live`
- [ ] `/admin`
- [ ] `/admin/trips`
- [ ] `/admin/users-funnel`
- [ ] `/admin/demand`
- [ ] `/admin/matching`
- [ ] `/admin/groups`
- [ ] `/admin/verifications`
- [ ] `/admin/reports`
- [ ] `/admin/sos`
- [ ] `/admin/system`

all work.

### Security

- [ ] Server-side RBAC.
- [ ] Input validation.
- [ ] Telemetry allow-listing.
- [ ] No raw IP in normal live UI.
- [ ] No message contents.
- [ ] No passwords/tokens.
- [ ] Admin sensitive actions audited.
- [ ] Rate limits applied.

### Reliability

- [ ] MongoDB failure handled.
- [ ] Socket failure handled.
- [ ] Client reconnect works.
- [ ] No unbounded memory growth.
- [ ] No major performance regression.

### Verification

- [ ] Backend builds.
- [ ] Frontend builds.
- [ ] Tests pass.
- [ ] Existing features remain functional.
- [ ] Manual verification completed.

---

# 74. FINAL ANTIGRAVITY INSTRUCTION

Do not merely generate the requested files and stop.

First inspect the repository and understand its current architecture.

Then implement the feature incrementally.

For every architectural decision:

```text
Existing implementation
        ↓
Can it safely support the requirement?
        ↓
YES → extend it
NO  → refactor minimally
```

Do not rewrite RouteMate unnecessarily.

Do not introduce unnecessary dependencies.

Do not create mock/demo data.

Do not silently change existing business rules.

Do not expose sensitive student information merely because it is technically available.

When an analytics metric cannot be accurately calculated from the existing data model, identify the missing source data and implement the smallest production-safe instrumentation required to make the metric real.

At the end, provide a concise implementation report containing:

1. files created
2. files modified
3. database models/indexes added
4. Socket.IO events added
5. REST endpoints added
6. frontend routes added
7. security/privacy controls implemented
8. tests added
9. build/test results
10. any remaining limitations or assumptions

**Goal: RouteMate should end up with a genuine production-grade Admin Intelligence & Operations Command Center, not a visually impressive mock dashboard.**
