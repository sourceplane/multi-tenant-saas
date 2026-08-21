# shared — runbook

## How it ships

Nothing deploys from a package directly: consumers rebuild against it in the same convergence that lands the change. The package's verify lane, and those of its consumers, are the gate.

## When its lane fails

Build and type errors surface in the lane log. Fix them in the same PR as the consuming change — a partial merge leaves consumers red.
