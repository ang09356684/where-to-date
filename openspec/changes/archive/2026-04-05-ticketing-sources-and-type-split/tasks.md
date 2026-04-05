## 1. 類型系統更新

- [x] [P] 1.1 在 `src/types/index.ts` 的 `PlaceType` 聯合型別和 `GenerateRequest.type` 中新增 `"music"`（Music PlaceType added to type system）

## 2. 文化部音樂資料分類

- [x] 2.1 更新 `src/lib/sync/culture.ts` 的 `cultureMusicPlaces()`，使用關鍵字判斷將每筆文化部音樂活動分類為 `concert` 或 `music`：標題包含「演唱會/巡迴/Live/Tour/LIVE/音樂節/Festival」→ `concert`，其餘 → `music`（Culture music data split into concert and music）

## 3. 新增 Sync 模組

- [x] [P] 3.1 建立 `src/lib/sync/kham.ts` — 從 `https://www.kham.com.tw/application/UTK01/UTK0101_.aspx?Type=1` 抓取音樂活動，解析 HTML 中的活動名稱和 PRODUCT_ID 連結，存入 `data/raw/performances-kham.json`（Kham sync fetches music events）
- [x] [P] 3.2 建立 `src/lib/sync/opentix.ts` — 從 `https://www.opentix.life/otWebSitemap.xml` 取得 sitemap，擷取 `/event/` URL，使用 Playwright headless browser 訪問各頁面取得標題/日期/場地，存入 `data/raw/performances-opentix.json`（OPENTIX sync fetches performance events）
- [x] [P] 3.3 建立 `src/lib/sync/kktix.ts` — 使用 Playwright 瀏覽 `https://kktix.com/events`，從渲染後的頁面擷取活動名稱/日期/連結，存入 `data/raw/performances-kktix.json`（KKTIX sync fetches events）

## 4. Sync API 與資料彙整

- [x] 4.1 在 `src/app/api/sync/route.ts` 中 import 並呼叫 `syncKham`、`syncOpentix`、`syncKktix`，加入現有的 `Promise.all` 中（New sources integrated into sync API）
- [x] 4.2 更新 `src/lib/combine.ts`，import 寬宏/OPENTIX/KKTIX 的 place 函式，加入合併流程，寫入 `data/combined/music.json`，並加入 `all-places.json` 的跨來源去重（New sources included in data combine）

## 5. 行程產生邏輯更新

- [x] 5.1 更新 `src/lib/generate.ts`：在 `isActivity()` 加入 `"music"`、在 `matchesType()` 加入 `"music"` 判斷、在 `pickPlaces()` 的活動類型列表中加入 `"music"`（Itinerary generation supports music type filter）

## 6. UI 更新

- [x] [P] 6.1 更新 `src/components/InputForm.tsx`：將「音樂/演唱會」拆分為獨立的「演唱會」（`concert`）和「音樂會」（`music`）選項（UI displays music as separate category）
- [x] [P] 6.2 更新 `src/components/PlaceItem.tsx`：在 `TYPE_LABELS` 新增 `music: "音樂會"`，在 `TYPE_COLORS` 新增 indigo 配色（UI displays music as separate category）
- [x] [P] 6.3 更新 `src/app/result/page.tsx`：在類型標籤對應表中新增 `music: "音樂會"`（UI displays music as separate category）

## 7. 瀏覽頁面

- [x] [P] 7.1 建立 `src/app/music/page.tsx`，使用 `BrowseList` 元件，`apiType="music"`，標題「音樂會」，圖示「🎼」，indigo 配色（Music browse page exists）
- [x] [P] 7.2 更新 `src/app/concerts/page.tsx` 的來源標籤，新增 `kham: "寬宏售票"`、`opentix: "兩廳院"`、`kktix: "KKTIX"`（Concert browse page updated with new sources）
- [x] 7.3 更新 `src/app/page.tsx`，新增「🎼 音樂會」瀏覽按鈕連結到 `/music`，將現有演唱會按鈕改為「🎤 演唱會」（Music browse page exists）

## 8. 測試與驗證

- [x] 8.1 啟動 dev server，執行同步，確認 kham/opentix/kktix 回傳非零筆數
- [x] 8.2 確認演唱會瀏覽頁面只顯示歌手/樂團演唱會，且有新來源篩選按鈕
- [x] 8.3 確認音樂會瀏覽頁面只顯示古典/獨奏等音樂演出
- [x] 8.4 確認行程產生 `type=concert` 只回傳演唱會、`type=music` 只回傳音樂會
- [x] 8.5 確認 `data/combined/all-places.json` 中各來源之間無重複名稱
