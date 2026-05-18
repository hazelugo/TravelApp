---
phase: 02-data-layer
plan: "01"
subsystem: data-layer
tags: [pinia, supabase, realtime, settlements, typescript]
dependency_graph:
  requires:
    - 01-scaffold/01-01 (Vite + Vue 3 + TypeScript project)
    - 01-scaffold/01-02 (Supabase singleton + domain types)
  provides:
    - useTripStore with full reactive state + CRUD actions
    - computeSettlements pure utility
  affects:
    - All Phase 3 components (they import useTripStore)
tech_stack:
  added:
    - pinia (defineStore, reactive, computed, watch)
  patterns:
    - Pinia setup store (function syntax)
    - Singleton Supabase channel (store lifetime > component lifetime)
    - remoteUpdate flag for echo-loop prevention
    - Debounced upsert with syncStatus FSM
    - JSON.parse(JSON.stringify(state)) for safe proxy stripping before upsert
key_files:
  created:
    - src/stores/trips.ts
    - src/utils/settlements.ts
  modified: []
decisions:
  - trips.ts imports supabase from '@/lib/supabase' singleton — never calls createClient directly
  - settledPairs uses string key "fromId→toId" format, not boolean flags on Payment objects
  - watch(state, debouncedSave) started AFTER initialize() completes to avoid spurious first save
  - remoteUpdate is a plain let variable (not reactive) so it doesn't trigger watchers
  - channel guard: if(channel) return at top of subscribeToRealTime() prevents double-subscription
metrics:
  duration_minutes: 12
  completed_date: "2026-05-18"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
---

# Phase 2 Plan 01: useTripStore + computeSettlements Summary

**One-liner:** Pinia trip store with debounced Supabase upsert, singleton realtime channel, and pure minimize-transactions settlement algorithm.

## What Was Built

### Task 1 — `src/utils/settlements.ts`

Pure function `computeSettlements(friends, payments, settledPairs)` extracted from the monolith. Takes the full friends array and payments array, ignores payments marked `settled: true`, computes balance per person, then uses a greedy creditor/debtor matching algorithm to minimize transaction count. settledPairs (string keys `"fromId→toId"`) filter out already-acknowledged debts from the output. No Vue, Pinia, or Supabase imports — completely portable.

### Task 2 — `src/stores/trips.ts`

`useTripStore` is the data backbone for all Phase 3 components. Key design decisions:

- **State:** `reactive<TripState>` holding trip metadata, attendance, budget, events, friends, payments, settledPairs, photos. Mirrors the JSONB `data` column schema exactly so `Object.assign(state, data.data)` works without transformation.
- **Computed:** totalParticipants, totalEventCost, baseGroupCost, costPerPerson, daysUntilTrip, tripDuration, settlements (via computeSettlements).
- **Sync FSM:** `syncStatus` transitions idle → saving → saved → idle (after 2500ms) or error. The `debouncedSave` sets status to 'saving' immediately so the UI can show feedback before the 1400ms debounce fires.
- **Echo prevention:** `remoteUpdate` plain variable (not reactive) flips to `true` during realtime payload handling and resets to `false` in a `setTimeout(() => ..., 0)` microtask, ensuring the `watch(state, ...)` does not trigger a spurious upsert in response to a remote change.
- **Channel guard:** `if (channel) return` at top of `subscribeToRealTime()` means calling `initialize()` twice with the same ID is safe — no duplicate channels.
- **Watch startup:** `watch(state, debouncedSave, { deep: true })` is registered inside `initialize()` after `Object.assign(state, data.data)` completes, preventing the initial data load from triggering a save.
- **Trip index:** Local `localStorage` list of visited trips (`travelapp_trips` key) for the TripSwitcher component. Updated on initialize and whenever destination/dates change via a separate watcher.

## Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Pure computeSettlements utility | af289df |
| 2 | useTripStore with full CRUD, sync, realtime | cc3b81e |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. Both files are fully implemented. `settlements` computed is wired to `computeSettlements`; all CRUD actions mutate state directly; Supabase persistence and realtime are fully wired.

## Self-Check: PASSED

Files created:
- src/utils/settlements.ts — FOUND
- src/stores/trips.ts — FOUND

Commits:
- af289df — FOUND (feat(02-01): add pure computeSettlements utility)
- cc3b81e — FOUND (feat(02-01): implement useTripStore with full CRUD, sync, and realtime)

TypeScript: `vue-tsc --noEmit` — 0 errors
Build: `npm run build` — 0 errors, dist/ generated in 2.12s
