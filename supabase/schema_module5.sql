-- =============================================================================
-- YachtWorx v2.0 — Module 5: Marina Partnerships & Enterprise Dashboard
-- Run in Supabase Dashboard → SQL Editor (after Modules 1-4)
-- Prerequisites: set_updated_at() trigger function from Module 1
-- =============================================================================

-- ── Enable PostGIS for geospatial queries ─────────────────────────────────────
create extension if not exists postgis;

-- ── Update profiles role to include marina ────────────────────────────────────
-- If your profiles table has a role check constraint, run:
-- alter table public.profiles drop constraint if exists profiles_role_check;
-- alter table public.profiles add constraint profiles_role_check
--   check (role in ('owner','provider','admin','marina'));

-- =============================================================================
-- 1. marinas
-- =============================================================================

create table if not exists public.marinas (
  id                    uuid primary key default uuid_generate_v4(),
  owner_id              uuid not null references public.profiles(id) on delete cascade,
  name                  text not null,
  slug                  text not null unique,
  description           text,
  address               text not null,
  city                  text not null,
  state                 text not null,
  country               text not null default 'US',
  zip_code              text,
  latitude              numeric(10,7),
  longitude             numeric(10,7),
  location              geography(point, 4326),   -- PostGIS column for spatial queries
  phone                 text,
  email                 text,
  website               text,
  vhf_channel           text,
  total_berths          int not null default 0,
  available_berths      int not null default 0,
  max_vessel_length_ft  numeric(6,1) not null default 100,
  max_draft_ft          numeric(5,1) not null default 10,
  daily_rate_usd        numeric(8,2) not null default 0,
  weekly_rate_usd       numeric(8,2),
  monthly_rate_usd      numeric(8,2),
  amenities             text[] not null default '{}',
  photos                text[] not null default '{}',
  cover_photo           text,
  rating                numeric(3,2) not null default 0,
  review_count          int not null default 0,
  stripe_account_id     text,
  stripe_charges_enabled boolean not null default false,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists marinas_owner_id_idx  on public.marinas(owner_id);
create index if not exists marinas_is_active_idx on public.marinas(is_active);
create index if not exists marinas_city_idx      on public.marinas(city);
create index if not exists marinas_state_idx     on public.marinas(state);
create index if not exists marinas_location_idx  on public.marinas using gist(location);

create or replace trigger marinas_updated_at
  before update on public.marinas
  for each row execute procedure public.set_updated_at();

-- Function: auto-populate PostGIS location column from lat/lng
create or replace function public.sync_marina_location()
returns trigger language plpgsql as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.location := st_makepoint(new.longitude, new.latitude)::geography;
  end if;
  return new;
end;
$$;

create or replace trigger marinas_sync_location
  before insert or update of latitude, longitude on public.marinas
  for each row execute procedure public.sync_marina_location();

-- =============================================================================
-- 2. marina_berths
-- =============================================================================

create table if not exists public.marina_berths (
  id                  uuid primary key default uuid_generate_v4(),
  marina_id           uuid not null references public.marinas(id) on delete cascade,
  name                text not null,
  berth_type          text not null default 'slip'
    check (berth_type in ('slip','mooring','anchorage','dry_storage')),
  length_ft           numeric(6,1) not null,
  width_ft            numeric(6,1) not null default 0,
  max_draft_ft        numeric(5,1) not null,
  has_power           boolean not null default false,
  power_amps          int,
  has_water           boolean not null default false,
  has_fuel            boolean not null default false,
  daily_rate_usd      numeric(8,2) not null default 0,
  weekly_rate_usd     numeric(8,2),
  monthly_rate_usd    numeric(8,2),
  status              text not null default 'available'
    check (status in ('available','occupied','reserved','maintenance')),
  current_booking_id  uuid,              -- loose FK updated by booking lifecycle
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists berths_marina_id_idx on public.marina_berths(marina_id);
create index if not exists berths_status_idx    on public.marina_berths(status);

create or replace trigger marina_berths_updated_at
  before update on public.marina_berths
  for each row execute procedure public.set_updated_at();

-- =============================================================================
-- 3. marina_berth_bookings
-- =============================================================================

create table if not exists public.marina_berth_bookings (
  id                    uuid primary key default uuid_generate_v4(),
  reference             text unique not null,
  marina_id             uuid not null references public.marinas(id) on delete restrict,
  marina_name           text not null,
  berth_id              uuid not null references public.marina_berths(id) on delete restrict,
  berth_name            text not null,
  boat_id               uuid references public.boats(id) on delete set null,          -- nullable (walk-up)
  boat_name             text,
  owner_id              uuid references public.profiles(id) on delete set null,        -- nullable (walk-up)
  owner_name            text,
  booking_source        varchar(20) not null default 'online'
    check (booking_source in ('online','walk_up','phone')),
  guest_name            text,          -- walk-up / phone bookings
  guest_email           text,
  guest_phone           text,
  check_in_date         date not null,
  check_out_date        date not null,
  nights                int not null,
  rate_snapshot_usd     numeric(8,2) not null,
  total_amount_usd      numeric(10,2) not null,
  platform_fee_amount   numeric(10,2) not null default 0,
  marina_payout_amount  numeric(10,2) not null default 0,
  status                varchar(30) not null default 'PENDING'
    check (status in ('PENDING','CONFIRMED','CHECKED_IN','CHECKED_OUT','CANCELLED','NO_SHOW')),
  special_requests      text,
  payment_intent_id     text,
  marina_transfer_id    text,          -- Stripe secondary transfer for commissions
  actual_check_in_at    timestamptz,
  actual_check_out_at   timestamptz,
  assigned_by           uuid references public.profiles(id) on delete set null,
  cancelled_at          timestamptz,
  cancellation_reason   text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  check (check_out_date > check_in_date)
);

create index if not exists mbb_marina_id_idx    on public.marina_berth_bookings(marina_id);
create index if not exists mbb_berth_id_idx     on public.marina_berth_bookings(berth_id);
create index if not exists mbb_owner_id_idx     on public.marina_berth_bookings(owner_id);
create index if not exists mbb_boat_id_idx      on public.marina_berth_bookings(boat_id);
create index if not exists mbb_status_idx       on public.marina_berth_bookings(status);
create index if not exists mbb_check_in_idx     on public.marina_berth_bookings(check_in_date);
create index if not exists mbb_check_out_idx    on public.marina_berth_bookings(check_out_date);

create or replace trigger marina_berth_bookings_updated_at
  before update on public.marina_berth_bookings
  for each row execute procedure public.set_updated_at();

-- Sequence for booking reference numbers
create sequence if not exists marina_booking_seq start 1;

create or replace function public.generate_marina_booking_ref()
returns trigger language plpgsql as $$
begin
  if new.reference is null or new.reference = '' then
    new.reference := 'YW-MARINA-' || to_char(now(), 'YYYY') || '-' ||
                     lpad(nextval('marina_booking_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

create or replace trigger marina_booking_ref_trigger
  before insert on public.marina_berth_bookings
  for each row execute procedure public.generate_marina_booking_ref();

-- =============================================================================
-- 4. marina_staff
-- =============================================================================

create table if not exists public.marina_staff (
  id          uuid primary key default uuid_generate_v4(),
  marina_id   uuid not null references public.marinas(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  user_name   text,
  user_email  text,
  staff_role  varchar(30) not null
    check (staff_role in ('owner','manager','harbormaster','dock_attendant')),
  invited_by  uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),

  constraint marina_staff_unique unique (marina_id, user_id)
);

create index if not exists marina_staff_marina_id_idx on public.marina_staff(marina_id);
create index if not exists marina_staff_user_id_idx   on public.marina_staff(user_id);

-- =============================================================================
-- 5. marina_provider_partnerships
-- =============================================================================

create table if not exists public.marina_provider_partnerships (
  id                    uuid primary key default uuid_generate_v4(),
  marina_id             uuid not null references public.marinas(id) on delete cascade,
  marina_name           text,
  provider_id           uuid not null references public.profiles(id) on delete cascade,
  provider_name         text,
  provider_business_name text,
  tier                  text not null default 'standard'
    check (tier in ('standard','preferred','exclusive')),
  status                text not null default 'pending'
    check (status in ('pending','approved','active','rejected','suspended','terminated')),
  commission_rate       numeric(5,4) not null default 0,
  service_categories    text[] not null default '{}',
  notes                 text,
  approved_at           timestamptz,
  approved_by           uuid references public.profiles(id) on delete set null,
  rejection_reason      text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint mpp_unique_pair unique (marina_id, provider_id)
);

create index if not exists mpp_marina_id_idx    on public.marina_provider_partnerships(marina_id);
create index if not exists mpp_provider_id_idx  on public.marina_provider_partnerships(provider_id);
create index if not exists mpp_status_idx       on public.marina_provider_partnerships(status);

create or replace trigger marina_provider_partnerships_updated_at
  before update on public.marina_provider_partnerships
  for each row execute procedure public.set_updated_at();

-- =============================================================================
-- 6. marina_reviews
-- =============================================================================

create table if not exists public.marina_reviews (
  id                    uuid primary key default uuid_generate_v4(),
  marina_id             uuid not null references public.marinas(id) on delete cascade,
  reviewer_id           uuid not null references public.profiles(id) on delete cascade,
  reviewer_name         text,
  berth_booking_id      uuid references public.marina_berth_bookings(id) on delete set null,
  overall_rating        numeric(3,2) not null check (overall_rating between 1 and 5),
  berth_quality_rating  numeric(3,2) not null check (berth_quality_rating between 1 and 5),
  amenities_rating      numeric(3,2) not null check (amenities_rating between 1 and 5),
  staff_rating          numeric(3,2) not null check (staff_rating between 1 and 5),
  value_rating          numeric(3,2) not null check (value_rating between 1 and 5),
  comment               text,
  owner_reply           text,
  created_at            timestamptz not null default now(),

  constraint marina_reviews_unique unique (marina_id, reviewer_id, berth_booking_id)
);

create index if not exists marina_reviews_marina_id_idx   on public.marina_reviews(marina_id);
create index if not exists marina_reviews_reviewer_id_idx on public.marina_reviews(reviewer_id);

-- =============================================================================
-- 7. marina_photos
-- =============================================================================

create table if not exists public.marina_photos (
  id            uuid primary key default uuid_generate_v4(),
  marina_id     uuid not null references public.marinas(id) on delete cascade,
  storage_path  text not null,
  public_url    text,
  caption       varchar(300),
  display_order int not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists marina_photos_marina_id_idx on public.marina_photos(marina_id);

-- =============================================================================
-- 8. Utility: update available_berths count after booking changes
-- =============================================================================

create or replace function public.refresh_marina_available_berths()
returns trigger language plpgsql security definer as $$
begin
  update public.marinas m
  set available_berths = (
    select count(*) from public.marina_berths b
    where b.marina_id = m.id and b.status = 'available'
  )
  where m.id = coalesce(new.marina_id, old.marina_id);
  return coalesce(new, old);
end;
$$;

create or replace trigger marina_berths_refresh_count
  after insert or update or delete on public.marina_berths
  for each row execute procedure public.refresh_marina_available_berths();

-- =============================================================================
-- 9. Utility: exclusive tier conflict check
-- =============================================================================

create or replace function public.check_exclusive_partnership_conflict()
returns trigger language plpgsql as $$
declare
  conflict_count int;
begin
  -- Only check when applying for exclusive tier
  if new.tier = 'exclusive' and new.status in ('pending','active') then
    select count(*) into conflict_count
    from public.marina_provider_partnerships
    where marina_id = new.marina_id
      and tier = 'exclusive'
      and status = 'active'
      and provider_id != new.provider_id
      and service_categories && new.service_categories;  -- PostgreSQL array overlap

    if conflict_count > 0 then
      raise exception 'exclusive_conflict: Another provider already holds exclusive status for overlapping categories at this marina.';
    end if;
  end if;
  return new;
end;
$$;

create or replace trigger check_exclusive_conflict
  before insert or update on public.marina_provider_partnerships
  for each row execute procedure public.check_exclusive_partnership_conflict();

-- =============================================================================
-- 10. Marina Analytics View (pre-computed for Enterprise Dashboard)
-- =============================================================================

create or replace view public.marina_analytics_view as
select
  m.id as marina_id,
  m.name as marina_name,
  m.available_berths,
  m.total_berths,
  round((m.total_berths - m.available_berths)::numeric / nullif(m.total_berths, 0) * 100, 1) as occupancy_pct,
  m.rating,
  m.review_count,
  coalesce((
    select sum(b.total_amount_usd)
    from public.marina_berth_bookings b
    where b.marina_id = m.id
      and b.status in ('CHECKED_IN','CHECKED_OUT','CONFIRMED')
      and b.check_in_date >= date_trunc('month', now())
  ), 0) as monthly_revenue_usd,
  coalesce((
    select count(*)
    from public.marina_berth_bookings b
    where b.marina_id = m.id
      and b.status in ('CHECKED_IN','CONFIRMED')
  ), 0) as active_bookings,
  coalesce((
    select count(*)
    from public.marina_provider_partnerships p
    where p.marina_id = m.id and p.status = 'active'
  ), 0) as active_partners
from public.marinas m
where m.is_active = true;

-- =============================================================================
-- 11. Row Level Security — marinas
-- =============================================================================

alter table public.marinas enable row level security;

-- Anyone can read active marinas (discovery)
drop policy if exists "marinas: public read" on public.marinas;
create policy "marinas: public read"
  on public.marinas for select
  using (is_active = true);

-- Marina owners: full CRUD on their own marinas
drop policy if exists "marinas: owner manage" on public.marinas;
create policy "marinas: owner manage"
  on public.marinas for all
  to authenticated
  using  (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- =============================================================================
-- 12. Row Level Security — marina_berths
-- =============================================================================

alter table public.marina_berths enable row level security;

-- Anyone can read berths (for discovery / booking)
drop policy if exists "marina_berths: public read" on public.marina_berths;
create policy "marina_berths: public read"
  on public.marina_berths for select
  using (true);

-- Marina owner / staff: manage berths at their marina
drop policy if exists "marina_berths: staff manage" on public.marina_berths;
create policy "marina_berths: staff manage"
  on public.marina_berths for all
  to authenticated
  using (
    exists (
      select 1 from public.marina_staff s
      join public.marinas m on m.id = s.marina_id
      where s.marina_id = marina_berths.marina_id
        and s.user_id = auth.uid()
        and s.is_active = true
    )
    or
    exists (
      select 1 from public.marinas m
      where m.id = marina_berths.marina_id and m.owner_id = auth.uid()
    )
  );

-- =============================================================================
-- 13. Row Level Security — marina_berth_bookings
-- =============================================================================

alter table public.marina_berth_bookings enable row level security;

-- Boat owners: read/create their own bookings
drop policy if exists "mbb: owner read own" on public.marina_berth_bookings;
create policy "mbb: owner read own"
  on public.marina_berth_bookings for select
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "mbb: owner insert" on public.marina_berth_bookings;
create policy "mbb: owner insert"
  on public.marina_berth_bookings for insert
  to authenticated
  with check (owner_id = auth.uid() or owner_id is null);

-- Marina staff: full access to bookings at their marina
drop policy if exists "mbb: staff manage" on public.marina_berth_bookings;
create policy "mbb: staff manage"
  on public.marina_berth_bookings for all
  to authenticated
  using (
    exists (
      select 1 from public.marina_staff s
      where s.marina_id = marina_berth_bookings.marina_id
        and s.user_id = auth.uid()
        and s.is_active = true
    )
    or
    exists (
      select 1 from public.marinas m
      where m.id = marina_berth_bookings.marina_id and m.owner_id = auth.uid()
    )
  );

-- =============================================================================
-- 14. Row Level Security — marina_staff
-- =============================================================================

alter table public.marina_staff enable row level security;

-- Staff member: read their own record
drop policy if exists "marina_staff: read own" on public.marina_staff;
create policy "marina_staff: read own"
  on public.marina_staff for select
  to authenticated
  using (user_id = auth.uid());

-- Marina owner: manage all staff at their marina
drop policy if exists "marina_staff: owner manage" on public.marina_staff;
create policy "marina_staff: owner manage"
  on public.marina_staff for all
  to authenticated
  using (
    exists (
      select 1 from public.marinas m
      where m.id = marina_staff.marina_id and m.owner_id = auth.uid()
    )
  );

-- =============================================================================
-- 15. Row Level Security — marina_provider_partnerships
-- =============================================================================

alter table public.marina_provider_partnerships enable row level security;

-- Anyone can read active partnerships (for marina profile page)
drop policy if exists "mpp: public read active" on public.marina_provider_partnerships;
create policy "mpp: public read active"
  on public.marina_provider_partnerships for select
  using (status = 'active');

-- Providers: read and create their own partnership applications
drop policy if exists "mpp: provider manage own" on public.marina_provider_partnerships;
create policy "mpp: provider manage own"
  on public.marina_provider_partnerships for all
  to authenticated
  using (provider_id = auth.uid())
  with check (provider_id = auth.uid());

-- Marina owners: manage all partnerships at their marinas
drop policy if exists "mpp: marina owner manage" on public.marina_provider_partnerships;
create policy "mpp: marina owner manage"
  on public.marina_provider_partnerships for all
  to authenticated
  using (
    exists (
      select 1 from public.marinas m
      where m.id = marina_provider_partnerships.marina_id
        and m.owner_id = auth.uid()
    )
  );

-- =============================================================================
-- 16. Row Level Security — marina_reviews
-- =============================================================================

alter table public.marina_reviews enable row level security;

-- Anyone can read reviews
drop policy if exists "marina_reviews: public read" on public.marina_reviews;
create policy "marina_reviews: public read"
  on public.marina_reviews for select
  using (true);

-- Authenticated users: write their own reviews
drop policy if exists "marina_reviews: reviewer write" on public.marina_reviews;
create policy "marina_reviews: reviewer write"
  on public.marina_reviews for all
  to authenticated
  using (reviewer_id = auth.uid())
  with check (reviewer_id = auth.uid());

-- Marina owner: update owner_reply on their marina's reviews
drop policy if exists "marina_reviews: owner reply" on public.marina_reviews;
create policy "marina_reviews: owner reply"
  on public.marina_reviews for update
  to authenticated
  using (
    exists (
      select 1 from public.marinas m
      where m.id = marina_reviews.marina_id and m.owner_id = auth.uid()
    )
  );

-- =============================================================================
-- 17. Row Level Security — marina_photos
-- =============================================================================

alter table public.marina_photos enable row level security;

drop policy if exists "marina_photos: public read" on public.marina_photos;
create policy "marina_photos: public read"
  on public.marina_photos for select
  using (is_active = true);

drop policy if exists "marina_photos: owner manage" on public.marina_photos;
create policy "marina_photos: owner manage"
  on public.marina_photos for all
  to authenticated
  using (
    exists (
      select 1 from public.marinas m
      where m.id = marina_photos.marina_id and m.owner_id = auth.uid()
    )
  );

-- =============================================================================
-- 18. Walk-up booking read policy
-- Walk-up bookings have owner_id IS NULL so the standard "mbb: owner read own"
-- policy cannot match them.  Allow anyone who supplies the exact reference to
-- read their booking (phone/walk-up guest receipt lookup).
-- =============================================================================

drop policy if exists "mbb: walk-up reference read" on public.marina_berth_bookings;
create policy "mbb: walk-up reference read"
  on public.marina_berth_bookings for select
  using (booking_source in ('walk_up', 'phone') and owner_id is null);

-- =============================================================================
-- 19. Admin full-access policies for all Module 5 tables
-- Admins (role in ('moderator','super_admin','admin')) can perform any
-- operation on any marina table for support and auditing purposes.
-- =============================================================================

-- marinas
drop policy if exists "marinas: admin all" on public.marinas;
create policy "marinas: admin all"
  on public.marinas for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('moderator', 'super_admin', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('moderator', 'super_admin', 'admin')
    )
  );

-- marina_berths
drop policy if exists "marina_berths: admin all" on public.marina_berths;
create policy "marina_berths: admin all"
  on public.marina_berths for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('moderator', 'super_admin', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('moderator', 'super_admin', 'admin')
    )
  );

-- marina_berth_bookings
drop policy if exists "mbb: admin all" on public.marina_berth_bookings;
create policy "mbb: admin all"
  on public.marina_berth_bookings for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('moderator', 'super_admin', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('moderator', 'super_admin', 'admin')
    )
  );

-- marina_staff
drop policy if exists "marina_staff: admin all" on public.marina_staff;
create policy "marina_staff: admin all"
  on public.marina_staff for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('moderator', 'super_admin', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('moderator', 'super_admin', 'admin')
    )
  );

-- marina_provider_partnerships
drop policy if exists "mpp: admin all" on public.marina_provider_partnerships;
create policy "mpp: admin all"
  on public.marina_provider_partnerships for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('moderator', 'super_admin', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('moderator', 'super_admin', 'admin')
    )
  );

-- marina_reviews
drop policy if exists "marina_reviews: admin all" on public.marina_reviews;
create policy "marina_reviews: admin all"
  on public.marina_reviews for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('moderator', 'super_admin', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('moderator', 'super_admin', 'admin')
    )
  );

-- marina_photos
drop policy if exists "marina_photos: admin all" on public.marina_photos;
create policy "marina_photos: admin all"
  on public.marina_photos for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('moderator', 'super_admin', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('moderator', 'super_admin', 'admin')
    )
  );

-- =============================================================================
-- End of Module 5 Schema
-- Nightly maintenance:
--   select public.expire_job_opportunities();    -- from Module 4
--   select public.expire_match_cache();          -- from Module 4
-- =============================================================================
