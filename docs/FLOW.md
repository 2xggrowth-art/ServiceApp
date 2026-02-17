# BCH Service Management — Application Flow

---

## 1. Authentication Flow

### PIN Login (Mechanics & Staff)
```
LoginScreen → Select mechanic avatar → PinPad (4 digits)
  → loginWithPin(phone, pin)
  → Supabase RPC: verify_pin(phone, pin)
  → Returns: {id, name, role, avatar, color}
  → Save session to localStorage
  → Redirect to role's default page
```

### Email Login (Owner/Admin)
```
LoginScreen → Owner/Admin button → Email + Password form
  → loginWithEmail(email, password)
  → Supabase Auth: signInWithPassword()
  → Fetch user record from users table by auth_user_id
  → Save session to localStorage
  → Redirect to /admin/dashboard
```

### Owner PIN Login (if PIN is set)
```
LoginScreen → Owner/Admin button → Choose: PIN or Email
  → PIN path: PinPad → loginWithPin(ownerPhone, pin)
  → Email path: Email + Password form → loginWithEmail()
```

### Session Soft Lock
- Tracks: mousedown, keydown, touchstart, scroll events
- After 30 min inactivity → **soft lock** (NOT logout)
- Lock screen shows user avatar + re-auth prompt
- Mechanics/Staff: re-enter PIN to unlock
- Admin/Owner: re-enter email + password to unlock
- "Switch User" button for full logout
- In-memory state preserved during lock

### PIN Lockout
- 5 failed PIN attempts → account locked for 15 minutes
- Admin can unlock via Team page → unlock_user RPC

### Mechanic Switch (shared device)
```
SwitchMechanicFAB → SwitchMechanicSheet → Enter phone + PIN
  → switchMechanic(phone, pin) → verify_pin RPC
  → Update session to new mechanic
```

### Mechanic Duty Toggle
- Toggle in header bar (visible only for mechanics)
- Green = On Duty, Grey = Off Duty
- Calls userService.updateMechanicStatus()
- Syncs to admin Team page via Supabase Realtime
- Off-duty mechanics excluded from auto-assignment

---

## 2. Job Lifecycle

### Status Flow
```
RECEIVED → ASSIGNED → IN_PROGRESS → [QUALITY_CHECK] → READY → COMPLETED
                          ↕
                    PARTS_PENDING
```

### Step-by-Step

#### Check-In (Staff)
```
/staff/checkin
  1. Staff enters customer phone → debounced lookup (500ms)
  2. If returning customer:
     - Auto-fills name from customer record
     - Shows bike picker with saved bikes
     - "New bike" option for additional bikes
  3. If new customer: enters name, bike model manually
  4. Selects service type → auto-fills labor charge (editable)
  5. Optionally takes bike photo
  6. Submit → createJob()
     - Creates/updates customer record
     - Creates bike record (if new)
     - Stores laborCharge, customerId, bikeId
     - Triggers auto_assign RPC (server-side)
     - If offline: queued in IndexedDB with temp ID
  7. Status: RECEIVED → ASSIGNED (if mechanic available)
```

#### Start Job (Mechanic)
```
/mechanic/today → tap START on assigned job
  → startJob(jobId)
  → Activity log: records beforeState/afterState
  → Status: ASSIGNED → IN_PROGRESS
  → Sets startedAt = now (timer begins)
```

#### Work in Progress (Mechanic)
```
/mechanic/active
  - Timer shows elapsed time vs estimated
  - Can take before/after photos (Supabase Storage)
  - Can add parts used (from inventory)
  - Can request parts → markPartsNeeded()
    → Status: IN_PROGRESS → PARTS_PENDING
    → Sets pausedAt = now
  - When parts arrive → markPartsReceived()
    → Status: PARTS_PENDING → IN_PROGRESS
    → Clears pausedAt
```

#### Complete Job (Mechanic)
```
/mechanic/active → tap COMPLETE
  → completeJob(jobId, partsUsed)
  → Calculates: actualMin = completedAt - startedAt
  → Calculates: totalCost = laborCharge + sum(parts)
  → If repair/makeover:
      Status: IN_PROGRESS → QUALITY_CHECK
  → If regular/insurance:
      Status: IN_PROGRESS → READY
```

#### Quality Check (Staff/Admin)
```
/staff/queue → QC jobs shown with purple badge
  → Tap "QC Check" → Modal with before/after photos
  → Pass: qcPassJob() → Status: QUALITY_CHECK → READY
  → Fail: qcFailJob() → Status: QUALITY_CHECK → IN_PROGRESS
          Mechanic must rework
```

#### Pickup & Payment (Staff)
```
/staff/pickup → Shows READY jobs with bill
  Bill breakdown:
    Labor: job.laborCharge (or default from service type)
    Parts: sum of (part.price × part.qty)
    Total: labor + parts

  1. Staff selects payment method: Cash / UPI / Card / Credit
  2. Tap "PAYMENT RECEIVED"
     → processPayment(jobId, method)
     → Activity log: records beforeState/afterState
     → Status: READY → COMPLETED
  3. Paid jobs show greyed out with "PAID" badge
```

#### Reassign (Admin)
```
/admin/assign → tap Reassign on any active job
  → Select new mechanic from modal
  → reassignJob(jobId, newMechanicId)
  → Activity log: records beforeState/afterState
  → If was IN_PROGRESS: resets to ASSIGNED, clears startedAt
```

---

## 3. Multi-Day Job Support

Jobs that span multiple days are automatically carried forward:

```
Database query: getJobsForDate(date)
  → .or('date.eq.${date},and(date.lt.${date},status.neq.completed)')

UI indicators:
  - "Day N" orange badge on carryover job cards
  - "Ongoing from previous days" section in mechanic Today view
  - Carryover jobs appear in admin dashboard stats
```

---

## 4. Auto-Assignment Algorithm

```
For each on_duty mechanic:
  score = 100
  score -= activeJobs × 20          (penalize workload)
  score -= totalHoursWorked × 10    (penalize time)
  if repair + senior → score += 15  (skill match)
  if makeover + senior → score += 10
  if weekend + jobs >= 4 → score -= 50 (anti-cherry-picking)

Best score wins assignment
```

Server-side: `auto_assign_job` RPC in migration 003

---

## 5. Offline Flow

### When Device Goes Offline
```
Browser event: 'offline'
  → AppContext sets isOffline = true
  → UI shows yellow banner: "Offline — changes sync when connected"
  → Pending count badge shown

Any mutation (createJob, startJob, etc.):
  → Optimistic local state update (UI updates immediately)
  → offlineQueue.enqueue(actionName, args)
  → Toast: "Saved offline — will sync when connected"
```

### When Device Comes Back Online
```
Browser event: 'online'
  → Fetch retryable actions (status != 'failed', retryCount < 5)
  → For each queued action:
      → Wait with exponential backoff (1s, 2s, 4s, 8s, max 30s)
      → replayAction(action, args)
      → On success: remove from queue
      → On failure: increment retryCount, continue to next
  → After 5 failures: mark action as 'failed'
```

### Sync Status Banners
```
Yellow  = Offline (with pending count)
Blue    = Syncing / Pending sync
Red     = Failed actions (with "Tap to retry" button)
```

### Offline Data Sources (fallback chain)
```
1. Supabase (live) → used when online
2. IndexedDB cache → used when offline
3. Mock data → used when VITE_USE_SUPABASE=false (demo mode)
```

---

## 6. Realtime Updates

### Job Changes (useRealtimeJobs)
```
Supabase channel: 'jobs-realtime'
Table: public.jobs

Events:
  INSERT → Add new job to local state
  UPDATE → Update existing job in state
  DELETE → Remove job from state

Service Worker Notifications (for mechanics):
  - Job assigned to me → "New Job Assigned: {bike} — {serviceType}"
  - QC failed on my job → "QC Failed: {bike} needs rework"
  - Parts arrived for my job → "Parts Ready: {bike}"

Fallback: browser Notification API if SW unavailable
```

### User Changes (useRealtimeUsers)
```
Supabase channel: 'users-realtime'
Table: public.users
Filter: role = mechanic

Events:
  UPDATE → Reflect mechanic on_duty/off_duty status change
```

---

## 7. Role-Based Navigation

### Staff
```
/staff/checkin  → Check In (new bike intake, customer lookup)
/staff/queue    → Queue (all jobs, QC check)
/staff/pickup   → Pickup (payment & delivery)
/staff/parts    → Parts (inventory & requests)
```

### Mechanic
```
/mechanic/today  → Today (assigned jobs, carryover section)
/mechanic/active → Active Job (timer, photos, parts)
/mechanic/new    → New Service (create job)
/mechanic/stats  → My Stats (performance, period toggle: 7d/30d/90d)
```

### Admin / Owner
```
/admin/dashboard → Dashboard (revenue, alerts, heatmap, live board)
/admin/assign    → Assign (manual job assignment)
/admin/team      → Team (mechanic management, leaderboard, period toggle)
/admin/customers → Customers (customer database)
/admin/audit     → Audit Log (filters, CSV export, before/after diffs)
```

### Route Protection
```
ProtectedRoute checks:
  1. Is user authenticated? → No → redirect to login
  2. Is session locked? → Yes → show LockScreen
  3. Is user's role in allowedRoles? → No → redirect to role's default page
  4. Yes → render page (lazy loaded with Suspense)

Role defaults:
  owner    → /admin/dashboard
  admin    → /admin/dashboard
  mechanic → /mechanic/today
  staff    → /staff/checkin
```

---

## 8. Pricing Flow

### At Check-In
```
Staff selects service type:
  Regular  → auto-fills ₹500
  Repair   → auto-fills ₹200
  Complete → auto-fills ₹2,459
  Insurance → auto-fills ₹0

Staff CAN edit the labor charge amount before submitting.
Custom amount stored as job.laborCharge
```

### At Job Completion
```
totalCost = laborCharge + sum(partsUsed)

Where:
  laborCharge = job.laborCharge ?? SERVICE_TYPES[type].price
  partsUsed   = sum of (part.price × part.qty)
```

### At Pickup
```
Bill shows:
  Labor: ₹{laborCharge}
  Part 1: ₹{price × qty}
  Part 2: ₹{price × qty}
  ─────────────────
  Total: ₹{totalCost}
```

---

## 9. Data Flow Diagram

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│  Pages/UI   │ ←→ │  AppContext   │ ←→ │  Services    │
│             │    │  (state +    │    │  (Supabase    │
│ CheckIn     │    │   mutations) │    │   REST API)   │
│ Queue       │    │              │    │               │
│ Pickup      │    │ jobs[]       │    │ jobService    │
│ Today       │    │ mechanics[]  │    │ userService   │
│ ActiveJob   │    │ customers[]  │    │ customerSvc   │
│ Dashboard   │    │ parts[]      │    │ bikeService   │
│ Team        │    │ isOffline    │    │ photoService  │
│ MyStats     │    │ isDataLoading│    │ performanceSvc│
│ AuditLog    │    │              │    │ activityLogSvc│
└─────────────┘    └──────┬───────┘    └──────┬───────┘
                          │                    │
                   ┌──────┴───────┐    ┌──────┴───────┐
                   │  Offline     │    │  Supabase    │
                   │  Layer       │    │  Realtime    │
                   │              │    │              │
                   │ offlineQueue │    │ jobs channel │
                   │ (IndexedDB)  │    │ users channel│
                   │ retryCount   │    │              │
                   │ backoff      │    │ SW Push      │
                   └──────────────┘    └──────────────┘
```

---

## 10. Customer → Bike → Job Data Model

```
Customer (phone unique)
  └── Bikes[] (customer_id FK)
       └── Jobs[] (bike_id FK, customer_id FK)

Check-In flow:
  1. Enter phone → lookup customer
  2. If found: auto-fill name, show bike picker
  3. Select existing bike OR add new bike
  4. Create job linked to customer + bike
```

---

## 11. Audit Log

### Activity Tracking
```
Every mutation logs to activity_logs table:
  - action: 'job_started', 'job_reassigned', 'payment_processed', etc.
  - beforeState: snapshot before change
  - afterState: snapshot after change
  - userId, jobId, timestamp
```

### Audit Log Page (/admin/audit)
```
Filters:
  - Date range (from/to)
  - Mechanic dropdown
  - Action type
  - Job ID

Features:
  - Expandable before/after state diffs
  - CSV export (up to 1000 records)
  - Pagination
```

---

## 12. Performance Tracking

### Mechanic Stats (/mechanic/stats)
- Period toggle: 7d / 30d / 90d
- Total jobs, completed, avg completion time
- On-time percentage (actual <= estimated)
- Revenue generated
- Stale-while-revalidate cache (5 min TTL)

### Team Leaderboard (/admin/team)
- Same period toggle (7d / 30d / 90d)
- Ranked by jobs completed
- Shows: avatar, jobs done, avg time, on-time %, revenue
- Duty toggle per mechanic (on/off)
- PIN lockout indicator + unlock button

### Slow Jobs Alert (Admin Dashboard)
- Jobs where actual_min > estimated_min × 1.5
- Shows overtime percentage
- Last 30 days, top 3 displayed

---

## 13. Integration Points (Stubs)

### WhatsApp (disabled by default)
```
Trigger points:
  createJob → sendJobUpdate(phone, 'job_received', {name, bike})
  qcPassJob → sendReadyNotification(phone, jobId)

Enable: VITE_WHATSAPP_ENABLED=true + VITE_WHATSAPP_API_URL=...
```

### Zoho Books (disabled by default)
```
Trigger points:
  processPayment → createInvoice(job)

Enable: VITE_ZOHO_ENABLED=true + VITE_ZOHO_API_URL=...
```
