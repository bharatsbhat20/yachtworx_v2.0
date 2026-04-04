/**
 * Insurance Store — Module 6
 *
 * Manages all insurance and warranty state:
 *   - Insurance products (marketplace)
 *   - Quotes (owner & agent)
 *   - Policies (owner wallet)
 *   - Claims (FNOL → settlement)
 *   - Warranty registrations & claims
 *   - Agent commissions
 *   - Insurer analytics
 *
 * Dual-mode:
 *   isDemoMode=true  → mock data with simulated delays
 *   isDemoMode=false → Supabase (all snake_case rows mapped through rowTo* helpers)
 */

import { create } from 'zustand';
import { supabase, isDemoMode } from '../lib/supabase';
import {
  mockInsurers, mockAgents, mockProducts, mockQuotes,
  mockPolicies, mockClaims, mockWarranties, mockWarrantyClaims,
  mockCommissions, mockInsurerAnalytics,
} from '../data/insuranceData';
import type {
  Insurer, InsuranceAgent, InsuranceProduct, InsuranceQuote,
  InsurancePolicy, InsuranceClaim, WarrantyRegistration, WarrantyClaim,
  AgentCommission, InsurerAnalytics,
  ClaimStatus, WarrantyClaimStatus, QuoteStatus, PolicyStatus,
} from '../types';

// ─── Store Interface ──────────────────────────────────────────────────────────

interface InsuranceStoreState {
  // Data
  insurers: Insurer[];
  agents: InsuranceAgent[];
  products: InsuranceProduct[];
  quotes: InsuranceQuote[];
  policies: InsurancePolicy[];
  claims: InsuranceClaim[];
  warranties: WarrantyRegistration[];
  warrantyClaims: WarrantyClaim[];
  commissions: AgentCommission[];
  analytics: InsurerAnalytics | null;

  // UI
  isLoading: boolean;
  error: string | null;

  // ── Product Marketplace ───────────────────────────────────────────────────
  loadProducts: () => Promise<void>;

  // ── Quotes ────────────────────────────────────────────────────────────────
  loadQuotes: (ownerId: string) => Promise<void>;
  createQuote: (data: Partial<InsuranceQuote>) => Promise<InsuranceQuote | null>;
  updateQuoteStatus: (quoteId: string, status: QuoteStatus) => Promise<void>;

  // ── Policies ──────────────────────────────────────────────────────────────
  loadPolicies: (ownerId: string) => Promise<void>;
  loadAllPolicies: (insurerId: string) => Promise<void>;
  cancelPolicy: (policyId: string, reason: string) => Promise<void>;

  // ── Claims ────────────────────────────────────────────────────────────────
  loadClaims: (ownerId?: string, insurerId?: string) => Promise<void>;
  createClaim: (data: Partial<InsuranceClaim>) => Promise<InsuranceClaim | null>;
  updateClaimStatus: (claimId: string, status: ClaimStatus) => Promise<void>;

  // ── Warranties ────────────────────────────────────────────────────────────
  loadWarranties: (ownerId?: string, providerId?: string) => Promise<void>;
  createWarranty: (data: Partial<WarrantyRegistration>) => Promise<WarrantyRegistration | null>;

  // ── Warranty Claims ───────────────────────────────────────────────────────
  loadWarrantyClaims: (ownerId?: string, providerId?: string) => Promise<void>;
  createWarrantyClaim: (data: Partial<WarrantyClaim>) => Promise<WarrantyClaim | null>;
  updateWarrantyClaimStatus: (claimId: string, status: WarrantyClaimStatus, response?: string) => Promise<void>;

  // ── Agent ─────────────────────────────────────────────────────────────────
  loadCommissions: (agentId: string) => Promise<void>;
  loadAgentPolicies: (agentId: string) => Promise<void>;

  // ── Insurer ───────────────────────────────────────────────────────────────
  loadInsurers: () => Promise<void>;
  loadInsurerAnalytics: (insurerId: string) => Promise<void>;

  // ── Selectors ─────────────────────────────────────────────────────────────
  getActivePolicies: (ownerId: string) => InsurancePolicy[];
  getOpenClaims: (ownerId: string) => InsuranceClaim[];
  getActiveWarranties: (ownerId: string) => WarrantyRegistration[];
}

// ─── Store ────────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export const useInsuranceStore = create<InsuranceStoreState>((set, get) => ({
  insurers:        [],
  agents:          [],
  products:        [],
  quotes:          [],
  policies:        [],
  claims:          [],
  warranties:      [],
  warrantyClaims:  [],
  commissions:     [],
  analytics:       null,
  isLoading:       false,
  error:           null,

  // ── loadProducts ───────────────────────────────────────────────────────────

  loadProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      if (isDemoMode || !supabase) {
        await delay(400);
        set({ products: mockProducts, isLoading: false });
        return;
      }
      const { data, error } = await supabase
        .from('insurance_products')
        .select('*, insurers(legal_name, trading_name)')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Map rows → typed objects (raw for now; full mappers in supabaseTypes.ts)
      set({ products: (data ?? []) as unknown as InsuranceProduct[], isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  // ── loadQuotes ─────────────────────────────────────────────────────────────

  loadQuotes: async (ownerId) => {
    set({ isLoading: true, error: null });
    try {
      if (isDemoMode || !supabase) {
        await delay(300);
        set({ quotes: mockQuotes.filter(q => q.ownerId === ownerId), isLoading: false });
        return;
      }
      const { data, error } = await supabase
        .from('insurance_quotes')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ quotes: (data ?? []) as unknown as InsuranceQuote[], isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  // ── createQuote ────────────────────────────────────────────────────────────

  createQuote: async (data) => {
    set({ isLoading: true, error: null });
    try {
      if (isDemoMode || !supabase) {
        await delay(600);
        const product = mockProducts.find(p => p.id === data.productId);
        const agreed = data.agreedValueUsd ?? 100000;
        const baseRate = product?.baseRatePct ?? 0.015;
        const annualPremium = Math.max(agreed * baseRate, product?.minPremiumUsd ?? 1200);
        const newQuote: InsuranceQuote = {
          id: `quote-${Date.now()}`,
          reference: `YW-QT-2026-${String(Math.floor(Math.random() * 900000) + 100000)}`,
          ownerId: data.ownerId ?? 'user-1',
          ownerName: data.ownerName ?? 'James Harrison',
          productId: data.productId ?? '',
          productName: product?.name ?? '',
          insurerId: product?.insurerId ?? '',
          insurerName: product?.insurerName ?? '',
          boatId: data.boatId ?? '',
          boatName: data.boatName ?? '',
          agreedValueUsd: agreed,
          useType: data.useType ?? 'pleasure',
          territory: data.territory ?? 'us_east',
          mooringType: data.mooringType ?? 'marina_slip',
          priorClaimsCount: data.priorClaimsCount ?? 0,
          annualPremiumUsd: Math.round(annualPremium),
          instalmentOption: data.instalmentOption ?? 'annual',
          instalmentAmountUsd: Math.round(annualPremium),
          deductibleUsd: product?.deductibleFixedUsd ?? Math.round(agreed * (product?.deductiblePct ?? 0.02)),
          status: 'quoted',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set(state => ({ quotes: [newQuote, ...state.quotes], isLoading: false }));
        return newQuote;
      }
      const { data: row, error } = await supabase
        .from('insurance_quotes')
        .insert({
          owner_id:           data.ownerId,
          agent_id:           data.agentId ?? null,
          product_id:         data.productId,
          boat_id:            data.boatId,
          agreed_value_usd:   data.agreedValueUsd,
          use_type:           data.useType,
          territory:          data.territory,
          mooring_type:       data.mooringType,
          prior_claims_count: data.priorClaimsCount ?? 0,
          instalment_option:  data.instalmentOption ?? 'annual',
          status:             'quoted',
        })
        .select()
        .single();
      if (error) throw error;
      const newQuote = row as unknown as InsuranceQuote;
      set(state => ({ quotes: [newQuote, ...state.quotes], isLoading: false }));
      return newQuote;
    } catch (err) {
      set({ error: String(err), isLoading: false });
      return null;
    }
  },

  // ── updateQuoteStatus ──────────────────────────────────────────────────────

  updateQuoteStatus: async (quoteId, status) => {
    set({ isLoading: true, error: null });
    try {
      if (isDemoMode || !supabase) {
        await delay(300);
        set(state => ({
          quotes: state.quotes.map(q => q.id === quoteId ? { ...q, status } : q),
          isLoading: false,
        }));
        return;
      }
      await supabase.from('insurance_quotes').update({ status, updated_at: new Date().toISOString() }).eq('id', quoteId);
      set(state => ({
        quotes: state.quotes.map(q => q.id === quoteId ? { ...q, status } : q),
        isLoading: false,
      }));
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  // ── loadPolicies ───────────────────────────────────────────────────────────

  loadPolicies: async (ownerId) => {
    set({ isLoading: true, error: null });
    try {
      if (isDemoMode || !supabase) {
        await delay(400);
        set({ policies: mockPolicies.filter(p => p.ownerId === ownerId), isLoading: false });
        return;
      }
      const { data, error } = await supabase
        .from('insurance_policies')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ policies: (data ?? []) as unknown as InsurancePolicy[], isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  // ── loadAllPolicies (insurer view) ─────────────────────────────────────────

  loadAllPolicies: async (insurerId) => {
    set({ isLoading: true, error: null });
    try {
      if (isDemoMode || !supabase) {
        await delay(400);
        set({ policies: mockPolicies.filter(p => p.insurerId === insurerId), isLoading: false });
        return;
      }
      const { data, error } = await supabase
        .from('insurance_policies')
        .select('*')
        .eq('insurer_id', insurerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ policies: (data ?? []) as unknown as InsurancePolicy[], isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  // ── cancelPolicy ───────────────────────────────────────────────────────────

  cancelPolicy: async (policyId, reason) => {
    set({ isLoading: true, error: null });
    try {
      if (isDemoMode || !supabase) {
        await delay(400);
        set(state => ({
          policies: state.policies.map(p =>
            p.id === policyId ? { ...p, status: 'cancelled' as PolicyStatus, cancellationReason: reason, cancellationDate: new Date().toISOString().split('T')[0] } : p
          ),
          isLoading: false,
        }));
        return;
      }
      await supabase.from('insurance_policies').update({
        status: 'cancelled',
        cancellation_reason: reason,
        cancellation_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      }).eq('id', policyId);
      set(state => ({
        policies: state.policies.map(p =>
          p.id === policyId ? { ...p, status: 'cancelled' as PolicyStatus, cancellationReason: reason } : p
        ),
        isLoading: false,
      }));
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  // ── loadClaims ─────────────────────────────────────────────────────────────

  loadClaims: async (ownerId, insurerId) => {
    set({ isLoading: true, error: null });
    try {
      if (isDemoMode || !supabase) {
        await delay(400);
        let claims = mockClaims;
        if (ownerId)   claims = claims.filter(c => c.ownerId   === ownerId);
        if (insurerId) claims = claims.filter(c => c.insurerId === insurerId);
        set({ claims, isLoading: false });
        return;
      }
      let query = supabase.from('insurance_claims').select('*, claim_documents(*), claim_assessments(*)');
      if (ownerId)   query = query.eq('owner_id', ownerId);
      if (insurerId) query = query.eq('insurer_id', insurerId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      set({ claims: (data ?? []) as unknown as InsuranceClaim[], isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  // ── createClaim ────────────────────────────────────────────────────────────

  createClaim: async (data) => {
    set({ isLoading: true, error: null });
    try {
      if (isDemoMode || !supabase) {
        await delay(700);
        const newClaim: InsuranceClaim = {
          id: `clm-${Date.now()}`,
          reference: `YW-CLM-2026-${String(Math.floor(Math.random() * 900000) + 100000)}`,
          policyId: data.policyId ?? '',
          policyNumber: data.policyNumber,
          ownerId: data.ownerId ?? 'user-1',
          ownerName: data.ownerName ?? 'James Harrison',
          insurerId: data.insurerId ?? '',
          insurerName: data.insurerName ?? '',
          incidentDate: data.incidentDate ?? new Date().toISOString().split('T')[0],
          incidentType: data.incidentType ?? 'other',
          description: data.description ?? '',
          estimatedLossUsd: data.estimatedLossUsd ?? 0,
          status: 'submitted',
          fraudFlag: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set(state => ({ claims: [newClaim, ...state.claims], isLoading: false }));
        return newClaim;
      }
      const { data: row, error } = await supabase
        .from('insurance_claims')
        .insert({
          policy_id:              data.policyId,
          owner_id:               data.ownerId,
          insurer_id:             data.insurerId,
          incident_date:          data.incidentDate,
          incident_time:          data.incidentTime ?? null,
          incident_latitude:      data.incidentLatitude ?? null,
          incident_longitude:     data.incidentLongitude ?? null,
          incident_location_name: data.incidentLocationName ?? null,
          incident_type:          data.incidentType,
          description:            data.description,
          estimated_loss_usd:     data.estimatedLossUsd,
          status:                 'submitted',
          fraud_flag:             false,
        })
        .select()
        .single();
      if (error) throw error;
      const newClaim = row as unknown as InsuranceClaim;
      set(state => ({ claims: [newClaim, ...state.claims], isLoading: false }));
      return newClaim;
    } catch (err) {
      set({ error: String(err), isLoading: false });
      return null;
    }
  },

  // ── updateClaimStatus ──────────────────────────────────────────────────────

  updateClaimStatus: async (claimId, status) => {
    const now = new Date().toISOString();
    set({ isLoading: true, error: null });
    try {
      if (isDemoMode || !supabase) {
        await delay(300);
        set(state => ({
          claims: state.claims.map(c =>
            c.id === claimId ? { ...c, status, ...(status === 'closed' ? { closedAt: now } : {}) } : c
          ),
          isLoading: false,
        }));
        return;
      }
      const update: Record<string, unknown> = { status, updated_at: now };
      if (status === 'closed') update.closed_at = now;
      await supabase.from('insurance_claims').update(update).eq('id', claimId);
      set(state => ({
        claims: state.claims.map(c => c.id === claimId ? { ...c, status } : c),
        isLoading: false,
      }));
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  // ── loadWarranties ─────────────────────────────────────────────────────────

  loadWarranties: async (ownerId, providerId) => {
    set({ isLoading: true, error: null });
    try {
      if (isDemoMode || !supabase) {
        await delay(300);
        let ws = mockWarranties;
        if (ownerId)    ws = ws.filter(w => w.ownerId    === ownerId);
        if (providerId) ws = ws.filter(w => w.providerId === providerId);
        set({ warranties: ws, isLoading: false });
        return;
      }
      let query = supabase.from('warranty_registrations').select('*');
      if (ownerId)    query = query.eq('owner_id', ownerId);
      if (providerId) query = query.eq('provider_id', providerId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      set({ warranties: (data ?? []) as unknown as WarrantyRegistration[], isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  // ── createWarranty ─────────────────────────────────────────────────────────

  createWarranty: async (data) => {
    set({ isLoading: true, error: null });
    try {
      if (isDemoMode || !supabase) {
        await delay(500);
        const effectiveDate = data.effectiveDate ?? new Date().toISOString().split('T')[0];
        const duration = data.durationDays ?? 90;
        const expiry = new Date(new Date(effectiveDate).getTime() + duration * 86400000).toISOString().split('T')[0];
        const newW: WarrantyRegistration = {
          id: `wr-${Date.now()}`,
          reference: `YW-WR-2026-${String(Math.floor(Math.random() * 900000) + 100000)}`,
          bookingId:     data.bookingId ?? '',
          providerId:    data.providerId ?? 'prov-1',
          providerName:  data.providerName ?? 'Marcus Rivera',
          ownerId:       data.ownerId ?? 'user-1',
          ownerName:     data.ownerName ?? 'James Harrison',
          boatId:        data.boatId ?? 'boat-1',
          boatName:      data.boatName ?? 'Sea Spirit',
          warrantyType:  data.warrantyType ?? 'combined',
          durationDays:  duration,
          effectiveDate,
          expiryDate:    expiry,
          description:   data.description ?? '',
          status:        'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set(state => ({ warranties: [newW, ...state.warranties], isLoading: false }));
        return newW;
      }
      const effectiveDate = data.effectiveDate ?? new Date().toISOString().split('T')[0];
      const duration = data.durationDays ?? 90;
      const expiry = new Date(new Date(effectiveDate).getTime() + duration * 86400000).toISOString().split('T')[0];
      const { data: row, error } = await supabase
        .from('warranty_registrations')
        .insert({
          booking_id:     data.bookingId,
          provider_id:    data.providerId,
          owner_id:       data.ownerId,
          boat_id:        data.boatId,
          warranty_type:  data.warrantyType,
          duration_days:  duration,
          effective_date: effectiveDate,
          expiry_date:    expiry,
          description:    data.description ?? null,
          status:         'active',
        })
        .select()
        .single();
      if (error) throw error;
      const newW = row as unknown as WarrantyRegistration;
      set(state => ({ warranties: [newW, ...state.warranties], isLoading: false }));
      return newW;
    } catch (err) {
      set({ error: String(err), isLoading: false });
      return null;
    }
  },

  // ── loadWarrantyClaims ─────────────────────────────────────────────────────

  loadWarrantyClaims: async (ownerId, providerId) => {
    set({ isLoading: true, error: null });
    try {
      if (isDemoMode || !supabase) {
        await delay(300);
        let wcs = mockWarrantyClaims;
        if (ownerId)    wcs = wcs.filter(w => w.ownerId    === ownerId);
        if (providerId) wcs = wcs.filter(w => w.providerId === providerId);
        set({ warrantyClaims: wcs, isLoading: false });
        return;
      }
      let query = supabase.from('warranty_claims').select('*');
      if (ownerId)    query = query.eq('owner_id', ownerId);
      if (providerId) query = query.eq('provider_id', providerId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      set({ warrantyClaims: (data ?? []) as unknown as WarrantyClaim[], isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  // ── createWarrantyClaim ────────────────────────────────────────────────────

  createWarrantyClaim: async (data) => {
    set({ isLoading: true, error: null });
    try {
      if (isDemoMode || !supabase) {
        await delay(500);
        const warranty = get().warranties.find(w => w.id === data.warrantyId);
        const newWC: WarrantyClaim = {
          id: `wc-${Date.now()}`,
          reference: `YW-WC-2026-${String(Math.floor(Math.random() * 900000) + 100000)}`,
          warrantyId:       data.warrantyId ?? '',
          warrantyReference: warranty?.reference,
          ownerId:    data.ownerId   ?? 'user-1',
          ownerName:  data.ownerName ?? 'James Harrison',
          providerId:   warranty?.providerId   ?? '',
          providerName: warranty?.providerName ?? '',
          boatName:   warranty?.boatName,
          description: data.description ?? '',
          status:     'submitted',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set(state => ({ warrantyClaims: [newWC, ...state.warrantyClaims], isLoading: false }));
        return newWC;
      }
      const { data: row, error } = await supabase
        .from('warranty_claims')
        .insert({
          warranty_id:  data.warrantyId,
          owner_id:     data.ownerId,
          provider_id:  data.providerId,
          description:  data.description,
          status:       'submitted',
        })
        .select()
        .single();
      if (error) throw error;
      const newWC = row as unknown as WarrantyClaim;
      set(state => ({ warrantyClaims: [newWC, ...state.warrantyClaims], isLoading: false }));
      return newWC;
    } catch (err) {
      set({ error: String(err), isLoading: false });
      return null;
    }
  },

  // ── updateWarrantyClaimStatus ──────────────────────────────────────────────

  updateWarrantyClaimStatus: async (claimId, status, response) => {
    const now = new Date().toISOString();
    set({ isLoading: true, error: null });
    try {
      if (isDemoMode || !supabase) {
        await delay(300);
        set(state => ({
          warrantyClaims: state.warrantyClaims.map(wc =>
            wc.id === claimId ? {
              ...wc, status,
              providerResponse: response ?? wc.providerResponse,
              resolvedAt: status === 'resolved' ? now : wc.resolvedAt,
            } : wc
          ),
          isLoading: false,
        }));
        return;
      }
      const update: Record<string, unknown> = { status, updated_at: now };
      if (response) update.provider_response = response;
      if (status === 'resolved') update.resolved_at = now;
      await supabase.from('warranty_claims').update(update).eq('id', claimId);
      set(state => ({
        warrantyClaims: state.warrantyClaims.map(wc =>
          wc.id === claimId ? { ...wc, status, providerResponse: response ?? wc.providerResponse } : wc
        ),
        isLoading: false,
      }));
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  // ── loadCommissions ────────────────────────────────────────────────────────

  loadCommissions: async (agentId) => {
    set({ isLoading: true, error: null });
    try {
      if (isDemoMode || !supabase) {
        await delay(300);
        set({ commissions: mockCommissions.filter(c => c.agentId === agentId), isLoading: false });
        return;
      }
      const { data, error } = await supabase
        .from('agent_commissions')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ commissions: (data ?? []) as unknown as AgentCommission[], isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  // ── loadAgentPolicies ──────────────────────────────────────────────────────

  loadAgentPolicies: async (agentId) => {
    set({ isLoading: true, error: null });
    try {
      if (isDemoMode || !supabase) {
        await delay(300);
        set({ policies: mockPolicies.filter(p => p.agentId === agentId), isLoading: false });
        return;
      }
      const { data, error } = await supabase
        .from('insurance_policies')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ policies: (data ?? []) as unknown as InsurancePolicy[], isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  // ── loadInsurers ───────────────────────────────────────────────────────────

  loadInsurers: async () => {
    set({ isLoading: true, error: null });
    try {
      if (isDemoMode || !supabase) {
        await delay(300);
        set({ insurers: mockInsurers, isLoading: false });
        return;
      }
      const { data, error } = await supabase
        .from('insurers')
        .select('*')
        .eq('is_active', true)
        .order('legal_name');
      if (error) throw error;
      set({ insurers: (data ?? []) as unknown as Insurer[], isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  // ── loadInsurerAnalytics ───────────────────────────────────────────────────

  loadInsurerAnalytics: async (insurerId) => {
    set({ isLoading: true, error: null });
    try {
      if (isDemoMode || !supabase) {
        await delay(500);
        set({ analytics: mockInsurerAnalytics, isLoading: false });
        return;
      }
      // In live mode, compute analytics from policy + claim tables
      const [policiesRes, claimsRes] = await Promise.all([
        supabase.from('insurance_policies')
          .select('id, status, annual_premium_usd, agreed_value_usd, expiry_date')
          .eq('insurer_id', insurerId),
        supabase.from('insurance_claims')
          .select('id, status, approved_amount_usd, incident_type, created_at')
          .eq('insurer_id', insurerId),
      ]);
      if (policiesRes.error) throw policiesRes.error;
      if (claimsRes.error)   throw claimsRes.error;

      const policies = policiesRes.data ?? [];
      const claims   = claimsRes.data   ?? [];
      const now      = new Date();
      const today    = now.toISOString().split('T')[0];
      const in30     = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];
      const in60     = new Date(now.getTime() + 60 * 86400000).toISOString().split('T')[0];
      const in90     = new Date(now.getTime() + 90 * 86400000).toISOString().split('T')[0];

      const active = policies.filter(p => p.status === 'active' || p.status === 'expiring');
      const analytics: InsurerAnalytics = {
        insurerId,
        activePolicies: active.length,
        totalInsuredValueUsd: active.reduce((s: number, p: { agreed_value_usd: number }) => s + (p.agreed_value_usd || 0), 0),
        monthlyPremiumUsd: active.reduce((s: number, p: { annual_premium_usd: number }) => s + (p.annual_premium_usd || 0) / 12, 0),
        renewalRate: 0.82,
        openClaims: claims.filter(c => !['closed', 'paid', 'rejected'].includes(c.status)).length,
        avgTimeToClosedays: 14,
        lossRatioPct: 0.40,
        premiumTrend: [],
        claimsByType: [],
        topProducts: [],
        expiringPolicies30d: policies.filter(p => p.expiry_date >= today && p.expiry_date <= in30).length,
        expiringPolicies60d: policies.filter(p => p.expiry_date >= today && p.expiry_date <= in60).length,
        expiringPolicies90d: policies.filter(p => p.expiry_date >= today && p.expiry_date <= in90).length,
      };
      set({ analytics, isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  // ── Selectors ─────────────────────────────────────────────────────────────

  getActivePolicies: (ownerId) =>
    get().policies.filter(p => p.ownerId === ownerId && ['active', 'expiring'].includes(p.status)),

  getOpenClaims: (ownerId) =>
    get().claims.filter(c => c.ownerId === ownerId && !['closed', 'rejected'].includes(c.status)),

  getActiveWarranties: (ownerId) =>
    get().warranties.filter(w => w.ownerId === ownerId && w.status === 'active'),
}));
