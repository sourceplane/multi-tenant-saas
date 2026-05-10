# Product Spec V2

Status: Independent product spec pack

This directory contains the product-specific specification for the Git-native catalog and CI intelligence dashboard. It is intentionally separated from `specs/`, which remains the reusable V1 multi-tenant SaaS bootstrap.

V2 may integrate with a compatible tenant/auth/billing platform, including the V1 starter, but it must not require the starter internals. Product contracts, storage, UI, ingestion, and action semantics live here.

## Contents

- `product-overview.md`: product goal, user-facing surfaces, and non-goals
- `domain-model.md`: product entities, tenancy assumptions, storage, and mutation rules
- `repo.md`: product app/package shape, Cloudflare/Supabase/R2 mapping, ingestion, and security
- `contracts/api-guidelines.md`: product API route and envelope rules
- `contracts/catalog-sync.schema.yaml`: catalog sync upload contract
- `contracts/event-envelope.schema.yaml`: event envelope used by product events
- `components/00-git-catalog-ci-intelligence.md`: implementation-ready component spec

## Implementation Guidance

Product V2 work must be split into PR-sized tasks. Each PR should own one product capability slice, contract change, UI surface, ingestion path, or persistence seam.

Do not combine product-specific work with reusable foundation changes unless the task is explicitly an integration contract update.
