import React from 'react';
import { Anchor, AlertTriangle, Clock, Wrench, Star, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';
import type { MarinaBerthBooking, MarinaProviderPartnership } from '../../types';

interface OnSiteJob {
  booking: MarinaBerthBooking;
  serviceCategory: string;
  urgency: 'critical' | 'high' | 'medium';
  needLabel: string;
  estimatedBudget?: number;
}

// Generate mock on-site jobs from current CHECKED_IN bookings
const generateOnSiteJobs = (
  bookings: MarinaBerthBooking[],
  partnerships: MarinaProviderPartnership[]
): OnSiteJob[] => {
  const checkedIn = bookings.filter(b => b.status === 'CHECKED_IN');
  const mockNeeds: OnSiteJob[] = [
    {
      booking: checkedIn[0] || bookings[0],
      serviceCategory: 'Engine & Mechanical',
      urgency: 'critical',
      needLabel: 'Main Engine — raw water pump replacement',
      estimatedBudget: 850,
    },
    {
      booking: checkedIn[1] || bookings[0],
      serviceCategory: 'Electrical Systems',
      urgency: 'high',
      needLabel: 'Shore power adapter needed — 50A to 30A',
      estimatedBudget: 120,
    },
    {
      booking: checkedIn[2] || bookings[0],
      serviceCategory: 'Hull & Exterior',
      urgency: 'medium',
      needLabel: 'Hull inspection & antifouling touch-up',
      estimatedBudget: 600,
    },
    {
      booking: checkedIn[0] || bookings[0],
      serviceCategory: 'Electronics & Navigation',
      urgency: 'high',
      needLabel: 'Chart plotter firmware update & GPS calibration',
      estimatedBudget: 280,
    },
  ].filter(j => j.booking);

  // Filter to categories covered by active partnerships
  const partnerCategories = new Set(
    partnerships.filter(p => p.status === 'active').flatMap(p => p.serviceCategories)
  );

  return partnerCategories.size > 0
    ? mockNeeds.filter(j => partnerCategories.has(j.serviceCategory))
    : mockNeeds;
};

const URGENCY_STYLES = {
  critical: { bg: 'bg-red-50',    badge: 'bg-red-100 text-red-700',    label: 'Critical', icon: AlertTriangle },
  high:     { bg: 'bg-amber-50',  badge: 'bg-amber-100 text-amber-700', label: 'High',     icon: Clock },
  medium:   { bg: 'bg-blue-50',   badge: 'bg-blue-100 text-blue-700',   label: 'Medium',   icon: Wrench },
};

interface Props {
  bookings: MarinaBerthBooking[];
  partnerships: MarinaProviderPartnership[];
  providerId?: string;       // if set, show "Express Interest" button
  onExpressInterest?: (job: OnSiteJob) => void;
  expressedInterestJobIds?: Set<string>;
}

export const MarinaJobBoard: React.FC<Props> = ({
  bookings,
  partnerships,
  providerId,
  onExpressInterest,
  expressedInterestJobIds = new Set(),
}) => {
  const jobs = generateOnSiteJobs(bookings, partnerships);

  const activePartnerships = partnerships.filter(p => p.status === 'active');

  if (activePartnerships.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Anchor size={32} className="mx-auto mb-3 text-gray-300" />
        <p className="font-medium text-sm">No active marina partnerships</p>
        <p className="text-xs mt-1">Join a marina's partner network to see on-site jobs</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <CheckCircle size={32} className="mx-auto mb-3 text-gray-300" />
        <p className="font-medium text-sm">No open jobs at this marina right now</p>
        <p className="text-xs mt-1">Check back when vessels are checked in</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm text-gray-500">
            {jobs.length} open job{jobs.length !== 1 ? 's' : ''} from {bookings.filter(b => b.status === 'CHECKED_IN').length} vessels currently on-site
          </p>
        </div>
        <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
          Live feed
        </span>
      </div>

      {jobs.map((job, idx) => {
        const urgencyStyle = URGENCY_STYLES[job.urgency];
        const Icon = urgencyStyle.icon;
        const jobKey = `${job.booking.id}-${job.serviceCategory}`;
        const hasExpressed = expressedInterestJobIds.has(jobKey);

        return (
          <div key={idx} className={clsx('rounded-xl border p-4', urgencyStyle.bg, 'border-transparent')}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                {/* Urgency + category */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={clsx('flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full', urgencyStyle.badge)}>
                    <Icon size={10} />
                    {urgencyStyle.label}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {job.serviceCategory}
                  </span>
                </div>

                {/* Need label */}
                <p className="font-medium text-sm text-navy-500 mb-1">{job.needLabel}</p>

                {/* Vessel info */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Anchor size={10} className="text-ocean-500" />
                  <span>
                    {job.booking.boatName || job.booking.guestName || 'Vessel'} — {job.booking.berthName}
                  </span>
                  {job.booking.checkOutDate && (
                    <>
                      <span>•</span>
                      <span>Departing {job.booking.checkOutDate}</span>
                    </>
                  )}
                </div>

                {/* Partnership badge */}
                <div className="mt-2">
                  {activePartnerships
                    .filter(p => p.serviceCategories.includes(job.serviceCategory))
                    .map(p => (
                      <span key={p.id} className="inline-flex items-center gap-1 text-xs text-ocean-600">
                        <Star size={9} className="fill-amber-400 text-amber-400" />
                        {p.tier === 'exclusive' ? 'Exclusive partner' : 'Preferred partner'} at this marina
                      </span>
                    ))
                  }
                </div>
              </div>

              {/* Right side */}
              <div className="text-right shrink-0">
                {job.estimatedBudget && (
                  <p className="text-sm font-bold text-navy-500 mb-2">
                    ~${job.estimatedBudget.toLocaleString()}
                  </p>
                )}
                {providerId && (
                  <button
                    onClick={() => !hasExpressed && onExpressInterest?.(job)}
                    disabled={hasExpressed}
                    className={clsx(
                      'text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors',
                      hasExpressed
                        ? 'bg-gray-100 text-gray-400 cursor-default'
                        : 'bg-ocean-500 text-white hover:bg-ocean-600'
                    )}
                  >
                    {hasExpressed ? 'Interest Sent' : 'Express Interest'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
