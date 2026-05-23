# Task 0010 — Implementer Report

## Summary

Wired the existing `apps/api-edge` Worker to the verified stage/prod Hyperdrive
resources at the configuration and typing seam. No runtime behavior, no live
deploy, no Terraform mutation.

## Files Changed

| File | Change |
|------|--------|
| `apps/api-edge/wrangler.jsonc` | Added `env.stage` and `env.prod` with Hyperdrive bindings and `ENVIRONMENT` vars; top-level set to `local` |
| `apps/api-edge/src/env.ts` | Replaced commented placeholder with typed `SOURCEPLANE_DB?: Hyperdrive` |
| `apps/api-edge/package.json` | Added `verify-bindings` script |
| `apps/api-edge/scripts/verify-bindings.mjs` | Static verification that binding names and IDs match expected values |

## Binding Configuration

| Environment | Binding Name | Hyperdrive ID | ENVIRONMENT var |
|-------------|-------------|---------------|-----------------|
| top-level (local) | — | — | `local` |
| stage | `SOURCEPLANE_DB` | `08f7c6055f544a3890a585d88fd92348` | `stage` |
| prod | `SOURCEPLANE_DB` | `ab2c21c2db6245a59c91588fcac7107a` | `prod` |

Top-level config intentionally has no Hyperdrive binding to prevent accidental
connections during local development.

Bindings are NOT inherited into named Wrangler environments per Cloudflare docs
(https://developers.cloudflare.com/workers/wrangler/configuration/) — each
environment declares its bindings explicitly.

## Orun Plan Behavior

```
● api-edge
│  ├─ ✓ dev    Verify deploy  0.0s
│  ├─ ✓ stage  Verify deploy  0.0s
│  └─ ✓ prod   Verify deploy  0.0s
```

- `orun plan --changed` selects `api-edge` (1 component × 3 envs → 3 jobs)
- All environments use the `pull-request` profile → verify-deploy capability
  (no actual deploy step fires)
- No deploy profile override needed for this non-mutating configuration PR

## Checks Run

| Check | Result |
|-------|--------|
| `pnpm install` | PASS |
| `pnpm --filter @saas/api-edge build` | PASS (dry-run deploy) |
| `pnpm --filter @saas/api-edge typecheck` | PASS |
| `pnpm --filter @saas/api-edge lint` | FAIL (pre-existing on `main` — broken `@typescript-eslint/scope-manager` in node_modules) |
| `pnpm --filter @saas/api-edge verify-bindings` | PASS |
| `orun validate --intent intent.yaml` | PASS |
| `orun plan --changed --intent intent.yaml --output plan.json` | PASS |
| `orun run --plan plan.json --dry-run --runner github-actions` | PASS |
| `git diff --check` | PASS |

## Assumptions

1. Hyperdrive IDs from Task 0009 verification are stable and non-secret.
2. `Hyperdrive` type from `@cloudflare/workers-types` is available globally in
   the Worker type environment (confirmed by typecheck passing).
3. The `cloudflare-worker-turbo` composition's `pull-request` profile provides
   sufficient non-mutating verification for this PR scope.
4. The pre-existing ESLint failure is a node_modules corruption issue unrelated
   to this task (identical failure on `main` branch).
5. Local `wrangler deploy --dry-run --env stage` would need Cloudflare
   credentials; static verification via `verify-bindings.mjs` is sufficient.

## Spec Proposals

None. The implementation follows the existing spec at
`specs/components/01-edge-api.md` and uses the documented Cloudflare Hyperdrive
binding format.

## Remaining Gaps

1. **ESLint**: Pre-existing broken `@typescript-eslint/scope-manager` in
   node_modules needs investigation (separate from this task).
2. **Local Hyperdrive emulation**: No local connection string configured. A
   future task could add `localConnectionString` pointing to a local Postgres
   for dev workflow parity.
3. **Live deploy verification**: Cannot verify `wrangler deploy --dry-run --env
   stage` locally without Cloudflare credentials. CI should validate this when
   deploy profiles are activated.

## Next Task Dependencies

- Runtime adapter code can now consume `env.SOURCEPLANE_DB` (typed, optional).
- A follow-up task should add a runtime smoke endpoint or health metadata that
  reports binding presence without querying the database.
- Deploy profile activation (from `pull-request` to `deploy` for stage/prod on
  merge) is a separate task.

## PR Number

**PR #47**: https://github.com/sourceplane/multi-tenant-saas/pull/47
