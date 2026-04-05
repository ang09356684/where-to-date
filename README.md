# No Idea - 不知道要幹嘛？

幫你在沒想法時快速產生台北 / 桃園行程建議。

---

## 啟動

```bash
cd D:\repo\date_plan
npm run dev
```

啟動後打開瀏覽器：http://localhost:3000

## 關閉

**方法 1**：在執行 `npm run dev` 的終端按 `Ctrl + C`

**方法 2**：如果終端關掉了或是背景執行，打開任意終端輸入：

```bash
taskkill /F /IM node.exe
```

這會關閉所有 Node.js process（包含 dev server）。

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
| 瀏覽電影 | 查看所有上映中電影列表 |
| 瀏覽展覽 | 查看所有展覽列表，可按來源篩選 |
| 同步資料 | 從外部網站抓取最新展覽 / 電影 / 景點資料 |

## 篩選條件

| 條件 | 選項 |
|------|------|
| 地點 | 不限 / 台北（可展開 12 區）/ 桃園（可展開 5 區）|
| 類型 | 不限 / 展覽 / 電影 / 景點 / 餐廳咖啡 |
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

### 電影（自動同步）
| 來源 | 網站 |
|------|------|
| 開眼電影網 | atmovies.com.tw |

### 景點（自動同步 + 手動）
| 來源 | 說明 |
|------|------|
| 台北景點 | 手動精選 25 個（步道、公園、博物館等）|
| 桃園觀光 API | travel.tycg.gov.tw（自動同步）|

### 餐廳 / 咖啡廳（手動精選）
| 檔案 | 說明 |
|------|------|
| `data/raw/restaurants-curated.json` | 台北 50 筆 |
| `data/raw/restaurants-taoyuan-curated.json` | 桃園 15 筆 |

> 要新增餐廳？直接編輯上面兩個 JSON 檔案，格式參考既有資料。

---

## 資料儲存位置

```
data/
├── raw/           ← 各來源原始資料（同步按鈕會更新這裡）
│   ├── exhibitions-culture.json
│   ├── exhibitions-huashan.json
│   ├── exhibitions-songshan.json
│   ├── exhibitions-twtc.json
│   ├── exhibitions-ntsec.json
│   ├── movies-atmovies.json
│   ├── attractions-taipei.json
│   ├── attractions-taoyuan.json
│   ├── restaurants-curated.json        ← 手動編輯
│   └── restaurants-taoyuan-curated.json ← 手動編輯
└── combined/      ← 程式自動彙整（不需手動修改）
    ├── all-places.json
    ├── exhibitions.json
    ├── movies.json
    ├── restaurants.json
    └── attractions.json
```

---

## 技術架構

- **Framework**: Next.js 16 + TypeScript + Tailwind CSS
- **Storage**: JSON 檔案（無資料庫）
- **資料抓取**: 文化部 JSON API + HTML scraping（華山/松菸/世貿/科教館/開眼電影）+ 桃園觀光 XML API
