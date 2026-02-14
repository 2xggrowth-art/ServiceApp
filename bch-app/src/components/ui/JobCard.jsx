import Card from './Card';
import { StatusBadge, ServiceBadge, PriorityBadge } from './Badge';
import { formatTime } from '../../lib/helpers';
import { STATUS } from '../../lib/constants';

export default function JobCard({ job, mechanic, actions, dimCompleted = false }) {
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
          <span className="text-2xl">🏍️</span>
          <div>
            <h4 className="font-bold text-sm">{job.customerName}</h4>
            <p className="text-xs text-grey-muted">{job.bike}</p>
          </div>
        </div>
        <ServiceBadge type={job.serviceType} />
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
}
