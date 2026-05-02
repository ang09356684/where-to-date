# Plan: 支援 share.google 短網址 + 從混合字串中抽取 URL

## Context

口袋名單原本只接受 `maps.app.goo.gl` / `goo.gl` / `*.google.com/maps` 三類 Google Maps 短網址。實際使用上發現兩個破口：

1. **Chrome / 手機 Maps 的分享按鈕現在預設給出 `https://share.google/<id>`** —— 這是 Google 較新的跨產品分享短網址，獨立於 Maps 的傳統 `goo.gl`，前端 regex 與 API 白名單都沒納入，貼上後完全沒反應。
2. **手機 Maps 的「分享」按鈕複製到剪貼簿的內容是「店名\n\nhttps://share.google/xxx」整段**，不是純 URL。前端 `GMAP_URL_RE.test(...)` 與 API 的 `new URL(raw)` 都把整段當成一個 URL 比對，於是 reject 在最前面，根本沒走到 parser。

桌機 / 直接複製連結的情境一切正常，只在手機分享流程踩到。

## 設計決策

| 項目 | 決定 |
|------|------|
| share.google 處理 | 加入 hostname 白名單 (`ALLOWED_HOSTS`) 與前端 regex (`GMAP_URL_RE`)，不另開 alias |
| 是否信任 share.google 的 redirect 終點 | 信任。`fetchAndParseGmap` 既有 `redirect: "follow"` 會把 share.google → `www.google.com/share.google` → `www.google.com/knowledgegraphshares?...` 一路跟到底，最後 og:title 是 `名稱 · 地址` 同格式，現有 `parseGoogleMapsHtml` 不需改 |
| 混合字串抽取策略 | 用 regex `https?://[^\s<>"']+` 掃出第一個 URL，前端再用 `GMAP_URL_RE` 過濾、API 直接接受第一個 URL（後續還有 `URL.hostname` 白名單把關） |
| 抽到 URL 後是否替使用者把欄位改乾淨 | 改。`setGmapUrl(extracted)`，讓使用者看到的欄位內容只剩純 URL（避免下次點「自動帶入」時又重新抽一次） |
| 抽不到合法 URL 時的訊息 | 沿用既有 `請貼上 Google Maps 連結`，不細分「有 URL 但不是 gmap」與「完全沒有 URL」 |

## 範圍

### 1. API hostname 白名單 — `src/app/api/pocket-list/parse-gmap/route.ts`

```ts
const ALLOWED_HOSTS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "share.google",        // ← 新增
  "www.google.com",
  "maps.google.com",
  "google.com",
]);
```

第 33 行 `host.endsWith("google.com") && !path.startsWith("/maps")` 的二段檢查不影響 `share.google`（hostname 是 `share.google` 不是 `*.google.com`），保留。

### 2. API 從整段字串抽 URL — 同檔案

```ts
const URL_RE = /https?:\/\/[^\s<>"']+/gi;
const TRAILING_PUNCT_RE = /[.,;)\]}'"]+$/;

function extractFirstUrl(text: string): string | null {
  const matches = text.match(URL_RE);
  if (!matches) return null;
  return matches[0].replace(TRAILING_PUNCT_RE, "");
}

// POST handler:
const candidate = extractFirstUrl(raw) ?? raw;  // ← 取代直接 new URL(raw)
```

API 端只取第一個 URL、不做 host 過濾（hostname 白名單後續仍會檢查），這樣最寬鬆。

### 3. Client URL gate — `src/app/pocket-list/add/page.tsx`

```ts
const GMAP_URL_RE =
  /^https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl|share\.google|(?:www\.|maps\.)?google\.com\/maps)/i;

const URL_RE = /https?:\/\/[^\s<>"']+/gi;
const TRAILING_PUNCT_RE = /[.,;)\]}'"]+$/;

function extractGmapUrl(text: string): string | null {
  const matches = text.match(URL_RE);
  if (!matches) return null;
  for (const raw of matches) {
    const cleaned = raw.replace(TRAILING_PUNCT_RE, "");
    if (GMAP_URL_RE.test(cleaned)) return cleaned;
  }
  return null;
}
```

前端的抽取會「掃整段、挑第一個符合 `GMAP_URL_RE` 的」（不只第一個 URL），這樣使用者貼「請看 https://example.com 跟 https://share.google/xyz」也能挑到 gmap 那條。

替換點：

| 原本 | 改為 |
|------|------|
| `canParse = GMAP_URL_RE.test(gmapUrl.trim())` | `canParse = extractGmapUrl(gmapUrl.trim()) !== null` |
| `if (!GMAP_URL_RE.test(url))` 在 `handleParseGmap` | `const url = extractGmapUrl(input); if (!url) ...` |
| `handleGmapPaste`: `if (!GMAP_URL_RE.test(pasted)) return;` | `const extracted = extractGmapUrl(pasted); if (!extracted) return;` |
| 抽出 URL 後 | `setGmapUrl(extracted)` 讓欄位 normalize 成純 URL |

### 4. UI placeholder 字串

> 貼上 maps.app.goo.gl/... 或 share.google/... 自動帶入

讓使用者直觀看到 share.google 也能貼。

## 修改檔案清單

| 檔案 | 變更 | Commit |
|------|------|--------|
| `src/app/api/pocket-list/parse-gmap/route.ts` | `share.google` 加進 `ALLOWED_HOSTS`、新增 `extractFirstUrl` | `08abd3c`, `df29e66` |
| `src/app/pocket-list/add/page.tsx` | `share.google` 加進 `GMAP_URL_RE`、新增 `extractGmapUrl`、改寫 `canParse` / `handleParseGmap` / `handleGmapPaste`、placeholder 文字 | `1377129`, `df29e66` |

不需修改：
- `src/lib/gmap-parse.ts` — `parseGoogleMapsHtml` 對 og:title 的解析是 host 無關的，share.google 跟 maps 同格式，吃得下。
- `src/types/index.ts`、`src/lib/data.ts`、`combine.ts` — 跟資料儲存無關。

## 不做的事

- **不嚴格收緊 `GMAP_URL_RE` 的尾端**：目前 `share.google.evil.com` 也會 match（既有 `goo.gl.evil.com` 也有同樣鬆度），但 API 端的 `URL.hostname` 嚴格比對白名單會擋掉，前端 regex 只是 UX gate，不放大攻擊面。等下次有時間再順手收緊。
- **不抽取多個 URL 同時帶入**：第一個就好，符合「使用者貼一個店家」的單一目標 mental model。
- **不在前端 regex 跟 API ALLOWED_HOSTS 之間 deduplicate**：兩邊資料形式不同（regex vs Set），目前重複可控。

## 驗證步驟

實際在 `localhost:3001` dev server 上跑過，三個 input 全過：

1. `撲克 專業麵線-林口龜山旗艦店\n\nhttps://share.google/rrkjmBXeshe9d6xrd`
   → `撲克 專業麵線-林口龜山旗艦店 / 桃園市龜山區長慶二街80號`
2. `饗家小餐館Casabistro Cafe Wine Brunch\nhttps://share.google/5O2zUmHTuovVJQuqf`
   → `饗家小餐館Casabistro Cafe Wine Brunch / 桃園市桃園區國際路一段1190號`
3. `https://share.google/0ziWpt6crFCRmdUyS`（純 URL regression）
   → `滿心圓牛肉鍋 / 桃園市龜山區樂善三路116號`

前端 `extractGmapUrl` 也跑過 7 案例的 unit-style 驗證，含「兩個 URL 挑 gmap 那條」「只有 example.com 回 null」「結尾標點剝掉」三個 edge case，全過。

E2E 手動驗證（請在瀏覽器執行）：
1. 開 `/pocket-list/add`，桌機貼 `https://share.google/0ziWpt6crFCRmdUyS` → 名稱、地址自動帶入。
2. 模擬手機分享：貼整段「`撲克 專業麵線-林口龜山旗艦店\n\nhttps://share.google/rrkjmBXeshe9d6xrd`」 → 欄位自動 normalize 成只剩 URL，並帶入名稱地址。
3. 貼 `https://example.com` → 顯示「請貼上 Google Maps 連結」，按鈕灰掉。
4. 重複貼同一個 URL → `lastParsedRef.current` 不會重複呼叫 API。

## 相關 commit

- `08abd3c` feat(pocket-list): allow share.google URLs in gmap parser
- `1377129` fix(pocket-list/add): allow share.google in client URL gate
- `df29e66` fix(pocket-list): extract URL from mixed text on mobile share paste

## 風險與緩解

- **share.google 將來如果改 redirect 終點不再帶 og:title**：parser 會解不出來，回退到 `parse-failed` 錯誤，使用者要手動填。已在 verification 路徑驗證過今日行為，但這是 Google 端決定，不可控。
- **混合字串抽 URL 的 regex 過寬 / 過窄**：例如 markdown link `[text](https://share.google/xxx)` 會把 `)` 當成 URL 一部分被 trailing punct rule 砍掉，沒問題；但 URL 本身含 `(` 的不常見、暫不處理。
- **前端 regex 與 API 白名單分離造成將來再加 host 時要兩邊一起改**：寫進這份 plan，下次新增 host 來這裡先看一眼。
