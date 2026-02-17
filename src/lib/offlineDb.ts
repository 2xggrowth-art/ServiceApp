// ============================================================
// offlineDb.ts — IndexedDB cache for offline-first data
// Uses raw IndexedDB (no library) to keep bundle small
// ============================================================

const DB_NAME = 'bch-offline';
const DB_VERSION = 3; // v3: added pendingMedia store

const STORES = {
  jobs: 'jobs',
  mechanics: 'mechanics',
  parts: 'parts',
  meta: 'meta',
  pendingActions: 'pendingActions',
  pendingMedia: 'pendingMedia',
} as const;

export function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.jobs)) db.createObjectStore(STORES.jobs, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.mechanics)) db.createObjectStore(STORES.mechanics, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.parts)) db.createObjectStore(STORES.parts, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.meta)) db.createObjectStore(STORES.meta, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(STORES.pendingActions)) db.createObjectStore(STORES.pendingActions, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.pendingMedia)) db.createObjectStore(STORES.pendingMedia, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putAll<T extends { id: unknown }>(storeName: string, items: T[]): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  for (const item of items) {
    store.put(item);
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  const req = store.getAll();
  return new Promise((resolve, reject) => {
    req.onsuccess = () => { db.close(); resolve(req.result as T[]); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORES.meta, 'readwrite');
  tx.objectStore(STORES.meta).put({ key, value });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function getMeta(key: string): Promise<unknown> {
  const db = await openDb();
  const tx = db.transaction(STORES.meta, 'readonly');
  const req = tx.objectStore(STORES.meta).get(key);
  return new Promise((resolve, reject) => {
    req.onsuccess = () => { db.close(); resolve(req.result?.value ?? null); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

// ============================================================
// Public API
// ============================================================
export const offlineDb = {
  // Cache fresh data from Supabase
  async cacheJobs(jobs: Array<{ id: unknown }>) { await putAll(STORES.jobs, jobs); await setMeta('jobs_cached_at', Date.now()); },
  async cacheMechanics(mechs: Array<{ id: unknown }>) { await putAll(STORES.mechanics, mechs); },
  async cacheParts(parts: Array<{ id: unknown }>) { await putAll(STORES.parts, parts); },

  // Read cached data when offline
  async getCachedJobs<T>(): Promise<T[]> { return getAll<T>(STORES.jobs); },
  async getCachedMechanics<T>(): Promise<T[]> { return getAll<T>(STORES.mechanics); },
  async getCachedParts<T>(): Promise<T[]> { return getAll<T>(STORES.parts); },

  // Meta helpers
  async getLastCachedAt(): Promise<number | null> { return (await getMeta('jobs_cached_at')) as number | null; },

  // Pending media (photos/audio stored as Blobs for offline upload)
  async savePendingMedia(tempJobId: string, photos: Blob[], audio: Blob | null): Promise<void> {
    const db = await openDb();
    const tx = db.transaction(STORES.pendingMedia, 'readwrite');
    tx.objectStore(STORES.pendingMedia).put({
      id: tempJobId,
      photos,
      audio,
      createdAt: Date.now(),
    });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  },

  async getPendingMedia(tempJobId: string): Promise<{ photos: Blob[]; audio: Blob | null } | null> {
    const db = await openDb();
    const tx = db.transaction(STORES.pendingMedia, 'readonly');
    const req = tx.objectStore(STORES.pendingMedia).get(tempJobId);
    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        db.close();
        if (!req.result) { resolve(null); return; }
        resolve({ photos: req.result.photos || [], audio: req.result.audio || null });
      };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  },

  async removePendingMedia(tempJobId: string): Promise<void> {
    const db = await openDb();
    const tx = db.transaction(STORES.pendingMedia, 'readwrite');
    tx.objectStore(STORES.pendingMedia).delete(tempJobId);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  },
};
