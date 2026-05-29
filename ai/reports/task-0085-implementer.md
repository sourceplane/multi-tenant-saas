# Task 0085 — Implementer Report

**Branch:** `impl/task-0085-cloudflare-v5-workers-custom-domain`
**PR:** [#132](https://github.com/sourceplane/multi-tenant-saas/pull/132)
**Scope:** `infra/terraform/cloudflare-domain/` only.

## Summary

- Bumped the cloudflare Terraform provider in `cloudflare-domain` from
  `~> 4.52` to `~> 5.0`, closing the last v4 pin in the repo.
- Renamed `cloudflare_workers_domain.console` →
  `cloudflare_workers_custom_domain.console` (the v5 name); attribute
  shape is unchanged so the rename is state-only.
- Added a `moved {}` block that translates both stage and prod state
  addresses across the rename. Plan diff expectation per env is
  `Plan: 0 to add, 0 to change, 0 to destroy.` with a `# … has moved
  to …` notice; live IDs
  `052eaece5e989d5a7280b6c206e562c42950e3a6` (stage) and
  `31e5f2ed1b1e4a5700e8ae0678846a0d753840e1` (prod) must survive
  byte-identical.
- Migrated `data.cloudflare_zone.existing` (lookup-by-name → nested
  `filter` block) and `cloudflare_zone.managed` (nested `account`
  block, `zone`→`name`, dropped `plan`) to their v5 shapes. The
  managed-zone resource has `count = 0` in both live envs but must
  remain schema-valid.
- Refreshed `.terraform.lock.hcl` locally for four platforms
  (`linux_amd64`, `linux_arm64`, `darwin_amd64`, `darwin_arm64`) so
  PR CI reuses the pinned hashes deterministically.

## Files Changed

Terraform sources (`infra/terraform/cloudflare-domain/terraform/`):

- `main.tf` — provider pin bump, resource rename, `moved` block, v5
  shape fixes on `data.cloudflare_zone` and `cloudflare_zone`,
  output redirected to the renamed resource, comment block
  rewritten.
- `.terraform.lock.hcl` — cloudflare `4.52.7` → `5.19.1`, multi-arch
  hashes pinned.

Component docs (`infra/terraform/cloudflare-domain/`):

- `README.md` — Resources Managed table updated to the v5 name,
  v4-vs-v5 note rewritten to record completion + preserved IDs,
  Outputs list updated.

Orchestration scope:

- `ai/tasks/task-0085.md` — orchestrator-authored task scope file
  committed for verifier reference.

## Checks Run

| Command | Result |
|---|---|
| `terraform -chdir=infra/terraform/cloudflare-domain/terraform fmt -check -diff` | ✓ exit 0, no diff |
| `terraform -chdir=infra/terraform/cloudflare-domain/terraform init -backend=false -input=false` | ✓ `cloudflare/cloudflare v5.19.1` installed |
| `terraform -chdir=infra/terraform/cloudflare-domain/terraform validate` | ✓ `Success! The configuration is valid` with one expected `Warning: Attribute Deprecated` on `cloudflare_workers_custom_domain.console.environment` |
| `terraform providers lock -platform=linux_amd64 -platform=darwin_arm64 -platform=darwin_amd64 -platform=linux_arm64` | ✓ multi-arch hashes recorded |
| `./.workspace/bin/orun validate` | ✓ Intent is valid; All validation passed |
| `./.workspace/bin/orun plan --changed --intent intent.yaml --output plan.json` | ✓ 1 component × 3 envs → 2 jobs (stage + prod, both `terraform.plan-only`) |
| `./.workspace/bin/orun run --plan plan.json --dry-run --runner github-actions` | ✓ both jobs preview ✓; `2 selected` |

## Plan Diff Evidence

Local plan execution against the live S3 backend was not run from the
laptop (no CI-issued AWS/Cloudflare creds in this shell). The
authoritative plan-diff evidence is the PR-CI `cloudflare-domain ·
{stage,prod} · Terraform` jobs. Expected shape per env:

```
# cloudflare_workers_domain.console[0] has moved to cloudflare_workers_custom_domain.console[0]

Plan: 0 to add, 0 to change, 0 to destroy.
```

If either env reports `1 to destroy, 1 to add` instead of a `moved`
no-op, that invalidates this PR per the task's failure-mode list and
the verifier must STOP before merge.

## Assumptions

Decisions taken under implementer latitude (per orchestrator brief):

- **Provider pin shape:** `~> 5.0` — floats forward on patch and
  minor releases inside the 5.x major; ratchet to a tighter band
  deferred until v6 is announced. Rationale: the migration guide
  treats 5.x as a stable line; tighter pins create maintenance work
  with no immediate safety benefit.
- **Lock file:** refreshed locally with `terraform providers lock`
  for all four prod-relevant platforms rather than deferred to CI
  `terraform init`. Rationale: CI on Linux runners reuses the pinned
  hash exactly rather than re-resolving `~> 5.0` to whatever is
  latest at init time, which keeps the plan-diff evidence on this PR
  reproducible.
- **`moved {}` block organization:** single block at module level
  (not per-env). The same module is instantiated once per workspace,
  and Terraform applies the `moved` rewrite per-workspace at plan
  time — a single block is sufficient and clearer than splitting.
- **`environment` attribute kept on the renamed resource:** v5 marks
  it as deprecated-but-optional; `terraform validate` emits one
  one-line warning. Kept intentionally so the `moved` migration is
  byte-identical with state. Dropping it would force an in-place
  update on the live resource, which is out of scope.
- **`cloudflare_zone.managed` v5 shape:** migrated even though
  `count = 0` in both live envs, because `terraform validate` would
  fail on the old v4 attribute shape under the v5 provider. Used
  the simplest v5 shape (`account = { id = ... }`, `type = "full"`,
  no `plan`) — `plan` now lives on the separate
  `cloudflare_zone_subscription` resource and is out of scope here.

## Spec Proposals

None. The v5 migration was state-neutral via `moved` + minor v5
attribute shape fixes; no behavioral change required a Spec Change
Proposal.

## Remaining Gaps

- **`environment` deprecation, future v6:** the `environment`
  attribute on `cloudflare_workers_custom_domain` is deprecated in
  v5.x. When `~> 5.0` eventually retires (v6), this attribute will
  almost certainly be removed; that will be its own task and will
  need to either drop the line cleanly (if v6 treats absence the
  same as `"production"`) or accept an in-place update on the
  resource.
- **`cloudflare_zone_settings_override` not present in this
  component**, so the two-phase v4→v5 `tf-migrate` workflow does not
  apply here.

## Next Task Dependencies

None expected — this closes the v4 debt called out in Tasks 0083 and
0084 ledger entries.

## PR Number

**#132** — https://github.com/sourceplane/multi-tenant-saas/pull/132
