/**
 * BCH Service - IndexedDB Data Layer
 * Offline-first data persistence for PWA
 */

const DB_NAME = 'bch_service';
const DB_VERSION = 1;

const STORES = {
  jobs: 'jobs',
  mechanics: 'mechanics',
  customers: 'customers',
  parts: 'parts',
  config: 'config',
  syncQueue: 'syncQueue'
};

// Status constants
const STATUS = {
  RECEIVED: 'received',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  PARTS_PENDING: 'parts_pending',
  QUALITY_CHECK: 'quality_check',
  READY: 'ready',
  COMPLETED: 'completed'
};

const SERVICE_TYPES = {
  REGULAR: { id: 'regular', label: 'Regular Service', icon: '🔧', time: 45, price: 500 },
  REPAIR: { id: 'repair', label: 'Repair', icon: '⚡', time: 90, price: 200 },
  MAKEOVER: { id: 'makeover', label: 'Complete Makeover', icon: '🧽', time: 240, price: 2459 },
  INSURANCE: { id: 'insurance', label: 'Insurance Service', icon: '✅', time: 30, price: 0 }
};

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) { resolve(db); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      const d = e.target.result;

      // Jobs store
      if (!d.objectStoreNames.contains(STORES.jobs)) {
        const jobStore = d.createObjectStore(STORES.jobs, { keyPath: 'id', autoIncrement: true });
        jobStore.createIndex('status', 'status', { unique: false });
        jobStore.createIndex('mechanicId', 'mechanicId', { unique: false });
        jobStore.createIndex('date', 'date', { unique: false });
      }

      // Mechanics store
      if (!d.objectStoreNames.contains(STORES.mechanics)) {
        d.createObjectStore(STORES.mechanics, { keyPath: 'id' });
      }

      // Customers store
      if (!d.objectStoreNames.contains(STORES.customers)) {
        const custStore = d.createObjectStore(STORES.customers, { keyPath: 'id', autoIncrement: true });
        custStore.createIndex('phone', 'phone', { unique: true });
      }

      // Parts store
      if (!d.objectStoreNames.contains(STORES.parts)) {
        d.createObjectStore(STORES.parts, { keyPath: 'id', autoIncrement: true });
      }

      // Config store
      if (!d.objectStoreNames.contains(STORES.config)) {
        d.createObjectStore(STORES.config, { keyPath: 'key' });
      }

      // Sync queue
      if (!d.objectStoreNames.contains(STORES.syncQueue)) {
        d.createObjectStore(STORES.syncQueue, { keyPath: 'id', autoIncrement: true });
      }
    };

    req.onsuccess = e => { db = e.target.result; resolve(db); };
    req.onerror = e => reject(e.target.error);
  });
}

// Generic CRUD helpers
async function dbPut(storeName, data) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGet(storeName, key) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAll(storeName) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(storeName, key) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function dbGetByIndex(storeName, indexName, value) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(storeName, 'readonly');
    const idx = tx.objectStore(storeName).index(indexName);
    const req = idx.getAll(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ====== SEED DATA ======

async function seedData() {
  const config = await dbGet(STORES.config, 'seeded');
  if (config) return;

  // Mechanics
  const mechanics = [
    { id: 'mujju', name: 'Mujju', role: 'senior', phone: '+91-9876500001', avatar: 'M', color: '#16a34a', status: 'on_duty' },
    { id: 'appi', name: 'Appi', role: 'senior', phone: '+91-9876500002', avatar: 'A', color: '#2563eb', status: 'on_duty' },
    { id: 'baba', name: 'Baba', role: 'junior', phone: '+91-9876500003', avatar: 'B', color: '#ea580c', status: 'on_duty' },
    { id: 'mohan', name: 'Mohan', role: 'junior', phone: '+91-9876500004', avatar: 'Mo', color: '#6b7280', status: 'on_duty' },
    { id: 'iqbal', name: 'Iqbal', role: 'junior', phone: '+91-9876500005', avatar: 'I', color: '#2563eb', status: 'on_duty' }
  ];
  for (const m of mechanics) await dbPut(STORES.mechanics, m);

  // Customers
  const customers = [
    { id: 1, name: 'Rajesh Kumar', phone: '+91-9876543210', visits: 3, lastVisit: '2026-01-28' },
    { id: 2, name: 'Priya Sharma', phone: '+91-9876543211', visits: 1, lastVisit: '2026-02-01' },
    { id: 3, name: 'Ramesh Gupta', phone: '+91-9876543212', visits: 5, lastVisit: '2026-02-10' },
    { id: 4, name: 'Anita Patel', phone: '+91-9876543213', visits: 2, lastVisit: '2026-01-20' },
    { id: 5, name: 'Suresh Reddy', phone: '+91-9876543214', visits: 1, lastVisit: null },
    { id: 6, name: 'Amit Verma', phone: '+91-9876543215', visits: 4, lastVisit: '2026-01-15' },
    { id: 7, name: 'Vikram Singh', phone: '+91-9876543216', visits: 2, lastVisit: '2026-02-05' },
    { id: 8, name: 'Arun Mehta', phone: '+91-9876543217', visits: 1, lastVisit: null },
    { id: 9, name: 'Kavitha Nair', phone: '+91-9876543218', visits: 3, lastVisit: '2026-02-08' },
    { id: 10, name: 'Deepak Rao', phone: '+91-9876543219', visits: 1, lastVisit: null }
  ];
  for (const c of customers) await dbPut(STORES.customers, c);

  // Today's jobs
  const today = new Date().toISOString().split('T')[0];
  const jobs = [
    {
      id: 1, customerId: 1, customerName: 'Rajesh Kumar', customerPhone: '+91-9876543210',
      bike: 'Hero Splendor Plus 2022', serviceType: 'regular', issue: 'Chain noise, brake adjustment',
      mechanicId: 'mujju', status: STATUS.COMPLETED, priority: 'standard',
      estimatedMin: 45, actualMin: 38, date: today, timeBlock: 'morning',
      partsUsed: [{ name: 'Chain lube', qty: 1, price: 120 }, { name: 'Brake pads', qty: 1, price: 500 }],
      totalParts: 620, laborCost: 500, totalCost: 1120,
      startedAt: '2026-02-14T09:00:00', completedAt: '2026-02-14T09:38:00',
      qcStatus: 'passed', paymentMethod: 'cash', paidAt: '2026-02-14T10:00:00',
      createdAt: '2026-02-14T08:45:00'
    },
    {
      id: 2, customerId: 4, customerName: 'Anita Patel', customerPhone: '+91-9876543213',
      bike: 'Bajaj Pulsar 150', serviceType: 'insurance', issue: '6-month service due',
      mechanicId: 'mujju', status: STATUS.COMPLETED, priority: 'standard',
      estimatedMin: 30, actualMin: 25, date: today, timeBlock: 'morning',
      partsUsed: [{ name: 'Oil', qty: 1, price: 250 }, { name: 'Air filter', qty: 1, price: 150 }],
      totalParts: 400, laborCost: 0, totalCost: 400,
      startedAt: '2026-02-14T09:45:00', completedAt: '2026-02-14T10:10:00',
      qcStatus: 'passed', paymentMethod: 'upi', paidAt: '2026-02-14T10:30:00',
      createdAt: '2026-02-14T09:30:00'
    },
    {
      id: 3, customerId: 3, customerName: 'Ramesh Gupta', customerPhone: '+91-9876543212',
      bike: 'Honda CB Shine 2020', serviceType: 'repair', issue: 'Engine starting problem, electrical check',
      mechanicId: 'mujju', status: STATUS.IN_PROGRESS, priority: 'urgent',
      estimatedMin: 90, actualMin: null, date: today, timeBlock: 'morning',
      partsUsed: [{ name: 'Spark plug', qty: 1, price: 120 }],
      totalParts: 120, laborCost: null, totalCost: null,
      startedAt: '2026-02-14T10:30:00', completedAt: null,
      createdAt: '2026-02-14T10:15:00'
    },
    {
      id: 4, customerId: 2, customerName: 'Priya Sharma', customerPhone: '+91-9876543211',
      bike: 'Royal Enfield Classic 350', serviceType: 'makeover', issue: 'Full restoration requested',
      mechanicId: 'appi', status: STATUS.PARTS_PENDING, priority: 'standard',
      estimatedMin: 240, actualMin: null, date: today, timeBlock: 'afternoon',
      partsUsed: [],
      partsNeeded: [{ name: 'Oil Filter', status: 'pending' }],
      totalParts: null, laborCost: null, totalCost: null,
      startedAt: null, completedAt: null,
      createdAt: '2026-02-14T08:00:00'
    },
    {
      id: 5, customerId: 5, customerName: 'Suresh Reddy', customerPhone: '+91-9876543214',
      bike: 'TVS Apache RTR 160', serviceType: 'regular', issue: 'Regular maintenance',
      mechanicId: 'mujju', status: STATUS.ASSIGNED, priority: 'standard',
      estimatedMin: 45, actualMin: null, date: today, timeBlock: 'afternoon',
      partsUsed: [],
      totalParts: null, laborCost: null, totalCost: null,
      startedAt: null, completedAt: null,
      createdAt: '2026-02-14T11:00:00'
    },
    {
      id: 6, customerId: 6, customerName: 'Amit Verma', customerPhone: '+91-9876543215',
      bike: 'Suzuki Gixxer SF', serviceType: 'repair', issue: 'Chain noise + brake check',
      mechanicId: 'appi', status: STATUS.ASSIGNED, priority: 'standard',
      estimatedMin: 90, actualMin: null, date: today, timeBlock: 'afternoon',
      partsUsed: [],
      totalParts: null, laborCost: null, totalCost: null,
      startedAt: null, completedAt: null,
      createdAt: '2026-02-14T11:30:00'
    },
    {
      id: 7, customerId: 9, customerName: 'Kavitha Nair', customerPhone: '+91-9876543218',
      bike: 'Honda Activa 125', serviceType: 'repair', issue: 'Starting problem',
      mechanicId: 'iqbal', status: STATUS.IN_PROGRESS, priority: 'standard',
      estimatedMin: 60, actualMin: null, date: today, timeBlock: 'morning',
      partsUsed: [],
      totalParts: null, laborCost: null, totalCost: null,
      startedAt: '2026-02-14T10:00:00', completedAt: null,
      createdAt: '2026-02-14T09:45:00'
    },
    {
      id: 8, customerId: 10, customerName: 'Deepak Rao', customerPhone: '+91-9876543219',
      bike: 'Honda Activa 6G', serviceType: 'regular', issue: 'Regular service',
      mechanicId: 'iqbal', status: STATUS.ASSIGNED, priority: 'standard',
      estimatedMin: 30, actualMin: null, date: today, timeBlock: 'afternoon',
      partsUsed: [],
      totalParts: null, laborCost: null, totalCost: null,
      startedAt: null, completedAt: null,
      createdAt: '2026-02-14T11:15:00'
    },
    {
      id: 9, customerId: null, customerName: 'Ravi Shankar', customerPhone: '+91-9876543220',
      bike: 'Hero HF Deluxe', serviceType: 'regular', issue: 'Clutch wire + brake pad change',
      mechanicId: 'mohan', status: STATUS.IN_PROGRESS, priority: 'standard',
      estimatedMin: 45, actualMin: null, date: today, timeBlock: 'morning',
      partsUsed: [],
      totalParts: null, laborCost: null, totalCost: null,
      startedAt: '2026-02-14T09:30:00', completedAt: null,
      createdAt: '2026-02-14T09:15:00'
    },
    {
      id: 10, customerId: null, customerName: 'Prakash Jain', customerPhone: '+91-9876543221',
      bike: 'Bajaj CT 110', serviceType: 'insurance', issue: '3-month checkup',
      mechanicId: 'baba', status: STATUS.QUALITY_CHECK, priority: 'standard',
      estimatedMin: 30, actualMin: 28, date: today, timeBlock: 'morning',
      partsUsed: [{ name: 'Oil', qty: 1, price: 200 }],
      totalParts: 200, laborCost: 0, totalCost: 200,
      startedAt: '2026-02-14T09:00:00', completedAt: '2026-02-14T09:28:00',
      createdAt: '2026-02-14T08:50:00'
    }
  ];
  for (const j of jobs) await dbPut(STORES.jobs, j);

  // Parts inventory
  const parts = [
    { id: 1, name: 'Engine Oil (1L)', stock: 15, price: 250, reorderAt: 5 },
    { id: 2, name: 'Brake Pads (pair)', stock: 8, price: 500, reorderAt: 3 },
    { id: 3, name: 'Chain Lube', stock: 12, price: 120, reorderAt: 4 },
    { id: 4, name: 'Spark Plug', stock: 20, price: 120, reorderAt: 5 },
    { id: 5, name: 'Air Filter', stock: 6, price: 150, reorderAt: 3 },
    { id: 6, name: 'Oil Filter', stock: 2, price: 180, reorderAt: 3 },
    { id: 7, name: 'Clutch Cable', stock: 3, price: 350, reorderAt: 2 },
    { id: 8, name: 'Battery (12V)', stock: 4, price: 850, reorderAt: 2 },
    { id: 9, name: 'Brake Cable', stock: 5, price: 280, reorderAt: 2 },
    { id: 10, name: 'Tyre Tube', stock: 10, price: 200, reorderAt: 4 }
  ];
  for (const p of parts) await dbPut(STORES.parts, p);

  await dbPut(STORES.config, { key: 'seeded', value: true });
  await dbPut(STORES.config, { key: 'autoAssign', value: true });
  await dbPut(STORES.config, { key: 'qcRequired', value: true });
  await dbPut(STORES.config, { key: 'businessHours', value: { open: '09:00', close: '19:00' } });

  console.log('[DB] Seed data loaded');
}

// ====== JOB OPERATIONS ======

async function createJob(data) {
  const job = {
    ...data,
    status: STATUS.RECEIVED,
    createdAt: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0],
    partsUsed: [],
    startedAt: null,
    completedAt: null,
    actualMin: null,
    totalParts: null,
    laborCost: null,
    totalCost: null,
    qcStatus: null,
    paymentMethod: null,
    paidAt: null
  };

  const id = await dbPut(STORES.jobs, job);
  job.id = id;

  // Auto-assign
  const config = await dbGet(STORES.config, 'autoAssign');
  if (config && config.value) {
    const assignedMechanicId = await autoAssign(job);
    if (assignedMechanicId) {
      job.mechanicId = assignedMechanicId;
      job.status = STATUS.ASSIGNED;
      await dbPut(STORES.jobs, job);
    }
  }

  return job;
}

async function autoAssign(job) {
  const mechanics = await dbGetAll(STORES.mechanics);
  const allJobs = await dbGetAll(STORES.jobs);
  const onDuty = mechanics.filter(m => m.status === 'on_duty');
  if (onDuty.length === 0) return null;

  const today = new Date().toISOString().split('T')[0];
  const isWeekend = [0, 6].includes(new Date().getDay());

  const scored = onDuty.map(m => {
    const activeJobs = allJobs.filter(j =>
      j.mechanicId === m.id &&
      j.date === today &&
      [STATUS.ASSIGNED, STATUS.IN_PROGRESS].includes(j.status)
    );
    const totalHours = activeJobs.reduce((sum, j) => sum + (j.estimatedMin || 0), 0) / 60;

    let score = 100;
    score -= activeJobs.length * 20;
    score -= totalHours * 10;

    if (job.serviceType === 'repair' && m.role === 'senior') score += 15;
    if (job.serviceType === 'makeover' && m.role === 'senior') score += 10;
    if (isWeekend && activeJobs.length >= 4) score -= 50;

    return { mechanic: m, score, activeJobs: activeJobs.length };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].mechanic.id;
}

async function startJob(jobId) {
  const job = await dbGet(STORES.jobs, jobId);
  if (!job) return null;
  job.status = STATUS.IN_PROGRESS;
  job.startedAt = new Date().toISOString();
  await dbPut(STORES.jobs, job);
  return job;
}

async function completeJob(jobId, data = {}) {
  const job = await dbGet(STORES.jobs, jobId);
  if (!job) return null;

  const config = await dbGet(STORES.config, 'qcRequired');
  const needsQC = config && config.value && ['repair', 'makeover'].includes(job.serviceType);

  job.status = needsQC ? STATUS.QUALITY_CHECK : STATUS.READY;
  job.completedAt = new Date().toISOString();

  if (job.startedAt) {
    job.actualMin = Math.round((new Date(job.completedAt) - new Date(job.startedAt)) / 60000);
  }

  if (data.partsUsed) job.partsUsed = data.partsUsed;
  if (data.difficulty) job.difficulty = data.difficulty;

  job.totalParts = (job.partsUsed || []).reduce((s, p) => s + (p.price * (p.qty || 1)), 0);
  const st = SERVICE_TYPES[Object.keys(SERVICE_TYPES).find(k => SERVICE_TYPES[k].id === job.serviceType)];
  job.laborCost = st ? st.price : 0;
  job.totalCost = job.totalParts + job.laborCost;

  await dbPut(STORES.jobs, job);
  return job;
}

async function qcPassJob(jobId) {
  const job = await dbGet(STORES.jobs, jobId);
  if (!job) return null;
  job.status = STATUS.READY;
  job.qcStatus = 'passed';
  await dbPut(STORES.jobs, job);
  return job;
}

async function qcFailJob(jobId, reason) {
  const job = await dbGet(STORES.jobs, jobId);
  if (!job) return null;
  job.status = STATUS.IN_PROGRESS;
  job.qcStatus = 'failed';
  job.qcFailReason = reason;
  job.completedAt = null;
  job.actualMin = null;
  await dbPut(STORES.jobs, job);
  return job;
}

async function markPartsNeeded(jobId, parts) {
  const job = await dbGet(STORES.jobs, jobId);
  if (!job) return null;
  job.status = STATUS.PARTS_PENDING;
  job.partsNeeded = parts;
  job.pausedAt = new Date().toISOString();
  await dbPut(STORES.jobs, job);
  return job;
}

async function markPartsReceived(jobId) {
  const job = await dbGet(STORES.jobs, jobId);
  if (!job) return null;
  job.status = STATUS.IN_PROGRESS;
  if (job.partsNeeded) job.partsNeeded = job.partsNeeded.map(p => ({ ...p, status: 'received' }));
  job.pausedAt = null;
  await dbPut(STORES.jobs, job);
  return job;
}

async function reassignJob(jobId, newMechanicId) {
  const job = await dbGet(STORES.jobs, jobId);
  if (!job) return null;
  job.mechanicId = newMechanicId;
  if (job.status === STATUS.IN_PROGRESS) {
    job.status = STATUS.ASSIGNED;
    job.startedAt = null;
  }
  await dbPut(STORES.jobs, job);
  return job;
}

async function processPayment(jobId, method) {
  const job = await dbGet(STORES.jobs, jobId);
  if (!job) return null;
  job.status = STATUS.COMPLETED;
  job.paymentMethod = method;
  job.paidAt = new Date().toISOString();
  await dbPut(STORES.jobs, job);
  return job;
}

// ====== DASHBOARD STATS ======

async function getDashboardStats() {
  const today = new Date().toISOString().split('T')[0];
  const allJobs = await dbGetAll(STORES.jobs);
  const todayJobs = allJobs.filter(j => j.date === today);

  const completed = todayJobs.filter(j => j.status === STATUS.COMPLETED);
  const inProgress = todayJobs.filter(j => j.status === STATUS.IN_PROGRESS);
  const partsPending = todayJobs.filter(j => j.status === STATUS.PARTS_PENDING);
  const ready = todayJobs.filter(j => j.status === STATUS.READY);
  const qc = todayJobs.filter(j => j.status === STATUS.QUALITY_CHECK);

  const revenue = completed.reduce((s, j) => s + (j.totalCost || 0), 0);

  return {
    totalJobs: todayJobs.length,
    completed: completed.length,
    inProgress: inProgress.length,
    partsPending: partsPending.length,
    ready: ready.length,
    qc: qc.length,
    revenue,
    jobs: todayJobs
  };
}

async function getMechanicStats(mechanicId) {
  const today = new Date().toISOString().split('T')[0];
  const allJobs = await dbGetAll(STORES.jobs);
  const mechJobs = allJobs.filter(j => j.mechanicId === mechanicId && j.date === today);

  const done = mechJobs.filter(j => [STATUS.COMPLETED, STATUS.READY, STATUS.QUALITY_CHECK].includes(j.status));
  const total = mechJobs.length;
  const onTime = done.filter(j => j.actualMin && j.estimatedMin && j.actualMin <= j.estimatedMin).length;

  return {
    total,
    done: done.length,
    pending: total - done.length,
    onTimeRate: done.length > 0 ? Math.round((onTime / done.length) * 100) : 0,
    jobs: mechJobs
  };
}
