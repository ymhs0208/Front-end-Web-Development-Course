import { completionCard } from "../components/completion.js?v=job-9-4";
import { renderFocusExercise } from "./focus-reader.js?v=q5-repeat-call-2";
import {
  renderBankruptcyModal,
  renderBranchChat,
  renderBranchFeedback,
  renderMoneyBar,
  renderWrongAnswerModal,
} from "./branch-chat.js?v=q9-payment-return-1";
import { escapeHtml, renderJobBlockResult, renderLineChatQuestion, renderSupportCallResult } from "./line-chat.js?v=q5-repeat-call-2";
import { STARTING_MONEY, applyWrongAnswerPenalty } from "../core/money.js?v=job-9-4";
import { compactOptions } from "../data/compact-options.js?v=shop-1";
import { $ } from "../core/dom.js?v=job-9-4";
import { bank, types } from "../data/questions.js?v=shop-1";
import {
  getState,
  recordResult,
  recordScenarioResult,
} from "../core/store.js?v=shop-1";
import { selectQuestions } from "../core/engine.js?v=job-9-4";
import { restoreSession, saveSession } from "../core/session.js?v=q5-repeat-call-2";
import { say, stopSpeech, isSpeaking } from "./accessibility.js?v=job-9-4";
import { createCallRingtone } from "./call-ringtone.js?v=q5-audio-2";
export function createExerciseController({ refresh }) {
  let session = restoreSession(bank);
  let lastFocusSpeech = "";
  const callRingtone = createCallRingtone();
  let callClockTimer = null;
  let callIncomingTimer = null;
  let callResultTimer = null;
  let chatReplyTimer = null;
  let chatDraft = "";
  let chatMessages = [];
  let chatReplyPending = false;
  let chatPendingAnswerIndex = null;
  let q1ResultModalVisible = false;
  let jobBlockExplanationTimer = null;
  function clearChatReplyTimer() {
    if (chatReplyTimer !== null) {
      window.clearTimeout?.(chatReplyTimer);
      chatReplyTimer = null;
    }
  }
  function resetChatComposer() {
    clearChatReplyTimer();
    chatDraft = "";
    chatMessages = [];
    chatReplyPending = false;
    chatPendingAnswerIndex = null;
    q1ResultModalVisible = false;
  }
  function clearJobBlockExplanationTimer() {
    if (jobBlockExplanationTimer !== null) {
      window.clearTimeout?.(jobBlockExplanationTimer);
      jobBlockExplanationTimer = null;
    }
  }
  function isJobBlockAnswer() {
    const question = session?.qs[session.index];
    return Boolean(
      question?.interaction === "job-offer" &&
      session?.answered &&
      session.correct &&
      session.interactionStage === "job-blocked",
    );
  }
  function isQ1WrongAnswer() {
    const question = session?.qs[session.index];
    return Boolean(
      question?.id === "line-scam-1" &&
      session?.answered &&
      session.correct === false,
    );
  }
  function isJobPaymentWrongAnswer() {
    return Boolean(
      session?.qs[session.index]?.id === "line-scam-9" &&
      session.answered && session.correct === false &&
      session.interactionStage === "job-payment-warning",
    );
  }
  function syncJobBlockExplanationTimer() {
    if (!session?.blockExplanationPending || jobBlockExplanationTimer !== null) return;
    const pendingSession = session;
    jobBlockExplanationTimer = window.setTimeout(() => {
      jobBlockExplanationTimer = null;
      if (session !== pendingSession || !session?.blockExplanationPending || !isJobBlockAnswer()) return;
      session.blockExplanationPending = false;
      session.blockExplanationVisible = true;
      saveSession(session);
      location.hash = "#explanation";
      refresh();
      window.scrollTo(0, 0);
      $("#main")?.focus({ preventScroll: true });
    }, 1000);
  }
  function chatViewState(question = session?.qs[session.index]) {
    return question?.interaction === "vote-link" && question.id === "line-scam-1"
      ? { draft: chatDraft, messages: chatMessages, pending: chatReplyPending }
      : {};
  }
  function renderMoneyModal() {
    if (!session) return "";
    if (session.wrongActionPending) {
      if (session.money === 0) {
        if (!session.bankruptAcknowledged) return renderBankruptcyModal();
        if (session.lastMoneyLoss > 0) return "";
      }
      return !session.wrongAnswerAcknowledged
        ? renderWrongAnswerModal(session.lastMoneyLoss)
        : "";
    }
    if (session.answered && session.correct === false) {
      if (session.money === 0) {
        if (!session.bankruptAcknowledged) return renderBankruptcyModal();
        if (session.lastMoneyLoss > 0) return "";
      }
      return !session.wrongAnswerAcknowledged
        ? renderWrongAnswerModal(session.lastMoneyLoss)
        : "";
    }
    return session.money === 0 && !session.bankruptAcknowledged
      ? renderBankruptcyModal()
      : "";
  }
  function clearCallIncomingTimer() {
    if (callIncomingTimer !== null) {
      window.clearTimeout?.(callIncomingTimer);
      callIncomingTimer = null;
    }
  }
  function clearCallResultTimer() {
    if (callResultTimer !== null) {
      window.clearTimeout?.(callResultTimer);
      callResultTimer = null;
    }
  }
  function syncCallRingtone(question) {
    if (question?.interaction === "support-call" && !session?.answered && session?.interactionStage === "call-incoming")
      callRingtone.start();
    else callRingtone.stop();
  }
  function syncCallIncomingTimer(question) {
    const stage = session?.interactionStage;
    const shouldRing = question?.interaction === "support-call" && !session?.answered &&
      ((stage === "chat" && session.callCount === 0) || (stage === "call-declined" && session.callCount === 1));
    if (!shouldRing) {
      clearCallIncomingTimer();
      return;
    }
    if (callIncomingTimer !== null) return;
    const expectedStage = stage;
    const scheduledSession = session;
    const delay = stage === "chat" ? 1000 : 1500;
    callIncomingTimer = window.setTimeout(() => {
      callIncomingTimer = null;
      if (session !== scheduledSession || session.answered || session.qs[session.index]?.id !== question.id || session.interactionStage !== expectedStage) return;
      session.interactionStage = "call-incoming";
      session.callCount = expectedStage === "chat" ? 1 : 2;
      saveSession(session);
      renderQuestion();
      window.scrollTo(0, 0);
      $(".support-call-screen.is-incoming")?.focus({ preventScroll: true });
    }, delay);
  }
  function syncCallResultTimer(question) {
    if (question?.interaction !== "support-call" || session?.answered || session?.interactionStage !== "call-final-declined") {
      clearCallResultTimer();
      return;
    }
    if (callResultTimer !== null) return;
    const scheduledSession = session;
    callResultTimer = window.setTimeout(() => {
      callResultTimer = null;
      if (session !== scheduledSession || session.answered || session.qs[session.index]?.id !== question.id || session.interactionStage !== "call-final-declined") return;
      session.interactionStage = "call-result-safe";
      answer(1);
    }, 1000);
  }
  function supportCallStageSpeech(question) {
    if (!question || question.interaction !== "support-call" || session.answered)
      return "";
    const firstLine = question.segments?.[0]?.text || question.text;
    const secondLine = question.segments?.[1]?.text || question.text;
    if (session.interactionStage === "call-incoming")
      return `收到第 ${session.callCount || 1} 通自稱 LINE 官方客服的模擬視訊來電。請選擇拒接或通話；這不會啟動相機、麥克風或連接真實服務。`;
    if (session.interactionStage === "chat")
      return "聊天室收到一則自稱 LINE 官方客服的訊息。一秒後會出現模擬視訊來電；所有操作都只在本機，不會連接真實服務。";
    if (session.interactionStage === "call-declined")
      return "你已拒接第一通來電，聊天室已留下未接來電訊息；一點五秒後，對方會再打來第二通模擬來電。";
    if (session.interactionStage === "call-final-declined")
      return "你已拒接第二通來電，聊天室記下兩通未接來電；接著顯示安全做法。所有來電都只是本機模擬。";
    if (session.interactionStage === "call-active")
      return `模擬通話進行中。對方說：${firstLine}。按結束通話會回到原聊天室，繼續查看訊息與後續選項。`;
    if (session.interactionStage === "call-ended")
      return `你已結束模擬通話並返回原聊天室。對方剛才說：${firstLine}。你可以查看對方接著提出的要求。`;
    if (["call-followup", "call-followup-declined", "call-followup-missed"].includes(session.interactionStage))
      return `客服接著說：${secondLine}。${["call-followup-declined", "call-followup-missed"].includes(session.interactionStage) ? "你可以拒絕螢幕共享，或查看其他做法。" : "你可以模擬開啟螢幕共享、查看員工證，或按結束通話返回聊天室。"}`;
    if (session.interactionStage === "screen-share")
      return "你被騙了！這是螢幕共享情境模擬，沒有分享手機畫面。假客服可能看見驗證碼、密碼和金融操作。你可以停止模擬共享查看結果，或安全掛斷。";
    return "你已安全掛斷模擬來電。";
  }
  function syncCallClock() {
    if (callClockTimer !== null) {
      window.clearInterval(callClockTimer);
      callClockTimer = null;
    }
    const clock = $(`[data-call-clock]`);
    if (!clock) return;
    const startedAt = Number(clock.dataset.callStart);
    const tick = () => {
      const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      clock.textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    };
    tick();
    callClockTimer = window.setInterval(tick, 1000);
  }
  function jobStageSpeech() {
    const question = session?.qs[session.index];
    if (session?.answered || question?.interaction !== "job-offer") return "";
    if (session.interactionStage === "chat")
      return "一位陌生人傳來時薪五百元的居家打字或點讚工作邀約。按回覆陌生人，看看對方接著會提出什麼要求。這是本機模擬，不會傳送真實訊息。";
    if (session.interactionStage === "job-contact")
      return "你已模擬回覆陌生人。對方要求上工前先繳保證金，或交出存摺和提款卡，接著傳來付款連結。按開啟連結，只會進入本機仿電子支付頁。";
    if (session.interactionStage === "job-payment")
      return "這是仿電子支付頁面，只是本機模擬，不會連網或扣款。畫面要求先繳一千元保證金。按模擬付款只會顯示受騙警示；也可以拒付並退出。";
    if (session.interactionStage === "job-payment-warning")
      return "你被騙了！要求求職者先繳保證金，或提供存摺、提款卡，是重大警訊。剛才只是本機模擬，沒有連到任何支付服務或銀行，也沒有真的扣款。請拒付並回聊天室選單封鎖。";
    if (session.interactionStage === "job-block-ready")
      return "你已拒付並退出模擬付款頁。不要交錢，也不要交出存摺或提款卡。請按聊天室右上角的選單，再從四個操作按鈕中選擇封鎖，完成練習。這是本機模擬，不會操作真實 LINE。";
    if (session.interactionStage === "job-menu")
      return `${session.jobMenuNotice || "聊天室選單已開啟。"}選單有關閉提醒、推薦、邀請、封鎖四個模擬按鈕。請按封鎖完成安全做法。其他按鈕會顯示錯誤結果；所有操作都不會影響真實 LINE。`;
    return "";
  }
  function start(mode, id) {
    clearJobBlockExplanationTimer();
    clearCallIncomingTimer();
    clearCallResultTimer();
    callRingtone.stop();
    callRingtone.stopDecline();
    resetChatComposer();
    const qs = selectQuestions(bank, getState().attempts, mode, id);
    if (!qs.length) return;
    if (qs.some((question) => question.interaction === "support-call")) callRingtone.prepare();
    session = {
      qs,
      index: 0,
      score: 0,
      answered: false,
      complete: false,
      branchFlow: mode === "borrow-branch",
      branchScenario: mode === "borrow-branch" ? qs[0].branchScenario : null,
      nextId: null,
      selectedAnswer: null,
      branchPath: [],
      interactionStage: "chat",
      callStartedAt: null,
      callCount: 0,
      sentMessage: "",
      money: STARTING_MONEY,
      lastMoneyLoss: 0,
      wrongAnswerAcknowledged: false,
      wrongActionPending: false,
      wrongActionReason: "",
      bankruptAcknowledged: false,
    };
    saveSession(session);
    if (location.hash === "#exercise") refresh();
    else location.hash = "exercise";
  }
  function feedback(q, correct, { includeBlockResult = true } = {}) {
    if (!correct) {
      const nextLabel = session.index + 1 === session.qs.length ? "看練習結果" : "下一題";
      const explanation = session.wrongActionReason || q.explain;
      return `<div class="quiz-top"><span>${types[q.type].name}</span><span>第 ${session.index + 1} / ${session.qs.length} 題</span></div><section class="quiz-content answer-page wrong-answer-explanation" aria-labelledby="wrong-answer-explanation-title"><h2 id="wrong-answer-explanation-title">為什麼錯</h2><p class="answer-explanation">${escapeHtml(explanation)}</p><div class="answer-actions"><button class="primary" data-next>${nextLabel} <span aria-hidden="true">→</span></button></div></section>`;
    }
    const outcomeText = q.interaction === "vote-link"
      ? ""
      : session.sceneResult || q.sceneOutcomes?.[session.selectedAnswer] || "";
    const sceneResult = outcomeText
      ? `<p class="line-scene-result${correct ? " is-safe" : ""}" role="status">${escapeHtml(outcomeText)}</p>`
      : "";
    const sentMessage = session.sentMessage
      ? `<p class="line-scene-result is-safe" role="status">你已在模擬聊天室送出：「${escapeHtml(session.sentMessage)}」</p>`
      : "";
    const blockResult = includeBlockResult && q.interaction === "job-offer" && correct && session.interactionStage === "job-blocked"
      ? renderJobBlockResult()
      : "";
    const clickedVoteLink = q.interaction === "vote-link" && session.interactionStage === "fake-site";
    const fakeSiteWarning =
      clickedVoteLink || (q.interaction === "support-call" && session.interactionStage === "screen-share")
        ? `<p class="line-scene-result" role="alert">${clickedVoteLink ? "點擊的投票頁是仿冒網站，會藉由索取手機號碼和簡訊驗證碼盜取帳號。" : "你被騙了！！這是防詐情境演練，沒有分享手機畫面。"}</p>`
        : "";
    return `<div class="quiz-top"><span>${types[q.type].name}</span><span>第 ${session.index + 1} / ${session.qs.length} 題</span></div><div class="quiz-content answer-page"><span class="answer-label">${clickedVoteLink ? "情境結果" : correct ? "✓ 答對了" : "我們一起再看一次"}</span><h1>${clickedVoteLink ? "你被騙了" : correct ? "做得好，記住這個方法。" : "下次可以這樣做。"}</h1>${blockResult}${fakeSiteWarning}${sentMessage}${sceneResult}<section class="safe-action"><h2>安全的做法</h2><p>${q.options[q.answer]}</p></section><p class="answer-explanation">${q.explain}</p><details class="trap-details"><summary>為什麼要小心？</summary><p>${q.trap}</p></details><div class="answer-actions"><button class="primary" data-next>${session.index + 1 === session.qs.length ? "看練習結果" : "下一題"} <span aria-hidden="true">→</span></button><button class="secondary" data-read data-idle-label="唸解說給我聽">唸解說給我聽</button></div></div>`;
  }
  function renderJobBlockPendingPage() {
    return `<section class="line-job-explanation-pending" role="status" aria-live="polite"><span class="line-job-explanation-pending-check" aria-hidden="true">✓</span>${renderJobBlockResult()}<p>答對了，安全解析即將開啟。</p></section>`;
  }
  function renderJobBlockExplanationPage(q) {
    const nextLabel = session.index + 1 === session.qs.length ? "看練習結果" : "下一題";
    return `<article class="line-job-explanation-page" aria-labelledby="line-job-explanation-title"><p class="line-job-explanation-page-kicker">第九題・安全解析</p><span class="line-job-explanation-kicker">✓ 答對了</span><h1 id="line-job-explanation-title">做得好，記住這個方法。</h1><section class="safe-action"><h2>安全做法</h2><p>${escapeHtml(q.options[q.answer])}</p></section><p class="line-job-explanation-copy">${escapeHtml(q.explain)}</p><details class="trap-details"><summary>為什麼要小心？</summary><p>${escapeHtml(q.trap)}</p></details><div class="line-job-explanation-actions"><button class="primary" type="button" data-next>${nextLabel} <span aria-hidden="true">→</span></button></div></article>`;
  }
  function renderQ1WrongExplanationPage(q) {
    const nextLabel = session.index + 1 === session.qs.length ? "看練習結果" : "下一題";
    const simulationNote = session.interactionStage === "fake-site"
      ? "你點開的是仿冒投票頁；這只是本機模擬，沒有連到外網，也沒有輸入資料。"
      : "你在模擬聊天室接受了陌生人的投票請託；這是本機練習，沒有傳送真實訊息。";
    return `<div class="quiz-top"><span>${types[q.type].name}</span><span>第 ${session.index + 1} / ${session.qs.length} 題</span></div><article class="quiz-content answer-page wrong-answer-explanation line-chat-q1-wrong-explanation" aria-labelledby="line-chat-q1-wrong-title"><span class="answer-label">答錯解析</span><h1 id="line-chat-q1-wrong-title">不要點陌生人傳來的投票連結</h1><p class="line-scene-result" role="status">${escapeHtml(simulationNote)}</p><section class="safe-action"><h2>安全的做法</h2><p>${escapeHtml(q.options[q.answer])}</p></section><p class="answer-explanation">${escapeHtml(q.explain)}</p><details class="trap-details"><summary>為什麼要小心？</summary><p>${escapeHtml(q.trap)}</p></details><div class="answer-actions"><button class="primary" type="button" data-next>${nextLabel} <span aria-hidden="true">→</span></button></div></article>`;
  }
  function renderQuestion({ suppressSpeech = false } = {}) {
    const q = session.qs[session.index];
    // Migrate a previously open, embedded payment warning to the new result flow.
    if (q.id === "line-scam-9" && !session.answered && session.interactionStage === "job-payment-warning") {
      answer(0);
      return;
    }
    const callOverlayOpen =
      q.interaction === "support-call" &&
      !session.answered &&
      ["call-incoming", "call-active", "call-followup"].includes(session.interactionStage);
    syncCallRingtone(q);
    if (session.wrongActionPending && !session.answered && q.interaction === "job-offer") {
      session.answered = true;
      session.correct = false;
      session.selectedAnswer = 0;
      session.nextId = null;
      session.wrongActionPending = false;
      session.interactionStage = "job-block-ready";
      session.jobMenuReturnStage = null;
      recordResult({ questionId: q.id, correct: false });
      saveSession(session);
    }
    document.body.classList.toggle(
      "support-call-screen-open",
      callOverlayOpen,
    );
    document.body.classList.toggle(
      "support-call-chat-open",
      q.interaction === "support-call" && !session.answered && !callOverlayOpen,
    );
    if (q.interaction === "support-call") {
      if (["call-active", "call-followup"].includes(session.interactionStage))
        session.callStartedAt ||= Date.now();
      else session.callStartedAt = null;
    } else session.callStartedAt = null;
    syncCallIncomingTimer(q);
    syncCallResultTimer(q);
    document.body.classList.toggle(
      "line-job-menu-open",
      q.interaction === "job-offer" && !session.answered && session.interactionStage === "job-menu",
    );
    syncJobBlockExplanationTimer();
    if (isJobBlockAnswer()) {
      if (!session.blockExplanationPending && !session.blockExplanationVisible) {
        session.blockExplanationVisible = true;
        session.blockExplanationDismissed = false;
        saveSession(session);
      }
      if (session.blockExplanationPending) {
        $("#quizBody").innerHTML = `${renderMoneyBar(session, "quiz-money")}${renderJobBlockPendingPage()}`;
      } else if (location.hash !== "#explanation") {
        location.hash = "#explanation";
        refresh();
      } else {
        $("#quizBody").innerHTML = `${renderMoneyBar(session, "quiz-money")}${renderJobBlockExplanationPage(q)}`;
      }
      return;
    }
    document.title =
      (session.answered ? "作答解說" : "正在練習") + "｜金庫防爆特攻隊";
    if (isJobPaymentWrongAnswer() && !session.wrongAnswerAcknowledged) {
      const chatSession = { ...session, answered: false, interactionStage: "job-payment" };
      const backdrop = renderLineChatQuestion(q, chatSession);
      $("#quizBody").innerHTML = `${renderMoneyBar(session, "quiz-money")}<div class="quiz-top"><span>${types[q.type].name}</span><span>第 ${session.index + 1} / ${session.qs.length} 題</span></div>${backdrop}${renderMoneyModal()}`;
      return;
    }
    if (q.id === "line-scam-1" && session.answered && q1ResultModalVisible) {
      const chatSession = { ...session, answered: false, correct: undefined, interactionStage: "chat" };
      const dialog = session.money === 0
        ? renderBankruptcyModal()
        : renderWrongAnswerModal(session.lastMoneyLoss);
      const chat = renderLineChatQuestion(q, chatSession, { ...chatViewState(q), pending: true });
      $("#quizBody").innerHTML = `${renderMoneyBar(session, "quiz-money")}<div class="quiz-top"><span>${types[q.type].name}</span><span>第 ${session.index + 1} / ${session.qs.length} 題</span></div>${chat}${dialog}`;
      return;
    }
    if (getState().settings.fontLevel >= 2) {
      renderFocusExercise(session, {
        moneyMarkup: renderMoneyBar(
          session,
          session.branchFlow ? "focus-money" : "quiz-money",
        ),
        bankruptcyMarkup: renderMoneyModal(),
        chatViewState: chatViewState(q),
      });
      if (isJobBlockAnswer() && session.blockExplanationVisible)
        $("#quizBody").innerHTML += renderJobBlockExplanationDialog(q);
      syncCallClock();
      if (callOverlayOpen)
        $(session.interactionStage === "call-incoming" ? ".support-call-screen.is-incoming" : '[data-scene-action="hangup-call"]')?.focus({ preventScroll: true });
      const speech = jobStageSpeech() || supportCallStageSpeech(q) || (
        q.interaction === "vote-link" && !session.answered && session.interactionStage === "chat"
          ? `${q.title}。${q.text}。看完訊息後，請選擇「接受」或「拒絕」，再按傳送。`
          : session.questionView === "choose" && !session.answered
          ? compactOptions[q.id].map((o, i) => i + 1 + "，" + o).join("。")
          : $(".reading-copy")?.textContent);
      if (!suppressSpeech && getState().settings.voice && speech && speech !== lastFocusSpeech) {
        lastFocusSpeech = speech;
        say(speech);
      }
      return;
    }
    if (session.branchFlow) {
      const bankrupt = renderMoneyModal();
      $("#quizBody").innerHTML = `${renderBranchChat(session)}${session.answered ? renderBranchFeedback(q, session) : ""}${bankrupt}`;
      const chatLog = $(".line-chat-log");
      if (chatLog) chatLog.scrollTop = chatLog.scrollHeight;
      syncCallClock();
      if (!session.answered) {
        say(
          q.title +
            "。" +
            q.text +
            "。你會怎麼做？" +
            q.options.map((o, i) => i + 1 + "，" + o).join("。"),
        );
      }
      return;
    }
    const bankrupt = renderMoneyModal();
    if (session.answered && q.interaction === "support-call") {
      clearCallIncomingTimer();
      $("#quizBody").innerHTML = `${renderMoneyBar(session, "quiz-money")}${renderSupportCallResult(q, session)}${bankrupt}`;
      syncCallClock();
      return;
    }
    if (session.answered) {
      $("#quizBody").innerHTML = `${renderMoneyBar(session, "quiz-money")}${feedback(q, session.correct)}${bankrupt}`;
      syncCallClock();
      if (q.branchResponses?.[session.selectedAnswer]) {
        const outcome = document.createElement("section");
        outcome.className = "safe-action";
        const heading = document.createElement("h2");
        heading.textContent = "這一步會發生什麼？";
        const description = document.createElement("p");
        description.textContent = q.branchResponses[session.selectedAnswer];
        outcome.append(heading, description);
        $("#quizBody .safe-action")?.before(outcome);
      }
      if (session.branchFlow) {
        const nextButton = $("#quizBody [data-next]");
        if (nextButton)
          nextButton.innerHTML = session.nextId
            ? '下一步 <span aria-hidden="true">→</span>'
            : '看練習結果 <span aria-hidden="true">→</span>';
      }
      return;
    }
    $("#quizBody").innerHTML =
      `${renderMoneyBar(session, "quiz-money")}<div class="quiz-top"><span>${types[q.type].name}</span><span>第 ${session.index + 1} / ${session.qs.length} 題</span></div><div class="exercise-progress" aria-label="目前第 ${session.index + 1} 題，共 ${session.qs.length} 題"><i style="width:${((session.index + 1) / session.qs.length) * 100}%"></i></div>${renderLineChatQuestion(q, session, chatViewState(q))}${bankrupt}`;
    syncCallClock();
    if (callOverlayOpen)
      $(session.interactionStage === "call-incoming" ? ".support-call-screen.is-incoming" : '[data-scene-action="hangup-call"]')?.focus({ preventScroll: true });
    if (!suppressSpeech) say(jobStageSpeech() || supportCallStageSpeech(q) || (
      q.interaction === "vote-link"
        ? `${q.title}。${q.text}。看完訊息後，請選擇「接受」或「拒絕」，再按傳送。`
        : q.title + "。" + q.text + "。你會怎麼做？" + q.options.map((o, i) => i + 1 + "，" + o).join("。")),
    );
  }
  function answer(i, { fromChatReply = false, wrongReason = "" } = {}) {
    if (!session || session.answered || session.complete) return;
    const q = session.qs[session.index];
    if (!Number.isInteger(i) || i < 0 || i >= q.options.length) return;
    if (q.interaction === "job-offer" && i === q.answer && session.interactionStage !== "job-blocked") return;
    clearChatReplyTimer();
    chatPendingAnswerIndex = null;
    q1ResultModalVisible =
      q.id === "line-scam-1" &&
      i !== q.answer &&
      (fromChatReply || (session.interactionStage === "fake-site" && session.money > 100));
    if (!q1ResultModalVisible) {
      chatReplyPending = false;
      chatDraft = "";
      chatMessages = [];
    }
    clearCallIncomingTimer();
    clearCallResultTimer();
    session.answered = true;
    session.readerOffset = 0;
    session.readerHistory = [];
    session.selectedAnswer = i;
    session.nextId = session.branchFlow ? q.next[i] ?? null : null;
    session.correct = i === q.answer;
    session.lastMoneyLoss = 0;
    session.wrongActionPending = false;
    session.wrongActionReason = wrongReason;
    session.sceneResult = q.interaction === "vote-link" ? "" : q.sceneOutcomes?.[i] || "";
    let moneyLoss = 0;
    if (!session.correct) {
      const debit = applyWrongAnswerPenalty(session.money ?? STARTING_MONEY);
      session.money = debit.money;
      moneyLoss = debit.loss;
      session.lastMoneyLoss = debit.loss;
      session.wrongAnswerAcknowledged = false;
    }
    if (session.correct) session.score++;
    if (session.branchFlow)
      session.branchPath.push({
        nodeId: q.id,
        questionId: q.id,
        optionIndex: i,
        optionText: q.options[i],
        correct: session.correct,
      });
    recordResult({ questionId: q.id, correct: session.correct });
    saveSession(session);
    renderQuestion();
    if (moneyLoss && session.money > 0) animateMoneyLoss(moneyLoss);
    document.title = "作答解說｜金庫防爆特攻隊";
    window.scrollTo(0, 0);
    const modalDismiss = $("[data-wrong-answer-dismiss], [data-bankrupt-dismiss]");
    if (modalDismiss) modalDismiss.focus({ preventScroll: true });
    else $("#main").focus({ preventScroll: true });
    if (getState().settings.fontLevel < 2 && isJobPaymentWrongAnswer())
      say(`錢包提醒，你的錢被騙走了。答錯扣了新台幣${moneyLoss}元。按知道了，查看解析。`);
    else if (getState().settings.fontLevel < 2)
      say(
        (session.correct ? "答對了！" : "沒關係，我們一起看懂它。") +
          (moneyLoss ? `答錯扣了新台幣${moneyLoss}元，目前還有新台幣${session.money}元。` : "") +
          (q.branchResponses?.[i]
            ? "你選的做法會怎樣？" + q.branchResponses[i]
            : "") +
          (session.correct ? q.explain : session.wrongActionReason || q.explain),
      );
  }
  function setChatDraft(value = "") {
    const question = session?.qs[session.index];
    if (!question || question.id !== "line-scam-1" || session.answered || chatReplyPending)
      return;
    chatDraft = String(value).slice(0, 500);
  }
  function sendChatMessage(message = "") {
    const question = session?.qs[session.index];
    if (
      !question ||
      question.id !== "line-scam-1" ||
      question.interaction !== "vote-link" ||
      session.answered ||
      session.complete ||
      chatReplyPending
    ) return;
    const choice = String(message || chatDraft).trim();
    const answerIndex = choice === "accept" || choice === "接受"
      ? 0
      : choice === "refuse" || choice === "拒絕"
        ? 1
        : -1;
    if (answerIndex < 0) {
      $(`[data-chat-input]`)?.focus({ preventScroll: true });
      return;
    }
    chatDraft = "";
    const text = answerIndex === 0
      ? "好啊，我幫你投票！我現在就點連結。"
      : "不好意思，我不認識你，不會幫忙投票，也不會點連結。";
    chatMessages.push({ direction: "outgoing", text });
    chatPendingAnswerIndex = answerIndex;
    chatReplyPending = true;
    renderQuestion({ suppressSpeech: true });
    const chatLog = $(".line-chat-conversation");
    if (chatLog) chatLog.scrollTop = chatLog.scrollHeight;
    const replySession = session;
    clearChatReplyTimer();
    chatReplyTimer = window.setTimeout(() => {
      chatReplyTimer = null;
      if (session !== replySession || session?.answered || session?.complete) return;
      answer(chatPendingAnswerIndex, { fromChatReply: true });
    }, 1000);
  }
  function next() {
    if (!session?.answered || session.complete) return;
    if (session.correct === false) {
      const bankruptcyDismissed = session.money === 0 && session.lastMoneyLoss > 0;
      if (bankruptcyDismissed ? !session.bankruptAcknowledged : !session.wrongAnswerAcknowledged)
        return;
    }
    if (location.hash === "#explanation") location.hash = "#exercise";
    q1ResultModalVisible = false;
    clearJobBlockExplanationTimer();
    if (session.branchFlow) {
      const nextQuestion = session.nextId
        ? bank.find(
            (question) =>
              question.id === session.nextId &&
              question.branchScenario === session.branchScenario,
          )
        : null;
      if (nextQuestion) {
        session.qs.push(nextQuestion);
        session.index = session.qs.length - 1;
        session.answered = false;
        session.correct = undefined;
        session.selectedAnswer = null;
        session.nextId = null;
        session.lastMoneyLoss = 0;
        session.wrongAnswerAcknowledged = false;
        session.wrongActionPending = false;
        session.wrongActionReason = "";
        session.bankruptAcknowledged = session.money === 0;
        session.questionView = "read";
        session.readerOffset = 0;
        session.readerHistory = [];
        saveSession(session);
        renderQuestion();
        window.scrollTo(0, 0);
        $("#main").focus({ preventScroll: true });
      } else {
        const finalStep = session.branchPath.at(-1);
        const finalQuestion = bank.find((question) => question.id === finalStep?.questionId);
        recordScenarioResult({
          scenarioId: session.branchScenario,
          path: session.branchPath,
          endingId: finalQuestion?.endingIds?.[finalStep?.optionIndex],
          score: session.score,
          maxScore: session.branchPath.length,
          completedAt: Date.now(),
        });
        session.complete = true;
        saveSession(session);
        refresh();
        window.scrollTo(0, 0);
        $("#main").focus({ preventScroll: true });
        say("你完成了，真棒！");
      }
      return;
    }
    if (session.index + 1 < session.qs.length) {
      session.index++;
      session.answered = false;
      session.correct = undefined;
      session.lastMoneyLoss = 0;
      session.wrongAnswerAcknowledged = false;
      session.wrongActionPending = false;
      session.wrongActionReason = "";
      session.bankruptAcknowledged = session.money === 0;
      session.interactionStage = "chat";
      clearCallIncomingTimer();
      session.callStartedAt = null;
      session.sentMessage = "";
      session.questionView = "read";
      session.readerOffset = 0;
      session.readerHistory = [];
      saveSession(session);
      renderQuestion();
      window.scrollTo(0, 0);
      $("#main").focus({ preventScroll: true });
      } else {
        session.complete = true;
        saveSession(session);
        refresh();
      window.scrollTo(0, 0);
      $("#main").focus({ preventScroll: true });
      say("你完成了，真棒！");
    }
  }
  function renderResults() {
    $("#quizBody").innerHTML = `${renderMoneyBar(session, "branch-result-money")}${completionCard(session.qs.length)}`;
  }
  function animateMoneyLoss(amount) {
    const imageRow = $(".wrong-answer-image-row");
    const flightLabel = imageRow?.querySelector("[data-money-flight]");
    if (flightLabel) {
      flightLabel.textContent = `💸 −NT$${amount}`;
      return;
    }
    const wallet = $(".bankrupt-dialog") || $(".branch-money");
    if (!wallet) return;
    const animation = document.createElement("span");
    animation.className = "money-flight";
    animation.setAttribute("aria-hidden", "true");
    animation.textContent = `💸 −NT$${amount}`;
    wallet.append(animation);
    animation.addEventListener("animationend", () => animation.remove(), {
      once: true,
    });
    window.setTimeout(() => animation.remove(), 1400);
  }
  function dismissBankruptcy() {
    if (!session || session.money !== 0) return;
    closeQuiz("home");
  }
  function dismissWrongAnswer() {
    if (!session || session.wrongAnswerAcknowledged || !(session.wrongActionPending || (session.answered && session.correct === false)))
      return;
    session.wrongAnswerAcknowledged = true;
    saveSession(session);
    if (isQ1WrongAnswer() || isJobPaymentWrongAnswer()) {
      q1ResultModalVisible = false;
      location.hash = "#explanation";
      refresh();
      window.scrollTo(0, 0);
      $("#main")?.focus({ preventScroll: true });
      return;
    }
    $(`[data-wrong-answer-modal]`)?.remove();
    const explanation = $("#quizBody .wrong-answer-explanation");
    if (explanation) {
      explanation.setAttribute("tabindex", "-1");
      explanation.focus({ preventScroll: true });
    }
  }
  function sceneAction(action) {
    if (!session || session.complete) return;
    const question = session.qs[session.index];
    if (isJobBlockAnswer() && action === "dismiss-job-block-explanation" && session.blockExplanationVisible) {
      session.blockExplanationVisible = false;
      session.blockExplanationDismissed = true;
      saveSession(session);
      renderQuestion();
      $("[data-scene-action='reopen-job-block-explanation']")?.focus({ preventScroll: true });
      return;
    }
    if (isJobBlockAnswer() && action === "reopen-job-block-explanation" && session.blockExplanationDismissed) {
      session.blockExplanationVisible = true;
      session.blockExplanationDismissed = false;
      saveSession(session);
      renderQuestion();
      $("[data-job-block-explanation]")?.focus({ preventScroll: true });
      return;
    }
    if (session.answered) return;
    if (!question || !["vote-link", "support-call", "job-offer"].includes(question.interaction))
      return;
    if (action === "open-fake-site") {
      session.interactionStage = "fake-site";
      answer(0);
    } else if (action === "prepare-safe-reply") {
      session.interactionStage = "compose";
      saveSession(session);
      renderQuestion();
      $("[data-scene-action='send-safe-reply']")?.focus({ preventScroll: true });
    } else if (action === "submit-phishing") answer(0);
    else if (action === "send-safe-reply") sendChatMessage("不了謝謝");
    else if (action === "answer-call" && question.interaction === "support-call" && session.interactionStage === "call-incoming") {
      callRingtone.stop();
      session.interactionStage = "call-result-risk";
      answer(0);
    } else if (action === "decline-call" && question.interaction === "support-call" && session.interactionStage === "call-incoming") {
      callRingtone.stop();
      callRingtone.playDecline();
      session.interactionStage = session.callCount >= 2 ? "call-final-declined" : "call-declined";
      saveSession(session);
      renderQuestion();
      window.scrollTo(0, 0);
      $(".support-call-missed-call:last-child")?.focus({ preventScroll: true });
    } else if (action === "continue-support-call" && question.interaction === "support-call" && ["call-ended", "call-active", "call-declined"].includes(session.interactionStage)) {
      session.interactionStage = session.interactionStage === "call-declined" ? "call-followup-missed" : session.interactionStage === "call-ended" ? "call-followup-declined" : "call-followup";
      saveSession(session);
      renderQuestion();
      $(session.interactionStage === "call-followup" ? "[data-scene-action='start-screen-share']" : "[data-answer='1']")?.focus({ preventScroll: true });
    } else if (["toggle-mute", "toggle-video", "toggle-speaker"].includes(action) && question.interaction === "support-call" && ["call-active", "call-followup"].includes(session.interactionStage)) {
      const control = action.replace("toggle-", "");
      session.callControls ||= { mute: false, video: false, speaker: false };
      session.callControls[control] = !session.callControls[control];
      renderQuestion();
      $(`[data-scene-action="${action}"]`)?.focus({ preventScroll: true });
    } else if (action === "start-screen-share" && question.interaction === "support-call" && ["call-followup", "call-followup-declined", "call-followup-missed"].includes(session.interactionStage)) {
      session.interactionStage = "screen-share";
      saveSession(session);
      renderQuestion();
      window.scrollTo(0, 0);
      $(`[data-scene-action="stop-screen-share"]`)?.focus({ preventScroll: true });
    } else if (action === "hangup-call" && question.interaction === "support-call" && ["call-active", "call-followup"].includes(session.interactionStage)) {
      session.interactionStage = "call-ended";
      session.callStartedAt = null;
      saveSession(session);
      renderQuestion();
      window.scrollTo(0, 0);
      $(`[data-scene-action="continue-support-call"]`)?.focus({ preventScroll: true });
    } else if (["start-hangup", "confirm-hangup"].includes(action) && question.interaction === "support-call") {
      answer(1);
    } else if (action === "stop-screen-share" && question.interaction === "support-call") {
      answer(0);
    } else if (action === "join-job-chat" && question.interaction === "job-offer" && session.interactionStage === "chat") {
      session.interactionStage = "job-contact";
      saveSession(session);
      renderQuestion();
      window.scrollTo(0, 0);
      $(`[data-scene-action="open-job-payment"]`)?.focus({ preventScroll: true });
    } else if (action === "open-job-payment" && question.interaction === "job-offer" && session.interactionStage === "job-contact") {
      session.interactionStage = "job-payment";
      saveSession(session);
      renderQuestion();
      window.scrollTo(0, 0);
      $(`[data-scene-action="simulate-job-payment"]`)?.focus({ preventScroll: true });
    } else if (action === "return-to-job-chat" && question.interaction === "job-offer" && session.interactionStage === "job-payment") {
      session.interactionStage = "job-contact";
      saveSession(session);
      renderQuestion();
      window.scrollTo(0, 0);
      $(`[data-scene-action="open-job-payment"]`)?.focus({ preventScroll: true });
    } else if (action === "simulate-job-payment" && question.interaction === "job-offer" && session.interactionStage === "job-payment") {
      session.interactionStage = "job-payment-warning";
      answer(0);
    } else if (["refuse-job-payment", "cancel-job-payment"].includes(action) && question.interaction === "job-offer" && ["job-payment", "job-payment-warning"].includes(session.interactionStage)) {
      session.interactionStage = "job-block-ready";
      session.jobMenuNotice = "你已拒付並退出模擬付款頁；接著請在聊天室選單按「封鎖」。";
      saveSession(session);
      renderQuestion();
      window.scrollTo(0, 0);
      $(`[data-scene-action="open-job-menu"]`)?.focus({ preventScroll: true });
    } else if (action === "open-job-menu" && question.interaction === "job-offer" && ["job-contact", "job-block-ready"].includes(session.interactionStage)) {
      session.jobMenuReturnStage = session.interactionStage;
      session.interactionStage = "job-menu";
      saveSession(session);
      renderQuestion();
      $(".line-chat-device, .line-job-menu-stage")?.scrollIntoView({ block: "start" });
      $(`[data-scene-action="job-menu-mute"]`)?.focus({ preventScroll: true });
    } else if (action === "close-job-menu" && question.interaction === "job-offer" && session.interactionStage === "job-menu") {
      session.interactionStage = session.jobMenuReturnStage === "job-contact" ? "job-contact" : "job-block-ready";
      session.jobMenuReturnStage = null;
      saveSession(session);
      renderQuestion();
      $(`[data-scene-action="open-job-menu"]`)?.focus({ preventScroll: true });
    } else if (["job-menu-mute", "job-menu-recommend", "job-menu-invite"].includes(action) && question.interaction === "job-offer" && session.interactionStage === "job-menu") {
      const actionName = {
        "job-menu-mute": "關閉提醒",
        "job-menu-recommend": "推薦",
        "job-menu-invite": "邀請",
      }[action];
      session.interactionStage = "job-block-ready";
      session.jobMenuReturnStage = null;
      answer(0, { wrongReason: `「${actionName}」不會封鎖對方，詐騙帳號仍可繼續聯絡你；應選「封鎖」完成處理。` });
    } else if (action === "confirm-job-block" && question.interaction === "job-offer" && session.interactionStage === "job-menu") {
      session.interactionStage = "job-blocked";
      session.sentMessage = "";
      session.blockExplanationPending = true;
      session.blockExplanationVisible = false;
      session.blockExplanationDismissed = false;
      answer(1);
    }
  }
  function closeQuiz(destination = "practice") {
    stopSpeech();
    clearJobBlockExplanationTimer();
    clearCallIncomingTimer();
    clearCallResultTimer();
    callRingtone.stop();
    resetChatComposer();
    document.body.classList.remove("support-call-screen-open");
    document.body.classList.remove("support-call-chat-open");
    document.body.classList.remove("line-job-menu-open");
    session = null;
    saveSession(null);
    location.hash = destination;
  }
  function canShowJobBlockExplanation() {
    return isJobBlockAnswer() && session.blockExplanationVisible === true;
  }
  function canShowQ1WrongExplanation() {
    return isQ1WrongAnswer() && session.wrongAnswerAcknowledged === true;
  }
  function canShowJobPaymentWrongExplanation() {
    return isJobPaymentWrongAnswer() && session.wrongAnswerAcknowledged === true;
  }
  function canShowExplanation() {
    return canShowJobBlockExplanation() || canShowQ1WrongExplanation() || canShowJobPaymentWrongExplanation();
  }
  function render() {
    if (location.hash === "#explanation" && canShowQ1WrongExplanation()) {
      const question = session.qs[session.index];
      $("#quizBody").innerHTML = `${renderMoneyBar(session, "quiz-money")}${renderQ1WrongExplanationPage(question)}`;
    } else if (location.hash === "#explanation" && canShowJobPaymentWrongExplanation()) {
      const question = session.qs[session.index];
      $("#quizBody").innerHTML = `${renderMoneyBar(session, "quiz-money")}${feedback(question, false)}`;
    } else if (location.hash === "#explanation" && canShowJobBlockExplanation()) {
      const question = session.qs[session.index];
      $("#quizBody").innerHTML = `${renderMoneyBar(session, "quiz-money")}${renderJobBlockExplanationPage(question)}`;
    } else if (session?.complete) renderResults();
    else if (session) renderQuestion();
  }
  function read() {
    if (isSpeaking()) {
      stopSpeech();
      return;
    }
    const question = session?.qs[session.index];
    if (!question) return;
    const stageSpeech = jobStageSpeech() || supportCallStageSpeech(question);
    if (stageSpeech) {
      say(stageSpeech, true);
      return;
    }
    if (getState().settings.fontLevel >= 2) {
      const liveChatSpeech =
        !session.answered &&
        session.interactionStage === "chat" &&
        ["vote-link", "support-call"].includes(question.interaction)
          ? question.interaction === "vote-link"
            ? `模擬聊天室收到訊息：${question.text}。看完訊息後，請選擇「接受」或「拒絕」，再按傳送。`
            : `模擬 LINE 語音來電，對方說：${question.text}。你會怎麼處理這通來電？${compactOptions[question.id].map((option, index) => `${index + 1}，${option}`).join("。")}`
          : "";
      const text = liveChatSpeech || (!session.answered && session.interactionStage === "hangup"
        ? "模擬來電仍在通話中。按下掛斷電話，結束這通可疑來電。這只是練習，不會撥打或接聽真實電話。"
        : !session.answered && session.interactionStage === "screen-share"
          ? "你被騙了！這是螢幕共享情境模擬，沒有分享手機畫面。不要讓假客服看到驗證碼或金融操作。"
          : !session.answered && session.interactionStage === "compose"
            ? "訊息框已填入：不了謝謝。按傳送後，請封鎖陌生帳號，並自行向 LINE 官方查證。"
            : !session.answered && session.interactionStage === "fake-site"
              ? "你被騙了！這是假網站模擬。不要輸入手機號碼或簡訊驗證碼。"
              : session.questionView === "choose" && !session.answered
          ? compactOptions[question.id]
              .map((o, i) => i + 1 + "，" + o)
              .join("。")
          : document.querySelector(".reading-copy")?.textContent);
      if (text) say(text, true);
      return;
    }
    if (session.answered)
      say(
        "安全的做法。" +
          question.options[question.answer] +
          "。" +
          (question.branchResponses?.[session.selectedAnswer]
            ? "你選的做法會怎樣？" +
              question.branchResponses[session.selectedAnswer] +
              "。"
            : "") +
          question.explain,
        true,
      );
    else if (session.interactionStage === "hangup")
      say("模擬來電仍在通話中。按下掛斷電話，結束這通可疑來電。這只是練習，不會撥打或接聽真實電話。", true);
    else if (session.interactionStage === "screen-share")
      say("你被騙了！這是螢幕共享情境模擬，沒有分享手機畫面。不要讓假客服看到驗證碼或金融操作。", true);
    else if (session.interactionStage === "compose")
      say("訊息框已填入：不了謝謝。按傳送後，請封鎖陌生帳號，並自行向 LINE 官方查證。", true);
    else if (session.interactionStage === "fake-site")
      say("你被騙了！這是假網站模擬。不要輸入手機號碼或簡訊驗證碼。", true);
    else if (question.interaction === "vote-link")
      say(`${question.title}。${question.text}。看完訊息後，請選擇「接受」或「拒絕」，再按傳送。`, true);
    else
      say(
        jobStageSpeech() ||
          question.title +
            "。" +
            question.text +
            "。你會怎麼做？" +
            question.options
              .map((text, index) => index + 1 + "，" + text)
              .join("。"),
        true,
      );
  }
  function reader(action) {
    if (!session || session.complete) return;
    stopSpeech();
    if (action === "back") {
      session.questionView = "read";
      session.readerOffset = 0;
      session.readerHistory = [];
    } else if (action === "previous") {
      if (!session.readerHistory?.length) return;
      session.readerOffset = session.readerHistory.pop();
    } else if (session.readerFinished) {
      if (session.answered) {
        next();
        return;
      }
      session.questionView = "choose";
    } else {
      session.readerHistory ||= [];
      session.readerHistory.push(session.readerOffset || 0);
      session.readerOffset = session.readerEnd;
    }
    saveSession(session);
    renderQuestion();
    window.scrollTo(0, 0);
    $("#main").focus({ preventScroll: true });
  }
  let lastViewport = `${window.innerWidth}:${window.innerHeight}`;
  function reflow(event) {
    const size = `${window.innerWidth}:${window.innerHeight}`;
    if (event?.type !== "vault:text-size-changed" && size === lastViewport)
      return;
    lastViewport = size;
    if (["#exercise", "#explanation"].includes(location.hash) && session && !session.complete)
      render();
  }
  window.addEventListener("vault:text-size-changed", reflow);
  window.addEventListener("resize", reflow);
  window.addEventListener("hashchange", () => {
    if (location.hash !== "#exercise") {
      callRingtone.stop();
      callRingtone.stopDecline();
      clearCallIncomingTimer();
    }
  });
  window.addEventListener("pagehide", () => {
    callRingtone.stop();
    callRingtone.stopDecline();
  });
  window.visualViewport?.addEventListener("resize", reflow);
  return {
    reader,
    start,
    answer,
    setChatDraft,
    sendChatMessage,
    sceneAction,
    next,
    dismissWrongAnswer,
    dismissBankruptcy,
    close: closeQuiz,
    read,
    render,
    canShowJobBlockExplanation,
    canShowExplanation,
    getSession: () => session,
  };
}
