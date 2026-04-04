import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, MapPin, Anchor, Waves, Zap, Fuel, Wifi, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useMarinaStore } from '../store/marinaStore';
import { MarinaCard } from '../components/marina/MarinaCard';
import type { Marina } from '../types';

const AMENITY_FILTERS = [
  { key: 'fuel',              label: 'Fuel',       icon: Fuel },
  { key: 'electricity_50amp', label: '50A Power',  icon: Zap },
  { key: 'wifi',              label: 'WiFi',       icon: Wifi },
  { key: 'pump_out',          label: 'Pump-Out',   icon: Waves },
];

const SORT_OPTIONS = [
  { value: 'rating',     label: 'Top Rated' },
  { value: 'available',  label: 'Most Available' },
  { value: 'price_asc',  label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

export const MarinaDiscovery: React.FC = () => {
  const { marinas, isLoading, loadMarinas } = useMarinaStore();

  const [query, setQuery] = useState('');
  const [amenityFilters, setAmenityFilters] = useState<string[]>([]);
  const [minLength, setMinLength] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadMarinas();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleAmenity = (key: string) => {
    setAmenityFilters(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const filtered: Marina[] = marinas
    .filter(m => {
      if (query && !m.name.toLowerCase().includes(query.toLowerCase()) &&
          !m.city.toLowerCase().includes(query.toLowerCase()) &&
          !m.state.toLowerCase().includes(query.toLowerCase())) return false;
      if (amenityFilters.length > 0 && !amenityFilters.every(f => m.amenities.includes(f))) return false;
      if (minLength && m.maxVesselLengthFt < parseInt(minLength)) return false;
      if (maxPrice && m.dailyRateUsd > parseFloat(maxPrice)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'rating')     return b.rating - a.rating;
      if (sortBy === 'available')  return b.availableBerths - a.availableBerths;
      if (sortBy === 'price_asc')  return a.dailyRateUsd - b.dailyRateUsd;
      if (sortBy === 'price_desc') return b.dailyRateUsd - a.dailyRateUsd;
      return 0;
    });

  const hasFilters = query || amenityFilters.length > 0 || minLength || maxPrice;

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Hero */}
      <div className="bg-gradient-to-br from-navy-500 via-navy-600 to-ocean-700 text-white py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-center gap-2 text-ocean-300 text-sm font-medium mb-3">
              <Anchor size={14} />
              <span>Marina Discovery</span>
            </div>
            <h1 className="font-heading font-bold text-3xl sm:text-4xl mb-3">
              Find Your Perfect Marina
            </h1>
            <p className="text-white/70 text-lg mb-8">
              Browse {marinas.length} world-class marinas with verified amenities, live berth availability, and trusted service providers.
            </p>

            {/* Search bar */}
            <div className="flex gap-2 max-w-xl mx-auto">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by marina name, city, or state…"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-ocean-300"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowFilters(v => !v)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                  showFilters
                    ? 'bg-ocean-500 text-white'
                    : 'bg-white/10 text-white hover:bg-white/20'
                )}
              >
                <SlidersHorizontal size={15} />
                Filters
                {amenityFilters.length > 0 && (
                  <span className="w-5 h-5 bg-amber-400 text-navy-500 rounded-full text-xs font-bold flex items-center justify-center">
                    {amenityFilters.length}
                  </span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-white border-b border-gray-100 shadow-sm"
        >
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex flex-wrap gap-6 items-end">
              {/* Amenities */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Amenities</p>
                <div className="flex gap-2 flex-wrap">
                  {AMENITY_FILTERS.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => toggleAmenity(key)}
                      className={clsx(
                        'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors',
                        amenityFilters.includes(key)
                          ? 'bg-ocean-500 text-white border-ocean-500'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      )}
                    >
                      <Icon size={11} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Min vessel length */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Min Vessel Length (ft)</p>
                <input
                  type="number"
                  value={minLength}
                  onChange={e => setMinLength(e.target.value)}
                  placeholder="e.g. 80"
                  className="w-28 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-300"
                />
              </div>

              {/* Max price */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Max Rate ($/ft/day)</p>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                  placeholder="e.g. 5.00"
                  className="w-28 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-300"
                />
              </div>

              {hasFilters && (
                <button
                  onClick={() => { setQuery(''); setAmenityFilters([]); setMinLength(''); setMaxPrice(''); }}
                  className="text-xs text-red-500 hover:text-red-600 font-medium"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Sort + count row */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">
            {isLoading ? 'Loading marinas…' : `${filtered.length} marina${filtered.length !== 1 ? 's' : ''} found`}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ocean-300"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Mapbox map placeholder */}
        <div className="bg-gradient-to-br from-ocean-50 to-blue-100 rounded-2xl border border-ocean-100 p-6 mb-8 flex items-center justify-center min-h-48">
          <div className="text-center">
            <MapPin size={28} className="text-ocean-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-ocean-700">Interactive Marina Map</p>
            <p className="text-xs text-ocean-500 mt-1">Powered by Mapbox GL JS — rendered with <code className="bg-ocean-100 px-1 rounded">VITE_MAPBOX_TOKEN</code></p>
            <div className="flex gap-3 justify-center mt-4">
              {filtered.map(m => (
                <div key={m.id} className="flex flex-col items-center gap-1">
                  <div className="w-3 h-3 bg-ocean-500 rounded-full border-2 border-white shadow-sm" />
                  <span className="text-xs text-ocean-600 font-medium whitespace-nowrap">{m.city}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grid */}
        {!isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((marina, i) => (
              <motion.div
                key={marina.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <MarinaCard marina={marina} />
              </motion.div>
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16">
            <Anchor size={40} className="text-gray-300 mx-auto mb-4" />
            <h3 className="font-heading font-bold text-gray-500 mb-2">No marinas found</h3>
            <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
};
