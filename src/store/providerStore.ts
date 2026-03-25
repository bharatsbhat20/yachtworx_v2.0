/**
 * Provider Store — Module 2 TRD
 *
 * Handles provider services catalog, availability windows,
 * and provider discovery for the marketplace.
 *
 * Dual-mode:
 *   isDemoMode=true  → in-memory mock data
 *   isDemoMode=false → Supabase provider_services + provider_availability tables
 */

import { create } from 'zustand';
import type { ProviderService, ProviderAvailability, ProviderBlackout, TimeSlot } from '../types';
import { supabase, isDemoMode } from '../lib/supabase';
import { rowToProviderService, rowToAvailability } from '../lib/supabaseTypes';
import { mockProviderServices, mockProviderAvailability } from '../data/mockData';

// ─── Store Shape ──────────────────────────────────────────────────────────────

interface ProviderStore {
  services: ProviderService[];
  availability: ProviderAvailability[];
  blackouts: ProviderBlackout[];
  loading: boolean;
  error: string | null;

  // Read
  fetchServicesForProvider: (providerId: string) => Promise<void>;
  fetchAllServices: () => Promise<void>;
  fetchAvailability: (providerId: string) => Promise<void>;
  getAvailableSlots: (providerId: string, serviceId: string, date: string) => TimeSlot[];

  // Write (provider-side management)
  addService: (service: Omit<ProviderService, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateService: (id: string, updates: Partial<ProviderService>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  saveAvailability: (providerId: string, windows: Omit<ProviderAvailability, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;

  clearError: () => void;
}

// ─── Slot generation helper ───────────────────────────────────────────────────

function generateSlots(
  date: string,                   // YYYY-MM-DD local
  availability: ProviderAvailability[],
  durationMinutes: number
): TimeSlot[] {
  const day = new Date(date).getDay(); // 0=Sun
  const window = availability.find(a => a.dayOfWeek === day && a.isActive);
  if (!window) return [];

  const slots: TimeSlot[] = [];
  const [sh, sm] = window.startTime.split(':').map(Number);
  const [eh, em] = window.endTime.split(':').map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  const step = durationMinutes + window.bufferMinutes;

  for (let cur = startMins; cur + durationMinutes <= endMins; cur += step) {
    const slotStart = new Date(`${date}T${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}:00`);
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000);
    slots.push({
      start: slotStart.toISOString(),
      end: slotEnd.toISOString(),
      available: true,
    });
  }
  return slots;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useProviderStore = create<ProviderStore>((set, get) => ({
  services: [],
  availability: [],
  blackouts: [],
  loading: false,
  error: null,

  // ── Fetch services for one provider ───────────────────────────────────────
  fetchServicesForProvider: async (providerId) => {
    set({ loading: true, error: null });
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 200));
        set({ services: mockProviderServices.filter(s => s.providerId === providerId), loading: false });
        return;
      }
      const { data, error } = await supabase!
        .from('provider_services')
        .select('*')
        .eq('provider_id', providerId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      set({ services: (data ?? []).map(rowToProviderService), loading: false });
    } catch (e: any) {
      set({ error: e.message ?? 'Failed to load services', loading: false });
    }
  },

  // ── Fetch all services (marketplace discovery) ────────────────────────────
  fetchAllServices: async () => {
    set({ loading: true, error: null });
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 200));
        set({ services: mockProviderServices, loading: false });
        return;
      }
      const { data, error } = await supabase!
        .from('provider_services')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('name');
      if (error) throw error;
      set({ services: (data ?? []).map(rowToProviderService), loading: false });
    } catch (e: any) {
      set({ error: e.message ?? 'Failed to load services', loading: false });
    }
  },

  // ── Fetch availability ────────────────────────────────────────────────────
  fetchAvailability: async (providerId) => {
    set({ loading: true, error: null });
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 150));
        set({ availability: mockProviderAvailability.filter(a => a.providerId === providerId), loading: false });
        return;
      }
      const { data, error } = await supabase!
        .from('provider_availability')
        .select('*')
        .eq('provider_id', providerId)
        .eq('is_active', true);
      if (error) throw error;
      set({ availability: (data ?? []).map(rowToAvailability), loading: false });
    } catch (e: any) {
      set({ error: e.message ?? 'Failed to load availability', loading: false });
    }
  },

  // ── Compute available slots for a date ────────────────────────────────────
  getAvailableSlots: (providerId, serviceId, date) => {
    const { availability, services } = get();
    const svc = services.find(s => s.id === serviceId);
    if (!svc) return [];
    const avail = availability.filter(a => a.providerId === providerId);
    return generateSlots(date, avail, svc.durationMinutes);
  },

  // ── Add service ───────────────────────────────────────────────────────────
  addService: async (service) => {
    set({ loading: true, error: null });
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 300));
        const now = new Date().toISOString();
        const newSvc: ProviderService = { ...service, id: `svc-${Date.now()}`, createdAt: now, updatedAt: now };
        set(s => ({ services: [...s.services, newSvc], loading: false }));
        return;
      }
      const { data, error } = await supabase!
        .from('provider_services')
        .insert({
          provider_id: service.providerId,
          name: service.name,
          category: service.category,
          description: service.description,
          price_type: service.priceType,
          base_price: service.basePrice,
          duration_minutes: service.durationMinutes,
          is_active: service.isActive,
        })
        .select()
        .single();
      if (error) throw error;
      set(s => ({ services: [...s.services, rowToProviderService(data)], loading: false }));
    } catch (e: any) {
      set({ error: e.message ?? 'Failed to add service', loading: false });
    }
  },

  // ── Update service ────────────────────────────────────────────────────────
  updateService: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 200));
        set(s => ({
          services: s.services.map(svc =>
            svc.id === id ? { ...svc, ...updates, updatedAt: new Date().toISOString() } : svc
          ),
          loading: false,
        }));
        return;
      }
      const { error } = await supabase!
        .from('provider_services')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      set(s => ({
        services: s.services.map(svc =>
          svc.id === id ? { ...svc, ...updates, updatedAt: new Date().toISOString() } : svc
        ),
        loading: false,
      }));
    } catch (e: any) {
      set({ error: e.message ?? 'Failed to update service', loading: false });
    }
  },

  // ── Delete service (soft-delete via is_active=false) ──────────────────────
  deleteService: async (id) => {
    await get().updateService(id, { isActive: false });
  },

  // ── Save availability windows ─────────────────────────────────────────────
  saveAvailability: async (providerId, windows) => {
    set({ loading: true, error: null });
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 300));
        const now = new Date().toISOString();
        const newWindows: ProviderAvailability[] = windows.map((w, i) => ({
          ...w,
          id: `avail-${Date.now()}-${i}`,
          createdAt: now,
          updatedAt: now,
        }));
        set(s => ({
          availability: [
            ...s.availability.filter(a => a.providerId !== providerId),
            ...newWindows,
          ],
          loading: false,
        }));
        return;
      }
      // Upsert: delete existing then insert new
      await supabase!.from('provider_availability').delete().eq('provider_id', providerId);
      const rows = windows.map(w => ({
        provider_id: providerId,
        day_of_week: w.dayOfWeek,
        start_time: w.startTime,
        end_time: w.endTime,
        buffer_minutes: w.bufferMinutes,
        max_jobs_per_day: w.maxJobsPerDay,
        min_notice_hours: w.minNoticeHours,
        max_advance_days: w.maxAdvanceDays,
        is_active: w.isActive,
      }));
      const { data, error } = await supabase!.from('provider_availability').insert(rows).select();
      if (error) throw error;
      set(s => ({
        availability: [
          ...s.availability.filter(a => a.providerId !== providerId),
          ...(data ?? []).map(rowToAvailability),
        ],
        loading: false,
      }));
    } catch (e: any) {
      set({ error: e.message ?? 'Failed to save availability', loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
