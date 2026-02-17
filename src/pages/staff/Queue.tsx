import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { STATUS } from '../../lib/constants';
import JobCard from '../../components/ui/JobCard';

export default function Queue() {
  const { getDashboardStats, mechanics, isDataLoading } = useApp();
  const stats = getDashboardStats();
  const jobs = stats.jobs;
  const mechMap = Object.fromEntries(mechanics.map(m => [m.id, m]));

  const [filter, setFilter] = useState('all');

  if (isDataLoading) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 border-3 border-blue-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-grey-muted">Loading queue...</p>
      </div>
    );
  }

  const counts: Record<string, number> = {
    all: jobs.length,
    working: jobs.filter(j => j.status === STATUS.IN_PROGRESS).length,
    parts: jobs.filter(j => j.status === STATUS.PARTS_PENDING).length,
    ready: jobs.filter(j => j.status === STATUS.READY).length,
  };

  let filtered = jobs;
  if (filter === 'working') filtered = jobs.filter(j => j.status === STATUS.IN_PROGRESS);
  else if (filter === 'parts') filtered = jobs.filter(j => j.status === STATUS.PARTS_PENDING);
  else if (filter === 'ready') filtered = jobs.filter(j => j.status === STATUS.READY);

  const statusOrder = [STATUS.PARTS_PENDING, STATUS.IN_PROGRESS, STATUS.ASSIGNED, STATUS.RECEIVED, STATUS.QUALITY_CHECK, STATUS.READY, STATUS.COMPLETED];
  filtered = [...filtered].sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'working', label: 'Working' },
    { id: 'parts', label: 'Parts Wait' },
    { id: 'ready', label: 'Ready' },
  ];

  return (
    <div>
      {/* Filter Pills */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5
              ${filter === f.id
                ? 'bg-blue-primary text-white'
                : 'bg-white text-grey-muted border border-grey-border hover:bg-grey-bg'}`}>
            {f.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filter === f.id ? 'bg-white/25' : 'bg-grey-bg'}`}>
              {counts[f.id]}
            </span>
          </button>
        ))}
      </div>

      {/* Jobs List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-grey-muted">No jobs match this filter</p>
        </div>
      ) : (
        filtered.map(job => (
          <JobCard key={job.id} job={job} mechanic={mechMap[job.mechanicId]} />
        ))
      )}

      <p className="text-center text-xs text-grey-light mt-2">Swipe cards for quick actions</p>
    </div>
  );
}
