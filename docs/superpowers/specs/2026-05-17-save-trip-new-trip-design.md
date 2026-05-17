# Save Trip & Start New Trip — Design Spec
_2026-05-17_

## Summary

Add a "My Trips" header button that lets users see their saved trips, switch between them, copy share links per trip, and start a new trip — all without login, using localStorage as the index and Supabase as the per-trip store.

---

## Data Model

New `localStorage` key: `travelapp_trips`

```json
[
  { "id": "uuid", "name": "Tokyo 2026", "startDate": "2026-03-10", "endDate": "2026-03-20", "savedAt": "2026-01-15T10:00:00Z" }
]
```

- `name` defaults to `state.trip.destination` or `"Untitled Trip"` if empty.
- Upsert current trip into the index on `onMounted` (after Supabase load).
- Watch `state.trip` (destination, startDate, endDate) and update the matching index entry reactively.

---

## Header UI

A **"My Trips"** button is added to the top nav bar, left of the existing share/dark-mode buttons.
- Shows a suitcase icon (✈) + count badge (number of saved trips).
- Clicking opens a dropdown panel (desktop) / bottom sheet (mobile).

**Panel contents:**
- Trips listed most-recent-first. Active trip row is highlighted.
- Each row: trip name (truncated), dates, **Switch** icon button, **Copy link** icon button.
- **"+ New Trip"** button at the bottom of the panel.
- Clicking outside closes the panel.

---

## New Trip Flow

1. User clicks "+ New Trip" in the panel.
2. Existing `confirmDialog` fires: *"Start a new trip? Your current trip is saved and you can switch back anytime."*
3. On confirm:
   - Upsert current trip into the localStorage index.
   - Generate new UUID via `crypto.randomUUID()`.
   - Update `localStorage.travelapp_trip_id`.
   - Update URL to `?trip=<newId>` via `history.replaceState`.
   - Reset all `state` fields to defaults.
   - Add new empty trip to the index.
   - Close the panel.

---

## Switch Trip Flow

1. User clicks **Switch** on a trip row (not the active one).
2. If current trip has content, show confirm dialog: *"Switch trips? Your current trip is already saved."*
3. On confirm:
   - Update `localStorage.travelapp_trip_id` to selected trip's ID.
   - Update URL.
   - Load trip data from Supabase (same as `onMounted` load).
   - Re-subscribe real-time channel for new trip ID.
   - Close panel.

---

## Copy Link

Clicking **Copy link** on any trip row copies `https://<host>?trip=<id>` to clipboard. Uses existing clipboard pattern. Shows a brief "Copied!" confirmation on the button.

---

## Error Handling

- If Supabase load fails on switch, show the existing `syncStatus = 'error'` indicator and leave state unchanged.
- localStorage is always the source of truth for the trips index — Supabase is only for per-trip data blobs.

---

## Out of Scope (v1)

- Rename trip
- Delete trip from index
- Import trip by pasting URL
- Cross-device sync of the trips list
