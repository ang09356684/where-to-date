## Why

目前 `concert` 類型混合了歌手演唱會（演唱會）和古典音樂演出（音樂會），使用者無法單獨瀏覽或篩選有歌手的演唱會。此外，台灣三大售票平台（寬宏售票、OPENTIX 兩廳院、KKTIX）尚未整合，演唱會和表演的資料覆蓋範圍有明顯缺口。

## What Changes

- 將 `concert` PlaceType 拆分為兩個獨立類型：
  - `concert` — 演唱會（歌手/樂團流行演唱會）：tixCraft、年代售票、寬宏、KKTIX，以及文化部音樂資料中符合演唱會關鍵字的項目
  - `music` — 音樂會（古典音樂、獨奏會、合奏團、管弦樂團）：文化部音樂資料中不含演唱會關鍵字的項目
- 新增 3 個售票平台資料來源：
  - **寬宏售票** — 從 kham.com.tw 做 HTML scraping（server-rendered，音樂分類）
  - **OPENTIX 兩廳院** — 透過 sitemap + Playwright 擷取（Vue.js SPA，1000+ 筆活動）
  - **KKTIX** — 透過 Playwright headless browser 擷取（一般 fetch 會被 403 擋掉）
- 在 culture.ts 加入關鍵字判斷邏輯，將文化部音樂資料分類為 `concert` 或 `music`
- 新增 `music` 瀏覽頁面，更新 `concert` 瀏覽頁面加入新來源標籤
- 首頁新增獨立的「演唱會」和「音樂會」瀏覽按鈕
- 更新行程產生邏輯以支援 `music` 作為篩選類型

## Non-Goals

- 不做即時票務庫存或票價查詢
- 不做使用者認證或購票整合
- 不抓取活動詳情頁的描述或座位資訊
- 不支援 KKTIX 音樂/演唱會以外的分類（科技活動、工作坊等）

## Capabilities

### New Capabilities

- `ticketing-sync`：從寬宏、OPENTIX、KKTIX 售票平台同步活動資料到 raw JSON 檔案
- `concert-music-split`：使用關鍵字判斷，將音樂演出分類為演唱會（concert）和音樂會（music）

### Modified Capabilities

（無 — 沒有既有的 spec 需要修改）

## Impact

- 受影響的資料來源：寬宏售票（kham.com.tw）、OPENTIX（opentix.life）、KKTIX（kktix.com）、文化部音樂 API（category=1）
- 受影響的程式碼：
  - `src/types/index.ts` — 新增 `music` PlaceType
  - `src/lib/sync/culture.ts` — 關鍵字分類邏輯
  - `src/lib/sync/kham.ts` — 新 sync 模組
  - `src/lib/sync/opentix.ts` — 新 sync 模組（Playwright）
  - `src/lib/sync/kktix.ts` — 新 sync 模組（Playwright）
  - `src/lib/combine.ts` — 加入新來源，寫入 music.json
  - `src/lib/generate.ts` — 將 music 加入活動類型和篩選
  - `src/app/api/sync/route.ts` — 接入新 sync 函式
  - `src/components/InputForm.tsx` — 拆分類型選擇器
  - `src/components/PlaceItem.tsx` — 新增 music 標籤/顏色
  - `src/app/result/page.tsx` — 新增 music 標籤
  - `src/app/concerts/page.tsx` — 更新來源標籤
  - `src/app/music/page.tsx` — 新瀏覽頁面
  - `src/app/page.tsx` — 新增瀏覽按鈕
- 依賴套件：Playwright（已安裝為 devDependency）
