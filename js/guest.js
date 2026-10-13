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
    <div className="mt-4 grid grid-cols-2 gap-2">
      ${P.map(p => {
        const takenByOther = p.userId && p.userId !== user.id;
        return html`<button key=${p.id} type="button" onClick=${() => onPick(p.id)}
          className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3 text-left hover:bg-soft transition">
          <${Avatar} name=${p.name} color=${colorFor(P, p.id)} size=${40} />
          <span className="min-w-0"><span className="block font-semibold truncate">${p.name || "Unnamed"}</span>
            <span className="block text-xs text-muted">${p.isHost ? "Paid the bill" : takenByOther ? "Picked on another phone" : "Tap to join"}</span></span>
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
  const toggle = itemId => setState(s => {
    const cur = s.assignments[itemId] || [];
    const next = cur.includes(meId) ? cur.filter(x => x !== meId) : [...cur, meId];
    return { ...s, assignments: { ...s.assignments, [itemId]: next } };
  });
  const setPaid = v => setState(s => ({ ...s, participants: s.participants.map(p => p.id === meId ? { ...p, paid: v } : p) }));
  const owedToMe = sum(calc.rows.filter(r => !r.p.isHost).map(r => r.total));
  const note = `${state.receipt.merchant || "Dinner"} via Going Dutch`;

  return html`<div className="flex flex-col gap-3 pb-72">
    <div className="flex items-center gap-3">
      <${Avatar} name=${me.name} color=${colorFor(P, me.id)} size=${44} />
      <div className="min-w-0 flex-1"><p className="font-display text-xl font-bold leading-tight truncate">Hi ${me.name || "there"}</p>
        <p className="text-sm text-muted">Tap everything you had. Shared something? Tap it too and it splits.</p></div>
      <button type="button" onClick=${onSwitch} className="text-sm font-semibold text-money whitespace-nowrap">Not you?</button>
    </div>

    ${calc.unassignedItems.length > 0 && html`<p className="text-xs text-warn tnum">${calc.unassignedItems.length} unclaimed ${calc.unassignedItems.length === 1 ? "item" : "items"} left on the bill (${fmt(calc.unassigned)})</p>`}

    <ul className="flex flex-col gap-2">
      ${items.map(it => {
        const ids = (state.assignments[it.id] || []).filter(id => P.some(p => p.id === id));
        const mine = ids.includes(meId);
        const others = ids.filter(id => id !== meId).map(id => P.find(p => p.id === id)?.name || "Someone");
        const price = num(it.price);
        const myShare = mine ? price / ids.length : price / (ids.length + 1);
        return html`<li key=${it.id}><button type="button" onClick=${() => toggle(it.id)} aria-pressed=${mine}
          className=${"w-full flex items-center gap-3 rounded-2xl border p-3.5 text-left transition " + (mine ? "bg-moneysoft" : "bg-card border-line hover:bg-soft")}
          style=${mine ? { borderColor: "var(--money)" } : null}>
          <span className=${"inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 " + (mine ? "text-moneyink" : "border-line")}
            style=${mine ? { background: "var(--money)", borderColor: "var(--money)" } : null}>${mine && html`<${Ic} n="Check" s=${16} />`}</span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold leading-snug">${it.name || "Untitled item"}${num(it.quantity) > 1 && html`<span className="ml-1.5 text-xs font-mono text-muted">×${num(it.quantity)}</span>`}</span>
            <span className="block text-xs text-muted truncate">${others.length ? (mine ? "Shared with " : "Claimed by ") + others.join(", ") : mine ? "Just you" : "Nobody yet"}</span>
          </span>
          <span className="text-right">
            <span className="block font-mono font-bold tnum">${fmt(mine ? myShare : price)}</span>
            ${(mine && ids.length > 1) || (!mine && others.length) ? html`<span className="block text-[11px] text-muted tnum">${mine ? "of " + fmt(price) : "you'd pay " + fmt(myShare)}</span>` : null}
          </span>
        </button></li>`;
      })}
    </ul>

    <div className="fixed inset-x-0 z-30 px-4" style=${{ bottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
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
