import { $ } from "../core/dom.js?v=job-9-4";
import { WRONG_ANSWER_PENALTY } from "../core/money.js?v=job-9-4";
import {
  allFlagsFound,
  createShopSession,
  currentScene,
  decide,
  dismissModal,
  goDecide,
  nextScene,
  tapSpot,
  useHint,
  validateShopSession,
} from "../core/shop-engine.js?v=shop-7";
import { activeShopQuestionIds, bank, types } from "../data/questions.js?v=shop-7";
import { flagIds, shopPlatforms } from "../data/shop-scenarios.js?v=shop-7";
import { getState, recordResult, recordShopResult } from "../core/store.js?v=shop-7";
import { renderMoneyBar } from "./branch-chat.js?v=q9-payment-return-1";
import { escapeHtml } from "./line-chat.js?v=q5-repeat-call-2";
import { isSpeaking, say, stopSpeech } from "./accessibility.js?v=job-9-4";
import { toast } from "../components/notifications.js?v=job-9-4";

const SESSION_KEY = "vault-shop-session-v1";

function loadSession() {
  try {
    return validateShopSession(JSON.parse(sessionStorage.getItem(SESSION_KEY)), bank);
  } catch {
    return null;
  }
}
function storeSession(session) {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Practice still works for this page view without session storage.
  }
}
const questionFor = (session) => bank.find((q) => q.id === session.ids[session.index]);

function spotState(session, id, spot) {
  if (session.found.includes(id)) return { cls: "is-flag", badge: "⚠ 可疑" };
  if (session.safeTaps.includes(id) && !spot.flag) return { cls: "is-ok", badge: "✓ 沒問題" };
  if (session.hintSpot === id) return { cls: "is-hint", badge: "👀 這裡" };
  return { cls: "", badge: "" };
}

const ART = {
  bag: `<svg viewBox="0 0 120 120" aria-hidden="true"><path d="M42 44V34a18 18 0 0 1 36 0v10" fill="none" stroke="#3b3b3b" stroke-width="7" stroke-linecap="round"/><path d="M22 46h76l-8 58H30z" fill="#2f2f33"/><path d="M22 46h76l-3 14H25z" fill="#47474d"/><rect x="54" y="66" width="12" height="16" rx="3" fill="#c9a86a"/></svg>`,
  shoe: `<svg viewBox="0 0 120 120" aria-hidden="true"><path d="M14 74c10 0 22-4 30-18l12 6c6 4 16 6 26 8 14 3 26 8 26 20v6H14z" fill="#f4f4f4" stroke="#333" stroke-width="4" stroke-linejoin="round"/><path d="M14 90h94v8H14z" fill="#333"/><path d="M50 64l6 10M60 66l5 9M70 68l4 9" stroke="#e03131" stroke-width="4" stroke-linecap="round"/></svg>`,
};

const ZONE = { url: "top", image: "media" };
const BELOW = new Set(["section", "chat", "system", "form"]);
const zoneOf = (kind) => ZONE[kind] || (BELOW.has(kind) ? "below" : "info");

function partBody(part) {
  const text = escapeHtml(part.text);
  const art = ART[part.art] || ART.bag;
  if (part.kind === "url")
    return `<span class="shop-url-lock" aria-hidden="true">🔒</span><span class="shop-url-text">${text}</span>`;
  if (part.kind === "image")
    return `<span class="shop-media-main" role="img" aria-label="${text}">${art}</span><span class="shop-thumbs" aria-hidden="true"><span class="is-active">${art}</span><span>${art}</span><span>${art}</span></span>`;
  if (part.kind === "buttons")
    return `<span class="shop-buy-buttons"><span class="shop-buy-cart">🛒 加入購物車</span><span class="shop-buy-now">直接購買</span></span>`;
  if (part.kind === "seller")
    return `<span class="shop-seller-avatar" aria-hidden="true">🏪</span><span class="shop-seller-text"><strong>${escapeHtml(part.name)}</strong><small>${text}</small></span>`;
  if (part.kind === "chat")
    return `<span class="shop-chat-who">${escapeHtml(part.who)}</span><span>${text}</span>`;
  if (part.kind === "row")
    return `<span class="shop-row-label">${escapeHtml(part.label)}</span><span class="shop-row-value">${text}</span>`;
  if (part.kind === "price")
    return `<span class="shop-price-badge">${escapeHtml(part.badge)}</span><span class="shop-price-original">原價 <del>$${escapeHtml(part.original)}</del></span><span class="shop-price-sale">$${escapeHtml(part.sale)}</span>`;
  return `<span>${text}</span>`;
}

function renderPart(part, scene, session, interactive) {
  if (part.kind === "section") return `<p class="shop-part-section">${escapeHtml(part.text)}</p>`;
  const spot = scene.spots[part.spot];
  if (!spot || !interactive)
    return `<div class="shop-spot shop-part-${part.kind}">${partBody(part)}</div>`;
  const state = spotState(session, part.spot, spot);
  const pressed = state.cls === "is-flag" || state.cls === "is-ok";
  return `<button type="button" class="shop-spot shop-part-${part.kind} ${state.cls}" data-shop-action="tap" data-spot="${part.spot}" aria-pressed="${pressed}">${partBody(part)}${state.badge ? `<span class="shop-spot-badge">${state.badge}</span>` : ""}</button>`;
}

function renderScene(scene, session, interactive = true) {
  const platform = shopPlatforms[scene.platform] || shopPlatforms.mama;
  const zone = (name) =>
    scene.parts
      .filter((part) => zoneOf(part.kind) === name)
      .map((part) => renderPart(part, scene, session, interactive))
      .join("");
  const below = zone("below");
  return `<section class="shop-device shop-site shop-site-${scene.platform}" aria-label="虛構購物網站「${escapeHtml(platform.name)}」（練習畫面）"><p class="shop-sim-label">練習用・假網站</p><div class="shop-brandbar" aria-hidden="true"><span class="shop-logo">${escapeHtml(platform.name)}<small>${escapeHtml(platform.tagline)}</small></span><span class="shop-search">🔍 ${escapeHtml(platform.search)}</span></div>${zone("top")}<div class="shop-product"><div class="shop-media">${zone("media")}</div><div class="shop-info">${zone("info")}</div></div>${below ? `<div class="shop-below">${below}</div>` : ""}</section>`;
}

// After a tap, the explanation floats at the bottom of the screen, so it is
// visible next to the spot that was tapped, however far down the page it is.
function renderFeedback(session, scene) {
  if (session.lastSpot) {
    const spot = scene.spots[session.lastSpot];
    const left = flagIds(scene).length - session.found.length;
    const status = left > 0 ? `還有 ${left} 個可疑處` : "全部找到了！按「下一步」";
    const head = spot.flag ? `⚠ 可疑：${escapeHtml(spot.label)}` : `✓ 沒問題：${escapeHtml(spot.label)}`;
    return `<div class="shop-feedback shop-tip-pop ${spot.flag ? "is-flag" : "is-ok"}" role="status"><div class="shop-tip-text"><strong>${head}</strong><p>${escapeHtml(spot.tip)}</p><small>${status}</small></div><button type="button" class="shop-tip-close" data-shop-action="close-tip" aria-label="關閉說明">知道了</button></div>`;
  }
  if (session.hintSpot)
    return `<div class="shop-feedback is-hint" role="status"><strong>👀 點閃爍的地方</strong></div>`;
  return `<div class="shop-feedback" role="status"></div>`;
}

function renderFind(session, question, scene) {
  const total = flagIds(scene).length;
  const done = allFlagsFound(session);
  return `<section class="shop-task" data-shop-speech><h1 tabindex="-1">${escapeHtml(question.title)}</h1><p>每個地方都能點，找出怪怪的地方</p><p class="shop-counter"><strong>找到 ${session.found.length} / ${total}</strong></p></section>${renderFeedback(session, scene)}${renderScene(scene, session)}<div class="shop-actions">${done ? `<p class="shop-all-found" role="status">全部找到了！</p>` : ""}<button type="button" class="${done ? "primary" : "secondary"}" data-shop-action="decide">下一步 <span aria-hidden="true">→</span></button>${done ? "" : `<button type="button" class="secondary" data-shop-action="hint">提示</button>`}<button type="button" class="secondary" data-shop-action="read">唸給我聽</button></div>`;
}

function renderDecide(session, question) {
  return `<section class="shop-task" data-shop-speech><h1 id="shop-decide-title" tabindex="-1">你會怎麼做？</h1></section><div class="shop-choices" role="group" aria-labelledby="shop-decide-title">${question.options.map((option, index) => `<button type="button" class="line-choice shop-choice" data-shop-action="choose" data-option="${index}"><span class="line-choice-number" aria-hidden="true">${index + 1}</span><span>${escapeHtml(option)}</span><span class="line-choice-arrow" aria-hidden="true">›</span></button>`).join("")}</div><div class="shop-actions"><button type="button" class="secondary" data-shop-action="back-to-find">再看一次畫面</button><button type="button" class="secondary" data-shop-action="read">唸給我聽</button></div>`;
}

function renderFlagList(session, scene) {
  return `<ul class="shop-flag-list">${flagIds(scene).map((id) => {
    const found = session.found.includes(id);
    return `<li class="${found ? "is-found" : "is-missed"}"><span aria-hidden="true">${found ? "✓" : "○"}</span> ${escapeHtml(scene.spots[id].label)}${found ? "" : "（漏掉）"}</li>`;
  }).join("")}</ul>`;
}

// The wrong-answer pop-up carries the reason itself, so nobody has to scroll to find it.
function wrongReason(session, question) {
  return question.reasons?.[session.choice] || question.trap;
}

function renderModal(session, question) {
  const loss = session.lastMoneyLoss || WRONG_ANSWER_PENALTY;
  const broke = session.money === 0;
  // Same layout as the LINE wallet reminder: kicker, title, meme with the money pill,
  // then the reasons beside the picture (stacked below it on narrow screens).
  return `<div class="bankrupt-overlay wrong-answer-overlay shop-modal" data-wrong-answer-modal role="dialog" aria-modal="true" aria-labelledby="shop-modal-title" aria-describedby="shop-modal-why"><section class="bankrupt-dialog wrong-answer-dialog"><p class="bankrupt-kicker">錢包提醒</p><h2 id="shop-modal-title">${broke ? "你的錢被騙光了" : "你的錢被騙走了"}</h2><div class="shop-modal-layout"><div class="wrong-answer-image-row"><img src="assets/free-money-meme.jpg?v=2" alt="派大星在寫著「免費錢錢」的攤位，把一箱鈔票送給路人" /><span class="money-flight" aria-hidden="true">💸 −NT$${loss}</span></div><div class="shop-modal-reasons"><div class="shop-modal-box is-wrong"><span class="shop-modal-tag">你選了</span><p>${escapeHtml(question.options[session.choice])}</p></div><div class="shop-modal-box is-why" id="shop-modal-why"><span class="shop-modal-tag">✗ 為什麼不行</span><p>${escapeHtml(wrongReason(session, question))}</p></div><div class="shop-modal-box is-safe"><span class="shop-modal-tag">✓ 這樣做才安全</span><p>${escapeHtml(question.options[question.answer])}</p></div></div></div><p class="shop-modal-note">只是練習，沒有真的付錢。</p><button class="primary" type="button" data-shop-action="dismiss" data-wrong-answer-dismiss>知道了，查看解析</button></section></div>`;
}

// Every option with its verdict and reason, so learners see why each wrong one fails,
// not only the one they picked.
function renderOptionReview(session, question) {
  const items = question.options.map((option, index) => {
    const right = index === question.answer;
    const picked = index === session.choice;
    const reason = right ? "這樣最安全。" : question.reasons?.[index] || question.trap;
    return `<li class="shop-option-review ${right ? "is-right" : "is-wrong"}${picked ? " is-picked" : ""}"><div class="shop-option-head"><span class="shop-option-mark" aria-hidden="true">${right ? "✓" : "✗"}</span><strong>${index + 1}. ${escapeHtml(option)}</strong>${picked ? `<span class="shop-option-picked">你選的</span>` : ""}</div><p><span class="visually-hidden">${right ? "正確：" : "錯誤："}</span>${escapeHtml(reason)}</p></li>`;
  });
  return `<section class="shop-option-reviews"><h2>每個選項解析</h2><ol>${items.join("")}</ol></section>`;
}

function renderResult(session, question, scene) {
  const last = session.index + 1 === session.ids.length;
  const verdict = session.correct
    ? `<span class="answer-label">✓ 答對了</span><h1 tabindex="-1">做得好！</h1>`
    : `<span class="answer-label">答錯了</span><h1 tabindex="-1">這樣會被騙</h1>`;
  return `<article class="quiz-content answer-page shop-result" data-shop-speech>${verdict}<section class="safe-action"><h2>這樣做才安全</h2><p>${escapeHtml(question.options[question.answer])}</p></section><p class="answer-explanation">${escapeHtml(question.explain)}</p>${renderOptionReview(session, question)}<section class="shop-flag-summary"><h2>可疑的地方</h2>${renderFlagList(session, scene)}</section><div class="answer-actions"><button class="primary" type="button" data-shop-action="next">${last ? "看結果" : "下一題"} <span aria-hidden="true">→</span></button><button class="secondary" type="button" data-shop-action="read">唸給我聽</button></div></article>${session.modalOpen ? renderModal(session, question) : ""}`;
}

function renderComplete(session) {
  const rows = session.results.map((result, index) =>
    `<li><span>第 ${index + 1} 題</span><strong>${result.correct ? "✓ 答對" : "再練練"}</strong></li>`,
  ).join("");
  return `<div class="quiz-content center result-page completion-card shop-complete" data-shop-speech><h1 tabindex="-1">完成了，真棒！</h1><p>得到 <strong>${session.results.length}</strong> 顆星</p><ul class="shop-summary">${rows}</ul><div class="answer-actions"><button class="primary" type="button" data-shop-action="finish">看獎勵 <span aria-hidden="true">→</span></button><button class="secondary" type="button" data-shop-action="restart">再玩一次</button></div></div>`;
}

function speechFor(session) {
  if (!session) return "";
  if (session.complete) return `完成了，真棒！得到 ${session.results.length} 顆星。`;
  const question = questionFor(session);
  const scene = currentScene(session);
  if (session.stage === "find") {
    const latest = session.lastSpot ? scene.spots[session.lastSpot] : null;
    const head = latest
      ? `${latest.flag ? latest.label : "沒問題"}。${latest.tip}`
      : `${question.title}。點出怪怪的地方。`;
    return `${head}找到 ${session.found.length} 個，共 ${flagIds(scene).length} 個。`;
  }
  if (session.stage === "decide")
    return `你會怎麼做？${question.options.map((o, i) => `${i + 1}，${o}`).join("。")}`;
  return `${session.correct ? "答對了！" : `答錯了，錢被騙走了。為什麼不行：${wrongReason(session, question)}`}這樣做才安全：${question.options[question.answer]}。${question.explain}其他選項：${question.options.map((o, i) => (i === question.answer ? "" : `${o}，${question.reasons?.[i] || question.trap}`)).filter(Boolean).join("")}`;
}

export function createShopController() {
  let session = loadSession();

  function save() {
    storeSession(session);
  }
  function render({ speak = true, focus = null } = {}) {
    const body = $("#shopBody");
    if (!body) return;
    if (!session) {
      session = createShopSession(activeShopQuestionIds);
      save();
    }
    document.title = "假購物網站找碴｜金庫防爆特攻隊";
    const header = `${renderMoneyBar(session, "quiz-money")}<div class="quiz-top"><span>${types.shop.name}</span><span>${session.complete ? "練習結果" : `第 ${session.index + 1} / ${session.ids.length} 題`}</span></div>`;
    if (session.complete) body.innerHTML = `${header}${renderComplete(session)}`;
    else {
      const question = questionFor(session);
      const scene = currentScene(session);
      const progress = `<div class="exercise-progress" aria-label="目前第 ${session.index + 1} 題，共 ${session.ids.length} 題"><i style="width:${((session.index + 1) / session.ids.length) * 100}%"></i></div>`;
      const stage =
        session.stage === "find"
          ? renderFind(session, question, scene)
          : session.stage === "decide"
            ? renderDecide(session, question)
            : renderResult(session, question, scene);
      body.innerHTML = `${header}${progress}${stage}`;
    }
    const target = focus ? $(focus) : null;
    if (target) target.focus({ preventScroll: true });
    if (speak && getState().settings.voice) say(speechFor(session));
  }
  function start() {
    stopSpeech();
    session = createShopSession(activeShopQuestionIds);
    save();
    if (location.hash === "#shop") {
      render();
      window.scrollTo(0, 0);
    } else location.hash = "shop";
  }
  function saveResult(result) {
    try {
      recordShopResult(result);
      recordResult({ questionId: result.questionId, correct: result.correct });
    } catch {
      toast("這次購物練習結果無法儲存，仍可繼續練習。");
    }
  }
  function action(name, data = {}) {
    if (!session) return;
    if (name === "read") {
      if (isSpeaking()) stopSpeech();
      else say(speechFor(session), true);
      return;
    }
    if (name === "restart") return start();
    if (name === "finish") {
      stopSpeech();
      session = null;
      save();
      location.hash = "rewards";
      return;
    }
    if (name === "tap") {
      session = tapSpot(session, data.spot);
      save();
      render({ focus: `[data-spot="${data.spot}"]` });
    } else if (name === "close-tip") {
      const spotId = session.lastSpot;
      session = { ...session, lastSpot: null };
      save();
      render({ speak: false, focus: spotId ? `[data-spot="${spotId}"]` : null });
    } else if (name === "hint") {
      session = useHint(session);
      save();
      render({ speak: false, focus: session.hintSpot ? `[data-spot="${session.hintSpot}"]` : null });
      $(".shop-spot.is-hint")?.scrollIntoView({ block: "center", behavior: "smooth" });
      if (getState().settings.voice) say("點閃爍的地方。");
    } else if (name === "decide") {
      session = goDecide(session);
      save();
      render({ focus: "#shop-decide-title" });
      window.scrollTo(0, 0);
    } else if (name === "back-to-find" && session.stage === "decide") {
      session = { ...session, stage: "find" };
      save();
      render({ speak: false, focus: ".shop-task h1" });
      window.scrollTo(0, 0);
    } else if (name === "choose") {
      const outcome = decide(session, questionFor(session), Number(data.option));
      if (!outcome.result) return;
      session = outcome.session;
      save();
      saveResult(outcome.result);
      render({ focus: session.modalOpen ? "[data-shop-action='dismiss']" : ".shop-result h1" });
      window.scrollTo(0, 0);
    } else if (name === "dismiss") {
      session = dismissModal(session);
      save();
      render({ speak: false, focus: ".shop-result h1" });
    } else if (name === "next") {
      session = nextScene(session);
      save();
      render({ focus: session.complete ? ".shop-complete h1" : ".shop-task h1" });
      window.scrollTo(0, 0);
    }
  }
  return {
    start,
    render,
    action,
    pageSpeech: () => speechFor(session),
    getSession: () => (session ? structuredClone(session) : null),
  };
}
