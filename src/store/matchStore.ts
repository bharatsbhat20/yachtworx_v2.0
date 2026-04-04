/**
 * Smart Matching Store — Module 4
 *
 * Dual-mode:
 *   isDemoMode=true  → computes matches from mock data with a simulated delay
 *   isDemoMode=false → same algorithm, data sourced from Supabase
 *
 * Does NOT import other stores directly (avoids circular deps).
 * Pages pass data as arguments to compute actions.
 *
 * Live-mode data flow:
 *   Owner side:
 *     computeMatchesForOwner(boats) →
 *       fetch approved providers + availability from Supabase →
 *       run computeOwnerMatches() →
 *       upsert critical/high needs as job_opportunities →
 *       update store state
 *
 *   Provider side:
 *     computeMatchesForProvider(providerId) →
 *       fetch open job_opportunities from Supabase →
 *       fetch provider profile + availability →
 *       run scoreProviderForOpportunity() per opportunity →
 *       upsert match_score_cache →
 *       update store state
 *
 *   expressInterest(opportunityId) →
 *     optimistic local update →
 *     upsert provider_job_interests in Supabase
 */

import { create } from 'zustand';
import { supabase, isDemoMode } from '../lib/supabase';
import { mockProviders, mockJobOpportunities, mockProviderAvailability } from '../data/mockData';
import {
  computeOwnerMatches,
  scoreProviderForOpportunity,
} from '../utils/matchScore';
import { calculateVesselHealth } from '../utils/healthScore';
import {
  rowToAvailability,
  rowToJobOpportunity,
  jobOpportunityToInsert,
  providerRowToServiceProvider,
} from '../lib/supabaseTypes';
import type {
  Boat, ServiceProvider, BoatNeed, MatchResult,
  ProviderJobOpportunity, ProviderJobMatch, ProviderMatchSummary,
} from '../types';
import type { ProviderAvailability } from '../types';

// ─── Mock trust scores (demo mode only) ──────────────────────────────────────

const MOCK_TRUST_MAP: Record<string, number> = {
  'prov-1': 94,
  'prov-2': 89,
};

// ─── Store interface ──────────────────────────────────────────────────────────

interface MatchStoreState {
  // Owner-side
  ownerNeeds: BoatNeed[];
  matchResults: MatchResult[];

  // Provider-side
  jobOpportunities: ProviderJobOpportunity[];
  providerJobMatches: ProviderJobMatch[];
  expressedInterest: Set<string>;     // opportunity IDs
  currentProviderId: string | null;   // set when provider compute runs

  // UI
  isComputing: boolean;
  lastComputedAt: string | null;

  // Actions
  computeMatchesForOwner: (boats: Boat[]) => Promise<void>;
  computeMatchesForProvider: (providerId: string) => Promise<void>;
  getTopProvidersForNeed: (needId: string, limit?: number) => MatchResult[];
  getTopProvidersForBoat: (boatId: string, limit?: number) => ProviderMatchSummary[];
  expressInterest: (opportunityId: string) => void;
  refreshMatches: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useMatchStore = create<MatchStoreState>((set, get) => ({
  ownerNeeds: [],
  matchResults: [],
  jobOpportunities: [],
  providerJobMatches: [],
  expressedInterest: new Set(),
  currentProviderId: null,
  isComputing: false,
  lastComputedAt: null,

  // ── Owner: compute matches for all boats ─────────────────────────────────────
  computeMatchesForOwner: async (boats) => {
    if (get().isComputing || boats.length === 0) return;
    set({ isComputing: true });

    try {
      if (isDemoMode) {
        // ── Demo mode ──────────────────────────────────────────────────────
        await new Promise(r => setTimeout(r, 450));

        const healthScores: Record<string, ReturnType<typeof calculateVesselHealth>> = {};
        for (const boat of boats) {
          healthScores[boat.id] = calculateVesselHealth(boat.id, boat.components);
        }

        const { needs, results } = computeOwnerMatches(
          boats,
          healthScores,
          mockProviders,
          mockProviderAvailability,
          MOCK_TRUST_MAP,
        );

        set({
          ownerNeeds: needs,
          matchResults: results,
          isComputing: false,
          lastComputedAt: new Date().toISOString(),
        });

      } else {
        // ── Live mode ──────────────────────────────────────────────────────
        if (!supabase) { set({ isComputing: false }); return; }

        // 1. Fetch all approved providers (profiles with Module 3 columns)
        const { data: providerRows, error: provErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'provider')
          .eq('verification_status', 'approved');

        if (provErr) { console.error('[matchStore] provider fetch:', provErr); }

        const providers: ServiceProvider[] = (providerRows ?? []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (p: any) => providerRowToServiceProvider(p)
        );

        // 2. Fetch availability for those providers
        const providerIds = (providerRows ?? []).map((p: { id: string }) => p.id);
        let availability: ProviderAvailability[] = [];
        if (providerIds.length > 0) {
          const { data: availRows } = await supabase
            .from('provider_availability')
            .select('*')
            .in('provider_id', providerIds)
            .eq('is_active', true);
          availability = (availRows ?? []).map(rowToAvailability);
        }

        // 3. Build trust score map (profiles.trust_score already computed nightly)
        const trustMap: Record<string, number> = {};
        for (const p of providerRows ?? []) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          trustMap[(p as any).id] = (p as any).trust_score ?? 50;
        }

        // 4. Compute vessel health and run matching algorithm
        const healthScores: Record<string, ReturnType<typeof calculateVesselHealth>> = {};
        for (const boat of boats) {
          healthScores[boat.id] = calculateVesselHealth(boat.id, boat.components);
        }

        const { needs, results } = computeOwnerMatches(
          boats,
          healthScores,
          providers,
          availability,
          trustMap,
        );

        // 5. Upsert critical/high needs as job_opportunities so providers can see them
        const publishableNeeds = needs.filter(
          n => n.urgencyLevel === 'critical' || n.urgencyLevel === 'high'
        );
        if (publishableNeeds.length > 0) {
          const ownerId = boats[0]?.ownerId ?? '';
          const upserts = publishableNeeds.map(need => {
            const boat = boats.find(b => b.id === need.boatId);
            return {
              ...jobOpportunityToInsert({
                boatId:          need.boatId,
                boatName:        need.boatName,
                boatType:        boat?.boatType,
                boatLength:      boat?.lengthOverall,
                homePort:        boat?.homePort ?? '',
                ownerId,
                componentName:   need.componentName,
                serviceCategory: need.serviceCategory,
                urgencyLevel:    need.urgencyLevel,
                needLabel:       need.needLabel,
              }),
              // Refresh expiry on each compute run
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            };
          });

          const { error: upsertErr } = await supabase
            .from('job_opportunities')
            .upsert(upserts, { onConflict: 'boat_id,component_name,service_category' });

          if (upsertErr) {
            console.error('[matchStore] job_opportunities upsert:', upsertErr);
          }
        }

        set({
          ownerNeeds: needs,
          matchResults: results,
          isComputing: false,
          lastComputedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('[matchStore] computeMatchesForOwner:', err);
      set({ isComputing: false });
    }
  },

  // ── Provider: score open job opportunities ────────────────────────────────────
  computeMatchesForProvider: async (providerId) => {
    if (get().isComputing) return;
    set({ isComputing: true, currentProviderId: providerId });

    try {
      if (isDemoMode) {
        // ── Demo mode ──────────────────────────────────────────────────────
        await new Promise(r => setTimeout(r, 350));

        const provider = mockProviders.find(p => p.id === providerId) ?? mockProviders[0];
        const opportunities = mockJobOpportunities.filter(o => o.status === 'open');

        const matches: ProviderJobMatch[] = opportunities
          .map(opp => ({
            opportunity: opp,
            matchResult: scoreProviderForOpportunity(
              provider,
              opp,
              mockProviderAvailability,
              MOCK_TRUST_MAP[providerId],
            ),
          }))
          .filter(m => m.matchResult.matchScore >= 45)
          .sort((a, b) => b.matchResult.matchScore - a.matchResult.matchScore);

        set({
          jobOpportunities: opportunities,
          providerJobMatches: matches,
          isComputing: false,
          lastComputedAt: new Date().toISOString(),
        });

      } else {
        // ── Live mode ──────────────────────────────────────────────────────
        if (!supabase) { set({ isComputing: false }); return; }

        // 1. Fetch provider's own profile (with all Module 3 columns)
        const { data: providerRow, error: provErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', providerId)
          .single();

        if (provErr || !providerRow) {
          console.error('[matchStore] provider profile fetch:', provErr);
          set({ isComputing: false });
          return;
        }

        // 2. Fetch provider availability
        const { data: availRows } = await supabase
          .from('provider_availability')
          .select('*')
          .eq('provider_id', providerId)
          .eq('is_active', true);

        // 3. Fetch open, non-expired job_opportunities
        const { data: oppRows, error: oppErr } = await supabase
          .from('job_opportunities')
          .select('*')
          .eq('status', 'open')
          .gt('expires_at', new Date().toISOString())
          .order('posted_at', { ascending: false });

        if (oppErr) console.error('[matchStore] job_opportunities fetch:', oppErr);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const provider     = providerRowToServiceProvider(providerRow as any);
        const availability = (availRows ?? []).map(rowToAvailability);
        const opportunities = (oppRows ?? []).map(rowToJobOpportunity);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const trustScore   = (providerRow as any).trust_score ?? 50;

        // 4. Score each opportunity
        const matches: ProviderJobMatch[] = opportunities
          .map(opp => ({
            opportunity: opp,
            matchResult: scoreProviderForOpportunity(
              provider,
              opp,
              availability,
              trustScore,
            ),
          }))
          .filter(m => m.matchResult.matchScore >= 45)
          .sort((a, b) => b.matchResult.matchScore - a.matchResult.matchScore);

        // 5. Upsert match_score_cache for the top matches (24h TTL)
        if (matches.length > 0) {
          const cacheUpserts = matches.map(m => ({
            opportunity_id: m.opportunity.id,
            provider_id:    providerId,
            match_score:    m.matchResult.matchScore,
            match_band:     m.matchResult.band,
            factor_scores:  m.matchResult.factorScores as Record<string, number>,
            match_reasons:  m.matchResult.matchReasons,
            match_summary:  m.matchResult.matchSummary,
            computed_at:    new Date().toISOString(),
            expires_at:     new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          }));

          const { error: cacheErr } = await supabase
            .from('match_score_cache')
            .upsert(cacheUpserts, { onConflict: 'opportunity_id,provider_id' });

          if (cacheErr) console.error('[matchStore] match_score_cache upsert:', cacheErr);
        }

        set({
          jobOpportunities: opportunities,
          providerJobMatches: matches,
          isComputing: false,
          lastComputedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('[matchStore] computeMatchesForProvider:', err);
      set({ isComputing: false });
    }
  },

  // ── Selectors ─────────────────────────────────────────────────────────────────

  getTopProvidersForNeed: (needId, limit = 3) => {
    return get().matchResults
      .filter(r => r.needId === needId)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  },

  getTopProvidersForBoat: (boatId, limit = 5) => {
    const { matchResults, ownerNeeds } = get();
    const providers = isDemoMode
      ? mockProviders
      : [];  // live mode: providers already embedded in matchResults via matchResult.providerId

    // In demo mode, iterate known providers
    if (isDemoMode) {
      return providers
        .map(provider => {
          const allMatches = matchResults
            .filter(r => r.boatId === boatId && r.providerId === provider.id)
            .sort((a, b) => b.matchScore - a.matchScore);
          if (allMatches.length === 0) return null;
          const topMatch = allMatches[0];
          return { provider, topMatch, allMatches } satisfies ProviderMatchSummary;
        })
        .filter((s): s is ProviderMatchSummary => s !== null && s.topMatch.matchScore >= 45)
        .sort((a, b) => b.topMatch.matchScore - a.topMatch.matchScore)
        .slice(0, limit);
    }

    // Live mode: group by providerId from results
    const providerIds = [...new Set(
      matchResults.filter(r => r.boatId === boatId).map(r => r.providerId)
    )];

    return providerIds
      .map(pid => {
        const allMatches = matchResults
          .filter(r => r.boatId === boatId && r.providerId === pid)
          .sort((a, b) => b.matchScore - a.matchScore);
        if (allMatches.length === 0) return null;
        const topMatch = allMatches[0];

        // Build a minimal ServiceProvider shell from the result (name comes from matchSummary)
        const minimalProvider: ServiceProvider = {
          id: pid,
          name: pid,
          businessName: '',
          location: '',
          rating: 0,
          reviewCount: 0,
          categories: [],
          certifications: [],
          description: '',
          yearsExperience: 0,
          responseTime: '',
          completedJobs: 0,
          services: [],
          verified: true,
        };
        return { provider: minimalProvider, topMatch, allMatches } satisfies ProviderMatchSummary;
      })
      .filter((s): s is ProviderMatchSummary => s !== null && s.topMatch.matchScore >= 45)
      .sort((a, b) => b.topMatch.matchScore - a.topMatch.matchScore)
      .slice(0, limit);
  },

  // ── Express Interest ──────────────────────────────────────────────────────────

  expressInterest: (opportunityId) => {
    // Optimistic local update (both demo and live)
    set(state => ({
      expressedInterest: new Set([...state.expressedInterest, opportunityId]),
      providerJobMatches: state.providerJobMatches.map(m =>
        m.opportunity.id === opportunityId
          ? { ...m, opportunity: { ...m.opportunity, status: 'in_review' as const } }
          : m
      ),
    }));

    // Live mode: persist to Supabase
    if (!isDemoMode && supabase) {
      const state = get();
      const match = state.providerJobMatches.find(m => m.opportunity.id === opportunityId);
      const providerId = state.currentProviderId;
      if (match && providerId) {
        supabase
          .from('provider_job_interests')
          .upsert(
            {
              opportunity_id: opportunityId,
              provider_id:    providerId,
              match_score:    match.matchResult.matchScore,
              match_band:     match.matchResult.band,
              status:         'pending',
            },
            { onConflict: 'opportunity_id,provider_id' }
          )
          .then(({ error }) => {
            if (error) console.error('[matchStore] expressInterest upsert:', error);
          });
      }
    }
  },

  // ── Refresh ───────────────────────────────────────────────────────────────────

  refreshMatches: () => {
    set({
      ownerNeeds: [],
      matchResults: [],
      providerJobMatches: [],
      jobOpportunities: [],
      lastComputedAt: null,
    });
  },
}));
