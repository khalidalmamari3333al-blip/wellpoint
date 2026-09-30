/* ============================================================
   Wellpoint core: utilities, i18n runtime, mock backend
   (persistence, auth, RBAC, audit), integration adapters,
   notification service, clinical rules, scheduler, AI service.
   In production each "api.*" namespace maps to a server route;
   here it runs in the browser against a local store.
   ============================================================ */

/* ---------- utilities ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = (p = "id") => p + "_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const pad = (n) => String(n).padStart(2, "0");
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => isoDate(new Date());
const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return isoDate(d); };
const daysBetween = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5);
const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const hmToMin = (hm) => { const [h, m] = hm.split(":").map(Number); return h * 60 + m; };
const minToHm = (m) => `${pad(Math.floor(((m % 1440) + 1440) % 1440 / 60))}:${pad(((m % 60) + 60) % 60)}`;
const ageFrom = (dob) => { if (!dob) return null; const d = new Date(dob), n = new Date(); let a = n.getFullYear() - d.getFullYear(); if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--; return a; };
const hashStr = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const initials = (name) => (name || "?").replace(/^Dr\.?\s+|^د\.\s*/, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const safeStore = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch {} }
};

/* ---------- i18n runtime ---------- */
const I18N = { lang: "en", fallback: "en" };
const LOCALES = { en: "en-GB", ar: "ar-OM-u-nu-latn", zh: "zh-CN" };
function t(key, params) {
  const dict = STRINGS[I18N.lang] || {};
  let s = dict[key];
  if (s == null) s = STRINGS[I18N.fallback][key];
  if (s == null) { if (window.__I18N_DEBUG) console.warn("missing key", key); return key; }
  if (params) s = s.replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? (typeof params[k] === "object" ? tx(params[k]) : params[k]) : ""));
  return s;
}
/* Translate a stored message descriptor {key, params}. Params may themselves be descriptors ({k:...}) for nested keys. */
function tx(d) {
  if (d == null) return "";
  if (typeof d === "string") return d;
  if (d.k) return t(d.k, d.p);
  if (d.raw != null) return d.raw;
  return "";
}
const isRTL = () => I18N.lang === "ar";
function fmtDate(iso, opts = { weekday: "short", day: "numeric", month: "short" }) {
  if (!iso) return "—";
  const d = iso.length <= 10 ? new Date(iso + "T12:00:00") : new Date(iso);
  return new Intl.DateTimeFormat(LOCALES[I18N.lang], opts).format(d);
}
function fmtTime(hm) {
  if (!hm) return "";
  const [h, m] = hm.split(":").map(Number);
  const d = new Date(2000, 0, 1, h, m);
  return new Intl.DateTimeFormat(LOCALES[I18N.lang], { hour: "numeric", minute: "2-digit" }).format(d);
}
function fmtNum(n, o) { return new Intl.NumberFormat(LOCALES[I18N.lang], o).format(n); }
function relDays(iso) {
  const n = daysBetween(iso.slice(0, 10), today());
  const rtf = new Intl.RelativeTimeFormat(LOCALES[I18N.lang], { numeric: "auto" });
  if (Math.abs(n) < 1) return rtf.format(0, "day");
  return rtf.format(-n, "day");
}
function relTime(ts) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(LOCALES[I18N.lang], { numeric: "auto" });
  if (diff < 60) return rtf.format(0, "second");
  if (diff < 3600) return rtf.format(-Math.floor(diff / 60), "minute");
  if (diff < 86400) return rtf.format(-Math.floor(diff / 3600), "hour");
  return rtf.format(-Math.floor(diff / 86400), "day");
}
const clinicName = (c) => (c ? (I18N.lang === "ar" ? c.nameAr : c.name) : "");
const doctorName = (d) => (d ? (I18N.lang === "ar" ? d.nameAr : d.name) : "");

/* ---------- password hashing (PBKDF2, WebCrypto) ---------- */
async function hashPassword(pw, salt) {
  salt = salt || Array.from(crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, "0")).join("");
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: enc.encode(salt), iterations: 60000, hash: "SHA-256" }, key, 256);
  return { salt, hash: Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, "0")).join("") };
}
function passwordIssues(pw) {
  const issues = [];
  if (pw.length < 8) issues.push("pw_len");
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) issues.push("pw_mix");
  return issues;
}

/* ---------- persistence ---------- */
const DB_KEY = "wellpoint.db.v3";
let DB = null;
function saveDB() { safeStore.set(DB_KEY, JSON.stringify(DB)); }
function loadDB() { const raw = safeStore.get(DB_KEY); if (!raw) return null; try { return JSON.parse(raw); } catch { return null; } }

/* ---------- slot availability ---------- */
function doctorSlots(doc, dateIso) {
  const d = new Date(dateIso + "T12:00:00");
  if (!doc.days.includes(d.getDay())) return [];
  const out = [];
  for (let m = doc.hours[0] * 60; m < doc.hours[1] * 60; m += 30) {
    const hm = minToHm(m);
    if (dateIso === today() && hmToMin(hm) <= hmToMin(nowHM()) + 30) continue;
    if (hashStr(doc.id + dateIso + hm) % 10 < 4) continue; // simulated external bookings
    const taken = DB.appointments.some((a) => a.doctorId === doc.id && a.date === dateIso && a.time === hm && ["confirmed", "rescheduled"].includes(a.status));
    if (!taken) out.push(hm);
  }
  return out;
}
function nextAvailable(doc, from = today(), span = 14) {
  for (let i = 0; i < span; i++) { const d = addDays(from, i); const s = doctorSlots(doc, d); if (s.length) return { date: d, time: s[0], count: s.length }; }
  return null;
}

/* ---------- seed ---------- */
async function seedDB() {
  const T = today();
  const db = {
    version: 3, users: [], profiles: {}, appointments: [], medications: [], doseLog: [], checkins: [], measurements: [], timeline: [],
    notifications: [], emails: [], documents: [], caregivers: [], audit: [], journal: [], messages: [], sessions: [], clinicEdits: {},
    integrations: {}, staff: [], pendingCodes: {}
  };
  const mk = async (u, pw) => { const h = await hashPassword(pw); db.users.push({ verified: true, createdAt: new Date().toISOString(), ...u, pw: h.hash, salt: h.salt }); };
  await mk({ id: "u_khalid", email: "khalid@demo.wellpoint.om", phone: "+96890000001", role: "patient", name: "Khalid" }, "Wellpoint1");
  await mk({ id: "u_aisha", email: "aisha@demo.wellpoint.om", phone: "+96890000002", role: "patient", name: "Aisha Al Saadi" }, "Wellpoint1");
  await mk({ id: "u_hamed", email: "hamed@demo.wellpoint.om", phone: "+96890000003", role: "caregiver", name: "Hamed Al Saadi" }, "Wellpoint1");
  await mk({ id: "u_kims_admin", email: "admin@kims.demo", role: "clinic", clinicId: "kims", staffRole: "admin", name: "Clinic Admin (KIMS demo)" }, "Wellpoint1");
  await mk({ id: "u_kims_doc", email: "doctor@kims.demo", role: "clinic", clinicId: "kims", staffRole: "doctor", doctorId: "d9", name: "Dr. Suresh Nair (demo)" }, "Wellpoint1");
  await mk({ id: "u_kims_rec", email: "reception@kims.demo", role: "clinic", clinicId: "kims", staffRole: "receptionist", name: "Reception (KIMS demo)" }, "Wellpoint1");
  await mk({ id: "u_star_admin", email: "admin@starcare.demo", role: "clinic", clinicId: "starcare", staffRole: "admin", name: "Clinic Admin (Starcare demo)" }, "Wellpoint1");
  db.staff = db.users.filter((u) => u.role === "clinic").map((u) => ({ userId: u.id, clinicId: u.clinicId, staffRole: u.staffRole, name: u.name, email: u.email, active: true }));

  const basePrefs = { push: true, email: true, emailTypes: { appointments: true, medications: true, followup: true, caregiver: true, clinic: true }, categories: { appointments: true, medications: true, health: true, ai: true, clinic: true, caregiver: true, system: true }, quietStart: "22:30", quietEnd: "06:30", wake: "07:00", sleep: "23:00" };
  db.profiles.u_khalid = {
    onboarded: true, name: "Khalid", dob: `${new Date().getFullYear() - 18}-03-14`, gender: "male", weight: 72, height: 175, nationality: "Omani", gov: "muscat", lang: "en",
    emergency: { name: "Salim (father)", phone: "+968 9000 0010" }, goals: ["general", "sleep", "fitness"], conditions: ["none"], allergies: ["Penicillin"],
    primaryClinic: "starcare", caregiverWanted: false, consent: { shareWithClinics: true, shareWithCaregivers: false, research: false },
    prefs: { ...basePrefs, wake: "07:00", sleep: "23:30" }, mode: "general", simple: false, plan: "free", devices: ["health_connect"]
  };
  db.profiles.u_aisha = {
    onboarded: true, name: "Aisha Al Saadi", dob: "1961-06-02", gender: "female", weight: 78, height: 158, nationality: "Omani", gov: "muscat", lang: "ar",
    emergency: { name: "Hamed (son)", phone: "+968 9000 0003" }, goals: ["chronic", "medication"], conditions: ["diabetes", "hypertension"], allergies: [],
    primaryClinic: "kims", caregiverWanted: true, consent: { shareWithClinics: true, shareWithCaregivers: true, research: false },
    prefs: { ...basePrefs, wake: "06:00", sleep: "22:00" }, mode: "chronic", simple: true, plan: "plus", devices: []
  };
  db.profiles.u_hamed = { onboarded: true, name: "Hamed Al Saadi", lang: "en", prefs: { ...basePrefs }, mode: "caregiver", simple: false, gov: "muscat" };

  const ap = (o) => db.appointments.push({ id: uid("apt"), type: "in_person", notes: "", history: [{ at: new Date().toISOString(), status: o.status }], createdAt: new Date().toISOString(), ...o });
  const firstSlot = (docId, offset) => { const d = DOCTORS.find((x) => x.id === docId); for (let i = offset; i < offset + 10; i++) { const day = addDays(T, i); if (d.days.includes(new Date(day + "T12:00:00").getDay())) return { date: day, time: minToHm(d.hours[0] * 60 + 60) }; } return { date: addDays(T, offset), time: "10:00" }; };
  ap({ patientId: "u_khalid", clinicId: "starcare", doctorId: "d1", specialty: "general", ...firstSlot("d1", 3), status: "confirmed", notes: "Annual check-up" });
  ap({ patientId: "u_khalid", clinicId: "aster", doctorId: "d12", specialty: "dentistry", date: addDays(T, -41), time: "11:00", status: "completed", notes: "Dental cleaning" });
  ap({ patientId: "u_khalid", clinicId: "burjeel", doctorId: "d6", specialty: "orthopedics", date: addDays(T, -12), time: "10:30", status: "cancelled", notes: "Knee pain after football" });
  ap({ patientId: "u_aisha", clinicId: "kims", doctorId: "d9", specialty: "endocrinology", date: addDays(T, -12), time: "09:00", status: "completed", type: "follow_up", notes: "Diabetes review" });
  ap({ patientId: "u_aisha", clinicId: "kims", doctorId: "d9", specialty: "endocrinology", ...firstSlot("d9", 18), status: "confirmed", type: "follow_up", notes: "3-month diabetes & BP follow-up" });
  ap({ patientId: "u_aisha", clinicId: "kims", doctorId: "d10", specialty: "internal", date: addDays(T, -70), time: "10:00", status: "no_show", notes: "" });
  // other (fictional) patients so clinic dashboards have realistic volume; names are initials only
  const extra = [["P. R.", "kims", "d10", 0, "10:30"], ["M. S.", "kims", "d9", 0, "11:00"], ["F. A.", "kims", "d11", 0, "17:00"], ["S. K.", "kims", "d10", 1, "09:30"], ["A. H.", "kims", "d9", 2, "08:30"], ["N. B.", "starcare", "d1", 0, "09:00"], ["R. M.", "starcare", "d2", 1, "10:00"]];
  extra.forEach(([nm, c, d, off, tm], i) => {
    const pid = "u_ext" + i;
    db.users.push({ id: pid, email: `patient${i}@example.invalid`, role: "patient", name: nm, verified: true, pw: "", salt: "", external: true });
    db.profiles[pid] = { onboarded: true, name: nm, dob: `${1950 + i * 7}-01-01`, gender: i % 2 ? "male" : "female", consent: { shareWithClinics: i % 3 !== 0 }, conditions: i % 2 ? ["hypertension"] : ["none"], allergies: [], prefs: basePrefs };
    ap({ patientId: pid, clinicId: c, doctorId: d, specialty: DOCTORS.find((x) => x.id === d).specialty, date: addDays(T, off), time: tm, status: "confirmed" });
  });

  const med = (o) => db.medications.push({ id: uid("med"), active: true, notes: "", createdAt: new Date().toISOString(), ...o });
  med({ patientId: "u_khalid", name: "Vitamin D3", dose: "1000 IU · 1 tablet", frequency: "once", times: ["08:30"], food: "after", start: addDays(T, -30), end: addDays(T, 60), doctor: "d1", clinic: "starcare", source: "patient", verified: false, notes: "Demo supplement entry" });
  med({ patientId: "u_aisha", name: "Metformin", dose: "500 mg · 1 tablet", frequency: "twice", times: ["07:00", "19:00"], food: "after", start: addDays(T, -12), end: "", doctor: "d9", clinic: "kims", source: "clinic", verified: true, notes: "Demo prescription from clinic record" });
  med({ patientId: "u_aisha", name: "Amlodipine", dose: "5 mg · 1 tablet", frequency: "once", times: ["07:00"], food: "any", start: addDays(T, -90), end: "", doctor: "d10", clinic: "kims", source: "clinic", verified: true, notes: "Demo prescription" });
  med({ patientId: "u_aisha", name: "Atorvastatin", dose: "20 mg · 1 tablet", frequency: "once", times: ["21:00"], food: "any", start: addDays(T, -90), end: "", doctor: "d10", clinic: "kims", source: "clinic", verified: true, notes: "Demo prescription" });
  // adherence history (last 7 days)
  for (const m of db.medications) for (let i = 1; i <= 7; i++) for (const tm of m.times) {
    const miss = hashStr(m.id + i + tm) % 17 === 0;
    db.doseLog.push({ id: uid("dl"), medId: m.id, patientId: m.patientId, date: addDays(T, -i), time: tm, status: miss ? "missed" : "taken", at: addDays(T, -i) + "T" + tm });
  }

  const meas = (o) => db.measurements.push({ id: uid("ms"), ...o });
  for (let i = 1; i <= 7; i++) meas({ patientId: "u_khalid", type: "sleep", value: [7.4, 6.1, 5.6, 6.0, 7.8, 5.4, 6.2][i - 1], at: addDays(T, -i) + "T07:00", source: "device" });
  meas({ patientId: "u_khalid", type: "weight", value: 72, at: addDays(T, -9) + "T08:00", source: "patient" });
  meas({ patientId: "u_aisha", type: "bp", value: 138, value2: 86, at: addDays(T, -12) + "T09:10", source: "clinic" });
  meas({ patientId: "u_aisha", type: "glucose", value: 142, at: addDays(T, -12) + "T09:10", source: "clinic", unit: "mg/dL" });
  meas({ patientId: "u_aisha", type: "bp", value: 134, value2: 84, at: addDays(T, -5) + "T07:30", source: "caregiver" });
  meas({ patientId: "u_aisha", type: "glucose", value: 131, at: addDays(T, -6) + "T07:15", source: "patient", unit: "mg/dL" });
  meas({ patientId: "u_aisha", type: "hba1c", value: 7.4, at: addDays(T, -12) + "T09:10", source: "clinic", unit: "%" });

  db.checkins.push({ id: uid("ci"), patientId: "u_aisha", at: addDays(T, -4) + "T10:00", mood: "same", symptoms: [], level: "green", by: "patient" });
  db.checkins.push({ id: uid("ci"), patientId: "u_khalid", at: addDays(T, -1) + "T09:00", mood: "good", symptoms: [], level: "green", by: "patient" });

  const tl = (patientId, daysAgo, type, key, p, source = "wellpoint", level) => db.timeline.push({ id: uid("tl"), patientId, at: addDays(T, -daysAgo) + "T09:00", type, msg: { k: key, p }, source, level });
  tl("u_khalid", 41, "visit", "tl_visit", { clinic: "Aster Al Raffah Hospital", spec: { k: "sp_dentistry" } }, "clinic");
  tl("u_khalid", 30, "medication", "tl_med_added", { med: "Vitamin D3" }, "patient");
  tl("u_khalid", 12, "appointment", "tl_appt_cancelled", { clinic: "Burjeel Hospital Muscat" });
  tl("u_khalid", 9, "measure", "tl_measure", { what: { k: "m_weight" }, val: "72 kg" }, "patient");
  tl("u_khalid", 1, "checkin", "tl_checkin", { mood: { k: "mood_good" } });
  tl("u_aisha", 90, "medication", "tl_med_added", { med: "Amlodipine, Atorvastatin" }, "clinic");
  tl("u_aisha", 70, "appointment", "tl_appt_noshow", { clinic: "KIMSHEALTH Oman Hospital" }, "clinic", "warn");
  tl("u_aisha", 12, "visit", "tl_visit", { clinic: "KIMSHEALTH Oman Hospital", spec: { k: "sp_endocrinology" } }, "clinic");
  tl("u_aisha", 12, "lab", "tl_lab", { name: "HbA1c", val: "7.4%" }, "clinic");
  tl("u_aisha", 12, "medication", "tl_med_added", { med: "Metformin 500 mg" }, "clinic");
  tl("u_aisha", 12, "plan", "tl_followup_set", { date: addDays(T, 18) }, "clinic");
  tl("u_aisha", 5, "measure", "tl_measure_by", { what: { k: "m_bp" }, val: "134/84", who: "Hamed" }, "caregiver");
  tl("u_aisha", 4, "checkin", "tl_checkin", { mood: { k: "mood_same" } });

  db.journal.push({ id: uid("j"), patientId: "u_khalid", at: addDays(T, -3) + "T22:00", tags: ["poor_sleep", "stress"], text: "Exams week" });
  db.journal.push({ id: uid("j"), patientId: "u_khalid", at: addDays(T, -2) + "T18:00", tags: ["workout"], text: "Football with friends" });
  db.journal.push({ id: uid("j"), patientId: "u_khalid", at: addDays(T, -6) + "T22:30", tags: ["poor_sleep"], text: "" });

  db.caregivers.push({ id: "cg1", patientId: "u_aisha", caregiverUserId: "u_hamed", name: "Hamed Al Saadi", email: "hamed@demo.wellpoint.om", relation: "child", perms: { meds: true, appts: true, health: true, reminders: true, docs: false }, status: "active", invitedAt: addDays(T, -60) + "T10:00" });
  db.audit.push({ id: uid("au"), at: addDays(T, -5) + "T07:32", actor: "u_hamed", actorName: "Hamed Al Saadi", patientId: "u_aisha", action: "au_caregiver_measure" });
  db.audit.push({ id: uid("au"), at: addDays(T, -2) + "T20:05", actor: "u_hamed", actorName: "Hamed Al Saadi", patientId: "u_aisha", action: "au_caregiver_view_meds" });
  db.audit.push({ id: uid("au"), at: addDays(T, -12) + "T09:40", actor: "u_kims_doc", actorName: "Dr. Suresh Nair (demo)", patientId: "u_aisha", action: "au_clinic_update" });

  db.documents.push({ id: uid("doc"), patientId: "u_aisha", name: "HbA1c result.pdf", cat: "lab", size: 182000, type: "application/pdf", at: addDays(T, -12) + "T10:00", dataUrl: "", source: "clinic" });
  db.documents.push({ id: uid("doc"), patientId: "u_aisha", name: "Prescription - Metformin.pdf", cat: "prescription", size: 96000, type: "application/pdf", at: addDays(T, -12) + "T10:00", dataUrl: "", source: "clinic" });
  db.documents.push({ id: uid("doc"), patientId: "u_khalid", name: "Dental x-ray.jpg", cat: "image", size: 340000, type: "image/jpeg", at: addDays(T, -41) + "T12:00", dataUrl: "", source: "patient" });

  db.messages.push({ id: uid("m"), clinicId: "kims", patientId: "u_aisha", from: "clinic", text: "Please bring your glucose log to your next visit.", at: addDays(T, -11) + "T12:00" });
  db.integrations = {
    u_aisha: [{ clinicId: "kims", adapter: "fhir", status: "connected", lastSync: addDays(T, -12) + "T09:45" }],
    u_khalid: [{ clinicId: "starcare", adapter: "manual", status: "connected", lastSync: addDays(T, -41) + "T12:00" }, { clinicId: "aster", adapter: "mock", status: "available", lastSync: null }]
  };
  DB = db;
  notify("u_khalid", "appointments", { k: "n_appt_confirmed", p: { clinic: "Starcare Hospital" } }, { silent: true, at: addDays(T, -2) + "T10:00" });
  notify("u_khalid", "ai", { k: "n_ai_sleep" }, { silent: true, at: addDays(T, -1) + "T08:00" });
  notify("u_khalid", "system", { k: "n_welcome" }, { silent: true, at: addDays(T, -30) + "T08:00", read: true });
  notify("u_aisha", "health", { k: "n_stale_checkin" }, { silent: true, at: addDays(T, 0) + "T08:00" });
  notify("u_aisha", "clinic", { k: "n_clinic_msg", p: { clinic: "KIMSHEALTH Oman Hospital" } }, { silent: true, at: addDays(T, -11) + "T12:00" });
  notify("u_aisha", "caregiver", { k: "n_cg_logged", p: { name: "Hamed" } }, { silent: true, at: addDays(T, -5) + "T07:32", read: true });
  notify("u_hamed", "caregiver", { k: "n_cg_missed_dose", p: { name: "Aisha", med: "Metformin" } }, { silent: true, at: addDays(T, -1) + "T20:30" });
  sendEmail("u_khalid", "email_appt_confirm", { clinic: "Starcare Hospital", date: DB.appointments[0].date, time: DB.appointments[0].time }, addDays(T, -2) + "T10:00");
  return db;
}

/* ---------- session / auth ---------- */
const SESSION_KEY = "wellpoint.session";
const App = { user: null, sessionId: null, profile: null };
function currentUser() { return App.user; }
function audit(action, patientId, extra = {}) {
  const u = App.user;
  DB.audit.unshift({ id: uid("au"), at: new Date().toISOString(), actor: u?.id || "system", actorName: u?.name || "system", patientId, action, ...extra });
  if (DB.audit.length > 400) DB.audit.length = 400;
}
const api = {};
api.auth = {
  findUser(id) {
    const s = id.trim().toLowerCase().replace(/\s+/g, "");
    return DB.users.find((u) => !u.external && (u.email.toLowerCase() === s || (u.phone && u.phone.replace(/\s+/g, "") === s)));
  },
  async login(identifier, pw) {
    const u = this.findUser(identifier);
    if (!u) throw { code: "err_no_account" };
    u.failed = u.failed || 0;
    if (u.lockedUntil && Date.now() < u.lockedUntil) throw { code: "err_locked" };
    const { hash } = await hashPassword(pw, u.salt);
    if (hash !== u.pw) { u.failed++; if (u.failed >= 5) { u.lockedUntil = Date.now() + 60000; u.failed = 0; } saveDB(); throw { code: "err_bad_password" }; }
    u.failed = 0;
    if (!u.verified) throw { code: "err_unverified", userId: u.id };
    this.startSession(u);
    return u;
  },
  startSession(u) {
    const s = { id: uid("sess"), userId: u.id, device: navigator.userAgent.includes("Mobile") ? "Mobile browser" : "Desktop browser", createdAt: new Date().toISOString(), lastSeen: new Date().toISOString() };
    DB.sessions.push(s); App.user = u; App.sessionId = s.id; App.profile = DB.profiles[u.id] || null;
    safeStore.set(SESSION_KEY, s.id);
    audit("au_login", u.role === "patient" ? u.id : null); saveDB();
  },
  restore() {
    const sid = safeStore.get(SESSION_KEY); if (!sid) return false;
    const s = DB.sessions.find((x) => x.id === sid && !x.revoked); if (!s) return false;
    const u = DB.users.find((x) => x.id === s.userId); if (!u) return false;
    s.lastSeen = new Date().toISOString(); App.user = u; App.sessionId = s.id; App.profile = DB.profiles[u.id] || null; return true;
  },
  logout() {
    const s = DB.sessions.find((x) => x.id === App.sessionId); if (s) s.revoked = true;
    audit("au_logout", null); App.user = null; App.profile = null; App.sessionId = null; safeStore.del(SESSION_KEY); saveDB();
  },
  async signup({ name, identifier, password }) {
    const id = identifier.trim().toLowerCase().replace(/\s+/g, "");
    const isEmail = id.includes("@");
    if (isEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(id)) throw { code: "err_email" };
    if (!isEmail && !/^\+?\d{8,15}$/.test(id)) throw { code: "err_phone" };
    if (this.findUser(id)) throw { code: "err_exists" };
    const issues = passwordIssues(password); if (issues.length) throw { code: issues[0] };
    const h = await hashPassword(password);
    const u = { id: uid("u"), email: isEmail ? id : "", phone: isEmail ? "" : id, role: "patient", name: name.trim(), verified: false, pw: h.hash, salt: h.salt, createdAt: new Date().toISOString() };
    DB.users.push(u);
    DB.profiles[u.id] = { onboarded: false, name: u.name, lang: I18N.lang, prefs: { push: true, email: true, emailTypes: { appointments: true, medications: true, followup: true, caregiver: true, clinic: true }, categories: { appointments: true, medications: true, health: true, ai: true, clinic: true, caregiver: true, system: true }, quietStart: "22:30", quietEnd: "06:30", wake: "07:00", sleep: "23:00" }, consent: { shareWithClinics: false, shareWithCaregivers: false, research: false }, plan: "free", devices: [] };
    this.sendCode(u.id, "verify");
    saveDB(); return u;
  },
  sendCode(userId, purpose) {
    const code = String(100000 + Math.floor(Math.random() * 900000));
    DB.pendingCodes[userId + ":" + purpose] = { code, exp: Date.now() + 10 * 60000 };
    const u = DB.users.find((x) => x.id === userId);
    sendEmail(userId, purpose === "verify" ? "email_verify" : "email_reset", { code, name: u.name }, null, u.email ? "email" : "sms");
    saveDB(); return code;
  },
  checkCode(userId, purpose, code) {
    const rec = DB.pendingCodes[userId + ":" + purpose];
    if (!rec || rec.exp < Date.now()) throw { code: "err_code_expired" };
    if (rec.code !== String(code).trim()) throw { code: "err_code_wrong" };
    delete DB.pendingCodes[userId + ":" + purpose]; return true;
  },
  verify(userId, code) { this.checkCode(userId, "verify", code); const u = DB.users.find((x) => x.id === userId); u.verified = true; this.startSession(u); return u; },
  async reset(userId, code, pw) {
    const issues = passwordIssues(pw); if (issues.length) throw { code: issues[0] };
    this.checkCode(userId, "reset", code);
    const u = DB.users.find((x) => x.id === userId); const h = await hashPassword(pw); u.pw = h.hash; u.salt = h.salt; u.lockedUntil = 0;
    DB.sessions.filter((s) => s.userId === u.id).forEach((s) => (s.revoked = true));
    audit("au_pw_reset", u.role === "patient" ? u.id : null); saveDB();
  },
  async changePassword(oldPw, newPw) {
    const u = App.user; const { hash } = await hashPassword(oldPw, u.salt);
    if (hash !== u.pw) throw { code: "err_bad_password" };
    const issues = passwordIssues(newPw); if (issues.length) throw { code: issues[0] };
    const h = await hashPassword(newPw); u.pw = h.hash; u.salt = h.salt;
    DB.sessions.filter((s) => s.userId === u.id && s.id !== App.sessionId).forEach((s) => (s.revoked = true));
    audit("au_pw_change", u.role === "patient" ? u.id : null); saveDB();
  },
  deleteAccount() {
    const id = App.user.id;
    ["appointments", "medications", "doseLog", "checkins", "measurements", "timeline", "notifications", "documents", "journal", "messages"].forEach((k) => { DB[k] = DB[k].filter((r) => r.patientId !== id && r.userId !== id); });
    DB.caregivers = DB.caregivers.filter((c) => c.patientId !== id && c.caregiverUserId !== id);
    delete DB.profiles[id]; DB.users = DB.users.filter((u) => u.id !== id); DB.sessions = DB.sessions.filter((s) => s.userId !== id);
    App.user = null; safeStore.del(SESSION_KEY); saveDB();
  }
};

/* ---------- RBAC ---------- */
const PERMS = {
  admin: ["appointments.read", "appointments.write", "patients.basic", "schedules.read", "messages.write", "clinic.profile", "staff.manage", "settings", "integrations"],
  doctor: ["appointments.read", "appointments.write", "patients.basic", "patients.clinical", "clinical.update", "schedules.read", "messages.write", "followups"],
  receptionist: ["appointments.read", "appointments.write", "patients.basic", "schedules.read"]
};
function can(perm) { const u = App.user; if (!u || u.role !== "clinic") return false; return (PERMS[u.staffRole] || []).includes(perm); }
function requirePerm(perm) { if (!can(perm)) { audit("au_denied", null, { perm }); throw { code: "err_forbidden" }; } }

/* Caregiver access: returns permission object for (caregiver -> patient) or null */
function caregiverLink(patientId, cgUserId = App.user?.id) {
  const l = DB.caregivers.find((c) => c.patientId === patientId && c.caregiverUserId === cgUserId && c.status === "active");
  if (!l) return null;
  if (!DB.profiles[patientId]?.consent?.shareWithCaregivers) return null;
  return l.perms;
}
/* Resolve which patient the current actor may act on, and with which scopes. */
function patientScope(patientId) {
  const u = App.user; if (!u) throw { code: "err_auth" };
  if (u.role === "patient") { if (patientId && patientId !== u.id) throw { code: "err_forbidden" }; return { id: u.id, all: true }; }
  if (u.role === "caregiver") { const p = caregiverLink(patientId); if (!p) throw { code: "err_forbidden" }; return { id: patientId, ...p, all: false }; }
  throw { code: "err_forbidden" };
}

/* ---------- notification + email service ---------- */
function notify(userId, cat, msg, opts = {}) {
  const prof = DB.profiles[userId];
  const enabled = prof?.prefs?.categories?.[cat] !== false;
  if (!enabled && cat !== "system") return null;
  // smart suppression: do not stack identical unread notifications
  const dup = DB.notifications.find((n) => n.userId === userId && !n.read && n.msg.k === msg.k && JSON.stringify(n.msg.p) === JSON.stringify(msg.p));
  if (dup) { dup.at = opts.at || new Date().toISOString(); return dup; }
  const n = { id: uid("n"), userId, cat, msg, at: opts.at || new Date().toISOString(), read: !!opts.read, action: opts.action || null };
  DB.notifications.unshift(n);
  if (!opts.silent && App.user?.id === userId && typeof toast === "function") toast(tx(msg), cat === "medications" ? "pill" : "bell");
  return n;
}
function inQuietHours(userId) {
  const p = DB.profiles[userId]?.prefs; if (!p) return false;
  const n = hmToMin(nowHM()), s = hmToMin(p.quietStart), e = hmToMin(p.quietEnd);
  return s > e ? n >= s || n < e : n >= s && n < e;
}
const EMAIL_TYPE = { email_appt_confirm: "appointments", email_appt_reminder: "appointments", email_appt_change: "appointments", email_med_summary: "medications", email_followup: "followup", email_caregiver: "caregiver", email_clinic_msg: "clinic", email_verify: null, email_reset: null, email_cg_invite: null };
function sendEmail(userId, template, params, at, channel = "email") {
  const u = DB.users.find((x) => x.id === userId);
  const prof = DB.profiles[userId];
  const type = EMAIL_TYPE[template];
  if (type && (prof?.prefs?.email === false || prof?.prefs?.emailTypes?.[type] === false)) return null; // opt-out respected; transactional mail always sent
  const e = { id: uid("em"), userId, to: channel === "sms" ? u?.phone : (params.to || u?.email), channel, template, params, lang: prof?.lang || I18N.lang, at: at || new Date().toISOString() };
  DB.emails.unshift(e); return e;
}

/* ---------- integration abstraction layer ---------- */
/* Every adapter implements: describe(), pull(patientId, clinicId) -> normalized records[], push(patientId, record). */
const Normalizer = {
  // FHIR R4 Bundle -> Wellpoint records
  fromFhir(bundle, clinicId) {
    const out = [];
    for (const { resource: r } of bundle.entry || []) {
      if (r.resourceType === "Encounter") out.push({ kind: "visit", date: r.period?.start?.slice(0, 10), text: r.reasonCode?.[0]?.text || "" });
      if (r.resourceType === "Observation") {
        const code = r.code?.coding?.[0]?.code;
        if (code === "85354-9") out.push({ kind: "measure", type: "bp", value: r.component[0].valueQuantity.value, value2: r.component[1].valueQuantity.value, date: r.effectiveDateTime });
        else if (code === "4548-4") out.push({ kind: "lab", name: "HbA1c", value: r.valueQuantity.value, unit: "%", date: r.effectiveDateTime });
        else if (code === "2339-0") out.push({ kind: "measure", type: "glucose", value: r.valueQuantity.value, unit: "mg/dL", date: r.effectiveDateTime });
      }
      if (r.resourceType === "MedicationRequest") out.push({ kind: "medication", name: r.medicationCodeableConcept?.text, dose: r.dosageInstruction?.[0]?.text, timing: r.dosageInstruction?.[0]?.timing?.code?.text, date: r.authoredOn });
      if (r.resourceType === "Appointment") out.push({ kind: "followup", date: r.start?.slice(0, 10), time: r.start?.slice(11, 16) });
    }
    return out.map((x) => ({ ...x, clinicId }));
  }
};
const Adapters = {
  mock: {
    id: "mock", label: "int_mock",
    async pull(patientId, clinicId) {
      await new Promise((r) => setTimeout(r, 700));
      return [{ kind: "measure", type: "bp", value: 128 + (hashStr(patientId + today()) % 10), value2: 82, date: new Date().toISOString(), clinicId }];
    }
  },
  fhir: {
    id: "fhir", label: "int_fhir",
    // Real implementation: SMART on FHIR (OAuth2 + PKCE) against the provider's FHIR R4 base URL.
    async pull(patientId, clinicId) {
      await new Promise((r) => setTimeout(r, 900));
      const d = new Date().toISOString();
      const bundle = { resourceType: "Bundle", type: "searchset", entry: [
        { resource: { resourceType: "Observation", code: { coding: [{ system: "http://loinc.org", code: "85354-9" }] }, effectiveDateTime: d, component: [{ valueQuantity: { value: 131 } }, { valueQuantity: { value: 83 } }] } },
        { resource: { resourceType: "Observation", code: { coding: [{ system: "http://loinc.org", code: "2339-0" }] }, effectiveDateTime: d, valueQuantity: { value: 128, unit: "mg/dL" } } }
      ] };
      return Normalizer.fromFhir(bundle, clinicId);
    }
  },
  api: { id: "api", label: "int_api", async pull() { throw { code: "err_needs_agreement" }; } },
  manual: { id: "manual", label: "int_manual", async pull() { return []; } }
};
function ingest(patientId, records, source) {
  for (const r of records) {
    const clinic = CLINICS.find((c) => c.id === r.clinicId);
    if (r.kind === "measure") {
      DB.measurements.push({ id: uid("ms"), patientId, type: r.type, value: r.value, value2: r.value2, unit: r.unit, at: r.date || new Date().toISOString(), source });
      DB.timeline.push({ id: uid("tl"), patientId, at: new Date().toISOString(), type: "measure", msg: { k: "tl_measure_from", p: { what: { k: "m_" + r.type }, val: r.type === "bp" ? `${r.value}/${r.value2}` : `${r.value} ${r.unit || ""}`, clinic: clinic?.name || "" } }, source });
    } else if (r.kind === "lab") {
      DB.measurements.push({ id: uid("ms"), patientId, type: "hba1c", value: r.value, unit: r.unit, at: r.date, source });
      DB.timeline.push({ id: uid("tl"), patientId, at: new Date().toISOString(), type: "lab", msg: { k: "tl_lab", p: { name: r.name, val: r.value + r.unit } }, source });
    } else if (r.kind === "visit") {
      DB.timeline.push({ id: uid("tl"), patientId, at: new Date().toISOString(), type: "visit", msg: { k: "tl_visit_note", p: { clinic: clinic?.name || "", note: r.text } }, source });
    } else if (r.kind === "followup") {
      DB.timeline.push({ id: uid("tl"), patientId, at: new Date().toISOString(), type: "plan", msg: { k: "tl_followup_set", p: { date: r.date } }, source });
    }
  }
}

/* ---------- clinical rules (DEMO — must be reviewed/approved by clinicians before use) ---------- */
const RED_FLAGS = ["chest_pain", "severe_breath", "fainting", "stroke_signs", "severe_bleeding"];
function evaluateRules({ profile, mood, symptoms = [], redFlags = [], bp, glucose }) {
  const reasons = []; let level = "green";
  const cond = profile?.conditions || [];
  const bump = (l) => { const o = { green: 0, amber: 1, red: 2 }; if (o[l] > o[level]) level = l; };
  if (redFlags.length) { bump("red"); reasons.push({ k: "why_redflag", p: { list: redFlags.map((f) => t("sym_" + f)).join(", ") } }); }
  if (bp) {
    if (bp[0] >= 180 || bp[1] >= 120) { bump(redFlags.length ? "red" : "amber"); reasons.push({ k: "why_bp_very_high", p: { v: bp.join("/") } }); if (!redFlags.length) level = "red"; }
    else if (bp[0] >= 140 || bp[1] >= 90) { bump("amber"); reasons.push({ k: "why_bp_high", p: { v: bp.join("/") } }); }
    else if (bp[0] < 90) { bump("amber"); reasons.push({ k: "why_bp_low", p: { v: bp.join("/") } }); }
  }
  if (glucose) {
    if (glucose < 54) { bump("red"); reasons.push({ k: "why_glu_very_low", p: { v: glucose } }); }
    else if (glucose < 70) { bump("amber"); reasons.push({ k: "why_glu_low", p: { v: glucose } }); }
    else if (glucose > 300) { bump("amber"); reasons.push({ k: "why_glu_very_high", p: { v: glucose } }); }
    else if (glucose > 250) { bump("amber"); reasons.push({ k: "why_glu_high", p: { v: glucose } }); }
  }
  if (mood === "worse") {
    const concerning = symptoms.filter((s) => ["dizziness", "swelling", "breathing", "vision", "thirst"].includes(s));
    if (concerning.length && (cond.includes("hypertension") || cond.includes("cardio") || cond.includes("kidney") || cond.includes("diabetes"))) { bump("amber"); reasons.push({ k: "why_symptom_condition", p: { list: concerning.map((s) => t("sym_" + s)).join(", ") } }); }
    else if (symptoms.length) reasons.push({ k: "why_symptom_mild" });
    else reasons.push({ k: "why_worse_general" });
  }
  if (!reasons.length) reasons.push({ k: "why_all_ok" });
  reasons.push({ k: "why_rules_note" });
  return { level, reasons };
}

/* ---------- data freshness ---------- */
function freshness(patientId) {
  const last = (arr) => arr.sort((a, b) => (a.at < b.at ? 1 : -1))[0]?.at || null;
  const m = DB.measurements.filter((x) => x.patientId === patientId);
  const visits = DB.appointments.filter((a) => a.patientId === patientId && a.status === "completed").map((a) => ({ at: a.date }));
  const doses = DB.doseLog.filter((d) => d.patientId === patientId && d.status === "taken");
  const next = DB.appointments.filter((a) => a.patientId === patientId && ["confirmed", "rescheduled"].includes(a.status) && a.date >= today()).sort((a, b) => (a.date + a.time > b.date + b.time ? 1 : -1))[0];
  const rows = [
    { key: "fr_checkin", at: last(DB.checkins.filter((c) => c.patientId === patientId)), stale: 3 },
    { key: "fr_measure", at: last(m.filter((x) => ["bp", "glucose", "weight"].includes(x.type)).slice()), stale: 7 },
    { key: "fr_bp", at: last(m.filter((x) => x.type === "bp")), stale: 7, only: "hypertension" },
    { key: "fr_glucose", at: last(m.filter((x) => x.type === "glucose")), stale: 7, only: "diabetes" },
    { key: "fr_visit", at: last(visits), stale: 120 },
    { key: "fr_meds", at: last(doses), stale: 2, needsMeds: true }
  ];
  const cond = DB.profiles[patientId]?.conditions || [];
  const hasMeds = DB.medications.some((x) => x.patientId === patientId && x.active);
  return { rows: rows.filter((r) => (!r.only || cond.includes(r.only)) && (!r.needsMeds || hasMeds)).map((r) => ({ ...r, days: r.at ? daysBetween(r.at.slice(0, 10), today()) : null })), next };
}

/* ---------- medication schedule + AI-assisted organizer ---------- */
const FREQ_COUNT = { once: 1, twice: 2, thrice: 3, four: 4, weekly: 1, as_needed: 0 };
/* Suggests clock times that FOLLOW the prescribed frequency and food instruction.
   Never changes dose or frequency — only arranges times inside the user's waking day. */
function suggestTimes(freq, food, prefs, existing = []) {
  const n = FREQ_COUNT[freq] ?? 1; if (!n) return { times: [], reasons: [{ k: "why_prn" }] };
  const wake = hmToMin(prefs?.wake || "07:00"), sleep = hmToMin(prefs?.sleep || "23:00");
  const span = (sleep > wake ? sleep : sleep + 1440) - wake;
  const meals = [wake + 30, wake + Math.round(span * 0.42), sleep - 150];
  let times;
  if (n === 1) times = [food === "before" ? meals[0] - 30 : food === "after" ? meals[0] + 30 : wake + 30];
  else if (n === 2) times = [meals[0], meals[2]].map((m) => (food === "before" ? m - 30 : food === "after" ? m + 30 : m));
  else if (n === 3) times = meals.map((m) => (food === "before" ? m - 30 : food === "after" ? m + 30 : m));
  else { const step = Math.floor((span - 60) / 3); times = [0, 1, 2, 3].map((i) => wake + 30 + i * step); }
  times = times.map((m) => Math.round(m / 15) * 15);
  // align with existing doses within 20 min to reduce reminder count
  const ex = existing.map(hmToMin);
  times = times.map((m) => { const near = ex.find((e) => Math.abs(e - m) <= 20); return near ?? m; });
  const reasons = [{ k: "why_times_freq", p: { n } }, { k: "why_times_wake", p: { wake: fmtTime(prefs?.wake || "07:00"), sleep: fmtTime(prefs?.sleep || "23:00") } }];
  if (food !== "any") reasons.push({ k: "why_times_food_" + food });
  if (times.some((m) => ex.includes(m))) reasons.push({ k: "why_times_grouped" });
  reasons.push({ k: "why_times_never_dose" });
  return { times: times.map(minToHm), reasons };
}
function scheduleFor(patientId, dateIso = today()) {
  const meds = DB.medications.filter((m) => m.patientId === patientId && m.active && (!m.start || m.start <= dateIso) && (!m.end || m.end >= dateIso));
  const items = [];
  for (const m of meds) {
    if (m.frequency === "weekly" && new Date(dateIso + "T12:00:00").getDay() !== new Date((m.start || dateIso) + "T12:00:00").getDay()) continue;
    for (const tm of m.times) {
      const log = DB.doseLog.find((d) => d.medId === m.id && d.date === dateIso && d.time === tm);
      items.push({ med: m, time: tm, status: log?.status || (dateIso < today() || (dateIso === today() && hmToMin(tm) < hmToMin(nowHM()) - 120) ? "missed" : "due"), log });
    }
  }
  return items.sort((a, b) => hmToMin(a.time) - hmToMin(b.time));
}
function adherence(patientId, days = 7) {
  let taken = 0, total = 0;
  for (let i = 1; i <= days; i++) for (const it of scheduleFor(patientId, addDays(today(), -i))) { total++; if (it.status === "taken") taken++; }
  return total ? Math.round((taken / total) * 100) : null;
}
function logDose(medId, time, status, dateIso = today()) {
  const m = DB.medications.find((x) => x.id === medId); if (!m) return;
  const sc = patientScope(m.patientId);
  if (!sc.all && !sc.meds) throw { code: "err_forbidden" };
  let log = DB.doseLog.find((d) => d.medId === medId && d.date === dateIso && d.time === time);
  if (!log) { log = { id: uid("dl"), medId, patientId: m.patientId, date: dateIso, time }; DB.doseLog.push(log); }
  log.status = status; log.at = new Date().toISOString(); log.by = App.user.id;
  if (App.user.role === "caregiver") { audit("au_caregiver_dose", m.patientId); notify(m.patientId, "caregiver", { k: "n_cg_marked", p: { name: App.user.name.split(" ")[0], med: m.name } }, { silent: true }); }
  saveDB();
}

/* ---------- AI service ---------- */
const EMERGENCY_PATTERNS = [/chest pain|chest pressure|heart attack|can'?t breathe|cannot breathe|not breathing|unconscious|fainted|stroke|slurred|suicid|kill myself|overdose|severe bleeding/i, /ألم.{0,6}صدر|ضيق.{0,6}تنفس|لا أستطيع التنفس|فقد.{0,4}الوعي|إغماء|جلطة|انتحار|نزيف شديد/, /胸痛|胸闷|呼吸困难|喘不过气|昏迷|晕倒|中风|自杀|大出血/];
function isEmergencyText(s) { return EMERGENCY_PATTERNS.some((r) => r.test(s)); }
function aiContext(patientId) {
  const p = DB.profiles[patientId]; const sc = App.user.role === "caregiver" ? caregiverLink(patientId) : { meds: true, appts: true, health: true };
  const lines = [];
  lines.push(`Patient first name: ${(p.name || "").split(" ")[0]}; age: ${ageFrom(p.dob) ?? "unknown"}; goals: ${(p.goals || []).join(", ") || "none"}; known conditions: ${(p.conditions || []).join(", ") || "not provided"}; allergies: ${(p.allergies || []).join(", ") || "none recorded"}.`);
  if (sc.appts) {
    const ap = DB.appointments.filter((a) => a.patientId === patientId).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
    lines.push("Appointments: " + ap.map((a) => `${a.date} ${a.time} ${DOCTORS.find((d) => d.id === a.doctorId)?.name} (${a.specialty}) at ${CLINICS.find((c) => c.id === a.clinicId)?.name} — ${a.status}${a.notes ? " — " + a.notes : ""}`).join("; "));
  }
  if (sc.meds) {
    lines.push("Medications (as entered/verified; do not change): " + DB.medications.filter((m) => m.patientId === patientId && m.active).map((m) => `${m.name} ${m.dose}, ${m.frequency}, at ${m.times.join("/")}, ${m.food} food, ${m.verified ? "clinic-verified" : "patient-entered"}`).join("; "));
    lines.push(`Medication adherence last 7 days: ${adherence(patientId) ?? "n/a"}%. Today's schedule: ` + scheduleFor(patientId).map((i) => `${i.time} ${i.med.name} (${i.status})`).join("; "));
  }
  if (sc.health) {
    const ms = DB.measurements.filter((m) => m.patientId === patientId).sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 10);
    lines.push("Recent measurements: " + ms.map((m) => `${m.at.slice(0, 10)} ${m.type} ${m.value}${m.value2 ? "/" + m.value2 : ""} (${m.source})`).join("; "));
    lines.push("Recent check-ins: " + DB.checkins.filter((c) => c.patientId === patientId).slice(-5).map((c) => `${c.at.slice(0, 10)} ${c.mood} ${c.symptoms.join(",")} level=${c.level}`).join("; "));
    lines.push("Journal: " + DB.journal.filter((j) => j.patientId === patientId).slice(-6).map((j) => `${j.at.slice(0, 10)} [${j.tags.join(",")}] ${j.text}`).join("; "));
    lines.push("Timeline: " + DB.timeline.filter((x) => x.patientId === patientId).sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 8).map((x) => `${x.at.slice(0, 10)} ${tx(x.msg)}`).join("; "));
    lines.push("Data freshness: " + freshness(patientId).rows.map((r) => `${r.key}: ${r.days == null ? "never" : r.days + " days ago"}`).join("; "));
  }
  return lines.join("\n");
}
function aiRules(langName, patientId) {
  return `You are Wellpoint AI, a calm, warm health companion inside the Wellpoint app (Oman). Today is ${today()}.
Reply ONLY in ${langName}. Keep answers short (under 140 words), plain language, no markdown headings, at most 4 short bullet points using "•".
Safety rules you must always follow:
1. You do not diagnose. Never say the user has or does not have a condition. Distinguish general wellness guidance from medical advice.
2. Never invent, change or suggest doses. Never suggest stopping, skipping, delaying or switching medication. For medication changes: "talk to your doctor or pharmacist".
3. If anything sounds like an emergency, tell them to call 9999 (Oman emergency) or go to the nearest emergency department now.
4. If information is missing or stale, say so and suggest a check-in or asking a clinician. Missing data is not deterioration.
5. Patterns in journal notes are correlations, never causes.
6. Only use the data below. If you use it, say briefly which data you used.
Patient data (authorized for this viewer):
${aiContext(patientId)}`;
}
/* Offline/local fallback: deterministic, template-based answers from the same data. */
function aiLocalAnswer(q, patientId) {
  const s = q.toLowerCase();
  const has = (...w) => w.some((x) => s.includes(x));
  const p = DB.profiles[patientId];
  if (isEmergencyText(q)) return { text: t("ai_emergency"), emergency: true };
  if (has("appointment", "موعد", "预约", "visit", "زيارة", "就诊")) {
    const a = DB.appointments.filter((x) => x.patientId === patientId && ["confirmed", "rescheduled"].includes(x.status) && x.date >= today()).sort((a, b) => (a.date > b.date ? 1 : -1))[0];
    if (!a) return { text: t("ai_no_appt"), used: ["src_appts"] };
    return { text: t("ai_next_appt", { date: fmtDate(a.date, { weekday: "long", day: "numeric", month: "long" }), time: fmtTime(a.time), doctor: doctorName(DOCTORS.find((d) => d.id === a.doctorId)), clinic: clinicName(CLINICS.find((c) => c.id === a.clinicId)) }), used: ["src_appts"] };
  }
  if (has("medic", "pill", "tonight", "دواء", "أدوية", "الليلة", "药", "今晚", "dose", "جرعة")) {
    const items = scheduleFor(patientId).filter((i) => i.status !== "taken");
    const night = has("tonight", "الليلة", "今晚") ? items.filter((i) => hmToMin(i.time) >= 17 * 60) : items;
    if (!night.length) return { text: t("ai_no_meds_left"), used: ["src_meds"] };
    return { text: t("ai_meds_list") + "\n" + night.map((i) => `• ${fmtTime(i.time)} — ${i.med.name} (${i.med.dose}), ${t("food_" + i.med.food)}`).join("\n") + "\n\n" + t("ai_meds_note"), used: ["src_meds"] };
  }
  if (has("week", "أسبوع", "周", "changed", "تغير", "变化", "score", "summary", "ملخص", "总结")) {
    const adh = adherence(patientId);
    const sleep = DB.measurements.filter((m) => m.patientId === patientId && m.type === "sleep").slice(-7);
    const avgSleep = sleep.length ? (sleep.reduce((a, b) => a + b.value, 0) / sleep.length).toFixed(1) : null;
    const lines = [t("ai_week_intro")];
    if (adh != null) lines.push("• " + t("ai_week_adh", { v: adh }));
    if (avgSleep) lines.push("• " + t("ai_week_sleep", { v: avgSleep }));
    const fr = freshness(patientId).rows.find((r) => r.key === "fr_checkin");
    lines.push("• " + (fr?.days == null ? t("ai_week_no_checkin") : t("ai_week_checkin", { d: fr.days })));
    lines.push("\n" + t("ai_week_focus"));
    return { text: lines.join("\n"), used: ["src_meds", "src_health", "src_checkins"] };
  }
  if (has("ask", "doctor", "طبيب", "أسأل", "医生", "问")) {
    const qs = [t("ai_q1")];
    if ((p.conditions || []).includes("diabetes")) qs.push(t("ai_q_diabetes"));
    if ((p.conditions || []).includes("hypertension")) qs.push(t("ai_q_bp"));
    if (DB.medications.some((m) => m.patientId === patientId)) qs.push(t("ai_q_meds"));
    qs.push(t("ai_q_last"));
    return { text: t("ai_q_intro") + "\n" + qs.map((x) => "• " + x).join("\n"), used: ["src_profile", "src_meds"] };
  }
  if (has("organize", "نظم", "整理", "sleep", "نوم", "睡")) return { text: t("ai_organize"), used: ["src_profile"] };
  return { text: t("ai_generic"), used: [] };
}
