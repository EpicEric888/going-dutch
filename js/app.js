/* ---------- app shell: routing, theme, toasts ---------- */
const parseRoute = () => {
  const m = location.hash.match(/^#\/b\/([a-z0-9]{6,32})/i);
  return m ? { page: "bill", code: m[1].toLowerCase() } : { page: "home" };
};

function App() {
  const { user, error } = useAuth();
  const [route, setRoute] = useState(parseRoute);
  const [theme, setTheme] = useState(loadTheme);
  const [toastMsg, setToastMsg] = useState(null);
  const tRef = useRef(null), appRef = useRef(null);

  useEffect(() => { const f = () => setRoute(parseRoute()); window.addEventListener("hashchange", f); return () => window.removeEventListener("hashchange", f); }, []);
  useEffect(() => {
    try { localStorage.setItem(THEME_STORE, JSON.stringify(theme)); } catch (e) {}
    const paint = () => { if (appRef.current) document.body.style.background = getComputedStyle(appRef.current).getPropertyValue("--bg"); };
    paint();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener?.("change", paint);
    return () => mq.removeEventListener?.("change", paint);
  }, [theme]);

  const toast = (m, action) => { setToastMsg({ m, action }); clearTimeout(tRef.current); tRef.current = setTimeout(() => setToastMsg(null), action ? 5000 : 2400); };
  const go = path => { location.hash = "#" + path; window.scrollTo({ top: 0 }); };

  return html`<div className="app" ref=${appRef} data-pal=${theme.pal} data-mode=${theme.mode}>
    <header className="px-4 pt-5 pb-3 max-w-[640px] mx-auto flex items-center gap-3">
      <a href="#/" className="flex items-center gap-3 min-w-0 flex-1">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-card" style=${{ background: "linear-gradient(160deg,var(--hero1),var(--hero2))" }}><${Ic} n="Receipt" s=${20} /></span>
        <span className="min-w-0"><span className="block font-display text-2xl font-extrabold leading-none tracking-tight">Going Dutch</span>
          <span className="block text-xs text-muted mt-1 leading-snug">Pay for what you had. Share the rest fairly.</span></span>
      </a>
      <${ThemePicker} theme=${theme} setTheme=${setTheme} />
      <${AccountMenu} user=${user} toast=${toast} />
    </header>

    <main className="px-4 pt-1 pb-24 max-w-[640px] mx-auto flex flex-col gap-4">
      ${error ? html`<${Card} className="p-6"><p className="font-display text-lg font-bold">Can't connect right now</p>
          <p className="text-sm text-muted mt-1">${/anonymous/i.test(error) ? "Guest access is turned off for this site. The owner needs to allow anonymous sign-ins in Supabase." : error}</p></${Card}>`
        : !user ? html`<${Card} className="p-6 text-center text-muted text-sm"><${Ic} n="Loader2" s=${18} c="animate-spin inline mr-2" />Getting things ready…</${Card}>`
        : route.page === "bill" ? html`<${BillPage} key=${route.code} code=${route.code} user=${user} toast=${toast} go=${go} />`
        : html`<${Home} user=${user} toast=${toast} go=${go} />`}
      <footer className="pt-6 text-center text-xs text-muted"><a href="privacy.html" className="hover:underline">Privacy</a> · <a href="terms.html" className="hover:underline">Terms</a></footer>
    </main>

    ${toastMsg && html`<div className="fixed left-1/2 -translate-x-1/2 z-50 rounded-full bg-ink text-bg px-4 py-2 text-sm font-semibold shadow-card inline-flex items-center gap-2" style=${{ bottom: "calc(20px + env(safe-area-inset-bottom, 0px))" }}>
      <${Ic} n="Check" s=${16} />${toastMsg.m}
      ${toastMsg.action && html`<button type="button" onClick=${() => { toastMsg.action.fn(); setToastMsg(null); }} className="ml-1 rounded-full px-2.5 py-0.5 text-money font-bold" style=${{ background: "color-mix(in srgb, var(--bg) 18%, transparent)" }}>${toastMsg.action.label}</button>`}</div>`}
  </div>`;
}

ReactDOM.createRoot(document.getElementById("root")).render(html`<${App} />`);
