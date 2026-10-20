import test from "node:test";
import assert from "node:assert/strict";
import { bank } from "../dist/js/data/questions.js";
import {
  validateDraft,
  restoreSession,
  saveSession,
} from "../dist/js/core/session.js";
const draft = {
  ids: ["l1", "p1", "s1"],
  index: 1,
  score: 1,
  answered: true,
  correct: false,
  complete: false,
};
test("重新整理可保留目前題目與已作答狀態", () => {
  const map = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => map.get(key),
    setItem: (key, v) => map.set(key, v),
    removeItem: (key) => map.delete(key),
  };
  const session = validateDraft(draft, bank);
  saveSession(session);
  assert.equal(restoreSession(bank).qs[1].id, "p1");
  assert.equal(restoreSession(bank).answered, true);
  assert.equal(restoreSession(bank).score, 1);
  saveSession(null);
  assert.equal(restoreSession(bank), null);
});
test("拒絕無效題號、索引、分數與不完整的成果", () => {
  for (const patch of [
    { ids: ["bad"] },
    { ids: ["l1", "l1"] },
    { index: 99 },
    { score: 99 },
    { complete: true },
    { correct: null },
  ])
    assert.equal(validateDraft({ ...draft, ...patch }, bank), null);
});
