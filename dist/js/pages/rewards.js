import { bank } from "../data/questions.js";
import { getState, getMistakes } from "../core/store.js";
import { getRewards } from "../core/rewards.js";
import { badgeIcon, rewardBadges } from "../components/badges.js?v=rewards-10";
export function rewardsPage() {
  const reward = getRewards(getState().attempts, bank);
  const due = getMistakes().length;
  return `<section class="rewards-page"><div class="ios-title"><h1>我的獎勵</h1></div><section class="reward-summary"><div class="reward-stars"><span class="reward-main-star" aria-hidden="true">${badgeIcon("star")}</span><p class="star-count"><strong>${reward.stars}</strong><span>顆安心星</span></p></div><div class="reward-next"><p>${reward.stars ? "每練一個新情境，多一顆星。" : "完成第一題，就有一顆星。"}</p><button class="primary" data-start="${due ? "review" : "random"}">${due ? "再練一次" : reward.stars ? "繼續練習" : "開始練習"} <span aria-hidden="true">→</span></button></div></section><div class="section-head"><h2>我的勳章</h2><span class="reward-total">已獲得 ${reward.earned} 枚</span></div>${rewardBadges(reward.badges)}<details class="reward-rules"><summary>勳章怎麼拿？</summary><ul>${reward.badges.map((b) => `<li><strong>${b.title}</strong><span>${b.description}</span></li>`).join("")}</ul></details></section>`;
}
