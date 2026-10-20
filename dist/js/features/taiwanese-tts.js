// Same public model6 API used by the Taiwanese-tts Hugging Face Space.
const ENDPOINT = "https://learn-language.tokyo/taigiTTS/taigi-text-to-speech";
export function createTaiwaneseSpeech({
  fetchImpl = (...args) => fetch(...args),
  createAudio = (url) => new Audio(url),
  onState = () => {},
  onError = () => {},
  timeoutMs = 45000,
} = {}) {
  const cache = new Map();
  let generation = 0;
  let request;
  let audio;
  let active = false;
  function state(value) {
    active = value === "loading" || value === "playing";
    onState(value);
  }
  function stop() {
    generation++;
    request?.abort();
    request = null;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audio = null;
    }
    state("idle");
  }
  async function speak(text) {
    stop();
    const token = generation;
    const content = text.trim();
    if (!content) return;
    let timer;
    try {
      let url = cache.get(content);
      if (!url) {
        state("loading");
        const controller = new AbortController();
        request = controller;
        timer = setTimeout(() => controller.abort(), timeoutMs);
        const response = await fetchImpl(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "omit",
          body: JSON.stringify({ text: content, model: "model6" }),
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(
            response.status === 429
              ? "台語語音使用較多人，請稍後再試，或改選國語。"
              : "台語暫時無法連線，請稍後再試，或改選國語。",
          );
        const data = await response.json();
        url = data.converted_audio_url || data.audio_url;
        if (typeof url !== "string" || new URL(url).protocol !== "https:")
          throw new Error("台語音檔尚未準備好，請稍後再試。");
        if (token !== generation) return;
        if (cache.size >= 32) cache.delete(cache.keys().next().value);
        cache.set(content, url);
      }
      if (token !== generation) return;
      clearTimeout(timer);
      request = null;
      audio = createAudio(url);
      audio.onended = () => {
        if (token === generation) state("idle");
      };
      audio.onerror = () => {
        if (token !== generation) return;
        cache.delete(content);
        state("idle");
        onError("台語音檔無法播放，請再按一次朗讀，或改選國語。");
      };
      state("playing");
      await audio.play();
    } catch (error) {
      if (token !== generation) return;
      state("idle");
      onError(
        error.name === "NotAllowedError"
          ? "台語準備好了，請再按一次「唸給我聽」。"
          : error.name === "AbortError"
            ? "台語語音等候較久，請稍後再試，或改選國語。"
            : error.message?.startsWith("台語")
              ? error.message
              : "台語暫時無法連線，請稍後再試，或改選國語。",
      );
    } finally {
      clearTimeout(timer);
      if (token === generation) request = null;
    }
  }
  return { speak, stop, isActive: () => active };
}
