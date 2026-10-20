// Short spoken directions avoid reading decorative icons or closed details.
export function pageNarration(hash, main) {
  switch (hash.replace(/^#/, "")) {
    case "practice":
      return "請選訊息防詐、電話防詐或網購防詐，每次三題。按隨機練習，可以直接開始三題。";
    case "rewards":
    case "review":
      return `我的獎勵。${main.querySelector(".companion-count")?.innerText || ""}。按繼續練習，就可以再做三題。`;
    case "guide":
      return "先按開始練習。慢慢看，選一個答案。看完解說，再按下一題。答錯也沒關係。";
    case "mistakes":
      return main.innerText;
    default:
      return "這裡可以練習辨認詐騙，保護自己的錢。請按最上方的開始練習，做三題。也可以選練習主題、看我的獎勵或操作說明。";
  }
}
