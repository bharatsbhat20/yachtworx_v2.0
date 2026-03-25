// ─── User & Auth ─────────────────────────────────────────────────────────────

export type UserRole = 'owner' | 'provider' | 'admin';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  name: string; // computed: firstName + lastName
  email: string;
  role: UserRole;
  emailVerified: boolean;
  avatarUrl?: string;
  phone?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
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

// ─── Service Requests ────────────────────────────────────────────────────────

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
