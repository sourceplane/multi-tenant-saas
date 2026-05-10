# Product V2 Repo Spec

Status: Product V2 baseline

## Intent

Define an independently reusable product implementation shape for Git catalog and CI intelligence. The product can live in the same monorepo as a compatible SaaS foundation or move into its own repo without changing public contracts.

## Canonical Product Shape

```text
/apps
  /catalog-worker          Repository linking, sync ingestion, catalog projections, runs, deployments, scorecards
  /web-console             Product UI

/packages
  /contracts               API, event, catalog sync, and product types
  /sdk                     Public TypeScript SDK
  /cli                     Product CLI
  /ui                      Product UI components

/specs-v2
  ...this spec pack...
```

## Platform Mapping

- Workers: public API and internal product services
- Supabase Postgres through Hyperdrive: normalized product query state
- R2: immutable sync envelopes, plans, component snapshots, logs, generated docs, diffs, and archives
- Queues: async normalization, fanout, retry, and action dispatch
- KV: replay guards, hot caches, and idempotency records when useful
- Durable Objects: optional per-repository or per-action coordination
- Secrets Store and Worker secrets: provider credentials and signing keys

D1 may be used as a disposable cache, local test adapter, or read index. It is not the source of truth for product domain state unless a future V2 decision changes the storage model.

## Ingestion Model

1. A trusted CI runner validates the repo and creates a deterministic plan.
2. The runner exports a catalog sync envelope.
3. The runner uploads through the product API using workload identity where available.
4. The edge/API layer verifies identity and resolves organization.
5. `catalog-worker` stores raw artifacts in R2, records upload metadata, and enqueues normalization.
6. The normalizer updates Supabase Postgres projections and emits events.
7. UI, CLI, SDK, webhooks, notifications, and support views read from product APIs.

## Security Checks

Catalog sync must validate:

- provider and repository identity
- installation ownership and organization mapping
- workflow or token audience
- allowed workflow refs and branches
- commit SHA and plan checksum
- supported schema version
- component paths inside the repository
- upload ID replay protection
- payload size and artifact count limits

Capability-token upload may exist for low-friction setup, but provider installation plus workload identity is the production path.

