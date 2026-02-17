# BCH Service Management — All Changes Summary

## Project Stack
React 19 + Vite 7 + TypeScript + Tailwind CSS 4 + Supabase + PWA (Workbox)

---

## Supabase Migrations (Run in order in SQL Editor)

| # | File | Purpose |
|---|------|---------|
| 1 | `001_initial_schema.sql` | Core tables: users, customers, jobs, parts, activity_logs + indexes + RPC functions (verify_pin, get_active_mechanics) |
| 2 | `001b_rls_policies.sql` | Row Level Security policies for all tables |
| 3 | `002_seed_data.sql` | Seed data: 5 mechanics, 1 owner, 1 admin, 1 staff, 10 customers, 10 parts |
| 4 | `003_auto_assign.sql` | `auto_assign_job` RPC — workload-balanced mechanic assignment |
| 5 | `004_fix_rls_recursion.sql` | Fix RLS infinite recursion with SECURITY DEFINER helpers (`get_my_role`, `get_my_user_id`) |
| 6 | `005_storage_bucket.sql` | Supabase Storage bucket for before/after photos |
| 7 | `006_rls_v2.sql` | Clean RLS redesign — adds `owner` role, `is_owner_or_admin()` helper, drops all old policies, recreates with owner support |
| 8 | `007_schema_hardening.sql` | New columns (failed_pin_attempts, locked_until, last_login_at, loyalty_points, qc_notes, expected_completion_at), new indexes, updated verify_pin with 5-attempt lockout (15 min), unlock_user RPC |
| 9 | `008_performance_rpcs.sql` | 4 analytics RPCs: `get_mechanic_stats`, `get_mechanic_daily_stats`, `get_team_leaderboard`, `get_slow_jobs` |
| 10 | `009_labor_charge.sql` | Adds `labor_charge` column to jobs table — staff can set custom amount |
| 11 | `010_bikes_table.sql` | Bikes table with customer FK, registration_number index, jobs.bike_id FK, RLS enabled |
| 12 | `011_bikes_backfill.sql` | Backfill bikes from existing jobs, link jobs.bike_id |
| 13 | `012_bikes_rls.sql` | RLS policies for bikes table (owner/admin full, staff read+insert, mechanic read own) |
| 14 | `013_link_auth_users.sql` | Links Supabase Auth users to public.users via auth_user_id (owner + admin) |

---

## Files Created

### Services (src/services/)
| File | Purpose |
|------|---------|
| `jobService.ts` | Job CRUD, status updates, payment processing, multi-day queries with Zod validation |
| `userService.ts` | Mechanic CRUD, status toggle, user edit with PIN hashing, unlock locked users |
| `bikeService.ts` | Bike CRUD — getByCustomerId, create, searchByRegistration |
| `partsService.ts` | Parts inventory operations |
| `customerService.ts` | Customer upsert + debounced phone search |
| `photoService.ts` | Photo upload/download via Supabase Storage |
| `activityLogService.ts` | Audit trail with beforeState/afterState, filters (date, mechanic, action, jobId), CSV export |
| `performanceService.ts` | Wraps 4 performance RPCs with typed returns + stale-while-revalidate cache |
| `whatsappService.ts` | WhatsApp notification stubs (feature-flagged, no-op by default) |
| `zohoService.ts` | Zoho Books integration stubs (feature-flagged, no-op by default) |

### Hooks (src/hooks/)
| File | Purpose |
|------|---------|
| `useRealtimeJobs.ts` | Subscribe to realtime job changes + browser notifications |
| `useRealtimeUsers.ts` | Subscribe to realtime mechanic status changes |
| `useOfflineStatus.ts` | Track online/offline state + pending action count |
| `useActivityLog.ts` | Activity log helper hook |

### Library (src/lib/)
| File | Purpose |
|------|---------|
| `config.ts` | Environment config (VITE_USE_SUPABASE, URLs, keys) |
| `constants.ts` | STATUS, SERVICE_TYPES, ROLES, PRIORITY, STATUS_COLORS |
| `helpers.ts` | formatCurrency, formatTime, getToday, getTimeBlock, isWeekend |
| `mappers.ts` | DB snake_case <-> App camelCase field mapping |
| `supabase.ts` | Supabase client initialization |
| `mockData.ts` | Fallback data for offline/demo mode |
| `offlineDb.ts` | IndexedDB cache for jobs, mechanics, parts |
| `offlineQueue.ts` | Offline mutation queue with onChange listener |
| `imageUtils.ts` | Image compression + URL handling |
| `notifications.ts` | Browser Notification API wrapper |
| `validation.ts` | Zod schemas: createJobSchema, paymentSchema, pinLoginSchema, partsNeededSchema |

### Types (src/types/)
| File | Purpose |
|------|---------|
| `index.ts` | Job, User, Mechanic, Customer, Part, AppUser, DashboardStats + all enums |
| `bike.ts` | Bike interface |
| `performance.ts` | MechanicStats, DailyStats, LeaderboardEntry, SlowJob |

### Pages Created
| File | Purpose |
|------|---------|
| `pages/admin/AuditLog.tsx` | Activity logs with date/mechanic/action/jobId filters, expandable before/after diffs, CSV export, pagination |
| `pages/auth/LoginScreen.tsx` | Mechanic PIN grid + Owner email/PIN login (choose method if owner has PIN set) |
| `pages/auth/PinPad.tsx` | 4-digit PIN entry component |

### Components Created
| File | Purpose |
|------|---------|
| `components/auth/ProtectedRoute.tsx` | Role-based route guard with lock screen support |
| `components/auth/RoleRedirect.tsx` | Redirect to role's default page |
| `components/auth/LockScreen.tsx` | Session soft lock — PIN re-entry (mechanic/staff) or email/password (admin/owner), "Switch User" for full logout |
| `components/mechanic/SwitchMechanicFAB.tsx` | Floating button for mechanic switch |
| `components/mechanic/SwitchMechanicSheet.tsx` | Bottom sheet PIN entry for switching |
| `components/ui/PhotoCapture.tsx` | Camera/gallery photo picker |
| `components/ui/ErrorBoundary.tsx` | React error boundary with retry button |

---

## Files Modified

### Context (src/context/)

**AppContext.tsx** — Major rewrite:
- Dual-mode: Supabase + mock data with feature flag
- All mutations (createJob, startJob, completeJob, etc.) with optimistic updates + rollback
- Offline queue with exponential backoff replay (1s, 2s, 4s, 8s, max 30s), max 5 retries
- Realtime subscriptions via useRealtimeJobs + useRealtimeUsers
- Auto-assign engine (client-side scoring for mock mode)
- WhatsApp/Zoho integration calls at lifecycle points
- Labor charge + bikeId support in createJob and completeJob
- Activity logging with beforeState/afterState for all status changes, reassignment, payment
- Multi-day job queries (incomplete jobs from previous days carried forward)
- Conflict detection: checks updated_at before applying offline changes

**AuthContext.tsx** — Major additions:
- PIN login via `verify_pin` RPC
- Email login via Supabase Auth
- Owner PIN login option (checks if owner has phone + pin_hash set)
- Mechanic switch on shared devices
- Session persistence (localStorage)
- Session soft lock (30 min inactivity → lock screen, NOT logout)
- `isLocked` state, `unlock(pin)` and `unlockAdmin(email, password)` methods
- Lockout handling (shows "Account locked" message after 5 failed PIN attempts)

### Layout

**AppLayout.tsx** — Added:
- Role-based navigation config (staff/mechanic/admin/owner)
- Mechanic duty toggle in header (green=On Duty, grey=Off Duty) — only visible for mechanic role
- Offline banners: yellow=offline, blue=syncing, red=failed with retry button
- Notification permission banner (for mechanics)
- Switch mechanic FAB (for mechanics)
- Suspense wrapper around Outlet for lazy-loaded pages

### Pages Modified

**Dashboard.tsx** — Added slow jobs alert section (30-day overtime monitoring), memoized liveJobs + StatCard
**Team.tsx** — Rewritten with leaderboard from performanceService, period toggle (7d/30d/90d), unlock button, duty toggle per mechanic
**MyStats.tsx** — Rewritten with real performanceService RPCs, period toggle (7d/30d/90d), stale-while-revalidate cache (5 min TTL)
**Queue.tsx** — Added loading state, before/after photos in QC modal
**Pickup.tsx** — Added loading state, lazy image loading, uses job.laborCharge for billing
**Parts.tsx** — Added loading state
**CheckIn.tsx** — Customer phone lookup (debounced 500ms) → auto-fill name + bike picker, editable labor charge, bike photo capture
**Today.tsx** — "Ongoing from previous days" section for carryover jobs above morning/afternoon blocks
**JobCard.tsx** — Shows photo thumbnail, "Day N" orange badge for multi-day carryover jobs, wrapped in React.memo
**LoginScreen.tsx** — Owner PIN login option: checks if owner has phone + pin_hash, shows "Choose method" (PIN or Email)
**AuditLog.tsx** — Date range, mechanic dropdown, action type, job ID filters + collapsible before/after diffs + CSV export

### App.tsx — Added:
- `owner` role to all allowedRoles arrays
- `/admin/audit` route for AuditLog page
- React.lazy() for all 13 page components with Suspense
- ErrorBoundary wrapping AppLayout
- AuthGate: renders LockScreen when session is locked

---

## Environment Variables

```env
# Required
VITE_USE_SUPABASE=true
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional integrations (disabled by default)
VITE_WHATSAPP_ENABLED=false
VITE_WHATSAPP_API_URL=
VITE_ZOHO_ENABLED=false
VITE_ZOHO_API_URL=
```

---

## Login Credentials (from seed data)

### Mechanics (PIN login: phone + 4-digit PIN)
| Name | Phone | PIN | Level |
|------|-------|-----|-------|
| Mujju | +91-9876500001 | 1234 | Senior |
| Appi | +91-9876500002 | 2345 | Senior |
| Baba | +91-9876500003 | 3456 | Junior |
| Mohan | +91-9876500004 | 4567 | Junior |
| Iqbal | +91-9876500005 | 5678 | Junior |

### Staff (PIN login)
| Name | Phone | PIN |
|------|-------|-----|
| Staff | +91-9876500010 | 0000 |

### Owner (email login — create Supabase Auth user, then run migration 013)
| Name | Email | Password |
|------|-------|----------|
| BCH Owner | bch@gmail.com | bch@123 |

### Admin (email login — create Supabase Auth user, then run migration 013)
| Name | Email | Password |
|------|-------|----------|
| Admin | admin@gmail.com | admin@123 |

---

## Key Architecture Decisions

1. **Dual-mode operation** — `VITE_USE_SUPABASE=true/false` toggles between real Supabase and mock data
2. **Optimistic updates** — UI updates immediately, rolls back on server error
3. **Offline-first** — IndexedDB cache + mutation queue with exponential backoff (1s→30s max), 5 retries then failed
4. **Feature flags** — WhatsApp/Zoho integrations disabled by default via env vars
5. **Editable labor charge** — Staff can override default service prices at check-in
6. **PIN lockout** — 5 failed attempts locks account for 15 minutes
7. **Session soft lock** — 30 min inactivity → lock screen (NOT logout), in-memory state preserved
8. **Owner role** — Separate from admin, same permissions, distinct identity
9. **Customer → Bike → Job model** — Returning customers get auto-filled name + bike picker at check-in
10. **Multi-day job carryover** — Incomplete jobs from previous days appear in today's view with "Day N" badge
11. **Code splitting** — React.lazy() for all 13 pages, vendor chunks split (react, supabase, lucide-react)
12. **Mechanic duty toggle** — Self-service in header, syncs to admin Team page via Supabase Realtime
13. **Audit trail** — All mutations log beforeState/afterState with filterable admin page + CSV export

---

## Build Optimization

### Vendor Chunk Splitting (vite.config.js)
```js
manualChunks: {
  'vendor-react': ['react', 'react-dom', 'react-router-dom'],
  'vendor-supabase': ['@supabase/supabase-js'],
  'vendor-icons': ['lucide-react'],
}
```
Main chunk reduced from ~534KB to ~310KB gzipped.

### React.memo / useMemo
- `JobCard` wrapped in `React.memo`
- `Dashboard`: `liveJobs` memoized with `useMemo`, `StatCard` wrapped in `memo`
- All 13 page components loaded via `React.lazy()` with `Suspense`

---

## 10-Phase Hardening Plan (Completed)

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Data Model: Customer → Bike → Job (bikes table, bike picker in CheckIn) | Done |
| 2 | RLS Validation (bikes table policies) | Done |
| 3 | Offline Hardening (exponential backoff, retry limits, conflict detection) | Done |
| 4 | Push Notifications (Service Worker + fallback) | Done |
| 5 | Performance Tracking (period toggles 7d/30d/90d, stale-while-revalidate) | Done |
| 6 | Session Soft Lock (LockScreen component, preserves in-memory state) | Done |
| 7 | Audit Log Enhancement (beforeState/afterState, filters, CSV export) | Done |
| 8 | Multi-Day Job Support (carryover queries, "Day N" badges) | Done |
| 9 | Validation & Error Hardening (Zod schemas, ErrorBoundary) | Done |
| 10 | Performance Optimization (React.lazy, memo, useMemo, vendor chunks) | Done |
