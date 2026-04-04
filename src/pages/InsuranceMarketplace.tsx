/**
 * InsuranceMarketplace — Browse and filter insurance products
 * Desktop sidebar + filterable product grid with featured insurers.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Shield, Zap, Globe, Star, ChevronRight,
  SlidersHorizontal, X, Building2, CheckCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useInsuranceStore } from '../store/insuranceStore';
import { useAuthStore } from '../store/authStore';
import { useBoatStore } from '../store/boatStore';
import type {
  InsuranceProduct,
  InsuranceQuote,
  ProductType,
  Territory,
} from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  hull_and_machinery:      'Hull & Machinery',
  protection_and_indemnity: 'P&I',
  charter_liability:       'Charter',
  crew_personal_accident:  'Crew',
  extended_warranty:       'Warranty',
};

const TERRITORY_LABELS: Record<Territory, string> = {
  us_east:       'US East Coast',
  us_west:       'US West Coast',
  gulf:          'Gulf of Mexico',
  caribbean:     'Caribbean',
  mediterranean: 'Mediterranean',
  worldwide:     'Worldwide',
};

const AM_BEST_RATINGS = ['A++', 'A+', 'A', 'A-', 'B++', 'B+'];

const PRODUCT_TYPES: Array<{ id: ProductType | 'all'; label: string }> = [
  { id: 'all',                      label: 'All' },
  { id: 'hull_and_machinery',       label: 'Hull & Machinery' },
  { id: 'protection_and_indemnity', label: 'P&I' },
  { id: 'charter_liability',        label: 'Charter' },
  { id: 'crew_personal_accident',   label: 'Crew' },
  { id: 'extended_warranty',        label: 'Warranty' },
];

// ─── Inline ProductCard (self-contained) ─────────────────────────────────────

const ProductCardView: React.FC<{
  product: InsuranceProduct;
  index: number;
  onGetQuote: (product: InsuranceProduct) => void;
}> = ({ product, index, onGetQuote }) => {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  const typeLabel = PRODUCT_TYPE_LABELS[product.productType] ?? product.productType;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-ocean-50 flex items-center justify-center flex-shrink-0">
            <Shield size={18} className="text-ocean-500" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-navy-500 text-sm truncate">{product.name}</p>
            <p className="text-xs text-gray-500 truncate">{product.insurerName}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-xs bg-ocean-50 text-ocean-700 px-2 py-0.5 rounded-full font-medium">
            {typeLabel}
          </span>
          {product.instantBind && (
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <Zap size={9} /> Instant Bind
            </span>
          )}
        </div>
      </div>

      {/* Coverage summary */}
      {product.coverageSummary.length > 0 && (
        <ul className="space-y-1 mb-4 flex-1">
          {product.coverageSummary.slice(0, 3).map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
              <CheckCircle size={12} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
          {product.coverageSummary.length > 3 && (
            <li className="text-xs text-gray-400 ml-4">+{product.coverageSummary.length - 3} more</li>
          )}
        </ul>
      )}

      {/* Territories */}
      {product.allowedTerritories.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {product.allowedTerritories.slice(0, 3).map(t => (
            <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {TERRITORY_LABELS[t] ?? t}
            </span>
          ))}
          {product.allowedTerritories.length > 3 && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              +{product.allowedTerritories.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
        <div>
          <p className="text-xs text-gray-500">From</p>
          <p className="text-lg font-bold text-navy-500">{fmt(product.minPremiumUsd)}<span className="text-xs text-gray-400 font-normal">/yr</span></p>
        </div>
        <button
          onClick={() => onGetQuote(product)}
          className="flex items-center gap-1.5 bg-ocean-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-ocean-600 transition-colors"
        >
          Get Quote <ChevronRight size={14} />
        </button>
      </div>
    </motion.div>
  );
};

// ─── Quote Wizard Modal ───────────────────────────────────────────────────────

const QuoteModal: React.FC<{
  open: boolean;
  product: InsuranceProduct | null;
  boatId: string;
  boatName: string;
  onClose: () => void;
  onSubmit: (data: Partial<InsuranceQuote>) => void;
}> = ({ open, product, boatId, boatName, onClose, onSubmit }) => {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 600));
    onSubmit({ productId: product.id, boatId, boatName, insurerId: product.insurerId });
    setSubmitting(false);
    onClose();
  };

  if (!open || !product) return null;

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
          >
            <div className="p-6 border-b border-gray-100 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-heading font-bold text-navy-500">Request Quote</h2>
                <p className="text-sm text-gray-500 mt-1">{product.name} · {product.insurerName}</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Vessel</span>
                  <span className="font-medium text-navy-500">{boatName || 'Not selected'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Min Premium</span>
                  <span className="font-medium text-navy-500">{fmt(product.minPremiumUsd)}/yr</span>
                </div>
                {product.deductiblePct && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Deductible</span>
                    <span className="font-medium text-navy-500">{product.deductiblePct}%</span>
                  </div>
                )}
                {product.instantBind && (
                  <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                    <Zap size={14} /> Instant bind available
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">
                A licensed agent will review your request and prepare a personalised quote within 1–2 business days.
              </p>
              <div className="flex gap-3">
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
                  {submitting ? 'Sending…' : 'Request Quote'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const InsuranceMarketplace: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { boats, getBoatsByOwner } = useBoatStore();
  const {
    products, insurers,
    isLoading,
    loadProducts, loadInsurers,
    createQuote,
  } = useInsuranceStore();

  // Filter state
  const [typeFilter, setTypeFilter]           = useState<ProductType | 'all'>('all');
  const [instantBindOnly, setInstantBindOnly] = useState(false);
  const [searchQuery, setSearchQuery]         = useState('');
  const [territories, setTerritories]         = useState<Set<Territory>>(new Set());
  const [ratingFilter, setRatingFilter]       = useState<string>('');
  const [sidebarOpen, setSidebarOpen]         = useState(false);

  // Quote modal state
  const [quoteProduct, setQuoteProduct] = useState<InsuranceProduct | null>(null);

  const userId  = currentUser?.id ?? 'owner-1';
  const myBoats = getBoatsByOwner(userId);
  const defaultBoat = myBoats[0] ?? boats[0];

  useEffect(() => {
    loadProducts();
    loadInsurers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (typeFilter !== 'all' && p.productType !== typeFilter) return false;
      if (instantBindOnly && !p.instantBind) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !(p.description ?? '').toLowerCase().includes(q)) return false;
      }
      if (territories.size > 0) {
        const hasTerritory = p.allowedTerritories.some(t => territories.has(t));
        if (!hasTerritory) return false;
      }
      if (ratingFilter) {
        const insurer = insurers.find(i => i.id === p.insurerId);
        if (insurer?.amBestRating !== ratingFilter) return false;
      }
      return true;
    });
  }, [products, typeFilter, instantBindOnly, searchQuery, territories, ratingFilter, insurers]);

  const toggleTerritory = (t: Territory) => {
    setTerritories(prev => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  };

  const clearFilters = () => {
    setTypeFilter('all');
    setInstantBindOnly(false);
    setSearchQuery('');
    setTerritories(new Set());
    setRatingFilter('');
  };

  const hasActiveFilters =
    typeFilter !== 'all' || instantBindOnly || searchQuery ||
    territories.size > 0 || ratingFilter;

  const handleQuoteSubmit = async (data: Partial<InsuranceQuote>) => {
    await createQuote({ ...data, ownerId: userId });
  };

  // ── Sidebar panel ──────────────────────────────────────────────────────────

  const SidebarPanel = () => (
    <div className="space-y-6">
      {/* Territories */}
      <div>
        <h3 className="text-sm font-semibold text-navy-500 mb-3">Territory</h3>
        <div className="space-y-2">
          {(Object.keys(TERRITORY_LABELS) as Territory[]).map(t => (
            <label key={t} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={territories.has(t)}
                onChange={() => toggleTerritory(t)}
                className="w-4 h-4 rounded accent-ocean-500"
              />
              <span className="text-sm text-gray-600 group-hover:text-navy-500 transition-colors">
                {TERRITORY_LABELS[t]}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* AM Best Rating */}
      <div>
        <h3 className="text-sm font-semibold text-navy-500 mb-3">AM Best Rating</h3>
        <div className="space-y-1">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="radio"
              name="rating"
              value=""
              checked={ratingFilter === ''}
              onChange={() => setRatingFilter('')}
              className="w-4 h-4 accent-ocean-500"
            />
            <span className="text-sm text-gray-600 group-hover:text-navy-500 transition-colors">Any</span>
          </label>
          {AM_BEST_RATINGS.map(r => (
            <label key={r} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="radio"
                name="rating"
                value={r}
                checked={ratingFilter === r}
                onChange={() => setRatingFilter(r)}
                className="w-4 h-4 accent-ocean-500"
              />
              <span className="text-sm text-gray-600 group-hover:text-navy-500 transition-colors">{r}</span>
            </label>
          ))}
        </div>
      </div>

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full text-sm text-gray-500 hover:text-red-500 transition-colors underline underline-offset-2"
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-heading font-bold text-navy-500">Insurance Marketplace</h1>
          <p className="text-gray-500 mt-1">Browse and compare marine insurance products from top-rated insurers</p>
        </motion.div>

        {/* Featured Insurers */}
        {insurers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Featured Insurers</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {insurers.map(insurer => (
                <div
                  key={insurer.id}
                  className="flex-shrink-0 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-3 min-w-[200px]"
                >
                  <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
                    <Building2 size={18} className="text-navy-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy-500 truncate">
                      {insurer.tradingName ?? insurer.legalName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {insurer.amBestRating && (
                        <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                          <Star size={10} fill="currentColor" /> {insurer.amBestRating}
                        </span>
                      )}
                      {insurer.isActive && (
                        <span className="text-xs text-emerald-600 font-medium">Active</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Product Type Tabs + Search Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6 space-y-3"
        >
          {/* Type filter pill tabs */}
          <div className="flex flex-wrap gap-2">
            {PRODUCT_TYPES.map(pt => (
              <button
                key={pt.id}
                onClick={() => setTypeFilter(pt.id as ProductType | 'all')}
                className={clsx(
                  'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                  typeFilter === pt.id
                    ? 'bg-ocean-500 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 bg-white border border-gray-200',
                )}
              >
                {pt.label}
              </button>
            ))}
          </div>

          {/* Search + Instant Bind + Filter toggle row */}
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search products…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <label className="flex items-center gap-2 cursor-pointer bg-white border border-gray-200 px-4 py-2.5 rounded-xl select-none">
              <Zap size={15} className={instantBindOnly ? 'text-ocean-500' : 'text-gray-400'} />
              <span className="text-sm font-medium text-gray-700">Instant Bind</span>
              <div
                onClick={() => setInstantBindOnly(v => !v)}
                className={clsx(
                  'relative w-9 h-5 rounded-full transition-colors cursor-pointer',
                  instantBindOnly ? 'bg-ocean-500' : 'bg-gray-200',
                )}
              >
                <div className={clsx(
                  'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                  instantBindOnly ? 'translate-x-4' : 'translate-x-0.5',
                )} />
              </div>
            </label>

            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className={clsx(
                'lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors',
                sidebarOpen || hasActiveFilters
                  ? 'border-ocean-500 bg-ocean-50 text-ocean-600'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
              )}
            >
              <SlidersHorizontal size={15} />
              Filters
              {hasActiveFilters && (
                <span className="bg-ocean-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">!</span>
              )}
            </button>
          </div>
        </motion.div>

        {/* Layout: Sidebar + Grid */}
        <div className="flex gap-6">

          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm sticky top-24">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-navy-500">Filters</h3>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-600">Clear</button>
                )}
              </div>
              <SidebarPanel />
            </div>
          </aside>

          {/* Mobile Sidebar Drawer */}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 lg:hidden"
              >
                <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
                <motion.aside
                  initial={{ x: -300 }}
                  animate={{ x: 0 }}
                  exit={{ x: -300 }}
                  className="absolute left-0 top-0 bottom-0 w-72 bg-white p-6 shadow-2xl overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-bold text-navy-500">Filters</h3>
                    <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-600">
                      <X size={20} />
                    </button>
                  </div>
                  <SidebarPanel />
                </motion.aside>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Product Grid */}
          <div className="flex-1 min-w-0">
            {/* Results count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                {isLoading ? 'Loading…' : `${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''} found`}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-ocean-500 hover:text-ocean-600 font-medium flex items-center gap-1"
                >
                  <X size={12} /> Clear filters
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-64 animate-pulse" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                  <Globe size={28} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-navy-500">No products found</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-xs">
                  Try adjusting your filters or search terms to find available products.
                </p>
                <button
                  onClick={clearFilters}
                  className="mt-4 text-sm text-ocean-500 hover:text-ocean-600 font-medium"
                >
                  Clear all filters
                </button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProducts.map((product, i) => (
                  <ProductCardView
                    key={product.id}
                    product={product}
                    index={i}
                    onGetQuote={p => setQuoteProduct(p)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quote Modal */}
      <QuoteModal
        open={quoteProduct !== null}
        product={quoteProduct}
        boatId={defaultBoat?.id ?? ''}
        boatName={defaultBoat?.name ?? 'My Vessel'}
        onClose={() => setQuoteProduct(null)}
        onSubmit={handleQuoteSubmit}
      />
    </div>
  );
};
