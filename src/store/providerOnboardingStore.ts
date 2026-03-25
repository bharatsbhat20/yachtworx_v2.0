/**
 * providerOnboardingStore.ts
 * Module 3: Provider Onboarding, Verification, Ratings & Trust
 * Dual-mode: demo (mock data) or real Supabase.
 */

import { create } from 'zustand';
import { supabase, isDemoMode } from '../lib/supabase';
import {
  mockProviderProfiles,
  mockProviderDocuments,
  mockServiceAreas,
  mockPortfolioItems,
  mockTrustScoreLogs,
  mockNotifications,
  mockReviewsExtended,
  mockFraudFlags,
} from '../data/mockData';
import type {
  ProviderProfile,
  ProviderDocument,
  ProviderServiceArea,
  ProviderPortfolioItem,
  TrustScoreLog,
  AppNotification,
  ReviewExtended,
  FraudFlag,
  VerificationStatus,
  DocumentStatus,
} from '../types';
import {
  rowToProviderDocument,
  rowToServiceArea,
  rowToPortfolioItem,
  rowToTrustScoreLog,
  rowToNotification,
  rowToReviewExtended,
  rowToFraudFlag,
} from '../lib/supabaseTypes';

// ─── State ────────────────────────────────────────────────────────────────────

interface ProviderOnboardingState {
  // Provider profile (own profile when logged in as provider)
  profile: ProviderProfile | null;
  profileLoading: boolean;
  profileError: string | null;

  // Documents
  documents: ProviderDocument[];
  documentsLoading: boolean;

  // Service areas
  serviceAreas: ProviderServiceArea[];
  serviceAreasLoading: boolean;

  // Portfolio
  portfolio: ProviderPortfolioItem[];
  portfolioLoading: boolean;

  // Trust score log
  trustScoreLogs: TrustScoreLog[];

  // Notifications
  notifications: AppNotification[];
  unreadCount: number;

  // Reviews for this provider
  reviews: ReviewExtended[];
  reviewsLoading: boolean;

  // All providers (for admin / marketplace listing)
  providers: ProviderProfile[];
  providersLoading: boolean;

  // Admin: pending providers queue
  pendingProviders: ProviderProfile[];

  // Admin: fraud flags
  fraudFlags: FraudFlag[];

  // Actions
  fetchMyProfile: (userId: string) => Promise<void>;
  updateProfile: (userId: string, data: Partial<ProviderProfile>) => Promise<void>;
  fetchDocuments: (providerId: string) => Promise<void>;
  uploadDocument: (providerId: string, file: File, meta: Partial<ProviderDocument>) => Promise<void>;
  fetchServiceAreas: (providerId: string) => Promise<void>;
  addServiceArea: (area: Omit<ProviderServiceArea, 'id' | 'createdAt'>) => Promise<void>;
  deleteServiceArea: (areaId: string) => Promise<void>;
  fetchPortfolio: (providerId: string) => Promise<void>;
  uploadPortfolioItem: (providerId: string, file: File, caption?: string) => Promise<void>;
  deletePortfolioItem: (itemId: string) => Promise<void>;
  fetchTrustScoreLogs: (providerId: string) => Promise<void>;
  fetchNotifications: (userId: string) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  fetchReviews: (providerId: string) => Promise<void>;
  submitReview: (review: Omit<ReviewExtended, 'id' | 'createdAt'>) => Promise<void>;
  respondToReview: (reviewId: string, response: string) => Promise<void>;
  fetchAllProviders: () => Promise<void>;
  fetchPendingProviders: () => Promise<void>;
  adminApproveDocument: (docId: string, adminId: string) => Promise<void>;
  adminRejectDocument: (docId: string, adminId: string, reason: string) => Promise<void>;
  adminApproveProvider: (providerId: string, adminId: string) => Promise<void>;
  adminSuspendProvider: (providerId: string, adminId: string, reason: string) => Promise<void>;
  adminOverrideTrustScore: (providerId: string, score: number, reason: string, adminId: string) => Promise<void>;
  fetchFraudFlags: () => Promise<void>;
  dismissFraudFlag: (flagId: string, adminId: string) => Promise<void>;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useProviderOnboardingStore = create<ProviderOnboardingState>((set, get) => ({
  profile: null,
  profileLoading: false,
  profileError: null,
  documents: [],
  documentsLoading: false,
  serviceAreas: [],
  serviceAreasLoading: false,
  portfolio: [],
  portfolioLoading: false,
  trustScoreLogs: [],
  notifications: [],
  unreadCount: 0,
  reviews: [],
  reviewsLoading: false,
  providers: [],
  providersLoading: false,
  pendingProviders: [],
  fraudFlags: [],

  // ── fetchMyProfile ──────────────────────────────────────────────────────────
  fetchMyProfile: async (userId) => {
    set({ profileLoading: true, profileError: null });
    if (isDemoMode) {
      const found = mockProviderProfiles.find((p) => p.id === userId) ?? mockProviderProfiles[0];
      set({ profile: found, profileLoading: false });
      return;
    }
    const { data, error } = await supabase!
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) { set({ profileError: error.message, profileLoading: false }); return; }
    // Map DB row → ProviderProfile
    set({ profile: dbRowToProviderProfile(data), profileLoading: false });
  },

  // ── updateProfile ───────────────────────────────────────────────────────────
  updateProfile: async (userId, data) => {
    if (isDemoMode) {
      const updated = { ...get().profile, ...data } as ProviderProfile;
      set({ profile: updated });
      return;
    }
    const dbData = providerProfileToDbRow(data);
    await supabase!.from('profiles').update(dbData).eq('id', userId);
    await get().fetchMyProfile(userId);
  },

  // ── fetchDocuments ──────────────────────────────────────────────────────────
  fetchDocuments: async (providerId) => {
    set({ documentsLoading: true });
    if (isDemoMode) {
      const docs = mockProviderDocuments.filter((d) => d.providerId === providerId);
      set({ documents: docs, documentsLoading: false });
      return;
    }
    const { data } = await supabase!
      .from('provider_documents')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });
    set({ documents: (data ?? []).map(rowToProviderDocument), documentsLoading: false });
  },

  // ── uploadDocument ──────────────────────────────────────────────────────────
  uploadDocument: async (providerId, file, meta) => {
    if (isDemoMode) {
      const newDoc: ProviderDocument = {
        id: `doc-${Date.now()}`,
        providerId,
        documentType: meta.documentType ?? 'other',
        documentLabel: meta.documentLabel,
        fileUrl: URL.createObjectURL(file),
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType: file.type,
        expirationDate: meta.expirationDate,
        status: 'pending',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      set((s) => ({ documents: [newDoc, ...s.documents] }));
      return;
    }
    const ext = file.name.split('.').pop();
    const path = `provider-docs/${providerId}/${meta.documentType}/${Date.now()}.${ext}`;
    const { data: storageData, error: uploadError } = await supabase!.storage
      .from('provider-documents')
      .upload(path, file, { upsert: false });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase!.storage.from('provider-documents').getPublicUrl(path);
    await supabase!.from('provider_documents').insert({
      provider_id: providerId,
      document_type: meta.documentType,
      document_label: meta.documentLabel ?? null,
      file_url: urlData?.publicUrl ?? storageData?.path,
      file_name: file.name,
      file_size_bytes: file.size,
      mime_type: file.type,
      expiration_date: meta.expirationDate ?? null,
      status: 'pending',
      is_active: true,
    });
    await get().fetchDocuments(providerId);
  },

  // ── fetchServiceAreas ───────────────────────────────────────────────────────
  fetchServiceAreas: async (providerId) => {
    set({ serviceAreasLoading: true });
    if (isDemoMode) {
      set({ serviceAreas: mockServiceAreas.filter((a) => a.providerId === providerId), serviceAreasLoading: false });
      return;
    }
    const { data } = await supabase!
      .from('provider_service_areas')
      .select('*')
      .eq('provider_id', providerId)
      .eq('is_active', true);
    set({ serviceAreas: (data ?? []).map(rowToServiceArea), serviceAreasLoading: false });
  },

  // ── addServiceArea ──────────────────────────────────────────────────────────
  addServiceArea: async (area) => {
    if (isDemoMode) {
      const newArea: ProviderServiceArea = { ...area, id: `area-${Date.now()}`, createdAt: new Date().toISOString() };
      set((s) => ({ serviceAreas: [...s.serviceAreas, newArea] }));
      return;
    }
    await supabase!.from('provider_service_areas').insert({
      provider_id: area.providerId,
      area_type: area.areaType,
      label: area.label,
      zip_code: area.zipCode ?? null,
      city: area.city ?? null,
      state: area.state ?? null,
      radius_km: area.radiusKm ?? null,
      latitude: area.latitude ?? null,
      longitude: area.longitude ?? null,
      is_active: true,
    });
    await get().fetchServiceAreas(area.providerId);
  },

  // ── deleteServiceArea ───────────────────────────────────────────────────────
  deleteServiceArea: async (areaId) => {
    if (isDemoMode) {
      set((s) => ({ serviceAreas: s.serviceAreas.filter((a) => a.id !== areaId) }));
      return;
    }
    await supabase!.from('provider_service_areas').update({ is_active: false }).eq('id', areaId);
    set((s) => ({ serviceAreas: s.serviceAreas.filter((a) => a.id !== areaId) }));
  },

  // ── fetchPortfolio ──────────────────────────────────────────────────────────
  fetchPortfolio: async (providerId) => {
    set({ portfolioLoading: true });
    if (isDemoMode) {
      set({ portfolio: mockPortfolioItems.filter((p) => p.providerId === providerId), portfolioLoading: false });
      return;
    }
    const { data } = await supabase!
      .from('provider_portfolio')
      .select('*')
      .eq('provider_id', providerId)
      .eq('is_active', true)
      .order('display_order');
    set({ portfolio: (data ?? []).map(rowToPortfolioItem), portfolioLoading: false });
  },

  // ── uploadPortfolioItem ─────────────────────────────────────────────────────
  uploadPortfolioItem: async (providerId, file, caption) => {
    if (isDemoMode) {
      const item: ProviderPortfolioItem = {
        id: `port-${Date.now()}`,
        providerId,
        mediaUrl: URL.createObjectURL(file),
        caption,
        mediaType: 'photo',
        displayOrder: get().portfolio.length,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      set((s) => ({ portfolio: [...s.portfolio, item] }));
      return;
    }
    const ext = file.name.split('.').pop();
    const path = `provider-portfolio/${providerId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase!.storage
      .from('provider-media')
      .upload(path, file);
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase!.storage.from('provider-media').getPublicUrl(path);
    await supabase!.from('provider_portfolio').insert({
      provider_id: providerId,
      media_url: urlData?.publicUrl ?? path,
      caption: caption ?? null,
      media_type: file.type.startsWith('video') ? 'video' : 'photo',
      display_order: get().portfolio.length,
      is_active: true,
    });
    await get().fetchPortfolio(providerId);
  },

  // ── deletePortfolioItem ─────────────────────────────────────────────────────
  deletePortfolioItem: async (itemId) => {
    if (isDemoMode) {
      set((s) => ({ portfolio: s.portfolio.filter((p) => p.id !== itemId) }));
      return;
    }
    await supabase!.from('provider_portfolio').update({ is_active: false }).eq('id', itemId);
    set((s) => ({ portfolio: s.portfolio.filter((p) => p.id !== itemId) }));
  },

  // ── fetchTrustScoreLogs ─────────────────────────────────────────────────────
  fetchTrustScoreLogs: async (providerId) => {
    if (isDemoMode) {
      set({ trustScoreLogs: mockTrustScoreLogs.filter((l) => l.providerId === providerId) });
      return;
    }
    const { data } = await supabase!
      .from('trust_score_log')
      .select('*')
      .eq('provider_id', providerId)
      .order('computed_at', { ascending: false })
      .limit(10);
    set({ trustScoreLogs: (data ?? []).map(rowToTrustScoreLog) });
  },

  // ── fetchNotifications ──────────────────────────────────────────────────────
  fetchNotifications: async (userId) => {
    if (isDemoMode) {
      const notifs = mockNotifications.filter((n) => n.userId === userId);
      set({ notifications: notifs, unreadCount: notifs.filter((n) => !n.isRead).length });
      return;
    }
    const { data } = await supabase!
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    const notifs = (data ?? []).map(rowToNotification);
    set({ notifications: notifs, unreadCount: notifs.filter((n) => !n.isRead).length });
  },

  // ── markNotificationRead ────────────────────────────────────────────────────
  markNotificationRead: async (notificationId) => {
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }));
    if (!isDemoMode) {
      await supabase!.from('notifications').update({ is_read: true }).eq('id', notificationId);
    }
  },

  // ── fetchReviews ────────────────────────────────────────────────────────────
  fetchReviews: async (providerId) => {
    set({ reviewsLoading: true });
    if (isDemoMode) {
      set({ reviews: mockReviewsExtended.filter((r) => r.providerId === providerId), reviewsLoading: false });
      return;
    }
    const { data } = await supabase!
      .from('reviews')
      .select('*')
      .eq('provider_id', providerId)
      .eq('is_visible', true)
      .order('created_at', { ascending: false });
    set({ reviews: (data ?? []).map(rowToReviewExtended), reviewsLoading: false });
  },

  // ── submitReview ────────────────────────────────────────────────────────────
  submitReview: async (review) => {
    if (isDemoMode) {
      const newReview: ReviewExtended = { ...review, id: `rev-${Date.now()}`, createdAt: new Date().toISOString() };
      set((s) => ({ reviews: [newReview, ...s.reviews] }));
      return;
    }
    await supabase!.from('reviews').insert({
      booking_id: review.bookingId,
      reviewer_id: review.reviewerId,
      reviewer_name: review.reviewerName ?? null,
      provider_id: review.providerId,
      rating: review.rating,
      comm_rating: review.commRating ?? null,
      quality_rating: review.qualityRating ?? null,
      punctuality_rating: review.punctualityRating ?? null,
      comment: review.comment ?? null,
      flagged: false,
      is_visible: true,
    });
    await get().fetchReviews(review.providerId);
  },

  // ── respondToReview ─────────────────────────────────────────────────────────
  respondToReview: async (reviewId, response) => {
    if (isDemoMode) {
      set((s) => ({
        reviews: s.reviews.map((r) =>
          r.id === reviewId
            ? { ...r, providerResponse: response, providerRespondedAt: new Date().toISOString() }
            : r
        ),
      }));
      return;
    }
    await supabase!.from('reviews').update({
      provider_response: response,
      provider_responded_at: new Date().toISOString(),
    }).eq('id', reviewId);
    set((s) => ({
      reviews: s.reviews.map((r) =>
        r.id === reviewId ? { ...r, providerResponse: response } : r
      ),
    }));
  },

  // ── fetchAllProviders ───────────────────────────────────────────────────────
  fetchAllProviders: async () => {
    set({ providersLoading: true });
    if (isDemoMode) {
      set({ providers: mockProviderProfiles.filter((p) => p.verificationStatus === 'approved'), providersLoading: false });
      return;
    }
    const { data } = await supabase!
      .from('profiles')
      .select('*')
      .eq('role', 'provider')
      .eq('verification_status', 'approved')
      .order('trust_score', { ascending: false });
    set({ providers: (data ?? []).map(dbRowToProviderProfile), providersLoading: false });
  },

  // ── fetchPendingProviders ───────────────────────────────────────────────────
  fetchPendingProviders: async () => {
    if (isDemoMode) {
      set({ pendingProviders: mockProviderProfiles.filter((p) => p.verificationStatus === 'pending_review') });
      return;
    }
    const { data } = await supabase!
      .from('profiles')
      .select('*')
      .eq('role', 'provider')
      .eq('verification_status', 'pending_review')
      .order('created_at', { ascending: true });
    set({ pendingProviders: (data ?? []).map(dbRowToProviderProfile) });
  },

  // ── adminApproveDocument ────────────────────────────────────────────────────
  adminApproveDocument: async (docId, adminId) => {
    if (isDemoMode) {
      set((s) => ({
        documents: s.documents.map((d) =>
          d.id === docId ? { ...d, status: 'approved' as DocumentStatus, reviewedAt: new Date().toISOString(), reviewedBy: adminId } : d
        ),
      }));
      return;
    }
    await supabase!.from('provider_documents').update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
    }).eq('id', docId);
    await supabase!.from('admin_audit_log').insert({
      admin_id: adminId,
      action_type: 'approve_document',
      target_type: 'document',
      target_id: docId,
      new_value: { status: 'approved' },
    });
  },

  // ── adminRejectDocument ─────────────────────────────────────────────────────
  adminRejectDocument: async (docId, adminId, reason) => {
    if (isDemoMode) {
      set((s) => ({
        documents: s.documents.map((d) =>
          d.id === docId ? { ...d, status: 'rejected' as DocumentStatus, rejectionReason: reason, reviewedAt: new Date().toISOString() } : d
        ),
      }));
      return;
    }
    await supabase!.from('provider_documents').update({
      status: 'rejected',
      rejection_reason: reason,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
    }).eq('id', docId);
    await supabase!.from('admin_audit_log').insert({
      admin_id: adminId,
      action_type: 'reject_document',
      target_type: 'document',
      target_id: docId,
      new_value: { status: 'rejected', reason },
    });
  },

  // ── adminApproveProvider ────────────────────────────────────────────────────
  adminApproveProvider: async (providerId, adminId) => {
    const prev = get().pendingProviders.find((p) => p.id === providerId);
    if (isDemoMode) {
      set((s) => ({
        pendingProviders: s.pendingProviders.filter((p) => p.id !== providerId),
        providers: [...s.providers, { ...prev!, verificationStatus: 'approved', approvedAt: new Date().toISOString() }],
      }));
      return;
    }
    await supabase!.from('profiles').update({
      verification_status: 'approved',
      approved_at: new Date().toISOString(),
    }).eq('id', providerId);
    await supabase!.from('admin_audit_log').insert({
      admin_id: adminId,
      action_type: 'approve_provider',
      target_type: 'provider',
      target_id: providerId,
      previous_value: { verification_status: 'pending_review' },
      new_value: { verification_status: 'approved' },
    });
    await get().fetchPendingProviders();
  },

  // ── adminSuspendProvider ────────────────────────────────────────────────────
  adminSuspendProvider: async (providerId, adminId, reason) => {
    if (isDemoMode) {
      set((s) => ({
        providers: s.providers.map((p) =>
          p.id === providerId ? { ...p, verificationStatus: 'suspended' as VerificationStatus, suspendedAt: new Date().toISOString() } : p
        ),
      }));
      return;
    }
    await supabase!.from('profiles').update({
      verification_status: 'suspended',
      suspended_at: new Date().toISOString(),
      rejection_reason: reason,
    }).eq('id', providerId);
    await supabase!.from('admin_audit_log').insert({
      admin_id: adminId,
      action_type: 'suspend_provider',
      target_type: 'provider',
      target_id: providerId,
      new_value: { verification_status: 'suspended', reason },
    });
  },

  // ── adminOverrideTrustScore ─────────────────────────────────────────────────
  adminOverrideTrustScore: async (providerId, score, reason, adminId) => {
    if (isDemoMode) {
      set((s) => ({
        providers: s.providers.map((p) =>
          p.id === providerId ? { ...p, trustScore: score, trustScoreOverride: true, trustScoreOverrideReason: reason } : p
        ),
      }));
      return;
    }
    await supabase!.from('profiles').update({
      trust_score: score,
      trust_score_override: true,
      trust_score_override_reason: reason,
      trust_score_updated_at: new Date().toISOString(),
    }).eq('id', providerId);
    await supabase!.from('trust_score_log').insert({
      provider_id: providerId,
      score,
      source: 'admin_override',
      admin_id: adminId,
      override_reason: reason,
    });
    await supabase!.from('admin_audit_log').insert({
      admin_id: adminId,
      action_type: 'override_trust_score',
      target_type: 'provider',
      target_id: providerId,
      new_value: { score, reason },
    });
  },

  // ── fetchFraudFlags ─────────────────────────────────────────────────────────
  fetchFraudFlags: async () => {
    if (isDemoMode) {
      set({ fraudFlags: mockFraudFlags });
      return;
    }
    const { data } = await supabase!
      .from('fraud_flags')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    set({ fraudFlags: (data ?? []).map(rowToFraudFlag) });
  },

  // ── dismissFraudFlag ────────────────────────────────────────────────────────
  dismissFraudFlag: async (flagId, adminId) => {
    if (isDemoMode) {
      set((s) => ({ fraudFlags: s.fraudFlags.filter((f) => f.id !== flagId) }));
      return;
    }
    await supabase!.from('fraud_flags').update({
      status: 'dismissed',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    }).eq('id', flagId);
    set((s) => ({ fraudFlags: s.fraudFlags.filter((f) => f.id !== flagId) }));
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dbRowToProviderProfile(row: Record<string, unknown>): ProviderProfile {
  return {
    id: row.id as string,
    businessName: (row.business_name as string) ?? '',
    contactName: (row.contact_name as string) ?? (row.full_name as string) ?? '',
    email: (row.email as string) ?? '',
    phone: (row.phone as string) ?? undefined,
    role: (row.role as ProviderProfile['role']) ?? 'provider',
    addressLine1: (row.address_line1 as string) ?? undefined,
    addressCity: (row.address_city as string) ?? undefined,
    addressState: (row.address_state as string) ?? undefined,
    addressZip: (row.address_zip as string) ?? undefined,
    addressCountry: (row.address_country as string) ?? 'US',
    latitude: (row.latitude as number) ?? undefined,
    longitude: (row.longitude as number) ?? undefined,
    bio: (row.bio as string) ?? undefined,
    yearsInBusiness: (row.years_in_business as number) ?? undefined,
    emergencyAvailability: (row.emergency_availability as boolean) ?? false,
    profilePhotoUrl: (row.profile_photo_url as string) ?? (row.avatar_url as string) ?? undefined,
    logoUrl: (row.logo_url as string) ?? undefined,
    serviceCategories: (row.service_categories as string[]) ?? [],
    verificationStatus: (row.verification_status as VerificationStatus) ?? 'unverified',
    emailVerifiedAt: (row.email_verified_at as string) ?? undefined,
    termsAcceptedAt: (row.terms_accepted_at as string) ?? undefined,
    approvedAt: (row.approved_at as string) ?? undefined,
    rejectedAt: (row.rejected_at as string) ?? undefined,
    suspendedAt: (row.suspended_at as string) ?? undefined,
    rejectionReason: (row.rejection_reason as string) ?? undefined,
    profileComplete: (row.profile_complete as boolean) ?? false,
    stripeAccountId: (row.stripe_account_id as string) ?? undefined,
    stripeStatus: (row.stripe_account_status as ProviderProfile['stripeStatus']) ?? 'pending',
    stripeChargesEnabled: (row.stripe_charges_enabled as boolean) ?? false,
    stripePayoutsEnabled: (row.stripe_payouts_enabled as boolean) ?? false,
    stripeOnboardingComplete: (row.stripe_onboarding_complete as boolean) ?? false,
    trustScore: (row.trust_score as number) ?? 50,
    trustScoreOverride: (row.trust_score_override as boolean) ?? false,
    trustScoreOverrideReason: (row.trust_score_override_reason as string) ?? undefined,
    trustScoreUpdatedAt: (row.trust_score_updated_at as string) ?? undefined,
    avgRating: (row.avg_rating as number) ?? undefined,
    reviewCount: (row.review_count as number) ?? 0,
    totalJobsCompleted: (row.total_jobs_completed as number) ?? 0,
    completionRate: (row.completion_rate as number) ?? undefined,
    cancellationRate: (row.cancellation_rate as number) ?? undefined,
    onTimePercent: (row.on_time_percent as number) ?? undefined,
    avgResponseHours: (row.avg_response_hours as number) ?? undefined,
    isFeatured: (row.is_featured as boolean) ?? false,
    featuredUntil: (row.featured_until as string) ?? undefined,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? undefined,
    deletedAt: (row.deleted_at as string) ?? undefined,
  };
}

function providerProfileToDbRow(data: Partial<ProviderProfile>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (data.businessName !== undefined)        row.business_name = data.businessName;
  if (data.contactName !== undefined)         row.contact_name = data.contactName;
  if (data.phone !== undefined)               row.phone = data.phone;
  if (data.bio !== undefined)                 row.bio = data.bio;
  if (data.yearsInBusiness !== undefined)     row.years_in_business = data.yearsInBusiness;
  if (data.emergencyAvailability !== undefined) row.emergency_availability = data.emergencyAvailability;
  if (data.profilePhotoUrl !== undefined)     row.profile_photo_url = data.profilePhotoUrl;
  if (data.logoUrl !== undefined)             row.logo_url = data.logoUrl;
  if (data.serviceCategories !== undefined)   row.service_categories = data.serviceCategories;
  if (data.addressLine1 !== undefined)        row.address_line1 = data.addressLine1;
  if (data.addressCity !== undefined)         row.address_city = data.addressCity;
  if (data.addressState !== undefined)        row.address_state = data.addressState;
  if (data.addressZip !== undefined)          row.address_zip = data.addressZip;
  if (data.addressCountry !== undefined)      row.address_country = data.addressCountry;
  if (data.latitude !== undefined)            row.latitude = data.latitude;
  if (data.longitude !== undefined)           row.longitude = data.longitude;
  if (data.profileComplete !== undefined)     row.profile_complete = data.profileComplete;
  return row;
}
