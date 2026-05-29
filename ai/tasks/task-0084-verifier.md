# Task 0084 — Verifier

Agent: Verifier

## Current Repo Context

- Task 0084 (Implementer) opened **PR #131**
  (`impl/task-0084-drop-pages-residuals`,
  head `47e34485e92c223bc734908b468a23f43da22fef`) at
  https://github.com/sourceplane/multi-tenant-saas/pull/131.
- The PR is the dead-code cleanup that closes the Task 0083 / 0083.1
  Pages → Workers + Static Assets cutover: removes the
  `pagesProjectPrefix` variable, `local.pages_project_name` binding,
  and `output "pages_project_name"` from
  `infra/terraform/cloudflare-domain/terraform/main.tf`; drops the
  matching parameter from `component.yaml`; drops the matching rows
  from `README.md`. Four files total (including the implementer
  report).
- PR CI is **GREEN** at scope time: `plan` SUCCESS,
  `cloudflare-domain · stage · Terraform` SUCCESS,
  `cloudflare-domain · prod · Terraform` SUCCESS (workflow run
  `26640690294`). `mergeStateStatus = CLEAN`, `mergeable = MERGEABLE`.
- Implementer already executed the imperative `wrangler pages project
  delete` for the legacy `sourceplane-web-console-{dev,stage,prod}`
  projects (dev never existed → benign error; stage + prod deleted).
  Before/after `wrangler pages project list` excerpts are in the
  implementer report.
- Provider pin stays `cloudflare ~> 4.52`. No worker, contract, db,
  policy, migration, intent, composition, or job-template change.
- Live state going in: `https://stage.sourceplane.ai` and
  `https://prod.sourceplane.ai` are 200 on
  `cloudflare_workers_domain.console` (verified by Task 0083.1).
  Rollback hatch `*.rahulvarghesepullely.workers.dev` still 200.

## Objective

Verify PR #131 against Task 0084's pre- and post-merge acceptance
criteria, then — if PASS and CI is green — merge it via the standard
Verifier Merge Protocol (sections 349-392 of `agents/orchestrator.md`)
and confirm the post-merge soak on main.

PASS requires **both**:
1. PR-time validation passes (local orun + terraform checks, scope
   audit, CI green review).
2. Post-merge soak: the first `cloudflare-domain · {stage,prod} ·
   Terraform · apply` run after merge reports
   `Apply complete! Resources: 0 added, 0 changed, 0 destroyed.` AND
   both apex URLs + the rollback hatch still serve 200 AND
   `wrangler pages project list` still does not list the three legacy
   project names.

The "clean no-op apply" is the load-bearing proof that the dropped
variable/output were truly dead. Anything other than 0/0/0 means the
state had a hidden consumer and the merge must be reverted.

## PR Boundary For The Verifier

The verifier may, if needed, push a single surgical commit to the PR
branch ONLY to:

1. Add the verifier report to the branch (recurring "report not
   committed to PR" pattern).
2. Re-run CI by pushing #1.

The verifier MUST NOT modify any file under `infra/terraform/**`,
`intent.yaml`, `stack-tectonic/**`, `apps/**`, any worker, any
contract, any migration, or any composition / job template. If the PR
needs anything beyond a report add to pass, FAIL it and surface to
orchestrator.

The wrangler Pages deletion has already happened out-of-band; the
verifier confirms its post-merge persistence but does not re-issue any
delete.

## Read First

- `ai/tasks/task-0084.md` (the implementer prompt — boundary + accept)
- `ai/reports/task-0084-implementer.md` (claims + evidence)
- `agents/orchestrator.md` sections "Verifier Standard" and "Verifier
  Merge Protocol" (lines 349-392)
- `infra/terraform/cloudflare-domain/terraform/main.tf` (current)
- `infra/terraform/cloudflare-domain/component.yaml` (current)
- `infra/terraform/cloudflare-domain/README.md` (current)
- `ai/reports/task-0083.1-verifier.md` (prior soak baseline)
- Skill reference: `references/post-merge-deploy-profile-gap.md` for
  the post-merge deploy-vs-verify discipline.

## Acceptance Criteria

Pre-merge:

- ✅ PR #131 diff contains ONLY:
  - `infra/terraform/cloudflare-domain/terraform/main.tf`
  - `infra/terraform/cloudflare-domain/component.yaml`
  - `infra/terraform/cloudflare-domain/README.md`
  - `ai/reports/task-0084-implementer.md`
  (and, optionally, `ai/reports/task-0084-verifier.md` if added by
  this task). Any other path → FAIL.
- ✅ `grep -rn "pages_project_name\|pagesProjectPrefix"
  infra/terraform/cloudflare-domain/` on the PR head returns no
  matches.
- ✅ `cloudflare_workers_domain.console` resource block is **byte-for-byte
  unchanged** between PR head and main (no shape drift, no count gate
  change, no provider pin movement). `cloudflare ~> 4.52` holds.
- ✅ Local checks pass on the PR head checkout:
  - `terraform -chdir=infra/terraform/cloudflare-domain/terraform fmt -check`
  - `./.workspace/bin/orun validate --intent intent.yaml`
  - `./.workspace/bin/orun plan --changed --intent intent.yaml --output plan.json`
    produces exactly 2 jobs:
    `cloudflare-domain.{stage,prod}.terraform`, profile
    `terraform.plan-only`.
  - `./.workspace/bin/orun run --plan plan.json --dry-run --runner github-actions`
    selects both.
- ✅ PR CI rollup is all green:
  `plan`, `cloudflare-domain · stage · Terraform`,
  `cloudflare-domain · prod · Terraform` — verified via
  `gh pr view 131 --json statusCheckRollup`.
- ✅ Inspect the actual CI logs (not just the rollup) for
  `cloudflare-domain · {stage,prod} · Terraform` and confirm
  `terraform plan` shows `No changes. Your infrastructure matches the
  configuration.` — i.e. the plan diff is purely the variable/output
  removal (which is a state-irrelevant config-only change), with zero
  resource diff. Plan-only on PRs, so no apply yet.
- ✅ `kiox.lock` is unchanged on the PR (implementer reverted the
  incidental orun v2.3.0 → v2.9.0 bump out of scope).

Post-merge:

- ✅ Merge with `gh pr merge 131 --squash --delete-branch` (or
  `--admin` only if branch protection blocks and the rollup is
  uncontested green). Capture the squash commit SHA.
- ✅ `git checkout main && git pull --ff-only origin main`; local tree
  clean.
- ✅ Watch the main-CI run triggered by the merge. Both
  `cloudflare-domain · stage · Terraform · apply` and
  `cloudflare-domain · prod · Terraform · apply` must exit with
  `Apply complete! Resources: 0 added, 0 changed, 0 destroyed.` —
  paste the lines into the verifier report. **This is non-negotiable;
  any non-zero count means revert.**
- ✅ Live probes (record HTTP status + a body substring):
  - `curl -sfL https://stage.sourceplane.ai/` → 200, body contains
    `Sourceplane Console`.
  - `curl -sfL https://prod.sourceplane.ai/` → 200, body contains
    `Sourceplane Console`.
  - `curl -sfL https://sourceplane-web-console-next-stage.rahulvarghesepullely.workers.dev/`
    → 200 (rollback hatch).
  - `curl -sfL https://sourceplane-web-console-next-prod.rahulvarghesepullely.workers.dev/`
    → 200 (rollback hatch).
- ✅ `wrangler pages project list` (or `--json | jq`) does NOT list
  `sourceplane-web-console-dev`, `sourceplane-web-console-stage`,
  or `sourceplane-web-console-prod`. The unsuffixed
  `sourceplane-web-console` and the `*-next-stage` siblings are out
  of scope and may remain.
- ✅ No new GitHub Actions failures, no Cloudflare API errors in the
  apply logs, no secret-shaped strings (token / API key /
  connection string with credentials) leaked into logs.

## Verification Steps (in order)

1. Checkout `impl/task-0084-drop-pages-residuals` at head
   `47e34485`. Run the diff-scope audit and the `grep` for residual
   identifiers.
2. Diff `infra/terraform/cloudflare-domain/terraform/main.tf` between
   PR head and `origin/main` to confirm the
   `cloudflare_workers_domain.console` block is identical.
3. Run the local orun + terraform commands listed in Acceptance.
4. Use `gh run view <workflow-run> --log` on the PR CI run to confirm
   each Terraform job logged `No changes. Your infrastructure matches
   the configuration.` (NOT just exit 0 — the words must appear).
5. Optional: add this verifier report to the PR branch, push, wait for
   the same CI suite to re-pass.
6. Merge per Verifier Merge Protocol. Capture squash SHA.
7. `git checkout main && git pull --ff-only`. Confirm clean.
8. Tail the main-CI run for cloudflare-domain apply jobs. Wait to
   completion. Paste the `Apply complete!` lines.
9. Run the four `curl` probes + `wrangler pages project list` checks.
10. Write the verifier report; update orchestration state files; final
    commit on main.

## Result

`Result: PASS` only if every Acceptance item above is met, including
the post-merge clean no-op apply on both envs. Otherwise `Result:
FAIL`, leave the PR open or revert the merge as appropriate, and
document the exact blocker (file path, log line, command output).

## When Done Report

Save to `ai/reports/task-0084-verifier.md` with sections:

- Result (PASS / FAIL)
- Checks (pre-merge + post-merge, each with the exact command and a
  one-line result)
- CI Log Review (PR run IDs, post-merge main run IDs, the
  `Apply complete!` lines verbatim, the `No changes.` lines verbatim)
- Live Resource Evidence (curl status + body substring for each of
  the four URLs; wrangler list excerpt before/after evidence)
- Secret Handling Review (one line)
- Spec Proposals (none expected; if Task 0085's v5 rename surfaces a
  spec gap, link to a proposal)
- Risk Notes (residual risk after merge — should be ~zero)
- Recommended Next Move (scope Task 0085 — Cloudflare provider v4 → v5
  + `cloudflare_workers_domain` → `cloudflare_workers_custom_domain`
  rename — OR an alternate next focus, with one-line rationale)

After the report:

- Append the Task 0084 outcome to `ai/context/task-ledger.md` as
  `verified and merged (PASS)` (or `failed` + blocker).
- Move `0084` into `ai/state.json.completed`, set `current_task` to
  the next scoped item, update `last_verified`, `repo_health`, and
  `notes`.
- Update `ai/context/current.md` (current task / next candidates) and
  `ai/waiting_for_input.md`.
- Commit and push directly to main:
  `git add ai/reports/task-0084-verifier.md ai/state.json
   ai/context/{current,task-ledger}.md ai/waiting_for_input.md`
  `git commit -m "chore(orchestration): close out task 0084 verifier
   (PASS post-merge soak)"`
  `git push origin main`.
