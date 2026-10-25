# HCM Lite

AI-assisted Human Capital Management for **Admin, HR and Employees** — built for the Saylani Hackathon (24 October 2026, Zaitoon Ashraf IT Park).

The system **starts empty (no dummy data)**. Admin sets up the company, HR registers employees, and every dashboard number and AI answer comes from what you enter in the app.

- **Live app:** `<ADD HOSTED FRONTEND LINK>`
- **API:** `<ADD HOSTED BACKEND LINK>/api/health`
- **Repository:** `<ADD GIT REPO LINK>`

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, TanStack Query, Recharts |
| Backend | Node.js 20, Express, TypeScript, zod |
| Database | MongoDB (Atlas free tier) with Mongoose |
| Auth | JWT + bcrypt |
| PDF | pdfkit (payslips) |
| AI | Hosted LLM API with tool calling (`AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`) |
| Tests | Vitest/Jest, supertest, mongodb-memory-server |

## Run locally (under 10 minutes)

**Prerequisites:** Node.js 20+, a MongoDB connection string (Atlas free tier or local MongoDB), an LLM API key (free tier is enough).

```bash
# 1. Clone
git clone <ADD GIT REPO LINK> hcm-lite
cd hcm-lite

# 2. Configure environment
cp .env.example server/.env
cp .env.example client/.env      # client only reads VITE_* variables
# edit server/.env  -> set MONGODB_URI, JWT_SECRET, AI_API_KEY
# edit client/.env  -> set VITE_API_URL=http://localhost:5000/api

# 3. Install and start the backend
cd server
npm install
npm run dev                      # http://localhost:5000

# 4. Install and start the frontend (new terminal)
cd client
npm install
npm run dev                      # http://localhost:5173
```

Open `http://localhost:5173`. On an empty database the app opens on **First-run setup**.

### Useful scripts

| Command (in `server/` or `client/`) | Purpose |
|---|---|
| `npm run dev` | Start in watch mode |
| `npm run build` | Production build |
| `npm run start` | Start the built server (backend) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Run tests |

## How to create the first Admin

Choose one:

**Option A — First-run screen (default).** Open the app on a fresh database. Enter the company name and the Admin email/password. The setup screen then disables itself permanently.

**Option B — Environment file.** Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (and optionally `COMPANY_NAME`) in `server/.env` *before* the first start. If the database is empty, the server creates the company and Admin on boot.

## How to set the AI key

1. Create an API key with your LLM provider (free tier is enough).
2. Put it in the **backend** env file only:
   ```
   AI_PROVIDER=gemini
   AI_API_KEY=your_key_here
   AI_MODEL=gemini-2.0-flash
   ```
3. Restart the backend.

The browser never calls the AI provider and the key is never sent to the client. If the key is missing or the provider fails, the app shows a friendly fallback and the normal forms keep working.

## Roles

| Role | What they do |
|---|---|
| **Admin** | Company setup, office hours/location, departments, leave types, holidays, HR logins, **finalize payroll**, audit log, announcements, company dashboard |
| **HR** | Register employees (creates login), salary structures, attendance board and corrections, leave approvals, payroll draft, HR dashboard, announcements |
| **Employee** | Check in/out, own attendance, apply for leave (incl. smart leave), payslips, profile, personal dashboard, AI assistant on own data and policy |

Access is enforced on the **server** for every request; the AI assistant uses the same access as the signed-in user.

## Modules

M1 Auth & Access · M2 Organization Setup · M3 Employees · M4 Attendance · M5 Leave · M6 Payroll Lite · M7 Dashboards & Analytics · M8 AI Assistant · M9 Comms & Audit

## Business rules (short)

- Office start 09:00, grace 15 min (late after 09:15), half day under 5 h, weekend Sat–Sun (all configurable by Admin).
- One attendance record per employee per day; second check-in returns 409.
- Leave counts working days only; quotas annual 14, sick 8, casual 10, unpaid unlimited; overlap or over-balance returns 422.
- Payroll: gross = 1.5 × basic; per day = gross ÷ working days; deductions = absent + unpaid + 0.5 × half days; tax slab on gross × 12; Admin finalizes and the run is locked.

Full details: `docs/rules.md`.

## AI assistant

| Feature | Who |
|---|---|
| Chat with tools (headcount, attendance, late-comers, leave, payroll, employee search) | All roles (scoped) |
| Dashboard summary (3–5 bullets from KPI JSON) | Admin, HR |
| Smart leave (sentence → pre-filled form, user confirms) | Employee, HR |
| Policy Q&A | All roles |

Guardrails: key on server only · tools reuse the same services and permission checks · AI never saves data · JSON validated with one retry · 15 s timeout with fallback · about 20 requests per user per hour · every call logged in `ai_logs` · answers labeled **AI-generated**.

## Suggested 5-minute demo

1. Fresh install → Admin sets up the company, office hours and location, a department and leave types → creates an HR login.
2. HR registers two or three employees; one signs in, changes the password and checks in.
3. Employee types a leave request in plain words and confirms the pre-filled form; HR approves it.
4. HR opens the dashboard, clicks **Summarize**, asks the assistant who is on leave, runs payroll for the month; Admin finalizes it.
5. Employee downloads the payslip and asks for a colleague's salary (refused); Admin shows the audit log.

> Note for judges: check-in works on any day. On a weekend (default Sat–Sun) the record is accepted but flagged as a non-working day and excluded from attendance-rate calculations. Admin can change the weekend in settings.

## Project structure

```
hcm-lite/
├─ README.md
├─ .env.example
├─ docs/        prd.md · architecture.md · design.md · rules.md · tasks.md
├─ server/      Express API (routes → controller → service → model)
└─ client/      React web app
```

## Status

> Update this section honestly before submitting.

**Done**
- [x] M1 Auth & Access (First-run setup, forced password change, JWT + bcrypt)
- [x] M2 Organization Setup (Settings, Departments, Designations, Leave Types, Public Holidays)
- [x] M3 Employees (Sequential EMP-0001 code, CSV import dry-run/commit, CSV export, Employee 360 profile)
- [x] M4 Attendance (Single check-in/out state machine, worked minutes, half-day calculation, attendance calendar/board, correction requests & approval flow)
- [x] M5 Leave (Working days counter excluding weekends & holidays, balances, overlap & quota checks, approval flow, self-approval forbidden)
- [x] M6 Payroll Lite (Salary structure, tax slab calculations, draft runs, finalize/lock: Admin-only, scoped payslips, streamed PDF generator)
- [x] M7 Dashboards & Analytics (Headcount, attrition rate, attendance %, late comers, leave utilization, department breakdown, gender diversity, audit log feed)
- [x] M8 AI Assistant (Scoped chat with 7 tools, confidential salary refusal, executive KPI summary bullets, smart leave parsing & re-computation, 20/hr rate limit)
- [x] M9 Comms & Audit (Company-wide announcements, notification inbox & read status, immutable append-only audit trail with JSON diff viewer)

**Not done / known limitations**
- Biometric hardware integration (app uses geolocation coordinates and server-authoritative timestamps).

**Bonus attempted**
- [x] Geolocation tracking & radius validation on attendance check-in
- [x] Grace period & half-day late/early threshold rules
- [x] Audit trail diff inspection viewer
- [x] AI executive summaries and smart leave pre-fill forms

## Security notes

- Passwords hashed with bcrypt; JWT secret and AI key come only from environment variables.
- Role and data-scope checks on every API request; Employee queries are forced to their own `employeeId`.
- Audit log is append-only (no edit/delete path).
- Finalized payroll is locked on the server.
- Only `.env.example` is committed; never commit real keys or database passwords.

## Submission

Submit on the Saylani LMS (`https://lms.saylaniit.com/`) from your own portal with two links: the **Git repository** (public or shared with judges) and the **hosted project** (opens on first-run setup).
# hackthone_02
