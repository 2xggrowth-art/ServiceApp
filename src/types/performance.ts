// ============================================================
// Performance Tracking Types
// ============================================================

export interface MechanicStats {
  totalJobs: number;
  completedJobs: number;
  avgCompletionMin: number | null;
  onTimePct: number;
  totalRevenue: number;
  partsCost: number;
}

export interface DailyStats {
  date: string;
  jobsCompleted: number;
  avgMin: number | null;
  revenue: number;
}

export interface LeaderboardEntry {
  mechanicId: string;
  mechanicName: string;
  mechanicAvatar: string;
  mechanicColor: string;
  jobsCompleted: number;
  avgMin: number | null;
  onTimePct: number;
  revenue: number;
}

export interface SlowJob {
  jobId: string;
  customerName: string;
  bike: string;
  serviceType: string;
  mechanicName: string | null;
  estimatedMin: number;
  actualMin: number;
  overtimePct: number;
  completedAt: string;
}
