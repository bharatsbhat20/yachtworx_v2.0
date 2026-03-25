import { useState } from 'react';
import { X, Star, MessageSquare, AlertCircle } from 'lucide-react';
import type { ReviewExtended } from '../../types';

interface Props {
  bookingId: string;
  providerId: string;
  providerName: string;
  reviewerId: string;
  reviewerName: string;
  onSubmit: (review: Omit<ReviewExtended, 'id' | 'createdAt'>) => Promise<void>;
  onClose: () => void;
}

interface SubRating { comm: number; quality: number; punctuality: number; }

function StarRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button"
            onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
            onClick={() => onChange(n)}
            className="p-0.5">
            <Star className={`w-5 h-5 transition-colors ${
              n <= (hover || value) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ReviewModal({ bookingId, providerId, providerName, reviewerId, reviewerName, onSubmit, onClose }: Props) {
  const [overall, setOverall] = useState(0);
  const [sub, setSub] = useState<SubRating>({ comm: 0, quality: 0, punctuality: 0 });
  const [comment, setComment] = useState('');
  const [hover, setHover] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  const handleSubmit = async () => {
    if (overall === 0) { setError('Please select an overall rating'); return; }
    setSubmitting(true); setError('');
    try {
      await onSubmit({
        bookingId, providerId, reviewerId, reviewerName,
        rating: overall,
        commRating: sub.comm || undefined,
        qualityRating: sub.quality || undefined,
        punctualityRating: sub.punctuality || undefined,
        comment: comment.trim() || undefined,
        flagged: false,
        isVisible: true,
      });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to submit review. Please try again.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-ocean-600" />
            <h2 className="text-lg font-bold text-gray-900">Leave a Review</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <p className="text-sm text-gray-600">
            How was your experience with <span className="font-semibold text-gray-900">{providerName}</span>?
          </p>

          {/* Overall rating */}
          <div className="text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Overall Rating *</p>
            <div className="flex justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button"
                  onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
                  onClick={() => setOverall(n)}
                  className="p-1">
                  <Star className={`w-10 h-10 transition-all ${
                    n <= (hover || overall) ? 'text-yellow-400 fill-yellow-400 scale-110' : 'text-gray-300'
                  }`} />
                </button>
              ))}
            </div>
            {(hover || overall) > 0 && (
              <p className="text-sm font-medium text-yellow-600">{STAR_LABELS[hover || overall]}</p>
            )}
          </div>

          {/* Sub-ratings */}
          <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Optional Ratings</p>
            <StarRow label="Communication" value={sub.comm} onChange={(v) => setSub((s) => ({ ...s, comm: v }))} />
            <StarRow label="Quality of Work" value={sub.quality} onChange={(v) => setSub((s) => ({ ...s, quality: v }))} />
            <StarRow label="Punctuality" value={sub.punctuality} onChange={(v) => setSub((s) => ({ ...s, punctuality: v }))} />
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Review <span className="text-gray-400">({comment.length}/2000)</span>
            </label>
            <textarea rows={4} maxLength={2000}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 resize-none"
              placeholder="Describe your experience — what went well, what could be improved…"
              value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 pb-5">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || overall === 0}
            className="flex items-center gap-2 px-5 py-2 bg-ocean-600 text-white text-sm font-semibold rounded-lg hover:bg-ocean-700 disabled:opacity-50 transition-colors">
            {submitting ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting…</>
            ) : (
              <><Star className="w-4 h-4" /> Submit Review</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
