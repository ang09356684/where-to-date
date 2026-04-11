# No Idea App - Implementation Plan

## Context

使用者想建立一個網頁應用，在「不知道要做什麼」的情境下，快速產生可執行的行程建議（itinerary）。目標用戶是 20-35 歲台北都市族群，適用場景包括約會沒想法、假日無聊、想找活動但懶得查。目前是空專案，需從零開始。

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend + Backend | Next.js 14 (App Router) + TypeScript | 前後端合一，MVP 開發速度快 |
| Styling | Tailwind CSS | 快速建構 UI，不需寫自訂 CSS |
| Storage | JSON 檔案（`data/` 目錄） | MVP 階段不用 DB，直接讀寫 JSON 即可 |
| API | Next.js API Routes | MVP 只需 3-4 個 endpoint，不需額外後端 |

---

## Data Sources

### 展覽（依來源分開儲存）

| Source | URL | 抓取方式 | 儲存檔案 |
|--------|-----|----------|----------|
| 文化部 Open Data | `cloud.culture.tw/...?category=6` | JSON API（篩選台北） | `data/raw/exhibitions-culture.json` |
| 華山1914 | `huashan1914.com/w/huashan1914/exhibition` | HTML scraping | `data/raw/exhibitions-huashan.json` |
| 松山文創園區 | `songshanculturalpark.org/exhibition` | HTML scraping | `data/raw/exhibitions-songshan.json` |
| 台北世貿中心 | `twtc.com.tw/exhibition.aspx?p=menu1` | HTML scraping | `data/raw/exhibitions-twtc.json` |
| 國立科教館 | `ntsec.gov.tw/article/list.aspx?a=25` | HTML scraping | `data/raw/exhibitions-ntsec.json` |

### 電影

| Source | URL | 抓取方式 | 儲存檔案 |
|--------|-----|----------|----------|
| 開眼電影網 (atmovies) | `atmovies.com.tw/movie/now/` | HTML scraping | `data/raw/movies-atmovies.json` |

> 威秀官網回傳 403 擋爬蟲，改用開眼電影網（有完整上映中電影列表、片長、分級、廳數）。

### 餐廳/咖啡廳

| Source | 儲存檔案 |
|--------|----------|
| 手動精選 50+ 筆 | `data/raw/restaurants-curated.json` |

### 彙整資料

| 用途 | 儲存檔案 |
|------|----------|
| 全部展覽（合併去重） | `data/combined/exhibitions.json` |
| 全部電影 | `data/combined/movies.json` |
| 全部餐廳 | `data/combined/restaurants.json` |
| 所有地點（行程產生用） | `data/combined/all-places.json` |

---

## Data 目錄結構

```
data/
├── raw/                              # 各來源原始資料（分開儲存）
│   ├── exhibitions-culture.json      # 文化部展覽
│   ├── exhibitions-huashan.json      # 華山1914
│   ├── exhibitions-songshan.json     # 松山文創園區
│   ├── exhibitions-twtc.json         # 台北世貿中心
│   ├── exhibitions-ntsec.json        # 國立科教館
│   ├── movies-atmovies.json          # 開眼電影網
│   └── restaurants-curated.json      # 手動精選餐廳
└── combined/                         # 彙整後的資料（程式自動產生）
    ├── exhibitions.json
    ├── movies.json
    ├── restaurants.json
    └── all-places.json
```

---

## 統一資料格式（combined 用）

每個 place 正規化為：

```json
{
  "id": "huashan-001",
  "name": "蜷川實花展with EiM",
  "type": "exhibition",
  "source": "huashan",
  "category": "indoor",
  "address": "臺北市中正區八德路一段1號",
  "district": "中正區",
  "lat": 25.045,
  "lng": 121.529,
  "imageUrl": "https://...",
  "sourceUrl": "https://...",
  "startDate": "2026-01-17",
  "endDate": "2026-04-19",
  "goodFor": "both"
}
```

---

## 各來源資料結構筆記

### 文化部 Open Data (exhibitions-culture)
- **格式**: JSON API，直接回傳 array
- **關鍵欄位**: UID, title, showInfo[].location, showInfo[].locationName, showInfo[].latitude/longitude, startDate, endDate, webSales
- **篩選**: showInfo 的 location/locationName 含「臺北」或「台北」

### 華山1914 (exhibitions-huashan)
- **格式**: HTML 靜態渲染 + Isotope 動態排版
- **關鍵欄位**: 展覽名稱, 日期範圍, 分類標籤, 詳情連結
- **注意**: 圖片由 JS 動態插入，可能需從詳情頁取得

### 松山文創園區 (exhibitions-songshan)
- **格式**: HTML 靜態渲染
- **關鍵欄位**: 展覽名稱, 日期 (YYYY-MM-DD), 圖片URL (/gallery/...), 描述, 詳情連結
- **注意**: 圖片路徑為相對路徑，需加上 domain prefix

### 台北世貿中心 (exhibitions-twtc)
- **格式**: HTML 靜態 `<table>` 渲染
- **關鍵欄位**: 展出日期, 展覽名稱, 主辦單位, 電話, 展覽館別
- **注意**: 無圖片、按館別分 tab（世貿一館/南港展覽館1館/2館）

### 國立科教館 (exhibitions-ntsec)
- **格式**: HTML 靜態渲染
- **關鍵欄位**: 展覽名稱, 日期, 展區樓層, 圖片 (/images/ArticleListPic/{ID}_2.{ext})
- **地址**: 固定為臺北市士林區士商路189號

### 開眼電影網 (movies-atmovies)
- **格式**: HTML 列表
- **關鍵欄位**: 電影名稱, 上映日期 (YYYY/M/D), 片長, 廳數, 分級, 詳情連結 (/movie/{id}/)
- **分類**: 本期首輪 / 二輪 / 近期上映

---

## API Contracts

### POST /api/generate — 產生行程

```json
// Request
{
  "district": "大安區",
  "mode": "date",
  "setting": "indoor",
  "exclude": ["huashan-001", "atm-005"]
}

// Response
{
  "itineraries": [
    {
      "id": "abc123",
      "places": [
        { "id": "huashan-002", "name": "...", "type": "exhibition", "address": "...", "imageUrl": "..." },
        { "id": "rest-015", "name": "...", "type": "restaurant", "address": "...", "imageUrl": "..." },
        { "id": "atm-003", "name": "...", "type": "movie", "address": "...", "imageUrl": "..." }
      ]
    }
  ]
}
```

### POST /api/sync — 同步外部資料

```json
// Response
{
  "results": [
    { "source": "culture", "status": "success", "count": 4 },
    { "source": "huashan", "status": "success", "count": 12 },
    { "source": "songshan", "status": "success", "count": 18 },
    { "source": "twtc", "status": "success", "count": 8 },
    { "source": "ntsec", "status": "success", "count": 6 },
    { "source": "atmovies", "status": "success", "count": 71 }
  ]
}
```

---

## Itinerary Generation Algorithm

1. 讀取 `data/combined/all-places.json`
2. 依 filter（district, mode, setting）篩選
3. 分桶：**activity**（展覽/電影/景點）vs **food**（餐廳/咖啡/酒吧）
4. 套用模板組成 3 地點行程：
   - Template A：activity → food → activity
   - Template B：food → activity → food
5. 隨機選取（Fisher-Yates shuffle），確保 2 組行程無重複地點
6. 「再給我一組」帶 `exclude[]` 參數排除已顯示地點
7. 結果不足時漸進放寬條件：先移除地區 → 再移除室內/外

---

## Project Structure

```
date_plan/
├── plan/
│   └── implementation-plan.md
├── data/
│   ├── raw/                          # 各來源原始資料
│   │   ├── exhibitions-culture.json
│   │   ├── exhibitions-huashan.json
│   │   ├── exhibitions-songshan.json
│   │   ├── exhibitions-twtc.json
│   │   ├── exhibitions-ntsec.json
│   │   ├── movies-atmovies.json
│   │   └── restaurants-curated.json
│   └── combined/                     # 彙整後資料
│       ├── exhibitions.json
│       ├── movies.json
│       ├── restaurants.json
│       └── all-places.json
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   ├── result/
│   │   │   └── page.tsx
│   │   └── api/
│   │       ├── generate/
│   │       │   └── route.ts
│   │       └── sync/
│   │           └── route.ts
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── InputForm.tsx
│   │   ├── ItineraryCard.tsx
│   │   ├── PlaceItem.tsx
│   │   ├── ShuffleButton.tsx
│   │   └── SyncButton.tsx
│   ├── lib/
│   │   ├── data.ts                   # 讀取 JSON 資料
│   │   ├── generate.ts               # 行程產生演算法
│   │   ├── combine.ts                # 合併 raw → combined
│   │   └── sync/
│   │       ├── culture.ts            # 文化部 API
│   │       ├── huashan.ts            # 華山 scraping
│   │       ├── songshan.ts           # 松菸 scraping
│   │       ├── twtc.ts               # 世貿 scraping
│   │       ├── ntsec.ts              # 科教館 scraping
│   │       └── atmovies.ts           # 開眼電影 scraping
│   └── types/
│       └── index.ts
├── public/
│   └── favicon.ico
├── .env
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## UI Flow

### Screen 1 — Home（條件選擇）

- Header：「No Idea 不知道要幹嘛？」
- 三組選擇器（大按鈕，非下拉）：
  - **地點**：不限 / 大安 / 信義 / 中山 / 松山 / 大同 / 萬華 / 中正 / 士林 / ...
  - **類型**：約會 / 一個人
  - **場景**：室內 / 室外 / 都可以
- 主按鈕：「幫我安排！」
- 底部次要按鈕：「同步最新展覽/電影資料」

### Screen 2 — Results（行程結果）

- 2+ 組 ItineraryCard，垂直排列
- 每張卡片含 3 個地點，以 timeline 視覺連接
- 每個地點顯示：名稱、類型 badge、來源標記、地址
- 底部固定：「🎲 再給我一組」按鈕

---

## Build Order

### Phase 1: Scaffold

1. `npx create-next-app@latest . --typescript --tailwind --app --src-dir`
2. 建立 `data/raw/` 和 `data/combined/` 目錄
3. 寫 `src/types/index.ts`（Place, RawExhibition 等 types）
4. 寫 `src/lib/data.ts`（讀取 JSON 的 helper）

### Phase 2: 資料抓取（Sync）— 各來源分開

5. 寫 `src/lib/sync/culture.ts`（文化部 API → `data/raw/exhibitions-culture.json`）
6. 寫 `src/lib/sync/huashan.ts`（HTML scraping → `data/raw/exhibitions-huashan.json`）
7. 寫 `src/lib/sync/songshan.ts`（HTML scraping → `data/raw/exhibitions-songshan.json`）
8. 寫 `src/lib/sync/twtc.ts`（HTML scraping → `data/raw/exhibitions-twtc.json`）
9. 寫 `src/lib/sync/ntsec.ts`（HTML scraping → `data/raw/exhibitions-ntsec.json`）
10. 寫 `src/lib/sync/atmovies.ts`（HTML scraping → `data/raw/movies-atmovies.json`）
11. 寫 `src/app/api/sync/route.ts`（呼叫所有 sync，回傳結果）

### Phase 3: 資料彙整

12. 寫 `src/lib/combine.ts`（讀取所有 raw → 正規化 → 寫入 combined）
13. 建 `data/raw/restaurants-curated.json`（手動 50+ 筆）
14. 執行 combine 產生 `data/combined/all-places.json`

### Phase 4: 行程產生

15. 寫 `src/lib/generate.ts`（讀取 all-places.json → 篩選 → 隨機組合）
16. 寫 `src/app/api/generate/route.ts`

### Phase 5: Frontend — Home

17. Header, InputForm 組件
18. `src/app/page.tsx`

### Phase 6: Frontend — Results

19. PlaceItem, ItineraryCard, ShuffleButton 組件
20. `src/app/result/page.tsx`

### Phase 7: Sync UI + Polish

21. SyncButton 組件（含 loading 狀態 + toast）
22. Mobile-responsive layout（mobile-first）
23. Loading skeleton、empty state、error handling

---

## Verification Checklist

- [ ] `npm run dev` 啟動，確認首頁正常渲染
- [ ] 點「同步」→ 確認 `data/raw/` 下各檔案有資料
- [ ] 確認 `data/combined/all-places.json` 彙整正確
- [ ] 選條件 → 「幫我安排」→ 回傳 ≥ 2 組行程
- [ ] 「🎲 再給我一組」→ 回傳不同結果
- [ ] 縮小視窗確認 mobile 排版正常

---

## Not in MVP

- 使用者帳號 / 登入
- 儲存 / 收藏行程
- Google Maps 嵌入
- 評分 / 評論系統
- 社群分享功能
- 多城市支援
- 原生行動 App
- 後台管理介面
- Database（目前用 JSON 檔案即可）
