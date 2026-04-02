/**
 * MatchedProviderPanel — shows top matched providers for a single boat need.
 * Used on OwnerDashboard and BoatProfile Smart Matches tab.
 * Module 4: Smart Matching Engine
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronDown, ChevronUp, ArrowRight, Info } from 'lucide-react';
import { MatchCard } from './MatchCard';
import { BookingWizard } from '../booking/BookingWizard';
import { useMatchStore } from '../../store/matchStore';
import { mockProviders } from '../../data/mockData';
import { urgencyColor, urgencyLabel } from '../../utils/matchScore';
import type { BoatNeed } from '../../types';
import type { ServiceProvider } from '../../types';

interface MatchedProviderPanelProps {
  need: BoatNeed;
  defaultOpen?: boolean;
  showViewAll?: boolean;
}

// Skeleton loader for loading state
const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
    <div className="flex items-start gap-3 mb-4">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex-shrink-0" />
      <div className="flex-1">
        <div className="h-4 bg-gray-100 rounded w-32 mb-2" />
        <div className="h-3 bg-gray-100 rounded w-24" />
      </div>
      <div className="h-6 bg-gray-100 rounded-full w-24" />
    </div>
    <div className="flex gap-1.5 mb-3">
      <div className="h-5 bg-gray-100 rounded-full w-20" />
      <div className="h-5 bg-gray-100 rounded-full w-24" />
    </div>
    <div className="h-3 bg-gray-100 rounded w-full" />
  </div>
);

// "Why these?" tooltip
const WhyTheseTip: React.FC = () => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setShow(!show)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        <Info size={12} />
        Why these?
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute right-0 top-6 w-64 bg-white rounded-xl border border-gray-200 shadow-lg p-3 z-20 text-xs text-gray-600 leading-relaxed"
          >
            <p className="font-semibold text-navy-500 mb-1">Match Score Factors</p>
            <ul className="space-y-1">
              <li>• <strong>Category match</strong> (30%) — specialist in this service</li>
              <li>• <strong>Proximity</strong> (20%) — distance from your boat</li>
              <li>• <strong>Trust score</strong> (20%) — verified, rated, reliable</li>
              <li>• <strong>Urgency fit</strong> (15%) — can respond in time</li>
              <li>• <strong>Boat type</strong> (10%) — experience with your vessel</li>
              <li>• <strong>Availability</strong> (5%) — open slots near-term</li>
            </ul>
            <button
              onClick={() => setShow(false)}
              className="mt-2 text-ocean-500 hover:underline"
            >
              Got it
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const MatchedProviderPanel: React.FC<MatchedProviderPanelProps> = ({
  need,
  defaultOpen = true,
  showViewAll = true,
}) => {
  const { getTopProvidersForNeed, isComputing } = useMatchStore();
  const [open, setOpen] = useState(defaultOpen);
  const [bookingProvider, setBookingProvider] = useState<ServiceProvider | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  const topMatches = getTopProvidersForNeed(need.id, 3);

  const urgencyColorClasses = urgencyColor(need.urgencyLevel);
  const urgencyText = urgencyLabel(need.urgencyLevel);

  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 overflow-hidden">
      {/* Panel header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-ocean-100 rounded-lg">
            <Sparkles size={15} className="text-ocean-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-navy-500">Smart Matches</p>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{need.needLabel}</p>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${urgencyColorClasses}`}>
            {urgencyText}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <WhyTheseTip />
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">
              {/* Booking success banner */}
              {bookingSuccess && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-4 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 text-sm text-teal-800"
                >
                  ✓ Booking submitted — ref: <span className="font-mono font-bold">{bookingSuccess}</span>
                </motion.div>
              )}

              {/* Provider cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-1">
                {isComputing
                  ? [0, 1, 2].map(i => <SkeletonCard key={i} />)
                  : topMatches.length === 0
                    ? (
                      <div className="col-span-3 text-center py-8 text-sm text-gray-400">
                        No strong matches found — try updating filters or broadening your service area.
                      </div>
                    )
                    : topMatches.map(result => {
                        const provider = mockProviders.find(p => p.id === result.providerId);
                        if (!provider) return null;
                        return (
                          <MatchCard
                            key={result.providerId}
                            provider={provider}
                            matchResult={result}
                            need={need}
                            onBook={setBookingProvider}
                          />
                        );
                      })
                }
              </div>

              {/* Footer link */}
              {showViewAll && !isComputing && topMatches.length > 0 && (
                <div className="mt-4 text-center">
                  <a
                    href={`/marketplace?category=${encodeURIComponent(need.serviceCategory)}`}
                    className="inline-flex items-center gap-1.5 text-xs text-ocean-500 hover:text-ocean-600 font-medium"
                  >
                    View all {need.serviceCategory} providers <ArrowRight size={12} />
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booking wizard */}
      {bookingProvider && (
        <BookingWizard
          provider={bookingProvider}
          isOpen={!!bookingProvider}
          onClose={() => setBookingProvider(null)}
          onSuccess={(ref) => { setBookingProvider(null); setBookingSuccess(ref); }}
        />
      )}
    </div>
  );
};
