import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import type { MechanicStats, DailyStats, LeaderboardEntry, SlowJob } from '../types/performance';

// ============================================================
// Performance Service — wraps aggregation RPCs
// Includes in-memory cache to avoid redundant API calls
// ============================================================

// Simple TTL cache to reduce repeated fetches
const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data as T;
  if (entry) cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

export const performanceService = {
  async getMechanicStats(
    mechanicId: string,
    from?: string,
    to?: string
  ): Promise<MechanicStats | null> {
    if (!config.useSupabase || !supabase) return null;

    const cacheKey = `mechStats:${mechanicId}:${from || ''}:${to || ''}`;
    const cached = getCached<MechanicStats>(cacheKey);
    if (cached) return cached;

    const params: Record<string, unknown> = { p_mechanic_id: mechanicId };
    if (from) params.p_from = from;
    if (to) params.p_to = to;

    const { data, error } = await supabase.rpc('get_mechanic_stats', params);
    if (error) throw error;
    if (!data || data.length === 0) return null;

    const row = data[0];
    const result: MechanicStats = {
      totalJobs: Number(row.total_jobs) || 0,
      completedJobs: Number(row.completed_jobs) || 0,
      avgCompletionMin: row.avg_completion_min != null ? Number(row.avg_completion_min) : null,
      onTimePct: Number(row.on_time_pct) || 0,
      totalRevenue: Number(row.total_revenue) || 0,
      partsCost: Number(row.parts_cost) || 0,
    };
    setCache(cacheKey, result);
    return result;
  },

  async getMechanicDailyStats(
    mechanicId: string,
    days = 7
  ): Promise<DailyStats[]> {
    if (!config.useSupabase || !supabase) return [];

    const cacheKey = `dailyStats:${mechanicId}:${days}`;
    const cached = getCached<DailyStats[]>(cacheKey);
    if (cached) return cached;

    const { data, error } = await supabase.rpc('get_mechanic_daily_stats', {
      p_mechanic_id: mechanicId,
      p_days: days,
    });
    if (error) throw error;

    const result = (data || []).map((row: Record<string, unknown>) => ({
      date: row.stat_date as string,
      jobsCompleted: Number(row.jobs_completed) || 0,
      avgMin: row.avg_min != null ? Number(row.avg_min) : null,
      revenue: Number(row.revenue) || 0,
    }));
    setCache(cacheKey, result);
    return result;
  },

  async getTeamLeaderboard(
    from?: string,
    to?: string
  ): Promise<LeaderboardEntry[]> {
    if (!config.useSupabase || !supabase) return [];

    const cacheKey = `leaderboard:${from || ''}:${to || ''}`;
    const cached = getCached<LeaderboardEntry[]>(cacheKey);
    if (cached) return cached;

    const params: Record<string, unknown> = {};
    if (from) params.p_from = from;
    if (to) params.p_to = to;

    const { data, error } = await supabase.rpc('get_team_leaderboard', params);
    if (error) throw error;

    const result = (data || []).map((row: Record<string, unknown>) => ({
      mechanicId: row.mechanic_id as string,
      mechanicName: row.mechanic_name as string,
      mechanicAvatar: row.mechanic_avatar as string,
      mechanicColor: row.mechanic_color as string,
      jobsCompleted: Number(row.jobs_completed) || 0,
      avgMin: row.avg_min != null ? Number(row.avg_min) : null,
      onTimePct: Number(row.on_time_pct) || 0,
      revenue: Number(row.revenue) || 0,
    }));
    setCache(cacheKey, result);
    return result;
  },

  async getSlowJobs(thresholdMultiplier = 1.5): Promise<SlowJob[]> {
    if (!config.useSupabase || !supabase) return [];

    const cacheKey = `slowJobs:${thresholdMultiplier}`;
    const cached = getCached<SlowJob[]>(cacheKey);
    if (cached) return cached;

    const { data, error } = await supabase.rpc('get_slow_jobs', {
      p_threshold_multiplier: thresholdMultiplier,
    });
    if (error) throw error;

    const result = (data || []).map((row: Record<string, unknown>) => ({
      jobId: row.job_id as string,
      customerName: row.customer_name as string,
      bike: row.bike as string,
      serviceType: row.service_type as string,
      mechanicName: (row.mechanic_name as string) || null,
      estimatedMin: Number(row.estimated_min),
      actualMin: Number(row.actual_min),
      overtimePct: Number(row.overtime_pct) || 0,
      completedAt: row.completed_at as string,
    }));
    setCache(cacheKey, result);
    return result;
  },
};
