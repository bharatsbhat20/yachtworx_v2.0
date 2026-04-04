import React, { useState } from 'react';
import { X, Anchor, Calendar, CreditCard, User, Phone, Mail, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { useMarinaStore } from '../../store/marinaStore';
import { useAuthStore } from '../../store/authStore';
import type { MarinaBerth, Marina, BookingSource } from '../../types';

interface Props {
  marina: Marina;
  berth: MarinaBerth;
  onClose: () => void;
}

type Step = 'dates' | 'details' | 'confirm' | 'success';

export const BerthBookingModal: React.FC<Props> = ({ marina, berth, onClose }) => {
  const { currentUser } = useAuthStore();
  const { createBerthBooking } = useMarinaStore();

  const [step, setStep] = useState<Step>('dates');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [source, setSource] = useState<BookingSource>('online');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [bookingRef, setBookingRef] = useState('');

  const nights = checkIn && checkOut
    ? Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
    : 0;
  const subtotal = nights * berth.dailyRateUsd;
  const platformFee = +(subtotal * 0.08).toFixed(2);
  const total = +(subtotal + platformFee).toFixed(2);

  const today = new Date().toISOString().split('T')[0];

  const handleBook = async () => {
    setIsSubmitting(true);
    const booking = await createBerthBooking({
      marinaId:         marina.id,
      marinaName:       marina.name,
      berthId:          berth.id,
      berthName:        berth.name,
      ownerId:          currentUser?.id,
      ownerName:        currentUser?.name,
      bookingSource:    source,
      guestName:        source !== 'online' ? guestName : undefined,
      guestEmail:       source !== 'online' ? guestEmail : undefined,
      guestPhone:       source !== 'online' ? guestPhone : undefined,
      checkInDate:      checkIn,
      checkOutDate:     checkOut,
      nights,
      rateSnapshotUsd:  berth.dailyRateUsd,
      totalAmountUsd:   total,
      platformFeeAmount: platformFee,
      marinaPayoutAmount: +(subtotal - platformFee).toFixed(2),
      specialRequests,
    });
    setIsSubmitting(false);
    if (booking) {
      setBookingRef(booking.reference);
      setStep('success');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-navy-500 to-ocean-600 p-5 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Anchor size={20} />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg">Book Berth {berth.name}</h2>
              <p className="text-white/70 text-sm">{marina.name}</p>
            </div>
          </div>

          {/* Steps */}
          {step !== 'success' && (
            <div className="flex items-center gap-2 mt-4">
              {(['dates', 'details', 'confirm'] as Step[]).map((s, i) => (
                <React.Fragment key={s}>
                  <div className={clsx(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                    step === s ? 'bg-white text-navy-500' : 'bg-white/20 text-white/60'
                  )}>
                    {i + 1}
                  </div>
                  {i < 2 && <div className="flex-1 h-px bg-white/20" />}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-5">
          {/* ── Step 1: Dates ── */}
          {step === 'dates' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Check-In Date</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      min={today}
                      value={checkIn}
                      onChange={e => { setCheckIn(e.target.value); if (checkOut && e.target.value >= checkOut) setCheckOut(''); }}
                      className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ocean-300"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Check-Out Date</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      min={checkIn || today}
                      value={checkOut}
                      onChange={e => setCheckOut(e.target.value)}
                      className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ocean-300"
                    />
                  </div>
                </div>
              </div>

              {/* Booking source (operator flow) */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Booking Source</label>
                <div className="flex gap-2">
                  {(['online', 'walk_up', 'phone'] as BookingSource[]).map(s => (
                    <button
                      key={s}
                      onClick={() => setSource(s)}
                      className={clsx(
                        'flex-1 text-xs py-2 rounded-lg border font-medium transition-colors',
                        source === s
                          ? 'bg-ocean-500 text-white border-ocean-500'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      )}
                    >
                      {s === 'walk_up' ? 'Walk-Up' : s === 'phone' ? 'Phone' : 'Online'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pricing preview */}
              {nights > 0 && (
                <div className="bg-ocean-50 rounded-xl p-4">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-600">${berth.dailyRateUsd} × {nights} nights</span>
                    <span className="font-medium">${subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-600">Platform fee (8%)</span>
                    <span className="font-medium">${platformFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t border-ocean-100 pt-2 mt-2">
                    <span>Total</span>
                    <span className="text-ocean-700">${total.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <button
                disabled={nights <= 0}
                onClick={() => setStep('details')}
                className="w-full btn-ocean py-3 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          )}

          {/* ── Step 2: Guest Details ── */}
          {step === 'details' && (
            <div className="space-y-4">
              {source !== 'online' ? (
                <>
                  <p className="text-sm text-gray-500">Enter the guest's contact details for the walk-up / phone reservation.</p>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Guest Name *</label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        value={guestName}
                        onChange={e => setGuestName(e.target.value)}
                        placeholder="Captain John Doe"
                        className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ocean-300"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Guest Email</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        value={guestEmail}
                        onChange={e => setGuestEmail(e.target.value)}
                        placeholder="captain@example.com"
                        className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ocean-300"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Guest Phone</label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        value={guestPhone}
                        onChange={e => setGuestPhone(e.target.value)}
                        placeholder="+1 305 555 0000"
                        className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ocean-300"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  Booking as <span className="font-semibold">{currentUser?.name}</span> ({currentUser?.email})
                </p>
              )}

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Special Requests (optional)</label>
                <textarea
                  value={specialRequests}
                  onChange={e => setSpecialRequests(e.target.value)}
                  rows={3}
                  placeholder="Late arrival, power requirements, pet on board…"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ocean-300 resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStep('dates')} className="flex-1 btn-ghost py-2.5 text-sm">Back</button>
                <button
                  disabled={source !== 'online' && !guestName}
                  onClick={() => setStep('confirm')}
                  className="flex-1 btn-ocean py-2.5 text-sm disabled:opacity-40"
                >
                  Review Booking
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Confirm ── */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Berth</span><span className="font-medium">{berth.name} ({berth.lengthFt}ft × {berth.widthFt}ft)</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Check-in</span><span className="font-medium">{checkIn}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Check-out</span><span className="font-medium">{checkOut}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Nights</span><span className="font-medium">{nights}</span></div>
                {source !== 'online' && guestName && (
                  <div className="flex justify-between"><span className="text-gray-500">Guest</span><span className="font-medium">{guestName}</span></div>
                )}
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between font-bold text-navy-500">
                    <span>Total Due</span>
                    <span>${total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
                <CreditCard size={14} className="shrink-0" />
                <span>Payment processed securely via Stripe. Marina receives ${(+(total - platformFee).toFixed(2)).toLocaleString()} after platform fee.</span>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStep('details')} className="flex-1 btn-ghost py-2.5 text-sm">Back</button>
                <button
                  onClick={handleBook}
                  disabled={isSubmitting}
                  className="flex-1 btn-ocean py-2.5 text-sm font-semibold disabled:opacity-60"
                >
                  {isSubmitting ? 'Processing…' : 'Confirm Booking'}
                </button>
              </div>
            </div>
          )}

          {/* ── Success ── */}
          {step === 'success' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={32} className="text-emerald-500" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-navy-500 mb-1">Booking Confirmed!</h3>
                <p className="text-gray-500 text-sm">Your berth is reserved at {marina.name}</p>
              </div>
              <div className="bg-ocean-50 rounded-xl p-4">
                <p className="text-xs text-ocean-600 font-medium mb-1">Booking Reference</p>
                <p className="font-mono font-bold text-navy-500 text-lg">{bookingRef}</p>
              </div>
              <p className="text-xs text-gray-400">
                Confirmation sent to {currentUser?.email || guestEmail || 'your email'}.
                Contact marina on VHF Ch {marina.vhfChannel} upon arrival.
              </p>
              <button onClick={onClose} className="w-full btn-ocean py-2.5 text-sm font-semibold">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
