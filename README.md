# multi-tenant-saas

Reusable Cloudflare and Supabase multi-tenant SaaS starter scaffold.

## Status

- Supabase `stage` and `prod` projects are provisioned via Terraform with credentials stored in AWS Secrets Manager.
- Database migration harness (`packages/db`) establishes conventions for bounded-context-owned migrations.
- Cloudflare Workers, Hyperdrive, and live migration apply are not yet implemented.

## Prerequisites

- Node.js >= 20
- pnpm >= 10 (`npm install -g pnpm`)
- (Optional, for CI validation) `kiox` CLI: `/Users/irinelinson/.local/bin/kiox`

## Getting Started

```bash
# Install all workspace dependencies
pnpm install

# Type-check all packages
pnpm typecheck

# Lint all packages
pnpm lint

# Run contract tests
pnpm test

# Build all packages and apps
pnpm build
```

## Workspace Layout

```
apps/api-edge         Cloudflare Worker — public HTTP entry point
apps/web-console-next Cloudflare Workers + Static Assets — Next.js console
packages/contracts    Shared API, tenancy, and error types
packages/db           Database migration harness and manifest
packages/shared       Generic helpers (IDs, errors) — no domain logic
packages/testing      Test fixtures and utilities
tests/contracts       Contract tests for packages/contracts
tests/db              Migration verifier tests
infra/terraform/state Terraform state backend (S3)
infra/terraform/supabase  Supabase project provisioning (stage/prod)
tooling/tsconfig      Shared TypeScript configurations
tooling/eslint        Shared ESLint configuration
```

## CI

CI is powered by [Orun](https://opencode.ai/docs) with Stack Tectonic. The `.github/workflows/ci.yml` calls only `orun plan` and `orun run` — no direct `pnpm`, `turbo`, Wrangler, or Terraform commands run in GitHub Actions.

### Local Orun Verification

```bash
/Users/irinelinson/.local/bin/kiox -- orun compositions lock --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
```

## Infrastructure

Terraform provisions Supabase projects for `stage` and `prod` environments. Credentials are stored in AWS Secrets Manager at `sourceplane/multi-tenant-saas/supabase/<env>`. The `dev` environment has no Supabase project yet.

Cloudflare Hyperdrive and Worker database adapters are not yet implemented.

## Adding a New Component

1. Create the directory under `apps/`, `packages/`, `tests/`, or `infra/`.
2. Add a `component.yaml` with the appropriate `type` (`cloudflare-worker-turbo`, `cloudflare-pages-turbo`, or `turbo-package`).
3. Orun will discover and include it automatically on the next plan.
