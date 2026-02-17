import { useState, useEffect, useCallback } from 'react';
import { offlineQueue } from '../lib/offlineQueue';

export type SyncStatus = 'idle' | 'syncing' | 'pending' | 'failed';

/**
 * Hook that provides offline status, pending action count, failed count,
 * and sync status. Reactively updates when the offline queue changes.
 */
export function useOfflineStatus() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  // Track online/offline status
  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  // Refresh counts from IndexedDB
  const refreshCount = useCallback(async () => {
    try {
      const [count, failed] = await Promise.all([
        offlineQueue.count(),
        offlineQueue.getFailedCount(),
      ]);
      setPendingCount(count);
      setFailedCount(failed);

      // Derive sync status
      if (failed > 0) {
        setSyncStatus('failed');
      } else if (count > 0) {
        setSyncStatus('pending');
      } else {
        setSyncStatus('idle');
      }
    } catch {
      // IndexedDB not available
    }
  }, []);

  // Subscribe to queue changes + initial count
  useEffect(() => {
    refreshCount();
    const unsub = offlineQueue.onChange(refreshCount);
    return unsub;
  }, [refreshCount]);

  /** Manually set syncing status (called from AppContext during replay) */
  const markSyncing = useCallback(() => setSyncStatus('syncing'), []);

  /** Reset failed items and trigger re-sync */
  const retryFailed = useCallback(async () => {
    await offlineQueue.resetFailed();
    // refreshCount will be triggered by onChange listener
  }, []);

  return { isOffline, pendingCount, failedCount, syncStatus, markSyncing, retryFailed };
}
