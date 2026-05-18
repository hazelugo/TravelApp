# Design: Destination Banner + PDF Export

**Date:** 2026-05-18  
**Status:** Approved  

---

## Overview

Two independent features:

1. **Destination Banner** — a full-width photo header in `AppHeader.vue` that auto-fetches a Pexels image based on the trip destination, persists across all tabs, and supports repositioning, cycling, and custom upload.
2. **PDF Export** — a clean, printable itinerary triggered from `ItineraryTab.vue` using the browser print API with print CSS. No dependencies, no banner/graphics in the output.

---

## Feature 1: Destination Banner

### Data Model

Two optional fields added to `TripMeta` in `src/types/domain.ts`:

```ts
bannerUrl?: string       // Pexels CDN URL or Supabase Storage public URL
bannerPosition?: string  // CSS object-position value, e.g. "50% 30%". Defaults to "50% 50%"
```

No DB migration required — the `trips.data` column is JSONB; existing rows without these fields return `undefined`, handled the same as any other missing optional field.

### Pexels Photo Fetch

A new composable `src/composables/useBanner.ts` owns the fetch logic:

- Watches `trip.state.trip.destination` with a debounce of ~800ms (mirrors the existing weather fetch pattern in `OverviewTab.vue`)
- **Skip condition:** if `trip.state.trip.bannerUrl` already has a value, do not auto-fetch — this preserves a user's custom choice across reloads. "Try another" explicitly bypasses this condition.
- Calls the Pexels Search API: `GET https://api.pexels.com/v1/search?query={destination} travel landscape&per_page=5&orientation=landscape`
- Stores `photos[0].src.large2x` (or `original`) into `trip.state.trip.bannerUrl`
- Maintains a local `pageOffset` ref (starts at 0, resets to 0 when destination changes) for the "try another" action, which increments the page and replaces `bannerUrl` with the next result
- API key stored in `VITE_PEXELS_API_KEY` env var

### AppHeader Integration

`AppHeader.vue` is extended to render a banner behind the existing controls:

- **Height:** `180px` desktop / `140px` mobile
- **Image:** `<img>` with `object-fit: cover`, `object-position: bannerPosition ?? '50% 50%'`, and `draggable="false"`
- **Gradient overlay:** `linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)` for text legibility
- **Text color:** existing labels flip to white when a banner is active; sync pill and action buttons adapt accordingly
- **Empty state:** no banner shown when `bannerUrl` is absent — header renders exactly as today

### Banner Controls Toolbar

A small icon toolbar shown on hover (desktop) / always visible as a small pill (mobile) in the top-right of the banner, above the existing action buttons:

| Icon | Action |
|------|--------|
| Move/crosshair | Enter reposition mode |
| Refresh | Try another Pexels photo |
| Upload | Upload custom photo |

**Reposition mode:**
- Cursor changes to `grab`/`grabbing`
- User drags; `bannerPosition` updates live via `pointermove`
- On `pointerup`, position is saved to `trip.state.trip.bannerPosition` and synced
- Clicking the same icon again exits reposition mode

**Try another:**
- Increments `pageOffset` in `useBanner`, fetches next Pexels result
- Replaces `bannerUrl`; resets `bannerPosition` to `"50% 50%"`

**Upload custom photo:**
- Hidden `<input type="file" accept="image/*">`  triggered programmatically
- Upload to Supabase Storage under `banners/{tripId}/{filename}` (reuses the upload pattern from `PhotosTab.vue`)
- On success, store public URL in `bannerUrl`; reset `bannerPosition` to `"50% 50%"`
- Previous Pexels photo is simply replaced (no cleanup needed for Pexels CDN URLs; Supabase Storage uploads from prior custom banners are orphaned — acceptable for v1)

### State Persistence

`bannerUrl` and `bannerPosition` are part of `TripState` and therefore synced to Supabase via the existing save mechanism. All group members see the same banner.

---

## Feature 2: PDF Export

### Trigger

An "Export PDF" button added to the top of `ItineraryTab.vue`. Placement: top-right of the tab header row, alongside any existing controls. On click: `window.print()`.

### Print Layout

A `<style media="print">` block scoped to `ItineraryTab.vue`:

**Hides (via `display: none !important`):**
- `AppHeader` (the banner header)
- `AppSidebar` (the tab navigation)
- All other tabs
- Banner controls toolbar
- Any interactive elements (drag handles, edit buttons, add-event forms)

**Renders:**
- Trip destination + date range as a plain text heading at the top (`<h1>` level, system serif)
- Events grouped by day; each group has a date heading (`<h2>` level)
- Per event row: time (or "TBD"), category label, event name, cost, notes (if any)
- No colors, no gradients, no icons — black on white
- Standard print margins; browser handles pagination

**Typography:** system serif stack at print-safe sizes (14pt body, 18pt day headings, 24pt trip title).

**No dependencies** — pure CSS `@media print`. The browser's "Save as PDF" handles file output, paper size, and margins.

---

## Out of Scope (v1)

- AI itinerary generation
- Full-trip PDF (all tabs) — planned for a future top-header export feature
- Cleanup of orphaned Supabase Storage banner uploads
- Pexels attribution display (required by Pexels guidelines — **must be added before any public launch**)

## Open Items

- **Pexels attribution:** Pexels API Terms require crediting the photographer and Pexels. A small attribution line (e.g., "Photo by [Photographer] on Pexels") should appear on the banner. Deferred to implementation but must not be skipped for production.
- **Pexels API key:** `VITE_PEXELS_API_KEY` must be added to Vercel environment variables.
