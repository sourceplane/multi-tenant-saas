# Implementation Status — saas-product-experience

As-built record for the PX cluster. Trust code over this doc.

## Summary

Epic opened 2026-06-11 from a verified-live audit. Nothing shipped yet.

| ID | Status |
|----|--------|
| PX1 | Ready (next) |
| PX2 | Ready |
| PX3 | Ready |
| PX4 | Ready |
| PX5 | Ready |
| PX6 | Ready |

## Audit record (2026-06-11)

Method: authenticated Playwright walkthrough of `stage.sourceplane.ai`
(fresh user via the stage `DEBUG_DELIVERY` email-code flow → new org
`claude-audit-co` → project `demo-app` → every org surface, plus light-mode and
390px-mobile passes) and direct edge-API probes with the same session.

Confirmed working at bar: login page, org/project creation with toast
feedback, designed empty states across lists, billing page (plan card,
entitlements table, invoices empty state), audit log with real events and
NDJSON export, usage & quota page, Cmd-K palette, mobile bottom-tab layout,
light/dark theming.

Gaps that seeded PX1–PX6:

1. Console Config page is a stub while
   `GET /v1/organizations/:id/config/{settings,feature-flags,secrets}` is live
   and returns well-formed envelopes (PX2).
2. Unknown routes (e.g. a guessed `/settings/billing/plans`) render the
   unbranded Next.js 404 (PX1).
3. Destructive actions use native `confirm()`; org-create dialog can strand on
   a slow path with only a spinner (PX1).
4. Notification preferences dark end to end for want of one edge facade —
   SDK + worker handlers exist (PX3, unparks the `ai/deferred.md` U11 slice).
5. No rename for org/project/environment anywhere in the stack (PX4).
6. New-user first run dead-ends at empty states; no guided path to a first
   API call (PX5).
7. Cmd-K searches actions/pages only, not resources (PX6).
8. Page headers echo `slug-chip + name` redundantly; no persistent breadcrumb
   `<nav>` (PX1).

Performance note for the PERF epic (not PX scope): authenticated first paint
on a cold path was visibly slow during the walkthrough; consistent with the
known rate-limiter/cold-start ladder in `saas-performance/design.md`.
