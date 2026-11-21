/* Pape Family Recipes: a static site (no server) built from the Python version.
   Nutrition, portion scaling and the "what can I make" matcher are ported from Recipe.py. */

/* ---------- language ---------- */
const LANG_KEY = "pape.lang";
let lang = (() => {
  try { const s = localStorage.getItem(LANG_KEY); if (s === "en" || s === "nl") return s; } catch (e) {}
  return /^nl\b/i.test((navigator.languages || [navigator.language || "en"])[0] || "") ? "nl" : "en";
})();

const T = {
  en: {
    sub: "Cooked at home, written down to keep",
    recipes: "Recipes", make: "What can I make?",
    eyebrow: "From our kitchen", heroTitle: "The recipes we keep coming back to.",
    heroText: "Family favorites and everyday staples, with portions you can scale and nutrition worked out for you. In English and Dutch.",
    all: "All", search: "Search recipes", empty: "No recipes match that search.",
    serves: n => `Serves ${n}`, perServing: "per serving",
    storyTitle: "About these recipes",
    storyText: "These are the dishes we cook at home and want to keep. Some are passed down in the family, some we picked up along the way. Every recipe is in English and Dutch, so everyone can cook them.",
    back: "All recipes", ingredients: "Ingredients",
    servings: n => n === 1 ? "1 serving" : `${n} servings`, fewer: "Fewer servings", more: "More servings",
    nutrition: "Nutrition per serving", calories: "kcal", protein: "Protein", carbs: "Carbs", fat: "Fat",
    estimate: "Estimates, worked out from the ingredients listed.",
    method: "Method", stepHint: "Tap a step to tick it off.",
    makeTitle: "What can I make?",
    makeText: "Tick what you have. Add an amount if you know it, and we'll work out how many servings you can make.",
    have: "What you have", results: "What you can make",
    pickSome: "Tick a few ingredients to see what you can make.",
    full: "You have everything", some: n => `About ${n} ${n === 1 ? "serving" : "servings"} with what you have`, none: "Missing ingredients",
    missing: "Still need", amount: "Amount", optional: "optional", plenty: "No amount means you have plenty.",
    clear: "Clear all", view: "View recipe",
    needMore: (name, g) => `${name}: about ${g} g more`,
    notFound: "We couldn't find that recipe.", loading: "Loading recipes…", loadError: "Couldn't load the recipes. Reload the page to try again.",
    title: "Pape Family Recipes"
  },
  nl: {
    sub: "Thuis gekookt, opgeschreven om te bewaren",
    recipes: "Recepten", make: "Wat kan ik maken?",
    eyebrow: "Uit onze keuken", heroTitle: "De recepten waar we steeds op terugkomen.",
    heroText: "Familiefavorieten en vaste klassiekers, met porties die je kunt aanpassen en de voedingswaarde al uitgerekend. In het Nederlands en Engels.",
    all: "Alles", search: "Zoek recepten", empty: "Geen recepten gevonden.",
    serves: n => `Voor ${n} personen`, perServing: "per portie",
    storyTitle: "Over deze recepten",
    storyText: "Dit zijn de gerechten die we thuis koken en willen bewaren. Sommige gaan al generaties mee in de familie, andere hebben we onderweg opgepikt. Elk recept staat er in het Nederlands en Engels, zodat iedereen ze kan maken.",
    back: "Alle recepten", ingredients: "Ingrediënten",
    servings: n => n === 1 ? "1 portie" : `${n} porties`, fewer: "Minder porties", more: "Meer porties",
    nutrition: "Voedingswaarde per portie", calories: "kcal", protein: "Eiwit", carbs: "Koolh.", fat: "Vet",
    estimate: "Schattingen, uitgerekend op basis van de ingrediënten.",
    method: "Bereiding", stepHint: "Tik op een stap om hem af te vinken.",
    makeTitle: "Wat kan ik maken?",
    makeText: "Vink aan wat je in huis hebt. Vul een hoeveelheid in als je die weet, dan rekenen we uit hoeveel porties je kunt maken.",
    have: "Wat je in huis hebt", results: "Wat je kunt maken",
    pickSome: "Vink een paar ingrediënten aan om te zien wat je kunt maken.",
    full: "Je hebt alles", some: n => `Ongeveer ${n} ${n === 1 ? "portie" : "porties"} met wat je hebt`, none: "Ingrediënten ontbreken",
    missing: "Nog nodig", amount: "Hoeveelheid", optional: "optioneel", plenty: "Geen hoeveelheid betekent: genoeg in huis.",
    clear: "Alles wissen", view: "Bekijk recept",
    needMore: (name, g) => `${name}: nog ongeveer ${g} g`,
    notFound: "Dit recept bestaat niet.", loading: "Recepten laden…", loadError: "Kon de recepten niet laden. Herlaad de pagina.",
    title: "Recepten van de familie Pape"
  }
};
const t = (k, ...a) => { const v = T[lang][k] ?? T.en[k]; return typeof v === "function" ? v(...a) : v; };
const L = o => (o && typeof o === "object") ? (o[lang] ?? o.en) : (o ?? "");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const numFmt = (n, max = 2) => n.toLocaleString(lang === "nl" ? "nl-NL" : "en-US", { maximumFractionDigits: max });

/* ---------- units and amounts ---------- */
const UNITS = {
  cup: { en: ["cup", "cups"], nl: ["kopje", "kopjes"] },
  tbsp: { en: ["tbsp", "tbsp"], nl: ["el", "el"] },
  tsp: { en: ["tsp", "tsp"], nl: ["tl", "tl"] },
  clove: { en: ["clove", "cloves"], nl: ["teentje", "teentjes"] },
  unit: { en: ["", ""], nl: ["", ""] }
};
const unitLabel = (u, n) => UNITS[u] ? UNITS[u][lang][n > 1 ? 1 : 0] : u;
const COUNTABLE = new Set(["cup", "tbsp", "tsp", "clove", "unit"]);
const FRACTIONS = [[0, ""], [1 / 4, "¼"], [1 / 3, "⅓"], [1 / 2, "½"], [2 / 3, "⅔"], [3 / 4, "¾"], [1, ""]];

function fmtAmount(n, unit) {
  if (unit === "g" || unit === "ml") return numFmt(n >= 10 ? Math.round(n) : Math.round(n * 10) / 10, 1);
  if (COUNTABLE.has(unit)) {
    let whole = Math.floor(n), frac = n - whole;
    const [val, glyph] = FRACTIONS.reduce((best, f) => Math.abs(f[0] - frac) < Math.abs(best[0] - frac) ? f : best);
    if (Math.abs(val - frac) <= 0.05) {
      if (val === 1) { whole += 1; return String(whole); }
      return whole ? `${whole}${glyph}` : (glyph || "0");
    }
  }
  return numFmt(n, 2);
}

/* ---------- data ---------- */
let DB = null, ING = null, loadFailed = false;
const ingName = (key, n = 1) => { const i = ING[key]; if (!i) return key; return n > 1 && i.plural ? L(i.plural) : L(i.name); };

// grams for a recipe line, as Recipe.py does it: "g" as-is, otherwise amount x grams_per_unit
function lineGrams(line) {
  if (line.unit === "g") return line.amount;
  const gpu = ING[line.key]?.grams_per_unit;
  return gpu ? line.amount * gpu : 0;
}
function perServing(recipe) {
  const tot = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  recipe.ingredients.forEach(line => {
    const i = ING[line.key]; if (!i) return;
    const f = lineGrams(line) / 100;
    tot.calories += i.calories_per_100g * f; tot.protein += i.protein_per_100g * f;
    tot.carbs += i.carbs_per_100g * f; tot.fat += i.fat_per_100g * f;
  });
  return Object.fromEntries(Object.entries(tot).map(([k, v]) => [k, v / recipe.servings]));
}

/* ---------- "what can I make" (ported from recipe_status in Recipe.py) ---------- */
const WEIGHT_TO_GRAMS = { g: 1, kg: 1000, oz: 28.35, lb: 453.6 };
function toGrams(amount, unit, key) {
  if (unit in WEIGHT_TO_GRAMS) return amount * WEIGHT_TO_GRAMS[unit];
  const i = ING[key];
  if (i && i.default_unit === unit && i.grams_per_unit) return amount * i.grams_per_unit;
  return null;
}
function recipeStatus(recipe, have) {
  const ratios = [], missing = [];
  recipe.ingredients.forEach(line => {
    const need = lineGrams(line);
    const h = have[line.key];
    if (!h) { ratios.push(0); missing.push(`${ingName(line.key, line.amount)} (${fmtAmount(line.amount, line.unit)}${unitLabel(line.unit, line.amount) ? " " + unitLabel(line.unit, line.amount) : ""})`); return; }
    if (h.amount === "" || h.amount == null || isNaN(h.amount)) { ratios.push(1); return; } // ticked, no amount: plenty
    const got = toGrams(Number(h.amount), h.unit, line.key) ?? 0;
    ratios.push(need ? Math.min(got / need, 1) : 1);
    if (got < need) missing.push(t("needMore", ingName(line.key), Math.round(need - got)));
  });
  const full = ratios.length > 0 && ratios.every(r => r >= 1);
  const limit = ratios.length ? Math.min(...ratios) : 0;
  return { recipe, full, missing, maxServings: Math.floor(recipe.servings * limit), limit };
}

/* ---------- state ---------- */
const state = { cat: "all", q: "", servings: {}, done: {}, have: {} };
try { state.have = JSON.parse(localStorage.getItem("pape.have") || "{}") || {}; } catch (e) {}
const saveHave = () => { try { localStorage.setItem("pape.have", JSON.stringify(state.have)); } catch (e) {} };

/* ---------- icons ---------- */
const ICON = {
  pot: '<svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 28h44v12a14 14 0 0 1-14 14H24a14 14 0 0 1-14-14z"/><path d="M6 28h52M24 20c0-3 3-3 3-6M32 20c0-3 3-3 3-6M40 20c0-3 3-3 3-6"/></svg>',
  chili: '<svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M44 18c-6 0-10 4-12 10-3 9-9 18-22 22 16 4 34-2 40-16 2-6 0-12-6-16z"/><path d="M44 18c0-4 2-7 6-8M44 18c3 0 6 2 7 5"/></svg>',
  users: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.5 3.3-5.5 6.5-5.5s5.9 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .6 3.3 2.4 3.6 5.2"/></svg>',
  clock: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  flame: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-4 2-7 2 1 3 3 3 5 1-2 1-6 1-9z"/></svg>',
  back: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  book: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/></svg>',
  basket: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h18l-2 10H5zM8 10l3-6M16 10l-3-6"/></svg>'
};
const catArt = c => c === "salsas" ? { bg: "var(--salsas)", icon: ICON.chili } : { bg: "var(--mains)", icon: ICON.pot };

/* ---------- views ---------- */
const route = () => {
  const h = location.hash;
  const m = h.match(/^#\/recipe\/([\w-]+)/);
  if (m) return { page: "recipe", id: m[1] };
  if (/^#\/make/.test(h)) return { page: "make" };
  return { page: "home" };
};

function chrome(r) {
  document.documentElement.lang = lang;
  document.title = r.page === "recipe" && DB ? `${L(DB.recipes.find(x => x.id === r.id)?.name) || t("title")} · ${t("title")}` : r.page === "make" ? `${t("make")} · ${t("title")}` : t("title");
  document.getElementById("brand-name").textContent = t("title");
  document.getElementById("brand-sub").textContent = t("sub");
  document.querySelectorAll(".lang button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  const cur = r.page === "make" ? "make" : "recipes";
  const links = [["recipes", "#/", t("recipes"), ICON.book], ["make", "#/make", t("make"), ICON.basket]];
  document.getElementById("nav").innerHTML = links.map(([k, href, label]) => `<a href="${href}"${cur === k ? ' aria-current="page"' : ""}>${esc(label)}</a>`).join("");
  document.getElementById("tabbar").innerHTML = links.map(([k, href, label, icon]) => `<a href="${href}"${cur === k ? ' aria-current="page"' : ""}>${icon}<span>${esc(label)}</span></a>`).join("");
  document.getElementById("foot").innerHTML = `${esc(t("title"))} · <a href="../">Going Dutch</a>`;
}

function card(r) {
  const art = catArt(r.category), n = perServing(r);
  return `<a class="card" href="#/recipe/${r.id}">
    <div class="art" style="background:${art.bg}"><span class="tag">${esc(L(DB.categories.find(c => c.id === r.category)?.name))}</span>${art.icon}</div>
    <div class="body">
      <h3 class="serif">${esc(L(r.name))}</h3>
      <p>${esc(L(r.intro))}</p>
      <div class="meta"><span>${ICON.users}${esc(t("serves", r.servings))}</span>${r.time ? `<span>${ICON.clock}${esc(L(r.time))}</span>` : ""}<span>${ICON.flame}${numFmt(Math.round(n.calories), 0)} kcal ${esc(t("perServing"))}</span></div>
    </div>
  </a>`;
}

function homeGrid() {
  const q = state.q.trim().toLowerCase();
  const list = DB.recipes.filter(r => (state.cat === "all" || r.category === state.cat) &&
    (!q || [L(r.name), L(r.intro), ...r.ingredients.map(i => ingName(i.key))].join(" ").toLowerCase().includes(q)));
  return list.length ? list.map(card).join("") : `<div class="empty">${esc(t("empty"))}</div>`;
}

function viewHome() {
  return `<section class="hero">
      <div class="eyebrow">${esc(t("eyebrow"))}</div>
      <h1 class="serif">${esc(t("heroTitle"))}</h1>
      <p>${esc(t("heroText"))}</p>
    </section>
    <div class="toolbar">
      ${[{ id: "all", name: t("all") }, ...DB.categories].map(c => `<button type="button" class="chip" data-cat="${c.id}" aria-pressed="${state.cat === c.id}">${esc(L(c.name))}</button>`).join("")}
      <input class="search" type="search" id="q" placeholder="${esc(t("search"))}" aria-label="${esc(t("search"))}" value="${esc(state.q)}">
    </div>
    <div class="grid" id="grid">${homeGrid()}</div>
    <section class="story"><h2 class="serif">${esc(t("storyTitle"))}</h2><p>${esc(t("storyText"))}</p></section>`;
}

function viewRecipe(id) {
  const r = DB.recipes.find(x => x.id === id);
  if (!r) return `<a class="back" href="#/">${ICON.back}${esc(t("back"))}</a><div class="empty">${esc(t("notFound"))}</div>`;
  const s = state.servings[id] || r.servings, factor = s / r.servings, n = perServing(r);
  const done = state.done[id] || [];
  const steps = L(r.steps) || [];
  return `<a class="back" href="#/">${ICON.back}${esc(t("back"))}</a>
    <div class="r-head">
      <div class="eyebrow">${esc(L(DB.categories.find(c => c.id === r.category)?.name))}</div>
      <h1 class="serif">${esc(L(r.name))}</h1>
      <p>${esc(L(r.intro))}</p>
      <div class="meta"><span>${ICON.users}${esc(t("serves", r.servings))}</span>${r.time ? `<span>${ICON.clock}${esc(L(r.time))}</span>` : ""}</div>
    </div>
    <div class="r-layout">
      <div class="r-side">
        <section class="panel">
          <h2 class="serif">${esc(t("ingredients"))}</h2>
          <div class="stepper">
            <button type="button" data-serv="-1" aria-label="${esc(t("fewer"))}" ${s <= 1 ? "disabled" : ""}>−</button>
            <output aria-live="polite">${esc(t("servings", s))}</output>
            <button type="button" data-serv="1" aria-label="${esc(t("more"))}" ${s >= 40 ? "disabled" : ""}>+</button>
          </div>
          <ul class="ings">${r.ingredients.map(line => {
            const amt = line.amount * factor, u = unitLabel(line.unit, amt);
            return `<li><span class="amt">${fmtAmount(amt, line.unit)}${u ? " " + esc(u) : ""}</span><span>${esc(ingName(line.key, line.unit === "unit" ? amt : 1))}</span></li>`;
          }).join("")}</ul>
        </section>
        <section class="panel" style="margin-top:16px">
          <h2 class="serif">${esc(t("nutrition"))}</h2>
          <div class="nutri">
            <div><b>${numFmt(Math.round(n.calories), 0)}</b><span>${esc(t("calories"))}</span></div>
            <div><b>${numFmt(Math.round(n.protein), 0)} g</b><span>${esc(t("protein"))}</span></div>
            <div><b>${numFmt(Math.round(n.carbs), 0)} g</b><span>${esc(t("carbs"))}</span></div>
            <div><b>${numFmt(Math.round(n.fat), 0)} g</b><span>${esc(t("fat"))}</span></div>
          </div>
          <p class="hint">${esc(t("estimate"))}</p>
        </section>
      </div>
      <section class="panel">
        <h2 class="serif">${esc(t("method"))}</h2>
        <ol class="steps">${steps.map((st, i) => `<li><button type="button" data-step="${i}" aria-pressed="${done.includes(i)}">${esc(st)}</button></li>`).join("")}</ol>
        <p class="hint">${esc(t("stepHint"))}</p>
      </section>
    </div>`;
}

function haveUnits(key) {
  const d = ING[key]?.default_unit;
  return [...new Set([d, "g", "kg", "lb", "oz"].filter(Boolean))];
}
function makeResults() {
  const keys = Object.keys(state.have);
  if (!keys.length) return `<div class="empty">${esc(t("pickSome"))}</div>`;
  const res = DB.recipes.map(r => recipeStatus(r, state.have))
    .sort((a, b) => (b.full - a.full) || (b.limit - a.limit) || (a.missing.length - b.missing.length));
  return res.map(x => `<a class="result" href="#/recipe/${x.recipe.id}">
      <div class="top"><h3 class="serif">${esc(L(x.recipe.name))}</h3>
        <span class="badge ${x.full ? "ok" : x.maxServings > 0 ? "some" : "none"}">${x.full ? "✓ " + esc(t("full")) : x.maxServings > 0 ? esc(t("servings", x.maxServings)) : esc(t("none"))}</span></div>
      ${!x.full && x.maxServings > 0 ? `<div class="muted" style="font-size:14px">${esc(t("some", x.maxServings))}</div>` : ""}
      ${x.missing.length ? `<ul>${x.missing.map(m => `<li>${esc(m)}</li>`).join("")}</ul>` : ""}
    </a>`).join("");
}
function viewMake() {
  const keys = Object.keys(ING).sort((a, b) => ingName(a).localeCompare(ingName(b), lang));
  return `<section class="hero" style="padding-bottom:0">
      <div class="eyebrow">${esc(t("make"))}</div>
      <h1 class="serif" style="font-size:clamp(32px,6vw,48px)">${esc(t("makeTitle"))}</h1>
      <p>${esc(t("makeText"))}</p>
    </section>
    <div class="make-layout">
      <section class="panel">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><h2 class="serif" style="margin:0">${esc(t("have"))}</h2>
          ${Object.keys(state.have).length ? `<button type="button" class="btn ghost" data-clear="1">${esc(t("clear"))}</button>` : ""}</div>
        <p class="hint" style="margin:4px 0 8px">${esc(t("plenty"))}</p>
        <ul class="have">${keys.map(k => {
          const h = state.have[k];
          return `<li><label><input type="checkbox" data-have="${esc(k)}" ${h ? "checked" : ""}>${esc(ingName(k))}</label>
            ${h ? `<div class="qty"><input type="number" inputmode="decimal" min="0" step="any" data-amt="${esc(k)}" value="${esc(h.amount ?? "")}" placeholder="${esc(t("amount"))} (${esc(t("optional"))})" aria-label="${esc(t("amount"))} ${esc(ingName(k))}">
              <select data-unit="${esc(k)}" aria-label="Unit">${haveUnits(k).map(u => `<option value="${u}" ${h.unit === u ? "selected" : ""}>${esc(unitLabel(u, 2) || (lang === "nl" ? "stuks" : "pieces"))}</option>`).join("")}</select></div>` : ""}
          </li>`;
        }).join("")}</ul>
      </section>
      <section class="panel"><h2 class="serif">${esc(t("results"))}</h2><div id="results">${makeResults()}</div></section>
    </div>`;
}

/* ---------- render + events ---------- */
const app = document.getElementById("app");
function render() {
  const r = route();
  chrome(r);
  if (loadFailed) { app.innerHTML = `<div class="empty">${esc(t("loadError"))}</div>`; return; }
  if (!DB) { app.innerHTML = `<div class="empty">${esc(t("loading"))}</div>`; return; }
  app.innerHTML = r.page === "recipe" ? viewRecipe(r.id) : r.page === "make" ? viewMake() : viewHome();
}

window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });
document.querySelectorAll(".lang button").forEach(b => b.addEventListener("click", () => {
  lang = b.dataset.lang; try { localStorage.setItem(LANG_KEY, lang); } catch (e) {} render();
}));
app.addEventListener("click", e => {
  const el = e.target.closest("[data-cat],[data-serv],[data-step],[data-clear]");
  if (!el) return;
  const r = route();
  if (el.dataset.cat) { state.cat = el.dataset.cat; render(); }
  else if (el.dataset.serv) {
    const rec = DB.recipes.find(x => x.id === r.id);
    state.servings[r.id] = Math.max(1, Math.min(40, (state.servings[r.id] || rec.servings) + Number(el.dataset.serv)));
    render();
  } else if (el.dataset.step) {
    const i = Number(el.dataset.step), d = state.done[r.id] || (state.done[r.id] = []);
    const at = d.indexOf(i); if (at >= 0) d.splice(at, 1); else d.push(i);
    el.setAttribute("aria-pressed", String(at < 0));
  } else if (el.dataset.clear) { state.have = {}; saveHave(); render(); }
});
app.addEventListener("input", e => {
  if (e.target.id === "q") { state.q = e.target.value; document.getElementById("grid").innerHTML = homeGrid(); }
  else if (e.target.dataset.amt) {
    const k = e.target.dataset.amt; if (!state.have[k]) return;
    state.have[k].amount = e.target.value === "" ? "" : Number(e.target.value);
    saveHave(); document.getElementById("results").innerHTML = makeResults();
  }
});
app.addEventListener("change", e => {
  const d = e.target.dataset;
  if (d.have) {
    if (e.target.checked) state.have[d.have] = { amount: "", unit: ING[d.have]?.default_unit || "g" };
    else delete state.have[d.have];
    saveHave(); render();
  } else if (d.unit && state.have[d.unit]) {
    state.have[d.unit].unit = e.target.value; saveHave(); document.getElementById("results").innerHTML = makeResults();
  }
});

render();
Promise.all([fetch("data/recipes.json").then(r => r.json()), fetch("data/ingredients.json").then(r => r.json())])
  .then(([d, i]) => { DB = d; ING = i; render(); })
  .catch(() => { loadFailed = true; render(); });
