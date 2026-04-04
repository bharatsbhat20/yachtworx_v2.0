import React from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Zap, Globe, CheckCircle2, DollarSign,
  TrendingUp, Building2, ChevronRight,
} from 'lucide-react';
import type { InsuranceProduct, ProductType, Territory } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  product: InsuranceProduct;
  insurerName?: string;
  onGetQuote?: (productId: string) => void;
  index?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  hull_and_machinery:        'Hull & Machinery',
  protection_and_indemnity:  'Protection & Indemnity',
  crew_personal_accident:    'Crew Personal Accident',
  charter_liability:         'Charter Liability',
  extended_warranty:         'Extended Warranty',
};

const TERRITORY_LABELS: Record<Territory, string> = {
  us_east:       'US East',
  us_west:       'US West',
  gulf:          'Gulf',
  caribbean:     'Caribbean',
  mediterranean: 'Mediterranean',
  worldwide:     'Worldwide',
};

// ─── Component ────────────────────────────────────────────────────────────────

export const ProductCard: React.FC<Props> = ({ product, insurerName, onGetQuote, index = 0 }) => {
  const displayInsurer = insurerName ?? product.insurerName;
  const productTypeLabel = PRODUCT_TYPE_LABELS[product.productType] ?? product.productType;
  const visibleTerritories = product.allowedTerritories.slice(0, 3);
  const extraTerritories = product.allowedTerritories.length - visibleTerritories.length;
  const highlights = product.coverageSummary.slice(0, 3);

  const baseRate = product.baseRatePct
    ? `${(product.baseRatePct * 100).toFixed(2)}%`
    : product.baseRatePerFoot
      ? `$${product.baseRatePerFoot}/ft`
      : '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col"
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <h4 className="font-heading font-semibold text-navy-500 text-sm leading-snug mb-1">
            {product.name}
          </h4>
          <div className="flex items-center gap-1.5 flex-wrap">
            {displayInsurer && (
              <span className="bg-navy-50 text-navy-600 rounded-full px-2 py-0.5 text-xs font-medium flex items-center gap-1">
                <Building2 size={9} />
                {displayInsurer}
              </span>
            )}
            <span className="bg-ocean-50 text-ocean-700 rounded-full px-2 py-0.5 text-xs font-medium">
              {productTypeLabel}
            </span>
            {product.instantBind && (
              <span className="bg-teal-50 text-teal-700 rounded-full px-2 py-0.5 text-xs font-medium flex items-center gap-1">
                <Zap size={9} />
                Instant Bind
              </span>
            )}
          </div>
        </div>
        <Shield size={20} className="text-ocean-300 flex-shrink-0 mt-0.5" />
      </div>

      {/* ── Description ────────────────────────────────────────────────── */}
      {product.description && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
          {product.description}
        </p>
      )}

      {/* ── Key Metrics ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-gray-50 rounded-xl p-2.5 text-center">
          <div className="flex items-center justify-center gap-0.5 mb-0.5">
            <TrendingUp size={10} className="text-gray-400" />
          </div>
          <p className="text-xs text-gray-400 leading-none">Base Rate</p>
          <p className="text-xs font-bold text-navy-500 mt-1">{baseRate}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2.5 text-center">
          <div className="flex items-center justify-center gap-0.5 mb-0.5">
            <DollarSign size={10} className="text-gray-400" />
          </div>
          <p className="text-xs text-gray-400 leading-none">Min Premium</p>
          <p className="text-xs font-bold text-navy-500 mt-1">{fmt(product.minPremiumUsd)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2.5 text-center">
          <div className="flex items-center justify-center gap-0.5 mb-0.5">
            <Shield size={10} className="text-gray-400" />
          </div>
          <p className="text-xs text-gray-400 leading-none">Max Coverage</p>
          <p className="text-xs font-bold text-navy-500 mt-1">
            {fmt(
              product.maxVesselLoaFt
                ? (product.baseRatePerFoot ?? 0) * product.maxVesselLoaFt
                : 5_000_000
            )}
          </p>
        </div>
      </div>

      {/* ── Territories ────────────────────────────────────────────────── */}
      {product.allowedTerritories.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap mb-3">
          <Globe size={10} className="text-gray-400 flex-shrink-0" />
          {visibleTerritories.map((t) => (
            <span key={t} className="bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 text-xs">
              {TERRITORY_LABELS[t] ?? t}
            </span>
          ))}
          {extraTerritories > 0 && (
            <span className="bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 text-xs font-medium">
              +{extraTerritories} more
            </span>
          )}
        </div>
      )}

      {/* ── Coverage Highlights ────────────────────────────────────────── */}
      {highlights.length > 0 && (
        <div className="mb-4 flex-1">
          <p className="text-xs text-gray-400 font-medium mb-1.5">Coverage Highlights</p>
          <ul className="space-y-1">
            {highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                <CheckCircle2 size={11} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{h}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      {onGetQuote && (
        <div className="mt-auto pt-3 border-t border-gray-50">
          <button
            onClick={() => onGetQuote(product.id)}
            className="w-full flex items-center justify-center gap-2 bg-ocean-500 hover:bg-ocean-600 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors"
          >
            Get Quote
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </motion.div>
  );
};
