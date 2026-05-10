# Monorepo Spec

Status: Normative

## Intent

This repository starts as a Cloudflare-first monorepo for a reusable multi-tenant SaaS starter bootstrap. It should let implementation move quickly across identity, organizations, projects, membership, billing, audit, usage, notifications, webhooks, admin/support, and optional product extensions while preserving clean seams for later extraction into separate repos and deployments.

## Canonical Repo Shape

```text
intent.yaml                Orun intent: composition sources, discovery roots, environment lanes
kiox.yaml                  Orun runtime pin
.orun/
  compositions.lock.yaml   Committed resolved composition lock
.github/
  /workflows
    ci.yml                 Orun plan/run workflow; no direct test or deploy jobs

/apps
  /api-edge                Public HTTP entry Worker
    component.yaml         Component descriptor (type: cloudflare-worker-turbo)
  /web-console             Cloudflare Pages or Workers-based UI
    component.yaml         Component descriptor (type: cloudflare-pages-turbo)
  /identity-worker
    component.yaml
  /policy-worker
    component.yaml
  /membership-worker
    component.yaml
  /projects-worker
    component.yaml
  /notifications-worker
    component.yaml
  /webhooks-worker
    component.yaml
  /admin-worker
    component.yaml
  /resources-worker
    component.yaml         Optional starter extension for project-scoped resources
  /config-worker
    component.yaml
  /events-worker
    component.yaml
  /runtime-worker
    component.yaml         Optional starter extension for long-running resource workflows
  /metering-worker
    component.yaml
  /billing-worker
    component.yaml

/packages
  /contracts               Shared API, tenancy, event, starter, resource, and manifest types
    component.yaml         Component descriptor (type: turbo-package)
  /sdk                     Public TypeScript SDK
    component.yaml
  /cli                     Public CLI package
    component.yaml
  /ui                      Shared UI components and generated form helpers
    component.yaml
  /shared                  Generic helpers only: errors, logging, ids, tracing
    component.yaml
  /testing                 Test utilities and fixtures only
    component.yaml

/tests
  /contracts
    component.yaml         Test component descriptor
  /api-edge
    component.yaml
  /membership
    component.yaml
  /e2e-bootstrap
    component.yaml

/tooling
  /eslint
  /tsconfig
  /scripts

/infra
  /terraform
    /state
      component.yaml       R2 backend/bootstrap component
    /core
      component.yaml       Terraform-owned Supabase, Hyperdrive, Worker infra
  /cloudflare              Wrangler configs, environments, bindings derived from infra
  /ci                      Orun workflow templates

/specs
  ...this spec pack...
```

## Repo Rules

### Workspace and toolchain

- Use `pnpm` workspaces for package management.
- Use `turbo` or an equivalent task graph runner behind Orun for package-level task execution.
- Use Orun as the only CI entry point for build, lint, typecheck, test, deploy, and smoke workflows.
- Use TypeScript across Workers, SDK, CLI, and shared packages for V1 velocity.
- Each deployable Worker keeps its own `wrangler.jsonc` and deployment pipeline.

### Deployment model

- The public entry point is `apps/api-edge`.
- Internal bounded contexts are separate Workers where service bindings add value.
- The web UI is a separate app and must talk to the public API, not internal Worker bindings.
- Starter-domain asynchronous work uses Cloudflare Queues and Workers behind the owning bounded context.
- Long-running product-resource orchestration may live in `apps/runtime-worker` using Cloudflare Workflows by default; Durable Objects may be used for locks and strongly consistent coordination.

### State ownership

- Each bounded context owns its own persistence.
- The primary relational store is Supabase Postgres, reached from Workers through Cloudflare Hyperdrive.
- In V1, a single Supabase project/database may host multiple bounded contexts, but each context must own a logical schema or table namespace, service credentials, and migrations that can be extracted without rewriting clients.
- No Worker may query another domain's tables or schemas directly.
- Shared caches in KV must be derived, disposable copies of source-of-truth data.
- Every project-scoped table, cache key, event, and query must carry `org_id + project_id`; never rely on `project_id` alone.

### Internal communication

- Prefer Cloudflare service bindings for internal Worker-to-Worker communication.
- Prefer RPC-style service bindings for internal command/query boundaries.
- HTTP fetch between Workers is allowed only when mirroring a public contract is intentional.
- Background work uses Cloudflare Queues and/or Workflows, never fire-and-forget calls without delivery tracking.

### Shared package rules

- `packages/contracts` may contain shared types, schema validators, and contract tests.
- `packages/shared` may contain only generic utilities with no domain knowledge.
- Domain logic must not live in `packages/shared`.
- UI packages must not import internal Worker code.

## Platform Resource Mapping

Use platform primitives deliberately:

- Workers: HTTP ingress and internal domain services
- Service bindings: internal synchronous calls
- Supabase Postgres: source-of-truth relational state for bounded contexts
- Hyperdrive: Worker-to-Postgres connectivity, pooling, and regional routing at the adapter layer
- D1: optional edge-local cache, test adapter, or managed customer resource; not the source of truth for starter domain state
- KV: read-heavy cache and idempotency records
- R2: artifacts, manifest bundles, export files, dead-letter archives
- Queues: asynchronous delivery and fanout steps
- Workflows: durable multistep orchestration
- Durable Objects: per-resource locking, coordination, and strongly consistent local state where needed
- Secrets Store and Worker secrets: platform credentials and envelope-encryption keys
- Workers Analytics Engine: usage telemetry and operational analytics

## Primary Database Operating Model

Supabase Postgres is the primary operational database for product-owned relational state, including identity, membership, projects, config metadata, canonical events, audit indexes, usage rollups, billing state, notifications, webhooks, support actions, and optional resource/runtime metadata.

- Workers connect to Supabase Postgres through Hyperdrive bindings. Raw connection strings and Supabase service keys must stay in platform configuration and must not leak into domain logic.
- The V1 Supabase project, database password, Cloudflare Hyperdrive config, and Worker infrastructure config are Terraform-owned.
- Terraform state must use Cloudflare R2 as its backend.
- Workers that need the primary database must use the Terraform-created `sourceplane-db` Hyperdrive binding/resource instead of inventing a second database binding.
- Local database verification may use temporary credentials generated through `wrangler` when needed. Temporary credentials must never be committed, logged in full, or copied into source files.
- Repository adapters own SQL, pooling assumptions, transaction boundaries, and Hyperdrive-specific behavior. Domain services receive typed repositories or unit-of-work abstractions, not platform database clients.
- Each bounded context owns its schema or table namespace and migration history. Cross-context foreign keys are prohibited; use opaque IDs, service calls, and published events instead.
- Every tenant-scoped table must include `org_id` directly or have an auditable path to `org_id` through a table owned by the same bounded context.
- Domain mutations and outbox/event inserts that describe the same state change should commit atomically in the same Postgres transaction.
- Supabase Auth, Realtime, Storage, and Edge Functions are not platform source-of-truth services unless a future spec explicitly adopts them. Sourceplane-owned identity remains in the identity component.

## Operational Access And Resource Verification

Agents may assume full authenticated access to `gh`, `wrangler`, and Supabase for repository, CI, Cloudflare, Supabase, and deployment work in task scope.

- GitHub Actions exposes `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, and `SUPABASE_API_KEY`.
- All Cloudflare and Supabase resources are created programmatically through Orun jobs in CI.
- Terraform owns Supabase project creation, database password generation, Cloudflare Hyperdrive, Worker bindings, and infra config.
- Direct manual console changes are prohibited except emergency repair; reconcile any emergency change back into Terraform or repo config.
- Any task that creates or updates a Cloudflare or Supabase resource must verify the resource exists after creation using `wrangler`, Supabase tooling, Terraform state, or provider APIs.

## Extraction Model

The monorepo is successful only if each bounded context can later move without changing public contracts.

A component is considered extraction-ready when:

- its persistence is owned only by that component,
- its internal consumers reach it only through contracts or service bindings,
- it has its own deployment config,
- it has no domain cross-imports,
- its public and event contracts already live in `packages/contracts`.

When a component outgrows Cloudflare-native storage or queueing:

- keep the public and internal contract stable,
- move its owned Supabase schema/tables or replace the repository adapter,
- optionally front the external service with the same Worker contract,
- keep Hyperdrive or standard outbound connectivity only at the adapter layer.

## Orun And Stack Tectonic Model

This repo uses Orun with Stack Tectonic (`sourceplane/stack-tectonic`) for composition-driven CI and deployment.

Required root files:

- `kiox.yaml` pins `ghcr.io/sourceplane/orun:v1.11.0` or a newer approved Orun runtime.
- `intent.yaml` pins the Stack Tectonic OCI source and declares discovery roots, environments, and policies.
- `.orun/compositions.lock.yaml` is committed after `orun compositions lock --intent intent.yaml`.
- `.github/workflows/ci.yml` calls Orun only. It must not run `pnpm test`, `turbo test`, deploy commands, or Wrangler directly.

Baseline `intent.yaml` shape:

```yaml
apiVersion: sourceplane.io/v1
kind: Intent
metadata:
  name: multi-tenant-saas
  description: Reusable Cloudflare and Supabase multi-tenant SaaS starter
compositions:
  sources:
    - name: stack-tectonic
      kind: oci
      ref: oci://ghcr.io/sourceplane/stack-tectonic:0.12.0
discovery:
  roots:
    - apps/
    - packages/
    - tests/
    - infra/
environments:
  dev:
    defaults:
      lane: dry-run
      namespacePrefix: dev-
    policies:
      requireApproval: "false"
  staging:
    defaults:
      lane: verify
      namespacePrefix: stg-
    policies:
      requireApproval: "true"
  production:
    defaults:
      lane: release
      namespacePrefix: prod-
    policies:
      requireApproval: "true"
```

Composition types used:

| Type                      | Used by                                         |
| ------------------------- | ----------------------------------------------- |
| `cloudflare-worker-turbo` | Workers in `apps/` except `web-console`         |
| `cloudflare-pages-turbo`  | `apps/web-console`                              |
| `turbo-package`           | Packages in `packages/` and test packages in `tests/` |

Test components use `turbo-package` until the pinned Stack Tectonic release provides a dedicated test composition.

Adding a new app, package, infra unit, or test suite requires only a colocated `component.yaml`. The workflow does not change.

Baseline GitHub Actions flow:

```yaml
permissions:
  contents: read
  packages: read
  id-token: write

jobs:
  plan:
    outputs:
      job-matrix: ${{ steps.matrix.outputs.job-matrix }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: sourceplane/orun-action@v1.1.0
      - run: orun plan --changed --intent intent.yaml --output plan.json
      - id: matrix
        run: echo "job-matrix=$(jq -c '[.jobs[] | {\"job-id\": .id, \"job-name\": .checkName}]' plan.json)" >> "$GITHUB_OUTPUT"
      - uses: actions/upload-artifact@v4
        with:
          name: orun-plan
          path: plan.json

  run:
    needs: plan
    strategy:
      matrix:
        include: ${{ fromJson(needs.plan.outputs.job-matrix) }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: orun-plan
      - uses: sourceplane/orun-action@v1.1.0
      - run: |
          orun run \
            --plan plan.json \
            --runner github-actions \
            --remote-state \
            --job "${{ matrix.job-id }}" \
            --exec-id "${{ github.run_id }}-${{ github.run_attempt }}"
```

`ORUN_BACKEND_URL` is provided by CI secrets or repository environment configuration when `--remote-state` is used.

## CI And Quality Gates

Every automated test suite is an Orun component under `tests/`.

- Source and delivery components that require a test gate declare `dependsOn` on the matching test component.
- Test components may depend on packages or apps they exercise, but tests are never hardcoded in `.github/workflows/ci.yml`.
- `packages/testing` contains reusable helpers only; it is not the CI test entry point.
- A test-only change must produce an Orun job for the changed test component.

Example dependency shape:

```yaml
# apps/api-edge/component.yaml
apiVersion: sourceplane.io/v1
kind: Component
metadata:
  name: api-edge
spec:
  type: cloudflare-worker-turbo
  domain: starter-runtime
  dependsOn:
    - component: api-edge-tests
      condition: success

# tests/api-edge/component.yaml
apiVersion: sourceplane.io/v1
kind: Component
metadata:
  name: api-edge-tests
spec:
  type: turbo-package
  domain: starter-tests
  inputs:
    nodeVersion: "20"
    pnpmVersion: "10.12.1"
    buildCommand: pnpm exec turbo run test --filter=./
    typecheckCommand: pnpm exec turbo run typecheck --filter=./
  labels:
    layer: test
```

Local verification commands:

```bash
/Users/irinelinson/.local/bin/kiox -- orun compositions lock --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
```

Every PR and push to main must pass the Orun plan/run workflow. Expected gates come from the matched components and must include lint, typecheck, unit tests, contract tests, integration tests where applicable, and deploy or smoke checks for changed deployable components.

Changes that affect `packages/contracts`, `specs/`, or shared auth, tenancy, project, billing, audit, resource, or webhook flows require downstream smoke tests for every impacted component.

If `orun plan --changed` produces no component jobs, the matching `orun run --plan plan.json` result should be recorded as a no-op instead of skipped silently.
