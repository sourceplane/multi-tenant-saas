# Task 0081 — Implementer Report

**Task**: Gate `handleCreateEnvironment` in `projects-worker` on a `limit.environments` billing entitlement check.
**Branch**: `impl/task-0081-env-billing-gate`
**PR**: https://github.com/sourceplane/multi-tenant-saas/pull/124
**Status**: ✅ Complete — code merged-ready, awaiting verifier.

---

## Summary

Implemented the Task 0079 canonical pattern (`limit.projects` on
`handleCreateProject`) for environments. The change is intentionally
mechanical: same Result types, same fail-closed semantics, same
`x-internal-caller`/header conventions. Only the entitlement key,
deny messages, and the (org, project) scoping of the active count
differ.

## Files changed

| File | Change |
|---|---|
| `packages/db/src/projects/types.ts` | + `countActiveEnvironments(orgId, projectId)` on `ProjectsRepository` interface |
| `packages/db/src/projects/repository.ts` | + parameterized COUNT impl scoped to `org_id + project_id + status='active'`; bigint/string/number coercion; safe error scrubbing |
| `apps/projects-worker/src/billing-client.ts` | Refactored `decideProjectsLimit` to delegate to a private `decideQuantityGate(decision, activeCount, messages)`; added new exported `decideEnvironmentsLimit` with environment-specific deny copy |
| `apps/projects-worker/src/handlers/create-environment.ts` | Full handler rewrite adding billing gate: requires BILLING_WORKER; checks `limit.environments`; per-project count; 412 deny / 503 fail-closed; gate runs after auth/policy and before any UUID/DB write |
| `tests/db/src/projects.test.ts` | + 7 tests for `countActiveEnvironments` (param scoping, numeric/bigint/string/0/NaN coercion, error scrubbing) |
| `tests/projects-worker/src/projects-worker.test.ts` | + 13 tests under `describe("billing entitlement gate (limit.environments)")`; extended `createFakeProjectsRepo` to track `createEnvironmentCalls` |
| `ai/tasks/task-0081.md` | Committed task spec |

## Key design choices

1. **Shared `decideQuantityGate` helper.** Rather than duplicating
   decision logic, `decideProjectsLimit` and `decideEnvironmentsLimit`
   both forward to a private helper that takes a `messages` bundle.
   This keeps quantity semantics (allow when `activeCount < limitValue`,
   deny otherwise) identical and prevents drift if e.g. limit-reached
   semantics change.

2. **Count scoped by (orgId, projectId).** Environment APIs are project-
   scoped by design; the spec confirms the env limit is per-project.
   The new `countActiveEnvironments` takes both ids and the SQL filters
   on both columns.

3. **Gate placement.** After membership + policy `environment.create`
   allow, before parent-project existence check and before any UUID
   generation or DB write. This matches the canonical Task 0079 ordering
   and the test `does not call billing when policy denies` enforces it.

4. **Fail-closed at every boundary.** Missing BILLING_WORKER → 503.
   Billing fetch throws / non-OK / malformed envelope → 503.
   `countActiveEnvironments` failure → 503. Pre-tx executor is disposed
   on every error path.

5. **Public-ID hygiene preserved.** Billing call uses `orgPublicId(orgId)`;
   no raw UUIDs appear in response bodies or event payloads (existing
   tests at `does not expose raw UUIDs in response` / `... in event payload`
   continue to pass).

## Validation

- `pnpm -w typecheck` — all changed packages green. Pre-existing failure
  in `@saas/policy-engine-tests` (missing `@types/node`) is unrelated.
- `pnpm -w test` — 17/17 packages passing.
  - `@saas/db-tests`: 508 tests pass (including 7 new).
  - `@saas/projects-worker-tests`: 170 tests pass (including 13 new).
- `./.workspace/bin/orun validate` — passes.
- `./.workspace/bin/orun plan` — 32 components × 3 envs → 68 jobs, plan
  `b37e811ee9ba`.
- `orun dry-run` — not a real subcommand on this CLI build; skipped.

## Pitfalls hit & resolved

1. **Override-replacement breaks call tracking.** The fake projects
   repo's `createEnvironmentCalls` array is captured by the closure of
   the default `createEnvironment`. When a test overrides
   `createEnvironment`, the new function does not push, so
   `createEnvironmentCalls.length === 0` even on a successful 201. I
   removed two redundant `expect(createEnvironmentCalls.length).toBe(1)`
   assertions on success paths — the 201 status already proves the
   creation ran. Deny-path assertions (`.toBe(0)`) still work because
   the default fake's tracker is used there.

2. **`createEnvironmentCalls` field type.** Adding it to the return
   type required two edits (function signature + repo-literal type
   annotation) — the LSP cache initially showed stale errors after only
   the second edit. Resolved.

## Remaining for verifier

- Code-path inspection of `decideEnvironmentsLimit` parity with
  `decideProjectsLimit` (only message bundle should differ).
- Confirm `countActiveEnvironments` SQL is consistent with how the
  existing archival flow toggles `status` (i.e. archived rows are
  truly excluded).
- After merge: wait for main CI apply, confirm projects-worker
  deploys, smoke `POST /v1/organizations/{org}/projects/{prj}/environments`
  against a quota-bound org to observe 412.
