import { $ } from "./dom.js?v=job-9-4";
import { home } from "../pages/home.js?v=job-9-4";
import { practice } from "../pages/practice.js?v=shop-2";
import { mistakePage } from "../pages/mistakes.js?v=job-9-4";
import { rewardsPage } from "../pages/rewards.js?v=job-9-4";
import { guide } from "../pages/guide.js?v=job-9-4";
import { stopSpeech } from "../features/accessibility.js?v=job-9-4";
export function createRouter(exercise, shop) {
  function render() {
    const session = exercise.getSession();
    let key = location.hash.slice(1) || "home";
    if (key === "review") {
      history.replaceState(null, "", "#rewards");
      key = "rewards";
    }
    if (key === "explanation" && !exercise.canShowExplanation()) {
      history.replaceState(null, "", "#practice");
      key = "practice";
    }
    if (key === "exercise" && !session) {
      history.replaceState(null, "", "#practice");
      key = "practice";
    }
    document.body.classList.toggle(
      "is-exercising",
      key === "exercise" || key === "explanation",
    );
    document.body.classList.toggle("is-home", key === "home");
    document.body.classList.toggle("is-shopping", key === "shop");
    $("#backBar").hidden = key === "home" || key === "explanation";
    const pages = {
      home,
      practice,
      mistakes: mistakePage,
      rewards: rewardsPage,
      guide,
    };
    if (key === "exercise" || key === "explanation") {
      $("#main").innerHTML =
        `<section class="exercise-page"><div class="exercise-shell" id="quizBody"></div></section>`;
      exercise.render();
    } else if (key === "shop" && shop) {
      $("#main").innerHTML =
        `<section class="exercise-page shop-page"><div class="exercise-shell" id="shopBody"></div></section>`;
      shop.render();
    } else {
      $("#main").innerHTML = (pages[key] || home)();
    }
    document.querySelectorAll("nav a").forEach((a) => {
      const active =
        a.hash ===
        "#" +
          (key === "exercise" || key === "explanation" || key === "shop"
            ? "practice"
            : key === "mistakes"
              ? "rewards"
              : key);
      a.classList.toggle("active", active);
      if (active) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    document.title =
      ({
        home: "安心學防詐",
        practice: "情境練習",
        exercise: session?.complete ? "練習成果" : "正在練習",
        explanation: "作答解析",
        shop: "假購物網站找碴",
        mistakes: "錯題筆記",
        rewards: "我的獎勵",
        guide: "使用說明",
      }[key] || "安心學防詐") + "｜金庫防爆特攻隊";
  }
  function init() {
    window.addEventListener("hashchange", () => {
      stopSpeech();
      render();
      window.scrollTo(0, 0);
      $("#main").focus({ preventScroll: true });
    });
    window.addEventListener("vault:result-saved", () => {
      if (!["#exercise", "#shop"].includes(location.hash)) render();
    });
    render();
  }
  return { render, init };
}
