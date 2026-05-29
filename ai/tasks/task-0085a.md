# Task 0085a

Agent: Implementer

## Current Repo Context

- Task 0085 was filed as a single PR (#132, branch
  `impl/task-0085-cloudflare-v5-workers-custom-domain`) to bump
  `cloudflare/cloudflare ~> 4.52 → ~> 5.x` and rename
  `cloudflare_workers_domain.console` →
  `cloudflare_workers_custom_domain.console` in one step. The
  implementer proved with two PR-CI runs that **the cloudflare v5
  provider cannot absorb this rename in a single PR**:
  - PR-CI run `26642692516` (bare `moved {}`) failed with
    `Error: Unable to Move Resource State` — v5 does not implement
    cross-type `MoveState` for this rename.
  - PR-CI run `26642904336` (`removed { destroy = false } + import {}`
    under a `~> 5.0` pin) failed with
    `Error: no schema available for cloudflare_workers_domain.console[0]
    while reading state` — Terraform needs the v4 schema to read the
    v4-typed state entry before dropping it, and v4 is gone under a
    `~> 5.0` pin.
- Implementer filed `ai/proposals/task-0085-spec-update.md` proposing
  the v5 upgrade guide's sanctioned **two-phase** pattern (same shape
  `tf-migrate` produces for `cloudflare_zone_settings_override`):
  0085a drops the v4-typed state entry under the existing `~> 4.52`
  pin via `removed { lifecycle { destroy = false } }`; 0085b (later,
  separate PR) bumps the provider and re-imports.
- **Orchestrator decision (2026-05-29): ACCEPT the rescope.** This task
  is Phase 1. Task 0085b will be scoped after 0085a is verified,
  merged, and the post-merge `apply` confirms the `forgotten` state
  drop on both envs.
- Live resources (must survive byte-identical through both phases):
  - stage `cloudflare_workers_domain.console`:
    `052eaece5e989d5a7280b6c206e562c42950e3a6`, hostname
    `stage.sourceplane.ai`, bound to
    `sourceplane-web-console-next-stage`.
  - prod `cloudflare_workers_domain.console`:
    `31e5f2ed1b1e4a5700e8ae0678846a0d753840e1`, hostname
    `prod.sourceplane.ai`, bound to
    `sourceplane-web-console-next-prod`.
- Repo health is green. The only thing touching this resource on `main`
  is the existing v4 source in `infra/terraform/cloudflare-domain/`.

## Objective

Phase 1 of the v4→v5 cloudflare-domain migration: **under the
existing `cloudflare ~> 4.52` pin**, drop the
`cloudflare_workers_domain.console` Terraform state entry on stage
and prod without touching the live Cloudflare resource. After this
PR merges and applies, the two live custom-domain resources continue
to serve `stage.sourceplane.ai` / `prod.sourceplane.ai` exactly as
today, but they are no longer tracked in the Terraform state file —
which is what unblocks 0085b's clean v5 re-import.

## Architect Brief

- **Product bar:** Stripe-quality infra change discipline — zero
  user-visible regression, zero resource recreate, an audit trail a
  reviewer can follow in one pass. This is a state-only mutation; the
  live Cloudflare API must see exactly zero writes.
- **The user moment this improves:** none directly — this is the
  load-bearing first half of closing the last v4 Cloudflare debt in
  the repo. 0085b is where the user-invisible payoff actually lands
  (current provider line unlocks future Cloudflare resources).
- **Free to decide without asking:**
  - Whether to comment-out the v4 `resource` block or move it into a
    clearly-labelled `# REMOVED IN 0085a, REPLACED IN 0085b` comment
    fence. Either is fine as long as Terraform does not re-create the
    resource after the `removed {}` block drops it from state.
  - Exact comment wording and whether to add a `## State Migration`
    section to `README.md` or leave the existing v4/v5 note in place
    with a one-line "phase 1 of 2" pointer.
  - Whether to leave the `locals.workers_custom_domain_ids` map (and
    its `# Pinned so the v4→v5 re-import is deterministic per
    workspace.` comment) in `main.tf` for 0085b to consume, or strip
    it now and re-add in 0085b. Either is fine; record the choice.
- **Must not decide without a spec proposal:**
  - Any change to the provider pin in this PR. This phase **must
    stay on `~> 4.52`**.
  - Any change to apex hostnames, Worker service names, environment
    bindings, account/zone wiring, or `intent.yaml`
    parameterDefaults.
  - Any change to `component.yaml` `subscribe` / `dependsOn` / job
    template. The plan-only-then-apply gating is what produces the
    load-bearing evidence the verifier needs.
  - Anything outside `infra/terraform/cloudflare-domain/**` and
    `ai/**`.
- **Failure modes that invalidate the PR even with green CI:**
  - Plan diff on either env is anything other than
    `Plan: 0 to add, 0 to change, 1 to forget.` (the literal v1.15.x
    Terraform output for `removed { lifecycle { destroy = false } }`
    on a tracked resource). In particular, `1 to destroy, 0 to add`
    is a hard fail — that would delete the live custom domain and
    unbind `stage.sourceplane.ai` / `prod.sourceplane.ai`.
  - Apex hostname stops resolving or stops serving 200 with
    `<title>Sourceplane Console</title>` at any point.
  - Provider pin drifts off `~> 4.52` in this PR.
  - The `cloudflare_workers_domain.console` resource block is left
    live (uncommented and not under `removed{}`), in which case the
    next apply would re-create the state entry and 0085b would not
    actually be unblocked.
- **Recommended approach:** open a fresh branch off latest `main`
  (NOT off `impl/task-0085-...`); close PR #132 as superseded in the
  same workflow. Cherry-pick is not appropriate here — start clean
  with only the Phase 1 diff. The whole change is a few lines of
  HCL plus comments.

> The implementer has full latitude on comment placement, README
> phrasing, and whether to keep the locals re-import map in
> `main.tf` between phases. Decisions taken under this latitude must
> be recorded with one-line rationale in the implementer report.
> Anything outside the listed dimensions requires a spec proposal
> before implementation.

## PR Boundary

One PR, scoped to `infra/terraform/cloudflare-domain/` + this task's
docs trail:

1. `terraform/main.tf`:
   - Add:
     ```hcl
     removed {
       from = cloudflare_workers_domain.console
       lifecycle {
         destroy = false
       }
     }
     ```
   - Comment out (or fence under a clearly-labelled removal block)
     the existing `resource "cloudflare_workers_domain" "console"`
     block so it cannot be re-created by the next apply.
   - Do NOT bump `required_providers.cloudflare.version`. It stays
     `~> 4.52`.
   - Do NOT add `import {}` blocks in this PR (that is 0085b).
   - Update the existing v4-vs-v5 comment block (lines ~194–215) to
     say "Phase 1 of 2 — state entry dropped here; v5 re-import
     lands in Task 0085b."

2. `terraform/.terraform.lock.hcl`:
   - Leave on cloudflare v4 (the existing pin). If the lockfile was
     locally bumped to v5 on the previous branch, this PR must reset
     it to the `main`-branch v4 contents. Record this in the report.

3. `README.md`:
   - Update the v4/v5 note to reflect that 0085a drops v4 state and
     0085b will re-import under v5.

4. `ai/proposals/task-0085-spec-update.md`:
   - Append a `## Resolution` block at the bottom recording the
     orchestrator decision (accepted), the date, and the resulting
     task split (0085a + 0085b).

5. Close PR #132 as superseded with a one-line comment pointing to
   this PR. Do NOT merge #132. The branch can be left for reference;
   no rebase or salvage from it is required.

Explicit non-goals:
- No provider bump in this PR.
- No `import {}` blocks in this PR.
- No `for_each` refactor.
- No `intent.yaml` change. No `component.yaml` change. No Orun
  composition or job template change.
- No change to apex hostnames, Worker service names, environment
  bindings.
- No api-edge, no app, no worker, no db, no contract change.
- No spec sweep beyond this component's README and the proposal
  resolution block.

## Read First

- `agents/orchestrator.md` — Architect Mode, Spec Change Proposals,
  PR-Sized Task Standard, Implementer Standard.
- `ai/proposals/task-0085-spec-update.md` — the proposal this task
  implements Phase 1 of. The "Failure mode this avoids" section is
  the precise reason for the two-phase split.
- `ai/reports/task-0085-implementer.md` — the failure record from
  the single-PR attempt; PR-CI run IDs and error text live here.
- `infra/terraform/cloudflare-domain/terraform/main.tf` — current
  v4 shape and the `# Note: …` comment block.
- `infra/terraform/cloudflare-domain/component.yaml` and `README.md`.
- `specs/orun-golden-path.md` — Terraform component pattern,
  plan/apply gating shape.
- `specs/access-and-infra.md` — Cloudflare API token wiring rule.
- `ai/context/current.md` — repo checkpoint, live resource IDs,
  soak state.
- Cloudflare v5 upgrade guide, "Phased migration for
  cloudflare_zone_settings_override" — same pattern this PR
  implements.

## Required Outcomes

- [ ] `infra/terraform/cloudflare-domain/terraform/main.tf` contains
  a `removed { from = cloudflare_workers_domain.console; lifecycle
  { destroy = false } }` block; the v4 `resource` block is
  commented out / fenced so it cannot be re-created.
- [ ] `required_providers.cloudflare.version` stays `~> 4.52`.
- [ ] `.terraform.lock.hcl` reflects v4 (i.e. matches `main`'s
  current shape, or the implementer documents why a refresh-only
  change was needed).
- [ ] PR CI green: `plan` job SUCCESS and both
  `cloudflare-domain · {stage,prod} · Terraform` verify jobs
  SUCCESS.
- [ ] PR CI Terraform plan log for both stage and prod shows
  exactly `Plan: 0 to add, 0 to change, 1 to forget.` (or the
  precise Terraform 1.15.x wording for `removed{}` with
  `destroy = false` — if Terraform uses different language, capture
  the literal output in the report and explain). No `to destroy` count.
- [ ] PR #132 closed as superseded with a one-line comment pointing
  to this PR; #132 not merged.
- [ ] `ai/proposals/task-0085-spec-update.md` has a `## Resolution`
  block at the bottom.
- [ ] Implementer report includes: the literal plan diff per env,
  the `removed{}` block as written, the lock-file decision +
  rationale, and pre-merge confirmation that apex + rollback hatches
  are still 200.

## Non-Goals

- No provider version bump (deferred to 0085b).
- No `import {}` blocks (deferred to 0085b).
- No second-pass cleanup of v4-era attributes outside the removal
  fence.
- No upgrade of any other provider pin elsewhere in the repo.
- No spec sweep for "v5" in `specs/**` beyond this component's
  README and the proposal resolution block.

## Constraints

1. Live resource IDs `052eaece5e989d5a7280b6c206e562c42950e3a6`
   (stage) and `31e5f2ed1b1e4a5700e8ae0678846a0d753840e1` (prod)
   must survive byte-identical. This PR must not produce any
   Cloudflare API write — the only mutation is to the Terraform
   state file in S3.
2. Provider pin stays `~> 4.52` in this PR.
3. No secret material (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID)
   committed or echoed in plan output.
4. All commits stay on one branch and one PR (per orchestrator.md
   Implementer Standard).
5. PR must be opened via `gh pr create`; "implemented locally" is
   not a successful end state.
6. Required local checks before push (per orchestrator.md lines
   323–328):
   - `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`
   - `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json`
   - `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions`
7. If the PR-CI plan diff on either env shows any nonzero `to
   destroy` count, STOP and write a new spec proposal before
   pushing fixes — that would mean the `removed{}` shape is being
   misinterpreted by Terraform 1.15.x and needs an orchestrator
   decision before continuing.

## Integration Notes

- The component's `subscribe` block is unchanged: PR-CI runs
  `plan-only` on stage + prod; post-merge `github-push-main` flips
  both to `apply`. This is the gate that produces the load-bearing
  `Apply complete! Resources: 0 added, 0 changed, 0 destroyed, 1
  forgotten` line the verifier will inspect on `main` CI.
- `CONSOLE_CUSTOM_DOMAIN` continues to flow via
  `environments.{env}.parameterDefaults.terraform` per Task 0083.1.
  Do not touch it.
- The dependency edge `cloudflare-domain → web-console-next` stays.

## Acceptance Criteria

✅ Branch created fresh off `main` (not off
`impl/task-0085-cloudflare-v5-workers-custom-domain`). Suggested
name: `impl/task-0085a-cloudflare-v4-removed-state-drop`.

✅ Local validation passes:
```
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
```

✅ `terraform -chdir=infra/terraform/cloudflare-domain/terraform fmt -check`
passes. `terraform validate` passes locally or in CI; absent local
providers is acceptable per the orchestrator-skill pitfall as long
as CI passes.

✅ PR opened via `gh pr create`; PR Number is real (not `TBD`, not
`BLOCKED`).

✅ PR CI: `plan` SUCCESS + both
`cloudflare-domain · {stage,prod} · Terraform` verify jobs SUCCESS.

✅ PR CI Terraform plan log for both stage and prod includes
`Plan: 0 to add, 0 to change, 1 to forget.` (or Terraform 1.15.x
literal equivalent for `removed{}` with `destroy = false`). No
`to destroy` count.

✅ PR #132 closed as superseded with a one-line comment pointing
to this PR; #132 not merged.

✅ Pre-merge probes from the implementer:
```
curl -sI https://stage.sourceplane.ai/  | head -1
curl -sI https://prod.sourceplane.ai/   | head -1
curl -sI https://sourceplane-web-console-next-stage.rahulvarghesepullely.workers.dev/ | head -1
curl -sI https://sourceplane-web-console-next-prod.rahulvarghesepullely.workers.dev/  | head -1
```
all four return 200; record the four status lines in the report.

✅ Diff confined to `infra/terraform/cloudflare-domain/**`
(terraform sources + README) + `ai/proposals/task-0085-spec-update.md`
(Resolution append) + implementer report. No other path touched.

✅ No secret material visible in any plan output or CI log.

## Verification

Verifier (separate task generated by the orchestrator after the
implementer opens the PR) will:

- confirm the PR maps to exactly Task 0085a and no other scope
  (provider pin still `~> 4.52`, no `import{}` block, no v5
  resource type appearing anywhere)
- re-run the local Orun trio and `terraform fmt -check`
- inspect PR CI logs to confirm `Plan: 0 to add, 0 to change, 1 to
  forget.` on both envs and no Cloudflare API writes
- confirm PR #132 is closed (not merged) and references this PR
- after merge, wait for post-merge main-CI `apply` jobs on both
  envs and confirm each logs the literal
  `Apply complete! Resources: 0 added, 0 changed, 0 destroyed, 1
  forgotten.` line
- query Cloudflare directly (wrangler / API) to confirm the two
  live custom-domain resources are still present with the same
  immutable IDs (`052eaece5e989d5a7280b6c206e562c42950e3a6`,
  `31e5f2ed1b1e4a5700e8ae0678846a0d753840e1`) — Phase 1 must not
  touch the Cloudflare control plane at all
- read the S3 Terraform state file (or `terraform state list` via
  CI debug output) for both stage and prod and confirm
  `cloudflare_workers_domain.console` is no longer present
- curl apex + rollback hatches (4 URLs above); all four must
  return 200 with `<title>Sourceplane Console</title>`
- apply the `references/post-merge-deploy-profile-gap.md` soak
  rule: do NOT mark PASS based on PR CI alone

## PR Creation Requirement

You must create a fresh branch off `main` (suggested:
`impl/task-0085a-cloudflare-v4-removed-state-drop`), commit, push,
and open a GitHub PR before reporting complete. `PR Number: TBD` is
not acceptable; `BLOCKED` is acceptable only with the exact failing
command + error in the report.

After creating the new PR, also close PR #132 as superseded with a
one-line comment pointing to this PR's number. Then update the
implementer report and any context files with placeholder PR
numbers (`#[PR]`, `TBD`) to the real PR number, then commit and
push those final updates.

## When Done Report

`/ai/reports/task-0085a-implementer.md` with sections:

- Summary (3–5 bullets)
- Files Changed (grouped by subsystem)
- Checks Run (exact commands + result, including the Orun trio and
  any local terraform fmt/init evidence)
- Plan Diff Evidence (per-env, the literal Terraform output for the
  `removed{}` no-op)
- Pre-merge Probes (the four `curl -sI` lines)
- PR #132 Closure (the close command/comment used)
- Assumptions (durable only; e.g. lock-file kept on v4)
- Spec Proposals (links only, with one-line reason; expected:
  Resolution block appended to existing
  `ai/proposals/task-0085-spec-update.md`)
- Remaining Gaps (residual risk only; expected: Phase 2 still
  unblocks, captured as Task 0085b in orchestrator queue)
- Next Task Dependencies (Task 0085b: provider bump + v5
  re-import; the orchestrator will scope it after this task is
  verified and the post-merge soak is clean)
- PR Number (real number from `gh pr create`)
