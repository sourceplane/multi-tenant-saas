# Open Risks

Last updated: 2026-05-20

## Active Risks

- Supabase provisioning must not log generated database passwords or API keys. Secret names may be reported; secret values may not.
- Cross-repo sequencing matters: `aws-admin` role creation must land before `multi-tenant-saas` consumes the role in CI or Terraform components.
- Task 0005 must wire AWS credentials into the Orun Terraform path before any
  Terraform component is added in this repo. Without that, `terraform init`
  against the S3 backend will fail in CI and local verification.
- The deploy trust subject from Task 0004 is
  `repo:sourceplane/multi-tenant-saas:environment:production`. If this repo
  later adopts per-environment GitHub environments for live apply, `aws-admin`
  trust subjects will need a follow-up update.
- This repo currently has no GitHub environments configured. Until environment
  `production` exists and apply jobs bind to it correctly, the Task 0005
  deploy-role path cannot be exercised end-to-end.
- PR #27 for Task 0005 appears to include at least one likely out-of-scope file
  (`agents/agent-loop.sh`). Verification must confirm the PR boundary before
  merge.
- Task 0005 branch content and `ai/reports/task-0005-implementer.md` currently
  disagree about whether the Terraform credential step uses
  `aws-actions/configure-aws-credentials@v4` or a native shell OIDC exchange.
  Verification must resolve this drift from code and CI logs, not by trusting
  the report.
- The orphaned R2 bucket `sourceplane-tf-state` and Hyperdrive adoption scaffold
  created in Task 0002 remain as live resources. They are intentionally out of
  scope for deletion in Task 0003.1; a future cleanup task may address them.

## Resolved Risks (Task 0004)

- Cross-repo AWS access was blocking S3 backend and Secrets Manager work.
  Resolved by verifying and merging `sourceplane/aws-admin#22`, then confirming
  post-merge apply in CI run `26134394923` and recording the exact IAM role
  identifiers for Task 0005.

## Resolved Risks (Task 0003.1)

- `main` was failing (CI run `26113133649`) because `tf-state-r2` selected
  Terraform `apply` on `github-push-main` and attempted to create the existing
  bucket `sourceplane-tf-state`, failing with Cloudflare `409 Conflict`. Resolved
  by deleting `infra/terraform/tf-state-r2/` and `infra/terraform/core/` from
  active repo source in PR #26. Post-merge `main` CI run `26115035887` passed.
  No live resource cleanup was performed.

## Resolved Risks (Task 0003)

- Orun runtime/CI/composition drift from `aws-admin` — resolved by aligning to v2.1.0 and matching composition contract.
- Environment name mismatch (`staging`/`production` vs `stage`/`prod`) — resolved by renaming all component subscriptions.
- Schema contract mismatch (`inputs` vs `parameters`) — resolved by migrating all schemas and components to `parameters`.
- Non-Terraform setup-node `<no value>` failures — resolved in PR #25 by
  updating job templates to use `{{ .parameters.* }}` and Orun identity context.
- Task 0003 PR verification/merge gating — resolved; PR #25 is merged.

## Watch Items

- Keep `.github/workflows/ci.yml` Orun-only.
- Verify that local `kiox -- orun ...` behavior and GitHub Actions behavior use the same rendered plan.
- Keep reusable SaaS starter work separate from product-specific `specs-v2` work.
- Any live AWS, Cloudflare, or Supabase resource creation must be independently verified by the verifier before merge.
