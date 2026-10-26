---
name: database-connection
description: How to connect the Outdoor Studio backend to its PostgreSQL database
metadata: 
  node_type: memory
  type: project
  originSessionId: 0bde65b4-418a-412c-b4b1-7f727b2d5a17
---

The target database is a **hosted PostgreSQL on site4now** (not the local instance):
`Host=PG8001.site4now.net;Port=6432;Database=db_9a7009_outdoor;Username=9a7009_outdoor;Pooling=false`.
The password is NOT stored here — the user provides it; pass the full string at runtime via the
`ConnectionStrings__Default` environment variable (never commit it; `appsettings*.json` keeps only the
localhost placeholder).

Key facts:
- The DB role is **non-superuser** and not owner of schema `public` → cannot `DROP SCHEMA`; drop
  individual tables if a reset is needed. Because it's non-superuser, **RLS policies are actually
  enforced** (verified).
- Port 6432 is a **PgBouncer-style pooler**. **Connection pooling is now SAFE and preferred** — use
  `Pooling=true;Minimum Pool Size=2;Maximum Pool Size=20` (drops list latency from ~2 s to ~0.5 s).
  This required the `HardenTenantPolicies` migration (2026-07-09): the RLS policies now wrap the GUC in
  `NULLIF(current_setting('app.company_id', true), '')` so an **empty-string** company_id counts as
  unset. Without it, a recycled pooled connection leaves the custom GUC as `''` (not NULL), so the old
  `IS NULL` escape hit `22P02 invalid input syntax for type uuid: ""` and **broke login for every
  request until the pool recycled**. Never revert to the plain `current_setting(...) IS NULL` form.
- Remaining latency is pure network RTT to the remote host × queries-per-request; endpoints that run
  several sequential queries (roles/users list) take ~1–1.7 s. That's distance, not a bug.
- Run the API: `ASPNETCORE_ENVIRONMENT=Development ASPNETCORE_URLS=http://localhost:5080` +
  the connection env var; startup auto-applies EF migrations and seeds via [[m1-auth-slice]].
- `dotnet ef` global tool was upgraded to 9.x (was 8.0.28, too old for EF Core 9).
