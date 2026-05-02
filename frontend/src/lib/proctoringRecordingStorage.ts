const DB_NAME = 'interview-proctoring-db';
const DB_VERSION = 1;
const STORE_NAME = 'screen-recordings';

interface ScreenRecordingRecord {
  id: string;
  submissionId: number;
  createdAt: string;
  mimeType: string;
  sizeBytes: number;
  blob: Blob;
}

function openRecordingDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('submissionId', 'submissionId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open recording database.'));
  });
}

export async function persistScreenRecording(
  submissionId: number,
  blob: Blob,
): Promise<{ artifactId: string; sizeBytes: number }> {
  const db = await openRecordingDb();
  const artifactId = `${submissionId}-${Date.now()}`;
  const record: ScreenRecordingRecord = {
    id: artifactId,
    submissionId,
    createdAt: new Date().toISOString(),
    mimeType: blob.type || 'video/webm',
    sizeBytes: blob.size,
    blob,
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to persist screen recording.'));
  });

  db.close();
  return { artifactId, sizeBytes: blob.size };
}

import { apiClient } from '@/services/apiClient';

export async function uploadPersistedRecording(artifactId: string): Promise<{ artifactId: string; sizeBytes: number; storagePath?: string }> {
  const db = await openRecordingDb();
  const record = await new Promise<ScreenRecordingRecord | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(artifactId);
    req.onsuccess = () => resolve(req.result as ScreenRecordingRecord | undefined);
    req.onerror = () => reject(req.error ?? new Error('Failed to read recording'));
  });

  if (!record) throw new Error('Recording not found');

  const form = new FormData();
  form.append('recording', record.blob, `${artifactId}.webm`);

  // Use apiClient.postForm to include auth headers
  const res = await apiClient.postForm<{ artifactId: string; storagePath: string; sizeBytes: number }>(
    `/proctoring/recordings/${record.submissionId}/upload`,
    form,
  );

  db.close();
  return { artifactId: res.artifactId, sizeBytes: res.sizeBytes, storagePath: res.storagePath };
}

export async function uploadPersistedRecordingWithRetries(artifactId: string, attempts = 3, delayMs = 2000) {
  let lastError: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      return await uploadPersistedRecording(artifactId);
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, i)));
    }
  }
  throw lastError;
}
