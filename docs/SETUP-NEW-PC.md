# Set up Outdoor Studio on a new PC

Everything needed is in this repo except three secret files. The repo is **public**, so those
files never go into git; bring them over privately (pendrive, password manager).

## 1. Install
- **Node.js 18 or newer.** The office PC runs v24.15.0 with npm 11.
- **Git**
- *(optional)* VS Code with the Claude Code extension

## 2. Clone and install dependencies
```powershell
git clone https://github.com/manish-nishad-1984/outdoor.git "D:\work\outdoor studio"
cd "D:\work\outdoor studio"
cd backend;  npm install
cd ..\frontend; npm install
```

## 3. Put the secret files in place
Copy them from the `OutdoorStudio-secrets` folder, keeping the same paths:

| File | Goes to | What it holds |
|---|---|---|
| `.env.local` | `<repo>\.env.local` | DB connection string (local dev) |
| `backend\.env` | `<repo>\backend\.env` | `DB_*` + `JWT_SECRET` |
| `DEPLOY.md` | `<repo>\DEPLOY.md` | live FTP host/user/password + deploy steps |

If you don't have the pack, start from the templates instead and fill in the values:
`backend/.env.example` → `backend/.env`, and `DEPLOY.example.md` → `DEPLOY.md`.

The DB password contains a `#`. Keep it raw (no quotes). `backend/config/db.js` reads it without
`dotenv` on purpose.

## 4. Run (two terminals)
```powershell
# Terminal 1 — API on :5000 (the Vite dev proxy expects 5000)
cd backend
$env:PORT=5000; $env:NODE_ENV='development'; npm run dev

# Terminal 2 — UI
cd frontend
npx vite --port 5174
```
Open http://localhost:5174 and log in with an `app_users` account (`admin`). Check the API with
http://localhost:5000/api/health, which should return `{"status":"ok"}`.

The database is remote (site4now Postgres), so you need internet. Nothing to install locally.

## 5. Deploy and push
- With `DEPLOY.md` in place, run `/deploy` in Claude Code, or follow the steps written in
  `DEPLOY.md`. It builds the frontend, FTP-uploads it in **active** mode, restarts IIS by
  re-uploading `web.config`, then commits and pushes.
- Pushing to `origin main` works for `dhadukmanish`.

## 6. Claude Code context (optional)
- `CLAUDE.md` and `.claude/commands/deploy.md` come with the repo.
- To give Claude the same project memory on the new PC, copy `docs/claude/memory/*.md` into
  `%USERPROFILE%\.claude\projects\<project-folder-key>\memory\`. The folder key is the repo path
  with `:`, `\` and spaces replaced by `-`, e.g. `d--work-outdoor-studio`; Claude creates it the
  first time you open the repo.
- `docs/claude/HISTORY.md` summarizes all the work done so far.

## Not in the repo (and not needed)
- `backend/src/`: the old .NET solution from before the Node rewrite. It stays on the office PC
  only.
- `legacy/`: the original VB app reference, gitignored by the repo owner.
