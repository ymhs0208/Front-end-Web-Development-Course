// Decorative illustrations support the same short, visible step labels.
const drawings = {
  start: `<rect x="28" y="22" width="164" height="109" rx="22" fill="#e9f5ed"/><rect x="46" y="42" width="128" height="62" rx="17" fill="#168349"/><path d="m98 57 25 16-25 16V57Z" fill="white"/><path d="M119 155v-47c0-9 13-9 13 0v18l9-4 25 12c6 3 8 8 5 15l-11 24h-34l-21-28c-5-8 5-15 11-8l3 4" fill="#f7d3ad" stroke="#a37549" stroke-width="3" stroke-linejoin="round"/><path d="m128 26 3-10m26 20 9-7m-65-3-5-10" stroke="#94bfa2" stroke-width="4" stroke-linecap="round"/>`,
  choose: `<rect x="27" y="19" width="166" height="148" rx="23" fill="#edf3fc"/><rect x="45" y="39" width="130" height="30" rx="10" fill="white" stroke="#b6c9e1" stroke-width="2"/><rect x="45" y="79" width="130" height="34" rx="10" fill="#146dcb"/><rect x="45" y="123" width="130" height="27" rx="10" fill="white" stroke="#b6c9e1" stroke-width="2"/><path d="m59 95 7 7 13-14" fill="none" stroke="white" stroke-width="4" stroke-linecap="round"/><path d="M91 96h61M61 54h90M61 137h90" stroke="#a9bcd3" stroke-width="5" stroke-linecap="round"/><path d="m161 103 5 43 8-13 16-1-29-29Z" fill="#1d3c66" stroke="white" stroke-width="3" stroke-linejoin="round"/>`,
  next: `<rect x="27" y="19" width="166" height="148" rx="23" fill="#eaf4ed"/><circle cx="110" cy="68" r="31" fill="#168349"/><path d="m94 67 11 11 23-24" fill="none" stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M73 113h74" stroke="#9dbca7" stroke-width="5" stroke-linecap="round"/><rect x="58" y="129" width="104" height="27" rx="10" fill="#168349"/><path d="M92 142h33m-9-7 9 7-9 7" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
};
const steps = [
  { icon: "start", title: "按「開始練習」", description: "點綠色按鈕。" },
  { icon: "choose", title: "點一個答案", description: "慢慢想，選一個。" },
  { icon: "next", title: "看解說，按下一題", description: "答錯也沒關係。" },
];
export function guideSteps() {
  return `<ol class="visual-steps">${steps.map((step, index) => `<li class="visual-step"><span class="step-count" aria-hidden="true">${index + 1}</span><div class="step-illustration" aria-hidden="true"><svg viewBox="0 0 220 190" fill="none">${drawings[step.icon]}</svg></div><h2>${step.title}</h2><p>${step.description}</p></li>`).join("")}</ol>`;
}
