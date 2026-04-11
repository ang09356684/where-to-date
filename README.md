# No Idea - 不知道要幹嘛？

幫你在沒想法時快速產生台北 / 桃園行程建議。

---

## 啟動

```bash
cd where-to-date
npm install   # 第一次使用需安裝依賴
npm run dev
```

啟動後打開瀏覽器：http://localhost:3000

## 關閉

在執行 `npm run dev` 的終端按 `Ctrl + C`。

## 確認是否在執行

瀏覽器打開 http://localhost:3000 ，有畫面就是在跑。

---

## 第一次使用

1. 啟動 server（`npm run dev`）
2. 打開 http://localhost:3000
3. 點底部「同步最新展覽 / 電影資料」按鈕 → 等待同步完成
4. 選擇地點 / 類型 / 場景 → 點「幫我安排！」

> 同步只需要做一次，資料會存在 `data/` 資料夾。之後想更新再點同步即可。

---

## 功能說明

| 功能 | 說明 |
|------|------|
| 幫我安排 | 依條件隨機產生 2 組行程，每組 3 個地點 |
| 🎲 再給我一組 | 排除已顯示的地點，換一組新的 |
| 瀏覽展覽 | 查看所有展覽列表，可按來源篩選 |
| 瀏覽演唱會 | 查看演唱會列表（拓元/年代/寬宏/KKTIX 等） |
| 瀏覽音樂會 | 查看古典音樂、音樂會列表 |
| 瀏覽戲劇 | 查看戲劇表演列表 |
| 瀏覽電影 | 查看所有上映中電影列表 |
| 瀏覽景點 | 查看台北 / 桃園景點列表 |
| 瀏覽美食 | 查看精選餐廳、咖啡廳列表 |
| 自訂地點 | 手動新增地點（名稱 + 地址），整合到行程產生 |
| 我的最愛 | 收藏喜歡的地點，可從最愛直接安排行程 |
| 同步資料 | 從外部網站抓取最新展覽 / 電影 / 演出 / 景點資料 |

## 篩選條件

| 條件 | 選項 |
|------|------|
| 地點 | 不限 / 台北（可展開 12 區）/ 桃園（可展開 6 區）|
| 類型 | 不限 / 展覽 / 演唱會 / 音樂會 / 戲劇 / 電影 / 景點 / 美食 |
| 場景 | 都可以 / 室內 / 室外 |

---

## 資料來源

### 展覽（自動同步）

| 來源 | 網站 |
|------|------|
| 文化部 Open Data | cloud.culture.tw |
| 華山1914文創園區 | huashan1914.com |
| 松山文創園區 | songshanculturalpark.org |
| 台北世貿中心 | twtc.com.tw |
| 國立科教館 | ntsec.gov.tw |

### 演唱會 / 音樂會 / 戲劇（自動同步）

| 來源 | 網站 |
|------|------|
| 文化部音樂類 | cloud.culture.tw |
| 文化部戲劇類 | cloud.culture.tw |
| 拓元售票 | tixcraft.com |
| 年代售票 | ticket.com.tw |
| 寬宏售票 | kham.com.tw |
| 兩廳院 OPENTIX | opentix.life |
| KKTIX | kktix.com |

### 電影（自動同步）

| 來源 | 網站 |
|------|------|
| 開眼電影網 | atmovies.com.tw |

### 景點（自動同步 + 手動）

| 來源 | 說明 |
|------|------|
| 台北景點 | 手動精選 25 個（步道、公園、博物館等）|
| 桃園觀光 API | travel.tycg.gov.tw（自動同步）|

### 美食（手動精選）

| 檔案 | 說明 |
|------|------|
| `data/raw/restaurants-curated.json` | 台北 50 筆 |
| `data/raw/restaurants-taoyuan-curated.json` | 桃園 15 筆 |

> 要新增美食？直接編輯上面兩個 JSON 檔案，或使用首頁「自訂地點」功能。

### 自訂地點（手動新增）

| 檔案 | 說明 |
|------|------|
| `data/raw/custom-places.json` | 使用者透過頁面新增的地點 |

> 透過首頁「📍 自訂地點」→「新增地點」，選擇分類並輸入名稱與地址即可。

---

## 資料儲存位置

```
data/
├── raw/                                 ← 各來源原始資料（同步按鈕會更新這裡）
│   ├── exhibitions-culture.json
│   ├── exhibitions-huashan.json
│   ├── exhibitions-songshan.json
│   ├── exhibitions-twtc.json
│   ├── exhibitions-ntsec.json
│   ├── performances-tixcraft.json
│   ├── performances-era-ticket.json
│   ├── performances-kham.json
│   ├── performances-opentix.json
│   ├── performances-kktix.json
│   ├── movies-atmovies.json
│   ├── attractions-taipei.json
│   ├── attractions-taoyuan.json
│   ├── restaurants-curated.json         ← 手動編輯
│   ├── restaurants-taoyuan-curated.json ← 手動編輯
│   └── custom-places.json              ← 自訂地點（頁面新增）
└── combined/                            ← 程式自動彙整（不需手動修改）
    ├── all-places.json
    ├── exhibitions.json
    ├── concerts.json
    ├── music.json
    ├── theater.json
    ├── movies.json
    ├── restaurants.json
    └── attractions.json
```

---

## 技術架構

- **Framework**: Next.js 16 + TypeScript + Tailwind CSS v4
- **Storage**: JSON 檔案（無資料庫），收藏功能使用 localStorage
- **資料抓取**: 文化部 JSON API + HTML scraping（華山/松菸/世貿/科教館/開眼電影/售票網站）+ 桃園觀光 XML API
- **同步進度**: Server-Sent Events (SSE) 即時串流進度
