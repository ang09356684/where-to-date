# ticketing-sync Specification

## Purpose

TBD - created by archiving change 'ticketing-sources-and-type-split'. Update Purpose after archive.

## Requirements

### Requirement: Kham sync fetches music events

The system SHALL fetch event data from Kham (寬宏售票) at `https://www.kham.com.tw/application/UTK01/UTK0101_.aspx?Type=1` using HTML scraping. Each event SHALL include at minimum: title, source link (PRODUCT_ID-based URL). The result SHALL be saved to `data/raw/performances-kham.json`.

#### Scenario: Successful Kham sync

- **WHEN** the sync API is called
- **THEN** the system fetches the Kham music category page, parses event names and links from HTML anchor tags containing `PRODUCT_ID`, and writes the result to `data/raw/performances-kham.json`

#### Scenario: Kham sync failure

- **WHEN** the Kham website returns an error or is unreachable
- **THEN** the sync result for source "kham" SHALL have status "error" with an error message, and no file SHALL be overwritten


<!-- @trace
source: ticketing-sources-and-type-split
updated: 2026-04-05
code:
  - src/components/PlaceItem.tsx
  - src/app/result/page.tsx
  - src/app/music/page.tsx
  - src/lib/sync/opentix.ts
  - src/lib/sync/culture.ts
  - plan/ticketing-sources-and-type-split.md
  - src/lib/combine.ts
  - src/app/page.tsx
  - src/lib/sync/kktix.ts
  - src/types/index.ts
  - src/lib/sync/kham.ts
  - src/components/InputForm.tsx
  - src/app/concerts/page.tsx
  - src/lib/generate.ts
  - src/app/api/sync/route.ts
-->

---
### Requirement: OPENTIX sync fetches performance events

The system SHALL fetch event data from OPENTIX (兩廳院) using the sitemap at `https://www.opentix.life/otWebSitemap.xml` to discover event URLs, then use Playwright headless browser to extract event details (title, date, venue) from each event page. The result SHALL be saved to `data/raw/performances-opentix.json`.

#### Scenario: Successful OPENTIX sync

- **WHEN** the sync API is called
- **THEN** the system fetches the OPENTIX sitemap, extracts event URLs matching `/event/` pattern, visits each page via Playwright to extract title and metadata, and writes the result to `data/raw/performances-opentix.json`

#### Scenario: OPENTIX sync with partial failures

- **WHEN** some individual event pages fail to load
- **THEN** the system SHALL continue processing remaining events and report the count of successfully parsed events


<!-- @trace
source: ticketing-sources-and-type-split
updated: 2026-04-05
code:
  - src/components/PlaceItem.tsx
  - src/app/result/page.tsx
  - src/app/music/page.tsx
  - src/lib/sync/opentix.ts
  - src/lib/sync/culture.ts
  - plan/ticketing-sources-and-type-split.md
  - src/lib/combine.ts
  - src/app/page.tsx
  - src/lib/sync/kktix.ts
  - src/types/index.ts
  - src/lib/sync/kham.ts
  - src/components/InputForm.tsx
  - src/app/concerts/page.tsx
  - src/lib/generate.ts
  - src/app/api/sync/route.ts
-->

---
### Requirement: KKTIX sync fetches events

The system SHALL fetch event data from KKTIX at `https://kktix.com/events` using Playwright headless browser (plain fetch returns 403). Each event SHALL include: title, date, link. The result SHALL be saved to `data/raw/performances-kktix.json`.

#### Scenario: Successful KKTIX sync

- **WHEN** the sync API is called
- **THEN** the system launches a Playwright browser, navigates to the KKTIX events page, extracts event listings, and writes the result to `data/raw/performances-kktix.json`


<!-- @trace
source: ticketing-sources-and-type-split
updated: 2026-04-05
code:
  - src/components/PlaceItem.tsx
  - src/app/result/page.tsx
  - src/app/music/page.tsx
  - src/lib/sync/opentix.ts
  - src/lib/sync/culture.ts
  - plan/ticketing-sources-and-type-split.md
  - src/lib/combine.ts
  - src/app/page.tsx
  - src/lib/sync/kktix.ts
  - src/types/index.ts
  - src/lib/sync/kham.ts
  - src/components/InputForm.tsx
  - src/app/concerts/page.tsx
  - src/lib/generate.ts
  - src/app/api/sync/route.ts
-->

---
### Requirement: New sources integrated into sync API

The sync API (`POST /api/sync`) SHALL call Kham, OPENTIX, and KKTIX sync functions alongside existing sources. All sources SHALL run concurrently via `Promise.all`. Each new source SHALL appear in the sync response `results` array with source name, status, and count.

#### Scenario: Sync response includes new sources

- **WHEN** a user clicks the sync button
- **THEN** the response includes entries for "kham", "opentix", and "kktix" with their respective status and count


<!-- @trace
source: ticketing-sources-and-type-split
updated: 2026-04-05
code:
  - src/components/PlaceItem.tsx
  - src/app/result/page.tsx
  - src/app/music/page.tsx
  - src/lib/sync/opentix.ts
  - src/lib/sync/culture.ts
  - plan/ticketing-sources-and-type-split.md
  - src/lib/combine.ts
  - src/app/page.tsx
  - src/lib/sync/kktix.ts
  - src/types/index.ts
  - src/lib/sync/kham.ts
  - src/components/InputForm.tsx
  - src/app/concerts/page.tsx
  - src/lib/generate.ts
  - src/app/api/sync/route.ts
-->

---
### Requirement: New sources included in data combine

The combine step SHALL read Kham, OPENTIX, and KKTIX raw data, normalize each item to the `Place` interface, assign `type: "concert"` to items from Kham/KKTIX and classify OPENTIX items using the concert-music-split heuristic, and merge them into `data/combined/all-places.json` with cross-source deduplication.

#### Scenario: Combined data includes ticketing sources

- **WHEN** the combine function runs after sync
- **THEN** `data/combined/all-places.json` contains places from kham, opentix, and kktix sources with no duplicate names across all sources

<!-- @trace
source: ticketing-sources-and-type-split
updated: 2026-04-05
code:
  - src/components/PlaceItem.tsx
  - src/app/result/page.tsx
  - src/app/music/page.tsx
  - src/lib/sync/opentix.ts
  - src/lib/sync/culture.ts
  - plan/ticketing-sources-and-type-split.md
  - src/lib/combine.ts
  - src/app/page.tsx
  - src/lib/sync/kktix.ts
  - src/types/index.ts
  - src/lib/sync/kham.ts
  - src/components/InputForm.tsx
  - src/app/concerts/page.tsx
  - src/lib/generate.ts
  - src/app/api/sync/route.ts
-->