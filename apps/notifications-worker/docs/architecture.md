# notifications-worker — architecture

A `cloudflare-worker-turbo` component: TypeScript Worker built by the turbo pipeline from `apps/notifications-worker`, deployed per environment by its CI lane.

## Bindings and wiring

- **Service bindings** → `events-worker` — in-process RPC to sibling Workers; no public hops between contexts.
- **Wired configuration**, resolved at deploy time from the wiring secrets the infrastructure components publish (names only, never values): `WIRING_CLOUDFLARE_HYPERDRIVE_PROD`, `WIRING_CLOUDFLARE_HYPERDRIVE_STAGE`.

Verify lanes render these bindings from the committed fixture instead, which is what makes a pull request offline by construction — it cannot obtain credentials or reach a state backend.
