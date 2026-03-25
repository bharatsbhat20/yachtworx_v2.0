# Yachtworx — Technical Requirements Document
## Module 2: Booking, Scheduling & Payments System
### Version 2.0 | Revised & Gap-Filled

---

## Table of Contents
1. [Overview](#1-overview)
2. [User Roles](#2-user-roles)
3. [Booking Flow](#3-booking-flow)
4. [Booking Status Lifecycle](#4-booking-status-lifecycle)
5. [Scheduling Architecture](#5-scheduling-architecture)
6. [Data Model](#6-data-model)
7. [Payment Architecture](#7-payment-architecture)
8. [API Endpoints](#8-api-endpoints)
9. [Cancellation & Refund Logic](#9-cancellation--refund-logic)
10. [Dispute System](#10-dispute-system)
11. [Notifications](#11-notifications)
12. [Security & Fraud Prevention](#12-security--fraud-prevention)
13. [Non-Functional Requirements](#13-non-functional-requirements)
14. [Revenue Architecture](#14-revenue-architecture)
15. [Error Codes](#15-error-codes)
16. [Open Questions](#16-open-questions)

---

## 1. Overview

Module 2 is the **revenue engine** of Yachtworx. It enables:

- Boat owners to discover, request, and pay for marine services
- Service providers to manage availability, accept bookings, and receive payouts
- The platform to collect a configurable fee on every completed transaction
- Real-time scheduling with race-condition-safe slot reservation
- Escrow-style payment flow via Stripe Connect
- Full booking lifecycle tracking from draft through payout
- Cancellation, refund, and dispute handling

### 1.1 Scope

**In scope (v1):**
- Booking creation, confirmation, and lifecycle management
- Provider availability and slot validation
- Stripe Connect Express onboarding and split payments
- Escrow hold → release on completion
- Owner and provider cancellation with configurable refund rules
- Basic dispute system (admin-mediated)
- Email notifications on all key lifecycle events
- Review/rating capture post-completion

**Out of scope (deferred):**
- SMS and push notifications (Phase 2)
- Automated dispute resolution with evidence upload (Phase 2)
- Recurring/subscription bookings (Phase 2)
- Surge/dynamic pricing (Phase 3)
- Tax collection and remittance (Phase 3 — see §6.4)
- Insurance add-ons and extended warranty (Phase 3)
- Multi-currency support (Phase 3)

### 1.2 Dependencies
- **Module 1**: `profiles`, `boats` tables and auth system must be live
- **Stripe**: Stripe Connect Express account required for the platform
- **Resend / SendGrid**: Email delivery for notifications

---

## 2. User Roles

### 2.1 Boat Owner
- Browse the service marketplace
- Select a provider, boat, service, date/time, and location
- Hold a slot during payment (10-minute reservation window)
- Pay at booking (funds held in escrow)
- Track booking status end-to-end
- Confirm job completion to trigger provider payout
- Raise a dispute within 72 hours of completion
- Leave a rating and review post-completion
- Cancel with refund per cancellation policy

### 2.2 Service Provider
- Complete Stripe Connect Express onboarding (KYC) before receiving bookings
- Define availability: working days, hours, blackout dates, buffer time, advance limits
- Define service catalog: services offered, price type, base price, duration
- Accept or decline pending bookings (within configurable response window)
- Mark jobs as In Progress and Completed
- View payout schedule and history
- Cancel bookings (triggers 100% owner refund + provider flag)

### 2.3 Admin
- View all bookings, transactions, and disputes
- Override any booking status
- Issue full or partial refunds
- Resolve disputes (release payout or refund owner)
- Manage platform fee configuration
- View full audit log of all state transitions

### 2.4 Unauthenticated User
- Browse the marketplace (provider listings, service categories, pricing)
- Cannot initiate a booking — redirected to sign-up

---

## 3. Booking Flow

### 3.1 Owner Booking Flow (Step-by-Step)

```
1.  Owner selects: Service Type
2.  Platform queries available providers for that service type
3.  Owner browses provider listings (rating, price, distance, availability)
4.  Owner selects a provider → views their service catalog and availability
5.  Owner selects: Boat, Specific Service, Location (marina or address)
6.  Owner selects: Date → Platform renders available time slots
7.  Owner selects: Time slot
8.  System places a 10-minute SLOT HOLD (prevents race conditions)
9.  Owner reviews: service details, duration, price breakdown, cancellation policy
10. Owner enters payment details (Stripe hosted UI or Elements)
11. Stripe PaymentIntent created with capture_method=manual (authorize only)
12. Booking record created with status = PENDING
13. Slot hold converted to confirmed booking
14. Provider notified: new booking request (accept/decline within response window)
15. Provider accepts → status = CONFIRMED, funds held in escrow
16. Provider declines → status = CANCELLED, authorization voided, no charge
```

### 3.2 Instant Book vs. Request-to-Book

Providers configure one of two modes on their profile:

| Mode | Behaviour |
|------|-----------|
| `request_to_book` | Booking stays PENDING until provider explicitly accepts (default) |
| `instant_book` | Booking auto-confirms on successful payment authorization; provider just shows up |

### 3.3 Pricing Models

Each service in the provider's catalog has a `price_type`:

| Type | Description | Booking Behaviour |
|------|-------------|-------------------|
| `fixed` | Flat rate for the job | `price_amount` is locked at booking |
| `hourly` | Rate × estimated hours | `quoted_amount` stored; `final_amount` set on completion |
| `quote` | Provider sends a quote | Booking stays in QUOTED state until owner accepts quote |

For `hourly` and `quote` jobs, the owner authorizes a **maximum authorization amount** (e.g. 150% of estimate). Final charge is adjusted at capture time.

### 3.4 Minimum Notice & Advance Booking Limits

- `min_notice_hours`: Provider-set minimum lead time (e.g. 24h). Slots within this window are hidden.
- `max_advance_booking_days`: Provider-set maximum future horizon (e.g. 90 days). Slots beyond are hidden.
- Platform-wide defaults configurable via environment variables.

---

## 4. Booking Status Lifecycle

### 4.1 Status Values

| Status | Description |
|--------|-------------|
| `DRAFT` | Slot held, payment not yet authorized (10-min window) |
| `PENDING` | Payment authorized, awaiting provider acceptance |
| `QUOTED` | Quote-based job: provider has sent a quote, awaiting owner acceptance |
| `CONFIRMED` | Provider accepted, funds in escrow |
| `IN_PROGRESS` | Provider has started the job |
| `COMPLETED` | Provider marked job done; awaiting owner confirmation or auto-release timer |
| `PAYOUT_RELEASED` | Owner confirmed (or auto-release triggered); funds sent to provider |
| `CANCELLED` | Booking cancelled by owner or provider |
| `DISPUTED` | Owner raised a dispute; payout frozen |
| `REFUNDED` | Full or partial refund issued |
| `RESCHEDULED` | Booking moved to new date/time (preserves payment and booking ID) |

### 4.2 State Transition Matrix

| From → To | Owner | Provider | Admin | System (auto) |
|-----------|-------|----------|-------|---------------|
| DRAFT → PENDING | ✅ (on payment auth) | | | |
| DRAFT → CANCELLED | ✅ (hold expires) | | | ✅ (10-min timeout) |
| PENDING → CONFIRMED | | ✅ | ✅ | ✅ (instant_book) |
| PENDING → CANCELLED | ✅ | ✅ | ✅ | ✅ (response window expires) |
| QUOTED → PENDING | ✅ (accepts quote) | | | |
| QUOTED → CANCELLED | ✅ | ✅ | ✅ | |
| CONFIRMED → IN_PROGRESS | | ✅ | ✅ | |
| CONFIRMED → RESCHEDULED | ✅ | ✅ | ✅ | |
| CONFIRMED → CANCELLED | ✅ | ✅ | ✅ | |
| IN_PROGRESS → COMPLETED | | ✅ | ✅ | |
| COMPLETED → PAYOUT_RELEASED | ✅ (confirms) | | ✅ | ✅ (auto after 48h) |
| COMPLETED → DISPUTED | ✅ (within 72h) | | | |
| DISPUTED → PAYOUT_RELEASED | | | ✅ | |
| DISPUTED → REFUNDED | | | ✅ | |
| ANY → REFUNDED | | | ✅ | |

All transitions are enforced server-side. Invalid transitions return `HTTP 422` with error code `INVALID_STATUS_TRANSITION`.

### 4.3 State Timeouts (System-Enforced)

| State | Timeout | Action on Expiry |
|-------|---------|-----------------|
| DRAFT | 10 minutes | → CANCELLED (slot released) |
| PENDING | `provider_response_hours` (default 24h) | → CANCELLED, authorization voided |
| COMPLETED | 48 hours after `completed_at` | → PAYOUT_RELEASED (auto-release) |
| DISPUTED | 7 business days | Admin escalation alert |

---

## 5. Scheduling Architecture

### 5.1 Timezone Handling

**Rule: All timestamps stored as UTC in the database.**

- Providers set their availability in their **local timezone** (stored in `provider_profiles.timezone`)
- The API converts all slot queries to/from the provider's timezone
- The UI displays times in the **viewer's local timezone** with the provider's timezone shown in parentheses
- `scheduled_start` and `scheduled_end` in the bookings table are always UTC

### 5.2 Provider Availability Table

```sql
provider_availability (
  id                    UUID PRIMARY KEY,
  provider_id           UUID NOT NULL REFERENCES profiles(id),
  day_of_week           SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun
  start_time            TIME NOT NULL,   -- provider local time, stored as-is
  end_time              TIME NOT NULL,
  buffer_minutes        INTEGER NOT NULL DEFAULT 30,
  max_jobs_per_day      INTEGER NOT NULL DEFAULT 3,
  min_notice_hours      INTEGER NOT NULL DEFAULT 24,
  max_advance_days      INTEGER NOT NULL DEFAULT 90,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
)
```

### 5.3 Provider Blackout Dates Table

```sql
provider_blackouts (
  id            UUID PRIMARY KEY,
  provider_id   UUID NOT NULL REFERENCES profiles(id),
  blackout_date DATE NOT NULL,
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
)
```

Unique constraint: `(provider_id, blackout_date)`.

### 5.4 Provider Service Catalog Table

```sql
provider_services (
  id                   UUID PRIMARY KEY,
  provider_id          UUID NOT NULL REFERENCES profiles(id),
  name                 TEXT NOT NULL,
  category             TEXT NOT NULL,
  description          TEXT,
  price_type           TEXT NOT NULL CHECK (price_type IN ('fixed','hourly','quote')),
  base_price           NUMERIC(10,2),       -- null for quote-based
  duration_minutes     INTEGER NOT NULL,    -- estimated job duration; used for slot validation
  is_active            BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
)
```

### 5.5 Slot Reservation Table

```sql
slot_holds (
  id              UUID PRIMARY KEY,
  provider_id     UUID NOT NULL REFERENCES profiles(id),
  owner_id        UUID NOT NULL REFERENCES profiles(id),
  service_id      UUID NOT NULL REFERENCES provider_services(id),
  proposed_start  TIMESTAMPTZ NOT NULL,
  proposed_end    TIMESTAMPTZ NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,  -- now() + 10 minutes
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
)
```

Slot holds are cleaned up by a Supabase scheduled function or cron job every minute.

### 5.6 Slot Validation Logic

When a booking request is submitted, the following checks run **inside a single database transaction with row-level locking** (`SELECT FOR UPDATE`) to prevent race conditions:

```
1. Provider is active and has completed Stripe KYC
2. Requested date is not in provider_blackouts
3. Requested day_of_week has an active availability row
4. proposed_start >= now() + min_notice_hours
5. proposed_end <= availability.end_time (converted to UTC)
6. Count of confirmed/in_progress bookings on that date < max_jobs_per_day
7. No existing CONFIRMED/IN_PROGRESS booking for this provider overlaps:
      (proposed_start, proposed_end) accounting for buffer_minutes on each side
8. No unexpired slot_hold from another owner overlaps the same window
```

If all checks pass → slot hold is created → payment flow begins.
If any check fails → return appropriate error code (see §15).

### 5.7 Available Slots Query

`GET /api/v1/providers/{id}/slots?date=YYYY-MM-DD&service_id={id}`

Returns array of available UTC start times for the given date, after applying:
- Availability windows
- Existing bookings + buffer
- Active slot holds
- Blackout dates
- min_notice_hours and max_advance_days

Slots are returned in 30-minute increments within available windows.

---

## 6. Data Model

### 6.1 Bookings Table

```sql
bookings (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference               TEXT UNIQUE NOT NULL,        -- e.g. YW-2024-008421
  owner_id                UUID NOT NULL REFERENCES profiles(id),
  provider_id             UUID NOT NULL REFERENCES profiles(id),
  boat_id                 UUID NOT NULL REFERENCES boats(id),
  service_id              UUID NOT NULL REFERENCES provider_services(id),
  service_type            TEXT NOT NULL,               -- snapshot at booking time
  service_name            TEXT NOT NULL,               -- snapshot at booking time
  location                TEXT NOT NULL,
  location_type           TEXT NOT NULL CHECK (location_type IN ('marina','address','onwater')),
  scheduled_start         TIMESTAMPTZ NOT NULL,        -- UTC
  scheduled_end           TIMESTAMPTZ NOT NULL,        -- UTC
  duration_minutes        INTEGER NOT NULL,
  price_type              TEXT NOT NULL,               -- snapshot
  quoted_amount           NUMERIC(10,2),               -- for hourly/quote jobs
  final_amount            NUMERIC(10,2),               -- set on completion
  price_amount            NUMERIC(10,2) NOT NULL,      -- authorized amount
  currency                CHAR(3) NOT NULL DEFAULT 'USD',
  platform_fee_percent    NUMERIC(5,4) NOT NULL,       -- snapshot e.g. 0.1500
  platform_fee_amount     NUMERIC(10,2) NOT NULL,
  provider_payout_amount  NUMERIC(10,2) NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'DRAFT',
  booking_mode            TEXT NOT NULL DEFAULT 'request_to_book',
  notes                   TEXT,                        -- owner special instructions
  payment_intent_id       TEXT,                        -- Stripe PaymentIntent ID
  cancellation_reason     TEXT,
  cancelled_by            TEXT CHECK (cancelled_by IN ('owner','provider','admin','system')),
  cancelled_at            TIMESTAMPTZ,
  confirmed_at            TIMESTAMPTZ,
  started_at              TIMESTAMPTZ,
  completed_at            TIMESTAMPTZ,
  payout_released_at      TIMESTAMPTZ,
  rescheduled_from        UUID REFERENCES bookings(id), -- original booking if rescheduled
  deleted_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
)
```

**Booking Reference Generation:**
`YW-{YYYY}-{6-digit-zero-padded-sequence}` — generated via Postgres sequence at insert time.

**Indices:**
```sql
CREATE INDEX bookings_owner_id_idx ON bookings(owner_id);
CREATE INDEX bookings_provider_id_idx ON bookings(provider_id);
CREATE INDEX bookings_status_idx ON bookings(status);
CREATE INDEX bookings_scheduled_start_idx ON bookings(scheduled_start);
CREATE INDEX bookings_payment_intent_id_idx ON bookings(payment_intent_id);
```

### 6.2 Payments Table

```sql
payments (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id            UUID NOT NULL REFERENCES bookings(id),
  owner_id              UUID NOT NULL REFERENCES profiles(id),
  provider_id           UUID NOT NULL REFERENCES profiles(id),
  amount                NUMERIC(10,2) NOT NULL,
  currency              CHAR(3) NOT NULL DEFAULT 'USD',
  platform_fee_percent  NUMERIC(5,4) NOT NULL,
  platform_fee_amount   NUMERIC(10,2) NOT NULL,
  provider_payout       NUMERIC(10,2) NOT NULL,
  payment_status        TEXT NOT NULL DEFAULT 'pending',
    -- pending | authorized | captured | refunded | partially_refunded | failed | voided
  stripe_payment_intent_id   TEXT UNIQUE,
  stripe_charge_id           TEXT,
  stripe_transfer_id         TEXT,         -- Stripe Connect transfer to provider
  stripe_refund_id           TEXT,
  refund_amount              NUMERIC(10,2),
  refunded_at                TIMESTAMPTZ,
  payout_released_at         TIMESTAMPTZ,
  idempotency_key            TEXT UNIQUE NOT NULL,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
)
```

### 6.3 Booking Status Audit Log

Every status transition is appended here — immutable, never updated.

```sql
booking_status_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id    UUID NOT NULL REFERENCES bookings(id),
  from_status   TEXT,
  to_status     TEXT NOT NULL,
  changed_by    UUID REFERENCES profiles(id),  -- null = system
  changed_by_role TEXT,                        -- 'owner'|'provider'|'admin'|'system'
  reason        TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
)
```

### 6.4 Processed Webhooks Table (Idempotency)

```sql
processed_webhooks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type      TEXT NOT NULL,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
)
```

Before processing any Stripe webhook, check this table. If `stripe_event_id` already exists, return `200 OK` immediately without reprocessing.

### 6.5 Reviews Table

```sql
reviews (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id    UUID NOT NULL UNIQUE REFERENCES bookings(id),
  reviewer_id   UUID NOT NULL REFERENCES profiles(id),
  provider_id   UUID NOT NULL REFERENCES profiles(id),
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
)
```

Reviews can only be submitted once per booking, after status = `PAYOUT_RELEASED`.

### 6.6 Tax Handling (Deferred)

Tax collection is **out of scope for v1**. Document this explicitly for legal awareness:
- The platform does not collect or remit sales tax in v1
- Providers are responsible for their own tax obligations
- A `tax_amount` column is reserved (nullable) in the bookings table for future use
- Phase 3 will integrate with TaxJar or Avalara for automated tax calculation

---

## 7. Payment Architecture

### 7.1 Stripe Connect: Express Accounts

**Use Stripe Connect Express** (not Standard or Custom). Rationale:
- Stripe-hosted onboarding UI (no custom KYC forms to build)
- Stripe handles identity verification, bank account linking, payouts
- Platform maintains control over charges; providers receive transfers
- Automatic payout scheduling supported

**Provider Stripe fields (added to `profiles` table):**
```sql
stripe_account_id       TEXT UNIQUE,   -- acct_xxxx
stripe_account_status   TEXT,          -- 'pending'|'active'|'restricted'|'disabled'
stripe_payouts_enabled  BOOLEAN DEFAULT false,
stripe_charges_enabled  BOOLEAN DEFAULT false,
stripe_onboarding_url   TEXT,          -- refreshed on demand
```

A provider cannot receive new bookings unless `stripe_payouts_enabled = true` AND `stripe_charges_enabled = true`.

### 7.2 Payment Flow (Escrow Model)

```
BOOKING CREATED
      │
      ▼
Stripe PaymentIntent created
  capture_method = 'manual'        ← authorize only, no charge yet
  on_behalf_of = provider acct_id
  transfer_data.destination = provider acct_id
  transfer_data.amount = provider_payout_amount
      │
      ▼
Owner confirms payment → PaymentIntent confirmed
  Funds authorized on owner's card
  status → PENDING
      │
      ▼
Provider accepts booking
  status → CONFIRMED
  Funds remain authorized (held in escrow)
      │
      ▼
Provider marks job COMPLETED
  status → COMPLETED
  Auto-release timer starts (48h)
      │
      ├── Owner confirms completion within 48h
      │         │
      │         ▼
      │   PaymentIntent.capture() called
      │   platform_fee collected automatically
      │   Stripe transfers provider_payout to provider
      │   status → PAYOUT_RELEASED
      │
      └── 48h elapsed, no dispute
                │
                ▼
          Same capture flow (system-triggered)
          status → PAYOUT_RELEASED
```

### 7.3 Authorization Expiry Problem & Solution

Stripe authorizations expire after **7 days**. For bookings scheduled weeks or months in advance:

**Solution: Re-authorization flow**
- At `scheduled_start - 7 days`: system attempts to re-capture authorization
- If card still valid: new authorization replaces old one
- If card fails: owner notified to update payment method
- Owner has 48 hours to update; if not → booking cancelled, provider notified

### 7.4 Platform Fee Configuration

```env
PLATFORM_FEE_PERCENT=0.15   # 15% default
PLATFORM_FEE_MIN_USD=10     # minimum fee in cents * 100
```

Fee is calculated at booking creation and **snapshotted** onto both the `bookings` and `payments` records. Future fee changes do not affect existing bookings.

Formula:
```
platform_fee_amount  = round(price_amount × platform_fee_percent, 2)
platform_fee_amount  = max(platform_fee_amount, PLATFORM_FEE_MIN_USD)
provider_payout      = price_amount - platform_fee_amount
```

### 7.5 Stripe Webhook Events to Handle

| Event | Action |
|-------|--------|
| `payment_intent.created` | Log |
| `payment_intent.succeeded` | Mark payment `authorized` |
| `payment_intent.payment_failed` | Cancel booking, notify owner |
| `payment_intent.amount_capturable_updated` | Log |
| `charge.captured` | Update `stripe_charge_id`, mark `captured` |
| `transfer.created` | Store `stripe_transfer_id` |
| `charge.refunded` | Update refund fields, trigger status changes |
| `account.updated` | Sync provider Stripe status fields |

All webhook handlers must:
1. Verify `Stripe-Signature` header using `STRIPE_WEBHOOK_SECRET`
2. Check `processed_webhooks` table for idempotency
3. Insert into `processed_webhooks` before processing
4. Return `200 OK` within 10 seconds (offload heavy work to background queue)

---

## 8. API Endpoints

All endpoints prefixed with `/api/v1/`. All require `Authorization: Bearer {jwt}` except where noted.

### 8.1 Bookings

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/bookings` | Owner | Create booking (triggers slot hold + PaymentIntent) |
| `GET` | `/bookings/{id}` | Owner/Provider/Admin | Get booking detail |
| `GET` | `/users/{id}/bookings` | Self/Admin | List bookings for user |
| `PUT` | `/bookings/{id}/confirm` | Provider | Accept booking (PENDING → CONFIRMED) |
| `PUT` | `/bookings/{id}/decline` | Provider | Decline booking (PENDING → CANCELLED) |
| `PUT` | `/bookings/{id}/start` | Provider | Mark in progress (CONFIRMED → IN_PROGRESS) |
| `PUT` | `/bookings/{id}/complete` | Provider | Mark completed (IN_PROGRESS → COMPLETED) |
| `PUT` | `/bookings/{id}/release` | Owner/System | Confirm completion, release payout |
| `PUT` | `/bookings/{id}/cancel` | Owner/Provider/Admin | Cancel booking |
| `PUT` | `/bookings/{id}/reschedule` | Owner/Provider | Reschedule (new date/time) |
| `PUT` | `/bookings/{id}/dispute` | Owner | Raise dispute (within 72h of completed_at) |
| `DELETE` | `/bookings/{id}` | Admin | Soft delete |

### 8.2 Availability & Slots

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/providers/availability` | Provider | Create availability rule |
| `GET` | `/providers/{id}/availability` | Any | Get availability rules |
| `PUT` | `/providers/availability/{id}` | Provider | Update rule |
| `DELETE` | `/providers/availability/{id}` | Provider | Delete rule |
| `POST` | `/providers/blackouts` | Provider | Add blackout date |
| `DELETE` | `/providers/blackouts/{id}` | Provider | Remove blackout date |
| `GET` | `/providers/{id}/slots` | Any | Get available slots for date + service |

### 8.3 Provider Services Catalog

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/providers/services` | Provider | Add service to catalog |
| `GET` | `/providers/{id}/services` | Any | List provider's active services |
| `PUT` | `/providers/services/{id}` | Provider | Update service |
| `DELETE` | `/providers/services/{id}` | Provider | Deactivate service |

### 8.4 Payments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/payments/create-intent` | Owner | Create Stripe PaymentIntent |
| `POST` | `/payments/webhook` | Stripe (signature) | Stripe webhook receiver |
| `GET` | `/payments/{bookingId}` | Owner/Admin | Get payment record |
| `POST` | `/payments/{bookingId}/refund` | Admin | Issue full or partial refund |

### 8.5 Stripe Connect Onboarding

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/providers/stripe/connect` | Provider | Create Connect account, return onboarding URL |
| `GET` | `/providers/stripe/status` | Provider | Get Stripe account status |
| `POST` | `/providers/stripe/refresh` | Provider | Refresh onboarding URL if expired |

### 8.6 Reviews

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/bookings/{id}/review` | Owner | Submit review (after PAYOUT_RELEASED) |
| `GET` | `/providers/{id}/reviews` | Any | List provider reviews |

### 8.7 Request/Response Schemas

**POST /api/v1/bookings — Request:**
```json
{
  "provider_id": "uuid",
  "boat_id": "uuid",
  "service_id": "uuid",
  "location": "Marina del Rey, Slip 42",
  "location_type": "marina",
  "proposed_start": "2024-08-15T09:00:00Z",
  "notes": "Engine access hatch is stiff — bring extra tools"
}
```

**POST /api/v1/bookings — Response (201):**
```json
{
  "booking": {
    "id": "uuid",
    "reference": "YW-2024-008421",
    "status": "DRAFT",
    "scheduled_start": "2024-08-15T09:00:00Z",
    "scheduled_end": "2024-08-15T11:00:00Z",
    "price_amount": 1000.00,
    "platform_fee_amount": 150.00,
    "provider_payout_amount": 850.00,
    "currency": "USD",
    "slot_hold_expires_at": "2024-07-20T14:42:00Z"
  },
  "payment_intent": {
    "client_secret": "pi_xxx_secret_yyy"
  }
}
```

---

## 9. Cancellation & Refund Logic

### 9.1 Cancellation Policy Ownership

Cancellation policy is **platform-wide** in v1, configurable via environment variables. Per-provider policies are a Phase 2 feature.

```env
CANCEL_FULL_REFUND_HOURS=48      # hours before start = full refund
CANCEL_PARTIAL_REFUND_HOURS=24   # hours before start = partial refund
CANCEL_PARTIAL_REFUND_PCT=0.50   # 50% refund in partial window
```

### 9.2 Owner Cancellation

| Time of Cancellation | Refund | Platform Fee |
|----------------------|--------|-------------|
| `> CANCEL_FULL_REFUND_HOURS` before start | 100% | Returned |
| `> CANCEL_PARTIAL_REFUND_HOURS` and `≤ CANCEL_FULL_REFUND_HOURS` | 50% (configurable) | Kept by platform |
| `≤ CANCEL_PARTIAL_REFUND_HOURS` before start | 0% | Kept by platform |
| No-show (provider marks as no-show) | 0% | Kept by platform |

If the booking is still in `PENDING` or `DRAFT` status (provider hasn't accepted yet), a full refund is always issued regardless of timing.

### 9.3 Provider Cancellation

- Owner receives **100% refund** always
- Provider's cancellation count is incremented on their profile
- At 3 provider cancellations in 90 days: automated review flag to admin
- Provider does **not** receive any fee compensation

### 9.4 Rescheduling

Rescheduling by either party:
- Does **not** trigger cancellation logic
- Slot validation re-runs for the new date/time
- PaymentIntent authorization is preserved (or re-authorized if near expiry)
- `rescheduled_from` on new booking row links history
- Original booking row status set to `RESCHEDULED`

### 9.5 Refund Processing

All refunds are processed via `stripe.refunds.create()`:
- Full refund: entire `amount_received` returned
- Partial refund: specific amount calculated per §9.2
- Stripe typically returns funds in 5–10 business days
- Refund amount and timestamp stored in `payments` table

---

## 10. Dispute System

### 10.1 Dispute Window

Disputes must be raised within **72 hours** of `completed_at`. After this window, status auto-transitions to `PAYOUT_RELEASED`. The 72-hour window is configurable via `DISPUTE_WINDOW_HOURS` env var.

### 10.2 Dispute Flow

```
1. Owner taps "Dispute" within 72h of completion
2. Owner required to enter dispute reason (text, required)
3. Booking status → DISPUTED
4. Payout frozen (PaymentIntent capture blocked)
5. Both parties notified via email
6. Admin receives alert in dashboard
7. Admin reviews case
8. Admin chooses resolution:
   a. Release payout → PAYOUT_RELEASED (provider wins)
   b. Full refund → REFUNDED (owner wins)
   c. Partial refund → REFUNDED (split decision)
```

### 10.3 Admin Dispute SLA

- Admin must action any dispute within **5 business days**
- Unresolved disputes after 7 calendar days trigger automated escalation email to admin team
- Dispute reason and admin resolution notes stored in `booking_status_log.metadata`

### 10.4 Dispute Evidence (Phase 2)

Future version will allow:
- Owner to upload photos/documents as evidence
- Provider to upload counter-evidence
- Automated scoring to suggest resolution

---

## 11. Notifications

### 11.1 Notification Triggers & Timing

| Event | Recipient(s) | Channel | Timing |
|-------|-------------|---------|--------|
| Booking requested | Provider | Email | Immediate |
| Booking confirmed | Owner | Email | Immediate |
| Booking declined | Owner | Email | Immediate |
| Payment received | Owner | Email | Immediate (receipt) |
| Booking reminder | Owner + Provider | Email | 24h before `scheduled_start` |
| Booking reminder | Owner + Provider | Email | 2h before `scheduled_start` |
| Job marked in progress | Owner | Email | Immediate |
| Job completed | Owner | Email | Immediate (confirm or auto-release in 48h) |
| Auto-release warning | Owner | Email | 24h before auto-release |
| Payout released | Provider | Email | Immediate |
| Cancellation (by owner) | Provider | Email | Immediate |
| Cancellation (by provider) | Owner | Email | Immediate |
| Dispute opened | Provider + Admin | Email | Immediate |
| Dispute resolved | Owner + Provider | Email | Immediate |
| Re-auth required | Owner | Email | 7 days before `scheduled_start` |
| Review prompt | Owner | Email | 1h after `PAYOUT_RELEASED` |

### 11.2 Email Receipt Contents

Post-payment email (to owner) must include:
- Booking reference (YW-YYYY-XXXXXX)
- Service name, provider name, boat name
- Date, time (with timezone)
- Location
- Price breakdown: service amount, platform fee, total charged
- Cancellation policy summary
- Link to view booking in app

### 11.3 Notification Preferences

Users can opt out of non-critical notifications (reminders, review prompts). The following are **mandatory** and cannot be opted out:
- Payment receipt
- Cancellation confirmation
- Dispute notifications

### 11.4 Future Channels (Phase 2+)
- SMS via Twilio (opt-in)
- In-app push notifications
- In-app notification inbox

---

## 12. Security & Fraud Prevention

### 12.1 PCI Compliance
- Stripe handles all card data — YachtWorx never touches raw card numbers
- Use Stripe Elements or Payment Links for card input
- No card data stored in Yachtworx database

### 12.2 Webhook Security
```
1. Every webhook request must include Stripe-Signature header
2. Verify using: stripe.webhooks.constructEvent(payload, sig, STRIPE_WEBHOOK_SECRET)
3. Reject any request that fails signature verification with HTTP 400
4. Use separate webhook secrets for test vs. live environments
```

### 12.3 Provider Verification Gate
- Any booking creation request validates: `provider.stripe_payouts_enabled = true`
- If not verified: return error `PROVIDER_NOT_VERIFIED` (HTTP 422)
- Provider onboarding URL shown in marketplace listing with "Complete Setup" CTA

### 12.4 Double-Booking Prevention
- Slot validation runs inside a Postgres transaction with `SELECT FOR UPDATE` on provider's booking rows
- `slot_holds` table acts as a distributed lock during payment flow
- Unique index on `(provider_id, scheduled_start)` for confirmed bookings

### 12.5 Booking Ownership Validation
- All booking read/write endpoints validate: `booking.owner_id = auth.uid()` OR `booking.provider_id = auth.uid()` OR `user.role = 'admin'`
- RLS policies enforce this at the database layer

### 12.6 Idempotency
- All payment creation requests require a client-generated `idempotency_key`
- Key format: `booking-{booking_id}-{timestamp}`
- Stored in `payments.idempotency_key` with UNIQUE constraint
- Duplicate key → return existing payment record without re-processing

### 12.7 Rate Limiting
- `POST /bookings`: 10 requests/minute per user
- `POST /payments/create-intent`: 5 requests/minute per user
- `POST /payments/webhook`: no rate limit (Stripe IPs whitelisted)

---

## 13. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Concurrent bookings supported | 10,000 |
| Booking transaction latency (p99) | < 800ms |
| Slot availability query latency (p99) | < 200ms |
| Webhook processing latency | < 10s (return 200 fast; process async) |
| Webhook retry reliability | Stripe retries up to 72h; idempotency table guarantees exactly-once |
| Payment data retention | 7 years (financial records compliance) |
| Booking data retention | 3 years active, 7 years archived |
| Database indices | See §6.1 — all foreign keys and status/date columns indexed |
| Audit log | All status transitions logged in `booking_status_log` (immutable) |

---

## 14. Revenue Architecture

The following revenue levers are built into the data model and can be activated without schema changes:

| Lever | How to Activate | Status |
|-------|----------------|--------|
| Platform fee (%) | `PLATFORM_FEE_PERCENT` env var | ✅ v1 |
| Minimum platform fee | `PLATFORM_FEE_MIN_USD` env var | ✅ v1 |
| Cancellation fees | `CANCEL_PARTIAL_REFUND_PCT` env var | ✅ v1 |
| Per-provider fee override | Add `custom_fee_percent` to profiles | Phase 2 |
| Surge pricing | Add `surge_multiplier` to availability windows | Phase 3 |
| Featured provider placement | `is_featured` flag on profiles | Phase 2 |
| Subscription tiers | Separate subscriptions table | Phase 2 |
| Insurance add-ons | `add_ons` JSONB on bookings | Phase 3 |
| Extended warranty | Same `add_ons` JSONB | Phase 3 |

**Architecture principle**: store all financial amounts as `NUMERIC(10,2)` in the database. Never use floating point for money. All calculations in backend code use Decimal libraries, never JavaScript `Number` for monetary arithmetic.

---

## 15. Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `SLOT_UNAVAILABLE` | 422 | Requested time slot is taken or on blackout |
| `SLOT_HOLD_EXPIRED` | 422 | 10-minute hold expired before payment completed |
| `PROVIDER_NOT_VERIFIED` | 422 | Provider has not completed Stripe KYC |
| `PROVIDER_UNAVAILABLE` | 422 | Provider has no availability on requested date |
| `MIN_NOTICE_VIOLATED` | 422 | Booking is within provider's minimum notice window |
| `MAX_ADVANCE_EXCEEDED` | 422 | Booking is beyond provider's maximum advance window |
| `INVALID_STATUS_TRANSITION` | 422 | Attempted status change not allowed from current state |
| `DISPUTE_WINDOW_EXPIRED` | 422 | 72-hour dispute window has passed |
| `REVIEW_ALREADY_SUBMITTED` | 422 | Booking already has a review |
| `BOOKING_NOT_FOUND` | 404 | Booking ID does not exist or user lacks access |
| `PAYMENT_AUTHORIZATION_FAILED` | 402 | Stripe authorization declined |
| `PAYMENT_CAPTURE_FAILED` | 500 | Stripe capture failed (retry scheduled) |
| `REAUTH_REQUIRED` | 402 | Authorization expired; new payment method needed |
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | Authenticated but not the owner/provider of this booking |

---

## 16. Open Questions

| # | Question | Owner | Decision Needed By |
|---|----------|-------|-------------------|
| 1 | Per-provider cancellation policies for v1 or enforce platform-wide? | Product | Before implementation |
| 2 | Should instant_book be the default or opt-in per provider? | Product | Before implementation |
| 3 | What is the provider response window for PENDING bookings? (24h default) | Product | Before implementation |
| 4 | Should owners be able to tip providers post-completion? | Product | Phase 2 planning |
| 5 | Do we require providers to set a service catalog before going live, or can they quote ad-hoc? | Product | Before implementation |
| 6 | What is the target launch market timezone? (affects default timezone handling edge cases) | Business | Before implementation |
| 7 | Do we withhold any payout for disputed jobs or just freeze pending release? | Legal | Before implementation |
| 8 | What is the platform's legal entity for receiving the platform fee? (Stripe account setup) | Legal/Finance | Before implementation |
