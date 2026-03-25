import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, User, Hash } from 'lucide-react';
import { Badge } from '../ui/Badge';
import type { Booking } from '../../types';
import { BOOKING_STATUS_LABELS } from '../../types';

interface Props {
  booking: Booking;
  onClick?: () => void;
  index?: number;
}

// Map our status color names to Badge variant names
const STATUS_BADGE: Record<string, 'gray' | 'ocean' | 'info' | 'teal' | 'attention' | 'good' | 'critical'> = {
  DRAFT: 'gray',
  PENDING: 'ocean',
  QUOTED: 'info',
  CONFIRMED: 'teal',
  IN_PROGRESS: 'attention',
  COMPLETED: 'good',
  PAYOUT_RELEASED: 'good',
  CANCELLED: 'critical',
  DISPUTED: 'critical',
  REFUNDED: 'gray',
  RESCHEDULED: 'info',
};

export const BookingCard: React.FC<Props> = ({ booking, onClick, index = 0 }) => {
  const badgeVariant = STATUS_BADGE[booking.status] ?? 'gray';
  const label = BOOKING_STATUS_LABELS[booking.status] ?? booking.status;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={onClick}
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h4 className="font-heading font-semibold text-navy-500 text-sm leading-snug truncate">
            {booking.serviceName}
          </h4>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <Hash size={10} />
            {booking.reference}
          </p>
        </div>
        <Badge variant={badgeVariant} dot className="flex-shrink-0 text-xs">
          {label}
        </Badge>
      </div>

      {/* Meta */}
      <div className="space-y-1.5 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <Calendar size={12} className="text-gray-400 flex-shrink-0" />
          <span>{formatDate(booking.scheduledStart)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={12} className="text-gray-400 flex-shrink-0" />
          <span>{formatTime(booking.scheduledStart)} — {formatTime(booking.scheduledEnd)}</span>
          <span className="text-gray-300">·</span>
          <span>{booking.durationMinutes}min</span>
        </div>
        {booking.location && (
          <div className="flex items-center gap-1.5">
            <MapPin size={12} className="text-gray-400 flex-shrink-0" />
            <span className="truncate">{booking.location}</span>
          </div>
        )}
        {booking.providerName && (
          <div className="flex items-center gap-1.5">
            <User size={12} className="text-gray-400 flex-shrink-0" />
            <span>{booking.providerName}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
        <span className="text-xs text-gray-400">{booking.boatName}</span>
        <div className="text-right">
          {booking.priceType === 'quote' && !booking.quotedAmount ? (
            <span className="text-xs text-ocean-500 font-medium">Quote pending</span>
          ) : (
            <span className="text-sm font-heading font-bold text-navy-500">
              ${(booking.quotedAmount ?? booking.priceAmount).toLocaleString()}
            </span>
          )}
          <p className="text-xs text-gray-400 capitalize">{booking.priceType}</p>
        </div>
      </div>
    </motion.div>
  );
};
