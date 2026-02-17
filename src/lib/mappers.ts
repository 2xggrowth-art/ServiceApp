import type { Job, Part, Bike } from '../types';

// ============================================================
// Shared DB <-> App field mapping functions
// Used by services AND realtime payload handling in AppContext
// ============================================================

/** Safely ensure a value is an array (handles JSON strings from Postgres) */
function ensureArray<T = string>(val: unknown): T[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { const parsed = JSON.parse(val); if (Array.isArray(parsed)) return parsed; } catch {}
  }
  return [];
}

/** Map a Supabase jobs row to the App Job interface */
export function mapJobFromDb(row: Record<string, unknown>): Job {
  return {
    id: row.id as string,
    customerName: row.customer_name as string,
    customerPhone: row.customer_phone as string | undefined,
    customerId: row.customer_id as string | null | undefined,
    bike: row.bike as string,
    bikeId: row.bike_id as string | null | undefined,
    serviceType: row.service_type as Job['serviceType'],
    issue: row.issue as string | undefined,
    priority: (row.priority as Job['priority']) || 'standard',
    status: row.status as Job['status'],
    mechanicId: row.mechanic_id as string | undefined,
    estimatedMin: row.estimated_min as number | undefined,
    actualMin: row.actual_min as number | null | undefined,
    date: row.date as string,
    timeBlock: row.time_block as Job['timeBlock'],
    partsUsed: ensureArray(row.parts_used),
    partsNeeded: ensureArray(row.parts_needed),
    services: ensureArray(row.services),
    checkinParts: ensureArray(row.checkin_parts),
    laborCharge: row.labor_charge ? Number(row.labor_charge) : null,
    totalCost: row.total_cost ? Number(row.total_cost) : null,
    paymentMethod: row.payment_method as Job['paymentMethod'],
    qcStatus: row.qc_status as Job['qcStatus'],
    photoBefore: row.photo_before as string | undefined,
    photoAfter: row.photo_after as string | undefined,
    createdBy: row.created_by as string | undefined,
    startedAt: row.started_at as string | null | undefined,
    completedAt: row.completed_at as string | null | undefined,
    pausedAt: row.paused_at as string | null | undefined,
    expectedCompletionAt: row.expected_completion_at as string | null | undefined,
    qcNotes: row.qc_notes as string | undefined,
    paidAt: row.paid_at as string | null | undefined,
    createdAt: row.created_at as string,
  };
}

/** Map App-side partial fields to DB column names for updates */
export function mapJobToDb(fields: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  if ('mechanicId' in fields) mapped.mechanic_id = fields.mechanicId;
  if ('estimatedMin' in fields) mapped.estimated_min = fields.estimatedMin;
  if ('actualMin' in fields) mapped.actual_min = fields.actualMin;
  if ('timeBlock' in fields) mapped.time_block = fields.timeBlock;
  if ('partsUsed' in fields) mapped.parts_used = fields.partsUsed;
  if ('partsNeeded' in fields) mapped.parts_needed = fields.partsNeeded;
  if ('services' in fields) mapped.services = fields.services;
  if ('checkinParts' in fields) mapped.checkin_parts = fields.checkinParts;
  if ('bikeId' in fields) mapped.bike_id = fields.bikeId;
  if ('customerId' in fields) mapped.customer_id = fields.customerId;
  if ('laborCharge' in fields) mapped.labor_charge = fields.laborCharge;
  if ('totalCost' in fields) mapped.total_cost = fields.totalCost;
  if ('paymentMethod' in fields) mapped.payment_method = fields.paymentMethod;
  if ('qcStatus' in fields) mapped.qc_status = fields.qcStatus;
  if ('startedAt' in fields) mapped.started_at = fields.startedAt;
  if ('completedAt' in fields) mapped.completed_at = fields.completedAt;
  if ('pausedAt' in fields) mapped.paused_at = fields.pausedAt;
  if ('paidAt' in fields) mapped.paid_at = fields.paidAt;
  if ('photoBefore' in fields) mapped.photo_before = fields.photoBefore;
  if ('photoAfter' in fields) mapped.photo_after = fields.photoAfter;
  if ('expectedCompletionAt' in fields) mapped.expected_completion_at = fields.expectedCompletionAt;
  if ('qcNotes' in fields) mapped.qc_notes = fields.qcNotes;
  return mapped;
}

/** Map a Supabase users row to the App Mechanic/User interface */
export function mapUserFromDb(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    name: row.name as string,
    phone: row.phone as string | undefined,
    email: row.email as string | undefined,
    role: row.role === 'mechanic' ? (row.mechanic_level as string) || 'junior' : row.role as string,
    mechanicLevel: row.mechanic_level as string | undefined,
    avatar: row.avatar as string,
    color: row.color as string,
    status: row.status as string,
    isActive: row.is_active as boolean,
    lastLoginAt: row.last_login_at as string | null | undefined,
    createdAt: row.created_at as string | undefined,
  };
}

/** Map a Supabase bikes row to the App Bike interface */
export function mapBikeFromDb(row: Record<string, unknown>): Bike {
  return {
    id: row.id as string,
    customerId: row.customer_id as string,
    bikeModel: row.bike_model as string,
    registrationNumber: row.registration_number as string | null | undefined,
    notes: row.notes as string | null | undefined,
    createdAt: row.created_at as string,
  };
}

/** Map a Supabase parts row to the App Part interface */
export function mapPartFromDb(row: Record<string, unknown>): Part {
  return {
    id: row.id as string,
    name: row.name as string,
    stock: row.stock as number,
    price: Number(row.price),
    reorderAt: row.reorder_at as number,
  };
}
