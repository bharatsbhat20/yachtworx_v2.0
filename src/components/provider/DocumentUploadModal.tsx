import { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, Calendar } from 'lucide-react';
import type { DocumentType, ProviderDocument } from '../../types';
import { DOCUMENT_TYPE_LABELS } from '../../types';

interface Props {
  providerId: string;
  existingDocuments: ProviderDocument[];
  onUpload: (file: File, meta: Partial<ProviderDocument>) => Promise<void>;
  onClose: () => void;
}

const ACCEPTED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 10;

export default function DocumentUploadModal({ providerId, existingDocuments, onUpload, onClose }: Props) {
  const [docType, setDocType] = useState<DocumentType>('business_license');
  const [docLabel, setDocLabel] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requiresExpiry = docType === 'business_license' || docType === 'insurance_coi';
  const today = new Date().toISOString().split('T')[0];

  const handleFile = (file: File) => {
    if (!ACCEPTED_MIME.includes(file.type)) {
      setError('Accepted formats: PDF, JPG, PNG, WebP');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_SIZE_MB} MB`);
      return;
    }
    setError('');
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile) { setError('Please select a file'); return; }
    if (requiresExpiry && !expirationDate) { setError('Expiration date is required for this document type'); return; }
    if (requiresExpiry && expirationDate <= today) { setError('Expiration date must be in the future'); return; }
    if (docType === 'other' && !docLabel.trim()) { setError('Please provide a label for this document'); return; }

    setUploading(true);
    setError('');
    try {
      await onUpload(selectedFile, {
        providerId,
        documentType: docType,
        documentLabel: docType === 'other' ? docLabel : undefined,
        expirationDate: expirationDate || undefined,
      });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      approved: 'bg-teal-100 text-teal-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return map[status] ?? 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-ocean-600" />
            <h2 className="text-lg font-bold text-gray-900">Upload Document</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Existing docs summary */}
          {existingDocuments.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Existing Documents</p>
              <div className="space-y-1.5">
                {existingDocuments.filter((d) => d.isActive).map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">{DOCUMENT_TYPE_LABELS[doc.documentType]}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusBadge(doc.status)}`}>
                      {doc.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Document type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Document type *</label>
            <select
              value={docType}
              onChange={(e) => { setDocType(e.target.value as DocumentType); setDocLabel(''); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
            >
              {(Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]).map((t) => (
                <option key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          {/* Custom label for "other" */}
          {docType === 'other' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Document label *</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
                placeholder="e.g. USCG Captain's Licence"
                value={docLabel}
                onChange={(e) => setDocLabel(e.target.value)}
              />
            </div>
          )}

          {/* Expiration date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiration date {requiresExpiry ? '*' : '(optional)'}
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                min={today}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
              />
            </div>
          </div>

          {/* File drop zone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File *</label>
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-ocean-500 bg-ocean-50'
                  : selectedFile
                  ? 'border-teal-400 bg-teal-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-teal-700">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 font-medium">Drop file here or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, WebP — max {MAX_SIZE_MB} MB</p>
                </>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 pb-5">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading || !selectedFile}
            className="flex items-center gap-2 px-5 py-2 bg-ocean-600 text-white text-sm font-semibold rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading…</>
            ) : (
              <><Upload className="w-4 h-4" /> Upload Document</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
