/**
 * Marina Store — Module 5
 *
 * Manages all marina-related state:
 *   - Marina discovery & profiles
 *   - Berth availability & bookings
 *   - Provider partnership program
 *   - Enterprise analytics (computed from live data or mock)
 *   - Marina staff management
 *   - Marina reviews
 *
 * Dual-mode:
 *   isDemoMode=true  → mock data with simulated delays
 *   isDemoMode=false → Supabase (snake_case rows always mapped through
 *                      rowTo* helpers before entering store state)
 *
 * camelCase ↔ snake_case convention:
 *   All data entering the store is camelCase (TypeScript types).
 *   All data leaving for Supabase is snake_case (via *ToInsert helpers).
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
import {
  rowToMarina,
  rowToMarinaBerth,
  rowToMarinaBerthBooking,
  rowToMarinaStaff,
  rowToMarinaPartnership,
  rowToMarinaReview,
  marinaBerthBookingToInsert,
  marinaBerthBookingStatusToUpdate,
  marinaPartnershipToInsert,
  type MarinaRow,
  type MarinaBerthRow,
  type MarinaBerthBookingRow,
  type MarinaStaffRow,
  type MarinaProviderPartnershipRow,
  type MarinaReviewRow,
} from '../lib/supabaseTypes';
import type {
  Marina,
  MarinaBerth,
  MarinaBerthBooking,
  MarinaStaff,
  MarinaProviderPartnership,
  MarinaReview,
  MarinaAnalytics,
  OccupancyDataPoint,
  RevenueDataPoint,
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
  updateBookingStatus: (bookingId: string, status: BerthBookingStatus) => Promise<void>;
  loadPartnerships: (marinaId: string) => Promise<void>;
  applyForPartnership: (data: Partial<MarinaProviderPartnership>) => Promise<void>;
  updatePartnershipStatus: (partnershipId: string, status: PartnershipStatus, approverId?: string) => Promise<void>;
  loadStaff: (marinaId: string) => Promise<void>;
  loadReviews: (marinaId: string) => Promise<void>;
  loadAnalytics: (marinaId: string) => Promise<void>;
  getMarinasByOwner: (ownerId: string) => Marina[];
  getBookingsForMarina: (marinaId: string) => MarinaBerthBooking[];
  getActivePartnerships: (marinaId: string) => MarinaProviderPartnership[];
}

// ─── Analytics builder (live mode) ───────────────────────────────────────────
// Derives occupancy/revenue trend arrays from raw booking rows.

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function buildAnalyticsFromLiveData(
  marinaId: string,
  marina: Marina,
  bookingRows: MarinaBerthBookingRow[],
  berthRows: MarinaBerthRow[],
): MarinaAnalytics {
  const now = new Date();

  // Current occupancy from berths
  const totalBerths   = berthRows.length || marina.totalBerths;
  const occupiedBerths = berthRows.filter(b => b.status === 'occupied').length;
  const currentOccupancyPct = totalBerths > 0
    ? Math.round((occupiedBerths / totalBerths) * 100)
    : 0;

  // Monthly revenue (current month)
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const monthlyRevenue = bookingRows
    .filter(b =>
      ['CHECKED_IN','CHECKED_OUT','CONFIRMED'].includes(b.status) &&
      b.check_in_date >= thisMonthStart
    )
    .reduce((sum, b) => sum + (b.total_amount_usd || 0), 0);

  // YTD revenue
  const ytdStart = `${now.getFullYear()}-01-01`;
  const ytdRevenue = bookingRows
    .filter(b =>
      ['CHECKED_IN','CHECKED_OUT','CONFIRMED'].includes(b.status) &&
      b.check_in_date >= ytdStart
    )
    .reduce((sum, b) => sum + (b.total_amount_usd || 0), 0);

  // Average stay
  const completedBookings = bookingRows.filter(b =>
    ['CHECKED_IN','CHECKED_OUT','CONFIRMED'].includes(b.status) && b.nights > 0
  );
  const avgStayNights = completedBookings.length > 0
    ? +(completedBookings.reduce((sum, b) => sum + b.nights, 0) / completedBookings.length).toFixed(1)
    : 0;

  // Total unique guests
  const guestSet = new Set<string>();
  bookingRows.forEach(b => {
    if (b.owner_id) guestSet.add(b.owner_id);
    else if (b.guest_email) guestSet.add(b.guest_email);
  });
  const totalGuests = guestSet.size;

  // Occupancy trend: last 7 months
  const occupancyTrend: OccupancyDataPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthBookings = bookingRows.filter(b =>
      ['CHECKED_IN','CHECKED_OUT','CONFIRMED'].includes(b.status) &&
      b.check_in_date.startsWith(monthKey)
    );
    // Rough occupancy estimate: bookings / (days × berths) × 100
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const berthNightsAvailable = totalBerths * daysInMonth;
    const berthNightsBooked = monthBookings.reduce((sum, b) => sum + Math.min(b.nights, daysInMonth), 0);
    const pct = berthNightsAvailable > 0
      ? Math.min(100, Math.round((berthNightsBooked / berthNightsAvailable) * 100))
      : 0;
    occupancyTrend.push({
      date: MONTH_LABELS[d.getMonth()],
      occupancyPct: pct,
      berthsOccupied: Math.round((pct / 100) * totalBerths),
      totalBerths,
    });
  }

  // Revenue trend: last 7 months
  const revenueTrend: RevenueDataPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthBookings = bookingRows.filter(b =>
      ['CHECKED_IN','CHECKED_OUT','CONFIRMED'].includes(b.status) &&
      b.check_in_date.startsWith(monthKey)
    );
    const berthRevenue = monthBookings.reduce(
      (sum, b) => sum + (b.total_amount_usd - b.platform_fee_amount), 0
    );
    const serviceCommission = 0; // requires separate query on service bookings; set 0 for now
    revenueTrend.push({
      month: MONTH_LABELS[d.getMonth()],
      berthRevenue: Math.round(berthRevenue),
      serviceCommission,
      total: Math.round(berthRevenue + serviceCommission),
    });
  }

  // Month-over-month revenue change
  const prevMonthRevenue = revenueTrend.length >= 2
    ? revenueTrend[revenueTrend.length - 2].total
    : 0;
  const monthlyRevenueChange = prevMonthRevenue > 0
    ? +((((revenueTrend[revenueTrend.length - 1]?.total ?? 0) - prevMonthRevenue) / prevMonthRevenue) * 100).toFixed(1)
    : 0;

  // Fleet composition from berth bookings (join would need separate query; approximate)
  const fleetComposition = [
    { boatType: 'Motor Yacht',     count: 0, pct: 0 },
    { boatType: 'Sailing Yacht',   count: 0, pct: 0 },
    { boatType: 'Catamaran',       count: 0, pct: 0 },
    { boatType: 'Express Cruiser', count: 0, pct: 0 },
    { boatType: 'Other',           count: 0, pct: 0 },
  ];

  return {
    marinaId,
    currentOccupancyPct,
    occupiedBerths,
    totalBerths,
    monthlyRevenue: Math.round(monthlyRevenue),
    monthlyRevenueChange,
    ytdRevenue: Math.round(ytdRevenue),
    avgStayNights,
    totalGuests,
    occupancyTrend,
    revenueTrend,
    fleetComposition,
    serviceDemand: [],
    topOriginPorts: [],
  };
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

        const marinas: Marina[] = (data ?? []).map((r: MarinaRow) => rowToMarina(r));
        set({ marinas, isLoading: false });
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

        const berths: MarinaBerth[] = (data ?? []).map((r: MarinaBerthRow) => rowToMarinaBerth(r));
        set({ berths, isLoading: false });
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
        set({
          berthBookings: mockBerthBookings.filter(b => b.marinaId === marinaId),
          isLoading: false,
        });
      } else {
        if (!supabase) { set({ isLoading: false }); return; }

        const { data, error } = await supabase
          .from('marina_berth_bookings')
          .select('*')
          .eq('marina_id', marinaId)
          .order('check_in_date', { ascending: false });

        if (error) throw error;

        const berthBookings: MarinaBerthBooking[] = (data ?? []).map(
          (r: MarinaBerthBookingRow) => rowToMarinaBerthBooking(r)
        );
        set({ berthBookings, isLoading: false });
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
          id:                `booking-m${Date.now()}`,
          reference:         `YW-MARINA-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
          marinaId:          data.marinaId ?? '',
          marinaName:        data.marinaName ?? '',
          berthId:           data.berthId ?? '',
          berthName:         data.berthName ?? '',
          bookingSource:     data.bookingSource ?? 'online',
          checkInDate:       data.checkInDate ?? '',
          checkOutDate:      data.checkOutDate ?? '',
          nights:            data.nights ?? 1,
          rateSnapshotUsd:   data.rateSnapshotUsd ?? 0,
          totalAmountUsd:    data.totalAmountUsd ?? 0,
          platformFeeAmount: data.platformFeeAmount ?? 0,
          marinaPayoutAmount: data.marinaPayoutAmount ?? 0,
          status:            'CONFIRMED',
          ...data,
          createdAt:         new Date().toISOString(),
          updatedAt:         new Date().toISOString(),
        };
        set(state => ({
          berthBookings: [newBooking, ...state.berthBookings],
          berths: state.berths.map(b =>
            b.id === newBooking.berthId
              ? { ...b, status: 'reserved' as const, currentBookingId: newBooking.id }
              : b
          ),
        }));
        return newBooking;
      } else {
        if (!supabase) return null;

        // Convert camelCase data → snake_case insert row
        const insertRow = marinaBerthBookingToInsert(data);

        const { data: row, error } = await supabase
          .from('marina_berth_bookings')
          .insert(insertRow)
          .select()
          .single();

        if (error) throw error;

        const newBooking = rowToMarinaBerthBooking(row as MarinaBerthBookingRow);

        // Also mark the berth as reserved
        await supabase
          .from('marina_berths')
          .update({ status: 'reserved', current_booking_id: newBooking.id })
          .eq('id', newBooking.berthId);

        set(state => ({
          berthBookings: [newBooking, ...state.berthBookings],
          berths: state.berths.map(b =>
            b.id === newBooking.berthId
              ? { ...b, status: 'reserved' as const, currentBookingId: newBooking.id }
              : b
          ),
        }));

        return newBooking;
      }
    } catch (err) {
      console.error('[marinaStore] createBerthBooking:', err);
      return null;
    }
  },

  // ── Update booking status (check-in / check-out / cancel) ─────────────────

  updateBookingStatus: async (bookingId, status) => {
    try {
      const now = new Date().toISOString();

      if (isDemoMode) {
        // Build camelCase update for local state
        const localUpdate: Partial<MarinaBerthBooking> = { status, updatedAt: now };
        if (status === 'CHECKED_IN')  localUpdate.actualCheckInAt  = now;
        if (status === 'CHECKED_OUT') localUpdate.actualCheckOutAt = now;
        if (status === 'CANCELLED')   localUpdate.cancelledAt      = now;

        set(state => ({
          berthBookings: state.berthBookings.map(b =>
            b.id === bookingId ? { ...b, ...localUpdate } : b
          ),
          // Free the berth when a stay ends or booking is cancelled
          berths: (status === 'CHECKED_OUT' || status === 'CANCELLED')
            ? state.berths.map(b =>
                b.currentBookingId === bookingId
                  ? { ...b, status: 'available' as const, currentBookingId: undefined }
                  : b
              )
            : state.berths,
        }));
      } else {
        if (!supabase) return;

        // snake_case update object — no camelCase keys touch the wire
        const snakeUpdate = marinaBerthBookingStatusToUpdate(status, now);

        const { error } = await supabase
          .from('marina_berth_bookings')
          .update(snakeUpdate)
          .eq('id', bookingId);

        if (error) throw error;

        // Free berth in marina_berths table if applicable
        if (status === 'CHECKED_OUT' || status === 'CANCELLED') {
          const booking = get().berthBookings.find(b => b.id === bookingId);
          if (booking?.berthId) {
            await supabase
              .from('marina_berths')
              .update({ status: 'available', current_booking_id: null })
              .eq('id', booking.berthId);
          }
        }

        // Build camelCase update for local state optimistic refresh
        const localUpdate: Partial<MarinaBerthBooking> = { status, updatedAt: now };
        if (status === 'CHECKED_IN')  localUpdate.actualCheckInAt  = now;
        if (status === 'CHECKED_OUT') localUpdate.actualCheckOutAt = now;
        if (status === 'CANCELLED')   localUpdate.cancelledAt      = now;

        set(state => ({
          berthBookings: state.berthBookings.map(b =>
            b.id === bookingId ? { ...b, ...localUpdate } : b
          ),
          berths: (status === 'CHECKED_OUT' || status === 'CANCELLED')
            ? state.berths.map(b =>
                b.currentBookingId === bookingId
                  ? { ...b, status: 'available' as const, currentBookingId: undefined }
                  : b
              )
            : state.berths,
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
        set({
          partnerships: mockPartnerships.filter(p => p.marinaId === marinaId),
          isLoading: false,
        });
      } else {
        if (!supabase) { set({ isLoading: false }); return; }

        const { data, error } = await supabase
          .from('marina_provider_partnerships')
          .select('*')
          .eq('marina_id', marinaId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const partnerships: MarinaProviderPartnership[] = (data ?? []).map(
          (r: MarinaProviderPartnershipRow) => rowToMarinaPartnership(r)
        );
        set({ partnerships, isLoading: false });
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
          id:                   `partner-${Date.now()}`,
          marinaId:             data.marinaId ?? '',
          marinaName:           data.marinaName ?? '',
          providerId:           data.providerId ?? '',
          providerName:         data.providerName ?? '',
          providerBusinessName: data.providerBusinessName ?? '',
          tier:                 data.tier ?? 'standard',
          status:               'pending',
          commissionRate:       data.tier === 'exclusive' ? 0.12 : data.tier === 'preferred' ? 0.08 : 0,
          serviceCategories:    data.serviceCategories ?? [],
          createdAt:            new Date().toISOString(),
          updatedAt:            new Date().toISOString(),
        };
        set(state => ({ partnerships: [newPartnership, ...state.partnerships] }));
      } else {
        if (!supabase) return;

        // Convert camelCase → snake_case for Supabase insert
        const insertRow = marinaPartnershipToInsert(data);

        const { data: row, error } = await supabase
          .from('marina_provider_partnerships')
          .insert(insertRow)
          .select()
          .single();

        if (error) throw error;

        const newPartnership = rowToMarinaPartnership(row as MarinaProviderPartnershipRow);
        set(state => ({ partnerships: [newPartnership, ...state.partnerships] }));
      }
    } catch (err) {
      console.error('[marinaStore] applyForPartnership:', err);
    }
  },

  // ── Update partnership status (approve / reject / suspend) ────────────────

  updatePartnershipStatus: async (partnershipId, status, approverId) => {
    try {
      const now = new Date().toISOString();

      if (isDemoMode) {
        set(state => ({
          partnerships: state.partnerships.map(p =>
            p.id === partnershipId
              ? {
                  ...p,
                  status,
                  updatedAt: now,
                  ...(status === 'active' ? { approvedAt: now, approvedBy: approverId } : {}),
                }
              : p
          ),
        }));
      } else {
        if (!supabase) return;

        // Build snake_case update — all keys are snake_case for Supabase
        const snakeUpdate: {
          status: string;
          updated_at: string;
          approved_at?: string;
          approved_by?: string;
        } = { status, updated_at: now };

        if (status === 'active') {
          snakeUpdate.approved_at = now;
          if (approverId) snakeUpdate.approved_by = approverId;
        }

        const { error } = await supabase
          .from('marina_provider_partnerships')
          .update(snakeUpdate)
          .eq('id', partnershipId);

        if (error) throw error;

        // Optimistic local update using camelCase
        set(state => ({
          partnerships: state.partnerships.map(p =>
            p.id === partnershipId
              ? {
                  ...p,
                  status,
                  updatedAt: now,
                  ...(status === 'active' ? { approvedAt: now, approvedBy: approverId } : {}),
                }
              : p
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
        set({
          staff: mockMarinaStaff.filter(s => s.marinaId === marinaId),
          isLoading: false,
        });
      } else {
        if (!supabase) { set({ isLoading: false }); return; }

        const { data, error } = await supabase
          .from('marina_staff')
          .select('*')
          .eq('marina_id', marinaId)
          .eq('is_active', true);

        if (error) throw error;

        const staff: MarinaStaff[] = (data ?? []).map(
          (r: MarinaStaffRow) => rowToMarinaStaff(r)
        );
        set({ staff, isLoading: false });
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

        const reviews: MarinaReview[] = (data ?? []).map(
          (r: MarinaReviewRow) => rowToMarinaReview(r)
        );
        set({ reviews });
      }
    } catch (err) {
      console.error('[marinaStore] loadReviews:', err);
    }
  },

  // ── Load analytics ────────────────────────────────────────────────────────
  //
  // Live mode strategy:
  //   1. Fetch the marina_analytics_view for summary KPIs
  //   2. Fetch last 7 months of marina_berth_bookings to build trend arrays
  //   3. Fetch marina_berths for current status breakdown
  //   4. Assemble into MarinaAnalytics shape
  //
  // The analytics view does NOT contain trend arrays (occupancyTrend,
  // revenueTrend etc.) — those are computed client-side from raw booking rows.

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

        const sevenMonthsAgo = new Date();
        sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);
        const sevenMonthsAgoStr = sevenMonthsAgo.toISOString().split('T')[0];

        // Fetch all three data sources in parallel
        const [berthsResult, bookingsResult] = await Promise.all([
          supabase
            .from('marina_berths')
            .select('id, status, marina_id')
            .eq('marina_id', marinaId),
          supabase
            .from('marina_berth_bookings')
            .select('check_in_date, check_out_date, nights, total_amount_usd, platform_fee_amount, status, owner_id, guest_email, booking_source')
            .eq('marina_id', marinaId)
            .gte('check_in_date', sevenMonthsAgoStr)
            .in('status', ['CHECKED_IN', 'CHECKED_OUT', 'CONFIRMED']),
        ]);

        if (berthsResult.error) throw berthsResult.error;
        if (bookingsResult.error) throw bookingsResult.error;

        // Get marina profile for defaults
        const marina = get().marinas.find(m => m.id === marinaId);
        if (!marina) { set({ isLoading: false }); return; }

        const analyticsData = buildAnalyticsFromLiveData(
          marinaId,
          marina,
          (bookingsResult.data ?? []) as MarinaBerthBookingRow[],
          (berthsResult.data ?? []) as MarinaBerthRow[],
        );

        set(state => ({
          analytics: { ...state.analytics, [marinaId]: analyticsData },
          isLoading: false,
        }));
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
