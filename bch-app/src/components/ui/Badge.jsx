import { STATUS_LABELS, STATUS_COLORS, SERVICE_TYPES } from '../../lib/constants';

const statusStyles = {
  grey:   'bg-gray-100 text-gray-600',
  blue:   'bg-blue-light text-blue-primary',
  orange: 'bg-orange-light text-orange-action',
  purple: 'bg-purple-light text-purple-qc',
  green:  'bg-green-light text-green-success',
};

const dotStyles = {
  grey:   'bg-gray-400',
  blue:   'bg-blue-primary',
  orange: 'bg-orange-action',
  purple: 'bg-purple-qc',
  green:  'bg-green-success',
};

export function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || 'grey';
  const isActive = status === 'in_progress';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyles[color]}`}>
      <span className={`w-2 h-2 rounded-full ${dotStyles[color]} ${isActive ? 'animate-pulse-dot' : ''}`} />
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function ServiceBadge({ type }) {
  const st = SERVICE_TYPES[type];
  if (!st) return null;

  const badgeColors = {
    regular:   'bg-blue-light text-blue-primary',
    repair:    'bg-orange-light text-orange-action',
    makeover:  'bg-purple-light text-purple-qc',
    insurance: 'bg-green-light text-green-success',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${badgeColors[type]}`}>
      {st.icon} {st.label}
    </span>
  );
}

export function PriorityBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-red-light text-red-urgent">
      🚨 URGENT
    </span>
  );
}
