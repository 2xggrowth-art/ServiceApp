import { memo } from 'react';
import type { ReactNode } from 'react';
import Card from './Card';
import { StatusBadge, ServiceBadge, PriorityBadge } from './Badge';
import { formatTime, getToday } from '../../lib/helpers';
import { STATUS } from '../../lib/constants';
import type { Job, Mechanic } from '../../types';

interface JobCardProps {
  job: Job;
  mechanic?: Mechanic;
  actions?: ReactNode;
  dimCompleted?: boolean;
}

/** Calculate how many days this job has been in progress (1 = today) */
function getDayNumber(jobDate: string): number {
  const today = new Date(getToday());
  const created = new Date(jobDate);
  const diff = Math.floor((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  return diff + 1; // Day 1 = same day
}

export default memo(function JobCard({ job, mechanic, actions, dimCompleted = false }: JobCardProps) {
  const dayNum = getDayNumber(job.date);
  const isCarryover = dayNum > 1;
  const isUrgent = job.priority === 'urgent' && ![STATUS.COMPLETED, STATUS.READY].includes(job.status);
  const isDone = [STATUS.COMPLETED, STATUS.READY, STATUS.QUALITY_CHECK].includes(job.status);

  const borderColor = isUrgent ? 'border-red-urgent' :
    job.status === STATUS.PARTS_PENDING ? 'border-orange-action' :
    job.status === STATUS.IN_PROGRESS ? 'border-blue-primary' :
    isDone ? 'border-green-success' : 'border-grey-border';

  return (
    <Card
      bordered
      borderColor={borderColor}
      className={`mb-3 ${dimCompleted && isDone ? 'opacity-60' : ''}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          {job.photoBefore ? (
            <img src={job.photoBefore} alt="" loading="lazy" className="w-9 h-9 rounded-lg object-cover" />
          ) : (
            <span className="text-2xl">🏍️</span>
          )}
          <div>
            <h4 className="font-bold text-sm">{job.customerName}</h4>
            <p className="text-xs text-grey-muted">{job.bike}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isCarryover && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-action text-white">
              Day {dayNum}
            </span>
          )}
          <ServiceBadge type={job.serviceType} />
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-grey-muted mb-2">
        <span>⏰ {formatTime(job.estimatedMin)}</span>
        {mechanic && <span>👤 {mechanic.name}</span>}
        {isUrgent && <PriorityBadge />}
        {job.status === STATUS.PARTS_PENDING && job.partsNeeded && (
          <span className="text-orange-action">🔧 {job.partsNeeded.map(p => p.name).join(', ')}</span>
        )}
      </div>

      {/* Issue */}
      {job.issue && (
        <p className="text-xs text-grey-muted mb-3 leading-relaxed">{job.issue}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <StatusBadge status={job.status} />
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
    </Card>
  );
});
