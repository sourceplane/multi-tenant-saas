# Performance gains — PERF10–PERF14 (analysis)

_Authored 2026-06-11. Covers the second-wave work shipped after the PERF1–PERF5
foundation: PERF10 (immutable static caching), PERF11 (console shell/profile
client cache), PERF12a–d (server read-path parallelization + identity JOIN), and
PERF14 (timing-log cost guard). PERF11b, PERF13, PERF14b remain open._

## 0. Method, and the one thing not to double-count

All latency anchors are the **measured warm-p50 TTFB model** from `design.md §Live
measurements` (prod, 2026-06-08, `curl -w time_starttransfer`, 12 warm samples,
network+TLS ~40–50ms included in every figure):

| Anchor | Value | Source |
| --- | --- | --- |
| Warm edge floor | **~56ms** | `OPTIONS` preflight probe |
| DB round-trip (Hyperdrive) | **+6ms** over floor (~62ms) | `/health` ping probe |
| One rate-limit KV bucket | **~130ms** | `GET /v1/organizations` (1 bucket) vs floor |
| Org-scoped read, 2 buckets serial | **~264ms** | `GET …/projects` (320ms) − floor |
| Identity hop, uncached bearer | **~35ms** | `auth/profile` bad-token probe |
| Identity hop, PERF2 cache hit | **~0ms** | warm-hit (colo-local Cache API) |
| Console SSR warm / cold | **120–160ms / 1.4–1.8s** | console probes |

**The critical caveat:** that table was captured *before* PERF5 landed. PERF5
removed the rate limiter from the read hot path (reads now use a colo-local,
zero-I/O in-isolate bucket; writes moved to a Durable Object). So the **~264ms**
that dominated the 320ms org-read is **already gone** — it is a PERF5 win, not a
PERF10–14 win. Everything below is measured/modeled against the **post-PERF5
server time**, i.e. the work that *remains* once the rate limiter is no longer on
the read path. We do not claim any share of the 264ms.

Numbers are flagged **[measured]** (a live anchor above) or **[modeled]** (derived
from anchors + code structure; no live before/after probe for the specific
surface). Where modeled, the derivation is shown so it can be falsified.

---

## 1. PERF10 — immutable `_next/static` caching

**Change:** long-lived `Cache-Control: public, max-age=31536000, immutable` on the
content-hashed `_next/static` assets (was `must-revalidate` → a conditional GET
per asset on every repeat visit). **[verified live]** header present in prod.

**Mechanism of the gain:** Next emits content-hashed filenames, so the asset is
safe to cache forever — a new build changes the URL. Under `must-revalidate` the
browser re-validated **~19 chunks** on every navigation/repeat visit; each is a
network conditional GET that returns `304` (no body, but a full round-trip).

**Gain [modeled]:** ~19 conditional GETs → **0** on repeat visit. At ~40–50ms
RTT, batched over ~6 parallel browser connections ≈ 3–4 serial waves ≈
**~150–200ms of revalidation latency removed from repeat navigation**, plus the
requests are not issued at all (origin/CDN load and the browser's connection
budget are freed for data fetches). First (cold) visit is unchanged — this is a
pure repeat-visit / warm-cache win, and it compounds with PERF11.

---

## 2. PERF11 — console shell + profile on the shared client cache

**Change:** the three highest-traffic non-paginated manual fetches moved onto
`useApiQuery` shared cache keys: sidebar **org switcher** (was a duplicate
org-list fetch *every shell mount*), **scope switcher** (3 uncached
org→project→env calls/mount), **account/profile** (uncached `useEffect`). Profile
save writes back via `setQueryData`.

**Mechanism:** these fire on every shell mount, i.e. on **every navigation**, and
each is an authed edge read. Pre-change they ran uncached and duplicated the
page's own queries; post-change they hit the in-memory react-query cache and
dedupe in-flight requests.

**Gain [modeled]:** ~5 authed reads/navigation (1 org-list dup + 3 scope calls +
1 profile) collapse to cache hits. Per the post-PERF5 model an authed read is
roughly floor + identity-hop + worker read; the dominant effect is **perceived**:
the shell **paints from cache instantly** on navigation instead of awaiting these
five round-trips, which is exactly the design's stated end-state ("console
instant on navigation"). On a cold isolate each avoided read also dodges the
0.9–1.6s cold-start tail — so this also trims p99 on navigation, not just p50.

---

## 3. PERF12a–c — overlap membership-authz with the read

**Change:** 10 serial read handlers across billing / config / webhooks now run
authorization concurrently with the read instead of before it:

```ts
const [auth, data] = await Promise.all([
  timings.measure("authz", () => authorize…(env, actor, orgId, requestId)),
  timings.measure(read,  () => repo.read…()),
]);
if (!auth.ok) return …;   // deny-by-default: the read is discarded on failure
```

`authorize…` resolves the **membership context + policy** (a MEMBERSHIP_WORKER
hop + role/policy eval) — the plan pegs this at **~80–100ms** per handler. Before:
`authz` then read ran serially → `t = authz + read`. After: they overlap →
`t = max(authz, read)`.

**Gain [modeled]:** the handler's server time drops by **≈ min(authz, read)** —
on the order of the read latency (tens of ms) hidden entirely behind the
~80–100ms authz that had to happen anyway. For billing summary/invoices/customer
the overlap is authz∥`resolveBillingOrgHex` (the MO4 parent resolution), same
shape. Applied to every authed read on these surfaces.

**Correctness:** deny-by-default preserved — on `!auth.ok` the speculatively-read
data is discarded before any response. This is enforced by test in each worker;
PERF12c additionally **added** the missing webhooks deny-path test (a pre-existing
coverage gap, now closed).

---

## 4. PERF12d — fold session + user resolve into one JOIN

**Change:** `getSession` ran **two serial DB queries** (`getSessionByTokenHash`
then `getUserById`); replaced with `getSessionWithUserByTokenHash`, a single
`sessions ⋈ users` JOIN returning `{ session, user }`.

**Gain [modeled, anchored]:** one DB round-trip instead of two on every **bearer
cache miss** → **−~6ms** per miss (the measured Hyperdrive round-trip), and it
**halves identity-worker's DB query count** for session resolution. Scope note:
PERF2's bearer cache serves warm hits at ~0ms (no DB), so this is strictly a
cache-miss-path win — first resolve per token, post-eviction, and the `/v1/auth/*`
routes the bearer cache doesn't cover (design §3). Small per-request, but it
removes a query from the busiest authenticated code path and reduces DB load
under connection pressure.

---

## 5. PERF14 — sample the timing logs (cost, not latency)

**Change:** `shouldEmitTimingLog` gates the structured timing `console.log` lines
— always emit when a phase is slow (≥1s, so regressions are never sampled away),
otherwise 1-in-10. The `Server-Timing` **header stays unsampled** (free,
per-response). Wired into the api-edge emit sites (every request flows through
the edge — the single largest log source).

**Gain [modeled]:** ~**90% reduction** in timing-log line volume on the edge.
Against the documented exposure of **~$50–80/mo** in Workers Logs ingestion at
50M req/mo, that is **~$45–72/mo avoided**, with the slow-path always retained so
observability of real regressions is unaffected. No latency change (logging is
post-response); this is a pure run-cost guard.

---

## 6. Representative end-to-end before/after (this session's deltas only)

Three journeys, holding the post-PERF5 baseline fixed and applying only PERF10–14:

| Journey | Before (post-PERF5) | After PERF10–14 | Delta | Basis |
| --- | --- | --- | --- | --- |
| **Console repeat navigation** | ~19 asset revalidations + 5 uncached shell reads | static from cache, shell from react-query | **~150–200ms revalidation + 5 round-trips removed; shell paints instantly** | modeled (PERF10+11) |
| **Authed billing/config/webhooks read** | `authz(~80–100ms) + read` serial | `max(authz, read)` | **−(read) ≈ tens of ms/read** | modeled (PERF12a–c) |
| **Bearer cache-miss auth** | 2 serial DB queries | 1 JOIN | **−~6ms, −1 query** | anchored (PERF12d) |

**Run-cost:** **−~$45–72/mo** Workers Logs at 50M req/mo (PERF14), zero latency
cost.

The honest headline: after PERF5 fixed the one ~264ms structural cost, the
remaining server time is already close to the design's **<150ms warm p50** target.
PERF10–14 are the **second-order** layer — they attack repeat-visit asset/network
overhead, redundant client fetches, residual serial server phases, an extra DB
round-trip, and log run-cost. The largest *user-perceived* win here is **console
navigation feeling instant** (PERF10+PERF11 together); the largest *server* win is
**removing the serial authz wait** (PERF12a–c); the largest *cost* win is the
**log sampling** (PERF14).

---

## 7. What is measured vs. modeled, and remaining headroom

**Measured live:** PERF10 header in prod; all §0 anchors. **Modeled** (no
per-surface live before/after probe): the PERF11/PERF12 deltas — derived from the
anchors + code structure, falsifiable via the now-broader `Server-Timing` phases.
The cleanest way to convert these from modeled→measured is PERF6b (wire the
`Server-Timing` phases into Analytics Engine dashboards) + PERF14b (instrument the
~20 handlers that still emit no phases) — then `authz` vs `read` overlap and the
JOIN saving are directly visible in prod percentiles.

**Remaining headroom (not in this session):**

- **PERF7 cold starts** — `+0.9–1.6s` edge / `+1.4–1.8s` SSR on first hit
  dominates p99; untouched here and the biggest p99 lever left.
- **PERF13 hot-fact micro-cache** — short-TTL cache of authz-context + near-static
  reads would let the PERF12 `authz` phase hit memory instead of the membership
  hop on repeat reads (TTL ~30–60s, revoked roles honored within the window).
- **PERF8 edge GET cache / PERF9 DB index+replica** — further read-path and
  query-shape wins from the original ladder.
- **PERF14b** — Server-Timing coverage for the ~20 uninstrumented handlers, so the
  modeled figures above become measured.
