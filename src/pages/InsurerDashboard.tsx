/**
 * InsurerDashboard — Enterprise dashboard for insurance companies
 * Tabs: Overview | Portfolio | Claims | Agents | Analytics
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Shield, FileText, Users, BarChart3,
  TrendingUp, TrendingDown, AlertTriangle, Clock, DollarSign,
  Activity, Calendar, Award, ChevronRight,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { clsx } from 'clsx';
import { useInsuranceStore } from '../store/insuranceStore';
import { useAuthStore } from '../store/authStore';
import type {
  InsuranceClaim,
  InsurancePolicy,
  PolicyStatus,
  ClaimStatus,
} from '../types';

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'portfolio' | 'claims' | 'agents' | 'analytics';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtUsd = (n: number, decimals = 0) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: decimals }).format(n);

const fmtM = (n: number) => `$${(n / 1_000_000).toFixed(1)}M`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const daysUntil = (iso: string) =>
  Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);

// ─── Stat Card ────────────────────────────────────────────────────────────────

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

// ─── Policy Status Badge ──────────────────────────────────────────────────────

const POLICY_STATUS_MAP: Record<PolicyStatus, { label: string; classes: string }> = {
  active:       { label: 'Active',        classes: 'bg-emerald-50 text-emerald-700' },
  expiring:     { label: 'Expiring Soon', classes: 'bg-amber-50 text-amber-700' },
  pending_bind: { label: 'Pending Bind',  classes: 'bg-blue-50 text-blue-700' },
  expired:      { label: 'Expired',       classes: 'bg-gray-100 text-gray-500' },
  lapsed:       { label: 'Lapsed',        classes: 'bg-gray-100 text-gray-500' },
  cancelled:    { label: 'Cancelled',     classes: 'bg-red-50 text-red-600' },
};

const PolicyStatusBadge: React.FC<{ status: PolicyStatus }> = ({ status }) => {
  const cfg = POLICY_STATUS_MAP[status] ?? POLICY_STATUS_MAP.expired;
  return (
    <span className={clsx('text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap', cfg.classes)}>
      {cfg.label}
    </span>
  );
};

// ─── Claim Status Badge ───────────────────────────────────────────────────────

const CLAIM_STATUS_MAP: Record<ClaimStatus, { label: string; classes: string }> = {
  draft:               { label: 'Draft',               classes: 'bg-gray-100 text-gray-600' },
  submitted:           { label: 'Submitted',           classes: 'bg-blue-50 text-blue-700' },
  under_review:        { label: 'Under Review',        classes: 'bg-indigo-50 text-indigo-700' },
  pending_assessment:  { label: 'Pending Assessment',  classes: 'bg-yellow-50 text-yellow-700' },
  assessment_complete: { label: 'Assessment Complete', classes: 'bg-teal-50 text-teal-700' },
  pending_approval:    { label: 'Pending Approval',    classes: 'bg-orange-50 text-orange-700' },
  approved:            { label: 'Approved',            classes: 'bg-emerald-50 text-emerald-700' },
  payment_processing:  { label: 'Processing',          classes: 'bg-cyan-50 text-cyan-700' },
  paid:                { label: 'Paid',                classes: 'bg-emerald-100 text-emerald-800' },
  rejected:            { label: 'Rejected',            classes: 'bg-red-50 text-red-600' },
  appealed:            { label: 'Appealed',            classes: 'bg-purple-50 text-purple-700' },
  closed:              { label: 'Closed',              classes: 'bg-gray-100 text-gray-500' },
};

const ClaimStatusBadge: React.FC<{ status: ClaimStatus }> = ({ status }) => {
  const cfg = CLAIM_STATUS_MAP[status] ?? CLAIM_STATUS_MAP.draft;
  return (
    <span className={clsx('text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap', cfg.classes)}>
      {cfg.label}
    </span>
  );
};

// ─── Chart colors ─────────────────────────────────────────────────────────────

const CHART_COLORS = {
  premium: '#0ea5e9',
  claims:  '#f59e0b',
  bar:     ['#0ea5e9', '#6366f1', '#f59e0b', '#10b981', '#f43f5e'],
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const InsurerDashboard: React.FC = () => {
  useAuthStore();
  const {
    policies, claims, analytics,
    insurers, agents,
    isLoading,
    loadInsurerAnalytics, loadAllPolicies, loadClaims,
    loadInsurers,
    updateClaimStatus,
  } = useInsuranceStore();

  const [tab, setTab] = useState<Tab>('overview');
  const [claimStatusFilter, setClaimStatusFilter] = useState<ClaimStatus | 'all'>('all');

  const INSURER_ID = 'insurer-1';

  useEffect(() => {
    loadInsurerAnalytics(INSURER_ID);
    loadAllPolicies(INSURER_ID);
    loadClaims(undefined, INSURER_ID);
    loadInsurers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived data ───────────────────────────────────────────────────────────

  const activePolicies   = policies.filter(p => p.status === 'active');
  const expiringPolicies = policies.filter(p => p.status === 'expiring');
  const totalInsuredValue = activePolicies.reduce((s, p) => s + p.agreedValueUsd, 0);
  const premiumYtd        = activePolicies.reduce((s, p) => s + p.annualPremiumUsd, 0);
  const openClaims        = claims.filter(c =>
    !['closed', 'paid', 'rejected'].includes(c.status),
  );
  const paidYtd           = claims
    .filter(c => c.status === 'paid' && c.approvedAmountUsd)
    .reduce((s, c) => s + (c.approvedAmountUsd ?? 0), 0);
  const lossRatio         = premiumYtd > 0 ? ((paidYtd / premiumYtd) * 100).toFixed(1) : '—';

  const expiring30  = policies.filter(p => { const d = daysUntil(p.expiryDate); return d >= 0 && d <= 30; });
  const expiring60  = policies.filter(p => { const d = daysUntil(p.expiryDate); return d > 30 && d <= 60; });
  const expiring90  = policies.filter(p => { const d = daysUntil(p.expiryDate); return d > 60 && d <= 90; });

  const filteredClaims = claimStatusFilter === 'all'
    ? claims
    : claims.filter(c => c.status === claimStatusFilter);

  const totalReserved = openClaims.reduce((s, c) => s + c.estimatedLossUsd, 0);
  const avgCycleTime  = analytics?.avgTimeToClosedays ?? 0;

  // ── Chart data ─────────────────────────────────────────────────────────────

  const trendData  = analytics?.premiumTrend ?? [];
  const claimTypes = analytics?.claimsByType ?? [];
  const topProducts = analytics?.topProducts ?? [];

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview',  label: 'Overview',  icon: LayoutDashboard },
    { id: 'portfolio', label: 'Portfolio', icon: Shield },
    { id: 'claims',    label: 'Claims',    icon: FileText },
    { id: 'agents',    label: 'Agents',    icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const CLAIM_STATUS_FILTERS: Array<{ id: ClaimStatus | 'all'; label: string }> = [
    { id: 'all',          label: 'All' },
    { id: 'submitted',    label: 'Submitted' },
    { id: 'under_review', label: 'Under Review' },
    { id: 'approved',     label: 'Approved' },
    { id: 'paid',         label: 'Paid' },
    { id: 'rejected',     label: 'Rejected' },
    { id: 'closed',       label: 'Closed' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-heading font-bold text-navy-500">Insurer Dashboard</h1>
          <p className="text-gray-500 mt-1">Portfolio performance, claims management, and agent oversight</p>
        </motion.div>

        {/* Tab Bar */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl mb-6 overflow-x-auto w-fit">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
                tab === t.id
                  ? 'bg-ocean-500 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-200',
              )}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ── */}
        {tab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              <StatCard icon={Shield}      label="Active Policies"    value={activePolicies.length}   color="text-ocean-500" />
              <StatCard icon={DollarSign}  label="Total Insured Value" value={fmtM(totalInsuredValue)} color="text-navy-500" />
              <StatCard icon={TrendingUp}  label="Premium YTD"        value={fmtM(premiumYtd)}        color="text-teal-500" />
              <StatCard icon={FileText}    label="Open Claims"        value={openClaims.length}        color="text-amber-500" />
              <StatCard icon={Activity}    label="Loss Ratio"         value={`${lossRatio}%`}          color="text-gold-400" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

              {/* Premium vs Claims trend */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-base font-semibold text-navy-500 mb-4">Monthly Trend — Premium vs Claims</h3>
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => fmtUsd(v)} />
                      <Legend />
                      <Line type="monotone" dataKey="premium" stroke={CHART_COLORS.premium} strokeWidth={2} dot={false} name="Premium" />
                      <Line type="monotone" dataKey="claims"  stroke={CHART_COLORS.claims}  strokeWidth={2} dot={false} name="Claims" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No trend data available</div>
                )}
              </div>

              {/* Claims by type */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-base font-semibold text-navy-500 mb-4">Claims by Type</h3>
                {claimTypes.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={claimTypes} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="type" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                      <Tooltip />
                      <Bar dataKey="count" fill={CHART_COLORS.premium} radius={[4, 4, 0, 0]} name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No claims data available</div>
                )}
              </div>
            </div>

            {/* Expiry warnings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Expiring in 30 days', count: expiring30.length, color: 'text-red-500 bg-red-50 border-red-100' },
                { label: 'Expiring in 60 days', count: expiring60.length, color: 'text-amber-500 bg-amber-50 border-amber-100' },
                { label: 'Expiring in 90 days', count: expiring90.length, color: 'text-yellow-600 bg-yellow-50 border-yellow-100' },
              ].map(({ label, count, color }) => (
                <div key={label} className={clsx('rounded-2xl border p-5', color.split(' ').slice(1).join(' '))}>
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={20} className={color.split(' ')[0]} />
                    <div>
                      <p className="text-2xl font-bold text-navy-500">{count}</p>
                      <p className="text-sm text-gray-600">{label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Portfolio Tab ── */}
        {tab === 'portfolio' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* Expiry warning cards */}
            {(expiring30.length > 0 || expiring60.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {expiring30.length > 0 && (
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3">
                    <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-navy-500">{expiring30.length} expiring in &lt;30d</p>
                      <p className="text-xs text-gray-500">Immediate renewal needed</p>
                    </div>
                  </div>
                )}
                {expiring60.length > 0 && (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
                    <Calendar size={18} className="text-amber-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-navy-500">{expiring60.length} expiring in 31–60d</p>
                      <p className="text-xs text-gray-500">Start renewal outreach</p>
                    </div>
                  </div>
                )}
                {expiring90.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4 flex items-center gap-3">
                    <Clock size={18} className="text-yellow-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-navy-500">{expiring90.length} expiring in 61–90d</p>
                      <p className="text-xs text-gray-500">Pipeline review</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Policies table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h3 className="text-base font-semibold text-navy-500">Policy Portfolio</h3>
                <p className="text-xs text-gray-500 mt-0.5">{policies.length} policies total</p>
              </div>
              {isLoading ? (
                <div className="p-8 text-center text-gray-400 text-sm">Loading policies…</div>
              ) : policies.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No policies found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                        <th className="px-5 py-3 text-left font-medium">Policy #</th>
                        <th className="px-5 py-3 text-left font-medium">Vessel</th>
                        <th className="px-5 py-3 text-left font-medium">Owner</th>
                        <th className="px-5 py-3 text-left font-medium">Product</th>
                        <th className="px-5 py-3 text-right font-medium">Premium</th>
                        <th className="px-5 py-3 text-left font-medium">Status</th>
                        <th className="px-5 py-3 text-left font-medium">Expiry</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {policies.map((p: InsurancePolicy) => {
                        const days = daysUntil(p.expiryDate);
                        return (
                          <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3.5 font-mono text-xs text-navy-500 font-medium whitespace-nowrap">
                              {p.policyNumber}
                            </td>
                            <td className="px-5 py-3.5 text-gray-700 whitespace-nowrap">{p.boatName ?? '—'}</td>
                            <td className="px-5 py-3.5 text-gray-700 whitespace-nowrap">{p.ownerName ?? '—'}</td>
                            <td className="px-5 py-3.5 text-gray-600 text-xs max-w-[140px] truncate">{p.productName}</td>
                            <td className="px-5 py-3.5 text-right font-semibold text-navy-500 whitespace-nowrap">
                              {fmtUsd(p.annualPremiumUsd)}
                            </td>
                            <td className="px-5 py-3.5">
                              <PolicyStatusBadge status={p.status} />
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className={clsx('text-xs', days >= 0 && days <= 30 ? 'text-red-600 font-semibold' : 'text-gray-500')}>
                                {fmtDate(p.expiryDate)}
                                {days >= 0 && days <= 30 && ` (${days}d)`}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Claims Tab ── */}
        {tab === 'claims' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* Claims summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard icon={DollarSign} label="Total Reserved"  value={fmtUsd(totalReserved)} color="text-amber-500" />
              <StatCard icon={TrendingUp} label="Total Paid YTD"  value={fmtUsd(paidYtd)}       color="text-emerald-500" />
              <StatCard icon={Clock}      label="Avg Cycle Time"  value={`${avgCycleTime.toFixed(1)}d`} color="text-ocean-500" />
            </div>

            {/* Filter by status */}
            <div className="flex flex-wrap gap-2">
              {CLAIM_STATUS_FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setClaimStatusFilter(f.id as ClaimStatus | 'all')}
                  className={clsx(
                    'px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
                    claimStatusFilter === f.id
                      ? 'bg-ocean-500 text-white shadow-sm'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300',
                  )}
                >
                  {f.label}
                  {f.id !== 'all' && (
                    <span className="ml-1.5 opacity-60">
                      {claims.filter(c => c.status === f.id).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Claims list */}
            <div className="space-y-3">
              {isLoading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-24 animate-pulse" />
                ))
              ) : filteredClaims.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
                  No claims matching this filter
                </div>
              ) : (
                filteredClaims.map((claim: InsuranceClaim, i: number) => (
                  <motion.div
                    key={claim.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 text-ocean-500">
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-navy-500 font-mono text-sm">{claim.reference}</p>
                            <ClaimStatusBadge status={claim.status} />
                            {claim.fraudFlag && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                                Fraud Flag
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {claim.incidentType.replace(/_/g, ' ')} · {fmtDate(claim.incidentDate)}
                            {claim.ownerName && ` · ${claim.ownerName}`}
                          </p>
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{claim.description}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <p className="text-sm font-semibold text-navy-500">{fmtUsd(claim.estimatedLossUsd)}</p>
                        {claim.approvedAmountUsd !== undefined && (
                          <p className="text-xs text-emerald-600">Approved: {fmtUsd(claim.approvedAmountUsd)}</p>
                        )}
                        <select
                          value={claim.status}
                          onChange={e => updateClaimStatus(claim.id, e.target.value as ClaimStatus)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ocean-500 bg-white"
                        >
                          {(Object.keys(CLAIM_STATUS_MAP) as ClaimStatus[]).map(s => (
                            <option key={s} value={s}>{CLAIM_STATUS_MAP[s].label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* ── Agents Tab ── */}
        {tab === 'agents' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h3 className="text-base font-semibold text-navy-500">Registered Agents</h3>
                <p className="text-xs text-gray-500 mt-0.5">{agents.length} agents</p>
              </div>
              {agents.length === 0 ? (
                <div className="p-12 text-center text-gray-400 text-sm">No agents on file</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                        <th className="px-5 py-3 text-left font-medium">Agent</th>
                        <th className="px-5 py-3 text-left font-medium">Licence</th>
                        <th className="px-5 py-3 text-left font-medium">Status</th>
                        <th className="px-5 py-3 text-left font-medium">Insurers</th>
                        <th className="px-5 py-3 text-left font-medium">Active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {agents.map(agent => {
                        const agentPolicies = policies.filter(p => p.agentId === agent.id && p.status === 'active');
                        const statusClasses = agent.licenceStatus === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : agent.licenceStatus === 'expired'
                          ? 'bg-gray-100 text-gray-500'
                          : 'bg-red-50 text-red-600';
                        return (
                          <tr key={agent.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3.5">
                              <div>
                                <p className="font-medium text-navy-500">{agent.userName}</p>
                                <p className="text-xs text-gray-500">{agent.userEmail}</p>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <div>
                                <p className="font-mono text-xs text-navy-500">{agent.licenceNumber}</p>
                                {agent.licenceState && (
                                  <p className="text-xs text-gray-500">{agent.licenceState}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={clsx('text-xs font-medium px-2.5 py-1 rounded-full capitalize', statusClasses)}>
                                {agent.licenceStatus}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex flex-wrap gap-1">
                                {(agent.associatedInsurers ?? []).slice(0, 2).map(ai => (
                                  <span key={ai.insurerId} className="text-xs bg-ocean-50 text-ocean-700 px-2 py-0.5 rounded-full">
                                    {ai.insurerName}
                                  </span>
                                ))}
                                {(agent.associatedInsurers ?? []).length > 2 && (
                                  <span className="text-xs text-gray-400">+{(agent.associatedInsurers ?? []).length - 2}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3.5 font-semibold text-navy-500">{agentPolicies.length}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Analytics Tab ── */}
        {tab === 'analytics' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* Top Products */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h3 className="text-base font-semibold text-navy-500">Top Products by Premium</h3>
              </div>
              {topProducts.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No product data available</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                        <th className="px-5 py-3 text-left font-medium">Product</th>
                        <th className="px-5 py-3 text-right font-medium">Policies</th>
                        <th className="px-5 py-3 text-right font-medium">Premium</th>
                        <th className="px-5 py-3 text-left font-medium">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {topProducts.map((tp, i) => {
                        const totalPrem = topProducts.reduce((s, p) => s + p.premium, 0);
                        const share = totalPrem > 0 ? (tp.premium / totalPrem) * 100 : 0;
                        return (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3.5 font-medium text-navy-500">{tp.name}</td>
                            <td className="px-5 py-3.5 text-right text-gray-700">{tp.policies}</td>
                            <td className="px-5 py-3.5 text-right font-semibold text-navy-500">{fmtUsd(tp.premium)}</td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-100 rounded-full h-2">
                                  <div
                                    className="bg-ocean-500 h-2 rounded-full"
                                    style={{ width: `${Math.min(share, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500 w-10 text-right">{share.toFixed(0)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Expiry Forecast */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Next 30 Days', count: analytics?.expiringPolicies30d ?? expiring30.length, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 border-red-100' },
                { label: 'Next 60 Days', count: analytics?.expiringPolicies60d ?? (expiring30.length + expiring60.length), icon: Calendar, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-100' },
                { label: 'Next 90 Days', count: analytics?.expiringPolicies90d ?? (expiring30.length + expiring60.length + expiring90.length), icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-100' },
              ].map(({ label, count, icon: Icon, color, bg }) => (
                <div key={label} className={clsx('rounded-2xl border p-5', bg)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Policies Expiring</p>
                      <p className="text-xs text-gray-500">{label}</p>
                    </div>
                    <Icon size={18} className={color} />
                  </div>
                  <p className="text-3xl font-heading font-bold text-navy-500 mt-3">{count}</p>
                  <button className="mt-2 text-xs text-ocean-500 hover:text-ocean-600 font-medium flex items-center gap-1">
                    View list <ChevronRight size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* Loss Ratio trend chart */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-navy-500 mb-4">Premium vs Claims — Full Trend</h3>
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmtUsd(v)} />
                    <Legend />
                    <Bar dataKey="premium" fill={CHART_COLORS.premium} radius={[4, 4, 0, 0]} name="Premium" />
                    <Bar dataKey="claims"  fill={CHART_COLORS.claims}  radius={[4, 4, 0, 0]} name="Claims" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">No data available</div>
              )}
            </div>

            {/* Claims by type detail */}
            {claimTypes.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-base font-semibold text-navy-500 mb-4">Claims by Incident Type</h3>
                <div className="space-y-3">
                  {claimTypes.map((ct, i) => {
                    const totalCount = claimTypes.reduce((s, c) => s + c.count, 0);
                    const share = totalCount > 0 ? (ct.count / totalCount) * 100 : 0;
                    return (
                      <div key={i} className="flex items-center gap-4">
                        <span className="text-sm text-gray-600 w-28 capitalize flex-shrink-0">{ct.type}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                          <div
                            className="h-2.5 rounded-full transition-all"
                            style={{
                              width: `${Math.min(share, 100)}%`,
                              backgroundColor: CHART_COLORS.bar[i % CHART_COLORS.bar.length],
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{ct.count}</span>
                        <span className="text-xs text-gray-400 w-10 text-right">{ct.pct?.toFixed(0) ?? share.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};
