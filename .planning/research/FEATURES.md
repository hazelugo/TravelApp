# Feature Landscape: TravelApp Vite Migration

**Domain:** Group travel planning + collaborative coordination SPA
**Researched:** 2026-05-17
**Overall Confidence:** HIGH — well-established patterns, confirmed against Supabase docs and Vite ecosystem

---

## What the Migration Unlocks (Executive Context)

The single-file CDN approach had hard ceilings the Vite migration removes:

| Limitation | CDN Approach | Vite + TypeScript |
|---|---|---|
| Auth | Anyone with link can write | Supabase Auth + RLS enforces ownership |
| Offline | Zero — network required | Service worker + IndexedDB cache |
| Install | Not installable | PWA manifest + add-to-homescreen |
| Push notifications | Impossible without service worker | Web Push via service worker + VAPID |
| Type safety | None | Generated Supabase TS types, prop type checking |
| Code splitting | None — all 3000 lines load | Per-route lazy imports |
| HMR | Full page reload on every edit | Sub-50ms component-level HMR |
| Testing | Untestable (global window state) | Vitest + component isolation |

The features below are written in terms of what *users experience*, not what the technology enables.

---

## Table Stakes

Features users will expect the moment they see an auth screen or install prompt. Absence breaks trust or prevents core usage.

### Authentication & Identity

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| Email + password sign-up and login | Default expectation for any app with accounts | Low | Supabase Auth built-in. Validate email format client-side; show password strength indicator |
| Magic link / passwordless login | Travel-group users log in infrequently; magic link removes the "forgot password" path entirely | Low | Supabase `signInWithOtp`. Notion saw onboarding completion rise from 64% to 87% removing passwords. Recommend this as *default* flow |
| Google OAuth | Most travel-age users have Google accounts; reduces friction to near-zero for new members | Low | One Supabase provider toggle. Skip Apple/Facebook unless explicitly requested |
| Persistent session across refresh | Users expect to stay logged in | Low | Supabase JS v2 handles via localStorage by default |
| "Sign out" that actually clears state | Basic security hygiene | Low | `supabase.auth.signOut()` + clear Pinia stores |
| Protected routes (redirect unauthenticated users) | Any link to the app must resolve correctly | Low | Vue Router navigation guard checking `supabase.auth.getUser()` |
| Auth state recovery on page load | App must not flash login screen if session exists | Low | Check session in `App.vue` `onMounted` before rendering; short loading state is acceptable |
| Password reset via email | Users will forget passwords — no escape hatch = support burden | Low | Supabase `resetPasswordForEmail`. Required even if magic link is default |

### Trip Ownership + Sharing

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| Trip has an owner (creator) | Required for RLS — every row needs `user_id` | Medium | Add `owner_id uuid references auth.users` to trips table. Single migration, backward-compatible if nullable |
| Original link-based access still works | Existing shared links must not break | Medium | RLS policy: allow read if `link_token` matches AND write if `auth.uid() = owner_id OR is_member`. Preserves current behavior |
| Trip members list (who can edit) | Once ownership exists, users expect to control who edits their trip | Medium | `trip_members` join table: `(trip_id, user_id, role)`. Roles: owner / editor / viewer |
| Invite by link (not email lookup) | Sending a link is how this app's users share trips; email-based invites require knowing someone's account email | Medium | Generate invite token → join via URL → if authed, auto-add to members; if not, prompt sign-up then add |

### Multi-Trip Dashboard

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| Trips list on login | Users with accounts expect to see their trips without knowing a URL | Low | Query trips where `owner_id = auth.uid() OR user_id IN trip_members` |
| Create new trip from dashboard | Obvious entry point | Low | |
| Trip cards showing destination, dates, member count | Scannable at a glance | Low | Reuse existing trip data structure |
| "Continue planning" deep-link to last-viewed trip | Reduces clicks for returning users | Low | Store `lastTripId` in localStorage |
| Empty state for new users | Zero trips = critical first impression | Low | Warm prompt to "Plan your first trip" with CTA |

### PWA — Install + Offline Basics

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| Installable (add-to-homescreen on iOS/Android) | "Travel app" strongly implies mobile use; installed apps have home screen presence | Low | `vite-plugin-pwa` with manifest: `name`, `short_name`, `icons` (192+512px), `display: standalone`, `theme_color` matching brand indigo |
| App shell loads without network | Installed app that shows a blank white screen on airplane mode is broken | Medium | Cache app shell (HTML/CSS/JS) with cache-first strategy via Workbox `generateSW` |
| Previously-viewed trip readable offline | Users open the app at the airport to check their itinerary | Medium | Cache trip data in IndexedDB on load; service worker serves stale data when offline |
| Offline banner / status indicator | Users need to know when they're offline so they don't expect changes to save | Low | Vue composable watching `navigator.onLine` + `online`/`offline` events |

---

## Differentiators

Features that set TravelApp apart from Wanderlog (itinerary-only), Splitwise (money-only), and Google Sheets (the real competitor). Not expected, but they create word-of-mouth.

### Notifications That Actually Help

| Feature | Value Proposition | Complexity | Notes |
|---|---|---|---|
| Push notification when a group member adds an event | "Wait, Jake just added dinner plans" — keeps the group in sync without group chats | High | Requires: VAPID key pair, service worker `push` handler, Supabase Edge Function triggered by DB change, subscription storage table. Use Web Push Protocol directly or integrate OneSignal (Supabase partner) |
| Push notification when the trip date is approaching | Reminder nudge 7 days and 1 day before departure | Medium | Supabase pg_cron or Edge Function scheduled trigger. High engagement, low complexity once push infra exists |
| In-app notification feed | Fallback for users who haven't granted push permission; surfaces recent activity | Medium | `notifications` table, RLS-scoped to user. Realtime subscription for live updates |
| Notification preferences per trip | Power users want control; casual users want silence | Low | Simple boolean flags in `trip_members`: `push_enabled`, `activity_feed_enabled` |

**Architecture note:** Supabase does not send push natively. The correct pattern is: Database trigger → Supabase Edge Function → Web Push API (VAPID) → service worker `push` event → `showNotification()`. Store VAPID subscriptions in a `push_subscriptions` table scoped by `user_id`.

### Offline-First Mutations

| Feature | Value Proposition | Complexity | Notes |
|---|---|---|---|
| Add/edit events while offline, sync on reconnect | Airport, airplane, poor hotel WiFi — the exact moments people need the app | High | IndexedDB mutation queue → Background Sync API (Chromium) + `online` event fallback (Firefox/Safari). Workbox Background Sync plugin or custom queue. Replay must be ordered and idempotent (use client-generated UUIDs) |
| Optimistic UI for all mutations | No spinner on every tap — app feels native | Medium | Write to local state immediately; roll back on sync failure with user toast |
| Conflict resolution on reconnect | Two members edited offline simultaneously | High | Last-write-wins is acceptable for V1. Flag for phase-specific research — CRDT/operational transform is overkill for this use case |

### Progressive Trip Planning UX

| Feature | Value Proposition | Complexity | Notes |
|---|---|---|---|
| Trip "status" (Planning / Booked / Active / Past) | Groups move through phases; the UI should reflect that | Low | Derive from dates: planning = future + no events; active = dates include today; past = end date passed |
| Upcoming trip countdown on dashboard card | "17 days until Barcelona" is delightful; amplifies excitement (design principle #1) | Low | Simple date-diff display |
| Past trips archive (read-only) | Nostalgia and reference; prevents dashboard clutter | Low | Filter, don't delete. Past trips locked from editing |
| Trip duplication ("Plan another like this") | Friend groups repeat similar trips; copying saves setup | Medium | Deep copy all events/travelers, reset dates/payments |

### Component Architecture That Enables Future Features

(This is a developer-facing differentiator, but it directly enables the user-facing ones above.)

| Feature | Value Proposition | Complexity | Notes |
|---|---|---|---|
| Per-feature Pinia stores | `useAuthStore`, `useTripStore`, `useItineraryStore`, `usePaymentsStore` | Low | Flat store per domain. Each store owns its Supabase subscription and exposes `loading`, `error`, `data` |
| Composable for Supabase realtime per entity | `useRealtimeTrip(tripId)` — encapsulates channel subscribe/unsubscribe lifecycle | Low | Prevents memory leaks from orphaned subscriptions; testable in isolation |
| Generated TypeScript types from Supabase schema | `supabase gen types typescript` in CI | Low | Catches schema/client mismatches at compile time, not runtime |
| Route-based code splitting | `() => import('./views/TripView.vue')` | Low | Vite handles automatically with dynamic imports in Vue Router |

---

## Anti-Features

Explicitly out of scope. Document these to prevent scope creep during roadmap execution.

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| Apple Sign-In | Complex entitlement setup, App Store requirement only applies to native; for web-only PWA the requirement doesn't apply | Google OAuth covers 90% of the friction reduction. Add only if user research shows demand |
| Email-based invite system (send invite to specific email) | Requires knowing whether the recipient has an account; complex error states ("no account found"); support burden | Invite-by-link is sufficient and matches how the app already works. Members join via link, get auto-added on auth |
| In-app booking / reservation API | TripIt's core feature; requires hotel/flight API integrations, affiliate deals, PCI compliance for payments | This app's value is *planning and coordination*, not booking. Link events to external booking confirmations |
| AI itinerary suggestions | Trendy but distracts from the app's core job (organizing *your* group's plan) | Out of scope for this milestone. The app is a coordination tool, not a recommendation engine |
| Offline write sync with CRDT / operational transform | Technically elegant but massively complex for the conflict rate this app will see | Last-write-wins for V1. Revisit only if user research shows concurrent offline edits causing data loss at meaningful frequency |
| Native iOS / Android app | PROJECT.md explicitly excludes this; PWA covers the mobile use case | Ship PWA, measure install rate, revisit only if performance or API access gaps emerge |
| Paid tiers / billing | Out of scope per PROJECT.md | No Stripe, no feature gates, no usage limits in this milestone |
| Social features (public trip pages, "follow" other travelers) | Completely different product direction; requires content moderation | Not this product. All trips are private to their group |
| File attachments (PDFs, booking confirmations) | Supabase Storage adds complexity; photo wall already handles media | Link to external docs (Google Drive, etc.) from event notes field |

---

## Feature Dependencies

```
Supabase Auth
  └─ Trip ownership (owner_id column)
      └─ RLS policies on trips table
          └─ Trip members table (invite-by-link)
              └─ Member-scoped notifications
                  └─ Push notification subscriptions table

vite-plugin-pwa (service worker registration)
  └─ App shell offline cache (static assets)
      └─ IndexedDB trip cache (dynamic data)
          └─ Offline mutation queue
              └─ Background sync on reconnect

Push infrastructure (VAPID keys + Edge Function)
  └─ Push subscription storage
      └─ In-app notification feed (parallel, no dependency)
```

---

## MVP Recommendation

Prioritize in this order for the migration milestone:

1. **Supabase Auth (email + Google OAuth + magic link)** — Everything downstream requires a user identity
2. **Trip ownership + backward-compatible RLS** — Schema migration before any UI work; must not break existing shared links
3. **Multi-trip dashboard** — Core UX change; the visible payoff of having accounts
4. **PWA install + app shell offline cache** — High perceived value, low implementation cost via vite-plugin-pwa
5. **Invite-by-link with auto-join** — Replaces link-based sharing with authenticated equivalent
6. **Offline read (IndexedDB trip cache)** — Cache on load; no mutation queue needed for V1
7. **Push notifications** — Requires all auth + service worker infrastructure to exist first; schedule as final phase

**Defer to future milestone:**
- Offline mutations with background sync (high complexity; validate demand first with offline banner analytics)
- Per-user notification preferences (build after push works end-to-end)
- Trip duplication (useful but not blocking)

---

## Competitive Gap Analysis

TravelApp's combination of itinerary + cost splitting + group coordination in one tool is its core moat. The competitors split these:

| Competitor | Itinerary | Cost Splitting | Real-time Sync | Auth + Accounts | Offline |
|---|---|---|---|---|---|
| Wanderlog | Strong | Basic | No | Yes | No |
| TripIt | Strong | No | No | Yes | Partial |
| Splitwise | No | Strong | No | Yes | No |
| **TravelApp** | Strong | **Strong** | **Yes** | Adding | Adding |

The auth + PWA migration closes the gap on the two things that prevent TravelApp from being the default recommendation: no accounts (link sharing feels fragile to new users) and no offline capability.

---

## Sources

- Supabase RLS documentation: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Auth documentation: https://supabase.com/docs/guides/auth
- Supabase invite team member discussion: https://github.com/orgs/supabase/discussions/6055
- RLS for team invite system (BoardShape): https://boardshape.com/engineering/how-to-implement-rls-for-a-team-invite-system-with-supabase
- Supabase RLS production patterns (MakerKit): https://makerkit.dev/blog/tutorials/supabase-rls-best-practices
- vite-plugin-pwa official guide: https://vite-pwa-org.netlify.app/guide/
- Vue 3 + Vite PWA 2025 definitive guide: https://medium.com/@Christopher_Tseng/build-a-blazing-fast-offline-first-pwa-with-vue-3-and-vite-in-2025-the-definitive-guide-5b4969bc7f96
- PWA offline-first architecture patterns: https://beefed.ai/en/offline-first-pwa-architecture
- Background sync with IndexedDB + Supabase: https://oluwadaprof.medium.com/building-an-offline-first-pwa-notes-app-with-next-js-indexeddb-and-supabase-f861aa3a06f9
- Push notifications Supabase docs: https://supabase.com/docs/guides/functions/examples/push-notifications
- Magic link vs password UX (Baytechconsulting): https://www.baytechconsulting.com/blog/magic-links-ux-security-and-growth-impacts-for-saas-platforms-2025
- Login/signup UX best practices 2025 (AuthGear): https://www.authgear.com/post/login-signup-ux-guide/
- Vue 3 + TypeScript enterprise architecture 2025: https://eastondev.com/blog/en/posts/dev/20251124-vue3-typescript-best-practices/
- Pinia modular store architecture: https://medium.com/@vasanthancomrads/building-modular-store-architecture-with-pinia-in-large-vue-apps-0131e3d05430
- Group trip app comparison 2026 (TripProf): https://tripprof.com/en/blog/best-group-travel-planning-apps/
- Wanderlog vs TripIt 2025 comparison: https://www.wandrly.app/comparisons/wanderlog-vs-tripit
