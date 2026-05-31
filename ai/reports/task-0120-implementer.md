# Task 0120 — Implementer Report

**Task:** Milestone `B5-webhook-delivery-history` — ship the per-endpoint
webhook delivery-history observability surface across all three consumer
surfaces (SDK, Console, CLI). Backend already on main; this is the consumer
legs only.

**Branch:** `impl/task-0120-webhook-delivery-history`
**PR Number:** #175 — https://github.com/sourceplane/multi-tenant-saas/pull/175

## Summary

One combined PR delivering all three consumer surfaces. Orun changed-plan
selects exactly the touched lanes: `sdk`, `web-console-next`,
`web-console-next-tests`, `cli`. No contract/DB/worker/api-edge change — the
existing cursor-paginated surface is consumed as-is.

The single load-bearing architectural fact threaded through every leg: the
webhooks-worker emits its continuation cursor as an **opaque base64 token in
`meta.cursor`** (via `listResponse(data, requestId, cursor)` in
`apps/webhooks-worker/src/http.ts`), NOT in body `nextCursor` (vestigial).
Every consumer reads the cursor from the envelope meta and forwards it
verbatim — never constructed, never parsed.

## Files Changed

### SDK (`packages/sdk`)
- `src/webhooks.ts` — added `ListDeliveryAttemptsQuery` (`limit?`, `cursor?`)
  and `DeliveryAttemptsPage` (`deliveryAttempts`, `nextCursor: string | null`)
  interfaces; threaded `query` onto `listDeliveryAttempts`; added
  `listDeliveryAttemptsPage` (uses `requestWithEnvelope`, returns
  `{ deliveryAttempts, nextCursor: meta.cursor ?? null }`); shared
  `buildDeliveryAttemptsRequest` helper that omits undefined params.
- `src/index.ts` — exported the two new types.
- `src/__tests__/resources.test.ts` — 5 new tests (no-query path, threads
  limit+cursor, omits cursor when only limit, page round-trips
  meta.cursor→nextCursor, page returns null on last page).

### Console (`apps/web-console-next`)
- `src/components/webhooks/delivery-history.ts` — NEW pure helper module
  (status→badge variant, timestamp formatter, `toDeliveryRow` shaper,
  `appendDeliveryPage` cursor-accumulation reducer, `hasMoreDeliveries`,
  `EMPTY_DELIVERY_HISTORY`). Dependency-free (no React/next/DOM) so the
  presentation logic is unit-testable in the logic-only jest harness —
  mirrors the `rotate-flow.ts` / `endpoint-crud.ts` pattern.
- `src/app/(app)/orgs/[orgSlug]/webhooks/[endpointId]/page.tsx` — added the
  `DeliveryHistoryPanel` (status badges, attempt number, HTTP status, safe
  failure reason, completed/next-retry timestamps; loading skeleton;
  EmptyState; cursor-driven Load more). SDK-only via `wrap()` +
  `listDeliveryAttemptsPage` — zero direct `fetch(`.

### CLI (`packages/cli`)
- `src/commands/webhook-deliveries.ts` — NEW `webhook deliveries <endpointId>`
  command. Human table + `--output=json`, `--limit` / `--cursor`, and an
  `--all` cursor-following loop with a seen-cursor pagination-loop guard.
  Pure SDK consumer; `resolveOrgId(ctx, /* allowOverride */ false)` +
  `assertOutputModeValid`; mirrors `audit list` exactly.
- `src/cli-runner.ts` — registered `["webhook", "deliveries"]` + added the
  help usage line.
- `src/__tests__/webhook-deliveries.test.ts` — NEW, 14 tests (human/json
  happy paths, limit/cursor threading, opaque-cursor verbatim, title cursor
  surfacing, `--all` cursor-following + JSON Lines, mutual-exclusion +
  validation usage errors, SDK rejection, no-active-org, help line).

### Test harness plumbing
- `tests/web-console-next/package.json` + `tsconfig.json` — added
  `@saas/contracts` workspace dep + path mapping so the delivery-history
  helper test resolves contract types. Set `composite/incremental: false`
  (matching `tests/billing-worker`) so the logic-only project does not demand
  every contracts source file be listed. `pnpm-lock.yaml` gained the single
  `@saas/contracts` link line.

## Latitude Decisions

1. **One combined PR** rather than three sequenced PRs. Both are sanctioned by
   the Integration Notes; combined keeps the SDK→consumer dependency atomic and
   lets a single changed-plan cover all lanes.
2. **Pure-helper extraction for the Console leg** (`delivery-history.ts`) —
   forced by the logic-only jest harness (`@web-console-next/*` → `src/*.ts`,
   no `.tsx`). The `.tsx` panel is a thin consumer of the tested helper.
3. **CLI modelled on `audit list`** (not the write-command template) — it is
   the established cursor-pagination prior-art, giving `--all` + JSON Lines
   semantics for free and a seen-cursor loop guard.
4. **Dropped the optional `webhook delivery <attemptId>` single-get** — the
   task marks it optional; the milestone value is the list/history surface and
   the SDK `getDeliveryAttempt` already exists for any future need. Kept scope
   tight.
5. **Added `@saas/contracts` to the console test project** — the only test
   package previously lacking the mapper; mirrors the 14 other test packages.

## Gates Run (local, all green)

- `pnpm --filter @saas/sdk typecheck|lint|test` → 0 / 0 / 113 passing.
- `pnpm --filter @saas/cli typecheck|lint|test` → 0 / 0 / 178 passing
  (14 new in `webhook-deliveries.test.ts`).
- `pnpm --filter @saas/web-console-next typecheck|lint` → 0 / 0.
- `pnpm --filter @saas/web-console-next-tests typecheck|lint|test` → 0 / 0 /
  53 passing.
- `kiox -- orun validate --intent intent.yaml` → Intent is valid / all
  validation passed.
- `kiox -- orun plan --changed --intent intent.yaml --output plan.json` →
  `4 components × 3 envs → 10 jobs`, mode changed-only, components
  `cli, sdk, web-console-next, web-console-next-tests`.
- `kiox -- orun run --plan plan.json --dry-run --runner github-actions` →
  10 jobs preview, all lanes resolve (web-console-next carries Verify+deploy).
- `kiox.lock` reset with `git checkout` post-plan; `plan.json` removed (and is
  gitignored) — not committed.

## Grep-clean

- No `as any` / `as unknown as` / `@ts-ignore` / `@ts-expect-error` /
  `eslint-disable` / `fetch(` in production source.
- No `secret` / `payload` / raw-body references in the delivery-history helper
  or CLI command; the panel renders only status, attempt metadata, and a safe
  failure reason — never a secret, raw response body, or full event payload.
- No replay/redeliver action on any surface (explicit non-goal).

## Handoff to Verifier

- web-console-next is a deploy-gated component: PR-CI runs `Verify`; the
  `deploy` + smoke + live-URL probe of the endpoint detail page runs only on
  **post-merge main CI**. Per `references/post-merge-deploy-profile-gap.md` the
  Console leg is NOT done off PR-CI alone — wait for the main-CI deploy.
- BEHIND-main rebase before merge is the verifier's responsibility (recurring
  0103–0119 pattern) — not pre-rebased here.
- Merge order if splitting attention: SDK is the dependency; Console + CLI
  consume it. In one combined PR they merge atomically.

## PR Number

#175 — https://github.com/sourceplane/multi-tenant-saas/pull/175
