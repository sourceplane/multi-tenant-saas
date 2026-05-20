# Task 0004 Implementer Report

## Summary

Created the `github-repo-sourceplane-multi-tenant-saas` component in `aws-admin` that provisions environment-scoped GitHub OIDC IAM roles for `sourceplane/multi-tenant-saas`. The roles grant S3 Terraform state access and Secrets Manager permissions scoped to `sourceplane/multi-tenant-saas/*`.

## Files Changed

All files are new, under `domains/access/github-repositories/sourceplane-multi-tenant-saas/`:

- `component.yaml` — component manifest with metadata, labels, parameters, dependencies, and environment subscriptions
- `README.md` — component documentation with metadata, purpose, resources, trust model, permissions, parameters, outputs, and usage
- `policies/plan.json` — read-oriented IAM policy (S3 read, IAM inspect, Secrets Manager read)
- `policies/deploy.json` — mutating IAM policy (S3 state write, Secrets Manager lifecycle, KMS via Secrets Manager)
- `terraform/backend.tf` — S3 backend configuration
- `terraform/local.tf` — component locals with role definitions and trust subjects
- `terraform/main.tf` — provider, data sources, and module invocation
- `terraform/outputs.tf` — role ARN and name outputs
- `terraform/variables.tf` — standard Orun/Terraform variable declarations

## Checks Run

| Check | Result |
| --- | --- |
| `orun validate --intent intent.yaml` | passed |
| `orun plan --intent intent.yaml --view dag` | component appears in dev, stage, prod (13 jobs total) |
| `orun plan --intent intent.yaml --output plan.json` | plan compiled successfully |
| `orun run --plan plan.json --dry-run --runner github-actions` | all 13 jobs pass dry-run |
| `terraform fmt -check` | passed |
| `terraform init -backend=false` | skipped (local TF 1.15.2 < required 1.15.3; CI uses setup-terraform) |

## Created IAM Roles And Policies

Per environment, 2 roles and 2 policies are created:

| Environment | Plan role | Deploy role |
| --- | --- | --- |
| `dev` | `dev-github-sourceplane-multi-tenant-saas-plan` | `dev-github-sourceplane-multi-tenant-saas-production-deploy` |
| `stage` | `stage-github-sourceplane-multi-tenant-saas-plan` | `stage-github-sourceplane-multi-tenant-saas-production-deploy` |
| `prod` | `prod-github-sourceplane-multi-tenant-saas-plan` | `prod-github-sourceplane-multi-tenant-saas-production-deploy` |

Longest name is 60 characters (under the 64-character AWS limit).

## Secret Namespace

```
sourceplane/multi-tenant-saas/*
```

All Secrets Manager mutating actions are scoped to this ARN pattern:
`arn:aws:secretsmanager:*:*:secret:sourceplane/multi-tenant-saas/*`

## Assumptions

- The AWS account's Secrets Manager uses the default `aws/secretsmanager` KMS key. The KMS policy uses a `kms:ViaService` condition rather than a specific key ARN.
- `secretsmanager:ListSecrets` requires `Resource: "*"` per AWS documentation.
- The deploy role uses `environment:production` as the OIDC subject, matching the existing repo convention. If `multi-tenant-saas` uses environment-per-lane subjects (e.g., `environment:dev`, `environment:stage`), additional subjects would be needed.
- S3 state write permissions in the deploy policy are scoped to `multi-tenant-saas` key paths across all three buckets.

## Remaining Gaps

- CI must pass and the PR must be merged + applied before roles exist in AWS.
- After apply, the actual role ARNs (with account ID) must be confirmed for Task 0005 consumption.
- If `multi-tenant-saas` needs per-environment deploy subjects (not just `production`), the trust policy subjects should be extended in a follow-up.

## PR Number

https://github.com/sourceplane/aws-admin/pull/22
