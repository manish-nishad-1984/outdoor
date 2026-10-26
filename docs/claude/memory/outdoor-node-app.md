---
name: outdoor-node-app
description: "Current Outdoor Studio stack, repo, live deploy, and the dotenv DB-password gotcha"
metadata:
  node_type: memory
  type: project
  originSessionId: 9baa9ddd-46d5-4d84-b133-f87c8ea206e4
  modified: 2026-10-20T13:20:01.494Z
---

**As of 2026-10-20 this working tree is the Node+React `outdoor` app, NOT the .NET app.** The
earlier .NET Clean-Architecture version (see [[m1-auth-slice]], [[business-modules-reset]]) was
replaced by resetting `main` to `github.com/manish-nishad-1984/outdoor` (last commit `136629d`).
The old .NET code + its uncommitted work is preserved on branch
**`backup/dotnet-version-2026-10-20`** (commit `c08cc38`). Those three .NET memories are now
historical, not the live tree.

Stack: **Express + PostgreSQL (`pg`)** in `backend/`, **React 18 + Vite** in `frontend/`.
Run locally: backend on port 5000 (`$env:PORT=5000; npm run dev`), frontend `npm run dev`
(:5173). See `RUN.md`. Login = `app_users` table via `POST /api/auth/login`; accounts `admin`
and `operator`. Admin password was reset to `<see team password store>` on 2026-10-20 (user to change).

**DB connection gotcha:** the DB password (same hosted site4now PG, see [[database-connection]])
contains a `#`, which `dotenv` mis-parses, corrupting `DB_PASS` and breaking login with
"client password must be a string". `backend/config/db.js` was fixed to resolve creds WITHOUT
dotenv: repo-root `.env.local` (`ConnectionStrings__Default`, local dev) → else `backend/.env`
read raw → else `process.env`. Don't revert to plain `process.env.DB_PASS`.

**DB perf (2026-10-20):** DB is ~270 ms RTT away, and this PC's OS resolver intermittently fails
on `PG8001.site4now.net` ("No such host is known") while direct DNS answers. `db.js` therefore
pre-resolves the host via `dns.resolve4` (fallback 8.8.8.8/1.1.1.1), connects by IP with TLS
`servername` = hostname, holds connects until resolved, keeps idle conns 10 min + keepAlive, and
pre-warms 4. Every endpoint ≈ 1 RTT; keep route queries parallel/single (no sequential chains).

**Live deploy — theme.kriviinfotech.com** (site4now / SmarterASP Windows IIS): details + FTP
creds in gitignored `DEPLOY.md`. FTP root maps directly to the backend folder; secrets live in
the server's `/.env` (DB_* + JWT_SECRET) — web.config only sets PORT/NODE_ENV. Restart Node by
re-uploading `web.config`. HTTP only (no SSL). Deploy via `/deploy`; **`git push` 403s** —
`dhadukmanish` lacks push rights to `manish-nishad-1984/outdoor`.
