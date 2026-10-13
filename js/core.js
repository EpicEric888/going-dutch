const { useState, useEffect, useMemo, useRef } = React;
const html = htm.bind(React.createElement);
const L = window.LucideReact || {};
const Ic = ({ n, s = 18, c = "" }) => { const C = L[n]; return C ? html`<${C} size=${s} className=${c} strokeWidth=${2} aria-hidden="true" />` : null; };

/* ---------- helpers ---------- */
const STORE = "goingdutch.local.v1";
const uid = () => Math.random().toString(36).slice(2, 9);
const num = v => { const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, "")); return isFinite(n) ? n : 0; };
const r2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
const fmt = n => (n < 0 ? "-$" : "$") + Math.abs(r2(n)).toFixed(2);
const sum = a => a.reduce((x, y) => x + y, 0);
const initials = name => (name || "").trim().split(/\s+/).filter(w => /^[\p{L}\p{N}]/u.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "?";
const COLORS = ["#0f9f6e", "#5b5bd6", "#d98a05", "#d6407e", "#0b8fc4", "#8a54d6", "#d4483b", "#0d9488", "#e06d14", "#5f9c12", "#0891b2", "#b34bc9"];
const colorFor = (participants, id) => COLORS[Math.max(0, participants.findIndex(p => p.id === id)) % COLORS.length];

/* ---------- themes ---------- */
const THEME_STORE = "goingdutch.theme";
const PALETTES = {
  emerald: { name: "Emerald", hero: ["#0a7d50", "#0d3b2c"],
    light: { bg: "#f2f5f3", card: "#ffffff", ink: "#0f1f19", muted: "#5d6e67", line: "#e1e8e4", soft: "#edf2ef", paper: "#fbfaf5", money: "#078554", moneyInk: "#ffffff", moneySoft: "#dff4ea" },
    dark: { bg: "#0b1210", card: "#131c19", ink: "#e7efeb", muted: "#93a39c", line: "#24312c", soft: "#1a2521", paper: "#17201d", money: "#3fd096", moneyInk: "#04140d", moneySoft: "#123327" } },
  ocean: { name: "Ocean", hero: ["#1f5fd0", "#0f2a5c"],
    light: { bg: "#f1f4f8", card: "#ffffff", ink: "#0e1a2b", muted: "#5a6678", line: "#dfe5ee", soft: "#eaf0f7", paper: "#f9fafc", money: "#1d64d8", moneyInk: "#ffffff", moneySoft: "#e2ecfc" },
    dark: { bg: "#0a0f18", card: "#121a26", ink: "#e6ecf5", muted: "#8f9bb0", line: "#222d3d", soft: "#18212f", paper: "#151d29", money: "#6ea8ff", moneyInk: "#06101f", moneySoft: "#14243d" } },
  plum: { name: "Plum", hero: ["#8a3fb8", "#3b1652"],
    light: { bg: "#f6f2f7", card: "#ffffff", ink: "#21142a", muted: "#6c5d73", line: "#e9e0ec", soft: "#f1eaf3", paper: "#fcf9fb", money: "#8a3fb8", moneyInk: "#ffffff", moneySoft: "#f1e4f8" },
    dark: { bg: "#120c16", card: "#1c1422", ink: "#efe7f2", muted: "#a595ad", line: "#30243a", soft: "#241a2b", paper: "#1f1726", money: "#cf8cf5", moneyInk: "#1a0826", moneySoft: "#33203f" } },
  saffron: { name: "Saffron", hero: ["#b8740a", "#4a2c03"],
    light: { bg: "#f7f4ee", card: "#fffdf9", ink: "#231a0c", muted: "#6f6452", line: "#ebe3d4", soft: "#f2ece1", paper: "#fffcf5", money: "#a86500", moneyInk: "#ffffff", moneySoft: "#fbeed6" },
    dark: { bg: "#14110b", card: "#1d1912", ink: "#f3ece0", muted: "#ab9f8b", line: "#342c1f", soft: "#26211a", paper: "#221d15", money: "#f2b544", moneyInk: "#1f1400", moneySoft: "#3a2c12" } },
  graphite: { name: "Graphite", hero: ["#2c2c2c", "#050505"],
    light: { bg: "#f3f3f2", card: "#ffffff", ink: "#151515", muted: "#666662", line: "#e2e2df", soft: "#ececea", paper: "#fafaf8", money: "#151515", moneyInk: "#ffffff", moneySoft: "#e6e6e3" },
    dark: { bg: "#0e0e0e", card: "#181818", ink: "#ececec", muted: "#9a9a96", line: "#2a2a2a", soft: "#202020", paper: "#1c1c1c", money: "#f2f2f2", moneyInk: "#111111", moneySoft: "#2b2b2b" } }
};
(function injectThemes() {
  const v = (t, mode) => `--bg:${t.bg};--card:${t.card};--ink:${t.ink};--muted:${t.muted};--line:${t.line};--soft:${t.soft};--paper:${t.paper};--money:${t.money};--money-ink:${t.moneyInk};--money-soft:${t.moneySoft};` +
    (mode === "dark" ? "--warn:#f2a94e;--warn-soft:#31230f;--danger:#f07a66;--shadow:0 1px 2px rgba(0,0,0,.4),0 10px 30px -14px rgba(0,0,0,.7);color-scheme:dark"
                     : "--warn:#a85a06;--warn-soft:#fcf0de;--danger:#c2412d;--shadow:0 1px 2px rgba(15,20,25,.05),0 8px 24px -12px rgba(15,20,25,.18);color-scheme:light");
  const css = Object.entries(PALETTES).map(([k, p]) => `
.app[data-pal="${k}"]{${v(p.light, "light")};--hero1:${p.hero[0]};--hero2:${p.hero[1]}}
.app[data-pal="${k}"][data-mode="dark"]{${v(p.dark, "dark")}}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .app[data-pal="${k}"][data-mode="auto"]{${v(p.dark, "dark")}}}
:root[data-theme="dark"] .app[data-pal="${k}"][data-mode="auto"]{${v(p.dark, "dark")}}`).join("\n");
  const el = document.createElement("style"); el.textContent = css; document.head.appendChild(el);
})();
function loadTheme() {
  try { const t = JSON.parse(localStorage.getItem(THEME_STORE) || "null"); if (t && PALETTES[t.pal] && ["auto", "light", "dark"].includes(t.mode)) return t; } catch (e) {}
  return { pal: "emerald", mode: "auto" };
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand("copy"); ta.remove(); return ok;
    } catch (e2) { return false; }
  }
}

/* ---------- demo data (example only) ---------- */
function demoState() {
  const items = [
    ["Burrata, heirloom tomato", 16, 1], ["Calamari fritti", 18, 1], ["Cacio e pepe", 24, 1],
    ["Rigatoni bolognese", 26, 1], ["Whole branzino", 38, 1], ["Margherita pizza", 19, 1],
    ["Negroni", 32, 2], ["Chianti Classico, bottle", 58, 1], ["Tiramisu", 12, 1]
  ].map(([name, price, quantity]) => ({ id: uid(), name, price: String(price), quantity: String(quantity) }));
  const ppl = [["Sam", true], ["Maya"], ["Jordan"], ["Priya"]].map(([name, isHost]) => ({ id: uid(), name, isHost: !!isHost }));
  const [S, M, J, P] = ppl.map(p => p.id);
  const by = n => items.find(i => i.name.startsWith(n)).id;
  const assignments = {
    [by("Burrata")]: [S, M, J, P], [by("Calamari")]: [S, M, J, P],
    [by("Cacio")]: [M], [by("Rigatoni")]: [J], [by("Whole")]: [S], [by("Margherita")]: [P],
    [by("Negroni")]: [S, J], [by("Chianti")]: [S, M, P]
  };
  return {
    isDemo: true, mode: "host-setup",
    receipt: { merchant: "Osteria Lupa", date: "2026-10-10", items, tax: "18.83", fees: [{ id: uid(), name: "SD health mandate 4%", amount: "9.72" }], printedSubtotal: 243, printedTotal: null },
    tip: { mode: "percent", value: "20" },
    participants: ppl, assignments, shareCode: null
  };
}
function blankState() {
  return {
    isDemo: false, mode: "host-setup",
    receipt: { merchant: "", date: new Date().toISOString().slice(0, 10), items: [{ id: uid(), name: "", price: "", quantity: "1" }], tax: "", fees: [], printedSubtotal: null, printedTotal: null },
    tip: { mode: "percent", value: "18" },
    participants: [{ id: uid(), name: "", isHost: true }], assignments: {}, shareCode: null
  };
}
function loadState() {
  try { const raw = localStorage.getItem(STORE); if (raw) { const s = JSON.parse(raw); if (s && s.receipt && s.participants) return s; } } catch (e) {}
  return demoState();
}

/* ---------- the math ---------- */
function compute(state) {
  const { receipt, tip, participants, assignments } = state;
  const line = it => num(it.price);
  const subtotal = sum(receipt.items.map(line));
  const tax = num(receipt.tax);
  const fees = sum(receipt.fees.map(f => num(f.amount)));
  const tipAmt = tip.mode === "percent" ? subtotal * num(tip.value) / 100 : num(tip.value);
  const total = subtotal + tax + fees + tipAmt;
  const per = {}; participants.forEach(p => per[p.id] = { items: [], sub: 0 });
  const unassignedItems = [];
  receipt.items.forEach(it => {
    const ids = (assignments[it.id] || []).filter(id => per[id]);
    if (!ids.length) { if (line(it) !== 0 || it.name) unassignedItems.push(it); return; }
    const share = line(it) / ids.length;
    ids.forEach(id => { per[id].sub += share; per[id].items.push({ id: it.id, name: it.name || "Untitled item", share, ways: ids.length }); });
  });
  const unassigned = sum(unassignedItems.map(line));
  const rows = participants.map(p => {
    const s = per[p.id].sub, ratio = subtotal > 0 ? s / subtotal : 0;
    const taxS = ratio * tax, feeS = ratio * fees, tipS = ratio * tipAmt;
    const exact = s + taxS + feeS + tipS;
    return { p, items: per[p.id].items, sub: s, tax: taxS, fees: feeS, tip: tipS, exact, total: r2(exact), adj: 0 };
  });
  // Cent reconciliation: rounded shares must add to the rounded total of what is covered. Host absorbs the difference.
  const target = Math.round(sum(rows.map(r => r.exact)) * 100);
  const got = sum(rows.map(r => Math.round(r.total * 100)));
  const diff = target - got;
  const host = rows.find(r => r.p.isHost) || rows[0];
  if (host && diff) { host.adj = diff / 100; host.total = r2(host.total + diff / 100); }
  return { subtotal, tax, fees, tipAmt, total, rows, unassigned, unassignedItems };
}

