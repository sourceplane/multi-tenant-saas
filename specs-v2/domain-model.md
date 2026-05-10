# Git Catalog And CI Intelligence Domain Model

Status: Product V2 baseline

## Core Entities

- `Organization`: tenant boundary supplied by this product or an external SaaS foundation.
- `RepositoryInstallation`: organization-owned connection to a Git provider installation.
- `GitRepository`: linked repository under an organization.
- `CatalogSyncUpload`: immutable ingestion attempt for a catalog sync envelope, verification result, artifact refs, replay key, and normalization state.
- `CatalogComponent`: software catalog component derived from repo-owned descriptors and plan output.
- `CatalogComponentEnvironment`: current per-environment component status, latest job, latest run, and deployment state.
- `CatalogComponentRelation`: dependency, API, resource, composition, or job-level relationship between catalog objects.
- `PlanSnapshot`: deterministic plan metadata and artifact reference for a repository commit.
- `PipelineRun`: CI or product execution instance tied to a plan, repository, commit, branch, and optional pull request.
- `RunJob`: job-level execution record with component, environment, status, duration, and log/artifact references.
- `DeploymentRecord`: deployment attempt or promotion record tied to component, environment, run, job, commit, and actor.
- `PullRequestRecord`: provider pull request mirror used for component history and impact views.
- `ComponentPrChange`: association between a pull request and affected components, files, jobs, environments, plan diff, and risk score.
- `ComponentScorecard`: computed checks and weighted score for a component at a point in time.
- `ApprovedAction`: action definition exposed in UI or CLI, such as run plan, deploy staging, promote production, create rollback PR, or generate README.
- `ActionRun`: audited execution request for an approved action.

## Tenancy Rules

- Every product record belongs to exactly one organization.
- Repository uploads must resolve the organization from verified provider installation claims or a scoped capability token before normalization.
- Client-supplied organization IDs inside upload payloads are advisory until verified.
- Catalog component IDs may be globally opaque, but every query, cache key, event, webhook, and audit record must carry `orgId`.
- A linked repository may optionally map to an external project/workspace, but repository and catalog authorization remains organization-scoped unless a future version adds project-scoped repository ownership.

## Storage Rules

The product source of truth for normalized query state is Supabase Postgres unless a future V2 change explicitly replaces that adapter.

Minimum owned tables or equivalent stores:

- repository installations
- linked repositories
- catalog sync uploads
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
- approved action definitions
- action runs

Large immutable payloads such as raw sync envelopes, plan JSON, component snapshots, logs, generated docs, and diffs should live in R2 with Supabase Postgres storing tenant-scoped metadata and object references.

## Mutation Rules

Catalog sync is append-first:

1. verify upload identity and replay key,
2. persist `CatalogSyncUpload` metadata,
3. store raw artifacts in R2,
4. enqueue normalization,
5. upsert queryable Supabase Postgres projections,
6. emit catalog, plan, run, deployment, scorecard, action, and audit events.

Normalization must be idempotent by upload ID, provider repository ID, commit SHA, plan checksum, component ID, run ID, job ID, and pull request number where applicable.

