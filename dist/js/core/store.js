import { bank } from "../data/questions.js?v=labels-1";
import { findMistakes } from "./engine.js?v=labels-1";
const STORAGE_KEY = "vault-training-v1";
const DEFAULT_SETTINGS = {
  large: true,
  voice: false,
  fontLevel: 2,
  speechLanguage: "mandarin",
};
let state = { attempts: [], settings: { ...DEFAULT_SETTINGS } };
let storageOK = true;
let notifyWarning = () => {};
export function loadState(onWarning = () => {}) {
  notifyWarning = onWarning;
  state = { attempts: [], settings: { ...DEFAULT_SETTINGS } };
  storageOK = true;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.attempts)) {
      state.attempts = saved.attempts.filter(
        (a) =>
          a &&
          bank.some((q) => q.id === a.id) &&
          typeof a.correct === "boolean",
      );
      for (const key of ["large", "voice"]) {
        if (typeof saved.settings?.[key] === "boolean")
          state.settings[key] = saved.settings[key];
      }
      state.settings.speechLanguage = ["taigi", "hakka"].includes(
        saved.settings?.speechLanguage,
      )
        ? saved.settings.speechLanguage
        : "mandarin";
      const level = saved.settings?.fontLevel;
      state.settings.fontLevel =
        Number.isInteger(level) && level >= 0 && level <= 3
          ? level
          : typeof saved.settings?.large === "boolean"
            ? saved.settings.large
              ? 1
              : 0
            : DEFAULT_SETTINGS.fontLevel;
      state.settings.large = state.settings.fontLevel > 0;
    }
  } catch {
    storageOK = false;
  }
  if (!storageOK) notifyWarning("目前無法讀取儲存空間，本次仍可練習。");
}
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    notifyWarning("瀏覽器無法儲存，目前紀錄只保留在本次開啟期間。");
  }
}
// Return a copy so pages and external modules cannot mutate stored state.
export function getState() {
  return structuredClone(state);
}
export function updateSettings(patch) {
  if (["mandarin", "taigi", "hakka"].includes(patch.speechLanguage))
    state.settings.speechLanguage = patch.speechLanguage;
  for (const key of ["large", "voice"]) {
    if (typeof patch[key] === "boolean") state.settings[key] = patch[key];
  }
  if (
    Number.isInteger(patch.fontLevel) &&
    patch.fontLevel >= 0 &&
    patch.fontLevel <= 3
  ) {
    state.settings.fontLevel = patch.fontLevel;
    state.settings.large = patch.fontLevel > 0;
  } else if (typeof patch.large === "boolean") {
    state.settings.fontLevel = patch.large ? 1 : 0;
  }
  persist();
}
export function getMistakes() {
  return findMistakes(bank, state.attempts);
}
export function recordResult(payload) {
  const question = bank.find((q) => q.id === payload?.questionId);
  if (!question || typeof payload.correct !== "boolean")
    throw new Error("請提供題庫內的 questionId 與布林值 correct");
  state.attempts.push({
    id: question.id,
    type: question.type,
    correct: payload.correct,
    time: Date.now(),
  });
  persist();
  window.dispatchEvent(
    new CustomEvent("vault:result-saved", {
      detail: { questionId: question.id, correct: payload.correct },
    }),
  );
}
