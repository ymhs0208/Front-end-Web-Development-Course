import { $ } from "../core/dom.js?v=taigi-1";
let toastTimer;
export function toast(t) {
  $("#toast").textContent = t;
  $("#toast").style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("#toast").style.display = "none"), 4500);
}
