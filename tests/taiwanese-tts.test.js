import test from "node:test";
import assert from "node:assert/strict";
import { createTaiwaneseSpeech } from "../dist/js/features/taiwanese-tts.js";
const url = "https://example.com/voice.wav";
function fakeAudio() {
  return { play: async () => {}, pause() {}, load() {}, removeAttribute() {} };
}
test("台語請求不帶憑證、使用 model6，同文重播不再次呼叫 API", async () => {
  const calls = [];
  const errors = [];
  const tts = createTaiwaneseSpeech({
    fetchImpl: async (endpoint, options) => {
      calls.push({ endpoint, options });
      return { ok: true, json: async () => ({ audio_url: url }) };
    },
    createAudio: fakeAudio,
    onError: (message) => errors.push(message),
  });
  await tts.speak("請小心詐騙。");
  await tts.speak("請小心詐騙。");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.credentials, "omit");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    text: "請小心詐騙。",
    model: "model6",
  });
  assert.equal(tts.isActive(), true);
  tts.stop();
  assert.equal(tts.isActive(), false);
  assert.deepEqual(errors, []);
});
test("停止等候後，即使舊 API 回覆也不播放；切換新段落不受舊回覆影響", async () => {
  let resolveOld;
  let played = 0;
  const tts = createTaiwaneseSpeech({
    fetchImpl: (_, { body }) =>
      JSON.parse(body).text === "舊題目"
        ? new Promise((resolve) => {
            resolveOld = resolve;
          })
        : Promise.resolve({ ok: true, json: async () => ({ audio_url: url }) }),
    createAudio: () => ({
      ...fakeAudio(),
      play: async () => {
        played++;
      },
    }),
  });
  const old = tts.speak("舊題目");
  assert.equal(tts.isActive(), true);
  tts.stop();
  await tts.speak("新題目");
  resolveOld({ ok: true, json: async () => ({ audio_url: url }) });
  await old;
  assert.equal(played, 1);
  assert.equal(tts.isActive(), true);
  tts.stop();
});
test("服務限流、無效音檔與連線逾時提供可讀提示，不播放錯誤內容", async () => {
  for (const response of [
    { ok: false, status: 429 },
    { ok: true, json: async () => ({ audio_url: "javascript:alert(1)" }) },
  ]) {
    let error;
    const tts = createTaiwaneseSpeech({
      fetchImpl: async () => response,
      createAudio: () => {
        assert.fail("不能播放無效回覆");
      },
      onError: (message) => {
        error = message;
      },
    });
    await tts.speak("測試");
    assert.match(error, /台語/);
    assert.equal(tts.isActive(), false);
  }
  let error;
  const tts = createTaiwaneseSpeech({
    timeoutMs: 5,
    fetchImpl: (_, { signal }) =>
      new Promise((_, reject) => {
        signal.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
      }),
    onError: (message) => {
      error = message;
    },
  });
  await tts.speak("測試逾時");
  assert.match(error, /等候較久/);
  assert.equal(tts.isActive(), false);
});
test("手機禁止自動播放時保留音檔，按第二次可直接重播", async () => {
  let requests = 0;
  let error;
  let blocked = true;
  const tts = createTaiwaneseSpeech({
    fetchImpl: async () => {
      requests++;
      return { ok: true, json: async () => ({ audio_url: url }) };
    },
    createAudio: () => ({
      ...fakeAudio(),
      play: async () => {
        if (blocked) throw new DOMException("blocked", "NotAllowedError");
      },
    }),
    onError: (message) => {
      error = message;
    },
  });
  await tts.speak("你好");
  assert.match(error, /再按一次/);
  assert.equal(tts.isActive(), false);
  blocked = false;
  await tts.speak("你好");
  assert.equal(requests, 1);
  assert.equal(tts.isActive(), true);
  tts.stop();
});
