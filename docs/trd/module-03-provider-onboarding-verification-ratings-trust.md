# Yachtworx – Technical Requirements Document
## Module 3: Provider Onboarding, Verification, Ratings & Trust System
**Version:** 2.0
**Date:** 2026-03-25
**Status:** Approved for Implementation

---

## 1. Overview

This module defines the full supply-side control layer for Yachtworx. It covers:

- Service provider registration and email verification
- Structured business profile completion with geographic service areas
- Licensing, insurance, and certification document upload and admin review
- Stripe Connect Express onboarding (KYC + bank account)
- Portfolio / media upload for provider profiles
- Ratings and reviews (reconciled with Module 2 schema)
- Trust score algorithm with full component definitions and cold-start handling
- Provider search ranking logic
- Expiration monitoring with pre-expiry warnings
- Admin moderation tools with role separation and full audit logging
- Fraud and risk controls with defined thresholds
- Notification system

---

## 2. User Roles

### 2.1 Service Provider
- Register a business account and verify email
- Accept Terms of Service (timestamp recorded)
- Complete business profile (service areas, bio, logo, pricing)
- Upload licensing, insurance, and optional certification documents
- Complete Stripe Connect Express onboarding
- Manage service catalog and availability (via Module 2 tables)
- Upload portfolio media (photos, project examples)
- View ratings and trust score
- Respond to reviews
- Appeal suspensions

### 2.2 Admin — Two Sub-Roles

| Action | Moderator | Super Admin |
|---|---|---|
| View pending providers | ✅ | ✅ |
| Approve / reject documents | ✅ | ✅ |
| Suspend / unsuspend accounts | ✅ | ✅ |
| Override trust score | ❌ | ✅ |
| Issue refunds | ❌ | ✅ |
| Manage admin accounts | ❌ | ✅ |
| Bulk actions | ❌ | ✅ |

Admin role stored in `profiles.role` enum: `'owner' | 'provider' | 'moderator' | 'super_admin'`

### 2.3 Boat Owner
- View provider public profile (ratings, certifications, portfolio)
- Leave one review per completed booking
- Flag a review for moderation

---

## 3. Provider Registration Flow

### 3.1 Initial Registration (Step 1)

Provider submits:

| Field | Type | Required | Notes |
|---|---|---|---|
| business_name | varchar(120) | Yes | |
| contact_name | varchar(120) | Yes | |
| email | varchar(255) | Yes | Unique; format validated |
| phone | varchar(20) | Yes | E.164 normalised on save |
| password | varchar | Yes | Min 10 chars, 1 upper, 1 number, 1 special |
| terms_accepted | boolean | Yes | Must be true to submit |

**On submit:**
1. Create `auth.users` entry via Supabase Auth
2. Insert `profiles` row with `role = 'provider'`, `verification_status = 'unverified'`
3. Set `terms_accepted_at = now()`
4. Send verification email (Supabase Auth magic link / OTP)
5. Redirect to "Check your email" screen

**Rate limiting:** Max 5 registration attempts per IP per hour. Implement via Supabase Edge Function or middleware header check.

**Duplicate detection (at registration time):**
- Same email → hard block, show "Account exists" message
- Same phone (normalised) → soft flag, log to `fraud_flags` table for admin review
- Same EIN (if provided) → soft flag, log to `fraud_flags` table

**Initial status:** `unverified`

---

### 3.2 Email Verification (Step 2)

Provider clicks email link → `email_verified_at` timestamp set on `profiles`.

Until email is verified:
- Cannot access profile completion steps
- Cannot upload documents
- Cannot appear in search

---

### 3.3 Business Profile Completion (Step 3)

Provider completes:

| Field | Type | Required | Notes |
|---|---|---|---|
| service_categories | varchar[] | Yes | Min 1, from predefined list |
| years_in_business | int | Yes | Min 0 |
| bio | text | Yes | Min 50 chars, max 1000 chars |
| address_line1 | varchar(200) | Yes | |
| address_city | varchar(100) | Yes | |
| address_state | varchar(100) | Yes | |
| address_zip | varchar(20) | Yes | |
| address_country | varchar(2) | Yes | ISO 3166-1 alpha-2, default 'US' |
| latitude | decimal(10,7) | Yes | Geocoded from address on save |
| longitude | decimal(10,7) | Yes | Geocoded from address on save |
| emergency_availability | boolean | No | Default false |
| profile_photo_url | text | No | Supabase Storage signed URL |
| logo_url | text | No | Supabase Storage signed URL |

**Service areas** are stored in a separate `provider_service_areas` table (see Section 6.4). Provider adds at least 1 service area before profile is considered complete.

**Profile completion scoring** (shown as progress bar in dashboard):

| Item | Weight |
|---|---|
| Email verified | 10% |
| Business profile complete | 15% |
| Profile photo uploaded | 10% |
| Service area(s) added | 10% |
| Business licence approved | 20% |
| Insurance COI approved | 20% |
| Stripe onboarding complete | 15% |

When all items are complete, `profile_complete = true` is set on the `profiles` row.

---

### 3.4 Document Upload (Step 4)

See Section 4.

---

### 3.5 Stripe Connect Onboarding (Step 5)

See Section 5.

**Status after Stripe complete:** `verification_status` remains `pending_review` until admin approves documents. Stripe status is tracked separately.

---

### 3.6 Verification Status State Machine

```
unverified
    │ (email verified)
    ▼
email_verified
    │ (documents uploaded)
    ▼
pending_review
    │                    │
    ▼ (admin approves)   ▼ (admin rejects)
approved              rejected
    │                    │ (provider resubmits)
    │                    └──────────► pending_review
    │ (admin suspends / auto-suspend)
    ▼
suspended
    │ (resubmits valid docs → admin re-approves)
    ▼
approved
```

Valid enum values: `unverified | email_verified | pending_review | approved | rejected | suspended`

Only `approved` providers appear in search results or accept new bookings.

---

## 4. Licensing & Insurance Verification

### 4.1 Required Document Types

| document_type | Label | Required | Notes |
|---|---|---|---|
| `business_license` | Business Licence | Yes | Expiration date required |
| `insurance_coi` | Insurance Certificate (COI) | Yes | Expiration date required |
| `abyc_certification` | ABYC Certification | No | Optional; boosts trust score |
| `manufacturer_cert` | Manufacturer Certification | No | Optional; boosts trust score |
| `other` | Other Certification | No | Free label field |

### 4.2 Upload Constraints

- Accepted MIME types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`
- Max file size: 10 MB per document
- Storage path: `provider-docs/{provider_id}/{document_type}/{uuid}.{ext}` (private Supabase Storage bucket `provider-documents`)
- Expiration date must be in the future at time of upload (server-side validation)

### 4.3 Document Status State Machine

Each document row has a `status` enum:

```
pending
    │                    │
    ▼ (admin approves)   ▼ (admin rejects)
approved              rejected
                         │ (provider resubmits)
                         └──────────► pending (new row, old row is_active = false)
```

Valid values: `pending | approved | rejected`

When a document is rejected, admin must supply a `rejection_reason` (text, max 500 chars) which is shown to the provider.

### 4.4 Admin Notification on Upload

When a provider uploads any document, all admins with role `moderator` or `super_admin` receive an in-app notification: _"[Provider Name] has submitted documents for review."_

### 4.5 Effect of Document Status on Verification

- All required documents must be `approved` for `verification_status` to advance to `approved`
- If any required document expires → auto-suspend (Section 11)
- If provider resubmits an expired document → status → `pending_review` → admin must re-approve

---

## 5. Stripe Connect Onboarding

### 5.1 Flow

1. Provider clicks "Connect Bank Account" in dashboard
2. Backend generates Stripe Connect Express account link via `stripe.accountLinks.create()`
3. Provider completes KYC on Stripe-hosted page
4. Stripe redirects to `/provider/stripe-return?status=success|refresh`
5. On `success`: call `stripe.accounts.retrieve(account_id)` to sync status fields
6. On `refresh`: regenerate the account link (links expire after 24 hours)

### 5.2 Fields Stored (on `profiles` table)

| Field | Type | Notes |
|---|---|---|
| stripe_account_id | varchar | `acct_XXXX` |
| stripe_status | varchar | `pending | active | restricted | disabled` |
| stripe_charges_enabled | boolean | From Stripe account object |
| stripe_payouts_enabled | boolean | From Stripe account object |
| stripe_onboarding_complete | boolean | true when charges + payouts both enabled |

### 5.3 Webhooks to Handle

| Event | Action |
|---|---|
| `account.updated` | Sync `stripe_charges_enabled`, `stripe_payouts_enabled`, `stripe_status` |
| `account.application.deauthorized` | Set `stripe_status = 'disabled'`, suspend new bookings |

### 5.4 Booking Gate

Providers cannot receive new bookings unless:
- `stripe_onboarding_complete = true`
- `stripe_status = 'active'`
- `verification_status = 'approved'`

---

## 6. Data Model

### 6.1 `profiles` Table — Provider-Specific Columns Added

```sql
-- Add to existing profiles table:
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_name         varchar(120);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_name          varchar(120);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone                 varchar(20);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ein                   varchar(20);   -- encrypted at rest
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_line1         varchar(200);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_city          varchar(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_state         varchar(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_zip           varchar(20);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_country       varchar(2) DEFAULT 'US';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latitude              decimal(10,7);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longitude             decimal(10,7);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio                   text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS years_in_business     int;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_availability boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_photo_url     text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS logo_url              text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS service_categories    varchar[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_status   varchar(30) DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified','email_verified','pending_review','approved','rejected','suspended'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified_at     timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted_at     timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS approved_at           timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rejected_at           timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_at          timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rejection_reason      text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_complete      boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_featured           boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS featured_until        timestamptz;
-- Trust score fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trust_score           decimal(5,2) DEFAULT 50.0;  -- cold-start baseline
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trust_score_override  boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trust_score_override_reason text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trust_score_updated_at timestamptz;
-- Computed metrics (updated nightly by trust score job)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avg_rating            decimal(3,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS review_count          int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_jobs_completed  int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS completion_rate       decimal(5,2);  -- 0.00–100.00
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cancellation_rate     decimal(5,2);  -- 0.00–100.00
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS on_time_percent       decimal(5,2);  -- 0.00–100.00
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avg_response_hours    decimal(6,2);  -- hours to first response
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at            timestamptz;   -- soft delete
```

---

### 6.2 `provider_service_areas` Table

```sql
CREATE TABLE IF NOT EXISTS provider_service_areas (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    area_type       varchar(20) NOT NULL CHECK (area_type IN ('zip_code','marina','city','radius')),
    label           varchar(200) NOT NULL,   -- human-readable name
    zip_code        varchar(10),
    marina_id       uuid REFERENCES marinas(id),  -- future table; nullable for now
    city            varchar(100),
    state           varchar(100),
    radius_km       decimal(6,2),            -- for 'radius' type around provider lat/lng
    latitude        decimal(10,7),
    longitude       decimal(10,7),
    is_active       boolean DEFAULT true,
    created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_psa_provider ON provider_service_areas(provider_id);
CREATE INDEX idx_psa_zip ON provider_service_areas(zip_code);
```

RLS: Provider can manage their own rows. Authenticated users can read active rows.

---

### 6.3 `provider_documents` Table

```sql
CREATE TABLE IF NOT EXISTS provider_documents (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    document_type   varchar(30) NOT NULL
        CHECK (document_type IN ('business_license','insurance_coi','abyc_certification','manufacturer_cert','other')),
    document_label  varchar(200),            -- required when type = 'other'
    file_url        text NOT NULL,
    file_name       varchar(255),
    file_size_bytes int,
    mime_type       varchar(100),
    expiration_date date,
    status          varchar(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','approved','rejected')),
    rejection_reason text,
    reviewed_at     timestamptz,
    reviewed_by     uuid REFERENCES profiles(id),
    is_active       boolean DEFAULT true,    -- false = superseded by resubmission
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_pdoc_provider ON provider_documents(provider_id);
CREATE INDEX idx_pdoc_status ON provider_documents(status);
CREATE INDEX idx_pdoc_expiry ON provider_documents(expiration_date) WHERE is_active = true;
```

RLS:
- Provider can INSERT their own documents; can SELECT their own rows
- Provider cannot UPDATE status (admin only)
- Moderators and super admins can SELECT all; UPDATE status, rejection_reason, reviewed_at, reviewed_by

---

### 6.4 `provider_portfolio` Table

```sql
CREATE TABLE IF NOT EXISTS provider_portfolio (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    media_url       text NOT NULL,           -- Supabase Storage signed URL
    thumbnail_url   text,
    caption         varchar(500),
    media_type      varchar(10) NOT NULL CHECK (media_type IN ('photo','video')),
    display_order   int DEFAULT 0,
    is_active       boolean DEFAULT true,
    created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_pp_provider ON provider_portfolio(provider_id);
```

Constraints: Max 20 active portfolio items per provider. Enforced at application layer. Storage path: `provider-portfolio/{provider_id}/{uuid}.{ext}` (bucket: `provider-media`, private with signed URLs for display).

RLS: Provider manages own rows. Any authenticated user can read active rows for approved providers.

---

### 6.5 `provider_services` Table (reconciled with Module 2)

Module 2 already created this table. No schema change needed. Canonical fields:

```
id, provider_id, name, category, description,
price_type (fixed|hourly|quote), base_price, duration_minutes, is_active,
created_at, updated_at
```

---

### 6.6 `reviews` Table (reconciled with Module 2)

Module 2 already created the `reviews` table. Additional columns added here:

```sql
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS provider_response    text;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS provider_responded_at timestamptz;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS flagged              boolean DEFAULT false;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS flagged_reason       text;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_visible           boolean DEFAULT true;  -- admin can hide
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS comm_rating          int CHECK (comm_rating BETWEEN 1 AND 5);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS quality_rating       int CHECK (quality_rating BETWEEN 1 AND 5);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS punctuality_rating   int CHECK (punctuality_rating BETWEEN 1 AND 5);
```

Unique constraint already in place: `UNIQUE(booking_id)` — one review per booking.

---

### 6.7 `trust_score_log` Table

```sql
CREATE TABLE IF NOT EXISTS trust_score_log (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    score           decimal(5,2) NOT NULL,
    source          varchar(20) NOT NULL CHECK (source IN ('nightly_job','admin_override','initial')),
    admin_id        uuid REFERENCES profiles(id),   -- set when source = 'admin_override'
    override_reason text,
    -- Component breakdown at time of computation
    comp_rating     decimal(5,2),
    comp_completion decimal(5,2),
    comp_cancellation decimal(5,2),
    comp_insurance  decimal(5,2),
    comp_license    decimal(5,2),
    comp_response   decimal(5,2),
    computed_at     timestamptz DEFAULT now()
);

CREATE INDEX idx_tsl_provider ON trust_score_log(provider_id, computed_at DESC);
```

---

### 6.8 `admin_audit_log` Table

```sql
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id        uuid NOT NULL REFERENCES profiles(id),
    action_type     varchar(60) NOT NULL,
    -- e.g. 'approve_document', 'reject_document', 'approve_provider',
    --      'suspend_provider', 'override_trust_score', 'hide_review',
    --      'issue_refund', 'flag_fraud'
    target_type     varchar(60) NOT NULL,   -- 'provider', 'document', 'review', 'booking'
    target_id       uuid NOT NULL,
    previous_value  jsonb,
    new_value       jsonb,
    reason          text,
    ip_address      inet,
    created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_aal_admin ON admin_audit_log(admin_id, created_at DESC);
CREATE INDEX idx_aal_target ON admin_audit_log(target_type, target_id);
```

RLS: Only `super_admin` and `moderator` can SELECT. No one can INSERT/UPDATE/DELETE via client (write via server function only).

---

### 6.9 `fraud_flags` Table

```sql
CREATE TABLE IF NOT EXISTS fraud_flags (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id     uuid REFERENCES profiles(id) ON DELETE CASCADE,
    flag_type       varchar(60) NOT NULL,
    -- 'duplicate_phone', 'duplicate_ein', 'high_cancellation_rate',
    -- 'high_dispute_rate', 'low_rating_threshold', 'suspicious_registration'
    detail          jsonb,
    status          varchar(20) DEFAULT 'open' CHECK (status IN ('open','reviewed','dismissed')),
    reviewed_by     uuid REFERENCES profiles(id),
    reviewed_at     timestamptz,
    created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_ff_provider ON fraud_flags(provider_id);
CREATE INDEX idx_ff_status ON fraud_flags(status);
```

---

## 7. Ratings & Reviews System

### 7.1 Review Eligibility

A review may only be submitted when:
- `booking.status = 'COMPLETED'`
- `booking.owner_id = auth.uid()` (requester is the boat owner on the booking)
- No existing review for this `booking_id` (`UNIQUE(booking_id)` constraint)

### 7.2 Review Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| booking_id | uuid | Yes | FK, unique — one review per booking |
| provider_id | uuid | Yes | Denormalised for query performance |
| reviewer_id | uuid | Yes | = auth.uid() (boat owner) |
| reviewer_name | varchar | Yes | Snapshot at time of review |
| rating | int 1–5 | Yes | Overall star rating |
| comm_rating | int 1–5 | No | Communication sub-rating |
| quality_rating | int 1–5 | No | Work quality sub-rating |
| punctuality_rating | int 1–5 | No | On-time sub-rating |
| comment | text | No | Max 2000 chars |
| is_visible | boolean | Yes | Default true; admin can hide |
| flagged | boolean | Yes | Default false; owner can flag |
| flagged_reason | text | No | Required when flagged = true |

### 7.3 Provider Response to Review

A provider may post one response to their own review:
- Max 1000 chars
- Stored in `reviews.provider_response`
- Timestamp stored in `reviews.provider_responded_at`
- Response is visible on the provider's public profile alongside the original review

### 7.4 Displayed Metrics (Provider Public Profile)

| Metric | Source | Display Format |
|---|---|---|
| Overall rating | `profiles.avg_rating` | e.g. "4.8 ★" |
| Total reviews | `profiles.review_count` | e.g. "182 reviews" |
| Jobs completed | `profiles.total_jobs_completed` | e.g. "963 jobs" |
| On-time rate | `profiles.on_time_percent` | e.g. "97% on time" |
| Cancellation rate | `profiles.cancellation_rate` | e.g. "2% cancellation rate" |
| Trust score | `profiles.trust_score` | e.g. "92 / 100" |

---

## 8. Trust Score Algorithm

### 8.1 Overview

Trust Score = sum of 6 weighted component scores. Range: 0–100.
Stored in `profiles.trust_score`. Recomputed nightly.
Admin overrides lock the score until manually unlocked (`trust_score_override = false`).
New providers receive a cold-start baseline of **50.0** until they have ≥5 reviews and ≥3 completed jobs — at which point full formula applies.

### 8.2 Component Definitions

#### Component 1: Rating Score (weight 40%)

```
If review_count < 5:
    rating_component = 50   # cold-start — not penalised, not rewarded
Else:
    # Bayesian-smoothed average
    # m = prior mean (3.0), C = prior weight (5 reviews)
    bayesian_avg = (review_count × avg_rating + 5 × 3.0) / (review_count + 5)
    rating_component = ((bayesian_avg - 1) / 4) × 100   # maps 1–5 → 0–100
```

#### Component 2: Completion Rate (weight 20%)

```
completion_rate = (jobs with status = COMPLETED) /
                  (jobs with status IN [CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED])
                  × 100

If denominator < 3:
    completion_component = 50   # cold-start
Else:
    completion_component = completion_rate   # already 0–100
```

#### Component 3: Cancellation Rate (weight 15%)

_Only provider-initiated cancellations counted._

```
provider_cancellations = bookings WHERE cancelled_by = 'provider' AND status = CANCELLED
total_accepted = bookings WHERE status IN [CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED]

cancellation_rate = provider_cancellations / max(total_accepted, 1) × 100

cancellation_component = max(0, 100 - (cancellation_rate × 3))
# Each 1% cancellation rate costs 3 points; floored at 0
```

#### Component 4: Insurance Validity (weight 10%)

```
active_insurance = SELECT COUNT(*) FROM provider_documents
    WHERE provider_id = X
    AND document_type = 'insurance_coi'
    AND status = 'approved'
    AND is_active = true
    AND expiration_date > CURRENT_DATE

If active_insurance > 0:
    days_remaining = expiration_date - CURRENT_DATE
    If days_remaining >= 30:  insurance_component = 100
    If 7 <= days_remaining < 30:  insurance_component = 60   # warning zone
    If 0 < days_remaining < 7:    insurance_component = 20   # critical zone
Else:
    insurance_component = 0
```

#### Component 5: Licence Validity (weight 10%)

_Same formula as Component 4, applied to `document_type = 'business_license'`_

#### Component 6: Response Time (weight 5%)

```
avg_response_hours = average hours between booking request created and provider first action
# (first action = quote sent, confirmed, or declined)

If avg_response_hours is NULL or total_jobs < 3:
    response_component = 50   # cold-start
Elif avg_response_hours <= 1:   response_component = 100
Elif avg_response_hours <= 4:   response_component = 80
Elif avg_response_hours <= 8:   response_component = 60
Elif avg_response_hours <= 24:  response_component = 40
Else:                           response_component = 10
```

### 8.3 Final Formula

```
trust_score = (rating_component × 0.40)
            + (completion_component × 0.20)
            + (cancellation_component × 0.15)
            + (insurance_component × 0.10)
            + (licence_component × 0.10)
            + (response_component × 0.05)

trust_score = ROUND(LEAST(GREATEST(trust_score, 0), 100), 2)
```

### 8.4 Nightly Job Implementation

Implemented as a Supabase Edge Function triggered by pg_cron:

```sql
SELECT cron.schedule(
    'nightly-trust-score',
    '0 3 * * *',   -- 03:00 UTC daily
    $$SELECT net.http_post(
        url := 'https://{project_ref}.supabase.co/functions/v1/compute-trust-scores',
        headers := '{"Authorization": "Bearer {service_role_key}"}'::jsonb
    )$$
);
```

The Edge Function:
1. Fetches all approved providers
2. For each: queries booking stats, review stats, document validity
3. Skips providers where `trust_score_override = true`
4. Updates `profiles.trust_score` and `profiles.trust_score_updated_at`
5. Inserts a row into `trust_score_log`

### 8.5 Admin Score Override

When a super_admin overrides the trust score:
1. Update `profiles.trust_score` to new value
2. Set `profiles.trust_score_override = true`
3. Set `profiles.trust_score_override_reason` to admin's reason
4. Insert `trust_score_log` row with `source = 'admin_override'`
5. Insert `admin_audit_log` row

Override persists until `trust_score_override` is manually set back to `false`. Nightly job skips providers where override = true.

---

## 9. Provider Search Ranking Logic

### 9.1 Visibility Gate

Provider only appears in search if:
- `verification_status = 'approved'`
- `stripe_onboarding_complete = true`
- `deleted_at IS NULL`

### 9.2 Ranking Signals (ordered priority)

1. **Featured** (`is_featured = true AND featured_until > now()`) — always surfaced first, sub-sorted by trust score
2. **Trust Score** — descending (0–100)
3. **Distance** — ascending (calculated as Haversine distance between requester's marina/location and provider's `latitude`/`longitude` or nearest service area point)
4. **Response Time** — ascending (`avg_response_hours`)
5. **Review Count** — descending (tie-break for identical trust scores)

### 9.3 Filtering

Supported search filters:

| Filter | Implementation |
|---|---|
| Service category | `ANY(service_categories)` |
| Available on date | Cross-reference `provider_availability` + `provider_blackouts` (Module 2) |
| Max distance (km) | Haversine against `latitude`/`longitude` OR service area coverage |
| Min rating | `avg_rating >=` threshold |
| Emergency only | `emergency_availability = true` |
| Verified only | `verification_status = 'approved'` (default) |

### 9.4 Featured Provider Mechanism

- Set by super_admin via admin dashboard toggle
- Stores `is_featured = true`, `featured_until = now() + interval`
- Future: paid featured listings charged via Stripe (v2.1)
- Max 5 featured providers shown per search results page (application-layer limit)

---

## 10. API Layer (Supabase Client + Edge Functions)

This is a Vite SPA. All data access uses Supabase JS client (`@supabase/supabase-js`) with RLS, not a custom REST server. Complex operations use Supabase Edge Functions.

### 10.1 Client-Side Supabase Calls

| Operation | Table / Method |
|---|---|
| Register provider | `supabase.auth.signUp()` + `profiles` INSERT |
| Complete profile | `profiles` UPDATE |
| Upload document | `supabase.storage.upload()` + `provider_documents` INSERT |
| Add service area | `provider_service_areas` INSERT |
| Add portfolio item | `supabase.storage.upload()` + `provider_portfolio` INSERT |
| Get provider profile | `profiles` SELECT + joins |
| Search providers | `profiles` SELECT with filters + PostGIS or computed distance |
| Submit review | `reviews` INSERT |
| Respond to review | `reviews` UPDATE (provider_response) |
| Flag review | `reviews` UPDATE (flagged, flagged_reason) |
| View own documents | `provider_documents` SELECT (own rows) |

### 10.2 Edge Functions

| Function | Trigger | Purpose |
|---|---|---|
| `compute-trust-scores` | pg_cron 03:00 UTC | Nightly trust score recomputation |
| `check-document-expiry` | pg_cron 02:00 UTC | Expiration monitoring + notifications |
| `stripe-connect-webhook` | Stripe webhook | Sync account.updated, deauthorized |
| `provider-register` | POST from client | Rate-limited registration + duplicate check |
| `admin-approve-provider` | Admin action | Approve/reject + audit log |
| `admin-override-trust` | Admin action | Trust score override + audit log |

### 10.3 Rate Limiting

Registration endpoint: 5 requests per IP per hour. Implemented in the `provider-register` Edge Function using Supabase KV or a `rate_limit_log` table.

---

## 11. Expiration Monitoring System

### 11.1 Nightly Check (02:00 UTC)

Edge Function `check-document-expiry` runs every night and:

**1. Pre-expiry warnings (email + in-app notification):**

| Days until expiry | Action |
|---|---|
| 30 days | Send "Your [document] expires in 30 days" warning |
| 7 days | Send "Urgent: [document] expires in 7 days" warning |

**2. On expiry (expiration_date < CURRENT_DATE):**

- Set document `is_active = false`
- Re-evaluate whether provider still has a valid active document of that type
- If no valid document remains:
  - Set `profiles.verification_status = 'suspended'`
  - Set `profiles.suspended_at = now()`
  - Send "Your account has been suspended" notification
  - Log to `admin_audit_log` with `action_type = 'auto_suspend_expiry'`

### 11.2 Effect on In-Flight Bookings

When a provider is auto-suspended due to expiry:
- Bookings with status `IN_PROGRESS`: allowed to complete (no interruption)
- Bookings with status `CONFIRMED` (not yet started): system sends notification to both parties; owner may cancel penalty-free
- Bookings with status `PENDING` or `QUOTED`: auto-cancelled; owner refunded

### 11.3 Grace Period

No grace period after expiration date. Providers should upload renewal documents before expiry. The 7-day warning is the final prompt.

### 11.4 Re-activation Flow

1. Provider uploads renewed document(s)
2. Document `status = 'pending'`
3. Admin reviews and approves
4. If all required docs now approved:
   - `profiles.verification_status = 'approved'`
   - `profiles.suspended_at = null`
   - Provider re-appears in search

---

## 12. Admin Dashboard Requirements

### 12.1 Pending Provider Queue

Columns: Provider name | Business | Submitted at | Documents | Stripe status | Action

Actions: Approve | Reject (with reason) | View Documents | View Profile

### 12.2 Document Review UI

For each pending document:
- Preview inline (image viewer / PDF iframe)
- Approve button
- Reject button → opens modal for rejection_reason input
- Expiration date prominently displayed (red if <30 days)

### 12.3 Provider Metrics View

Displayed per provider:
- Trust score with component breakdown
- Booking stats (total, completed, cancelled)
- Review stats (avg rating, count)
- Document status for each required type
- Fraud flags (count + link to detail)

### 12.4 Admin Actions and Audit Log

All admin actions automatically insert a row in `admin_audit_log`. Actions include:

| action_type | Role Required |
|---|---|
| `approve_document` | Moderator |
| `reject_document` | Moderator |
| `approve_provider` | Moderator |
| `reject_provider` | Moderator |
| `suspend_provider` | Moderator |
| `unsuspend_provider` | Moderator |
| `hide_review` | Moderator |
| `dismiss_fraud_flag` | Moderator |
| `override_trust_score` | Super Admin |
| `issue_refund` | Super Admin |
| `set_featured` | Super Admin |

### 12.5 Bulk Actions (Super Admin Only)

- Bulk approve documents of same type across multiple providers
- Bulk suspend for fraud flags
- Export provider list to CSV

---

## 13. Fraud & Risk Controls

### 13.1 Duplicate Detection (at Registration)

| Signal | Match Method | Action |
|---|---|---|
| Email | Exact match | Hard block |
| Phone (normalised E.164) | Exact match | Soft flag → `fraud_flags` |
| EIN | Exact match | Soft flag → `fraud_flags` |

Normalisation: strip spaces, dashes, parentheses; prepend `+1` if US number without country code.

### 13.2 Automated Flagging Thresholds

| Condition | Threshold | Flag Type |
|---|---|---|
| High cancellation rate | provider_cancellation_rate > 25% | `high_cancellation_rate` |
| High dispute rate | disputes > 3 in any 60-day rolling window | `high_dispute_rate` |
| Low rating threshold | avg_rating < 3.0 AND review_count >= 5 | `low_rating_threshold` |
| Suspicious registration | Multiple accounts from same IP in <1hr | `suspicious_registration` |

All flags are inserted into `fraud_flags` with `status = 'open'`. Admins are notified in the dashboard queue.

### 13.3 Auto-Review (Low Rating Trigger)

When `avg_rating < 3.0` AND `review_count >= 5`:
1. Insert `fraud_flags` row with type `low_rating_threshold`
2. Send in-app notification to all moderators: _"Provider [Name] has dropped below 3.0 average rating"_
3. Admin must manually review and either dismiss or suspend

Auto-suspension does NOT occur for low ratings alone — a human must decide.

### 13.4 Provider Appeal Process

When a provider is suspended (for any reason):
1. Provider sees suspension reason in their dashboard
2. Provider can submit an appeal via a form (stored in `provider_appeals` table — simplified: just a text field + timestamp + status)
3. Appeal is visible in admin queue
4. Super Admin reviews and may unsuspend

---

## 14. Notification System

### 14.1 Notification Events

| Event | Recipient | Channel |
|---|---|---|
| Document uploaded | Admin (all moderators) | In-app |
| Document approved | Provider | Email + In-app |
| Document rejected | Provider | Email + In-app (with reason) |
| Account approved | Provider | Email + In-app |
| Account rejected | Provider | Email + In-app (with reason) |
| Account suspended | Provider | Email + In-app |
| Insurance expiry warning (30d) | Provider | Email + In-app |
| Insurance expiry warning (7d) | Provider | Email + In-app |
| Licence expiry warning (30d) | Provider | Email + In-app |
| Licence expiry warning (7d) | Provider | Email + In-app |
| New review received | Provider | In-app |
| Review flagged | Admin | In-app |
| Fraud flag raised | Admin | In-app |
| Low rating auto-flag | Admin | In-app |
| Appeal submitted | Admin | In-app |
| Trust score override | Provider | In-app |

### 14.2 Notification Storage

```sql
CREATE TABLE IF NOT EXISTS notifications (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type            varchar(60) NOT NULL,
    title           varchar(255) NOT NULL,
    body            text,
    link            text,          -- in-app route to navigate to
    is_read         boolean DEFAULT false,
    created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_notif_user ON notifications(user_id, created_at DESC);
```

RLS: Users can SELECT and UPDATE (mark read) their own notifications only.

Email notifications: sent via Supabase Auth's email provider or a transactional email Edge Function (Resend / SendGrid — env var configurable).

---

## 15. Error Codes

| Code | Description |
|---|---|
| `PROV_001` | Email already in use |
| `PROV_002` | Phone matches existing account |
| `PROV_003` | EIN matches existing account |
| `PROV_004` | Email not verified — action blocked |
| `PROV_005` | Document file too large (>10 MB) |
| `PROV_006` | Document file type not accepted |
| `PROV_007` | Document expiration date must be in the future |
| `PROV_008` | Provider not approved — booking blocked |
| `PROV_009` | Stripe onboarding incomplete — booking blocked |
| `PROV_010` | Provider suspended — action blocked |
| `PROV_011` | Review already submitted for this booking |
| `PROV_012` | Review only allowed on completed bookings |
| `PROV_013` | Trust score override requires super_admin role |
| `PROV_014` | Portfolio limit reached (max 20 items) |
| `PROV_015` | Service area limit reached (max 10 areas) |

---

## 16. Open Questions

1. **Geocoding provider:** Which geocoding API to use for address → lat/lng conversion? (Google Maps, Mapbox, Nominatim?) Affects distance calculation in search ranking.
2. **PostGIS:** Is PostGIS available on the Supabase free tier? If not, distance filtering must be done at application layer using Haversine formula in JavaScript.
3. **Stripe country restrictions:** Which countries are supported for Stripe Connect Express providers? (US-only for MVP or international from day 1?)
4. **Optional certifications and trust score:** Should ABYC / manufacturer certifications boost the trust score beyond the defined 6 components? If yes, add a 7th "certifications" component.
5. **Video portfolio items:** Are video uploads in scope for MVP? Videos require transcoding; photos do not.
6. **Featured listing pricing:** What is the pricing model for featured listings when monetised? (flat fee, subscription, auction?)
7. **SMS notifications:** Is SMS (Twilio/etc.) in scope for MVP or email + in-app only?
8. **Provider appeal SLA:** What is the target response time for admin review of a suspension appeal?
