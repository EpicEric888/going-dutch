/* ---------- small UI parts ---------- */
const Card = ({ children, className = "" }) => html`<section className=${"bg-card rounded-2xl shadow-card border border-line " + className}>${children}</section>`;
const Label = ({ children, htmlFor }) => html`<label htmlFor=${htmlFor} className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted mb-1.5">${children}</label>`;
const inputCls = "w-full min-w-0 bg-soft border border-transparent focus:border-money focus:bg-card rounded-xl px-3 py-2.5 text-ink placeholder:text-muted/70 outline-none focus-visible:ring-2 focus-visible:ring-money/30 transition";

function Avatar({ name, color, size = 36 }) {
  return html`<span className="inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0 select-none"
    style=${{ width: size, height: size, background: color, fontSize: size * 0.38 }}>${initials(name)}</span>`;
}
function StepHead({ n, title, sub }) {
  return html`<div className="flex items-start gap-3 mb-4">
    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-bg font-mono text-xs font-bold">${n}</span>
    <div className="min-w-0"><h2 className="font-display text-xl font-bold leading-tight">${title}</h2>${sub && html`<p className="text-sm text-muted mt-0.5">${sub}</p>`}</div>
  </div>`;
}

/* ---------- Step 1: upload ---------- */
function UploadZone({ onParsed, sampleState }) {
  const [drag, setDrag] = useState(false);
  const [status, setStatus] = useState({ kind: "idle" });
  const [preview, setPreview] = useState(null);
  const inputRef = useRef(null);

  async function pdfToBlob(file) {
    if (!window.pdfjsLib) {
      await new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
      await new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    }
    const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer(), disableWorker: true }).promise;
    const page = await pdf.getPage(1);
    const vp = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas"); canvas.width = vp.width; canvas.height = vp.height;
    await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
    return await new Promise(r => canvas.toBlob(r, "image/png"));
  }

  async function handle(file) {
    if (!file) return;
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPdf && !/^image\//.test(file.type)) { setStatus({ kind: "error", msg: "That file type isn't supported. Use a JPG, PNG or PDF." }); return; }
    try {
      setStatus({ kind: "busy", msg: isPdf ? "Opening PDF…" : "Preparing image…" });
      const blob = isPdf ? await pdfToBlob(file) : file;
      setPreview(URL.createObjectURL(blob));
      setStatus({ kind: "busy", msg: "Reading your receipt…" });
      const data = await readReceipt(blob);
      if (!data || !Array.isArray(data.items)) throw { code: "invalid_json" };
      onParsed(data);
      setStatus({ kind: "done", msg: `Read ${data.items.length} items. Check them below and fix anything that looks off.` });
    } catch (e) {
      const map = {
        not_granted: "Claude access wasn't allowed for this page, so the receipt can't be read. Type it in below.",
        rate_limited: "Too many requests right now. Wait a minute and try again.",
        image_rejected: "We couldn't open that image. Try a clearer photo or a different file.",
        invalid_json: "We couldn't make sense of that receipt. Try a sharper, straight-on photo, or type it in below.",
        refused: "We couldn't read that image. Try another photo.",
        not_set_up: "Receipt reading isn't switched on yet. Type the receipt in below.",
        too_large: "That photo is too large. Try a smaller one."
      };
      setStatus({ kind: "error", msg: map[e?.code] || "Something went wrong reading the receipt. Try again, or type it in below." });
    }
  }

  const busy = status.kind === "busy";
  return html`<div>
    <div
      role="button" tabIndex=${0}
      onClick=${() => !busy && inputRef.current?.click()}
      onKeyDown=${e => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
      onDragOver=${e => { e.preventDefault(); setDrag(true); }}
      onDragLeave=${() => setDrag(false)}
      onDrop=${e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files?.[0]); }}
      className=${"relative overflow-hidden rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition outline-none focus-visible:ring-2 focus-visible:ring-money/40 " +
        (drag ? "border-money bg-moneysoft" : "border-line bg-soft hover:border-money/60")}>
      <input ref=${inputRef} id="receipt-file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
        onChange=${e => { handle(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="flex flex-col items-center gap-2">
        <span className=${"inline-flex h-12 w-12 items-center justify-center rounded-2xl " + (busy ? "bg-money text-moneyink" : "bg-card text-money shadow-card")}>
          ${busy ? html`<${Ic} n="Loader2" s=${22} c="animate-spin" />` : html`<${Ic} n="ScanLine" s=${22} />`}
        </span>
        <p className="font-semibold">${busy ? status.msg : "Drop a receipt photo or PDF"}</p>
        <p className="text-sm text-muted">${busy ? "This usually takes 5 to 20 seconds." : "or tap to choose · JPG, PNG, PDF"}</p>
      </div>
    </div>
    ${(status.kind === "error" || status.kind === "done") && html`
      <div className=${"mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm " + (status.kind === "error" ? "bg-warnsoft text-warn" : "bg-moneysoft text-money")}>
        <${Ic} n=${status.kind === "error" ? "AlertTriangle" : "CheckCircle2"} s=${16} c="mt-0.5 shrink-0" /><span>${status.msg}</span>
      </div>`}
    ${preview && html`<details className="mt-3 text-sm"><summary className="cursor-pointer text-muted">Show uploaded image</summary><img src=${preview} alt="Uploaded receipt" className="mt-2 max-h-80 rounded-xl border border-line mx-auto" /></details>`}
  </div>`;
}

/* ---------- Step 1b: editable receipt ---------- */
function ReceiptEditor({ state, setState, calc }) {
  const R = state.receipt;
  const setR = patch => setState(s => ({ ...s, receipt: { ...s.receipt, ...patch } }));
  const setItem = (id, patch) => setR({ items: R.items.map(i => i.id === id ? { ...i, ...patch } : i) });
  const removeItem = id => setState(s => {
    const a = { ...s.assignments }; delete a[id];
    return { ...s, assignments: a, receipt: { ...s.receipt, items: s.receipt.items.filter(i => i.id !== id) } };
  });
  const addItem = () => setR({ items: [...R.items, { id: uid(), name: "", price: "", quantity: "1" }] });
  const setFee = (id, patch) => setR({ fees: R.fees.map(f => f.id === id ? { ...f, ...patch } : f) });
  const tip = state.tip;
  const setTip = patch => setState(s => ({ ...s, tip: { ...s.tip, ...patch } }));
  const mismatch = R.printedTotal != null && Math.abs(R.printedTotal - calc.total) > 0.02;

  return html`<div className="flex flex-col gap-5">
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
      <div className="min-w-0"><${Label} htmlFor="merchant">Restaurant</${Label}>
        <input id="merchant" className=${inputCls} value=${R.merchant} placeholder="Where did you eat?" onInput=${e => setR({ merchant: e.target.value })} /></div>
      <div><${Label} htmlFor="date">Date</${Label}>
        <input id="date" type="date" className=${inputCls} value=${R.date} onInput=${e => setR({ date: e.target.value })} /></div>
    </div>

    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Items</span>
        <span className="text-[11px] text-muted">Qty · Line total</span>
      </div>
      <ul className="flex flex-col gap-2">
        ${R.items.map((it, idx) => html`<li key=${it.id} className="flex items-center gap-2">
          <input id=${"name-" + it.id} aria-label="Item name" className=${inputCls + " flex-1"} value=${it.name} placeholder=${"Item " + (idx + 1)} onInput=${e => setItem(it.id, { name: e.target.value })} />
          <input id=${"qty-" + it.id} aria-label="Quantity" inputMode="numeric" className=${inputCls + " !w-12 text-center tnum px-1"} value=${it.quantity} onInput=${e => setItem(it.id, { quantity: e.target.value })} />
          <div className="relative w-24 shrink-0">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
            <input id=${"price-" + it.id} aria-label="Line total" inputMode="decimal" className=${inputCls + " pl-6 pr-2 text-right font-mono tnum"} value=${it.price} placeholder="0.00" onInput=${e => setItem(it.id, { price: e.target.value })} />
          </div>
          <button type="button" aria-label="Remove item" onClick=${() => removeItem(it.id)} className="p-2 -mr-1 rounded-lg text-muted hover:text-danger hover:bg-soft"><${Ic} n="Trash2" s=${16} /></button>
        </li>`)}
      </ul>
      <button type="button" onClick=${addItem} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-money hover:underline"><${Ic} n="Plus" s=${16} />Add item</button>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div><${Label} htmlFor="tax">Tax</${Label}>
        <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
        <input id="tax" inputMode="decimal" className=${inputCls + " pl-7 font-mono tnum"} value=${R.tax} placeholder="0.00" onInput=${e => setR({ tax: e.target.value })} /></div>
        ${calc.subtotal > 0 && num(R.tax) > 0 && html`<p className="text-xs text-muted mt-1 tnum">${(num(R.tax) / calc.subtotal * 100).toFixed(2)}% of subtotal</p>`}
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="tip" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Tip</label>
          <div className="inline-flex rounded-lg bg-soft p-0.5 text-xs font-semibold" role="group" aria-label="Tip type">
            ${["percent", "amount"].map(m => html`<button key=${m} type="button" onClick=${() => {
              if (m === tip.mode) return;
              const v = m === "amount" ? r2(calc.tipAmt).toFixed(2) : (calc.subtotal ? r2(calc.tipAmt / calc.subtotal * 100) : 0).toString();
              setTip({ mode: m, value: v });
            }} className=${"px-2.5 py-1 rounded-md transition " + (tip.mode === m ? "bg-card shadow-card text-ink" : "text-muted")}>${m === "percent" ? "%" : "$"}</button>`)}
          </div>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">${tip.mode === "percent" ? "%" : "$"}</span>
          <input id="tip" inputMode="decimal" className=${inputCls + " pl-7 font-mono tnum"} value=${tip.value} placeholder="0" onInput=${e => setTip({ value: e.target.value })} />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          ${[15, 18, 20, 22].map(p => html`<button key=${p} type="button" onClick=${() => setTip({ mode: "percent", value: String(p) })}
            className=${"px-2.5 py-1 rounded-full text-xs font-semibold border transition " + (tip.mode === "percent" && num(tip.value) === p ? "bg-money text-moneyink border-money" : "border-line text-muted hover:border-money/50")}>${p}%</button>`)}
          <span className="text-xs text-muted self-center ml-auto tnum">= ${fmt(calc.tipAmt)}</span>
        </div>
      </div>
    </div>

    <div>
      <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted mb-1.5">Other fees</span>
      ${R.fees.length === 0 && html`<p className="text-sm text-muted mb-1">No service, delivery or kitchen fees on this bill.</p>`}
      <ul className="flex flex-col gap-2">
        ${R.fees.map(f => html`<li key=${f.id} className="flex items-center gap-2">
          <input id=${"fee-name-" + f.id} aria-label="Fee name" className=${inputCls + " flex-1"} value=${f.name} placeholder="Service fee" onInput=${e => setFee(f.id, { name: e.target.value })} />
          <div className="relative w-24 shrink-0"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
            <input id=${"fee-amt-" + f.id} aria-label="Fee amount" inputMode="decimal" className=${inputCls + " pl-6 pr-2 text-right font-mono tnum"} value=${f.amount} placeholder="0.00" onInput=${e => setFee(f.id, { amount: e.target.value })} /></div>
          <button type="button" aria-label="Remove fee" onClick=${() => setR({ fees: R.fees.filter(x => x.id !== f.id) })} className="p-2 -mr-1 rounded-lg text-muted hover:text-danger hover:bg-soft"><${Ic} n="Trash2" s=${16} /></button>
        </li>`)}
      </ul>
      <button type="button" onClick=${() => setR({ fees: [...R.fees, { id: uid(), name: "", amount: "" }] })} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-money hover:underline"><${Ic} n="Plus" s=${16} />Add fee</button>
    </div>

    <${PaperTotals} calc=${calc} receipt=${R} />
    ${mismatch && html`<div className="flex items-start gap-2 rounded-xl bg-warnsoft text-warn px-3 py-2.5 text-sm">
      <${Ic} n="AlertTriangle" s=${16} c="mt-0.5 shrink-0" /><span>The receipt's printed total is ${fmt(R.printedTotal)}, but these numbers add up to ${fmt(calc.total)}. Check the items and charges.</span></div>`}
  </div>`;
}

function PaperTotals({ calc, receipt }) {
  const Row = ({ k, v, strong }) => html`<div className=${"flex justify-between gap-4 " + (strong ? "text-base font-bold text-ink" : "")}><span>${k}</span><span className="tnum">${v}</span></div>`;
  return html`<div className="relative rounded-xl bg-paper border border-line px-4 py-3 font-mono text-[13px] text-muted">
    <${Row} k="Subtotal" v=${fmt(calc.subtotal)} />
    <${Row} k="Tax" v=${fmt(calc.tax)} />
    ${receipt.fees.filter(f => num(f.amount)).map(f => html`<${Row} key=${f.id} k=${f.name || "Fee"} v=${fmt(num(f.amount))} />`)}
    <${Row} k="Tip" v=${fmt(calc.tipAmt)} />
    <div className="my-2 border-t border-dashed border-line"></div>
    <${Row} k="TOTAL" v=${fmt(calc.total)} strong=${true} />
  </div>`;
}

/* ---------- Step 2: people ---------- */
function People({ state, setState, toast, idPrefix = "p" }) {
  const [name, setName] = useState("");
  const [pick, setPick] = useState("");
  const P = state.participants;
  const full = P.length >= 12;
  const add = () => {
    const n = name.trim(); if (!n || full) return;
    setState(s => ({ ...s, participants: [...s.participants, { id: uid(), name: n, isHost: false }] })); setName("");
  };
  const rename = (id, v) => setState(s => ({ ...s, participants: s.participants.map(p => p.id === id ? { ...p, name: v } : p) }));
  const makeHost = id => setState(s => ({ ...s, participants: s.participants.map(p => ({ ...p, isHost: p.id === id })) }));
  const remove = id => {
    if (P.length <= 1) return;
    const snap = { participants: P, assignments: state.assignments };
    const who = P.find(p => p.id === id);
    setState(s => {
      const a = {}; Object.entries(s.assignments).forEach(([k, v]) => a[k] = v.filter(x => x !== id));
      let ps = s.participants.filter(p => p.id !== id);
      if (who?.isHost && ps.length) ps = ps.map((p, i) => ({ ...p, isHost: i === 0 }));
      return { ...s, assignments: a, participants: ps };
    });
    toast(`Removed ${who?.name || "person"}`, { label: "Undo", fn: () => setState(s => ({ ...s, ...snap })) });
  };

  return html`<div className="flex flex-col gap-3">
    <ul className="flex flex-col gap-2">
      ${P.map(p => html`<li key=${p.id} className=${"flex items-center gap-2 rounded-2xl -mx-1.5 px-1.5 py-1 transition " + (pick === p.id ? "bg-soft ring-1 ring-danger/50" : "")}>
        <button type="button" onClick=${() => setPick(pick === p.id ? "" : p.id)} aria-pressed=${pick === p.id}
          aria-label=${(pick === p.id ? "Deselect " : "Select ") + (p.name || "this person")}
          className="relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-money/50">
          <${Avatar} name=${p.name} color=${colorFor(P, p.id)} size=${34} />
          ${pick === p.id && html`<span className="absolute -bottom-0.5 -right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-danger text-white ring-2 ring-[var(--card)]"><${Ic} n="Check" s=${10} /></span>`}
        </button>
        <div className="relative flex-1 min-w-0">
          <input id=${idPrefix + "-name-" + p.id} aria-label=${p.isHost ? "Your name" : "Name"} className=${inputCls + (p.isHost ? " pr-28" : "")}
            value=${p.name} placeholder=${p.isHost ? "Your name" : "Name"} onInput=${e => rename(p.id, e.target.value)} />
          ${p.isHost && html`<span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-moneysoft text-money px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap">Receipt owner</span>`}
        </div>
        <button type="button" onClick=${() => makeHost(p.id)} disabled=${p.isHost}
          aria-label=${p.isHost ? `${p.name || "This person"} paid the bill` : `Mark ${p.name || "this person"} as the one who paid`}
          title=${p.isHost ? "Paid the bill" : "Mark as the one who paid"}
          className=${"p-2 rounded-lg transition " + (p.isHost ? "text-money" : "text-muted hover:text-money hover:bg-soft")}><${Ic} n="Wallet" s=${18} /></button>
        <button type="button" onClick=${() => remove(p.id)} disabled=${P.length <= 1} aria-label=${"Remove " + (p.name || "person")}
          className="p-2 rounded-lg text-muted hover:text-danger hover:bg-soft disabled:opacity-30"><${Ic} n="UserMinus" s=${18} /></button>
      </li>`)}
    </ul>
    <form className="flex gap-2" onSubmit=${e => { e.preventDefault(); add(); }}>
      <input id=${idPrefix + "-new-person"} aria-label="New person's name" className=${inputCls} value=${name} disabled=${full}
        placeholder=${full ? "12 people max" : "Add someone"} onInput=${e => setName(e.target.value)} />
      <button type="submit" disabled=${!name.trim() || full} className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-ink text-bg px-4 font-semibold disabled:opacity-40"><${Ic} n="UserPlus" s=${16} />Add</button>
    </form>
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-line px-3 py-2">
      <p className="flex-1 min-w-0 text-sm text-muted truncate">${P.some(p => p.id === pick) ? html`Selected: <b className="text-ink">${P.find(p => p.id === pick).name || "Unnamed"}</b>` : "Tap someone's initials to select them"}</p>
      <button type="button" disabled=${!P.some(p => p.id === pick) || P.length <= 1} onClick=${() => { remove(pick); setPick(""); }}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-danger text-danger px-3 py-1.5 text-sm font-semibold hover:bg-card disabled:opacity-40 disabled:border-line disabled:text-muted"><${Ic} n="UserMinus" s=${15} />Remove</button>
    </div>
    <p className="text-xs text-muted tnum">${P.length} of 12 people · tap the wallet to change who paid${P.length < 2 ? " · add at least one more to split" : ""}</p>
  </div>`;
}

function ThemePicker({ theme, setTheme }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  return html`<div className="relative" ref=${ref}>
    <button type="button" onClick=${() => setOpen(o => !o)} aria-expanded=${open} aria-label="Change theme"
      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-line bg-card text-ink hover:bg-soft"><${Ic} n="Palette" s=${18} /></button>
    ${open && html`<div className="absolute right-0 top-full mt-2 z-40 w-64 rounded-2xl border border-line bg-card p-3 shadow-card">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted mb-2">Color</p>
      <div className="grid grid-cols-1 gap-1">
        ${Object.entries(PALETTES).map(([k, p]) => html`<button key=${k} type="button" onClick=${() => setTheme(t => ({ ...t, pal: k }))}
          className=${"flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm font-medium text-left transition " + (theme.pal === k ? "bg-soft" : "hover:bg-soft")}>
          <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-line">
            <span className="absolute inset-y-0 left-0 w-1/2" style=${{ background: p.light.money }}></span>
            <span className="absolute inset-y-0 right-0 w-1/2" style=${{ background: p.dark.money }}></span>
          </span>
          <span className="flex-1">${p.name}</span>
          ${theme.pal === k && html`<${Ic} n="Check" s=${16} c="text-money" />`}
        </button>`)}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted mt-3 mb-2">Appearance</p>
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-soft p-1">
        ${[["auto", "Auto", "Monitor"], ["light", "Light", "Sun"], ["dark", "Dark", "Moon"]].map(([m, label, icon]) => html`<button key=${m} type="button" onClick=${() => setTheme(t => ({ ...t, mode: m }))}
          className=${"inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition " + (theme.mode === m ? "bg-card shadow-card text-ink" : "text-muted")}>
          <${Ic} n=${icon} s=${13} />${label}</button>`)}
      </div>
    </div>`}
  </div>`;
}

/* ---------- Share ---------- */
function Share({ state, toast, goGuest, shareUrl }) {
  const ready = state.participants.length >= 2;
  const host = state.participants.find(p => p.isHost);
  const invite = `Our bill from ${state.receipt.merchant || "dinner"} is on Going Dutch. Tap your name, then tap what you had: ${shareUrl}${host?.name ? " - " + host.name : ""}`;
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: "Going Dutch", text: invite }); return; } catch (e) { if (e?.name === "AbortError") return; } }
    toast(await copyText(invite) ? "Invite copied. Paste it in your group chat." : "Copy blocked. Select the link instead.");
  };
  return html`<div className="flex flex-col gap-3">
    <div className="flex items-center gap-2 rounded-xl bg-soft px-3 py-2.5">
      <${Ic} n="Link2" s=${16} c="text-money shrink-0" />
      <span className="font-mono text-sm truncate flex-1 select-all">${shareUrl.replace(/^https?:\/\//, "")}</span>
      <button type="button" onClick=${async () => toast(await copyText(shareUrl) ? "Link copied" : "Copy blocked. Select the link instead.")} className="inline-flex items-center gap-1 text-sm font-semibold text-money"><${Ic} n="Copy" s=${14} />Copy</button>
    </div>
    <button type="button" onClick=${share} className="inline-flex items-center justify-center gap-2 rounded-xl text-moneyink py-3 font-semibold shadow-card" style=${{ background: "var(--money)" }}><${Ic} n="Share2" s=${18} />Send to the group</button>
    <p className="text-sm text-muted">Anyone with the link can open this bill and claim what they had. No account needed. Friends who sign up keep all their bills in one place.</p>
    <button type="button" onClick=${goGuest} disabled=${!ready} className="inline-flex items-center justify-center gap-2 rounded-xl border border-line py-3 font-semibold hover:bg-soft disabled:opacity-40">Go to Guest split<${Ic} n="ArrowRight" s=${16} /></button>
  </div>`;
}

/* ---------- Step 3: assign ---------- */
function Assign({ state, setState, calc, goSummary, toast, meDefault, onPickMe }) {
  const P = state.participants;
  const [meRaw, setMeRaw] = useState(meDefault || null);
  const setMe = v => { setMeRaw(v); onPickMe?.(v); };
  const me = P.some(p => p.id === meRaw) ? meRaw : null;
  const [editPeople, setEditPeople] = useState(false);
  const toggle = (itemId, pid) => setState(s => {
    const cur = s.assignments[itemId] || [];
    const next = cur.includes(pid) ? cur.filter(x => x !== pid) : [...cur, pid];
    return { ...s, assignments: { ...s.assignments, [itemId]: next } };
  });
  const everyone = itemId => setState(s => {
    const cur = s.assignments[itemId] || [];
    const all = cur.length === s.participants.length;
    return { ...s, assignments: { ...s.assignments, [itemId]: all ? [] : s.participants.map(p => p.id) } };
  });
  const items = state.receipt.items.filter(i => i.name || num(i.price));
  const claimedPct = calc.subtotal > 0 ? Math.min(100, (calc.subtotal - calc.unassigned) / calc.subtotal * 100) : 0;

  if (P.length < 2) return html`<${Card} className="p-5"><p className="font-display text-lg font-bold">Add at least 2 people first</p><p className="text-sm text-muted mt-0.5 mb-4">Who was at the table?</p><${People} state=${state} setState=${setState} toast=${toast} idPrefix="g" /></${Card}>`;

  return html`<div className="flex flex-col gap-4">
    <${Card} className="p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Joining as</p>
        <button type="button" onClick=${() => setEditPeople(v => !v)} aria-expanded=${editPeople}
          className="inline-flex items-center gap-1 text-xs font-semibold text-money"><${Ic} n=${editPeople ? "ChevronUp" : "UserCog"} s=${14} />${editPeople ? "Done" : "Add or remove people"}</button>
      </div>
      ${editPeople && html`<div className="mb-4 rounded-xl border border-line p-3"><${People} state=${state} setState=${setState} toast=${toast} idPrefix="g" /></div>`}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        ${P.map(p => html`<button key=${p.id} type="button" onClick=${() => setMe(me === p.id ? null : p.id)}
          className=${"shrink-0 inline-flex items-center gap-2 rounded-full pl-1 pr-3 py-1 border transition " + (me === p.id ? "border-ink bg-ink text-bg" : "border-line hover:bg-soft")}>
          <${Avatar} name=${p.name} color=${colorFor(P, p.id)} size=${26} /><span className="text-sm font-medium">${p.name || "Host"}${p.isHost ? " · host" : ""}</span></button>`)}
      </div>
      <p className="text-xs text-muted mt-2">${me ? "Tap an item to claim it for yourself. Tap a name chip to assign anyone." : "Pick who you are, or tap the name chips under each item."}</p>
    </${Card}>

    ${calc.unassignedItems.length > 0 && html`<div className="flex items-start gap-2 rounded-2xl bg-warnsoft text-warn px-4 py-3 text-sm">
      <${Ic} n="AlertTriangle" s=${18} c="mt-0.5 shrink-0" />
      <span><b>${calc.unassignedItems.length} unassigned ${calc.unassignedItems.length === 1 ? "item" : "items"}</b> worth ${fmt(calc.unassigned)}. Nobody pays for these until someone claims them.</span>
    </div>`}

    <ul className="flex flex-col gap-3">
      ${items.map(it => {
        const ids = (state.assignments[it.id] || []).filter(id => P.some(p => p.id === id));
        const price = num(it.price);
        const mine = me && ids.includes(me);
        return html`<li key=${it.id}>
          <${Card} className=${"p-4 transition " + (ids.length ? "" : "ring-1 ring-warn/40")}>
            <div className=${"flex items-start gap-3 " + (me ? "cursor-pointer" : "")} onClick=${() => me && toggle(it.id, me)}>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug">${it.name || "Untitled item"}${num(it.quantity) > 1 && html`<span className="ml-1.5 text-xs font-mono text-muted">×${num(it.quantity)}</span>`}</p>
                <p className="text-xs text-muted mt-0.5 tnum">${ids.length === 0 ? "Unclaimed" : ids.length === 1 ? "1 person" : `Split ${ids.length} ways · ${fmt(price / ids.length)} each`}</p>
              </div>
              <span className="font-mono font-bold tnum">${fmt(price)}</span>
              ${me && html`<span className=${"mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border-2 " + (mine ? "bg-money border-money text-moneyink" : "border-line")}>${mine && html`<${Ic} n="Check" s=${14} />`}</span>`}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              ${P.map(p => {
                const on = ids.includes(p.id), col = colorFor(P, p.id);
                return html`<button key=${p.id} type="button" aria-pressed=${on} onClick=${() => toggle(it.id, p.id)}
                  className="inline-flex items-center gap-1.5 rounded-full pl-0.5 pr-2.5 py-0.5 text-xs font-semibold border transition"
                  style=${on ? { background: col, borderColor: col, color: "#fff" } : { borderColor: "var(--line)", color: "var(--muted)" }}>
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold"
                    style=${on ? { background: "rgba(255,255,255,.25)", color: "#fff" } : { background: col, color: "#fff" }}>${initials(p.name)}</span>
                  ${p.name || "Host"}</button>`;
              })}
              <button type="button" onClick=${() => everyone(it.id)} className=${"inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border border-dashed transition " + (ids.length === P.length ? "border-money text-money" : "border-line text-muted hover:text-ink")}>
                <${Ic} n="Users" s=${12} />${ids.length === P.length ? "Everyone" : "Split equally among all"}</button>
            </div>
          </${Card}>
        </li>`;
      })}
    </ul>

    <${Card} className="p-4 sticky bottom-3" >
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">${calc.rows.slice(0, 5).map(r => html`<span key=${r.p.id} className="ring-2 ring-[var(--card)] rounded-full"><${Avatar} name=${r.p.name} color=${colorFor(P, r.p.id)} size=${28} /></span>`)}</div>
        <div className="min-w-0 flex-1 text-sm">
          ${me ? html`<span className="text-muted">${P.find(p => p.id === me)?.name} owes </span><b className="text-money tnum">${fmt(calc.rows.find(r => r.p.id === me)?.total || 0)}</b>`
               : html`<span className="text-muted">Bill total </span><b className="tnum">${fmt(calc.total)}</b>`}
        </div>
        <button type="button" onClick=${goSummary} className="inline-flex items-center gap-1.5 rounded-xl bg-ink text-bg px-4 py-2.5 text-sm font-semibold">Summary<${Ic} n="ArrowRight" s=${16} /></button>
      </div>
    </${Card}>
  </div>`;
}

/* ---------- Step 5: summary ---------- */
function Breakdown({ r, calc }) {
  const pct = calc.subtotal > 0 ? (r.sub / calc.subtotal * 100) : 0;
  const Row = ({ k, v }) => html`<div className="flex justify-between gap-6"><span>${k}</span><span className="tnum">${v}</span></div>`;
  return html`<div className="font-mono text-xs flex flex-col gap-0.5">
    <${Row} k="Items" v=${fmt(r.sub)} />
    <${Row} k=${`Tax (${pct.toFixed(1)}%)`} v=${fmt(r.tax)} />
    ${calc.fees > 0 && html`<${Row} k="Fees" v=${fmt(r.fees)} />`}
    <${Row} k="Tip" v=${fmt(r.tip)} />
    ${r.adj ? html`<${Row} k="Rounding" v=${(r.adj > 0 ? "+" : "") + fmt(r.adj)} />` : null}
  </div>`;
}

function PersonCard({ r, calc, P, hostName }) {
  const [open, setOpen] = useState(false);
  const col = colorFor(P, r.p.id);
  return html`<${Card} className="p-4 overflow-visible">
    <div className="flex items-center gap-3">
      <${Avatar} name=${r.p.name} color=${col} size=${40} />
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-bold leading-tight truncate">${r.p.name || "Host"}</p>
        <p className="text-xs text-muted">${r.p.isHost ? "Paid the bill" : r.p.paid ? html`<span className="font-semibold text-money">Paid ${hostName} ✓</span>` : `Owes ${hostName}`}</p>
      </div>
      <div className="relative group text-right" onMouseEnter=${() => setOpen(true)} onMouseLeave=${() => setOpen(false)}>
        <button type="button" onClick=${() => setOpen(o => !o)} aria-expanded=${open} className="font-display text-2xl font-extrabold text-money tnum leading-none">${fmt(r.total)}</button>
        <p className="text-[10px] uppercase tracking-[0.08em] text-muted mt-1">tap for math</p>
        ${open && html`<div className="absolute right-0 top-full mt-2 z-20 w-56 rounded-xl bg-ink text-bg p-3 shadow-card text-left"><${Breakdown} r=${r} calc=${calc} /></div>`}
      </div>
    </div>
    ${r.items.length ? html`<ul className="mt-3 border-t border-dashed border-line pt-3 flex flex-col gap-1 text-sm">
      ${r.items.map(i => html`<li key=${i.id} className="flex justify-between gap-3"><span className="min-w-0 truncate">${i.name}${i.ways > 1 && html`<span className="text-muted text-xs"> · 1/${i.ways}</span>`}</span><span className="font-mono tnum text-muted">${fmt(i.share)}</span></li>`)}
    </ul>` : html`<p className="mt-3 text-sm text-muted">Nothing claimed yet.</p>`}
    <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl bg-soft p-2.5 text-center">
      ${[["Items", r.sub], ["Tax", r.tax], ["Fees", r.fees], ["Tip", r.tip]].map(([k, v]) => html`<div key=${k}><p className="text-[10px] uppercase tracking-[0.08em] text-muted">${k}</p><p className="font-mono text-xs font-semibold tnum">${fmt(v)}</p></div>`)}
    </div>
    ${r.p.isHost && html`<p className="mt-3 text-sm text-muted">Paid ${fmt(calc.total)} · gets back <b className="text-money tnum">${fmt(sum(calc.rows.filter(x => !x.p.isHost).map(x => x.total)))}</b></p>`}
  </${Card}>`;
}

function settleText(r, R, host) {
  const items = r.items.map(i => i.ways > 1 ? `${i.name} (1/${i.ways})` : i.name).join(", ");
  const pay = typeof payLinks === "function" ? payLinks(host, r.total, `${R.merchant || "Dinner"} via Going Dutch`) : { links: [], zelle: "" };
  const how = pay.links[0] ? ` Pay here: ${pay.links[0].href}` : pay.zelle ? ` Zelle: ${pay.zelle}` : "";
  return `Hey ${r.p.name}, you owe ${fmt(r.total)} for ${R.merchant || "dinner"}${items ? " - " + items : ""}.${how}`;
}
function summaryText(state, calc) {
  const R = state.receipt, host = state.participants.find(p => p.isHost);
  const lines = [`${R.merchant || "Dinner"}${R.date ? " · " + R.date : ""}`, `Total ${fmt(calc.total)} (tax ${fmt(calc.tax)}, fees ${fmt(calc.fees)}, tip ${fmt(calc.tipAmt)})`, ""];
  calc.rows.forEach(r => lines.push(`${r.p.name}${r.p.isHost ? " (paid)" : ""}: ${fmt(r.total)}${r.items.length ? "  [" + r.items.map(i => i.ways > 1 ? `${i.name} 1/${i.ways}` : i.name).join(", ") + "]" : ""}`));
  if (calc.unassigned > 0) lines.push("", `Unassigned: ${fmt(calc.unassigned)} in items`);
  lines.push("", `Pay ${host?.name || "the host"} back. Split with Going Dutch.`);
  return lines.join("\n");
}

function drawPng(state, calc) {
  const R = state.receipt, W = 720, pad = 48, lh = 30;
  const rows = calc.rows;
  const H = 300 + rows.reduce((a, r) => a + 70 + r.items.length * 24, 0) + (calc.unassigned > 0 ? 40 : 0);
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  x.fillStyle = "#fbfaf5"; x.fillRect(0, 0, W, H);
  x.fillStyle = "#0f1f19"; x.textBaseline = "top";
  x.font = "800 34px 'Bricolage Grotesque', sans-serif"; x.textAlign = "center";
  x.fillText(R.merchant || "Dinner", W / 2, pad);
  x.font = "400 16px 'JetBrains Mono', monospace"; x.fillStyle = "#5d6e67";
  x.fillText(`${R.date || ""}  ·  ${rows.length} people`, W / 2, pad + 46);
  const dash = y => { x.strokeStyle = "#c9d3ce"; x.setLineDash([6, 6]); x.beginPath(); x.moveTo(pad, y); x.lineTo(W - pad, y); x.stroke(); x.setLineDash([]); };
  let y = pad + 90; dash(y); y += 20;
  const lr = (l, r, font, color) => { x.font = font; x.fillStyle = color; x.textAlign = "left"; x.fillText(l, pad, y); x.textAlign = "right"; x.fillText(r, W - pad, y); };
  rows.forEach((r, i) => {
    x.fillStyle = COLORS[i % COLORS.length]; x.beginPath(); x.arc(pad + 10, y + 12, 10, 0, 7); x.fill();
    x.font = "700 20px 'Figtree', sans-serif"; x.fillStyle = "#0f1f19"; x.textAlign = "left"; x.fillText(r.p.name + (r.p.isHost ? " (paid)" : ""), pad + 30, y + 1);
    x.font = "700 22px 'JetBrains Mono', monospace"; x.fillStyle = "#078554"; x.textAlign = "right"; x.fillText(fmt(r.total), W - pad, y);
    y += lh + 4;
    r.items.forEach(it => { lr("  " + it.name + (it.ways > 1 ? ` 1/${it.ways}` : ""), fmt(it.share), "400 15px 'JetBrains Mono', monospace", "#5d6e67"); y += 24; });
    y += 22;
  });
  dash(y); y += 20;
  [["Subtotal", calc.subtotal], ["Tax", calc.tax], ["Fees", calc.fees], ["Tip", calc.tipAmt]].forEach(([k, v]) => { lr(k, fmt(v), "400 16px 'JetBrains Mono', monospace", "#5d6e67"); y += 26; });
  lr("TOTAL", fmt(calc.total), "700 22px 'JetBrains Mono', monospace", "#0f1f19"); y += 40;
  if (calc.unassigned > 0) { lr("Unassigned", fmt(calc.unassigned), "400 16px 'JetBrains Mono', monospace", "#a85a06"); y += 30; }
  x.textAlign = "center"; x.font = "500 14px 'Figtree', sans-serif"; x.fillStyle = "#93a39c"; x.fillText("split with Going Dutch", W / 2, H - 40);
  return c;
}

function Summary({ state, setState, calc, toast, reset, live, readOnly }) {
  const P = state.participants, R = state.receipt;
  const host = P.find(p => p.isHost);
  const owedToHost = sum(calc.rows.filter(r => !r.p.isHost).map(r => r.total));
  const [confirmReset, setConfirmReset] = useState(false);
  const [img, setImg] = useState(null);
  const guests = calc.rows.filter(r => !r.p.isHost);

  const download = async () => {
    const canvas = drawPng(state, calc);
    const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
    const name = `${(R.merchant || "bill").replace(/[^\w]+/g, "-").toLowerCase()}-split.png`;
    try {
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); a.remove(); toast("Image saved");
    } catch (e) { setImg(URL.createObjectURL(blob)); }
  };

  return html`<div className="flex flex-col gap-4">
    <div className="relative overflow-hidden rounded-2xl p-5 text-white shadow-card" style=${{ background: "linear-gradient(135deg,var(--hero1) 0%,var(--hero2) 100%)" }}>
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10"></div>
      <div className="absolute -right-2 bottom-[-50px] h-32 w-32 rounded-full bg-white/5"></div>
      <p className="text-xs uppercase tracking-[0.12em] text-white/70">${R.merchant || "Dinner"}${R.date ? " · " + new Date(R.date + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}</p>
      <p className="font-display text-4xl font-extrabold mt-1 tnum">${fmt(calc.total)}</p>
      <p className="text-sm text-white/80 mt-0.5 tnum">${P.length} people · tip ${fmt(calc.tipAmt)} · tax ${fmt(calc.tax)}</p>
      <div className="mt-4 rounded-xl px-3 py-2.5 flex items-center justify-between" style=${{ background: "rgba(255,255,255,.12)" }}>
        <span className="text-sm">Owed to ${host?.name || "host"}</span><span className="font-display text-xl font-bold tnum">${fmt(owedToHost)}</span>
      </div>
    </div>

    ${calc.unassignedItems.length > 0 && html`<div className="flex items-start gap-2 rounded-2xl bg-warnsoft text-warn px-4 py-3 text-sm">
      <${Ic} n="AlertTriangle" s=${18} c="mt-0.5 shrink-0" /><span><b>${fmt(calc.unassigned)} in items still unclaimed</b> (${calc.unassignedItems.map(i => i.name || "Untitled").join(", ")}). Their share of tax, fees and tip isn't counted for anyone yet.</span></div>`}

    <div className="grid grid-cols-1 gap-3">${calc.rows.map(r => html`<${PersonCard} key=${r.p.id} r=${r} calc=${calc} P=${P} hostName=${host?.name || "the host"} />`)}</div>

    ${guests.length > 0 && html`<${Card} className="p-4">
      <h3 className="font-display text-lg font-bold mb-3">Settle up</h3>
      <ul className="flex flex-col gap-2">
        ${guests.map(r => html`<li key=${r.p.id} className=${"flex items-start gap-3 rounded-xl bg-soft p-3 " + (r.p.paid ? "opacity-60" : "")}>
          <${Avatar} name=${r.p.name} color=${colorFor(P, r.p.id)} size=${28} />
          <div className="flex-1 min-w-0">
            <p className="text-sm break-words">${settleText(r, R, host)}</p>
            <button type="button" onClick=${() => setState(s => ({ ...s, participants: s.participants.map(p => p.id === r.p.id ? { ...p, paid: !p.paid } : p) }))}
              className=${"mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold " + (r.p.paid ? "bg-moneysoft text-money" : "border border-line text-muted hover:text-ink")}>
              <${Ic} n=${r.p.paid ? "CheckCircle2" : "Circle"} s=${13} />${r.p.paid ? "Paid" : "Mark as paid"}</button>
          </div>
          <button type="button" aria-label=${"Copy message for " + r.p.name} onClick=${async () => toast(await copyText(settleText(r, R, host)) ? "Message copied" : "Copy blocked. Select the text instead.")}
            className="p-2 -m-1 rounded-lg text-money hover:bg-card"><${Ic} n="Copy" s=${16} /></button>
        </li>`)}
      </ul>
    </${Card}>`}

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <button type="button" onClick=${async () => toast(await copyText(summaryText(state, calc)) ? "Summary copied" : "Copy blocked by this view")}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink text-bg py-3 font-semibold"><${Ic} n="ClipboardCopy" s=${16} />Copy summary</button>
      <button type="button" onClick=${download} className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-card py-3 font-semibold hover:bg-soft"><${Ic} n="Download" s=${16} />Download PNG</button>
      <button type="button" onClick=${reset} className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-card py-3 font-semibold hover:bg-soft"><${Ic} n="Plus" s=${16} />New bill</button>
    </div>

    ${img && html`<div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick=${() => setImg(null)}>
      <div className="bg-card rounded-2xl p-4 max-w-md w-full max-h-[90%] overflow-auto" onClick=${e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3"><p className="font-semibold">Press and hold or right-click to save</p>
          <button type="button" aria-label="Close" onClick=${() => setImg(null)} className="p-1 rounded-lg hover:bg-soft"><${Ic} n="X" s=${18} /></button></div>
        <img src=${img} alt="Bill split receipt" className="rounded-xl border border-line w-full" />
      </div>
    </div>`}
  </div>`;
}

