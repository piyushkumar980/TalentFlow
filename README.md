# TalentFlow — A Mini Hiring Platform

[![Live Demo](https://img.shields.io/badge/Live-Demo-informational)](https://talent-flow-85mj.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-black)](https://github.com/piyushkumar980/TalentFlow)

**Quick links:**

* 🔗 **Live app:** [https://talent-flow-85mj.vercel.app/](https://talent-flow-85mj.vercel.app/)
* 🗂️ **Repository:** [https://github.com/piyushkumar980/TalentFlow](https://github.com/piyushkumar980/TalentFlow)

A polished, two-sided hiring app (HR + Jobseeker) built entirely on the front-end. TalentFlow ships with a simulated REST API (via MSW or MirageJS), local persistence (IndexedDB using Dexie/localForage), and role-based UI with conditional routes and tooltips. **No real backend is required.**

---

## Table of contents

* Demo flow
* Feature matrix
* Architecture
* Data model
* Mock API (MSW/MirageJS)

  * Endpoints
  * Example payloads
* Seeding & persistence
* Routes
* Key UX details
* State, caching & error handling
* Local development
* Project structure
* Contributing
* License

Tech stack: React + Vite, Tailwind CSS, React Router, TanStack Query, Zustand; mock API via MSW/MirageJS with write-through IndexedDB (Dexie/localForage); deployed on Vercel.

Built with: React (Vite) · Tailwind · React Router · TanStack Query · Zustand · MSW/MirageJS · IndexedDB (Dexie/localForage) · Vercel.

Under the hood: React SPA powered by TanStack Query & Zustand, styled with Tailwind, mocked via MSW/MirageJS, persisted to IndexedDB via Dexie/localForage, bundled by Vite, hosted on Vercel.

Stack summary: Front-end only — React + Tailwind, data via MSW/MirageJS, caching with TanStack Query, state with Zustand, local persistence (IndexedDB/Dexie), Vite build, Vercel deploy.

What runs this: React 18, Vite, Tailwind, React Router, lucide-react icons, TanStack Query, Zustand, MSW/MirageJS, Dexie/localForage (IndexedDB), Vercel.


---

## Demo flow

1. **Intro video → Welcome**

* On first visit a short intro video plays, then the Welcome page opens.
* The Welcome page shows two large cards: **I’m from TalentFlow (HR)** and **I’m a Job Seeker (JS)**.
* Hover each card to see a tooltip explaining what to pick.
* Selection is stored (locally) and the UI conditionally renders the right sidebar/header for that role.

2. **HR experience**

* **Sidebar:** Dashboard · Jobs · Candidates · Assessments
* Header: Notifications + Dark/Light toggle.
* **Dashboard:** KPIs (Total Jobs, Active Jobs, Total Candidates, New this Week), Latest job postings, “View All”, Recent activity.
* **Jobs:** List with role/company. HR can reorder (move up/down), archive/unarchive, edit, delete and open job details.
  These changes are UI-only and persist until page refresh (see **“Session overlay mode”** below).
* **Candidates:** List + candidate detail, see status/timeline.
* **Assessments:** Company/role rows with date windows (open/upcoming/expired). HR can archive, delete (UI), edit; in **Edit** they see all questions with the correct option highlighted in green and can add new questions (always 4 options). These assessment edits persist until refresh.

3. **Jobseeker experience**

* **Sidebar:** Dashboard · Assessments · Find Jobs · My Applications · Saved Jobs · Interviews · Messages
* **Header:** Notifications + Dark/Light toggle.
* **Dashboard (JS):** KPIs (Total Applications, Active Applications, Saved Jobs, Interviews Scheduled), recent applications, upcoming interviews, job recommendations (with **Apply** CTA that opens a form on a new route).
* **Assessments:** Job listings with statuses (open/upcoming/expired). Jobseeker can archive a row or start an assessment when open. *(No edit/delete for Job Seeker.)*
* **Find Jobs:** Explore jobs, apply or archive.
* **My Applications:** List applications + statuses, with **Withdraw** option.
* **Saved Jobs:** Apply or remove.
* **Interviews:** Join / Reschedule / Delete *(session-only; refresh reverts).*
* **Messages:** Messages from companies.

> ⚠️ **Session overlay mode**
> On several pages (e.g., **HR Jobs & Assessments**, **JS Interviews**), user actions update the UI **without writing to IndexedDB**. These changes persist while navigating the app but revert on full page refresh. See details in \[State, caching & error handling].

---

## Feature matrix

| Area             | HR                                                                                      | Jobseeker                                   |
| ---------------- | --------------------------------------------------------------------------------------- | ------------------------------------------- |
| Welcome tooltips | ✔︎                                                                                      | ✔︎                                          |
| Dashboard KPIs   | ✔︎ (jobs, candidates, new this week)                                                    | ✔︎ (applications, interviews, saved jobs)   |
| Jobs             | View, reorder, archive/unarchive, edit, delete, details *(UI-only persists)*            | View, apply from other pages, archive       |
| Candidates       | View list & details, status/timeline                                                    | View own application statuses               |
| Assessments      | View list, status badges, archive, delete (UI), edit, add question *(UI-only persists)* | View list, status badges, start assessment  |
| Find Jobs        | —                                                                                       | Search, apply, archive                      |
| Applications     | —                                                                                       | View statuses, withdraw                     |
| Saved Jobs       | —                                                                                       | List, apply or remove                       |
| Interviews       | —                                                                                       | Join / Reschedule / Delete *(session-only)* |
| Messages         | —                                                                                       | Read messages                               |
| Notifications    | ✔︎                                                                                      | ✔︎                                          |
| Theme            | Dark/Light toggle                                                                       | Dark/Light toggle                           |

---

## Architecture

* **Framework:** React + React Router
* **Styling:** Tailwind CSS
* **Icons:** `lucide-react`
* **Data fetching & cache:** TanStack Query (React Query)
* **Toasts/state bits:** Lightweight store (e.g., Zustand) and local component state
* **Mock API:** MSW (recommended for browser) or MirageJS (drop-in server in the app)
* **Local persistence:** IndexedDB via Dexie or localForage
* **Session overlay:** Ephemeral in-memory maps (module-scoped) for demo flows that must revert on refresh
* **Accessibility:** Keyboard focus states, tooltip semantics, motion-reduced animations, color-contrast checked
* **Theme:** `prefers-color-scheme` + toggle (persisted in `localStorage`)

---

## Data model

Shapes match our mock API responses so you can swap to a real backend later.

```ts
// Job
type Job = {
  id: number;
  title: string;
  role?: string;            // display role if distinct from title
  company: string;
  slug: string;
  status: "active" | "archived";
  tags: string[];
  order: number;            // for manual sort
  createdAt: number;
};

// Candidate
type Candidate = {
  id: number;
  jobId: number;
  name: string;
  email: string;
  stage: "applied"|"screen"|"tech"|"offer"|"hired"|"rejected";
  createdAt: number;
};

// Timeline event
type TimelineEvent = {
  id: string;
  candidateId: number;
  at: number;
  kind: "stage-change"|"note"|"email"|"interview";
  meta?: Record<string, unknown>;
};

// Assessment
type AssessmentDoc = {
  jobId: number;
  sections: Array<{
    id: string;
    title: string;
    questions: Array<{
      id: string;
      type: "single";          // MCQ single-select for this demo
      label: string;
      options: string[];
      correctIndex: number;    // editor highlights this in green
      required: boolean;
    }>
  }>;
  meta?: Record<string, unknown>;
};

// Assessment submission (stored locally)
type AssessmentSubmission = {
  id: string;
  jobId: number;
  userId: string;          // pseudo / anon for demo
  answers: Record<string, number>; // questionId -> selected option index
  submittedAt: number;
};
```

---

## Mock API (MSW/MirageJS)

You can use **MSW** (service worker that intercepts `fetch`) or **MirageJS** (in-app server). Both expose the same endpoints and run with artificial latency and error injection.

### Endpoints

**Jobs**

```
GET    /jobs?search=&status=&page=&pageSize=&sort=
POST   /jobs                // { id, title, slug, status, tags[], order }
PATCH  /jobs/:id
PATCH  /jobs/:id/reorder    // body: { fromOrder, toOrder } → sometimes 500 for rollback testing
```

Query params:

* `search` — matches role/title/company (case-insensitive)
* `status` — `active` / `archived` / (omit for all)
* `page`, `pageSize` — pagination (defaults: `page=1`, `pageSize=20`)
* `sort` — `"order"` (manual ordering) or `"createdAt:desc"` etc.

**Candidates**

```
GET    /candidates?search=&stage=&page=
POST   /candidates          // { id, name, email, stage }
PATCH  /candidates/:id      // stage transitions
GET    /candidates/:id/timeline
```

**Assessments**

```
GET    /assessments/:jobId
PUT    /assessments/:jobId                  // replace doc (write-through to IndexedDB)
POST   /assessments/:jobId/submit           // store submission locally
```

### Example payloads

**GET** `/jobs?search=frontend&page=1&pageSize=10&sort=order`

```json
{
  "items": [
    { "id":1,"title":"Frontend Engineer","company":"Acme","status":"active","tags":["react"],"order":0 }
  ],
  "page":1, "pageSize":10, "total":25
}
```

**PATCH** `/jobs/12`
Body:

```json
{ "status":"archived", "title":"Senior Backend Engineer" }
```

Response:

```json
{ "id":12, "title":"Senior Backend Engineer", "status":"archived" }
```

**PATCH** `/jobs/5/reorder`
Body:

```json
{ "fromOrder": 5, "toOrder": 2 }
```

Response: `500 Internal Server Error` *(\~5–10% of the time to test rollback flows)*

---

## Seeding & persistence

* **Seed data (on first run)**

  * 25 jobs (mix of active/archived)
  * 1,000 candidates randomly assigned to jobs & stages
  * ≥ 3 assessments with 10+ questions each
* **Artificial network:** Random latency **200–1200 ms** on every request
* **Error rate:** **5–10%** on write endpoints (POST/PATCH/PUT) to exercise error handling
* **Persistence:** All API writes are **write-through to IndexedDB** (Dexie/localForage). On refresh, the app restores from IndexedDB.
* **Session overlay mode (for specific screens):** Some interactions intentionally do not call the API and do not persist—they update **in-memory overlays** so the UI looks responsive and demo-friendly, then **revert on refresh**.

---

## Routes

### Common

| Path       | Screen  | Notes                                                                     |
| ---------- | ------- | ------------------------------------------------------------------------- |
| `/`        | Intro   | Short autoplay video, then navigate to Welcome                            |
| `/welcome` | Welcome | Two cards (HR / Jobseeker) with hover tooltips; stores role and redirects |

### HR (TalentFlow team)

| Path                         | Screen            | Notes                                                                                                         |
| ---------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------- |
| `/hr/dashboard`              | HR Dashboard      | KPIs (Total/Active Jobs, Total Candidates, New this Week), Latest Job Postings (View All), Recent Activity    |
| `/hr/jobs`                   | Jobs list         | Reorder (up/down), Archive/Unarchive, Edit, Delete; open details *(all session-only: persists until refresh)* |
| `/hr/jobs/:id`               | Job details       | Full job info; read-only in demo                                                                              |
| `/hr/candidates`             | Candidates list   | Search/filter; click to see details                                                                           |
| `/hr/candidates/:id`         | Candidate details | Timeline + status                                                                                             |
| `/hr/assessments`            | Assessments       | Company/role/date windows; Archive/Delete (UI), Edit (see below)                                              |
| `/hr/assessments/run/:jobId` | Run assessment    | Runner with permissions modal (camera/mic demo)                                                               |

### Jobseeker

| Path                                | Screen           | Notes                                                                                                                       |
| ----------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `/jobseeker/dashboard`              | JS Dashboard     | KPIs (Total/Active Apps, Saved Jobs, Interviews), Recent Applications, Upcoming Interviews, Recommended Jobs (Apply → form) |
| `/jobseeker/assessments`            | Assessments      | Archive or Start if open                                                                                                    |
| `/jobseeker/assessments/run/:jobId` | Run assessment   | Runner with permissions modal                                                                                               |
| `/jobseeker/find-jobs`              | Find Jobs        | Apply or Archive                                                                                                            |
| `/jobseeker/apply/:id`              | Application form | Opens on a new route                                                                                                        |
| `/jobseeker/applications`           | My Applications  | Status list; **Withdraw** application                                                                                       |
| `/jobseeker/saved`                  | Saved Jobs       | Apply or Remove                                                                                                             |
| `/jobseeker/interviews`             | Interviews       | Join / Reschedule / Delete *(session-only; refresh reverts)*                                                                |
| `/jobseeker/messages`               | Messages         | Company messages list                                                                                                       |

---

## Key UX details

* **Welcome tooltips:** Pure CSS (Tailwind) on hover/focus with subtle motion (respects `prefers-reduced-motion`).
* **Conditional rendering:** After choosing a role, the app renders role-specific sidebar + header (notifications + theme toggle).
* **Jobs (HR):** Move Up/Down maintains a custom order. Archive/Unarchive adds a chip. All changes appear immediately and persist across navigation, but they **revert on refresh (session overlay)**.
* **Assessments (HR):**

  * List shows **Open / Upcoming / Expired** badges with countdowns.
  * **Edit** opens a modal showing all questions. The **correct option is highlighted in green**.
  * **Add Question** inserts a new MCQ with four options. **Save (Temp)** updates are session-only.
* **Assessments (JS):** Start if open; Archive a row to hide it from view.
* **Dark/Light mode:** Toggle in header; persisted in `localStorage`.
* **Notifications:** Simple dropdown stub with recent events.

---

## State, caching & error handling

### React Query

* All API **reads** go through TanStack Query for caching, retries, and background refresh.
* Mutation flows are handled with **toasts** and **rollback on error** (where applicable).

### Local persistence (IndexedDB)

* The **mock API is the single source of truth**.
* Handlers **write-through to IndexedDB**, then responses are returned to the UI.
* On app start, we **hydrate the query cache from IndexedDB**, so refresh keeps your data.

### Session overlay mode (UI-only)

Some interactions intentionally bypass the API (no IndexedDB writes). Changes are kept **only in memory** so they survive route changes but disappear on full reload:

* **HR → Jobs:** reorder, archive/unarchive, edit, delete (UI)
* **HR → Assessments:** archive, delete (UI), edit/add question
* **JS → Interviews:** join/reschedule/delete (UI)
* **JS → Job recommendations:** apply opens a form route; other demo actions may be session-only

Implementation detail: **module-scoped `Map`s** overlay patches onto fetched lists (`overlayJobs`, etc.). This prevents accidental persistence while keeping the UX snappy.

### Errors & latency

* Mock API injects randomized **200–1200 ms** delays.
* **5–10%** of write requests fail with `500`.

  * UIs show **toasts** and revert **optimistic UI** where applicable.

---

## Local development

### Prereqs

* Node 18+ and **pnpm**/**npm**/**yarn**
* Modern browser (**MSW** needs service worker; **Mirage** works anywhere)

### Setup

```bash
# install
pnpm install
# or
npm install
```

**Run (MSW, recommended)**

```bash
# dev
pnpm dev
# open http://localhost:5173 (Vite default)
```

**Run (MirageJS alternative)**

Set an env flag to switch providers:

```bash
# .env
VITE_API_PROVIDER=mirage   # default: msw
```

**Useful env flags**

```bash
# Session-only demo overlays on/off
VITE_DEMO_SESSION_ONLY=true  # default true

# Latency min/max in ms
VITE_API_LATENCY_MIN=200
VITE_API_LATENCY_MAX=1200

# Error rate for writes (0–1)
VITE_API_WRITE_ERROR_RATE=0.08
```

**Build**

```bash
pnpm build
pnpm preview
```

---

## Project structure

src/
  api/
    services/
      jobs.js
      candidates.js
      assessments.js
    mock/
      msw/
        handlers.js      # MSW route handlers (JS)
        browser.js       # MSW worker setup (JS)
      mirage/
        server.js        # Mirage server + routes (JS)
      seed.js            # seeding logic (25 jobs, 1000 candidates, ≥3 assessments)
      db/
        dexie.js         # IndexedDB schema + write-through helpers
  components/
    common/Toasts.jsx
  pages/
    WelcomePage.jsx
    hr/
      Dashboard.jsx
      JobsPage.jsx
      JobDetails.jsx
      CandidatesPage.jsx
      CandidateDetails.jsx
      AssessmentsPage.jsx
    jobseeker/
      Dashboard.jsx
      AssessmentsPage.jsx
      FindJobsPage.jsx
      ApplyPage.jsx
      ApplicationsPage.jsx
      SavedJobsPage.jsx
      InterviewsPage.jsx
      MessagesPage.jsx
  store/
    index.js             # toasts, theme, small global state (e.g., Zustand)
  router/
    index.jsx            # route definitions (JSX)
  styles/
    index.css
  main.jsx               # app entry (conditional MSW/Mirage)
  App.jsx


---

## Mock API internals

Pick **MSW** or **MirageJS**. Both expose identical behavior.

### MSW (browser)

* `handlers.js` defines `rest.get/post/patch/put` for all endpoints listed above.
* Each handler:

  * Reads/writes to **IndexedDB** via helper functions (Dexie/localForage).
  * Awaits a randomized `sleep(latency)`; on writes, may throw a `500` based on `VITE_API_WRITE_ERROR_RATE`.
  * Returns JSON following the models in **Data model**.

### MirageJS (in-app)

* `server.js` declares models/factories and routes mirroring the API.
* Seeds via `seed.js` on boot.
* For persistence across refresh, Mirage also **proxies through Dexie helpers** (so Mirage is the “network” facade; IndexedDB remains the DB).

### Write-through IndexedDB

* Create/Update/Delete operations:
  0\. Apply mutation to **IndexedDB**.
  1\. Respond with the updated resource.

* On app start, we **hydrate** from IndexedDB.
  If no DB exists (first run), `seed.js` populates data.

---

## Assessments editor details (HR)

* Modal editor loads the full doc (`GET /assessments/:jobId`) or seeds a default if none exists.
* Renders all questions:

  * The **correct option** is marked with a radio and styled **green**.
  * Options are editable inline; changing the radio updates `correctIndex`.
* **Add Question** inserts a new question with four options.
* **Save (Temp)** persists to the **session overlay** only (no API write) in demo mode.
* *(If you want permanent saves, flip `VITE_DEMO_SESSION_ONLY=false` and the editor will `PUT /assessments/:jobId` and write-through to IndexedDB.)*

---

## Jobs list details (HR)

* **Reorder:** up/down swaps `order`. In **session overlay** mode, the swap is kept in memory; with persistence enabled it calls `PATCH /jobs/:id/reorder` and writes to IndexedDB.
* **Archive/Unarchive, Edit, Delete:** session overlay (UI-only) by default; can be switched to real writes via env.
* **Job details:** navigable read view.

---

## Error handling & toasts

* All mutations surface **success/error** via **Toasts**.
* On write errors (simulated), the UI **reverts optimistic state** and shows an **error message**.
* Long lists are **paginated**; **empty states** and **skeletons** are included.

---

## Accessibility

* Keyboard focusable cards and tooltips (`role="tooltip"`).
* Respects `prefers-reduced-motion`.
* Color choices tested for **contrast** on light & dark.

---

## Contributing

PRs welcome! Helpful areas:

* Expand assessment types beyond single-select.
* Add sorting/filtering controls.
* Make the **session overlay** toggleable per-page in the UI.

---

## License

MIT (or your preferred license).
