// Keep an in-progress exercise through refreshes without recording answers twice.
const KEY = "vault-exercise-v1";
export function validateDraft(draft, questions) {
  if (
    !draft ||
    !Array.isArray(draft.ids) ||
    !draft.ids.length ||
    draft.ids.length > 3
  )
    return null;
  const selected = draft.ids.map((id) => questions.find((q) => q.id === id));
  if (selected.some((q) => !q) || new Set(draft.ids).size !== draft.ids.length)
    return null;
  if (
    !Number.isInteger(draft.index) ||
    draft.index < 0 ||
    draft.index >= selected.length
  )
    return null;
  if (
    typeof draft.answered !== "boolean" ||
    typeof draft.complete !== "boolean"
  )
    return null;
  if (draft.answered && typeof draft.correct !== "boolean") return null;
  const answeredCount = draft.index + Number(draft.answered);
  if (
    !Number.isInteger(draft.score) ||
    draft.score < 0 ||
    draft.score > answeredCount
  )
    return null;
  if (
    draft.complete &&
    (!draft.answered || draft.index !== selected.length - 1)
  )
    return null;
  return {
    qs: selected,
    index: draft.index,
    score: draft.score,
    answered: draft.answered,
    complete: draft.complete,
    correct: draft.correct,
    questionView: draft.questionView === "choose" ? "choose" : "read",
    readerOffset:
      Number.isInteger(draft.readerOffset) && draft.readerOffset >= 0
        ? draft.readerOffset
        : 0,
    readerHistory: Array.isArray(draft.readerHistory)
      ? draft.readerHistory.filter((x) => Number.isInteger(x) && x >= 0)
      : [],
  };
}
export function restoreSession(questions) {
  try {
    return validateDraft(JSON.parse(sessionStorage.getItem(KEY)), questions);
  } catch {
    return null;
  }
}
export function saveSession(session) {
  try {
    if (!session) sessionStorage.removeItem(KEY);
    else
      sessionStorage.setItem(
        KEY,
        JSON.stringify({
          ids: session.qs.map((q) => q.id),
          index: session.index,
          score: session.score,
          answered: session.answered,
          complete: session.complete,
          correct: session.correct,
          questionView: session.questionView,
          readerOffset: session.readerOffset,
          readerHistory: session.readerHistory,
        }),
      );
  } catch {
    /* A blocked session store must not stop the exercise. */
  }
}
