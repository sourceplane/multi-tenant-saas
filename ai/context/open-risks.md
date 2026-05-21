# Open Risks

Last updated: 2026-05-21

## Active Risks

- Supabase provisioning must not log generated database passwords, API keys,
  service keys, or connection strings. Reports may include project refs, secret
  names, and non-secret ARNs only.
- `dev` Supabase remains intentionally unprovisioned. Tasks must not add a dev
  database/project unless a later prompt explicitly changes scope.
- Cloudflare Hyperdrive is not yet wired to the new Supabase `stage` and `prod`
  projects. Workers must not invent direct connection strings or bypass the
  planned Hyperdrive adapter seam.
- No `packages/db` migration harness has landed yet. A local Task 0007 draft
  exists, but identity, membership, projects, events, and other bounded contexts
  still have no merged migration ownership convention until Task 0007.1 lands.
- Local Task 0007 draft work exists on `main` but is not on a task branch and
  has no PR. Task 0007.1 must preserve the draft, finish verification, and open
  one PR before it can be considered complete.
- Ignored generated outputs from the draft exist locally (`dist`,
  `node_modules`, TypeScript build info, `.orun`, Terraform working dirs, and
  `plan.json`). They must not be staged or committed.
- Local AWS CLI credentials are unavailable in this checkout. Tasks that need
  AWS provider inspection must use CI logs, `gh`, or an authenticated role path
  and record any local access blocker clearly.
- GitHub Actions logs from run `26209010693` warn that Node.js 20 actions are
  deprecated and will move toward Node.js 24 defaults. This is not currently
  blocking, but it is a near-term CI maintenance item.
- The deploy trust subject from Task 0004 is
  `repo:sourceplane/multi-tenant-saas:environment:production`. This repo still
  has no GitHub environments configured, so the deploy-role trust path remains
  unexercised end-to-end.
- The orphaned R2 bucket `sourceplane-tf-state` and historical Hyperdrive
  adoption scaffold from Task 0002 remain live historical resources and are not
  owned by current repo source.

## Resolved Risks

- Task 0006 post-merge Supabase apply failure is resolved. PR #31 removed the
  free-plan-incompatible Supabase `instance_size` attribute, `aws-admin` PR #26
  added the missing Secrets Manager lifecycle access, and PR #33 changed
  credential writes to use `aws_secretsmanager_secret_version`.
- Latest `multi-tenant-saas` main CI run `26209010693` passed with
  `supabase.stage.terraform` and `supabase.prod.terraform` apply jobs.
- Supabase `stage` and `prod` projects now exist under organization
  `sourceplane` (`dwazxcrywsdbxpuouifa`) with refs `thielrrsejwhjkdluwqm` and
  `npbvrxkrlyrpnhrqucxa`.
- The repo-level AWS S3 Terraform seam was resolved by Task 0005/PR #27.
- Legacy R2/core Terraform component source was removed by Task 0003.1/PR #26
  without mutating live resources.
- Orun runtime/CI/composition drift was resolved for this repo by following the
  Task 0005/0006 verified `v2.2.1` runtime path.

## Watch Items

- Keep `.github/workflows/ci.yml` Orun-only.
- Verify that local `kiox -- orun ...` behavior and GitHub Actions behavior use
  the same rendered plan.
- Keep reusable SaaS starter work separate from product-specific `specs-v2`
  work.
- Any live AWS, Cloudflare, Supabase, S3, Secrets Manager, or Hyperdrive
  mutation must be independently verified by the verifier before merge.
