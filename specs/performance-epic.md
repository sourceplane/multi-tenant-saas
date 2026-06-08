# Performance Epic — Server-Side Latency

Status: Normative direction. This is the detailed companion to the
**Performance & Caching (PERF)** cluster in `specs/roadmap.md`. The roadmap keeps
the one-line index per task; this epic owns the measurement record, the
root-cause analysis, and the per-task plans. Sequencing remains the
Orchestrator's call.

Last re-measured: **2026-06-08** (live stage + prod, warm, no cold start unless
noted). Supersedes the stale 2026-06-02 baseline embedded in the roadmap.

## Purpose

Make authenticated reads feel instant. The original PERF cluster (PERF1–PERF4)
was scoped against a 2026-06-02 baseline that blamed three things: per-request DB
connection setup, uncached bearer resolution, and serial multi-hop fan-out. Those
have all shipped — and a fresh end-to-end measurement shows the latency budget
has **moved**. The dominant remaining cost is no longer the database or the auth
fan-out; it is the **edge rate limiter doing a Workers-KV read-modify-write on
every request, before authentication, twice for org-scoped routes**. This epic
records that finding and schedules the work to fix it, plus the remaining
cold-start and observability gaps.

End-state target: **p50 authed read < 150ms server-side** (warm), the console
instant on navigation, and every hot-path phase measurable in prod.

## How this was measured (2026-06-08)

Black-box TTFB against the live workers, no privileged access:

- Edge: `https://api-edge-{stage,prod}.rahulvarghesepullely.workers.dev`
- Console: `https://{stage,prod}.sourceplane.ai`
- `curl -w '%{time_starttransfer}'`, 12 warm samples per probe (first discarded as
  cold), p50 reported. Network/TLS to the nearest colo is ~40–50ms and is included
  in every number below.

Probes were chosen to **isolate one cost at a time** by exploiting which code
paths each route does and does not execute:

- **OPTIONS preflight** returns from `handlePreflight` *before* routing and before
  `replayOrExecute` → pure warm edge floor, **no rate limiter**.
- **`/health`** is handled inline in `index.ts` and **bypasses the rate limiter**,
  but does a real Hyperdrive DB ping → isolates the DB round-trip.
- **`GET /v1/organizations`** has no `:orgId` path segment → the limiter evaluates
  **one** bucket (identity) → one KV get+put.
- **`GET /v1/organizations/:org/...`** → the limiter evaluates **two** buckets
  (org + identity) **sequentially** → two KV get+put round-trips.
- All authed reads short-circuit at `resolveActor` for a missing/invalid token, so
  a no-token probe still pays the full rate-limiter cost that runs *before* it.

## Live measurements (prod, warm p50 TTFB)

| Probe | p50 | What it isolates |
| --- | --- | --- |
| `OPTIONS /v1/organizations` (preflight) | **56ms** | true warm edge floor (no rate limiter) |
| `GET /v1/zzz` → 404 | 56ms | routed edge floor (no rate limiter) |
| `GET /health` (Hyperdrive DB ping) | **62ms** | full DB round-trip, **no rate limiter** |
| `GET /v1/organizations` (1 RL bucket) | **190ms** | floor + **1× KV get+put** |
| `GET /v1/organizations/:org/projects` (2 RL buckets) | **320ms** | floor + **2× KV get+put**, sequential |
| `GET /v1/organizations/:org/billing/summary` (2 RL buckets) | 332ms | floor + 2× KV get+put |
| `GET /v1/auth/profile` bad-token | 225ms | floor + 1 bucket + identity-worker hop |

Stage tracks prod within noise. Cold isolates (first hit after idle) add **0.9–1.6s**
at the edge and **1.4–1.8s** for console SSR; warm console SSR is ~120–160ms.

Derived costs:

- **Edge floor (warm): ~56ms.**
- **DB round-trip via Hyperdrive: +6ms** over floor → the DB is *no longer a
  problem*. Hyperdrive's connection pool absorbs the handshake even though each
  worker still creates and disposes a `postgres` client per request.
- **Each rate-limit bucket: ~130ms**, and the two buckets are evaluated in a
  serial `for` loop → an org-scoped read spends **~264ms in the rate limiter
  before the actor is resolved and before any data is read.** That is ~80% of the
  warm server time on a hot read.
- **Identity-worker hop (uncached bearer): ~35ms** — cheap; the PERF2 cache makes
  the warm-hit case ~0ms.

## Root-cause analysis

### 1. The rate limiter is the #1 hot-path cost (new finding, undocumented)

`apps/api-edge/src/rate-limit.ts` implements a token-bucket limiter whose state
lives in Workers KV. `enforceRateLimit` runs *first* inside `replayOrExecute`
(`idempotency.ts:163`), which wraps **every** facade route — reads included, and
**before** `resolveActor`. For each bucket it calls `consumeToken`, which does a
`kv.get` followed by a `kv.put` (read-modify-write) on **every request**.

Why this is slow and structural — not a cold-cache artifact:

- **KV writes are not colo-local.** A `kv.put` propagates to KV's central store;
  it is not a free edge cache write. Measured ~130ms per bucket, stable under
  rapid fire on a single hot key (no warm-up improvement), because every request
  writes.
- **The read-modify-write defeats KV's edge read cache.** A `kv.get` immediately
  after a `kv.put` to the same key cannot be served from the colo read cache, so
  the get pays a cross-region read too.
- **The two buckets are sequential.** `enforceRateLimit` loops
  `for (const b of buckets) await consumeToken(...)`, so org + identity buckets
  serialize → ~2× the cost on every org-scoped route (which is most of them).
- **It runs before auth.** Even a request that will 401 pays the full KV tax.
- **Wrong primitive.** KV is a read-optimized, eventually-consistent store; it is
  the wrong backend for a per-request mutable counter. The code itself documents
  "last-writer-wins under concurrent retry" — i.e. the limit is also *inaccurate*
  under the exact load it exists to bound, in addition to being slow.

This is the single biggest lever available today.

### 2. The DB path is solved — by Hyperdrive, not by connection reuse

`/health` does a real DB ping in 62ms (p50). The 2026-06-02 baseline measured
DB-touching reads at 1–3s and blamed per-request `postgres()` create + `sql.end()`.
That tax is gone in practice because **Hyperdrive pools the upstream connection**;
the per-request client connects to Hyperdrive's local socket, not the origin.

Note the correction to the roadmap: **module-scoped connection reuse (Task 0134)
was reverted** (PR #227). The Workers runtime rejects reusing a socket opened in
one request from another ("Cannot perform I/O on behalf of a different request"),
and the self-heal retry did not reliably recover; it broke membership/billing on
stage. The current `createSqlExecutor` is intentionally per-request
(`packages/db/src/hyperdrive/executor.ts:27`). **Do not retry isolate-scoped reuse
without a stage canary — and it is no longer necessary**, because Hyperdrive
already carries the win.

### 3. The bearer cache (PERF2) does not cover `/v1/auth/*`

`resolveActor` caches successful bearer→actor resolutions in the Cache API
(`actor-cache.ts`), which is colo-local and fast — but only the org/project/
billing/audit/membership facades call `resolveActor`. The **auth facade forwards
`/v1/auth/profile` (and friends) straight to identity-worker** and never consults
the edge cache, so every profile read pays the identity hop. Low impact today
(~35ms) but worth closing once the rate limiter is fixed.

### 4. Cold starts add 1–2s

First hit to a cold isolate is ~0.9–1.6s at the edge and ~1.4–1.8s for console
SSR. With low/bursty traffic, a meaningful share of real user requests hit a cold
isolate. This is invisible in warm p50 but dominates p99 and "first click feels
slow" complaints.

### 5. PERF4 `Server-Timing` has a blind spot exactly where the cost is

PERF4 (Task 0133) instruments each facade with `createTimings()` — but the timing
block starts *inside* the `replayOrExecute` thunk, **after** `enforceRateLimit`
has already run. So the ~264ms rate-limiter cost is in **none** of the
`edge_auth` / `edge_downstream` / `edge_total` phases. The "prod latency is now
measurable" claim is true only for the part of the request that was already cheap.

## Status ledger

### ✅ Completed

| Task | Scope | Status |
| --- | --- | --- |
| **PERF1** (0130) | Console client cache (TanStack Query), SWR, prefetch | Shipped — PR #216 |
| **PERF2** (0131) | Edge bearer→actor cache (Cache API, token-hash key, 30s TTL, logout-evict) | Shipped — PR #220 |
| **PERF3** (0132) | Parallel `getBillingSummary`, member-list N+1 fix, query efficiency | Shipped — PR #221 |
| **PERF4** (0133) | Parallelize authorize∥read on hot reads; `Server-Timing` + structured timing | Shipped — PR #230 |
| **PERF5 Stage A** | Reads → in-isolate limiter (zero I/O); write buckets parallelized | Shipped & verified — PR #245 |
| **PERF5 Stage B** | Durable-object write counters (atomic, no KV write on the hot path) | Shipped & verified — PR #246 |

The roadmap should be read as: **PERF1–PERF5 all shipped.** Only PERF4 originally
carried a ✅ there; PERF1–3 were mislabelled as pending and PERF5 was scheduled —
all corrected by this epic.

#### PERF5 — rate limiter off the KV hot path → Durable Objects ✅

The edge token-bucket limiter ran on **every** request before auth and did a
Workers-KV `get`+`put` per bucket, with the org+identity buckets evaluated
serially → **~264ms on every org-scoped read** (~80% of warm server time) and
the documented "last-writer-wins" inaccuracy on writes. Shipped in two stages:

- **Stage A (PR #245)** — safe (read) methods use a colo-local, zero-I/O
  in-isolate token bucket; unsafe (write) buckets are evaluated concurrently
  (`Promise.all`). Reads leave the KV path entirely.
- **Stage B (PR #246)** — the durable write counters move from KV to a
  `RateLimiterDO` Durable Object (one instance per `(scope,key)` bucket). The
  DO's single-threaded execution makes the consume **atomic** (fixing the race)
  with no central KV write on the hot path. `enforceRateLimit` prefers the DO,
  falls back to the Stage A KV limiter when the binding is absent (dev/local),
  then to fail-open. First Durable Object in the repo; `v1` sqlite migration on
  local/dev/stage/prod, validated with `wrangler --dry-run` on every env.

**Verified live (prod, warm p50 TTFB):**

| Path | Original | Stage A | Stage B |
| --- | --- | --- | --- |
| `GET …/projects` (read) | 320ms | 58ms | **56ms** |
| `GET …/billing/summary` (read) | 332ms | 62ms | **53ms** |
| `POST …/projects` (write) | ~320ms | 221ms | **65ms** |

Org-scoped reads dropped **~5.5×** and writes **~5×**; both now sit near the
~55ms edge floor. The DO-backed write returns correct, decrementing
`X-RateLimit-*` counters, confirming the limiter is both faster and race-free.
The epic SLO (org read p50 < 150ms) is beaten ~3× and writes now meet it too.

### ⛔ Deferred / abandoned

- **Module-scoped DB connection reuse (Task 0134) — abandoned (reverted, PR #227).**
  Runtime-incompatible (cross-request socket reuse is forbidden) and made
  unnecessary by Hyperdrive pooling. Do not re-attempt without a stage canary and
  a measured reason.
- **Reverse-lookup index migration** (`organization_members (subject_id, …)` /
  role-assignment subject index) — split out of PERF3, never shipped. Still open;
  folded into **PERF9**.
- **Hyperdrive cache-eligibility audit** (verify reads are non-transactional +
  parameterized so Hyperdrive query caching engages) — split out of PERF3, never
  shipped. Folded into **PERF9**.
- **Analytics Engine p50/p95 dashboards** — named as a PERF4 follow-up; folded
  into **PERF6** so it lands together with closing the Server-Timing blind spot.

### 🗓️ Scheduled (new)

Ordered by impact ÷ effort. With PERF5 shipped, **PERF6 is the headline** — it
makes the gains measurable in prod and closes the PERF4 Server-Timing blind spot.

#### PERF6 — Make the whole edge request measurable + ship p50/p95 dashboards

**Problem:** the rate-limit + idempotency gate is invisible to PERF4's timings
(root cause #5), and the Server-Timing data is not aggregated anywhere.

**Plan:**
- Wrap `enforceRateLimit` and the idempotency lookup in the timing helper and emit
  `edge_ratelimit` and `edge_idem` phases on the edge `Server-Timing` header, so
  one response carries the *complete* end-to-end breakdown including the gate.
- Wire the emitted `Server-Timing` metrics into **Analytics Engine** (already a
  platform baseline) and stand up per-route **p50/p95 dashboards**. This folds in
  the deferred PERF4 follow-up.
- Add a tiny synthetic prober (cron) hitting the isolation probes in this doc so
  the floor / DB / rate-limit / hop costs are trended over time, not just measured
  once by hand.

**Owner:** `apps/api-edge` + `packages/contracts/timing` + Analytics Engine sink.
**Acceptance:** a single prod response's `Server-Timing` sums to its observed TTFB
within tolerance; dashboards show per-route p50/p95.

#### PERF7 — Cold-start reduction (edge + console SSR)

**Problem:** 0.9–1.8s on cold isolates (root cause #4), dominating p99.

**Plan:**
- Measure per-worker bundle size and cold-eval time; lazy-load heavy/rare-path
  deps (e.g. base64/crypto helpers, provider adapters) so the hot path's eval
  cost is minimal.
- Evaluate **Smart Placement** for the DB-touching workers and a low-frequency
  **keep-warm cron** (or min-instances if/when available) for the edge and console
  to keep at least one isolate hot in the primary colos.
- For console SSR, trim the server bundle and confirm static shell is served from
  cache so first paint does not wait on a cold render.

**Owner:** all workers + `web-console-next`. **Acceptance:** cold-start p95 for the
edge under ~600ms; console cold TTFB under ~800ms.

#### PERF8 — Edge response cache for safe GETs

**Plan:** cache safe, authorizable GETs at the edge (Cache API / `s-maxage` +
`stale-while-revalidate`), keyed by actor + scope + route with a short TTL, and
invalidate on the corresponding mutation. Pairs with PERF1 (client SWR) so a
navigation can be served entirely from cache and revalidated in the background.
This is the "Cloudflare Cache API / Tiered Cache" item from the roadmap's
suggested-resources list, now scoped. **Owner:** `apps/api-edge`. **Out:**
per-user private data that cannot be safely shared across the colo cache (keep
those client-cache-only via PERF1).

#### PERF9 — At-scale DB + the deferred PERF3 leftovers

**Plan (lower priority until traffic warrants):**
- Ship the **reverse-lookup index migration** deferred from PERF3 (own migration
  PR with manifest/checksum entry).
- Complete the **Hyperdrive cache-eligibility audit** (reads non-transactional +
  parameterized).
- When read traffic warrants it, add a **Supabase read replica + Hyperdrive read
  routing** to offload reads from the primary.

**Owner:** `packages/db` + infra. **Acceptance:** index present and used by the
membership reverse lookup; Hyperdrive query-cache hit-rate confirmed; replica
routing behind a flag.

## Target SLOs (warm, server-side p50 unless noted)

| Surface | Pre-PERF5 | Now (post-PERF5) | Target |
| --- | --- | --- | --- |
| Edge floor | 56ms | 56ms | ≤ 60ms |
| DB round-trip (Hyperdrive) | 62ms | 62ms | ≤ 70ms |
| Org-scoped authed read (rate-limit portion) | ~264ms | **~0ms** ✅ | — |
| Org-scoped read (no-token probe, end-to-end) | ~320ms | **~55ms** ✅ | **< 150ms** |
| Org-scoped write (no-token probe, end-to-end) | ~320ms | **~65ms** ✅ | < 150ms |
| Edge cold-start p95 | ~0.9–1.6s | ~0.9–1.6s | ≤ 600ms (PERF7) |
| Console SSR cold TTFB | ~1.4–1.8s | ~1.4–1.8s | ≤ 800ms (PERF7) |

## What this document is not

- Not a delivery-date list — sequencing is the Orchestrator's call.
- Not a replacement for the per-component specs under `specs/components/*.md`.
- Not a frozen plan — re-measure before scoping; trust code + live numbers over
  these notes (they were already stale once).
</content>
