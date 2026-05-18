# TravelApp — Vue + Vite Migration

## What This Is

TravelApp is a group travel planning tool that lets friend crews, families, and mixed groups organize a trip together — itinerary, costs, splitting, and photos — from a single shared link. It currently runs as a single `index.html` (Vue 3 CDN + Tailwind CDN + Supabase) and is being migrated to a proper Vue 3 + Vite + TypeScript project to enable scaling, real user accounts, and a PWA experience.

## Core Value

A group can plan, cost, and settle a trip together in one place — no spreadsheets, no chasing people over chat.

## Requirements

### Validated

- ✓ Trip overview with destination, dates, budget — existing
- ✓ Group headcount and named travelers — existing
- ✓ Itinerary with categorized events, costs, links, and Google Maps — existing
- ✓ Spending breakdown by category — existing
- ✓ Payment splitting and debt settlement — existing
- ✓ Trip photo wall — existing
- ✓ Real-time sync across group members via Supabase — existing
- ✓ Multi-trip support (link-based, dropdown switcher) — existing
- ✓ Dark mode — existing

### Active

- [ ] Migrate single `index.html` to Vue 3 + Vite + TypeScript project structure
- [ ] Move from CDN dependencies to installed npm packages
- [ ] Break monolithic file into components (tabs, cards, forms, shared UI)
- [ ] Generate Supabase TypeScript types from schema
- [ ] User authentication (Supabase Auth — email/password, OAuth)
- [ ] Trips tied to user accounts, not just shareable links
- [ ] Improved multi-trip management UI
- [ ] PWA support — installable, offline-capable
- [ ] Notifications — alert group members when trip changes

### Out of Scope

- Native mobile app (iOS/Android) — PWA covers the mobile use case without native complexity
- Backend rewrite — Supabase is working well, no reason to change
- Monetization / billing — not in scope for this milestone

## Context

- Existing app is ~3000+ lines of Vue 3 Composition API inside a single HTML file
- All state lives in `reactive()` and persists to Supabase in real-time
- Tailwind is loaded via CDN — needs to move to PostCSS/installed
- No build step currently — migrating to Vite enables tree-shaking, TypeScript, HMR, and PWA plugin
- Supabase project already exists; schema includes a `trips` table with JSONB state
- Current sharing model: anyone with the link can read/write — auth will layer on top without breaking this
- Deploy target: Vercel (`vercel --prod`)
- Design is polished and brand-consistent; migration must not regress the UI

## Constraints

- **Compatibility**: Existing Supabase schema must not break — migration cannot require a DB migration as a prerequisite
- **Design**: All existing UI/UX must be preserved exactly — this is a structural migration, not a redesign
- **Stack**: Vue 3 Composition API + `<script setup>` + TypeScript + Vite + Tailwind CSS + Supabase JS v2
- **Deploy**: Vercel — no server-side rendering required (SPA is fine)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| TypeScript over JavaScript | Vue 3 was written in TS; Supabase generates TS types; catches prop mismatches at edit time | — Pending |
| Keep Supabase | Real-time sync is already working; Supabase Auth fits auth requirements naturally | — Pending |
| SPA over SSR | No SEO requirement; simpler deploy; existing app is fully client-side | — Pending |
| PWA over native app | Covers installable + offline without native build pipeline complexity | — Pending |
| Vite + vue-tsc | Industry standard for Vue 3 TS; fast HMR; excellent Vercel integration | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-17 after initialization*
