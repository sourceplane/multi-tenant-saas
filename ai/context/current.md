# Current Context

Last updated: 2026-05-23

## Repo Reality

- `main` is synced with `origin/main` at `d9404ab` after Task 0009 verification
  PASS.
- PR #44 restored the repo tree to the Task 0009 baseline from PR #36 and
  reverted later Worker binding/deployment work from PRs #37, #38, and #39,
  plus CI-check metadata PRs #40/#42.
- Tasks 0001, 0001.1, 0002, 0003, 0003.1, 0004, 0005, 0006, 0006.1, 0007,
  0007.1, 0008, and **0009** are verified.
- PR #35 (`feat: add database migration runner and Orun apply path`) was merged
  at `aee7d25`. The verifier applied fixes to: (1) Orun workdir path in the job
  template, (2) SQL migrations not copied to `dist/`, (3) offline plan mode,
  (4) Supabase Management API adapter for apply mode.
- Post-merge CI run `26229865114` passed. `db-migrate · stage · Migrate` and
  `db-migrate · prod · Migrate` both applied `000_control_baseline` successfully.
  The `_migrations` schema and `_migrations.applied` table now exist in both
  Supabase environments.
- stage project ref: `thielrrsejwhjkdluwqm`, prod project ref: `npbvrxkrlyrpnhrqucxa`.
- Supabase secret ARNs remain unchanged:
  - stage: `arn:aws:secretsmanager:us-east-1:306024784101:secret:sourceplane/multi-tenant-saas/supabase/stage-7vy19S`
  - prod: `arn:aws:secretsmanager:us-east-1:306024784101:secret:sourceplane/multi-tenant-saas/supabase/prod-ICcSqq`
- `packages/db` owns the migration manifest. The runner (`SupabaseApiAdapter`)
  uses the Supabase Management API over HTTPS/IPv4 for apply; plan mode is
  fully offline (no DB connection required).
- Task 0009 PR #36 (`Task 0009: Cloudflare Hyperdrive infrastructure
  component`) merged at `f9356dc` and added
  `infra/terraform/cloudflare-hyperdrive/`.
- Main CI run `26293764021` applied Hyperdrive resources:
  - stage: `08f7c6055f544a3890a585d88fd92348`
    (`stg-multi-tenant-saas-stage`)
  - prod: `ab2c21c2db6245a59c91588fcac7107a`
    (`prod-multi-tenant-saas-prod`)
- PR #44/main CI run `26322419196` passed after rollback and refreshed both
  Hyperdrive resources with no Terraform drift.
- Task 0009 verifier report passed. It accepted Orun `v2.3.0` as repo reality
  and recommended the small spec/context alignment captured in
  `ai/tasks/task-0009.1.md`.
- Task 0009.1 spec/context alignment completed. Active specs now reference Orun
  `v2.3.0` as the verified runtime baseline.
- `dev` Supabase remains intentionally unprovisioned.
- Local Orun validation passes:
  `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`.

## Current Roadmap Position

- Active spec pack: reusable SaaS starter under `specs/**`.
- `specs-v2/**` remains out of scope unless the task is product-specific Git
  catalog or CI intelligence work.
- Week 0 operations foundation is complete: AWS S3 backend, Supabase
  `stage`/`prod` provisioning, offline migration ownership conventions, live
  migration runner with apply path, Hyperdrive infrastructure, and Orun `v2.3.0`
  spec alignment.
- Downstream Worker binding and runtime tasks are now unblocked.

## Current Task

- Task 0009.1 is complete: PR #46 aligns specs/context with Orun `v2.3.0`.
- Downstream Worker binding and runtime tasks (0010+) are now unblocked.
