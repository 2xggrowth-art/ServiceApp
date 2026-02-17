import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { config } from '../lib/config';

/**
 * Subscribe to real-time changes on the users table (mechanic status changes).
 * Calls onUserChange with { eventType, new, old } on each change.
 */
export function useRealtimeUsers(onUserChange: (payload: {
  eventType: string;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}) => void) {
  const stableCallback = useCallback(onUserChange, [onUserChange]);

  useEffect(() => {
    if (!config.useSupabase || !supabase) return;

    const channel = supabase
      .channel('users-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: 'role=eq.mechanic',
        },
        (payload) => {
          stableCallback({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
          });
        }
      )
      .subscribe((status, err) => {
        if (err) console.warn('[Realtime:users] subscription error:', err.message);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stableCallback]);
}
