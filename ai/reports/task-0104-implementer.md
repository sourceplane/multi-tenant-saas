# Task 0104 — Implementer Report

**Task:** Console U10 — migrate `apps/web-console-next` from the
hand-rolled fetch-based `ApiClient` to the typed `Sourceplane` client
from `@saas/sdk`.
**Branch:** `impl/task-0104-console-u10-sdk-refactor`
**PR:** https://github.com/sourceplane/multi-tenant-saas/pull/159
**Commit:** `a05a269`
**Status:** READY FOR REVIEW (all CI lanes green, awaiting merge).

---

## Outcome

The console no longer carries a bespoke wire-format implementation.
`Sourceplane` (from `@saas/sdk`) is now the single API surface for the
Next.js app, with a thin glue layer (`lib/api.ts`, ~120 LOC) that
preserves the existing public types (`ApiErrorBody`, `TARGETS`,
`ApiTarget`, `DEPLOY_ENV`) and adapts SDK throws into the
already-established `Result<T>` shape via a `wrap()` helper.

Net code delta: `+200 / -307` across 17 files.

## Strategy

Path A (direct call-site migration, no compatibility shim) — the
preferred shape per task scope: the SDK is the canonical surface;
`useSession().client` is now `Sourceplane`; pages call resource clients
(`client.organizations.list()`, `client.apiKeys.create()`, …) directly
inside `wrap(...)`.

`useAsync` and `PreconditionInsight` keep their public signatures;
pages still extract `error.code === "precondition_failed"` exactly as
before, so churn is confined to the data-fetch line in each page.

## Files changed (17)

**Glue layer**
- `apps/web-console-next/src/lib/api.ts` — rewritten as thin SDK glue.
- `apps/web-console-next/src/lib/session.tsx` — `client: Sourceplane`.
- `apps/web-console-next/src/lib/use-org.ts` — uses `wrap()`.

**Pages**
- `(app)/orgs/page.tsx`
- `(app)/orgs/[orgSlug]/projects/page.tsx`
- `(app)/orgs/[orgSlug]/projects/[projectSlug]/environments/page.tsx`
- `(app)/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/page.tsx`
- `(app)/orgs/[orgSlug]/members/page.tsx`
- `(app)/orgs/[orgSlug]/invitations/page.tsx`
- `(app)/orgs/[orgSlug]/api-keys/page.tsx`
- `(app)/orgs/[orgSlug]/billing/page.tsx`
- `(app)/orgs/[orgSlug]/audit/page.tsx`
- `app/login/page.tsx`

**Components**
- `components/shell/scope-switcher.tsx` — try/catch around SDK throws.

**Build wiring**
- `apps/web-console-next/package.json` — `@saas/sdk: workspace:*`.
- `apps/web-console-next/next.config.mjs` — `transpilePackages` +
  webpack `extensionAlias` for `.js → .ts/.tsx/.js`.
- `pnpm-lock.yaml` — workspace edge update.

## Validation

| Check | Result |
| --- | --- |
| `pnpm -r typecheck` | green |
| `pnpm --filter @saas/web-console-next lint` | green (0 warnings) |
| `pnpm --filter @saas/web-console-next build` | green (Next + OpenNext) |
| `kiox -- orun validate` | green |
| `kiox -- orun plan --changed` | 1 component × 3 envs → 3 jobs |
| `kiox -- orun run --plan plan.json --dry-run` | 3/3 lanes green |
| **PR-CI** | **plan + dev + stage + prod all green** |

One pre-existing failure in `tests/db` (`migrations.test.ts` —
bounded-context manifest check) reproduces on `main`; explicitly out of
scope.

## Notable decisions

- **Build wiring (key gotcha):** Next's webpack does not pair
  NodeNext-style `./*.js` specifiers to sibling `.ts` source files for
  workspace-source packages. `@saas/contracts` works because the
  console only consumes its subpath exports; `@saas/sdk`'s root entry
  re-exports via `./auth.js` etc., which webpack rejected. Fix:
  `transpilePackages: ["@saas/sdk"]` + `resolve.extensionAlias = {
  ".js": [".ts", ".tsx", ".js"] }`. Documented inline in
  `next.config.mjs`.
- **`scope-switcher`** loaders historically swallowed errors silently
  (returning `[]`). Migrated by wrapping SDK throws in `try/catch`
  rather than going through `wrap()`, preserving that exact behavior.
- **Idempotency keys** — task warned to verify the console doesn't
  auto-generate them. Confirmed: existing call sites pass none; SDK
  `RequestOptions.idempotencyKey` remains caller-owned.
- **Token/target swaps** — `lib/session.tsx` rebuilds the
  `Sourceplane` client whenever target/token changes, so no auth
  header leaks across targets.

## Out of scope (per task)

- `tests/api-edge/**` (sealed Task 0096f territory).
- `packages/cli/**` (separate consumer migration task).
- Worker apps and SDK source itself.

## Awaiting

Merge approval. Verifier hand-off ready upon merge.
