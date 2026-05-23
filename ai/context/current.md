# Current Context

Last updated: 2026-05-23

## Repo Reality

- `main` is synced with `origin/main` at `67bf5cf` after PR #50
  (`chore: bump actions/setup-node from v4 to v6 across all compositions`).
- Latest main CI run `26330474474` passed.
- Tasks 0001–0009.1 and **0010** are verified.
- Task 0010 wired `apps/api-edge` to verified stage/prod Hyperdrive IDs and
  fixed all 6 Cloudflare compositions for turbo filter names, working
  directories, and Node.js 22 compatibility.
- api-edge prod Worker deployed:
  - Worker name: `api-edge-prod`
  - Version: `005882d7-3a88-4056-bb61-6a98e1ad4ce7`
  - Deployment: `3f8f08ec-d953-4f37-bb90-bd5708ea9f9b` (100%)
  - Bindings: `SOURCEPLANE_DB` → Hyperdrive `ab2c21c2db6245a59c91588fcac7107a`, `ENVIRONMENT` → `"prod"`
- api-edge stage Worker did not exist in Task 0010 verifier evidence. The
  current component profile is verify by default with deploy promotion rules on
  `github-push-main`, so live stage state should be verified before use.
- web-console Pages deployed (deployment `0e0680e0`, source `d996a84`).
- Hyperdrive resources stable:
  - stage: `08f7c6055f544a3890a585d88fd92348` (`stg-multi-tenant-saas-stage`)
  - prod: `ab2c21c2db6245a59c91588fcac7107a` (`prod-multi-tenant-saas-prod`)
- Supabase stage ref: `thielrrsejwhjkdluwqm`, prod ref: `npbvrxkrlyrpnhrqucxa`.
  dev remains unprovisioned.
- Deploy commands use `--env prod` explicitly; environment isolation confirmed.
- `packages/db` owns the migration manifest. The runner (`SupabaseApiAdapter`)
  uses the Supabase Management API over HTTPS/IPv4 for apply; plan mode is
  fully offline.
- Local Orun validation passes:
  `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`.

## Current Roadmap Position

- Active spec pack: reusable SaaS starter under `specs/**`.
- `specs-v2/**` remains out of scope unless the task is product-specific.
- Week 0 operations foundation and Worker binding seam are complete.
- Next focus: Worker runtime adapter (Task 0011) that uses the `SOURCEPLANE_DB`
  Hyperdrive binding through a Worker-safe adapter and proves read-only
  database connectivity from the deployed Worker.

## Current Task

- Task 0011 prompt is ready at `ai/tasks/task-0011.md`.
- Objective: add a Worker-safe Hyperdrive/Postgres runtime adapter and a
  read-only `api-edge` operational smoke path without starting tenant-domain
  business logic.
