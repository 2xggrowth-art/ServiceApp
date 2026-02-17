// ============================================================
// BCH Service Management - Shared TypeScript Types
// ============================================================

// --- Roles ---
export type Role = 'owner' | 'admin' | 'mechanic' | 'staff';
export type MechanicLevel = 'senior' | 'junior';

// --- Job ---
export type JobStatus =
  | 'received'
  | 'assigned'
  | 'in_progress'
  | 'parts_pending'
  | 'quality_check'
  | 'ready'
  | 'completed';

export type ServiceType = 'regular' | 'repair' | 'makeover' | 'insurance';
export type Priority = 'standard' | 'urgent';
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'credit';
export type QcStatus = 'passed' | 'failed';
export type TimeBlock = 'morning' | 'afternoon';
export type MechanicStatus = 'on_duty' | 'off_duty' | 'on_leave';

export interface ServiceTypeConfig {
  id: ServiceType;
  label: string;
  icon: string;
  time: number;
  price: number;
}

export interface PartUsed {
  name: string;
  qty: number;
  price: number;
}

export interface PartNeeded {
  name: string;
  status: string;
}

export type { Bike } from './bike';

export interface Job {
  id: string | number;
  customerName: string;
  customerPhone?: string;
  customerId?: string | null;
  bike: string;
  bikeId?: string | null;
  serviceType: ServiceType;
  services?: string[];       // Multi-select service items chosen at check-in
  checkinParts?: string[];   // Multi-select parts chosen at check-in
  issue?: string;
  priority: Priority;
  status: JobStatus;
  mechanicId?: string;
  estimatedMin?: number;
  actualMin?: number | null;
  date: string;
  timeBlock?: TimeBlock;
  partsUsed: PartUsed[];
  partsNeeded?: PartNeeded[];
  laborCharge?: number | null;
  totalCost?: number | null;
  paymentMethod?: PaymentMethod;
  qcStatus?: QcStatus;
  photoBefore?: string;
  photoAfter?: string;
  createdBy?: string;
  expectedCompletionAt?: string | null;
  qcNotes?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  pausedAt?: string | null;
  paidAt?: string | null;
  createdAt: string;
}

// --- User ---
export interface User {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role: Role | MechanicLevel; // context returns mechanic_level as role
  mechanicLevel?: MechanicLevel;
  avatar: string;
  color: string;
  status: MechanicStatus;
  isActive?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
}

export interface Mechanic {
  id: string;
  name: string;
  phone: string;
  role: MechanicLevel;
  avatar: string;
  color: string;
  status: MechanicStatus;
}

// --- Customer ---
export interface Customer {
  id: string | number;
  name: string;
  phone: string;
  visits: number;
  lastVisitDate?: string | null;
  loyaltyPoints?: number;
  createdAt?: string;
}

// --- Part ---
export interface Part {
  id: string | number;
  name: string;
  stock: number;
  price: number;
  reorderAt: number;
}

// --- Auth ---
export interface AppUser {
  id: string;
  name: string;
  role: Role;
  email?: string;
  phone?: string;
  avatar: string;
  color: string;
  mechanicLevel?: MechanicLevel;
  authUserId?: string;
}

// --- Dashboard Stats ---
export interface DashboardStats {
  totalJobs: number;
  completed: number;
  inProgress: number;
  partsPending: number;
  ready: number;
  qc: number;
  revenue: number;
  jobs: Job[];
}

// --- Activity Log ---
export interface ActivityLog {
  id: string;
  jobId?: string;
  userId?: string;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
  users?: { name: string; avatar: string; color: string };
  jobs?: { customer_name: string; bike: string; service_type: string };
}

// --- Toast ---
export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface Toast {
  message: string;
  type: ToastType;
}
