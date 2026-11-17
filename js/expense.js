/* ---------- split a single expense (no group) ----------
   Makes a one-item bill, everyone picked claims it, so it splits evenly. No tax or tip. */
function NewExpensePage({ user, toast, go }) {
  const [what, setWhat] = useState("");
  const [category, setCategory] = useState(null);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(guessCurrency());
  const [people, setPeople] = useState(() => [{ id: uid(), name: displayNameOf(user) || tl("You", "Jij"), me: true }]);
  const [newName, setNewName] = useState("");
  const [payer, setPayer] = useState(null);
  const [busy, setBusy] = useState(false);
  const payerId = payer && people.some(p => p.id === payer) ? payer : people[0].id;
  const amt = num(amount);
  const ok = what.trim() && amt > 0 && people.length >= 2;
  const colorOf = id => COLORS[Math.max(0, people.findIndex(p => p.id === id)) % COLORS.length];

  const add = e => {
    e.preventDefault();
    const n = newName.trim();
    if (!n || people.length >= 12) return;
    setPeople(p => [...p, { id: uid(), name: n }]); setNewName("");
  };
  const submit = async () => {
    if (!ok) return;
    setBusy(true);
    try {
      const participants = people.map(p => ({
        id: p.id, name: p.name, isHost: p.id === payerId,
        ...(p.me ? { userId: user.id } : {}),
        ...(p.me && p.id === payerId ? { pay: user.user_metadata?.pay || {} } : {})
      }));
      const item = { id: uid(), name: what.trim(), price: String(r2(amt)), quantity: "1" };
      const t = new Date(), d = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
      const { data, error } = await supa.from("bills").insert({
        created_by: user.id, participants, tip: { mode: "percent", value: "0" },
        receipt: { kind: "expense", category, merchant: what.trim(), date: d, currency, items: [item], tax: "", fees: [] }
      }).select("id, share_code").single();
      if (error) throw error;
      const { error: e2 } = await supa.from("claims").insert(people.map(p => ({ bill_id: data.id, participant_id: p.id, item_id: item.id })));
      if (e2) throw e2;
      rememberCode(data.share_code);
      window.__gdPending = { focus: "share" };
      go("/b/" + data.share_code);
    } catch (e) { toast("Couldn't create the bill. Try again."); setBusy(false); }
  };
  const chip = (active, onClick, children, key) => html`<button key=${key} type="button" onClick=${onClick}
    className=${"inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-sm font-semibold " + (active ? "border-transparent bg-ink text-bg" : "border-line bg-card hover:bg-soft")}>${children}</button>`;

  return html`<div className="mx-auto flex w-full max-w-[640px] flex-col gap-4">
    <button type="button" onClick=${() => go("/")} className="inline-flex items-center gap-1 self-start text-sm font-semibold text-muted"><${Ic} n="ChevronLeft" s=${16} />Back</button>
    <div>
      <h1 className="font-display text-3xl font-extrabold">Split an expense</h1>
      <p className="mt-1 text-muted">One amount, shared evenly. No receipt needed.</p>
    </div>
    <${Card} className="flex flex-col gap-4 p-5">
      <div>
        <${Label} htmlFor="ne-what">What was it?</${Label}>
        <input id="ne-what" className=${inputCls} value=${what} maxLength=${60} placeholder="Gas, museum tickets, groceries…" onInput=${e => { setWhat(e.target.value); setCategory(null); }} />
        <div className="mt-2 flex flex-wrap gap-1.5">${EXPENSE_KINDS.map(([k, icon]) => html`<button key=${k} type="button" onClick=${() => { setWhat(tl(k, NL[k] || k)); setCategory(k); }}
          className=${"inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold " + (category === k ? "border-transparent bg-moneysoft text-money" : "border-line bg-card text-muted hover:bg-soft")}><${Ic} n=${icon} s=${13} />${k}</button>`)}</div>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div>
          <${Label} htmlFor="ne-amt">Amount</${Label}>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">${curSymbol(currency)}</span>
            <input id="ne-amt" className=${inputCls + " pl-8 font-mono"} inputMode="decimal" value=${amount} placeholder="0.00" onInput=${e => setAmount(e.target.value.replace(",", "."))} />
          </div>
        </div>
        <div>
          <${Label} htmlFor="ne-cur">Currency</${Label}>
          <select id="ne-cur" className=${inputCls} value=${currency} onChange=${e => setCurrency(e.target.value)}>${CURRENCIES.map(c => html`<option key=${c} value=${c}>${c}</option>`)}</select>
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-semibold">Who's in?</p>
        <div className="flex flex-wrap gap-1.5">${people.map(p => html`<span key=${p.id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card py-1 pl-1 pr-2 text-sm font-semibold">
          <${Avatar} name=${p.name} color=${colorOf(p.id)} size=${24} /><span translate="no">${p.name}</span>
          ${!p.me && html`<button type="button" onClick=${() => setPeople(v => v.filter(x => x.id !== p.id))} aria-label=${"Remove " + p.name} className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted hover:bg-soft"><${Ic} n="X" s=${12} /></button>`}
        </span>`)}</div>
        <form onSubmit=${add} className="mt-2 flex gap-2">
          <input aria-label="New person's name" className=${inputCls} value=${newName} maxLength=${40} onInput=${e => setNewName(e.target.value)} placeholder="Add someone" />
          <button type="submit" disabled=${!newName.trim()} className="shrink-0 rounded-xl border border-line bg-card px-4 font-semibold disabled:opacity-50">Add</button>
        </form>
      </div>
      ${people.length >= 2 && html`<div>
        <p className="mb-1.5 text-sm font-semibold">Paid by</p>
        <div className="flex flex-wrap gap-1.5">${people.map(p => chip(payerId === p.id, () => setPayer(p.id), html`<${Avatar} name=${p.name} color=${colorOf(p.id)} size=${24} /><span translate="no">${p.name}</span>`, p.id))}</div>
      </div>`}
      ${ok ? html`<p className="rounded-xl bg-soft px-3 py-2 text-sm">${tl(`${fmt(amt / people.length, currency)} each, split ${people.length} ways.`, `${fmt(amt / people.length, currency)} per persoon, verdeeld over ${people.length}.`)}</p>`
        : html`<p className="text-xs text-muted">${people.length < 2 ? "Add at least one more person." : "Fill in what it was and the amount."}</p>`}
      <button type="button" onClick=${submit} disabled=${!ok || busy} className="rounded-xl px-4 py-3 font-semibold text-moneyink disabled:opacity-50" style=${{ background: "var(--money)" }}>${busy ? "Creating…" : "Create and share"}</button>
    </${Card}>
  </div>`;
}
