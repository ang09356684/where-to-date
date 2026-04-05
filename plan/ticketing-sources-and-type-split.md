# Plan: Add 3 ticketing sources + split concert/music types

## Context

Currently "concert" type mixes pop/rock singer concerts (演唱會) with classical music performances (音樂會). User wants them separated. Also adding 3 new data sources: Kham (寬宏售票), OPENTIX (兩廳院), KKTIX.

## Type Split

**Before:**
- `concert` = all music (culture-music + tixcraft + era-ticket)

**After:**
- `concert` = 演唱會 (singer/band pop concerts) — tixcraft, era, kham, KKTIX, + culture-music items with concert keywords
- `music` = 音樂會 (classical, recital, ensemble, orchestra) — culture-music items without concert keywords
- `theater` = 戲劇 (unchanged)

**Keyword heuristic for culture-music split:**
Concert keywords (→ `concert`): 演唱會, 巡迴, Live, Tour, LIVE, 音樂節, Festival
Default (no keywords) → `music` (classical/recital is the majority of culture-music data)

## New Data Sources

### 1. Kham 寬宏售票 (easiest — server-rendered)
- URL: `https://www.kham.com.tw/application/UTK01/UTK0101_.aspx?Type=1`
- Has event names + PRODUCT_ID links
- Save to: `data/raw/performances-kham.json`

### 2. OPENTIX 兩廳院 (medium — sitemap + per-page fetch)
- Sitemap: `https://www.opentix.life/otWebSitemap.xml` (1000 event URLs)
- Each event page is Vue.js SPA → need Playwright or find internal API
- Alternative: try fetching event pages with `?__data` or check for API pattern
- Save to: `data/raw/performances-opentix.json`

### 3. KKTIX (hard — 403 on fetch, needs Playwright)
- `https://kktix.com/events` returns 403
- Requires Playwright headless browser
- Save to: `data/raw/performances-kktix.json`

## Files to Modify

### Types
- `src/types/index.ts` — add `"music"` to PlaceType, add to GenerateRequest

### Sync modules (new)
- `src/lib/sync/kham.ts` — HTML scraping from kham.com.tw
- `src/lib/sync/opentix.ts` — sitemap + page scraping
- `src/lib/sync/kktix.ts` — Playwright-based scraping

### Sync modules (modify)
- `src/lib/sync/culture.ts` — `cultureMusicPlaces()` split into concert vs music using keyword heuristic

### API routes
- `src/app/api/sync/route.ts` — add 3 new sync calls

### Combine
- `src/lib/combine.ts` — add new sources, write `music.json` combined file

### Generate
- `src/lib/generate.ts` — add `"music"` to isActivity, matchesType, pickPlaces

### UI components
- `src/components/InputForm.tsx` — split "音樂/演唱會" into "演唱會" and "音樂會"
- `src/components/PlaceItem.tsx` — add `music` label + color
- `src/app/result/page.tsx` — add `music` to label map

### Browse pages
- `src/app/concerts/page.tsx` — update title, add kham/opentix/kktix source labels
- `src/app/music/page.tsx` — new browse page for 音樂會
- `src/app/page.tsx` — add "音樂會" browse button

## Build Order

1. Add `"music"` type to types/index.ts
2. Update culture.ts — keyword heuristic to split concert vs music
3. Write kham.ts (simple HTML scraping)
4. Write opentix.ts (sitemap → Playwright or API)
5. Write kktix.ts (Playwright)
6. Wire new sources into sync route + combine
7. Update generate.ts, InputForm, PlaceItem, result page
8. Create /music browse page, update /concerts page
9. Update homepage browse buttons
10. Sync, test, verify

## Verification

1. `npm run dev` + click sync → all new sources show counts
2. Browse 演唱會 → only pop/singer concerts (tixcraft, kham, etc.)
3. Browse 音樂會 → only classical/recital (culture-music without concert keywords)
4. Generate with type=concert → singer concerts
5. Generate with type=music → classical performances
6. No duplicates across sources
