import test from "node:test";
import assert from "node:assert/strict";
import { home } from "../dist/js/pages/home.js";

test("homepage keeps the normal practice entry and omits the Q5 audio test block", () => {
  const markup = home();

  assert.match(markup, /data-start="random"/);
  assert.match(markup, /開始練習/);
  assert.match(markup, /每次 3 題/);
  assert.doesNotMatch(markup, /開始第\s*5\s*題音效預覽/);
  assert.doesNotMatch(markup, /請先開啟音量/);
});
