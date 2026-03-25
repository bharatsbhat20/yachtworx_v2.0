import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, ArrowLeft, Upload, Anchor } from 'lucide-react';
import { Input, Textarea } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

const steps = [
  { num: 1, label: 'Basic Info' },
  { num: 2, label: 'Services' },
  { num: 3, label: 'Certifications' },
  { num: 4, label: 'Profile' },
  { num: 5, label: 'Review' },
];

const serviceCategories = [
  'Engine & Mechanical', 'Electrical & Electronics', 'Hull & Fiberglass',
  'Rigging & Sails', 'Detailing & Cleaning', 'Navigation',
  'Haul-out & Storage', 'Diving & Underwater', 'Survey & Inspection', 'Safety Equipment'
];

const commonCerts = [
  'ABYC Certification', 'NMEA Certified', 'Yanmar Authorized',
  'Volvo Penta Authorized', 'SAMS Certified Surveyor', 'NAMS Member',
  'Commercial Diver', 'EPA Certified', 'IDA Certified Detailer', 'Selden Rigger'
];

export const ProviderRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCerts, setSelectedCerts] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    businessName: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    yearsExperience: '',
    description: '',
  });

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const toggleCert = (cert: string) => {
    setSelectedCerts(prev =>
      prev.includes(cert) ? prev.filter(c => c !== cert) : [...prev, cert]
    );
  };

  const handleNext = () => {
    if (currentStep < 5) setCurrentStep(s => s + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(s => s - 1);
  };

  const handleSubmit = () => {
    navigate('/provider-dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="p-2 bg-gradient-to-br from-ocean-500 to-teal-500 rounded-xl">
            <Anchor size={18} className="text-white" />
          </div>
          <span className="font-heading font-bold text-xl text-navy-500">
            Yacht<span className="text-teal-500">worx</span>
          </span>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-heading font-bold text-navy-500 mb-2">Create your provider profile</h1>
          <p className="text-gray-500">Join 2,847 verified marine professionals on Yachtworx</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between mb-10">
          {steps.map((step, i) => (
            <React.Fragment key={step.num}>
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-heading font-bold text-sm transition-all ${
                    currentStep > step.num
                      ? 'bg-teal-500 text-white'
                      : currentStep === step.num
                      ? 'bg-navy-500 text-white ring-4 ring-navy-500/20'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {currentStep > step.num ? <CheckCircle size={18} /> : step.num}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${
                  currentStep >= step.num ? 'text-navy-500' : 'text-gray-400'
                }`}>
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${currentStep > step.num ? 'bg-teal-500' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Form */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 1, x: 0 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8"
        >
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-heading font-semibold text-navy-500 mb-6">Basic Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  value={formData.firstName}
                  onChange={e => setFormData(d => ({ ...d, firstName: e.target.value }))}
                  placeholder="Marcus"
                />
                <Input
                  label="Last Name"
                  value={formData.lastName}
                  onChange={e => setFormData(d => ({ ...d, lastName: e.target.value }))}
                  placeholder="Chen"
                />
              </div>
              <Input
                label="Business Name"
                value={formData.businessName}
                onChange={e => setFormData(d => ({ ...d, businessName: e.target.value }))}
                placeholder="Pacific Marine Services"
              />
              <Input
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={e => setFormData(d => ({ ...d, email: e.target.value }))}
                placeholder="marcus@pacificmarine.com"
              />
              <Input
                label="Phone Number"
                type="tel"
                value={formData.phone}
                onChange={e => setFormData(d => ({ ...d, phone: e.target.value }))}
                placeholder="+1 (310) 555-0100"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="City"
                  value={formData.city}
                  onChange={e => setFormData(d => ({ ...d, city: e.target.value }))}
                  placeholder="Marina del Rey"
                />
                <Input
                  label="State"
                  value={formData.state}
                  onChange={e => setFormData(d => ({ ...d, state: e.target.value }))}
                  placeholder="CA"
                />
              </div>
            </div>
          )}

          {/* Step 2: Services */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-heading font-semibold text-navy-500 mb-2">Your Services</h2>
              <p className="text-gray-500 text-sm mb-6">Select all service categories that apply to your work</p>
              <div className="grid grid-cols-2 gap-3">
                {serviceCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`flex items-center gap-2.5 p-4 rounded-xl border-2 text-left text-sm font-medium transition-all ${
                      selectedCategories.includes(cat)
                        ? 'border-ocean-500 bg-ocean-50 text-ocean-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {selectedCategories.includes(cat) && <CheckCircle size={16} className="text-ocean-500 flex-shrink-0" />}
                    <span>{cat}</span>
                  </button>
                ))}
              </div>
              {selectedCategories.length > 0 && (
                <p className="mt-4 text-sm text-teal-600 font-medium">
                  {selectedCategories.length} categories selected
                </p>
              )}
            </div>
          )}

          {/* Step 3: Certifications */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-heading font-semibold text-navy-500 mb-2">Certifications & Experience</h2>
              <p className="text-gray-500 text-sm mb-6">Add your professional certifications and years of experience</p>
              <div className="mb-6">
                <Input
                  label="Years of Experience"
                  type="number"
                  value={formData.yearsExperience}
                  onChange={e => setFormData(d => ({ ...d, yearsExperience: e.target.value }))}
                  placeholder="15"
                />
              </div>
              <h3 className="text-sm font-semibold text-navy-500 mb-3">Select your certifications:</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {commonCerts.map(cert => (
                  <button
                    key={cert}
                    onClick={() => toggleCert(cert)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium border transition-all ${
                      selectedCerts.includes(cert)
                        ? 'bg-teal-500 text-white border-teal-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'
                    }`}
                  >
                    {selectedCerts.includes(cert) && <CheckCircle size={12} />}
                    {cert}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Profile */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-heading font-semibold text-navy-500 mb-6">Profile & Description</h2>
              <div
                className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center hover:border-ocean-400 transition-colors cursor-pointer"
              >
                <Upload size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500 mb-1">Upload profile photo</p>
                <p className="text-xs text-gray-400">PNG or JPG, max 5MB</p>
              </div>
              <Textarea
                label="Professional Description"
                value={formData.description}
                onChange={e => setFormData(d => ({ ...d, description: e.target.value }))}
                placeholder="Tell boat owners about your expertise, specializations, and what sets you apart. Include specific brands, vessel types you work with, and your approach to the job."
                rows={6}
                hint="A detailed description dramatically increases your profile views and booking rate."
              />
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div>
              <h2 className="text-xl font-heading font-semibold text-navy-500 mb-6">Review Your Profile</h2>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Contact Info</h3>
                  <p className="font-semibold text-navy-500">{formData.firstName} {formData.lastName}</p>
                  <p className="text-gray-500">{formData.businessName}</p>
                  <p className="text-gray-500">{formData.email}</p>
                  <p className="text-gray-500">{formData.city}, {formData.state}</p>
                </div>
                {selectedCategories.length > 0 && (
                  <div className="bg-gray-50 rounded-2xl p-5">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Service Categories</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedCategories.map(cat => (
                        <span key={cat} className="text-xs bg-ocean-100 text-ocean-700 px-2.5 py-1 rounded-full">{cat}</span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedCerts.length > 0 && (
                  <div className="bg-gray-50 rounded-2xl p-5">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Certifications</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedCerts.map(cert => (
                        <span key={cert} className="text-xs bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle size={10} /> {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="bg-navy-50 rounded-2xl p-5 border border-navy-100">
                  <p className="text-sm text-navy-500">
                    By submitting your profile, you agree to our{' '}
                    <a href="#" className="text-ocean-500 underline">Terms of Service</a> and{' '}
                    <a href="#" className="text-ocean-500 underline">Provider Agreement</a>.
                    Your profile will be reviewed and approved within 24 hours.
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-navy-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex gap-1">
            {steps.map(s => (
              <div
                key={s.num}
                className={`w-2 h-2 rounded-full transition-all ${
                  s.num === currentStep ? 'bg-navy-500 w-6' : s.num < currentStep ? 'bg-teal-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          {currentStep < 5 ? (
            <Button variant="ocean" icon={<ArrowRight size={16} />} iconPosition="right" onClick={handleNext}>
              Continue
            </Button>
          ) : (
            <Button variant="hero" icon={<ArrowRight size={16} />} iconPosition="right" onClick={handleSubmit}>
              Create Profile
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
