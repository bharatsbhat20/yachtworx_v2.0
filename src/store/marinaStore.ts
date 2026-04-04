/**
 * Marina Store — Module 5
 *
 * Manages all marina-related state:
 *   - Marina discovery & profiles
 *   - Berth availability & bookings
 *   - Provider partnership program
 *   - Enterprise analytics
 *   - Marina staff management
 *   - Marina reviews
 *
 * Dual-mode: isDemoMode=true → mock data, isDemoMode=false → Supabase
 */

import { create } from 'zustand';
import { supabase, isDemoMode } from '../lib/supabase';
import {
  mockMarinas,
  mockBerths,
  mockBerthBookings,
  mockPartnerships,
  mockMarinaStaff,
  mockMarinaReviews,
  mockMarinaAnalytics,
} from '../data/marinaData';
import type {
  Marina,
  MarinaBerth,
  MarinaBerthBooking,
  MarinaStaff,
  MarinaProviderPartnership,
  MarinaReview,
  MarinaAnalytics,
  BerthBookingStatus,
  PartnershipStatus,
} from '../types';

// ─── Store interface ──────────────────────────────────────────────────────────

interface MarinaStoreState {
  // Discovery
  marinas: Marina[];
  selectedMarina: Marina | null;

  // Berths
  berths: MarinaBerth[];

  // Bookings
  berthBookings: MarinaBerthBooking[];

  // Partnerships
  partnerships: MarinaProviderPartnership[];

  // Staff
  staff: MarinaStaff[];

  // Reviews
  reviews: MarinaReview[];

  // Analytics
  analytics: Record<string, MarinaAnalytics>;

  // UI
  isLoading: boolean;
  error: string | null;

  // Actions
  loadMarinas: () => Promise<void>;
  selectMarina: (id: string) => void;
  clearSelectedMarina: () => void;
  loadBerths: (marinaId: string) => Promise<void>;
  loadBerthBookings: (marinaId: string) => Promise<void>;
  createBerthBooking: (data: Partial<MarinaBerthBooking>) => Promise<MarinaBerthBooking | null>;
  updateBookingStatus: (bookingId: string, status: BerthBookingStatus, meta?: Partial<MarinaBerthBooking>) => Promise<void>;
  loadPartnerships: (marinaId: string) => Promise<void>;
  applyForPartnership: (data: Partial<MarinaProviderPartnership>) => Promise<void>;
  updatePartnershipStatus: (partnershipId: string, status: PartnershipStatus) => Promise<void>;
  loadStaff: (marinaId: string) => Promise<void>;
  loadReviews: (marinaId: string) => Promise<void>;
  loadAnalytics: (marinaId: string) => Promise<void>;
  getMarinasByOwner: (ownerId: string) => Marina[];
  getBookingsForMarina: (marinaId: string) => MarinaBerthBooking[];
  getActivePartnerships: (marinaId: string) => MarinaProviderPartnership[];
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useMarinaStore = create<MarinaStoreState>((set, get) => ({
  marinas: [],
  selectedMarina: null,
  berths: [],
  berthBookings: [],
  partnerships: [],
  staff: [],
  reviews: [],
  analytics: {},
  isLoading: false,
  error: null,

  // ── Load all marinas (discovery) ──────────────────────────────────────────

  loadMarinas: async () => {
    set({ isLoading: true, error: null });
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 300));
        set({ marinas: mockMarinas, isLoading: false });
      } else {
        if (!supabase) { set({ isLoading: false }); return; }
        const { data, error } = await supabase
          .from('marinas')
          .select('*')
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        set({ marinas: data ?? [], isLoading: false });
      }
    } catch (err) {
      console.error('[marinaStore] loadMarinas:', err);
      set({ error: String(err), isLoading: false });
    }
  },

  selectMarina: (id) => {
    const marina = get().marinas.find(m => m.id === id) ?? null;
    set({ selectedMarina: marina });
  },

  clearSelectedMarina: () => set({ selectedMarina: null }),

  // ── Load berths for a marina ──────────────────────────────────────────────

  loadBerths: async (marinaId) => {
    set({ isLoading: true });
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 200));
        set({ berths: mockBerths.filter(b => b.marinaId === marinaId), isLoading: false });
      } else {
        if (!supabase) { set({ isLoading: false }); return; }
        const { data, error } = await supabase
          .from('marina_berths')
          .select('*')
          .eq('marina_id', marinaId)
          .order('name');
        if (error) throw error;
        set({ berths: data ?? [], isLoading: false });
      }
    } catch (err) {
      console.error('[marinaStore] loadBerths:', err);
      set({ error: String(err), isLoading: false });
    }
  },

  // ── Load berth bookings for a marina ──────────────────────────────────────

  loadBerthBookings: async (marinaId) => {
    set({ isLoading: true });
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 250));
        set({ berthBookings: mockBerthBookings.filter(b => b.marinaId === marinaId), isLoading: false });
      } else {
        if (!supabase) { set({ isLoading: false }); return; }
        const { data, error } = await supabase
          .from('marina_berth_bookings')
          .select('*')
          .eq('marina_id', marinaId)
          .order('check_in_date', { ascending: false });
        if (error) throw error;
        set({ berthBookings: data ?? [], isLoading: false });
      }
    } catch (err) {
      console.error('[marinaStore] loadBerthBookings:', err);
      set({ error: String(err), isLoading: false });
    }
  },

  // ── Create berth booking ──────────────────────────────────────────────────

  createBerthBooking: async (data) => {
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 400));
        const newBooking: MarinaBerthBooking = {
          id: `booking-m${Date.now()}`,
          reference: `YW-MARINA-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
          marinaId: data.marinaId ?? '',
          marinaName: data.marinaName ?? '',
          berthId: data.berthId ?? '',
          berthName: data.berthName ?? '',
          bookingSource: data.bookingSource ?? 'online',
          checkInDate: data.checkInDate ?? '',
          checkOutDate: data.checkOutDate ?? '',
          nights: data.nights ?? 1,
          rateSnapshotUsd: data.rateSnapshotUsd ?? 0,
          totalAmountUsd: data.totalAmountUsd ?? 0,
          platformFeeAmount: data.platformFeeAmount ?? 0,
          marinaPayoutAmount: data.marinaPayoutAmount ?? 0,
          status: 'CONFIRMED',
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set(state => ({
          berthBookings: [newBooking, ...state.berthBookings],
          berths: state.berths.map(b =>
            b.id === newBooking.berthId
              ? { ...b, status: 'reserved', currentBookingId: newBooking.id }
              : b
          ),
        }));
        return newBooking;
      } else {
        if (!supabase) return null;
        const { data: row, error } = await supabase
          .from('marina_berth_bookings')
          .insert(data)
          .select()
          .single();
        if (error) throw error;
        set(state => ({ berthBookings: [row, ...state.berthBookings] }));
        return row;
      }
    } catch (err) {
      console.error('[marinaStore] createBerthBooking:', err);
      return null;
    }
  },

  // ── Update booking status (check-in, check-out, cancel) ──────────────────

  updateBookingStatus: async (bookingId, status, meta = {}) => {
    try {
      const now = new Date().toISOString();
      const updates: Partial<MarinaBerthBooking> = { status, updatedAt: now, ...meta };
      if (status === 'CHECKED_IN')  updates.actualCheckInAt  = now;
      if (status === 'CHECKED_OUT') updates.actualCheckOutAt = now;
      if (status === 'CANCELLED')   updates.cancelledAt      = now;

      if (isDemoMode) {
        set(state => ({
          berthBookings: state.berthBookings.map(b =>
            b.id === bookingId ? { ...b, ...updates } : b
          ),
          berths: status === 'CHECKED_OUT' || status === 'CANCELLED'
            ? state.berths.map(b =>
                b.currentBookingId === bookingId
                  ? { ...b, status: 'available', currentBookingId: undefined }
                  : b
              )
            : state.berths,
        }));
      } else {
        if (!supabase) return;
        await supabase
          .from('marina_berth_bookings')
          .update(updates)
          .eq('id', bookingId);
        set(state => ({
          berthBookings: state.berthBookings.map(b =>
            b.id === bookingId ? { ...b, ...updates } : b
          ),
        }));
      }
    } catch (err) {
      console.error('[marinaStore] updateBookingStatus:', err);
    }
  },

  // ── Load partnerships ─────────────────────────────────────────────────────

  loadPartnerships: async (marinaId) => {
    set({ isLoading: true });
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 200));
        set({ partnerships: mockPartnerships.filter(p => p.marinaId === marinaId), isLoading: false });
      } else {
        if (!supabase) { set({ isLoading: false }); return; }
        const { data, error } = await supabase
          .from('marina_provider_partnerships')
          .select('*')
          .eq('marina_id', marinaId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        set({ partnerships: data ?? [], isLoading: false });
      }
    } catch (err) {
      console.error('[marinaStore] loadPartnerships:', err);
      set({ error: String(err), isLoading: false });
    }
  },

  // ── Apply for partnership ─────────────────────────────────────────────────

  applyForPartnership: async (data) => {
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 400));
        const newPartnership: MarinaProviderPartnership = {
          id: `partner-${Date.now()}`,
          marinaId: data.marinaId ?? '',
          marinaName: data.marinaName ?? '',
          providerId: data.providerId ?? '',
          providerName: data.providerName ?? '',
          providerBusinessName: data.providerBusinessName ?? '',
          tier: data.tier ?? 'standard',
          status: 'pending',
          commissionRate: data.tier === 'exclusive' ? 0.12 : data.tier === 'preferred' ? 0.08 : 0,
          serviceCategories: data.serviceCategories ?? [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set(state => ({ partnerships: [newPartnership, ...state.partnerships] }));
      } else {
        if (!supabase) return;
        const { data: row, error } = await supabase
          .from('marina_provider_partnerships')
          .insert(data)
          .select()
          .single();
        if (error) throw error;
        set(state => ({ partnerships: [row, ...state.partnerships] }));
      }
    } catch (err) {
      console.error('[marinaStore] applyForPartnership:', err);
    }
  },

  // ── Update partnership status (approve/reject/suspend) ───────────────────

  updatePartnershipStatus: async (partnershipId, status) => {
    try {
      const now = new Date().toISOString();
      if (isDemoMode) {
        set(state => ({
          partnerships: state.partnerships.map(p =>
            p.id === partnershipId
              ? { ...p, status, updatedAt: now, ...(status === 'active' ? { approvedAt: now } : {}) }
              : p
          ),
        }));
      } else {
        if (!supabase) return;
        await supabase
          .from('marina_provider_partnerships')
          .update({ status, updated_at: now })
          .eq('id', partnershipId);
        set(state => ({
          partnerships: state.partnerships.map(p =>
            p.id === partnershipId ? { ...p, status } : p
          ),
        }));
      }
    } catch (err) {
      console.error('[marinaStore] updatePartnershipStatus:', err);
    }
  },

  // ── Load staff ────────────────────────────────────────────────────────────

  loadStaff: async (marinaId) => {
    set({ isLoading: true });
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 150));
        set({ staff: mockMarinaStaff.filter(s => s.marinaId === marinaId), isLoading: false });
      } else {
        if (!supabase) { set({ isLoading: false }); return; }
        const { data, error } = await supabase
          .from('marina_staff')
          .select('*')
          .eq('marina_id', marinaId)
          .eq('is_active', true);
        if (error) throw error;
        set({ staff: data ?? [], isLoading: false });
      }
    } catch (err) {
      console.error('[marinaStore] loadStaff:', err);
      set({ error: String(err), isLoading: false });
    }
  },

  // ── Load reviews ──────────────────────────────────────────────────────────

  loadReviews: async (marinaId) => {
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 150));
        set({ reviews: mockMarinaReviews.filter(r => r.marinaId === marinaId) });
      } else {
        if (!supabase) return;
        const { data, error } = await supabase
          .from('marina_reviews')
          .select('*')
          .eq('marina_id', marinaId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        set({ reviews: data ?? [] });
      }
    } catch (err) {
      console.error('[marinaStore] loadReviews:', err);
    }
  },

  // ── Load analytics ────────────────────────────────────────────────────────

  loadAnalytics: async (marinaId) => {
    set({ isLoading: true });
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 500));
        const data = mockMarinaAnalytics[marinaId];
        if (data) {
          set(state => ({
            analytics: { ...state.analytics, [marinaId]: data },
            isLoading: false,
          }));
        } else {
          set({ isLoading: false });
        }
      } else {
        if (!supabase) { set({ isLoading: false }); return; }
        // In live mode, analytics come from a pre-computed materialized view
        const { data, error } = await supabase
          .from('marina_analytics_view')
          .select('*')
          .eq('marina_id', marinaId)
          .single();
        if (error) throw error;
        if (data) {
          set(state => ({
            analytics: { ...state.analytics, [marinaId]: data },
            isLoading: false,
          }));
        }
      }
    } catch (err) {
      console.error('[marinaStore] loadAnalytics:', err);
      set({ error: String(err), isLoading: false });
    }
  },

  // ── Selectors ─────────────────────────────────────────────────────────────

  getMarinasByOwner: (ownerId) => {
    return get().marinas.filter(m => m.ownerId === ownerId);
  },

  getBookingsForMarina: (marinaId) => {
    return get().berthBookings.filter(b => b.marinaId === marinaId);
  },

  getActivePartnerships: (marinaId) => {
    return get().partnerships.filter(p => p.marinaId === marinaId && p.status === 'active');
  },
}));
