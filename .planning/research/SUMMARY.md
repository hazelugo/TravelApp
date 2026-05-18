# Project Research Summary

**Project:** TravelApp — Vue + Vite Migration
**Domain:** Vue 3 SPA migration (CDN monolith to Vite + TypeScript + Supabase Auth + PWA)
**Researched:** 2026-05-17
**Confidence:** HIGH

---

## Executive Summary

TravelApp is being migrated from a single ~3000-line `index.html` to a proper Vite + TypeScript project. The migration is fundamentally additive: the existing Supabase schema stays untouched, real-time sync continues working, and anonymous shared links remain valid. The recommended stack is **Vue 3.5 + Vite 6 + TypeScript 5 + Tailwind v3 + Pinia 3 + Vue Router 4 + Supabase JS v2 + vite-plugin-pwa**.

The one deliberate choice against STACK.md: use **Tailwind v3, not v4**. Tailwind v4 changes dark mode from class-based to media-query by default, silently breaking the existing `html.dark` toggle. Upgrading to v4 is a clean follow-on phase after migration stabilizes.

Primary risks are all in Phase 1 scaffolding: Supabase client singleton, `VITE_` env var prefix, Tailwind dark mode config, Vercel SPA rewrite rule. Get these right before porting a single component and the rest is mechanical.

---

## Recommended Stack

| Technology | Version | Rationale |
|---|---|---|
| Vue | 3.5 | Current stable; 3.6 is beta |
| Vite | 6 | LTS-equivalent; v8 too new for migration risk |
| TypeScript + vue-tsc | 5 | Gates deploys on type correctness; Supabase generates TS types |
| Tailwind CSS | **v3.4** | Class-based dark mode works out of the box; class names match existing HTML exactly |
| Pinia | 3 | Official Vue state management; replaces monolithic `reactive()` |
| Vue Router | 4 | `createWebHistory`; required for auth guards and multi-view structure |
| Supabase JS | v2 | Already in use; keep at v2 |
| vite-plugin-pwa | ^1.x | Zero-config Workbox; `registerType: 'prompt'` (not autoUpdate) |
| supabase CLI | latest | `supabase gen types` → `database.types.ts` |

### Conflict Resolution: Tailwind v3 vs v4

STACK.md recommended v4. PITFALLS.md flagged v4's dark mode default breaks `html.dark`. **Resolution: v3.4 for migration, v4 upgrade as a follow-on phase.**

v4 renames `shadow-sm`→`shadow-xs`, `bg-gradient-to-r`→`bg-linear-to-r` and others — unnecessary churn during a structural migration. Tailwind provides an official upgrade tool when ready.

---

## Key Architecture Decisions

1. **Supabase real-time subscription lives in `useTripStore`, not any component** — tabs mount/unmount on navigation; subscriptions in components disconnect on every tab switch. The Pinia store is a singleton.

2. **Single `createClient` call, ever** — `src/lib/supabase.ts` is the only file that calls `createClient`. Multiple instances share the same localStorage key and desync auth state silently.

3. **Anonymous link-sharing survives auth** — `/` with `?trip=UUID` has no auth guard. Auth is additive, not a gate. RLS policy allows reads when `link_token` matches OR `owner_id` = authenticated user.

4. **JSONB column stays as-is for Phase 1–3** — `Object.assign(state, data.data as TripState)` on load. First DB migration happens in Phase 4 (adds nullable `owner_id`).

5. **Three stores, six composables** — `useTripStore` (trip state, CRUD, realtime), `useAuthStore` (session, onAuthStateChange), `useUIStore` (dark mode, confirm dialog).

---

## Table Stakes Features

**Must have:**
- Supabase Auth (email + magic link + Google OAuth)
- Trip ownership (`owner_id` nullable column) with backward-compatible RLS
- Multi-trip dashboard at `/trips`
- Invite-by-link with auto-join (no email invites — Supabase doesn't plan to build team invites natively)
- PWA install + app shell offline cache
- Offline read (IndexedDB trip cache for airplane mode)
- Protected routes with auth guard (awaits `loading` before redirect)

**Differentiators:**
- Push notifications when group members add events
- Upcoming trip countdown on dashboard
- Trip status (Planning / Active / Past) from dates

**Defer to v2+:**
- Offline mutations with background sync (Safari still doesn't support Background Sync API)
- Trip duplication
- Per-user notification preferences

---

## Critical Pitfalls

| # | Pitfall | Prevention |
|---|---------|------------|
| 1 | `createClient` called multiple times → auth desync | Module-level singleton in `src/lib/supabase.ts` |
| 2 | Tailwind v4 dark mode default breaks `html.dark` | Use Tailwind v3 with `darkMode: 'class'` |
| 3 | Dynamic class names purged in production | Complete-string lookup tables; test `npm run build && npx serve dist` |
| 4 | `process.env` undefined in Vite | `VITE_` prefix + `import.meta.env` + startup assertion |
| 5 | Real-time subscriptions not cleaned up | Subscription in store, not components; `removeChannel()` not `unsubscribe()` |
| 6 | Service worker intercepts Supabase auth callbacks | `NetworkOnly` for `*.supabase.co`; auth paths in `navigateFallbackDenylist` |
| 7 | Auth guard redirects before session resolves | Guard awaits `useAuthStore.loading === false` |
| 8 | PWA `autoUpdate` destroys mid-session form state | Use `registerType: 'prompt'` with visible update banner |
| 9 | Supabase anon key in source history | Rotate key after migration; move to `.env.local` |

---

## Phase Order

| Phase | Name | Research needed? |
|---|---|---|
| 1 | Project Scaffold and Build Pipeline | No — standard patterns |
| 2 | Data Layer and Store Architecture | No — ARCHITECTURE.md provides implementations |
| 3 | UI Extraction (Tab-by-Tab) | No — mechanical extraction |
| 4 | Authentication | **Yes** — RLS dual-access policy syntax |
| 5 | PWA | **Yes** — IndexedDB + Workbox strategy |
| 6 | Notifications | **Yes** — VAPID + Edge Function + push chain |

### Phase Ordering Rationale

- Phases 1–2 establish the foundation every component imports from
- Phase 3 ports components while anonymous-only — fewest mental models
- Phase 4 adds auth without touching tab internals — clean separation
- Phase 5 adds PWA to a stable deployed app — regressions are attributable
- Phase 6 requires all prior infrastructure

---

## Confidence Assessment

| Area | Confidence |
|---|---|
| Stack | HIGH |
| Features | HIGH |
| Architecture | HIGH |
| Pitfalls | HIGH |
| Overall | **HIGH** |

**Gaps to address during implementation:**
- Pinia 3 + Vue 3 compatibility: verify on pinia.vuejs.org before Phase 2
- RLS dual-access policy: needs prototype before Phase 4 schema migration
- IndexedDB caching: design during Phase 5 research
- VAPID + push delivery failures: Phase 6 research

---

*Research completed: 2026-05-17 | Ready for roadmap: yes*
