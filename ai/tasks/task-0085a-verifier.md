# Task 0085a — Verifier

Agent: Verifier

## Current Repo Context

- Task 0085 (single-PR cloudflare TF provider v4 → v5 + resource rename)
  was BLOCKED at implementer time: two PR-CI runs proved the rename
  cannot be absorbed in one PR with the current cloudflare v5 provider
  (run `26642692516` — bare `moved{}` fails `Unable to Move Resource
  State`; run `26642904336` — `removed{}+import{}` under `~> 5.0` fails
  `no schema available for cloudflare_workers_domain.console[0]`).
- Implementer filed `ai/proposals/task-0085-spec-update.md` proposing
  the v5 upgrade guide's sanctioned **two-phase** pattern (same shape
  `tf-migrate` produces for `cloudflare_zone_settings_override`).
- **Orchestrator decision (2026-05-29): ACCEPTED.** Rescoped into:
  - **Task 0085a** (this PR) — Phase 1: stay on `cloudflare ~> 4.52`,
    drop the v4-typed state entry via
    `removed { from = cloudflare_workers_domain.console; lifecycle {
    destroy = false } }`, fence/comment the live v4 resource block.
    Zero Cloudflare API writes; pure state mutation.
  - **Task 0085b** — Phase 2 (scoped only after 0085a is verified +
    merged + post-merge `forgotten` apply lands on both envs): bump
    provider to `~> 5.0`, replace fenced block with
    `cloudflare_workers_custom_domain.console`, re-import by the two
    known immutable IDs.
- **PR #133** (`impl/task-0085a-cloudflare-v4-removed-state-drop`,
  https://github.com/sourceplane/multi-tenant-saas/pull/133) is open,
  `mergeable=MERGEABLE`, `mergeStateStatus=CLEAN`. PR CI run
  `26644307676` is 3/3 SUCCESS (`plan`,
  `cloudflare-domain · stage · Terraform`,
  `cloudflare-domain · prod · Terraform`). An earlier PR-CI run
  `26644076501` produced the load-bearing plan-diff evidence pasted into
  the implementer report (stage job 78524741081, prod job 78524741140).
- PR #132 was closed as superseded by the implementer (not merged;
  branch left for reference).
- Live invariants going in: `https://stage.sourceplane.ai` and
  `https://prod.sourceplane.ai` serve 200 with title
  `Sourceplane Console` on
  `cloudflare_workers_domain.console` (stage id
  `052eaece5e989d5a7280b6c206e562c42950e3a6`, prod id
  `31e5f2ed1b1e4a5700e8ae0678846a0d753840e1`). Rollback hatch
  `*.rahulvarghesepullely.workers.dev` still 200 on both envs.

## Objective

Verify PR #133 against Task 0085a's pre- and post-merge acceptance
criteria, then — if PASS and CI is green — merge it via the standard
Verifier Merge Protocol (sections 349–392 of `agents/orchestrator.md`)
and confirm the post-merge soak on `main`.

PASS requires **both**:

1. PR-time validation passes (local orun + terraform checks, scope
   audit, CI-log review confirming the literal plan diff shape).
2. Post-merge soak: the first
   `cloudflare-domain · {stage,prod} · Terraform · apply` run after
   merge logs an `Apply complete!` line whose `Resources:` footer
   contains **`0 destroyed`** AND includes a state-drop confirmation
   for `cloudflare_workers_domain.console[0]`. The four live URLs
   (two apex + two rollback hatches) must still return 200 with
   `Sourceplane Console` in the body.

**Footer wording note.** The task scope originally anticipated
`Resources: 0 added, 0 changed, 0 destroyed, 1 forgotten.` Terraform
1.15.x does not emit a `forgotten` count in the apply footer for
`removed { lifecycle { destroy = false } }`; it instead prints the
dedicated stanza:

```
cloudflare_workers_domain.console[0]: Removed from state
```

(or the plan-time equivalent
`# cloudflare_workers_domain.console[0] will no longer be managed by
Terraform, but will not be destroyed` plus the
`Warning: Some objects will no longer be managed by Terraform` block,
with the resource listed by name).

Treat the apply as PASS when:

- the apply footer's `destroyed` count is **0** (load-bearing
  invariant — no live resource deleted), AND
- the apply log shows the state-drop confirmation for
  `cloudflare_workers_domain.console[0]` by name (either the
  `Removed from state` line or the equivalent
  `... no longer be managed by Terraform` stanza), AND
- the four post-merge live probes still return 200.

Anything other than `0 destroyed` on the apply footer is an **automatic
FAIL + revert**. A live API delete on these resources would unbind
`stage.sourceplane.ai` and `prod.sourceplane.ai` from their Workers —
a user-visible outage on the only two live custom-domain endpoints.

## PR Boundary For The Verifier

The verifier may, if needed, push a single surgical commit to the PR
branch ONLY to:

1. Add `ai/reports/task-0085a-verifier.md` to the branch (recurring
   "verifier report not committed to PR" pattern).
2. Re-run CI by pushing #1.

The verifier MUST NOT modify any file under
`infra/terraform/cloudflare-domain/**`, `intent.yaml`,
`stack-tectonic/**`, `apps/**`, any worker, any contract, any
migration, or any composition / job template. If the PR needs anything
beyond a report add to pass, FAIL and surface to orchestrator.

In particular: do NOT uncomment the fenced v4 `resource` block, do NOT
bump the provider pin, do NOT add an `import {}` block — those all
belong to Task 0085b and would defeat the gate this phase exists to
provide.

## Read First

- `ai/tasks/task-0085a.md` (the implementer prompt — boundary + accept)
- `ai/reports/task-0085a-implementer.md` (claims + literal CI evidence)
- `ai/proposals/task-0085-spec-update.md` (rescope rationale + accepted
  resolution; verifier should confirm the implemented split matches the
  Resolution section)
- `agents/orchestrator.md` sections "Verifier Standard" and "Verifier
  Merge Protocol" (lines 349–392)
- `infra/terraform/cloudflare-domain/terraform/main.tf` (current PR
  head — confirm `removed {}` block shape and fenced v4 resource)
- `infra/terraform/cloudflare-domain/README.md` (current PR head)
- `ai/reports/task-0084-verifier.md` (prior clean-no-op soak baseline)
- Skill reference: `references/post-merge-deploy-profile-gap.md`
  (post-merge soak discipline — don't mark PASS on PR CI alone).

## Acceptance Criteria

Pre-merge:

- ✅ PR #133 diff contains ONLY:
  - `infra/terraform/cloudflare-domain/terraform/main.tf`
  - `infra/terraform/cloudflare-domain/README.md`
  - `ai/reports/task-0085a-implementer.md`
  - (optionally `ai/reports/task-0085a-verifier.md` if added by this
    task)

  Any other path — and in particular any change under
  `infra/terraform/cloudflare-domain/component.yaml`, `intent.yaml`,
  `stack-tectonic/**`, `apps/**`, `kiox.lock`, or
  `.terraform.lock.hcl` — is an automatic FAIL.

- ✅ The provider pin is unchanged on the PR head:
  `cloudflare = { source = "cloudflare/cloudflare", version = "~> 4.52" }`.

- ✅ The `removed {}` block on the PR head matches exactly:

  ```hcl
  removed {
    from = cloudflare_workers_domain.console
    lifecycle {
      destroy = false
    }
  }
  ```

  No additional `from = ...` targets, no missing `destroy = false`.

- ✅ The v4 `resource "cloudflare_workers_domain" "console"` block is
  fenced (commented out, NOT deleted) with a clearly-labelled
  `# REMOVED IN 0085a, REPLACED IN 0085b` header (or equivalent) so
  0085b can diff against the original v4 shape.

- ✅ `output "worker_custom_domain_id"` no longer references the
  symbol `cloudflare_workers_domain.console` (Terraform would fail
  validation otherwise once the resource block is fenced). The
  placeholder value `pending_v5_reimport_task_0085b` is acceptable;
  verifier records what was used.

- ✅ `grep -rn "cloudflare_workers_custom_domain"
  infra/terraform/cloudflare-domain/` on the PR head returns no matches
  (Phase 2 symbol must not leak into Phase 1).

- ✅ Local checks pass on the PR head checkout:
  - `terraform -chdir=infra/terraform/cloudflare-domain/terraform fmt -check`
  - `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`
  - `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json`
    produces exactly 2 jobs:
    `cloudflare-domain.{stage,prod}.terraform`, profile
    `terraform.plan-only`.
  - `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions`
    selects both.

- ✅ PR CI rollup is all green (`gh pr view 133 --json
  statusCheckRollup` — run `26644307676` should show 3/3 SUCCESS, or a
  newer run after the verifier-report push if you take that step).

- ✅ Inspect the actual CI logs for
  `cloudflare-domain · {stage,prod} · Terraform` on the latest PR-CI
  run. Each job's `terraform plan` output must contain ALL of:
  - the literal line `# cloudflare_workers_domain.console[0] will no
    longer be managed by Terraform, but will not be destroyed`
  - the literal stanza `# (destroy = false is set in the configuration)`
  - the literal footer line `Plan: 0 to add, 0 to change, 0 to destroy.`
    (note: zero on every count, including `to destroy`)
  - the literal warning block header
    `Warning: Some objects will no longer be managed by Terraform`
  - the resource listed by name under that warning:
    `cloudflare_workers_domain.console[0]`
  - the Output diff line
    `~ worker_custom_domain_id = "<known-id>" -> "pending_v5_reimport_task_0085b"`
    with `<known-id>` =
    `052eaece5e989d5a7280b6c206e562c42950e3a6` for stage and
    `31e5f2ed1b1e4a5700e8ae0678846a0d753840e1` for prod.

  These are the load-bearing strings. If any are missing on either env,
  FAIL.

- ✅ `kiox.lock` and `.terraform.lock.hcl` are byte-identical to `main`
  (the implementer noted an incidental orun v2.3.0 → v2.9.0 bump was
  reverted; confirm).

Post-merge:

- ✅ Merge with `gh pr merge 133 --squash --delete-branch` (or
  `--admin` only if branch protection blocks and the rollup is
  uncontested green). Capture the squash commit SHA.

- ✅ `git checkout main && git pull --ff-only origin main`; local
  worktree clean (`git status --short` empty).

- ✅ Watch the main-CI run triggered by the merge. Both
  `cloudflare-domain · stage · Terraform · apply` and
  `cloudflare-domain · prod · Terraform · apply` must complete with
  `Apply complete!` whose `Resources:` footer shows **`0 destroyed`**.
  Paste the full apply-complete line into the verifier report for both
  envs. Also paste the state-drop confirmation stanza
  (`cloudflare_workers_domain.console[0]: Removed from state` or the
  equivalent "no longer be managed" block) for both envs.

- ✅ **`0 destroyed` is non-negotiable.** Any non-zero `destroyed` count
  means Terraform issued a Cloudflare API delete on the custom-domain
  resource. In that case: FAIL the verifier, do not mark complete, and
  immediately attempt restoration (the resource can be re-attached
  manually via wrangler / the Cloudflare dashboard while the
  orchestrator scopes a rollback task). Document the exact log line
  that triggered the failure.

- ✅ Live probes (record HTTP status + body substring for each):
  - `curl -sfL https://stage.sourceplane.ai/` → 200, body contains
    `Sourceplane Console`.
  - `curl -sfL https://prod.sourceplane.ai/` → 200, body contains
    `Sourceplane Console`.
  - `curl -sfL https://sourceplane-web-console-next-stage.rahulvarghesepullely.workers.dev/`
    → 200 (rollback hatch).
  - `curl -sfL https://sourceplane-web-console-next-prod.rahulvarghesepullely.workers.dev/`
    → 200 (rollback hatch).

  (Initial `curl -sI` will return HTTP/2 307 — the console's standard
  `/` → `/login` redirect — which resolves to 200 with the expected
  title. `-sfL` follows redirects, so the final status is what counts.)

- ✅ Optional but recommended: re-run `terraform plan` (or a second
  `orun plan --changed`) on `main` after the apply settles, and
  confirm the cloudflare-domain plan output is
  `No changes. Your infrastructure matches the configuration.` for
  both envs — this proves the state drop is durable and there is no
  hidden re-create attempt queued for the next apply.

- ✅ No new GitHub Actions failures, no Cloudflare API errors in the
  apply logs, no secret-shaped strings (token / API key / connection
  string with credentials) leaked into logs.

## Verification Steps (in order)

1. `git fetch origin pull/133/head:verify-0085a && git checkout
   verify-0085a`. Confirm the head SHA matches `gh pr view 133
   --json headRefOid`.
2. Diff-scope audit: `git diff --name-only origin/main...verify-0085a`
   — confirm the file list matches the Pre-merge acceptance.
3. Provider-pin + `removed{}` shape audit on the PR head (read
   `infra/terraform/cloudflare-domain/terraform/main.tf` directly).
4. `grep -n "cloudflare_workers_custom_domain"
   infra/terraform/cloudflare-domain/` (must return zero matches).
5. Run the local orun + terraform commands listed in Acceptance.
6. `gh run view 26644307676 --log` (or the latest PR-CI run) — pipe
   through `grep -E "cloudflare_workers_domain|to destroy|worker_custom_domain_id|no longer be managed"`
   to extract the literal evidence strings. Confirm presence on
   both env jobs.
7. Optional: add this verifier report to the PR branch, push, wait
   for the same CI suite to re-pass.
8. Merge per Verifier Merge Protocol. Capture squash SHA.
9. `git checkout main && git pull --ff-only`. Confirm clean tree.
10. Watch the main-CI run for cloudflare-domain apply jobs. Wait to
    completion. Paste the `Apply complete!` lines AND the state-drop
    stanzas for both envs into the report.
11. Run the four `curl` probes.
12. Optional: re-run `orun plan --changed` on `main` after the apply
    settles; record `No changes` evidence.
13. Write the verifier report; update orchestration state files
    (`ai/state.json`, `ai/context/current.md`,
    `ai/context/task-ledger.md`, `ai/waiting_for_input.md`); commit
    and push directly to `main`.

## Result

`Result: PASS` only if every Acceptance item above is met, including
the post-merge clean-`0-destroyed` apply on both envs and all four
live probes still 200. Otherwise `Result: FAIL`, leave the PR open or
revert the merge as appropriate, and document the exact blocker (file
path, log line, command output).

## When Done Report

Save to `ai/reports/task-0085a-verifier.md` with sections:

- Result (PASS / FAIL)
- Checks (pre-merge + post-merge, each with the exact command and a
  one-line result)
- CI Log Review (PR run IDs, post-merge main run IDs, the literal
  plan-evidence strings on both envs, the `Apply complete!` lines on
  both envs, the state-drop stanzas on both envs)
- Live Resource Evidence (curl status + body substring for each of
  the four URLs)
- Secret Handling Review (one line)
- Spec Proposals (none expected; the rescope proposal
  `task-0085-spec-update.md` is already ACCEPTED. If a new gap
  surfaces — e.g. Terraform footer wording forces a doc update —
  link to a new proposal.)
- Risk Notes (residual risk after merge: the live custom-domain
  resources are untracked by Terraform between this merge and Task
  0085b's re-import; any Cloudflare-side drift would not be detected
  by `terraform plan`. Mitigation: keep 0085b on the immediate
  orchestrator queue.)
- Recommended Next Move (scope Task 0085b — Phase 2: provider bump
  to `~> 5.0` + `cloudflare_workers_custom_domain.console` resource
  + `import {}` blocks keyed by env re-adopting the two known
  immutable IDs).

After the report:

- Append the Task 0085a outcome to `ai/context/task-ledger.md` as
  `verified and merged (PASS)` (or `failed` + blocker), under the
  existing `## Task 0085a` section (create the section if not
  already present).
- Move `0085a` into `ai/state.json.completed`, set `current_task` to
  `0085b` (or leave as `0085a` if FAIL), update `last_verified`,
  `repo_health`, and `notes`.
- Update `ai/context/current.md` (current task / next candidates) and
  `ai/waiting_for_input.md`.
- Commit and push directly to main:
  `git add ai/reports/task-0085a-verifier.md ai/state.json
   ai/context/{current,task-ledger}.md ai/waiting_for_input.md`
  `git commit -m "chore(orchestration): close out task 0085a verifier
   (PASS post-merge soak)"`
  `git push origin main`.
