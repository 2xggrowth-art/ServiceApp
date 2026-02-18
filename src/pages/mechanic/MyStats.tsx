import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { STATUS } from '../../lib/constants';
import { formatCurrency } from '../../lib/helpers';
import { config } from '../../lib/config';
import { performanceService } from '../../services/performanceService';
import Card from '../../components/ui/Card';
import type { MechanicStats, DailyStats } from '../../types/performance';

type Period = '7d' | '30d' | '90d';
const PERIOD_DAYS: Record<Period, number> = { '7d': 7, '30d': 30, '90d': 90 };
const PERIOD_LABELS: Record<Period, string> = { '7d': '7 Days', '30d': '30 Days', '90d': '90 Days' };

function getDateRange(period: Period): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - PERIOD_DAYS[period]);
  return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
}

export default function MyStats() {
  const { getMechanicJobs, currentMechanicId, jobs } = useApp();
  const myJobs = getMechanicJobs(currentMechanicId);

  // Period toggle
  const [period, setPeriod] = useState<Period>('30d');

  // Real stats from Supabase RPCs
  const [stats, setStats] = useState<MechanicStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(config.useSupabase);

  // Stale-while-revalidate cache
  const cacheRef = useRef<Record<string, { stats: MechanicStats | null; daily: DailyStats[]; ts: number }>>({});

  useEffect(() => {
    if (!config.useSupabase || !currentMechanicId) return;
    let cancelled = false;

    const cacheKey = `${currentMechanicId}-${period}`;
    const cached = cacheRef.current[cacheKey];

    // Serve stale data immediately if available (< 5 min old)
    if (cached && Date.now() - cached.ts < 300_000) {
      setStats(cached.stats);
      setDailyStats(cached.daily);
      setLoading(false);
      return;
    }
    // Show stale data while revalidating
    if (cached) {
      setStats(cached.stats);
      setDailyStats(cached.daily);
    }

    // Skip network call when offline — use cached/stale data
    if (!navigator.onLine) {
      setLoading(false);
      return;
    }

    async function load() {
      const { from, to } = getDateRange(period);
      try {
        const [s, d] = await Promise.all([
          performanceService.getMechanicStats(currentMechanicId, from, to),
          performanceService.getMechanicDailyStats(currentMechanicId, PERIOD_DAYS[period]),
        ]);
        if (cancelled) return;
        setStats(s);
        setDailyStats(d);
        cacheRef.current[cacheKey] = { stats: s, daily: d, ts: Date.now() };
      } catch (err) {
        console.error('Failed to load performance stats:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [currentMechanicId, period]);

  // Fallback: compute from local state if no Supabase stats
  const done = myJobs.filter(j => [STATUS.COMPLETED, STATUS.READY, STATUS.QUALITY_CHECK].includes(j.status));
  const onTime = done.filter(j => j.actualMin && j.estimatedMin && j.actualMin <= j.estimatedMin).length;
  const localOnTimeRate = done.length > 0 ? Math.round((onTime / done.length) * 100) : 0;
  const completedAll = jobs.filter(j => j.mechanicId === currentMechanicId && [STATUS.COMPLETED, STATUS.READY].includes(j.status));
  const localAvgTime = completedAll.length > 0 ? Math.round(completedAll.reduce((s, j) => s + (j.actualMin || 0), 0) / completedAll.length) : 0;

  // Use Supabase stats if available, otherwise local
  const totalJobs = stats?.totalJobs ?? done.length;
  const onTimeRate = stats?.onTimePct ?? localOnTimeRate;
  const avgTime = stats?.avgCompletionMin ?? localAvgTime;
  const revenue = stats?.totalRevenue ?? 0;
  const incentive = 0;

  // Weekly chart data
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayIdx = (new Date().getDay() + 6) % 7; // Monday = 0

  // Build chart data from dailyStats or fallback
  const weekData = weekDays.map((_, i) => {
    if (dailyStats.length > 0) {
      // Find matching day from dailyStats
      const d = new Date();
      const dayOfWeek = (d.getDay() + 6) % 7; // today's index (Mon=0)
      const diff = i - dayOfWeek;
      const targetDate = new Date(d);
      targetDate.setDate(d.getDate() + diff);
      const dateStr = targetDate.toISOString().split('T')[0];
      const found = dailyStats.find(s => s.date === dateStr);
      return found?.jobsCompleted ?? 0;
    }
    // Fallback: today's count from local data
    return i === todayIdx ? done.length : 0;
  });

  const maxVal = Math.max(...weekData, 1);

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 border-3 border-blue-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-grey-muted">Loading stats...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Period Toggle */}
      <div className="flex gap-1 bg-grey-bg rounded-xl p-1">
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer
              ${period === p ? 'bg-blue-primary text-white shadow-sm' : 'text-grey-muted hover:text-grey-text'}`}>
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon="🔧" value={totalJobs} label={`Jobs (${PERIOD_LABELS[period]})`} />
        <StatCard icon="💰" value={formatCurrency(incentive)} label="Incentive" />
      </div>

      {/* Weekly Chart */}
      <h3 className="text-sm font-bold text-grey-muted uppercase tracking-wider">Daily Jobs (This Week)</h3>
      <Card>
        <div className="space-y-2.5">
          {weekDays.map((day, i) => {
            const val = weekData[i];
            const pct = Math.max((val / maxVal) * 100, val > 0 ? 15 : 0);
            const isToday = i === todayIdx;
            return (
              <div key={day} className="flex items-center gap-3">
                <span className={`text-xs w-8 shrink-0 font-semibold ${isToday ? 'text-blue-primary font-extrabold' : 'text-grey-muted'}`}>
                  {day}
                </span>
                <div className="flex-1 h-6 bg-grey-bg rounded-lg overflow-hidden">
                  {val > 0 && (
                    <div
                      className="h-full rounded-lg flex items-center px-2 text-white text-xs font-bold transition-all duration-700"
                      style={{ width: `${pct}%`, background: isToday ? '#2563eb' : '#16a34a' }}
                    >
                      {val}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Performance Summary */}
      <h3 className="text-sm font-bold text-grey-muted uppercase tracking-wider">Performance Summary</h3>
      <Card>
        <div className="space-y-3">
          <SummaryRow label="Total revenue generated" value={formatCurrency(revenue)} />
          <SummaryRow label="Parts cost" value={formatCurrency(stats?.partsCost ?? 0)} />
        </div>
      </Card>
    </div>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <Card className="text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xl font-extrabold">{value}</div>
      <div className="text-xs text-grey-muted">{label}</div>
    </Card>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-grey-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
