import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, FileText, Users, AlertTriangle, CheckCircle, XCircle,
  Clock, Star, TrendingUp, Search, ChevronDown, ChevronUp,
  Eye, Ban, BarChart2, RefreshCw,
} from 'lucide-react';
import { useProviderOnboardingStore } from '../store/providerOnboardingStore';
import { useAuthStore } from '../store/authStore';
import {
  VERIFICATION_STATUS_LABELS, VERIFICATION_STATUS_COLORS,
  DOCUMENT_TYPE_LABELS,
} from '../types';
import type { ProviderProfile, ProviderDocument } from '../types';

type AdminTab = 'queue' | 'providers' | 'fraud' | 'overview';

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number | string; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </div>
  );
}

// ─── Provider queue row ───────────────────────────────────────────────────────

function ProviderQueueRow({
  provider, documents, adminId,
  onApprove, onReject, onSuspend,
  onApproveDoc, onRejectDoc,
}: {
  provider: ProviderProfile;
  documents: ProviderDocument[];
  adminId: string;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onSuspend: (reason: string) => void;
  onApproveDoc: (docId: string) => void;
  onRejectDoc: (docId: string, reason: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectDocId, setRejectDocId] = useState<string | null>(null);
  const [docRejectReason, setDocRejectReason] = useState('');

  const providerDocs = documents.filter((d) => d.providerId === provider.id && d.isActive);
  const statusStyle = {
    good: 'bg-teal-100 text-teal-700',
    attention: 'bg-amber-100 text-amber-700',
    critical: 'bg-red-100 text-red-700',
    ocean: 'bg-ocean-100 text-ocean-700',
    gray: 'bg-gray-100 text-gray-600',
  };

  const verColor = VERIFICATION_STATUS_COLORS[provider.verificationStatus];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 flex items-center gap-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-navy-800 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
          {provider.businessName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{provider.businessName}</p>
          <p className="text-sm text-gray-500">{provider.contactName} • {provider.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle[verColor as keyof typeof statusStyle] ?? 'bg-gray-100 text-gray-600'}`}>
              {VERIFICATION_STATUS_LABELS[provider.verificationStatus]}
            </span>
            <span className="text-xs text-gray-400">{provider.addressCity}, {provider.addressState}</span>
            <span className="text-xs text-gray-400">Joined {new Date(provider.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{providerDocs.length} doc(s)</span>
          <button onClick={() => setExpanded((v) => !v)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50">
          {/* Profile details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-400">Categories:</span> <span className="text-gray-700">{provider.serviceCategories.join(', ') || '—'}</span></div>
            <div><span className="text-gray-400">Years:</span> <span className="text-gray-700">{provider.yearsInBusiness ?? '—'}</span></div>
            <div><span className="text-gray-400">Stripe:</span> <span className={`font-medium ${provider.stripeOnboardingComplete ? 'text-teal-600' : 'text-red-500'}`}>{provider.stripeOnboardingComplete ? 'Connected' : 'Not connected'}</span></div>
            <div><span className="text-gray-400">Emergency:</span> <span className="text-gray-700">{provider.emergencyAvailability ? 'Yes' : 'No'}</span></div>
          </div>
          {provider.bio && <p className="text-sm text-gray-600 italic">"{provider.bio}"</p>}

          {/* Documents */}
          {providerDocs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Documents</p>
              <div className="space-y-2">
                {providerDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                    <FileText className="w-4 h-4 text-ocean-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{DOCUMENT_TYPE_LABELS[doc.documentType]}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {doc.expirationDate && <span className="text-xs text-gray-400">Expires {new Date(doc.expirationDate).toLocaleDateString()}</span>}
                        {doc.fileName && <span className="text-xs text-gray-400">{doc.fileName}</span>}
                      </div>
                      {rejectDocId === doc.id && (
                        <div className="mt-2 flex gap-2">
                          <input className="flex-1 px-2 py-1 text-xs border border-red-300 rounded focus:outline-none focus:ring-1 focus:ring-red-400"
                            placeholder="Rejection reason…" value={docRejectReason}
                            onChange={(e) => setDocRejectReason(e.target.value)} />
                          <button onClick={() => { onRejectDoc(doc.id, docRejectReason); setRejectDocId(null); setDocRejectReason(''); }}
                            className="px-2 py-1 bg-red-500 text-white text-xs rounded">Reject</button>
                          <button onClick={() => setRejectDocId(null)} className="px-2 py-1 text-xs text-gray-500">Cancel</button>
                        </div>
                      )}
                    </div>
                    {doc.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => onApproveDoc(doc.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-teal-500 text-white text-xs font-medium rounded-lg hover:bg-teal-600">
                          <CheckCircle className="w-3 h-3" /> Approve
                        </button>
                        <button onClick={() => setRejectDocId(doc.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600">
                          <XCircle className="w-3 h-3" /> Reject
                        </button>
                      </div>
                    )}
                    {doc.status !== 'pending' && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        doc.status === 'approved' ? 'bg-teal-100 text-teal-700' : 'bg-red-100 text-red-700'
                      }`}>{doc.status}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
            {provider.verificationStatus === 'pending_review' && (
              <button onClick={onApprove}
                className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white text-sm font-semibold rounded-lg hover:bg-teal-600 transition-colors">
                <CheckCircle className="w-4 h-4" /> Approve Provider
              </button>
            )}
            {showRejectInput ? (
              <div className="flex gap-2 flex-1">
                <input className="flex-1 px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="Reason for rejection…" value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)} />
                <button onClick={() => { onReject(rejectReason); setShowRejectInput(false); }}
                  className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600">Submit</button>
                <button onClick={() => setShowRejectInput(false)} className="px-3 py-2 text-sm text-gray-500">Cancel</button>
              </div>
            ) : (
              <>
                {provider.verificationStatus !== 'rejected' && (
                  <button onClick={() => setShowRejectInput(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors">
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                )}
                {provider.verificationStatus !== 'suspended' && (
                  <button onClick={() => onSuspend('Manual suspension by admin')}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                    <Ban className="w-4 h-4" /> Suspend
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main AdminDashboard ──────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const {
    providers, pendingProviders, documents, fraudFlags,
    fetchAllProviders, fetchPendingProviders, fetchDocuments, fetchFraudFlags,
    adminApproveProvider, adminSuspendProvider,
    adminApproveDocument, adminRejectDocument,
    dismissFraudFlag,
  } = useProviderOnboardingStore();

  const [activeTab, setActiveTab] = useState<AdminTab>('queue');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const adminId = user?.id ?? 'admin-1';

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([
        fetchAllProviders(),
        fetchPendingProviders(),
        fetchFraudFlags(),
      ]);
      // fetch docs for pending providers
      for (const p of pendingProviders) await fetchDocuments(p.id);
      setLoading(false);
    })();
  }, []);

  const filteredProviders = providers.filter((p) =>
    p.businessName.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  const TABS: { id: AdminTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'overview',   label: 'Overview',         icon: BarChart2 },
    { id: 'queue',      label: 'Pending Queue',     icon: Clock,    badge: pendingProviders.length },
    { id: 'providers',  label: 'All Providers',     icon: Users },
    { id: 'fraud',      label: 'Fraud Flags',       icon: AlertTriangle, badge: fraudFlags.filter((f) => f.status === 'open').length },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-ocean-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading admin dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-navy-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-gold-400" />
          <div>
            <h1 className="font-bold text-lg">Admin Dashboard</h1>
            <p className="text-white/50 text-xs">Yachtworx moderation tools</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/50 text-sm">Logged in as {user?.name ?? 'Admin'}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-52 flex-shrink-0">
            <nav className="space-y-1 sticky top-6">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id ? 'bg-navy-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{tab.label}</span>
                    {tab.badge ? (
                      <span className="ml-auto w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{tab.badge}</span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>

              {/* ── OVERVIEW ── */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-gray-900">Platform Overview</h2>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={Users}       label="Approved Providers"   value={providers.filter((p) => p.verificationStatus === 'approved').length} color="bg-teal-100 text-teal-600" />
                    <StatCard icon={Clock}        label="Pending Review"       value={pendingProviders.length} color="bg-amber-100 text-amber-600" />
                    <StatCard icon={AlertTriangle} label="Open Fraud Flags"   value={fraudFlags.filter((f) => f.status === 'open').length} color="bg-red-100 text-red-600" />
                    <StatCard icon={TrendingUp}   label="Avg Trust Score"     value={providers.length ? (providers.reduce((s, p) => s + p.trustScore, 0) / providers.length).toFixed(1) : '—'} color="bg-ocean-100 text-ocean-600" />
                  </div>

                  {/* Recent providers */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900">All Providers</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {providers.map((p) => (
                        <div key={p.id} className="flex items-center gap-4 px-4 py-3">
                          <div className="w-8 h-8 rounded-full bg-navy-800 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {p.businessName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800">{p.businessName}</p>
                            <p className="text-xs text-gray-400">{p.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                              {[1,2,3,4,5].map((n) => (
                                <Star key={n} className={`w-3 h-3 ${n <= (p.avgRating ?? 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                              ))}
                            </div>
                            <span className="text-xs text-gray-500">Trust {p.trustScore.toFixed(0)}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              p.verificationStatus === 'approved' ? 'bg-teal-100 text-teal-700' :
                              p.verificationStatus === 'suspended' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>{VERIFICATION_STATUS_LABELS[p.verificationStatus]}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── PENDING QUEUE ── */}
              {activeTab === 'queue' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    Pending Review Queue <span className="text-gray-400 font-normal text-base">({pendingProviders.length})</span>
                  </h2>
                  {pendingProviders.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                      <CheckCircle className="w-10 h-10 text-teal-400 mx-auto mb-3" />
                      <p className="font-medium text-gray-700">All clear! No providers pending review.</p>
                    </div>
                  ) : (
                    pendingProviders.map((provider) => (
                      <ProviderQueueRow
                        key={provider.id}
                        provider={provider}
                        documents={documents}
                        adminId={adminId}
                        onApprove={() => adminApproveProvider(provider.id, adminId)}
                        onReject={(reason) => adminSuspendProvider(provider.id, adminId, reason)}
                        onSuspend={(reason) => adminSuspendProvider(provider.id, adminId, reason)}
                        onApproveDoc={(docId) => adminApproveDocument(docId, adminId)}
                        onRejectDoc={(docId, reason) => adminRejectDocument(docId, adminId, reason)}
                      />
                    ))
                  )}
                </div>
              )}

              {/* ── ALL PROVIDERS ── */}
              {activeTab === 'providers' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-900">All Providers</h2>
                    <div className="relative ml-auto">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
                        placeholder="Search providers…"
                        value={search} onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <button onClick={() => fetchAllProviders()} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Provider</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Categories</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Trust</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Rating</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Jobs</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredProviders.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-gray-800">{p.businessName}</p>
                                <p className="text-xs text-gray-400">{p.email}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-xs text-gray-500 line-clamp-1">{p.serviceCategories.join(', ') || '—'}</p>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`font-bold text-sm ${
                                p.trustScore >= 85 ? 'text-teal-600' :
                                p.trustScore >= 70 ? 'text-ocean-600' :
                                p.trustScore >= 50 ? 'text-amber-600' : 'text-red-500'
                              }`}>{p.trustScore.toFixed(0)}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                <span className="text-sm text-gray-700">{p.avgRating?.toFixed(1) ?? '—'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-gray-600">{p.totalJobsCompleted}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                p.verificationStatus === 'approved'  ? 'bg-teal-100 text-teal-700' :
                                p.verificationStatus === 'suspended' ? 'bg-red-100 text-red-700' :
                                p.verificationStatus === 'pending_review' ? 'bg-amber-100 text-amber-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>{VERIFICATION_STATUS_LABELS[p.verificationStatus]}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button className="p-1.5 text-gray-400 hover:text-ocean-600 hover:bg-ocean-50 rounded">
                                  <Eye className="w-4 h-4" />
                                </button>
                                {p.verificationStatus !== 'suspended' && (
                                  <button onClick={() => adminSuspendProvider(p.id, adminId, 'Manual suspension by admin')}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                                    <Ban className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredProviders.length === 0 && (
                      <div className="p-8 text-center text-gray-400">No providers match your search</div>
                    )}
                  </div>
                </div>
              )}

              {/* ── FRAUD FLAGS ── */}
              {activeTab === 'fraud' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    Fraud Flags <span className="text-gray-400 font-normal text-base">({fraudFlags.filter((f) => f.status === 'open').length} open)</span>
                  </h2>
                  {fraudFlags.filter((f) => f.status === 'open').length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                      <Shield className="w-10 h-10 text-teal-400 mx-auto mb-3" />
                      <p className="font-medium text-gray-700">No open fraud flags. Platform is clean!</p>
                    </div>
                  ) : (
                    fraudFlags.filter((f) => f.status === 'open').map((flag) => {
                      const provider = [...providers, ...pendingProviders].find((p) => p.id === flag.providerId);
                      return (
                        <div key={flag.id} className="bg-white rounded-xl border border-red-200 p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                              <AlertTriangle className="w-5 h-5 text-red-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-semibold text-gray-900">
                                    {flag.flagType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                                  </p>
                                  {provider && (
                                    <p className="text-sm text-gray-500">{provider.businessName} • {provider.email}</p>
                                  )}
                                </div>
                                <span className="text-xs text-gray-400">{new Date(flag.createdAt).toLocaleDateString()}</span>
                              </div>
                              {flag.detail && (
                                <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                                  <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                                    {JSON.stringify(flag.detail, null, 2)}
                                  </pre>
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-3">
                                <button onClick={() => dismissFraudFlag(flag.id, adminId)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
                                  <CheckCircle className="w-4 h-4" /> Dismiss
                                </button>
                                {provider && (
                                  <button onClick={() => adminSuspendProvider(provider.id, adminId, `Fraud flag: ${flag.flagType}`)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors">
                                    <Ban className="w-4 h-4" /> Suspend Provider
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
