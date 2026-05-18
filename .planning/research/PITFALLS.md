# Domain Pitfalls: Vue 3 CDN → Vite + TypeScript Migration

**Domain:** Vue 3 SPA migration (CDN → Vite + TS + Supabase + Tailwind + PWA)
**Researched:** 2026-05-17
**Applies to project:** TravelApp — single `index.html` (~3000 lines) → proper Vite project

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or invisible regressions.

---

### Pitfall 1: Supabase `createClient` Called Multiple Times (GoTrueClient Duplication)

**What goes wrong:** Vite's ES module system and HMR can cause `createClient` to run more than once if the Supabase client is not exported as a module-level singleton. Each call creates a new `GoTrueClient` instance sharing the same `localStorage` key — Supabase logs a warning ("Multiple GoTrueClient instances detected") and auth state synchronization between instances becomes undefined. In development with HMR this happens silently on every hot reload.

**Why it happens:** In the CDN app, the client is created once in a `<script>` block and lives on `window`. In a Vite module graph, every file that imports and calls `createClient()` gets its own instance unless you explicitly guard with a module-level singleton.

**Consequences:** Auth state desync between parts of the app, stale sessions being read from the wrong instance, difficult-to-reproduce login/logout bugs.

**Prevention:**
```typescript
// src/lib/supabase.ts — create ONCE, export the instance
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```
Every other file imports `supabase` from this module — never calls `createClient` itself.

**Detection:** Browser console warning "Multiple GoTrueClient instances detected in the same browser context." Also: signing out in one tab does not sign out the other.

**Migration phase:** Phase 1 (project scaffolding / Supabase wiring). Must be correct from the first line.

---

### Pitfall 2: `process.env` Is Undefined in Vite — Supabase Keys Silently Undefined

**What goes wrong:** The CDN app typically hardcodes Supabase URL/key directly in the script or uses `process.env.*`. Vite does not polyfill `process.env` — accessing it throws `ReferenceError: process is not defined` or returns `undefined`. The Supabase client is then initialized with `undefined` credentials and every database call silently fails (no auth, empty queries, misleading errors).

**Why it happens:** Vite exposes environment variables only via `import.meta.env`, and only variables prefixed `VITE_` are forwarded to client-side code. Non-prefixed variables are stripped for security.

**Consequences:** App loads, no JS error at startup, but every Supabase call returns 401 or null. Very hard to debug if you don't know the cause.

**Prevention:**
- Name all client-side env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Access them as `import.meta.env.VITE_SUPABASE_URL`
- Add a startup assertion: `if (!import.meta.env.VITE_SUPABASE_URL) throw new Error('Missing VITE_SUPABASE_URL')`
- Add types in `src/vite-env.d.ts`:
```typescript
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}
```
- Restart the dev server after adding `.env` variables (they are not hot-reloaded)

**Detection:** `import.meta.env.VITE_SUPABASE_URL` returns `undefined` at runtime; Supabase client throws on `createClient(undefined, undefined)` in v2.

**Migration phase:** Phase 1 (scaffolding). Block on this before any Supabase code is ported.

---

### Pitfall 3: Tailwind Dynamic Class Names Purged in Production Build

**What goes wrong:** The CDN version of Tailwind generates every class on demand in the browser. The installed version uses JIT/content scanning — it only includes classes found as complete, static strings in the scanned files. Any class name assembled at runtime (e.g., `` `text-${color}-500` `` or `` `bg-${category}` ``) will be present in development (dev server is more permissive) but will be **stripped in the production build**, causing invisible styling regressions that only appear after `vercel --prod`.

**Why it happens:** Tailwind's scanner is a text-based regex pass over source files — it cannot evaluate JavaScript. String interpolation produces partial tokens that don't match any known class.

**Consequences:** Category color chips (Transport=blue, Lodging=emerald, Food=amber, Activity=violet) are a known pattern in this app. If implemented as `` `bg-${category}-100` `` they will break in production silently.

**Prevention:**
- Use complete class name lookup objects instead of interpolation:
```typescript
const categoryBg: Record<string, string> = {
  transport: 'bg-blue-100 text-blue-700',
  lodging: 'bg-emerald-100 text-emerald-700',
  food: 'bg-amber-100 text-amber-700',
  activity: 'bg-violet-100 text-violet-700',
}
```
- For classes that truly must be dynamic, add them to the Tailwind `safelist` in `tailwind.config.ts`
- Ensure `content` in `tailwind.config.ts` covers `./src/**/*.{vue,ts,tsx}`
- Test with `npm run build && npx serve dist` — never rely solely on the dev server

**Detection:** Styles present in dev, missing after production build. Run `grep -r "bg-blue" dist/assets/*.css` — if absent, it was purged.

**Migration phase:** Phase 2 (porting components). Audit every dynamic class at the time of porting; do not defer.

---

### Pitfall 4: Tailwind v4 Dark Mode Default Changed From Class to Media Query

**What goes wrong:** Tailwind v4 (released January 2025) changed the default `darkMode` behavior from `class` to `@media (prefers-color-scheme: dark)`. If the migrated project installs Tailwind v4 without explicitly configuring `darkMode: 'selector'`, all `dark:` utility classes will respond to the OS preference rather than the `.dark` class toggle — breaking the user-controlled dark mode switch the app already has.

**Why it happens:** v4 moved configuration from `tailwind.config.js` (JS-first) to CSS-first with `@variant` declarations. The `darkMode: 'class'` key from v3 is no longer read the same way.

**Consequences:** The dark mode toggle appears to "work" (it adds `.dark` to `<html>`) but the UI does not respond to it — it only flips when the user changes their OS setting. In light mode OS + dark mode toggle = no dark styles applied.

**Prevention:**
- If using Tailwind v3: `darkMode: 'class'` in `tailwind.config.ts` is correct and sufficient
- If using Tailwind v4: Add to your CSS entry point:
```css
@import "tailwindcss";
@variant dark (&:where(.dark, .dark *));
```
- Decide which version to target at the start of migration — v3 is more documented and safer for a migration; v4 requires the `@tailwindcss/vite` plugin (not PostCSS plugin)
- Recommendation for this project: **start with Tailwind v3** (mature, battle-tested, PostCSS plugin works identically to CDN feature set). Upgrade to v4 separately after the migration stabilizes.

**Detection:** Dark mode toggle works in dev (HMR reloads), breaks after clean browser session. `dark:bg-gray-900` classes present in CSS but never applied.

**Migration phase:** Phase 1 (Tailwind installation decision). Must be decided before any component is ported.

---

### Pitfall 5: Supabase Realtime Subscriptions Not Cleaned Up — Memory Leak + Duplicate Events

**What goes wrong:** In the CDN single-file app, subscriptions are created once and live for the page lifetime — there is no component unmount. In the Vite/SFC version, components mount and unmount as routes change. If `supabase.channel().subscribe()` is called in `onMounted` without a corresponding `supabase.removeChannel()` in `onUnmounted`, each navigation creates a new subscription. After a few route transitions, the same database row change triggers the callback N times (once per orphaned subscription). This causes duplicate state updates, event handler explosion, and eventual browser tab slowdown.

**Why it happens:** `supabase.channel()` appends to an internal array that is never automatically cleaned. The Supabase client does not garbage-collect channels when no reference exists.

**Consequences:** Duplicate trip updates firing, chat messages appearing multiple times, WebSocket connections accumulating.

**Prevention:**
```typescript
// Inside a composable or component
let channel: ReturnType<typeof supabase.channel> | null = null

onMounted(() => {
  channel = supabase
    .channel('trips-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, handler)
    .subscribe()
})

onUnmounted(() => {
  if (channel) {
    supabase.removeChannel(channel)
    channel = null
  }
})
```
- Do not use `.unsubscribe()` — use `supabase.removeChannel()` which also removes it from the internal array
- Wrap subscription logic in a composable so cleanup is co-located with setup

**Detection:** `supabase.getChannels().length` growing over time in devtools; callback firing N times for one DB change after N navigations.

**Migration phase:** Phase 2 (porting realtime sync). Every subscription created must have a corresponding `removeChannel`.

---

## Moderate Pitfalls

---

### Pitfall 6: Missing `vercel.json` SPA Rewrite — 404 on Direct URL / Refresh

**What goes wrong:** Vue Router in `createWebHistory()` mode generates real URL paths (e.g., `/trips/abc123`). When the user refreshes or shares a direct link, Vercel tries to serve that path as a static file — which does not exist — and returns a 404. The app works fine if you only ever navigate from the root, masking this bug during development.

**Why it happens:** Vercel is a file server by default. Without a rewrite rule, every URL that isn't `index.html` or a static asset returns 404.

**Prevention:** Add `vercel.json` to the project root:
```json
{
  "rewrites": [{ "source": "/:path*", "destination": "/index.html" }]
}
```
Then implement a catch-all `{ path: '/:pathMatch(.*)*', component: NotFound }` route in Vue Router to show a proper 404 page for truly unknown paths, since the server will no longer return 404 itself.

**Detection:** Any direct URL other than `/` returns 404 after deploy. Works locally because Vite dev server handles this automatically.

**Migration phase:** Phase 1 (Vercel setup). Add `vercel.json` before the first deploy.

---

### Pitfall 7: Supabase Auth `onAuthStateChange` Listener Not Set Up — Stale Session After Token Refresh

**What goes wrong:** Getting the session once with `supabase.auth.getSession()` on app load is not sufficient. Access tokens expire (default: 1 hour). The Supabase client auto-refreshes silently, but if you store the session object in your reactive state without listening to `TOKEN_REFRESHED`, your app will hold an expired JWT. API calls start failing with 401 after 1 hour even though the user is "still logged in."

**Why it happens:** In the CDN app without auth, there was no session to manage. Adding auth without understanding the full refresh lifecycle is the single most common Supabase Auth mistake.

**Consequences:** Users get logged out silently after 1 hour, API calls 401, data stops loading. The bug only manifests after the session has been open for 1+ hours — hard to catch in testing.

**Prevention:**
```typescript
// In your auth composable / Pinia store, run once on app init
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
    user.value = session?.user ?? null
    // update reactive state with fresh session
  }
  if (event === 'SIGNED_OUT') {
    user.value = null
    // redirect to login
  }
})
```
- Never cache the `session.access_token` directly; always read it through the client or listen to `TOKEN_REFRESHED`
- Do not set `autoRefreshToken: false` in `createClient` options

**Warning signs:** Users report being logged out after ~1 hour. Auth-gated API calls return 401 intermittently.

**Migration phase:** Phase 3 (Supabase Auth implementation). Required before any authenticated route is built.

---

### Pitfall 8: Destructuring Pinia Store / `reactive()` Breaks Reactivity

**What goes wrong:** When migrating from a monolithic `reactive()` blob to Pinia stores, developers instinctively destructure store properties for convenience. Plain destructuring (`const { trips, activeTrip } = useTripsStore()`) produces dead copies — they are plain values disconnected from Vue's reactivity system. The UI will show the initial value and never update.

**Why it happens:** Pinia stores (and `reactive()` objects) are Proxy objects. Destructuring unwraps the Proxy and produces plain JS values. This is the same problem as `const { x } = reactive({ x: 1 })`.

**Consequences:** Components render correctly on first mount but never re-render when store state changes. Can appear as if realtime sync stopped working when it's actually a reactivity wiring problem.

**Prevention:**
```typescript
import { storeToRefs } from 'pinia'
const tripsStore = useTripsStore()
const { trips, activeTrip } = storeToRefs(tripsStore) // reactive refs
const { loadTrips, addEvent } = tripsStore             // actions — destructure normally
```
- Use `storeToRefs` for all state and getters; destructure actions directly
- For `reactive()` objects, use `toRefs()` if destructuring is needed

**Detection:** State updates in devtools/Pinia inspector but template does not re-render.

**Migration phase:** Phase 2 (state migration to Pinia). Lint rule `pinia/prefer-use-store-destructuring` can catch this automatically.

---

### Pitfall 9: TypeScript Strict Mode — `ref<T>` Initial `null` and Optional Chaining Gaps

**What goes wrong:** With `strict: true` in `tsconfig.json`, template refs and data refs initialized to `null` require explicit null handling everywhere they are accessed. The most common failure points: `templateRef.value.focus()` throws at runtime if the component hasn't mounted yet; `reactive()` objects with complex nested types inferred incorrectly.

**Specific gotchas:**
1. `const el = ref<HTMLElement>(null)` — TypeScript error because `null` is not `HTMLElement`. Use `ref<HTMLElement | null>(null)`.
2. `reactive<MyType>({})` — the generic argument is not properly inferred for nested ref unwrapping. Prefer `ref<MyType>()` or type the variable: `const state: MyType = reactive({...})`.
3. `defineProps<{ trip: Trip }>()` — without `withDefaults`, optional props with object/array types require factory functions for defaults; incorrect defaults cause build errors.
4. Event handler args: `(e) => e.target.value` fails; must be `(e: Event) => (e.target as HTMLInputElement).value`.

**Prevention:**
- Set `"strict": true` and `"moduleResolution": "bundler"` in `tsconfig.json` from the start — fixing accumulated errors later is far worse than fixing them as you port
- Type all template refs as `ref<ElementType | null>(null)` and use optional chaining: `el.value?.focus()`
- Prefer `ref<T>` over `reactive<T>` for objects where type inference matters
- Use `defineProps` with TypeScript generics, not runtime syntax, in `<script setup>`

**Detection:** `vue-tsc --noEmit` fails on build. TypeScript errors in editor if Volar is installed.

**Migration phase:** Phase 1 (TypeScript config). Set `strict: true` from day one. Do not defer.

---

### Pitfall 10: `vite-plugin-pwa` — Service Worker Caches Old App After Deploy (Silent Stale)

**What goes wrong:** After deploying a new version, users who have the PWA installed continue serving the old service worker from cache. The new service worker is downloaded but sits in "waiting" state. Unless you implement an update prompt with `skipWaiting`, users are stuck on the old version indefinitely (until they manually close all tabs and reopen).

The opposite failure also occurs: setting `registerType: 'autoUpdate'` silently reloads the page mid-session, destroying unsaved form state.

**Why it happens:** The default `registerType` is `'prompt'` but no UI prompt is built unless you wire it up. With `'autoUpdate'`, the page forcibly reloads. Neither is appropriate for a collaborative trip-planning app where mid-session reload can lose entered data.

**Prevention:**
- Use `registerType: 'prompt'`
- Implement a lightweight update banner using the virtual PWA module:
```typescript
import { useRegisterSW } from 'virtual:pwa-register/vue'
const { needRefresh, updateServiceWorker } = useRegisterSW()
// Show a toast: "New version available" → button calls updateServiceWorker(true)
```
- Always set `workbox.cleanupOutdatedCaches: true` to prevent stale revision entries
- Set `workbox.skipWaiting: false` (default) so new SW waits for explicit activation
- Test update flow locally: `npm run build && npx vite preview` — the dev server bypasses service workers entirely

**Detection:** After deploy, existing users still see old UI. PWA devtools shows "Service Worker: Waiting to activate."

**Migration phase:** Phase 4 (PWA implementation). Do not default to `autoUpdate` without deliberate consideration.

---

### Pitfall 11: `vite-plugin-pwa` — Supabase Auth Callbacks Intercepted by Service Worker Cache

**What goes wrong:** Supabase Auth uses redirect-based OAuth and magic links — the browser navigates to a callback URL (e.g., `/auth/callback?code=...`) that must hit the live server (or at least the SPA's `index.html`) to exchange the code for a session. If the service worker intercepts this URL with a `CacheFirst` or `NetworkFirst` strategy and returns a cached `index.html` before the query params are processed, the auth exchange fails silently.

**Prevention:**
- Add Supabase API URLs and auth callback paths to the `workbox.navigateFallbackDenylist` or exclude them from `runtimeCaching`:
```typescript
workbox: {
  navigateFallbackDenylist: [/^\/auth\//],
  runtimeCaching: [{
    urlPattern: /^https:\/\/.*\.supabase\.co\//,
    handler: 'NetworkOnly', // never cache Supabase API responses
  }]
}
```
- Never cache Supabase API responses (realtime, auth, database) — always `NetworkOnly`

**Detection:** OAuth or magic link flows work in dev (no SW), break in PWA-installed mode. Users get redirected to login immediately after clicking an email link.

**Migration phase:** Phase 4 (PWA). Must be addressed when configuring `runtimeCaching`.

---

## Minor Pitfalls

---

### Pitfall 12: Vue Plugin Registration Differences (CDN Global vs. `app.use()`)

**What goes wrong:** In the CDN app, plugins like Vue Router or Pinia may be registered on the global `Vue` object. In the Vite module app, every plugin must be explicitly registered via `app.use(router).use(pinia)` on the `createApp()` instance. Forgetting to call `app.use()` means the plugin appears to import fine but its `inject`/`provide` context is never established — `useRouter()` or `useStore()` return `undefined` or throw.

**Prevention:**
```typescript
// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
```
Order matters: install Pinia before Router if router guards use stores.

**Migration phase:** Phase 1 (main.ts wiring).

---

### Pitfall 13: Inline Templates and Global Component Registration Do Not Work in SFCs

**What goes wrong:** The CDN app may register components globally (`app.component('MyComp', { ... })`) or use inline template strings. In `.vue` SFCs with `<script setup>`, components imported in `<script setup>` are automatically locally registered — there is no need for `app.component()`. Attempting to use globally-registered components from CDN patterns may cause "component not found" warnings if the import/registration style is mixed.

**Prevention:** Import components directly in each SFC that uses them. Use global registration only for truly universal UI primitives (e.g., icons, base buttons). Avoid inline template strings entirely — they do not work in SFC mode.

**Migration phase:** Phase 2 (component extraction).

---

### Pitfall 14: `@apply` and Custom CSS Directives Unavailable in CDN Build

**What goes wrong:** The Tailwind CDN build does not support `@apply`, `@layer`, or `@screen` directives. If the existing `index.html` has none of these (pure utility classes only), the migration is clean. If any were added via `<style>` tags using CDN's browser compiler, they need to be moved to a proper `.css` file processed by PostCSS.

**Prevention:** Audit `<style>` tags in `index.html` for any `@apply` usage before migration. If found, migrate them to `src/assets/main.css` alongside the Tailwind directives.

**Migration phase:** Phase 1 (Tailwind setup). Quick audit before anything else.

---

### Pitfall 15: Dark Mode Toggle Requires Explicit `document.documentElement.classList` Management

**What goes wrong:** With `darkMode: 'class'` in Tailwind (v3) or the `@variant dark` selector in v4, dark mode is driven by the presence of the `.dark` class on `<html>`. In the CDN app this is typically managed by a simple script. In the migrated app, this logic must survive HMR, persist to `localStorage`, and be initialized before Vue mounts (to avoid flash of wrong theme). Initializing it inside a Vue component causes a flash of light mode on page load.

**Prevention:**
- Add a blocking inline script to `index.html` (before `<body>`) that reads `localStorage` and sets the class before Vue boots:
```html
<script>
  if (localStorage.theme === 'dark' || 
      (!localStorage.theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark')
  }
</script>
```
- Or use VueUse's `useDark()` composable which handles this correctly including SSR guard

**Migration phase:** Phase 2 (porting existing dark mode logic).

---

## Phase-Specific Warnings Summary

| Migration Phase | Topic | Likely Pitfall | Mitigation |
|----------------|-------|---------------|------------|
| Phase 1: Scaffolding | Supabase client | Multiple GoTrueClient instances | Module-level singleton in `src/lib/supabase.ts` |
| Phase 1: Scaffolding | Environment variables | `process.env` undefined | `VITE_` prefix + `import.meta.env` + startup assertion |
| Phase 1: Scaffolding | Tailwind version choice | v4 dark mode default changed | Decide v3 vs v4 explicitly; configure `darkMode` before first component |
| Phase 1: Scaffolding | Vercel routing | 404 on direct URL | Add `vercel.json` with SPA rewrite before first deploy |
| Phase 1: Scaffolding | TypeScript | Accumulated strict errors | Enable `strict: true` from day one |
| Phase 2: Porting | Dynamic Tailwind classes | Classes purged in production | Audit all interpolated class names; use lookup objects |
| Phase 2: Porting | Pinia migration | Destructuring breaks reactivity | Use `storeToRefs()` for state, destructure actions normally |
| Phase 2: Porting | Dark mode flash | Wrong theme on page load | Blocking inline script in `index.html` before Vue mounts |
| Phase 2: Porting | Component registration | Global vs local registration mismatch | Import components in each SFC; avoid `app.component()` globally |
| Phase 3: Auth | Supabase Auth | Stale session after token expiry | Set up `onAuthStateChange` listener on app init |
| Phase 3: Auth | Supabase Auth | No listener for SIGNED_OUT | Handle SIGNED_OUT event explicitly; redirect to login |
| Phase 2 + 3: Realtime | Supabase Realtime | Memory leak / duplicate events | `removeChannel()` in every `onUnmounted` |
| Phase 4: PWA | vite-plugin-pwa | Silent stale app after deploy | Use `registerType: 'prompt'`; wire update banner |
| Phase 4: PWA | vite-plugin-pwa | Supabase auth callbacks cached | `NetworkOnly` for all `*.supabase.co` URLs; deny auth routes |

---

## Sources

- Supabase Auth Session Docs: https://supabase.com/docs/guides/auth/sessions
- Supabase `onAuthStateChange` reference: https://supabase.com/docs/reference/javascript/auth-onauthstatechange
- Supabase `removeChannel` reference: https://supabase.com/docs/reference/javascript/removechannel
- Vite Environment Variables: https://vite.dev/guide/env-and-mode
- Vite Plugin PWA Guide: https://vite-pwa-org.netlify.app/guide/
- Vite Plugin PWA Workbox: https://vite-pwa-org.netlify.app/workbox/
- Tailwind v4 Upgrade Guide: https://tailwindcss.com/docs/upgrade-guide
- Tailwind v3 Dark Mode: https://v3.tailwindcss.com/docs/dark-mode
- Vue 3 TypeScript Composition API: https://vuejs.org/guide/typescript/composition-api.html
- Vue Router History Mode / Vercel: https://router.vuejs.org/guide/essentials/history-mode
- Pinia `storeToRefs`: https://pinia.vuejs.org/core-concepts/state.html
- Supabase GoTrueClient multiple instances issue: https://github.com/supabase/supabase-js/issues/1394
- Tailwind dynamic class purging (Vue Land FAQ): https://vue-land.github.io/faq/missing-tailwind-classes
- vite-plugin-pwa update strategies: https://vite-pwa-org.netlify.app/guide/prompt-for-update
- Vercel SPA 404 fix: https://vercel.com/kb/guide/why-is-my-deployed-project-giving-404
