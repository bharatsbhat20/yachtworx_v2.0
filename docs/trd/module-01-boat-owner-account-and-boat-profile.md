# Yachtworx – Technical Requirements Document
## Module 1: Boat Owner Account & Boat Profile System
**Version:** 2.0
**Status:** In Review
**Last Updated:** 2026-03-24

---

# 1. Overview

This module provides the foundational infrastructure for all other Yachtworx modules. It covers:

1. Boat owner registration and authentication
2. Boat profile creation with full vessel specifications
3. Component tracking per vessel (engine, sails, electronics, safety, etc.)
4. Vessel health score calculation
5. AI-assisted boat specification autofill (make/model/year lookup with caching)
6. Upload and management of maintenance and repair documentation
7. Secure storage and retrieval of all boat-related data

This module is a hard dependency for: service booking, provider matching, service history scoring, resale value tracking, and insurance integrations.

---

# 2. User Roles

## 2.1 Boat Owner
- Registers account (email/password)
- Creates and manages one or more boat profiles
- Views AI-autofilled vessel specifications and edits as needed
- Tracks individual boat components and their service status
- Uploads and manages maintenance records per vessel
- Views fleet-level health summary on dashboard

## 2.2 Admin (Internal)
- Views all boat profiles across the platform
- Flags incorrect AI-autofilled specs
- Moderates uploaded documents if flagged
- Manages the boat specs cache (see Section 4.4)

---

# 3. User Flows

## 3.1 Registration Flow

1. User clicks "Sign Up"
2. Enters:
   - First Name
   - Last Name
   - Email
   - Password (min 8 chars, 1 uppercase, 1 number)
   - Role selection: **Boat Owner** or **Service Provider** *(routes to Module 2 if Provider)*
3. System sends verification email
4. User verifies email
5. Account created with `email_verified = true`
6. Redirect to: **"Add Your First Boat"**

**Unverified account behavior:**
- Login permitted but access limited to the verification prompt screen
- No boat creation, document upload, or marketplace access until verified
- Resend verification email available after 60 seconds

---

## 3.2 Add Boat Flow

1. User enters:
   - Vessel Name / Nickname (required)
   - Make (required)
   - Model (required)
   - Year (required)
2. System calls autofill service (`POST /api/v1/boats/autofill`)
3. System autofills (if found):
   - Length Overall
   - Beam
   - Draft
   - Hull Material
   - Engine Type
   - Fuel Type
   - Displacement
   - Manufacturer Specs
4. User confirms or manually edits any autofilled field
5. User optionally adds:
   - Boat Type (dropdown)
   - Home Port / Marina
   - Registration Number
   - Hull Identification Number (HIN)
   - Estimated Value
   - Boat Photo (upload)
6. System creates boat profile and initialises default component set
7. Redirect to new boat profile page

**Multi-boat behavior:**
- After first boat is saved, owner is taken to their fleet dashboard
- "Add Another Vessel" button available from dashboard and fleet overview at any time
- No limit on number of vessels per owner account

---

## 3.3 Component Setup Flow

After a boat is created, the system initialises a default set of tracked components based on `boat_type` and `engine_type`. The owner can:

1. View the pre-populated component list
2. Edit individual component details (install date, last serviced, service interval)
3. Add custom components not in the default set
4. Delete components that don't apply to their vessel

Each component contributes to the vessel's overall **Health Score** (see Section 4.6).

---

## 3.4 Maintenance Upload Flow

1. User clicks "Add Maintenance Record" on a boat profile
2. Uploads file:
   - Accepted: PDF, JPG, PNG, HEIC
   - Max size: 20 MB per file
3. Enters metadata:
   - Service Type (dropdown — see Section 4.5 for enum values)
   - Service Date (date picker)
   - Service Provider (optional free text)
   - Linked Component (optional — links record to a tracked component)
   - Notes (optional)
4. System validates file MIME type server-side
5. File uploaded to private cloud storage via presigned PUT URL
6. Metadata saved to database
7. Record linked to boat profile and optionally to component
8. Component's `last_serviced_date` updated if linked

---

# 4. Functional Requirements

## 4.1 Authentication

- Email/password authentication
- Role-based access control: `owner` | `provider` | `admin`
- Passwords hashed with **Argon2id** (preferred) or bcrypt (min cost 12)
- JWT access tokens — short-lived (15 minutes)
- Refresh tokens — long-lived (30 days), stored as `httpOnly` cookie
- Refresh token rotation on every use
- Refresh token revocation on logout
- Email verification required before full app access
- Password reset flow via time-limited email token (expires 1 hour)
- Rate limiting on all auth endpoints (see Section 7)

---

## 4.2 Boat Profile Creation

**Required Fields:**
| Field | Type | Notes |
|---|---|---|
| name | string | Vessel nickname, e.g. "Sea Breeze" |
| make | string | e.g. "Beneteau" |
| model | string | e.g. "Oceanis 51.1" |
| year | integer | 4-digit year |

**AI-Autofilled Fields (all user-editable):**
| Field | Type | Notes |
|---|---|---|
| length_overall | float | In feet |
| beam | float | In feet |
| draft | float | In feet |
| hull_material | string | e.g. "Fiberglass" |
| engine_type | string | e.g. "Twin MerCruiser" |
| fuel_type | string | e.g. "Gasoline" |
| displacement | float | Optional, in lbs |

**Optional Fields (user-entered):**
| Field | Type | Notes |
|---|---|---|
| boat_type | enum | See Section 4.3 |
| home_port | string | Marina name and location |
| registration_number | string | e.g. "CA-2847-YW" |
| hull_id / hin | string | Hull Identification Number |
| estimated_value | integer | USD, for dashboard display |
| photo_url | string | Uploaded vessel photo |

---

## 4.3 Boat Type Enum

```
sailing_yacht
motor_yacht
catamaran_sail
catamaran_power
center_console
express_cruiser
trawler
sportfish
pontoon
runabout
other
```

---

## 4.4 AI Autofill & Spec Cache

**Trigger:** When a boat is created or make/model/year is changed.

**Request:**
```
POST /api/v1/boats/autofill
{
  "make": "Sea Ray",
  "model": "SLX 400",
  "year": 2021
}
```

**Response:**
```json
{
  "length_overall": 39.9,
  "beam": 12.1,
  "draft": 3.2,
  "displacement": 14200,
  "engine_type": "Twin MerCruiser 6.2L",
  "fuel_type": "Gasoline",
  "hull_material": "Fiberglass",
  "source": "cache" | "api" | "manual"
}
```

**Implementation Options (in priority order):**
1. Third-party marine database API (e.g. NMMA, BUCValu, or equivalent)
2. Internal AI model trained on manufacturer spec data
3. Manual user entry (fallback if lookup returns no results)

**Spec Cache (Performance & Cost Control):**

To avoid redundant external API calls, all successful lookups are stored in a `boat_specs_cache` table keyed on `(make, model, year)`. Subsequent requests for the same combination are served from cache without hitting the external API.

- Cache TTL: 12 months (manufacturer specs rarely change)
- Cache miss → call external API → store result
- Cache hit → return immediately with `"source": "cache"`
- Failed lookups also cached for 7 days with a `lookup_failed` flag to prevent repeated failed calls

**Fallback:**
If lookup fails and no cache hit → return empty spec fields → user manually enters all specs → `source` set to `"manual"`

---

## 4.5 Service Type Enum (Maintenance Documents)

```
engine_service
hull_maintenance
electrical
plumbing
rigging
sails
safety_equipment
survey
winterisation
commissioning
electronics
structural_repair
cosmetic
fuel_system
navigation
other
```

---

## 4.6 Vessel Health Score

Each boat has a calculated `health_score` (0–100) displayed on the dashboard and boat profile. It is not stored statically — it is computed at read time based on the boat's component states.

**Calculation Logic:**

```
health_score = average of all component health scores
```

**Component Health Score Rules:**

| Condition | Score |
|---|---|
| Service is current (within interval) | 100 |
| Service due within 30 days | 70 |
| Service overdue by < 30 days | 40 |
| Service overdue by 30–90 days | 20 |
| Service overdue by > 90 days | 0 |
| No service date recorded | 50 (neutral) |

**Health Score Banding:**

| Score | Label | Colour |
|---|---|---|
| 80–100 | Good | Green |
| 50–79 | Fair | Amber |
| 0–49 | Needs Attention | Red |

Health score is recalculated on: component update, maintenance record upload, and daily via scheduled job.

---

## 4.7 Maintenance Document Storage

- Cloud object storage (AWS S3 or GCS equivalent)
- Private bucket — no public access
- All uploads via **presigned PUT URL** (client uploads directly to storage, not through app server)
- All downloads via **presigned GET URL** (time-limited, e.g. 15 minutes)
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.2+)
- Server-side MIME type validation before issuing presigned URL
- Virus/malware scan on upload completion (via cloud-native scanning or ClamAV integration)
- Files organised in storage as: `/{owner_id}/{boat_id}/{document_id}/{filename}`

---

# 5. Data Model

Relational database — **PostgreSQL** recommended.

All tables use `UUID` primary keys. Soft deletes via `deleted_at` on all primary entities.

---

## 5.1 Users Table

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| first_name | varchar(100) | |
| last_name | varchar(100) | |
| email | varchar(255) | Unique, indexed |
| password_hash | varchar(255) | Argon2id output |
| role | enum | `owner`, `provider`, `admin` |
| email_verified | boolean | Default false |
| avatar_url | text | Optional profile photo |
| phone | varchar(20) | Optional, E.164 format |
| created_at | timestamp | |
| updated_at | timestamp | |
| deleted_at | timestamp | Null = active (soft delete) |

---

## 5.2 Refresh Tokens Table

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id |
| token_hash | varchar(255) | Hashed token value |
| expires_at | timestamp | |
| revoked_at | timestamp | Null = active |
| created_at | timestamp | |

---

## 5.3 Boats Table

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| owner_id | UUID | FK → users.id |
| name | varchar(100) | Vessel nickname |
| make | varchar(100) | |
| model | varchar(100) | |
| year | integer | |
| boat_type | enum | See Section 4.3 |
| length_overall | float | Feet |
| beam | float | Feet |
| draft | float | Feet |
| hull_material | varchar(100) | |
| engine_type | varchar(100) | |
| fuel_type | varchar(100) | |
| displacement | float | Optional, lbs |
| home_port | varchar(255) | Marina name + location |
| registration_number | varchar(50) | |
| hull_id | varchar(50) | HIN |
| estimated_value | integer | USD |
| photo_url | text | |
| specs_source | enum | `cache`, `api`, `manual` |
| created_at | timestamp | |
| updated_at | timestamp | |
| deleted_at | timestamp | Soft delete |

**Relationships:** One owner → many boats

---

## 5.4 Boat Components Table

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| boat_id | UUID | FK → boats.id |
| name | varchar(100) | e.g. "Main Engine", "Standing Rigging" |
| category | varchar(100) | e.g. "Engine", "Rigging", "Safety" |
| install_date | date | Optional |
| last_serviced_date | date | Optional |
| service_interval_days | integer | e.g. 365 for annual |
| notes | text | Optional |
| created_at | timestamp | |
| updated_at | timestamp | |
| deleted_at | timestamp | Soft delete |

**Relationships:** One boat → many components

---

## 5.5 Maintenance Documents Table

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| boat_id | UUID | FK → boats.id |
| component_id | UUID | FK → boat_components.id, nullable |
| uploaded_by | UUID | FK → users.id |
| file_name | varchar(255) | Original filename |
| file_url | text | Storage path (not presigned — resolved at request time) |
| file_size | integer | Bytes |
| mime_type | varchar(100) | e.g. "application/pdf" |
| service_type | enum | See Section 4.5 |
| service_date | date | |
| service_provider | varchar(255) | Optional free text |
| notes | text | Optional |
| created_at | timestamp | |
| deleted_at | timestamp | Soft delete |

**Relationships:** One boat → many documents; one component → many documents

---

## 5.6 Boat Specs Cache Table

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| make | varchar(100) | Composite index: make + model + year |
| model | varchar(100) | |
| year | integer | |
| length_overall | float | |
| beam | float | |
| draft | float | |
| hull_material | varchar(100) | |
| engine_type | varchar(100) | |
| fuel_type | varchar(100) | |
| displacement | float | |
| lookup_failed | boolean | True = no spec found |
| source_api | varchar(100) | Which external API returned this |
| cached_at | timestamp | |
| expires_at | timestamp | |

---

# 6. API Endpoints

All endpoints versioned under `/api/v1/`.
All protected endpoints require `Authorization: Bearer <access_token>` header.

---

## 6.1 Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | None | Create new account |
| POST | `/api/v1/auth/login` | None | Authenticate, returns access + refresh token |
| POST | `/api/v1/auth/logout` | Required | Revoke refresh token |
| POST | `/api/v1/auth/refresh` | Cookie | Exchange refresh token for new access token |
| POST | `/api/v1/auth/verify-email` | None | Verify email with token from email link |
| POST | `/api/v1/auth/resend-verification` | None | Resend verification email |
| POST | `/api/v1/auth/forgot-password` | None | Send password reset email |
| POST | `/api/v1/auth/reset-password` | None | Reset password with token |

---

## 6.2 Boat Profiles

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/boats` | Required | List all boats for authenticated owner |
| POST | `/api/v1/boats` | Required | Create new boat profile |
| GET | `/api/v1/boats/{id}` | Required | Get single boat profile |
| PUT | `/api/v1/boats/{id}` | Required | Update boat profile |
| DELETE | `/api/v1/boats/{id}` | Required | Soft delete boat |

---

## 6.3 AI Autofill

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/boats/autofill` | Required | Lookup specs by make/model/year |

---

## 6.4 Boat Components

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/boats/{id}/components` | Required | List all components for a boat |
| POST | `/api/v1/boats/{id}/components` | Required | Add a component |
| PUT | `/api/v1/boats/{id}/components/{componentId}` | Required | Update a component |
| DELETE | `/api/v1/boats/{id}/components/{componentId}` | Required | Delete a component |

---

## 6.5 Maintenance Documents

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/boats/{id}/documents` | Required | List all documents for a boat |
| POST | `/api/v1/boats/{id}/documents` | Required | Create document record + get presigned upload URL |
| GET | `/api/v1/documents/{documentId}/download-url` | Required | Get time-limited presigned download URL |
| DELETE | `/api/v1/documents/{documentId}` | Required | Soft delete document record + remove from storage |

---

## 6.6 Health Score

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/boats/{id}/health` | Required | Get computed health score + component breakdown |

---

# 7. Security Requirements

## 7.1 Authentication & Authorisation
- JWT access tokens expire after **15 minutes**
- Refresh tokens expire after **30 days**, rotated on every use
- Refresh tokens stored as `httpOnly`, `Secure`, `SameSite=Strict` cookies
- Owners can only access their own boats (enforced at query level, not just route level)
- Admin role required for cross-owner access
- All role checks performed server-side

## 7.2 Rate Limiting
| Endpoint Group | Limit |
|---|---|
| `POST /auth/login` | 10 requests / 15 min / IP |
| `POST /auth/register` | 5 requests / hour / IP |
| `POST /auth/forgot-password` | 5 requests / hour / IP |
| `POST /auth/refresh` | 60 requests / hour / user |
| All other endpoints | 300 requests / min / user |

## 7.3 Input Validation
- All fields validated server-side (never trust client)
- Email: RFC 5322 format check
- Year: integer between 1900 and current year + 1
- Float fields: positive numbers only, reasonable upper bounds
- String fields: max length enforced, HTML stripped
- UUIDs: validated as proper UUID format before any DB query

## 7.4 File Upload Security
- MIME type validated server-side before presigned URL is issued
- Accepted types: `application/pdf`, `image/jpeg`, `image/png`, `image/heic`
- Max file size: 20 MB enforced at storage layer
- Virus/malware scan triggered on upload completion
- Files stored with randomised path (UUID-based) — not guessable URLs
- Presigned download URLs expire after 15 minutes

## 7.5 Data Protection
- Encryption at rest: AES-256
- Encryption in transit: TLS 1.2 minimum, TLS 1.3 preferred
- Passwords never logged
- PII fields (email, name, phone) excluded from application logs
- Database connections use SSL

---

# 8. Non-Functional Requirements

| Requirement | Target |
|---|---|
| API response time (p95) | < 300ms (excluding AI lookup) |
| AI autofill response time | < 2s (cache hit < 50ms) |
| Uptime SLA | 99.5% |
| Initial scale target | 50,000 registered users |
| File storage growth allowance | 10 GB / 1,000 active boats |
| Deployment | Cloud-native (AWS / GCP / Azure) |
| Database | PostgreSQL 15+ |
| Environments | dev, staging, production |
| Logging | Structured JSON logs, retained 90 days |
| Alerting | Error rate > 1% triggers PagerDuty / equivalent |

---

# 9. Default Component Sets

When a boat is created, the system initialises components based on `boat_type`. These are defaults — all can be edited or deleted by the owner.

## Motor Yacht / Express Cruiser
- Port Engine
- Starboard Engine (if twin)
- Generator
- Fuel System
- Bilge Pumps
- Safety Equipment
- Electronics / Navigation
- Hull & Gelcoat
- HVAC

## Sailing Yacht
- Main Engine
- Standing Rigging
- Running Rigging
- Mainsail
- Headsail
- Furling System
- Safety Equipment
- Electronics / Navigation
- Hull & Gelcoat
- Generator (if fitted)

## Catamaran (Sail)
- Port Engine
- Starboard Engine
- Standing Rigging
- Running Rigging
- Mainsail
- Headsail
- Safety Equipment
- Electronics / Navigation
- Hull & Gelcoat (Port)
- Hull & Gelcoat (Starboard)

---

# 10. Error Handling

All API errors return a consistent JSON envelope:

```json
{
  "error": {
    "code": "BOAT_NOT_FOUND",
    "message": "No boat found with the provided ID.",
    "status": 404
  }
}
```

**Standard Error Codes:**

| Code | HTTP Status | Description |
|---|---|---|
| `VALIDATION_ERROR` | 400 | One or more input fields are invalid |
| `UNAUTHORIZED` | 401 | Missing or expired access token |
| `FORBIDDEN` | 403 | Valid token but insufficient permissions |
| `BOAT_NOT_FOUND` | 404 | Boat ID does not exist or not owned by user |
| `DOCUMENT_NOT_FOUND` | 404 | Document ID does not exist |
| `EMAIL_ALREADY_EXISTS` | 409 | Registration with duplicate email |
| `EMAIL_NOT_VERIFIED` | 403 | Action requires verified email |
| `AUTOFILL_UNAVAILABLE` | 503 | External spec API unreachable |
| `UPLOAD_TOO_LARGE` | 413 | File exceeds 20 MB limit |
| `UNSUPPORTED_FILE_TYPE` | 415 | MIME type not permitted |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

---

# 11. Future Extensibility

The schema and API design must accommodate the following planned modules **without breaking changes**:

| Future Module | Dependency on Module 1 |
|---|---|
| **Module 2: Service Provider** | `users.role`, `boats.home_port`, `boat_components` |
| **Module 3: Service Requests & Booking** | `boats.id`, `boat_components.id`, `maintenance_documents` |
| **Module 4: Provider Matching** | `boats.boat_type`, `boats.home_port`, `boat_components` |
| **Module 5: Service History Scoring** | `maintenance_documents`, `boat_components.last_serviced_date` |
| **Module 6: Resale Value Insights** | `boats.estimated_value`, `maintenance_documents`, `health_score` |
| **Module 7: Insurance Integrations** | `boats.hull_id`, `boats.registration_number`, `maintenance_documents` |

**Design rules for extensibility:**
- Never hard-delete records that could be referenced by future modules — use soft deletes
- `boat_components` must remain the single source of truth for service state
- The health score calculation must be exposed as a reusable service, not inline logic
- All IDs must be UUIDs (not auto-increment integers) to support future distributed architecture

---

# 12. Open Questions

Items requiring a decision before development begins:

| # | Question | Owner | Priority |
|---|---|---|---|
| 1 | Which third-party marine spec API to use for autofill? (NMMA, BUCValu, or build internal?) | Product + Engineering | High |
| 2 | Storage provider preference: AWS S3, GCS, or Cloudflare R2? | Engineering | High |
| 3 | Enforce storage quota per user account, or platform-wide only? | Product | Medium |
| 4 | Should estimated_value be user-entered only, or should the platform calculate it from service history? | Product | Medium |
| 5 | Is HEIC (Apple photo format) a required upload format at launch? | Product | Low |
| 6 | Email service provider: SendGrid, Postmark, AWS SES? | Engineering | High |
