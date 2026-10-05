/* ============================================================
   Event delegation, actions, form handlers, boot
   ============================================================ */
const errMsg = (e) => t(e?.code || "err_generic");
const ACTIONS = {
  back: () => back(App.user ? "home" : "login"),
  noop: () => {},
  lang: (el) => { setLang(el.dataset.v); render(); },
  theme: () => { const cur = safeStore.get("wellpoint.theme") || "system"; const nx = { system: "light", light: "dark", dark: "system" }[cur]; safeStore.set("wellpoint.theme", nx); applyTheme(); toast(t("theme") + ": " + t("theme_" + nx), nx === "dark" ? "moon" : "sun"); render(); },
  "sheet-close": () => closeSheet(),
  scrim: (el, ev) => { if (ev.target === el) closeSheet(); },
  "confirm-yes": () => { const c = UI.confirm; if (!c) return; if (c.typed) { const v = $("#confirm-typed")?.value.trim(); if (v !== c.typed) { toast(t("type_mismatch"), "alert"); return; } } UI.confirm = null; closeSheet(); c.onYes(); },
  // auth
  "demo-login": async (el) => { UI.auth.identifier = el.dataset.v; try { await api.auth.login(el.dataset.v, "Wellpoint1"); afterLogin(); } catch (e) { UI.auth.err = e.code; render(); } },
  "reset-demo": () => confirmSheet({ title: t("reset_demo"), body: t("reset_demo_d"), cta: t("reset_demo"), danger: true, onYes: async () => { safeStore.del(DB_KEY); safeStore.del(SESSION_KEY); await seedDB(); saveDB(); App.user = null; UI.chat = []; toast(t("demo_reset_done")); go("login", {}, { replace: true }); } }),
  resend: () => { api.auth.sendCode(UI.auth.pending, "verify"); toast(t("code_sent")); },
  "show-outbox": () => { if (App.user) go("emails"); else openSheet(outboxForPending); },
  privacy: () => openSheet(() => `<h3>${esc(t("privacy_policy"))}</h3><div class="stack small muted" style="margin-top:10px">${["pp_1", "pp_2", "pp_3", "pp_4", "pp_5"].map((k) => `<p>${esc(t(k))}</p>`).join("")}<p class="hint">${esc(t("pp_placeholder"))}</p></div><button class="btn block" style="margin-top:14px" data-act="sheet-close">${esc(t("close"))}</button>`),
  logout: () => { api.auth.logout(); UI.chat = []; UI.stack = []; UI.clinicNav = "overview"; UI.alarm = null; go("login", {}, { replace: true }); },
  // onboarding
  "ob-toggle": (el) => { const k = el.dataset.k, v = el.dataset.v; const arr = (UI.ob.data[k] ||= []); const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else { if (k === "conditions" && ["none", "prefer_not"].includes(v)) arr.length = 0; if (k === "conditions" && v !== "none" && v !== "prefer_not") { ["none", "prefer_not"].forEach((x) => { const j = arr.indexOf(x); if (j >= 0) arr.splice(j, 1); }); } arr.push(v); } render(); },
  "ob-flag": (el) => { UI.ob.data[el.dataset.k] = !UI.ob.data[el.dataset.k]; render(); },
  "ob-back": () => { UI.ob.step = Math.max(0, UI.ob.step - 1); render({ scrollTop: true }); },
  "ob-skip": () => { UI.ob.step++; render({ scrollTop: true }); },
  "ob-next": () => {
    const d = UI.ob.data, key = OB_STEPS[UI.ob.step];
    if (key === "ob_about" && !(d.name || "").trim()) { d.name = App.user.name; }
    if (key === "ob_body" && ((d.weight && (d.weight < 2 || d.weight > 400)) || (d.height && (d.height < 30 || d.height > 250)))) { toast(t("err_body_range"), "alert"); return; }
    if (UI.ob.step >= OB_STEPS.length - 1) return finishOnboarding();
    UI.ob.step++; render({ scrollTop: true });
  },
  // home
  mood: (el) => {
    const v = el.dataset.v, pid = PID();
    if (v === "worse") { UI.ci = { step: 1, mood: "worse", symptoms: [], redFlags: [], bp: "", glucose: "", result: null }; go("checkin"); return; }
    const res = evaluateRules({ profile: PROF(), mood: v });
    DB.checkins.push({ id: uid("ci"), patientId: pid, at: new Date().toISOString(), mood: v, symptoms: [], level: res.level, by: "patient" });
    DB.timeline.push({ id: uid("tl"), patientId: pid, at: new Date().toISOString(), type: "checkin", msg: { k: "tl_checkin", p: { mood: { k: "mood_" + v } } }, source: "patient" });
    saveDB(); toast(t(v === "good" ? "mood_saved_good" : "mood_saved_ok")); render();
  },
  "find-care": () => { UI.disc.searched = true; go("discover"); },
  "book-followup": () => { const p = PROF(); const pc = p.primaryClinic; const last = DB.appointments.filter((a) => a.patientId === PID()).sort((a, b) => (a.date < b.date ? 1 : -1))[0]; startBooking(pc ? { clinicId: pc, specialty: last?.clinicId === pc ? last.specialty : "", type: "follow_up" } : { type: "follow_up" }); },
  // discovery
  "disc-gov": (el) => { UI.disc.gov = UI.disc.gov === el.dataset.v ? "" : el.dataset.v; UI.disc.filters.area = ""; render(); },
  "disc-spec": (el) => { UI.disc.spec = UI.disc.spec === el.dataset.v ? "" : el.dataset.v; render(); },
  filters: () => openSheet(filtersSheet),
  "disc-more": () => { UI.disc.more = true; render(); },
  "apply-filters": () => { closeSheet(); render(); },
  "clear-filters": () => { UI.disc.filters = { gender: "", avail: "", lang: "", price: "", type: "", area: "" }; UI.disc.q = ""; UI.disc.gov = ""; UI.disc.spec = ""; closeSheet(); render(); },
  "doctor-open": (el) => { const d = DOCTORS.find((x) => x.id === el.dataset.id); openSheet(() => doctorSheet(d)); },
  "book-doc": (el) => startBooking({ doctorId: el.dataset.id }),
  "book-clinic": (el) => startBooking({ clinicId: el.dataset.id }),
  "quick-book": (el) => { startBooking({ doctorId: el.dataset.doc }); UI.bk.date = el.dataset.date; UI.bk.time = el.dataset.time; render(); },
  call: (el) => { const n = el.dataset.v; if (!n) { toast(t("phone_unverified"), "info"); return; } openSheet(() => `<h3>${esc(t("call"))}</h3><p class="code-box num" style="margin:16px 0;font-size:1.4rem;letter-spacing:.05em">${esc(n)}</p><div class="grid-2"><a class="btn" href="tel:${esc(n.replace(/\s/g, ""))}">${icon("phone", "ico-sm")} ${esc(t("call"))}</a><button class="btn secondary" data-act="copy" data-v="${esc(n)}">${icon("copy", "ico-sm")} ${esc(t("copy"))}</button></div><p class="hint" style="margin-top:10px">${esc(t("tel_note"))}</p>`); },
  copy: (el) => copyText(el.dataset.v),
  // booking
  "bk-set": (el) => { const b = UI.bk; b[el.dataset.k] = el.dataset.v; if (el.dataset.k === "clinicId") { b.specialty = CLINICS.find((c) => c.id === b.clinicId).specialties.includes(b.specialty) ? b.specialty : ""; b.doctorId = ""; } if (el.dataset.k === "specialty") b.doctorId = ""; if (el.dataset.k === "doctorId") { b.date = ""; b.time = ""; } render(); },
  "bk-step": (el) => { UI.bk.step = Number(el.dataset.v); render({ scrollTop: true }); },
  "bk-date": (el) => { UI.bk.date = el.dataset.v; UI.bk.time = ""; render(); },
  "bk-confirm": () => confirmBooking(),
  // appointments
  "appt-tab": (el) => { UI.apptTab = el.dataset.v; render(); },
  "appt-open": (el) => { const a = DB.appointments.find((x) => x.id === el.dataset.id); if (a) openSheet(() => apptSheet(a)); },
  "appt-cancel": (el) => { const a = DB.appointments.find((x) => x.id === el.dataset.id); confirmSheet({ title: t("cancel_appt"), body: t("cancel_appt_d"), cta: t("cancel_appt"), danger: true, onYes: () => { patientScope(a.patientId); a.status = "cancelled"; a.history.push({ at: new Date().toISOString(), status: "cancelled" }); const c = CLINICS.find((x) => x.id === a.clinicId); DB.timeline.push({ id: uid("tl"), patientId: a.patientId, at: new Date().toISOString(), type: "appointment", msg: { k: "tl_appt_cancelled", p: { clinic: c.name } }, source: isCaregiver() ? "caregiver" : "patient" }); notify(a.patientId, "appointments", { k: "n_appt_cancelled", p: { clinic: c.name } }, { silent: true }); sendEmail(a.patientId, "email_appt_change", { clinic: c.name, date: a.date, time: a.time }); saveDB(); toast(t("appt_cancelled")); render(); } }); },
  "appt-resched": (el) => { const a = DB.appointments.find((x) => x.id === el.dataset.id); closeSheet(); startBooking({ doctorId: a.doctorId, rescheduleId: a.id, type: a.type, notes: a.notes }); },
  ics: async (el) => {
    const a = DB.appointments.find((x) => x.id === el.dataset.id); const ics = icsFor(a);
    const dl = window.claude?.use ? await window.claude.use("downloads").catch(() => null) : null;
    if (dl) { try { await dl.save({ filename: "wellpoint-appointment.ics", data: ics }); toast(t("calendar_saved")); return; } catch {} }
    openSheet(() => `<h3>${esc(t("add_calendar"))}</h3><p class="small muted" style="margin:8px 0">${esc(t("ics_fallback"))}</p><pre class="mono" style="white-space:pre-wrap;font-size:11px;background:var(--surface-2);padding:10px;border-radius:12px;max-height:40vh;overflow:auto">${esc(ics)}</pre><button class="btn block" data-act="copy" data-v="${esc(ics)}">${icon("copy", "ico-sm")} ${esc(t("copy"))}</button>`);
  },
  // meds
  dose: (el) => { try { logDose(el.dataset.med, el.dataset.time, el.dataset.s); toast(t("dose_logged")); render(); if (el.dataset.s === "taken" && !isCaregiver()) celebrate(); } catch (e) { toast(errMsg(e), "alert"); } },
  "test-alarm": () => { const it = scheduleFor(PID()).find((i) => i.status !== "taken") || scheduleFor(PID())[0]; if (!it) return; showAlarm({ medId: it.med.id, time: it.time, key: "test" }); },
  "alarm-pref": (el) => { const pr = DB.profiles[App.user.id].prefs; pr[el.dataset.k] = pr[el.dataset.k] === false; saveDB(); render(); },
  "alarm-perm": async () => { if (!("Notification" in window)) { toast(t("alarm_denied"), "info"); return; } try { const r = await Notification.requestPermission(); toast(t(r === "granted" ? "alarm_enabled" : "alarm_denied"), r === "granted" ? "bell" : "info"); } catch { toast(t("alarm_denied"), "info"); } render(); },
  "clock-all": () => { const items = scheduleFor(PID()).map((i) => ({ med: i.med, time: i.time })); UI.clockItems = items; openSheet(() => clockSheet(items)); },
  "clock-ics": async () => {
    const ics = icsForDoses(UI.clockItems || []);
    const dl = window.claude?.use ? await window.claude.use("downloads").catch(() => null) : null;
    if (dl) { try { await dl.save({ filename: "wellpoint-medication-reminders.ics", data: ics }); toast(t("calendar_saved")); return; } catch {} }
    openSheet(() => `<h3>${esc(t("clk_calendar"))}</h3><p class="small muted" style="margin:8px 0">${esc(t("ics_fallback"))}</p><pre class="mono" style="white-space:pre-wrap;font-size:11px;background:var(--surface-2);padding:10px;border-radius:12px;max-height:40vh;overflow:auto">${esc(ics)}</pre><button class="btn block" data-act="copy" data-v="${esc(ics)}">${icon("copy", "ico-sm")} ${esc(t("copy"))}</button>`);
  },
  "rt-answer": () => {
    const r = UI.rt; const k = RT_STEPS[r.step];
    if (k === "busy") { const f = $("#rt-from")?.value, to = $("#rt-to")?.value; if (!f || !to || f >= to) { toast(t("rt_busy_invalid"), "alert"); return; } r.a.busy = [f, to]; }
    else { const v = $("#rt-in")?.value; if (!v) return; r.a[k] = v; }
    rtNext();
  },
  "rt-skip": () => { const r = UI.rt; r.a[RT_STEPS[r.step]] = null; rtNext(); },
  "rt-group": (el) => { UI.rt.a.group = el.dataset.v === "1"; rtNext(); },
  "rt-restart": () => { UI.rt.step = 0; UI.rt.plan = null; render(); },
  "rt-apply": () => {
    const pid = PID(); const r = UI.rt; const p = DB.profiles[pid];
    r.plan.forEach((o) => { const m = DB.medications.find((x) => x.id === o.med.id); if (m && o.times.length) m.times = o.times; });
    p.routine = { ...r.a }; p.prefs.wake = r.a.wake; p.prefs.sleep = r.a.sleep;
    DB.timeline.push({ id: uid("tl"), patientId: pid, at: new Date().toISOString(), type: "medication", msg: { k: "tl_routine" }, source: "patient" });
    saveDB(); UI.alarmed = {}; toast(t("rt_applied"));
    const items = r.plan.flatMap((o) => o.times.map((time) => ({ med: DB.medications.find((x) => x.id === o.med.id), time })));
    UI.rt = null; UI.clockItems = items; go("meds", {}, { replace: true });
    openSheet(() => `<p class="eyebrow">${esc(t("rt_applied"))}</p>` + clockSheet(items));
  },
  alarm: (el) => {
    const a = UI.alarm; const v = el.dataset.v; UI.alarm = null; Ring.stop();
    if (v === "taken") { logDose(a.medId, a.time, "taken"); toast(t("dose_logged")); }
    if (v === "snooze") { UI.snoozed[a.key] = hmToMin(nowHM()) + 10; delete UI.alarmed[a.key]; toast(t("snoozed"), "clock"); }
    if (v === "details") { renderLayer(); go("med-edit", { id: a.medId }); return; }
    render();
  },
  "suggest-times": () => { const f = UI.medForm; const existing = DB.medications.filter((m) => m.patientId === PID() && m.active && m.id !== f.id).flatMap((m) => m.times); const rtn = PROF().routine; if (rtn) { const pl = planFromRoutine([{ ...f, id: f.id || "new" }], rtn)[0]; f.suggest = { times: pl.times, reasons: [...pl.reasons, { k: "why_times_never_dose" }] }; } else f.suggest = suggestTimes(f.frequency, f.food, PROF().prefs, existing); render(); },
  "apply-suggest": () => { const f = UI.medForm; f.times = [...f.suggest.times]; f.suggest = null; render(); toast(t("times_applied")); },
  "dismiss-suggest": () => { UI.medForm.suggest = null; render(); },
  "med-delete": (el) => confirmSheet({ title: t("remove_med"), body: t("remove_med_d"), cta: t("remove_med"), danger: true, onYes: () => { const m = DB.medications.find((x) => x.id === el.dataset.id); m.active = false; DB.timeline.push({ id: uid("tl"), patientId: m.patientId, at: new Date().toISOString(), type: "medication", msg: { k: "tl_med_removed", p: { med: m.name } }, source: "patient" }); saveDB(); UI.medForm = null; back("meds"); toast(t("med_removed")); } }),
  "ai-explain-schedule": async () => {
    const out = $("#sched-explain"); const pid = PID();
    const sample = UI.aiLive ? await window.claude.use("sample").catch(() => null) : null;
    const local = () => { const s = scheduleFor(pid); out.innerHTML = `<div class="banner">${icon("sparkle")}<span class="small">${esc(t("sched_local", { n: fmtNum(s.length), first: s[0] ? fmtTime(s[0].time) : "—", last: s.at(-1) ? fmtTime(s.at(-1).time) : "—" }))}</span></div>`; };
    if (!sample) return local();
    out.innerHTML = `<p class="small muted thinking">${esc(t("thinking"))}</p>`;
    try { const { text } = await sample(aiRules({ en: "English", ar: "Arabic", zh: "Simplified Chinese" }[I18N.lang], pid) + "\n\nTask: In 3 short bullets explain how today's medication schedule fits the patient's day (timing, food instructions, grouping). Do not change anything.", { modelTier: "quick" }); out.innerHTML = `<div class="banner">${icon("sparkle")}<span class="small" style="white-space:pre-wrap">${esc(text)}</span></div>`; } catch { local(); }
  },
  // health
  "meas-type": (el) => { UI.meas.type = el.dataset.v; render(); },
  sync: async (el) => {
    const pid = PID(); const link = DB.integrations[pid].find((i) => i.clinicId === el.dataset.c); el.disabled = true; el.innerHTML = `<span class="thinking">${esc(t("syncing"))}</span>`;
    try { const recs = await Adapters[link.adapter].pull(pid, link.clinicId); ingest(pid, recs, "clinic"); link.lastSync = new Date().toISOString(); audit("au_sync", pid); saveDB(); toast(t("sync_done", { n: fmtNum(recs.length) })); } catch (e) { toast(errMsg(e), "alert"); }
    render();
  },
  connect: (el) => { const pid = PID(); const link = DB.integrations[pid].find((i) => i.clinicId === el.dataset.c); confirmSheet({ title: t("connect"), body: t("connect_d", { clinic: clinicName(CLINICS.find((c) => c.id === link.clinicId)) }), cta: t("connect"), onYes: () => { link.status = "connected"; audit("au_consent_connect", pid); saveDB(); toast(t("connected")); render(); } }); },
  "ci-mood": (el) => { const ci = UI.ci; ci.mood = el.dataset.v; if (ci.mood === "worse") { ci.step = 1; render({ scrollTop: true }); } else { submitCheckin(); } },
  "ci-sym": (el) => { const a = UI.ci.symptoms; const i = a.indexOf(el.dataset.v); i >= 0 ? a.splice(i, 1) : a.push(el.dataset.v); render(); },
  "ci-red": (el) => { const a = UI.ci.redFlags; const i = a.indexOf(el.dataset.v); i >= 0 ? a.splice(i, 1) : a.push(el.dataset.v); render(); },
  "ci-step": (el) => { UI.ci.step = Number(el.dataset.v); render({ scrollTop: true }); },
  "ci-submit": () => submitCheckin(),
  "sum-per": (el) => { UI.sumPeriod = el.dataset.v; render(); },
  "jn-tag": (el) => { const a = UI.jn.tags; const i = a.indexOf(el.dataset.v); i >= 0 ? a.splice(i, 1) : a.push(el.dataset.v); render(); },
  "jn-save": () => { const j = UI.jn; if (!j.tags.length && !j.text.trim()) { toast(t("journal_need"), "info"); return; } DB.journal.push({ id: uid("j"), patientId: PID(), at: new Date().toISOString(), tags: [...j.tags], text: j.text.trim() }); UI.jn = { tags: [], text: "" }; saveDB(); toast(t("note_saved")); render(); },
  "jn-ai": async () => {
    const out = $("#jn-ai"); const pid = PID(); const sample = UI.aiLive ? await window.claude.use("sample").catch(() => null) : null;
    if (!sample) { out.textContent = localPatterns(pid); return; }
    out.innerHTML = `<span class="thinking">${esc(t("thinking"))}</span>`;
    try { const { text } = await sample(aiRules({ en: "English", ar: "Arabic", zh: "Simplified Chinese" }[I18N.lang], pid) + "\n\nTask: Summarize patterns in the journal notes in 2-3 sentences. Say explicitly these are patterns, not causes. Suggest one gentle wellness focus.", { modelTier: "quick" }); out.textContent = text; } catch { out.textContent = localPatterns(pid); }
  },
  "doc-cat": (el) => { UI.docCat = el.dataset.v; render(); },
  "doc-open": (el) => { const d = DB.documents.find((x) => x.id === el.dataset.id); openSheet(() => docSheet(d)); },
  "doc-del": (el) => confirmSheet({ title: t("delete_doc"), body: t("delete_doc_d"), cta: t("delete"), danger: true, onYes: () => { DB.documents = DB.documents.filter((d) => d.id !== el.dataset.id); audit("au_doc_delete", PID()); saveDB(); toast(t("deleted")); render(); } }),
  // ai
  "ai-suggest": (el) => askAI(t(el.dataset.v)),
  "ai-stop": () => aiCtl?.abort(),
  // notifications
  "notif-cat": (el) => { UI.notifCat = el.dataset.v; render(); },
  "notif-all-read": () => { DB.notifications.filter((n) => n.userId === App.user.id).forEach((n) => (n.read = true)); saveDB(); render(); },
  "notif-open": (el) => { const n = DB.notifications.find((x) => x.id === el.dataset.id); n.read = true; saveDB(); const map = { appointments: "appointments", medications: "meds", health: "health", ai: "ai", caregiver: isCaregiver() ? "home" : "caregiver", clinic: "notifications", system: "home" }; const target = map[n.cat]; if (target === "notifications") render(); else go(target); },
  // profile & settings
  "toggle-simple": () => { const me = DB.profiles[App.user.id]; me.simple = !me.simple; App.profile = me; saveDB(); render(); },
  "set-mode": (el) => { DB.profiles[App.user.id].mode = el.dataset.v; saveDB(); render(); },
  "pf-toggle": (el) => { const a = UI.pf[el.dataset.k]; const v = el.dataset.v; const i = a.indexOf(v); i >= 0 ? a.splice(i, 1) : a.push(v); render(); },
  "pref-cat": (el) => { const p = DB.profiles[App.user.id].prefs; p.categories[el.dataset.k] = p.categories[el.dataset.k] === false; saveDB(); render(); },
  "pref-email": (el) => { const p = DB.profiles[App.user.id].prefs; if (el.dataset.k === "all") p.email = !p.email; else { p.emailTypes[el.dataset.k] = !p.emailTypes[el.dataset.k]; if (p.emailTypes[el.dataset.k]) p.email = true; } saveDB(); render(); },
  consent: (el) => { const c = DB.profiles[App.user.id].consent; c[el.dataset.k] = !c[el.dataset.k]; audit(c[el.dataset.k] ? "au_consent_on" : "au_consent_off", App.user.id); saveDB(); toast(t("saved")); render(); },
  revoke: (el) => { const s = DB.sessions.find((x) => x.id === el.dataset.id); s.revoked = true; audit("au_session_revoked", App.user.id); saveDB(); render(); },
  "delete-account": () => confirmSheet({ title: t("delete_account"), body: t("delete_account_confirm"), cta: t("delete_forever"), danger: true, typed: "DELETE", onYes: () => { api.auth.deleteAccount(); UI.stack = []; go("login", {}, { replace: true }); toast(t("account_deleted")); } }),
  "toggle-plan": () => { const me = DB.profiles[App.user.id]; me.plan = me.plan === "plus" ? "free" : "plus"; saveDB(); toast(t(me.plan === "plus" ? "plus_on" : "plus_off")); render(); },
  "cg-perm": (el) => { const c = DB.caregivers.find((x) => x.id === el.dataset.id); c.perms[el.dataset.k] = !c.perms[el.dataset.k]; audit("au_cg_perm_change", c.patientId); saveDB(); render(); },
  "cg-remove": (el) => { const c = DB.caregivers.find((x) => x.id === el.dataset.id); confirmSheet({ title: t("remove_access"), body: t("remove_access_d", { name: c.name }), cta: t("remove_access"), danger: true, onYes: () => { c.status = "removed"; audit("au_cg_removed", c.patientId); if (c.caregiverUserId) notify(c.caregiverUserId, "caregiver", { k: "n_cg_removed" }, { silent: true }); saveDB(); toast(t("access_removed")); render(); } }); },
  "cg-accept": (el) => { const c = DB.caregivers.find((x) => x.id === el.dataset.id); c.status = "active"; audit("au_cg_accepted", c.patientId); saveDB(); toast(t("cg_accepted_sim")); render(); },
  // clinic
  cnav: (el) => { UI.clinicNav = el.dataset.v; render({ scrollTop: true }); },
  "c-status": (el) => {
    try { requirePerm("appointments.write"); const a = DB.appointments.find((x) => x.id === el.dataset.id); if (a.clinicId !== App.user.clinicId) throw { code: "err_forbidden" };
      a.status = el.dataset.v; a.history.push({ at: new Date().toISOString(), status: a.status, by: App.user.id }); const c = myClinic();
      DB.timeline.push({ id: uid("tl"), patientId: a.patientId, at: new Date().toISOString(), type: a.status === "completed" ? "visit" : "appointment", msg: { k: a.status === "completed" ? "tl_visit" : a.status === "no_show" ? "tl_appt_noshow" : "tl_appt_cancelled", p: { clinic: c.name, spec: { k: "sp_" + a.specialty } } }, source: "clinic", level: a.status === "no_show" ? "warn" : null });
      notify(a.patientId, "appointments", { k: "n_appt_status", p: { clinic: c.name, status: { k: "st_" + a.status } } }, { silent: true });
      if (a.status === "cancelled") sendEmail(a.patientId, "email_appt_change", { clinic: c.name, date: a.date, time: a.time });
      audit("au_appt_status", a.patientId); saveDB(); toast(t("status_updated")); render();
    } catch (e) { toast(errMsg(e), "alert"); render(); }
  },
  "c-patient": (el) => { try { requirePerm("patients.basic"); openSheet(() => clinicPatientSheet(el.dataset.id)); } catch (e) { toast(errMsg(e), "alert"); } },
  "c-update": (el) => { const a = DB.appointments.find((x) => x.id === el.dataset.id); if (!can("clinical.update")) { toast(t("err_forbidden"), "alert"); return; } if (!DB.profiles[a.patientId]?.consent?.shareWithClinics) { toast(t("patient_no_consent"), "lock"); return; } openSheet(() => postVisitSheet(a)); },
  "c-msg": (el) => { UI.cMsgTo = el.dataset.id; UI.clinicNav = "messages"; render({ scrollTop: true }); },
  "c-staff-toggle": (el) => { try { requirePerm("staff.manage"); const s = DB.staff.find((x) => x.userId === el.dataset.id && x.clinicId === App.user.clinicId); s.active = !s.active; const u = DB.users.find((x) => x.id === s.userId); if (!s.active) DB.sessions.filter((x) => x.userId === u.id).forEach((x) => (x.revoked = true)); audit("au_staff_change", null); saveDB(); render(); } catch (e) { toast(errMsg(e), "alert"); } }
};
Object.assign(ACTIONS, ACTIONS_EXTRA);
const FORMS = {
  async login(form) {
    const id = form.querySelector("#li-id").value, pw = form.querySelector("#li-pw").value;
    if (!id.trim() || !pw) { UI.auth.err = "err_required"; render(); return; }
    try { await api.auth.login(id, pw); UI.auth.err = ""; afterLogin(); }
    catch (e) { UI.auth.err = e.code; if (e.code === "err_unverified") { UI.auth.pending = e.userId; api.auth.sendCode(e.userId, "verify"); go("verify"); return; } render(); }
  },
  async signup(form) {
    const name = form.querySelector("#su-name").value.trim(), id = form.querySelector("#su-id").value, pw = form.querySelector("#su-pw").value;
    if (!name || !id.trim() || !pw) { UI.auth.err = "err_required"; render(); return; }
    if (!form.querySelector("#su-terms").checked) { UI.auth.err = "err_terms"; render(); return; }
    try { const u = await api.auth.signup({ name, identifier: id, password: pw }); UI.auth.err = ""; UI.auth.pending = u.id; go("verify"); } catch (e) { UI.auth.err = e.code; render(); }
  },
  verify(form) {
    try { api.auth.verify(UI.auth.pending, form.querySelector("#vf-code").value); UI.auth.err = ""; UI.ob = { step: 0, data: { name: App.user.name, wake: "07:00", sleep: "23:00", quietStart: "22:30", quietEnd: "06:30", medFreq: "once" } }; saveDB(); render({ scrollTop: true }); toast(t("verified_ok")); }
    catch (e) { UI.auth.err = e.code; render(); }
  },
  forgot(form) {
    const u = api.auth.findUser(form.querySelector("#fg-id").value || "");
    // same response whether or not the account exists (no account enumeration)
    if (u) { api.auth.sendCode(u.id, "reset"); UI.auth.resetUser = u.id; } else UI.auth.resetUser = null;
    UI.auth.err = ""; toast(t("reset_sent_generic")); go("reset");
  },
  async reset(form) {
    if (!UI.auth.resetUser) { UI.auth.err = "err_code_wrong"; render(); return; }
    try { await api.auth.reset(UI.auth.resetUser, form.querySelector("#rs-code").value, form.querySelector("#rs-pw").value); UI.auth.err = ""; toast(t("pw_reset_ok")); go("login", {}, { replace: true }); } catch (e) { UI.auth.err = e.code; render(); }
  },
  "change-pw": async (form) => { try { await api.auth.changePassword(form.querySelector("#cp-old").value, form.querySelector("#cp-new").value); form.reset(); toast(t("pw_changed")); render(); } catch (e) { toast(errMsg(e), "alert"); } },
  med(form) {
    const f = UI.medForm; const pid = PID();
    if (!f.name.trim()) { toast(t("err_med_name"), "alert"); $("#m-name")?.focus(); return; }
    if (f.end && f.start && f.end < f.start) { toast(t("err_end_before"), "alert"); return; }
    const rec = { name: f.name.trim(), dose: f.dose.trim(), frequency: f.frequency, times: [...f.times].sort(), food: f.food, start: f.start, end: f.end, notes: f.notes, doctor: f.doctor, clinic: f.clinic };
    if (f.id) { const m = DB.medications.find((x) => x.id === f.id); if (m.verified) { Object.assign(m, { times: rec.times, notes: rec.notes, end: rec.end }); } else Object.assign(m, rec); DB.timeline.push({ id: uid("tl"), patientId: pid, at: new Date().toISOString(), type: "medication", msg: { k: "tl_med_changed", p: { med: m.name } }, source: "patient" }); }
    else { DB.medications.push({ id: uid("med"), patientId: pid, ...rec, source: "patient", verified: false, active: true, createdAt: new Date().toISOString() }); DB.timeline.push({ id: uid("tl"), patientId: pid, at: new Date().toISOString(), type: "medication", msg: { k: "tl_med_added", p: { med: rec.name } }, source: "patient" }); notify(pid, "medications", { k: "n_med_added", p: { med: rec.name } }, { silent: true }); }
    saveDB(); UI.medForm = null; toast(t("saved")); back("meds");
  },
  measure(form) {
    const f = UI.meas; const pid = PID(); let rec, bp, glucose;
    if (f.type === "bp") { const s = +f.sys, d = +f.dia; if (!(s >= 50 && s <= 260 && d >= 30 && d <= 160 && s > d)) { toast(t("err_bp_range"), "alert"); return; } rec = { type: "bp", value: s, value2: d }; bp = [s, d]; }
    else { const v = +f.value; const lim = { glucose: [20, 600], weight: [2, 400], sleep: [0, 24] }[f.type]; if (!(v >= lim[0] && v <= lim[1])) { toast(t("err_value_range"), "alert"); return; } rec = { type: f.type, value: v }; if (f.type === "glucose") glucose = v; }
    DB.measurements.push({ id: uid("ms"), patientId: pid, ...rec, unit: { glucose: "mg/dL" }[f.type], at: new Date().toISOString(), source: isCaregiver() ? "caregiver" : "patient" });
    DB.timeline.push({ id: uid("tl"), patientId: pid, at: new Date().toISOString(), type: "measure", msg: { k: isCaregiver() ? "tl_measure_by" : "tl_measure", p: { what: { k: "m_" + f.type }, val: f.type === "bp" ? `${rec.value}/${rec.value2}` : String(rec.value), who: firstName(App.user.name) } }, source: isCaregiver() ? "caregiver" : "patient" });
    if (isCaregiver()) audit("au_caregiver_measure", pid);
    saveDB(); UI.meas = { type: f.type, sys: "", dia: "", value: "" };
    const out = $("#meas-result");
    if (bp || glucose) { const res = evaluateRules({ profile: PROF(), bp, glucose }); render(); $("#meas-result").innerHTML = levelCard(res, res.level === "green" ? "" : `<div><button class="btn sm" data-act="book-followup">${esc(t("book_followup"))}</button></div>`); }
    else { render(); toast(t("saved")); }
  },
  chat(form) { const q = form.querySelector("#chat-in").value; form.querySelector("#chat-in").value = ""; askAI(q); },
  profile(form) {
    const f = UI.pf, me = DB.profiles[App.user.id];
    if (!f.name.trim()) { toast(t("err_required"), "alert"); return; }
    Object.assign(me, { name: f.name.trim(), dob: f.dob, gender: f.gender, weight: Number(f.weight) || null, height: Number(f.height) || null, gov: f.gov, nationality: f.nationality, emergency: { name: f.ecName, phone: f.ecPhone }, allergies: f.allergies.split(",").map((x) => x.trim()).filter(Boolean), primaryClinic: f.primaryClinic, conditions: f.conditions, goals: f.goals });
    App.user.name = me.name; UI.pf = null; saveDB(); toast(t("saved")); back("profile");
  },
  "cg-invite": (form) => {
    const fd = new FormData(form); const email = String(fd.get("email") || "").trim().toLowerCase(); const name = String(fd.get("name") || "").trim();
    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast(t("err_email"), "alert"); return; }
    const perms = Object.fromEntries(PERM_KEYS.map((k) => [k, !!fd.get("perm_" + k)]));
    const existing = DB.users.find((u) => u.email === email);
    DB.caregivers.push({ id: uid("cg"), patientId: App.user.id, caregiverUserId: existing?.id || null, name, email, relation: fd.get("relation"), perms, status: "invited", invitedAt: new Date().toISOString() });
    DB.emails.unshift({ id: uid("em"), userId: App.user.id, to: email, channel: "email", template: "email_cg_invite", params: { name: DB.profiles[App.user.id].name }, lang: I18N.lang, at: new Date().toISOString() });
    audit("au_cg_invited", App.user.id); saveDB(); toast(t("invite_sent")); render();
  },
  "c-message": (form) => { try { requirePerm("messages.write"); const fd = new FormData(form); const pid = fd.get("patient"); if (!clinicAppts().some((a) => a.patientId === pid)) throw { code: "err_forbidden" }; const text = String(fd.get("text") || "").trim(); if (!text) return; DB.messages.push({ id: uid("m"), clinicId: App.user.clinicId, patientId: pid, from: "clinic", text, at: new Date().toISOString() }); notify(pid, "clinic", { k: "n_clinic_msg", p: { clinic: myClinic().name } }, { silent: true }); sendEmail(pid, "email_clinic_msg", { clinic: myClinic().name }); audit("au_clinic_msg", pid); saveDB(); toast(t("message_sent")); render(); } catch (e) { toast(errMsg(e), "alert"); } },
  "c-profile": (form) => { try { requirePerm("clinic.profile"); const fd = new FormData(form); DB.clinicEdits[App.user.clinicId] = { about: fd.get("about"), hours: fd.get("hours") }; audit("au_clinic_profile", null); saveDB(); toast(t("saved")); render(); } catch (e) { toast(errMsg(e), "alert"); } },
  "c-staff": async (form) => { try { requirePerm("staff.manage"); const fd = new FormData(form); const email = String(fd.get("email")).trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || DB.users.some((u) => u.email === email)) throw { code: "err_email" }; const tmp = "Temp" + Math.floor(1000 + Math.random() * 9000) + "x"; const h = await hashPassword(tmp); const u = { id: uid("u"), email, role: "clinic", clinicId: App.user.clinicId, staffRole: fd.get("role"), name: String(fd.get("name")), verified: true, pw: h.hash, salt: h.salt }; DB.users.push(u); DB.staff.push({ userId: u.id, clinicId: u.clinicId, staffRole: u.staffRole, name: u.name, email, active: true }); DB.emails.unshift({ id: uid("em"), userId: App.user.id, to: email, channel: "email", template: "email_staff_invite", params: { clinic: myClinic().name, pw: tmp }, lang: I18N.lang, at: new Date().toISOString() }); audit("au_staff_change", null); saveDB(); toast(t("staff_added", { pw: tmp })); render(); } catch (e) { toast(errMsg(e), "alert"); } },
  "c-update": (form) => { try { submitPostVisit(form); } catch (e) { toast(errMsg(e), "alert"); } }
};
function afterLogin() {
  const p = DB.profiles[App.user.id]; if (p?.lang) setLang(p.lang);
  UI.stack = []; UI.chat = []; UI.pf = null; UI.medForm = null; UI.ci = null;
  if (App.user.role === "clinic") { UI.clinicNav = "overview"; }
  go("home", {}, { replace: true });
}

function rtNext() {
  const r = UI.rt; r.step++;
  if (r.step >= RT_STEPS.length) {
    const meds = DB.medications.filter((m) => m.patientId === PID() && m.active && FREQ_COUNT[m.frequency]);
    r.plan = planFromRoutine(meds, r.a); render();
    setTimeout(() => document.getElementById("rt-result")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }), 60);
    rtExplain(); return;
  }
  render(); setTimeout(() => { const q = document.getElementById("rt-q"); q?.scrollIntoView({ behavior: "smooth", block: "center" }); document.getElementById("rt-in")?.focus({ preventScroll: true }); }, 60);
}
async function rtExplain() {
  const sample = UI.aiLive ? await window.claude.use("sample").catch(() => null) : null; if (!sample) return;
  const r = UI.rt; const out = () => document.getElementById("rt-ai"); if (!r?.plan) return;
  const lang = { en: "English", ar: "Arabic", zh: "Simplified Chinese" }[I18N.lang];
  const prompt = `You are Wellpoint AI. Reply only in ${lang}, in 2 short warm sentences, no lists. Explain how this medication schedule fits the person's routine. Do not change, add or question any time, dose or frequency, and give no medical advice.\nRoutine: wake ${r.a.wake}, breakfast ${r.a.breakfast || "skipped"}, lunch ${r.a.lunch || "skipped"}, dinner ${r.a.dinner || "skipped"}, bed ${r.a.sleep}, busy ${r.a.busy ? r.a.busy.join("-") : "none"}.\nSchedule: ` + r.plan.map((o) => `${o.med.name} (${o.med.food} food): ${o.times.join(", ")}`).join("; ");
  if (out()) out().innerHTML = `<span class="thinking">${esc(t("thinking"))}</span>`;
  try { const { text } = await sample(prompt, { modelTier: "quick" }); if (out()) out().innerHTML = `<div class="banner">${icon("sparkle")}<span>${esc(text)}</span></div>`; } catch { if (out()) out().textContent = ""; }
}

/* ---------- delegation ---------- */
document.addEventListener("click", (ev) => {
  Ring.unlock();
  const el = ev.target.closest("[data-go],[data-act]"); if (!el) return;
  if (el.dataset.act) {
    const fn = ACTIONS[el.dataset.act]; if (!fn) return;
    if (el.tagName === "A") return;
    ev.preventDefault(); Promise.resolve(fn(el, ev)).catch((e) => { console.error(e); toast(errMsg(e), "alert"); }); return;
  }
  ev.preventDefault();
  const r = el.dataset.go;
  if (r === "checkin") UI.ci = null;
  if (r === "med-edit") UI.medForm = null;
  if (r === "profile-edit") UI.pf = null;
  if (r === "measure") UI.meas = null;
  if (r === "routine") UI.rt = null;
  document.body.classList.remove("bar-hidden");
  if (!App.user && r === "platform") { UI.stack.push(UI.route); UI.route = { name: "platform", params: {} }; render({ scrollTop: true }); return; }
  if (["login", "signup", "forgot"].includes(r)) UI.auth.err = "";
  go(r, { id: el.dataset.id });
  if (r === "settings" && el.dataset.v) setTimeout(() => document.getElementById(el.dataset.v)?.scrollIntoView({ block: "start" }), 50);
});
document.addEventListener("input", (ev) => {
  const el = ev.target; const b = el.dataset?.bind; if (!b) return;
  const parts = b.split(".");
  if (parts.length >= 3 && /^\d+$/.test(parts.at(-1))) { getPath(UI, parts.slice(0, -1).join("."))[Number(parts.at(-1))] = el.value; }
  else setPath(UI, b, el.value);
  if (el.dataset.live === "results") { const r = $("#results"); if (r) { r.innerHTML = resultsHtml(); } }
  if (el.dataset.live === "docs") { clearTimeout(el._t); el._t = setTimeout(() => { const pos = el.selectionStart; render(); const n = $("#doc-q"); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }, 200); }
});
document.addEventListener("change", (ev) => {
  const el = ev.target;
  if (el.dataset?.bind) { setPath(UI, el.dataset.bind, el.value); if (el.dataset.rerender) render(); if (el.closest(".sheet") && el.dataset.bind.startsWith("disc.filters")) { /* keep sheet open */ } }
  const ac = el.dataset?.actChange;
  if (ac === "pref-time") { DB.profiles[App.user.id].prefs[el.dataset.k] = el.value; saveDB(); toast(t("saved")); }
  if (ac === "doc-recat") { const d = DB.documents.find((x) => x.id === el.dataset.id); d.cat = el.value; saveDB(); toast(t("saved")); render(); }
  if (el.id === "doc-file" && el.files?.[0]) handleUpload(el.files[0]);
});
document.addEventListener("submit", (ev) => {
  const f = ev.target.closest("[data-form]"); if (!f) return; ev.preventDefault();
  const fn = FORMS[f.dataset.form]; if (fn) Promise.resolve(fn(f)).catch((e) => { console.error(e); toast(errMsg(e), "alert"); });
});
let lastScrollY = 0;
window.addEventListener("scroll", () => {
  const y = scrollY; const tb = document.getElementById("topbar"); if (tb) tb.classList.toggle("scrolled", y > 8);
  if (y > lastScrollY + 8 && y > 140) document.body.classList.add("bar-hidden");
  else if (y < lastScrollY - 8 || y < 140) document.body.classList.remove("bar-hidden");
  if (Math.abs(y - lastScrollY) > 8) lastScrollY = y;
}, { passive: true });
document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && UI.sheet) closeSheet(); });
["dragover", "dragleave", "drop"].forEach((type) => document.addEventListener(type, (ev) => {
  const dz = ev.target.closest?.("#dropzone"); if (!dz) return; ev.preventDefault();
  dz.classList.toggle("over", type === "dragover");
  if (type === "drop" && ev.dataTransfer.files[0]) handleUpload(ev.dataTransfer.files[0]);
}));
function handleUpload(file) {
  if (!/^image\/|application\/pdf/.test(file.type)) { toast(t("err_file_type"), "alert"); return; }
  if (file.size > 1.5 * 1024 * 1024) { toast(t("err_file_size"), "alert"); return; }
  const r = new FileReader();
  r.onload = () => {
    const cat = file.type.startsWith("image") ? "image" : /lab|result/i.test(file.name) ? "lab" : /presc/i.test(file.name) ? "prescription" : "other";
    DB.documents.push({ id: uid("doc"), patientId: PID(), name: file.name, cat, size: file.size, type: file.type, at: new Date().toISOString(), dataUrl: r.result, source: "patient" });
    DB.timeline.push({ id: uid("tl"), patientId: PID(), at: new Date().toISOString(), type: "document", msg: { k: "tl_doc", p: { name: file.name } }, source: "patient" });
    audit("au_doc_upload", PID());
    saveDB(); toast(t("uploaded")); render();
  };
  r.readAsDataURL(file);
}

/* ---------- boot ---------- */
async function boot() {
  applyTheme();
  const saved = safeStore.get("wellpoint.lang") || (navigator.language || "en").slice(0, 2);
  setLang(["en", "ar", "zh"].includes(saved) ? saved : "en");
  DB = loadDB();
  if (!DB || DB.version !== 3) { await seedDB(); saveDB(); }
  DB.habits ||= [];
  if (api.auth.restore()) { const p = DB.profiles[App.user.id]; if (p?.lang) setLang(p.lang); UI.route = { name: "home", params: {} }; }
  render();
  setInterval(reminderTick, 20000); setTimeout(reminderTick, 1500);
  if (window.claude?.use) {
    claude.use("sample").then((s) => { UI.aiLive = !!s; if (UI.route.name === "ai") render(); }).catch(() => { UI.aiLive = false; });
  } else UI.aiLive = false;
}
boot();
