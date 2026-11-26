import { bank } from "../data/questions.js?v=shop-7";
import {
  getState,
  getScenarioResults,
  getShopResults,
  recordResult,
} from "../core/store.js?v=shop-7";
import { toast } from "../components/notifications.js?v=job-9-4";
// Public compatibility boundary shared by the three team modules.
export function initIntegration(exercise, shop) {
  window.VaultTraining = Object.freeze({
    recordResult,
    getQuestions: () => structuredClone(bank),
    getProgress: () => getState().attempts,
    getScenarioResults,
    getShopResults,
    startPractice: (mode) =>
      mode === "shop" && shop
        ? shop.start()
        : exercise.start(
            ["line", "phone", "review", "all", "borrow-branch"].includes(mode)
              ? mode
              : "random",
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
