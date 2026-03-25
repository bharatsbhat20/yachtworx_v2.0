/**
 * Component Manager — TRD Sections 3.3, 4.6, 6.4
 *
 * Displays all boat components with:
 * - TRD-compliant health scores (section 4.6)
 * - Add / Edit / Delete CRUD
 * - Days until/overdue display
 * - Service interval management
 * - Link to marketplace for overdue components
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Settings, Pencil, Trash2, X, Save, ChevronRight,
  AlertTriangle, CheckCircle, Clock, Calendar
} from 'lucide-react';
import { useBoatStore } from '../../store/boatStore';
import { scoreComponent, formatDaysUntilDue, getBand } from '../../utils/healthScore';
import type { BoatComponent, ComponentHealth } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ComponentManagerProps {
  boatId: string;
}

const CATEGORIES = [
  'Engine', 'Hull', 'Electrical', 'Electronics', 'Rigging',
  'Sails', 'Safety', 'Mechanical', 'Fuel', 'Navigation', 'Other',
];

// ─── Health Badge ──────────────────────────────────────────────────────────────

const HealthBadge: React.FC<{ health: ComponentHealth }> = ({ health }) => {
  const config = {
    current:       { bg: 'bg-teal-50',   text: 'text-teal-700',   icon: <CheckCircle size={12} />, label: 'Current' },
    due_soon:      { bg: 'bg-amber-50',  text: 'text-amber-700',  icon: <Clock size={12} />,        label: 'Due Soon' },
    overdue_lt30:  { bg: 'bg-orange-50', text: 'text-orange-700', icon: <AlertTriangle size={12} />, label: 'Overdue' },
    overdue_30_90: { bg: 'bg-red-50',    text: 'text-red-700',    icon: <AlertTriangle size={12} />, label: 'Overdue' },
    overdue_gt90:  { bg: 'bg-red-100',   text: 'text-red-800',    icon: <AlertTriangle size={12} />, label: 'Critical' },
    no_data:       { bg: 'bg-gray-50',   text: 'text-gray-500',   icon: <Clock size={12} />,        label: 'No Data' },
  };
  const c = config[health.status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.icon}
      {c.label}
    </span>
  );
};

// ─── Component Score Ring ─────────────────────────────────────────────────────

const ScoreRing: React.FC<{ score: number; size?: number }> = ({ score, size = 36 }) => {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const { bandColor } = getBand(score);
  return (
    <div className="relative inline-flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={3} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={bandColor} strokeWidth={3}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color: bandColor, fontSize: size < 40 ? 9 : 11 }}>
        {score}
      </span>
    </div>
  );
};

// ─── Add / Edit Component Modal ───────────────────────────────────────────────

interface ComponentFormData {
  name: string;
  category: string;
  installDate: string;
  lastServicedDate: string;
  serviceIntervalDays: string;
  notes: string;
}

const ComponentModal: React.FC<{
  component?: BoatComponent;
  onSave: (data: ComponentFormData) => void;
  onClose: () => void;
}> = ({ component, onSave, onClose }) => {
  const [form, setForm] = useState<ComponentFormData>({
    name: component?.name || '',
    category: component?.category || 'Engine',
    installDate: component?.installDate || '',
    lastServicedDate: component?.lastServicedDate || component?.lastChecked || '',
    serviceIntervalDays: String(component?.serviceIntervalDays || 365),
    notes: component?.notes || '',
  });

  const handleChange = (field: keyof ComponentFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-heading font-bold text-navy-500">
              {component ? 'Edit Component' : 'Add Component'}
            </h3>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy-500 mb-1.5">
                Component Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="e.g. Main Engine"
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-500 mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={e => handleChange('category', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 bg-white"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-navy-500 mb-1.5">
                  <Calendar size={12} className="inline mr-1" />Install Date
                </label>
                <input
                  type="date"
                  value={form.installDate}
                  onChange={e => handleChange('installDate', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-500 mb-1.5">Last Serviced</label>
                <input
                  type="date"
                  value={form.lastServicedDate}
                  onChange={e => handleChange('lastServicedDate', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-500 mb-1.5">
                Service Interval (days)
                <span className="ml-1 text-xs text-gray-400 font-normal">— drives health score</span>
              </label>
              <input
                type="number"
                value={form.serviceIntervalDays}
                onChange={e => handleChange('serviceIntervalDays', e.target.value)}
                min="1"
                placeholder="365"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Annual = 365 · Semi-annual = 180 · Quarterly = 90
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-500 mb-1.5">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => handleChange('notes', e.target.value)}
                placeholder="Condition notes, last service details…"
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 btn-ghost text-sm py-2.5">Cancel</button>
              <button type="submit" className="flex-1 btn-ocean flex items-center justify-center gap-2 text-sm py-2.5">
                <Save size={14} /> {component ? 'Save Changes' : 'Add Component'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Component Card ───────────────────────────────────────────────────────────

const ComponentCard: React.FC<{
  component: BoatComponent;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ component, onEdit, onDelete }) => {
  const health = scoreComponent(component);
  const dueText = formatDaysUntilDue(health.daysUntilDue);
  const isOverdue = health.score < 70;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        <ScoreRing score={health.score} size={40} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <h3 className="font-heading font-semibold text-navy-500 text-sm leading-tight">{component.name}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{component.category}</p>
            </div>
            <HealthBadge health={health} />
          </div>

          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            {component.lastServicedDate && (
              <span>
                Last: <span className="font-medium text-navy-500">
                  {new Date(component.lastServicedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </span>
            )}
            {health.daysUntilDue !== undefined && (
              <span className={isOverdue ? 'text-red-500 font-medium' : 'text-gray-500'}>
                {dueText}
              </span>
            )}
            {component.serviceIntervalDays && (
              <span className="text-gray-400">Every {component.serviceIntervalDays}d</span>
            )}
          </div>

          {component.notes && (
            <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-2">{component.notes}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-ocean-500 hover:bg-ocean-50 rounded-lg transition-colors"
            title="Edit component"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Remove component"
          >
            <Trash2 size={14} />
          </button>
        </div>
        {isOverdue && (
          <Link
            to="/marketplace"
            className="text-xs text-ocean-500 font-medium hover:text-ocean-600 flex items-center gap-1"
          >
            Find Provider <ChevronRight size={12} />
          </Link>
        )}
      </div>
    </motion.div>
  );
};

// ─── Main Component Manager ───────────────────────────────────────────────────

export const ComponentManager: React.FC<ComponentManagerProps> = ({ boatId }) => {
  const { boats, addComponent, updateComponent, deleteComponent } = useBoatStore();
  const boat = boats.find(b => b.id === boatId);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<BoatComponent | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (!boat) return null;

  const activeComponents = boat.components.filter(c => !c.deletedAt);

  // Sort: overdue first, then by score asc
  const sortedComponents = [...activeComponents].sort((a, b) => {
    const ha = scoreComponent(a);
    const hb = scoreComponent(b);
    return ha.score - hb.score;
  });

  const handleSave = (data: ComponentFormData) => {
    const componentData = {
      name: data.name,
      category: data.category,
      installDate: data.installDate || undefined,
      lastServicedDate: data.lastServicedDate || undefined,
      serviceIntervalDays: data.serviceIntervalDays ? Number(data.serviceIntervalDays) : undefined,
      notes: data.notes || undefined,
      // Legacy
      lastChecked: data.lastServicedDate || undefined,
    };

    if (editingComponent) {
      updateComponent(boatId, editingComponent.id, componentData);
    } else {
      addComponent(boatId, componentData);
    }
    setModalOpen(false);
    setEditingComponent(null);
  };

  const handleEdit = (comp: BoatComponent) => {
    setEditingComponent(comp);
    setModalOpen(true);
  };

  const handleDeleteConfirm = (id: string) => {
    deleteComponent(boatId, id);
    setConfirmDelete(null);
  };

  // Stats
  const healthScores = activeComponents.map(c => scoreComponent(c).score);
  const avgScore = healthScores.length > 0
    ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
    : 50;
  const { bandLabel, bandColor } = getBand(avgScore);

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Settings size={18} className="text-gray-400" />
          <div>
            <h3 className="font-heading font-semibold text-navy-500">
              Components
              <span className="ml-2 text-sm font-normal text-gray-400">({activeComponents.length})</span>
            </h3>
            <p className="text-xs text-gray-400">
              Avg health: <span className="font-semibold" style={{ color: bandColor }}>{avgScore} — {bandLabel}</span>
            </p>
          </div>
        </div>
        <button
          onClick={() => { setEditingComponent(null); setModalOpen(true); }}
          className="btn-outline flex items-center gap-2 text-sm py-2 px-3"
        >
          <Plus size={15} /> Add Component
        </button>
      </div>

      {/* Component grid */}
      {sortedComponents.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
          <Settings size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm mb-3">No components tracked yet</p>
          <button
            onClick={() => setModalOpen(true)}
            className="btn-ocean text-sm py-2 px-4"
          >
            <Plus size={14} /> Add First Component
          </button>
        </div>
      ) : (
        <AnimatePresence>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sortedComponents.map(comp => (
              <ComponentCard
                key={comp.id}
                component={comp}
                onEdit={() => handleEdit(comp)}
                onDelete={() => setConfirmDelete(comp.id)}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Delete confirmation */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
            >
              <h3 className="font-heading font-bold text-navy-500 mb-2">Remove Component?</h3>
              <p className="text-sm text-gray-500 mb-5">
                This component and its service history contribution will be removed from the health score.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 btn-ghost text-sm py-2.5">Cancel</button>
                <button
                  onClick={() => handleDeleteConfirm(confirmDelete)}
                  className="flex-1 bg-red-500 text-white font-medium text-sm py-2.5 rounded-xl hover:bg-red-600 transition-colors"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit modal */}
      <AnimatePresence>
        {modalOpen && (
          <ComponentModal
            component={editingComponent || undefined}
            onSave={handleSave}
            onClose={() => { setModalOpen(false); setEditingComponent(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

interface ComponentFormData {
  name: string;
  category: string;
  installDate: string;
  lastServicedDate: string;
  serviceIntervalDays: string;
  notes: string;
}
