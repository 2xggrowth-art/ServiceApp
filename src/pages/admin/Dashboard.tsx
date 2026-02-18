import { useState, useEffect, useMemo, memo } from 'react';
import type { ReactNode } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatTimer } from '../../lib/helpers';
import { STATUS, STATUS_LABELS, STATUS_COLORS } from '../../lib/constants';
import { config } from '../../lib/config';
import { performanceService } from '../../services/performanceService';
import Card from '../../components/ui/Card';
import { IndianRupee, Clock, AlertTriangle, CheckCircle2, Truck, Bike, Wrench, UserX } from 'lucide-react';
import type { SlowJob } from '../../types/performance';

const MemoStatCard = memo(StatCard);

export default function Dashboard() {
  const { getDashboardStats, mechanics } = useApp();
  const stats = getDashboardStats();

  // Memoize live jobs list to avoid re-sorting on every render
  const liveJobs = useMemo(() =>
    stats.jobs
      .filter(j => j.status !== STATUS.COMPLETED)
      .sort((a, b) => {
        const priority = { urgent: 0, standard: 1 };
        return (priority[a.priority] || 1) - (priority[b.priority] || 1);
      }),
    [stats.jobs]
  );

  // Live timer tick — updates every 5s for active job timers (reduces re-renders)
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  // Slow jobs alert
  const [slowJobs, setSlowJobs] = useState<SlowJob[]>([]);
  useEffect(() => {
    if (!config.useSupabase || !navigator.onLine) return;
    performanceService.getSlowJobs(1.5)
      .then(setSlowJobs)
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-3">
      {/* Revenue Card — Premium Dark */}
      <Card elevated className="!bg-gradient-to-br from-admin-dark to-admin-surface text-white py-8 px-5 text-center relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl" style={{ background: 'rgba(37,99,235,0.2)' }} />
        <div className="relative">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <IndianRupee size={24} className="text-blue-300" />
          </div>
          <div className="text-[32px] font-black tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(stats.revenue)}</div>
          <div className="text-admin-text text-[13px] font-medium mt-1">Today's Revenue</div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <MemoStatCard icon={<Bike size={22} className="text-blue-primary" />} value={stats.totalJobs} label="Total Jobs" accent="bg-blue-primary" />
        <MemoStatCard icon={<CheckCircle2 size={22} className="text-green-success" />} value={stats.completed} label="Completed" accent="bg-green-success" />
        <MemoStatCard icon={<Wrench size={22} className="text-orange-action" />} value={stats.inProgress} label="In Progress" accent="bg-orange-action" />
        <MemoStatCard icon={<UserX size={22} className="text-grey-muted" />} value={stats.unassigned} label="Unassigned" accent="bg-grey-muted" />
        <MemoStatCard icon={<AlertTriangle size={22} className="text-red-urgent" />} value={stats.partsPending} label="Parts Pending" accent="bg-red-urgent" />
      </div>

      {/* Alerts Section */}
      {(stats.unassigned > 0 || stats.partsPending > 0 || stats.ready > 0) && (
        <div className="space-y-2">
          <h3 className="text-[13px] font-semibold text-grey-muted uppercase tracking-widest mt-6 mb-3">Alerts</h3>

          {stats.unassigned > 0 && (
            <Card bordered borderColor="border-grey-muted" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-grey-bg rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                <UserX size={18} className="text-grey-muted" />
              </div>
              <div className="flex-1">
                <div className="text-[15px] font-bold leading-snug">{stats.unassigned} bike(s) unassigned</div>
                <div className="text-[11px] text-grey-muted mt-0.5">Assign to a mechanic</div>
              </div>
            </Card>
          )}

          {stats.ready > 0 && (
            <Card bordered borderColor="border-green-success" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-green-light rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                <Truck size={18} className="text-green-success" />
              </div>
              <div className="flex-1">
                <div className="text-[15px] font-bold leading-snug">{stats.ready} job(s) ready for pickup</div>
                <div className="text-[11px] text-grey-muted mt-0.5">Waiting for customer</div>
              </div>
            </Card>
          )}

          {stats.partsPending > 0 && (
            <Card bordered borderColor="border-orange-action" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-orange-light rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                <Clock size={18} className="text-orange-action" />
              </div>
              <div className="flex-1">
                <div className="text-[15px] font-bold leading-snug">{stats.partsPending} job(s) waiting for parts</div>
                <div className="text-[11px] text-grey-muted mt-0.5">Follow up with supplier</div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Slow Jobs Alert */}
      {slowJobs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[13px] font-semibold text-grey-muted uppercase tracking-widest mt-6 mb-3">Overtime Jobs (30d)</h3>
          {slowJobs.slice(0, 3).map(sj => (
            <Card key={sj.jobId} bordered borderColor="border-red-urgent" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-light rounded-xl flex items-center justify-center">
                <Clock size={18} className="text-red-urgent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold truncate">{sj.bike}</div>
                <div className="text-[11px] text-grey-muted">
                  {sj.mechanicName || 'Unassigned'} • {sj.actualMin}min / {sj.estimatedMin}min est
                  <span className="text-red-urgent font-semibold"> (+{Math.round(sj.overtimePct)}%)</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Mechanic Workload Heatmap */}
      <h3 className="text-[13px] font-semibold text-grey-muted uppercase tracking-widest mt-6 mb-3">Workload Heatmap</h3>
      <Card>
        <div className="space-y-3">
          {mechanics.map(mech => {
            const mechJobs = stats.jobs.filter(j => j.mechanicId === mech.id);
            const activeCount = mechJobs.filter(j =>
              [STATUS.ASSIGNED, STATUS.IN_PROGRESS].includes(j.status)
            ).length;
            const doneCount = mechJobs.filter(j =>
              [STATUS.COMPLETED, STATUS.READY, STATUS.QUALITY_CHECK].includes(j.status)
            ).length;
            const totalCount = mechJobs.length;
            const loadPct = totalCount > 0 ? Math.round((totalCount / 6) * 100) : 0;

            // Find active job with running timer
            const activeJob = mechJobs.find(j => j.status === STATUS.IN_PROGRESS && j.startedAt);
            const elapsed = activeJob?.startedAt ? now - new Date(activeJob.startedAt).getTime() : null;
            const isOvertime = elapsed !== null && activeJob?.estimatedMin
              ? elapsed > activeJob.estimatedMin * 60000
              : false;

            return (
              <div key={mech.id} className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 ring-2 ring-white shadow-card"
                  style={{ background: mech.color }}
                >
                  {mech.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold truncate">{mech.name}</span>
                    <span className="text-[10px] text-grey-muted">
                      {activeCount} active • {doneCount} done
                    </span>
                  </div>
                  {elapsed !== null && activeJob && (
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-grey-muted truncate">{activeJob.bike}</span>
                      <span className={`text-[11px] font-bold font-mono ${isOvertime ? 'text-red-urgent' : 'text-blue-primary'}`}>
                        {formatTimer(elapsed)}
                      </span>
                    </div>
                  )}
                  <div className="h-2.5 bg-grey-bg rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.min(loadPct, 100)}%`,
                        background: loadPct > 80 ? '#dc2626' : loadPct > 50 ? '#ea580c' : '#16a34a',
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Real-Time Status Board — Grouped List */}
      <h3 className="text-[13px] font-semibold text-grey-muted uppercase tracking-widest mt-6 mb-3">Live Job Board</h3>
      {liveJobs.length > 0 ? (
        <Card className="divide-y divide-grey-border/50 overflow-hidden !p-0">
          {liveJobs.map(job => {
            const mech = mechanics.find(m => m.id === job.mechanicId);
            const statusColor = STATUS_COLORS[job.status] || 'grey';
            const dotMap: Record<string, string> = {
              blue: 'bg-blue-primary',
              orange: 'bg-orange-action',
              green: 'bg-green-success',
              purple: 'bg-purple-700',
              grey: 'bg-grey-muted',
            };

            return (
              <div key={job.id} className="flex items-center gap-3 py-3 px-4 hover:bg-admin-card-hover transition-colors duration-150">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotMap[statusColor] || 'bg-grey-muted'}
                  ${job.status === STATUS.IN_PROGRESS ? 'animate-pulse-dot' : ''}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold truncate">{job.bike}</span>
                    {job.priority === 'urgent' && (
                      <span className="text-[10px] bg-red-urgent text-white px-1.5 py-0.5 rounded font-bold">URGENT</span>
                    )}
                  </div>
                  <div className="text-[11px] text-grey-muted truncate">
                    {job.serviceId && <span className="font-mono font-bold text-blue-600/70 mr-1">{job.serviceId}</span>}
                    {job.customerName} • {STATUS_LABELS[job.status]}
                  </div>
                </div>
                {mech && (
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                    style={{ background: mech.color }}
                  >
                    {mech.avatar}
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      ) : (
        <Card className="text-center py-8">
          <div className="w-14 h-14 bg-green-light rounded-2xl flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={28} className="text-green-success" />
          </div>
          <p className="text-[15px] font-semibold text-grey-text mb-1">All caught up</p>
          <p className="text-[13px] text-grey-muted">No active jobs right now</p>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon, value, label, accent }: { icon: ReactNode; value: number; label: string; accent?: string }) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-3xl opacity-10 ${accent || 'bg-blue-primary'}`} />
      <div className="relative">
        <div className="mb-2">{icon}</div>
        <div className="text-[28px] font-black leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        <div className="text-[11px] text-grey-muted font-medium mt-1.5 uppercase tracking-wide">{label}</div>
      </div>
    </Card>
  );
}
