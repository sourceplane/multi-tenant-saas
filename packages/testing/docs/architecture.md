# testing — architecture

A `turbo-package` component in `packages/testing`: TypeScript, built by the turbo pipeline, consumed via workspace references. There is no publish step — the repo is the registry.

The consumers listed in the overview declare this package as a `dependsOn` edge. That edge ORDERS the run — when both sides are in scope, this package's lane precedes theirs, so a build never races the thing it compiles against.

It does **not** pull them into the changed set. `orun plan --changed` is path-based: a commit touching only this package plans this package alone, and an edge whose other side is unselected is dropped with a warning. Redeploying a consumer against a changed package takes an explicit `# ci:` marker on that consumer — which is why the bootstrap stamps them when it retries a phase.
