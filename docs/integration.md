# 組員模組串接

載入主網站後，同一頁的模組可透過 `window.VaultTraining` 存取題庫與回傳結果：

```js
const questions = window.VaultTraining.getQuestions();
window.VaultTraining.recordResult({ questionId: "l1", correct: false });
const attempts = window.VaultTraining.getProgress();
window.VaultTraining.startPractice("line"); // phone / shop / random / review
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

題庫位於 `dist/js/data/questions.js`，每題包含唯一的 `id`、`type`、`title`、`sender`、`text`、`options`、`answer`（從 0 起算）、`trap`、`explain`。新增題目後，也要檢查最大字短版選項與題庫測試。
