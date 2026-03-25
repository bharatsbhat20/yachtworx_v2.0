/**
 * AI Autofill Service — TRD Section 4.4
 *
 * Dual-mode:
 *   isDemoMode=true  → localStorage cache
 *   isDemoMode=false → Supabase boat_specs_cache table (shared across all users)
 *
 * TTL: 365 days for successful lookups, 7 days for failed lookups
 */

import type { BoatSpecsCache, AutofillResponse } from '../types';
import { supabase, isDemoMode } from '../lib/supabase';

const LOCAL_CACHE_KEY = 'yw_specs_cache';
const CACHE_TTL_SUCCESS_DAYS = 365;
const CACHE_TTL_FAILED_DAYS  = 7;

// ─── Mock Spec Database ───────────────────────────────────────────────────────

const MOCK_SPEC_DB: Record<string, Omit<AutofillResponse, 'source'>> = {
  'sea ray|slx 400|2021': { lengthOverall: 39.9, beam: 12.1, draft: 3.2, engineType: 'Twin MerCruiser 6.2L', fuelType: 'Gasoline', hullMaterial: 'Fiberglass', displacement: 14200 },
  'sea ray|slx 350|2022': { lengthOverall: 35.0, beam: 10.9, draft: 2.8, engineType: 'Twin MerCruiser 6.2L', fuelType: 'Gasoline', hullMaterial: 'Fiberglass', displacement: 10800 },
  'sea ray|sundancer 320|2020': { lengthOverall: 32.0, beam: 10.4, draft: 2.8, engineType: 'MerCruiser 6.2L MPI', fuelType: 'Gasoline', hullMaterial: 'Fiberglass', displacement: 9200 },
  'beneteau|oceanis 51.1|2018': { lengthOverall: 51.0, beam: 15.9, draft: 6.5, engineType: 'Yanmar 4JH57 57HP Diesel', fuelType: 'Diesel', hullMaterial: 'Fiberglass', displacement: 29100 },
  'beneteau|oceanis 46.1|2021': { lengthOverall: 46.2, beam: 14.9, draft: 5.9, engineType: 'Yanmar 4JH45 45HP Diesel', fuelType: 'Diesel', hullMaterial: 'Fiberglass', displacement: 24250 },
  'beneteau|first 44|2022': { lengthOverall: 44.0, beam: 14.1, draft: 7.2, engineType: 'Yanmar 4JH40 40HP Diesel', fuelType: 'Diesel', hullMaterial: 'Fiberglass', displacement: 22000 },
  'azimut|55s|2021': { lengthOverall: 55.0, beam: 14.8, draft: 4.1, engineType: 'Twin Volvo IPS 600', fuelType: 'Diesel', hullMaterial: 'Fiberglass', displacement: 42500 },
  'azimut|50|2020': { lengthOverall: 50.0, beam: 14.4, draft: 4.0, engineType: 'Twin Volvo IPS 500', fuelType: 'Diesel', hullMaterial: 'Fiberglass', displacement: 37000 },
  'lagoon|45|2016': { lengthOverall: 45.0, beam: 25.9, draft: 4.3, engineType: 'Twin Yanmar 54HP Diesel', fuelType: 'Diesel', hullMaterial: 'Fiberglass', displacement: 28660 },
  'lagoon|46|2022': { lengthOverall: 46.0, beam: 26.0, draft: 4.4, engineType: 'Twin Yanmar 57HP Diesel', fuelType: 'Diesel', hullMaterial: 'Fiberglass', displacement: 29500 },
  'lagoon|50|2021': { lengthOverall: 50.1, beam: 27.9, draft: 4.3, engineType: 'Twin Volvo 80HP Diesel', fuelType: 'Diesel', hullMaterial: 'Fiberglass', displacement: 37400 },
  'jeanneau|sun odyssey 440|2020': { lengthOverall: 44.0, beam: 14.5, draft: 6.7, engineType: 'Yanmar 3JH40 40HP Diesel', fuelType: 'Diesel', hullMaterial: 'Fiberglass', displacement: 21780 },
  'jeanneau|sun odyssey 380|2021': { lengthOverall: 38.1, beam: 12.6, draft: 5.7, engineType: 'Yanmar 3JH30 30HP Diesel', fuelType: 'Diesel', hullMaterial: 'Fiberglass', displacement: 16424 },
  'bavaria|c42|2021': { lengthOverall: 42.3, beam: 13.9, draft: 6.1, engineType: 'Volvo Penta D2-40 40HP Diesel', fuelType: 'Diesel', hullMaterial: 'Fiberglass', displacement: 20500 },
  'catalina|445|2018': { lengthOverall: 44.5, beam: 13.5, draft: 6.5, engineType: 'Universal M35B 35HP Diesel', fuelType: 'Diesel', hullMaterial: 'Fiberglass', displacement: 22000 },
  'hunter|46|2017': { lengthOverall: 46.0, beam: 14.3, draft: 5.5, engineType: 'Yanmar 3JH5E 39HP Diesel', fuelType: 'Diesel', hullMaterial: 'Fiberglass', displacement: 22000 },
  'boston whaler|350 realm|2022': { lengthOverall: 35.0, beam: 11.5, draft: 2.8, engineType: 'Triple Mercury V8 300hp', fuelType: 'Gasoline', hullMaterial: 'Fiberglass', displacement: 11500 },
  'boston whaler|280 outrage|2021': { lengthOverall: 28.0, beam: 9.9, draft: 2.1, engineType: 'Twin Mercury V8 300hp', fuelType: 'Gasoline', hullMaterial: 'Fiberglass', displacement: 6800 },
  'bertram|35|2019': { lengthOverall: 35.0, beam: 12.2, draft: 3.2, engineType: 'Twin Volvo IPS 400', fuelType: 'Diesel', hullMaterial: 'Fiberglass', displacement: 12500 },
  'hatteras|60 convertible|2020': { lengthOverall: 60.0, beam: 18.0, draft: 5.5, engineType: 'Twin MTU 12V 2000', fuelType: 'Diesel', hullMaterial: 'Fiberglass', displacement: 85000 },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildCacheKey(make: string, model: string, year: number): string {
  return `${make.toLowerCase()}|${model.toLowerCase()}|${year}`;
}

function expiresAt(ttlDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + ttlDays);
  return d.toISOString();
}

// ─── localStorage helpers (demo mode) ────────────────────────────────────────

function loadLocalCache(): BoatSpecsCache[] {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLocalCache(entries: BoatSpecsCache[]): void {
  try { localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(entries)); } catch { /* ignore */ }
}

function findInLocalCache(make: string, model: string, year: number): BoatSpecsCache | null {
  const now = new Date();
  return loadLocalCache().find(
    e =>
      e.make.toLowerCase() === make.toLowerCase() &&
      e.model.toLowerCase() === model.toLowerCase() &&
      e.year === year &&
      new Date(e.expiresAt) > now
  ) || null;
}

function storeInLocalCache(
  make: string, model: string, year: number,
  specs: Omit<BoatSpecsCache, 'id' | 'make' | 'model' | 'year' | 'cachedAt' | 'expiresAt'>
): void {
  const entries = loadLocalCache().filter(
    e => !(e.make.toLowerCase() === make.toLowerCase() &&
           e.model.toLowerCase() === model.toLowerCase() &&
           e.year === year)
  );
  const ttlDays = specs.lookupFailed ? CACHE_TTL_FAILED_DAYS : CACHE_TTL_SUCCESS_DAYS;
  entries.push({
    id: `cache-${Date.now()}`,
    make, model, year,
    cachedAt: new Date().toISOString(),
    expiresAt: expiresAt(ttlDays),
    ...specs,
  });
  saveLocalCache(entries);
}

// ─── Supabase helpers (live mode) ─────────────────────────────────────────────

async function findInSupabaseCache(
  make: string, model: string, year: number
): Promise<BoatSpecsCache | null> {
  if (!supabase) return null;
  const key = buildCacheKey(make, model, year);
  const { data } = await supabase
    .from('boat_specs_cache')
    .select('*')
    .eq('cache_key', key)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!data) return null;
  return {
    id: data.id,
    make: data.make,
    model: data.model,
    year: data.year,
    lengthOverall: data.length_overall ?? undefined,
    beam: data.beam ?? undefined,
    draft: data.draft ?? undefined,
    hullMaterial: data.hull_material ?? undefined,
    engineType: data.engine_type ?? undefined,
    fuelType: data.fuel_type ?? undefined,
    displacement: data.displacement ?? undefined,
    lookupFailed: !data.hit,
    cachedAt: data.created_at,
    expiresAt: data.expires_at,
  };
}

async function storeInSupabaseCache(
  make: string, model: string, year: number,
  specs: Partial<AutofillResponse>,
  hit: boolean
): Promise<void> {
  if (!supabase) return;
  const key = buildCacheKey(make, model, year);
  const ttlDays = hit ? CACHE_TTL_SUCCESS_DAYS : CACHE_TTL_FAILED_DAYS;

  await supabase
    .from('boat_specs_cache')
    .upsert({
      cache_key: key,
      make, model, year,
      length_overall: specs.lengthOverall ?? null,
      beam: specs.beam ?? null,
      draft: specs.draft ?? null,
      hull_material: specs.hullMaterial ?? null,
      engine_type: specs.engineType ?? null,
      fuel_type: specs.fuelType ?? null,
      displacement: specs.displacement ?? null,
      hit,
      expires_at: expiresAt(ttlDays),
    }, { onConflict: 'cache_key' });
}

// ─── Simulated external API call ─────────────────────────────────────────────

async function callExternalApi(
  make: string, model: string, year: number
): Promise<Omit<AutofillResponse, 'source'> | null> {
  await new Promise(r => setTimeout(r, 300 + Math.random() * 500));
  const key = buildCacheKey(make, model, year);
  return MOCK_SPEC_DB[key] || null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Look up vessel specs by make/model/year.
 * Returns autofill data with source = 'cache' | 'api' | 'manual'.
 */
export async function autofillBoatSpecs(
  make: string, model: string, year: number
): Promise<AutofillResponse> {
  if (!make || !model || !year) return { source: 'manual' };

  // ── 1. Cache lookup ──────────────────────────────────────────────────────
  if (isDemoMode) {
    const cached = findInLocalCache(make, model, year);
    if (cached) {
      if (cached.lookupFailed) return { source: 'manual' };
      return {
        lengthOverall: cached.lengthOverall,
        beam: cached.beam,
        draft: cached.draft,
        hullMaterial: cached.hullMaterial,
        engineType: cached.engineType,
        fuelType: cached.fuelType,
        displacement: cached.displacement,
        source: 'cache',
      };
    }
  } else {
    const cached = await findInSupabaseCache(make, model, year);
    if (cached) {
      if (cached.lookupFailed) return { source: 'manual' };
      return {
        lengthOverall: cached.lengthOverall,
        beam: cached.beam,
        draft: cached.draft,
        hullMaterial: cached.hullMaterial,
        engineType: cached.engineType,
        fuelType: cached.fuelType,
        displacement: cached.displacement,
        source: 'cache',
      };
    }
  }

  // ── 2. External API call ─────────────────────────────────────────────────
  try {
    const result = await callExternalApi(make, model, year);

    if (result) {
      if (isDemoMode) {
        storeInLocalCache(make, model, year, {
          ...result, lookupFailed: false, sourceApi: 'mock_marine_db',
        });
      } else {
        await storeInSupabaseCache(make, model, year, result, true);
      }
      return { ...result, source: 'api' };
    } else {
      if (isDemoMode) {
        storeInLocalCache(make, model, year, { lookupFailed: true });
      } else {
        await storeInSupabaseCache(make, model, year, {}, false);
      }
      return { source: 'manual' };
    }
  } catch {
    return { source: 'manual' };
  }
}

/** Clear the local spec cache */
export function clearSpecCache(): void {
  localStorage.removeItem(LOCAL_CACHE_KEY);
}

/** Get all local cache entries (admin/debug) */
export function getSpecCacheEntries(): BoatSpecsCache[] {
  return loadLocalCache();
}
