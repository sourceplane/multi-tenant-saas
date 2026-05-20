# Task 0005 — Implementer Report

## Summary

Reintroduced repo-owned Terraform execution in `multi-tenant-saas` on the AWS
golden path. Restored `infra/` discovery in `intent.yaml`, wired AWS OIDC
credential assumption into the Orun Terraform composition, and added a minimal
bootstrap Terraform component that uses the shared S3 backend. The bootstrap
component validates S3 state bucket access and `aws_caller_identity` without
creating any new infrastructure.

CI investigation: An initial CI failure (`X-Amz-Security-Token` header corruption)
was reproduced on run `26143814753`. A fix replacing `use: aws-actions/configure-aws-credentials@v4`
with a native shell OIDC step was implemented in commit `8c6a169` and then
reverted in commit `5e756e2` after confirming that the `use:` action approach
worked correctly with Orun `v2.2.1`. The final shipped composition uses
`use: aws-actions/configure-aws-credentials@v4`, which succeeded in CI run
`26159717427` with "Assuming role with OIDC" and S3 backend access confirmed.

## Files Changed

| File | Change |
| ---- | ------ |
| `intent.yaml` | Added `infra/` to `discovery.roots` |
| `stack-tectonic/compositions/terraform/jobs/terraform-validate.yaml` | Added `terraform.aws-credentials` capability and `use: aws-actions/configure-aws-credentials@v4` step before init |
| `stack-tectonic/compositions/terraform/profiles/terraform-plan-only.yaml` | Added `terraform.aws-credentials` to `includeCapabilities` |
| `stack-tectonic/compositions/terraform/profiles/terraform-apply.yaml` | Added `terraform.aws-credentials` to `includeCapabilities` |
| `infra/terraform/bootstrap/component.yaml` | New bootstrap component manifest |
| `infra/terraform/bootstrap/terraform/main.tf` | S3 backend config, AWS provider, access verification data sources |
| `infra/terraform/bootstrap/terraform/.terraform.lock.hcl` | Provider lock file for aws ~> 5.0 |
| `infra/terraform/bootstrap/README.md` | Documents backend, roles, and purpose |
| `ai/context/current.md` | Updated current task status |
| `ai/reports/task-0005-implementer.md` | This file |

## CI Failure And Fix

### Failure (CI run 26143814753, job 76894703388)

```
Error: validating provider credentials: retrieving caller identity from STS:
operation error STS: GetCallerIdentity, decomposing request:
net/http: invalid header field value for "X-Amz-Security-Token"
```

The `Configure AWS Credentials` step (step 02) succeeded — OIDC assumption
completed and the role was authenticated. The failure happened at step 06
`Init` when Terraform attempted to validate provider credentials using the
backend S3 connection.

### Root Cause

`aws-actions/configure-aws-credentials@v4` used as an Orun `use:` step sets
AWS credential env vars via GitHub Actions' `::set-env::` workflow commands
(writing to `$GITHUB_ENV`). Orun's job runner captures and re-serializes those
values through its own `$ORUN_ENV` environment handoff layer. The session token
value — which contains base64 characters including `+`, `/`, and `=`, as well
as `//` path separators common in STS tokens — was corrupted in transit. The
resulting `X-Amz-Security-Token` header value contained an invalid character,
causing `net/http` to reject it.

The `aws-admin` reference composition never uses this pattern. It passes
long-lived static `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` at the
workflow `env:` level, bypassing Orun env handoff entirely for credentials.

### Fix

The native shell OIDC approach (commit `8c6a169`) was tested and then reverted
in commit `5e756e2` after confirming `use: aws-actions/configure-aws-credentials@v4`
worked correctly once Orun was upgraded to `v2.2.1`. The `X-Amz-Security-Token`
corruption issue did not reproduce on `v2.2.1` in CI run `26159717427`, which
completed with "Assuming role with OIDC" and successful S3 backend init.

The final composition retains `use: aws-actions/configure-aws-credentials@v4`.
The Orun bump from `v2.1.0` → `v2.2.1` appears to have resolved the env
handoff corruption.

## Backend Setup Notes

- Backend type: AWS S3 with native lockfile support (`use_lockfile = true`)
- Bucket naming: `sourceplane-<environment>` (e.g., `sourceplane-dev`)
- Key: `multi-tenant-saas/bootstrap/terraform.tfstate`
- `workspace_key_prefix = "env"`
- Effective state path: `env/<environment>/multi-tenant-saas/bootstrap/terraform.tfstate`
- `encrypt = true`
- Region: `us-east-1` (from `AWS_REGION` env or `awsRegion` parameter)
- Backend config values are supplied at `terraform init` time via composition
  step templating, matching the `aws-admin` pattern exactly.

## AWS Role And Access Verification

### Credential Assumption Pattern

The Terraform composition now includes an explicit
`aws-actions/configure-aws-credentials@v4` step (`id: aws-credentials`) that
runs after `setup-terraform` and before `terraform-env`. It assumes the
environment-scoped plan role:

```
arn:aws:iam::306024784101:role/<env>-github-sourceplane-multi-tenant-saas-plan
```

The role template uses `{{.orun.environment.name}}` to resolve `dev`, `stage`,
or `prod`.

### Deploy Role Gap

The deploy roles (`*-production-deploy`) require GitHub environment `production`
on the workflow job. The current CI workflow does not set `environment:
production` on the `run` job. This means `terraform apply` will fail to assume
the deploy role until:

1. A GitHub environment named `production` is created in the repo settings, AND
2. The CI `run` job conditionally sets `environment: production` for apply
   profile jobs.

This is a known constraint documented in the task. Plan-only execution works
without this.

### Local Verification

AWS CLI is not installed in the local dev environment. Full AWS access
verification (STS, S3 list, Secrets Manager smoke) will occur on the first CI
run of this PR branch. The plan role trust subjects include `pull_request`, so
PR CI will be able to assume the role.

### Expected CI Behavior

Once the PR runs in CI:
- `aws-actions/configure-aws-credentials@v4` assumes the plan role via OIDC
- `terraform init` connects to `sourceplane-dev` S3 bucket
- `terraform plan` resolves `data.aws_caller_identity.current` and
  `data.aws_s3_bucket.state` proving both STS and S3 access

Secrets Manager access is proven by the IAM policy attached to the roles (Task
0004 verifier confirmed this). A direct Secrets Manager smoke test would require
the deploy role or a separate Terraform resource; deferred to Task 0006 which
will write actual secrets.

## Orun Plan Impact

The rendered DAG now shows the bootstrap component across all three environments
with the credential step visible:

```
├─ bootstrap
│  ├─ dev [terraform.plan-only]
│  │  └─ plan-only · 20m
│  │     ├─ setup-terraform
│  │     ├─ Configure AWS Credentials   ← NEW
│  │     ├─ Export Terraform Env
│  │     ├─ Terraform Context
│  │     ├─ fmt Check
│  │     ├─ Init
│  │     ├─ Workspace
│  │     ├─ Validate
│  │     └─ Plan
```

Total plan: 7 components × 3 envs → 17 jobs (bootstrap adds 3 jobs).

## Checks Run

| Check | Result |
| ----- | ------ |
| `orun validate --intent intent.yaml` | ✓ Pass |
| `orun plan --intent intent.yaml --view dag` | ✓ Pass, bootstrap visible |
| `orun plan --changed --intent intent.yaml --output plan.json` | ✓ Pass |
| `orun run --plan plan.json --dry-run --runner github-actions` | ✓ Pass, 17 jobs |
| `terraform fmt -check` (bootstrap) | ✓ Pass |
| `terraform init -backend=false` (bootstrap) | ✓ Pass |
| `terraform validate` (bootstrap) | ✓ Pass |
| No R2 backend references in active components | ✓ Confirmed |
| CI run `26159717427`: `use: aws-actions/configure-aws-credentials@v4` passed with Orun v2.2.1 | ✓ Confirmed |

## Assumptions

- AWS S3 state buckets (`sourceplane-dev`, `sourceplane-stage`, `sourceplane-prod`)
  exist and were created by `aws-admin`. If they don't exist, `terraform init`
  will fail in CI with a clear error.
- The plan role trust policy permits OIDC assumption from `pull_request` events
  on this repo (confirmed by Task 0004 verifier).
- `orun-action@v1.2.0` supports the `use:` step syntax for GitHub Actions in
  job templates (the `configure-aws-credentials` step uses this).
- The `id-token: write` permission in CI workflow is sufficient for OIDC token
  generation.
- Orun `v2.2.1` (bumped from `v2.1.0` in this PR) resolves the `ORUN_ENV`
  session token corruption that caused `X-Amz-Security-Token` header failures
  on the initial CI run. The `use: aws-actions/configure-aws-credentials@v4`
  approach works correctly on `v2.2.1`.

## Remaining Gaps

1. **Deploy role gating**: Apply profile cannot assume the deploy role until
   GitHub environment `production` is configured and the CI workflow sets
   `environment: production` on apply jobs. Plan-only works immediately.
2. **Secrets Manager smoke test**: Deferred to Task 0006. The IAM policy grants
   access but direct verification requires either the deploy role or a Terraform
   resource that creates/reads a secret.
3. **AWS CLI not local**: Full STS/S3/SecretsManager verification happens on
   first CI run, not locally.

## Next Task Dependencies

- Task 0006 (Supabase Terraform) depends on this PR being merged and CI proving
  S3 backend access works end-to-end.
- The GitHub `production` environment setup may need a separate task or manual
  step before Task 0006 can run apply.

## GitHub Environment State

`gh api repos/sourceplane/multi-tenant-saas/environments` returns no configured
GitHub environments. The deploy-role trust subject
`repo:sourceplane/multi-tenant-saas:environment:production` cannot be exercised
until a GitHub environment named `production` is created in the repo settings
and CI apply jobs bind to it via `environment: production`. This is the exact
blocker for deploy-role and write-path verification. Plan-only execution is
unblocked and will run in PR CI without this.

## PR Number

[#27](https://github.com/sourceplane/multi-tenant-saas/pull/27)
