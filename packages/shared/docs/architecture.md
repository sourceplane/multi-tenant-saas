# shared — architecture

A `turbo-package` component in `packages/shared`: TypeScript, built by the turbo pipeline, consumed via workspace references. There is no publish step — the repo is the registry.

Changes here fan out: every consumer listed in the overview is re-planned when this package changes, so their verify suites gate the blast radius. That edge is declared (`dependsOn`) rather than inferred from the filesystem — without it a Worker can ship a months-old copy of a package that has since changed underneath it.
