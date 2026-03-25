export type UserRole = 'owner' | 'provider';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  location?: string;
}

export interface Boat {
  id: string;
  name: string;
  type: string;
  year: number;
  make: string;
  model: string;
  length: number;
  hullId: string;
  registrationNumber: string;
  homePort: string;
  ownerId: string;
  image?: string;
  purchasePrice?: number;
  currentValue?: number;
  lastService?: string;
  nextService?: string;
  components: BoatComponent[];
  documents: Document[];
  serviceHistory: ServiceRecord[];
  alerts: Alert[];
}

export interface BoatComponent {
  id: string;
  name: string;
  category: string;
  status: 'good' | 'attention' | 'critical';
  lastChecked: string;
  nextDue: string;
  notes?: string;
}

export interface ServiceRecord {
  id: string;
  date: string;
  type: string;
  provider: string;
  cost: number;
  description: string;
  status: 'completed' | 'scheduled' | 'in_progress';
}

export interface Alert {
  id: string;
  type: 'warning' | 'info' | 'critical';
  message: string;
  component?: string;
  dueDate?: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  uploadDate: string;
  size: string;
  url?: string;
  boatId?: string;
}

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
