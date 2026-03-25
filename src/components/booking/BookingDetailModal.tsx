import React, { useState } from 'react';
import {
  Calendar, Clock, MapPin, User,
  Ship, CheckCircle, AlertTriangle, XCircle, Star, DollarSign
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { Booking } from '../../types';
import { BOOKING_STATUS_LABELS } from '../../types';
import { useBookingStore } from '../../store/bookingStore';
import { useAuthStore } from '../../store/authStore';

interface Props {
  booking: Booking | null;
  onClose: () => void;
}

const STATUS_BADGE: Record<string, 'gray' | 'ocean' | 'info' | 'teal' | 'attention' | 'good' | 'critical'> = {
  DRAFT: 'gray', PENDING: 'ocean', QUOTED: 'info', CONFIRMED: 'teal',
  IN_PROGRESS: 'attention', COMPLETED: 'good', PAYOUT_RELEASED: 'good',
  CANCELLED: 'critical', DISPUTED: 'critical', REFUNDED: 'gray', RESCHEDULED: 'info',
};

const Row: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
      {icon}
    </div>
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{label}</p>
      <div className="font-medium text-navy-500 text-sm mt-0.5">{value}</div>
    </div>
  </div>
);

export const BookingDetailModal: React.FC<Props> = ({ booking, onClose }) => {
  const { cancelBooking, updateBookingStatus, submitReview, loading } = useBookingStore();
  const { user } = useAuthStore();
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  if (!booking) return null;

  const isOwner = user?.role === 'owner';
  const isProvider = user?.role === 'provider';
  const canCancel = ['PENDING', 'CONFIRMED', 'QUOTED'].includes(booking.status);
  const canConfirm = isProvider && booking.status === 'PENDING';
  const canMarkInProgress = isProvider && booking.status === 'CONFIRMED';
  const canComplete = isProvider && booking.status === 'IN_PROGRESS';
  const canReview = isOwner && booking.status === 'COMPLETED';

  const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(iso).toLocaleDateString('en-US', opts);
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    await cancelBooking(booking.id, cancelReason, isOwner ? 'owner' : 'provider');
    setShowCancel(false);
    onClose();
  };

  const handleReview = async () => {
    if (!user) return;
    await submitReview(booking.id, reviewRating, reviewComment, user.id, booking.providerId);
    setShowReview(false);
    onClose();
  };

  const label = BOOKING_STATUS_LABELS[booking.status] ?? booking.status;
  const variant = STATUS_BADGE[booking.status] ?? 'gray';

  return (
    <Modal isOpen={!!booking} onClose={onClose} title="Booking Details" size="lg">
      <div className="space-y-6">

        {/* Status + Reference */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Badge variant={variant} dot className="text-sm">{label}</Badge>
          <span className="text-xs font-mono text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
            {booking.reference}
          </span>
        </div>

        {/* Service name */}
        <div>
          <h3 className="text-lg font-heading font-bold text-navy-500">{booking.serviceName}</h3>
          <p className="text-sm text-gray-500 capitalize">{booking.serviceType}</p>
        </div>

        {/* Detail grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Row
            icon={<Calendar size={15} className="text-ocean-500" />}
            label="Date"
            value={fmt(booking.scheduledStart, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          />
          <Row
            icon={<Clock size={15} className="text-ocean-500" />}
            label="Time"
            value={`${fmtTime(booking.scheduledStart)} – ${fmtTime(booking.scheduledEnd)} (${booking.durationMinutes} min)`}
          />
          <Row
            icon={<MapPin size={15} className="text-ocean-500" />}
            label="Location"
            value={booking.location}
          />
          <Row
            icon={<Ship size={15} className="text-ocean-500" />}
            label="Vessel"
            value={booking.boatName ?? '—'}
          />
          <Row
            icon={<User size={15} className="text-ocean-500" />}
            label={isOwner ? 'Provider' : 'Owner'}
            value={isOwner ? (booking.providerName ?? '—') : (booking.ownerName ?? '—')}
          />
          <Row
            icon={<DollarSign size={15} className="text-ocean-500" />}
            label="Amount"
            value={
              booking.priceType === 'quote' && !booking.quotedAmount
                ? 'Quote pending'
                : `$${(booking.quotedAmount ?? booking.priceAmount).toLocaleString()} (${booking.priceType})`
            }
          />
        </div>

        {/* Notes */}
        {booking.notes && (
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Notes</p>
            <p className="text-sm text-gray-600 leading-relaxed">{booking.notes}</p>
          </div>
        )}

        {/* Cancellation info */}
        {booking.status === 'CANCELLED' && booking.cancellationReason && (
          <div className="bg-red-50 rounded-xl p-4 border border-red-100">
            <p className="text-xs text-red-400 uppercase tracking-wide font-medium mb-1">Cancellation reason</p>
            <p className="text-sm text-red-700">{booking.cancellationReason}</p>
          </div>
        )}

        {/* Cancel form */}
        {showCancel && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-navy-500">Reason for cancellation</p>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Please briefly explain..."
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500/30 focus:border-ocean-500 resize-none"
            />
            <div className="flex gap-2">
              <Button variant="danger" size="sm" onClick={handleCancel} loading={loading} disabled={!cancelReason.trim()}>
                Confirm Cancel
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowCancel(false)}>Back</Button>
            </div>
          </div>
        )}

        {/* Review form */}
        {showReview && (
          <div className="bg-ocean-50 rounded-xl p-4 space-y-3 border border-ocean-100">
            <p className="text-sm font-medium text-navy-500">Leave a review for {booking.providerName}</p>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setReviewRating(n)}
                  className={`p-1 transition-colors ${n <= reviewRating ? 'text-yellow-400' : 'text-gray-300'}`}
                >
                  <Star size={20} fill={n <= reviewRating ? 'currentColor' : 'none'} />
                </button>
              ))}
              <span className="text-sm text-gray-500 ml-1">{reviewRating}/5</span>
            </div>
            <textarea
              rows={3}
              value={reviewComment}
              onChange={e => setReviewComment(e.target.value)}
              placeholder="Share your experience..."
              className="w-full rounded-xl border border-ocean-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500/30 focus:border-ocean-500 resize-none bg-white"
            />
            <div className="flex gap-2">
              <Button variant="ocean" size="sm" onClick={handleReview} loading={loading}>
                Submit Review
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowReview(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!showCancel && !showReview && (
          <div className="flex flex-wrap gap-3 pt-2">
            {canConfirm && (
              <Button
                variant="ocean"
                icon={<CheckCircle size={15} />}
                onClick={() => updateBookingStatus(booking.id, 'CONFIRMED', { confirmedAt: new Date().toISOString() })}
                loading={loading}
              >
                Confirm Booking
              </Button>
            )}
            {canMarkInProgress && (
              <Button
                variant="outline"
                icon={<AlertTriangle size={15} />}
                onClick={() => updateBookingStatus(booking.id, 'IN_PROGRESS', { startedAt: new Date().toISOString() })}
                loading={loading}
              >
                Mark In Progress
              </Button>
            )}
            {canComplete && (
              <Button
                variant="ocean"
                icon={<CheckCircle size={15} />}
                onClick={() => updateBookingStatus(booking.id, 'COMPLETED', { completedAt: new Date().toISOString() })}
                loading={loading}
              >
                Mark Complete
              </Button>
            )}
            {canReview && (
              <Button
                variant="gold"
                icon={<Star size={15} />}
                onClick={() => setShowReview(true)}
              >
                Leave Review
              </Button>
            )}
            {canCancel && (
              <Button
                variant="danger"
                icon={<XCircle size={15} />}
                onClick={() => setShowCancel(true)}
              >
                Cancel Booking
              </Button>
            )}
            <Button variant="secondary" onClick={onClose} className="ml-auto">Close</Button>
          </div>
        )}

      </div>
    </Modal>
  );
};
