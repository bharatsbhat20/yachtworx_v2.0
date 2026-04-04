import React from 'react';
import { motion } from 'framer-motion';
import {
  Ship, Hash, MapPin, Calendar, AlertCircle,
  CheckCircle2, Clock, XCircle, DollarSign, ChevronRight,
} from 'lucide-react';
import type { InsuranceClaim, ClaimStatus } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  claim: InsuranceClaim;
  onUpdate?: (claimId: string, status: ClaimStatus) => void;
  index?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

interface StatusConfig {
  label: string;
  classes: string;
  icon: React.ElementType;
}

const STATUS_CONFIG: Record<ClaimStatus, StatusConfig> = {
  draft:               { label: 'Draft',               classes: 'bg-gray-100 text-gray-500',         icon: Clock },
  submitted:           { label: 'Submitted',            classes: 'bg-blue-50 text-blue-700',          icon: CheckCircle2 },
  under_review:        { label: 'Under Review',         classes: 'bg-indigo-50 text-indigo-700',      icon: Clock },
  pending_assessment:  { label: 'Pending Assessment',   classes: 'bg-violet-50 text-violet-700',      icon: Clock },
  assessment_complete: { label: 'Assessment Complete',  classes: 'bg-purple-50 text-purple-700',      icon: CheckCircle2 },
  pending_approval:    { label: 'Pending Approval',     classes: 'bg-amber-50 text-amber-700',        icon: Clock },
  approved:            { label: 'Approved',             classes: 'bg-emerald-50 text-emerald-700',    icon: CheckCircle2 },
  payment_processing:  { label: 'Payment Processing',   classes: 'bg-teal-50 text-teal-700',          icon: DollarSign },
  paid:                { label: 'Paid',                 classes: 'bg-emerald-100 text-emerald-800',   icon: CheckCircle2 },
  rejected:            { label: 'Rejected',             classes: 'bg-red-50 text-red-600',            icon: XCircle },
  appealed:            { label: 'Appealed',             classes: 'bg-orange-50 text-orange-700',      icon: AlertCircle },
  closed:              { label: 'Closed',               classes: 'bg-gray-100 text-gray-500',         icon: CheckCircle2 },
};

// Ordered lifecycle stages for progress bar
const LIFECYCLE: ClaimStatus[] = [
  'submitted',
  'under_review',
  'pending_assessment',
  'assessment_complete',
  'pending_approval',
  'approved',
  'payment_processing',
  'paid',
];

const INCIDENT_TYPE_LABELS: Record<string, string> = {
  collision:  'Collision',
  weather:    'Weather Damage',
  theft:      'Theft',
  fire:       'Fire',
  sinking:    'Sinking',
  machinery:  'Machinery',
  other:      'Other',
};

// ─── Progress Timeline ────────────────────────────────────────────────────────

const ProgressTimeline: React.FC<{ status: ClaimStatus }> = ({ status }) => {
  const terminalStatuses: ClaimStatus[] = ['rejected', 'appealed', 'closed', 'draft'];
  if (terminalStatuses.includes(status)) return null;

  const currentIdx = LIFECYCLE.indexOf(status);
  const totalSteps = LIFECYCLE.length;

  return (
    <div className="mt-3">
      <div className="flex items-center gap-0.5">
        {LIFECYCLE.map((step, i) => {
          const isComplete = i <= currentIdx;
          const isActive = i === currentIdx;
          return (
            <React.Fragment key={step}>
              <div
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  isComplete
                    ? isActive
                      ? 'bg-ocean-500'
                      : 'bg-ocean-300'
                    : 'bg-gray-100'
                }`}
              />
            </React.Fragment>
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-400">Submitted</span>
        <span className="text-xs text-gray-400">
          Step {Math.max(currentIdx + 1, 1)} / {totalSteps}
        </span>
        <span className="text-xs text-gray-400">Paid</span>
      </div>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const ClaimCard: React.FC<Props> = ({ claim, onUpdate, index = 0 }) => {
  const cfg = STATUS_CONFIG[claim.status] ?? STATUS_CONFIG.draft;
  const StatusIcon = cfg.icon;
  const incidentLabel = INCIDENT_TYPE_LABELS[claim.incidentType] ?? claim.incidentType;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all"
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Ship size={14} className="text-ocean-500 flex-shrink-0" />
            <h4 className="font-heading font-semibold text-navy-500 text-sm leading-snug truncate">
              {claim.boatName ?? 'Unknown Vessel'}
            </h4>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`${cfg.classes} rounded-full px-2 py-0.5 text-xs font-medium flex items-center gap-1`}>
              <StatusIcon size={9} />
              {cfg.label}
            </span>
            <span className="bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 text-xs font-medium">
              {incidentLabel}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-gray-400 flex-shrink-0">
          <Hash size={10} />
          <span className="text-xs font-mono">{claim.reference}</span>
        </div>
      </div>

      {/* ── Meta ───────────────────────────────────────────────────────── */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Calendar size={11} className="text-gray-400 flex-shrink-0" />
          <span>Incident: {fmtDate(claim.incidentDate)}</span>
        </div>
        {claim.incidentLocationName && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin size={11} className="text-gray-400 flex-shrink-0" />
            <span className="truncate">{claim.incidentLocationName}</span>
          </div>
        )}
      </div>

      {/* ── Financials ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="bg-gray-50 rounded-xl px-3 py-2 flex-1 min-w-0">
          <p className="text-xs text-gray-400">Estimated Loss</p>
          <p className="text-sm font-heading font-bold text-navy-500">{fmt(claim.estimatedLossUsd)}</p>
        </div>
        {claim.approvedAmountUsd !== undefined && (
          <>
            <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
            <div className="bg-emerald-50 rounded-xl px-3 py-2 flex-1 min-w-0">
              <p className="text-xs text-emerald-600">Approved</p>
              <p className="text-sm font-heading font-bold text-emerald-700">{fmt(claim.approvedAmountUsd)}</p>
            </div>
          </>
        )}
        {claim.providerPayoutUsd !== undefined && (
          <>
            <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
            <div className="bg-teal-50 rounded-xl px-3 py-2 flex-1 min-w-0">
              <p className="text-xs text-teal-600">Paid</p>
              <p className="text-sm font-heading font-bold text-teal-700">{fmt(claim.providerPayoutUsd)}</p>
            </div>
          </>
        )}
      </div>

      {/* ── Progress Timeline ───────────────────────────────────────────── */}
      <ProgressTimeline status={claim.status} />

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      {onUpdate && !['closed', 'paid', 'rejected'].includes(claim.status) && (
        <div className="flex justify-end mt-3 pt-3 border-t border-gray-50">
          <button
            onClick={() => onUpdate(claim.id, claim.status)}
            className="flex items-center gap-1.5 bg-ocean-500 hover:bg-ocean-600 text-white rounded-xl px-3 py-1.5 text-xs font-medium transition-colors"
          >
            Update Status
            <ChevronRight size={12} />
          </button>
        </div>
      )}
    </motion.div>
  );
};
