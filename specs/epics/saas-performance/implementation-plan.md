# saas-performance — Implementation Plan (PERF1–PERF9)

The PERF task ladder, ordered by impact ÷ effort. The measurement record and
per-task *design* rationale live in `design.md`; this is the milestone list with
status + "done when". Status reflects code reality as of 2026-06-08.

## PERF1 — Console client cache, SWR & prefetch — ✅ Shipped (PR #216, Task 0130)
Client query cache (`@tanstack/react-query`-style) with stale-while-revalidate;
cached data renders instantly on navigation and revalidates in background; in-flight
dedupe; org list cached so `OrgScope` stops refetching per page; prefetch on
hover/intent; auth gate moved so the shell paints from cache. Frontend-only.
Owner: web-console-next.

## PERF2 — Edge bearer-resolution cache — ✅ Shipped (PR #220, Task 0131)
Cache the bearer→actor resolution at api-edge (built-in Cache API `caches.default`,
keyed by token hash, short TTL, invalidated on logout) so the identity-worker hop +
its 2 DB queries are skipped on the hot path. Owner: api-edge (+ identity-worker
logout invalidation).

## PERF3 — DB connection reuse & query efficiency — ✅ Shipped (PR #221, Task 0132)
Parallelized `getBillingSummary`; fixed the member-list N+1 with a batched role
query; added the missing membership/subject index. Owner: `packages/db` + handlers.
**Reverted leg:** module-scoped connection reuse (Task 0134, #224/#225) was rolled
back (#227) — the Workers runtime forbids reusing a socket opened in another
request. A later scalar IN-list fix (#228) repaired a batched-lookup bind bug. The
reverse-lookup index migration + Hyperdrive cache audit are folded into **PERF9**.
**Do not re-attempt isolate-scoped reuse without a stage canary** (see risks).

## PERF4 — Hot-path hop reduction, parallelization & latency observability — ✅ Shipped (PR #230, Task 0133)
Collapsed/parallelized the authorization fan-out on hot reads (authorization-context
fetch runs concurrently with the resource read via `Promise.all`, policy applied
after, speculatively-read data discarded on deny — deny-by-default preserved +
tested). Shipped the dependency-free `@saas/contracts/timing` helper; each worker
emits `Server-Timing` (`authctx`/`db`/`policy`/`total`, +`enrich` for members) and
api-edge appends `edge_auth`/`edge_downstream`/`edge_total`. **Blind spot found
2026-06-08:** timing starts inside `replayOrExecute`, so the ~264ms rate-limiter
gate is in none of the phases — PERF6 closes this.

## PERF5 — Take the rate limiter off the KV read-modify-write hot path — ✅ Shipped + verified (PRs #245/#246/#247)
`enforceRateLimit` ran a KV `get`+`put` per bucket on every request, before auth,
org+identity serialized → ~264ms on every org-scoped read. **Stage A (#245):** safe
reads use a zero-I/O in-isolate limiter; write buckets parallelized. **Stage B
(#246):** durable write counters moved to a `RateLimiterDO` Durable Object — atomic,
no KV write on the hot path. **Verified live (#247):** org-scoped reads ~320ms →
~55ms, writes ~320ms → ~65ms (edge floor; beats the <150ms target). Fail-open + KV
fallback preserved.

## PERF6 — Whole-request observability + p50/p95 dashboards — 🛠️ In progress
Extend the timing helper to cover `enforceRateLimit` + idempotency (emit
`edge_ratelimit` / `edge_idem`) so the full request is measurable, then sink
`Server-Timing` to Analytics Engine for per-route dashboards (absorbs the PERF4
follow-up); add a synthetic prober for the isolation probes. Owner: api-edge +
contracts/timing + Analytics Engine.
**Landed:** edge-gate measurability in `Server-Timing` (#248). **Remaining:** AE
sink + per-route dashboards + synthetic prober.

## PERF7 — Cold-start reduction (edge + console SSR) — 🗓️ Planned
Cold isolates add 0.9–1.8s. Shrink bundles + lazy-load rare-path deps; evaluate
Smart Placement and a keep-warm cron / min-instances. Owner: all workers +
web-console-next.

## PERF8 — Edge response cache for safe GETs — 🗓️ Planned
Cache authorizable safe GETs at the edge (Cache API / `s-maxage` + SWR), keyed by
actor+scope+route, invalidated on mutation; pairs with PERF1. Owner: api-edge.

## PERF9 — At-scale DB + deferred PERF3 leftovers — 🗓️ Planned
Ship the reverse-lookup index migration and the Hyperdrive cache-eligibility audit
deferred from PERF3; add a Supabase read replica + Hyperdrive read routing when
traffic warrants. Owner: `packages/db` + infra.
