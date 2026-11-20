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
  assert.match(html, /line-chat-message-avatar/);
  assert.match(html, /您好，我是 LINE 官方客服/);
  assert.match(html, /請下載指定的視訊軟體並開啟手機的螢幕共享/);
  assert.equal((html.match(/line-chat-incoming-bubble/g) || []).length, 1);
  assert.doesNotMatch(html, /line-chat-safety-note|line-chat-segment-label|先看情境/);
  assert.doesNotMatch(html, /data-answer=|data-scene-action="answer-call"|data-scene-action="decline-call"/);
});

test("拒接後的聊天室逐次保留未接來電訊息，第二通來電時仍可看到第一通紀錄", () => {
  const firstMissed = renderLineChatQuestion(question, {
    ...session, interactionStage: "call-declined", callCount: 1,
  });
  assert.equal((firstMissed.match(/support-call-missed-call/g) || []).length, 1);
  assert.match(firstMissed, /未接來電/);
  assert.match(firstMissed, /第 1 通模擬視訊來電/);
  assert.doesNotMatch(firstMissed, /data-scene-action="continue-support-call"/);

  const secondIncoming = renderLineChatQuestion(question, {
    ...session, interactionStage: "call-incoming", callCount: 2,
  });
  assert.match(secondIncoming, /support-call-screen is-incoming/);
  assert.equal((secondIncoming.match(/support-call-missed-call/g) || []).length, 1);

  const bothMissed = renderLineChatQuestion(question, {
    ...session, interactionStage: "call-final-declined", callCount: 2,
  });
  assert.equal((bothMissed.match(/support-call-missed-call/g) || []).length, 2);
  assert.match(bothMissed, /第 1 通模擬視訊來電/);
  assert.match(bothMissed, /第 2 通模擬視訊來電/);
});

test("錯答結果只說明受騙原因；安全拒接結果仍保留原指引", () => {
  const risk = renderSupportCallResult(question, { correct: false, ...session });
  assert.match(risk, /為什麼錯/);
  assert.match(risk, new RegExp(question.explain));
  assert.doesNotMatch(risk, /安全做法|立即拒接|未接通|帳號異常/);

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
      callCount: 2,
    },
    bank,
  );
  assert.equal(restored?.interactionStage, "call-result-safe");
  assert.equal(restored?.answered, true);
  assert.equal(restored?.correct, true);
  assert.equal(restored?.callCount, 2);
});

test("validateDraft 可還原第二通拒接後等待安全結果的兩則未接來電", () => {
  const restored = validateDraft(
    {
      ids: [question.id],
      index: 0,
      score: 0,
      answered: false,
      complete: false,
      interactionStage: "call-final-declined",
      callCount: 2,
    },
    bank,
  );
  assert.equal(restored?.interactionStage, "call-final-declined");
  assert.equal(restored?.callCount, 2);
  const chat = renderLineChatQuestion(question, restored);
  assert.equal((chat.match(/support-call-missed-call/g) || []).length, 2);
});
