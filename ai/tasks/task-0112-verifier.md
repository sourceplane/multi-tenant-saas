# Task 0112 — Verifier

Agent: Verifier

## Current Repo Context

- **Implementer pass:** Task 0112 (PR #167) wires the full
  webhook-endpoint CRUD surface into the org-scoped Console:
  create-endpoint dialog (launched from a new "New endpoint" button
  AND replacing the empty-state placeholder CTA), edit-endpoint
  dialog (rename / re-target URL / edit description), disable-endpoint
  dialog with optional reason, and delete-endpoint destructive
  typed-URL confirm. Re-enable is **intentionally hidden** behind an
  inline notice card because the existing
  `UpdateWebhookEndpointRequest` contract has no `status` flip and the
  worker exposes no `/enable` route — that gap is captured in
  `ai/proposals/task-0112-spec-update.md` (recommended follow-on
  Task 0113).
- **PR:** #167 OPEN, MERGEABLE, mergeStateStatus CLEAN.
  Branch: `impl/task-0112-console-webhook-endpoint-crud`.
  HEAD: `2e9bdb0` (single implementer commit).
  Base: `c683f4f` (Task 0111 verifier-PASS bookkeeping on top of
  `da9810f` = PR #166 squash for Task 0111).
- **PR-CI on HEAD `2e9bdb0`:** run `26707949013`, **5/5 SUCCESS** —
  `plan` + `web-console-next · {dev,stage,prod} · Verify deploy`
  + `web-console-next-tests · dev · Verify`. Note the
  `cloudflare-pages-turbo` shape: PR-CI runs the **verify** profile
  (build + typecheck + lint + bundle), the actual **deploy + smoke**
  steps fire only on the post-merge main-CI run. Per
  `references/post-merge-deploy-profile-gap.md` you MUST wait for
  post-merge main-CI to complete and curl the live URL before
  declaring PASS.
- **Implementer report:** `ai/reports/task-0112-implementer.md` is
  on the PR branch (no Task 0106-style fix-up needed).
- **Diff shape:** 12 files, +1745/-15. Code-only delta is bounded to
  `apps/web-console-next/src/app/(app)/orgs/[orgSlug]/webhooks/**`
  + `apps/web-console-next/src/components/webhooks/**` +
  `tests/web-console-next/src/endpoint-crud.test.ts` +
  `tests/web-console-next/tsconfig.json` (the `include` extension
  needed to pull in the new pure helper module). The remaining
  +deltas are the impl report, the spec proposal, and the task
  prompt itself.
- **Sealed snapshot main:** `da9810f` (Task 0111 squash; the
  bookkeeping commit `c683f4f` only touches state files, not source).
- **Implementer harness deviation (documented assumption):** the
  Task 0112 brief asked for vitest co-located under
  `apps/web-console-next/src/**/__tests__/`. The repo today has no
  vitest harness configured for `@saas/web-console-next` (no
  `vitest.config.*`, no `test` script in the app's `package.json`).
  The canonical exemplar is the sibling jest workspace
  `tests/web-console-next/` (with `rotate-flow.test.ts` as
  prior-art). Implementer followed the prior-art pattern. Verifier
  must accept this as a documented deviation — converting to vitest
  is its own scaffolding task.
- **Vitest/jest baseline:** `pnpm --filter @saas/web-console-next-tests test`
  reported `40 passed` (18 prior + 22 new in `endpoint-crud.test.ts`).
  Floor expectation: ≥40 passed (well above the +6 cases minimum).
- **Re-enable contract gap:** the proposal at
  `/ai/proposals/task-0112-spec-update.md` is in scope as a Spec
  Proposal artifact. Verifier accepts the proposal as the documented
  trade-off; it should NOT block PASS.

## Objective

Independently verify PR #167 against Task 0112's PR-Boundary,
Constraints, Acceptance Criteria, Architect Brief failure-modes, and
the Implementer Latitude Statement. Confirm the diff stays inside the
allowlisted directories, that no out-of-scope file was touched, that
no hazard-suppressing syntax was introduced, that all mutations
route through `wrap()` with `<PreconditionInsight />` for
`precondition_failed`, that no signing-secret material renders
outside the existing reveal-once dialog, that the destructive-delete
gate is typed-URL-confirmation, that idempotency-key is propagated
on create only, that PR-CI lanes ran and passed, and — per the
deploy-gated component shape — that post-merge main-CI is 4/4
SUCCESS AND the live console URL serves the updated empty-state
copy. PASS → squash-merge, fast-forward main, post-merge main-CI
watch, live-URL curl, bookkeeping commit. FAIL → leave PR open with
clear blockers.

## PR Boundary

The PR must touch **only** files under these paths:

1. `apps/web-console-next/src/app/(app)/orgs/[orgSlug]/webhooks/page.tsx`
   — modified (New-endpoint button + empty-state CTA + dialog wiring)
2. `apps/web-console-next/src/app/(app)/orgs/[orgSlug]/webhooks/[endpointId]/page.tsx`
   — modified (Edit / Disable / Delete buttons + dialogs + disabled-state notice)
3. `apps/web-console-next/src/components/webhooks/endpoint-crud.ts`
   — NEW (pure helpers: URL validation, bounded-string rules,
   `buildUpdatePatch`, `confirmDeleteMatches`, `generateIdempotencyKey`)
4. `apps/web-console-next/src/components/webhooks/create-endpoint-dialog.tsx`
   — NEW
5. `apps/web-console-next/src/components/webhooks/edit-endpoint-dialog.tsx`
   — NEW
6. `apps/web-console-next/src/components/webhooks/disable-endpoint-dialog.tsx`
   — NEW
7. `apps/web-console-next/src/components/webhooks/delete-endpoint-dialog.tsx`
   — NEW
8. `tests/web-console-next/src/endpoint-crud.test.ts` — NEW (22 cases)
9. `tests/web-console-next/tsconfig.json` — minimal `include` extension
   to compile the new pure helper module
10. `ai/tasks/task-0112.md` — task prompt (already on branch)
11. `ai/reports/task-0112-implementer.md` — NEW
12. `ai/proposals/task-0112-spec-update.md` — NEW

## Forbidden Zones (auto-FAIL on any hit)

Any diff under any of these paths fails the PR boundary:

- `packages/contracts/**`
- `packages/sdk/**`
- `packages/db/**`
- `packages/cli/**`
- `packages/webhook-verifier/**`
- `apps/api-edge/**`
- `apps/webhooks-worker/**`
- `apps/web-console-next/src/components/ui/**`
  (no new primitives this PR)
- `apps/web-console-next/src/components/webhooks/rotate-secret-dialog.tsx`
  and `apps/web-console-next/src/components/webhooks/rotate-flow.ts`
  (reveal-once flow is byte-equivalent — Tasks 0109/0110 lineage)
- `apps/web-console-next/src/lib/**`
- `apps/web-console-next/src/components/shell/**`
- `infra/**`, `tooling/**`, `stack-tectonic/**`
- `kiox.lock`, `pnpm-lock.yaml`, root `package.json`, any
  `apps/web-console-next/package.json`
- Any other `tests/**` file (only `tests/web-console-next/src/endpoint-crud.test.ts`
  and the minimal `tsconfig.json` include extension are allowed)

## Verifier Phases

### Phase 0 — Working dir + PR readiness

```bash
cd /Users/irinelinson/sourceplane/multi-tenant-saas
git fetch origin
git checkout main
git pull --ff-only origin main
gh pr checkout 167
git log --oneline -5
gh pr view 167 --json mergeStateStatus,mergeable,headRefOid,baseRefOid,changedFiles,additions,deletions
ls ai/reports/task-0112-implementer.md ai/proposals/task-0112-spec-update.md
```

Expect: `mergeStateStatus: CLEAN`, `mergeable: MERGEABLE`,
`headRefOid: 2e9bdb0...`. Implementer report and proposal both
present on the PR branch (no fix-up commit needed).

### Phase 1 — PR sanity + scope-clean (file allowlist)

```bash
gh pr diff 167 --name-only | sort
```

Expect EXACTLY the 12 paths in the PR Boundary above. Then run the
forbidden-zone scans — every one must return zero hits:

```bash
gh pr diff 167 --name-only | rg '^packages/(contracts|sdk|db|cli|webhook-verifier)/'
gh pr diff 167 --name-only | rg '^apps/(api-edge|webhooks-worker)/'
gh pr diff 167 --name-only | rg '^apps/web-console-next/src/components/ui/'
gh pr diff 167 --name-only | rg 'rotate-secret-dialog|rotate-flow'
gh pr diff 167 --name-only | rg '^apps/web-console-next/src/lib/'
gh pr diff 167 --name-only | rg '^apps/web-console-next/src/components/shell/'
gh pr diff 167 --name-only | rg '^(infra|tooling|stack-tectonic)/'
gh pr diff 167 --name-only | rg '(kiox\.lock|pnpm-lock\.yaml|package\.json)$'
```

Each command MUST emit nothing. If any does, FAIL with the offending
path.

### Phase 2 — Hazard + boundary scan (read the actual diff)

Run inside the PR-checkout working tree (NOT against `gh pr diff`'s
output stream — read the source files):

```bash
# No new hazard-suppressing syntax in production source under the diff
rg -n '@ts-ignore|@ts-expect-error|eslint-disable|as any|as unknown as' \
   apps/web-console-next/src/app/\(app\)/orgs/\[orgSlug\]/webhooks/ \
   apps/web-console-next/src/components/webhooks/

# No raw fetch calls (must go through SDK + wrap())
rg -n 'fetch\(' \
   apps/web-console-next/src/app/\(app\)/orgs/\[orgSlug\]/webhooks/ \
   apps/web-console-next/src/components/webhooks/

# No signing-secret rendering outside the reveal-once dialog
rg -n 'whsec_|signingSecret|response\.secret|endpoint\.secret' \
   apps/web-console-next/src/components/webhooks/create-endpoint-dialog.tsx \
   apps/web-console-next/src/components/webhooks/edit-endpoint-dialog.tsx \
   apps/web-console-next/src/components/webhooks/disable-endpoint-dialog.tsx \
   apps/web-console-next/src/components/webhooks/delete-endpoint-dialog.tsx

# No Math.random() inline (idempotency-key must use crypto.randomUUID
# or the documented helper fallback per Constraint #5)
rg -n 'Math\.random\(' apps/web-console-next/src/components/webhooks/endpoint-crud.ts
```

The signing-secret scan: the only acceptable hits are documentation
COMMENTS pointing the user at the existing rotate-secret flow
(e.g., the `create-endpoint-dialog.tsx:88` and
`edit-endpoint-dialog.tsx:84` comments noted in the implementer
report). No actual secret rendering. Verifier must read the lines
and confirm.

Behaviour audit (read the source, not just grep):

- `create-endpoint-dialog.tsx`: passes `opts.idempotencyKey` to
  `client.webhooks.createEndpoint(...)`. Idempotency-key is
  generated via `generateIdempotencyKey()` from `endpoint-crud.ts`,
  which prefers `crypto.randomUUID()` and falls back to a
  documented `idem-<ts>-<rand>` shape (no inline `Math.random`).
- `edit-endpoint-dialog.tsx`: builds a diff-only PATCH via
  `buildUpdatePatch(...)`; if the diff is empty, short-circuits
  with a "Nothing to update" toast and does NOT call the SDK. No
  Idempotency-Key (PATCH is inherently idempotent at the resource
  level — implementer rationale accepted).
- `disable-endpoint-dialog.tsx`: calls
  `client.webhooks.disableEndpoint(orgId, endpointId, { reason? })`
  via `wrap()`. Reason field is optional, bounded at 280 chars
  (read the zod schema).
- `delete-endpoint-dialog.tsx`: typed-confirm gate matches the
  endpoint URL exactly via `confirmDeleteMatches(...)`. Submit is
  disabled until the typed value matches. On success, routes back
  to `/orgs/:orgSlug/webhooks`.
- All four dialogs use `ZodForm` from `@/components/ui/zod-form` and
  surface `precondition_failed` envelopes via
  `<PreconditionInsight />`.
- Detail page (`[endpointId]/page.tsx`): when `status === "disabled"`,
  renders an inline notice card pointing at
  `/ai/proposals/task-0112-spec-update.md`. NO re-enable button is
  rendered (Constraint compliance — no fabricated SDK call).
- List page (`page.tsx`): empty-state placeholder string ("Use the
  API or CLI to create one — UI creation is coming in a follow-up.")
  is REMOVED. Replaced with a primary "Create endpoint" CTA.

### Phase 3 — Quality gates (local)

```bash
# Workspace-wide install (must be clean)
pnpm install --frozen-lockfile

# Workspace typecheck
pnpm -w typecheck

# App + tests-workspace gates
pnpm --filter @saas/web-console-next typecheck
pnpm --filter @saas/web-console-next lint
pnpm --filter @saas/web-console-next-tests typecheck
pnpm --filter @saas/web-console-next-tests lint
pnpm --filter @saas/web-console-next-tests test
```

Expected:

- `pnpm install` clean (no lockfile drift since the lockfile is
  forbidden-zone).
- Workspace typecheck: 0 errors across all 44 workspaces (cached or
  uncached — the implementer report claims 44/44 successful).
- `@saas/web-console-next` typecheck/lint: 0 errors / 0 warnings
  (no warnings is implementer-claimed; tolerate the existing
  baseline if it's nonzero on main and the delta is zero).
- `@saas/web-console-next-tests` test: ≥ **40 passed** (18 prior +
  22 new = 22-case delta, well above the +6 floor required by the
  task prompt).

If any gate fails, FAIL the PR with the exact command + error.

### Phase 4 — Orun gates

```bash
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
```

Expect:

- `orun validate` → "Intent is valid; All validation passed".
- `orun plan --changed` → selects EXACTLY 2 components × envs
  → 4 jobs total: `web-console-next · {dev,stage,prod} · Verify deploy`
  + `web-console-next-tests · dev · Verify`. **NO other component
  pulled in** (no sdk / contracts / api-edge / webhooks-worker /
  cli / db / webhook-verifier / notifications-* / terraform). If
  Orun pulls in any unrelated component, FAIL with the unexpected
  selection list.
- `orun run --dry-run` → all 4 jobs simulate `success` in 0.0s.

### Phase 5 — PR-CI log evidence (per-lane, not just summary)

```bash
gh run view 26707949013 --log | rg -i 'Run orun run|web-console-next' | head -80
gh run view 26707949013 --log-failed || true   # should be empty
```

Inspect each lane's `▶ Verify` block to confirm the actual
typecheck / lint / build / test commands ran (don't trust just
`gh pr checks` "pass" labels). Five lanes expected:

- `plan` (id: `78712685295`)
- `web-console-next · dev · Verify deploy` (`78712699867`)
- `web-console-next · stage · Verify deploy` (`78712699875`)
- `web-console-next · prod · Verify deploy` (`78712699872`)
- `web-console-next-tests · dev · Verify` (`78712699868`)

If any lane shows `steps … failed` or skipped the test step, FAIL.

### Phase 6 — Squash merge

```bash
# Re-confirm CLEAN and 5/5 still SUCCESS at the moment of merge
gh pr view 167 --json mergeStateStatus,mergeable,headRefOid
gh pr checks 167

# If BEHIND-main pattern recurs (it has on Tasks 0103-0111):
gh pr update-branch 167
# Then watch the fresh PR-CI run, expect 5/5 SUCCESS, then merge.

gh pr merge 167 --squash --delete-branch

# Sync local main
git checkout main
git pull --ff-only origin main
git log --oneline -1
```

Squash merge ONLY (no merge commit, no rebase merge). If
mergeStateStatus flips to BEHIND, run `gh pr update-branch 167`
and wait for the fresh PR-CI run before merging.

### Phase 6.5 — **Post-merge main-CI watch + live-URL evidence (deploy-gated)**

`web-console-next` is a `cloudflare-pages-turbo` component. PR-CI
runs the `verify` profile only — the **deploy + smoke** lanes run
ONLY on the post-merge main-CI workflow. Per
`references/post-merge-deploy-profile-gap.md`, this verification is
mandatory; do NOT mark PASS until both checks below succeed.

```bash
# Wait for the post-merge main-CI run triggered by the squash merge
gh run list --workflow main.yml --branch main --limit 5
# Pick the most recent run at the squash SHA, then:
gh run watch <run-id>
gh run view <run-id> --json conclusion,jobs --jq '.jobs[] | "\(.name): \(.conclusion)"'
```

Expect: 4/4 SUCCESS — `plan` + `web-console-next · {dev,stage,prod} · Deploy`
(or whatever the deploy lanes are named in the post-merge workflow,
typically the same stem with `Deploy` profile).

Live-URL curl (mandatory; this is what catches the OpenNext white-page
class of regression — see
`references/opennext-cloudflare-pages-deployment-shape.md`):

```bash
# Stage Pages deployment (or whichever env is the canonical buyer-facing
# console smoke target — match the rotate-secret task pattern)
curl -sS -L -o /tmp/console.html https://<stage-pages-url>/orgs/<any-test-org>/webhooks
# Confirm the new empty-state CTA copy is rendered:
rg -i 'New endpoint|Create endpoint' /tmp/console.html
# Confirm the OLD placeholder copy is GONE:
rg -i 'use the API or CLI to create one' /tmp/console.html
```

The first rg MUST emit at least one hit; the second MUST emit zero.
If the live page 404s or returns the old empty-state copy, FAIL
(post-merge) — the merge stays but the verifier report flags the
regression and a hot-fix follow-up gets scoped immediately.

If you cannot resolve the canonical live-URL target from the existing
state files (look at `ai/context/decisions.md` and prior verifier
reports for `web-console-next` — Tasks 0082-0096 set the precedent),
record the pages.dev URL you tested, and document the choice in the
verifier report.

### Phase 7 — Verifier report

Save to `ai/reports/task-0112-verifier.md` with these sections:

```markdown
# Task 0112 — Verifier Report

**Result:** PASS | FAIL
**PR:** #167
**Squash SHA:** <sha>
**Verified at:** <ISO timestamp>

## Checks

- Phase 0 readiness: <evidence>
- Phase 1 PR sanity + forbidden-zone scans: <evidence>
- Phase 2 hazard + behaviour audit: <evidence, including
  signing-secret scan results, idempotency-key path, typed-delete
  gate, disabled-state notice card>
- Phase 3 quality gates: <exact commands + counts>
- Phase 4 orun gates: <validate / plan-changed selection / dry-run>
- Phase 5 PR-CI log evidence: <per-lane evidence with run + job IDs>
- Phase 6 squash merge: <update-branch needed yes/no, squash SHA>
- Phase 6.5 post-merge main-CI + live-URL: <run-id, lane conclusions,
  curl response evidence — copy/CTA rendered, old placeholder gone>

## Issues

- <none / list>

## Risk Notes

- Re-enable surface gap accepted as documented Spec Proposal at
  `/ai/proposals/task-0112-spec-update.md`. Console gracefully
  degrades with an inline notice card. Recommended follow-on:
  Task 0113 (contract + SDK + worker route + console wiring).
- Test-harness deviation: implementer used the existing
  `tests/web-console-next/` jest workspace instead of a
  not-yet-scaffolded vitest harness under `apps/`. Accepted —
  matches `rotate-flow.test.ts` prior-art. Vitest scaffolding is
  its own future task.
- <any other risk-noted-forward items>

## Spec Proposals

- `/ai/proposals/task-0112-spec-update.md` — re-enable surface
  (re-noted, NOT a blocker).

## Recommended Next Move

- <PASS path: pick from current.md candidate slate; recommended:
  Task 0113 = re-enable surface follow-on, OR console
  delivery-attempts UX, OR B7 audit-log UX, OR B8 admin-worker
  scaffold, OR cross-reads.ts:resolveOrgId housekeeping fold.>
```

### Phase 8 — Bookkeeping commit (PASS only)

After report saved AND main is at the post-merge SHA:

1. Update `ai/state.json`:
   - Append `"0112"` to `completed`.
   - Set `current_task: null` (or the next scoped task number once
     the orchestrator picks one).
   - Set `task_agent: "ai/reports/task-0112-verifier.md"`.
   - Update `last_verified` to current ISO timestamp.
   - Append a `notes` entry summarizing the PASS (PR #167, squash
     SHA, post-merge main-CI run, live-URL evidence,
     re-enable proposal carry-forward).
2. Update `ai/context/current.md`:
   - Move 0112 from "Active Task" to "Just-merged".
   - Add the durable outcome: webhook endpoint create / edit /
     disable / delete now ships from the org-scoped Console.
   - Note the parked re-enable surface proposal as a candidate
     follow-on (Task 0113).
3. Append a `## Task 0112` entry to `ai/context/task-ledger.md`.

Then commit on `main`:

```bash
git add ai/state.json ai/context/current.md ai/context/task-ledger.md \
        ai/reports/task-0112-verifier.md
git commit -m "ai: Task 0112 verifier-PASS bookkeeping (PR #167 squash <sha>)"
git push origin main
```

If FAIL: do NOT update state.json/current.md beyond a brief Issues
note; commit only the verifier report on the PR branch (not main),
add a PR comment summarizing the blockers, and leave PR #167 OPEN.

## Acceptance Criteria

✅ All 8 phases pass with no FAIL gate.
✅ PR file list = 12 paths exactly, all inside the allowlist.
✅ Forbidden-zone scans all return zero hits.
✅ No new hazard-suppressing syntax in production source.
✅ No `fetch(` in console webhook code (SDK + `wrap()` only).
✅ Signing-secret scan returns only documentation comments — no
   actual secret rendering.
✅ Idempotency-Key generated via `crypto.randomUUID` (with
   documented fallback) on `createEndpoint` only; PATCH/disable/delete
   do not propagate one (rationale recorded by implementer).
✅ Typed-URL confirm gate present in delete dialog; submit disabled
   until match.
✅ Disabled-state inline notice card rendered when `status === "disabled"`;
   no re-enable button.
✅ List-page placeholder copy ("Use the API or CLI to create one")
   removed.
✅ Quality gates: `pnpm install --frozen-lockfile` clean,
   `pnpm -w typecheck` 0 errors, `@saas/web-console-next-tests test`
   ≥ 40 passed.
✅ Orun validate green; `plan --changed` selects only the 4
   web-console lanes; dry-run all green.
✅ PR-CI 5/5 SUCCESS at HEAD (or post-rebase HEAD if
   `update-branch` was needed); per-lane log evidence captured.
✅ Squash merge clean; main fast-forwarded.
✅ **Post-merge main-CI 4/4 SUCCESS at the squash SHA.**
✅ **Live-URL curl: new "Create endpoint" CTA copy present; old
   "use the API or CLI" placeholder gone.**
✅ Verifier report saved at `ai/reports/task-0112-verifier.md`.
✅ Bookkeeping commit on main updates state.json, current.md,
   task-ledger.md.

## When Done Report

Save to `/ai/reports/task-0112-verifier.md` per Phase 7 above.
Required sections: Result, Checks, Issues, Risk Notes, Spec Proposals,
Recommended Next Move.
