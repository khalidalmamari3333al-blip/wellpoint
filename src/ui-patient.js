/* ============================================================
   Patient + caregiver experience
   ============================================================ */
function PID() {
  const u = App.user; if (u.role === "patient") return u.id;
  const link = DB.caregivers.find((c) => c.caregiverUserId === u.id && c.status === "active" && DB.profiles[c.patientId]?.consent?.shareWithCaregivers);
  return link ? link.patientId : null;
}
function SCOPE() { const id = PID(); if (!id) return null; return patientScope(id); }
const allow = (k) => { const s = SCOPE(); return !!s && (s.all || !!s[k]); };
const PROF = () => DB.profiles[PID()] || {};
const isCaregiver = () => App.user.role === "caregiver";
const firstName = (n) => (n || "").split(" ")[0];
function upcomingAppts(pid) { return DB.appointments.filter((a) => a.patientId === pid && ["confirmed", "rescheduled"].includes(a.status) && (a.date > today() || (a.date === today() && a.time >= nowHM()))).sort((a, b) => (a.date + a.time > b.date + b.time ? 1 : -1)); }
function pastAppts(pid) { const up = new Set(upcomingAppts(pid).map((a) => a.id)); return DB.appointments.filter((a) => a.patientId === pid && !up.has(a.id)).sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1)); }

function shell(content, opts = {}) {
  const tabs = [["home", "home", "tab_home"], ["appointments", "calendar", "tab_s_appts"], ["meds", "pill", "tab_s_meds"], ["health", "heart", "tab_health"], ["ai", "sparkle", "tab_ai"]];
  const cur = opts.tab || UI.route.name;
  const visible = tabs.filter(([r]) => !isCaregiver() || r === "home" || r === "ai" || (r === "appointments" && allow("appts")) || (r === "meds" && allow("meds")) || (r === "health" && allow("health")));
  return `<div class="patient-shell">${content}</div>
  <div class="tabbar"><nav aria-label="${esc(t("main_nav"))}" style="grid-template-columns:repeat(${visible.length},1fr)">${visible.map(([r, ic, k]) => `<button class="tab ${cur === r ? "active" : ""}" data-go="${r}" aria-current="${cur === r ? "page" : "false"}">${icon(ic)}<span>${esc(t(k))}</span></button>`).join("")}</nav></div>`;
}
function caregiverBanner() {
  if (!isCaregiver()) return "";
  const pid = PID();
  if (!pid) return "";
  return `<div class="banner">${icon("users")}<span class="small">${esc(t("cg_viewing", { name: firstName(DB.profiles[pid].name) }))}</span></div>`;
}

/* ---------- HOME ---------- */
function greetingKey() { const h = new Date().getHours(); return h < 12 ? "good_morning" : h < 17 ? "good_afternoon" : "good_evening"; }
function oneThing(pid) {
  const p = DB.profiles[pid];
  const lastCi = DB.checkins.filter((c) => c.patientId === pid).sort((a, b) => (a.at < b.at ? 1 : -1))[0];
  if (lastCi && lastCi.level !== "green" && daysBetween(lastCi.at.slice(0, 10), today()) <= 2 && !lastCi.resolved) return { key: "focus_followup", act: "book-followup", cta: "book_followup", reasons: [{ k: "why_recent_amber" }], clinical: true };
  const y = scheduleFor(pid, addDays(today(), -1)); const missedY = y.filter((i) => i.status === "missed").length;
  if (missedY) return { key: "focus_meds", p: { n: missedY }, go: "meds", cta: "open_meds", reasons: [{ k: "why_missed_yesterday", p: { n: missedY } }, { k: "why_no_dose_advice" }] };
  const fr = freshness(pid).rows.find((r) => r.key === "fr_checkin");
  if ((p.mode === "chronic") && (fr?.days == null || fr.days >= 3)) return { key: "focus_checkin", go: "checkin", cta: "check_in_now", reasons: [{ k: "why_stale", p: { d: fr?.days ?? "—" } }, { k: "why_stale_not_worse" }] };
  const sl = DB.measurements.filter((m) => m.patientId === pid && m.type === "sleep").slice(-7);
  const avg = sl.length ? sl.reduce((a, b) => a + b.value, 0) / sl.length : null;
  const poor = DB.journal.filter((j) => j.patientId === pid && j.tags.includes("poor_sleep") && daysBetween(j.at.slice(0, 10), today()) <= 7).length;
  if (avg != null && avg < 7) return { key: "focus_sleep", p: { h: fmtNum(avg, { maximumFractionDigits: 1 }) }, go: "summary", cta: "see_week", reasons: [{ k: "why_sleep_avg", p: { h: fmtNum(avg, { maximumFractionDigits: 1 }) } }, ...(poor ? [{ k: "why_sleep_journal", p: { n: poor } }] : []), { k: "why_wellness_only" }] };
  const next = upcomingAppts(pid)[0];
  if (next && daysBetween(today(), next.date) <= 3) return { key: "focus_prepare", go: "ai", cta: "prepare_questions", reasons: [{ k: "why_appt_soon" }] };
  return { key: "focus_walk", go: "journal", cta: "open_journal", reasons: [{ k: "why_default_focus" }, { k: "why_wellness_only" }] };
}
function homeView() {
  const pid = PID();
  if (isCaregiver() && !pid) return shell(`${header("")}<div class="page stack-lg">${emptyState("users", t("cg_none"), t("cg_none_d"))}</div>`, { tab: "home" });
  const p = DB.profiles[pid]; const me = DB.profiles[App.user.id];
  const next = allow("appts") ? upcomingAppts(pid)[0] : null;
  const sched = allow("meds") ? scheduleFor(pid) : [];
  const due = sched.find((i) => i.status === "due") || sched.find((i) => i.status === "missed");
  const fr = allow("health") ? freshness(pid) : null;
  const stale = fr?.rows.find((r) => r.key === "fr_checkin");
  const focus = allow("health") || !isCaregiver() ? oneThing(pid) : null;
  const todayCi = DB.checkins.find((c) => c.patientId === pid && c.at.slice(0, 10) === today());
  const chronic = p.mode === "chronic";
  const latest = DB.timeline.filter((x) => x.patientId === pid).sort((a, b) => (a.at < b.at ? 1 : -1))[0];
  const taken = sched.filter((i) => i.status === "taken").length;

  const moodBlock = isCaregiver() ? "" : `<section class="card stack">
    <div class="row between"><h3>${esc(t("how_feeling"))}</h3>${todayCi ? `<span class="pill good">${esc(t("checked_in"))}</span>` : ""}</div>
    <div class="mood">${[["good", "mood_great", "M8 14.5c1.1 1.5 2.4 2.2 4 2.2s2.9-.7 4-2.2"], ["same", "mood_okay", "M8.5 15h7"], ["worse", "mood_unwell", "M8 16.5c1.1-1.5 2.4-2.2 4-2.2s2.9.7 4 2.2"]].map(([v, k, mouth]) => `<button data-act="mood" data-v="${v}" class="${todayCi?.mood === v ? "on" : ""}"><svg class="face" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9 9.5h.01M15 9.5h.01" stroke-width="2.4"/><path d="${mouth}"/></svg>${esc(t(k))}</button>`).join("")}</div>
  </section>`;

  const staleCard = focus?.key !== "focus_checkin" && chronic && stale && (stale.days == null || stale.days >= 3) && !todayCi ? `<section class="banner warn reveal">${icon("heart")}<div class="grow stack-sm"><b>${esc(t("stale_prompt"))}</b><span class="small">${esc(t("stale_prompt_d", { d: stale.days ?? "—" }))}</span><div><button class="btn sm" data-go="checkin">${esc(t("check_in_now"))}</button></div></div></section>` : "";

  const nextCard = allow("appts") ? `<button class="card tap stack reveal" data-act="${next ? "appt-open" : "noop"}" data-id="${next?.id || ""}" ${next ? "" : 'tabindex="-1"'}>
    <div class="row between"><span class="eyebrow">${esc(t("next_appt"))}</span>${next ? statusPill(next.status) : ""}</div>
    ${next ? `<div class="row"><div class="iconwrap">${icon("calendar")}</div><div class="grow"><h3>${esc(fmtDate(next.date, { weekday: "long", day: "numeric", month: "long" }))} · ${esc(fmtTime(next.time))}</h3><p class="small muted">${esc(doctorName(DOCTORS.find((d) => d.id === next.doctorId)))} · ${esc(t("sp_" + next.specialty))}</p><p class="small faint">${esc(clinicName(CLINICS.find((c) => c.id === next.clinicId)))}</p></div></div>`
      : `<p class="muted">${esc(t("no_upcoming"))}</p><span class="btn sm secondary" data-go="discover" style="align-self:flex-start">${icon("search", "ico-sm")} ${esc(t("find_clinic"))}</span>`}
  </button>` : "";

  const medCard = allow("meds") ? `<section class="card stack reveal">
    <div class="row between"><span class="eyebrow">${esc(t("med_due_next"))}</span><button class="link-btn" data-go="meds">${esc(t("see_all"))}</button></div>
    ${sched.length ? `<div class="row"><div class="ring" style="--p:${Math.round((taken / sched.length) * 100)}"><span>${fmtNum(taken)}/${fmtNum(sched.length)}</span></div>
      <div class="grow">${due ? `<h3>${esc(due.med.name)}</h3><p class="small muted">${due.status === "missed" ? `<span class="pill bad">${esc(t("missed"))}</span> ` : ""}${esc(fmtTime(due.time))} · ${esc(due.med.dose || "")} · ${esc(t("food_" + due.med.food))}</p>` : `<h3>${esc(t("all_done_today"))}</h3><p class="small muted">${esc(t("all_done_today_d"))}</p>`}</div>
      ${due ? `<button class="btn sm good" data-act="dose" data-med="${due.med.id}" data-time="${due.time}" data-s="taken">${icon("check", "ico-sm")} ${esc(t("taken"))}</button>` : ""}</div>`
      : `<p class="muted">${esc(t("no_meds"))}</p><div><button class="btn sm secondary" data-go="med-edit">${icon("plus", "ico-sm")} ${esc(t("add_first_med"))}</button></div>`}
  </section>` : "";

  const focusCard = focus ? `<section class="card stack reveal" style="background:var(--accent-soft);border-color:transparent;box-shadow:none">
    <div class="row between"><span class="eyebrow" style="color:var(--accent)">${esc(t("one_thing"))}</span>${focus.clinical ? "" : `<span class="pill plain">${esc(t("wellness_guidance"))}</span>`}</div>
    <h3>${esc(t(focus.key, focus.p))}</h3>
    <div><button class="btn sm" ${focus.go ? `data-go="${focus.go}"` : `data-act="${focus.act}"`}>${esc(t(focus.cta))}</button></div>
    ${whyBlock(focus.reasons)}
  </section>` : "";

  const tasks = [];
  if (allow("health") && chronic && fr?.next) tasks.push(["calendar", t("task_followup", { date: fmtDate(fr.next.date) }), "appointments"]);
  if (!isCaregiver() && !p.emergency?.phone) tasks.push(["phone", t("task_emergency"), "profile-edit"]);
  if (!isCaregiver() && p.caregiverWanted && !DB.caregivers.some((c) => c.patientId === pid && c.status !== "removed")) tasks.push(["users", t("task_caregiver"), "caregiver"]);
  if (allow("health") && chronic && !DB.measurements.some((m) => m.patientId === pid && m.type === "bp" && daysBetween(m.at.slice(0, 10), today()) < 7) && (p.conditions || []).includes("hypertension")) tasks.push(["activity", t("task_bp"), "measure"]);
  if (!isCaregiver() && p.mode !== "chronic" && !(p.goals || []).length) tasks.push(["sparkle", t("task_goals"), "profile-edit"]);

  const taskCard = tasks.length ? `<section class="card stack reveal"><span class="eyebrow">${esc(t("upcoming_tasks"))}</span><div class="list">${tasks.map(([ic, txt, r]) => `<button class="li" data-go="${r}" style="background:none;border-left:0;border-right:0;border-top:0;text-align:start;color:inherit;width:100%"><span class="iconwrap">${icon(ic)}</span><span class="grow">${esc(txt)}</span>${flipIcon("chevron", "ico-sm")}</button>`).join("")}</div></section>` : "";

  const recentCard = latest && allow("health") ? `<button class="card tap row reveal" data-go="timeline"><div class="iconwrap good">${icon("activity")}</div><div class="grow"><span class="eyebrow">${esc(t("recent_update"))}</span><p style="margin-top:2px">${esc(tx(latest.msg))}</p><p class="xs faint">${esc(relDays(latest.at))} · ${esc(t("src_" + latest.source))}</p></div>${flipIcon("chevron", "ico-sm")}</button>` : "";

  const findCare = `<section class="card stack reveal hide-simple">
    <span class="eyebrow">${esc(t("find_care"))}</span><h3>${esc(t("where_care"))}</h3>
    <div class="grid-2">${selectEl("home-gov", "disc.gov", govOptions())}${selectEl("home-spec", "disc.spec", specOptions())}</div>
    <button class="btn block" data-act="find-care">${icon("search", "ico-sm")} ${esc(t("find_care"))}</button>
  </section>`;

  const aiCard = `<button class="card tap row reveal" data-go="ai"><div class="iconwrap">${icon("sparkle")}</div><div class="grow"><b>${esc(t("ask_ai"))}</b><p class="small muted">${esc(t(chronic ? "ai_hint_chronic" : "ai_hint_general"))}</p></div>${flipIcon("chevron", "ico-sm")}</button>`;

  const quiet = `<div class="quiet-links">${allow("appts") ? `<button class="quiet-link" data-go="discover">${icon("search", "ico-sm")}<span>${esc(t("find_care"))}</span>${flipIcon("chevron", "ico-sm")}</button>` : ""}<button class="quiet-link" data-go="ai">${icon("sparkle", "ico-sm")}<span>${esc(t("ask_ai"))}</span>${flipIcon("chevron", "ico-sm")}</button>${tasks.length ? `<button class="quiet-link" data-go="${tasks[0][2]}">${icon(tasks[0][0], "ico-sm")}<span>${esc(tasks[0][1])}</span>${flipIcon("chevron", "ico-sm")}</button>` : ""}</div>`;
  const order = chronic ? [staleCard, medCard, nextCard, focusCard, quiet] : [nextCard, medCard, focusCard, quiet];
  const name = isCaregiver() ? firstName(me.name || App.user.name) : firstName(p.name);
  return shell(`${header("")}
  <div class="page stack-lg">
    <div class="hero-greet stack-sm"><span class="small muted">${esc(fmtDate(today(), { weekday: "long", day: "numeric", month: "long" }))}</span><h1>${esc(t(greetingKey(), { name }))}</h1></div>
    ${caregiverBanner()}
    ${isCaregiver() ? caregiverHomeExtra(pid) : moodBlock}
    ${isCaregiver() ? "" : wellbeingHero(pid)}
    <span class="eyebrow">${esc(t("today_overview"))}</span>
    ${order.filter(Boolean).join("")}
  </div>`, { tab: "home" });
}
function caregiverHomeExtra(pid) {
  const p = DB.profiles[pid]; const perms = caregiverLink(pid);
  const lastCi = DB.checkins.filter((c) => c.patientId === pid).sort((a, b) => (a.at < b.at ? 1 : -1))[0];
  return `<section class="card stack"><div class="row"><div class="avatar lg">${esc(initials(p.name))}</div><div class="grow"><h3>${esc(p.name)}</h3><p class="small muted">${esc(t("cg_you_can"))}: ${Object.entries(perms).filter(([, v]) => v).map(([k]) => t("perm_" + k)).join(" · ")}</p></div></div>
    ${perms.health ? `<div class="banner ${lastCi && daysBetween(lastCi.at.slice(0, 10), today()) >= 3 ? "warn" : "good"}">${icon("heart")}<span class="small">${esc(lastCi ? t("cg_last_checkin", { when: relDays(lastCi.at), mood: t("mood_" + lastCi.mood) }) : t("cg_no_checkin"))}</span></div>
    <div class="row wrap"><button class="btn sm" data-go="checkin">${esc(t("cg_checkin_for", { name: firstName(p.name) }))}</button><button class="btn sm secondary" data-go="measure">${esc(t("add_measurement"))}</button></div>` : ""}
  </section>`;
}

/* ---------- DISCOVERY ---------- */
function filterResults() {
  const { gov, spec, q, filters: f } = UI.disc; const qq = q.trim().toLowerCase();
  const clinics = CLINICS.filter((c) => (!gov || c.gov === gov) && (!spec || c.specialties.includes(spec)) && (!f.type || c.type === f.type) && (!f.area || c.area === f.area));
  let docs = DOCTORS.filter((d) => clinics.some((c) => c.id === d.clinicId) && (!spec || d.specialty === spec) && (!f.gender || d.gender === f.gender) && (!f.lang || d.langs.includes(f.lang)) && (!f.price || (f.price === "low" ? d.fee <= 15 : f.price === "mid" ? d.fee > 15 && d.fee <= 25 : d.fee > 25)));
  if (f.avail) docs = docs.filter((d) => { const n = nextAvailable(d, today(), f.avail === "today" ? 1 : 7); return !!n; });
  const match = (s) => !qq || s.toLowerCase().includes(qq);
  let cl = clinics.filter((c) => match(c.name) || match(c.nameAr) || c.specialties.some((s) => match(t("sp_" + s))) || docs.some((d) => d.clinicId === c.id && (match(d.name) || match(d.nameAr))) || match(c.area));
  if (f.gender || f.lang || f.price || f.avail) cl = cl.filter((c) => docs.some((d) => d.clinicId === c.id));
  const dl = docs.filter((d) => match(d.name) || match(d.nameAr) || match(t("sp_" + d.specialty)) || match(CLINICS.find((c) => c.id === d.clinicId).name));
  return { clinics: cl, doctors: dl };
}
function clinicCard(c) {
  const docs = DOCTORS.filter((d) => d.clinicId === c.id);
  const nx = docs.map((d) => nextAvailable(d)).filter(Boolean).sort((a, b) => (a.date + a.time > b.date + b.time ? 1 : -1))[0];
  return `<button class="card tap stack reveal" data-go="clinic" data-id="${c.id}" style="padding:12px">
    ${clinicArt(c)}
    <div class="row-top" style="padding:0 4px"><div class="grow"><h3>${esc(clinicName(c))}</h3><p class="small muted">${icon("pin", "ico-sm")} ${esc(c.area)} · ${esc(t("gov_" + c.gov))}</p></div>${stars(demoRating(c))}</div>
    <div class="chips" style="padding:0 4px">${c.specialties.slice(0, 4).map((s) => `<span class="pill plain">${esc(t("sp_" + s))}</span>`).join("")}${c.specialties.length > 4 ? `<span class="pill plain">+${fmtNum(c.specialties.length - 4)}</span>` : ""}</div>
    ${nx ? `<p class="small" style="padding:0 4px"><span class="pill good">${esc(t("next_slot"))}</span> ${esc(fmtDate(nx.date))} · ${esc(fmtTime(nx.time))}</p>` : ""}
  </button>`;
}
function doctorCard(d, compact) {
  const c = CLINICS.find((x) => x.id === d.clinicId); const nx = nextAvailable(d);
  const slots = nx ? doctorSlots(d, nx.date).slice(0, 4) : [];
  return `<div class="card stack reveal" style="padding:14px">
    <div class="row"><div class="avatar">${esc(initials(d.name))}</div><div class="grow"><div class="row wrap" style="gap:6px"><h4>${esc(doctorName(d))}</h4>${demoTag("demo_profile")}</div><p class="small muted">${esc(t("sp_" + d.specialty))} · ${esc(t("years_exp", { n: fmtNum(d.years) }))}</p>${compact ? "" : `<p class="xs faint">${esc(clinicName(c))}</p>`}</div></div>
    <p class="xs muted">${icon("globe", "ico-sm")} ${d.langs.map((l) => LANG_NAMES[l]).join(" · ")} · ${esc(t("fee_from", { v: fmtNum(d.fee) }))}</p>
    ${nx ? `<div class="stack-sm"><span class="xs faint">${esc(fmtDate(nx.date, { weekday: "long", day: "numeric", month: "short" }))}</span><div class="slots">${slots.map((s) => `<button class="slot" data-act="quick-book" data-doc="${d.id}" data-date="${nx.date}" data-time="${s}">${esc(fmtTime(s))}</button>`).join("")}</div></div>` : `<p class="small muted">${esc(t("no_slots_2w"))}</p>`}
    <div class="row"><button class="btn sm secondary grow" data-act="doctor-open" data-id="${d.id}">${esc(t("view_profile"))}</button><button class="btn sm grow" data-act="book-doc" data-id="${d.id}">${esc(t("book"))}</button></div>
  </div>`;
}
function resultsHtml() {
  const { clinics, doctors } = filterResults();
  const gov = UI.disc.gov;
  if (!clinics.length && !doctors.length) {
    const noGov = gov && !CLINICS.some((c) => c.gov === gov);
    return emptyState("search", noGov ? t("no_verified_in_gov", { gov: t("gov_" + gov) }) : t("no_results"), noGov ? t("no_verified_in_gov_d") : t("no_results_d"), `<button class="btn sm secondary" data-act="clear-filters">${esc(t("clear_filters"))}</button>`);
  }
  return `<div class="stack"><div class="row between"><h3>${esc(t("clinics"))} <span class="faint num">${fmtNum(clinics.length)}</span></h3></div>${clinics.slice(0, UI.disc.more ? 99 : 6).map(clinicCard).join("")}${!UI.disc.more && clinics.length > 6 ? `<button class="btn secondary" data-act="disc-more">${esc(t("see_all"))} · ${fmtNum(clinics.length)}</button>` : ""}</div>
  <div class="stack"><h3>${esc(t("doctors"))} <span class="faint num">${fmtNum(doctors.length)}</span></h3>${doctors.slice(0, UI.disc.more ? 30 : 4).map((d) => doctorCard(d)).join("") || `<p class="muted small">${esc(t("no_results"))}</p>`}</div>`;
}
function discoverView() {
  const d = UI.disc; const activeF = Object.values(d.filters).filter(Boolean).length;
  return shell(`${header(t("find_care"), { back: true })}
  <div class="page stack-lg">
    <div class="stack-sm"><h1>${esc(t("where_care"))}</h1><p class="muted">${esc(t("discover_sub"))}</p></div>
    <div class="grid-2">${field("disc-gov", t("governorate"), selectEl("disc-gov", "disc.gov", govOptions(true), { attrs: 'data-rerender="1"' }))}${field("disc-spec", t("specialty"), selectEl("disc-spec", "disc.spec", specOptions(true), { attrs: 'data-rerender="1"' }))}</div>
    <div class="row"><div class="search grow">${icon("search")}<input class="input" id="disc-q" data-bind="disc.q" data-live="results" value="${esc(d.q)}" placeholder="${esc(t("search_ph"))}" type="search"></div><button class="icon-btn" data-act="filters" aria-label="${esc(t("filters"))}" style="width:46px;height:46px">${icon("filter")}${activeF ? `<span class="dot-badge num">${activeF}</span>` : ""}</button></div>
    <p class="hint">${icon("info", "ico-sm")} ${esc(t("directory_note"))}</p>
    <div id="results" class="stack-lg">${resultsHtml()}</div>
  </div>`, { tab: "appointments" });
}
function filtersSheet() {
  const f = UI.disc.filters;
  const areas = [...new Set(CLINICS.filter((c) => !UI.disc.gov || c.gov === UI.disc.gov).map((c) => c.area))];
  return `<h3>${esc(t("filters"))}</h3><div class="stack" style="margin-top:14px">
    ${field("f-area", t("area"), selectEl("f-area", "disc.filters.area", [["", t("any")], ...areas.map((a) => [a, a])]))}
    <div class="grid-2">${field("f-gender", t("doctor_gender"), selectEl("f-gender", "disc.filters.gender", [["", t("any")], ["f", t("female")], ["m", t("male")]]))}
    ${field("f-avail", t("availability"), selectEl("f-avail", "disc.filters.avail", [["", t("any")], ["today", t("today")], ["week", t("this_week")]]))}</div>
    <div class="grid-2">${field("f-lang", t("language"), selectEl("f-lang", "disc.filters.lang", [["", t("any")], ...Object.entries(LANG_NAMES).map(([k, v]) => [k, v])]))}
    ${field("f-price", t("price_range"), selectEl("f-price", "disc.filters.price", [["", t("any")], ["low", t("price_low")], ["mid", t("price_mid")], ["high", t("price_high")]]))}</div>
    ${field("f-type", t("facility_type"), selectEl("f-type", "disc.filters.type", [["", t("any")], ["hospital", t("type_hospital")], ["polyclinic", t("type_polyclinic")], ["medical_centre", t("type_medical_centre")]]))}
    ${field("f-ins", t("insurance"), `<select class="input" id="f-ins" disabled><option>${esc(t("insurance_unverified"))}</option></select>`, t("insurance_note"))}
    <div class="row"><button class="btn secondary grow" data-act="clear-filters">${esc(t("clear_filters"))}</button><button class="btn grow" data-act="apply-filters">${esc(t("show_results"))}</button></div>
  </div>`;
}

/* ---------- CLINIC PROFILE ---------- */
function clinicProfileView() {
  const c = CLINICS.find((x) => x.id === UI.route.params.id); if (!c) return shell(emptyState("hospital", t("not_found")));
  const ed = DB.clinicEdits[c.id] || {};
  const docs = DOCTORS.filter((d) => d.clinicId === c.id);
  const ver = (k) => c.verified.includes(k);
  const services = [...new Set(c.specialties.flatMap((s) => SERVICES[s] || []))];
  const mapUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(c.name + ", " + c.area + ", Oman");
  return shell(`${header(clinicName(c), { back: true })}
  <div class="page stack-lg">
    ${clinicArt(c, true)}
    <div class="stack-sm"><div class="row wrap between"><span class="eyebrow">${esc(t("type_" + c.type))} · ${esc(t("gov_" + c.gov))}</span>${stars(demoRating(c))}</div>
      <h1>${esc(clinicName(c))}</h1>${I18N.lang !== "ar" ? `<p class="muted" lang="ar" dir="rtl" style="text-align:start">${esc(c.nameAr)}</p>` : `<p class="muted" lang="en" dir="ltr">${esc(c.name)}</p>`}
      <p class="xs faint">${esc(t("rating_demo"))}</p></div>
    <button class="btn block" data-act="book-clinic" data-id="${c.id}">${icon("calendar", "ico-sm")} ${esc(t("book_appt"))}</button>
    <div class="grid-3">
      <a class="btn secondary sm" href="${mapUrl}" target="_blank" rel="noopener">${icon("pin", "ico-sm")} ${esc(t("directions"))}</a>
      <button class="btn secondary sm" data-act="call" data-v="${esc(c.phone)}">${icon("phone", "ico-sm")} ${esc(t("call"))}</button>
      ${c.website ? `<a class="btn secondary sm" href="${c.website}" target="_blank" rel="noopener">${icon("globe", "ico-sm")} ${esc(t("website"))}</a>` : `<button class="btn secondary sm" disabled>${icon("globe", "ico-sm")} ${esc(t("website"))}</button>`}
    </div>
    <section class="card stack"><h3>${esc(t("details"))}</h3><dl class="kv">
      <dt>${esc(t("location"))}</dt><dd>${esc(c.area)}, ${esc(t("gov_" + c.gov))} ${ver("area") ? `<span class="pill good">${esc(t("verified"))}</span>` : ""}</dd>
      <dt>${esc(t("phone"))}</dt><dd class="num">${c.phone ? esc(c.phone) + ` <span class="pill good">${esc(t("verified"))}</span>` : `<span class="faint">${esc(t("not_verified_yet"))}</span>`}</dd>
      <dt>${esc(t("opening_hours"))}</dt><dd>${esc(ed.hours || t("hours_demo"))} ${ed.hours ? "" : demoTag()}</dd>
      <dt>${esc(t("insurance"))}</dt><dd>${esc(t("insurance_confirm"))}</dd>
      <dt>${esc(t("accreditation"))}</dt><dd>${esc(t("accreditation_unverified"))}</dd>
    </dl></section>
    <section class="stack"><h3>${esc(t("about"))}</h3><p class="muted">${esc(ed.about || (c.aboutKey ? t(c.aboutKey) : t("about_missing")))}</p></section>
    <section class="stack"><h3>${esc(t("specialties"))}</h3><div class="chips">${c.specialties.map((s) => `<span class="chip sm">${esc(t("sp_" + s))}</span>`).join("")}</div></section>
    <section class="stack"><div class="row between"><h3>${esc(t("services"))}</h3>${demoTag()}</div><div class="chips">${services.map((s) => `<span class="pill plain">${esc(t("svc_" + s))}</span>`).join("")}</div></section>
    <section class="stack"><h3>${esc(t("doctors"))}</h3>${docs.map((d) => doctorCard(d, true)).join("")}</section>
    <p class="xs faint">${esc(t("source"))}: ${esc(c.source)}. ${esc(t("verified_fields"))}: ${c.verified.map((v) => t("vf_" + v)).join(", ")}. ${esc(t("directory_note"))}</p>
  </div>`, { tab: "appointments" });
}
const SERVICES = { general: ["consult", "checkup"], family: ["consult", "vaccines"], internal: ["chronic", "consult"], cardiology: ["ecg", "echo"], endocrinology: ["diabetes", "thyroid"], dermatology: ["skin"], dentistry: ["cleaning", "ortho"], pediatrics: ["vaccines", "child"], orthopedics: ["xray", "sports"], ent: ["hearing"], ophthalmology: ["eye"], gynecology: ["antenatal"], urology: ["uro"], neurology: ["neuro"], psychiatry: ["mental"], physiotherapy: ["rehab"], gastro: ["endoscopy"] };
function doctorSheet(d) {
  const c = CLINICS.find((x) => x.id === d.clinicId);
  return `<div class="stack"><div class="row"><div class="avatar lg">${esc(initials(d.name))}</div><div class="grow"><h3>${esc(doctorName(d))}</h3><p class="small muted">${esc(t("sp_" + d.specialty))}</p>${demoTag("demo_profile")}</div></div>
  <div class="banner warn">${icon("info")}<span class="small">${esc(t("demo_doctor_note"))}</span></div>
  <dl class="kv"><dt>${esc(t("clinic"))}</dt><dd>${esc(clinicName(c))}</dd><dt>${esc(t("experience"))}</dt><dd>${esc(t("years_exp", { n: fmtNum(d.years) }))}</dd><dt>${esc(t("languages"))}</dt><dd>${d.langs.map((l) => LANG_NAMES[l]).join(", ")}</dd><dt>${esc(t("consult_fee"))}</dt><dd>${esc(t("fee_from", { v: fmtNum(d.fee) }))}</dd><dt>${esc(t("sessions"))}</dt><dd>${d.days.map((x) => fmtDate(isoDate(new Date(2024, 8, 1 + x)), { weekday: "short" })).join(" · ")} · ${esc(fmtTime(minToHm(d.hours[0] * 60)))}–${esc(fmtTime(minToHm(d.hours[1] * 60)))}</dd></dl>
  <button class="btn block" data-act="book-doc" data-id="${d.id}">${esc(t("book"))}</button></div>`;
}

/* ---------- BOOKING WIZARD ---------- */
function bookView() {
  const b = UI.bk; if (!b) { go("discover", {}, { replace: true }); return ""; }
  const steps = ["bk_clinic", "bk_specialty", "bk_doctor", "bk_time", "bk_confirm"];
  const c = CLINICS.find((x) => x.id === b.clinicId), d = DOCTORS.find((x) => x.id === b.doctorId);
  let body = "";
  if (b.step === 0) body = `<div class="stack">${field("bk-gov", t("governorate"), selectEl("bk-gov", "bk.gov", govOptions(true), { attrs: 'data-rerender="1"' }))}
    ${CLINICS.filter((x) => !b.gov || x.gov === b.gov).map((x) => `<button class="choice ${b.clinicId === x.id ? "on" : ""}" data-act="bk-set" data-k="clinicId" data-v="${x.id}"><span class="iconwrap">${icon("hospital")}</span><span class="grow"><b>${esc(clinicName(x))}</b><br><span class="small muted">${esc(x.area)} · ${esc(t("gov_" + x.gov))}</span></span></button>`).join("")}</div>`;
  if (b.step === 1) body = `<div class="choice-grid">${c.specialties.map((s) => `<button class="choice ${b.specialty === s ? "on" : ""}" data-act="bk-set" data-k="specialty" data-v="${s}">${esc(t("sp_" + s))}</button>`).join("")}</div>`;
  if (b.step === 2) {
    const docs = DOCTORS.filter((x) => x.clinicId === b.clinicId && x.specialty === b.specialty);
    body = docs.length ? `<div class="stack">${docs.map((x) => { const nx = nextAvailable(x); return `<button class="choice ${b.doctorId === x.id ? "on" : ""}" data-act="bk-set" data-k="doctorId" data-v="${x.id}"><span class="avatar">${esc(initials(x.name))}</span><span class="grow"><b>${esc(doctorName(x))}</b> ${demoTag("demo_profile")}<br><span class="small muted">${esc(t("years_exp", { n: fmtNum(x.years) }))} · ${x.langs.map((l) => LANG_NAMES[l]).join(", ")}</span><br><span class="xs faint">${nx ? esc(t("next_slot")) + ": " + esc(fmtDate(nx.date)) + " " + esc(fmtTime(nx.time)) : esc(t("no_slots_2w"))}</span></span></button>`; }).join("")}</div>`
      : emptyState("stethoscope", t("no_doctor_spec"), t("no_doctor_spec_d"), `<button class="btn sm secondary" data-act="bk-step" data-v="1">${esc(t("choose_other_spec"))}</button>`);
  }
  if (b.step === 3) {
    const days = Array.from({ length: 14 }, (_, i) => addDays(today(), i));
    if (!b.date) b.date = days.find((x) => doctorSlots(d, x).length) || days[0];
    const slots = doctorSlots(d, b.date);
    body = `<div class="stack"><div class="days">${days.map((x) => { const n = doctorSlots(d, x).length; return `<button class="day ${b.date === x ? "on" : ""}" data-act="bk-date" data-v="${x}" ${n ? "" : "disabled"}><span>${esc(fmtDate(x, { weekday: "short" }))}</span><b>${esc(fmtDate(x, { day: "numeric" }))}</b><span>${esc(fmtDate(x, { month: "short" }))}</span></button>`; }).join("")}</div>
      ${slots.length ? `<div class="slots">${slots.map((s) => `<button class="slot ${b.time === s ? "on" : ""}" data-act="bk-set" data-k="time" data-v="${s}">${esc(fmtTime(s))}</button>`).join("")}</div>` : `<p class="muted">${esc(t("no_slots_day"))}</p>`}
      ${field("bk-type", t("appt_type"), selectEl("bk-type", "bk.type", [["in_person", t("at_in_person")], ["follow_up", t("at_follow_up")], ["teleconsult", t("at_teleconsult")]]))}
      ${field("bk-notes", t("notes_for_clinic"), `<textarea class="input" id="bk-notes" data-bind="bk.notes" placeholder="${esc(t("notes_ph"))}">${esc(b.notes || "")}</textarea>`)}</div>`;
  }
  if (b.step === 4) body = `<section class="card stack"><dl class="kv">
      <dt>${esc(t("clinic"))}</dt><dd>${esc(clinicName(c))}</dd><dt>${esc(t("doctor"))}</dt><dd>${esc(doctorName(d))}</dd><dt>${esc(t("specialty"))}</dt><dd>${esc(t("sp_" + b.specialty))}</dd>
      <dt>${esc(t("date"))}</dt><dd>${esc(fmtDate(b.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" }))}</dd><dt>${esc(t("time"))}</dt><dd>${esc(fmtTime(b.time))}</dd>
      <dt>${esc(t("appt_type"))}</dt><dd>${esc(t("at_" + b.type))}</dd><dt>${esc(t("location"))}</dt><dd>${esc(c.area)}, ${esc(t("gov_" + c.gov))}</dd>${b.notes ? `<dt>${esc(t("notes"))}</dt><dd>${esc(b.notes)}</dd>` : ""}</dl></section>
    <div class="banner">${icon("shield")}<span class="small">${esc(PROF().consent?.shareWithClinics ? t("bk_share_yes") : t("bk_share_no"))}</span></div>
    <div class="banner warn">${icon("info")}<span class="small">${esc(t("bk_demo_note"))}</span></div>`;
  const canNext = [!!b.clinicId, !!b.specialty, !!b.doctorId, !!b.time, true][b.step];
  return shell(`${header(b.rescheduleId ? t("reschedule") : t("book_appt"), { back: true })}
  <div class="page stack-lg">
    <div class="steps">${steps.map((_, i) => `<i class="${i <= b.step ? "on" : ""}"></i>`).join("")}</div>
    <div class="stack-sm"><span class="eyebrow">${esc(t("step_of", { a: fmtNum(b.step + 1), b: fmtNum(steps.length) }))}</span><h2>${esc(t(steps[b.step]))}</h2>${c && b.step > 0 ? `<p class="small muted">${esc(clinicName(c))}${d && b.step > 2 ? " · " + esc(doctorName(d)) : ""}</p>` : ""}</div>
    ${body}
    <div class="row">${b.step > (b.minStep || 0) ? `<button class="btn secondary grow" data-act="bk-step" data-v="${b.step - 1}">${esc(t("back"))}</button>` : ""}
      ${b.step < 4 ? `<button class="btn grow" data-act="bk-step" data-v="${b.step + 1}" ${canNext ? "" : "disabled"}>${esc(t("continue"))}</button>` : `<button class="btn grow good" data-act="bk-confirm">${icon("check", "ico-sm")} ${esc(b.rescheduleId ? t("confirm_reschedule") : t("confirm_booking"))}</button>`}</div>
  </div>`, { tab: "appointments" });
}
function startBooking(o = {}) {
  UI.bk = { step: 0, gov: UI.disc.gov || PROF().gov || "", clinicId: "", specialty: UI.disc.spec || "", doctorId: "", date: "", time: "", type: "in_person", notes: "", ...o };
  const b = UI.bk;
  if (b.doctorId) { const d = DOCTORS.find((x) => x.id === b.doctorId); b.clinicId = d.clinicId; b.specialty = d.specialty; b.step = 3; b.minStep = 3; }
  else if (b.clinicId) { const c = CLINICS.find((x) => x.id === b.clinicId); if (!c.specialties.includes(b.specialty)) b.specialty = ""; b.step = 1; b.minStep = 1; }
  go("book");
}
function confirmBooking() {
  const b = UI.bk, pid = PID(), c = CLINICS.find((x) => x.id === b.clinicId);
  if (!doctorSlots(DOCTORS.find((x) => x.id === b.doctorId), b.date).includes(b.time)) { toast(t("slot_taken"), "alert"); b.time = ""; b.step = 3; render(); return; }
  let apt;
  if (b.rescheduleId) {
    apt = DB.appointments.find((a) => a.id === b.rescheduleId);
    const old = `${apt.date} ${apt.time}`;
    Object.assign(apt, { date: b.date, time: b.time, doctorId: b.doctorId, status: "rescheduled", type: b.type, notes: b.notes }); apt.history.push({ at: new Date().toISOString(), status: "rescheduled", from: old });
    DB.timeline.push({ id: uid("tl"), patientId: pid, at: new Date().toISOString(), type: "appointment", msg: { k: "tl_appt_rescheduled", p: { clinic: c.name } }, source: "patient" });
    notify(pid, "appointments", { k: "n_appt_rescheduled", p: { clinic: c.name } }, { silent: true });
    sendEmail(pid, "email_appt_change", { clinic: c.name, date: b.date, time: b.time });
  } else {
    apt = { id: uid("apt"), patientId: pid, clinicId: b.clinicId, doctorId: b.doctorId, specialty: b.specialty, date: b.date, time: b.time, type: b.type, notes: b.notes, status: "confirmed", history: [{ at: new Date().toISOString(), status: "confirmed" }], createdAt: new Date().toISOString(), bookedBy: App.user.id };
    DB.appointments.push(apt);
    DB.timeline.push({ id: uid("tl"), patientId: pid, at: new Date().toISOString(), type: "appointment", msg: { k: "tl_appt_booked", p: { clinic: c.name, date: b.date } }, source: isCaregiver() ? "caregiver" : "patient" });
    notify(pid, "appointments", { k: "n_appt_confirmed", p: { clinic: c.name } }, { silent: true });
    sendEmail(pid, "email_appt_confirm", { clinic: c.name, date: b.date, time: b.time });
    if (isCaregiver()) audit("au_caregiver_book", pid);
  }
  saveDB(); UI.bk = null; UI.stack = UI.stack.filter((r) => !["book", "discover", "clinic"].includes(r.name));
  go("appt-done", { id: apt.id });
}
function apptDoneView() {
  const a = DB.appointments.find((x) => x.id === UI.route.params.id);
  const c = CLINICS.find((x) => x.id === a.clinicId), d = DOCTORS.find((x) => x.id === a.doctorId);
  return shell(`${header("", { back: false })}<div class="page stack-lg" style="padding-top:20px">
    <div class="center stack"><div class="alarm-bell" style="background:var(--good-soft);color:var(--good)">${icon("check", "ico-lg")}</div><h1>${esc(t(a.status === "rescheduled" ? "resched_done" : "booked_done"))}</h1><p class="muted">${esc(t("booked_done_d"))}</p></div>
    <section class="card stack"><h3>${esc(fmtDate(a.date, { weekday: "long", day: "numeric", month: "long" }))} · ${esc(fmtTime(a.time))}</h3><p class="muted">${esc(doctorName(d))} · ${esc(t("sp_" + a.specialty))}</p><p class="small faint">${esc(clinicName(c))}, ${esc(c.area)}</p></section>
    <div class="grid-2"><button class="btn secondary" data-act="ics" data-id="${a.id}">${icon("calendar", "ico-sm")} ${esc(t("add_calendar"))}</button><button class="btn secondary" data-act="show-outbox">${icon("mail", "ico-sm")} ${esc(t("view_email"))}</button></div>
    <button class="btn block" data-go="appointments">${esc(t("done"))}</button></div>`, { tab: "appointments" });
}

/* ---------- APPOINTMENTS ---------- */
function apptRow(a) {
  const c = CLINICS.find((x) => x.id === a.clinicId), d = DOCTORS.find((x) => x.id === a.doctorId);
  return `<button class="card tap row reveal" data-act="appt-open" data-id="${a.id}">
    <div class="tile center" style="padding:10px;min-width:58px;gap:0"><span class="xs faint">${esc(fmtDate(a.date, { month: "short" }))}</span><span class="big" style="font-size:1.3rem">${esc(fmtDate(a.date, { day: "numeric" }))}</span></div>
    <div class="grow"><div class="row between"><h4>${esc(t("sp_" + a.specialty))}</h4>${statusPill(a.status)}</div><p class="small muted">${esc(fmtTime(a.time))} · ${esc(doctorName(d))}</p><p class="xs faint">${esc(clinicName(c))}</p></div></button>`;
}
function appointmentsView() {
  const pid = PID(); const tab = UI.apptTab;
  const list = tab === "upcoming" ? upcomingAppts(pid) : tab === "past" ? pastAppts(pid) : DB.appointments.filter((a) => a.patientId === pid).sort((a, b) => (a.date < b.date ? 1 : -1));
  return shell(`${header("")}
  <div class="page stack-lg">
    ${caregiverBanner()}
    <div class="row between"><h1>${esc(t("tab_appts"))}</h1><button class="btn sm" data-go="discover">${icon("plus", "ico-sm")} ${esc(t("book"))}</button></div>
    <div class="seg">${["upcoming", "past", "all"].map((k) => `<button class="${tab === k ? "on" : ""}" data-act="appt-tab" data-v="${k}">${esc(t("apt_" + k))}</button>`).join("")}</div>
    <div class="stack">${list.length ? list.map(apptRow).join("") : emptyState("calendar", t(tab === "upcoming" ? "no_upcoming" : "no_past"), t("no_upcoming_d"), `<button class="btn sm" data-go="discover">${esc(t("find_clinic"))}</button>`)}</div>
  </div>`);
}
function apptSheet(a) {
  const c = CLINICS.find((x) => x.id === a.clinicId), d = DOCTORS.find((x) => x.id === a.doctorId);
  const upcoming = ["confirmed", "rescheduled"].includes(a.status) && a.date >= today();
  const mapUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(c.name + ", " + c.area + ", Oman");
  return `<div class="stack"><div class="row between"><span class="eyebrow">${esc(t("appointment"))}</span>${statusPill(a.status)}</div>
    <h2>${esc(fmtDate(a.date, { weekday: "long", day: "numeric", month: "long" }))} · ${esc(fmtTime(a.time))}</h2>
    <dl class="kv"><dt>${esc(t("clinic"))}</dt><dd>${esc(clinicName(c))}</dd><dt>${esc(t("doctor"))}</dt><dd>${esc(doctorName(d))}</dd><dt>${esc(t("specialty"))}</dt><dd>${esc(t("sp_" + a.specialty))}</dd><dt>${esc(t("location"))}</dt><dd>${esc(c.area)}, ${esc(t("gov_" + c.gov))}</dd><dt>${esc(t("appt_type"))}</dt><dd>${esc(t("at_" + a.type))}</dd><dt>${esc(t("notes"))}</dt><dd>${esc(a.notes || "—")}</dd></dl>
    ${upcoming ? `<div class="grid-2"><button class="btn secondary" data-act="ics" data-id="${a.id}">${icon("calendar", "ico-sm")} ${esc(t("add_calendar"))}</button><a class="btn secondary" href="${mapUrl}" target="_blank" rel="noopener">${icon("pin", "ico-sm")} ${esc(t("directions"))}</a>
      <button class="btn secondary" data-act="call" data-v="${esc(c.phone)}">${icon("phone", "ico-sm")} ${esc(t("contact_clinic"))}</button><button class="btn secondary" data-act="appt-resched" data-id="${a.id}">${icon("refresh", "ico-sm")} ${esc(t("reschedule"))}</button></div>
      <button class="btn ghost" style="color:var(--bad)" data-act="appt-cancel" data-id="${a.id}">${esc(t("cancel_appt"))}</button>` : `<button class="btn secondary" data-act="book-doc" data-id="${d.id}">${esc(t("book_again"))}</button>`}
    <details class="why"><summary>${icon("clock", "ico-sm")} ${esc(t("history"))}</summary><ul>${a.history.map((h) => `<li>${esc(fmtDate(h.at.slice(0, 10)))} — ${esc(t("st_" + h.status))}</li>`).join("")}</ul></details></div>`;
}
function icsFor(a) {
  const c = CLINICS.find((x) => x.id === a.clinicId), d = DOCTORS.find((x) => x.id === a.doctorId);
  const dt = a.date.replace(/-/g, "") + "T" + a.time.replace(":", "") + "00";
  const end = a.date.replace(/-/g, "") + "T" + minToHm(hmToMin(a.time) + 30).replace(":", "") + "00";
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Wellpoint//EN", "BEGIN:VEVENT", `UID:${a.id}@wellpoint`, `DTSTART;TZID=Asia/Muscat:${dt}`, `DTEND;TZID=Asia/Muscat:${end}`, `SUMMARY:${t("sp_" + a.specialty)} — ${c.name}`, `LOCATION:${c.name}, ${c.area}, Oman`, `DESCRIPTION:${d.name}`, "BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", "DESCRIPTION:Appointment reminder", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
}

/* ---------- MEDICATIONS ---------- */
function medsView() {
  const pid = PID(); const sched = scheduleFor(pid); const meds = DB.medications.filter((m) => m.patientId === pid && m.active);
  const taken = sched.filter((i) => i.status === "taken").length; const adh = adherence(pid);
  return shell(`${header("")}
  <div class="page stack-lg">
    ${caregiverBanner()}
    <div class="row between"><h1>${esc(t("tab_meds"))}</h1>${allow("meds") && !isCaregiver() ? `<button class="btn sm" data-go="med-edit">${icon("plus", "ico-sm")} ${esc(t("add"))}</button>` : ""}</div>
    ${meds.length ? `<section class="card stack">
      <div class="row"><div class="ring" style="--p:${sched.length ? Math.round((taken / sched.length) * 100) : 0}"><span>${fmtNum(taken)}/${fmtNum(sched.length)}</span></div><div class="grow"><h3>${esc(t("today_schedule"))}</h3><p class="small muted">${adh != null ? esc(t("adherence_7d", { v: fmtNum(adh) })) : ""}</p></div></div>
      <div>${sched.map((i) => `<div class="dose ${i.status}"><span class="t">${esc(fmtTime(i.time))}</span><div class="grow"><h4>${esc(i.med.name)}</h4><p class="xs muted">${esc(i.med.dose || "")} · ${esc(t("food_" + i.med.food))}</p></div>
        ${i.status === "taken" ? `<span class="pill good">${esc(t("taken"))}</span>` : `<div class="row" style="gap:6px">${i.status === "missed" ? `<span class="pill bad">${esc(t("missed"))}</span>` : ""}<button class="btn sm good" data-act="dose" data-med="${i.med.id}" data-time="${i.time}" data-s="taken" aria-label="${esc(t("taken"))}">${icon("check", "ico-sm")}</button></div>`}</div>`).join("") || `<p class="muted small">${esc(t("nothing_today"))}</p>`}</div>
      <div class="row wrap"><button class="btn sm" data-go="routine">${icon("sparkle", "ico-sm")} ${esc(t("rt_cta"))}</button><button class="btn sm secondary" data-act="clock-all">${icon("clock", "ico-sm")} ${esc(t("clk_btn"))}</button></div>
    </section>
    <section class="stack"><h3>${esc(t("my_meds"))}</h3>${meds.map((m) => `<button class="card tap row reveal" ${isCaregiver() ? "" : `data-go="med-edit" data-id="${m.id}"`}><div class="iconwrap">${icon("pill")}</div><div class="grow"><div class="row wrap" style="gap:6px"><h4>${esc(m.name)}</h4>${m.verified ? `<span class="pill good">${esc(t("clinic_verified"))}</span>` : `<span class="pill plain">${esc(t("self_entered"))}</span>`}</div><p class="small muted">${esc(m.dose || "—")} · ${esc(t("freq_" + m.frequency))}</p><p class="xs faint num">${m.times.map(fmtTime).join(" · ")}</p></div>${isCaregiver() ? "" : flipIcon("chevron", "ico-sm")}</button>`).join("")}</section>`
    : emptyState("pill", t("no_meds"), t("no_meds_d"), isCaregiver() ? "" : `<button class="btn" data-go="med-edit">${icon("plus", "ico-sm")} ${esc(t("add_first_med"))}</button>`)}
    ${meds.length && !isCaregiver() ? alarmSettings() : ""}
    <div class="banner">${icon("shield")}<span class="small">${esc(t("med_safety"))}</span></div>
  </div>`);
}
function alarmSettings() {
  const pr = DB.profiles[App.user.id].prefs;
  const perm = "Notification" in window ? Notification.permission : "unsupported";
  const sw = (k, label) => `<div class="li"><span class="grow small">${esc(label)}</span><button class="switch ${pr[k] !== false ? "on" : ""}" data-act="alarm-pref" data-k="${k}" role="switch" aria-checked="${pr[k] !== false}" aria-label="${esc(label)}"></button></div>`;
  return `<details class="card fold" id="fold-alarm"><summary><span class="iconwrap">${icon("bell", "ico-sm")}</span><h4 class="grow">${esc(t("alarm_settings"))}</h4>${icon("chevron", "ico-sm fold-ico")}</summary><div class="stack fold-body">
    <div class="list">${sw("alarmSound", t("alarm_sound"))}${sw("alarmVibrate", t("alarm_vibrate"))}</div>
    ${perm === "granted" ? `<span class="pill good">${esc(t("alarm_enabled"))}</span>` : `<div><button class="btn sm secondary" data-act="alarm-perm">${esc(t("alarm_enable"))}</button></div>`}
    <button class="btn sm ghost" data-act="test-alarm">${icon("bell", "ico-sm")} ${esc(t("test_reminder"))}</button>
    <p class="hint">${esc(t("alarm_os_note"))}</p></div></details>`;
}
function medEditView() {
  const pid = PID(); const id = UI.route.params.id;
  if (!UI.medForm || UI.medForm._for !== (id || "new")) {
    const m = id ? DB.medications.find((x) => x.id === id) : null;
    UI.medForm = m ? { ...m, times: [...m.times], _for: id } : { _for: "new", name: "", dose: "", frequency: "once", times: ["08:00"], food: "any", start: today(), end: "", notes: "", doctor: "", clinic: "", verified: false, source: "patient" };
    UI.medForm.suggest = null;
  }
  const f = UI.medForm; const n = FREQ_COUNT[f.frequency];
  while (f.times.length < n) f.times.push(minToHm(hmToMin(f.times.at(-1) || "08:00") + 360));
  if (n && f.times.length > n) f.times.length = n;
  const locked = f.verified;
  return shell(`${header(id ? t("edit_med") : t("add_med"), { back: true })}
  <div class="page stack-lg">
    ${locked ? `<div class="banner good">${icon("shield")}<span class="small">${esc(t("verified_locked"))}</span></div>` : ""}
    <form class="stack" data-form="med" novalidate>
      ${field("m-name", t("med_name"), inputEl("m-name", "medForm.name", { attrs: locked ? "readonly" : "required" }))}
      ${field("m-dose", t("dose"), inputEl("m-dose", "medForm.dose", { placeholder: t("dose_ph"), attrs: locked ? "readonly" : "" }), t("dose_hint"))}
      <div class="grid-2">${field("m-freq", t("frequency"), selectEl("m-freq", "medForm.frequency", Object.keys(FREQ_COUNT).map((k) => [k, t("freq_" + k)]), { attrs: (locked ? "disabled " : "") + 'data-rerender="1"' }))}
      ${field("m-food", t("food"), selectEl("m-food", "medForm.food", ["any", "before", "after", "with"].map((k) => [k, t("food_" + k)]), { attrs: (locked ? "disabled " : "") + 'data-rerender="1"' }))}</div>
      ${n ? `<div class="stack-sm"><span class="label">${esc(t("times"))}</span><div class="grid-2">${f.times.map((tm, i) => `<input class="input" type="time" id="m-t${i}" data-bind="medForm.times.${i}" value="${tm}" aria-label="${esc(t("time"))} ${i + 1}">`).join("")}</div></div>
      <section class="card tint stack"><div class="row"><div class="iconwrap">${icon("sparkle")}</div><div class="grow"><b>${esc(t("ai_scheduler"))}</b><p class="small muted">${esc(t("ai_scheduler_d"))}</p></div></div>
        ${f.suggest ? `<div class="stack-sm"><p><b class="num">${f.suggest.times.map(fmtTime).join(" · ")}</b></p>${whyBlock(f.suggest.reasons, t("why_these_times"))}<div class="row"><button type="button" class="btn sm good" data-act="apply-suggest">${esc(t("use_times"))}</button><button type="button" class="btn sm ghost" data-act="dismiss-suggest">${esc(t("keep_mine"))}</button></div></div>` : `<button type="button" class="btn sm secondary" data-act="suggest-times">${esc(t("suggest_times"))}</button>`}
      </section>` : `<p class="hint">${esc(t("prn_note"))}</p>`}
      <div class="grid-2">${field("m-start", t("start_date"), inputEl("m-start", "medForm.start", { type: "date" }))}${field("m-end", t("end_date_opt"), inputEl("m-end", "medForm.end", { type: "date" }))}</div>
      <div class="grid-2">${field("m-doc", t("prescribing_doctor"), selectEl("m-doc", "medForm.doctor", [["", "—"], ...DOCTORS.map((d) => [d.id, doctorName(d)])]))}${field("m-clinic", t("prescribing_clinic"), selectEl("m-clinic", "medForm.clinic", [["", "—"], ...CLINICS.map((c) => [c.id, clinicName(c)])]))}</div>
      ${field("m-notes", t("notes"), `<textarea class="input" id="m-notes" data-bind="medForm.notes">${esc(f.notes || "")}</textarea>`)}
      <button class="btn xl block" type="submit">${esc(t("save"))}</button>
      ${id ? `<button type="button" class="btn ghost" style="color:var(--bad)" data-act="med-delete" data-id="${id}">${esc(t("remove_med"))}</button>` : ""}
    </form>
    <div class="banner warn">${icon("alert")}<span class="small">${esc(t("med_safety"))}</span></div>
  </div>`, { tab: "meds" });
}
function alarmHtml() {
  const { medId, time } = UI.alarm; const m = DB.medications.find((x) => x.id === medId); if (!m) return "";
  return `<div class="alarm" role="alertdialog" aria-modal="true" aria-labelledby="alarm-t"><div class="alarm-card stack">
    <div class="alarm-bell">${icon("bell", "ico-lg")}</div>
    <span class="eyebrow">${esc(fmtTime(time))}</span><h2 id="alarm-t">${esc(t("time_for_med"))}</h2>
    <div class="card tint"><h3>${esc(m.name)}</h3><p class="muted small">${esc(m.dose || "")} · ${esc(t("food_" + m.food))}</p>${m.notes ? `<p class="xs faint">${esc(m.notes)}</p>` : ""}</div>
    <button class="btn xl block good" data-act="alarm" data-v="taken">${icon("check")} ${esc(t("taken").toUpperCase())}</button>
    <div class="grid-2"><button class="btn secondary" data-act="alarm" data-v="snooze">${icon("clock", "ico-sm")} ${esc(t("snooze_10"))}</button><button class="btn secondary" data-act="alarm" data-v="details">${esc(t("view_details"))}</button></div>
    <button class="btn ghost sm" data-act="alarm" data-v="dismiss">${esc(t("dismiss"))}</button>
    <span class="pill warn ringing">${esc(t("alarm_ringing"))}</span>
    <p class="xs faint">${esc(t("alarm_os_note"))}</p></div></div>`;
}
function reminderTick() {
  if (!App.user || App.user.role === "clinic" || UI.alarm) return;
  const pid = PID(); if (!pid || !allow("meds") || !allow("reminders") && isCaregiver()) return;
  const n = hmToMin(nowHM());
  for (const it of scheduleFor(pid)) {
    const key = it.med.id + today() + it.time;
    if (it.status === "taken" || UI.alarmed[key]) continue;
    const snooze = UI.snoozed[key];
    const dueAt = snooze || hmToMin(it.time);
    if (n >= dueAt && n - dueAt <= 5) { UI.alarmed[key] = true; showAlarm({ medId: it.med.id, time: it.time, key }); return; }
  }
}

/* ---------- HEALTH ---------- */
function healthView() {
  const pid = PID(); const p = DB.profiles[pid]; const fr = freshness(pid);
  const lastCi = DB.checkins.filter((c) => c.patientId === pid).sort((a, b) => (a.at < b.at ? 1 : -1))[0];
  const ints = DB.integrations[pid] || [];
  const latest = (type) => DB.measurements.filter((m) => m.patientId === pid && m.type === type).sort((a, b) => (a.at < b.at ? 1 : -1))[0];
  const flow = ["cf_visit", "cf_record", "cf_plan", "cf_followup", "cf_reminders", "cf_checkins", "cf_worse", "cf_questions", "cf_rules", "cf_notify", "cf_contact", "cf_appt", "cf_newdata", "cf_repeat"];
  const cur = lastCi?.level && lastCi.level !== "green" && daysBetween(lastCi.at.slice(0, 10), today()) <= 2 ? 9 : 5;
  const tiles = [["bp", "m_bp", (m) => `${m.value}/${m.value2}`, "mmHg"], ["glucose", "m_glucose", (m) => m.value, "mg/dL"], ["hba1c", "m_hba1c", (m) => m.value, "%"], ["weight", "m_weight", (m) => m.value, "kg"], ["sleep", "m_sleep", (m) => m.value, t("hours_short")]].map(([ty, k, f, u]) => [latest(ty), k, f, u]).filter(([m]) => m);
  return shell(`${header("")}
  <div class="page stack-lg">
    ${caregiverBanner()}
    <h1>${esc(t("tab_health"))}</h1>
    <section class="card stack"><div class="row between"><h3>${esc(t("smart_checkin"))}</h3>${lastCi ? `<span class="xs faint">${esc(t("last"))}: ${esc(relDays(lastCi.at))}</span>` : ""}</div>
      <p class="muted small">${esc(t("smart_checkin_d"))}</p><div><button class="btn" data-go="checkin">${esc(isCaregiver() ? t("cg_checkin_for", { name: firstName(p.name) }) : t("check_in_now"))}</button></div></section>
    <section class="card stack"><div class="row between"><h3>${esc(t("data_freshness"))}</h3><span class="pill plain">${esc(t("not_monitoring"))}</span></div>
      <div>${fr.rows.map((r) => { const tone = r.days == null ? "bad" : r.days >= r.stale ? "warn" : "good"; return `<div class="fresh"><span>${esc(t(r.key))}</span><span class="pill ${tone}">${esc(r.days == null ? t("never") : r.days === 0 ? t("today") : t("days_ago", { n: fmtNum(r.days) }))}</span></div>`; }).join("")}
      <div class="fresh"><span>${esc(t("fr_next"))}</span><span class="pill info">${esc(fr.next ? fmtDate(fr.next.date) : t("none_scheduled"))}</span></div></div>
      ${whyBlock([{ k: "why_freshness" }, { k: "why_stale_not_worse" }], t("what_is_this"))}</section>
    <section class="stack"><div class="row between"><h3>${esc(t("latest_measurements"))}</h3><button class="btn sm secondary" data-go="measure">${icon("plus", "ico-sm")} ${esc(t("add"))}</button></div>
      ${tiles.length ? `<div class="grid-2">${tiles.map(([m, k, f, u]) => `<div class="tile"><span class="xs faint">${esc(t(k))}</span><span class="big">${esc(f(m))} <span class="xs faint">${esc(u)}</span></span><span class="xs faint">${esc(relDays(m.at))} · ${esc(t("src_" + (m.source || "patient")))}</span></div>`).join("")}</div>` : emptyState("activity", t("no_measurements"), t("no_measurements_d"))}</section>
    <nav class="card list-card">${[["summary", "chart", "health_summary"], ["timeline", "activity", "health_timeline"], ["journal", "journal", "journal"], ...(allow("docs") ? [["documents", "file", "documents"]] : [])].map(([r, ic, k]) => `<button class="quiet-link" data-go="${r}">${icon(ic, "ico-sm")}<span>${esc(t(k))}</span>${flipIcon("chevron", "ico-sm")}</button>`).join("")}</nav>
    <details class="card fold reveal" id="fold-sources"><summary><span class="iconwrap">${icon("link", "ico-sm")}</span><h4 class="grow">${esc(t("connected_sources"))}</h4>${icon("chevron", "ico-sm fold-ico")}</summary><div class="stack fold-body"><p class="small muted">${esc(t("connected_sources_d"))}</p>
      <div class="list">${ints.map((i) => { const c = CLINICS.find((x) => x.id === i.clinicId); return `<div class="li"><div class="iconwrap">${icon("link")}</div><div class="grow"><b>${esc(clinicName(c))}</b><p class="xs muted">${esc(t(Adapters[i.adapter].label))} · ${i.lastSync ? esc(t("synced", { when: relDays(i.lastSync) })) : esc(t("not_synced"))}</p></div>${i.status === "connected" && i.adapter !== "manual" ? `<button class="btn sm secondary" data-act="sync" data-c="${i.clinicId}">${icon("refresh", "ico-sm")} ${esc(t("sync"))}</button>` : i.status === "available" ? `<button class="btn sm" data-act="connect" data-c="${i.clinicId}">${esc(t("connect"))}</button>` : `<span class="pill plain">${esc(t("clinic_updates"))}</span>`}</div>`; }).join("")}
      ${(p.devices || []).map((dv) => `<div class="li"><div class="iconwrap good">${icon("activity")}</div><div class="grow"><b>${esc(t("dev_" + dv))}</b><p class="xs muted">${esc(t("dev_mock"))}</p></div><span class="pill good">${esc(t("connected"))}</span></div>`).join("")}</div>
      <p class="xs faint">${esc(t("shifa_note"))}</p></div></details>
    <details class="card fold reveal" id="fold-loop"><summary><span class="iconwrap">${icon("refresh", "ico-sm")}</span><h4 class="grow">${esc(t("care_loop"))}</h4>${icon("chevron", "ico-sm fold-ico")}</summary><div class="stack fold-body"><p class="small muted">${esc(t("care_loop_d"))}</p>
      <div class="flow">${flow.map((k, i) => `<div class="flow-step ${i < cur ? "done" : i === cur ? "now" : ""}"><span class="n">${i === flow.length - 1 ? "↻" : fmtNum(i + 1)}</span><p class="small">${esc(t(k))}</p></div>`).join("")}</div></div></details>
  </div>`);
}
function measureView() {
  const f = UI.meas ??= { type: "bp", sys: "", dia: "", value: "" };
  return shell(`${header(t("add_measurement"), { back: true })}<div class="page stack-lg">
    ${caregiverBanner()}
    <div class="seg">${["bp", "glucose", "weight", "sleep"].map((k) => `<button class="${f.type === k ? "on" : ""}" data-act="meas-type" data-v="${k}">${esc(t("m_" + k))}</button>`).join("")}</div>
    <form class="stack" data-form="measure" novalidate>
      ${f.type === "bp" ? `<div class="grid-2">${field("ms-sys", t("systolic"), inputEl("ms-sys", "meas.sys", { type: "number", attrs: 'inputmode="numeric" min="50" max="260"' }))}${field("ms-dia", t("diastolic"), inputEl("ms-dia", "meas.dia", { type: "number", attrs: 'inputmode="numeric" min="30" max="160"' }))}</div><p class="hint">mmHg</p>`
        : field("ms-v", t("m_" + f.type) + " (" + { glucose: "mg/dL", weight: "kg", sleep: t("hours_short") }[f.type] + ")", inputEl("ms-v", "meas.value", { type: "number", attrs: 'inputmode="decimal" step="0.1"' }))}
      <button class="btn xl block" type="submit">${esc(t("save"))}</button>
    </form><div id="meas-result"></div>
    <p class="hint">${esc(t("meas_note"))}</p></div>`, { tab: "health" });
}
function levelCard(res, actions = "") {
  const tone = res.level === "red" ? "red" : res.level === "amber" ? "amber" : "";
  return `<div class="level-card ${tone} stack"><div class="row"><span class="pill ${res.level === "red" ? "bad" : res.level === "amber" ? "warn" : "good"}">${esc(t("lvl_" + res.level))}</span></div>
    <h3>${esc(t("lvl_" + res.level + "_title"))}</h3><p class="muted">${esc(t("lvl_" + res.level + "_body"))}</p>
    ${res.level === "red" ? `<div class="banner bad">${icon("phone")}<div class="stack-sm"><b>${esc(t("emergency_call"))}</b><span class="small">${esc(t("emergency_call_d"))}</span></div></div>` : ""}
    ${actions}${whyBlock(res.reasons)}</div>`;
}
function checkinView() {
  const pid = PID(); const p = DB.profiles[pid]; const ci = UI.ci ??= { step: 0, mood: "", symptoms: [], redFlags: [], bp: "", glucose: "", result: null };
  const cond = p.conditions || [];
  const syms = ["fatigue", "dizziness", "pain", "breathing", "swelling", "headache", "sleep", "mood_low"];
  if (cond.includes("diabetes")) syms.push("thirst", "vision");
  if (cond.includes("asthma")) syms.push("wheeze");
  let body = "";
  if (ci.step === 0) body = `<h1>${esc(isCaregiver() ? t("ci_q_cg", { name: firstName(p.name) }) : t("ci_q"))}</h1>
    <div class="stack">${[["good", "ci_good"], ["same", "ci_same"], ["worse", "ci_worse"]].map(([v, k]) => `<button class="choice ${ci.mood === v ? "on" : ""}" data-act="ci-mood" data-v="${v}" style="padding:18px;font-size:1rem"><span class="box">${ci.mood === v ? icon("check", "ico-sm") : ""}</span>${esc(t(k))}</button>`).join("")}</div>`;
  if (ci.step === 1) body = `<h1>${esc(t("ci_what_changed"))}</h1><p class="muted">${esc(t("ci_what_changed_d"))}</p>
    <div class="choice-grid">${syms.map((s) => `<button class="choice ${ci.symptoms.includes(s) ? "on" : ""}" data-act="ci-sym" data-v="${s}"><span class="box">${ci.symptoms.includes(s) ? icon("check", "ico-sm") : ""}</span>${esc(t("sym_" + s))}</button>`).join("")}</div>
    <div class="row"><button class="btn secondary grow" data-act="ci-step" data-v="0">${esc(t("back"))}</button><button class="btn grow" data-act="ci-step" data-v="2">${esc(t("continue"))}</button></div>`;
  if (ci.step === 2) body = `<h1>${esc(t("ci_redflag_q"))}</h1><p class="muted">${esc(t("ci_redflag_d"))}</p>
    <div class="stack">${RED_FLAGS.map((s) => `<button class="choice ${ci.redFlags.includes(s) ? "on" : ""}" data-act="ci-red" data-v="${s}"><span class="box">${ci.redFlags.includes(s) ? icon("check", "ico-sm") : ""}</span>${esc(t("sym_" + s))}</button>`).join("")}</div>
    ${(cond.includes("hypertension") || cond.includes("diabetes")) ? `<section class="card tint stack"><b>${esc(t("ci_optional_reading"))}</b>
      ${cond.includes("hypertension") ? field("ci-bp", t("m_bp") + " (mmHg)", inputEl("ci-bp", "ci.bp", { placeholder: "130/85" })) : ""}
      ${cond.includes("diabetes") ? field("ci-glu", t("m_glucose") + " (mg/dL)", inputEl("ci-glu", "ci.glucose", { type: "number", attrs: 'inputmode="numeric"' })) : ""}</section>` : ""}
    <div class="row"><button class="btn secondary grow" data-act="ci-step" data-v="1">${esc(t("back"))}</button><button class="btn grow" data-act="ci-submit">${esc(t("ci_submit"))}</button></div>`;
  if (ci.step === 3) {
    const r = ci.result;
    const actions = r.level === "green" ? `<div class="row wrap"><button class="btn sm" data-go="home">${esc(t("done"))}</button><button class="btn sm secondary" data-go="journal">${esc(t("add_note"))}</button></div>`
      : `<div class="row wrap"><button class="btn sm" data-act="book-followup">${esc(t("book_followup"))}</button><button class="btn sm secondary" data-act="call" data-v="${esc(CLINICS.find((c) => c.id === p.primaryClinic)?.phone || "")}">${esc(t("contact_clinic"))}</button><button class="btn sm ghost" data-go="home">${esc(t("done"))}</button></div>`;
    body = `<h1>${esc(t("ci_thanks"))}</h1>${levelCard(r, actions)}${r.notifiedCg ? `<p class="small muted">${icon("users", "ico-sm")} ${esc(t("ci_cg_notified"))}</p>` : ""}<p class="hint">${esc(t("rules_disclaimer"))}</p>`;
  }
  return shell(`${header(t("smart_checkin"), { back: true })}<div class="page stack-lg">${caregiverBanner()}${body}</div>`, { tab: "health" });
}
function submitCheckin() {
  const pid = PID(); const ci = UI.ci; const p = DB.profiles[pid];
  const bpm = /^(\d{2,3})\s*\/\s*(\d{2,3})$/.exec(ci.bp || "");
  const bp = bpm ? [Number(bpm[1]), Number(bpm[2])] : null; const glucose = ci.glucose ? Number(ci.glucose) : null;
  const res = evaluateRules({ profile: p, mood: ci.mood, symptoms: ci.symptoms, redFlags: ci.redFlags, bp, glucose });
  const rec = { id: uid("ci"), patientId: pid, at: new Date().toISOString(), mood: ci.mood, symptoms: [...ci.symptoms, ...ci.redFlags], level: res.level, by: isCaregiver() ? "caregiver" : "patient" };
  DB.checkins.push(rec);
  if (bp) DB.measurements.push({ id: uid("ms"), patientId: pid, type: "bp", value: bp[0], value2: bp[1], at: rec.at, source: rec.by });
  if (glucose) DB.measurements.push({ id: uid("ms"), patientId: pid, type: "glucose", value: glucose, unit: "mg/dL", at: rec.at, source: rec.by });
  DB.timeline.push({ id: uid("tl"), patientId: pid, at: rec.at, type: "checkin", msg: { k: rec.symptoms.length ? "tl_checkin_sym" : "tl_checkin", p: { mood: { k: "mood_" + ci.mood }, list: rec.symptoms.map((s) => t("sym_" + s)).join(", ") } }, source: rec.by, level: res.level === "green" ? null : res.level === "amber" ? "warn" : "bad" });
  if (res.level !== "green") {
    notify(pid, "health", { k: res.level === "red" ? "n_red" : "n_amber" }, { silent: true });
    const cg = DB.caregivers.filter((c) => c.patientId === pid && c.status === "active" && c.perms.health && c.caregiverUserId);
    if (p.consent?.shareWithCaregivers) cg.forEach((c) => { if (c.caregiverUserId !== App.user.id) { notify(c.caregiverUserId, "caregiver", { k: "n_cg_alert", p: { name: firstName(p.name), level: { k: "lvl_" + res.level } } }, { silent: true }); sendEmail(c.caregiverUserId, "email_caregiver", { name: firstName(p.name) }); res.notifiedCg = true; } });
  }
  if (isCaregiver()) audit("au_caregiver_checkin", pid);
  saveDB(); ci.result = res; ci.step = 3; render({ scrollTop: true });
}

/* ---------- SUMMARY ---------- */
function summaryView() {
  const pid = PID(); const per = UI.sumPeriod; const days = per === "day" ? 1 : per === "week" ? 7 : 30;
  const since = addDays(today(), -days);
  const inRange = (at) => at.slice(0, 10) > since || (per === "day" && at.slice(0, 10) === today());
  const sleep = DB.measurements.filter((m) => m.patientId === pid && m.type === "sleep" && inRange(m.at));
  const avgSleep = sleep.length ? sleep.reduce((a, b) => a + b.value, 0) / sleep.length : null;
  const adh = per === "day" ? (() => { const s = scheduleFor(pid); return s.length ? Math.round((s.filter((i) => i.status === "taken").length / s.length) * 100) : null; })() : adherence(pid, days);
  const done = DB.appointments.filter((a) => a.patientId === pid && a.status === "completed" && a.date > since).length;
  const updates = DB.timeline.filter((x) => x.patientId === pid && inRange(x.at)).length;
  const focus = oneThing(pid);
  const sleepBars = DB.measurements.filter((m) => m.patientId === pid && m.type === "sleep").sort((a, b) => (a.at > b.at ? 1 : -1)).slice(-7);
  const changes = [];
  if (avgSleep != null) changes.push({ k: avgSleep < 7 ? "chg_sleep_low" : "chg_sleep_ok", p: { h: fmtNum(avgSleep, { maximumFractionDigits: 1 }) } });
  if (adh != null) changes.push({ k: adh >= 90 ? "chg_adh_good" : "chg_adh_low", p: { v: adh } });
  const ci = DB.checkins.filter((c) => c.patientId === pid && inRange(c.at));
  changes.push(ci.length ? { k: "chg_checkins", p: { n: ci.length } } : { k: "chg_no_checkins" });
  const j = DB.journal.filter((x) => x.patientId === pid && inRange(x.at));
  if (j.length) changes.push({ k: "chg_journal", p: { n: j.length } });
  return shell(`${header(t("health_summary"), { back: true })}<div class="page stack-lg">
    <div class="seg">${["day", "week", "month"].map((k) => `<button class="${per === k ? "on" : ""}" data-act="sum-per" data-v="${k}">${esc(t("per_" + k))}</button>`).join("")}</div>
    <span class="eyebrow">${esc(t("your_" + per))}</span>
    <div class="grid-2">
      <div class="tile"><span class="xs faint">${esc(t("m_sleep"))}</span><span class="big">${avgSleep != null ? esc(t(avgSleep >= 7 ? "sleep_good" : avgSleep >= 6 ? "sleep_fair" : "sleep_low")) : "—"}</span><span class="xs faint">${avgSleep != null ? esc(t("avg_hours", { h: fmtNum(avgSleep, { maximumFractionDigits: 1 }) })) : esc(t("no_data"))}</span></div>
      <div class="tile"><span class="xs faint">${esc(t("med_adherence"))}</span><span class="big">${adh != null ? `<span data-count="${adh}" data-suffix="%">${fmtNum(adh)}%</span>` : "—"}</span><span class="xs faint">${esc(adh != null ? t("of_scheduled") : t("no_meds_short"))}</span></div>
      <div class="tile"><span class="xs faint">${esc(t("tab_appts"))}</span><span class="big" data-count="${done}">${fmtNum(done)}</span><span class="xs faint">${esc(t("completed_lc"))}</span></div>
      <div class="tile"><span class="xs faint">${esc(t("health_updates"))}</span><span class="big" data-count="${updates}">${fmtNum(updates)}</span><span class="xs faint">${esc(t("timeline_entries"))}</span></div>
    </div>
    ${sleepBars.length ? `<section class="card stack"><div class="row between"><h3>${esc(t("m_sleep"))}</h3><span class="xs faint">${esc(t("src_device"))}</span></div><div class="bar-chart" role="img" aria-label="${esc(t("sleep_chart"))}">${sleepBars.map((m) => `<div class="b"><span class="num">${fmtNum(m.value)}</span><i class="${m.value < 6.5 ? "low" : ""}" style="height:${Math.round((m.value / 9) * 80)}%"></i><span>${esc(fmtDate(m.at.slice(0, 10), { weekday: "narrow" }))}</span></div>`).join("")}</div></section>` : ""}
    <section class="card stack"><h3>${esc(t("what_changed"))}</h3><ul class="stack-sm" style="margin:0;padding-inline-start:18px">${changes.map((c) => `<li class="small">${esc(tx(c))}</li>`).join("")}</ul></section>
    <section class="card stack" style="background:var(--accent-soft);border-color:transparent;box-shadow:none"><span class="eyebrow" style="color:var(--accent)">${esc(t("what_focus"))}</span><h3>${esc(t(focus.key, focus.p))}</h3>${whyBlock(focus.reasons)}</section>
  </div>`, { tab: "health" });
}

/* ---------- TIMELINE ---------- */
const TL_ICON = { visit: "hospital", medication: "pill", checkin: "heart", lab: "file", appointment: "calendar", measure: "activity", plan: "clock", system: "sparkle", document: "file" };
function timelineView() {
  const pid = PID(); const items = DB.timeline.filter((x) => x.patientId === pid).sort((a, b) => (a.at < b.at ? 1 : -1));
  let lastMonth = "";
  return shell(`${header(t("health_timeline"), { back: true })}<div class="page stack-lg">
    <p class="muted">${esc(t("timeline_sub"))}</p>
    ${items.length ? `<div class="timeline">${items.map((x) => { const mo = x.at.slice(0, 7); const head = mo !== lastMonth ? `<div class="eyebrow" style="padding:6px 0 12px">${esc(fmtDate(x.at.slice(0, 10), { month: "long", year: "numeric" }))}</div>` : ""; lastMonth = mo;
      return `${head}<div class="tl-item reveal"><span class="tl-dot ${x.level || (x.source === "clinic" ? "good" : "")}">${""}</span><div class="stack-sm"><span class="tl-date">${esc(fmtDate(x.at.slice(0, 10), { day: "numeric", month: "short" }))} · ${esc(t("src_" + x.source))}</span><div class="row-top">${icon(TL_ICON[x.type] || "activity", "ico-sm")}<span>${esc(tx(x.msg))}</span></div></div></div>`; }).join("")}</div>` : emptyState("activity", t("tl_empty"), t("tl_empty_d"))}
  </div>`, { tab: "health" });
}

/* ---------- JOURNAL ---------- */
const JOURNAL_TAGS = ["tired", "headache", "poor_sleep", "workout", "stress", "good_day", "pain", "ate_well"];
function journalView() {
  const pid = PID(); const j = UI.jn ??= { tags: [], text: "" };
  const entries = DB.journal.filter((x) => x.patientId === pid).sort((a, b) => (a.at < b.at ? 1 : -1));
  return shell(`${header(t("journal"), { back: true })}<div class="page stack-lg">
    <section class="card stack"><h3>${esc(t("quick_note"))}</h3><div class="chips">${JOURNAL_TAGS.map((tg) => `<button class="chip sm ${j.tags.includes(tg) ? "on" : ""}" data-act="jn-tag" data-v="${tg}">${esc(t("jt_" + tg))}</button>`).join("")}</div>
      <textarea class="input" id="jn-text" data-bind="jn.text" placeholder="${esc(t("journal_ph"))}">${esc(j.text)}</textarea>
      <button class="btn" data-act="jn-save" ${isCaregiver() ? "disabled" : ""}>${esc(t("save_note"))}</button></section>
    <section class="card stack"><div class="row between"><h3>${esc(t("patterns"))}</h3><button class="btn sm secondary" data-act="jn-ai">${icon("sparkle", "ico-sm")} ${esc(t("summarize"))}</button></div><div id="jn-ai" class="small muted">${esc(t("patterns_d"))}</div></section>
    <div class="stack">${entries.length ? entries.map((e) => `<div class="card flat row-top reveal"><div class="grow stack-sm"><span class="xs faint">${esc(fmtDate(e.at.slice(0, 10)))}</span><div class="chips">${e.tags.map((tg) => `<span class="pill plain">${esc(t("jt_" + tg))}</span>`).join("")}</div>${e.text ? `<p class="small">${esc(e.text)}</p>` : ""}</div></div>`).join("") : emptyState("journal", t("journal_empty"), t("journal_empty_d"))}</div>
  </div>`, { tab: "health" });
}
function localPatterns(pid) {
  const e = DB.journal.filter((x) => x.patientId === pid && daysBetween(x.at.slice(0, 10), today()) <= 30);
  if (e.length < 2) return t("patterns_few");
  const counts = {}; e.forEach((x) => x.tags.forEach((tg) => (counts[tg] = (counts[tg] || 0) + 1)));
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => t("jt_" + k) + " ×" + fmtNum(v)).join(", ");
  const co = e.filter((x) => x.tags.includes("poor_sleep") && x.tags.includes("stress")).length;
  return t("patterns_top", { top }) + (co ? " " + t("patterns_co", { n: co }) : "") + " " + t("patterns_caveat");
}

/* ---------- DOCUMENTS ---------- */
const DOC_CATS = ["lab", "prescription", "report", "referral", "image", "other"];
function documentsView() {
  const pid = PID(); const q = UI.docQ.toLowerCase(); const cat = UI.docCat;
  const docs = DB.documents.filter((d) => d.patientId === pid && (cat === "all" || d.cat === cat) && (!q || d.name.toLowerCase().includes(q))).sort((a, b) => (a.at < b.at ? 1 : -1));
  return shell(`${header(t("documents"), { back: true })}<div class="page stack-lg">
    <label class="dropzone stack" id="dropzone" for="doc-file">${icon("upload", "ico-lg")}<b>${esc(t("upload_doc"))}</b><span class="xs faint">${esc(t("upload_hint"))}</span><input type="file" id="doc-file" accept="image/*,application/pdf" hidden></label>
    <div class="search">${icon("search")}<input class="input" id="doc-q" type="search" data-bind="docQ" data-live="docs" value="${esc(UI.docQ)}" placeholder="${esc(t("search_docs"))}"></div>
    <div class="chips"><button class="chip sm ${cat === "all" ? "on" : ""}" data-act="doc-cat" data-v="all">${esc(t("all"))}</button>${DOC_CATS.map((c) => `<button class="chip sm ${cat === c ? "on" : ""}" data-act="doc-cat" data-v="${c}">${esc(t("dc_" + c))}</button>`).join("")}</div>
    <div class="list card" id="doc-list" style="padding:4px 16px">${docs.length ? docs.map((d) => `<div class="li"><button class="doc-thumb" data-act="doc-open" data-id="${d.id}" aria-label="${esc(t("preview"))}">${d.dataUrl && d.type.startsWith("image") ? `<img src="${d.dataUrl}" alt="">` : esc((d.name.split(".").pop() || "").toUpperCase())}</button><div class="grow" style="min-width:0"><b style="overflow-wrap:anywhere">${esc(d.name)}</b><p class="xs muted">${esc(t("dc_" + d.cat))} · ${esc(fmtDate(d.at.slice(0, 10)))} · ${esc(fmtNum(Math.round(d.size / 1024)))} KB · ${esc(t("src_" + (d.source || "patient")))}</p></div><button class="icon-btn" data-act="doc-del" data-id="${d.id}" aria-label="${esc(t("delete"))}">${icon("trash", "ico-sm")}</button></div>`).join("") : `<div style="padding:12px 0">${emptyState("file", t("no_docs"), t("no_docs_d"))}</div>`}</div>
    <p class="hint">${icon("lock", "ico-sm")} ${esc(t("docs_privacy"))}</p></div>`, { tab: "health" });
}
function docSheet(d) {
  return `<div class="stack"><h3 style="overflow-wrap:anywhere">${esc(d.name)}</h3>
    ${d.dataUrl && d.type.startsWith("image") ? `<img src="${d.dataUrl}" alt="${esc(d.name)}" style="border-radius:14px;max-height:50vh;object-fit:contain">` : `<div class="empty">${icon("file", "ico-lg")}<p class="small muted">${esc(d.dataUrl ? t("pdf_preview_na") : t("seed_doc_na"))}</p></div>`}
    ${field("doc-cat-edit", t("category"), selectEl("doc-cat-edit", null, DOC_CATS.map((c) => [c, t("dc_" + c)]), { value: d.cat, attrs: `data-act-change="doc-recat" data-id="${d.id}"` }))}
    <button class="btn secondary" data-act="sheet-close">${esc(t("close"))}</button></div>`;
}

/* ---------- AI COMPANION ---------- */
function aiView() {
  const pid = PID(); const p = DB.profiles[pid];
  if (!UI.chat.length) UI.chat.push({ role: "assistant", text: t("ai_hello", { name: firstName(isCaregiver() ? DB.profiles[App.user.id].name : p.name) }) });
  const sugg = ["ai_s_week", "ai_s_changed", "ai_s_next", "ai_s_tonight", "ai_s_ask", "ai_s_organize"];
  return shell(`${header("")}<div class="page stack">
    <div class="row between"><div><h1>${esc(t("wellpoint_ai"))}</h1><p class="small muted">${esc(t("ai_sub"))}</p></div><span class="pill ${UI.aiLive ? "good" : "plain"}">${esc(t(UI.aiLive ? "ai_live" : UI.aiLive === false ? "ai_offline" : "ai_connecting"))}</span></div>
    <div class="banner">${icon("shield")}<span class="small">${esc(t("ai_disclaimer"))}</span></div>
    ${caregiverBanner()}
    <div class="chat" id="chat" aria-live="polite">${UI.chat.map((m, i) => chatMsg(m, i)).join("")}</div>
    <div class="suggest">${sugg.map((k) => `<button class="chip sm" data-act="ai-suggest" data-v="${k}">${esc(t(k))}</button>`).join("")}</div>
    <form class="composer" data-form="chat"><input class="input" id="chat-in" name="q" autocomplete="off" placeholder="${esc(t("ai_ph"))}" ${UI.chatBusy ? "disabled" : ""}>
      ${UI.chatBusy ? `<button type="button" class="btn sm secondary" data-act="ai-stop">${esc(t("stop"))}</button>` : `<button class="btn sm" type="submit" aria-label="${esc(t("send"))}">${flipIcon("send", "ico-sm")}</button>`}</form>
  </div>`);
}
function chatMsg(m, i) {
  if (m.role === "user") return `<div class="msg me">${esc(m.text)}</div>`;
  return `<div class="msg ai ${m.emergency ? "emergency" : ""} ${m.pending ? "thinking" : ""}" id="msg-${i}">${esc(m.text)}${m.used?.length ? `<span class="meta">${esc(t("ai_used"))}: ${m.used.map((u) => t(u)).join(", ")}${m.via ? " · " + esc(t(m.via)) : ""}</span>` : m.via ? `<span class="meta">${esc(t(m.via))}</span>` : ""}</div>`;
}
let aiCtl = null;
async function askAI(q) {
  const pid = PID(); if (!q.trim() || UI.chatBusy) return;
  UI.chat.push({ role: "user", text: q });
  if (isEmergencyText(q)) { UI.chat.push({ role: "assistant", text: t("ai_emergency"), emergency: true, via: "ai_via_safety" }); render(); scrollChat(); return; }
  const sample = UI.aiLive ? await window.claude.use("sample").catch(() => null) : null;
  if (!sample) { const a = aiLocalAnswer(q, pid); UI.chat.push({ role: "assistant", text: a.text, used: a.used, emergency: a.emergency, via: "ai_via_local" }); render(); scrollChat(); return; }
  const msg = { role: "assistant", text: t("thinking"), pending: true, via: "ai_via_live", used: ["src_profile", "src_meds", "src_appts", "src_health"] };
  UI.chat.push(msg); UI.chatBusy = true; render(); scrollChat();
  const idx = UI.chat.length - 1;
  aiCtl = new AbortController();
  const turns = [{ role: "user", content: aiRules({ en: "English", ar: "Arabic", zh: "Simplified Chinese" }[I18N.lang], pid) }, { role: "assistant", content: "Understood. I'll follow those rules." }];
  UI.chat.slice(1, -2).slice(-8).forEach((m) => turns.push({ role: m.role === "user" ? "user" : "assistant", content: m.text }));
  turns.push({ role: "user", content: q });
  try {
    const { text } = await sample(turns, { cache: false, signal: aiCtl.signal, modelTier: "quick", onText: ({ text }) => { msg.text = text; msg.pending = false; const el = $("#msg-" + idx); if (el) { el.classList.remove("thinking"); el.firstChild.textContent = text; } } });
    msg.text = text; msg.pending = false;
  } catch (e) {
    msg.pending = false;
    if (e.code === "cancelled") msg.text = e.text || t("ai_stopped");
    else { if (["not_granted", "sampling_disabled", "not_declared", "capability_disabled"].includes(e.code)) UI.aiLive = false; const a = aiLocalAnswer(q, pid); msg.text = a.text; msg.used = a.used; msg.via = "ai_via_local"; }
  }
  UI.chatBusy = false; render(); scrollChat();
}
function scrollChat() { const c = $("#chat"); if (c) c.lastElementChild?.scrollIntoView({ block: "end", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }

/* ---------- NOTIFICATIONS ---------- */
const NOTIF_CATS = ["appointments", "medications", "health", "ai", "clinic", "caregiver", "system"];
const NOTIF_ICON = { appointments: "calendar", medications: "pill", health: "heart", ai: "sparkle", clinic: "hospital", caregiver: "users", system: "info" };
function notificationsView() {
  const uid_ = App.user.id; const cat = UI.notifCat;
  const list = DB.notifications.filter((n) => n.userId === uid_ && (cat === "all" || n.cat === cat));
  const msgs = DB.messages.filter((m) => m.patientId === uid_);
  return shell(`${header(t("notifications"), { back: true, noBell: true, extra: `<button class="btn sm ghost" data-act="notif-all-read">${esc(t("mark_all_read"))}</button>` })}<div class="page stack-lg">
    <div class="chips"><button class="chip sm ${cat === "all" ? "on" : ""}" data-act="notif-cat" data-v="all">${esc(t("all"))}</button>${NOTIF_CATS.map((c) => `<button class="chip sm ${cat === c ? "on" : ""}" data-act="notif-cat" data-v="${c}">${esc(t("nc_" + c))}</button>`).join("")}</div>
    <div class="stack">${list.length ? list.map((n) => `<button class="card tap row-top reveal" data-act="notif-open" data-id="${n.id}" style="${n.read ? "box-shadow:none" : "border-color:var(--accent)"}"><div class="iconwrap ${n.cat === "health" ? "warn" : ""}">${icon(NOTIF_ICON[n.cat])}</div><div class="grow"><div class="row between"><span class="xs faint">${esc(t("nc_" + n.cat))}</span><span class="xs faint">${esc(relTime(n.at))}</span></div><p style="margin-top:2px;${n.read ? "" : "font-weight:650"}">${esc(tx(n.msg))}</p></div>${n.read ? "" : `<span class="pill info plain" aria-label="${esc(t("unread"))}">•</span>`}</button>`).join("") : emptyState("bell", t("no_notifs"), t("no_notifs_d"))}</div>
    ${msgs.length && (cat === "all" || cat === "clinic") ? `<section class="stack"><h3>${esc(t("clinic_messages"))}</h3>${msgs.map((m) => `<div class="card flat stack-sm"><span class="xs faint">${esc(clinicName(CLINICS.find((c) => c.id === m.clinicId)))} · ${esc(relTime(m.at))}</span><p>${esc(m.text)}</p></div>`).join("")}</section>` : ""}
    <button class="btn secondary" data-go="settings" data-v="notifications">${icon("settings", "ico-sm")} ${esc(t("notif_prefs"))}</button>
  </div>`, { tab: "home" });
}

/* ---------- PROFILE ---------- */
function profileView() {
  const me = DB.profiles[App.user.id]; const u = App.user;
  const links = isCaregiver() ? [["settings", "settings", "settings"], ["emails", "mail", "email_outbox"], ["platform", "layers", "about_platform"]]
    : [["profile-edit", "edit", "edit_profile"], ["caregiver", "users", "caregivers"], ["documents", "file", "documents"], ["timeline", "activity", "health_timeline"], ["journal", "journal", "journal"], ["notifications", "bell", "notifications"], ["settings", "settings", "settings"], ["plus", "star", "wellpoint_plus"], ["emails", "mail", "email_outbox"], ["platform", "layers", "about_platform"]];
  return shell(`${header("")}<div class="page stack-lg">
    <div class="row"><div class="avatar lg">${esc(initials(me.name || u.name))}</div><div class="grow"><h2>${esc(me.name || u.name)}</h2><p class="small muted">${esc(u.email || u.phone)}</p><div class="row wrap" style="gap:6px;margin-top:4px"><span class="pill info">${esc(t("role_" + u.role))}</span>${me.plan === "plus" ? `<span class="pill good">Wellpoint Plus</span>` : ""}</div></div></div>
    ${isCaregiver() ? "" : `<section class="card stack"><h3>${esc(t("health_info"))}</h3><dl class="kv">
      <dt>${esc(t("age"))}</dt><dd>${esc(ageFrom(me.dob) != null ? fmtNum(ageFrom(me.dob)) : "—")}</dd><dt>${esc(t("gender"))}</dt><dd>${esc(me.gender ? t(me.gender) : "—")}</dd>
      <dt>${esc(t("weight_kg"))}</dt><dd class="num">${esc(me.weight ?? "—")}</dd><dt>${esc(t("height_cm"))}</dt><dd class="num">${esc(me.height ?? "—")}</dd>
      <dt>${esc(t("conditions"))}</dt><dd>${esc((me.conditions || []).map((c) => t("cond_" + c)).join(", ") || "—")}</dd><dt>${esc(t("allergies"))}</dt><dd>${esc((me.allergies || []).join(", ") || t("none_recorded"))}</dd>
      <dt>${esc(t("emergency_contact"))}</dt><dd>${esc(me.emergency?.name || "—")} ${me.emergency?.phone ? `<span class="num">${esc(me.emergency.phone)}</span>` : ""}</dd><dt>${esc(t("preferred_clinic"))}</dt><dd>${esc(clinicName(CLINICS.find((c) => c.id === me.primaryClinic)) || "—")}</dd>
      <dt>${esc(t("governorate"))}</dt><dd>${esc(me.gov ? t("gov_" + me.gov) : "—")}</dd></dl></section>`}
    <section class="card stack"><div class="row between"><div><b>${esc(t("language"))}</b></div>${langSwitcher()}</div><div class="divider"></div>
      <div class="row between"><b>${esc(t("theme"))}</b><button class="btn sm secondary" data-act="theme">${icon("moon", "ico-sm")} ${esc(themeLabel())}</button></div><div class="divider"></div>
      <div class="row between"><div class="grow"><b>${esc(t("simple_mode"))}</b><p class="xs muted">${esc(t("simple_mode_d"))}</p></div><button class="switch ${me.simple ? "on" : ""}" data-act="toggle-simple" role="switch" aria-checked="${!!me.simple}" aria-label="${esc(t("simple_mode"))}"></button></div>
      ${isCaregiver() ? "" : `<div class="divider"></div><div class="row between"><div class="grow"><b>${esc(t("dashboard_mode"))}</b><p class="xs muted">${esc(t("dashboard_mode_d"))}</p></div><div class="seg">${["general", "chronic"].map((m) => `<button class="${me.mode === m ? "on" : ""}" data-act="set-mode" data-v="${m}">${esc(t("mode_" + m))}</button>`).join("")}</div></div>`}</section>
    <section class="card list" style="padding:4px 16px">${links.map(([r, ic, k]) => `<button class="li" data-go="${r}" style="background:none;border-left:0;border-right:0;border-top:0;width:100%;text-align:start;color:inherit"><span class="iconwrap">${icon(ic)}</span><span class="grow">${esc(t(k))}</span>${flipIcon("chevron", "ico-sm")}</button>`).join("")}</section>
    <button class="btn secondary" data-act="logout">${icon("logout", "ico-sm")} ${esc(t("sign_out"))}</button>
  </div>`);
}
function profileEditView() {
  const me = DB.profiles[App.user.id];
  const f = UI.pf ??= { name: me.name || "", dob: me.dob || "", gender: me.gender || "", weight: me.weight ?? "", height: me.height ?? "", gov: me.gov || "", nationality: me.nationality || "", ecName: me.emergency?.name || "", ecPhone: me.emergency?.phone || "", allergies: (me.allergies || []).join(", "), primaryClinic: me.primaryClinic || "", conditions: [...(me.conditions || [])], goals: [...(me.goals || [])] };
  return shell(`${header(t("edit_profile"), { back: true })}<div class="page stack-lg"><form class="stack" data-form="profile" novalidate>
    ${field("pf-name", t("full_name"), inputEl("pf-name", "pf.name"))}
    <div class="grid-2">${field("pf-dob", t("dob"), inputEl("pf-dob", "pf.dob", { type: "date" }))}${field("pf-gender", t("gender"), selectEl("pf-gender", "pf.gender", [["", "—"], ["male", t("male")], ["female", t("female")], ["prefer_not", t("prefer_not")]]))}</div>
    <div class="grid-2">${field("pf-w", t("weight_kg"), inputEl("pf-w", "pf.weight", { type: "number" }))}${field("pf-h", t("height_cm"), inputEl("pf-h", "pf.height", { type: "number" }))}</div>
    <div class="grid-2">${field("pf-gov", t("governorate"), selectEl("pf-gov", "pf.gov", govOptions()))}${field("pf-nat", t("nationality_opt"), inputEl("pf-nat", "pf.nationality"))}</div>
    <div class="grid-2">${field("pf-ec", t("emergency_name"), inputEl("pf-ec", "pf.ecName"))}${field("pf-ecp", t("emergency_phone"), inputEl("pf-ecp", "pf.ecPhone", { type: "tel" }))}</div>
    ${field("pf-all", t("allergies"), inputEl("pf-all", "pf.allergies"), t("comma_sep"))}
    ${field("pf-pc", t("preferred_clinic"), selectEl("pf-pc", "pf.primaryClinic", [["", "—"], ...CLINICS.map((c) => [c.id, clinicName(c)])]))}
    <span class="label">${esc(t("conditions"))}</span><div class="chips">${CONDITIONS.map((c) => `<button type="button" class="chip sm ${f.conditions.includes(c) ? "on" : ""}" data-act="pf-toggle" data-k="conditions" data-v="${c}">${esc(t("cond_" + c))}</button>`).join("")}</div>
    <span class="label">${esc(t("goals"))}</span><div class="chips">${GOALS.map((c) => `<button type="button" class="chip sm ${f.goals.includes(c) ? "on" : ""}" data-act="pf-toggle" data-k="goals" data-v="${c}">${esc(t("goal_" + c))}</button>`).join("")}</div>
    <button class="btn xl block" type="submit">${esc(t("save"))}</button></form></div>`, { tab: "profile" });
}

/* ---------- CAREGIVERS (patient side) ---------- */
const PERM_KEYS = ["meds", "appts", "health", "reminders", "docs"];
function caregiverView() {
  const pid = App.user.id; const list = DB.caregivers.filter((c) => c.patientId === pid && c.status !== "removed");
  const hist = DB.audit.filter((a) => a.patientId === pid && a.action.startsWith("au_caregiver")).slice(0, 12);
  const consent = DB.profiles[pid].consent?.shareWithCaregivers;
  return shell(`${header(t("caregivers"), { back: true })}<div class="page stack-lg">
    <div class="stack-sm"><h1>${esc(t("caregivers"))}</h1><p class="muted">${esc(t("caregivers_sub"))}</p></div>
    ${consent ? "" : `<div class="banner warn">${icon("lock")}<div class="stack-sm"><span class="small">${esc(t("cg_consent_off"))}</span><div><button class="btn sm" data-act="consent" data-k="shareWithCaregivers">${esc(t("turn_on"))}</button></div></div></div>`}
    ${list.length ? list.map((c) => `<section class="card stack"><div class="row"><div class="avatar">${esc(initials(c.name))}</div><div class="grow"><h4>${esc(c.name)}</h4><p class="xs muted">${esc(t("rel_" + c.relation))} · ${esc(c.email)}</p></div>${statusPill(c.status)}</div>
      <div class="list">${PERM_KEYS.map((k) => `<div class="li"><span class="grow small">${esc(t("perm_" + k))}</span><button class="switch ${c.perms[k] ? "on" : ""}" data-act="cg-perm" data-id="${c.id}" data-k="${k}" role="switch" aria-checked="${!!c.perms[k]}" aria-label="${esc(t("perm_" + k))}"></button></div>`).join("")}</div>
      <div class="row">${c.status === "invited" ? `<button class="btn sm secondary grow" data-act="cg-accept" data-id="${c.id}">${esc(t("sim_accept"))}</button>` : ""}<button class="btn sm ghost grow" style="color:var(--bad)" data-act="cg-remove" data-id="${c.id}">${esc(t("remove_access"))}</button></div></section>`).join("")
      : emptyState("users", t("no_caregivers"), t("no_caregivers_d"))}
    <section class="card stack"><h3>${esc(t("invite_caregiver"))}</h3><form class="stack" data-form="cg-invite" novalidate>
      <div class="grid-2">${field("cg-name", t("full_name"), `<input class="input" id="cg-name" name="name" required>`)}${field("cg-rel", t("relationship"), `<select class="input" id="cg-rel" name="relation">${["parent", "child", "spouse", "sibling", "caregiver"].map((r) => `<option value="${r}">${esc(t("rel_" + r))}</option>`).join("")}</select>`)}</div>
      ${field("cg-email", t("email"), `<input class="input" id="cg-email" name="email" type="email" required>`)}
      <span class="label">${esc(t("they_can"))}</span><div class="chips">${PERM_KEYS.map((k) => `<label class="chip sm"><input type="checkbox" name="perm_${k}" ${["meds", "appts", "reminders"].includes(k) ? "checked" : ""}> ${esc(t("perm_" + k))}</label>`).join("")}</div>
      <button class="btn" type="submit">${icon("send", "ico-sm")} ${esc(t("send_invite"))}</button></form></section>
    <section class="card stack"><h3>${esc(t("access_history"))}</h3>${hist.length ? `<div class="list">${hist.map((h) => `<div class="li"><span class="grow small">${esc(h.actorName)} — ${esc(t(h.action))}</span><span class="xs faint">${esc(relTime(h.at))}</span></div>`).join("")}</div>` : `<p class="small muted">${esc(t("no_history"))}</p>`}</section>
  </div>`, { tab: "profile" });
}

/* ---------- SETTINGS ---------- */
function settingsView() {
  const me = DB.profiles[App.user.id]; const pr = me.prefs;
  const sessions = DB.sessions.filter((s) => s.userId === App.user.id && !s.revoked);
  const myAudit = DB.audit.filter((a) => a.actor === App.user.id || a.patientId === App.user.id).slice(0, 10);
  const sw = (on, act, k, label) => `<button class="switch ${on ? "on" : ""}" data-act="${act}" data-k="${k}" role="switch" aria-checked="${!!on}" aria-label="${esc(label)}"></button>`;
  return shell(`${header(t("settings"), { back: true })}<div class="page stack-lg">
    <section class="card stack" id="notifications"><h3>${esc(t("notif_prefs"))}</h3>
      <div class="list">${NOTIF_CATS.map((c) => `<div class="li"><span class="iconwrap">${icon(NOTIF_ICON[c], "ico-sm")}</span><span class="grow small">${esc(t("nc_" + c))}</span>${sw(pr.categories[c] !== false, "pref-cat", c, t("nc_" + c))}</div>`).join("")}</div>
      <div class="grid-2">${field("qs", t("quiet_start"), `<input class="input" type="time" id="qs" value="${pr.quietStart}" data-act-change="pref-time" data-k="quietStart">`)}${field("qe", t("quiet_end"), `<input class="input" type="time" id="qe" value="${pr.quietEnd}" data-act-change="pref-time" data-k="quietEnd">`)}</div>
      <p class="hint">${esc(t("quiet_note"))}</p>
      <div class="grid-2">${field("wk", t("wake_time"), `<input class="input" type="time" id="wk" value="${pr.wake}" data-act-change="pref-time" data-k="wake">`)}${field("sl", t("sleep_time"), `<input class="input" type="time" id="sl" value="${pr.sleep}" data-act-change="pref-time" data-k="sleep">`)}</div></section>
    <section class="card stack"><div class="row between"><h3>${esc(t("email_prefs"))}</h3>${sw(pr.email, "pref-email", "all", t("email_prefs"))}</div>
      <div class="list">${Object.keys(pr.emailTypes).map((k) => `<div class="li"><span class="grow small">${esc(t("et_" + k))}</span>${sw(pr.email && pr.emailTypes[k], "pref-email", k, t("et_" + k))}</div>`).join("")}</div><p class="hint">${esc(t("email_note"))}</p></section>
    ${isCaregiver() ? "" : `<section class="card stack"><h3>${esc(t("privacy_sharing"))}</h3>
      ${[["shareWithClinics", "consent_clinics"], ["shareWithCaregivers", "consent_caregivers"], ["research", "consent_research"]].map(([k, l]) => `<div class="row"><div class="grow"><b class="small">${esc(t(l))}</b><p class="xs muted">${esc(t(l + "_d"))}</p></div>${sw(me.consent?.[k], "consent", k, t(l))}</div>`).join("")}
      <p class="hint">${esc(t("no_sell"))}</p><button class="btn sm secondary" data-act="privacy">${esc(t("privacy_policy"))}</button></section>`}
    <section class="card stack"><h3>${esc(t("security"))}</h3>
      <form class="stack" data-form="change-pw" novalidate>${field("cp-old", t("current_password"), `<input class="input" id="cp-old" name="old" type="password" autocomplete="current-password">`)}${field("cp-new", t("new_password"), `<input class="input" id="cp-new" name="new" type="password" autocomplete="new-password">`, t("pw_rules"))}<button class="btn sm" type="submit">${esc(t("change_password"))}</button></form>
      <div class="divider"></div><h4>${esc(t("active_sessions"))}</h4><div class="list">${sessions.map((s) => `<div class="li"><span class="iconwrap">${icon("lock", "ico-sm")}</span><div class="grow"><b class="small">${esc(s.device)}</b><p class="xs muted">${esc(t("signed_in"))} ${esc(relTime(s.createdAt))}${s.id === App.sessionId ? " · " + esc(t("this_device")) : ""}</p></div>${s.id === App.sessionId ? "" : `<button class="btn sm ghost" data-act="revoke" data-id="${s.id}">${esc(t("sign_out"))}</button>`}</div>`).join("")}</div>
      <div class="divider"></div><h4>${esc(t("audit_log"))}</h4><div class="list">${myAudit.map((a) => `<div class="li"><span class="grow xs">${esc(a.actorName)} — ${esc(t(a.action))}</span><span class="xs faint">${esc(relTime(a.at))}</span></div>`).join("")}</div></section>
    <section class="card stack" style="border-color:var(--bad-soft)"><h3>${esc(t("delete_account"))}</h3><p class="small muted">${esc(t("delete_account_d"))}</p><div><button class="btn sm danger" data-act="delete-account">${esc(t("delete_account"))}</button></div></section>
  </div>`, { tab: "profile" });
}

/* ---------- PLUS (monetization) ---------- */
function plusView() {
  const me = DB.profiles[App.user.id];
  const feats = ["plus_f1", "plus_f2", "plus_f3", "plus_f4", "plus_f5"];
  return shell(`${header("Wellpoint Plus", { back: true })}<div class="page stack-lg">
    <div class="stack-sm"><span class="eyebrow">${esc(t("wellpoint_plus"))}</span><h1>${esc(t("plus_title"))}</h1><p class="muted">${esc(t("plus_sub"))}</p></div>
    <section class="card stack"><div class="row between"><h3>${esc(t("plan_free"))}</h3>${me.plan !== "plus" ? `<span class="pill info">${esc(t("current_plan"))}</span>` : ""}</div><p class="small muted">${esc(t("plan_free_d"))}</p></section>
    <section class="card stack" style="border-color:var(--accent)"><div class="row between"><h3>Wellpoint Plus</h3>${me.plan === "plus" ? `<span class="pill good">${esc(t("current_plan"))}</span>` : `<span class="num"><b>${esc(t("plus_price"))}</b></span>`}</div>
      <ul class="stack-sm" style="margin:0;padding-inline-start:18px">${feats.map((f) => `<li class="small">${esc(t(f))}</li>`).join("")}</ul>
      <button class="btn" data-act="toggle-plan">${esc(me.plan === "plus" ? t("plus_cancel") : t("plus_try"))}</button><p class="hint">${esc(t("plus_demo_note"))}</p></section>
    <div class="banner good">${icon("shield")}<span class="small">${esc(t("no_sell"))}</span></div></div>`, { tab: "profile" });
}

/* ---------- EMAIL OUTBOX (simulated delivery) ---------- */
function renderEmail(e) {
  const prev = I18N.lang; I18N.lang = e.lang || prev;
  const p = { ...e.params, date: e.params.date ? fmtDate(e.params.date, { weekday: "long", day: "numeric", month: "long" }) : "", time: e.params.time ? fmtTime(e.params.time) : "" };
  const out = { subject: t(e.template + "_subj", p), body: t(e.template + "_body", p), footer: t("email_footer") };
  I18N.lang = prev; return out;
}
function emailsView() {
  const mine = DB.emails.filter((e) => e.userId === App.user.id);
  return shell(`${header(t("email_outbox"), { back: true })}<div class="page stack-lg">
    <div class="banner">${icon("info")}<span class="small">${esc(t("outbox_note"))}</span></div>
    ${mine.length ? mine.map((e) => { const r = renderEmail(e); return `<article class="email reveal"><div class="email-head"><div class="row between"><b>${esc(r.subject)}</b><span class="xs faint">${esc(relTime(e.at))}</span></div><span class="xs muted">${esc(t(e.channel === "sms" ? "sms_to" : "email_to"))}: ${esc(e.to || "—")} · ${esc(LANG_NAMES[e.lang] || e.lang)}</span></div><div class="email-body" dir="${e.lang === "ar" ? "rtl" : "ltr"}" lang="${e.lang}">${esc(r.body).replace(/\n/g, "<br>")}<p class="xs faint" style="margin-top:12px">${esc(r.footer)}</p></div></article>`; }).join("") : emptyState("mail", t("no_emails"), "")}
  </div>`, { tab: "profile" });
}
function outboxForPending() {
  const uid_ = UI.auth.pending || UI.auth.resetUser; const mine = DB.emails.filter((e) => e.userId === uid_).slice(0, 3);
  return `<h3>${esc(t("email_outbox"))}</h3><div class="stack" style="margin-top:12px">${mine.map((e) => { const r = renderEmail(e); return `<article class="email"><div class="email-head"><b>${esc(r.subject)}</b><br><span class="xs muted">${esc(e.to)}</span></div><div class="email-body">${esc(r.body).replace(/\n/g, "<br>")}</div></article>`; }).join("") || `<p class="muted">${esc(t("no_emails"))}</p>`}<button class="btn secondary" data-act="sheet-close">${esc(t("close"))}</button></div>`;
}

/* ---------- ROUTINE PLANNER (AI asks, then fits medications to the routine) ---------- */
const RT_STEPS = ["wake", "breakfast", "lunch", "dinner", "sleep", "busy", "group"];
function showAlarm(a) {
  const m = DB.medications.find((x) => x.id === a.medId); if (!m) return;
  UI.alarm = a; renderLayer();
  Ring.start(t("time_for_med"), `${fmtTime(a.time)} · ${alarmLabel(m)}`, a.key);
}
function rtAnswerText(k, v) {
  if (k === "busy") return v ? `${fmtTime(v[0])} – ${fmtTime(v[1])}` : t("rt_no_busy");
  if (k === "group") return t(v ? "rt_yes_group" : "rt_no_group");
  return v ? fmtTime(v) : t("rt_skip_meal");
}
function routineView() {
  const pid = PID(); const p = DB.profiles[pid];
  const meds = DB.medications.filter((m) => m.patientId === pid && m.active && FREQ_COUNT[m.frequency]);
  if (!meds.length) return shell(`${header(t("rt_title"), { back: true })}<div class="page stack-lg">${emptyState("pill", t("rt_no_meds"), "", `<button class="btn" data-go="med-edit">${esc(t("add_med"))}</button>`)}</div>`, { tab: "meds" });
  const r = UI.rt ??= { step: 0, a: { wake: p.routine?.wake || p.prefs.wake || "07:00", breakfast: p.routine ? p.routine.breakfast : "07:30", lunch: p.routine ? p.routine.lunch : "13:30", dinner: p.routine ? p.routine.dinner : "20:00", sleep: p.routine?.sleep || p.prefs.sleep || "23:00", busy: p.routine?.busy ?? null, group: p.routine?.group ?? true } };
  const bubbles = [`<div class="msg ai">${esc(t("rt_intro"))}</div>`];
  RT_STEPS.slice(0, r.step).forEach((k) => { bubbles.push(`<div class="msg ai">${esc(t("rt_q_" + k))}</div>`, `<div class="msg me">${esc(rtAnswerText(k, r.a[k]))}</div>`); });
  let control = "";
  if (r.step < RT_STEPS.length) {
    const k = RT_STEPS[r.step];
    bubbles.push(`<div class="msg ai" id="rt-q">${esc(t("rt_q_" + k))}</div>`);
    if (["wake", "breakfast", "lunch", "dinner", "sleep"].includes(k)) control = `<div class="rt-answer"><input class="input" type="time" id="rt-in" value="${esc(r.a[k] || (k === "breakfast" ? "07:30" : k === "lunch" ? "13:30" : k === "dinner" ? "20:00" : "07:00"))}" aria-label="${esc(t("rt_q_" + k))}"><button class="btn" data-act="rt-answer">${esc(t("continue"))}</button></div>${["breakfast", "lunch", "dinner"].includes(k) ? `<button class="chip" data-act="rt-skip">${esc(t("rt_skip_meal"))}</button>` : ""}`;
    if (k === "busy") control = `<div class="grid-2">${field("rt-from", t("rt_busy_from"), `<input class="input" type="time" id="rt-from" value="${esc(r.a.busy?.[0] || "08:00")}">`)}${field("rt-to", t("rt_busy_to"), `<input class="input" type="time" id="rt-to" value="${esc(r.a.busy?.[1] || "14:00")}">`)}</div><div class="row wrap"><button class="btn" data-act="rt-answer">${esc(t("continue"))}</button><button class="chip" data-act="rt-skip">${esc(t("rt_no_busy"))}</button></div>`;
    if (k === "group") control = `<div class="row wrap"><button class="btn" data-act="rt-group" data-v="1">${esc(t("rt_yes_group"))}</button><button class="btn secondary" data-act="rt-group" data-v="0">${esc(t("rt_no_group"))}</button></div>`;
  }
  let result = "";
  if (r.plan) {
    result = `<section class="card stack" id="rt-result"><span class="eyebrow">${esc(t("rt_title"))}</span><h2>${esc(t("rt_result_title"))}</h2><p class="small muted">${esc(t("rt_result_d"))}</p>
      <div class="list">${r.plan.map((o) => `<div class="li" style="align-items:flex-start"><div class="iconwrap">${icon("pill", "ico-sm")}</div><div class="grow stack-sm"><b>${esc(o.med.name)}</b><span class="xs muted">${esc(o.med.dose || "")} · ${esc(t("freq_" + o.med.frequency))} · ${esc(t("food_" + o.med.food))}</span>
        <div class="slots">${o.times.map((tm) => `<span class="slot on">${esc(fmtTime(tm))}</span>`).join("")}</div>${whyBlock(o.reasons, t("why_these_times"))}</div></div>`).join("")}</div>
      <div id="rt-ai" class="small muted"></div>
      <p class="hint">${esc(t("why_times_never_dose"))}</p>
      <div class="row wrap"><button class="btn good" data-act="rt-apply">${icon("check", "ico-sm")} ${esc(t("rt_apply"))}</button><button class="btn ghost" data-act="rt-restart">${esc(t("rt_edit_routine"))}</button></div></section>`;
  }
  return shell(`${header(t("rt_title"), { back: true })}<div class="page stack-lg">
    <div class="chat">${bubbles.join("")}</div>${control ? `<div class="stack rt-control">${control}</div>` : ""}${result}
  </div>`, { tab: "meds" });
}
function clockSheet(items) {
  const ua = navigator.userAgent; const isAndroid = /Android/i.test(ua), isIOS = /iPhone|iPad|iPod/i.test(ua);
  const showA = isAndroid || !isIOS, showI = isIOS || !isAndroid;
  return `<div class="stack"><h3>${esc(t("clk_title"))}</h3><p class="small muted">${esc(t("clk_d"))}</p>
    <div class="list">${items.map(({ med, time }) => { const label = alarmLabel(med); return `<div class="li" style="align-items:flex-start"><span class="clk-time num">${esc(fmtTime(time))}</span><div class="grow stack-sm"><span class="xs faint">${esc(t("clk_label"))}</span><b class="small" style="overflow-wrap:anywhere">${esc(label)}</b>
      <div class="row wrap" style="gap:6px">${showA ? `<a class="btn sm" href="${esc(androidAlarmHref(time, label))}">${icon("clock", "ico-sm")} ${esc(t("clk_android"))}</a>` : ""}${showI ? `<a class="btn sm ${showA ? "secondary" : ""}" href="${esc(iosShortcutHref(time, label))}">${icon("clock", "ico-sm")} ${esc(t("clk_ios"))}</a>` : ""}<button class="btn sm ghost" data-act="copy" data-v="${esc(time + " — " + label)}">${icon("copy", "ico-sm")}</button></div></div></div>`; }).join("")}</div>
    ${showI ? `<details class="why"><summary>${icon("info", "ico-sm")} ${esc(t("clk_ios_setup"))}</summary><p class="small muted" style="margin-top:8px">${esc(t("clk_ios_help"))}</p></details>` : ""}
    <div class="divider"></div>
    <div class="stack-sm"><b class="small">${esc(t("clk_calendar"))}</b><span class="xs muted">${esc(t("clk_calendar_d"))}</span><button class="btn secondary" data-act="clock-ics">${icon("calendar", "ico-sm")} ${esc(t("clk_calendar"))}</button></div>
    <p class="hint">${esc(t("clk_note"))}</p>
    <button class="btn ghost" data-act="sheet-close">${esc(t("close"))}</button></div>`;
}

const PATIENT_VIEWS = {
  home: homeView, discover: discoverView, clinic: clinicProfileView, book: bookView, "appt-done": apptDoneView, appointments: appointmentsView,
  meds: medsView, "med-edit": medEditView, routine: routineView, health: healthView, measure: measureView, checkin: checkinView, summary: summaryView, timeline: timelineView,
  journal: journalView, documents: documentsView, ai: aiView, notifications: notificationsView, profile: profileView, "profile-edit": profileEditView,
  caregiver: caregiverView, settings: settingsView, plus: plusView, emails: emailsView, platform: () => platformView()
};
