# Plan: 從 Google Maps 連結自動帶入名稱與地址

## Context

「新增自訂地點」頁目前需手動輸入名稱與地址。希望貼上 Google Maps 分享連結（短網址 `https://maps.app.goo.gl/...` 或長網址 `https://www.google.com/maps/place/...`）就自動填入「地點名稱」與「地址」，使用者確認後再儲存。

技術前提：
- 短網址 302 redirect 到 `/maps/place/<NAME-URL-ENCODED>/@<lat>,<lng>,<zoom>z/...`，name 與 lat/lng 可直接從 URL 解析。
- 地址不在 URL 內，要從目標頁面 HTML 抽取。最穩定的訊號是 `<script type="application/ld+json">`。
- 沒有 Google Places API key、不打算引入 → server-side fetch + 多重 fallback regex 是務實做法。

---

## UX 流程（C 方案：按鈕 + onPaste 混合）

在 `src/app/custom-places/add/page.tsx` 的「分類」「場景」之後、「地點名稱」之前，新增一個區塊：

```
┌ Google Maps 連結（選填） ───────────────────────┐
│ [貼上 maps.app.goo.gl/... 自動帶入]   [自動帶入] │
└─────────────────────────────────────────────────┘
小字：解析中... / 已從 Google Maps 帶入 / 連結無效
```

**觸發方式**：
- **`onPaste`**（主要路徑）— 在輸入框 `onPaste`，從 `e.clipboardData.getData("text")` 取剛貼上的字串；regex 確認是 Google Maps URL 後立即觸發 `handleParseGmap`。最直覺、零點擊。
- **`自動帶入` 按鈕**（保險）— 給手打、IME 注音、或用瀏覽器 autofill 的情境。Enter 鍵等同於按按鈕。
- **不採 onChange 自動觸發** — 避免手打到一半像 URL 就一直發 request。

**狀態**：
- **載入中**：按鈕變灰顯示「解析中...」；name / address 暫時 `readOnly` 防 race。
- **成功**：覆寫 name 與 address；address 變動觸發既有 `extractDistrict`；下方提示「已從 Google Maps 帶入，請確認後儲存」。
- **部分成功**（只抽到 name）：填 name、address 留空、提示「已帶入名稱，地址請手動補上」。
- **失敗**：紅色錯誤訊息（`連結無效` / `無法解析，請手動填寫` / `連線逾時`），欄位不動。
- **覆寫保護**：若 name 或 address 已有內容，先 `window.confirm("覆寫現有內容？")` 再覆寫。

---

## API 設計

新增 `src/app/api/custom-places/parse-gmap/route.ts`：

```ts
POST /api/custom-places/parse-gmap
Body: { url: string }

Response 200:
  { name?: string; address?: string; lat?: number; lng?: number; resolvedUrl: string }

Response 400: { error: "invalid-url" | "not-google" }
Response 502: { error: "fetch-failed" | "parse-failed" | "timeout" }
```

實作要點：
- 驗證 host 必須是 `maps.app.goo.gl` / `goo.gl` / `www.google.com` / `maps.google.com`。
- `fetch(url, { redirect: "follow", signal: AbortSignal.timeout(8000), headers: { "User-Agent": "<desktop UA>", "Accept-Language": "zh-TW,zh;q=0.9" } })`。
- 從 `response.url` 拿最終 URL，從 `response.text()` 拿 HTML（讀前 1.5 MB 即可，`og` / `ld+json` 都在 `<head>`）。
- 共用解析邏輯放在 `src/lib/gmap-parse.ts` 的 pure function `parseGoogleMapsHtml(html, finalUrl)`，方便測試。

---

## 解析策略（fallback 順序）

把多種抽取方式都跑一遍，後面只補空缺欄位：

1. **URL 解析**（最穩定，先做）
   - `name`：取 `/maps/place/<X>/` 的 `<X>`，`decodeURIComponent`、`+` 換空白。
   - `lat,lng`：regex `/@(-?\d+\.\d+),(-?\d+\.\d+)/` 或 `/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/`。
2. **`<script type="application/ld+json">`**（最佳的地址來源）
   - 找 `@type` 為 `Place` / `Restaurant` / `LocalBusiness` 的物件，取 `address`（字串）或 `address.streetAddress + addressLocality + addressRegion`。
3. **`<meta property="og:title">`**（補 name；去掉尾巴的 ` - Google Maps` / ` · Google Maps`）。
4. **`<meta name="description">`**（地址的最後 fallback，常含路名門牌）。
5. **HTML body regex**（台灣地址特化，安全網）：
   ```
   /(?:\d{3,5}\s*)?(?:台北|臺北|新北|桃園|新竹|苗栗|台中|臺中|彰化|南投|雲林|嘉義|台南|臺南|高雄|屏東|宜蘭|花蓮|台東|臺東)[^"<>\n]{4,80}(?:號|樓|段)/
   ```

任何一步抽到的欄位先記下、不覆寫前者；最後組成 response。`district` 不在 server side 算，丟給 client 既有的 `extractDistrict`。

---

## 修改與新增的檔案

**新增**
- `src/app/api/custom-places/parse-gmap/route.ts` — `POST` handler，依 Next.js 16 Route Handler 規範（`export async function POST(request: Request)`，`Response.json(...)`）。
- `src/lib/gmap-parse.ts` — 匯出 `parseGoogleMapsHtml(html, finalUrl)`（pure）和 `fetchAndParseGmap(url)`（含網路）。Pure 那個可單元測試。

**修改**
- `src/app/custom-places/add/page.tsx` — 新增 state（`gmapUrl` / `parsing` / `parseError` / `parsedNote`），新增輸入區塊與 `handleParseGmap`，覆寫 `name` / `address`。其他流程（preview、save）完全不動，因為 `extractDistrict` 已 reactive。

**不需動**
- `src/types/index.ts`、`src/lib/data.ts`、`src/lib/combine.ts`、`POST /api/custom-places` — 解析只是儲存前的暫態 enrich，不影響資料結構。

---

## 邊界處理

| 情境 | 處理 |
|------|------|
| 非 Google 連結 | 400 `not-google`，UI：`請貼上 Google Maps 連結` |
| 無效 / 失效短網址 | 502 `parse-failed`，UI：`無法解析` |
| EU `consent.google.com` interstitial | 偵測 host = consent → 加 `Cookie: CONSENT=YES+` retry 一次；仍是 consent 就退回只用 URL parse 結果 |
| 行動版 redirect 到 `/maps?q=...`（無 `place/` segment） | URL parse 抓不到，跌回 og / ld+json；都失敗回部分結果 |
| 連線逾時 | `AbortSignal.timeout(8000)` → 502 `timeout`，UI：`連線逾時，請手動填寫` |
| HTML 過大 | 用 stream reader 讀前 1.5 MB（`<head>` 已含所需訊號） |
| 連結含追蹤參數（`?g_st=...`） | fetch 前先 strip |
| 已是長網址 | 同樣可解析，少一次 redirect |
| HTML entity（`&amp;` / `&#x27;` 等） | 加小型 `decodeHtmlEntities` helper（不引函式庫） |
| onPaste 被 `自動帶入` 按鈕同時觸發 race | 用 `parsing` flag 守門：`if (parsing) return` |

---

## 驗證步驟

1. `npx tsc --noEmit` + `npx eslint` 通過。
2. 啟動 dev server，到 `/custom-places/add`：
   1. 在輸入框直接貼 `https://maps.app.goo.gl/Xo4eerCC54FPiL5j8` → 不必按按鈕，name + address 自動填上、行政區自動帶出。
   2. 手打網址按 `自動帶入` → 同樣可運作。
   3. 在 name 已有值的情況下貼新連結 → 出現 `window.confirm` 覆寫提示。
   4. 貼長網址 `https://www.google.com/maps/place/...` → 同樣可運作。
   5. 貼 `https://example.com` → 紅字 `請貼上 Google Maps 連結`。
   6. 貼亂打的 `maps.app.goo.gl/zzzzzz` → `無法解析`。
   7. DevTools Network：每次只發 1 個請求，總時長 < 8 秒。
3. 表單送出 → `/custom-places` 看到新地點，`data/raw/custom-places.json` 內 `source: "custom"`，未混入額外欄位。
4. 關掉網路按按鈕 → 顯示逾時錯誤、欄位未變。

---

## 後續可擴充（不在這次 scope）

- `lat` / `lng` 後端已取得但目前丟掉；之後可在 form preview 加地圖縮圖或存進 Place data。
- 加單元測試覆蓋 `parseGoogleMapsHtml` 各 fallback 分支。
- onChange 自動觸發（debounce 600ms），覆蓋手打 URL 的 case。
