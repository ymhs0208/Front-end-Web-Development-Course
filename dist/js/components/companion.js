// Rounded SVG mascot stays sharp when text or the browser is enlarged.
export function companion(stage) {
  const cape = stage === "helper" || stage === "guardian";
  const crown = stage === "guardian";
  return `<svg class="companion-art" viewBox="0 0 260 240" role="img" aria-label="${crown ? "戴皇冠的" : cape ? "披著披風的" : "微笑的"}圓滾滾安心星夥伴">
    <ellipse cx="130" cy="219" rx="66" ry="9" fill="#e9e0cf"/>
    ${cape ? '<path d="M92 116Q70 148 61 202q34-12 69-3 35-9 69 3-9-54-31-86Z" fill="#b8a2dc" stroke="#65507e" stroke-width="5" stroke-linejoin="round"/>' : ""}
    <ellipse cx="103" cy="207" rx="17" ry="10" fill="#f4c96e" stroke="#80572e" stroke-width="5"/>
    <ellipse cx="157" cy="207" rx="17" ry="10" fill="#f4c96e" stroke="#80572e" stroke-width="5"/>
    <path d="M63 123q-23-13-25 1t25 23m134-24q20-24 27-12t-22 33" fill="#ffe29a" stroke="#80572e" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M112 49Q130 15 148 49l15 27 34 5q36 5 13 33l-24 27 4 36q4 34-27 20l-33-15-33 15q-31 14-27-20l4-36-24-27Q27 86 63 81l34-5Z" fill="#ffe29a" stroke="#80572e" stroke-width="5" stroke-linejoin="round"/>
    <path d="M105 79q8-18 17-25" fill="none" stroke="#fff5d6" stroke-width="8" stroke-linecap="round"/>
    <ellipse cx="91" cy="139" rx="16" ry="10" fill="#edaa98"/>
    <ellipse cx="169" cy="139" rx="16" ry="10" fill="#edaa98"/>
    <ellipse cx="106" cy="122" rx="9" ry="13" fill="#49382e"/>
    <ellipse cx="154" cy="122" rx="9" ry="13" fill="#49382e"/>
    <circle cx="103" cy="117" r="3.5" fill="#fff"/><circle cx="151" cy="117" r="3.5" fill="#fff"/>
    <path d="M119 142q11 17 22 0" fill="#d87d78" stroke="#684738" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${cape ? '<path d="m130 171-12-7v16l12-6 12 6v-16Z" fill="#8c70b7" stroke="#65507e" stroke-width="3" stroke-linejoin="round"/><circle cx="130" cy="172" r="4" fill="#fff0bf"/>' : ""}
    ${crown ? '<path d="m103 53-5-29 21 12 11-23 11 23 21-12-5 29Z" fill="#efc36b" stroke="#80572e" stroke-width="5" stroke-linejoin="round"/><circle cx="130" cy="44" r="4" fill="#b795d8"/>' : ""}
  </svg>`;
}
