## ADDED Requirements

### Requirement: Music PlaceType added to type system

The `PlaceType` union in `src/types/index.ts` SHALL include `"music"` as a valid type. The `GenerateRequest.type` SHALL accept `"music"` as a filter value.

#### Scenario: Music type is valid

- **WHEN** a Place object has `type: "music"`
- **THEN** it passes TypeScript type checking without errors

### Requirement: Culture music data split into concert and music

The `cultureMusicPlaces()` function SHALL classify each Ministry of Culture music event (category=1) as either `concert` or `music` based on keyword matching on the event title:
- If the title contains any of: 演唱會, 巡迴, Live, Tour, LIVE, 音樂節, Festival → assign `type: "concert"`
- Otherwise → assign `type: "music"`

#### Scenario: Pop concert classified as concert

- **WHEN** a culture-music event has title containing "演唱會" (e.g., "五月天演唱會")
- **THEN** the Place object SHALL have `type: "concert"`

#### Scenario: Classical recital classified as music

- **WHEN** a culture-music event has title "莫札特鋼琴奏鳴曲之夜" (no concert keywords)
- **THEN** the Place object SHALL have `type: "music"`

#### Scenario: Tour event classified as concert

- **WHEN** a culture-music event has title containing "Tour" or "巡迴"
- **THEN** the Place object SHALL have `type: "concert"`

### Requirement: Itinerary generation supports music type filter

The `matchesType()` function in `generate.ts` SHALL accept `"music"` as a type filter and return only places with `type: "music"`. The `isActivity()` function SHALL include `"music"` as an activity type.

#### Scenario: Generate with music filter

- **WHEN** a generate request has `type: "music"`
- **THEN** all activity places in the returned itineraries SHALL have `type: "music"`

### Requirement: UI displays music as separate category

The InputForm type selector SHALL show "演唱會" and "音樂會" as separate options instead of the combined "音樂/演唱會". The PlaceItem component SHALL display `music` type with label "音樂會" and a distinct color (indigo). The result page label map SHALL include `music: "音樂會"`.

#### Scenario: User selects 音樂會 on homepage

- **WHEN** a user selects "音樂會" in the type filter and clicks submit
- **THEN** the result page shows the "音樂會" badge and itineraries contain only `type: "music"` activity places

### Requirement: Music browse page exists

A browse page at `/music` SHALL display all places with `type: "music"`, fetched from `GET /api/list?type=music`. The page SHALL have source filtering and favorite toggle support. The homepage SHALL include a "🎼 音樂會" browse button linking to `/music`.

#### Scenario: Browse music page loads

- **WHEN** a user navigates to `/music`
- **THEN** the page displays all music-type places with title "音樂會" and a count

### Requirement: Concert browse page updated with new sources

The `/concerts` browse page source labels SHALL include entries for "kham" (寬宏售票), "opentix" (兩廳院), and "kktix" (KKTIX) in addition to existing labels.

#### Scenario: Concert page shows new source filters

- **WHEN** a user opens the concerts browse page after sync
- **THEN** source filter buttons include 寬宏售票, 兩廳院, and KKTIX options
