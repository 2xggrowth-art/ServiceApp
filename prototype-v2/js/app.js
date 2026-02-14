// ====== APP STATE ======
const ROLES = ['staff', 'mechanic', 'owner'];
const ROLE_LABELS = { staff: 'Support Staff', mechanic: 'Mechanic (Mujju)', owner: 'Owner' };
const ROLE_ICONS = { staff: 'S', mechanic: 'M', owner: 'O' };

const TABS_CONFIG = {
  staff:    [{ id: 'checkin', label: 'Check In' }, { id: 'queue', label: 'Queue' }, { id: 'pickup', label: 'Pickup' }, { id: 'parts', label: 'Parts' }],
  mechanic: [{ id: 'today', label: 'Today' }, { id: 'active', label: 'Active' }, { id: 'tomorrow', label: 'Tomorrow' }, { id: 'mystats', label: 'My Stats' }],
  owner:    [{ id: 'dashboard', label: 'Dashboard' }, { id: 'assign', label: 'Assign' }, { id: 'team', label: 'Team' }, { id: 'customers', label: 'Customers' }]
};

const NAV_ITEMS = {
  staff:    [{ icon: '&#128203;', label: 'Queue', tab: 'queue' }, { icon: '&#10133;', label: 'Check In', tab: 'checkin' }, { icon: '&#128176;', label: 'Pickup', tab: 'pickup' }, { icon: '&#128295;', label: 'Parts', tab: 'parts' }],
  mechanic: [{ icon: '&#128197;', label: 'Today', tab: 'today' }, { icon: '&#9200;', label: 'Active', tab: 'active' }, { icon: '&#128198;', label: 'Tomorrow', tab: 'tomorrow' }, { icon: '&#128202;', label: 'Stats', tab: 'mystats' }],
  owner:    [{ icon: '&#128200;', label: 'Dashboard', tab: 'dashboard' }, { icon: '&#128100;', label: 'Assign', tab: 'assign' }, { icon: '&#128101;', label: 'Team', tab: 'team' }, { icon: '&#128222;', label: 'Customers', tab: 'customers' }]
};

const STATUS_LABELS = {
  received: 'Received', assigned: 'Assigned', in_progress: 'In Progress',
  parts_pending: 'Parts Wait', quality_check: 'QC Check', ready: 'Ready', completed: 'Completed'
};

let state = {
  role: 'staff',
  activeTab: 'checkin',
  activeTimerJob: null,
  timerInterval: null,
  reassignJobId: null,
  reassignMechanicId: null,
  qcJobId: null,
  activeJobPartsUsed: [],
  activeJobNeedParts: false
};

// ====== INIT ======
async function init() {
  await seedData();
  renderRole();
  await refreshAll();

  window.addEventListener('online', () => { document.getElementById('offlineBanner').classList.remove('show'); showToast('Back online!', 'success'); });
  window.addEventListener('offline', () => { document.getElementById('offlineBanner').classList.add('show'); });
  if (!navigator.onLine) document.getElementById('offlineBanner').classList.add('show');

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

// ====== ROLE SWITCHING ======
function switchRole() {
  const idx = ROLES.indexOf(state.role);
  state.role = ROLES[(idx + 1) % ROLES.length];
  stopTimer();
  renderRole();
  refreshAll();
}

function renderRole() {
  document.getElementById('roleSubtitle').textContent = ROLE_LABELS[state.role];
  document.getElementById('profileBtn').textContent = ROLE_ICONS[state.role];
  renderTabs();
  renderBottomNav();
  const firstTab = TABS_CONFIG[state.role][0].id;
  switchTab(firstTab);
}

document.getElementById('profileBtn').addEventListener('click', switchRole);

// ====== TABS ======
function renderTabs() {
  const bar = document.getElementById('tabBar');
  bar.innerHTML = TABS_CONFIG[state.role].map(t =>
    `<button class="tab" data-tab="${t.id}" onclick="switchTab('${t.id}')">${t.label}</button>`
  ).join('');
}

function switchTab(tabId) {
  state.activeTab = tabId;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById('screen-' + tabId);
  if (screen) screen.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.tab === tabId));
  refreshScreen(tabId);
}

// ====== BOTTOM NAV ======
function renderBottomNav() {
  const nav = document.getElementById('bottomNav');
  nav.innerHTML = NAV_ITEMS[state.role].map(n =>
    `<button class="nav-item" data-tab="${n.tab}" onclick="switchTab('${n.tab}')"><span class="nav-icon">${n.icon}</span>${n.label}</button>`
  ).join('');
}

// ====== TOAST ======
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.className = 'toast ' + type;
  t.innerHTML = (type === 'success' ? '&#9989; ' : type === 'error' ? '&#10060; ' : type === 'info' ? '&#8505; ' : '') + msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ====== REFRESH ======
async function refreshAll() {
  await refreshScreen(state.activeTab);
}

async function refreshScreen(tabId) {
  try {
    switch (tabId) {
      case 'checkin': break;
      case 'queue': await renderQueue(); break;
      case 'pickup': await renderPickup(); break;
      case 'parts': await renderParts(); break;
      case 'today': await renderMechToday(); break;
      case 'active': await renderActiveJob(); break;
      case 'tomorrow': break;
      case 'mystats': await renderMyStats(); break;
      case 'dashboard': await renderOwnerDashboard(); break;
      case 'assign': await renderAssign(); break;
      case 'team': await renderTeam(); break;
      case 'customers': await renderCustomers(); break;
    }
    await updateNotifBadge();
  } catch (e) { console.error('Refresh error:', e); }
}

async function updateNotifBadge() {
  const stats = await getDashboardStats();
  const count = stats.qc + stats.partsPending;
  const badge = document.getElementById('notifBadge');
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

// ====== HELPERS ======
function serviceTypeInfo(type) {
  const map = { regular: SERVICE_TYPES.REGULAR, repair: SERVICE_TYPES.REPAIR, makeover: SERVICE_TYPES.MAKEOVER, insurance: SERVICE_TYPES.INSURANCE };
  return map[type] || SERVICE_TYPES.REGULAR;
}

function serviceBadge(type) {
  const info = serviceTypeInfo(type);
  return `<span class="job-badge badge-${type}">${info.icon} ${info.label}</span>`;
}

function statusBadge(status) {
  const dotClass = { received: 'dot-grey', assigned: 'dot-blue', in_progress: 'dot-blue pulse', parts_pending: 'dot-orange', quality_check: 'dot-purple', ready: 'dot-green', completed: 'dot-green' };
  return `<span class="status-badge status-${status}"><span class="status-dot ${dotClass[status] || 'dot-grey'}"></span>${STATUS_LABELS[status] || status}</span>`;
}

function priorityClass(job) {
  if (job.priority === 'urgent' && ![STATUS.COMPLETED, STATUS.READY].includes(job.status)) return 'priority-urgent';
  return 'status-' + job.status;
}

function formatTime(min) {
  if (!min) return '--';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatCurrency(n) {
  if (n == null) return '--';
  return '\u20B9' + n.toLocaleString('en-IN');
}

function formatTimerDisplay(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ====== CHECK IN ======
let selectedServiceTypeVal = null;
let selectedPriorityVal = 'standard';

function selectServiceType(btn) {
  document.querySelectorAll('.service-type-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedServiceTypeVal = btn.dataset.type;
}

function selectPriority(btn) {
  document.querySelectorAll('.priority-btn').forEach(b => { b.style.background = 'none'; });
  btn.style.background = btn.dataset.priority === 'urgent' ? 'var(--red-light)' : 'var(--orange-light)';
  selectedPriorityVal = btn.dataset.priority;
}

function simulatePhoto(el) {
  el.innerHTML = '<span style="font-size:2rem">&#128247;</span><span style="color:var(--green);font-weight:600">Photo captured!</span>';
  el.style.borderColor = 'var(--green)';
  el.style.background = 'var(--green-light)';
  el.style.borderStyle = 'solid';
}

async function handleCheckIn() {
  const name = document.getElementById('ciName').value.trim();
  const phone = document.getElementById('ciPhone').value.trim();
  const bike = document.getElementById('ciBike').value.trim();
  const issue = document.getElementById('ciIssue').value.trim();

  if (!name) { showToast('Enter customer name', 'error'); return; }
  if (!bike) { showToast('Enter bike model', 'error'); return; }
  if (!selectedServiceTypeVal) { showToast('Select service type', 'error'); return; }

  const st = serviceTypeInfo(selectedServiceTypeVal);
  const job = await createJob({
    customerName: name,
    customerPhone: phone || '',
    bike: bike,
    serviceType: selectedServiceTypeVal,
    issue: issue || 'General service',
    priority: selectedPriorityVal,
    estimatedMin: st.time,
    timeBlock: new Date().getHours() < 13 ? 'morning' : 'afternoon'
  });

  const mechanics = await dbGetAll(STORES.mechanics);
  const assignedMech = mechanics.find(m => m.id === job.mechanicId);
  const mechName = assignedMech ? assignedMech.name : 'Unassigned';

  showToast(`Checked in! Assigned to ${mechName}`, 'success');

  // Reset form
  document.getElementById('ciName').value = '';
  document.getElementById('ciPhone').value = '';
  document.getElementById('ciBike').value = '';
  document.getElementById('ciIssue').value = '';
  document.querySelectorAll('.service-type-btn').forEach(b => b.classList.remove('selected'));
  selectedServiceTypeVal = null;
  selectedPriorityVal = 'standard';
  document.querySelectorAll('.priority-btn').forEach(b => { b.style.background = 'none'; });
  const photoEl = document.getElementById('checkinPhoto');
  photoEl.innerHTML = '<span style="font-size:1.5rem">&#128247;</span>Tap to take bike photo';
  photoEl.style.borderColor = '#d1d5db';
  photoEl.style.background = '#f3f4f6';
  photoEl.style.borderStyle = 'dashed';
}

// ====== QUEUE (SUPPORT) ======
let queueFilter = 'all';

async function renderQueue() {
  const stats = await getDashboardStats();
  const jobs = stats.jobs;

  const counts = {
    all: jobs.length,
    working: jobs.filter(j => j.status === STATUS.IN_PROGRESS).length,
    parts: jobs.filter(j => j.status === STATUS.PARTS_PENDING).length,
    ready: jobs.filter(j => [STATUS.READY, STATUS.QUALITY_CHECK].includes(j.status)).length
  };

  const filtersEl = document.getElementById('queueFilters');
  filtersEl.innerHTML = [
    { id: 'all', label: 'All' },
    { id: 'working', label: 'Working' },
    { id: 'parts', label: 'Parts Wait' },
    { id: 'ready', label: 'Ready' }
  ].map(f => `<button class="filter-pill ${queueFilter === f.id ? 'active' : ''}" onclick="setQueueFilter('${f.id}')">${f.label} <span class="filter-count">${counts[f.id]}</span></button>`).join('');

  let filtered = jobs;
  if (queueFilter === 'working') filtered = jobs.filter(j => j.status === STATUS.IN_PROGRESS);
  else if (queueFilter === 'parts') filtered = jobs.filter(j => j.status === STATUS.PARTS_PENDING);
  else if (queueFilter === 'ready') filtered = jobs.filter(j => [STATUS.READY, STATUS.QUALITY_CHECK].includes(j.status));

  const statusOrder = [STATUS.PARTS_PENDING, STATUS.IN_PROGRESS, STATUS.ASSIGNED, STATUS.RECEIVED, STATUS.QUALITY_CHECK, STATUS.READY, STATUS.COMPLETED];
  filtered.sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));

  const mechanics = await dbGetAll(STORES.mechanics);
  const mechMap = {};
  mechanics.forEach(m => mechMap[m.id] = m);

  const listEl = document.getElementById('queueList');
  if (filtered.length === 0) {
    listEl.innerHTML = '<div class="empty-state"><div class="empty-icon">&#128203;</div><p>No jobs match this filter</p></div>';
    return;
  }

  listEl.innerHTML = filtered.map(job => {
    const mech = mechMap[job.mechanicId];
    const qcAction = job.status === STATUS.QUALITY_CHECK ? `<button class="btn btn-sm btn-warning" onclick="openQcModal(${job.id})">QC Check</button>` : '';
    return `
    <div class="job-card ${priorityClass(job)}">
      <div class="job-header">
        <div class="job-bike">
          <span class="job-bike-icon">&#128661;</span>
          <div class="job-bike-info">
            <h4>${job.customerName}</h4>
            <p>${job.bike}</p>
          </div>
        </div>
        ${serviceBadge(job.serviceType)}
      </div>
      <div class="job-meta">
        <span>&#9200; ${formatTime(job.estimatedMin)}</span>
        <span>&#128100; ${mech ? mech.name : 'Unassigned'}</span>
        ${job.priority === 'urgent' ? '<span class="job-badge badge-urgent">URGENT</span>' : ''}
      </div>
      <div class="job-issue">${job.issue || ''}</div>
      <div class="flex-between">
        ${statusBadge(job.status)}
        ${qcAction}
      </div>
    </div>`;
  }).join('');
}

function setQueueFilter(f) {
  queueFilter = f;
  renderQueue();
}

// ====== PICKUP & PAYMENT (SUPPORT) ======
async function renderPickup() {
  const allJobs = await dbGetAll(STORES.jobs);
  const today = new Date().toISOString().split('T')[0];
  const readyJobs = allJobs.filter(j => j.date === today && [STATUS.READY, STATUS.COMPLETED].includes(j.status));

  const el = document.getElementById('pickupList');
  if (readyJobs.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">&#128176;</div><p>No bikes ready for pickup yet</p></div>';
    return;
  }

  el.innerHTML = readyJobs.map(job => {
    const isPaid = job.status === STATUS.COMPLETED;
    const st = serviceTypeInfo(job.serviceType);
    const partsTotal = (job.partsUsed || []).reduce((s, p) => s + (p.price * (p.qty || 1)), 0);
    const labor = st.price;
    const total = partsTotal + labor;

    if (isPaid) {
      return `
      <div class="card card-bordered done">
        <div class="flex-between mb-2">
          <div><strong>${job.customerName}</strong><br><span class="text-sm text-muted">${job.bike}</span></div>
          <span class="job-badge badge-insurance">PAID &#9989;</span>
        </div>
        <div class="bill-row total"><span>Total</span><span>${formatCurrency(job.totalCost || total)}</span></div>
        <div class="text-sm text-muted text-center mt-2">Paid via ${(job.paymentMethod || '').toUpperCase()} at ${job.paidAt ? new Date(job.paidAt).toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'}) : '--'}</div>
      </div>`;
    }

    return `
    <div class="card" id="pickup-card-${job.id}">
      <div class="flex-between mb-2">
        <div><strong>${job.customerName}</strong><br><span class="text-sm text-muted">${job.bike}</span></div>
        ${serviceBadge(job.serviceType)}
      </div>
      <div class="photo-row">
        <div class="photo-placeholder" onclick="simulatePhoto(this)" style="height:80px"><span>Before &#128247;</span></div>
        <div class="photo-placeholder" onclick="simulatePhoto(this)" style="height:80px"><span>After &#128247;</span></div>
      </div>
      <div class="divider"></div>
      <div class="bill-row"><span>Labor</span><span>${formatCurrency(labor)}</span></div>
      ${(job.partsUsed || []).map(p => `<div class="bill-row"><span>${p.name} x${p.qty || 1}</span><span>${formatCurrency(p.price * (p.qty || 1))}</span></div>`).join('')}
      <div class="bill-row total"><span>Total</span><span>${formatCurrency(total)}</span></div>
      <div class="form-label mt-3">Payment Method</div>
      <div class="payment-methods" id="payment-methods-${job.id}">
        <button class="payment-method" onclick="selectPayment(${job.id},'cash',this)">&#128181; Cash</button>
        <button class="payment-method" onclick="selectPayment(${job.id},'upi',this)">&#128241; UPI</button>
        <button class="payment-method" onclick="selectPayment(${job.id},'card',this)">&#128179; Card</button>
        <button class="payment-method" onclick="selectPayment(${job.id},'credit',this)">&#128221; Credit</button>
      </div>
      <button class="btn btn-success btn-block" id="payBtn-${job.id}" disabled onclick="handlePayment(${job.id})">&#128176; PAYMENT RECEIVED</button>
    </div>`;
  }).join('');
}

const selectedPayments = {};

function selectPayment(jobId, method, btn) {
  selectedPayments[jobId] = method;
  const container = document.getElementById(`payment-methods-${jobId}`);
  container.querySelectorAll('.payment-method').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  document.getElementById(`payBtn-${jobId}`).disabled = false;
}

async function handlePayment(jobId) {
  const method = selectedPayments[jobId];
  if (!method) return;
  await processPayment(jobId, method);
  showToast('Payment received!', 'success');
  await renderPickup();
  await updateNotifBadge();
}

// ====== PARTS (SUPPORT) ======
async function renderParts() {
  const allJobs = await dbGetAll(STORES.jobs);
  const today = new Date().toISOString().split('T')[0];
  const partsJobs = allJobs.filter(j => j.date === today && j.status === STATUS.PARTS_PENDING);

  const reqEl = document.getElementById('partsRequestList');
  if (partsJobs.length === 0) {
    reqEl.innerHTML = '<div class="empty-state" style="padding:20px"><div class="empty-icon">&#9989;</div><p>No pending parts requests</p></div>';
  } else {
    reqEl.innerHTML = partsJobs.map(job => `
    <div class="card card-bordered" style="border-left-color:var(--orange)">
      <div class="flex-between mb-2">
        <div><strong>${job.customerName}</strong><br><span class="text-sm text-muted">${job.bike}</span></div>
        <span class="status-badge status-parts_pending"><span class="status-dot dot-orange"></span>Parts Wait</span>
      </div>
      <div class="text-sm mb-2">Needed: ${(job.partsNeeded || []).map(p => p.name).join(', ') || 'Not specified'}</div>
      <button class="btn btn-sm btn-success" onclick="handlePartsReceived(${job.id})">&#9989; Parts Received</button>
    </div>`).join('');
  }

  const parts = await dbGetAll(STORES.parts);
  const lowStock = parts.filter(p => p.stock <= p.reorderAt);
  const invEl = document.getElementById('partsInventory');
  invEl.innerHTML = (lowStock.length === 0 ? '<div class="text-sm text-muted text-center" style="padding:10px">All parts well stocked</div>' :
    lowStock.map(p => `
    <div class="parts-item">
      <div class="parts-item-info">
        <div class="parts-item-name">${p.name}</div>
        <div class="parts-item-stock" style="color:${p.stock <= 2 ? 'var(--red)' : 'var(--orange)'}">Stock: ${p.stock} (Reorder at ${p.reorderAt})</div>
      </div>
      <span style="font-size:1.2rem">${p.stock <= 2 ? '&#128308;' : '&#128992;'}</span>
    </div>`).join(''));
}

async function handlePartsReceived(jobId) {
  await markPartsReceived(jobId);
  showToast('Parts received - mechanic notified!', 'success');
  await renderParts();
  await updateNotifBadge();
}

// ====== MECHANIC: TODAY ======
async function renderMechToday() {
  const mechStats = await getMechanicStats('mujju');
  const jobs = mechStats.jobs;
  const done = mechStats.done;
  const total = mechStats.total;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const progEl = document.getElementById('mechProgress');
  progEl.innerHTML = `
    <div class="progress-container">
      <div class="progress-label"><span>Today's Progress</span><span>${done}/${total} jobs</span></div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
    </div>`;

  const morning = jobs.filter(j => j.timeBlock === 'morning');
  const afternoon = jobs.filter(j => j.timeBlock === 'afternoon');

  const renderJobCards = (list) => list.map(job => {
    const isActive = job.status === STATUS.IN_PROGRESS;
    const isDone = [STATUS.COMPLETED, STATUS.READY, STATUS.QUALITY_CHECK].includes(job.status);
    const isParts = job.status === STATUS.PARTS_PENDING;
    const isAssigned = job.status === STATUS.ASSIGNED;

    let actionBtn = '';
    if (isAssigned) actionBtn = `<button class="btn btn-sm btn-primary" onclick="handleStartJob(${job.id})">&#9654; START</button>`;
    else if (isActive) actionBtn = `<button class="btn btn-sm btn-success" onclick="handleShowActive(${job.id})">&#9200; VIEW</button>`;
    else if (isParts) actionBtn = `<span class="status-badge status-parts_pending"><span class="status-dot dot-orange"></span>Parts Wait</span>`;
    else if (isDone) actionBtn = `<span class="status-badge status-completed"><span class="status-dot dot-green"></span>Done</span>`;

    return `
    <div class="job-card ${priorityClass(job)}" style="${isDone ? 'opacity:.65' : ''}">
      <div class="job-header">
        <div class="job-bike">
          <span class="job-bike-icon">&#128661;</span>
          <div class="job-bike-info">
            <h4>${job.customerName}</h4>
            <p>${job.bike}</p>
          </div>
        </div>
        ${serviceBadge(job.serviceType)}
      </div>
      <div class="job-meta">
        <span>&#9200; ${formatTime(job.estimatedMin)}</span>
        ${job.priority === 'urgent' ? '<span class="job-badge badge-urgent">URGENT</span>' : ''}
        ${isParts && job.partsNeeded ? '<span style="color:var(--orange)">&#128295; ' + job.partsNeeded.map(p => p.name).join(', ') + '</span>' : ''}
      </div>
      <div class="job-issue">${job.issue || ''}</div>
      <div style="text-align:right">${actionBtn}</div>
    </div>`;
  }).join('');

  const listEl = document.getElementById('mechTodayList');
  listEl.innerHTML = `
    ${morning.length > 0 ? '<div class="time-block-label">&#9728;&#65039; Morning</div>' + renderJobCards(morning) : ''}
    ${afternoon.length > 0 ? '<div class="time-block-label">&#127749; Afternoon</div>' + renderJobCards(afternoon) : ''}
    ${jobs.length === 0 ? '<div class="empty-state"><div class="empty-icon">&#127881;</div><p>No jobs assigned today!</p></div>' : ''}`;
}

async function handleStartJob(jobId) {
  const job = await startJob(jobId);
  if (!job) return;
  state.activeJobPartsUsed = [...(job.partsUsed || [])];
  state.activeJobNeedParts = false;
  showToast('Job started! Timer running.', 'info');
  switchTab('active');
  startTimer(job);
  await renderMechToday();
}

function handleShowActive(jobId) {
  switchTab('active');
}

// ====== MECHANIC: ACTIVE JOB ======
async function renderActiveJob() {
  const mechStats = await getMechanicStats('mujju');
  const activeJob = mechStats.jobs.find(j => j.status === STATUS.IN_PROGRESS);

  const el = document.getElementById('activeJobContent');
  if (!activeJob) {
    stopTimer();
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">&#128736;</div><p>No active job. Start one from Today tab.</p></div>';
    return;
  }

  if (!state.timerInterval) startTimer(activeJob);
  if (state.activeJobPartsUsed.length === 0 && (activeJob.partsUsed || []).length > 0) {
    state.activeJobPartsUsed = [...activeJob.partsUsed];
  }

  const st = serviceTypeInfo(activeJob.serviceType);

  el.innerHTML = `
    <div class="active-job-header">
      <h3>&#128661; ${activeJob.bike}</h3>
      <p>${activeJob.customerName} &bull; ${st.label}</p>
    </div>
    <div class="timer-display running" id="timerDisplay">00:00:00</div>
    <div class="text-center text-sm text-muted mb-3">Estimated: ${formatTime(activeJob.estimatedMin)}</div>
    <div class="photo-row">
      <div class="photo-placeholder" onclick="simulatePhoto(this)" style="height:90px"><span>&#128247; Before</span></div>
      <div class="photo-placeholder" onclick="simulatePhoto(this)" style="height:90px"><span>&#128247; After</span></div>
    </div>
    <div class="section-title">Parts Used</div>
    <div id="activePartsUsedList" style="margin-bottom:10px">
      ${state.activeJobPartsUsed.length === 0 ? '<div class="text-sm text-muted">No parts added yet</div>' :
        state.activeJobPartsUsed.map((p, i) => `<div class="parts-item"><div class="parts-item-info"><div class="parts-item-name">${p.name}</div><div class="parts-item-stock">Qty: ${p.qty || 1} &bull; ${formatCurrency(p.price)}</div></div><button class="btn btn-sm btn-outline" style="color:var(--red);border-color:var(--red);padding:4px 10px" onclick="removeActivePart(${i})">&#10060;</button></div>`).join('')}
    </div>
    <button class="btn btn-sm btn-outline btn-block mb-3" onclick="openPartsModal()">&#10133; Add Part</button>
    <div class="action-grid">
      <button class="action-btn ${state.activeJobNeedParts ? 'active-action' : ''}" onclick="handleNeedParts(${activeJob.id})">
        <span class="action-icon">&#128295;</span>Need Parts
      </button>
      <button class="action-btn" onclick="showToast('Help request sent to owner!','info')">
        <span class="action-icon">&#128161;</span>Need Help
      </button>
      <button class="action-btn" onclick="handlePauseJob(${activeJob.id})">
        <span class="action-icon">&#9208;&#65039;</span>Pause
      </button>
    </div>
    <button class="btn btn-success btn-block" onclick="handleCompleteJob(${activeJob.id})" style="font-size:1rem;padding:16px">&#9989; COMPLETE JOB</button>`;

  updateTimerDisplay(activeJob);
}

function startTimer(job) {
  state.activeTimerJob = job;
  if (state.timerInterval) clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => updateTimerDisplay(job), 1000);
}

function stopTimer() {
  if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
  state.activeTimerJob = null;
}

function updateTimerDisplay(job) {
  const el = document.getElementById('timerDisplay');
  if (!el || !job.startedAt) return;
  const elapsed = Date.now() - new Date(job.startedAt).getTime();
  el.textContent = formatTimerDisplay(elapsed);
  const estMs = (job.estimatedMin || 60) * 60000;
  if (elapsed > estMs) {
    el.style.background = 'var(--red-light)';
    el.style.color = 'var(--red)';
  }
}

function removeActivePart(idx) {
  state.activeJobPartsUsed.splice(idx, 1);
  renderActiveJob();
}

function openPartsModal() {
  document.getElementById('partsModal').classList.add('show');
  loadPartOptions();
}
function closePartsModal() { document.getElementById('partsModal').classList.remove('show'); }

async function loadPartOptions() {
  const parts = await dbGetAll(STORES.parts);
  const sel = document.getElementById('partSelect');
  sel.innerHTML = parts.map(p => `<option value="${p.id}" data-name="${p.name}" data-price="${p.price}">${p.name} (\u20B9${p.price}) - Stock: ${p.stock}</option>`).join('');
}

function confirmAddPart() {
  const sel = document.getElementById('partSelect');
  const opt = sel.options[sel.selectedIndex];
  const qty = parseInt(document.getElementById('partQty').value) || 1;
  state.activeJobPartsUsed.push({ name: opt.dataset.name, qty, price: parseInt(opt.dataset.price) });
  closePartsModal();
  renderActiveJob();
  showToast('Part added', 'success');
}

async function handleNeedParts(jobId) {
  state.activeJobNeedParts = true;
  await markPartsNeeded(jobId, [{ name: 'Requested part', status: 'pending' }]);
  stopTimer();
  state.activeJobPartsUsed = [];
  showToast('Parts request sent to support!', 'info');
  switchTab('today');
  await renderMechToday();
}

async function handlePauseJob(jobId) {
  showToast('Job paused', 'info');
}

async function handleCompleteJob(jobId) {
  stopTimer();
  const job = await completeJob(jobId, { partsUsed: state.activeJobPartsUsed });
  state.activeJobPartsUsed = [];
  const needsQc = ['repair', 'makeover'].includes(job.serviceType);
  showToast(needsQc ? 'Job sent for QC check!' : 'Job completed! Ready for pickup.', 'success');
  switchTab('today');
  await renderMechToday();
}

// ====== MECHANIC: MY STATS ======
async function renderMyStats() {
  const mechStats = await getMechanicStats('mujju');
  const allJobs = await dbGetAll(STORES.jobs);
  const completedAll = allJobs.filter(j => j.mechanicId === 'mujju' && [STATUS.COMPLETED, STATUS.READY].includes(j.status));
  const avgTime = completedAll.length > 0 ? Math.round(completedAll.reduce((s, j) => s + (j.actualMin || 0), 0) / completedAll.length) : 0;

  const monthJobs = 24 + mechStats.done;
  const incentive = mechStats.onTimeRate >= 80 ? 1500 : mechStats.onTimeRate >= 60 ? 750 : 0;

  const el = document.getElementById('mechStatsContent');
  el.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon">&#128295;</div><div class="stat-value">${monthJobs}</div><div class="stat-label">Jobs This Month</div></div>
      <div class="stat-card"><div class="stat-icon">&#9200;</div><div class="stat-value">${mechStats.onTimeRate}%</div><div class="stat-label">On-Time Rate</div></div>
      <div class="stat-card"><div class="stat-icon">&#9989;</div><div class="stat-value">92%</div><div class="stat-label">QC Score</div></div>
      <div class="stat-card"><div class="stat-icon">&#128176;</div><div class="stat-value">${formatCurrency(incentive)}</div><div class="stat-label">Incentive Earned</div></div>
    </div>
    <div class="section-title">Daily Jobs (This Week)</div>
    <div class="chart-container">
      ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => {
        const val = [4, 5, 3, 6, 4, mechStats.done][i];
        const max = 8;
        const pct = (val / max) * 100;
        const isToday = i === ((new Date().getDay() + 6) % 7);
        return `<div class="chart-bar-row">
          <span class="chart-bar-label" style="${isToday ? 'color:var(--blue);font-weight:800' : ''}">${day}</span>
          <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${pct}%;background:${isToday ? 'var(--blue)' : 'var(--green)'}">${val}</div></div>
        </div>`;
      }).join('')}
    </div>
    <div class="section-title mt-4">Performance Summary</div>
    <div class="card">
      <div class="bill-row"><span>Average completion time</span><span>${avgTime || 35}m</span></div>
      <div class="bill-row"><span>Customer satisfaction</span><span>4.5/5 &#11088;</span></div>
      <div class="bill-row"><span>QC fail rate</span><span>8%</span></div>
      <div class="bill-row"><span>Parts accuracy</span><span>95%</span></div>
    </div>`;
}

// ====== OWNER: DASHBOARD ======
async function renderOwnerDashboard() {
  const stats = await getDashboardStats();
  const mechanics = await dbGetAll(STORES.mechanics);
  const allJobs = stats.jobs;

  const el = document.getElementById('ownerDashContent');
  el.innerHTML = `
    <div class="revenue-card">
      <div class="stat-icon">&#128176;</div>
      <div class="stat-value">${formatCurrency(stats.revenue)}</div>
      <div class="stat-label">Today's Revenue</div>
    </div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon">&#128661;</div><div class="stat-value">${stats.totalJobs}</div><div class="stat-label">Total Jobs</div></div>
      <div class="stat-card"><div class="stat-icon">&#9989;</div><div class="stat-value">${stats.completed}</div><div class="stat-label">Completed</div></div>
      <div class="stat-card"><div class="stat-icon">&#128295;</div><div class="stat-value">${stats.inProgress}</div><div class="stat-label">In Progress</div></div>
      <div class="stat-card"><div class="stat-icon">&#9888;&#65039;</div><div class="stat-value">${stats.partsPending}</div><div class="stat-label">Parts Pending</div></div>
    </div>
    <div class="section-title">Team Status</div>
    ${mechanics.map(mech => {
      const mechJobs = allJobs.filter(j => j.mechanicId === mech.id);
      const activeJob = mechJobs.find(j => j.status === STATUS.IN_PROGRESS);
      const doneCount = mechJobs.filter(j => [STATUS.COMPLETED, STATUS.READY, STATUS.QUALITY_CHECK].includes(j.status)).length;
      const totalCount = mechJobs.length;
      const loadPct = totalCount > 0 ? Math.round((totalCount / 5) * 100) : 0;

      let statusDot = 'dot-grey';
      let statusText = 'Available';
      if (activeJob) { statusDot = 'dot-blue pulse'; statusText = activeJob.bike; }
      else if (doneCount === totalCount && totalCount > 0) { statusDot = 'dot-green'; statusText = 'All done'; }

      return `
      <div class="mech-card">
        <div class="mech-avatar" style="background:${mech.color}">${mech.avatar}</div>
        <div class="mech-info">
          <div class="mech-name">${mech.name} <span class="text-sm text-muted">(${mech.role})</span></div>
          <div class="mech-status"><span class="status-dot ${statusDot}"></span>${statusText}</div>
          <div class="mech-workload">
            <div class="workload-bar"><div class="workload-fill" style="width:${Math.min(loadPct, 100)}%;background:${loadPct > 80 ? 'var(--red)' : loadPct > 50 ? 'var(--orange)' : 'var(--green)'}"></div></div>
          </div>
        </div>
        <span class="text-sm" style="font-weight:700">${doneCount}/${totalCount}</span>
      </div>`;
    }).join('')}`;
}

// ====== OWNER: ASSIGN ======
async function renderAssign() {
  const stats = await getDashboardStats();
  const jobs = stats.jobs.filter(j => j.status !== STATUS.COMPLETED);
  const mechanics = await dbGetAll(STORES.mechanics);
  const mechMap = {};
  mechanics.forEach(m => mechMap[m.id] = m);

  const el = document.getElementById('assignList');
  if (jobs.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">&#128203;</div><p>No active assignments</p></div>';
    return;
  }

  el.innerHTML = jobs.map(job => {
    const mech = mechMap[job.mechanicId];
    return `
    <div class="job-card ${priorityClass(job)}">
      <div class="job-header">
        <div class="job-bike">
          <span class="job-bike-icon">&#128661;</span>
          <div class="job-bike-info">
            <h4>${job.customerName}</h4>
            <p>${job.bike}</p>
          </div>
        </div>
        ${serviceBadge(job.serviceType)}
      </div>
      <div class="flex-between mt-2">
        <div style="display:flex;align-items:center;gap:6px">
          ${mech ? `<div class="mech-avatar" style="background:${mech.color};width:28px;height:28px;font-size:.7rem">${mech.avatar}</div>` : ''}
          <span class="text-sm" style="font-weight:600">${mech ? mech.name : 'Unassigned'}</span>
          ${statusBadge(job.status)}
        </div>
        <button class="btn btn-sm btn-outline" onclick="openReassignModal(${job.id})">&#128260; Reassign</button>
      </div>
    </div>`;
  }).join('');
}

// Reassign Modal
async function openReassignModal(jobId) {
  state.reassignJobId = jobId;
  state.reassignMechanicId = null;
  const job = await dbGet(STORES.jobs, jobId);
  const mechanics = await dbGetAll(STORES.mechanics);
  const allJobs = await dbGetAll(STORES.jobs);
  const today = new Date().toISOString().split('T')[0];

  document.getElementById('reassignJobInfo').innerHTML = `<div class="card mb-3"><strong>${job.customerName}</strong> &bull; ${job.bike}<br><span class="text-sm text-muted">${serviceTypeInfo(job.serviceType).label}</span></div>`;

  document.getElementById('reassignMechList').innerHTML = mechanics.filter(m => m.status === 'on_duty').map(m => {
    const load = allJobs.filter(j => j.mechanicId === m.id && j.date === today && [STATUS.ASSIGNED, STATUS.IN_PROGRESS].includes(j.status)).length;
    const isCurrent = m.id === job.mechanicId;
    return `
    <div class="mech-select-item ${isCurrent ? 'selected-mech' : ''}" onclick="selectReassignMech('${m.id}', this)">
      <div class="mech-avatar" style="background:${m.color};width:36px;height:36px;font-size:.8rem">${m.avatar}</div>
      <div class="mech-info">
        <div class="mech-name">${m.name} ${isCurrent ? '(current)' : ''}</div>
        <div class="text-sm text-muted">${m.role} &bull; ${load} active jobs</div>
      </div>
    </div>`;
  }).join('');

  document.getElementById('reassignModal').classList.add('show');
}

function selectReassignMech(mechId, el) {
  state.reassignMechanicId = mechId;
  document.querySelectorAll('.mech-select-item').forEach(e => e.classList.remove('selected-mech'));
  el.classList.add('selected-mech');
}

function closeModal() { document.getElementById('reassignModal').classList.remove('show'); }

async function confirmReassign() {
  if (!state.reassignMechanicId || !state.reassignJobId) return;
  await reassignJob(state.reassignJobId, state.reassignMechanicId);
  const mech = await dbGet(STORES.mechanics, state.reassignMechanicId);
  showToast(`Reassigned to ${mech.name}`, 'success');
  closeModal();
  await renderAssign();
}

// QC Modal
function openQcModal(jobId) {
  state.qcJobId = jobId;
  document.getElementById('qcModal').classList.add('show');
  dbGet(STORES.jobs, jobId).then(job => {
    document.getElementById('qcJobInfo').innerHTML = `<div class="card mb-3"><strong>${job.customerName}</strong><br>${job.bike}<br><span class="text-sm text-muted">${serviceTypeInfo(job.serviceType).label} &bull; ${formatTime(job.actualMin)} actual</span></div>`;
  });
}

async function handleQcPass() {
  await qcPassJob(state.qcJobId);
  document.getElementById('qcModal').classList.remove('show');
  showToast('QC passed! Bike ready for pickup.', 'success');
  await refreshScreen(state.activeTab);
}

async function handleQcFail() {
  await qcFailJob(state.qcJobId, 'Quality issues found');
  document.getElementById('qcModal').classList.remove('show');
  showToast('QC failed - sent back to mechanic.', 'error');
  await refreshScreen(state.activeTab);
}

// ====== OWNER: TEAM ======
async function renderTeam() {
  const mechanics = await dbGetAll(STORES.mechanics);
  const allJobs = await dbGetAll(STORES.jobs);
  const today = new Date().toISOString().split('T')[0];

  const perfData = mechanics.map(m => {
    const todayJobs = allJobs.filter(j => j.mechanicId === m.id && j.date === today);
    const done = todayJobs.filter(j => [STATUS.COMPLETED, STATUS.READY, STATUS.QUALITY_CHECK].includes(j.status)).length;
    const total = todayJobs.length;
    const onTime = todayJobs.filter(j => j.actualMin && j.estimatedMin && j.actualMin <= j.estimatedMin).length;
    return { ...m, done, total, onTimeRate: done > 0 ? Math.round((onTime / done) * 100) : 0 };
  });

  perfData.sort((a, b) => b.done - a.done);

  const el = document.getElementById('teamContent');
  el.innerHTML = `
    <div class="section-title">Weekly Performance Ranking</div>
    <div class="chart-container">
      ${perfData.map((m, i) => {
        const simWeekly = (m.done * 5) + [12, 10, 8, 6, 5][i];
        const maxW = 40;
        const pct = (simWeekly / maxW) * 100;
        const colors = ['var(--green)', 'var(--blue)', 'var(--orange)', '#6b7280', '#9ca3af'];
        return `<div class="chart-bar-row">
          <span class="chart-bar-label">${m.name}</span>
          <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${pct}%;background:${colors[i] || '#6b7280'}">${simWeekly}</div></div>
        </div>`;
      }).join('')}
    </div>
    <div class="section-title mt-4">Workload Balance</div>
    <div class="chart-container">
      ${perfData.map(m => {
        const loadPct = m.total > 0 ? (m.total / 5) * 100 : 0;
        return `<div class="chart-bar-row">
          <span class="chart-bar-label">${m.name}</span>
          <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${Math.min(loadPct, 100)}%;background:${loadPct > 80 ? 'var(--red)' : loadPct > 50 ? 'var(--orange)' : 'var(--blue)'}">${m.total} jobs</div></div>
        </div>`;
      }).join('')}
    </div>
    <button class="btn btn-outline btn-block mt-3" onclick="handleRebalance()">&#9878; Auto-Rebalance Workload</button>
    <div class="section-title mt-4">Today's Stats</div>
    ${perfData.map(m => `
    <div class="mech-card">
      <div class="mech-avatar" style="background:${m.color}">${m.avatar}</div>
      <div class="mech-info">
        <div class="mech-name">${m.name}</div>
        <div class="text-sm text-muted">${m.done}/${m.total} done &bull; On-time: ${m.onTimeRate}%</div>
      </div>
      <span style="font-size:1.2rem">${m.done === m.total && m.total > 0 ? '&#127942;' : ''}</span>
    </div>`).join('')}`;
}

async function handleRebalance() {
  showToast('Workload rebalanced across team!', 'success');
}

// ====== OWNER: CUSTOMERS ======
async function renderCustomers() {
  const stats = await getDashboardStats();
  const jobs = stats.jobs;

  const el = document.getElementById('customerList');
  if (jobs.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">&#128100;</div><p>No customers today</p></div>';
    return;
  }

  el.innerHTML = jobs.map(job => {
    const steps = [
      { key: 'received', label: 'Recv' },
      { key: 'parts', label: 'Parts' },
      { key: 'working', label: 'Work' },
      { key: 'qc', label: 'QC' },
      { key: 'ready', label: 'Ready' }
    ];

    const statusOrderMap = { received: 0, assigned: 0, parts_pending: 1, in_progress: 2, quality_check: 3, ready: 4, completed: 4 };
    const currentIdx = statusOrderMap[job.status] != null ? statusOrderMap[job.status] : 0;

    let timelineHtml = '<div class="timeline">';
    steps.forEach((step, i) => {
      const isDone = i < currentIdx;
      const isCurrent = i === currentIdx;
      timelineHtml += `<div class="timeline-step"><div class="timeline-dot ${isDone ? 'done' : isCurrent ? 'current' : ''}"></div><div class="timeline-label">${step.label}</div></div>`;
      if (i < steps.length - 1) timelineHtml += `<div class="timeline-line ${isDone ? 'done' : ''}"></div>`;
    });
    timelineHtml += '</div>';

    return `
    <div class="cust-card">
      <div class="cust-header">
        <div>
          <div class="cust-name">${job.customerName}</div>
          <div class="cust-phone">${job.customerPhone || 'No phone'} &bull; ${job.bike}</div>
        </div>
        ${statusBadge(job.status)}
      </div>
      ${timelineHtml}
      <div style="margin-top:10px;text-align:right">
        <button class="btn btn-sm btn-success" onclick="handleWhatsApp('${job.customerPhone || ''}', '${job.customerName}', '${STATUS_LABELS[job.status] || ''}')">&#128172; WhatsApp</button>
      </div>
    </div>`;
  }).join('');
}

function handleWhatsApp(phone, name, status) {
  const msg = `Hello ${name}, your bike service status: ${status}. - Bharath Cycle Hub`;
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone) {
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  }
  showToast('WhatsApp message opened!', 'success');
}

// ====== NOTIFICATIONS ======
document.getElementById('notifBtn').addEventListener('click', async () => {
  const stats = await getDashboardStats();
  const msgs = [];
  if (stats.qc > 0) msgs.push(`${stats.qc} job(s) need QC check`);
  if (stats.partsPending > 0) msgs.push(`${stats.partsPending} job(s) waiting for parts`);
  if (stats.ready > 0) msgs.push(`${stats.ready} bike(s) ready for pickup`);
  if (msgs.length === 0) msgs.push('No new notifications');
  showToast(msgs.join(' | '), 'info');
});

// ====== START APP ======
init();
