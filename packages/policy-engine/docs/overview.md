# policy-engine

The authorization engine, the predicate evaluator for secret conditions and flag targeting, and deterministic flag bucketing shared by Worker, SDK and console — three approximations of a hash agree right up until a user reports flicker.

A shared package of this workspace, consumed by the components below at build time. There is no publish step — the repo is the registry.

## Depended on by

- **policy-worker** — Cloudflare Worker for policy authorization decisions
