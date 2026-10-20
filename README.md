# 金庫防爆特攻隊｜主網站與系統整合

本機開發版本，不部署。使用原生 HTML、CSS、JavaScript ES Modules，無框架、無執行期套件，保留大字體、簡單操作和獨立作答頁面。

## 啟動

在本專案資料夾執行：

```sh
python3 -m http.server 5173 --directory dist
```

開啟 http://localhost:5173 。不需要 `npm install`。

**請使用 HTTP 伺服器啟動。** 瀏覽器透過 `file://` 直接開啟 HTML 時，可能阻擋 ES Modules 的載入。

## 模組分工

```text
studyflow/
├── dist/
│   ├── index.html                 共用導覽與頁面容器
│   ├── style.css                  CSS 載入入口
│   ├── css/
│   │   ├── base.css               基本版面、元件、色彩
│   │   ├── responsive.css         手機與平板排版
│   │   ├── exercise.css           獨立作答頁樣式
│   │   ├── accessibility.css      大字、高對比、大按鈕
│   │   └── simple-flow.css        精簡導覽與逐步作答
│   └── js/
│       ├── main.js                啟動與操作事件分派
│       ├── data/questions.js      題庫與情境分類
│       ├── core/
│       │   ├── dom.js             DOM 選取工具
│       │   ├── store.js           設定與紀錄的唯一寫入入口
│       │   ├── engine.js          隨機出題、錯題判斷、複習排序
│       │   ├── router.js          頁面切換與導覽狀態
│       │   └── session.js         分頁練習進度保存與還原
│       ├── pages/
│       │   ├── home.js            首頁
│       │   ├── practice.js        情境列表
│       │   ├── mistakes.js        錯題筆記
│       │   ├── review.js          複習與學習紀錄
│       │   └── guide.js           使用說明
│       ├── components/
│       │   ├── illustrations.js   共用插畫
│       │   ├── learning.js        情境卡片、統計區塊
│       │   └── notifications.js   提示訊息
│       └── features/
│           ├── exercise.js        作答、解說、成果流程
│           ├── accessibility.js   語音及字級設定
│           ├── export.js          下載學習紀錄
│           └── integration.js     組員模組回傳 API
├── scripts/check-modules.js       語法、匯入、循環依賴檢查
├── tests/                         出題及儲存行為測試
└── package.json                   開發檢查指令
```

頁面只讀取狀態，透過 `store.js` 寫入紀錄。`engine.js` 為純函式，不依賴 DOM 或瀏覽器儲存。作答控制器透過注入的 `refresh` 回呼請求更新畫面，不直接匯入路由，因此沒有循環依賴。`main.js` 負責組合模組，不放題庫與頁面內容。

樣式依 `base → responsive → exercise → accessibility → simple-flow` 載入，保留原本呈現順序。請在對應檔案修改樣式。

## 頁面與行為

- `#home`：首頁與三類練習入口。
- `#practice`：直接選擇訊息、電話、網購，或隨機出題。
- `#exercise`：題目 → 選答案 → 看解說 → 下一題 → 成果，無彈窗。
- `#mistakes`：最後一次仍答錯的情境，重練答對後移出。
- `#review`：一鍵開始複習，紀錄與統計可展開。
- `#guide`：使用說明與網站導覽。

每次抽 3 題、不重複。複習依規則優先安排錯題、未練習題目、較少練習題目。不是 AI 服務，沒有固定時間推播。重新整理作答頁會接回同一分頁原本的題目、解說或成果；已作答紀錄不會重複計算。按「結束練習」會結束本次進度，保留學習紀錄。

## 如何新增或修改功能

| 需求                     | 修改位置                          |
| ------------------------ | --------------------------------- |
| 新增題目、修改文案與答案 | `dist/js/data/questions.js`       |
| 修改首頁                 | `dist/js/pages/home.js`           |
| 調整複習排序             | `dist/js/core/engine.js`          |
| 改變儲存方式             | `dist/js/core/store.js`           |
| 修改答題、解說、成果畫面 | `dist/js/features/exercise.js`    |
| 串接組員模組             | `dist/js/features/integration.js` |
| 調整大字與按鈕           | `dist/css/accessibility.css`      |

題目欄位包含唯一的 `id`、`type`、`title`、`sender`、`text`、`options`、`answer`（0 起算）、`trap`、`explain`。三類目前各有 3 個示範情境；完整 LINE 分支劇情、來電模擬或網購找碴，可由組員替換對應入口。

## 組員模組回傳介面

原本的 `window.VaultTraining` API 保留，不需更動既有串接方式。同一頁載入的模組可使用：

```js
const questions = window.VaultTraining.getQuestions();
window.VaultTraining.recordResult({ questionId: "l1", correct: false });

// 也可以用事件回傳；兩種方式擇一，避免重複計入。
window.dispatchEvent(
  new CustomEvent("vault:module-result", {
    detail: { questionId: "p1", correct: true },
  }),
);

window.addEventListener("vault:result-saved", (event) => {
  console.log(event.detail);
});

window.VaultTraining.getProgress();
window.VaultTraining.startPractice("line"); // phone / shop / random / review
```

`questionId` 必須存在於題庫，`correct` 必須為布林值。對外讀取回傳副本，修改副本不會更動儲存紀錄。跨網域 iframe 尚未提供訊息橋接。

## 檢查與測試

使用 Node.js 執行，不需安裝測試套件：

```sh
npm run check
npm test
```

檢查涵蓋模組語法、匯入路徑、循環依賴，以及題庫有效性、抽題不重複、複習優先順序、錯題移除、紀錄與設定保存、API 輸入驗證和狀態副本隔離。瀏覽器另外檢查頁面切換、作答回饋與成果。

## 儲存與閱讀

維持原本 `localStorage` key：`vault-training-v1`，保留既有作答紀錄與設定。不跨裝置同步，清除瀏覽資料會移除紀錄。無法儲存時會提示並維持本次可用。

預設內文 22px、題目答案 24px，可切換更大字。語音使用瀏覽器 SpeechSynthesis（zh-TW），依裝置提供的語音播放，沒有閩南語或客家語專屬配音。Google Fonts 無法連線時使用本機字型。所有情境為虛構防詐教育示範，不進行真實交易。

## 簡化操作流程

- 主導覽只保留首頁、開始練習、我的複習；錯題解說從我的複習進入。
- 首頁以「開始練習 3 題」為主要操作，另提供自選情境和複習入口。
- 作答中隱藏其他導覽與頁尾，保留結束練習、字級切換和當頁朗讀。
- 題目與解說分開呈現，選答案後回到頁面上方看安全做法；原因分析可再展開。
- 解說後按下一題，三題完成後一鍵回首頁。朗讀按鈕會依目前階段朗讀題目與選項，或安全做法與解說。

## 長輩操作檢查

已在 320px 小螢幕檢查大字與更大字排版，確認沒有橫向溢出；另驗證重新整理還原題目／已作答解說，以及朗讀按鈕切換停止功能。題目沒有倒數或作答時間限制。頁尾僅保留首頁品牌與使用說明。

這是工程操作檢查，尚未進行長輩真人測試。建議讓目標使用者在不受提示下完成下列任務，記錄在哪裡停住，再據此修正：

1. 從首頁開始練習，選一個答案並找到下一題。
2. 將文字放大，啟動並停止朗讀。
3. 完成後回首頁，再找到複習入口。

語音的實際音色、音量與可用性取決於裝置，正式展示前應在長輩使用的手機或平板上確認。

## iPhone 風格長輩介面

目前主畫面改為四個大方塊：開始練習、自己選題、我的複習、怎麼操作。自己選題以四個方塊呈現訊息、電話、網購與隨機題目。非首頁的底部固定「返回主畫面」，返回會結束本次練習並保留已作答紀錄。這是網站介面，沒有修改 iOS 系統設定。

共用方塊元件位於 `dist/js/components/tiles.js`，新主題位於 `dist/css/ios.css`，於所有既有樣式之後載入。

已檢查 390px 手機方塊與固定返回流程，以及 320px 更大字模式無橫向溢出；頁尾仍只有兩個連結。尚未經長輩真人試用。

## 四級字體

頁面上方「字體」提供大字、更大、特大、最大四級，設定儲存在原本的 localStorage 中。題目／答案依序約 24、28、32、36px；最大模式的首頁方塊標題為 38px。手機在特大與最大模式改成單欄方塊，避免擠壓。已驗證 320px 寬最大字體無橫向溢出，重新整理保留選擇。舊版大字設定會自動轉換，保留原有作答紀錄。

## 圖示版操作說明

「跟著這 3 步做」改為三張大插圖步驟卡，每張只有短標題與一句說明。圖示元件位於 `dist/js/components/guide-steps.js`，樣式位於 `dist/css/guide.css`，保留四級字體與開始練習入口。

## 電腦版排版

`dist/css/desktop.css` 專門處理 1024px 以上畫面，最後載入。首頁改為圖示與說明並排的 2×2 寬卡片；一般字級作答使用左側情境、右側答案，特大與最大字維持單欄閱讀。圖示教學在電腦並排三張。另針對 768px 高筆電調整上下間距，保留底部返回按鈕的可視空間。

已檢查 1440×900 首頁全部功能與頁尾可見、1366×768 作答最後一個選項未被返回列遮住，以及 390px 手機保持單欄。

## 最大字模式：分段閱讀

選擇最大字時，作答改為先讀情境、再選答案、最後看解說。`features/focus-reader.js` 依目前字型、容器寬度和視窗高度實際測量可容納的段落，保留完整發話者、情境與解說／心理陷阱，不省略內容。上一段、下一段、選答案均為頁內切換；閱讀位置和選答案階段會保存。

`data/compact-options.js` 提供順序相同、意思一致的短版答案，原始題庫與答案索引不變。題目與答案保持 36px，短操作按鈕為 23px。一般字級維持原本的作答排版。

已在 320×800 最大字模式檢查閱讀段落、三個答案、分段解說的按鈕均在返回列上方，頁面不需垂直捲動；另有分頁不漏字、不重複及閱讀位置還原的測試。極小視窗仍可能需要捲動，系統不會裁切內容或禁止捲動。

## 我的獎勵（取代原本的我的複習）

主畫面入口與頁面改為「我的獎勵」(`#rewards`)，舊網址 `#review` 會轉到新頁。每完成一個不同的題庫情境獲得一顆安心星，答錯仍算完成，重複同一題不重複加星。四枚勳章依初次練習、三個情境、三種類型和全部情境解鎖，不使用虛構紀錄、排名或扣分。

再練錯題與詳細紀錄保留於獎勵頁，原本 localStorage 紀錄不用轉換。獎勵計算在 `core/rewards.js`，勳章元件在 `components/badges.js`，頁面在 `pages/rewards.js`，樣式在 `css/rewards.css`，原 `pages/review.js` 保留相容匯出。新增獎勵規則測試，總計 15 項測試通過。

## 簡化獎勵介面

獎勵頁主畫面僅顯示安心星數、四枚勳章狀態與「繼續練習」。移除重複進度比例；勳章條件收在「勳章怎麼拿？」；紀錄、下載與錯題重練收在「看紀錄與複習」。既有紀錄和獎勵規則不變，手機大字模式保留。

## 移除複雜紀錄區

獎勵頁已移除「看紀錄與複習」及其中的圖表、逐筆紀錄、下載操作。若有待複習錯題，主要練習按鈕改為「再練一次」，點一下即優先安排錯題；沒有錯題則繼續一般練習。已保存的紀錄與獎勵不會刪除。
