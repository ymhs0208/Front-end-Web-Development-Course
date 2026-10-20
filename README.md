# 金庫防爆特攻隊

長輩友善的防詐練習網站，使用原生 HTML、CSS 與 JavaScript ES Modules，無執行期套件。

[開啟網站](https://ymhs0208.github.io/Front-end-Web-Development-Course/)

## 本機啟動

在本專案資料夾執行，不需要 `npm install`：

```sh
python3 -m http.server 5173 --directory dist
```

開啟 [本機網站](http://localhost:5173)。請使用 HTTP 伺服器，直接雙擊 HTML 可能無法載入 JavaScript 模組。

## 資料夾用途

| 位置 | 用途 |
| --- | --- |
| `dist/` | 可直接執行、編輯的網站原始碼；本專案沒有額外建置步驟 |
| `dist/index.html` | 網站共用外框與頁面容器 |
| `dist/css/` | 依功能拆分的樣式 |
| `dist/js/` | 題庫、核心邏輯、頁面、共用元件與功能模組 |
| `docs/` | 程式架構與組員串接說明 |
| `tests/` | 出題、儲存、獎勵與分段閱讀測試 |
| `scripts/` | 模組檢查工具 |
| `index.html` | GitHub Pages 根目錄入口，自動轉到 `dist/` |
| `.nojekyll` | 讓 GitHub Pages 直接提供靜態檔案 |

## 目前功能

- 首頁四個入口：開始練習、自己選題、我的獎勵、怎麼操作。
- 訊息、電話、網購三類示範情境，共 9 題；每次練習抽 3 題。
- 獨立作答頁，依序選答案、看解說、進入下一題。
- 四級字體與朗讀；最大字模式提供分段閱讀。
- 我的獎勵可收集安心星，讓星星夥伴披上披風、戴上皇冠；有錯題時可按「再練一次」複習。
- 電腦與手機排版；頁尾僅保留品牌首頁與使用說明。

紀錄保存在目前瀏覽器，不跨裝置同步。清除瀏覽資料會移除紀錄。語音可用性依裝置而定，情境均為防詐教育示範。介面尚未經長輩真人試用。

## 開發文件

- [架構與修改位置](docs/architecture.md)
- [組員模組串接](docs/integration.md)

## 檢查

需安裝 Node.js，無須安裝測試套件：

```sh
npm run check
npm test
```

檢查涵蓋 JavaScript 語法、匯入路徑、循環依賴，以及出題、紀錄保存、閱讀分頁和獎勵規則。
