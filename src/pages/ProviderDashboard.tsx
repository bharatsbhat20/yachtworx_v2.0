import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  DollarSign, Star, Users, TrendingUp, Clock, CheckCircle,
  AlertCircle, ChevronRight, MessageSquare, Settings
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { StarRating } from '../components/ui/StarRating';
import { ProgressBar } from '../components/ui/ProgressBar';

const revenueData = [
  { month: 'Mar', revenue: 3200 },
  { month: 'Apr', revenue: 3850 },
  { month: 'May', revenue: 4100 },
  { month: 'Jun', revenue: 5200 },
  { month: 'Jul', revenue: 4800 },
  { month: 'Aug', revenue: 5600 },
  { month: 'Sep', revenue: 4900 },
  { month: 'Oct', revenue: 5100 },
  { month: 'Nov', revenue: 4200 },
  { month: 'Dec', revenue: 3900 },
  { month: 'Jan', revenue: 3600 },
  { month: 'Feb', revenue: 4280 },
];

const activeJobs = [
  { id: 'j1', boat: 'Nautilus', client: 'James Harrison', service: 'Generator Repair (Onan 8.0)', status: 'in_progress', date: '2024-03-05', value: 380 },
  { id: 'j2', boat: 'Silver Lining', client: 'Thomas Walsh', service: 'Annual Engine Service', status: 'scheduled', date: '2024-03-08', value: 450 },
  { id: 'j3', boat: 'Wild Atlantic', client: 'Claire Murphy', service: 'DC Electrical Inspection', status: 'scheduled', date: '2024-03-10', value: 250 },
  { id: 'j4', boat: 'Meridian', client: 'Robert Cho', service: 'Solar & Lithium Battery Install', status: 'matched', date: '2024-03-15', value: 2800 },
];

const recentReviews = [
  { client: 'James Harrison', boat: 'Sea Breeze', rating: 5, text: 'Sarah diagnosed the issue in under an hour. Professional, thorough, and fair pricing. Highly recommend!', date: '2024-02-20' },
  { client: 'Patricia Langford', boat: 'Lady Blue', rating: 5, text: 'Installed our complete Victron solar setup perfectly. Clean wiring, explained everything clearly.', date: '2024-02-12' },
  { client: 'David Kim', boat: 'Wanderlust', rating: 4, text: 'Good work on the NMEA 2000 network. Took slightly longer than estimated but very thorough.', date: '2024-02-05' },
];

const profileCompletionItems = [
  { label: 'Profile photo', done: true },
  { label: 'Business description', done: true },
  { label: 'Service categories', done: true },
  { label: 'Certifications', done: true },
  { label: 'Service pricing', done: false },
  { label: 'Portfolio photos', done: false },
];

const profileCompletion = Math.round(
  (profileCompletionItems.filter(i => i.done).length / profileCompletionItems.length) * 100
);

export const ProviderDashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <Avatar
              src="https://randomuser.me/api/portraits/women/44.jpg"
              alt="Sarah Whitfield"
              size="xl"
            />
            <div>
              <h1 className="text-3xl font-heading font-bold text-navy-500">Sarah Whitfield</h1>
              <p className="text-gray-500">Coastal Electrical Marine · Marina del Rey, CA</p>
              <div className="flex items-center gap-2 mt-1">
                <StarRating rating={4.8} size="sm" />
                <span className="text-sm font-semibold text-navy-500">4.8</span>
                <span className="text-sm text-gray-400">(182 reviews)</span>
                <Badge variant="good" dot>Verified</Badge>
              </div>
            </div>
          </div>
          <Link to="/marketplace" className="btn-ocean text-sm py-2.5 px-4">
            <Settings size={16} /> Edit Profile
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <StatCard label="This Month" value="$4,280" subtitle="Revenue" icon={<DollarSign size={20} />} variant="ocean" />
          <StatCard label="Active Jobs" value={activeJobs.filter(j => j.status !== 'completed').length} subtitle="In pipeline" icon={<Clock size={20} />} />
          <StatCard label="Avg Rating" value="4.8" subtitle="182 reviews" icon={<Star size={20} />} />
          <StatCard label="Completed" value="963" subtitle="Total jobs" icon={<CheckCircle size={20} />} trend={{ value: 8 }} />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Revenue Chart */}
            <motion.div initial={{ opacity: 1, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-heading font-semibold text-navy-500">Revenue (12 months)</h3>
                  <span className="text-sm text-teal-600 font-medium flex items-center gap-1">
                    <TrendingUp size={14} /> +18% YoY
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                    <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                    <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#1A6B9A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>

            {/* Active Jobs */}
            <motion.div initial={{ opacity: 1, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-heading font-semibold text-navy-500">Active Jobs</h2>
                <Link to="/requests" className="text-sm text-ocean-500 font-medium hover:text-ocean-600">View all</Link>
              </div>
              <div className="space-y-3">
                {activeJobs.map((job) => (
                  <Card key={job.id} hover>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-heading font-semibold text-navy-500 text-sm">{job.service}</h4>
                          <Badge variant={
                            job.status === 'in_progress' ? 'attention' :
                            job.status === 'scheduled' ? 'info' : 'ocean'
                          }>
                            {job.status === 'in_progress' ? 'In Progress' :
                             job.status === 'scheduled' ? 'Scheduled' : 'Matched'}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500">{job.client} · {job.boat}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(job.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-heading font-semibold text-navy-500">${job.value.toLocaleString()}</p>
                        <button className="mt-2 text-xs text-ocean-500 hover:text-ocean-600 font-medium flex items-center gap-0.5">
                          Details <ChevronRight size={12} />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>

            {/* Recent Reviews */}
            <motion.div initial={{ opacity: 1, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-heading font-semibold text-navy-500">Recent Reviews</h2>
              </div>
              <div className="space-y-4">
                {recentReviews.map((review, i) => (
                  <Card key={i}>
                    <div className="flex items-start gap-3 mb-2">
                      <Avatar fallback={review.client} size="sm" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-navy-500">{review.client}</p>
                          <span className="text-xs text-gray-400">
                            {new Date(review.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{review.boat}</p>
                      </div>
                    </div>
                    <StarRating rating={review.rating} size="sm" className="mb-2" />
                    <p className="text-sm text-gray-600 italic">"{review.text}"</p>
                  </Card>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right Column */}
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Profile Completion */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold text-navy-500">Profile Completion</h3>
                <span className="text-sm font-bold text-ocean-500">{profileCompletion}%</span>
              </div>
              <ProgressBar value={profileCompletion} color="ocean" className="mb-4" />
              <div className="space-y-2.5">
                {profileCompletionItems.map(item => (
                  <div key={item.label} className="flex items-center gap-2.5">
                    {item.done
                      ? <CheckCircle size={15} className="text-teal-500 flex-shrink-0" />
                      : <div className="w-4 h-4 rounded-full border-2 border-gray-200 flex-shrink-0" />
                    }
                    <span className={`text-sm ${item.done ? 'text-navy-500' : 'text-gray-400'}`}>
                      {item.label}
                    </span>
                    {!item.done && (
                      <button className="ml-auto text-xs text-ocean-500 hover:text-ocean-600 font-medium">
                        Add
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Quick Stats */}
            <Card>
              <h3 className="font-heading font-semibold text-navy-500 mb-4">This Week</h3>
              <div className="space-y-3">
                {[
                  { label: 'Profile Views', value: '47', icon: Users },
                  { label: 'New Inquiries', value: '8', icon: MessageSquare },
                  { label: 'Quotes Sent', value: '5', icon: AlertCircle },
                  { label: 'Jobs Won', value: '3', icon: CheckCircle },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="p-2 bg-ocean-50 rounded-lg">
                      <Icon size={14} className="text-ocean-500" />
                    </div>
                    <span className="text-sm text-gray-500 flex-1">{label}</span>
                    <span className="font-heading font-bold text-navy-500">{value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Rating Breakdown */}
            <Card>
              <h3 className="font-heading font-semibold text-navy-500 mb-4">Rating Breakdown</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-center">
                  <p className="text-4xl font-heading font-bold text-navy-500">4.8</p>
                  <StarRating rating={4.8} size="sm" className="justify-center mt-1" />
                  <p className="text-xs text-gray-400 mt-1">182 reviews</p>
                </div>
                <div className="flex-1 space-y-1.5">
                  {[
                    { stars: 5, count: 145 },
                    { stars: 4, count: 28 },
                    { stars: 3, count: 7 },
                    { stars: 2, count: 2 },
                    { stars: 1, count: 0 },
                  ].map(({ stars, count }) => (
                    <div key={stars} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-3">{stars}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-gold-400"
                          style={{ width: `${(count / 182) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-6 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Messages */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold text-navy-500">Messages</h3>
                <span className="text-xs bg-ocean-500 text-white px-2 py-0.5 rounded-full font-semibold">3 unread</span>
              </div>
              <Link to="/messages" className="btn-ocean w-full justify-center text-sm py-2.5">
                <MessageSquare size={15} /> Open Messages
              </Link>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
