# Plan: 同步進度條

## Context
目前按下同步按鈕後只顯示「同步中...」，15 個來源全部完成才會顯示結果（Playwright 來源可能要 30 秒以上）。使用者希望能看到即時進度。

## 做法
用 Server-Sent Events (SSE) 從 sync API 串流回傳。每完成一個來源就送一個進度事件給前端，即時更新進度條。

### API 修改：`src/app/api/sync/route.ts`
- 從 `Promise.all`（等全部完成）改為逐個執行 + 串流回傳
- 回傳 `ReadableStream`，content type 設為 `text/event-stream`
- 每完成一個來源送出：`data: {"source":"culture","status":"success","count":17,"progress":1,"total":15}\n\n`
- 最後送出合併結果：`data: {"done":true,"totalPlaces":734}\n\n`
- 快速來源（fetch）先並行跑完，Playwright 來源（opentix, kktix）最後依序執行避免資源衝突

### UI 修改：`src/components/SyncButton.tsx`
- 用 `fetch` + `ReadableStream` reader 讀取 SSE
- 顯示進度條：`[████████░░░░] 8/15 同步中: tixcraft`
- 顯示目前正在同步的來源名稱
- 完成後顯示總筆數摘要

### 來源分組：
**快速（fetch，並行執行）：**
culture, culture-music, culture-theater, huashan, songshan, twtc, ntsec, atmovies, taipei-attraction, taoyuan, tixcraft, era-ticket, kham

**慢速（依序執行）：**
opentix, kktix

> opentix 已從 Playwright 改為 fetch-based（批次並行抓取 sitemap 內的活動頁面），耗時從 5~10 分鐘降至 ~15 秒。
> kktix 仍使用 Playwright（頁面為 JS render，fetch 無法取得內容）。

### Server Log
API route 每個來源開始/完成時輸出 log，包含狀態與耗時：
```
[sync] ▶ huashan started
[sync] ✔ huashan success (18 items, 3199ms)
```

## 修改檔案
- `src/app/api/sync/route.ts` — SSE 串流回應 + server log
- `src/components/SyncButton.tsx` — 進度條 UI
- `src/lib/sync/opentix.ts` — 從 Playwright 改為 fetch-based

## 驗證
1. 點同步按鈕 → 看到進度條逐步填滿
2. 每個來源名稱完成時顯示
3. 進度顯示「X/15」
4. 完成後顯示總筆數
5. 錯誤的來源不影響進度流程
6. server terminal 可看到每個來源的 log 與耗時
