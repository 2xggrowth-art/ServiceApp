// ============================================================
// Google Sheets Sync Service
// Enable by setting VITE_GOOGLE_SHEETS_URL in .env
// Syncs completed job details to a Google Sheet organised by month
// ============================================================

import type { Job, Mechanic } from '../types';

const SHEETS_URL = import.meta.env.VITE_GOOGLE_SHEETS_URL || '';
const ENABLED = Boolean(SHEETS_URL);

export interface SheetJobPayload {
  id: string | number;
  serviceId?: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  bike: string;
  serviceType: string;
  services?: string[];
  issue?: string;
  priority: string;
  status: string;
  mechanicName?: string;
  estimatedMin?: number;
  actualMin?: number | null;
  partsUsed?: Job['partsUsed'];
  partsNeeded?: Job['partsNeeded'];
  laborCharge?: number | null;
  totalCost?: number | null;
  paymentMethod?: string;
  qcStatus?: string;
  timeBlock?: string;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  paidAt?: string | null;
  photoBefore?: string;
  photoAfter?: string;
}

/**
 * Build the flat payload sent to the Apps Script.
 * Resolves mechanic name from the mechanics array.
 */
export function buildSheetPayload(job: Job, mechanics: Mechanic[]): SheetJobPayload {
  const mechanic = mechanics.find(m => m.id === job.mechanicId);
  return {
    id: job.id,
    serviceId: job.serviceId,
    date: job.date,
    customerName: job.customerName,
    customerPhone: job.customerPhone,
    bike: job.bike,
    serviceType: job.serviceType,
    services: job.services,
    issue: job.issue,
    priority: job.priority,
    status: job.status,
    mechanicName: mechanic?.name,
    estimatedMin: job.estimatedMin,
    actualMin: job.actualMin,
    partsUsed: job.partsUsed,
    partsNeeded: job.partsNeeded,
    laborCharge: job.laborCharge,
    totalCost: job.totalCost,
    paymentMethod: job.paymentMethod,
    qcStatus: job.qcStatus,
    timeBlock: job.timeBlock,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    paidAt: job.paidAt,
    photoBefore: job.photoBefore,
    photoAfter: job.photoAfter,
  };
}

/**
 * Send data to Apps Script via GET with ?data= query param.
 * This avoids the POST→GET redirect issue that breaks doPost in browsers.
 */
async function sendToSheets(payload: unknown): Promise<void> {
  const url = `${SHEETS_URL}?data=${encodeURIComponent(JSON.stringify(payload))}`;
  await fetch(url, { redirect: 'follow' });
}

export const googleSheetsService = {
  get isEnabled() {
    return ENABLED;
  },

  /**
   * Sync a single job to the appropriate monthly tab.
   */
  async syncJob(payload: SheetJobPayload): Promise<void> {
    if (!ENABLED) return;

    try {
      await sendToSheets(payload);
    } catch {
      console.warn('Google Sheets sync failed for job', payload.id);
    }
  },

  /**
   * Batch sync multiple jobs (for manual re-sync).
   * Sends individually to stay within URL length limits.
   */
  async batchSync(payloads: SheetJobPayload[]): Promise<{ synced: number; failed: number }> {
    if (!ENABLED || payloads.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;

    for (const payload of payloads) {
      try {
        await sendToSheets(payload);
        synced++;
      } catch {
        failed++;
      }
    }
    return { synced, failed };
  },
};
