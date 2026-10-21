/* ---------- Supabase: auth, bills, live sync ---------- */
const supa = window.supabase.createClient(GD_CONFIG.supabaseUrl, GD_CONFIG.supabaseKey, {
  auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const CODES_STORE = "goingdutch.codes";
function rememberCode(code) {
  try {
    const list = JSON.parse(localStorage.getItem(CODES_STORE) || "[]").filter(c => c !== code);
    list.unshift(code); localStorage.setItem(CODES_STORE, JSON.stringify(list.slice(0, 100)));
  } catch (e) {}
}
function rememberedCodes() { try { return JSON.parse(localStorage.getItem(CODES_STORE) || "[]"); } catch (e) { return []; } }

/* Everyone gets a session: a guest (anonymous) one until they sign up. */
function useAuth() {
  const [user, setUser] = useState(undefined);
  const [error, setError] = useState(null);
  const lastId = useRef(null);
  useEffect(() => {
    let alive = true;
    const ensure = async () => {
      const { data } = await supa.auth.getSession();
      if (!alive) return;
      if (data.session) { setUser(data.session.user); return; }
      const { data: d, error: e } = await supa.auth.signInAnonymously();
      if (!alive) return;
      if (e) setError(e.message || "Couldn't start a session"); else setUser(d.user);
    };
    ensure();
    const { data: sub } = supa.auth.onAuthStateChange((event, session) => {
      if (session?.user) setUser(session.user);
      else if (event === "SIGNED_OUT") { setUser(undefined); ensure(); }
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);
  // When someone signs in on this device, bring along the bills they opened here as a guest.
  useEffect(() => {
    if (!user || user.id === lastId.current) return;
    const prev = lastId.current; lastId.current = user.id;
    if (prev && !user.is_anonymous) rememberedCodes().forEach(code => supa.rpc("join_bill", { code }));
  }, [user]);
  return { user, error };
}

const displayNameOf = user => { const m = user?.user_metadata || {}; return m.display_name || m.full_name || m.name || ""; };

/* Google: a guest links Google to their current session (keeps their bills).
   If that Google account already belongs to someone, sign in to it instead. */
async function continueWithGoogle(user) {
  const opts = { provider: "google", options: { redirectTo: location.origin + location.pathname } };
  if (user?.is_anonymous && supa.auth.linkIdentity) {
    const { error } = await supa.auth.linkIdentity(opts);
    if (!error) return null;
    if (!/already|exists|linking/i.test(error.message || "")) return error;
  }
  const { error } = await supa.auth.signInWithOAuth(opts);
  return error || null;
}
// Coming back from a Google link attempt whose account already exists: sign in to that account.
(function handleOAuthReturn() {
  const q = new URLSearchParams(location.search + "&" + location.hash.replace(/^#/, ""));
  if (q.get("error_code") === "identity_already_exists") {
    history.replaceState(null, "", location.pathname);
    supa.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname } });
  }
})();

async function createBill(user, demo = false) {
  const base = demo ? demoState() : blankState();
  const participants = base.participants.map(p => p.isHost ? { ...p, name: p.name || displayNameOf(user), userId: user.id, pay: user.user_metadata?.pay || {} } : p);
  const { data, error } = await supa.from("bills").insert({
    created_by: user.id,
    receipt: { ...base.receipt, isDemo: !!base.isDemo },
    tip: base.tip,
    participants
  }).select("id, share_code").single();
  if (error) throw error;
  if (demo) {
    // Copy the example's claims so the demo opens fully set up.
    const rows = [];
    Object.entries(base.assignments).forEach(([item_id, pids]) => pids.forEach(participant_id => rows.push({ bill_id: data.id, participant_id, item_id })));
    if (rows.length) await supa.from("claims").insert(rows);
  }
  rememberCode(data.share_code);
  return data.share_code;
}

async function listMyBills() {
  const { data: bills, error } = await supa.from("bills")
    .select("id, share_code, created_by, receipt, tip, participants, locked, updated_at")
    .order("updated_at", { ascending: false }).limit(50);
  if (error) throw error;
  if (!bills.length) return [];
  const { data: claims } = await supa.from("claims").select("bill_id, participant_id, item_id, units").in("bill_id", bills.map(b => b.id));
  return bills.map(b => {
    const m = claimsFromRows((claims || []).filter(c => c.bill_id === b.id));
    const s = withClaims({ receipt: b.receipt, tip: b.tip, participants: b.participants || [], locked: !!b.locked }, m);
    return { ...b, state: s, calc: compute(s) };
  });
}

/* Receipt photos: shrunk to a sensible size, kept privately with the bill. */
async function shrinkImage(blob, max = 2000, quality = 0.85) {
  try {
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const out = await new Promise(r => c.toBlob(r, "image/jpeg", quality));
    return out && out.size < blob.size ? out : blob;
  } catch (e) { return blob; }
}
async function uploadReceiptPhoto(billId, blob) {
  const img = await shrinkImage(blob);
  const ext = img.type === "image/png" ? "png" : img.type === "image/webp" ? "webp" : "jpg";
  const path = `${billId}/${Date.now()}.${ext}`;
  const { error } = await supa.storage.from("receipts").upload(path, img, { contentType: img.type || "image/jpeg", upsert: false });
  if (error) throw error;
  return path;
}
async function receiptPhotoUrl(path) {
  const { data, error } = await supa.storage.from("receipts").createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

async function readReceipt(blob) {
  if (blob.size > 8 * 1024 * 1024) throw { code: "too_large" };
  const image = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(blob); });
  const { data, error } = await supa.functions.invoke("read-receipt", { body: { image, mediaType: blob.type || "image/png" } });
  if (error) {
    const status = error.context?.status;
    if (error.name === "FunctionsFetchError" || status === 404 || status === 503) throw { code: "not_set_up" };
    if (status === 429) throw { code: "rate_limited" };
    if (status === 422) throw { code: "invalid_json" };
    if (status === 400) throw { code: "image_rejected" };
    throw { code: "upstream" };
  }
  if (!data || !Array.isArray(data.items)) throw { code: "invalid_json" };
  return data;
}

/* ---------- live bill state ---------- */
const pairKey = (pid, iid) => pid + "|" + iid;
// Claims are kept as a Map of "person|item" -> how many of that item the person had (usually 1).
function claimsFromRows(rows) {
  const m = new Map();
  (rows || []).forEach(c => m.set(pairKey(c.participant_id, c.item_id), Math.max(1, c.units || 1)));
  return m;
}
function withClaims(s, m) {
  const a = {}, units = {};
  m.forEach((n, k) => {
    const [pid, iid] = k.split("|");
    if (!s.participants.some(p => p.id === pid) || !s.receipt.items.some(i => i.id === iid)) return;
    (a[iid] = a[iid] || []).push(pid);
    if (n > 1) (units[iid] = units[iid] || {})[pid] = n;
  });
  // keep the people order stable
  Object.keys(a).forEach(iid => a[iid].sort((x, y) => s.participants.findIndex(p => p.id === x) - s.participants.findIndex(p => p.id === y)));
  return { ...s, assignments: a, units };
}
function pairsOf(s) {
  const m = new Map();
  Object.entries(s.assignments || {}).forEach(([iid, pids]) => {
    if (!s.receipt.items.some(i => i.id === iid)) return;
    pids.forEach(pid => { if (s.participants.some(p => p.id === pid)) m.set(pairKey(pid, iid), Math.max(1, s.units?.[iid]?.[pid] || 1)); });
  });
  return m;
}

/* ---------- managing bills ---------- */
function forgetCode(code) {
  try { localStorage.setItem(CODES_STORE, JSON.stringify(rememberedCodes().filter(c => c !== code))); } catch (e) {}
}
async function deleteBill(billId, code) {
  // Photos first: once the bill is gone, nobody is allowed to touch its folder.
  const { data: files } = await supa.storage.from("receipts").list(billId, { limit: 100 });
  if (files?.length) await supa.storage.from("receipts").remove(files.map(f => `${billId}/${f.name}`));
  const { error } = await supa.from("bills").delete().eq("id", billId);
  if (error) throw error;
  forgetCode(code);
}
async function leaveBill(billId, userId, code) {
  const { error } = await supa.from("bill_members").delete().eq("bill_id", billId).eq("user_id", userId);
  if (error) throw error;
  forgetCode(code);
}
async function setBillLocked(billId, locked) {
  const { error } = await supa.from("bills").update({ locked }).eq("id", billId);
  if (error) throw error;
}
const billFields = s => ({ receipt: { ...s.receipt, isDemo: !!s.isDemo }, tip: s.tip, participants: s.participants });

function useBill(code, user, toast) {
  const [state, setLocal] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | notfound | error
  const [meta, setMeta] = useState(null);
  const stateRef = useRef(null), billId = useRef(null), claimsRef = useRef(new Map());
  const lastEdit = useRef(0), billTimer = useRef(null), remoteLater = useRef(null), claimTimer = useRef(null);
  const pending = useRef(0), claimsDirty = useRef(false), billQueue = useRef(Promise.resolve());
  const apply = next => { stateRef.current = next; setLocal(next); };

  const report = (e) => {
    const m = String(e?.message || "");
    if (/JWT|session|auth/i.test(m)) toast("Your session expired. Reload the page.");
    else toast("Couldn't save that change. Check your connection.");
  };

  const refetchClaims = () => {
    clearTimeout(claimTimer.current);
    claimTimer.current = setTimeout(async () => {
      if (pending.current > 0) { claimsDirty.current = true; return; }
      const { data, error } = await supa.from("claims").select("participant_id, item_id, units").eq("bill_id", billId.current);
      if (error || pending.current > 0) { if (!error) claimsDirty.current = true; return; }
      claimsRef.current = claimsFromRows(data);
      const cur = stateRef.current; if (cur) apply(withClaims(cur, claimsRef.current));
    }, 150);
  };

  const applyRemoteBill = row => {
    const cur = stateRef.current; if (!cur) return;
    apply(withClaims({ ...cur, receipt: row.receipt, tip: row.tip, participants: row.participants || [], isDemo: !!row.receipt?.isDemo, locked: !!row.locked }, claimsRef.current));
  };

  useEffect(() => {
    if (!user || !code) return;
    let alive = true, channel = null;
    setStatus("loading"); apply(null);
    (async () => {
      const { data: bid, error } = await supa.rpc("join_bill", { code });
      if (!alive) return;
      if (error || !bid) { setStatus(/not found/i.test(error?.message || "") ? "notfound" : "error"); return; }
      billId.current = bid; rememberCode(code);
      const [{ data: row, error: e1 }, { data: cl }] = await Promise.all([
        supa.from("bills").select("*").eq("id", bid).single(),
        supa.from("claims").select("participant_id, item_id, units").eq("bill_id", bid)
      ]);
      if (!alive) return;
      if (e1 || !row) { setStatus("error"); return; }
      claimsRef.current = claimsFromRows(cl);
      const s = withClaims({ receipt: row.receipt, tip: row.tip, participants: row.participants || [], isDemo: !!row.receipt?.isDemo, locked: !!row.locked, mode: row.created_by === user.id ? "host-setup" : "guest-split" }, claimsRef.current);
      apply(s); setMeta({ id: bid, createdBy: row.created_by, shareCode: row.share_code }); setStatus("ready");

      channel = supa.channel("bill-" + bid)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bills", filter: `id=eq.${bid}` }, p => {
          const row = p.new; if (!row?.receipt) return;
          const cur = stateRef.current;
          if (cur && !!row.locked !== !!cur.locked) { applyRemoteBill(row); return; }
          if (cur && JSON.stringify(billFields(cur)) === JSON.stringify({ receipt: row.receipt, tip: row.tip, participants: row.participants })) return;
          const quiet = Date.now() - lastEdit.current;
          clearTimeout(remoteLater.current);
          if (billTimer.current || quiet < 1500) {
            remoteLater.current = setTimeout(() => { if (!billTimer.current) applyRemoteBill(row); }, 1600 - Math.min(quiet, 1500));
            return;
          }
          applyRemoteBill(row);
        })
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "bills" }, p => { if (p.old?.id === bid) setStatus("notfound"); })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "claims", filter: `bill_id=eq.${bid}` }, refetchClaims)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "claims", filter: `bill_id=eq.${bid}` }, refetchClaims)
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "claims" }, p => { if (!p.old?.bill_id || p.old.bill_id === bid) refetchClaims(); })
        .subscribe(st => { if (st === "SUBSCRIBED") refetchClaims(); });
    })();
    return () => {
      alive = false; if (channel) supa.removeChannel(channel);
      [billTimer, remoteLater, claimTimer].forEach(t => clearTimeout(t.current));
      billTimer.current = null;
    };
  }, [code, user?.id]);

  // Every change goes through here; shared parts are saved and broadcast.
  const setState = updater => {
    const prev = stateRef.current; if (!prev) return;
    const next = typeof updater === "function" ? updater(prev) : updater;
    apply(next);
    const bid = billId.current; if (!bid) return;
    if (prev.receipt !== next.receipt || prev.tip !== next.tip || prev.participants !== next.participants || prev.isDemo !== next.isDemo) {
      lastEdit.current = Date.now();
      clearTimeout(billTimer.current);
      billTimer.current = setTimeout(() => {
        billTimer.current = null;
        const fields = billFields(stateRef.current);
        billQueue.current = billQueue.current.then(async () => {
          const { error } = await supa.from("bills").update(fields).eq("id", bid);
          if (error) { if (stateRef.current?.locked) toast("This bill is locked"); else report(error); }
        });
      }, 500);
    }
    if (prev.assignments !== next.assignments || prev.units !== next.units || prev.receipt.items !== next.receipt.items || prev.participants !== next.participants) {
      const after = pairsOf(next), before = claimsRef.current;
      const adds = [...after.keys()].filter(k => before.get(k) !== after.get(k));
      const removes = [...before.keys()].filter(k => !after.has(k));
      if (!adds.length && !removes.length) return;
      claimsRef.current = after;
      pending.current++;
      (async () => {
        const ops = [];
        if (adds.length) ops.push(supa.from("claims").upsert(adds.map(k => { const [participant_id, item_id] = k.split("|"); return { bill_id: bid, participant_id, item_id, units: after.get(k) }; }), { onConflict: "bill_id,participant_id,item_id" }));
        const byPerson = {};
        removes.forEach(k => { const [pid, iid] = k.split("|"); (byPerson[pid] = byPerson[pid] || []).push(iid); });
        Object.entries(byPerson).forEach(([pid, iids]) => ops.push(supa.from("claims").delete().eq("bill_id", bid).eq("participant_id", pid).in("item_id", iids)));
        const results = await Promise.all(ops);
        const err = results.find(r => r.error)?.error;
        if (err) { if (stateRef.current?.locked) toast("This bill is locked"); else report(err); claimsDirty.current = true; }
      })().finally(() => {
        pending.current--;
        if (pending.current === 0 && claimsDirty.current) { claimsDirty.current = false; refetchClaims(); }
      });
    }
  };

  const setLocked = async v => {
    try { await setBillLocked(billId.current, v); apply({ ...stateRef.current, locked: v }); toast(v ? "Bill locked" : "Bill unlocked"); }
    catch (e) { toast("Couldn't change the lock. Try again."); }
  };
  return { state, setState, status, meta, setLocked };
}
