# Task 0103 — Implementer Report

## Summary

- Added 13th resource client `AuthClient` to `@saas/sdk` covering the 6
  identity-worker public-auth methods (`loginStart`, `loginComplete`,
  `getSession`, `logout`, `getProfile`, `updateProfile`).
- Wired onto `Sourceplane` as `readonly auth: AuthClient`, sharing the same
  `Transport` instance every other resource client uses.
- Re-exported the auth contract types from `packages/sdk/src/index.ts`
  (LoginStart/Complete/Session/Logout/Profile/UpdateProfile/AuthUser) so
  consumers don't need to import `@saas/contracts` directly — same pattern
  used for membership, projects, billing, etc.
- 17 new `it()` blocks in `packages/sdk/src/__tests__/auth.test.ts`
  covering URL shape, HTTP verbs, body serialization, idempotency-key
  passthrough + non-auto-generation, typed-error decoding
  (Unauthenticated/Validation/RateLimit/Internal), and
  caller-supplied `x-request-id` forwarding.
- All gates green; SDK total 106 tests (89 baseline + 17), repo-wide
  typecheck/lint clean, orun validate/plan/run --dry-run clean,
  `packages/sdk/component.yaml` byte-identical vs main.

## Files Changed

`packages/sdk/src/`
- NEW `auth.ts` — `AuthClient` class, 6 methods, all routed through
  `transport.request<T>` (envelope-aware, no `fetchImpl` reach-around).
- MODIFIED `index.ts` — import + property on `Sourceplane`,
  `client.auth = new AuthClient(this.transport)`, `AuthClient` re-export,
  contract type re-exports for the auth subpath.

`packages/sdk/src/__tests__/`
- NEW `auth.test.ts` — 17 `it()` blocks following the
  `environments.test.ts` shape (capturing fetch impl, envelope helper,
  error-response helper).

No diff in: `packages/sdk/src/transport.ts`, other resource clients,
`packages/contracts/**`, `packages/cli/**`, `apps/**`,
`packages/sdk/component.yaml`.

## Checks Run

| Command | Result |
|---|---|
| `pnpm --filter @saas/sdk typecheck` | exit 0 |
| `pnpm --filter @saas/sdk lint` | exit 0 (0 warnings on new files) |
| `pnpm --filter @saas/sdk test` | exit 0; 106 passed (89 → 106) |
| `pnpm --filter @saas/sdk build` | exit 0 |
| `pnpm -r typecheck` | exit 0 across all 38 workspaces |
| `pnpm -r --no-bail lint` | 45 warnings, all in `tests/api-edge` (Task 0096f territory unchanged; SDK contributes 0) |
| Hazard scan `auth.ts` + `auth.test.ts` | 0 hits on `eslint-disable` / `@ts-ignore` / `@ts-expect-error` / `as unknown as` / `as any` / `node:` |
| `kiox -- orun validate --intent intent.yaml` | exit 0 (`✓ All validation passed`) |
| `kiox -- orun plan --changed --intent intent.yaml --output plan.json` | exit 0 (`1 components × 3 envs → 3 jobs`, components: `sdk`) |
| `kiox -- orun run --plan plan.json --dry-run --runner github-actions` | exit 0 (3/3 ✓: sdk · {dev,stage,prod} · Verify) |
| `git diff main -- packages/sdk/component.yaml` | empty (byte-identical) |

## Assumptions

- **Caller-owned idempotency-key, never auto-generated.** Mirrors Task
  0102 (EnvironmentsClient) and the documented Stripe parity. All three
  POSTs (`loginStart`, `loginComplete`, `logout`) accept
  `opts.idempotencyKey` and forward it verbatim if present, omit
  otherwise. Two tests pin this both ways (passthrough + null when
  omitted).
- **`/v1/auth/profile` is GET on read, PATCH on update**, per
  `auth-facade.ts:15` (`new Set(["GET", "PATCH"])`). `updateProfile`
  uses `method: "PATCH"`; `getProfile` uses `method: "GET"`.
- **Internal/admin auth routes intentionally excluded.**
  `/v1/auth/resolve` (service-binding bearer resolution) is internal —
  not exposed on `AuthClient`. `/v1/auth/security-events` already lives
  on `SecurityEventsClient` (Task 0099) — not duplicated.
- **All 6 auth contract types exist in `@saas/contracts/auth`** —
  including `UpdateProfileRequest` and `ProfileResponse` — so no spec
  proposal was required (per Required Outcomes §contingency). Types
  imported directly from `@saas/contracts/auth`; no inline widening.
- **Logout has no body.** The transport only sets `content-type:
  application/json` + serializes a body when `input.body !== undefined`,
  so a POST with no body sends no body — matches the wire shape edge
  expects on `/v1/auth/logout`. Test asserts `init.body` is `undefined`.

## Spec Proposals

None. All 6 method signatures map cleanly to existing
`@saas/contracts/auth` types.

## Remaining Gaps

- **Task 0104 — U10 Console SDK refactor** is now unblocked. The
  console can drop its bespoke `apps/web-console-next/src/lib/api.ts`
  and consume `client.auth.*` exclusively at the 5 known call sites
  (`loginStart`, `loginComplete`, `getSession`, `logout`, `getProfile`)
  plus the new `updateProfile` capability. Pure consumer-side swap.
- **CLI auth flow** still uses the hand-rolled token-paste flow.
  Migrating it onto `client.auth.*` is parked per Task 0103
  Non-Goals — can be picked up in a future task once the SDK shape is
  proven via the console refactor.

## Next Task Dependencies

- Task 0104 (U10 — Console-as-SDK-client): unblocked. The 6 methods
  added here cover the full auth surface the console exercises.

## PR Number

PR Number: TBD (will be filled in after `gh pr create`)
