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

export const googleSheetsService = {
  get isEnabled() {
    return ENABLED;
  },

  /**
   * Sync a single completed job to the appropriate monthly tab.
   * Uses no-cors to avoid CORS preflight issues with Apps Script.
   * Only hard network errors (offline, DNS) will throw.
   */
  async syncJob(payload: SheetJobPayload): Promise<void> {
    if (!ENABLED) return;

    await fetch(SHEETS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    });
  },

  /**
   * Batch sync multiple jobs (for manual re-sync).
   * Sends in chunks of 50 to stay within Apps Script limits.
   */
  async batchSync(payloads: SheetJobPayload[]): Promise<{ synced: number; failed: number }> {
    if (!ENABLED || payloads.length === 0) return { synced: 0, failed: 0 };

    const CHUNK_SIZE = 50;
    let synced = 0;
    let failed = 0;

    for (let i = 0; i < payloads.length; i += CHUNK_SIZE) {
      const chunk = payloads.slice(i, i + CHUNK_SIZE);
      try {
        await fetch(SHEETS_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(chunk),
        });
        synced += chunk.length;
      } catch {
        failed += chunk.length;
      }
    }
    return { synced, failed };
  },
};
