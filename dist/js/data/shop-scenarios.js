// Fictional shopping-scam scenes on two invented platforms, 「mama」 and 「嗨皮」.
// Every domain, account and LINE ID is invented; `.example` domains cannot be visited.
// Each scene is keyed by its question ID in questions.js. `spots` are the clickable
// details (almost every part is tappable); `flag: true` marks a suspicious detail the learner should find.
// Keep wording short: the audience is older adults reading at very large text sizes.
//
// Part kinds and where the product-page layout places them:
//   top:   url
//   media: image (art: "bag" | "shoe")
//   info:  name, promo, price (original/sale/badge), alert, review, seller (name + text),
//          row (label + text), buttons
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
      { kind: "image", spot: "photo", art: "bag", text: "名牌包圖片" },
      { kind: "name", spot: "name", text: "真皮托特包・專櫃同款" },
      { kind: "promo", spot: "promo", text: "🎉 全館 9 折" },
      { kind: "price", spot: "price", text: "原價 12,800，特價 990", original: "12,800", sale: "990", badge: "1 折" },
      { kind: "alert", spot: "timer", text: "⏰ 只剩 3 件！" },
      { kind: "review", spot: "reviews", text: "★★★★★ 999 則好評，全在同一天" },
      { kind: "row", spot: "payment", label: "付款", text: "只能 ATM 轉帳" },
      { kind: "row", spot: "delivery", label: "配送", text: "宅配到府" },
      { kind: "buttons", spot: "buy", text: "放入購物車、直接購買" },
    ],
    spots: {
      url: { flag: true, label: "網址是假的", tip: "不是官網，用 0 冒充 o。" },
      photo: { flag: false, label: "商品照片", tip: "照片好看，看不出真假。" },
      name: { flag: false, label: "商品名稱", tip: "名稱看不出真假。" },
      promo: { flag: false, label: "9 折活動", tip: "9 折活動很常見，沒問題。" },
      price: { flag: true, label: "價格太便宜", tip: "1 折太誇張，是誘餌。" },
      timer: { flag: true, label: "催你快買", tip: "催你快買，不讓你想。" },
      reviews: { flag: true, label: "假好評", tip: "好評全在同一天，是灌的。" },
      payment: { flag: true, label: "只能轉帳", tip: "只收轉帳，被騙追不回。" },
      delivery: { flag: false, label: "宅配到府", tip: "宅配很常見，沒問題。" },
      buy: { flag: false, label: "購買按鈕", tip: "按鈕正常，先別急著按。" },
    },
  },
  "shop-scam-2": {
    platform: "haipi",
    parts: [
      { kind: "url", spot: "url", text: "haipi.example" },
      { kind: "image", spot: "photo", art: "shoe", text: "運動鞋圖片" },
      { kind: "name", spot: "name", text: "氣墊運動鞋" },
      { kind: "price", spot: "price", text: "原價 1,880，特價 1,690", original: "1,880", sale: "1,690", badge: "9 折" },
      { kind: "seller", spot: "seller", name: "潮鞋小舖", text: "昨天開店・0 則評價" },
      { kind: "row", spot: "payment", label: "付款", text: "信用卡、貨到付款" },
      { kind: "row", spot: "delivery", label: "運送", text: "超商取貨" },
      { kind: "buttons", spot: "buy", text: "加入購物車、直接購買" },
      { kind: "section", text: "聊聊" },
      { kind: "chat", spot: "offplatform", who: "賣家", text: "加我 LINE 私下買，再打 9 折！" },
      { kind: "chat", spot: "account", who: "賣家", text: "匯到我的帳戶：王○○（虛構）" },
      { kind: "system", spot: "notice", text: "【嗨皮提醒】請勿私下交易" },
    ],
    spots: {
      url: { flag: false, label: "嗨皮網址", tip: "這是嗨皮官網，沒問題。" },
      photo: { flag: false, label: "商品照片", tip: "照片正常，沒問題。" },
      name: { flag: false, label: "商品名稱", tip: "名稱正常，沒問題。" },
      price: { flag: false, label: "價格合理", tip: "打 9 折很正常。" },
      seller: { flag: true, label: "全新賣場", tip: "昨天開店又沒評價。" },
      payment: { flag: false, label: "平台付款", tip: "在嗨皮付款有保障。" },
      delivery: { flag: false, label: "超商取貨", tip: "超商取貨很常見。" },
      buy: { flag: false, label: "購買按鈕", tip: "在嗨皮下單才安全。" },
      offplatform: { flag: true, label: "叫你私下交易", tip: "離開嗨皮，就沒有保障。" },
      account: { flag: true, label: "匯到個人帳戶", tip: "錢被騙走，很難追回。" },
      notice: { flag: false, label: "嗨皮提醒", tip: "這是嗨皮的提醒，要聽它的。" },
    },
  },
  "shop-scam-3": {
    platform: "haipi",
    parts: [
      { kind: "url", spot: "url", text: "haipi.example" },
      { kind: "image", spot: "photo", art: "bag", text: "後背包圖片" },
      { kind: "name", spot: "name", text: "防潑水後背包" },
      { kind: "price", spot: "price", text: "原價 990，特價 890", original: "990", sale: "890", badge: "9 折" },
      { kind: "seller", spot: "seller", name: "包包大王", text: "今天剛改名・0 則評價" },
      { kind: "row", spot: "payment", label: "付款", text: "信用卡、貨到付款" },
      { kind: "buttons", spot: "buy", text: "加入購物車、直接購買" },
      { kind: "section", text: "聊聊" },
      { kind: "chat", spot: "blocked", who: "賣家", text: "你的帳號沒開通金流，不能下單" },
      { kind: "chat", spot: "link", who: "賣家", text: "點這裡找客服認證：haipi-pay.example" },
      { kind: "section", text: "點開連結後：" },
      { kind: "form", spot: "card", text: "請輸入卡號、背面 3 碼、驗證碼" },
    ],
    spots: {
      url: { flag: false, label: "嗨皮網址", tip: "這是嗨皮官網，沒問題。" },
      photo: { flag: false, label: "商品照片", tip: "照片正常，沒問題。" },
      name: { flag: false, label: "商品名稱", tip: "名稱正常，沒問題。" },
      price: { flag: false, label: "價格合理", tip: "打 9 折很正常。" },
      seller: { flag: true, label: "可疑賣家", tip: "剛改名又沒評價。" },
      payment: { flag: false, label: "平台付款", tip: "在嗨皮付款有保障。" },
      buy: { flag: false, label: "購買按鈕", tip: "在嗨皮下單才安全。" },
      blocked: { flag: true, label: "說你不能下單", tip: "這是假客服的開場白。" },
      link: { flag: true, label: "聊天裡的連結", tip: "不是嗨皮官網，不要點。" },
      card: { flag: true, label: "要卡號驗證碼", tip: "卡號和驗證碼絕不能給。" },
    },
  },
};

export function flagIds(scene) {
  return Object.entries(scene?.spots || {})
    .filter(([, spot]) => spot.flag)
    .map(([id]) => id);
}
