# 程式架構與修改位置

## JavaScript 分工

| 位置 | 責任 |
| --- | --- |
| `dist/js/main.js` | 啟動、組合模組、分派操作事件 |
| `dist/js/data/` | 題庫與最大字模式的短版選項 |
| `dist/js/core/` | 路由、儲存、抽題排序、練習進度與獎勵計算 |
| `dist/js/pages/` | 首頁、自選情境、獎勵、錯題與說明頁 |
| `dist/js/components/` | 大方塊、步驟圖示、勳章、提示等共用元件 |
| `dist/js/features/` | 作答流程、分段閱讀、字級與朗讀、對外整合 |

`engine.js` 為純函式；`store.js` 統一寫入設定和紀錄。作答模組透過回呼更新頁面，避免與路由互相匯入。部分舊版元件保留相容性，不代表目前頁面提供所有舊功能。

## 常見修改

| 需求 | 檔案 |
| --- | --- |
| 題目、答案與解說 | `dist/js/data/questions.js` |
| 最大字短版選項 | `dist/js/data/compact-options.js` |
| 首頁四個入口 | `dist/js/pages/home.js`、`dist/js/components/tiles.js` |
| 隨機出題與複習排序 | `dist/js/core/engine.js` |
| 答題與成果流程 | `dist/js/features/exercise.js` |
| 最大字分段閱讀 | `dist/js/features/focus-reader.js` |
| 獎勵規則與畫面 | `dist/js/core/rewards.js`、`dist/js/pages/rewards.js` |
| 台語 API、音檔快取與取消播放 | `dist/js/features/taiwanese-tts.js` |
| 語音選擇與國語朗讀 | `dist/js/features/accessibility.js` |
| 紀錄與設定 | `dist/js/core/store.js` |
| 模組串接 | `dist/js/features/integration.js` |

## CSS 分工

`dist/style.css` 是樣式入口，依序載入基本、響應式、作答、無障礙、簡化流程、iOS 風格、圖示教學、電腦版、分段閱讀與獎勵樣式。載入順序會影響覆寫結果，請在對應功能檔案修改。

## 路由與資料

- `#home`：首頁。
- `#practice`：自己選題。
- `#exercise`：作答，有進度才可進入。
- `#rewards`：我的獎勵；舊 `#review` 自動轉到此頁。
- `#mistakes`：保留的錯題筆記路由。
- `#guide`：使用說明。

練習優先排序為錯題、未練習、較少練習。最近一次答對的題目會移出錯題清單。每完成不同情境獲得一顆安心星，答錯仍算完成，重複同題不重複加星。夥伴在 3 顆星時披上披風，完成全部情境後戴上皇冠。成長規則在 `core/rewards.js`，插圖在 `components/companion.js`，動畫尊重減少動態效果設定。

`localStorage` 使用 `vault-training-v1` 保存紀錄與設定；`sessionStorage` 使用 `vault-exercise-v1` 還原同分頁練習進度。保留既有 key，避免升級後遺失資料。

## 網站入口

GitHub Pages 使用根目錄 `index.html` 轉到 `dist/`，保留網址查詢參數與 hash。原始碼可直接提供靜態服務，無須產生另一份建置目錄。調整資料夾路徑時需同步檢查此入口、HTML、CSS 和 ES Modules 的相對路徑。
