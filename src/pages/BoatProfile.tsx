/**
 * Boat Profile Page — TRD Sections 3.2, 4.2, 4.6, 5.2–5.5, 6.2, 6.4, 6.5, 6.6
 *
 * Tabs:
 *  Overview    — specs, alerts, health score (TRD 4.6), quick stats
 *  Components  — ComponentManager (CRUD, health scoring)
 *  Service     — service history timeline
 *  Documents   — maintenance docs with upload modal
 *  Analytics   — value & cost charts
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ship, Settings, FileText, BarChart2, AlertTriangle,
  Clock, MapPin, Calendar, DollarSign, ArrowLeft, Wrench,
  Download, Upload, ChevronRight, Plus, Trash2,
  Anchor, Info, CheckCircle
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { useBoatStore } from '../store/boatStore';
import { Tabs } from '../components/ui/Tabs';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Timeline } from '../components/ui/Timeline';
import { ComponentManager } from '../components/boats/ComponentManager';
import { MaintenanceUploadModal } from '../components/boats/MaintenanceUploadModal';
import { valueHistoryData, maintenanceCostData } from '../data/mockData';
import { calculateVesselHealth, getBand } from '../utils/healthScore';
import type { MaintenanceDocument } from '../types';
import { SERVICE_TYPE_LABELS, BOAT_TYPE_LABELS } from '../types';

// ─── Tab definitions ──────────────────────────────────────────────────────────

const tabs = [
  { id: 'overview',    label: 'Overview',       icon: <Ship size={14} /> },
  { id: 'components',  label: 'Components',     icon: <Settings size={14} /> },
  { id: 'service',     label: 'Service History', icon: <Wrench size={14} /> },
  { id: 'documents',   label: 'Documents',      icon: <FileText size={14} /> },
  { id: 'analytics',   label: 'Analytics',      icon: <BarChart2 size={14} /> },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (v: number) => `$${(v / 1000).toFixed(0)}k`;

const docTypeIcon = (mimeType: string, serviceType: string) => {
  if (mimeType?.startsWith('image/')) return '🖼️';
  const icons: Record<string, string> = {
    survey: '🔍',
    engine_service: '⚙️',
    hull_maintenance: '⚓',
    electrical: '⚡',
    rigging: '🪢',
    sails: '⛵',
    safety_equipment: '🦺',
    winterisation: '❄️',
    commissioning: '✅',
    electronics: '📡',
    structural_repair: '🔨',
    cosmetic: '✨',
    fuel_system: '⛽',
    navigation: '🧭',
    other: '📄',
    Registration: '📋',
    Insurance: '🛡️',
    Survey: '🔍',
    Maintenance: '🔧',
    Manual: '📖',
  };
  return icons[serviceType] || '📄';
};

const formatFileSize = (bytes: number): string => {
  if (!bytes) return '—';
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

// ─── Vessel Health Score Widget ───────────────────────────────────────────────

const HealthScoreWidget: React.FC<{ boatId: string; components: import('../types').BoatComponent[] }> = ({ boatId, components }) => {
  const vesselHealth = calculateVesselHealth(boatId, components);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (vesselHealth.score / 100) * circumference;

  const statusCounts = {
    good: vesselHealth.components.filter(c => c.score >= 70).length,
    fair: vesselHealth.components.filter(c => c.score >= 20 && c.score < 70).length,
    critical: vesselHealth.components.filter(c => c.score < 20).length,
  };

  return (
    <Card className="text-center">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-navy-500">Health Score</h3>
        <span className="text-xs text-gray-400 font-normal">TRD §4.6</span>
      </div>

      <div className="relative inline-flex items-center justify-center">
        <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
          <circle cx="60" cy="60" r="45" fill="none" stroke="#f3f4f6" strokeWidth="10" />
          <circle
            cx="60" cy="60" r="45" fill="none"
            stroke={vesselHealth.bandColor}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-heading font-bold" style={{ color: vesselHealth.bandColor }}>
            {vesselHealth.score}
          </span>
          <span className="text-xs text-gray-400">/ 100</span>
        </div>
      </div>

      <div className="mt-2 mb-4">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
          style={{ backgroundColor: `${vesselHealth.bandColor}20`, color: vesselHealth.bandColor }}
        >
          {vesselHealth.bandLabel}
        </span>
      </div>

      <div className="space-y-2">
        {[
          { label: 'Current', count: statusCounts.good, color: 'bg-teal-500' },
          { label: 'Attention', count: statusCounts.fair, color: 'bg-amber-500' },
          { label: 'Critical', count: statusCounts.critical, color: 'bg-red-500' },
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
              <span className="text-gray-500">{item.label}</span>
            </div>
            <span className="font-semibold text-navy-500">{item.count}</span>
          </div>
        ))}
      </div>

      {/* TRD: score breakdown tooltip */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 leading-relaxed">
          Score = avg of all component scores.
          Overdue &gt;90d = 0 · Overdue 30–90d = 20 · Overdue &lt;30d = 40 · Due soon = 70 · Current = 100
        </p>
      </div>
    </Card>
  );
};

// ─── Specs Source Badge ────────────────────────────────────────────────────────

const SpecsSourceBadge: React.FC<{ source?: string }> = ({ source }) => {
  if (!source) return null;
  const config: Record<string, { label: string; className: string }> = {
    api:    { label: 'AI Autofilled', className: 'bg-teal-50 text-teal-600' },
    cache:  { label: 'Cached Specs',  className: 'bg-ocean-50 text-ocean-600' },
    manual: { label: 'Manual Entry',  className: 'bg-gray-100 text-gray-500' },
  };
  const c = config[source] || config.manual;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.className}`}>
      {source === 'api' || source === 'cache' ? '✨' : '✏️'} {c.label}
    </span>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const BoatProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { boats, selectBoat, selectedBoat, deleteDocument } = useBoatStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  useEffect(() => {
    if (id) selectBoat(id);
  }, [id, selectBoat]);

  const boat = selectedBoat || boats.find(b => b.id === id);

  if (!boat) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <Ship size={48} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-heading font-semibold text-navy-500">Boat not found</h2>
          <Link to="/dashboard" className="btn-ocean mt-4 inline-flex">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  // ── TRD §4.6 Health Score ──────────────────────────────────────────────────
  const vesselHealth = calculateVesselHealth(boat.id, boat.components);

  // Active documents (non-deleted)
  const activeDocuments = (boat.documents as MaintenanceDocument[]).filter(d => !d.deletedAt);

  const timelineItems = boat.serviceHistory.map(s => ({
    id: s.id,
    date: new Date(s.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    title: s.type,
    description: s.description,
    status: s.status,
    provider: s.provider,
    cost: s.cost,
  }));

  const chartData = valueHistoryData.map(d => ({
    month: d.month,
    value: boat.id === 'boat-1' ? d.seaBreeze : boat.id === 'boat-2' ? d.nautilus : d.blueHorizon,
  }));

  const totalMaintenance = boat.serviceHistory
    .filter(s => s.status === 'completed')
    .reduce((sum, s) => sum + s.cost, 0);

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Hero */}
      <div className="relative h-72 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-600 to-ocean-600" />
        {(boat.photoUrl || boat.image) && (
          <img
            src={boat.photoUrl || boat.image}
            alt={boat.name}
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy-600/80 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-8 max-w-7xl mx-auto">
          <Link to="/dashboard" className="flex items-center gap-2 text-white/70 hover:text-white text-sm mb-4 w-fit transition-colors">
            <ArrowLeft size={16} /> Back to Fleet
          </Link>
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-4xl font-heading font-bold text-white">{boat.name}</h1>
                <Badge variant={
                  vesselHealth.band === 'needs_attention' ? 'critical' :
                  vesselHealth.band === 'fair' ? 'attention' : 'good'
                }>
                  {vesselHealth.bandLabel}
                </Badge>
                <SpecsSourceBadge source={boat.specsSource} />
              </div>
              <p className="text-white/70 text-lg">
                {boat.year} {boat.make} {boat.model}
                {boat.lengthOverall && ` · ${boat.lengthOverall}ft`}
                {boat.boatType && ` ${BOAT_TYPE_LABELS[boat.boatType] || boat.type || ''}`}
              </p>
            </div>
            <div className="hidden sm:flex gap-3">
              <Link to="/requests" className="btn-ghost text-sm py-2 px-4">
                <Wrench size={15} /> Request Service
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Tab Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="underline" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 1 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">

              {/* Vessel Specifications */}
              <Card>
                <h3 className="font-heading font-semibold text-navy-500 mb-4">Vessel Specifications</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-5">
                  {[
                    { label: 'Make', value: boat.make },
                    { label: 'Model', value: boat.model },
                    { label: 'Year', value: boat.year },
                    { label: 'Type', value: boat.boatType ? BOAT_TYPE_LABELS[boat.boatType] : (boat.type || '—') },
                    { label: 'Length Overall', value: boat.lengthOverall ? `${boat.lengthOverall} ft` : '—' },
                    { label: 'Beam', value: boat.beam ? `${boat.beam} ft` : '—' },
                    { label: 'Draft', value: boat.draft ? `${boat.draft} ft` : '—' },
                    { label: 'Hull Material', value: boat.hullMaterial || '—' },
                    { label: 'Engine Type', value: boat.engineType || '—' },
                    { label: 'Fuel Type', value: boat.fuelType || '—' },
                    { label: 'Displacement', value: boat.displacement ? `${boat.displacement.toLocaleString()} lbs` : '—' },
                    { label: 'Home Port', value: boat.homePort || '—' },
                    { label: 'Hull ID (HIN)', value: boat.hullId || '—' },
                    { label: 'Registration #', value: boat.registrationNumber || '—' },
                    { label: 'Est. Value', value: (boat.estimatedValue || boat.currentValue) ? `$${(boat.estimatedValue || boat.currentValue || 0).toLocaleString()}` : '—' },
                  ].map(spec => (
                    <div key={spec.label}>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{spec.label}</p>
                      <p className="text-sm font-semibold text-navy-500 mt-0.5">{spec.value}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Active Alerts */}
              {boat.alerts.length > 0 && (
                <Card>
                  <h3 className="font-heading font-semibold text-navy-500 mb-4">Active Alerts</h3>
                  <div className="space-y-3">
                    {boat.alerts.map(alert => (
                      <div
                        key={alert.id}
                        className={`flex items-start gap-3 p-3 rounded-xl ${
                          alert.type === 'critical' ? 'bg-red-50 border border-red-100' :
                          alert.type === 'warning' ? 'bg-amber-50 border border-amber-100' :
                          'bg-blue-50 border border-blue-100'
                        }`}
                      >
                        <AlertTriangle size={16} className={
                          alert.type === 'critical' ? 'text-red-500' :
                          alert.type === 'warning' ? 'text-amber-500' : 'text-blue-500'
                        } />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-navy-500">{alert.message}</p>
                          {alert.component && <p className="text-xs text-gray-500 mt-0.5">Component: {alert.component}</p>}
                          {alert.dueDate && <p className="text-xs text-gray-400 mt-0.5">Due: {new Date(alert.dueDate).toLocaleDateString()}</p>}
                        </div>
                        {alert.type !== 'info' && (
                          <Link to="/marketplace" className="text-xs text-ocean-500 hover:text-ocean-600 whitespace-nowrap flex items-center gap-1">
                            Find help <ChevronRight size={11} />
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* TRD §4.6 Health Score Widget */}
              <HealthScoreWidget boatId={boat.id} components={boat.components} />

              {/* Quick Stats */}
              <Card>
                <h3 className="font-heading font-semibold text-navy-500 mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  {[
                    { icon: Calendar, label: 'Last Service', value: boat.lastService ? new Date(boat.lastService).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A' },
                    { icon: Clock, label: 'Next Service', value: boat.nextService ? new Date(boat.nextService).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not scheduled' },
                    { icon: DollarSign, label: 'Est. Value', value: (boat.estimatedValue || boat.currentValue) ? `$${(boat.estimatedValue || boat.currentValue || 0).toLocaleString()}` : '—' },
                    { icon: MapPin, label: 'Home Port', value: boat.homePort || '—' },
                    { icon: FileText, label: 'Documents', value: `${activeDocuments.length} file${activeDocuments.length !== 1 ? 's' : ''}` },
                    { icon: Settings, label: 'Components', value: `${boat.components.filter(c => !c.deletedAt).length} tracked` },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className="p-2 bg-ocean-50 rounded-lg flex-shrink-0">
                        <Icon size={14} className="text-ocean-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400">{label}</p>
                        <p className="text-sm font-semibold text-navy-500 truncate">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </motion.div>
        )}

        {/* ── Components Tab — TRD §3.3, §4.6, §6.4 ── */}
        {activeTab === 'components' && (
          <motion.div initial={{ opacity: 1 }} animate={{ opacity: 1 }}>
            <ComponentManager boatId={boat.id} />
          </motion.div>
        )}

        {/* ── Service History Tab ── */}
        {activeTab === 'service' && (
          <motion.div initial={{ opacity: 1 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-heading font-semibold text-navy-500">Service History</h3>
                <p className="text-sm text-gray-400 mt-0.5">
                  Total maintenance spend: <span className="font-semibold text-navy-500">${totalMaintenance.toLocaleString()}</span>
                </p>
              </div>
              <Link to="/requests" className="btn-ocean text-sm py-2 px-4 flex items-center gap-2">
                <Plus size={14} /> New Request
              </Link>
            </div>
            <div className="max-w-2xl">
              <Timeline items={timelineItems} />
            </div>
          </motion.div>
        )}

        {/* ── Documents Tab — TRD §3.4, §4.4, §5.5, §6.5 ── */}
        {activeTab === 'documents' && (
          <motion.div initial={{ opacity: 1 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-heading font-semibold text-navy-500">Maintenance Documents</h3>
                <p className="text-sm text-gray-400 mt-0.5">
                  {activeDocuments.length} document{activeDocuments.length !== 1 ? 's' : ''} · {' '}
                  {(activeDocuments.reduce((sum, d) => sum + (d.fileSize || 0), 0) / 1048576).toFixed(1)} MB used
                </p>
              </div>
              <button
                onClick={() => setUploadModalOpen(true)}
                className="btn-ocean text-sm py-2 px-4 flex items-center gap-2"
              >
                <Upload size={14} /> Add Record
              </button>
            </div>

            {activeDocuments.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
                <FileText size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400 text-sm mb-4">No documents yet</p>
                <button onClick={() => setUploadModalOpen(true)} className="btn-ocean text-sm py-2 px-4">
                  <Upload size={14} /> Upload First Document
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeDocuments.map((doc) => {
                  const docAny = doc as MaintenanceDocument;
                  const displayName = docAny.fileName || docAny.name || 'Document';
                  const displayType = docAny.serviceType ? (SERVICE_TYPE_LABELS[docAny.serviceType] || docAny.serviceType) : (docAny.type || '—');
                  const displaySize = docAny.fileSize ? formatFileSize(docAny.fileSize) : (docAny.size || '—');
                  const displayDate = docAny.serviceDate || (docAny.uploadDate ? docAny.uploadDate : docAny.createdAt?.split('T')[0]);

                  return (
                    <Card key={doc.id} hover className="group">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl flex-shrink-0">
                          {docTypeIcon(docAny.mimeType || '', docAny.serviceType || docAny.type || '')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-navy-500 truncate">{displayName}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{displayType}</p>
                          <p className="text-xs text-gray-400">
                            {displaySize}
                            {displayDate && ` · ${new Date(displayDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                          </p>
                          {docAny.serviceProvider && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{docAny.serviceProvider}</p>
                          )}
                          {docAny.notes && (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2 italic">{docAny.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <button
                          className="flex items-center gap-1.5 text-xs text-ocean-500 hover:text-ocean-600 font-medium"
                          title="Download (simulated)"
                        >
                          <Download size={13} /> Download
                        </button>
                        <button
                          onClick={() => deleteDocument(boat.id, doc.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete document"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Analytics Tab ── */}
        {activeTab === 'analytics' && (
          <motion.div initial={{ opacity: 1 }} animate={{ opacity: 1 }} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Purchase Price</p>
                <p className="text-2xl font-heading font-bold text-navy-500 mt-1">
                  ${(boat.purchasePrice || 0).toLocaleString()}
                </p>
              </Card>
              <Card>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Estimated Value</p>
                <p className="text-2xl font-heading font-bold text-teal-500 mt-1">
                  ${(boat.estimatedValue || boat.currentValue || 0).toLocaleString()}
                </p>
              </Card>
              <Card>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Depreciation</p>
                <p className="text-2xl font-heading font-bold text-red-500 mt-1">
                  -${((boat.purchasePrice || 0) - (boat.estimatedValue || boat.currentValue || 0)).toLocaleString()}
                </p>
              </Card>
            </div>

            <Card>
              <h3 className="font-heading font-semibold text-navy-500 mb-6">Estimated Value Over Time</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                  <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                  <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Est. Value']} />
                  <Line type="monotone" dataKey="value" stroke="#1A6B9A" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <h3 className="font-heading font-semibold text-navy-500 mb-6">Maintenance Costs (12 months)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={maintenanceCostData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                  <YAxis tickFormatter={(v) => `$${v.toLocaleString()}`} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                  <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Maintenance Cost']} />
                  <Bar dataKey="cost" fill="#0D9B8A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <h3 className="font-heading font-semibold text-navy-500 mb-4">Health Score History</h3>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="text-center">
                  <p className="text-3xl font-heading font-bold" style={{ color: vesselHealth.bandColor }}>
                    {vesselHealth.score}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Current</p>
                </div>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all duration-1000"
                      style={{ width: `${vesselHealth.score}%`, backgroundColor: vesselHealth.bandColor }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">{vesselHealth.bandLabel} · {boat.components.filter(c => !c.deletedAt).length} components tracked</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Maintenance Upload Modal */}
      <AnimatePresence>
        {uploadModalOpen && (
          <MaintenanceUploadModal
            boatId={boat.id}
            onClose={() => setUploadModalOpen(false)}
            onSuccess={() => setActiveTab('documents')}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
