import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeHakkaText,
  parseHakkaEvent,
  resolveHakkaAudio,
  createHakkaSpeech,
} from "../dist/js/features/hakka-tts.js";
const origin = "https://united-link-taiwanese-hakka-tts.hf.space";
const audioUrl = origin + "/gradio_api/file=/tmp/gradio/example/audio.wav";
const complete =
  "event: complete\ndata: " +
  JSON.stringify(["斷詞", "拼音", { url: audioUrl }]) +
  "\n\n";
function streamResponse(chunks) {
  const encoder = new TextEncoder();
  return {
    ok: true,
    body: new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
  };
}
test("客語數字轉換保留選項、金額、百分比與小數意思", () => {
  assert.equal(
    normalizeHakkaText("1，選答案。補付 15 元，獲利 5%。"),
    "一，選答案。補付 十五 元，獲利 百分之五。",
  );
  assert.equal(
    normalizeHakkaText("3.5% 和 105 元、1001 元、010"),
    "百分之三點五 和 一百零五 元、一千零一 元、零一零",
  );
  assert.equal(
    normalizeHakkaText("ship-verify.example"),
    "ship-verify.example",
  );
});
test("客語串流支援心跳、跨封包與 CRLF，以四縣腔和預設語者送出", async () => {
  const calls = [];
  const result = await resolveHakkaAudio("15 元", {
    fetchImpl: async (endpoint, options) => {
      calls.push({ endpoint, options });
      if (calls.length === 1)
        return { ok: true, json: async () => ({ event_id: "a".repeat(32) }) };
      const crlf = complete.replaceAll("\n", "\r\n");
      return streamResponse([
        "event: heartbeat\ndata: null\n\n",
        crlf.slice(0, 9),
        crlf.slice(9, 47),
        crlf.slice(47),
      ]);
    },
  });
  assert.equal(result, audioUrl);
  assert.deepEqual(JSON.parse(calls[0].options.body).data, [
    "yourtts-htia-240704",
    "預設語者",
    null,
    "朱品諭",
    "sixian",
    1.1,
    "十五 元",
  ]);
  assert.ok(calls.every((call) => call.options.credentials === "omit"));
});
test("客語錯誤事件、無音檔、錯誤來源與未完成串流不會假裝成功", async () => {
  assert.throws(() => parseHakkaEvent("event: error\ndata: null"), /客語/);
  assert.throws(
    () =>
      parseHakkaEvent(
        'event: complete\ndata: [null,null,{"url":"https://example.com/a.wav"}]',
      ),
    /客語音檔/,
  );
  assert.throws(
    () => parseHakkaEvent("event: complete\ndata: [null,null,null]"),
    /客語音檔/,
  );
  let request = 0;
  await assert.rejects(
    resolveHakkaAudio("你好", {
      fetchImpl: async () =>
        ++request === 1
          ? { ok: true, json: async () => ({ event_id: "b".repeat(32) }) }
          : streamResponse(["event: heartbeat\ndata: null\n\n"]),
    }),
    /未能完成/,
  );
});
test("取消客語等候會中止串流請求，不播放遲來的音檔", async () => {
  let streamSignal;
  let started;
  const ready = new Promise((resolve) => {
    started = resolve;
  });
  const errors = [];
  let count = 0;
  const speech = createHakkaSpeech({
    fetchImpl: async (_, options) => {
      if (++count === 1)
        return { ok: true, json: async () => ({ event_id: "c".repeat(32) }) };
      streamSignal = options.signal;
      return new Promise((_, reject) => {
        streamSignal.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
        started();
      });
    },
    createAudio: () => assert.fail("取消後不可播放"),
    onError: (message) => errors.push(message),
  });
  const pending = speech.speak("你好");
  await ready;
  speech.stop();
  await pending;
  assert.equal(streamSignal.aborted, true);
  assert.equal(speech.isActive(), false);
  assert.deepEqual(errors, []);
});
test("客語重播沿用音檔快取，不重複排隊合成", async () => {
  let requests = 0;
  const speech = createHakkaSpeech({
    fetchImpl: async () =>
      ++requests === 1
        ? { ok: true, json: async () => ({ event_id: "d".repeat(32) }) }
        : streamResponse([complete]),
    createAudio: () => ({
      play: async () => {},
      pause() {},
      load() {},
      removeAttribute() {},
    }),
  });
  await speech.speak("你好");
  await speech.speak("你好");
  assert.equal(requests, 2);
  speech.stop();
});
