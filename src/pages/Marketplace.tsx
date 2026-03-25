import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, MapPin, Clock, CheckCircle, Star, Grid, List, X } from 'lucide-react';
import { useServiceStore } from '../store/serviceStore';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { StarRating } from '../components/ui/StarRating';
import { Avatar } from '../components/ui/Avatar';
import { Card } from '../components/ui/Card';

const categories = [
  'All', 'Engine', 'Electrical', 'Electronics', 'Hull', 'Rigging', 'Sails',
  'Detailing', 'Haul-out', 'Diving', 'Navigation', 'Survey', 'Safety', 'Mechanical'
];

export const Marketplace: React.FC = () => {
  const { providers } = useServiceStore();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'rating' | 'distance' | 'reviews'>('rating');
  const [maxDistance, setMaxDistance] = useState(50);
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

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
      result = result.filter(p => p.categories.includes(selectedCategory));
    }
    if (maxDistance < 50) {
      result = result.filter(p => (p.distance || 0) <= maxDistance);
    }
    if (minRating > 0) {
      result = result.filter(p => p.rating >= minRating);
    }
    return [...result].sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'distance') return (a.distance || 99) - (b.distance || 99);
      if (sortBy === 'reviews') return b.reviewCount - a.reviewCount;
      return 0;
    });
  }, [providers, search, selectedCategory, maxDistance, minRating, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Header */}
      <div className="bg-navy-500 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 1, y: 0 }} animate={{ opacity: 1, y: 0 }}>
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
                showFilters ? 'bg-ocean-500 text-white border-ocean-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal size={16} />
              Filters
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Pills */}
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

        {/* Filters Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 1, y: 0 }}
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
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-navy-500">{filtered.length}</span> providers found
            {selectedCategory !== 'All' && ` in ${selectedCategory}`}
          </p>
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

        {/* Provider Grid */}
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          : 'space-y-4'
        }>
          {filtered.map((provider, i) => (
            <motion.div
              key={provider.id}
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              {viewMode === 'grid' ? (
                <Card hover className="h-full">
                  {provider.featured && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gold-600 bg-gold-50 px-3 py-1.5 rounded-t-2xl -mx-6 -mt-6 mb-5 border-b border-gold-100">
                      <Star size={12} fill="currentColor" />
                      Featured Provider
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-4">
                    <Avatar src={provider.avatar} alt={provider.name} size="lg" fallback={provider.name} />
                    <div className="flex flex-col gap-1 items-end">
                      {provider.verified && (
                        <div className="flex items-center gap-1 text-teal-600 text-xs font-medium">
                          <CheckCircle size={12} />
                          Verified
                        </div>
                      )}
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

                  <div className="flex flex-wrap gap-1 mb-4">
                    {provider.certifications.slice(0, 2).map(cert => (
                      <span key={cert} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">{cert}</span>
                    ))}
                  </div>

                  <button className="w-full btn-ocean text-sm py-2.5 justify-center mt-auto">
                    View Profile
                  </button>
                </Card>
              ) : (
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
                            <span className="text-sm text-gray-400">·</span>
                            <span className="text-sm text-gray-400">{provider.completedJobs.toLocaleString()} jobs</span>
                          </div>
                          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-3">{provider.description}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {provider.categories.map(cat => (
                              <span key={cat} className="text-xs bg-ocean-50 text-ocean-600 px-2.5 py-1 rounded-full font-medium">{cat}</span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="flex items-center gap-1 text-sm text-gray-400 mb-1 justify-end">
                            <MapPin size={12} />
                            {provider.distance} mi
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-400 mb-4 justify-end">
                            <Clock size={12} />
                            {provider.responseTime}
                          </div>
                          <button className="btn-ocean text-sm py-2 px-5">View Profile</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <Search size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-heading font-semibold text-navy-500 mb-2">No providers found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your search or filters</p>
            <button onClick={() => { setSearch(''); setSelectedCategory('All'); setMinRating(0); }} className="btn-ocean">
              <X size={16} /> Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
