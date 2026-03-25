// ---------------------------------------------------------------------------
// Database row types (snake_case — mirrors Postgres columns exactly)
// ---------------------------------------------------------------------------

export interface ProfileRow {
  id: string;                 // = auth.users.id
  first_name: string;
  last_name: string;
  email: string;
  role: 'owner' | 'provider' | 'admin';
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoatRow {
  id: string;
  owner_id: string;
  name: string;
  make: string | null;
  model: string | null;
  year: number | null;
  boat_type: string | null;
  length_overall: number | null;
  beam: number | null;
  draft: number | null;
  hull_material: string | null;
  engine_type: string | null;
  fuel_type: string | null;
  displacement: number | null;
  home_port: string | null;
  hull_id: string | null;
  registration_number: string | null;
  estimated_value: number | null;
  photo_url: string | null;
  specs_source: 'cache' | 'api' | 'manual' | null;
  flag: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoatComponentRow {
  id: string;
  boat_id: string;
  name: string;
  category: string;
  install_date: string | null;
  last_serviced_date: string | null;
  service_interval_days: number | null;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceDocumentRow {
  id: string;
  boat_id: string;
  component_id: string | null;
  uploaded_by: string;
  file_name: string;
  file_url: string;           // storage path, not presigned URL
  file_size: number;
  mime_type: string;
  service_type: string | null;
  service_date: string | null;
  service_provider: string | null;
  notes: string | null;
  title: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoatSpecsCacheRow {
  id: string;
  cache_key: string;          // "{make}|{model}|{year}" lowercased
  make: string;
  model: string;
  year: number;
  length_overall: number | null;
  beam: number | null;
  draft: number | null;
  hull_material: string | null;
  engine_type: string | null;
  fuel_type: string | null;
  displacement: number | null;
  boat_type: string | null;
  hit: boolean;               // false = "not found" negative cache
  expires_at: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Database type map (used by createClient<Database>)
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Omit<ProfileRow, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ProfileRow, 'id' | 'created_at' | 'updated_at'>>;
      };
      boats: {
        Row: BoatRow;
        Insert: Omit<BoatRow, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<BoatRow, 'id' | 'owner_id' | 'created_at' | 'updated_at'>>;
      };
      boat_components: {
        Row: BoatComponentRow;
        Insert: Omit<BoatComponentRow, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<BoatComponentRow, 'id' | 'boat_id' | 'created_at' | 'updated_at'>>;
      };
      maintenance_documents: {
        Row: MaintenanceDocumentRow;
        Insert: Omit<MaintenanceDocumentRow, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<MaintenanceDocumentRow, 'id' | 'boat_id' | 'created_at' | 'updated_at'>>;
      };
      boat_specs_cache: {
        Row: BoatSpecsCacheRow;
        Insert: Omit<BoatSpecsCacheRow, 'created_at'>;
        Update: Partial<Omit<BoatSpecsCacheRow, 'id' | 'created_at'>>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// ---------------------------------------------------------------------------
// Bidirectional mappers: DB row  ↔  App interface
// ---------------------------------------------------------------------------

import type { User, Boat, BoatComponent, MaintenanceDocument } from '../types';

export function rowToUser(p: ProfileRow): User {
  return {
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    name: `${p.first_name} ${p.last_name}`,
    email: p.email,
    role: p.role,
    phone: p.phone ?? undefined,
    avatarUrl: p.avatar_url ?? undefined,
    avatar: p.avatar_url ?? undefined,
    emailVerified: true,        // only set after Supabase confirms email
    createdAt: p.created_at,
  };
}

export function rowToBoat(r: BoatRow): Boat {
  return {
    id: r.id,
    ownerId: r.owner_id,
    name: r.name,
    make: r.make ?? '',
    model: r.model ?? '',
    year: r.year ?? new Date().getFullYear(),
    boatType: (r.boat_type as Boat['boatType']) ?? 'motor_yacht',
    lengthOverall: r.length_overall ?? 0,
    length: r.length_overall ?? 0,           // legacy alias
    beam: r.beam ?? undefined,
    draft: r.draft ?? undefined,
    hullMaterial: r.hull_material ?? undefined,
    engineType: r.engine_type ?? undefined,
    fuelType: r.fuel_type ?? undefined,
    displacement: r.displacement ?? undefined,
    homePort: r.home_port ?? undefined,
    hullId: r.hull_id ?? undefined,
    registrationNumber: r.registration_number ?? undefined,
    estimatedValue: r.estimated_value ?? undefined,
    currentValue: r.estimated_value ?? undefined,  // legacy alias
    photoUrl: r.photo_url ?? undefined,
    image: r.photo_url ?? undefined,               // legacy alias
    specsSource: (r.specs_source as Boat['specsSource']) ?? 'manual',
    flag: r.flag ?? undefined,
    components: [],
    documents: [],
    deletedAt: r.deleted_at ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function boatToInsert(b: Partial<Boat> & { name: string; ownerId: string }): BoatRow['Insert'] {
  return {
    id: b.id ?? crypto.randomUUID(),
    owner_id: b.ownerId,
    name: b.name,
    make: b.make ?? null,
    model: b.model ?? null,
    year: b.year ?? null,
    boat_type: b.boatType ?? null,
    length_overall: b.lengthOverall ?? b.length ?? null,
    beam: b.beam ?? null,
    draft: b.draft ?? null,
    hull_material: b.hullMaterial ?? null,
    engine_type: b.engineType ?? null,
    fuel_type: b.fuelType ?? null,
    displacement: b.displacement ?? null,
    home_port: b.homePort ?? null,
    hull_id: b.hullId ?? null,
    registration_number: b.registrationNumber ?? null,
    estimated_value: b.estimatedValue ?? b.currentValue ?? null,
    photo_url: b.photoUrl ?? b.image ?? null,
    specs_source: b.specsSource ?? 'manual',
    flag: b.flag ?? null,
    deleted_at: null,
  };
}

export function rowToComponent(r: BoatComponentRow): BoatComponent {
  return {
    id: r.id,
    boatId: r.boat_id,
    name: r.name,
    category: r.category,
    installDate: r.install_date ?? undefined,
    lastServicedDate: r.last_serviced_date ?? undefined,
    lastChecked: r.last_serviced_date ?? undefined,   // legacy alias
    serviceIntervalDays: r.service_interval_days ?? 365,
    notes: r.notes ?? undefined,
    deletedAt: r.deleted_at ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    // legacy computed fields — will be filled by health score util
    status: 'good',
    nextDue: '',
  };
}

export function componentToInsert(c: Partial<BoatComponent> & { name: string; boatId: string; category: string }): BoatComponentRow['Insert'] {
  return {
    id: c.id ?? crypto.randomUUID(),
    boat_id: c.boatId,
    name: c.name,
    category: c.category,
    install_date: c.installDate ?? null,
    last_serviced_date: c.lastServicedDate ?? c.lastChecked ?? null,
    service_interval_days: c.serviceIntervalDays ?? 365,
    notes: c.notes ?? null,
    deleted_at: null,
  };
}

export function rowToDocument(r: MaintenanceDocumentRow): MaintenanceDocument {
  return {
    id: r.id,
    boatId: r.boat_id,
    componentId: r.component_id ?? undefined,
    uploadedBy: r.uploaded_by,
    fileName: r.file_name,
    fileUrl: r.file_url,
    fileSize: r.file_size,
    mimeType: r.mime_type,
    serviceType: r.service_type ?? undefined,
    serviceDate: r.service_date ?? undefined,
    serviceProvider: r.service_provider ?? undefined,
    notes: r.notes ?? undefined,
    title: r.title ?? r.file_name,
    name: r.title ?? r.file_name,     // legacy alias
    type: r.service_type ?? 'other',  // legacy alias
    date: r.service_date ?? r.created_at,
    url: r.file_url,                  // legacy alias
    deletedAt: r.deleted_at ?? undefined,
    createdAt: r.created_at,
  };
}

export function documentToInsert(d: Partial<MaintenanceDocument> & {
  boatId: string;
  uploadedBy: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}): MaintenanceDocumentRow['Insert'] {
  return {
    id: d.id ?? crypto.randomUUID(),
    boat_id: d.boatId,
    component_id: d.componentId ?? null,
    uploaded_by: d.uploadedBy,
    file_name: d.fileName,
    file_url: d.fileUrl,
    file_size: d.fileSize,
    mime_type: d.mimeType,
    service_type: d.serviceType ?? null,
    service_date: d.serviceDate ?? null,
    service_provider: d.serviceProvider ?? null,
    notes: d.notes ?? null,
    title: d.title ?? d.fileName,
    deleted_at: null,
  };
}
