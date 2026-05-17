# Save Trip & Start New Trip — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "My Trips" header button with a dropdown/bottom-sheet panel that lists saved trips, lets users switch between them or start a new one, and copy per-trip share links — stored in localStorage.

**Architecture:** All changes are in `index.html`. Trip index is a localStorage array (`travelapp_trips`) of `{ id, name, startDate, endDate, savedAt }` objects. Switching and starting new trips navigate via `window.location.href` (full page reload) to cleanly reinitialize Supabase realtime state. The panel renders as a desktop dropdown (absolute positioned) and a mobile bottom sheet (fixed bottom), both controlled by the same `tripsOpen` ref. Click-outside is handled by a `fixed z-40` overlay below the panel.

**Tech Stack:** Vue 3 Composition API, localStorage, Tailwind CSS, existing `showConfirm` / `confirmDialog` pattern, existing `formatDate` helper.

---

### Task 1: Trip index state and localStorage helpers

**Files:**
- Modify: `index.html` — JS section (~line 1825 for refs, ~line 2462 for onMounted, ~line 2486 for watch)

- [ ] **Step 1: Add trip index refs and helpers after `const linkCopied = ref(false);` (line 1825)**

```js
    // ── Trip index ───────────────────────────────────────────────
    const TRIP_INDEX_KEY = 'travelapp_trips';
    const tripIndex = ref([]);
    const tripsOpen = ref(false);
    const tripsCopiedId = ref(null);

    function loadTripIndex() {
      try { tripIndex.value = JSON.parse(localStorage.getItem(TRIP_INDEX_KEY) || '[]'); }
      catch { tripIndex.value = []; }
    }
    function saveTripIndex() {
      localStorage.setItem(TRIP_INDEX_KEY, JSON.stringify(tripIndex.value));
    }
    function upsertTripIndex(id, name, startDate, endDate) {
      const idx = tripIndex.value.findIndex(t => t.id === id);
      const entry = { id, name: name || 'Untitled Trip', startDate: startDate || '', endDate: endDate || '', savedAt: new Date().toISOString() };
      if (idx >= 0) { tripIndex.value[idx] = { ...tripIndex.value[idx], ...entry }; }
      else { tripIndex.value.unshift(entry); }
      saveTripIndex();
    }
```

- [ ] **Step 2: In `onMounted`, call index helpers after loading Supabase data (~line 2462)**

Find:
```js
        const { data } = await db.from('trips').select('data').eq('id', tripId).single();
        if (data?.data) Object.assign(state, data.data);
```
Replace with:
```js
        const { data } = await db.from('trips').select('data').eq('id', tripId).single();
        if (data?.data) Object.assign(state, data.data);
        loadTripIndex();
        upsertTripIndex(tripId, state.trip.destination, state.trip.startDate, state.trip.endDate);
```

- [ ] **Step 3: Watch `state.trip` fields to keep the index entry current**

After the existing `watch(() => state.trip.destination, ...)` block (~line 2486), add:
```js
    watch(() => [state.trip.destination, state.trip.startDate, state.trip.endDate], ([dest, start, end]) => {
      upsertTripIndex(tripId, dest, start, end);
    });
```

- [ ] **Step 4: Verify in browser**

Open the app. Open DevTools → Application → Local Storage. Confirm `travelapp_trips` is a JSON array with one entry containing the current trip ID and destination. Edit the destination field in the app and confirm the index entry name updates.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: add trip index localStorage helpers"
```

---

### Task 2: Flexible confirm dialog (support custom button label + color)

**Files:**
- Modify: `index.html` — JS ~line 2285, HTML ~line 1766

- [ ] **Step 1: Update `confirmDialog` ref and `showConfirm` signature (~line 2285)**

Find:
```js
    const confirmDialog = ref({ show: false, title: '', message: '', resolve: null });
    const confirmCancelBtn = ref(null);
    function showConfirm(title, message = 'This cannot be undone.') {
      return new Promise(resolve => {
        confirmDialog.value = { show: true, title, message, resolve };
        nextTick(() => confirmCancelBtn.value?.focus());
      });
    }
```
Replace with:
```js
    const confirmDialog = ref({ show: false, title: '', message: '', okLabel: 'Delete', okClass: 'bg-rose-500 hover:bg-rose-600', resolve: null });
    const confirmCancelBtn = ref(null);
    function showConfirm(title, message = 'This cannot be undone.', okLabel = 'Delete', okClass = 'bg-rose-500 hover:bg-rose-600') {
      return new Promise(resolve => {
        confirmDialog.value = { show: true, title, message, okLabel, okClass, resolve };
        nextTick(() => confirmCancelBtn.value?.focus());
      });
    }
```

- [ ] **Step 2: Update the confirm button HTML to use dynamic label and class (~line 1766)**

Find:
```html
              <button @click="confirmOk" class="px-4 py-2 text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors">Delete</button>
```
Replace with:
```html
              <button @click="confirmOk" :class="['px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors', confirmDialog.okClass]">{{ confirmDialog.okLabel }}</button>
```

- [ ] **Step 3: Verify existing delete flows still work**

Delete an event and a payment. The confirm dialog should show a red "Delete" button (unchanged default).

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: make confirm dialog button label and style configurable"
```

---

### Task 3: `startNewTrip` function

**Files:**
- Modify: `index.html` — JS after `copyShareLink` (~line 1853)

- [ ] **Step 1: Add `startNewTrip` after the `copyShareLink` function**

```js
    async function startNewTrip() {
      const ok = await showConfirm(
        'Start a new trip?',
        'Your current trip is saved and you can switch back anytime.',
        'New Trip',
        'bg-teal-600 hover:bg-teal-700'
      );
      if (!ok) return;
      clearTimeout(saveTimer);
      await saveTrip();
      const newId = crypto.randomUUID();
      localStorage.setItem('travelapp_trip_id', newId);
      const url = new URL(window.location.href);
      url.searchParams.set('trip', newId);
      window.location.href = url.toString();
    }
```

- [ ] **Step 2: Add `switchTrip` and `copyTripLink` placeholders to the return block**

In the `return { ... }` statement (~line 2490), add to the exports (don't remove anything existing):
```js
      tripIndex, tripsOpen, tripsCopiedId,
      startNewTrip, switchTrip, copyTripLink,
```

(Note: `switchTrip` and `copyTripLink` will be defined in Tasks 4 and 5 — add them here now so the return block is complete and you don't have to touch it again.)

- [ ] **Step 3: Temporarily verify via browser console**

In DevTools console, run: `app._instance.setupState.startNewTrip()` — confirm the teal "New Trip" dialog appears. Cancel it. Confirm no navigation occurs.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add startNewTrip function"
```

---

### Task 4: `switchTrip` function

**Files:**
- Modify: `index.html` — JS after `startNewTrip`

- [ ] **Step 1: Add `switchTrip` after `startNewTrip`**

```js
    async function switchTrip(id) {
      if (id === tripId) { tripsOpen.value = false; return; }
      const hasContent = !!(state.trip.destination || state.events.length || state.friends.length);
      if (hasContent) {
        const ok = await showConfirm(
          'Switch trips?',
          'Your current trip is already saved.',
          'Switch',
          'bg-teal-600 hover:bg-teal-700'
        );
        if (!ok) return;
      }
      clearTimeout(saveTimer);
      await saveTrip();
      localStorage.setItem('travelapp_trip_id', id);
      const url = new URL(window.location.href);
      url.searchParams.set('trip', id);
      window.location.href = url.toString();
    }
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add switchTrip function"
```

---

### Task 5: `copyTripLink` function

**Files:**
- Modify: `index.html` — JS after `switchTrip`

- [ ] **Step 1: Add `copyTripLink` after `switchTrip`**

```js
    async function copyTripLink(id) {
      const url = new URL(window.location.href);
      url.searchParams.set('trip', id);
      await navigator.clipboard.writeText(url.toString());
      tripsCopiedId.value = id;
      setTimeout(() => { if (tripsCopiedId.value === id) tripsCopiedId.value = null; }, 2000);
    }
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add copyTripLink function"
```

---

### Task 6: Desktop header — My Trips button and dropdown panel

**Files:**
- Modify: `index.html` — HTML desktop header (~line 517) and near the confirm dialog overlay (~line 1756)

- [ ] **Step 1: Add My Trips button + dropdown to the desktop header**

Find (line 517–518):
```html
      <div class="hidden lg:flex items-center gap-2 shrink-0">
        <!-- Sync pill -->
```
Replace with:
```html
      <div class="hidden lg:flex items-center gap-2 shrink-0">
        <!-- My Trips button + dropdown -->
        <div class="relative">
          <button @click="tripsOpen = !tripsOpen"
            :class="['flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
              tripsOpen ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50']"
            aria-label="My trips">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
            My Trips
            <span v-if="tripIndex.length > 0" class="bg-teal-100 text-teal-700 rounded-full px-1.5 text-[10px] font-bold leading-none py-0.5">{{ tripIndex.length }}</span>
          </button>
          <transition name="fade">
            <div v-if="tripsOpen" class="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/60 z-50 overflow-hidden">
              <div class="px-4 pt-4 pb-2 border-b border-slate-50">
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">My Trips</p>
              </div>
              <div class="max-h-60 overflow-y-auto">
                <div v-for="trip in tripIndex" :key="trip.id"
                  :class="['flex items-center gap-3 px-4 py-3 transition-colors', trip.id === tripId ? 'bg-teal-50/60' : 'hover:bg-slate-50']">
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-slate-800 truncate">
                      {{ trip.name }}
                      <span v-if="trip.id === tripId" class="ml-1 text-[10px] font-semibold bg-teal-100 text-teal-700 rounded-full px-1.5 py-0.5">current</span>
                    </p>
                    <p class="text-xs text-slate-400 mt-0.5">
                      <template v-if="trip.startDate">{{ formatDate(trip.startDate) }}<template v-if="trip.endDate"> → {{ formatDate(trip.endDate) }}</template></template>
                      <span v-else class="italic">No dates set</span>
                    </p>
                  </div>
                  <div class="flex items-center gap-1 shrink-0">
                    <button v-if="trip.id !== tripId" @click="switchTrip(trip.id)"
                      class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-all"
                      aria-label="Switch to this trip">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </button>
                    <button @click="copyTripLink(trip.id)"
                      :class="['w-7 h-7 flex items-center justify-center rounded-lg transition-all', tripsCopiedId === trip.id ? 'text-teal-600 bg-teal-50' : 'text-slate-400 hover:text-teal-600 hover:bg-teal-50']"
                      :aria-label="tripsCopiedId === trip.id ? 'Copied!' : 'Copy link'">
                      <svg v-if="tripsCopiedId !== trip.id" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                      <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>
                  </div>
                </div>
                <div v-if="tripIndex.length === 0" class="px-4 py-6 text-center text-sm text-slate-400 italic">No trips saved yet.</div>
              </div>
              <div class="px-4 py-3 border-t border-slate-100">
                <button @click="startNewTrip"
                  class="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold text-teal-600 hover:bg-teal-50 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  New Trip
                </button>
              </div>
            </div>
          </transition>
        </div>
        <!-- Sync pill -->
```

- [ ] **Step 2: Add desktop click-outside overlay before the confirm dialog overlay (~line 1756)**

Find:
```html
        <div v-if="confirmDialog.show" class="fixed inset-0 z-[60]
```
Add before it:
```html
        <!-- Trips panel click-outside overlay -->
        <div v-if="tripsOpen" class="fixed inset-0 z-40 hidden lg:block" @click="tripsOpen = false" aria-hidden="true"></div>
```

- [ ] **Step 3: Verify desktop UI (browser ≥ 1024px wide)**

"My Trips" button appears in the header. Clicking opens the dropdown panel with current trip listed. Clicking outside closes it. Count badge shows `1`.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add My Trips desktop dropdown panel"
```

---

### Task 7: Mobile header — My Trips button and bottom sheet

**Files:**
- Modify: `index.html` — HTML mobile header (~line 548) and overlay area (~line 1756)

- [ ] **Step 1: Add My Trips icon button as first item in the mobile header**

Find (line 548–551):
```html
      <!-- Mobile header actions -->
      <div class="flex lg:hidden items-center gap-0.5 shrink-0">
        <span :class="['w-2 h-2 rounded-full shrink-0 mr-1',
```
Replace with:
```html
      <!-- Mobile header actions -->
      <div class="flex lg:hidden items-center gap-0.5 shrink-0">
        <button @click="tripsOpen = !tripsOpen"
          :class="['w-10 h-10 flex items-center justify-center rounded-xl transition-all relative', tripsOpen ? 'text-teal-600 bg-teal-50' : 'text-slate-500 hover:bg-slate-50']"
          aria-label="My trips">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
          <span v-if="tripIndex.length > 1" class="absolute top-1.5 right-1.5 w-3.5 h-3.5 flex items-center justify-center bg-teal-500 text-white text-[9px] font-bold rounded-full leading-none">{{ tripIndex.length }}</span>
        </button>
        <span :class="['w-2 h-2 rounded-full shrink-0 mr-1',
```

- [ ] **Step 2: Add mobile bottom sheet and backdrop after the desktop overlay**

Find the desktop overlay added in Task 6 Step 2:
```html
        <!-- Trips panel click-outside overlay -->
        <div v-if="tripsOpen" class="fixed inset-0 z-40 hidden lg:block" @click="tripsOpen = false" aria-hidden="true"></div>
```
Add after it:
```html
        <!-- Trips bottom sheet (mobile) -->
        <transition name="slide-up">
          <div v-if="tripsOpen" class="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl border-t border-slate-100 shadow-xl overflow-hidden" style="padding-bottom: env(safe-area-inset-bottom)">
            <div class="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
              <p class="text-sm font-semibold text-slate-800">My Trips</p>
              <button @click="tripsOpen = false" class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="max-h-72 overflow-y-auto">
              <div v-for="trip in tripIndex" :key="trip.id"
                :class="['flex items-center gap-3 px-5 py-3.5 transition-colors', trip.id === tripId ? 'bg-teal-50/60' : 'hover:bg-slate-50']">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-slate-800 truncate">
                    {{ trip.name }}
                    <span v-if="trip.id === tripId" class="ml-1 text-[10px] font-semibold bg-teal-100 text-teal-700 rounded-full px-1.5 py-0.5">current</span>
                  </p>
                  <p class="text-xs text-slate-400 mt-0.5">
                    <template v-if="trip.startDate">{{ formatDate(trip.startDate) }}<template v-if="trip.endDate"> → {{ formatDate(trip.endDate) }}</template></template>
                    <span v-else class="italic">No dates set</span>
                  </p>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <button v-if="trip.id !== tripId" @click="switchTrip(trip.id)"
                    class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-all"
                    aria-label="Switch to this trip">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </button>
                  <button @click="copyTripLink(trip.id)"
                    :class="['w-8 h-8 flex items-center justify-center rounded-lg transition-all', tripsCopiedId === trip.id ? 'text-teal-600 bg-teal-50' : 'text-slate-400 hover:text-teal-600 hover:bg-teal-50']"
                    :aria-label="tripsCopiedId === trip.id ? 'Copied!' : 'Copy link'">
                    <svg v-if="tripsCopiedId !== trip.id" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                </div>
              </div>
              <div v-if="tripIndex.length === 0" class="px-5 py-8 text-center text-sm text-slate-400 italic">No trips saved yet.</div>
            </div>
            <div class="px-5 py-4 border-t border-slate-100">
              <button @click="startNewTrip"
                class="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                New Trip
              </button>
            </div>
          </div>
        </transition>
        <!-- Mobile backdrop -->
        <div v-if="tripsOpen" class="lg:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" @click="tripsOpen = false" aria-hidden="true"></div>
```

- [ ] **Step 3: Verify mobile UI (browser < 1024px viewport)**

Briefcase icon button appears in the mobile header. Tapping it opens the bottom sheet sliding up. Trips list, New Trip button, close X, and tap-backdrop-to-close all work.

- [ ] **Step 4: Final E2E verification**

1. On a fresh page load, confirm `travelapp_trips` in localStorage has one entry.
2. Start a new trip — confirm page reloads with a fresh empty state and a new `?trip=` param. Both trips appear in the index.
3. Switch back to the first trip — confirm the original data loads.
4. Copy a trip link — paste it in a new tab and confirm that trip loads.
5. Existing delete dialogs still show red "Delete" button.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: add My Trips mobile bottom sheet"
```
