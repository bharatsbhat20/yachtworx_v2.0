import React from 'react';
import { Shield, Star, Crown, Check, Clock, XCircle, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import type { MarinaProviderPartnership } from '../../types';

const TIER_STYLES = {
  standard:  { bg: 'bg-blue-50',    text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700',   icon: Check,  label: 'On-site Provider' },
  preferred: { bg: 'bg-ocean-50',   text: 'text-ocean-700',  badge: 'bg-ocean-100 text-ocean-700', icon: Star,   label: 'Preferred Partner' },
  exclusive: { bg: 'bg-amber-50',   text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-700', icon: Crown,  label: 'Exclusive Partner' },
};

const STATUS_STYLES = {
  pending:    { bg: 'bg-yellow-50',  text: 'text-yellow-700',  icon: Clock,    label: 'Pending Review' },
  approved:   { bg: 'bg-blue-50',    text: 'text-blue-700',    icon: Clock,    label: 'Awaiting Acceptance' },
  active:     { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: Check,    label: 'Active' },
  rejected:   { bg: 'bg-red-50',     text: 'text-red-700',     icon: XCircle,  label: 'Rejected' },
  suspended:  { bg: 'bg-gray-50',    text: 'text-gray-600',    icon: XCircle,  label: 'Suspended' },
  terminated: { bg: 'bg-gray-50',    text: 'text-gray-500',    icon: XCircle,  label: 'Terminated' },
};

interface Props {
  partnership: MarinaProviderPartnership;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  showActions?: boolean;
}

export const PartnershipCard: React.FC<Props> = ({
  partnership,
  onApprove,
  onReject,
  showActions = false,
}) => {
  const tier = TIER_STYLES[partnership.tier];
  const status = STATUS_STYLES[partnership.status];
  const TierIcon = tier.icon;
  const StatusIcon = status.icon;

  return (
    <div className={clsx(
      'rounded-xl border p-4 transition-all hover:shadow-sm',
      partnership.status === 'active' ? 'border-gray-100 bg-white' : 'border-gray-100 bg-gray-50/50'
    )}>
      <div className="flex items-start justify-between gap-3">
        {/* Left */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-heading font-bold text-sm text-navy-500 truncate">
              {partnership.providerBusinessName}
            </span>
            {/* Tier badge */}
            <span className={clsx('flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full', tier.badge)}>
              <TierIcon size={10} />
              {tier.label}
            </span>
          </div>

          <p className="text-xs text-gray-400 mb-2">{partnership.providerName}</p>

          {/* Categories */}
          <div className="flex flex-wrap gap-1 mb-2">
            {partnership.serviceCategories.map(cat => (
              <span key={cat} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {cat}
              </span>
            ))}
          </div>

          {/* Commission + status */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {partnership.commissionRate > 0 && (
              <span className="text-emerald-600 font-medium">
                {(partnership.commissionRate * 100).toFixed(0)}% commission
              </span>
            )}
            {partnership.commissionRate === 0 && (
              <span className="text-gray-400">No commission</span>
            )}
            <span>•</span>
            <div className={clsx('flex items-center gap-1 font-medium', status.text)}>
              <StatusIcon size={10} />
              {status.label}
            </div>
          </div>
        </div>

        {/* Right — actions or arrow */}
        {showActions && partnership.status === 'pending' ? (
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => onApprove?.(partnership.id)}
              className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-emerald-600 transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => onReject?.(partnership.id)}
              className="text-xs bg-white border border-red-200 text-red-500 px-3 py-1.5 rounded-lg font-medium hover:bg-red-50 transition-colors"
            >
              Reject
            </button>
          </div>
        ) : (
          <ChevronRight size={16} className="text-gray-300 shrink-0 mt-1" />
        )}
      </div>

      {partnership.status === 'active' && partnership.approvedAt && (
        <p className="text-xs text-gray-400 mt-2 border-t border-gray-100 pt-2">
          Active since {new Date(partnership.approvedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
};
