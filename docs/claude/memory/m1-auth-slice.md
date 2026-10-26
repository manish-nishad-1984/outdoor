---
name: m1-auth-slice
description: State of the M1 Identity & Access module in the Outdoor Studio migration
metadata: 
  node_type: memory
  type: project
  originSessionId: 0bde65b4-418a-412c-b4b1-7f727b2d5a17
---

**M0 foundation was pre-built** (Clean Architecture skeleton + React shell). The **M1 Identity auth
vertical slice is now implemented and verified** end-to-end against the real DB ([[database-connection]]):

- Domain: `Company` (min tenant root) + normalized RBAC — `AppUser, Role, Permission, RolePermission,
  UserRole, UserPermission, RefreshToken` (under `Domain/Modules/{Companies,Identity}`).
- First EF migration `InitialIdentity` with hand-appended **RLS `tenant_isolation` policies** (ENABLE +
  FORCE) on every tenant table, keyed on `current_setting('app.company_id')`, with an "unset-GUC escape"
  so unauthenticated login + the seeder can bootstrap. Verified: wrong company → 0 rows.
- Application (CQRS): `Auth/{Login,Refresh,Logout}` + `Users/GetMe`; ports `IUserAuthRepository`,
  `IRefreshTokenService` (Infra impls). `/me` is built from JWT claims (no DB hit).
- API endpoints under `/api/v1`: `auth/login|refresh|logout`, `me`. Refresh token is opaque, SHA-256
  hashed server-side, rotated, reuse-detection revokes the chain; delivered as an **httpOnly cookie**
  (`path=/api/v1/auth`, SameSite=Lax, Secure only over https). Matches the existing frontend contract
  exactly (auth-api.ts / types/auth.ts) — frontend needed no changes.
- Seed (dev only, idempotent, in `ApplicationDbInitializer`): company `DEMO`, roles `owner`/`manager`,
  a representative permission catalog, admin user **`admin` / `<see team password store>`**.

**Administration slice added** (full-stack, verified against the real DB): CQRS under
`Application/Modules/Identity/Administration/{Users,Roles}` + ports `IUserAdminRepository` /
`IRoleAdminRepository` (Infra impls, RLS-scoped). Endpoints: `GET/POST /api/v1/users`,
`PUT /api/v1/users/{id}/roles`; `GET/POST /api/v1/roles`, `PUT /api/v1/roles/{id}`,
`GET/PUT /api/v1/roles/{id}/permissions`, `GET /api/v1/permissions`. Perms: `user:read` (list),
`user:manage` (create/assign), `role:manage` (all role/permission ops) — enforced by the MediatR
`AuthorizationBehavior` (endpoints only `.RequireAuthorization()`). Frontend: feature slices
`features/users` + `features/roles` with the **Users** (`/admin/users`) and **Roles & Permissions**
(`/admin/roles`) screens (React Query + shadcn), routed with `RequirePermission` guards + sidebar nav.
No new migration — reuses the existing Identity tables.

Still not done: full ≈177-permission catalog (still the representative seed set), per-user permission
overrides UI, user deactivate/password-reset endpoints, and delete for users/roles. Production
non-superuser DB role wiring relies on the hosted role. Next module is **M2 Company & Configuration**
per `docs/migration/02-migration-order.md`.
