# Task 0060 — Implementer Report

## Summary

Hardened config-worker PATCH item routes to enforce full route scope matching. Previously, item-level update routes only passed `orgId` and `itemId` to handlers, meaning a project-scoped setting could be updated through an organization-scoped URL (same-org alias). Now the router parses the complete `Scope` (kind + orgId + projectId + environmentId) from the URL path and handlers verify the stored row's scope exactly matches before proceeding with authorization or mutation.

## Files Changed

| File | Change |
|------|--------|
| `apps/config-worker/src/scope-match.ts` | **New** — `scopeMatchesRequested()` helper shared by both update handlers |
| `apps/config-worker/src/router.ts` | `matchItemRoute()` now returns full `Scope` instead of bare `orgId`; parses projectId/environmentId from project/environment item routes |
| `apps/config-worker/src/handlers/update-setting.ts` | Signature changed from `orgId: string` to `requestedScope: Scope`; scope match check added before authorization in both transactional and deps paths |
| `apps/config-worker/src/handlers/update-feature-flag.ts` | Same scope enforcement pattern as update-setting |
| `tests/config-worker/src/mutation-handlers.test.ts` | Updated existing tests to pass `Scope`; added 10 new scope-mismatch negative tests (5 settings + 5 flags) |

## Checks Run

```
pnpm --filter @saas/config-worker-tests test → 106 passed
pnpm --filter @saas/api-edge-tests test → 223 passed
orun validate --intent intent.yaml → ✓ All validation passed
orun component --intent intent.yaml --long → All components discovered
orun plan --changed --intent intent.yaml → 4 components × 3 envs → 10 jobs (config-worker, config-worker-tests, membership-worker, policy-worker)
orun run --plan plan.json --dry-run --runner github-actions → 10 selected, all ✓
```

## Assumptions

- The `scopeMatchesRequested` helper checks that org-scoped rows have null projectId/environmentId, project-scoped rows have null environmentId with matching projectId, and environment-scoped rows match both projectId and environmentId. This is sufficient given the existing DB schema invariants.
- api-edge forwarding is unaffected since it passes through the full URL path unchanged to config-worker.
- No database migration needed — scope enforcement is purely handler-side logic comparing stored row fields against route-parsed scope.

## Spec Proposals

None.

## Remaining Gaps

- Create routes already receive full `Scope` from the collection route matcher and are unaffected.
- Secret metadata routes are read-only and not in scope for this hardening.
- The transactional path's scope check runs inside the transaction alongside authz/mutation; the deps (test) path does a separate getSetting/getFeatureFlag call for scope verification. Both paths produce identical 404 behavior on mismatch.

## Next Task Dependencies

- Web-console mutation UI (config create/update forms) can now safely target scoped PATCH routes knowing scope aliasing is blocked.
- Secret create/rotate/revoke routes (future task) should follow the same scope-match pattern.

## PR Number

PR #103
