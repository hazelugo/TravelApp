# Destination Banner + PDF Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-width Pexels destination photo banner to `AppHeader` (visible on all tabs) with reposition/cycle/upload controls, and a clean browser-print PDF export of the itinerary from `ItineraryTab`.

**Architecture:** Banner state lives in two new optional fields on `TripMeta` (JSONB — no DB migration needed). A `useBanner` composable owns Pexels fetching, cycling, and Supabase Storage upload. `AppHeader` reads these fields and renders the banner image with a gradient overlay and a hover-revealed controls toolbar. PDF export is pure `@media print` CSS — no libraries.

**Tech Stack:** Vue 3 `<script setup>`, Pexels REST API v1 (`VITE_PEXELS_API_KEY`), Supabase Storage (`trip-photos` bucket, `banners/` prefix), CSS `object-position`, `@media print`

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `src/types/domain.ts` | Add `bannerUrl?`, `bannerPosition?`, `bannerPhotographer?`, `bannerPhotographerUrl?` to `TripMeta` |
| Create | `src/composables/useBanner.ts` | Pexels fetch (debounced, skip if URL exists), cycle, Supabase upload, position setter |
| Modify | `src/components/layout/AppHeader.vue` | Banner image, gradient overlay, attribution link, adapted button colors, controls toolbar, reposition drag, mobile controls |
| Modify | `src/views/tabs/ItineraryTab.vue` | Export PDF button, print-only header, class hooks for print CSS, `<style>` print rules |

---

## Task 1: Extend TripMeta with banner fields

**Files:**
- Modify: `src/types/domain.ts`

- [ ] **Step 1: Add four optional fields to `TripMeta`**

In `src/types/domain.ts`, replace the `TripMeta` interface (currently lines 9–13):

```ts
export interface TripMeta {
  destination: string
  startDate: string   // ISO date "YYYY-MM-DD" or empty string
  endDate: string     // ISO date "YYYY-MM-DD" or empty string
  bannerUrl?: string              // Pexels CDN URL or Supabase Storage public URL
  bannerPosition?: string         // CSS object-position, e.g. "50% 30%". Defaults "50% 50%"
  bannerPhotographer?: string     // Pexels photographer name; absent for custom uploads
  bannerPhotographerUrl?: string  // Pexels photographer profile URL; absent for custom uploads
}
```

- [ ] **Step 2: Verify TypeScript compiles clean**

```bash
npm run build
```

Expected: exits 0, no type errors. Existing rows in Supabase without the new fields will deserialize with `undefined` for each new field — the same pattern as every other optional field in `TripState`.

- [ ] **Step 3: Commit**

```bash
git add src/types/domain.ts
git commit -m "feat: add banner fields to TripMeta"
```

---

## Task 2: Create `useBanner` composable

**Files:**
- Create: `src/composables/useBanner.ts`

- [ ] **Step 1: Create the composable**

Create `src/composables/useBanner.ts`:

```ts
import { ref, watch } from 'vue'
import { useTripStore } from '@/stores/trips'
import { supabase } from '@/lib/supabase'

const PEXELS_KEY = import.meta.env.VITE_PEXELS_API_KEY as string

interface PexelsPhoto {
  src: { large2x: string; large: string }
  photographer: string
  photographer_url: string
}

export function useBanner() {
  const trip = useTripStore()
  const loading = ref(false)
  const pageOffset = ref(0)
  let debounceTimer: ReturnType<typeof setTimeout> | undefined

  watch(
    () => trip.state.trip.destination,
    (dest, prev) => {
      if (dest !== prev) pageOffset.value = 0
      clearTimeout(debounceTimer)
      // Skip auto-fetch if a banner is already set (preserves user choice)
      if (!dest || trip.state.trip.bannerUrl) return
      debounceTimer = setTimeout(() => _fetch(dest, 0), 800)
    }
  )

  async function _fetch(destination: string, page: number) {
    if (!destination || !PEXELS_KEY) return
    loading.value = true
    try {
      const q = encodeURIComponent(`${destination} travel landscape`)
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${q}&per_page=5&orientation=landscape&page=${page + 1}`,
        { headers: { Authorization: PEXELS_KEY } }
      )
      if (!res.ok) return
      const data = await res.json() as { photos: PexelsPhoto[] }
      const photo = data.photos?.[0]
      if (!photo) return
      trip.state.trip.bannerUrl = photo.src.large2x || photo.src.large
      trip.state.trip.bannerPhotographer = photo.photographer
      trip.state.trip.bannerPhotographerUrl = photo.photographer_url
      trip.state.trip.bannerPosition = '50% 50%'
    } catch {}
    loading.value = false
  }

  // Explicitly bypass the skip condition and load the next Pexels result
  async function tryAnother() {
    const dest = trip.state.trip.destination
    if (!dest) return
    pageOffset.value += 1
    await _fetch(dest, pageOffset.value)
  }

  function setPosition(x: number, y: number) {
    trip.state.trip.bannerPosition = `${Math.round(x)}% ${Math.round(y)}%`
  }

  async function uploadBanner(file: File) {
    loading.value = true
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `banners/${trip.tripId}/${Date.now()}.${ext}`
      const { data, error } = await supabase.storage
        .from('trip-photos')
        .upload(path, file, { cacheControl: '3600', upsert: true })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('trip-photos').getPublicUrl(data.path)
      trip.state.trip.bannerUrl = urlData.publicUrl
      trip.state.trip.bannerPosition = '50% 50%'
      // No Pexels attribution for custom uploads
      trip.state.trip.bannerPhotographer = undefined
      trip.state.trip.bannerPhotographerUrl = undefined
    } catch (e) {
      console.error('Banner upload failed', e)
    }
    loading.value = false
  }

  return { loading, tryAnother, setPosition, uploadBanner }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/composables/useBanner.ts
git commit -m "feat: useBanner composable — Pexels fetch, cycle, Supabase upload"
```

---

## Task 3: AppHeader — banner display, gradient, attribution, adapted colors

**Files:**
- Modify: `src/components/layout/AppHeader.vue`

This task wires the visual layer: banner image, gradient overlay, Pexels attribution, and color adaptation for all existing buttons. Controls (click handlers, drag) come in Task 4.

- [ ] **Step 1: Add imports and refs to `<script setup>`**

At the top of `<script setup>` in `AppHeader.vue`, add:

```ts
import { ref } from 'vue'             // already imported — keep existing imports
import { useBanner } from '@/composables/useBanner'

const banner = useBanner()
const repositionMode = ref(false)
const dragging = ref(false)
const dragStart = ref({ x: 0, y: 0, posX: 50, posY: 50 })
const bannerFileInput = ref<HTMLInputElement | null>(null)
```

- [ ] **Step 2: Replace outer `<header>` element**

The current `<header>` opens at line 94:
```html
<header class="bg-white dark:bg-[#1a1f2e] border-b border-slate-100 dark:border-[#2a3347] px-6 py-4 flex items-center justify-between shrink-0 gap-4">
```

Replace it with:

```html
<header
  class="relative shrink-0 overflow-hidden transition-[height] duration-300"
  :class="!trip.state.trip.bannerUrl
    ? 'bg-white dark:bg-[#1a1f2e] border-b border-slate-100 dark:border-[#2a3347]'
    : repositionMode ? 'cursor-grab' : 'cursor-default'"
  :style="trip.state.trip.bannerUrl ? 'height: 180px' : ''"
  @pointerdown="onBannerPointerDown"
  @pointermove="onBannerPointerMove"
  @pointerup="onBannerPointerUp"
  @pointerleave="onBannerPointerUp"
>
```

- [ ] **Step 3: Add banner image, gradient, and attribution inside `<header>`**

Immediately after the opening `<header>` tag (before the existing content div), add:

```html
  <!-- Banner image -->
  <img
    v-if="trip.state.trip.bannerUrl"
    :src="trip.state.trip.bannerUrl"
    :style="`object-position: ${trip.state.trip.bannerPosition ?? '50% 50%'}`"
    class="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
    draggable="false"
    alt=""
  />

  <!-- Gradient overlay -->
  <div
    v-if="trip.state.trip.bannerUrl"
    class="absolute inset-0 pointer-events-none"
    style="background: linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.25) 60%, transparent 100%)"
  />

  <!-- Pexels attribution (only for Pexels photos, not custom uploads) -->
  <a
    v-if="trip.state.trip.bannerUrl && trip.state.trip.bannerPhotographer"
    :href="trip.state.trip.bannerPhotographerUrl"
    target="_blank"
    rel="noopener noreferrer"
    class="absolute bottom-2 left-4 z-10 text-[10px] text-white/50 hover:text-white/80 transition-colors"
    @click.stop
  >
    Photo by {{ trip.state.trip.bannerPhotographer }} on Pexels
  </a>
```

- [ ] **Step 4: Wrap existing content in a positioned `div`**

The current content row (`<div class="hidden lg:flex ...">` and the tab label) needs to be a `z-10` relative div filling the header height. Wrap the full existing content in:

```html
  <!-- Content row (sits above image + gradient) -->
  <div class="relative z-10 px-6 py-4 flex items-center justify-between gap-4"
    :class="trip.state.trip.bannerUrl ? 'h-full items-start pt-5' : ''">
    <!-- ... all existing content goes here unchanged ... -->
  </div>
```

- [ ] **Step 5: Adapt tab label colors for banner mode**

Replace the static color classes on the `<h1>` and `<p>` in the left side:

```html
<div class="min-w-0">
  <h1 class="text-base font-semibold"
    :class="trip.state.trip.bannerUrl ? 'text-white' : 'text-slate-900 dark:text-slate-100'">
    {{ meta().label }}
  </h1>
  <p class="text-xs mt-0.5"
    :class="trip.state.trip.bannerUrl ? 'text-white/70' : 'text-slate-400'">
    {{ meta().desc }}
  </p>
</div>
```

- [ ] **Step 6: Adapt My Trips button colors for banner mode**

Replace the `:class` on the My Trips `<button>`:

```html
:class="['flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
  trip.state.trip.bannerUrl
    ? tripsOpen
      ? 'bg-white/30 border-white/30 text-white'
      : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/20'
    : tripsOpen
      ? 'bg-teal-50 dark:bg-[#1e2535] border-teal-200 dark:border-teal-700 text-teal-700 dark:text-teal-400'
      : 'bg-white dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3347] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1e2535]']"
```

- [ ] **Step 7: Adapt copy-link and theme toggle colors**

Copy-link button `:class`:
```html
:class="['w-8 h-8 flex items-center justify-center rounded-lg transition-all',
  trip.state.trip.bannerUrl
    ? linkCopied ? 'text-white bg-white/20' : 'text-white/70 hover:text-white hover:bg-white/20'
    : linkCopied ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-[#1e2535]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-[#1e2535]']"
```

Theme toggle button `:class`:
```html
:class="['w-8 h-8 flex items-center justify-center rounded-lg transition-all',
  trip.state.trip.bannerUrl
    ? 'text-white/70 hover:text-white/90 hover:bg-white/20'
    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1e2535]']"
```

- [ ] **Step 8: Verify banner renders**

```bash
npm run dev
```

Open the app. Set a destination (e.g., "Tokyo"). After ~800ms the header should:
- Expand to 180px tall
- Show the Pexels photo with a dark gradient on top
- Show "Photo by [name] on Pexels" bottom-left
- Tab label and buttons should be white

- [ ] **Step 9: Commit**

```bash
git add src/components/layout/AppHeader.vue
git commit -m "feat: AppHeader banner display — image, gradient, attribution, adapted colors"
```

---

## Task 4: AppHeader — controls toolbar + drag reposition + mobile

**Files:**
- Modify: `src/components/layout/AppHeader.vue`

- [ ] **Step 1: Add banner controls toolbar (desktop)**

Inside the desktop actions `<div class="hidden lg:flex items-center gap-2 shrink-0">`, add this block **before** the My Trips button:

```html
<!-- Banner controls (desktop, only when banner exists) -->
<div v-if="trip.state.trip.bannerUrl" class="flex items-center gap-1 mr-1">
  <!-- Reposition -->
  <button
    @click="repositionMode = !repositionMode"
    :class="['w-8 h-8 flex items-center justify-center rounded-lg transition-all',
      repositionMode ? 'bg-white/30 text-white' : 'text-white/60 hover:text-white hover:bg-white/20']"
    :aria-label="repositionMode ? 'Exit reposition mode' : 'Drag to reposition banner'"
    :title="repositionMode ? 'Click again to finish' : 'Drag to reposition'"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/>
      <polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/>
      <line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/>
    </svg>
  </button>
  <!-- Try another -->
  <button
    @click="banner.tryAnother()"
    :disabled="banner.loading.value"
    class="w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/20 disabled:opacity-40 transition-all"
    aria-label="Load another Pexels photo"
    title="Try another photo"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  </button>
  <!-- Upload -->
  <button
    @click="bannerFileInput?.click()"
    class="w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/20 transition-all"
    aria-label="Upload custom banner photo"
    title="Upload your own photo"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  </button>
  <!-- Hidden file input -->
  <input
    ref="bannerFileInput"
    type="file"
    accept="image/*"
    class="hidden"
    @change="onBannerFileChange"
  />
</div>
```

- [ ] **Step 2: Add drag reposition functions to `<script setup>`**

Add these functions in `<script setup>`:

```ts
function parsePct(pos: string): [number, number] {
  const parts = (pos || '50% 50%').split(' ').map(p => parseFloat(p))
  return [parts[0] ?? 50, parts[1] ?? 50]
}

function onBannerPointerDown(e: PointerEvent) {
  if (!repositionMode.value || !trip.state.trip.bannerUrl) return
  const [posX, posY] = parsePct(trip.state.trip.bannerPosition ?? '50% 50%')
  dragging.value = true
  dragStart.value = { x: e.clientX, y: e.clientY, posX, posY }
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  e.preventDefault()
}

function onBannerPointerMove(e: PointerEvent) {
  if (!dragging.value || !repositionMode.value) return
  const el = e.currentTarget as HTMLElement
  const dx = ((dragStart.value.x - e.clientX) / el.offsetWidth) * 100
  const dy = ((dragStart.value.y - e.clientY) / el.offsetHeight) * 100
  const newX = Math.max(0, Math.min(100, dragStart.value.posX + dx))
  const newY = Math.max(0, Math.min(100, dragStart.value.posY + dy))
  banner.setPosition(newX, newY)
}

function onBannerPointerUp(e: PointerEvent) {
  if (!dragging.value) return
  dragging.value = false
  try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch {}
}

async function onBannerFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  ;(e.target as HTMLInputElement).value = ''
  await banner.uploadBanner(file)
}
```

- [ ] **Step 3: Add mobile banner controls**

In the `<!-- Mobile: briefcase icon + theme toggle -->` div, add the reposition and cycle buttons **before** the My Trips briefcase button, wrapped in a `v-if`:

```html
<!-- Mobile banner controls -->
<template v-if="trip.state.trip.bannerUrl">
  <button
    @click="repositionMode = !repositionMode"
    :class="['w-10 h-10 flex items-center justify-center rounded-xl transition-all',
      repositionMode ? 'text-white bg-white/30' : 'text-white/70 hover:bg-white/20']"
    aria-label="Reposition banner"
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/>
      <polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/>
      <line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/>
    </svg>
  </button>
  <button
    @click="banner.tryAnother()"
    :disabled="banner.loading.value"
    class="w-10 h-10 flex items-center justify-center rounded-xl text-white/70 hover:bg-white/20 disabled:opacity-40 transition-all"
    aria-label="Try another photo"
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  </button>
</template>
```

Also update the mobile theme toggle `:class` to adapt for banner mode:
```html
:class="['w-10 h-10 flex items-center justify-center rounded-xl transition-all',
  trip.state.trip.bannerUrl
    ? 'text-white/70 hover:bg-white/20'
    : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1e2535]']"
```

- [ ] **Step 4: Test all controls**

```bash
npm run dev
```

Verify:
1. Type a destination → banner auto-loads after ~800ms
2. Click the cycle (↻) icon → different Pexels photo appears
3. Click the reposition (✛) icon → cursor becomes grab; drag the image → focal point shifts; click again to exit
4. Click upload icon → file picker opens; choose a photo → custom photo replaces the banner; attribution link disappears (custom upload has no Pexels credit)
5. On mobile viewport (375px in DevTools): reposition and cycle buttons appear in the top bar

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/AppHeader.vue
git commit -m "feat: banner controls — reposition drag, cycle, upload, mobile"
```

---

## Task 5: PDF export — button + print CSS

**Files:**
- Modify: `src/views/tabs/ItineraryTab.vue`

- [ ] **Step 1: Add `exportPDF` function to `<script setup>`**

In `ItineraryTab.vue`, add to the `<script setup>` section:

```ts
function exportPDF() { window.print() }
```

- [ ] **Step 2: Add a print-only trip header to the template**

At the very top of `<template>`, before the add-event form div, add:

```html
<!-- Print-only header: hidden in app, shown on print -->
<div class="print-only-header">
  <h1>{{ trip.state.trip.destination || 'Trip Itinerary' }}</h1>
  <p v-if="trip.state.trip.startDate">
    {{ fmtDate(trip.state.trip.startDate) }}
    <template v-if="trip.state.trip.endDate"> — {{ fmtDate(trip.state.trip.endDate) }}</template>
  </p>
</div>
```

- [ ] **Step 3: Add `no-print` class to the add-event form**

The add-event form div at the top of the template currently opens with:
```html
<div class="bg-white dark:bg-[#1a1f2e] rounded-2xl border ...">
```

Add `no-print` to it:
```html
<div class="no-print bg-white dark:bg-[#1a1f2e] rounded-2xl border ...">
```

- [ ] **Step 4: Add Export PDF button to the toolbar row**

The toolbar row (visible only when events exist) is the `<div class="flex items-center justify-between">` wrapping the events count and "Group by Day" button. Replace it with:

```html
<div class="flex items-center justify-between no-print">
  <span class="text-xs text-slate-400 font-medium">
    {{ trip.state.events.length }} event{{ trip.state.events.length !== 1 ? 's' : '' }}
    <span v-if="!groupByDay" class="ml-1 text-slate-300 hidden lg:inline">· drag to reorder</span>
  </span>
  <div class="flex items-center gap-2">
    <button @click="exportPDF"
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-[#2a3347] bg-white dark:bg-[#1a1f2e] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1e2535] transition-all">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 6 2 18 2 18 9"/>
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
        <rect x="6" y="14" width="12" height="8"/>
      </svg>
      Export PDF
    </button>
    <button @click="groupByDay = !groupByDay"
      :class="['flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
        groupByDay
          ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
          : 'bg-white dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3347] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1e2535]']">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
      Group by Day
    </button>
  </div>
</div>
```

- [ ] **Step 5: Add print CSS**

At the bottom of `ItineraryTab.vue`, add a **non-scoped** `<style>` block (no `scoped` attribute — print rules must target the whole document):

```html
<style>
/* ── Print-only header (hidden in normal view) ── */
.print-only-header {
  display: none;
}

@media print {
  /* Hide app chrome */
  header,
  aside,
  nav,
  .no-print {
    display: none !important;
  }

  /* Reset layout */
  body, #app {
    background: white !important;
    height: auto !important;
    overflow: visible !important;
  }

  /* The outer flex container clips content — undo it */
  .flex.h-screen {
    display: block !important;
    height: auto !important;
    overflow: visible !important;
  }

  /* Main content area */
  main {
    padding: 0 !important;
    overflow: visible !important;
    flex: none !important;
  }

  /* Show the print header */
  .print-only-header {
    display: block !important;
    font-family: Georgia, 'Times New Roman', serif;
    margin-bottom: 20pt;
    padding-bottom: 10pt;
    border-bottom: 1pt solid #ccc;
  }
  .print-only-header h1 {
    font-size: 22pt;
    font-weight: 700;
    margin: 0 0 3pt;
    color: black;
  }
  .print-only-header p {
    font-size: 10pt;
    color: #666;
    margin: 0;
  }

  /* Day headings (group-by-day mode) */
  .print-day-heading {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 13pt;
    font-weight: 700;
    color: black !important;
    background: none !important;
    border-bottom: 0.5pt solid #ddd;
    padding-bottom: 4pt;
    margin-top: 16pt;
    margin-bottom: 8pt;
  }

  /* Event rows */
  .print-event-row {
    page-break-inside: avoid;
    border-bottom: 0.25pt solid #eee;
    padding: 6pt 0;
  }

  /* Strip all colors, gradients, shadows */
  * {
    box-shadow: none !important;
    text-shadow: none !important;
    background-image: none !important;
    -webkit-print-color-adjust: exact;
  }
}
</style>
```

- [ ] **Step 6: Add `print-day-heading` and `print-event-row` classes in the template**

In the `groupedEvents` v-for loop, find the day heading element (the one that renders `g.label`) and add `print-day-heading`:

```html
<div class="... print-day-heading">{{ g.label }}</div>
```

In both the flat (`sortedEvents`) and grouped (`groupedEvents`) event card divs, add `print-event-row` to each event wrapper:

```html
<div class="... print-event-row" ...>
```

- [ ] **Step 7: Test print output**

```bash
npm run dev
```

Navigate to the Itinerary tab with several events. Click "Export PDF":
- Browser print dialog opens
- Trip destination + dates appear at top in serif font
- Event list is clean: time, category, name, cost per row
- No sidebar, no app header, no form, no buttons visible
- Save as PDF → verify output is readable

- [ ] **Step 8: Commit**

```bash
git add src/views/tabs/ItineraryTab.vue
git commit -m "feat: PDF export via browser print with print CSS and trip header"
```

---

## Self-Review Checklist

- [x] **Banner auto-fetch**: watched in `useBanner`, debounced 800ms, skips if `bannerUrl` exists — Task 2
- [x] **Skip condition bypass for tryAnother**: `_fetch` called directly, not through the watcher — Task 2
- [x] **pageOffset resets on destination change**: `if (dest !== prev) pageOffset.value = 0` — Task 2
- [x] **Reposition drag**: pointer events on `<header>`, position clamped 0–100, saved via `setPosition` — Task 4
- [x] **Attribution**: `bannerPhotographer` shown only when set (Pexels photos); absent for custom uploads — Task 3
- [x] **Upload reuses `trip-photos` bucket**: `banners/{tripId}/` prefix, same Supabase Storage — Task 2
- [x] **Print CSS hides `header`, `aside`, `nav`**: matches actual element tags in `TripView.vue` — Task 5
- [x] **Print header shown only in print**: `.print-only-header { display: none }` in normal view — Task 5
- [x] **`fmtDate` already exists in ItineraryTab**: confirmed at line 101 — no new function needed — Task 5
- [x] **`banner.loading.value`**: `loading` is a `ref` — access `.value` when used outside template — Tasks 3+4
