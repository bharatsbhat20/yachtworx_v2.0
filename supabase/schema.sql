-- =============================================================================
-- YachtWorx v2.0 — Supabase Schema
-- Module 1: Boat Owner Account & Boat Profile System
-- Run this in Supabase Dashboard → SQL Editor
-- =============================================================================

-- -------------------------------------------------------------------------
-- 0. Extensions
-- -------------------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- -------------------------------------------------------------------------
-- 1. profiles  (extends auth.users — one row per user)
-- -------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  first_name  text not null default '',
  last_name   text not null default '',
  email       text not null,
  role        text not null default 'owner' check (role in ('owner','provider','admin')),
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- 2. boats
-- -------------------------------------------------------------------------
create table if not exists public.boats (
  id                   uuid primary key default uuid_generate_v4(),
  owner_id             uuid not null references public.profiles(id) on delete cascade,
  name                 text not null,
  make                 text,
  model                text,
  year                 integer check (year > 1800 and year <= extract(year from now()) + 1),
  boat_type            text,
  length_overall       numeric(8,2),
  beam                 numeric(8,2),
  draft                numeric(8,2),
  hull_material        text,
  engine_type          text,
  fuel_type            text,
  displacement         numeric(10,2),
  home_port            text,
  hull_id              text,
  registration_number  text,
  estimated_value      numeric(14,2),
  photo_url            text,
  specs_source         text default 'manual' check (specs_source in ('cache','api','manual')),
  flag                 text,
  deleted_at           timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists boats_owner_id_idx on public.boats(owner_id);
create index if not exists boats_deleted_at_idx on public.boats(deleted_at) where deleted_at is null;

-- -------------------------------------------------------------------------
-- 3. boat_components
-- -------------------------------------------------------------------------
create table if not exists public.boat_components (
  id                    uuid primary key default uuid_generate_v4(),
  boat_id               uuid not null references public.boats(id) on delete cascade,
  name                  text not null,
  category              text not null default 'General',
  install_date          date,
  last_serviced_date    date,
  service_interval_days integer default 365 check (service_interval_days > 0),
  notes                 text,
  deleted_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists components_boat_id_idx on public.boat_components(boat_id);
create index if not exists components_deleted_at_idx on public.boat_components(deleted_at) where deleted_at is null;

-- -------------------------------------------------------------------------
-- 4. maintenance_documents
-- -------------------------------------------------------------------------
create table if not exists public.maintenance_documents (
  id               uuid primary key default uuid_generate_v4(),
  boat_id          uuid not null references public.boats(id) on delete cascade,
  component_id     uuid references public.boat_components(id) on delete set null,
  uploaded_by      uuid not null references public.profiles(id),
  file_name        text not null,
  file_url         text not null,   -- storage object path, NOT a signed URL
  file_size        integer not null check (file_size > 0),
  mime_type        text not null,
  service_type     text,
  service_date     date,
  service_provider text,
  notes            text,
  title            text,
  deleted_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists docs_boat_id_idx on public.maintenance_documents(boat_id);
create index if not exists docs_component_id_idx on public.maintenance_documents(component_id);
create index if not exists docs_deleted_at_idx on public.maintenance_documents(deleted_at) where deleted_at is null;

-- -------------------------------------------------------------------------
-- 5. boat_specs_cache  (shared across all users — speeds up AI autofill)
-- -------------------------------------------------------------------------
create table if not exists public.boat_specs_cache (
  id               uuid primary key default uuid_generate_v4(),
  cache_key        text not null unique,   -- "{make}|{model}|{year}" lowercased
  make             text not null,
  model            text not null,
  year             integer not null,
  length_overall   numeric(8,2),
  beam             numeric(8,2),
  draft            numeric(8,2),
  hull_material    text,
  engine_type      text,
  fuel_type        text,
  displacement     numeric(10,2),
  boat_type        text,
  hit              boolean not null default true,
  expires_at       timestamptz not null,
  created_at       timestamptz not null default now()
);

create index if not exists specs_cache_key_idx on public.boat_specs_cache(cache_key);
create index if not exists specs_cache_expires_idx on public.boat_specs_cache(expires_at);

-- -------------------------------------------------------------------------
-- 6. updated_at auto-trigger function
-- -------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create or replace trigger boats_updated_at
  before update on public.boats
  for each row execute procedure public.set_updated_at();

create or replace trigger components_updated_at
  before update on public.boat_components
  for each row execute procedure public.set_updated_at();

create or replace trigger documents_updated_at
  before update on public.maintenance_documents
  for each row execute procedure public.set_updated_at();

-- -------------------------------------------------------------------------
-- 7. handle_new_user — auto-create profile on signup
-- -------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, first_name, last_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'owner')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -------------------------------------------------------------------------
-- 8. Row Level Security
-- -------------------------------------------------------------------------

-- profiles: users can read/update their own row; admins see all
alter table public.profiles enable row level security;

create policy "profiles: own row read"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: own row update"
  on public.profiles for update
  using (auth.uid() = id);

-- boats: owners see only their non-deleted boats
alter table public.boats enable row level security;

create policy "boats: owner select"
  on public.boats for select
  using (owner_id = auth.uid() and deleted_at is null);

create policy "boats: owner insert"
  on public.boats for insert
  with check (owner_id = auth.uid());

create policy "boats: owner update"
  on public.boats for update
  using (owner_id = auth.uid());

create policy "boats: owner delete"
  on public.boats for delete
  using (owner_id = auth.uid());

-- boat_components: scoped through boat ownership
alter table public.boat_components enable row level security;

create policy "components: owner select"
  on public.boat_components for select
  using (
    exists (
      select 1 from public.boats b
      where b.id = boat_id and b.owner_id = auth.uid()
    )
    and deleted_at is null
  );

create policy "components: owner insert"
  on public.boat_components for insert
  with check (
    exists (
      select 1 from public.boats b
      where b.id = boat_id and b.owner_id = auth.uid()
    )
  );

create policy "components: owner update"
  on public.boat_components for update
  using (
    exists (
      select 1 from public.boats b
      where b.id = boat_id and b.owner_id = auth.uid()
    )
  );

create policy "components: owner delete"
  on public.boat_components for delete
  using (
    exists (
      select 1 from public.boats b
      where b.id = boat_id and b.owner_id = auth.uid()
    )
  );

-- maintenance_documents: scoped through boat ownership
alter table public.maintenance_documents enable row level security;

create policy "docs: owner select"
  on public.maintenance_documents for select
  using (
    exists (
      select 1 from public.boats b
      where b.id = boat_id and b.owner_id = auth.uid()
    )
    and deleted_at is null
  );

create policy "docs: owner insert"
  on public.maintenance_documents for insert
  with check (
    exists (
      select 1 from public.boats b
      where b.id = boat_id and b.owner_id = auth.uid()
    )
  );

create policy "docs: owner update"
  on public.maintenance_documents for update
  using (
    exists (
      select 1 from public.boats b
      where b.id = boat_id and b.owner_id = auth.uid()
    )
  );

create policy "docs: owner delete"
  on public.maintenance_documents for delete
  using (
    exists (
      select 1 from public.boats b
      where b.id = boat_id and b.owner_id = auth.uid()
    )
  );

-- boat_specs_cache: readable by any authenticated user; writable by authenticated users
alter table public.boat_specs_cache enable row level security;

create policy "specs_cache: authenticated read"
  on public.boat_specs_cache for select
  to authenticated
  using (true);

create policy "specs_cache: authenticated insert"
  on public.boat_specs_cache for insert
  to authenticated
  with check (true);

create policy "specs_cache: authenticated update"
  on public.boat_specs_cache for update
  to authenticated
  using (true);

-- -------------------------------------------------------------------------
-- 9. Storage bucket  (run AFTER enabling Storage extension in dashboard)
-- -------------------------------------------------------------------------
-- Create bucket via dashboard or run:
-- insert into storage.buckets (id, name, public) values ('documents', 'documents', false);

-- Storage RLS: path must be "{owner_id}/{boat_id}/{doc_id}/{filename}"
-- so foldername[1] = auth.uid()::text ensures isolation

create policy "storage: owner upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage: owner read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage: owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- MODULE 2: Booking, Scheduling & Payments System
-- =============================================================================

-- -------------------------------------------------------------------------
-- Add Stripe fields to profiles
-- -------------------------------------------------------------------------
alter table public.profiles
  add column if not exists stripe_account_id       text unique,
  add column if not exists stripe_account_status   text default 'pending',
  add column if not exists stripe_payouts_enabled  boolean default false,
  add column if not exists stripe_charges_enabled  boolean default false,
  add column if not exists booking_mode            text default 'request_to_book'
    check (booking_mode in ('request_to_book','instant_book'));

-- -------------------------------------------------------------------------
-- provider_services  (each provider's service catalog)
-- -------------------------------------------------------------------------
create table if not exists public.provider_services (
  id               uuid primary key default uuid_generate_v4(),
  provider_id      uuid not null references public.profiles(id) on delete cascade,
  name             text not null,
  category         text not null,
  description      text,
  price_type       text not null check (price_type in ('fixed','hourly','quote')),
  base_price       numeric(10,2),
  duration_minutes integer not null default 120 check (duration_minutes > 0),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists provider_services_provider_id_idx on public.provider_services(provider_id);
create index if not exists provider_services_category_idx on public.provider_services(category);

create or replace trigger provider_services_updated_at
  before update on public.provider_services
  for each row execute procedure public.set_updated_at();

-- -------------------------------------------------------------------------
-- provider_availability  (weekly schedule rules)
-- -------------------------------------------------------------------------
create table if not exists public.provider_availability (
  id                uuid primary key default uuid_generate_v4(),
  provider_id       uuid not null references public.profiles(id) on delete cascade,
  day_of_week       smallint not null check (day_of_week between 0 and 6),
  start_time        time not null,
  end_time          time not null,
  buffer_minutes    integer not null default 30,
  max_jobs_per_day  integer not null default 3,
  min_notice_hours  integer not null default 24,
  max_advance_days  integer not null default 90,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (provider_id, day_of_week)
);

create or replace trigger provider_availability_updated_at
  before update on public.provider_availability
  for each row execute procedure public.set_updated_at();

-- -------------------------------------------------------------------------
-- provider_blackouts  (individual blocked dates)
-- -------------------------------------------------------------------------
create table if not exists public.provider_blackouts (
  id            uuid primary key default uuid_generate_v4(),
  provider_id   uuid not null references public.profiles(id) on delete cascade,
  blackout_date date not null,
  reason        text,
  created_at    timestamptz not null default now(),
  unique (provider_id, blackout_date)
);

-- -------------------------------------------------------------------------
-- slot_holds  (10-minute reservation during payment flow)
-- -------------------------------------------------------------------------
create table if not exists public.slot_holds (
  id              uuid primary key default uuid_generate_v4(),
  provider_id     uuid not null references public.profiles(id),
  owner_id        uuid not null references public.profiles(id),
  service_id      uuid not null references public.provider_services(id),
  proposed_start  timestamptz not null,
  proposed_end    timestamptz not null,
  expires_at      timestamptz not null default (now() + interval '10 minutes'),
  created_at      timestamptz not null default now()
);

create index if not exists slot_holds_provider_id_idx on public.slot_holds(provider_id);
create index if not exists slot_holds_expires_at_idx on public.slot_holds(expires_at);

-- -------------------------------------------------------------------------
-- bookings
-- -------------------------------------------------------------------------
create sequence if not exists booking_reference_seq start 1000 increment 1;

create table if not exists public.bookings (
  id                      uuid primary key default uuid_generate_v4(),
  reference               text unique not null
    default 'YW-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('booking_reference_seq')::text, 6, '0'),
  owner_id                uuid not null references public.profiles(id),
  provider_id             uuid not null references public.profiles(id),
  boat_id                 uuid not null references public.boats(id),
  service_id              uuid not null references public.provider_services(id),
  service_type            text not null,
  service_name            text not null,
  location                text not null,
  location_type           text not null check (location_type in ('marina','address','onwater')),
  scheduled_start         timestamptz not null,
  scheduled_end           timestamptz not null,
  duration_minutes        integer not null,
  price_type              text not null,
  quoted_amount           numeric(10,2),
  final_amount            numeric(10,2),
  price_amount            numeric(10,2) not null,
  currency                char(3) not null default 'USD',
  platform_fee_percent    numeric(5,4) not null,
  platform_fee_amount     numeric(10,2) not null,
  provider_payout_amount  numeric(10,2) not null,
  status                  text not null default 'DRAFT',
  booking_mode            text not null default 'request_to_book',
  notes                   text,
  payment_intent_id       text,
  cancellation_reason     text,
  cancelled_by            text check (cancelled_by in ('owner','provider','admin','system')),
  cancelled_at            timestamptz,
  confirmed_at            timestamptz,
  started_at              timestamptz,
  completed_at            timestamptz,
  payout_released_at      timestamptz,
  rescheduled_from        uuid references public.bookings(id),
  deleted_at              timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists bookings_owner_id_idx on public.bookings(owner_id);
create index if not exists bookings_provider_id_idx on public.bookings(provider_id);
create index if not exists bookings_status_idx on public.bookings(status);
create index if not exists bookings_scheduled_start_idx on public.bookings(scheduled_start);
create index if not exists bookings_payment_intent_id_idx on public.bookings(payment_intent_id);

create or replace trigger bookings_updated_at
  before update on public.bookings
  for each row execute procedure public.set_updated_at();

-- -------------------------------------------------------------------------
-- payments
-- -------------------------------------------------------------------------
create table if not exists public.payments (
  id                           uuid primary key default uuid_generate_v4(),
  booking_id                   uuid not null references public.bookings(id),
  owner_id                     uuid not null references public.profiles(id),
  provider_id                  uuid not null references public.profiles(id),
  amount                       numeric(10,2) not null,
  currency                     char(3) not null default 'USD',
  platform_fee_percent         numeric(5,4) not null,
  platform_fee_amount          numeric(10,2) not null,
  provider_payout              numeric(10,2) not null,
  payment_status               text not null default 'pending',
  stripe_payment_intent_id     text unique,
  stripe_charge_id             text,
  stripe_transfer_id           text,
  stripe_refund_id             text,
  refund_amount                numeric(10,2),
  refunded_at                  timestamptz,
  payout_released_at           timestamptz,
  idempotency_key              text unique not null,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now()
);

create index if not exists payments_booking_id_idx on public.payments(booking_id);

create or replace trigger payments_updated_at
  before update on public.payments
  for each row execute procedure public.set_updated_at();

-- -------------------------------------------------------------------------
-- booking_status_log  (immutable audit trail)
-- -------------------------------------------------------------------------
create table if not exists public.booking_status_log (
  id              uuid primary key default uuid_generate_v4(),
  booking_id      uuid not null references public.bookings(id),
  from_status     text,
  to_status       text not null,
  changed_by      uuid references public.profiles(id),
  changed_by_role text,
  reason          text,
  metadata        jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists booking_status_log_booking_id_idx on public.booking_status_log(booking_id);

-- -------------------------------------------------------------------------
-- processed_webhooks  (Stripe webhook idempotency)
-- -------------------------------------------------------------------------
create table if not exists public.processed_webhooks (
  id              uuid primary key default uuid_generate_v4(),
  stripe_event_id text unique not null,
  event_type      text not null,
  processed_at    timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- reviews
-- -------------------------------------------------------------------------
create table if not exists public.reviews (
  id           uuid primary key default uuid_generate_v4(),
  booking_id   uuid not null unique references public.bookings(id),
  reviewer_id  uuid not null references public.profiles(id),
  provider_id  uuid not null references public.profiles(id),
  rating       smallint not null check (rating between 1 and 5),
  comment      text,
  created_at   timestamptz not null default now()
);

create index if not exists reviews_provider_id_idx on public.reviews(provider_id);

-- -------------------------------------------------------------------------
-- RLS Policies — Module 2
-- -------------------------------------------------------------------------

-- provider_services: public read; provider manages own
alter table public.provider_services enable row level security;

create policy "provider_services: public read"
  on public.provider_services for select using (is_active = true);

create policy "provider_services: provider insert"
  on public.provider_services for insert
  to authenticated
  with check (provider_id = auth.uid());

create policy "provider_services: provider update"
  on public.provider_services for update
  using (provider_id = auth.uid());

-- provider_availability: public read; provider manages own
alter table public.provider_availability enable row level security;

create policy "availability: public read"
  on public.provider_availability for select using (is_active = true);

create policy "availability: provider manage"
  on public.provider_availability for all
  to authenticated
  using (provider_id = auth.uid())
  with check (provider_id = auth.uid());

-- provider_blackouts: public read; provider manages own
alter table public.provider_blackouts enable row level security;

create policy "blackouts: public read"
  on public.provider_blackouts for select using (true);

create policy "blackouts: provider manage"
  on public.provider_blackouts for all
  to authenticated
  using (provider_id = auth.uid())
  with check (provider_id = auth.uid());

-- slot_holds: participants only
alter table public.slot_holds enable row level security;

create policy "slot_holds: participants"
  on public.slot_holds for select
  to authenticated
  using (owner_id = auth.uid() or provider_id = auth.uid());

create policy "slot_holds: owner insert"
  on public.slot_holds for insert
  to authenticated
  with check (owner_id = auth.uid());

-- bookings: owner and provider see their own; admin sees all
alter table public.bookings enable row level security;

create policy "bookings: participants select"
  on public.bookings for select
  using (owner_id = auth.uid() or provider_id = auth.uid());

create policy "bookings: owner insert"
  on public.bookings for insert
  with check (owner_id = auth.uid());

create policy "bookings: participants update"
  on public.bookings for update
  using (owner_id = auth.uid() or provider_id = auth.uid());

-- payments: participants only
alter table public.payments enable row level security;

create policy "payments: participants select"
  on public.payments for select
  using (owner_id = auth.uid() or provider_id = auth.uid());

-- booking_status_log: participants read-only
alter table public.booking_status_log enable row level security;

create policy "status_log: participants read"
  on public.booking_status_log for select
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.owner_id = auth.uid() or b.provider_id = auth.uid())
    )
  );

-- reviews: public read; reviewer insert own
alter table public.reviews enable row level security;

create policy "reviews: public read"
  on public.reviews for select using (true);

create policy "reviews: reviewer insert"
  on public.reviews for insert
  to authenticated
  with check (reviewer_id = auth.uid());

-- =========================================================================
-- MODULE 3: Provider Onboarding, Verification, Ratings & Trust System
-- =========================================================================

-- -------------------------------------------------------------------------
-- profiles — Module 3 provider columns
-- -------------------------------------------------------------------------
alter table public.profiles
  add column if not exists business_name              varchar(120),
  add column if not exists contact_name               varchar(120),
  add column if not exists phone                      varchar(20),
  add column if not exists ein                        varchar(20),
  add column if not exists address_line1              varchar(200),
  add column if not exists address_city               varchar(100),
  add column if not exists address_state              varchar(100),
  add column if not exists address_zip                varchar(20),
  add column if not exists address_country            varchar(2)    default 'US',
  add column if not exists latitude                   decimal(10,7),
  add column if not exists longitude                  decimal(10,7),
  add column if not exists bio                        text,
  add column if not exists years_in_business          int,
  add column if not exists emergency_availability     boolean       default false,
  add column if not exists profile_photo_url          text,
  add column if not exists logo_url                   text,
  add column if not exists service_categories         varchar[],
  add column if not exists verification_status        varchar(30)   default 'unverified'
    constraint chk_verification_status
    check (verification_status in (
      'unverified','email_verified','pending_review','approved','rejected','suspended'
    )),
  add column if not exists email_verified_at          timestamptz,
  add column if not exists terms_accepted_at          timestamptz,
  add column if not exists approved_at                timestamptz,
  add column if not exists rejected_at                timestamptz,
  add column if not exists suspended_at               timestamptz,
  add column if not exists rejection_reason           text,
  add column if not exists profile_complete           boolean       default false,
  add column if not exists is_featured                boolean       default false,
  add column if not exists featured_until             timestamptz,
  -- trust score
  add column if not exists trust_score                decimal(5,2)  default 50.0,
  add column if not exists trust_score_override       boolean       default false,
  add column if not exists trust_score_override_reason text,
  add column if not exists trust_score_updated_at     timestamptz,
  -- computed metrics (updated nightly)
  add column if not exists avg_rating                 decimal(3,2),
  add column if not exists review_count               int           default 0,
  add column if not exists total_jobs_completed       int           default 0,
  add column if not exists completion_rate            decimal(5,2),
  add column if not exists cancellation_rate          decimal(5,2),
  add column if not exists on_time_percent            decimal(5,2),
  add column if not exists avg_response_hours         decimal(6,2),
  -- stripe connect
  add column if not exists stripe_charges_enabled     boolean       default false,
  add column if not exists stripe_payouts_enabled     boolean       default false,
  add column if not exists stripe_onboarding_complete boolean       default false;

-- -------------------------------------------------------------------------
-- provider_service_areas
-- -------------------------------------------------------------------------
create table if not exists public.provider_service_areas (
  id            uuid primary key default uuid_generate_v4(),
  provider_id   uuid not null references public.profiles(id) on delete cascade,
  area_type     varchar(20) not null
    check (area_type in ('zip_code','marina','city','radius')),
  label         varchar(200) not null,
  zip_code      varchar(10),
  city          varchar(100),
  state         varchar(100),
  radius_km     decimal(6,2),
  latitude      decimal(10,7),
  longitude     decimal(10,7),
  is_active     boolean default true,
  created_at    timestamptz not null default now()
);

create index if not exists psa_provider_idx on public.provider_service_areas(provider_id);
create index if not exists psa_zip_idx       on public.provider_service_areas(zip_code);

-- -------------------------------------------------------------------------
-- provider_documents
-- -------------------------------------------------------------------------
create table if not exists public.provider_documents (
  id              uuid primary key default uuid_generate_v4(),
  provider_id     uuid not null references public.profiles(id) on delete cascade,
  document_type   varchar(30) not null
    check (document_type in (
      'business_license','insurance_coi','abyc_certification',
      'manufacturer_cert','other'
    )),
  document_label  varchar(200),
  file_url        text not null,
  file_name       varchar(255),
  file_size_bytes int,
  mime_type       varchar(100),
  expiration_date date,
  status          varchar(20) not null default 'pending'
    check (status in ('pending','approved','rejected')),
  rejection_reason text,
  reviewed_at     timestamptz,
  reviewed_by     uuid references public.profiles(id),
  is_active       boolean default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists pdoc_provider_idx on public.provider_documents(provider_id);
create index if not exists pdoc_status_idx   on public.provider_documents(status);
create index if not exists pdoc_expiry_idx   on public.provider_documents(expiration_date)
  where is_active = true;

-- -------------------------------------------------------------------------
-- provider_portfolio
-- -------------------------------------------------------------------------
create table if not exists public.provider_portfolio (
  id              uuid primary key default uuid_generate_v4(),
  provider_id     uuid not null references public.profiles(id) on delete cascade,
  media_url       text not null,
  thumbnail_url   text,
  caption         varchar(500),
  media_type      varchar(10) not null check (media_type in ('photo','video')),
  display_order   int default 0,
  is_active       boolean default true,
  created_at      timestamptz not null default now()
);

create index if not exists pp_provider_idx on public.provider_portfolio(provider_id);

-- -------------------------------------------------------------------------
-- reviews — Module 3 extra columns (extend Module 2 table)
-- -------------------------------------------------------------------------
alter table public.reviews
  add column if not exists reviewer_name         varchar(200),
  add column if not exists comm_rating           smallint check (comm_rating between 1 and 5),
  add column if not exists quality_rating        smallint check (quality_rating between 1 and 5),
  add column if not exists punctuality_rating    smallint check (punctuality_rating between 1 and 5),
  add column if not exists provider_response     text,
  add column if not exists provider_responded_at timestamptz,
  add column if not exists flagged               boolean default false,
  add column if not exists flagged_reason        text,
  add column if not exists is_visible            boolean default true;

-- -------------------------------------------------------------------------
-- trust_score_log
-- -------------------------------------------------------------------------
create table if not exists public.trust_score_log (
  id              uuid primary key default uuid_generate_v4(),
  provider_id     uuid not null references public.profiles(id) on delete cascade,
  score           decimal(5,2) not null,
  source          varchar(20) not null
    check (source in ('nightly_job','admin_override','initial')),
  admin_id        uuid references public.profiles(id),
  override_reason text,
  comp_rating     decimal(5,2),
  comp_completion decimal(5,2),
  comp_cancellation decimal(5,2),
  comp_insurance  decimal(5,2),
  comp_license    decimal(5,2),
  comp_response   decimal(5,2),
  computed_at     timestamptz not null default now()
);

create index if not exists tsl_provider_idx on public.trust_score_log(provider_id, computed_at desc);

-- -------------------------------------------------------------------------
-- admin_audit_log
-- -------------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id              uuid primary key default uuid_generate_v4(),
  admin_id        uuid not null references public.profiles(id),
  action_type     varchar(60) not null,
  target_type     varchar(60) not null,
  target_id       uuid not null,
  previous_value  jsonb,
  new_value       jsonb,
  reason          text,
  ip_address      inet,
  created_at      timestamptz not null default now()
);

create index if not exists aal_admin_idx  on public.admin_audit_log(admin_id, created_at desc);
create index if not exists aal_target_idx on public.admin_audit_log(target_type, target_id);

-- -------------------------------------------------------------------------
-- fraud_flags
-- -------------------------------------------------------------------------
create table if not exists public.fraud_flags (
  id              uuid primary key default uuid_generate_v4(),
  provider_id     uuid references public.profiles(id) on delete cascade,
  flag_type       varchar(60) not null,
  detail          jsonb,
  status          varchar(20) default 'open'
    check (status in ('open','reviewed','dismissed')),
  reviewed_by     uuid references public.profiles(id),
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists ff_provider_idx on public.fraud_flags(provider_id);
create index if not exists ff_status_idx   on public.fraud_flags(status);

-- -------------------------------------------------------------------------
-- notifications
-- -------------------------------------------------------------------------
create table if not exists public.notifications (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  type            varchar(60) not null,
  title           varchar(255) not null,
  body            text,
  link            text,
  is_read         boolean default false,
  created_at      timestamptz not null default now()
);

create index if not exists notif_user_idx on public.notifications(user_id, created_at desc);

-- -------------------------------------------------------------------------
-- updated_at triggers — Module 3
-- -------------------------------------------------------------------------
create trigger set_updated_at_provider_documents
  before update on public.provider_documents
  for each row execute procedure public.set_updated_at();

-- -------------------------------------------------------------------------
-- RLS Policies — Module 3
-- -------------------------------------------------------------------------

-- provider_service_areas
alter table public.provider_service_areas enable row level security;

create policy "psa: public read active"
  on public.provider_service_areas for select using (is_active = true);

create policy "psa: provider manage own"
  on public.provider_service_areas for all
  to authenticated
  using (provider_id = auth.uid())
  with check (provider_id = auth.uid());

-- provider_documents
alter table public.provider_documents enable row level security;

create policy "pdoc: provider read own"
  on public.provider_documents for select
  to authenticated
  using (provider_id = auth.uid());

create policy "pdoc: provider insert own"
  on public.provider_documents for insert
  to authenticated
  with check (provider_id = auth.uid());

create policy "pdoc: admin read all"
  on public.provider_documents for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('moderator','super_admin','admin')
    )
  );

create policy "pdoc: admin update status"
  on public.provider_documents for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('moderator','super_admin','admin')
    )
  );

-- provider_portfolio
alter table public.provider_portfolio enable row level security;

create policy "pp: public read active"
  on public.provider_portfolio for select using (is_active = true);

create policy "pp: provider manage own"
  on public.provider_portfolio for all
  to authenticated
  using (provider_id = auth.uid())
  with check (provider_id = auth.uid());

-- trust_score_log
alter table public.trust_score_log enable row level security;

create policy "tsl: provider read own"
  on public.trust_score_log for select
  to authenticated
  using (provider_id = auth.uid());

create policy "tsl: admin read all"
  on public.trust_score_log for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('moderator','super_admin','admin')
    )
  );

-- admin_audit_log
alter table public.admin_audit_log enable row level security;

create policy "aal: admin read"
  on public.admin_audit_log for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('moderator','super_admin','admin')
    )
  );

-- fraud_flags
alter table public.fraud_flags enable row level security;

create policy "ff: admin read all"
  on public.fraud_flags for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('moderator','super_admin','admin')
    )
  );

-- notifications
alter table public.notifications enable row level security;

create policy "notif: user read own"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "notif: user update own"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid());
