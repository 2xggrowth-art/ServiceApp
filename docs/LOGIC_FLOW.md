# COMPLETE APP LOGIC FLOW
## Frame-by-Frame: Who Does What, When, and Why

---

## THE 4 USERS AND WHAT THEY DO

| User | When They Use It | Device | What They Do |
|------|-----------------|--------|-------------|
| **Support Staff** (front desk) | When customer walks in | Phone/Tablet at counter | Creates new service entry, takes bike photo, enters customer details |
| **Owner (You)** | Throughout the day | Phone + Desktop | Views dashboard, assigns/reassigns jobs, checks performance, manages team |
| **Mechanic** (Mujju, Appi, etc.) | While working | Phone in pocket | Sees their assigned jobs, taps start/complete, takes before/after photos |
| **Customer** | Passive — they receive updates | Their own WhatsApp | Gets automated messages about bike status |

---

## COMPLETE WORKFLOW: FRAME BY FRAME

### FRAME 1: Customer Arrives (Support Staff Screen)

**WHO:** Support Staff at front desk
**WHEN:** Customer walks in with a bike
**SCREEN:** "New Service Entry" form

```
┌──────────────────────────┐
│  + NEW SERVICE ENTRY     │
│                          │
│  📸 [Take Bike Photo]    │  ← Camera opens, snap the bike
│                          │
│  👤 Customer Name: _____ │  ← Type or search existing
│  📱 Phone: _____________ │  ← For WhatsApp updates
│                          │
│  🏍️ Bike Model: ________ │  ← Dropdown + search
│  📅 Year: ______________ │
│                          │
│  🔧 Service Type:        │
│  [Regular] [Repair]      │  ← Tap one (big colorful buttons)
│  [Makeover] [Insurance]  │
│                          │
│  📝 Issue (optional):    │
│  ________________________│  ← Brief text OR voice note
│                          │
│  ⏱️ Estimated Time:      │
│  [30min] [1hr] [2hr]     │  ← Auto-suggested based on service type
│  [4hr] [Custom]          │
│                          │
│  [✅ CHECK IN BIKE]       │  ← Big green button
└──────────────────────────┘
```

**LOGIC:**
1. Support staff taps "New Service Entry"
2. Takes a photo of the bike (mandatory — this becomes the job card photo)
3. Enters customer name + phone (if returning customer, system auto-fills from phone number)
4. Selects bike model from dropdown (or types new one)
5. Selects service type (this determines estimated time + default cost)
6. Taps "CHECK IN BIKE"

**WHAT HAPPENS AFTER "CHECK IN" (Hybrid Assignment - Option C):**
- Job is created with status = "RECEIVED"
- System **auto-assigns immediately** to mechanic with lowest workload + matching skill
- Job status: RECEIVED → ASSIGNED
- Mechanic gets push notification: "New job: [bike model] - [service type]"
- Customer gets WhatsApp: "Your [bike model] is checked in at Bharath Cycle Hub. Service #[ID]. We'll update you on progress."
- Job appears on Owner's dashboard
- **Owner OR Mujju can reassign** if the auto-assignment isn't ideal (e.g., complex job assigned to junior)

**AUTO-ASSIGN LOGIC (detailed):**
```
1. Get all mechanics currently ON DUTY (not sick, not day off)
2. For each mechanic, count ACTIVE jobs (status = in_progress or received)
3. Sort by: fewest active jobs first
4. If TIE → check skill match:
   - "Repair" jobs → prefer senior mechanics (Mujju, Appi)
   - "Regular Service" → any mechanic
   - "Makeover" → prefer senior + assign helper
5. If WEEKEND + queue > 5 bikes → FORCE sequential assignment (no cherry-picking)
6. Assign to top mechanic → notify them
```

---

### FRAME 2: Owner Sees New Job (Owner Dashboard)

**WHO:** Owner (You)
**WHEN:** Immediately after check-in (real-time update)
**SCREEN:** Owner Dashboard

```
┌──────────────────────────┐
│  📊 DASHBOARD            │
│                          │
│  Today: ₹18,450 revenue  │
│  ↑23% vs last Friday    │
│                          │
│  ┌──────┐ ┌──────┐      │
│  │🏍️ 18 │ │✅ 9  │      │
│  │In     │ │Done  │      │
│  │Service│ │Today │      │
│  └──────┘ └──────┘      │
│  ┌──────┐ ┌──────┐      │
│  │⏳ 4  │ │⚠️ 2  │      │
│  │In    │ │Parts │      │
│  │Progress│ │Pending│    │
│  └──────┘ └──────┘      │
│                          │
│  🆕 NEW (unassigned): 1  │  ← If auto-assign is OFF
│  ┌────────────────────┐  │
│  │ 🏍️ Amit Verma      │  │
│  │ Suzuki Gixxer SF   │  │
│  │ Chain noise         │  │
│  │ Waiting: 12 min     │  │
│  │                     │  │
│  │ Recommended: Appi   │  │
│  │ [ASSIGN TO APPI]    │  │
│  │ [CHOOSE OTHER]      │  │
│  └────────────────────┘  │
│                          │
│  👥 TEAM STATUS:         │
│  Mujju  🟢 Working  3/5 │
│  Appi   🟢 Working  2/4 │
│  Baba   🟡 Waiting  1/3 │  ← Parts pending
│  Iqbal  🟢 Working  2/4 │
│  Mohan  🔴 Slow     1/3 │  ← Over estimated time
└──────────────────────────┘
```

**OWNER'S ACTIONS HERE:**
1. **View dashboard** — see overall status at a glance
2. **Assign unassigned jobs** — if auto-assign is off, tap to assign
3. **Reassign jobs** — if a mechanic is overloaded or blocked, drag job to another
4. **View mechanic details** — tap any mechanic to see their full day
5. **Flag issues** — tap on a "slow" or "blocked" mechanic to investigate

**LOGIC:**
- Dashboard refreshes in real-time (every 10 seconds or on events)
- "Waiting time" counter starts when job is created and increases until assigned
- Team status colors:
  - 🟢 Green = actively working on a job
  - 🟡 Yellow = has a job but blocked (parts pending, waiting for info)
  - 🔴 Red = behind schedule (actual time > estimated time × 1.3)
  - ⚪ Grey = no active job (idle — should get assigned something)

---

### FRAME 3: Mechanic Sees Assigned Job (Mechanic Calendar)

**WHO:** Mechanic (e.g., Mujju)
**WHEN:** After job is assigned to them (push notification)
**SCREEN:** Mechanic's "Today" Calendar

```
┌──────────────────────────┐
│  📅 MY JOBS TODAY        │
│  Progress: 2/5 done ████░│
│                          │
│  🌅 MORNING              │
│  ┌────────────────────┐  │
│  │ ✅ Rajesh Kumar     │  │  ← Completed, faded
│  │ Hero Splendor       │  │
│  │ Done in 38 min      │  │
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ ✅ Anita Patel      │  │  ← Completed, faded
│  │ Bajaj Pulsar        │  │
│  │ Done in 25 min      │  │
│  └────────────────────┘  │
│                          │
│  🔴 NEXT UP:             │
│  ┌────────────────────┐  │
│  │ 🏍️ [BIKE PHOTO]     │  │
│  │ Ramesh Gupta        │  │
│  │ Honda CB Shine      │  │
│  │ ⚡ ENGINE ISSUE      │  │
│  │ ~90 min             │  │
│  │ ✅ Parts Ready       │  │
│  │                     │  │
│  │ [▶ START JOB]       │  │  ← Big blue button
│  └────────────────────┘  │
│                          │
│  🌇 AFTERNOON            │
│  ┌────────────────────┐  │
│  │ 🏍️ Priya Sharma     │  │
│  │ RE Classic 350      │  │
│  │ 🧽 Makeover ₹2459   │  │
│  │ ⚠️ Oil Filter Pending│ │  ← Can't start until parts arrive
│  └────────────────────┘  │
└──────────────────────────┘
```

**MECHANIC'S ACTIONS:**
1. **View today's jobs** — see all assigned work with bike photos
2. **Tap START JOB** — begins the job (starts timer)
3. **Can NOT skip ahead** — must start jobs in order (top to bottom) unless owner overrides
4. **Can NOT reassign** — only owner can move jobs between mechanics

**LOGIC:**
- Jobs appear in the order assigned by system/owner
- "Parts Pending" jobs show a warning — mechanic can't start until support staff marks parts as received
- Mechanic sees ONLY their jobs (not other mechanics' work)
- Push notification when new job is assigned: "New job: [bike model] - [service type]"

---

### FRAME 4: Mechanic Starts a Job

**WHO:** Mechanic
**WHEN:** They tap "START JOB"
**SCREEN:** Active Job View

```
┌──────────────────────────┐
│  🔧 ACTIVE JOB           │
│  ⏱️ Timer: 00:12:34      │  ← Live timer running
│                          │
│  ┌────────────────────┐  │
│  │ 🏍️ [BIKE PHOTO]     │  │
│  │ Ramesh Gupta        │  │
│  │ Honda CB Shine 2020 │  │
│  │ ⚡ Engine Issue      │  │
│  │ Est: ~90 min        │  │
│  └────────────────────┘  │
│                          │
│  📸 BEFORE PHOTO:        │
│  [📷 TAKE PHOTO]         │  ← Must take before starting work
│                          │
│  🔩 PARTS USED:          │
│  [+ Add Part]            │  ← Optional: log parts
│  • Spark plug (1) - ₹120│
│  • Battery (1) - ₹850   │
│                          │
│  📝 NOTES:               │
│  [+ Add Note]            │  ← Optional: voice or text
│                          │
│  ──────────────────────  │
│                          │
│  ⚠️ NEED HELP?           │
│  [🔧 Need Parts]         │  ← Pauses job, notifies owner
│  [👤 Need Senior Help]   │  ← Sends alert to senior mechanic
│  [⏸️ Pause Job]           │  ← Customer changed scope, etc.
│                          │
│  ──────────────────────  │
│                          │
│  [✅ COMPLETE JOB]        │  ← Big green button (bottom)
└──────────────────────────┘
```

**WHAT HAPPENS WHEN MECHANIC TAPS "START JOB":**
1. Job status changes: RECEIVED → IN_PROGRESS
2. Timer starts automatically
3. System prompts: "Take a BEFORE photo" (mandatory for repair/makeover, optional for regular service)
4. Owner dashboard updates in real-time: mechanic status changes to 🟢 Working
5. Customer gets WhatsApp: "Your [bike model] is now being worked on by our service team."

**"NEED PARTS" LOGIC:**
1. Mechanic taps "Need Parts"
2. Job status changes: IN_PROGRESS → PARTS_PENDING
3. Timer PAUSES (doesn't count against mechanic's performance)
4. Owner gets notification: "[Mechanic] needs parts for [bike] - [part description]"
5. Support staff sees parts request in their queue
6. When parts arrive → support staff marks "Parts Received" → mechanic gets notified → timer resumes

**"PAUSE JOB" LOGIC:**
1. Mechanic selects reason: "Customer changed scope" / "Need owner decision" / "Lunch break" / "Other"
2. Timer pauses
3. Owner gets notification with reason
4. Job can be resumed or reassigned by owner

---

### FRAME 5: Mechanic Completes a Job

**WHO:** Mechanic
**WHEN:** Work is finished, they tap "COMPLETE JOB"
**SCREEN:** Job Completion Flow

```
┌──────────────────────────┐
│  ✅ COMPLETING JOB        │
│                          │
│  📸 AFTER PHOTO:         │
│  [📷 TAKE PHOTO]         │  ← Mandatory
│                          │
│  ⏱️ Time Taken: 1hr 12min│
│  📊 Estimated: 1hr 30min │
│  🟢 FASTER than estimate │
│                          │
│  🔩 Parts Used: 2 items  │
│  💰 Parts Cost: ₹970     │
│                          │
│  How was this job?       │
│  [😊 Easy] [😐 Normal]   │
│  [😤 Difficult]          │  ← Self-assessment
│                          │
│  [✅ CONFIRM COMPLETE]    │
└──────────────────────────┘
```

**WHAT HAPPENS WHEN MECHANIC TAPS "CONFIRM COMPLETE":**
1. Job status changes: IN_PROGRESS → QUALITY_CHECK
2. Timer stops, actual time is recorded
3. After photo is saved
4. **IF quality check is enabled:**
   - Job goes to owner/senior mechanic for review
   - They inspect the bike and tap "QC PASS" or "QC FAIL"
   - QC FAIL → job goes back to mechanic with notes
5. **IF quality check is skipped** (regular service, minor jobs):
   - Job status changes directly: IN_PROGRESS → READY
6. Customer gets WhatsApp: "Your [bike model] service is complete! Ready for pickup."
7. Mechanic's calendar auto-advances to next job
8. Performance score updates: completion time vs estimate

---

### FRAME 6: Quality Check (Owner/Senior Mechanic)

**WHO:** Owner or Senior Mechanic
**WHEN:** After mechanic marks job complete
**SCREEN:** QC Review

```
┌──────────────────────────┐
│  🔍 QUALITY CHECK         │
│                          │
│  Ramesh Gupta            │
│  Honda CB Shine 2020     │
│  Mechanic: Mujju         │
│  Time: 1hr 12min         │
│                          │
│  📸 BEFORE    📸 AFTER    │
│  [photo]     [photo]     │  ← Side by side comparison
│                          │
│  🔩 Parts: Spark plug,   │
│            Battery       │
│  💰 Total: ₹970 + labor  │
│                          │
│  [✅ QC PASS]  [❌ QC FAIL]│
│                          │
│  If FAIL, reason:        │
│  [________________________]│
└──────────────────────────┘
```

**QC PASS LOGIC:**
1. Job status: QUALITY_CHECK → READY
2. Customer gets WhatsApp: "Your bike is ready for pickup! Total: ₹[amount]"
3. Job moves to "Ready for Pickup" list

**QC FAIL LOGIC:**
1. Job status: QUALITY_CHECK → IN_PROGRESS (back to mechanic)
2. Mechanic gets notification: "QC failed: [reason]. Please fix."
3. This is tracked — affects mechanic's quality score

---

### FRAME 7: Customer Pickup & Payment (Support Staff)

**WHO:** Support Staff
**WHEN:** Customer returns to pick up bike
**SCREEN:** Pickup & Payment

```
┌──────────────────────────┐
│  💰 CUSTOMER PICKUP       │
│                          │
│  Ramesh Gupta            │
│  Honda CB Shine 2020     │
│                          │
│  📸 Before → After photos│
│  🔩 Parts: ₹970          │
│  👨‍🔧 Labor: ₹500          │
│  💰 TOTAL: ₹1,470        │
│                          │
│  Payment Method:         │
│  [💵 Cash] [📱 UPI]      │
│  [💳 Card] [📋 Credit]   │
│                          │
│  [✅ PAYMENT RECEIVED]    │
│                          │
│  ─── OR ───              │
│                          │
│  [📱 SEND INVOICE VIA    │
│   WHATSAPP]              │
└──────────────────────────┘
```

**PAYMENT LOGIC:**
1. Support staff shows before/after photos to customer (builds trust)
2. Customer pays → staff selects payment method, taps "Payment Received"
3. Job status: READY → COMPLETED
4. Revenue tracking updates: today's total increases
5. Mechanic performance: job counts toward their completed total
6. Customer gets WhatsApp: "Thank you for choosing Bharath Cycle Hub! Service summary attached."

---

### FRAME 8: End of Day (Owner)

**WHO:** Owner
**WHEN:** End of business day
**SCREEN:** Daily Summary

```
┌──────────────────────────┐
│  📊 TODAY'S SUMMARY       │
│  Friday, 14 Feb 2026    │
│                          │
│  💰 Revenue: ₹24,500     │
│  🏍️ Jobs Completed: 14   │
│  ⏱️ Avg Time: 52 min     │
│  ⭐ QC Pass Rate: 93%    │
│                          │
│  🏆 TOP PERFORMER:       │
│  Mujju - 5 jobs, 96% OT │
│                          │
│  ⚠️ ISSUES TODAY:         │
│  • Mohan: 2 jobs over    │
│    estimated time        │
│  • 1 QC failure (Baba)   │
│  • Parts delay: 45 min   │
│    on Royal Enfield      │
│                          │
│  📅 TOMORROW PREVIEW:     │
│  7 jobs pre-assigned     │
│  ⚡ Weekend Rush Expected │
│  ⚠️ 2 jobs need parts prep│
│                          │
│  [📤 SEND SUMMARY TO     │
│   WHATSAPP]              │
└──────────────────────────┘
```

---

## COMPLETE STATUS FLOW

```
RECEIVED ──→ ASSIGNED ──→ IN_PROGRESS ──→ QUALITY_CHECK ──→ READY ──→ COMPLETED
                              │                  │
                              ▼                  ▼
                         PARTS_PENDING      QC_FAILED
                              │            (back to IN_PROGRESS)
                              ▼
                        (parts arrive)
                              │
                              ▼
                         IN_PROGRESS
```

**Status colors everywhere in the app:**
- ⚪ RECEIVED = Grey (new, not started)
- 🔵 ASSIGNED = Blue (assigned to mechanic, not started yet)
- 🟡 IN_PROGRESS = Orange (mechanic working)
- 🔴 PARTS_PENDING = Red (blocked, waiting for parts)
- 🟣 QUALITY_CHECK = Purple (work done, being reviewed)
- 🟢 READY = Green (ready for customer pickup)
- ✅ COMPLETED = Green (paid and gone)

---

## ASSIGNMENT MODEL: HYBRID (Option C - Confirmed)

**How it works:**
1. System auto-assigns by default when staff checks in a bike (no jobs sit waiting)
2. Owner OR Senior Mechanic (Mujju) can **reassign** any job to a different mechanic
3. Regular mechanics CANNOT self-assign, pick jobs, or swap jobs

**Who has assignment permission:**
| Role | Can Assign? | Details |
|------|:---:|---------|
| **Owner** | ✅ Always | Can assign, reassign, override auto-assign |
| **Senior Mechanic (Mujju)** | ✅ Yes | Floor manager — can reassign when he sees a bad fit |
| **Regular Mechanic** | ❌ No | Only sees their own assigned jobs, cannot grab or swap |
| **Support Staff** | ❌ No | Only checks in bikes, system handles assignment |

**Why Hybrid:**
- Jobs NEVER sit unassigned (no bottleneck if Mujju is busy)
- Mujju can fix bad assignments when he has time (e.g., system assigns complex engine job to junior → Mujju reassigns to himself)
- Owner can also reassign from dashboard
- If both Mujju and Owner are busy, system still works automatically

**Reassign flow:**
1. Owner/Mujju taps on an assigned job → sees "Reassign" button
2. Selects different mechanic from list (shows current workload)
3. Old mechanic gets notification: "Job [bike] reassigned to [new mechanic]"
4. New mechanic gets notification: "New job assigned: [bike model]"
5. If job was IN_PROGRESS → it goes back to ASSIGNED status for new mechanic

---

## WHO CAN DO WHAT (Permissions)

| Action | Support Staff | Mechanic | Senior Mechanic (Mujju) | Owner |
|--------|:---:|:---:|:---:|:---:|
| Create new service entry | ✅ | ❌ | ❌ | ✅ |
| Reassign jobs | ❌ | ❌ | ✅ | ✅ |
| View all jobs | ❌ | ❌ | ✅ (read-only) | ✅ |
| View own assigned jobs | ❌ | ✅ | ✅ | ✅ |
| Start/complete a job | ❌ | ✅ (own only) | ✅ (own only) | ✅ |
| Take before/after photos | ❌ | ✅ | ✅ | ✅ |
| Mark parts needed | ❌ | ✅ | ✅ | ✅ |
| Mark parts received | ✅ | ❌ | ❌ | ✅ |
| QC pass/fail | ❌ | ❌ | ✅ | ✅ |
| Accept payment | ✅ | ❌ | ❌ | ✅ |
| View performance rankings | ❌ | Own stats only | Own + team overview | ✅ All details |
| View revenue/money | ❌ | ❌ | ❌ | ✅ |
| Add/remove mechanics | ❌ | ❌ | ❌ | ✅ |
| Toggle auto-assign | ❌ | ❌ | ❌ | ✅ |
| View customer details | ✅ | Name+bike only | Name+bike only | ✅ |

---

## NOTIFICATIONS (Who Gets What, When)

| Event | Owner | Mechanic | Support Staff | Customer (WhatsApp) |
|-------|:---:|:---:|:---:|:---:|
| New bike checked in | ✅ | ❌ | ❌ | ✅ "Bike checked in, service #ID" |
| Job assigned to mechanic | ❌ | ✅ "New job assigned" | ❌ | ❌ |
| Mechanic starts job | ❌ | ❌ | ❌ | ✅ "Being worked on now" |
| Mechanic needs parts | ✅ "Parts needed" | ❌ | ✅ "Order parts" | ❌ |
| Parts received | ❌ | ✅ "Parts ready, resume" | ❌ | ❌ |
| Job completed by mechanic | ✅ if QC needed | ❌ | ❌ | ❌ |
| QC passed | ❌ | ❌ | ✅ "Ready for pickup" | ✅ "Ready for pickup!" |
| QC failed | ❌ | ✅ "QC failed, fix needed" | ❌ | ❌ |
| Payment received | ✅ | ❌ | ❌ | ✅ "Thank you!" |
| Mechanic taking too long | ✅ "Over estimate" | ❌ | ❌ | ❌ |
| Waiting queue > 5 bikes | ✅ "Rush mode!" | ❌ | ❌ | ❌ |
| Customer waiting > 30 min | ✅ | ❌ | ✅ | ❌ |

---

## AUTO-ASSIGN ALGORITHM (Detailed)

```
WHEN new job is created AND auto_assign = true:

1. GET all mechanics WHERE status = ON_DUTY
   EXCLUDE mechanics WHERE status = SICK or DAY_OFF

2. FOR EACH mechanic:
   active_jobs = COUNT jobs WHERE mechanic_id = this AND status IN (assigned, in_progress)
   total_hours = SUM estimated_minutes WHERE mechanic_id = this AND status IN (assigned, in_progress)

3. SCORE each mechanic:
   score = 100
   score -= (active_jobs × 20)          // Fewer jobs = higher score
   score -= (total_hours / 60 × 10)     // Fewer hours = higher score

   IF job.service_type = 'repair' AND mechanic.role = 'senior':
       score += 15                       // Prefer seniors for repairs

   IF job.service_type = 'makeover' AND mechanic.role = 'senior':
       score += 10                       // Prefer seniors for makeovers

   IF today = Saturday OR Sunday:        // Weekend rush mode
       IF active_jobs >= 4:
           score -= 50                   // Heavily penalize overloaded mechanics

4. SORT mechanics BY score DESC
5. ASSIGN to mechanic with highest score
6. NOTIFY mechanic
7. UPDATE job status to ASSIGNED
```

---

## WEEKEND RUSH MODE (Special Logic)

**TRIGGERS:** Saturday OR Sunday AND waiting queue > 5 bikes

**WHAT CHANGES:**
1. Auto-assign becomes MANDATORY (owner can't disable)
2. Jobs are assigned in ARRIVAL ORDER (no picking by difficulty)
3. Estimated times are reduced by 15% (push for faster work)
4. Owner gets alerts every 30 minutes with queue status
5. "Express Service" option appears for quick fixes (<30 min)
6. Customer wait time shown prominently on dashboard

---

## OFFLINE MODE BEHAVIOR

**WHEN INTERNET IS DOWN:**
1. App continues working normally from local data
2. All actions (start job, complete job, photos) are saved locally
3. Yellow banner at top: "⚠️ Offline - changes will sync when connected"
4. NO WhatsApp messages sent (queued for when online)
5. NO real-time updates between devices (each device works independently)

**WHEN INTERNET RETURNS:**
1. All queued changes sync to server
2. If CONFLICT (same job modified on two devices):
   - Most recent timestamp wins
   - Owner is notified of conflict for review
3. Queued WhatsApp messages are sent
4. All dashboards refresh

---

## DATA THAT NEEDS TO BE SET UP FIRST (Before Day 1)

**Owner must configure:**
1. Mechanic list (name, phone, role: senior/junior, photo)
2. Service types + default prices + default estimated times
3. Common parts list with prices
4. Business hours
5. Auto-assign ON/OFF preference
6. QC required ON/OFF preference
7. WhatsApp message templates
8. Owner's phone for notifications

**This is a ONE-TIME SETUP screen that runs before the app is usable.**
