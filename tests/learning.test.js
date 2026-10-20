import test from "node:test";
import assert from "node:assert/strict";
import { bank, types } from "../dist/js/data/questions.js";
import {
  findMistakes,
  selectReview,
  selectQuestions,
  shuffle,
} from "../dist/js/core/engine.js";

test("題庫 ID 唯一、答案索引有效、分類存在", () => {
  assert.equal(new Set(bank.map((q) => q.id)).size, bank.length);
  for (const question of bank) {
    assert.ok(types[question.type]);
    assert.ok(question.options[question.answer]);
  }
});
test("抽題不重複、分類正確且不改動原始題庫", () => {
  const before = structuredClone(bank);
  for (const mode of ["random", "line", "phone", "shop"]) {
    const selected = selectQuestions(bank, [], mode);
    assert.equal(selected.length, 3);
    assert.equal(new Set(selected.map((q) => q.id)).size, 3);
    if (mode !== "random") assert.ok(selected.every((q) => q.type === mode));
  }
  assert.deepEqual(bank, before);
  assert.notEqual(shuffle(bank), bank);
});
test("複習依序優先錯題、未練習與較少練習的題目", () => {
  const questions = bank.slice(0, 4);
  const attempts = [
    { id: questions[0].id, correct: true, time: 1 },
    { id: questions[1].id, correct: false, time: 2 },
    { id: questions[3].id, correct: true, time: 3 },
    { id: questions[3].id, correct: true, time: 4 },
  ];
  assert.deepEqual(
    selectReview(questions, attempts, 4, () => 0, 10).map((q) => q.id),
    [questions[1].id, questions[2].id, questions[0].id, questions[3].id],
  );
});
test("錯題以最近一次作答判斷，重練答對即移出", () => {
  const attempts = [
    { id: "l1", correct: false },
    { id: "l2", correct: false },
  ];
  assert.deepEqual(
    findMistakes(bank, attempts).map((q) => q.id),
    ["l1", "l2"],
  );
  attempts.push({ id: "l1", correct: true });
  assert.deepEqual(
    findMistakes(bank, attempts).map((q) => q.id),
    ["l2"],
  );
});
test("指定單題可開始練習，無效 ID 不產生題目", () => {
  assert.deepEqual(
    selectQuestions(bank, [], null, "p2").map((q) => q.id),
    ["p2"],
  );
  assert.deepEqual(selectQuestions(bank, [], null, "missing"), []);
});
