# DEPLOY — Outdoor Studio (theme.kriviinfotech.com)

> Template of the real `DEPLOY.md` (gitignored, holds the FTP password). Copy this file to
> `DEPLOY.md` at the repo root and fill in the password. Never commit the real one.

## Live host — site4now (SmarterASP.NET / Windows IIS)

| Field | Value |
|---|---|
| Site | http://theme.kriviinfotech.com |
| FTP host | win8194.site4now.net |
| FTP user | outdoor |
| FTP pass | <ask the team — not stored in git> |
| FTP mode | **active** (passive/EPSV is blocked) — PowerShell `FtpWebRequest`, `UsePassive=$false` |

**FTP root maps directly to the app/`backend` folder** (server path
`h:\root\home\jigneshsatani-001\www\theme`). Remote layout:

```
/server.js
/package.json
/web.config          <- touch (re-upload) to restart the Node process
/.env                <- server secrets (DB_* + JWT_SECRET); gitignored, lives only on server
/config/db.js
/routes/*.js
/public/index.html, /public/assets/*
```

IIS runs the app via `httpPlatformHandler` → `npm run start` (`node server.js`).
`web.config` sets only `PORT` and `NODE_ENV`; **all DB/JWT secrets come from `/.env`**.

## Database

Remote PostgreSQL (site4now) — connection string is in `.env.local` at the repo root
(gitignored). The DB password contains a `#`, which `dotenv` mis-parses, so
[backend/config/db.js](backend/config/db.js) reads credentials **raw** (from `.env.local` in
local dev, else from `backend/.env`) instead of trusting `process.env`.

App login is the `app_users` table via `POST /api/auth/login`. Seeded accounts: `admin`, `operator`.

## Deploy steps

1. `cd frontend && npm run build`
2. Replace `backend/public` with fresh `frontend/dist`.
3. FTP-upload (active mode) the changed files: `public/index.html`, `public/assets/*`, and any
   changed `backend/*` (`server.js`, `routes/*.js`, `config/db.js`). Never pass the FTP password
   as a command-line argument — do FTP via the PowerShell tool.
4. If `/.env` is missing on the server, create it with `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASS`
   (raw password, no quotes) + a strong `JWT_SECRET`.
5. Re-upload `web.config` to restart Node. First request after restart takes 30–90 s.
6. Verify: `GET /api/health` → `{"status":"ok"}`, then `POST /api/auth/login`.

## Notes
- HTTPS to this host currently fails (no SSL on the domain) — site serves over HTTP.
- `git push origin main` has previously returned 403 for `dhadukmanish` on this repo.
