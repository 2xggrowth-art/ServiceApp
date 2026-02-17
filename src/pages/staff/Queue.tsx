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
    unassigned: jobs.filter(j => j.status === STATUS.RECEIVED).length,
    working: jobs.filter(j => j.status === STATUS.IN_PROGRESS).length,
    parts: jobs.filter(j => j.status === STATUS.PARTS_PENDING).length,
    ready: jobs.filter(j => j.status === STATUS.READY).length,
  };

  let filtered = jobs;
  if (filter === 'unassigned') filtered = jobs.filter(j => j.status === STATUS.RECEIVED);
  else if (filter === 'working') filtered = jobs.filter(j => j.status === STATUS.IN_PROGRESS);
  else if (filter === 'parts') filtered = jobs.filter(j => j.status === STATUS.PARTS_PENDING);
  else if (filter === 'ready') filtered = jobs.filter(j => j.status === STATUS.READY);

  const statusOrder = [STATUS.PARTS_PENDING, STATUS.IN_PROGRESS, STATUS.ASSIGNED, STATUS.RECEIVED, STATUS.QUALITY_CHECK, STATUS.READY, STATUS.COMPLETED];
  filtered = [...filtered].sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));

  const filters = [
    { id: 'all', label: 'All', color: 'bg-blue-primary' },
    { id: 'unassigned', label: 'Unassigned', color: 'bg-grey-muted' },
    { id: 'working', label: 'Working', color: 'bg-amber-500' },
    { id: 'parts', label: 'Parts Wait', color: 'bg-orange-action' },
    { id: 'ready', label: 'Ready', color: 'bg-emerald-500' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-extrabold tracking-tight">Service Queue</h3>
        <p className="text-[11px] text-grey-muted mt-0.5">{jobs.length} active job{jobs.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Filter Pills — refined with color indicators */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`shrink-0 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all duration-200 cursor-pointer flex items-center gap-2
              ${filter === f.id
                ? `${f.color} text-white shadow-sm`
                : 'bg-white text-grey-muted border border-grey-border/80 hover:bg-grey-bg active:scale-[0.97]'}`}>
            {f.label}
            <span className={`min-w-5 h-5 flex items-center justify-center rounded-md text-[10px] font-bold ${
              filter === f.id ? 'bg-white/20' : 'bg-grey-bg'
            }`}>
              {counts[f.id]}
            </span>
          </button>
        ))}
      </div>

      {/* Jobs List */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-grey-bg mx-auto mb-3 flex items-center justify-center text-3xl">📋</div>
          <p className="text-grey-muted font-medium text-sm">No jobs match this filter</p>
          <p className="text-grey-light text-xs mt-1">Try selecting a different category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job, i) => (
            <div key={job.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
              <JobCard job={job} mechanic={mechMap[job.mechanicId]} />
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-[10px] text-grey-light mt-4 font-medium">Tap cards for details</p>
    </div>
  );
}
