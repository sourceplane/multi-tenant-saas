# Task 0094 Implementer Report

**Task:** Edge idempotency-key contract (B3, partial)
**Branch:** `impl/task-0094-edge-idempotency-contract`
**PR Number:** TBD

## Summary

- Added a reusable `parseIdempotencyKey` validator + `IDEMPOTENCY_KEY_HEADER`
  constant to `packages/contracts/src/idempotency.ts` (Stripe-style: ASCII
  printable U+0020..U+007E, 1..255 chars, non-empty after trim) and re-exported
  it from the contracts barrel + `package.json` `exports`.
- Added a thin edge wrapper at `apps/api-edge/src/idempotency.ts` exporting
  `validateIdempotencyKey(request, requestId)` that no-ops on safe methods
  (GET/HEAD), no-ops on absent headers, and returns a 400 `validation_failed`
  with `details: { header, reason }` on present-but-malformed unsafe-method
  requests.
- Wired the edge helper into all seven facades listed in the task brief
  (auth, org, project, metering, config, webhooks, billing) — each call sits
  immediately after the existing 405 method-gating and before any
  `resolveActor`/`fetch` so the gate runs before the downstream worker is
  ever invoked.
- New tests: 16 contract-level unit tests (`tests/contracts/src/idempotency.test.ts`)
  and 9 edge-integration tests covering two facades (`tests/api-edge/src/idempotency-edge.test.ts`).
- `ai/context/open-risks.md` updated to record that malformed-key rejection now
  happens at the edge, while durable replay (the actual dedup) remains a Task
  0095 follow-up.

## Files Changed

### contracts
- `packages/contracts/src/idempotency.ts` (NEW)
- `packages/contracts/src/index.ts` (re-export)
- `packages/contracts/package.json` (add `./idempotency` to `exports`)

### api-edge
- `apps/api-edge/src/idempotency.ts` (NEW — edge helper)
- `apps/api-edge/src/auth-facade.ts` (call gate)
- `apps/api-edge/src/org-facade.ts` (call gate)
- `apps/api-edge/src/project-facade.ts` (call gate)
- `apps/api-edge/src/metering-facade.ts` (call gate)
- `apps/api-edge/src/config-facade.ts` (call gate)
- `apps/api-edge/src/webhooks-facade.ts` (call gate)
- `apps/api-edge/src/billing-facade.ts` (call gate; safe-method-only today,
  but plumbed so future unsafe routes inherit the gate without re-edits)

### tests
- `tests/contracts/src/idempotency.test.ts` (NEW — 16 unit tests)
- `tests/api-edge/src/idempotency-edge.test.ts` (NEW — 9 integration tests
  across auth-facade and org-facade)

### docs
- `ai/context/open-risks.md` (update lines 83–92 to reflect partial closure
  + Task 0095 handoff)
- `ai/reports/task-0094-implementer.md` (this file)

## Checks Run

| Command | Exit |
| --- | --- |
| `pnpm -r typecheck` | 0 |
| `pnpm -r --no-bail lint` | 0 (warnings only, all pre-existing) |
| `pnpm --filter @saas/contracts-tests test` | 0 (94 passed, incl. 16 new) |
| `pnpm --filter @saas/api-edge-tests test` | 0 (270 passed, incl. 9 new) |
| `kiox -- orun validate --intent intent.yaml` | 0 (`✓ Intent is valid`) |
| `kiox -- orun plan --changed --intent intent.yaml --output plan.json` | 0 (4 components × 3 envs → 8 jobs) |
| `kiox -- orun run --plan plan.json --dry-run --runner github-actions` | 0 (8 jobs preview ✓) |

## Architect-Brief Latitude Decisions

- **Validator shape:** `parseIdempotencyKey(value: string | null | undefined): { ok: true; key: string | null } | { ok: false; reason: string }`. Tagged-union return so call sites can branch without try/catch; `null`/`undefined` collapse to `{ ok: true, key: null }` so an absent header is not a parse error.
- **Regex / charset:** ASCII printable only (`/^[\x20-\x7e]+$/`) after trimming; max 255 chars (Stripe-compatible). Rejects CR/LF (header-injection vector), null bytes, non-ASCII (including emoji and accented chars), and DEL.
- **Error code name:** `validation_failed` from existing `ERROR_CODES` in `packages/contracts/src/errors.ts`. No new code minted; the per-reason discriminator (`empty` / `too_long` / `illegal_characters`) lives in `details.reason` so the stable error-code surface stays small.
- **Helper location:** `apps/api-edge/src/idempotency.ts` (parses + builds errorResponse). The pure parser stays in `@saas/contracts/idempotency` so Task 0095's worker-side replay store can import it without taking a dependency on the edge or on `errorResponse`.
- **Header spelling in error messages:** canonical `Idempotency-Key` (Stripe spelling) regardless of the case-insensitive `Headers.get("idempotency-key")` lookup.
- **Test layout:** contract-level unit tests live with the package (`tests/contracts/src/idempotency.test.ts`); cross-cutting edge integration tests live in a single new `tests/api-edge/src/idempotency-edge.test.ts` rather than threading idempotency cases through every facade test file.

## Assumptions

- `validation_failed` is the right code for a malformed inbound header; the existing `errors.ts` surface treats malformed inputs as validation rather than `bad_request`.
- The `details` object is an acceptable place for stable machine-readable reason strings; the existing `errorResponse(...)` helper already accepts `details: Record<string, unknown>`.
- `billing-facade` currently accepts only GETs, so `validateIdempotencyKey` is a no-op there today. It was wired anyway because the task lists billing in the in-scope facade set and because doing so makes any future unsafe billing route inherit the gate without a follow-up edit.
- The Web `Headers` constructor rejects literal CR/LF in header values, so the `illegal_characters` reason is exercised in contract-level unit tests rather than through a Request round-trip in the edge integration suite. The `too_long` and `empty` reasons round-trip fine and are covered at both layers.

## Spec Proposals

None — the task scope was fully achievable inside the brief's stated latitude.

## Remaining Gaps

- **Durable replay** (the actual dedup behavior) is **not** in this PR. A duplicate POST with a *valid* `Idempotency-Key` still produces two pending invitations. That is Task 0095, which will likely use Cloudflare KV with TTL keyed on `(orgId, idempotencyKey, route)` and import `parseIdempotencyKey` from this PR's contract.
- **Required-key enforcement** on specific routes (e.g. `POST /v1/organizations/{orgId}/invitations`) is deferred to the B4 SDK rollout. Today the header stays optional everywhere.
- **Per-org / per-identity rate limiting** (the second half of B3) is unaddressed; tracked as Task 0096.

## Next Task Dependencies

Task 0095 (durable edge replay) should:
1. Import `{ parseIdempotencyKey, IDEMPOTENCY_KEY_HEADER }` from `@saas/contracts/idempotency` — already exported.
2. Call `parseIdempotencyKey` *after* `resolveActor` (so the org binding is known) and key the replay record on `(orgId, parsedKey, route)`.
3. Keep the edge-side `validateIdempotencyKey` gate in place; the replay layer composes on top of it (malformed → 400 before any storage I/O).
4. Decide replay storage (KV / DO / Postgres) when scoping; the contract is storage-agnostic.

## PR Number

TBD — will be filled in after `gh pr create` runs.
