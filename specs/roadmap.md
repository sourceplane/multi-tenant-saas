# Architect Roadmap

Status: Normative direction. Sequencing is the Orchestrator's call.

## Purpose

This document captures the forward direction for the Sourceplane SaaS starter
in three clusters: **Baseline SaaS (B)**, **UI / Design (U)**, and
**Product Areas (P)**. It is the single place an orchestrator should read to
understand which leg of the roadmap a candidate task belongs to and what the
durable end-state looks like.

It is not a Gantt chart. The Orchestrator chooses sequence based on repo
reality, dependency unlocks, and risk. Items inside a cluster are not strictly
ordered. Each item is a candidate scope for one coherent PR-sized task (or a
small number of follow-up tasks if a clean split exists).

The architect-style ground rules:

- Trust code reality over stale docs.
- Prefer the largest coherent reviewable unit with one primary outcome.
- Bounded contexts are non-negotiable; deployment count is.
- Every product surface must look credible to an external buyer before being
  declared done.
- Every internal seam must be extraction-safe before being declared done.

## Baseline SaaS (B) — table-stakes the starter must own

### B1 — Real authentication

Replace email-code + bearer-token paste with a production-credible auth surface.
At minimum: passwordless email magic link via a real email provider behind a
contract (see B2), plus at least one OAuth provider (GitHub or Google). Bearer
token import remains as a dev-only affordance. Auto-create a personal
organization on first login so the user lands in a working scope, not a chooser
screen.

Owner: identity-worker + membership-worker.
Depends on: B2 for email delivery.
Out: SSO/SAML (see B10), SCIM (see B10).

### B2 — Notifications worker (real email)

Stand up `apps/notifications-worker` per spec 14. Adapter pattern behind a
provider contract (Resend / Postmark / SES). Templates for: magic-link login,
invitation, billing receipt, security alert, webhook-down alert, generic
transactional. Preferences API per identity. Delivery state recorded in events.

Owner: new notifications-worker.
Depends on: nothing hard; unlocks B1, B3 invitation flow polish, B5 webhook
observability alerts, billing receipts.
Out: in-app inbox UI (P4 surfaces it; this task ships the worker).

### B3 — Edge idempotency and rate limiting

Generalize idempotency at `api-edge` for unsafe POSTs (current open risk:
duplicate POST creates duplicate pending invitations). Add per-org and
per-identity rate limits at the edge with a deny-by-default policy and a single
shared response envelope. Standardize the `Idempotency-Key` header surface in
contracts.

Owner: api-edge + contracts.
Out: per-resource quota (lives in billing entitlements, already done).

### B4 — SDK + CLI packages

Generate a typed SDK from `packages/contracts` (one client, shared by console,
CLI, and external customers). Ship `packages/cli` per spec 13 on top of the
SDK. Token storage on keychain via `keytar` with a `~/.config/sourceplane/`
fallback.

Owner: new `packages/sdk` + `packages/cli`.
Depends on: contracts are already the source of truth; nothing else hard.
Unlocks: external automation, CI flows, future integrations.

### B5 — Webhooks polish

Spec 15 is implemented but missing the buyer-credible surfaces: signing-key
rotation UX, per-endpoint delivery history with replay, failure-budget alerts
(wired through B2), and signing-secret reveal-once-then-rotate flow. Document
the verification recipe and ship a small `@sourceplane/webhook-verifier`
helper.

Owner: webhooks-worker + console + B2 wiring.

### B6 — Billing UX completion

Stripe provider adapter behind the billing contract (privileged read-sync +
webhook intake); customer portal link from console; upgrade/downgrade flow that
respects the existing entitlement seam; invoice list; failed-payment recovery
copy. Keep provider-specific fields behind the adapter, never in contracts.

Owner: billing-worker + console.
Depends on: U7 (designed precondition_failed copy), B2 (receipts).

### B7 — Audit-log UX

Searchable audit history per org with filters by actor, resource, action,
time range. Export to NDJSON. Surfaces what events-worker already records.

Owner: console + events-worker (read API only; no model change).

### B8 — Admin / support worker

Spec 16 is Ready for implementation but has no app. Ship `apps/admin-worker`
with audited support actions, impersonation with explicit audit trail, plan
overrides, and entitlement inspection. Internal-only routing; never on
api-edge.

Owner: new admin-worker.

### B9 — Entitlement-decision observability

Counts only (no provider payloads, no secrets) by caller × entitlement key
emitted from billing-worker. Analytics Engine or structured-log sink. Used by
the admin-worker dashboard and by on-call to see who's hitting the gate.

Owner: billing-worker + admin-worker.

### B10 — SSO / SAML and SCIM

After B1 and B8 are stable. SSO domains attached to organization; SCIM
provisioning per Okta/AzureAD conventions; org-level lockout policy.

Owner: identity-worker + membership-worker + admin-worker.

## UI / Design (U) — buyer-credible product surface

### U1 — Next.js 15 (App Router) on Cloudflare Pages

Migrate web console from the vanilla-TS prototype to Next.js 15 App Router via
`@opennextjs/cloudflare`. Stand up alongside the existing console first
(Task 0082), then cutover. Old console becomes archive-only after parity is
verified.

Status: scoped as Task 0082.

### U2 — Design system in packages/ui

Shared design system (shadcn/ui + Radix Primitives + Tailwind v4 baseline,
with full agent freedom on token names, palette, type scale, motion). Every
primitive used in the console comes from `packages/ui`. No bespoke per-page
styling. Dark-mode-by-default with a working light mode. Theming via CSS
variables so a white-label fork is a tokens edit, not a refactor.

Status: scoped inside Task 0082.

### U3 — URL-driven scope selector

`/orgs/:orgSlug/projects/:projectSlug/environments/:envSlug/...` is the source
of truth for the multi-tenant invariant. `sessionStorage` for routing state is
forbidden. Persistent scope switcher visible on every page.

Status: scoped inside Task 0082.

### U4 — Empty states as a product feature

Every list view ships a designed empty state with a primary CTA and a one-line
explanation of what the resource is. No `"No X yet"` + emoji placeholders.

Status: scoped inside Task 0082.

### U5 — Cmd-K command palette

Global Cmd-K covering at minimum: switch org, switch project, jump to each
page, create invitation, create API key, logout. Extensible registry pattern
so each new product area can register its own actions.

Status: scoped inside Task 0082.

### U6 — Contract-driven forms

`react-hook-form` + Zod (or equivalent), with form schemas derived from or
matched against `packages/contracts`. Pattern + small helper extracted to
`packages/ui`. New create forms in the product surface follow the pattern by
default.

Status: scoped inside Task 0082.

### U7 — Designed precondition_failed / upgrade UX

When any create flow returns `412 precondition_failed` from the entitlement
seam, the UI renders a designed upgrade prompt distinguishing the four reason
codes (`disabled`, `not_configured`, `malformed_limit`, `limit_reached`).
Shows usage vs limit when available. Offers CTA + "talk to sales" fallback.
RequestId behind a Details disclosure.

Status: scoped inside Task 0082.

### U8 — Skeleton + optimistic UI

Every list and detail view has a designed skeleton state. Mutation flows are
optimistic where safe (rename, archive, role change) and roll back cleanly on
error.

Status: scoped inside Task 0082 for skeletons; optimistic flows can be follow-up.

### U9 — White-label-ready theming

Token-driven theming so a customer fork can rebrand by editing
`packages/ui/tokens.css`. No hard-coded color literals in components.
Logo/wordmark via a swappable component. This is a design-system property,
not a feature.

Status: scoped inside Task 0082 for the foundation; full white-label kit can
be follow-up.

### U10 — Console-as-SDK-client

After B4 lands, the new console consumes the generated SDK rather than a
bespoke `api.ts`. Single client surface, single retry/auth/idempotency story.

Depends on: B4. (Landed — console consumes `@saas/sdk` via `src/lib/api.ts`.)

### U11 — Vercel-standard console completion

U1–U10 made the console structurally credible (App Router on Workers, URL-driven
3-level scope switcher, Cmd-K, designed empty/skeleton states, `412` upgrade UX,
dark-mode tokens, SDK client). U11 closes the remaining buyer-visible gaps that
keep it short of the Vercel / Linear / Stripe Dashboard bar, scoped strictly to
surfaces the public API/SDK already backs:

- **Usage & quota dashboard** — a dedicated surface over `metering.getUsageSummary`
  / `checkQuota` / `listQuotaViolations` (today usage is only implied by billing
  entitlement limits; there is no consumption view).
- **Notification preferences** — per-channel/per-category preferences over
  `notifications.getPreferences` / `updatePreferences`. **Backend-blocked:**
  api-edge exposes no notifications facade (only audit/auth/billing/config/
  metering/org/project/webhooks), so the console cannot consume it yet. Deferred
  pending a `/v1/notifications/*` edge slice (see `ai/deferred.md`). The
  dependency-free `Switch` primitive is in place for when it lands.
- **Account profile/general settings** — name/email + sign-out over
  `auth.getProfile` / `updateProfile` / `logout` (only `/account/security` exists).
- **Org & project "settings" surfaces** — scoped to API-backed actions only:
  read-only metadata + danger-zone archive (`projects.archive`,
  `environments.archive`). No rename/update — neither orgs, projects, nor
  environments expose an `update` route, so rename is explicitly OUT until a
  backend slice adds it.
- **Design-system completion** — add the spec-12 primitives still missing
  (`Select`, `Sheet`, `Tooltip`, `Popover`, `Checkbox`) and a mobile nav drawer
  (the sidebar is `hidden md:flex` with no small-screen replacement).
- **Interaction polish** — make the Cmd-K command set an extensible registry and
  introduce optimistic mutations with rollback where safe (archive, role change).

Owner: web-console-next (+ packages/contracts/sdk only if a genuinely additive
read type is missing; no schema/migration change). Depends on: nothing hard —
all listed reads/writes are already on api-edge + `@saas/sdk`. Out: rename/update
of org/project/env (no API), real auth (B1, human-blocked), in-app notification
inbox with read-state (P4).

## Product Areas (P) — differentiation

### P1 — Per-environment env vars + promote

Per-env config surface (already partly done in config-worker), plus a
"promote stage → prod" flow with a diff and explicit confirmation. Audit
records both states.

Owner: config-worker + console.

### P2 — Resources and component-manifest extension (the moat)

Spec 06 + spec 08. The platform's differentiator. Component manifests describe
project-scoped resources; the runtime orchestrator drives create/update/status
through provider adapters. Status surfaces in console. Treat this as the
differentiator that justifies the bounded-context discipline elsewhere.

Owner: new resources-worker + runtime-worker; large multi-task program.

### P3 — Observability tab per project

Live logs, errors, request rates per project from edge + workers. Time-series
in Analytics Engine; query surface in console. Distinct from audit (P5 of B7);
this is operational, not compliance.

Owner: console + a thin observability-worker read API.

### P4 — Notification inbox + delivery preferences UX

In-app inbox surfacing what notifications-worker (B2) delivered. Per-channel
preferences (email / webhook / in-app) per identity. Mark-as-read state.

Depends on: B2.

### P5 — Integration marketplace primitives

Per-org installation of third-party integrations via OAuth + a manifest. Lives
alongside webhooks but is install/configure rather than send. Treat each
integration as a manifested resource (uses P2).

Depends on: P2 ideally, B5 for outbound, B2 for inbound notifications.

### P6 — Hosted changelog + status page

Per-product changelog rendered from a content source (MDX in repo or Notion);
hosted status page reading from observability (P3) + uptime checks. White-label
ready via U9.

### P7 — AI-native affordances

Natural-language audit search ("show me everyone who deleted a project last
month"), anomaly detection on usage curves, NL → entitlement query, NL →
webhook filter. Treat as separate sub-tasks once P3 and B9 give us the data.

## Sequencing Notes for the Orchestrator

- B1 + B2 are the highest-leverage baseline pair: they together kill the
  "demo-only auth" problem and unblock invitation + billing receipts + alerts.
  Order is B2 → B1 because B1 needs real email.
- U1 (Task 0082) is in flight. After cutover, U10 becomes blocked only on B4.
- P2 is the differentiator and the largest single program. Do not start it
  before B4 (SDK), because the resources contract should ship as a typed
  client surface from day one.
- B6 (Stripe) should not start until U7 lands so upgrade CTAs have somewhere
  to go.
- Anything in B / U should be preferred over P until baseline buyer-credibility
  is reached. The platform's defining bet is in P2, but a customer cannot reach
  P2 without B1–B4 being credible.

## Performance & Caching (PERF) — make responses super-fast

> **Detailed plan, fresh measurements, and per-task design live in
> `specs/performance-epic.md`.** This section is the one-line index; the epic is
> normative for detail. PERF1–PERF4 have all shipped (only PERF4 was previously
> marked ✅ here — corrected below). A 2026-06-08 re-measurement found the latency
> budget has moved: the dominant remaining cost is the **edge rate limiter's
> Workers-KV read-modify-write on every request, before auth** — see PERF5.

Original baseline, measured 2026-06-02 against live stage (server TTFB, warm, no
cold start): `/auth/profile` ≈ 1.0s, `/organizations` ≈ 1.6s,
`/organizations/:org/projects` ≈ 2.1s, `/organizations/:org/billing/summary`
≈ 3.1s. Network/TLS is ~40ms; the time is **server-side**, and **repeat calls
never got faster → no caching at any layer.** Unauthenticated 401 ≈ 0.25s (the
worker floor); bad-token 401 ≈ 0.7s (so bearer→actor resolution added ~0.45s).

**2026-06-08 re-measurement (prod, warm p50):** edge floor 56ms; Hyperdrive DB
ping 62ms (the DB is no longer the problem — Hyperdrive pooling carries it);
org-scoped read ~320ms, of which **~264ms is the rate limiter** (two sequential
KV get+put round-trips, before the actor is even resolved). See the epic.

Original root causes (2026-06-02; (a)–(f) are now **addressed** by PERF1–PERF4 —
see the epic for the current picture): (a) every worker in a request opens a **fresh
postgres client over Hyperdrive and `sql.end()`s it per request** — the
TLS/auth handshake dominates and recurs in each hop; (b) **no bearer-resolution
cache** — api-edge calls identity-worker (+2 DB queries) on every request; (c)
multi-hop sequential fan-out (api-edge → identity → membership → policy →
resource), all awaited serially; (d) `getBillingSummary` runs **4 sequential
queries**; (e) member-list is **N+1** (a role query per member); (f) the console
has **zero client cache** — `useAsync` refetches on every mount and `OrgScope`
re-fetches the full org list on every page; (g) no `Cache-Control`/edge caching.

This cluster's end-state: p50 authed read < ~300ms server-side, and the console
feels instant on navigation (cached + stale-while-revalidate). Tasks are
ordered by impact ÷ effort.

### PERF1 — Console client cache, SWR & prefetch (highest perceived win) ✅
Adopt a client query cache (`@tanstack/react-query` or equivalent) with
stale-while-revalidate; render cached data instantly on navigation and
revalidate in background; dedupe in-flight requests. Cache the org list in
session/query so `OrgScope` stops refetching it per page. Prefetch on
hover/intent. Move the auth gate so the shell paints from cache immediately.
Convert the existing optimistic flows to cache mutations. Frontend-only,
human-independent. Owner: web-console-next. Scoped as Task 0130.
**Done (PR #216).**

### PERF2 — Edge bearer-resolution cache ✅
Cache the bearer→actor resolution at api-edge (Workers KV or the Workers Cache
API, keyed by a token hash, short TTL ~30–60s, invalidated on logout) so the
identity-worker hop + its 2 DB queries are skipped on the hot path. Owner:
api-edge (+ identity-worker logout invalidation). Scoped as Task 0131.
(Was numbered after the existing Task 0129 = B1 GitHub OAuth.)
Shipped via the built-in Cache API (`caches.default`) — no new resource.
**Done (PR #220).**

### PERF3 — DB connection reuse & query efficiency ✅
Eliminate the per-request connection-setup tax; never open two executors for one
request (billing `check-entitlement`); parallelize `getBillingSummary`
(`Promise.all` or a single JOIN); fix the member-list N+1 with a batched role
query; add the missing membership/subject index; verify Hyperdrive query caching
is actually effective. Owner: packages/db + the worker handlers. Scoped as
Task 0132. **Done (PR #221)** for the query-efficiency legs.
**Correction:** the follow-up module-scoped connection reuse (Task 0134) was
**reverted** (PR #227) — the Workers runtime forbids cross-request socket reuse.
It is also unnecessary: the 2026-06-08 numbers show Hyperdrive pooling already
makes the DB round-trip ~6ms over floor. The reverse-lookup index migration and
the Hyperdrive cache audit from this task remain open → folded into the epic's
PERF9. Do not re-attempt isolate-scoped reuse without a stage canary.

### PERF4 — Hot-path hop reduction, parallelization & latency observability ✅
Collapse/parallelize the sequential authorization fan-out on hot reads (run the
membership-roles fetch in parallel with the resource query; evaluate policy
inline from passed facts) to cut a 4-hop serial chain toward 2. Add
`Server-Timing` headers + structured per-hop/per-query timing so prod latency is
measurable and the other PERF tasks are verifiable. Owner: api-edge + resource
workers. Scoped as Task 0133.

**Done (PR #230).** Shipped a dependency-free `@saas/contracts/timing` helper
(`createTimings` / `Server-Timing` render / parse / append). On the four hot
reads (projects-list, audit-list, billing-summary, members-list) the
authorization-context fetch now runs **concurrently** with the resource read via
`Promise.all`, with the policy decision applied afterward and the
speculatively-read data discarded on deny (deny-by-default preserved + tested).
Each worker emits a `Server-Timing` header (`authctx`/`db`/`policy`/`total`,
plus `enrich` for members) and a structured timing log; api-edge appends its own
`edge_auth`/`edge_downstream`/`edge_total` phases so one response carries the
end-to-end breakdown. Wiring the Server-Timing metrics into Analytics Engine for
p50/p95 dashboards is left as a follow-up (folded into PERF6).
**Blind spot found 2026-06-08:** the timing block starts *inside*
`replayOrExecute`, so the ~264ms rate-limiter gate that runs before it is in none
of the emitted phases. PERF6 closes this.

### PERF5 — Take the rate limiter off the KV read-modify-write hot path 🗓️
**Headline of the new cluster.** `enforceRateLimit` does a Workers-KV `get`+`put`
per bucket on every request, before auth, and the two buckets (org + identity)
serialize → ~264ms on every org-scoped read (~80% of warm server time). Stage A
(no new infra): parallelize the buckets and rate-limit only unsafe methods, with
a colo-local approximate limiter for safe GETs. Stage B (end-state): move precise
counters to **Durable Objects** (atomic, no per-request central write). Owner:
api-edge. New resource: a Durable Object namespace (Stage B). Full plan in the
epic. Target: org-scoped read p50 < 150ms.

### PERF6 — Whole-request observability + p50/p95 dashboards 🗓️
Extend the timing helper to cover `enforceRateLimit` + idempotency (emit
`edge_ratelimit` / `edge_idem`) so the full request is measurable, then sink
`Server-Timing` to Analytics Engine for per-route dashboards (absorbs the PERF4
follow-up). Add a synthetic prober for the isolation probes. Owner: api-edge +
contracts/timing + Analytics Engine.

### PERF7 — Cold-start reduction (edge + console SSR) 🗓️
Cold isolates add 0.9–1.8s. Shrink bundles + lazy-load rare-path deps; evaluate
Smart Placement and a keep-warm cron / min-instances. Owner: all workers +
web-console-next.

### PERF8 — Edge response cache for safe GETs 🗓️
Cache authorizable safe GETs at the edge (Cache API / `s-maxage` + SWR), keyed by
actor+scope+route, invalidated on mutation; pairs with PERF1. Owner: api-edge.

### PERF9 — At-scale DB + deferred PERF3 leftovers 🗓️
Ship the reverse-lookup index migration and the Hyperdrive cache-eligibility
audit deferred from PERF3; add a Supabase read replica + Hyperdrive read routing
when traffic warrants. Owner: packages/db + infra.

### Additional resources worth adding (suggested)
- **Cloudflare Cache API** — bearer-resolution cache (shipped, PERF2) and safe-GET
  edge caching (PERF8).
- **Cloudflare Cache API / Tiered Cache** — cache safe GETs at the edge with
  `s-maxage` + `stale-while-revalidate` (PERF8).
- **Hyperdrive caching** — already carrying the DB round-trip (~6ms over floor as
  of 2026-06-08); confirm cache-eligibility audit (PERF9).
- **Analytics Engine** (already a platform baseline) — sink for the Server-Timing
  metrics; per-route p50/p95 dashboards (PERF6).
- **Durable Objects** — per-(scope,key) rate-limit counters off the KV write path
  (PERF5 Stage B); later, per-org hot entitlement counters.
- **Supabase read replica + Hyperdrive read routing** (at scale) — offload
  read traffic from the primary (PERF9).

## What This Document Is Not

- Not a delivery date list.
- Not a substitute for the per-component specs under `specs/components/*.md` —
  those remain the contract.
- Not a frozen plan. The Orchestrator may propose reordering, splits, merges,
  or new clusters via the spec-change-proposal flow in `agents/orchestrator.md`.
