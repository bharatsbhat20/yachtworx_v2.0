import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronRight, ChevronLeft, Shield, MapPin,
  Calendar, FileText, DollarSign, AlertTriangle,
  Loader2, CheckCircle2, Ship,
} from 'lucide-react';
import type { InsurancePolicy, InsuranceClaim, IncidentType } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  policies: InsurancePolicy[];
  onSubmit: (data: Partial<InsuranceClaim>) => Promise<void>;
}

interface FormState {
  policyId: string;
  incidentType: IncidentType | '';
  incidentDate: string;
  incidentLocationName: string;
  description: string;
  estimatedLossUsd: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INCIDENT_TYPES: { value: IncidentType; label: string }[] = [
  { value: 'collision', label: 'Collision' },
  { value: 'weather',   label: 'Weather Damage' },
  { value: 'theft',     label: 'Theft' },
  { value: 'fire',      label: 'Fire' },
  { value: 'sinking',   label: 'Sinking' },
  { value: 'machinery', label: 'Machinery Failure' },
  { value: 'other',     label: 'Other' },
];

const STEPS = [
  { label: 'Policy & Incident', icon: Shield },
  { label: 'Details',           icon: MapPin },
  { label: 'Review & Submit',   icon: CheckCircle2 },
];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';

const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  collision: 'Collision',
  weather:   'Weather Damage',
  theft:     'Theft',
  fire:      'Fire',
  sinking:   'Sinking',
  machinery: 'Machinery Failure',
  other:     'Other',
};

// ─── Step Indicator ───────────────────────────────────────────────────────────

const StepIndicator: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <div className="flex items-center gap-2">
    {STEPS.map((step, i) => {
      const done    = i < current;
      const active  = i === current;
      const StepIcon = step.icon;
      return (
        <React.Fragment key={step.label}>
          <div className={`flex items-center gap-1.5 transition-all ${active ? 'opacity-100' : done ? 'opacity-70' : 'opacity-30'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              done ? 'bg-emerald-500 text-white' : active ? 'bg-ocean-500 text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              {done ? <CheckCircle2 size={12} /> : <StepIcon size={12} />}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${active ? 'text-navy-500' : 'text-gray-400'}`}>
              {step.label}
            </span>
          </div>
          {i < total - 1 && (
            <div className={`flex-1 h-px transition-colors ${done ? 'bg-emerald-300' : 'bg-gray-100'}`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

export const FNOLModal: React.FC<Props> = ({ open, onClose, policies, onSubmit }) => {
  const [step, setStep]       = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState<FormState>({
    policyId:             '',
    incidentType:         '',
    incidentDate:         today,
    incidentLocationName: '',
    description:          '',
    estimatedLossUsd:     '',
  });

  const patch = useCallback((updates: Partial<FormState>) => {
    setForm(prev => ({ ...prev, ...updates }));
  }, []);

  const selectedPolicy = policies.find(p => p.id === form.policyId);

  const step1Valid = !!form.policyId && !!form.incidentType && !!form.incidentDate;
  const step2Valid = form.incidentLocationName.trim().length >= 3
    && form.description.trim().length >= 10
    && !!form.estimatedLossUsd
    && Number(form.estimatedLossUsd) > 0;

  const canNext = step === 0 ? step1Valid : step === 1 ? step2Valid : true;

  const handleSubmit = async () => {
    if (!step1Valid || !step2Valid || !selectedPolicy) return;
    setLoading(true);
    try {
      await onSubmit({
        policyId:             form.policyId,
        policyNumber:         selectedPolicy.policyNumber,
        insurerId:            selectedPolicy.insurerId,
        insurerName:          selectedPolicy.insurerName,
        incidentType:         form.incidentType as IncidentType,
        incidentDate:         form.incidentDate,
        incidentLocationName: form.incidentLocationName,
        description:          form.description,
        estimatedLossUsd:     Number(form.estimatedLossUsd),
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
    // Reset after close animation
    setTimeout(() => {
      setStep(0);
      setSubmitted(false);
      setForm({ policyId: '', incidentType: '', incidentDate: today, incidentLocationName: '', description: '', estimatedLossUsd: '' });
    }, 300);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-heading font-semibold text-navy-500">File a Claim</h3>
            <p className="text-xs text-gray-400 mt-0.5">First Notice of Loss (FNOL)</p>
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
            <StepIndicator current={step} total={STEPS.length} />
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
          {submitted ? (
            // ── Success State ──────────────────────────────────────────
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-6"
            >
              <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-emerald-500" />
              </div>
              <h4 className="font-heading font-semibold text-navy-500 text-lg mb-2">Claim Submitted</h4>
              <p className="text-sm text-gray-500 leading-relaxed">
                Your First Notice of Loss has been submitted. Our claims team will be in touch within 1–2 business days.
              </p>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              {/* ── Step 1: Policy & Incident ─────────────────────────── */}
              {step === 0 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Policy Selection */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Select Policy <span className="text-red-400">*</span>
                    </label>
                    {policies.length === 0 ? (
                      <div className="flex items-center gap-2 bg-amber-50 rounded-xl p-3 text-xs text-amber-700">
                        <AlertTriangle size={13} />
                        No active policies found. You need an active policy to file a claim.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {policies
                          .filter(p => p.status === 'active' || p.status === 'expiring')
                          .map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => patch({ policyId: p.id })}
                              className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                                form.policyId === p.id
                                  ? 'border-ocean-500 bg-ocean-50'
                                  : 'border-gray-100 hover:border-gray-200 bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Ship size={13} className="text-ocean-500 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-navy-500 truncate">
                                    {p.boatName ?? 'Unknown Vessel'}
                                  </p>
                                  <p className="text-xs text-gray-400">#{p.policyNumber}</p>
                                </div>
                                {form.policyId === p.id && (
                                  <CheckCircle2 size={14} className="text-ocean-500 flex-shrink-0" />
                                )}
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Incident Type */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Incident Type <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {INCIDENT_TYPES.map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => patch({ incidentType: value })}
                          className={`text-left px-3 py-2 rounded-xl border-2 text-xs font-medium transition-all ${
                            form.incidentType === value
                              ? 'border-ocean-500 bg-ocean-50 text-ocean-700'
                              : 'border-gray-100 hover:border-gray-200 text-gray-600'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Incident Date */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      <Calendar size={11} className="inline mr-1" />
                      Incident Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      max={today}
                      value={form.incidentDate}
                      onChange={e => patch({ incidentDate: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-ocean-300 focus:border-ocean-400 transition"
                    />
                  </div>
                </motion.div>
              )}

              {/* ── Step 2: Details ───────────────────────────────────── */}
              {step === 1 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Location */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      <MapPin size={11} className="inline mr-1" />
                      Incident Location <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 5nm off Key West, Florida"
                      value={form.incidentLocationName}
                      onChange={e => patch({ incidentLocationName: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-navy-500 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-ocean-300 focus:border-ocean-400 transition"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      <FileText size={11} className="inline mr-1" />
                      Incident Description <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Describe what happened in as much detail as possible..."
                      value={form.description}
                      onChange={e => patch({ description: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-navy-500 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-ocean-300 focus:border-ocean-400 transition resize-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">{form.description.length} characters (min 10)</p>
                  </div>

                  {/* Estimated Loss */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      <DollarSign size={11} className="inline mr-1" />
                      Estimated Loss (USD) <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        placeholder="0"
                        value={form.estimatedLossUsd}
                        onChange={e => patch({ estimatedLossUsd: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 pl-7 pr-3 py-2 text-sm text-navy-500 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-ocean-300 focus:border-ocean-400 transition"
                      />
                    </div>
                    {selectedPolicy && form.estimatedLossUsd && (
                      <p className="text-xs text-gray-400 mt-1">
                        Deductible: {fmt(selectedPolicy.deductibleUsd)} • Net estimate:{' '}
                        {fmt(Math.max(0, Number(form.estimatedLossUsd) - selectedPolicy.deductibleUsd))}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: Review ────────────────────────────────────── */}
              {step === 2 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  <div className="bg-ocean-50 border border-ocean-100 rounded-xl p-4 space-y-3">
                    <h5 className="text-xs font-semibold text-navy-500 uppercase tracking-wide">Claim Summary</h5>

                    <dl className="space-y-2">
                      {[
                        { label: 'Vessel',        value: selectedPolicy?.boatName ?? '—' },
                        { label: 'Policy #',      value: selectedPolicy?.policyNumber ?? '—' },
                        { label: 'Insurer',       value: selectedPolicy?.insurerName ?? '—' },
                        { label: 'Incident Type', value: form.incidentType ? INCIDENT_TYPE_LABELS[form.incidentType as IncidentType] : '—' },
                        { label: 'Incident Date', value: fmtDate(form.incidentDate) },
                        { label: 'Location',      value: form.incidentLocationName || '—' },
                        { label: 'Est. Loss',     value: form.estimatedLossUsd ? fmt(Number(form.estimatedLossUsd)) : '—' },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between items-start gap-2">
                          <dt className="text-xs text-gray-500 flex-shrink-0">{label}</dt>
                          <dd className="text-xs font-medium text-navy-500 text-right">{value}</dd>
                        </div>
                      ))}
                    </dl>

                    <div className="pt-2 border-t border-ocean-100">
                      <p className="text-xs text-gray-500 font-medium mb-1">Description</p>
                      <p className="text-xs text-gray-600 leading-relaxed">{form.description}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-amber-50 rounded-xl p-3 text-xs text-amber-700">
                    <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                    <span>By submitting, you confirm that the information provided is accurate and complete to the best of your knowledge.</span>
                  </div>
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

            {step < 2 ? (
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
                className="flex items-center gap-2 bg-ocean-500 hover:bg-ocean-600 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Shield size={14} />
                    Submit Claim
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
