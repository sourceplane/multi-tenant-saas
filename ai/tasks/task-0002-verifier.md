# Task ID

Task 0002

# Agent

Verifier

# Current Repo Context

Task 0001 and Task 0001.1 are verified and merged. `main` is at `c88ee5c`
with the committed local `stack-tectonic/` catalog, provider-style
`kiox.yaml`/`kiox.lock`, and Orun-only CI.

Task 0002 implementation is open as PR #8:

- PR: https://github.com/sourceplane/multi-tenant-saas/pull/8
- Branch: `task-0002/infra-terraform-baseline`
- Head SHA: `a359740bfe595527b9473933b7f76a6dd2f63498`
- CI run: `25674026581`
- Current checks: `plan`, `infra-terraform-state · dev · Validate terraform`,
  and `infra-terraform-core · dev · Validate terraform` are all green.

The implementer report is `ai/reports/task-0002-implementer.md`.

# Objective

Verify PR #8 for Task 0002, focusing on whether it safely discovers and
documents the existing Cloudflare/Supabase baseline and adds only a conservative
Terraform adoption scaffold.

# PR Boundary

Verify the existing PR #8 branch. This is a read-only adoption-scaffold PR.

If verification-only fixes are required, keep them minimal, commit them to PR
#8, push, and re-check CI before deciding PASS/FAIL.

# Read First

- `agents/orchestrator.md`
- `ai/tasks/task-0002.md`
- `ai/reports/task-0002-implementer.md`
- `ai/context/current.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `specs/constitution.md`
- `specs/repo.md`
- `specs/access-and-infra.md`
- `specs/components/00-foundation-and-tooling.md`
- `intent.yaml`
- `kiox.yaml`
- `.github/workflows/ci.yml`
- `stack-tectonic/compositions/terraform/compositions.yaml`
- `infra/terraform/state/component.yaml`
- `infra/terraform/core/component.yaml`
- PR #8 diff and CI logs

# Required Outcomes

- Confirm PR #8 maps to exactly Task 0002 and does not broaden into domain
  behavior, database migrations, runtime app behavior, product-specific
  `specs-v2/**` work, or live resource mutation.
- Confirm `intent.yaml` still uses local `stack-tectonic/` via `kind: dir` /
  `path: stack-tectonic/`, and CI remains Orun-only.
- Confirm `infra/terraform/state` and `infra/terraform/core` contain real
  Terraform configuration that validates with the current local Terraform
  composition.
- Confirm Terraform state/resource intent is conservative:
  - `infra/terraform/state` creates only the missing `sourceplane-tf-state`
    R2 bucket on a future apply.
  - `infra/terraform/core` represents existing `sourceplane-db` Hyperdrive by
    import/adoption, not duplicate creation.
  - No committed credentials, database passwords, Supabase service keys,
    Terraform state, `.terraform/**`, `.orun/**`, `plan.json`, or generated
    caches are present.
- Independently inspect Cloudflare state where credentials allow:
  - confirm account `f9270f828799775bebf9315248fdf717`,
  - confirm Hyperdrive `sourceplane-db` exists and has the recorded ID,
  - confirm R2 bucket `sourceplane-tf-state` does not already exist, or document
    any changed live state exactly.
- Inspect Supabase only as far as authenticated tooling allows. Do not log or
  expose secrets. Treat project ref/region as inferred unless directly verified.
- Inspect GitHub Actions logs, not only status summaries. Confirm CI ran
  `orun plan --changed --intent intent.yaml --output plan.json` and matrix
  jobs ran through `orun run` for both Terraform components.
- Decide whether the committed `.terraform.lock.hcl` files are appropriate for
  this repo and do not encode machine-local or secret state.

# Non-Goals

- Do not run `terraform apply`, Terraform import, or any destructive Terraform
  command.
- Do not create, mutate, import, or destroy Cloudflare or Supabase resources.
- Do not add Terraform plan/apply composition jobs in this verifier task unless
  a tiny verification-only fix is required to make PR #8 truthful.
- Do not add Supabase provider adoption, database schema, migrations, Worker
  bindings, identity, organization, membership, project, billing, audit, or
  product runtime behavior.
- Do not apply product-specific `specs-v2/**`.

# Constraints

- Trust observed resource state over stale docs.
- Keep secrets out of logs and reports. Redact any sensitive values if commands
  print them.
- Preserve the local `stack-tectonic/` model and generated-state ignore rules.
- Do not merge with unresolved verification blockers.
- If PASS, merge PR #8, sync local `main` to `origin/main`, and leave the local
  repo clean.
- If FAIL, leave PR #8 open and make blockers concrete.

# Integration Notes

- The current Terraform composition validates only with `terraform fmt -check`,
  `terraform init -backend=false`, and `terraform validate`. Full plan/apply is
  an explicit remaining gap for a future task.
- The Task 0002 scope allows read-only discovery and conservative adoption
  metadata. It does not require live import/apply.
- Existing baseline from implementer report:
  - Cloudflare account: `f9270f828799775bebf9315248fdf717`
  - Hyperdrive `sourceplane-db`: `d9c62c4acf934dd7bb82f63ed02db564`
  - Existing unrelated Hyperdrive `oruncloud-db` must not be managed here.
  - R2 bucket `sourceplane-tf-state` was reported missing.
  - Supabase project ref `kfgwglxvxoiisoakkndm` is inferred from pooler user.

# Acceptance Criteria

- PR #8 diff is limited to Task 0002 scope.
- Terraform validation passes for both infra components:
  - `terraform fmt -check`
  - `terraform init -backend=false -input=false`
  - `terraform validate -no-color`
- `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`
  passes.
- `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent
  intent.yaml --output plan.json` passes and produces a parseable plan.
- `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run
  --runner github-actions` passes or records a true no-op result if no jobs are
  planned.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass locally
  unless an unrelated blocker is documented with exact output.
- PR #8 CI logs confirm the expected Orun plan/run commands ran and the two
  Terraform validation jobs passed.
- Independent Cloudflare inspection either confirms the implementer-recorded
  baseline or documents the exact credential/tooling blocker or changed live
  state.
- The verifier report is written at `ai/reports/task-0002-verifier.md`.
- PASS requires merging PR #8 and syncing local `main`; FAIL requires clear
  unresolved blockers.

# Verification

Use both local checks and GitHub Actions evidence:

```bash
git status --short --branch
gh pr view 8 --json number,title,headRefName,baseRefName,headRefOid,mergeable,statusCheckRollup,url
gh run view 25674026581 --json databaseId,conclusion,headSha,jobs,url
gh run view 25674026581 --log --job 75366765335
gh run view 25674026581 --log --job 75366796295
gh run view 25674026581 --log --job 75366796553

terraform -chdir=infra/terraform/state fmt -check
terraform -chdir=infra/terraform/state init -backend=false -input=false
terraform -chdir=infra/terraform/state validate -no-color
terraform -chdir=infra/terraform/core fmt -check
terraform -chdir=infra/terraform/core init -backend=false -input=false
terraform -chdir=infra/terraform/core validate -no-color

/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Suggested read-only Cloudflare checks, adapting command flags to the installed
Wrangler version:

```bash
wrangler whoami
wrangler hyperdrive list --account-id f9270f828799775bebf9315248fdf717
wrangler r2 bucket list --account-id f9270f828799775bebf9315248fdf717
```

If you merge, follow the verifier merge protocol from `agents/orchestrator.md`.

# When Done Report

Write `ai/reports/task-0002-verifier.md` with:

- Result: PASS|FAIL
- Checks
- Issues
- Risk Notes
- Spec Proposals
- Recommended Next Move
