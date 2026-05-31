# Current Context

Last updated: 2026-05-31 — Task 0121 IMPLEMENTER COMPLETE, VERIFIER EMITTED
(`ai/tasks/task-0121-verifier.md`). PR **#176** OPEN, MERGEABLE/CLEAN, 21/21
PR-CI green at HEAD `40d9f43`, base `ef38e780` = origin/main HEAD (0 behind).
B7 audit-log filtering + export milestone shipped end to end in ONE combined PR
(17 files, +1218/-55). Repo health green; verifier awaiting pickup.

## Active: Task 0121 — B7 audit-log filtering + export (VERIFIER, emitted)

Verify PR #176 delivers EXACTLY the milestone (DB → contracts → events-worker →
SDK → CLI → Console) with no overreach, the cursor/keyset seam preserved,
parameterized-SQL safety, and the Console deploy leg proven post-merge.

What the implementer shipped (one PR #176):
- **DB** `queryAuditByOrg` + `AuditOrgFilters` — parameterized optional WHERE
  clauses (`actor_id/actor_type/subject_kind/subject_id/event_type` `= $N`;
  `from`/`to` → `occurred_at >= / <= $N`); keyset `ORDER BY occurred_at DESC,
  id DESC` + legacy `org_id IN ($1,$2)` dual-format UNTOUCHED.
- **Contracts** `events.ts` — `AuditQueryByOrg` +7 optional fields;
  `PublicAuditEntry` / envelope byte-stable.
- **Worker** `parseAuditFilters` (charset `/^[A-Za-z0-9_.:\-]{1,128}$/`, ISO-ms-Z
  for from/to, `actorType` vs `EventActorType` enum) → wired into `list-audit.ts`.
- **SDK** `AuditEntryFilters` threaded through `buildAuditRequest` org arm +
  `iterAuditEntries` per-page reconstruction + new `exportAuditEntriesNdjson`
  async generator.
- **CLI** `audit list` +`--actor/--actor-type/--subject-kind/--subject-id/
  --event-type/--from/--to` + `--format=ndjson` export (mutex w/ `--cursor`/`--all`).
- **Console** dependency-free `audit-log.ts` pure helper + `audit/page.tsx`
  filter UI + Load-more + Export NDJSON (SDK-only via `wrap()`, zero `fetch`).
- Tests: db filter, events-worker 24, sdk 117, cli 183, web-console-next-tests 70.

TWO verifier flags (in the verifier prompt):
1. **Phase-0 fix-up** — `ai/reports/task-0121-implementer.md` is UNTRACKED, not
   committed to the PR branch (recurring 0031-0034/0106 gap). Verifier commits +
   pushes it, then waits for fresh PR-CI green before merge.
2. **400 → 422 RECONCILED** — the task prompt's acceptance said malformed
   `from`/`to` + bad `actorType` reject with 400; the implementer shipped **422
   `validation_failed`**. Orchestrator confirmed 422 is the canonical
   events-worker convention (`apps/events-worker/src/http.ts:36` `validationError`
   → 422), so the prompt's "400" was a stale orchestrator assumption. ACCEPT 422
   per trust-code-over-docs; NO spec proposal (worker error-envelope detail, not a
   contract/security/persistence change).

Console leg DEPLOY-GATED: verifier PASS gate = post-merge main-CI smoke + live
prod-Worker audit-page probe (`/` → 307 → `/orgs` → 200), NOT PR-CI alone.
BEHIND-main rebase is the verifier's responsibility.

## Just landed: Task 0120 — B5 webhook delivery history (VERIFIER PASS)

One combined PR #175 (13 files, +1535/-30) shipped the three missing consumer
surfaces over the already-shipped cursor-paginated delivery-attempts backend:

- **SDK**: `listDeliveryAttemptsPage` threads `limit`/`cursor`, reads opaque
  base64 `meta.cursor ?? null` (envelope, NOT body `nextCursor` — vestigial),
  forwards verbatim. sdk 0/0/113.
- **Console**: dependency-free pure helper `delivery-history.ts` +
  `DeliveryHistoryPanel` on the endpoint detail page (status badges, attempt#,
  httpStatusCode, safe failureReason, completed/nextRetry ts, skeleton,
  EmptyState, cursor Load-more, SDK-only via `wrap()`, zero `fetch`).
- **CLI**: `webhook deliveries <endpointId>` (human table + `--output=json` +
  `--limit`/`--cursor` + `--all` cursor-follow w/ seen-guard + MAX_PAGES cap,
  safe columns only, modelled on `audit list`). cli 0/0/178 (+14).
- Harness: web-console-next-tests 0/0/53.

**Verifier outcome (8-phase, Phase 7 deploy-gated):** Phases 0–6.5 green
(13-file boundary, hazard/forbidden-zone clean, cursor seam correct, all quality
+ Orun gates pass, PR-CI 11/11 real via `gh run view --log`). BEHIND-main by 1
→ `gh pr update-branch 175` → rebased HEAD `dd61a17` → fresh CI `26713863909`
11/11 → squash-merge `99877e0`. **Phase 7 (PASS gate):** post-merge main-CI run
`26713941496` SUCCESS (12/12); web-console-next dev/stage/prod deploy lanes each
8/8 steps incl. `07 deploy` (wrangler 4.90.0 ✨ upload) + `08 smoke`; live-URL
probe prod Worker `/` → 307 → `/orgs` → HTTP 200. Reports:
`ai/reports/task-0120-{implementer,verifier}.md`.

LOAD-BEARING FACT confirmed live: the worker emits the continuation cursor as an
OPAQUE base64 token in `meta.cursor` (envelope), NOT body `nextCursor`
(vestigial); every consumer reads `meta.cursor ?? null` and forwards verbatim.

## Next focus after 0121

1. **Task 0121 verifier** — EMITTED (`ai/tasks/task-0121-verifier.md`); execute
   it: Phase-0 report fix-up, 17-file boundary, SQL/cursor seam, 422 accept,
   merge, post-merge main-CI + live prod-Worker audit-page probe (deploy gate).
2. **B7 follow-on / security-events surface** — `querySecurityEvents` consumer
   exposure is a separate leg (explicitly out of scope for 0121).
3. **`VALID_CONTEXTS` drift-proofing (hygiene)** — derive the test array from
   the `BoundedContext` union via `as const`. Low priority.
4. **B8 admin-worker** — greenfield; later.

Deferred (Deferred Decision Protocol, human input required, NOT picked):
`0085b` (cloudflare-domain v4→v5), `notifications-provider-swap`,
`notifications-worker-dev-reframe`, `optional-spec-13-commands`.

Repo health: green. PR #176 OPEN (Task 0121, 21/21 CI green). Task 0121 verifier
awaiting pickup.
