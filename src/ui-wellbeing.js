/* ============================================================
   Calm-engagement layer for the patient home (experimental)
   - Health tree: grows with today's care actions, never punishes;
     a neglected tree looks "thirsty" and recovers on the next action.
   - Next step now: one clear action chosen by time of day.
   - Medication countdown: live time until the next dose.
   - Streak with a weekly rest-day shield.
   - Celebration: haptic tap, confetti, occasional surprise tip.
   ============================================================ */
const WATER_GOAL = 8;
const TIP_COUNT = 10;
const habitsFor = (pid, date = today()) => (DB.habits || []).filter((h) => h.patientId === pid && h.date === date);
const waterToday = (pid) => habitsFor(pid).filter((h) => h.kind === "water").length;

function logHabit(kind) {
  const pid = PID(); if (!pid || isCaregiver()) return;
  (DB.habits ||= []).push({ id: uid("hb"), patientId: pid, date: today(), kind, at: new Date().toISOString() });
  saveDB();
}
function activeOn(pid, date) {
  if ((DB.habits || []).some((h) => h.patientId === pid && h.date === date)) return true;
  if (DB.doseLog.some((d) => d.patientId === pid && d.date === date && d.status === "taken")) return true;
  return DB.checkins.some((c) => c.patientId === pid && c.at.slice(0, 10) === date);
}
/* Consecutive active days. One missed day per 7 is covered by a rest-day shield,
   so a single sick day never wipes out a long streak. */
function streakInfo(pid) {
  let n = 0, shieldUsed = null, d = activeOn(pid, today()) ? today() : addDays(today(), -1);
  for (let i = 0; i < 365; i++) {
    if (activeOn(pid, d)) n++;
    else if (n > 0 && (!shieldUsed || daysBetween(d, shieldUsed) >= 7) && activeOn(pid, addDays(d, -1))) shieldUsed = d;
    else break;
    d = addDays(d, -1);
  }
  return { n, shieldUsed, shieldReady: !shieldUsed || daysBetween(shieldUsed, today()) >= 7, today: activeOn(pid, today()) };
}
function treeScore(pid) {
  const sched = scheduleFor(pid); const taken = sched.filter((i) => i.status === "taken").length;
  const meds = sched.length ? taken / sched.length : 1;
  const water = Math.min(1, waterToday(pid) / WATER_GOAL);
  const other = habitsFor(pid).some((h) => h.kind !== "water") || DB.checkins.some((c) => c.patientId === pid && c.at.slice(0, 10) === today()) ? 1 : 0;
  return Math.round((water * 0.4 + meds * 0.35 + other * 0.25) * 100);
}
function treeSvg(score, streak) {
  const stage = score < 30 ? "thirsty" : score < 70 ? "growing" : "bloom";
  const leaves = 4 + Math.round(score / 7);
  const spots = [[100, 52], [78, 62], [122, 62], [64, 82], [136, 82], [88, 74], [112, 74], [100, 70], [72, 100], [128, 100], [92, 92], [108, 92], [56, 104], [144, 104], [100, 88], [82, 46], [118, 46], [100, 34]];
  const fruit = Math.min(streak, 5);
  const fruitSpots = [[86, 66], [116, 84], [96, 98], [126, 66], [74, 90]];
  const leaf = (x, y, i) => `<circle class="leaf" cx="${x}" cy="${y}" r="${13 + (i % 3) * 2}" style="animation-delay:${(i % 6) * 0.18}s"/>`;
  return `<svg class="tree ${stage}" viewBox="0 0 200 170" role="img" aria-label="${esc(t("tree_" + stage))}">
    <ellipse cx="100" cy="158" rx="58" ry="7" class="soil"/>
    <path class="trunk" d="M100 158c-2-18-3-34 0-52M100 120c-8-6-16-10-26-12M100 112c9-7 18-10 28-11"/>
    <g class="crown">${spots.slice(0, leaves).map(([x, y], i) => leaf(x, y, i)).join("")}
    ${fruitSpots.slice(0, fruit).map(([x, y]) => `<circle class="fruit" cx="${x}" cy="${y}" r="4.5"/>`).join("")}</g>
  </svg>`;
}
function nextDose(pid) {
  const now = new Date();
  const at = (date, hm) => new Date(`${date}T${hm}:00`);
  const due = scheduleFor(pid).filter((i) => i.status === "due");
  const late = due.find((i) => at(today(), i.time) <= now);
  if (late) return { item: late, ts: at(today(), late.time).getTime(), late: true };
  const up = due.find((i) => at(today(), i.time) > now);
  if (up) return { item: up, ts: at(today(), up.time).getTime() };
  const tmr = addDays(today(), 1); const first = scheduleFor(pid, tmr)[0];
  return first ? { item: first, ts: at(tmr, first.time).getTime(), tomorrow: true } : null;
}
function fmtCountdown(ts) {
  const s = Math.max(0, Math.floor((ts - Date.now()) / 1000));
  if (s < 60) return t("cd_now");
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? t("cd_hm", { h: fmtNum(h), m: fmtNum(m) }) : t("cd_ms", { m: fmtNum(m), s: fmtNum(sec).padStart(2, fmtNum(0)) });
}
function courseLeft(m) { return m.end ? Math.max(0, daysBetween(today(), m.end)) : null; }

/* One clear action, chosen by the hour; a due dose always wins. */
function nextStep(pid) {
  const nd = allow("meds") ? nextDose(pid) : null;
  if (nd && !nd.tomorrow && nd.ts - Date.now() < 30 * 60000) return { key: "ns_dose", p: { med: nd.item.med.name }, act: "dose", data: `data-med="${nd.item.med.id}" data-time="${nd.item.time}" data-s="taken"`, ic: "pill" };
  const h = new Date().getHours(); const done = new Set(habitsFor(pid).map((x) => x.kind));
  const water = waterToday(pid), expected = Math.max(1, Math.round(((h - 7) / 15) * WATER_GOAL));
  if (water < WATER_GOAL && (water < expected || h < 11)) return { key: "ns_water", p: { n: fmtNum(water + 1) }, act: "habit-water", ic: "drop" };
  if (h >= 11 && h < 14 && !done.has("walk")) return { key: "ns_walk", act: "habit-walk", ic: "activity" };
  if (h >= 14 && h < 19 && !done.has("breath")) return { key: "ns_breath", act: "breath-open", ic: "sparkle" };
  if (h >= 21 && !done.has("winddown")) return { key: "ns_winddown", act: "habit-winddown", ic: "moon" };
  if (!done.has("breath")) return { key: "ns_breath", act: "breath-open", ic: "sparkle" };
  if (water < WATER_GOAL) return { key: "ns_water", p: { n: fmtNum(water + 1) }, act: "habit-water", ic: "drop" };
  return { key: "ns_rest", act: "noop", ic: "heart", calm: true };
}

function wellbeingHero(pid) {
  const score = treeScore(pid); const st = streakInfo(pid); const step = nextStep(pid);
  const stage = score < 30 ? "thirsty" : score < 70 ? "growing" : "bloom";
  const water = waterToday(pid);
  const nd = allow("meds") ? nextDose(pid) : null;
  const meds = DB.medications.filter((m) => m.patientId === pid && m.active);
  const tree = `<section class="card tree-card reveal">
    ${treeSvg(score, st.n)}
    <div class="stack-sm" style="text-align:center">
      <h3>${esc(t("tree_" + stage))}</h3>
      <p class="small muted">${esc(t("tree_" + stage + "_d"))}</p>
      <div class="drops" aria-label="${esc(t("water_count", { n: fmtNum(water), g: fmtNum(WATER_GOAL) }))}">${Array.from({ length: WATER_GOAL }, (_, i) => `<span class="${i < water ? "on" : ""}"></span>`).join("")}</div>
    </div>
  </section>`;
  const magic = `<button class="magic-btn ${step.calm ? "calm" : ""}" data-act="${step.act}" ${step.data || ""}>
    <span class="magic-ico">${icon(step.ic)}</span>
    <span class="grow" style="text-align:start"><span class="eyebrow">${esc(t("next_step_now"))}</span><b>${esc(t(step.key, step.p))}</b></span>
    ${step.calm ? "" : flipIcon("chevron", "ico-sm")}
  </button>`;
  const countdown = nd ? `<button class="card tap cd-card reveal" data-go="meds">
    <div class="iconwrap">${icon("pill")}</div>
    <div class="grow"><span class="eyebrow">${esc(t(nd.late ? "cd_due" : nd.tomorrow ? "cd_next_tomorrow" : "cd_next"))}</span>
      <h3>${esc(nd.item.med.name)} <span class="small muted">· ${esc(fmtTime(nd.item.time))}</span></h3>
      ${meds.filter((m) => courseLeft(m) != null).slice(0, 2).map((m) => `<p class="xs faint">${esc(t("course_left", { med: m.name, d: fmtNum(courseLeft(m)) }))}</p>`).join("")}</div>
    <div class="cd-val ${nd.late ? "late" : ""}" data-countdown="${nd.ts}" aria-live="off">${esc(nd.late ? t("cd_now") : fmtCountdown(nd.ts))}</div>
  </button>` : "";
  const streak = `<section class="streak reveal">
    <span class="flame" aria-hidden="true">🔥</span>
    <div class="grow"><b>${esc(st.n ? t("streak_days", { n: fmtNum(st.n) }) : t("streak_start"))}</b>
      <p class="xs muted">${esc(st.today ? t("streak_today_done") : st.n ? t("streak_keep") : t("streak_first"))}</p></div>
    <span class="shield ${st.shieldReady ? "on" : ""}" title="${esc(t(st.shieldReady ? "shield_ready" : "shield_used"))}">🛡️</span>
  </section>`;
  return tree + magic + countdown + streak;
}

/* ---------- celebration ---------- */
function haptic(p = 12) { try { if (navigator.vibrate) navigator.vibrate(p); } catch {} }
function confetti() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const box = document.createElement("div"); box.className = "confetti"; box.setAttribute("aria-hidden", "true");
  const cols = ["var(--mint)", "var(--sky)", "var(--sun)", "var(--good)"];
  box.innerHTML = Array.from({ length: 36 }, (_, i) => `<i style="--x:${(Math.random() * 2 - 1) * 46}vw;--r:${Math.random() * 720 - 360}deg;--d:${0.9 + Math.random() * 0.8}s;left:${50 + (Math.random() * 20 - 10)}%;background:${cols[i % 4]}"></i>`).join("");
  document.body.appendChild(box); setTimeout(() => box.remove(), 1900);
}
/* Variable reward: about one in three completions opens a gift with a tip. */
function celebrate(force) {
  haptic([10, 40, 14]); confetti();
  if (force || Math.random() < 0.34) setTimeout(() => { UI.gift = { open: false, tip: Math.floor(Math.random() * TIP_COUNT) + 1 }; openSheet(giftSheet); }, 650);
}
function giftSheet() {
  const g = UI.gift || { open: false, tip: 1 };
  return `<div class="stack" style="text-align:center;padding:6px 0 4px">
    ${g.open ? `<div class="gift-open">✨</div><span class="eyebrow">${esc(t("gift_tip_title"))}</span><h3>${esc(t("tip_" + g.tip))}</h3><p class="hint">${esc(t("gift_tip_note"))}</p>
      <button class="btn block" data-act="sheet-close">${esc(t("gift_thanks"))}</button>`
    : `<h3>${esc(t("gift_title"))}</h3><p class="muted small">${esc(t("gift_d"))}</p><button class="gift-box" data-act="gift-open" aria-label="${esc(t("gift_open"))}">🎁</button><span class="small muted">${esc(t("gift_open"))}</span>`}
  </div>`;
}
function breathSheet() {
  return `<div class="stack" style="text-align:center">
    <h3>${esc(t("breath_title"))}</h3><p class="small muted">${esc(t("breath_d"))}</p>
    <div class="breath-wrap"><div class="breath-orb"></div><span class="breath-label" id="breath-label">${esc(t("breath_in"))}</span></div>
    <p class="num muted" id="breath-left">${fmtNum(60)}</p>
    <button class="btn block warm" data-act="breath-done">${esc(t("breath_done"))}</button>
  </div>`;
}
function startBreath() {
  clearInterval(UI.breathTimer); let left = 60;
  UI.breathTimer = setInterval(() => {
    const lbl = $("#breath-label"), cnt = $("#breath-left");
    if (!lbl) { clearInterval(UI.breathTimer); return; }
    left--; cnt.textContent = fmtNum(Math.max(0, left));
    lbl.textContent = t(Math.floor((60 - left) / 4) % 2 ? "breath_out" : "breath_in");
    if (left <= 0) { clearInterval(UI.breathTimer); haptic(20); }
  }, 1000);
}
const ACTIONS_EXTRA = {
  "habit-water": () => { logHabit("water"); const n = waterToday(PID()); toast(t(n >= WATER_GOAL ? "water_goal_done" : "water_logged", { n: fmtNum(n), g: fmtNum(WATER_GOAL) }), "check"); render(); celebrate(n === WATER_GOAL); },
  "habit-walk": () => { logHabit("walk"); toast(t("walk_logged")); render(); celebrate(); },
  "habit-winddown": () => { logHabit("winddown"); toast(t("winddown_logged"), "moon"); render(); celebrate(); },
  "breath-open": () => { haptic(8); openSheet(breathSheet); startBreath(); },
  "breath-done": () => { clearInterval(UI.breathTimer); closeSheet(); logHabit("breath"); toast(t("breath_logged")); render(); celebrate(); },
  "gift-open": () => { haptic([8, 30, 8, 30, 20]); UI.gift.open = true; openSheet(giftSheet); },
};
setInterval(() => { $$("[data-countdown]").forEach((el) => { if (!el.classList.contains("late")) el.textContent = fmtCountdown(Number(el.dataset.countdown)); }); }, 1000);
