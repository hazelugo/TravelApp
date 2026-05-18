# Architecture Patterns: Vue 3 + Vite + TypeScript Migration

**Project:** TravelApp — single-file CDN to Vite SPA
**Researched:** 2026-05-17
**Source:** Analysis of existing `index.html` (~3000 lines, lines 1990–2848) + web research

---

## What the Existing Code Actually Is

The monolith is one `setup()` function with nine logical concerns. The return statement exposes ~65 symbols directly to the template. There is no component hierarchy — the entire app is one Vue instance mounted to `#app`.

Concerns found in `setup()`:

| Concern | Lines (approx) | What it manages |
|---------|----------------|-----------------|
| Core trip state | 1998–2007 | `state` reactive — trip, attendance, budget, events, friends, payments, photos |
| Supabase client + sync | 2019–2086 | `db`, `saveTrip`, `debouncedSave`, `remoteUpdate` flag |
| Trip index (multi-trip) | 2044–2063 | `tripIndex`, localStorage key, upsert helpers |
| Dark mode | 2144–2150 | `darkMode`, `toggleDark`, localStorage |
| Itinerary CRUD + drag | 2157–2648 | events, edit form, drag-to-reorder state |
| Destination autocomplete | 2381–2438 | Photon Komoot geocoding, debounced search |
| Weather | 2441–2524 | Open-Meteo API, WMO code mapping |
| Photo / lightbox | 2527–2600 | Supabase Storage upload, lightbox navigation |
| Payments / splitter | 2675–2767 | payment CRUD, settlement algorithm, split %  |
| Confirm dialog | 2602–2618 | Promise-based `showConfirm` utility |
| Navigation / tabs | 2163–2173 | tabs array, currentTab, labels |

---

## Recommended Architecture

### Guiding Principles

1. **Composables own logic, stores own shared reactive state.** A composable that is called in only one place can stay local to that component. Cross-component state belongs in Pinia.
2. **Real-time subscriptions live in the trip store.** They must survive tab navigation (component mounts/unmounts), so they cannot live in a component's `onMounted`. The store persists for the app's lifetime.
3. **The existing JSONB `data` column is an asset, not a liability.** Deserialize it into typed domain objects on load; serialize back on save. Do not attempt a schema migration to normalized columns until Phase 2+ auth work is complete.
4. **Migrate tab by tab.** Each tab maps cleanly to a page-level component. Extract one tab at a time, verify UI parity, move to the next.

---

## File Structure

```
src/
├── main.ts                   # createApp, Pinia, Router install
├── App.vue                   # Root: router-view + global overlays (ConfirmDialog, Lightbox)
│
├── router/
│   └── index.ts              # Routes, auth guard
│
├── stores/
│   ├── trip.ts               # useTripStore — core trip state + Supabase sync + real-time
│   ├── auth.ts               # useAuthStore — Supabase Auth session + onAuthStateChange
│   └── ui.ts                 # useUIStore — darkMode, currentTab, confirmDialog
│
├── composables/
│   ├── useSupabase.ts        # Singleton supabase client (module-level, not reactive)
│   ├── useTrip.ts            # Trip ID resolution, share URL management
│   ├── useDestination.ts     # Photon Komoot autocomplete (Photon → coords)
│   ├── useWeather.ts         # Open-Meteo fetching, WMO helpers
│   ├── usePhotos.ts          # Supabase Storage upload/remove, lightbox state
│   ├── useSettlements.ts     # Settlement algorithm (pure — takes payments + friends)
│   └── useConfirm.ts         # Promise-based confirm dialog bridge
│
├── types/
│   ├── domain.ts             # Trip, Event, Friend, Payment, Photo — core domain types
│   ├── database.ts           # Generated Supabase DB types (supabase gen types)
│   └── supabase.ts           # TripRow — typed wrapper for trips table
│
├── views/
│   ├── TripView.vue          # Shell: tab bar + <component :is="activeTab" />
│   ├── AuthView.vue          # Login / signup (added with auth phase)
│   └── NotFoundView.vue
│
├── components/
│   ├── tabs/
│   │   ├── OverviewTab.vue
│   │   ├── GroupTab.vue
│   │   ├── ItineraryTab.vue
│   │   ├── SpendingTab.vue
│   │   ├── SplitterTab.vue
│   │   └── PhotosTab.vue
│   │
│   ├── overview/
│   │   ├── TripHeader.vue        # Destination input, dates, budget
│   │   ├── TripStats.vue         # Cost hero, per-person, countdown
│   │   └── WeatherStrip.vue      # Weather day cards
│   │
│   ├── itinerary/
│   │   ├── EventList.vue         # Flat or grouped event rendering
│   │   ├── EventCard.vue         # Single event row (display + inline edit)
│   │   ├── EventForm.vue         # Add new event form
│   │   └── DayGroup.vue          # Grouped-by-day wrapper
│   │
│   ├── splitter/
│   │   ├── PaymentList.vue
│   │   ├── PaymentForm.vue
│   │   └── SettlementList.vue
│   │
│   ├── photos/
│   │   ├── PhotoGrid.vue
│   │   ├── PhotoCard.vue
│   │   └── Lightbox.vue          # Teleported to body
│   │
│   ├── shared/
│   │   ├── ConfirmDialog.vue     # Teleported to body, driven by useUIStore
│   │   ├── SyncBadge.vue         # 'saving' / 'saved' / 'error' indicator
│   │   ├── TripSwitcher.vue      # Desktop dropdown + mobile sheet
│   │   └── AppNav.vue            # Desktop top bar + mobile bottom nav
│   │
│   └── ui/
│       ├── AppButton.vue
│       ├── AppInput.vue
│       └── CategoryBadge.vue
```

---

## TypeScript Domain Interfaces

These map directly to the existing `state` reactive object. All fields match the current JSONB structure so deserialization is a direct `Object.assign`.

```typescript
// src/types/domain.ts

export type EventCategory = 'Transport' | 'Lodging' | 'Food' | 'Activity'

export interface TripMeta {
  destination: string
  startDate: string  // ISO date string "YYYY-MM-DD"
  endDate: string
}

export interface Attendance {
  adults: number
  kids: number
  adultPrice: number
  kidPrice: number
}

export interface TripEvent {
  id: string
  name: string
  date: string        // "YYYY-MM-DD" or ''
  time: string        // "HH:MM" or ''
  category: EventCategory
  cost: number
  perPerson: boolean
  notes: string
  url: string
}

export interface Friend {
  id: string
  name: string
}

export interface Payment {
  id: string
  paidById: string
  amount: number
  description: string
  splitAmong: string[]           // friend IDs
  splitPercentages: Record<string, number>
  settled: boolean
}

export interface Photo {
  id: string
  url: string
  path: string                   // Supabase Storage path for deletion
  caption: string
  uploadedAt: string             // ISO datetime
}

// Root shape serialized into/out of the trips.data JSONB column
export interface TripState {
  trip: TripMeta
  attendance: Attendance
  budget: number
  events: TripEvent[]
  friends: Friend[]
  payments: Payment[]
  settledPairs: string[]         // "fromId→toId" settlement keys
  photos: Photo[]
}

// Settlement algorithm output — derived, never persisted
export interface Settlement {
  from: string   // friend ID
  to: string     // friend ID
  amount: number
}

// Supabase trips table row
export interface TripRow {
  id: string
  data: TripState
  updated_at: string
  owner_id?: string | null       // null until auth phase adds this column
}
```

---

## Pinia Store Structure

### `useTripStore` — the heart of the app

This is the most important store. It owns the trip state, the Supabase sync loop, and the real-time channel. It must be initialized once and never torn down while the app runs.

```typescript
// src/stores/trip.ts
import { defineStore } from 'pinia'
import { ref, reactive, computed, watch } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import type { TripState, TripEvent, Friend, Payment, Settlement } from '@/types/domain'

export const useTripStore = defineStore('trip', () => {
  const supabase = useSupabase()

  // ── State ─────────────────────────────────────────────────────────────
  const tripId = ref<string>('')
  const syncStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const state = reactive<TripState>({
    trip: { destination: '', startDate: '', endDate: '' },
    attendance: { adults: 2, kids: 0, adultPrice: 0, kidPrice: 0 },
    budget: 0,
    events: [],
    friends: [],
    payments: [],
    settledPairs: [],
    photos: [],
  })

  // ── Computed (derived from state) ──────────────────────────────────────
  const totalParticipants = computed(
    () => state.attendance.adults + state.attendance.kids
  )
  const totalEventCost = computed(() =>
    state.events.reduce(
      (sum, e) => sum + (e.perPerson ? e.cost * totalParticipants.value : e.cost),
      0
    )
  )
  const settlements = computed<Settlement[]>(() => {
    // existing minimization algorithm — moved here verbatim
    // ...
    return []
  })

  // ── Supabase persistence ───────────────────────────────────────────────
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let remoteUpdate = false

  async function saveTrip() {
    try {
      syncStatus.value = 'saving'
      await supabase.from('trips').upsert({
        id: tripId.value,
        data: JSON.parse(JSON.stringify(state)),
        updated_at: new Date().toISOString(),
      })
      syncStatus.value = 'saved'
      setTimeout(() => {
        if (syncStatus.value === 'saved') syncStatus.value = 'idle'
      }, 2500)
    } catch {
      syncStatus.value = 'error'
    }
  }

  function debouncedSave() {
    if (remoteUpdate) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(saveTrip, 1400)
  }

  // ── Real-time subscription ─────────────────────────────────────────────
  // Lives in the store so it persists across tab navigation.
  // Components mount and unmount; the store does not.
  let channel: ReturnType<typeof supabase.channel> | null = null

  function subscribeToRealTime() {
    if (!tripId.value) return
    channel = supabase
      .channel(`trip:${tripId.value}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${tripId.value}`,
        },
        (payload) => {
          if (payload.new?.data) {
            remoteUpdate = true
            Object.assign(state, payload.new.data)
            syncStatus.value = 'saved'
            setTimeout(() => { remoteUpdate = false }, 0)
          }
        }
      )
      .subscribe()
  }

  function unsubscribeFromRealTime() {
    if (channel) {
      supabase.removeChannel(channel)
      channel = null
    }
  }

  // ── Initialization ─────────────────────────────────────────────────────
  async function initialize(id: string) {
    tripId.value = id
    try {
      const { data } = await supabase
        .from('trips')
        .select('data')
        .eq('id', id)
        .single()
      if (data?.data) Object.assign(state, data.data)
    } catch { /* first visit — state stays empty */ }
    subscribeToRealTime()
    watch(state, debouncedSave, { deep: true })
  }

  // ── CRUD actions ──────────────────────────────────────────────────────
  function addEvent(event: Omit<TripEvent, 'id'>) { /* ... */ }
  function updateEvent(id: string, patch: Partial<TripEvent>) { /* ... */ }
  function removeEvent(id: string) { /* ... */ }
  function reorderEvents(fromIndex: number, toIndex: number) { /* ... */ }

  function addFriend(name: string) { /* ... */ }
  function removeFriend(id: string) { /* ... */ }

  function addPayment(p: Omit<Payment, 'id' | 'settled'>) { /* ... */ }
  function updatePayment(id: string, patch: Partial<Payment>) { /* ... */ }
  function removePayment(id: string) { /* ... */ }
  function toggleSettled(fromId: string, toId: string) { /* ... */ }

  return {
    tripId, syncStatus, state,
    totalParticipants, totalEventCost, settlements,
    initialize, saveTrip,
    subscribeToRealTime, unsubscribeFromRealTime,
    addEvent, updateEvent, removeEvent, reorderEvents,
    addFriend, removeFriend,
    addPayment, updatePayment, removePayment, toggleSettled,
  }
})
```

### `useAuthStore`

Introduced in the auth phase. Supabase's `onAuthStateChange` drives it — no polling.

```typescript
// src/stores/auth.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, Session } from '@supabase/supabase-js'
import { useSupabase } from '@/composables/useSupabase'

export const useAuthStore = defineStore('auth', () => {
  const supabase = useSupabase()
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const loading = ref(true)  // true until first onAuthStateChange fires

  const isAuthenticated = computed(() => !!user.value)

  // Called once from main.ts before app.mount()
  function initialize() {
    supabase.auth.getSession().then(({ data }) => {
      session.value = data.session
      user.value = data.session?.user ?? null
      loading.value = false
    })

    supabase.auth.onAuthStateChange((_event, newSession) => {
      session.value = newSession
      user.value = newSession?.user ?? null
      loading.value = false
    })
  }

  async function signInWithEmail(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password })
  }
  async function signUp(email: string, password: string) {
    return supabase.auth.signUp({ email, password })
  }
  async function signOut() {
    await supabase.auth.signOut()
  }

  return { user, session, loading, isAuthenticated, initialize, signInWithEmail, signUp, signOut }
})
```

### `useUIStore`

Global UI state that multiple unrelated components need. Keep it narrow.

```typescript
// src/stores/ui.ts
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

interface ConfirmOptions {
  title: string
  message?: string
  okLabel?: string
  okClass?: string
}

export const useUIStore = defineStore('ui', () => {
  // Dark mode
  const darkMode = ref(false)
  function toggleDark() {
    darkMode.value = !darkMode.value
    document.documentElement.classList.toggle('dark', darkMode.value)
    localStorage.setItem('travelapp_dark', darkMode.value ? '1' : '')
  }
  function initDarkMode() {
    darkMode.value = !!localStorage.getItem('travelapp_dark')
    document.documentElement.classList.toggle('dark', darkMode.value)
  }

  // Confirm dialog (Promise-based — same pattern as existing `showConfirm`)
  const confirm = ref<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null)
  function showConfirm(opts: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      confirm.value = { ...opts, resolve }
    })
  }
  function confirmOk() { confirm.value?.resolve(true); confirm.value = null }
  function confirmCancel() { confirm.value?.resolve(false); confirm.value = null }

  return { darkMode, toggleDark, initDarkMode, confirm, showConfirm, confirmOk, confirmCancel }
})
```

---

## Composable Patterns

### `useSupabase` — Singleton client

The Supabase client must be created **once** (same requirement as the CDN version). Use a module-level singleton — do not use `ref` or `reactive` around it.

```typescript
// src/composables/useSupabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Module-level singleton — created once, shared everywhere
const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export function useSupabase() {
  return supabase
}
```

All credentials move to `.env.local`:
```
VITE_SUPABASE_URL=https://xedunxhvrhkyphcnllxa.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### `useTrip` — ID resolution

Extracted from the monolith's `resolveTripId()` and URL sync logic. Returns the current trip ID and share URL helpers. Has no reactive state of its own — it computes from `useTripStore`.

```typescript
// src/composables/useTrip.ts
export function useTrip() {
  function resolveTripId(): string {
    const urlId = new URLSearchParams(window.location.search).get('trip')
    if (urlId) { localStorage.setItem('travelapp_trip_id', urlId); return urlId }
    const stored = localStorage.getItem('travelapp_trip_id')
    if (stored) return stored
    const fresh = crypto.randomUUID()
    localStorage.setItem('travelapp_trip_id', fresh)
    return fresh
  }
  // ...
  return { resolveTripId }
}
```

### `useDestination` — Autocomplete (local to OverviewTab or TripHeader)

This has no cross-component state needs. It is called inside `TripHeader.vue` only. It can remain a local composable that accepts and mutates a `destination` ref passed in by the parent.

### `useWeather` — Fetch on demand

Takes `destination`, `startDate`, `endDate` as readonly refs. Returns `weather`, `weatherLoading`, `weatherError`. Lives in `WeatherStrip.vue` or `OverviewTab.vue`.

### `useSettlements` — Pure function (no composable needed)

The settlement algorithm is stateless. Move it to `src/utils/settlements.ts` as a plain function:
```typescript
export function computeSettlements(friends: Friend[], payments: Payment[]): Settlement[]
```
The `useTripStore` calls it as part of its `settlements` computed.

### `usePhotos` — Local to PhotosTab

Upload state (`photoUploading`, `photoError`) is only needed in `PhotosTab.vue`. Lightbox state can live in `PhotosTab.vue` or be promoted to `useUIStore` if a deep-link requirement emerges.

---

## Vue Router Structure

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/views/TripView.vue'),
      // No auth guard yet — existing anonymous link-sharing must keep working
    },
    {
      path: '/auth',
      component: () => import('@/views/AuthView.vue'),
      meta: { guestOnly: true },  // redirect if already signed in
    },
    {
      path: '/trips',
      component: () => import('@/views/MyTripsView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

// Auth guard — runs after onAuthStateChange has had time to fire
router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // Wait for initial session check to resolve
  if (auth.loading) {
    await new Promise<void>((resolve) => {
      const stop = watch(() => auth.loading, (v) => { if (!v) { stop(); resolve() } })
    })
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) return '/auth'
  if (to.meta.guestOnly && auth.isAuthenticated) return '/'
})

export default router
```

**Key decision:** The root `/` route has no auth guard. Anonymous trip links (`?trip=UUID`) must continue to work without an account. Auth is opt-in layered on top, not a gate.

---

## Data Flow Diagram

```
URL ?trip=UUID
       │
       ▼
   useTrip.resolveTripId()
       │
       ▼
   useTripStore.initialize(id)
       │
   ┌───┴───────────────────────────────┐
   │                                   │
   ▼                                   ▼
Supabase .from('trips')         Supabase .channel()
.select('data').eq('id', id)    .on('postgres_changes')
       │                               │
       ▼                               ▼
  Object.assign(state, data)    Object.assign(state, payload.new.data)
       │                               │
       └───────────┬───────────────────┘
                   │
                   ▼
           state (reactive)  ◄── user edits via store actions
                   │
                   ▼
           watch(state, debouncedSave)
                   │
                   ▼
           Supabase .from('trips').upsert(...)
```

Components read from the store via `storeToRefs(useTripStore())`. They call store actions to mutate. They never call Supabase directly.

---

## Handling the Existing JSONB State Column

**Do not change the schema.** The existing `trips.data` JSONB column is the right approach for this migration phase. Here is the read/write contract:

**On load:**
```typescript
const { data } = await supabase.from('trips').select('data').eq('id', id).single()
if (data?.data) {
  // Cast the Json type to TripState — safe because we own the schema
  Object.assign(state, data.data as TripState)
}
```

**On save:**
```typescript
await supabase.from('trips').upsert({
  id: tripId.value,
  data: JSON.parse(JSON.stringify(state)) as TripState,
  updated_at: new Date().toISOString(),
})
```

**TypeScript and Supabase-generated types:**
The `supabase gen types typescript` command will generate `data` as `Json` type for JSONB columns. Override this in `src/types/supabase.ts`:
```typescript
import type { Database } from './database'
import type { TripState } from './domain'

// Narrow the generated Json type to our actual schema
export type TripRow = Omit<Database['public']['Tables']['trips']['Row'], 'data'> & {
  data: TripState
}
```
This gives full type safety without changing the database.

**Migration path to normalized columns (future):** Once auth lands and `owner_id` is added, the pattern becomes: read `data` JSONB → derive normalized form → write back to new columns over time. The JSONB column can be kept as a fallback indefinitely.

---

## Component Hierarchy and Communication

```
App.vue
├── RouterView
│   └── TripView.vue
│       ├── AppNav.vue                 (reads useUIStore.currentTab)
│       ├── TripSwitcher.vue           (reads useTripStore.tripIndex)
│       ├── SyncBadge.vue             (reads useTripStore.syncStatus)
│       │
│       ├── OverviewTab.vue           (reads/writes trip.state.trip, attendance, budget)
│       │   ├── TripHeader.vue
│       │   │   └── useDestination()  (local composable)
│       │   ├── TripStats.vue
│       │   └── WeatherStrip.vue
│       │       └── useWeather()      (local composable)
│       │
│       ├── GroupTab.vue              (reads/writes state.friends, state.attendance)
│       │
│       ├── ItineraryTab.vue          (reads/writes state.events)
│       │   ├── EventForm.vue
│       │   ├── EventList.vue
│       │   │   └── EventCard.vue     (emits edit/delete up to ItineraryTab)
│       │   └── DayGroup.vue
│       │
│       ├── SpendingTab.vue           (reads state.events, categoryBreakdown)
│       │
│       ├── SplitterTab.vue           (reads/writes state.payments, state.friends)
│       │   ├── PaymentForm.vue
│       │   ├── PaymentList.vue
│       │   └── SettlementList.vue
│       │
│       └── PhotosTab.vue             (reads/writes state.photos)
│           ├── PhotoGrid.vue
│           │   └── PhotoCard.vue
│           └── usePhotos()           (local composable — upload state)
│
├── ConfirmDialog.vue                 (Teleport to body, reads useUIStore.confirm)
└── Lightbox.vue                      (Teleport to body, local state in PhotosTab)
```

**Communication rules:**
- Tab components read from `useTripStore` via `storeToRefs`
- Tab components dispatch actions: `store.addEvent(...)` not `store.state.events.push(...)`
- Child components (EventCard, PaymentForm) receive props from parent tabs — they do not access the store directly except for very simple display components
- Global overlays (ConfirmDialog, Lightbox) use Teleport to render at the body root regardless of DOM nesting

---

## Where Real-Time Subscriptions Live

**Answer: in `useTripStore`, initialized once, never inside a component.**

Rationale:
- The existing subscription in `onMounted` works because there is only one component. With tabs, each tab component mounts/unmounts as the user switches — if the subscription lived in a component, it would disconnect on tab switch and reconnect on return.
- Pinia stores are singletons. `initialize()` is called once from `main.ts` or from `App.vue`'s `onMounted`. The channel lives on the store instance until `unsubscribeFromRealTime()` is called (on auth sign-out or app tear-down).
- The `remoteUpdate` flag (prevents echoing remote changes back as saves) must also live on the store for the same lifetime reason.

For auth: the `useAuthStore` initializes `onAuthStateChange` in `main.ts` before `app.mount()`. This ensures the auth state is resolved before the router guard runs on first navigation.

---

## Build Order — What to Migrate First

Suggested extraction sequence (each step produces a working, deployable app):

### Step 1: Scaffold (no features yet)
Create the Vite + TypeScript project. Install dependencies. Configure Tailwind as PostCSS (not CDN). Verify `npm run dev` serves a blank page. Copy the existing CSS into `src/assets/base.css` verbatim — this preserves all dark mode overrides, animations, and custom properties.

**Deliverable:** Build pipeline works. CSS parity confirmed.

### Step 2: Types + Supabase client
Create `src/types/domain.ts` with all interfaces. Run `supabase gen types typescript` and save to `src/types/database.ts`. Create `src/composables/useSupabase.ts`. Move credentials to `.env.local`.

**Deliverable:** TypeScript types exist. Supabase client importable.

### Step 3: Trip store (data layer, no UI)
Implement `useTripStore` with `initialize()`, CRUD actions, and the real-time subscription. Write a smoke test that loads trip data. Do not yet write any component.

**Deliverable:** Trip data loads from Supabase and syncs in real-time.

### Step 4: App shell + Overview tab
Create `App.vue`, `TripView.vue`, `AppNav.vue`. Extract `OverviewTab.vue` from the monolith template. This tab is the first thing users see and has the highest visibility for regressions.

**Deliverable:** App loads with a working Overview tab. All other tabs show placeholders.

### Step 5: Remaining tabs, one at a time
Order: Group → Itinerary → Spending → Splitter → Photos.

- Group and Spending are read-heavy and low-complexity — extract first.
- Itinerary has drag-to-reorder and inline edit — extract the UI logic into `useItinerary` composable inside the tab file.
- Splitter contains the settlement algorithm — move to `src/utils/settlements.ts` as a pure function before extracting the component.
- Photos requires Supabase Storage + lightbox — extract `usePhotos` composable, keep lightbox state local to `PhotosTab`.

**Deliverable:** Full feature parity with the monolith, now in components.

### Step 6: PWA
Add `vite-plugin-pwa`. Configure a `manifest.webmanifest`. Enable workbox pre-caching of the app shell. Note: Supabase real-time over WebSocket does not work offline — this is expected. Cache trip data from the last successful load for read-only offline access.

### Step 7: Auth (additive, does not break anonymous links)
Add `useAuthStore`. Add `/auth` route. Wrap trips in user ownership via `owner_id` column addition (requires a DB migration at this point). The anonymous link-sharing model continues to work: a `?trip=UUID` link bypasses auth and loads the trip directly.

---

## Key Constraints Respected

- **No DB migration as prerequisite**: JSONB `data` column unchanged; typed via TypeScript overrides only
- **Design parity**: All CSS moved verbatim into `src/assets/base.css`; no class names or animations change
- **Anonymous links preserved**: Router has no global auth guard on `/`; `?trip=UUID` continues to work pre-auth
- **Supabase real-time preserved**: Subscription moves from `onMounted` (fragile) to the store (stable)

---

## Sources

- [Vue 3 TypeScript Best Practices 2025](https://eastondev.com/blog/en/posts/dev/20251124-vue3-typescript-best-practices/)
- [Pinia — Defining a Store](https://pinia.vuejs.org/core-concepts/)
- [Supabase — Use with Vue 3](https://supabase.com/docs/guides/getting-started/quickstarts/vue)
- [Supabase — TypeScript Support](https://supabase.com/docs/reference/javascript/typescript-support)
- [Supabase — Generating TypeScript Types](https://supabase.com/docs/guides/api/rest/generating-types)
- [Vue School — Supabase Auth with Vue Router Guard](https://vueschool.io/lessons/create-a-vue-router-guard-to-validate-the-supabase-auth-session)
- [Vue School — onAuthStateChange + Auth Store](https://vueschool.io/lessons/watch-for-supabase-auth-changes-and-update-auth-store)
- [Vue Router — Navigation Guards](https://router.vuejs.org/guide/advanced/navigation-guards.html)
- [vite-plugin-pwa](https://github.com/vite-pwa/vite-plugin-pwa)
- [Pinia — Active store after unmount (real-time subscription lifetime)](https://github.com/vuejs/pinia/discussions/2495)
- [Good Practices for Vue Composables](https://dev.to/jacobandrewsky/good-practices-and-design-patterns-for-vue-composables-24lk)
