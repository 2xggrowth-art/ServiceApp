import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../lib/helpers';
import { STATUS } from '../../lib/constants';
import Card from '../../components/ui/Card';
import { IndianRupee, Bike, CheckCircle, Wrench, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const { getDashboardStats, mechanics, jobs } = useApp();
  const stats = getDashboardStats();
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4">
      {/* Revenue Card */}
      <Card className="bg-gradient-to-br from-blue-primary to-blue-700 text-white text-center py-6">
        <IndianRupee className="mx-auto mb-1" size={28} />
        <div className="text-3xl font-extrabold">{formatCurrency(stats.revenue)}</div>
        <div className="text-blue-200 text-sm mt-1">Today's Revenue</div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon="🏍️" value={stats.totalJobs} label="Total Jobs" />
        <StatCard icon="✅" value={stats.completed} label="Completed" />
        <StatCard icon="🔧" value={stats.inProgress} label="In Progress" />
        <StatCard icon="⚠️" value={stats.partsPending} label="Parts Pending" />
      </div>

      {/* QC Alert */}
      {stats.qc > 0 && (
        <Card bordered borderColor="border-purple-qc" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-light rounded-full flex items-center justify-center text-lg">🔍</div>
          <div>
            <div className="font-bold text-sm">{stats.qc} job(s) need QC check</div>
            <div className="text-xs text-grey-muted">Review before delivery</div>
          </div>
        </Card>
      )}

      {/* Team Status */}
      <h3 className="text-sm font-bold text-grey-muted uppercase tracking-wider mt-2">Team Status</h3>
      {mechanics.map(mech => {
        const mechJobs = stats.jobs.filter(j => j.mechanicId === mech.id);
        const activeJob = mechJobs.find(j => j.status === STATUS.IN_PROGRESS);
        const doneCount = mechJobs.filter(j => [STATUS.COMPLETED, STATUS.READY, STATUS.QUALITY_CHECK].includes(j.status)).length;
        const totalCount = mechJobs.length;
        const loadPct = totalCount > 0 ? Math.round((totalCount / 5) * 100) : 0;

        return (
          <Card key={mech.id} className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ background: mech.color }}
            >
              {mech.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{mech.name}</span>
                <span className="text-xs text-grey-muted">({mech.role})</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-grey-muted mt-0.5">
                <span className={`w-2 h-2 rounded-full ${activeJob ? 'bg-blue-primary animate-pulse-dot' : doneCount === totalCount && totalCount > 0 ? 'bg-green-success' : 'bg-gray-400'}`} />
                {activeJob ? activeJob.bike : doneCount === totalCount && totalCount > 0 ? 'All done' : 'Available'}
              </div>
              <div className="mt-1.5 h-1.5 bg-grey-bg rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(loadPct, 100)}%`,
                    background: loadPct > 80 ? '#dc2626' : loadPct > 50 ? '#ea580c' : '#16a34a',
                  }}
                />
              </div>
            </div>
            <span className="text-sm font-bold shrink-0">{doneCount}/{totalCount}</span>
          </Card>
        );
      })}
    </div>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <Card className="text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="text-xs text-grey-muted">{label}</div>
    </Card>
  );
}
