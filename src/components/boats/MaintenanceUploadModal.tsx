/**
 * Maintenance Upload Modal — TRD Sections 3.4, 4.4 (documents), 4.5, 5.5, 6.5
 *
 * Implements:
 * - File upload simulation (PDF, JPG, PNG, HEIC — max 20MB)
 * - Server-side MIME type validation (simulated)
 * - All TRD metadata fields:
 *     service_type (enum), service_date, service_provider, notes,
 *     component_id (optional link), uploaded_by, file_name, file_size, mime_type
 * - Updates linked component's lastServicedDate on save
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, X, FileText, Image, AlertCircle, CheckCircle,
  Calendar, Building2, FileCheck, Loader2, Link2
} from 'lucide-react';
import { useBoatStore } from '../../store/boatStore';
import { useAuthStore } from '../../store/authStore';
import { uploadDocumentWithProgress } from '../../services/storageService';
import type { ServiceType, BoatComponent } from '../../types';
import { SERVICE_TYPE_LABELS } from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

// ─── Types ────────────────────────────────────────────────────────────────────

interface MaintenanceUploadModalProps {
  boatId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormState {
  serviceType: ServiceType;
  serviceDate: string;
  serviceProvider: string;
  componentId: string;
  notes: string;
}

interface FileState {
  file: File | null;
  error: string | null;
  previewUrl: string | null;
}

// ─── File Icon ────────────────────────────────────────────────────────────────

const FileIcon: React.FC<{ mimeType: string; size?: number }> = ({ mimeType, size = 24 }) => {
  if (mimeType.startsWith('image/')) return <Image size={size} className="text-ocean-500" />;
  return <FileText size={size} className="text-ocean-500" />;
};

// ─── Dropzone ─────────────────────────────────────────────────────────────────

const Dropzone: React.FC<{
  fileState: FileState;
  onFile: (file: File) => void;
  onClear: () => void;
}> = ({ fileState, onFile, onClear }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  if (fileState.file) {
    return (
      <div className={`border-2 rounded-xl p-4 ${fileState.error ? 'border-red-200 bg-red-50' : 'border-teal-200 bg-teal-50'}`}>
        <div className="flex items-center gap-3">
          <FileIcon mimeType={fileState.file.type} size={28} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-navy-500 truncate">{fileState.file.name}</p>
            <p className="text-xs text-gray-400">{formatBytes(fileState.file.size)} · {fileState.file.type || 'unknown'}</p>
          </div>
          <button onClick={onClear} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <X size={14} />
          </button>
        </div>
        {fileState.error && (
          <div className="flex items-center gap-2 mt-2">
            <AlertCircle size={13} className="text-red-500" />
            <p className="text-xs text-red-600">{fileState.error}</p>
          </div>
        )}
        {!fileState.error && (
          <div className="flex items-center gap-2 mt-2">
            <CheckCircle size={13} className="text-teal-500" />
            <p className="text-xs text-teal-600">File ready to upload</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
        dragOver ? 'border-ocean-400 bg-ocean-50' : 'border-gray-200 hover:border-ocean-300 hover:bg-gray-50'
      }`}
    >
      <Upload size={28} className={`mx-auto mb-3 ${dragOver ? 'text-ocean-500' : 'text-gray-300'}`} />
      <p className="text-sm font-medium text-gray-600 mb-1">
        Drop file here or <span className="text-ocean-500">browse</span>
      </p>
      <p className="text-xs text-gray-400">PDF, JPG, PNG, HEIC · Max 20 MB</p>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.heic"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────

export const MaintenanceUploadModal: React.FC<MaintenanceUploadModalProps> = ({
  boatId,
  onClose,
  onSuccess,
}) => {
  const { boats, addDocument } = useBoatStore();
  const { currentUser } = useAuthStore();

  const boat = boats.find(b => b.id === boatId);
  const activeComponents = boat?.components.filter(c => !c.deletedAt) || [];

  const [form, setForm] = useState<FormState>({
    serviceType: 'engine_service',
    serviceDate: new Date().toISOString().split('T')[0],
    serviceProvider: '',
    componentId: '',
    notes: '',
  });

  const [fileState, setFileState] = useState<FileState>({
    file: null,
    error: null,
    previewUrl: null,
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState(false);

  // ── File validation (TRD Section 7.4) ───────────────────────────────────

  const validateFile = (file: File): string | null => {
    // MIME type validation
    if (!ACCEPTED_MIME_TYPES.includes(file.type) && !file.name.toLowerCase().endsWith('.heic')) {
      return `File type not supported. Accepted: PDF, JPG, PNG, HEIC`;
    }
    // Size validation
    if (file.size > MAX_FILE_SIZE) {
      return `File exceeds 20 MB limit (${(file.size / 1048576).toFixed(1)} MB)`;
    }
    return null;
  };

  const handleFile = (file: File) => {
    const error = validateFile(file);
    let previewUrl: string | null = null;
    if (!error && file.type.startsWith('image/')) {
      previewUrl = URL.createObjectURL(file);
    }
    setFileState({ file, error, previewUrl });
  };

  const handleClearFile = () => {
    if (fileState.previewUrl) URL.revokeObjectURL(fileState.previewUrl);
    setFileState({ file: null, error: null, previewUrl: null });
  };

  // ── Submission ────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileState.file || fileState.error) return;

    setIsUploading(true);
    const ownerId = currentUser?.id || 'user-1';
    const docId = crypto.randomUUID();

    try {
      // Upload file to Supabase Storage (or demo simulation with progress)
      const { storagePath } = await uploadDocumentWithProgress(
        fileState.file,
        ownerId,
        boatId,
        docId,
        (p) => setUploadProgress(p.percent),
      );

      // Persist document record
      await addDocument(boatId, {
        boatId,
        componentId: form.componentId || undefined,
        uploadedBy: ownerId,
        fileName: fileState.file.name,
        fileUrl: storagePath,
        fileSize: fileState.file.size,
        mimeType: fileState.file.type || 'application/octet-stream',
        serviceType: form.serviceType,
        serviceDate: form.serviceDate,
        serviceProvider: form.serviceProvider || undefined,
        notes: form.notes || undefined,
      });

      setUploadProgress(100);
      await new Promise(r => setTimeout(r, 300));
      setIsUploading(false);
      setSuccess(true);

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1200);
    } catch (err) {
      setIsUploading(false);
      console.error('Upload failed:', err);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center"
        >
          <CheckCircle size={48} className="text-teal-500 mx-auto mb-4" />
          <h3 className="font-heading font-bold text-navy-500 mb-2">Document Saved</h3>
          <p className="text-sm text-gray-500">
            {fileState.file?.name} has been securely stored and linked to {boat?.name}.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-ocean-50 rounded-xl">
                <Upload size={18} className="text-ocean-500" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-navy-500">Add Maintenance Record</h3>
                <p className="text-xs text-gray-400">{boat?.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* File Upload (TRD 3.4) */}
            <div>
              <label className="block text-sm font-medium text-navy-500 mb-2">
                Document <span className="text-red-400">*</span>
              </label>
              <Dropzone fileState={fileState} onFile={handleFile} onClear={handleClearFile} />
            </div>

            {/* Service Type dropdown (TRD 4.5 enum) */}
            <div>
              <label className="block text-sm font-medium text-navy-500 mb-1.5">
                <FileCheck size={13} className="inline mr-1.5" />
                Service Type <span className="text-red-400">*</span>
              </label>
              <select
                value={form.serviceType}
                onChange={e => setForm(prev => ({ ...prev, serviceType: e.target.value as ServiceType }))}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 bg-white"
              >
                {(Object.entries(SERVICE_TYPE_LABELS) as [ServiceType, string][]).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Service Date */}
            <div>
              <label className="block text-sm font-medium text-navy-500 mb-1.5">
                <Calendar size={13} className="inline mr-1.5" />
                Service Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={form.serviceDate}
                onChange={e => setForm(prev => ({ ...prev, serviceDate: e.target.value }))}
                required
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
              />
            </div>

            {/* Linked Component (TRD: links maintenance to component, updates lastServicedDate) */}
            {activeComponents.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-navy-500 mb-1.5">
                  <Link2 size={13} className="inline mr-1.5" />
                  Link to Component
                  <span className="ml-1 text-xs text-gray-400 font-normal">(optional — updates health score)</span>
                </label>
                <select
                  value={form.componentId}
                  onChange={e => setForm(prev => ({ ...prev, componentId: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 bg-white"
                >
                  <option value="">— Don't link to a component —</option>
                  {activeComponents.map((c: BoatComponent) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.category})</option>
                  ))}
                </select>
                {form.componentId && (
                  <p className="text-xs text-teal-600 mt-1 flex items-center gap-1">
                    <CheckCircle size={11} />
                    Component's "last serviced" date will be updated to {form.serviceDate}
                  </p>
                )}
              </div>
            )}

            {/* Service Provider */}
            <div>
              <label className="block text-sm font-medium text-navy-500 mb-1.5">
                <Building2 size={13} className="inline mr-1.5" />
                Service Provider
                <span className="ml-1 text-xs text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={form.serviceProvider}
                onChange={e => setForm(prev => ({ ...prev, serviceProvider: e.target.value }))}
                placeholder="e.g. Pacific Marine Services"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-navy-500 mb-1.5">
                Notes
                <span className="ml-1 text-xs text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Work performed, parts replaced, condition notes…"
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 resize-none"
              />
            </div>

            {/* Upload Progress */}
            <AnimatePresence>
              {isUploading && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-ocean-50 border border-ocean-100 rounded-xl p-3"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Loader2 size={14} className="text-ocean-500 animate-spin" />
                    <p className="text-sm text-ocean-700 font-medium">Uploading securely…</p>
                    <span className="ml-auto text-xs text-ocean-600 font-mono">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-ocean-100 rounded-full h-1.5">
                    <div
                      className="bg-ocean-500 h-1.5 rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isUploading}
                className="flex-1 btn-ghost text-sm py-3 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!fileState.file || !!fileState.error || isUploading}
                className="flex-1 btn-hero flex items-center justify-center gap-2 text-sm py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <><Loader2 size={14} className="animate-spin" /> Uploading…</>
                ) : (
                  <><Upload size={14} /> Save Record</>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
