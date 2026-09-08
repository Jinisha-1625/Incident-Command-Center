# Incident Command Center — file and function guide (before we build)

This document is the **map of the project**. The folders and files below now exist in `server/` and `client/`.

Read it like this: first the **simple picture**, then the **word list**, then **which file does what**, then **each feature** (login, assign, timeline, search, …).

---

## 1. Simple picture of the whole system

Imagine three rooms:

1. **The website (frontend)** — what you see in the browser: buttons, lists, forms. Built with **React**.
2. **The office in the back (backend)** — hidden from the user. It checks “are you logged in?”, “are you allowed to assign?”, and saves data. Built with **Node.js** and **Express**.
3. **The filing cabinet (database)** — stores users and incidents forever (until deleted). **MongoDB**.

When you click **Assign**, the website does **not** change the database itself. It sends a **request** (a message) to the backend. The backend checks rules, then writes to MongoDB, then sends an **answer** back. The website updates the screen from that answer.

That message style is called a **REST API**:

- **API** = a list of agreed URLs the frontend can call (like `/api/incidents`).
- **REST** = a common style: use GET to read, POST to create, PATCH to update, DELETE to remove.

**CRUD** means the four basic data actions: **C**reate, **R**ead, **U**pdate, **D**elete. Incidents, timeline notes, and users all use CRUD, plus extra **rules** (severity, handoff summary, who may resolve).

---

## 2. Word list (plain English)

| Word | Meaning |
|------|--------|
| **Frontend** | The UI in the browser (React). |
| **Backend** | The server that holds rules and talks to the database (Express). |
| **Database** | Where data is stored (MongoDB). |
| **Collection** | A table-like group of documents in MongoDB (e.g. all users). |
| **Document** | One record, like one user or one incident (JSON-like object). |
| **Schema / Model** | The shape of a document (which fields exist). We will use **Mongoose** to define this in code. |
| **Mongoose** | A library that makes MongoDB easier: schemas, validation, queries. |
| **Route** | A URL + HTTP method, e.g. `POST /api/auth/login`. |
| **Controller** | The function that runs when a route is hit: read input, call the database, send JSON back. |
| **Middleware** | A function that runs **before** the controller (e.g. “check the login token”). |
| **JWT** | **JSON Web Token** — a signed string the server gives you after login. The frontend sends it on later requests so the server knows who you are. Think of it as a stamped wristband for the session. |
| **Hashing (bcrypt)** | Passwords are **not** stored as plain text. **bcrypt** turns the password into a scrambled value. You cannot read the original password from it. |
| **Role** | A job title in the app: `commander` (can assign / reassign) vs `engineer` (works incidents). |
| **Authorization** | After login: “are you **allowed** to do this?” Login is **authentication** (who are you). Authorization is (what may you do). |
| **State** (React) | Data the screen remembers (logged-in user, list of incidents). When state changes, React re-draws the page. |
| **Component** | A reusable piece of UI (a button bar, a timeline list). |
| **Page** | A full screen (Login, Board, Incident detail, Team workload). |
| **CORS** | Browser security rule: a site on port A may only call a server on port B if the server **allows** it. We enable CORS so React can call Express. |
| **Environment variable** | Secret or config kept outside code (database URL, JWT secret). Stored in `.env`, not in Git. |
| **Index** (MongoDB) | A lookup shortcut so search/sort is fast (like an index in a book). |
| **Timeline / event** | An append-only history line: “assigned to Riya”, “handoff: tried restart”, “resolved: …”. We never erase old lines; we add new ones. |
| **Handoff** | When we reassign, the old owner must write what they already tried. |
| **Severity** | How urgent: SEV-1 (highest) to SEV-4 (lowest). Set by the **assigner**. |

---

## 3. Two programs, two folders

We will **not** put React and Express in one mixed pile. Two folders:

```
/workspace
  README.md                 ← how to run the project
  FILE_GUIDE.md             ← this file (you are here)
  PROJECT_IDEAS.md          ← earlier idea list
  server/                   ← backend (Node + Express + MongoDB)
  client/                   ← frontend (React)
```

- `server` runs on something like `http://127.0.0.1:38471`
- `client` runs on something like `http://127.0.0.1:38472` and **calls** the server

You need **Node.js** installed (it runs JavaScript outside the browser). **npm** installs libraries listed in `package.json`.

---

## 4. Backend files (`server/`) — what each file is for

Think: **door (route) → security guard (middleware) → worker (controller) → filing cabinet (model)**.

### 4.1 Startup and config

| File | Technology | What it is meant to do |
|------|------------|------------------------|
| `server/package.json` | npm | List of backend libraries: `express`, `mongoose`, `bcryptjs`, `jsonwebtoken`, `cors`, `dotenv`. |
| `server/.env.example` | env | Template: `MONGODB_URI`, `JWT_SECRET`, `PORT`. You copy to `.env`. |
| `server/src/index.js` | Node + Express | **Starts the server**: connect MongoDB, enable CORS, mount routes (`/api/auth`, `/api/users`, `/api/incidents`). |
| `server/src/config/db.js` | Mongoose | **Connects** to MongoDB. One function: `connectDb()`. If the database is down, the server logs an error. |

**Function in `db.js`:** `connectDb()` — opens the connection to MongoDB using the URI from `.env`.

### 4.2 Models (shape of data in MongoDB)

| File | What it stores | Main fields (simple) |
|------|----------------|----------------------|
| `server/src/models/User.js` | People who can log in | name, email, passwordHash, role (`commander` or `engineer`) |
| `server/src/models/Incident.js` | One incident | title, description, severity, status, assignee, createdBy, resolutionSummary, search-friendly text |
| `server/src/models/IncidentEvent.js` | One timeline line | incidentId, type (created / assigned / comment / handoff / status / resolved), message, authorId, createdAt |

**Mongoose model** = JavaScript class that maps to a MongoDB collection. Example: `User.findOne({ email })` means “find the user document with this email.”

Solved count and “currently solving” are **not** stored as a separate table. We **count incidents** when the commander opens the team page:

- currently solving = incidents where `assignee = this user` and status is not `resolved`
- solved = incidents where they were assignee (or resolver) and status is `resolved`

### 4.3 Middleware (runs on the way in)

| File | Function | Meaning |
|------|----------|---------|
| `server/src/middleware/auth.js` | `requireAuth` | Reads the JWT from the `Authorization` header. If missing/fake/expired → **401** (not logged in). If ok, attaches `req.user` (id, role). |
| `server/src/middleware/auth.js` | `requireCommander` | After `requireAuth`, if role is not `commander` → **403** (logged in but **not allowed**). Used for assign / reassign / set severity. |

**Header** = extra info on an HTTP request. We send `Authorization: Bearer <token>`.

### 4.4 Routes (the URL list)

| File | What URLs it declares |
|------|------------------------|
| `server/src/routes/authRoutes.js` | register, login, “who am I” (`/me`) |
| `server/src/routes/userRoutes.js` | team list with workload counts |
| `server/src/routes/incidentRoutes.js` | create, list, search, get one, assign, reassign, comment, resolve |

Routes only **point** to controller functions. They stay short.

### 4.5 Controllers (the actual work)

Each function below is an **async function**: it waits for the database, then sends JSON.

#### Auth — `server/src/controllers/authController.js`

| Function | HTTP | What it does |
|----------|------|----------------|
| `register` | `POST /api/auth/register` | Checks email is new. **bcrypt** hashes the password. Saves a User. Returns a JWT + user (no password). |
| `login` | `POST /api/auth/login` | Finds user by email. **bcrypt.compare** checks password. Returns JWT + user. |
| `me` | `GET /api/auth/me` | Uses `requireAuth`. Returns the current user so the React app can restore the session after refresh. |

#### Users — `server/src/controllers/userController.js`

| Function | HTTP | What it does |
|----------|------|----------------|
| `listTeamWorkload` | `GET /api/users/workload` | For **commanders** (and readable by them when assigning). For each engineer/commander: name, role, `openCount`, `resolvedCount`. Used so you allot fairly. |

#### Incidents — `server/src/controllers/incidentController.js`

| Function | HTTP | What it does |
|----------|------|----------------|
| `createIncident` | `POST /api/incidents` | Commander creates title, description, **severity**. Optional first assignee. Writes incident + timeline event `created` (and `assigned` if someone was picked). |
| `listIncidents` | `GET /api/incidents` | Everyone logged in. Query params: `q` (search text), `status` (open / resolved / all). Sort: severity first (SEV-1 on top), then newest. Pagination: `page`, `limit`. |
| `getIncident` | `GET /api/incidents/:id` | One incident + its timeline events. `:id` means the MongoDB id in the URL. |
| `assignIncident` | `PATCH /api/incidents/:id/assign` | Commander only. Sets assignee + severity (assigner marks severity). Timeline: `assigned`. |
| `reassignIncident` | `PATCH /api/incidents/:id/reassign` | Commander only. Body must include **handoffSummary**. Old work is **not** deleted. Timeline: `handoff` (previous person’s summary) then `assigned` (new person). |
| `addComment` | `POST /api/incidents/:id/events` | Assignee (or anyone logged in, we will allow comments from all logged-in users) adds a progress note. Timeline: `comment`. |
| `updateStatus` | `PATCH /api/incidents/:id/status` | Move open → acknowledged → mitigated (still not resolved). Timeline: `status`. Cannot jump to resolved here. |
| `resolveIncident` | `PATCH /api/incidents/:id/resolve` | Requires **resolutionSummary** (what it was, what they did, outcome). Sets status `resolved`. Timeline: `resolved`. |

**`:id`** = a placeholder in the path. Example: `/api/incidents/64abc.../resolve`.

### 4.6 Small helpers

| File | Function | What it does |
|------|----------|----------------|
| `server/src/utils/httpError.js` | `httpError(status, message)` | Consistent error JSON: `{ error: "..." }` so the frontend can show a red banner. |
| `server/src/utils/severity.js` | `severityRank` | Maps SEV-1 → 1, SEV-4 → 4 so sorting is correct. |

---

## 5. Frontend files (`client/`) — what each file is for

**Vite** is the tool that runs the React app in development (fast refresh when you save a file). **React Router** switches pages without a full browser reload.

### 5.1 App shell

| File | Technology | What it is meant to do |
|------|------------|------------------------|
| `client/package.json` | npm | Libraries: `react`, `react-dom`, `react-router-dom`, Vite. |
| `client/index.html` | HTML | The empty page React “mounts” into (`<div id="root">`). |
| `client/src/main.jsx` | React | Starts React, wraps the app with Router + AuthProvider. |
| `client/src/App.jsx` | React Router | Declares pages: `/login`, `/register`, `/` (board), `/incidents/:id`, `/team`. Protects routes: if no token, send to login. |
| `client/src/index.css` | CSS | Layout: desktop board vs stacked mobile screens. |

### 5.2 Talking to the backend

| File | Function / idea | What it is meant to do |
|------|-----------------|------------------------|
| `client/src/api/http.js` | `api(path, options)` | One helper: `fetch` to the Express URL, attach JWT, parse JSON, throw if the server sent an error. **fetch** is the browser’s built-in “call this URL” function. |
| `client/src/api/authApi.js` | `login`, `register`, `me` | Thin wrappers around `api(...)`. |
| `client/src/api/incidentApi.js` | `list`, `get`, `create`, `assign`, `reassign`, `comment`, `resolve` | Same for incidents. |
| `client/src/api/userApi.js` | `workload` | Team counts for the assign screen. |

Keeping API calls in these files means pages stay readable: `await login(email, password)` instead of long `fetch` in every page.

### 5.3 Auth “memory” for the whole app

| File | What it is meant to do |
|------|------------------------|
| `client/src/context/AuthContext.jsx` | **Context** = shared data any component can read. Stores `user`, `token`, `login()`, `logout()`. Saves the token in `localStorage` (browser memory that survives refresh). **Note:** for a later upgrade we could use httpOnly cookies; localStorage is simpler to learn first. |

### 5.4 Pages (full screens)

| File | Screen | What the user does |
|------|--------|-------------------|
| `client/src/pages/LoginPage.jsx` | Login | Email + password → `authApi.login` → save token → go to board. Empty fields and “wrong password” error states. |
| `client/src/pages/RegisterPage.jsx` | Register | Name, email, password, role (for demo we allow choosing commander vs engineer; in a real company an admin would set this). |
| `client/src/pages/BoardPage.jsx` | Incident board | Search box, filter open/resolved/all. List sorted by severity. Click a row → detail. Button “New incident” if commander. Loading spinner, empty “no incidents”, error banner. |
| `client/src/pages/IncidentPage.jsx` | One incident | Header (severity, status, assignee). **Timeline** down the page. Forms: add comment; commander assign/reassign; assignee resolve with summary. |
| `client/src/pages/TeamPage.jsx` | Workload | Table: name, role, currently solving, solved. Used before assigning. Commanders use this; engineers can still view so the team is transparent. |

### 5.5 Components (pieces reused on pages)

| File | What it is meant to do |
|------|------------------------|
| `client/src/components/Navbar.jsx` | Top bar: app name, Board, Team, who you are, Logout. |
| `client/src/components/IncidentCard.jsx` | One row on the board: title, severity badge, status, assignee name. |
| `client/src/components/Timeline.jsx` | Maps events to a vertical list (time, person, type, message). |
| `client/src/components/AssignForm.jsx` | Dropdown of people + severity + (if reassign) required handoff text. Loads workload from `userApi`. |
| `client/src/components/ResolveForm.jsx` | Text areas: what happened, what we did, outcome. Submit → `resolveIncident`. |
| `client/src/components/StatusBadge.jsx` | Colored pill: open / acknowledged / mitigated / resolved. |
| `client/src/components/ProtectedRoute.jsx` | If no user, redirect to `/login`. Wraps private pages. |

---

## 6. Feature by feature — what happens, which files, which tech

This is the same product you described, tied to files.

### Feature A — Sign up and login

- **You:** fill the form.
- **React:** `LoginPage.jsx` / `RegisterPage.jsx` → `authApi.js` → `http.js`.
- **Express:** `authRoutes.js` → `register` / `login` in `authController.js`.
- **Tech:** bcrypt (password), JWT (session token), User model.
- **MongoDB:** new user document, or find existing one.

### Feature B — See all incidents, severity first, search including resolved

- **You:** type in the search box; toggle All / Open / Resolved.
- **React:** `BoardPage.jsx` calls `listIncidents({ q, status })`.
- **Express:** `listIncidents` in `incidentController.js` uses MongoDB **filter** (status) and **text search** (title + description). **Sort** by severity rank then `updatedAt`.
- **Tech:** REST GET with query strings (`?q=payments&status=all`).

### Feature C — Commander sees who is busy, then assigns + sets severity

- **You:** open Team page or Assign form.
- **React:** `TeamPage.jsx` and `AssignForm.jsx` call `GET /api/users/workload`.
- **Express:** `listTeamWorkload` counts open vs resolved per person.
- **Then:** commander submits assign → `assignIncident` (severity set **here**, not by the fixer).
- **MongoDB:** update `Incident.assignee` and `severity`; insert `IncidentEvent`.

### Feature D — Everyone watches progress (timeline)

- **You:** open an incident.
- **React:** `IncidentPage.jsx` + `Timeline.jsx` load `getIncident`.
- **Express:** `getIncident` returns the incident plus events sorted by time.
- **Working on it:** comments via `addComment`; status via `updateStatus`.
- **Rule:** old events stay. History is honest.

### Feature E — Reassign with previous person’s summary

- **You:** commander fills new assignee + **required** handoff box.
- **React:** `AssignForm.jsx` (reassign mode) → `reassignIncident`.
- **Express:** rejects if handoff is empty. Writes `handoff` event then `assigned` event. New person reads the timeline and sees the old summary.

### Feature F — Resolve with written summary

- **You:** assignee (or commander) fills what / what we did / outcome.
- **React:** `ResolveForm.jsx` → `resolveIncident`.
- **Express:** rejects empty summary. Sets `status: resolved`. Board and search still find it.

### Feature G — Frontend and backend stay in sync

- After every successful action, React **re-fetches** the incident (or updates local state from the response). The screen matches the database. If the server returns 403, the UI shows “Only a commander can assign.”

---

## 7. One click, start to finish (example: reassign)

1. Commander is on `IncidentPage.jsx`, types handoff, picks “Asha”.
2. `AssignForm.jsx` calls `incidentApi.reassign(id, { assigneeId, handoffSummary, severity })`.
3. `http.js` sends `PATCH` with JWT.
4. `incidentRoutes.js` runs `requireAuth` then `requireCommander`.
5. `reassignIncident` in `incidentController.js` checks the incident exists, handoff is non-empty, new user exists.
6. Mongoose updates `Incident.js` document; creates two `IncidentEvent.js` documents.
7. Server replies with the updated incident + events.
8. `Timeline.jsx` re-renders: everyone who opens this page sees the handoff and the new owner.

---

## 8. What we will **not** put in the first build

To keep the first version learnable:

- No SMS / email / real PagerDuty
- No file uploads for screenshots (text only)
- No live WebSockets (refresh or re-fetch after actions is enough; we can add “auto refresh every 15s” later)
- No Docker/cloud deploy yet (you asked to wait)

---

## 9. How this maps to your words

| You said | We implement as |
|----------|-----------------|
| Incidents put on the site | `createIncident` + board |
| Assign to who can solve | Commander + `AssignForm` + workload counts |
| Timeline for lifecycle | `IncidentEvent` + `Timeline.jsx` |
| Solve → write summary | `resolveIncident` + `ResolveForm.jsx` |
| See name, role, solving/solved counts | `listTeamWorkload` + `TeamPage.jsx` |
| Reassign with previous summary | `reassignIncident` + handoff event |
| Severity by assigner | Field set only on assign/reassign by commander |
| Higher severity first | Sort on `listIncidents` |
| Everyone sees progress | Any logged-in user can GET list/detail |
| Search including resolved | `q` + `status=all` on list |

---

When you say **build it**, we will create exactly these folders and files and wire the functions above so you can click through the flow in the browser.
