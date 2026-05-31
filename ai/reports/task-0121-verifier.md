# Task 0121 — Verifier Report

**Result: PASS**

Milestone **B7 — audit-log filtering + export** (PR **#176**), verified end to end
DB → contracts → events-worker → SDK → CLI → Console, merged to main, Console
deploy leg proven on post-merge main-CI + live prod-Worker probe.

## Sealed Inputs Echo

| Field | Value |
|-------|-------|
| PR | #176 `feat(audit): combinable filtering + NDJSON export across all layers (Task 0121)` |
| Original PR head (hand-off) | `40d9f43` |
| Post-`update-branch` head | `65f7d99` (merge-of-main, behind-main fix) |
| Final PR head (report fix-up) | `d70291f` |
| PR base | `ef38e78` → advanced to `eeada67` (orchestrator verifier-scope commit) |
| Squash-merge commit on main | `2b98507` (mergedAt 2026-05-31T14:40:14Z) |
| Diff | 18 files (+1326/-55) = 17-file allowlist + implementer report |

## Checks (by phase)

**Phase 0 — Readiness + mandatory report fix-up.** `git fetch origin`; PR #176 OPEN.
The untracked `ai/reports/task-0121-implementer.md` was NOT on the PR branch
(recurring 0031–0034/0106 gap). Fixed: `gh pr update-branch 176` (rebased onto main,
head `65f7d99`), then committed the report on the PR branch (`d70291f`) and pushed.
Fresh PR-CI run `26715418224` at `d70291f` = **21/21 SUCCESS** (plan + 20 lanes).

**Phase 1 — PR sanity / boundary.** EXACTLY the 17-file allowlist + report:
- DB: `events/types.ts` (AuditOrgFilters + queryAuditByOrg 4th arg), `events/repository.ts`
  (parameterized filter clauses), `events/index.ts` (re-export).
- Contracts: `events.ts` (AuditQueryByOrg +7 optional fields).
- Events worker: `pagination.ts` (parseAuditFilters), `handlers/list-audit.ts` (wiring).
- SDK: `events.ts` (AuditEntryFilters + threading + exportAuditEntriesNdjson), `index.ts`.
- CLI: `commands/cross-reads.ts` (7 flags + --format=ndjson), `cli-runner.ts` (help).
- Console: `components/audit/audit-log.ts` (NEW pure helper), `audit/page.tsx` (UI).
- Tests: db, events-worker, sdk, cli, web-console-next.
- `ai/reports/task-0121-implementer.md` (Phase 0 fix-up).
No extra paths. MERGEABLE/CLEAN. Behind-main fixed via update-branch (head contained
main HEAD eeada67 via merge commit 65f7d99; `git log origin/main ^d70291f` empty at merge).

**Phase 2 — Hazard + forbidden-zone scan.** ZERO new `eslint-disable`/`@ts-ignore`/
`@ts-expect-error`/`as any`/`as unknown as` in added production source. Console: ZERO
`fetch(` (SDK-only via `wrap()`). Forbidden-zone grep = ZERO hits: api-edge UNCHANGED,
no `querySecurityEvents`, no `cloudflare-domain`/provider-pin/lockfile/`package.json`/
`component.yaml`/`kiox.lock`/`plan.json` touches.

**Phase 3 — Load-bearing seam inspection (code path).**
- **SQL safety**: `queryAuditByOrg` builds filter predicates from a HARDCODED column
  list `[actor_id, actor_type, subject_kind, subject_id, event_type]` with `= $N` bound
  params; `from`/`to` → `occurred_at >= $N` / `<= $N`. No column name or value is
  string-interpolated. Cursor keyset (`ORDER BY occurred_at DESC, id DESC`) and legacy
  `org_id IN ($1, $2)` dual-format UNCHANGED — filters only append `AND` predicates
  (inserted between categoryClause and the cursor `clause`).
- **Filter-survives-pagination**: `createAuditIterator` carries every filter field from
  `initialQuery` into each per-page query reconstruction (events.ts ~L227). Test-proven:
  `events.test.ts` "forwards by:org filter params on every page request" asserts both of
  2 page calls carry all 7 filters AND page 2 carries `cursor=cur_2` — the silent
  drop-after-page-1 guard.
- **Cursor envelope**: SDK reads `meta.cursor ?? null` (events.ts:104, :274), never body
  `nextCursor`.
- **422 adjudication**: `parseAuditFilters` validates charset `/^[A-Za-z0-9_.:\-]{1,128}$/`
  (idents), `ISO_TS_RE` (from/to), `EventActorType` set (actorType); empty/missing params
  ignored. `handleListAudit` routes failures through `validationError(requestId, …)` →
  **422 `validation_failed`**. ACCEPTED per Current Repo Context (canonical events-worker
  convention, `apps/events-worker/src/http.ts:36`). `PublicAuditEntry` + envelope
  byte-stable (contract change is additive-optional on `AuditQueryByOrg` only).

**Phase 4 — Quality gates on PR branch.** `pnpm install --frozen-lockfile` clean
(40 workspaces, lockfile up to date). `pnpm -r typecheck` (db/contracts/sdk/cli/
events-worker) = 0 errors. `pnpm -r lint` (incl. web-console-next) = 0 warnings.
Affected suites match report counts: **db 520, events-worker 24, sdk 117, cli 183,
web-console-next-tests 70**. No kiox.lock mutation committed; no plan.json committed.

**Phase 5 — Orun local gates.** `orun validate` = All validation passed. `orun plan
--changed --base origin/main` = **8 components × envs → 20 jobs** (plan `9c11b25ef15e`):
contracts/db/sdk/cli ×3 Verify + events-worker ×3 Verify deploy + web-console-next ×3
Verify deploy + db-tests·dev + web-console-next-tests·dev. `orun run --dry-run` =
20 selected, all green. kiox.lock reverted; plan.json removed.

**Phase 6 — PR-CI log inspection (real, not summary).** Run `26715418224` at `d70291f`,
21/21 SUCCESS. `gh run view --log` confirms representative lanes RAN the work:
- `sdk · dev · Verify`: `+ vitest 2.1.9` → `steps 4 passed, 0 failed, 0 skipped`.
- `web-console-next · stage · Verify deploy`: `next build` → `✓ Compiled successfully`
  → OpenNext Cloudflare build.
- `events-worker · stage · Verify deploy`: `steps 7 passed, 0 failed, 0 skipped`.

**Phase 6.5 — BEHIND-main guard.** Re-confirmed at merge time: PR head `d70291f`
contained main HEAD `eeada67`; `git log origin/main ^d70291f` empty. CLEAN/MERGEABLE.

**Phase 7 — MERGE + post-merge deploy gate.** Squash-merged #176 → `2b98507` on main,
branch deleted, main fast-forward pulled. Post-merge main-CI run **`26715563040`** at
`2b98507` = **21/21 SUCCESS**. Console deploy leg proven (NOT on PR-CI alone):
- `web-console-next · prod · Verify deploy`: wrangler `Uploaded 20 of 20 assets` →
  `✨ Success! Uploaded 20 files` → `Uploaded sourceplane-web-console-next-prod` →
  `Current Version ID: bb7fe3f2-733e-4ee6-bb09-e400ab846324` → `✓ 08 smoke 2.9s`.
- `events-worker · prod · Verify deploy`: `steps 10 passed, 0 failed, 0 skipped`.
- **Live prod-Worker probe**: `https://prod.sourceplane.ai/` → 307 → `/orgs` → HTTP 200
  with `<title>Sourceplane Console</title>`; `/orgs/test/audit` → HTTP 200 serving the
  new `audit/page-08ec933a41a5ee65.js` chunk (filter UI live).

**Phase 8 — Bookkeeping.** This report + state.json/current.md/task-ledger.md/
orchestrator-brief.md updates committed to main.

## Issues

None blocking. One cosmetic note: `packages/cli/src/commands/cross-reads.ts`
`parseAuditFilterFlags` doc-comment says malformed input "surfaces as a 400 from the
API" — the worker actually returns 422. Comment-only, no behavioural impact; not worth a
follow-on PR on its own (fold into any future cross-reads touch).

## CI Log Review

- PR-CI: run `26715418224` (head `d70291f`) 21/21 SUCCESS — sdk·dev vitest 4 steps,
  web-console-next·stage next build Compiled successfully, events-worker·stage 7 steps.
- Earlier PR-CI: `26715406130` (65f7d99) SUCCESS; `26715065143` (40d9f43, hand-off) SUCCESS.
- Post-merge main-CI: run `26715563040` (head `2b98507`) 21/21 SUCCESS — web-console-next·
  prod wrangler upload 20 assets + Version ID bb7fe3f2 + smoke 2.9s; events-worker·prod
  10 steps.

## Live Resource Evidence

- Merge commit `2b98507`, post-merge main-CI run `26715563040` (21/21 SUCCESS).
- web-console-next prod deployed: Version ID `bb7fe3f2-733e-4ee6-bb09-e400ab846324`.
- `https://prod.sourceplane.ai/` → 307 → `/orgs` HTTP 200 `<title>Sourceplane Console</title>`.
- `https://prod.sourceplane.ai/orgs/test/audit` → HTTP 200 (new audit filter-UI chunk served).

## 400 → 422 Reconciliation Note

The task prompt's Acceptance Criteria + Architect Brief said malformed `from`/`to` and
invalid `actorType` reject with **400**. The implementer shipped **422
`validation_failed`**. This matches the canonical events-worker convention
(`apps/events-worker/src/http.ts:36` `validationError` → `errorResponse("validation_failed",
…, 422)`), the established pattern for all request-shape validation in this worker (e.g.
the pre-existing invalid-limit 422 and invalid-category 422). The prompt's "400" was a
stale orchestrator assumption, not a code-grounded contract. Per "trust code reality over
stale docs," **422 ACCEPTED** as a convention match — a worker error-envelope detail, not
a contract/security-boundary/persistence change. No spec proposal required.

## Risk Notes

- `from`/`to` are inclusive `occurred_at` bounds applied as additional `AND` predicates;
  they compose with `category` + cursor without touching the keyset — confirmed by code
  inspection and the cross-page forwarding test. No pagination-correctness risk.
- NDJSON export (`exportAuditEntriesNdjson`) layers over `iterAuditEntries`, inheriting
  `AUDIT_ITERATOR_MAX_PAGES` + `seenCursors` loop guards — no unbounded-stream risk.
- Cosmetic CLI doc-comment 400/422 mismatch (above) — non-functional.

## Spec Proposals

None required.

## Recommended Next Move

B7 forward leg: the **security-events surface** (`querySecurityEvents`) is the next
human-independent pick (intentionally parked out of this PR). After that:
`VALID_CONTEXTS` drift-proofing and the **B8 admin-worker** milestone.

## PR Number

**#176** — https://github.com/sourceplane/multi-tenant-saas/pull/176 (MERGED `2b98507`)
