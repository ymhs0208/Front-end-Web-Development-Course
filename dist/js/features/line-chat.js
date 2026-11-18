export function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

export function isSafeRefusalMessage(message = "") {
  const normalized = String(message).normalize("NFKC").replace(/[\s　]/gu, "");
  if (!normalized) return false;
  const shortRefusal = /^(?:不了|不用|不用了|不必|不必了|不需要|不方便|謝謝不用|謝謝不必|不了謝謝|拒絕)(?:謝謝|喔|哦)?[。！!～~]*$/u;
  if (shortRefusal.test(normalized)) return true;
  const refusal = /(?:不(?:會|想|願意|能|可以|方便|肯|要)?(?:提供|給|傳|交出|透露|填|輸入|回傳)|(?:不會|不想|不願意|不肯|不要|別)[^，。！？!]{0,12}(?:提供|給|傳|交出|透露|填|輸入|回傳)|不(?:會|想|要|打算)?點(?:擊)?(?:這個)?(?:連結|網址)|拒絕|謝絕)/u;
  const sensitiveRequest = /(?:手機|電話|號碼|簡訊|驗證|資料|個資|密碼|填|輸入|提供|傳|連結|網址|點擊|投票)/u;
  return refusal.test(normalized) && sensitiveRequest.test(normalized);
}

export function getLineContact(sender = "LINE 聯絡人") {
  const [name, ...details] = String(sender)
    .split(/\s*[·｜]\s*/u)
    .map((part) => part.trim())
    .filter(Boolean);
  const contactName = name || "LINE 聯絡人";
  const avatar = Array.from(contactName.replace(/^[「『“'"]+/u, "").trim())[0] || "友";
  return {
    name: contactName,
    detail: details.join(" · ") || "情境對話模擬",
    avatar,
  };
}

function getScenarioSegments(question) {
  const segments = Array.isArray(question.segments) ? question.segments : [];
  const validSegments =
    segments.length > 0 &&
    segments.every(
      (segment) =>
        segment && typeof segment.text === "string" && typeof segment.label === "string",
    ) &&
    segments.map((segment) => segment.text).join("") === String(question.text ?? "");

  return validSegments
    ? segments
    : [{ label: "收到的訊息", text: String(question.text ?? "") }];
}

const avatarQuestionIds = new Set(["line-scam-1", "line-scam-5", "line-scam-9"]);

function renderIncomingMessage(question, text, time, { label = "", showLabel = true } = {}) {
  const showAvatar = avatarQuestionIds.has(question.id);
  const avatar = getLineContact(question.sender).avatar;
  return `<div class="line-chat-incoming line-chat-segment${showAvatar ? " has-message-avatar" : ""}">${showAvatar ? `<span class="line-chat-message-avatar" aria-hidden="true">${escapeHtml(avatar)}</span>` : ""}<div class="line-chat-message-body">${showLabel && label ? `<span class="line-chat-segment-label">${escapeHtml(label)}</span>` : ""}<div class="line-chat-incoming-bubble">${escapeHtml(text)}</div><time>10:${time}</time></div></div>`;
}

function renderSceneCard(question) {
  if (question.interaction === "support-call")
    return `<section class="line-chat-scene-card line-chat-call-scene" aria-label="模擬 LINE 官方客服語音來電"><span class="line-chat-scene-icon" aria-hidden="true">☎</span><div><strong>LINE 語音來電 · 模擬中</strong><p>自稱「LINE 官方客服」的人正在要求你開啟螢幕共享。</p></div></section>`;
  if (question.interaction === "job-offer")
    return `<section class="line-chat-scene-card line-chat-job-scene" aria-label="模擬高薪居家打工廣告"><span class="line-chat-job-icon" aria-hidden="true">職</span><div><strong>居家打字／點讚員</strong><p><b>時薪 NT$500</b> · 上工前要繳 NT$1,000 保證金，或交出存摺與提款卡。</p></div></section><div class="line-chat-link-preview line-job-link-preview"><span aria-hidden="true">↗</span><div><strong>居家工作報到付款</strong><small>job-onboard-pay.example · 本機模擬連結</small></div><button type="button" data-scene-action="open-job-payment" aria-label="開啟模擬報到付款連結">開啟連結</button></div><p class="line-chat-sim-note">模擬連結只會開啟本機教學畫面，不會連到銀行或外部網站。</p>`;
  return "";
}

function renderFakeSite() {
  return `<section class="line-chat-fake-site" aria-labelledby="fake-site-title"><div class="line-chat-fake-address"><span aria-hidden="true">🔒</span><span>pet-vote-gift.example</span><small>模擬網站</small></div><div class="line-chat-fake-content"><span class="line-chat-fake-label">本機模擬，不會連到網路</span><h2 id="fake-site-title">你被騙了！！</h2><p>這個仿冒投票網站會以「幫好友投票」為由，要求你輸入手機號碼和簡訊驗證碼，藉此盜取 LINE 帳號。</p><strong>不要輸入驗證碼，也不要在這裡填任何資料。</strong><button class="primary" type="button" data-scene-action="submit-phishing">我知道了，查看解析</button></div></section>`;
}

function renderJobMenuToggle(stage) {
  const isOpen = stage === "job-menu";
  return `<button class="line-chat-menu-toggle" type="button" data-scene-action="${isOpen ? "close-job-menu" : "open-job-menu"}" aria-label="${isOpen ? "關閉" : "開啟"}聊天室選單" aria-expanded="${isOpen}"${isOpen ? ' aria-controls="job-chat-menu"' : ""}><span aria-hidden="true">${isOpen ? "×" : "☰"}</span><small>選單</small></button>`;
}

export function renderJobBlockResult() {
  return `<section class="line-job-block-result" role="status" aria-label="模擬封鎖完成"><span class="line-job-block-check" aria-hidden="true">✓</span><div><span class="line-job-block-kicker">聊天室選單 → 封鎖</span><h2>已模擬封鎖</h2><p>網路兼職廣告</p><small>只完成本機教學練習，沒有操作真實 LINE，也沒有傳送訊息。</small></div></section>`;
}

function renderJobPaymentCheckout() {
  return `<section class="line-chat-job-stage line-job-checkout" aria-label="仿冒電子支付付款頁，本機安全模擬"><div class="line-job-pay-header"><span aria-hidden="true">‹</span><strong>報到付款</strong><small>安全模擬</small></div><div class="line-job-pay-content"><span class="line-chat-fake-label">仿電子支付介面</span><h2>居家工作報到</h2><p>對方要求正式上工前先繳保證金。這個畫面只供辨識詐騙，不會發起交易。</p><div class="line-job-merchant"><span class="line-job-pay-icon" aria-hidden="true">付</span><span><strong>居家工作報到中心</strong><small>新進人員保證金</small></span></div><div class="line-job-total"><span>本次付款金額</span><strong>NT$1,000</strong></div><div class="line-job-pay-safety">不需要輸入帳號、卡號、密碼或驗證碼</div><button class="line-chat-payment-button" type="button" data-scene-action="simulate-job-payment">模擬付款 NT$1,000</button><button class="secondary line-chat-job-back" type="button" data-scene-action="refuse-job-payment">拒付並退出，回聊天室</button><small class="line-job-local-note">本機教學模擬 · 不連外、不收款、不收集資料</small></div></section>`;
}

function renderJobPaymentWarning() {
  return `<section class="line-chat-job-stage line-job-payment-warning" aria-label="模擬付款安全提醒"><div class="line-job-pay-header"><span aria-hidden="true">‹</span><strong>付款確認</strong><small>安全模擬</small></div><div class="line-chat-fake-content"><span class="line-chat-fake-label">剛才按下的是模擬付款</span><h2>你被騙了！！</h2><p>要求求職者先付保證金，或交出存摺、提款卡，都是重大警訊。交出帳戶工具可能被利用收受詐騙款項。</p><strong>這只是本機教學警示：沒有連到任何支付服務或銀行，也沒有真的扣款。</strong><div class="line-job-warning-tip"><b>安全做法</b><span>拒絕付款，不提供金融資料；退出頁面，再回聊天室選單按「封鎖」。</span></div><button class="primary" type="button" data-scene-action="refuse-job-payment">我知道了，拒付並回聊天室封鎖</button></div></section>`;
}

export function renderJobOfferStage(stage, { showMenuButton = false, notice = "", contact = null } = {}) {
  if (stage === "job-payment") return renderJobPaymentCheckout();
  if (stage === "job-payment-warning") return renderJobPaymentWarning();
  if (!["job-block-ready", "job-menu"].includes(stage)) return "";
  if (stage === "job-block-ready")
    return `<section class="line-job-safe-stage" aria-label="模擬封鎖操作練習">${showMenuButton ? `<header class="line-job-mini-header"><span>網路兼職廣告<small>模擬聊天室</small></span>${renderJobMenuToggle(stage)}</header>` : ""}<div class="line-job-safe-instructions"><span class="line-job-safe-step">第 1 步 · 找到聊天室選單</span><h2>不交錢、不交帳戶</h2><p>接下來，按聊天室右上角的<strong>「☰ 選單」</strong>。</p><div class="line-job-step-path"><strong>1 開啟選單</strong><span aria-hidden="true">→</span><span>2 按封鎖</span></div><small>這是本機教學模擬，不會傳送訊息或封鎖真實帳號。</small></div></section>`;
  const buttons = [
    ["關閉提醒", "job-menu-mute", '<path d="M11 4 6 8H2v8h4l5 4V4Zm5 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>'],
    ["推薦", "job-menu-recommend", '<path d="M7 10v11H3V10h4Zm0 10h11a2 2 0 0 0 2-2l2-7a2 2 0 0 0-2-2h-6l1-5c0-2-3-3-3-1l-5 7"/>'],
    ["邀請", "job-menu-invite", '<path d="M10 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM2 22v-3a8 8 0 0 1 13-6m4-2v10m-5-5h10"/>'],
    ["封鎖", "confirm-job-block", '<circle cx="12" cy="12" r="10"/><path d="m5 19 14-14"/>'],
  ];
  const identity = contact || getLineContact("網路兼職廣告 · 模擬聊天室");
  return `<section class="line-job-menu-overlay" role="dialog" aria-modal="true" aria-label="聊天室選單"><div class="line-job-overlay-status" aria-hidden="true"><span>10:26</span><span>◖　▰　●</span></div><header class="line-job-overlay-header"><span class="line-job-overlay-back" aria-hidden="true">‹</span><span class="line-job-overlay-identity"><strong>${escapeHtml(identity.name)}</strong><small>${escapeHtml(identity.detail)}</small></span></header><div id="job-chat-menu" class="line-job-menu-overlay-actions" role="group" aria-label="聊天室四個操作按鈕">${buttons.map(([label, action, icon]) => `<button class="line-job-menu-action" type="button" data-scene-action="${action}" aria-label="${label}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon}</svg><span>${label}</span></button>`).join("")}</div></section>`;
}

function renderJobConversation(question, session, stage) {
  const segments = getScenarioSegments(question);
  const adText = segments[0]?.text || "在家工作！徵求 LINE 打字員／商品點讚員，時薪 500 元，現領現金。";
  const requestText = segments[1]?.text || "正式上工前需要先繳納保證金，或提供銀行存摺與提款卡以發放薪資。";
  const hasJoined = stage !== "chat";
  const hasReturned = ["job-block-ready", "job-menu", "job-blocked"].includes(stage);
  const linkAction = hasReturned
    ? '<button type="button" disabled>已退出</button>'
    : '<button type="button" data-scene-action="open-job-payment" aria-label="開啟本機模擬報到付款連結">開啟連結</button>';
  const incomingMessage = hasJoined
    ? renderIncomingMessage(question, requestText, "26", { label: "加入 LINE 後，對方提出要求", showLabel: false })
    : renderIncomingMessage(question, adText, "24", { label: "收到高薪徵才廣告", showLabel: false });
  return `<div class="line-chat-conversation line-job-conversation" role="log" aria-label="高薪求職情境模擬聊天流程">
    <div class="line-chat-date">今天　10:24</div>
    <div class="line-chat-scene-card line-chat-job-scene" aria-label="模擬高薪居家工作廣告"><span class="line-chat-job-icon" aria-hidden="true">職</span><div><strong>居家打字／點讚員</strong><p>${escapeHtml(adText)}</p></div></div>
    ${hasJoined ? `<div class="line-chat-outgoing"><div class="line-chat-outgoing-bubble">你好，我想了解居家打字／點讚員工作。</div><time>10:25</time></div>${incomingMessage}<div class="line-chat-link-preview line-job-link-preview"><span aria-hidden="true">↗</span><div><strong>居家工作報到付款</strong><small>job-onboard-pay.example · 本機模擬連結</small></div>${linkAction}</div><p class="line-chat-sim-note">連結只會開啟本機仿電子支付頁，不連到外部網站。</p>` : `${incomingMessage}<div class="line-chat-job-action"><p>按下方按鈕，模擬加入 LINE 聯絡。</p><button class="primary" type="button" data-scene-action="join-job-chat">加入 LINE 聯絡</button><small>本機情境互動，不會開啟或加入真實帳號</small></div>`}
    ${hasReturned ? `<div class="line-chat-outgoing"><div class="line-chat-outgoing-bubble">我拒絕付款，並退出連結。</div><time>10:27</time></div><div class="line-chat-system-note" role="status">${escapeHtml(stage === "job-blocked" ? "已在本機模擬封鎖，沒有操作真實 LINE。" : session.jobMenuNotice || "已拒付並返回聊天室。請開啟右上角「選單」，再按「封鎖」完成練習。")}</div>` : ""}
  </div>`;
}

const callIcon = {
  phone: '<path d="M5.2 3.8 8.6 3l2.1 4.7-2.2 1.6a15 15 0 0 0 6.2 6.2l1.6-2.2 4.7 2.1-.8 3.4a2 2 0 0 1-2.2 1.5C9.3 19.2 4.8 14.7 3.7 6a2 2 0 0 1 1.5-2.2Z"/>',
  end: '<path d="m6 6 12 12M18 6 6 18"/>',
  mute: '<path d="M11 5 6 9H3v6h3l5 4V5Zm4 3 6 8m0-8-6 8"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/>',
  speaker: '<path d="M4 10v4h4l5 4V6l-5 4H4Zm12-1a5 5 0 0 1 0 6m2-9a9 9 0 0 1 0 12"/>',
};

function callControl(action, label, icon, enabled, activeLabel) {
  return `<button class="support-call-control${enabled ? " is-on" : ""}" type="button" data-scene-action="${action}" aria-pressed="${enabled}" aria-label="${label}（${enabled ? "已開啟" : "未開啟"}）"><svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg><span>${enabled ? activeLabel : label}</span></button>`;
}

function renderCallStatusBar() {
  return `<div class="support-call-statusbar" aria-hidden="true"><time>10:24</time><span><i>●●●</i><i>◖</i><i class="support-call-battery"><b></b></i></span></div>`;
}

export function renderSupportCallResult(question, session) {
  const isSafe = session.correct === true;
  const nextLabel = session.index + 1 === session.qs.length ? "看練習結果" : "下一題";
  if (!isSafe)
    return `<section class="support-call-result is-risk wrong-answer-explanation" aria-labelledby="support-call-wrong-title"><h2 id="support-call-wrong-title">為什麼錯</h2><p>${escapeHtml(question.explain)}</p><button class="primary support-call-result-next" type="button" data-next>${nextLabel} <span aria-hidden="true">→</span></button></section>`;
  return `<section class="support-call-result ${isSafe ? "is-safe" : "is-risk"}" role="status" aria-live="polite" aria-label="${isSafe ? "安全做法答對了" : "受騙警示與原因"}"><span class="support-call-result-icon" aria-hidden="true">${isSafe ? "✓" : "!"}</span><span class="support-call-result-kicker">${isSafe ? "安全做法" : "模擬來電結果"}</span><h2>${isSafe ? "答對了，做得好！" : "你被騙了！"}</h2><p>${isSafe ? "拒接可疑來電。LINE 官方客服不會來電要求你開啟螢幕共享。" : "假客服藉帳號異常製造恐慌，再騙你安裝視訊軟體、分享畫面，偷看驗證碼和銀行操作。"}</p><div class="support-call-result-tip"><b>${isSafe ? "記住這個方法" : "安全做法"}</b><span>${isSafe ? "立即掛斷；有疑慮時，請自行查 LINE 官方說明。" : "立即拒接並掛斷；不要分享畫面或提供驗證碼。"}</span></div><small>本機模擬，未接通、未啟用相機／麥克風，也未分享螢幕。</small><button class="primary support-call-result-next" type="button" data-next>${nextLabel} <span aria-hidden="true">→</span></button></section>`;
}

function renderCallAvatar() {
  return `<div class="support-call-avatar" aria-hidden="true"><svg viewBox="0 0 96 96"><circle cx="48" cy="48" r="47" fill="#252a33"/><path d="M20 79c2-17 13-25 28-25s26 8 28 25" fill="#f3d2b7"/><circle cx="48" cy="38" r="20" fill="#f1c6a8"/><path d="M28 38c0-19 9-27 22-27 14 0 22 10 20 27l-7-10c-9 5-21 5-29 0z" fill="#f2d75e"/><path d="M35 37h8m10 0h8" stroke="#342e2a" stroke-width="3" stroke-linecap="round"/><path d="M42 47q6 5 12 0" fill="none" stroke="#694639" stroke-width="2.5" stroke-linecap="round"/><path d="M25 37q-5-23 15-27m31 27q5-23-15-27" fill="none" stroke="#eee" stroke-width="5" stroke-linecap="round"/><rect x="20" y="35" width="10" height="18" rx="5" fill="#eee"/><rect x="66" y="35" width="10" height="18" rx="5" fill="#eee"/></svg></div>`;
}

function renderCallWave() {
  return `<div class="support-call-wave" aria-label="模擬通話音波" role="img">${[6, 12, 19, 11, 25, 16, 31, 12, 22, 9, 17, 7].map((height, index) => `<i style="--wave-height:${height}px;--wave-delay:${index * 70}ms"></i>`).join("")}</div>`;
}

export function renderSupportCallStage(stage, question = null, session = {}) {
  if (!question) return "";
  const segments = getScenarioSegments(question);
  const hideSegmentLabels = avatarQuestionIds.has(question.id);
  const localNote = `<p class="support-call-local-note">本機模擬：不會接通真實電話，也不會啟用相機、麥克風或分享畫面。</p>`;

  if (stage === "call-incoming") {
    return `<section class="support-call-screen is-incoming" role="dialog" aria-modal="true" aria-label="模擬視訊來電" tabindex="-1">${renderCallStatusBar()}<div class="support-call-topline"><span class="support-call-sim-tag"><i aria-hidden="true"></i>本機防詐演練</span><span>第 ${(session.index ?? 0) + 1} / ${session.qs?.length ?? 1} 題</span></div><main class="support-call-main">${renderCallAvatar()}<h1>自稱 LINE 官方客服</h1><p class="support-call-caller-detail">陌生來電 · 尚未確認身分</p><p class="support-call-connection-status">模擬視訊來電中</p><p class="support-call-incoming-prompt">要接通這通視訊通話嗎？</p><p class="support-call-local-note">本機模擬：不會接通真實電話，也不會啟用相機、麥克風或分享畫面。</p></main><div class="support-call-incoming-actions" role="group" aria-label="選擇如何處理模擬視訊來電"><button class="support-call-incoming-action is-decline" type="button" data-scene-action="decline-call"><span><svg viewBox="0 0 24 24" aria-hidden="true">${callIcon.phone}</svg></span><strong>拒接</strong></button><button class="support-call-incoming-action is-answer" type="button" data-scene-action="answer-call"><span><svg viewBox="0 0 24 24" aria-hidden="true">${callIcon.phone}</svg></span><strong>通話</strong></button></div><div class="support-call-footer"><i class="support-call-home-indicator" aria-hidden="true"></i></div></section>`;
  }

  if (["call-active", "call-followup"].includes(stage)) {
    const callStart = Number.isFinite(session.callStartedAt) ? session.callStartedAt : Date.now();
    const controls = session.callControls || {};
    return `<section class="support-call-screen is-active" role="dialog" aria-modal="true" aria-label="正在進行的模擬 LINE 客服通話">${renderCallStatusBar()}<div class="support-call-topline"><span class="support-call-sim-tag"><i aria-hidden="true"></i>本機模擬通話</span><span class="support-call-line-mark" aria-label="LINE 模擬介面">LINE</span></div><main class="support-call-main support-call-active-main">${renderCallAvatar()}<h1>自稱 LINE 官方客服</h1><p class="support-call-caller-detail">陌生來電 · 身分尚未驗證</p><time class="support-call-clock" data-call-clock data-call-start="${callStart}">00:00</time>${renderCallWave()}</main><div class="support-call-active-controls" role="group" aria-label="通話控制，僅供本機模擬">${callControl("toggle-mute", "關閉麥克風", callIcon.mute, controls.mute === true, "麥克風已關閉")}${callControl("toggle-video", "開始視訊", callIcon.video, controls.video === true, "視訊模擬開啟")}${callControl("toggle-speaker", "開啟揚聲器", callIcon.speaker, controls.speaker === true, "揚聲器已開啟")}</div><div class="support-call-active-footer"><button class="support-call-hangup support-call-hangup-fullscreen" type="button" data-scene-action="hangup-call" aria-label="結束通話並返回聊天室"><svg viewBox="0 0 24 24" aria-hidden="true">${callIcon.end}</svg><span>結束通話</span></button>${localNote}<button class="support-call-read" type="button" data-read data-idle-label="唸出來電內容與操作">唸來電提示</button><i class="support-call-home-indicator" aria-hidden="true"></i></div></section>`;
  }

  if (stage === "call-ended")
    return `<div class="support-call-ended" role="status"><span aria-hidden="true">✓</span><div><strong>模擬通話已結束，已返回聊天室</strong><small>以下訊息和操作仍是本機情境練習。</small></div></div>${renderIncomingMessage(question, segments[0]?.text || question.text, "24", { label: segments[0]?.label || "來電內容", showLabel: !hideSegmentLabels })}<button class="support-call-next-line" type="button" data-scene-action="continue-support-call">查看對方接著提出的要求 <span aria-hidden="true">›</span></button>`;

  if (["call-declined", "call-followup-declined", "call-followup-missed"].includes(stage)) {
    const followup = stage !== "call-declined";
    return `<div class="support-call-missed-call" role="status"><span aria-hidden="true">↙</span><div><strong>${stage === "call-followup-declined" ? "你已結束模擬通話並返回聊天室" : "你已不接通這通模擬來電"}</strong><small>以下訊息和操作都是本機模擬，不會接通或撥打真實電話。</small></div></div>${renderIncomingMessage(question, segments[followup ? 1 : 0]?.text || question.text, followup ? "25" : "24", { label: followup ? "客服留下的訊息 · 接著提出要求" : "客服留下訊息", showLabel: !hideSegmentLabels })}${followup ? `<div class="support-call-choices" role="group" aria-label="選擇如何處理可疑來電"><p>對方要求開啟螢幕共享，你會怎麼做？</p><button class="support-call-choice is-risk" type="button" data-scene-action="start-screen-share"><b>1</b><span>照對方指示，模擬開啟螢幕共享</span></button><button class="support-call-choice is-safe" type="button" data-answer="1"><b>2</b><span>不接通／拒絕共享畫面</span></button><button class="support-call-choice" type="button" data-answer="2"><b>3</b><span>先看員工證照片，再開啟螢幕共享</span></button></div>` : `<button class="support-call-next-line" type="button" data-scene-action="continue-support-call">查看對方接著留下的訊息 <span aria-hidden="true">›</span></button>`}`;
  }

  if (stage === "screen-share")
    return `<section class="support-call-warning-card" aria-label="螢幕共享詐騙警示"><span class="support-call-warning-icon" aria-hidden="true">!</span><span class="support-call-warning-kicker">模擬螢幕共享 · 沒有真的分享</span><h2>你被騙了！！</h2><p>假客服可能趁螢幕共享時看見簡訊驗證碼、密碼和金融操作。</p><strong>這只是情境演練：沒有連線，也沒有分享你的手機畫面。</strong><button class="support-call-warning-stop" type="button" data-scene-action="stop-screen-share">停止模擬共享，查看作答結果</button><button class="support-call-warning-hangup" type="button" data-scene-action="confirm-hangup">安全掛斷，查看正確做法</button></section>`;

  if (stage === "hangup")
    return `<section class="support-call-warning-card" aria-label="已安全掛斷模擬來電"><span class="support-call-warning-icon is-safe" aria-hidden="true">✓</span><h2>已安全掛斷</h2><p>不要依照陌生來電者指示安裝軟體或分享手機畫面。</p><button class="support-call-warning-hangup" type="button" data-scene-action="confirm-hangup">查看答題結果</button></section>`;
  return "";
}

function renderSupportCallChat(stage, question, session) {
  const contact = getLineContact(question.sender);
  const segments = getScenarioSegments(question);
  const isCallOverlay = ["call-incoming", "call-active", "call-followup"].includes(stage);
  const chatStage = ["call-incoming", "call-active"].includes(stage) ? "call-ended" : stage === "call-followup" ? "call-followup-declined" : stage;
  const combinedMessage = segments.map((segment) => segment.text).join("");
  const chatContent = stage === "chat" || stage === "call-incoming"
    ? renderIncomingMessage(question, combinedMessage, "24", { label: "客服留下訊息", showLabel: false })
    : renderSupportCallStage(chatStage, question, session);
  const callOverlay = isCallOverlay ? renderSupportCallStage(stage, question, session) : "";
  return `<div class="quiz-content line-question-layout line-chat-question"><section class="line-scenario-card" aria-label="模擬情境：${escapeHtml(question.title)}"><div class="line-scenario-topline"><span class="line-scenario-kicker">模擬情境</span><span class="line-scenario-count">${(session.index ?? 0) + 1} / ${session.qs?.length ?? 1}</span></div><h1>${escapeHtml(question.title)}</h1><div class="line-chat-device"><div class="line-chat-statusbar" aria-hidden="true"><time>10:24</time><span class="line-chat-status-icons"><span>●●●</span><span>◖</span><span class="line-chat-battery"><i></i></span></span></div><header class="line-chat-app-header"><span class="line-chat-back" aria-hidden="true">‹</span><span class="line-sim-avatar" aria-hidden="true">${escapeHtml(contact.avatar)}</span><span class="line-sim-contact"><strong>模擬聊天室</strong><small>自稱 LINE 官方客服 · 本機情境</small></span><span class="line-chat-header-actions" aria-hidden="true">☎</span></header><div class="line-chat-conversation support-call-conversation" role="log" aria-label="模擬聊天室中的單則訊息與後續互動"><div class="line-chat-date">今天　10:24</div>${chatContent}</div>${!session.answered && stage !== "chat" ? `<button class="secondary line-chat-read" type="button" data-read data-idle-label="唸出來電內容與操作">唸出來電內容與操作</button>` : ""}</section>${callOverlay}</div>`;
}

function renderChoices(question) {
  return question.options
    .map((option, index) => {
      const sceneAction =
        question.interaction === "vote-link" && index === 0
          ? ' data-scene-action="open-fake-site"'
          : question.interaction === "vote-link" && index === 1
            ? ' data-scene-action="prepare-safe-reply"'
            : question.interaction === "support-call" && index === 0
              ? ' data-scene-action="start-screen-share"'
              : question.interaction === "support-call" && index === 1
              ? ' data-scene-action="start-hangup"'
              : question.interaction === "job-offer" && index === 0
                ? ' data-scene-action="open-job-payment"'
                : question.interaction === "job-offer" && index === 1
                  ? ' data-scene-action="prepare-job-block"'
            : ` data-answer="${index}"`;
      const actionLabel =
        question.interaction === "vote-link" && index === 0
          ? "開啟模擬投票網址"
          : question.interaction === "vote-link" && index === 1
            ? "預填安全回覆"
            : question.interaction === "support-call" && index === 0
              ? "開啟模擬螢幕共享"
              : question.interaction === "support-call" && index === 1
              ? "前往模擬掛斷流程"
              : question.interaction === "job-offer" && index === 0
                ? "開啟模擬付款連結"
                : question.interaction === "job-offer" && index === 1
                  ? "前往聊天室選單封鎖練習"
            : "選擇這個做法";
      const actionText =
        question.interaction === "vote-link" && index === 1
          ? "準備回覆　›"
          : question.interaction === "support-call" && index === 0
            ? "開啟模擬畫面　›"
            : question.interaction === "support-call" && index === 1
              ? "掛斷來電　›"
              : question.interaction === "job-offer" && index === 0
                ? "查看模擬付款頁　›"
                : question.interaction === "job-offer" && index === 1
                  ? "練習選單封鎖　›"
            : "選這個做法　›";
      return `<button class="line-chat-reply" type="button"${sceneAction} aria-label="${actionLabel}：${escapeHtml(option)}"><span class="line-chat-reply-number" aria-hidden="true">${index + 1}</span><span class="line-chat-reply-text">${escapeHtml(option)}</span><span class="line-chat-reply-action" aria-hidden="true">${actionText}</span></button>`;
    })
    .join("");
}

function renderComposer(interactionStage, chatState = {}) {
  if (chatState.enabled) {
    const isPending = chatState.pending === true;
    return `<form class="line-chat-composer line-chat-composer-editable" data-chat-compose-form aria-label="傳送聊天室訊息"><span class="line-chat-composer-icon" aria-hidden="true">＋</span><input class="line-chat-text-input" type="text" data-chat-input aria-label="輸入訊息" placeholder="輸入訊息" autocomplete="off" maxlength="500" value="${escapeHtml(chatState.draft || "")}"${isPending ? " disabled" : ""}><button class="line-chat-send" type="submit"${isPending ? " disabled" : ""}>傳送</button></form>`;
  }
  if (interactionStage === "compose")
    return `<div class="line-chat-composer line-chat-composer-ready" aria-label="訊息已預填，請按傳送"><span class="line-chat-composer-icon" aria-hidden="true">＋</span><span class="line-chat-composer-input" role="textbox" aria-readonly="true">不了謝謝</span><button class="line-chat-send" type="button" data-scene-action="send-safe-reply">傳送</button></div>`;
  return `<div class="line-chat-composer" aria-label="訊息輸入列，請選擇上方回覆"><span class="line-chat-composer-icon" aria-hidden="true">＋</span><span class="line-chat-composer-input">輸入訊息</span><span class="line-chat-composer-icon" aria-hidden="true">☺</span><span class="line-chat-composer-icon line-chat-mic" aria-hidden="true">●</span></div>`;
}

export function renderLineChatQuestion(question, session, chatState = {}) {
  if (question.interaction === "support-call") {
    const stage = session.interactionStage || "chat";
    return renderSupportCallChat(stage, question, session);
  }
  const contact = getLineContact(question.sender);
  const step = session.index + 1;
  const total = session.qs.length;
  const segments = getScenarioSegments(question);
  const interactionStage = session.interactionStage || "chat";
  if (question.interaction === "job-offer" && interactionStage === "job-menu")
    return renderJobOfferStage("job-menu", { contact });
  const blockSuccess = question.interaction === "job-offer" && session.answered && session.correct && interactionStage === "job-blocked"
    ? `<div class="line-job-inline-success" role="status"><strong>✓ 答對了</strong><span>已在模擬選單按下「封鎖」</span></div>`
    : "";
  const messages = segments
    .map(
      (segment, index) => renderIncomingMessage(question, segment.text, String(24 + index).padStart(2, "0"), { label: `第 ${index + 1} 段｜${segment.label}`, showLabel: !avatarQuestionIds.has(question.id) }),
    )
    .join("");
  const transcript = question.interaction === "vote-link"
    ? (chatState.messages || []).map((message, index) => message.direction === "outgoing"
      ? `<div class="line-chat-outgoing"><div class="line-chat-outgoing-bubble">${escapeHtml(message.text)}</div><time>10:${String(26 + index).padStart(2, "0")}</time></div>`
      : renderIncomingMessage(question, message.text, String(26 + index).padStart(2, "0"), { showLabel: false })).join("")
    : "";
  const voteLink =
    question.interaction === "vote-link"
      ? `<div class="line-chat-link-preview"><span aria-hidden="true">↗</span><div><strong>寵物比賽投票頁</strong><small>pet-vote-gift.example · 模擬網址</small></div><button type="button" data-scene-action="open-fake-site" aria-label="開啟模擬投票網址 pet-vote-gift.example"${chatState.pending ? " disabled" : ""}>開啟網址</button></div>`
      : "";
  const stageView =
    question.interaction === "vote-link" && interactionStage === "fake-site"
      ? renderFakeSite()
      : question.interaction === "support-call"
        ? renderSupportCallStage(interactionStage, question)
        : question.interaction === "job-offer"
          ? ["job-payment", "job-payment-warning"].includes(interactionStage)
            ? renderJobOfferStage(interactionStage, { notice: session.jobMenuNotice })
            : ""
        : "";
  const jobConversation = question.interaction === "job-offer"
    ? renderJobConversation(question, session, interactionStage)
    : "";
  const choices = question.interaction === "vote-link"
    ? ""
    : interactionStage === "compose"
      ? `<div class="line-chat-reply-divider"><span>訊息已填好</span><small>檢查後按「傳送」送出</small></div>`
      : session.answered ? "" : `<div class="line-chat-reply-divider"><span>${question.interaction === "support-call" ? "你會怎麼處理這通來電？" : question.interaction === "job-offer" ? "你會怎麼回應這則求職訊息？" : "你會怎麼回覆？"}</span><small>選擇下一步，看看情境會怎麼發展</small></div><div class="line-chat-replies">${renderChoices(question)}</div>`;
  const conversation =
    stageView || jobConversation ||
    `<div class="line-chat-conversation" role="log" aria-live="polite" aria-label="${escapeHtml(contact.name)} 傳來的模擬訊息，共 ${segments.length} 段"><div class="line-chat-date">今天　10:24</div>${renderSceneCard(question)}${messages}${voteLink}${transcript}${choices}</div>`;

  const headerActions = question.interaction === "job-offer" && ["job-block-ready", "job-menu"].includes(interactionStage)
    ? renderJobMenuToggle(interactionStage)
    : '<span class="line-chat-header-actions" aria-hidden="true"><span>⌕</span><span>☰</span></span>';
  const composer = !stageView && !session.answered
    ? renderComposer(interactionStage, {
      enabled: question.interaction === "vote-link",
      draft: chatState.draft,
      pending: chatState.pending,
    })
    : "";
  const readLabel = question.interaction === "vote-link"
    ? "唸出聊天訊息給我聽"
    : question.interaction === "job-offer"
    ? "唸出聊天情境和操作提示"
    : "唸出訊息和回覆選項給我聽";
  return `<div class="quiz-content line-question-layout line-chat-question"><section class="line-scenario-card" aria-label="模擬情境：${escapeHtml(question.title)}"><div class="line-scenario-topline"><span class="line-scenario-kicker">模擬情境</span><span class="line-scenario-count">${step} / ${total}</span></div><h1>${escapeHtml(question.title)}</h1>${blockSuccess}<div class="line-chat-device"><div class="line-chat-statusbar" aria-hidden="true"><time>10:24</time><span class="line-chat-status-icons"><span>●●●</span><span>◖</span><span class="line-chat-battery"><i></i></span></span></div><header class="line-chat-app-header"><span class="line-chat-back" aria-hidden="true">‹</span><span class="line-sim-avatar" aria-hidden="true">${escapeHtml(contact.avatar)}</span><span class="line-sim-contact"><strong>${escapeHtml(contact.name)}</strong><small>${escapeHtml(contact.detail)} · 模擬情境</small></span>${headerActions}</header>${conversation}${composer}</div>${session.answered ? "" : `<button class="secondary line-chat-read" type="button" data-read data-idle-label="${readLabel}">${readLabel}</button>`}</section></div>`;
}
