# Task 0018 — Verifier Report

## Result

PASS

## Checks

| Check | Result |
|-------|--------|
| PR #59 exists, not draft, mergeable, based on `main` | Pass |
| PR CI run `26360963260` (final head `312047d`) — 8/8 jobs green | Pass |
| `pnpm --filter @saas/membership-worker typecheck` | Pass |
| `pnpm --filter @saas/membership-worker-tests test` — 33/33 | Pass |
| `pnpm --filter @saas/membership-worker build` | Pass |
| `pnpm --filter @saas/policy-worker typecheck` | Pass |
| `pnpm --filter @saas/policy-worker-tests test` — 20/20 | Pass |
| `orun validate --intent intent.yaml` | Pass |
| `orun plan --changed` — 3 components × 3 envs → 7 jobs | Pass |
| `orun run --dry-run --runner github-actions` — 7 jobs selected | Pass |
| `git diff --check` | Pass |
| PR squash-merged as `43f68c4` on `main` | Pass |
| Post-merge main CI run `26361054065` — 8/8 jobs green | Pass |
| No secrets or generated artifacts committed | Pass |
| No policy-worker/policy-engine internals imported | Pass |
| `workers_dev: false` preserved for stage/prod | Pass |
| `SOURCEPLANE_DB` Hyperdrive bindings preserved | Pass |
| `POLICY_WORKER` stage→policy-worker-stage, prod→policy-worker-prod | Pass |
| No stage/prod cross-binding | Pass |
| `component.yaml` dependsOn edge validates with Orun | Pass |
| Policy client calls POST /v1/internal/policy/authorize | Pass |
| JSON content-type and x-request-id headers sent | Pass |
| No raw bearer tokens forwarded | Pass |
| Policy client parses actual `{ data, meta }` envelope | Pass (verifier fix) |
| Errors/non-OK/malformed/missing-data all fail closed | Pass |
| No internal names, stack traces, role facts, or DB UUIDs leaked | Pass |
| Role assignments map to V1 `role_assignment` facts correctly | Pass |
| Org-read authorizes via policy action `organization.read` | Pass |
| Denial returns `not_found` (no enumeration) | Pass |
| Missing POLICY_WORKER fails closed with 503 | Pass |
| Repository role-list failure fails closed with `not_found` | Pass |
| POST /v1/organizations unchanged (bootstrap path) | Pass |
| GET /v1/organizations unchanged (subject query) | Pass |
| Public IDs remain opaque (org_ prefix) | Pass |
| Tests cover envelope parsing, fact mapping, allow/deny, failure modes | Pass |
| Local `main` synced and clean | Pass |

## Issues

### Critical — Fixed by Verifier

**Policy-worker envelope parsing mismatch.**

The policy-worker's `successResponse()` wraps the `AuthorizationResponse`
under `{ data: { allow, ... }, meta: { requestId, cursor } }`. The
implementer's policy-client checked for `allow` at the top level of the
JSON response. In production, every authorization call would have failed
closed even when policy allowed access (response has `data` and `meta`
keys, not `allow`).

Fix: changed `policy-client.ts` to unwrap `parsed.data` before checking
`data.allow`. Updated all test fakes to return the real envelope shape.
Added a focused test for repository role-list failure and another for
missing `data` field. 33 tests pass after fix.

Commit: `312047d` on `codex/task-0018-membership-policy-binding`.

## Risk Notes

- Live Cloudflare deployment configuration cannot be independently verified
  via API from this environment (no Cloudflare API token available). The
  post-merge CI deploy verification jobs for membership-worker stage/prod
  both passed, which confirms the Wrangler config was accepted by the deploy
  pipeline. This is sufficient evidence for PASS given the deployment model.
- No live smoke test through api-edge was performed for org-read
  authorization. The test suite exercises the authorization seam thoroughly
  with envelope-shaped fakes. A live smoke test would require a valid bearer
  token session, which is outside the scope of this verifier run.

## Spec Proposals

None.

## Recommended Next Move

Generate Task 0019 for invitation management endpoints, leveraging the
verified `PolicyAuthorizer` seam. The membership-to-policy binding is now
proven correct and deployed.

---

## Merge Evidence

- PR: https://github.com/sourceplane/multi-tenant-saas/pull/59
- Merge commit: `43f68c4`
- Post-merge main CI run: `26361054065` (success, 8/8 jobs)
- PR CI run (final head): `26360963260` (success, 8/8 jobs)
- Final head commit: `312047d`
- Branch: `codex/task-0018-membership-policy-binding`
- Local `main` synced to `43f68c4`
