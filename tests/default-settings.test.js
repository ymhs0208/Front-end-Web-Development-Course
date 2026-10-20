import test from "node:test";
import assert from "node:assert/strict";
import { loadState, getState } from "../dist/js/core/store.js";
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
};
test("第一次開啟預設特大字，不自動播放語音", () => {
  storage.clear();
  loadState();
  assert.equal(getState().settings.fontLevel, 2);
  assert.equal(getState().settings.large, true);
  assert.equal(getState().settings.voice, false);
  assert.equal(storage.size, 0, "讀取預設不寫入虛構紀錄");
});
test("舊有字級、語言及作答紀錄完整保留", () => {
  storage.set(
    "vault-training-v1",
    JSON.stringify({
      attempts: [{ id: "l1", correct: false, time: 1 }],
      settings: {
        fontLevel: 0,
        large: false,
        voice: true,
        speechLanguage: "hakka",
      },
    }),
  );
  loadState();
  assert.equal(getState().settings.fontLevel, 0);
  assert.equal(getState().settings.large, false);
  assert.equal(getState().settings.speechLanguage, "hakka");
  assert.equal(getState().attempts.length, 1);
});
test("舊式大字開關仍能轉換成原本字級", () => {
  for (const [large, level] of [
    [true, 1],
    [false, 0],
  ]) {
    storage.set(
      "vault-training-v1",
      JSON.stringify({ attempts: [], settings: { large } }),
    );
    loadState();
    assert.equal(getState().settings.fontLevel, level);
  }
});
