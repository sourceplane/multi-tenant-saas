# Proposal

Status: Pending Task 0009 verification.

Update the reusable Orun runtime reference from `v2.2.1` to `v2.3.0` for this
repo, or explicitly reject the Task 0009 runtime bump and schedule a rollback.

# Found By

Orchestrator, while creating the next task after PR #44 rolled `main` back to
the Task 0009 baseline.

# Related Task

Task 0009 / PR #36 (`Task 0009: Cloudflare Hyperdrive infrastructure component`)
and PR #44 (`Revert main to f9356dc (clean rollback)`).

# Current Spec Text / Contract

- `specs/orun-golden-path.md` says this repo uses the Task 0005-verified Orun
  `v2.2.1` path.
- `specs/access-and-infra.md` acceptance says this repo uses the current
  verified Orun runtime, named as `v2.2.1` at the time of Task 0005/0006.

# Repo Reality / New Information

- `kiox.yaml` now pins `ghcr.io/sourceplane/orun:v2.3.0`.
- `.github/workflows/ci.yml` invokes `sourceplane/orun-action@v1.2.0` with
  `version: v2.3.0`.
- Task 0009 PR #36 merged with this runtime bump.
- Main CI run `26293764021` passed and applied the Hyperdrive resources using
  Orun `v2.3.0`.
- PR #44 restored the repo tree to the Task 0009 baseline and main CI run
  `26322419196` passed with Orun `v2.3.0`.

# Proposed Spec Change

If Task 0009 verification accepts the runtime bump:

- Update `specs/orun-golden-path.md` to name Orun `v2.3.0` as this repo's
  current runtime reference.
- Update `specs/access-and-infra.md` acceptance text to avoid stale `v2.2.1`
  wording.
- Update compact context so future tasks do not treat `v2.3.0` as accidental
  drift.

If verification rejects the bump:

- Schedule a bounded implementer task to roll the repo runtime references back
  to `v2.2.1` and prove Terraform/Hyperdrive behavior still works.

# Why This Is Needed

Future tasks must know whether `v2.3.0` is the accepted operational baseline or
an unapproved implementation drift. Leaving the specs on `v2.2.1` while code
uses `v2.3.0` will cause worker agents to make contradictory assumptions about
CI, Orun plans, and Terraform job behavior.

# Impacted Files / Tasks

- `specs/orun-golden-path.md`
- `specs/access-and-infra.md`
- `ai/context/current.md`
- `ai/context/decisions.md`
- future Worker binding and infrastructure tasks

# Compatibility / Migration Notes

- No application API or database contract changes are implied.
- The change is operational/runtime documentation unless verification finds an
  actual Orun behavior regression.
- `aws-admin` may remain a structure/backend reference even if its runtime pin
  differs temporarily.

# Recommendation

Let Task 0009 verification decide from current code, PR #36 logs, PR #44 logs,
and main CI evidence. If verification passes, accept the proposal and update
the specs in the next small spec-alignment task or alongside the verifier
context update if the workflow allows.
