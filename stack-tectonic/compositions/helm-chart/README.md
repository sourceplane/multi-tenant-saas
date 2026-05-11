# helm-chart

`helm-chart` is an exported Orun composition in the Stack Tectonic catalog.

## Purpose

Helm chart validation jobs for chart components

## Contract

- **Type:** `helm-chart`
- **Path:** `compositions/helm-chart`
- **Definition:** `compositions.yaml`

## Example fixtures

These sample assets are excerpted or adapted from `example-platform-repo` so the contract is documented with realistic consumer-repo shapes.

- `examples/identity-portal-chart`

## Test fixtures

- `tests/smoke`

## Verification

`./scripts/verify-composition.sh helm-chart` checks that this composition keeps its contract, fixture, and generated-doc scaffolding intact.
