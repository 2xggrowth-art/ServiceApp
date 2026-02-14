import { useApp } from '../../context/AppContext';
import { STATUS } from '../../lib/constants';
import { formatCurrency } from '../../lib/helpers';
import Card from '../../components/ui/Card';

export default function MyStats() {
  const { getMechanicJobs, currentMechanicId, jobs } = useApp();
  const myJobs = getMechanicJobs(currentMechanicId);

  const done = myJobs.filter(j => [STATUS.COMPLETED, STATUS.READY, STATUS.QUALITY_CHECK].includes(j.status));
  const onTime = done.filter(j => j.actualMin && j.estimatedMin && j.actualMin <= j.estimatedMin).length;
  const onTimeRate = done.length > 0 ? Math.round((onTime / done.length) * 100) : 0;
  const completedAll = jobs.filter(j => j.mechanicId === currentMechanicId && [STATUS.COMPLETED, STATUS.READY].includes(j.status));
  const avgTime = completedAll.length > 0 ? Math.round(completedAll.reduce((s, j) => s + (j.actualMin || 0), 0) / completedAll.length) : 0;

  const monthJobs = 24 + done.length;
  const incentive = onTimeRate >= 80 ? 1500 : onTimeRate >= 60 ? 750 : 0;

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekData = [4, 5, 3, 6, 4, done.length];
  const todayIdx = (new Date().getDay() + 6) % 7;

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon="🔧" value={monthJobs} label="Jobs This Month" />
        <StatCard icon="⏰" value={`${onTimeRate}%`} label="On-Time Rate" />
        <StatCard icon="✅" value="92%" label="QC Score" />
        <StatCard icon="💰" value={formatCurrency(incentive)} label="Incentive Earned" />
      </div>

      {/* Weekly Chart */}
      <h3 className="text-sm font-bold text-grey-muted uppercase tracking-wider">Daily Jobs (This Week)</h3>
      <Card>
        <div className="space-y-2.5">
          {weekDays.map((day, i) => {
            const val = weekData[i];
            const pct = (val / 8) * 100;
            const isToday = i === todayIdx;
            return (
              <div key={day} className="flex items-center gap-3">
                <span className={`text-xs w-8 shrink-0 font-semibold ${isToday ? 'text-blue-primary font-extrabold' : 'text-grey-muted'}`}>
                  {day}
                </span>
                <div className="flex-1 h-6 bg-grey-bg rounded-lg overflow-hidden">
                  <div
                    className="h-full rounded-lg flex items-center px-2 text-white text-xs font-bold transition-all duration-700"
                    style={{ width: `${pct}%`, background: isToday ? '#2563eb' : '#16a34a' }}
                  >
                    {val}
                  </div>
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
          <SummaryRow label="Average completion time" value={`${avgTime || 35}m`} />
          <SummaryRow label="Customer satisfaction" value="4.5/5 ⭐" />
          <SummaryRow label="QC fail rate" value="8%" />
          <SummaryRow label="Parts accuracy" value="95%" />
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
