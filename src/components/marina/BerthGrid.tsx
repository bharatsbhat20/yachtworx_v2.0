import React, { useState } from 'react';
import { Anchor, Zap, Droplets, Fuel, Wrench, Check } from 'lucide-react';
import { clsx } from 'clsx';
import type { MarinaBerth } from '../../types';

const STATUS_STYLES: Record<MarinaBerth['status'], string> = {
  available:   'bg-emerald-50 border-emerald-200 text-emerald-700 hover:border-emerald-400 hover:shadow-md cursor-pointer',
  occupied:    'bg-red-50   border-red-200   text-red-600   cursor-not-allowed opacity-80',
  reserved:    'bg-amber-50 border-amber-200 text-amber-700 cursor-not-allowed opacity-80',
  maintenance: 'bg-gray-50  border-gray-200  text-gray-400  cursor-not-allowed opacity-60',
};

const STATUS_LABELS: Record<MarinaBerth['status'], string> = {
  available:   'Available',
  occupied:    'Occupied',
  reserved:    'Reserved',
  maintenance: 'Maintenance',
};

interface Props {
  berths: MarinaBerth[];
  onSelectBerth?: (berth: MarinaBerth) => void;
  selectedBerthId?: string;
}

export const BerthGrid: React.FC<Props> = ({ berths, onSelectBerth, selectedBerthId }) => {
  const [filter, setFilter] = useState<'all' | MarinaBerth['status']>('all');

  const filtered = filter === 'all' ? berths : berths.filter(b => b.status === filter);

  const counts = {
    available:   berths.filter(b => b.status === 'available').length,
    occupied:    berths.filter(b => b.status === 'occupied').length,
    reserved:    berths.filter(b => b.status === 'reserved').length,
    maintenance: berths.filter(b => b.status === 'maintenance').length,
  };

  return (
    <div>
      {/* Legend / Filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(['all', 'available', 'occupied', 'reserved', 'maintenance'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={clsx(
              'text-xs font-medium px-3 py-1.5 rounded-full border transition-all',
              filter === s
                ? 'bg-navy-500 text-white border-navy-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            )}
          >
            {s === 'all' ? `All (${berths.length})` : `${STATUS_LABELS[s]} (${counts[s]})`}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {filtered.map(berth => {
          const isSelected = selectedBerthId === berth.id;
          return (
            <div
              key={berth.id}
              onClick={() => berth.status === 'available' && onSelectBerth?.(berth)}
              className={clsx(
                'relative border-2 rounded-xl p-3 transition-all',
                STATUS_STYLES[berth.status],
                isSelected && berth.status === 'available' && '!border-ocean-500 !bg-ocean-50 ring-2 ring-ocean-300',
              )}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-ocean-500 rounded-full flex items-center justify-center">
                  <Check size={12} className="text-white" />
                </div>
              )}

              <div className="flex items-center gap-1 mb-1.5">
                <Anchor size={12} />
                <span className="font-bold text-xs">{berth.name}</span>
              </div>

              <div className="text-xs font-medium mb-1.5">{berth.lengthFt}ft × {berth.widthFt}ft</div>

              {/* Feature icons */}
              <div className="flex gap-1.5 flex-wrap">
                {berth.hasPower && (
                  <span title={`${berth.powerAmps}A power`}>
                    <Zap size={10} className="text-amber-500" />
                  </span>
                )}
                {berth.hasWater && (
                  <span title="Fresh water">
                    <Droplets size={10} className="text-blue-500" />
                  </span>
                )}
                {berth.hasFuel && (
                  <span title="Fuel available">
                    <Fuel size={10} className="text-orange-500" />
                  </span>
                )}
                {berth.status === 'maintenance' && (
                  <span title={berth.notes}>
                    <Wrench size={10} className="text-gray-400" />
                  </span>
                )}
              </div>

              <div className="mt-2 text-xs font-semibold">
                ${berth.dailyRateUsd}/day
              </div>

              <div className={clsx(
                'text-xs mt-1 font-medium',
                berth.status === 'available' ? 'text-emerald-600' :
                berth.status === 'occupied'  ? 'text-red-500' :
                berth.status === 'reserved'  ? 'text-amber-600' :
                'text-gray-400'
              )}>
                {STATUS_LABELS[berth.status]}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">
          No berths match this filter.
        </div>
      )}
    </div>
  );
};
