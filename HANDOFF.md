# Handoff Notes — Planis Vue+Vite Migration

## Current state (2026-05-18)

The project is mid-migration from a single CDN `index.html` to a proper Vue 3 + Vite + TypeScript app.

**Production right now:** The CDN app (`index.html`) is live at `planis.hazelugo.com` — fully functional, all features working.

**Vite app:** Phase 1 (scaffold) and Phase 2 (data layer) are complete. Phase 3 (UI migration) is the next step.

---

## File layout

| File | What it is |
|------|------------|
| `index.html` | **Production CDN app** — Vue 3 CDN + Tailwind CDN + Supabase. This is what Vercel serves. Do not break this. |
| `vite-entry.html` | Vite app entry point. Used by `npm run dev` and `npm run build`. |
| `index-cdn-app.html` | Backup copy of the CDN app (same as index.html). |
| `src/` | The Vite + TypeScript app (Phase 1–2 done). |
| `.planning/` | GSD roadmap, requirements, research, phase plans. |

---

## To pick up Phase 3 (UI migration)

Phase 3 ports all 6 tabs from `index.html` into proper Vue SFCs under `src/views/tabs/`.

```bash
git pull
npm install
npm run dev
# Open http://localhost:5173/vite-entry.html to see the Vite app
```

Then run:
```
/gsd-execute-phase 3
```

**What Phase 3 builds:**
- Full visual parity for all 6 tabs (Overview, Group, Itinerary, Spending, Splitter, Photos)
- All write operations working via `useTripStore`
- Dynamic category color classes using complete-string lookup tables (not template literals — Tailwind purges those)
- Multi-trip switcher

**Critical pitfall for Phase 3:** Tailwind purges dynamic class names in production builds. Category colors like `` `bg-${cat}-100` `` will work in dev but break in prod. Use a complete lookup object instead:
```typescript
const CAT_COLORS = {
  Transport: 'bg-blue-100 text-blue-600',
  Lodging:   'bg-emerald-100 text-emerald-600',
  // ...
}
```

---

## Deploying

The CDN app deploys automatically — just `vercel --prod`. No build step needed (Vercel detects no framework and serves `index.html` as static).

When Phase 3 is complete, update `vercel.json` to add a build command (`npm run build`) and change the output directory to `dist/`. Until then, Vercel serves `index.html` directly.

---

## Key URLs

| What | URL |
|------|-----|
| Production | https://planis.hazelugo.com |
| Vercel project | https://vercel.com/hazelugo-4845s-projects/planis |
| Supabase project | xedunxhvrhkyphcnllxa.supabase.co |

---

## Completed phases

| Phase | Status | What it built |
|-------|--------|---------------|
| 1 — Scaffold | ✅ Done | Vite 6 + Vue 3 + TS, Tailwind v3, vercel.json, Supabase singleton, domain types |
| 2 — Data Layer | ✅ Done | `useTripStore` (realtime, CRUD, settlements), `useUIStore` (dark mode, confirm), `useTrip` composable |
| 3 — UI Migration | ⏳ Next | Port all 6 tabs as SFCs with full visual parity |
| 4 — Auth | 🔜 Future | Supabase Auth magic link, trip ownership, multi-trip dashboard |

---

## Design system

A Planis design system was exported from claude.ai/design and lives at `.planning/research/` (the design bundle is also in `/tmp/planis-design/` if the session is still active).

Key tokens are in `src/style.css`. The Planis wordmark (Plan+ı with teal map-pin) is implemented in `src/components/layout/AppSidebar.vue`. Logo assets are in `public/`.

---

## GSD workflow

```bash
# See current state
cat .planning/ROADMAP.md

# Plan Phase 3
/gsd-plan-phase 3

# Execute Phase 3
/gsd-execute-phase 3
```
