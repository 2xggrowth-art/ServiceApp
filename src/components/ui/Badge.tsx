import { STATUS_LABELS, STATUS_COLORS, SERVICE_TYPES } from '../../lib/constants';
import type { JobStatus } from '../../types';

const statusStyles: Record<string, string> = {
  grey:   'bg-gray-100 text-gray-600',
  blue:   'bg-blue-light text-blue-primary',
  orange: 'bg-amber-50 text-amber-600',
  purple: 'bg-purple-light text-purple-qc',
  green:  'bg-emerald-50 text-emerald-600',
};

const dotStyles: Record<string, string> = {
  grey:   'bg-gray-400',
  blue:   'bg-blue-primary',
  orange: 'bg-amber-500',
  purple: 'bg-purple-qc',
  green:  'bg-emerald-500',
};

export function StatusBadge({ status }: { status: JobStatus }) {
  const color = STATUS_COLORS[status] || 'grey';
  const isActive = status === 'in_progress';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wide ${statusStyles[color]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[color]} ${isActive ? 'animate-pulse-dot' : ''}`} />
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function ServiceBadge({ type }: { type: string }) {
  const st = SERVICE_TYPES[type];
  if (!st) return null;

  const badgeColors: Record<string, string> = {
    regular:   'bg-blue-light/70 text-blue-primary',
    repair:    'bg-orange-light/70 text-orange-action',
    makeover:  'bg-purple-light/70 text-purple-qc',
    insurance: 'bg-green-light/70 text-green-success',
    free:      'bg-gray-100 text-gray-600',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${badgeColors[type] || 'bg-gray-100 text-gray-600'}`}>
      {st.label}
    </span>
  );
}

export function PriorityBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-urgent/10 text-red-urgent border border-red-urgent/20 uppercase tracking-wide">
      URGENT
    </span>
  );
}
