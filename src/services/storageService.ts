/**
 * Supabase Storage helpers for the documents private bucket.
 *
 * Storage path convention:
 *   {ownerId}/{boatId}/{docId}/{fileName}
 *
 * This ensures the storage RLS policy `foldername[1] = auth.uid()` works
 * automatically — each user can only touch their own folder.
 */

import { supabase, isDemoMode } from '../lib/supabase';

const BUCKET = 'documents';
/** Signed URL TTL in seconds (15 minutes) */
const SIGNED_URL_TTL = 900;

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

export interface UploadResult {
  storagePath: string;   // path stored in DB
  publicUrl?: string;    // only set if bucket is public (not our case)
}

/**
 * Upload a file to Supabase Storage.
 * Returns the storage path to persist in the database.
 * Throws on failure.
 */
export async function uploadDocument(
  file: File,
  ownerId: string,
  boatId: string,
  docId: string,
): Promise<UploadResult> {
  if (isDemoMode || !supabase) {
    // Demo mode — simulate a URL so the rest of the flow works
    await new Promise((r) => setTimeout(r, 600));
    return {
      storagePath: `${ownerId}/${boatId}/${docId}/${file.name}`,
    };
  }

  const path = `${ownerId}/${boatId}/${docId}/${file.name}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  return { storagePath: path };
}

// ---------------------------------------------------------------------------
// Download (presigned URL)
// ---------------------------------------------------------------------------

/**
 * Generate a short-lived signed download URL for a stored document.
 * Falls back to the raw storage path in demo mode.
 */
export async function getDownloadUrl(storagePath: string): Promise<string> {
  if (isDemoMode || !supabase) {
    // In demo mode return a placeholder so the UI doesn't break
    return `#demo-download/${storagePath}`;
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL);

  if (error) throw new Error(`Could not generate download URL: ${error.message}`);

  return data.signedUrl;
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

/**
 * Permanently remove a file from storage.
 * Called when a document record is hard-deleted (not soft-deleted).
 */
export async function deleteStorageFile(storagePath: string): Promise<void> {
  if (isDemoMode || !supabase) return;

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([storagePath]);

  if (error) throw new Error(`Storage delete failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Upload with progress (returns an XHR-backed Promise for progress events)
// ---------------------------------------------------------------------------

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

/**
 * Upload with real progress callbacks.
 * In demo mode it simulates progress at ~100ms intervals.
 */
export async function uploadDocumentWithProgress(
  file: File,
  ownerId: string,
  boatId: string,
  docId: string,
  onProgress: (p: UploadProgress) => void,
): Promise<UploadResult> {
  if (isDemoMode || !supabase) {
    // Simulate progress steps for demo
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      await new Promise((r) => setTimeout(r, 100));
      onProgress({ loaded: i * 10, total: 100, percent: i * 10 });
    }
    return { storagePath: `${ownerId}/${boatId}/${docId}/${file.name}` };
  }

  // Supabase JS v2 doesn't expose upload progress natively via the client.
  // We use a native XHR upload to get progress events, then delegate the
  // database insert to the caller.
  return new Promise((resolve, reject) => {
    const path = `${ownerId}/${boatId}/${docId}/${file.name}`;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

    // Get the current session token for auth header
    supabase!.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token ?? key;

      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('x-upsert', 'false');
      xhr.setRequestHeader('Content-Type', file.type);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percent: Math.round((e.loaded / e.total) * 100),
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ storagePath: path });
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error during upload')));

      const form = new FormData();
      form.append('', file);
      xhr.send(form);
    });
  });
}
