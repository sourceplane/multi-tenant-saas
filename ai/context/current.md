# Current Context

Last updated: 2026-05-31 — Task 0121 EMITTED (implementer pickup pending). B7
audit-log filtering + export milestone scoped end to end (`ai/tasks/task-0121.md`).
main code HEAD `99877e0` (Task 0120 / PR #175, B5 webhook delivery history,
VERIFIED PASS + MERGED). Bookkeeping HEAD advancing past `c393dc3`. 0 open PRs,
working tree clean.

## Active: Task 0121 — B7 audit-log filtering + export (IMPLEMENTER, emitted)

Take the org-scoped audit read API (`GET /v1/organizations/:orgId/audit`) from
category-only to buyer-credible: add **actor** (actorId/actorType), **resource**
(subjectKind/subjectId), **action** (eventType), and **time-range** (occurredAt
`from`/`to`) filters + an **NDJSON export**, across DB → worker → contracts →
SDK → CLI → Console. Backend today supports ONLY a `category` filter + cursor
pagination (verified by inspection this cycle, NOT to be rebuilt).

Gap map (real code, this cycle):
- **api-edge needs NO change** — `audit-facade.ts` forwards `pathname +
  url.search` verbatim, so new query params flow through automatically.
- **DB** `repository.ts` `queryAuditByOrg` (~L295) — add optional actor/subject/
  eventType/time-range WHERE clauses; preserve legacy `org_id IN ($1,$2)` +
  `ORDER BY occurred_at DESC, id DESC` keyset cursor. `queryAuditByTarget`
  already shows subject-filter + cursor style to mirror.
- **Worker** `pagination.ts` (parses ONLY limit/cursor today; cursor v1 = base64
  `{v,t,i}`, ISO_TS_RE / UUID_RE validation) + `handlers/list-audit.ts`
  (CATEGORY_RE only) — parse + validate new params, 400 on malformed from/to.
- **Contracts** `events.ts` — extend `AuditQueryByOrg` (category-only today);
  do NOT widen `PublicAuditEntry`/envelope; org_id-always rule intact.
- **SDK** `events.ts` — extend `ListAuditEntriesQuery` `by:"org"` arm +
  `buildAuditRequest` + iterator per-page query reconstruction (filters must
  survive pagination); add NDJSON export helper over `iterAuditEntries`.
- **CLI** `cross-reads.ts` `auditListCommand` + `cli-runner.ts:179` — add
  `--actor/--actor-type/--subject-kind/--subject-id/--event-type/--from/--to`
  flags + NDJSON export mode; update usage.
- **Console** `audit/page.tsx` — filter UI + Load-more cursor pagination + export
  button, SDK-only via `wrap()`, U4/U8 designed empty + loading states.
- Tests on every surface; Console leg DEPLOY-GATED (verifier PASS gate =
  post-merge main-CI + live prod-Worker probe).

May land as 1 PR or a SDK-before-consumers sequence. Implementer MUST branch +
commit + push + open ≥1 PR and write `ai/reports/task-0121-implementer.md`.

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

1. **Task 0121 verifier** — emit once the implementer report lands (Console leg
   is deploy-gated: PASS gate = post-merge main-CI + live prod-Worker probe).
2. **B7 follow-on / security-events surface** — `querySecurityEvents` consumer
   exposure is a separate leg (explicitly out of scope for 0121).
3. **`VALID_CONTEXTS` drift-proofing (hygiene)** — derive the test array from
   the `BoundedContext` union via `as const`. Low priority.
4. **B8 admin-worker** — greenfield; later.

Deferred (Deferred Decision Protocol, human input required, NOT picked):
`0085b` (cloudflare-domain v4→v5), `notifications-provider-swap`,
`notifications-worker-dev-reframe`, `optional-spec-13-commands`.

Repo health: green. main code HEAD `99877e0`. 0 open PRs. Task 0121 awaiting
implementer pickup.
