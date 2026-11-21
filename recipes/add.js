/* ---------- adding recipes: anyone with the family password ----------
   Saved recipes live in Supabase (family_recipes) and are merged with the built-in ones.
   The recipe reader (read-recipe edge function, Muse) turns pasted text or a photo into both languages. */

const sb = window.supabase && window.GD_CONFIG
  ? window.supabase.createClient(GD_CONFIG.supabaseUrl, GD_CONFIG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
  : null;

async function ensureSession() {
  if (!sb) throw new Error("offline");
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session.user;
  const { data: d2, error } = await sb.auth.signInAnonymously();
  if (error) throw error;
  return d2.user;
}

const EXTRA_CATS = {
  sides: { en: "Sides", nl: "Bijgerechten" }, desserts: { en: "Desserts", nl: "Desserts" }, baking: { en: "Baking", nl: "Bakken" },
  drinks: { en: "Drinks", nl: "Drankjes" }, other: { en: "Other", nl: "Overig" },
  mains: { en: "Mains", nl: "Hoofdgerechten" }, soups: { en: "Soups & noodles", nl: "Soepen & noedels" }, salsas: { en: "Salsas & sides", nl: "Salsa's & bijgerechten" }
};
const ALL_CATS = ["mains", "soups", "salsas", "sides", "desserts", "baking", "drinks", "other"];
const EDIT_UNITS = ["g", "kg", "ml", "l", "lb", "oz", "cup", "tbsp", "tsp", "clove", "unit", "piece", "packet", "portion", "pinch"];

let myUserId = null;
async function loadFamilyRecipes() {
  if (!sb) return;
  try {
    const { data: s } = await sb.auth.getSession();
    myUserId = s.session?.user?.id || null;
    const { data, error } = await sb.from("family_recipes").select("id, slug, recipe, ingredients, created_by").order("created_at");
    if (error || !data) return;
    data.forEach(row => {
      Object.entries(row.ingredients || {}).forEach(([k, v]) => { if (!ING[k]) ING[k] = v; });
      const r = { ...row.recipe, id: row.slug, _dbId: row.id, _author: row.created_by };
      if (!DB.categories.some(c => c.id === r.category)) DB.categories.push({ id: r.category, name: EXTRA_CATS[r.category] || EXTRA_CATS.other });
      DB.recipes = DB.recipes.filter(x => x.id !== r.id).concat(r);
    });
  } catch (e) { /* the built-in recipes still show */ }
}

/* ---------- add flow state ---------- */
const add = { stage: "input", text: "", photo: null, error: "", editLang: null, draft: null, busy: false, confirmDel: null };
const blankLine = () => ({ key: "", name: { en: "", nl: "" }, plural: null, amount: "", unit: "unit", note: { en: "", nl: "" }, nut: null });
const blankDraft = () => ({ name: { en: "", nl: "" }, intro: { en: "", nl: "" }, category: "mains", servings: 4, time: { en: "", nl: "" }, lines: [blankLine()], steps: { en: [{ title: "", text: "" }], nl: [{ title: "", text: "" }] } });
const pair = o => ({ en: String(o?.en ?? ""), nl: String(o?.nl ?? "") });

function draftFromAI(d) {
  const lines = (d.ingredients || []).map(i => {
    const k = i.key && ING[i.key] ? i.key : "";
    return {
      key: k, name: k ? pair(ING[k].name) : pair(i.name), plural: k ? (ING[k].plural || null) : (i.plural ? pair(i.plural) : null),
      amount: Number(i.amount) || 1, unit: EDIT_UNITS.includes(i.unit) ? i.unit : "unit",
      note: i.note ? pair(i.note) : { en: "", nl: "" }, nut: i.nutrition || null
    };
  });
  const steps = { en: (d.steps?.en || []).map(s => ({ title: String(s.title || ""), text: String(s.text || "") })), nl: (d.steps?.nl || []).map(s => ({ title: String(s.title || ""), text: String(s.text || "") })) };
  return {
    name: pair(d.name), intro: pair(d.intro), category: ALL_CATS.includes(d.category) ? d.category : "other",
    servings: Math.max(1, Math.min(40, parseInt(d.servings) || 4)), time: d.time ? pair(d.time) : { en: "", nl: "" },
    lines: lines.length ? lines : [blankLine()], steps: steps.en.length || steps.nl.length ? steps : blankDraft().steps
  };
}

async function shrinkPhoto(file) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85).split(",")[1];
}

async function callReader(body) {
  await ensureSession();
  const { data, error } = await sb.functions.invoke("read-recipe", { body: { ...body, known: Object.keys(ING) } });
  if (error) {
    let code = "upstream";
    try { code = (await error.context.json()).error || code; } catch (e) {}
    throw { code };
  }
  return data;
}
const readerMsg = code => ({
  no_recipe: t("errNoRecipe"), invalid_json: t("errRead"), guest_limit: t("errLimit"), user_limit: t("errLimit"), site_limit: t("errLimit"),
  rate_limited: t("errBusy"), not_configured: t("errRead")
}[code] || t("errRead"));

/* ---------- views ---------- */
function viewAdd() {
  if (!sb) return `<div class="empty">${esc(t("errOffline"))}</div>`;
  if (add.stage === "edit" && add.draft) return viewEdit();
  return `<section class="hero" style="padding-bottom:0">
      <h1 class="serif" style="font-size:clamp(32px,6vw,48px)">${esc(t("addTitle"))}</h1>
      <p>${esc(t("addText"))}</p>
    </section>
    <section class="panel" style="margin-top:18px;max-width:720px">
      <label class="lbl" for="add-text">${esc(t("pasteLabel"))}</label>
      <textarea id="add-text" class="ta" rows="9" placeholder="${esc(t("pastePh"))}" ${add.busy ? "disabled" : ""}>${esc(add.text)}</textarea>
      <div class="add-row">
        <label class="btn ghost-btn ${add.busy ? "disabled" : ""}"><input id="add-photo" type="file" accept="image/*" hidden ${add.busy ? "disabled" : ""}>${ICON.camera}<span>${esc(add.photo ? t("photoChosen") : t("photo"))}</span></label>
        ${add.photo ? `<button type="button" class="btn ghost" data-add="clearphoto">${esc(t("removePhoto"))}</button>` : ""}
        <span style="flex:1"></span>
        <button type="button" class="btn" data-add="read" ${add.busy ? "disabled" : ""}>${esc(add.busy ? t("reading") : t("readIt"))}</button>
      </div>
      ${add.busy ? `<p class="hint">${esc(t("readingHint"))}</p>` : ""}
      ${add.error ? `<p class="gate-err" role="alert">${esc(add.error)}</p>` : ""}
      <p class="hint" style="margin-top:14px">${esc(t("orManual"))} <button type="button" class="linkbtn" data-add="manual">${esc(t("manual"))}</button></p>
    </section>`;
}

function field(path, value, ph, opts = "") {
  return `<input class="fi" data-f="${path}" value="${esc(value)}" placeholder="${esc(ph)}" ${opts}>`;
}
function viewEdit() {
  const d = add.draft, el = add.editLang || lang;
  const steps = d.steps[el] || [];
  return `<section class="hero" style="padding-bottom:0">
      <h1 class="serif" style="font-size:clamp(28px,5vw,40px)">${esc(t("checkTitle"))}</h1>
      <p>${esc(t("checkText"))}</p>
    </section>
    <section class="panel" style="margin-top:16px">
      <div class="ing-head"><h2 class="serif">${esc(t("details"))}</h2>
        <div class="seg" role="group" aria-label="${esc(t("editingIn"))}">${["en", "nl"].map(k => `<button type="button" data-elang="${k}" aria-pressed="${el === k}">${k === "en" ? "English" : "Nederlands"}</button>`).join("")}</div></div>
      <div class="form-grid">
        <div class="full"><label class="lbl">${esc(t("fName"))}</label>${field(`name.${el}`, d.name[el], el === "en" ? "Barbacoa de Res" : "Barbacoa de Res")}</div>
        <div class="full"><label class="lbl">${esc(t("fIntro"))}</label>${field(`intro.${el}`, d.intro[el], t("fIntroPh"))}</div>
        <div><label class="lbl">${esc(t("fCategory"))}</label><select class="fi" data-f="category">${ALL_CATS.map(c => `<option value="${c}" ${d.category === c ? "selected" : ""}>${esc(L(EXTRA_CATS[c]))}</option>`).join("")}</select></div>
        <div><label class="lbl">${esc(t("fServings"))}</label>${field("servings", d.servings, "4", 'type="number" min="1" max="40" inputmode="numeric"')}</div>
        <div class="full"><label class="lbl">${esc(t("fTime"))} <span class="muted">(${esc(t("optional"))})</span></label>${field(`time.${el}`, d.time[el], el === "en" ? "About 2 hours" : "Ongeveer 2 uur")}</div>
      </div>
    </section>
    <section class="panel" style="margin-top:16px">
      <h2 class="serif">${esc(t("ingredients"))}</h2>
      <div class="lines">${d.lines.map((ln, i) => `<div class="line">
        <input class="fi amt-in" data-f="lines.${i}.amount" value="${esc(ln.amount)}" inputmode="decimal" placeholder="1" aria-label="${esc(t("amount"))}">
        <select class="fi unit-in" data-f="lines.${i}.unit" aria-label="Unit">${EDIT_UNITS.map(u => `<option value="${u}" ${ln.unit === u ? "selected" : ""}>${esc(u === "unit" ? (lang === "nl" ? "stuks" : "count") : (unitLabel(u, 2) || u))}</option>`).join("")}</select>
        <input class="fi name-in" data-f="lines.${i}.name.${el}" value="${esc(ln.name[el])}" placeholder="${esc(t("fIngredient"))}">
        <button type="button" class="xbtn" data-add="delline" data-i="${i}" aria-label="${esc(t("remove"))}">×</button>
        <input class="fi note-in" data-f="lines.${i}.note.${el}" value="${esc(ln.note[el])}" placeholder="${esc(t("fNote"))}">
      </div>`).join("")}</div>
      <button type="button" class="btn ghost" data-add="addline">+ ${esc(t("addIngredient"))}</button>
    </section>
    <section class="panel" style="margin-top:16px">
      <h2 class="serif">${esc(t("method"))}</h2>
      <ol class="edit-steps">${steps.map((st, i) => `<li>
        <div class="step-top"><span class="num">${i + 1}</span>${field(`steps.${el}.${i}.title`, st.title, t("fStepTitle"))}<button type="button" class="xbtn" data-add="delstep" data-i="${i}" aria-label="${esc(t("remove"))}">×</button></div>
        <textarea class="ta" rows="3" data-f="steps.${el}.${i}.text" placeholder="${esc(t("fStepText"))}">${esc(st.text)}</textarea>
      </li>`).join("")}</ol>
      <button type="button" class="btn ghost" data-add="addstep">+ ${esc(t("addStep"))}</button>
    </section>
    <div class="save-bar">
      ${add.error ? `<p class="gate-err" role="alert" style="margin:0 0 8px">${esc(add.error)}</p>` : ""}
      <p class="hint" style="margin:0 0 8px">${esc(t("saveHint"))}</p>
      <div style="display:flex;gap:8px"><button type="button" class="btn ghost" data-add="cancel">${esc(t("cancel"))}</button><span style="flex:1"></span>
        <button type="button" class="btn" data-add="save" ${add.busy ? "disabled" : ""}>${esc(add.busy ? t("saving") : t("save"))}</button></div>
    </div>`;
}

/* ---------- editing helpers ---------- */
function setPath(obj, path, value) {
  const parts = path.split(".");
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) { const k = /^\d+$/.test(parts[i]) ? Number(parts[i]) : parts[i]; o = o[k]; if (o == null) return; }
  const last = parts[parts.length - 1];
  o[/^\d+$/.test(last) ? Number(last) : last] = value;
}
function cleanDraft(d) {
  d.lines = d.lines.filter(l => (l.name.en || l.name.nl).trim());
  ["en", "nl"].forEach(k => { d.steps[k] = (d.steps[k] || []).filter(s => (s.title + s.text).trim()); });
}
function needsTranslation(d) {
  const miss = o => !o || !String(o.en || "").trim() !== !String(o.nl || "").trim();
  if (miss(d.name) || miss(d.intro)) return true;
  if ((d.time.en || d.time.nl) && miss(d.time)) return true;
  if (d.lines.some(l => miss(l.name) || ((l.note.en || l.note.nl) && miss(l.note)) || !l.key && !l.nut)) return true;
  if (d.steps.en.length !== d.steps.nl.length) return true;
  return d.steps.en.some((s, i) => !String(s.text).trim() !== !String(d.steps.nl[i]?.text || "").trim());
}
async function translateDraft(d) {
  // the side with more steps is the source; the reader fills in the other language and missing nutrition
  const src = d.steps.en.length >= d.steps.nl.length ? "en" : "nl", other = src === "en" ? "nl" : "en";
  const steps = { [src]: d.steps[src], [other]: d.steps[other].length === d.steps[src].length ? d.steps[other] : [] };
  const res = await callReader({
    mode: "translate", recipe: {
      name: d.name, intro: d.intro, category: d.category, servings: d.servings, time: d.time,
      ingredients: d.lines.map(l => ({ key: l.key, name: l.name, plural: l.plural, amount: Number(l.amount) || 1, unit: l.unit, note: l.note, nutrition: l.nut || (l.key ? null : undefined) })), steps
    }
  });
  const t2 = draftFromAI(res), keep = (a, b) => ({ en: a.en || b.en, nl: a.nl || b.nl });
  d.name = keep(d.name, t2.name); d.intro = keep(d.intro, t2.intro); d.time = keep(d.time, t2.time);
  d.lines = d.lines.map((l, i) => { const x = t2.lines[i] || {}; return { ...l, name: keep(l.name, x.name || l.name), note: keep(l.note, x.note || l.note), plural: l.plural || x.plural || null, nut: l.nut || x.nut || null }; });
  d.steps = { en: d.steps.en.length >= t2.steps.en.length && src === "en" ? d.steps.en : t2.steps.en, nl: d.steps.nl.length >= t2.steps.nl.length && src === "nl" ? d.steps.nl : t2.steps.nl };
  if (src === "en" && d.steps.nl.length !== d.steps.en.length) d.steps.nl = t2.steps.nl;
  if (src === "nl" && d.steps.en.length !== d.steps.nl.length) d.steps.en = t2.steps.en;
}
const slugKey = s => "u-" + (String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item");
function buildForSave(d) {
  const newIngs = {}, used = new Set(Object.keys(ING));
  const ingredients = d.lines.map(l => {
    const same = l.key && ING[l.key] && L(ING[l.key].name) === L(l.name) && ING[l.key].name.en === l.name.en && ING[l.key].name.nl === l.name.nl;
    let key = same ? l.key : "";
    if (!key) {
      let k = slugKey(l.name.en || l.name.nl), n = 1; while (used.has(k)) k = slugKey(l.name.en || l.name.nl) + "-" + (++n);
      used.add(k); key = k;
      const nut = l.nut || (l.key && ING[l.key]) || {};
      newIngs[k] = {
        name: { en: l.name.en || l.name.nl, nl: l.name.nl || l.name.en }, ...(l.plural ? { plural: l.plural } : {}), default_unit: l.unit,
        calories_per_100g: +nut.calories_per_100g || 0, protein_per_100g: +nut.protein_per_100g || 0, carbs_per_100g: +nut.carbs_per_100g || 0, fat_per_100g: +nut.fat_per_100g || 0,
        grams_per_unit: +nut.grams_per_unit || (l.unit === "g" || l.unit === "ml" ? 1 : 0)
      };
    }
    const out = { key, amount: Number(String(l.amount).replace(",", ".")) || 1, unit: l.unit };
    if (l.note.en || l.note.nl) out.note = { en: l.note.en || l.note.nl, nl: l.note.nl || l.note.en };
    return out;
  });
  const recipe = { category: d.category, name: d.name, intro: d.intro, servings: Math.max(1, Math.min(40, parseInt(d.servings) || 4)), ingredients, steps: d.steps };
  if (d.time.en || d.time.nl) recipe.time = d.time;
  return { recipe, newIngs };
}

/* ---------- events ---------- */
app.addEventListener("click", async e => {
  const b = e.target.closest("[data-add],[data-elang],[data-delrecipe]");
  if (!b) return;
  if (b.dataset.elang) { add.editLang = b.dataset.elang; render(); return; }
  if (b.dataset.delrecipe) {
    const id = b.dataset.delrecipe;
    if (add.confirmDel !== id) { add.confirmDel = id; render(); return; }
    try {
      await ensureSession();
      const { error } = await sb.from("family_recipes").delete().eq("id", id);
      if (error) throw error;
      DB.recipes = DB.recipes.filter(r => r._dbId !== id); add.confirmDel = null; location.hash = "#/";
    } catch (err) { add.confirmDel = null; alertInline(t("errDelete")); }
    return;
  }
  const a = b.dataset.add, d = add.draft;
  if (a === "manual") { add.draft = blankDraft(); add.editLang = lang; add.stage = "edit"; add.error = ""; render(); window.scrollTo(0, 0); }
  else if (a === "clearphoto") { add.photo = null; render(); }
  else if (a === "read") {
    add.text = document.getElementById("add-text")?.value || add.text;
    if (!add.text.trim() && !add.photo) { add.error = t("errEmpty"); render(); return; }
    add.busy = true; add.error = ""; render();
    try {
      const res = await callReader({ mode: "parse", text: add.text, ...(add.photo ? { image: add.photo, mediaType: "image/jpeg" } : {}) });
      add.draft = draftFromAI(res); add.editLang = lang; add.stage = "edit";
    } catch (err) { add.error = readerMsg(err?.code); }
    add.busy = false; render(); window.scrollTo(0, 0);
  }
  else if (a === "addline") { d.lines.push(blankLine()); render(); }
  else if (a === "delline") { d.lines.splice(Number(b.dataset.i), 1); if (!d.lines.length) d.lines.push(blankLine()); render(); }
  else if (a === "addstep") { const el = add.editLang || lang; d.steps[el].push({ title: "", text: "" }); render(); }
  else if (a === "delstep") { const el = add.editLang || lang; d.steps[el].splice(Number(b.dataset.i), 1); render(); }
  else if (a === "cancel") { Object.assign(add, { stage: "input", draft: null, error: "", busy: false }); render(); }
  else if (a === "save") {
    cleanDraft(d);
    if (!(d.name.en || d.name.nl).trim() || !d.lines.length || !(d.steps.en.length || d.steps.nl.length)) { add.error = t("errIncomplete"); render(); return; }
    add.busy = true; add.error = ""; render();
    try {
      if (needsTranslation(d)) await translateDraft(d);
      const { recipe, newIngs } = buildForSave(d);
      await ensureSession();
      let pass = ""; try { pass = localStorage.getItem(GATE_KEY) || ""; } catch (err) {}
      const { data: slug, error } = await sb.rpc("add_family_recipe", { pass_hash: pass, recipe, new_ingredients: newIngs });
      if (error) throw { code: /wrong password/i.test(error.message) ? "pw" : "save" };
      await loadFamilyRecipes();
      Object.assign(add, { stage: "input", draft: null, text: "", photo: null, error: "", busy: false });
      location.hash = "#/recipe/" + slug;
    } catch (err) {
      add.busy = false;
      add.error = err?.code === "pw" ? t("errPassword") : err?.code && err.code !== "save" ? readerMsg(err.code) : t("errSave");
      render();
    }
  }
});
app.addEventListener("input", e => {
  const f = e.target.dataset.f;
  if (f && add.draft) setPath(add.draft, f, f === "servings" ? e.target.value : e.target.value);
  if (e.target.id === "add-text") add.text = e.target.value;
});
app.addEventListener("change", async e => {
  if (e.target.id === "add-photo" && e.target.files?.[0]) {
    try { add.photo = await shrinkPhoto(e.target.files[0]); add.error = ""; } catch (err) { add.error = t("errPhoto"); }
    add.text = document.getElementById("add-text")?.value || add.text; render();
  }
  const f = e.target.dataset.f;
  if (f && add.draft && e.target.tagName === "SELECT") setPath(add.draft, f, e.target.value);
});
function alertInline(msg) { add.error = msg; render(); }
