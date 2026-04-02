/**
 * MatchCard — provider card with match score, reasons, and Book Now CTA.
 * Module 4: Smart Matching Engine
 */

import React from 'react';
import { MapPin, Clock, Star, CalendarPlus, CheckCircle } from 'lucide-react';
import { MatchBadge } from './MatchBadge';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import type { ServiceProvider, MatchResult, BoatNeed } from '../../types';
import { urgencyColor, urgencyLabel } from '../../utils/matchScore';

interface MatchCardProps {
  provider: ServiceProvider;
  matchResult: MatchResult;
  need: BoatNeed;
  onBook?: (provider: ServiceProvider) => void;
  compact?: boolean;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  provider,
  matchResult,
  need,
  onBook,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3 min-w-[220px]">
        <div className="flex items-start justify-between gap-2">
          <Avatar src={provider.avatar} alt={provider.name} size="md" fallback={provider.name} />
          <MatchBadge score={matchResult.matchScore} band={matchResult.band} size="sm" />
        </div>
        <div>
          <p className="font-semibold text-navy-500 text-sm leading-tight">{provider.name}</p>
          <p className="text-xs text-gray-400">{provider.businessName}</p>
          <p className="text-xs text-gray-400 mt-1 line-clamp-1">{matchResult.matchSummary}</p>
        </div>
        {onBook && (
          <Button variant="ocean" size="sm" fullWidth onClick={() => onBook(provider)}>
            Book Now
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Match score header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <Avatar src={provider.avatar} alt={provider.name} size="lg" fallback={provider.name} />
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-navy-500">{provider.name}</h4>
                {provider.verified && (
                  <CheckCircle size={13} className="text-teal-500 flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-gray-400">{provider.businessName}</p>
            </div>
          </div>
          <MatchBadge score={matchResult.matchScore} band={matchResult.band} size="md" />
        </div>

        {/* Match summary */}
        <p className="text-xs text-gray-500 mb-2">{matchResult.matchSummary}</p>

        {/* Reason chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {matchResult.matchReasons.map((reason, i) => (
            <span
              key={i}
              className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium"
            >
              {reason}
            </span>
          ))}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Star size={11} className="text-gold-500 fill-gold-500" />
            <span className="font-semibold text-navy-500">{provider.rating}</span>
            <span>({provider.reviewCount})</span>
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={11} />
            {provider.distance} mi
          </span>
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {provider.responseTime}
          </span>
        </div>
      </div>

      {/* Need context banner */}
      <div className={`px-5 py-2.5 border-t text-xs font-medium flex items-center gap-2 ${urgencyColor(need.urgencyLevel)}`}>
        <span className="font-semibold">{urgencyLabel(need.urgencyLevel)}</span>
        <span className="text-opacity-80">·</span>
        <span className="truncate">{need.needLabel}</span>
      </div>

      {/* CTA */}
      {onBook && (
        <div className="px-5 py-3 border-t border-gray-50">
          <Button
            variant="ocean"
            fullWidth
            size="sm"
            icon={<CalendarPlus size={14} />}
            onClick={() => onBook(provider)}
          >
            Book Now
          </Button>
        </div>
      )}
    </div>
  );
};
