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
