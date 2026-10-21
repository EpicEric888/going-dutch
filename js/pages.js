/* ---------- account ---------- */
function AccountMenu({ user, toast }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("menu"); // menu | signup | signin | sent
  const [email, setEmail] = useState("");
  const [name, setName] = useState(displayNameOf(user));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ref = useRef(null);
  const guest = !user || user.is_anonymous;
  const redirect = location.origin + location.pathname;

  useEffect(() => {
    if (!open) return;
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  useEffect(() => { setName(displayNameOf(user)); }, [user?.id]);

  const fileOrigin = location.protocol === "file:";
  const google = async () => {
    setErr(""); setBusy(true);
    const error = await continueWithGoogle(user);
    setBusy(false);
    if (error) setErr(/not enabled|unsupported provider|provider is not/i.test(error.message || "") ? "Google sign-in isn't switched on yet. Use email for now." : (error.message || "Couldn't reach Google"));
  };
  const GoogleBtn = () => html`<button type="button" onClick=${google} disabled=${busy}
    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-card py-2.5 font-semibold hover:bg-soft disabled:opacity-50">
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
    Continue with Google</button>`;
  const signUp = async e => {
    e.preventDefault(); setBusy(true); setErr("");
    const { error } = await supa.auth.updateUser({ email: email.trim(), data: { display_name: name.trim() } }, { emailRedirectTo: redirect });
    setBusy(false);
    if (error) setErr(error.message); else setView("sent");
  };
  const signIn = async e => {
    e.preventDefault(); setBusy(true); setErr("");
    const { error } = await supa.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirect, shouldCreateUser: false } });
    setBusy(false);
    if (error) setErr(/not found|signups not allowed/i.test(error.message) ? "No account with that email yet. Create one instead." : error.message); else setView("sent");
  };
  const saveName = async () => {
    const { error } = await supa.auth.updateUser({ data: { display_name: name.trim() } });
    toast(error ? "Couldn't save your name" : "Name saved");
  };

  return html`<div className="relative" ref=${ref}>
    <button type="button" onClick=${() => { setOpen(o => !o); setView("menu"); setErr(""); }} aria-expanded=${open} aria-label="Account"
      className="inline-flex h-10 items-center gap-2 rounded-2xl border border-line bg-card px-2.5 text-sm font-semibold hover:bg-soft">
      ${guest ? html`<${Ic} n="UserCircle" s=${18} /><span className="hidden sm:inline">Sign in</span>`
              : html`<${Avatar} name=${displayNameOf(user) || user.email} color="var(--money)" size=${24} />`}
    </button>
    ${open && html`<div className="absolute right-0 top-full mt-2 z-40 w-72 rounded-2xl border border-line bg-card p-4 shadow-card">
      ${view === "menu" && (guest ? html`
        <p className="font-display text-lg font-bold leading-tight">You're a guest</p>
        <p className="text-sm text-muted mt-1">Your bills are saved on this device. Create an account to keep them on every device.</p>
        <div className="mt-3 flex flex-col gap-2">
          <${GoogleBtn} />
          ${err && html`<p className="text-sm text-danger">${err}</p>`}
          <button type="button" onClick=${() => setView("signup")} className="rounded-xl py-2.5 font-semibold text-moneyink" style=${{ background: "var(--money)" }}>Create account with email</button>
          <button type="button" onClick=${() => setView("signin")} className="rounded-xl border border-line py-2.5 font-semibold hover:bg-soft">I already have one</button>
        </div>` : html`
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Signed in as</p>
        <p className="font-semibold truncate">${user.email}</p>
        <label htmlFor="acct-name" className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted mt-3 mb-1.5">Your name on new bills</label>
        <div className="flex gap-2"><input id="acct-name" className=${inputCls} value=${name} onInput=${e => setName(e.target.value)} />
          <button type="button" onClick=${saveName} className="shrink-0 rounded-xl bg-ink text-bg px-3 text-sm font-semibold">Save</button></div>
        <button type="button" onClick=${async () => { await supa.auth.signOut(); setOpen(false); toast("Signed out"); }} className="mt-3 w-full rounded-xl border border-line py-2.5 font-semibold hover:bg-soft">Sign out</button>`)}

      ${(view === "signup" || view === "signin") && html`<form onSubmit=${view === "signup" ? signUp : signIn} className="flex flex-col gap-3">
        <p className="font-display text-lg font-bold leading-tight">${view === "signup" ? "Create your account" : "Sign in"}</p>
        <${GoogleBtn} />
        <div className="flex items-center gap-2 text-xs text-muted"><span className="h-px flex-1 bg-line"></span>or use email<span className="h-px flex-1 bg-line"></span></div>
        ${view === "signup" && html`<div><label htmlFor="su-name" className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted mb-1.5">Your name</label>
          <input id="su-name" className=${inputCls} value=${name} required onInput=${e => setName(e.target.value)} placeholder="What friends call you" /></div>`}
        <div><label htmlFor="su-email" className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted mb-1.5">Email</label>
          <input id="su-email" type="email" className=${inputCls} value=${email} required onInput=${e => setEmail(e.target.value)} placeholder="you@example.com" /></div>
        ${fileOrigin && html`<p className="text-xs text-warn">Email links can't open a file on your computer. Sign-in works once the site is online.</p>`}
        ${err && html`<p className="text-sm text-danger">${err}</p>`}
        <button type="submit" disabled=${busy} className="rounded-xl py-2.5 font-semibold text-moneyink disabled:opacity-50" style=${{ background: "var(--money)" }}>${busy ? "Sending…" : "Email me a link"}</button>
        <p className="text-xs text-muted">${view === "signup" ? "Bills you already opened here stay with you." : "We'll send a one-time sign-in link. No password."}</p>
        <button type="button" onClick=${() => setView("menu")} className="text-sm text-muted underline self-start">Back</button>
      </form>`}

      ${view === "sent" && html`<div className="flex flex-col gap-2">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-moneysoft text-money"><${Ic} n="Mail" s=${20} /></span>
        <p className="font-display text-lg font-bold leading-tight">Check your email</p>
        <p className="text-sm text-muted">Open the link we sent to ${email} on this device to finish.</p>
      </div>`}
    </div>`}
  </div>`;
}

/* ---------- home: my bills ---------- */
function Home({ user, toast, go }) {
  const [bills, setBills] = useState(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [managing, setManaging] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [removing, setRemoving] = useState(null);
  const removeBill = async b => {
    setRemoving(b.id);
    try {
      if (b.created_by === user.id) await deleteBill(b.id, b.share_code); else await leaveBill(b.id, user.id, b.share_code);
      setBills(list => list.filter(x => x.id !== b.id));
      toast(b.created_by === user.id ? "Bill deleted" : "You left the bill");
    } catch (e) { toast("Couldn't remove that bill. Try again."); }
    setRemoving(null); setConfirmId(null);
  };
  useEffect(() => {
    if (!user) return;
    let alive = true;
    listMyBills().then(b => alive && setBills(b)).catch(() => alive && setBills([]));
    return () => { alive = false; };
  }, [user?.id]);

  const create = async demo => {
    setBusy(true);
    try { go("/b/" + await createBill(user, demo)); }
    catch (e) { toast("Couldn't create the bill. Try again."); setBusy(false); }
  };
  const openCode = e => {
    e.preventDefault();
    const m = code.trim().match(/([a-f0-9]{16})\s*$/i);
    if (m) go("/b/" + m[1].toLowerCase()); else toast("That doesn't look like a Going Dutch link");
  };

  return html`<div className="flex flex-col gap-4">
    <div className="relative overflow-hidden rounded-2xl p-5 text-white shadow-card" style=${{ background: "linear-gradient(135deg,var(--hero1),var(--hero2))" }}>
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10"></div>
      <p className="font-display text-3xl font-extrabold leading-tight max-w-[18ch]">Split the bill by what everyone actually ordered.</p>
      <p className="text-sm text-white/80 mt-2 max-w-[42ch]">Snap the receipt, send the link, and friends tap their own items. Tax, fees and tip are shared out fairly.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled=${busy} onClick=${() => create(false)} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-semibold disabled:opacity-60" style=${{ color: "var(--hero2)" }}><${Ic} n="Plus" s=${16} />New bill</button>
        <button type="button" disabled=${busy} onClick=${() => create(true)} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold disabled:opacity-60" style=${{ background: "rgba(255,255,255,.15)" }}><${Ic} n="Sparkles" s=${16} />Try an example</button>
      </div>
    </div>

    <${Card} className="p-4">
      <form onSubmit=${openCode} className="flex gap-2">
        <input id="open-link" aria-label="Paste a bill link" className=${inputCls} value=${code} onInput=${e => setCode(e.target.value)} placeholder="Paste a bill link from a friend" />
        <button type="submit" className="shrink-0 rounded-xl bg-ink text-bg px-4 font-semibold">Open</button>
      </form>
    </${Card}>

    <div className="flex items-baseline justify-between">
      <h2 className="font-display text-xl font-bold">My bills</h2>
      ${bills && bills.length > 0 && html`<button type="button" onClick=${() => { setManaging(m => !m); setConfirmId(null); }} className="text-sm font-semibold text-money">${managing ? "Done" : "Edit"}</button>`}
    </div>
    ${bills === null ? html`<${Card} className="p-6 text-center text-muted text-sm"><${Ic} n="Loader2" s=${18} c="animate-spin inline mr-2" />Loading your bills…</${Card}>`
      : bills.length === 0 ? html`<${Card} className="p-6 text-center">
          <p className="font-semibold">No bills yet</p>
          <p className="text-sm text-muted mt-1">Start a new bill, or open a link a friend sent you. Bills you join show up here.</p>
        </${Card}>`
      : html`<ul className="flex flex-col gap-3">${bills.map(b => {
          const R = b.receipt || {}, P = b.state.participants;
          const mine = P.find(p => p.userId === user.id);
          const row = mine && b.calc.rows.find(r => r.p.id === mine.id);
          const owedToMe = mine?.isHost ? sum(b.calc.rows.filter(r => !r.p.isHost).map(r => r.total)) : 0;
          const isMineToDelete = b.created_by === user.id;
          if (managing) return html`<li key=${b.id}><${Card} className="p-4">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">${R.merchant || "Untitled bill"}</p>
                <p className="text-xs text-muted">${confirmId === b.id ? (isMineToDelete ? "Deletes it for everyone, with the receipt photo." : "Removes it from your list. The link still works.") : (isMineToDelete ? "You started this bill" : "A friend's bill")}</p>
              </div>
              ${confirmId === b.id
                ? html`<div className="flex gap-2"><button type="button" onClick=${() => setConfirmId(null)} className="rounded-xl border border-line px-3 py-2 text-sm font-semibold">Cancel</button>
                    <button type="button" disabled=${removing === b.id} onClick=${() => removeBill(b)} className="rounded-xl px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" style=${{ background: "var(--danger)" }}>${removing === b.id ? "…" : isMineToDelete ? "Delete" : "Leave"}</button></div>`
                : html`<button type="button" onClick=${() => setConfirmId(b.id)} className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-sm font-semibold text-danger hover:bg-soft"><${Ic} n=${isMineToDelete ? "Trash2" : "LogOut"} s=${15} />${isMineToDelete ? "Delete" : "Leave"}</button>`}
            </div>
          </${Card}></li>`;
          return html`<li key=${b.id}><a href=${"#/b/" + b.share_code} className="block"><${Card} className="p-4 hover:bg-soft transition">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-moneysoft text-money"><${Ic} n="Receipt" s=${20} /></span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">${R.merchant || "Untitled bill"}${R.isDemo ? html`<span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Example</span>` : null}${b.locked ? html`<span className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted"><${Ic} n="Lock" s=${10} />Settled</span>` : null}</p>
                <p className="text-xs text-muted tnum">${R.date ? new Date(R.date + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "No date"} · ${P.length} ${P.length === 1 ? "person" : "people"} · ${fmt(b.calc.total)}</p>
              </div>
              <div className="text-right">
                ${mine?.isHost ? html`<p className="text-[10px] uppercase tracking-[0.08em] text-muted">Owed to you</p><p className="font-display font-bold text-money tnum">${fmt(owedToMe)}</p>`
                  : row && mine.paid ? html`<p className="text-[10px] uppercase tracking-[0.08em] text-muted">You paid</p><p className="font-display font-bold text-muted tnum">${fmt(row.total)}</p>`
                  : row ? html`<p className="text-[10px] uppercase tracking-[0.08em] text-muted">You owe</p><p className="font-display font-bold text-money tnum">${fmt(row.total)}</p>`
                  : html`<${Ic} n="ChevronRight" s=${18} c="text-muted" />`}
              </div>
            </div>
          </${Card}></a></li>`;
        })}</ul>`}
  </div>`;
}

/* ---------- always-visible bill header ---------- */
function ReceiptViewer({ path, onClose }) {
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => { let alive = true; receiptPhotoUrl(path).then(u => alive && setUrl(u)).catch(() => alive && setErr(true)); return () => { alive = false; }; }, [path]);
  useEffect(() => { const k = e => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);
  return html`<div className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick=${onClose} role="dialog" aria-label="Receipt photo">
    <div className="flex items-center justify-between px-4 pb-2 text-white" style=${{ paddingTop: "calc(12px + env(safe-area-inset-top, 0px))" }}>
      <p className="font-semibold">Receipt</p>
      <div className="flex items-center gap-2">
        ${url && html`<a href=${url} target="_blank" rel="noopener" onClick=${e => e.stopPropagation()} className="rounded-xl px-3 py-1.5 text-sm font-semibold" style=${{ background: "rgba(255,255,255,.15)" }}>Open full size</a>`}
        <button type="button" onClick=${onClose} aria-label="Close" className="rounded-xl p-2" style=${{ background: "rgba(255,255,255,.15)" }}><${Ic} n="X" s=${18} /></button>
      </div>
    </div>
    <div className="flex-1 overflow-auto flex items-start justify-center p-4" style=${{ paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}>
      ${err ? html`<p className="text-white/80 text-sm mt-10">Couldn't load the photo. Check your connection and try again.</p>`
        : url ? html`<img src=${url} alt="Receipt photo" onClick=${e => e.stopPropagation()} className="max-w-full h-auto rounded-xl" />`
        : html`<p className="text-white/80 text-sm mt-10 inline-flex items-center gap-2"><${Ic} n="Loader2" s=${16} c="animate-spin" />Loading photo…</p>`}
    </div>
  </div>`;
}

function BillMenu({ state, isCreator, setState, setLocked, onDelete, onLeave }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("menu"); // menu | rename | confirm
  const [name, setName] = useState(state.receipt.merchant || "");
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  const Item = ({ icon, label, onClick, danger, disabled }) => html`<button type="button" onClick=${onClick} disabled=${disabled}
    className=${"flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition disabled:opacity-40 " + (danger ? "text-danger hover:bg-soft" : "hover:bg-soft")}>
    <${Ic} n=${icon} s=${16} />${label}</button>`;
  const run = async fn => { setBusy(true); try { await fn(); } finally { setBusy(false); } };
  return html`<div className="relative" ref=${ref}>
    <button type="button" onClick=${() => { setOpen(o => !o); setView("menu"); setName(state.receipt.merchant || ""); }} aria-expanded=${open} aria-label="Bill options"
      className="p-2 rounded-xl text-muted hover:text-ink hover:bg-soft"><${Ic} n="MoreHorizontal" s=${18} /></button>
    ${open && html`<div className="absolute right-0 top-full mt-2 z-40 w-64 rounded-2xl border border-line bg-card p-2 shadow-card">
      ${view === "menu" && html`
        <${Item} icon="Pencil" label="Rename bill" disabled=${state.locked} onClick=${() => setView("rename")} />
        ${isCreator && html`<${Item} icon=${state.locked ? "Unlock" : "Lock"} label=${state.locked ? "Unlock bill" : "Lock bill (everyone's settled)"} onClick=${() => run(async () => { await setLocked(!state.locked); setOpen(false); })} disabled=${busy} />`}
        <div className="my-1 h-px bg-line"></div>
        ${isCreator
          ? html`<${Item} icon="Trash2" label="Delete bill" danger onClick=${() => setView("confirm")} />`
          : html`<${Item} icon="LogOut" label="Leave bill" danger onClick=${() => setView("confirm")} />`}`}
      ${view === "rename" && html`<form className="flex flex-col gap-2 p-1" onSubmit=${e => { e.preventDefault(); setState(s => ({ ...s, receipt: { ...s.receipt, merchant: name.trim() } })); setOpen(false); }}>
        <label htmlFor="bill-rename" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Bill name</label>
        <input id="bill-rename" className=${inputCls} value=${name} onInput=${e => setName(e.target.value)} placeholder="Restaurant or occasion" autoFocus />
        <div className="flex gap-2"><button type="button" onClick=${() => setView("menu")} className="flex-1 rounded-xl border border-line py-2 text-sm font-semibold">Cancel</button>
          <button type="submit" className="flex-1 rounded-xl py-2 text-sm font-semibold text-moneyink" style=${{ background: "var(--money)" }}>Save</button></div>
      </form>`}
      ${view === "confirm" && html`<div className="flex flex-col gap-2 p-1">
        <p className="font-semibold">${isCreator ? "Delete this bill for everyone?" : "Leave this bill?"}</p>
        <p className="text-sm text-muted">${isCreator ? "The bill, everyone's claims and the receipt photo are removed. This can't be undone." : "It disappears from your bills. You can rejoin with the link anytime."}</p>
        <div className="flex gap-2"><button type="button" onClick=${() => setView("menu")} className="flex-1 rounded-xl border border-line py-2 text-sm font-semibold">Cancel</button>
          <button type="button" disabled=${busy} onClick=${() => run(isCreator ? onDelete : onLeave)} className="flex-1 rounded-xl py-2 text-sm font-semibold text-white disabled:opacity-50" style=${{ background: "var(--danger)" }}>${busy ? "…" : isCreator ? "Delete" : "Leave"}</button></div>
      </div>`}
    </div>`}
  </div>`;
}

function BillHeader({ state, calc, shareUrl, toast, menu }) {
  const [viewing, setViewing] = useState(false);
  const photo = state.receipt.photo;
  const R = state.receipt;
  const claimed = Math.max(0, calc.subtotal - calc.unassigned);
  const pct = calc.subtotal > 0 ? Math.min(100, claimed / calc.subtotal * 100) : 0;
  const allClaimed = calc.subtotal > 0 && calc.unassignedItems.length === 0;
  const paidCount = state.participants.filter(p => !p.isHost && p.paid).length;
  const guestCount = state.participants.filter(p => !p.isHost).length;
  const dateLabel = R.date ? new Date(R.date + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
  const share = async () => {
    const text = `Our bill from ${R.merchant || "dinner"} is on Going Dutch. Tap your name, then what you had: ${shareUrl}`;
    if (navigator.share) { try { await navigator.share({ title: "Going Dutch", text }); return; } catch (e) { if (e?.name === "AbortError") return; } }
    toast(await copyText(shareUrl) ? "Link copied" : "Copy blocked");
  };
  return html`<div className="rounded-2xl border border-line bg-card px-3.5 py-2.5 shadow-card">
    <div className="flex items-center gap-3">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-moneysoft text-money"><${Ic} n="Receipt" s=${18} /></span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-tight truncate">${R.merchant || "Untitled bill"}</p>
        <p className="text-xs text-muted tnum leading-snug">${[dateLabel, state.participants.length + (state.participants.length === 1 ? " person" : " people"), guestCount && paidCount ? `${paidCount}/${guestCount} paid` : "", state.locked ? "Locked" : ""].filter(Boolean).join(" · ")}</p>
      </div>
      <div className="text-right">
        <p className="font-display text-lg font-extrabold leading-none tnum">${fmt(calc.total)}</p>
        <p className=${"mt-1 text-[11px] font-semibold tnum " + (allClaimed ? "text-money" : calc.subtotal > 0 ? "text-warn" : "text-muted")}>
          ${calc.subtotal <= 0 ? "No items yet" : allClaimed ? "All claimed" : fmt(calc.unassigned) + " unclaimed"}</p>
      </div>
      <div className="-mr-1 flex items-center">
        ${photo && html`<button type="button" onClick=${() => setViewing(true)} aria-label="View receipt photo" title="View receipt" className="p-2 rounded-xl text-muted hover:text-ink hover:bg-soft"><${Ic} n="Image" s=${18} /></button>`}
        <button type="button" onClick=${share} aria-label="Share bill link" className="p-2 rounded-xl text-muted hover:text-ink hover:bg-soft"><${Ic} n="Share2" s=${18} /></button>
        ${menu}
      </div>
    </div>
    ${viewing && photo && html`<${ReceiptViewer} path=${photo} onClose=${() => setViewing(false)} />`}
    ${calc.subtotal > 0 && html`<div className="mt-2 h-1.5 rounded-full bg-soft overflow-hidden" role="progressbar" aria-label="Share of items claimed" aria-valuenow=${Math.round(pct)} aria-valuemin="0" aria-valuemax="100">
      <div className="h-full rounded-full transition-all duration-500" style=${{ width: pct + "%", background: allClaimed ? "var(--money)" : "var(--warn)" }}></div></div>`}
  </div>`;
}

/* ---------- a single bill ---------- */
function BillPage({ code, user, toast, go }) {
  const { state, setState, status, meta, setLocked } = useBill(code, user, toast);
  const calc = useMemo(() => state ? compute(state) : null, [state]);
  const setMode = mode => { setState(s => ({ ...s, mode })); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const shareUrl = location.origin + location.pathname + "#/b/" + code;
  const [claimView, setClaimView] = useState(null); // "me" | "all"

  if (status === "notfound") return html`<${Card} className="p-6 text-center"><p className="font-display text-lg font-bold">This bill doesn't exist</p>
    <p className="text-sm text-muted mt-1">The link may be mistyped, or the bill was deleted.</p>
    <button type="button" onClick=${() => go("/")} className="mt-4 rounded-xl bg-ink text-bg px-4 py-2.5 font-semibold">Go to my bills</button></${Card}>`;
  if (status === "error") return html`<${Card} className="p-6 text-center"><p className="font-display text-lg font-bold">Couldn't open this bill</p>
    <p className="text-sm text-muted mt-1">Check your connection and reload the page.</p></${Card}>`;
  if (!state) return html`<${Card} className="p-6 text-center text-muted text-sm"><${Ic} n="Loader2" s=${18} c="animate-spin inline mr-2" />Opening the bill…</${Card}>`;

  const onParsed = d => setState(s => {
    const items = (d.items || []).map(i => ({ id: uid(), name: String(i.name || ""), price: i.price != null ? String(r2(num(i.price))) : "", quantity: String(num(i.quantity) || 1) }));
    const tipVal = num(d.tip);
    return {
      ...s, isDemo: false, assignments: {},
      receipt: {
        merchant: d.merchant || "", date: /^\d{4}-\d{2}-\d{2}$/.test(d.date || "") ? d.date : s.receipt.date, items: items.length ? items : s.receipt.items,
        tax: d.tax != null ? String(r2(num(d.tax))) : "", fees: (d.fees || []).map(f => ({ id: uid(), name: String(f.name || "Fee"), amount: String(r2(num(f.amount))) })),
        printedSubtotal: d.subtotal ?? null, printedTotal: d.total ?? null, photo: s.receipt.photo || null
      },
      tip: tipVal > 0 ? { mode: "amount", value: tipVal.toFixed(2) } : s.tip
    };
  });
  const onPhoto = async blob => {
    if (!meta?.id) return;
    try {
      const path = await uploadReceiptPhoto(meta.id, blob);
      setState(s => ({ ...s, receipt: { ...s.receipt, photo: path } }));
    } catch (e) { toast("Couldn't save the receipt photo, but you can keep going"); }
  };
  const onPickMe = pid => setState(s => ({ ...s, participants: s.participants.map(p => p.id === pid ? { ...p, userId: user.id } : (p.userId === user.id ? { ...p, userId: null } : p)) }));
  const meDefault = state.participants.find(p => p.userId === user.id)?.id || null;
  const newBill = async () => { try { go("/b/" + await createBill(user, false)); } catch (e) { toast("Couldn't create the bill. Try again."); } };

  const onAddMe = name => setState(s => {
    if (s.participants.length >= 12) return s;
    const cleared = s.participants.map(p => p.userId === user.id ? { ...p, userId: null } : p);
    return { ...s, participants: [...cleared, { id: uid(), name, isHost: false, userId: user.id }] };
  });
  const isCreator = meta?.createdBy === user.id;
  const view = claimView || (isCreator ? "all" : "me");
  const ViewSwitch = () => html`<div className="grid grid-cols-2 gap-1 rounded-xl bg-soft p-1 text-sm font-semibold">
    ${[["me", "My items"], ["all", "Everyone's"]].map(([v, label]) => html`<button key=${v} type="button" onClick=${() => setClaimView(v)}
      className=${"rounded-lg py-1.5 transition " + (view === v ? "bg-card text-ink shadow-card" : "text-muted")}>${label}</button>`)}
  </div>`;
  const tabs = [["host-setup", "Setup", "Receipt"], ["guest-split", "Claim items", "Users"], ["summary", "Summary", "Wallet"]];
  return html`<div className="flex flex-col gap-4">
    <nav className="sticky z-30 -mx-4 px-4 pt-2 pb-2 backdrop-blur" style=${{ top: "env(safe-area-inset-top, 0px)", background: "color-mix(in srgb, var(--bg) 92%, transparent)" }}>
      <${BillHeader} state=${state} calc=${calc} shareUrl=${shareUrl} toast=${toast} menu=${html`<${BillMenu} state=${state} isCreator=${isCreator} setState=${setState} setLocked=${setLocked}
        onDelete=${async () => { try { await deleteBill(meta.id, code); toast("Bill deleted"); go("/"); } catch (e) { toast("Couldn't delete the bill. Try again."); } }}
        onLeave=${async () => { try { await leaveBill(meta.id, user.id, code); toast("You left the bill"); go("/"); } catch (e) { toast("Couldn't leave the bill. Try again."); } }} />`} />
      <div className="mt-2 grid grid-cols-3 gap-1 rounded-2xl bg-soft p-1" role="tablist">
        ${tabs.map(([id, label, icon]) => html`<button key=${id} role="tab" aria-selected=${state.mode === id} onClick=${() => setMode(id)}
          className=${"inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition " + (state.mode === id ? "bg-card text-ink shadow-card" : "text-muted hover:text-ink")}>
          <${Ic} n=${icon} s=${15} />${label}</button>`)}
      </div>
    </nav>
    ${state.isDemo && html`<div className="flex items-center gap-3 rounded-2xl border border-dashed bg-moneysoft px-4 py-2.5 text-sm" style=${{ borderColor: "var(--money)" }}>
      <${Ic} n="Sparkles" s=${16} c="text-money shrink-0" /><span className="flex-1">This is an example bill. Play with it, then start a real one.</span>
      <button type="button" onClick=${newBill} className="font-semibold text-money whitespace-nowrap">New bill</button></div>`}

    ${state.locked && html`<div className="flex items-center gap-3 rounded-2xl border border-line bg-soft px-4 py-2.5 text-sm">
      <${Ic} n="Lock" s=${16} c="text-muted shrink-0" /><span className="flex-1">This bill is settled and locked, so nothing can be changed.${isCreator ? " Unlock it from the ⋯ menu if you need to." : ""}</span></div>`}
    <fieldset disabled=${!!state.locked} className="contents">
    ${state.mode === "host-setup" && html`
      <${Card} className="p-5"><${StepHead} n="1" title="Upload the receipt" sub="We read the line items, tax and fees for you." /><${UploadZone} onParsed=${onParsed} onPhoto=${onPhoto} /></${Card}>
      <${Card} className="p-5"><${StepHead} n="2" title="Who's splitting?" sub="2 to 12 people, including you. Rename, add or remove anyone." /><${People} state=${state} setState=${setState} toast=${toast} /></${Card}>
      <${Card} className="p-5"><${StepHead} n="3" title="Check the numbers" sub="Everything is editable. Claims stay put when you edit an item." /><${ReceiptEditor} state=${state} setState=${setState} calc=${calc} /></${Card}>
      <${Card} className="p-5"><${StepHead} n="4" title="How should people pay you?" sub="Optional. Adds one-tap pay buttons for your friends." /><${PaySetup} state=${state} setState=${setState} user=${user} toast=${toast} /></${Card}>
      <${Card} className="p-5"><${StepHead} n="5" title="Send it to the table" /><${Share} state=${state} toast=${toast} shareUrl=${shareUrl} goGuest=${() => setMode("guest-split")} /></${Card}>`}
    ${state.mode === "guest-split" && html`
      <${ViewSwitch} />
      ${view === "all"
        ? html`<${Assign} key=${code} state=${state} setState=${setState} calc=${calc} toast=${toast} meDefault=${meDefault} onPickMe=${onPickMe} goSummary=${() => setMode("summary")} />`
        : meDefault
          ? html`<${MyClaims} state=${state} setState=${setState} calc=${calc} meId=${meDefault} onSwitch=${() => onPickMe(null)} toast=${toast} goSummary=${() => setMode("summary")} />`
          : html`<${PickMe} state=${state} user=${user} onPick=${onPickMe} onAdd=${onAddMe} />`}`}
    </fieldset>
    ${state.mode === "summary" && html`<${Summary} state=${state} setState=${setState} calc=${calc} toast=${toast} reset=${newBill} live=${true} readOnly=${!!state.locked} />`}
  </div>`;
}
