import { bank } from "../data/questions.js?v=welcome-1";
import { getState, getMistakes } from "../core/store.js?v=welcome-1";
import { getRewards, getCompanion } from "../core/rewards.js?v=welcome-1";
import { rewardBadges } from "../components/badges.js?v=welcome-1";
import { companion } from "../components/companion.js?v=welcome-1";
export function rewardsPage() {
  const reward = getRewards(getState().attempts, bank);
  const friend = getCompanion(reward.stars, reward.total);
  const due = getMistakes().length;
  return `<section class="rewards-page"><div class="ios-title"><h1>我的獎勵</h1><p>收集安心星，陪夥伴一起長大。</p></div>
    <section class="companion-card" aria-labelledby="companion-title"><div class="companion-portrait">${companion(friend.stage)}<span class="companion-name">你的安心星夥伴</span></div><div class="companion-content"><p class="companion-greeting">${friend.message}</p><h2 id="companion-title">${friend.title}</h2><p class="companion-count"><strong>${reward.stars}</strong> 顆安心星</p><div class="star-collection" role="img" aria-label="夥伴成長進度：${Math.min(reward.stars, reward.total)} / ${reward.total} 顆星">${Array.from({ length: reward.total }, (_, i) => `<span class="collection-star ${i < reward.stars ? "collected" : ""}" aria-hidden="true">★</span>`).join("")}</div><div class="companion-goal"><span aria-hidden="true">${friend.remaining ? "✦" : "✓"}</span><p>${friend.remaining ? `再收集 <strong>${friend.remaining}</strong> 顆星<br>` : ""}${friend.goal}</p></div><button class="primary" data-start="${due ? "review" : "random"}">${due ? "再練一次" : reward.stars ? "繼續練習" : "開始收集星星"} <span aria-hidden="true">→</span></button><p class="companion-note">每完成 1 題，加 1 顆星。<br>答錯、重複練習都算。</p></div></section>
    <div class="section-head"><h2>我的勳章</h2><span class="reward-total">已獲得 ${reward.earned} 枚</span></div>${rewardBadges(reward.badges)}<details class="reward-rules"><summary>勳章怎麼拿？</summary><ul>${reward.badges.map((b) => `<li><strong>${b.title}</strong><span>${b.description}</span></li>`).join("")}</ul></details></section>`;
}
