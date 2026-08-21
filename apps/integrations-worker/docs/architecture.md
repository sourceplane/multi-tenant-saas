# integrations-worker — architecture

A `cloudflare-worker-turbo` component: TypeScript Worker built by the turbo pipeline from `apps/integrations-worker`, deployed per environment by its CI lane.

## Bindings and wiring

- **Service bindings** → `billing-worker`, `membership-worker`, `policy-worker`, `projects-worker` — in-process RPC to sibling Workers; no public hops between contexts.
- **Wired configuration**, resolved at deploy time from the wiring secrets the infrastructure components publish (names only, never values): `WIRING_CLOUDFLARE_HYPERDRIVE_PROD`, `WIRING_CLOUDFLARE_HYPERDRIVE_STAGE`.
- **Runtime secrets**, wire-now-seed-later: `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_WEBHOOK_SECRET`, `INTEGRATIONS_STATE_SECRET`, `SECRET_ENCRYPTION_KEY`. An unseeded key is skipped at resolve, so this component deploys before those credentials exist.

Verify lanes render these bindings from the committed fixture instead, which is what makes a pull request offline by construction — it cannot obtain credentials or reach a state backend.
