# Task 0006 - Implementer Report

## Summary

Added a Terraform component at `infra/terraform/supabase/` that provisions
fresh Supabase projects for `stage` and `prod` environments under the
`sourceplane` organization (`dwazxcrywsdbxpuouifa`), generates database
credentials via the `random_password` resource, and stores connection details
in AWS Secrets Manager. The CI workflow was updated to map `SUPABASE_API_KEY`
to `SUPABASE_ACCESS_TOKEN` for provider authentication.

## Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `infra/terraform/supabase/component.yaml` | Created | Orun component definition (stage + prod only) |
| `infra/terraform/supabase/terraform/main.tf` | Created | Terraform config: Supabase projects + Secrets Manager |
| `infra/terraform/supabase/terraform/.terraform.lock.hcl` | Created | Provider lock file |
| `infra/terraform/supabase/README.md` | Created | Component documentation |
| `.github/workflows/ci.yml` | Modified | Added `SUPABASE_ACCESS_TOKEN` env var mapping |

## Supabase Resources

| Environment | Project Name | Region | Status |
|-------------|-------------|--------|--------|
| stage | multi-tenant-saas-stage | ap-southeast-1 | Pending apply |
| prod | multi-tenant-saas-prod | ap-southeast-1 | Pending apply |
| dev | — | — | Intentionally excluded |

- Organization: `sourceplane` (ID: `dwazxcrywsdbxpuouifa`)
- Provider: `supabase/supabase` v1.9.1
- Instance size: `micro`

## Supabase CLI/API Verification

Not yet performed — awaiting live apply. After apply, verification should use:
```bash
supabase projects list -o json
```
And confirm both project names and regions match expectations.

## Secrets Manager Resources

| Secret Path | Environment | Status |
|-------------|-------------|--------|
| `sourceplane/multi-tenant-saas/supabase/stage` | stage | Pending apply |
| `sourceplane/multi-tenant-saas/supabase/prod` | prod | Pending apply |

No `dev` secret is created.

## Orun Plan Impact

- Component subscribes to `stage` and `prod` only
- Depends on `bootstrap` component
- Plan generates 5 jobs (bootstrap dev/stage/prod + supabase stage/prod)
- DAG correctly chains: bootstrap.stage -> supabase.stage -> supabase.prod

## Checks Run

| Check | Result |
|-------|--------|
| `terraform fmt -check` | PASS |
| `terraform init -backend=false` | PASS |
| `terraform validate -no-color` | PASS |
| `orun validate --intent intent.yaml` | PASS |
| `orun plan --intent intent.yaml --view dag` | PASS (supabase visible, stage+prod only) |
| `orun plan --changed --intent intent.yaml --output plan.json` | PASS (5 jobs) |
| `orun run --plan plan.json --dry-run --runner github-actions` | PASS |

## Sensitive Data Review

- `random_password.db_password` marked sensitive in provider
- `database_password` output marked `sensitive = true`
- Secret values stored only in AWS Secrets Manager via `aws_secretsmanager_secret_version`
- No passwords, keys, or connection strings in git, logs, or outputs
- `SUPABASE_ACCESS_TOKEN` passed as env var, never logged

## Assumptions

- Supabase region `ap-southeast-1` is available for new project creation (not
  verified until live apply)
- `supabase/supabase` provider v1.9.1 supports `instance_size = "micro"`
- The composition's `terraform-env` step exports `spec.env` entries to the job
  environment; `SUPABASE_ACCESS_TOKEN` is instead passed directly from CI env
- Database password with 32 chars and special characters is acceptable for
  Supabase's password requirements

## Remaining Gaps

- Live apply not yet performed — project refs unknown until Supabase assigns them
- Cloudflare Hyperdrive wiring deferred to a follow-up Cloudflare infra component
- No `terraform plan` against live backend (requires AWS credentials)
- Password encoding in connection URI may need URL-encoding if special chars
  cause issues (monitor at apply time)

## Next Task Dependencies

- Hyperdrive component will need to read from Secrets Manager paths established here
- Application code will consume connection details from Secrets Manager
- Schema migrations will target the provisioned databases after apply

## PR Number

Not yet created — component is ready for PR submission.
