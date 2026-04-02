import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  DollarSign, Star, Briefcase, TrendingUp, Clock, CheckCircle,
  AlertCircle, Shield, FileText, MapPin, Image, Bell, Settings,
  ExternalLink, ChevronRight, RefreshCw, BarChart2, MessageSquare,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useProviderOnboardingStore } from '../store/providerOnboardingStore';
import { useMatchStore } from '../store/matchStore';
import { RecommendedJobsFeed } from '../components/matching/RecommendedJobsFeed';
import TrustScoreCard from '../components/provider/TrustScoreCard';
import DocumentUploadModal from '../components/provider/DocumentUploadModal';
import ServiceAreaManager from '../components/provider/ServiceAreaManager';
import PortfolioGrid from '../components/provider/PortfolioGrid';
import { VERIFICATION_STATUS_LABELS, VERIFICATION_STATUS_COLORS, DOCUMENT_TYPE_LABELS } from '../types';
import type { ProviderDocument } from '../types';

type Tab = 'overview' | 'documents' | 'service-areas' | 'portfolio' | 'reviews' | 'settings' | 'recommended-jobs';

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color, sub }: {
  icon: React.ElementType; label: string; value: string | number; color: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ProviderDashboard() {
  const { user } = useAuthStore();
  const {
    profile, profileLoading,
    documents, documentsLoading,
    serviceAreas, serviceAreasLoading,
    portfolio, portfolioLoading,
    trustScoreLogs,
    notifications, unreadCount,
    reviews, reviewsLoading,
    fetchMyProfile, fetchDocuments, fetchServiceAreas,
    fetchPortfolio, fetchTrustScoreLogs, fetchNotifications,
    fetchReviews, uploadDocument, addServiceArea, deleteServiceArea,
    uploadPortfolioItem, deletePortfolioItem,
    markNotificationRead, respondToReview,
  } = useProviderOnboardingStore();

  const {
    providerJobMatches, expressedInterest, isComputing: isComputingMatches,
    computeMatchesForProvider, expressInterest,
  } = useMatchStore();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');

  const providerId = user?.id ?? 'prov-1';

  useEffect(() => {
    fetchMyProfile(providerId);
    fetchDocuments(providerId);
    fetchServiceAreas(providerId);
    fetchPortfolio(providerId);
    fetchTrustScoreLogs(providerId);
    fetchNotifications(providerId);
    fetchReviews(providerId);
  }, [providerId]);

  // Lazy-compute recommended jobs on first visit to that tab
  useEffect(() => {
    if (activeTab === 'recommended-jobs' && providerJobMatches.length === 0 && !isComputingMatches) {
      computeMatchesForProvider(providerId);
    }
  }, [activeTab]);

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-ocean-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const verStatus = profile?.verificationStatus ?? 'unverified';
  const verLabel = VERIFICATION_STATUS_LABELS[verStatus];
  const verColor = VERIFICATION_STATUS_COLORS[verStatus];

  const statusBadge = (v: string) => {
    const map: Record<string, string> = {
      good: 'bg-teal-100 text-teal-700',
      critical: 'bg-red-100 text-red-700',
      attention: 'bg-amber-100 text-amber-700',
      ocean: 'bg-ocean-100 text-ocean-700',
      gray: 'bg-gray-100 text-gray-600',
    };
    return map[v] ?? 'bg-gray-100 text-gray-600';
  };

  const approvedDocs = documents.filter((d) => d.status === 'approved' && d.isActive);
  const pendingDocs  = documents.filter((d) => d.status === 'pending'  && d.isActive);
  const hasLicence   = approvedDocs.some((d) => d.documentType === 'business_license');
  const hasInsurance = approvedDocs.some((d) => d.documentType === 'insurance_coi');

  const TABS: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'overview',          label: 'Overview',         icon: BarChart2 },
    { id: 'recommended-jobs',  label: 'Recommended Jobs', icon: Sparkles, badge: providerJobMatches.length || undefined },
    { id: 'documents',         label: 'Documents',        icon: FileText, badge: pendingDocs.length },
    { id: 'service-areas',     label: 'Service Areas',    icon: MapPin },
    { id: 'portfolio',         label: 'Portfolio',        icon: Image },
    { id: 'reviews',           label: 'Reviews',          icon: Star },
    { id: 'settings',          label: 'Settings',         icon: Settings },
  ];

  const latestLog = trustScoreLogs[0];

  // Completion checklist
  const checklist = [
    { label: 'Email verified',          done: !!profile?.emailVerifiedAt },
    { label: 'Business profile filled', done: !!(profile?.bio && profile?.addressCity) },
    { label: 'Profile photo uploaded',  done: !!profile?.profilePhotoUrl },
    { label: 'Business licence approved', done: hasLicence },
    { label: 'Insurance COI approved',  done: hasInsurance },
    { label: 'Stripe onboarding complete', done: profile?.stripeOnboardingComplete ?? false },
    { label: 'Service area added',      done: serviceAreas.length > 0 },
  ];
  const completedCount = checklist.filter((c) => c.done).length;
  const completionPct  = Math.round((completedCount / checklist.length) * 100);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                {profile?.profilePhotoUrl ? (
                  <img src={profile.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-navy-800 text-white font-bold text-sm">
                    {profile?.contactName?.charAt(0) ?? 'P'}
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{profile?.businessName ?? 'My Business'}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(verColor)}`}>
                    {verLabel}
                  </span>
                  {profile?.isFeatured && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gold-100 text-gold-700">Featured</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">← Home</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Verification alert */}
      {verStatus !== 'approved' && (
        <div className={`px-4 sm:px-6 lg:px-8 py-3 max-w-7xl mx-auto`}>
          <div className={`rounded-xl p-4 flex items-start gap-3 ${
            verStatus === 'pending_review' ? 'bg-amber-50 border border-amber-200' :
            verStatus === 'suspended'      ? 'bg-red-50 border border-red-200' :
                                             'bg-ocean-50 border border-ocean-200'
          }`}>
            <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
              verStatus === 'pending_review' ? 'text-amber-500' :
              verStatus === 'suspended'      ? 'text-red-500' : 'text-ocean-500'
            }`} />
            <div className="flex-1">
              <p className={`font-medium text-sm ${
                verStatus === 'pending_review' ? 'text-amber-800' :
                verStatus === 'suspended'      ? 'text-red-800' : 'text-ocean-800'
              }`}>
                {verStatus === 'pending_review' && 'Your account is under review'}
                {verStatus === 'suspended'      && 'Your account has been suspended'}
                {verStatus === 'unverified'     && 'Account not yet verified'}
                {verStatus === 'email_verified' && 'Upload documents to complete verification'}
                {verStatus === 'rejected'       && 'Your application was not approved'}
              </p>
              {profile?.rejectionReason && (
                <p className="text-sm text-red-600 mt-1">{profile.rejectionReason}</p>
              )}
              {verStatus !== 'approved' && verStatus !== 'suspended' && (
                <p className="text-xs text-gray-500 mt-1">
                  Complete the checklist below and upload your required documents to get approved.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar nav */}
          <div className="w-48 flex-shrink-0">
            <nav className="space-y-1 sticky top-6">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-navy-900 text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{tab.label}</span>
                    {tab.badge ? (
                      <span className="ml-auto w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center">
                        {tab.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >

              {/* ── OVERVIEW TAB ── */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={Star}      label="Average Rating"     value={profile?.avgRating?.toFixed(1) ?? '—'}      color="bg-yellow-100 text-yellow-600" sub={`${profile?.reviewCount ?? 0} reviews`} />
                    <StatCard icon={Briefcase} label="Jobs Completed"     value={profile?.totalJobsCompleted ?? 0}           color="bg-teal-100 text-teal-600" />
                    <StatCard icon={CheckCircle} label="Completion Rate"  value={profile?.completionRate ? `${profile.completionRate.toFixed(0)}%` : '—'} color="bg-ocean-100 text-ocean-600" />
                    <StatCard icon={Clock}     label="Avg Response"       value={profile?.avgResponseHours ? `${profile.avgResponseHours.toFixed(1)}h` : '—'} color="bg-purple-100 text-purple-600" />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Trust score */}
                    <TrustScoreCard profile={profile ?? { trustScore: 50, reviewCount: 0, totalJobsCompleted: 0, isFeatured: false, emergencyAvailability: false, stripeChargesEnabled: false, stripePayoutsEnabled: false, stripeOnboardingComplete: false, trustScoreOverride: false, serviceCategories: [], profileComplete: false, verificationStatus: 'unverified', id: providerId, businessName: '', contactName: '', email: '', role: 'provider', createdAt: new Date().toISOString() }} latestLog={latestLog} />

                    {/* Profile completion checklist */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-ocean-600" />
                          <h3 className="font-semibold text-gray-900">Profile Completion</h3>
                        </div>
                        <span className="text-sm font-bold text-ocean-600">{completionPct}%</span>
                      </div>
                      <div className="px-4 pt-3 pb-2">
                        <div className="h-2 bg-gray-100 rounded-full mb-4">
                          <div className="h-full bg-gradient-to-r from-ocean-500 to-teal-500 rounded-full transition-all duration-500"
                            style={{ width: `${completionPct}%` }} />
                        </div>
                        <div className="space-y-2">
                          {checklist.map(({ label, done }) => (
                            <div key={label} className="flex items-center gap-2">
                              {done
                                ? <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0" />
                                : <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                              }
                              <span className={`text-sm ${done ? 'text-gray-700' : 'text-gray-400'}`}>{label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {!profile?.stripeOnboardingComplete && (
                        <div className="px-4 pb-4">
                          <button className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-navy-900 text-white text-sm font-medium rounded-lg hover:bg-navy-800 transition-colors">
                            <ExternalLink className="w-4 h-4" />
                            Connect Stripe Account
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Notifications */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-ocean-600" />
                          <h3 className="font-semibold text-gray-900">Notifications</h3>
                        </div>
                        {unreadCount > 0 && (
                          <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{unreadCount}</span>
                        )}
                      </div>
                      <div className="divide-y divide-gray-100">
                        {notifications.length === 0 ? (
                          <p className="p-4 text-sm text-gray-400 text-center">No notifications</p>
                        ) : (
                          notifications.slice(0, 5).map((n) => (
                            <div key={n.id} onClick={() => markNotificationRead(n.id)}
                              className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-ocean-50/50' : ''}`}>
                              <div className="flex items-start gap-2">
                                {!n.isRead && <div className="w-2 h-2 rounded-full bg-ocean-500 mt-1.5 flex-shrink-0" />}
                                <div className={!n.isRead ? '' : 'ml-4'}>
                                  <p className="text-sm font-medium text-gray-800">{n.title}</p>
                                  {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>}
                                  <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Match Insights teaser */}
                  <div className="bg-gradient-to-br from-ocean-50 to-teal-50 rounded-xl border border-ocean-100 p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-ocean-100 rounded-xl">
                        <Sparkles className="w-5 h-5 text-ocean-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-navy-700">Smart Job Matches</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {providerJobMatches.length > 0
                            ? `${providerJobMatches.length} job${providerJobMatches.length !== 1 ? 's' : ''} matched to your skills & location`
                            : 'View AI-ranked job opportunities near you'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('recommended-jobs')}
                      className="flex items-center gap-1.5 px-4 py-2 bg-ocean-600 text-white text-sm font-medium rounded-lg hover:bg-ocean-700 transition-colors whitespace-nowrap flex-shrink-0"
                    >
                      View Jobs <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Recent reviews */}
                  {reviews.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-400" />
                          <h3 className="font-semibold text-gray-900">Recent Reviews</h3>
                        </div>
                        <button onClick={() => setActiveTab('reviews')} className="text-sm text-ocean-600 hover:underline flex items-center gap-1">
                          See all <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {reviews.slice(0, 3).map((r) => (
                          <div key={r.id} className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="text-sm font-medium text-gray-800">{r.reviewerName ?? 'Anonymous'}</p>
                                <div className="flex gap-0.5 mt-0.5">
                                  {[1,2,3,4,5].map((n) => (
                                    <Star key={n} className={`w-3.5 h-3.5 ${n <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                                  ))}
                                </div>
                              </div>
                              <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                            </div>
                            {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
                            {r.providerResponse && (
                              <div className="mt-2 pl-3 border-l-2 border-ocean-300">
                                <p className="text-xs text-gray-500 font-medium">Your response:</p>
                                <p className="text-xs text-gray-600 mt-0.5">{r.providerResponse}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── DOCUMENTS TAB ── */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Documents & Credentials</h2>
                    <button onClick={() => setShowDocUpload(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-ocean-600 text-white text-sm font-medium rounded-lg hover:bg-ocean-700 transition-colors">
                      <FileText className="w-4 h-4" /> Upload Document
                    </button>
                  </div>

                  {documentsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
                    </div>
                  ) : documents.filter((d) => d.isActive).length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                      <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="font-medium text-gray-700">No documents uploaded yet</p>
                      <p className="text-sm text-gray-400 mt-1">Upload your business licence and insurance COI to get approved</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {documents.filter((d) => d.isActive).map((doc) => (
                        <DocumentCard key={doc.id} doc={doc} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── SERVICE AREAS TAB ── */}
              {activeTab === 'service-areas' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-gray-900">Service Areas</h2>
                  {serviceAreasLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
                    </div>
                  ) : (
                    <ServiceAreaManager
                      providerId={providerId}
                      serviceAreas={serviceAreas}
                      onAdd={addServiceArea}
                      onDelete={deleteServiceArea}
                    />
                  )}
                </div>
              )}

              {/* ── PORTFOLIO TAB ── */}
              {activeTab === 'portfolio' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-gray-900">Portfolio</h2>
                  {portfolioLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
                    </div>
                  ) : (
                    <PortfolioGrid
                      items={portfolio}
                      canEdit
                      onUpload={(file, caption) => uploadPortfolioItem(providerId, file, caption)}
                      onDelete={deletePortfolioItem}
                    />
                  )}
                </div>
              )}

              {/* ── REVIEWS TAB ── */}
              {activeTab === 'reviews' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">
                      Reviews <span className="text-gray-400 font-normal text-base">({reviews.length})</span>
                    </h2>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="font-bold text-gray-900">{profile?.avgRating?.toFixed(1) ?? '—'}</span>
                      <span className="text-gray-400 text-sm">avg</span>
                    </div>
                  </div>
                  {reviewsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                      <Star className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="font-medium text-gray-700">No reviews yet</p>
                      <p className="text-sm text-gray-400 mt-1">Reviews appear here after completed bookings</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((r) => (
                        <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-medium text-gray-800">{r.reviewerName ?? 'Anonymous'}</p>
                              <div className="flex gap-0.5 mt-1">
                                {[1,2,3,4,5].map((n) => (
                                  <Star key={n} className={`w-4 h-4 ${n <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                                ))}
                                <span className="text-sm text-gray-500 ml-1">{r.rating}/5</span>
                              </div>
                            </div>
                            <span className="text-sm text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                          </div>

                          {/* Sub-ratings */}
                          {(r.commRating || r.qualityRating || r.punctualityRating) && (
                            <div className="flex gap-3 mb-3">
                              {r.commRating && <span className="text-xs bg-ocean-50 text-ocean-700 px-2 py-1 rounded-full">Comm: {r.commRating}★</span>}
                              {r.qualityRating && <span className="text-xs bg-teal-50 text-teal-700 px-2 py-1 rounded-full">Quality: {r.qualityRating}★</span>}
                              {r.punctualityRating && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">Punctuality: {r.punctualityRating}★</span>}
                            </div>
                          )}

                          {r.comment && <p className="text-sm text-gray-700 mb-3">{r.comment}</p>}

                          {/* Provider response */}
                          {r.providerResponse ? (
                            <div className="pl-4 border-l-2 border-ocean-300 mt-3">
                              <p className="text-xs font-semibold text-ocean-700 mb-1">Your response</p>
                              <p className="text-sm text-gray-600">{r.providerResponse}</p>
                            </div>
                          ) : (
                            respondingTo === r.id ? (
                              <div className="mt-3 space-y-2">
                                <textarea rows={3}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 resize-none"
                                  placeholder="Write a professional response…"
                                  value={responseText} onChange={(e) => setResponseText(e.target.value)} />
                                <div className="flex gap-2">
                                  <button onClick={async () => { await respondToReview(r.id, responseText); setRespondingTo(null); setResponseText(''); }}
                                    className="px-4 py-1.5 bg-ocean-600 text-white text-sm rounded-lg hover:bg-ocean-700">Submit</button>
                                  <button onClick={() => { setRespondingTo(null); setResponseText(''); }}
                                    className="px-4 py-1.5 text-gray-600 text-sm hover:text-gray-900">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => setRespondingTo(r.id)}
                                className="mt-2 flex items-center gap-1.5 text-sm text-ocean-600 hover:text-ocean-700">
                                <MessageSquare className="w-4 h-4" /> Respond to review
                              </button>
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── RECOMMENDED JOBS TAB — Module 4 ── */}
              {activeTab === 'recommended-jobs' && (
                <RecommendedJobsFeed
                  providerJobMatches={providerJobMatches}
                  isLoading={isComputingMatches}
                  expressedInterest={expressedInterest}
                  onExpressInterest={expressInterest}
                />
              )}

              {/* ── SETTINGS TAB ── */}
              {activeTab === 'settings' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-gray-900">Account Settings</h2>
                  <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">Business Information</p>
                        <p className="text-sm text-gray-500">{profile?.businessName} • {profile?.addressCity}, {profile?.addressState}</p>
                      </div>
                      <button className="flex items-center gap-1.5 text-sm text-ocean-600 hover:text-ocean-700">
                        Edit <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">Stripe Payments</p>
                        <p className="text-sm text-gray-500">
                          {profile?.stripeOnboardingComplete ? 'Connected and active' : 'Not connected — required to accept bookings'}
                        </p>
                      </div>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                        <ExternalLink className="w-3.5 h-3.5" />
                        {profile?.stripeOnboardingComplete ? 'Manage' : 'Connect'}
                      </button>
                    </div>
                    <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">Emergency Availability</p>
                        <p className="text-sm text-gray-500">{profile?.emergencyAvailability ? 'Enabled' : 'Disabled'}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${profile?.emergencyAvailability ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500'}`}>
                        {profile?.emergencyAvailability ? 'On' : 'Off'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        </div>
      </div>

      {/* Document upload modal */}
      {showDocUpload && (
        <DocumentUploadModal
          providerId={providerId}
          existingDocuments={documents}
          onUpload={(file, meta) => uploadDocument(providerId, file, meta)}
          onClose={() => setShowDocUpload(false)}
        />
      )}
    </div>
  );
}

// ─── Document Card ────────────────────────────────────────────────────────────

function DocumentCard({ doc }: { doc: ProviderDocument }) {
  const statusStyle: Record<string, string> = {
    pending:  'bg-amber-100 text-amber-700',
    approved: 'bg-teal-100 text-teal-700',
    rejected: 'bg-red-100 text-red-700',
  };
  const isExpiringSoon = doc.expirationDate && (() => {
    const days = Math.ceil((new Date(doc.expirationDate!).getTime() - Date.now()) / 86400000);
    return days > 0 && days <= 30;
  })();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-ocean-100 flex items-center justify-center flex-shrink-0">
        <FileText className="w-5 h-5 text-ocean-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800">{DOCUMENT_TYPE_LABELS[doc.documentType]}</p>
        {doc.fileName && <p className="text-xs text-gray-400 truncate mt-0.5">{doc.fileName}</p>}
        <div className="flex items-center gap-3 mt-1">
          {doc.expirationDate && (
            <span className={`text-xs ${isExpiringSoon ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
              {isExpiringSoon && '⚠ '}Expires {new Date(doc.expirationDate).toLocaleDateString()}
            </span>
          )}
        </div>
        {doc.status === 'rejected' && doc.rejectionReason && (
          <p className="text-xs text-red-600 mt-1">Rejected: {doc.rejectionReason}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle[doc.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
        </span>
        {doc.status === 'rejected' && (
          <button className="text-xs text-ocean-600 hover:underline">Resubmit</button>
        )}
      </div>
    </div>
  );
}
