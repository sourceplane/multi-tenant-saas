# Task 0121 — Verifier

Agent: Verifier

## Current Repo Context

- Task 0121 (B7 audit-log filtering + export) IMPLEMENTER is COMPLETE. PR **#176**
  (`feat(audit): combinable filtering + NDJSON export across all layers (Task 0121)`)
  is OPEN, **MERGEABLE / mergeStateStatus CLEAN**, 0 behind main.
  - PR head: `40d9f43` (`impl/task-0121-audit-filter-export`).
  - PR base: `ef38e780` = current `origin/main` HEAD (Task 0121 scope commit
    `ef38e78` on top of Task 0120 bookkeeping `c393dc3`). **0 commits behind** at
    hand-off — but re-check before merge; BEHIND-main rebase is YOUR responsibility
    (recurring 0103–0120).
  - Diff: **17 files, +1218 / -55**. PR-CI run `26715065143` = **21/21 SUCCESS**
    at head `40d9f43` (plan + contracts×3 + db×3 + db-tests·dev + sdk×3 +
    cli×3 + events-worker·{dev,stage,prod}·Verify deploy + web-console-next·{dev,
    stage,prod}·Verify deploy + web-console-next-tests·dev·Verify).
- The implementer report `ai/reports/task-0121-implementer.md` EXISTS but is
  **UNTRACKED / NOT committed to the PR branch** (recurring "report not committed
  to PR" gap — Tasks 0031–0034, 0106). **Phase 0 mandatory fix-up**: commit it to
  `impl/task-0121-audit-filter-export`, push, and wait for fresh PR-CI green before
  merge.
- **Known deviation to adjudicate (NOT an automatic FAIL):** the task prompt's
  Acceptance Criteria + Architect Brief said malformed `from`/`to` and invalid
  `actorType` reject with **400**. The implementer shipped **422**
  (`validation_failed`). Verified by the orchestrator this cycle: **422 is the
  correct, canonical events-worker convention** — `apps/events-worker/src/http.ts:36`
  `validationError(requestId, fields)` returns `errorResponse("validation_failed",
  "Validation failed", 422, ...)`, the established pattern for all request-shape
  validation in this worker. The prompt's "400" was a stale orchestrator assumption,
  not a code-grounded contract. **Per "trust code reality over stale docs," ACCEPT
  the 422** as a convention-match. This is a worker error-envelope detail, not a
  contract / security-boundary / persistence change, so **no spec proposal is
  required** — note the prompt-vs-impl reconciliation in your report and move on.
- Parked / deferred zones the PR MUST NOT touch (auto-FAIL on hits): notifications
  provider swap, `0085b` cloudflare-domain bump, notifications-worker dev reframe,
  optional spec-13 api-edge commands (`ai/deferred.md`);
  `infra/terraform/cloudflare-domain/**`; cloudflare provider pin;
  `querySecurityEvents` surface (separate leg).

## Objective

Verify that PR #176 delivers EXACTLY the Task 0121 milestone (B7 audit-log
filtering + export) end to end — DB → contracts → events-worker → SDK → CLI →
Console — with no overreach, no parked-zone touches, the load-bearing cursor/keyset
seam preserved, parameterized-SQL safety, and the Console deploy leg proven on
post-merge main-CI + a live prod-Worker probe. PASS → merge in dependency order,
sync main, clean up. FAIL → leave PR open with clear blockers.

## PR Boundary (the 17-file allowlist)

DB (`packages/db`):
- `src/events/types.ts` — `AuditOrgFilters` interface + `queryAuditByOrg` 4th arg.
- `src/events/repository.ts` — parameterized optional filter clauses; keyset/cursor
  + legacy `org_id IN ($1,$2)` dual-format UNTOUCHED.
- `src/events/index.ts` — re-export.

Contracts (`packages/contracts`):
- `src/events.ts` — `AuditQueryByOrg` + 7 optional fields; `PublicAuditEntry` +
  envelope BYTE-STABLE.

Events worker (`apps/events-worker`):
- `src/pagination.ts` — `parseAuditFilters` (per-field validation, 422 on bad).
- `src/handlers/list-audit.ts` — wires validated filters into the repo call;
  `redactPayload` unchanged.

SDK (`packages/sdk`):
- `src/events.ts` — `AuditEntryFilters`; threaded through `buildAuditRequest` org
  branch + `iterAuditEntries` per-page reconstruction; new
  `exportAuditEntriesNdjson` async generator.
- `src/index.ts` — `AuditEntryFilters` export.

CLI (`packages/cli`):
- `src/commands/cross-reads.ts` — `audit list` gains `--actor`, `--actor-type`,
  `--subject-kind`, `--subject-id`, `--event-type`, `--from`, `--to`,
  `--format=ndjson`.
- `src/cli-runner.ts` — help text.

Console (`apps/web-console-next`):
- `src/components/audit/audit-log.ts` — NEW dependency-free pure helper.
- `src/app/(app)/orgs/[orgSlug]/audit/page.tsx` — filter UI + Load-more + Export
  NDJSON; SDK-only via `wrap()`, zero `fetch(`.

Tests:
- `tests/db/src/events.test.ts`, `tests/events-worker/src/events-worker.test.ts`,
  `packages/sdk/src/__tests__/events.test.ts`,
  `packages/cli/src/__tests__/writes-and-cross-reads.test.ts`,
  `tests/web-console-next/src/audit-log.test.ts`.

Plus (Phase 0 fix-up): `ai/reports/task-0121-implementer.md` committed to the PR
branch.

Anything outside this allowlist = overreach → FAIL.

## Read First

- `ai/tasks/task-0121.md` (the implementer prompt — scope of record)
- `ai/reports/task-0121-implementer.md` (what was built; filter param names,
  validation rules, export mechanism, per-surface test counts)
- `agents/orchestrator.md` → Verifier Standard + Verifier Merge Protocol
- `specs/components/09-events-audit-observability.md` (org_id-always rule,
  required audit coverage, "queryable by organization and target resource")
- `specs/components/13-cli-and-sdk.md` (audit command surface conventions)
- `apps/events-worker/src/http.ts` (the 422 `validationError` convention)
- PR #176 diff + commits + CI logs

## Verification (8-phase, Console leg DEPLOY-GATED)

**Phase 0 — Readiness + mandatory report fix-up.**
- `git fetch origin`; confirm PR #176 OPEN, head `40d9f43` (or later if you push).
- Commit the untracked `ai/reports/task-0121-implementer.md` to
  `impl/task-0121-audit-filter-export`, push. Wait for fresh PR-CI green at the new
  head before any merge.

**Phase 1 — PR sanity / boundary.** Confirm EXACTLY the 17-file allowlist above
(+ the report after fix-up). Any extra path → FAIL. Confirm MERGEABLE/CLEAN and
re-check behind-main (`git rev-list --count origin/main..<head>`); rebase via
`gh pr update-branch 176` if behind, re-poll CI.

**Phase 2 — Hazard + forbidden-zone scan.** Zero new `eslint-disable` / `@ts-ignore`
/ `@ts-expect-error` / `as any` / `as unknown as` in production source. Console:
zero `fetch(` (SDK-only via `wrap()`). Forbidden-zone grep = zero hits across
`apps/api-edge/**` (facade must be UNCHANGED — params flow through verbatim),
`querySecurityEvents`, parked/deferred zones, `infra/terraform/cloudflare-domain/**`,
cloudflare provider pin, lockfiles / `package.json` / `component.yaml` (unless a
genuinely required workspace edge — none expected).

**Phase 3 — Load-bearing seam inspection (code path, not just tests).**
- **SQL safety**: `queryAuditByOrg` builds filter predicates from a HARDCODED
  column list with bound `$N` params only — confirm NO column name or value is
  string-interpolated into query text. Cursor keyset (`ORDER BY occurred_at DESC,
  id DESC` + `> / <` cursor compare) and legacy `org_id IN ($1,$2)` dual-format
  UNCHANGED; filters only add `AND` predicates.
- **Filter-survives-pagination**: confirm `iterAuditEntries` carries the filter
  fields into its per-page query reconstruction (events.ts ~L177) AND that a test
  asserts filters persist across ≥2 pages (the silent drop-after-page-1 bug).
- **Cursor envelope**: SDK reads `meta.cursor ?? null` (envelope), never body
  `nextCursor`.
- **422 adjudication**: confirm `parseAuditFilters` routes malformed `from`/`to`
  + bad `actorType` through the `validationError` 422 helper; empty/unknown params
  ignored (not errors). ACCEPT 422 per Current Repo Context. Confirm
  `PublicAuditEntry` + response envelope byte-stable (no widening).

**Phase 4 — Quality gates on the PR branch.** `pnpm install --frozen-lockfile`
clean; `pnpm -r typecheck` 0; `pnpm -r lint` no NEW warnings; affected suites green
and matching the report's counts (db, events-worker 24, sdk 117, cli 183,
web-console-next-tests 70). No kiox.lock mutation committed; no `plan.json` committed.

**Phase 5 — Orun local gates.**
`/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`;
`... orun plan --changed --intent intent.yaml --base origin/main --output plan.json`
(expect the 6 changed components × their env lanes: contracts/db/sdk/cli×3 +
events-worker×3 deploy + web-console-next×3 deploy + db-tests·dev +
web-console-next-tests·dev); `... orun run --plan plan.json --dry-run --runner
github-actions`. Revert kiox.lock; do not commit plan.json.

**Phase 6 — PR-CI log inspection (real, not summary).** `gh run view 26715065143
--log` (or the post-fix-up run) — confirm representative lanes actually RAN the work
(e.g. sdk·dev Verify ran vitest; events-worker deploy lanes ran `Verify deploy`;
web-console-next stage ran `next build` → compiled). 21/21 (or 22/22 if the report
commit adds a lane shift) SUCCESS at the final head.

**Phase 6.5 — BEHIND-main guard.** Re-confirm 0 behind at merge time; rebase +
re-poll if main advanced.

**Phase 7 — MERGE + post-merge deploy gate (MANDATORY, Console is deploy-gated).**
- Squash-merge PR #176 (`gh pr merge 176 --squash --delete-branch`, `--admin` if
  auto-merge disabled). Checkout main, fast-forward pull.
- Watch the post-merge main-CI run to completion; confirm the `web-console-next`
  {dev,stage,prod} `Verify deploy` lanes each ran `deploy` (wrangler upload) + the
  `smoke` step, and `events-worker` deploy lanes are green.
- **Live prod-Worker probe**: confirm the Console audit page is reachable — prod
  Worker `/` → 307 → `/orgs` → HTTP 200 with `<title>Sourceplane Console</title>`;
  spot-check `/orgs/<slug>/audit` returns 200. Do NOT mark the Console leg PASS on
  local/PR-CI evidence alone (per `references/post-merge-deploy-profile-gap.md`).

**Phase 8 — Bookkeeping.**
- PASS: write `ai/reports/task-0121-verifier.md`; update `ai/state.json`
  (add `"0121"` to completed, advance `current_task`, `repo_health: green`,
  refresh notes + `last_verified`), `ai/context/current.md`, `ai/context/task-ledger.md`
  (mark 0121 verified + merged), and `ai/context/orchestrator-brief.md`. Commit
  bookkeeping to main, push. `git status --short` clean.
- FAIL: leave PR open, document blockers in the verifier report + a PR comment,
  no merge.

## Acceptance Criteria

- ✅ PR #176 == EXACTLY Task 0121 (17-file allowlist + report); no overreach.
- ✅ Implementer report committed to the PR branch (Phase 0 fix-up done).
- ✅ Parameterized SQL only; cursor keyset + legacy org_id format unchanged.
- ✅ Filters independently combinable, compose with `category` + cursor, and
  SURVIVE ≥2 pages (test-proven).
- ✅ Malformed `from`/`to` + bad `actorType` → 422 `validation_failed`; unknown/
  empty params ignored. `PublicAuditEntry` + envelope byte-stable.
- ✅ NDJSON export works from BOTH CLI (`--format=ndjson`) and Console, via the SDK
  `exportAuditEntriesNdjson` helper.
- ✅ Console SDK-only (zero `fetch`), filter UI + Load-more + export with designed
  empty + loading states.
- ✅ api-edge UNCHANGED; no parked/deferred-zone touches; no security-events work.
- ✅ `pnpm -r typecheck`/`lint`/affected tests green; Orun validate/plan/run dry-run
  green; PR-CI green via `gh run view --log` (not just summary).
- ✅ Post-merge main-CI green AND live prod-Worker audit-page probe 200 (Console
  deploy gate).
- ✅ MergeStateStatus CLEAN at merge; main fast-forwarded; worktree clean.

If ANY check fails, the verification FAILS and PR #176 stays open with clear blockers.

## When Done Report

Write `ai/reports/task-0121-verifier.md` with: `Result: PASS|FAIL`, Checks (every
phase + commands run), Issues, CI Log Review (run IDs + the specific log lines that
prove the work ran), Live Resource Evidence (post-merge run ID + prod-Worker probe
results), the 400→422 reconciliation note, Risk Notes, Spec Proposals (links only —
none expected), Recommended Next Move (B7 security-events surface is the next
forward leg; VALID_CONTEXTS drift-proofing + B8 admin-worker after).
