/**
 * Owner Dashboard — TRD §4.6 (health score), §6.6, §3.2 (add boat)
 *
 * Updates:
 * - TRD-compliant health scores (calculateVesselHealth)
 * - "Add Vessel" button launches AddBoatWizard
 * - Fleet overview shows health band labels per TRD
 * - Health bar color uses TRD band colors (green/amber/red)
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ship, Wrench, AlertTriangle, DollarSign, Plus, Calendar,
  ArrowRight, Bell, CheckCircle, Clock, ChevronRight, Sparkles
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useBoatStore } from '../store/boatStore';
import { useServiceStore } from '../store/serviceStore';
import { useMatchStore } from '../store/matchStore';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { AddBoatWizard } from '../components/boats/AddBoatWizard';
import { MatchedProviderPanel } from '../components/matching/MatchedProviderPanel';
import { calculateVesselHealth } from '../utils/healthScore';
import type { Boat } from '../types';

export const OwnerDashboard: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { boats, getBoatsByOwner } = useBoatStore();
  const { requests } = useServiceStore();
  const { ownerNeeds, isComputing, computeMatchesForOwner } = useMatchStore();

  const [addBoatOpen, setAddBoatOpen] = useState(false);

  // Filter active boats for current user
  const myBoats = currentUser
    ? getBoatsByOwner(currentUser.id)
    : boats.filter(b => !b.deletedAt);

  // Compute smart matches once boats are loaded
  useEffect(() => {
    if (myBoats.length > 0) {
      computeMatchesForOwner(myBoats);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myBoats.length]);

  // Pick the single highest-urgency need to feature in the Smart Suggestions panel
  const topNeed = ownerNeeds.find(n => n.urgencyLevel === 'critical')
    ?? ownerNeeds.find(n => n.urgencyLevel === 'high')
    ?? ownerNeeds.find(n => n.urgencyLevel === 'medium')
    ?? ownerNeeds[0];

  const activeRequests = requests.filter(r =>
    ['pending', 'matched', 'scheduled', 'in_progress'].includes(r.status)
  );

  const allAlerts = myBoats.flatMap(b => b.alerts);
  const criticalAlerts = allAlerts.filter(a => a.type === 'critical');

  const nextService = myBoats
    .filter(b => b.nextService)
    .sort((a, b) => new Date(a.nextService!).getTime() - new Date(b.nextService!).getTime())[0];

  const totalSpentThisYear = myBoats
    .flatMap(b => b.serviceHistory)
    .filter(s => s.status === 'completed' && s.date.startsWith('2024'))
    .reduce((sum, s) => sum + s.cost, 0);

  // TRD §4.6: use calculateVesselHealth for fleet status
  const getBoatStatusVariant = (boat: Boat) => {
    const health = calculateVesselHealth(boat.id, boat.components);
    if (health.band === 'needs_attention') return 'critical';
    if (health.band === 'fair') return 'attention';
    return 'good';
  };

  const recentActivity = myBoats
    .flatMap(b => b.serviceHistory.map(s => ({ ...s, boatName: b.name })))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const upcomingServices = requests
    .filter(r => r.status === 'scheduled')
    .concat(
      myBoats.flatMap(b =>
        b.serviceHistory
          .filter(s => s.status === 'scheduled')
          .map(s => ({
            id: s.id,
            boatId: '',
            boatName: b.name,
            ownerId: 'user-1',
            serviceType: s.type,
            description: s.description,
            status: 'scheduled' as const,
            createdAt: s.date,
            scheduledDate: s.date,
            cost: s.cost,
          }))
      )
    );

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Critical Alert Banner */}
      {criticalAlerts.length > 0 && (
        <div className="bg-red-500 text-white py-3 px-4">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <AlertTriangle size={16} className="flex-shrink-0" />
            <p className="text-sm font-medium">
              {criticalAlerts[0].message} — Immediate attention required
            </p>
            <Link to="/boats/boat-2" className="ml-auto text-xs underline whitespace-nowrap">
              View Details
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-heading font-bold text-navy-500">
              Good morning, {currentUser?.firstName || currentUser?.name?.split(' ')[0]}
            </h1>
            <p className="text-gray-500 mt-1">Here's what's happening with your fleet today.</p>
          </div>
          <div className="flex gap-3">
            <Link to="/requests" className="btn-outline text-sm py-2.5 px-4">
              <Plus size={16} /> New Request
            </Link>
            <Link to="/marketplace" className="btn-ocean text-sm py-2.5 px-4">
              Find Providers
            </Link>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <StatCard
            label="Total Vessels"
            value={myBoats.length}
            subtitle="In your fleet"
            icon={<Ship size={20} />}
          />
          <StatCard
            label="Active Requests"
            value={activeRequests.length}
            subtitle="In progress"
            icon={<Wrench size={20} />}
            trend={{ value: 12, label: 'vs last month' }}
          />
          <StatCard
            label="Next Service"
            value={nextService ? new Date(nextService.nextService!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'None'}
            subtitle={nextService?.name}
            icon={<Calendar size={20} />}
          />
          <StatCard
            label="Spent This Year"
            value={`$${(totalSpentThisYear / 1000).toFixed(1)}k`}
            subtitle="2024 maintenance"
            icon={<DollarSign size={20} />}
          />
        </motion.div>

        {/* Smart Suggestions Panel */}
        {(isComputing || topNeed) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-ocean-500" />
              <h2 className="text-lg font-heading font-semibold text-navy-500">Smart Suggestions</h2>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">AI-powered</span>
            </div>
            {isComputing && !topNeed ? (
              <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-5 bg-gray-200 rounded w-48" />
                  <div className="h-5 bg-gray-200 rounded-full w-20" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[0,1,2].map(i => (
                    <div key={i} className="bg-white rounded-xl p-4 space-y-2">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 bg-gray-100 rounded w-24" />
                          <div className="h-3 bg-gray-100 rounded w-16" />
                        </div>
                      </div>
                      <div className="h-8 bg-gray-100 rounded-lg" />
                    </div>
                  ))}
                </div>
              </div>
            ) : topNeed ? (
              <MatchedProviderPanel need={topNeed} defaultOpen showViewAll />
            ) : null}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Fleet Overview */}
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-heading font-semibold text-navy-500">Fleet Overview</h2>
              {/* TRD §3.2: AddBoatWizard trigger */}
              <button
                onClick={() => setAddBoatOpen(true)}
                className="text-sm text-ocean-500 font-medium hover:text-ocean-600 flex items-center gap-1 transition-colors"
              >
                <Plus size={14} /> Add Vessel
              </button>
            </div>

            {myBoats.length === 0 ? (
              <div
                onClick={() => setAddBoatOpen(true)}
                className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center cursor-pointer hover:border-ocean-300 hover:bg-gray-50 transition-all"
              >
                <Ship size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium mb-1">No vessels yet</p>
                <p className="text-sm text-gray-400 mb-4">Add your first boat to get started</p>
                <button className="btn-ocean text-sm py-2 px-4">
                  <Plus size={14} /> Add Your First Vessel
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myBoats.map((boat) => {
                  // TRD §4.6: calculateVesselHealth for each boat
                  const health = calculateVesselHealth(boat.id, boat.components);
                  const statusVariant = getBoatStatusVariant(boat);

                  return (
                    <Link key={boat.id} to={`/boats/${boat.id}`}>
                      <Card hover className="transition-all">
                        <div className="flex items-start gap-4">
                          <div className="w-20 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-ocean-500 to-navy-500">
                            {(boat.photoUrl || boat.image) && (
                              <img
                                src={boat.photoUrl || boat.image}
                                alt={boat.name}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-heading font-semibold text-navy-500">{boat.name}</h3>
                                <p className="text-sm text-gray-500">
                                  {boat.year} {boat.make} {boat.model}
                                  {(boat.lengthOverall || boat.length) && ` · ${boat.lengthOverall || boat.length}'`}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">{boat.homePort}</p>
                              </div>
                              <Badge variant={statusVariant} dot>
                                {health.bandLabel}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-3">
                              <div className="flex items-center gap-2 flex-1">
                                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                  <div
                                    className="h-1.5 rounded-full transition-all duration-500"
                                    style={{
                                      width: `${health.score}%`,
                                      backgroundColor: health.bandColor,
                                    }}
                                  />
                                </div>
                                <span className="text-xs font-semibold whitespace-nowrap" style={{ color: health.bandColor }}>
                                  {health.score} Health
                                </span>
                              </div>
                              {boat.alerts.length > 0 && (
                                <div className="flex items-center gap-1 text-xs text-amber-600">
                                  <Bell size={12} />
                                  {boat.alerts.length} alert{boat.alerts.length > 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-1" />
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {/* Alerts */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold text-navy-500">Alerts</h3>
                {allAlerts.length > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    criticalAlerts.length > 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {allAlerts.length}
                  </span>
                )}
              </div>
              {allAlerts.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle size={24} className="text-teal-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">All clear — no alerts</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allAlerts.slice(0, 4).map((alert) => (
                    <div key={alert.id} className="flex items-start gap-3">
                      <div className={`mt-0.5 flex-shrink-0 ${
                        alert.type === 'critical' ? 'text-red-500' :
                        alert.type === 'warning' ? 'text-amber-500' : 'text-ocean-500'
                      }`}>
                        {alert.type === 'critical' ? <AlertTriangle size={14} /> :
                         alert.type === 'warning' ? <Bell size={14} /> :
                         <CheckCircle size={14} />}
                      </div>
                      <div>
                        <p className="text-sm text-navy-500 font-medium leading-snug">{alert.message}</p>
                        {alert.dueDate && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Due: {new Date(alert.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Upcoming Services */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold text-navy-500">Upcoming</h3>
                <Link to="/requests" className="text-xs text-ocean-500 hover:text-ocean-600">View all</Link>
              </div>
              {upcomingServices.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-3">No upcoming services</p>
              ) : (
                <div className="space-y-3">
                  {upcomingServices.slice(0, 3).map((svc) => (
                    <div key={svc.id} className="flex items-start gap-3">
                      <div className="p-2 bg-ocean-50 rounded-lg flex-shrink-0">
                        <Clock size={14} className="text-ocean-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-navy-500 leading-snug">{svc.serviceType}</p>
                        <p className="text-xs text-gray-400">{svc.boatName}</p>
                        {svc.scheduledDate && (
                          <p className="text-xs text-ocean-500 mt-0.5">
                            {new Date(svc.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Quick Actions */}
            <Card>
              <h3 className="font-heading font-semibold text-navy-500 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                {[
                  { label: 'Add a New Vessel', action: () => setAddBoatOpen(true), icon: Ship },
                  { label: 'Request a Service', to: '/requests', icon: Wrench },
                  { label: 'Find a Provider', to: '/marketplace', icon: ArrowRight },
                  { label: 'View Messages', to: '/messages', icon: ArrowRight },
                ].map((item) => (
                  item.action ? (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group text-left"
                    >
                      <item.icon size={16} className="text-ocean-500" />
                      <span className="text-sm text-navy-500 font-medium flex-1">{item.label}</span>
                      <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-400" />
                    </button>
                  ) : (
                    <Link
                      key={item.label}
                      to={item.to!}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
                    >
                      <item.icon size={16} className="text-ocean-500" />
                      <span className="text-sm text-navy-500 font-medium flex-1">{item.label}</span>
                      <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-400" />
                    </Link>
                  )
                ))}
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-heading font-semibold text-navy-500">Recent Activity</h2>
            <Link to="/requests" className="text-sm text-ocean-500 font-medium hover:text-ocean-600 flex items-center gap-1">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <Card>
            <div className="divide-y divide-gray-50">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${
                    activity.status === 'completed' ? 'bg-teal-50' :
                    activity.status === 'scheduled' ? 'bg-ocean-50' : 'bg-amber-50'
                  }`}>
                    {activity.status === 'completed'
                      ? <CheckCircle size={14} className="text-teal-500" />
                      : <Clock size={14} className="text-ocean-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy-500">{activity.type}</p>
                    <p className="text-xs text-gray-400">{activity.boatName} · {activity.provider}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {activity.cost > 0 && (
                      <p className="text-sm font-semibold text-navy-500">${activity.cost.toLocaleString()}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      {new Date(activity.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <Badge variant={
                    activity.status === 'completed' ? 'good' :
                    activity.status === 'scheduled' ? 'ocean' : 'attention'
                  }>
                    {activity.status}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Add Boat Wizard */}
      <AnimatePresence>
        {addBoatOpen && <AddBoatWizard onClose={() => setAddBoatOpen(false)} />}
      </AnimatePresence>
    </div>
  );
};
