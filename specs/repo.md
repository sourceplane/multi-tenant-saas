# Monorepo Spec

Status: Normative

## Intent

This repository starts as a Cloudflare-first monorepo for a reusable multi-tenant SaaS starter bootstrap. It should let implementation move quickly across identity, organizations, projects, membership, billing, audit, usage, notifications, webhooks, admin/support, and optional product extensions while preserving clean seams for later extraction into separate repos and deployments.

## Canonical Repo Shape

```text
intent.yaml                Orun intent — repo-owned stack catalog release, discovery roots, environment lanes
kiox.yaml                  Orun runtime pin
/.orun
  /compositions.lock.yaml  Locked resolved catalog digest used by local and CI runs
/.github
  /workflows
    ci.yml                 Portable Orun plan/run workflow for PRs and main

/ops
  /stack-tectonic          Editable repo-owned operations catalog derived from Stack Tectonic OCI releases
    stack.yaml
    /compositions
    /blueprints
    /registry
    /docs

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
  /testing                 Test utilities, fixtures, contract assertions
    component.yaml

/tests
  /components
    /contracts-tests
      component.yaml       Test suite descriptor (type: turbo-test)
    /api-edge-tests
      component.yaml
    /identity-worker-tests
      component.yaml
    /web-console-tests
      component.yaml

/tooling
  /eslint
  /tsconfig
  /scripts

/infra
  /cloudflare              Wrangler configs, environments, bindings
  /ci                      CI templates and deployment pipelines

/specs
  ...this spec pack...
```

## Repo Rules

### Workspace and toolchain

- Use `pnpm` workspaces for package management.
- Use `turbo` or an equivalent task graph runner for build, test, typecheck, lint, and deploy pipelines inside components.
- Use `orun` as the only CI orchestration layer for validate, plan, test, verify, and deploy flows. Root scripts may wrap `kiox -- orun ...`, but CI gates must not bypass Orun with ad hoc shell steps.
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

### Test component rules

- Every CI-gated test suite is modeled as a first-class Orun component under `tests/components/`.
- `packages/testing` holds shared fixtures, harnesses, and helpers; it is not the CI gate by itself.
- Deployable, package, and infra components must declare `dependsOn` edges to the test components that gate them.
- The starter test composition should begin as a repo-owned `turbo-test` contract inside `ops/stack-tectonic/compositions/` so unit, contract, integration, and smoke suites can run through Orun with repo-specific inputs.
- A component that cannot name its required test component dependency is not ready to merge.

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
- The V1 Supabase database already exists and Cloudflare Hyperdrive is already configured for it as `sourceplane-db`.
- Workers that need the primary database must use the configured `sourceplane-db` Hyperdrive binding/resource instead of inventing a second database binding.
- Local database verification may use temporary credentials generated through `wrangler` when needed. Temporary credentials must never be committed, logged in full, or copied into source files.
- Repository adapters own SQL, pooling assumptions, transaction boundaries, and Hyperdrive-specific behavior. Domain services receive typed repositories or unit-of-work abstractions, not platform database clients.
- Each bounded context owns its schema or table namespace and migration history. Cross-context foreign keys are prohibited; use opaque IDs, service calls, and published events instead.
- Every tenant-scoped table must include `org_id` directly or have an auditable path to `org_id` through a table owned by the same bounded context.
- Domain mutations and outbox/event inserts that describe the same state change should commit atomically in the same Postgres transaction.
- Supabase Auth, Realtime, Storage, and Edge Functions are not platform source-of-truth services unless a future spec explicitly adopts them. Sourceplane-owned identity remains in the identity component.

## Operational Access And Resource Verification

Agents may assume full authenticated access to `gh` and `wrangler` for repository, CI, Cloudflare, and deployment work in task scope.

- The Cloudflare account ID is `f9270f828799775bebf9315248fdf717`.
- GitHub Actions has the Cloudflare API credential needed for CI and deploy workflows.
- GitHub Actions must also expose the Cloudflare account ID to jobs that create, inspect, or deploy Cloudflare resources.
- Any task that creates or updates a Cloudflare resource must verify the resource exists after creation using `wrangler` or the Cloudflare API, then record that verification in the implementer or verifier report.
- Verifiers must not rely only on successful deploy or migration command exit codes when a Cloudflare resource is created. They must inspect the resulting Cloudflare resource state directly.

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

## Composition and CI Model

This repo uses [orun](https://orun-api.sourceplane.ai) with a repo-owned operations catalog derived from [stack-tectonic](https://github.com/sourceplane/stack-tectonic) for composition-driven CI and deployment.

- **`ops/stack-tectonic/`** is a checked-in copy of the pinned Stack Tectonic OCI release. Composition edits start there so repo-specific test or deploy behavior can be added without waiting on an upstream repo change.
- **`intent.yaml`** at the repo root pins the repo-owned OCI publication produced from `ops/stack-tectonic/`, records discovery roots (`apps/`, `packages/`, `tests/components/`, `infra/`), and defines dev → staging → production lane policies.
- **`.orun/compositions.lock.yaml`** is committed and refreshed whenever the repo-owned catalog release changes so local and CI execution resolve the same digest.
- **`component.yaml`** in each app, package, infra module, and test suite describes the composition type, environment subscriptions, and inputs. No component is wired into the CI workflow directly.
- **`kiox.yaml`** pins the orun runtime version.

Orun currently resolves composition sources from OCI during `plan` and `run`, so the checked-in `ops/stack-tectonic/` tree is the editable source of truth and the repo-owned OCI publication is the execution contract consumed by both local and CI runs.

Composition types used:

| Type                      | Used by                                           |
| ------------------------- | ------------------------------------------------- |
| `cloudflare-worker-turbo` | All Workers in `apps/` except `web-console`       |
| `cloudflare-pages-turbo`  | `apps/web-console`                                |
| `turbo-package`           | Shared packages in `packages/`                    |
| `turbo-test`              | Test suites in `tests/components/`                |
| `terraform`               | Optional repo-owned infra components in `infra/`  |

The first implementation task in this repo is the repo-operations scaffold: materialize `ops/stack-tectonic/`, add `intent.yaml`, `kiox.yaml`, `.orun/compositions.lock.yaml`, and land the portable `ci.yml` workflow before any bounded-context code begins.

The base commands stay portable between local execution and GitHub Actions:

- `kiox -- orun validate --intent intent.yaml`
- `kiox -- orun plan --changed --output plan.json`
- `kiox -- orun run --plan plan.json --job <job-id>`

GitHub Actions may add `--gha`, matrix-selected `--job`, and optional remote-state flags, but it must not swap to a different task runner or a different job graph.

The CI workflow (`ci.yml`) compiles one Orun plan on every PR and push to main, uploads the plan artifact, and fans out `orun run` jobs per selected component or test component. Deployment lanes are encoded in `intent.yaml` environments — there is no separate hand-maintained deploy graph.

Adding a new app, package, infra module, or test suite requires only a colocated `component.yaml`. The workflow does not need to change.

If a repo-specific composition change is needed:

1. update `ops/stack-tectonic/` first,
2. add or update the matching smoke fixture there,
3. publish a new repo-owned OCI release from that checked-in catalog,
4. refresh `.orun/compositions.lock.yaml`,
5. then merge the consuming component change.

## CI And Quality Gates

Every change must pass the gates enforced by the matched Orun component graph:

- lint
- typecheck
- unit tests
- contract tests
- integration tests for the changed component
- downstream smoke tests required by changed dependencies
- local `kiox -- orun validate --intent intent.yaml`
- local `kiox -- orun plan --changed`
- local `kiox -- orun run --changed --dry-run`
- GitHub Actions `kiox -- orun run --plan plan.json --job <job-id> --gha`

All test execution that can block merge or release must happen through Orun jobs owned by `tests/components/*`. Standalone `pnpm test` jobs in CI are allowed only when they are invoked by a test component composition, not as a second orchestration path beside Orun.

Changes that affect `packages/contracts`, `specs/`, or shared auth, tenancy, project, billing, audit, resource, or webhook flows require downstream smoke tests for every impacted component.

If `orun plan --changed` produces no component jobs, the matching `orun run --changed` result should be recorded as a no-op instead of skipped silently.
