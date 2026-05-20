# Proposal

Status: Accepted by the Task 0006 spec/task readiness update.

Update the reusable Orun reference from `v2.1.0` to `v2.2.1` for this repo's
Terraform credential path, while keeping `sourceplane/orun-action@v1.2.0`.

# Found By

Orchestrator, after Task 0005 merge verification.

# Related Task

Task 0005

# Current Spec Text / Contract

- `specs/orun-golden-path.md` says `kiox.yaml` pins
  `ghcr.io/sourceplane/orun:v2.1.0` and GitHub Actions uses
  `sourceplane/orun-action@v1.2.0` with `version: v2.1.0`.
- `specs/access-and-infra.md` acceptance currently says this repo uses the same
  Orun runtime version as `aws-admin`.

# Repo Reality / New Information

- Task 0005 merged in PR #27 at `0af75d05bb3660c58d9f991924f2f821c2522d0f`.
- `multi-tenant-saas` now runs Orun `v2.2.1` in `kiox.yaml` and CI.
- PR #27 and post-merge `main` CI run `26160643425` passed with the Terraform
  bootstrap jobs using `aws-actions/configure-aws-credentials@v4`.
- The Task 0005 verifier concluded the `v2.2.1` bump was needed to avoid AWS
  session token corruption in the `ORUN_ENV` handoff path.

# Proposed Spec Change

- Update `specs/orun-golden-path.md` to name Orun `v2.2.1` as the current
  runtime reference for this repo.
- Update compact context/docs that still describe `v2.1.0` as the active local
  reference.
- Clarify whether `aws-admin` must also be upgraded immediately, or whether the
  reusable spec may temporarily allow `multi-tenant-saas` to lead the runtime
  version when a repo-specific fix is required.

# Why This Is Needed

Future tasks should not treat the merged `v2.2.1` runtime as accidental drift.
The current specs describe a runtime version that no longer matches the merged,
verified code path.

# Impacted Files / Tasks

- `specs/orun-golden-path.md`
- `specs/access-and-infra.md`
- `ai/context/current.md`
- Future Task 0006+ prompts that mention the active Orun reference
- Potential follow-up alignment work in `../aws-admin`

# Compatibility / Migration Notes

- No application contracts change.
- This is an operations/spec alignment change.
- If `aws-admin` stays on `v2.1.0` temporarily, the spec should state that the
  repos are intentionally divergent until the reference repo is upgraded.

# Recommendation

Accepted. The runtime update is intentional for this repo. The follow-up updates
`specs/orun-golden-path.md`, `specs/access-and-infra.md`, compact context, and
Task 0006 so future work uses Orun `v2.2.1` locally while continuing to treat
`aws-admin` as the Terraform component/backend style reference.
