import test from "node:test";
import assert from "node:assert/strict";
import { bank } from "../dist/js/data/questions.js";
import { validateDraft } from "../dist/js/core/session.js";
import { renderLineChatQuestion, renderSupportCallResult } from "../dist/js/features/line-chat.js";

const question = bank.find((item) => item.id === "line-scam-5");
const session = { index: 0, qs: [question] };

test("第 5 題先顯示合併後的聊天室訊息，不顯示選項", () => {
  const html = renderLineChatQuestion(question, { ...session, interactionStage: "chat" });
  assert.match(html, /line-chat-device/);
  assert.match(html, /你接到一通 LINE 語音電話/);
  assert.match(html, /需要你下載指定的視訊軟體/);
  assert.equal((html.match(/line-chat-incoming-bubble/g) || []).length, 1);
  assert.doesNotMatch(html, /data-answer=|data-scene-action="answer-call"|data-scene-action="decline-call"/);
});

test("通話結果卡會用大字說明受騙原因或正確做法", () => {
  const risk = renderSupportCallResult(question, { correct: false, ...session });
  assert.match(risk, /你被騙了/);
  assert.match(risk, /帳號異常/);
  assert.match(risk, /驗證碼和銀行操作/);
  assert.match(risk, /未接通、未啟用相機／麥克風/);

  const safe = renderSupportCallResult(question, { correct: true, ...session });
  assert.match(safe, /答對了/);
  assert.match(safe, /LINE 官方客服不會來電要求你開啟螢幕共享/);
  assert.match(safe, /立即掛斷/);
});

test("validateDraft 可還原拒接後的答對結果頁", () => {
  const restored = validateDraft(
    {
      ids: [question.id],
      index: 0,
      score: 1,
      answered: true,
      correct: true,
      selectedAnswer: 1,
      complete: false,
      interactionStage: "call-result-safe",
    },
    bank,
  );
  assert.equal(restored?.interactionStage, "call-result-safe");
  assert.equal(restored?.answered, true);
  assert.equal(restored?.correct, true);
});
