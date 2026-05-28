# Task 0050 — Implementer Report

## Summary

- Reconciled the V1 public API-key administration contract across four spec files
- Replaced stale `/v1/auth/api-keys` with tenant-scoped `/v1/organizations/{orgId}/api-keys` routes
- Replaced project-scoped api-keys path with org-scoped in edge-api and api-guidelines
- Documented bounded-context ownership: identity (credentials/events), membership (role bindings), policy (authorization)
- Defined V1 create/list/revoke semantics including one-time secret return, hash-only persistence, security events, and audit expectations

## Files Changed

- `specs/components/01-edge-api.md` — route group updated from project-scoped to org-scoped
- `specs/components/02-identity.md` — major rewrite of API-key section: auth routes separated from API-key admin routes, V1 administration contract added, example envelope updated
- `specs/components/04-organizations-membership.md` — clarifying note on SP role binding ownership
- `specs/contracts/api-guidelines.md` — preferred nested scope example updated

## Checks Run

```
git diff --stat -- specs ai/reports ai/proposals
# 4 files changed, 104 insertions(+), 9 deletions(-)

rg -n 'auth/api-keys|organizations/{orgId}/projects/{projectId}/api-keys|organizations/{orgId}/api-keys' specs
# All references consistently use /v1/organizations/{orgId}/api-keys
# /v1/auth/api-keys appears only as "must not be used" deprecation note

git diff --stat -- apps packages
# (empty — no runtime changes)
```

## Accepted Contract Decisions

1. V1 public API-key admin routes are org-scoped: `GET/POST/DELETE /v1/organizations/{orgId}/api-keys[/{apiKeyId}]`
2. `/v1/auth/api-keys` is explicitly deprecated and must not be used
3. Project scope is a request-body attribute, not a path segment for V1
4. Identity owns keys/SPs/security events; membership owns role bindings; policy owns authz
5. Create returns raw secret exactly once; persistence is hash-only; list never returns secrets
6. Create may provision backing SP and initial binding as an orchestration detail
7. Create/revoke emit identity security events and org-scoped audit copies

## Spec Proposals

None. No incompatibilities were discovered with the accepted direction.

## Remaining Gaps

- The runtime implementation of these routes (api-edge routing, identity-worker handlers, membership orchestration) is deferred to the next task
- `@saas/contracts` TypeScript types for the API-key admin surface are not yet defined
- Web console API-key management screens are not yet built

## Next Task Dependencies

- Runtime implementation task: add `POST/GET/DELETE /v1/organizations/{orgId}/api-keys` handlers to api-edge and identity-worker, with membership orchestration for SP role bindings
- Requires identity-worker to gain a MEMBERSHIP_WORKER service binding for cross-context orchestration

## PR Number

93
