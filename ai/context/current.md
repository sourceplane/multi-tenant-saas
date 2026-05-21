# Current Context

Last updated: 2026-05-21

## Repo Reality

- `main` is synced with `origin/main` at
  `29cd21c125423adfd7a17b1a1b12707d63f7982d`.
- Tasks 0001, 0001.1, 0002, 0003, 0003.1, 0004, 0005, 0006, and 0006.1 have
  landed. Task 0006/0006.1 did not leave a formal verifier report, but the
  live Supabase path is now operationally verified by post-merge CI and
  read-only Supabase inspection.
- PR #30 (`chore: update supabase-infra`) merged at
  `fc795e4d974ae57d3e262084c393c04e18076f90` and added
  `infra/terraform/supabase/`.
- PR #31 (`fix: remove instance_size from supabase project for free-plan org`)
  merged at `a5a9cd2c4ae2bbba7cde32914c7f6b88623b4103` and removed the
  free-plan-incompatible `instance_size` attribute from Supabase project
  creation.
- `aws-admin` PR #26 (`Add Supabase secrets access to plan role`) merged at
  `aacca43ba4c629a327ce6cd3b55fc21a6b405242`; its post-merge CI run
  `26204953054` passed and added Secrets Manager lifecycle access for
  `sourceplane/multi-tenant-saas/*`.
- PR #33 (`fix: preserve Supabase Secrets Manager container`) merged at
  `29cd21c125423adfd7a17b1a1b12707d63f7982d` and changed the Supabase
  Terraform component to keep the named AWS Secrets Manager secret stable while
  writing credential changes through `aws_secretsmanager_secret_version`.
- Latest `multi-tenant-saas` main CI run `26209010693` passed. The plan selected
  only `supabase.stage.terraform` and `supabase.prod.terraform`; both apply
  jobs succeeded.
- CI run `26209010693` observed:
  - stage: project `multi-tenant-saas-stage`, ref `thielrrsejwhjkdluwqm`,
    secret ARN
    `arn:aws:secretsmanager:us-east-1:306024784101:secret:sourceplane/multi-tenant-saas/supabase/stage-7vy19S`.
  - prod: project `multi-tenant-saas-prod`, ref `npbvrxkrlyrpnhrqucxa`, secret
    ARN
    `arn:aws:secretsmanager:us-east-1:306024784101:secret:sourceplane/multi-tenant-saas/supabase/prod-ICcSqq`.
- Local read-only `supabase projects list` confirms both projects exist in
  organization `sourceplane` (`dwazxcrywsdbxpuouifa`) in Southeast Asia
  (Singapore). `dev` remains intentionally unprovisioned.
- Local AWS CLI verification was not available in this checkout because local
  AWS credentials are absent. The live apply evidence comes from GitHub Actions
  logs and Supabase CLI read-only inspection.
- Local Orun validation passes:
  `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`.
- Local changed plan on clean `main` produces zero jobs:
  `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json`.
- `pnpm typecheck` could not run locally because workspace dependencies are not
  installed in this checkout (`turbo: command not found`).
- No open pull requests are currently listed for `sourceplane/multi-tenant-saas`.
- The merged root `README.md` is stale: it still describes live Supabase/Terraform
  provisioning as deferred and references deleted R2/core Terraform paths. The
  local Task 0007 draft includes README updates that Task 0007.1 must finish and
  PR.

## Current Roadmap Position

- Active spec pack: reusable SaaS starter under `specs/**`.
- `specs-v2/**` remains out of scope unless the task is product-specific Git
  catalog or CI intelligence work.
- Week 0 operations foundation is functionally complete for AWS S3 backend and
  Supabase `stage`/`prod` provisioning.
- The next high-leverage foundation gap is the Supabase Postgres migration and
  repository-adapter convention layer. No `packages/db` package or migration
  ownership harness has landed yet; a local Task 0007 draft exists and must be
  completed through Task 0007.1.
- Cloudflare Hyperdrive wiring is still missing for the new Supabase projects
  and should follow after the database migration conventions are established or
  when an app/runtime task needs the binding.

## Current Task

- Next implementer task: `ai/tasks/task-0007.1.md`.
- Human input resolved the Task 0007 blocker: continue from the existing local
  Task 0007 work and drive it toward a PR.
- Local Task 0007 draft artifacts exist on `main` in `README.md`,
  `pnpm-lock.yaml`, `ai/tasks/task-0007.md`,
  `ai/reports/task-0007-implementer.md`, `packages/db/`, and `tests/db/`.
- Task 0007.1 must finish verification, create a task branch, push it, open a
  GitHub PR, and update the implementer report with the real PR number.
- `agents/orchestrator.md` now requires implementer task prompts to enforce PR
  creation; a completed implementer report may not leave `PR Number` as `TBD`.
