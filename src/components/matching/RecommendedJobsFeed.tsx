/**
 * RecommendedJobsFeed — provider-side job opportunities ranked by match score.
 * Module 4: Smart Matching Engine
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Ship, MapPin, DollarSign, Calendar, CheckCircle, Clock } from 'lucide-react';
import { MatchBadge } from './MatchBadge';
import { Button } from '../ui/Button';
import type { ProviderJobMatch } from '../../types';
import { urgencyLabel, urgencyBarColor } from '../../utils/matchScore';

type SortMode = 'match' | 'urgency' | 'newest';

interface RecommendedJobsFeedProps {
  providerJobMatches: ProviderJobMatch[];
  isLoading?: boolean;
  expressedInterest: Set<string>;
  onExpressInterest: (opportunityId: string) => void;
}

const URGENCY_ORDER: Record<string, number> = {
  critical: 0, high: 1, medium: 2, low: 3, proactive: 4,
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SkeletonRow: React.FC = () => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse flex gap-4">
    <div className="w-1 rounded-full bg-gray-100 self-stretch" />
    <div className="flex-1 space-y-3">
      <div className="h-4 bg-gray-100 rounded w-48" />
      <div className="h-3 bg-gray-100 rounded w-64" />
      <div className="flex gap-3">
        <div className="h-3 bg-gray-100 rounded w-20" />
        <div className="h-3 bg-gray-100 rounded w-24" />
      </div>
    </div>
    <div className="h-7 bg-gray-100 rounded-full w-24 self-start" />
  </div>
);

// ─── Job Card ─────────────────────────────────────────────────────────────────

const JobCard: React.FC<{
  match: ProviderJobMatch;
  alreadyExpressed: boolean;
  onExpress: () => void;
}> = ({ match, alreadyExpressed, onExpress }) => {
  const { opportunity: opp, matchResult } = match;
  const barColor = urgencyBarColor(opp.urgencyLevel);
  const isExpired = opp.status === 'matched';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex"
    >
      {/* Urgency accent bar */}
      <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: barColor }} />

      <div className="flex-1 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full border"
                style={{ color: barColor, borderColor: barColor, backgroundColor: `${barColor}15` }}>
                {urgencyLabel(opp.urgencyLevel)}
              </span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                {opp.serviceCategory}
              </span>
            </div>
            <h4 className="font-semibold text-navy-500 text-sm leading-snug mb-1">{opp.needLabel}</h4>
            <p className="text-xs text-gray-500 mb-3 line-clamp-1">
              {opp.boatName} · {opp.boatType.replace(/_/g, ' ')}
              {opp.boatLength && ` · ${opp.boatLength}ft`}
            </p>

            {/* Meta row */}
            <div className="flex flex-wrap gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <MapPin size={11} />
                {opp.homePort}
              </span>
              {opp.estimatedBudget && (
                <span className="flex items-center gap-1">
                  <DollarSign size={11} />
                  ~${opp.estimatedBudget.toLocaleString()} est.
                </span>
              )}
              {opp.preferredDates && opp.preferredDates.length > 0 && (
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {new Date(opp.preferredDates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {opp.preferredDates.length > 1 && ` +${opp.preferredDates.length - 1}`}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock size={11} />
                Posted {new Date(opp.postedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>

            {/* Match reasons */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {matchResult.matchReasons.map((r, i) => (
                <span key={i} className="text-xs bg-ocean-50 text-ocean-600 px-2 py-0.5 rounded-full">
                  {r}
                </span>
              ))}
            </div>
          </div>

          {/* Right column: score + CTA */}
          <div className="flex flex-col items-end gap-3 flex-shrink-0">
            <MatchBadge score={matchResult.matchScore} band={matchResult.band} size="md" />

            {alreadyExpressed || isExpired ? (
              <div className="flex items-center gap-1.5 text-xs text-teal-600 font-medium">
                <CheckCircle size={13} />
                {isExpired ? 'Matched' : 'Interest sent'}
              </div>
            ) : (
              <Button
                variant="ocean"
                size="sm"
                onClick={onExpress}
                icon={<Sparkles size={12} />}
              >
                Express Interest
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Main Feed ────────────────────────────────────────────────────────────────

export const RecommendedJobsFeed: React.FC<RecommendedJobsFeedProps> = ({
  providerJobMatches,
  isLoading = false,
  expressedInterest,
  onExpressInterest,
}) => {
  const [sortMode, setSortMode] = useState<SortMode>('match');
  const [successId, setSuccessId] = useState<string | null>(null);

  const sorted = [...providerJobMatches].sort((a, b) => {
    if (sortMode === 'match')   return b.matchResult.matchScore - a.matchResult.matchScore;
    if (sortMode === 'urgency') return URGENCY_ORDER[a.opportunity.urgencyLevel] - URGENCY_ORDER[b.opportunity.urgencyLevel];
    return new Date(b.opportunity.postedAt).getTime() - new Date(a.opportunity.postedAt).getTime();
  });

  const handleExpress = (id: string) => {
    onExpressInterest(id);
    setSuccessId(id);
    setTimeout(() => setSuccessId(null), 3000);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-ocean-500" />
          <div>
            <h2 className="text-lg font-bold text-gray-900">Recommended Jobs</h2>
            <p className="text-xs text-gray-400">Matched to your skills, location &amp; availability</p>
          </div>
        </div>
        {!isLoading && providerJobMatches.length > 0 && (
          <span className="text-sm text-gray-500">
            <strong className="text-navy-500">{providerJobMatches.length}</strong> jobs matched
          </span>
        )}
      </div>

      {/* Sort pills */}
      <div className="flex gap-2">
        {([
          { id: 'match'   as SortMode, label: 'Best Match' },
          { id: 'urgency' as SortMode, label: 'Most Urgent' },
          { id: 'newest'  as SortMode, label: 'Newest' },
        ]).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setSortMode(id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              sortMode === id
                ? 'bg-ocean-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Success toast */}
      <AnimatePresence>
        {successId && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-teal-800"
          >
            <CheckCircle size={16} className="text-teal-500" />
            Interest expressed! The owner will be notified.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feed */}
      <div className="space-y-4">
        {isLoading
          ? [0, 1, 2, 3].map(i => <SkeletonRow key={i} />)
          : sorted.length === 0
            ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <Ship size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="font-medium text-gray-700">No matching jobs right now</p>
                <p className="text-sm text-gray-400 mt-1">
                  Update your service areas or categories to see more opportunities
                </p>
              </div>
            )
            : sorted.map(match => (
              <JobCard
                key={match.opportunity.id}
                match={match}
                alreadyExpressed={expressedInterest.has(match.opportunity.id)}
                onExpress={() => handleExpress(match.opportunity.id)}
              />
            ))
        }
      </div>
    </div>
  );
};
