# Yachtworx – Technical Requirements Document
## Module 5: Marina Partnerships & Enterprise Dashboard
**Version:** 1.1
**Date:** 2026-04-03
**Status:** Ready for Implementation

---

## Table of Contents
1. [Overview](#1-overview)
2. [User Roles](#2-user-roles)
3. [Marina Onboarding Flow](#3-marina-onboarding-flow)
4. [Customer Journeys](#4-customer-journeys)
   - 4.1 [Marina Owner Journey](#41-marina-owner-journey)
   - 4.2 [Marina Operator Journey](#42-marina-operator-journey)
   - 4.3 [Yacht Owner Journey (Enhanced)](#43-yacht-owner-journey-enhanced)
   - 4.4 [Service Provider Journey (Enhanced)](#44-service-provider-journey-enhanced)
5. [Marina Discovery & Map](#5-marina-discovery--map)
6. [Berth Management System](#6-berth-management-system)
7. [Provider Partnership Program](#7-provider-partnership-program)
8. [Smart Matching Integration](#8-smart-matching-integration)
9. [Enterprise Dashboard](#9-enterprise-dashboard)
10. [Data Model](#10-data-model)
11. [Supabase Schema](#11-supabase-schema)
12. [Row Level Security](#12-row-level-security)
13. [UI/UX Specifications](#13-uiux-specifications)
14. [API & Integration Points](#14-api--integration-points)
15. [Notifications](#15-notifications)
16. [Non-Functional Requirements](#16-non-functional-requirements)
17. [Implementation Phases](#17-implementation-phases)
18. [Open Questions](#18-open-questions)

---

## 1. Overview

Module 5 is the **marina and enterprise layer** of Yachtworx. It introduces a third primary user persona — the **Marina** — and unlocks a new commercial dimension: infrastructure-level partnerships between marinas, boat owners, and service providers.

This module enables:

- Marina owners to create and manage a full marina profile including berths, amenities, and services
- Marina operators (staff) to manage day-to-day operations: berth assignments, vessel tracking, service requests
- Yacht owners to discover marinas, book berths, and access marina-curated service providers
- Service providers to apply for preferred-provider status at specific marinas and receive marina-sourced leads
- An enterprise-grade dashboard for multi-marina analytics, occupancy tracking, revenue reporting, and service demand intelligence
- Deep integration with the Module 4 Smart Matching Engine: marina context enriches match scores (on-site proximity → 100 score) and providers with marina partnerships surface higher in results

### 1.1 Scope

**In scope (v1):**
- Marina profile creation and onboarding
- Marina staff accounts with role-based access (owner, manager, harbormaster, dock attendant)
- Berth/slip inventory management (dimensions, type, power, water, pricing)
- Transient and seasonal berth booking flow
- Marina amenities and services catalog
- Marina-to-provider partnership program with tiers (preferred, exclusive)
- Yacht owner marina discovery (search, map, filter)
- Module 4 match-score boost for partnered providers when vessel is at that marina
- Enterprise Dashboard: occupancy, revenue, service demand, fleet analytics
- Multi-marina support (one marina owner account → N marinas)
- Marina-branded notifications (berth confirmation, departure reminders, service alerts)

**Out of scope (v1 — deferred):**
- Real-time AIS vessel tracking integration (Phase 2)
- IoT sensor integration (shore power metering, water usage) (Phase 2)
- Fuel dock transaction processing (Phase 2)
- Marina waitlist management (Phase 2)
- Customs/border clearance documentation (Phase 3)
- Yard/dry-storage management (Phase 3)
- Online pump-out scheduling (Phase 2)

### 1.2 Dependencies

| Module | Required For |
|---|---|
| Module 1 | `profiles`, `boats`, `auth` |
| Module 2 | Berth booking payment flow (Stripe Connect) |
| Module 3 | Provider verification status for partnership eligibility |
| Module 4 | Smart Matching Engine — match score enrichment with marina context |

---

## 2. User Roles

### 2.1 Marina Owner

The primary administrator for one or more marinas.

- Creates and owns marina entities on the platform
- Manages billing and Stripe Connect payouts for berth revenue
- Invites marina staff (operators, harbormasters, dock attendants)
- Approves or rejects provider partnership applications
- Sets partnership tier and commission structures
- Accesses the full Enterprise Dashboard across all their marinas
- Views all analytics: occupancy, revenue, service demand, fleet composition

### 2.2 Marina Operator / Harbormaster

Day-to-day management staff at a single marina.

- Assigns vessels to berths
- Manages berth availability calendar (blackouts, reservations, arrivals)
- Processes check-in and check-out for transient guests
- Views the live berth map and occupancy status
- Manages service requests raised by vessels at their marina
- Communicates with boat owners via in-app messaging
- Cannot access billing or partnership management

### 2.3 Yacht Owner (Module 5 additions)

Existing role from Modules 1–4, extended with:

- Discovers marinas via map or search
- Books transient or seasonal berths at a marina
- Views marina-curated preferred providers with marina-context match scores
- Requests services through the marina (the marina dispatches to preferred providers)
- Receives marina-specific alerts (departure reminders, on-site service promotions)

### 2.4 Service Provider (Module 5 additions)

Existing role from Modules 2–4, extended with:

- Applies to join a marina's preferred-provider network
- Receives marina-sourced job leads (boats checked in at partner marina with active needs)
- Gets a verified marina-partner badge on their public profile
- Match score boosted to proximity = 100 for vessels at their partner marina
- Accesses marina-specific job board (vessels currently on site)

### 2.5 Role Permission Matrix

| Action | Marina Owner | Marina Operator | Boat Owner | Provider |
|---|:---:|:---:|:---:|:---:|
| Create marina profile | ✅ | ❌ | ❌ | ❌ |
| Edit marina profile | ✅ | ✅ | ❌ | ❌ |
| Manage berth inventory | ✅ | ✅ | ❌ | ❌ |
| Assign vessel to berth | ✅ | ✅ | ❌ | ❌ |
| View berth map | ✅ | ✅ | ❌ | ❌ |
| Process check-in/out | ✅ | ✅ | ❌ | ❌ |
| View enterprise dashboard | ✅ | ❌ | ❌ | ❌ |
| Approve provider partnerships | ✅ | ❌ | ❌ | ❌ |
| Apply for partnership | ❌ | ❌ | ❌ | ✅ |
| Book a berth | ❌ | ❌ | ✅ | ❌ |
| View preferred providers | ❌ | ❌ | ✅ | ❌ |
| View marina job board | ❌ | ❌ | ❌ | ✅ |
| Manage marina billing | ✅ | ❌ | ❌ | ❌ |

---

## 3. Marina Onboarding Flow

### 3.1 Registration (Step 1 — Account)

A marina owner registers a new account or signs in as an existing owner and selects "Add Marina."

| Field | Type | Required | Notes |
|---|---|:---:|---|
| marina_name | varchar(150) | Yes | Display name |
| contact_name | varchar(120) | Yes | Primary contact |
| email | varchar(255) | Yes | Unique per account |
| phone | varchar(20) | Yes | E.164 normalised |
| password | varchar | Yes | Min 10 chars, 1 upper, 1 number, 1 special |
| terms_accepted | boolean | Yes | Must be true |

**On submit:**
1. Create/link `auth.users` entry via Supabase Auth
2. Insert/update `profiles` row with `role = 'marina_owner'`
3. Send verification email
4. Redirect to Marina Setup Wizard

### 3.2 Marina Setup Wizard (Steps 2–6)

#### Step 2 — Location & Identity

| Field | Type | Required | Notes |
|---|---|:---:|---|
| marina_name | varchar(150) | Yes | |
| tagline | varchar(255) | No | Short marketing line |
| address_line1 | varchar(200) | Yes | |
| address_city | varchar(100) | Yes | |
| address_state | varchar(100) | Yes | |
| address_zip | varchar(20) | Yes | |
| address_country | char(2) | Yes | ISO-3166 |
| latitude | decimal(10,7) | Yes | Auto-populated via geocoding |
| longitude | decimal(10,7) | Yes | Auto-populated via geocoding |
| vhf_channel | varchar(10) | No | e.g. "16/68" |
| website_url | text | No | |

#### Step 3 — Berth Inventory

Marina adds their slip/berth catalog. Each berth has:

| Field | Type | Required | Notes |
|---|---|:---:|---|
| berth_label | varchar(30) | Yes | e.g. "A-12", "Pier 3 Slip 7" |
| berth_type | enum | Yes | `floating` `fixed` `mooring` `alongside` `dry_stack` |
| length_ft | numeric(6,1) | Yes | Maximum vessel length |
| beam_ft | numeric(5,1) | Yes | Maximum beam |
| draft_ft | numeric(5,1) | No | Maximum draft |
| power_amps | smallint[] | No | Available amperage, e.g. [30, 50] |
| has_water | boolean | Yes | |
| has_wifi | boolean | No | |
| daily_rate_usd | numeric(8,2) | No | Transient pricing |
| weekly_rate_usd | numeric(8,2) | No | |
| monthly_rate_usd | numeric(8,2) | No | |
| annual_rate_usd | numeric(8,2) | No | |
| is_active | boolean | Yes | Hides from booking if false |

Minimum: 1 berth required to publish the marina.

#### Step 4 — Amenities & Services

Multi-select from a curated list. Stored as `text[]` in `marinas.amenities`:

**Onsite Amenities:**
`fuel_dock` `pump_out` `laundry` `showers` `restrooms` `pool` `restaurant` `ship_store` `ice` `parking` `security_24h` `gated_access` `cctv` `pump_out_boat` `haul_out` `travel_lift` `chandlery` `brokerage`

**Connectivity:**
`wifi_free` `wifi_paid` `cable_tv`

**Services Offered by Marina:**
`concierge` `crew_placement` `provisioning` `trash_pickup` `courtesy_car` `weather_briefing`

#### Step 5 — Photos & Media

- Up to 20 photos per marina
- Minimum 1 required to publish
- Stored in Supabase Storage bucket `marina-media/{marina_id}/`
- First photo becomes the cover image
- Accepted: JPEG, PNG, WebP ≤ 10 MB each

#### Step 6 — Stripe Connect Onboarding

Required to accept berth booking payments:

1. Marina owner clicks "Connect Stripe Account"
2. Redirect to Stripe Connect Express onboarding
3. On return, Stripe webhook updates `marinas.stripe_account_id` and `stripe_payouts_enabled`
4. Platform fee: **8%** of berth booking value (configurable in `platform_config`)

**Publication gate:** Marina cannot publish (be visible to yacht owners) until:
- ✅ Email verified
- ✅ At least 1 active berth
- ✅ At least 1 photo
- ✅ Stripe Connect complete

### 3.3 Marina Verification Status

| Status | Description |
|---|---|
| `draft` | Setup wizard incomplete; not visible to owners |
| `pending_review` | Submitted for admin review (future fraud prevention) |
| `published` | Visible to yacht owners; can accept bookings |
| `suspended` | Temporarily hidden; berth bookings paused |

For v1, admin review is automatic (no queue). `draft → published` on completion of Step 6.

---

## 4. Customer Journeys

### 4.1 Marina Owner Journey

```
Sign Up / Sign In
    │
    ▼
Marina Setup Wizard ──────────────────────────────────────────────────────┐
  Step 1: Account details                                                 │
  Step 2: Location & identity                                             │
  Step 3: Add berth inventory                                             │
  Step 4: Select amenities & services                                     │
  Step 5: Upload photos                                                   │
  Step 6: Connect Stripe                                                  │
    │                                                                     │
    ▼                                                                     │
Marina Published                                                          │
    │                                                                     │
    ├─→ Berth Management ────── Manage availability calendar             │
    │                     └──── Process check-in / check-out             │
    │                     └──── View live berth map                      │
    │                                                                     │
    ├─→ Provider Partnerships ── Review applications                     │
    │                       └── Set tiers (preferred / exclusive)        │
    │                       └── Manage commission rates                  │
    │                                                                     │
    ├─→ Staff Management ─────── Invite operators / harbormasters        │
    │                       └── Set role permissions per staff member    │
    │                                                                     │
    ├─→ Enterprise Dashboard ─── Occupancy rate (live + historical)      │
    │                       └── Revenue (berths + service referral)      │
    │                       └── Service demand heatmap                   │
    │                       └── Fleet composition at marina              │
    │                       └── Provider performance leaderboard         │
    │                       └── Multi-marina comparison                  │
    │                                                                     │
    └─→ Billing & Payouts ───── View completed booking revenue          │
                            └── Stripe dashboard link                    │
                            └── Platform fee breakdown                   │
                                                                         │
← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

### 4.2 Marina Operator Journey

```
Sign In (invited via Marina Owner)
    │
    ▼
Operator Dashboard
    │
    ├─→ Live Berth Map ─────────── Visual grid of all berths
    │                         └─── Status: vacant / occupied / reserved / maintenance
    │                         └─── Click berth → vessel card (owner, boat name, dates)
    │
    ├─→ Today's Arrivals ──────── List of expected check-ins
    │         (sorted by ETA)  └─── Mark as arrived → assign berth
    │                          └─── Collect payment (if not pre-paid)
    │
    ├─→ Today's Departures ────── List of vessels checking out today
    │                         └─── Mark as departed → berth becomes vacant
    │
    ├─→ Service Requests ──────── Open requests from vessels at marina
    │                         └─── Dispatch to preferred provider
    │                         └─── Track service status
    │
    └─→ Guest Communications ──── Message boat owners in-berth
                              └─── Send departure reminders
                              └─── Send service promotions
```

### 4.3 Yacht Owner Journey (Enhanced)

**Discovery Phase:**
```
Owner Dashboard / Marketplace
    │
    ├─→ Marina Tab (new in Module 5)
    │       ├── Map view: marinas plotted by location
    │       ├── Filter: amenities, berth size, price range, availability
    │       ├── Marina card: name, photo, rating, price/night, distance
    │       └── Click → Marina Profile Page
    │
    └─→ Marina Profile Page
            ├── Gallery (photos)
            ├── Overview: location, VHF, contact, amenities chips
            ├── Berth availability calendar
            ├── Pricing table (nightly / weekly / monthly / annual)
            ├── On-site preferred providers section (Module 4 match-enriched)
            └── Book a Berth → Booking Flow
```

**Booking Flow:**
```
Select Berth + Dates
    │
    ├── Availability check (no double-booking)
    ├── Price summary (nightly rate × nights + platform fee)
    ├── Boat selector (which boat from their fleet)
    ├── Special requests (text field)
    │
    ▼
Payment (Stripe — same escrow flow as Module 2)
    │
    ▼
Confirmation
    ├── Berth booking reference
    ├── Marina contact details + VHF channel
    ├── Email confirmation sent
    └── Appears in Owner Dashboard → "My Berths" tab
```

**While At Marina:**
```
My Berths (active booking)
    ├── Marina info card
    ├── Smart Matches (Module 4) — enriched with marina context
    │   └── Preferred providers at this marina shown first
    │   └── Proximity score = 100 for all on-site providers
    ├── Request a Service button → dispatched via marina
    └── Review marina on departure
```

### 4.4 Service Provider Journey (Enhanced)

**Partnership Application:**
```
Provider Dashboard → Partnerships Tab
    │
    ├── Browse marinas in my service area
    │       └── Filter: nearby, matching my categories
    │
    ├── Marina profile (provider view)
    │       ├── Current preferred providers (competitors)
    │       ├── Open partnership slots
    │       └── Apply button
    │
    └── Application form
            ├── Select marina
            ├── Choose service categories to offer at marina
            ├── Set commission rate (platform default: 12%)
            ├── Upload any marina-specific certifications
            └── Submit → Marina Owner notified
```

**After Approval:**
```
Provider Dashboard → Marina Jobs Tab
    ├── Live job board: vessels currently at marina with open needs
    │       └── Sorted by urgency (Module 4 urgency levels)
    │       └── Match score shown per vessel need
    │
    ├── Marina Partner Badge on public profile
    │       └── Shown on marina's preferred provider section
    │       └── Boosts ranking in marketplace search
    │
    └── Referral tracking
            └── Jobs sourced from marina vs direct
            └── Marina-sourced commission breakdown
```

---

## 5. Marina Discovery & Map

### 5.1 Marina Search Page (`/marinas`)

**Layout:** Full-width map left (60%) + results list right (40%), collapsible to list-only on mobile.

**Filter panel:**
| Filter | Type | Options |
|---|---|---|
| Location | Text / geolocation | Radius from point (10, 25, 50, 100 mi) |
| Dates | Date range picker | Check-in / check-out |
| Vessel size | Sliders | Min length (ft), min beam (ft) |
| Amenities | Multi-select chips | fuel_dock, pump_out, restaurant, haul_out, etc. |
| Price range | Range slider | $/night |
| Rating | Min stars | ≥3, ≥4, ≥4.5 |
| Partnership | Toggle | "Preferred provider network" |

**Marina card (list view):**
- Cover photo
- Marina name + tagline
- Star rating + review count
- Key amenities chips (top 4)
- Starting price per night
- Distance from search origin
- "Available / Fully booked" pill

**Map pins:**
- Ocean-coloured circle with berth count label
- Cluster when zoomed out
- Click → marina card flyout
- "View Marina" CTA → Marina Profile

### 5.2 Marina Profile Page (`/marinas/:id`)

Tabs: **Overview** | **Berths & Pricing** | **Amenities** | **Preferred Providers** | **Reviews**

**Overview tab:**
- Hero photo carousel
- Name, tagline, star rating
- Location with map embed
- VHF channel, phone, website
- Quick stats: number of berths, max LOA, fuel available (yes/no), haul-out (yes/no)
- Amenity icon grid

**Berths & Pricing tab:**
- Availability calendar (blocked = occupied/reserved)
- Pricing table per berth type (transient / seasonal / annual)
- "Book a Berth" CTA (opens booking flow)

**Preferred Providers tab:**
- Mirrors Module 4 `MatchedProviderPanel` but scoped to marina-partnered providers
- Shows match scores enriched with marina context (proximity = 100 for on-site)
- "Book Now" → BookingWizard pre-populated with provider + boat

**Reviews tab:**
- Average star rating
- Review cards (marina guest reviews, separate from provider reviews)
- Owner can respond (same pattern as Module 3 provider responses)

---

## 6. Berth Management System

### 6.1 Berth Types

| Type | Description |
|---|---|
| `floating` | Floating dock, finger pier |
| `fixed` | Fixed dock or piling |
| `mooring` | Mooring ball |
| `alongside` | Quay wall / alongside berth |
| `dry_stack` | Rack storage (power boats) |

### 6.2 Berth Booking Lifecycle

```
DRAFT → CONFIRMED → CHECKED_IN → CHECKED_OUT → REVIEWED
              │
              ├── CANCELLED_BY_OWNER
              └── CANCELLED_BY_MARINA
```

| Status | Trigger |
|---|---|
| `DRAFT` | Payment initiated, slot held (10 min) |
| `CONFIRMED` | Payment captured |
| `CHECKED_IN` | Operator marks vessel as arrived |
| `CHECKED_OUT` | Operator marks vessel as departed |
| `REVIEWED` | Owner leaves marina review |
| `CANCELLED_BY_OWNER` | Owner cancels pre-arrival |
| `CANCELLED_BY_MARINA` | Marina cancels (emergency closure, etc.) |

### 6.3 Availability & Double-Booking Prevention

- Berth availability stored in `marina_berth_bookings` with `berth_id`, `check_in_date`, `check_out_date`
- Before confirming a booking, database function `check_berth_availability(berth_id, check_in, check_out)` verifies no overlapping `CONFIRMED` or `CHECKED_IN` bookings exist
- Function uses `tsrange` overlap check (PostgreSQL range type)
- Slot hold implemented as `marina_berth_holds` (10-min expiry, same pattern as Module 2 `slot_holds`)

### 6.4 Cancellation & Refund Policy

| Cancellation Window | Refund |
|---|---|
| > 14 days before check-in | 100% |
| 7–14 days before check-in | 50% |
| < 7 days before check-in | 0% |
| Marina-initiated cancellation | 100% always |

Platform fee is non-refundable except on marina-initiated cancellations.

### 6.5 Pricing Model

- Daily/nightly rate set per berth (or per berth type)
- Weekly and monthly rates can be set for automatic discount application
- Seasonal rate multipliers (configurable: high season, shoulder, off-season) — Phase 2
- Platform fee: **8%** of berth booking value (charged to boat owner on top of berth rate)
- Marina payout: berth rate – platform fee, released on check-out

---

## 7. Provider Partnership Program

### 7.1 Partnership Tiers

| Tier | Badge | Match Score Boost | Commission to Marina | Exclusivity |
|---|---|---|---|---|
| `standard` | ☑ On-site Provider | Proximity → 100 | 0% | Non-exclusive |
| `preferred` | ⭐ Preferred Partner | Proximity → 100 + +5 overall | 8% of job value | Non-exclusive |
| `exclusive` | 🏆 Exclusive Partner | Proximity → 100 + +10 overall | 12% of job value | Exclusive per service category |

**Commission flow (preferred/exclusive):**
- Yacht owner pays provider full job rate via Module 2 booking
- Platform takes its standard 10% fee
- Marina receives commission % of the net provider payout
- Implemented via Stripe Connect transfer splits (see §14.2)

**Exclusive tier conflict check:**
When a provider applies for `exclusive` tier at a marina, the system must verify no active `exclusive` partnership already exists for the same marina AND overlapping `service_categories`. Conflict check logic:

```sql
-- Conflict check: block if another provider already holds exclusive
-- for an overlapping category at this marina
select count(*) from marina_provider_partnerships
where marina_id = :marina_id
  and tier = 'exclusive'
  and status = 'active'
  and provider_id != :applicant_provider_id
  and service_categories && :applicant_categories;  -- PostgreSQL array overlap operator
```

If count > 0, the application is auto-rejected with reason `"exclusive_conflict"` and the marina owner is notified of the conflicting provider. Multiple non-overlapping exclusive providers are permitted at the same marina (e.g., one exclusive engine mechanic AND one exclusive detailer).

### 7.2 Partnership Application State Machine

```
PENDING → APPROVED → ACTIVE
        ↓          ↓
     REJECTED   SUSPENDED
                   ↓
                TERMINATED
```

| Status | Description |
|---|---|
| `pending` | Application submitted, awaiting marina owner review |
| `approved` | Marina approved, pending provider acceptance of terms |
| `active` | Partnership live; provider appears in marina's preferred list |
| `rejected` | Marina declined the application |
| `suspended` | Temporarily paused (e.g., marina complaint) |
| `terminated` | Permanently ended |

### 7.3 Provider Eligibility for Partnership

To apply, a provider must:
- Have `verification_status = 'approved'` (Module 3)
- Have `trust_score ≥ 60`
- Have at least 5 completed jobs
- Have a Stripe Connect account active (`stripe_charges_enabled = true`)
- Offer at least one service category that the marina needs

### 7.4 Marina Job Board

When a yacht is checked in at a marina (`marina_berth_bookings.status = 'CHECKED_IN'`), that vessel's open needs (from `job_opportunities` in Module 4) are surfaced to partnered providers in a **Marina Job Board** — a real-time feed of on-site vessels needing service.

- Sorted by urgency (critical first)
- Match score shown (proximity = 100 for all; overall score varies by category, trust, availability)
- "Express Interest" button → creates `provider_job_interests` record + notifies marina operator
- Marina operator can then directly schedule the job (bypassing open marketplace)

---

## 8. Smart Matching Integration

Module 5 enriches the Module 4 matching algorithm with marina context. No changes to the scoring formula weights are required; marina context adjusts **input values** to the existing factors.

### 8.1 Marina Context Enrichment Rules

| Condition | Factor Affected | Enriched Value |
|---|---|---|
| Provider has active partnership at vessel's marina | Proximity | Forced to 100 (overrides distance calc) |
| Provider is `exclusive` tier at vessel's marina | Overall Score | +10 bonus added post-scoring |
| Provider is `preferred` tier at vessel's marina | Overall Score | +5 bonus added post-scoring |
| Vessel has active berth booking at a marina | `context.marinaId` | Set in compute call; triggers enrichment |

### 8.2 Match Compute Call Changes (Owner Side)

```typescript
// computeMatchesForOwner now accepts optional marina context
computeMatchesForOwner(boats, { activeMarinaId?: string })

// If activeMarinaId is set:
//   1. Fetch partnered provider IDs for that marina
//   2. For those providers, override proximityScore = 100 before scoring
//   3. Apply tier bonus post-score (preferred +5, exclusive +10)
//   4. Re-sort results
```

### 8.3 Provider Match Score Display Changes

When displaying match scores to a boat owner who has an active berth booking:
- Marina-partnered providers show a "🏆 On-site Partner" or "⭐ Preferred Provider" chip instead of the distance chip
- Match summary line updated: "On-site at [Marina Name] · 4.9★ · 247 jobs"

### 8.4 Provider Side: Marina Job Feed

In `computeMatchesForProvider`, if the provider has active marina partnerships:
1. Fetch checked-in vessels at partner marinas from `marina_berth_bookings`
2. Cross-reference with `job_opportunities` for those boat IDs
3. Add these opportunities to the feed with a `source: 'marina'` flag
4. Sort marina-sourced leads above general marketplace leads in the Recommended Jobs feed

---

## 9. Enterprise Dashboard

The Enterprise Dashboard is accessible only to `marina_owner` role accounts. It provides a single-pane view across all their marinas.

### 9.1 Dashboard Layout

**Top navigation:** Marina selector (dropdown or tabs for multi-marina accounts)
**Date range selector:** Last 7d / 30d / 90d / YTD / Custom

---

### 9.2 Occupancy Panel

| Metric | Calculation | Display |
|---|---|---|
| Current occupancy | `COUNT(CHECKED_IN bookings) / total active berths` | Large %, donut chart |
| Occupancy trend | Day-by-day % over selected period | Line chart |
| Avg occupancy (period) | Mean daily occupancy % | Stat card |
| Revenue per available berth (RevPAB) | Total revenue / available berth-nights | Stat card |
| Occupancy by berth type | Breakdown by `floating`, `fixed`, etc. | Bar chart |
| Forecast (next 14 days) | Confirmed bookings as % of capacity | Forecast bar |

---

### 9.3 Revenue Panel

| Metric | Calculation | Display |
|---|---|---|
| Gross berth revenue | Sum of all confirmed booking values (period) | Large $ figure |
| Platform fees paid | 8% × gross revenue | Stat card |
| Net payout | Gross – platform fees | Stat card |
| Provider commission income | Sum of commission from preferred/exclusive providers | Stat card |
| Revenue by source | Berths vs provider commissions | Pie chart |
| Revenue trend | Day/week totals over period | Bar chart |
| Top-grossing berths | Berths sorted by revenue generated | Table (top 10) |

---

### 9.4 Service Demand Panel

Powered by Module 4 `job_opportunities` data for vessels at the marina.

| Metric | Calculation | Display |
|---|---|---|
| Open service needs | Count of `job_opportunities` with `status = 'open'` for checked-in vessels | Stat card |
| Needs by category | Group by `service_category` | Horizontal bar chart |
| Needs by urgency | Group by `urgency_level` | Donut (critical / high / medium / low) |
| Most-requested services | Top 5 service categories (period) | Ranked list |
| Provider dispatch rate | % of needs matched to a preferred provider | Stat card |
| Avg time to match | Time from need detected → provider interest expressed | Stat card |

---

### 9.5 Fleet Analytics Panel

| Metric | Calculation | Display |
|---|---|---|
| Total unique vessels (period) | Distinct `boat_id` values in berth bookings | Stat card |
| Vessel type breakdown | Group by `boat_type` | Donut chart |
| Average vessel LOA | Mean `boats.length_overall` for visiting vessels | Stat card |
| Average stay length | Mean (check_out_date – check_in_date) in nights | Stat card |
| Repeat guest rate | % of vessels with > 1 booking at this marina | Stat card |
| Vessel origin map | Boat `home_port` values plotted on map | Map heatmap |
| Top visiting flags | Most common `boats.flag` values | Ranked list |

---

### 9.6 Provider Performance Panel

| Metric | Calculation | Display |
|---|---|---|
| Active partnerships | Count of providers with `status = 'active'` | Stat card |
| Jobs dispatched (period) | Marina-sourced `provider_job_interests` accepted | Stat card |
| Avg match score for marina jobs | Mean match score from `match_score_cache` for marina opportunities | Stat card |
| Provider leaderboard | Providers ranked by jobs completed at marina | Table |
| Unmatched urgent needs | Critical/high `job_opportunities` with no provider interest | Alert badge |

---

### 9.7 Multi-Marina Comparison

Available only when a marina owner has ≥ 2 marinas.

| View | Description |
|---|---|
| Side-by-side KPIs | Key metrics for each marina in a comparison table |
| Occupancy comparison | Multi-line chart, one line per marina |
| Revenue comparison | Grouped bar chart |
| Best-performing marina | Highlighted with delta vs portfolio average |

---

## 10. Data Model

### 10.1 `marinas`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| owner_id | uuid FK → profiles | Marina owner account |
| marina_name | varchar(150) | |
| tagline | varchar(255) | |
| address_line1 | varchar(200) | |
| address_city | varchar(100) | |
| address_state | varchar(100) | |
| address_zip | varchar(20) | |
| address_country | char(2) | ISO-3166 |
| latitude | decimal(10,7) | Required for map |
| longitude | decimal(10,7) | Required for map |
| vhf_channel | varchar(10) | |
| phone | varchar(20) | |
| email | varchar(255) | |
| website_url | text | |
| amenities | text[] | From curated list |
| cover_photo_url | text | First photo = cover |
| status | varchar(20) | `draft` `published` `suspended` |
| verification_status | varchar(20) | `pending_review` `approved` (future) |
| stripe_account_id | text | Stripe Connect account |
| stripe_payouts_enabled | boolean | |
| platform_fee_percent | numeric(5,4) | Default 0.08 (8%) |
| avg_rating | decimal(3,2) | Updated on review |
| review_count | int | |
| total_berths | int | Computed / cached |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| deleted_at | timestamptz | Soft delete |

### 10.2 `marina_berths`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| marina_id | uuid FK → marinas | |
| berth_label | varchar(30) | "A-12" |
| berth_type | varchar(20) | floating / fixed / mooring / alongside / dry_stack |
| length_ft | numeric(6,1) | Max vessel length |
| beam_ft | numeric(5,1) | Max vessel beam |
| draft_ft | numeric(5,1) | Max draft |
| power_amps | smallint[] | e.g. [30, 50] |
| has_water | boolean | |
| has_wifi | boolean | |
| daily_rate_usd | numeric(8,2) | |
| weekly_rate_usd | numeric(8,2) | |
| monthly_rate_usd | numeric(8,2) | |
| annual_rate_usd | numeric(8,2) | |
| notes | text | Operator notes |
| is_active | boolean | Hides from booking if false |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### 10.3 `marina_berth_bookings`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| reference | text UNIQUE | "YW-MARINA-{year}-{seq}" |
| marina_id | uuid FK → marinas | |
| berth_id | uuid FK → marina_berths | |
| boat_id | uuid FK → boats | **Nullable** — null for walk-up/phone bookings |
| owner_id | uuid FK → profiles | **Nullable** — null for walk-up/phone bookings |
| booking_source | varchar(20) | `'online'` `'walk_up'` `'phone'` — default `'online'` |
| guest_name | text | Walk-up guest display name (null for registered owners) |
| guest_email | text | Walk-up guest contact email |
| guest_phone | text | Walk-up guest contact phone |
| check_in_date | date | |
| check_out_date | date | |
| nights | int | Computed: check_out – check_in |
| rate_snapshot_usd | numeric(8,2) | Rate at time of booking |
| total_amount_usd | numeric(10,2) | rate × nights |
| platform_fee_amount | numeric(10,2) | |
| marina_payout_amount | numeric(10,2) | |
| status | varchar(30) | Lifecycle (§6.2) |
| special_requests | text | |
| payment_intent_id | text | Stripe |
| actual_check_in_at | timestamptz | Set by operator |
| actual_check_out_at | timestamptz | Set by operator |
| assigned_by | uuid FK → profiles | Operator who assigned berth |
| cancelled_at | timestamptz | |
| cancellation_reason | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### 10.4 `marina_photos`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| marina_id | uuid FK → marinas | |
| storage_path | text | Supabase storage path |
| caption | varchar(300) | |
| display_order | int | 0 = cover |
| is_active | boolean | |
| created_at | timestamptz | |

### 10.5 `marina_staff`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| marina_id | uuid FK → marinas | |
| user_id | uuid FK → profiles | Invited staff member |
| staff_role | varchar(30) | `manager` `harbormaster` `dock_attendant` |
| invited_by | uuid FK → profiles | |
| accepted_at | timestamptz | Null = invite pending |
| is_active | boolean | |
| created_at | timestamptz | |

### 10.6 `marina_provider_partnerships`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| marina_id | uuid FK → marinas | |
| provider_id | uuid FK → profiles | |
| status | varchar(20) | pending / approved / active / rejected / suspended / terminated |
| tier | varchar(20) | standard / preferred / exclusive |
| service_categories | text[] | Categories offered at this marina |
| commission_percent | numeric(5,4) | Default 0.08 for preferred, 0.12 for exclusive |
| is_exclusive_category | text | Category if exclusive tier |
| applied_at | timestamptz | |
| approved_at | timestamptz | |
| approved_by | uuid FK → profiles | Marina owner |
| termination_reason | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| UNIQUE | (marina_id, provider_id) | One partnership per pair |

### 10.7 `marina_reviews`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| marina_id | uuid FK → marinas | |
| booking_id | uuid FK → marina_berth_bookings | |
| reviewer_id | uuid FK → profiles | Boat owner |
| rating | smallint | 1–5 |
| comment | text | |
| marina_response | text | |
| marina_responded_at | timestamptz | |
| is_visible | boolean | Default true |
| created_at | timestamptz | |
| UNIQUE | (booking_id) | One review per booking |

### 10.8 Relationships Diagram

```
profiles (marina_owner) ──┐
                          │ 1:N
                       marinas ────────────────────────────────────┐
                          │                                        │
                   ┌──────┴──────────────────────┐                │
                   │                             │                │
              marina_berths              marina_staff      marina_provider_partnerships
                   │                                              │
        marina_berth_bookings                           profiles (provider)
                   │
            ┌──────┴──────┐
           boats         marina_reviews
           (owner's)
```

---

## 11. Supabase Schema

The full schema lives in `supabase/schema_module5.sql`. Key excerpts:

### 11.1 Sequence & Reference Generation

```sql
create sequence if not exists marina_booking_reference_seq start 1000 increment 1;

-- Reference format: "YW-MARINA-{YYYY}-{000000}"
-- Generated in insert trigger (same pattern as Module 2 bookings)
```

### 11.2 Berth Availability Check Function

```sql
create or replace function public.check_berth_availability(
  p_berth_id uuid,
  p_check_in  date,
  p_check_out date
) returns boolean language plpgsql as $$
begin
  return not exists (
    select 1 from public.marina_berth_bookings
    where berth_id    = p_berth_id
      and status      in ('CONFIRMED', 'CHECKED_IN')
      and daterange(check_in_date, check_out_date, '[)')
          && daterange(p_check_in, p_check_out, '[)')
  );
end;
$$;
```

### 11.3 Marina Rating Recalculation Trigger

```sql
create or replace function public.recalculate_marina_rating()
returns trigger language plpgsql as $$
begin
  update public.marinas
  set
    avg_rating   = (
      select round(avg(rating)::numeric, 2)
      from public.marina_reviews
      where marina_id  = new.marina_id
        and is_visible = true
    ),
    review_count = (
      select count(*)
      from public.marina_reviews
      where marina_id  = new.marina_id
        and is_visible = true
    )
  where id = new.marina_id;
  return new;
end;
$$;

create trigger marina_review_rating_update
  after insert or update on public.marina_reviews
  for each row execute procedure public.recalculate_marina_rating();
```

---

## 12. Row Level Security

### 12.1 `marinas`

| Policy | Who | Operation | Condition |
|---|---|---|---|
| marina: public read published | All | SELECT | `status = 'published'` |
| marina: owner full CRUD | Marina owner | ALL | `owner_id = auth.uid()` |
| marina: staff read | Staff (via marina_staff) | SELECT | `marina_id in (owned or staffed marinas)` |

### 12.2 `marina_berths`

| Policy | Who | Operation | Condition |
|---|---|---|---|
| berths: public read active | Authenticated | SELECT | Join marina where `status = 'published'` |
| berths: owner/staff manage | Owner + Staff | ALL | Via marina ownership/staff |

### 12.3 `marina_berth_bookings`

| Policy | Who | Operation | Condition |
|---|---|---|---|
| bookings: owner read own | Boat owner | SELECT | `owner_id = auth.uid()` |
| bookings: owner insert | Boat owner | INSERT | `owner_id = auth.uid()` |
| bookings: marina staff read | Staff | SELECT | Via marina_id match |
| bookings: marina staff update | Staff | UPDATE | Via marina_id match (status changes only) |

### 12.4 `marina_provider_partnerships`

| Policy | Who | Operation | Condition |
|---|---|---|---|
| partnerships: provider read own | Provider | SELECT | `provider_id = auth.uid()` |
| partnerships: provider insert | Provider | INSERT | `provider_id = auth.uid()` |
| partnerships: marina owner manage | Marina owner | ALL | Via marina ownership |
| partnerships: public read active | All | SELECT | `status = 'active'` (for discovery) |

### 12.5 `marina_reviews`

| Policy | Who | Operation | Condition |
|---|---|---|---|
| reviews: public read | All | SELECT | `is_visible = true` |
| reviews: owner insert | Boat owner | INSERT | `reviewer_id = auth.uid()` |
| reviews: marina respond | Marina owner | UPDATE | `marina_response` column only, via marina ownership |

---

## 13. UI/UX Specifications

### 13.1 New Pages

| Route | Component | Role |
|---|---|---|
| `/marinas` | MarinasPage | All |
| `/marinas/:id` | MarinaProfile | All |
| `/marinas/:id/book` | MarinaBookingFlow | Boat owner |
| `/marina-dashboard` | MarinaDashboard | Marina owner |
| `/marina-dashboard/operations` | MarinaOperations | Marina owner + operator |
| `/marina-dashboard/berths` | BerthMap | Marina owner + operator |
| `/marina-dashboard/partnerships` | PartnershipManager | Marina owner |
| `/marina-dashboard/analytics` | EnterpriseAnalytics | Marina owner |
| `/marina-dashboard/staff` | StaffManager | Marina owner |

### 13.2 Updated Pages / Components

| Component | Change |
|---|---|
| `OwnerDashboard` | Add "Marina" stat card (active berth booking if any); "My Berths" tab |
| `Marketplace` | Add "Marinas" tab (alongside Providers) |
| `BoatProfile` | "At Marina" banner when active berth booking; smart matches enriched with marina context |
| `ProviderDashboard` | Add "Marina Jobs" tab; "Partnerships" tab |
| `MatchedProviderPanel` | "On-site Partner" chip for marina-partnered providers |
| `RecommendedJobsFeed` | "Marina Source" badge on marina-sourced leads |
| Nav | Add "Marinas" link in main nav |

### 13.3 Design Tokens

Follow existing ocean / navy / teal palette. New marina-specific colours:

| Token | Hex | Usage |
|---|---|---|
| `marina-blue` | #0F4C81 | Marina primary (nautical navy) |
| `marina-gold` | #C9A84C | Premium partnership badges |
| `marina-teal` | #0D9B8A | Occupied berth status (reuse teal-500) |

### 13.4 Enterprise Dashboard Chart Library

Reuse existing Recharts components (already in bundle from Modules 1–4):
- `LineChart` — occupancy trend, revenue trend
- `BarChart` — revenue by source, occupancy by berth type, monthly comparison
- `PieChart` / `RadialBarChart` — current occupancy donut, service demand donut
- New: Map-based heatmap for vessel origins → **Mapbox GL JS** (lazy-loaded, same SDK used for marina discovery map and geocoding; env var: `VITE_MAPBOX_TOKEN`)

---

## 14. API & Integration Points

### 14.1 Supabase Realtime (WebSocket)

| Channel | Events | Consumer |
|---|---|---|
| `marina_berth_bookings:{marina_id}` | INSERT, UPDATE | Operator live berth map |
| `marina_provider_partnerships:{marina_id}` | INSERT, UPDATE | Marina owner notifications |
| `job_opportunities:{marina_id}` | INSERT | Provider marina job board |

### 14.2 Stripe Connect (Berth Bookings & Service Commissions)

**Berth booking payment (transient/seasonal):**
- `PaymentIntent.create` with `transfer_data.destination = marina.stripe_account_id`
- Platform fee deducted via `application_fee_amount` (8% platform rate for marina bookings)
- Remaining net amount auto-transferred to marina's connected Stripe account on capture

**Service commission (preferred/exclusive providers):**
No custom Stripe arrangement required. Two sequential transfers handle the three-way split:

1. **Primary PaymentIntent** — Yacht owner → Provider (standard Module 2 flow):
   - `application_fee_amount` = platform 10% fee (stays on platform account)
   - `transfer_data.destination` = provider's Stripe Connect account

2. **Secondary Transfer** — Platform → Marina (triggered by webhook):
   - Trigger: `payment_intent.succeeded` webhook event
   - Source: platform's own Stripe balance (funded from the 10% application fee already collected)
   - `Transfer.create({ amount: marina_commission_amount, currency: 'usd', destination: marina.stripe_account_id })`
   - `marina_commission_amount` = job value × tier commission rate (8% preferred, 12% exclusive)
   - Webhook handler stores transfer ID in `service_bookings.marina_transfer_id` for reconciliation

This approach requires no custom Stripe arrangement and works within standard Connect semantics.

### 14.3 Geocoding (Marina Location)

**SDK: Mapbox Geocoding API** (Mapbox GL JS — same dependency as marina discovery map and vessel origins heatmap; single SDK, single token)

- **Env var:** `VITE_MAPBOX_TOKEN` (added to `.env.local` and Vercel project env)
- On marina address save (Step 2 of onboarding wizard), call:
  `GET https://api.mapbox.com/geocoding/v5/mapbox.places/{address}.json?access_token={token}`
- Parse first feature's `[lng, lat]` coordinates
- Store `latitude` and `longitude` in `marinas` table (also populate the PostGIS `location` column via trigger)
- Used for:
  - Marina discovery map marker placement (§5)
  - Distance calculations in matching enrichment (`applyMarinaContext()`)
  - Vessel origins heatmap coordinate clustering (§13.4)

### 14.4 Module 4 Matching Engine Hook

New exported function added to `matchScore.ts`:

```typescript
/**
 * Applies marina partnership bonuses to a set of already-computed match results.
 * Called after computeOwnerMatches() when the owner has an active berth booking.
 *
 * @param results       Raw MatchResult[] from computeOwnerMatches()
 * @param partneredIds  { providerId, tier }[] from marina's active partnerships
 * @returns             Adjusted MatchResult[] re-sorted by new scores
 */
export function applyMarinaContext(
  results: MatchResult[],
  partneredIds: { providerId: string; tier: 'standard' | 'preferred' | 'exclusive' }[]
): MatchResult[]
```

---

## 15. Notifications

### 15.1 Notification Triggers

| Event | Recipient | Channel | Template |
|---|---|---|---|
| Berth booking confirmed | Boat owner | Email + in-app | Booking ref, marina details, VHF |
| Berth booking confirmed | Marina operator | In-app | New arrival, vessel details |
| Check-in due tomorrow | Boat owner | Email | Reminder + marina contact |
| Check-out due today | Boat owner | In-app | Departure reminder |
| Provider partnership approved | Provider | Email + in-app | Marina name, tier, commission |
| Provider partnership rejected | Provider | Email | Marina name, reason |
| New partnership application | Marina owner | In-app | Provider name, categories |
| New marina job match | Provider | In-app | Vessel at partner marina needs service |
| Marina review received | Marina owner | In-app | Rating, reviewer |

All notifications stored in the existing `notifications` table (Module 3). New `type` values added:
`marina_booking_confirmed` `marina_check_in_reminder` `marina_check_out_reminder`
`partnership_approved` `partnership_rejected` `new_partnership_application` `marina_job_match`

---

## 16. Non-Functional Requirements

### 16.1 Performance

| Target | Requirement |
|---|---|
| Marina search results | < 400ms (with geospatial index) |
| Berth availability check | < 100ms (indexed tsrange query) |
| Enterprise dashboard load | < 1.5s (pre-aggregated views) |
| Live berth map update | < 500ms via Supabase Realtime |

### 16.2 Scalability

- `marinas` supports unlimited marina entities per account (no arbitrary cap)
- `marina_berths` supports up to 2,000 berths per marina (covers large commercial marinas)
- Analytics queries use pre-computed materialized views refreshed every 15 minutes

### 16.3 Geospatial Index

```sql
create extension if not exists postgis;

alter table public.marinas add column if not exists location geography(point, 4326);

create index if not exists marinas_location_idx on public.marinas using gist(location);

-- Update location column from lat/lng on insert/update (trigger)
```

Geospatial index enables `ORDER BY location <-> ST_Point(lng, lat)::geography` for fast nearby-marina queries.

### 16.4 Data Retention

| Table | Retention |
|---|---|
| `marina_berth_bookings` | Indefinite (financial records) |
| `marina_reviews` | Indefinite |
| `marina_staff` | Soft-delete only |
| `marina_provider_partnerships` | Indefinite (audit trail) |

---

## 17. Implementation Phases

### Phase 1 — Marina Foundation (Week 1–2)
- [ ] Supabase schema (marinas, berths, bookings, staff, partnerships, reviews, photos)
- [ ] Marina onboarding wizard (Steps 1–6)
- [ ] Marina publication gate logic
- [ ] Marina profile page (`/marinas/:id`) — read only
- [ ] Marina search page (`/marinas`) — list + basic filter

### Phase 2 — Berth Booking (Week 3–4)
- [ ] Berth availability calendar component
- [ ] Booking flow (select berth + dates → payment)
- [ ] Stripe Connect integration for marina payouts
- [ ] Booking lifecycle state machine
- [ ] Cancellation + refund logic
- [ ] Owner "My Berths" tab in dashboard

### Phase 3 — Operator Tools (Week 5)
- [ ] Marina Operations dashboard (`/marina-dashboard/operations`)
- [ ] Live berth map (Supabase Realtime)
- [ ] Check-in / check-out workflow
- [ ] Staff invite + role management
- [ ] Operator notifications

### Phase 4 — Provider Partnerships (Week 6)
- [ ] Partnership application flow (provider side)
- [ ] Marina partnership manager (marina owner side)
- [ ] Module 4 match score enrichment (`applyMarinaContext`)
- [ ] Marina job board (provider side)
- [ ] Partnership badge on provider public profiles

### Phase 5 — Enterprise Dashboard (Week 7–8)
- [ ] Occupancy panel + charts
- [ ] Revenue panel + charts
- [ ] Service demand panel (Module 4 integration)
- [ ] Fleet analytics panel
- [ ] Provider performance panel
- [ ] Multi-marina comparison view
- [ ] Pre-computed analytics materialized views + refresh job

### Phase 6 — Polish & Integration (Week 9)
- [ ] Mapbox GL JS integration (marina discovery map + vessel origins heatmap on Enterprise Dashboard)
- [ ] All notification triggers wired up
- [ ] Demo data for all marina features
- [ ] Full RLS audit
- [ ] Build verification + Vercel deployment

---

## 18. Open Questions

All questions resolved as of v1.1 (2026-04-03). Decisions reflected in TRD body.

| # | Question | Status | Decision |
|---|---|---|---|
| 1 | Should marina berth bookings use the same Module 2 `bookings` table or a separate `marina_berth_bookings` table? | ✅ Resolved | **Separate table** (`marina_berth_bookings`). Cleaner isolation for marina-specific columns (berth assignment, VHF, operator tracking) without polluting the service bookings schema. |
| 2 | What geocoding API for marina address → lat/lng? | ✅ Resolved | **Mapbox Geocoding API** (`VITE_MAPBOX_TOKEN`). Same SDK as discovery map and heatmap; single dependency, single billing account. See §14.3. |
| 3 | Should the platform fee for marina berth bookings be 8% (vs 10% for services)? | ✅ Resolved | **8% platform fee** for berth bookings. Marinas operate on thinner margins; reduced rate incentivises adoption. Service commission splits (preferred/exclusive) are separate from platform fee. |
| 4 | Should operators be able to create bookings for walk-up vessels without a Yachtworx account? | ✅ Resolved | **Yes — walk-up bookings supported.** `boat_id` and `owner_id` are nullable; `booking_source`, `guest_name`, `guest_email`, `guest_phone` columns added. If guest later creates an account with the same email, bookings are retroactively linked. See §10.3. |
| 5 | Should exclusive tier exclusivity be per service category or per marina? | ✅ Resolved | **Per service category.** Multiple non-overlapping exclusive providers permitted at the same marina (e.g., exclusive engine mechanic + exclusive detailer). Conflict check blocks overlapping category exclusives. See §7.1. |
| 6 | Does the three-way Stripe split require a custom arrangement or two sequential transfers? | ✅ Resolved | **Two sequential transfers — no custom Stripe arrangement needed.** Primary PaymentIntent goes owner → provider; secondary Transfer goes platform → marina (funded from application fee), triggered by `payment_intent.succeeded` webhook. See §14.2. |
| 7 | Should marina reviews be pooled with the general ratings system or kept in a separate `marina_reviews` table? | ✅ Resolved | **Separate `marina_reviews` table.** Marina reviews have different fields (berth quality, amenities, staff, value) and aggregate differently than service provider ratings. General ratings stay clean. |
| 8 | Vessel origins heatmap — Leaflet.js or Mapbox GL JS? | ✅ Resolved | **Mapbox GL JS.** Consistent with geocoding choice (single SDK, single token). Better WebGL performance at scale and first-class cluster/heatmap layer support. See §13.4 and Phase 6. |

---

*End of Module 5 TRD*
*Next: Implementation begins with Phase 1 — Marina Foundation*
