// ---------------------------------------------------------------------------
// Database row types (snake_case — mirrors Postgres columns exactly)
// ---------------------------------------------------------------------------

export interface ProfileRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'owner' | 'provider' | 'admin';
  phone: string | null;
  avatar_url: string | null;
  stripe_account_id: string | null;
  stripe_account_status: string | null;
  stripe_payouts_enabled: boolean;
  stripe_charges_enabled: boolean;
  booking_mode: 'request_to_book' | 'instant_book';
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
      provider_services: {
        Row: ProviderServiceRow;
        Insert: Omit<ProviderServiceRow, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ProviderServiceRow, 'id' | 'provider_id' | 'created_at' | 'updated_at'>>;
      };
      provider_availability: {
        Row: ProviderAvailabilityRow;
        Insert: Omit<ProviderAvailabilityRow, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ProviderAvailabilityRow, 'id' | 'provider_id' | 'created_at' | 'updated_at'>>;
      };
      provider_blackouts: {
        Row: ProviderBlackoutRow;
        Insert: Omit<ProviderBlackoutRow, 'created_at'>;
        Update: Partial<Omit<ProviderBlackoutRow, 'id' | 'created_at'>>;
      };
      bookings: {
        Row: BookingRow;
        Insert: Omit<BookingRow, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<BookingRow, 'id' | 'owner_id' | 'created_at' | 'updated_at'>>;
      };
      payments: {
        Row: PaymentRow;
        Insert: Omit<PaymentRow, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<PaymentRow, 'id' | 'booking_id' | 'created_at' | 'updated_at'>>;
      };
      reviews: {
        Row: ReviewRow;
        Insert: Omit<ReviewRow, 'created_at'>;
        Update: Partial<Omit<ReviewRow, 'id' | 'booking_id' | 'created_at'>>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// ---------------------------------------------------------------------------
// Module 2 Row Types
// ---------------------------------------------------------------------------

export interface ProviderServiceRow {
  id: string;
  provider_id: string;
  name: string;
  category: string;
  description: string | null;
  price_type: 'fixed' | 'hourly' | 'quote';
  base_price: number | null;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderAvailabilityRow {
  id: string;
  provider_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  buffer_minutes: number;
  max_jobs_per_day: number;
  min_notice_hours: number;
  max_advance_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderBlackoutRow {
  id: string;
  provider_id: string;
  blackout_date: string;
  reason: string | null;
  created_at: string;
}

export interface BookingRow {
  id: string;
  reference: string;
  owner_id: string;
  provider_id: string;
  boat_id: string;
  service_id: string;
  service_type: string;
  service_name: string;
  location: string;
  location_type: string;
  scheduled_start: string;
  scheduled_end: string;
  duration_minutes: number;
  price_type: string;
  quoted_amount: number | null;
  final_amount: number | null;
  price_amount: number;
  currency: string;
  platform_fee_percent: number;
  platform_fee_amount: number;
  provider_payout_amount: number;
  status: string;
  booking_mode: string;
  notes: string | null;
  payment_intent_id: string | null;
  cancellation_reason: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  confirmed_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  payout_released_at: string | null;
  rescheduled_from: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRow {
  id: string;
  booking_id: string;
  owner_id: string;
  provider_id: string;
  amount: number;
  currency: string;
  platform_fee_percent: number;
  platform_fee_amount: number;
  provider_payout: number;
  payment_status: string;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_transfer_id: string | null;
  stripe_refund_id: string | null;
  refund_amount: number | null;
  refunded_at: string | null;
  payout_released_at: string | null;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewRow {
  id: string;
  booking_id: string;
  reviewer_id: string;
  provider_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Bidirectional mappers: DB row  ↔  App interface
// ---------------------------------------------------------------------------

import type { User, Boat, BoatComponent, MaintenanceDocument, Booking, Payment, Review, ProviderService, ProviderAvailability, ProviderBlackout } from '../types';

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
    emailVerified: true,
    stripeAccountId: p.stripe_account_id ?? undefined,
    stripeAccountStatus: (p.stripe_account_status as User['stripeAccountStatus']) ?? undefined,
    stripePayoutsEnabled: p.stripe_payouts_enabled,
    stripeChargesEnabled: p.stripe_charges_enabled,
    bookingMode: p.booking_mode,
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

// ---------------------------------------------------------------------------
// Module 2 Mappers
// ---------------------------------------------------------------------------

export function rowToProviderService(r: ProviderServiceRow): ProviderService {
  return {
    id: r.id,
    providerId: r.provider_id,
    name: r.name,
    category: r.category,
    description: r.description ?? undefined,
    priceType: r.price_type,
    basePrice: r.base_price ?? undefined,
    durationMinutes: r.duration_minutes,
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function rowToAvailability(r: ProviderAvailabilityRow): ProviderAvailability {
  return {
    id: r.id,
    providerId: r.provider_id,
    dayOfWeek: r.day_of_week,
    startTime: r.start_time,
    endTime: r.end_time,
    bufferMinutes: r.buffer_minutes,
    maxJobsPerDay: r.max_jobs_per_day,
    minNoticeHours: r.min_notice_hours,
    maxAdvanceDays: r.max_advance_days,
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function rowToBlackout(r: ProviderBlackoutRow): ProviderBlackout {
  return {
    id: r.id,
    providerId: r.provider_id,
    blackoutDate: r.blackout_date,
    reason: r.reason ?? undefined,
    createdAt: r.created_at,
  };
}

export function rowToBooking(r: BookingRow): Booking {
  return {
    id: r.id,
    reference: r.reference,
    ownerId: r.owner_id,
    providerId: r.provider_id,
    boatId: r.boat_id,
    serviceId: r.service_id,
    serviceType: r.service_type,
    serviceName: r.service_name,
    location: r.location,
    locationType: r.location_type as Booking['locationType'],
    scheduledStart: r.scheduled_start,
    scheduledEnd: r.scheduled_end,
    durationMinutes: r.duration_minutes,
    priceType: r.price_type as Booking['priceType'],
    quotedAmount: r.quoted_amount ?? undefined,
    finalAmount: r.final_amount ?? undefined,
    priceAmount: r.price_amount,
    currency: r.currency,
    platformFeePercent: r.platform_fee_percent,
    platformFeeAmount: r.platform_fee_amount,
    providerPayoutAmount: r.provider_payout_amount,
    status: r.status as Booking['status'],
    bookingMode: r.booking_mode as Booking['bookingMode'],
    notes: r.notes ?? undefined,
    paymentIntentId: r.payment_intent_id ?? undefined,
    cancellationReason: r.cancellation_reason ?? undefined,
    cancelledBy: r.cancelled_by as Booking['cancelledBy'] ?? undefined,
    cancelledAt: r.cancelled_at ?? undefined,
    confirmedAt: r.confirmed_at ?? undefined,
    startedAt: r.started_at ?? undefined,
    completedAt: r.completed_at ?? undefined,
    payoutReleasedAt: r.payout_released_at ?? undefined,
    rescheduledFrom: r.rescheduled_from ?? undefined,
    deletedAt: r.deleted_at ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function rowToPayment(r: PaymentRow): Payment {
  return {
    id: r.id,
    bookingId: r.booking_id,
    ownerId: r.owner_id,
    providerId: r.provider_id,
    amount: r.amount,
    currency: r.currency,
    platformFeePercent: r.platform_fee_percent,
    platformFeeAmount: r.platform_fee_amount,
    providerPayout: r.provider_payout,
    paymentStatus: r.payment_status as Payment['paymentStatus'],
    stripePaymentIntentId: r.stripe_payment_intent_id ?? undefined,
    stripeChargeId: r.stripe_charge_id ?? undefined,
    stripeTransferId: r.stripe_transfer_id ?? undefined,
    stripeRefundId: r.stripe_refund_id ?? undefined,
    refundAmount: r.refund_amount ?? undefined,
    refundedAt: r.refunded_at ?? undefined,
    payoutReleasedAt: r.payout_released_at ?? undefined,
    idempotencyKey: r.idempotency_key,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function rowToReview(r: ReviewRow): Review {
  return {
    id: r.id,
    bookingId: r.booking_id,
    reviewerId: r.reviewer_id,
    providerId: r.provider_id,
    rating: r.rating,
    comment: r.comment ?? undefined,
    createdAt: r.created_at,
  };
}

// =============================================================================
// MODULE 3 — Row types & mappers
// =============================================================================

import type {
  ProviderDocument,
  ProviderServiceArea,
  ProviderPortfolioItem,
  TrustScoreLog,
  AdminAuditLog,
  FraudFlag,
  AppNotification,
  ReviewExtended,
  ProviderProfile,
} from '../types';

// ─── Row interfaces ───────────────────────────────────────────────────────────

export interface ProviderDocumentRow {
  id: string;
  provider_id: string;
  document_type: string;
  document_label: string | null;
  file_url: string;
  file_name: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  expiration_date: string | null;
  status: string;
  rejection_reason: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderServiceAreaRow {
  id: string;
  provider_id: string;
  area_type: string;
  label: string;
  zip_code: string | null;
  city: string | null;
  state: string | null;
  radius_km: number | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: string;
}

export interface ProviderPortfolioRow {
  id: string;
  provider_id: string;
  media_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  media_type: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface TrustScoreLogRow {
  id: string;
  provider_id: string;
  score: number;
  source: string;
  admin_id: string | null;
  override_reason: string | null;
  comp_rating: number | null;
  comp_completion: number | null;
  comp_cancellation: number | null;
  comp_insurance: number | null;
  comp_license: number | null;
  comp_response: number | null;
  computed_at: string;
}

export interface AdminAuditLogRow {
  id: string;
  admin_id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  reason: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface FraudFlagRow {
  id: string;
  provider_id: string | null;
  flag_type: string;
  detail: Record<string, unknown> | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ReviewExtendedRow extends ReviewRow {
  reviewer_name: string | null;
  comm_rating: number | null;
  quality_rating: number | null;
  punctuality_rating: number | null;
  provider_response: string | null;
  provider_responded_at: string | null;
  flagged: boolean;
  flagged_reason: string | null;
  is_visible: boolean;
}

// ─── Mapper functions ─────────────────────────────────────────────────────────

export function rowToProviderDocument(r: ProviderDocumentRow): ProviderDocument {
  return {
    id: r.id,
    providerId: r.provider_id,
    documentType: r.document_type as ProviderDocument['documentType'],
    documentLabel: r.document_label ?? undefined,
    fileUrl: r.file_url,
    fileName: r.file_name ?? undefined,
    fileSizeBytes: r.file_size_bytes ?? undefined,
    mimeType: r.mime_type ?? undefined,
    expirationDate: r.expiration_date ?? undefined,
    status: r.status as ProviderDocument['status'],
    rejectionReason: r.rejection_reason ?? undefined,
    reviewedAt: r.reviewed_at ?? undefined,
    reviewedBy: r.reviewed_by ?? undefined,
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function rowToServiceArea(r: ProviderServiceAreaRow): ProviderServiceArea {
  return {
    id: r.id,
    providerId: r.provider_id,
    areaType: r.area_type as ProviderServiceArea['areaType'],
    label: r.label,
    zipCode: r.zip_code ?? undefined,
    city: r.city ?? undefined,
    state: r.state ?? undefined,
    radiusKm: r.radius_km ?? undefined,
    latitude: r.latitude ?? undefined,
    longitude: r.longitude ?? undefined,
    isActive: r.is_active,
    createdAt: r.created_at,
  };
}

export function rowToPortfolioItem(r: ProviderPortfolioRow): ProviderPortfolioItem {
  return {
    id: r.id,
    providerId: r.provider_id,
    mediaUrl: r.media_url,
    thumbnailUrl: r.thumbnail_url ?? undefined,
    caption: r.caption ?? undefined,
    mediaType: r.media_type as ProviderPortfolioItem['mediaType'],
    displayOrder: r.display_order,
    isActive: r.is_active,
    createdAt: r.created_at,
  };
}

export function rowToTrustScoreLog(r: TrustScoreLogRow): TrustScoreLog {
  return {
    id: r.id,
    providerId: r.provider_id,
    score: r.score,
    source: r.source as TrustScoreLog['source'],
    adminId: r.admin_id ?? undefined,
    overrideReason: r.override_reason ?? undefined,
    compRating: r.comp_rating ?? undefined,
    compCompletion: r.comp_completion ?? undefined,
    compCancellation: r.comp_cancellation ?? undefined,
    compInsurance: r.comp_insurance ?? undefined,
    compLicense: r.comp_license ?? undefined,
    compResponse: r.comp_response ?? undefined,
    computedAt: r.computed_at,
  };
}

export function rowToFraudFlag(r: FraudFlagRow): FraudFlag {
  return {
    id: r.id,
    providerId: r.provider_id ?? undefined,
    flagType: r.flag_type,
    detail: r.detail ?? undefined,
    status: r.status as FraudFlag['status'],
    reviewedBy: r.reviewed_by ?? undefined,
    reviewedAt: r.reviewed_at ?? undefined,
    createdAt: r.created_at,
  };
}

export function rowToNotification(r: NotificationRow): AppNotification {
  return {
    id: r.id,
    userId: r.user_id,
    type: r.type,
    title: r.title,
    body: r.body ?? undefined,
    link: r.link ?? undefined,
    isRead: r.is_read,
    createdAt: r.created_at,
  };
}

export function rowToReviewExtended(r: ReviewExtendedRow): ReviewExtended {
  return {
    id: r.id,
    bookingId: r.booking_id,
    reviewerId: r.reviewer_id,
    reviewerName: r.reviewer_name ?? undefined,
    providerId: r.provider_id,
    rating: r.rating,
    comment: r.comment ?? undefined,
    createdAt: r.created_at,
    commRating: r.comm_rating ?? undefined,
    qualityRating: r.quality_rating ?? undefined,
    punctualityRating: r.punctuality_rating ?? undefined,
    providerResponse: r.provider_response ?? undefined,
    providerRespondedAt: r.provider_responded_at ?? undefined,
    flagged: r.flagged,
    flaggedReason: r.flagged_reason ?? undefined,
    isVisible: r.is_visible,
  };
}
