import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Ship, Clock, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { useServiceStore } from '../store/serviceStore';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';

const statusConfig = {
  pending: { label: 'Pending', color: 'gray', icon: Clock },
  matched: { label: 'Matched', color: 'ocean', icon: Ship },
  scheduled: { label: 'Scheduled', color: 'info', icon: Clock },
  in_progress: { label: 'In Progress', color: 'attention', icon: AlertTriangle },
  completed: { label: 'Completed', color: 'good', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'critical', icon: X },
} as const;

const columns = [
  { id: 'pending', label: 'Pending' },
  { id: 'matched', label: 'Matched' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
];

export const ServiceRequests: React.FC = () => {
  const { requests, selectedRequest, selectRequest, clearSelection } = useServiceStore();
  const [newRequestOpen, setNewRequestOpen] = useState(false);

  const getRequestsByStatus = (status: string) =>
    requests.filter(r => r.status === status);

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <motion.h1
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-heading font-bold text-navy-500"
            >
              Service Requests
            </motion.h1>
            <p className="text-gray-500 mt-1">Track and manage all your maintenance and service jobs</p>
          </div>
          <Button
            variant="ocean"
            icon={<Plus size={16} />}
            onClick={() => setNewRequestOpen(true)}
          >
            New Request
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
          {columns.map(col => {
            const count = getRequestsByStatus(col.id).length;
            const cfg = statusConfig[col.id as keyof typeof statusConfig];
            return (
              <Card key={col.id} padding="sm" className="text-center">
                <p className="text-2xl font-heading font-bold text-navy-500">{count}</p>
                <Badge variant={cfg.color as any} className="mt-1 text-xs">{col.label}</Badge>
              </Card>
            );
          })}
        </div>

        {/* Pipeline */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {columns.map(col => {
              const colRequests = getRequestsByStatus(col.id);
              const cfg = statusConfig[col.id as keyof typeof statusConfig];
              return (
                <div key={col.id} className="w-72 flex-shrink-0">
                  <div className="flex items-center gap-2 mb-3 px-2">
                    <cfg.icon size={14} className="text-gray-400" />
                    <h3 className="font-heading font-semibold text-navy-500 text-sm">{col.label}</h3>
                    <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-semibold">
                      {colRequests.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {colRequests.map((req, i) => (
                      <motion.div
                        key={req.id}
                        initial={{ opacity: 1, y: 0 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => selectRequest(req.id)}
                        className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="text-sm font-heading font-semibold text-navy-500 leading-snug">
                            {req.serviceType}
                          </h4>
                          <Badge variant={cfg.color as any} className="text-xs flex-shrink-0">
                            {cfg.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                          <Ship size={11} /> {req.boatName}
                        </p>
                        <p className="text-xs text-gray-400 line-clamp-2 mb-3">{req.description}</p>
                        {req.providerName && (
                          <p className="text-xs font-medium text-ocean-600 mb-2">{req.providerName}</p>
                        )}
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>{new Date(req.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          {req.cost && req.cost > 0 && (
                            <span className="font-semibold text-navy-500">${req.cost.toLocaleString()}</span>
                          )}
                          {req.quotes && req.quotes.length > 0 && (
                            <span className="text-ocean-500 font-medium">{req.quotes.length} quote{req.quotes.length > 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    {colRequests.length === 0 && (
                      <div className="bg-gray-50 rounded-2xl p-6 text-center border-2 border-dashed border-gray-200">
                        <p className="text-xs text-gray-400">No requests</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Request Detail Modal */}
      <Modal
        isOpen={!!selectedRequest}
        onClose={clearSelection}
        title={selectedRequest?.serviceType}
        size="lg"
      >
        {selectedRequest && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Badge variant={statusConfig[selectedRequest.status]?.color as any} dot>
                {statusConfig[selectedRequest.status]?.label}
              </Badge>
              <span className="text-sm text-gray-400">
                Created {new Date(selectedRequest.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Vessel</p>
                <p className="font-semibold text-navy-500 mt-0.5">{selectedRequest.boatName}</p>
              </div>
              {selectedRequest.providerName && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Provider</p>
                  <p className="font-semibold text-navy-500 mt-0.5">{selectedRequest.providerName}</p>
                </div>
              )}
              {selectedRequest.scheduledDate && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Scheduled</p>
                  <p className="font-semibold text-navy-500 mt-0.5">
                    {new Date(selectedRequest.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              )}
              {selectedRequest.cost && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Cost</p>
                  <p className="font-semibold text-navy-500 mt-0.5">${selectedRequest.cost.toLocaleString()}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Description</p>
              <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4">{selectedRequest.description}</p>
            </div>

            {selectedRequest.quotes && selectedRequest.quotes.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Quotes Received</p>
                <div className="space-y-3">
                  {selectedRequest.quotes.map(quote => (
                    <div key={quote.id} className="bg-ocean-50 rounded-xl p-4 border border-ocean-100">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-semibold text-navy-500">{quote.providerName}</p>
                        <p className="text-xl font-heading font-bold text-ocean-600">${quote.amount.toLocaleString()}</p>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{quote.description}</p>
                      <p className="text-xs text-gray-400">ETA: {new Date(quote.eta).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="ocean" fullWidth>Accept Quote</Button>
              <Button variant="secondary" onClick={clearSelection}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* New Request Modal */}
      <Modal
        isOpen={newRequestOpen}
        onClose={() => setNewRequestOpen(false)}
        title="New Service Request"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-500 mb-1.5">Vessel</label>
            <select className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500/30 focus:border-ocean-500">
              <option>Sea Breeze</option>
              <option>Nautilus</option>
              <option>Blue Horizon</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-500 mb-1.5">Service Type</label>
            <select className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500/30 focus:border-ocean-500">
              <option>Engine Service</option>
              <option>Electrical Repair</option>
              <option>Rigging Inspection</option>
              <option>Hull Cleaning</option>
              <option>Detailing</option>
              <option>Electronics</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-500 mb-1.5">Description</label>
            <textarea
              rows={4}
              placeholder="Describe the work needed, any symptoms or issues..."
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500/30 focus:border-ocean-500 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="ocean" fullWidth onClick={() => setNewRequestOpen(false)}>
              Submit Request
            </Button>
            <Button variant="secondary" onClick={() => setNewRequestOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
