import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, MapPin, Star, Phone, Mail, Globe, Radio,
  Anchor, Zap, Droplets, Fuel, Wifi, ShowerHead, Waves,
  Crown, Shield, CheckCircle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useMarinaStore } from '../store/marinaStore';
import { useAuthStore } from '../store/authStore';
import { BerthGrid } from '../components/marina/BerthGrid';
import { BerthBookingModal } from '../components/marina/BerthBookingModal';
import { PartnershipCard } from '../components/marina/PartnershipCard';
import type { MarinaBerth } from '../types';

const AMENITY_DISPLAY: Record<string, { icon: React.ElementType; label: string }> = {
  fuel:               { icon: Fuel,       label: 'Fuel Dock' },
  electricity_50amp:  { icon: Zap,        label: '50A Shore Power' },
  electricity_30amp:  { icon: Zap,        label: '30A Shore Power' },
  electricity_100amp: { icon: Zap,        label: '100A Shore Power' },
  water:              { icon: Droplets,   label: 'Fresh Water' },
  wifi:               { icon: Wifi,       label: 'High-Speed WiFi' },
  showers:            { icon: ShowerHead, label: 'Showers' },
  laundry:            { icon: CheckCircle,label: 'Laundry' },
  pump_out:           { icon: Waves,      label: 'Pump-Out Station' },
  pool:               { icon: Waves,      label: 'Swimming Pool' },
  restaurant:         { icon: CheckCircle,label: 'On-Site Restaurant' },
  ship_store:         { icon: CheckCircle,label: 'Ship Store' },
  security:           { icon: Shield,     label: '24/7 Security' },
  concierge:          { icon: Crown,      label: 'Concierge Service' },
  helicopter_pad:     { icon: CheckCircle,label: 'Helicopter Pad' },
  yacht_club:         { icon: Anchor,     label: 'Yacht Club' },
  ice:                { icon: CheckCircle,label: 'Ice' },
};

type Tab = 'overview' | 'berths' | 'partners' | 'reviews';

export const MarinaProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuthStore();
  const {
    marinas, berths, partnerships, reviews, isLoading,
    loadMarinas, loadBerths, loadPartnerships, loadReviews,
    selectMarina, selectedMarina,
  } = useMarinaStore();

  const [tab, setTab] = useState<Tab>('overview');
  const [selectedBerth, setSelectedBerth] = useState<MarinaBerth | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    if (marinas.length === 0) loadMarinas();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (id && marinas.length > 0) {
      selectMarina(id);
      loadBerths(id);
      loadPartnerships(id);
      loadReviews(id);
    }
  }, [id, marinas.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const marina = selectedMarina ?? marinas.find(m => m.id === id);

  if (!marina && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 flex items-center justify-center">
        <div className="text-center">
          <Anchor size={40} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Marina not found</p>
          <Link to="/marinas" className="text-ocean-500 text-sm mt-2 block">← Back to Marinas</Link>
        </div>
      </div>
    );
  }

  if (!marina) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-ocean-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const occupancyPct = Math.round(((marina.totalBerths - marina.availableBerths) / marina.totalBerths) * 100);
  const activePartners = partnerships.filter(p => p.status === 'active');

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'berths',   label: 'Berths', count: marina.availableBerths },
    { id: 'partners', label: 'Partners', count: activePartners.length },
    { id: 'reviews',  label: 'Reviews', count: reviews.length },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Photo Gallery */}
      <div className="relative h-72 sm:h-96 bg-gray-900 overflow-hidden">
        <img
          src={marina.photos[photoIdx] || marina.coverPhoto}
          alt={marina.name}
          className="w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

        {/* Nav arrows */}
        {marina.photos.length > 1 && (
          <>
            <button
              onClick={() => setPhotoIdx(i => (i - 1 + marina.photos.length) % marina.photos.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setPhotoIdx(i => (i + 1) % marina.photos.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors"
            >
              <ChevronRight size={18} />
            </button>
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-1.5">
              {marina.photos.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setPhotoIdx(i)}
                  className={clsx('w-1.5 h-1.5 rounded-full cursor-pointer', i === photoIdx ? 'bg-white' : 'bg-white/40')}
                />
              ))}
            </div>
          </>
        )}

        {/* Back button */}
        <Link
          to="/marinas"
          className="absolute top-4 left-4 flex items-center gap-1.5 text-white/80 hover:text-white text-sm bg-black/30 hover:bg-black/50 px-3 py-1.5 rounded-lg transition-colors"
        >
          <ArrowLeft size={14} />
          Back
        </Link>

        {/* Marina name overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="font-heading font-bold text-white text-2xl sm:text-3xl drop-shadow-lg">{marina.name}</h1>
              <div className="flex items-center gap-2 text-white/80 text-sm mt-1">
                <MapPin size={13} />
                <span>{marina.address}, {marina.city}, {marina.state}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                <Star size={14} className="text-amber-400 fill-amber-400" />
                <span className="text-white font-bold text-sm">{marina.rating.toFixed(1)}</span>
                <span className="text-white/70 text-xs">({marina.reviewCount})</span>
              </div>
              <div className={clsx(
                'text-xs font-semibold px-2.5 py-1 rounded-full',
                marina.availableBerths > 20 ? 'bg-emerald-500/80 text-white' :
                marina.availableBerths > 5  ? 'bg-amber-500/80 text-white' :
                'bg-red-500/80 text-white'
              )}>
                {marina.availableBerths} berths available
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick info bar */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap gap-4 text-sm">
          {marina.phone && (
            <a href={`tel:${marina.phone}`} className="flex items-center gap-1.5 text-gray-600 hover:text-ocean-600">
              <Phone size={13} /> {marina.phone}
            </a>
          )}
          {marina.email && (
            <a href={`mailto:${marina.email}`} className="flex items-center gap-1.5 text-gray-600 hover:text-ocean-600">
              <Mail size={13} /> {marina.email}
            </a>
          )}
          {marina.website && (
            <a href={marina.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-gray-600 hover:text-ocean-600">
              <Globe size={13} /> Website
            </a>
          )}
          {marina.vhfChannel && (
            <span className="flex items-center gap-1.5 text-gray-600">
              <Radio size={13} /> VHF Ch {marina.vhfChannel}
            </span>
          )}
          <span className="text-gray-400">|</span>
          <span className="text-gray-600">
            Max {marina.maxVesselLengthFt}ft · Draft {marina.maxDraftFt}ft · From ${marina.dailyRateUsd}/ft/day
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  'flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors',
                  tab === t.id
                    ? 'border-ocean-500 text-ocean-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                {t.label}
                {t.count !== undefined && (
                  <span className={clsx(
                    'text-xs px-1.5 py-0.5 rounded-full font-semibold',
                    tab === t.id ? 'bg-ocean-100 text-ocean-600' : 'bg-gray-100 text-gray-500'
                  )}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* ── Overview ── */}
        {tab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left */}
              <div className="lg:col-span-2 space-y-6">
                {/* Description */}
                <div>
                  <h2 className="font-heading font-bold text-navy-500 text-lg mb-3">About</h2>
                  <p className="text-gray-600 leading-relaxed">{marina.description}</p>
                </div>

                {/* Amenities */}
                <div>
                  <h2 className="font-heading font-bold text-navy-500 text-lg mb-3">Amenities</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {marina.amenities.map(amenity => {
                      const info = AMENITY_DISPLAY[amenity];
                      if (!info) return null;
                      const Icon = info.icon;
                      return (
                        <div key={amenity} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2">
                          <Icon size={14} className="text-ocean-500 shrink-0" />
                          <span>{info.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Active Partners preview */}
                {activePartners.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-heading font-bold text-navy-500 text-lg">Preferred Service Providers</h2>
                      <button onClick={() => setTab('partners')} className="text-sm text-ocean-500 hover:text-ocean-600 font-medium">
                        View all ({activePartners.length})
                      </button>
                    </div>
                    <div className="space-y-2">
                      {activePartners.slice(0, 3).map(p => (
                        <PartnershipCard key={p.id} partnership={p} showActions={false} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right — booking CTA */}
              <div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-32">
                  <div className="text-center mb-4">
                    <p className="text-2xl font-bold text-navy-500">
                      ${marina.dailyRateUsd}<span className="text-sm font-normal text-gray-400">/ft/day</span>
                    </p>
                    {marina.weeklyRateUsd && (
                      <p className="text-sm text-gray-400">${marina.weeklyRateUsd}/ft/week · ${marina.monthlyRateUsd}/ft/month</p>
                    )}
                  </div>

                  {/* Occupancy bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Current Occupancy</span>
                      <span>{occupancyPct}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={clsx(
                          'h-full rounded-full transition-all',
                          occupancyPct >= 90 ? 'bg-red-400' :
                          occupancyPct >= 70 ? 'bg-amber-400' :
                          'bg-emerald-400'
                        )}
                        style={{ width: `${occupancyPct}%` }}
                      />
                    </div>
                    <p className="text-xs text-emerald-600 mt-1 font-medium">
                      {marina.availableBerths} berths available now
                    </p>
                  </div>

                  <button
                    onClick={() => setTab('berths')}
                    className="w-full btn-ocean py-3 text-sm font-semibold"
                  >
                    Browse Available Berths
                  </button>

                  <p className="text-center text-xs text-gray-400 mt-3">
                    Contact: {marina.phone || marina.email}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Berths ── */}
        {tab === 'berths' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-navy-500 text-lg">Berth Availability</h2>
              <p className="text-sm text-gray-400">{marina.availableBerths} of {marina.totalBerths} available</p>
            </div>
            <BerthGrid
              berths={berths}
              selectedBerthId={selectedBerth?.id}
              onSelectBerth={setSelectedBerth}
            />
            {selectedBerth && (
              <div className="mt-6 p-4 bg-ocean-50 border border-ocean-100 rounded-xl flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-navy-500">Berth {selectedBerth.name} selected</p>
                  <p className="text-sm text-gray-500">{selectedBerth.lengthFt}ft × {selectedBerth.widthFt}ft · ${selectedBerth.dailyRateUsd}/day</p>
                </div>
                <button
                  onClick={() => { /* open booking modal */ }}
                  className="btn-ocean text-sm py-2 px-6"
                  // We open the modal via state
                >
                  Book Now
                </button>
              </div>
            )}
            {selectedBerth && (
              <BerthBookingModal
                marina={marina}
                berth={selectedBerth}
                onClose={() => setSelectedBerth(null)}
              />
            )}
          </motion.div>
        )}

        {/* ── Partners ── */}
        {tab === 'partners' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-navy-500 text-lg">Service Provider Network</h2>
              <span className="text-sm text-gray-400">{partnerships.length} total</span>
            </div>
            {partnerships.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Shield size={32} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No partner providers yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {partnerships.map(p => (
                  <PartnershipCard key={p.id} partnership={p} showActions={false} />
                ))}
              </div>
            )}

            {/* Provider CTA */}
            {currentUser?.role === 'provider' && (
              <div className="mt-8 bg-gradient-to-br from-navy-50 to-ocean-50 border border-ocean-100 rounded-2xl p-6 text-center">
                <Shield size={28} className="text-ocean-500 mx-auto mb-2" />
                <h3 className="font-heading font-bold text-navy-500 mb-1">Join This Marina's Network</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Apply for preferred or exclusive partner status to receive on-site service leads and marina-sourced jobs.
                </p>
                <button className="btn-ocean text-sm px-6 py-2">Apply for Partnership</button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Reviews ── */}
        {tab === 'reviews' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-navy-500 text-lg">Guest Reviews</h2>
              <div className="flex items-center gap-1.5">
                <Star size={16} className="text-amber-400 fill-amber-400" />
                <span className="font-bold text-gray-700">{marina.rating.toFixed(1)}</span>
                <span className="text-gray-400 text-sm">({marina.reviewCount} reviews)</span>
              </div>
            </div>
            {reviews.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Star size={32} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No reviews yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map(review => (
                  <div key={review.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-semibold text-navy-500 text-sm">{review.reviewerName}</p>
                        <p className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(i => (
                          <Star key={i} size={13} className={clsx(
                            i <= review.overallRating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'
                          )} />
                        ))}
                      </div>
                    </div>

                    {/* Sub-ratings */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs text-gray-500">
                      {[
                        { label: 'Berth Quality', val: review.berthQualityRating },
                        { label: 'Amenities',     val: review.amenitiesRating },
                        { label: 'Staff',         val: review.staffRating },
                        { label: 'Value',         val: review.valueRating },
                      ].map(r => (
                        <div key={r.label} className="bg-gray-50 rounded-lg p-2 text-center">
                          <p className="font-bold text-navy-500 text-sm">{r.val.toFixed(0)}/5</p>
                          <p>{r.label}</p>
                        </div>
                      ))}
                    </div>

                    <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>

                    {review.ownerReply && (
                      <div className="mt-3 pl-4 border-l-2 border-ocean-200 bg-ocean-50 rounded-r-lg p-3">
                        <p className="text-xs font-medium text-ocean-700 mb-1">Marina Response</p>
                        <p className="text-sm text-gray-600">{review.ownerReply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};
