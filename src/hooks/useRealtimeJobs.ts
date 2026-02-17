import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import { getToday } from '../lib/helpers';
import { notifyViaServiceWorker } from '../lib/notifications';

/**
 * Subscribe to real-time changes on the jobs table for today.
 * Calls onJobChange with { eventType, new, old } on each change.
 * Also triggers browser notifications for key events.
 */
export function useRealtimeJobs(onJobChange, currentUserId?: string) {
  const stableCallback = useCallback(onJobChange, [onJobChange]);

  useEffect(() => {
    if (!config.useSupabase || !supabase) return;

    const today = getToday();

    const channel = supabase
      .channel('jobs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: `date=eq.${today}`,
        },
        (payload) => {
          stableCallback({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
          });

          // Trigger notifications for relevant events
          if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
            const newRow = payload.new as Record<string, unknown>;
            const oldRow = payload.old as Record<string, unknown>;
            const isMyJob = currentUserId && newRow.mechanic_id === currentUserId;

            // Job assigned to me
            if (isMyJob && oldRow.status === 'received' && newRow.status === 'assigned') {
              notifyViaServiceWorker('New Job Assigned', `${newRow.bike} — ${newRow.service_type}`, {
                tag: `job-assigned-${newRow.id}`,
              });
            }

            // QC failed — sent back to me
            if (isMyJob && newRow.qc_status === 'failed' && oldRow.qc_status !== 'failed') {
              notifyViaServiceWorker('QC Failed', `${newRow.bike} needs rework`, {
                tag: `qc-failed-${newRow.id}`,
              });
            }

            // Parts received — my job can resume
            if (isMyJob && oldRow.status === 'parts_pending' && newRow.status === 'in_progress') {
              notifyViaServiceWorker('Parts Ready', `Parts arrived for ${newRow.bike}`, {
                tag: `parts-ready-${newRow.id}`,
              });
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (err) console.warn('[Realtime:jobs] subscription error:', err.message);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stableCallback, currentUserId]);
}
