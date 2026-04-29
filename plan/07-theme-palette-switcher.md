# Plan: 整合深淺模式 + lolcolors 主題配色選單

## Context

原本首頁右上角有兩顆獨立的浮動按鈕：

1. `ThemeToggle`（top-4）— 切換 dark / light mode（☀️/🌙）
2. `PaletteSwitcher`（top-16）— 切換主題配色 chip 與背景色

兩顆按鈕分開且樣式不一致，視覺上佔位、語意又重疊（都在「換外觀」）。希望整合成一顆按鈕、一個下拉選單，並把配色資料來源換成由 [lolcolors](https://webdesignrankings.com/resources/lolcolors/) 衍生的 4 色系列，讓使用者能更自由地切換主題色。

---

## UX 規則

- **單一觸發按鈕**：固定於 `right-4 top-4`，圓形 `h-10 w-10`，僅顯示 🎨 一個調色盤 icon，不在 trigger 上塞 mode / palette 名稱（資訊量改放在下拉內，trigger 只負責「打開選單」）。`title` 屬性放當前狀態（如 `淺色・薄荷紫`）給滑鼠 hover
- **點擊展開下拉**：寬 `w-64`，內容由上而下：
  1. **Mode segmented control**：`☀️ 淺色` / `🌙 深色`，採 segmented 風格，當前模式高亮
  2. **Palette 列表**：每列一個 palette（emoji + 4 色 swatch + 名稱 + 選中 ✓）
- **關閉條件**：
  - 點選 palette → 立即關閉
  - 切換 mode → 不關閉（方便連續比對）
  - 點選下拉外的區域 → 關閉
  - 按 `Esc` → 關閉
- **持久化**：
  - `theme` (light|dark) 寫入 `localStorage`，與既有的 pre-paint inline script 相容
  - `palette-id` 寫入 `localStorage`，下次啟動時恢復
- **首次進入**：依 `prefers-color-scheme` 決定 mode；palette 預設為 `default`（黑底白字 + 桃紅 + 紫）

---

## 配色資料來源

每個 palette 對應 lolcolors 的 4 色組合，並依本專案語意對應到：

| 變數 | 用途 |
|------|------|
| `accent` | 主要 CTA、選中 chip |
| `onAccent` | accent 上的文字（多為白） |
| `heart` | 我的最愛 |
| `pin` | 自訂地點 |
| `surface` | 頁面背景柔和色 |
| `surfaceDark` | dark mode 對應背景 |

收錄 13 組 lolcolors-derived palette 加上 `default`：

| id | 名稱 | emoji |
|----|------|-------|
| `default` | 預設 | 🍎 |
| `mint-lavender` | 薄荷紫 | 💎 |
| `peach-pop` | 蜜桃橘 | 🍑 |
| `primary-pop` | 原色普普 | 🎨 |
| `lavender-mist` | 薰衣草 | 💜 |
| `sunset-slate` | 暮色橙 | 🌅 |
| `forest-mint` | 森林綠 | 🌲 |
| `deep-purple` | 深紫夜 | 🌌 |
| `retro-pop` | 復古普普 | 📻 |
| `pastel-rainbow` | 粉彩虹 | 🌈 |
| `sunset-coral` | 夕陽珊瑚 | 🪸 |
| `tangerine-navy` | 蜜柑藍 | 🍊 |
| `vintage-rose` | 復古玫瑰 | 🌹 |
| `retro-poster` | 復古海報 | 🎪 |

> 飽和度過高的原色（如 lolcolors #58C9B9）會調淡作為 `surface`，避免內容區可讀性下降。

---

## 修改檔案與內容

### 1. `src/components/PaletteSwitcher.tsx`（完整重寫）

合併原本兩個元件的職責：

- 保留 `Palette` type 與 `PALETTES` 常數的 export
- 套用 palette 的邏輯不變：寫 CSS variable `--theme-accent` / `--theme-on-accent` / `--theme-heart` / `--theme-pin` / `--theme-surface`
- 新增 dark/light state 與切換邏輯（從 `ThemeToggle` 遷移過來）：
  ```ts
  const setMode = (next: boolean) => {
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };
  ```
- 新增 click-outside / Esc 監聽，控制 `open` state
- `MutationObserver` 仍監聽 `documentElement` 的 class 變化，dark mode 切換後重新套用 surface（雖然現在切換源在元件內，但保留以容納外部寫入 `dark` class 的情況）

### 2. `src/app/layout.tsx`

```diff
- import ThemeToggle from "@/components/ThemeToggle";
  import PaletteSwitcher from "@/components/PaletteSwitcher";
  ...
-       <ThemeToggle />
        <PaletteSwitcher />
```

`<head>` 內既有的 pre-paint inline script（讀 `localStorage.theme` 並設 `.dark` class）保持不變，避免 dark mode 在首次 render 閃爍。

### 3. `src/components/ThemeToggle.tsx`

刪除整個檔案，功能已併入 `PaletteSwitcher`。

### 4. `src/app/globals.css`

無變更。`--theme-*` 變數定義與 `.dark { --theme-surface }` 覆寫已能滿足新元件需求。

### 5. `src/components/InputForm.tsx`

把舊的 4 個 CSS 變數引用換成新的：

```diff
- background: "var(--p-deep)",  →  background: "var(--theme-accent)",
- color: "var(--p-soft)",        →  color: "var(--theme-on-accent)",
- background: "var(--p-mid)",    →  background: "var(--theme-heart)",
```

共 8 處，覆蓋 chip 選中態與「再給我一組」CTA。

---

## 不需修改的檔案

| 檔案 | 原因 |
|------|------|
| `page.tsx` / `result/page.tsx` / `favorites/page.tsx` / `custom-places/*.tsx` | 已使用 `var(--theme-*)`，與 palette 名稱無關 |
| `globals.css` | CSS variable 結構未動 |

---

## 實作順序

1. 取得 lolcolors 的 65 組配色（`WebFetch`），挑 13 組多樣性高且飽和度堪用的
2. 為每組 palette 對應 `accent / heart / pin / surface / surfaceDark`，必要時把 `surface` 調淡
3. 重寫 `PaletteSwitcher.tsx`：palette 陣列 + dark/light state + click-outside / Esc
4. 從 `layout.tsx` 移除 `<ThemeToggle />` 與 import
5. 刪除 `src/components/ThemeToggle.tsx`
6. 把 `InputForm.tsx` 的 `var(--p-*)` 全部替換為對應的 `var(--theme-*)`
7. 從 `PaletteSwitcher.applyPalette` 移除 4 行 legacy `--p-*` 寫入
8. `readInitialIndex` 偵測陌生 ID 時清掉 `localStorage.palette-id`
9. `npx tsc --noEmit` + `npx eslint` 雙重檢查

---

## 破壞性更新（無向下相容）

目前無其他使用者，直接做乾淨切換、不再背舊 ID / 舊變數的包袱：

- **舊 palette ID**（`cream` / `mint` / `sunset` / `ocean` / `desert` / `berry`）一律不支援。`readInitialIndex` 偵測到陌生 ID 時，從 `localStorage` 移除 `palette-id`，並 fallback 到 `default`（避免下次再次走入無效分支）
- **舊 CSS 變數**（`--p-deep` / `--p-mid` / `--p-light` / `--p-soft`）已全面移除：
  - `PaletteSwitcher` 不再寫入這 4 個變數
  - `InputForm.tsx` 內所有 `var(--p-*)` 改為對應的 `var(--theme-*)`：
    - `--p-deep` → `--theme-accent`
    - `--p-soft` → `--theme-on-accent`
    - `--p-mid` → `--theme-heart`
    - `--p-light` → `--theme-surface`
- `localStorage.theme` 鍵名不變（dark/light 偏好維持，與既有 pre-paint script 一致）
- `PALETTES` 仍 export，便於日後測試或外部引用

---

## 驗證步驟

1. **首次進入**：依系統偏好決定 dark/light，trigger button 顯示對應 ☀️/🌙；palette 顯示 🍎 預設
2. **切 dark mode**：點 `🌙 深色` → 整頁背景變深、chip 顏色重算、不關閉下拉
3. **切回 light mode**：點 `☀️ 淺色` → 背景回淺、CSS variable 切回 `surface`
4. **選 palette**：點任一列 → CTA / heart / pin / 背景立即套色，下拉自動關閉，trigger button 名稱與 swatch 同步
5. **持久化**：重整頁面 → mode 與 palette 維持上次選擇
6. **點外部關閉**：開啟下拉後點頁面其他位置 → 自動關閉
7. **Esc 關閉**：開啟下拉後按 Esc → 自動關閉
8. **舊 palette ID**：手動 `localStorage.setItem("palette-id", "cream")` 後重整 → 不報錯，自動 fallback 到 `default`
9. **首屏不閃爍**：dark mode 啟用下重整 → `<head>` 的 inline script 在 React hydration 之前已加上 `.dark` class，背景不會先白後黑
10. **a11y**：trigger 有 `aria-label` 與 `aria-expanded`；mode 按鈕有 `aria-pressed`；segmented control 有 `role="group"` 與 `aria-label`

---

## 後續可擴充

- 從 lolcolors 引入更多 palette，做成「分頁/分類」的 picker（warm / cool / pastel / neon）
- 自訂 palette：使用者輸入 4 個 hex，即時預覽並存到 `localStorage`
- `prefers-reduced-motion` 時關閉背景色 transition
