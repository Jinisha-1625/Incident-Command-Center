# Incident Command Center

React + Express + MongoDB app for on-call **incidents** (not a generic bug tracker). Commanders open incidents, set severity, and assign people using workload counts. Everyone can watch an append-only **timeline**. Reassignment requires a **handoff summary**. Resolve requires a written **what / what we did / outcome**. Search includes resolved incidents.

## Demo logins (seeded on first start)
All **commanders** use `command123`. All **engineers** use `engineer123`.

| Role | Name | Email |
|------|------|--------|
| Commander | Maya Shah | `maya@command.local` |
| Commander | Kabir Mehta | `kabir@command.local` |
| Commander | Ananya Iyer | `ananya@command.local` |
| Commander | Rohan Desai | `rohan@command.local` |
| Commander | Sneha Kapoor | `sneha@command.local` |
| Engineer | Arjun Mehta | `arjun@command.local` |
| Engineer | Priya Nair | `priya@command.local` |
| Engineer | Vikram Joshi | `vikram@command.local` |
| Engineer | Neha Reddy | `neha@command.local` |
| Engineer | Aditya Menon | `aditya@command.local` |
Seeded accounts appear only on a **fresh** API start (empty database). Restart `npm run dev` after changing seed data. Stopping the API wipes in-memory Mongo.


In-memory MongoDB is used when `MONGODB_URI` is unset, so you can run without installing MongoDB. Data resets when the API process stops. For a real database, set `MONGODB_URI` in `server/.env`.

## Run locally

You need Node.js 20+.

```bash
npm install
npm install --prefix server
npm install --prefix client
npm run dev
```

- UI: http://127.0.0.1:38472
- API: http://127.0.0.1:38471/api/health

The website (port 38472) calls the API at http://127.0.0.1:38471. Keep both running (`npm run dev` starts both). If login fails with a network error, wait until the terminal shows MongoDB connected, then try again.

## What you can do in the UI

1. Log in as Maya (commander) and open the board — SEV-1 is listed above SEV-3.
2. Open **Team** to see name, role, currently solving, and solved counts.
3. Open an incident, post a timeline update, acknowledge / mitigate.
4. Reassign with a required handoff so the next engineer sees prior work.
5. Resolve with the three-part summary. Search **Resolved** or **All** to find it again.

Engineers cannot assign or change severity. They can work the timeline and resolve if they are the assignee.

## Project layout

- `server/` — Node.js, Express, Mongoose, JWT auth, REST routes
- `client/` — React (Vite), Tailwind, shadcn-style UI primitives
