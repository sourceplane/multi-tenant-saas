# multi-tenant-saas

Reusable Cloudflare + Supabase multi-tenant SaaS starter, built as an
[Orun](https://opencode.ai/docs) component-native desired-state repo. Identity,
organizations, projects, RBAC, audit, metering, billing, webhooks, and
notifications ship as separate bounded-context Cloudflare Workers behind a single
public edge API, with a Next.js console on Workers + Static Assets.

## Live deployment

<!-- 08-docs:begin -->
_Not yet recorded — run [`flows/phases/08-docs`](flows/phases/08-docs/README.md)
after phase 06 to fill this section from verified live state
([manifest](ai/context/deployment.md) · [operating contract](ai/context/operations.md))._
<!-- 08-docs:end -->

## Status

- **Runtime is live, per environment, through Orun.** The edge API, the
  bounded-context Workers, and the console deploy to `stage` and `prod` via
  `orun run` (no direct Wrangler/Terraform/pnpm in CI).
- **Data plane is provisioned by Terraform:** Supabase `stage` and `prod`
  projects, Cloudflare Hyperdrive (pooled Postgres for Workers), and the
  `api-edge` idempotency KV namespace. Terraform state lives in the Orun Cloud
  HTTP state backend under this repo's workspace claim; provider credentials
  are BROKERED per run from the workspace's integration connections — no AWS,
  no long-lived secrets at rest.
- **Database migrations** run through the `db-migrate` component (plan on PRs,
  apply on merge to `main`).
- **Billing** is live end-to-end via the Polar adapter (embedded checkout,
  plan changes, multi-org fan-out).
- **Known credential-blocked tails** (see `specs/epics/saas-baseline/`): full
  production OAuth/magic-link auth and Stripe require human-supplied
  credentials. The notifications email provider is Cloudflare Email Service
  (`cloudflare-email`, no API key — the `send_email` binding is the
  credential); it needs one-time account setup: Workers Paid plan and the
  sending domain verified in Email Service (DKIM/SPF).
- The `dev` environment is verify-only (no provisioned Supabase project by
  design).

## Instantiating products

This baseline births new products through the phased bootstrap
(**[BOOTSTRAP.md](BOOTSTRAP.md)** → [flows/phases/](flows/phases/README.md)):
eight idempotent workflows — scaffold, foundation, infrastructure, workers,
edge, console, optional domain, docs — each landing a verified slice. An
operator needs two tokens and a workspace with Cloudflare and Supabase
connected; everything else is headless.

Products receive **product-only content** (source, infra, CI, their own
docs). None of this baseline's machinery ships — not `flows/`, not the rebrand
tooling, not `ai/` state — and a product's docs speak only about the product.

The mechanical identity rename (repo slug, product name/domain, SDK class,
CLI bin, worker prefixes, workers.dev subdomain, and the `secret://` workspace
segment) is the blueprint's `rebrand` hook. What still needs human hands —
cloud accounts, OAuth apps, billing products — is the checklist in
**[FORKING.md](FORKING.md)**.

## Prerequisites

- Node.js >= 20 (CI and components run on Node 22)
- pnpm >= 10 (`npm install -g pnpm`)
- (Optional, for local Orun validation) the `kiox` CLI on your `PATH`. `kiox`
  pins the Orun provider declared in `kiox.yaml`; invoke Orun as
  `kiox -- orun ...`.

## Getting Started

```bash
# Install all workspace dependencies
pnpm install

# Type-check / lint / test / build across the workspace (Turborepo)
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Workspace Layout

```
apps/api-edge             Public HTTP entry point (Cloudflare Worker)
apps/identity-worker      Users, sessions, API keys, OAuth
apps/membership-worker    Organizations, members, invitations, role assignments
apps/projects-worker      Projects and environments
apps/policy-worker        Deny-by-default RBAC evaluation
apps/events-worker        Domain events, audit log, observability
apps/config-worker        Settings, feature flags, secret metadata
apps/metering-worker      Usage ingestion, quotas, rollups
apps/billing-worker       Plans, subscriptions, invoices (Polar adapter)
apps/notifications-worker Email delivery and preferences
apps/webhooks-worker      Outgoing webhooks: signing, delivery, replay
apps/admin-worker         Audited admin/support workflows
apps/web-console-next     Next.js console (Cloudflare Workers + Static Assets)

packages/contracts        Shared API, tenancy, event, and error types + validators
packages/policy-engine    RBAC evaluation logic
packages/db               Migration harness, manifest, and runner
packages/sdk              TypeScript SDK (contract-driven)
packages/cli              `sourceplane` CLI
packages/notifications-client  Notifications client
packages/shared           Generic helpers (IDs, errors) — no domain logic
packages/testing          Test fixtures and utilities

infra/terraform/supabase           Supabase project provisioning (stage/prod)
infra/terraform/cloudflare-hyperdrive  Hyperdrive config fronting Supabase
infra/terraform/cloudflare-kv      api-edge idempotency KV namespace
infra/terraform/cloudflare-domain  Zone adoption + console custom domain
infra/db-migrate                   Database migration runner component

flows/                    The phased bootstrap (see BOOTSTRAP.md)
tooling/tsconfig          Shared TypeScript configurations
tooling/eslint            Shared ESLint configuration
tests/*                   Per-component contract and verifier test suites
```

## CI

CI is powered by [Orun](https://opencode.ai/docs) with the composition stack
consumed as a pinned OCI artifact (`intent.yaml` → `compositions.sources`). `.github/workflows/ci.yml` calls only `orun plan` and
`orun run` — no direct `pnpm`, `turbo`, Wrangler, or Terraform commands run in
GitHub Actions. The workflow's `orun-action` `version:` is the authoritative runtime pin.
GITHUB_TOKEN is the only credential CI holds: every provider credential is an
orun-managed secret, brokered fresh per run from the workspace's integration
connections and resolved lease-bound by the jobs that declare it.

### Local Orun Verification

```bash
kiox -- orun compositions lock --intent intent.yaml
kiox -- orun validate --intent intent.yaml
kiox -- orun plan --changed --intent intent.yaml --output plan.json
kiox -- orun run --plan plan.json --dry-run --runner github-actions
```

Use `--changed` for PR-scoped checks; use a full plan when validating
environment promotion or cross-component dependencies (`--view dag`).

## Infrastructure

Terraform provisions Supabase projects, Cloudflare Hyperdrive, and the
`api-edge` KV namespace for `stage` and `prod`. Terraform state lives in the
Orun Cloud HTTP state backend, scoped by the workspace claim in `intent.yaml`;
provider credentials are brokered per run from the workspace's Cloudflare and
Supabase connections. Each component publishes its resource identifiers as
workspace wiring secrets, which consumers resolve at deploy time — no resource
ID is ever committed. See `specs/core/access-and-infra.md` for the access
model and the manual prerequisites.

## Adding a New Component

1. Create the directory under `apps/`, `packages/`, `tests/`, or `infra/`.
2. Add a `component.yaml` with the appropriate `spec.type` — one of
   `cloudflare-worker-turbo`, `cloudflare-workers-assets-turbo`, `terraform`,
   `db-migrate`, or `turbo-package` — plus `subscribe.environments` and the
   typed `parameters` the composition schema requires.
3. Orun discovers it automatically on the next plan (`discovery.roots` covers
   `apps/`, `infra/`, `packages/`, `tests/`). Validate with
   `kiox -- orun validate --intent intent.yaml`.

See `specs/core/orun-golden-path.md` for the intent/component/composition layer
rules before changing CI, infra, or `intent.yaml`.
