# Plan: 統一 food 類別 + 新增美食/景點瀏覽頁

## Context

原本美食相關資料使用三個 PlaceType（restaurant / cafe / bar），UI 上也分開顯示「餐廳」「咖啡廳」「酒吧」。使用者希望合併為單一的 `food` 類別，統一顯示為「美食」。同時首頁缺少「美食」和「景點」的瀏覽入口，需要補上。

---

## 改動一：統一 food 類別

### 問題

- `PlaceType` 有 `restaurant | cafe | bar` 三個獨立 type
- 各處（generate / favorites / list API / combine / PlaceItem）都用陣列 `["restaurant", "cafe", "bar"]` 判斷是否為美食
- sync 模組（taoyuan-food.ts）會依內容猜測產出不同 type
- 手動精選 JSON（restaurants-curated.json / restaurants-taoyuan-curated.json）內每筆資料也各有不同 type

### 做法

1. `src/types/index.ts` — PlaceType 移除 `restaurant | cafe | bar`，新增 `food`
2. `src/lib/generate.ts` — `isFood()` 改為 `p.type === "food"`
3. `src/app/favorites/page.tsx` — `isFood()` 同上
4. `src/app/api/list/route.ts` — 移除 FOOD_TYPES 陣列，直接用 `p.type === type` 統一比對
5. `src/lib/combine.ts` — restaurants filter 改為 `p.type === "food"`
6. `src/components/PlaceItem.tsx` — TYPE_LABELS / TYPE_COLORS 移除 restaurant / cafe / bar，只保留 `food: "美食"`
7. `src/lib/sync/taoyuan-food.ts` — 移除 `guessType()` 函式，直接使用 `type: "food"`
8. `src/components/InputForm.tsx` — 類型選項 `{ value: "food", label: "美食" }`
9. `src/app/result/page.tsx` — filter badge `food: "美食"`
10. `src/app/favorites/page.tsx` — tab label 改為 `"美食"`
11. `data/raw/restaurants-curated.json` — 批次將所有 type 改為 `"food"`
12. `data/raw/restaurants-taoyuan-curated.json` — 同上

---

## 改動二：新增美食/景點瀏覽頁 + 首頁入口

### 問題

首頁 BROWSE_LINKS 只有展覽/演唱會/音樂會/戲劇/電影，缺少美食和景點。

### 做法

1. `src/app/page.tsx` — BROWSE_LINKS 新增：
   - `{ href: "/attractions", label: "景點", icon: "🏞️" }`
   - `{ href: "/food", label: "美食", icon: "🍽️" }`
2. `src/app/attractions/page.tsx` — 新建，使用 `BrowseList` 元件，`apiType="attraction"`
3. `src/app/food/page.tsx` — 新建，使用 `BrowseList` 元件，`apiType="food"`

---

## 修改檔案

| 檔案 | 修改內容 |
|------|----------|
| `src/types/index.ts` | PlaceType 移除 restaurant/cafe/bar，加 food |
| `src/lib/generate.ts` | `isFood()` 簡化為 `p.type === "food"` |
| `src/lib/combine.ts` | restaurants filter 簡化 |
| `src/lib/sync/taoyuan-food.ts` | 移除 guessType，統一用 `"food"` |
| `src/components/PlaceItem.tsx` | TYPE_LABELS / TYPE_COLORS 只保留 food |
| `src/components/InputForm.tsx` | label 改「美食」 |
| `src/app/result/page.tsx` | filter badge 改「美食」 |
| `src/app/favorites/page.tsx` | isFood 簡化 + tab label 改「美食」 |
| `src/app/api/list/route.ts` | 移除 FOOD_TYPES 特殊邏輯 |
| `src/app/page.tsx` | BROWSE_LINKS 加景點 + 美食 |
| `data/raw/restaurants-curated.json` | 批次 type → "food" |
| `data/raw/restaurants-taoyuan-curated.json` | 批次 type → "food" |

## 新增檔案

| 檔案 | 用途 |
|------|------|
| `src/app/food/page.tsx` | 美食瀏覽頁（BrowseList） |
| `src/app/attractions/page.tsx` | 景點瀏覽頁（BrowseList） |

---

## 驗證步驟

1. 首頁看到 7 個瀏覽入口（展覽/演唱會/音樂會/戲劇/電影/景點/美食）
2. 點「美食」→ 看到所有美食列表（原本的餐廳/咖啡/酒吧合併顯示）
3. 點「景點」→ 看到台北 + 桃園景點
4. PlaceItem badge 統一顯示「美食」（不再出現「餐廳」「咖啡廳」「酒吧」）
5. 幫我安排 → 選類型「美食」→ 結果正常
6. grep 確認程式碼中不再有 `"restaurant"` / `"cafe"` / `"bar"` 作為 type 值
