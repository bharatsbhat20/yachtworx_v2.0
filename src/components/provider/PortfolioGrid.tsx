import { useState, useRef } from 'react';
import { Image, Plus, Trash2, Upload, X, AlertCircle } from 'lucide-react';
import type { ProviderPortfolioItem } from '../../types';

interface Props {
  items: ProviderPortfolioItem[];
  canEdit?: boolean;
  onUpload?: (file: File, caption?: string) => Promise<void>;
  onDelete?: (itemId: string) => Promise<void>;
}

export default function PortfolioGrid({ items, canEdit = false, onUpload, onDelete }: Props) {
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState<ProviderPortfolioItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_SIZE_MB = 10;

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Only image files are supported'); return; }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) { setError(`File must be under ${MAX_SIZE_MB} MB`); return; }
    setError('');
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !onUpload) return;
    setUploading(true);
    setError('');
    try {
      await onUpload(selectedFile, caption || undefined);
      setShowUpload(false);
      setSelectedFile(null);
      setCaption('');
      setPreview(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally { setUploading(false); }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image className="w-4 h-4 text-ocean-600" />
          <h3 className="font-semibold text-gray-900">Portfolio</h3>
          <span className="text-xs text-gray-400">({items.length}/20)</span>
        </div>
        {canEdit && items.length < 20 && (
          <button onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-ocean-600 text-white text-xs font-medium rounded-lg hover:bg-ocean-700 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Photo
          </button>
        )}
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <div className="p-8 text-center">
          <Image className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No portfolio photos yet</p>
          {canEdit && <p className="text-xs text-gray-400 mt-1">Showcase your best work to attract more bookings</p>}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 p-1">
          {items.map((item) => (
            <div key={item.id} className="relative group aspect-square overflow-hidden rounded-lg bg-gray-100">
              <img src={item.mediaUrl} alt={item.caption ?? 'Portfolio'} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-end justify-between p-2">
                <button onClick={() => setLightbox(item)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs bg-black/50 px-2 py-1 rounded">
                  View
                </button>
                {canEdit && onDelete && (
                  <button onClick={() => onDelete(item.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-red-500 text-white rounded-full">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Captions list */}
      {items.some((i) => i.caption) && (
        <div className="p-4 border-t border-gray-100 space-y-2">
          {items.filter((i) => i.caption).map((item) => (
            <div key={item.id} className="flex gap-2 text-sm">
              <div className="w-8 h-8 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                <img src={item.mediaUrl} alt="" className="w-full h-full object-cover" />
              </div>
              <p className="text-gray-600 text-xs mt-1">{item.caption}</p>
            </div>
          ))}
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Add Portfolio Photo</h3>
              <button onClick={() => { setShowUpload(false); setSelectedFile(null); setPreview(null); setCaption(''); setError(''); }}
                className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {preview ? (
                <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  <button onClick={() => { setSelectedFile(null); setPreview(null); }}
                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-ocean-400 transition-colors">
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/*"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Click to select a photo</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP — max {MAX_SIZE_MB} MB</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Caption (optional)</label>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  placeholder="Describe this project…" maxLength={500}
                  value={caption} onChange={(e) => setCaption(e.target.value)} />
              </div>
              {error && (
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 pb-5">
              <button onClick={() => { setShowUpload(false); setSelectedFile(null); setPreview(null); setCaption(''); setError(''); }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={handleUpload} disabled={uploading || !selectedFile}
                className="flex items-center gap-2 px-5 py-2 bg-ocean-600 text-white text-sm font-semibold rounded-lg hover:bg-ocean-700 disabled:opacity-50 transition-colors">
                {uploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setLightbox(null)}>
          <div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.mediaUrl} alt={lightbox.caption ?? ''} className="w-full rounded-xl" />
            {lightbox.caption && <p className="text-white/70 text-sm text-center mt-3">{lightbox.caption}</p>}
            <button onClick={() => setLightbox(null)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
