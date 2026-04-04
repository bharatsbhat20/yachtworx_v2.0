import React from 'react';
import { motion } from 'framer-motion';
import {
  Ship, Hash, Calendar, User, Wrench,
  CheckCircle2, XCircle, Package, Hammer,
  AlertTriangle, ChevronRight,
} from 'lucide-react';
import type { WarrantyRegistration, WarrantyStatus, WarrantyType } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  warranty: WarrantyRegistration;
  onFileClaim?: () => void;
  index?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const daysUntil = (iso: string): number =>
  Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);

// ─── Config Maps ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<WarrantyStatus, { label: string; classes: string }> = {
  active:  { label: 'Active',  classes: 'bg-emerald-50 text-emerald-700' },
  expired: { label: 'Expired', classes: 'bg-gray-100 text-gray-500' },
  voided:  { label: 'Voided',  classes: 'bg-red-50 text-red-600' },
};

const WARRANTY_TYPE_CONFIG: Record<WarrantyType, { label: string; classes: string }> = {
  labour_only: { label: 'Labour Only', classes: 'bg-blue-50 text-blue-700' },
  parts_only:  { label: 'Parts Only',  classes: 'bg-amber-50 text-amber-700' },
  combined:    { label: 'Combined',    classes: 'bg-teal-50 text-teal-700' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export const WarrantyCard: React.FC<Props> = ({ warranty, onFileClaim, index = 0 }) => {
  const statusCfg = STATUS_CONFIG[warranty.status] ?? STATUS_CONFIG.expired;
  const typeCfg   = WARRANTY_TYPE_CONFIG[warranty.warrantyType] ?? WARRANTY_TYPE_CONFIG.combined;

  const days          = daysUntil(warranty.expiryDate);
  const isExpiringSoon = warranty.status === 'active' && days >= 0 && days <= 30;

  const hasLabour = warranty.warrantyType === 'labour_only' || warranty.warrantyType === 'combined';
  const hasParts  = warranty.warrantyType === 'parts_only'  || warranty.warrantyType === 'combined';

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
              {warranty.boatName ?? 'Unknown Vessel'}
            </h4>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`${statusCfg.classes} rounded-full px-2 py-0.5 text-xs font-medium`}>
              {statusCfg.label}
            </span>
            <span className={`${typeCfg.classes} rounded-full px-2 py-0.5 text-xs font-medium`}>
              {typeCfg.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-gray-400 flex-shrink-0">
          <Hash size={10} />
          <span className="text-xs font-mono">{warranty.reference}</span>
        </div>
      </div>

      {/* ── Provider ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
        <User size={11} className="text-gray-400 flex-shrink-0" />
        <span>{warranty.providerName ?? 'Unknown Provider'}</span>
      </div>

      {/* ── Dates ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-gray-50 rounded-xl px-3 py-2 flex-1 min-w-0">
          <p className="text-xs text-gray-400">Coverage Start</p>
          <p className="text-xs font-medium text-navy-500 mt-0.5">{fmtDate(warranty.effectiveDate)}</p>
        </div>
        <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
        <div className={`rounded-xl px-3 py-2 flex-1 min-w-0 ${isExpiringSoon ? 'bg-amber-50' : 'bg-gray-50'}`}>
          <p className={`text-xs ${isExpiringSoon ? 'text-amber-500' : 'text-gray-400'}`}>Coverage End</p>
          <p className={`text-xs font-medium mt-0.5 ${isExpiringSoon ? 'text-amber-700' : 'text-navy-500'}`}>
            {fmtDate(warranty.expiryDate)}
          </p>
        </div>
      </div>

      {/* ── Expiry Warning ─────────────────────────────────────────────── */}
      {isExpiringSoon && (
        <div className="flex items-center gap-1.5 bg-amber-50 rounded-xl px-3 py-2 mb-3">
          <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" />
          <span className="text-xs text-amber-700 font-medium">
            {days === 0 ? 'Expires today' : `Expires in ${days} day${days === 1 ? '' : 's'}`}
          </span>
        </div>
      )}

      {/* ── Coverage Chips ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${hasParts ? 'bg-ocean-50 text-ocean-700' : 'bg-gray-100 text-gray-400'}`}>
          {hasParts ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
          <Package size={10} />
          Parts
        </div>
        <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${hasLabour ? 'bg-ocean-50 text-ocean-700' : 'bg-gray-100 text-gray-400'}`}>
          {hasLabour ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
          <Hammer size={10} />
          Labour
        </div>
        <div className="ml-auto bg-gray-50 rounded-xl px-3 py-1.5">
          <span className="text-xs text-gray-400">Max Claim: </span>
          <span className="text-xs font-bold text-navy-500">
            {warranty.warrantyType === 'combined' ? fmt(10_000) : '—'}
          </span>
        </div>
      </div>

      {/* ── Work Description ────────────────────────────────────────────── */}
      {warranty.description && (
        <div className="mb-3">
          <div className="flex items-center gap-1 mb-1">
            <Wrench size={10} className="text-gray-400" />
            <span className="text-xs text-gray-400">Work Description</span>
          </div>
          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
            {warranty.description}
          </p>
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      {onFileClaim && warranty.status === 'active' && (
        <div className="flex justify-end pt-3 border-t border-gray-50">
          <button
            onClick={onFileClaim}
            className="flex items-center gap-1.5 bg-ocean-500 hover:bg-ocean-600 text-white rounded-xl px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <Wrench size={11} />
            File Warranty Claim
          </button>
        </div>
      )}
    </motion.div>
  );
};
