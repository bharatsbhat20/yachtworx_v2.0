import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, ChevronRight, ChevronLeft, User, Building2,
  FileText, CreditCard, MapPin, Shield, Star, AlertCircle,
  Eye, EyeOff, Phone, Mail, Lock, Anchor,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { isDemoMode } from '../lib/supabase';
import { SERVICE_CATEGORIES } from '../types';

// ─── Steps ────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Account',  icon: User },
  { id: 2, label: 'Business', icon: Building2 },
  { id: 3, label: 'Services', icon: Star },
  { id: 4, label: 'Location', icon: MapPin },
  { id: 5, label: 'Review',   icon: Shield },
];

const CERTIFICATIONS = [
  'ABYC Certified', 'Volvo Penta Certified', 'Yamaha Certified',
  'Mercury Certified', 'Yanmar Certified', 'USCG Licensed Captain',
  'STCW Certified', 'Harken Rigging', 'Selden Certified', 'NAMS Surveyor',
];

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormData {
  contactName: string; businessName: string; email: string; phone: string;
  password: string; confirmPassword: string; termsAccepted: boolean;
  yearsInBusiness: string; bio: string; emergencyAvailability: boolean;
  certifications: string[]; serviceCategories: string[];
  addressLine1: string; addressCity: string; addressState: string; addressZip: string;
}

const initialForm: FormData = {
  contactName: '', businessName: '', email: '', phone: '',
  password: '', confirmPassword: '', termsAccepted: false,
  yearsInBusiness: '', bio: '', emergencyAvailability: false,
  certifications: [], serviceCategories: [],
  addressLine1: '', addressCity: '', addressState: '', addressZip: '',
};

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProviderRegistration() {
  const navigate = useNavigate();
  const { register } = useAuthStore();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleItem = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];

  const validateStep = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (step === 1) {
      if (!form.contactName.trim())               errs.contactName = 'Full name is required';
      if (!form.businessName.trim())              errs.businessName = 'Business name is required';
      if (!form.email.includes('@'))              errs.email = 'Valid email is required';
      if (!form.phone.trim())                     errs.phone = 'Phone is required';
      if (form.password.length < 10)              errs.password = 'Password must be at least 10 characters';
      if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
      if (!form.termsAccepted)                    errs.termsAccepted = 'You must accept the terms';
    }
    if (step === 2) {
      if (!form.yearsInBusiness) errs.yearsInBusiness = 'Required';
      if (form.bio.length < 50)  errs.bio = 'Bio must be at least 50 characters';
    }
    if (step === 3 && form.serviceCategories.length === 0)
      errs.serviceCategories = 'Select at least one category';
    if (step === 4) {
      if (!form.addressLine1.trim()) errs.addressLine1 = 'Address is required';
      if (!form.addressCity.trim())  errs.addressCity = 'City is required';
      if (!form.addressState.trim()) errs.addressState = 'State is required';
      if (!form.addressZip.trim())   errs.addressZip = 'ZIP is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => { if (!validateStep()) return; setDirection(1); setStep((s) => s + 1); };
  const prev = () => { setDirection(-1); setStep((s) => s - 1); };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSubmitting(true); setSubmitError('');
    try {
      await register({
        email: form.email,
        password: form.password,
        firstName: form.contactName.split(' ')[0],
        lastName: form.contactName.split(' ').slice(1).join(' ') || '',
        role: 'provider',
      });
      navigate('/provider-dashboard');
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Registration failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  const progressPct = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-ocean-900 flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-white">
          <Anchor className="w-6 h-6 text-gold-400" />
          <span className="font-bold text-lg">Yachtworx</span>
        </Link>
        <span className="text-white/50 text-sm">Provider Registration</span>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          {/* Step indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              {STEPS.map((s) => {
                const Icon = s.icon;
                const isComplete = step > s.id;
                const isCurrent = step === s.id;
                return (
                  <div key={s.id} className="flex flex-col items-center gap-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isComplete ? 'bg-teal-500 text-white' :
                      isCurrent  ? 'bg-gold-500 text-navy-900' :
                                   'bg-white/10 text-white/40'
                    }`}>
                      {isComplete ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span className={`text-xs font-medium ${isCurrent ? 'text-gold-400' : 'text-white/40'}`}>{s.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="h-1 bg-white/10 rounded-full">
              <motion.div
                className="h-full bg-gradient-to-r from-teal-500 to-gold-400 rounded-full"
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="p-8"
              >

                {/* STEP 1 — Account */}
                {step === 1 && (
                  <div>
                    <h2 className="text-2xl font-bold text-navy-900 mb-1">Create your account</h2>
                    <p className="text-gray-500 mb-6">Start your journey as a Yachtworx service provider.</p>
                    {isDemoMode && (
                      <div className="mb-4 p-3 bg-ocean-50 border border-ocean-200 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-ocean-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-ocean-700">Demo mode — no real account will be created.</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full name *</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 ${errors.contactName ? 'border-red-400' : 'border-gray-300'}`}
                            placeholder="Marcus Rivera" value={form.contactName}
                            onChange={(e) => setField('contactName', e.target.value)} />
                        </div>
                        {errors.contactName && <p className="text-red-500 text-xs mt-1">{errors.contactName}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Business name *</label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 ${errors.businessName ? 'border-red-400' : 'border-gray-300'}`}
                            placeholder="Rivera Marine Services" value={form.businessName}
                            onChange={(e) => setField('businessName', e.target.value)} />
                        </div>
                        {errors.businessName && <p className="text-red-500 text-xs mt-1">{errors.businessName}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input type="email" className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 ${errors.email ? 'border-red-400' : 'border-gray-300'}`}
                            placeholder="you@business.com" value={form.email}
                            onChange={(e) => setField('email', e.target.value)} />
                        </div>
                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input type="tel" className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 ${errors.phone ? 'border-red-400' : 'border-gray-300'}`}
                            placeholder="+1 310 555 0100" value={form.phone}
                            onChange={(e) => setField('phone', e.target.value)} />
                        </div>
                        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input type={showPassword ? 'text' : 'password'}
                            className={`w-full pl-9 pr-9 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 ${errors.password ? 'border-red-400' : 'border-gray-300'}`}
                            placeholder="Min 10 characters" value={form.password}
                            onChange={(e) => setField('password', e.target.value)} />
                          <button type="button" onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password *</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input type="password" className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 ${errors.confirmPassword ? 'border-red-400' : 'border-gray-300'}`}
                            placeholder="Repeat password" value={form.confirmPassword}
                            onChange={(e) => setField('confirmPassword', e.target.value)} />
                        </div>
                        {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                      </div>
                    </div>
                    <label className={`flex items-start gap-3 cursor-pointer p-3 rounded-lg border ${errors.termsAccepted ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}>
                      <input type="checkbox" className="mt-0.5" checked={form.termsAccepted}
                        onChange={(e) => setField('termsAccepted', e.target.checked)} />
                      <span className="text-sm text-gray-600">
                        I agree to the <a href="#" className="text-ocean-600 underline">Terms of Service</a> and <a href="#" className="text-ocean-600 underline">Privacy Policy</a>
                      </span>
                    </label>
                    {errors.termsAccepted && <p className="text-red-500 text-xs mt-1">{errors.termsAccepted}</p>}
                    <p className="mt-4 text-sm text-gray-500 text-center">
                      Already have an account? <Link to="/auth" className="text-ocean-600 font-medium hover:underline">Sign in</Link>
                    </p>
                  </div>
                )}

                {/* STEP 2 — Business Profile */}
                {step === 2 && (
                  <div>
                    <h2 className="text-2xl font-bold text-navy-900 mb-1">Business profile</h2>
                    <p className="text-gray-500 mb-6">Tell boat owners what makes you exceptional.</p>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Years in business *</label>
                      <input type="number" min="0" max="60"
                        className={`w-32 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 ${errors.yearsInBusiness ? 'border-red-400' : 'border-gray-300'}`}
                        placeholder="e.g. 12" value={form.yearsInBusiness}
                        onChange={(e) => setField('yearsInBusiness', e.target.value)} />
                      {errors.yearsInBusiness && <p className="text-red-500 text-xs mt-1">{errors.yearsInBusiness}</p>}
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Professional bio * <span className="text-gray-400">({form.bio.length}/1000)</span>
                      </label>
                      <textarea rows={4} maxLength={1000}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 resize-none ${errors.bio ? 'border-red-400' : 'border-gray-300'}`}
                        placeholder="Describe your expertise, specialisations, and what sets you apart (min 50 characters)…"
                        value={form.bio} onChange={(e) => setField('bio', e.target.value)} />
                      {errors.bio && <p className="text-red-500 text-xs mt-1">{errors.bio}</p>}
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Certifications & credentials</label>
                      <div className="flex flex-wrap gap-2">
                        {CERTIFICATIONS.map((cert) => (
                          <button key={cert} type="button"
                            onClick={() => setField('certifications', toggleItem(form.certifications, cert))}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                              form.certifications.includes(cert)
                                ? 'bg-teal-500 text-white border-teal-500'
                                : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400'
                            }`}>{cert}</button>
                        ))}
                      </div>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                      <input type="checkbox" checked={form.emergencyAvailability}
                        onChange={(e) => setField('emergencyAvailability', e.target.checked)} />
                      <div>
                        <p className="text-sm font-medium text-gray-800">Available for emergencies</p>
                        <p className="text-xs text-gray-500">You will appear in emergency service searches</p>
                      </div>
                    </label>
                  </div>
                )}

                {/* STEP 3 — Service Categories */}
                {step === 3 && (
                  <div>
                    <h2 className="text-2xl font-bold text-navy-900 mb-1">Service categories</h2>
                    <p className="text-gray-500 mb-6">Select the services you offer. You can add detailed pricing later.</p>
                    <div className="grid grid-cols-2 gap-3">
                      {SERVICE_CATEGORIES.map((cat) => (
                        <button key={cat} type="button"
                          onClick={() => setField('serviceCategories', toggleItem(form.serviceCategories, cat))}
                          className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                            form.serviceCategories.includes(cat)
                              ? 'border-ocean-500 bg-ocean-50 text-ocean-800'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-ocean-300'
                          }`}>
                          {form.serviceCategories.includes(cat) && <CheckCircle className="w-4 h-4 text-ocean-500 flex-shrink-0" />}
                          <span className="text-sm font-medium">{cat}</span>
                        </button>
                      ))}
                    </div>
                    {errors.serviceCategories && <p className="text-red-500 text-xs mt-3">{errors.serviceCategories}</p>}
                    <p className="text-sm text-gray-500 mt-3">{form.serviceCategories.length} selected</p>
                  </div>
                )}

                {/* STEP 4 — Location */}
                {step === 4 && (
                  <div>
                    <h2 className="text-2xl font-bold text-navy-900 mb-1">Your location</h2>
                    <p className="text-gray-500 mb-6">Your business address helps boat owners find you by distance.</p>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Street address *</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 ${errors.addressLine1 ? 'border-red-400' : 'border-gray-300'}`}
                          placeholder="1200 Admiralty Way" value={form.addressLine1}
                          onChange={(e) => setField('addressLine1', e.target.value)} />
                      </div>
                      {errors.addressLine1 && <p className="text-red-500 text-xs mt-1">{errors.addressLine1}</p>}
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                        <input className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 ${errors.addressCity ? 'border-red-400' : 'border-gray-300'}`}
                          placeholder="Marina del Rey" value={form.addressCity}
                          onChange={(e) => setField('addressCity', e.target.value)} />
                        {errors.addressCity && <p className="text-red-500 text-xs mt-1">{errors.addressCity}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                        <input className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 ${errors.addressState ? 'border-red-400' : 'border-gray-300'}`}
                          placeholder="CA" maxLength={2} value={form.addressState}
                          onChange={(e) => setField('addressState', e.target.value.toUpperCase())} />
                        {errors.addressState && <p className="text-red-500 text-xs mt-1">{errors.addressState}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ZIP *</label>
                        <input className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 ${errors.addressZip ? 'border-red-400' : 'border-gray-300'}`}
                          placeholder="90292" value={form.addressZip}
                          onChange={(e) => setField('addressZip', e.target.value)} />
                        {errors.addressZip && <p className="text-red-500 text-xs mt-1">{errors.addressZip}</p>}
                      </div>
                    </div>
                    <div className="p-4 bg-ocean-50 rounded-xl border border-ocean-200">
                      <p className="text-sm text-ocean-700 font-medium mb-1">After registration you can:</p>
                      <ul className="text-sm text-ocean-600 space-y-1">
                        <li>• Upload business licence and insurance COI</li>
                        <li>• Complete Stripe Connect for payments</li>
                        <li>• Add service areas and set your availability</li>
                        <li>• Upload portfolio photos</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* STEP 5 — Review */}
                {step === 5 && (
                  <div>
                    <h2 className="text-2xl font-bold text-navy-900 mb-1">Review & submit</h2>
                    <p className="text-gray-500 mb-6">Double-check your details before creating your account.</p>
                    <div className="space-y-2">
                      {[
                        { label: 'Name',             value: form.contactName },
                        { label: 'Business',         value: form.businessName },
                        { label: 'Email',            value: form.email },
                        { label: 'Phone',            value: form.phone },
                        { label: 'Years in business',value: form.yearsInBusiness ? `${form.yearsInBusiness} yrs` : '—' },
                        { label: 'Location',         value: [form.addressCity, form.addressState, form.addressZip].filter(Boolean).join(', ') || '—' },
                        { label: 'Services',         value: form.serviceCategories.join(', ') || '—' },
                        { label: 'Emergency',        value: form.emergencyAvailability ? 'Yes' : 'No' },
                        { label: 'Certifications',   value: form.certifications.join(', ') || 'None added' },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between items-start py-2 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-500 w-36 flex-shrink-0">{label}</span>
                          <span className="text-sm text-gray-800 text-right">{value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                      <FileText className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-amber-700">
                        After registering, upload your <strong>business licence</strong> and <strong>insurance COI</strong> and complete <strong>Stripe onboarding</strong> before accepting bookings.
                      </p>
                    </div>
                    {submitError && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <p className="text-sm text-red-600">{submitError}</p>
                      </div>
                    )}
                  </div>
                )}

              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="px-8 pb-8 flex items-center justify-between">
              <button type="button" onClick={prev} disabled={step === 1}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              {step < STEPS.length ? (
                <button type="button" onClick={next}
                  className="flex items-center gap-2 px-6 py-2.5 bg-navy-900 text-white text-sm font-medium rounded-lg hover:bg-navy-800 transition-colors">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button type="button" onClick={handleSubmit} disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-teal-500 to-ocean-600 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60">
                  {submitting ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating…</>
                  ) : (
                    <><CreditCard className="w-4 h-4" /> Create account</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
