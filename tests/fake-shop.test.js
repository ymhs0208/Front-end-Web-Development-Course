import test from "node:test";
import assert from "node:assert/strict";
import { activeShopQuestionIds, bank, types } from "../dist/js/data/questions.js";
import { compactOptions } from "../dist/js/data/compact-options.js";
import { flagIds, shopScenes } from "../dist/js/data/shop-scenarios.js";
import { selectQuestions } from "../dist/js/core/engine.js";
import {
  allFlagsFound,
  createShopSession,
  decide,
  dismissModal,
  goDecide,
  nextScene,
  tapSpot,
  useHint,
  validateShopSession,
} from "../dist/js/core/shop-engine.js";
import { getRewards } from "../dist/js/core/rewards.js";

const questionOf = (id) => bank.find((question) => question.id === id);

function installBrowserStubs() {
  const names = ["sessionStorage", "localStorage", "location", "document", "window", "CustomEvent"];
  const saved = Object.fromEntries(names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const sessionValues = new Map();
  const localValues = new Map();
  const events = [];
  const shopBody = { innerHTML: "" };
  const define = (name, value) => Object.defineProperty(globalThis, name, { configurable: true, value });
  define("sessionStorage", {
    getItem: (key) => sessionValues.get(key) ?? null,
    setItem: (key, value) => sessionValues.set(key, String(value)),
    removeItem: (key) => sessionValues.delete(key),
  });
  define("localStorage", {
    getItem: (key) => localValues.get(key) ?? null,
    setItem: (key, value) => localValues.set(key, String(value)),
  });
  define("location", { hash: "#shop" });
  define("document", {
    title: "",
    body: { classList: { toggle() {}, remove() {} } },
    querySelectorAll: () => [],
    querySelector: (selector) => (selector === "#shopBody" ? shopBody : null),
  });
  define("CustomEvent", class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  });
  define("window", {
    addEventListener() {},
    dispatchEvent: (event) => events.push(event),
    scrollTo() {},
    setTimeout: () => 1,
    clearTimeout() {},
  });
  return {
    shopBody,
    events,
    localValues,
    sessionValues,
    restore() {
      for (const name of names) {
        if (saved[name]) Object.defineProperty(globalThis, name, saved[name]);
        else delete globalThis[name];
      }
    },
  };
}

test("shop text stays short enough for older readers at large sizes", () => {
  for (const id of activeShopQuestionIds) {
    const question = questionOf(id);
    for (const option of question.options) assert.ok(option.length <= 14, `${id} option too long: ${option}`);
    assert.ok(question.explain.length <= 60, `${id} explanation too long`);
    for (const spot of Object.values(shopScenes[id].spots)) {
      assert.ok(spot.label.length <= 8, `${id} label too long: ${spot.label}`);
      assert.ok(spot.tip.length <= 16, `${id} tip too long: ${spot.tip}`);
    }
    for (const part of shopScenes[id].parts) assert.ok(part.text?.length <= 26, `${id} part too long: ${part.text}`);
  }
});

test("every shop question has a matching fictional scene, compact labels and clickable spots", () => {
  assert.ok(types.shop);
  assert.equal(activeShopQuestionIds.length, 3);
  for (const id of activeShopQuestionIds) {
    const question = questionOf(id);
    const scene = shopScenes[id];
    assert.equal(question?.type, "shop", id);
    assert.equal(question.options.length, 3);
    assert.ok(Number.isInteger(question.answer) && question.answer < question.options.length);
    assert.equal(compactOptions[id].length, question.options.length);
    assert.ok(scene, `${id} needs a scene`);
    const used = scene.parts.map((part) => part.spot).filter(Boolean);
    assert.deepEqual([...used].sort(), Object.keys(scene.spots).sort(), `${id}: each spot is shown exactly once`);
    assert.equal(new Set(used).size, used.length);
    assert.ok(flagIds(scene).length >= 3, `${id}: at least 3 suspicious spots`);
    assert.ok(Object.values(scene.spots).some((spot) => !spot.flag), `${id}: at least one non-suspicious spot`);
    for (const spot of Object.values(scene.spots)) assert.ok(spot.label && spot.tip);
  }
});

test("shop scenes use only invented brands and unreachable practice domains", () => {
  const text = JSON.stringify([shopScenes, activeShopQuestionIds.map(questionOf)]);
  assert.doesNotMatch(text, /蝦皮|shopee|momo|露天|pchome|yahoo/i);
  for (const id of activeShopQuestionIds) assert.ok(["mama", "haipi"].includes(shopScenes[id].platform));
  const domains = text.match(/[a-z0-9-]+\.[a-z]{2,}\b/gi) || [];
  assert.ok(domains.length >= 3);
  for (const domain of domains) assert.match(domain, /^[a-z0-9-]+\.example$/i, domain);
});

test("shop questions stay out of LINE, random and review practice", () => {
  for (const mode of ["line", "random", "all", "review"]) {
    const ids = selectQuestions(bank, [], mode).map((question) => question.id);
    assert.ok(ids.every((id) => !id.startsWith("shop-")), mode);
  }
});

test("tapping, hints, decisions and the wallet follow the find → decide → result flow", () => {
  let session = createShopSession(activeShopQuestionIds);
  const scene = shopScenes["shop-scam-1"];
  const flags = flagIds(scene);
  session = tapSpot(session, "promo");
  assert.deepEqual(session.safeTaps, ["promo"]);
  assert.deepEqual(session.found, []);
  session = tapSpot(session, "url");
  session = tapSpot(session, "url");
  assert.deepEqual(session.found, ["url"]);
  session = tapSpot(session, "not-a-spot");
  assert.equal(session.lastSpot, "url");
  session = useHint(session);
  assert.equal(session.hintSpot, "price", "hint points at the next unfound spot in screen order");
  assert.equal(session.hintsUsed, 1);
  assert.equal(decide(session, questionOf("shop-scam-1"), 1).result, null, "cannot answer before deciding");
  for (const id of flags) session = tapSpot(session, id);
  assert.ok(allFlagsFound(session));
  session = goDecide(session);
  assert.equal(tapSpot(session, "price"), session, "spots are locked after moving on");

  const wrong = decide(session, questionOf("shop-scam-1"), 0);
  assert.equal(wrong.result.correct, false);
  assert.equal(wrong.session.money, 300);
  assert.equal(wrong.session.lastMoneyLoss, 100);
  assert.ok(wrong.session.modalOpen);
  assert.deepEqual(wrong.result.missedFlags, []);
  assert.equal(nextScene(wrong.session), wrong.session, "must dismiss the wallet notice first");

  session = nextScene(dismissModal(wrong.session));
  assert.equal(session.index, 1);
  assert.equal(session.stage, "find");
  assert.equal(session.money, 300);
  session = goDecide(tapSpot(session, "offplatform"));
  const right = decide(session, questionOf("shop-scam-2"), 0);
  assert.equal(right.session.money, 300);
  assert.equal(right.session.modalOpen, false);
  assert.deepEqual(right.result.foundFlags, ["offplatform"]);
  assert.deepEqual(right.result.missedFlags, ["seller", "account"]);

  session = nextScene(right.session);
  session = decide(goDecide(session), questionOf("shop-scam-3"), 1).session;
  session = nextScene(session);
  assert.equal(session.complete, true);
  assert.equal(session.results.length, 3);
});

test("saved sessions are restored only when consistent", () => {
  const session = goDecide(tapSpot(createShopSession(activeShopQuestionIds), "url"));
  const restored = validateShopSession(JSON.parse(JSON.stringify(session)), bank);
  assert.equal(restored.stage, "decide");
  assert.deepEqual(restored.found, ["url"]);
  assert.equal(validateShopSession({ ...session, money: 999 }, bank), null);
  assert.equal(validateShopSession({ ...session, found: ["promo"] }, bank), null, "safe spot cannot count as found");
  assert.equal(validateShopSession({ ...session, ids: ["line-scam-1"] }, bank), null);
  assert.equal(validateShopSession({ ...session, stage: "result", choice: null }, bank), null);
});

test("shop results are validated, saved locally, announced and earn stars", async () => {
  const stubs = installBrowserStubs();
  try {
    const store = await import("../dist/js/core/store.js");
    store.loadState();
    const before = getRewards(store.getState().attempts, bank).stars;
    const payload = {
      questionId: "shop-scam-2",
      correct: false,
      optionIndex: 0,
      foundFlags: ["offplatform", "seller"],
      safeTaps: ["notice"],
      hintsUsed: 2,
      completedAt: 1,
    };
    const saved = store.recordShopResult(payload);
    assert.deepEqual(saved.foundFlags, ["seller", "offplatform"]);
    assert.deepEqual(saved.missedFlags, ["account"]);
    assert.equal(stubs.events.at(-1).type, "vault:shop-result-saved");
    assert.equal(JSON.parse(stubs.localValues.get("vault-shop-results-v1")).length, 1);
    assert.throws(() => store.recordShopResult({ ...payload, correct: true }));
    assert.throws(() => store.recordShopResult({ ...payload, foundFlags: ["notice"] }));
    assert.throws(() => store.recordShopResult({ ...payload, questionId: "line-scam-1" }));
    store.recordResult({ questionId: "shop-scam-2", correct: false });
    assert.equal(getRewards(store.getState().attempts, bank).stars, before + 1);
    store.loadState();
    assert.equal(store.getShopResults().length, 1, "results survive a reload");
  } finally {
    stubs.restore();
  }
});

test("the controller renders the fake site, records the answer and shows the wallet notice", async () => {
  const stubs = installBrowserStubs();
  try {
    // Same specifier the browser modules use, so the test shares their store instance.
    const store = await import("../dist/js/core/store.js?v=shop-7");
    store.loadState();
    const shopBefore = store.getShopResults().length;
    const { createShopController } = await import("../dist/js/features/fake-shop.js");
    const shop = createShopController();
    shop.start();
    assert.match(stubs.shopBody.innerHTML, /練習用・假網站/);
    assert.match(stubs.shopBody.innerHTML, /data-spot="url"/);
    assert.match(stubs.shopBody.innerHTML, /找到 0 \/ 5/);
    assert.doesNotMatch(stubs.shopBody.innerHTML, /<input|<form/, "no real input fields on fake pages");
    shop.action("tap", { spot: "price" });
    assert.match(stubs.shopBody.innerHTML, /shop-tip-pop/, "tapping opens the floating explanation");
    assert.match(stubs.shopBody.innerHTML, /⚠ 可疑：價格太便宜/);
    assert.match(stubs.shopBody.innerHTML, /還有 4 個可疑處/);
    shop.action("close-tip");
    assert.doesNotMatch(stubs.shopBody.innerHTML, /shop-tip-pop/);
    assert.match(stubs.shopBody.innerHTML, /找到 1 \/ 5/);
    shop.action("decide");
    assert.match(stubs.shopBody.innerHTML, /你會怎麼做？/);
    shop.action("choose", { option: "0" });
    assert.match(stubs.shopBody.innerHTML, /data-wrong-answer-modal/);
    assert.match(stubs.shopBody.innerHTML, /為什麼不行/, "the pop-up explains the mistake");
    assert.match(stubs.shopBody.innerHTML, /錢包提醒/);
    assert.match(stubs.shopBody.innerHTML, /assets\/free-money-meme\.jpg/);
    assert.match(stubs.shopBody.innerHTML, /這是假網站，錢轉過去就拿不回來。/);
    assert.match(stubs.shopBody.innerHTML, /NT\$300/);
    assert.equal(store.getShopResults().length, shopBefore + 1);
    shop.action("next");
    assert.equal(shop.getSession().index, 0, "next waits for the wallet notice");
    shop.action("dismiss");
    assert.match(stubs.shopBody.innerHTML, /網址是假的（漏掉）/);
    assert.match(stubs.shopBody.innerHTML, /每個選項解析/, "result lists every option");
    assert.equal((stubs.shopBody.innerHTML.match(/class="shop-option-review /g) || []).length, 3);
    assert.match(stubs.shopBody.innerHTML, /LINE 上的「客服」是騙子本人/, "reason for an option the learner did not pick");
    shop.action("next");
    assert.equal(shop.getSession().index, 1);
    assert.ok(stubs.sessionValues.has("vault-shop-session-v1"));
  } finally {
    stubs.restore();
  }
});

test("suspicious spots are spread across the page and answers vary in position", () => {
  const below = new Set(["section", "chat", "system", "form"]);
  for (const id of activeShopQuestionIds) {
    const scene = shopScenes[id];
    const tappable = scene.parts.filter((part) => part.spot).length;
    assert.ok(tappable >= 8, `${id}: at least 8 tappable parts`);
    const upperFlags = scene.parts.filter((part) => part.spot && scene.spots[part.spot].flag && !below.has(part.kind));
    assert.ok(upperFlags.length >= 1, `${id}: at least one suspicious spot above the chat`);
  }
  const answers = new Set(activeShopQuestionIds.map((id) => questionOf(id).answer));
  assert.ok(answers.size >= 2, "correct answers are not always in the same slot");
});

test("every wrong shop option has its own short reason for the pop-up", () => {
  for (const id of activeShopQuestionIds) {
    const question = questionOf(id);
    assert.equal(question.reasons.length, question.options.length, id);
    question.reasons.forEach((reason, index) => {
      if (index === question.answer) assert.equal(reason, null, id + ": correct option has no reason");
      else assert.ok(reason && reason.length <= 24, id + ": reason " + index);
    });
  }
});
