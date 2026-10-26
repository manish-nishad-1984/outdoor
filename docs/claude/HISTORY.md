# Claude work history — Outdoor Studio

A sanitized log of the work done with Claude Code on this repo (October 2026). Credentials that
came up during the sessions are deliberately left out. They live only in the gitignored
`DEPLOY.md`, `.env.local` and `backend/.env`. The raw session transcript is not committed for the
same reason.

`memory/` holds copies of Claude's project memory notes, with passwords redacted.

## Environment and access
- This folder was switched from the old .NET work to the Node/Express + React/Vite code in
  `github.com/manish-nishad-1984/outdoor`. The old .NET solution is still in `backend/src/` and is
  not tracked.
- Login was fixed locally and on the live site: the DB password contains `#`, which `dotenv`
  mis-parses, so `backend/config/db.js` reads the credentials raw.
- Live hosting is site4now IIS, deployed over FTP in active mode. `DEPLOY.md` has the procedure.
  `git push` has returned 403 for `dhadukmanish` on this repo.

## Performance
- `backend/config/db.js`: the host is resolved once with DNS fallback servers (the OS resolver
  intermittently failed for `PG8001.site4now.net`). The pool uses keep-alive and a long idle
  timeout, and opens a few connections up front.
- `routes/quotations.js`: the detail endpoint runs its queries in parallel, and client-info is a
  single query.
- `vite.config.mjs`: vendor chunks are split out (react, grid, icons).

## UI shell
- An experimental "v2" (AWS/Pratishtha-style) UI was built and then removed at the user's request.
- New default shell, Salesforce Lightning style (`components/sf/`): a navy icon rail, a slim 40px
  header, module tabs and a utility footer. `?ui=classic` brings back the old sidebar layout;
  the choice is remembered per browser.

## Modules
- **Studio Orders removed**: its pages, routes, nav entry, API route and test are gone. The DB
  tables and their data were kept.
- **Simpler document forms** (shared `components/docForm.css`): Quotation, Order/Bill and Sale are
  laid out as numbered sections with a sticky summary panel. New items are typed into the last
  table row and added with Enter, and Ctrl+S saves. Order items keep their extra fields behind a
  "More" row. Print, Share and Delete moved into menus or the summary panel. Going from an edit
  to "New" now clears the form (this was a bug before).
- **List grid** (`components/grid/DataGrid.jsx`, TanStack Table): used on 17 list pages. It
  supports search, sort, column show/hide and resize, compact rows, CSV export, a totals row and
  pagination. Preferences are saved per grid. Lists now fetch all records, so totals and stat cards
  cover every record instead of only the first 25 shown.
- **Outdoor Party Payment** page redesigned: pick a party, see summary tiles, then clickable
  pending-bill cards that pre-fill the amount. Also a payment history, recent payments, and a
  receive-payment side panel showing what is still pending after the payment.
- **Dashboard**: the placeholder revenue chart (static data) was removed. In its place is
  "Photographer / Staff Not Assigned": order items whose Item Master entry has `staff_req` but no
  operator assigned (`GET /api/reports/unassigned-staff`).
- **Shoot Calendar** (`/calendar`, under Outdoor): a month grid of order shoots, bookings, and
  quotations not yet converted to orders. Each day shows as booked, tentative or available, and
  clicking a day opens its details (`GET /api/reports/calendar?from&to`).

## Running locally
- Backend: `cd backend; $env:PORT=5000; $env:NODE_ENV='development'; node server.js`
- Frontend: `cd frontend; npx vite --port 5174`. Port 5173 is often taken by another project on
  this machine.
