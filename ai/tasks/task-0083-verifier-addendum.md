# Task 0083 — Verifier Addendum (re-verify on new head)

Agent: Verifier

## Why this exists

The first verifier pass wrote `Result: PASS` against PR #129 head
`28da48896cc3278cceae50dc83d28db676d0c0fa` and CI run `26631953781`
(33/33 SUCCESS), but **did not merge**. Four commits then landed on
the PR branch after the verifier report was written, so the PASS is
stale for the current head and must be re-proven before any merge.

Current PR-head: `8703081bdf190ea485afc1acd5d99496718690e1`
Latest CI run for that head: `26636510934` — **9/9 SUCCESS**.

The matrix shrunk from 33 → 9 jobs because:

1. `90c5965` merged `origin/main` back into the PR branch, re-baselining
   the changed-plan against now-merged Tasks 0082.2 / 0082.2.1 /
   0082.2.2 (those commits' verify jobs are no longer in the diff).
2. `8703081` removed `environments.stage.promotion.dependsOn=[dev]`
   from `intent.yaml`, narrowing the promotion graph.

## Post-PASS commits to evaluate (these were NOT in the original PR
## Boundary; verifier must explicitly accept or reject each)

| SHA       | File(s)                                          | Nature                                                                                  |
|-----------|--------------------------------------------------|-----------------------------------------------------------------------------------------|
| `c353888` | `ai/reports/task-0083-verifier.md`               | Verifier's own report — fine, expected.                                                 |
| `90c5965` | merge commit from `origin/main`                  | Re-baseline; legitimate.                                                                |
| `a7fe7cb` | `kiox.yaml`, `.github/workflows/ci.yml`          | Bumps `orun` runtime `v2.3.0 → v2.9.0` (image + GH Action input). Out of original scope.|
| `8703081` | `intent.yaml`                                    | Removes `environments.stage.promotion.dependsOn=[dev]`. Out of original scope and a topology change.|

The original verifier prompt's Out-of-Scope clause listed
`intent.yaml` changes (other than the three `CONSOLE_CUSTOM_DOMAIN`
values, which stayed correct) as FAIL. The intent.yaml edit doesn't
touch CONSOLE_CUSTOM_DOMAIN but it does drop dev-before-stage
promotion gating, which is a deploy-topology change that affects every
component, not just web-console.

Orchestrator stance (use this when adjudicating):

- The `kiox.yaml` + `ci.yml` orun toolchain bump is **acceptable to
  bundle** if and only if (a) it does not regress any CI job behavior
  and (b) it is mentioned in the verifier report's Deviations section
  with a one-line justification. Bumping `v2.3.0 → v2.9.0` mid-flight
  on a green branch is the kind of in-flight coalescing the
  Orchestrator allows; rejecting it would force a near-empty follow-up
  PR with zero behavioral content. **Accept.**
- The `intent.yaml` `promotion.dependsOn` removal is a deploy-topology
  change unrelated to the domain cutover. It needs an explicit
  justification from the implementer in writing on the PR, and it
  needs the post-merge soak to confirm that stage and prod still both
  apply correctly on the next `github-push-main` run. **Conditionally
  accept** if (a) the implementer comments on PR #129 explaining why
  stage no longer depends on dev applying first, (b) the post-merge
  main CI run shows both stage and prod `cloudflare-domain · apply`
  jobs reach SUCCESS, (c) the verifier explicitly notes the deviation
  + justification in the report's Deviations section. Otherwise:
  request a follow-up commit reverting only that hunk and re-run.

## Required gates on the NEW head

- [ ] Re-confirm PR Boundary using the **original** Task 0083 Verifier
      Boundary plus the four new files above (no further surprises).
      Run `gh pr view 129 --json files --jq '.files[].path'` and
      diff against the union of the original 14 categories +
      `intent.yaml` + `kiox.yaml` + `.github/workflows/ci.yml`. Any
      file not in that union = FAIL.
- [ ] CI run `26636510934` is green at 9/9. **Verify each load-bearing
      job actually ran on this head:** `cloudflare-domain · stage ·
      Terraform`, `cloudflare-domain · prod · Terraform`,
      `api-edge-tests · dev · Verify`, `api-edge · {dev,stage,prod} ·
      Verify deploy`, `cloudflare-hyperdrive · {stage,prod} ·
      Terraform`. The `web-console-next.{dev,stage,prod} · Verify
      deploy` jobs are NOT in this run because they're already on
      `main`; document that explicitly so a future reader doesn't
      think they were skipped accidentally.
- [ ] Re-run local Orun gates on the new PR head:
      - `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`
      - `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json`
      - `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions`
      Critically: if local kiox is still on the OLD orun `v2.3.0`
      and CI is on `v2.9.0`, document that, and rely on the CI plan
      job for the authoritative result.
- [ ] Re-run local Terraform gates in
      `infra/terraform/cloudflare-domain/terraform/`:
      `fmt -check`, `init -backend=false -upgrade`,
      `validate -no-color`.
- [ ] Re-check `git grep -nE 'sourceplane-web-console([^-]|$)'` on
      the current branch tip (`8703081`) — no live runtime references.
- [ ] `apps/web-console/` does not exist on the PR branch.
- [ ] No secret material in any commit added since the original
      report (`a7fe7cb`, `8703081`) — neither bumps anything
      secret-touching, but spot-check.

## Merge decision

If all of the above pass and the orchestrator stance on
`intent.yaml` is satisfied (either implementer justification posted
or hunk reverted) → **squash-merge PR #129** and proceed to the
mandatory post-merge soak.

If the implementer has not posted a justification for the
`intent.yaml` promotion hunk and the verifier cannot confidently
accept it: leave PR #129 OPEN, request a follow-up commit reverting
only that hunk, do NOT merge.

## Post-Merge Soak (unchanged from original verifier prompt)

Per `orun-saas-orchestration` →
`references/post-merge-deploy-profile-gap.md`. Mandatory.
Cannot PASS without it.

1. Watch the `github-push-main` CI run that includes
   `cloudflare-domain · {stage,prod} · Terraform · apply`. Wait for
   green.
2. Confirm apply logs show
   `cloudflare_workers_domain.console: Creation complete` (note: v4
   resource name, not v5 — that was already documented in the
   original verifier report) AND
   `cloudflare_pages_domain.console: Destruction complete` on both
   stage and prod.
3. Apex probes (retry once on TLS-provisioning 525/526):
   - `curl -sfL https://stage.sourceplane.ai/` → 200, body contains
     `Sourceplane Console`.
   - `curl -sfL https://prod.sourceplane.ai/` → 200, body contains
     `Sourceplane Console`.
4. CORS preflight (stage):
   ```
   curl -sI -X OPTIONS https://api.stage.sourceplane.ai/v1/auth/profile \
     -H "Origin: https://stage.sourceplane.ai" \
     -H "Access-Control-Request-Method: GET"
   ```
   must return `access-control-allow-origin: https://stage.sourceplane.ai`.
5. Rollback hatch alive — both
   `sourceplane-web-console-next-{stage,prod}.rahulvarghesepullely.workers.dev`
   still return 200 with `Sourceplane Console`.
6. **NEW probe specific to the intent.yaml change**: on the same
   `github-push-main` run, confirm `cloudflare-domain · prod ·
   Terraform · apply` ran (it was previously gated on dev applying
   first; dropping `dependsOn=[dev]` widens what runs in the prod
   wave). If prod apply did NOT run for any reason, the
   intent.yaml change is a regression — open a follow-up task and
   note the gap, but the merge still stands.

## Reporting

Rewrite `ai/reports/task-0083-verifier.md` (overwrite, do not
append) with:

- `Result: PASS` or `Result: FAIL` against the **new** head
  `8703081`.
- Checks table including the four post-PASS commits and the
  Orchestrator-sanctioned acceptance/rejection per row.
- CI run `26636510934` per-job table.
- Local Orun + Terraform gate results on the new head.
- Post-merge soak evidence (curl status + body fingerprint, CORS
  header, rollback hatch hits, `intent.yaml` prod-apply observation).
- Deviations section: explicitly call out
  (a) `cloudflare_workers_domain` (v4) vs `cloudflare_workers_custom_domain` (v5),
  (b) `orun v2.3.0 → v2.9.0` toolchain bump,
  (c) `intent.yaml` `promotion.dependsOn` removal,
  each with one-line rationale + verifier acceptance line.
- Recommended Next Move:
    - Task 0084 candidate A: drop `pagesProjectPrefix` after soak +
      delete legacy Pages projects imperatively.
    - Task 0084 candidate B: v5 cloudflare provider migration.
    - Task 0084 candidate C (NEW): audit deploy-promotion topology
      across all environments after the stage-no-longer-depends-on-dev
      change — confirm no other component silently relied on stage
      blocking until dev applied first.

After PASS + merge: sync local `main`, append `0083` to `completed`,
advance `current_task` to `"0084"`, set `task_agent` to
`"ai/tasks/task-0083-verifier-addendum.md"`, refresh `last_verified`,
rewrite `notes`, append the Task 0083 row to
`ai/context/task-ledger.md`, refresh `ai/context/current.md`,
reset `ai/waiting_for_input.md`. Commit as
`chore(orchestration): close out task 0083 (domain cutover + topology trim)`.
