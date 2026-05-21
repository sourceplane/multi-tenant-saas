# Current Context

Last updated: 2026-05-21

## Repo Reality

- `main` is synced with `origin/main` at `dffdc4a` (post-verifier cleanup).
- Tasks 0001, 0001.1, 0002, 0003, 0003.1, 0004, 0005, 0006, 0006.1, 0007,
  0007.1, and **0008** have landed.
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
- `dev` Supabase remains intentionally unprovisioned.
- Local Orun validation passes:
  `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`.

## Current Roadmap Position

- Active spec pack: reusable SaaS starter under `specs/**`.
- `specs-v2/**` remains out of scope unless the task is product-specific Git
  catalog or CI intelligence work.
- Week 0 operations foundation is complete: AWS S3 backend, Supabase
  `stage`/`prod` provisioning, offline migration ownership conventions, and
  live migration runner with apply path.
- The next high-leverage gap is **Cloudflare Hyperdrive wiring** for the new
  Supabase projects, or the first **domain migration** (tenant schema, etc.)
  when a domain runtime task requires it.

## Current Task

- Task 0008 is complete and verified.
- Awaiting the next task prompt from the orchestrator.
