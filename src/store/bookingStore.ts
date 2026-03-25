/**
 * Booking Store — Module 2 TRD
 *
 * Dual-mode:
 *   isDemoMode=true  → operates on in-memory mockBookings (localStorage persistence)
 *   isDemoMode=false → reads/writes Supabase `bookings` + `payments` tables via RLS
 */

import { create } from 'zustand';
import type { Booking, BookingStatus, CreateBookingFormData, Review } from '../types';
import { supabase, isDemoMode } from '../lib/supabase';
import { rowToBooking, rowToReview } from '../lib/supabaseTypes';
import { mockBookings, mockReviews, mockProviderServices } from '../data/mockData';

// ─── Store Shape ──────────────────────────────────────────────────────────────

interface BookingStore {
  bookings: Booking[];
  reviews: Review[];
  loading: boolean;
  error: string | null;

  // Read
  fetchBookings: (userId: string, role: 'owner' | 'provider') => Promise<void>;
  fetchReviews: (providerId: string) => Promise<void>;
  getBookingById: (id: string) => Booking | undefined;

  // Write
  createBooking: (data: CreateBookingFormData, userId: string) => Promise<Booking | null>;
  updateBookingStatus: (bookingId: string, status: BookingStatus, meta?: Partial<Booking>) => Promise<void>;
  cancelBooking: (bookingId: string, reason: string, cancelledBy: 'owner' | 'provider' | 'admin') => Promise<void>;
  submitReview: (bookingId: string, rating: number, comment: string, reviewerId: string, providerId: string) => Promise<void>;

  clearError: () => void;
}

// ─── Local demo ID generator ──────────────────────────────────────────────────

let _demoBookingSeq = 7;
function nextDemoRef(): { id: string; reference: string } {
  const seq = _demoBookingSeq++;
  const year = new Date().getFullYear();
  return {
    id: `bk-${seq}`,
    reference: `YW-${year}-${String(seq).padStart(6, '0')}`,
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useBookingStore = create<BookingStore>((set, get) => ({
  bookings: [],
  reviews: [],
  loading: false,
  error: null,

  // ── Fetch bookings ─────────────────────────────────────────────────────────
  fetchBookings: async (userId, role) => {
    set({ loading: true, error: null });
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 300));
        const filtered = role === 'owner'
          ? mockBookings.filter(b => b.ownerId === userId)
          : mockBookings.filter(b => b.providerId === userId);
        set({ bookings: filtered, loading: false });
        return;
      }

      const col = role === 'owner' ? 'owner_id' : 'provider_id';
      const { data, error } = await supabase!
        .from('bookings')
        .select('*')
        .eq(col, userId)
        .is('deleted_at', null)
        .order('scheduled_start', { ascending: false });

      if (error) throw error;
      set({ bookings: (data ?? []).map(rowToBooking), loading: false });
    } catch (e: any) {
      set({ error: e.message ?? 'Failed to load bookings', loading: false });
    }
  },

  // ── Fetch reviews ─────────────────────────────────────────────────────────
  fetchReviews: async (providerId) => {
    set({ loading: true, error: null });
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 200));
        set({ reviews: mockReviews.filter(r => r.providerId === providerId), loading: false });
        return;
      }

      const { data, error } = await supabase!
        .from('reviews')
        .select('*')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ reviews: (data ?? []).map(rowToReview), loading: false });
    } catch (e: any) {
      set({ error: e.message ?? 'Failed to load reviews', loading: false });
    }
  },

  // ── Get single booking ────────────────────────────────────────────────────
  getBookingById: (id) => get().bookings.find(b => b.id === id),

  // ── Create booking ────────────────────────────────────────────────────────
  createBooking: async (data, userId) => {
    set({ loading: true, error: null });
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 500));
        const svc = mockProviderServices.find(s => s.id === data.serviceId);
        if (!svc) throw new Error('Service not found');
        const { id, reference } = nextDemoRef();
        const start = data.proposedStart;
        const end = new Date(new Date(start).getTime() + svc.durationMinutes * 60_000).toISOString();
        const amount = svc.basePrice ?? 0;
        const platformFeeAmount = Math.round(amount * 0.12 * 100) / 100;
        const booking: Booking = {
          id,
          reference,
          ownerId: userId,
          providerId: data.providerId,
          boatId: data.boatId,
          serviceId: data.serviceId,
          serviceName: svc.name,
          serviceType: svc.category,
          location: data.location,
          locationType: data.locationType,
          scheduledStart: start,
          scheduledEnd: end,
          durationMinutes: svc.durationMinutes,
          priceType: svc.priceType,
          priceAmount: amount,
          currency: 'usd',
          platformFeePercent: 0.12,
          platformFeeAmount,
          providerPayoutAmount: Math.round((amount - platformFeeAmount) * 100) / 100,
          status: svc.priceType === 'quote' ? 'PENDING' : 'PENDING',
          bookingMode: 'request_to_book',
          notes: data.notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set(s => ({ bookings: [booking, ...s.bookings], loading: false }));
        return booking;
      }

      const { data: row, error } = await supabase!
        .from('bookings')
        .insert({
          owner_id: userId,
          provider_id: data.providerId,
          boat_id: data.boatId,
          service_id: data.serviceId,
          location: data.location,
          location_type: data.locationType,
          scheduled_start: data.proposedStart,
          notes: data.notes,
          status: 'PENDING',
          booking_mode: 'request_to_book',
          currency: 'usd',
          platform_fee_percent: 0.12,
          price_amount: 0,
          platform_fee_amount: 0,
          provider_payout_amount: 0,
        })
        .select()
        .single();

      if (error) throw error;
      const booking = rowToBooking(row);
      set(s => ({ bookings: [booking, ...s.bookings], loading: false }));
      return booking;
    } catch (e: any) {
      set({ error: e.message ?? 'Failed to create booking', loading: false });
      return null;
    }
  },

  // ── Update status ─────────────────────────────────────────────────────────
  updateBookingStatus: async (bookingId, status, meta = {}) => {
    set({ loading: true, error: null });
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 300));
        set(s => ({
          bookings: s.bookings.map(b =>
            b.id === bookingId
              ? { ...b, status, ...meta, updatedAt: new Date().toISOString() }
              : b
          ),
          loading: false,
        }));
        return;
      }

      const { error } = await supabase!
        .from('bookings')
        .update({ status, updated_at: new Date().toISOString(), ...meta })
        .eq('id', bookingId);

      if (error) throw error;
      set(s => ({
        bookings: s.bookings.map(b =>
          b.id === bookingId
            ? { ...b, status, ...meta, updatedAt: new Date().toISOString() }
            : b
        ),
        loading: false,
      }));
    } catch (e: any) {
      set({ error: e.message ?? 'Failed to update booking', loading: false });
    }
  },

  // ── Cancel booking ────────────────────────────────────────────────────────
  cancelBooking: async (bookingId, reason, cancelledBy) => {
    const now = new Date().toISOString();
    await get().updateBookingStatus(bookingId, 'CANCELLED', {
      cancellationReason: reason,
      cancelledBy,
      cancelledAt: now,
    });
  },

  // ── Submit review ─────────────────────────────────────────────────────────
  submitReview: async (bookingId, rating, comment, reviewerId, providerId) => {
    set({ loading: true, error: null });
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 300));
        const review: Review = {
          id: `rev-${Date.now()}`,
          bookingId,
          reviewerId,
          providerId,
          rating,
          comment,
          createdAt: new Date().toISOString(),
        };
        set(s => ({ reviews: [review, ...s.reviews], loading: false }));
        return;
      }

      const { data, error } = await supabase!
        .from('reviews')
        .insert({ booking_id: bookingId, reviewer_id: reviewerId, provider_id: providerId, rating, comment })
        .select()
        .single();

      if (error) throw error;
      set(s => ({ reviews: [rowToReview(data), ...s.reviews], loading: false }));
    } catch (e: any) {
      set({ error: e.message ?? 'Failed to submit review', loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
