// ============================================================
// offlineQueue.ts — Queues mutations made while offline
// Replays them with exponential backoff when connectivity is restored
// ============================================================

import { openDb } from './offlineDb';

export type QueuedActionStatus = 'pending' | 'retrying' | 'failed';

export interface QueuedAction {
  id: string;
  action: string;          // e.g. 'startJob', 'completeJob', 'processPayment'
  args: unknown[];         // arguments to replay
  createdAt: string;       // ISO timestamp
  retryCount: number;      // how many times we've tried replaying this
  lastError?: string;      // last error message
  status: QueuedActionStatus;
}

const STORE = 'pendingActions';
const MAX_RETRIES = 5;

// Simple listeners for reactive count updates
type Listener = () => void;
const listeners: Set<Listener> = new Set();

function notifyListeners() {
  listeners.forEach(fn => fn());
}

export const offlineQueue = {
  /** Subscribe to queue changes. Returns unsubscribe function. */
  onChange(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  async enqueue(action: string, args: unknown[]): Promise<void> {
    const item: QueuedAction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      action,
      args,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    };
    const db = await openDb();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(item);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => { db.close(); notifyListeners(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  },

  async getAll(): Promise<QueuedAction[]> {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    return new Promise((resolve, reject) => {
      req.onsuccess = () => { db.close(); resolve(req.result); };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  },

  /** Get only retryable items (pending or retrying, under max retries) */
  async getRetryable(): Promise<QueuedAction[]> {
    const all = await this.getAll();
    return all.filter(a => a.status !== 'failed' && a.retryCount < MAX_RETRIES);
  },

  /** Increment retry count and record error. Marks as 'failed' if max reached. */
  async incrementRetry(id: string, errorMsg: string): Promise<void> {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.get(id);
    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const item = req.result as QueuedAction | undefined;
        if (!item) { db.close(); resolve(); return; }
        item.retryCount += 1;
        item.lastError = errorMsg;
        item.status = item.retryCount >= MAX_RETRIES ? 'failed' : 'retrying';
        store.put(item);
        tx.oncomplete = () => { db.close(); notifyListeners(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  },

  /** Count items that have permanently failed */
  async getFailedCount(): Promise<number> {
    const all = await this.getAll();
    return all.filter(a => a.status === 'failed').length;
  },

  /** Reset all failed items back to pending for manual retry */
  async resetFailed(): Promise<void> {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const items = req.result as QueuedAction[];
        for (const item of items) {
          if (item.status === 'failed') {
            item.status = 'pending';
            item.retryCount = 0;
            item.lastError = undefined;
            store.put(item);
          }
        }
        tx.oncomplete = () => { db.close(); notifyListeners(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  },

  async remove(id: string): Promise<void> {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => { db.close(); notifyListeners(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  },

  async clear(): Promise<void> {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => { db.close(); notifyListeners(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  },

  async count(): Promise<number> {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).count();
    return new Promise((resolve, reject) => {
      req.onsuccess = () => { db.close(); resolve(req.result); };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  },
};
