// Shared cancellation, audio playback, and bounded per-language cache.
export function createRemoteSpeech({
  label,
  resolveAudio,
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
        url = await resolveAudio(content, {
          fetchImpl,
          signal: controller.signal,
        });
        if (typeof url !== "string" || new URL(url).protocol !== "https:")
          throw new Error(`${label}音檔尚未準備好，請稍後再試。`);
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
        onError(`${label}音檔無法播放，請再按一次朗讀，或改選國語。`);
      };
      state("playing");
      await audio.play();
    } catch (error) {
      if (token !== generation) return;
      state(error.name === "NotAllowedError" ? "ready" : "idle");
      onError(
        error.name === "NotAllowedError"
          ? `${label}準備好了，請再按一次「播放語音」。`
          : error.name === "AbortError"
            ? `${label}語音等候較久，請稍後再試，或改選國語。`
            : error.message?.startsWith(label)
              ? error.message
              : `${label}暫時無法連線，請稍後再試，或改選國語。`,
      );
    } finally {
      clearTimeout(timer);
      if (token === generation) request = null;
    }
  }
  return { speak, stop, isActive: () => active };
}
