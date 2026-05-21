# Current Context

Last updated: 2026-05-21

## Repo Reality

- `main` is synced with `origin/main` at
  `cc40ff0750880b0c34a3b487bec447937968952c`.
- Tasks 0001, 0001.1, 0002, 0003, 0003.1, 0004, 0005, 0006, 0006.1, 0007,
  and 0007.1 have landed. Task 0006/0006.1 did not leave a formal verifier
  report, but the live Supabase path is now operationally verified by
  post-merge CI and read-only Supabase inspection.
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
- Main CI run `26209010693` passed. The plan selected
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
- PR #34 (`feat: add database migration harness and verifier`) merged at
  `cc40ff0750880b0c34a3b487bec447937968952c`. It landed `packages/db`,
  `tests/db`, README updates, and Task 0007/0007.1 reports.
- Task 0007.1 verifier report passed. It accepted the missing `dependsOn` edge
  from `db` to `db-tests` as a deferred Orun/spec limitation because `db`
  subscribes to `dev`, `stage`, and `prod`, while `db-tests` currently
  subscribes only to `dev`.
- Latest `multi-tenant-saas` main CI run `26221338775` passed after PR #34.
  It selected `db · dev · Verify`, `db · stage · Verify`,
  `db · prod · Verify`, and `db-tests · dev · Verify`.
- `packages/db` now defines the canonical migration manifest and a baseline
  `_migrations.applied` tracking-table migration. The live migration runner and
  apply path are not implemented yet.
- Local changed plan on the current tracked changes produces zero component
  jobs because the orchestrator update only touches `ai/**` files.
- PR #35 (`feat: add database migration runner and Orun apply path`) is open
  from `codex/task-0008-db-migration-apply` at
  `45e3b7b69a50c8006c8e4d1b9924d586199c6cdd`.
- PR #35 latest observed CI run `26222938898` is failing
  `db-migrate · stage · Migrate` and `db-migrate · prod · Migrate`. Stage
  fails in `Migration Plan` with `cd: packages/db: No such file or directory`;
  prod fails because it depends on the stage job.
- Task 0008 verifier prompt is written at `ai/tasks/task-0008-verifier.md`.
- The root `README.md` is aligned with current infrastructure state: Supabase
  `stage` and `prod` exist, `packages/db` has migration conventions, and
  Cloudflare Hyperdrive plus live migration apply are still deferred.

## Current Roadmap Position

- Active spec pack: reusable SaaS starter under `specs/**`.
- `specs-v2/**` remains out of scope unless the task is product-specific Git
  catalog or CI intelligence work.
- Week 0 operations foundation is functionally complete for AWS S3 backend,
  Supabase `stage`/`prod` provisioning, and offline database migration
  ownership conventions.
- The next high-leverage foundation gap is the Supabase Postgres live migration
  runner/apply path. It should read the `packages/db` manifest, fetch
  credentials from AWS Secrets Manager without logging secrets, and apply only
  missing migrations to `stage`/`prod` through Orun-controlled CI.
- Cloudflare Hyperdrive wiring is still missing for the new Supabase projects
  and should follow after the migration apply path or when an app/runtime task
  needs the binding.

## Current Task

- Next verifier task: `ai/tasks/task-0008-verifier.md`.
- Task 0008 implementation exists as PR #35 and must be independently verified
  before merge.
- The verifier must inspect the current `db-migrate` CI failures, make only
  Task 0008-scoped fixes if needed, wait for green replacement CI, then merge
  PR #35 only on PASS.
- After a PASS merge, the verifier must sync local `main` and leave
  `git status --short` empty.
