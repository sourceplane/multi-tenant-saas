# web-console-next — architecture

A `cloudflare-workers-assets-turbo` component: Next.js app built through OpenNext into a Worker entrypoint plus an assets directory from `apps/web-console-next`, deployed per environment by its CI lane.

## Bindings and wiring

- **Service bindings** → `api-edge` — in-process RPC to sibling Workers; no public hops between contexts.

Verify lanes render these bindings from the committed fixture instead, which is what makes a pull request offline by construction — it cannot obtain credentials or reach a state backend.

Being assets-first, the console can be "up" while the API behind it is degraded — always verify the edge separately.
