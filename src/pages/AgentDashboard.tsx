/**
 * AgentDashboard — Module 6
 * Insurance agent's book of business, pipeline & commissions.
 * Tabs: Book of Business | Pipeline | Commissions
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, DollarSign, TrendingUp, Clock, Award, CheckCircle,
  AlertTriangle, ChevronRight, Shield, FileText, RefreshCw,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useInsuranceStore } from '../store/insuranceStore';
import type { CommissionStatus, PolicyStatus } from '../types';

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = 'book' | 'pipeline' | 'commissions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtUsd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const daysUntil = (iso: string) =>
  Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);

const POLICY_STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  active:       { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Active' },
  expiring:     { bg: 'bg-amber-50',   text: 'text-amber-700',   label: 'Expiring' },
  expired:      { bg: 'bg-gray-100',   text: 'text-gray-600',    label: 'Expired' },
  pending_bind: { bg: 'bg-blue-50',    text: 'text-blue-700',    label: 'Pending Bind' },
  lapsed:       { bg: 'bg-orange-50',  text: 'text-orange-700',  label: 'Lapsed' },
  cancelled:    { bg: 'bg-red-50',     text: 'text-red-600',     label: 'Cancelled' },
};

const COMMISSION_STATUS_STYLE: Record<CommissionStatus, { bg: string; text: string; label: string }> = {
  pending:      { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Pending' },
  earned:       { bg: 'bg-blue-50',   text: 'text-blue-700',   label: 'Earned' },
  paid:         { bg: 'bg-emerald-50',text: 'text-emerald-700',label: 'Paid' },
  clawed_back:  { bg: 'bg-red-50',    text: 'text-red-600',    label: 'Clawed Back' },
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}> = ({ icon: Icon, label, value, sub, color = 'text-ocean-500' }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
    <div className="flex items-start justify-between mb-3">
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50', color)}>
        <Icon size={18} />
      </div>
    </div>
    <p className="text-2xl font-heading font-bold text-navy-500">{value}</p>
    <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const AgentDashboard: React.FC = () => {
  const {
    agents, policies, commissions, isLoading,
    loadAgentPolicies, loadCommissions,
  } = useInsuranceStore();

  const [tab, setTab] = useState<Tab>('book');

  const AGENT_ID = 'agent-1';

  useEffect(() => {
    loadAgentPolicies(AGENT_ID);
    loadCommissions(AGENT_ID);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const agent = agents.find(a => a.id === AGENT_ID);

  // All policies attributed to this agent
  const myPolicies = policies.filter(p => p.agentId === AGENT_ID);

  // Pipeline = policies expiring soon
  const pipeline = myPolicies
    .filter(p => p.status === 'expiring' || (p.status === 'active' && daysUntil(p.expiryDate) <= 90))
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  // Commissions for this agent
  const myCommissions = commissions.filter(c => c.agentId === AGENT_ID);
  const totalEarnedYtd = myCommissions
    .filter(c => c.status === 'earned' || c.status === 'paid')
    .reduce((s, c) => s + c.commissionAmountUsd, 0);
  const totalPaid = myCommissions
    .filter(c => c.status === 'paid')
    .reduce((s, c) => s + c.commissionAmountUsd, 0);
  const totalPending = myCommissions
    .filter(c => c.status === 'pending')
    .reduce((s, c) => s + c.commissionAmountUsd, 0);

  const totalPremiumVol = myPolicies
    .filter(p => p.status === 'active' || p.status === 'expiring')
    .reduce((s, p) => s + p.annualPremiumUsd, 0);

  const avgCommissionRate = agent?.associatedInsurers?.length
    ? agent.associatedInsurers.reduce((s, a) => s + a.commissionRate, 0) / agent.associatedInsurers.length
    : 0;

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'book',        label: 'Book of Business', icon: Shield },
    { id: 'pipeline',    label: 'Pipeline',          icon: RefreshCw },
    { id: 'commissions', label: 'Commissions',       icon: DollarSign },
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
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-teal-500 rounded-xl">
                  <Users size={20} className="text-white" />
                </div>
                <h1 className="text-3xl font-heading font-bold text-navy-500">
                  {agent?.userName ?? 'Agent Dashboard'}
                </h1>
                {agent && (
                  <span className={clsx(
                    'text-xs font-semibold px-2 py-1 rounded-full capitalize',
                    (agent.associatedInsurers?.[0]?.tier === 'elite')
                      ? 'bg-gold-50 text-gold-700 border border-gold-200'
                      : 'bg-ocean-50 text-ocean-700 border border-ocean-200'
                  )}>
                    {agent.associatedInsurers?.[0]?.tier ?? 'Standard'} Agent
                  </span>
                )}
              </div>
              <p className="text-gray-500">
                {agent?.licenceNumber && (
                  <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded mr-2">
                    {agent.licenceNumber}
                  </span>
                )}
                {agent?.licenceState && `${agent.licenceState} Licensed`}
                {agent?.licenceExpiry && ` · Expires ${fmtDate(agent.licenceExpiry)}`}
              </p>
            </div>

            {/* Insurer badges */}
            {agent?.associatedInsurers && (
              <div className="hidden sm:flex flex-col gap-1 items-end">
                {agent.associatedInsurers.map(ai => (
                  <span key={ai.insurerId} className="text-xs bg-white border border-gray-200 px-2 py-1 rounded-lg text-gray-600">
                    {ai.insurerName} · {(ai.commissionRate * 100).toFixed(0)}% comm.
                  </span>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-200">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
                tab === id
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={tab}>

            {/* ── BOOK OF BUSINESS ── */}
            {tab === 'book' && (
              <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatCard icon={Shield}      label="Active Policies"      value={myPolicies.filter(p => p.status === 'active').length}                color="text-emerald-500" />
                  <StatCard icon={DollarSign}  label="Total Premium Volume" value={fmtUsd(totalPremiumVol)} sub="active & expiring"                     color="text-ocean-500" />
                  <StatCard icon={TrendingUp}  label="Avg Commission Rate"  value={`${(avgCommissionRate * 100).toFixed(1)}%`}                           color="text-teal-500" />
                  <StatCard icon={Award}       label="Carrier Relationships" value={agent?.associatedInsurers?.length ?? 0}                             color="text-gold-500" />
                </div>

                {/* Policies table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-navy-500">All Policies ({myPolicies.length})</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                          <th className="px-6 py-3 text-left">Policy #</th>
                          <th className="px-6 py-3 text-left">Vessel</th>
                          <th className="px-6 py-3 text-left">Insurer</th>
                          <th className="px-6 py-3 text-left">Product</th>
                          <th className="px-6 py-3 text-right">Premium</th>
                          <th className="px-6 py-3 text-right">Commission</th>
                          <th className="px-6 py-3 text-center">Status</th>
                          <th className="px-6 py-3 text-left">Expires</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {myPolicies.map(p => {
                          const st = POLICY_STATUS_STYLE[p.status] ?? POLICY_STATUS_STYLE['active'];
                          const assoc = agent?.associatedInsurers?.find(ai => ai.insurerId === p.insurerId);
                          const commissionEst = assoc ? p.annualPremiumUsd * assoc.commissionRate : 0;
                          const days = daysUntil(p.expiryDate);
                          return (
                            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-3 font-mono text-xs text-gray-600">{p.policyNumber}</td>
                              <td className="px-6 py-3 font-medium text-navy-500">{p.boatName ?? '—'}</td>
                              <td className="px-6 py-3 text-gray-500 text-xs">{p.insurerName}</td>
                              <td className="px-6 py-3 text-gray-500 text-xs">{p.productName}</td>
                              <td className="px-6 py-3 text-right font-medium">{fmtUsd(p.annualPremiumUsd)}</td>
                              <td className="px-6 py-3 text-right text-teal-600 font-medium">{commissionEst > 0 ? fmtUsd(commissionEst) : '—'}</td>
                              <td className="px-6 py-3 text-center">
                                <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', st.bg, st.text)}>{st.label}</span>
                              </td>
                              <td className="px-6 py-3 text-xs">
                                <span className={clsx(days <= 30 ? 'text-red-600 font-semibold' : days <= 90 ? 'text-amber-600' : 'text-gray-500')}>
                                  {fmtDate(p.expiryDate)}
                                  {days <= 90 && days > 0 && <span className="ml-1">({days}d)</span>}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {myPolicies.length === 0 && (
                          <tr>
                            <td colSpan={8} className="px-6 py-10 text-center text-gray-400">No policies in your book</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── PIPELINE ── */}
            {tab === 'pipeline' && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center">
                    <p className="text-2xl font-bold text-red-600">{pipeline.filter(p => daysUntil(p.expiryDate) <= 30).length}</p>
                    <p className="text-xs text-gray-500 mt-1">Expiring in 30 days</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 text-center">
                    <p className="text-2xl font-bold text-amber-600">{pipeline.filter(p => { const d = daysUntil(p.expiryDate); return d > 30 && d <= 60; }).length}</p>
                    <p className="text-xs text-gray-500 mt-1">Expiring in 31–60 days</p>
                  </div>
                  <div className="bg-ocean-50 border border-ocean-100 rounded-2xl p-5 text-center">
                    <p className="text-2xl font-bold text-ocean-600">{pipeline.filter(p => { const d = daysUntil(p.expiryDate); return d > 60 && d <= 90; }).length}</p>
                    <p className="text-xs text-gray-500 mt-1">Expiring in 61–90 days</p>
                  </div>
                </div>

                {pipeline.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
                    <CheckCircle size={32} className="mx-auto mb-3 text-gray-200" />
                    <p className="font-medium">No renewals due in the next 90 days</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pipeline.map(p => {
                      const days = daysUntil(p.expiryDate);
                      const assoc = agent?.associatedInsurers?.find(ai => ai.insurerId === p.insurerId);
                      const renewalCommission = assoc ? p.annualPremiumUsd * assoc.commissionRate : 0;
                      return (
                        <div key={p.id} className={clsx(
                          'bg-white rounded-2xl border p-5 shadow-sm flex items-center justify-between gap-4',
                          days <= 30 ? 'border-red-200' : days <= 60 ? 'border-amber-200' : 'border-gray-100'
                        )}>
                          <div className="flex items-center gap-4 min-w-0">
                            <div className={clsx(
                              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                              days <= 30 ? 'bg-red-50 text-red-600' : days <= 60 ? 'bg-amber-50 text-amber-600' : 'bg-ocean-50 text-ocean-600'
                            )}>
                              <Clock size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-navy-500 truncate">{p.boatName ?? p.policyNumber}</p>
                              <p className="text-xs text-gray-500">{p.policyNumber} · {p.insurerName}</p>
                            </div>
                          </div>
                          <div className="hidden sm:flex items-center gap-8 text-sm flex-shrink-0">
                            <div className="text-right">
                              <p className="font-semibold text-navy-500">{fmtUsd(p.annualPremiumUsd)}</p>
                              <p className="text-xs text-gray-400">Annual Premium</p>
                            </div>
                            {renewalCommission > 0 && (
                              <div className="text-right">
                                <p className="font-semibold text-teal-600">{fmtUsd(renewalCommission)}</p>
                                <p className="text-xs text-gray-400">Est. Commission</p>
                              </div>
                            )}
                            <div className={clsx(
                              'text-right font-bold',
                              days <= 30 ? 'text-red-600' : days <= 60 ? 'text-amber-600' : 'text-ocean-600'
                            )}>
                              <p className="text-lg">{days}d</p>
                              <p className="text-xs font-normal text-gray-400">until expiry</p>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── COMMISSIONS ── */}
            {tab === 'commissions' && (
              <div className="space-y-6">
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm text-center">
                    <p className="text-2xl font-bold text-navy-500">{fmtUsd(totalEarnedYtd)}</p>
                    <p className="text-xs text-gray-500 mt-1">Earned YTD</p>
                  </div>
                  <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-5 text-center">
                    <p className="text-2xl font-bold text-emerald-700">{fmtUsd(totalPaid)}</p>
                    <p className="text-xs text-gray-500 mt-1">Paid Out</p>
                  </div>
                  <div className="bg-yellow-50 rounded-2xl border border-yellow-100 p-5 text-center">
                    <p className="text-2xl font-bold text-yellow-700">{fmtUsd(totalPending)}</p>
                    <p className="text-xs text-gray-500 mt-1">Pending</p>
                  </div>
                </div>

                {/* Commissions table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-navy-500">Commission Ledger ({myCommissions.length})</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                          <th className="px-6 py-3 text-left">Policy #</th>
                          <th className="px-6 py-3 text-left">Client / Vessel</th>
                          <th className="px-6 py-3 text-left">Type</th>
                          <th className="px-6 py-3 text-right">Premium</th>
                          <th className="px-6 py-3 text-right">Rate</th>
                          <th className="px-6 py-3 text-right">Amount</th>
                          <th className="px-6 py-3 text-center">Status</th>
                          <th className="px-6 py-3 text-left">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {myCommissions.map(c => {
                          const st = COMMISSION_STATUS_STYLE[c.status];
                          return (
                            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-3 font-mono text-xs text-gray-600">{c.policyNumber ?? '—'}</td>
                              <td className="px-6 py-3 font-medium text-navy-500">{c.ownerName ?? '—'}</td>
                              <td className="px-6 py-3">
                                <span className={clsx(
                                  'text-xs font-medium px-2 py-0.5 rounded-full capitalize',
                                  c.commissionType === 'renewal' ? 'bg-teal-50 text-teal-700' : 'bg-ocean-50 text-ocean-700'
                                )}>
                                  {c.commissionType.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-right">{fmtUsd(c.grossPremiumUsd)}</td>
                              <td className="px-6 py-3 text-right text-gray-500">{(c.commissionRate * 100).toFixed(1)}%</td>
                              <td className="px-6 py-3 text-right font-semibold text-teal-600">{fmtUsd(c.commissionAmountUsd)}</td>
                              <td className="px-6 py-3 text-center">
                                <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', st.bg, st.text)}>
                                  {st.label}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-xs text-gray-500">
                                {c.paidAt ? fmtDate(c.paidAt) : c.earnedAt ? fmtDate(c.earnedAt) : fmtDate(c.createdAt)}
                              </td>
                            </tr>
                          );
                        })}
                        {myCommissions.length === 0 && (
                          <tr>
                            <td colSpan={8} className="px-6 py-10 text-center text-gray-400">No commissions recorded yet</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AgentDashboard;
