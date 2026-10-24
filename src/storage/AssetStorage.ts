/**
 * BeatFlow Studio - Audio Asset Storage using IndexedDB
 * Persists microphone recordings and imported audio files across browser sessions.
 */

const DB_NAME = 'BeatFlowStudioDB';
const DB_VERSION = 1;
const ASSETS_STORE = 'audio_assets';
const PROJECTS_STORE = 'projects';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(ASSETS_STORE)) {
        db.createObjectStore(ASSETS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface StoredAsset {
  id: string;
  name: string;
  blob: Blob;
  duration: number;
  sampleRate: number;
  channels: number;
  peaks: number[];
  createdAt: number;
}

export class AssetStorage {
  static async saveAsset(asset: StoredAsset): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(ASSETS_STORE, 'readwrite');
      const store = tx.objectStore(ASSETS_STORE);
      const req = store.put(asset);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  static async getAsset(id: string): Promise<StoredAsset | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(ASSETS_STORE, 'readonly');
      const store = tx.objectStore(ASSETS_STORE);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  static async getAllAssets(): Promise<StoredAsset[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(ASSETS_STORE, 'readonly');
      const store = tx.objectStore(ASSETS_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  static async deleteAsset(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(ASSETS_STORE, 'readwrite');
      const store = tx.objectStore(ASSETS_STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Computes normalized peaks (e.g. 100 points) for fast rendering in waveforms
   */
  static extractPeaks(audioBuffer: AudioBuffer, peakCount = 120): number[] {
    const channelData = audioBuffer.getChannelData(0);
    const step = Math.floor(channelData.length / peakCount);
    const peaks: number[] = [];

    for (let i = 0; i < peakCount; i++) {
      let max = 0;
      const start = i * step;
      const end = Math.min(start + step, channelData.length);
      for (let j = start; j < end; j++) {
        const val = Math.abs(channelData[j]);
        if (val > max) max = val;
      }
      peaks.push(Math.min(1, max));
    }
    return peaks;
  }
}
