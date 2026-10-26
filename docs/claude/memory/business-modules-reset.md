---
name: business-modules-reset
description: "On 2026-09-17 all business modules (Items, Events, Account Groups) were deleted to restart fresh from the M1 auth foundation"
metadata: 
  node_type: memory
  type: project
  originSessionId: bacf4dde-99a4-413f-8908-6b4fdd65ae95
  modified: 2026-09-17T14:54:56.190Z
---

On **2026-09-17** the user decided to scrap all business modules and rebuild fresh from the
[[m1-auth-slice]] foundation. Deleted from the working tree (code only):

- **M2 Items**, **M3 Events**, **M4 Account Groups** — domain entities, Application CQRS folders,
  Infrastructure repositories + EF configurations, API endpoint files, and the three frontend
  feature folders.
- Migrations `AddItems`, `AddEvents`, `AddAccountGroups` deleted; `HardenTenantPolicies` was
  **edited** to drop `("item", "company_id")` from its `TenantTables` array, and
  `AppDbContextModelSnapshot.cs` was hand-trimmed of the three Masters entities.
- Only `InitialIdentity` + `HardenTenantPolicies` remain. Both builds verified green and
  `dotnet ef migrations has-pending-model-changes` reports no drift.

Recovery: M2 and M3 were **committed** (recoverable via `git show 35eafec`). M4 was never
committed and is **permanently gone** — the user explicitly declined a backup commit when warned.

**Open issue — the live database was NOT touched.** The hosted site4now DB still holds the
`item`, `event` and `account_group` tables (including ~38 imported legacy events) plus
`__EFMigrationsHistory` rows for the three deleted migrations. Code and DB are therefore out of
sync; this must be resolved before the next migration is generated. See [[database-connection]].

The rebuild plan starts at M5 (Account + Party hub), then the ledger — deliberately different
from the old order, which built masters before the accounting backbone.
