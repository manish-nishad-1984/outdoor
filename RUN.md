# Run & Build — Outdoor Studio

Node **v24.15.0**, npm **11.12.1** (any Node ≥ 18 works).

| Part | Stack | Folder |
|---|---|---|
| Backend | Express + PostgreSQL (`pg`) | `backend/` |
| Frontend | React 18 + Vite 5 | `frontend/` |

The database is **remote** (`PG8001.site4now.net:6432`) — nothing to install locally, but you need internet.

---

## 1. First-time setup

```powershell
cd "E:\DO_NOT_REMOVE\Dhaval Kapadiya\OUTDOOR DEMO\OUTDOOR DEMO\app"

# backend deps
cd backend
npm install

# frontend deps
cd ..\frontend
npm install
```

### backend/.env

`.env` is **gitignored**, so on a fresh clone create it from the template:

```powershell
cd ..\backend
Copy-Item .env.example .env
```

Then fill in the real values:

```ini
PORT=3000
NODE_ENV=production
JWT_SECRET=outdoorstudio_secret_2026
DB_HOST=PG8001.site4now.net
DB_PORT=6432
DB_NAME=db_9a7009_outdoor
DB_USER=9a7009_outdoor
DB_PASS=<db password>
```

---

## 2. Run in development (two terminals)

> ⚠️ **Port note:** `.env` sets `PORT=3000` (that is the production/IIS value), but
> `frontend/vite.config.js` proxies `/api` to **port 5000**. So for local dev you must
> start the backend on 5000. `dotenv` does not overwrite variables that are already set,
> so exporting `PORT` in the shell wins over `.env` — no file edits needed.

**Terminal 1 — backend**

```powershell
cd "E:\DO_NOT_REMOVE\Dhaval Kapadiya\OUTDOOR DEMO\OUTDOOR DEMO\app\backend"
$env:PORT=5000; $env:NODE_ENV="development"; npm run dev     # nodemon, auto-restart
# or without auto-restart:
$env:PORT=5000; $env:NODE_ENV="development"; npm start
```

Expected output:

```
Server running on port 5000
PostgreSQL connected
```

**Terminal 2 — frontend**

```powershell
cd "E:\DO_NOT_REMOVE\Dhaval Kapadiya\OUTDOOR DEMO\OUTDOOR DEMO\app\frontend"
npm run dev
```

Vite prints the URL — normally <http://localhost:5173/>, or **5174** if 5173 is already taken.

| What | URL |
|---|---|
| App (dev) | http://localhost:5173 (or 5174) |
| API health | http://localhost:5000/api/health → `{"status":"ok"}` |

Login is against the `app_users` table via `POST /api/auth/login` (username + password).

### Quick smoke test

```powershell
curl.exe -s http://localhost:5000/api/health
```

---

## 3. Build for production

```powershell
cd "E:\DO_NOT_REMOVE\Dhaval Kapadiya\OUTDOOR DEMO\OUTDOOR DEMO\app\frontend"
npm run build          # → frontend/dist/
```

Copy the build into the backend's static folder:

```powershell
$src = "E:\DO_NOT_REMOVE\Dhaval Kapadiya\OUTDOOR DEMO\OUTDOOR DEMO\app\frontend\dist"
$dst = "E:\DO_NOT_REMOVE\Dhaval Kapadiya\OUTDOOR DEMO\OUTDOOR DEMO\app\backend\public"
if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
Copy-Item $src $dst -Recurse
```

## 4. Run the production build locally (single server)

With `NODE_ENV=production`, [server.js:36-41](backend/server.js#L36-L41) serves `backend/public`
and falls back to `index.html` for client-side routes — one process, no Vite.

```powershell
cd "E:\DO_NOT_REMOVE\Dhaval Kapadiya\OUTDOOR DEMO\OUTDOOR DEMO\app\backend"
npm start              # uses PORT=3000 from .env
```

Open <http://localhost:3000>.

---

## One-shot: build + serve

```powershell
$app = "E:\DO_NOT_REMOVE\Dhaval Kapadiya\OUTDOOR DEMO\OUTDOOR DEMO\app"
Set-Location "$app\frontend"; npm run build
$dst = "$app\backend\public"
if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
Copy-Item "$app\frontend\dist" $dst -Recurse
Set-Location "$app\backend"; npm start
```

---

## Deploying to the live server

See [DEPLOY.md](DEPLOY.md) — FTP upload to SmarterASP.NET/IIS, then touch `web.config` to
restart the Node process.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Frontend loads, every API call 404/500 | Backend not on **5000** in dev. Restart it with `$env:PORT=5000`. |
| `Port 5173 is in use, trying another one...` | An old Vite is still running. Use the port Vite prints, or kill it: `Get-Process node \| Stop-Process`. |
| `EADDRINUSE :5000` | Old backend still running — same kill command as above. |
| No `PostgreSQL connected` line | Wrong `DB_*` values in `.env`, or no internet / DB host unreachable. |
| Blank page at :3000 | `backend/public` missing — run the build + copy step (§3). |
| `Cannot find module 'express'` | `npm install` was not run in `backend/`. |

---

## Useful scripts

**backend/package.json**

| Command | Does |
|---|---|
| `npm start` | `node server.js` |
| `npm run dev` | `nodemon server.js` (auto-restart) |
| `npm test` | `node test/create-flows.test.js` |

**frontend/package.json**

| Command | Does |
|---|---|
| `npm run dev` | Vite dev server + `/api` proxy |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
