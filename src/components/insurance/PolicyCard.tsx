import React from 'react';
import { motion } from 'framer-motion';
import {
  Ship, Shield, AlertTriangle, RefreshCw, FileText,
  Calendar, DollarSign, Hash,
} from 'lucide-react';
import type { InsurancePolicy, PolicyStatus } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  policy: InsurancePolicy;
  onFileClaim?: (policyId: string) => void;
  onClick?: () => void;
  index?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const daysUntil = (iso: string): number =>
  Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);

const STATUS_CONFIG: Record<PolicyStatus, { label: string; classes: string }> = {
  active:       { label: 'Active',        classes: 'bg-emerald-50 text-emerald-700' },
  expiring:     { label: 'Expiring Soon', classes: 'bg-amber-50 text-amber-700' },
  pending_bind: { label: 'Pending Bind',  classes: 'bg-blue-50 text-blue-700' },
  expired:      { label: 'Expired',       classes: 'bg-gray-100 text-gray-500' },
  lapsed:       { label: 'Lapsed',        classes: 'bg-gray-100 text-gray-500' },
  cancelled:    { label: 'Cancelled',     classes: 'bg-red-50 text-red-600' },
};

const formatCoverageType = (type: string) =>
  type
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' & ')
    .replace(' And ', ' & ');

// ─── Component ────────────────────────────────────────────────────────────────

export const PolicyCard: React.FC<Props> = ({ policy, onFileClaim, onClick, index = 0 }) => {
  const { label, classes } = STATUS_CONFIG[policy.status] ?? STATUS_CONFIG.expired;
  const days = daysUntil(policy.expiryDate);
  const isExpiringSoon = days >= 0 && days <= 30;
  const coverageLabel = formatCoverageType(policy.productType);

  const stats: { label: string; value: string }[] = [
    { label: 'Premium / yr',    value: fmt(policy.annualPremiumUsd) },
    { label: 'Agreed Value',    value: fmt(policy.agreedValueUsd) },
    { label: 'Deductible',      value: fmt(policy.deductibleUsd) },
    { label: 'Liability Limit', value: policy.agreedValueUsd ? fmt(policy.agreedValueUsd) : '—' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={`bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Ship size={14} className="text-ocean-500 flex-shrink-0" />
            <h4 className="font-heading font-semibold text-navy-500 text-sm leading-snug truncate">
              {policy.boatName ?? 'Unknown Vessel'}
            </h4>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`${classes} rounded-full px-2 py-0.5 text-xs font-medium`}>
              {label}
            </span>
            <span className="bg-ocean-50 text-ocean-700 rounded-full px-2 py-0.5 text-xs font-medium">
              {coverageLabel}
            </span>
            {policy.autoRenew && (
              <span className="bg-teal-50 text-teal-700 rounded-full px-2 py-0.5 text-xs font-medium flex items-center gap-1">
                <RefreshCw size={9} />
                Auto-renew
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-gray-400 flex-shrink-0">
          <Hash size={10} />
          <span className="text-xs font-mono">{policy.policyNumber}</span>
        </div>
      </div>

      {/* ── Stats Grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {stats.map(({ label: l, value }) => (
          <div key={l} className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-0.5">{l}</p>
            <p className="text-sm font-heading font-bold text-navy-500">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Expiry Row ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 mb-4">
        <Calendar size={12} className={isExpiringSoon ? 'text-amber-500' : 'text-gray-400'} />
        <span className={`text-xs ${isExpiringSoon ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>
          {policy.status === 'expired' || policy.status === 'cancelled' || days < 0
            ? `Expired ${fmtDate(policy.expiryDate)}`
            : `Expires ${fmtDate(policy.expiryDate)}`}
        </span>
        {isExpiringSoon && (
          <span className="flex items-center gap-1 bg-amber-50 text-amber-700 rounded-full px-2 py-0.5 text-xs font-medium ml-1">
            <AlertTriangle size={9} />
            {days === 0 ? 'Today' : `${days}d left`}
          </span>
        )}
      </div>

      {/* ── Footer: Insurer + Actions ───────────────────────────────────── */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Shield size={12} className="text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-400 truncate">{policy.insurerName}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onClick && (
            <button
              onClick={(e) => { e.stopPropagation(); onClick(); }}
              className="flex items-center gap-1.5 text-xs text-ocean-600 hover:text-ocean-700 font-medium transition-colors"
            >
              <FileText size={12} />
              View Details
            </button>
          )}
          {onFileClaim && policy.status === 'active' && (
            <button
              onClick={(e) => { e.stopPropagation(); onFileClaim(policy.id); }}
              className="flex items-center gap-1.5 bg-ocean-500 hover:bg-ocean-600 text-white rounded-xl px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <DollarSign size={11} />
              File a Claim
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
