# Technology Stack: Vue 3 + Vite + TypeScript Migration

**Project:** TravelApp CDN → Vite migration
**Researched:** 2026-05-17
**Confidence:** HIGH (most items verified via official docs or multiple current sources)

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vue 3 | ^3.5.x | UI framework | Already in use; 3.5 is stable production release; 3.6 is beta (avoid) |
| Vite | ^6.x | Build tool + dev server | v6 is the current LTS-equivalent; v8 just released but v6 is battle-tested; use 6 for this migration |
| @vitejs/plugin-vue | ^5.x | SFC compilation | Official Vue Vite plugin; required for .vue file handling |
| TypeScript | ^5.x | Type safety | Supabase gen types output is TS; Vue 3 written in TS; required for full toolchain |
| vue-tsc | ^2.x | TS type checking | Wraps tsc with SFC awareness; used in `build` script for CI type gating |

**Why Vite 6 not 8:** Vite 8.0 was released in May 2026 and is very new. For a migration of this scope, use Vite 6 (the prior major, still receiving security patches). Upgrade to Vite 8 in a separate step after the migration is stable.

**Node.js requirement:** Vite 6 requires Node.js 20.0.0 minimum.

---

### CSS

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | **v4.x** (^4.3) | Utility CSS | See detailed section below |
| @tailwindcss/vite | ^4.x | Vite integration | Native Vite plugin; replaces PostCSS config entirely in v4 |

**Tailwind v4 vs v3 Decision: Use v4.**

This is a greenfield Vite project (migration, not upgrade of a v3 codebase), so there is no v3 lock-in. Starting on v4 is correct.

Key facts:
- Tailwind v4.3 is current stable (May 2026)
- The `@tailwindcss/vite` plugin replaces `postcss.config.js` entirely — simpler setup
- The existing CDN app used Tailwind but has no `tailwind.config.js` — nothing to port
- The automated upgrade tool (`npx @tailwindcss/upgrade`) handles class renames, but since you are writing components from scratch during migration, this is not needed

**Breaking changes from v3 that affect the existing HTML source:**

| v3 class | v4 class | Impact |
|----------|----------|--------|
| `bg-gradient-to-r` | `bg-linear-to-r` | Any gradient cards in existing UI |
| `shadow-sm` | `shadow-xs` | Widespread — check all cards |
| `shadow` (default) | `shadow-sm` | Widespread |
| `rounded-sm` | `rounded-xs` | Per CLAUDE.md: `rounded-2xl` is standard — only affects variants |
| `outline-none` | `outline-hidden` | Form inputs |
| `flex-shrink-0` | `shrink-0` | Layout utilities |
| `overflow-ellipsis` | `text-ellipsis` | Text truncation |
| `!important` prefix | suffix | `!flex` → `flex!` |

**Browser support caveat:** v4 requires Safari 16.4+, Chrome 111+, Firefox 128+. For a PWA travel app targeting modern phones, this is acceptable. If older Android WebView support is required, fall back to v3.4.

**@apply in Vue SFCs:** In v4, `<style>` blocks using `@apply` must include `@reference "../../src/style.css"` to reference the theme. Better practice: use CSS custom properties directly (`var(--color-indigo-600)` etc.) or keep all styles in templates.

---

### State Management

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Pinia | ^3.x | Global state | Official Vue recommendation; replaces Vuex; full TS inference out of box |

**Vuex is not an option.** Pinia is the officially endorsed replacement. Pinia 3 dropped Vue 2 support and targets Vue 3 exclusively. It aligns with `<script setup>` / Composition API patterns used in the existing codebase.

The existing app uses `reactive()` top-level state — migrate to Pinia stores mapped by domain: `useTripStore`, `useAuthStore`, `useUIStore`.

---

### Routing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vue Router | ^4.x | SPA routing | Official Vue 3 router; required for Auth guards and multi-view structure |

Setup pattern for this app:

```typescript
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: () => import('./views/HomeView.vue') },
    { path: '/trip/:id', component: () => import('./views/TripView.vue') },
    { path: '/login', component: () => import('./views/AuthView.vue') },
  ]
})
```

Use `createWebHistory` (not hash mode) — Vercel handles the SPA rewrite via `vercel.json`.

---

### Supabase

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @supabase/supabase-js | ^2.x | DB, Auth, Realtime | Already in use; v2 is current stable; do not upgrade to v3 during migration |
| supabase CLI | latest | Type generation | `npx supabase gen types` generates `database.types.ts` from live schema |

**Type generation workflow:**

```bash
# One-time / on schema change
npx supabase gen types --lang=typescript --project-id "$PROJECT_REF" > src/types/database.types.ts
```

Add to `package.json`:
```json
"scripts": {
  "gen:types": "supabase gen types --lang=typescript --project-id \"$PROJECT_REF\" > src/types/database.types.ts"
}
```

**Typed client setup:**
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

The existing schema (trips table with JSONB state) does not need migration. The generated types will reflect the current schema; existing real-time sync logic ports directly.

**Supabase Auth pattern (new requirement):**

Wrap auth in a composable rather than scattering `supabase.auth.*` calls:

```typescript
// src/composables/useAuth.ts
export function useAuth() {
  const user = ref(null)
  supabase.auth.onAuthStateChange((_, session) => {
    user.value = session?.user ?? null
  })
  const signIn = (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password })
  const signOut = () => supabase.auth.signOut()
  return { user, signIn, signOut }
}
```

---

### PWA

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| vite-plugin-pwa | ^1.x | Service worker, manifest | Zero-config PWA for Vite; official Vite-ecosystem plugin; supports Workbox |

Minimal config to add to `vite.config.ts`:

```typescript
import { VitePWA } from 'vite-plugin-pwa'

VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'TravelApp',
    short_name: 'TravelApp',
    theme_color: '#6366f1', // indigo-500
    display: 'standalone',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ]
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
  }
})
```

`registerType: 'autoUpdate'` means the service worker silently updates on new deploy — appropriate for a travel app where users need current data.

---

### TypeScript Configuration

**tsconfig.json pattern (verified against official @vue/tsconfig):**

```json
{
  "extends": "@vue/tsconfig/tsconfig.dom.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] },
    "strict": true,
    "verbatimModuleSyntax": true,
    "jsx": "preserve",
    "jsxImportSource": "vue",
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src/**/*", "env.d.ts"]
}
```

Install the base config:
```bash
npm install -D @vue/tsconfig
```

**Two tsconfig files pattern** (what `create-vue` scaffolds):

- `tsconfig.json` — references app and node configs
- `tsconfig.app.json` — source files with DOM lib
- `tsconfig.node.json` — vite.config.ts with Node types

**vue-tsc in build script:**
```json
"scripts": {
  "build": "vue-tsc --noEmit && vite build",
  "type-check": "vue-tsc --noEmit"
}
```

This gates deploys on type correctness. Vite itself does not type-check — it only transpiles.

---

### Deployment

| Technology | Config | Purpose |
|------------|--------|---------|
| Vercel | `vercel.json` | SPA routing + static deploy |

**vercel.json** (required for Vue Router history mode):

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Without this, any direct URL to `/trip/abc123` returns a 404 because Vercel tries to serve a static file.

Vercel auto-detects Vite and sets `outputDirectory: dist` and `buildCommand: npm run build`. No additional `vercel.json` build config needed — the rewrites block is sufficient.

---

## Full Dependency List

### Production

```bash
npm install vue vue-router pinia @supabase/supabase-js
```

### Dev

```bash
npm install -D \
  vite \
  @vitejs/plugin-vue \
  tailwindcss \
  @tailwindcss/vite \
  typescript \
  vue-tsc \
  @vue/tsconfig \
  vite-plugin-pwa \
  supabase
```

---

## Recommended Folder Structure

```
src/
├── assets/            # Static assets (fonts, images, icons)
├── components/        # Shared UI components
│   ├── ui/            # Generic: Button, Card, Modal, Badge
│   ├── trip/          # Trip-domain: TripCard, ItineraryItem, BudgetBar
│   ├── auth/          # Auth forms and guards
│   └── layout/        # AppHeader, BottomNav, Sidebar
├── composables/       # Reusable composition functions
│   ├── useAuth.ts
│   ├── useTrip.ts
│   ├── useRealtime.ts
│   └── useToast.ts
├── stores/            # Pinia stores
│   ├── auth.ts
│   ├── trips.ts
│   └── ui.ts
├── views/             # Route-level pages (one per route)
│   ├── HomeView.vue
│   ├── TripView.vue
│   └── AuthView.vue
├── lib/               # Third-party client setup
│   └── supabase.ts
├── types/             # TypeScript types
│   ├── database.types.ts    # Generated by supabase gen types
│   └── index.ts             # App-level types
├── router/
│   └── index.ts
├── style.css          # Tailwind @import "tailwindcss" + custom theme
└── main.ts            # App entry point
```

**Key decisions baked into this structure:**

- `views/` are route-level only — no logic, just layout assembly
- `composables/` hold all business logic — mirrors current `reactive()` patterns
- `lib/supabase.ts` is the single import point for the typed Supabase client
- `database.types.ts` is generated, not hand-edited — checked into git

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| State | Pinia | Vuex | Vuex is in maintenance mode; no first-class TS inference; officially superseded |
| CSS | Tailwind v4 | Tailwind v3 | v3 enters maintenance-only; v4 is simpler to configure with Vite; new project has no v3 lock-in |
| CSS | Tailwind v4 | UnoCSS | Tailwind v4 is already fast enough (Rust engine); UnoCSS adds complexity; brand uses Tailwind class names |
| Build | Vite 6 | Vite 8 | Vite 8 is too new for a migration; use 6, upgrade separately |
| Router | Vue Router v4 | TanStack Router | Vue Router is the standard; TanStack is React-first |
| PWA | vite-plugin-pwa | Manual service worker | vite-plugin-pwa handles Workbox integration, manifest injection, update lifecycle |
| Auth | Supabase Auth | Auth0 / Clerk | Supabase Auth is already in the stack; no additional vendor; free tier covers this app |

---

## Confidence Assessment

| Area | Confidence | Source |
|------|------------|--------|
| Vite version recommendation (v6) | HIGH | vite.dev releases page |
| Tailwind v4 + @tailwindcss/vite | HIGH | Official tailwindcss.com upgrade guide |
| Tailwind v4 breaking class renames | HIGH | Official tailwindcss.com upgrade guide |
| vue-tsc + @vue/tsconfig pattern | HIGH | Official vuejs.org/guide/typescript |
| Pinia over Vuex | HIGH | Vue.js official docs + Pinia.vuejs.org |
| supabase gen types CLI command | HIGH | supabase.com/docs |
| vite-plugin-pwa | HIGH | vite-pwa-org.netlify.app official docs |
| Vue Router v4 createWebHistory | HIGH | router.vuejs.org official docs |
| Vercel SPA rewrite config | HIGH | vercel.com/docs |
| Pinia 3 (Vue 3 only) | MEDIUM | Multiple sources; verify pinia.vuejs.org for v3 compat note |

---

## Sources

- [Vite Releases](https://vite.dev/releases)
- [Tailwind CSS v4 Official Blog Post](https://tailwindcss.com/blog/tailwindcss-v4)
- [Tailwind CSS v4 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide)
- [Vue 3 TypeScript Overview (Official)](https://vuejs.org/guide/typescript/overview)
- [vuejs/tsconfig on GitHub](https://github.com/vuejs/tsconfig)
- [Supabase Generating TypeScript Types](https://supabase.com/docs/guides/api/rest/generating-types)
- [Supabase CLI gen types reference](https://supabase.com/docs/reference/cli/supabase-gen-types)
- [Pinia official site](https://pinia.vuejs.org/)
- [Vue Router History Modes (Official)](https://router.vuejs.org/guide/essentials/history-mode.html)
- [vite-plugin-pwa official docs](https://vite-pwa-org.netlify.app/)
- [Vercel Vite framework docs](https://vercel.com/docs/frameworks/vite)
- [Vercel Vue.js deployment guide](https://vercel.com/kb/guide/deploying-vuejs-to-vercel)
- [Integrating Tailwind CSS v4 with Vue (Felix Astner)](https://felixastner.com/articles/integrating-tailwind-css-v4-with-vue-and-nuxt-and-differences-from-v3)
