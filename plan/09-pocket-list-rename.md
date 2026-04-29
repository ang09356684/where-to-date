# Plan: 重命名「自訂地點」→「口袋名單」

## Context

「自訂地點」是工程語意（custom-defined records），不貼近實際使用情境（看到 IG / Threads / 朋友推薦 → 用 Google Maps 連結存下來，下次安排約會考慮）。改用台灣口語化、表達「先收藏起來、之後拿出來看」的 **口袋名單**，跟現有的「我的最愛」（從清單加心心）形成清楚分工：

| 名稱 | 來源 | 動作 |
|------|------|------|
| 我的最愛 ❤️ | 既有 sync 過的清單 | 從現成項目加心心 |
| 口袋名單 🔖 | 使用者貼 GMaps 連結手動加 | 「先記下來，下次再看」|

icon 也從 📍 換成 🔖：📍 偏「定位點」，🔖 才是「先夾起來」。`--theme-pin` CSS 變數名保留（內部命名，不動）。

目前無線上使用者、開發階段，採破壞性更新：路由、資料檔案、id prefix、`source` 欄位一次到位，不留舊向下相容。

---

## 範圍

### 路由與檔案結構

| 變更前 | 變更後 |
|--------|--------|
| `src/app/custom-places/page.tsx` | `src/app/pocket-list/page.tsx` |
| `src/app/custom-places/add/page.tsx` | `src/app/pocket-list/add/page.tsx` |
| `src/app/api/custom-places/route.ts` | `src/app/api/pocket-list/route.ts` |
| `src/app/api/custom-places/parse-gmap/route.ts` | `src/app/api/pocket-list/parse-gmap/route.ts` |
| `data/raw/custom-places.json` | `data/raw/pocket-list.json` |

### 內部識別碼

| 欄位 | 變更前 | 變更後 |
|------|--------|--------|
| `id` 前綴 | `custom-{ts}-{rand}` | `pocket-{ts}-{rand}` |
| `source` 值 | `"custom"` | `"pocket"` |

`Place.source` 在 type 是 `string`、不是 discriminated union，這個改動不會影響 type-check。`combine.ts` 也只是讀 JSON 不過濾 source 值，邏輯不變。

### UI 字串

| 變更前 | 變更後 |
|--------|--------|
| `自訂地點` | `口袋名單` |
| `📍 自訂地點`（首頁按鈕） | `🔖 口袋名單` |
| `← 返回自訂地點`（add 頁） | `← 返回口袋名單` |
| `還沒有自訂地點`（empty state） | `還沒有口袋名單` |
| `＋ 新增地點`（list 右上 CTA） | `＋ 新增項目` |
| `新增第一個地點`（empty state CTA） | `新增第一個項目` |
| `新增地點`（add 頁標題） | `新增項目` |
| `地點名稱`（add 頁欄位 label） | `名稱` |

*說明：「口袋名單」內裝的是廣義「項目」（餐廳、景點、店家等），不再強調「地點」這層工程語意。欄位 label 維持單字「名稱」/「地址」更貼近 Apple / Notion / Linear 表單慣例。*

---

## 修改檔案清單

**重命名**
- `src/app/custom-places/` → `src/app/pocket-list/`（整個資料夾 `mv`）
- `src/app/api/custom-places/` → `src/app/api/pocket-list/`（整個資料夾 `mv`）
- `data/raw/custom-places.json` → `data/raw/pocket-list.json`

**內容修改**
- `src/app/page.tsx`：`/custom-places` → `/pocket-list`、`📍 自訂地點` → `🔖 口袋名單`
- `src/app/pocket-list/page.tsx`：標題、empty state、所有 fetch path、`href` 內部連結
- `src/app/pocket-list/add/page.tsx`：返回連結、fetch path、router.push
- `src/app/api/pocket-list/route.ts`：`FILENAME = "pocket-list.json"`、`id` 前綴 `pocket-`、`source: "pocket"`
- `src/app/api/pocket-list/parse-gmap/route.ts`：路徑變更（內容無實質改動）
- `src/lib/combine.ts`：`readRawJson<Place[]>("pocket-list.json")`
- `src/components/PaletteSwitcher.tsx`：comment `// 自訂地點` → `// 口袋名單`

**資料遷移**
- `data/raw/pocket-list.json` 內既有兩筆項目：`id: "custom-..."` → `id: "pocket-..."`、`source: "custom"` → `source: "pocket"`

---

## 不需修改

| 檔案 | 原因 |
|------|------|
| `src/types/index.ts` | `source: string` 是寬鬆 type，不需改 |
| `src/lib/data.ts` | 只負責讀寫 JSON，不知道 filename 語意 |
| `globals.css` 內 `--theme-pin` | 純內部變數命名，重命名只會徒增雜訊 |
| `plan/04-custom-places.md` | 歷史紀錄，不重寫 |

---

## 驗證步驟

1. `npx tsc --noEmit` 通過
2. `npx eslint src/app/page.tsx src/app/pocket-list src/app/api/pocket-list src/lib/combine.ts src/components/PaletteSwitcher.tsx` 通過
3. 啟動 dev server，依序確認：
   1. 首頁右上角看到 `🔖 口袋名單`，點擊跳到 `/pocket-list` ✓
   2. `/pocket-list` 列表頁標題顯示 `口袋名單`，已有兩筆既有項目正常顯示
   3. `/pocket-list/add` 可以新增地點，新增後 id prefix 是 `pocket-`、source 是 `pocket`
   4. `POST /api/pocket-list/parse-gmap` 仍能解析 Google Maps 連結
   5. `DELETE /api/pocket-list` 刪除既有 `pocket-...` id 項目正常
4. 行程產生功能（首頁送出 →`/result`）能挑到口袋名單裡的食記項目

---

## 風險與緩解

- **舊書籤失效**：開發中、無線上使用者，可接受。如未來上線需要保留 `/custom-places` URL，可加 `next.config.ts` 的 redirects rule。
- **`source: "pocket"` 在 `combineAllPlaces()` 是否影響統計**：`combine.ts` 不依 source 值做特殊邏輯（只去重 + concat），驗證為無影響。
- **CSS 變數 `--theme-pin` 與新 icon 🔖 語意不一致**：純內部命名，沒人會看到。日後若做大整理再順手改。
