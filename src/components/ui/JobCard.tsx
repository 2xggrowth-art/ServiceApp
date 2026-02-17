import { memo } from 'react';
import type { ReactNode } from 'react';
import { StatusBadge, ServiceBadge, PriorityBadge } from './Badge';
import { formatTime, getToday } from '../../lib/helpers';
import { STATUS } from '../../lib/constants';
import type { Job, Mechanic } from '../../types';

interface JobCardProps {
  job: Job;
  mechanic?: Mechanic;
  actions?: ReactNode;
  dimCompleted?: boolean;
  hideTime?: boolean;
}

/** Calculate how many days this job has been in progress (1 = today) */
function getDayNumber(jobDate: string): number {
  const today = new Date(getToday());
  const created = new Date(jobDate);
  const diff = Math.floor((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  return diff + 1; // Day 1 = same day
}

export default memo(function JobCard({ job, mechanic, actions, dimCompleted = false, hideTime = false }: JobCardProps) {
  const dayNum = getDayNumber(job.date);
  const isCarryover = dayNum > 1;
  const isUrgent = job.priority === 'urgent' && ![STATUS.COMPLETED, STATUS.READY].includes(job.status);
  const isDone = [STATUS.COMPLETED, STATUS.READY, STATUS.QUALITY_CHECK].includes(job.status);

  const borderColor = isUrgent ? 'border-l-red-urgent' :
    job.status === STATUS.PARTS_PENDING ? 'border-l-orange-action' :
    job.status === STATUS.IN_PROGRESS ? 'border-l-blue-primary' :
    isDone ? 'border-l-green-success' : 'border-l-gray-300';

  return (
    <div className={`bg-white rounded-2xl p-4 shadow-card border-l-[5px] border-2 border-gray-100 ${borderColor} ${dimCompleted && isDone ? 'opacity-60' : ''}`}>
      {/* Top badges row — prominent day + urgent */}
      {(isCarryover || isUrgent) && (
        <div className="flex items-center gap-1.5 mb-2.5">
          {isUrgent && <PriorityBadge />}
          {isCarryover && (
            <span className={`px-2.5 py-1 rounded-xl text-xs font-extrabold ${
              dayNum >= 3 ? 'bg-red-urgent text-white' : 'bg-amber-500 text-white'
            }`}>
              Day {dayNum}
            </span>
          )}
        </div>
      )}

      {/* Header — bold, high contrast */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {job.photoBefore ? (
            <img src={job.photoBefore.startsWith('[') ? (JSON.parse(job.photoBefore)[0] || '') : job.photoBefore} alt="" loading="lazy" className="w-12 h-12 rounded-xl object-cover ring-2 ring-gray-200" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-xl">🏍️</div>
          )}
          <div>
            <h4 className="font-bold text-sm text-black leading-tight">{job.customerName}</h4>
            <p className="text-xs text-black/60 mt-0.5 font-medium">{job.bike}</p>
          </div>
        </div>
        <ServiceBadge type={job.serviceType} />
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-black/60 font-medium mb-3">
        {!hideTime && <span className="flex items-center gap-1">⏰ {formatTime(job.estimatedMin)}</span>}
        {mechanic && (
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center text-white" style={{ backgroundColor: mechanic.color || '#6b7280' }}>
              {mechanic.name?.[0]}
            </span>
            {mechanic.name}
          </span>
        )}
        {job.status === STATUS.PARTS_PENDING && job.partsNeeded && (
          <span className="text-orange-action font-bold">🔧 {job.partsNeeded.map(p => p.name).join(', ')}</span>
        )}
      </div>

      {/* Issue */}
      {job.issue && (
        <p className="text-xs text-black/60 mb-3 leading-relaxed line-clamp-2 font-medium">{job.issue}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t-2 border-gray-100">
        <div className="flex items-center gap-2 mt-1.5">
          <StatusBadge status={job.status} />
        </div>
      </div>

      {/* Full-width actions slot */}
      {actions && (
        <div className="mt-3">{actions}</div>
      )}
    </div>
  );
});
