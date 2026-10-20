import { tile } from "../components/tiles.js?v=hakka-3";
export function home() {
  return `<section class="ios-screen"><div class="ios-title"><h1>想做什麼？</h1><p>點一個大方塊就可以。</p></div><div class="ios-grid">${tile({ title: "開始練習", description: "幫你選好 3 題", icon: "play", color: "green", start: "random" })}${tile({ title: "自己選題", description: "訊息・電話・網購", icon: "grid", color: "blue", href: "#practice" })}${tile({ title: "我的獎勵", description: "看看你的安心星", icon: "award", color: "orange", href: "#rewards" })}${tile({ title: "怎麼操作", description: "一步一步教你", icon: "help", color: "purple", href: "#guide" })}</div><p class="ios-reassurance">不用註冊，答錯也沒關係。</p></section>`;
}
