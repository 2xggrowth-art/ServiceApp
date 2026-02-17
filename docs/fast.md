# BCH Service App - Fast Reference Guide

## 1. Recent Changes & Optimizations
We have transformed the initial prototype into a production-ready **Progressive Web App (PWA)**.

- **Modular Architecture:**
  - **CSS Separation:** All styles moved from `index.html` to `css/app.css` for faster styling updates and caching.
  - **JS Separation:** Logic moved to `js/app.js` and data layer to `js/db.js` for better maintainability.
- **Offline-First Core:**
  - **Service Worker (`sw.js`):** Updated to cache specific files (`app.js`, `app.css`, `db.js`) ensuring the app works 100% without internet.
  - **Manifest (`manifest.json`):** Configured for "Add to Home Screen" functionality on Android/iOS.
- **Project Structure:**
  - Renamed `prototype` to `app` (Production Build).
  - Added `package.json` for standard `npm start` execution.
  - Added scalable SVG icon for app installation.

---

## 2. Application Logic & Data Flow

### A. Data Layer (`js/db.js`)
The app uses **IndexedDB** (browser layout database) as the single source of truth.
1.  **Initialization:** Checks if `mechanics`, `jobs`, `customers`, and `parts` stores exist. If not, seeds them with sample data.
2.  **CRUD Operations:** All reads/writes happen asynchronously.
3.  **Sync Queue:** (Ready for future) Offline actions are stored in `syncQueue` to be sent to a cloud server when internet returns.

### B. State Management (`js/app.js`)
The app runs on a simple, reactive state object:
```javascript
let state = {
  role: 'staff',        // Current user role (staff/mechanic/owner)
  activeTab: 'checkin', // Current visible screen
  activeTimerJob: null  // Job currently being tracked
};
```
**Logic Flow:**
1.  **User Action** (e.g., clicking "Check In") triggers a handler function.
2.  **Handler** updates `IndexedDB` (e.g., adds new job).
3.  **Handler** calls `refreshScreen()` to re-fetch data and re-render the UI.

### C. Auto-Assignment Logic (`autoAssign` function)
When a job is created:
1.  **Filter:** Finds mechanics with status `on_duty`.
2.  **Score:** Calculates a score (0-100) for each mechanic based on:
    - **Current Load:** -20 points per active job.
    - **Time Load:** -10 points per hour of estimated work.
    - **Skill Match:** +15 points if Senior Mechanic handles Repair/Makeover.
    - **Weekend Rush:** -50 points if already has >4 jobs (Saturdays/Sundays).
3.  **Win:** Assigns job to the mechanic with the highest score.

---

## 3. user Interface Flow (By Role)

### Role: Support Staff
1.  **Check-In:** Enters customer details -> System auto-assigns mechanic -> Job status: `ASSIGNED`.
2.  **Queue:** View all active jobs. Can filter by status (Working/Parts/Ready).
3.  **Pickup:** Sees jobs with status `READY`. Handles Payment -> Job status: `COMPLETED`.

### Role: Mechanic
1.  **Today:** Sees list of assigned jobs (Morning/Afternoon blocks).
2.  **Start Job:** Tap "Start" -> Timer begins -> Status: `IN_PROGRESS`.
3.  **Active Job:**
    - **Need Parts:** Pauses timer, requests parts -> Status: `PARTS_PENDING`.
    - **Complete:** Stops timer, saves parts used -> Status: `QUALITY_CHECK` (or `READY`).
4.  **My Stats:**View personal performance (On-time %, Incentive earned).

### Role: Owner
1.  **Dashboard:** High-level view of Revenue, Total Jobs, and Team workload.
2.  **Assign:** specific override to reassign jobs if the auto-algorithm made a mistake.
3.  **Team:** View individual mechanic performance and force "Auto-Rebalance" if one person is overloaded.

---

## 4. Folder Structure (New)

```text
/service
├── package.json       # Project configuration
├── fast.md            # This reference file
└── app/               # Main Application Code
    ├── index.html     # Setup & Layout (links to CSS/JS)
    ├── manifest.json  # Installation config
    ├── sw.js          # Offline Service Worker
    ├── css/
    │   └── app.css    # All Styles
    ├── js/
    │   ├── app.js     # UI Logic & Event Handlers
    │   └── db.js      # Database Logic
    └── icons/         # App Icons
```
