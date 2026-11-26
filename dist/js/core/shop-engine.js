import { STARTING_MONEY, applyWrongAnswerPenalty } from "./money.js?v=job-9-4";
import { flagIds, shopScenes } from "../data/shop-scenarios.js?v=shop-7";

// Pure state transitions for the fake-shop module: no DOM or storage access.
// Stages: "find" (spot suspicious details) → "decide" (choose an action) → "result".

export function createShopSession(ids) {
  const valid = ids.filter((id) => shopScenes[id]);
  if (!valid.length) return null;
  return {
    ids: valid,
    index: 0,
    stage: "find",
    found: [],
    safeTaps: [],
    lastSpot: null,
    hintSpot: null,
    hintsUsed: 0,
    choice: null,
    correct: null,
    money: STARTING_MONEY,
    lastMoneyLoss: 0,
    modalOpen: false,
    complete: false,
    results: [],
  };
}

export function currentScene(session) {
  return shopScenes[session?.ids?.[session.index]] || null;
}

export function tapSpot(session, spotId) {
  const scene = currentScene(session);
  const spot = scene?.spots[spotId];
  if (!spot || session.stage !== "find") return session;
  const next = { ...session, lastSpot: spotId };
  if (next.hintSpot === spotId) next.hintSpot = null;
  if (spot.flag && !next.found.includes(spotId)) next.found = [...next.found, spotId];
  if (!spot.flag && !next.safeTaps.includes(spotId))
    next.safeTaps = [...next.safeTaps, spotId];
  return next;
}

export function allFlagsFound(session) {
  const flags = flagIds(currentScene(session));
  return flags.length > 0 && flags.every((id) => session.found.includes(id));
}

// Points at the next unfound flag in on-screen order.
export function useHint(session) {
  const scene = currentScene(session);
  if (!scene || session.stage !== "find") return session;
  const target = scene.parts
    .map((part) => part.spot)
    .find((id) => id && scene.spots[id]?.flag && !session.found.includes(id));
  if (!target) return session;
  return {
    ...session,
    hintSpot: target,
    lastSpot: null,
    hintsUsed: session.hintsUsed + 1,
  };
}

export function goDecide(session) {
  if (session.stage !== "find") return session;
  return { ...session, stage: "decide", lastSpot: null, hintSpot: null };
}

export function decide(session, question, optionIndex) {
  if (
    session.stage !== "decide" ||
    !question ||
    question.id !== session.ids[session.index] ||
    !Number.isInteger(optionIndex) ||
    optionIndex < 0 ||
    optionIndex >= question.options.length
  )
    return { session, result: null };
  const correct = optionIndex === question.answer;
  const debit = correct ? null : applyWrongAnswerPenalty(session.money);
  const flags = flagIds(currentScene(session));
  const result = {
    questionId: question.id,
    correct,
    optionIndex,
    foundFlags: flags.filter((id) => session.found.includes(id)),
    missedFlags: flags.filter((id) => !session.found.includes(id)),
    safeTaps: [...session.safeTaps],
    hintsUsed: session.hintsUsed,
    completedAt: Date.now(),
  };
  return {
    session: {
      ...session,
      stage: "result",
      choice: optionIndex,
      correct,
      money: debit ? debit.money : session.money,
      lastMoneyLoss: debit ? debit.loss : 0,
      modalOpen: !correct,
      results: [...session.results, result],
    },
    result,
  };
}

export function dismissModal(session) {
  return { ...session, modalOpen: false };
}

export function nextScene(session) {
  if (session.stage !== "result" || session.modalOpen) return session;
  if (session.index + 1 >= session.ids.length) return { ...session, complete: true };
  return {
    ...session,
    index: session.index + 1,
    stage: "find",
    found: [],
    safeTaps: [],
    lastSpot: null,
    hintSpot: null,
    hintsUsed: 0,
    choice: null,
    correct: null,
    lastMoneyLoss: 0,
  };
}

// Restore a session saved in sessionStorage; anything inconsistent starts over.
export function validateShopSession(raw, questions) {
  if (!raw || !Array.isArray(raw.ids) || !raw.ids.length) return null;
  if (!raw.ids.every((id) => shopScenes[id] && questions.some((q) => q.id === id)))
    return null;
  if (!Number.isInteger(raw.index) || raw.index < 0 || raw.index >= raw.ids.length)
    return null;
  if (!["find", "decide", "result"].includes(raw.stage)) return null;
  if (!Number.isInteger(raw.money) || raw.money < 0 || raw.money > STARTING_MONEY)
    return null;
  const scene = shopScenes[raw.ids[raw.index]];
  const list = (value, allowed) =>
    Array.isArray(value) && value.every((id) => allowed(id)) ? [...new Set(value)] : null;
  const found = list(raw.found, (id) => scene.spots[id]?.flag === true);
  const safeTaps = list(raw.safeTaps, (id) => scene.spots[id]?.flag === false);
  if (!found || !safeTaps || !Array.isArray(raw.results)) return null;
  const question = questions.find((q) => q.id === raw.ids[raw.index]);
  const hasChoice =
    Number.isInteger(raw.choice) && raw.choice >= 0 && raw.choice < question.options.length;
  if (raw.stage === "result" && !hasChoice) return null;
  return {
    ids: [...raw.ids],
    index: raw.index,
    stage: raw.stage,
    found,
    safeTaps,
    lastSpot: scene.spots[raw.lastSpot] ? raw.lastSpot : null,
    hintSpot: scene.spots[raw.hintSpot]?.flag ? raw.hintSpot : null,
    hintsUsed: Number.isInteger(raw.hintsUsed) && raw.hintsUsed >= 0 ? raw.hintsUsed : 0,
    choice: raw.stage === "result" ? raw.choice : null,
    correct: raw.stage === "result" ? raw.choice === question.answer : null,
    money: raw.money,
    lastMoneyLoss:
      raw.stage === "result" && Number.isInteger(raw.lastMoneyLoss) ? raw.lastMoneyLoss : 0,
    modalOpen: raw.stage === "result" && raw.modalOpen === true,
    complete: raw.complete === true && raw.stage === "result",
    results: structuredClone(raw.results),
  };
}
