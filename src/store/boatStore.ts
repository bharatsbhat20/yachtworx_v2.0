/**
 * Boat Store — TRD Sections 4.2, 4.3, 4.6, 6.2, 6.4
 *
 * Dual-mode:
 *   isDemoMode=true  → localStorage persistence with mock seed data
 *   isDemoMode=false → real Supabase CRUD (boats, boat_components, maintenance_documents)
 *
 * All mutations are async (returns Promise) so callers can await them in both modes.
 */

import { create } from 'zustand';
import type { Boat, BoatComponent, MaintenanceDocument, VesselHealthScore, AddBoatFormData, BoatType } from '../types';
import { DEFAULT_COMPONENTS } from '../types';
import { mockBoats } from '../data/mockData';
import { calculateVesselHealth } from '../utils/healthScore';
import { supabase, isDemoMode } from '../lib/supabase';
import {
  rowToBoat, boatToInsert,
  rowToComponent, componentToInsert,
  rowToDocument, documentToInsert,
} from '../lib/supabaseTypes';

const STORAGE_KEY = 'yw_boats';

// ─── Demo persistence helpers ─────────────────────────────────────────────────

function loadFromStorage(): Boat[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Boat[];
  } catch { /* ignore */ }
  return mockBoats;
}

function saveToStorage(boats: Boat[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(boats)); } catch { /* ignore */ }
}

// ─── ID generator ─────────────────────────────────────────────────────────────

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Default components builder ───────────────────────────────────────────────

function buildDefaultComponents(boatId: string, boatType: BoatType): BoatComponent[] {
  const templates = DEFAULT_COMPONENTS[boatType] || DEFAULT_COMPONENTS['other'];
  const now = new Date().toISOString();
  return templates.map(t => ({
    id: genId('comp'),
    boatId,
    name: t.name,
    category: t.category,
    serviceIntervalDays: t.serviceIntervalDays,
    status: 'good' as const,
    nextDue: '',
    createdAt: now,
    updatedAt: now,
  }));
}

// ─── State interface ─────────────────────────────────────────────────────────

interface BoatState {
  boats: Boat[];
  selectedBoat: Boat | null;
  isLoading: boolean;
  error: string | null;

  // Lifecycle
  loadBoats: (ownerId: string) => Promise<void>;
  clearBoats: () => void;

  // Selection
  selectBoat: (id: string) => void;
  clearSelection: () => void;

  // Boat CRUD
  addBoat: (data: AddBoatFormData, ownerId: string) => Promise<Boat>;
  updateBoat: (id: string, updates: Partial<Boat>) => Promise<void>;
  deleteBoat: (id: string) => Promise<void>;

  // Component CRUD
  addComponent: (boatId: string, component: Omit<BoatComponent, 'id' | 'boatId' | 'createdAt' | 'updatedAt'>) => Promise<BoatComponent>;
  updateComponent: (boatId: string, componentId: string, updates: Partial<BoatComponent>) => Promise<void>;
  deleteComponent: (boatId: string, componentId: string) => Promise<void>;

  // Document management
  addDocument: (boatId: string, doc: Omit<MaintenanceDocument, 'id' | 'createdAt'>) => Promise<MaintenanceDocument>;
  deleteDocument: (boatId: string, documentId: string) => Promise<void>;

  // Health score
  getHealthScore: (boatId: string) => VesselHealthScore;

  // Utils
  getBoatsByOwner: (ownerId: string) => Boat[];
  resetToMockData: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useBoatStore = create<BoatState>((set, get) => ({
  boats: isDemoMode ? loadFromStorage() : [],
  selectedBoat: null,
  isLoading: false,
  error: null,

  // ── loadBoats ───────────────────────────────────────────────────────────────
  loadBoats: async (ownerId) => {
    if (isDemoMode || !supabase) return; // demo mode uses localStorage, already loaded

    set({ isLoading: true, error: null });
    try {
      // 1. Fetch boats
      const { data: boatRows, error: boatErr } = await supabase
        .from('boats')
        .select('*')
        .eq('owner_id', ownerId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (boatErr) throw boatErr;
      if (!boatRows?.length) { set({ boats: [], isLoading: false }); return; }

      const boatIds = boatRows.map(b => b.id);

      // 2. Fetch all components for those boats in one query
      const { data: compRows } = await supabase
        .from('boat_components')
        .select('*')
        .in('boat_id', boatIds)
        .is('deleted_at', null);

      // 3. Fetch all documents
      const { data: docRows } = await supabase
        .from('maintenance_documents')
        .select('*')
        .in('boat_id', boatIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // 4. Assemble boats with nested relations
      const boats: Boat[] = boatRows.map(br => {
        const boat = rowToBoat(br);
        boat.components = (compRows ?? [])
          .filter(c => c.boat_id === br.id)
          .map(rowToComponent);
        boat.documents = (docRows ?? [])
          .filter(d => d.boat_id === br.id)
          .map(rowToDocument);
        return boat;
      });

      set({ boats, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load boats';
      set({ error: msg, isLoading: false });
    }
  },

  clearBoats: () => set({ boats: [], selectedBoat: null }),

  // ── Selection ──────────────────────────────────────────────────────────────
  selectBoat: (id) =>
    set(state => ({
      selectedBoat: state.boats.find(b => b.id === id && !b.deletedAt) || null,
    })),

  clearSelection: () => set({ selectedBoat: null }),

  // ── addBoat ─────────────────────────────────────────────────────────────────
  addBoat: async (data, ownerId) => {
    const now = new Date().toISOString();
    const boatType = (data.boatType || 'other') as BoatType;
    const id = isDemoMode ? genId('boat') : crypto.randomUUID();

    const newBoat: Boat = {
      id,
      ownerId,
      name: data.name,
      make: data.make,
      model: data.model,
      year: Number(data.year),
      boatType,
      lengthOverall: data.lengthOverall !== '' ? Number(data.lengthOverall) : undefined,
      length: data.lengthOverall !== '' ? Number(data.lengthOverall) : undefined,
      beam: data.beam !== '' ? Number(data.beam) : undefined,
      draft: data.draft !== '' ? Number(data.draft) : undefined,
      hullMaterial: data.hullMaterial || undefined,
      engineType: data.engineType || undefined,
      fuelType: data.fuelType || undefined,
      displacement: data.displacement !== '' ? Number(data.displacement) : undefined,
      specsSource: data.specsSource,
      homePort: data.homePort || undefined,
      registrationNumber: data.registrationNumber || undefined,
      hullId: data.hullId || undefined,
      estimatedValue: data.estimatedValue !== '' ? Number(data.estimatedValue) : undefined,
      currentValue: data.estimatedValue !== '' ? Number(data.estimatedValue) : undefined,
      photoUrl: data.photoUrl || undefined,
      image: data.photoUrl || undefined,
      type: boatType.replace(/_/g, ' '),
      components: buildDefaultComponents(id, boatType),
      documents: [],
      serviceHistory: [],
      alerts: [],
      createdAt: now,
      updatedAt: now,
    };

    if (isDemoMode || !supabase) {
      const updated = [...get().boats, newBoat];
      saveToStorage(updated);
      set({ boats: updated });
      return newBoat;
    }

    // Live mode — insert boat, then insert default components
    const { data: inserted, error } = await supabase
      .from('boats')
      .insert(boatToInsert({ ...newBoat, id }))
      .select()
      .single();

    if (error) throw new Error(`Failed to create boat: ${error.message}`);

    // Insert default components
    const compInserts = newBoat.components.map(c => componentToInsert(c));
    if (compInserts.length) {
      const { data: insertedComps } = await supabase
        .from('boat_components')
        .insert(compInserts)
        .select();
      newBoat.components = (insertedComps ?? []).map(rowToComponent);
    }

    const finalBoat = { ...rowToBoat(inserted), components: newBoat.components, documents: [] };
    set(state => ({ boats: [...state.boats, finalBoat] }));
    return finalBoat;
  },

  // ── updateBoat ──────────────────────────────────────────────────────────────
  updateBoat: async (id, updates) => {
    const now = new Date().toISOString();

    if (isDemoMode || !supabase) {
      const updated = get().boats.map(b =>
        b.id === id
          ? {
              ...b, ...updates, updatedAt: now,
              length: updates.lengthOverall ?? b.lengthOverall ?? b.length,
              image: updates.photoUrl ?? b.photoUrl ?? b.image,
              currentValue: updates.estimatedValue ?? b.estimatedValue ?? b.currentValue,
            }
          : b
      );
      saveToStorage(updated);
      set(state => ({
        boats: updated,
        selectedBoat: state.selectedBoat?.id === id
          ? updated.find(b => b.id === id) || null
          : state.selectedBoat,
      }));
      return;
    }

    const { error } = await supabase
      .from('boats')
      .update({
        name: updates.name,
        make: updates.make ?? null,
        model: updates.model ?? null,
        year: updates.year ?? null,
        boat_type: updates.boatType ?? null,
        length_overall: updates.lengthOverall ?? updates.length ?? null,
        beam: updates.beam ?? null,
        draft: updates.draft ?? null,
        hull_material: updates.hullMaterial ?? null,
        engine_type: updates.engineType ?? null,
        fuel_type: updates.fuelType ?? null,
        displacement: updates.displacement ?? null,
        home_port: updates.homePort ?? null,
        hull_id: updates.hullId ?? null,
        registration_number: updates.registrationNumber ?? null,
        estimated_value: updates.estimatedValue ?? updates.currentValue ?? null,
        photo_url: updates.photoUrl ?? updates.image ?? null,
        specs_source: updates.specsSource ?? null,
        flag: updates.flag ?? null,
      })
      .eq('id', id);

    if (error) throw new Error(`Failed to update boat: ${error.message}`);

    set(state => {
      const updated = state.boats.map(b =>
        b.id === id ? { ...b, ...updates, updatedAt: now } : b
      );
      return {
        boats: updated,
        selectedBoat: state.selectedBoat?.id === id
          ? updated.find(b => b.id === id) || null
          : state.selectedBoat,
      };
    });
  },

  // ── deleteBoat ──────────────────────────────────────────────────────────────
  deleteBoat: async (id) => {
    const now = new Date().toISOString();

    if (isDemoMode || !supabase) {
      const updated = get().boats.map(b =>
        b.id === id ? { ...b, deletedAt: now, updatedAt: now } : b
      );
      saveToStorage(updated);
      set(state => ({
        boats: updated,
        selectedBoat: state.selectedBoat?.id === id ? null : state.selectedBoat,
      }));
      return;
    }

    const { error } = await supabase
      .from('boats')
      .update({ deleted_at: now })
      .eq('id', id);

    if (error) throw new Error(`Failed to delete boat: ${error.message}`);

    set(state => ({
      boats: state.boats.map(b => b.id === id ? { ...b, deletedAt: now } : b),
      selectedBoat: state.selectedBoat?.id === id ? null : state.selectedBoat,
    }));
  },

  // ── addComponent ────────────────────────────────────────────────────────────
  addComponent: async (boatId, componentData) => {
    const now = new Date().toISOString();
    const newComp: BoatComponent = {
      id: isDemoMode ? genId('comp') : crypto.randomUUID(),
      boatId,
      createdAt: now,
      updatedAt: now,
      ...componentData,
    };

    if (isDemoMode || !supabase) {
      const updated = get().boats.map(b =>
        b.id === boatId
          ? { ...b, components: [...b.components, newComp], updatedAt: now }
          : b
      );
      saveToStorage(updated);
      set(state => ({
        boats: updated,
        selectedBoat: state.selectedBoat?.id === boatId
          ? updated.find(b => b.id === boatId) || null
          : state.selectedBoat,
      }));
      return newComp;
    }

    const { data, error } = await supabase
      .from('boat_components')
      .insert(componentToInsert({ ...newComp }))
      .select()
      .single();

    if (error) throw new Error(`Failed to add component: ${error.message}`);

    const saved = rowToComponent(data);
    set(state => {
      const updated = state.boats.map(b =>
        b.id === boatId
          ? { ...b, components: [...b.components, saved], updatedAt: now }
          : b
      );
      return {
        boats: updated,
        selectedBoat: state.selectedBoat?.id === boatId
          ? updated.find(b => b.id === boatId) || null
          : state.selectedBoat,
      };
    });
    return saved;
  },

  // ── updateComponent ─────────────────────────────────────────────────────────
  updateComponent: async (boatId, componentId, updates) => {
    const now = new Date().toISOString();

    if (isDemoMode || !supabase) {
      const updated = get().boats.map(b => {
        if (b.id !== boatId) return b;
        return {
          ...b, updatedAt: now,
          components: b.components.map(c =>
            c.id === componentId ? { ...c, ...updates, updatedAt: now } : c
          ),
        };
      });
      saveToStorage(updated);
      set(state => ({
        boats: updated,
        selectedBoat: state.selectedBoat?.id === boatId
          ? updated.find(b => b.id === boatId) || null
          : state.selectedBoat,
      }));
      return;
    }

    const { error } = await supabase
      .from('boat_components')
      .update({
        name: updates.name,
        category: updates.category,
        install_date: updates.installDate ?? null,
        last_serviced_date: updates.lastServicedDate ?? updates.lastChecked ?? null,
        service_interval_days: updates.serviceIntervalDays ?? null,
        notes: updates.notes ?? null,
      })
      .eq('id', componentId);

    if (error) throw new Error(`Failed to update component: ${error.message}`);

    set(state => {
      const updated = state.boats.map(b => {
        if (b.id !== boatId) return b;
        return {
          ...b, updatedAt: now,
          components: b.components.map(c =>
            c.id === componentId ? { ...c, ...updates, updatedAt: now } : c
          ),
        };
      });
      return {
        boats: updated,
        selectedBoat: state.selectedBoat?.id === boatId
          ? updated.find(b => b.id === boatId) || null
          : state.selectedBoat,
      };
    });
  },

  // ── deleteComponent ─────────────────────────────────────────────────────────
  deleteComponent: async (boatId, componentId) => {
    const now = new Date().toISOString();

    if (isDemoMode || !supabase) {
      const updated = get().boats.map(b => {
        if (b.id !== boatId) return b;
        return {
          ...b, updatedAt: now,
          components: b.components.map(c =>
            c.id === componentId ? { ...c, deletedAt: now, updatedAt: now } : c
          ),
        };
      });
      saveToStorage(updated);
      set(state => ({
        boats: updated,
        selectedBoat: state.selectedBoat?.id === boatId
          ? updated.find(b => b.id === boatId) || null
          : state.selectedBoat,
      }));
      return;
    }

    const { error } = await supabase
      .from('boat_components')
      .update({ deleted_at: now })
      .eq('id', componentId);

    if (error) throw new Error(`Failed to delete component: ${error.message}`);

    set(state => {
      const updated = state.boats.map(b => {
        if (b.id !== boatId) return b;
        return {
          ...b, updatedAt: now,
          components: b.components.map(c =>
            c.id === componentId ? { ...c, deletedAt: now } : c
          ),
        };
      });
      return {
        boats: updated,
        selectedBoat: state.selectedBoat?.id === boatId
          ? updated.find(b => b.id === boatId) || null
          : state.selectedBoat,
      };
    });
  },

  // ── addDocument ─────────────────────────────────────────────────────────────
  addDocument: async (boatId, docData) => {
    const now = new Date().toISOString();
    const newDoc: MaintenanceDocument = {
      id: isDemoMode ? genId('doc') : crypto.randomUUID(),
      createdAt: now,
      boatId,
      ...docData,
      name: docData.fileName,
      type: docData.serviceType,
      uploadDate: now.split('T')[0],
      size: `${(docData.fileSize / 1048576).toFixed(1)} MB`,
      url: docData.fileUrl,
    };

    if (isDemoMode || !supabase) {
      const updated = get().boats.map(b => {
        if (b.id !== boatId) return b;
        const updatedDocs = [...b.documents, newDoc];
        let updatedComponents = b.components;
        if (docData.componentId) {
          updatedComponents = b.components.map(c =>
            c.id === docData.componentId
              ? { ...c, lastServicedDate: docData.serviceDate, lastChecked: docData.serviceDate, updatedAt: now }
              : c
          );
        }
        return { ...b, documents: updatedDocs, components: updatedComponents, updatedAt: now };
      });
      saveToStorage(updated);
      set(state => ({
        boats: updated,
        selectedBoat: state.selectedBoat?.id === boatId
          ? updated.find(b => b.id === boatId) || null
          : state.selectedBoat,
      }));
      return newDoc;
    }

    // Live mode: insert document
    const insert = documentToInsert({
      ...newDoc,
      boatId,
      uploadedBy: docData.uploadedBy,
      fileName: docData.fileName,
      fileUrl: docData.fileUrl,
      fileSize: docData.fileSize,
      mimeType: docData.mimeType,
    });

    const { data, error } = await supabase
      .from('maintenance_documents')
      .insert(insert)
      .select()
      .single();

    if (error) throw new Error(`Failed to save document: ${error.message}`);

    // If linked to a component, update its last_serviced_date
    if (docData.componentId && docData.serviceDate) {
      await supabase
        .from('boat_components')
        .update({ last_serviced_date: docData.serviceDate })
        .eq('id', docData.componentId);
    }

    const savedDoc = rowToDocument(data);
    set(state => {
      const updated = state.boats.map(b => {
        if (b.id !== boatId) return b;
        const updatedDocs = [...b.documents, savedDoc];
        let updatedComponents = b.components;
        if (docData.componentId && docData.serviceDate) {
          updatedComponents = b.components.map(c =>
            c.id === docData.componentId
              ? { ...c, lastServicedDate: docData.serviceDate, lastChecked: docData.serviceDate }
              : c
          );
        }
        return { ...b, documents: updatedDocs, components: updatedComponents };
      });
      return {
        boats: updated,
        selectedBoat: state.selectedBoat?.id === boatId
          ? updated.find(b => b.id === boatId) || null
          : state.selectedBoat,
      };
    });
    return savedDoc;
  },

  // ── deleteDocument ──────────────────────────────────────────────────────────
  deleteDocument: async (boatId, documentId) => {
    const now = new Date().toISOString();

    if (isDemoMode || !supabase) {
      const updated = get().boats.map(b => {
        if (b.id !== boatId) return b;
        return {
          ...b, updatedAt: now,
          documents: (b.documents as MaintenanceDocument[]).map(d =>
            d.id === documentId ? { ...d, deletedAt: now } : d
          ),
        };
      });
      saveToStorage(updated);
      set(state => ({
        boats: updated,
        selectedBoat: state.selectedBoat?.id === boatId
          ? updated.find(b => b.id === boatId) || null
          : state.selectedBoat,
      }));
      return;
    }

    const { error } = await supabase
      .from('maintenance_documents')
      .update({ deleted_at: now })
      .eq('id', documentId);

    if (error) throw new Error(`Failed to delete document: ${error.message}`);

    set(state => {
      const updated = state.boats.map(b => {
        if (b.id !== boatId) return b;
        return {
          ...b,
          documents: (b.documents as MaintenanceDocument[]).map(d =>
            d.id === documentId ? { ...d, deletedAt: now } : d
          ),
        };
      });
      return {
        boats: updated,
        selectedBoat: state.selectedBoat?.id === boatId
          ? updated.find(b => b.id === boatId) || null
          : state.selectedBoat,
      };
    });
  },

  // ── getHealthScore ─────────────────────────────────────────────────────────
  getHealthScore: (boatId) => {
    const boat = get().boats.find(b => b.id === boatId);
    if (!boat) {
      return {
        boatId,
        score: 0,
        band: 'needs_attention' as const,
        bandLabel: 'No Data',
        bandColor: '#EF4444',
        components: [],
        calculatedAt: new Date().toISOString(),
      };
    }
    return calculateVesselHealth(boatId, boat.components);
  },

  // ── Utils ─────────────────────────────────────────────────────────────────
  getBoatsByOwner: (ownerId) =>
    get().boats.filter(b => b.ownerId === ownerId && !b.deletedAt),

  resetToMockData: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ boats: mockBoats, selectedBoat: null });
  },
}));
