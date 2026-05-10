# multi-tenant-saas

Reusable Cloudflare and Supabase multi-tenant SaaS starter scaffold.

## Scaffold Status

This repository contains the initial workspace and Orun component skeleton only.
Live Cloudflare and Supabase resource provisioning is **not** part of this scaffold — it is deferred to a later task.

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
apps/web-console      Cloudflare Pages — web console scaffold
packages/contracts    Shared API, tenancy, and error types
packages/shared       Generic helpers (IDs, errors) — no domain logic
packages/testing      Test fixtures and utilities
tests/contracts       Contract tests for packages/contracts
infra/terraform/state Terraform R2 backend bootstrap (descriptor only)
infra/terraform/core  Core Terraform infra (descriptor only)
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

Terraform provisioning (Supabase, Hyperdrive, Cloudflare Workers) is **not implemented** in this PR.
The `infra/terraform/state` and `infra/terraform/core` directories contain only `component.yaml` descriptors and README files.

## Adding a New Component

1. Create the directory under `apps/`, `packages/`, `tests/`, or `infra/`.
2. Add a `component.yaml` with the appropriate `type` (`cloudflare-worker-turbo`, `cloudflare-pages-turbo`, or `turbo-package`).
3. Orun will discover and include it automatically on the next plan.
