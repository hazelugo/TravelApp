# Lighthouse Audit Intel

Competitive and self-audit data from Lighthouse. Use this file to prioritize performance, accessibility, and quality work.

Last updated: 2026-05-19

---

## Head-to-Head: Planis vs Wanderlog

| Category | Planis | Wanderlog | Delta |
|---|---|---|---|
| **Performance** | **70** | 50 | +20 ✓ |
| **Accessibility** | **82** | 72 | +10 ✓ |
| **Best Practices** | **100** | 85 | +15 ✓ |
| **SEO** | **92** | 85 | +7 ✓ |

Planis wins every category. Best Practices is a perfect 100 — clean. The gaps to close are Performance (LCP + CLS) and Accessibility (still 82, not 100).

---

## Planis — Detailed Metrics

URL: `https://planis.hazelugo.com`
Run date: 2026-05-19

| Metric | Value | Score |
|---|---|---|
| First Contentful Paint | 2.1s | 82 |
| Largest Contentful Paint | **4.5s** | **37** ← worst metric |
| Speed Index | 2.1s | 99 |
| Total Blocking Time | 140ms | 95 |
| Cumulative Layout Shift | **0.22** | **57** ← second worst |

**Reading:** Speed Index (99) and TBT (95) are excellent — the app becomes interactive fast. The problem is LCP (37) and CLS (57). Something is shifting layout after load (CLS 0.22 vs good = ≤0.1), and the largest element takes 4.5s to paint.

---

## Wanderlog — Detailed Metrics

URL: `https://wanderlog.com/home`
Run date: 2026-05-19

| Metric | Value | Score |
|---|---|---|
| First Contentful Paint | 2.3s | 73 |
| Largest Contentful Paint | 3.6s | 60 |
| Speed Index | — | 57 |
| Total Blocking Time | — | 12 ← critically blocked |
| Cumulative Layout Shift | — | 0 ← layout chaos |

---

## Planis — Failures (score: 0)

### Performance
- **Layout shifts (CLS 0.22)** — elements shift after load. Likely cause: fonts loading late, images without explicit dimensions, or async content injecting into layout. Root cause needs investigation.
- **LCP 4.5s** — the largest painted element takes too long. Likely the hero card or a font. Check what element Lighthouse flagged as LCP.
- **Render-blocking requests** — something in `<head>` is blocking first paint
- **Network dependency chain** — critical resources are chained (one loads, then triggers another)
- **LCP not discoverable from HTML** — LCP resource may be loaded via CSS or JS rather than inline HTML
- **Image delivery** — images not optimized (format, size, or lazy-load configuration)
- **bfcache blocked** — page prevents back/forward cache (common cause: `Cache-Control: no-store` or open connections)

### Accessibility
- **Buttons with no accessible name** — icon-only buttons missing `aria-label` (copy-link in header, tab close buttons, remove buttons, etc.)
- **Color contrast** — some text fails WCAG AA ratio (muted/secondary text most likely)
- **Form elements missing labels** — inputs not associated with `<label>` elements
- **Label/name mismatch** — visible button text doesn't match its accessible name

### SEO
- **robots.txt invalid** — malformed robots.txt; crawlers may not parse it correctly

---

## Improvement Backlog

Track fixes here. Check off as addressed.

### P1 — Performance (biggest score impact)

- [ ] **Identify LCP element** — open Chrome DevTools → Performance tab → record load → find what element is the LCP target at 4.5s. Likely the hero gradient card or logo image.
- [ ] **Fix CLS (0.22 → <0.1)** — add explicit `width`/`height` to all images. Ensure fonts don't cause layout reflow (use `font-display: swap` or preload). Check if any async Vue content injects into the visible layout on mount.
- [ ] **Eliminate render-blocking resources** — audit `<head>` for synchronous CSS/JS. CDN stylesheets (Tailwind CDN if any remain) block render.
- [ ] **Fix network dependency chain** — preload critical fonts and the main JS chunk.
- [ ] **Optimize image delivery** — serve WebP/AVIF, add `loading="lazy"` to below-fold images, use responsive `srcset`.
- [ ] **Unblock bfcache** — investigate what's preventing bfcache. Check for `Cache-Control: no-store`, open IndexedDB transactions, or unload event listeners.

### P2 — Accessibility

- [ ] **aria-label on all icon-only buttons** — audit every button that has no visible text: copy-link (header), tab icons if clickable, crew remove (×) buttons, photo delete buttons, any chevron/close buttons.
- [ ] **Color contrast** — run contrast checker on muted text (`text-gray-400`, `text-slate-400`, secondary labels). Both light and dark mode. Bump to at least 4.5:1.
- [ ] **Associate form labels** — every `<input>` and `<select>` needs a `<label for="">` or `aria-label`. Check itinerary add-form, expense form, crew name input.
- [ ] **Fix label/name mismatch** — if a button says "Add" but its aria-label says something different, align them.
- [ ] **Touch targets ≥ 40px** — crew avatar remove buttons are currently ~20px. Minimum 40×40px per WCAG 2.5.8.
- [ ] **Donut chart keyboard/SR accessibility** — add `role="img"` and `aria-label` describing the chart data.
- [ ] **Drag-to-reorder keyboard alternative** — add up/down arrow button fallback for reordering itinerary items.

### P3 — SEO / Infrastructure

- [ ] **Fix robots.txt** — validate and correct `public/robots.txt` (or create one if missing).
- [ ] **Add meta description** — `<meta name="description" content="...">` in `index.html`. ~150 chars, describes Planis for search + share previews.
- [ ] **Open Graph tags** — `og:title`, `og:description`, `og:image` for rich link previews when users share the trip URL on Slack/WhatsApp/iMessage. This is high-value for a social-first app.

### P4 — Known UI Issues (from prior design audit)

- [ ] Stats strip mobile: vertical dividers disappear in 2-col layout on narrow screens
- [ ] Itinerary timeline spine bleeds through inline edit form
- [ ] Budget field missing hover-edit affordance icon (inconsistent with destination field)
- [ ] Hero card: "pp" → "/ person"

---

## Notes

- Wanderlog's TBT (12) vs Planis TBT (95) is the starkest difference — Wanderlog's JS bundle completely blocks the main thread. Planis's 3-chunk build is working.
- Planis Best Practices = 100 means no console errors, no insecure requests, no deprecated APIs. Keep it clean.
- CLS is the most actionable quick win — explicit image dimensions and font preloading alone can bring 0.22 → <0.1 and push Performance from 70 → ~80.
