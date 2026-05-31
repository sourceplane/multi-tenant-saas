# Current Context

Last updated: 2026-05-31 — Task 0120 IMPLEMENTER COMPLETE + VERIFIER SCOPED (orchestrator). Verifier prompt at `ai/tasks/task-0120-verifier.md`. PR #175 OPEN/MERGEABLE/CLEAN at HEAD `60776a0` (base main `180a7ea`, 0 behind), all 11 PR-CI checks green (run 26713434492). main HEAD `180a7ea` (Task 0120 scope) / `269db18` (post-0119 bookkeeping). 1 open PR (#175, awaiting verifier).

## Active task: 0120 — B5 webhook delivery history (VERIFIER scoped)

**Implementer landed PR #175** — one combined PR, 13 files (+1474/-30) across
SDK + Console + CLI + test harness + lockfile + report. Verifier task emitted
(`ai/tasks/task-0120-verifier.md`, 8-phase ADAPTED for the deploy-gated
web-console-next leg: Phase 7 MANDATORY post-merge main-CI deploy + smoke +
live-URL curl per `references/post-merge-deploy-profile-gap.md`). BEHIND-main
rebase = verifier responsibility. The milestone scope (below) is what the
verifier validates the PR against.

What shipped (per implementer report `ai/reports/task-0120-implementer.md`):
- SDK: `listDeliveryAttemptsPage` threads `limit`/`cursor`, reads opaque
  base64 `meta.cursor ?? null` (envelope, NOT body `nextCursor` — vestigial),
  forwards verbatim. +5 tests (sdk 0/0/113).
- Console: dependency-free pure helper `delivery-history.ts` + `DeliveryHistoryPanel`
  on endpoint detail page (status badges, attempt#, httpStatusCode, safe
  failureReason, completed/nextRetry ts, skeleton, EmptyState, cursor Load-more,
  SDK-only via `wrap()`, zero `fetch`).
- CLI: `webhook deliveries <endpointId>` (human table + `--output=json` +
  `--limit`/`--cursor` + `--all` cursor-follow w/ seen-guard, modelled on
  `audit list`). +14 tests (cli 0/0/178).
- Harness: web-console-next-tests 0/0/53.
- 5 latitude decisions: one combined PR; pure-helper Console extraction; CLI on
  `audit list`; DROPPED optional single-`getDeliveryAttempt`; added
  `@saas/contracts` to console test project.

---

### Milestone scope (verifier acceptance reference)

Milestone `B5-webhook-delivery-history`: ship the per-endpoint webhook
delivery-history observability surface **end to end** (Console + CLI + the SDK
plumbing they require). This is the next buyer-credible B5 leg now that
endpoint-CRUD, signing-key rotation, and SDK/CLI symmetry have all landed
(`specs/roadmap.md:79` "per-endpoint delivery history").

**The backend is already shipped on main** (verified by inspection this cycle —
NOT to be rebuilt):

- Contracts: `PublicWebhookDeliveryAttempt` + `ListWebhookDeliveryAttemptsResponse`
  (`deliveryAttempts[]` + `nextCursor`) + `GetWebhookDeliveryAttemptResponse`
  (`packages/contracts/src/webhooks.ts:176-207`), re-exported from
  `packages/sdk/src/index.ts:187-189`.
- Worker: `GET …/endpoints/:id/delivery-attempts` (cursor-paginated, `limit`
  1-100 default 50) + `GET …/delivery-attempts/:attemptId`
  (`apps/webhooks-worker/src/router.ts:71-73,222-241`,
  `handlers/webhook-delivery-attempts.ts`, `pagination.ts`
  DEFAULT_LIMIT=50/MAX_LIMIT=100; cursor = base64 JSON `{v:1,t:createdAt,i:id}`).
- api-edge: webhooks-facade proxies all `/v1/organizations/:orgId/webhooks/`
  routes (delivery-attempts included) and forwards the query string verbatim
  (`apps/api-edge/src/webhooks-facade.ts:7,19-20,64`).

**The milestone = the three missing consumer surfaces:**

1. **SDK plumbing** — `listDeliveryAttempts` / `getDeliveryAttempt` EXIST
   (`packages/sdk/src/webhooks.ts:310-338`) but do NOT thread `limit`/`cursor`
   query params. Plumb them through the transport `query` record following the
   `metering.ts` `buildQueryRecord` pattern.
2. **Console delivery-history panel** — the endpoint detail page
   (`apps/web-console-next/src/app/(app)/orgs/[orgSlug]/webhooks/[endpointId]/page.tsx`)
   shows endpoint metadata + CRUD only. Add a designed delivery-history panel:
   status badge, attempt#, `httpStatusCode`, safe `failureReason`,
   `nextRetryAt`/`completedAt`, skeleton + EmptyState + Load-more via
   `nextCursor` (U4/U8 bars).
3. **CLI `webhook deliveries <endpointId>`** — CLI currently has
   create/verify/sign/secrets-rotate/enable/disable
   (`packages/cli/src/cli-runner.ts:167-173`). Add the deliveries command
   (human + `--json` + `--limit`/`--cursor`), mirroring
   `webhook-disable.ts`/`enable.ts`.

Plus tests on each surface. May land as 1 PR or a short SDK→Console→CLI
sequence (implementer's call; SDK before consumers). Implementer MUST
branch + commit + push + open ≥1 PR before reporting done.

**Hard exclusions:** NO replay/redeliver (zero worker route — spec-proposal
territory); NO contract/db/worker/api-edge behaviour change; NO new server
query filters (worker `parsePageParams` reads ONLY `limit`+`cursor`); NO
secret/raw-body/full-payload render (contract exposes a safe `failureReason`
summary only); NO B2 failure-budget alert wiring.

Multi-component: `sdk` (turbo package) + `web-console-next` (cloudflare-pages
turbo, deploy-gated — post-merge main-CI smoke + live-URL is the verifier PASS
gate) + `cli` (turbo package). BEHIND-main rebase is the verifier's
responsibility (recurring 0103-0119 pattern).

## Just landed: Task 0119 (PR #174, merged `ba274f3`)

Bumped the four deprecated Node-20-runtime GitHub Actions in
`.github/workflows/ci.yml` to Node-24 majors (`checkout@v4`→`@v6` ×2,
`upload-artifact@v4`→`@v7`, `download-artifact@v4`→`@v8`,
`docker/login-action@v3`→`@v4`). Only the transitive `actions/cache@v4`
(pulled in by `sourceplane/orun-action`) still triggers the deprecation
warning — out of scope for this repo. main FULLY GREEN.

## Next focus after 0120

1. **B7 audit-log** — larger multi-PR surface; next-up once B5 closes.
2. **`VALID_CONTEXTS` drift-proofing (hygiene)** — derive the test array from
   the `BoundedContext` union via `as const` so the Task 0117 duplication
   cannot re-break. Low priority.
3. **B8 admin-worker** — greenfield; later.

Deferred (Deferred Decision Protocol, human input required, NOT picked):
`0085b` (cloudflare-domain v4→v5), `notifications-provider-swap`,
`notifications-worker-dev-reframe`, `optional-spec-13-commands`.

Repo health: green. main HEAD `180a7ea` / `269db18`. 1 open PR (#175, awaiting Task 0120 verifier).
