import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Ship, Wrench, AlertTriangle, DollarSign, Plus, Calendar,
  ArrowRight, Bell, CheckCircle, Clock, ChevronRight
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useBoatStore } from '../store/boatStore';
import { useServiceStore } from '../store/serviceStore';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';

export const OwnerDashboard: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { boats } = useBoatStore();
  const { requests } = useServiceStore();

  const activeRequests = requests.filter(r => ['pending', 'matched', 'scheduled', 'in_progress'].includes(r.status));
  const allAlerts = boats.flatMap(b => b.alerts);
  const criticalAlerts = allAlerts.filter(a => a.type === 'critical');
  const nextService = boats
    .filter(b => b.nextService)
    .sort((a, b) => new Date(a.nextService!).getTime() - new Date(b.nextService!).getTime())[0];

  const totalSpentThisYear = boats.flatMap(b => b.serviceHistory)
    .filter(s => s.status === 'completed' && s.date.startsWith('2024'))
    .reduce((sum, s) => sum + s.cost, 0);

  const getStatusColor = (boat: typeof boats[0]) => {
    const hasCritical = boat.alerts.some(a => a.type === 'critical');
    const hasWarning = boat.alerts.some(a => a.type === 'warning');
    if (hasCritical) return 'critical';
    if (hasWarning) return 'attention';
    return 'good';
  };

  const getHealthScore = (boat: typeof boats[0]) => {
    const criticalCount = boat.components.filter(c => c.status === 'critical').length;
    const attentionCount = boat.components.filter(c => c.status === 'attention').length;
    const total = boat.components.length;
    return Math.round(((total - criticalCount * 2 - attentionCount) / total) * 100);
  };

  const recentActivity = boats.flatMap(b =>
    b.serviceHistory.map(s => ({ ...s, boatName: b.name }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  const upcomingServices = requests
    .filter(r => r.status === 'scheduled')
    .concat(
      boats.flatMap(b => b.serviceHistory.filter(s => s.status === 'scheduled').map(s => ({
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
      })))
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
              Good morning, {currentUser?.name.split(' ')[0]}
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
            value={boats.length}
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
              <Link to="/marketplace" className="text-sm text-ocean-500 font-medium hover:text-ocean-600 flex items-center gap-1">
                Add Vessel <Plus size={14} />
              </Link>
            </div>
            <div className="space-y-4">
              {boats.map((boat) => {
                const status = getStatusColor(boat);
                const health = getHealthScore(boat);
                return (
                  <Link key={boat.id} to={`/boats/${boat.id}`}>
                    <Card hover className="transition-all">
                      <div className="flex items-start gap-4">
                        <div className="w-20 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-ocean-500 to-navy-500">
                          {boat.image && (
                            <img src={boat.image} alt={boat.name} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-heading font-semibold text-navy-500">{boat.name}</h3>
                              <p className="text-sm text-gray-500">{boat.year} {boat.make} {boat.model} · {boat.length}'</p>
                              <p className="text-xs text-gray-400 mt-0.5">{boat.homePort}</p>
                            </div>
                            <Badge variant={status} dot>
                              {status === 'good' ? 'Good' : status === 'attention' ? 'Needs Attention' : 'Critical'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-2 flex-1">
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${health >= 80 ? 'bg-teal-500' : health >= 60 ? 'bg-gold-500' : 'bg-red-500'}`}
                                  style={{ width: `${health}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-navy-500 whitespace-nowrap">
                                {health}% Health
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
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">
                  {allAlerts.length}
                </span>
              </div>
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
            </Card>

            {/* Upcoming Services */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold text-navy-500">Upcoming</h3>
                <Link to="/requests" className="text-xs text-ocean-500 hover:text-ocean-600">View all</Link>
              </div>
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
            </Card>

            {/* Quick Actions */}
            <Card>
              <h3 className="font-heading font-semibold text-navy-500 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                {[
                  { label: 'Request a Service', to: '/requests', icon: Wrench },
                  { label: 'Find a Provider', to: '/marketplace', icon: Ship },
                  { label: 'Upload Document', to: '/documents', icon: ArrowRight },
                  { label: 'View Messages', to: '/messages', icon: ArrowRight },
                ].map((action) => (
                  <Link
                    key={action.label}
                    to={action.to}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <action.icon size={16} className="text-ocean-500" />
                    <span className="text-sm text-navy-500 font-medium flex-1">{action.label}</span>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-400 transition-colors" />
                  </Link>
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
                    activity.status === 'scheduled' ? 'bg-ocean-50' : 'bg-gold-50'
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
                  <Badge variant={activity.status === 'completed' ? 'good' : activity.status === 'scheduled' ? 'ocean' : 'attention'}>
                    {activity.status}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
