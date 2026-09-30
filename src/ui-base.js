/* ============================================================
   UI foundation: icons, router, state binding, shared components,
   overlays, auth screens, onboarding.
   ============================================================ */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  heart: '<path d="M12 20s-7.5-4.4-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.6 12 20 12 20Z"/><path d="M7.5 12h2.2l1.3-2.2 2 4.2 1.3-2h2.2"/>',
  pill: '<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-40 12 12)"/><path d="m9.3 9.3 5.4 5.4" />',
  sparkle: '<path d="M12 3.5 13.8 9 19.5 11 13.8 13 12 18.5 10.2 13 4.5 11 10.2 9Z"/><path d="M19 3v3M17.5 4.5h3"/>',
  user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.6 4-5.2 7.5-5.2s6.3 1.6 7.5 5.2"/>',
  bell: '<path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2H4.5Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  file: '<path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5Z"/><path d="M14 3.5v5h5M8.5 13h7M8.5 16.5h5"/>',
  users: '<circle cx="9" cy="8.5" r="3.3"/><path d="M3 19.5c.9-3.1 3.2-4.6 6-4.6s5.1 1.5 6 4.6"/><path d="M15.5 5.5a3.2 3.2 0 0 1 0 6.1M17.5 14.9c1.8.6 3 2 3.5 4.6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 14.6a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  back: '<path d="M15 5 8 12l7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1 1 13 0c0 5.4-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/>',
  phone: '<path d="M6.5 3.5h3l1.5 4-2 1.3a10.5 10.5 0 0 0 6.2 6.2l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.5 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.5-3.5-8.5s1-5.9 3.5-8.5Z"/>',
  moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6Z"/><path d="m9 12 2 2 4-4"/>',
  logout: '<path d="M14.5 4.5h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3"/><path d="M10 16.5 5.5 12 10 7.5M5.5 12h10"/>',
  activity: '<path d="M3 12h4l2.5-6 5 12L17 12h4"/>',
  book: '<path d="M5 4.5h10.5a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3Z"/><path d="M5 16.5a3 3 0 0 1 3-3h10.5"/>',
  alert: '<path d="M12 4 2.8 19.5h18.4Z"/><path d="M12 10v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
  upload: '<path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9"/><path d="M4.5 15v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z"/>',
  send: '<path d="M4 12 20 4l-6 16-2.5-6.5Z"/><path d="m11.5 13.5 3-3"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3L19.5 9"/><path d="M19.5 4v5h-5"/>',
  hospital: '<rect x="4" y="4.5" width="16" height="16" rx="2.5"/><path d="M12 8.5v6M9 11.5h6M9 20.5v-3h6v3"/>',
  stethoscope: '<path d="M6 3.5v5a4 4 0 0 0 8 0v-5"/><path d="M10 12.5v2a5 5 0 0 0 10 0V13"/><circle cx="20" cy="11" r="2"/>',
  journal: '<path d="M6 3.5h11a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6Z"/><path d="M9.5 8h6M9.5 11.5h6M6 3.5v17"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>',
  layers: '<path d="m12 4 8.5 4.5L12 13 3.5 8.5Z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5"/>'
};
const icon = (n, cls = "") => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ""}</svg>`;
const flipIcon = (n, cls = "") => `<span class="flip">${icon(n, cls)}</span>`;
const BRAND_SVG = `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-dasharray="66 22" stroke-linecap="round" transform="rotate(-50 16 16)"/><circle cx="16" cy="16" r="5" fill="var(--ink)"/></svg>`;

/* ---------- UI state + router ---------- */
const UI = {
  route: { name: "login", params: {} }, stack: [], sheet: null, alarm: null, confirm: null,
  auth: { mode: "login", identifier: "", name: "", err: "", pending: null, resetUser: null },
  ob: { step: 0, data: {} },
  disc: { gov: "", spec: "", q: "", filters: { gender: "", avail: "", lang: "", price: "", type: "", area: "" }, searched: false },
  bk: null, apptTab: "upcoming", notifCat: "all", sumPeriod: "week", docQ: "", docCat: "all",
  chat: [], chatBusy: false, ci: null, medForm: null, clinicNav: "overview", snoozed: {}, alarmed: {}, aiLive: null, cg: null
};
function setPath(obj, path, val) { const ks = path.split("."); let o = obj; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]] ??= {}; o[ks.at(-1)] = val; }
function getPath(obj, path) { return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj); }
function go(name, params = {}, opts = {}) {
  if (!opts.replace && UI.route.name !== name) UI.stack.push(UI.route);
  if (UI.stack.length > 30) UI.stack.shift();
  UI.route = { name, params };
  UI.sheet = null;
  render({ scrollTop: true });
}
function back(fallback = "home") { const prev = UI.stack.pop(); UI.route = prev || { name: fallback, params: {} }; UI.sheet = null; render({ scrollTop: true }); }

/* ---------- theme / language ---------- */
function applyTheme() {
  const pref = safeStore.get("wellpoint.theme") || "system";
  if (pref === "system") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", pref);
}
function setLang(lang) {
  I18N.lang = STRINGS[lang] ? lang : "en";
  document.documentElement.lang = I18N.lang;
  document.documentElement.dir = isRTL() ? "rtl" : "ltr";
  safeStore.set("wellpoint.lang", I18N.lang);
  if (App.user && DB.profiles[App.user.id]) { DB.profiles[App.user.id].lang = I18N.lang; saveDB(); }
}
function langSwitcher() {
  return `<div class="seg" role="group" aria-label="${esc(t("language"))}">${["en", "ar", "zh"].map((l) => `<button data-act="lang" data-v="${l}" class="${I18N.lang === l ? "on" : ""}" lang="${l}">${LANG_NAMES[l]}</button>`).join("")}</div>`;
}
function themeLabel() { const p = safeStore.get("wellpoint.theme") || "system"; return t("theme_" + p); }

/* ---------- shared components ---------- */
const STATUS_TONE = { confirmed: "info", upcoming: "info", completed: "good", cancelled: "bad", rescheduled: "warn", no_show: "bad", invited: "warn", active: "good", removed: "bad" };
const statusPill = (s) => `<span class="pill ${STATUS_TONE[s] || ""}">${esc(t("st_" + s))}</span>`;
const demoTag = (k = "demo") => `<span class="demo-tag" title="${esc(t("demo_tip"))}">${esc(t(k))}</span>`;
function emptyState(ic, title, body, cta) {
  return `<div class="empty">${`<div class="iconwrap">${icon(ic, "ico-lg")}</div>`}<h4>${esc(title)}</h4>${body ? `<p class="muted small">${esc(body)}</p>` : ""}${cta || ""}</div>`;
}
function header(title, opts = {}) {
  const u = App.user; const unread = u ? DB.notifications.filter((n) => n.userId === u.id && !n.read).length : 0;
  const left = opts.back ? `<button class="icon-btn" data-act="back" aria-label="${esc(t("back"))}">${flipIcon("back")}</button>` : `<span class="brand">${BRAND_SVG}<span>Wellpoint</span></span>`;
  return `<header class="topbar" id="topbar">${left}<div class="grow">${opts.back && title ? `<h3 style="font-size:1.05rem">${esc(title)}</h3>` : ""}</div>
  ${opts.noBell ? "" : `<button class="icon-btn" data-go="notifications" aria-label="${esc(t("notifications"))}">${icon("bell")}${unread ? `<span class="dot-badge num">${unread > 9 ? "9+" : unread}</span>` : ""}</button>`}
  ${opts.extra || ""}${!opts.back && u && u.role !== "clinic" ? `<button class="avatar-btn" data-go="profile" aria-label="${esc(t("tab_profile"))}">${esc(initials(DB.profiles[u.id]?.name || u.name))}</button>` : ""}</header>`;
}
function whyBlock(reasons, label) {
  return `<details class="why"><summary>${icon("info", "ico-sm")} ${esc(label || t("why_seeing"))}</summary><ul>${reasons.map((r) => `<li>${esc(tx(r))}</li>`).join("")}</ul></details>`;
}
function field(id, label, inner, hint, err) {
  return `<div class="field"><label for="${id}">${esc(label)}</label>${inner}${hint ? `<span class="hint">${esc(hint)}</span>` : ""}${err ? `<span class="err" role="alert">${esc(err)}</span>` : ""}</div>`;
}
function inputEl(id, bind, opts = {}) {
  const v = opts.value ?? getPath(UI, bind) ?? "";
  return `<input class="input ${opts.invalid ? "invalid" : ""}" id="${id}" name="${id}" ${bind ? `data-bind="${bind}"` : ""} type="${opts.type || "text"}" value="${esc(v)}" ${opts.placeholder ? `placeholder="${esc(opts.placeholder)}"` : ""} ${opts.attrs || ""}>`;
}
function selectEl(id, bind, options, opts = {}) {
  const v = opts.value ?? getPath(UI, bind) ?? "";
  return `<select class="input" id="${id}" name="${id}" ${bind ? `data-bind="${bind}"` : ""} ${opts.attrs || ""}>${options.map(([val, lab]) => `<option value="${esc(val)}" ${String(val) === String(v) ? "selected" : ""}>${esc(lab)}</option>`).join("")}</select>`;
}
const govOptions = (withAny) => [...(withAny ? [["", t("any")]] : [["", t("choose")]]), ...GOVERNORATES.map((g) => [g, t("gov_" + g)])];
const specOptions = (withAny) => [...(withAny ? [["", t("any")]] : [["", t("choose")]]), ...SPECIALTIES.map((s) => [s, t("sp_" + s)])];
function clinicArt(c, big) {
  const h = c.hue; const seed = hashStr(c.id);
  const bars = Array.from({ length: 7 }, (_, i) => { const w = 36 + ((seed >>> i) % 5) * 8, x = 20 + i * 52, hh = 40 + ((seed >>> (i + 3)) % 7) * 12; return `<rect x="${x}" y="${170 - hh}" width="${w}" height="${hh}" rx="6" fill="hsl(${h} 35% ${48 + (i % 3) * 6}%)" opacity=".55"/>`; }).join("");
  return `<div class="clinic-img ${big ? "hero-img" : ""}"><svg class="art" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id="g${c.id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h} 45% 82%)"/><stop offset="1" stop-color="hsl(${h + 20} 40% 62%)"/></linearGradient></defs>
    <rect width="400" height="200" fill="url(#g${c.id})"/><circle cx="${300 + (seed % 60)}" cy="52" r="34" fill="hsl(${h} 60% 94%)" opacity=".6"/>${bars}
    <rect x="150" y="70" width="100" height="100" rx="10" fill="hsl(${h} 30% 96%)" opacity=".9"/><path d="M200 92v36M182 110h36" stroke="hsl(${h} 45% 45%)" stroke-width="8" stroke-linecap="round"/>
  </svg>${demoTag("illustration")}</div>`;
}
function stars(n) { return `<span class="rating">${Array.from({ length: 5 }, (_, i) => `<svg viewBox="0 0 24 24" style="opacity:${i < Math.round(n) ? 1 : 0.25}">${ICONS.star}</svg>`).join("")}<span class="num">${fmtNum(n, { minimumFractionDigits: 1 })}</span></span>`; }
const demoRating = (c) => 3.9 + (hashStr(c.id) % 10) / 10;

/* ---------- overlays ---------- */
function openSheet(fn) { UI.sheet = fn; renderLayer(); }
function closeSheet() { UI.sheet = null; renderLayer(); }
function confirmSheet({ title, body, cta, danger, onYes, typed }) {
  UI.confirm = { onYes, typed };
  openSheet(() => `<h3>${esc(title)}</h3><p class="muted" style="margin-top:6px">${esc(body)}</p>
    ${typed ? `<div style="margin-top:14px">${field("confirm-typed", t("type_to_confirm", { w: typed }), `<input class="input" id="confirm-typed" autocomplete="off">`)}</div>` : ""}
    <div class="row" style="margin-top:18px"><button class="btn secondary grow" data-act="sheet-close">${esc(t("keep"))}</button><button class="btn ${danger ? "danger" : ""} grow" data-act="confirm-yes">${esc(cta)}</button></div>`);
}
function renderLayer() {
  const layer = $("#layer");
  let html = "";
  if (UI.sheet) html += `<div class="scrim" data-act="scrim"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${UI.sheet()}</div></div>`;
  if (UI.alarm) html += alarmHtml();
  layer.innerHTML = html;
  const focusable = layer.querySelector(".alarm-card .btn, .sheet input, .sheet .btn");
  if (focusable && !layer.contains(document.activeElement)) focusable.focus({ preventScroll: true });
}
function toast(msg, ic = "check") {
  const w = $("#toasts"); const el = document.createElement("div");
  el.className = "toast"; el.setAttribute("role", "status"); el.innerHTML = `${icon(ic, "ico-sm")}<span>${esc(msg)}</span>`;
  w.appendChild(el); setTimeout(() => { el.style.transition = "opacity .3s"; el.style.opacity = "0"; setTimeout(() => el.remove(), 320); }, 2800);
}
async function copyText(txt) {
  try { await navigator.clipboard.writeText(txt); toast(t("copied")); } catch { toast(t("copy_failed"), "info"); }
}

/* ---------- master render ---------- */
function render(opts = {}) {
  const y = window.scrollY;
  const app = $("#app");
  document.body.classList.toggle("simple", !!App.profile?.simple);
  document.documentElement.setAttribute("data-size", App.profile?.simple ? "large" : "normal");
  let html;
  try { html = routeHtml(); } catch (e) { console.error(e); html = `<div class="patient-shell"><div class="empty" style="margin-top:40px">${icon("alert")}<h4>${esc(t(e.code || "err_generic"))}</h4><button class="btn" data-go="home">${esc(t("go_home"))}</button></div></div>`; }
  app.classList.toggle("entering", !!opts.scrollTop || !render.done);
  app.innerHTML = html;
  renderLayer();
  if (opts.scrollTop) window.scrollTo(0, 0); else window.scrollTo(0, y);
  armReveal();
  if (opts.scrollTop || !render.done) afterRender();
  render.done = true;
}
function armReveal() {
  if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const els = $$(".page > *, .page .reveal, .page .stack > .card").filter((el) => el.getBoundingClientRect().top > innerHeight - 20);
  const io = new IntersectionObserver((ents) => {
    let i = 0;
    ents.forEach((en) => { if (en.isIntersecting) { en.target.style.transitionDelay = (i++ * 70) + "ms"; en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
  els.forEach((el) => { el.classList.add("reveal-armed"); io.observe(el); });
}
function afterRender() {
  $$("[data-count]").forEach((el) => {
    const target = Number(el.dataset.count); if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t0 = performance.now(); const suffix = el.dataset.suffix || "";
    const step = (tt) => { const k = Math.min(1, (tt - t0) / 700); el.textContent = fmtNum(Math.round(target * (1 - Math.pow(1 - k, 3)))) + suffix; if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}
function routeHtml() {
  const u = App.user; const r = UI.route.name;
  if (!u) return ({ login: authView, signup: authView, verify: authView, forgot: authView, reset: authView, platform: platformView }[r] || authView)();
  if (u.role === "clinic") return clinicView();
  if (u.role === "patient" && !App.profile?.onboarded) return onboardingView();
  const V = PATIENT_VIEWS[r] || PATIENT_VIEWS.home;
  return V();
}

/* ---------- auth ---------- */
const DEMO_ACCOUNTS = [
  ["khalid@demo.wellpoint.om", "demo_khalid", "user"],
  ["aisha@demo.wellpoint.om", "demo_aisha", "heart"],
  ["hamed@demo.wellpoint.om", "demo_hamed", "users"],
  ["doctor@kims.demo", "demo_doctor", "stethoscope"],
  ["reception@kims.demo", "demo_reception", "calendar"],
  ["admin@kims.demo", "demo_admin", "hospital"]
];
function authView() {
  const r = UI.route.name, a = UI.auth;
  let main = "";
  if (r === "login") main = `
    <div class="stack-sm"><h1>${esc(t("welcome_back"))}</h1><p class="muted">${esc(t("login_sub"))}</p></div>
    <form data-form="login" class="stack" novalidate>
      ${field("li-id", t("email_or_phone"), inputEl("li-id", "auth.identifier", { type: "text", attrs: 'autocomplete="username" inputmode="email"', placeholder: "name@example.com / +968…" }))}
      ${field("li-pw", t("password"), `<input class="input" id="li-pw" name="password" type="password" autocomplete="current-password">`)}
      ${a.err ? `<div class="banner bad" role="alert">${icon("alert")}<span>${esc(t(a.err))}</span></div>` : ""}
      <button class="btn xl block" type="submit">${esc(t("sign_in"))}</button>
      <div class="row between"><button type="button" class="link-btn" data-go="forgot">${esc(t("forgot_pw"))}</button><button type="button" class="link-btn" data-go="signup">${esc(t("create_account"))}</button></div>
    </form>
    <div class="stack-sm"><div class="row between"><span class="eyebrow">${esc(t("demo_accounts"))}</span><span class="hint">${esc(t("demo_pw_hint"))}</span></div>
      <div class="demo-accts">${DEMO_ACCOUNTS.map(([em, k, ic]) => `<button class="demo-acct" data-act="demo-login" data-v="${em}"><span class="iconwrap">${icon(ic)}</span><span class="grow"><b>${esc(t(k))}</b><br><span class="small muted">${esc(t(k + "_d"))}</span></span>${flipIcon("chevron", "ico-sm")}</button>`).join("")}</div>
      <button class="btn ghost" data-act="reset-demo">${icon("refresh", "ico-sm")} ${esc(t("reset_demo"))}</button>
    </div>`;
  else if (r === "signup") main = `
    <div class="stack-sm"><h1>${esc(t("create_account"))}</h1><p class="muted">${esc(t("signup_sub"))}</p></div>
    <form data-form="signup" class="stack" novalidate>
      ${field("su-name", t("full_name"), inputEl("su-name", "auth.name", { attrs: 'autocomplete="name"' }))}
      ${field("su-id", t("email_or_phone"), inputEl("su-id", "auth.identifier", { attrs: 'autocomplete="username"' }), t("email_or_phone_hint"))}
      ${field("su-pw", t("password"), `<input class="input" id="su-pw" name="password" type="password" autocomplete="new-password">`, t("pw_rules"))}
      <label class="row small muted"><input type="checkbox" id="su-terms" name="terms"> <span>${esc(t("agree_terms"))} <button type="button" class="link-btn" data-act="privacy">${esc(t("privacy_policy"))}</button></span></label>
      ${a.err ? `<div class="banner bad" role="alert">${icon("alert")}<span>${esc(t(a.err))}</span></div>` : ""}
      <button class="btn xl block" type="submit">${esc(t("continue"))}</button>
      <button type="button" class="link-btn" data-go="login">${esc(t("have_account"))}</button>
    </form>`;
  else if (r === "verify") {
    const u = DB.users.find((x) => x.id === a.pending);
    main = `<div class="stack-sm"><h1>${esc(t("verify_title"))}</h1><p class="muted">${esc(t("verify_sub", { to: u?.email || u?.phone || "" }))}</p></div>
    <form data-form="verify" class="stack" novalidate>
      ${field("vf-code", t("code"), `<input class="input code-box" id="vf-code" name="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code">`)}
      ${a.err ? `<div class="banner bad" role="alert">${icon("alert")}<span>${esc(t(a.err))}</span></div>` : ""}
      <button class="btn xl block" type="submit">${esc(t("verify"))}</button>
      <div class="row between"><button type="button" class="link-btn" data-act="resend">${esc(t("resend_code"))}</button><button type="button" class="link-btn" data-act="show-outbox">${esc(t("open_outbox"))}</button></div>
      <div class="banner">${icon("info")}<span class="small">${esc(t("sim_email_note"))}</span></div>
    </form>`;
  } else if (r === "forgot") main = `
    <div class="stack-sm"><h1>${esc(t("forgot_pw"))}</h1><p class="muted">${esc(t("forgot_sub"))}</p></div>
    <form data-form="forgot" class="stack" novalidate>
      ${field("fg-id", t("email_or_phone"), inputEl("fg-id", "auth.identifier"))}
      ${a.err ? `<div class="banner bad" role="alert">${icon("alert")}<span>${esc(t(a.err))}</span></div>` : ""}
      <button class="btn xl block" type="submit">${esc(t("send_code"))}</button>
      <button type="button" class="link-btn" data-go="login">${esc(t("back_to_login"))}</button>
    </form>`;
  else if (r === "reset") main = `
    <div class="stack-sm"><h1>${esc(t("reset_pw"))}</h1><p class="muted">${esc(t("reset_sub"))}</p></div>
    <form data-form="reset" class="stack" novalidate>
      ${field("rs-code", t("code"), `<input class="input code-box" id="rs-code" name="code" inputmode="numeric" maxlength="6">`)}
      ${field("rs-pw", t("new_password"), `<input class="input" id="rs-pw" name="password" type="password" autocomplete="new-password">`, t("pw_rules"))}
      ${a.err ? `<div class="banner bad" role="alert">${icon("alert")}<span>${esc(t(a.err))}</span></div>` : ""}
      <button class="btn xl block" type="submit">${esc(t("reset_pw"))}</button>
      <button type="button" class="link-btn" data-act="show-outbox">${esc(t("open_outbox"))}</button>
    </form>`;
  return `<div class="auth">
    <aside class="auth-side">
      <span class="brand" style="color:#F4F6F9">${BRAND_SVG}<span>Wellpoint</span></span>
      <svg class="orbit" viewBox="0 0 400 400" aria-hidden="true"><g fill="none" stroke="var(--accent)" stroke-width="1.2" opacity=".55"><circle cx="200" cy="200" r="190"/><circle cx="200" cy="200" r="140" stroke-dasharray="4 8"/><circle cx="200" cy="200" r="90"/></g><circle cx="200" cy="200" r="18" fill="var(--accent)"/><circle cx="340" cy="120" r="7" fill="var(--good)"/><circle cx="90" cy="300" r="7" fill="var(--warn)"/><circle cx="110" cy="70" r="5" fill="var(--bg)"/></svg>
      <div class="stack-lg" style="position:relative"><span class="eyebrow" style="color:inherit;opacity:.7">${esc(t("tagline_alt"))}</span><h1>${esc(t("tagline"))}</h1><p class="muted" style="max-width:40ch">${esc(t("core_statement"))}</p></div>
      <div class="row small muted" style="position:relative;gap:18px">${icon("shield", "ico-sm")} ${esc(t("privacy_line"))}</div>
    </aside>
    <main class="auth-main page">
      <div class="row between wrap"><span class="brand">${BRAND_SVG}<span>Wellpoint</span></span><div class="row">${langSwitcher()}<button class="icon-btn" data-act="theme" aria-label="${esc(t("theme"))}">${icon("moon")}</button></div></div>
      ${main}
      <button class="btn ghost" data-go="platform">${icon("layers", "ico-sm")} ${esc(t("about_platform"))}</button>
    </main></div>`;
}

/* ---------- onboarding ---------- */
const OB_STEPS = ["ob_lang", "ob_about", "ob_body", "ob_place", "ob_goals", "ob_conditions", "ob_allergies", "ob_times", "ob_clinic", "ob_consent"];
const GOALS = ["general", "chronic", "medication", "fitness", "weight", "sleep", "stress", "pregnancy"];
const CONDITIONS = ["diabetes", "hypertension", "asthma", "cardio", "thyroid", "kidney", "cholesterol", "other", "none", "prefer_not"];
function onboardingView() {
  const s = UI.ob.step, d = UI.ob.data, key = OB_STEPS[s];
  const multi = (bindKey, list, prefix) => `<div class="choice-grid">${list.map((x) => `<button class="choice ${(d[bindKey] || []).includes(x) ? "on" : ""}" data-act="ob-toggle" data-k="${bindKey}" data-v="${x}" aria-pressed="${(d[bindKey] || []).includes(x)}"><span class="box">${(d[bindKey] || []).includes(x) ? icon("check", "ico-sm") : ""}</span>${esc(t(prefix + x))}</button>`).join("")}</div>`;
  let body = "";
  if (key === "ob_lang") body = `<div class="stack">${["en", "ar", "zh"].map((l) => `<button class="choice ${I18N.lang === l ? "on" : ""}" data-act="lang" data-v="${l}" style="padding:18px"><span class="box">${I18N.lang === l ? icon("check", "ico-sm") : ""}</span><span lang="${l}" style="font-size:1.05rem">${LANG_NAMES[l]}</span></button>`).join("")}</div>`;
  if (key === "ob_about") body = `<div class="stack">${field("ob-name", t("full_name"), inputEl("ob-name", "ob.data.name", { attrs: 'autocomplete="name"' }))}
    <div class="grid-2">${field("ob-dob", t("dob"), inputEl("ob-dob", "ob.data.dob", { type: "date" }))}${field("ob-gender", t("gender"), selectEl("ob-gender", "ob.data.gender", [["", t("choose")], ["male", t("male")], ["female", t("female")], ["prefer_not", t("prefer_not")]]))}</div>
    ${field("ob-nat", t("nationality_opt"), inputEl("ob-nat", "ob.data.nationality"))}</div>`;
  if (key === "ob_body") body = `<div class="grid-2">${field("ob-w", t("weight_kg"), inputEl("ob-w", "ob.data.weight", { type: "number", attrs: 'inputmode="decimal" min="1" max="400"' }))}${field("ob-h", t("height_cm"), inputEl("ob-h", "ob.data.height", { type: "number", attrs: 'inputmode="numeric" min="30" max="250"' }))}</div><p class="hint">${esc(t("ob_body_hint"))}</p>`;
  if (key === "ob_place") body = `<div class="stack">${field("ob-gov", t("governorate"), selectEl("ob-gov", "ob.data.gov", govOptions()))}
    <div class="grid-2">${field("ob-ec", t("emergency_name"), inputEl("ob-ec", "ob.data.ecName"))}${field("ob-ecp", t("emergency_phone"), inputEl("ob-ecp", "ob.data.ecPhone", { type: "tel", placeholder: "+968" }))}</div></div>`;
  if (key === "ob_goals") body = multi("goals", GOALS, "goal_");
  if (key === "ob_conditions") body = multi("conditions", CONDITIONS, "cond_") + `<p class="hint">${esc(t("ob_cond_hint"))}</p>`;
  if (key === "ob_allergies") body = `<div class="stack">${field("ob-all", t("allergies"), inputEl("ob-all", "ob.data.allergiesText", { placeholder: t("allergies_ph") }), t("comma_sep"))}
    <div class="divider"></div><h4>${esc(t("current_meds"))}</h4>
    <div class="grid-2">${field("ob-mn", t("med_name"), inputEl("ob-mn", "ob.data.medName"))}${field("ob-mf", t("frequency"), selectEl("ob-mf", "ob.data.medFreq", Object.keys(FREQ_COUNT).map((f) => [f, t("freq_" + f)])))}</div>
    <p class="hint">${esc(t("ob_med_hint"))}</p></div>`;
  if (key === "ob_times") body = `<div class="stack"><div class="grid-2">${field("ob-wake", t("wake_time"), inputEl("ob-wake", "ob.data.wake", { type: "time" }))}${field("ob-sleep", t("sleep_time"), inputEl("ob-sleep", "ob.data.sleep", { type: "time" }))}</div>
    <div class="grid-2">${field("ob-qs", t("quiet_start"), inputEl("ob-qs", "ob.data.quietStart", { type: "time" }))}${field("ob-qe", t("quiet_end"), inputEl("ob-qe", "ob.data.quietEnd", { type: "time" }))}</div><p class="hint">${esc(t("ob_times_hint"))}</p></div>`;
  if (key === "ob_clinic") body = `<div class="stack">${field("ob-pc", t("primary_clinic_opt"), selectEl("ob-pc", "ob.data.primaryClinic", [["", t("none_yet")], ...CLINICS.map((c) => [c.id, clinicName(c)])]))}
    <button class="choice ${d.caregiverWanted ? "on" : ""}" data-act="ob-flag" data-k="caregiverWanted"><span class="box">${d.caregiverWanted ? icon("check", "ico-sm") : ""}</span><span><b>${esc(t("want_caregiver"))}</b><br><span class="small muted">${esc(t("want_caregiver_d"))}</span></span></button></div>`;
  if (key === "ob_consent") body = `<div class="stack">
    ${[["shareWithClinics", "consent_clinics"], ["shareWithCaregivers", "consent_caregivers"], ["research", "consent_research"]].map(([k, l]) => `<div class="row card flat" style="padding:14px"><div class="grow"><b>${esc(t(l))}</b><p class="small muted">${esc(t(l + "_d"))}</p></div><button class="switch ${d[k] ? "on" : ""}" data-act="ob-flag" data-k="${k}" role="switch" aria-checked="${!!d[k]}" aria-label="${esc(t(l))}"></button></div>`).join("")}
    <div class="banner">${icon("shield")}<span class="small">${esc(t("consent_note"))}</span></div></div>`;
  return `<div class="ob page">
    <div class="row between"><span class="brand">${BRAND_SVG}<span>Wellpoint</span></span><span class="small faint num">${fmtNum(s + 1)} / ${fmtNum(OB_STEPS.length)}</span></div>
    <div class="steps">${OB_STEPS.map((_, i) => `<i class="${i <= s ? "on" : ""}"></i>`).join("")}</div>
    <div class="stack-sm"><span class="eyebrow">${esc(t("setup_profile"))}</span><h1>${esc(t(key))}</h1><p class="muted">${esc(t(key + "_d"))}</p></div>
    ${body}
    <div class="ob-foot">
      ${s > 0 ? `<button class="btn secondary" data-act="ob-back">${esc(t("back"))}</button>` : ""}
      ${s > 0 && s < OB_STEPS.length - 1 ? `<button class="btn secondary" data-act="ob-skip">${esc(t("skip_for_now"))}</button>` : ""}
      <button class="btn" data-act="ob-next">${esc(s === OB_STEPS.length - 1 ? t("finish") : t("continue"))}</button>
    </div></div>`;
}
function finishOnboarding() {
  const d = UI.ob.data, u = App.user, p = DB.profiles[u.id];
  Object.assign(p, {
    onboarded: true, name: d.name || u.name, dob: d.dob || "", gender: d.gender || "", nationality: d.nationality || "", weight: Number(d.weight) || null, height: Number(d.height) || null,
    gov: d.gov || "", emergency: { name: d.ecName || "", phone: d.ecPhone || "" }, goals: d.goals || [], conditions: d.conditions || [], allergies: (d.allergiesText || "").split(",").map((x) => x.trim()).filter(Boolean),
    primaryClinic: d.primaryClinic || "", caregiverWanted: !!d.caregiverWanted, consent: { shareWithClinics: !!d.shareWithClinics, shareWithCaregivers: !!d.shareWithCaregivers, research: !!d.research },
    mode: (d.conditions || []).some((c) => !["none", "prefer_not"].includes(c)) || (d.goals || []).includes("chronic") ? "chronic" : "general", simple: false, lang: I18N.lang
  });
  p.prefs.wake = d.wake || p.prefs.wake; p.prefs.sleep = d.sleep || p.prefs.sleep; p.prefs.quietStart = d.quietStart || p.prefs.quietStart; p.prefs.quietEnd = d.quietEnd || p.prefs.quietEnd;
  u.name = p.name;
  if (d.medName) {
    const sug = suggestTimes(d.medFreq || "once", "any", p.prefs);
    DB.medications.push({ id: uid("med"), patientId: u.id, name: d.medName, dose: "", frequency: d.medFreq || "once", times: sug.times, food: "any", start: today(), end: "", notes: "", doctor: "", clinic: "", source: "patient", verified: false, active: true });
  }
  DB.timeline.push({ id: uid("tl"), patientId: u.id, at: new Date().toISOString(), type: "system", msg: { k: "tl_joined" }, source: "wellpoint" });
  notify(u.id, "system", { k: "n_welcome" }, { silent: true });
  App.profile = p; saveDB(); UI.ob = { step: 0, data: {} }; go("home", {}, { replace: true });
  toast(t("profile_ready"));
}
