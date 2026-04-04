# Yachtworx – Technical Requirements Document
## Module 6: Insurance & Warranty Layer

**Version:** 1.0
**Status:** In Review
**Last Updated:** 2026-04-04

---

## Table of Contents

1. [Overview](#1-overview)
2. [User Roles](#2-user-roles)
3. [User Journeys](#3-user-journeys)
4. [Functional Requirements](#4-functional-requirements)
5. [Data Model](#5-data-model)
6. [State Machines](#6-state-machines)
7. [API Endpoints](#7-api-endpoints)
8. [Pricing & Commission Model](#8-pricing--commission-model)
9. [Integration with Existing Modules](#9-integration-with-existing-modules)
10. [Notifications & Communications](#10-notifications--communications)
11. [Document Management](#11-document-management)
12. [Security Requirements](#12-security-requirements)
13. [Non-Functional Requirements](#13-non-functional-requirements)
14. [Future Extensibility](#14-future-extensibility)
15. [Open Questions](#15-open-questions)

---

## 1. Overview

Module 6 adds a full Insurance and Warranty layer to the Yachtworx platform. It introduces two new first-class user roles — **Insurer** (insurance company) and **Insurance Agent** — and extends existing roles (Yacht Owner and Service Provider) with insurance-aware capabilities.

The module covers four major capability areas:

1. **Insurance Product Catalog** — Insurers publish marine insurance products (Hull & Machinery, Protection & Indemnity, Crew, Charter, Extended Warranty).
2. **Policy Lifecycle Management** — Owners get instant quotes, compare products, bind policies, receive documents, and manage renewals.
3. **Claims Management** — Owners file FNOL (First Notice of Loss), adjusters assess and authorise repairs, providers get paid by the insurer, and settlements are tracked end-to-end.
4. **Warranty Layer** — Service Providers can register warranties on completed work; Owners can file warranty claims against that work; Providers are notified and obligated to respond.

### 1.1 Scope

**In scope:**

- Insurer company onboarding (KYB, Stripe Connect)
- Insurance Agent onboarding (licence verification, insurer association)
- Marine insurance product catalog CRUD
- AI-assisted instant quote engine (using boat profile data from Module 1)
- Policy purchase, binding, and document storage
- Policy renewal reminders and self-service renewal flow
- FNOL filing, claim tracking, adjuster assignment, repair authorisation, and settlement
- Service work warranty registration by Service Providers (Module 2/3)
- Warranty claim filing by Owners, resolution workflow for Providers
- Insurance Company enterprise dashboard (portfolio, claims pipeline, agent leaderboard, analytics)
- Insurance Agent dashboard (client book, quotes, commission tracking)
- Owner insurance wallet (all policies, claims, warranty registrations in one place)
- Stripe payment integration for premiums
- Certificate of Insurance (COI) generation and storage

**Out of scope (v1.0):**

- Reinsurance or treaty management
- Actuarial rating engine (underwriting rules are configured manually per product)
- Telematics / voyage tracking data integration
- ACORD form generation
- Integration with Lloyd's or external policy admin systems
- Broker-of-record transfers
- Multi-currency premiums (USD only in v1.0)

### 1.2 Dependencies

| Module | Dependency |
|---|---|
| Module 1 | Boat profile (type, LOA, year, value, components) — used for instant quoting |
| Module 2 | Completed bookings — used to scope warranty registrations and claims |
| Module 3 | Provider trust score, licence validity, insurance COI — factored into warranty eligibility |
| Module 5 | Marina berth bookings — marina location affects geographic coverage rating |
| Stripe Connect | Premium collection, insurer payouts, agent commission disbursement |
| Supabase Storage | Policy PDFs, COIs, claim photos, warranty certificates |
| Resend / Email | Policy documents, claim updates, renewal reminders |

---

## 2. User Roles

### 2.1 Yacht Owner (`owner` — existing role extended)

Existing owners gain access to:
- Insurance Wallet tab (view all policies, file claims, view warranty registrations)
- Instant quote flow for any available product
- Policy purchase and renewal
- FNOL claim filing with photo upload
- Warranty claim filing against completed service work

### 2.2 Service Provider (`provider` — existing role extended)

Existing providers gain access to:
- Warranty Registration panel after a booking is marked COMPLETED
- Warranty claim inbox (notification + resolution workflow)
- Own COI upload (already in Module 3, now surfaced to insurers reviewing claims)

### 2.3 Insurer (`insurer` — new role)

An Insurer is a legal entity (insurance company, MGA, or Lloyd's syndicate) that:
- Onboards via KYB verification and Stripe Connect
- Publishes one or more insurance products to the Yachtworx marketplace
- Sets underwriting parameters per product (vessel age limits, LOA limits, territory)
- Reviews and approves (or declines) generated quotes before binding (for non-instant-bind products)
- Manages a claims pipeline (assign adjusters, approve settlements)
- Manages an agent network (invite agents, set commission tiers)
- Has access to an enterprise analytics dashboard

### 2.4 Insurance Agent (`agent` — new role)

An Insurance Agent is a licensed individual or firm that:
- Onboards with state/country licence number (verified manually or via API in v1.0)
- Associates with one or more Insurer accounts (or operates as independent)
- Browses the owner population and generates quotes on their behalf
- Binds policies (subject to insurer's instant-bind setting)
- Tracks their book of business and commission pipeline
- Receives notifications on renewals and claims for their clients

### 2.5 Adjuster (`adjuster` — sub-role under `insurer`)

An Adjuster is a staff member of the Insurer who:
- Is assigned to claims by the insurer
- Submits formal assessments (coverage decision, repair cost approval)
- Can authorise Service Providers to perform repairs and receive payment
- Cannot manage products, agents, or financials

### 2.6 Admin (`admin` — existing role extended)

Admins gain:
- Full read access to all insurance tables
- Ability to manually approve KYB for insurers and licence status for agents
- Ability to escalate disputed claims
- Ability to suspend insurer or agent accounts

---

## 3. User Journeys

### 3.1 Yacht Owner — Getting Insured

```
1. Owner navigates to Insurance Wallet → "Find Coverage"
2. Platform pre-fills boat details from active boat profile (Module 1)
3. Owner selects product category (H&M / P&I / Charter / Crew / Warranty)
4. Owner answers supplemental underwriting questions (mooring type, use type, cruising territory, prior claims)
5. Platform calls quote engine → returns one or more matching products with premium estimates
6. Owner compares products (coverage details, exclusions, deductible, premium)
7. Owner selects a product → "Get Quote"
8. Quote is locked for 30 days; if insurer requires manual review, status = PENDING_REVIEW
9. Owner receives quote confirmation email with PDF summary
10. Owner clicks "Bind Policy" → enters payment details (Stripe)
11. Platform charges first premium instalment
12. Policy status → ACTIVE; COI generated; documents emailed
13. Owner can view policy in Insurance Wallet
```

### 3.2 Yacht Owner — Filing a Claim

```
1. Owner opens Insurance Wallet → selects active policy → "File a Claim"
2. Owner completes FNOL form:
   - Incident date, time, location (lat/lng or marina name)
   - Incident type (collision, weather, theft, fire, sinking, machinery, other)
   - Description (free text, max 2000 chars)
   - Estimated loss amount
   - Photo uploads (up to 20 images)
3. Claim created with status SUBMITTED; reference number issued (e.g. YW-CLM-2026-001234)
4. Insurer notified; claim assigned to adjuster (automatic or manual)
5. Adjuster reviews claim → may request additional documents
6. Adjuster submits assessment:
   - Coverage decision (covered / partially covered / not covered)
   - Approved repair amount
   - Preferred repair provider (from Yachtworx provider network or external)
7. If covered → repair authorisation issued; owner notified
8. If owner uses platform provider → booking created against authorised amount
9. Provider completes work → marks booking COMPLETED
10. Platform triggers settlement transfer to provider (authorised amount minus platform fee)
11. Claim → PAID → CLOSED; owner notified; documents archived
```

### 3.3 Yacht Owner — Filing a Warranty Claim

```
1. Owner opens completed service booking → "File Warranty Claim"
2. Owner describes the issue (defective work / part failure within warranty period)
3. Warranty claim created; Provider notified
4. Provider has 48 hours to acknowledge
5. Provider can accept responsibility (schedules remediation) or dispute
6. If accepted → provider schedules re-work; no charge to owner
7. If disputed → admin mediates (escalation flow, same as Module 2 disputes)
8. On resolution → warranty claim CLOSED; provider's trust score updated
```

### 3.4 Service Provider — Registering a Warranty

```
1. Provider marks booking COMPLETED
2. Platform prompts: "Register a warranty for this work?"
3. Provider selects warranty type (Labour / Parts / Combined)
4. Provider sets duration (30 / 60 / 90 / 180 / 365 days)
5. Provider optionally uploads warranty certificate PDF
6. Warranty registered; owner notified; appears in Owner's Insurance Wallet
7. Warranty is visible on provider's profile as a trust signal
```

### 3.5 Insurance Company — Onboarding

```
1. Insurer clicks "List Your Products" on /for-insurers landing page
2. Completes company registration:
   - Legal entity name, EIN/company number, country
   - AM Best rating (optional)
   - Primary contact, billing email
3. Uploads KYB documents (certificate of authority, surplus lines licence, E&O)
4. Admin reviews and approves KYB (manual in v1.0)
5. Insurer connects Stripe account (Stripe Connect Express)
6. Insurer sets up product catalog (see §3.6)
7. Insurer invites agents (optional)
8. Insurer goes live — products appear in owner quote flow
```

### 3.6 Insurance Company — Managing Products

```
1. Insurer navigates to Products → "Add Product"
2. Configures product:
   - Type, name, description, coverage summary
   - Underwriting rules (vessel age max, LOA max/min, territory, use type eligibility)
   - Base premium rate (% of agreed value, or flat rate per LOA foot)
   - Deductible options
   - Instalment options (annual / semi-annual / monthly)
   - Instant bind (yes/no) — if no, all quotes require manual approval
   - Cancellation policy
3. Product status → DRAFT; insurer reviews → publishes
4. Product appears in owner quote marketplace
5. Insurer can pause or archive products at any time
```

### 3.7 Insurance Company — Managing Claims

```
1. Claims pipeline shows all active claims (SUBMITTED / UNDER_REVIEW / PENDING_ASSESSMENT)
2. Insurer assigns claim to adjuster (internal staff or external)
3. Adjuster submits assessment
4. Insurer reviews assessment → approves or modifies
5. Settlement authorised → Stripe transfer initiated to repair provider
6. Claim closed; documents archived
```

### 3.8 Insurance Agent — Onboarding

```
1. Agent navigates to /register-agent
2. Completes profile:
   - Full name, licence number, issuing state/country, licence expiry
   - Associated insurer(s) (select from registered insurers or "Independent")
   - Stripe account for commission payouts
3. Agent submits E&O certificate upload (optional in v1.0, required before first bind)
4. Admin verifies licence (manual in v1.0)
5. Agent account activated; appears in insurer's agent roster
```

### 3.9 Insurance Agent — Managing Their Book of Business

```
1. Agent searches owner population (by name, boat name, email)
2. Agent selects owner → generates quote on their behalf (with owner's consent flag)
3. Agent binds policy once owner approves (or agent has power of attorney)
4. Policy appears in both agent's and owner's dashboards
5. Agent receives commission on bind and on renewals
6. Agent dashboard shows: active policies, expiring policies (30/60/90 days), open claims, commission YTD
```

---

## 4. Functional Requirements

### 4.1 Quote Engine

| Requirement | Detail |
|---|---|
| Pre-fill from boat profile | Automatically populate vessel type, year, LOA, agreed value estimate from Module 1 |
| Agreed value input | Owner can override the pre-filled agreed value; used as base for H&M premium |
| Territory selector | Pre-defined cruising zones: US East Coast, US West Coast, Gulf of Mexico, Caribbean, Mediterranean, Worldwide |
| Use type selector | Pleasure / Charter / Racing / Commercial |
| Mooring type | Marina slip / mooring ball / at anchor / dry storage |
| Prior claims | Number of claims in last 3 years (self-declared; checked against platform claim history) |
| Product matching | Quote engine filters products by: vessel age ≤ max_vessel_age, LOA within range, territory matches, use type allowed |
| Multiple quotes | Return all matching products sorted by annual premium ascending |
| Quote locking | Quote valid 30 days; premium locked; re-quote required after expiry |
| Quote PDF | Auto-generated PDF summary of coverage, exclusions, premium schedule |

### 4.2 Policy Binding

| Requirement | Detail |
|---|---|
| Instant bind | If product `instant_bind = true`, policy activates immediately on payment |
| Manual bind | If `instant_bind = false`, policy enters PENDING_BIND; insurer approves within 48 hrs |
| Payment | Stripe PaymentIntent for first premium; recurring via Stripe Subscription for instalments |
| COI generation | Certificate of Insurance PDF auto-generated on ACTIVE; stored in Supabase Storage |
| Policy number | Format: `{insurer_code}-{YYYY}-{8-digit-sequence}` e.g. `MAR-2026-00001234` |
| Cancellation | Owner can cancel within 30 days for full refund (minus admin fee); pro-rated refund after |
| Endorsements | Mid-term changes to coverage (vessel name change, territory extension) logged as endorsement records |

### 4.3 Renewal Management

| Requirement | Detail |
|---|---|
| Renewal reminders | Email at 90 days, 60 days, 30 days, 7 days before expiry |
| Auto-renewal | Optional; owner opts in at bind; requires saved payment method |
| Re-quote on renewal | Platform re-runs quote engine at renewal; premium may change |
| Renewal decline | Insurer can decline to renew (must give 30-day notice); owner notified |
| Lapse grace period | 15-day grace period after expiry before policy marked LAPSED |

### 4.4 Claims Management

| Requirement | Detail |
|---|---|
| FNOL filing | Owner submits incident details, photos, estimated loss via platform |
| Claim reference | Format: `YW-CLM-{YYYY}-{6-digit-zero-padded}` e.g. `YW-CLM-2026-000123` |
| Document requests | Adjuster can request additional documents (marine survey, repair estimates, police report); owner uploads in-platform |
| Adjuster assignment | Manual (insurer picks from adjuster list) or round-robin auto-assignment |
| Assessment SLA | Adjuster must submit assessment within 10 business days of assignment |
| Repair authorisation | Adjuster specifies authorised repair amount; owner must use platform provider or submit external invoice |
| Provider payment | Platform routes settlement payment via Stripe to repair provider; deducts platform fee |
| Claim appeal | Owner can appeal a REJECTED claim once; admin mediates |
| Fraud flags | > 2 claims in 12 months triggers manual review flag |

### 4.5 Warranty Registration

| Requirement | Detail |
|---|---|
| Trigger | Available after any booking reaches COMPLETED status (Module 2) |
| Warranty types | `labour_only` / `parts_only` / `combined` |
| Duration options | 30 / 60 / 90 / 180 / 365 days from booking completion date |
| Warranty certificate | Provider can upload PDF; platform generates basic certificate if not uploaded |
| Visibility | Warranty appears on owner's Insurance Wallet and provider's public profile |
| Expiry check | Platform marks warranty EXPIRED automatically after duration elapses |

### 4.6 Warranty Claims

| Requirement | Detail |
|---|---|
| Eligibility window | Claim must be filed before warranty expiry date |
| Provider acknowledgement SLA | 48 hours from notification |
| Resolution SLA | Provider must propose resolution within 7 business days |
| Escalation | If provider does not respond within 48 hrs, admin is alerted and trust score is penalised |
| Trust score impact | Unresolved warranty claim: −5 pts; disputed and found provider fault: −10 pts |

### 4.7 Insurance Company Dashboard

| Panel | Metrics |
|---|---|
| Portfolio Overview | Active policies, total insured value, monthly premium revenue, renewal rate |
| Claims Pipeline | Open claims by status, avg time to close, loss ratio, reserve balance |
| Agent Performance | Policies bound per agent, commission paid, retention rate |
| Product Analytics | Quote-to-bind conversion per product, avg premium, top territories |
| Expiry Forecast | Policies expiring in 30 / 60 / 90 days with renewal likelihood score |

### 4.8 Insurance Agent Dashboard

| Panel | Metrics |
|---|---|
| Book of Business | All active policies (client name, vessel, product, premium, expiry) |
| Pipeline | Quotes in progress (pending owner approval or insurer bind) |
| Renewals Due | Policies expiring in 30 / 60 / 90 days |
| Commission Tracker | Commission earned MTD, YTD, pending, paid; per-policy breakdown |
| Client Activity | Claims filed by clients (read-only visibility) |

---

## 5. Data Model

### 5.1 `insurers`

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| owner_user_id | uuid FK → profiles | The user account of the company admin |
| legal_name | text NOT NULL | |
| trading_name | text | DBA name |
| company_number | text | EIN (US) or company registration number |
| country | text NOT NULL DEFAULT 'US' | |
| am_best_rating | text | e.g. `A`, `A+`, `B++` |
| primary_contact_name | text | |
| primary_contact_email | text | |
| phone | text | |
| website | text | |
| kyb_status | text | `pending` / `approved` / `rejected` / `suspended` |
| kyb_reviewed_at | timestamptz | |
| kyb_reviewed_by | uuid FK → profiles | Admin who approved |
| stripe_account_id | text | Stripe Connect account |
| stripe_charges_enabled | boolean DEFAULT false | |
| stripe_payouts_enabled | boolean DEFAULT false | |
| is_active | boolean DEFAULT false | |
| created_at | timestamptz DEFAULT now() | |
| updated_at | timestamptz DEFAULT now() | |

### 5.2 `insurer_documents`

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| insurer_id | uuid FK → insurers ON DELETE CASCADE | |
| document_type | text | `certificate_of_authority` / `surplus_lines_licence` / `eo_certificate` / `other` |
| storage_path | text NOT NULL | Supabase Storage |
| public_url | text | Signed URL (generated on read) |
| verified | boolean DEFAULT false | |
| expires_at | date | |
| uploaded_at | timestamptz DEFAULT now() | |

### 5.3 `insurance_agents`

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → profiles ON DELETE CASCADE | |
| licence_number | text NOT NULL | |
| licence_state | text | US state or country code |
| licence_expiry | date | |
| licence_status | text | `pending` / `active` / `expired` / `suspended` |
| eo_storage_path | text | E&O certificate upload |
| eo_expiry | date | |
| stripe_account_id | text | For commission payouts |
| stripe_payouts_enabled | boolean DEFAULT false | |
| is_active | boolean DEFAULT false | |
| created_at | timestamptz DEFAULT now() | |
| updated_at | timestamptz DEFAULT now() | |

### 5.4 `agent_insurer_associations`

Agents can be associated with multiple insurers (or none = independent broker).

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| agent_id | uuid FK → insurance_agents ON DELETE CASCADE | |
| insurer_id | uuid FK → insurers ON DELETE CASCADE | |
| commission_tier | text | `standard` / `preferred` / `elite` |
| commission_rate | numeric(5,4) | e.g. 0.10 = 10% of premium |
| status | text | `invited` / `active` / `suspended` / `terminated` |
| invited_at | timestamptz | |
| activated_at | timestamptz | |
| created_at | timestamptz DEFAULT now() | |
| UNIQUE (agent_id, insurer_id) | | |

### 5.5 `insurance_products`

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| insurer_id | uuid FK → insurers ON DELETE CASCADE | |
| product_type | text | `hull_and_machinery` / `protection_and_indemnity` / `crew_personal_accident` / `charter_liability` / `extended_warranty` |
| name | text NOT NULL | e.g. "Blue Water H&M Plus" |
| description | text | Marketing description |
| coverage_summary | text[] | Bullet-point coverage items |
| exclusions_summary | text[] | Key exclusions |
| min_vessel_loa_ft | numeric(6,1) | Underwriting: minimum LOA |
| max_vessel_loa_ft | numeric(6,1) | Underwriting: maximum LOA |
| max_vessel_age_years | int | Underwriting: vessel age cap |
| allowed_use_types | text[] | `pleasure` / `charter` / `racing` / `commercial` |
| allowed_territories | text[] | `us_east` / `us_west` / `gulf` / `caribbean` / `mediterranean` / `worldwide` |
| base_rate_pct | numeric(6,5) | Annual premium as % of agreed value (e.g. 0.01500 = 1.5%) |
| base_rate_per_foot | numeric(8,2) | Alternative flat rate per LOA foot (used if base_rate_pct is null) |
| min_premium_usd | numeric(10,2) | Floor premium regardless of calculation |
| deductible_pct | numeric(5,4) | Default deductible as % of agreed value |
| deductible_fixed_usd | numeric(10,2) | Alternative fixed deductible |
| instalment_options | text[] | `annual` / `semi_annual` / `monthly` |
| instant_bind | boolean DEFAULT false | Bind without manual insurer approval |
| cancellation_policy | text | Human-readable cancellation terms |
| status | text | `draft` / `active` / `paused` / `archived` |
| created_at | timestamptz DEFAULT now() | |
| updated_at | timestamptz DEFAULT now() | |

### 5.6 `insurance_quotes`

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| reference | text UNIQUE | e.g. `YW-QT-2026-001234` — DB generated |
| owner_id | uuid FK → profiles | The yacht owner |
| agent_id | uuid FK → insurance_agents NULL | If generated by an agent |
| product_id | uuid FK → insurance_products | |
| boat_id | uuid FK → boats | |
| agreed_value_usd | numeric(12,2) NOT NULL | |
| use_type | text | |
| territory | text | |
| mooring_type | text | `marina_slip` / `mooring_ball` / `at_anchor` / `dry_storage` |
| prior_claims_count | int DEFAULT 0 | Self-declared |
| annual_premium_usd | numeric(10,2) | Calculated by quote engine |
| instalment_option | text | Selected by owner |
| instalment_amount_usd | numeric(10,2) | |
| deductible_usd | numeric(10,2) | |
| status | text | `draft` / `pending_review` / `quoted` / `declined` / `bound` / `expired` |
| expires_at | timestamptz | 30 days from creation |
| quote_pdf_url | text | Signed URL |
| notes | text | Underwriter notes (insurer-only) |
| created_at | timestamptz DEFAULT now() | |
| updated_at | timestamptz DEFAULT now() | |

### 5.7 `insurance_policies`

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| policy_number | text UNIQUE NOT NULL | Format: `{insurer_code}-{YYYY}-{8-digit}` |
| quote_id | uuid FK → insurance_quotes | Source quote |
| owner_id | uuid FK → profiles ON DELETE RESTRICT | |
| agent_id | uuid FK → insurance_agents NULL | |
| insurer_id | uuid FK → insurers ON DELETE RESTRICT | |
| product_id | uuid FK → insurance_products | |
| boat_id | uuid FK → boats | |
| agreed_value_usd | numeric(12,2) | Snapshot at bind |
| annual_premium_usd | numeric(10,2) | Snapshot at bind |
| instalment_option | text | |
| instalment_amount_usd | numeric(10,2) | |
| deductible_usd | numeric(10,2) | |
| effective_date | date NOT NULL | Coverage start |
| expiry_date | date NOT NULL | Coverage end |
| territory | text | |
| use_type | text | |
| mooring_type | text | |
| status | text | `pending_bind` / `active` / `expiring` / `expired` / `lapsed` / `cancelled` |
| stripe_subscription_id | text | For instalment policies |
| stripe_payment_intent_id | text | For annual single-payment |
| auto_renew | boolean DEFAULT false | |
| cancellation_date | date NULL | |
| cancellation_reason | text NULL | |
| coi_storage_path | text | Certificate of Insurance PDF in Storage |
| coi_url | text | Signed URL |
| created_at | timestamptz DEFAULT now() | |
| updated_at | timestamptz DEFAULT now() | |

### 5.8 `policy_endorsements`

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| policy_id | uuid FK → insurance_policies ON DELETE CASCADE | |
| endorsement_type | text | `vessel_name_change` / `territory_extension` / `agreed_value_change` / `use_type_change` / `other` |
| description | text | |
| effective_date | date | |
| premium_adjustment_usd | numeric(10,2) DEFAULT 0 | Positive = additional premium |
| requested_by | uuid FK → profiles | |
| approved_by | uuid FK → profiles NULL | |
| status | text | `pending` / `approved` / `rejected` |
| created_at | timestamptz DEFAULT now() | |

### 5.9 `insurance_claims`

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| reference | text UNIQUE NOT NULL | `YW-CLM-{YYYY}-{6-digit}` — DB generated |
| policy_id | uuid FK → insurance_policies ON DELETE RESTRICT | |
| owner_id | uuid FK → profiles | |
| insurer_id | uuid FK → insurers | |
| adjuster_id | uuid FK → profiles NULL | Staff member assigned |
| incident_date | date NOT NULL | |
| incident_time | time NULL | |
| incident_latitude | numeric(10,7) | |
| incident_longitude | numeric(10,7) | |
| incident_location_name | text | Marina name, coordinates description |
| incident_type | text | `collision` / `weather` / `theft` / `fire` / `sinking` / `machinery` / `other` |
| description | text NOT NULL | Free text, max 2000 chars |
| estimated_loss_usd | numeric(12,2) | Owner-stated |
| status | text | `draft` / `submitted` / `under_review` / `pending_assessment` / `assessment_complete` / `pending_approval` / `approved` / `payment_processing` / `paid` / `rejected` / `appealed` / `closed` |
| approved_amount_usd | numeric(12,2) NULL | Amount approved after assessment |
| platform_fee_usd | numeric(10,2) NULL | Yachtworx fee on settlement |
| provider_payout_usd | numeric(12,2) NULL | Amount routed to repair provider |
| repair_provider_id | uuid FK → profiles NULL | Platform provider used for repair |
| repair_booking_id | uuid FK → bookings NULL | Module 2 booking created for repair |
| stripe_transfer_id | text NULL | Settlement transfer ID |
| fraud_flag | boolean DEFAULT false | |
| appeal_reason | text NULL | |
| closed_at | timestamptz NULL | |
| created_at | timestamptz DEFAULT now() | |
| updated_at | timestamptz DEFAULT now() | |

### 5.10 `claim_documents`

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| claim_id | uuid FK → insurance_claims ON DELETE CASCADE | |
| uploaded_by | uuid FK → profiles | Owner, adjuster, or provider |
| document_type | text | `photo` / `estimate` / `invoice` / `police_report` / `survey_report` / `other` |
| storage_path | text NOT NULL | |
| public_url | text | Signed URL |
| description | text | |
| requested_by_adjuster | boolean DEFAULT false | Flags adjuster-requested docs |
| created_at | timestamptz DEFAULT now() | |

### 5.11 `claim_assessments`

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| claim_id | uuid FK → insurance_claims ON DELETE CASCADE UNIQUE | One assessment per claim |
| adjuster_id | uuid FK → profiles NOT NULL | |
| coverage_decision | text | `fully_covered` / `partially_covered` / `not_covered` |
| decision_reason | text | |
| approved_amount_usd | numeric(12,2) | |
| recommended_provider_id | uuid FK → profiles NULL | Platform provider recommendation |
| assessment_notes | text | Internal notes |
| submitted_at | timestamptz | |
| reviewed_by | uuid FK → profiles NULL | Insurer senior who approved |
| reviewed_at | timestamptz NULL | |

### 5.12 `warranty_registrations`

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| reference | text UNIQUE | `YW-WR-{YYYY}-{6-digit}` — DB generated |
| booking_id | uuid FK → bookings ON DELETE RESTRICT | Source booking (Module 2) |
| provider_id | uuid FK → profiles | Service provider |
| owner_id | uuid FK → profiles | Boat owner |
| boat_id | uuid FK → boats | |
| warranty_type | text | `labour_only` / `parts_only` / `combined` |
| duration_days | int NOT NULL | 30 / 60 / 90 / 180 / 365 |
| effective_date | date NOT NULL | Booking completion date |
| expiry_date | date NOT NULL | Computed: effective_date + duration_days |
| description | text | What work is covered |
| certificate_storage_path | text NULL | Provider-uploaded PDF |
| certificate_url | text NULL | Signed URL |
| status | text | `active` / `expired` / `voided` |
| created_at | timestamptz DEFAULT now() | |
| updated_at | timestamptz DEFAULT now() | |

### 5.13 `warranty_claims`

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| reference | text UNIQUE | `YW-WC-{YYYY}-{6-digit}` — DB generated |
| warranty_id | uuid FK → warranty_registrations ON DELETE RESTRICT | |
| owner_id | uuid FK → profiles | |
| provider_id | uuid FK → profiles | |
| description | text NOT NULL | What failed or was done incorrectly |
| status | text | `submitted` / `acknowledged` / `in_progress` / `resolved` / `disputed` / `escalated` / `closed` |
| provider_response | text NULL | Provider's acknowledgement note |
| resolution_description | text NULL | How it was resolved |
| escalated_at | timestamptz NULL | |
| escalated_reason | text NULL | |
| resolved_at | timestamptz NULL | |
| created_at | timestamptz DEFAULT now() | |
| updated_at | timestamptz DEFAULT now() | |

### 5.14 `agent_commissions`

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| agent_id | uuid FK → insurance_agents ON DELETE RESTRICT | |
| policy_id | uuid FK → insurance_policies | |
| commission_type | text | `new_business` / `renewal` |
| gross_premium_usd | numeric(10,2) | |
| commission_rate | numeric(5,4) | Snapshot at bind |
| commission_amount_usd | numeric(10,2) | |
| status | text | `pending` / `earned` / `paid` / `clawed_back` |
| earned_at | timestamptz NULL | When policy bound / renewed |
| paid_at | timestamptz NULL | When Stripe transfer executed |
| stripe_transfer_id | text NULL | |
| created_at | timestamptz DEFAULT now() | |

---

## 6. State Machines

### 6.1 Quote Lifecycle

```
DRAFT ──────────────────────────────────────────────────────► EXPIRED (30 days)
  │
  ▼
PENDING_REVIEW ──► DECLINED
  │
  ▼
QUOTED ──────────────────────────────────────────────────────► EXPIRED (30 days)
  │
  ▼
BOUND  (terminal — policy record created)
```

**Transitions:**

| From | To | Actor | Trigger |
|---|---|---|---|
| DRAFT | PENDING_REVIEW | System | Owner submits quote request; `instant_bind = false` |
| DRAFT | QUOTED | System | Owner submits quote request; `instant_bind = true` |
| PENDING_REVIEW | QUOTED | Insurer | Manual underwriter approval |
| PENDING_REVIEW | DECLINED | Insurer | Underwriter declines |
| QUOTED | BOUND | System | Owner pays; policy created |
| QUOTED / PENDING_REVIEW | EXPIRED | System | Nightly job after 30 days |

### 6.2 Policy Lifecycle

```
PENDING_BIND ──► ACTIVE ──► EXPIRING (30 days before expiry) ──► EXPIRED
                  │                                                  │
                  ▼                                                  ▼
              CANCELLED                                           LAPSED (15-day grace)
```

**Transitions:**

| From | To | Actor | Trigger |
|---|---|---|---|
| PENDING_BIND | ACTIVE | System | Insurer approves bind OR `instant_bind = true` + payment success |
| ACTIVE | EXPIRING | System | Nightly job; `expiry_date - today <= 30 days` |
| EXPIRING | ACTIVE | System | Renewal payment received |
| EXPIRING | EXPIRED | System | Expiry date passed; no renewal |
| EXPIRED | LAPSED | System | 15 days after expiry with no payment |
| ACTIVE / EXPIRING | CANCELLED | Owner / Insurer | Cancellation request |

### 6.3 Claim Lifecycle

```
DRAFT ──► SUBMITTED ──► UNDER_REVIEW ──► PENDING_ASSESSMENT ──► ASSESSMENT_COMPLETE
                                                                         │
                               ┌─────────────────────────────────────────┤
                               ▼                                         ▼
                        PENDING_APPROVAL                             REJECTED ──► APPEALED
                               │                                         │
                               ▼                                         ▼
                           APPROVED                                   CLOSED (appeal denied)
                               │
                   ┌───────────┴───────────┐
                   ▼                       ▼
          PAYMENT_PROCESSING           CLOSED (no payment — total loss already settled)
                   │
                   ▼
                 PAID ──► CLOSED
```

**Transitions:**

| From | To | Actor | Trigger |
|---|---|---|---|
| DRAFT | SUBMITTED | Owner | Owner submits FNOL form |
| SUBMITTED | UNDER_REVIEW | Insurer | Insurer acknowledges; assigns adjuster |
| UNDER_REVIEW | PENDING_ASSESSMENT | Adjuster | Adjuster begins formal assessment |
| PENDING_ASSESSMENT | ASSESSMENT_COMPLETE | Adjuster | Assessment submitted |
| ASSESSMENT_COMPLETE | PENDING_APPROVAL | System | Routes to senior insurer reviewer |
| PENDING_APPROVAL | APPROVED | Insurer | Insurer approves settlement |
| PENDING_APPROVAL | REJECTED | Insurer | Claim denied |
| APPROVED | PAYMENT_PROCESSING | System | Stripe transfer initiated |
| PAYMENT_PROCESSING | PAID | System | Stripe webhook confirms transfer |
| PAID | CLOSED | System | Automatic after 30-day dispute window |
| REJECTED | APPEALED | Owner | Owner submits appeal |
| APPEALED | CLOSED | Admin | Admin resolves appeal (upheld or overturned) |

### 6.4 Warranty Claim Lifecycle

```
SUBMITTED ──► ACKNOWLEDGED ──► IN_PROGRESS ──► RESOLVED ──► CLOSED
                   │                               │
                   ▼                               ▼
               DISPUTED ──────────────────────► ESCALATED ──► CLOSED (admin mediated)
```

---

## 7. API Endpoints

All endpoints are under `/api/v1/`. Authentication via Supabase JWT in `Authorization: Bearer` header.

### 7.1 Quotes

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/insurance/quotes` | owner / agent | Generate a new quote |
| GET | `/insurance/quotes` | owner / agent | List own quotes |
| GET | `/insurance/quotes/:id` | owner / agent / insurer | Get quote detail |
| PATCH | `/insurance/quotes/:id/bind` | owner / agent | Bind a quote (triggers payment) |
| GET | `/insurance/quotes/:id/pdf` | owner / agent | Download quote PDF |

**POST `/insurance/quotes` — Request:**
```json
{
  "product_id": "uuid",
  "boat_id": "uuid",
  "agreed_value_usd": 250000,
  "use_type": "pleasure",
  "territory": "us_east",
  "mooring_type": "marina_slip",
  "prior_claims_count": 0,
  "instalment_option": "annual"
}
```

**POST `/insurance/quotes` — Response:**
```json
{
  "id": "uuid",
  "reference": "YW-QT-2026-001234",
  "annual_premium_usd": 3750.00,
  "instalment_amount_usd": 3750.00,
  "deductible_usd": 5000.00,
  "status": "quoted",
  "expires_at": "2026-05-04T00:00:00Z",
  "quote_pdf_url": "https://..."
}
```

### 7.2 Policies

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/insurance/policies` | owner / agent / insurer | List policies (scoped by role) |
| GET | `/insurance/policies/:id` | owner / agent / insurer | Get policy detail |
| PATCH | `/insurance/policies/:id/cancel` | owner / insurer | Cancel a policy |
| POST | `/insurance/policies/:id/endorsements` | owner / insurer | Request endorsement |
| GET | `/insurance/policies/:id/coi` | owner / agent / insurer | Download COI |

### 7.3 Claims

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/insurance/claims` | owner | File FNOL |
| GET | `/insurance/claims` | owner / insurer / adjuster | List claims (scoped) |
| GET | `/insurance/claims/:id` | owner / insurer / adjuster | Get claim detail |
| POST | `/insurance/claims/:id/documents` | owner / adjuster | Upload document |
| PATCH | `/insurance/claims/:id/assign` | insurer | Assign adjuster |
| POST | `/insurance/claims/:id/assessment` | adjuster | Submit assessment |
| PATCH | `/insurance/claims/:id/approve` | insurer | Approve settlement |
| PATCH | `/insurance/claims/:id/reject` | insurer | Reject claim |
| POST | `/insurance/claims/:id/appeal` | owner | Appeal rejection |

### 7.4 Warranties

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/warranty/registrations` | provider | Register warranty on completed booking |
| GET | `/warranty/registrations` | owner / provider | List warranties (scoped) |
| GET | `/warranty/registrations/:id` | owner / provider | Get warranty detail |
| POST | `/warranty/claims` | owner | File warranty claim |
| GET | `/warranty/claims` | owner / provider | List warranty claims (scoped) |
| PATCH | `/warranty/claims/:id/acknowledge` | provider | Acknowledge claim |
| PATCH | `/warranty/claims/:id/resolve` | provider | Mark resolved |
| PATCH | `/warranty/claims/:id/dispute` | provider | Dispute claim |

### 7.5 Insurer Management

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/insurers` | public | Register insurer |
| GET | `/insurers/:id` | insurer / admin | Get insurer profile |
| PATCH | `/insurers/:id` | insurer | Update insurer profile |
| POST | `/insurers/:id/products` | insurer | Create product |
| PATCH | `/insurers/:id/products/:pid` | insurer | Update product |
| GET | `/insurers/:id/analytics` | insurer | Dashboard analytics |
| GET | `/insurers/:id/agents` | insurer | List associated agents |
| POST | `/insurers/:id/agents/invite` | insurer | Invite agent |

### 7.6 Agent Management

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/agents` | public | Register agent |
| GET | `/agents/me` | agent | Get own profile |
| PATCH | `/agents/me` | agent | Update own profile |
| GET | `/agents/me/commissions` | agent | List commission records |
| GET | `/agents/me/book` | agent | List book of business |

---

## 8. Pricing & Commission Model

### 8.1 Premium Calculation

Premiums are calculated by the quote engine at quote time and snapshotted on the policy.

**H&M Base Rate Calculation:**
```
annual_premium = max(
  agreed_value_usd × base_rate_pct,
  min_premium_usd
)
```

**Adjusting Factors (applied as multipliers — v1.0 keeps these simple):**

| Factor | Condition | Multiplier |
|---|---|---|
| Vessel age | > 20 years | × 1.20 |
| Vessel age | > 30 years | × 1.40 |
| Prior claims | 1 claim in 3 years | × 1.15 |
| Prior claims | 2+ claims in 3 years | × 1.35 |
| Use type | Charter | × 1.25 |
| Territory | Worldwide | × 1.30 |
| Mooring | At anchor (no marina) | × 1.10 |

**Instalment loading:**

| Option | Loading |
|---|---|
| Annual | 0% (base rate) |
| Semi-annual | +3% total (1.5% per payment) |
| Monthly | +8% total (0.67% per payment) |

### 8.2 Platform Fee on Premiums

Yachtworx charges the insurer a platform fee per policy bound.

| Volume Tier | Annual Policies Bound | Platform Fee |
|---|---|---|
| Starter | 0–99 | 12% of gross premium |
| Growth | 100–499 | 9% of gross premium |
| Enterprise | 500+ | 6% of gross premium (negotiated) |

Platform fee is deducted from each premium payment before routing the remainder to the insurer via Stripe Connect transfer.

### 8.3 Agent Commission

Agent commission is paid by the insurer (not the platform). It is deducted from the insurer's net payout.

| Tier | Rate Range | Notes |
|---|---|---|
| Standard | 5–8% | Default for new agents |
| Preferred | 9–12% | After 50+ bound policies |
| Elite | 13–15% | After 150+ bound policies (negotiated) |

Commission flow:
```
Owner pays premium
  → Stripe collects
  → Platform deducts platform fee
  → Insurer receives net premium
  → Insurer Stripe account routes commission Transfer to agent Stripe account
  → Commission record updated: EARNED → PAID
```

### 8.4 Claim Settlement Fee

A 2% platform fee applies on approved claim settlement amounts routed through the platform to repair providers.

### 8.5 Warranty Registration

No fee to provider in v1.0. May be monetised in v2.0 (e.g. warranty badge subscription).

---

## 9. Integration with Existing Modules

### 9.1 Module 1 — Boat Profile

| Integration Point | Usage |
|---|---|
| `boats.boat_type` | Filters eligible products by vessel type |
| `boats.length_overall` | Checks against product `min/max_vessel_loa_ft` |
| `boats.year` | Calculates vessel age for underwriting and premium multiplier |
| `boats.estimated_value` | Pre-fills `agreed_value_usd` in quote form |
| `boat_components` | Component warranties can reference specific components |
| `maintenance_documents` | Service history surfaced as supporting evidence in claims |

### 9.2 Module 2 — Bookings & Payments

| Integration Point | Usage |
|---|---|
| `bookings.status = COMPLETED` | Unlocks warranty registration for provider |
| `bookings.id` | Stored on `warranty_registrations.booking_id` |
| New booking created | When claim approved and repair assigned to platform provider; booking type = `insurance_repair` |
| Stripe PaymentIntent | Premium payments processed through same Stripe account; platform fee deducted via `application_fee_amount` |

### 9.3 Module 3 — Provider Trust

| Integration Point | Usage |
|---|---|
| `provider_trust_scores.score` | Insurers can filter recommended repair providers by trust score |
| `provider_documents` (COI) | Provider's own insurance COI surfaced to adjuster reviewing claims |
| Trust score penalty | Unresolved warranty claims reduce provider trust score (§4.6) |
| Warranty registrations | Count and average warranty claim resolution rate added as trust score component in v1.1 |

### 9.4 Module 5 — Marina Partnerships

| Integration Point | Usage |
|---|---|
| `marinas.city`, `marinas.state` | Marina's location pre-fills incident location on FNOL form for checked-in vessels |
| Marina partnership tier | Preferred / Exclusive marina partners may receive preferred status for insurance-authorised repair bookings |

---

## 10. Notifications & Communications

### 10.1 Owner Notifications

| Event | Channel | Template |
|---|---|---|
| Quote ready | Email + in-app | Quote summary + CTA to bind |
| Policy activated | Email + in-app | COI attached, policy details |
| Renewal reminder (90d) | Email | Early renewal incentive |
| Renewal reminder (30d) | Email + in-app | Premium amount, CTA |
| Renewal reminder (7d) | Email + in-app + push | Urgent renewal CTA |
| Policy lapsed | Email | How to reinstate |
| Claim submitted | Email + in-app | Reference number, next steps |
| Claim status change | Email + in-app | Status + detail |
| Claim approved | Email + in-app | Settlement amount, provider info |
| Claim rejected | Email + in-app | Reason + appeal instructions |
| Warranty registered | Email + in-app | Coverage details, expiry date |
| Warranty claim acknowledged | In-app | Provider response |
| Warranty claim resolved | Email + in-app | Resolution summary |

### 10.2 Insurer Notifications

| Event | Channel |
|---|---|
| New quote pending review | Email + dashboard alert |
| Policy bound (new or renewal) | Dashboard |
| New claim submitted | Email + dashboard |
| Claim appeal filed | Email + dashboard |
| Agent joined | Dashboard |
| KYB approved / rejected | Email |

### 10.3 Agent Notifications

| Event | Channel |
|---|---|
| Client quote bound | Email + in-app |
| Client renewal due (30d) | Email + in-app |
| Client claim filed | In-app |
| Commission earned | In-app |
| Commission paid | Email + in-app |
| Licence expiry warning (90d / 30d) | Email + in-app |

### 10.4 Provider Notifications

| Event | Channel |
|---|---|
| Warranty claim filed against their work | Email + in-app |
| 48-hour acknowledgement reminder | Email |
| Insurance-authorised repair booking created | Email + in-app |

---

## 11. Document Management

All documents stored in Supabase Storage under the following bucket structure:

```
insurance/
  insurers/{insurer_id}/kyb/{document_type}/{uuid}.pdf
  agents/{agent_id}/licence/{uuid}.pdf
  agents/{agent_id}/eo/{uuid}.pdf
  quotes/{quote_id}/quote-summary.pdf
  policies/{policy_id}/policy-document.pdf
  policies/{policy_id}/coi.pdf
  claims/{claim_id}/photos/{uuid}.jpg
  claims/{claim_id}/documents/{document_type}/{uuid}.pdf
  warranties/{warranty_id}/certificate.pdf
```

**Access control:**
- Owner: read own policy docs, quotes, COIs, claim docs they uploaded
- Insurer: read all docs for their policies and claims
- Adjuster: read and write claim docs for assigned claims
- Agent: read own clients' policy docs and COIs
- Admin: full read access
- Public: no access (all paths require signed URL)

**COI Generation:**
- Auto-generated as PDF on policy activation using a server-side template
- Includes: policy number, insured name, vessel name, insurer name, coverage type, effective/expiry dates, coverage limits, Yachtworx platform stamp
- Re-generated on endorsements that affect coverage terms

---

## 12. Security Requirements

### 12.1 Authentication & Authorisation

- All insurance endpoints require valid Supabase JWT
- Role claims checked server-side (RLS + server functions)
- Insurer staff (adjusters) access scoped via `insurer_id` FK, not full insurer admin
- Agent access scoped to their own clients (`agent_id = auth.uid()` on policies and quotes)
- Owners can only access their own policies, claims, and warranty registrations

### 12.2 RLS Policy Summary

| Table | Public | Owner | Provider | Agent | Insurer | Admin |
|---|---|---|---|---|---|---|
| insurers | read (active only) | — | — | read associated | full own | full |
| insurance_products | read (active) | — | — | read associated | full own | full |
| insurance_quotes | — | read own | — | read/write own clients | read own products' | full |
| insurance_policies | — | read own | — | read own clients | read/write own | full |
| insurance_claims | — | read/write own | read (repair provider) | read own clients | full own | full |
| claim_documents | — | read/write own | read assigned | — | full own | full |
| claim_assessments | — | read own | — | — | full own | full |
| warranty_registrations | read | read own | read/write own | — | — | full |
| warranty_claims | — | read/write own | read/write own | — | — | full |
| agent_commissions | — | — | — | read own | read own | full |

### 12.3 Payment Security

- No raw card data processed by Yachtworx (all via Stripe Elements / Payment Intents)
- Premium payments use `application_fee_amount` on PaymentIntent for atomic platform fee deduction
- Settlement transfers initiated only after claim status = APPROVED and insurer acknowledgement
- Stripe webhook signature verified on all incoming events

### 12.4 Data Privacy

- PII (owner name, email, claim descriptions) encrypted at rest via Supabase default encryption
- Claim photos and documents stored in private Supabase Storage (no public URLs)
- Signed URLs expire after 1 hour
- Audit log entry created for every claim status change (who changed, when, old/new status)

### 12.5 Fraud Prevention

- Claim fraud flags: >2 claims in 12 months, claim filed within 30 days of policy activation, estimated loss > 80% of agreed value — all trigger manual review flag
- Agent fraud flags: >5 policies bound in first 7 days, all policies for single owner — alert sent to insurer admin
- Rate limiting: quote generation max 10 per hour per user

---

## 13. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Quote generation latency | < 800ms p99 |
| COI PDF generation | < 3 seconds |
| Policy record read | < 200ms p95 |
| Claim document upload | Up to 25MB per file, max 20 files per claim |
| API availability | 99.9% uptime (aligned with Supabase SLA) |
| Stripe webhook processing | Idempotent; deduplicate by `stripe_event_id` |
| Nightly jobs | Quote expiry, policy expiry, warranty expiry, renewal reminders — all within 02:00–04:00 UTC window |
| Data retention | Closed claims and expired policies retained 7 years for regulatory compliance |

---

## 14. Future Extensibility

| Feature | Notes |
|---|---|
| Telematics integration | GPS voyage data used as underwriting input (AIS feed or onboard device) |
| Automated claims AI triage | LLM-assisted incident type classification and fraud scoring from FNOL text + photos |
| ACORD form generation | Standard ACORD 25 / ACORD 28 / ACORD 75 output for B2B integrations |
| Broker of record transfers | Allow owner to switch agents mid-term without policy disruption |
| Multi-currency | GBP / EUR support for Mediterranean and UK market expansion |
| Reinsurance ledger | Ceded premium tracking for excess-of-loss treaties |
| Warranty marketplace | Providers offer extended warranty products at a fee; platform takes commission |
| Trust score integration | Warranty claim resolution rate feeds into Module 3 trust score calculation (planned for v1.1) |
| Insurer API | REST webhook events pushed to insurer's own policy admin system |
| Mobile push notifications | React Native / Expo push for claim status updates and renewal alerts |

---

## 15. Open Questions

| # | Question | Owner | Priority |
|---|---|---|---|
| Q1 | Should agent licence verification be automated (via NIPR API for US agents) or remain manual in v1.0? | Product | High |
| Q2 | Does Yachtworx need its own surplus lines licence to facilitate binding, or does this responsibility sit entirely with the insurer? | Legal | Critical |
| Q3 | What is the COI template format — should it conform to ACORD 25 standard or a custom Yachtworx format? | Product / Legal | High |
| Q4 | Should the quote engine expose an adjustment multiplier UI to insurers (so they can tweak risk factors per product), or keep all adjusters hardcoded in v1.0? | Product | Medium |
| Q5 | Should claims filed against marina bookings (Module 5) auto-populate the incident location from the berth booking record? | Engineering | Low |
| Q6 | For instalment policies, does Yachtworx handle failed payment recovery (retry logic, dunning) or delegate entirely to Stripe Billing? | Engineering | High |
| Q7 | What is the platform's liability if a claim settlement transfer fails mid-flight (Stripe transfer error)? Does the platform need to hold a reserve? | Legal / Finance | Critical |
| Q8 | Are warranty registrations surfaced publicly on the provider's marketplace listing, or only visible to the specific owner who received the warranty? | Product | Medium |
| Q9 | Can an owner have multiple active policies on the same vessel (e.g. H&M from one insurer, P&I from another)? If so, how is coordination of benefits handled on claims? | Product / Legal | High |
| Q10 | Should the Insurance Agent role be a separate account, or a toggle/sub-role on an existing `owner` account (for owner-operators who are also licensed agents)? | Product | Medium |
