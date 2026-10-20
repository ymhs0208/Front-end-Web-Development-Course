import test from "node:test";
import assert from "node:assert/strict";
import { bank } from "../dist/js/data/questions.js";
import { getRewards } from "../dist/js/core/rewards.js";
test("沒有紀錄時不顯示已獲得獎勵", () => {
  const rewards = getRewards([], bank);
  assert.equal(rewards.stars, 0);
  assert.equal(rewards.earned, 0);
});
test("每次完成都給星，答錯與重複題目也計入，無效題號不計入", () => {
  const rewards = getRewards(
    [
      { id: "l1", correct: false },
      { id: "l1", correct: true },
      { id: "unknown", correct: true },
    ],
    bank,
  );
  assert.equal(rewards.stars, 2);
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

test("安心星夥伴依累積星數成長，達到隊長後仍可繼續收星", async () => {
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

test("重複練習增加星星，勳章仍依不同情境解鎖", () => {
  const attempts = Array.from({ length: 12 }, () => ({
    id: "l1",
    correct: false,
  }));
  const before = structuredClone(attempts);
  const reward = getRewards(attempts, bank);
  assert.equal(reward.stars, 12);
  assert.equal(reward.completed, 1);
  assert.equal(reward.earned, 1);
  assert.equal(reward.badges.find((b) => b.id === "three").earned, false);
  assert.equal(reward.badges.find((b) => b.id === "all").earned, false);
  assert.deepEqual(attempts, before);
  assert.equal(getRewards(attempts, bank).stars, 12, "重開獎勵頁不重複加星");
});
test("原有紀錄直接計算參與星，不改寫資料，錯誤格式不給星", () => {
  const attempts = [
    { id: "l1", correct: true, time: 1 },
    { id: "l1", correct: false, time: 2 },
    { id: "p1", correct: false, time: 3 },
    null,
    { id: "l1" },
    { id: "l1", correct: "true" },
    { id: "unknown", correct: true },
  ];
  const reward = getRewards(attempts, bank);
  assert.equal(reward.stars, 3);
  assert.equal(reward.completed, 2);
});
test("全部勳章解鎖後依然能繼續累積星星", () => {
  const reward = getRewards(
    [...bank, ...bank].map((q) => ({ id: q.id, correct: true })),
    bank,
  );
  assert.equal(reward.stars, bank.length * 2);
  assert.equal(reward.completed, bank.length);
  assert.equal(reward.earned, 4);
});
