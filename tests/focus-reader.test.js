import test from "node:test";
import assert from "node:assert/strict";
import { bank } from "../dist/js/data/questions.js";
import { compactOptions } from "../dist/js/data/compact-options.js";
import { fitTextPage, focusText } from "../dist/js/features/focus-reader.js";
import { validateDraft } from "../dist/js/core/session.js";

class TextBox {
  textContent = "";
  getBoundingClientRect() {
    const lines = this.textContent
      .split("\n")
      .reduce(
        (n, part) => n + Math.max(1, Math.ceil(Array.from(part).length / 6)),
        0,
      );
    return { height: lines * 50 };
  }
}
test("所有情境與完整解說分頁後不漏字、不重複，每頁符合高度", () => {
  for (const q of bank) {
    for (const text of [
      focusText({ qs: [q], index: 0, answered: false }),
      focusText({ qs: [q], index: 0, answered: true }),
    ]) {
      let offset = 0,
        result = "",
        pages = 0;
      while (offset < Array.from(text).length) {
        const box = new TextBox();
        const page = fitTextPage(text, offset, box, 250);
        assert.ok(page.end > offset);
        assert.ok(box.getBoundingClientRect().height <= 250);
        result += box.textContent;
        offset = page.end;
        assert.ok(++pages < 30);
      }
      assert.equal(result, text);
    }
  }
});
test("短版答案維持選項數量與正確答案索引，每個選項不超過 11 字", () => {
  for (const q of bank) {
    assert.equal(compactOptions[q.id].length, q.options.length);
    assert.ok(compactOptions[q.id][q.answer]);
    assert.ok(compactOptions[q.id].every((o) => Array.from(o).length <= 11));
  }
});
test("重新載入保留分段位置與答案畫面，舊版草稿仍可讀取", () => {
  const base = {
    ids: ["p1"],
    index: 0,
    score: 0,
    answered: false,
    complete: false,
  };
  assert.equal(validateDraft(base, bank).questionView, "read");
  const restored = validateDraft(
    {
      ...base,
      questionView: "choose",
      readerOffset: 15,
      readerHistory: [0, 5],
    },
    bank,
  );
  assert.equal(restored.questionView, "choose");
  assert.equal(restored.readerOffset, 15);
  assert.deepEqual(restored.readerHistory, [0, 5]);
});
