import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { STATUS } from '../../lib/constants';
import { formatCurrency } from '../../lib/helpers';
import JobCard from '../../components/ui/JobCard';
import { Image, Volume2, Package, ChevronDown } from 'lucide-react';

/** Parse photoBefore field: could be JSON array of URLs or single URL */
function parsePhotoUrls(val?: string): string[] {
  if (!val) return [];
  if (val.startsWith('[')) {
    try { return JSON.parse(val); } catch { return []; }
  }
  return [val];
}

export default function Queue() {
  const { getDashboardStats, mechanics, isDataLoading, partsItems } = useApp();
  const stats = getDashboardStats();
  const jobs = stats.jobs;
  const mechMap = Object.fromEntries(mechanics.map(m => [m.id, m]));

  const [filter, setFilter] = useState<string>('unassigned');
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  if (isDataLoading) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 border-3 border-blue-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-grey-muted">Loading queue...</p>
      </div>
    );
  }

  const counts: Record<string, number> = {
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

      {/* Filter Pills */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(filter === f.id ? null : f.id)}
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
          {filtered.map((job, i) => {
            const isExpanded = expandedId === job.id;
            const photos = parsePhotoUrls(job.photoBefore);
            const audioUrl = job.photoAfter || '';
            const checkinParts = job.checkinParts || [];
            const laborCharge = job.laborCharge ?? 0;

            return (
              <div key={job.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
                <div
                  onClick={() => setExpandedId(isExpanded ? null : job.id)}
                  className="cursor-pointer"
                >
                  <JobCard job={job} mechanic={mechMap[job.mechanicId]} hideTime />
                </div>

                {/* Expanded Detail Panel */}
                {isExpanded && (
                  <div className="bg-gray-50 border-2 border-gray-100 border-t-0 rounded-b-2xl -mt-2 pt-4 px-4 pb-4 space-y-3">
                    {/* Photos */}
                    {photos.length > 0 && (
                      <div>
                        <h5 className="text-[10px] font-bold text-black/50 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Image size={12} /> Photos
                        </h5>
                        <div className="grid grid-cols-3 gap-2">
                          {photos.map((url, pi) => (
                            <div key={pi} className="aspect-square rounded-xl overflow-hidden border border-gray-200">
                              <img src={url} alt={`Photo ${pi + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Audio */}
                    {audioUrl && (
                      <div>
                        <h5 className="text-[10px] font-bold text-black/50 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Volume2 size={12} /> Voice Note
                        </h5>
                        <audio controls className="w-full h-10" preload="metadata">
                          <source src={audioUrl} />
                        </audio>
                      </div>
                    )}

                    {/* Parts from check-in */}
                    {checkinParts.length > 0 && (
                      <div>
                        <h5 className="text-[10px] font-bold text-black/50 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Package size={12} /> Parts
                        </h5>
                        <div className="flex flex-wrap gap-1.5">
                          {[...new Set(checkinParts)].map(name => {
                            const qty = checkinParts.filter(p => p === name).length;
                            const price = partsItems?.find(i => i.name === name)?.price || 0;
                            return (
                              <span key={name} className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[11px] font-medium text-black/70">
                                {name}{qty > 1 ? ` x${qty}` : ''}{price > 0 ? ` ₹${price * qty}` : ''}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Labor charge */}
                    {laborCharge > 0 && (
                      <div className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-gray-200">
                        <span className="text-xs font-medium text-black/60">Labor Charge</span>
                        <span className="text-sm font-bold text-green-success">{formatCurrency(laborCharge)}</span>
                      </div>
                    )}

                    {/* Full issue text */}
                    {job.issue && (
                      <div>
                        <h5 className="text-[10px] font-bold text-black/50 uppercase tracking-wider mb-1">Issue</h5>
                        <p className="text-xs text-black/70 leading-relaxed">{job.issue}</p>
                      </div>
                    )}

                    {/* Collapse hint */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setExpandedId(null); }}
                      className="w-full flex items-center justify-center gap-1 text-[10px] text-grey-muted font-medium pt-1 cursor-pointer"
                    >
                      <ChevronDown size={12} className="rotate-180" /> Tap to collapse
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
