/**
 * Service Requests / Bookings page — Module 2
 *
 * Full booking pipeline view with kanban columns,
 * status filtering, and detail modal.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Clock, CheckCircle, AlertTriangle, X,
  Anchor, RefreshCw, DollarSign, FileText
} from 'lucide-react';
import { useBookingStore } from '../store/bookingStore';
import { useAuthStore } from '../store/authStore';
import { BookingCard } from '../components/booking/BookingCard';
import { BookingDetailModal } from '../components/booking/BookingDetailModal';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { Booking, BookingStatus } from '../types';
import { BOOKING_STATUS_LABELS } from '../types';

// ─── Column config ─────────────────────────────────────────────────────────────

interface Column {
  id: BookingStatus;
  label: string;
  icon: React.ElementType;
  badge: 'gray' | 'ocean' | 'info' | 'teal' | 'attention' | 'good' | 'critical';
}

const OWNER_COLUMNS: Column[] = [
  { id: 'PENDING',     label: 'Pending',     icon: Clock,         badge: 'ocean' },
  { id: 'CONFIRMED',   label: 'Confirmed',   icon: CheckCircle,   badge: 'teal' },
  { id: 'IN_PROGRESS', label: 'In Progress', icon: AlertTriangle, badge: 'attention' },
  { id: 'COMPLETED',   label: 'Completed',   icon: CheckCircle,   badge: 'good' },
  { id: 'CANCELLED',   label: 'Cancelled',   icon: X,             badge: 'critical' },
];

const PROVIDER_COLUMNS: Column[] = [
  { id: 'PENDING',     label: 'Incoming',    icon: Anchor,        badge: 'ocean' },
  { id: 'CONFIRMED',   label: 'Confirmed',   icon: CheckCircle,   badge: 'teal' },
  { id: 'IN_PROGRESS', label: 'In Progress', icon: AlertTriangle, badge: 'attention' },
  { id: 'COMPLETED',   label: 'Completed',   icon: DollarSign,    badge: 'good' },
  { id: 'CANCELLED',   label: 'Cancelled',   icon: X,             badge: 'critical' },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export const ServiceRequests: React.FC = () => {
  const { user } = useAuthStore();
  const { bookings, loading, error, fetchBookings } = useBookingStore();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'ALL'>('ALL');

  const isProvider = user?.role === 'provider';
  const columns = isProvider ? PROVIDER_COLUMNS : OWNER_COLUMNS;

  useEffect(() => {
    if (user) fetchBookings(user.id, isProvider ? 'provider' : 'owner');
  }, [user?.id]);

  const getByStatus = (status: BookingStatus) =>
    bookings.filter(b => b.status === status);

  const filteredBookings = statusFilter === 'ALL'
    ? bookings
    : bookings.filter(b => b.status === statusFilter);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalValue = bookings
    .filter(b => ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'PAYOUT_RELEASED'].includes(b.status))
    .reduce((sum, b) => sum + (b.quotedAmount ?? b.priceAmount), 0);

  const pendingCount = getByStatus('PENDING').length;
  const activeCount  = getByStatus('IN_PROGRESS').length + getByStatus('CONFIRMED').length;

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-heading font-bold text-navy-500"
            >
              {isProvider ? 'Job Pipeline' : 'My Bookings'}
            </motion.h1>
            <p className="text-gray-500 mt-1">
              {isProvider
                ? 'Manage all incoming and active service jobs'
                : 'Track all your service bookings in one place'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              icon={<RefreshCw size={14} />}
              onClick={() => user && fetchBookings(user.id, isProvider ? 'provider' : 'owner')}
              loading={loading}
            >
              Refresh
            </Button>
            {!isProvider && (
              <Button
                variant="ocean"
                icon={<Plus size={16} />}
                onClick={() => window.location.href = '/marketplace'}
              >
                New Booking
              </Button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
            <X size={15} /> {error}
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Card padding="sm" className="text-center">
            <p className="text-2xl font-heading font-bold text-navy-500">{bookings.length}</p>
            <p className="text-xs text-gray-500 mt-1">Total Bookings</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-2xl font-heading font-bold text-ocean-500">{pendingCount}</p>
            <p className="text-xs text-gray-500 mt-1">Pending</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-2xl font-heading font-bold text-teal-500">{activeCount}</p>
            <p className="text-xs text-gray-500 mt-1">Active</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-2xl font-heading font-bold text-navy-500">
              ${totalValue >= 1000 ? `${(totalValue / 1000).toFixed(1)}k` : totalValue.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {isProvider ? 'Revenue' : 'Total Spend'}
            </p>
          </Card>
        </div>

        {/* Status filter (mobile-friendly pill row) */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-navy-500 text-white border-navy-500'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
          >
            All ({bookings.length})
          </button>
          {columns.map(col => {
            const count = getByStatus(col.id).length;
            return (
              <button
                key={col.id}
                onClick={() => setStatusFilter(col.id)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  statusFilter === col.id
                    ? 'bg-navy-500 text-white border-navy-500'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                {col.label} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>

        {/* Loading skeleton */}
        {loading && bookings.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl h-48 animate-pulse border border-gray-100" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && bookings.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-ocean-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText size={28} className="text-ocean-400" />
            </div>
            <h3 className="text-lg font-heading font-semibold text-navy-500 mb-2">No bookings yet</h3>
            <p className="text-gray-400 text-sm mb-6">
              {isProvider
                ? 'New booking requests will appear here.'
                : 'Head to the marketplace to book your first service.'}
            </p>
            {!isProvider && (
              <Button variant="ocean" onClick={() => window.location.href = '/marketplace'}>
                Browse Marketplace
              </Button>
            )}
          </div>
        )}

        {/* Kanban view (ALL filter) */}
        {!loading && bookings.length > 0 && statusFilter === 'ALL' && (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {columns.map(col => {
                const colBookings = getByStatus(col.id);
                return (
                  <div key={col.id} className="w-72 flex-shrink-0">
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <col.icon size={14} className="text-gray-400" />
                      <h3 className="font-heading font-semibold text-navy-500 text-sm">{col.label}</h3>
                      <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">
                        {colBookings.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {colBookings.map((bk, i) => (
                        <BookingCard
                          key={bk.id}
                          booking={bk}
                          index={i}
                          onClick={() => setSelectedBooking(bk)}
                        />
                      ))}
                      {colBookings.length === 0 && (
                        <div className="bg-gray-50 rounded-2xl p-6 text-center border-2 border-dashed border-gray-200">
                          <p className="text-xs text-gray-400">None</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filtered list view */}
        {!loading && bookings.length > 0 && statusFilter !== 'ALL' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBookings.length === 0 ? (
              <div className="col-span-3 text-center py-12 text-gray-400 text-sm">
                No bookings with status "{BOOKING_STATUS_LABELS[statusFilter as BookingStatus]}"
              </div>
            ) : (
              filteredBookings.map((bk, i) => (
                <BookingCard
                  key={bk.id}
                  booking={bk}
                  index={i}
                  onClick={() => setSelectedBooking(bk)}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Detail modal */}
      <BookingDetailModal
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />
    </div>
  );
};
