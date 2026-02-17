import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import { getCallerId } from '../lib/authStore';

// ============================================================
// Activity Log Service — audit trail for all actions
// Batches log writes to reduce API calls (~80% reduction)
// ============================================================

export interface LogFilters {
  actionFilter?: string;
  mechanicId?: string;
  jobId?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface LogEntry {
  action: string;
  jobId: string | null;
  userId: string | null;
  details: Record<string, unknown>;
}

// Batch queue — collects logs and flushes periodically
const LOG_BATCH_SIZE = 5;
const LOG_FLUSH_INTERVAL = 5000; // 5 seconds
let logQueue: LogEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flushLogQueue() {
  if (logQueue.length === 0) return;
  const batch = [...logQueue];
  logQueue = [];
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }

  const callerId = getCallerId();

  // Use RPC for each (Supabase doesn't support batch RPC in one call)
  // but we send them as Promise.all to minimize round-trip time
  if (callerId) {
    await Promise.allSettled(
      batch.map(entry =>
        supabase.rpc('app_log_activity', {
          p_caller_id: callerId,
          p_action: entry.action,
          p_job_id: entry.jobId,
          p_details: entry.details,
        })
      )
    );
  } else {
    // Fallback: batch insert (single query!)
    const rows = batch.map(entry => ({
      action: entry.action,
      job_id: entry.jobId,
      user_id: entry.userId,
      details: entry.details,
    }));
    const { error } = await supabase.from('activity_logs').insert(rows);
    if (error) console.error('Failed to batch-log activity:', error);
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushLogQueue().catch(() => {});
  }, LOG_FLUSH_INTERVAL);
}

// Flush on page unload so logs aren't lost
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushLogQueue().catch(() => {});
  });
}

export const activityLogService = {
  // Log an action — queued and batched (fire-and-forget)
  async log(action: string, { jobId = null, userId = null, details = {}, beforeState = null, afterState = null }: {
    jobId?: string | null;
    userId?: string | null;
    details?: Record<string, unknown>;
    beforeState?: Record<string, unknown> | null;
    afterState?: Record<string, unknown> | null;
  } = {}) {
    if (!config.useSupabase) return null;

    const fullDetails = {
      ...details,
      ...(beforeState ? { _before: beforeState } : {}),
      ...(afterState ? { _after: afterState } : {}),
    };

    logQueue.push({ action, jobId, userId, details: fullDetails });

    // Flush immediately if batch is full, otherwise schedule
    if (logQueue.length >= LOG_BATCH_SIZE) {
      flushLogQueue().catch(() => {});
    } else {
      scheduleFlush();
    }
  },

  // Fetch recent activity logs
  async getRecent(limit = 20) {
    if (!config.useSupabase) return null;

    const { data, error } = await supabase
      .from('activity_logs')
      .select(`
        *,
        users:user_id (name, avatar, color),
        jobs:job_id (customer_name, bike, service_type)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  // Fetch recent logs with pagination and filters
  async getRecentLogs(limit = 50, offset = 0, filters: LogFilters = {}) {
    if (!config.useSupabase) return null;

    let query = supabase
      .from('activity_logs')
      .select(`
        *,
        users:user_id (name, avatar, color),
        jobs:job_id (customer_name, bike, service_type)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters.actionFilter && filters.actionFilter !== 'all') {
      query = query.eq('action', filters.actionFilter);
    }
    if (filters.mechanicId) {
      query = query.eq('user_id', filters.mechanicId);
    }
    if (filters.jobId) {
      query = query.eq('job_id', filters.jobId);
    }
    if (filters.dateFrom) {
      query = query.gte('created_at', `${filters.dateFrom}T00:00:00`);
    }
    if (filters.dateTo) {
      query = query.lte('created_at', `${filters.dateTo}T23:59:59`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      jobId: row.job_id,
      userId: row.user_id,
      action: row.action,
      details: row.details || {},
      createdAt: row.created_at,
      users: row.users,
      jobs: row.jobs,
    }));
  },

  // Export filtered logs as CSV string
  async exportCsv(filters: LogFilters = {}): Promise<string> {
    // Fetch up to 1000 logs for export
    const logs = await this.getRecentLogs(1000, 0, filters);
    if (!logs || logs.length === 0) return '';

    const headers = ['Date', 'Action', 'User', 'Customer', 'Bike', 'Details'];
    const rows = logs.map(log => [
      new Date(log.createdAt).toLocaleString('en-IN'),
      log.action,
      log.users?.name || '',
      log.jobs?.customer_name || '',
      log.jobs?.bike || '',
      JSON.stringify(log.details),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return csvContent;
  },

  // Fetch logs for a specific job
  async getForJob(jobId: string) {
    if (!config.useSupabase) return null;

    const { data, error } = await supabase
      .from('activity_logs')
      .select(`
        *,
        users:user_id (name, avatar, color)
      `)
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  },
};
