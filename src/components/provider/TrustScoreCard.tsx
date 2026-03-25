import { Shield, TrendingUp, Star, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import type { ProviderProfile, TrustScoreLog } from '../../types';

interface Props {
  profile: ProviderProfile;
  latestLog?: TrustScoreLog;
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-28 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-8 text-right">{value.toFixed(0)}</span>
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score >= 85) return 'text-teal-600';
  if (score >= 70) return 'text-ocean-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-500';
}

function getScoreBg(score: number): string {
  if (score >= 85) return 'bg-teal-500';
  if (score >= 70) return 'bg-ocean-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

function getScoreRing(score: number): string {
  if (score >= 85) return 'ring-teal-400';
  if (score >= 70) return 'ring-ocean-400';
  if (score >= 50) return 'ring-amber-400';
  return 'ring-red-400';
}

export default function TrustScoreCard({ profile, latestLog }: Props) {
  const score = profile.trustScore ?? 50;
  const scoreColor = getScoreColor(score);
  const scoreBg = getScoreBg(score);
  const scoreRing = getScoreRing(score);

  const components = latestLog ? [
    { label: 'Rating (40%)',        value: latestLog.compRating ?? 0,       color: 'bg-yellow-400' },
    { label: 'Completion (20%)',    value: latestLog.compCompletion ?? 0,   color: 'bg-teal-400' },
    { label: 'Cancellation (15%)',  value: latestLog.compCancellation ?? 0, color: 'bg-orange-400' },
    { label: 'Insurance (10%)',     value: latestLog.compInsurance ?? 0,    color: 'bg-blue-400' },
    { label: 'Licence (10%)',       value: latestLog.compLicense ?? 0,      color: 'bg-purple-400' },
    { label: 'Response (5%)',       value: latestLog.compResponse ?? 0,     color: 'bg-pink-400' },
  ] : [];

  const scoreLabel =
    score >= 85 ? 'Excellent' :
    score >= 70 ? 'Good' :
    score >= 50 ? 'Fair' : 'Needs Improvement';

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center gap-2">
        <Shield className="w-4 h-4 text-ocean-600" />
        <h3 className="font-semibold text-gray-900">Trust Score</h3>
        {profile.trustScoreOverride && (
          <span className="ml-auto px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">Admin Override</span>
        )}
      </div>

      <div className="p-5">
        {/* Big score display */}
        <div className="flex items-center gap-5 mb-5">
          <div className={`w-20 h-20 rounded-full ring-4 ${scoreRing} flex items-center justify-center bg-white shadow-md`}>
            <div className="text-center">
              <div className={`text-2xl font-bold ${scoreColor}`}>{score.toFixed(0)}</div>
              <div className="text-xs text-gray-400">/ 100</div>
            </div>
          </div>
          <div>
            <div className={`text-lg font-bold ${scoreColor}`}>{scoreLabel}</div>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                {profile.avgRating?.toFixed(1) ?? '—'} ({profile.reviewCount} reviews)
              </div>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-500">
                {latestLog ? `Updated ${new Date(latestLog.computedAt).toLocaleDateString()}` : 'Not yet computed'}
              </span>
            </div>
          </div>
        </div>

        {/* Component breakdown */}
        {components.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Score Breakdown</p>
            {components.map(({ label, value, color }) => (
              <ScoreBar key={label} label={label} value={value} color={color} />
            ))}
          </div>
        )}

        {components.length === 0 && (
          <div className="text-center py-4">
            <div className="text-sm text-gray-400">Score breakdown available after first nightly computation</div>
          </div>
        )}

        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-gray-100">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-teal-600 mb-0.5">
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
            <div className="text-sm font-bold text-gray-800">{profile.completionRate?.toFixed(0) ?? '—'}%</div>
            <div className="text-xs text-gray-400">Completion</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-orange-500 mb-0.5">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div className="text-sm font-bold text-gray-800">{profile.cancellationRate?.toFixed(0) ?? '—'}%</div>
            <div className="text-xs text-gray-400">Cancellation</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-ocean-500 mb-0.5">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div className="text-sm font-bold text-gray-800">
              {profile.avgResponseHours != null ? `${profile.avgResponseHours.toFixed(1)}h` : '—'}
            </div>
            <div className="text-xs text-gray-400">Avg Response</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${scoreBg}`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
