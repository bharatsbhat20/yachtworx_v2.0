-- =============================================================================
-- YachtWorx v2.0 — Part 1: Tables, Triggers & RLS
-- Run this FIRST in Supabase Dashboard → SQL Editor
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
  file_url         text not null,
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
-- 5. boat_specs_cache
-- -------------------------------------------------------------------------
create table if not exists public.boat_specs_cache (
  id               uuid primary key default uuid_generate_v4(),
  cache_key        text not null unique,
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
-- 6. updated_at trigger
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
-- 7. Auto-create profile on signup
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -------------------------------------------------------------------------
-- 8. Row Level Security
-- -------------------------------------------------------------------------

-- profiles
alter table public.profiles enable row level security;

drop policy if exists "profiles: own row read" on public.profiles;
create policy "profiles: own row read"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles: own row update" on public.profiles;
create policy "profiles: own row update"
  on public.profiles for update
  using (auth.uid() = id);

-- boats
alter table public.boats enable row level security;

drop policy if exists "boats: owner select" on public.boats;
create policy "boats: owner select"
  on public.boats for select
  using (owner_id = auth.uid() and deleted_at is null);

drop policy if exists "boats: owner insert" on public.boats;
create policy "boats: owner insert"
  on public.boats for insert
  with check (owner_id = auth.uid());

drop policy if exists "boats: owner update" on public.boats;
create policy "boats: owner update"
  on public.boats for update
  using (owner_id = auth.uid());

drop policy if exists "boats: owner delete" on public.boats;
create policy "boats: owner delete"
  on public.boats for delete
  using (owner_id = auth.uid());

-- boat_components
alter table public.boat_components enable row level security;

drop policy if exists "components: owner select" on public.boat_components;
create policy "components: owner select"
  on public.boat_components for select
  using (
    exists (select 1 from public.boats b where b.id = boat_id and b.owner_id = auth.uid())
    and deleted_at is null
  );

drop policy if exists "components: owner insert" on public.boat_components;
create policy "components: owner insert"
  on public.boat_components for insert
  with check (
    exists (select 1 from public.boats b where b.id = boat_id and b.owner_id = auth.uid())
  );

drop policy if exists "components: owner update" on public.boat_components;
create policy "components: owner update"
  on public.boat_components for update
  using (
    exists (select 1 from public.boats b where b.id = boat_id and b.owner_id = auth.uid())
  );

drop policy if exists "components: owner delete" on public.boat_components;
create policy "components: owner delete"
  on public.boat_components for delete
  using (
    exists (select 1 from public.boats b where b.id = boat_id and b.owner_id = auth.uid())
  );

-- maintenance_documents
alter table public.maintenance_documents enable row level security;

drop policy if exists "docs: owner select" on public.maintenance_documents;
create policy "docs: owner select"
  on public.maintenance_documents for select
  using (
    exists (select 1 from public.boats b where b.id = boat_id and b.owner_id = auth.uid())
    and deleted_at is null
  );

drop policy if exists "docs: owner insert" on public.maintenance_documents;
create policy "docs: owner insert"
  on public.maintenance_documents for insert
  with check (
    exists (select 1 from public.boats b where b.id = boat_id and b.owner_id = auth.uid())
  );

drop policy if exists "docs: owner update" on public.maintenance_documents;
create policy "docs: owner update"
  on public.maintenance_documents for update
  using (
    exists (select 1 from public.boats b where b.id = boat_id and b.owner_id = auth.uid())
  );

drop policy if exists "docs: owner delete" on public.maintenance_documents;
create policy "docs: owner delete"
  on public.maintenance_documents for delete
  using (
    exists (select 1 from public.boats b where b.id = boat_id and b.owner_id = auth.uid())
  );

-- boat_specs_cache (shared — any authenticated user can read/write)
alter table public.boat_specs_cache enable row level security;

drop policy if exists "specs_cache: authenticated read" on public.boat_specs_cache;
create policy "specs_cache: authenticated read"
  on public.boat_specs_cache for select
  to authenticated
  using (true);

drop policy if exists "specs_cache: authenticated insert" on public.boat_specs_cache;
create policy "specs_cache: authenticated insert"
  on public.boat_specs_cache for insert
  to authenticated
  with check (true);

drop policy if exists "specs_cache: authenticated update" on public.boat_specs_cache;
create policy "specs_cache: authenticated update"
  on public.boat_specs_cache for update
  to authenticated
  using (true);
