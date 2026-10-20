import { guideSteps } from "../components/guide-steps.js";
export function guide() {
  return `<section class="visual-guide"><div class="ios-title"><h1>跟著這 3 步做</h1></div>${guideSteps()}<div class="guide-start"><button class="primary" data-start="random">開始練習 <span aria-hidden="true">→</span></button></div></section>`;
}
