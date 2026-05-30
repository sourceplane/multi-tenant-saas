# Task 0096b — Implementer Report

Branch: `impl/task-0096b-tests-membership-worker-class-b`
Base: `main` @ `6f1e65d`
PR Number: #[PR]

## Summary

- Eliminated all 350 `@typescript-eslint/no-explicit-any` warnings inside
  `tests/membership-worker/src` (4 of 5 files needed edits; `authorization-context.test.ts`
  was already at 0).
- Replaced `any` with real exported types from `@saas/contracts`, `@saas/db/membership`,
  `@saas/db/events`, and `apps/membership-worker/src/**` wherever those types existed; only
  three small in-file structural types were introduced (`JsonResp` envelope and friends,
  inlined `NotificationsClientContext`, and a fabricated-decision overload for the
  malformed-limit branch).
- Behaviour preserved: 5 test suites / 244 tests pass before and after; suite ordering and
  `it()` titles unchanged.
- No `eslint-disable*`, `@ts-ignore`, `@ts-expect-error`, or `as unknown as` were introduced
  by the diff (hazard scan empty).
- `pnpm -r typecheck` and the workspace test suite remain green; `pnpm -r --no-bail lint`
  drops from 627 → 277 residual warnings, all in other `tests/**` workspaces (apps-source 0
  invariant from Task 0096 preserved).

## Files Changed

| File | Before | After |
| --- | --- | --- |
| `tests/membership-worker/src/membership-worker.test.ts` | 305 | 0 |
| `tests/membership-worker/src/create-invitation-notifications.test.ts` | 20 | 0 |
| `tests/membership-worker/src/accept-invitation-notifications.test.ts` | 16 | 0 |
| `tests/membership-worker/src/service-principal-bindings.test.ts` | 9 | 0 |
| `tests/membership-worker/src/authorization-context.test.ts` | 0 | 0 |
| **Total** | **350** | **0** |

`git diff --stat origin/main` — only files under `tests/membership-worker/src/**` plus this
report.

## Checks Run

```
$ pnpm --filter @saas/membership-worker-tests lint
exit 0  →  0 warnings   (was 350)

$ pnpm --filter @saas/membership-worker-tests test
exit 0  →  Test Suites: 5 passed, 5 total
           Tests:       244 passed, 244 total
           (unchanged vs main @ d2187f1: 5 suites / 244 tests)

$ pnpm --filter @saas/membership-worker-tests exec tsc --noEmit
exit 0  →  no errors

$ pnpm -r typecheck
exit 0  →  all packages clean

$ pnpm -r --no-bail lint
exit 0  →  277 problems (0 errors, 277 warnings) across:
            tests/config-worker     126
            tests/identity-worker    80
            tests/api-edge           45
            tests/projects-worker    10
            tests/events-worker       7
            tests/policy-engine       7
            tests/webhooks-worker     1
            tests/policy-worker       1
            (apps-source still 0 — Task 0096 invariant holds)
```

## Hazard Scan

```
$ git diff origin/main -- 'tests/membership-worker/**' \
    | grep -E '^\+.*(eslint-disable|@ts-(ignore|expect-error)|as unknown as)'
(no output)
```

## Type Sources Used

Real types imported (no in-workspace `_types.ts` was needed):

- `@saas/contracts/billing` → `CheckBillingEntitlementResponse` (drives the
  `BillingEntitlementResult` decision slot at the entitlement-gate call sites).
- `@saas/db/membership` → `AcceptInvitationInput`, `CreateInvitationInput`,
  `CreateRoleAssignmentInput`, `MembershipResult`, `OrganizationInvitation`
  (added; `RoleAssignment`, `Organization`, `OrganizationMember`, `MembershipRepository`
  already imported).
- `@saas/db/events` → `AppendEventWithAuditInput` (typing `appendedInput`/`appendedInputs`
  capture variables on every `eventsRepo` stub) and `StoredEvent`/`StoredAuditEntry`
  (placeholders inside `value: { event, audit }` returns from those stubs).
- `apps/membership-worker/src/env` (alias `@membership-worker/env`) → `Env`
  (annotation on every literal-typed env block; replaces `env as any` at every fetch site).
- `apps/membership-worker/src/billing-client` (alias `@membership-worker/billing-client`)
  → `typeof checkBillingEntitlement` (the entitlement-gate dependency-injection slot;
  used to type `checkEntitlement` stubs and the `makeBillingDecision` helper).

Three small structural types added inline (no new files, no exported package types):

1. `JsonResp` (and its `MemberView`, `InvitationView`, `MembershipView`, `DeliveryView`,
   `RoleEntry`, `ErrorDetailFields` companions) — applied uniformly at every
   `await response.json() as JsonResp` site. Required fields match the union of properties
   the suite reads, so call sites can chain `json.data.invitation.id` etc. without `!`
   gymnastics. Same envelope `{ data, error, meta }` shape that the worker actually
   returns; the precise per-handler DTOs live in `apps/membership-worker/src/handlers/**`
   and were intentionally not duplicated here.
2. `CapturedPolicyBody` — narrow `{ action; resource: { kind; id; orgId } }` for the
   single `policyFetcher` mock that captures and reads the policy-worker request body.
3. `NotificationsClientContext` — inlined four-field structural type in
   `accept-invitation-notifications.test.ts` and `create-invitation-notifications.test.ts`.
   `@saas/notifications-client` is intentionally not a dependency of the
   `tests/membership-worker` package; inlining matches Task 0096's "minimal-touch" pattern
   and avoids a new package edge.

## Assumptions

`as <RealType>` casts introduced (each one a value provably a superset of the target):

1. `as JsonResp` at every `await response.json()` site (52 occurrences). The runtime is a
   parsed `unknown` (Fetch API typing). The cast narrows to the structural envelope every
   handler returns; subsequent reads only touch fields the corresponding handler is known
   to populate in its success/error branches.
2. `as typeof checkBillingEntitlement` on the `(async () => …) ` wrapper inside
   `makeBillingDecision` and on the inline `(async (binding, …) => …)` capture stub. The
   wrapper takes the same arguments and returns `Promise<BillingEntitlementResult>`, so it
   is a structural superset.
3. `as CheckBillingEntitlementResponse` inside `makeBillingDecision`'s wrapper, on a
   helper-supplied decision shape. The helper signature accepts the contract type plus a
   single fabricated overload (boolean `valueType` + boolean `limitValue`) that exercises
   the gate's `malformed_limit` branch — the test's whole point is to send a shape the
   contract rejects. This single, narrow widening replaces what was previously
   `as any` * 9.
4. `as Env` on `{} as Env` placeholder env arguments to `handleCreateOrganization` (10
   sites). The handler does not read those fields in the bootstrap path under test; the
   cast preserves that intent without `any`.
5. `as { action: string }` on `(captured.value).action` reads (3 sites) where the test
   captures a policy-worker request body that was JSON-serialized from a known shape.
6. `as { action; resource; subject; context }` on `policyCapture.value` reads (2 sites)
   for the same reason in handler suites that assert on more fields.
7. `as StoredEvent` / `as StoredAuditEntry` on `{}` placeholders inside `eventsRepo` stub
   return values (49 sites). The test only reads `event.type`, `event.payload.*`,
   `event.orgId`, `event.subjectId`, `event.subjectKind` — all populated explicitly when
   the test cares; `{}` stands in for the rest.

Index-access `!` (matches existing codebase style under `noUncheckedIndexedAccess`):
applied to `appendedInput`, `appendedInputs[N]`, `capturedInput`, `capturedBody`,
`json.data.members[N]`, `json.data.invitations[N]`, and `repo._capturedInput` after they
were narrowed away from `any`. No null/undefined assertions on values that are runtime-
nullable per contract — only on capture variables that the surrounding `expect` call
asserts have been written.

`} as any` casts on `eventsRepo` literal initializers: dropped (55 occurrences). The
literals already structurally satisfy `Pick<EventsRepository, "appendEventWithAudit">`
once `appendEventWithAudit` is typed.

`POLICY_WORKER: undefined` field: removed (1 site) — `exactOptionalPropertyTypes` rejects
explicit `undefined` for a non-`undefined`-typed optional. Omitting the key preserves the
"no policy fetcher available" semantic.

## Spec Proposals

None.

## Remaining Gaps

277 class-B warnings remain across other `tests/**` workspaces (roadmap pointers for
subsequent waves):

| Workspace | Warnings |
| --- | --- |
| `tests/config-worker` | 126 |
| `tests/identity-worker` | 80 |
| `tests/api-edge` | 45 *(coupled to PR #143 surface — wait until Track A merges)* |
| `tests/projects-worker` | 10 |
| `tests/events-worker` | 7 |
| `tests/policy-engine` | 7 |
| `tests/webhooks-worker` | 1 |
| `tests/policy-worker` | 1 |

Apps-source warnings remain at 0 (Task 0096 invariant).

## Next Task Dependencies

None. Task 0097 is independent and gated only on Track A.

## PR Number

#[PR]
