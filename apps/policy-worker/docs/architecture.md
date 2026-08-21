# policy-worker — architecture

A `cloudflare-worker-turbo` component: TypeScript Worker built by the turbo pipeline from `apps/policy-worker`, deployed per environment by its CI lane.

## Bindings and wiring

- No service bindings, wiring documents or runtime secrets.

Verify lanes render these bindings from the committed fixture instead, which is what makes a pull request offline by construction — it cannot obtain credentials or reach a state backend.
