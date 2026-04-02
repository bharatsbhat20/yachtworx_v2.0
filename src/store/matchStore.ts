/**
 * Smart Matching Store — Module 4
 *
 * Dual-mode:
 *   isDemoMode=true  → computes matches from mock data, 400ms simulated delay
 *   isDemoMode=false → same algorithm, data sourced from other live stores
 *
 * Does NOT import other stores directly (avoids circular deps).
 * Pages pass data as arguments to compute actions.
 */

import { create } from 'zustand';
import { isDemoMode } from '../lib/supabase';
import { mockProviders, mockJobOpportunities } from '../data/mockData';
import { mockProviderAvailability } from '../data/mockData';
import {
  computeOwnerMatches,
  scoreProviderForOpportunity,
  rankProvidersForNeed,
} from '../utils/matchScore';
import { calculateVesselHealth } from '../utils/healthScore';
import type {
  Boat, ServiceProvider, BoatNeed, MatchResult,
  ProviderJobOpportunity, ProviderJobMatch, ProviderMatchSummary,
} from '../types';
import type { ProviderAvailability } from '../types';

// Trust scores for mock providers (from ProviderProfile data)
const MOCK_TRUST_MAP: Record<string, number> = {
  'prov-1': 94,
  'prov-2': 89,
};

interface MatchStoreState {
  // Owner-side
  ownerNeeds: BoatNeed[];
  matchResults: MatchResult[];

  // Provider-side
  jobOpportunities: ProviderJobOpportunity[];
  providerJobMatches: ProviderJobMatch[];
  expressedInterest: Set<string>; // opportunity IDs

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

export const useMatchStore = create<MatchStoreState>((set, get) => ({
  ownerNeeds: [],
  matchResults: [],
  jobOpportunities: [],
  providerJobMatches: [],
  expressedInterest: new Set(),
  isComputing: false,
  lastComputedAt: null,

  // ── Owner: compute matches for all boats ─────────────────────────────────────
  computeMatchesForOwner: async (boats) => {
    if (get().isComputing) return;
    set({ isComputing: true });

    if (isDemoMode) {
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
      // Live mode: same algorithm, data already in other stores
      // In production this would read from the already-hydrated boatStore / serviceStore
      set({ isComputing: false });
    }
  },

  // ── Provider: score job opportunities ────────────────────────────────────────
  computeMatchesForProvider: async (providerId) => {
    if (get().isComputing) return;
    set({ isComputing: true });

    if (isDemoMode) {
      await new Promise(r => setTimeout(r, 350));

      // Find provider in mock data
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
    const boatNeeds = ownerNeeds.filter(n => n.boatId === boatId);
    const providers = mockProviders;

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
  },

  expressInterest: (opportunityId) => {
    set(state => ({
      expressedInterest: new Set([...state.expressedInterest, opportunityId]),
      providerJobMatches: state.providerJobMatches.map(m =>
        m.opportunity.id === opportunityId
          ? { ...m, opportunity: { ...m.opportunity, status: 'in_review' as const } }
          : m
      ),
    }));
  },

  refreshMatches: () => {
    set({ ownerNeeds: [], matchResults: [], providerJobMatches: [], lastComputedAt: null });
  },
}));
