# Plan: 口袋名單匯出 / 匯入 JSON

## Context

口袋名單目前儲存在單一檔案 `data/raw/pocket-list.json`，所有類別（餐廳、景點、展覽、音樂、戲劇、電影）混在一起、用 `category` 欄位區分。使用者希望能：

1. **匯出** — 將整份 `pocket-list.json` 下載到本機，作為備份或搬移用途。
2. **匯入** — 選擇本機 JSON 檔，**直接整檔覆蓋**伺服器上的 `pocket-list.json`（現階段不做合併、不做衝突偵測）。

匯入後必須觸發 `combineAllPlaces()`，否則 `data/combined/*.json` 會與 raw 不同步，主推薦頁仍會看到舊資料。

---

## 設計決策（已與使用者確認）

| 項目 | 決定 |
|------|------|
| 匯出檔名 | `noidea-pocket-list-YYYYMMDD.json`（含當日日期） |
| 匯入確認 | 用 `window.confirm` 提醒「將覆蓋現有資料」 |
| 匯入驗證 | 輕量：`JSON.parse` 成功且結果為陣列即接受，不逐筆檢查 Place 欄位 |
| 匯出端點 | 不新增端點，前端直接 `fetch('/api/pocket-list')` 取現有 GET |
| 匯入端點 | 沿用 `/api/pocket-list`，新增 `PUT` handler |

---

## 範圍

### API — `src/app/api/pocket-list/route.ts`

新增 `PUT` handler，整檔取代 `pocket-list.json`：

```ts
export async function PUT(request: Request) {
  const body = await request.json();
  if (!Array.isArray(body)) {
    return NextResponse.json(
      { error: "Payload must be an array of places" },
      { status: 400 }
    );
  }
  writeRawJson(FILENAME, body);
  combineAllPlaces();
  return NextResponse.json({ ok: true, count: body.length });
}
```

- 重用既有的 `FILENAME`、`writeRawJson`、`combineAllPlaces`，不新增工具函式。
- 不對每筆做 Place 欄位驗證（依使用者選擇的「輕量檢查」）。
- GET / POST / DELETE handler 維持原樣。

### UI — `src/app/pocket-list/page.tsx`

在現有 header 區塊（標題列 + 「＋ 新增項目」按鈕的 flex row）加入兩顆次要按鈕：「匯出」「匯入」。沿用 Tailwind + `var(--theme-pin)` 配色，但用 outline / 透明背景樣式，避免與主要 CTA 互相競爭。

**匯出邏輯**

```ts
async function handleExport() {
  const res = await fetch("/api/pocket-list");
  const data = await res.json();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const a = document.createElement("a");
  a.href = url;
  a.download = `noidea-pocket-list-${today}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
```

**匯入邏輯**

- 一個隱藏的 `<input type="file" accept="application/json">`，用 `ref` 在「匯入」按鈕 `onClick` 時觸發 `input.click()`。
- `onChange` 流程：
  1. 讀取檔案文字 → `JSON.parse`，失敗時 `alert("檔案不是合法的 JSON")`。
  2. `Array.isArray` 檢查，失敗時 `alert("檔案內容必須是陣列")`。
  3. `window.confirm("將覆蓋現有 N 筆口袋名單，確定匯入 M 筆？")`。
  4. `fetch('/api/pocket-list', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: ... })`。
  5. 成功 → 呼叫既有的 `loadPlaces()` 重新拉取列表。
  6. 失敗 → `alert(error.message)`。
  7. 無論成功失敗，最後 `input.value = ""`，讓使用者能重複選同一個檔。

---

## 修改檔案清單

| 檔案 | 變更 |
|------|------|
| `src/app/api/pocket-list/route.ts` | 新增 `PUT` handler |
| `src/app/pocket-list/page.tsx` | 加兩顆按鈕、隱藏 file input、`handleExport` / `handleImport` |

不需修改 `src/lib/data.ts`、`src/lib/combine.ts`、`src/types/index.ts`、`src/app/api/pocket-list/parse-gmap/route.ts`。

---

## 不做的事

- 不分類別拆檔匯出 — 維持單一 `pocket-list.json`。
- 不做合併匯入 / 衝突偵測 — 直接覆蓋。
- 不驗證每筆 Place 欄位 — 信任使用者匯入自己的備份。
- 不做匯入 preview 頁 — `window.confirm` 已足夠。
- 不在匯入時自動產生新 id — 信任檔案內既有的 `id`。

---

## 驗證步驟

1. `npx tsc --noEmit` 通過。
2. `npm run dev`（或專案預設指令）啟動，開 `/pocket-list`。
3. **匯出**：點「匯出」 → 瀏覽器下載 `noidea-pocket-list-20260502.json` → 開檔確認內容與 `data/raw/pocket-list.json` 一致。
4. **匯入（取代）**：
   - 手動修改下載的 JSON（例如刪掉一筆、改一個 name），點「匯入」選該檔。
   - 確認對話框出現 → 按確定 → 列表立即更新。
   - 檢查 `data/raw/pocket-list.json` 內容與匯入檔完全相同。
   - 回到首頁 `/`，確認 `data/combined/all-places.json` 等 combined 檔已重新產生、推薦清單反映變更。
5. **錯誤路徑**：
   - 匯入 .txt 或亂碼 → alert 顯示「檔案不是合法的 JSON」。
   - 匯入 JSON 但根節點是物件 `{}` → alert 顯示「檔案內容必須是陣列」。
   - 取消確認對話框 → 不送出請求、不變更資料。
6. **空陣列匯入**：匯入 `[]` → 列表清空 → `data/combined/*.json` 中也應移除所有 `source: "pocket"` 條目。

---

## 風險與緩解

- **使用者匯入別人的檔案造成資料遺失**：已用 `window.confirm` 提醒；備份就是匯出檔本身，可隨時還原。
- **大檔案 JSON 解析阻塞 UI**：口袋名單資料量小（單數位 ~ 數十筆），`FileReader` + `JSON.parse` 在主執行緒完成可接受。
- **`combineAllPlaces()` 在 PUT 期間失敗**：與既有 POST/DELETE 行為一致，目前無 try/catch；若未來要強化，整個 route 一起加。
