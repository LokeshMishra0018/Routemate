# RouteMate REST API Specification (v1)

Base URL: `/api/v1`

---

## 1. Authentication & Sessions (`/api/v1/auth`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Register new student with verified institutional domain | No |
| `POST` | `/auth/verify-email` | Confirm email ownership via verification token | No |
| `POST` | `/auth/login` | Authenticate credentials and receive access/refresh tokens | No |
| `POST` | `/auth/refresh` | Rotate expired access token using refresh token | No |
| `POST` | `/auth/forgot-password` | Request password reset token via institutional email | No |
| `POST` | `/auth/reset-password` | Reset account password with token | No |
| `POST` | `/auth/logout` | Revoke active user session and clear cookies | Yes |

---

## 2. Users & Identity (`/api/v1`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/me` | Get authenticated user's private profile & trust score | Yes |
| `PATCH` | `/me` | Update bio, gender, academic year, and preferences | Yes |
| `GET` | `/users/:id` | Get public sanitized user profile | Yes |

---

## 3. Trips & Route Coordination (`/api/v1/trips`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/trips` | Publish a new trip with source, destination & stops | Yes |
| `GET` | `/trips` | Filter trips by route radius, transport mode, and date | Yes |
| `GET` | `/trips/:id` | Get single trip details with participant rosters | Yes |
| `PATCH` | `/trips/:id` | Update trip status (`active`, `completed`, `cancelled`) | Yes |
| `DELETE` | `/trips/:id` | Cancel/delete an upcoming trip | Yes |

---

## 4. Deterministic 6-Factor Matching (`/api/v1/matches`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/matches` | Retrieve computed compatible travel companions | Yes |
| `POST` | `/matches/generate/:tripId` | Trigger on-demand 6-factor match calculation | Yes |
| `GET` | `/matches/:id` | Get score breakdown (route, date, time, mode, trust) | Yes |

---

## 5. Connections & Companion Handshake (`/api/v1/connections`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/connections` | Send travel companion request | Yes |
| `GET` | `/connections` | List incoming, outgoing, or active buddy connections | Yes |
| `PATCH` | `/connections/:id` | Accept, reject, or cancel connection request | Yes |

---

## 6. Realtime Messaging (`/api/v1/conversations`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/conversations` | List user's active direct and group conversations | Yes |
| `GET` | `/conversations/:id/messages` | Retrieve conversation message history | Yes |
| `POST` | `/conversations/:id/messages` | Send message in conversation | Yes |
| `POST` | `/conversations/:id/read` | Mark all unread messages as read | Yes |

---

## 7. Groups & Cost Splitting (`/api/v1/groups`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/groups` | Create travel group with seat capacity & cost pool | Yes |
| `GET` | `/groups` | Discover open groups matching trip route | Yes |
| `GET` | `/groups/:id` | Get group details with members and cost split | Yes |
| `POST` | `/groups/:id/join` | Join group (enforces atomic seat capacity) | Yes |
| `POST` | `/groups/:id/leave` | Leave group (recalculates remaining cost split) | Yes |

---

## 8. Safety, Emergency SOS & Contacts (`/api/v1/safety`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/safety/emergency-contacts` | List user's registered emergency contacts | Yes |
| `POST` | `/safety/emergency-contacts` | Add emergency contact (primary indicator) | Yes |
| `DELETE` | `/safety/emergency-contacts/:id` | Remove emergency contact | Yes |
| `POST` | `/safety/sos` | Trigger emergency SOS alert with live GPS coordinates | Yes |
| `POST` | `/safety/reports` | File confidential safety report against user/trip | Yes |

---

## 9. Admin & Moderation Portal (`/api/v1/admin`)

| Method | Endpoint | Description | Role Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/verifications` | View pending college student ID submissions | `moderator`, `admin` |
| `PATCH` | `/admin/verifications/:id` | Approve (boost trust) or reject student ID | `moderator`, `admin` |
| `GET` | `/admin/reports` | Review filed safety & conduct incident reports | `moderator`, `admin` |
| `PATCH` | `/admin/reports/:id` | Resolve report & optionally suspend offending user | `moderator`, `admin` |
| `GET` | `/admin/sos-events` | Monitor live emergency SOS radar alerts | `moderator`, `admin` |
| `PATCH` | `/admin/sos-events/:id` | Resolve active emergency SOS event | `moderator`, `admin` |
| `GET` | `/admin/users` | Search student directory and review audit trail | `admin` |
| `POST` | `/admin/users/:id/suspend` | Disciplinary account suspension | `admin` |
