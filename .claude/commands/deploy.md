---
description: Build, FTP-deploy to the live SmarterASP.NET/IIS host, and push to GitHub
argument-hint: [optional commit message]
---

Deploy the current working tree to production. Read `DEPLOY.md` first (gitignored — contains
the live FTP host/user/password) for the authoritative connection details; if any value there
conflicts with what's written below, `DEPLOY.md` wins.

Follow these steps in order. Report back clearly after each major step, and stop to tell the
user about any failure rather than working around it silently — deploys touch a real production
site.

## 1. Build the frontend
```
cd frontend
npm run build
```
Fails loudly if `npm run build` errors — do not continue to FTP upload on a broken build.

## 2. Copy dist → backend/public
Replace `backend/public` entirely with the fresh `frontend/dist` output (remove the old
directory first, then copy), so stale hashed asset files don't accumulate.

## 3. FTP upload — MUST use active mode
This sandbox's outbound network blocks FTP **passive mode** (`EPSV`) — every passive-mode data
connection fails after the control channel connects fine. Do not use `System.Net.WebClient`
(it defaults to passive) or plain `curl -T` with default settings. Use PowerShell with
`[System.Net.FtpWebRequest]` and explicitly set `UsePassive = $false`, `UseBinary = $true`,
`KeepAlive = $false`. Never pass the FTP password as a Bash command-line argument (it gets
blocked by this environment's classifier for credentials-in-argv) — do all FTP work through the
PowerShell tool instead.

Upload:
- `backend/public/index.html`
- every file under `backend/public/assets/`
- any backend file that shows as modified/added in `git status` relative to the last deploy
  (typically `backend/server.js` and/or specific `backend/routes/*.js` files) — check
  `git status --short` first and only upload what actually changed, to keep this fast.

The FTP root maps directly to the `backend/` folder (no prefix) — see `DEPLOY.md` for the exact
remote paths (`public/index.html`, `public/assets/<name>`, `routes/<name>.js`, `server.js`).

## 4. Restart IIS
IIS watches `web.config` for changes. Download it via FTP (active mode) and immediately
re-upload the identical bytes — this touches its mtime and triggers a Node process restart.
Do not edit its contents.

## 5. Verify (with a known limitation)
Try `curl -s -o /dev/null -w "%{http_code}" https://theme.kriviinfotech.com/` — but know going
in that this sandbox has repeatedly failed to complete a TLS handshake to this specific
Cloudflare-fronted host (`curl` exit 35, `Invoke-WebRequest` failing the same way) even on
deploys that later turned out fine. If it fails, say so plainly, note that FTP/IIS-restart still
reports success independent of this check, and ask the user to confirm the site loads from their
own browser — don't claim success or failure you can't actually verify.

## 6. Commit and push
```
git add -A
git commit -m "<message>"
```
Use `$ARGUMENTS` as the commit message if the user supplied one when invoking `/deploy`;
otherwise write a concise message summarizing what actually changed (check `git diff --stat
HEAD~1` or the session's own work for content — don't just write "Deploy").
End the commit message with:
```
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
```

Then `git push origin main`. This has previously failed with a 403 (`Permission to
manish-nishad-1984/outdoor.git denied to dhadukmanish`) — the local git identity may not have
push access to this remote. If it fails again, do not try alternate credentials or force
anything: report the exact error, confirm the commit is safe locally, and tell the user this
needs either the right credentials for the repo-owning account or that account granting
`dhadukmanish` collaborator access. A failed push does not mean the deploy failed — the live
site is served from the FTP-uploaded files, not from GitHub.

## Report
Finish with a short summary: what was built/uploaded, whether IIS restart succeeded, whether the
live-site check passed/failed/was inconclusive, and whether the push succeeded — call out any
step that didn't fully succeed instead of rounding up to "done."
