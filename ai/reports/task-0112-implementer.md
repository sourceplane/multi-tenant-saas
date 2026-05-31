# Task 0112 — Implementer Report

**Branch:** `impl/task-0112-console-webhook-endpoint-crud`
**PR:** https://github.com/sourceplane/multi-tenant-saas/pull/167
**Status:** Implementation complete locally, ready for verifier review.

## Summary

- Wired the full webhook-endpoint CRUD surface into the org-scoped
  console: create-endpoint dialog launched from a new "New endpoint"
  button (and the empty-state CTA, replacing the "use the API or CLI"
  placeholder), edit-endpoint dialog (rename / re-target URL / edit
  description) on the detail page, disable-endpoint dialog with optional
  reason, and a delete-endpoint dialog gated by typed-URL confirmation.
- Re-enable is **not** shippable through the existing SDK/contract surface
  (`UpdateWebhookEndpointRequest` only accepts `{ url?, name?, description? }`,
  no `enableEndpoint(...)` method exists, no worker route inverts
  `POST /disable`). The detail page hides the re-enable control and
  renders an inline notice when `status === "disabled"` pointing at
  `/ai/proposals/task-0112-spec-update.md`. The proposal recommends a
  symmetric `POST /enable` route in a follow-on task.
- All form validation lives in a pure helper module
  (`apps/web-console-next/src/components/webhooks/endpoint-crud.ts`):
  URL parse + http(s) check, bounded-string rules, diff-only PATCH
  builder, typed-confirm gate, idempotency-key generator with
  `crypto.randomUUID` preferred and a documented `idem-<ts>-<rand>`
  fallback (no inline `Math.random()`). 22 jest cases cover this module
  in `tests/web-console-next/src/endpoint-crud.test.ts`, lifting the
  workspace floor by **+22 cases** (well above the +6 minimum).
- Idempotency-Key on `createEndpoint` is generated per submission and
  passed via the SDK's `RequestOptions.idempotencyKey` channel.
- All mutations route through `wrap()`; `precondition_failed` envelopes
  surface via the existing `<PreconditionInsight />` component; other
  errors via `useToast`. No raw API envelope strings are rendered.
- No primitives outside `@/components/ui/*` were introduced. No SDK,
  contract, api-edge, webhooks-worker, infra, or test-tooling files were
  touched (verified via `git diff --stat`).

## Files Changed (grouped by subsystem)

### Console pages

- `apps/web-console-next/src/app/(app)/orgs/[orgSlug]/webhooks/page.tsx`
  — Added "New endpoint" button in the page header; replaced the
  placeholder empty-state copy with a primary "Create endpoint" CTA;
  wired `CreateEndpointDialog`; route-pushes to the new endpoint's
  detail page on success.
- `apps/web-console-next/src/app/(app)/orgs/[orgSlug]/webhooks/[endpointId]/page.tsx`
  — Added Edit / Disable / Delete action buttons; wired three new
  dialogs; on disable the list reloads, on delete the user is routed
  back to `/orgs/:orgSlug/webhooks`. Added an inline notice card for
  the re-enable gap when `status === "disabled"`.

### Console webhook components (all new)

- `apps/web-console-next/src/components/webhooks/endpoint-crud.ts`
  — Pure helpers (no React, no DOM): URL validation, bounded-string
  rules, `buildUpdatePatch`, `confirmDeleteMatches`, `generateIdempotencyKey`.
- `apps/web-console-next/src/components/webhooks/create-endpoint-dialog.tsx`
  — ZodForm + `wrap()` + idempotency-key + `<PreconditionInsight />`.
- `apps/web-console-next/src/components/webhooks/edit-endpoint-dialog.tsx`
  — ZodForm + diff-only PATCH (no-op submissions are short-circuited
  with a "Nothing to update" toast, no network call).
- `apps/web-console-next/src/components/webhooks/disable-endpoint-dialog.tsx`
  — Single-line reason input bounded at 280 chars, destructive button.
- `apps/web-console-next/src/components/webhooks/delete-endpoint-dialog.tsx`
  — Typed-URL confirm gate; mirrors `rotate-secret-dialog` density.

### Tests

- `tests/web-console-next/src/endpoint-crud.test.ts` (new) — 22 jest
  cases across 5 describe blocks.
- `tests/web-console-next/tsconfig.json` — added the new helper module
  to the test project's `include` list (mirrors how `rotate-flow.ts`
  was wired).

### Proposals

- `ai/proposals/task-0112-spec-update.md` (new) — re-enable surface gap
  + recommended follow-on task.

### Reports

- `ai/reports/task-0112-implementer.md` — this file.

## Checks Run

| Command | Result |
| --- | --- |
| `kiox -- orun validate --intent intent.yaml` | ✓ Intent is valid; All validation passed |
| `kiox -- orun plan --changed --intent intent.yaml --output /tmp/plan-0112.json` | ✓ 2 components × 3 envs → 4 jobs (web-console-next, web-console-next-tests) |
| `kiox -- orun run --plan /tmp/plan-0112.json --dry-run --runner github-actions` | ✓ 4/4 jobs simulate successfully |
| `pnpm -w typecheck` | ✓ 44 successful, 44 total (cached + uncached) |
| `pnpm --filter @saas/web-console-next typecheck` | ✓ tsc clean |
| `pnpm --filter @saas/web-console-next lint` | ✓ no warnings |
| `pnpm --filter @saas/web-console-next-tests typecheck` | ✓ tsc clean |
| `pnpm --filter @saas/web-console-next-tests lint` | ✓ no warnings |
| `pnpm --filter @saas/web-console-next-tests test` | ✓ **40 passed** (18 prior + 22 new) |

## Assumptions

- **Test harness deviation.** Task 0112's brief calls for "vitest cases"
  in a co-located `apps/web-console-next/src/**/__tests__/` directory.
  The repo as it stands has no vitest harness configured for
  `@saas/web-console-next` (no `vitest.config.*`, no `test` script in
  the app's `package.json`). The canonical pattern in this repo is
  `tests/web-console-next/` — a sibling jest workspace with its own
  `component.yaml` + `tsconfig.json` that imports app source via the
  `@web-console-next/*` path alias. `tests/web-console-next/src/rotate-flow.test.ts`
  is the prior-art exemplar. I followed that pattern: dropped tests in
  the existing harness, extended its `tsconfig.json` `include` list to
  pick up the new pure helper module. This is durable and matches every
  other pure-logic test in the workspace; if vitest is wanted under
  `apps/`, it should be a separate scaffolding task that converts
  `rotate-flow.test.ts` at the same time.
- **Re-enable contract reality** (also captured in the spec proposal):
  `UpdateWebhookEndpointRequest` does not accept a status flip and there
  is no `enableEndpoint` SDK method. The console hides the re-enable
  control rather than fabricating one. See
  `/ai/proposals/task-0112-spec-update.md`.
- **Empty-state primary action.** Used the existing `EmptyState`
  primitive's `primaryAction` slot (a `Button` underneath). No new UI
  primitive was introduced.

## Spec Proposals

- `/ai/proposals/task-0112-spec-update.md` — Webhook endpoint re-enable
  surface (contract + SDK + worker route). Reason: re-enable cannot
  ship inside Task 0112's PR boundary; the console gracefully degrades
  with an inline notice in the meantime.

### Design-latitude rationale (one-liners)

- **Dialog over drawer for create/edit/disable/delete:** matches the
  invitations exemplar (`invitations/page.tsx`) which is the canonical
  shape for create-flows in this app, and matches `rotate-secret-dialog.tsx`
  density on the destructive side.
- **Idempotency-Key on create only:** the four other mutations
  (`update`, `disable`, `delete`) are inherently idempotent at the
  resource level (PATCH with a diff, DELETE, single-status flip) and
  the SDK signatures don't ask for it; create is the one surface where
  retry can produce a duplicate row.
- **Diff-only PATCH on edit + "Nothing to update" toast:** prevents
  surprise PATCH-with-empty-body calls when the operator opens edit
  and clicks Save without changing anything; keeps the audit log clean.
- **Typed-confirm gate uses URL, not name:** the URL is always present
  and unique enough to be a paste target; `name` is optional and may
  be empty.
- **Re-enable hidden behind an inline notice card** (rather than a
  disabled button): a disabled button with no recovery path is worse
  UX than an explicit "this is a known gap, here's how to recover"
  message that points at the proposal.
- **Optimistic-vs-reload strategy: reload.** Mirrors the invitations
  page (`invs.reload()`) and the existing rotate-secret flow
  (`endpoints.reload()`). Optimistic updates would have to thread the
  PATCH response into the cached list — overkill for a list of
  endpoints that's typically <20 rows.

## Remaining Gaps (carried forward, not blockers)

- **Project-scoped endpoint creation UX** (`createProjectEndpoint`).
  The SDK method exists; the console has no project-scoped webhooks
  page. Future task.
- **Subscriptions UX** (list / create / delete).
- **Delivery-attempts UX** (per-endpoint retry inspector).
- **Audit-log UX** (separate top-level surface).
- **`cross-reads.ts:resolveOrgId` housekeeping fold** — explicitly
  excluded by Task 0112; one-line rename for a follow-on.
- **Re-enable surface** — see the spec proposal above.

## PR

**#167** — https://github.com/sourceplane/multi-tenant-saas/pull/167
