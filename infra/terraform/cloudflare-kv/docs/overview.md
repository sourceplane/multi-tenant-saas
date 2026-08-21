# cloudflare-kv

Provisions Cloudflare KV namespaces backing the api-edge idempotency replay store (stage and prod)

The KV namespace backing the edge idempotency replay store and rate-limit buckets.

Applied per live environment (`stage`, `prod`); `dev` provisions nothing.

## Depends on

- (none)

## Depended on by

- **api-edge** — Cloudflare Worker for the API edge Runtime
