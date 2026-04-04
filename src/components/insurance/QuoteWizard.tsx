import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronRight, ChevronLeft, Shield, Globe,
  DollarSign, Zap, CheckCircle2, Loader2, FileText,
  Building2, Anchor, Navigation,
} from 'lucide-react';
import type {
  InsuranceProduct, InsuranceQuote, Territory, UseType,
} from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  products: InsuranceProduct[];
  boatId: string;
  boatName: string;
  onSubmit: (data: Partial<InsuranceQuote>) => Promise<void>;
}

interface UnderwritingState {
  navigationLimitMiles: string;
  layUpMonths: string;
  hasPriorLosses: boolean | null;
  priorLossDescription: string;
}

interface QuoteFormState {
  productId: string;
  agreedValueUsd: string;
  territory: Territory | '';
  navigationZone: string;
  useType: UseType;
  underwriting: UnderwritingState;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Select Product',   icon: Shield },
  { label: 'Coverage Details', icon: Anchor },
  { label: 'Underwriting',     icon: Navigation },
  { label: 'Review & Bind',    icon: CheckCircle2 },
];

const TERRITORY_OPTIONS: { value: Territory; label: string }[] = [
  { value: 'us_east',       label: 'US East Coast' },
  { value: 'us_west',       label: 'US West Coast' },
  { value: 'gulf',          label: 'Gulf of Mexico' },
  { value: 'caribbean',     label: 'Caribbean' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'worldwide',     label: 'Worldwide' },
];

const USE_TYPE_OPTIONS: { value: UseType; label: string }[] = [
  { value: 'pleasure',   label: 'Pleasure' },
  { value: 'charter',    label: 'Charter' },
  { value: 'racing',     label: 'Racing' },
  { value: 'commercial', label: 'Commercial' },
];

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  hull_and_machinery:        'Hull & Machinery',
  protection_and_indemnity:  'Protection & Indemnity',
  crew_personal_accident:    'Crew Personal Accident',
  charter_liability:         'Charter Liability',
  extended_warranty:         'Extended Warranty',
};

const TERRITORY_LABELS: Record<Territory, string> = {
  us_east:       'US East Coast',
  us_west:       'US West Coast',
  gulf:          'Gulf of Mexico',
  caribbean:     'Caribbean',
  mediterranean: 'Mediterranean',
  worldwide:     'Worldwide',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

// ─── Step Indicator ───────────────────────────────────────────────────────────

const StepIndicator: React.FC<{ current: number }> = ({ current }) => (
  <div className="flex items-center gap-1.5">
    {STEPS.map((step, i) => {
      const done   = i < current;
      const active = i === current;
      const StepIcon = step.icon;
      return (
        <React.Fragment key={step.label}>
          <div className={`flex items-center gap-1 transition-all ${active ? 'opacity-100' : done ? 'opacity-80' : 'opacity-30'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
              done ? 'bg-emerald-500 text-white' : active ? 'bg-ocean-500 text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              {done ? <CheckCircle2 size={11} /> : <StepIcon size={11} />}
            </div>
            <span className={`text-xs font-medium hidden md:block ${active ? 'text-navy-500' : 'text-gray-400'}`}>
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-px min-w-[12px] transition-colors ${done ? 'bg-emerald-300' : 'bg-gray-100'}`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ─── Mini Product Card ────────────────────────────────────────────────────────

const MiniProductCard: React.FC<{
  product: InsuranceProduct;
  selected: boolean;
  onSelect: () => void;
}> = ({ product, selected, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
      selected
        ? 'border-ocean-500 bg-ocean-50 shadow-sm'
        : 'border-gray-100 hover:border-gray-200 bg-white'
    }`}
  >
    <div className="flex items-start gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${selected ? 'bg-ocean-100' : 'bg-gray-100'}`}>
        <Shield size={15} className={selected ? 'text-ocean-600' : 'text-gray-400'} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <span className="text-xs font-semibold text-navy-500">{product.name}</span>
          {product.instantBind && (
            <span className="bg-teal-50 text-teal-700 rounded-full px-1.5 py-0.5 text-xs font-medium flex items-center gap-0.5">
              <Zap size={8} />
              Instant
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 flex items-center gap-0.5">
            <Building2 size={9} />
            {product.insurerName}
          </span>
          <span className="text-gray-200">·</span>
          <span className="text-xs text-gray-400">
            {PRODUCT_TYPE_LABELS[product.productType] ?? product.productType}
          </span>
        </div>
        {product.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{product.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs font-medium text-navy-500">
            From {fmt(product.minPremiumUsd)}/yr
          </span>
          {product.baseRatePct && (
            <span className="text-xs text-gray-400">
              · {(product.baseRatePct * 100).toFixed(2)}% rate
            </span>
          )}
        </div>
      </div>
      {selected && <CheckCircle2 size={16} className="text-ocean-500 flex-shrink-0 mt-0.5" />}
    </div>
  </button>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const QuoteWizard: React.FC<Props> = ({
  open, onClose, products, boatId, boatName, onSubmit,
}) => {
  const [step, setStep]       = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState<QuoteFormState>({
    productId:     '',
    agreedValueUsd: '',
    territory:     '',
    navigationZone: '',
    useType:       'pleasure',
    underwriting: {
      navigationLimitMiles:  '200',
      layUpMonths:           '0',
      hasPriorLosses:        null,
      priorLossDescription:  '',
    },
  });

  const patch = useCallback((updates: Partial<QuoteFormState>) => {
    setForm(prev => ({ ...prev, ...updates }));
  }, []);

  const patchUW = useCallback((updates: Partial<UnderwritingState>) => {
    setForm(prev => ({ ...prev, underwriting: { ...prev.underwriting, ...updates } }));
  }, []);

  const selectedProduct = useMemo(
    () => products.find(p => p.id === form.productId),
    [products, form.productId]
  );

  // ── Computed premium ──────────────────────────────────────────────────────
  const computedPremium = useMemo(() => {
    if (!selectedProduct || !form.agreedValueUsd) return null;
    const agreed = Number(form.agreedValueUsd);
    if (isNaN(agreed) || agreed <= 0) return null;
    const rate = selectedProduct.baseRatePct ?? 0.015;
    const raw  = agreed * rate;
    return Math.max(raw, selectedProduct.minPremiumUsd);
  }, [selectedProduct, form.agreedValueUsd]);

  // ── Validation ────────────────────────────────────────────────────────────
  const step0Valid = !!form.productId;
  const step1Valid = !!form.agreedValueUsd
    && Number(form.agreedValueUsd) > 0
    && !!form.territory
    && form.navigationZone.trim().length >= 2;
  const step2Valid = form.underwriting.navigationLimitMiles.trim() !== ''
    && form.underwriting.layUpMonths.trim() !== ''
    && form.underwriting.hasPriorLosses !== null;

  const canNext = step === 0 ? step0Valid : step === 1 ? step1Valid : step === 2 ? step2Valid : true;

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedProduct || !computedPremium) return;
    setLoading(true);
    try {
      await onSubmit({
        productId:       form.productId,
        productName:     selectedProduct.name,
        insurerId:       selectedProduct.insurerId,
        insurerName:     selectedProduct.insurerName,
        boatId,
        boatName,
        agreedValueUsd:  Number(form.agreedValueUsd),
        territory:       form.territory as Territory,
        useType:         form.useType,
        annualPremiumUsd: Math.round(computedPremium),
        deductibleUsd:   selectedProduct.deductibleFixedUsd
          ?? Math.round(Number(form.agreedValueUsd) * (selectedProduct.deductiblePct ?? 0.02)),
        instalmentOption: 'annual',
        instalmentAmountUsd: Math.round(computedPremium),
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
    setTimeout(() => {
      setStep(0);
      setSubmitted(false);
      setForm({
        productId: '', agreedValueUsd: '', territory: '',
        navigationZone: '', useType: 'pleasure',
        underwriting: { navigationLimitMiles: '200', layUpMonths: '0', hasPriorLosses: null, priorLossDescription: '' },
      });
    }, 300);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={handleClose}
        className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-heading font-semibold text-navy-500">Get a Quote</h3>
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
              <Anchor size={10} />
              {boatName}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Indicator */}
        {!submitted && (
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
            <StepIndicator current={step} />
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-5 max-h-[62vh] overflow-y-auto">
          {submitted ? (
            // ── Success ──────────────────────────────────────────────
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-6"
            >
              <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                {selectedProduct?.instantBind
                  ? <Zap size={28} className="text-teal-500" />
                  : <CheckCircle2 size={28} className="text-emerald-500" />
                }
              </div>
              <h4 className="font-heading font-semibold text-navy-500 text-lg mb-2">
                {selectedProduct?.instantBind ? 'Policy Bound!' : 'Quote Submitted'}
              </h4>
              <p className="text-sm text-gray-500 leading-relaxed">
                {selectedProduct?.instantBind
                  ? 'Your policy has been bound instantly. Check your email for the Certificate of Insurance.'
                  : 'Your quote request has been submitted for underwriter review. You\'ll hear back within 1–2 business days.'
                }
              </p>
              {computedPremium && (
                <div className="bg-ocean-50 rounded-xl px-5 py-3 mt-4 inline-block">
                  <p className="text-xs text-gray-500 mb-0.5">Annual Premium</p>
                  <p className="text-2xl font-heading font-bold text-ocean-600">{fmt(computedPremium)}</p>
                </div>
              )}
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              {/* ── Step 0: Select Product ─────────────────────────── */}
              {step === 0 && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  <p className="text-xs text-gray-500 mb-3">
                    Choose the insurance product that best fits your needs.
                  </p>
                  {products
                    .filter(p => p.status === 'active')
                    .map(product => (
                      <MiniProductCard
                        key={product.id}
                        product={product}
                        selected={form.productId === product.id}
                        onSelect={() => patch({ productId: product.id })}
                      />
                    ))}
                  {products.filter(p => p.status === 'active').length === 0 && (
                    <div className="text-center py-8 text-sm text-gray-400">
                      No insurance products available at this time.
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Step 1: Coverage Details ───────────────────────── */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Agreed Value */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      <DollarSign size={11} className="inline mr-1" />
                      Agreed Hull Value (USD) <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        placeholder="e.g. 250000"
                        value={form.agreedValueUsd}
                        onChange={e => patch({ agreedValueUsd: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 pl-7 pr-3 py-2 text-sm text-navy-500 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-ocean-300 focus:border-ocean-400 transition"
                      />
                    </div>
                    {selectedProduct && form.agreedValueUsd && computedPremium && (
                      <p className="text-xs text-ocean-600 font-medium mt-1">
                        Estimated premium: {fmt(computedPremium)}/yr
                      </p>
                    )}
                  </div>

                  {/* Territory */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      <Globe size={11} className="inline mr-1" />
                      Territory <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {TERRITORY_OPTIONS.filter(t =>
                        !selectedProduct?.allowedTerritories?.length
                        || selectedProduct.allowedTerritories.includes(t.value)
                      ).map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => patch({ territory: value })}
                          className={`text-left px-3 py-2 rounded-xl border-2 text-xs font-medium transition-all ${
                            form.territory === value
                              ? 'border-ocean-500 bg-ocean-50 text-ocean-700'
                              : 'border-gray-100 hover:border-gray-200 text-gray-600'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Navigation Zone */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Navigation Zone / Waters
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Florida Keys, Intracoastal Waterway"
                      value={form.navigationZone}
                      onChange={e => patch({ navigationZone: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-navy-500 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-ocean-300 focus:border-ocean-400 transition"
                    />
                  </div>

                  {/* Use Type */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Primary Use
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {USE_TYPE_OPTIONS.filter(u =>
                        !selectedProduct?.allowedUseTypes?.length
                        || selectedProduct.allowedUseTypes.includes(u.value)
                      ).map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => patch({ useType: value })}
                          className={`text-left px-3 py-2 rounded-xl border-2 text-xs font-medium transition-all ${
                            form.useType === value
                              ? 'border-ocean-500 bg-ocean-50 text-ocean-700'
                              : 'border-gray-100 hover:border-gray-200 text-gray-600'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Step 2: Underwriting ───────────────────────────── */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <p className="text-xs text-gray-500">
                    Please answer these underwriting questions accurately.
                  </p>

                  {/* Navigation Limit */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Navigation Limit (miles offshore)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="1000"
                        step="10"
                        value={form.underwriting.navigationLimitMiles}
                        onChange={e => patchUW({ navigationLimitMiles: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-ocean-300 focus:border-ocean-400 transition"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">miles</span>
                    </div>
                  </div>

                  {/* Lay-up Months */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Lay-up Period (months per year)
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {['0', '1', '2', '3', '4', '5', '6'].map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => patchUW({ layUpMonths: m })}
                          className={`py-2 rounded-xl border-2 text-xs font-medium transition-all ${
                            form.underwriting.layUpMonths === m
                              ? 'border-ocean-500 bg-ocean-50 text-ocean-700'
                              : 'border-gray-100 hover:border-gray-200 text-gray-600'
                          }`}
                        >
                          {m} {Number(m) === 1 ? 'mo' : 'mo'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Prior Losses */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Any insurance losses in the past 5 years? <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: false, label: 'No prior losses' },
                        { value: true,  label: 'Yes, I have losses' },
                      ].map(({ value, label }) => (
                        <button
                          key={String(value)}
                          type="button"
                          onClick={() => patchUW({ hasPriorLosses: value })}
                          className={`text-left px-3 py-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                            form.underwriting.hasPriorLosses === value
                              ? value
                                ? 'border-amber-400 bg-amber-50 text-amber-700'
                                : 'border-emerald-400 bg-emerald-50 text-emerald-700'
                              : 'border-gray-100 hover:border-gray-200 text-gray-600'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {form.underwriting.hasPriorLosses === true && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-2"
                      >
                        <textarea
                          rows={3}
                          placeholder="Please describe the nature and amount of prior losses..."
                          value={form.underwriting.priorLossDescription}
                          onChange={e => patchUW({ priorLossDescription: e.target.value })}
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-navy-500 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-ocean-300 focus:border-ocean-400 transition resize-none"
                        />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: Review & Bind ──────────────────────────── */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Premium Display */}
                  {computedPremium && selectedProduct && (
                    <div className={`rounded-xl p-4 text-center ${selectedProduct.instantBind ? 'bg-teal-50 border border-teal-100' : 'bg-ocean-50 border border-ocean-100'}`}>
                      {selectedProduct.instantBind && (
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Zap size={13} className="text-teal-600" />
                          <span className="text-xs font-semibold text-teal-600 uppercase tracking-wide">Instant Bind Available</span>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mb-1">Annual Premium</p>
                      <p className={`text-3xl font-heading font-bold ${selectedProduct.instantBind ? 'text-teal-700' : 'text-ocean-600'}`}>
                        {fmt(computedPremium)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {selectedProduct.baseRatePct
                          ? `${(selectedProduct.baseRatePct * 100).toFixed(2)}% of agreed hull value`
                          : 'Minimum premium applied'}
                      </p>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
                    <h5 className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-2">Coverage Summary</h5>
                    {[
                      { label: 'Product',         value: selectedProduct?.name ?? '—' },
                      { label: 'Insurer',          value: selectedProduct?.insurerName ?? '—' },
                      { label: 'Vessel',           value: boatName },
                      { label: 'Agreed Value',     value: form.agreedValueUsd ? fmt(Number(form.agreedValueUsd)) : '—' },
                      { label: 'Territory',        value: form.territory ? TERRITORY_LABELS[form.territory as Territory] : '—' },
                      { label: 'Nav Zone',         value: form.navigationZone || '—' },
                      { label: 'Use Type',         value: form.useType.charAt(0).toUpperCase() + form.useType.slice(1) },
                      { label: 'Nav Limit',        value: `${form.underwriting.navigationLimitMiles} miles offshore` },
                      { label: 'Lay-up',           value: `${form.underwriting.layUpMonths} months/yr` },
                      {
                        label: 'Deductible',
                        value: selectedProduct
                          ? fmt(
                              selectedProduct.deductibleFixedUsd
                                ?? Math.round(Number(form.agreedValueUsd) * (selectedProduct.deductiblePct ?? 0.02))
                            )
                          : '—',
                      },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-start gap-2">
                        <dt className="text-xs text-gray-500 flex-shrink-0">{label}</dt>
                        <dd className="text-xs font-medium text-navy-500 text-right">{value}</dd>
                      </div>
                    ))}
                  </div>

                  {/* Coverage Highlights */}
                  {selectedProduct && selectedProduct.coverageSummary.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                        <FileText size={10} />
                        Coverage Highlights
                      </p>
                      <ul className="space-y-1">
                        {selectedProduct.coverageSummary.slice(0, 4).map((h, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                            <CheckCircle2 size={11} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        {!submitted ? (
          <div className="flex items-center justify-between px-6 pb-6 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => step > 0 ? setStep(s => s - 1) : handleClose()}
              disabled={loading}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors disabled:opacity-50"
            >
              <ChevronLeft size={16} />
              {step === 0 ? 'Cancel' : 'Back'}
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext}
                className="flex items-center gap-1.5 bg-ocean-500 hover:bg-ocean-600 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-70 ${
                  selectedProduct?.instantBind
                    ? 'bg-teal-500 hover:bg-teal-600 text-white'
                    : 'bg-ocean-500 hover:bg-ocean-600 text-white'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Processing…
                  </>
                ) : selectedProduct?.instantBind ? (
                  <>
                    <Zap size={14} />
                    Bind Policy Now
                  </>
                ) : (
                  <>
                    <Shield size={14} />
                    Submit for Review
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="flex justify-center px-6 pb-6 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleClose}
              className="bg-ocean-500 hover:bg-ocean-600 text-white rounded-xl px-6 py-2 text-sm font-medium transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
