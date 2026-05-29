# Task 0086 — Verifier

Agent: Verifier

## Current Repo Context

- Implementer Task 0086 (notifications-worker V1) is complete on branch
  `impl/task-0086-notifications-worker` and open as **PR #134**
  (`feat(notifications): add notifications-worker V1 (task-0086)`).
  `state=OPEN`, `mergeable=MERGEABLE`, base=`main`, draft=`false`.
- PR-CI run `26649268365` reports **13/13 SUCCESS** at the time of scoping:
  `plan`, `contracts · {dev,stage,prod} · Verify`,
  `db · {dev,stage,prod} · Verify`,
  `db-migrate · {stage,prod} · Migrate`,
  `notifications-worker · {dev,stage,prod} · Verify deploy`,
  `notifications-worker-tests · dev · Verify`.
- Implementer report `ai/reports/task-0086-implementer.md` is already
  committed to the PR branch (verified via `gh pr view 134 --json files`).
- Spec authority: `specs/components/14-notifications.md` (V1, email-only).
  No spec proposal was filed (the implementer report contains no spec drift
  flags; verifier should still scan for drift).
- Task 0085b (Phase 2 cloudflare-domain v4→v5) remains **explicitly
  deferred by the user**. PR #134 must NOT touch
  `infra/terraform/cloudflare-domain/**` or any cloudflare provider pin.
  Verifier confirms.
- Repo health on `main` going in: green. `main` head before this PR is
  `b611398` (`feat(notifications): add notifications-worker V1 (task-0086)`
  — note: that commit is on the PR branch tip, not on `main` yet). Main
  tip on `origin/main` is `9f9ea1a` (Task 0085a verifier close-out).
- Existing deployed Workers on `main`: `api-edge`, `identity-worker`,
  `membership-worker`, `policy-worker`, `projects-worker`, `config-worker`,
  `events-worker`, `metering-worker`, `billing-worker`, `webhooks-worker`,
  `web-console-next`. None of them currently call notifications;
  Task 0086 intentionally lands the notifications-worker in isolation
  (no caller wiring) so the V1 surface is reviewable on its own.

## Objective

Verify PR #134 against Task 0086's acceptance criteria, then — if PASS
and CI stays green — merge it via the standard Verifier Merge Protocol
(`agents/orchestrator.md` §§ 349–392) and confirm the post-merge soak
on `main`.

PASS requires **all** of:

1. PR scope is exactly Task 0086 — additive notifications-worker bring-up,
   no caller wiring, no touch to deferred Task 0085b surfaces, no
   unrelated refactor.
2. Local orun trio passes on the PR head.
3. Per-package build + tests pass on the PR head.
4. PR CI rollup stays 13/13 SUCCESS (or higher if the verifier adds a
   report-commit push that re-runs CI).
5. Spec 14 conformance: enqueue/get/preferences/suppress surface present
   and shaped as specified; internal-actor allow-list enforced; emitted
   events conform to the documented envelope and exclude `templateData`.
6. Multi-tenant invariants hold: every `notifications.*` row tenant-scoped
   on `org_id`; idempotency unique index keyed `(org_id, idempotency_key)`;
   `recipient_address` lower-cased; suppression check uses lower-cased
   form.
7. Post-merge: main-CI `db-migrate · {stage,prod} · Migrate` apply jobs
   succeed and the `notifications-worker · {stage,prod} · Verify deploy`
   jobs succeed on the merge commit. Migration `120_notifications_core`
   lands cleanly in both Supabase projects.
8. Live `notifications-worker-{stage,prod}` Worker on Cloudflare returns
   `200` on `GET /health` (no auth required) after merge.
9. No regression on the apex hostnames touched by Task 0085a — the
   `0 destroyed` invariant on the cloudflare-domain Terraform state must
   continue to hold on the post-merge main-CI apply (Task 0086 does not
   touch cloudflare-domain, so the apply job should be a clean no-op or
   not selected; verifier records which).

## PR Boundary For The Verifier

The verifier may, if needed, push a **single surgical commit** to the PR
branch ONLY to:

1. Add `ai/reports/task-0086-verifier.md` to the branch.
2. Re-run CI by pushing #1.

The verifier MUST NOT modify any file under `apps/notifications-worker/**`,
`packages/contracts/src/notifications.ts`, `packages/db/src/notifications/**`,
`packages/db/src/migrations/120_notifications_core/**`,
`packages/db/src/manifest.ts`, `packages/db/src/types.ts`,
`tests/notifications-worker/**`, `intent.yaml`, `stack-tectonic/**`, any
other worker, any other contract, any other migration, or any
composition / job template. If the PR needs anything beyond the verifier
report add to pass, FAIL and surface to orchestrator.

In particular: do NOT touch `wrangler.jsonc` to swap placeholder binding
IDs (the implementer flagged the shared placeholders in Follow-up #3 —
verifier inspects whether the deploy-verify CI jobs actually exercised
real bindings or only build/upload, and records the finding; the swap is
a separate task if needed).

## Read First

- `ai/tasks/task-0086.md` — the implementer prompt (full PR Boundary,
  Required Outcomes, Constraints, Acceptance Criteria).
- `ai/reports/task-0086-implementer.md` — claims + literal CI evidence,
  Follow-ups, security/tenancy notes.
- `agents/orchestrator.md` §§ 349–392 — Verifier Standard and Verifier
  Merge Protocol.
- `specs/components/14-notifications.md` — spec authority for V1 shape,
  envelope, allow-list, channel/category enums.
- `specs/contracts/tenancy-and-rbac.md` — tenant-scope invariants.
- `specs/orun-golden-path.md` — component manifest pattern and the
  `verify`/`deploy` profile gating shape.
- `packages/contracts/src/notifications.ts` — verify enum values,
  request/response shapes, event-type constants, internal-actor
  allow-list (`NOTIFICATIONS_INTERNAL_ACTOR_VALUES`).
- `packages/db/src/migrations/120_notifications_core/up.sql` — verify
  schema shape, tenant-scoped FKs, idempotency unique index, indexes.
- `packages/db/src/manifest.ts` — verify the `120_notifications_core`
  entry checksum
  `868cc1092b4b385b6ed3d203efe5302191865131bb98d0e9f5fe5ad6d16f01bb`
  matches the actual file (recompute and confirm).
- `apps/notifications-worker/src/router.ts` — verify internal-actor gate
  is on every non-health route.
- `apps/notifications-worker/src/services/notifications.ts` — verify
  the create → emit → dispatch → record → mark → emit sequence; verify
  `templateData` never enters event payloads.
- `apps/notifications-worker/wrangler.jsonc` — verify Hyperdrive +
  service-binding IDs; flag (do NOT fix) if placeholders remain per
  implementer Follow-up #3.
- `tests/notifications-worker/src/{notifications-service,router}.test.ts`
  — verify the asserted behaviors map to spec requirements.
- `ai/context/current.md` — repo checkpoint (last updated for 0085a;
  verifier will rewrite for 0086 in the close-out commit).
- Skill reference: `references/post-merge-deploy-profile-gap.md` —
  PR-time `verify` is not a substitute for post-merge live probe.
- Skill reference: `references/ci-env-binding-inspection.md` —
  validating Hyperdrive / service-binding env wiring in CI logs.
- Skill reference: `references/multi-tenant-fk-invariants.md` —
  composite-FK pattern check on `notifications.*`.
- Skill reference: `references/post-merge-deploy-profile-gap.md` and
  `references/opennext-cloudflare-pages-deployment-shape.md` for
  deploy-profile soak discipline.

## Acceptance Criteria

### Pre-merge

- ✅ PR #134 diff (`gh pr view 134 --json files`) is confined to:
  - `apps/notifications-worker/**` (new)
  - `packages/contracts/src/notifications.ts` (new) +
    `packages/contracts/src/index.ts` + `packages/contracts/package.json`
    (export wiring only)
  - `packages/db/src/notifications/**` (new) +
    `packages/db/src/migrations/120_notifications_core/up.sql` (new) +
    `packages/db/src/manifest.ts` (append) +
    `packages/db/src/types.ts` (`BoundedContext` union widen only) +
    `packages/db/package.json` (export wiring only)
  - `tests/notifications-worker/**` (new)
  - `pnpm-lock.yaml` (regen)
  - `ai/tasks/task-0086.md` + `ai/reports/task-0086-implementer.md`
  - (optionally `ai/reports/task-0086-verifier.md` if added by this task)

  Any file outside that set — and in particular any change under
  `infra/terraform/cloudflare-domain/**`, the cloudflare provider pin,
  `apps/web-console-next/**`, `apps/api-edge/**`, any other worker's
  `src/**`, any other domain's `packages/db/src/**` folder,
  `kiox.lock`, or `.terraform.lock.hcl` — is an automatic FAIL.

- ✅ `kiox.lock` is byte-identical to `main` (orun runtime stays
  v2.3.0; no incidental bump).

- ✅ `grep -rnE "cloudflare_workers_domain|cloudflare_workers_custom_domain"
  infra/terraform/cloudflare-domain/` on the PR head returns the same
  matches as on `main` (Task 0085b symbols must not have leaked into
  this PR).

- ✅ `git diff origin/main...HEAD -- infra/ kiox.lock .terraform.lock.hcl
  intent.yaml stack-tectonic/` is empty.

- ✅ Spec 14 conformance (read
  `specs/components/14-notifications.md` then read
  `packages/contracts/src/notifications.ts`):
  - All five event-type constants present:
    `notification.queued`, `notification.sent`, `notification.failed`,
    `notification.preference_updated`, `notification.suppressed`.
  - `channel` enum includes `email` (V1) and is open to extension
    without breaking the type (verify it's an enum/union, not a
    string-literal that other code branches on exhaustively).
  - `NOTIFICATIONS_INTERNAL_ACTOR_VALUES` is the documented allow-list
    (membership / billing / policy / events / api-edge workers).
  - Request/response shapes for `POST /v1/notifications`,
    `GET /v1/notifications/:id`, `GET|PUT /v1/notifications/preferences`,
    `POST /v1/notifications/recipients/:recipient/suppress` exist.

- ✅ Tenancy invariants on the migration (read
  `packages/db/src/migrations/120_notifications_core/up.sql`):
  - Every table in the `notifications` schema has a non-null `org_id`.
  - Idempotency unique index is `(org_id, idempotency_key)` (composite,
    not global).
  - `recipient_address` column exists on the suppressions table and
    the service stores it lower-cased (cross-check via
    `apps/notifications-worker/src/services/notifications.ts` and
    `tests/notifications-worker/src/notifications-service.test.ts`).
  - Migration is `IF NOT EXISTS` per house style.
  - No `DROP` statements (additive only).

- ✅ Manifest checksum sanity:
  - `packages/db/src/manifest.ts` lists `120_notifications_core` with
    checksum
    `868cc1092b4b385b6ed3d203efe5302191865131bb98d0e9f5fe5ad6d16f01bb`.
  - Recompute:
    `shasum -a 256 packages/db/src/migrations/120_notifications_core/up.sql`
    and confirm it matches the manifest value byte-for-byte. If it
    does not match, FAIL — the manifest is the gate the db-migrate
    job uses.

- ✅ Internal-actor gate (read
  `apps/notifications-worker/src/router.ts`):
  - Every route except `GET /health` checks `x-internal-actor` /
    `x-actor-subject-id` / `x-actor-subject-type`.
  - Unknown / missing actor returns 403 with the standard error
    envelope `{error:{code,message,fields?},requestId}`.
  - 404/405 fall-throughs use the same envelope.

- ✅ `templateData` leak audit:
  - `grep -n "templateData" apps/notifications-worker/src/services/`
    confirms `templateData` is persisted on the row but NOT included
    in any `emit*` event payload.
  - `tests/notifications-worker/src/notifications-service.test.ts`
    contains an explicit assertion that emitted event payloads do
    NOT contain `templateData`.

- ✅ Local checks pass on the PR-head checkout:
  - `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`
    → `✓ Intent is valid`, `✓ All validation passed`.
  - `/Users/irinelinson/.local/bin/kiox -- orun component --changed --base main`
    → exactly five entries: `contracts`, `db`, `db-migrate`,
    `notifications-worker`, `notifications-worker-tests`. Any extra
    component appearing is overreach — investigate.
  - `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json`
    → `5 components × 3 envs → 12 jobs` (or `12 jobs` total in the
    plan summary; verify count matches).
  - `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions`
    → all 12 jobs ✓ in preview.
  - `pnpm exec turbo run build --filter=@saas/notifications-worker --filter=@saas/notifications-worker-tests --filter=@saas/contracts --filter=@saas/db`
    → 4/4 ok.
  - `cd tests/notifications-worker && pnpm test` → `20 passed, 20 total`.
  - The pre-existing `@saas/identity-worker-tests` `crypto` type error
    on `main` is acceptable to leave (implementer confirmed it also
    fails on a clean stash of this branch) — note it but do NOT block
    on it.

- ✅ PR CI rollup is all green via `gh pr view 134 --json statusCheckRollup`.
  On the latest PR-CI run, every check is SUCCESS. Inspect the actual
  logs (not just status summaries) for:
  - `notifications-worker · {dev,stage,prod} · Verify deploy` —
    confirm wrangler upload step ran and reported the worker
    bytes/gzip line; confirm dry-run or staged deploy was performed
    per the `cloudflare-worker-turbo` profile shape.
  - `db-migrate · {stage,prod} · Migrate` — verify the migration
    runner picked up `120_notifications_core` and reported it as
    applied (or queued, depending on whether PR-CI applies or just
    plan-stages — record which mode this profile uses on PRs).
  - `notifications-worker-tests · dev · Verify` — confirm the test
    runner reported `20 passed, 20 total`.
  - No secret-shaped strings (API token, DB password, full connection
    string with credentials) in any log line.

- ✅ `wrangler.jsonc` placeholder-binding audit:
  - Read `apps/notifications-worker/wrangler.jsonc`. If the Hyperdrive
    binding ID or `EVENTS_WORKER` service-binding name/IDs are the
    placeholder values copied from events-worker (per implementer
    Follow-up #3), record the exact values in the verifier report and
    confirm via PR-CI deploy-verify logs whether they were exercised
    against real bindings or only validated structurally. **This is
    NOT a blocker for this PR** — implementer flagged it as an
    explicit follow-up — but the verifier report must capture the
    state so the next task can scope a real-bindings PR if needed.

### Post-merge

- ✅ Merge with `gh pr merge 134 --squash --delete-branch`. Use
  `--admin` only if branch protection blocks and the rollup is
  uncontested green. Capture the squash commit SHA.

- ✅ `git checkout main && git pull --ff-only origin main`. Local
  worktree clean (`git status --short` empty).

- ✅ Watch the main-CI run triggered by the merge.
  - `db-migrate · stage · Migrate` and `db-migrate · prod · Migrate`
    must complete SUCCESS, with a log line confirming
    `120_notifications_core` was applied (or already applied if the
    PR profile pre-applied it — record the actual log evidence for
    both envs).
  - `notifications-worker · stage · Verify deploy` and
    `notifications-worker · prod · Verify deploy` must complete
    SUCCESS, with wrangler logs confirming the live deploy to the
    real Worker names.
  - Any `cloudflare-domain · {stage,prod} · Terraform · apply` jobs
    triggered (likely a clean no-op because the diff does not touch
    that component) must continue to log
    `Apply complete! Resources: 0 added, 0 changed, 0 destroyed.`
    or not be selected by `orun plan --changed` at all. **`0 destroyed`
    remains non-negotiable on the apex hostname surface.**

- ✅ Live probes (record HTTP status + body substring or response
  shape for each):
  - `curl -sfL https://sourceplane-notifications-worker-stage.rahulvarghesepullely.workers.dev/health`
    → 200 with JSON body indicating health (record the exact response).
  - `curl -sfL https://sourceplane-notifications-worker-prod.rahulvarghesepullely.workers.dev/health`
    → 200 with JSON body indicating health.
  - If the actual `workers.dev` host pattern differs from
    `sourceplane-notifications-worker-{env}`, resolve it from
    `apps/notifications-worker/wrangler.jsonc` (`name` field) and the
    pattern used by `membership-worker` / `policy-worker` on `main`,
    and curl that. Record the exact URL used.
  - Confirm the two apex console hostnames Task 0085a guards still
    serve 200:
    - `curl -sfL https://stage.sourceplane.ai/` → 200 with body
      containing `Sourceplane Console`.
    - `curl -sfL https://prod.sourceplane.ai/` → 200 with body
      containing `Sourceplane Console`.

- ✅ Migration durability check:
  - On the post-merge main, run
    `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json`
    and confirm `db-migrate` is not re-selected (the migration is
    settled). Capture the plan summary in the report.

- ✅ Internal-actor protection live-check (optional but recommended):
  - `curl -sI https://sourceplane-notifications-worker-stage.rahulvarghesepullely.workers.dev/v1/notifications`
    (no `x-internal-actor` header) → expect 403 or 405 (depending on
    method). Record the status.

- ✅ No new GitHub Actions failures elsewhere in the workflow; no
  Cloudflare API errors in the deploy logs; no secret-shaped strings
  leaked into any log.

## Verification Steps (in order)

1. `git fetch origin pull/134/head:verify-0086 && git checkout
   verify-0086`. Confirm head SHA matches
   `gh pr view 134 --json headRefOid`.
2. Diff-scope audit:
   `git diff --name-only origin/main...verify-0086` — confirm the file
   list matches the Pre-merge scope block.
3. `git diff origin/main...verify-0086 -- infra/ kiox.lock
   .terraform.lock.hcl intent.yaml stack-tectonic/` — must be empty.
4. Read `packages/contracts/src/notifications.ts` end-to-end; record
   the five event-type constants, the channel enum, and the
   internal-actor allow-list array exactly as written.
5. Read `packages/db/src/migrations/120_notifications_core/up.sql`
   end-to-end; verify tenant-scope invariants and the composite
   idempotency index.
6. Recompute the migration checksum (`shasum -a 256` on the up.sql)
   and cross-check `packages/db/src/manifest.ts`. Record both values
   in the report.
7. Read `apps/notifications-worker/src/router.ts` and confirm the
   internal-actor gate on every non-health route.
8. Read `apps/notifications-worker/src/services/notifications.ts`;
   confirm the create → emit `queued` → dispatch → record attempt →
   mark final → emit `sent|failed` sequence and the `templateData`
   exclusion from event payloads. Cross-check the test assertions.
9. Read `apps/notifications-worker/wrangler.jsonc`; record binding IDs
   and flag any placeholder per the audit rule above.
10. Run the local orun trio + per-package build + tests block from
    the Pre-merge acceptance.
11. Inspect PR-CI run `26649268365` (or the latest PR-CI run if
    superseded by a verifier-report push):
    `gh run view <id> --log` piped through
    `grep -E "applied|migrated|wrangler|upload|passed|failed|error"`
    for each load-bearing job. Confirm presence of expected lines.
12. Optional: add `ai/reports/task-0086-verifier.md` to the PR branch,
    push, wait for the same CI suite to re-pass.
13. Merge per Verifier Merge Protocol
    (`gh pr merge 134 --squash --delete-branch`, fall back to
    `--admin` only if branch protection blocks and the rollup is
    uncontested green). Capture squash SHA.
14. `git checkout main && git pull --ff-only origin main`. Confirm
    clean tree.
15. Watch the main-CI run for db-migrate apply jobs (both envs) and
    notifications-worker Verify-deploy jobs (both envs). Wait to
    completion. Paste the migration-applied lines and the wrangler
    deploy lines into the report for both envs.
16. Run the four live probes (2 notifications-worker `/health` URLs +
    2 apex console URLs).
17. Run the post-apply `orun plan --changed` durability check.
18. Run the optional internal-actor 403 live-check on
    notifications-worker-stage.
19. Write the verifier report; update orchestration state files
    (`ai/state.json`, `ai/context/current.md`,
    `ai/context/task-ledger.md`, `ai/waiting_for_input.md`); commit
    and push directly to `main`.

## Result

`Result: PASS` only if every Acceptance item above is met, including
the post-merge clean migration apply + clean deploy on both envs and
all four live probes still 200. Otherwise `Result: FAIL`, leave the
PR open or revert the merge as appropriate, and document the exact
blocker (file path, log line, command output).

## When Done Report

Save to `ai/reports/task-0086-verifier.md` with sections:

- Result (PASS / FAIL)
- Checks (pre-merge + post-merge; each with the exact command and a
  one-line result)
- Scope Audit (full file list from `gh pr view 134 --json files`,
  grouped by subsystem, with a one-line "in-scope per task" or
  "out-of-scope — FAIL" verdict)
- Spec Conformance (the five event constants, the channel enum, the
  internal-actor allow-list — pasted verbatim from
  `packages/contracts/src/notifications.ts`)
- Tenancy Invariants (idempotency-index DDL, `org_id` coverage,
  recipient_address lowercasing path)
- Manifest Checksum (computed vs claimed; pass/fail)
- CI Log Review (PR run ID, post-merge main run IDs; the
  load-bearing log lines for each profile)
- `wrangler.jsonc` Placeholder Audit (verbatim binding IDs, whether
  they were exercised in deploy-verify, follow-up recommendation)
- Live Resource Evidence (curl status + body substring for each of
  the four live URLs, plus the optional 403 probe)
- Secret Handling Review (one line confirming no secrets leaked)
- Spec Proposals (none expected; if a contract gap surfaces, link to
  a new proposal under `ai/proposals/task-0086-spec-update.md`)
- Risk Notes (residual risk: placeholder bindings in
  `wrangler.jsonc` if confirmed; no caller wiring yet so the worker
  is dark in production until a follow-up wires it from
  identity/membership/billing)
- Recommended Next Move (orchestrator to scope either: (a) the
  caller-wiring follow-up — magic-link via identity-worker or
  invitation-email via membership-worker — or (b) the real-provider
  swap — Resend / SES / Postmark — or (c) the deferred Task 0085b
  Phase 2 cloudflare-domain v5 re-import, depending on user
  priority)

After the report:

- Append the Task 0086 outcome to `ai/context/task-ledger.md` as
  `verified and merged (PASS)` (or `failed` + blocker), under a new
  `## Task 0086` section.
- Move `0086` into `ai/state.json.completed`, set `current_task` to
  the next scoped task ID (orchestrator will decide post-PASS),
  update `last_verified`, `repo_health`, and `notes`.
- Update `ai/context/current.md` (current task / next candidates /
  recently completed) and `ai/waiting_for_input.md`.
- Commit and push directly to main:
  `git add ai/reports/task-0086-verifier.md ai/state.json
   ai/context/{current,task-ledger}.md ai/waiting_for_input.md`
  `git commit -m "chore(orchestration): close out task 0086 verifier
   (PASS post-merge soak)"`
  `git push origin main`.
