import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { INITIAL_JOBS, MECHANICS, PARTS } from '../lib/mockData';
import { STATUS, SERVICE_TYPES } from '../lib/constants';
import { getToday, getTimeBlock, isWeekend } from '../lib/helpers';
import { config } from '../lib/config';
import { supabase } from '../lib/supabase';
import { mapJobFromDb, mapUserFromDb } from '../lib/mappers';
import { offlineDb } from '../lib/offlineDb';
import { offlineQueue } from '../lib/offlineQueue';
import { photoService } from '../services/photoService';
import { useAuth } from './AuthContext';
import { useRealtimeJobs } from '../hooks/useRealtimeJobs';
import { useRealtimeUsers } from '../hooks/useRealtimeUsers';
import { jobService } from '../services/jobService';
import { userService } from '../services/userService';
import { partsService } from '../services/partsService';
import { serviceOptionsService } from '../services/serviceOptionsService';
import { activityLogService } from '../services/activityLogService';
// WhatsApp notifications now use wa.me links (see src/lib/whatsapp.ts)
import { zohoService } from '../services/zohoService';
import { googleSheetsService, buildSheetPayload } from '../services/googleSheetsService';
import type { Job, Mechanic, Part } from '../types';
import type { ServiceOption } from '../services/serviceOptionsService';

export interface ServiceOptionItem {
  name: string;
  price: number;
}

interface AppContextValue {
  role: string;
  setRole: (role: string) => void;
  currentMechanicId: string | null;
  setCurrentMechanicId: (id: string) => void;
  jobs: Job[];
  mechanics: Mechanic[];
  parts: Part[];
  setParts: React.Dispatch<React.SetStateAction<Part[]>>;
  serviceList: string[];
  partsList: string[];
  serviceItems: ServiceOptionItem[];
  partsItems: ServiceOptionItem[];
  toast: { message: string; type: 'success' | 'error' | 'info' | 'warning' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  isOffline: boolean;
  isDataLoading: boolean;
  createJob: (data: Record<string, unknown>) => Promise<Job>;
  editJob: (jobId: string | number, updates: Record<string, unknown>) => Promise<void>;
  pickJob: (jobId: string | number) => Promise<void>;
  startJob: (jobId: string | number) => Promise<void>;
  completeJob: (jobId: string | number, partsUsed?: unknown[]) => Promise<void>;
  qcPassJob: (jobId: string | number) => Promise<void>;
  qcFailJob: (jobId: string | number) => Promise<void>;
  markPartsNeeded: (jobId: string | number, parts: unknown[]) => Promise<void>;
  markPartsReceived: (jobId: string | number) => Promise<void>;
  pauseJob: (jobId: string | number) => Promise<void>;
  resumeJob: (jobId: string | number) => Promise<void>;
  reassignJob: (jobId: string | number, mechanicId: string) => void;
  processPayment: (jobId: string | number, method: string) => Promise<void>;
  getDashboardStats: () => {
    totalJobs: number;
    completed: number;
    inProgress: number;
    partsPending: number;
    ready: number;
    qc: number;
    unassigned: number;
    revenue: number;
    jobs: Job[];
  };
  getMechanicJobs: (mechanicId: string) => Job[];
  autoAssign: (jobId: string | number) => void;
  refreshData: () => Promise<void>;
  refreshServiceOptions: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }) {
  const auth = useAuth();

  const [localRole, setLocalRole] = useState('staff');
  const [localMechanicId, setLocalMechanicId] = useState('mujju');

  const useSupabaseAuth = config.useSupabase && auth.isAuthenticated;
  const role = useSupabaseAuth ? auth.role : localRole;
  const currentMechanicId = useSupabaseAuth ? auth.currentMechanicId : localMechanicId;
  const setRole = useSupabaseAuth ? () => {} : setLocalRole;
  const setCurrentMechanicId = useSupabaseAuth ? () => {} : setLocalMechanicId;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [serviceList, setServiceList] = useState<string[]>([]);
  const [partsList, setPartsList] = useState<string[]>([]);
  const [serviceItems, setServiceItems] = useState<ServiceOptionItem[]>([]);
  const [partsItems, setPartsItems] = useState<ServiceOptionItem[]>([]);
  const [toast, setToast] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Track if initial load has run (prevent double-load in StrictMode)
  const didInit = useRef(false);

  // ============================================================
  // Online/offline detection + offline queue replay
  // ============================================================
  const replayQueueRef = useRef(false);
  const showToastRef = useRef<(message: string, type?: string) => void>(() => {});
  const replayActionRef = useRef<(action: string, args: unknown[]) => Promise<void>>(async () => {});
  const pollDataRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    const goOnline = async () => {
      setIsOffline(false);
      // Replay queued mutations with exponential backoff
      if (replayQueueRef.current) return; // prevent double replay
      replayQueueRef.current = true;
      try {
        const retryable = await offlineQueue.getRetryable();
        if (retryable.length > 0) {
          showToastRef.current(`Syncing ${retryable.length} offline action(s)...`, 'info');
          for (const item of retryable) {
            // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
            if (item.retryCount > 0) {
              const delay = Math.min(1000 * Math.pow(2, item.retryCount - 1), 30000);
              await new Promise(r => setTimeout(r, delay));
            }
            try {
              await replayActionRef.current(item.action, item.args);
              await offlineQueue.remove(item.id);
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Unknown error';
              console.error('Failed to replay queued action:', item, err);
              await offlineQueue.incrementRetry(item.id, msg);
            }
          }
          const remaining = await offlineQueue.count();
          const failed = await offlineQueue.getFailedCount();
          if (remaining === 0) {
            showToastRef.current('All changes synced!', 'success');
          } else if (failed > 0) {
            showToastRef.current(`${failed} action(s) failed — tap to retry`, 'error');
          } else {
            showToastRef.current(`${remaining} action(s) still pending`, 'warning');
          }
        }
        // Always refresh data from server after coming back online
        await pollDataRef.current();
      } catch {
        // IndexedDB error — not critical
      } finally {
        replayQueueRef.current = false;
      }
    };
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ============================================================
  // Initial data load — Supabase or mock
  // Wait for auth to finish loading so callerId is set before
  // making RPC calls (PIN users need callerId for SECURITY DEFINER RPCs)
  // ============================================================
  useEffect(() => {
    // Wait until auth has finished restoring session
    if (config.useSupabase && auth.isLoading) return;
    if (didInit.current) return;
    didInit.current = true;

    async function loadData() {
      if (!config.useSupabase) {
        setJobs(INITIAL_JOBS);
        setMechanics(MECHANICS);
        setParts(PARTS);
        setIsDataLoading(false);
        return;
      }

      try {
        const [jobsData, mechanicsData, partsData, serviceOpts] = await Promise.all([
          jobService.getJobsForDate(),
          userService.getMechanics(),
          partsService.getAll(),
          serviceOptionsService.getAll().catch(() => []),
        ]);
        if (jobsData) setJobs(jobsData);
        if (mechanicsData) setMechanics(mechanicsData as unknown as Mechanic[]);
        if (partsData) setParts(partsData);
        if (serviceOpts) {
          const svcOpts = serviceOpts.filter(o => o.type === 'service');
          const prtOpts = serviceOpts.filter(o => o.type === 'part');
          setServiceList(svcOpts.map(o => o.name));
          setPartsList(prtOpts.map(o => o.name));
          setServiceItems(svcOpts.map(o => ({ name: o.name, price: o.price })));
          setPartsItems(prtOpts.map(o => ({ name: o.name, price: o.price })));
        }

        // Cache to IndexedDB for offline use (fire-and-forget)
        if (jobsData) offlineDb.cacheJobs(jobsData).catch(() => {});
        if (mechanicsData) offlineDb.cacheMechanics(mechanicsData as Array<{ id: unknown }>).catch(() => {});
        if (partsData) offlineDb.cacheParts(partsData).catch(() => {});
      } catch (err) {
        console.error('Failed to load data from Supabase:', err);
        // Try IndexedDB cache first, then fall back to mock data
        try {
          const [cachedJobs, cachedMechs, cachedParts] = await Promise.all([
            offlineDb.getCachedJobs<Job>(),
            offlineDb.getCachedMechanics<Mechanic>(),
            offlineDb.getCachedParts<Part>(),
          ]);
          if (cachedJobs.length > 0 || cachedMechs.length > 0) {
            setJobs(cachedJobs);
            setMechanics(cachedMechs);
            setParts(cachedParts);
            showToast('Using cached data — you\'re offline', 'info');
          } else {
            throw new Error('No cached data');
          }
        } catch {
          setJobs(INITIAL_JOBS);
          setMechanics(MECHANICS);
          setParts(PARTS);
          showToast('Using demo data — connection failed', 'error');
        }
      } finally {
        setIsDataLoading(false);
      }
    }

    loadData();
  }, [auth.isLoading]);

  // ============================================================
  // Realtime subscriptions — keep state in sync with DB
  // ============================================================
  const handleJobChange = useCallback((payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
    const { eventType } = payload;

    if (eventType === 'INSERT') {
      const mapped = mapJobFromDb(payload.new);
      setJobs(prev => {
        if (prev.some(j => j.id === mapped.id)) {
          return prev.map(j => j.id === mapped.id ? mapped : j);
        }
        return [...prev, mapped];
      });
    } else if (eventType === 'UPDATE') {
      const mapped = mapJobFromDb(payload.new);
      // Merge with existing job to preserve fields that Realtime might not include
      setJobs(prev => prev.map(j => {
        if (j.id !== mapped.id) return j;
        return {
          ...j,
          ...mapped,
          // Preserve arrays if Realtime returned empty but existing has data
          services: mapped.services?.length ? mapped.services : j.services,
          checkinParts: mapped.checkinParts?.length ? mapped.checkinParts : j.checkinParts,
          partsUsed: mapped.partsUsed?.length ? mapped.partsUsed : j.partsUsed,
          partsNeeded: mapped.partsNeeded?.length ? mapped.partsNeeded : j.partsNeeded,
        };
      }));
    } else if (eventType === 'DELETE') {
      setJobs(prev => prev.filter(j => j.id !== payload.old.id));
    }
  }, []);

  const handleUserChange = useCallback((payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
    const { eventType } = payload;
    if (eventType === 'INSERT') {
      const mapped = mapUserFromDb(payload.new) as unknown as Mechanic;
      if (payload.new.role === 'mechanic') {
        setMechanics(prev => prev.some(m => m.id === mapped.id) ? prev : [...prev, mapped]);
      }
    } else if (eventType === 'UPDATE') {
      const mapped = mapUserFromDb(payload.new) as unknown as Mechanic;
      setMechanics(prev => {
        if (prev.some(m => m.id === mapped.id)) {
          return prev.map(m => m.id === mapped.id ? mapped : m);
        }
        if (payload.new.role === 'mechanic') return [...prev, mapped];
        return prev;
      });
    } else if (eventType === 'DELETE') {
      setMechanics(prev => prev.filter(m => m.id !== payload.old.id));
    }
  }, []);

  useRealtimeJobs(handleJobChange, auth?.appUser?.id, role);
  useRealtimeUsers(handleUserChange);

  // ============================================================
  // Polling fallback — PIN users have no auth.uid() so Realtime
  // (which respects RLS) delivers nothing. Poll at 30s intervals.
  // ============================================================
  const lastHeartbeatRef = useRef(0);
  const pollInFlightRef = useRef(false);
  const pollCountRef = useRef(0);

  const pollData = useCallback(async () => {
    if (!config.useSupabase || !navigator.onLine) return;
    // Prevent concurrent polls (request coalescing)
    if (pollInFlightRef.current) return;
    pollInFlightRef.current = true;
    try {
      // Throttle heartbeat to once per 120s
      const now = Date.now();
      if (now - lastHeartbeatRef.current > 120000) {
        lastHeartbeatRef.current = now;
        userService.heartbeat();
      }

      pollCountRef.current += 1;

      // Mechanics list rarely changes — only fetch every 5th poll (~5 min)
      if (pollCountRef.current % 5 === 1) {
        const [jobsData, mechanicsData] = await Promise.all([
          jobService.getJobsForDate(),
          userService.getMechanics(),
        ]);
        if (jobsData) setJobs(jobsData);
        if (mechanicsData) setMechanics(mechanicsData as unknown as Mechanic[]);
      } else {
        const jobsData = await jobService.getJobsForDate();
        if (jobsData) setJobs(jobsData);
      }
    } catch {
      // Silent — polling failure is not critical
    } finally {
      pollInFlightRef.current = false;
    }
  }, []);
  pollDataRef.current = pollData;

  // Extract lock state for dependency tracking (AuthContext is untyped)
  const isLocked = (auth as any)?.isLocked ?? false;

  useEffect(() => {
    if (!config.useSupabase || !auth?.isAuthenticated) return;
    // PIN users don't have authUserId — they need polling
    const isPinUser = !auth.appUser?.authUserId;
    if (!isPinUser) return;
    // Don't poll while screen is locked (user is inactive)
    if (isLocked) return;

    // Poll immediately on mount so new jobs appear right away
    pollData();

    // Poll every 90s to minimize API calls
    let interval = setInterval(pollData, 90000);

    // Pause polling when tab is hidden (saves battery + API calls)
    // Resume + immediate poll when tab regains focus
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        pollData();
        interval = setInterval(pollData, 90000);
      } else {
        clearInterval(interval);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [auth?.isAuthenticated, auth?.appUser?.authUserId, isLocked, pollData]);

  // ============================================================
  // Toast helper
  // ============================================================
  const showToast = useCallback((message: string, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2800);
  }, []);
  showToastRef.current = showToast;

  // ============================================================
  // Auto-assign engine (client-side for mock mode)
  // ============================================================
  const autoAssign = useCallback((job: Partial<Job>) => {
    const onDuty = mechanics.filter(m => m.status === 'on_duty');
    if (onDuty.length === 0) return null;

    const today = getToday();
    const weekend = isWeekend();

    const scored = onDuty.map(m => {
      const activeJobs = jobs.filter(j =>
        j.mechanicId === m.id && j.date === today &&
        [STATUS.ASSIGNED, STATUS.IN_PROGRESS].includes(j.status)
      );
      const totalHours = activeJobs.reduce((sum, j) => sum + (j.estimatedMin || 0), 0) / 60;

      let score = 100;
      score -= activeJobs.length * 20;
      score -= totalHours * 10;
      if (job.serviceType === 'repair' && m.role === 'senior') score += 15;
      if (job.serviceType === 'makeover' && m.role === 'senior') score += 10;
      if (weekend && activeJobs.length >= 4) score -= 50;

      return { mechanic: m, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].mechanic.id;
  }, [jobs, mechanics]);

  // ============================================================
  // Offline queue replay helper — maps action names to service calls
  // ============================================================
  const replayAction = useCallback(async (action: string, args: unknown[]) => {
    switch (action) {
      case 'createJob': {
        const jobArgs = args[0] as Record<string, unknown>;
        const tempId = args[1] as string | undefined; // temp job ID for media lookup
        const created = await jobService.createJob(jobArgs);
        if (created) {
          setJobs(prev => {
            const withoutTemp = prev.filter(j => !String(j.id).startsWith('temp-'));
            return [...withoutTemp, created];
          });
          // Upload any pending media that was stored offline
          if (tempId) {
            offlineDb.getPendingMedia(tempId).then(media => {
              if (!media) return;
              if (media.photos.length > 0) {
                const files = media.photos.map((blob, i) => new File([blob], `photo_${i}.jpg`, { type: 'image/jpeg' }));
                photoService.uploadPhotos(created.id, files).catch(() => {});
              }
              if (media.audio) {
                const audioFile = new File([media.audio], 'voice.webm', { type: 'audio/webm' });
                photoService.uploadAudio(created.id, audioFile).catch(() => {});
              }
              offlineDb.removePendingMedia(tempId).catch(() => {});
            }).catch(() => {});
          }
        }
        break;
      }
      case 'pickJob':
        await jobService.updateJobStatus(args[0] as string, 'in_progress', {
          mechanicId: args[1] as string,
          startedAt: (args[2] as Record<string, unknown>)?.startedAt || new Date().toISOString(),
        });
        break;
      case 'startJob':
        await jobService.updateJobStatus(args[0] as string, 'in_progress', args[1] as Record<string, unknown>);
        break;
      case 'completeJob':
        await jobService.updateJobStatus(args[0] as string, args[1] as string, args[2] as Record<string, unknown>);
        break;
      case 'qcPassJob':
        await jobService.updateJobStatus(args[0] as string, 'ready', { qcStatus: 'passed' });
        break;
      case 'qcFailJob':
        await jobService.updateJobStatus(args[0] as string, 'in_progress', { qcStatus: 'failed', completedAt: null, actualMin: null });
        break;
      case 'markPartsNeeded':
        await jobService.updateJobStatus(args[0] as string, 'parts_pending', args[1] as Record<string, unknown>);
        break;
      case 'markPartsReceived':
        await jobService.updateJobStatus(args[0] as string, 'in_progress', { pausedAt: null });
        break;
      case 'pauseJob':
        await jobService.updateJobStatus(args[0] as string, 'in_progress', args[1] as Record<string, unknown>);
        break;
      case 'resumeJob':
        await jobService.updateJobStatus(args[0] as string, 'in_progress', args[1] as Record<string, unknown>);
        break;
      case 'reassignJob': {
        const rJobId = args[0] as string;
        const rMechId = args[1] as string;
        const rWasInProgress = args[2] as boolean;
        await jobService.assignJob(rJobId, rMechId);
        if (rWasInProgress) {
          await jobService.updateJobStatus(rJobId, 'assigned', { startedAt: null });
        }
        break;
      }
      case 'processPayment':
        await jobService.processPayment(args[0] as string, args[1] as string);
        break;
      case 'syncJobToSheets': {
        const payload = args[0] as import('../services/googleSheetsService').SheetJobPayload;
        await googleSheetsService.syncJob(payload);
        break;
      }
      default:
        console.warn('Unknown queued action:', action);
    }
  }, []);
  replayActionRef.current = replayAction;

  // Helper: sync a job snapshot to Google Sheets (fire-and-forget)
  const syncJobToSheets = useCallback((job: Job, overrides?: Partial<Job>) => {
    if (!googleSheetsService.isEnabled) return;
    const merged = overrides ? { ...job, ...overrides } : job;
    const payload = buildSheetPayload(merged, mechanics);
    if (navigator.onLine) {
      googleSheetsService.syncJob(payload).catch(async () => {
        await offlineQueue.enqueue('syncJobToSheets', [payload]);
      });
    } else {
      offlineQueue.enqueue('syncJobToSheets', [payload]).catch(() => {});
    }
  }, [mechanics]);

  // ============================================================
  // Job mutations — dual-mode (optimistic local + Supabase)
  // ============================================================

  const createJob = useCallback(async (data: Record<string, unknown>) => {
    const st = SERVICE_TYPES[data.serviceType as string] || SERVICE_TYPES.regular;

    if (!config.useSupabase) {
      const newJob: Job = {
        id: Date.now(),
        ...data,
        status: STATUS.RECEIVED,
        mechanicId: null,
        estimatedMin: st.time,
        date: getToday(),
        timeBlock: getTimeBlock(),
        partsUsed: [],
        startedAt: null,
        completedAt: null,
        actualMin: null,
        totalCost: null,
        createdAt: new Date().toISOString(),
      } as Job;
      // No auto-assign — mechanics self-pick jobs
      setJobs(prev => [...prev, newJob]);
      return newJob;
    }

    // Supabase mode — offline support
    if (!navigator.onLine) {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const offlineJob: Job = {
        id: tempId,
        ...data,
        status: STATUS.RECEIVED,
        estimatedMin: st.time,
        date: getToday(),
        timeBlock: getTimeBlock(),
        partsUsed: [],
        startedAt: null,
        completedAt: null,
        actualMin: null,
        totalCost: null,
        createdBy: auth?.appUser?.id,
        createdAt: new Date().toISOString(),
      } as Job;
      setJobs(prev => [...prev, offlineJob]);
      await offlineQueue.enqueue('createJob', [{ ...data, createdBy: auth?.appUser?.id || null }, tempId]);
      showToast('Saved offline — will sync when connected', 'info');
      return offlineJob;
    }

    const created = await jobService.createJob({
      ...data,
      createdBy: auth?.appUser?.id || null,
    });
    if (!created) throw new Error('Failed to create job');
    // No auto-assign — mechanics self-pick jobs

    // Optimistic local update (realtime will also deliver it)
    setJobs(prev => [...prev, created]);
    activityLogService.log('job_created', { jobId: created.id, userId: auth?.appUser?.id }).catch(() => {});
    syncJobToSheets(created);
    // WhatsApp notification is handled in CheckIn/NewService via wa.me links
    return created;
  }, [auth?.appUser?.id]);

  const editJob = useCallback(async (jobId: string | number, updates: Record<string, unknown>) => {
    // Only allow editing jobs that haven't been picked up yet
    const job = jobs.find(j => j.id === jobId);
    if (!job) throw new Error('Job not found');
    if (job.status !== STATUS.RECEIVED) {
      showToast('Can only edit unassigned jobs', 'error');
      return;
    }

    // Optimistic local update
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...updates } : j));

    if (config.useSupabase) {
      try {
        await jobService.updateJobStatus(jobId as string, undefined, updates);
        const updatedJob = { ...job, ...updates } as Job;
        syncJobToSheets(updatedJob);
      } catch (err) {
        // Revert on failure
        setJobs(prev => prev.map(j => j.id === jobId ? job : j));
        throw err;
      }
    }
  }, [jobs, syncJobToSheets]);

  const startJob = useCallback(async (jobId: string | number) => {
    // Prevent starting a second job while one is already in progress
    const activeJob = jobs.find(j => j.mechanicId === currentMechanicId && j.status === STATUS.IN_PROGRESS);
    if (activeJob && activeJob.id !== jobId) {
      showToast('Finish your current job first', 'error');
      return;
    }
    const job = jobs.find(j => j.id === jobId);
    const now = new Date().toISOString();
    setJobs(prev => prev.map(j =>
      j.id === jobId ? { ...j, status: STATUS.IN_PROGRESS, startedAt: now } : j
    ));

    if (config.useSupabase) {
      if (!navigator.onLine) {
        await offlineQueue.enqueue('startJob', [jobId, { startedAt: now }]);
        showToast('Saved offline — will sync when connected', 'info');
        return;
      }
      try {
        await jobService.updateJobStatus(jobId as string, 'in_progress', { startedAt: now });
        activityLogService.log('job_started', {
          jobId: jobId as string, userId: auth?.appUser?.id,
          beforeState: job ? { status: job.status } : null,
          afterState: { status: 'in_progress', startedAt: now },
        }).catch(() => {});
        if (job) syncJobToSheets(job, { status: STATUS.IN_PROGRESS as Job['status'], startedAt: now });
      } catch (err) {
        setJobs(prev => prev.map(j =>
          j.id === jobId ? { ...j, status: STATUS.ASSIGNED, startedAt: null } : j
        ));
        const msg = err instanceof Error ? err.message : 'Failed to start job';
        showToast(msg, 'error');
        throw err;
      }
    }
  }, [jobs, currentMechanicId, auth?.appUser?.id, showToast]);

  // Pick a job — mechanic self-assigns + starts immediately
  const pickJob = useCallback(async (jobId: string | number) => {
    // Prevent picking a new job while one is already in progress
    const activeJob = jobs.find(j => j.mechanicId === currentMechanicId && j.status === STATUS.IN_PROGRESS);
    if (activeJob) {
      showToast('Finish your current job first', 'error');
      return;
    }
    const now = new Date().toISOString();
    const pickingMechanicId = currentMechanicId;

    // Optimistic update: assign to self + set in_progress + start timer
    setJobs(prev => prev.map(j =>
      j.id === jobId ? { ...j, mechanicId: pickingMechanicId, status: STATUS.IN_PROGRESS, startedAt: now } : j
    ));

    if (config.useSupabase) {
      if (!navigator.onLine) {
        await offlineQueue.enqueue('pickJob', [jobId, pickingMechanicId, { startedAt: now }]);
        showToast('Saved offline — will sync when connected', 'info');
        return;
      }
      try {
        await jobService.updateJobStatus(jobId as string, 'in_progress', {
          mechanicId: pickingMechanicId,
          startedAt: now,
        });
        activityLogService.log('job_picked', {
          jobId: jobId as string, userId: auth?.appUser?.id,
          afterState: { status: 'in_progress', mechanicId: pickingMechanicId, startedAt: now },
        }).catch(() => {});
        const pickedJob = jobs.find(j => j.id === jobId);
        if (pickedJob) syncJobToSheets(pickedJob, { status: STATUS.IN_PROGRESS as Job['status'], mechanicId: pickingMechanicId ?? undefined, startedAt: now });
      } catch (err) {
        // Rollback
        setJobs(prev => prev.map(j =>
          j.id === jobId ? { ...j, mechanicId: null, status: STATUS.RECEIVED, startedAt: null } : j
        ));
        const msg = err instanceof Error ? err.message : 'Failed to pick job';
        showToast(msg, 'error');
        throw err;
      }
    }
  }, [jobs, currentMechanicId, auth?.appUser?.id, showToast]);

  const completeJob = useCallback(async (jobId: string | number, partsUsed: Job['partsUsed'] = []) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    const completedAt = new Date().toISOString();
    const actualMin = job.startedAt ? Math.round((new Date(completedAt).getTime() - new Date(job.startedAt).getTime()) / 60000) : null;
    const st = SERVICE_TYPES[job.serviceType] || SERVICE_TYPES.regular;
    const totalParts = partsUsed.reduce((s, p) => s + (p.price * (p.qty || 1)), 0);
    const newStatus = STATUS.READY;
    const labor = job.laborCharge ?? st.price;
    const totalCost = totalParts + labor;

    setJobs(prev => prev.map(j =>
      j.id === jobId ? { ...j, status: newStatus, completedAt, actualMin, partsUsed, totalCost } : j
    ));

    if (config.useSupabase) {
      if (!navigator.onLine) {
        await offlineQueue.enqueue('completeJob', [jobId, newStatus, { completedAt, actualMin, partsUsed, totalCost }]);
        showToast('Saved offline — will sync when connected', 'info');
        return;
      }
      try {
        await jobService.updateJobStatus(jobId as string, newStatus, { completedAt, actualMin, partsUsed, totalCost });
        activityLogService.log('job_completed', { jobId: jobId as string, userId: auth?.appUser?.id }).catch(() => {});
        syncJobToSheets(job, { status: newStatus as Job['status'], completedAt, actualMin, partsUsed, totalCost });
      } catch (err) {
        setJobs(prev => prev.map(j =>
          j.id === jobId ? { ...j, status: STATUS.IN_PROGRESS, completedAt: null, actualMin: null, totalCost: null } : j
        ));
        const msg2 = err instanceof Error ? err.message : 'Failed to complete job';
        showToast(msg2, 'error');
        throw err;
      }
    }
  }, [jobs, auth?.appUser?.id, showToast]);

  const qcPassJob = useCallback(async (jobId: string | number) => {
    setJobs(prev => prev.map(j =>
      j.id === jobId ? { ...j, status: STATUS.READY, qcStatus: 'passed' } : j
    ));

    if (config.useSupabase) {
      if (!navigator.onLine) {
        await offlineQueue.enqueue('qcPassJob', [jobId]);
        showToast('Saved offline — will sync when connected', 'info');
        return;
      }
      try {
        await jobService.updateJobStatus(jobId as string, 'ready', { qcStatus: 'passed' });
        activityLogService.log('qc_passed', { jobId: jobId as string, userId: auth?.appUser?.id }).catch(() => {});
        { const qcJob = jobs.find(j => j.id === jobId); if (qcJob) syncJobToSheets(qcJob, { status: STATUS.READY as Job['status'], qcStatus: 'passed' }); }
        // WhatsApp "ready" notification is handled in QualityCheck.tsx via wa.me links
      } catch {
        setJobs(prev => prev.map(j =>
          j.id === jobId ? { ...j, status: STATUS.QUALITY_CHECK, qcStatus: undefined } : j
        ));
        showToast('Failed to pass QC', 'error');
      }
    }
  }, [auth?.appUser?.id, showToast]);

  const qcFailJob = useCallback(async (jobId: string | number) => {
    setJobs(prev => prev.map(j =>
      j.id === jobId ? { ...j, status: STATUS.IN_PROGRESS, qcStatus: 'failed', completedAt: null, actualMin: null } : j
    ));

    if (config.useSupabase) {
      if (!navigator.onLine) {
        await offlineQueue.enqueue('qcFailJob', [jobId]);
        showToast('Saved offline — will sync when connected', 'info');
        return;
      }
      try {
        await jobService.updateJobStatus(jobId as string, 'in_progress', { qcStatus: 'failed', completedAt: null, actualMin: null });
        activityLogService.log('qc_failed', { jobId: jobId as string, userId: auth?.appUser?.id }).catch(() => {});
      } catch {
        setJobs(prev => prev.map(j =>
          j.id === jobId ? { ...j, status: STATUS.QUALITY_CHECK, qcStatus: undefined } : j
        ));
        showToast('Failed to update QC', 'error');
      }
    }
  }, [auth?.appUser?.id, showToast]);

  const markPartsNeeded = useCallback(async (jobId: string | number, partsNeeded: Job['partsNeeded']) => {
    const pausedAt = new Date().toISOString();
    setJobs(prev => prev.map(j =>
      j.id === jobId ? { ...j, status: STATUS.PARTS_PENDING, partsNeeded, pausedAt } : j
    ));

    if (config.useSupabase) {
      if (!navigator.onLine) {
        await offlineQueue.enqueue('markPartsNeeded', [jobId, { partsNeeded, pausedAt }]);
        showToast('Saved offline — will sync when connected', 'info');
        return;
      }
      try {
        await jobService.updateJobStatus(jobId as string, 'parts_pending', { partsNeeded, pausedAt });
        activityLogService.log('parts_needed', { jobId: jobId as string, userId: auth?.appUser?.id }).catch(() => {});
      } catch {
        setJobs(prev => prev.map(j =>
          j.id === jobId ? { ...j, status: STATUS.IN_PROGRESS, partsNeeded: undefined, pausedAt: null } : j
        ));
        showToast('Failed to request parts', 'error');
      }
    }
  }, [auth?.appUser?.id, showToast]);

  const markPartsReceived = useCallback(async (jobId: string | number) => {
    setJobs(prev => prev.map(j =>
      j.id === jobId ? { ...j, status: STATUS.IN_PROGRESS, pausedAt: null } : j
    ));

    if (config.useSupabase) {
      if (!navigator.onLine) {
        await offlineQueue.enqueue('markPartsReceived', [jobId]);
        showToast('Saved offline — will sync when connected', 'info');
        return;
      }
      try {
        await jobService.updateJobStatus(jobId as string, 'in_progress', { pausedAt: null });
        activityLogService.log('parts_received', { jobId: jobId as string, userId: auth?.appUser?.id }).catch(() => {});
      } catch {
        setJobs(prev => prev.map(j =>
          j.id === jobId ? { ...j, status: STATUS.PARTS_PENDING } : j
        ));
        showToast('Failed to mark parts received', 'error');
      }
    }
  }, [auth?.appUser?.id, showToast]);

  const pauseJob = useCallback(async (jobId: string | number) => {
    const pausedAt = new Date().toISOString();
    setJobs(prev => prev.map(j =>
      j.id === jobId ? { ...j, pausedAt } : j
    ));

    if (config.useSupabase) {
      if (!navigator.onLine) {
        await offlineQueue.enqueue('pauseJob', [jobId, { pausedAt }]);
        showToast('Saved offline — will sync when connected', 'info');
        return;
      }
      try {
        await jobService.updateJobStatus(jobId as string, 'in_progress', { pausedAt });
        activityLogService.log('job_paused', { jobId: jobId as string, userId: auth?.appUser?.id }).catch(() => {});
      } catch {
        setJobs(prev => prev.map(j =>
          j.id === jobId ? { ...j, pausedAt: null } : j
        ));
        showToast('Failed to pause job', 'error');
      }
    }
  }, [auth?.appUser?.id, showToast]);

  const resumeJob = useCallback(async (jobId: string | number) => {
    setJobs(prev => prev.map(j =>
      j.id === jobId ? { ...j, pausedAt: null } : j
    ));

    if (config.useSupabase) {
      if (!navigator.onLine) {
        await offlineQueue.enqueue('resumeJob', [jobId, { pausedAt: null }]);
        showToast('Saved offline — will sync when connected', 'info');
        return;
      }
      try {
        await jobService.updateJobStatus(jobId as string, 'in_progress', { pausedAt: null });
        activityLogService.log('job_resumed', { jobId: jobId as string, userId: auth?.appUser?.id }).catch(() => {});
      } catch {
        showToast('Failed to resume job', 'error');
      }
    }
  }, [auth?.appUser?.id, showToast]);

  const reassignJob = useCallback(async (jobId: string | number, newMechanicId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    const wasInProgress = job.status === STATUS.IN_PROGRESS;
    setJobs(prev => prev.map(j => {
      if (j.id !== jobId) return j;
      const update = { ...j, mechanicId: newMechanicId };
      if (wasInProgress) { update.status = STATUS.ASSIGNED; update.startedAt = null; }
      return update;
    }));

    if (config.useSupabase) {
      if (!navigator.onLine) {
        await offlineQueue.enqueue('reassignJob', [jobId, newMechanicId, wasInProgress]);
        showToast('Reassigned offline — will sync when connected', 'info');
        return;
      }
      try {
        await jobService.assignJob(jobId as string, newMechanicId);
        if (wasInProgress) {
          await jobService.updateJobStatus(jobId as string, 'assigned', { startedAt: null });
        }
        activityLogService.log('job_reassigned', {
          jobId: jobId as string, userId: auth?.appUser?.id,
          details: { newMechanicId },
          beforeState: { mechanicId: job.mechanicId, status: job.status },
          afterState: { mechanicId: newMechanicId, status: wasInProgress ? 'assigned' : job.status },
        }).catch(() => {});
      } catch {
        setJobs(prev => prev.map(j =>
          j.id === jobId ? { ...j, mechanicId: job.mechanicId, status: job.status, startedAt: job.startedAt } : j
        ));
        showToast('Failed to reassign job', 'error');
      }
    }
  }, [jobs, auth?.appUser?.id, showToast]);

  const processPayment = useCallback(async (jobId: string | number, method: string) => {
    const paidAt = new Date().toISOString();
    setJobs(prev => prev.map(j =>
      j.id === jobId ? { ...j, status: STATUS.COMPLETED, paymentMethod: method as Job['paymentMethod'], paidAt } : j
    ));

    if (config.useSupabase) {
      if (!navigator.onLine) {
        await offlineQueue.enqueue('processPayment', [jobId, method]);
        showToast('Saved offline — will sync when connected', 'info');
        return;
      }
      try {
        await jobService.processPayment(jobId as string, method);
        const paidJobBefore = jobs.find(j => j.id === jobId);
        activityLogService.log('payment_processed', {
          jobId: jobId as string, userId: auth?.appUser?.id,
          beforeState: paidJobBefore ? { status: paidJobBefore.status } : null,
          afterState: { status: 'completed', paymentMethod: method },
        }).catch(() => {});
        // Sync invoice to accounting
        const paidJob = jobs.find(j => j.id === jobId);
        if (paidJob) {
          zohoService.createInvoice(paidJob).catch(() => {});
          syncJobToSheets(paidJob, { status: STATUS.COMPLETED as Job['status'], paymentMethod: method as Job['paymentMethod'], paidAt });
        }
      } catch {
        setJobs(prev => prev.map(j =>
          j.id === jobId ? { ...j, status: STATUS.READY, paymentMethod: undefined, paidAt: null } : j
        ));
        showToast('Payment failed', 'error');
      }
    }
  }, [auth?.appUser?.id, showToast]);

  // ============================================================
  // Computed helpers
  // ============================================================
  const getDashboardStats = useCallback(() => {
    const today = getToday();
    // Include today's jobs + carryover (past incomplete jobs)
    const activeJobs = jobs.filter(j => j.date === today || (j.date < today && j.status !== STATUS.COMPLETED));
    const completed = activeJobs.filter(j => j.status === STATUS.COMPLETED);
    return {
      totalJobs: activeJobs.length,
      completed: completed.length,
      inProgress: activeJobs.filter(j => j.status === STATUS.IN_PROGRESS).length,
      partsPending: activeJobs.filter(j => j.status === STATUS.PARTS_PENDING).length,
      ready: activeJobs.filter(j => j.status === STATUS.READY).length,
      qc: activeJobs.filter(j => j.status === STATUS.QUALITY_CHECK).length,
      unassigned: activeJobs.filter(j => j.status === STATUS.RECEIVED).length,
      revenue: completed.reduce((s, j) => s + (j.totalCost || 0), 0),
      jobs: activeJobs,
    };
  }, [jobs]);

  const getMechanicJobs = useCallback((mechanicId: string) => {
    const today = getToday();
    return jobs.filter(j => {
      // Unassigned jobs — available to pick (today + carryover from past days)
      const isUnassigned = j.status === STATUS.RECEIVED && !j.mechanicId && j.date <= today;
      // Jobs assigned to this mechanic (today + carryover)
      const isMyJob = j.mechanicId === mechanicId && (j.date === today || (j.date < today && j.status !== STATUS.COMPLETED));
      return isUnassigned || isMyJob;
    });
  }, [jobs]);

  // ============================================================
  // Context value
  // ============================================================
  const value = {
    role, setRole,
    currentMechanicId, setCurrentMechanicId,
    jobs, mechanics, parts, setParts,
    serviceList, partsList, serviceItems, partsItems,
    toast, showToast,
    isOffline, isDataLoading,
    createJob, editJob, pickJob, startJob, completeJob,
    qcPassJob, qcFailJob,
    markPartsNeeded, markPartsReceived,
    pauseJob, resumeJob,
    reassignJob, processPayment,
    getDashboardStats, getMechanicJobs,
    autoAssign, refreshData: pollData,
    refreshServiceOptions: async () => {
      if (!navigator.onLine) return;
      try {
        const opts = await serviceOptionsService.getAll();
        const svcOpts = opts.filter(o => o.type === 'service');
        const prtOpts = opts.filter(o => o.type === 'part');
        setServiceList(svcOpts.map(o => o.name));
        setPartsList(prtOpts.map(o => o.name));
        setServiceItems(svcOpts.map(o => ({ name: o.name, price: o.price })));
        setPartsItems(prtOpts.map(o => ({ name: o.name, price: o.price })));
      } catch { /* silent */ }
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
