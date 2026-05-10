# Git Catalog And CI Intelligence

Status: Product V2 pending implementation

Primary monorepo targets:

- `apps/catalog-worker`
- `packages/contracts`
- `packages/sdk`
- `packages/cli`
- `apps/web-console`

Primary dependencies:

- `specs-v2/product-overview.md`
- `specs-v2/domain-model.md`
- `specs-v2/repo.md`
- `specs-v2/contracts/api-guidelines.md`
- `specs-v2/contracts/catalog-sync.schema.yaml`
- `specs-v2/contracts/event-envelope.schema.yaml`

Platform dependencies:

- Workers
- Queues for async normalization and action dispatch
- Hyperdrive binding to primary Supabase Postgres
- Supabase Postgres for normalized catalog, repository, run, deployment, PR, and scorecard indexes
- R2 for immutable sync envelopes, plan exports, component-state snapshots, logs, generated docs, and plan diffs
- KV for replay guards or hot read-through cache where useful
- Secrets Store for provider credentials and capability-token signing keys

## Intent

Provide the Git-native software catalog and CI intelligence product derived from plan output, not from hand-maintained portal metadata. The dashboard should help teams answer what exists, who owns it, what changed, what ran, what deployed, what failed, and what approved action can safely happen next.

## Scope

- GitHub App installation and repository linking
- repository sync configuration and health
- catalog sync ingestion from CLI and CI runners, with GitHub Actions as the initial provider path
- upload identity verification and replay protection
- immutable artifact persistence in R2
- async normalization into Supabase Postgres query projections
- component catalog, tags, owners, systems, lifecycle, types, and environments
- component dependency, API, resource, composition, and job relations
- plan snapshots, pipeline runs, run jobs, deployments, and log/artifact references
- pull request history and component impact analysis
- scorecards and risk signals
- approved action definitions and audited action runs

## Out Of Scope

- replacing Git as the source of truth for component descriptors
- arbitrary shell execution from the UI
- generic workflow automation unrelated to approved product capabilities
- owning organization membership, billing, policy, notifications, or webhooks
- making D1 the product-profile source of truth

## Hard Contracts To Honor

- Catalog sync contract in `specs-v2/contracts/catalog-sync.schema.yaml`
- Event envelope in `specs-v2/contracts/event-envelope.schema.yaml`
- API guidelines in `specs-v2/contracts/api-guidelines.md`
- Organization tenancy rules in `specs-v2/domain-model.md`

## Required Capabilities

### Public/Internal Methods

- `linkRepository`
- `listRepositories`
- `getRepository`
- `updateRepositorySyncSettings`
- `verifyCatalogSyncUpload`
- `acceptCatalogSyncUpload`
- `normalizeCatalogSyncUpload`
- `listCatalogComponents`
- `getCatalogComponent`
- `getComponentHistory`
- `getComponentRuns`
- `getComponentDependencies`
- `getComponentScorecard`
- `listRuns`
- `getRun`
- `getPlan`
- `listDeployments`
- `getDeployment`
- `listApprovedActions`
- `runApprovedAction`
- `getActionRun`

### Public Route Surface

- `POST /v2/catalog/sync`
- `GET /v2/organizations/{orgId}/repositories`
- `POST /v2/organizations/{orgId}/repositories`
- `GET /v2/organizations/{orgId}/repositories/{repositoryId}`
- `PATCH /v2/organizations/{orgId}/repositories/{repositoryId}`
- `GET /v2/organizations/{orgId}/catalog/components`
- `GET /v2/organizations/{orgId}/catalog/components/{componentId}`
- `GET /v2/organizations/{orgId}/catalog/components/{componentId}/history`
- `GET /v2/organizations/{orgId}/catalog/components/{componentId}/runs`
- `GET /v2/organizations/{orgId}/catalog/components/{componentId}/dependencies`
- `GET /v2/organizations/{orgId}/catalog/components/{componentId}/scorecard`
- `GET /v2/organizations/{orgId}/runs`
- `GET /v2/organizations/{orgId}/runs/{runId}`
- `GET /v2/organizations/{orgId}/plans/{planId}`
- `GET /v2/organizations/{orgId}/deployments`
- `GET /v2/organizations/{orgId}/deployments/{deploymentId}`
- `POST /v2/organizations/{orgId}/catalog/components/{componentId}/actions/{actionId}/run`

### Events

- `repository.linked`
- `repository.sync_settings_updated`
- `catalog.sync_upload_accepted`
- `catalog.sync_upload_rejected`
- `catalog.sync_normalized`
- `catalog.component_upserted`
- `catalog.component_removed`
- `catalog.relation_upserted`
- `plan.snapshot_recorded`
- `run.started`
- `run.completed`
- `run.failed`
- `job.started`
- `job.completed`
- `job.failed`
- `deployment.started`
- `deployment.completed`
- `deployment.failed`
- `pull_request.component_changed`
- `scorecard.updated`
- `action.requested`
- `action.completed`
- `action.failed`

## Ingestion Rules

The ingestion path is append-first and must not make CI wait for full normalization.

1. Verify GitHub OIDC, provider claims, allowed workflow refs, branch/ref policy, and repository allowlist. Capability-token upload may be supported for setup but is lower trust.
2. Validate the catalog sync schema and payload size limits.
3. Reject replayed `uploadId` values and duplicate provider/run/checksum combinations unless idempotent replay is explicitly allowed.
4. Write raw envelope, plan, component snapshots, diffs, and logs to R2.
5. Persist `sync_uploads` metadata in Supabase Postgres.
6. Enqueue normalization.
7. Return accepted with request ID and upload ID.
8. Normalize asynchronously into Supabase Postgres projections.
9. Emit events and audit records for accepted uploads, rejected uploads, normalization failures, and user-triggered actions.

Normalization must be idempotent by `orgId`, provider repository ID, commit SHA, plan checksum, component ID, run ID, job ID, and PR number where applicable.

## Descriptor Naming

The product may ingest any explicitly versioned repo-owned component descriptor path emitted by catalog export. It must not overload unrelated resource manifests from a host platform. The UI should show the actual source descriptor path instead of hardcoding `component.json`.

## Data Ownership

This component owns:

- repository installations
- linked repositories
- sync uploads
- catalog components
- component tags
- component environments
- component relations
- plan snapshots
- pipeline runs
- run jobs
- deployment records
- pull request records
- component PR changes
- component scorecards
- approved actions
- action runs

R2 object refs are metadata owned by this component. Raw artifacts in R2 are immutable after acceptance.

## Security Rules

- Catalog sync upload cannot trust tenant fields in the payload until the provider identity and repository mapping are verified.
- Repository IDs from the provider are stronger than repository names and must be stored.
- Component paths must remain inside the linked repository checkout.
- Approved UI/CLI actions dispatch product capabilities, not arbitrary commands.
- Every action run must capture actor, organization, repository/component scope, reason where required, request ID, and resulting event IDs.
- Production deployment, promotion, rollback, and secret-rotation actions require explicit policy authorization and audit.
- Logs and artifacts must be redacted before user display where secrets or provider tokens may appear.

## UI Reference Requirements

The Figma reference under `referance/figma` defines the Orun profile's first user-facing shape:

- left sidebar navigation for Catalog, Runs, Deployments, Repositories, and Settings
- top bar with command search, tenant/organization switcher, theme toggle, and account menu
- catalog page with search, filters, status/type grouping, table mode, and card mode
- component page tabs for Overview, Runs, PR History, Dependencies, Environments, Config, Scorecard, and Actions
- runs page with 24-hour run totals, success rate, average duration, active runs, and searchable run rows
- deployments page with environment health and recent deployment records
- repositories page with linked repository sync status and setup guidance
- settings page for tenant information, GitHub integration, members, API keys, and webhooks

The UI may use "Tenant" as product copy, but API contracts and database columns remain organization-based.

## Agent Freedom

- The agent may begin with GitHub-only provider support if provider interfaces allow future expansion.
- The agent may compute scorecards synchronously during normalization or asynchronously after component upsert.
- The agent may store derived graph edges in a relational adjacency table before adding a graph-specific store.
- The agent may stub approved actions in V2 if the action contract, policy checks, and audit trail are present.

## Acceptance Criteria

- A signed-in organization admin can link a repository.
- A GitHub Actions run can upload a catalog sync envelope through `POST /v2/catalog/sync` using OIDC.
- Raw sync artifacts are stored in R2 and normalized query projections are stored in Supabase Postgres.
- A user can browse repositories, catalog components, component detail tabs, runs, deployments, PR history, dependencies, and scorecards through the public API and web console.
- Sync and action failures are visible, auditable, and retryable without corrupting previous accepted state.
- All catalog queries and action runs are organization-scoped and cannot leak data across tenants.

## Extraction Seam

Catalog/CI intelligence is a product-profile bounded context. Other domains may consume catalog events or public API projections, but they must not query catalog tables directly. The component can later move into its own repo or external service while preserving the public API and event contracts.
