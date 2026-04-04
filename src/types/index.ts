// ─── User & Auth ─────────────────────────────────────────────────────────────

export type UserRole = 'owner' | 'provider' | 'admin' | 'marina';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  name: string; // computed: firstName + lastName
  email: string;
  role: UserRole;
  emailVerified: boolean;
  avatarUrl?: string;
  avatar?: string;   // legacy alias for avatarUrl
  phone?: string;
  location?: string;
  // Provider-specific Stripe fields
  stripeAccountId?: string;
  stripeAccountStatus?: 'pending' | 'active' | 'restricted' | 'disabled';
  stripePayoutsEnabled?: boolean;
  stripeChargesEnabled?: boolean;
  // Booking mode preference
  bookingMode?: 'request_to_book' | 'instant_book';
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  revokedAt?: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

// ─── Boat ─────────────────────────────────────────────────────────────────────

export type BoatType =
  | 'sailing_yacht'
  | 'motor_yacht'
  | 'catamaran_sail'
  | 'catamaran_power'
  | 'center_console'
  | 'express_cruiser'
  | 'trawler'
  | 'sportfish'
  | 'pontoon'
  | 'runabout'
  | 'other';

export type SpecSource = 'cache' | 'api' | 'manual';

export interface Boat {
  id: string;
  ownerId: string;
  // Identity
  name: string;
  make: string;
  model: string;
  year: number;
  boatType: BoatType;
  // AI-autofilled (editable)
  lengthOverall?: number;      // feet
  beam?: number;               // feet
  draft?: number;              // feet
  hullMaterial?: string;
  engineType?: string;
  fuelType?: string;
  displacement?: number;       // lbs
  specsSource: SpecSource;
  // Manual fields
  homePort?: string;
  registrationNumber?: string;
  hullId?: string;             // HIN
  estimatedValue?: number;     // USD
  photoUrl?: string;
  // Legacy compat (UI still uses these in some places)
  length?: number;             // alias for lengthOverall
  image?: string;              // alias for photoUrl
  type?: string;               // human-readable boatType label
  hullId_legacy?: string;      // previously named differently
  purchasePrice?: number;
  currentValue?: number;       // alias for estimatedValue
  lastService?: string;
  nextService?: string;
  // Relations
  components: BoatComponent[];
  documents: MaintenanceDocument[];
  serviceHistory: ServiceRecord[];
  alerts: Alert[];
  // Timestamps
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// ─── Boat Component ───────────────────────────────────────────────────────────

export interface BoatComponent {
  id: string;
  boatId: string;
  name: string;
  category: string;
  installDate?: string;
  lastServicedDate?: string;
  serviceIntervalDays?: number;
  notes?: string;
  // Legacy compat
  status?: 'good' | 'attention' | 'critical'; // computed from dates, kept for display
  lastChecked?: string;
  nextDue?: string;
  // Timestamps
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// ─── Health Score ─────────────────────────────────────────────────────────────

export type HealthBand = 'good' | 'fair' | 'needs_attention';

export interface ComponentHealth {
  componentId: string;
  componentName: string;
  score: number; // 0–100
  status: 'current' | 'due_soon' | 'overdue_lt30' | 'overdue_30_90' | 'overdue_gt90' | 'no_data';
  daysUntilDue?: number; // negative = overdue
}

export interface VesselHealthScore {
  boatId: string;
  score: number; // 0–100, average of all component scores
  band: HealthBand;
  bandLabel: string;
  bandColor: string;
  components: ComponentHealth[];
  calculatedAt: string;
}

// ─── Maintenance Documents ────────────────────────────────────────────────────

export type ServiceType =
  | 'engine_service'
  | 'hull_maintenance'
  | 'electrical'
  | 'plumbing'
  | 'rigging'
  | 'sails'
  | 'safety_equipment'
  | 'survey'
  | 'winterisation'
  | 'commissioning'
  | 'electronics'
  | 'structural_repair'
  | 'cosmetic'
  | 'fuel_system'
  | 'navigation'
  | 'other';

export interface MaintenanceDocument {
  id: string;
  boatId: string;
  componentId?: string;
  uploadedBy: string;
  fileName: string;
  fileUrl: string;
  fileSize: number; // bytes
  mimeType: string;
  serviceType: ServiceType;
  serviceDate: string;
  serviceProvider?: string;
  notes?: string;
  createdAt: string;
  deletedAt?: string;
  // Legacy compat
  name?: string;    // alias for fileName
  type?: string;    // human readable serviceType
  uploadDate?: string; // alias for createdAt
  size?: string;    // human readable fileSize
  url?: string;     // alias for fileUrl
  boatId_?: string;
}

// ─── Boat Specs Cache ─────────────────────────────────────────────────────────

export interface BoatSpecsCache {
  id: string;
  make: string;
  model: string;
  year: number;
  lengthOverall?: number;
  beam?: number;
  draft?: number;
  hullMaterial?: string;
  engineType?: string;
  fuelType?: string;
  displacement?: number;
  lookupFailed: boolean;
  sourceApi?: string;
  cachedAt: string;
  expiresAt: string;
}

export interface AutofillResponse {
  lengthOverall?: number;
  beam?: number;
  draft?: number;
  displacement?: number;
  engineType?: string;
  fuelType?: string;
  hullMaterial?: string;
  source: SpecSource;
}

// ─── Add Boat Wizard ──────────────────────────────────────────────────────────

export interface AddBoatFormData {
  // Step 1: Identity
  name: string;
  make: string;
  model: string;
  year: number | '';
  // Step 2: AI-autofilled specs (editable)
  lengthOverall: number | '';
  beam: number | '';
  draft: number | '';
  hullMaterial: string;
  engineType: string;
  fuelType: string;
  displacement: number | '';
  specsSource: SpecSource;
  // Step 3: Optional details
  boatType: BoatType | '';
  homePort: string;
  registrationNumber: string;
  hullId: string;
  estimatedValue: number | '';
  photoUrl: string;
}

// ─── Service Records ──────────────────────────────────────────────────────────

export interface ServiceRecord {
  id: string;
  date: string;
  type: string;
  provider: string;
  cost: number;
  description: string;
  status: 'completed' | 'scheduled' | 'in_progress';
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  type: 'warning' | 'info' | 'critical';
  message: string;
  component?: string;
  dueDate?: string;
}

// ─── Legacy Document (for Documents page) ────────────────────────────────────

export interface Document {
  id: string;
  name: string;
  type: string;
  uploadDate: string;
  size: string;
  url?: string;
  boatId?: string;
  mimeType?: string;
  fileSize?: number;
  serviceType?: ServiceType;
  serviceDate?: string;
  componentId?: string;
  serviceProvider?: string;
  notes?: string;
  uploadedBy?: string;
}

// ─── Service Providers ───────────────────────────────────────────────────────

export interface ServiceProvider {
  id: string;
  name: string;
  businessName: string;
  avatar?: string;
  location: string;
  distance?: number;
  rating: number;
  reviewCount: number;
  categories: string[];
  certifications: string[];
  description: string;
  yearsExperience: number;
  responseTime: string;
  completedJobs: number;
  services: Service[];
  verified: boolean;
  featured?: boolean;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  priceType: 'fixed' | 'hourly' | 'quote';
  duration?: string;
}

// ─── Service Requests (legacy — kept for backward compat) ─────────────────────

export interface ServiceRequest {
  id: string;
  boatId: string;
  boatName: string;
  ownerId: string;
  providerId?: string;
  providerName?: string;
  serviceType: string;
  description: string;
  status: 'pending' | 'matched' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  scheduledDate?: string;
  completedDate?: string;
  cost?: number;
  quotes?: Quote[];
  images?: string[];
}

export interface Quote {
  id: string;
  providerId: string;
  providerName: string;
  amount: number;
  description: string;
  eta: string;
  createdAt: string;
}

// ─── Module 2: Bookings ───────────────────────────────────────────────────────

export type BookingStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'QUOTED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'PAYOUT_RELEASED'
  | 'CANCELLED'
  | 'DISPUTED'
  | 'REFUNDED'
  | 'RESCHEDULED';

export type BookingMode = 'request_to_book' | 'instant_book';
export type LocationType = 'marina' | 'address' | 'onwater';
export type PriceType = 'fixed' | 'hourly' | 'quote';
export type PaymentStatus =
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'refunded'
  | 'partially_refunded'
  | 'failed'
  | 'voided';

export interface Booking {
  id: string;
  reference: string;           // YW-2024-008421
  ownerId: string;
  ownerName?: string;
  providerId: string;
  providerName?: string;
  providerAvatar?: string;
  boatId: string;
  boatName?: string;
  serviceId: string;
  serviceName: string;
  serviceType: string;
  location: string;
  locationType: LocationType;
  scheduledStart: string;      // UTC ISO string
  scheduledEnd: string;        // UTC ISO string
  durationMinutes: number;
  priceType: PriceType;
  quotedAmount?: number;
  finalAmount?: number;
  priceAmount: number;
  currency: string;
  platformFeePercent: number;
  platformFeeAmount: number;
  providerPayoutAmount: number;
  status: BookingStatus;
  bookingMode: BookingMode;
  notes?: string;
  paymentIntentId?: string;
  paymentStatus?: PaymentStatus;
  cancellationReason?: string;
  cancelledBy?: 'owner' | 'provider' | 'admin' | 'system';
  cancelledAt?: string;
  confirmedAt?: string;
  startedAt?: string;
  completedAt?: string;
  payoutReleasedAt?: string;
  rescheduledFrom?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  ownerId: string;
  providerId: string;
  amount: number;
  currency: string;
  platformFeePercent: number;
  platformFeeAmount: number;
  providerPayout: number;
  paymentStatus: PaymentStatus;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  stripeTransferId?: string;
  stripeRefundId?: string;
  refundAmount?: number;
  refundedAt?: string;
  payoutReleasedAt?: string;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  reviewerId: string;
  reviewerName?: string;
  providerId: string;
  rating: number;    // 1–5
  comment?: string;
  createdAt: string;
}

// ─── Module 2: Provider Services Catalog ─────────────────────────────────────

export interface ProviderService {
  id: string;
  providerId: string;
  name: string;
  category: string;
  description?: string;
  priceType: PriceType;
  basePrice?: number;
  durationMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Module 2: Provider Availability ─────────────────────────────────────────

export interface ProviderAvailability {
  id: string;
  providerId: string;
  dayOfWeek: number;          // 0=Sun, 6=Sat
  startTime: string;          // "09:00"
  endTime: string;            // "17:00"
  bufferMinutes: number;
  maxJobsPerDay: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderBlackout {
  id: string;
  providerId: string;
  blackoutDate: string;       // YYYY-MM-DD
  reason?: string;
  createdAt: string;
}

export interface TimeSlot {
  start: string;              // UTC ISO string
  end: string;
  available: boolean;
}

// ─── Module 2: Booking Form Data ─────────────────────────────────────────────

export interface CreateBookingFormData {
  providerId: string;
  boatId: string;
  serviceId: string;
  location: string;
  locationType: LocationType;
  proposedStart: string;      // UTC ISO string
  notes?: string;
}

// ─── Booking status display helpers ──────────────────────────────────────────

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  DRAFT:           'Draft',
  PENDING:         'Pending',
  QUOTED:          'Quote Received',
  CONFIRMED:       'Confirmed',
  IN_PROGRESS:     'In Progress',
  COMPLETED:       'Completed',
  PAYOUT_RELEASED: 'Paid Out',
  CANCELLED:       'Cancelled',
  DISPUTED:        'Disputed',
  REFUNDED:        'Refunded',
  RESCHEDULED:     'Rescheduled',
};

export const BOOKING_STATUS_COLORS: Record<BookingStatus, string> = {
  DRAFT:           'gray',
  PENDING:         'ocean',
  QUOTED:          'info',
  CONFIRMED:       'teal',
  IN_PROGRESS:     'attention',
  COMPLETED:       'good',
  PAYOUT_RELEASED: 'good',
  CANCELLED:       'critical',
  DISPUTED:        'critical',
  REFUNDED:        'gray',
  RESCHEDULED:     'info',
};

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Messaging ───────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantNames: string[];
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  relatedRequestId?: string;
  avatar?: string;
}

// ─── API Response Envelope ────────────────────────────────────────────────────

export interface ApiError {
  code: string;
  message: string;
  status: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

// ─── Boat Type Display Helpers ────────────────────────────────────────────────

export const BOAT_TYPE_LABELS: Record<BoatType, string> = {
  sailing_yacht: 'Sailing Yacht',
  motor_yacht: 'Motor Yacht',
  catamaran_sail: 'Catamaran (Sail)',
  catamaran_power: 'Catamaran (Power)',
  center_console: 'Center Console',
  express_cruiser: 'Express Cruiser',
  trawler: 'Trawler',
  sportfish: 'Sportfisher',
  pontoon: 'Pontoon',
  runabout: 'Runabout',
  other: 'Other',
};

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  engine_service: 'Engine Service',
  hull_maintenance: 'Hull Maintenance',
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  rigging: 'Rigging',
  sails: 'Sails',
  safety_equipment: 'Safety Equipment',
  survey: 'Survey',
  winterisation: 'Winterisation',
  commissioning: 'Commissioning',
  electronics: 'Electronics / Navigation',
  structural_repair: 'Structural Repair',
  cosmetic: 'Cosmetic',
  fuel_system: 'Fuel System',
  navigation: 'Navigation',
  other: 'Other',
};

// ─── Default Component Sets (TRD Section 9) ───────────────────────────────────

export const DEFAULT_COMPONENTS: Record<string, Array<{ name: string; category: string; serviceIntervalDays: number }>> = {
  sailing_yacht: [
    { name: 'Main Engine', category: 'Engine', serviceIntervalDays: 365 },
    { name: 'Standing Rigging', category: 'Rigging', serviceIntervalDays: 365 },
    { name: 'Running Rigging', category: 'Rigging', serviceIntervalDays: 365 },
    { name: 'Mainsail', category: 'Sails', serviceIntervalDays: 730 },
    { name: 'Headsail', category: 'Sails', serviceIntervalDays: 730 },
    { name: 'Furling System', category: 'Rigging', serviceIntervalDays: 365 },
    { name: 'Safety Equipment', category: 'Safety', serviceIntervalDays: 365 },
    { name: 'Electronics / Navigation', category: 'Electronics', serviceIntervalDays: 730 },
    { name: 'Hull & Gelcoat', category: 'Hull', serviceIntervalDays: 365 },
    { name: 'Generator', category: 'Engine', serviceIntervalDays: 365 },
  ],
  motor_yacht: [
    { name: 'Port Engine', category: 'Engine', serviceIntervalDays: 365 },
    { name: 'Starboard Engine', category: 'Engine', serviceIntervalDays: 365 },
    { name: 'Generator', category: 'Engine', serviceIntervalDays: 365 },
    { name: 'Fuel System', category: 'Fuel', serviceIntervalDays: 365 },
    { name: 'Bilge Pumps', category: 'Safety', serviceIntervalDays: 365 },
    { name: 'Safety Equipment', category: 'Safety', serviceIntervalDays: 365 },
    { name: 'Electronics / Navigation', category: 'Electronics', serviceIntervalDays: 730 },
    { name: 'Hull & Gelcoat', category: 'Hull', serviceIntervalDays: 365 },
    { name: 'HVAC', category: 'Mechanical', serviceIntervalDays: 365 },
  ],
  express_cruiser: [
    { name: 'Port Engine', category: 'Engine', serviceIntervalDays: 365 },
    { name: 'Starboard Engine', category: 'Engine', serviceIntervalDays: 365 },
    { name: 'Generator', category: 'Engine', serviceIntervalDays: 365 },
    { name: 'Fuel System', category: 'Fuel', serviceIntervalDays: 365 },
    { name: 'Bilge Pumps', category: 'Safety', serviceIntervalDays: 365 },
    { name: 'Safety Equipment', category: 'Safety', serviceIntervalDays: 365 },
    { name: 'Electronics / Navigation', category: 'Electronics', serviceIntervalDays: 730 },
    { name: 'Hull & Gelcoat', category: 'Hull', serviceIntervalDays: 365 },
  ],
  catamaran_sail: [
    { name: 'Port Engine', category: 'Engine', serviceIntervalDays: 365 },
    { name: 'Starboard Engine', category: 'Engine', serviceIntervalDays: 365 },
    { name: 'Standing Rigging', category: 'Rigging', serviceIntervalDays: 365 },
    { name: 'Running Rigging', category: 'Rigging', serviceIntervalDays: 365 },
    { name: 'Mainsail', category: 'Sails', serviceIntervalDays: 730 },
    { name: 'Headsail', category: 'Sails', serviceIntervalDays: 730 },
    { name: 'Safety Equipment', category: 'Safety', serviceIntervalDays: 365 },
    { name: 'Electronics / Navigation', category: 'Electronics', serviceIntervalDays: 730 },
    { name: 'Hull & Gelcoat (Port)', category: 'Hull', serviceIntervalDays: 365 },
    { name: 'Hull & Gelcoat (Starboard)', category: 'Hull', serviceIntervalDays: 365 },
  ],
  catamaran_power: [
    { name: 'Port Engine', category: 'Engine', serviceIntervalDays: 365 },
    { name: 'Starboard Engine', category: 'Engine', serviceIntervalDays: 365 },
    { name: 'Generator', category: 'Engine', serviceIntervalDays: 365 },
    { name: 'Fuel System', category: 'Fuel', serviceIntervalDays: 365 },
    { name: 'Safety Equipment', category: 'Safety', serviceIntervalDays: 365 },
    { name: 'Electronics / Navigation', category: 'Electronics', serviceIntervalDays: 730 },
    { name: 'Hull & Gelcoat (Port)', category: 'Hull', serviceIntervalDays: 365 },
    { name: 'Hull & Gelcoat (Starboard)', category: 'Hull', serviceIntervalDays: 365 },
  ],
  other: [
    { name: 'Main Engine', category: 'Engine', serviceIntervalDays: 365 },
    { name: 'Safety Equipment', category: 'Safety', serviceIntervalDays: 365 },
    { name: 'Hull & Gelcoat', category: 'Hull', serviceIntervalDays: 365 },
    { name: 'Electronics / Navigation', category: 'Electronics', serviceIntervalDays: 730 },
  ],
};

// ─── Module 3: Provider Onboarding & Verification ────────────────────────────

export type VerificationStatus =
  | 'unverified'
  | 'email_verified'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'suspended';

export type DocumentType =
  | 'business_license'
  | 'insurance_coi'
  | 'abyc_certification'
  | 'manufacturer_cert'
  | 'other';

export type DocumentStatus = 'pending' | 'approved' | 'rejected';

export type ServiceAreaType = 'zip_code' | 'marina' | 'city' | 'radius';

export type MediaType = 'photo' | 'video';

export type FraudFlagStatus = 'open' | 'reviewed' | 'dismissed';

export type TrustScoreSource = 'nightly_job' | 'admin_override' | 'initial';

export type AdminRole = 'moderator' | 'super_admin';

// ─── Provider Document ────────────────────────────────────────────────────────

export interface ProviderDocument {
  id: string;
  providerId: string;
  documentType: DocumentType;
  documentLabel?: string;
  fileUrl: string;
  fileName?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  expirationDate?: string;        // YYYY-MM-DD
  status: DocumentStatus;
  rejectionReason?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Provider Service Area ────────────────────────────────────────────────────

export interface ProviderServiceArea {
  id: string;
  providerId: string;
  areaType: ServiceAreaType;
  label: string;
  zipCode?: string;
  city?: string;
  state?: string;
  radiusKm?: number;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  createdAt: string;
}

// ─── Provider Portfolio Item ──────────────────────────────────────────────────

export interface ProviderPortfolioItem {
  id: string;
  providerId: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  mediaType: MediaType;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

// ─── Trust Score Log ──────────────────────────────────────────────────────────

export interface TrustScoreLog {
  id: string;
  providerId: string;
  score: number;
  source: TrustScoreSource;
  adminId?: string;
  overrideReason?: string;
  compRating?: number;
  compCompletion?: number;
  compCancellation?: number;
  compInsurance?: number;
  compLicense?: number;
  compResponse?: number;
  computedAt: string;
}

// ─── Admin Audit Log ──────────────────────────────────────────────────────────

export interface AdminAuditLog {
  id: string;
  adminId: string;
  actionType: string;
  targetType: string;
  targetId: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  reason?: string;
  ipAddress?: string;
  createdAt: string;
}

// ─── Fraud Flag ───────────────────────────────────────────────────────────────

export interface FraudFlag {
  id: string;
  providerId?: string;
  flagType: string;
  detail?: Record<string, unknown>;
  status: FraudFlagStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

// ─── Extended Review (Module 3 additions) ────────────────────────────────────

export interface ReviewExtended extends Review {
  reviewerName?: string;
  commRating?: number;
  qualityRating?: number;
  punctualityRating?: number;
  providerResponse?: string;
  providerRespondedAt?: string;
  flagged?: boolean;
  flaggedReason?: string;
  isVisible?: boolean;
}

// ─── Provider Profile (full, reconciled) ─────────────────────────────────────

export interface ProviderProfile {
  id: string;
  // Identity
  businessName: string;
  contactName: string;
  email: string;
  phone?: string;
  role: UserRole;
  // Location
  addressLine1?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  addressCountry?: string;
  latitude?: number;
  longitude?: number;
  // Profile
  bio?: string;
  yearsInBusiness?: number;
  emergencyAvailability: boolean;
  profilePhotoUrl?: string;
  logoUrl?: string;
  serviceCategories: string[];
  // Verification
  verificationStatus: VerificationStatus;
  emailVerifiedAt?: string;
  termsAcceptedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  suspendedAt?: string;
  rejectionReason?: string;
  profileComplete: boolean;
  // Stripe
  stripeAccountId?: string;
  stripeStatus?: 'pending' | 'active' | 'restricted' | 'disabled';
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  stripeOnboardingComplete: boolean;
  // Trust
  trustScore: number;
  trustScoreOverride: boolean;
  trustScoreOverrideReason?: string;
  trustScoreUpdatedAt?: string;
  // Computed metrics
  avgRating?: number;
  reviewCount: number;
  totalJobsCompleted: number;
  completionRate?: number;
  cancellationRate?: number;
  onTimePercent?: number;
  avgResponseHours?: number;
  // Featured
  isFeatured: boolean;
  featuredUntil?: string;
  // Timestamps
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
}

// ─── Onboarding form data ─────────────────────────────────────────────────────

export interface ProviderRegistrationFormData {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  password: string;
  termsAccepted: boolean;
}

export interface ProviderProfileFormData {
  serviceCategories: string[];
  yearsInBusiness: number;
  bio: string;
  addressLine1: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  addressCountry: string;
  emergencyAvailability: boolean;
}

// ─── Verification status display helpers ─────────────────────────────────────

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  unverified:      'Unverified',
  email_verified:  'Email Verified',
  pending_review:  'Pending Review',
  approved:        'Approved',
  rejected:        'Rejected',
  suspended:       'Suspended',
};

export const VERIFICATION_STATUS_COLORS: Record<VerificationStatus, string> = {
  unverified:      'gray',
  email_verified:  'ocean',
  pending_review:  'attention',
  approved:        'good',
  rejected:        'critical',
  suspended:       'critical',
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  business_license:    'Business Licence',
  insurance_coi:       'Insurance Certificate (COI)',
  abyc_certification:  'ABYC Certification',
  manufacturer_cert:   'Manufacturer Certification',
  other:               'Other',
};

export const SERVICE_CATEGORIES = [
  'Engine & Mechanical',
  'Electrical Systems',
  'Hull & Exterior',
  'Rigging & Sails',
  'Electronics & Navigation',
  'Plumbing & Systems',
  'Safety & Surveys',
  'Interior & Upholstery',
  'Seasonal Services',
  'Painting & Varnishing',
] as const;

// ─── Module 4: Smart Matching Engine ─────────────────────────────────────────

export type MatchScoreBand = 'best' | 'great' | 'good' | 'fair';

export interface MatchFactorScores {
  category: number;     // 0-100
  proximity: number;    // 0-100
  trust: number;        // 0-100
  urgency: number;      // 0-100
  boatType: number;     // 0-100
  availability: number; // 0-100
}

export interface MatchResult {
  providerId: string;
  boatId: string;
  needId: string;
  needLabel: string;
  matchScore: number;      // 0-100
  band: MatchScoreBand;
  factorScores: MatchFactorScores;
  matchReasons: string[];  // 2-3 natural-language strings
  matchSummary: string;    // e.g. "ABYC certified · 1.2 mi · 4.9★"
  computedAt: string;
}

export interface BoatNeed {
  id: string;
  boatId: string;
  boatName: string;
  componentId?: string;
  componentName: string;
  category: string;          // raw BoatComponent.category
  serviceCategory: string;   // canonical SERVICE_CATEGORIES value
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low' | 'proactive';
  componentStatus: ComponentHealth['status'];
  daysUntilDue?: number;
  needLabel: string;         // e.g. "Main Engine — 442 days overdue"
}

export interface ProviderMatchSummary {
  provider: ServiceProvider;
  topMatch: MatchResult;
  allMatches: MatchResult[];
}

export type JobOpportunityStatus = 'open' | 'in_review' | 'matched' | 'expired';

export interface ProviderJobOpportunity {
  id: string;
  boatId: string;
  boatName: string;
  boatType: BoatType;
  boatLength?: number;
  homePort: string;
  ownerId: string;
  componentName: string;
  serviceCategory: string;
  urgencyLevel: BoatNeed['urgencyLevel'];
  needLabel: string;
  estimatedBudget?: number;
  preferredDates?: string[];
  status: JobOpportunityStatus;
  postedAt: string;
  expiresAt: string;
}

export interface ProviderJobMatch {
  opportunity: ProviderJobOpportunity;
  matchResult: MatchResult;
}

export type ServiceCategory = typeof SERVICE_CATEGORIES[number];

// ─── Module 5: Marina Partnerships & Enterprise Dashboard ─────────────────────

export type MarinaTier = 'standard' | 'preferred' | 'exclusive';
export type MarinaStaffRole = 'owner' | 'manager' | 'harbormaster' | 'dock_attendant';
export type BerthType = 'slip' | 'mooring' | 'anchorage' | 'dry_storage';
export type BookingSource = 'online' | 'walk_up' | 'phone';
export type PartnershipStatus = 'pending' | 'approved' | 'active' | 'rejected' | 'suspended' | 'terminated';

export type BerthBookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface MarinaAmenity {
  id: string;
  name: string;
  icon: string; // lucide icon name
  available: boolean;
}

export interface Marina {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  phone?: string;
  email?: string;
  website?: string;
  vhfChannel?: string;
  totalBerths: number;
  availableBerths: number;
  maxVesselLengthFt: number;
  maxDraftFt: number;
  dailyRateUsd: number;
  weeklyRateUsd?: number;
  monthlyRateUsd?: number;
  amenities: string[];           // e.g. ['fuel', 'electricity', 'wifi', 'pump_out', 'showers']
  photos: string[];              // URLs
  coverPhoto: string;
  rating: number;
  reviewCount: number;
  stripeAccountId?: string;
  stripeChargesEnabled?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MarinaBerth {
  id: string;
  marinaId: string;
  name: string;                  // e.g. "A-12", "Slip 7"
  berthType: BerthType;
  lengthFt: number;
  widthFt: number;
  maxDraftFt: number;
  hasPower: boolean;
  powerAmps?: number;            // 30, 50, 100
  hasWater: boolean;
  hasFuel: boolean;
  dailyRateUsd: number;
  weeklyRateUsd?: number;
  monthlyRateUsd?: number;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  currentBookingId?: string;
  notes?: string;
}

export interface MarinaBerthBooking {
  id: string;
  reference: string;             // YW-MARINA-2026-001234
  marinaId: string;
  marinaName: string;
  berthId: string;
  berthName: string;
  boatId?: string;               // nullable for walk-up
  boatName?: string;
  ownerId?: string;              // nullable for walk-up
  ownerName?: string;
  bookingSource: BookingSource;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  rateSnapshotUsd: number;
  totalAmountUsd: number;
  platformFeeAmount: number;
  marinaPayoutAmount: number;
  status: BerthBookingStatus;
  specialRequests?: string;
  paymentIntentId?: string;
  actualCheckInAt?: string;
  actualCheckOutAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarinaStaff {
  id: string;
  marinaId: string;
  userId: string;
  userName: string;
  userEmail: string;
  staffRole: MarinaStaffRole;
  invitedBy: string;
  acceptedAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface MarinaProviderPartnership {
  id: string;
  marinaId: string;
  marinaName: string;
  providerId: string;
  providerName: string;
  providerBusinessName: string;
  tier: MarinaTier;
  status: PartnershipStatus;
  commissionRate: number;        // 0, 0.08, 0.12
  serviceCategories: string[];
  notes?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarinaReview {
  id: string;
  marinaId: string;
  reviewerId: string;
  reviewerName: string;
  berthBookingId: string;
  overallRating: number;
  berthQualityRating: number;
  amenitiesRating: number;
  staffRating: number;
  valueRating: number;
  comment: string;
  ownerReply?: string;
  createdAt: string;
}

// ─── Enterprise Analytics ─────────────────────────────────────────────────────

export interface OccupancyDataPoint {
  date: string;
  occupancyPct: number;
  berthsOccupied: number;
  totalBerths: number;
}

export interface RevenueDataPoint {
  month: string;
  berthRevenue: number;
  serviceCommission: number;
  total: number;
}

export interface FleetCompositionItem {
  boatType: string;
  count: number;
  pct: number;
}

export interface ServiceDemandItem {
  category: string;
  requestCount: number;
  pct: number;
}

export interface MarinaAnalytics {
  marinaId: string;
  currentOccupancyPct: number;
  occupiedBerths: number;
  totalBerths: number;
  monthlyRevenue: number;
  monthlyRevenueChange: number;  // % vs last month
  ytdRevenue: number;
  avgStayNights: number;
  totalGuests: number;
  occupancyTrend: OccupancyDataPoint[];
  revenueTrend: RevenueDataPoint[];
  fleetComposition: FleetCompositionItem[];
  serviceDemand: ServiceDemandItem[];
  topOriginPorts: { port: string; count: number }[];
}
