# Roadmap: TravelApp — Vue + Vite Migration

## Overview

The migration takes a working ~3000-line monolithic `index.html` (Vue 3 CDN + Tailwind CDN + Supabase) and transforms it into a proper Vite + TypeScript project without regressing any existing functionality. Phase 1 establishes the build pipeline and all binary correctness decisions (env vars, Supabase singleton, Tailwind dark mode config, Vercel SPA rewrite). Phase 2 moves trip state into Pinia stores with real-time sync living in the store, not components. Phase 3 extracts all six tabs as Single File Components with full visual parity to the existing app. Phase 4 layers magic-link authentication on top without breaking anonymous shared-link access.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Scaffold** - Vite + Vue 3 + TypeScript SPA with working build pipeline, Tailwind v3, Supabase singleton, and Vercel deploy config
- [x] **Phase 2: Data Layer** - Pinia stores own all trip state, Supabase persistence, and real-time subscription (completed 2026-05-18)
- [ ] **Phase 3: UI Migration** - All six tabs extracted as SFCs with full visual parity to the existing app
- [ ] **Phase 4: Authentication** - Magic-link sign-in with anonymous trip links continuing to work

## Phase Details

### Phase 1: Scaffold
**Goal**: A deployable Vite + Vue 3 + TypeScript SPA exists with the correct build pipeline, environment configuration, and Supabase connectivity — before a single UI component is ported
**Depends on**: Nothing (first phase)
**Requirements**: SCAF-01, SCAF-02, SCAF-03, SCAF-04, SCAF-05, SCAF-06
**Success Criteria** (what must be TRUE):
  1. `npm run dev` starts a local server and `npm run build` produces a dist folder with no TypeScript errors
  2. The built app deploys to Vercel and direct navigation to any path returns the app (not a 404)
  3. Dark mode toggle switches the `html.dark` class and the UI responds correctly in both dev and production builds
  4. Supabase client connects using `VITE_` env vars and the app throws a clear error at startup if vars are missing
  5. TypeScript domain interfaces (`TripState`, `TripEvent`, `Friend`, `Payment`, `Photo`) and generated Supabase types exist with no `any` escape hatches
**Plans**: 2 plans
Plans:
- [ ] 01-01-PLAN.md — Vite + Vue 3 + TypeScript scaffold with Tailwind v3 dark mode and vercel.json SPA rewrite
- [ ] 01-02-PLAN.md — Supabase singleton, generated database types, and domain interfaces

### Phase 2: Data Layer
**Goal**: Trip state, Supabase persistence, and real-time sync are owned by Pinia stores — components can mount and unmount freely without disconnecting the subscription
**Depends on**: Phase 1
**Requirements**: SCAF-07, SCAF-08
**Success Criteria** (what must be TRUE):
  1. Opening the app in two browser tabs — editing trip data in one tab causes the other tab to update without a page refresh
  2. The dark mode toggle and confirm dialog work identically to the existing app, controlled by `useUIStore`
  3. Navigating between tabs in the app does not create or destroy Supabase real-time subscriptions (subscription count stays at 1)
**Plans**: TBD

### Phase 3: UI Migration
**Goal**: Every existing tab is a Vue SFC and the migrated app is visually indistinguishable from the original — no UI regression, no missing interaction
**Depends on**: Phase 2
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08
**Success Criteria** (what must be TRUE):
  1. All six tabs (Overview, Group, Spending, Itinerary, Splitter, Photos) render with full visual parity including gradients, category colors, animations, and dark mode
  2. All write operations (add/edit/delete events, manage group members, log expenses, upload photos) function correctly and persist to Supabase
  3. Dynamic category color classes (blue=Transport, emerald=Lodging, amber=Food, violet=Activity) appear correctly in a production build — no purged class names
  4. Multi-trip switcher allows creating a new trip and switching between trips via link
  5. All CSS custom properties, keyframe animations, and dark mode overrides produce no visual regression compared to the original `index.html`
**Plans**: TBD
**UI hint**: yes

### Phase 4: Authentication
**Goal**: Users can sign in with a magic link and their session persists — while anonymous trip links continue to work exactly as before
**Depends on**: Phase 3
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. User enters their email, receives a magic link, clicks it, and arrives at the app signed in
  2. Refreshing the browser after sign-in keeps the user authenticated — no re-login required
  3. User can sign out from any page and is returned to an unauthenticated state
  4. Visiting `/?trip=UUID` without an account loads the trip normally — authentication is never required to view or edit a shared trip link
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Scaffold | 0/2 | Ready to execute | - |
| 2. Data Layer | 2/2 | Complete    | 2026-05-18 |
| 3. UI Migration | 0/TBD | Not started | - |
| 4. Authentication | 0/TBD | Not started | - |
