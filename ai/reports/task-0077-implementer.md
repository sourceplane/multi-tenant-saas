# Task 0077 — Implementer Report

**Agent:** Implementer
**Branch:** `impl/task-0077-billing-tab`
**PR:** [#120](https://github.com/sourceplane/multi-tenant-saas/pull/120)
**Base:** `main` @ `d5fa8c3`

## Summary

Added a read-only Billing tab to `apps/web-console` that consumes the five
public org-scoped billing read routes shipped by Task 0076. The tab renders a
summary card (active plan + subscription + customer + entitlement count), a
plans grid, a customer profile card, an entitlements table, and an invoices
table with cursor-based Load More pagination. All five endpoints are exposed
on `ApiClient` as typed methods sourced from `@saas/contracts/billing`.

No backend, infra, schema, contract, or provider-SDK changes were required.
The PR is web-console scoped; Orun changed-only plan resolves to 3 jobs
(`web-console · {dev,stage,prod} · Verify deploy`).

## Files Changed

| File | Change |
|---|---|
| `apps/web-console/src/api.ts` | +49 lines — billing types import + 5 typed read methods (`listBillingPlans`, `getBillingCustomer`, `getBillingSummary`, `listBillingInvoices`, `getBillingEntitlements`) |
| `apps/web-console/src/main.ts` | +371 lines — sidebar/workspace tab registration, `renderBillingTab`, five section loaders, formatting helpers (`formatMoney`, `formatDate`, `formatDateTime`, `billingMetaRow`), invoice cursor pagination |
| `apps/web-console/src/style.css` | +151 lines — scoped Billing styles (summary card, plans grid, plan card, status pills with semantic active/past_due/canceled/draft variants, meta rows, responsive collapse) |
| `ai/tasks/task-0077.md` | new — tracked task scope doc |

Net diff: **4 files changed, 765 insertions(+), 1 deletion(-)**

## Checks Run

| Check | Result |
|---|---|
| `pnpm --filter @saas/web-console typecheck` | ✓ pass |
| `pnpm --filter @saas/web-console build` | ✓ pass — `dist/assets/index-*.js` 65.37 kB (gzip 14.46 kB); CSS 24.55 kB (gzip 5.46 kB) |
| `pnpm --filter @saas/web-console lint` | ✓ 0 errors; only pre-existing `no-explicit-any` warnings in untouched code (no new warnings introduced) |
| `kiox -- orun validate --intent intent.yaml` | ✓ `Intent is valid` / `All validation passed` |
| `kiox -- orun plan --changed --intent intent.yaml --output plan.json` | ✓ `1 components × 3 envs → 3 jobs` (web-console only) |
| `kiox -- orun run --plan plan.json --dry-run --runner github-actions` | ✓ all 3 jobs simulated successfully (`web-console · {dev,stage,prod} · Verify deploy`) |

## Assumptions

1. The five Task 0076 routes return the response shapes declared by
   `packages/contracts/src/billing.ts` (`ListPlansResponse`,
   `GetBillingCustomerResponse`, `GetBillingSummaryResponse`,
   `ListInvoicesResponse`, `GetEntitlementsResponse`).
2. `/v1/organizations/{orgId}/billing/customer` returns a 404 with error code
   `not_found` when no billing customer exists — the tab treats that as an
   explicit empty state (👤 "No billing customer") rather than an error.
3. The opaque cursor value exposed at `result.meta.cursor` for
   `listBillingInvoices` is a string and round-trips back as a `cursor` query
   parameter on subsequent calls, consistent with the existing audit/security
   events / api-keys pagination pattern.
4. `PublicInvoice.hostedUrl` is intentionally not surfaced in this iteration
   to keep v1 strictly free of any provider-side link surface; can be revisited
   in a follow-up once we decide on display rules.
5. Existing CSS variables (`--paper`, `--paper-soft`, `--ink`, `--text`,
   `--text-quiet`, `--terracotta`, `--border`, `--radius`, `--mono`,
   `--font-weight-semibold`) from Task 0073 are stable and used directly.

## Spec Proposals

None. The implementation conforms to the existing public billing contract and
api-edge facade introduced in Tasks 0075/0076 and does not require contract
or spec amendments.

## Remaining Gaps

1. **Hosted invoice URL display.** `PublicInvoice.hostedUrl` is omitted from
   the UI in v1. If product wants an "Open in provider portal" affordance,
   a follow-up should add a guarded `<a target="_blank" rel="noopener">` with
   explicit user-visible "External provider link" labeling and a clarification
   that the value is opaque to Sourceplane.
2. **Test seam.** `apps/web-console` does not yet have a Jest/Vitest setup
   with a DOM test seam; per the task brief (option 4) I validated via
   typecheck + build + lint + orun rather than adding ad-hoc tests in this
   PR. A web-console test scaffold is a candidate for a future, separately
   scoped task.
3. **Status pill palette.** Color tokens for billing statuses
   (`paid`/`past_due`/`canceled`/etc.) were defined inline against existing
   variables; if a `--success` / `--warn` token set is later extracted, the
   billing pills should switch to those tokens.
4. **Subscription-scoped entitlements filter.** The API supports
   `subscriptionId` / `source` query params but the v1 tab loads the default
   set; a sub-filter UI can be added if/when multiple subscriptions per org
   become a routine state.

## Next Task Dependencies

- The Billing tab provides the read surface that future "billing actions"
  tasks (checkout, plan change, portal session creation, invoice payment)
  will overlay on top of. Any such task must add new api-edge facade routes
  for the corresponding billing-worker write endpoints; this PR introduces
  no precedent for client-initiated mutation.
- If/when a metering UI is added, the Billing tab is a natural sibling and
  may share status-pill / meta-row CSS.

## PR Number

**#120** — https://github.com/sourceplane/multi-tenant-saas/pull/120
