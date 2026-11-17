/* ---------- app shell: routing, theme, toasts ---------- */
const parseRoute = () => {
  const m = location.hash.match(/^#\/b\/([a-z0-9]{6,32})/i);
  if (m) return { page: "bill", code: m[1].toLowerCase() };
  const g = location.hash.match(/^#\/g\/([a-z0-9]{6,32})/i);
  if (g) return { page: "group", code: g[1].toLowerCase() };
  if (/^#\/activity/.test(location.hash)) return { page: "activity" };
  if (/^#\/groups\/new/.test(location.hash)) return { page: "groups-new" };
  if (/^#\/groups/.test(location.hash)) return { page: "groups" };
  if (/^#\/new\/expense/.test(location.hash)) return { page: "expense" };
  return { page: "home" };
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
  const wide = ["home", "activity", "groups", "groups-new"].includes(route.page);
  const navKey = route.page === "groups-new" ? "groups" : route.page;

  return html`<div className=${"app" + (route.page === "bill" ? " has-tabbar" : "")} ref=${appRef} data-pal=${theme.pal} data-mode=${theme.mode}>
    <header className=${"px-4 pt-5 pb-3 mx-auto flex items-center gap-3 " + (wide ? "max-w-[1180px] lg:pt-8 lg:pb-6" : "max-w-[640px]")}>
      <a href="#/" className="flex items-center gap-3 min-w-0 flex-1 lg:flex-none">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-card lg:h-12 lg:w-12" style=${{ background: "linear-gradient(160deg,var(--hero1),var(--hero2))" }}><${Ic} n="Receipt" s=${21} /></span>
        <span className="block truncate font-display text-2xl font-extrabold leading-none tracking-tight lg:text-[28px]">Going Dutch</span>
      </a>
      ${wide && html`<nav aria-label="Main" className="mx-auto hidden items-center gap-2 lg:flex">${[["home", "#/", "Home"], ["activity", "#/activity", "Activity"], ["groups", "#/groups", "Groups"]].map(([k, href, label]) =>
        html`<a key=${k} href=${href} aria-current=${navKey === k ? "page" : null} className=${"rounded-full px-5 py-2 text-[15px] font-semibold " + (navKey === k ? "bg-moneysoft text-ink" : "text-ink hover:bg-soft")}>${label}</a>`)}</nav>`}
      <${LangToggle} />
      <${ThemePicker} theme=${theme} setTheme=${setTheme} />
      <${AccountMenu} user=${user} toast=${toast} />
    </header>

    <main className=${"px-4 pt-1 pb-24 mx-auto flex flex-col gap-4 " + (wide ? "max-w-[1180px]" : "max-w-[640px]")}>
      ${error ? html`<${Card} className="p-6"><p className="font-display text-lg font-bold">Can't connect right now</p>
          <p className="text-sm text-muted mt-1">${/anonymous/i.test(error) ? "Guest access is turned off for this site. The owner needs to allow anonymous sign-ins in Supabase." : error}</p></${Card}>`
        : !user ? html`<${Card} className="p-6 text-center text-muted text-sm"><${Ic} n="Loader2" s=${18} c="animate-spin inline mr-2" />Getting things ready…</${Card}>`
        : route.page === "bill" ? html`<${BillPage} key=${route.code} code=${route.code} user=${user} toast=${toast} go=${go} />`
        : route.page === "group" ? html`<${GroupPage} key=${route.code} code=${route.code} user=${user} toast=${toast} go=${go} />`
        : route.page === "expense" ? html`<${NewExpensePage} user=${user} toast=${toast} go=${go} />`
        : html`<${Home} key=${route.page} user=${user} toast=${toast} go=${go} view=${route.page} />`}
      <footer className="pt-6 text-center text-xs text-muted"><a href="privacy.html" className="hover:underline">Privacy</a> · <a href="terms.html" className="hover:underline">Terms</a></footer>
    </main>

    ${toastMsg && html`<div className="above-tabbar fixed left-1/2 -translate-x-1/2 z-50 rounded-full bg-ink text-bg px-4 py-2 text-sm font-semibold shadow-card inline-flex items-center gap-2" style=${{ bottom: "calc(20px + env(safe-area-inset-bottom, 0px))" }}>
      <${Ic} n="Check" s=${16} />${toastMsg.m}
      ${toastMsg.action && html`<button type="button" onClick=${() => { toastMsg.action.fn(); setToastMsg(null); }} className="ml-1 rounded-full px-2.5 py-0.5 text-money font-bold" style=${{ background: "color-mix(in srgb, var(--bg) 18%, transparent)" }}>${toastMsg.action.label}</button>`}</div>`}
  </div>`;
}

ReactDOM.createRoot(document.getElementById("root")).render(html`<${App} />`);
