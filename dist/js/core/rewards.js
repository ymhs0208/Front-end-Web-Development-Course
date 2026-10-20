// Rewards encourage participation. Repeating the same question does not add stars.
export function getRewards(attempts, questions) {
  const validIds = new Set(questions.map((q) => q.id));
  const completed = new Set(
    attempts.filter((a) => validIds.has(a.id)).map((a) => a.id),
  );
  const categories = new Set(
    questions.filter((q) => completed.has(q.id)).map((q) => q.type),
  );
  const categoryTotal = new Set(questions.map((q) => q.type)).size;
  const total = questions.length;
  const stars = completed.size;
  const badges = [
    {
      id: "first",
      title: "踏出第一步",
      description: "完成第一個情境",
      earned: stars >= 1,
      icon: "step",
    },
    {
      id: "three",
      title: "認真練習",
      description: "完成 3 個不同情境",
      earned: stars >= 3,
      icon: "star",
    },
    {
      id: "types",
      title: "生活守護者",
      description: "三種情境都練過",
      earned: categoryTotal > 0 && categories.size === categoryTotal,
      icon: "shield",
    },
    {
      id: "all",
      title: "安心小達人",
      description: "完成全部情境",
      earned: total > 0 && stars === total,
      icon: "medal",
    },
  ];
  return {
    stars,
    total,
    badges,
    earned: badges.filter((b) => b.earned).length,
  };
}

// Growth follows unique completed questions, using the same real star count.
export function getCompanion(stars, total) {
  const complete = total > 0 && stars >= total;
  const grown = stars >= 3;
  const next =
    stars < 1 ? Math.min(1, total) : stars < 3 ? Math.min(3, total) : total;
  return {
    stage: complete ? "guardian" : grown ? "helper" : "friend",
    title: complete ? "安心守護隊長" : grown ? "勇敢防詐夥伴" : "小小安心夥伴",
    message: complete
      ? "全部情境都練過了，真棒！"
      : grown
        ? "越練越安心，我陪你一起！"
        : "你好呀！我們一起學防詐。",
    remaining: Math.max(0, next - stars),
    goal: complete
      ? "安心星收集完成！"
      : stars < 1
        ? "拿到第一顆星"
        : stars < 3
          ? "讓夥伴披上披風"
          : "讓夥伴戴上皇冠",
  };
}
