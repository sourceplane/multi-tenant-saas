# Task 0075 — Billing Foundation — Implementer Report

**Branch:** `impl/task-0075-billing-foundation`
**PR:** https://github.com/sourceplane/multi-tenant-saas/pull/118
**Commit:** `330d0cf`
**Status:** ✅ Implemented, tests passing, PR open

---

## Scope Delivered

Provider-neutral billing bounded-context foundation:

- Migration `110_billing_foundation` — schema `billing` with 5 tables (plans, billing_customers, subscriptions, invoices, entitlements), idempotent (`IF NOT EXISTS`).
- `@saas/db/billing` — typed `BillingRepository` with CRUD, cursor-paginated lists, and `getBillingSummary` composition. All org-scoped queries route on `org_id`.
- `@saas/contracts/billing` — `Public*` read-shape types for the API surface. No secret-bearing fields.
- Manifest entry + subpath exports in `packages/db/package.json`, `packages/contracts/package.json`.
- Jest `moduleNameMapper` + tsconfig paths for `@saas/db/billing` in `tests/db/`.

## Files Changed

**New (7):**
- `packages/db/src/migrations/110_billing_foundation/up.sql`
- `packages/db/src/billing/{types,repository,index}.ts`
- `packages/contracts/src/billing.ts`
- `tests/db/src/billing.test.ts`
- `tests/contracts/src/billing.test.ts`

**Modified (6):**
- `packages/db/src/manifest.ts` (+ billing migration entry)
- `packages/db/package.json`, `packages/contracts/package.json` (+ subpath exports)
- `packages/contracts/src/index.ts` (+ billing re-export)
- `tests/db/package.json`, `tests/db/tsconfig.json` (+ billing module mappings)

13 files, **+2352 / -2** lines.

## Verification

| Check | Result |
|---|---|
| `pnpm -F @saas/db typecheck` | ✅ clean |
| `pnpm -F @saas/contracts typecheck` | ✅ clean |
| `pnpm -F @saas/db-tests typecheck` | ✅ clean |
| `pnpm -F @saas/contracts-tests typecheck` | ✅ clean |
| `pnpm -F @saas/db-tests test` | ✅ **490 / 490 pass** (24 new billing) |
| `pnpm -F @saas/contracts-tests test` | ✅ **73 / 73 pass** (7 new billing) |
| `pnpm -F @saas/db lint` | ✅ clean |
| `pnpm -F @saas/contracts lint` | ✅ clean |
| Migration checksum match | ✅ `980564a8…b9f8f` in file + manifest |

**Pre-existing unrelated failure:** `tests/identity-worker` has `globalThis.crypto` typecheck errors that reproduce on `main` (commit `769de5d`). Not caused by this branch.

## Security Stance Verified

- ✅ No tables store API keys, signing secrets, bearer tokens, checkout session secrets, plaintext payment data, or raw provider payloads.
- ✅ `provider` + `provider_*_id` columns are opaque references only — never used for entitlement decisions.
- ✅ `metadata` columns are bounded safe-metadata only.
- ✅ `hosted_url` on invoices is display-only.
- ✅ `Public*` contract types contain no secret-bearing keys (asserted in tests).
- ✅ Cross-org lookups return `not_found` (no row leakage).
- ✅ Invoice upsert guards `EXCLUDED.org_id` equality.

## Bounded-Context Boundary Verified

- ✅ Billing reads metering rollups via repository calls (no FKs into metering tables).
- ✅ Test `metering/billing boundary` asserts billing SQL never references `metering.*`.
- ✅ Billing does not own raw usage facts; does not mutate metering-owned tables.

## Key Design Decisions

1. **Org as V1 billing customer boundary** — per-project billing deferred. `billing_customers.org_id` UNIQUE enforces invariant.
2. **5-table minimum surface** — covers spec `11-billing.md` without entangling payment-provider specifics.
3. **`BillingInterval` includes `'none'`** for free/one-time plans (vs nullable column).
4. **Entitlements carry `source` enum** (`plan` | `override`) so admin overrides preserve plan provenance.
5. **`price_amount_cents` is display/nominal only** — actual amounts live on invoices to avoid drift on price changes.
6. **Repository mirrors webhooks/config conventions** — `Result<T>` discriminated union, cursor `{ createdAt, id }`, row mappers, no throwing on expected errors.
7. **Idempotent migration** matches Supabase autocommit runner used by `100_metering_foundation`.

## Follow-ups (not in scope)

- Per-project billing (deferred from V1).
- Worker / API layer exposing the contracts.
- Provider webhook ingestion + reconciliation flow (separate bounded context).
- Background reconciliation against metering rollups.

## Handoff to Verifier

The verifier should:

1. Confirm PR #118 CI passes (typecheck, lint, tests).
2. Verify migration runner picks up `110_billing_foundation` and applies cleanly against a fresh DB (idempotent re-run should be a no-op).
3. Re-check the security-stance claims by `grep`ing the schema and `Public*` types for any leaked secret-shaped identifier.
4. Once merged, confirm the migration applies in the main CI deployment pipeline and the `billing` schema + 5 tables exist live.
5. Update `ai/context/current.md`, `ai/context/task-ledger.md`, `ai/state.json` to close the loop.
