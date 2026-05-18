---
phase: 02-data-layer
plan: "02"
subsystem: stores/ui + composables/useTrip + App.vue initialization
tags: [pinia, dark-mode, confirm-dialog, composable, app-init, fouc-prevention]
dependency_graph:
  requires:
    - 02-data-layer/02-01-PLAN.md  # useTripStore.initialize() called in App.vue
    - 01-scaffold/01-01-PLAN.md    # Vite scaffold, Pinia install
  provides:
    - useUIStore with dark mode and Promise-based confirm dialog
    - useTrip composable with trip ID resolution
    - App.vue initialization spine (dark mode + trip store hydration on mount)
  affects:
    - src/App.vue
    - src/stores/ui.ts
    - src/composables/useTrip.ts
    - src/stores/trips.ts (stub for TypeScript compatibility)
tech_stack:
  added: []
  patterns:
    - Promise-based confirm dialog controlled via Pinia store
    - FOUC-prevention blocking inline script in index.html
    - Composable as pure utility (no Vue reactivity imports)
    - storeToRefs for reactive store state destructuring
key_files:
  created:
    - src/composables/useTrip.ts
    - src/stores/trips.ts  # stub only — full impl from 02-01
  modified:
    - src/stores/ui.ts
    - src/App.vue
decisions:
  - "trips.ts stub created in this worktree for TypeScript compatibility during parallel execution; full implementation from 02-01 supersedes it at merge"
  - "index.html FOUC-prevention script was already correct from scaffold — no change needed"
  - "useTrip has no Vue reactivity imports — pure utility wrapper, not a reactive composable"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-18"
  tasks_completed: 3
  tasks_total: 3
  files_created: 2
  files_modified: 2
---

# Phase 2 Plan 02: useUIStore + useTrip + App Initialization Summary

**One-liner:** useUIStore with dark-mode toggle and Promise-based confirm dialog, useTrip ID resolver, and App.vue initialization spine wiring both stores on mount.

## What Was Built

Three deliverables that form the initialization spine consumed by Phase 3 UI components:

1. **`src/stores/ui.ts`** — Pinia store extended from the Phase 1 stub with:
   - `ConfirmOptions` and `ConfirmState` TypeScript interfaces (exported)
   - `initDarkMode()` — reads `travelapp_dark` localStorage key, applies `html.dark` class
   - `toggleDark()` — flips `darkMode.value`, syncs `html.dark`, writes to localStorage
   - `showConfirm(opts)` — returns `Promise<boolean>`, resolved by `confirmOk()` / `confirmCancel()`
   - `confirmOk()` / `confirmCancel()` — resolve the pending promise and clear `confirm` ref

2. **`src/composables/useTrip.ts`** — Pure utility composable (no Vue reactivity) with:
   - `resolveTripId()` — URL `?trip=` param → localStorage → fresh UUID (each step persists to localStorage)
   - `getShareUrl(tripId)` — builds shareable URL replacing `?trip=` param
   - `navigateToTrip(tripId)` — saves to localStorage and reloads page with new trip ID

3. **`src/App.vue`** — Root component updated from scaffold placeholder to:
   - Calls `uiStore.initDarkMode()` first in `onMounted` (dark mode applied before component tree renders)
   - Calls `await tripStore.initialize(resolveTripId())` to hydrate trip data
   - Renders confirm dialog stub via `<Teleport to="body">` driven by `useUIStore.confirm`
   - Uses `storeToRefs` for reactive `confirm` state, destructures actions directly

4. **`index.html`** — FOUC-prevention blocking script was already correct from Phase 1 scaffold; no change needed.

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | useUIStore with dark mode + confirm | 6f8a536 | src/stores/ui.ts |
| 2 | useTrip composable | 7317e42 | src/composables/useTrip.ts |
| 3 | App.vue + trips.ts stub | 169e72b | src/App.vue, src/stores/trips.ts |

## Deviations from Plan

### Auto-added (Rule 3 — Blocking Issue)

**[Rule 3 - Blocking] Added trips.ts stub for TypeScript compilation**

- **Found during:** Task 3
- **Issue:** App.vue imports `useTripStore` from `@/stores/trips`, but 02-01 (the parallel agent implementing the full store) had not yet created `trips.ts` in this worktree branch. `vue-tsc --noEmit` would fail without a valid import target.
- **Fix:** Created `src/stores/trips.ts` as a minimal stub with matching `initialize(id: string): Promise<void>` signature. The stub satisfies TypeScript; the full implementation from 02-01 will supersede it at merge time.
- **Files modified:** src/stores/trips.ts (created)
- **Commit:** 169e72b

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `src/stores/trips.ts` — `initialize()` is a no-op | src/stores/trips.ts | Placeholder for 02-01's full useTripStore implementation; merged worktrees will replace this |

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes introduced. The confirm dialog `resolve` callback is a plain `(boolean) => void` — no user-supplied code executed. Dark mode toggle uses `classList` only — no XSS vector. No threat flags.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| src/stores/ui.ts exists | FOUND |
| src/composables/useTrip.ts exists | FOUND |
| src/App.vue exists | FOUND |
| src/stores/trips.ts stub exists | FOUND |
| Commit 6f8a536 (useUIStore) | FOUND |
| Commit 7317e42 (useTrip) | FOUND |
| Commit 169e72b (App.vue + stub) | FOUND |
| vue-tsc --noEmit | PASSED (zero errors) |
