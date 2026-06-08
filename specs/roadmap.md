# Architect Roadmap — Program Register

Status: Normative direction. Sequencing is the Orchestrator's call.

## Purpose

This is the **cross-epic index** for the Sourceplane SaaS starter. It groups the
forward direction into clusters — **Baseline SaaS (B)**, **UI / Design (U)**,
**Product Areas (P)**, and **Performance (PERF)** — and points at the epic folders
that own the per-milestone detail. Read this to understand which leg a candidate
task belongs to and where its durable plan lives.

The per-milestone bodies, status, and as-built records now live under
[`epics/`](./epics/) (one folder per cluster). This file keeps only the one-line
index + cross-epic sequencing. The per-component contracts under
[`components/`](./components/) remain the contract; the architectural rules live in
[`core/`](./core/).

The architect-style ground rules:

- Trust code reality over stale docs.
- Prefer the largest coherent reviewable unit with one primary outcome.
- Bounded contexts are non-negotiable; deployment count is.
- Every product surface must look credible to an external buyer before being
  declared done.
- Every internal seam must be extraction-safe before being declared done.

## Epic index

| Cluster | Epic | Status | What it owns |
|---------|------|--------|--------------|
| **B** | [`epics/saas-baseline/`](./epics/saas-baseline/) | In progress | B1 auth · B2 notifications · B3 idempotency/rate-limit · B4 SDK/CLI · B5 webhooks · B6 billing UX · B7 audit UX · B8 admin · B9 entitlement observability · B10 SSO/SCIM |
| **U** | [`epics/saas-console-ux/`](./epics/saas-console-ux/) | In progress | U1 App Router · U2 design system · U3 URL scope · U4 empty states · U5 Cmd-K · U6 forms · U7 upgrade UX · U8 skeleton/optimistic · U9 white-label · U10 SDK client · U11 Vercel-standard completion |
| **PERF** | [`epics/saas-performance/`](./epics/saas-performance/) | In progress | PERF1–PERF9 latency ladder (PERF1–5 shipped + verified; PERF6 landing; PERF7–9 planned). Measurement record + RCA in the epic's `design.md`. |
| **P2** | [`epics/saas-resources-runtime/`](./epics/saas-resources-runtime/) | Draft (not started) | The moat: manifest-driven resources + runtime orchestration (components 06 + 08). |
| **P1, P3–P7** | [`epics/saas-product-areas/`](./epics/saas-product-areas/) | Holding register | P1 promote-flow · P3 observability · P4 notification inbox · P5 marketplace · P6 changelog/status · P7 AI-native. |

For the status legend (`Draft → In progress → ✅ Shipped → ⛔ Blocked → Closed`),
see [`README.md`](./README.md).

## Cross-epic sequencing notes for the Orchestrator

- **B1 + B2 are the highest-leverage baseline pair** — together they kill the
  "demo-only auth" problem and unblock invitations + billing receipts + alerts.
  Order is **B2 → B1** because B1 needs real email. (Both currently have
  human-blocked tails — see the `saas-baseline` risks.)
- **U-track** is structurally complete (U1–U11) and continues as incremental
  polish under `saas-console-ux`; after U10, the SDK client is in place.
- **P2 is the differentiator and the largest single program.** Do not start it
  before **B4 (SDK)** — the resources contract should ship as a typed client
  surface from day one.
- **B6 (Stripe)** waited on **U7** (shipped) so upgrade CTAs have somewhere to go;
  it is now blocked only on Stripe creds.
- **Prefer B / U over P** until baseline buyer-credibility is reached. The
  platform's defining bet is in P2, but a customer cannot reach P2 without B1–B4
  being credible.
- **PERF** is orthogonal and ongoing; PERF5 took warm org-scoped reads/writes to
  ~55–65ms p50 on prod. Next is PERF6 (whole-request observability + dashboards).

## What this document is not

- Not a delivery-date list and not a Gantt chart.
- Not the per-milestone plan — that lives in each `epics/<epic>/implementation-plan.md`.
- Not a substitute for the per-component contracts under
  [`components/*.md`](./components/) — those remain the contract.
- Not the as-built record — that lives in each `epics/<epic>/IMPLEMENTATION-STATUS.md`.
- Not a frozen plan. The Orchestrator may propose reordering, splits, merges, or
  new epics via the spec-change-proposal flow in `agents/orchestrator.md`.
