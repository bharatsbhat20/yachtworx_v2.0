/**
 * Marketplace — Module 2
 *
 * Provider discovery + booking entry point.
 * Keeps all existing filter/search/view UI and adds
 * the BookingWizard sheet for instant booking initiation.
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search, SlidersHorizontal, MapPin, Clock, CheckCircle,
  Star, Grid, List, X, CalendarPlus, Sparkles
} from 'lucide-react';
import { useServiceStore } from '../store/serviceStore';
import { useAuthStore } from '../store/authStore';
import { useMatchStore } from '../store/matchStore';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { StarRating } from '../components/ui/StarRating';
import { Avatar } from '../components/ui/Avatar';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BookingWizard } from '../components/booking/BookingWizard';
import { MatchBadge } from '../components/matching/MatchBadge';
import type { ServiceProvider } from '../types';

const categories = [
  'All', 'Engine', 'Electrical', 'Electronics', 'Hull', 'Rigging', 'Sails',
  'Detailing', 'Haul-out', 'Diving', 'Navigation', 'Survey', 'Safety', 'Mechanical',
];

export const Marketplace: React.FC = () => {
  const { providers } = useServiceStore();
  const { currentUser } = useAuthStore();
  const { matchResults } = useMatchStore();
  const user = currentUser;
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'rating' | 'distance' | 'reviews' | 'match'>('rating');
  const [maxDistance, setMaxDistance] = useState(50);
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Build a score lookup: providerId → best match score across all needs
  const matchScoreMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of matchResults) {
      if (!map[r.providerId] || r.matchScore > map[r.providerId]) {
        map[r.providerId] = r.matchScore;
      }
    }
    return map;
  }, [matchResults]);

  const matchBandMap = useMemo(() => {
    const map: Record<string, import('../types').MatchScoreBand> = {};
    for (const r of matchResults) {
      if (!map[r.providerId] || r.matchScore > (matchScoreMap[r.providerId] ?? 0)) {
        map[r.providerId] = r.band;
      }
    }
    return map;
  }, [matchResults, matchScoreMap]);

  const isMatchMode = sortBy === 'match' && Object.keys(matchScoreMap).length > 0;

  // Booking wizard state
  const [bookingProvider, setBookingProvider] = useState<ServiceProvider | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  const isOwner = user?.role === 'owner' || !user;

  const filtered = useMemo(() => {
    let result = providers;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.businessName.toLowerCase().includes(q) ||
        p.categories.some(c => c.toLowerCase().includes(q)) ||
        p.description.toLowerCase().includes(q)
      );
    }
    if (selectedCategory !== 'All') {
      result = result.filter(p =>
        p.categories.some(c => c.toLowerCase().includes(selectedCategory.toLowerCase()))
      );
    }
    if (maxDistance < 50) {
      result = result.filter(p => (p.distance || 0) <= maxDistance);
    }
    if (minRating > 0) {
      result = result.filter(p => p.rating >= minRating);
    }
    return [...result].sort((a, b) => {
      if (sortBy === 'rating')   return b.rating - a.rating;
      if (sortBy === 'distance') return (a.distance || 99) - (b.distance || 99);
      if (sortBy === 'reviews')  return b.reviewCount - a.reviewCount;
      if (sortBy === 'match')    return (matchScoreMap[b.id] ?? 0) - (matchScoreMap[a.id] ?? 0);
      return 0;
    });
  }, [providers, search, selectedCategory, maxDistance, minRating, sortBy]);

  const handleBookNow = (provider: ServiceProvider) => {
    if (!user || user.role !== 'owner') {
      window.location.href = '/auth';
      return;
    }
    setBookingProvider(provider);
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* ── Hero header ── */}
      <div className="bg-navy-500 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-heading font-bold text-white mb-2">Service Marketplace</h1>
            <p className="text-white/60">Find verified marine professionals near you</p>
          </motion.div>
          <div className="mt-6 flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search providers, services, or categories..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                leftIcon={<Search size={16} />}
                className="bg-white"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                showFilters
                  ? 'bg-ocean-500 text-white border-ocean-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal size={16} />
              Filters
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Booking success banner */}
        {bookingSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-teal-50 border border-teal-200 rounded-xl px-5 py-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <CheckCircle size={20} className="text-teal-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-teal-800 text-sm">Booking submitted!</p>
                <p className="text-teal-600 text-xs">Reference: <span className="font-mono font-bold">{bookingSuccess}</span></p>
              </div>
            </div>
            <button onClick={() => setBookingSuccess(null)} className="text-teal-400 hover:text-teal-600">
              <X size={16} />
            </button>
          </motion.div>
        )}

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-6">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-ocean-500 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Filters panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 shadow-sm"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-navy-500 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as typeof sortBy)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500/30 focus:border-ocean-500"
                >
                  {Object.keys(matchScoreMap).length > 0 && (
                    <option value="match">✨ Best Match (Smart)</option>
                  )}
                  <option value="rating">Highest Rated</option>
                  <option value="distance">Nearest First</option>
                  <option value="reviews">Most Reviews</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-500 mb-2">
                  Max Distance: {maxDistance} mi
                </label>
                <input
                  type="range" min={5} max={50} step={5}
                  value={maxDistance}
                  onChange={e => setMaxDistance(Number(e.target.value))}
                  className="w-full accent-ocean-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-500 mb-2">Minimum Rating</label>
                <select
                  value={minRating}
                  onChange={e => setMinRating(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500/30 focus:border-ocean-500"
                >
                  <option value={0}>Any Rating</option>
                  <option value={4}>4.0+</option>
                  <option value={4.5}>4.5+</option>
                  <option value={4.8}>4.8+</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}

        {/* Results header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-navy-500">{filtered.length}</span>
              {isMatchMode ? ' providers matched to your fleet' : ' providers found'}
              {selectedCategory !== 'All' && ` in ${selectedCategory}`}
            </p>
            {isMatchMode && (
              <span className="flex items-center gap-1 text-xs bg-ocean-50 text-ocean-600 px-2 py-0.5 rounded-full font-medium border border-ocean-200">
                <Sparkles size={11} /> Smart Match active
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-ocean-100 text-ocean-600' : 'text-gray-400 hover:bg-gray-100'}`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-ocean-100 text-ocean-600' : 'text-gray-400 hover:bg-gray-100'}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Provider grid */}
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
        }>
          {filtered.map((provider, i) => (
            <motion.div
              key={provider.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              {viewMode === 'grid' ? (
                <Card hover className="h-full flex flex-col">
                  {provider.featured && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gold-600 bg-gold-50 px-3 py-1.5 rounded-t-2xl -mx-6 -mt-6 mb-5 border-b border-gold-100">
                      <Star size={12} fill="currentColor" />
                      Featured Provider
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-4">
                    <Avatar src={provider.avatar} alt={provider.name} size="lg" fallback={provider.name} />
                    <div className="flex flex-col gap-1 items-end">
                      {isMatchMode && matchScoreMap[provider.id] ? (
                        <MatchBadge
                          score={matchScoreMap[provider.id]}
                          band={matchBandMap[provider.id] ?? 'fair'}
                          size="sm"
                        />
                      ) : provider.verified ? (
                        <div className="flex items-center gap-1 text-teal-600 text-xs font-medium">
                          <CheckCircle size={12} /> Verified
                        </div>
                      ) : null}
                      <span className="text-xs text-gray-400 font-medium">{provider.yearsExperience}yr exp</span>
                    </div>
                  </div>
                  <h3 className="font-heading font-semibold text-navy-500">{provider.name}</h3>
                  <p className="text-xs text-gray-500 mb-3">{provider.businessName}</p>
                  <div className="flex items-center gap-2 mb-3">
                    <StarRating rating={provider.rating} size="sm" />
                    <span className="text-xs font-bold text-navy-500">{provider.rating}</span>
                    <span className="text-xs text-gray-400">({provider.reviewCount.toLocaleString()})</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                    <span className="flex items-center gap-1"><MapPin size={11} />{provider.distance} mi</span>
                    <span className="flex items-center gap-1"><Clock size={11} />{provider.responseTime}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {provider.categories.slice(0, 3).map(cat => (
                      <span key={cat} className="text-xs bg-ocean-50 text-ocean-600 px-2 py-0.5 rounded-full font-medium">{cat}</span>
                    ))}
                  </div>
                  <div className="mt-auto pt-2">
                    {isOwner ? (
                      <Button
                        variant="ocean"
                        fullWidth
                        icon={<CalendarPlus size={14} />}
                        onClick={() => handleBookNow(provider)}
                      >
                        Book Now
                      </Button>
                    ) : (
                      <button className="w-full bg-gray-100 text-gray-500 text-sm py-2.5 rounded-xl font-medium text-center">
                        View Profile
                      </button>
                    )}
                  </div>
                </Card>
              ) : (
                /* List view */
                <Card hover>
                  <div className="flex items-start gap-5">
                    <Avatar src={provider.avatar} alt={provider.name} size="xl" fallback={provider.name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-heading font-semibold text-navy-500 text-lg">{provider.name}</h3>
                            {provider.verified && <CheckCircle size={14} className="text-teal-500" />}
                            {provider.featured && <Badge variant="gold">Featured</Badge>}
                          </div>
                          <p className="text-sm text-gray-500 mb-2">{provider.businessName} · {provider.location}</p>
                          <div className="flex items-center gap-3 mb-3">
                            <StarRating rating={provider.rating} size="sm" />
                            <span className="text-sm font-bold text-navy-500">{provider.rating}</span>
                            <span className="text-sm text-gray-400">{provider.reviewCount.toLocaleString()} reviews</span>
                            <span className="text-sm text-gray-300">·</span>
                            <span className="text-sm text-gray-400">{provider.completedJobs.toLocaleString()} jobs</span>
                          </div>
                          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-3">{provider.description}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {provider.categories.map(cat => (
                              <span key={cat} className="text-xs bg-ocean-50 text-ocean-600 px-2.5 py-1 rounded-full font-medium">{cat}</span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 space-y-3">
                          <div>
                            <div className="flex items-center gap-1 text-sm text-gray-400 mb-1 justify-end">
                              <MapPin size={12} /> {provider.distance} mi
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-400 justify-end">
                              <Clock size={12} /> {provider.responseTime}
                            </div>
                          </div>
                          {isOwner ? (
                            <Button
                              variant="ocean"
                              size="sm"
                              icon={<CalendarPlus size={13} />}
                              onClick={() => handleBookNow(provider)}
                            >
                              Book Now
                            </Button>
                          ) : (
                            <button className="bg-gray-100 text-gray-500 text-sm py-2 px-5 rounded-xl font-medium">
                              View Profile
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </motion.div>
          ))}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="text-center py-20">
            <Search size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-heading font-semibold text-navy-500 mb-2">No providers found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your search or filters</p>
            <Button
              variant="secondary"
              icon={<X size={16} />}
              onClick={() => { setSearch(''); setSelectedCategory('All'); setMinRating(0); }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Booking Wizard */}
      {bookingProvider && (
        <BookingWizard
          provider={bookingProvider}
          isOpen={!!bookingProvider}
          onClose={() => setBookingProvider(null)}
          onSuccess={(ref) => {
            setBookingProvider(null);
            setBookingSuccess(ref);
          }}
        />
      )}
    </div>
  );
};
