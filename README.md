# Wellpoint

**Your Health, Connected.** A patient-centered continuous-care platform prototype for Oman: clinic discovery and booking, medication schedules with alarm-style reminders, smart check-ins with data freshness, caregiver access with explicit permissions, an AI health companion, and a separate clinic dashboard with role-based access. The UI is available in Arabic (RTL), English and Chinese, with light and dark themes.

## Run
Open `wellpoint.html` in a browser. It's one self-contained file with no dependencies apart from Google Fonts.

Demo accounts (password `Wellpoint1`): `khalid@demo.wellpoint.om`, `aisha@demo.wellpoint.om`, `hamed@demo.wellpoint.om`, `doctor@kims.demo`, `reception@kims.demo`, `admin@kims.demo`.

## Build
Source lives in `src/`. `./build.sh` bundles it into `wellpoint.html`.

| File | Purpose |
|---|---|
| `src/data.js` | Seed directory (facility names/locations from public listings; doctors are fictional placeholders) |
| `src/i18n-*.js` | Translation dictionaries (en / ar / zh) |
| `src/core.js` | Mock backend: auth (PBKDF2), sessions, RBAC, audit log, integration adapters (mock / FHIR / API / manual), notifications + email outbox, clinical rules (demo), scheduler, AI service |
| `src/ui-*.js` | Patient, caregiver and clinic interfaces |
| `src/ui-wellbeing.js` | Calm-engagement home (experimental): health tree, "next step now" button, live medication countdown, streak with a weekly rest-day shield, haptics, confetti and surprise tips |
| `src/events.js` | Event delegation, forms, boot |

The full architecture, database schema, API design and next steps are in the app's **Platform & architecture** page.

## Prototype limits
Data is stored in the browser (localStorage). Email and SMS go to a simulated outbox. Clinical thresholds are illustrative and not clinically validated. There is no Shifa integration. Doctors, schedules, fees and ratings are demo data.
