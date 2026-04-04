import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Star, Anchor, Zap, Waves, Wifi, ShowerHead, Fuel } from 'lucide-react';
import { clsx } from 'clsx';
import type { Marina } from '../../types';

const AMENITY_ICONS: Record<string, { icon: React.ElementType; label: string }> = {
  fuel:               { icon: Fuel,      label: 'Fuel' },
  electricity_50amp:  { icon: Zap,       label: '50A' },
  electricity_30amp:  { icon: Zap,       label: '30A' },
  electricity_100amp: { icon: Zap,       label: '100A' },
  water:              { icon: Waves,     label: 'Water' },
  wifi:               { icon: Wifi,      label: 'WiFi' },
  showers:            { icon: ShowerHead,label: 'Showers' },
};

interface Props {
  marina: Marina;
  compact?: boolean;
}

export const MarinaCard: React.FC<Props> = ({ marina, compact = false }) => {
  const occupancyPct = Math.round(((marina.totalBerths - marina.availableBerths) / marina.totalBerths) * 100);
  const occupancyColor =
    occupancyPct >= 90 ? 'text-red-600 bg-red-50' :
    occupancyPct >= 70 ? 'text-amber-600 bg-amber-50' :
    'text-emerald-600 bg-emerald-50';

  const displayAmenities = marina.amenities.slice(0, 5);

  return (
    <Link
      to={`/marinas/${marina.id}`}
      className={clsx(
        'group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col',
        compact ? '' : ''
      )}
    >
      {/* Cover Image */}
      <div className="relative overflow-hidden" style={{ height: compact ? 160 : 200 }}>
        <img
          src={marina.coverPhoto}
          alt={marina.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Occupancy badge */}
        <div className={clsx('absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full', occupancyColor)}>
          {marina.availableBerths} berths free
        </div>

        {/* Location pin */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-white text-sm">
          <MapPin size={13} />
          <span>{marina.city}, {marina.state}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-heading font-bold text-navy-500 text-base leading-tight group-hover:text-ocean-600 transition-colors">
            {marina.name}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            <Star size={13} className="text-amber-400 fill-amber-400" />
            <span className="text-sm font-semibold text-gray-700">{marina.rating.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({marina.reviewCount})</span>
          </div>
        </div>

        {!compact && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">{marina.description}</p>
        )}

        {/* Specs row */}
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          <div className="flex items-center gap-1">
            <Anchor size={11} className="text-ocean-500" />
            <span>{marina.totalBerths} berths</span>
          </div>
          <span>•</span>
          <span>Max {marina.maxVesselLengthFt}ft</span>
          <span>•</span>
          <span>From ${marina.dailyRateUsd}/ft/day</span>
        </div>

        {/* Amenities */}
        <div className="flex flex-wrap gap-1.5 mt-auto">
          {displayAmenities.map(amenity => {
            const info = AMENITY_ICONS[amenity];
            if (!info) return null;
            const Icon = info.icon;
            return (
              <span
                key={amenity}
                className="flex items-center gap-1 text-xs bg-ocean-50 text-ocean-700 px-2 py-0.5 rounded-full"
              >
                <Icon size={10} />
                {info.label}
              </span>
            );
          })}
          {marina.amenities.length > 5 && (
            <span className="text-xs text-gray-400 px-1 py-0.5">
              +{marina.amenities.length - 5} more
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};
