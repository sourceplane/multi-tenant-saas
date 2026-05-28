# Task 0049 — Implementer Report

## Summary

Added the membership/policy foundation for service-principal role bindings so `service_principal` actors authenticated by Task 0048 can participate in the existing authorization pipeline. This PR introduces a narrow, internal-only membership seam for creating, listing, and revoking service-principal role bindings, plus the minimal policy action surface (`organization.service_principal.binding.{create,list,revoke}`) needed to protect that seam. No public API-key administration routes were added.

## Files Changed

| File | Change |
|------|--------|
| packages/contracts/src/policy.ts | Added 3 SP binding actions to `ORGANIZATION_ACTIONS` |
| packages/contracts/src/service-principal.ts | NEW — `isServicePrincipalSubjectId`, `servicePrincipalSubjectId`, `parseServicePrincipalSubjectId` helpers |
| packages/contracts/package.json | Added `./service-principal` export map entry |
| packages/policy-engine/src/index.ts | SP binding actions in owner/admin role permissions + `ALL_KNOWN_ACTIONS` |
| apps/membership-worker/src/handlers/service-principal-bindings.ts | NEW — create/list/revoke handlers with DI support |
| apps/membership-worker/src/router.ts | Wired 3 internal SP binding routes |
| tests/policy-engine/src/policy-engine.test.ts | 15 new SP action access-control tests + owner permission count fix |
| tests/membership-worker/src/service-principal-bindings.test.ts | NEW — 30+ handler/validation/routing tests |

## Checks Run

```
tests/policy-engine:        141 passed, 1 suite
tests/policy-worker:          20 passed, 1 suite
tests/membership-worker:    212 passed, 3 suites

orun validate --intent intent.yaml        → ✓ All validation passed
orun plan --changed --intent intent.yaml  → 6 components × 3 envs → 14 jobs
orun run --plan plan.json --dry-run       → 14 selected, all ✓
```

## Internal Route / Policy Surface

Three internal-only routes (not exposed through api-edge):

- `POST /v1/internal/membership/service-principal-bindings` — create a role binding for a `service_principal` subject
- `GET  /v1/internal/membership/service-principal-bindings?orgId=X&subjectId=Y` — list active bindings
- `DELETE /v1/internal/membership/service-principal-bindings/:bindingId?orgId=X` — revoke a binding

Policy actions added:
- `organization.service_principal.binding.create` — owner, admin only
- `organization.service_principal.binding.list` — owner, admin only
- `organization.service_principal.binding.revoke` — owner, admin only

Deny-by-default: builder, viewer, billing_admin, and all project-scoped roles are denied these actions.

## Subject-ID Compatibility

The canonical service-principal subject-ID shape is `sp_<hex32>` where `<hex32>` is the service-principal UUID with dashes removed. This matches the `x-actor-subject-id` value forwarded by api-edge for Task 0048-authenticated `service_principal` actors.

Shared helpers in `@saas/contracts/service-principal` prevent ID-shape drift:
- `isServicePrincipalSubjectId(id)` — validates the `sp_<hex32>` regex
- `servicePrincipalSubjectId(uuid)` — builds from raw UUID
- `parseServicePrincipalSubjectId(id)` — extracts hex or null

The membership handlers validate inbound `subjectId` against this shape and reject malformed IDs with 422.

## Assumptions

1. The internal seam does not require its own policy-gated authorization check (it is called by other workers, not by external users through api-edge). Public API-key admin routes in the follow-on task will policy-gate via the new actions.
2. `service_principal` subjects use organization-scoped and project-scoped roles from the same role taxonomy as human users (owner, admin, builder, viewer, billing_admin, project_admin, project_builder, project_viewer).
3. The existing `listRoleAssignments` repository method returns all assignments (including revoked) and the handler filters to active-only.

## Spec Proposals

None. The action naming (`organization.service_principal.binding.*`) follows the established `organization.*` pattern and is consistent with `specs/contracts/tenancy-and-rbac.md` requirements that API keys and service principals are bound to an organization and role set.

## Remaining Gaps

- The internal seam has no caller-authorization check (no policy-worker call inside the handlers). The follow-on public admin routes should call the policy-worker with the new actions before invoking the seam.
- No event/audit writes for binding create/revoke mutations. The follow-on task should wire `service_principal.binding.created` and `service_principal.binding.revoked` events.
- No public API-key administration surface yet.

## Next Task Dependencies

The follow-on task (public API-key / service-principal administration) should:
1. Add identity-worker orchestration that calls this internal membership seam when creating/revoking API keys.
2. Add api-edge routes for `GET/POST/DELETE /v1/organizations/{orgId}/api-keys`.
3. Wire policy-gated authorization using the new `organization.service_principal.binding.*` actions.
4. Add event/audit writes for binding mutations.

## PR Number

PR #92 — https://github.com/sourceplane/multi-tenant-saas/pull/92
