import { createContext, useContext, useState, useCallback } from 'react';
import { INITIAL_JOBS, MECHANICS, PARTS } from '../lib/mockData';
import { STATUS, SERVICE_TYPES } from '../lib/constants';
import { getToday, getTimeBlock, isWeekend } from '../lib/helpers';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [role, setRole] = useState('mechanic');
  const [currentMechanicId, setCurrentMechanicId] = useState('mujju');
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [mechanics] = useState(MECHANICS);
  const [parts, setParts] = useState(PARTS);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2800);
  }, []);

  // Auto-assign engine
  const autoAssign = useCallback((job) => {
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

  // Create a new service job
  const createJob = useCallback((data) => {
    const st = SERVICE_TYPES[data.serviceType] || SERVICE_TYPES.regular;
    const newJob = {
      id: Date.now(),
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
      createdAt: new Date().toISOString(),
    };

    const mechanicId = autoAssign(newJob);
    if (mechanicId) {
      newJob.mechanicId = mechanicId;
      newJob.status = STATUS.ASSIGNED;
    }

    setJobs(prev => [...prev, newJob]);
    return newJob;
  }, [autoAssign]);

  // Start job
  const startJob = useCallback((jobId) => {
    setJobs(prev => prev.map(j =>
      j.id === jobId ? { ...j, status: STATUS.IN_PROGRESS, startedAt: new Date().toISOString() } : j
    ));
  }, []);

  // Complete job
  const completeJob = useCallback((jobId, partsUsed = []) => {
    setJobs(prev => prev.map(j => {
      if (j.id !== jobId) return j;
      const needsQC = ['repair', 'makeover'].includes(j.serviceType);
      const completedAt = new Date().toISOString();
      const actualMin = j.startedAt ? Math.round((new Date(completedAt) - new Date(j.startedAt)) / 60000) : null;
      const st = SERVICE_TYPES[j.serviceType] || SERVICE_TYPES.regular;
      const totalParts = partsUsed.reduce((s, p) => s + (p.price * (p.qty || 1)), 0);
      return {
        ...j,
        status: needsQC ? STATUS.QUALITY_CHECK : STATUS.READY,
        completedAt, actualMin, partsUsed,
        totalCost: totalParts + st.price,
      };
    }));
  }, []);

  // QC pass/fail
  const qcPassJob = useCallback((jobId) => {
    setJobs(prev => prev.map(j =>
      j.id === jobId ? { ...j, status: STATUS.READY, qcStatus: 'passed' } : j
    ));
  }, []);

  const qcFailJob = useCallback((jobId) => {
    setJobs(prev => prev.map(j =>
      j.id === jobId ? { ...j, status: STATUS.IN_PROGRESS, qcStatus: 'failed', completedAt: null, actualMin: null } : j
    ));
  }, []);

  // Parts needed
  const markPartsNeeded = useCallback((jobId, partsNeeded) => {
    setJobs(prev => prev.map(j =>
      j.id === jobId ? { ...j, status: STATUS.PARTS_PENDING, partsNeeded, pausedAt: new Date().toISOString() } : j
    ));
  }, []);

  const markPartsReceived = useCallback((jobId) => {
    setJobs(prev => prev.map(j =>
      j.id === jobId ? { ...j, status: STATUS.IN_PROGRESS, pausedAt: null } : j
    ));
  }, []);

  // Reassign
  const reassignJob = useCallback((jobId, newMechanicId) => {
    setJobs(prev => prev.map(j => {
      if (j.id !== jobId) return j;
      const update = { ...j, mechanicId: newMechanicId };
      if (j.status === STATUS.IN_PROGRESS) {
        update.status = STATUS.ASSIGNED;
        update.startedAt = null;
      }
      return update;
    }));
  }, []);

  // Payment
  const processPayment = useCallback((jobId, method) => {
    setJobs(prev => prev.map(j =>
      j.id === jobId ? { ...j, status: STATUS.COMPLETED, paymentMethod: method, paidAt: new Date().toISOString() } : j
    ));
  }, []);

  // Dashboard stats
  const getDashboardStats = useCallback(() => {
    const today = getToday();
    const todayJobs = jobs.filter(j => j.date === today);
    const completed = todayJobs.filter(j => j.status === STATUS.COMPLETED);
    return {
      totalJobs: todayJobs.length,
      completed: completed.length,
      inProgress: todayJobs.filter(j => j.status === STATUS.IN_PROGRESS).length,
      partsPending: todayJobs.filter(j => j.status === STATUS.PARTS_PENDING).length,
      ready: todayJobs.filter(j => j.status === STATUS.READY).length,
      qc: todayJobs.filter(j => j.status === STATUS.QUALITY_CHECK).length,
      revenue: completed.reduce((s, j) => s + (j.totalCost || 0), 0),
      jobs: todayJobs,
    };
  }, [jobs]);

  // Mechanic stats
  const getMechanicJobs = useCallback((mechanicId) => {
    const today = getToday();
    return jobs.filter(j => j.mechanicId === mechanicId && j.date === today);
  }, [jobs]);

  const value = {
    role, setRole,
    currentMechanicId, setCurrentMechanicId,
    jobs, mechanics, parts, setParts,
    toast, showToast,
    createJob, startJob, completeJob,
    qcPassJob, qcFailJob,
    markPartsNeeded, markPartsReceived,
    reassignJob, processPayment,
    getDashboardStats, getMechanicJobs,
    autoAssign,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
