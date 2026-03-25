import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Ship, Settings, FileText, BarChart2, AlertTriangle,
  Clock, MapPin, Calendar, DollarSign, ArrowLeft, Wrench,
  Download, Upload, ChevronRight
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
import { valueHistoryData, maintenanceCostData } from '../data/mockData';

const tabs = [
  { id: 'overview', label: 'Overview', icon: <Ship size={14} /> },
  { id: 'components', label: 'Components', icon: <Settings size={14} /> },
  { id: 'service', label: 'Service History', icon: <Wrench size={14} /> },
  { id: 'documents', label: 'Documents', icon: <FileText size={14} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={14} /> },
];

const docTypeIcon = (type: string) => {
  const icons: Record<string, string> = {
    Registration: '📋',
    Insurance: '🛡️',
    Survey: '🔍',
    Maintenance: '🔧',
    Manual: '📖',
  };
  return icons[type] || '📄';
};

const formatCurrency = (v: number) => `$${(v / 1000).toFixed(0)}k`;

export const BoatProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { boats, selectBoat, selectedBoat } = useBoatStore();
  const [activeTab, setActiveTab] = useState('overview');

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

  const healthScore = (() => {
    const criticalCount = boat.components.filter(c => c.status === 'critical').length;
    const attentionCount = boat.components.filter(c => c.status === 'attention').length;
    const total = boat.components.length;
    return Math.round(((total - criticalCount * 2 - attentionCount) / total) * 100);
  })();

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (healthScore / 100) * circumference;
  const healthColor = healthScore >= 80 ? '#0D9B8A' : healthScore >= 60 ? '#C9943A' : '#EF4444';

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

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Hero */}
      <div className="relative h-72 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-600 to-ocean-600" />
        {boat.image && (
          <img
            src={boat.image}
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
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-heading font-bold text-white">{boat.name}</h1>
                <Badge variant={boat.alerts.some(a => a.type === 'critical') ? 'critical' : boat.alerts.some(a => a.type === 'warning') ? 'attention' : 'good'}>
                  {boat.alerts.some(a => a.type === 'critical') ? 'Critical' : boat.alerts.some(a => a.type === 'warning') ? 'Needs Attention' : 'Good Condition'}
                </Badge>
              </div>
              <p className="text-white/70 text-lg">{boat.year} {boat.make} {boat.model} · {boat.length}ft {boat.type}</p>
            </div>
            <div className="hidden sm:flex gap-3">
              <Link to="/requests" className="btn-ghost text-sm py-2 px-4">
                <Wrench size={15} /> Request Service
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="underline" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 1 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Key Specs */}
              <Card>
                <h3 className="font-heading font-semibold text-navy-500 mb-4">Vessel Specifications</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4">
                  {[
                    { label: 'Make', value: boat.make },
                    { label: 'Model', value: boat.model },
                    { label: 'Year', value: boat.year },
                    { label: 'Length', value: `${boat.length} ft` },
                    { label: 'Type', value: boat.type },
                    { label: 'Home Port', value: boat.homePort },
                    { label: 'Hull ID', value: boat.hullId },
                    { label: 'Registration', value: boat.registrationNumber },
                    { label: 'Est. Value', value: `$${(boat.currentValue || 0).toLocaleString()}` },
                  ].map(spec => (
                    <div key={spec.label}>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{spec.label}</p>
                      <p className="text-sm font-semibold text-navy-500 mt-0.5">{spec.value}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Alerts */}
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
                        <div>
                          <p className="text-sm font-medium text-navy-500">{alert.message}</p>
                          {alert.component && <p className="text-xs text-gray-500 mt-0.5">Component: {alert.component}</p>}
                          {alert.dueDate && <p className="text-xs text-gray-400 mt-0.5">Due: {new Date(alert.dueDate).toLocaleDateString()}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Health Score */}
            <div className="space-y-6">
              <Card className="text-center">
                <h3 className="font-heading font-semibold text-navy-500 mb-6">Health Score</h3>
                <div className="relative inline-flex items-center justify-center">
                  <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
                    <circle cx="60" cy="60" r="45" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                    <circle
                      cx="60" cy="60" r="45" fill="none"
                      stroke={healthColor}
                      strokeWidth="10"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 1s ease' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-heading font-bold" style={{ color: healthColor }}>{healthScore}</span>
                    <span className="text-xs text-gray-400">/ 100</span>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {[
                    { label: 'Good', count: boat.components.filter(c => c.status === 'good').length, color: 'bg-teal-500' },
                    { label: 'Attention', count: boat.components.filter(c => c.status === 'attention').length, color: 'bg-amber-500' },
                    { label: 'Critical', count: boat.components.filter(c => c.status === 'critical').length, color: 'bg-red-500' },
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
              </Card>

              {/* Quick Stats */}
              <Card>
                <h3 className="font-heading font-semibold text-navy-500 mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  {[
                    { icon: Calendar, label: 'Last Service', value: boat.lastService ? new Date(boat.lastService).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A' },
                    { icon: Clock, label: 'Next Service', value: boat.nextService ? new Date(boat.nextService).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not scheduled' },
                    { icon: DollarSign, label: 'Current Value', value: `$${(boat.currentValue || 0).toLocaleString()}` },
                    { icon: MapPin, label: 'Home Port', value: boat.homePort },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className="p-2 bg-ocean-50 rounded-lg">
                        <Icon size={14} className="text-ocean-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">{label}</p>
                        <p className="text-sm font-semibold text-navy-500">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Components Tab */}
        {activeTab === 'components' && (
          <motion.div initial={{ opacity: 1 }} animate={{ opacity: 1 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {boat.components.map((comp) => (
                <Card key={comp.id} hover>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-heading font-semibold text-navy-500">{comp.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{comp.category}</p>
                    </div>
                    <Badge variant={comp.status} dot>
                      {comp.status === 'good' ? 'Good' : comp.status === 'attention' ? 'Attention' : 'Critical'}
                    </Badge>
                  </div>
                  {comp.notes && <p className="text-sm text-gray-500 mb-3 leading-relaxed">{comp.notes}</p>}
                  <div className="flex gap-4 text-xs">
                    <div>
                      <p className="text-gray-400">Last Checked</p>
                      <p className="font-medium text-navy-500 mt-0.5">
                        {new Date(comp.lastChecked).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Next Due</p>
                      <p className={`font-medium mt-0.5 ${comp.status !== 'good' ? 'text-amber-500' : 'text-navy-500'}`}>
                        {new Date(comp.nextDue).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    {comp.status !== 'good' && (
                      <div className="ml-auto">
                        <Link to="/marketplace" className="text-xs text-ocean-500 font-medium hover:text-ocean-600 flex items-center gap-1">
                          Find Provider <ChevronRight size={12} />
                        </Link>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Service History Tab */}
        {activeTab === 'service' && (
          <motion.div initial={{ opacity: 1 }} animate={{ opacity: 1 }}>
            <div className="max-w-2xl">
              <Timeline items={timelineItems} />
            </div>
          </motion.div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <motion.div initial={{ opacity: 1 }} animate={{ opacity: 1 }}>
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-500">{boat.documents.length} documents</p>
              <button className="btn-ocean text-sm py-2 px-4">
                <Upload size={15} /> Upload Document
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {boat.documents.map((doc) => (
                <Card key={doc.id} hover className="flex items-center gap-4">
                  <div className="text-3xl flex-shrink-0">{docTypeIcon(doc.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy-500 truncate">{doc.name}</p>
                    <p className="text-xs text-gray-400">{doc.type} · {doc.size}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(doc.uploadDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-ocean-500 transition-colors flex-shrink-0">
                    <Download size={14} />
                  </button>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <motion.div initial={{ opacity: 1 }} animate={{ opacity: 1 }} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Purchase Price</p>
                <p className="text-2xl font-heading font-bold text-navy-500 mt-1">${(boat.purchasePrice || 0).toLocaleString()}</p>
              </Card>
              <Card>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Current Value</p>
                <p className="text-2xl font-heading font-bold text-teal-500 mt-1">${(boat.currentValue || 0).toLocaleString()}</p>
              </Card>
              <Card>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Depreciation</p>
                <p className="text-2xl font-heading font-bold text-red-500 mt-1">
                  -${((boat.purchasePrice || 0) - (boat.currentValue || 0)).toLocaleString()}
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
          </motion.div>
        )}
      </div>
    </div>
  );
};
