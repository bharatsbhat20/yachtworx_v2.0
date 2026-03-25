/**
 * Add Boat Wizard — TRD Section 3.2
 *
 * 3-step flow:
 *  Step 1: Vessel Identity    — name, make, model, year
 *  Step 2: Specs (AI autofill) — review/edit autofilled specs
 *  Step 3: Optional Details   — boat type, home port, HIN, reg#, value, photo
 *
 * On Step 1 completion: triggers POST /api/v1/boats/autofill (simulated)
 * On Step 3 completion: creates boat via boatStore.addBoat()
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ship, Sparkles, CheckCircle, AlertCircle, ChevronRight,
  ChevronLeft, Loader2, X, Anchor
} from 'lucide-react';
import { useBoatStore } from '../../store/boatStore';
import { useAuthStore } from '../../store/authStore';
import { autofillBoatSpecs } from '../../services/autofill';
import type { AddBoatFormData, BoatType, SpecSource } from '../../types';
import { BOAT_TYPE_LABELS } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AddBoatWizardProps {
  onClose: () => void;
}

const STEP_LABELS = ['Vessel Identity', 'Specifications', 'Optional Details'];

const EMPTY_FORM: AddBoatFormData = {
  name: '',
  make: '',
  model: '',
  year: '',
  lengthOverall: '',
  beam: '',
  draft: '',
  hullMaterial: '',
  engineType: '',
  fuelType: '',
  displacement: '',
  specsSource: 'manual',
  boatType: '',
  homePort: '',
  registrationNumber: '',
  hullId: '',
  estimatedValue: '',
  photoUrl: '',
};

// ─── Step Indicator ────────────────────────────────────────────────────────────

const StepIndicator: React.FC<{ currentStep: number }> = ({ currentStep }) => (
  <div className="flex items-center justify-between mb-8">
    {STEP_LABELS.map((label, i) => {
      const step = i + 1;
      const isCompleted = step < currentStep;
      const isActive = step === currentStep;
      return (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              isCompleted ? 'bg-teal-500 text-white' :
              isActive ? 'bg-ocean-500 text-white' :
              'bg-gray-100 text-gray-400'
            }`}>
              {isCompleted ? <CheckCircle size={16} /> : step}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${isActive ? 'text-navy-500' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 transition-colors ${isCompleted ? 'bg-teal-500' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ─── Step 1: Vessel Identity ──────────────────────────────────────────────────

const Step1: React.FC<{
  data: AddBoatFormData;
  onChange: (field: keyof AddBoatFormData, value: string | number) => void;
  onNext: () => void;
}> = ({ data, onChange, onNext }) => {
  const isValid = data.name && data.make && data.model && data.year &&
    Number(data.year) >= 1900 && Number(data.year) <= new Date().getFullYear() + 1;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-ocean-50 rounded-xl">
          <Ship size={20} className="text-ocean-500" />
        </div>
        <div>
          <h2 className="text-lg font-heading font-bold text-navy-500">Vessel Identity</h2>
          <p className="text-sm text-gray-400">Tell us about your boat</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-navy-500 mb-1.5">Vessel Name / Nickname <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={data.name}
            onChange={e => onChange('name', e.target.value)}
            placeholder='e.g. "Sea Breeze"'
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-navy-500 mb-1.5">Make <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={data.make}
              onChange={e => onChange('make', e.target.value)}
              placeholder="e.g. Beneteau"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-500 mb-1.5">Model <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={data.model}
              onChange={e => onChange('model', e.target.value)}
              placeholder="e.g. Oceanis 51.1"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-navy-500 mb-1.5">Year <span className="text-red-400">*</span></label>
          <input
            type="number"
            value={data.year}
            onChange={e => onChange('year', e.target.value)}
            placeholder={`e.g. ${new Date().getFullYear() - 3}`}
            min="1900"
            max={new Date().getFullYear() + 1}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
          />
        </div>

        <div className="bg-ocean-50 rounded-xl p-3 flex items-start gap-2.5 mt-2">
          <Sparkles size={14} className="text-ocean-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-ocean-700">
            After entering make, model, and year, we'll automatically look up your vessel's specifications from our marine database.
          </p>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onNext}
          disabled={!isValid}
          className="btn-ocean flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue <ChevronRight size={16} />
        </button>
      </div>
    </motion.div>
  );
};

// ─── Step 2: Specs / AI Autofill ──────────────────────────────────────────────

const Step2: React.FC<{
  data: AddBoatFormData;
  onChange: (field: keyof AddBoatFormData, value: string | number) => void;
  onNext: () => void;
  onBack: () => void;
  autofillStatus: 'idle' | 'loading' | 'success' | 'failed';
}> = ({ data, onChange, onNext, onBack, autofillStatus }) => {

  const specFields: Array<{
    field: keyof AddBoatFormData;
    label: string;
    type: string;
    placeholder: string;
    unit?: string;
  }> = [
    { field: 'lengthOverall', label: 'Length Overall', type: 'number', placeholder: '51.0', unit: 'ft' },
    { field: 'beam', label: 'Beam', type: 'number', placeholder: '15.9', unit: 'ft' },
    { field: 'draft', label: 'Draft', type: 'number', placeholder: '6.5', unit: 'ft' },
    { field: 'displacement', label: 'Displacement', type: 'number', placeholder: '29100', unit: 'lbs' },
    { field: 'hullMaterial', label: 'Hull Material', type: 'text', placeholder: 'Fiberglass' },
    { field: 'engineType', label: 'Engine Type', type: 'text', placeholder: 'Yanmar 4JH57 57HP Diesel' },
    { field: 'fuelType', label: 'Fuel Type', type: 'text', placeholder: 'Diesel' },
  ];

  const sourceLabel: Record<SpecSource, { text: string; color: string; icon: React.ReactNode }> = {
    api: { text: 'Autofilled from marine database', color: 'text-teal-600', icon: <Sparkles size={13} className="text-teal-500" /> },
    cache: { text: 'Loaded from cache', color: 'text-teal-600', icon: <CheckCircle size={13} className="text-teal-500" /> },
    manual: { text: 'No match found — enter manually', color: 'text-amber-600', icon: <AlertCircle size={13} className="text-amber-500" /> },
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-teal-50 rounded-xl">
          <Sparkles size={20} className="text-teal-500" />
        </div>
        <div>
          <h2 className="text-lg font-heading font-bold text-navy-500">Vessel Specifications</h2>
          <p className="text-sm text-gray-400">Review and edit the autofilled specs</p>
        </div>
      </div>

      {/* Autofill status banner */}
      {autofillStatus === 'loading' && (
        <div className="bg-ocean-50 border border-ocean-100 rounded-xl p-3 flex items-center gap-3 mb-4">
          <Loader2 size={15} className="text-ocean-500 animate-spin" />
          <p className="text-sm text-ocean-700">Looking up specs for {data.make} {data.model} {data.year}…</p>
        </div>
      )}
      {autofillStatus !== 'loading' && autofillStatus !== 'idle' && (
        <div className={`rounded-xl p-3 flex items-center gap-2.5 mb-4 ${
          data.specsSource !== 'manual' ? 'bg-teal-50 border border-teal-100' : 'bg-amber-50 border border-amber-100'
        }`}>
          {sourceLabel[data.specsSource].icon}
          <p className={`text-sm font-medium ${sourceLabel[data.specsSource].color}`}>
            {sourceLabel[data.specsSource].text}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {specFields.map(({ field, label, type, placeholder, unit }) => (
          <div key={field} className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
              <div className="relative">
                <input
                  type={type}
                  value={data[field] as string | number}
                  onChange={e => onChange(field, e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent pr-12"
                />
                {unit && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{unit}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-between">
        <button onClick={onBack} className="btn-ghost flex items-center gap-2 text-sm py-2.5 px-4">
          <ChevronLeft size={16} /> Back
        </button>
        <button onClick={onNext} className="btn-ocean flex items-center gap-2">
          Continue <ChevronRight size={16} />
        </button>
      </div>
    </motion.div>
  );
};

// ─── Step 3: Optional Details ─────────────────────────────────────────────────

const Step3: React.FC<{
  data: AddBoatFormData;
  onChange: (field: keyof AddBoatFormData, value: string | number) => void;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}> = ({ data, onChange, onSubmit, onBack, isSubmitting }) => (
  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2.5 bg-gold-50 rounded-xl bg-amber-50">
        <Anchor size={20} className="text-gold-500 text-amber-500" />
      </div>
      <div>
        <h2 className="text-lg font-heading font-bold text-navy-500">Optional Details</h2>
        <p className="text-sm text-gray-400">Complete your profile — all fields optional</p>
      </div>
    </div>

    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-navy-500 mb-1.5">Boat Type</label>
        <select
          value={data.boatType}
          onChange={e => onChange('boatType', e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 bg-white"
        >
          <option value="">Select type…</option>
          {(Object.entries(BOAT_TYPE_LABELS) as [BoatType, string][]).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-navy-500 mb-1.5">Home Port / Marina</label>
        <input
          type="text"
          value={data.homePort}
          onChange={e => onChange('homePort', e.target.value)}
          placeholder="Marina del Rey, CA"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-navy-500 mb-1.5">Registration #</label>
          <input
            type="text"
            value={data.registrationNumber}
            onChange={e => onChange('registrationNumber', e.target.value)}
            placeholder="CA-2847-YW"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy-500 mb-1.5">
            HIN
            <span className="ml-1 text-xs text-gray-400 font-normal">(Hull ID)</span>
          </label>
          <input
            type="text"
            value={data.hullId}
            onChange={e => onChange('hullId', e.target.value)}
            placeholder="FR-BEN51124A818"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-navy-500 mb-1.5">
          Estimated Value
          <span className="ml-1 text-xs text-gray-400 font-normal">(USD)</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          <input
            type="number"
            value={data.estimatedValue}
            onChange={e => onChange('estimatedValue', e.target.value)}
            placeholder="385000"
            className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-navy-500 mb-1.5">Photo URL</label>
        <input
          type="url"
          value={data.photoUrl}
          onChange={e => onChange('photoUrl', e.target.value)}
          placeholder="https://..."
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
        />
        <p className="text-xs text-gray-400 mt-1">Paste a public image URL for now. File upload coming soon.</p>
      </div>
    </div>

    <div className="mt-6 flex justify-between">
      <button onClick={onBack} className="btn-ghost flex items-center gap-2 text-sm py-2.5 px-4">
        <ChevronLeft size={16} /> Back
      </button>
      <button
        onClick={onSubmit}
        disabled={isSubmitting}
        className="btn-hero flex items-center gap-2 disabled:opacity-60"
      >
        {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Creating…</> : <><Ship size={16} /> Add Vessel</>}
      </button>
    </div>
  </motion.div>
);

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export const AddBoatWizard: React.FC<AddBoatWizardProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const { addBoat } = useBoatStore();
  const { currentUser } = useAuthStore();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<AddBoatFormData>(EMPTY_FORM);
  const [autofillStatus, setAutofillStatus] = useState<'idle' | 'loading' | 'success' | 'failed'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof AddBoatFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStep1Next = async () => {
    // Trigger AI autofill
    setAutofillStatus('loading');
    setStep(2);

    try {
      const result = await autofillBoatSpecs(
        formData.make,
        formData.model,
        Number(formData.year)
      );

      setFormData(prev => ({
        ...prev,
        lengthOverall: result.lengthOverall ?? prev.lengthOverall,
        beam: result.beam ?? prev.beam,
        draft: result.draft ?? prev.draft,
        hullMaterial: result.hullMaterial ?? prev.hullMaterial,
        engineType: result.engineType ?? prev.engineType,
        fuelType: result.fuelType ?? prev.fuelType,
        displacement: result.displacement ?? prev.displacement,
        specsSource: result.source,
      }));
      setAutofillStatus(result.source === 'manual' ? 'failed' : 'success');
    } catch {
      setAutofillStatus('failed');
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const newBoat = await addBoat(formData, currentUser?.id || 'user-1');
      navigate(`/boats/${newBoat.id}`);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-ocean-500 to-teal-500 rounded-lg">
                <Anchor size={16} className="text-white" />
              </div>
              <span className="font-heading font-bold text-navy-500">Add New Vessel</span>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>

          <StepIndicator currentStep={step} />

          <AnimatePresence mode="wait">
            {step === 1 && (
              <Step1
                key="step1"
                data={formData}
                onChange={handleChange}
                onNext={handleStep1Next}
              />
            )}
            {step === 2 && (
              <Step2
                key="step2"
                data={formData}
                onChange={handleChange}
                onNext={() => setStep(3)}
                onBack={() => setStep(1)}
                autofillStatus={autofillStatus}
              />
            )}
            {step === 3 && (
              <Step3
                key="step3"
                data={formData}
                onChange={handleChange}
                onSubmit={handleSubmit}
                onBack={() => setStep(2)}
                isSubmitting={isSubmitting}
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
