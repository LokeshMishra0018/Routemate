# ROUTEMATE — MASTER END-TO-END TESTING, QA, SECURITY & PRODUCTION-READINESS PROMPT

## ROLE

Act as a **Senior QA Architect, SDET, Security Tester, Backend Test Engineer, Frontend Test Engineer, API Test Engineer, Database Integrity Tester, Accessibility Auditor, Performance Engineer, and Production Readiness Reviewer**.

You are testing an already-developed web application called **RouteMate**.

Your objective is NOT to perform superficial testing.

Your objective is to perform a **complete production-grade verification of the existing RouteMate application**, identify every reproducible defect, edge case, security weakness, authorization problem, broken workflow, inconsistent state, UI issue, data-integrity issue, API failure, race condition, deployment problem, and missing validation that could affect real users.

Do not assume a feature works because code exists for it.

Do not assume a feature is implemented merely because it appears in a README, comment, route name, component name, database model, environment variable, or UI placeholder.

Verify actual runtime behavior.

---

# 1. PROJECT CONTEXT

RouteMate is a **college-student travel coordination web platform**.

The application allows students from a college to:

- create accounts,
- authenticate,
- maintain profiles,
- undergo verification,
- search for trips,
- create/schedule trips,
- discover students traveling on similar routes,
- request to join trips,
- accept/reject/manage trip requests,
- coordinate travel safely,
- maintain travel-related records,
- use filters for finding relevant trips/users,
- interact with verification and trust mechanisms,
- and use other functionality currently implemented in the repository.

The platform has a strong **student safety and trust** focus.

The project is intended to be a **real production web application**, not a prototype.

The current application may be deployed using infrastructure such as:

- Vercel
- Render
- MongoDB
- and any other services/configurations actually found in the repository.

Do not assume the exact architecture.

Inspect the project and determine the actual implementation.

---

# 2. ROUTEMATE VERIFICATION MODEL

RouteMate uses trust/verification badges.

Expected conceptual states include:

### Unverified
Red verification indicator/tick.

### College/student identity partially verified
Yellow indicator/tick.

Example conceptual meaning:

- account/email may be valid,
- but student ID or required college identity verification is incomplete.

### Fully verified student
Blue indicator/tick.

### Administrator
Golden indicator/tick.

Verify the ACTUAL implementation and mappings in the codebase.

Do not blindly rely on the above wording if the implementation differs.

Check:

- state transitions,
- backend enforcement,
- badge rendering,
- permissions,
- APIs,
- database fields,
- role checks,
- verification workflows,
- admin actions,
- stale states,
- revoked verification,
- deleted verification evidence,
- partially completed verification,
- duplicate submissions,
- inconsistent frontend/backend verification states.

---

# 3. PRIMARY MISSION

Perform a complete audit and testing cycle covering:

1. Repository understanding
2. Feature discovery
3. Requirements reconstruction
4. Frontend testing
5. Backend/API testing
6. Authentication testing
7. Authorization testing
8. Verification workflow testing
9. User/profile testing
10. Trip lifecycle testing
11. Search/filter testing
12. Join/request workflow testing
13. Admin testing
14. Database integrity testing
15. Security testing
16. File upload testing
17. Validation testing
18. Session/token testing
19. Error handling
20. Edge cases
21. Concurrency/race conditions
22. Accessibility
23. Responsiveness
24. Browser compatibility
25. Performance
26. Reliability
27. Deployment configuration
28. Environment configuration
29. API/frontend contract consistency
30. Logging and observability
31. Abuse scenarios
32. Privacy/data exposure
33. Production readiness
34. Regression testing
35. Automated test generation where possible

The final goal is:

> **No major feature, workflow, endpoint, role, form, state transition, or trust boundary should remain untested.**

---

# 4. PHASE 0 — DO NOT CHANGE CODE IMMEDIATELY

Before modifying anything:

1. Inspect the complete repository.
2. Understand how the project works.
3. Detect the actual technology stack.
4. Find frontend and backend boundaries.
5. Find database models/schemas.
6. Find all APIs.
7. Find authentication mechanisms.
8. Find verification logic.
9. Find role/permission logic.
10. Find all forms.
11. Find all user-facing routes/pages.
12. Find admin routes/pages.
13. Find middleware.
14. Find upload mechanisms.
15. Find third-party integrations.
16. Find environment variables.
17. Find existing tests.
18. Find seed/demo accounts if available.
19. Find deployment configurations.
20. Find known TODOs/FIXMEs/placeholders.

Do not alter production logic merely to make tests pass.

If changes become necessary later, first document the defect and expected behavior.

---

# 5. BUILD A COMPLETE APPLICATION INVENTORY

Before running the final test suite, generate an internal inventory containing:

## Pages

Discover every page/route, including:

- public pages,
- auth pages,
- onboarding,
- dashboard,
- profile,
- verification pages,
- trip pages,
- search pages,
- user/public profile pages,
- settings,
- admin pages,
- error pages,
- privacy/terms/help pages if implemented,
- hidden/internal routes.

For every page record:

- route,
- intended role,
- auth requirement,
- major UI elements,
- forms,
- buttons,
- API calls,
- expected navigation.

---

# 6. API INVENTORY

Discover every backend endpoint.

For every endpoint identify:

- HTTP method,
- route,
- authentication requirement,
- authorized roles,
- request body,
- URL/query parameters,
- response schema,
- expected status codes,
- database collections/tables touched,
- side effects,
- validation rules,
- rate limiting if present,
- failure behavior.

Test every endpoint independently.

Do not rely only on UI tests.

---

# 7. DATABASE INVENTORY

Inspect all data models.

Likely entities may include, depending on implementation:

- User
- Student
- Profile
- Verification
- Student ID verification
- Trip
- Join Request
- Trip Participant
- Notification
- Admin
- Audit Log
- Message
- Report
- Block
- Session
- OTP
- Email verification
- File/document metadata

Use the actual repository as source of truth.

For each entity test:

- required fields,
- nullable fields,
- unique constraints,
- foreign references,
- indexes,
- enums,
- timestamps,
- defaults,
- cascading behavior,
- soft deletes,
- duplicate prevention,
- invalid references,
- orphan records,
- stale records.

---

# 8. AUTHENTICATION TESTING

Test every authentication workflow.

Include at minimum:

### Registration

Test:

- valid signup,
- duplicate email,
- malformed email,
- unsupported email,
- college email restrictions,
- lowercase/uppercase handling,
- leading/trailing spaces,
- invalid password,
- weak password,
- very long password,
- mismatched confirm password if applicable,
- missing required fields,
- duplicate username/phone if applicable,
- repeated submissions,
- double click,
- signup after account deletion,
- signup using an existing partially verified account.

### Login

Test:

- correct credentials,
- wrong password,
- nonexistent account,
- case sensitivity,
- blank input,
- suspended account,
- deleted account,
- unverified account,
- malformed requests,
- brute-force style repeated attempts if rate limits exist.

### Logout

Verify:

- session invalidated correctly,
- refresh token invalidated where appropriate,
- browser back button does not expose private data improperly,
- authenticated API endpoints become unavailable.

### Password reset

If implemented:

- valid reset,
- invalid token,
- expired token,
- already-used token,
- reset for nonexistent account,
- enumeration protection,
- multiple reset requests,
- old password invalidated,
- active sessions behavior.

---

# 9. SESSION / JWT / TOKEN TESTING

Determine actual auth architecture.

If JWT/token-based, test:

- missing token,
- malformed token,
- expired token,
- modified payload,
- wrong signature,
- revoked token,
- refresh token reuse,
- token replay,
- incorrect role claims,
- user deleted after token issued,
- user verification changed after token issued,
- admin demoted after token issued.

Verify sensitive authorization decisions are not based solely on unsafe client-side claims.

---

# 10. AUTHORIZATION TESTING

This is CRITICAL.

Create or identify accounts for all relevant states:

- logged-out visitor,
- unverified student,
- partially verified/yellow student,
- fully verified/blue student,
- admin/golden user,
- suspended user if implemented.

For EVERY protected page and API test:

### Horizontal privilege escalation

Can User A:

- view User B's private data?
- edit User B's profile?
- modify User B's trip?
- cancel User B's trip?
- accept requests on User B's trip?
- reject requests on User B's trip?
- see User B's verification documents?
- access hidden identifiers?
- modify another user's join request?

Change IDs manually in:

- URL path,
- query string,
- request body,
- API request,
- GraphQL request if applicable.

### Vertical privilege escalation

Can a normal user:

- call admin APIs?
- open admin pages?
- modify verification status?
- change their role?
- give themselves a golden/admin badge?
- approve their own verification?
- view admin analytics?
- ban other users?
- read verification documents?

UI hiding is NOT security.

Validate backend authorization.

---

# 11. EMAIL / COLLEGE VERIFICATION TESTING

If RouteMate restricts users based on college email such as `@kiet.edu` or another institutional domain, test thoroughly.

Test:

- valid college email,
- invalid external email,
- spoofed subdomain,
- `user@kiet.edu.attacker.com`,
- `user+kiet@other.com`,
- uppercase domain,
- trailing spaces,
- unicode lookalikes,
- malformed address,
- already-used email,
- email verification token expiry,
- replay,
- wrong user token,
- verification token reuse.

Verify verification state is stored securely on the backend.

---

# 12. STUDENT ID / DOCUMENT VERIFICATION TESTING

Test complete document verification lifecycle.

Include:

- valid upload,
- unsupported file,
- oversized file,
- zero-byte file,
- renamed malicious file,
- filename with script characters,
- double extension,
- extremely long filename,
- duplicate upload,
- upload cancellation,
- network interruption,
- repeated submission,
- replacing pending document,
- replacing approved document,
- rejected verification re-submission,
- admin approval,
- admin rejection,
- stale client after admin decision.

Verify:

- users cannot approve themselves,
- users cannot inspect another student's verification file,
- upload URLs do not unintentionally expose documents,
- document IDs cannot be enumerated,
- MIME type is validated server-side,
- file extension alone is not trusted.

---

# 13. BADGE / TRUST STATE TESTING

For each verification state ensure:

- correct badge is shown,
- wrong badge never appears,
- state persists after refresh,
- backend APIs return consistent state,
- profile card state matches full profile,
- search results match profile,
- admin view matches user view,
- revoked verification updates everywhere,
- cached frontend does not continue showing old trust state.

Check whether trip privileges differ based on verification level.

If so, test every boundary.

---

# 14. PROFILE TESTING

Test:

- profile creation,
- profile editing,
- required fields,
- optional fields,
- profile image upload,
- invalid images,
- oversized images,
- unusual Unicode names,
- empty strings,
- whitespace-only inputs,
- extremely long text,
- malicious HTML,
- script strings,
- invalid URLs,
- invalid phone numbers,
- invalid year/branch,
- invalid gender values,
- invalid college data,
- stale profile updates,
- repeated save clicks.

Verify account owner alone can edit private profile data.

---

# 15. TRIP CREATION TESTING

Test every trip field found in the implementation.

Possible fields:

- source,
- destination,
- date,
- time,
- transport type,
- available seats,
- gender preference,
- year preference,
- notes,
- meeting point,
- route details.

Test:

### Valid cases

- current/future trip,
- different transport types,
- minimum seats,
- maximum allowed seats.

### Invalid dates

- past date,
- invalid date,
- impossible date,
- timezone boundary,
- DST if relevant,
- trip date exactly at cutoff.

### Invalid capacity

- zero,
- negative,
- decimal,
- huge number,
- string,
- NaN-style values if API allows.

### Input attacks

- script tags,
- SQL-like strings,
- MongoDB operator injection attempts,
- extremely long strings,
- JSON structure injection,
- nested objects where strings are expected.

Test client AND server validation.

---

# 16. TRIP EDITING TESTING

Verify:

- creator can edit allowed fields,
- participant cannot edit,
- random student cannot edit,
- editing after requests exist,
- editing after users joined,
- reducing seats below participant count,
- changing destination after acceptance,
- changing date/time after acceptance,
- canceling trip,
- editing completed trip,
- editing expired trip,
- simultaneous edits.

Determine and test intended business rules.

Report ambiguity as a product/business-rule issue rather than inventing behavior.

---

# 17. TRIP DELETION / CANCELLATION

Test:

- creator cancels,
- unauthorized user attempts cancellation,
- cancel with zero join requests,
- cancel with pending requests,
- cancel with accepted participants,
- double cancellation,
- cancellation during concurrent join acceptance.

Check:

- participants are notified if notifications exist,
- stale trip disappears from search,
- join requests transition correctly,
- database references remain consistent,
- cancelled trip cannot accept new requests.

---

# 18. SEARCH TESTING

Comprehensively test trip search.

Test:

- exact destination,
- partial destination,
- source,
- case-insensitive matching,
- spaces,
- punctuation,
- Unicode,
- no results,
- large result sets,
- pagination,
- duplicate records,
- sorting,
- stale/deleted trips,
- expired trips.

---

# 19. FILTER TESTING

RouteMate may support filters such as:

- destination,
- year,
- gender,
- transport.

Test each filter individually and in combinations.

Examples:

- destination only,
- gender only,
- transport only,
- year only,
- destination + gender,
- destination + transport,
- gender + year,
- all filters together.

Verify:

- filters actually affect backend query if expected,
- clearing filters works,
- invalid filters do not crash backend,
- manipulated filter values are safely handled,
- pagination remains correct after filtering.

---

# 20. JOIN REQUEST WORKFLOW

Test complete lifecycle.

Expected possible flow:

```text
Student finds trip
→ Student sends join request
→ Trip owner receives request
→ Owner accepts/rejects
→ Participant state updates
```

Test:

- valid request,
- requesting own trip,
- duplicate request,
- request after already accepted,
- request after rejection,
- request after cancellation,
- request to expired trip,
- request when full,
- request while one seat remains,
- simultaneous users requesting final seat,
- request by unverified user if restrictions exist,
- request blocked based on trip preferences,
- malicious direct API bypass.

---

# 21. ACCEPT / REJECT JOIN REQUESTS

Test:

- valid accept,
- valid reject,
- unauthorized accept,
- unauthorized reject,
- accept same request twice,
- reject same request twice,
- accept after reject,
- reject after accept,
- accept after trip cancellation,
- accept after trip reaches capacity.

CRITICAL concurrency test:

If only one seat remains and two requests are accepted at almost the same time, ensure participant count does not exceed capacity.

---

# 22. PARTICIPANT MANAGEMENT

If implemented, test:

- removing participant,
- participant leaves trip,
- owner removes participant,
- unauthorized removal,
- leaving after trip time,
- repeated leave,
- seat count restoration,
- request status consistency,
- notifications.

---

# 23. DUPLICATE / IDEMPOTENCY TESTING

Double-click or resend important actions:

- signup,
- login,
- verification submission,
- trip creation,
- join request,
- accept,
- reject,
- cancel,
- profile save.

Ensure duplicate network calls do not create duplicate records or impossible states.

---

# 24. ADMIN PANEL TESTING

Discover every admin feature and test ALL of them.

Potential features:

- user management,
- verification review,
- trip management,
- reports,
- analytics,
- user suspension,
- account deletion,
- audit logs,
- dashboard metrics.

For each action test:

- authorized admin,
- normal user,
- logged-out user,
- invalid target user,
- repeated action,
- stale data,
- concurrent action.

---

# 25. ADMIN VERIFICATION TESTING

Test:

- review pending verification,
- approve,
- reject,
- reopen if supported,
- duplicate decision,
- two admins acting simultaneously,
- approving deleted user,
- approving already-approved student,
- rejection reason validation.

Verify user badge updates immediately or predictably.

---

# 26. ADMIN ROLE SECURITY

Test whether users can manipulate:

- `role`
- `isAdmin`
- `badge`
- `verificationStatus`
- `verified`
- `studentVerified`

through:

- profile update APIs,
- signup request body,
- browser devtools,
- direct HTTP requests,
- parameter pollution,
- nested JSON payloads.

Backend must ignore or reject protected fields.

---

# 27. DATABASE SECURITY & NOSQL INJECTION

Because MongoDB may be used, test for NoSQL injection where applicable.

Try payload classes such as unexpected operator objects in fields expected to be strings.

Test authentication/search endpoints against:

- operator injection,
- nested object injection,
- regex abuse,
- query selector injection.

Do this SAFELY in the local/test environment.

Do not damage production data.

---

# 28. XSS TESTING

Test user-controlled fields including:

- name,
- bio,
- source,
- destination,
- notes,
- comments,
- rejection reasons,
- profile fields,
- search query.

Check:

- reflected XSS,
- stored XSS,
- DOM-based XSS.

Ensure rendered content is escaped/sanitized correctly.

---

# 29. CSRF TESTING

If cookie/session authentication is used, verify state-changing endpoints have appropriate CSRF protection or equivalent safe architecture.

Test:

- profile update,
- trip creation,
- join request,
- accept/reject,
- verification actions,
- admin actions.

---

# 30. CORS TESTING

Inspect backend CORS policy.

Verify:

- production frontend origin allowed,
- arbitrary origins not allowed with credentials,
- local dev origins handled appropriately,
- preflight works,
- unsafe wildcard configuration is not used with credentials.

---

# 31. SECURITY HEADERS

Inspect deployed/frontend/backend headers where possible.

Check:

- Content-Security-Policy
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy
- HSTS
- frame protection / `frame-ancestors`

Flag missing headers according to realistic risk.

---

# 32. SENSITIVE DATA EXPOSURE

Inspect API responses.

Ensure they do NOT accidentally expose:

- password hashes,
- reset tokens,
- OTPs,
- auth tokens,
- internal admin fields,
- verification file secrets,
- hidden database metadata,
- private phone/email unnecessarily,
- environment secrets.

Check browser local storage/session storage/cookies.

---

# 33. ENVIRONMENT VARIABLE SECURITY

Inspect repository for accidentally committed secrets.

Search for:

- database URLs,
- API keys,
- JWT secrets,
- service credentials,
- SMTP passwords,
- private keys,
- storage credentials,
- admin passwords.

Distinguish:

- public frontend environment variables,
- private server variables.

Report secrets without unnecessarily reproducing them in output.

---

# 34. RATE LIMITING / ABUSE TESTING

Check sensitive endpoints:

- login,
- signup,
- forgot password,
- OTP,
- verification,
- join requests,
- search if expensive,
- admin endpoints.

Test basic repetitive abuse.

Do not conduct destructive load attacks.

---

# 35. VALIDATION CONSISTENCY

For every form, compare:

- frontend validation,
- backend validation,
- database constraints.

Backend must remain secure even if frontend validation is bypassed.

Generate malformed direct API requests to verify this.

---

# 36. ERROR HANDLING

Force errors such as:

- backend unavailable,
- DB failure if test harness supports mocking,
- expired auth,
- invalid response,
- upload failure,
- timeout,
- 400,
- 401,
- 403,
- 404,
- 409,
- 422,
- 429,
- 500.

Verify UI:

- does not crash,
- does not show blank screen,
- shows meaningful message,
- allows retry where appropriate,
- does not expose stack traces.

---

# 37. LOADING STATES

Test every async action.

Look for:

- no loading indicator,
- frozen buttons,
- duplicate actions,
- incorrect optimistic update,
- spinner that never ends,
- page flashing stale data,
- form resubmission.

---

# 38. EMPTY STATES

Test:

- no trips,
- no search results,
- no requests,
- no notifications,
- no pending verification,
- admin dashboard with zero data,
- incomplete profile.

Ensure UI remains usable.

---

# 39. NAVIGATION TESTING

Test:

- every navigation link,
- logo,
- sidebar,
- navbar,
- back button,
- browser refresh,
- deep links,
- bookmarked authenticated routes,
- missing routes,
- redirects after login/logout.

Detect redirect loops.

---

# 40. PAGE REFRESH TESTING

Refresh at every important state:

- dashboard,
- profile,
- trip details,
- admin panel,
- verification page,
- protected route.

Verify auth and data restore correctly.

---

# 41. RESPONSIVENESS

Test approximately:

- 320px
- 375px
- 390px
- 430px
- 768px
- 1024px
- 1280px
- 1440px
- 1920px

Check:

- overflow,
- clipped text,
- broken cards,
- overlapping controls,
- inaccessible modals,
- tables,
- dropdowns,
- navigation,
- forms,
- sticky elements,
- admin dashboard.

---

# 42. BROWSER COMPATIBILITY

Where supported, test:

- Chrome/Chromium
- Edge
- Firefox
- Safari/WebKit

At minimum inspect likely incompatibilities.

---

# 43. ACCESSIBILITY

Audit important pages for:

- semantic HTML,
- labels,
- keyboard navigation,
- tab order,
- focus states,
- modal focus trap,
- ARIA usage,
- color contrast,
- alt text,
- accessible error messages,
- screen-reader names,
- badge meaning not conveyed by color alone.

RouteMate verification states should not depend only on red/yellow/blue/gold colors.

Provide accessible textual indicators.

---

# 44. PERFORMANCE TESTING

Measure important flows.

Check:

- first page load,
- dashboard load,
- search,
- trip details,
- profile,
- admin dashboard.

Identify:

- unnecessary API calls,
- waterfall requests,
- huge bundles,
- unoptimized images,
- repeated renders,
- slow database queries,
- missing indexes,
- expensive unbounded searches.

Do not optimize prematurely.

Report measurable issues.

---

# 45. DATABASE INDEX / QUERY REVIEW

Inspect frequent queries such as:

- trip search,
- user lookup,
- verification lookup,
- join request lookup,
- admin listing.

Check whether appropriate indexes exist.

Flag:

- full collection scans,
- unbounded regex queries,
- missing compound indexes,
- inefficient pagination.

---

# 46. PAGINATION

For every large collection/list test:

- page 1,
- middle page,
- final page,
- no results,
- one result,
- page size manipulation,
- invalid page,
- negative page,
- huge page,
- filters combined with pagination.

Check duplicate/missing rows between pages.

---

# 47. TIMEZONE TESTING

RouteMate is travel-related, so timestamps are critical.

Test:

- local date display,
- UTC storage,
- client timezone,
- server timezone,
- trip expiry,
- midnight boundaries,
- users creating near-midnight trips.

Ensure trip times do not shift unexpectedly after refresh/deployment.

---

# 48. CONCURRENCY TESTING

Simulate realistic concurrency.

Examples:

### Last seat

Trip has one available seat.

Two owners/actions try to accept two join requests concurrently.

Expected:

- only one succeeds if capacity is one.

### Duplicate join

Same student submits request through two tabs.

Expected:

- one logical request.

### Simultaneous verification action

Two admins approve/reject the same record.

Expected:

- deterministic final state,
- no corrupt transition.

### Simultaneous trip edit

Two browser sessions modify same trip.

Report lost-update risk if present.

---

# 49. MULTI-TAB TESTING

Test:

- login in two tabs,
- logout in one tab,
- verification status changed in another,
- trip cancellation in another,
- role changes,
- session expiry.

Check stale UI behavior.

---

# 50. PRIVACY TESTING

Review whether sensitive student/travel data is unnecessarily public.

Inspect exposure of:

- phone,
- email,
- exact meeting location,
- travel schedule,
- college ID,
- private profile fields.

Identify whether unauthenticated users or unrelated students can access excessive data.

Categorize privacy risk severity.

---

# 51. SAFETY-FOCUSED TESTING

Since RouteMate emphasizes student travel safety, test trust-critical behavior carefully.

Examples:

- Can an unverified user appear as verified?
- Can a banned user continue joining trips?
- Can someone spoof another identity?
- Can verification be bypassed?
- Can users view private trip details without joining?
- Can accepted participant data leak publicly?
- Can deleted/suspended users remain in trip membership?
- Can revoked verification remain cached?

Treat trust-status defects as HIGH severity.

---

# 52. REPORT / BLOCK FUNCTIONALITY

If implemented, test:

### Reporting

- report user,
- report trip,
- invalid report,
- duplicate report,
- malicious input,
- self-report,
- admin review.

### Blocking

- block user,
- unblock,
- blocked user tries to request trip,
- blocked user search visibility,
- direct API bypass.

---

# 53. NOTIFICATIONS

If implemented, test:

- join request notification,
- accept notification,
- reject notification,
- trip cancellation,
- verification approved/rejected.

Verify:

- correct recipient,
- no duplicate notification,
- correct read/unread state,
- unauthorized read protection,
- navigation target works.

---

# 54. UI CONSISTENCY

Inspect:

- typography,
- button states,
- spacing,
- card alignment,
- badges,
- icons,
- hover states,
- disabled states,
- error states,
- loading states,
- dark mode if implemented.

Do not categorize merely cosmetic differences as critical unless they affect usability.

---

# 55. DEPLOYMENT TESTING

Review actual production/deployment setup.

Possible services:

- Vercel frontend
- Render backend
- MongoDB database

Verify actual config.

Check:

- frontend API base URL,
- backend CORS,
- HTTPS,
- cookies across domains,
- secure cookie settings,
- environment variables,
- production build,
- health endpoint,
- cold start behavior,
- API timeouts,
- database connection reuse,
- missing env handling.

---

# 56. DEVELOPMENT VS PRODUCTION DIFFERENCES

Check for code such as:

```text
if development
localhost
127.0.0.1
mock user
demo user
skip auth
test admin
```

Make sure development bypasses do not activate in production.

---

# 57. DEAD CODE / PLACEHOLDER FEATURES

Identify:

- buttons that do nothing,
- routes returning dummy data,
- fake analytics,
- mock API responses,
- TODO features exposed in production,
- unfinished forms,
- disabled validation,
- hardcoded user IDs,
- fake verification state.

Report these separately as implementation gaps.

---

# 58. STATIC CODE QUALITY REVIEW

Review code for:

- duplicated logic,
- swallowed errors,
- empty catch blocks,
- unsafe `any`,
- insecure defaults,
- missing null checks,
- incorrect async handling,
- memory leaks,
- event-listener leaks,
- stale React effects,
- missing dependency arrays,
- server/client boundary mistakes,
- improper secret exposure,
- inconsistent API types.

Focus on defects with runtime consequences.

---

# 59. TYPE SAFETY

If TypeScript is used:

Run or inspect:

```bash
tsc --noEmit
```

or the project-equivalent check.

Report all meaningful errors.

Do not simply suppress errors with:

```ts
any
@ts-ignore
@ts-expect-error
```

unless genuinely justified.

---

# 60. LINT / BUILD

Run safe project-standard commands where available.

Examples:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

or pnpm/yarn equivalents.

Record:

- success/failure,
- relevant warnings,
- production build issues.

---

# 61. EXISTING TEST SUITE

Inspect existing tests.

Determine:

- what is already covered,
- what is misleading,
- stale tests,
- skipped tests,
- weak assertions,
- tests coupled to implementation.

Do not treat passing unit tests as proof of production correctness.

---

# 62. AUTOMATED TEST CREATION

Where appropriate, generate comprehensive automated tests using the project-compatible tooling.

Preferred categories:

### Unit tests

For pure functions and validation.

### API integration tests

For backend routes.

### Component tests

For critical UI behavior.

### E2E tests

For full workflows.

Do NOT replace meaningful testing with hundreds of low-value snapshot tests.

Prioritize critical business flows.

---

# 63. MINIMUM E2E USER JOURNEYS

Automate or execute at least these journeys where the feature exists:

## Journey 1 — New student

```text
Signup
→ verify email
→ login
→ complete profile
→ submit student ID
→ observe partial verification state
→ admin approves
→ observe blue verified state
```

## Journey 2 — Create trip

```text
Verified student logs in
→ creates trip
→ trip appears in dashboard/search
→ trip detail is correct
```

## Journey 3 — Join trip

```text
Student B searches trip
→ applies filters
→ opens trip
→ sends join request
→ owner sees request
→ owner accepts
→ Student B appears as participant
```

## Journey 4 — Rejection

```text
Student sends request
→ owner rejects
→ request status updates correctly
```

## Journey 5 — Trip cancellation

```text
Owner creates trip
→ participant joins
→ owner cancels
→ trip becomes unavailable
→ participants see correct state
```

## Journey 6 — Authorization attack

```text
Student B manually requests update/delete of Student A trip
→ backend returns unauthorized/forbidden
```

## Journey 7 — Admin restriction

```text
Normal student attempts admin API
→ denied
```

## Journey 8 — Verification bypass

```text
Unverified user tries direct API access to verified-only action
→ denied
```

---

# 64. TEST DATA MATRIX

Use multiple independent accounts.

Example test personas:

```text
USER_A
Fully verified student

USER_B
Fully verified student

USER_C
Unverified student

USER_D
Partially verified student

ADMIN_A
Administrator

ADMIN_B
Second administrator

SUSPENDED_USER
If feature exists
```

Never use only one account for authorization testing.

---

# 65. NEGATIVE TESTING MATRIX

For every input field test:

```text
undefined
null
empty string
whitespace-only
minimum value
maximum value
below minimum
above maximum
wrong type
very long value
Unicode
emoji
HTML
JavaScript string
NoSQL-like payload
unexpected array
unexpected object
```

Use common sense so tests remain meaningful.

---

# 66. HTTP STATUS CODE REVIEW

Check backend semantics.

Examples:

- 200 success
- 201 created
- 204 no content
- 400 malformed request
- 401 unauthenticated
- 403 authenticated but forbidden
- 404 resource absent
- 409 conflict/duplicate
- 422 validation if architecture uses it
- 429 rate limit
- 500 unexpected server error

Report endpoints that return misleading codes.

---

# 67. API CONTRACT TESTING

Verify frontend assumptions match backend responses.

Look for:

- renamed fields,
- missing nested values,
- null assumptions,
- inconsistent pagination,
- string vs number mismatches,
- `_id` vs `id`,
- `userId` vs `user`,
- inconsistent timestamps.

---

# 68. CACHE / STALE DATA TESTING

Check stale-state problems after:

- profile update,
- verification approval,
- trip edit,
- join acceptance,
- cancellation,
- logout.

Verify query caches invalidate correctly.

---

# 69. NETWORK CONDITION TESTING

Where feasible emulate:

- slow network,
- temporary offline,
- request timeout,
- duplicate request,
- interrupted upload.

Check whether UI preserves form data when reasonable.

---

# 70. PAGE SECURITY TESTS

Directly browse restricted URLs while logged out.

Examples based on discovered routes:

```text
/admin
/dashboard
/profile/edit
/verification
/trips/create
```

Verify backend/API prevents access, not merely route redirection.

---

# 71. OPEN REDIRECT TESTING

Inspect redirect parameters such as:

```text
next=
redirect=
returnUrl=
callback=
```

Ensure external attacker-controlled redirects are not possible.

---

# 72. USER ENUMERATION

Test login/forgot-password/signup responses.

Avoid revealing unnecessarily whether a particular student email has an account.

Flag material enumeration weaknesses.

---

# 73. DATABASE STATE AFTER FAILED ACTION

For all critical flows intentionally fail halfway and inspect resulting state.

Examples:

- failed trip creation,
- failed join request,
- failed verification upload,
- failed accept operation.

Ensure partial/orphan records are not created incorrectly.

---

# 74. AUDIT LOGGING

If admin-sensitive actions exist, determine whether key events are auditable.

Potential events:

- verification approval/rejection,
- admin role changes,
- suspension,
- deletion,
- sensitive data access.

Check whether audit records can be modified by ordinary users.

---

# 75. LOGGING SECURITY

Inspect logs for exposure of:

- passwords,
- tokens,
- authorization headers,
- student ID files,
- private data,
- full database URLs.

Sensitive values should not be unnecessarily logged.

---

# 76. THIRD-PARTY INTEGRATIONS

Discover integrations such as:

- email providers,
- storage,
- analytics,
- maps,
- AI matching,
- OAuth,
- error tracking.

Test failure handling where feasible.

Ensure private API keys remain server-side.

---

# 77. AI MATCHING FEATURE

If RouteMate currently includes AI-assisted matching or recommendation features, test them separately.

Determine:

- whether it actually exists,
- inputs,
- outputs,
- whether output affects critical permissions,
- fallback behavior,
- empty result behavior,
- timeout behavior,
- unsafe client trust.

AI recommendations must never override authorization or verification controls.

---

# 78. DATA DELETION

If users can delete accounts:

Test:

- valid deletion,
- re-auth requirement,
- trip ownership handling,
- participant records,
- verification documents,
- join requests,
- notifications,
- public profile,
- session invalidation.

Check for accidental orphan/private data exposure.

---

# 79. SUSPENSION / BAN

If implemented:

- suspended user login,
- active session after suspension,
- trip creation,
- join request,
- profile access,
- search visibility.

Ensure suspension takes effect server-side.

---

# 80. TEST DEPLOYED APPLICATION AS WELL AS LOCAL CODE

If deployment URLs/configuration are accessible in the current Antigravity/TestSprite environment, test:

1. local/test instance,
2. production-like deployment,
3. differences between them.

Do NOT perform destructive tests against production data.

For destructive or high-volume tests, use local/test environments only.

---

# 81. BUG SEVERITY MODEL

Classify every defect.

## P0 — Blocker

Examples:

- authentication completely broken,
- major data corruption,
- production unavailable,
- catastrophic security compromise.

## P1 — Critical

Examples:

- user can become admin,
- unverified user can bypass verification,
- one student can access another's private data,
- verification documents exposed,
- accepted participants exceed seat capacity due to race,
- critical travel safety state is wrong.

## P2 — High

Examples:

- core trip workflow broken,
- join request incorrectly processed,
- profile cannot be saved,
- major mobile page unusable.

## P3 — Medium

Examples:

- validation inconsistency,
- stale data,
- recoverable UI problem,
- meaningful accessibility issue.

## P4 — Low

Examples:

- cosmetic inconsistency,
- minor copy issue,
- non-blocking visual defect.

Do not exaggerate severity.

---

# 82. DEFECT REPORT FORMAT

For every confirmed defect provide:

```text
Bug ID:
Title:
Severity:
Category:
Affected Role:
Affected Page/API:
Environment:

Preconditions:

Steps to Reproduce:
1.
2.
3.

Expected Result:

Actual Result:

Evidence:

Probable Root Cause:

Security / Data / Safety Impact:

Recommended Fix:

Regression Tests Required:
```

Do not report speculative bugs as confirmed.

Use separate label:

```text
POTENTIAL RISK — NEEDS MANUAL CONFIRMATION
```

when appropriate.

---

# 83. TEST EXECUTION REPORT

Produce a table:

| ID | Area | Test | Result | Severity | Evidence |
|----|------|------|--------|----------|----------|

Use:

- PASS
- FAIL
- BLOCKED
- NOT IMPLEMENTED
- NEEDS MANUAL VERIFICATION

---

# 84. REQUIREMENTS TRACEABILITY

Build a feature-to-test matrix.

Example:

| Feature | UI | API | Auth | Security | Edge Cases | E2E |
|---|---|---|---|---|---|---|
| Registration | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Verification | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Trip Creation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Join Request | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

Expand according to actual project features.

No known feature should remain absent without explanation.

---

# 85. COVERAGE GAP REPORT

At the end explicitly report:

### Fully tested

Features with strong automated/manual coverage.

### Partially tested

Features limited by environment/integration constraints.

### Not testable

Explain exact reason.

### Not implemented

Feature referenced somewhere but not actually present.

### Unknown

Anything requiring business clarification.

The goal is to expose uncertainty, not hide it.

---

# 86. SECURITY SUMMARY

Produce a dedicated security summary covering:

- Authentication
- Authorization
- IDOR
- Verification bypass
- XSS
- CSRF
- CORS
- Injection
- File upload
- Secrets
- Sensitive data exposure
- Rate limiting
- Admin security
- Session/token security
- Privacy

Give each category:

```text
PASS
FAIL
PARTIAL
NOT APPLICABLE
```

---

# 87. PRODUCTION READINESS SCORE

Score RouteMate across:

```text
Functional Correctness        /10
Authentication                /10
Authorization                 /10
Verification & Trust          /10
Data Integrity                /10
Security                      /10
Privacy                       /10
Error Handling                /10
UX Reliability                /10
Accessibility                 /10
Responsive Design             /10
Performance                   /10
Deployment Configuration      /10
Observability                 /10
Automated Testing             /10
```

Then calculate an overall production-readiness score.

Do not inflate the score.

---

# 88. RELEASE GATE

Provide one final recommendation:

```text
READY FOR PRODUCTION
```

or

```text
READY WITH MINOR FIXES
```

or

```text
NOT READY — HIGH-SEVERITY ISSUES EXIST
```

or

```text
DO NOT RELEASE — CRITICAL SECURITY/DATA ISSUE
```

Clearly list the release-blocking issues.

---

# 89. FIX PRIORITIZATION

At the end produce:

## Fix before deployment

Only P0/P1 and genuinely release-blocking P2 items.

## Fix immediately after

Important P2/P3 items.

## Improvement backlog

Non-critical improvements.

---

# 90. REGRESSION STRATEGY

After defects are fixed:

1. rerun failed tests,
2. rerun related workflows,
3. rerun authorization tests,
4. rerun verification tests,
5. rerun trip lifecycle tests,
6. rerun production build,
7. rerun full smoke suite.

Do not assume a localized fix cannot break adjacent flows.

---

# 91. REQUIRED SMOKE SUITE

Create a final fast smoke suite containing at minimum:

```text
App loads
Signup works
Login works
Logout works
Protected routes are protected
Profile loads
Profile update works
Verification state works
Trip creation works
Trip search works
Join request works
Accept/reject works
Unauthorized trip modification fails
Admin access restriction works
Admin verification works
Trip cancellation works
Production build succeeds
No critical console errors
```

---

# 92. CONSOLE & NETWORK AUDIT

During browser testing inspect:

### Browser console

Flag:

- uncaught errors,
- hydration errors,
- failed promises,
- React warnings,
- missing keys,
- CSP violations.

### Network

Flag:

- unexpected 4xx/5xx,
- duplicate requests,
- insecure HTTP,
- leaked secrets,
- excessive payloads,
- failed assets,
- infinite polling.

---

# 93. DO NOT CHEAT TESTS

Never "fix" a failing test by:

- weakening assertion,
- deleting the test,
- skipping the test,
- hardcoding expected data,
- bypassing authentication,
- mocking away the actual defect,
- changing real requirements merely to make the suite green.

A green test suite is useful only if it reflects correct behavior.

---

# 94. NO BLIND MASS REFACTORING

Do not refactor working modules merely for style.

If code changes are allowed:

1. confirm defect,
2. identify root cause,
3. make minimal safe fix,
4. add regression test,
5. rerun affected tests,
6. rerun critical smoke suite.

---

# 95. DO NOT DAMAGE EXISTING DEPLOYMENT

Do not:

- delete production collections,
- reset production database,
- spam real users,
- send bulk real emails,
- create destructive admin actions against production accounts,
- conduct denial-of-service attacks,
- leak credentials.

Use isolated test data wherever possible.

---

# 96. FINAL REQUIRED DELIVERABLE

At completion produce a structured report:

```text
ROUTEMATE QA & PRODUCTION READINESS REPORT

1. Executive Summary
2. Detected Architecture
3. Feature Inventory
4. Page Inventory
5. API Inventory
6. Role & Permission Matrix
7. Verification State Matrix
8. Test Environment
9. Test Accounts / Personas
10. Automated Tests Executed
11. Manual / E2E Tests Executed
12. Passed Tests
13. Failed Tests
14. Blocked Tests
15. Functional Defects
16. Security Defects
17. Authorization Defects
18. Verification / Trust Defects
19. Database / Integrity Defects
20. UI / UX Defects
21. Responsive Issues
22. Accessibility Issues
23. Performance Issues
24. Deployment Issues
25. Console / Network Issues
26. Coverage Matrix
27. Coverage Gaps
28. Security Summary
29. Production Readiness Scores
30. Release Blockers
31. Recommended Fix Order
32. Regression Suite
33. Final Release Recommendation
```

---

# 97. MOST IMPORTANT RULE

Do not finish testing after the happy path succeeds.

For every core feature, think in this order:

```text
Happy path
→ invalid input
→ unauthenticated user
→ unauthorized user
→ wrong ownership
→ wrong verification state
→ duplicate request
→ stale state
→ concurrency
→ direct API bypass
→ refresh
→ mobile
→ network failure
→ database consistency
→ security implications
```

---

# 98. ROUTEMATE-SPECIFIC CRITICAL INVARIANTS

Treat the following as system invariants.

These must NEVER be violated:

```text
1. A normal user must never gain admin privileges.

2. A user must never be able to mark themselves verified.

3. A red/yellow/unverified account must never appear blue unless the backend verification state legitimately permits it.

4. Verification status must never rely only on frontend state.

5. A user must never modify another user's trip unless explicitly authorized.

6. A user must never accept/reject requests for a trip they do not control.

7. A trip must never contain more accepted participants than allowed capacity.

8. Duplicate join requests must never create duplicate membership.

9. Cancelled/expired trips must not accept new participants.

10. Private student verification documents must never become publicly accessible.

11. Sensitive student/travel information must not be exposed to unauthorized users.

12. Admin-only data and actions must be enforced server-side.

13. Deleted/suspended users must not continue performing protected actions through stale sessions.

14. Client-side manipulation must never override backend permissions.

15. Failed critical operations must not leave corrupted database state.
```

Any violation of these should normally be considered P0/P1 depending on impact.

---

# 99. TESTSPRITE-SPECIFIC EXECUTION INSTRUCTION

Use TestSprite's available capabilities to automatically:

- inspect the repository,
- understand available routes,
- identify testable flows,
- generate suitable automated tests,
- execute browser-based E2E tests,
- test APIs directly where supported,
- capture screenshots/evidence for UI defects,
- record failing responses,
- generate reproducible steps,
- rerun regression tests.

Do not limit tests merely to what TestSprite generates automatically.

Compare generated coverage against the complete inventory above and manually fill coverage gaps.

---

# 100. START NOW

Begin by producing:

```text
A. Detected RouteMate architecture
B. Complete feature inventory
C. User-role matrix
D. Verification-state matrix
E. Page/route inventory
F. API inventory
G. Database/model inventory
H. Existing test inventory
I. Proposed test matrix
```

Then execute the tests systematically.

Do not declare RouteMate flawless because tests pass.

Instead determine whether the available evidence provides sufficient confidence for a real production release.

The objective is not to produce a green dashboard.

The objective is to discover anything that could break, leak, corrupt, mis-authorize, misrepresent trust, or create a poor experience for a real RouteMate user.