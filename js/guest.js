/* ---------- paying the host ---------- */
const cleanHandle = (v, re) => String(v || "").trim().replace(re, "").replace(/^[@$]/, "");
function payLinks(host, amount, note) {
  const p = host?.pay || {};
  const a = r2(Math.max(0, amount)).toFixed(2);
  const n = encodeURIComponent(note || "Going Dutch");
  const links = [];
  const venmo = cleanHandle(p.venmo, /^https?:\/\/(www\.)?venmo\.com\/(u\/)?/i);
  const paypal = cleanHandle(p.paypal, /^https?:\/\/(www\.)?paypal\.me\//i);
  const cashapp = cleanHandle(p.cashapp, /^https?:\/\/(www\.)?cash\.app\//i);
  if (venmo) links.push({ id: "venmo", label: "Venmo", href: `https://venmo.com/?txn=pay&recipients=${encodeURIComponent(venmo)}&amount=${a}&note=${n}` });
  if (paypal) links.push({ id: "paypal", label: "PayPal", href: `https://paypal.me/${encodeURIComponent(paypal)}/${a}USD` });
  if (cashapp) links.push({ id: "cashapp", label: "Cash App", href: `https://cash.app/$${encodeURIComponent(cashapp)}/${a}` });
  return { links, zelle: String(p.zelle || "").trim() };
}

function PayButtons({ host, amount, note, toast }) {
  const { links, zelle } = payLinks(host, amount, note);
  if (!links.length && !zelle) return html`<p className="text-sm text-muted">${host?.name || "The host"} hasn't added how to pay them yet. Ask them, or settle up in person.</p>`;
  return html`<div className="flex flex-col gap-2">
    ${links.length > 0 && html`<div className="grid gap-2" style=${{ gridTemplateColumns: `repeat(${Math.min(links.length, 3)}, minmax(0, 1fr))` }}>
      ${links.map(l => html`<a key=${l.id} href=${l.href} target="_blank" rel="noopener"
        className="inline-flex items-center justify-center rounded-xl py-2.5 text-sm font-semibold text-moneyink" style=${{ background: "var(--money)" }}>${l.label}</a>`)}
    </div>`}
    ${zelle && html`<div className="flex items-center gap-2 rounded-xl bg-soft px-3 py-2 text-sm">
      <span className="font-semibold">Zelle</span><span className="flex-1 min-w-0 truncate font-mono text-xs select-all">${zelle}</span>
      <button type="button" onClick=${async () => toast(await copyText(zelle) ? "Copied" : "Copy blocked")} className="text-money font-semibold">Copy</button>
    </div>`}
  </div>`;
}

function PaySetup({ state, setState, user, toast }) {
  const host = state.participants.find(p => p.isHost);
  if (!host) return null;
  const pay = host.pay || {};
  const set = (k, v) => setState(s => ({ ...s, participants: s.participants.map(p => p.isHost ? { ...p, pay: { ...(p.pay || {}), [k]: v } } : p) }));
  const iAmHost = host.userId === user.id;
  const remember = async () => {
    if (!iAmHost) return;
    const { error } = await supa.auth.updateUser({ data: { pay: host.pay || {} } });
    if (!error) toast("Saved for your next bills too");
  };
  const fields = [["venmo", "Venmo", "@username"], ["paypal", "PayPal.me", "username"], ["cashapp", "Cash App", "$cashtag"], ["zelle", "Zelle", "email or phone"]];
  return html`<div className="flex flex-col gap-3">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      ${fields.map(([k, label, ph]) => html`<div key=${k}><${Label} htmlFor=${"pay-" + k}>${label}</${Label}>
        <input id=${"pay-" + k} className=${inputCls} value=${pay[k] || ""} placeholder=${ph} onInput=${e => set(k, e.target.value)} onBlur=${remember} autocomplete="off" /></div>`)}
    </div>
    <p className="text-xs text-muted">Friends get one-tap buttons with their amount filled in. Fill in whichever you use.${iAmHost ? " We'll remember these for your next bills." : ""}</p>
  </div>`;
}

/* ---------- "who are you?" ---------- */
function PickMe({ state, user, onPick, onAdd }) {
  const [name, setName] = useState("");
  const P = state.participants;
  return html`<${Card} className="p-5">
    <p className="font-display text-2xl font-extrabold leading-tight">Who are you?</p>
    <p className="text-sm text-muted mt-1">Tap your name to see the bill and claim what you had.</p>
    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
      ${P.map(p => {
        const takenByOther = p.userId && p.userId !== user.id;
        return html`<button key=${p.id} type="button" onClick=${() => onPick(p.id)}
          className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3 text-left hover:bg-soft transition">
          <${Avatar} name=${p.name} color=${colorFor(P, p.id)} size=${40} />
          <span className="min-w-0 flex-1"><span className="block font-semibold leading-snug break-words">${p.name || "Unnamed"}</span>
            <span className="block text-xs text-muted mt-0.5">${p.isHost ? "Paid the bill" : takenByOther ? "Picked on another phone" : "Tap to join"}</span></span>
        </button>`;
      })}
    </div>
    <form className="mt-4 flex gap-2" onSubmit=${e => { e.preventDefault(); const n = name.trim(); if (n) onAdd(n); }}>
      <input id="pickme-new" aria-label="Your name" className=${inputCls} value=${name} onInput=${e => setName(e.target.value)} placeholder="Not on the list? Add your name" disabled=${P.length >= 12} />
      <button type="submit" disabled=${!name.trim() || P.length >= 12} className="shrink-0 rounded-xl bg-ink text-bg px-4 font-semibold disabled:opacity-40">Join</button>
    </form>
  </${Card}>`;
}

/* ---------- claiming your own items ---------- */
function MyClaims({ state, setState, calc, meId, onSwitch, toast, goSummary }) {
  const [open, setOpen] = useState(false);
  const P = state.participants;
  const me = P.find(p => p.id === meId);
  const host = P.find(p => p.isHost);
  const row = calc.rows.find(r => r.p.id === meId);
  const items = state.receipt.items.filter(i => i.name || num(i.price));
  const toggle = it => setState(s => setClaimUnits(s, it.id, meId, unitsOf(s, it.id, meId) ? 0 : claimDefault(s, it, meId)));
  const setMine = (itemId, n) => setState(s => setClaimUnits(s, itemId, meId, n));
  const setPaid = v => setState(s => ({ ...s, participants: s.participants.map(p => p.id === meId ? { ...p, paid: v } : p) }));
  const owedToMe = sum(calc.rows.filter(r => !r.p.isHost).map(r => r.total));
  const note = `${state.receipt.merchant || "Dinner"} via Going Dutch`;
  // fully claimed by others, none of it mine: shown greyed and compact at the bottom
  const isTaken = it => {
    const ids = (state.assignments[it.id] || []).filter(id => P.some(p => p.id === id));
    if (!ids.length || ids.includes(meId)) return false;
    return itemQty(it) - sum(ids.map(id => unitsOf(state, it.id, id))) <= FULL;
  };
  const takenItems = items.filter(isTaken);
  const openItems = items.filter(it => !isTaken(it));

  return html`<div className="flex flex-col gap-3 pb-72">
    <div className="flex items-center gap-3">
      <${Avatar} name=${me.name} color=${colorFor(P, me.id)} size=${44} />
      <div className="min-w-0 flex-1"><p className="font-display text-xl font-bold leading-tight truncate">Hi ${me.name || "there"}</p>
        <p className="text-sm text-muted">Tap everything you had. Shared something? Tap it too and it splits. Only had part, like half the fries? Pick how much after you tap.</p></div>
      <button type="button" onClick=${onSwitch} className="text-sm font-semibold text-money whitespace-nowrap">Not you?</button>
    </div>


    <ul className="flex flex-col gap-2">
      ${openItems.map(it => {
        const ids = (state.assignments[it.id] || []).filter(id => P.some(p => p.id === id));
        const qty = itemQty(it);
        const u = id => unitsOf(state, it.id, id);
        const myUnits = ids.includes(meId) ? u(meId) : 0;
        const mine = myUnits > 0;
        const othersIds = ids.filter(id => id !== meId);
        const othersUnits = sum(othersIds.map(u));
        const others = othersIds.map(id => (P.find(p => p.id === id)?.name || "Someone") + (u(id) !== 1 || qty > 1 ? ` (${fmtPortion(u(id)) === "all" ? 1 : fmtPortion(u(id))})` : ""));
        const price = num(it.price);
        const myShare = shareFor(price, qty, mine ? myUnits : claimDefault(state, it, meId), othersUnits);
        const leftRaw = qty - othersUnits - myUnits;
        const left = leftRaw > FULL ? leftRaw : 0;
        const sub = others.length ? (mine ? (qty > 1 ? "Also: " : "Shared with ") : "Claimed by ") + others.join(", ") : mine ? "Just you" : "Nobody yet";
        return html`<li key=${it.id} className=${"rounded-2xl border transition " + (mine ? "bg-moneysoft" : "bg-card border-line")} style=${mine ? { borderColor: "var(--money)" } : null}>
          <button type="button" onClick=${() => toggle(it)} aria-pressed=${mine}
            className=${"w-full flex items-center gap-3 rounded-2xl p-3.5 text-left " + (mine ? "" : "hover:bg-soft")}>
            <span className=${"inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 " + (mine ? "text-moneyink" : "border-line")}
              style=${mine ? { background: "var(--money)", borderColor: "var(--money)" } : null}>${mine && html`<${Ic} n="Check" s=${16} />`}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold leading-snug">${it.name || "Untitled item"}${qty > 1 && html`<span className="ml-1.5 text-xs font-mono text-muted">×${qty}</span>`}</span>
              <span className="block text-xs text-muted">${sub}${left > 0 && (mine || others.length) ? html` · <span className="text-warn">${fmtPortion(left) === "all" ? 1 : fmtPortion(left)} left</span>` : null}</span>
            </span>
            <span className="text-right">
              <span className="block font-mono font-bold tnum">${fmt(mine ? myShare : price)}</span>
              ${(mine && myShare !== price) || (!mine && (others.length || qty > 1)) ? html`<span className="block text-[11px] text-muted tnum">${mine ? "of " + fmt(price) : "you'd pay " + fmt(myShare)}</span>` : null}
            </span>
          </button>
          ${mine && qty === 1 && html`<div className="flex flex-wrap items-center justify-between gap-2 border-t px-3.5 py-2.5" style=${{ borderColor: "color-mix(in srgb, var(--money) 30%, transparent)" }}>
            <span className="text-sm">How much did you have?</span>
            <span className="inline-flex gap-1" role="group" aria-label="Your portion">
              ${[[1, "All"], [0.5, "½"], [1 / 3, "⅓"], [0.25, "¼"]].map(([v, label]) => { const on = Math.abs(myUnits - v) < 0.005; return html`<button key=${label} type="button" onClick=${() => setMine(it.id, v)} aria-pressed=${on}
                className=${"min-w-[2.5rem] rounded-full border px-2.5 py-1 text-sm font-semibold transition " + (on ? "text-moneyink" : "border-line bg-card")} style=${on ? { background: "var(--money)", borderColor: "var(--money)" } : null}>${label}</button>`; })}
            </span>
          </div>`}
          ${mine && qty > 1 && html`<div className="flex items-center justify-between gap-3 border-t px-3.5 py-2.5" style=${{ borderColor: "color-mix(in srgb, var(--money) 30%, transparent)" }}>
            <span className="text-sm">How many did you have?</span>
            <span className="inline-flex items-center gap-1">
              <button type="button" onClick=${() => setMine(it.id, myUnits > 1 ? Math.ceil(myUnits) - 1 : 0)} aria-label="One fewer" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-card"><${Ic} n="Minus" s=${14} /></button>
              <span className="w-8 text-center font-mono font-bold tnum">${fmtPortion(myUnits) === "all" ? 1 : fmtPortion(myUnits)}</span>
              <button type="button" onClick=${() => setMine(it.id, Math.floor(myUnits) + 1)} disabled=${myUnits >= 99} aria-label="One more" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-card disabled:opacity-40"><${Ic} n="Plus" s=${14} /></button>
            </span>
          </div>`}
        </li>`;
      })}
    </ul>

    ${takenItems.length > 0 && html`<div className="mt-2">
      <p className="px-1 pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Already claimed · ${takenItems.length}</p>
      <ul className="flex flex-col gap-1.5">
        ${takenItems.map(it => {
          const ids = (state.assignments[it.id] || []).filter(id => P.some(p => p.id === id));
          const names = ids.map(id => P.find(p => p.id === id)?.name || "Someone").join(", ");
          return html`<li key=${it.id} className="flex items-center gap-3 rounded-xl border border-line bg-soft px-3 py-2 opacity-60">
            <span className="flex w-[50px] shrink-0 -space-x-1.5">${ids.slice(0, 3).map(id => html`<${Avatar} key=${id} name=${P.find(p => p.id === id)?.name} color=${colorFor(P, id)} size=${22} />`)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium ">${it.name || "Untitled item"}</span>
              <span className="block truncate text-[11px] text-muted">${names}</span>
            </span>
            <span className="font-mono text-sm tnum text-muted">${fmt(num(it.price))}</span>
            <button type="button" onClick=${() => { toggle(it); toast("Split with " + names); }} className="rounded-full border border-line bg-card px-2.5 py-1 text-xs font-semibold">Split it</button>
          </li>`;
        })}
      </ul>
    </div>`}

    <div className="above-tabbar fixed inset-x-0 z-30 px-4" style=${{ bottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
      <div className="mx-auto max-w-[640px] rounded-2xl border border-line bg-card p-4 shadow-card">
        ${me.isHost ? html`
          <div className="flex items-center gap-3">
            <div className="flex-1"><p className="text-xs text-muted">Your share ${fmt(row?.total || 0)} · you paid ${fmt(calc.total)}</p>
              <p className="font-display text-2xl font-extrabold text-money tnum">${fmt(owedToMe)} <span className="text-sm font-semibold text-muted">owed to you</span></p></div>
            <button type="button" onClick=${goSummary} className="rounded-xl bg-ink text-bg px-4 py-2.5 text-sm font-semibold">Who owes what</button>
          </div>` : html`
          <div className="flex items-center gap-3">
            <button type="button" onClick=${() => setOpen(o => !o)} aria-expanded=${open} className="flex-1 text-left">
              <p className="text-xs text-muted">You owe ${host?.name || "the host"} ${open ? "▴" : "▾"}</p>
              <p className="font-display text-3xl font-extrabold text-money tnum leading-tight">${fmt(row?.total || 0)}</p>
            </button>
            ${me.paid ? html`<button type="button" onClick=${() => setPaid(false)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-money bg-moneysoft"><${Ic} n="CheckCircle2" s=${16} />Paid</button>`
              : html`<button type="button" disabled=${!row?.total} onClick=${() => { setPaid(true); toast("Marked as paid"); }} className="rounded-xl border border-line px-3 py-2 text-sm font-semibold hover:bg-soft disabled:opacity-40">I've paid</button>`}
          </div>
          ${open && row && html`<div className="mt-2 rounded-xl bg-soft p-3"><${Breakdown} r=${row} calc=${calc} /></div>`}
          ${!me.paid && row?.total > 0 && html`<div className="mt-3"><${PayButtons} host=${host} amount=${row.total} note=${note} toast=${toast} /></div>`}`}
      </div>
    </div>
  </div>`;
}
