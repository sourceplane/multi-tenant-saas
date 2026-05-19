# Open Risks

Last updated: 2026-05-19

## Active Risks

- Task 0003 is locally implemented but has no PR yet. Task 0004 must not start
  until Task 0003 is committed, pushed, reviewed, verified, and merged.
- The dirty worktree includes `agents/agent-loop.sh`, which is not described in
  the Task 0003 report. Exclude it from the Task 0003 PR unless a worker proves
  it is required for Task 0003 acceptance.
- Existing Terraform components still model an R2 backend path. They must be migrated or replaced with S3 backend usage before any new apply-capable infra task (Task 0005).
- The `aws-admin` repo does not yet have the repo-scoped `sourceplane/multi-tenant-saas` IAM component. Until it lands and is verified, this repo cannot safely assume AWS roles for S3 state or Secrets Manager.
- Supabase provisioning must not log generated database passwords or API keys. Secret names may be reported; secret values may not.
- Cross-repo sequencing matters: `aws-admin` role creation must land before `multi-tenant-saas` consumes the role in CI or Terraform components.
- The S3 backend init step in the terraform composition will fail on live runs until Task 0004 creates the IAM roles and Task 0005 wires them. Plan-only profile skips apply but init still attempts backend connection.

## Resolved Risks (Task 0003)

- Orun runtime/CI/composition drift from `aws-admin` — resolved by aligning to v2.1.0 and matching composition contract.
- Environment name mismatch (`staging`/`production` vs `stage`/`prod`) — resolved by renaming all component subscriptions.
- Schema contract mismatch (`inputs` vs `parameters`) — resolved by migrating all schemas and components to `parameters`.

## Watch Items

- Keep `.github/workflows/ci.yml` Orun-only.
- Verify that local `kiox -- orun ...` behavior and GitHub Actions behavior use the same rendered plan.
- Keep reusable SaaS starter work separate from product-specific `specs-v2` work.
- Any live AWS, Cloudflare, or Supabase resource creation must be independently verified by the verifier before merge.
