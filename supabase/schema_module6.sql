-- =============================================================================
-- YachtWorx v2.0 — Module 6: Insurance & Warranty Layer
-- Run in Supabase Dashboard → SQL Editor (after Modules 1-5)
-- Prerequisites: set_updated_at() trigger function from Module 1
--                uuid_generate_v4() extension
-- =============================================================================

-- ── Update profiles role to include insurer and agent ─────────────────────────
-- alter table public.profiles drop constraint if exists profiles_role_check;
-- alter table public.profiles add constraint profiles_role_check
--   check (role in ('owner','provider','admin','marina','insurer','agent'));

-- =============================================================================
-- Sequences for reference numbers
-- =============================================================================

create sequence if not exists insurance_quote_seq    start 1;
create sequence if not exists insurance_policy_seq   start 1;
create sequence if not exists insurance_claim_seq    start 1;
create sequence if not exists warranty_reg_seq       start 1;
create sequence if not exists warranty_claim_seq     start 1;

-- =============================================================================
-- 1. insurers
-- =============================================================================

create table if not exists public.insurers (
  id                      uuid primary key default uuid_generate_v4(),
  owner_user_id           uuid not null references public.profiles(id) on delete restrict,
  legal_name              text not null,
  trading_name            text,
  company_number          text,
  country                 text not null default 'US',
  am_best_rating          text,
  primary_contact_name    text,
  primary_contact_email   text,
  phone                   text,
  website                 text,
  kyb_status              text not null default 'pending'
                            check (kyb_status in ('pending','approved','rejected','suspended')),
  kyb_reviewed_at         timestamptz,
  kyb_reviewed_by         uuid references public.profiles(id) on delete set null,
  stripe_account_id       text,
  stripe_charges_enabled  boolean not null default false,
  stripe_payouts_enabled  boolean not null default false,
  is_active               boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists insurers_owner_idx on public.insurers(owner_user_id);
create trigger set_insurers_updated_at before update on public.insurers
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 2. insurer_documents
-- =============================================================================

create table if not exists public.insurer_documents (
  id             uuid primary key default uuid_generate_v4(),
  insurer_id     uuid not null references public.insurers(id) on delete cascade,
  document_type  text not null
                   check (document_type in ('certificate_of_authority','surplus_lines_licence','eo_certificate','other')),
  storage_path   text not null,
  public_url     text,
  verified       boolean not null default false,
  expires_at     date,
  uploaded_at    timestamptz not null default now()
);

create index if not exists insdoc_insurer_idx on public.insurer_documents(insurer_id);

-- =============================================================================
-- 3. insurance_agents
-- =============================================================================

create table if not exists public.insurance_agents (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null unique references public.profiles(id) on delete cascade,
  licence_number        text not null,
  licence_state         text,
  licence_expiry        date,
  licence_status        text not null default 'pending'
                          check (licence_status in ('pending','active','expired','suspended')),
  eo_storage_path       text,
  eo_expiry             date,
  stripe_account_id     text,
  stripe_payouts_enabled boolean not null default false,
  is_active             boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger set_agents_updated_at before update on public.insurance_agents
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 4. agent_insurer_associations
-- =============================================================================

create table if not exists public.agent_insurer_associations (
  id               uuid primary key default uuid_generate_v4(),
  agent_id         uuid not null references public.insurance_agents(id) on delete cascade,
  insurer_id       uuid not null references public.insurers(id) on delete cascade,
  commission_tier  text not null default 'standard'
                     check (commission_tier in ('standard','preferred','elite')),
  commission_rate  numeric(5,4) not null default 0.07,
  status           text not null default 'invited'
                     check (status in ('invited','active','suspended','terminated')),
  invited_at       timestamptz not null default now(),
  activated_at     timestamptz,
  created_at       timestamptz not null default now(),
  unique (agent_id, insurer_id)
);

create index if not exists aia_agent_idx   on public.agent_insurer_associations(agent_id);
create index if not exists aia_insurer_idx on public.agent_insurer_associations(insurer_id);

-- =============================================================================
-- 5. insurance_products
-- =============================================================================

create table if not exists public.insurance_products (
  id                   uuid primary key default uuid_generate_v4(),
  insurer_id           uuid not null references public.insurers(id) on delete cascade,
  product_type         text not null
                         check (product_type in ('hull_and_machinery','protection_and_indemnity',
                                                 'crew_personal_accident','charter_liability','extended_warranty')),
  name                 text not null,
  description          text,
  coverage_summary     text[] not null default '{}',
  exclusions_summary   text[] not null default '{}',
  min_vessel_loa_ft    numeric(6,1),
  max_vessel_loa_ft    numeric(6,1),
  max_vessel_age_years int,
  allowed_use_types    text[] not null default '{}',
  allowed_territories  text[] not null default '{}',
  base_rate_pct        numeric(6,5),
  base_rate_per_foot   numeric(8,2),
  min_premium_usd      numeric(10,2) not null default 500,
  deductible_pct       numeric(5,4),
  deductible_fixed_usd numeric(10,2),
  instalment_options   text[] not null default '{annual}',
  instant_bind         boolean not null default false,
  cancellation_policy  text,
  status               text not null default 'draft'
                         check (status in ('draft','active','paused','archived')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (base_rate_pct is not null or base_rate_per_foot is not null)
);

create index if not exists insprod_insurer_idx on public.insurance_products(insurer_id);
create index if not exists insprod_type_idx    on public.insurance_products(product_type, status);
create trigger set_insprod_updated_at before update on public.insurance_products
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 6. insurance_quotes
-- =============================================================================

create table if not exists public.insurance_quotes (
  id                   uuid primary key default uuid_generate_v4(),
  reference            text unique,
  owner_id             uuid not null references public.profiles(id) on delete restrict,
  agent_id             uuid references public.insurance_agents(id) on delete set null,
  product_id           uuid not null references public.insurance_products(id) on delete restrict,
  boat_id              uuid not null references public.boats(id) on delete restrict,
  agreed_value_usd     numeric(12,2) not null,
  use_type             text not null
                         check (use_type in ('pleasure','charter','racing','commercial')),
  territory            text not null
                         check (territory in ('us_east','us_west','gulf','caribbean','mediterranean','worldwide')),
  mooring_type         text not null
                         check (mooring_type in ('marina_slip','mooring_ball','at_anchor','dry_storage')),
  prior_claims_count   int not null default 0,
  annual_premium_usd   numeric(10,2),
  instalment_option    text not null default 'annual'
                         check (instalment_option in ('annual','semi_annual','monthly')),
  instalment_amount_usd numeric(10,2),
  deductible_usd       numeric(10,2),
  status               text not null default 'draft'
                         check (status in ('draft','pending_review','quoted','declined','bound','expired')),
  expires_at           timestamptz not null default (now() + interval '30 days'),
  quote_pdf_url        text,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists insquote_owner_idx on public.insurance_quotes(owner_id, status);
create index if not exists insquote_agent_idx on public.insurance_quotes(agent_id);
create trigger set_insquote_updated_at before update on public.insurance_quotes
  for each row execute function public.set_updated_at();

-- Auto-generate reference on insert
create or replace function public.generate_insurance_quote_ref()
returns trigger language plpgsql as $$
begin
  if new.reference is null then
    new.reference := 'YW-QT-' || to_char(now(), 'YYYY') || '-' ||
                     lpad(nextval('insurance_quote_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;
drop trigger if exists trg_insurance_quote_ref on public.insurance_quotes;
create trigger trg_insurance_quote_ref
  before insert on public.insurance_quotes
  for each row execute function public.generate_insurance_quote_ref();

-- =============================================================================
-- 7. insurance_policies
-- =============================================================================

create table if not exists public.insurance_policies (
  id                      uuid primary key default uuid_generate_v4(),
  policy_number           text unique not null,
  quote_id                uuid references public.insurance_quotes(id) on delete set null,
  owner_id                uuid not null references public.profiles(id) on delete restrict,
  agent_id                uuid references public.insurance_agents(id) on delete set null,
  insurer_id              uuid not null references public.insurers(id) on delete restrict,
  product_id              uuid not null references public.insurance_products(id) on delete restrict,
  boat_id                 uuid not null references public.boats(id) on delete restrict,
  agreed_value_usd        numeric(12,2) not null,
  annual_premium_usd      numeric(10,2) not null,
  instalment_option       text not null default 'annual'
                            check (instalment_option in ('annual','semi_annual','monthly')),
  instalment_amount_usd   numeric(10,2) not null,
  deductible_usd          numeric(10,2) not null,
  effective_date          date not null,
  expiry_date             date not null,
  territory               text not null,
  use_type                text not null,
  mooring_type            text not null,
  status                  text not null default 'pending_bind'
                            check (status in ('pending_bind','active','expiring','expired','lapsed','cancelled')),
  stripe_subscription_id  text,
  stripe_payment_intent_id text,
  auto_renew              boolean not null default false,
  cancellation_date       date,
  cancellation_reason     text,
  coi_storage_path        text,
  coi_url                 text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists inspol_owner_idx   on public.insurance_policies(owner_id, status);
create index if not exists inspol_insurer_idx on public.insurance_policies(insurer_id, status);
create index if not exists inspol_agent_idx   on public.insurance_policies(agent_id);
create index if not exists inspol_expiry_idx  on public.insurance_policies(expiry_date) where status in ('active','expiring');
create trigger set_inspol_updated_at before update on public.insurance_policies
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 8. policy_endorsements
-- =============================================================================

create table if not exists public.policy_endorsements (
  id                     uuid primary key default uuid_generate_v4(),
  policy_id              uuid not null references public.insurance_policies(id) on delete cascade,
  endorsement_type       text not null
                           check (endorsement_type in ('vessel_name_change','territory_extension',
                                                       'agreed_value_change','use_type_change','other')),
  description            text,
  effective_date         date not null,
  premium_adjustment_usd numeric(10,2) not null default 0,
  requested_by           uuid not null references public.profiles(id),
  approved_by            uuid references public.profiles(id) on delete set null,
  status                 text not null default 'pending'
                           check (status in ('pending','approved','rejected')),
  created_at             timestamptz not null default now()
);

create index if not exists polend_policy_idx on public.policy_endorsements(policy_id);

-- =============================================================================
-- 9. insurance_claims
-- =============================================================================

create table if not exists public.insurance_claims (
  id                      uuid primary key default uuid_generate_v4(),
  reference               text unique not null,
  policy_id               uuid not null references public.insurance_policies(id) on delete restrict,
  owner_id                uuid not null references public.profiles(id),
  insurer_id              uuid not null references public.insurers(id),
  adjuster_id             uuid references public.profiles(id) on delete set null,
  incident_date           date not null,
  incident_time           time,
  incident_latitude       numeric(10,7),
  incident_longitude      numeric(10,7),
  incident_location_name  text,
  incident_type           text not null
                            check (incident_type in ('collision','weather','theft','fire','sinking','machinery','other')),
  description             text not null,
  estimated_loss_usd      numeric(12,2) not null,
  status                  text not null default 'submitted'
                            check (status in ('draft','submitted','under_review','pending_assessment',
                                              'assessment_complete','pending_approval','approved',
                                              'payment_processing','paid','rejected','appealed','closed')),
  approved_amount_usd     numeric(12,2),
  platform_fee_usd        numeric(10,2),
  provider_payout_usd     numeric(12,2),
  repair_provider_id      uuid references public.profiles(id) on delete set null,
  repair_booking_id       uuid references public.bookings(id) on delete set null,
  stripe_transfer_id      text,
  fraud_flag              boolean not null default false,
  appeal_reason           text,
  closed_at               timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists insclaim_owner_idx    on public.insurance_claims(owner_id, status);
create index if not exists insclaim_insurer_idx  on public.insurance_claims(insurer_id, status);
create index if not exists insclaim_adjuster_idx on public.insurance_claims(adjuster_id);
create trigger set_insclaim_updated_at before update on public.insurance_claims
  for each row execute function public.set_updated_at();

-- Auto-generate claim reference
create or replace function public.generate_insurance_claim_ref()
returns trigger language plpgsql as $$
begin
  if new.reference is null or new.reference = '' then
    new.reference := 'YW-CLM-' || to_char(now(), 'YYYY') || '-' ||
                     lpad(nextval('insurance_claim_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;
drop trigger if exists trg_insurance_claim_ref on public.insurance_claims;
create trigger trg_insurance_claim_ref
  before insert on public.insurance_claims
  for each row execute function public.generate_insurance_claim_ref();

-- =============================================================================
-- 10. claim_documents
-- =============================================================================

create table if not exists public.claim_documents (
  id                      uuid primary key default uuid_generate_v4(),
  claim_id                uuid not null references public.insurance_claims(id) on delete cascade,
  uploaded_by             uuid not null references public.profiles(id),
  document_type           text not null
                            check (document_type in ('photo','estimate','invoice','police_report','survey_report','other')),
  storage_path            text not null,
  public_url              text,
  description             text,
  requested_by_adjuster   boolean not null default false,
  created_at              timestamptz not null default now()
);

create index if not exists claimdoc_claim_idx on public.claim_documents(claim_id);

-- =============================================================================
-- 11. claim_assessments
-- =============================================================================

create table if not exists public.claim_assessments (
  id                       uuid primary key default uuid_generate_v4(),
  claim_id                 uuid not null unique references public.insurance_claims(id) on delete cascade,
  adjuster_id              uuid not null references public.profiles(id),
  coverage_decision        text not null
                             check (coverage_decision in ('fully_covered','partially_covered','not_covered')),
  decision_reason          text,
  approved_amount_usd      numeric(12,2) not null,
  recommended_provider_id  uuid references public.profiles(id) on delete set null,
  assessment_notes         text,
  submitted_at             timestamptz,
  reviewed_by              uuid references public.profiles(id) on delete set null,
  reviewed_at              timestamptz
);

create index if not exists claimassess_claim_idx on public.claim_assessments(claim_id);

-- =============================================================================
-- 12. warranty_registrations
-- =============================================================================

create table if not exists public.warranty_registrations (
  id                      uuid primary key default uuid_generate_v4(),
  reference               text unique,
  booking_id              uuid not null references public.bookings(id) on delete restrict,
  provider_id             uuid not null references public.profiles(id),
  owner_id                uuid not null references public.profiles(id),
  boat_id                 uuid not null references public.boats(id),
  warranty_type           text not null
                            check (warranty_type in ('labour_only','parts_only','combined')),
  duration_days           int not null check (duration_days in (30,60,90,180,365)),
  effective_date          date not null,
  expiry_date             date not null,
  description             text,
  certificate_storage_path text,
  certificate_url         text,
  status                  text not null default 'active'
                            check (status in ('active','expired','voided')),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists warrantreg_owner_idx    on public.warranty_registrations(owner_id, status);
create index if not exists warrantreg_provider_idx on public.warranty_registrations(provider_id);
create index if not exists warrantreg_expiry_idx   on public.warranty_registrations(expiry_date) where status = 'active';
create trigger set_warrantreg_updated_at before update on public.warranty_registrations
  for each row execute function public.set_updated_at();

-- Auto-generate warranty reference
create or replace function public.generate_warranty_reg_ref()
returns trigger language plpgsql as $$
begin
  if new.reference is null then
    new.reference := 'YW-WR-' || to_char(now(), 'YYYY') || '-' ||
                     lpad(nextval('warranty_reg_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;
drop trigger if exists trg_warranty_reg_ref on public.warranty_registrations;
create trigger trg_warranty_reg_ref
  before insert on public.warranty_registrations
  for each row execute function public.generate_warranty_reg_ref();

-- Nightly expiry job: mark expired warranties
create or replace function public.expire_warranty_registrations()
returns void language plpgsql as $$
begin
  update public.warranty_registrations
  set    status     = 'expired',
         updated_at = now()
  where  status     = 'active'
    and  expiry_date < current_date;
end;
$$;

-- =============================================================================
-- 13. warranty_claims
-- =============================================================================

create table if not exists public.warranty_claims (
  id                    uuid primary key default uuid_generate_v4(),
  reference             text unique,
  warranty_id           uuid not null references public.warranty_registrations(id) on delete restrict,
  owner_id              uuid not null references public.profiles(id),
  provider_id           uuid not null references public.profiles(id),
  description           text not null,
  status                text not null default 'submitted'
                          check (status in ('submitted','acknowledged','in_progress','resolved',
                                           'disputed','escalated','closed')),
  provider_response     text,
  resolution_description text,
  escalated_at          timestamptz,
  escalated_reason      text,
  resolved_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists warrantclaim_owner_idx    on public.warranty_claims(owner_id, status);
create index if not exists warrantclaim_provider_idx on public.warranty_claims(provider_id, status);
create trigger set_warrantclaim_updated_at before update on public.warranty_claims
  for each row execute function public.set_updated_at();

-- Auto-generate warranty claim reference
create or replace function public.generate_warranty_claim_ref()
returns trigger language plpgsql as $$
begin
  if new.reference is null then
    new.reference := 'YW-WC-' || to_char(now(), 'YYYY') || '-' ||
                     lpad(nextval('warranty_claim_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;
drop trigger if exists trg_warranty_claim_ref on public.warranty_claims;
create trigger trg_warranty_claim_ref
  before insert on public.warranty_claims
  for each row execute function public.generate_warranty_claim_ref();

-- =============================================================================
-- 14. agent_commissions
-- =============================================================================

create table if not exists public.agent_commissions (
  id                     uuid primary key default uuid_generate_v4(),
  agent_id               uuid not null references public.insurance_agents(id) on delete restrict,
  policy_id              uuid not null references public.insurance_policies(id) on delete restrict,
  commission_type        text not null check (commission_type in ('new_business','renewal')),
  gross_premium_usd      numeric(10,2) not null,
  commission_rate        numeric(5,4) not null,
  commission_amount_usd  numeric(10,2) not null,
  status                 text not null default 'pending'
                           check (status in ('pending','earned','paid','clawed_back')),
  earned_at              timestamptz,
  paid_at                timestamptz,
  stripe_transfer_id     text,
  created_at             timestamptz not null default now()
);

create index if not exists agentcomm_agent_idx   on public.agent_commissions(agent_id, status);
create index if not exists agentcomm_policy_idx  on public.agent_commissions(policy_id);

-- =============================================================================
-- 15. Nightly jobs: expire quotes and policies
-- =============================================================================

create or replace function public.expire_insurance_quotes()
returns void language plpgsql as $$
begin
  update public.insurance_quotes
  set    status     = 'expired',
         updated_at = now()
  where  status     in ('draft','quoted','pending_review')
    and  expires_at  < now();
end;
$$;

create or replace function public.expire_insurance_policies()
returns void language plpgsql as $$
begin
  -- Move active → expiring (within 30 days)
  update public.insurance_policies
  set    status     = 'expiring',
         updated_at = now()
  where  status     = 'active'
    and  expiry_date <= (current_date + interval '30 days')
    and  expiry_date >  current_date;

  -- Move expiring/active → expired
  update public.insurance_policies
  set    status     = 'expired',
         updated_at = now()
  where  status     in ('active','expiring')
    and  expiry_date <= current_date;

  -- Move expired → lapsed (15-day grace period)
  update public.insurance_policies
  set    status     = 'lapsed',
         updated_at = now()
  where  status     = 'expired'
    and  expiry_date <= (current_date - interval '15 days');
end;
$$;

-- =============================================================================
-- 16. Row Level Security
-- =============================================================================

-- ── insurers ─────────────────────────────────────────────────────────────────

alter table public.insurers enable row level security;

drop policy if exists "insurers: public read active" on public.insurers;
create policy "insurers: public read active"
  on public.insurers for select
  using (is_active = true);

drop policy if exists "insurers: owner manage" on public.insurers;
create policy "insurers: owner manage"
  on public.insurers for all
  to authenticated
  using  (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

drop policy if exists "insurers: admin all" on public.insurers;
create policy "insurers: admin all"
  on public.insurers for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','moderator','super_admin')))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','moderator','super_admin')));

-- ── insurance_products ────────────────────────────────────────────────────────

alter table public.insurance_products enable row level security;

drop policy if exists "insprod: public read active" on public.insurance_products;
create policy "insprod: public read active"
  on public.insurance_products for select
  using (status = 'active');

drop policy if exists "insprod: insurer manage" on public.insurance_products;
create policy "insprod: insurer manage"
  on public.insurance_products for all
  to authenticated
  using (exists (select 1 from public.insurers i where i.id = insurance_products.insurer_id and i.owner_user_id = auth.uid()))
  with check (exists (select 1 from public.insurers i where i.id = insurance_products.insurer_id and i.owner_user_id = auth.uid()));

drop policy if exists "insprod: admin all" on public.insurance_products;
create policy "insprod: admin all"
  on public.insurance_products for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','moderator','super_admin')));

-- ── insurance_quotes ──────────────────────────────────────────────────────────

alter table public.insurance_quotes enable row level security;

drop policy if exists "insquote: owner read own" on public.insurance_quotes;
create policy "insquote: owner read own"
  on public.insurance_quotes for select
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "insquote: owner insert" on public.insurance_quotes;
create policy "insquote: owner insert"
  on public.insurance_quotes for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "insquote: agent manage own" on public.insurance_quotes;
create policy "insquote: agent manage own"
  on public.insurance_quotes for all
  to authenticated
  using (exists (select 1 from public.insurance_agents a where a.user_id = auth.uid() and a.id = insurance_quotes.agent_id))
  with check (exists (select 1 from public.insurance_agents a where a.user_id = auth.uid() and a.id = insurance_quotes.agent_id));

drop policy if exists "insquote: insurer read" on public.insurance_quotes;
create policy "insquote: insurer read"
  on public.insurance_quotes for select
  to authenticated
  using (exists (select 1 from public.insurance_products p join public.insurers i on i.id = p.insurer_id
                 where p.id = insurance_quotes.product_id and i.owner_user_id = auth.uid()));

drop policy if exists "insquote: admin all" on public.insurance_quotes;
create policy "insquote: admin all"
  on public.insurance_quotes for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','moderator','super_admin')));

-- ── insurance_policies ────────────────────────────────────────────────────────

alter table public.insurance_policies enable row level security;

drop policy if exists "inspol: owner read own" on public.insurance_policies;
create policy "inspol: owner read own"
  on public.insurance_policies for select
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "inspol: insurer manage own" on public.insurance_policies;
create policy "inspol: insurer manage own"
  on public.insurance_policies for all
  to authenticated
  using (exists (select 1 from public.insurers i where i.id = insurance_policies.insurer_id and i.owner_user_id = auth.uid()))
  with check (exists (select 1 from public.insurers i where i.id = insurance_policies.insurer_id and i.owner_user_id = auth.uid()));

drop policy if exists "inspol: agent read own clients" on public.insurance_policies;
create policy "inspol: agent read own clients"
  on public.insurance_policies for select
  to authenticated
  using (exists (select 1 from public.insurance_agents a where a.user_id = auth.uid() and a.id = insurance_policies.agent_id));

drop policy if exists "inspol: admin all" on public.insurance_policies;
create policy "inspol: admin all"
  on public.insurance_policies for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','moderator','super_admin')));

-- ── insurance_claims ──────────────────────────────────────────────────────────

alter table public.insurance_claims enable row level security;

drop policy if exists "insclaim: owner manage own" on public.insurance_claims;
create policy "insclaim: owner manage own"
  on public.insurance_claims for all
  to authenticated
  using  (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "insclaim: insurer manage own" on public.insurance_claims;
create policy "insclaim: insurer manage own"
  on public.insurance_claims for all
  to authenticated
  using (exists (select 1 from public.insurers i where i.id = insurance_claims.insurer_id and i.owner_user_id = auth.uid()));

drop policy if exists "insclaim: adjuster manage assigned" on public.insurance_claims;
create policy "insclaim: adjuster manage assigned"
  on public.insurance_claims for all
  to authenticated
  using (adjuster_id = auth.uid());

drop policy if exists "insclaim: admin all" on public.insurance_claims;
create policy "insclaim: admin all"
  on public.insurance_claims for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','moderator','super_admin')));

-- ── claim_documents ───────────────────────────────────────────────────────────

alter table public.claim_documents enable row level security;

drop policy if exists "claimdoc: participant manage" on public.claim_documents;
create policy "claimdoc: participant manage"
  on public.claim_documents for all
  to authenticated
  using (
    exists (
      select 1 from public.insurance_claims c
      where c.id = claim_documents.claim_id
        and (c.owner_id = auth.uid() or c.adjuster_id = auth.uid()
             or exists (select 1 from public.insurers i where i.id = c.insurer_id and i.owner_user_id = auth.uid()))
    )
  );

-- ── claim_assessments ─────────────────────────────────────────────────────────

alter table public.claim_assessments enable row level security;

drop policy if exists "claimassess: participant read" on public.claim_assessments;
create policy "claimassess: participant read"
  on public.claim_assessments for select
  to authenticated
  using (
    exists (
      select 1 from public.insurance_claims c
      where c.id = claim_assessments.claim_id
        and (c.owner_id = auth.uid() or c.adjuster_id = auth.uid()
             or exists (select 1 from public.insurers i where i.id = c.insurer_id and i.owner_user_id = auth.uid()))
    )
  );

drop policy if exists "claimassess: adjuster write" on public.claim_assessments;
create policy "claimassess: adjuster write"
  on public.claim_assessments for insert
  to authenticated
  with check (adjuster_id = auth.uid());

-- ── warranty_registrations ────────────────────────────────────────────────────

alter table public.warranty_registrations enable row level security;

drop policy if exists "warrantreg: public read" on public.warranty_registrations;
create policy "warrantreg: public read"
  on public.warranty_registrations for select
  using (true);

drop policy if exists "warrantreg: provider manage own" on public.warranty_registrations;
create policy "warrantreg: provider manage own"
  on public.warranty_registrations for all
  to authenticated
  using  (provider_id = auth.uid())
  with check (provider_id = auth.uid());

drop policy if exists "warrantreg: admin all" on public.warranty_registrations;
create policy "warrantreg: admin all"
  on public.warranty_registrations for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','moderator','super_admin')));

-- ── warranty_claims ───────────────────────────────────────────────────────────

alter table public.warranty_claims enable row level security;

drop policy if exists "warrantclaim: owner manage own" on public.warranty_claims;
create policy "warrantclaim: owner manage own"
  on public.warranty_claims for all
  to authenticated
  using  (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "warrantclaim: provider manage own" on public.warranty_claims;
create policy "warrantclaim: provider manage own"
  on public.warranty_claims for all
  to authenticated
  using (provider_id = auth.uid());

drop policy if exists "warrantclaim: admin all" on public.warranty_claims;
create policy "warrantclaim: admin all"
  on public.warranty_claims for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','moderator','super_admin')));

-- ── agent_commissions ─────────────────────────────────────────────────────────

alter table public.agent_commissions enable row level security;

drop policy if exists "agentcomm: agent read own" on public.agent_commissions;
create policy "agentcomm: agent read own"
  on public.agent_commissions for select
  to authenticated
  using (exists (select 1 from public.insurance_agents a where a.id = agent_commissions.agent_id and a.user_id = auth.uid()));

drop policy if exists "agentcomm: insurer read own" on public.agent_commissions;
create policy "agentcomm: insurer read own"
  on public.agent_commissions for select
  to authenticated
  using (exists (
    select 1 from public.insurance_policies p
    join public.insurers i on i.id = p.insurer_id
    where p.id = agent_commissions.policy_id
      and i.owner_user_id = auth.uid()
  ));

drop policy if exists "agentcomm: admin all" on public.agent_commissions;
create policy "agentcomm: admin all"
  on public.agent_commissions for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','moderator','super_admin')));

-- =============================================================================
-- End of Module 6 Schema
-- Nightly maintenance:
--   select public.expire_insurance_quotes();
--   select public.expire_insurance_policies();
--   select public.expire_warranty_registrations();
-- =============================================================================
