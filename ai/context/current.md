# Current Context

Last updated: 2026-05-31 — Task 0121 VERIFIED **PASS** + MERGED. PR **#176**
squash-merged as `2b98507` on main (mergedAt 2026-05-31T14:40:14Z). B7 audit-log
filtering + export shipped end to end in ONE combined PR (17 files, +1218/-55).
Console deploy leg proven live. Repo health green; main fully green.

## Just landed: Task 0121 — B7 audit-log filtering + export (VERIFIER PASS)

One combined PR #176 delivered the milestone DB → contracts → events-worker → SDK
→ CLI → Console. Seven optional, independently-combinable filters
(`actorId/actorType/subjectKind/subjectId/eventType/from/to`) + NDJSON export.

- **DB** `queryAuditByOrg` + `AuditOrgFilters` — parameterized optional WHERE
  clauses (`actor_id/actor_type/subject_kind/subject_id/event_type` `= $N`;
  `from`/`to` → `occurred_at >= / <= $N`) appended as `AND` predicates between the
  category clause and cursor clause. Keyset `ORDER BY occurred_at DESC, id DESC` +
  legacy `org_id IN ($1,$2)` dual-format UNTOUCHED. HARDCODED column list, all
  values bound params — no string interpolation.
- **Contracts** `events.ts` — `AuditQueryByOrg` +7 optional fields;
  `PublicAuditEntry` / envelope byte-stable.
- **Worker** `parseAuditFilters` (charset `/^[A-Za-z0-9_.:\-]{1,128}$/`, ISO-ms-Z
  for from/to, `actorType` vs `EventActorType` enum) → wired into `list-audit.ts`,
  failures routed through `validationError` → **422 `validation_failed`**.
- **SDK** `AuditEntryFilters` threaded through `buildAuditRequest` org arm +
  `iterAuditEntries` per-page reconstruction (filters carried from `initialQuery`,
  survive ≥2 pages — test-proven) + new `exportAuditEntriesNdjson` async generator.
  Cursor read from `meta.cursor ?? null` (envelope), never body `nextCursor`.
- **CLI** `audit list` +`--actor/--actor-type/--subject-kind/--subject-id/
  --event-type/--from/--to` + `--format=ndjson` export (mutex w/ `--cursor`/`--all`).
- **Console** dependency-free `audit-log.ts` pure helper + `audit/page.tsx`
  filter UI + Load-more + Export NDJSON (SDK-only via `wrap()`, zero `fetch`).
- Tests: db 520, events-worker 24, sdk 117, cli 183, web-console-next-tests 70.

**Verifier outcome (8-phase, Console deploy-gated):**
- Phase 0: Phase-0 fix-up done — committed untracked `task-0121-implementer.md` to
  PR branch (`d70291f`); `gh pr update-branch 176` resolved behind-main (`65f7d99`).
  Fresh PR-CI `26715418224` 21/21 SUCCESS.
- Phases 1–6.5 green: 17-file boundary EXACT (+report), hazard/forbidden-zone clean
  (api-edge UNCHANGED, zero `fetch(` in Console, no parked-zone hits), SQL+cursor+
  filter-survives-pagination+422 seam confirmed by code path, all quality gates
  (typecheck 0, lint 0, test counts match) + Orun gates (validate ok, plan 8
  components → 20 jobs, dry-run 20 selected), PR-CI real via `gh run view --log`.
- Phase 7 (PASS gate): squash-merge `2b98507`; post-merge main-CI run
  **`26715563040`** 21/21 SUCCESS — web-console-next prod wrangler upload 20 assets
  + Version ID `bb7fe3f2` + `✓ 08 smoke 2.9s`; events-worker prod 10 steps. Live
  probe: prod Worker `/` → 307 → `/orgs` → HTTP 200 `<title>Sourceplane Console
  </title>`; `/orgs/test/audit` → HTTP 200 (new filter-UI chunk served).

**400 → 422 RECONCILED:** the task prompt's acceptance said malformed `from`/`to` +
bad `actorType` reject with 400; the implementer shipped **422 `validation_failed`**,
the canonical events-worker convention (`apps/events-worker/src/http.ts:36`
`validationError`). ACCEPTED per trust-code-over-docs; no spec proposal.

Reports: `ai/reports/task-0121-{implementer,verifier}.md`.

## Next focus after 0121

1. **B7 security-events surface** — `querySecurityEvents` consumer exposure is the
   next human-independent forward leg (explicitly out of scope for 0121).
2. **`VALID_CONTEXTS` drift-proofing (hygiene)** — derive the test array from the
   `BoundedContext` union via `as const`. Low priority.
3. **B8 admin-worker** — greenfield; later.

Carry-forward nit (non-blocking): `packages/cli/src/commands/cross-reads.ts`
`parseAuditFilterFlags` doc-comment says malformed input "surfaces as a 400 from the
API" — worker actually returns 422. Comment-only; fold into any future cross-reads touch.

Deferred (Deferred Decision Protocol, human input required, NOT picked):
`0085b` (cloudflare-domain v4→v5), `notifications-provider-swap`,
`notifications-worker-dev-reframe`, `optional-spec-13-commands`.

Repo health: green. 0 open PRs. Task 0121 closed.
