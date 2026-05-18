# Requirements: TravelApp — Vue + Vite Migration

**Defined:** 2026-05-18
**Core Value:** A group can plan, cost, and settle a trip together in one place — no spreadsheets, no chasing people over chat.

---

## v1 Requirements

### Scaffold

- [ ] **SCAF-01**: Project runs as a Vite + Vue 3 + TypeScript SPA with `npm run dev` and `npm run build`
- [ ] **SCAF-02**: Tailwind CSS v3 installed with `darkMode: 'class'` — dark mode toggle works identically to existing app
- [ ] **SCAF-03**: `vercel.json` SPA rewrite in place — direct navigation to any route returns the app, not 404
- [ ] **SCAF-04**: Supabase client initialized from `VITE_` env vars via a single module-level singleton (`src/lib/supabase.ts`)
- [ ] **SCAF-05**: TypeScript types generated from Supabase schema (`supabase gen types` → `src/types/database.types.ts`)
- [ ] **SCAF-06**: Domain interfaces defined in TypeScript (`TripState`, `TripEvent`, `Friend`, `Payment`, `Photo`)
- [ ] **SCAF-07**: Pinia store (`useTripStore`) owns trip state, Supabase persistence, and real-time subscription
- [ ] **SCAF-08**: `useUIStore` owns dark mode toggle and confirm dialog — behaviour matches existing app

### UI Migration

- [ ] **UI-01**: Overview tab renders with full visual parity to existing app (destination, dates, budget, stats strip, weather)
- [ ] **UI-02**: Group tab renders with full visual parity (headcount, named travelers)
- [ ] **UI-03**: Itinerary tab renders with full visual parity (add/edit/delete events, links, maps, drag-to-reorder)
- [ ] **UI-04**: Spending tab renders with full visual parity (category breakdown chart)
- [ ] **UI-05**: Splitter tab renders with full visual parity (expense log, settlement algorithm, friend management)
- [ ] **UI-06**: Photos tab renders with full visual parity (upload, lightbox, share)
- [ ] **UI-07**: Multi-trip switcher works (create new trip, switch between trips by link)
- [ ] **UI-08**: All existing CSS — animations, custom properties, dark mode overrides — ported with no visual regression

### Auth

- [ ] **AUTH-01**: User can request a magic link by entering their email address
- [ ] **AUTH-02**: Clicking the magic link signs the user in and redirects to the app
- [ ] **AUTH-03**: Authenticated user's session persists across browser refresh (token auto-refreshed)
- [ ] **AUTH-04**: User can sign out from any page
- [ ] **AUTH-05**: Anonymous trip links (`?trip=UUID`) continue to work without an account

---

## v2 Requirements

### Auth (deferred)

- Google OAuth sign-in
- Multi-trip dashboard at `/trips` for authenticated users
- Trip ownership (`owner_id`) with row-level security
- Invite-by-link auto-join for authenticated users

### PWA

- Installable web app (home screen icon, standalone display)
- Offline read — trip data cached for airplane mode access
- Push notifications when group members add events or expenses

### Notifications

- In-app notification feed
- Pre-departure reminders

---

## Out of Scope

- Native iOS / Android app — PWA covers the mobile use case
- Backend rewrite — Supabase stays
- Server-side rendering — SPA is sufficient, no SEO requirement
- Offline mutations / background sync — Safari doesn't support Background Sync API; validate demand first
- Email-based trip invites — Supabase doesn't plan to build team invites natively; invite-by-link only

---

## Traceability

| Requirement | Phase | Status |
|---|---|---|
| SCAF-01 | Phase 1: Scaffold | Pending |
| SCAF-02 | Phase 1: Scaffold | Pending |
| SCAF-03 | Phase 1: Scaffold | Pending |
| SCAF-04 | Phase 1: Scaffold | Pending |
| SCAF-05 | Phase 1: Scaffold | Pending |
| SCAF-06 | Phase 1: Scaffold | Pending |
| SCAF-07 | Phase 2: Data Layer | Pending |
| SCAF-08 | Phase 2: Data Layer | Pending |
| UI-01 | Phase 3: UI Migration | Pending |
| UI-02 | Phase 3: UI Migration | Pending |
| UI-03 | Phase 3: UI Migration | Pending |
| UI-04 | Phase 3: UI Migration | Pending |
| UI-05 | Phase 3: UI Migration | Pending |
| UI-06 | Phase 3: UI Migration | Pending |
| UI-07 | Phase 3: UI Migration | Pending |
| UI-08 | Phase 3: UI Migration | Pending |
| AUTH-01 | Phase 4: Authentication | Pending |
| AUTH-02 | Phase 4: Authentication | Pending |
| AUTH-03 | Phase 4: Authentication | Pending |
| AUTH-04 | Phase 4: Authentication | Pending |
| AUTH-05 | Phase 4: Authentication | Pending |
