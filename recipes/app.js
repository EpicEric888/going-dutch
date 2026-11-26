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
    sub: "Recipes in English and Dutch",
    recipes: "Recipes", make: "What can I make?",
    eyebrow: "", heroTitle: "Family recipes",
    heroText: "Recipes we cook at home. Adjust the servings, switch between metric and US units, and see nutrition per serving.",
    all: "All", search: "Search recipes", empty: "No recipes match that search.",
    serves: n => `Serves ${n}`, perServing: "per serving",
    storyTitle: "About these recipes",
    storyText: "A collection of recipes we cook at home. Each one is available in English and Dutch.",
    back: "All recipes", ingredients: "Ingredients",
    servings: n => n === 1 ? "1 serving" : `${n} servings`, fewer: "Fewer servings", more: "More servings",
    metric: "Metric", us: "US", unitsLabel: "Units",
    nutrition: "Nutrition per serving", calories: "kcal", protein: "Protein", carbs: "Carbs", fat: "Fat",
    estimate: "Estimates, worked out from the ingredients listed.",
    method: "Method", stepHint: "Tap a step to tick it off.",
    makeTitle: "What can I make?",
    makeText: "Select the ingredients you have. Add amounts to see how many servings you can make.",
    have: "What you have", results: "What you can make",
    pickSome: "Tick a few ingredients to see what you can make.",
    full: "You have everything", some: n => `About ${n} ${n === 1 ? "serving" : "servings"} with what you have`, none: "Missing ingredients",
    missing: "Still need", amount: "Amount", optional: "optional", plenty: "No amount means you have plenty.",
    clear: "Clear all", view: "View recipe",
    needMore: (name, g) => `${name}: about ${g} g more`,
    notFound: "We couldn't find that recipe.", loading: "Loading recipes…", loadError: "Couldn't load the recipes. Reload the page to try again.",
    title: "Pape Family Recipes",
    add: "Add recipe", addTitle: "Add a recipe",
    addText: "Paste a recipe in any language, or add a photo of a recipe card. It gets turned into a recipe in English and Dutch that you can check before saving.",
    pasteLabel: "Recipe text", pastePh: "Paste the recipe here: ingredients, amounts and steps. Any language is fine.",
    photo: "Add a photo", photoChosen: "Photo added", removePhoto: "Remove photo",
    readIt: "Read recipe", reading: "Reading…", readingHint: "This usually takes 10 to 30 seconds.",
    orManual: "No text or photo?", manual: "Type it in yourself",
    checkTitle: "Check the recipe", checkText: "Fix anything that looks off. Switch between English and Dutch to check both versions.",
    details: "Details", editingIn: "Language", fName: "Name", fIntro: "Short description", fIntroPh: "One sentence about the dish",
    fCategory: "Category", fServings: "Servings", fTime: "Time", fIngredient: "Ingredient", fNote: "Note, e.g. finely chopped",
    addIngredient: "Add ingredient", fStepTitle: "Step title", fStepText: "What to do", addStep: "Add step", remove: "Remove", dragHint: "Drag to reorder",
    saveHint: "Anything missing in the other language is translated when you save.",
    cancel: "Cancel", save: "Save recipe", saving: "Saving…",
    errEmpty: "Paste the recipe text or add a photo first.", errNoRecipe: "We couldn't find a recipe in that. Try pasting the full text.",
    errRead: "Something went wrong reading the recipe. Try again, or type it in yourself.", errLimit: "You've hit today's limit for reading recipes. Try again tomorrow, or type it in yourself.",
    errBusy: "Too many requests right now. Wait a minute and try again.", errPhoto: "We couldn't open that photo. Try another one.",
    errIncomplete: "Add a name, at least one ingredient and one step.", errPassword: "The family password has changed. Reload the page and enter the new one.",
    errSave: "Couldn't save the recipe. Check your connection and try again.", errOffline: "Adding recipes isn't available right now.",
    errDelete: "Couldn't remove the recipe. Try again.", delRecipe: "Remove this recipe", delConfirm: "Tap again to remove it for everyone",
    printPdf: "Print / PDF", printedFrom: "From Pape Family Recipes",
    editRecipe: "Edit recipe", editTitle: "Edit the recipe", editText: "Change anything you like. If you change one language, the other one is updated when you save.", saveChanges: "Save changes",
    addedBy: "Added by you", addDishPhoto: "Add a photo of the dish", replacePhoto: "Replace photo", removePhotoBtn: "Remove photo", uploading: "Uploading…",
    dishPhoto: "Dish photo", dishPhotoHint: "Optional. A photo of the finished dish, shown on the recipe.", errPhotoUpload: "Couldn't upload the photo. Try again.",
    gateTitle: "This page is for family", gateText: "Enter the password to see the recipes.", password: "Password", enter: "Open", wrong: "That's not the right password."
  },
  nl: {
    sub: "Recepten in het Nederlands en Engels",
    recipes: "Recepten", make: "Wat kan ik maken?",
    eyebrow: "", heroTitle: "Familierecepten",
    heroText: "Recepten die we thuis koken. Pas het aantal porties aan, wissel tussen metrische en Amerikaanse eenheden en bekijk de voedingswaarde per portie.",
    all: "Alles", search: "Zoek recepten", empty: "Geen recepten gevonden.",
    serves: n => `Voor ${n} personen`, perServing: "per portie",
    storyTitle: "Over deze recepten",
    storyText: "Een verzameling recepten die we thuis koken. Elk recept is beschikbaar in het Nederlands en Engels.",
    back: "Alle recepten", ingredients: "Ingrediënten",
    servings: n => n === 1 ? "1 portie" : `${n} porties`, fewer: "Minder porties", more: "Meer porties",
    metric: "Metrisch", us: "VS", unitsLabel: "Eenheden",
    nutrition: "Voedingswaarde per portie", calories: "kcal", protein: "Eiwit", carbs: "Koolh.", fat: "Vet",
    estimate: "Schattingen, uitgerekend op basis van de ingrediënten.",
    method: "Bereiding", stepHint: "Tik op een stap om hem af te vinken.",
    makeTitle: "Wat kan ik maken?",
    makeText: "Selecteer de ingrediënten die je in huis hebt. Vul hoeveelheden in om te zien hoeveel porties je kunt maken.",
    have: "Wat je in huis hebt", results: "Wat je kunt maken",
    pickSome: "Vink een paar ingrediënten aan om te zien wat je kunt maken.",
    full: "Je hebt alles", some: n => `Ongeveer ${n} ${n === 1 ? "portie" : "porties"} met wat je hebt`, none: "Ingrediënten ontbreken",
    missing: "Nog nodig", amount: "Hoeveelheid", optional: "optioneel", plenty: "Geen hoeveelheid betekent: genoeg in huis.",
    clear: "Alles wissen", view: "Bekijk recept",
    needMore: (name, g) => `${name}: nog ongeveer ${g} g`,
    notFound: "Dit recept bestaat niet.", loading: "Recepten laden…", loadError: "Kon de recepten niet laden. Herlaad de pagina.",
    title: "Recepten van de familie Pape",
    add: "Recept toevoegen", addTitle: "Recept toevoegen",
    addText: "Plak een recept in welke taal dan ook, of voeg een foto van een receptkaart toe. Er komt een recept in het Nederlands en Engels uit dat je kunt nakijken voordat je het opslaat.",
    pasteLabel: "Recepttekst", pastePh: "Plak hier het recept: ingrediënten, hoeveelheden en stappen. Elke taal is goed.",
    photo: "Foto toevoegen", photoChosen: "Foto toegevoegd", removePhoto: "Foto verwijderen",
    readIt: "Recept inlezen", reading: "Bezig met lezen…", readingHint: "Dit duurt meestal 10 tot 30 seconden.",
    orManual: "Geen tekst of foto?", manual: "Typ het zelf in",
    checkTitle: "Kijk het recept na", checkText: "Verbeter wat niet klopt. Wissel tussen Nederlands en Engels om beide versies te checken.",
    details: "Gegevens", editingIn: "Taal", fName: "Naam", fIntro: "Korte omschrijving", fIntroPh: "Eén zin over het gerecht",
    fCategory: "Categorie", fServings: "Porties", fTime: "Tijd", fIngredient: "Ingrediënt", fNote: "Opmerking, bijv. fijngehakt",
    addIngredient: "Ingrediënt toevoegen", fStepTitle: "Titel van de stap", fStepText: "Wat je doet", addStep: "Stap toevoegen", remove: "Verwijderen", dragHint: "Sleep om te verplaatsen",
    saveHint: "Wat in de andere taal ontbreekt, wordt bij het opslaan vertaald.",
    cancel: "Annuleren", save: "Recept opslaan", saving: "Opslaan…",
    errEmpty: "Plak eerst de recepttekst of voeg een foto toe.", errNoRecipe: "We konden daar geen recept in vinden. Plak de volledige tekst.",
    errRead: "Er ging iets mis bij het lezen. Probeer het opnieuw, of typ het zelf in.", errLimit: "Je hebt het maximum voor vandaag bereikt. Probeer het morgen opnieuw, of typ het zelf in.",
    errBusy: "Te veel verzoeken. Wacht even en probeer het opnieuw.", errPhoto: "We konden die foto niet openen. Probeer een andere.",
    errIncomplete: "Vul een naam, minstens één ingrediënt en één stap in.", errPassword: "Het familiewachtwoord is veranderd. Herlaad de pagina en vul het nieuwe in.",
    errSave: "Kon het recept niet opslaan. Check je verbinding en probeer het opnieuw.", errOffline: "Recepten toevoegen kan nu even niet.",
    errDelete: "Kon het recept niet verwijderen. Probeer het opnieuw.", delRecipe: "Dit recept verwijderen", delConfirm: "Tik nog een keer om het voor iedereen te verwijderen",
    printPdf: "Printen / PDF", printedFrom: "Uit Recepten van de familie Pape",
    editRecipe: "Recept bewerken", editTitle: "Recept bewerken", editText: "Pas aan wat je wilt. Verander je de ene taal, dan wordt de andere bijgewerkt als je opslaat.", saveChanges: "Wijzigingen opslaan",
    addedBy: "Door jou toegevoegd", addDishPhoto: "Foto van het gerecht toevoegen", replacePhoto: "Foto vervangen", removePhotoBtn: "Foto verwijderen", uploading: "Uploaden…",
    dishPhoto: "Foto van het gerecht", dishPhotoHint: "Optioneel. Een foto van het eindresultaat, te zien bij het recept.", errPhotoUpload: "Kon de foto niet uploaden. Probeer het opnieuw.",
    gateTitle: "Deze pagina is voor familie", gateText: "Vul het wachtwoord in om de recepten te zien.", password: "Wachtwoord", enter: "Openen", wrong: "Dat is niet het goede wachtwoord."
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
  piece: { en: ["piece", "pieces"], nl: ["stuk", "stuks"] },
  packet: { en: ["packet", "packets"], nl: ["zakje", "zakjes"] },
  portion: { en: ["portion", "portions"], nl: ["portie", "porties"] },
  pinch: { en: ["pinch", "pinches"], nl: ["snufje", "snufjes"] },
  unit: { en: ["", ""], nl: ["", ""] }
};
const unitLabel = (u, n) => UNITS[u] ? UNITS[u][lang][n > 1 ? 1 : 0] : u;
const COUNTABLE = new Set(["cup", "tbsp", "tsp", "clove", "unit", "piece", "packet", "portion", "pinch"]);
const FRACTIONS = [[0, ""], [1 / 4, "¼"], [1 / 3, "⅓"], [1 / 2, "½"], [2 / 3, "⅔"], [3 / 4, "¾"], [1, ""]];

// whole things read better rounded: cloves to whole numbers, onions/chiles etc. to halves once there are 2 or more
function kitchenRound(n, unit) {
  if (unit === "clove" || unit === "packet" || unit === "portion" || unit === "pinch") return Math.max(1, Math.round(n));
  if (unit === "piece") return Math.max(0.5, Math.round(n * 2) / 2);
  if (unit === "unit" && n >= 2) return Math.round(n * 2) / 2;
  return n;
}
function fmtAmount(n, unit) {
  n = kitchenRound(n, unit);
  if (unit === "g" || unit === "ml") return numFmt(n >= 10 ? Math.round(n) : Math.round(n * 10) / 10, 1);
  if (COUNTABLE.has(unit) || unit === "lb" || unit === "oz") {
    let whole = Math.floor(n), frac = n - whole;
    const [val, glyph] = FRACTIONS.reduce((best, f) => Math.abs(f[0] - frac) < Math.abs(best[0] - frac) ? f : best);
    if (Math.abs(val - frac) <= 0.05) {
      if (val === 1) { whole += 1; return String(whole); }
      return whole ? `${whole}${glyph}` : (glyph || "0");
    }
  }
  return numFmt(n, 2);
}

/* metric or US units, display only (the recipe data keeps the original amounts) */
const UNITS_KEY = "pape.units";
let sys = (() => {
  try { const s = localStorage.getItem(UNITS_KEY); if (s === "metric" || s === "us") return s; } catch (e) {}
  if (lang === "nl") return "metric";
  return /-(US|LR|MM)\b/i.test((navigator.languages || [navigator.language || ""])[0] || "") ? "us" : "metric";
})();
const snapFrac = x => { const w = Math.floor(x), f = x - w; const [v] = FRACTIONS.reduce((b, c) => Math.abs(c[0] - f) < Math.abs(b[0] - f) ? c : b); return w + v; };
function displayQty(n, unit) {
  if (sys === "metric") {
    if (unit === "cup") return n * 240 >= 1000 ? [n * 0.24, "l"] : [n * 240, "ml"];
    if (unit === "lb") return n * 453.6 >= 1000 ? [n * 0.4536, "kg"] : [n * 453.6, "g"];
    if (unit === "oz") return [n * 28.35, "g"];
    return [n, unit];
  }
  const g = unit === "kg" ? n * 1000 : unit === "g" ? n : null;
  if (g != null) return g >= 454 ? [Math.round(g / 453.6 * 4) / 4, "lb"] : [Math.max(0.5, Math.round(g / 28.35 * 2) / 2), "oz"];
  const ml = unit === "l" ? n * 1000 : unit === "ml" ? n : null;
  if (ml != null) {
    if (ml < 45) return ml < 15 ? [snapFrac(ml / 5), "tsp"] : [snapFrac(ml / 15), "tbsp"];
    return [snapFrac(ml / 240), "cup"];
  }
  return [n, unit];
}
function qtyText(n, unit) {
  n = kitchenRound(n, unit);
  const [a, u] = displayQty(n, unit);
  const converted = u !== unit;
  const shown = (u === "g" || u === "ml") && a >= 50 ? Math.round(a / 5) * 5 : converted && (u === "kg" || u === "l") ? Math.round(a * 10) / 10 : a;
  const lab = unitLabel(u, a);
  return `${fmtAmount(shown, u)}${lab ? " " + lab : ""}`;
}
const PLURAL_UNITS = new Set(["unit", "packet"]);

/* ---------- data ---------- */
let DB = null, ING = null, loadFailed = false;
const ingName = (key, n = 1) => { const i = ING[key]; if (!i) return key; return n > 1 && i.plural ? L(i.plural) : L(i.name); };

// grams for a recipe line, as Recipe.py does it: "g" as-is, otherwise amount x grams_per_unit
// grams_per_unit is per the ingredient's default_unit, so convert other units first
const W_G = { g: 1, kg: 1000, oz: 28.35, lb: 453.6 };
const V_ML = { ml: 1, l: 1000, cup: 240, tbsp: 15, tsp: 5 };
function lineGrams(line) {
  const i = ING[line.key] || {}, u = line.unit, a = Number(line.amount) || 0;
  if (W_G[u]) return a * W_G[u];
  if (u === i.default_unit) return i.grams_per_unit ? a * i.grams_per_unit : 0;
  if (V_ML[u]) {
    const dens = V_ML[i.default_unit] && i.grams_per_unit ? i.grams_per_unit / V_ML[i.default_unit] : 1;
    return a * V_ML[u] * dens;
  }
  return i.grams_per_unit ? a * i.grams_per_unit : 0;
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
  recipe.ingredients.filter(line => !ING[line.key]?.pantry).forEach(line => {
    const need = lineGrams(line);
    const h = have[line.key];
    if (!h) { ratios.push(0); missing.push(`${ingName(line.key, PLURAL_UNITS.has(line.unit) ? line.amount : 1)} (${qtyText(line.amount, line.unit)})`); return; }
    if (h.amount === "" || h.amount == null || isNaN(h.amount)) { ratios.push(1); return; } // ticked, no amount: plenty
    const got = toGrams(Number(h.amount), h.unit, line.key) ?? 0;
    ratios.push(need ? Math.min(got / need, 1) : 1);
    if (got < need) missing.push(t("needMore", ingName(line.key), Math.round(need - got)));
  });
  const full = ratios.length > 0 && ratios.every(r => r >= 1);
  const limit = ratios.length ? Math.min(...ratios) : 0;
  return { recipe, full, missing, maxServings: Math.floor(recipe.servings * limit), limit };
}

/* ---------- photos: built-in (recipe.photo) or added by family (PHOTOS, filled by add.js) ---------- */
let PHOTOS = {};
const photoOf = r => PHOTOS[r.id]?.url || r.photo || null;

/* ---------- state ---------- */
const state = { cat: "all", q: "", servings: {}, done: {}, have: {} };
try { state.have = JSON.parse(localStorage.getItem("pape.have") || "{}") || {}; } catch (e) {}
const saveHave = () => { try { localStorage.setItem("pape.have", JSON.stringify(state.have)); } catch (e) {} };

/* ---------- icons ---------- */
const ICON = {
  pot: '<svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 28h44v12a14 14 0 0 1-14 14H24a14 14 0 0 1-14-14z"/><path d="M6 28h52M24 20c0-3 3-3 3-6M32 20c0-3 3-3 3-6M40 20c0-3 3-3 3-6"/></svg>',
  bowl: '<svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 32h48a24 24 0 0 1-48 0z"/><path d="M22 54h20M40 10 26 30M50 14 30 31"/></svg>',
  chili: '<svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M44 18c-6 0-10 4-12 10-3 9-9 18-22 22 16 4 34-2 40-16 2-6 0-12-6-16z"/><path d="M44 18c0-4 2-7 6-8M44 18c3 0 6 2 7 5"/></svg>',
  users: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.5 3.3-5.5 6.5-5.5s5.9 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .6 3.3 2.4 3.6 5.2"/></svg>',
  clock: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  flame: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-4 2-7 2 1 3 3 3 5 1-2 1-6 1-9z"/></svg>',
  back: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  book: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/></svg>',
  printer: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2"/><path d="M6 14h12v7H6z"/></svg>',
  pencil: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/></svg>',
  camera: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  plus: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>',
  basket: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h18l-2 10H5zM8 10l3-6M16 10l-3-6"/></svg>'
};
const catArt = c => c === "salsas" ? { bg: "var(--salsas)", icon: ICON.chili } : c === "soups" ? { bg: "var(--soups)", icon: ICON.bowl } : { bg: "var(--mains)", icon: ICON.pot };

/* ---------- views ---------- */
const route = () => {
  const h = location.hash;
  const m = h.match(/^#\/recipe\/([\w-]+)/);
  if (m) return { page: "recipe", id: m[1] };
  if (/^#\/make/.test(h)) return { page: "make" };
  if (/^#\/add/.test(h)) return { page: "add" };
  const ed = h.match(/^#\/edit\/([\w-]+)/);
  if (ed) return { page: "edit", id: ed[1] };
  return { page: "home" };
};

function chrome(r) {
  document.documentElement.lang = lang;
  document.title = r.page === "recipe" && DB ? `${L(DB.recipes.find(x => x.id === r.id)?.name) || t("title")} · ${t("title")}` : r.page === "make" ? `${t("make")} · ${t("title")}` : r.page === "add" ? `${t("addTitle")} · ${t("title")}` : t("title");
  document.getElementById("brand-name").textContent = t("title");
  document.getElementById("brand-sub").textContent = t("sub");
  document.querySelectorAll(".lang button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  const cur = r.page === "make" ? "make" : r.page === "add" ? "add" : "recipes";
  if (r.page === "edit") document.title = `${t("editRecipe")} · ${t("title")}`;
  const links = [["recipes", "#/", t("recipes"), ICON.book], ["make", "#/make", t("make"), ICON.basket], ["add", "#/add", t("add"), ICON.plus]];
  document.getElementById("nav").innerHTML = links.map(([k, href, label]) => `<a href="${href}"${cur === k ? ' aria-current="page"' : ""}>${esc(label)}</a>`).join("");
  document.getElementById("tabbar").innerHTML = links.map(([k, href, label, icon]) => `<a href="${href}"${cur === k ? ' aria-current="page"' : ""}>${icon}<span>${esc(label)}</span></a>`).join("");
  document.getElementById("foot").innerHTML = `${esc(t("title"))} · <a href="../">Going Dutch</a>`;
}

function card(r) {
  const art = catArt(r.category), n = perServing(r);
  const ph = photoOf(r);
  return `<a class="card" href="#/recipe/${r.id}">
    <div class="art${ph ? " photo" : ""}" style="${ph ? `background-image:url('${esc(ph)}')` : `background:${art.bg}`}"><span class="tag">${esc(L(DB.categories.find(c => c.id === r.category)?.name))}</span>${ph ? "" : art.icon}</div>
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
      ${t("eyebrow") ? `<div class="eyebrow">${esc(t("eyebrow"))}</div>` : ""}
      <h1 class="serif">${esc(t("heroTitle"))}</h1>
      <p>${esc(t("heroText"))}</p>
    </section>
    <div class="toolbar">
      ${[{ id: "all", name: t("all") }, ...DB.categories.filter(c => DB.recipes.some(r => r.category === c.id))].map(c => `<button type="button" class="chip" data-cat="${c.id}" aria-pressed="${state.cat === c.id}">${esc(L(c.name))}</button>`).join("")}
      <input class="search" type="search" id="q" placeholder="${esc(t("search"))}" aria-label="${esc(t("search"))}" value="${esc(state.q)}">
    </div>
    <div class="grid" id="grid">${homeGrid()}</div>
    <section class="story"><h2 class="serif">${esc(t("storyTitle"))}</h2><p>${esc(t("storyText"))}</p></section>`;
}

function unitSwitch() {
  return `<div class="seg" role="group" aria-label="${esc(t("unitsLabel"))}">${["metric", "us"].map(k => `<button type="button" data-sys="${k}" aria-pressed="${sys === k}">${esc(t(k))}</button>`).join("")}</div>`;
}
function viewRecipe(id) {
  const r = DB.recipes.find(x => x.id === id);
  if (!r) return `<a class="back" href="#/">${ICON.back}${esc(t("back"))}</a><div class="empty">${esc(t("notFound"))}</div>`;
  const s = state.servings[id] || r.servings, factor = s / r.servings, n = perServing(r);
  const done = state.done[id] || [];
  const steps = L(r.steps) || [];
  const ph = photoOf(r), mineP = PHOTOS[r.id]?.mine, busyP = typeof add !== "undefined" && add.photoBusy === r.id;
  const photoBtn = label => `<label class="photo-btn${busyP ? " disabled" : ""}"><input type="file" accept="image/*" hidden data-photo-for="${r.id}" ${busyP ? "disabled" : ""}>${ICON.camera}<span>${esc(busyP ? t("uploading") : label)}</span></label>`;
  return `<a class="back" href="#/">${ICON.back}${esc(t("back"))}</a>
    ${ph ? `<figure class="r-photo"><img src="${esc(ph)}" alt="${esc(L(r.name))}">${mineP ? `<figcaption>${photoBtn(t("replacePhoto"))}<button type="button" class="photo-btn" data-photo-del="${r.id}">${esc(t("removePhotoBtn"))}</button></figcaption>` : ""}</figure>` : ""}
    <div class="r-head">
      <div class="eyebrow">${esc(L(DB.categories.find(c => c.id === r.category)?.name))}</div>
      <h1 class="serif">${esc(L(r.name))}</h1>
      <p>${esc(L(r.intro))}</p>
      <div class="meta"><span>${ICON.users}${esc(t("serves", r.servings))}</span>${r.time ? `<span>${ICON.clock}${esc(L(r.time))}</span>` : ""}</div>
      <div class="r-actions no-print"><button type="button" class="photo-btn" data-print="1">${ICON.printer}<span>${esc(t("printPdf"))}</span></button>${typeof sb !== "undefined" && sb ? `<a class="photo-btn" href="#/edit/${r.id}">${ICON.pencil}<span>${esc(t("editRecipe"))}</span></a>${!ph ? photoBtn(t("addDishPhoto")) : ""}` : ""}</div>
      ${typeof add !== "undefined" && add.photoError === r.id ? `<p class="gate-err">${esc(t("errPhotoUpload"))}</p>` : ""}
    </div>
    <div class="r-layout">
      <div class="r-side">
        <section class="panel">
          <div class="ing-head"><h2 class="serif">${esc(t("ingredients"))}</h2>${unitSwitch()}</div>
          <div class="stepper">
            <button type="button" data-serv="-1" aria-label="${esc(t("fewer"))}" ${s <= 1 ? "disabled" : ""}>−</button>
            <output aria-live="polite">${esc(t("servings", s))}</output>
            <button type="button" data-serv="1" aria-label="${esc(t("more"))}" ${s >= 40 ? "disabled" : ""}>+</button>
          </div>
          <ul class="ings">${r.ingredients.map(line => {
            const amt = kitchenRound(line.amount * factor, line.unit);
            return `<li><span class="amt">${esc(qtyText(amt, line.unit))}</span><span>${esc(ingName(line.key, PLURAL_UNITS.has(line.unit) ? amt : 1))}${line.note ? `<span class="note">${esc(L(line.note))}</span>` : ""}</span></li>`;
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
        <ol class="steps">${steps.map((st, i) => `<li><button type="button" data-step="${i}" aria-pressed="${done.includes(i)}"><span>${typeof st === "object" ? `${st.title ? `<b class="st">${esc(st.title)}</b>` : ""}${esc(st.text)}` : esc(st)}</span></button></li>`).join("")}</ol>
        <p class="hint no-print">${esc(t("stepHint"))}</p>
      </section>
    </div>
    <p class="print-only print-foot">${esc(t("printedFrom"))} · delapape.com/recipes</p>
    ${r._dbId && typeof myUserId !== "undefined" && myUserId && r._author === myUserId ? `<div style="margin-top:18px;text-align:center"><span class="hint">${esc(t("addedBy"))} · </span><button type="button" class="linkbtn danger" data-delrecipe="${r._dbId}">${esc(add.confirmDel === r._dbId ? t("delConfirm") : t("delRecipe"))}</button></div>` : ""}`;
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
  const keys = Object.keys(ING).filter(k => !ING[k].pantry).sort((a, b) => ingName(a).localeCompare(ingName(b), lang));
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
            ${h ? `<div class="qty"><input type="number" inputmode="decimal" min="0" step="any" data-amt="${esc(k)}" value="${esc(h.amount ?? "")}" placeholder="${esc(t("amount"))}" aria-label="${esc(t("amount"))} ${esc(ingName(k))}">
              <select data-unit="${esc(k)}" aria-label="Unit">${haveUnits(k).map(u => `<option value="${u}" ${h.unit === u ? "selected" : ""}>${esc(unitLabel(u, 2) || (lang === "nl" ? "stuks" : "pieces"))}</option>`).join("")}</select></div>` : ""}
          </li>`;
        }).join("")}</ul>
      </section>
      <section class="panel"><div class="ing-head"><h2 class="serif">${esc(t("results"))}</h2>${unitSwitch()}</div><div id="results">${makeResults()}</div></section>
    </div>`;
}

/* ---------- password screen (keeps casual visitors out; the files themselves are still public) ---------- */
const GATE_HASH = "5667494d214654a92012e9b8f2b855114ddbc797d40601d9564e939830e15903";
const GATE_KEY = "pape.unlocked";
let unlocked = (() => { try { return localStorage.getItem(GATE_KEY) === GATE_HASH; } catch (e) { return false; } })();
let gateError = false;
async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function viewGate() {
  return `<section class="gate panel">
    <span class="mark" aria-hidden="true" style="margin:0 auto 10px"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></span>
    <h1 class="serif">${esc(t("gateTitle"))}</h1>
    <p class="muted">${esc(t("gateText"))}</p>
    <form id="gate-form" class="gate-form">
      <input id="gate-pw" type="password" autocomplete="current-password" autocapitalize="none" spellcheck="false" placeholder="${esc(t("password"))}" aria-label="${esc(t("password"))}" required>
      <button class="btn" type="submit">${esc(t("enter"))}</button>
    </form>
    ${gateError ? `<p class="gate-err" role="alert">${esc(t("wrong"))}</p>` : ""}
  </section>`;
}

/* ---------- render + events ---------- */
const app = document.getElementById("app");
function render() {
  const r = route();
  chrome(r);
  document.body.classList.toggle("locked", !unlocked);
  if (!unlocked) { app.innerHTML = viewGate(); setTimeout(() => document.getElementById("gate-pw")?.focus(), 0); return; }
  if (loadFailed) { app.innerHTML = `<div class="empty">${esc(t("loadError"))}</div>`; return; }
  if (!DB) { app.innerHTML = `<div class="empty">${esc(t("loading"))}</div>`; return; }
  app.innerHTML = r.page === "recipe" ? viewRecipe(r.id) : r.page === "make" ? viewMake() : r.page === "add" ? viewAdd() : r.page === "edit" ? viewEditRecipe(r.id) : viewHome();
}

window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });
document.querySelectorAll(".lang button").forEach(b => b.addEventListener("click", () => {
  lang = b.dataset.lang; try { localStorage.setItem(LANG_KEY, lang); } catch (e) {} render();
}));
app.addEventListener("click", e => {
  if (e.target.closest("[data-print]")) { window.print(); return; }
  const el = e.target.closest("[data-cat],[data-serv],[data-step],[data-clear],[data-sys]");
  if (!el) return;
  const r = route();
  if (el.dataset.sys) { sys = el.dataset.sys; try { localStorage.setItem(UNITS_KEY, sys); } catch (e2) {} render(); return; }
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
app.addEventListener("submit", async e => {
  if (e.target.id !== "gate-form") return;
  e.preventDefault();
  const pw = document.getElementById("gate-pw").value.trim().toLowerCase();
  if (await sha256("pape-recipes:" + pw) === GATE_HASH) {
    unlocked = true; gateError = false;
    try { localStorage.setItem(GATE_KEY, GATE_HASH); } catch (err) {}
  } else gateError = true;
  render();
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
Promise.all([fetch("data/recipes.json", { cache: "no-cache" }).then(r => r.json()), fetch("data/ingredients.json", { cache: "no-cache" }).then(r => r.json())])
  .then(async ([d, i]) => { DB = d; ING = i; render(); if (typeof loadFamilyRecipes === "function") { await loadFamilyRecipes(); render(); } })
  .catch(() => { loadFailed = true; render(); });
