# Plan: 類型多選（最多 3 個）

## Context

目前首頁的「類型」篩選器一次只能選一個（不限/展覽/演唱會/音樂會/戲劇/電影/景點/美食）。使用者希望能同時選最多 3 個類型，例如「展覽＋電影＋美食」，讓行程推薦更有彈性。

---

## UX 規則

- **最多選 3 個**類型
- **「不限」互斥**：點「不限」清除所有已選；點任何具體類型則取消「不限」
- **不能空選**：取消最後一個具體類型時自動回到「不限」
- **已滿 3 個時**：未選中的 chip 變淡（`opacity-40 cursor-not-allowed`），點了沒反應
- Label 改為「類型（最多 3 個）」提示使用者

---

## 資料流變更

```
舊: type="exhibition"           (單一字串)
新: type="exhibition,concert"   (逗號分隔字串)

InputForm state:  string     → string[]
URL param:        type=xxx   → type=xxx,yyy,zzz
API body:         type: "x"  → type: ["x","y","z"]
generate logic:   單值比對    → 陣列 includes 比對
```

---

## 修改檔案與內容

### 1. `src/types/index.ts`

`GenerateRequest.type` 從單一字串改為陣列：

```typescript
// 舊
type: "all" | "exhibition" | "concert" | ...;
// 新
type: ("all" | "exhibition" | "concert" | "music" | "theater" | "movie" | "attraction" | "food")[];
```

### 2. `src/components/InputForm.tsx`

**2a. State 改為陣列**

```typescript
// 舊
const [type, setType] = useState("all");
// 新
const [types, setTypes] = useState<string[]>(["all"]);
```

**2b. 新增 `MultiChipGroup` 元件**（與現有 `ChipGroup` 並存，城市/場景仍用單選）

```typescript
interface MultiChipGroupProps {
  label: string;
  options: readonly { value: string; label: string }[];
  selected: string[];
  maxSelect: number;
  onSelect: (values: string[]) => void;
}
```

互斥與上限邏輯：
- 點「all」→ 設為 `["all"]`
- 點具體類型且目前是「all」→ 設為 `[該類型]`
- 點已選中類型 → 移除，若空則回到 `["all"]`
- 點未選中類型且 `selected.length < maxSelect` → 加入
- 點未選中類型且已滿 → 不動作

**2c. 替換 JSX**

```tsx
<MultiChipGroup
  label="類型（最多 3 個）"
  options={TYPES}
  selected={types}
  maxSelect={3}
  onSelect={setTypes}
/>
```

**2d. handleSubmit URL 參數**

```typescript
const params = new URLSearchParams({
  district,
  type: types.join(","),
  setting,
});
```

### 3. `src/app/result/page.tsx`

**3a. 解析 URL 參數**

```typescript
const typeParam = searchParams.get("type") ?? "all";
const types = typeParam.split(",").filter(Boolean);
```

**3b. API 呼叫 body**

```typescript
body: JSON.stringify({ district, type: types, setting, exclude: excludeIds })
```

**3c. Badge 顯示改為多個**

```tsx
{types.map((t) => (
  <span key={t} className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1">
    {TYPE_LABELS[t] ?? t}
  </span>
))}
```

### 4. `src/app/api/generate/route.ts`

加入向下相容的正規化（處理舊的單一字串書籤/連結）：

```typescript
if (typeof body.type === "string") {
  body.type = body.type.split(",").filter(Boolean);
}
```

### 5. `src/lib/generate.ts`

**5a. `matchesType` 簡化**

```typescript
// 舊: 逐一 if 判斷單一字串
// 新: 陣列 includes
function matchesType(place: Place, typeFilters: string[]): boolean {
  if (typeFilters.includes("all")) return true;
  return typeFilters.includes(place.type);
}
```

**5b. `pickPlaces` 參數改為陣列**

邏輯分支：
- 只有 food → 挑 3 個 food
- 只有 activity 類 → activity → food → activity（food 仍作為中間穿插，即使沒選 food）
- 混合或 all → activity → food → activity

因為 `matchesBase` 已篩選過，`activities` pool 只含符合所選類型的地點，`pickFrom` 自然從中隨機抽取，不需額外的每種類型平衡邏輯。

---

## 不需修改的檔案

| 檔案 | 原因 |
|------|------|
| `PlaceItem.tsx` | 只顯示單一地點的 type badge，不受影響 |
| `ItineraryCard.tsx` | 包裝 PlaceItem，不涉及 type filter |
| `BrowseList.tsx` | 瀏覽頁用的是 `/api/list?type=xxx` 單一類型，不受影響 |
| `combine.ts` / `sync/*.ts` | 資料層不涉及篩選邏輯 |
| `favorites.ts` | 收藏功能不涉及 type filter |

---

## 實作順序

1. `src/types/index.ts` — 改 GenerateRequest.type 為陣列
2. `src/lib/generate.ts` — 改 matchesType + pickPlaces 支援陣列
3. `src/app/api/generate/route.ts` — 加字串→陣列正規化
4. `src/components/InputForm.tsx` — 新增 MultiChipGroup + state 改陣列
5. `src/app/result/page.tsx` — 解析逗號分隔 + 多 badge 顯示

---

## 向下相容

- 舊書籤 `?type=exhibition`（單一字串）→ `"exhibition".split(",")` = `["exhibition"]` ✓
- API route 額外判斷 `typeof body.type === "string"` 做正規化 ✓

---

## 驗證步驟

1. 選 1 個類型 → 行為與改版前完全相同
2. 選 2 個類型（如展覽+電影）→ 結果頁顯示 2 個 badge，行程含兩種類型的地點
3. 選 3 個類型 → 第 4 個 chip 變灰不可選
4. 選「不限」→ 清除所有已選，回到單一「不限」badge
5. 從具體類型點「不限」→ 立即切回不限
6. 取消最後一個具體類型 → 自動回「不限」
7. 只選「美食」→ 行程全是美食（3 個 food）
8. 選「展覽＋美食」→ 行程混合展覽與美食
9. 「再給我一組」shuffle 正常運作
10. 舊的單類型書籤 URL 仍能正確運作
