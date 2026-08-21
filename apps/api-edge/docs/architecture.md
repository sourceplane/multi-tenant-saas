# api-edge — architecture

A `cloudflare-worker-turbo` component: TypeScript Worker built by the turbo pipeline from `apps/api-edge`, deployed per environment by its CI lane.

## Bindings and wiring

- **Service bindings** → `billing-worker`, `config-worker`, `events-worker`, `identity-worker`, `integrations-worker`, `membership-worker`, `metering-worker`, `notifications-worker`, `projects-worker`, `webhooks-worker` — in-process RPC to sibling Workers; no public hops between contexts.
- **Wired configuration**, resolved at deploy time from the wiring secrets the infrastructure components publish (names only, never values): `WIRING_CLOUDFLARE_HYPERDRIVE_PROD`, `WIRING_CLOUDFLARE_HYPERDRIVE_STAGE`, `WIRING_CLOUDFLARE_KV_PROD`, `WIRING_CLOUDFLARE_KV_STAGE`.

Verify lanes render these bindings from the committed fixture instead, which is what makes a pull request offline by construction — it cannot obtain credentials or reach a state backend.

## Request path

Every public request enters here, is authenticated, and is routed to the owning bounded-context Worker over its service binding. Responses never bypass the edge.
