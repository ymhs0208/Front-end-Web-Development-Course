// Fictional shopping-scam scenes on two invented platforms, 「mama」 and 「嗨皮」.
// Every domain, account and LINE ID is invented; `.example` domains cannot be visited.
// Each scene is keyed by its question ID in questions.js. `spots` are the clickable
// details; `flag: true` marks a suspicious detail the learner should find.
// Keep wording short: the audience is older adults reading at very large text sizes.
//
// Part kinds and where the product-page layout places them:
//   top:   url
//   media: image (art: "bag" | "shoe")
//   info:  name, promo, price (original/sale/badge), alert, row (label + text), buttons
//   below: section, chat (who), system, form
export const shopPlatforms = {
  mama: { name: "mama", tagline: "購物網", search: "搜尋商品" },
  haipi: { name: "嗨皮", tagline: "購物", search: "在嗨皮搜尋" },
};

export const shopScenes = {
  "shop-scam-1": {
    platform: "mama",
    parts: [
      { kind: "url", spot: "url", text: "mama-0ff1cial.example" },
      { kind: "image", art: "bag", text: "名牌包圖片" },
      { kind: "name", text: "真皮托特包・專櫃同款" },
      { kind: "promo", spot: "promo", text: "🎉 全館 9 折" },
      { kind: "price", spot: "price", text: "原價 12,800，特價 990", original: "12,800", sale: "990", badge: "1 折" },
      { kind: "alert", spot: "timer", text: "⏰ 只剩 3 件！" },
      { kind: "row", spot: "payment", label: "付款", text: "只能 ATM 轉帳" },
      { kind: "row", label: "配送", text: "宅配到府" },
      { kind: "buttons", text: "放入購物車、直接購買" },
    ],
    spots: {
      url: { flag: true, label: "網址是假的", tip: "不是官網，用 0 冒充 o。" },
      price: { flag: true, label: "價格太便宜", tip: "1 折太誇張，是誘餌。" },
      timer: { flag: true, label: "催你快買", tip: "催你快買，不讓你想。" },
      payment: { flag: true, label: "只能轉帳", tip: "只收轉帳，被騙追不回。" },
      promo: { flag: false, label: "9 折活動", tip: "9 折活動很常見，沒問題。" },
    },
  },
  "shop-scam-2": {
    platform: "haipi",
    parts: [
      { kind: "url", spot: "url", text: "haipi.example" },
      { kind: "image", art: "shoe", text: "運動鞋圖片" },
      { kind: "name", text: "氣墊運動鞋" },
      { kind: "price", text: "原價 1,880，特價 1,690", original: "1,880", sale: "1,690", badge: "9 折" },
      { kind: "row", label: "付款", text: "信用卡、貨到付款" },
      { kind: "row", label: "運送", text: "超商取貨" },
      { kind: "buttons", text: "加入購物車、直接購買" },
      { kind: "section", text: "聊聊" },
      { kind: "chat", spot: "offplatform", who: "賣家", text: "加我 LINE 私下買，再打 9 折！" },
      { kind: "chat", spot: "account", who: "賣家", text: "匯到我的帳戶：王○○（虛構）" },
      { kind: "chat", spot: "rush", who: "賣家", text: "只剩 2 個，快匯！" },
      { kind: "system", spot: "notice", text: "【嗨皮提醒】請勿私下交易" },
    ],
    spots: {
      offplatform: { flag: true, label: "叫你私下交易", tip: "離開嗨皮，就沒有保障。" },
      account: { flag: true, label: "匯到個人帳戶", tip: "錢被騙走，很難追回。" },
      rush: { flag: true, label: "催你快匯錢", tip: "一直催，就是警訊。" },
      url: { flag: false, label: "嗨皮網址", tip: "這是嗨皮官網，沒問題。" },
      notice: { flag: false, label: "嗨皮提醒", tip: "這是嗨皮的提醒，要聽它的。" },
    },
  },
  "shop-scam-3": {
    platform: "haipi",
    parts: [
      { kind: "url", spot: "url", text: "haipi.example" },
      { kind: "image", art: "bag", text: "後背包圖片" },
      { kind: "name", text: "防潑水後背包" },
      { kind: "price", text: "原價 990，特價 890", original: "990", sale: "890", badge: "9 折" },
      { kind: "row", label: "付款", text: "信用卡、貨到付款" },
      { kind: "buttons", text: "加入購物車、直接購買" },
      { kind: "section", text: "聊聊" },
      { kind: "chat", spot: "blocked", who: "賣家", text: "你的帳號沒開通金流，不能下單" },
      { kind: "chat", spot: "link", who: "賣家", text: "點這裡找客服認證：haipi-pay.example" },
      { kind: "section", text: "點開連結後：" },
      { kind: "form", spot: "card", text: "請輸入信用卡號、背面 3 碼" },
      { kind: "form", spot: "otp", text: "請輸入簡訊驗證碼" },
    ],
    spots: {
      blocked: { flag: true, label: "說你不能下單", tip: "這是假客服的開場白。" },
      link: { flag: true, label: "聊天裡的連結", tip: "不是嗨皮官網，不要點。" },
      card: { flag: true, label: "要你的卡號", tip: "買東西不用做「認證」。" },
      otp: { flag: true, label: "要你的驗證碼", tip: "驗證碼絕不能給別人。" },
      url: { flag: false, label: "嗨皮網址", tip: "這是嗨皮官網，沒問題。" },
    },
  },
};

export function flagIds(scene) {
  return Object.entries(scene?.spots || {})
    .filter(([, spot]) => spot.flag)
    .map(([id]) => id);
}
