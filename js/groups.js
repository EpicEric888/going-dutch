/* ---------- groups: several bills, one running balance ----------
   A group keeps a people list (ids reused by every bill in the group), so the same person
   adds up across bills. Balance per bill: the payer is owed each other person's share,
   unless that person marked it paid. Payments recorded in the group settle the rest. */

async function createGroup(user, name) {
  const me = { id: uid(), name: displayNameOf(user) || tl("You", "Jij"), userId: user.id };
  const { data, error } = await supa.from("groups")
    .insert({ created_by: user.id, name: name.trim(), currency: guessCurrency(), people: [me] })
    .select("share_code").single();
  if (error) throw error;
  return data.share_code;
}

async function hydrateBills(bills) {
  if (!bills.length) return [];
  const { data: claims } = await supa.from("claims").select("bill_id, participant_id, item_id, units").in("bill_id", bills.map(b => b.id));
  return bills.map(b => {
    const m = claimsFromRows((claims || []).filter(c => c.bill_id === b.id));
    const s = withClaims({ receipt: b.receipt, tip: b.tip, participants: b.participants || [], locked: !!b.locked }, m);
    return { ...b, state: s, calc: compute(s) };
  });
}

const BILL_COLS = "id, share_code, created_by, group_id, receipt, tip, participants, locked, created_at, updated_at";

async function listMyGroups() {
  const { data: groups, error } = await supa.from("groups").select("*").order("updated_at", { ascending: false }).limit(50);
  if (error) throw error;
  if (!groups.length) return [];
  const { data: bills } = await supa.from("bills").select(BILL_COLS).in("group_id", groups.map(g => g.id));
  const all = await hydrateBills(bills || []);
  return groups.map(g => ({ ...g, bills: all.filter(b => b.group_id === g.id) }));
}

/* nets per currency: { EUR: { personId: +owed / -owes } } */
function groupLedger(group, bills) {
  const nets = {};
  const add = (cur, pid, v) => { const n = nets[cur] || (nets[cur] = {}); n[pid] = (n[pid] || 0) + v; };
  bills.forEach(b => {
    if (b.state.receipt?.isDemo) return;
    const cur = b.state.receipt.currency || "USD";
    const host = b.state.participants.find(p => p.isHost);
    if (!host) return;
    b.calc.rows.forEach(r => {
      if (r.p.id === host.id || r.p.paid || !(r.total > 0)) return;
      add(cur, host.id, r.total); add(cur, r.p.id, -r.total);
    });
  });
  (group.payments || []).forEach(pm => { add(pm.currency, pm.from, pm.amount); add(pm.currency, pm.to, -pm.amount); });
  Object.values(nets).forEach(n => Object.keys(n).forEach(k => { n[k] = Math.round(n[k] * 100) / 100; }));
  return nets;
}

/* fewest payments: biggest debtor pays biggest creditor, repeat */
function settleUp(net) {
  const deb = [], cred = [];
  Object.entries(net).forEach(([pid, v]) => { const c = Math.round(v * 100); if (c > 0) cred.push([pid, c]); else if (c < 0) deb.push([pid, -c]); });
  deb.sort((a, b) => b[1] - a[1]); cred.sort((a, b) => b[1] - a[1]);
  const out = []; let i = 0, j = 0;
  while (i < deb.length && j < cred.length) {
    const x = Math.min(deb[i][1], cred[j][1]);
    out.push({ from: deb[i][0], to: cred[j][0], amount: x / 100 });
    deb[i][1] -= x; cred[j][1] -= x;
    if (!deb[i][1]) i++;
    if (!cred[j][1]) j++;
  }
  return out;
}

/* people seen on any bill but missing from the group list get added (by id) */
function mergePeople(people, bills) {
  const out = [...(people || [])], seen = new Set(out.map(p => p.id));
  bills.forEach(b => (b.participants || []).forEach(p => {
    if (seen.has(p.id) || !p.name) return;
    seen.add(p.id); out.push({ id: p.id, name: p.name, ...(p.userId ? { userId: p.userId } : {}) });
  }));
  return out;
}

async function createBillInGroup(user, group, meId) {
  const base = blankState();
  const participants = group.people.map(p => ({
    id: p.id, name: p.name, isHost: p.id === meId,
    ...(p.userId ? { userId: p.userId } : {}),
    ...(p.id === meId ? { pay: user.user_metadata?.pay || {} } : {})
  }));
  const { data, error } = await supa.from("bills").insert({
    created_by: user.id, group_id: group.id,
    receipt: { ...base.receipt, currency: group.currency || base.receipt.currency, isDemo: false },
    tip: base.tip, participants
  }).select("share_code").single();
  if (error) throw error;
  rememberCode(data.share_code);
  return data.share_code;
}

/* a quick expense is a one-item bill, split evenly among the people picked, no tax or tip */
const EXPENSE_KINDS = [["Gas", "Fuel"], ["Groceries", "ShoppingCart"], ["Tickets", "Ticket"], ["Hotel", "BedDouble"], ["Taxi", "Car"], ["Drinks", "Wine"]];
const expenseIcon = R => (EXPENSE_KINDS.find(([k]) => k === R?.category) || [null, R?.kind === "expense" ? "Wallet" : "Receipt"])[1];

async function createExpenseInGroup(user, group, { what, amount, payerId, ids, category }) {
  const participants = group.people.map(p => ({
    id: p.id, name: p.name, isHost: p.id === payerId,
    ...(p.userId ? { userId: p.userId } : {}),
    ...(p.userId === user.id && p.id === payerId ? { pay: user.user_metadata?.pay || {} } : {})
  }));
  const item = { id: uid(), name: what, price: String(amount), quantity: "1" };
  const today = new Date(); const d = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const { data, error } = await supa.from("bills").insert({
    created_by: user.id, group_id: group.id,
    receipt: { kind: "expense", category: category || null, merchant: what, date: d, currency: group.currency || "USD", items: [item], tax: "", fees: [] },
    tip: { mode: "percent", value: "0" }, participants
  }).select("id").single();
  if (error) throw error;
  const { error: e2 } = await supa.from("claims").insert(ids.map(pid => ({ bill_id: data.id, participant_id: pid, item_id: item.id })));
  if (e2) throw e2;
}

function ExpenseForm({ user, group, people, me, onDone, toast }) {
  const [what, setWhat] = useState("");
  const [category, setCategory] = useState(null);
  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState(me?.id || people[0]?.id);
  const [ids, setIds] = useState(people.map(p => p.id));
  const [busy, setBusy] = useState(false);
  const cur = group.currency || "USD";
  const amt = num(amount);
  const ok = what.trim() && amt > 0 && payer && ids.length > 0;
  const toggle = id => setIds(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id]);
  const submit = async e => {
    e.preventDefault(); if (!ok) return;
    setBusy(true);
    try { await createExpenseInGroup(user, group, { what: what.trim(), amount: r2(amt), payerId: payer, ids, category }); toast(tl("Expense added", "Uitgave toegevoegd")); onDone(true); }
    catch (err) { toast("Couldn't save that change. Check your connection."); setBusy(false); }
  };
  const chip = (active, onClick, children, key) => html`<button key=${key} type="button" onClick=${onClick}
    className=${"inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-sm font-semibold " + (active ? "border-transparent bg-ink text-bg" : "border-line bg-card hover:bg-soft")}>${children}</button>`;
  return html`<${Card} className="p-4">
    <form onSubmit=${submit} className="flex flex-col gap-4">
      <div className="flex items-center justify-between"><p className="font-display text-lg font-bold">Add an expense</p>
        <button type="button" onClick=${() => onDone(false)} aria-label="Close" className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-soft"><${Ic} n="X" s=${16} /></button></div>
      <div>
        <${Label} htmlFor="exp-what">What was it?</${Label}>
        <input id="exp-what" className=${inputCls} value=${what} maxLength=${60} placeholder="Gas, museum tickets, groceries…" onInput=${e => { setWhat(e.target.value); setCategory(null); }} />
        <div className="mt-2 flex flex-wrap gap-1.5">${EXPENSE_KINDS.map(([k, icon]) => html`<button key=${k} type="button" onClick=${() => { setWhat(tl(k, NL[k] || k)); setCategory(k); }}
          className=${"inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold " + (category === k ? "border-transparent bg-moneysoft text-money" : "border-line bg-card text-muted hover:bg-soft")}><${Ic} n=${icon} s=${13} />${k}</button>`)}</div>
      </div>
      <div>
        <${Label} htmlFor="exp-amt">Amount</${Label}>
        <div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">${curSymbol(cur)}</span>
          <input id="exp-amt" className=${inputCls + " pl-8 font-mono"} inputMode="decimal" value=${amount} placeholder="0.00" onInput=${e => setAmount(e.target.value.replace(",", "."))} /></div>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-semibold">Paid by</p>
        <div className="flex flex-wrap gap-1.5">${people.map(p => chip(payer === p.id, () => setPayer(p.id), html`<${Avatar} name=${p.name} color=${colorFor(people, p.id)} size=${24} /><span translate="no">${p.name}</span>`, p.id))}</div>
      </div>
      <div>
        <div className="mb-1.5 flex items-baseline justify-between"><p className="text-sm font-semibold">Split between</p>
          <button type="button" onClick=${() => setIds(ids.length === people.length ? [] : people.map(p => p.id))} className="text-xs font-semibold text-money">${ids.length === people.length ? "Clear" : "Everyone"}</button></div>
        <div className="flex flex-wrap gap-1.5">${people.map(p => chip(ids.includes(p.id), () => toggle(p.id), html`<${Avatar} name=${p.name} color=${colorFor(people, p.id)} size=${24} /><span translate="no">${p.name}</span>`, p.id))}</div>
        ${ok && html`<p className="mt-2 text-xs text-muted">${tl(`${fmt(amt / ids.length, cur)} each`, `${fmt(amt / ids.length, cur)} per persoon`)}</p>`}
      </div>
      <button type="submit" disabled=${!ok || busy} className="rounded-xl bg-ink text-bg px-4 py-2.5 font-semibold disabled:opacity-50">${busy ? "Saving…" : "Add expense"}</button>
    </form>
  </${Card}>`;
}

function useGroup(code, user, toast) {
  const [group, setGroup] = useState(null);
  const [bills, setBills] = useState([]);
  const [status, setStatus] = useState("loading");
  const gid = useRef(null), gRef = useRef(null), timer = useRef(null);
  const put = g => { gRef.current = g; setGroup(g); };

  const load = async () => {
    const id = gid.current; if (!id) return;
    const [{ data: g, error }, { data: rows }] = await Promise.all([
      supa.from("groups").select("*").eq("id", id).single(),
      supa.from("bills").select(BILL_COLS).eq("group_id", id).order("created_at", { ascending: false })
    ]);
    if (error || !g) { setStatus("error"); return; }
    const list = await hydrateBills(rows || []);
    const people = mergePeople(g.people, rows || []);
    if (people.length !== (g.people || []).length) {
      g.people = people;
      supa.from("groups").update({ people }).eq("id", id).then(() => {});
    }
    put(g); setBills(list); setStatus("ready");
  };
  const reloadSoon = () => { clearTimeout(timer.current); timer.current = setTimeout(load, 400); };

  useEffect(() => {
    if (!user || !code) return;
    let alive = true, channel = null;
    setStatus("loading");
    (async () => {
      const { data: id, error } = await supa.rpc("join_group", { code });
      if (!alive) return;
      if (error || !id) { setStatus(/not found/i.test(error?.message || "") ? "notfound" : "error"); return; }
      gid.current = id;
      await load();
      channel = supa.channel("group-" + id)
        .on("postgres_changes", { event: "*", schema: "public", table: "groups", filter: `id=eq.${id}` }, p => { if (p.eventType === "DELETE") setStatus("notfound"); else reloadSoon(); })
        .on("postgres_changes", { event: "*", schema: "public", table: "bills", filter: `group_id=eq.${id}` }, reloadSoon)
        .on("postgres_changes", { event: "*", schema: "public", table: "claims" }, reloadSoon)
        .subscribe();
    })();
    const onVis = () => { if (document.visibilityState === "visible") reloadSoon(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { alive = false; clearTimeout(timer.current); document.removeEventListener("visibilitychange", onVis); if (channel) supa.removeChannel(channel); };
  }, [code, user?.id]);

  const save = async patch => {
    const g = gRef.current; if (!g) return;
    put({ ...g, ...patch });
    const { error } = await supa.from("groups").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", g.id);
    if (error) toast("Couldn't save that change. Check your connection.");
  };
  return { group, bills, status, save, reload: load };
}

/* ---------- UI ---------- */
const personName = (people, id) => people.find(p => p.id === id)?.name || "Someone";

function GroupsSection({ user, toast, go, hideEmpty = false, startOpen = false }) {
  const [groups, setGroups] = useState(null);
  const [naming, setNaming] = useState(startOpen);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);
  useEffect(() => {
    const open = () => { setNaming(true); setTimeout(() => boxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50); };
    window.addEventListener("gd:newgroup", open);
    return () => window.removeEventListener("gd:newgroup", open);
  }, []);
  useEffect(() => {
    let alive = true;
    listMyGroups().then(g => alive && setGroups(g)).catch(() => alive && setGroups([]));
    return () => { alive = false; };
  }, [user?.id]);

  const create = async e => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try { go("/g/" + await createGroup(user, name)); }
    catch (err) { toast("Couldn't create the group. Try again."); setBusy(false); }
  };

  if (hideEmpty && !naming && (!groups || groups.length === 0)) return html`<div ref=${boxRef}></div>`;
  return html`<div ref=${boxRef} className="flex flex-col gap-3">
    <div className="flex items-baseline justify-between">
      <h2 className="font-display text-xl font-bold">Groups</h2>
      ${!naming && html`<button type="button" onClick=${() => setNaming(true)} className="inline-flex items-center gap-1 text-sm font-semibold text-money"><${Ic} n="Plus" s=${15} />New group</button>`}
    </div>
    ${naming && html`<${Card} className="p-4">
      <form onSubmit=${create} className="flex flex-col gap-2">
        <${Label} htmlFor="group-name">Group name</${Label}>
        <div className="flex gap-2">
          <input id="group-name" autoFocus className=${inputCls} value=${name} maxLength=${60} onInput=${e => setName(e.target.value)} placeholder="Lisbon trip, Friday dinners, Ski weekend…" />
          <button type="submit" disabled=${busy || !name.trim()} className="shrink-0 rounded-xl bg-ink text-bg px-4 font-semibold disabled:opacity-50">${busy ? "…" : "Create"}</button>
        </div>
        <p className="text-xs text-muted">Put several bills in one group and see who's up or down overall. Great for trips and regular dinners.</p>
        <button type="button" onClick=${() => { setNaming(false); setName(""); }} className="self-start text-xs font-semibold text-muted">Cancel</button>
      </form>
    </${Card}>`}
    ${groups === null ? null
      : groups.length === 0 ? (!naming && html`<button type="button" onClick=${() => setNaming(true)} className="flex items-center gap-3 rounded-2xl border border-dashed border-line bg-card px-4 py-3 text-left hover:bg-soft">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moneysoft text-money"><${Ic} n="Users" s=${18} /></span>
          <span className="min-w-0"><span className="block text-sm font-semibold">Going on a trip, or out with the same friends a lot?</span>
            <span className="block text-xs text-muted">Start a group to keep a running tab across bills.</span></span>
        </button>`)
      : html`<ul className="flex flex-col gap-3">${groups.map(g => {
          const me = (g.people || []).find(p => p.userId === user.id);
          const nets = groupLedger(g, g.bills);
          const mine = me ? Object.entries(nets).map(([cur, n]) => [cur, n[me.id] || 0]).filter(([, v]) => Math.abs(v) >= 0.01) : [];
          return html`<li key=${g.id}><a href=${"#/g/" + g.share_code} className="block"><${Card} className="p-4 hover:bg-soft transition">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-moneysoft text-money"><${Ic} n="Users" s=${20} /></span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">${g.name || "Untitled group"}</p>
                <p className="text-xs text-muted">${(g.people || []).length} ${(g.people || []).length === 1 ? "person" : "people"} · ${g.bills.length} ${g.bills.length === 1 ? "bill" : "bills"}</p>
              </div>
              <div className="text-right">
                ${!me ? html`<${Ic} n="ChevronRight" s=${18} c="text-muted" />`
                  : !mine.length ? html`<p className="text-[10px] uppercase tracking-[0.08em] text-muted">All square</p>`
                  : mine.map(([cur, v]) => html`<div key=${cur}><p className="text-[10px] uppercase tracking-[0.08em] text-muted">${v > 0 ? "You're owed" : "You owe"}</p><p className="font-display font-bold text-money tnum">${fmt(Math.abs(v), cur)}</p></div>`)}
              </div>
            </div>
          </${Card}></a></li>`;
        })}</ul>`}
  </div>`;
}

function GroupChip({ groupId }) {
  const [g, setG] = useState(null);
  useEffect(() => {
    let alive = true;
    supa.from("groups").select("name, share_code").eq("id", groupId).maybeSingle().then(({ data }) => alive && setG(data));
    return () => { alive = false; };
  }, [groupId]);
  if (!g) return null;
  return html`<a href=${"#/g/" + g.share_code} className="inline-flex items-center gap-1.5 self-start rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold hover:bg-soft">
    <${Ic} n="Users" s=${13} /><span>Part of</span> <span translate="no">${g.name || "a group"}</span><${Ic} n="ChevronRight" s=${13} c="text-muted" /></a>`;
}

function GroupPage({ code, user, toast, go }) {
  const { group, bills, status, save, reload } = useGroup(code, user, toast);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");

  if (status === "loading") return html`<${Card} className="p-6 text-center text-muted text-sm"><${Ic} n="Loader2" s=${18} c="animate-spin inline mr-2" />Opening the group…</${Card}>`;
  if (status === "notfound") return html`<${Card} className="p-6 text-center"><p className="font-semibold">This group doesn't exist</p>
    <p className="text-sm text-muted mt-1">The link may be mistyped, or the group was deleted.</p>
    <button type="button" onClick=${() => go("/")} className="mt-4 rounded-xl bg-ink text-bg px-4 py-2 font-semibold">Go to my bills</button></${Card}>`;
  if (status !== "ready" || !group) return html`<${Card} className="p-6 text-center"><p className="font-semibold">Couldn't open this group</p><p className="text-sm text-muted mt-1">Check your connection and reload the page.</p></${Card}>`;

  const people = group.people || [];
  const me = people.find(p => p.userId === user.id);
  const nets = groupLedger(group, bills);
  const currencies = Object.keys(nets);
  const shareUrl = location.origin + location.pathname + "#/g/" + group.share_code;
  const realBills = bills.filter(b => !b.state.receipt?.isDemo);

  const claimMe = pid => save({ people: people.map(p => p.id === pid ? { ...p, userId: user.id } : p.userId === user.id ? (({ userId, ...rest }) => rest)(p) : p) });
  const addPerson = e => {
    e.preventDefault();
    const n = newName.trim(); if (!n) return;
    save({ people: [...people, { id: uid(), name: n }] }); setNewName("");
  };
  const renamePerson = (pid, n) => save({ people: people.map(p => p.id === pid ? { ...p, name: n } : p) });
  const usedIds = new Set(bills.flatMap(b => b.state.participants.map(p => p.id)));
  const removePerson = pid => save({ people: people.filter(p => p.id !== pid) });
  const addBill = async () => {
    let meId = me?.id, g = group;
    if (!meId) {
      const mine = { id: uid(), name: displayNameOf(user) || tl("You", "Jij"), userId: user.id };
      g = { ...group, people: [...people, mine] }; meId = mine.id;
      await save({ people: g.people });
    }
    setBusy(true);
    try { go("/b/" + await createBillInGroup(user, g, meId)); }
    catch (e) { toast("Couldn't create the bill. Try again."); setBusy(false); }
  };
  const recordPayment = (t, cur) => {
    const pm = { id: uid(), from: t.from, to: t.to, amount: t.amount, currency: cur, at: new Date().toISOString() };
    save({ payments: [...(group.payments || []), pm] });
    toast(tl(`Recorded: ${personName(people, t.from)} paid ${personName(people, t.to)} ${fmt(t.amount, cur)}`, `Genoteerd: ${personName(people, t.from)} betaalde ${personName(people, t.to)} ${fmt(t.amount, cur)}`),
      { label: tl("Undo", "Ongedaan maken"), fn: () => save({ payments: (gRefPayments(group, pm.id)) }) });
  };
  const gRefPayments = (g, id) => [...(g.payments || [])].filter(p => p.id !== id);
  const removePayment = id => save({ payments: (group.payments || []).filter(p => p.id !== id) });
  const share = async () => {
    const text = tl(`Join our group "${group.name}" on Going Dutch to see who owes what: ${shareUrl}`, `Doe mee met onze groep "${group.name}" op Going Dutch en zie wie wat moet betalen: ${shareUrl}`);
    if (navigator.share) { try { await navigator.share({ text }); return; } catch (e) { if (e?.name === "AbortError") return; } }
    if (await copyText(text)) toast("Invite copied. Paste it in your group chat."); else toast("Copy blocked. Select the link instead.");
  };
  const settleMsg = (t, cur) => tl(`Hey ${personName(people, t.from)}, for ${group.name} you owe ${personName(people, t.to)} ${fmt(t.amount, cur)}. Details: ${shareUrl}`,
    `Hoi ${personName(people, t.from)}, voor ${group.name} moet je ${personName(people, t.to)} nog ${fmt(t.amount, cur)} betalen. Details: ${shareUrl}`);

  return html`<div className="flex flex-col gap-4">
    <${Card} className="p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-moneysoft text-money"><${Ic} n="Users" s=${20} /></span>
        <div className="min-w-0 flex-1">
          ${editing ? html`<form onSubmit=${e => { e.preventDefault(); if (title.trim()) save({ name: title.trim() }); setEditing(false); }} className="flex gap-2">
              <input autoFocus aria-label="Group name" className=${inputCls} value=${title} maxLength=${60} onInput=${e => setTitle(e.target.value)} />
              <button type="submit" className="shrink-0 rounded-xl bg-ink text-bg px-3 text-sm font-semibold">Save</button></form>`
            : html`<button type="button" onClick=${() => { setTitle(group.name); setEditing(true); }} className="block max-w-full truncate text-left font-display text-2xl font-extrabold leading-tight" translate="no">${group.name || "Untitled group"}</button>`}
          <p className="text-xs text-muted mt-0.5">${people.length} ${people.length === 1 ? "person" : "people"} · ${realBills.length} ${realBills.length === 1 ? "bill" : "bills"}</p>
        </div>
        <button type="button" onClick=${share} aria-label="Share group link" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-line bg-card hover:bg-soft"><${Ic} n="Share2" s=${17} /></button>
      </div>
      ${me && html`<div className="mt-4 flex flex-wrap gap-2">${(() => {
          const mine = currencies.map(cur => [cur, nets[cur][me.id] || 0]).filter(([, v]) => Math.abs(v) >= 0.01);
          if (!mine.length) return html`<div className="rounded-xl bg-soft px-3 py-2"><p className="text-[10px] uppercase tracking-[0.08em] text-muted">Your balance</p><p className="font-display text-2xl font-extrabold">All square</p></div>`;
          return mine.map(([cur, v]) => html`<div key=${cur} className="rounded-xl bg-soft px-3 py-2"><p className="text-[10px] uppercase tracking-[0.08em] text-muted">${v > 0 ? "You're owed" : "You owe"}</p><p className="font-display text-2xl font-extrabold text-money tnum">${fmt(Math.abs(v), cur)}</p></div>`);
        })()}</div>`}
    </${Card}>

    ${!me && people.length > 0 && html`<${Card} className="p-4">
      <p className="font-display text-lg font-bold">Which one are you?</p>
      <p className="text-sm text-muted">Tap your name so we can show your balance.</p>
      <div className="mt-3 flex flex-wrap gap-2">${people.filter(p => !p.userId).map(p => html`<button key=${p.id} type="button" onClick=${() => claimMe(p.id)} className="inline-flex items-center gap-2 rounded-full border border-line bg-card py-1 pl-1 pr-3 text-sm font-semibold hover:bg-soft">
        <${Avatar} name=${p.name} color=${colorFor(people, p.id)} size=${26} /><span translate="no">${p.name}</span></button>`)}</div>
    </${Card}>`}

    ${adding ? html`<${ExpenseForm} user=${user} group=${group} people=${people} me=${me} toast=${toast} onDone=${saved => { setAdding(false); if (saved) reload(); }} />`
      : html`<div className="grid grid-cols-2 gap-2">
        <button type="button" disabled=${busy || people.length === 0} onClick=${() => setAdding(true)} className="flex flex-col items-center justify-center gap-0.5 rounded-2xl px-3 py-3 font-semibold text-moneyink shadow-card disabled:opacity-60" style=${{ background: "var(--money)" }}>
          <span className="inline-flex items-center gap-1.5"><${Ic} n="Plus" s=${17} />Add an expense</span><span className="text-[11px] font-medium opacity-80">Gas, tickets, groceries</span></button>
        <button type="button" disabled=${busy} onClick=${addBill} className="flex flex-col items-center justify-center gap-0.5 rounded-2xl border border-line bg-card px-3 py-3 font-semibold shadow-card hover:bg-soft disabled:opacity-60">
          <span className="inline-flex items-center gap-1.5"><${Ic} n="Receipt" s=${17} />${busy ? "Creating…" : "Add a receipt"}</span><span className="text-[11px] font-medium text-muted">Restaurant, split by item</span></button>
      </div>`}

    <${Card} className="p-4">
      <${StepHead} n="1" title="Settle up" sub="The fewest payments to get everyone square." />
      ${currencies.every(cur => !settleUp(nets[cur]).length)
        ? html`<p className="mt-3 rounded-xl bg-soft px-3 py-3 text-sm text-muted">${realBills.length ? "Everyone's square. Nice." : "Add a bill and balances show up here."}</p>`
        : currencies.map(cur => html`<ul key=${cur} className="mt-3 flex flex-col gap-2">${settleUp(nets[cur]).map((t, i) => html`<li key=${cur + i} className="rounded-xl bg-soft p-3">
            <div className="flex items-center gap-2">
              <${Avatar} name=${personName(people, t.from)} color=${colorFor(people, t.from)} size=${28} />
              <${Ic} n="ArrowRight" s=${15} c="text-muted" />
              <${Avatar} name=${personName(people, t.to)} color=${colorFor(people, t.to)} size=${28} />
              <p className="min-w-0 flex-1 text-sm"><span className="font-semibold" translate="no">${personName(people, t.from)}</span> <span>pays</span> <span className="font-semibold" translate="no">${personName(people, t.to)}</span></p>
              <p className="font-display font-bold tnum">${fmt(t.amount, cur)}</p>
            </div>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick=${() => recordPayment(t, cur)} className="inline-flex items-center gap-1 rounded-full border border-line bg-card px-2.5 py-1 text-xs font-semibold hover:bg-soft"><${Ic} n="Check" s=${13} />Mark as paid</button>
              <button type="button" onClick=${async () => toast(await copyText(settleMsg(t, cur)) ? "Message copied" : "Copy blocked. Select the text instead.")} className="inline-flex items-center gap-1 rounded-full border border-line bg-card px-2.5 py-1 text-xs font-semibold hover:bg-soft"><${Ic} n="Copy" s=${13} />Copy reminder</button>
            </div>
          </li>`)}</ul>`)}
      ${currencies.length > 1 && html`<p className="mt-2 text-xs text-muted">Bills in different currencies are settled separately for now.</p>`}
    </${Card}>

    <${Card} className="p-4">
      <${StepHead} n="2" title="Balances" sub="Across every bill in the group, after payments." />
      <ul className="mt-3 flex flex-col divide-y divide-line">${people.map(p => html`<li key=${p.id} className="flex items-center gap-3 py-2">
        <${Avatar} name=${p.name} color=${colorFor(people, p.id)} size=${30} />
        <span className="min-w-0 flex-1 truncate font-medium"><span translate="no">${p.name}</span>${p.userId === user.id ? html` <span className="text-xs font-normal text-muted">(you)</span>` : null}</span>
        <span className="text-right">${currencies.length === 0 ? html`<span className="text-sm text-muted">–</span>` : currencies.map(cur => {
          const v = nets[cur][p.id] || 0;
          return html`<span key=${cur} className=${"block font-mono text-sm tnum " + (v > 0.004 ? "text-money font-semibold" : v < -0.004 ? "text-danger" : "text-muted")}>${v > 0.004 ? "+" : ""}${fmt(v, cur)}</span>`;
        })}</span>
      </li>`)}</ul>
    </${Card}>

    <${Card} className="p-4">
      <${StepHead} n="3" title="Expenses" sub="Every bill and expense in the group. Tap one to see or change it." />
      ${realBills.length === 0 ? html`<p className="mt-3 text-sm text-muted">Nothing added yet.</p>`
        : html`<ul className="mt-3 flex flex-col gap-2">${realBills.map(b => {
            const R = b.receipt || {}, host = b.state.participants.find(p => p.isHost);
            return html`<li key=${b.id}><a href=${"#/b/" + b.share_code} className="flex items-center gap-3 rounded-xl bg-soft p-3 hover:opacity-90">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card text-money"><${Ic} n=${expenseIcon(R)} s=${17} /></span>
              <span className="min-w-0 flex-1"><span className="block truncate font-semibold" translate="no">${R.merchant || "Untitled bill"}</span>
                <span className="block text-xs text-muted">${R.date ? new Date(R.date + "T12:00").toLocaleDateString(LOCALE(), { month: "short", day: "numeric" }) : "No date"} · <span>paid by</span> <span translate="no">${host?.name || "someone"}</span></span></span>
              <span className="font-mono text-sm tnum">${fmt(b.calc.total, R.currency || "USD")}</span>
            </a></li>`;
          })}</ul>`}
    </${Card}>

    ${(group.payments || []).length > 0 && html`<${Card} className="p-4">
      <${StepHead} n="4" title="Payments" sub="Recorded in this group. Tap × if one was a mistake." />
      <ul className="mt-3 flex flex-col gap-1.5">${[...group.payments].reverse().map(pm => html`<li key=${pm.id} className="flex items-center gap-2 text-sm">
        <span className="min-w-0 flex-1"><span className="font-semibold" translate="no">${personName(people, pm.from)}</span> <span>paid</span> <span className="font-semibold" translate="no">${personName(people, pm.to)}</span></span>
        <span className="font-mono tnum">${fmt(pm.amount, pm.currency)}</span>
        <button type="button" onClick=${() => removePayment(pm.id)} aria-label="Remove payment" className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-soft"><${Ic} n="X" s=${14} /></button>
      </li>`)}</ul>
    </${Card}>`}

    <${Card} className="p-4">
      <${StepHead} n=${(group.payments || []).length ? "5" : "4"} title="People" sub="New bills in this group start with everyone here." />
      <ul className="mt-3 flex flex-col gap-2">${people.map(p => html`<li key=${p.id} className="flex items-center gap-2">
        <${Avatar} name=${p.name} color=${colorFor(people, p.id)} size=${30} />
        <input aria-label=${"Name for " + p.name} className=${inputCls} defaultValue=${p.name} onBlur=${e => { const v = e.target.value.trim(); if (v && v !== p.name) renamePerson(p.id, v); }} />
        ${!usedIds.has(p.id) && p.userId !== user.id && html`<button type="button" onClick=${() => removePerson(p.id)} aria-label=${"Remove " + p.name} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-soft"><${Ic} n="X" s=${16} /></button>`}
      </li>`)}</ul>
      <form onSubmit=${addPerson} className="mt-3 flex gap-2">
        <input aria-label="New person's name" className=${inputCls} value=${newName} maxLength=${40} onInput=${e => setNewName(e.target.value)} placeholder="Add someone" />
        <button type="submit" disabled=${!newName.trim()} className="shrink-0 rounded-xl bg-ink text-bg px-4 font-semibold disabled:opacity-50">Add</button>
      </form>
    </${Card}>
  </div>`;
}
