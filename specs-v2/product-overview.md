# Git Catalog And CI Intelligence Product Overview

Status: Product V2 baseline

## Goal

Build a reusable Git-native software catalog and CI intelligence product. The product derives catalog state from repository descriptors and deterministic plan output, then turns that state into searchable components, runs, deployments, pull-request impact, dependency visibility, scorecards, logs, artifacts, and approved actions.

The product must be independently deployable and reusable. It can sit on top of any compatible multi-tenant SaaS foundation, but it must own its product contracts and must not depend on private tables or implementation details from another spec pack.

## Product Shape

```text
Organization
  -> Linked Git repository
       -> Catalog component
            -> Environment visibility
            -> Plans, runs, jobs, deployments
            -> PR history and impact
            -> Dependencies and relations
            -> Scorecards
            -> Approved actions
```

The source of truth remains Git and plan output:

```text
Git repo descriptors and intent
  -> validate / plan / changed detection
  -> catalog sync envelope
  -> cloud index
  -> web console, CLI, SDK, webhooks, and notifications
```

## Required Product Capabilities

- Git provider installation and repository linking under an organization
- workload-identity verification for catalog uploads, with GitHub Actions OIDC as the initial production path
- signed or verified catalog sync ingestion
- catalog components derived from repo-owned descriptors and deterministic plan output
- repository list and sync health views
- global component catalog with table and card modes
- component detail pages with overview, runs, PR history, dependencies, environments, config, logs/docs, scorecard, and actions
- pipeline run, plan, job, deployment, and log/artifact views
- PR impact history for affected components, jobs, environments, files, plan diffs, and risk signals
- scorecards for ownership, production readiness, observability, security, deployment safety, and documentation
- approved actions such as run plan, deploy staging, promote production, create rollback PR, and generate documentation

## UX Baseline

The Figma reference in `referance/figma` defines the first product surface:

- sidebar navigation for Catalog, Runs, Deployments, Repositories, and Settings
- top bar with command search, tenant/organization switcher, theme toggle, and account menu
- catalog page with search, filters, status/type grouping, card mode, and table mode
- component detail tabs for Overview, Runs, PR History, Dependencies, Environments, Config, Scorecard, and Actions
- runs page with run totals, success rate, average duration, active runs, and searchable run rows
- deployments page with environment health and recent deployment records
- repositories page with linked repository sync status and setup guidance
- settings page for tenant information, provider integration, members, API keys, and webhooks

The UI may use "Tenant" as product copy, but API and database contracts should use organization terminology.

## Non-Goals

V2 is not:

- a replacement for a tenant/auth/billing starter
- a generic workflow engine for arbitrary shell execution
- a source of truth for Git-owned component descriptors
- a portal metadata system that requires manual catalog upkeep before plan ingestion
- a user-authored policy DSL

