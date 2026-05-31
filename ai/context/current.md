# Current Context

Last updated: 2026-05-31 — Task 0121 CLOSED (verifier PASS bookkeeping committed
`2b52d2b`). **Task 0122 SCOPED** — B7 security-events consumer surfaces (SDK
pagination + CLI + Console). Implementer prompt at `ai/tasks/task-0122.md`. Repo
health green; 0 open PRs; sealed snapshot main HEAD `2b52d2b`.

## Active task: Task 0122 — B7 security-events consumer surfaces (Implementer)

**Milestone:** `B7-security-events-consumer-surfaces`. Branch
`impl/task-0122-security-events-surfaces`.

**Selection (trust-code-over-docs).** Roadmap B7 names a "security-events surface"
but inspection this cycle shows the **backend is already fully shipped on main** —
do NOT rebuild it:

- **DB** `packages/db/src/identity/repository.ts` `querySecurityEventsByUser`
  (cursor-keyset paginated; `SecurityEventPageQueryParams` / `…PagedResult`).
- **api-edge** `apps/api-edge/src/auth-facade.ts` proxies
  `GET /v1/auth/security-events` — **actor-scoped, not org-scoped**; envelope
  `{ data: { securityEvents }, meta: { requestId, cursor? } }`.
- **Contracts** `packages/contracts/src/security-events.ts` — `PublicSecurityEvent`
  + `SecurityEventListResponse` (locked, byte-stable).
- **SDK** `packages/sdk/src/securityEvents.ts` `SecurityEventsClient.list()` EXISTS
  but is **flat** — threads no `limit`/`cursor`, drops `meta.cursor`.

**The consumer gap = the milestone.** The new Next.js console
(`apps/web-console-next`) has **no account/security page** (nav is entirely
org-scoped), and `packages/cli` has **no security command**. The old vanilla
console surfaced this (Tasks 0046/0054) but it never carried to web-console-next.

**Three surfaces (mirrors Task 0120 webhook delivery-history byte-for-byte):**

1. **SDK** — plumb `limit`/`cursor` into `SecurityEventsClient` + surface
   `meta.cursor` (additive; keep flat `list()` working); export new types from
   `index.ts`. Cursor opaque — read `meta.cursor ?? null`, forward verbatim.
2. **CLI** — `sourceplane security events` read command: human table +
   `--output=json` + `--limit`/`--cursor` + `--all` seen-cursor guard, mirroring
   `webhook-deliveries.ts`. Pure SDK consumer; **NO `--org`/`resolveOrgId`**
   (actor-scoped).
3. **Console** — account-security page at a **non-org route** (e.g.
   `/account/security`) + dependency-free helper + nav entry; SDK-only via
   `wrap()` (zero `fetch`); empty state + skeleton + cursor Load-more; render only
   safe redacted `PublicSecurityEvent` fields.

**Hard exclusions:** NO contract-shape / api-edge-route / identity-worker / DB
change; NO org-scoping; NO `querySecurityEventsByUser` SQL/cursor/limit change; NO
audit or webhook surface change; NO `ai/deferred.md` or
`infra/terraform/cloudflare-domain/**` / cloudflare provider pin touch.

**Component shape:** multi-component — `sdk` + `cli` (turbo) + `web-console-next`
(cloudflare-pages turbo, **deploy-gated**). May land as 1 combined PR (0120
precedent) or SDK-before-consumers sequence — implementer's call. Console leg's
verifier PASS gate is **post-merge main-CI smoke + live-URL curl**, not PR-CI
alone. **BEHIND-main rebase is the verifier's responsibility** (recurring
0103–0121).

## Next focus after 0122

1. **`VALID_CONTEXTS` drift-proofing (hygiene)** — derive the test array from the
   `BoundedContext` union via `as const`. Low priority.
2. **B8 admin-worker** — greenfield cross-tenant ops surface (spec 16). Later.
3. **B6 Stripe / B1 real auth** — larger baseline legs; B6 waits on U7.

Carry-forward nit (non-blocking): `packages/cli/src/commands/cross-reads.ts`
`parseAuditFilterFlags` doc-comment says malformed input "surfaces as a 400" —
worker returns 422. Comment-only; fold into any future cross-reads touch (Task
0122 MAY fold it if it touches cross-reads, not required).

Deferred (Deferred Decision Protocol, human input required, NOT picked):
`0085b` (cloudflare-domain v4→v5), `notifications-provider-swap`,
`notifications-worker-dev-reframe`, `optional-spec-13-commands`.

Repo health: green. 0 open PRs. Task 0121 closed; Task 0122 scoped + ready for
implementer.
