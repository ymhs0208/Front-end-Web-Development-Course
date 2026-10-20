import { tile } from "../components/tiles.js";
export function practice() {
  return `<section class="ios-screen"><div class="ios-title"><h1>選一種練習</h1><p>每種 3 題，慢慢做就好。</p></div><div class="ios-grid">${tile({ title: "訊息防詐", description: "看懂可疑訊息", icon: "line", color: "green", start: "line" })}${tile({ title: "電話防詐", description: "聽出來電話術", icon: "phone", color: "blue", start: "phone" })}${tile({ title: "網購防詐", description: "找出購物陷阱", icon: "shop", color: "orange", start: "shop" })}${tile({ title: "幫我選題", description: "直接開始 3 題", icon: "play", color: "purple", start: "random" })}</div><p class="ios-reassurance">全部都是練習，不需要填資料或付款。</p></section>`;
}
