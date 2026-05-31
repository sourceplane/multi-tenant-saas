# Task 0123 — Implementer Report

**Agent:** Implementer
**Milestone:** B8 — Admin / support worker (V1: read-only diagnostics + audited support actions)
**Branch:** `impl/task-0123-admin-worker`
**PR Number:** TBD (updated post-open)

## Summary

Stood up the greenfield internal **`apps/admin-worker`** per spec-16, delivering the V1
capability subset: deny-by-default support authorization, an append-only audited
support-action ledger, and narrow read-only diagnostic projections for organizations and
users. The worker is internal-only (NOT routed through api-edge, no public surface) and
reuses the established `cloudflare-worker-turbo` shape and the events-audit seam
(`EventsRepository.appendEventWithAudit`) without forking any new mechanism. A new
forward-only DB migration (`140_support_action_records`) creates the `support` bounded
context the worker owns. No impersonation, no api-edge route, no Console UI, no changes to
peer workers or the events-audit model.

## Files Changed

### New — admin-worker app (`apps/admin-worker/`)
- `component.yaml` — `cloudflare-worker-turbo`, internal-only; verify on dev, verify+deploy
  on stage/prod for `triggerRef: github-push-main` (mirrors policy-worker exactly).
- `package.json`, `tsconfig.json`, `eslint.config.js`, `wrangler.jsonc` — peer-matched.
- `src/index.ts` — `export default { fetch } satisfies ExportedHandler<Env>`.
- `src/router.ts` — request-id resolution, support-context resolution from headers
  (`x-actor-id`/`x-actor-type`/`x-support-role`/`x-system-override`), routes:
  `GET /health`, `POST /v1/internal/support/actions`,
  `GET /v1/internal/support/organizations/:org/actions`,
  `GET /v1/internal/support/organizations/:org`,
  `GET /v1/internal/support/users/:user`.
- `src/env.ts`, `src/http.ts`, `src/ids.ts`, `src/support-auth.ts`, `src/support-events.ts`.
- `src/handlers/health.ts`, `record-support-action.ts`, `list-support-actions.ts`,
  `lookup-support.ts`.
- `src/pagination.ts` — keyset pagination on `(occurred_at, id)`.

### New — DB support context (`packages/db/src/support/`)
- `types.ts`, `repository.ts`, `index.ts` — `recordSupportAction`, `listSupportActions`,
  `lookupOrganizationForSupport`, `lookupUserForSupport`; narrow projections only.
- `migrations/140_support_action_records/up.sql` — `support.support_action_records` table
  + 2 indexes; forward-only, `IF NOT EXISTS` guards, no backfill.

### Modified — DB registration
- `packages/db/src/manifest.ts` — registered migration 140 (checksum
  `50262de186b5ec91797e25532b56cf69028f3975dcc58751c07de6ef1517f190`).
- `packages/db/src/types.ts` — registered the `support` bounded context.
- `packages/db/package.json` — support subpath export.

### New — tests (`tests/admin-worker/`)
- `package.json` (Jest + ts-jest ESM), `tsconfig.json`, `eslint.config.js`, `component.yaml`.
- `src/record-support-action.test.ts` — deny-by-default (no actor, unrecognized role,
  override-without-system-actor), authorized record + audit emission, system override,
  record-failure 500, validation 422.
- `src/list-support-actions.test.ts` — denial + audit, malformed-org 404, authorized list,
  forward-cursor pagination.
- `src/lookup-support.test.ts` — org + user diagnostic lookups, deny + audit, narrow
  projection key assertions (no secrets), system-override lookup, malformed/not-found 404.

### Modified — test registration
- `tests/db/src/migrations.test.ts` — migration 140 expectation.

## Checks Run

| Command | Result |
|---|---|
| `pnpm install` | ✅ 42 workspace projects resolved |
| `turbo run typecheck` (full repo) | ✅ 46/46 packages |
| `turbo run typecheck --filter=@saas/admin-worker` | ✅ |
| `turbo run typecheck --filter=@saas/admin-worker-tests` | ✅ |
| `turbo run test --filter=@saas/admin-worker-tests` | ✅ 3 suites / 19 tests |
| `turbo run test --filter=@saas/db-tests` | ✅ 15 suites / 521 tests (migration 140 checksum verified) |
| `turbo run lint --filter=@saas/admin-worker --filter=@saas/admin-worker-tests` | ✅ |
| `turbo run build --filter=@saas/admin-worker` | ✅ |
| `wrangler deploy --dry-run --config wrangler.jsonc --env prod` | ✅ binds SOURCEPLANE_DB Hyperdrive |

Note: `orun validate/plan/run --dry-run` runs in CI (orun CLI is provided by the
`sourceplane/orun-action` in `.github/workflows/ci.yml`, not installed locally). The new
app + tests ship `component.yaml` files so they are Orun-discovered via `discovery.roots`
(`apps/`, `tests/`). PR CI exercises the full validate/plan/dry-run path.

## Assumptions

- **Support-role source of truth (spec-16 ambiguity):** resolved to the narrowest
  spec-16-compliant assumption — a recognized `x-support-role` header claim
  (`support_agent` | `support_admin`) OR an explicit `x-system-override: true` carried by a
  `system`-type actor. This mirrors how peer internal workers resolve actor claims from
  headers and can be tightened to a signed claim later without changing the auth contract.
  No spec proposal filed (does not alter a contract; it is a narrow V1 implementation seam
  explicitly permitted by spec-16 Agent Freedom).
- **Atomicity:** production record path writes the row + appends the audit event inside one
  `executor.transaction(...)` (mirrors membership-worker). The injected-deps unit-test path
  is sequential. Denial audit is best-effort in production (a missing DB must not turn a
  correct 403 into a 500); the denial decision stands regardless.
- **Projections:** deliberately narrow — org exposes `orgId/name/slug/status/memberCount/
  createdAt`; user exposes `userId/email/displayName/status/createdAt`. No secrets, tokens,
  or connection strings.

## Spec Proposals

None.

## Remaining Gaps

- Impersonation / session minting intentionally out of V1 scope (clean seam left; no code).
- No Console support UI (separate later milestone per spec-16).
- Support-role claim is header-carried for V1; tightening to a signed claim is a future
  hardening step behind the same `authorizeSupportAction` contract.

## Next Task Dependencies

- A later milestone may add a Console support surface consuming these internal endpoints.
- Impersonation V2 would build on the `support` context + audit seam established here.
