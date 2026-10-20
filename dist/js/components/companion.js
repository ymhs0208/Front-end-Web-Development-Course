// Code-native illustration: no external image or loading dependency.
export function companion(stage) {
  const cape = stage !== "friend";
  const crown = stage === "guardian";
  return `<svg class="companion-art" viewBox="0 0 260 240" role="img" aria-label="${crown ? "戴皇冠的" : cape ? "披著披風的" : "微笑的"}安心星夥伴"><ellipse cx="130" cy="219" rx="71" ry="10" fill="#e6d7b2"/>
  ${cape ? '<path d="M90 110 55 201q75-20 150 0l-35-91" fill="#80bba9" stroke="#306d5b" stroke-width="4"/>' : ""}
  <path d="m87 166-9 38m95-38 9 38" stroke="#8c612a" stroke-width="12" stroke-linecap="round"/>
  <path d="m71 122-24 15m142-15 24-15" stroke="#8c612a" stroke-width="11" stroke-linecap="round"/>
  <path d="M130 33q8 0 12 13l17 36 40 6q20 3 6 19l-29 30 6 43q3 20-16 11l-36-19-36 19q-19 9-16-11l6-43-29-30q-14-16 6-19l40-6 17-36q4-13 12-13Z" fill="#ffda78" stroke="#8c612a" stroke-width="4" stroke-linejoin="round"/>
  <ellipse cx="102" cy="125" rx="11" ry="7" fill="#efa58e"/><ellipse cx="158" cy="125" rx="11" ry="7" fill="#efa58e"/>
  <path d="M108 108v7m44-7v7m-34 14q12 14 24 0" fill="none" stroke="#61472e" stroke-width="5" stroke-linecap="round"/>
  ${crown ? '<path d="m101 49-6-27 23 12 12-22 12 22 23-12-6 27Z" fill="#efa85d" stroke="#8c612a" stroke-width="4" stroke-linejoin="round"/>' : ""}
  <g fill="#c98237"><path d="m36 54 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"/><path d="m218 151 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"/></g></svg>`;
}
