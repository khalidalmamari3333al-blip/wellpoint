/* ============================================================
   Clinic workspace (desktop/tablet first) + platform docs page
   Every query is scoped to App.user.clinicId — clinics never
   see another clinic's patients or appointments.
   ============================================================ */
const CLINIC_NAV = [
  ["overview", "grid", "appointments.read"], ["today", "calendar", "appointments.read"], ["upcoming", "clock", "appointments.read"], ["patients", "users", "patients.basic"],
  ["schedules", "stethoscope", "schedules.read"], ["followups", "refresh", "followups"], ["messages", "mail", "messages.write"], ["cprofile", "hospital", "clinic.profile"],
  ["staff", "shield", "staff.manage"], ["integrations", "link", "integrations"], ["caudit", "file", "appointments.read"]
];
const myClinic = () => CLINICS.find((c) => c.id === App.user.clinicId);
const clinicAppts = () => DB.appointments.filter((a) => a.clinicId === App.user.clinicId);
const patientName = (pid) => DB.profiles[pid]?.name || DB.users.find((u) => u.id === pid)?.name || "—";
function clinicPatients() {
  const ids = [...new Set(clinicAppts().map((a) => a.patientId))];
  return ids.map((id) => ({ id, name: patientName(id), consent: !!DB.profiles[id]?.consent?.shareWithClinics, last: clinicAppts().filter((a) => a.patientId === id).sort((a, b) => (a.date < b.date ? 1 : -1))[0] }));
}
function clinicView() {
  const c = myClinic(); const nav = UI.clinicNav; const role = App.user.staffRole;
  const item = CLINIC_NAV.find(([k]) => k === nav) || CLINIC_NAV[0];
  let content = can(item[2]) ? (CLINIC_SECTIONS[item[0]] || CLINIC_SECTIONS.overview)() : lockedSection(item[0]);
  return `<div class="ws">
    <aside class="ws-side"><span class="brand" style="padding:4px 10px 16px">${BRAND_SVG}<span>Wellpoint <span class="faint" style="font-weight:600">${esc(t("for_clinics"))}</span></span></span>
      ${CLINIC_NAV.map(([k, ic, perm]) => `<button class="nav-item ${nav === k ? "on" : ""}" data-act="cnav" data-v="${k}">${icon(ic, "ico-sm")}<span class="grow">${esc(t("cn_" + k))}</span>${can(perm) ? "" : icon("lock", "ico-sm")}</button>`).join("")}
      <div style="margin-top:auto" class="stack-sm"><div class="card flat" style="padding:12px"><b class="small">${esc(App.user.name)}</b><p class="xs muted">${esc(t("sr_" + role))}</p></div><button class="nav-item" data-act="logout">${icon("logout", "ico-sm")} ${esc(t("sign_out"))}</button></div></aside>
    <main class="ws-main">
      <div class="ws-top"><div class="grow"><span class="eyebrow">${esc(t("clinic_workspace"))}</span><h2>${esc(clinicName(c))}</h2></div><span class="pill info">${esc(t("sr_" + role))}</span>${langSwitcher()}<button class="icon-btn" data-act="theme" aria-label="${esc(t("theme"))}">${icon("moon")}</button><button class="icon-btn hide-desktop" data-act="logout" aria-label="${esc(t("sign_out"))}">${icon("logout")}</button></div>
      <nav class="ws-mnav">${CLINIC_NAV.map(([k, , perm]) => `<button class="chip sm ${nav === k ? "on" : ""}" data-act="cnav" data-v="${k}">${can(perm) ? "" : icon("lock", "ico-sm")}${esc(t("cn_" + k))}</button>`).join("")}</nav>
      <div class="page stack-lg" style="padding-bottom:40px">${content}</div>
    </main></div>`;
}
function lockedSection(k) {
  return `<h2>${esc(t("cn_" + k))}</h2><div class="locked" style="padding:28px">${icon("lock")}<div><b>${esc(t("role_no_access", { role: t("sr_" + App.user.staffRole) }))}</b><p class="small">${esc(t("role_no_access_d"))}</p></div></div>`;
}
function apptTable(list, opts = {}) {
  if (!list.length) return emptyState("calendar", t("c_no_appts"), "");
  return `<div class="table-wrap"><table><thead><tr><th>${esc(t("time"))}</th>${opts.date ? `<th>${esc(t("date"))}</th>` : ""}<th>${esc(t("patient"))}</th><th>${esc(t("doctor"))}</th><th>${esc(t("specialty"))}</th><th>${esc(t("status"))}</th><th></th></tr></thead><tbody>
    ${list.map((a) => `<tr><td class="num mono">${esc(fmtTime(a.time))}</td>${opts.date ? `<td>${esc(fmtDate(a.date))}</td>` : ""}<td><b>${esc(patientName(a.patientId))}</b></td><td>${esc(doctorName(DOCTORS.find((d) => d.id === a.doctorId)))}</td><td>${esc(t("sp_" + a.specialty))}</td><td>${statusPill(a.status)}</td>
      <td><div class="row" style="gap:6px">${["confirmed", "rescheduled"].includes(a.status) ? `<button class="btn sm good" data-act="c-status" data-id="${a.id}" data-v="completed">${esc(t("mark_done"))}</button><button class="btn sm secondary" data-act="c-status" data-id="${a.id}" data-v="no_show">${esc(t("st_no_show"))}</button><button class="btn sm ghost" data-act="c-status" data-id="${a.id}" data-v="cancelled">${esc(t("cancel"))}</button>` : ""}
      ${a.status === "completed" && can("clinical.update") ? `<button class="btn sm" data-act="c-update" data-id="${a.id}">${esc(t("post_visit"))}</button>` : ""}<button class="btn sm ghost" data-act="c-patient" data-id="${a.patientId}">${esc(t("open"))}</button></div></td></tr>`).join("")}
  </tbody></table></div>`;
}
const CLINIC_SECTIONS = {
  overview() {
    const all = clinicAppts(); const td = all.filter((a) => a.date === today());
    const up = all.filter((a) => a.date > today() && ["confirmed", "rescheduled"].includes(a.status));
    const ns = all.filter((a) => a.status === "no_show").length; const done = all.filter((a) => a.status === "completed").length;
    const docs = DOCTORS.filter((d) => d.clinicId === App.user.clinicId);
    return `<div class="kpis">${[["c_today", td.length], ["c_upcoming", up.length], ["c_completed", done], ["c_noshow", ns]].map(([k, v]) => `<div class="kpi"><span class="xs faint">${esc(t(k))}</span><div class="v" data-count="${v}">${fmtNum(v)}</div></div>`).join("")}</div>
    <div class="ws-grid"><section class="stack"><h3>${esc(t("cn_today"))}</h3>${apptTable(td.sort((a, b) => (a.time > b.time ? 1 : -1)))}</section>
      <section class="card stack"><h3>${esc(t("cn_schedules"))}</h3>${docs.map((d) => { const n = doctorSlots(d, today()).length; return `<div class="row"><div class="avatar">${esc(initials(d.name))}</div><div class="grow"><b class="small">${esc(doctorName(d))}</b><p class="xs muted">${esc(t("sp_" + d.specialty))}</p></div><span class="pill ${n ? "good" : "plain"}">${esc(t("open_slots", { n: fmtNum(n) }))}</span></div>`; }).join("")}
      <p class="xs faint">${esc(t("isolation_note"))}</p></section></div>`;
  },
  today() { return `<h2>${esc(t("cn_today"))}</h2>${apptTable(clinicAppts().filter((a) => a.date === today()).sort((a, b) => (a.time > b.time ? 1 : -1)))}`; },
  upcoming() { return `<h2>${esc(t("cn_upcoming"))}</h2>${apptTable(clinicAppts().filter((a) => a.date > today()).sort((a, b) => (a.date + a.time > b.date + b.time ? 1 : -1)), { date: true })}`; },
  patients() {
    const list = clinicPatients();
    return `<h2>${esc(t("cn_patients"))}</h2><p class="muted small">${esc(t("c_patients_d"))}</p>
    <div class="table-wrap"><table><thead><tr><th>${esc(t("patient"))}</th><th>${esc(t("last_visit"))}</th><th>${esc(t("data_sharing"))}</th><th></th></tr></thead><tbody>${list.map((p) => `<tr><td><b>${esc(p.name)}</b></td><td>${esc(fmtDate(p.last.date))} · ${statusPill(p.last.status)}</td><td>${p.consent ? `<span class="pill good">${esc(t("consented"))}</span>` : `<span class="pill plain">${esc(t("not_shared"))}</span>`}</td><td><button class="btn sm secondary" data-act="c-patient" data-id="${p.id}">${esc(t("open"))}</button></td></tr>`).join("")}</tbody></table></div>`;
  },
  schedules() {
    const docs = DOCTORS.filter((d) => d.clinicId === App.user.clinicId); const days = Array.from({ length: 7 }, (_, i) => addDays(today(), i));
    return `<h2>${esc(t("cn_schedules"))}</h2><div class="table-wrap"><table><thead><tr><th>${esc(t("doctor"))}</th>${days.map((d) => `<th>${esc(fmtDate(d, { weekday: "short", day: "numeric" }))}</th>`).join("")}</tr></thead><tbody>
      ${docs.map((d) => `<tr><td><b>${esc(doctorName(d))}</b><br><span class="xs muted">${esc(t("sp_" + d.specialty))}</span></td>${days.map((x) => { const booked = clinicAppts().filter((a) => a.doctorId === d.id && a.date === x && a.status !== "cancelled").length; const open = doctorSlots(d, x).length; return `<td>${d.days.includes(new Date(x + "T12:00:00").getDay()) ? `<span class="pill info">${fmtNum(booked)} ${esc(t("booked_lc"))}</span><br><span class="xs faint">${fmtNum(open)} ${esc(t("open_lc"))}</span>` : `<span class="faint">—</span>`}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div><p class="hint">${esc(t("demo_schedule_note"))}</p>`;
  },
  followups() {
    const pats = clinicPatients().filter((p) => p.consent);
    const rows = pats.map((p) => { const fr = freshness(p.id); const next = fr.next && fr.next.clinicId === App.user.clinicId ? fr.next : null; const ci = fr.rows.find((r) => r.key === "fr_checkin"); const lastCi = DB.checkins.filter((c) => c.patientId === p.id).sort((a, b) => (a.at < b.at ? 1 : -1))[0]; return { ...p, next, ci, lastCi }; });
    return `<h2>${esc(t("cn_followups"))}</h2><p class="muted small">${esc(t("c_followups_d"))}</p>
    <div class="table-wrap"><table><thead><tr><th>${esc(t("patient"))}</th><th>${esc(t("fr_next"))}</th><th>${esc(t("fr_checkin"))}</th><th>${esc(t("latest_level"))}</th><th></th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td><b>${esc(r.name)}</b></td><td>${r.next ? esc(fmtDate(r.next.date)) : `<span class="pill warn">${esc(t("none_scheduled"))}</span>`}</td><td>${r.ci?.days == null ? `<span class="pill plain">${esc(t("never"))}</span>` : `<span class="pill ${r.ci.days >= 3 ? "warn" : "good"}">${esc(t("days_ago", { n: fmtNum(r.ci.days) }))}</span>`}</td><td>${r.lastCi ? `<span class="pill ${r.lastCi.level === "red" ? "bad" : r.lastCi.level === "amber" ? "warn" : "good"}">${esc(t("lvl_" + r.lastCi.level))}</span>` : "—"}</td><td><button class="btn sm secondary" data-act="c-msg" data-id="${r.id}">${esc(t("message"))}</button></td></tr>`).join("")}</tbody></table></div>`;
  },
  messages() {
    const pats = clinicPatients(); const msgs = DB.messages.filter((m) => m.clinicId === App.user.clinicId).sort((a, b) => (a.at < b.at ? 1 : -1));
    return `<h2>${esc(t("cn_messages"))}</h2><form class="card stack" data-form="c-message" novalidate>${field("cm-p", t("patient"), `<select class="input" id="cm-p" name="patient">${pats.map((p) => `<option value="${p.id}" ${UI.cMsgTo === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select>`)}${field("cm-t", t("message"), `<textarea class="input" id="cm-t" name="text" required></textarea>`)}<div><button class="btn" type="submit">${icon("send", "ico-sm")} ${esc(t("send"))}</button></div><p class="hint">${esc(t("c_msg_note"))}</p></form>
    <div class="stack">${msgs.map((m) => `<div class="card flat stack-sm"><span class="xs faint">${esc(patientName(m.patientId))} · ${esc(relTime(m.at))}</span><p>${esc(m.text)}</p></div>`).join("")}</div>`;
  },
  cprofile() {
    const c = myClinic(); const ed = DB.clinicEdits[c.id] || {};
    return `<h2>${esc(t("cn_cprofile"))}</h2><form class="card stack" data-form="c-profile" novalidate>${field("cp-about", t("about"), `<textarea class="input" id="cp-about" name="about">${esc(ed.about || (c.aboutKey ? t(c.aboutKey) : ""))}</textarea>`)}${field("cp-hours", t("opening_hours"), `<input class="input" id="cp-hours" name="hours" value="${esc(ed.hours || "")}" placeholder="Sat–Thu 08:00–22:00">`)}<div><button class="btn" type="submit">${esc(t("save"))}</button></div><p class="hint">${esc(t("c_profile_note"))}</p></form>${clinicArt(c, true)}`;
  },
  staff() {
    const list = DB.staff.filter((s) => s.clinicId === App.user.clinicId);
    return `<h2>${esc(t("cn_staff"))}</h2><div class="table-wrap"><table><thead><tr><th>${esc(t("full_name"))}</th><th>${esc(t("email"))}</th><th>${esc(t("role"))}</th><th>${esc(t("status"))}</th><th></th></tr></thead><tbody>${list.map((s) => `<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.email)}</td><td>${esc(t("sr_" + s.staffRole))}</td><td>${statusPill(s.active ? "active" : "removed")}</td><td>${s.userId !== App.user.id ? `<button class="btn sm ghost" data-act="c-staff-toggle" data-id="${s.userId}">${esc(s.active ? t("deactivate") : t("activate"))}</button>` : ""}</td></tr>`).join("")}</tbody></table></div>
    <form class="card stack" data-form="c-staff" novalidate><h3>${esc(t("add_staff"))}</h3><div class="grid-3">${field("cs-n", t("full_name"), `<input class="input" id="cs-n" name="name" required>`)}${field("cs-e", t("email"), `<input class="input" id="cs-e" name="email" type="email" required>`)}${field("cs-r", t("role"), `<select class="input" id="cs-r" name="role">${["receptionist", "doctor", "admin"].map((r) => `<option value="${r}">${esc(t("sr_" + r))}</option>`).join("")}</select>`)}</div><div><button class="btn" type="submit">${esc(t("add_staff"))}</button></div></form>
    <section class="card stack"><h3>${esc(t("role_matrix"))}</h3><div class="table-wrap"><table><thead><tr><th>${esc(t("permission"))}</th><th>${esc(t("sr_admin"))}</th><th>${esc(t("sr_doctor"))}</th><th>${esc(t("sr_receptionist"))}</th></tr></thead><tbody>${[...new Set(Object.values(PERMS).flat())].map((p) => `<tr><td class="mono">${p}</td>${["admin", "doctor", "receptionist"].map((r) => `<td>${PERMS[r].includes(p) ? icon("check", "ico-sm") : `<span class="faint">—</span>`}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>`;
  },
  integrations() {
    return `<h2>${esc(t("cn_integrations"))}</h2><p class="muted small">${esc(t("c_int_d"))}</p><div class="grid-2">${Object.values(Adapters).map((a) => `<div class="card stack"><div class="row"><div class="iconwrap">${icon("link")}</div><b>${esc(t(a.label))}</b></div><p class="small muted">${esc(t(a.label + "_d"))}</p><span class="pill ${a.id === "api" ? "warn" : "good"}">${esc(t(a.id === "api" ? "needs_agreement" : "available_demo"))}</span></div>`).join("")}</div>`;
  },
  caudit() {
    const pids = new Set(clinicAppts().map((a) => a.patientId));
    const rows = DB.audit.filter((a) => DB.staff.some((s) => s.userId === a.actor && s.clinicId === App.user.clinicId) || (a.actor === App.user.id)).slice(0, 40);
    return `<h2>${esc(t("cn_caudit"))}</h2><div class="table-wrap"><table><thead><tr><th>${esc(t("when"))}</th><th>${esc(t("who"))}</th><th>${esc(t("action"))}</th><th>${esc(t("patient"))}</th></tr></thead><tbody>${rows.map((a) => `<tr><td>${esc(relTime(a.at))}</td><td>${esc(a.actorName)}</td><td>${esc(t(a.action))}${a.perm ? ` <span class="mono xs">${esc(a.perm)}</span>` : ""}</td><td>${a.patientId && pids.has(a.patientId) ? esc(patientName(a.patientId)) : "—"}</td></tr>`).join("")}</tbody></table></div>`;
  }
};
function clinicPatientSheet(pid) {
  const hasRel = clinicAppts().some((a) => a.patientId === pid);
  if (!hasRel) { audit("au_denied", pid, { perm: "patients.basic" }); return `<div class="locked">${icon("lock")} ${esc(t("err_forbidden"))}</div>`; }
  const p = DB.profiles[pid]; const clinical = can("patients.clinical"); const consent = !!p?.consent?.shareWithClinics;
  audit("au_clinic_view", pid);
  const appts = clinicAppts().filter((a) => a.patientId === pid).sort((a, b) => (a.date < b.date ? 1 : -1));
  let clin = "";
  if (!clinical) clin = `<div class="locked">${icon("lock", "ico-sm")} ${esc(t("role_no_clinical"))}</div>`;
  else if (!consent) clin = `<div class="locked">${icon("lock", "ico-sm")} ${esc(t("patient_no_consent"))}</div>`;
  else {
    const meds = DB.medications.filter((m) => m.patientId === pid && m.active);
    const ms = DB.measurements.filter((m) => m.patientId === pid && ["bp", "glucose", "hba1c"].includes(m.type)).sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 5);
    clin = `<dl class="kv"><dt>${esc(t("age"))}</dt><dd>${esc(ageFrom(p.dob) ?? "—")}</dd><dt>${esc(t("conditions"))}</dt><dd>${esc((p.conditions || []).map((c) => t("cond_" + c)).join(", ") || "—")}</dd><dt>${esc(t("allergies"))}</dt><dd>${esc((p.allergies || []).join(", ") || t("none_recorded"))}</dd><dt>${esc(t("med_adherence"))}</dt><dd>${adherence(pid) ?? "—"}%</dd></dl>
      <h4>${esc(t("my_meds"))}</h4><ul class="small" style="margin:0;padding-inline-start:18px">${meds.map((m) => `<li>${esc(m.name)} ${esc(m.dose)} · ${esc(t("freq_" + m.frequency))}</li>`).join("") || "<li>—</li>"}</ul>
      <h4>${esc(t("latest_measurements"))}</h4><ul class="small" style="margin:0;padding-inline-start:18px">${ms.map((m) => `<li>${esc(fmtDate(m.at.slice(0, 10)))} — ${esc(t("m_" + m.type))}: ${m.value}${m.value2 ? "/" + m.value2 : ""} (${esc(t("src_" + m.source))})</li>`).join("") || "<li>—</li>"}</ul>`;
  }
  return `<div class="stack"><div class="row"><div class="avatar">${esc(initials(patientName(pid)))}</div><div class="grow"><h3>${esc(patientName(pid))}</h3><p class="xs muted">${esc(t("visible_to_role", { role: t("sr_" + App.user.staffRole) }))}</p></div></div>
    <h4>${esc(t("tab_appts"))}</h4><div class="list">${appts.map((a) => `<div class="li"><span class="grow small">${esc(fmtDate(a.date))} ${esc(fmtTime(a.time))} · ${esc(t("sp_" + a.specialty))}</span>${statusPill(a.status)}</div>`).join("")}</div>
    <h4>${esc(t("clinical_info"))}</h4>${clin}<p class="hint">${esc(t("access_logged"))}</p><button class="btn secondary" data-act="sheet-close">${esc(t("close"))}</button></div>`;
}
function postVisitSheet(a) {
  return `<form class="stack" data-form="c-update" data-id="${a.id}" novalidate><h3>${esc(t("post_visit"))}</h3><p class="small muted">${esc(patientName(a.patientId))} · ${esc(fmtDate(a.date))}</p>
    ${field("pv-note", t("visit_summary"), `<textarea class="input" id="pv-note" name="note" placeholder="${esc(t("visit_summary_ph"))}"></textarea>`)}
    <div class="grid-2">${field("pv-bp", t("m_bp") + " (mmHg)", `<input class="input" id="pv-bp" name="bp" placeholder="128/82">`)}${field("pv-glu", t("m_glucose") + " (mg/dL)", `<input class="input" id="pv-glu" name="glucose" type="number">`)}</div>
    <div class="grid-3">${field("pv-med", t("med_name"), `<input class="input" id="pv-med" name="med">`)}${field("pv-dose", t("dose"), `<input class="input" id="pv-dose" name="dose">`)}${field("pv-freq", t("frequency"), `<select class="input" id="pv-freq" name="freq">${Object.keys(FREQ_COUNT).map((k) => `<option value="${k}">${esc(t("freq_" + k))}</option>`).join("")}</select>`)}</div>
    ${field("pv-food", t("food"), `<select class="input" id="pv-food" name="food">${["any", "before", "after", "with"].map((k) => `<option value="${k}">${esc(t("food_" + k))}</option>`).join("")}</select>`)}
    ${field("pv-fu", t("followup_date"), `<input class="input" id="pv-fu" name="followup" type="date" min="${addDays(today(), 1)}">`)}
    <div class="banner">${icon("link")}<span class="small">${esc(t("pv_adapter_note"))}</span></div>
    <div class="row"><button type="button" class="btn secondary grow" data-act="sheet-close">${esc(t("cancel"))}</button><button class="btn grow" type="submit">${esc(t("send_to_patient"))}</button></div></form>`;
}
function submitPostVisit(form) {
  requirePerm("clinical.update");
  const a = DB.appointments.find((x) => x.id === form.dataset.id); if (!a || a.clinicId !== App.user.clinicId) throw { code: "err_forbidden" };
  const p = DB.profiles[a.patientId]; if (!p?.consent?.shareWithClinics) throw { code: "patient_no_consent" };
  const fd = new FormData(form); const c = myClinic(); const pid = a.patientId;
  const recs = [];
  if (fd.get("note")) recs.push({ kind: "visit", text: fd.get("note"), clinicId: c.id });
  const bpm = /^(\d{2,3})\s*\/\s*(\d{2,3})$/.exec(fd.get("bp") || ""); if (bpm) recs.push({ kind: "measure", type: "bp", value: +bpm[1], value2: +bpm[2], date: new Date().toISOString(), clinicId: c.id });
  if (fd.get("glucose")) recs.push({ kind: "measure", type: "glucose", value: +fd.get("glucose"), unit: "mg/dL", date: new Date().toISOString(), clinicId: c.id });
  ingest(pid, recs, "clinic");
  if (fd.get("med")) {
    const sug = suggestTimes(fd.get("freq"), fd.get("food"), p.prefs, DB.medications.filter((m) => m.patientId === pid && m.active).flatMap((m) => m.times));
    DB.medications.push({ id: uid("med"), patientId: pid, name: fd.get("med"), dose: fd.get("dose"), frequency: fd.get("freq"), times: sug.times, food: fd.get("food"), start: today(), end: "", notes: "", doctor: a.doctorId, clinic: c.id, source: "clinic", verified: true, active: true });
    DB.timeline.push({ id: uid("tl"), patientId: pid, at: new Date().toISOString(), type: "medication", msg: { k: "tl_med_added", p: { med: fd.get("med") + " " + fd.get("dose") } }, source: "clinic" });
  }
  if (fd.get("followup")) {
    const d = DOCTORS.find((x) => x.id === a.doctorId); const slots = doctorSlots(d, fd.get("followup"));
    DB.appointments.push({ id: uid("apt"), patientId: pid, clinicId: c.id, doctorId: d.id, specialty: a.specialty, date: fd.get("followup"), time: slots[0] || "10:00", type: "follow_up", notes: "", status: "confirmed", history: [{ at: new Date().toISOString(), status: "confirmed" }], createdAt: new Date().toISOString() });
    DB.timeline.push({ id: uid("tl"), patientId: pid, at: new Date().toISOString(), type: "plan", msg: { k: "tl_followup_set", p: { date: fd.get("followup") } }, source: "clinic" });
    sendEmail(pid, "email_followup", { clinic: c.name, date: fd.get("followup") });
  }
  const link = (DB.integrations[pid] ||= []); const ex = link.find((i) => i.clinicId === c.id); if (ex) ex.lastSync = new Date().toISOString(); else link.push({ clinicId: c.id, adapter: "manual", status: "connected", lastSync: new Date().toISOString() });
  notify(pid, "clinic", { k: "n_clinic_update", p: { clinic: c.name } }, { silent: true });
  audit("au_clinic_update", pid); saveDB(); closeSheet(); toast(t("sent_to_patient")); render();
}

/* ---------- Platform / architecture page ---------- */
function platformView() {
  const inApp = !!App.user;
  const pre = (s) => `<pre>${esc(s.trim())}</pre>`;
  const body = `<div class="stack-lg doc-page">
    <div class="stack-sm"><span class="eyebrow">${esc(t("about_platform"))}</span><h1>${esc(t("tagline"))}</h1><p class="muted">${esc(t("core_statement"))}</p></div>
    <div class="banner">${icon("info")}<span class="small">${esc(t("docs_lang_note"))}</span></div>
    <section class="card stack"><h3>${esc(t("why_special"))}</h3><div class="grid-2">${Array.from({ length: 12 }, (_, i) => `<div class="row-top small"><span class="pill info plain num">${fmtNum(i + 1)}</span><span>${esc(t("diff_" + (i + 1)))}</span></div>`).join("")}</div></section>
    <section class="card stack"><h3>${esc(t("positioning"))}</h3><p>${esc(t("shifa_positioning"))}</p><p class="small muted">${esc(t("shifa_note"))}</p></section>
    <section class="card stack"><h3>${esc(t("care_loop"))}</h3>
<pre class="mermaid">flowchart TD
  A[Clinic visit] --> B[Patient record updated]
  B --> C[Medication plan created]
  C --> D[Follow-up date established]
  D --> E[Medication reminders]
  E --> F[Smart check-ins]
  F -->|Good / same| E
  F -->|Worse than usual| G[Relevant follow-up questions]
  G --> H[Clinician-approved rules evaluate data]
  H -->|Green| E
  H -->|Amber| I[Notify + suggest contacting provider]
  H -->|Red| J[Emergency guidance: call 9999]
  I --> K[Book / contact provider]
  K --> L[Follow-up appointment]
  L --> M[New clinic data via integration]
  M --> B</pre></section>
    <section class="card stack"><h3>Technical architecture</h3>
      <ul><li><b>Client</b>: this prototype is a dependency-free SPA (vanilla JS, ~5k lines) with a hash-free router, keyed i18n (en/ar/zh, RTL), token-based theming and an in-browser mock backend persisted to localStorage.</li>
      <li><b>Production target</b>: React Native (patient, iOS/Android) + Next.js (clinic web) sharing a typed API client; Node/NestJS or Go services behind an API gateway; PostgreSQL (row-level security per tenant) + object storage (documents, SSE-KMS); Redis for queues/rate limits; region: in-country or GCC data residency per Oman PDPL.</li>
      <li><b>Services</b>: identity, patient-profile, directory, scheduling, medication, care-engine (check-ins + rules), notifications, ai-gateway, integration-hub, audit.</li></ul>
      ${pre(`patient-app ─┐                         ┌─ scheduling ── PostgreSQL (RLS)
clinic-web  ──┼── API gateway (OIDC) ────┼─ medication / care-engine
caregiver   ──┘   rate limit, WAF        ├─ notifications ── FCM/APNs, SES, SMS
                                         ├─ ai-gateway ── LLM (no training on PHI)
                                         ├─ integration-hub ── adapters (FHIR, API, manual, mock)
                                         └─ audit (append-only, WORM storage)`)}</section>
    <section class="card stack"><h3>Database schema (core tables)</h3>${pre(`users(id, email, phone, password_hash, salt, role[patient|caregiver|clinic_staff], verified_at, mfa, locked_until)
sessions(id, user_id, device, created_at, last_seen, revoked_at)
patient_profiles(user_id PK, name, dob, gender, weight, height, nationality, governorate, lang,
                 emergency_contact jsonb, goals[], conditions[], allergies[], mode, simple_ui, plan)
consents(patient_id, scope[clinics|caregivers|research], granted, granted_at, revoked_at, version)
clinics(id, name, name_ar, governorate, area, type, phone, website, moh_license_no, verified_fields[])
doctors(id, clinic_id, name, name_ar, specialty, years, languages[], gender, fee, verified)
availability(doctor_id, weekday, start, end, slot_minutes)
appointments(id, patient_id, clinic_id, doctor_id, specialty, starts_at, type, notes, status, created_by)
appointment_events(appointment_id, status, at, actor)
medications(id, patient_id, name, dose_text, frequency, times[], food, start, end, source[patient|clinic],
            verified_by, prescriber_id, clinic_id, active)
dose_logs(id, medication_id, scheduled_for, status[taken|missed|snoozed|skipped], at, actor)
checkins(id, patient_id, at, mood, symptoms[], red_flags[], level, actor)
measurements(id, patient_id, type, value, value2, unit, at, source[patient|caregiver|device|clinic])
timeline_events(id, patient_id, at, type, message_key, params jsonb, source, level)
caregiver_links(id, patient_id, caregiver_user_id, relation, perms jsonb, status, invited_at)
clinic_staff(user_id, clinic_id, role[admin|doctor|receptionist], active)
notifications(id, user_id, category, message_key, params jsonb, at, read_at, action)
email_outbox(id, user_id, channel, template, params, lang, status, provider_id)
documents(id, patient_id, name, category, mime, size, object_key, source, uploaded_at)
journal_entries(id, patient_id, at, tags[], text)
integration_links(patient_id, clinic_id, adapter, status, last_sync, cursor)
audit_log(id, at, actor_id, patient_id, action, detail jsonb)  -- append-only`)}</section>
    <section class="card stack"><h3>API structure (REST, JSON, versioned)</h3>${pre(`POST /v1/auth/signup | /login | /verify | /password/forgot | /password/reset | /logout
GET  /v1/me · PATCH /v1/me/profile · GET/DELETE /v1/me/sessions/:id · DELETE /v1/me
GET  /v1/directory/clinics?gov=&specialty=&q=&gender=&lang=&price=&avail=
GET  /v1/directory/clinics/:id · GET /v1/directory/doctors/:id/slots?from=&to=
POST /v1/appointments · PATCH /v1/appointments/:id {status|reschedule} · GET /v1/appointments.ics/:id
GET/POST/PATCH /v1/medications · POST /v1/medications/:id/doses · POST /v1/medications/schedule:suggest
POST /v1/checkins → {level, reasons[]} · GET /v1/freshness · POST /v1/measurements
GET  /v1/timeline · GET /v1/summary?period=day|week|month · GET/POST /v1/journal
GET/POST/DELETE /v1/documents (pre-signed upload URLs)
POST /v1/caregivers/invite · PATCH /v1/caregivers/:id/perms · DELETE /v1/caregivers/:id
GET  /v1/notifications · POST /v1/notifications/read · PUT /v1/preferences
POST /v1/ai/chat (streamed; server builds consented context)
GET  /v1/clinic/appointments?date= · PATCH /v1/clinic/appointments/:id
GET  /v1/clinic/patients/:id (scope-filtered) · POST /v1/clinic/patients/:id/updates
POST /v1/integrations/:adapter/sync · POST /v1/webhooks/fhir-subscription`)}</section>
    <section class="card stack"><h3>Authentication & authorization</h3><ul>
      <li>Passwords: PBKDF2-SHA256 in this prototype (WebCrypto); Argon2id server-side in production. Lockout after 5 failures; codes expire in 10 minutes.</li>
      <li>Email/phone verification and password reset by one-time code (simulated outbox here; SES/SMS provider in production). Reset revokes all sessions.</li>
      <li>Sessions: short-lived access token + rotating refresh token, device list with remote sign-out. Optional passkeys / OTP MFA for clinic staff (required).</li>
      <li>RBAC for clinic staff (see role matrix in the clinic dashboard) + ABAC checks: clinic_id match, patient–clinic relationship, and patient consent. Caregiver access = active link + patient's caregiver consent + per-scope permissions.</li>
      <li>Every read of clinical data and every denied request is written to the audit log.</li></ul></section>
    <section class="card stack"><h3>Notification architecture</h3><ul>
      <li>Events (appointment.created, dose.due, checkin.amber, clinic.update…) → notification service → per-user preference + quiet-hours + dedupe filter → channels (in-app, push, email, SMS).</li>
      <li>Messages are stored as translation keys + params and rendered in the recipient's language at display/send time.</li>
      <li>Medication reminders: local scheduled notifications on device (iOS time-sensitive / Android exact alarms + full-screen intent where the OS allows). The alarm stays until Taken / Snooze / Dismiss where supported; it cannot be made undismissable on every device.</li>
      <li>Smart suppression: identical unread notifications are merged; stale-data prompts are sent at most once per window.</li></ul></section>
    <section class="card stack"><h3>AI architecture</h3><ul>
      <li>ai-gateway builds a minimal, consent-filtered context (profile summary, schedule, appointments, recent data, freshness) — caregivers get only their permitted scopes.</li>
      <li>Hard pre-filters: emergency patterns (3 languages) short-circuit to emergency guidance without calling the model.</li>
      <li>System rules: no diagnosis, never invent/alter doses, never advise stopping meds, cite data used, say when data is missing.</li>
      <li>Medication scheduling is deterministic code (frequency × wake/sleep × food rules); the model only explains. Clinical alerts come from versioned, clinician-approved rules — never from the model.</li>
      <li>In this prototype the chat calls Claude through the artifact's sampling capability when the viewer allows it, and falls back to a local template engine otherwise.</li></ul></section>
    <section class="card stack"><h3>Integration architecture</h3><ul>
      <li>integration-hub exposes one interface: <span class="mono">pull(patient, source) → NormalizedRecord[]</span>, <span class="mono">push(patient, record)</span>.</li>
      <li>Adapters: <b>Mock</b> (demo), <b>FHIR R4</b> (SMART on FHIR, LOINC-coded Observations, MedicationRequest, Encounter, Appointment; Subscriptions for push), <b>Custom API</b> (per-EMR mapping), <b>Manual clinic update</b> (clinic dashboard form).</li>
      <li>Planned: national health system / Shifa (only with official approval), clinic EMRs, labs (HL7 v2/FHIR), pharmacies, Apple Health, Google Health Connect, BLE devices.</li>
      <li>Every inbound record carries source + timestamp so data freshness is always explicit.</li></ul></section>
    <section class="card stack"><h3>What is mocked in this prototype</h3><ul>
      <li>Backend, database and sessions (browser localStorage). Emails/SMS go to a visible simulated outbox.</li>
      <li>Doctors, schedules, fees, ratings, services, opening hours and clinic images are placeholders. Facility names/locations come from public listings; verified fields are marked per clinic.</li>
      <li>FHIR / mock sync returns synthetic observations. Device data (sleep) is synthetic.</li>
      <li>Clinical thresholds are illustrative only and not clinically validated.</li>
      <li>Payments (Wellpoint Plus) are a toggle; no billing.</li></ul></section>
    <section class="card stack"><h3>Needs real credentials / external APIs</h3><ul><li>Email (e.g. Amazon SES), SMS gateway (Omantel/Ooredoo aggregator), push (FCM/APNs).</li><li>LLM provider API key via server-side ai-gateway.</li><li>Maps/directions API, calendar sync (Google/Microsoft), payment gateway (e.g. local acquiring bank).</li><li>Apple HealthKit / Google Health Connect entitlements.</li></ul></section>
    <section class="card stack"><h3>Needs healthcare-provider agreements</h3><ul><li>MOH licensed-establishment and practitioner directory access (open data terms) and verification workflow.</li><li>Data-sharing agreements + technical onboarding with each clinic/hospital EMR (FHIR or custom API).</li><li>Any national health record / Shifa integration: official MOH approval required.</li><li>Lab and pharmacy partnerships; clinical governance sign-off for alert rules; PDPL compliance review and DPIA.</li></ul></section>
    <section class="card stack"><h3>Monetization-ready design</h3><ul><li>B2C: Wellpoint Plus (caregiver circle, advanced summaries, document storage, priority reminders).</li><li>B2B: clinic subscription (dashboard, follow-up tools, messaging, integrations) — plan field on clinic tenant.</li><li>Enterprise: hospital group contracts, SSO, custom integrations, SLAs.</li><li>Marketplace: booking/service fees where legally and commercially appropriate; lab/pharmacy partnerships where permitted.</li><li><b>Never</b>: selling patient health data.</li></ul></section>
    <section class="card stack"><h3>Recommended next steps</h3><ol><li>Clinical governance: review rules, thresholds, symptom sets, copy with physicians; define escalation protocols.</li><li>Replace seed directory with MOH open-data import + clinic self-verification portal.</li><li>Build production backend (auth, RLS, audit) and native apps; pen-test; PDPL DPIA.</li><li>Pilot with 2–3 clinics using manual + FHIR adapters; measure adherence and check-in engagement.</li><li>Native alarm-style reminders, offline mode, accessibility audit (WCAG 2.2 AA, Arabic screen readers).</li><li>Pursue lab/pharmacy and national-system partnerships.</li></ol></section>
  </div>`;
  if (inApp && App.user.role !== "clinic") return shell(`${header(t("about_platform"), { back: true })}<div class="page">${body}</div>`, { tab: "profile" });
  return `<div class="patient-shell" style="max-width:820px;padding-bottom:40px">${inApp ? "" : `<header class="topbar"><button class="icon-btn" data-act="back">${flipIcon("back")}</button><span class="brand">${BRAND_SVG}<span>Wellpoint</span></span><div class="grow"></div>${langSwitcher()}</header>`}<div class="page">${body}</div></div>`;
}
