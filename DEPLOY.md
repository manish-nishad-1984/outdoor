# Deployment Guide — Outdoor Studio

**Server:** win8194.site4now.net (SmarterASP.NET / IIS)  
**FTP User:** `outdoor`  
**GitHub:** https://github.com/manish-nishad-1984/outdoor

---

## Deploy Steps

### 1. Build the Frontend
```powershell
cd app/frontend
npm run build
```
Output goes to `frontend/dist/`.

---

### 2. Copy dist → backend/public
```powershell
$src = "E:\DO_NOT_REMOVE\Dhaval Kapadiya\OUTDOOR DEMO\OUTDOOR DEMO\app\frontend\dist"
$dst = "E:\DO_NOT_REMOVE\Dhaval Kapadiya\OUTDOOR DEMO\OUTDOOR DEMO\app\backend\public"
if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
Copy-Item $src $dst -Recurse
```

---

### 3. FTP Upload Changed Files

**Frontend files** (always upload after a build):
```
public/index.html
public/assets/index-<hash>.js
public/assets/index-<hash>.css
```

**Backend files** (only if changed):
```
server.js
routes/<filename>.js
package.json
```

PowerShell FTP helper:
```powershell
$ftpHost = "win8194.site4now.net"
$ftpUser = "outdoor"
$ftpPass = "out**x45uu"   # ** are LITERAL asterisks, not masked

function FtpUpload($localPath, $remotePath) {
  $wc = New-Object System.Net.WebClient
  $wc.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
  try { $wc.UploadFile("ftp://$ftpHost/$remotePath", $localPath) | Out-Null; Write-Host "OK: $remotePath" }
  catch { Write-Host "FAIL: $remotePath — $_" }
  finally { $wc.Dispose() }
}

function FtpMkdir($remotePath) {
  $req = [System.Net.FtpWebRequest]::Create("ftp://$ftpHost/$remotePath")
  $req.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
  $req.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
  try { $resp = $req.GetResponse(); $resp.Close() } catch {}
}
```

---

### 4. Restart IIS (touch web.config)

IIS watches `web.config` — re-uploading it restarts the Node process:

```powershell
$wc2 = New-Object System.Net.WebClient
$wc2.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
$content = $wc2.DownloadString("ftp://win8194.site4now.net/web.config")
$bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
$wc2.UploadData("ftp://win8194.site4now.net/web.config", $bytes) | Out-Null
$wc2.Dispose()
Write-Host "IIS restarted"
```

Wait **30–60 seconds** for the site to come back up.

---

### 5. Commit & Push to GitHub

```powershell
cd app
git add -A
git commit -m "Deploy: description of changes"
git push origin main
```

---

## Full One-Shot Deploy Script

Run this whenever you want to push everything live:

```powershell
# ── CONFIG ──────────────────────────────────────────────
$ftpHost  = "win8194.site4now.net"
$ftpUser  = "outdoor"
$ftpPass  = "out**x45uu"
$appRoot  = "E:\DO_NOT_REMOVE\Dhaval Kapadiya\OUTDOOR DEMO\OUTDOOR DEMO\app"
$frontend = "$appRoot\frontend"
$backend  = "$appRoot\backend"

# ── HELPERS ─────────────────────────────────────────────
function FtpUpload($local, $remote) {
  $wc = New-Object System.Net.WebClient
  $wc.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
  try { $wc.UploadFile("ftp://$ftpHost/$remote", $local) | Out-Null; Write-Host "OK: $remote" }
  catch { Write-Host "FAIL: $remote — $_" }
  finally { $wc.Dispose() }
}
function FtpMkdir($remote) {
  $req = [System.Net.FtpWebRequest]::Create("ftp://$ftpHost/$remote")
  $req.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
  $req.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
  try { $resp = $req.GetResponse(); $resp.Close() } catch {}
}

# ── 1. BUILD ─────────────────────────────────────────────
Write-Host "`n==> Building frontend..."
Set-Location $frontend
npm run build

# ── 2. COPY DIST ─────────────────────────────────────────
$dist = "$frontend\dist"
$pub  = "$backend\public"
if (Test-Path $pub) { Remove-Item $pub -Recurse -Force }
Copy-Item $dist $pub -Recurse
Write-Host "==> Copied dist to backend/public"

# ── 3. FTP UPLOAD ────────────────────────────────────────
Write-Host "`n==> Uploading to FTP..."
FtpMkdir "public"; FtpMkdir "public/assets"
Get-ChildItem "$pub\assets" | ForEach-Object { FtpUpload $_.FullName "public/assets/$($_.Name)" }
FtpUpload "$pub\index.html" "public/index.html"
FtpUpload "$backend\server.js" "server.js"
FtpMkdir "routes"
Get-ChildItem "$backend\routes" | ForEach-Object { FtpUpload $_.FullName "routes/$($_.Name)" }

# ── 4. RESTART IIS ───────────────────────────────────────
Write-Host "`n==> Restarting IIS..."
$wc2 = New-Object System.Net.WebClient
$wc2.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
$content = $wc2.DownloadString("ftp://$ftpHost/web.config")
$bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
$wc2.UploadData("ftp://$ftpHost/web.config", $bytes) | Out-Null
$wc2.Dispose()

# ── 5. GIT PUSH ──────────────────────────────────────────
Write-Host "`n==> Pushing to GitHub..."
Set-Location $appRoot
git add -A
git commit -m "Deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
git push origin main

Write-Host "`n✓ Deployment complete. Wait 30-60s for IIS to restart."
```

---

## FTP Folder Structure

```
/ (FTP root = backend folder)
├── server.js
├── web.config          ← touch this to restart IIS
├── package.json
├── routes/
│   ├── auth.js
│   ├── outdoorOrders.js
│   └── ...
├── config/
│   └── db.js
├── middleware/
│   └── auth.js
└── public/             ← built React app
    ├── index.html
    └── assets/
        ├── index-<hash>.js
        └── index-<hash>.css
```

---

## Notes

- FTP root maps **directly** to the backend folder (no `/theme/backend/` prefix)
- After uploading backend routes, IIS **must** be restarted to pick up Node changes
- Frontend build hash changes every time code changes — old hashed files on the server are harmless but can be deleted manually
- DB is on `PG8001.site4now.net:6432` — no deploy needed for DB schema changes made via `ALTER TABLE IF NOT EXISTS` in route files
