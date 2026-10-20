import { $ } from "../core/dom.js?v=taigi-2";
import { getState, updateSettings } from "../core/store.js?v=taigi-2";
import { toast } from "../components/notifications.js?v=taigi-2";
import { createTaiwaneseSpeech } from "./taiwanese-tts.js?v=taigi-2";
function updateReadButton(state) {
  const button = document.querySelector("[data-read]");
  if (!button) return;
  button.textContent =
    state === "loading"
      ? "取消等候"
      : state === "playing"
        ? "停止朗讀"
        : button.dataset.idleLabel || "唸給我聽";
  button.setAttribute(
    "aria-label",
    state === "loading" ? "台語準備中，按一下取消" : button.textContent,
  );
  button.setAttribute("aria-pressed", String(state !== "idle"));
  button.setAttribute("aria-busy", String(state === "loading"));
}
const taiwanese = createTaiwaneseSpeech({
  onState: updateReadButton,
  onError: toast,
});
let speechGeneration = 0;
export function isSpeaking() {
  return (
    taiwanese.isActive() ||
    ("speechSynthesis" in window && speechSynthesis.speaking)
  );
}
export function say(text, force = false) {
  stopSpeech();
  if (!getState().settings.voice && !force) return;
  if (getState().settings.speechLanguage === "taigi") {
    void taiwanese.speak(text);
    return;
  }
  if (!("speechSynthesis" in window)) {
    if (force) toast("此瀏覽器不支援國語朗讀，可改選台語。");
    return;
  }
  const token = speechGeneration;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "zh-TW";
  u.rate = 0.85;
  u.onstart = () => {
    if (token === speechGeneration) updateReadButton("playing");
  };
  u.onend = u.onerror = () => {
    if (token === speechGeneration) updateReadButton("idle");
  };
  speechSynthesis.speak(u);
}
function applySettings() {
  const data = getState();
  document.body.classList.toggle("large", data.settings.large);
  document.body.dataset.textSize = String(data.settings.fontLevel);
  $("#fontSizeSelect").value = String(data.settings.fontLevel);
  $("#voiceSelect").value = data.settings.voice
    ? data.settings.speechLanguage
    : "off";
}
export function stopSpeech() {
  speechGeneration++;
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  taiwanese.stop();
  updateReadButton("idle");
}
export function initAccessibility() {
  $("#fontSizeSelect").onchange = (event) => {
    stopSpeech();
    updateSettings({ fontLevel: Number(event.target.value) });
    applySettings();
    window.dispatchEvent(new Event("vault:text-size-changed"));
  };
  $("#voiceSelect").onchange = (event) => {
    stopSpeech();
    const language = event.target.value;
    updateSettings(
      language === "off"
        ? { voice: false }
        : { voice: true, speechLanguage: language },
    );
    applySettings();
    if (language !== "off") {
      if (document.querySelector("[data-read]"))
        document.querySelector("[data-read]").click();
      else
        say(
          language === "taigi"
            ? "台語朗讀已開啟，咱做伙來學防詐騙。"
            : "國語朗讀已開啟。點選情境練習，就可以開始學習。",
        );
    }
  };
  window.addEventListener("pagehide", stopSpeech);
  applySettings();
}
