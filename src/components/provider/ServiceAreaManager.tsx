import { useState } from 'react';
import { MapPin, Plus, Trash2, AlertCircle } from 'lucide-react';
import type { ProviderServiceArea, ServiceAreaType } from '../../types';

interface Props {
  providerId: string;
  serviceAreas: ProviderServiceArea[];
  onAdd: (area: Omit<ProviderServiceArea, 'id' | 'createdAt'>) => Promise<void>;
  onDelete: (areaId: string) => Promise<void>;
}

const AREA_TYPES: { value: ServiceAreaType; label: string }[] = [
  { value: 'marina',   label: 'Marina' },
  { value: 'city',     label: 'City' },
  { value: 'zip_code', label: 'ZIP Code' },
  { value: 'radius',   label: 'Radius from my location' },
];

export default function ServiceAreaManager({ providerId, serviceAreas, onAdd, onDelete }: Props) {
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [areaType, setAreaType] = useState<ServiceAreaType>('marina');
  const [label, setLabel] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [radiusKm, setRadiusKm] = useState('');

  const reset = () => { setAdding(false); setLabel(''); setCity(''); setState(''); setZipCode(''); setRadiusKm(''); setError(''); };

  const handleAdd = async () => {
    if (!label.trim()) { setError('Label is required'); return; }
    if (serviceAreas.length >= 10) { setError('Maximum 10 service areas allowed'); return; }
    setSaving(true);
    setError('');
    try {
      await onAdd({
        providerId,
        areaType,
        label: label.trim(),
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        zipCode: zipCode.trim() || undefined,
        radiusKm: radiusKm ? parseFloat(radiusKm) : undefined,
        isActive: true,
      });
      reset();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to add service area');
    } finally { setSaving(false); }
  };

  const areaTypeIcon = (type: ServiceAreaType) => {
    const colors: Record<ServiceAreaType, string> = {
      marina: 'text-ocean-500 bg-ocean-50',
      city: 'text-teal-500 bg-teal-50',
      zip_code: 'text-purple-500 bg-purple-50',
      radius: 'text-amber-500 bg-amber-50',
    };
    return colors[type] ?? 'text-gray-400 bg-gray-50';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-ocean-600" />
          <h3 className="font-semibold text-gray-900">Service Areas</h3>
          <span className="text-xs text-gray-400">({serviceAreas.length}/10)</span>
        </div>
        {!adding && serviceAreas.length < 10 && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-ocean-600 text-white text-xs font-medium rounded-lg hover:bg-ocean-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Area
          </button>
        )}
      </div>

      {/* Existing areas */}
      <div className="divide-y divide-gray-100">
        {serviceAreas.length === 0 && !adding && (
          <div className="p-6 text-center">
            <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No service areas added yet</p>
            <p className="text-xs text-gray-400 mt-1">Add at least one area to appear in search results</p>
          </div>
        )}
        {serviceAreas.map((area) => (
          <div key={area.id} className="flex items-center gap-3 px-4 py-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${areaTypeIcon(area.areaType)}`}>
              <MapPin className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{area.label}</p>
              <p className="text-xs text-gray-400">
                {AREA_TYPES.find((t) => t.value === area.areaType)?.label}
                {area.city && ` • ${area.city}`}
                {area.state && `, ${area.state}`}
                {area.zipCode && ` • ZIP ${area.zipCode}`}
                {area.radiusKm && ` • ${area.radiusKm} km radius`}
              </p>
            </div>
            <button
              onClick={() => onDelete(area.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add form */}
      {adding && (
        <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Area type</label>
            <select value={areaType} onChange={(e) => setAreaType(e.target.value as ServiceAreaType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500">
              {AREA_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Label *</label>
            <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
              placeholder={areaType === 'marina' ? 'e.g. Marina del Rey' : areaType === 'zip_code' ? 'e.g. ZIP 90292' : 'e.g. Los Angeles'}
              value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          {(areaType === 'marina' || areaType === 'city') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  placeholder="Los Angeles" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  placeholder="CA" maxLength={2} value={state} onChange={(e) => setState(e.target.value.toUpperCase())} />
              </div>
            </div>
          )}
          {areaType === 'zip_code' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ZIP Code</label>
              <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
                placeholder="90292" value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
            </div>
          )}
          {areaType === 'radius' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Radius (km)</label>
              <input type="number" min="1" max="500" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
                placeholder="50" value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button onClick={handleAdd} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-ocean-600 text-white text-sm font-medium rounded-lg hover:bg-ocean-700 disabled:opacity-50 transition-colors">
              {saving ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Save area
            </button>
            <button onClick={reset} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
