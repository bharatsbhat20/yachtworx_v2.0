/**
 * InsuranceWallet — Owner's insurance & warranty hub
 * Shows active policies, open claims, and warranty registrations.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, FileText, Award, Plus, AlertCircle,
  CheckCircle, ChevronRight, Wifi, WifiOff,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useInsuranceStore } from '../store/insuranceStore';
import { useAuthStore } from '../store/authStore';
import { useBoatStore } from '../store/boatStore';
import { isDemoMode } from '../lib/supabase';
import { PolicyCard } from '../components/insurance/PolicyCard';
import type {
  InsuranceClaim,
  InsurancePolicy,
  InsuranceProduct,
  InsuranceQuote,
  WarrantyRegistration,
} from '../types';

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = 'policies' | 'claims' | 'warranties';

// ─── Inline stat card ────────────────────────────────────────────────────────

const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: number | string;
  color?: string;
}> = ({ icon: Icon, label, value, color = 'text-ocean-500' }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4">
    <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center bg-gray-50 flex-shrink-0', color)}>
      <Icon size={22} />
    </div>
    <div>
      <p className="text-2xl font-heading font-bold text-navy-500">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  </div>
);

// ─── Minimal ClaimCard (inline, since only PolicyCard is confirmed to exist) ──

const ClaimStatusBadge: React.FC<{ status: InsuranceClaim['status'] }> = ({ status }) => {
  const map: Record<InsuranceClaim['status'], { label: string; classes: string }> = {
    draft:               { label: 'Draft',               classes: 'bg-gray-100 text-gray-600' },
    submitted:           { label: 'Submitted',           classes: 'bg-blue-50 text-blue-700' },
    under_review:        { label: 'Under Review',        classes: 'bg-indigo-50 text-indigo-700' },
    pending_assessment:  { label: 'Pending Assessment',  classes: 'bg-yellow-50 text-yellow-700' },
    assessment_complete: { label: 'Assessment Complete', classes: 'bg-teal-50 text-teal-700' },
    pending_approval:    { label: 'Pending Approval',    classes: 'bg-orange-50 text-orange-700' },
    approved:            { label: 'Approved',            classes: 'bg-emerald-50 text-emerald-700' },
    payment_processing:  { label: 'Payment Processing',  classes: 'bg-cyan-50 text-cyan-700' },
    paid:                { label: 'Paid',                classes: 'bg-emerald-100 text-emerald-800' },
    rejected:            { label: 'Rejected',            classes: 'bg-red-50 text-red-600' },
    appealed:            { label: 'Appealed',            classes: 'bg-purple-50 text-purple-700' },
    closed:              { label: 'Closed',              classes: 'bg-gray-100 text-gray-500' },
  };
  const cfg = map[status] ?? map.draft;
  return (
    <span className={clsx('text-xs font-medium px-2.5 py-1 rounded-full', cfg.classes)}>
      {cfg.label}
    </span>
  );
};

const ClaimRow: React.FC<{ claim: InsuranceClaim; index: number }> = ({ claim, index }) => {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 text-ocean-500">
            <FileText size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-navy-500 truncate">{claim.reference}</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {claim.incidentType.replace(/_/g, ' ')} · {fmtDate(claim.incidentDate)}
            </p>
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{claim.description}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <ClaimStatusBadge status={claim.status} />
          <p className="text-sm font-semibold text-navy-500">{fmt(claim.estimatedLossUsd)}</p>
          {claim.approvedAmountUsd !== undefined && (
            <p className="text-xs text-emerald-600">Approved: {fmt(claim.approvedAmountUsd)}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Minimal WarrantyRow ──────────────────────────────────────────────────────

const WarrantyRow: React.FC<{ warranty: WarrantyRegistration; index: number; onFileClaim?: (id: string) => void }> = ({
  warranty, index, onFileClaim,
}) => {
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const daysLeft = Math.ceil((new Date(warranty.expiryDate).getTime() - Date.now()) / 86_400_000);
  const statusClasses =
    warranty.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
    warranty.status === 'expired' ? 'bg-gray-100 text-gray-500' :
    'bg-red-50 text-red-600';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 text-teal-500">
            <Award size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-navy-500 truncate">{warranty.reference}</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {warranty.providerName ?? 'Provider'} · {warranty.warrantyType.replace(/_/g, ' ')}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {fmtDate(warranty.effectiveDate)} – {fmtDate(warranty.expiryDate)}
              {warranty.status === 'active' && daysLeft > 0 && (
                <span className="ml-2 text-emerald-600">{daysLeft}d remaining</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className={clsx('text-xs font-medium px-2.5 py-1 rounded-full capitalize', statusClasses)}>
            {warranty.status}
          </span>
          {warranty.status === 'active' && onFileClaim && (
            <button
              onClick={() => onFileClaim(warranty.id)}
              className="text-xs text-ocean-500 hover:text-ocean-600 font-medium flex items-center gap-1"
            >
              File Claim <ChevronRight size={12} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Inline FNOL Modal (minimal, since FNOLModal component may not be built yet) ─

interface FNOLData {
  policyId: string;
  incidentDate: string;
  incidentType: string;
  description: string;
  estimatedLossUsd: number;
}

const FNOL_INCIDENT_TYPES = ['collision', 'weather', 'theft', 'fire', 'sinking', 'machinery', 'other'];

const FNOLModal: React.FC<{
  open: boolean;
  onClose: () => void;
  policies: InsurancePolicy[];
  preselectedPolicyId?: string;
  onSubmit: (data: FNOLData) => Promise<void>;
}> = ({ open, onClose, policies, preselectedPolicyId, onSubmit }) => {
  const [form, setForm] = useState<FNOLData>({
    policyId: preselectedPolicyId ?? policies[0]?.id ?? '',
    incidentDate: new Date().toISOString().split('T')[0],
    incidentType: 'other',
    description: '',
    estimatedLossUsd: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (preselectedPolicyId) {
      setForm(f => ({ ...f, policyId: preselectedPolicyId }));
    }
  }, [preselectedPolicyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(form);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
          >
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-heading font-bold text-navy-500">File a Claim (FNOL)</h2>
              <p className="text-sm text-gray-500 mt-1">First Notice of Loss — tell us what happened</p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Policy</label>
                <select
                  value={form.policyId}
                  onChange={e => setForm(f => ({ ...f, policyId: e.target.value }))}
                  required
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
                >
                  {policies.map(p => (
                    <option key={p.id} value={p.id}>{p.policyNumber} — {p.boatName}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Incident Date</label>
                  <input
                    type="date"
                    value={form.incidentDate}
                    onChange={e => setForm(f => ({ ...f, incidentDate: e.target.value }))}
                    required
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Incident Type</label>
                  <select
                    value={form.incidentType}
                    onChange={e => setForm(f => ({ ...f, incidentType: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  >
                    {FNOL_INCIDENT_TYPES.map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  required
                  rows={3}
                  placeholder="Describe what happened…"
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Estimated Loss (USD)</label>
                <input
                  type="number"
                  value={form.estimatedLossUsd || ''}
                  onChange={e => setForm(f => ({ ...f, estimatedLossUsd: Number(e.target.value) }))}
                  required
                  min={0}
                  placeholder="0"
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-ocean-500 text-white px-4 py-2.5 text-sm font-medium hover:bg-ocean-600 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Submitting…' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── Inline QuoteWizard ───────────────────────────────────────────────────────

const QuoteWizardModal: React.FC<{
  open: boolean;
  onClose: () => void;
  products: InsuranceProduct[];
  boatId: string;
  boatName: string;
  onSubmit: (data: Partial<InsuranceQuote>) => void;
}> = ({ open, onClose, products, boatId, boatName, onSubmit }) => {
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id ?? '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 600));
    onSubmit({ productId: selectedProductId, boatId, boatName });
    setSubmitting(false);
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
          >
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-heading font-bold text-navy-500">Get Coverage</h2>
              <p className="text-sm text-gray-500 mt-1">Request a quote for <strong>{boatName}</strong></p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Select Product</label>
                <div className="mt-2 space-y-2">
                  {products.slice(0, 5).map(p => (
                    <label
                      key={p.id}
                      className={clsx(
                        'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors',
                        selectedProductId === p.id
                          ? 'border-ocean-500 bg-ocean-50'
                          : 'border-gray-200 hover:border-gray-300',
                      )}
                    >
                      <input
                        type="radio"
                        name="product"
                        value={p.id}
                        checked={selectedProductId === p.id}
                        onChange={() => setSelectedProductId(p.id)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-navy-500">{p.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{p.insurerName} · From ${p.minPremiumUsd.toLocaleString()}/yr</p>
                      </div>
                    </label>
                  ))}
                  {products.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No products available</p>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || products.length === 0}
                  className="flex-1 rounded-xl bg-ocean-500 text-white px-4 py-2.5 text-sm font-medium hover:bg-ocean-600 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Requesting…' : 'Request Quote'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── Success Toast ────────────────────────────────────────────────────────────

const SuccessToast: React.FC<{ message: string; visible: boolean }> = ({ message, visible }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-2 font-medium"
      >
        <CheckCircle size={18} />
        {message}
      </motion.div>
    )}
  </AnimatePresence>
);

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ icon: React.ElementType; title: string; description: string; action?: React.ReactNode }> = ({
  icon: Icon, title, description, action,
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
      <Icon size={28} className="text-gray-400" />
    </div>
    <h3 className="text-lg font-semibold text-navy-500">{title}</h3>
    <p className="text-sm text-gray-500 mt-1 max-w-xs">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const InsuranceWallet: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { boats, getBoatsByOwner } = useBoatStore();
  const {
    policies, claims, warranties, products,
    isLoading,
    loadPolicies, loadClaims, loadWarranties, loadProducts,
    createClaim, createQuote,
    getActivePolicies, getOpenClaims, getActiveWarranties,
  } = useInsuranceStore();

  const [tab, setTab] = useState<Tab>('policies');
  const [fnolOpen, setFnolOpen] = useState(false);
  const [fnolPolicyId, setFnolPolicyId] = useState<string | undefined>();
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  const userId = currentUser?.id ?? 'owner-1';
  const myBoats = getBoatsByOwner(userId);
  const defaultBoat = myBoats[0] ?? boats[0];

  const activePolicies = getActivePolicies(userId);
  const openClaims = getOpenClaims(userId);
  const activeWarranties = getActiveWarranties(userId);

  useEffect(() => {
    loadPolicies(userId);
    loadClaims(userId);
    loadWarranties(userId);
    loadProducts();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }, []);

  const handleOpenFNOL = (policyId?: string) => {
    setFnolPolicyId(policyId);
    setFnolOpen(true);
  };

  const handleFNOLSubmit = async (data: FNOLData) => {
    await createClaim({
      policyId: data.policyId,
      ownerId: userId,
      incidentDate: data.incidentDate,
      incidentType: data.incidentType as InsuranceClaim['incidentType'],
      description: data.description,
      estimatedLossUsd: data.estimatedLossUsd,
      status: 'submitted',
    } as Partial<InsuranceClaim>);
    showToast('Claim submitted successfully!');
  };

  const handleQuoteSubmit = async (data: Partial<InsuranceQuote>) => {
    await createQuote({ ...data, ownerId: userId });
    showToast('Quote requested! We\'ll be in touch shortly.');
  };

  const TABS: { id: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { id: 'policies',   label: 'Policies',   icon: Shield,   count: policies.length },
    { id: 'claims',     label: 'Claims',     icon: FileText, count: claims.length },
    { id: 'warranties', label: 'Warranties', icon: Award,    count: warranties.length },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <SuccessToast message={toast.message} visible={toast.visible} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-heading font-bold text-navy-500">Insurance &amp; Warranty</h1>
            <p className="text-gray-500 mt-1">Manage your coverage, claims, and warranty registrations</p>
          </div>
          <div className="flex items-center gap-3">
            {!isDemoMode && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full font-medium">
                <Wifi size={12} />
                Live Mode
              </div>
            )}
            {isDemoMode && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full font-medium">
                <WifiOff size={12} />
                Demo Mode
              </div>
            )}
            <button
              onClick={() => setQuoteOpen(true)}
              className="flex items-center gap-2 bg-ocean-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-ocean-600 transition-colors shadow-sm"
            >
              <Plus size={16} />
              Get Coverage
            </button>
          </div>
        </motion.div>

        {/* Demo notice */}
        {isDemoMode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3"
          >
            <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Demo Mode Active</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Connect to live mode to manage real insurance policies and claims. Data shown is for demonstration purposes only.
              </p>
            </div>
          </motion.div>
        )}

        {/* Stat Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
        >
          <StatCard icon={Shield}   label="Active Policies"   value={activePolicies.length}   color="text-ocean-500" />
          <StatCard icon={FileText} label="Open Claims"       value={openClaims.length}        color="text-amber-500" />
          <StatCard icon={Award}    label="Active Warranties" value={activeWarranties.length}  color="text-teal-500" />
        </motion.div>

        {/* Tab Bar */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl mb-6 w-fit">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                tab === t.id
                  ? 'bg-ocean-500 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-200',
              )}
            >
              <t.icon size={15} />
              {t.label}
              {t.count > 0 && (
                <span className={clsx(
                  'text-xs px-1.5 py-0.5 rounded-full font-semibold',
                  tab === t.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600',
                )}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {/* Policies */}
          {tab === 'policies' && (
            <motion.div
              key="policies"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {isLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-40 animate-pulse" />
                  ))}
                </div>
              ) : policies.length === 0 ? (
                <EmptyState
                  icon={Shield}
                  title="No policies yet"
                  description="Get coverage for your vessel to protect against accidents, liability, and more."
                  action={
                    <button
                      onClick={() => setQuoteOpen(true)}
                      className="flex items-center gap-2 bg-ocean-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-ocean-600 transition-colors"
                    >
                      <Plus size={16} /> Get Coverage
                    </button>
                  }
                />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {policies.map((policy, i) => (
                    <PolicyCard
                      key={policy.id}
                      policy={policy}
                      index={i}
                      onFileClaim={() => handleOpenFNOL(policy.id)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Claims */}
          {tab === 'claims' && (
            <motion.div
              key="claims"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => handleOpenFNOL()}
                  disabled={policies.length === 0}
                  className="flex items-center gap-2 bg-ocean-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-ocean-600 disabled:opacity-40 transition-colors shadow-sm"
                >
                  <Plus size={16} /> File a Claim
                </button>
              </div>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-24 animate-pulse" />
                  ))}
                </div>
              ) : claims.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No claims filed"
                  description="When you need to file a claim, you can do so here and track its progress end-to-end."
                  action={
                    policies.length > 0 ? (
                      <button
                        onClick={() => handleOpenFNOL()}
                        className="flex items-center gap-2 bg-ocean-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-ocean-600 transition-colors"
                      >
                        <Plus size={16} /> File a Claim
                      </button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="space-y-3">
                  {claims.map((claim, i) => (
                    <ClaimRow key={claim.id} claim={claim} index={i} />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Warranties */}
          {tab === 'warranties' && (
            <motion.div
              key="warranties"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-24 animate-pulse" />
                  ))}
                </div>
              ) : warranties.length === 0 ? (
                <EmptyState
                  icon={Award}
                  title="No warranties registered"
                  description="Warranties are automatically registered when service providers include them in your bookings."
                />
              ) : (
                <div className="space-y-3">
                  {warranties.map((w, i) => (
                    <WarrantyRow
                      key={w.id}
                      warranty={w}
                      index={i}
                      onFileClaim={() => handleOpenFNOL(policies.find(p => p.boatId === w.boatId)?.id)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FNOL Modal */}
      <FNOLModal
        open={fnolOpen}
        onClose={() => { setFnolOpen(false); setFnolPolicyId(undefined); }}
        policies={policies.filter(p => p.status === 'active' || p.status === 'expiring')}
        preselectedPolicyId={fnolPolicyId}
        onSubmit={handleFNOLSubmit}
      />

      {/* Quote Wizard */}
      <QuoteWizardModal
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        products={products}
        boatId={defaultBoat?.id ?? ''}
        boatName={defaultBoat?.name ?? 'My Vessel'}
        onSubmit={handleQuoteSubmit}
      />
    </div>
  );
};
