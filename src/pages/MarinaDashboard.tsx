import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Anchor, LayoutDashboard, Ship, Users, BarChart3, Shield,
  TrendingUp, TrendingDown, Star, MapPin, Clock, CheckCircle,
  XCircle, AlertTriangle, ChevronRight, Building2, Zap, Waves,
  ArrowUpRight, Plus, Radio,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { clsx } from 'clsx';
import { useMarinaStore } from '../store/marinaStore';
import { useAuthStore } from '../store/authStore';
import { isDemoMode } from '../lib/supabase';
import { PartnershipCard } from '../components/marina/PartnershipCard';
import { MarinaJobBoard } from '../components/marina/MarinaJobBoard';
import { BerthGrid } from '../components/marina/BerthGrid';
import type { Marina } from '../types';

type Tab = 'overview' | 'berths' | 'bookings' | 'partnerships' | 'analytics' | 'job-board';

const FLEET_COLORS = ['#0ea5e9', '#6366f1', '#f59e0b', '#10b981', '#f43f5e'];
const SERVICE_COLORS = ['#0ea5e9', '#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6'];

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:     { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Pending' },
  CONFIRMED:   { bg: 'bg-blue-50',   text: 'text-blue-700',   label: 'Confirmed' },
  CHECKED_IN:  { bg: 'bg-emerald-50',text: 'text-emerald-700',label: 'Checked In' },
  CHECKED_OUT: { bg: 'bg-gray-50',   text: 'text-gray-600',   label: 'Checked Out' },
  CANCELLED:   { bg: 'bg-red-50',    text: 'text-red-600',    label: 'Cancelled' },
  NO_SHOW:     { bg: 'bg-gray-50',   text: 'text-gray-500',   label: 'No Show' },
};

const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  trend?: number;
  color?: string;
}> = ({ icon: Icon, label, value, sub, trend, color = 'text-ocean-500' }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
    <div className="flex items-start justify-between mb-3">
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50', color)}>
        <Icon size={18} />
      </div>
      {trend !== undefined && (
        <div className={clsx('flex items-center gap-1 text-xs font-medium', trend >= 0 ? 'text-emerald-600' : 'text-red-500')}>
          {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </div>
    <p className="text-2xl font-heading font-bold text-navy-500">{value}</p>
    <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

export const MarinaDashboard: React.FC = () => {
  const { currentUser } = useAuthStore();
  const {
    marinas, berths, berthBookings, partnerships, reviews, analytics,
    isLoading,
    loadMarinas, loadBerths, loadBerthBookings, loadPartnerships, loadReviews, loadAnalytics,
    updateBookingStatus, updatePartnershipStatus,
    getMarinasByOwner,
  } = useMarinaStore();

  const [tab, setTab] = useState<Tab>('overview');
  const [selectedMarinaId, setSelectedMarinaId] = useState<string>('marina-1');
  const [expressedJobIds, setExpressedJobIds] = useState<Set<string>>(new Set());

  const myMarinas = isDemoMode
    ? marinas.filter(m => m.ownerId === 'marina-owner-1')
    : getMarinasByOwner(currentUser?.id ?? '');

  const marina: Marina | undefined = marinas.find(m => m.id === selectedMarinaId) ?? myMarinas[0];
  const marinaAnalytics = analytics[selectedMarinaId];

  // Load data
  useEffect(() => {
    if (marinas.length === 0) loadMarinas();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedMarinaId) return;
    loadBerths(selectedMarinaId);
      loadBerthBookings(selectedMarinaId);
    loadPartnerships(selectedMarinaId);
    loadReviews(selectedMarinaId);
    loadAnalytics(selectedMarinaId);
  }, [selectedMarinaId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update selected when marinas load
  useEffect(() => {
    if (marinas.length > 0 && !selectedMarinaId) {
      setSelectedMarinaId(marinas[0].id);
    }
  }, [marinas.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkedInBookings = berthBookings.filter(b => b.status === 'CHECKED_IN');
  const pendingBookings   = berthBookings.filter(b => b.status === 'PENDING' || b.status === 'CONFIRMED');
  const pendingPartnerships = partnerships.filter(p => p.status === 'pending');

  const TABS: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'overview',      label: 'Overview',      icon: LayoutDashboard },
    { id: 'berths',        label: 'Berths',         icon: Anchor,   badge: marina?.availableBerths },
    { id: 'bookings',      label: 'Bookings',       icon: Ship,     badge: pendingBookings.length || undefined },
    { id: 'partnerships',  label: 'Partners',       icon: Shield,   badge: pendingPartnerships.length || undefined },
    { id: 'analytics',     label: 'Analytics',      icon: BarChart3 },
    { id: 'job-board',     label: 'Job Board',      icon: Zap },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-navy-500 via-navy-600 to-ocean-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-ocean-300 text-xs font-medium mb-1.5">
                <Building2 size={12} />
                <span>Marina Dashboard</span>
              </div>
              <h1 className="font-heading font-bold text-2xl">
                {marina?.name ?? 'My Marinas'}
              </h1>
              {marina && (
                <div className="flex items-center gap-2 text-white/60 text-sm mt-1">
                  <MapPin size={12} />
                  <span>{marina.city}, {marina.state}</span>
                  {marina.vhfChannel && (
                    <>
                      <span>·</span>
                      <Radio size={12} />
                      <span>VHF Ch {marina.vhfChannel}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Marina selector */}
            {myMarinas.length > 1 && (
              <select
                value={selectedMarinaId}
                onChange={e => setSelectedMarinaId(e.target.value)}
                className="bg-white/10 border border-white/20 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                {myMarinas.map(m => (
                  <option key={m.id} value={m.id} className="text-gray-800">{m.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Top KPI pills */}
          {marinaAnalytics && (
            <div className="flex flex-wrap gap-3 mt-4">
              <div className="bg-white/10 rounded-xl px-4 py-2 text-sm">
                <span className="text-white/60">Occupancy: </span>
                <span className="font-bold">{marinaAnalytics.currentOccupancyPct}%</span>
              </div>
              <div className="bg-white/10 rounded-xl px-4 py-2 text-sm">
                <span className="text-white/60">Monthly Revenue: </span>
                <span className="font-bold">${marinaAnalytics.monthlyRevenue.toLocaleString()}</span>
              </div>
              <div className="bg-white/10 rounded-xl px-4 py-2 text-sm">
                <span className="text-white/60">Avg Stay: </span>
                <span className="font-bold">{marinaAnalytics.avgStayNights} nights</span>
              </div>
              <div className="bg-white/10 rounded-xl px-4 py-2 text-sm">
                <span className="text-white/60">Rating: </span>
                <span className="font-bold">⭐ {marina?.rating.toFixed(1)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-0 overflow-x-auto scrollbar-hide">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={clsx(
                    'flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                    tab === t.id
                      ? 'border-ocean-500 text-ocean-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  )}
                >
                  <Icon size={15} />
                  {t.label}
                  {t.badge !== undefined && t.badge > 0 && (
                    <span className={clsx(
                      'text-xs px-1.5 py-0.5 rounded-full font-semibold',
                      tab === t.id ? 'bg-ocean-100 text-ocean-600' : 'bg-gray-100 text-gray-500'
                    )}>
                      {t.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* ═══ OVERVIEW ═══ */}
        {tab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            {/* KPI Cards */}
            {marinaAnalytics ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={Anchor}
                  label="Current Occupancy"
                  value={`${marinaAnalytics.currentOccupancyPct}%`}
                  sub={`${marinaAnalytics.occupiedBerths}/${marinaAnalytics.totalBerths} berths`}
                  trend={3.2}
                  color="text-ocean-500"
                />
                <StatCard
                  icon={TrendingUp}
                  label="Monthly Revenue"
                  value={`$${(marinaAnalytics.monthlyRevenue / 1000).toFixed(0)}k`}
                  sub="vs last month"
                  trend={marinaAnalytics.monthlyRevenueChange}
                  color="text-emerald-500"
                />
                <StatCard
                  icon={Users}
                  label="Total Guests YTD"
                  value={marinaAnalytics.totalGuests.toLocaleString()}
                  sub={`Avg ${marinaAnalytics.avgStayNights} nights/stay`}
                  color="text-indigo-500"
                />
                <StatCard
                  icon={Star}
                  label="Guest Rating"
                  value={marina?.rating.toFixed(1) ?? '—'}
                  sub={`${marina?.reviewCount ?? 0} reviews`}
                  trend={1.2}
                  color="text-amber-500"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-32 animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 rounded-xl mb-3" />
                    <div className="h-6 bg-gray-200 rounded w-2/3" />
                  </div>
                ))}
              </div>
            )}

            {/* Quick access cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Currently on-site */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading font-bold text-navy-500">Currently On-Site</h2>
                  <button onClick={() => setTab('bookings')} className="text-xs text-ocean-500 font-medium flex items-center gap-1">
                    View all <ChevronRight size={12} />
                  </button>
                </div>
                {checkedInBookings.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No vessels currently checked in</p>
                ) : (
                  <div className="space-y-2">
                    {checkedInBookings.map(b => (
                      <div key={b.id} className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Ship size={16} className="text-emerald-600" />
                          <div>
                            <p className="font-medium text-sm text-navy-500">
                              {b.boatName || b.guestName || 'Guest Vessel'}
                            </p>
                            <p className="text-xs text-gray-500">Berth {b.berthName} · Out {b.checkOutDate}</p>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Checked In
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Alerts */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-heading font-bold text-navy-500 mb-4">Alerts</h2>
                <div className="space-y-3">
                  {pendingPartnerships.length > 0 && (
                    <div
                      className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl cursor-pointer hover:bg-amber-100 transition-colors"
                      onClick={() => setTab('partnerships')}
                    >
                      <Shield size={15} className="text-amber-600 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-700">
                          {pendingPartnerships.length} partnership application{pendingPartnerships.length > 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-amber-500">Awaiting your review</p>
                      </div>
                      <ChevronRight size={14} className="text-amber-400" />
                    </div>
                  )}
                  {pendingBookings.length > 0 && (
                    <div
                      className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors"
                      onClick={() => setTab('bookings')}
                    >
                      <Clock size={15} className="text-blue-600 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-700">
                          {pendingBookings.length} upcoming arrival{pendingBookings.length > 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-blue-500">Berth assignments needed</p>
                      </div>
                      <ChevronRight size={14} className="text-blue-400" />
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <CheckCircle size={15} className="text-emerald-500 shrink-0" />
                    <p className="text-sm text-gray-600">All systems operational</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue mini-chart */}
            {marinaAnalytics && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading font-bold text-navy-500">Revenue Trend</h2>
                  <button onClick={() => setTab('analytics')} className="text-xs text-ocean-500 font-medium flex items-center gap-1">
                    Full Analytics <ArrowUpRight size={12} />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={marinaAnalytics.revenueTrend} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, '']} />
                    <Bar dataKey="berthRevenue"      fill="#0ea5e9" name="Berth Revenue"       radius={[2,2,0,0]} />
                    <Bar dataKey="serviceCommission" fill="#6366f1" name="Service Commission" radius={[2,2,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ BERTHS ═══ */}
        {tab === 'berths' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-navy-500 text-lg">Berth Management</h2>
              <button className="flex items-center gap-1.5 text-sm btn-ocean px-4 py-2">
                <Plus size={14} /> Add Berth
              </button>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-ocean-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <BerthGrid berths={berths} />
            )}
          </motion.div>
        )}

        {/* ═══ BOOKINGS ═══ */}
        {tab === 'bookings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-navy-500 text-lg">Berth Bookings</h2>
              <button className="flex items-center gap-1.5 text-sm btn-ocean px-4 py-2">
                <Plus size={14} /> Walk-Up Booking
              </button>
            </div>

            {/* Status filter pills */}
            <div className="flex gap-2 flex-wrap mb-4">
              {['All', 'CHECKED_IN', 'CONFIRMED', 'PENDING', 'CHECKED_OUT', 'CANCELLED'].map(s => (
                <span key={s} className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full font-medium cursor-pointer hover:border-gray-300 transition-colors">
                  {s === 'All' ? `All (${berthBookings.length})` : `${STATUS_STYLES[s]?.label ?? s} (${berthBookings.filter(b => b.status === s).length})`}
                </span>
              ))}
            </div>

            <div className="space-y-3">
              {berthBookings.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Ship size={32} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No bookings yet</p>
                </div>
              ) : (
                berthBookings.map(booking => {
                  const s = STATUS_STYLES[booking.status] ?? { bg: 'bg-gray-50', text: 'text-gray-600', label: booking.status };
                  return (
                    <div key={booking.id} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-semibold text-sm text-navy-500">
                              {booking.boatName || booking.guestName || 'Guest Vessel'}
                            </span>
                            <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', s.bg, s.text)}>
                              {s.label}
                            </span>
                            {booking.bookingSource !== 'online' && (
                              <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                                {booking.bookingSource === 'walk_up' ? 'Walk-Up' : 'Phone'}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                            <span>Berth {booking.berthName}</span>
                            <span>·</span>
                            <span>{booking.checkInDate} → {booking.checkOutDate}</span>
                            <span>·</span>
                            <span>{booking.nights} nights</span>
                            <span>·</span>
                            <span className="font-semibold text-navy-500">${booking.totalAmountUsd.toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">Ref: {booking.reference}</p>
                        </div>
                        {/* Actions */}
                        <div className="flex gap-2 shrink-0">
                          {booking.status === 'CONFIRMED' && (
                            <button
                              onClick={() => updateBookingStatus(booking.id, 'CHECKED_IN')}
                              className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-emerald-600 transition-colors"
                            >
                              Check In
                            </button>
                          )}
                          {booking.status === 'CHECKED_IN' && (
                            <button
                              onClick={() => updateBookingStatus(booking.id, 'CHECKED_OUT')}
                              className="text-xs bg-ocean-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-ocean-600 transition-colors"
                            >
                              Check Out
                            </button>
                          )}
                          {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                            <button
                              onClick={() => updateBookingStatus(booking.id, 'CANCELLED')}
                              className="text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-lg font-medium hover:bg-red-50 transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}

        {/* ═══ PARTNERSHIPS ═══ */}
        {tab === 'partnerships' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-navy-500 text-lg">Provider Partnerships</h2>
              <span className="text-sm text-gray-400">{partnerships.length} total</span>
            </div>

            {pendingPartnerships.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <h3 className="font-medium text-sm text-amber-700">Pending Review ({pendingPartnerships.length})</h3>
                </div>
                <div className="space-y-2">
                  {pendingPartnerships.map(p => (
                    <PartnershipCard
                      key={p.id}
                      partnership={p}
                      showActions
                      onApprove={async (id) => { await updatePartnershipStatus(id, 'active'); }}
                      onReject={async (id) => { await updatePartnershipStatus(id, 'rejected'); }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-medium text-sm text-gray-500 mb-3">Active Partnerships ({partnerships.filter(p => p.status === 'active').length})</h3>
              <div className="space-y-2">
                {partnerships.filter(p => p.status === 'active').map(p => (
                  <PartnershipCard key={p.id} partnership={p} showActions={false} />
                ))}
              </div>
            </div>

            {partnerships.filter(p => ['rejected','suspended','terminated'].includes(p.status)).length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium text-sm text-gray-500 mb-3">Inactive</h3>
                <div className="space-y-2">
                  {partnerships.filter(p => ['rejected','suspended','terminated'].includes(p.status)).map(p => (
                    <PartnershipCard key={p.id} partnership={p} showActions={false} />
                  ))}
                </div>
              </div>
            )}

            {/* Tier info */}
            <div className="mt-8 bg-gradient-to-br from-navy-50 to-ocean-50 rounded-2xl border border-ocean-100 p-5">
              <h3 className="font-heading font-bold text-navy-500 mb-3">Partnership Tiers</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                {[
                  { tier: 'Standard', boost: 'Proximity → 100', commission: '0%', icon: CheckCircle, color: 'text-blue-600' },
                  { tier: 'Preferred', boost: '+5 overall boost', commission: '8% commission', icon: Star, color: 'text-ocean-600' },
                  { tier: 'Exclusive', boost: '+10 overall boost', commission: '12% commission', icon: Shield, color: 'text-amber-600' },
                ].map(t => {
                  const Icon = t.icon;
                  return (
                    <div key={t.tier} className="bg-white rounded-xl p-3 border border-gray-100">
                      <div className={clsx('flex items-center gap-1.5 font-semibold mb-1', t.color)}>
                        <Icon size={13} />
                        {t.tier}
                      </div>
                      <p className="text-xs text-gray-500">{t.boost}</p>
                      <p className="text-xs text-emerald-600 font-medium">{t.commission}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ ANALYTICS ═══ */}
        {tab === 'analytics' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            {isLoading || !marinaAnalytics ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-ocean-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* KPI row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard icon={Anchor} label="Current Occupancy" value={`${marinaAnalytics.currentOccupancyPct}%`} sub={`${marinaAnalytics.occupiedBerths}/${marinaAnalytics.totalBerths} berths`} trend={3.2} color="text-ocean-500" />
                  <StatCard icon={TrendingUp} label="Monthly Revenue" value={`$${(marinaAnalytics.monthlyRevenue/1000).toFixed(0)}k`} trend={marinaAnalytics.monthlyRevenueChange} color="text-emerald-500" />
                  <StatCard icon={TrendingUp} label="YTD Revenue" value={`$${(marinaAnalytics.ytdRevenue/1000).toFixed(0)}k`} color="text-indigo-500" />
                  <StatCard icon={Users} label="Guests YTD" value={marinaAnalytics.totalGuests.toLocaleString()} sub={`Avg ${marinaAnalytics.avgStayNights} nights`} color="text-amber-500" />
                </div>

                {/* Occupancy trend */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-heading font-bold text-navy-500 mb-4">Occupancy Trend</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={marinaAnalytics.occupancyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                      <Tooltip formatter={(v: number) => [`${v}%`, 'Occupancy']} />
                      <Line type="monotone" dataKey="occupancyPct" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 4 }} name="Occupancy %" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Revenue trend */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-heading font-bold text-navy-500 mb-4">Revenue Breakdown</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={marinaAnalytics.revenueTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, '']} />
                      <Legend />
                      <Bar dataKey="berthRevenue"      fill="#0ea5e9" name="Berth Revenue"       radius={[3,3,0,0]} />
                      <Bar dataKey="serviceCommission" fill="#6366f1" name="Service Commission" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Two-column charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Fleet composition */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-heading font-bold text-navy-500 mb-4">Fleet Composition</h3>
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="50%" height={180}>
                        <PieChart>
                          <Pie
                            data={marinaAnalytics.fleetComposition}
                            dataKey="count"
                            nameKey="boatType"
                            cx="50%" cy="50%"
                            outerRadius={70}
                            innerRadius={40}
                          >
                            {marinaAnalytics.fleetComposition.map((_, i) => (
                              <Cell key={i} fill={FLEET_COLORS[i % FLEET_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => [v, 'vessels']} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-2">
                        {marinaAnalytics.fleetComposition.map((item, i) => (
                          <div key={item.boatType} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: FLEET_COLORS[i % FLEET_COLORS.length] }} />
                              <span className="text-gray-600 truncate max-w-28">{item.boatType}</span>
                            </div>
                            <span className="font-semibold text-gray-700">{item.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Service demand */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-heading font-bold text-navy-500 mb-4">Service Demand</h3>
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="50%" height={180}>
                        <PieChart>
                          <Pie
                            data={marinaAnalytics.serviceDemand}
                            dataKey="requestCount"
                            nameKey="category"
                            cx="50%" cy="50%"
                            outerRadius={70}
                            innerRadius={40}
                          >
                            {marinaAnalytics.serviceDemand.map((_, i) => (
                              <Cell key={i} fill={SERVICE_COLORS[i % SERVICE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => [v, 'requests']} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-2">
                        {marinaAnalytics.serviceDemand.map((item, i) => (
                          <div key={item.category} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: SERVICE_COLORS[i % SERVICE_COLORS.length] }} />
                              <span className="text-gray-600 truncate max-w-28">{item.category}</span>
                            </div>
                            <span className="font-semibold text-gray-700">{item.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top origin ports */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-heading font-bold text-navy-500">Top Vessel Origin Ports</h3>
                    <div className="flex items-center gap-1.5 text-xs text-ocean-600 bg-ocean-50 px-2.5 py-1 rounded-full">
                      <Waves size={11} />
                      Vessel origins heatmap powered by Mapbox GL JS
                    </div>
                  </div>
                  <div className="space-y-2">
                    {marinaAnalytics.topOriginPorts.map((port, i) => {
                      const maxCount = marinaAnalytics.topOriginPorts[0].count;
                      return (
                        <div key={port.port} className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 w-4">{i+1}</span>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium text-navy-500">{port.port}</span>
                              <span className="text-xs text-gray-500">{port.count} vessels</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full">
                              <div
                                className="h-full bg-ocean-400 rounded-full transition-all"
                                style={{ width: `${(port.count / maxCount) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Multi-marina comparison (if owner has multiple) */}
                {myMarinas.length > 1 && (
                  <div className="bg-gradient-to-br from-navy-50 to-ocean-50 border border-ocean-100 rounded-2xl p-5">
                    <h3 className="font-heading font-bold text-navy-500 mb-4">Multi-Marina Comparison</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-500 border-b border-gray-200">
                            <th className="text-left pb-2 font-medium">Marina</th>
                            <th className="text-right pb-2 font-medium">Occupancy</th>
                            <th className="text-right pb-2 font-medium">Berths</th>
                            <th className="text-right pb-2 font-medium">Rating</th>
                          </tr>
                        </thead>
                        <tbody>
                          {myMarinas.map(m => {
                            const a = analytics[m.id];
                            return (
                              <tr key={m.id} className="border-b border-gray-100 last:border-0">
                                <td className="py-2 font-medium text-navy-500">{m.name}</td>
                                <td className="py-2 text-right">
                                  <span className={clsx(
                                    'font-semibold',
                                    (a?.currentOccupancyPct ?? 0) >= 80 ? 'text-emerald-600' : 'text-amber-600'
                                  )}>
                                    {a?.currentOccupancyPct ?? '—'}%
                                  </span>
                                </td>
                                <td className="py-2 text-right text-gray-600">{m.availableBerths}/{m.totalBerths}</td>
                                <td className="py-2 text-right">
                                  <span className="flex items-center justify-end gap-0.5">
                                    <Star size={11} className="text-amber-400 fill-amber-400" />
                                    {m.rating.toFixed(1)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* ═══ JOB BOARD ═══ */}
        {tab === 'job-board' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-heading font-bold text-navy-500 text-lg">Marina Job Board</h2>
                <p className="text-sm text-gray-400 mt-0.5">Live service needs from vessels currently on-site at {marina?.name}</p>
              </div>
            </div>
            <MarinaJobBoard
              bookings={berthBookings}
              partnerships={partnerships}
              expressedInterestJobIds={expressedJobIds}
              onExpressInterest={job => {
                const key = `${job.booking.id}-${job.serviceCategory}`;
                setExpressedJobIds(prev => new Set([...prev, key]));
              }}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default MarinaDashboard;
