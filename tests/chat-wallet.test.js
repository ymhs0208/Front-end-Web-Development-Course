import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { activeLineQuestionIds, bank } from "../dist/js/data/questions.js";
import { applyWrongAnswerPenalty } from "../dist/js/core/money.js";
import { restoreSession, saveSession, validateDraft } from "../dist/js/core/session.js";
import {
  renderBankruptcyModal,
  renderBranchChat,
  renderMoneyBar,
  renderWrongAnswerModal,
} from "../dist/js/features/branch-chat.js";
import { isSafeRefusalMessage, renderJobBlockResult, renderJobOfferStage, renderLineChatQuestion, renderSupportCallResult, renderSupportCallStage } from "../dist/js/features/line-chat.js";
import { focusText, renderFocusExercise } from "../dist/js/features/focus-reader.js";
import { createExerciseController } from "../dist/js/features/exercise.js";
import { getState, updateSettings } from "../dist/js/core/store.js";

const branchStart = {
  ids: ["l4"],
  index: 0,
  score: 0,
  answered: false,
  complete: false,
  branchFlow: true,
  branchPath: [],
  nextId: null,
};

test("branch money defaults to 400 and restores a valid saved balance", () => {
  assert.equal(validateDraft(branchStart, bank)?.money, 400);
  assert.equal(validateDraft({ ...branchStart, money: 300 }, bank)?.money, 300);
  assert.equal(validateDraft({ ...branchStart, money: 0 }, bank)?.money, 0);
  assert.equal(validateDraft({ ...branchStart, money: -1 }, bank), null);
  assert.equal(validateDraft({ ...branchStart, money: 401 }, bank), null);
});

test("regular sessions with questions 1, 5, and 9 start with a restorable wallet", () => {
  const ids = [...activeLineQuestionIds];
  const regularDraft = {
    ids,
    index: 0,
    score: 0,
    answered: false,
    complete: false,
    branchFlow: false,
  };
  assert.equal(ids.length, 3);
  assert.equal(validateDraft(regularDraft, bank)?.money, 400);
  const previous = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const values = new Map();
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    },
  });
  try {
    const bankruptSession = validateDraft({ ...regularDraft, money: 0 }, bank);
    assert.equal(bankruptSession.money, 0);
    saveSession(bankruptSession);
    const restored = restoreSession(bank);
    assert.equal(restored.money, 0);
    assert.equal(restored.qs.length, 3);
    const composing = validateDraft(
      { ...regularDraft, interactionStage: "compose", sentMessage: "不了謝謝" },
      bank,
    );
    saveSession(composing);
    const restoredComposer = restoreSession(bank);
    assert.equal(restoredComposer.interactionStage, "compose");
    assert.equal(restoredComposer.sentMessage, "不了謝謝");
    for (const interactionStage of ["screen-share", "hangup", "call-incoming", "call-active", "call-followup", "call-ended", "call-declined", "call-followup-declined", "job-contact", "job-payment", "job-payment-warning", "job-block-ready", "job-menu", "job-blocked"]) {
      saveSession({ ...composing, interactionStage });
      assert.equal(restoreSession(bank).interactionStage, interactionStage);
    }
    assert.equal(validateDraft({ ...regularDraft, interactionStage: "job-refusal" }, bank)?.interactionStage, "job-block-ready");
  } finally {
    if (previous) Object.defineProperty(globalThis, "sessionStorage", previous);
    else delete globalThis.sessionStorage;
  }
  assert.equal(validateDraft({ ...regularDraft, money: -1 }, bank), null);
});

test("each wrong branch answer deducts 100 without taking the balance below zero", () => {
  assert.deepEqual(applyWrongAnswerPenalty(400), {
    money: 300,
    loss: 100,
    reachedZero: false,
  });
  assert.deepEqual(applyWrongAnswerPenalty(100), {
    money: 0,
    loss: 100,
    reachedZero: true,
  });
  assert.deepEqual(applyWrongAnswerPenalty(0), {
    money: 0,
    loss: 0,
    reachedZero: false,
  });
});

test("saved money and both prompt states survive a session restore", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const values = new Map();
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    },
  });
  try {
    const initial = validateDraft({
      ...branchStart,
      money: 0,
      wrongAnswerAcknowledged: true,
      wrongActionPending: true,
      wrongActionReason: "不應選擇錯誤操作。",
      bankruptAcknowledged: false,
    }, bank);
    saveSession(initial);
    const restored = restoreSession(bank);
    assert.equal(restored.money, 0);
    assert.equal(restored.wrongAnswerAcknowledged, true);
    assert.equal(restored.wrongActionPending, true);
    assert.equal(restored.wrongActionReason, "不應選擇錯誤操作。");
    assert.equal(restored.bankruptAcknowledged, false);
  } finally {
    if (previous) Object.defineProperty(globalThis, "sessionStorage", previous);
    else delete globalThis.sessionStorage;
  }
});

test("the LINE-style branch shows the wallet, simulated incoming message, and reply choices", () => {
  const session = {
    qs: [bank.find((question) => question.id === "l4")],
    index: 0,
    branchPath: [],
    branchFlow: true,
    answered: false,
    money: 400,
  };
  const html = renderBranchChat(session);
  assert.match(html, /LINE 風格模擬聊天/);
  assert.match(html, /NT\$400/);
  assert.match(html, /NT\$100/);
  assert.match(html, /這是新帳號/);
  assert.equal((html.match(/data-answer=/g) ?? []).length, 3);
  assert.match(html, /唸題目和選項給我聽/);
  assert.match(renderMoneyBar(session), /NT\$400/);
});

test("only LINE questions 1, 5, and 9 are active; question 9 uses chat actions instead of answer cards", () => {
  const questions = bank.filter((question) => activeLineQuestionIds.includes(question.id));
  assert.equal(questions.length, 3);
  for (const [index, question] of questions.entries()) {
    const html = renderLineChatQuestion(question, { index, qs: questions });
    assert.ok(question.segments.length >= 2, `${question.id} should have multiple scene segments`);
    assert.equal(question.segments.map((segment) => segment.text).join(""), question.text);
    assert.match(html, /line-chat-message-avatar/);
    assert.doesNotMatch(html, /line-chat-safety-note|line-chat-segment-label|分段呈現|先看情境/);
    if (question.interaction === "support-call") {
      assert.doesNotMatch(html, /support-call-screen is-incoming/);
      assert.doesNotMatch(html, /data-scene-action="answer-call"|data-scene-action="decline-call"/);
      assert.match(html, /line-chat-device/);
      assert.equal(html.includes(question.text), true);
      assert.equal((html.match(/class="line-chat-incoming line-chat-segment[^"]*"/g) ?? []).length, 1);
    } else {
      assert.match(html, /line-chat-device/);
      assert.match(html, /line-chat-conversation/);
      assert.equal(
        (html.match(/class="line-chat-incoming line-chat-segment[^"]*"/g) ?? []).length,
        question.interaction === "job-offer" ? 1 : question.segments.length,
      );
    }
    if (question.interaction === "support-call") {
      assert.equal((html.match(/class="line-chat-reply"/g) ?? []).length, 0);
    } else if (question.interaction === "job-offer") {
      assert.equal((html.match(/class="line-chat-reply"/g) ?? []).length, 0);
      assert.match(html, /data-scene-action="join-job-chat"/);
      assert.doesNotMatch(html, /data-answer=/);
    } else if (question.interaction === "vote-link") {
      assert.equal((html.match(/class="line-chat-reply"/g) ?? []).length, 0);
      assert.doesNotMatch(html, /你會怎麼回覆|data-answer=|line-chat-reply-divider/);
      assert.match(html, /data-chat-compose-form/);
      assert.match(html, /data-chat-input/);
      assert.match(html, /type="submit"/);
      assert.match(html, /唸出聊天訊息給我聽/);
    } else {
      assert.equal((html.match(/class="line-chat-reply"/g) ?? []).length, 3);
    }
    if (question.interaction === "support-call") {
      assert.doesNotMatch(html, /line-chat-composer/);
      assert.doesNotMatch(html, /line-chat-read|唸出來電內容/);
    } else {
      assert.match(html, /line-chat-composer/);
      assert.match(html, question.interaction === "job-offer" ? /唸出聊天情境和操作提示/ : question.interaction === "vote-link" ? /唸出聊天訊息給我聽/ : /唸出訊息和回覆選項/);
    }
    assert.doesNotMatch(html, /line-question-actions/);
    assert.doesNotMatch(html, /line-chat-call-badge|可疑來電|求職風險|徵才貼文|詐騙情境：|高薪求職詐騙模擬/);
    if (question.interaction !== "support-call")
      assert.match(html, /<span class="line-scenario-kicker">模擬情境<\/span>/);
  }
});

test("question 1 uses a local editable composer, no reply choices, and renders the refusal exchange", () => {
  const question = bank.find((item) => item.id === "line-scam-1");
  const qs = [question];
  const initial = renderLineChatQuestion(question, { index: 0, qs, interactionStage: "chat" });
  assert.match(initial, /data-scene-action="open-fake-site"/);
  assert.match(initial, /pet-vote-gift\.example/);
  assert.match(initial, /data-chat-compose-form/);
  assert.match(initial, /data-chat-input/);
  assert.match(initial, /type="submit"/);
  assert.match(initial, /line-chat-message-avatar/);
  assert.doesNotMatch(initial, /line-chat-safety-note|line-chat-segment-label|先看情境/);
  assert.doesNotMatch(initial, /你會怎麼回覆|data-answer=|line-chat-reply-divider|href="https?:/);

  const exchange = renderLineChatQuestion(question, { index: 0, qs }, {
    messages: [
      { direction: "outgoing", text: "我不提供手機號碼和驗證碼" },
      { direction: "incoming", text: "好的，抱歉打擾了" },
    ],
  });
  assert.match(exchange, /我不提供手機號碼和驗證碼/);
  assert.match(exchange, /好的，抱歉打擾了/);
});

test("question 1 recognizes varied refusals to share data or open the link", () => {
  for (const message of [
    "我不提供手機號碼和簡訊驗證碼，謝謝",
    "我不想把驗證碼給你",
    "我不點這個連結",
    "不要輸入個人資料",
    "不了謝謝",
  ]) assert.equal(isSafeRefusalMessage(message), true, message);
  for (const message of [
    "我可以提供手機號碼",
    "這個連結是真的嗎？",
    "驗證碼是多少？",
    "   ",
  ]) assert.equal(isSafeRefusalMessage(message), false, message);
});

test("question 1 controller handles refusal, fake-link results, large text, and keeps messages in memory", () => {
  const globalNames = ["window", "document", "location", "sessionStorage", "localStorage", "CustomEvent"];
  const descriptors = Object.fromEntries(globalNames.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const previousSettings = getState().settings;
  const sessionValues = new Map();
  const localValues = new Map();
  const timers = new Map();
  let nextTimerId = 0;
  const quizBody = { innerHTML: "" };
  const input = { value: "", focus() {} };
  const conversation = { scrollTop: 0, scrollHeight: 100 };
  const main = { focus() {} };
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (key) => sessionValues.get(key) ?? null,
      setItem: (key, value) => sessionValues.set(key, String(value)),
      removeItem: (key) => sessionValues.delete(key),
    },
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => localValues.get(key) ?? null,
      setItem: (key, value) => localValues.set(key, String(value)),
    },
  });
  Object.defineProperty(globalThis, "location", { configurable: true, value: { hash: "" } });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      title: "",
      body: { classList: { toggle() {}, remove() {} } },
      querySelectorAll: () => [],
      querySelector: (selector) => selector === "#quizBody" ? quizBody
        : selector === "[data-chat-input]" ? input
          : selector === ".line-chat-conversation" ? conversation
            : selector === "#main" ? main : null,
    },
  });
  Object.defineProperty(globalThis, "CustomEvent", {
    configurable: true,
    value: class CustomEvent {
      constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
    },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      innerWidth: 390,
      innerHeight: 844,
      visualViewport: null,
      addEventListener() {},
      setTimeout: (callback, delay) => {
        const id = ++nextTimerId;
        timers.set(id, { callback, delay });
        return id;
      },
      clearTimeout: (id) => timers.delete(id),
      setInterval: () => 1,
      clearInterval() {},
      dispatchEvent() {},
      scrollTo() {},
    },
  });

  try {
    updateSettings({ fontLevel: 0, voice: false });
    const exercise = createExerciseController({ refresh() {} });
    const questionId = "line-scam-1";
    exercise.start(null, questionId);
    exercise.render();
    assert.match(quizBody.innerHTML, /data-chat-compose-form/);
    assert.match(quizBody.innerHTML, /data-chat-input/);
    assert.doesNotMatch(quizBody.innerHTML, /你會怎麼回覆|data-answer=/);

    exercise.setChatDraft("這個投票網址安全嗎？");
    exercise.sendChatMessage();
    assert.equal(exercise.getSession().answered, false);
    assert.match(quizBody.innerHTML, /這個投票網址安全嗎？/);
    assert.equal([...timers.values()].some((timer) => timer.delay === 1000), false);

    const refusal = "我不會提供手機號碼與簡訊驗證碼";
    exercise.setChatDraft(refusal);
    exercise.sendChatMessage();
    assert.equal(exercise.getSession().answered, false);
    assert.match(quizBody.innerHTML, new RegExp(refusal));
    assert.match(quizBody.innerHTML, /好的，抱歉打擾了/);
    assert.equal(exercise.getSession().answered, false, "the result waits until the reply is complete");
    const safeTimerEntry = [...timers.entries()].find(([, timer]) => timer.delay === 1000);
    assert.ok(safeTimerEntry, "a one-second result delay is scheduled");
    const storageKey = "vault-training-v1";
    assert.equal(JSON.parse(localValues.get(storageKey)).attempts.some((attempt) => attempt.id === questionId), false);
    let persisted = JSON.stringify([...sessionValues.values(), ...localValues.values()]);
    assert.equal(persisted.includes(refusal), false, "typed messages are not written to storage");
    timers.delete(safeTimerEntry[0]);
    safeTimerEntry[1].callback();
    assert.equal(exercise.getSession().answered, true);
    assert.equal(exercise.getSession().correct, true);
    assert.match(quizBody.innerHTML, /答對了/);
    assert.match(quizBody.innerHTML, /安全的做法/);
    assert.match(quizBody.innerHTML, new RegExp(bank.find((item) => item.id === questionId).explain));
    assert.equal(JSON.parse(localValues.get(storageKey)).attempts.some((attempt) => attempt.id === questionId && attempt.correct), true);

    exercise.start(null, questionId);
    exercise.render();
    exercise.sceneAction("open-fake-site");
    assert.equal(exercise.getSession().answered, true);
    assert.equal(exercise.getSession().correct, false);
    assert.match(quizBody.innerHTML, /data-wrong-answer-modal/);
    assert.match(quizBody.innerHTML, /你的錢被騙走了/);
    assert.match(quizBody.innerHTML, /知道了，查看解析/);
    assert.doesNotMatch(quizBody.innerHTML, /data-bankrupt-modal/);
    assert.match(quizBody.innerHTML, /wrong-answer-explanation/);
    assert.match(quizBody.innerHTML, new RegExp(bank.find((item) => item.id === questionId).explain));
    assert.doesNotMatch(quizBody.innerHTML, /安全的做法|話術陷阱|仿冒投票網站/);
    exercise.next();
    assert.equal(exercise.getSession().complete, false, "the result cannot be skipped before acknowledging the prompt");
    exercise.dismissWrongAnswer();
    exercise.render();
    assert.doesNotMatch(quizBody.innerHTML, /data-wrong-answer-modal/);
    assert.match(quizBody.innerHTML, /為什麼錯/);
    assert.doesNotMatch(quizBody.innerHTML, /安全的做法|trap-details|仿冒投票網站/);
    assert.doesNotMatch(quizBody.innerHTML, /href="https?:|<form|<input/);
    assert.doesNotMatch(quizBody.innerHTML, /data-bankrupt-modal/);

    updateSettings({ fontLevel: 2, voice: false });
    exercise.start(null, questionId);
    exercise.render();
    assert.match(quizBody.innerHTML, /data-chat-input/);
    exercise.setChatDraft("不了謝謝");
    exercise.sendChatMessage();
    assert.match(quizBody.innerHTML, /好的，抱歉打擾了/);
    const largeSafeTimerEntry = [...timers.entries()].find(([, timer]) => timer.delay === 1000);
    assert.ok(largeSafeTimerEntry);
    timers.delete(largeSafeTimerEntry[0]);
    largeSafeTimerEntry[1].callback();
    assert.match(quizBody.innerHTML, /line-chat-q1-focus-result/);
    assert.match(quizBody.innerHTML, /答對了/);
    assert.match(quizBody.innerHTML, /安全的做法/);

    exercise.start(null, questionId);
    exercise.render();
    exercise.sceneAction("open-fake-site");
    assert.match(quizBody.innerHTML, /line-chat-q1-focus-result/);
    assert.match(quizBody.innerHTML, /data-wrong-answer-modal/);
    assert.match(quizBody.innerHTML, /知道了，查看解析/);
    exercise.dismissWrongAnswer();
    exercise.render();
    assert.doesNotMatch(quizBody.innerHTML, /data-wrong-answer-modal/);
    assert.match(quizBody.innerHTML, /為什麼錯/);
    assert.doesNotMatch(quizBody.innerHTML, /安全的做法|trap-details/);

    updateSettings({ fontLevel: 0, voice: false });
    exercise.start(null, questionId);
    exercise.getSession().money = 100;
    exercise.sceneAction("open-fake-site");
    assert.equal(exercise.getSession().money, 0);
    assert.equal(exercise.getSession().lastMoneyLoss, 100);
    const wrongAttemptsAfterDebit = JSON.parse(localValues.get(storageKey)).attempts
      .filter((attempt) => attempt.id === questionId && !attempt.correct).length;
    assert.match(quizBody.innerHTML, /data-bankrupt-modal/);
    assert.match(quizBody.innerHTML, /你的現金被騙光了！！/);
    assert.match(quizBody.innerHTML, /assets\/bankrupt-meme\.png/);
    assert.doesNotMatch(quizBody.innerHTML, /data-wrong-answer-modal|−NT\$100/);

    exercise.dismissBankruptcy();
    exercise.render();
    assert.match(quizBody.innerHTML, /wrong-answer-explanation/);
    assert.doesNotMatch(quizBody.innerHTML, /data-wrong-answer-modal|data-bankrupt-modal/);
    assert.doesNotMatch(quizBody.innerHTML, /安全的做法|trap-details/);
    exercise.next();
    assert.equal(exercise.getSession().complete, true, "the bankruptcy button reveals the explanation before continuing");
    assert.equal(exercise.getSession().money, 0, "dismissing either prompt never applies another deduction");
    assert.equal(JSON.parse(localValues.get(storageKey)).attempts
      .filter((attempt) => attempt.id === questionId && !attempt.correct).length, wrongAttemptsAfterDebit);

    persisted = JSON.stringify([...sessionValues.values(), ...localValues.values()]);
    assert.equal(persisted.includes(refusal), false);
    assert.equal(persisted.includes("不了謝謝"), false);
    assert.equal(JSON.parse(localValues.get(storageKey)).attempts.some((attempt) => attempt.id === questionId && !attempt.correct), true);
  } finally {
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
    updateSettings({
      fontLevel: previousSettings.fontLevel,
      voice: previousSettings.voice,
      speechLanguage: previousSettings.speechLanguage,
    });
  }
});

test("question 5 begins in chat with one merged message and no choices; question 9 still begins as a chat job ad", () => {
  const call = bank.find((item) => item.id === "line-scam-5");
  const initial = renderLineChatQuestion(call, { index: 0, qs: [call], interactionStage: "chat" });
  assert.match(initial, /line-chat-device/);
  assert.match(initial, /line-chat-message-avatar/);
  assert.doesNotMatch(initial, /客服留下訊息|line-chat-safety-note|line-chat-segment-label|先看情境/);
  assert.match(initial, /你接到一通 LINE 語音電話，對方聲稱你的帳號涉及異常交易與糾紛，需要你下載指定的視訊軟體/);
  assert.equal((initial.match(/line-chat-incoming-bubble/g) || []).length, 1);
  assert.doesNotMatch(initial, /data-scene-action="answer-call"|data-scene-action="decline-call"|data-answer=|class="line-chat-reply"/);
  assert.doesNotMatch(initial, /你會怎麼處理/);

  const incoming = renderLineChatQuestion(call, { index: 0, qs: [call], interactionStage: "call-incoming" });
  assert.match(incoming, /要接通這通視訊通話嗎/);
  assert.match(incoming, /<strong>拒接<\/strong>/);
  assert.match(incoming, /<strong>通話<\/strong>/);
  assert.match(incoming, /本機模擬/);
  assert.match(incoming, /不會接通真實電話/);

  const job = bank.find((item) => item.id === "line-scam-9");
  const html = renderLineChatQuestion(job, { index: 0, qs: [job] });
  assert.match(html, /line-chat-message-avatar/);
  assert.doesNotMatch(html, /line-chat-safety-note|line-chat-segment-label|先看情境/);
  assert.match(html, /居家打字／點讚員/);
  assert.match(html, /時薪 500 元/);
  assert.match(html, /加入 LINE 聯絡/);
  assert.doesNotMatch(html, /NT\$1,000 保證金/);
  assert.doesNotMatch(html, /data-answer=|class="line-chat-reply"/);
});

test("question 9 reveals the job scam in sequence before the local payment and block steps", () => {
  const question = bank.find((item) => item.id === "line-scam-9");
  const qs = [question];
  const initial = renderLineChatQuestion(question, { index: 0, qs });
  assert.match(initial, /data-scene-action="join-job-chat"/);
  assert.match(initial, /時薪 500 元/);
  assert.doesNotMatch(initial, /data-answer=|class="line-chat-reply"/);
  assert.doesNotMatch(initial, /存摺與提款卡以發放薪資/);

  const contact = renderLineChatQuestion(question, { index: 0, qs, interactionStage: "job-contact" });
  assert.match(contact, /你好，我想了解居家打字/);
  assert.match(contact, /先繳納 1,000 元保證金/);
  assert.match(contact, /存摺與提款卡以發放薪資/);
  assert.match(contact, /job-onboard-pay\.example/);
  assert.match(contact, /本機模擬連結/);
  assert.match(contact, /data-scene-action="open-job-payment"/);
  assert.doesNotMatch(contact, /LINE Pay|data-answer=|class="line-chat-reply"/);

  const checkout = renderJobOfferStage("job-payment");
  assert.match(checkout, /仿電子支付介面/);
  assert.doesNotMatch(checkout, /LINE Pay/);
  assert.match(checkout, /NT\$1,000/);
  assert.match(checkout, /data-scene-action="simulate-job-payment"/);
  assert.match(checkout, /data-scene-action="refuse-job-payment"/);
  assert.match(checkout, /不連外、不收款、不收集資料/);
  assert.doesNotMatch(checkout, /<input|<form|href="https?:/);

  const warning = renderJobOfferStage("job-payment-warning");
  assert.match(warning, /你被騙了！！/);
  assert.match(warning, /沒有連到任何支付服務或銀行/);
  assert.doesNotMatch(warning, /LINE Pay/);
  assert.match(warning, /沒有真的扣款/);
  assert.match(warning, /data-scene-action="refuse-job-payment"/);

  const ready = renderLineChatQuestion(question, { index: 0, qs, interactionStage: "job-block-ready" });
  assert.match(ready, /我拒絕付款，並退出連結/);
  assert.match(ready, /data-scene-action="open-job-menu"/);
  assert.match(ready, /按「封鎖」完成練習/);
  assert.doesNotMatch(ready, /data-answer=|class="line-chat-reply"/);
});

test("question 9 menu exposes four ordered actions and non-blocking actions never answer the quiz", () => {
  const html = renderJobOfferStage("job-menu");
  const labels = [...html.matchAll(/<button[^>]*>(.*?)<\/button>/gs)].map((match) => match[1].replace(/<[^>]*>/g, "").trim());
  assert.deepEqual(labels, ["關閉提醒", "推薦", "邀請", "封鎖"]);
  assert.match(html, /class="line-job-menu-overlay"/);
  assert.equal((html.match(/<button\b/g) ?? []).length, 4);
  assert.doesNotMatch(html, /line-job-menu-tip|line-job-menu-notice|close-job-menu/);
  for (const action of ["job-menu-mute", "job-menu-recommend", "job-menu-invite", "confirm-job-block"]) {
    assert.match(html, new RegExp(`data-scene-action="${action}"`));
  }
  assert.doesNotMatch(html, /data-answer=/);
  for (const action of ["job-menu-mute", "job-menu-recommend", "job-menu-invite"]) {
    assert.doesNotMatch(html, new RegExp(`data-scene-action="${action}"[^>]*data-answer=|data-answer=[^>]*data-scene-action="${action}"`));
  }
});

test("question 9 opens a full-screen menu that replaces the chat and contains only four actions", () => {
  const question = bank.find((item) => item.id === "line-scam-9");
  const qs = [question];
  const ready = renderLineChatQuestion(question, { index: 0, qs, interactionStage: "job-block-ready" });
  assert.match(ready, /data-scene-action="open-job-menu"/);
  assert.match(ready, /aria-expanded="false"/);
  const menu = renderLineChatQuestion(question, { index: 0, qs, interactionStage: "job-menu" });
  assert.match(menu, /class="line-job-menu-overlay"/);
  assert.match(menu, /aria-modal="true"/);
  assert.equal((menu.match(/<button\b/g) ?? []).length, 4);
  assert.doesNotMatch(menu, /line-chat-device|close-job-menu|data-answer=/);
});

test("question 9 menu mistakes use mutually exclusive prompts and preserve the block exercise", () => {
  const descriptors = Object.fromEntries(
    ["window", "document", "location", "sessionStorage", "localStorage"].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  const previousSettings = getState().settings;
  const sessionValues = new Map();
  const localValues = new Map();
  const quizBody = { innerHTML: "" };
  const main = { focus() {} };
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (key) => sessionValues.get(key) ?? null,
      setItem: (key, value) => sessionValues.set(key, String(value)),
      removeItem: (key) => sessionValues.delete(key),
    },
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: (key) => localValues.get(key) ?? null, setItem: (key, value) => localValues.set(key, String(value)) },
  });
  Object.defineProperty(globalThis, "location", { configurable: true, value: { hash: "#exercise" } });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      title: "",
      body: { classList: { toggle() {}, remove() {} } },
      querySelectorAll: () => [],
      querySelector: (selector) => selector === "#quizBody" ? quizBody : selector === "#main" ? main : null,
    },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      innerWidth: 390,
      innerHeight: 844,
      visualViewport: null,
      addEventListener() {},
      setTimeout: (callback) => { callback(); return 1; },
      clearTimeout() {},
      setInterval: () => 1,
      clearInterval() {},
      dispatchEvent() {},
      scrollTo() {},
    },
  });
  try {
    updateSettings({ fontLevel: 0, voice: false });
    const exercise = createExerciseController({ refresh() {} });
    const openMenu = (money) => {
      exercise.start(null, "line-scam-9");
      exercise.getSession().money = money;
      exercise.render();
      exercise.sceneAction("join-job-chat");
      exercise.sceneAction("open-job-payment");
      exercise.sceneAction("refuse-job-payment");
      exercise.sceneAction("open-job-menu");
    };

    openMenu(300);
    const storageKey = "vault-training-v1";
    const attemptsBefore = JSON.parse(localValues.get(storageKey)).attempts
      .filter((attempt) => attempt.id === "line-scam-9").length;
    exercise.sceneAction("job-menu-mute");
    assert.equal(exercise.getSession().money, 200);
    assert.equal(exercise.getSession().lastMoneyLoss, 100);
    assert.match(quizBody.innerHTML, /data-wrong-answer-modal/);
    assert.match(quizBody.innerHTML, /−NT\$100/);
    assert.doesNotMatch(quizBody.innerHTML, /data-bankrupt-modal/);
    exercise.dismissWrongAnswer();
    exercise.render();
    assert.match(quizBody.innerHTML, /為什麼錯/);
    assert.match(quizBody.innerHTML, /關閉提醒/);
    assert.doesNotMatch(quizBody.innerHTML, /data-wrong-answer-modal|data-bankrupt-modal|安全的做法|trap-details/);
    exercise.sceneAction("resume-after-wrong-menu-action");
    assert.equal(exercise.getSession().interactionStage, "job-block-ready");
    assert.equal(exercise.getSession().answered, false);

    openMenu(100);
    exercise.sceneAction("job-menu-mute");
    assert.equal(exercise.getSession().money, 0);
    assert.equal(exercise.getSession().lastMoneyLoss, 100);
    assert.match(quizBody.innerHTML, /data-bankrupt-modal/);
    assert.doesNotMatch(quizBody.innerHTML, /data-wrong-answer-modal|−NT\$100/);
    exercise.dismissBankruptcy();
    exercise.render();
    assert.match(quizBody.innerHTML, /為什麼錯/);
    assert.doesNotMatch(quizBody.innerHTML, /data-wrong-answer-modal|data-bankrupt-modal|安全的做法|trap-details/);
    exercise.sceneAction("resume-after-wrong-menu-action");
    assert.equal(exercise.getSession().interactionStage, "job-block-ready");
    assert.equal(exercise.getSession().money, 0);
    assert.doesNotMatch(quizBody.innerHTML, /data-wrong-answer-modal|data-bankrupt-modal/);
    assert.equal(JSON.parse(localValues.get(storageKey)).attempts
      .filter((attempt) => attempt.id === "line-scam-9").length, attemptsBefore);
  } finally {
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
    updateSettings({
      fontLevel: previousSettings.fontLevel,
      voice: previousSettings.voice,
      speechLanguage: previousSettings.speechLanguage,
    });
  }
});

test("question 9 returns to its chat with a correct block result and no lingering reply controls", () => {
  const question = bank.find((item) => item.id === "line-scam-9");
  const html = renderLineChatQuestion(question, {
    index: 0,
    qs: [question],
    answered: true,
    correct: true,
    selectedAnswer: question.answer,
    interactionStage: "job-blocked",
  });
  assert.match(html, /line-job-inline-success/);
  assert.match(html, /✓ 答對了/);
  assert.match(html, /已在模擬選單按下「封鎖」/);
  assert.match(html, /已在本機模擬封鎖，沒有操作真實 LINE/);
  assert.match(html, /<button type="button" disabled>已退出<\/button>/);
  assert.doesNotMatch(html, /line-chat-composer|data-answer=|class="line-chat-reply"/);
});

test("question 9 safe block completion is simulated and does not block a real LINE account", () => {
  const result = renderJobBlockResult();
  assert.match(result, /已模擬封鎖/);
  assert.match(result, /沒有操作真實 LINE/);
  assert.doesNotMatch(result, /data-answer=/);
});

test("question 5 wrong answer shows only its reason while the safe answer keeps its result card", () => {
  const question = bank.find((item) => item.id === "line-scam-5");
  const risk = renderSupportCallResult(question, { correct: false, index: 0, qs: [question] });
  assert.match(risk, /為什麼錯/);
  assert.match(risk, new RegExp(question.explain));
  assert.doesNotMatch(risk, /安全做法|立即拒接|未接通|帳號異常/);
  assert.match(risk, /data-next/);
  assert.doesNotMatch(risk, /data-scene-action|data-answer=|getUserMedia|getDisplayMedia/);

  const safe = renderSupportCallResult(question, { correct: true, index: 0, qs: [question] });
  assert.match(safe, /答對了，做得好/);
  assert.match(safe, /LINE 官方客服不會來電要求你開啟螢幕共享/);
  assert.match(safe, /記住這個方法/);
  assert.match(safe, /data-next/);

  const incoming = renderSupportCallStage("call-incoming", question, { index: 0, qs: [question] });
  assert.match(incoming, /data-scene-action="answer-call"/);
  assert.match(incoming, /data-scene-action="decline-call"/);
});

test("question 5 controller shows chat for five seconds, then opens the call choice and direct results", () => {
  const descriptors = Object.fromEntries(
    ["window", "document", "location", "sessionStorage", "localStorage"].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  const previousSettings = getState().settings;
  const values = new Map();
  const timers = new Map();
  let nextTimerId = 0;
  const quizBody = { innerHTML: "" };
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    },
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: () => null, setItem() {} },
  });
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { hash: "#exercise" },
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      title: "",
      body: { classList: { toggle() {}, remove() {} } },
      querySelector: (selector) => selector === "#quizBody" ? quizBody : selector === "#main" ? { focus() {} } : null,
    },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      innerWidth: 390,
      innerHeight: 844,
      visualViewport: null,
      addEventListener() {},
      setTimeout: (callback, delay) => {
        const id = ++nextTimerId;
        timers.set(id, { callback, delay });
        return id;
      },
      clearTimeout: (id) => timers.delete(id),
      setInterval: () => 1,
      clearInterval() {},
      dispatchEvent() {},
      scrollTo() {},
    },
  });

  try {
    updateSettings({ fontLevel: 0, voice: false });
    const exercise = createExerciseController({ refresh() {} });
    exercise.start(null, "line-scam-5");
    exercise.render();
    assert.equal(exercise.getSession().interactionStage, "chat");
    assert.match(quizBody.innerHTML, /line-chat-incoming-bubble/);
    assert.doesNotMatch(quizBody.innerHTML, /support-call-screen is-incoming|data-scene-action="answer-call"/);
    const transition = [...timers.values()].find((timer) => timer.delay === 5000);
    assert.ok(transition, "a five-second transition is scheduled");
    transition.callback();
    assert.equal(exercise.getSession().interactionStage, "call-incoming");
    assert.match(quizBody.innerHTML, /support-call-screen is-incoming/);

    exercise.sceneAction("answer-call");
    assert.equal(exercise.getSession().answered, true);
    assert.equal(exercise.getSession().correct, false);
    assert.equal(exercise.getSession().interactionStage, "call-result-risk");
    assert.match(quizBody.innerHTML, /data-wrong-answer-modal/);
    assert.match(quizBody.innerHTML, /你的錢被騙走了/);
    assert.match(quizBody.innerHTML, /知道了，查看解析/);
    assert.match(quizBody.innerHTML, /為什麼錯/);
    assert.doesNotMatch(quizBody.innerHTML, /安全做法|話術陷阱|立即拒接並掛斷/);
    exercise.next();
    assert.equal(exercise.getSession().complete, false);
    exercise.dismissWrongAnswer();
    exercise.render();
    assert.doesNotMatch(quizBody.innerHTML, /data-wrong-answer-modal/);
    assert.match(quizBody.innerHTML, /為什麼錯/);
    assert.doesNotMatch(quizBody.innerHTML, /support-call-screen is-active|data-scene-action="toggle-video"/);

    exercise.start(null, "line-scam-5");
    exercise.render();
    const nextTransition = [...timers.values()].find((timer) => timer.delay === 5000);
    assert.ok(nextTransition);
    nextTransition.callback();
    exercise.sceneAction("decline-call");
    assert.equal(exercise.getSession().answered, true);
    assert.equal(exercise.getSession().correct, true);
    assert.equal(exercise.getSession().interactionStage, "call-result-safe");
    assert.match(quizBody.innerHTML, /答對了，做得好/);
    assert.match(quizBody.innerHTML, /立即掛斷/);
  } finally {
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
    updateSettings({
      fontLevel: previousSettings.fontLevel,
      voice: previousSettings.voice,
      speechLanguage: previousSettings.speechLanguage,
    });
  }
});

test("large-type LINE reading keeps the incoming bubble text separate from its chat header", () => {
  const question = bank.find((item) => item.id === "line-scam-1");
  assert.equal(
    focusText({ qs: [question], index: 0, branchFlow: false, answered: false }),
    question.text,
  );
});

test("large-type question 5 opens in chat without options", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  const quizBody = { innerHTML: "" };
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { querySelector: (selector) => selector === "#quizBody" ? quizBody : null },
  });
  try {
    const question = bank.find((item) => item.id === "line-scam-5");
    renderFocusExercise({
      qs: [question], index: 0, answered: false, branchFlow: false,
      questionView: "read", interactionStage: "chat",
    });
    assert.match(quizBody.innerHTML, /line-chat-device/);
    assert.match(quizBody.innerHTML, /line-chat-incoming-bubble/);
    assert.doesNotMatch(quizBody.innerHTML, /support-call-screen is-incoming|data-scene-action="answer-call"|data-answer=/);
    assert.equal((quizBody.innerHTML.match(/line-chat-incoming-bubble/g) || []).length, 1);
  } finally {
    if (previous) Object.defineProperty(globalThis, "document", previous);
    else delete globalThis.document;
  }
});

test("large-type question 5 displays the large safe-result card after declining", () => {
  const question = bank.find((item) => item.id === "line-scam-5");
  const quizBody = { innerHTML: "" };
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { querySelector: (selector) => selector === "#quizBody" ? quizBody : null },
  });
  try {
    renderFocusExercise({
      qs: [question], index: 0, answered: true, correct: true,
      selectedAnswer: 1, branchFlow: false, interactionStage: "call-result-safe",
    });
    assert.match(quizBody.innerHTML, /support-call-result is-safe/);
    assert.match(quizBody.innerHTML, /答對了，做得好！/);
    assert.match(quizBody.innerHTML, /立即掛斷/);
    assert.match(quizBody.innerHTML, /data-next/);
    assert.doesNotMatch(quizBody.innerHTML, /class="reading-copy"|class="focus-controls"/);
  } finally {
    if (previous) Object.defineProperty(globalThis, "document", previous);
    else delete globalThis.document;
  }
});

test("LINE chat rendering escapes message content and contact names", () => {
  const question = {
    ...bank.find((item) => item.id === "line-scam-1"),
    sender: "<script>阿明</script>",
    text: "<img src=x onerror=alert(1)>",
  };
  const html = renderLineChatQuestion(question, { index: 0, qs: [question] });
  assert.match(html, /&lt;script&gt;阿明&lt;\/script&gt;/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<script>|<img src=x/);
});

test("bankruptcy reminder displays the supplied meme from the local assets folder", () => {
  assert.ok(existsSync(new URL("../dist/assets/bankrupt-meme.png", import.meta.url)));
  const html = renderBankruptcyModal();
  assert.match(html, /data-bankrupt-modal/);
  assert.match(html, /你的現金被騙光了！！/);
  assert.match(html, /assets\/bankrupt-meme\.png/);
  assert.match(html, /我破產了/);
  assert.match(html, /知道了，繼續練習/);
  assert.match(html, /data-bankrupt-dismiss/);
});

test("wrong-answer prompt uses the cropped local image and shows the deduction beside it", () => {
  assert.ok(existsSync(new URL("../dist/assets/wrong-answer-meme.png", import.meta.url)));
  const html = renderWrongAnswerModal(100);
  assert.match(html, /data-wrong-answer-modal role="dialog" aria-modal="true"/);
  assert.match(html, /你的錢被騙走了/);
  assert.match(html, /assets\/wrong-answer-meme\.png/);
  assert.match(html, /wrong-answer-image-row/);
  assert.match(html, /data-money-flight[^>]*>💸 −NT\$100/);
  assert.match(html, /知道了，查看解析/);
  assert.match(html, /data-wrong-answer-dismiss/);
});


test("large-type question 9 keeps the full interactive chat flow and never shows answer cards", () => {
  const question = bank.find((item) => item.id === "line-scam-9");
  const quizBody = { innerHTML: "" };
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { querySelector: (selector) => selector === "#quizBody" ? quizBody : null },
  });
  try {
    const session = { qs: [question], index: 0, answered: false, branchFlow: false, questionView: "choose" };
    renderFocusExercise({ ...session, interactionStage: "chat" });
    assert.match(quizBody.innerHTML, /data-scene-action="join-job-chat"/);
    assert.doesNotMatch(quizBody.innerHTML, /class="options"|data-answer=/);
    renderFocusExercise({ ...session, interactionStage: "job-contact" });
    assert.match(quizBody.innerHTML, /存摺與提款卡以發放薪資/);
    assert.match(quizBody.innerHTML, /data-scene-action="open-job-payment"/);
    assert.doesNotMatch(quizBody.innerHTML, /class="options"|data-answer=/);
    renderFocusExercise({ ...session, interactionStage: "job-payment" });
    assert.match(quizBody.innerHTML, /模擬付款頁/);
    assert.match(quizBody.innerHTML, /data-scene-action="simulate-job-payment"/);
    renderFocusExercise({ ...session, interactionStage: "job-payment-warning" });
    assert.match(quizBody.innerHTML, /受騙警示/);
    assert.match(quizBody.innerHTML, /data-scene-action="refuse-job-payment"/);
    assert.match(quizBody.innerHTML, /唸出聊天情境和操作提示/);
    renderFocusExercise({ ...session, interactionStage: "job-block-ready" });
    assert.match(quizBody.innerHTML, /安全封鎖/);
    assert.match(quizBody.innerHTML, /我拒絕付款，並退出連結/);
    assert.match(quizBody.innerHTML, /data-scene-action="open-job-menu"/);
    assert.doesNotMatch(quizBody.innerHTML, /class="options"|data-answer=/);
    renderFocusExercise({ ...session, interactionStage: "job-menu" });
    assert.match(quizBody.innerHTML, /聊天室選單/);
    assert.match(quizBody.innerHTML, /關閉提醒/);
    assert.match(quizBody.innerHTML, /class="line-job-menu-overlay"/);
    assert.equal((quizBody.innerHTML.match(/<button\b/g) ?? []).length, 4);
    renderFocusExercise({ ...session, answered: true, correct: true, interactionStage: "job-blocked" });
    assert.match(quizBody.innerHTML, /line-job-focus-result/);
    assert.match(quizBody.innerHTML, /✓ 答對了/);
    assert.match(quizBody.innerHTML, /data-next/);
  } finally {
    if (previous) Object.defineProperty(globalThis, "document", previous);
    else delete globalThis.document;
  }
});
