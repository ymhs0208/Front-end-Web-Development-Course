import { $ } from "../core/dom.js";
import { getState, updateSettings } from "../core/store.js";
import { toast } from "../components/notifications.js";
function updateReadButton(speaking) {
  const button = document.querySelector("[data-read]");
  if (!button) return;
  button.textContent = speaking
    ? "停止朗讀"
    : button.dataset.idleLabel || "唸給我聽";
  button.setAttribute("aria-pressed", String(speaking));
}
export function say(text, force = false) {
  if (!("speechSynthesis" in window)) {
    if (force) toast("此瀏覽器不支援語音朗讀，請閱讀畫面文字。");
    return;
  }
  speechSynthesis.cancel();
  if (getState().settings.voice || force) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-TW";
    u.rate = 0.85;
    u.onstart = () => updateReadButton(true);
    u.onend = () => updateReadButton(false);
    u.onerror = () => updateReadButton(false);
    speechSynthesis.speak(u);
  }
}
function applySettings() {
  const data = getState();
  document.body.classList.toggle("large", data.settings.large);
  document.body.dataset.textSize = String(data.settings.fontLevel);
  $("#fontSizeSelect").value = String(data.settings.fontLevel);
  $("#voiceBtn").setAttribute("aria-pressed", String(data.settings.voice));
  $("#voiceBtn .access-label").textContent = data.settings.voice
    ? "語音開啟"
    : "語音關閉";
}
export function stopSpeech() {
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  updateReadButton(false);
}
export function initAccessibility() {
  $("#fontSizeSelect").onchange = (event) => {
    stopSpeech();
    updateSettings({ fontLevel: Number(event.target.value) });
    applySettings();
    window.dispatchEvent(new Event("vault:text-size-changed"));
  };
  $("#voiceBtn").onclick = () => {
    if (!("speechSynthesis" in window)) {
      toast("此瀏覽器不支援語音朗讀");
      return;
    }
    updateSettings({ voice: !getState().settings.voice });
    applySettings();
    if (getState().settings.voice)
      say("語音朗讀已開啟。點選情境練習，就可以開始學習。");
    else stopSpeech();
  };
  applySettings();
}
