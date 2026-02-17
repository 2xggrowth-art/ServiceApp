import { useState, useEffect } from 'react';
import { activityLogService } from '../services/activityLogService';
import { config } from '../lib/config';

/**
 * Hook to fetch and manage activity logs.
 * Returns { logs, isLoading, refresh }.
 */
export function useActivityLog(limit = 20) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = async () => {
    if (!config.useSupabase) return;
    setIsLoading(true);
    try {
      const data = await activityLogService.getRecent(limit);
      if (data) setLogs(data);
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [limit]);

  return { logs, isLoading, refresh };
}
