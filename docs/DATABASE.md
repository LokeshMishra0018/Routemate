# RouteMate Database Specification (MongoDB Atlas)

## 1. Database Philosophy

RouteMate uses **MongoDB Atlas** with the official MongoDB Node.js driver.
- **Embedded data:** Bounded, tightly coupled entities (e.g. `trip.stops[]`, `trip.preferences`, `trip.costSharing`, `trip.source.coordinates`).
- **Referenced data:** Independently growing entities (e.g. `users`, `profiles`, `trips`, `matches`, `connections`, `conversations`, `messages`, `reviews`, `reports`, `notifications`).

## 2. Core Collections

1. `users`: Auth credentials, roles (`student`, `moderator`, `admin`), statuses (`active`, `suspended`, `deactivated`).
2. `profiles`: Full name, college reference, academic year, avatar, trust score, average rating.
3. `colleges`: Institutional names, domains (e.g. `kiet.edu`), active status.
4. `verificationRequests`: College ID documents (private storage key), status (`pending`, `approved`, `rejected`), audit reviewer.
5. `trips`: Source, destination, GeoJSON coordinates (`2dsphere`), travel dates, departure times, transport types, preferences.
6. `matches`: Calculated match scores (0-100), sub-scores, human-readable explanations, status (`active`, `dismissed`, `expired`, `connected`).
7. `connections`: Relationship requests (`pending`, `accepted`, `rejected`, `cancelled`, `blocked`).
8. `conversations`: Direct / Group conversation channels.
9. `messages`: Encrypted/sanitized message bodies, read states, sender references.
10. `groups`: Group details, trip association, capacity limits.
11. `groupMembers`: Group membership records.
12. `reviews`: 1-5 star ratings across communication, punctuality, behaviour, and overall score.
13. `notifications`: In-app notification events with read tracking.
14. `reports`: Safety reports submitted by users for moderation.
15. `blocks`: Mutual blocking pairs preventing interaction across matches, chats, and connections.
16. `recurringTrips`: Recurring trip templates and recurrence rules.
17. `adminActions`: Immutable audit logging for sensitive actions.
18. `badges` & `userBadges`: Gamification & community badges.
19. `sessions`: Refresh token hashes, device info, IP metadata, TTL expiration.

## 3. Indexes & Constraints

Defined and synchronized via `backend/src/db/indexes.ts`:
- `users.emailNormalized` -> Unique
- `profiles.userId` -> Unique
- `colleges.domain` -> Unique
- `trips.source.coordinates` -> `2dsphere`
- `trips.destination.coordinates` -> `2dsphere`
- `trips.userId + travelDate` -> Compound index
- `trips.travelDate + status` -> Compound index
- `matches.tripId + candidateTripId` -> Unique compound index
- `blocks.blockerId + blockedUserId` -> Unique compound index
- `sessions.expiresAt` -> TTL index
- `notifications.userId + createdAt` & `notifications.userId + readAt`
