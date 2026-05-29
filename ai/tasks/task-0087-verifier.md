# Task ID

Task 0087 — Verifier

# Agent

Verifier

# Current Repo Context

- Implementer Task 0087 (identity-worker → notifications-worker magic-link
  wire) is complete on branch
  `impl/task-0087-identity-notifications-wire` and open as **PR #135**
  (`feat(identity): wire login-start to notifications-worker via service binding (task 0087)`).
  `state=OPEN`, `mergeable=MERGEABLE`, base=`main`, draft=`false`.
- Diff at scoping time (`gh pr view 135 --json files`): 6 files, +417 / -0.
  Confined to the documented PR Boundary:
  - `apps/identity-worker/wrangler.jsonc` (+8) — adds `NOTIFICATIONS_WORKER`
    binding on `env.stage` and `env.prod` only (NOT `env.dev` — implementer
    Deviation #3, see below).
  - `apps/identity-worker/src/env.ts` (+1) — `NOTIFICATIONS_WORKER?: Fetcher`.
  - `apps/identity-worker/src/notifications-client.ts` (+114, NEW) —
    best-effort enqueue client modeled on
    `apps/notifications-worker/src/events-client.ts`.
  - `apps/identity-worker/src/handlers/login-start.ts` (+60) — enqueue branch
    after successful `auth.startLogin(...)`, skipped on `DEBUG_DELIVERY=true`.
  - `tests/identity-worker/src/notifications-client.test.ts` (+143, NEW) —
    7 unit tests.
  - `ai/reports/task-0087-implementer.md` (+91, NEW) — implementer report.
- PR-CI run `26656687952` at scoping time: 4/5 SUCCESS + 1 IN_PROGRESS
  (`identity-worker · prod · Verify deploy`). Green checks: `plan`,
  `identity-worker-tests · dev · Verify`,
  `identity-worker · {dev,stage} · Verify deploy`. Re-poll before merge.
- Implementer flagged **three intentional deviations** the verifier must
  judge — do not auto-fail; reason against the spec and contracts and
  decide whether each is acceptable, requires a proposal, or blocks merge:
  1. `category: "security"` (not the prompt's literal `"transactional"`)
     because `NotificationCategorySchema` in
     `packages/contracts/src/notifications.ts:39` only enumerates
     `invitation | billing | security | support | product` (no
     `transactional`). Spec `specs/components/14-notifications.md` lists
     `security` as the auditable category for auth flows. Task 0087
     Non-Goals forbid contract changes. Verifier confirms which category
     the spec actually mandates for `auth.magic_link` and accepts /
     rejects.
  2. `orgId = "00000000-0000-0000-0000-000000000000"` (zero-UUID
     `SYSTEM_ORG_ID`) used because login is pre-org. The notifications
     row schema (`packages/db/src/migrations/120_notifications_core/up.sql`)
     requires a UUID `org_id` with no FK. Implementer cites this sentinel
     as already established (config-worker settings, COALESCE patterns in
     migrations 070/080). Verifier confirms there is no tenancy
     invariant violated (e.g., RLS / per-org index) and that the
     sentinel choice is consistent with prior repo usage; otherwise
     require a proposal.
  3. Dev-env binding omitted (only `env.stage` + `env.prod` got the
     `NOTIFICATIONS_WORKER` binding). Rationale: `identity-worker`'s
     `env.dev` block has no service bindings, no `notifications-worker-dev`
     exists in the repo, and the dev path short-circuits via
     `DEBUG_DELIVERY=true` (the enqueue branch is skipped). The prompt's
     Required Outcomes (`env.dev`, `env.stage`, `env.prod`) literally
     asked for all three. Verifier confirms whether this materially
     changes any acceptance behavior and accepts / requires a follow-up.
- Spec authority: `specs/components/14-notifications.md` (V1 enqueue
  contract, category semantics); `specs/contracts/tenancy-and-rbac.md`
  (tenant-scope invariants); `specs/orun-golden-path.md` (service-binding
  conventions).
- Deferred work the verifier MUST NOT widen or touch:
  - Real notifications provider swap (parked in `/ai/deferred.md`,
    awaiting user provider choice).
  - Task 0085b (cloudflare-domain v4 → v5 re-import) — explicit user
    defer. PR #135 must not touch `infra/terraform/cloudflare-domain/**`
    or the cloudflare provider pin (`~> 4.52`). The two live custom-domain
    attachment IDs stay untouched: stage
    `052eaece5e989d5a7280b6c206e562c42950e3a6`, prod
    `31e5f2ed1b1e4a5700e8ae0678846a0d753840e1`.
- `main` tip on `origin/main`: `e3ff231`
  (`chore(orchestration): scope task 0087 + adopt Deferred Decision Protocol`).
- Repo health going in: green. Notifications-worker V1 (Task 0086) is
  deployed on stage + prod with `NOTIFICATIONS_PROVIDER=local-debug`,
  private (`workers_dev: false`). Migration `120_notifications_core` is
  applied on both Supabase projects. This PR is the first caller wiring
  on top of that V1 surface.

# Objective

Verify PR #135 against Task 0087's acceptance criteria, then — if PASS
and CI stays green — merge it via the standard Verifier Merge Protocol
(`agents/orchestrator.md` §§ Verifier Standard + Verifier Merge Protocol)
and confirm the post-merge soak on `main`.

PASS requires **all** of:

1. PR scope is exactly Task 0087 — additive identity → notifications
   wire, no edits under `apps/notifications-worker/**`,
   `packages/contracts/src/notifications.ts`,
   `packages/db/src/notifications/**`,
   `infra/terraform/cloudflare-domain/**`, the cloudflare provider pin,
   or any unrelated worker / contract / composition / migration.
2. Best-effort contract holds at the code level:
   `apps/identity-worker/src/notifications-client.ts` swallows every
   failure mode it documents (`no_binding`, `non_2xx`, `network_error`,
   `bad_response`), never throws, and the `login-start.ts` enqueue branch
   does not propagate any notifications failure into the login response.
   A notifications-worker outage MUST NOT 5xx
   `POST /v1/auth/login/start`.
3. Login response contract is byte-for-byte unchanged for both
   `DEBUG_DELIVERY=true` (returns `code` inline, no enqueue) and the
   non-debug path (no `code`, enqueue happens).
4. Local validation passes on the PR head:
   ```
   pnpm -w install --frozen-lockfile
   pnpm -F @saas/identity-worker test
   pnpm -F @saas/identity-worker typecheck
   pnpm -F @saas/identity-worker build
   pnpm -w build
   /Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
   /Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output /tmp/plan-0087.json
   /Users/irinelinson/.local/bin/kiox -- orun run --plan /tmp/plan-0087.json --dry-run --runner github-actions
   ```
   If `orun run --dry-run` is unavailable in the installed orun (the
   implementer reported v2.9.0 without that subcommand), record the
   exact error and accept validate + plan as the substitute, matching
   the implementer's evidence.
5. PR CI rollup is fully SUCCESS on the PR head (re-poll after any
   verifier report-commit push). All five jobs must be green:
   `plan`, `identity-worker-tests · dev · Verify`,
   `identity-worker · {dev,stage,prod} · Verify deploy`.
6. Spec 14 conformance review for the enqueue payload built in
   `login-start.ts`:
   - `templateKey === "auth.magic_link"`
   - `recipient.channel === "email"` keyed to the login email
   - `category` value: confirm against spec 14 + contract enum which
     value is correct for `auth.magic_link` and PASS / FAIL on the
     implementer's `"security"` choice. Document the call.
   - `templateData` contains only `code`, `emailHint`, `expiresAt`,
     `requestId` (no email address as a field, no extra user-provided
     strings, no `codeHash`, no `challengeId`, no tokens).
   - Internal request headers match
     `apps/notifications-worker/src/router.ts` /
     `apps/notifications-worker/src/handlers/enqueue.ts` expectations
     (actor type/id + request id pattern already used by
     `events-client.ts`). Confirm by reading both sides, not just one.
7. Sentinel `orgId` review: confirm no tenancy invariant in spec
   `tenancy-and-rbac.md`, migration `120_notifications_core/up.sql`, or
   the notifications service layer is violated by inserting a row with
   `org_id = "00000000-0000-0000-0000-000000000000"`. If it is, FAIL
   and require a spec proposal. If it is not, document the verifier's
   reasoning in the report and accept.
8. Post-merge: main-CI run on the merge commit shows
   `identity-worker · {stage,prod} · Verify deploy` jobs SUCCESS. Live
   `POST /v1/auth/login/start` against
   `api-edge-{stage,prod}.rahulvarghesepullely.workers.dev` returns a
   2xx `LoginStartResponse` for a synthetic email (no `code` field in
   non-debug response, no 5xx). Use a throwaway email like
   `verifier-task0087+<timestamp>@example.com` so the
   `local-debug` provider attempt is harmless and clearly attributable.
9. No regression on Task 0085a / Task 0086 surfaces:
   - Apex `stage.sourceplane.ai` and `prod.sourceplane.ai` still serve
     `200` (Sourceplane Console).
   - `notifications-worker-{stage,prod}` private worker still 404 +
     CF error `1042` on its `*.workers.dev` URL (expected — V1 is
     internal-only).
   - Post-merge `orun plan --changed` on `main` shows `0 jobs`
     (durability invariant).

# PR Boundary For The Verifier

The verifier may, if needed, push a **single surgical commit** to the PR
branch ONLY to:

1. Add `ai/reports/task-0087-verifier.md` to the branch.
2. Re-run CI by pushing #1.

The verifier MUST NOT modify any file under
`apps/identity-worker/**` (other than the verifier report), any
notifications-worker file, any contract, any migration, any composition,
or any other worker. If the PR needs anything beyond the verifier
report add to pass, FAIL and surface to the orchestrator with a clear
blocker (and, when appropriate, a spec proposal at
`ai/proposals/task-0087-spec-update.md`).

# Read First

- `ai/tasks/task-0087.md` — implementer prompt (PR Boundary, Required
  Outcomes, Constraints, Acceptance Criteria).
- `ai/reports/task-0087-implementer.md` — claims, CI evidence,
  three flagged deviations, design notes.
- `agents/orchestrator.md` §§ Verifier Standard + Verifier Merge
  Protocol.
- `specs/components/14-notifications.md` — V1 contract, category
  semantics, internal-actor allow-list, envelope.
- `specs/contracts/tenancy-and-rbac.md` — tenant-scope invariants
  (decide whether sentinel `org_id` violates any).
- `specs/orun-golden-path.md` — component + service-binding pattern.
- `packages/contracts/src/notifications.ts` —
  `NotificationCategorySchema`, `EnqueueNotificationRequest`,
  `NOTIFICATIONS_INTERNAL_ACTOR_VALUES`.
- `apps/notifications-worker/src/router.ts` and
  `apps/notifications-worker/src/handlers/enqueue.ts` — internal-actor
  gate, required headers, URL path.
- `apps/notifications-worker/src/events-client.ts` — reference internal
  binding client pattern this PR mirrors.
- `apps/identity-worker/src/handlers/login-start.ts` (current PR head)
  — enqueue branch, debug short-circuit, sentinel `orgId`.
- `apps/identity-worker/src/notifications-client.ts` (current PR head)
  — never-throws contract.
- `apps/identity-worker/wrangler.jsonc` (current PR head) —
  `env.stage.services` and `env.prod.services` arrays; check `env.dev`
  is intentionally bare.
- `tests/identity-worker/src/notifications-client.test.ts` (current PR
  head) — 7 cases.
- `/ai/deferred.md` — what is parked.

# Required Outcomes

- [ ] Diff audited against PR Boundary + Non-Goals; deviations from
      the prompt judged with explicit reasoning.
- [ ] Local validation block above executed; results recorded verbatim.
- [ ] PR-CI rollup re-polled at verify time; all jobs SUCCESS captured.
- [ ] Best-effort contract confirmed by reading both
      `notifications-client.ts` and the `login-start.ts` enqueue branch.
- [ ] Spec 14 + contract-enum review on `category` documented; PASS
      `"security"` or FAIL with required fix.
- [ ] Sentinel `org_id` reasoning documented; PASS or FAIL with required
      proposal.
- [ ] Dev-binding-omitted decision documented; PASS or FAIL with
      required follow-up.
- [ ] If PASS: PR merged (squash) per Verifier Merge Protocol; local
      `main` fast-forwarded to `origin/main`; branch not left checked
      out; `git status --short` clean.
- [ ] Post-merge main-CI watched to green; live
      `POST /v1/auth/login/start` smoke against
      `api-edge-{stage,prod}.rahulvarghesepullely.workers.dev` recorded
      with synthetic email; non-debug response confirmed to NOT include
      `code`; no 5xx.
- [ ] Apex hostnames + notifications-worker private-404 invariants
      re-checked post-merge.
- [ ] `ai/reports/task-0087-verifier.md` written with the required
      sections (Result, Checks, Issues, Risk Notes, Spec Proposals,
      Recommended Next Move).
- [ ] `ai/state.json` and `ai/context/{current,task-ledger}.md` updated
      to reflect the verified-and-merged outcome (or the FAIL with open
      blockers).

# Constraints

1. No code changes outside `ai/reports/task-0087-verifier.md` and
   compact-context files.
2. Verifier-only commit (if pushed) must be a single commit on the PR
   branch, message form
   `chore(task-0087): add verifier report (PASS|FAIL)`.
3. No touching the deferred surfaces (notifications provider,
   cloudflare-domain Terraform, cloudflare provider pin).
4. No re-litigating implementer creative latitude beyond the three
   flagged deviations and any constraint or spec violation actually
   discovered. Per `agents/orchestrator.md` Architect Mode §
   Anti-Patterns, do not verify on taste.
5. Never merge a PR with unresolved verification blockers.

# Integration Notes

- The deploy-verify CI jobs in this repo, on prior PRs, performed
  build/upload but did not exercise the service binding at runtime
  (notifications-worker is private). Live smoke after merge via
  `api-edge` is the only end-to-end signal that the wire works. Record
  whether the `local-debug` provider's emitted lifecycle is observable
  from notifications-worker logs (Wrangler tail or CI capture) if
  feasible; otherwise accept the 2xx login response as the in-band
  signal and flag the gap.
- Identity-worker's `env.dev` block remains bindings-less. If the team
  later wants the enqueue path exercised in dev, that's a separate task
  (provision `notifications-worker-dev` + add the binding). Record this
  as a Remaining Gap, not a FAIL.
- `correlationId: requestId` is propagated to notifications; idempotency
  is not set on the enqueue body (the contract does not include one).
  Document as a Risk Note for the future provider-swap task — duplicate
  challenges (same email retrying within the window) will produce
  duplicate `local-debug` rows today. Acceptable for V1; a real provider
  will need dedupe.

# Acceptance Criteria

✅ All Required Outcomes checkboxes met.
✅ PR merged (or PR open with a clear FAIL blocker report).
✅ `ai/state.json` updated: on PASS, append `"0087"` to `completed`,
clear `current_task`, update `last_verified`, set
`next_focus` to the next leverage candidate (orchestrator will re-pick
on the next loop tick — verifier may leave a one-line suggestion).
✅ No secrets in the verifier report or any CI command captured.

# Verification

The verifier's own verification is the report itself plus the merged
main-CI run + live smoke evidence captured in it. No follow-up agent is
scheduled for this task.

# PR Creation Requirement

This is a verifier task, not an implementer task. The PR (#135) already
exists. The verifier MAY push at most one commit to that branch (the
verifier report) before merging. Do not open a separate PR.

# When Done Report

Save to `/ai/reports/task-0087-verifier.md` with:

- Result: PASS | FAIL
- Checks (commands + verbatim result, including PR-CI run id +
  post-merge main-CI run id on PASS)
- Issues (per deviation: category, sentinel orgId, dev binding —
  explicit accept / reject reasoning; plus anything else found)
- Risk Notes (idempotency-on-retry gap, dev-binding gap, deploy-verify
  does not exercise the binding at runtime)
- Spec Proposals (link only, if filed)
- Recommended Next Move (one or two candidates the orchestrator should
  consider next: membership-worker invitation-email wiring on the same
  binding pattern; real notifications provider swap once user picks
  Resend / Postmark / SES; provision `notifications-worker-dev` if the
  team wants the path exercised in dev)
