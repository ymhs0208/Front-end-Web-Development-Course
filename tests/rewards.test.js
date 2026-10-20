import test from "node:test";
import assert from "node:assert/strict";
import { bank } from "../dist/js/data/questions.js";
import { getRewards } from "../dist/js/core/rewards.js";
test("沒有紀錄時不顯示已獲得獎勵", () => {
  const rewards = getRewards([], bank);
  assert.equal(rewards.stars, 0);
  assert.equal(rewards.earned, 0);
});
test("獎勵鼓勵完成，答錯也計入，重複題目不重複給星", () => {
  const rewards = getRewards(
    [
      { id: "l1", correct: false },
      { id: "l1", correct: true },
      { id: "unknown", correct: true },
    ],
    bank,
  );
  assert.equal(rewards.stars, 1);
  assert.equal(rewards.earned, 1);
  assert.equal(rewards.badges[0].earned, true);
});
test("跨三類與全部情境的勳章依紀錄解鎖", () => {
  const some = getRewards(
    ["l1", "p1", "s1"].map((id) => ({ id, correct: false })),
    bank,
  );
  assert.equal(some.earned, 3);
  assert.equal(some.badges.find((b) => b.id === "all").earned, false);
  const all = getRewards(
    bank.map((q) => ({ id: q.id, correct: false })),
    bank,
  );
  assert.equal(all.stars, 9);
  assert.equal(all.earned, 4);
});

test("安心星夥伴依真實收集數成長，全部完成後不再要求更多星", async () => {
  const { getCompanion } = await import("../dist/js/core/rewards.js");
  assert.equal(getCompanion(0, 9).remaining, 1);
  assert.equal(getCompanion(1, 9).remaining, 2);
  assert.equal(getCompanion(2, 9).stage, "friend");
  assert.equal(getCompanion(3, 9).stage, "helper");
  assert.equal(getCompanion(3, 9).remaining, 6);
  assert.equal(getCompanion(9, 9).stage, "guardian");
  assert.equal(getCompanion(9, 9).remaining, 0);
  assert.equal(getCompanion(0, 0).remaining, 0);
});
