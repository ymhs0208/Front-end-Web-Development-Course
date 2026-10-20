const shapes = {
  step: '<path d="m19 30 9 9 18-21"/>',
  star: '<path d="m32 13 6 12 14 2-10 10 2 14-12-7-12 7 2-14-10-10 14-2 6-12Z"/>',
  shield:
    '<path d="m32 12 18 7v13c-2 12-10 18-18 23-8-5-16-11-18-23V19l18-7Z"/><path d="m23 31 7 7 13-15"/>',
  medal:
    '<path d="m21 13-8-9h15l4 8m11 1 8-9H36l-4 8"/><circle cx="32" cy="34" r="20"/><path d="m32 22 4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1 4-8Z"/>',
};
export function badgeIcon(name) {
  return `<svg viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">${shapes[name] || shapes.star}</svg>`;
}
export function rewardBadges(badges) {
  return `<ul class="reward-badges">${badges.map((b) => `<li class="reward-badge ${b.earned ? "earned" : "waiting"}"><span class="reward-emblem">${badgeIcon(b.icon)}</span><h2>${b.title}</h2><span class="badge-state">${b.earned ? "✓ 已獲得" : "未獲得"}</span></li>`).join("")}</ul>`;
}
