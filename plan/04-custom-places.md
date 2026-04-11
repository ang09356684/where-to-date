# Plan: 自訂地點功能

## Context

目前 app 的地點全部來自外部 API 同步（展覽/電影/演唱會等），使用者無法自己新增地點。需要讓使用者可以從主頁面進入「自訂地點」，手動輸入地點名稱與地址，新增到系統中，與現有資料整合參與行程產生。

---

## UX Flow

```
主頁
  → 「📍 自訂地點」按鈕（在「我的最愛」下方）
    → /custom-places 頁面
      - 顯示已儲存的自訂地點列表（可刪除）
      - 「＋ 新增地點」按鈕
        → /custom-places/add 頁面
          Step 1: 選擇分類（展覽/演唱會/景點/餐廳…）
          Step 2: 選擇室內/室外
          Step 3: 輸入地點名稱
          Step 4: 輸入地址
          Step 5: 確認所有資訊 → 儲存
          → 返回 /custom-places 看到新地點
```

用獨立頁面而非彈窗：app 目前全是頁面導航，無 modal 基礎設施。

---

## 儲存策略

**Server-side JSON 檔案**（與現有資料來源相同模式）：

- 儲存在 `data/raw/custom-places.json`
- 透過 API route 讀寫（POST 新增 / GET 讀取 / DELETE 刪除）
- `combine.ts` 讀取 `custom-places.json` 並合併到 `all-places.json`
- sync 不會覆蓋自訂地點（sync 只更新各外部來源的 raw JSON）
- 與現有架構完全一致：每個來源一個 raw JSON → combine 合併

**Place 格式**：使用現有 `Place` interface，`source: "custom"`，ID 格式: `custom-{timestamp}-{random4}`

**District 判斷**：從使用者輸入的地址中擷取行政區（比對「XX區」），找不到則設為 `"不限"`。

### 資料目錄更新

```
data/
├── raw/
│   ├── ... (existing sources)
│   └── custom-places.json        ← 新增：自訂地點
└── combined/
    └── all-places.json           ← combine 時包含自訂地點
```

---

## 與行程產生整合

自訂地點透過 `combine.ts` 合併進 `all-places.json` 後，**自動參與現有的 generate 流程**，不需要修改 `generate.ts` 或 `result/page.tsx`。

新增/刪除自訂地點時，API route 寫入 raw JSON 後呼叫 `combineAllPlaces()` 重新合併。

---

## 新增檔案

| 檔案 | 用途 |
|------|------|
| `src/app/custom-places/page.tsx` | 自訂地點管理頁（列表 + 刪除） |
| `src/app/custom-places/add/page.tsx` | 新增地點頁（分類 + 室內外 + 名稱 + 地址輸入） |
| `src/app/api/custom-places/route.ts` | 自訂地點 CRUD API（GET / POST / DELETE + 觸發 combine） |

## 修改檔案

| 檔案 | 修改內容 |
|------|----------|
| `src/app/page.tsx` | 加「📍 自訂地點」按鈕（在「我的最愛」下方） |
| `src/lib/combine.ts` | 讀取 `custom-places.json` 並合併到 all-places |

---

## Build Order

### Step 1: Custom places CRUD API
- `src/app/api/custom-places/route.ts`
  - `GET` — 讀取 `data/raw/custom-places.json`，回傳 Place[]
  - `POST` — 新增 Place，寫入 JSON，呼叫 `combineAllPlaces()`
  - `DELETE` — 刪除指定 ID，寫入 JSON，呼叫 `combineAllPlaces()`
- 測試：`curl http://localhost:3000/api/custom-places` 確認回傳空陣列

### Step 2: Combine 整合
- `src/lib/combine.ts` — 加入讀取 `custom-places.json`，合併到 all-places

### Step 3: 新增地點頁
- `src/app/custom-places/add/page.tsx`
  - ChipGroup 選分類（與 InputForm 相同 UI 模式）
  - ChipGroup 選室內/室外/都可以
  - 文字輸入框：地點名稱
  - 文字輸入框：地址（從地址自動擷取行政區作為 district）
  - 確認資訊摘要 → 「儲存」呼叫 POST `/api/custom-places`

### Step 4: 管理頁
- `src/app/custom-places/page.tsx`
  - GET `/api/custom-places` 載入列表
  - 每個地點顯示名稱、分類 badge、地址、刪除按鈕
  - 「＋ 新增地點」按鈕連結到 `/custom-places/add`
  - 空列表顯示引導文字

### Step 5: 主頁入口
- `src/app/page.tsx` — 在「我的最愛」下方加「📍 自訂地點」按鈕

---

## 驗證步驟

1. 主頁看到「📍 自訂地點」按鈕，點進去看到空列表
2. 點「新增」→ 選分類 + 室內外 → 輸入名稱「鼎泰豐信義店」→ 輸入地址「台北市信義區...」→ 儲存
3. 返回管理頁看到新增的地點，可刪除
4. 確認 `data/raw/custom-places.json` 有資料
5. 確認 `data/combined/all-places.json` 包含自訂地點（district 自動判斷為「信義區」）
6. 回主頁 → 幫我安排 → 結果中看到自訂地點出現在行程中
7. 刪除自訂地點 → 確認從 `all-places.json` 中移除

---

## 未來考量：Google Places API 整合

目前使用手動輸入地址，未來可整合 Google Places API 讓使用者直接搜尋地點、自動帶入地址與經緯度。

### Google Maps 免費方案（2025/3 新制）

舊的 $200/月額度已取消，改為每個 SKU 獨立免費額度：

| SKU | 分類 | 免費額度 |
|-----|------|---------|
| Autocomplete Requests | Essentials | 10,000 次/月 |
| Text Search (IDs Only) | Essentials | 10,000 次/月 |
| Place Details Essentials | Essentials | 10,000 次/月 |

**對小型 app 完全免費，不會被收費。**

### 整合方式

1. 建立 Google Cloud 帳號 + 新 Project → 啟用 **Places API (New)** → 建立 API Key
2. 將 API Key 加入 `.env.local`：`GOOGLE_PLACES_API_KEY=your-key-here`
3. 新增 `src/app/api/places-search/route.ts` — server-side proxy（API key 不暴露給前端）
4. 修改 `/custom-places/add` 頁面：將地址輸入框替換為搜尋框 + 結果列表
5. 選擇結果後自動帶入名稱、地址、經緯度

### 參考文件

- [Google Maps Platform March 2025 pricing changes](https://developers.google.com/maps/billing-and-pricing/march-2025)
- [Places API Usage and Billing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing)
- [10,000 monthly free calls per product](https://mapsplatform.google.com/resources/blog/start-building-today-with-up-to-10-000-monthly-free-calls-per-product/)
