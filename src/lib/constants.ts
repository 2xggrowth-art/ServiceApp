import type { JobStatus, ServiceType, ServiceTypeConfig, Role, Priority } from '../types';

// Job status flow
export const STATUS: Record<string, JobStatus> = {
  RECEIVED: 'received',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  PARTS_PENDING: 'parts_pending',
  QUALITY_CHECK: 'quality_check',
  READY: 'ready',
  COMPLETED: 'completed',
};

export const STATUS_LABELS: Record<JobStatus, string> = {
  received: 'Received',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  parts_pending: 'Parts Wait',
  quality_check: 'QC Check',
  ready: 'Ready',
  completed: 'Completed',
};

export const STATUS_COLORS: Record<JobStatus, string> = {
  received: 'grey',
  assigned: 'blue',
  in_progress: 'blue',
  parts_pending: 'orange',
  quality_check: 'purple',
  ready: 'green',
  completed: 'green',
};

// Service types
export const SERVICE_TYPES: Record<ServiceType, ServiceTypeConfig> = {
  regular:   { id: 'regular',   label: 'Regular Service',    icon: '🔧', time: 45,  price: 500 },
  repair:    { id: 'repair',    label: 'Repair',             icon: '⚡', time: 90,  price: 200 },
  makeover:  { id: 'makeover',  label: 'Complete Makeover',  icon: '🧽', time: 240, price: 2459 },
  insurance: { id: 'insurance', label: 'Insurance Service',  icon: '✅', time: 30,  price: 0 },
};

// Roles
export const ROLES: Record<string, Role> = {
  OWNER: 'owner',
  ADMIN: 'admin',
  STAFF: 'staff',
  MECHANIC: 'mechanic',
};

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  staff: 'Support Staff',
  mechanic: 'Mechanic',
};

export const ROLE_ICONS: Record<Role, string> = {
  owner: 'O',
  admin: 'A',
  staff: 'S',
  mechanic: 'M',
};

// Priority
export const PRIORITY: Record<string, Priority> = {
  STANDARD: 'standard',
  URGENT: 'urgent',
};
