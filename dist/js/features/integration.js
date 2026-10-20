import { bank } from "../data/questions.js?v=hakka-2";
import { getState, recordResult } from "../core/store.js?v=hakka-2";
import { toast } from "../components/notifications.js?v=hakka-2";
// Public compatibility boundary shared by the three team modules.
export function initIntegration(exercise) {
  window.VaultTraining = Object.freeze({
    recordResult,
    getQuestions: () => structuredClone(bank),
    getProgress: () => getState().attempts,
    startPractice: (mode) =>
      exercise.start(
        ["line", "phone", "shop", "review"].includes(mode) ? mode : "random",
      ),
  });
  window.addEventListener("vault:module-result", (event) => {
    try {
      recordResult(event.detail);
    } catch {
      toast("模組結果格式不正確，未儲存。");
    }
  });
}
