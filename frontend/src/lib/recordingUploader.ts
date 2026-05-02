import { uploadPersistedRecordingWithRetries } from './proctoringRecordingStorage';
import { ingestProctoringEvent } from '@/services/candidateService';

const QUEUE_KEY = 'recording_upload_queue_v1';
let processing = false;

function readQueue(): string[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function writeQueue(q: string[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    // ignore
  }
}

export function enqueueRecordingUpload(artifactId: string) {
  const q = readQueue();
  if (!q.includes(artifactId)) {
    q.push(artifactId);
    writeQueue(q);
  }
  void processQueue();
}

async function processQueue() {
  if (processing) return;
  processing = true;
  try {
    let q = readQueue();
    for (const artifactId of [...q]) {
      try {
        const res = await uploadPersistedRecordingWithRetries(artifactId, 3, 2000);
        
        // Notify backend of successful upload (silent to candidate UI)
        try {
          const submissionId = Number(artifactId.split('-')[0]) || 0;
          await ingestProctoringEvent({
            submission_id: submissionId,
            event_type: 'screen_recording_uploaded',
            timestamp: new Date().toISOString(),
            metadata: {
              artifact_id: res.artifactId,
              size_bytes: res.sizeBytes,
              storage_path: res.storagePath,
            },
          });
        } catch {
          // ignore ingest errors — event will be logged server-side
        }
        
        q = readQueue().filter((a) => a !== artifactId);
        writeQueue(q);
      } catch (err) {
        // keep in queue for retry; small delay before next attempt
        console.debug(`Recording upload failed for ${artifactId}, will retry later`, err);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  } finally {
    processing = false;
  }
}

// Start processing on module load (runs persisted uploads on app startup)
void processQueue();

export default { enqueueRecordingUpload };
