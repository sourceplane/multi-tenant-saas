# Performance Plan — UI Response Latency

**Status:** proposed · **Owner:** platform · **Date:** 2026-06-03
**Basis:** live stage Server-Timing measurements (post-PERF4) + full client/server code audit.
Builds on the merged PERF cluster (PERF1 client cache, PERF2 edge bearer cache,
PERF3 query efficiency, PERF4 parallelize authorize∥read + Server-Timing).

---

## 1. Executive summary

The console still *feels* slow because of three compounding facts, now measurable
via the PERF4 `Server-Timing` headers on stage:

1. **Every database round-trip costs ~440 ms** (edge → Hyperdrive → Postgres),
   regardless of query complexity. A trivial indexed list and a single role
   lookup both land at ~440–470 ms. This is the dominant floor.
2. **The authorization-context hop is on the critical path of every org-scoped
   read** and is itself one of those ~440 ms round-trips (membership-worker opens
   its own DB connection to read the caller's roles). PERF4 hid it *behind* the
   resource read via `Promise.all`, but it still sets the floor.
3. **Cold bearer resolution adds ~950 ms**, re-paid every 30 s (the actor-cache
   TTL), because a cache miss makes a fresh identity-worker call that runs **two
   sequential** DB queries (`session` then `user`) on a new connection.

On top of the server floor, the **client** compounds perceived latency with a
few uncached pages, one navigation waterfall, and an auth-hydration flash.

### Measured baseline (stage, server-side `edge_total`, warm bearer)

| Endpoint | `edge_total` | Phase breakdown | DB round-trips |
|---|---|---|---|
| `GET /organizations` | ~460 ms | 1 membership query | 1 |
| `GET …/projects` | ~470 ms | authctx ~450 ∥ db ~450 | 1 (parallel) |
| `GET …/audit` | ~546 ms | authctx ~470 ∥ db ~450 | 1 (parallel) |
| `GET …/members` | **~930 ms** | authctx ∥ db (~450) **+ enrich ~425 serial** | 2 |
| `GET …/billing/summary` | **~956 ms** | authz ~450 ∥ db ~880 (2 queries) | 2 |
| `GET …/billing/plans` | ~757 ms | 2 queries, no cache | 2 |
| `GET …/billing/entitlements` | ~852 ms | 2 queries, no cache | 2 |
| **Cold bearer add** | **+~950 ms** | identity: 2 sequential queries + new conn | every 30 s |

> Note: client-observed TTFB is `edge_total` + network RTT + any **client-side
> waterfall** (a page that fires two dependent requests pays ~2× the floor) +
> the cost of **uncached** pages refetching on every visit.

### Root-cause hierarchy (highest leverage first)

```
A. The ~440 ms DB round-trip floor            ← attack with caching + locality
   ├─ paid by authctx on EVERY org read        ← cache the authorization context
   ├─ paid by the resource read                ← edge/Hyperdrive caching
   └─ paid 2× by members/billing               ← fold round-trips into 1
B. Cold bearer ~950 ms every 30 s              ← longer TTL + KV + 1-query identity
C. Client waterfalls / uncached pages          ← finish the client-cache story
D. Per-request connection + executor churn     ← share executors, confirm pooling
```

The single most important unknown is **why one round-trip is ~440 ms** when an
indexed Postgres query should be <50 ms. Milestone **M0** exists to settle that
before we spend effort on the wrong layer.

---

## 2. Milestones

Each milestone lists: **Goal · Problem (measured) · Changes · Infra resources ·
Effort · Risk · Expected impact · Verification.** Milestones are ordered by
leverage; M0 is a prerequisite gate.

---

### M0 — Pin the root cause of the ~440 ms round-trip (enabler) 🔬

**Goal:** Know *what* the ~440 ms is — network RTT (edge↔Supabase region), cold
Hyperdrive pool, Hyperdrive caching disabled, TLS/connection setup, or
prepared-statement protocol round-trips — before committing to infra changes.

**Problem (measured):** every DB phase is ~440 ms and *flat* across query
complexity (a projects list = a single role lookup = ~450 ms), which points to a
**fixed per-round-trip cost**, not query work. billing `db≈879 ≈ 2×440` and
members `db 430 + enrich 425` confirm the cost is **per round-trip**, not
per-connection.

**Changes:**
- Add a temporary stage-only diagnostic route in one worker that times, on a
  single executor: (a) `createSqlExecutor` + first `SELECT 1` (connection cost),
  (b) 5 sequential `SELECT 1` (per-round-trip RTT), (c) 1 indexed real query
  (query cost). Emit each via `Server-Timing`.
- Read the Cloudflare Hyperdrive config for this account: is **query caching**
  enabled? what is the **origin region** vs the colos serving stage? is **Smart
  Placement** on for the workers?
- Wire **Analytics Engine** (infra below) so we get p50/p95 per phase/route going
  forward instead of one-off curls.

**Infra resources:** Analytics Engine (observability); Cloudflare dashboard
read of the Hyperdrive instance.

**Effort:** 1–2 days · **Risk:** none (diagnostic, removed after).

**Expected impact:** decides whether M4 (locality/Hyperdrive caching, possibly a
~2-click win) or M1/M3 (app-level caching/round-trip reduction) is the bigger
lever. If the 440 ms is region RTT + Hyperdrive caching off, that single config
change may cut the floor by 5–10×.

**Verification:** the diagnostic clearly attributes the 440 ms to one of
{connection, per-RTT, query, region}; Analytics Engine shows live p50/p95.

---

### M1 — Cache the hot read path at the edge + KV (biggest server win) 🟢

**Goal:** Stop hitting Postgres on the hot read path. Turn ~440–950 ms reads into
~5–50 ms cache hits.

**Problem (measured):** the **authorization-context hop is ~450 ms on every
org-scoped read** (projects/audit/members/billing all pay it). Plus `plans`
(~757 ms) and `entitlements` (~852 ms) are near-static yet uncached.

**Changes (in priority order):**
1. **Authorization-context cache** — cache `(subjectId, orgId) → memberships`
   (the membership-worker `authorization-context` result) in **Workers KV**
   (durable, cross-isolate) with a short TTL (10–30 s) and a generation/version
   key per org. Each worker's `fetchAuthorizationContext` checks KV first. This
   removes the ~450 ms authctx round-trip from *every* hot read — the
   highest-leverage server change after M0. **Invalidate** on membership
   mutations (invite accept, role change, remove) by bumping the org's generation
   key.
2. **Edge-cache safe GETs** via the Workers **Cache API** keyed by
   `(path, actor, orgId)` with `s-maxage` + `stale-while-revalidate`:
   - `billing/plans` (org-agnostic, near-static) → long TTL (e.g. 5 min).
   - `billing/entitlements`, `billing/summary` → short TTL (15–30 s) + SWR.
   - `projects`, `members`, `audit` → very short TTL (5–10 s) + SWR (instant
     repeat-nav; correctness preserved by SWR revalidation + write invalidation).
   Add a `cacheControl`/`cache: {ttl, swr}` option to each worker's
   `successResponse` and an edge-cache wrapper in the api-edge facades.
3. **Write-path invalidation:** on a successful mutation in a context, purge the
   matching edge keys and bump the KV generation for that org.

**Infra resources:** **Workers KV** (already bound on api-edge — add a
`AUTHZ_CACHE`/reuse namespace) for the authctx cache; **Workers Cache API**
(no new resource) for edge GET caching. Optionally **Tiered Cache** for
cross-colo hit-rate.

**Effort:** 4–6 days · **Risk:** medium — cache invalidation correctness. Mitigate
with short TTLs, generation keys, and SWR (never serve indefinitely stale), plus
per-actor keying so no cross-tenant leakage.

**Expected impact:**
- authctx cache hit removes ~450 ms from **every** hot read → projects/audit
  ~470 ms → **~50–250 ms**; members ~930 → **~450–500 ms**; billing ~956 →
  **~450–500 ms**.
- edge-cache hit on plans/entitlements/summary → **~5–20 ms**.

**Verification:** stage Server-Timing shows `authctx` ~5 ms on cache hit; a
membership change invalidates within one TTL; no cross-actor data served (add an
explicit test). p50 for projects/audit < 250 ms.

---

### M2 — Crush the cold bearer-resolution path 🟢

**Goal:** Pay the ~950 ms cold bearer far less often, and make it cheaper when paid.

**Problem (measured):** `edge_auth` ~950 ms cold vs ~3–20 ms warm; re-paid every
30 s (actor-cache TTL). Cold = identity-worker fetch → new connection → **two
sequential** queries (`getSessionByTokenHash` then `getUserById`).

**Changes:**
1. **Extend actor-cache TTL** 30 s → 120 s. Revocation is already handled
   eagerly: logout evicts the token (`auth-facade.ts`), so the only lag is for
   admin-revoked sessions — acceptable at ≤2 min, and tunable.
2. **Promote the actor cache to Workers KV** (durable, cross-isolate, cross-colo)
   as the primary store (Cache API as L1, KV as L2), so a warm session that
   lands on a different isolate/colo doesn't re-pay the cold path. Logout writes
   a short-lived KV tombstone for cross-colo revocation.
3. **Single-query identity resolve:** replace the sequential `session` +
   `user` lookups with **one JOIN** (`sessions ⋈ users`) in
   `resolve-bearer`/`auth.ts`. Halves the cold DB cost.

**Infra resources:** **Workers KV** for the durable actor cache + revocation
tombstones.

**Effort:** 2–3 days · **Risk:** medium — revocation semantics. Mitigate with the
tombstone + a conservative TTL and an explicit revocation test.

**Expected impact:** cold-bearer frequency drops ~4× (30 s→120 s) and is largely
eliminated cross-isolate by KV; when paid, ~halved (one JOIN). First-paint after
idle drops from ~1.4 s to ~0.5 s.

**Verification:** Server-Timing `edge_auth` stays low across isolates after a
warm-up; a revoked session is rejected within the tombstone TTL across colos.

---

### M3 — Reduce DB round-trips inside the workers 🟡

**Goal:** Remove the *second* serial round-trip on the 2-round-trip endpoints.

**Problem (measured):** `members` pays `enrich ~425 ms` as a **serial** 2nd query
after the page read (total ~930 ms). `billing/summary` `db ~880 ≈ 2×440`
(two sequential query phases). Single-item GETs (`get-project`, etc.) still do
authctx **then** policy serially (PERF4 only parallelized list handlers).

**Changes:**
1. **members:** fold the page role-enrichment into the page query — one statement
   returning members + their role assignments (LATERAL join / `json_agg`), so the
   handler does a single round-trip instead of `listMembersPaged` + a second
   `listRoleAssignmentsForSubjects`.
2. **billing/summary:** collapse the two query phases into a single round-trip
   where possible (one query / CTE), or confirm they truly overlap.
3. **Parallelize single-item GETs:** apply the PERF4 `Promise.all(authctx, read)`
   pattern to `get-project`, `get-environment`, and equivalents.
4. **Share one executor per request:** `create-project` opens up to **3**
   executors (pre-tx count, billing entitlement, tx). Reuse one — removes 2
   connection setups per mutation; have `check-entitlement` accept a shared
   executor.

**Infra resources:** none (pure code).

**Effort:** 3–5 days · **Risk:** low–medium — SQL correctness; covered by repo
jest patterns (dependency-free repo tests) + stage verification.

**Expected impact:** members ~930 → **~480 ms** (one round-trip); billing summary
~956 → **~480 ms**; single-item reads −~400 ms; create-project −~80–120 ms.

**Verification:** Server-Timing shows members with no `enrich` phase / a single
`db`; billing `db` ~440 not ~880; stage end-to-end checks stay 200.

---

### M4 — Infrastructure: DB locality & connection strategy (depends on M0) 🟡

**Goal:** Lower the ~440 ms per-round-trip floor itself.

**Problem:** the floor is fixed per round-trip; if M0 shows it's region RTT or
Hyperdrive caching being off, this is the highest-leverage *infra* fix.

**Changes (gated on M0 findings):**
1. **Enable Hyperdrive query caching** for the read path (Cloudflare-managed,
   transparent) with a short max-age for cache-eligible `SELECT`s — confirm
   `prepare:true`/`sql.unsafe` queries are eligible; if not, adjust the executor.
2. **Co-locate compute & data:** ensure the Supabase Postgres region and the
   Hyperdrive origin are the same, and enable **Smart Placement** on the
   DB-touching workers so compute runs near the origin (cuts edge↔origin RTT
   that's multiplied per round-trip).
3. **Re-evaluate a Workers-safe connection strategy.** Connection reuse was
   reverted (task 0134) due to the cross-request I/O constraint. Re-attempt only
   via a **Hyperdrive-supported pattern** (or `ctx.waitUntil(sql.end())` lifecycle),
   behind a **canary** on stage with the M0 diagnostic as the gate — never a blind
   rollout.
4. **(At scale) read replica + Hyperdrive read routing:** route `SELECT`s to a
   Supabase read replica; primary for writes. Defer until throughput demands it.

**Infra resources:** Hyperdrive (query caching + region), Cloudflare Smart
Placement, (later) Supabase read replica.

**Effort:** 1–2 days for caching/placement; 1 week if a connection strategy is
attempted · **Risk:** low for config; **high** for any connection-reuse retry
(0134 precedent) — canary-gated.

**Expected impact:** if region/caching is the cause, the ~440 ms floor could drop
to ~50–150 ms, compounding with M1/M3 across *all* endpoints — potentially the
single biggest absolute win.

**Verification:** M0 diagnostic re-run shows the per-round-trip cost dropped;
broad Server-Timing `db`/`authctx` medians fall; no connection errors on stage
(the 0134 failure signature) for ≥24 h before any prod promote.

---

### M5 — Client-side perceived latency 🟢

**Goal:** Remove the client-side compounding (waterfalls, uncached pages, auth
flash, missing prefetch) so the server wins are actually felt.

**Problem (audited):**
- **Environments waterfall:** `…/projects/[slug]/environments` fetches the full
  projects list to resolve the slug, *then* fetches environments — two serial
  ~470 ms round-trips before paint.
- **Uncached manual pages:** `audit`, `usage`, `account`, `account/security` use
  raw `useEffect`+`wrap()` (not `useApiQuery`), so they refetch on every visit and
  lose pagination state.
- **Auth-hydration race:** the app shell shows a "Loading session…" flash and can
  bounce deep-links to `/login` before the token hydrates.
- **No prefetch** on the settings sidebar; `refetchOnMount` default causes a dev
  double-fetch.

**Changes:**
1. Eliminate the environments waterfall: add a `projectBySlug(orgId, slug)` query
   (or derive id from slug) and fire environments without waiting on the full
   list.
2. Move `audit`, `usage`, `account`, `security` to `useApiQuery` /
   `useInfiniteQuery` (cache + SWR + persisted pagination).
3. Fix the auth-hydration race: persist/seed the session synchronously so the
   shell paints immediately and deep-links don't bounce; drop the "Loading
   session…" text flash.
4. Add `usePrefetch` on settings-nav + sidebar intent; set
   `refetchOnMount: false` in the query default.

**Infra resources:** none (client only).

**Effort:** 1 week (phase the quick wins first) · **Risk:** low; browser-verify
each flow (Playwright) as in U11.

**Expected impact:** environment nav −~470 ms (one round-trip, not two);
audit/usage/account/security feel instant on repeat; no skeleton flash / login
bounce on reload.

**Verification:** Playwright flows show single-fetch navigation, instant
repeat-nav from cache, and no `/login` bounce on deep-link reload.

---

### M6 — Observability & guardrails (continuous) 🔵

**Goal:** Keep the gains; catch regressions before users do.

**Changes:**
1. **Analytics Engine** sink in every instrumented worker: write the
   `Server-Timing` phases + route + status (no PII) as a data point; build p50/p95
   dashboards per route/phase/org/colo. (Infra already emits the timings;
   `writeDataPoint` is async/non-blocking.)
2. **Performance budgets in CI:** a synthetic stage check asserting `Server-Timing`
   phase ceilings (e.g. projects p50 < 250 ms after M1) so a regression fails the
   pipeline.

**Infra resources:** **Analytics Engine** (binding + dashboards).

**Effort:** 2–3 days · **Risk:** none.

**Expected impact:** durable visibility; regressions caught in CI.

---

## 3. Additional resource implementation details

| Resource | What it accelerates | How to integrate | Cost / risk |
|---|---|---|---|
| **Workers KV** (already bound on api-edge) | Durable, cross-isolate/colo caches: **authorization-context** (M1), **actor/bearer** L2 + revocation tombstones (M2), plans/entitlements/org metadata | Add namespace binding(s); read-before-DB in `fetchAuthorizationContext` and `resolve-actor`; generation keys for invalidation | KV read ~5–10 ms (slower than Cache API but durable); eventual consistency (~secs to write-propagate) — fine with short TTL + tombstones |
| **Workers Cache API** (no new resource) | Edge caching of safe GETs (M1) with `s-maxage` + `stale-while-revalidate` | Wrap api-edge facade responses; key by `(path, actor, orgId)`; honor worker `cacheControl` | Per-colo only; must key by actor to avoid cross-tenant leakage; invalidate on write |
| **Hyperdrive query caching** | The ~440 ms read floor (M4) — cache-eligible `SELECT`s served from Hyperdrive's pool | Enable on the Hyperdrive instance; verify `prepare:true`/`sql.unsafe` eligibility; set short max-age | Transparent; stale risk on writes — short TTL + invalidate; **confirm it's actually off today (M0)** |
| **Cloudflare Smart Placement** | Multiplied edge↔origin RTT (M4) — runs DB-touching workers near the origin | Enable `placement.mode = "smart"` in wrangler for DB workers | Low; can regress if origin region is wrong — pair with region check |
| **Supabase region / read replica + Hyperdrive read routing** | The floor at scale (M4) — offload `SELECT`s, co-locate data | Co-locate primary region first; add replica + route reads later | Replica $$ + lag; defer until throughput needs it |
| **Durable Objects** | Hot per-org counters: rate-limit + quota/entitlement checks without a DB hit | One DO per org; in-memory counters, durable on close | Complexity + per-org cold start; adopt only for genuinely hot counters |
| **Analytics Engine** | Observability (M6) — p50/p95 per route/phase/org | `writeDataPoint` after response (async); dashboards | Negligible; no latency impact |

---

## 4. Target outcomes

| Endpoint | Today (warm) | After M1+M3 | After M4 (if floor drops) |
|---|---|---|---|
| projects / audit list | ~470–550 ms | **~50–250 ms** (authctx cached) | ~50–150 ms |
| members list | ~930 ms | **~450–500 ms** (1 round-trip) | ~150–250 ms |
| billing summary | ~956 ms | **~450–500 ms** | ~150–250 ms |
| plans / entitlements | ~750–850 ms | **~5–20 ms** (edge cache) | ~5–20 ms |
| cold first-paint (post-idle) | ~1.4 s | **~0.5 s** (M2) | ~0.3 s |
| environment nav (client) | ~2× floor | **1× floor** (M5) | — |

---

## 5. Sequencing & dependencies

```
M0 (diagnose + Analytics) ──┬─► M1 (edge+KV read caching)  ── biggest server win
                            ├─► M2 (cold bearer: TTL+KV+JOIN)
                            ├─► M3 (round-trip reduction)   ── parallel with M1/M2
                            └─► M4 (infra locality/caching)  ── gated by M0 findings
M5 (client) can start immediately, in parallel (no server dependency).
M6 (Analytics dashboards + CI budgets) lands with M0 and hardens after each.
```

Recommended order: **M0 → (M1 ∥ M2 ∥ M5) → M3 → M4 → M6**, landing each behind a
stage Server-Timing verification (and a canary for anything touching connection
reuse, per the task 0134 lesson).
