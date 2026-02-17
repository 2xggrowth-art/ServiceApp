# BHARATH CYCLE HUB - COMPLETE SYSTEM DOCUMENT
## Service Management System - Master Reference

**Project Name:** Bharath Cycle Hub - Service Management System
**Document Version:** 2.0 (Consolidated)
**Date:** February 14, 2026
**Business Owner:** Owner, Bharath Cycle Hub
**MVP Target:** May 15, 2026
**Budget:** ₹3,00,000

---

## TABLE OF CONTENTS

1. [Project Overview & Business Case](#1-project-overview--business-case)
2. [Problem Statement & Financial Justification](#2-problem-statement--financial-justification)
3. [Build vs Buy vs Tolerate Decision](#3-build-vs-buy-vs-tolerate-decision)
4. [System Overview](#4-system-overview)
5. [User Roles, Personas & Permissions](#5-user-roles-personas--permissions)
6. [Data Model: Inputs, Processing Rules, Outputs](#6-data-model-inputs-processing-rules-outputs)
7. [Complete Workflow: Frame by Frame](#7-complete-workflow-frame-by-frame)
8. [Auto-Assignment Algorithm (Hybrid Model)](#8-auto-assignment-algorithm-hybrid-model)
9. [Job Status Flow](#9-job-status-flow)
10. [Weekend Rush Mode](#10-weekend-rush-mode)
11. [Notification Matrix](#11-notification-matrix)
12. [Calendar Feature Specifications](#12-calendar-feature-specifications)
13. [UI/UX Design: Low-Literacy Principles](#13-uiux-design-low-literacy-principles)
14. [Color Psychology for Workshop](#14-color-psychology-for-workshop)
15. [Mobile-First Design Strategy](#15-mobile-first-design-strategy)
16. [Integration Points](#16-integration-points)
17. [Technical Constraints & Device Requirements](#17-technical-constraints--device-requirements)
18. [User Behavior & Friction Tolerance](#18-user-behavior--friction-tolerance)
19. [Feature Priority Matrix](#19-feature-priority-matrix)
20. [System Death Scenarios & Prevention](#20-system-death-scenarios--prevention)
21. [Success Metrics & Timeline](#21-success-metrics--timeline)
22. [Performance Tracking System](#22-performance-tracking-system)
23. [Offline Mode Behavior](#23-offline-mode-behavior)
24. [Quality Check (QC) Workflow](#24-quality-check-qc-workflow)
25. [Initial Setup Requirements](#25-initial-setup-requirements)
26. [Implementation Roadmap (16 Weeks)](#26-implementation-roadmap-16-weeks)
27. [Testing Protocol](#27-testing-protocol)
28. [30-Day Dependency Test](#28-30-day-dependency-test)
29. [Market Transition & SaaS Strategy](#29-market-transition--saas-strategy)
30. [Industry Research](#30-industry-research)
31. [Budget & Payment Schedule](#31-budget--payment-schedule)
32. [Sample Data & Workflows](#32-sample-data--workflows)
33. [Technical Architecture & API Specifications](#33-technical-architecture--api-specifications)
34. [Prototype Reference](#34-prototype-reference)

---

## 1. PROJECT OVERVIEW & BUSINESS CASE

**Business:** Bharath Cycle Hub — sells 500-600 bikes/month, services motorcycles and bicycles with 5-6 mechanics.

**Core Problem:** No mechanic performance tracking, blame games, cherry-picking of jobs, ₹92K/month revenue loss.

**Solution:** A mobile-first, offline-capable service management system that automatically tracks mechanic performance, assigns jobs fairly, and provides real-time visibility.

**Business Validation (Critical Questions Results):**
- Decision Matrix: 7/7 Green Lights, 0/7 Red Flags → PROCEED WITH BUILDING
- Monthly cost of not solving: ₹92,000
- ROI: ₹3L development cost vs ₹11L annual loss — pays for itself in 4 months
- Commitment: Daily usage confirmed, 13-week timeline is realistic
- Pain frequency: Multiple times per day, increasing with business growth

**What Changed (Why Now):**
Business scaled to 500-600 bikes/month. The old book-and-pen system worked at lower volume. Now losing 2-3 customers every weekend (₹6K-9K revenue) due to poor coordination, long wait times, and team dysfunction.

---

## 2. PROBLEM STATEMENT & FINANCIAL JUSTIFICATION

**The Pain Statement:**
Cannot properly manage service team of 5-6 mechanics. No tracking of individual performance, no accountability system, no clear targets. Causes blame games, inconsistent pricing, and cherry-picking of easy jobs during weekends. Zero visibility into who's working hard vs who's coasting.

**When It Appears:**
- Time: All day, worst during weekend rush (Saturday-Sunday 10 AM - 6 PM)
- Trigger: Multiple bikes arrive simultaneously, customers complaining, mechanics pointing fingers
- Frequency: Multiple times per day, especially weekends

**Financial Cost Breakdown:**

| Cost Category | Amount |
|--------------|--------|
| Weekend customer loss (2-3 customers × 4 weekends × ₹3K) | ₹24,000-36,000/month |
| Wasted time (8 hrs/week × ₹1,000/hr × 4 weeks) | ₹32,000/month |
| Lost upsell opportunities | ₹10,000/month |
| Stress/health impact | ₹5,000/month |
| Team inefficiency (blame games, rework) | ₹15,000/month |
| **TOTAL MONTHLY COST** | **₹92,000/month** |

**What's Been Tried and Failed:**

| Solution | Why It Failed |
|----------|---------------|
| Book and pen tracking | Data fragmented, can't analyze performance |
| Verbal communication | Mechanics forget commitments, no accountability |
| Standard ₹500 overtime pay | No motivation for difficult jobs, weekend cherry-picking |
| Zoho invoicing | Only handles billing, no service tracking |

**Pattern:** All solutions lack TRACKING and ACCOUNTABILITY. Need automatic performance data capture.

---

## 3. BUILD VS BUY VS TOLERATE DECISION

| Option | Cost (12 months) | Decision |
|--------|------------------|----------|
| **Tolerate** | ₹11,04,000 (lost revenue) | Unacceptable — bleeding money and reputation |
| **Buy generic tool** | ₹1,20,000 (₹10K/month) | Too complex, doesn't fit bicycle workflow, ongoing costs |
| **Build custom** | ₹3,00,000 (one-time) | **CHOSEN** — Perfect fit, one-time cost, 4-month ROI |

---

## 4. SYSTEM OVERVIEW

**One Sentence:** This system will automatically track mechanic performance, assign service jobs fairly, and provide real-time visibility into who's doing what so that I can eliminate blame games, ensure fair compensation, and prevent weekend revenue loss.

**Core Modules:**
1. **Visual Work Calendar** — Kanban-style daily board with photo-based job cards
2. **Auto Job Assignment** — Workload-balanced, skill-matched, anti-cherry-picking
3. **Performance Tracking** — Time tracking, completion metrics, visual dashboards, weekly rankings
4. **WhatsApp Integration** — Automated customer notifications at service milestones
5. **Photo Documentation** — Before/after photos for job cards and quality verification

**Service Types:**
- Regular Service (~45 min, ₹500)
- Complete Makeover (~4 hrs, ₹2,459)
- Repair (varies, ₹200+)
- Insurance Service (~30 min, free)

**Mechanic Team:**
- Senior: Mujju, Appi
- Junior: Baba, Mohan, Iqbal

---

## 5. USER ROLES, PERSONAS & PERMISSIONS

### 5.1 Stakeholder Map

| Role | Person | Details |
|------|--------|---------|
| **Pain Owner** | Owner (You) | Losing ₹92K/month, stressed about team management |
| **System User** | Owner + 6-8 team members | Must be simple for mechanics (tech skill 3-5) |
| **Budget Owner** | Owner (You) | ₹3L budget, expects 4-month ROI |

**Mitigation Strategy (Pain Owner ≠ All Users):**
- Frame system as "fairness tool" not "monitoring tool"
- Show mechanics how it protects them from false blame
- Ensure incentives are aligned (better performers get recognized)

### 5.2 User Personas

**User 1: Business Owner**
- Tech skill: 8/10
- Device: Mobile + Desktop
- Pain tolerance: High
- Motivation: Direct pain relief + business survival

**User 2: Senior Mechanic (Mujju, Appi)**
- Tech skill: 5-6/10
- Device: Mobile-only
- Pain tolerance: Medium — will abandon if too complex
- Motivation: Fair recognition + protection from false blame

**User 3: Junior Mechanics (Baba, Mohan, Iqbal)**
- Tech skill: 3-4/10
- Device: Mobile-only, basic smartphones
- Pain tolerance: Low — interface must be extremely simple
- Motivation: Clear instructions + avoid getting in trouble

**User 4: Support Staff (2-3 people)**
- Tech skill: 4-5/10
- Device: Mobile + some desktop
- Pain tolerance: Medium
- Motivation: Better customer service + less chaos

### 5.3 Permissions Matrix

| Action | Support Staff | Mechanic | Senior Mechanic (Mujju) | Owner |
|--------|:---:|:---:|:---:|:---:|
| Create new service entry | Yes | No | No | Yes |
| Reassign jobs | No | No | Yes | Yes |
| View all jobs | No | No | Yes (read-only) | Yes |
| View own assigned jobs | No | Yes | Yes | Yes |
| Start/complete a job | No | Yes (own only) | Yes (own only) | Yes |
| Take before/after photos | No | Yes | Yes | Yes |
| Mark parts needed | No | Yes | Yes | Yes |
| Mark parts received | Yes | No | No | Yes |
| QC pass/fail | No | No | Yes | Yes |
| Accept payment | Yes | No | No | Yes |
| View performance rankings | No | Own stats only | Own + team overview | All details |
| View revenue/money | No | No | No | Yes |
| Add/remove mechanics | No | No | No | Yes |
| Toggle auto-assign | No | No | No | Yes |
| View customer details | Yes | Name+bike only | Name+bike only | Yes |

---

## 6. DATA MODEL: INPUTS, PROCESSING RULES, OUTPUTS

### 6.1 Inputs

| Input Data | Source | Format | Frequency |
|------------|--------|--------|-----------|
| Customer bike details | Manual entry at service desk | Text fields (name, phone, bike model, issue) | Every bike arrival |
| Calendar job assignments | Auto-assignment + manual adjustments | Job blocks with time estimates | Daily + real-time |
| Mechanic availability | Manual input + system tracking | Available/Busy status | Daily + real-time |
| Service job assignment | Auto-assignment by system | Job ID linked to mechanic | Every new service |
| Job completion status | Mechanic mobile input | Status update (In Progress/Complete/Needs Parts) | Multiple times per job |
| Daily task photos | Mechanic mobile camera | Before/after images | Job start + completion |
| Customer payment | Manual entry | Amount + payment method | At service completion |
| Parts used | Mechanic input | Part name + quantity | During service |
| Time tracking | Auto-capture | Start/end timestamps | Automatic with job status |

**Critical Input Notes:**
- Customer info exists in Zoho Books (billing) — need to check API for auto-import
- System must handle messy input from low-literacy mechanics
- Photos preferred over typing for mechanics

### 6.2 Processing Rules (IF-THEN)

1. IF new bike arrives → assign to mechanic with lowest workload AND matching skill level AND update calendar
2. IF mechanic marks job "Complete" → notify customer via WhatsApp AND calculate completion time AND update performance score AND update calendar
3. IF weekend queue > 5 bikes → prevent cherry-picking by auto-assigning in sequence AND display on calendar
4. IF mechanic takes > average time for job type → flag for review (visibility, not punishment) AND adjust future estimates
5. IF customer payment completed → update revenue tracking AND calculate mechanic incentives
6. IF job requires parts not in stock → notify owner AND put job on hold AND reassign mechanic to next job
7. IF tomorrow's workload > 8 hours for any mechanic → alert for rebalancing AND suggest redistribution
8. IF mechanic swipes "complete" → capture completion photo AND auto-start next job AND update availability
9. IF mechanic available AND urgent job arrives → auto-assign if skill match AND notify immediately

### 6.3 Edge Cases

| What if... | System should... |
|------------|------------------|
| Customer brings bike without appointment during rush | Create emergency queue slot with wait time estimate, update calendar |
| Mechanic calls in sick mid-job | Allow job reassignment with full history transfer, redistribute workload |
| Customer changes service scope mid-job | Change order process with approval workflow, adjust calendar estimates |
| Two mechanics claim same job | Use timestamps + photos to verify, flag for manual review |
| Power/internet goes down | Work offline with sync when restored, calendar updates in queue |
| Mechanic finishes faster than estimated | Auto-adjust future estimates, offer additional jobs |
| Calendar shows mechanic free but actually working | Alert to check if status updates are missing |
| Customer calls asking about timing | Calendar provides real-time estimate based on current progress |

### 6.4 Outputs

| Output | Who Sees It | When | Format |
|--------|-------------|------|--------|
| Daily mechanic calendar | Each mechanic | 8 AM + real-time | Visual calendar with photo cards |
| Tomorrow's work preview | All mechanics | End of day | Visual preview + prep checklist |
| Daily performance dashboard | Owner | 8 AM + real-time | Mobile notification + dashboard |
| Real-time job queue | All mechanics | Live updates | Wall display + mobile app |
| Visual workload balance | Owner | Real-time | Calendar heatmap |
| Customer service status | Customer | Real-time | WhatsApp messages |
| Weekly performance rankings | All team | Every Monday | Public display + individual reports |
| Calendar completion photos | Owner + customer | Job completion | Before/after with timestamps |
| Revenue & profit summary | Owner | Daily & weekly | Dashboard + WhatsApp summary |
| Parts inventory alerts | Owner + senior mechanic | When low stock | Immediate alert |

---

## 7. COMPLETE WORKFLOW: FRAME BY FRAME

### Frame 1: Customer Arrives (Support Staff Screen)

**Who:** Support Staff at front desk
**When:** Customer walks in with a bike
**Screen:** "New Service Entry" form

```
+----------------------------+
|  + NEW SERVICE ENTRY        |
|                             |
|  [Take Bike Photo]          |  <- Camera opens, snap the bike
|                             |
|  Customer Name: _________   |  <- Type or search existing
|  Phone: _________________   |  <- For WhatsApp updates
|                             |
|  Bike Model: ____________   |  <- Dropdown + search
|                             |
|  Service Type:              |
|  [Regular] [Repair]         |  <- Big colorful buttons
|  [Makeover] [Insurance]     |
|                             |
|  Issue (optional): ______   |  <- Text OR voice note
|                             |
|  Estimated Time:            |
|  [30min] [1hr] [2hr] [4hr]  |  <- Auto-suggested by type
|                             |
|  [CHECK IN BIKE]            |  <- Big green button
+----------------------------+
```

**Logic After CHECK IN:**
1. Job created with status = RECEIVED
2. System auto-assigns to mechanic with lowest workload + skill match
3. Status: RECEIVED → ASSIGNED
4. Mechanic gets push notification: "New job: [bike model] - [service type]"
5. Customer gets WhatsApp: "Your [bike] is checked in. Service #[ID]. We'll update you."
6. Job appears on Owner's dashboard
7. Owner OR Mujju can reassign if auto-assignment isn't ideal

---

### Frame 2: Owner Sees New Job (Owner Dashboard)

**Who:** Owner
**When:** Immediately after check-in (real-time)
**Screen:** Dashboard

```
+----------------------------+
|  DASHBOARD                  |
|                             |
|  Today: Rs.18,450 revenue   |
|  +23% vs last Friday        |
|                             |
|  [18 In Service] [9 Done]   |
|  [4 In Progress] [2 Parts]  |
|                             |
|  TEAM STATUS:               |
|  Mujju  Working  3/5        |
|  Appi   Working  2/4        |
|  Baba   Waiting  1/3        |  <- Parts pending
|  Iqbal  Working  2/4        |
|  Mohan  Slow     1/3        |  <- Over estimated time
+----------------------------+
```

**Owner Actions:**
- View dashboard — overall status at a glance
- Assign/reassign jobs
- View mechanic details — tap any mechanic for full day
- Flag issues — tap "slow" or "blocked" mechanic

**Team Status Colors:**
- Green = actively working
- Yellow = blocked (parts pending, waiting)
- Red = behind schedule (actual > estimated × 1.3)
- Grey = idle (should get assigned something)

---

### Frame 3: Mechanic Sees Assigned Job (Calendar)

**Who:** Mechanic (e.g., Mujju)
**When:** After assignment (push notification)
**Screen:** "Today" Calendar

```
+----------------------------+
|  MY JOBS TODAY              |
|  Progress: 2/5 done        |
|                             |
|  MORNING                    |
|  [Done] Rajesh - Splendor   |
|  [Done] Anita - Pulsar      |
|                             |
|  NEXT UP:                   |
|  [BIKE PHOTO]               |
|  Ramesh Gupta               |
|  Honda CB Shine             |
|  ENGINE ISSUE               |
|  ~90 min | Parts Ready      |
|  [START JOB]                |
|                             |
|  AFTERNOON                  |
|  Priya - RE Classic 350     |
|  Makeover | Oil Filter Wait |
+----------------------------+
```

**Mechanic Rules:**
- Can view today's jobs with bike photos
- Must start jobs in order (top to bottom) unless owner overrides
- CANNOT skip ahead, reassign, or swap jobs
- Sees ONLY their own jobs

---

### Frame 4: Mechanic Starts a Job

**Who:** Mechanic
**When:** Taps "START JOB"
**Screen:** Active Job View

```
+----------------------------+
|  ACTIVE JOB                 |
|  Timer: 00:12:34            |
|                             |
|  [BIKE PHOTO]               |
|  Ramesh Gupta               |
|  Honda CB Shine 2020        |
|  Engine Issue | ~90 min     |
|                             |
|  BEFORE PHOTO:              |
|  [TAKE PHOTO]               |  <- Mandatory
|                             |
|  PARTS USED:                |
|  [+ Add Part]               |
|  - Spark plug (1) Rs.120    |
|  - Battery (1) Rs.850       |
|                             |
|  NEED HELP?                 |
|  [Need Parts]               |  <- Pauses job
|  [Need Senior Help]         |  <- Alert to senior
|  [Pause Job]                |  <- With reason
|                             |
|  [COMPLETE JOB]             |
+----------------------------+
```

**What Happens on START:**
1. Status: RECEIVED → IN_PROGRESS
2. Timer starts automatically
3. System prompts "Take BEFORE photo" (mandatory for repair/makeover)
4. Owner dashboard updates: mechanic status = Working
5. Customer WhatsApp: "Your [bike] is now being worked on."

**"Need Parts" Flow:**
1. Status: IN_PROGRESS → PARTS_PENDING
2. Timer PAUSES (doesn't count against performance)
3. Owner notified: "[Mechanic] needs parts for [bike]"
4. Support staff sees parts request in queue
5. When parts arrive → staff marks "Received" → mechanic notified → timer resumes

**"Pause Job" Flow:**
1. Mechanic selects reason: "Customer changed scope" / "Need owner decision" / "Lunch" / "Other"
2. Timer pauses
3. Owner gets notification with reason
4. Job can be resumed or reassigned

---

### Frame 5: Mechanic Completes a Job

**Who:** Mechanic
**When:** Taps "COMPLETE JOB"
**Screen:** Completion Flow

```
+----------------------------+
|  COMPLETING JOB             |
|                             |
|  AFTER PHOTO:               |
|  [TAKE PHOTO]               |  <- Mandatory
|                             |
|  Time Taken: 1hr 12min      |
|  Estimated: 1hr 30min       |
|  FASTER than estimate       |
|                             |
|  Parts Used: 2 items        |
|  Parts Cost: Rs.970         |
|                             |
|  How was this job?          |
|  [Easy] [Normal] [Difficult]|
|                             |
|  [CONFIRM COMPLETE]         |
+----------------------------+
```

**What Happens on CONFIRM:**
1. Status: IN_PROGRESS → QUALITY_CHECK (if QC enabled) or IN_PROGRESS → READY
2. Timer stops, actual time recorded
3. After photo saved
4. Customer WhatsApp: "Your [bike] service is complete! Ready for pickup."
5. Mechanic's calendar auto-advances to next job
6. Performance score updates

---

### Frame 6: Quality Check (Owner/Senior Mechanic)

**Who:** Owner or Senior Mechanic
**When:** After mechanic marks job complete
**Screen:** QC Review

```
+----------------------------+
|  QUALITY CHECK              |
|                             |
|  Ramesh Gupta               |
|  Honda CB Shine 2020        |
|  Mechanic: Mujju            |
|  Time: 1hr 12min            |
|                             |
|  BEFORE    AFTER            |
|  [photo]   [photo]          |
|                             |
|  Parts: Spark plug, Battery |
|  Total: Rs.970 + labor      |
|                             |
|  [QC PASS]    [QC FAIL]     |
|                             |
|  If FAIL, reason: ________  |
+----------------------------+
```

**QC PASS:** Status → READY. Customer WhatsApp: "Ready for pickup! Total: Rs.[amount]"
**QC FAIL:** Status → back to IN_PROGRESS. Mechanic notified with reason. Tracked — affects quality score.

---

### Frame 7: Customer Pickup & Payment (Support Staff)

**Who:** Support Staff
**When:** Customer returns
**Screen:** Pickup & Payment

```
+----------------------------+
|  CUSTOMER PICKUP            |
|                             |
|  Ramesh Gupta               |
|  Honda CB Shine 2020        |
|                             |
|  Before -> After photos     |
|  Parts: Rs.970              |
|  Labor: Rs.500              |
|  TOTAL: Rs.1,470            |
|                             |
|  Payment Method:            |
|  [Cash] [UPI] [Card] [Credit]|
|                             |
|  [PAYMENT RECEIVED]         |
|  [SEND INVOICE VIA WHATSAPP]|
+----------------------------+
```

**Payment Logic:**
1. Staff shows before/after photos (builds trust)
2. Customer pays → staff selects method → "Payment Received"
3. Status: READY → COMPLETED
4. Revenue tracking updates
5. Mechanic job counts toward completed total
6. Customer WhatsApp: "Thank you! Service summary attached."

---

### Frame 8: End of Day Summary (Owner)

**Who:** Owner
**When:** End of business day

```
+----------------------------+
|  TODAY'S SUMMARY            |
|  Friday, 14 Feb 2026       |
|                             |
|  Revenue: Rs.24,500         |
|  Jobs Completed: 14         |
|  Avg Time: 52 min           |
|  QC Pass Rate: 93%          |
|                             |
|  TOP PERFORMER:             |
|  Mujju - 5 jobs, 96% OT    |
|                             |
|  ISSUES TODAY:              |
|  - Mohan: 2 jobs over time  |
|  - 1 QC failure (Baba)      |
|  - Parts delay: 45 min      |
|                             |
|  TOMORROW PREVIEW:          |
|  7 jobs pre-assigned        |
|  Weekend Rush Expected      |
|  2 jobs need parts prep     |
|                             |
|  [SEND SUMMARY TO WHATSAPP] |
+----------------------------+
```

---

## 8. AUTO-ASSIGNMENT ALGORITHM (HYBRID MODEL)

### How Hybrid Assignment Works

1. System **auto-assigns by default** when staff checks in a bike (no jobs sit waiting)
2. **Owner OR Mujju** can reassign any job anytime
3. Regular mechanics **CANNOT** self-assign, pick jobs, or swap jobs

### Assignment Permission Matrix

| Role | Can Assign? | Details |
|------|:---:|---------|
| Owner | Yes | Can assign, reassign, override auto-assign |
| Senior Mechanic (Mujju) | Yes | Floor manager — can reassign bad fits |
| Regular Mechanic | No | Only sees own assigned jobs |
| Support Staff | No | Only checks in bikes, system handles rest |

### Auto-Assign Algorithm

```
WHEN new job is created AND auto_assign = true:

1. GET all mechanics WHERE status = ON_DUTY
   EXCLUDE mechanics WHERE status = SICK or DAY_OFF

2. FOR EACH mechanic:
   active_jobs = COUNT jobs WHERE status IN (assigned, in_progress)
   total_hours = SUM estimated_minutes WHERE status IN (assigned, in_progress)

3. SCORE each mechanic:
   score = 100
   score -= (active_jobs x 20)          // Fewer jobs = higher score
   score -= (total_hours / 60 x 10)     // Fewer hours = higher score

   IF job.service_type = 'repair' AND mechanic.role = 'senior':
       score += 15                       // Prefer seniors for repairs

   IF job.service_type = 'makeover' AND mechanic.role = 'senior':
       score += 10                       // Prefer seniors for makeovers

   IF today = Saturday OR Sunday:        // Weekend rush mode
       IF active_jobs >= 4:
           score -= 50                   // Penalize overloaded mechanics

4. SORT mechanics BY score DESC
5. ASSIGN to mechanic with highest score
6. NOTIFY mechanic
7. UPDATE job status to ASSIGNED
```

### Reassign Flow
1. Owner/Mujju taps assigned job → "Reassign" button
2. Selects different mechanic (shows current workload)
3. Old mechanic notified: "Job reassigned to [new mechanic]"
4. New mechanic notified: "New job assigned: [bike model]"
5. If job was IN_PROGRESS → goes back to ASSIGNED for new mechanic

---

## 9. JOB STATUS FLOW

```
RECEIVED --> ASSIGNED --> IN_PROGRESS --> QUALITY_CHECK --> READY --> COMPLETED
                              |                |
                              v                v
                         PARTS_PENDING     QC_FAILED
                              |         (back to IN_PROGRESS)
                              v
                        (parts arrive)
                              |
                              v
                         IN_PROGRESS
```

### Status Colors (Consistent Everywhere)

| Status | Color | Icon |
|--------|-------|------|
| RECEIVED | Grey | New, not started |
| ASSIGNED | Blue | Assigned, not started yet |
| IN_PROGRESS | Orange | Mechanic working |
| PARTS_PENDING | Red | Blocked, waiting for parts |
| QUALITY_CHECK | Purple | Done, being reviewed |
| READY | Green | Ready for pickup |
| COMPLETED | Green (checkmark) | Paid and gone |

### Priority Levels
- **Urgent** = Red border (engine issues, customer waiting)
- **Standard** = Orange/Yellow border (regular service)
- **Completed** = Green border (done)

---

## 10. WEEKEND RUSH MODE

**Triggers:** Saturday OR Sunday AND waiting queue > 5 bikes

**What Changes:**
1. Auto-assign becomes MANDATORY (owner can't disable)
2. Jobs assigned in ARRIVAL ORDER (no picking by difficulty)
3. Estimated times reduced by 15% (push for faster work)
4. Owner gets alerts every 30 minutes with queue status
5. "Express Service" option appears for quick fixes (<30 min)
6. Customer wait time shown prominently on dashboard

---

## 11. NOTIFICATION MATRIX

| Event | Owner | Mechanic | Support Staff | Customer (WhatsApp) |
|-------|:---:|:---:|:---:|:---:|
| Bike checked in | Yes | No | No | "Bike checked in, service #ID" |
| Job assigned | No | "New job assigned" | No | No |
| Mechanic starts job | No | No | No | "Being worked on now" |
| Parts needed | "Parts needed" | No | "Order parts" | No |
| Parts received | No | "Parts ready, resume" | No | No |
| Job completed | Yes (if QC needed) | No | No | No |
| QC passed | No | No | "Ready for pickup" | "Ready for pickup!" |
| QC failed | No | "QC failed, fix" | No | No |
| Payment received | Yes | No | No | "Thank you!" receipt |
| Mechanic over time | "Over estimate" | No | No | No |
| Queue > 5 bikes | "Rush mode!" | No | No | No |
| Customer waiting > 30 min | Yes | No | Yes | No |

---

## 12. CALENDAR FEATURE SPECIFICATIONS

### For Each Mechanic

**Today's Board (Kanban):**
- Jobs shown as photo-based cards: To Do → In Progress → Quality Check → Complete
- Priority indicators (urgent, standard, follow-up)
- Parts availability status for each job
- Time shown as "Morning" and "Afternoon" blocks (not specific hours)

**Tomorrow's Preview:**
- Pre-assigned jobs with parts availability
- Estimated workload hours
- Required parts preparation checklist
- Customer appointment confirmations

**Weekly Overview:**
- Total workload distribution per day
- Peak days identification
- Available capacity for new jobs
- Performance trending (completed vs assigned)

### Visual Design for Low-Literacy
- Color-coded job types (Red=urgent, Yellow=standard, Green=completed)
- Icon-based communication (wrench=repair, refresh=service, lightning=quick fix)
- Simple time blocks: Morning/Afternoon instead of hours
- Visual progress bars instead of percentages
- Actual bike photos instead of text descriptions

### Calendar Integration with Performance
- Directly feeds into performance tracking
- Auto-updates completion times
- Identifies bottlenecks and delays
- Enables fair workload distribution

---

## 13. UI/UX DESIGN: LOW-LITERACY PRINCIPLES

Based on research with 775+ million people with reading difficulties:

### Core Principle 1: Text-Free Navigation
- Use universally recognized icons (gear=service, person=customer, chart=reports)
- Photo-based job cards showing actual bikes
- Color coding replaces text explanations
- Visual progress indicators using circles and bars

### Core Principle 2: Muscle Memory & Familiar Patterns
- Green ALWAYS = "Complete/Good" (traffic light psychology)
- Red ALWAYS = "Urgent/Problem" (universal danger signal)
- Blue = "Information/Neutral" (professional, calm)
- Same button positions always ("Complete Job" always bottom-right)

### Core Principle 3: Linear Workflow (Not Hierarchical)
- Single-screen job completion — everything on one page
- Maximum 3 levels deep in any menu
- Breadcrumb navigation with pictures, not text

### Familiar Smartphone Gestures
- Swipe left = Complete job (like marking done in WhatsApp)
- Swipe right = More details (like opening message)
- Double tap = Urgent/Priority (like Instagram heart)
- Long press = Options menu (universal Android/iOS pattern)

### Workshop Analogies
- Red toolbox icon = Problems/Issues
- Green checkmark = Job done
- Yellow warning triangle = Needs attention
- Blue information circle = Customer details

---

## 14. COLOR PSYCHOLOGY FOR WORKSHOP

### Primary Color: Blue (#2563eb)
- Lowers heart rate and blood pressure, improves concentration
- Use: Main interface background, primary buttons, information
- Why: Promotes focus during detailed repair work

### Secondary Color: Green (#16a34a)
- Connects to nature, promotes calmness, reduces eye fatigue
- Use: Completion indicators, success messages, break reminders
- Why: Ideal for extended work periods

### Accent Color: Orange (#ea580c)
- Boosts click-through rates by 24%, draws attention
- Use: Priority jobs, urgent notifications, main action buttons
- Why: Draws attention to important actions

### Warning Color: Red (#dc2626)
- Creates urgency and immediate engagement
- Use: Overdue jobs, safety alerts, critical issues ONLY
- Why: Universal danger/urgency signal

### Colors to AVOID
- Yellow backgrounds — tiring on eyes, confrontational
- Purple — luxury association, inappropriate for workshop
- Pure black on white (#000 on #fff) — causes eye strain
- Instead use: #1f2937 text on #f9fafb background

---

## 15. MOBILE-FIRST DESIGN STRATEGY

### Screen Space Allocation
- 60% — Large visual elements (photos, icons)
- 30% — Color coding and progress indicators
- 10% — Minimal essential text (max 2-3 words per button)

### Design for 12% English Comprehension
- Audio feedback confirms actions
- Photo-based job cards
- Icon-driven navigation
- Color-coded status throughout

### Design Implications by User Type
- **Mechanics:** Zero training required, intuitive immediately
- **All functions via photos, colors, icons — minimal text**
- **Audio prompts in local language for confirmation**
- **Error prevention rather than correction** (mechanics can't fix mistakes)
- **Manager override available for all mechanic actions**

---

## 16. INTEGRATION POINTS

| System | Data Needed | Direction | Priority |
|--------|-------------|-----------|----------|
| Zoho Books (billing) | Customer data, payment records | IN - Import | Must-have |
| WhatsApp Business API | Service status notifications | OUT - Export | Must-have |
| SMS Gateway | Backup notifications | OUT - Export | Nice-to-have |
| Inventory Management | Parts availability | IN - Check stock | Should-have |
| Google Calendar | Block mechanic time | OUT - Export | Nice-to-have |

**Key Notes:**
- System CAN work WITHOUT integrations initially — all enhance but don't block
- Need to research: Zoho API access, WhatsApp Business API
- WhatsApp API approval can take 2-4 weeks

---

## 17. TECHNICAL CONSTRAINTS & DEVICE REQUIREMENTS

### Must-Have
- [x] Works offline — Critical for internet outages
- [x] Mobile-first — Mechanics use phones only
- [x] Desktop version — Owner needs dashboard for analysis
- [x] Android primarily — Most mechanics use Android
- [x] iOS secondary, Web for desktop

### Device Requirements
- Android 8.0+ (most common in India)
- 2GB RAM minimum (budget smartphones)
- Works on 3G/4G networks (unstable internet common)
- Offline data sync when connection restored

### Performance Targets
- App startup: < 5 seconds
- Job status update: < 2 seconds
- Photo upload: < 10 seconds
- Sync after offline: < 30 seconds
- Must handle 500+ service records without slowing down

### Security Requirements
- Customer data encrypted at rest
- Local backup capability
- Manager-level data access controls
- Audit trail for who changed what
- Role-based access control (4 roles)

---

## 18. USER BEHAVIOR & FRICTION TOLERANCE

### Usage Reality

| Question | Answer |
|----------|--------|
| How often will owner use? | Multiple times per day |
| Max actions per day tolerable | 2-3 actions |
| Where used? | Mix of phone + desktop |
| If skip a day? | System should remind aggressively |

### Friction Tolerance Map

| Scenario | Acceptable Friction |
|----------|-------------------|
| Mechanic job status updates | **ZERO** — Must be < 5 seconds (swipe gesture) |
| Daily performance review | **LOW** — 5 minutes max |
| Initial setup/onboarding | **MEDIUM** — 1 hour training if saves daily headaches |
| Fixing data mistakes | **ZERO** — Must undo immediately |
| Customer check-ins | **LOW** — 30-second process max |
| Weekly planning | **MEDIUM** — 15 minutes max |

### Lazy User Test Results

| Question | Owner | Mechanics |
|----------|-------|-----------|
| Enter data daily? | YES | MAYBE — need auto-capture or photo entry |
| Remember to open app? | YES | NO — need aggressive notifications |
| Keep data clean? | YES | NO — system must handle messy input |

**Critical Insight:** Owner is disciplined, mechanics are not. System must be mechanic-proof with automatic data validation.

---

## 19. FEATURE PRIORITY MATRIX

### Must-Have (MVP — Can't Work Without)

| Feature | User Story |
|---------|-----------|
| Visual Calendar with Job Cards | "As mechanic, I see today's jobs with bike photos in < 5 seconds" |
| Swipe to Complete Job | "As mechanic, I mark job done with single swipe" |
| Auto Job Assignment | "As owner, jobs auto-assign to prevent weekend chaos" |
| Real-time Performance Dashboard | "As owner, I see who's working vs coasting instantly" |
| Photo-based Job Cards | "As mechanic, I see actual bike photo, not confusing text" |
| Offline Functionality | "As user, system works even when internet fails" |
| WhatsApp Customer Updates | "As customer, I get updates on WhatsApp automatically" |

### Should-Have (Makes It Significantly Better)

| Feature | Can Launch Without? |
|---------|-------------------|
| Weekly Performance Rankings | YES — can track manually initially |
| Parts Inventory Integration | YES — can check manually initially |
| Voice Commands (Local Language) | YES — photos sufficient initially |
| Customer Rating System | YES — collect verbally initially |
| Predictive Scheduling | YES — manual scheduling works initially |

### Nice-to-Have (Add Later)

| Feature | Priority (1-10) |
|---------|:-:|
| Multi-location Support | 8 |
| Automated Parts Ordering | 7 |
| Advanced Analytics Dashboard | 6 |
| Customer Loyalty Points | 5 |
| Mechanic Training Videos | 4 |
| Social Media Integration | 3 |

### Will-NOT-Have (Explicitly Excluded)

| Feature | Reason |
|---------|--------|
| Complex CRM with lead management | Too complex, not core pain |
| Email marketing campaigns | WhatsApp sufficient |
| Accounting/invoicing system | Zoho handles this |
| Bike diagnostic tools | Hardware requirement, different problem |
| Multi-language UI | Visual interface reduces need |
| Video calling support | Unnecessary complexity |

---

## 20. SYSTEM DEATH SCENARIOS & PREVENTION

| Death Scenario | Probability | Prevention Strategy |
|----------------|:-:|-------------------|
| **Mechanics refuse to use (too complex)** | **9/10** | Photo-based interface, zero text, gestures only, zero-training required, manager can override |
| **Internet outages break system** | **8/10** | Offline-first architecture, all critical functions work without internet, data queues for sync |
| **Owner goes back to book/pen** | **7/10** | Make digital genuinely faster, one-tap access, 30-day forced commitment with no fallback |
| **Customer complaints about slowness** | **6/10** | Sub-3-second response times, visual loading indicators |
| **Data corruption loses everything** | **4/10** | Real-time backup, local storage redundancy |

### Prevention Details for Top 3

**Mechanic Resistance (9/10):**
- Zero-training required interface
- Photo job cards instead of text
- Swipe gestures match muscle memory (WhatsApp-like)
- Immediate visual feedback for actions
- Manager can override any mechanic action

**Internet Outages (8/10):**
- Offline-first architecture
- All critical functions work without internet
- Data queues for sync when connection returns
- Local photo storage with cloud backup
- Visual indicators for sync status

**Owner Regression (7/10):**
- Make digital genuinely faster than manual
- One-tap access to all critical info
- Visual dashboards better than mental tracking
- 30-day forced usage with no fallback

---

## 21. SUCCESS METRICS & TIMELINE

### Quantitative Metrics

| Metric | Current | Target | Improvement |
|--------|---------|--------|:-:|
| Time on team management | 8 hrs/week | 2 hrs/week | 75% |
| Weekend customers lost | 2-3/weekend | 0/weekend | 100% |
| Service completion accuracy | Unknown | 95%+ on-time | — |
| Blame game incidents | Multiple daily | 0/week | 100% |
| Revenue leakage | ₹92,000/month | ₹20,000/month | 78% |
| Mechanic job satisfaction | Unknown | 8/10 | — |

### Qualitative Targets
- Feel less stressed about weekend operations
- Trust system more than manual tracking
- Mechanics use without constant supervision
- Customers complain less about wait times
- Team conflicts reduce significantly
- Focus on business growth instead of firefighting

### Success Timeline

| Milestone | Target Date | Success Criteria |
|-----------|-------------|------------------|
| MVP (Calendar + Job Assignment) | Week 6 (Mar 24, 2026) | Mechanics view calendar, mark jobs, owner assigns |
| Performance Tracking | Week 9 (Apr 14, 2026) | All metrics tracking, visual rankings working |
| Communication Integration | Week 11 (Apr 28, 2026) | WhatsApp notifications automated |
| Self-Dependency Test Start | Week 13 (May 12, 2026) | Daily system use, eliminated book/pen |
| Full Team Adoption | Week 15 (May 26, 2026) | All mechanics using without supervision |
| Market Ready | Week 20 (Jul 1, 2026) | System proven, ready to sell to others |

---

## 22. PERFORMANCE TRACKING SYSTEM

### Metrics Tracked Per Mechanic
- Jobs completed (daily/weekly/monthly)
- On-time completion rate (actual vs estimated)
- Quality score (QC pass rate)
- Average completion time per service type
- Parts requests frequency
- Customer ratings (future)
- Incentive earned

### Performance Display
- **Weekly Rankings:** Bar chart showing all mechanics with jobs + on-time %
- **Workload Balance:** Heatmap showing capacity per mechanic
- **Trends:** Comparison vs previous week/month
- **Mechanic's Own View:** Jobs count, on-time %, QC rate, incentive earned

### Performance-Based Alerts
- Mechanic consistently finishes early → auto-adjust future estimates, offer more jobs
- Mechanic consistently late → flag for review (not punishment, visibility)
- Workload imbalance detected → suggest rebalancing
- QC failure → track pattern, provide feedback

---

## 23. OFFLINE MODE BEHAVIOR

### When Internet Is Down
1. App continues working normally from local data
2. All actions (start job, complete job, photos) saved locally
3. Yellow banner at top: "Offline — changes will sync when connected"
4. NO WhatsApp messages sent (queued for when online)
5. NO real-time updates between devices (each works independently)

### When Internet Returns
1. All queued changes sync to server
2. If CONFLICT (same job modified on two devices):
   - Most recent timestamp wins
   - Owner notified of conflict for review
3. Queued WhatsApp messages sent
4. All dashboards refresh

---

## 24. QUALITY CHECK (QC) WORKFLOW

**When Enabled (Repair, Makeover):**
1. Mechanic marks job complete → status = QUALITY_CHECK
2. Senior mechanic/owner reviews:
   - Before/after photos side-by-side
   - Parts used and costs
   - Time taken vs estimated
3. QC PASS → status = READY → customer notified
4. QC FAIL → status = back to IN_PROGRESS → mechanic notified with reason → tracked in quality score

**When Skipped (Regular Service, Minor Jobs):**
- Job goes directly: IN_PROGRESS → READY

---

## 25. INITIAL SETUP REQUIREMENTS

**Owner Must Configure Before Day 1:**
1. Mechanic list (name, phone, role: senior/junior, photo)
2. Service types + default prices + default estimated times
3. Common parts list with prices
4. Business hours
5. Auto-assign ON/OFF preference
6. QC required ON/OFF preference
7. WhatsApp message templates
8. Owner's phone for notifications

**This is a ONE-TIME SETUP screen that runs before the app is usable.**

---

## 26. IMPLEMENTATION ROADMAP (16 WEEKS)

### Phase 1: Foundation (Weeks 1-2)
- Developer: Understand workflow, propose technical architecture
- Owner: Provide real service data samples, bike photos, current process videos
- Deliverable: Technical architecture document + UI mockups

### Phase 2: Core Calendar (Weeks 3-4)
- Developer: Build visual calendar with photo-based job cards
- Owner: Test calendar with 2 mechanics, provide feedback
- Deliverable: Working calendar with basic job assignment

### Phase 3: Job Assignment Logic (Weeks 5-6)
- Developer: Implement auto-assignment rules, prevent cherry-picking
- Owner: Test weekend scenarios, validate assignment logic
- Deliverable: Smart job distribution system

### Phase 4: Performance Tracking (Weeks 7-8)
- Developer: Add time tracking, completion metrics, visual dashboards
- Owner: Compare system data vs manual observations
- Deliverable: Real-time performance visibility

### Phase 5: Mobile Optimization (Weeks 9-10)
- Developer: Perfect mobile interface, add swipe gestures
- Owner: Test with all mechanics, identify usability issues
- Deliverable: Mechanic-friendly mobile app

### Phase 6: Communication Integration (Weeks 11-12)
- Developer: WhatsApp Business API, customer notifications
- Owner: Test customer communication flow
- Deliverable: Automated customer updates

### Phase 7: Polish & Training (Weeks 13-15)
- Developer: Bug fixes, performance optimization, offline capability
- Owner: Full team training, process documentation
- Deliverable: Production-ready system

### Phase 8: Post-Launch (Week 16+)
- Developer: Monitor performance, fix issues
- Owner: Track success metrics, plan enhancements

---

## 27. TESTING PROTOCOL

### Every Friday: Reality Testing Session

**Owner Will:**
1. Use system like enemy user:
   - Enter wrong data intentionally
   - Skip required steps
   - Try to break workflow logic
   - Test during busy weekend conditions

2. Specific Bharath Cycle Hub Tests:
   - Assign 10+ jobs during weekend rush simulation
   - Test with actual mechanic phone skills (basic Android)
   - Try all functions during internet outage
   - Load real bike photos and customer data

3. Report findings:
   - What broke and why it matters
   - Where mechanics got confused
   - What slowed down actual work

**Developer Response Rules:**
- CANNOT say: "Users won't do that"
- MUST reply: "How do we make that impossible or handle it gracefully?"

**Weekly Success Criteria:**
- System noticeably better than book/pen method
- Mechanics complete all tasks without asking questions
- No data loss during stress testing

### Iteration Quality Checklist

| Criteria | Target |
|----------|--------|
| Complete core task in < 2 mins | Yes |
| Works on mechanic's phone | Yes |
| Works without internet | Yes |
| Handles bad data gracefully | Yes |
| User feels less stressed | Yes |

---

## 28. 30-DAY DEPENDENCY TEST

**Starting: May 15, 2026**

### Rules
1. Use system daily for ALL service management (no exceptions)
2. Ban ALL previous methods (no book/pen, no verbal-only assignments)
3. Track: Days skipped [0 target]
4. Track: Workarounds built [0 target]
5. Track: Panic level if system goes down [10/10 target]

### Bharath-Specific Test
- All job assignments MUST go through system
- All performance tracking via system only
- All customer communication via system
- Weekend rush management via system only

### Pass Criteria
- Zero days skipped
- Zero fallback to book/pen
- Would panic if system disappeared
- Team using without supervision

### Fail Criteria
- Skipped > 2 days OR built workarounds OR don't care if it dies
- If FAIL → back to Death Scenarios to redesign

---

## 29. MARKET TRANSITION & SAAS STRATEGY

### Market Validation (After Passing 30-Day Test)

| Persona | Same Pain? | Same Frequency? | Accurate Proxy? |
|---------|:---:|:---:|:---:|
| Small bicycle retailers (5-15 mechanics) | Yes | Yes | Good |
| Motorcycle repair shops | Yes | Yes | Good |
| Auto service centers (small) | Yes | Maybe | Fair |
| Appliance repair services | Yes | Yes | Fair |

**Market Size:** ~5,000 bicycle retailers in India with 5+ mechanics
**Target:** 500 early adopters

### Sellability Check (Current: 3/5 YES)

| Question | Answer |
|----------|--------|
| Would I pay for this? | YES — ₹3,000/month |
| Would I recommend without explaining? | TBD — must test |
| Would I panic if disappeared? | YES — would pay ₹50K to restore |
| Can stranger use in < 5 min? | NO — needs 30-min setup (must fix) |
| Solves ONE problem well? | YES — service team management only |

### Business Model

**Primary: SaaS (Monthly Subscription)**
- Target price: ₹2,500/month (5-10 mechanics)
- Customer Acquisition Cost (CAC): ₹15,000
- Customer Lifetime Value (LTV): ₹90,000 (3 years)
- LTV/CAC Ratio: 6:1 (exceeds 3:1 minimum)

**Secondary: Tool + Service**
- Software: ₹2,500/month
- Setup & training: ₹25,000 one-time
- Monthly support: ₹5,000/month (optional)

### Revenue Projections
- Year 1: 20 customers × ₹2,500 = ₹50,000/month
- Year 2: 100 customers × ₹2,500 = ₹2,50,000/month
- Year 3: 300 customers × ₹2,500 = ₹7,50,000/month

### Market Entry Strategy
1. Perfect system at Bharath Cycle Hub (6 months)
2. Pilot with 3 local bicycle shops (3 months)
3. Regional expansion via word-of-mouth (12 months)

### What Must Change for Market
- Remove "Bharath Cycle Hub" branding → Generic "Service Management"
- ₹2459 makeover → Configurable service packages
- Pre-loaded bicycle categories → Industry-agnostic setup wizard
- Simplify onboarding to < 5 minutes

---

## 30. INDUSTRY RESEARCH

### Honda's Service Management
- **i-HDS** (Honda Diagnostic System) — browser-based diagnostics
- **SIS** subscription for step-by-step diagnostics
- **ServiceExpress** for aftermarket service information
- Key: Diagnostic integration, subscription model, browser-based

### Royal Enfield's Implementation
- **Microsoft Dynamics 365** as core platform
- Tablet-based instant job card creation with estimates
- **Excellon Software DMS** for dealer management
- Key: Instant estimates, service history integration, mobile security

### Powersports Industry Standards
- Labor time guides (20-40% gross profit increases)
- Automated messaging systems
- Mobile device integration
- Real-time inventory and supplier connections

### Bharath Cycle Hub's Competitive Advantage
- **Simpler** than enterprise systems (5-10 person teams, not enterprise)
- **Cost effective** — one-time dev vs ongoing subscriptions
- **Culturally adapted** — designed for Indian mechanic literacy levels
- **Visual-first** — most software is text-heavy, ours is image/color-based
- **Offline capable** — works during internet outages (common issue)

---

## 31. BUDGET & PAYMENT SCHEDULE

### Development Budget

| Category | Amount |
|----------|--------|
| MVP through full system | ₹3,00,000 |
| Monthly hosting/maintenance | ₹5,000/month |
| Integrations/APIs (WhatsApp, Zoho) | ₹20,000 |
| **Total Year 1** | **₹3,80,000** |

### Payment Schedule

| Milestone | Percentage | Amount |
|-----------|:-:|--------|
| Project start | 40% | ₹1,20,000 |
| MVP delivery | 40% | ₹1,20,000 |
| Final completion | 20% | ₹60,000 |

### ROI Projection

| Period | Calculation |
|--------|------------|
| Investment | ₹3,00,000 dev + ₹60,000 annual hosting = ₹3,60,000 |
| Month 1-4 savings | ₹92,000 × 4 = ₹3,68,000 (investment recovered) |
| Year 1 savings | ₹11,04,000 loss prevention |
| Year 2+ | Pure profit + potential SaaS revenue |
| **Break-even** | **4 months after launch** |

### Timeline Risk Factors
- Mechanic training time may extend adoption
- WhatsApp API approval can take 2-4 weeks
- Photo storage infrastructure needs testing

---

## 32. SAMPLE DATA & WORKFLOWS

### Sample Service Records

```
Customer: Rajesh Kumar
Bike: Hero Splendor Plus 2022
Service Type: Regular Service
Issue: Chain noise, brake adjustment needed
Mechanic Assigned: Mujju
Estimated Time: 45 minutes
Parts Needed: Chain lube, brake pads
Status: In Progress
Customer Phone: +91-9876543210
```

```
Customer: Priya Sharma
Bike: Royal Enfield Classic 350
Service Type: Complete Makeover (Rs.2459 package)
Issue: Full restoration requested
Mechanic Assigned: Appi + Baba
Estimated Time: 4 hours
Parts Needed: Multiple (engine oil, filters, cleaning supplies)
Status: Parts Pending
Customer Phone: +91-9876543211
```

```
Customer: Ramesh Gupta
Bike: Honda CB Shine 2020
Service Type: Repair
Issue: Engine starting problem, electrical check
Mechanic Assigned: Mujju
Estimated Time: 90 minutes
Parts Needed: Spark plug, battery check
Status: Quality Check
Customer Phone: +91-9876543212
```

```
Customer: Anita Patel
Bike: Bajaj Pulsar 150
Service Type: Insurance Service (Free 1-year)
Issue: 6-month service due
Mechanic Assigned: Iqbal
Estimated Time: 30 minutes
Parts Needed: Oil, air filter
Status: Ready for Pickup
Customer Phone: +91-9876543213
```

### Data Patterns
- Customer names: First + Last name format
- Phone numbers: Indian mobile (+91) format
- Service types: 4 categories (Regular, Makeover, Repair, Insurance)
- Time estimates: 30 minutes to 4+ hours
- Status flow: Received → Parts Check → In Progress → Quality Check → Ready

### Current Workflow (AS-IS)

1. Customer arrives with bike → Staff writes details in physical book
2. Owner assigns verbally → "Mujju, take this Royal Enfield"
3. Mechanic works → No time tracking, no status updates
4. Parts needed → Mechanic tells owner verbally
5. Work completed → Mechanic brings bike for check (sometimes)
6. Customer pays → Enter in Zoho, hand over bike
7. Problems arise → Blame game: "Who worked on this bike?"

### Desired Workflow (TO-BE)

1. Customer arrives → Staff takes photo, enters details in < 30 seconds
2. System auto-assigns → Based on workload and skill match
3. Mechanic sees assignment on mobile → Photo-based job card
4. Work begins → Mechanic swipes "start", timer begins
5. Parts needed → System checks inventory, alerts owner
6. Progress updates → Customer gets WhatsApp automatically
7. Work completed → Mechanic swipes "complete", before/after photos
8. Quality check → Senior reviews before pickup
9. Customer pickup → System shows photos, auto-generates invoice
10. Performance tracking → All data automatically tracked

---

## 33. TECHNICAL ARCHITECTURE & API SPECIFICATIONS

### 33.1 Recommended Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Progressive Web App (HTML5, CSS3, Vanilla JS or lightweight framework) | Mobile-first UI, installable on Android/iOS |
| **Client-side Database** | IndexedDB | Offline data persistence, fast local reads |
| **Cloud Database** | Firebase / Supabase | Cloud sync, real-time updates, user auth |
| **Offline Support** | Service Worker | Asset caching, background sync, push notifications |
| **Customer Notifications** | WhatsApp Business API | Automated service status updates to customers |
| **Billing Integration** | Zoho Books API | Import customer data, sync payment records |

**Why PWA over Native App:**
- Single codebase for Android, iOS, and desktop
- No app store approval delays (critical for fast iteration)
- Automatic updates without user action
- Works on low-end Android devices (2GB RAM, Android 8.0+)
- Installable via browser — feels like native app
- Smaller download size than native apps

### 33.2 Database Schema

**IndexedDB Object Stores:**

#### jobs (keyPath: id)
Indexes: `status`, `mechanicId`, `date`

| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Unique job identifier |
| customerId | String | Reference to customers store |
| customerName | String | Denormalized for quick display |
| customerPhone | String | For WhatsApp notifications |
| bike | String | Bike model and year |
| serviceType | String | regular, makeover, repair, insurance |
| issue | String | Customer-reported issue description |
| mechanicId | String | Assigned mechanic reference |
| status | String | received, assigned, in_progress, parts_pending, quality_check, ready, completed |
| priority | String | urgent, standard |
| estimatedMin | Number | Estimated service time in minutes |
| actualMin | Number | Actual time taken (auto-calculated) |
| date | String (ISO) | Scheduled service date |
| timeBlock | String | morning, afternoon |
| partsUsed | Array | List of {partId, name, qty, price} |
| partsNeeded | Array | List of {partId, name, qty} — pending parts |
| totalParts | Number | Total parts cost in rupees |
| laborCost | Number | Labor charge in rupees |
| totalCost | Number | Parts + labor total |
| startedAt | String (ISO) | Timestamp when mechanic started |
| completedAt | String (ISO) | Timestamp when job completed |
| qcStatus | String | pass, fail, pending, skipped |
| qcFailReason | String | Reason if QC failed |
| paymentMethod | String | cash, upi, card, credit |
| paidAt | String (ISO) | Payment timestamp |
| difficulty | String | easy, normal, difficult (mechanic-reported) |
| createdAt | String (ISO) | Job creation timestamp |

#### mechanics (keyPath: id)

| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Unique mechanic identifier |
| name | String | Display name |
| phone | String | Mobile number |
| role | String | senior, junior |
| pin | String (hashed) | 4-digit login PIN |
| photo | Blob | Profile photo |
| status | String | on_duty, off_duty, sick, day_off |
| skills | Array | List of service types the mechanic can handle |
| createdAt | String (ISO) | Record creation timestamp |

#### customers (keyPath: id)
Indexes: `phone` (unique)

| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Unique customer identifier |
| name | String | Customer full name |
| phone | String | Mobile number (unique, used for WhatsApp) |
| bikes | Array | List of {model, year, registrationNo} |
| serviceHistory | Array | List of past job IDs |
| createdAt | String (ISO) | First visit timestamp |

#### parts (keyPath: id)

| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Unique part identifier |
| name | String | Part name |
| price | Number | Unit price in rupees |
| stock | Number | Current quantity in inventory |
| minStock | Number | Reorder threshold |
| category | String | Part category (engine, brake, electrical, etc.) |

#### config (keyPath: key)

| Field | Type | Description |
|-------|------|-------------|
| key | String | Configuration key (e.g., autoAssign, qcEnabled, businessHours) |
| value | Any | Configuration value |

#### syncQueue (keyPath: id)

| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Unique queue entry identifier |
| action | String | create, update, delete |
| store | String | Target store name (jobs, mechanics, etc.) |
| data | Object | Payload to sync |
| timestamp | String (ISO) | When the action was queued |
| retries | Number | Number of sync attempts |

### 33.3 API Endpoints (Future Backend)

These endpoints define the REST API for when the system transitions from local-only to cloud-synced architecture.

#### Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/jobs` | Create a new job (from service check-in) |
| GET | `/api/jobs?date=&status=&mechanicId=` | List jobs with optional filters by date, status, mechanic |
| PATCH | `/api/jobs/:id/status` | Update job status (e.g., in_progress, completed) |
| POST | `/api/jobs/:id/assign` | Assign or reassign a job to a mechanic |
| POST | `/api/jobs/:id/qc` | Submit QC pass/fail with optional reason |
| POST | `/api/jobs/:id/payment` | Process payment (method, amount) |

#### Mechanics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mechanics` | List all mechanics with current workload stats |

#### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Dashboard summary (revenue, job counts, team status) |

#### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/whatsapp/send` | Send WhatsApp notification to customer |

**Authentication:** All endpoints require a valid JWT token in the `Authorization` header. Role-based permissions enforce access control per endpoint.

### 33.4 PWA Architecture

**Offline-First Strategy:**
- All data stored locally in IndexedDB first, then synced to cloud
- App is fully functional without internet — no features disabled offline
- Service Worker intercepts all network requests and applies caching strategies

**Service Worker Caching Strategy:**

| Resource Type | Strategy | Rationale |
|---------------|----------|-----------|
| Static assets (HTML, CSS, JS, icons) | Cache-first | Fastest load times, updates on next visit |
| API responses (jobs, mechanics) | Network-first | Fresh data when online, cached fallback offline |
| Photos (bike images) | Cache-first with background update | Large files, avoid re-downloading |
| Fonts and third-party assets | Cache-first | Rarely change, save bandwidth |

**Background Sync:**
- When offline, all create/update/delete actions are queued in the `syncQueue` IndexedDB store
- When connectivity returns, Service Worker processes the queue in order (FIFO)
- Conflict resolution: most recent timestamp wins, owner notified of conflicts
- Failed syncs retry up to 3 times with exponential backoff

**Push Notifications (via Service Worker):**
- Mechanic receives push when new job is assigned
- Owner receives push for QC requests, over-time alerts, rush mode triggers
- Support staff receives push for parts requests and pickup-ready jobs
- Notifications work even when app is not open (background delivery)

### 33.5 Security Model

**Role-Based Access Control (RBAC):**

| Role | Access Level | Auth Method |
|------|-------------|-------------|
| Owner | Full system access, all data, all actions | PIN + optional password |
| Senior Mechanic | View all jobs, own jobs, reassign, QC | 4-digit PIN |
| Junior Mechanic | Own assigned jobs only | 4-digit PIN |
| Support Staff | Customer data, check-in, payment | 4-digit PIN |

**PIN-Based Login:**
- Simple 4-digit PIN for mechanics (no complex passwords)
- PIN stored as salted hash in local database
- Auto-lock after 5 minutes of inactivity
- Owner can reset any mechanic's PIN

**JWT Token Authentication (for API):**
- Tokens issued on successful PIN verification
- Tokens include role and mechanic ID
- Short expiry (24 hours) with refresh token rotation
- Tokens stored securely in memory (not localStorage)

**Data Protection:**
- Customer personal data (name, phone) encrypted at rest in IndexedDB
- All API communication over HTTPS (TLS 1.2+)
- No sensitive data in URL parameters
- Photo storage with access control (only assigned mechanic + owner can view)

**Audit Trail:**
- Every status change logged with: who, what, when, previous value
- Job reassignments logged with reason
- QC pass/fail decisions logged with reviewer identity
- Payment transactions logged with method and timestamp
- Audit logs are append-only (cannot be modified or deleted)

---

## 34. PROTOTYPE REFERENCE

A working interactive prototype exists in the `/prototype/` folder of this repository. This prototype demonstrates the core user experience and data flow before full development begins.

### What the Prototype Includes

- **All 3 user roles** — Staff (service check-in and payment), Mechanic (job management), and Owner (dashboard and oversight)
- **Complete job lifecycle** — From customer check-in through assignment, work progress, QC, payment, and completion
- **Visual calendar** — Photo-based job cards with status colors and priority indicators
- **Auto-assignment demonstration** — Workload-balanced job distribution logic
- **Performance dashboard** — Mechanic stats, daily revenue, and team status overview
- **Role-based views** — Each role sees only the screens and actions permitted by the permissions matrix

### Technical Implementation

- **Data persistence:** Uses IndexedDB for local data storage (same technology planned for production)
- **Sample data:** Pre-loaded with 10 jobs, 5 mechanics, and 10 customers for realistic testing
- **No server required:** Runs entirely in the browser with no backend dependencies
- **Mobile-responsive:** Designed for mobile-first testing on actual mechanic devices

### How to Test

1. Open `prototype/index.html` in any modern browser (Chrome, Firefox, Edge, Safari)
2. Select a user role from the login screen
3. Navigate through the workflow screens to experience each role's perspective
4. All data is stored locally in IndexedDB and persists between browser sessions
5. To reset sample data, clear the browser's IndexedDB storage for the prototype

### Purpose

This prototype serves as:
- A visual reference for the developer during implementation
- A testing tool for the business owner to validate workflows before development
- A communication aid for gathering feedback from mechanics before the real system is built
- A proof of concept for the offline-first, IndexedDB-based architecture

---

## DOCUMENT SIGN-OFF

**Business Owner:**
- Date: February 14, 2026
- "I confirm this document accurately represents what I need built."

**Developer:**
- Date: [To be filled]
- "I confirm I understand these requirements and will build accordingly."

---

**This is the single source of truth for the Bharath Cycle Hub Service Management System. All previous documents in `files/`, `files (1)/`, and `files nnn/` folders are superseded by this master document.**
