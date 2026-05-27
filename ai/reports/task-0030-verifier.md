# Task 0030 — Verifier Report

## Result: PASS (with verifier fix)

PR #71 is approved for merge after one critical fact-mapping fix was applied.

## PR Number and Merge Status

- **PR:** #71 — `feat: add membership-owned internal authorization-context seam`
- **Branch:** `codex/task-0030-membership-auth-context` → `main`
- **Merge status:** Approved, not yet merged
- **Verifier fix commit:** `44547d5` (pushed to PR branch)
- **PR CI (updated head):** Run `26392691908` — 12/12 checks pass

## Checks Run

All 8 local checks passed.

| Command | Result |
|---------|--------|
| `git diff --check` | clean |
| `pnpm --filter @saas/contracts typecheck` | pass |
| `pnpm --filter @saas/contracts-tests test` | 36 pass |
| `pnpm --filter @saas/membership-worker typecheck` | pass |
| `pnpm --filter @saas/membership-worker-tests test` | 182 pass |
| `pnpm --filter @saas/membership-worker build` | dry-run pass |
| `orun validate --intent intent.yaml` | pass |
| `orun plan --changed --intent intent.yaml --output plan.json` | 5 components × 3 envs → 11 jobs |
| `orun run --plan plan.json --dry-run --runner github-actions` | 11 jobs OK |
| `gh pr checks 71` | 12/12 pass (run 26392691908) |

## Scope and PR Hygiene

- PR #71 changes only task-scoped files:
  - `packages/contracts/src/policy.ts` — added `AuthorizationContextRequest`, `AuthorizationContextResponse`
  - `apps/membership-worker/src/membership-facts.ts` — new shared `mapRoleAssignmentsToFacts` helper
  - `apps/membership-worker/src/policy-client.ts` — refactored to delegate to shared helper; keeps `mapRoleAssignments` export
  - `apps/membership-worker/src/handlers/authorization-context.ts` — new internal route handler
  - `apps/membership-worker/src/router.ts` — wired `/v1/internal/membership/authorization-context`
  - `tests/contracts/src/policy.test.ts` — 6 new contract type tests
  - `tests/membership-worker/src/authorization-context.test.ts` — 16 new handler tests + fact-mapping tests
  - `ai/reports/task-0030-implementer.md` — implementer report
- No `projects-worker`, api-edge forwarding, policy-engine changes, migrations, Terraform, Wrangler resource changes, Cloudflare/Supabase/AWS resources, README, UI, SDK, CLI, or `specs-v2/**` changes.
- No ignored generated outputs staged or committed.

## Verification Findings

### 1. Contract surface — PASS

- `@saas/contracts/policy` exports `AuthorizationContextRequest` (with `subject: PolicySubject` and `orgId: string`) and `AuthorizationContextResponse` (with `memberships: MembershipFact[]`).
- No raw DB row shapes, role-assignment IDs, member IDs, persistence helpers, or runtime code.
- Existing policy contract types (`AuthorizationRequest`, `AuthorizationResponse`, `EffectivePermissionsRequest`, etc.) are unchanged.
- Policy-worker tests continue to work.

### 2. Internal route behavior — PASS

- `POST /v1/internal/membership/authorization-context` is served by membership-worker.
- It is routed BEFORE the `/v1/organizations/...` routes and there is no api-edge forwarding (confirmed: zero matches for `authorization-context` or `/v1/internal` in `apps/api-edge/src/org-facade.ts`).
- Malformed JSON → 422 `validation_failed`.
- Missing/invalid `subject.type` → 422 `validation_failed` (validated against `["user", "service_principal", "workflow", "system"]`).
- Missing `subject.id` or empty → 422 `validation_failed`.
- Missing `orgId` or empty → 422 `validation_failed`.
- Unsupported methods (e.g. GET) → 405 `unsupported`.
- Missing `SOURCEPLANE_DB` → 503 `internal_error` without attempting a query.
- Repository failures → 500 safe internal error.
- SQL executor is disposed in the `finally` block.
- The route does NOT call `policy-worker` — it only returns membership facts.

### 3. Fact mapping — PASS (with critical fix)

#### CRITICAL FIX: Project-scoped assignment without scopeRef

**`apps/membership-worker/src/membership-facts.ts`** (line 7-8)

**Before fix:**
```typescript
ra.scopeKind === "project" && ra.scopeRef
  ? { kind: "project", orgId, projectId: ra.scopeRef }
  : { kind: "organization", orgId }
```

When `scopeKind === "project"` but `scopeRef` was null/undefined (malformed or corrupted data), the AND condition failed and the fallthrough produced an **organization-scoped fact**. This could widen access by converting a broken project role into an org role.

**After fix:**
```typescript
ra.scopeKind === "project"
  ? { kind: "project", orgId, ...(ra.scopeRef ? { projectId: ra.scopeRef } : {}) }
  : { kind: "organization", orgId }
```

When `scopeKind === "project"` and `scopeRef` is present: `{ kind: "project", orgId, projectId }` (unchanged).
When `scopeKind === "project"` and `scopeRef` is null: `{ kind: "project", orgId }` — still a project-scoped fact, which policy will deny for both org-scoped actions (scope mismatch) and project-scoped actions (missing projectId).
When `scopeKind === "organization"`: `{ kind: "organization", orgId }` (unchanged).

The pre-existing test that asserted `scope.kind === "organization"` for this case was updated to assert `scope.kind === "project"` and `projectId === undefined`.

#### Other mapping behavior
- Organization-scoped assignments → `{ kind: "role_assignment", role, scope: { kind: "organization", orgId } }`
- Project-scoped with valid scopeRef → `{ kind: "role_assignment", role, scope: { kind: "project", orgId, projectId } }`
- No inactive/revoked assignments are returned (repository query filters `revoked_at IS NULL`).
- Response never includes role-assignment IDs, member IDs, subjectId, or raw DB timestamps.

#### Helper extraction
- `mapRoleAssignmentsToFacts` in `membership-facts.ts` is the single source of truth.
- `policy-client.ts` `authorizeViaPolicy` delegates to the shared helper via a thin `mapRoleAssignments` pass-through.
- Existing `mapRoleAssignments` export preserved for test compatibility.
- All existing 166 membership-worker tests (handlers, policy-client, pagination, invitations, member admin) remain green.

### 4. Privacy and boundary checks — PASS

- api-edge does not forward `/v1/internal/membership/authorization-context` (zero matches in `org-facade.ts`).
- `membership-worker` wrangler config unchanged — stage/prod remain `workers_dev: false`.
- No bearer tokens, session tokens, invitation tokens, token hashes, SQL, connection details, or stack traces in responses.
- Route is an internal service-binding seam only.

### 5. Regression coverage — PASS

- All existing 166 public route tests in `membership-worker.test.ts` remain green.
- Policy-gated public routes (org read, member list, invitations, member admin) continue working.
- Contract tests cover the new types without regressions.

### 6. Orun and CI evidence — PASS

- Orun changed plan: 5 components × 3 envs → 11 jobs (contracts, contracts-tests, membership-worker, membership-worker-tests, policy-worker).
- No unexpected migration, db-migrate, api-edge deploy, or infrastructure jobs.
- PR CI run `26392691908` (after verifier fix) — all 12 checks pass.

## Verifier Fix

One fix applied in commit `44547d5`:

**`apps/membership-worker/src/membership-facts.ts`** — Changed the scope mapping from `ra.scopeKind === "project" && ra.scopeRef` (AND condition with unsafe fallthrough) to `ra.scopeKind === "project"` (independent scopeKind check with conditional projectId). This prevents a malformed project-scoped assignment from being treated as organization-scoped, which could widen access.

Test updated to match: `authorization-context.test.ts` — changed from asserting `scope.kind === "organization"` to `scope.kind === "project"` with `projectId` undefined.

## Risk Notes

1. **No authentication on internal route** — The route accepts requests from any same-environment service-binding caller without checking actor headers. This is intentional: the route is not exposed through api-edge, and future domain workers (e.g. projects-worker) will use it via service bindings. The route returns membership facts (not sensitive credentials), so the risk is limited to internal worker-to-worker communication.

2. **No rate-limiting on internal route** — Acceptable for internal-only service-binding use.

3. **`TenancyRole` cast** — The `mapRoleAssignmentsToFacts` helper uses `ra.role as TenancyRole`, which could theoretically pass an unknown role string from the DB to the fact output. In practice, role strings are validated at creation time by the repository's `ON CONFLICT` pattern and the policy-worker request validation catches malformed roles at authorization time. Low risk.

## Spec Proposals

None.

## Recommended Next Move

**Merge PR #71** — all verification criteria are satisfied after the fact-mapping fix:

1. Scope and PR hygiene: PASS
2. Contract surface: PASS
3. Internal route behavior: PASS
4. Fact mapping: PASS (1 critical fix)
5. Privacy and boundary: PASS
6. Regression coverage: PASS
7. Orun and CI: PASS

After merge, sync local `main` to the merge commit, confirm the post-merge main CI run starts, and leave `ai/state.json` and compact context ready for the Orchestrator to select the next projects-worker slice.

Note: This PR intentionally does not scaffold `projects-worker`. That task should add the `MEMBERSHIP_WORKER` service binding and use this seam to obtain membership facts before calling `policy-worker`.