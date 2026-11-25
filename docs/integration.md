# 組員模組串接

載入主網站後，同一頁的模組可透過 `window.VaultTraining` 存取題庫與回傳結果：

```js
const questions = window.VaultTraining.getQuestions();
window.VaultTraining.recordResult({ questionId: "l1", correct: false });
const attempts = window.VaultTraining.getProgress();
window.VaultTraining.startPractice("line"); // phone / shop / random / review / borrow-branch
const completedScenarios = window.VaultTraining.getScenarioResults();
```

也可用事件回傳；與 `recordResult` 擇一，避免重複計入：

```js
window.dispatchEvent(new CustomEvent("vault:module-result", {
  detail: { questionId: "p1", correct: true },
}));

window.addEventListener("vault:result-saved", (event) => {
  console.log(event.detail);
});
```

`questionId` 必須存在於題庫，`correct` 必須是布林值。讀取介面回傳副本，修改副本不會更動儲存資料。跨網域 iframe 尚未提供訊息橋接。

題庫位於 `dist/js/data/questions.js`，一般題包含唯一的 `id`、`type`、`title`、`sender`、`text`、`options`、`answer`（從 0 起算）、`trap`、`explain`。LINE 原稿保留九題，但目前一般與隨機練習只開放 `activeLineQuestionIds` 指定的第 1、5、9 題；調整開放題目時請同步更新該清單與題數測試。

互動分支情境由 `branchScenarios` 宣告 `mode` 和 `startId`；情境節點以 `branchScenario` 分組，根節點另標 `branchStart: true`。每個節點的 `branchResponses`、`next` 與 `endingIds` 陣列都依選項索引排列：前者說明選擇後的情況；`next` 填下一個節點 ID 或 `null`；路徑以 `null` 結束時，`endingIds` 必須給該選項一個結局 ID。分支節點不會混入一般隨機抽題；透過 `startPractice("borrow-branch")` 啟動。尚未完成的節點路徑與選項保存在目前分頁的 `sessionStorage`，重新整理後可以接續。

分支完成後，`window.VaultTraining.getScenarioResults()` 回傳已完成紀錄的副本；每完成一次，也會先寫入本機再派發 `vault:scenario-result-saved`，事件的 `detail` 即完整結果。若要即時接收，請在呼叫 `startPractice("borrow-branch")` 前註冊監聽器：

```js
window.addEventListener("vault:scenario-result-saved", (event) => {
  const { scenarioId, path, endingId, score, maxScore, completedAt } = event.detail;
  // path 每一步含 nodeId、questionId、optionIndex、optionText、correct
});
```

完整結果保存於本機 `localStorage` 的 `vault-scenario-results-v1`，含 `scenarioId`、逐步節點／題目與所選選項、`endingId`、得分（`score`／`maxScore`）及完成時間。這項整段紀錄不會送到伺服器。原有 `recordResult`、`vault:result-saved` 和 `getProgress()` 仍只處理逐題作答，行為不變。

新增任何題目或分支節點後，請同步新增 `dist/js/data/compact-options.js` 的短版選項並執行 `npm run check`、`npm test`。分支節點作答仍逐題保存並獲得安心星；完成時另保存整段情境結果。「完成全部情境」統計只計目前開放的三個 LINE 情境。

## 假購物網站找碴模組

`#shop` 路由是獨立的購物防詐練習，不走 `exercise.js`，也不混入 LINE、隨機或複習練習。啟動方式：選題頁的「假購物網站找碴」、`data-start="shop"` 按鈕，或 `window.VaultTraining.startPractice("shop")`。

| 位置 | 責任 |
| --- | --- |
| `dist/js/data/questions.js` | `type: "shop"` 的三題（`shop-scam-1`～`3`）與 `activeShopQuestionIds`；題目、選項、答案、解說 |
| `dist/js/data/shop-scenarios.js` | 每題的虛構畫面 `parts`（依畫面順序）與可點擊細節 `spots`；`flag: true` 為可疑處 |
| `dist/js/core/shop-engine.js` | 純函式：找碴 → 決定 → 結果、提示、扣款、會話還原驗證 |
| `dist/js/features/fake-shop.js` | 畫面、點擊、朗讀、`sessionStorage`（`vault-shop-session-v1`）接續 |
| `dist/css/fake-shop.css` | 樣式，使用 `--read-font`／`--choice-font`／`--title-font` 隨字級放大 |

每題流程：點畫面找可疑處（點錯不扣錢，只說明「不是破綻」；可按「給我提示」）→ 選擇做法 → 答錯扣 NT$100 並顯示錢包提醒 → 解析列出找到與漏掉的可疑處。三題一場，從 NT$400 開始。

做出選擇時會同時：

1. 呼叫 `recordResult({ questionId, correct })`，照常獲得安心星；
2. 寫入 `localStorage` 的 `vault-shop-results-v1`（最多保留 100 筆），並派發 `vault:shop-result-saved`：

```js
window.addEventListener("vault:shop-result-saved", (event) => {
  const { questionId, correct, optionIndex, foundFlags, missedFlags, safeTaps, hintsUsed, completedAt } = event.detail;
});
const shopResults = window.VaultTraining.getShopResults();
```

新增購物題時：在 `questions.js` 加題並把 ID 放進 `activeShopQuestionIds`，在 `shop-scenarios.js` 加同 ID 的畫面（每個 spot 只出現一次、至少 3 個可疑處和 1 個非破綻），在 `compact-options.js` 加短版選項，再執行 `npm run check`、`npm test`。品牌一律使用虛構的「好購樂」，網址使用無法連線的 `.example` 網域，不使用真實平台名稱、標誌或配色；模擬頁不放真正的輸入欄位。

修改模組時請注意：同一個 JS 檔在所有 `import` 中要使用相同的 `?v=` 版本字串，否則瀏覽器會載入兩份模組，例如兩份 `store.js` 會各自保存紀錄並互相覆蓋。
