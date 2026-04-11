# Architecture Guide

> AI assistant 快速上手文件。目標：不需要讀完所有原始碼，就能知道改什麼、改哪裡。
> 最後更新：2026-04-11

---

## 1. Project Overview

| Item | Value |
|------|-------|
| 名稱 | No Idea（不知道要幹嘛？） |
| 用途 | 台北/桃園約會/出遊行程建議 |
| Tech Stack | Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 |
| 執行方式 | 本機 `npm run dev`（非部署到雲端） |
| 儲存 | JSON 檔案（`data/` 目錄），無資料庫 |
| 客戶端持久化 | localStorage（收藏功能） |
| 語言 | UI 全中文（繁體），程式碼全英文 |

---

## 2. Data Flow（核心概念）

理解整個 app 只需要這條資料管線：

```
外部網站/API
    ↓  (fetch / scraping)
src/lib/sync/*.ts        ← 每個來源一個模組
    ↓  (writeRawJson)
data/raw/*.json          ← 各來源原始資料（15 個檔案）
    ↓  (combineAllPlaces)
src/lib/combine.ts       ← 讀取所有 raw → 正規化 → 去重
    ↓  (writeCombinedJson)
data/combined/all-places.json  ← 唯一的合併資料來源
    ↓  (readCombinedPlaces)
src/lib/generate.ts      ← 篩選 + 隨機組合行程
    ↓
API Response → UI
```

**關鍵理解**：
- `sync` 負責「外部 → raw JSON」
- `combine` 負責「raw JSON → combined JSON」（sync 結束時自動呼叫）
- `generate` 負責「combined JSON → 行程推薦」
- 這三層完全解耦，各自可獨立修改

---

## 3. Directory Structure

```
where-to-date/
├── data/
│   ├── raw/                          # 各來源原始資料（sync 寫入）
│   │   ├── exhibitions-culture.json
│   │   ├── exhibitions-huashan.json
│   │   ├── exhibitions-songshan.json
│   │   ├── exhibitions-twtc.json
│   │   ├── exhibitions-ntsec.json
│   │   ├── movies-atmovies.json
│   │   ├── performances-tixcraft.json
│   │   ├── performances-era-ticket.json
│   │   ├── performances-kham.json
│   │   ├── performances-opentix.json
│   │   ├── performances-kktix.json
│   │   ├── attractions-taipei.json
│   │   ├── attractions-taoyuan.json
│   │   ├── restaurants-curated.json        # 手動維護
│   │   └── restaurants-taoyuan-curated.json # 手動維護
│   └── combined/                     # combine 自動產生（不手動編輯）
│       ├── all-places.json           # ★ 核心：所有地點的合併檔
│       ├── exhibitions.json
│       ├── concerts.json
│       ├── music.json
│       ├── theater.json
│       ├── movies.json
│       ├── restaurants.json
│       └── attractions.json
├── src/
│   ├── types/index.ts                # ★ 所有 TypeScript 型別
│   ├── lib/
│   │   ├── data.ts                   # JSON 讀寫工具（readRawJson, writeCombinedJson 等）
│   │   ├── combine.ts               # raw → combined 合併邏輯
│   │   ├── generate.ts              # 行程產生演算法
│   │   ├── favorites.ts             # localStorage hook（收藏）
│   │   └── sync/                    # 每個外部來源一個模組
│   │       ├── culture.ts           # 文化部 API（展覽+音樂+戲劇）
│   │       ├── huashan.ts           # 華山 HTML scraping
│   │       ├── songshan.ts          # 松菸 HTML scraping
│   │       ├── twtc.ts              # 世貿 HTML scraping
│   │       ├── ntsec.ts             # 科教館 HTML scraping
│   │       ├── atmovies.ts          # 開眼電影 HTML scraping
│   │       ├── taipei-attractions.ts # 台北景點
│   │       ├── taoyuan.ts           # 桃園觀光 API + 美食
│   │       ├── taoyuan-food.ts      # 桃園美食
│   │       ├── tixcraft.ts          # 拓元售票
│   │       ├── era-ticket.ts        # 年代售票
│   │       ├── kham.ts              # 寬宏售票
│   │       ├── opentix.ts           # 兩廳院 OPENTIX
│   │       └── kktix.ts             # KKTIX（Playwright）
│   ├── components/
│   │   ├── Header.tsx               # 頁首標題（純展示）
│   │   ├── InputForm.tsx            # ★ 主頁篩選表單（城市/類型/場景）
│   │   ├── ItineraryCard.tsx        # 行程卡片（含 3 個 PlaceItem）
│   │   ├── PlaceItem.tsx            # ★ 單一地點卡片（名稱/類型badge/地址/收藏）
│   │   ├── BrowseList.tsx           # ★ 通用瀏覽列表（所有瀏覽頁共用）
│   │   ├── SyncButton.tsx           # 同步按鈕 + SSE 進度條
│   │   └── ThemeToggle.tsx          # 深色模式切換
│   └── app/
│       ├── layout.tsx               # 根 layout（字型/metadata/ThemeToggle）
│       ├── globals.css              # Tailwind v4 imports + dark mode
│       ├── page.tsx                 # ★ 首頁（InputForm + 導航按鈕）
│       ├── result/page.tsx          # ★ 行程結果頁（呼叫 /api/generate）
│       ├── favorites/page.tsx       # 收藏頁（localStorage + 過期檢查）
│       ├── exhibitions/page.tsx     # 展覽瀏覽（用 BrowseList）
│       ├── concerts/page.tsx        # 演唱會瀏覽
│       ├── music/page.tsx           # 音樂會瀏覽
│       ├── theater/page.tsx         # 戲劇瀏覽
│       ├── movies/page.tsx          # 電影瀏覽
│       └── api/
│           ├── generate/route.ts    # POST: 產生行程
│           ├── sync/route.ts        # POST: SSE 同步所有來源
│           ├── list/route.ts        # GET: 按類型列出地點
│           └── check-favorites/route.ts  # POST: 檢查收藏是否過期
└── plan/                            # 規劃文件
    ├── implementation-plan.md
    ├── sync-progress-indicator.md
    ├── ticketing-sources-and-type-split.md
    └── custom-places.md
```

---

## 4. Core Types（src/types/index.ts）

```typescript
// ★ 核心型別 — 整個 app 圍繞 Place 運作
interface Place {
  id: string;          // 格式: "{source}-{index}" (e.g. "huashan-0", "atm-5")
  name: string;
  type: PlaceType;     // 決定分類與顯示
  source: string;      // 來源識別（"huashan", "culture", "atmovies"...）
  category: "indoor" | "outdoor" | "both";
  address: string;     // 完整地址（含「臺北市」等）
  district: string;    // 行政區（"大安區"）或 "不限"
  lat?: number;
  lng?: number;
  imageUrl?: string;
  sourceUrl?: string;
  startDate?: string;  // "YYYY-MM-DD"
  endDate?: string;
  goodFor: "date" | "solo" | "both";
  price?: string;
}

type PlaceType = "exhibition" | "concert" | "music" | "theater"
               | "movie" | "restaurant" | "cafe" | "bar" | "attraction";

// generate API 的 request/response
interface GenerateRequest {
  district?: string;   // "不限" | "台北-all" | "桃園-all" | "大安區"
  type: "all" | "exhibition" | "concert" | "music" | "theater"
      | "movie" | "attraction" | "food";
  setting: "indoor" | "outdoor" | "both";
  exclude?: string[];  // 排除的 place ID
}
```

---

## 5. Key Patterns（程式碼慣例）

### 5a. Sync 模組慣例

每個 `src/lib/sync/*.ts` 都 export 兩個東西：

```typescript
// 1. syncXxx() — 從外部抓資料 → 寫入 raw JSON → 回傳 SyncResult
export async function syncHuashan(): Promise<SyncResult> { ... }

// 2. xxxPlaces() — 讀取 raw JSON → 轉換成 Place[] → 供 combine 使用
export function huashanPlaces(): Place[] { ... }
```

**新增來源時**：建一個新的 sync 模組 → 在 `sync/route.ts` 註冊 → 在 `combine.ts` 引入 `xxxPlaces()`。

### 5b. 瀏覽頁慣例

所有瀏覽頁（展覽/電影/演唱會...）都使用 `BrowseList` 元件：

```typescript
// src/app/exhibitions/page.tsx — 典型 3 行
import BrowseList from "@/components/BrowseList";
export default function ExhibitionsPage() {
  return <BrowseList title="現正展覽" apiType="exhibition" icon="🎨" ... />;
}
```

`BrowseList` 呼叫 `GET /api/list?type=xxx` 取得資料。

### 5c. UI 慣例

- **佈局**：全部用 `flex flex-col items-center`，`max-w-lg` 置中
- **按鈕樣式**：`rounded-full` 圓角膠囊，`bg-gray-900 text-white`（主要）/ `bg-gray-100 text-gray-700`（次要）
- **ChipGroup**：篩選器統一用 `rounded-full px-4 py-2` 膠囊按鈕組
- **深色模式**：所有元素都有 `dark:` variant
- **返回鏈結**：每個子頁面左上角 `← 返回首頁`
- **Client component**：需要互動的用 `"use client"`，純展示的保持 server component

### 5d. 資料讀寫慣例

所有 JSON 讀寫通過 `src/lib/data.ts` 的四個函式：

| 函式 | 用途 |
|------|------|
| `readRawJson(filename)` | 讀 `data/raw/{filename}`，不存在回傳 `[]` |
| `writeRawJson(filename, data)` | 寫 `data/raw/{filename}` |
| `readCombinedPlaces()` | 讀 `data/combined/all-places.json` |
| `writeCombinedJson(filename, data)` | 寫 `data/combined/{filename}` |

### 5e. 行程產生邏輯（generate.ts）

1. 讀取 all-places.json
2. 依 type / setting / exclude 篩選
3. 依 district 分三層優先級：精確匹配 > 不限地區 > 其他地區
4. 各層內 shuffle 後合併
5. 分桶：activities vs foods
6. 依模板組合 3 地點行程（activity → food → activity）
7. 產生 2 組不重複行程

---

## 6. API Routes

| Method | Path | 用途 | 觸發時機 |
|--------|------|------|----------|
| POST | `/api/sync` | SSE 同步所有外部來源 + combine | 使用者點「同步」 |
| POST | `/api/generate` | 產生行程推薦 | 使用者點「幫我安排」或「再給我一組」 |
| GET | `/api/list?type=xxx` | 按類型列出地點 | 瀏覽頁載入 |
| POST | `/api/check-favorites` | 檢查收藏 ID 是否仍存在 | 收藏頁載入 |

---

## 7. State Management

| 資料 | 儲存位置 | 讀取方式 |
|------|---------|---------|
| 所有地點 | `data/combined/all-places.json` | `readCombinedPlaces()` |
| 各來源原始資料 | `data/raw/*.json` | `readRawJson()` |
| 使用者收藏 | `localStorage("noidea-favorites")` | `useFavorites()` hook |
| 深色模式 | `localStorage("theme")` | `ThemeToggle` 元件 |
| 表單狀態 | React `useState` | `InputForm` 元件內部 |
| URL 參數 | query string | `useSearchParams()` in result page |

---

## 8. Modification Guide（改什麼看哪裡）

### 新增一個外部資料來源

1. `src/lib/sync/new-source.ts` — 寫 `syncNewSource()` + `newSourcePlaces()`
2. `src/app/api/sync/route.ts` — 加到 `FAST_SOURCES` 或 `SLOW_SOURCES`，加 label
3. `src/lib/combine.ts` — import `newSourcePlaces()` 並加入對應陣列

### 新增一個 PlaceType

1. `src/types/index.ts` — `PlaceType` union 加新值，`GenerateRequest.type` 也加
2. `src/lib/generate.ts` — `isActivity()` 或 `isFood()` 加新 type，`matchesType()` 加 case
3. `src/components/PlaceItem.tsx` — `TYPE_LABELS` + `TYPE_COLORS` 加新 type
4. `src/components/InputForm.tsx` — `TYPES` 陣列加新選項
5. `src/app/page.tsx` — `BROWSE_LINKS` 加新瀏覽頁入口
6. `src/app/{new-type}/page.tsx` — 用 `BrowseList` 建新瀏覽頁
7. `src/lib/combine.ts` — 加 `writeCombinedJson("{new-type}.json", ...)`

### 修改行程產生邏輯

- 只改 `src/lib/generate.ts`（篩選/組合/模板都在這）
- API route (`api/generate/route.ts`) 只是薄轉發層

### 修改首頁 UI

- `src/app/page.tsx` — 按鈕排列、導航連結
- `src/components/InputForm.tsx` — 篩選器選項、表單邏輯

### 修改地點卡片顯示

- `src/components/PlaceItem.tsx` — 單一地點的 UI（badge、地址、收藏按鈕）
- `src/components/ItineraryCard.tsx` — 行程卡片（包含 3 個 PlaceItem + 編號）

### 新增一個頁面

1. `src/app/{page-name}/page.tsx` — 建頁面元件
2. `src/app/page.tsx` — 在首頁加入口按鈕/連結
3. 如需 API：`src/app/api/{endpoint}/route.ts`

### 新增 API route

- `src/app/api/{name}/route.ts` — export `GET`/`POST`/`DELETE` 函式
- 讀寫資料用 `src/lib/data.ts` 的工具函式

---

## 9. Component Dependency Graph

```
layout.tsx
  └─ ThemeToggle

page.tsx (首頁)
  ├─ Header
  ├─ InputForm (ChipGroup 內建)
  └─ SyncButton

result/page.tsx
  ├─ ItineraryCard
  │   └─ PlaceItem
  └─ useFavorites()

favorites/page.tsx
  ├─ PlaceItem
  ├─ ItineraryCard
  └─ useFavorites()

exhibitions/page.tsx (及所有瀏覽頁)
  └─ BrowseList
      ├─ PlaceItem
      └─ useFavorites()
```

---

## 10. Environment

- `.env.local` — 環境變數（目前無必要項目，未來可能加 API key）
- Node.js 25+ (brew install)
- 啟動：`npm run dev` 或 tmux session
- 開發 URL：http://localhost:3000
