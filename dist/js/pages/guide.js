import { guideSteps } from "../components/guide-steps.js?v=taigi-2";
export function guide() {
  return `<section class="visual-guide"><div class="ios-title"><h1>跟著這 3 步做</h1></div>${guideSteps()}<details class="reward-rules"><summary>怎麼使用台語朗讀？</summary><ul><li><span>上方「語音」選台語，再按題目的朗讀按鈕。準備中或播放時，按同一個按鈕即可停止。</span></li><li><span>台語需網路連線，會將朗讀文字送至外部語音服務，不傳送你的作答紀錄。忙碌時請稍後再試，或改選國語。合成發音可能不完全自然。</span></li><li><span>語音來源：<a href="https://huggingface.co/spaces/tbdavid2019/Taiwanese-tts" target="_blank" rel="noopener noreferrer">台語 TTS（另開視窗）</a>使用的 model6 服務。</span></li></ul></details><div class="guide-start"><button class="primary" data-start="random">開始練習 <span aria-hidden="true">→</span></button></div></section>`;
}
