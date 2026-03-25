/**
 * BookingWizard — 3-step booking flow
 *
 * Step 1: Choose service from provider catalog
 * Step 2: Pick date, time slot, vessel, location + notes
 * Step 3: Confirm & submit (shows price breakdown)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check, Calendar, MapPin, Clock, Ship, DollarSign, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import type { ServiceProvider, ProviderService, CreateBookingFormData, LocationType } from '../../types';
import { useProviderStore } from '../../store/providerStore';
import { useBookingStore } from '../../store/bookingStore';
import { useBoatStore } from '../../store/boatStore';
import { useAuthStore } from '../../store/authStore';

interface Props {
  provider: ServiceProvider;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (bookingRef: string) => void;
}

const STEPS = ['Choose Service', 'Schedule', 'Confirm'];

// ─── Min-date helper: add minNoticeHours to today ─────────────────────────────
function minBookingDate(minNoticeHours = 24): string {
  const d = new Date();
  d.setHours(d.getHours() + minNoticeHours);
  return d.toISOString().slice(0, 10);
}

// ─── Format slot time ─────────────────────────────────────────────────────────
function slotLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export const BookingWizard: React.FC<Props> = ({ provider, isOpen, onClose, onSuccess }) => {
  const { user } = useAuthStore();
  const { boats, fetchBoats } = useBoatStore();
  const { services, availability, fetchServicesForProvider, fetchAvailability, getAvailableSlots, loading: provLoading } = useProviderStore();
  const { createBooking, loading: bookLoading } = useBookingStore();

  const [step, setStep] = useState(0);
  const [selectedService, setSelectedService] = useState<ProviderService | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedBoatId, setSelectedBoatId] = useState('');
  const [location, setLocation] = useState('');
  const [locationType, setLocationType] = useState<LocationType>('marina');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [createdRef, setCreatedRef] = useState('');

  // Fetch services + availability + boats on open
  useEffect(() => {
    if (isOpen) {
      fetchServicesForProvider(provider.id);
      fetchAvailability(provider.id);
      if (user) fetchBoats(user.id);
    }
  }, [isOpen, provider.id]);

  const slots = selectedService && selectedDate
    ? getAvailableSlots(provider.id, selectedService.id, selectedDate)
    : [];

  const providerServices = services.filter(s => s.providerId === provider.id && s.isActive);

  const minDate = minBookingDate(24);
  const ownerBoats = user ? boats.filter(b => b.ownerId === user.id) : [];

  // ── Step validation ───────────────────────────────────────────────────────
  const step1Valid = !!selectedService;
  const step2Valid = !!selectedDate && !!selectedSlot && !!selectedBoatId && !!location;

  // ── Computed price breakdown ──────────────────────────────────────────────
  const amount = selectedService?.basePrice ?? 0;
  const feeAmount = Math.round(amount * 0.12 * 100) / 100;
  const payout = Math.round((amount - feeAmount) * 100) / 100;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const reset = () => {
    setStep(0);
    setSelectedService(null);
    setSelectedDate('');
    setSelectedSlot('');
    setSelectedBoatId('');
    setLocation('');
    setLocationType('marina');
    setNotes('');
    setError('');
    setConfirmed(false);
    setCreatedRef('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!user || !selectedService || !selectedSlot || !selectedBoatId) return;
    setError('');
    const formData: CreateBookingFormData = {
      providerId: provider.id,
      boatId: selectedBoatId,
      serviceId: selectedService.id,
      location,
      locationType,
      proposedStart: selectedSlot,
      notes: notes || undefined,
    };
    const booking = await createBooking(formData, user.id);
    if (!booking) {
      setError('Failed to create booking. Please try again.');
      return;
    }
    setCreatedRef(booking.reference);
    setConfirmed(true);
    onSuccess?.(booking.reference);
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (confirmed) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Booking Submitted" size="md">
        <div className="text-center py-6 space-y-4">
          <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto">
            <Check size={32} className="text-teal-500" />
          </div>
          <div>
            <h3 className="text-xl font-heading font-bold text-navy-500">Request Sent!</h3>
            <p className="text-gray-500 mt-1 text-sm">
              Your booking request has been submitted to {provider.name}.
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl px-6 py-4 inline-block">
            <p className="text-xs text-gray-400 mb-1">Booking reference</p>
            <p className="text-lg font-mono font-bold text-navy-500">{createdRef}</p>
          </div>
          <p className="text-sm text-gray-400">
            You'll be notified when {provider.name} confirms your booking.
          </p>
          <Button variant="ocean" fullWidth onClick={handleClose}>Done</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Book with ${provider.name}`} size="lg">
      <div className="space-y-6">

        {/* Step indicator */}
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < step ? 'bg-ocean-500 text-white' :
                  i === step ? 'bg-navy-500 text-white' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {i < step ? <Check size={13} /> : i + 1}
                </div>
                <span className={`text-xs font-medium ${i === step ? 'text-navy-500' : 'text-gray-400'}`}>
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-3 ${i < step ? 'bg-ocean-300' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── Step 1: Choose service ── */}
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <p className="text-sm text-gray-500 mb-4">Select the service you need:</p>
              {provLoading ? (
                <div className="text-center py-8 text-gray-400 text-sm">Loading services…</div>
              ) : providerServices.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No services available</div>
              ) : (
                <div className="space-y-3">
                  {providerServices.map(svc => (
                    <button
                      key={svc.id}
                      onClick={() => setSelectedService(svc)}
                      className={`w-full text-left rounded-xl p-4 border-2 transition-all ${
                        selectedService?.id === svc.id
                          ? 'border-ocean-500 bg-ocean-50'
                          : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-navy-500 text-sm">{svc.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{svc.category}</p>
                          {svc.description && (
                            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-2">{svc.description}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          {svc.priceType === 'quote' ? (
                            <Badge variant="info" className="text-xs">Quote</Badge>
                          ) : (
                            <p className="text-sm font-heading font-bold text-navy-500">
                              ${(svc.basePrice ?? 0).toLocaleString()}
                              {svc.priceType === 'hourly' && <span className="text-xs font-normal text-gray-400">/hr</span>}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 justify-end">
                            <Clock size={10} /> {svc.durationMinutes >= 60
                              ? `${Math.floor(svc.durationMinutes / 60)}h ${svc.durationMinutes % 60 > 0 ? svc.durationMinutes % 60 + 'm' : ''}`
                              : `${svc.durationMinutes}m`}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Step 2: Schedule ── */}
          {step === 1 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="space-y-4">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-navy-500 mb-1.5 flex items-center gap-1.5">
                    <Calendar size={14} /> Date
                  </label>
                  <input
                    type="date"
                    min={minDate}
                    value={selectedDate}
                    onChange={e => { setSelectedDate(e.target.value); setSelectedSlot(''); }}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500/30 focus:border-ocean-500"
                  />
                </div>

                {/* Time slots */}
                {selectedDate && (
                  <div>
                    <label className="block text-sm font-medium text-navy-500 mb-2 flex items-center gap-1.5">
                      <Clock size={14} /> Available time slots
                    </label>
                    {slots.length === 0 ? (
                      <p className="text-sm text-gray-400 bg-gray-50 rounded-xl p-4 text-center">
                        No available slots on this date. Try another day.
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {slots.map(slot => (
                          <button
                            key={slot.start}
                            onClick={() => setSelectedSlot(slot.start)}
                            className={`rounded-xl px-3 py-2 text-sm font-medium border-2 transition-all ${
                              selectedSlot === slot.start
                                ? 'border-ocean-500 bg-ocean-500 text-white'
                                : 'border-gray-200 bg-white text-navy-500 hover:border-ocean-300'
                            }`}
                          >
                            {slotLabel(slot.start)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Vessel */}
                <div>
                  <label className="block text-sm font-medium text-navy-500 mb-1.5 flex items-center gap-1.5">
                    <Ship size={14} /> Vessel
                  </label>
                  <select
                    value={selectedBoatId}
                    onChange={e => setSelectedBoatId(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500/30 focus:border-ocean-500"
                  >
                    <option value="">— Select vessel —</option>
                    {ownerBoats.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.year} {b.make} {b.model})</option>
                    ))}
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-navy-500 mb-1.5 flex items-center gap-1.5">
                    <MapPin size={14} /> Service location
                  </label>
                  <div className="flex gap-2 mb-2">
                    {(['marina', 'address', 'onwater'] as LocationType[]).map(lt => (
                      <button
                        key={lt}
                        onClick={() => setLocationType(lt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                          locationType === lt
                            ? 'border-ocean-500 bg-ocean-50 text-ocean-600'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {lt === 'onwater' ? 'On Water' : lt.charAt(0).toUpperCase() + lt.slice(1)}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder={locationType === 'marina' ? 'e.g. Marina del Rey, Dock B-12' : 'Full address or coordinates'}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500/30 focus:border-ocean-500"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-navy-500 mb-1.5">Notes (optional)</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Describe any specific issues, access instructions, etc."
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500/30 focus:border-ocean-500 resize-none"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Confirm ── */}
          {step === 2 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="space-y-4">
                {/* Summary card */}
                <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-heading font-bold text-navy-500">{selectedService?.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{selectedService?.category}</p>
                    </div>
                    <Badge variant="ocean" className="text-xs">
                      {selectedService?.priceType === 'quote' ? 'Quote' : selectedService?.priceType}
                    </Badge>
                  </div>
                  <hr className="border-gray-200" />
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">Provider</p>
                      <p className="font-medium text-navy-500">{provider.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Vessel</p>
                      <p className="font-medium text-navy-500">
                        {ownerBoats.find(b => b.id === selectedBoatId)?.name ?? '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Date</p>
                      <p className="font-medium text-navy-500">
                        {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Start time</p>
                      <p className="font-medium text-navy-500">
                        {selectedSlot ? slotLabel(selectedSlot) : '—'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-400">Location</p>
                      <p className="font-medium text-navy-500">{location}</p>
                    </div>
                  </div>
                </div>

                {/* Price breakdown (only for fixed/hourly) */}
                {selectedService?.priceType !== 'quote' && amount > 0 && (
                  <div className="bg-ocean-50 rounded-xl p-4 space-y-2 border border-ocean-100">
                    <p className="text-xs font-medium text-navy-500 flex items-center gap-1.5 mb-3">
                      <DollarSign size={13} /> Price breakdown
                    </p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Service price</span>
                      <span className="font-medium text-navy-500">${amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Platform fee (12%)</span>
                      <span className="text-gray-500">${feeAmount.toLocaleString()}</span>
                    </div>
                    <hr className="border-ocean-200" />
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-navy-500">Total charged</span>
                      <span className="text-navy-500">${amount.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-gray-400">Provider receives ${payout.toLocaleString()} after platform fee.</p>
                  </div>
                )}

                {selectedService?.priceType === 'quote' && (
                  <div className="bg-amber-50 rounded-xl p-4 flex items-start gap-3 border border-amber-100">
                    <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                      This service requires a custom quote. The provider will send you a price before your card is charged.
                    </p>
                  </div>
                )}

                {notes && (
                  <div className="bg-gray-50 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-400 mb-1">Your notes</p>
                    <p className="text-sm text-gray-600">{notes}</p>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                    <AlertCircle size={15} />
                    {error}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <Button variant="secondary" icon={<ChevronLeft size={15} />} onClick={() => setStep(s => s - 1)}>
              Back
            </Button>
          )}
          <div className="flex-1" />
          {step < 2 ? (
            <Button
              variant="ocean"
              icon={<ChevronRight size={15} />}
              iconPosition="right"
              disabled={(step === 0 && !step1Valid) || (step === 1 && !step2Valid)}
              onClick={() => setStep(s => s + 1)}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="ocean"
              icon={<Check size={15} />}
              onClick={handleSubmit}
              loading={bookLoading}
            >
              Submit Booking Request
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
