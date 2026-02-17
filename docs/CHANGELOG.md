# Changelog — BCH Service Management System

All notable changes to the Bharath Cycle Hub Service Management app.

---

## [2.0.0] — 2026-02-16

### Major Upgrade: Supabase Integration + Auth + TypeScript

Full production upgrade adding backend database, authentication, role-based access, real-time updates, and TypeScript — all behind a feature flag (`VITE_USE_SUPABASE`) so the existing mock-data workflow is preserved.

---

### Phase 0: Feature Flag & Environment Config

**Files created:**
- `.env.example` — template with `VITE_USE_SUPABASE`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `.env` — local config (gitignored)
- `src/lib/config.ts` — centralized env reader

**Files modified:**
- `.gitignore` — added `.env`

---

### Phase 1: Supabase Client + Database Schema

**Dependencies added:**
- `@supabase/supabase-js` — Supabase JS SDK v2

**Files created:**
- `src/lib/supabase.ts` — Supabase client singleton (null when flag is off)
- `supabase/migrations/001_initial_schema.sql` — full database schema:
  - `users` table — id, name, phone, email, role, mechanic_level, pin_hash, avatar, color, status, auth_user_id
  - `customers` table — id, name, phone, visits
  - `jobs` table — full lifecycle fields matching existing 7-status flow
  - `parts` table — inventory tracking
  - `activity_logs` table — audit trail
  - `verify_pin()` RPC — server-side bcrypt PIN verification
  - `get_active_mechanics()` RPC — for login screen avatar grid
  - Indexes on date, mechanic_id, status, phone, created_at
  - `update_updated_at()` trigger on users, jobs, parts
- `supabase/migrations/001b_rls_policies.sql` — Row Level Security:
  - Mechanics see only their assigned jobs (seniors see all)
  - Staff can create/read/update jobs, cannot delete
  - Admin has full access to all tables
  - PIN verification via SECURITY DEFINER (bypasses RLS)
- `supabase/migrations/002_seed_data.sql` — seed data:
  - 5 mechanics (Mujju, Appi, Baba, Mohan, Iqbal) with hashed 4-digit PINs
  - 1 owner, 1 staff user
  - 10 customers, 10 parts inventory items

---

### Phase 2: Auth Context + PIN Login

**Files created:**
- `src/context/AuthContext.tsx` — authentication state management:
  - `loginWithEmail(email, password)` — owner/admin via Supabase Auth
  - `loginWithPin(phone, pin)` — mechanic/staff via RPC
  - `switchMechanic(phone, pin)` — fast identity switch on shared device
  - `logout()` — clears session
  - Session persistence via localStorage
- `src/pages/auth/LoginScreen.tsx` — dual login flow:
  - Mechanic avatar grid (tap name → enter PIN)
  - Staff PIN login button
  - Owner email+password form
- `src/pages/auth/PinPad.tsx` — 4-digit PIN keypad:
  - 64px touch targets for low-literacy users
  - Auto-submit on 4th digit
  - Haptic feedback via navigator.vibrate
  - Visual PIN dots with animation

**Files modified:**
- `src/App.tsx` — AuthProvider always wraps app; AuthGate shows login when Supabase is on
- `src/context/AppContext.tsx` — reads role/mechanicId from AuthContext in Supabase mode
- `src/layouts/AppLayout.tsx` — shows user name + logout button (Supabase) or role switcher (mock)

---

### Phase 3: Data Layer Abstraction

**Files created:**
- `src/services/jobService.ts` — CRUD for jobs with DB↔App field mapping
- `src/services/userService.ts` — mechanic CRUD, status toggle, create/deactivate
- `src/services/customerService.ts` — search, upsert, visit tracking
- `src/services/partsService.ts` — inventory read, stock updates, low-stock query
- `src/services/activityLogService.ts` — audit log insert, recent fetch, per-job history

Each service checks `config.useSupabase` and returns `null` in mock mode (handled by context).

---

### Phase 4: Protected Routes + Role-Based Redirect

**Files created:**
- `src/components/auth/ProtectedRoute.tsx` — route guard:
  - Checks auth state + allowed roles
  - Redirects unauthorized users to their role's default page
  - Passthrough in mock mode (no protection)
- `src/components/auth/RoleRedirect.tsx` — `/` route handler:
  - Admin → `/admin/dashboard`
  - Mechanic → `/mechanic/today`
  - Staff → `/staff/checkin`

**Files modified:**
- `src/App.tsx` — route groups wrapped with `<ProtectedRoute allowedRoles={[...]}>`

---

### Phase 5: Switch Mechanic Mode (Shared Device)

**Files created:**
- `src/components/mechanic/SwitchMechanicFAB.tsx` — 56px floating action button:
  - Fixed position above bottom nav
  - Swap icon (RefreshCw from Lucide)
  - Only visible when role is mechanic
- `src/components/mechanic/SwitchMechanicSheet.tsx` — bottom sheet modal:
  - 3×2 grid of mechanic avatars (colored circles + name)
  - Current mechanic highlighted with green checkmark
  - Tap → PIN entry → instant switch (<2 seconds)
  - Mock mode: instant switch without PIN

**Files modified:**
- `src/layouts/AppLayout.tsx` — renders FAB when `role === 'mechanic'`

---

### Phase 6: Real-Time Subscriptions

**Files created:**
- `src/hooks/useRealtimeJobs.ts` — subscribes to `postgres_changes` on jobs table for today
- `src/hooks/useRealtimeUsers.ts` — subscribes to mechanic status changes
- `src/hooks/useActivityLog.ts` — fetches and manages activity log state

---

### Phase 7: Server-Side Auto-Assignment

**Files created:**
- `supabase/migrations/003_auto_assign.sql` — PL/pgSQL function `auto_assign_job(job_id)`:
  - Exact replica of client-side scoring algorithm
  - Scoring: active jobs (-20), total hours (-10), skill match (+15/+10), weekend penalty (-50)
  - Auto-logs assignment to activity_logs table
  - SECURITY DEFINER for consistent access

---

### Phase 8: Owner Dashboard Upgrade

**Files modified:**
- `src/pages/admin/Dashboard.tsx`:
  - Added alerts section: QC pending, ready for pickup, parts waiting
  - Added workload heatmap: per-mechanic active/done with progress bars
  - Added live job board: all active jobs with status dots, priority badges, mechanic avatars
  - Added "All jobs completed" empty state
- `src/pages/admin/Team.tsx`:
  - Added on/off duty toggle switches per mechanic
  - Added average job time metric
  - Integrated with `userService.updateMechanicStatus()` for Supabase mode

---

### Phase 9: TypeScript Migration

**Dependencies added:**
- `typescript` — TypeScript compiler
- `@types/react` — React type definitions
- `@types/react-dom` — React DOM type definitions

**Files created:**
- `tsconfig.json` — strict mode, ESNext, react-jsx, allowJs for gradual migration
- `src/types/index.ts` — shared type definitions:
  - `Role`, `MechanicLevel`, `JobStatus`, `ServiceType`, `Priority`
  - `Job`, `User`, `Mechanic`, `Customer`, `Part`
  - `AppUser`, `DashboardStats`, `ActivityLog`, `Toast`

**All files migrated:**
- `src/lib/*.js` → `src/lib/*.ts` (5 files) — with type annotations
- `src/services/*.js` → `src/services/*.ts` (5 files)
- `src/hooks/*.js` → `src/hooks/*.ts` (3 files)
- `src/context/*.jsx` → `src/context/*.tsx` (2 files)
- `src/components/**/*.jsx` → `src/components/**/*.tsx` (10 files)
- `src/pages/**/*.jsx` → `src/pages/**/*.tsx` (14 files)
- `src/layouts/*.jsx` → `src/layouts/*.tsx` (1 file)
- `src/App.jsx` → `src/App.tsx`
- `src/main.jsx` → `src/main.tsx`
- `index.html` — updated script src to `/src/main.tsx`

**Zero .js/.jsx files remain in src/.**

---

### Final Project Structure

```
bch-app/
├── .env.example
├── .env                        (gitignored)
├── index.html                  (→ main.tsx)
├── tsconfig.json
├── package.json
├── vite.config.js
├── docs/
│   ├── CHANGELOG.md            (this file)
│   ├── MASTER_DOCUMENT.md
│   ├── LOGIC_FLOW.md
│   ├── FLOW_WALKTHROUGH.md
│   └── planning/               (handoff & design docs)
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 001b_rls_policies.sql
│       ├── 002_seed_data.sql
│       └── 003_auto_assign.sql
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── types/
    │   └── index.ts
    ├── lib/
    │   ├── config.ts
    │   ├── constants.ts
    │   ├── helpers.ts
    │   ├── mockData.ts
    │   └── supabase.ts
    ├── context/
    │   ├── AppContext.tsx
    │   └── AuthContext.tsx
    ├── services/
    │   ├── jobService.ts
    │   ├── userService.ts
    │   ├── customerService.ts
    │   ├── partsService.ts
    │   └── activityLogService.ts
    ├── hooks/
    │   ├── useRealtimeJobs.ts
    │   ├── useRealtimeUsers.ts
    │   └── useActivityLog.ts
    ├── components/
    │   ├── auth/
    │   │   ├── ProtectedRoute.tsx
    │   │   └── RoleRedirect.tsx
    │   ├── mechanic/
    │   │   ├── SwitchMechanicFAB.tsx
    │   │   └── SwitchMechanicSheet.tsx
    │   └── ui/
    │       ├── Badge.tsx
    │       ├── Button.tsx
    │       ├── Card.tsx
    │       ├── JobCard.tsx
    │       ├── Modal.tsx
    │       └── Toast.tsx
    ├── layouts/
    │   └── AppLayout.tsx
    └── pages/
        ├── auth/
        │   ├── LoginScreen.tsx
        │   └── PinPad.tsx
        ├── staff/
        │   ├── CheckIn.tsx
        │   ├── Queue.tsx
        │   ├── Pickup.tsx
        │   └── Parts.tsx
        ├── mechanic/
        │   ├── Today.tsx
        │   ├── ActiveJob.tsx
        │   ├── NewService.tsx
        │   └── MyStats.tsx
        └── admin/
            ├── Dashboard.tsx
            ├── Assign.tsx
            ├── Team.tsx
            └── Customers.tsx
```

---

### Activation Steps (Supabase Mode)

1. Run SQL files in Supabase SQL Editor (in order): `001`, `001b`, `002`, `003`
2. Enable Realtime replication on `jobs` and `users` tables
3. Update `.env`:
   ```
   VITE_USE_SUPABASE=true
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Create owner account in Supabase Auth → link `auth_user_id` in users table
5. Default mechanic PINs (dev): Mujju=1234, Appi=2345, Baba=3456, Mohan=4567, Iqbal=5678, Staff=0000

### Safety

- `VITE_USE_SUPABASE=false` (default) → app runs identically to v1.0 on mock data
- No existing component behavior was changed
- Job status flow unchanged: received → assigned → in_progress → parts_pending → quality_check → ready → completed
