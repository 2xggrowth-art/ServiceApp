import { useApp } from '../../context/AppContext';
import { STATUS } from '../../lib/constants';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function Team() {
  const { mechanics, getDashboardStats, showToast } = useApp();
  const stats = getDashboardStats();

  const perfData = mechanics.map(m => {
    const mechJobs = stats.jobs.filter(j => j.mechanicId === m.id);
    const done = mechJobs.filter(j => [STATUS.COMPLETED, STATUS.READY, STATUS.QUALITY_CHECK].includes(j.status)).length;
    const total = mechJobs.length;
    const onTime = mechJobs.filter(j => j.actualMin && j.estimatedMin && j.actualMin <= j.estimatedMin).length;
    return { ...m, done, total, onTimeRate: done > 0 ? Math.round((onTime / done) * 100) : 0 };
  }).sort((a, b) => b.done - a.done);

  return (
    <div className="space-y-4">
      {/* Weekly Performance */}
      <h3 className="text-sm font-bold text-grey-muted uppercase tracking-wider">Weekly Performance</h3>
      <Card>
        <div className="space-y-3">
          {perfData.map((m, i) => {
            const simWeekly = (m.done * 5) + [12, 10, 8, 6, 5][i];
            const pct = (simWeekly / 40) * 100;
            const colors = ['#16a34a', '#2563eb', '#ea580c', '#6b7280', '#9ca3af'];
            return (
              <div key={m.id} className="flex items-center gap-3">
                <span className="text-xs font-semibold w-14 shrink-0 truncate">{m.name}</span>
                <div className="flex-1 h-6 bg-grey-bg rounded-lg overflow-hidden">
                  <div
                    className="h-full rounded-lg flex items-center px-2 text-white text-xs font-bold transition-all duration-700"
                    style={{ width: `${pct}%`, background: colors[i] }}
                  >
                    {simWeekly}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Workload Balance */}
      <h3 className="text-sm font-bold text-grey-muted uppercase tracking-wider">Workload Balance</h3>
      <Card>
        <div className="space-y-3">
          {perfData.map(m => {
            const loadPct = m.total > 0 ? (m.total / 5) * 100 : 0;
            return (
              <div key={m.id} className="flex items-center gap-3">
                <span className="text-xs font-semibold w-14 shrink-0 truncate">{m.name}</span>
                <div className="flex-1 h-6 bg-grey-bg rounded-lg overflow-hidden">
                  <div
                    className="h-full rounded-lg flex items-center px-2 text-white text-xs font-bold transition-all duration-700"
                    style={{
                      width: `${Math.min(loadPct, 100)}%`,
                      background: loadPct > 80 ? '#dc2626' : loadPct > 50 ? '#ea580c' : '#2563eb',
                    }}
                  >
                    {m.total} jobs
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Button variant="outline" block onClick={() => showToast('Workload rebalanced!', 'success')}>
        ⚖️ Auto-Rebalance Workload
      </Button>

      {/* Today Stats */}
      <h3 className="text-sm font-bold text-grey-muted uppercase tracking-wider">Today's Stats</h3>
      {perfData.map(m => (
        <Card key={m.id} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: m.color }}>
            {m.avatar}
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm">{m.name}</div>
            <div className="text-xs text-grey-muted">{m.done}/{m.total} done • On-time: {m.onTimeRate}%</div>
          </div>
          {m.done === m.total && m.total > 0 && <span className="text-xl">🏆</span>}
        </Card>
      ))}
    </div>
  );
}
