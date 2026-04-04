-- =============================================================================
-- YachtWorx v2.0 — Module 4: Smart Matching Engine
-- Run in Supabase Dashboard → SQL Editor (after Modules 1-3)
-- =============================================================================

-- -------------------------------------------------------------------------
-- 1. job_opportunities
--    Published boat needs visible to approved providers.
--    Auto-upserted when an owner runs the matching engine.
--    Unique on (boat_id, component_name, service_category) so that
--    re-computing the same need updates the existing row rather than
--    creating a duplicate.
-- -------------------------------------------------------------------------
create table if not exists public.job_opportunities (
  id               uuid primary key default uuid_generate_v4(),
  boat_id          uuid not null references public.boats(id) on delete cascade,
  boat_name        text not null,
  boat_type        text,
  boat_length      numeric(8,2),
  home_port        text,
  owner_id         uuid not null references public.profiles(id) on delete cascade,
  component_id     uuid references public.boat_components(id) on delete set null,
  component_name   text not null,
  service_category text not null,
  urgency_level    text not null
    check (urgency_level in ('critical','high','medium','low','proactive')),
  need_label       text not null,
  estimated_budget numeric(10,2),
  preferred_dates  text[],
  status           text not null default 'open'
    check (status in ('open','in_review','matched','expired')),
  posted_at        timestamptz not null default now(),
  expires_at       timestamptz not null default (now() + interval '30 days'),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- Prevent duplicate opportunities for the same boat need
  constraint jo_unique_need unique (boat_id, component_name, service_category)
);

create index if not exists jo_owner_id_idx   on public.job_opportunities(owner_id);
create index if not exists jo_boat_id_idx    on public.job_opportunities(boat_id);
create index if not exists jo_status_idx     on public.job_opportunities(status);
create index if not exists jo_urgency_idx    on public.job_opportunities(urgency_level);
create index if not exists jo_expires_at_idx on public.job_opportunities(expires_at);

create or replace trigger job_opportunities_updated_at
  before update on public.job_opportunities
  for each row execute procedure public.set_updated_at();

-- -------------------------------------------------------------------------
-- 2. provider_job_interests
--    A provider expresses interest in an open opportunity.
--    Unique on (opportunity_id, provider_id) — one interest per pair.
-- -------------------------------------------------------------------------
create table if not exists public.provider_job_interests (
  id              uuid primary key default uuid_generate_v4(),
  opportunity_id  uuid not null references public.job_opportunities(id) on delete cascade,
  provider_id     uuid not null references public.profiles(id) on delete cascade,
  match_score     numeric(5,2) not null,
  match_band      text not null check (match_band in ('best','great','good','fair')),
  status          text not null default 'pending'
    check (status in ('pending','accepted','rejected')),
  message         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint pji_unique_interest unique (opportunity_id, provider_id)
);

create index if not exists pji_opportunity_id_idx on public.provider_job_interests(opportunity_id);
create index if not exists pji_provider_id_idx    on public.provider_job_interests(provider_id);
create index if not exists pji_status_idx         on public.provider_job_interests(status);

create or replace trigger provider_job_interests_updated_at
  before update on public.provider_job_interests
  for each row execute procedure public.set_updated_at();

-- -------------------------------------------------------------------------
-- 3. match_score_cache
--    Caches computed (opportunity × provider) match results.
--    TTL: 24 hours — stale rows are overwritten on next compute run.
--    Unique on (opportunity_id, provider_id).
-- -------------------------------------------------------------------------
create table if not exists public.match_score_cache (
  id              uuid primary key default uuid_generate_v4(),
  opportunity_id  uuid not null references public.job_opportunities(id) on delete cascade,
  provider_id     uuid not null references public.profiles(id) on delete cascade,
  match_score     numeric(5,2) not null,
  match_band      text not null check (match_band in ('best','great','good','fair')),
  factor_scores   jsonb not null default '{}',
  match_reasons   text[] not null default '{}',
  match_summary   text not null default '',
  computed_at     timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '24 hours'),

  constraint msc_unique_pair unique (opportunity_id, provider_id)
);

create index if not exists msc_opportunity_id_idx on public.match_score_cache(opportunity_id);
create index if not exists msc_provider_id_idx    on public.match_score_cache(provider_id);
create index if not exists msc_expires_at_idx     on public.match_score_cache(expires_at);

-- -------------------------------------------------------------------------
-- 4. Utility: expire stale job_opportunities
--    Call from a nightly Supabase Edge Function or pg_cron job:
--      select public.expire_job_opportunities();
-- -------------------------------------------------------------------------
create or replace function public.expire_job_opportunities()
returns void language plpgsql security definer as $$
begin
  update public.job_opportunities
    set status = 'expired'
  where status = 'open'
    and expires_at < now();
end;
$$;

-- -------------------------------------------------------------------------
-- 5. Utility: expire stale match_score_cache entries
--    Call from the same nightly job.
-- -------------------------------------------------------------------------
create or replace function public.expire_match_cache()
returns void language plpgsql security definer as $$
begin
  delete from public.match_score_cache
  where expires_at < now();
end;
$$;

-- -------------------------------------------------------------------------
-- 6. Row Level Security — job_opportunities
-- -------------------------------------------------------------------------
alter table public.job_opportunities enable row level security;

-- Owners: full CRUD on their own opportunities
drop policy if exists "jo: owner select own"  on public.job_opportunities;
create policy "jo: owner select own"
  on public.job_opportunities for select
  using (owner_id = auth.uid());

drop policy if exists "jo: owner insert" on public.job_opportunities;
create policy "jo: owner insert"
  on public.job_opportunities for insert
  with check (owner_id = auth.uid());

drop policy if exists "jo: owner update" on public.job_opportunities;
create policy "jo: owner update"
  on public.job_opportunities for update
  using (owner_id = auth.uid());

drop policy if exists "jo: owner delete" on public.job_opportunities;
create policy "jo: owner delete"
  on public.job_opportunities for delete
  using (owner_id = auth.uid());

-- Providers: read open, non-expired opportunities (approved providers only)
drop policy if exists "jo: provider select open" on public.job_opportunities;
create policy "jo: provider select open"
  on public.job_opportunities for select
  to authenticated
  using (
    status = 'open'
    and expires_at > now()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'provider'
        and p.verification_status = 'approved'
    )
  );

-- -------------------------------------------------------------------------
-- 7. Row Level Security — provider_job_interests
-- -------------------------------------------------------------------------
alter table public.provider_job_interests enable row level security;

-- Providers: manage their own interest rows
drop policy if exists "pji: provider manage own" on public.provider_job_interests;
create policy "pji: provider manage own"
  on public.provider_job_interests for all
  to authenticated
  using  (provider_id = auth.uid())
  with check (provider_id = auth.uid());

-- Owners: read interests submitted on their opportunities
drop policy if exists "pji: owner read" on public.provider_job_interests;
create policy "pji: owner read"
  on public.provider_job_interests for select
  to authenticated
  using (
    exists (
      select 1 from public.job_opportunities jo
      where jo.id = opportunity_id
        and jo.owner_id = auth.uid()
    )
  );

-- -------------------------------------------------------------------------
-- 8. Row Level Security — match_score_cache
-- -------------------------------------------------------------------------
alter table public.match_score_cache enable row level security;

-- Providers: read their own cached scores
drop policy if exists "msc: provider read own" on public.match_score_cache;
create policy "msc: provider read own"
  on public.match_score_cache for select
  to authenticated
  using (provider_id = auth.uid());

-- Owners: read match scores for their opportunities
drop policy if exists "msc: owner read" on public.match_score_cache;
create policy "msc: owner read"
  on public.match_score_cache for select
  to authenticated
  using (
    exists (
      select 1 from public.job_opportunities jo
      where jo.id = opportunity_id
        and jo.owner_id = auth.uid()
    )
  );

-- Authenticated users: write cache entries (the matching algorithm)
drop policy if exists "msc: authenticated insert" on public.match_score_cache;
create policy "msc: authenticated insert"
  on public.match_score_cache for insert
  to authenticated
  with check (true);

drop policy if exists "msc: authenticated update" on public.match_score_cache;
create policy "msc: authenticated update"
  on public.match_score_cache for update
  to authenticated
  using (true);
