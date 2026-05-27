# Task 0043 — Verifier

## Agent

Verifier

## Current Repo Context

Task 0043's implementer PR is open:

- PR: #86
- URL: https://github.com/sourceplane/multi-tenant-saas/pull/86
- Branch: `codex/task-0043-identity-security-events-persistence`
- Head SHA: `791495c85f298b0966d39e527874a696635fc2c5`
- Status at verifier handoff: OPEN, MERGEABLE, all 7 PR checks SUCCESS
- PR CI run: `26520569664`

The PR adds identity-owned security-event source persistence only:

- migration `050_identity_security_events`
- `@saas/db/identity` security-event types and repository methods
- db tests for migration shape, repository behavior, pagination, and
  secret-safety

No public route, api-edge facade, web-console UI, identity-worker runtime
recording, shared org-less event envelope, or org-scoped audit-copy behavior is
intended in this task.

## Objective

Verify that PR #86 correctly implements Task 0043 and is safe to merge. This is
a database migration PR, so verify code, migration safety, manifest checksum,
test coverage, Orun changed-plan behavior, PR CI logs, and post-merge live
migration application before reporting PASS.

## Read First

- `ai/tasks/task-0043.md`
- `ai/reports/task-0043-implementer.md`
- PR #86 diff
- `agents/orchestrator.md`
- `specs/components/02-identity.md`
- `specs/components/09-events-audit-observability.md`
- `specs/contracts/event-envelope.schema.yaml`
- `specs/domain-model.md`
- `specs/orun-golden-path.md`
- `packages/db/src/migrations/050_identity_security_events/up.sql`
- `packages/db/src/identity/types.ts`
- `packages/db/src/identity/repository.ts`
- `packages/db/src/manifest.ts`
- `tests/db/src/identity-migration.test.ts`
- `tests/db/src/identity.test.ts`

## Required Outcomes

- [ ] Verify PR #86 maps to exactly Task 0043 and contains no unrelated work.
- [ ] Confirm migration `050_identity_security_events` is forward-only,
      idempotent, and safe for the current autocommit Supabase migration runner.
- [ ] Confirm the migration creates only identity-owned source records and does
      not modify `events.event_log`, `events.audit_entries`, or the org-scoped
      shared event envelope contract.
- [ ] Confirm `identity.security_events` supports pre-organization identity
      activity without requiring `org_id`.
- [ ] Confirm no raw codes, bearer tokens, token secrets, token hashes, API
      keys, provider secrets, or generated credentials are stored in schema
      columns, tests, reports, commit messages, or CI logs.
- [ ] Confirm repository methods use parameterized SQL and safe repository
      errors.
- [ ] Confirm cursor pagination is deterministic: `(occurred_at DESC, id DESC)`,
      `limit + 1`, and next cursor from the last returned row.
- [ ] Confirm manifest checksum matches the migration file.
- [ ] Confirm focused tests cover migration shape, bounded-context ownership,
      SQL behavior, mapping, JSON serialization/parsing, pagination, and
      secret-safety.
- [ ] Confirm PR CI logs actually ran the expected commands, not just that the
      check summary is green.

## High-Risk Review Targets

1. **Migration safety**
   - Check idempotency, no destructive DDL, no cross-context FKs, and no
     assumption that `identity` schema is absent or recreated.
   - Confirm any nullable `user_id`, `session_id`, or `challenge_id` design is
     intentional and documented in the report.

2. **Secret leakage**
   - Review schema names and metadata tests carefully. Flexible JSON metadata is
     acceptable, but the repository and tests must make clear that callers must
     not pass raw auth material.

3. **Pagination correctness**
   - Verify cursor comparison parameters match the ordering and do not skip or
     duplicate rows around equal `occurred_at` values.

4. **PR CI migration behavior**
   - PR run `26520569664` shows `db-migrate · stage · Migrate` and
     `db-migrate · prod · Migrate` as successful. Confirm from logs whether PR
     mode planned/validated without live apply, and that main push is the path
     that applies to stage/prod.

5. **Local worktree hygiene**
   - The shared checkout may have orchestrator artifacts and an unrelated local
     `stack-tectonic/compositions/cloudflare-worker-turbo/schema.yaml` change.
     Do not stage or commit unrelated local files while verifying PR #86.

## Required Checks

Run locally on the PR branch when possible and record exact results:

- `pnpm --filter @saas/db typecheck`
- `pnpm --filter @saas/db-tests test`
- `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`
- `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json`
- `/Users/irinelinson/.local/bin/kiox -- orun plan --intent intent.yaml --view dag`
- `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions`

Inspect GitHub PR CI logs for run `26520569664`, especially:

- `plan`
- `db · dev · Verify`
- `db-tests · dev · Verify`
- `db-migrate · stage · Migrate`
- `db-migrate · prod · Migrate`

Do not rely only on green check summaries. Confirm expected commands ran and no
secrets were printed.

## Merge And Live Verification

Merge PR #86 only if verification passes. After merge:

1. Inspect the main-branch CI run for the merge commit.
2. Confirm `db-migrate` stage and prod jobs applied
   `050_identity_security_events` successfully on `github-push-main`.
3. Confirm post-merge main CI is green.
4. Sync local `main` to `origin/main`.
5. Leave the local repo clean except for pre-existing unrelated user/orchestrator
   changes you did not create. If verifier-created report changes are needed,
   commit them intentionally before merge or clean them up before ending.

## Non-Goals

- Do not implement identity-worker runtime security-event recording.
- Do not add public security-event query routes or api-edge forwarding.
- Do not add web-console UI.
- Do not create org-less shared event/audit rows.
- Do not add API-key or service-principal behavior.
- Do not read or apply `specs-v2/**`.

## Acceptance Criteria

- PR #86 satisfies every Task 0043 acceptance item or remains open with clear
  blockers.
- Local checks and PR CI pass.
- Migration is safe, idempotent, and manifest checksum verified.
- Repository methods are parameterized, typed, and covered by tests.
- Security-event persistence does not store raw auth secrets.
- Orun changed-plan proves migration-file changes select db package checks and
  db-migrate stage/prod jobs.
- Post-merge main CI applies the migration to stage/prod successfully.
- Verifier report is written.

## Report

Write `ai/reports/task-0043-verifier.md` with:

- Result: PASS or FAIL
- Summary
- PR/CI Evidence
- Checks Run
- Code/DB Review Notes
- Migration Apply Evidence
- Secret Handling Review
- Issues Found
- Remaining Risks
- Recommended Next Move
