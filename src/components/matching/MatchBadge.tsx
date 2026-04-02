/**
 * MatchBadge — displays a match score with colour-coded band.
 * Module 4: Smart Matching Engine
 */

import React from 'react';
import { Zap } from 'lucide-react';
import type { MatchScoreBand } from '../../types';

interface MatchBadgeProps {
  score: number;
  band: MatchScoreBand;
  size?: 'sm' | 'md';
  showLabel?: boolean; // show band label instead of percentage
}

const BAND_STYLES: Record<MatchScoreBand, { bg: string; text: string; border: string }> = {
  best:  { bg: 'bg-teal-500',  text: 'text-white',       border: 'border-teal-500' },
  great: { bg: 'bg-teal-50',   text: 'text-teal-700',    border: 'border-teal-200' },
  good:  { bg: 'bg-ocean-50',  text: 'text-ocean-700',   border: 'border-ocean-200' },
  fair:  { bg: 'bg-gold-50',   text: 'text-gold-700',    border: 'border-gold-200' },
};

const BAND_LABELS: Record<MatchScoreBand, string> = {
  best:  'Best Match',
  great: 'Great Match',
  good:  'Good Match',
  fair:  'Fair Match',
};

export const MatchBadge: React.FC<MatchBadgeProps> = ({
  score,
  band,
  size = 'sm',
  showLabel = false,
}) => {
  const styles = BAND_STYLES[band];
  const isBest = band === 'best';

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-0.5 gap-1'
    : 'text-sm px-3 py-1 gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${styles.bg} ${styles.text} ${styles.border} ${sizeClasses}`}
      aria-label={`Match score: ${score} out of 100`}
    >
      {isBest && <Zap size={size === 'sm' ? 10 : 12} className="fill-current" />}
      {showLabel ? BAND_LABELS[band] : `${score}% Match`}
    </span>
  );
};
