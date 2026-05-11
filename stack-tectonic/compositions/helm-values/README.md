# helm-values

`helm-values` is an exported Orun composition in the Stack Tectonic catalog.

## Purpose

Helm values validation jobs for deployment files

## Contract

- **Type:** `helm-values`
- **Path:** `compositions/helm-values`
- **Definition:** `compositions.yaml`

## Example fixtures

These sample assets are excerpted or adapted from `example-platform-repo` so the contract is documented with realistic consumer-repo shapes.

- `examples/identity-portal-values`

## Test fixtures

- `tests/smoke`

## Verification

`./scripts/verify-composition.sh helm-values` checks that this composition keeps its contract, fixture, and generated-doc scaffolding intact.
