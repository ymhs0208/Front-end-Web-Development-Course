import test from "node:test";
import assert from "node:assert/strict";
import {
  loadState,
  getState,
  recordResult,
  updateSettings,
  getMistakes,
} from "../dist/js/core/store.js";

test("儲存模組保留舊紀錄、驗證結果並隔離外部修改", () => {
  const saved = new Map([
    [
      "vault-training-v1",
      JSON.stringify({
        attempts: [
          { id: "l1", type: "line", correct: false, time: 1 },
          { id: "bad-id", correct: true },
        ],
        settings: { large: true, voice: false },
      }),
    ],
  ]);
  globalThis.localStorage = {
    getItem: (key) => saved.get(key),
    setItem: (key, value) => saved.set(key, value),
  };
  globalThis.window = new EventTarget();
  if (!globalThis.CustomEvent)
    globalThis.CustomEvent = class extends Event {
      constructor(type, { detail }) {
        super(type);
        this.detail = detail;
      }
    };
  loadState();
  assert.equal(getState().attempts.length, 1);
  assert.equal(getState().settings.large, true);
  assert.equal(getMistakes().length, 1);
  let notified;
  window.addEventListener("vault:result-saved", (event) => {
    notified = event.detail;
  });
  recordResult({ questionId: "l1", correct: true });
  assert.deepEqual(notified, { questionId: "l1", correct: true });
  assert.equal(getMistakes().length, 0);
  assert.equal(JSON.parse(saved.get("vault-training-v1")).attempts.length, 2);
  const copy = getState();
  copy.attempts.length = 0;
  assert.equal(getState().attempts.length, 2);
  assert.throws(() => recordResult({ questionId: "bad", correct: true }));
  assert.throws(() => recordResult({ questionId: "l1", correct: "true" }));
  assert.throws(() => recordResult(null));
  updateSettings({ large: false, voice: true, extra: true });
  assert.deepEqual(getState().settings, {
    large: false,
    voice: true,
    fontLevel: 0,
    speechLanguage: "mandarin",
  });
});

test("四級字體會儲存，重新載入保留選擇，無效值不改動設定", () => {
  for (const level of [0, 1, 2, 3]) {
    updateSettings({ fontLevel: level });
    loadState();
    assert.equal(getState().settings.fontLevel, level);
    assert.equal(getState().settings.large, level > 0);
  }
  for (const invalid of [-1, 4, "3", 1.5]) {
    updateSettings({ fontLevel: invalid });
    assert.equal(getState().settings.fontLevel, 3);
  }
});

test("台語語音偏好可保存，未知語言不覆寫既有設定", () => {
  updateSettings({ voice: true, speechLanguage: "taigi" });
  loadState();
  assert.equal(getState().settings.speechLanguage, "taigi");
  assert.equal(getState().settings.voice, true);
  updateSettings({ speechLanguage: "unknown" });
  assert.equal(getState().settings.speechLanguage, "taigi");
  updateSettings({ voice: false });
  loadState();
  assert.equal(getState().settings.voice, false);
  assert.equal(getState().settings.speechLanguage, "taigi");
});

test("客語偏好可保存，切換語言不影響作答紀錄", () => {
  const attempts = getState().attempts;
  updateSettings({ voice: true, speechLanguage: "hakka" });
  loadState();
  assert.equal(getState().settings.speechLanguage, "hakka");
  assert.deepEqual(getState().attempts, attempts);
  updateSettings({ speechLanguage: "mandarin" });
  loadState();
  assert.equal(getState().settings.speechLanguage, "mandarin");
});
