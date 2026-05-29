# Task 0085a — Implementer Report

**Status:** Implementation complete, PR opened, PR CI green.
**Branch:** `impl/task-0085a-cloudflare-v4-removed-state-drop` (fresh off `main`).
**PR:** #133 (https://github.com/sourceplane/multi-tenant-saas/pull/133).
**Phase:** 1 of 2 (v4→v5 cloudflare-domain migration). Phase 2 will be scoped as Task 0085b after this PR merges and the post-merge `forgotten` apply lands on both envs.

## Summary

- Under the existing `cloudflare ~> 4.52` pin, added a `removed { from = cloudflare_workers_domain.console; lifecycle { destroy = false } }` block to `infra/terraform/cloudflare-domain/terraform/main.tf` and fenced (commented out) the live v4 `resource "cloudflare_workers_domain" "console"` block so it cannot be re-created by the next apply.
- Provider pin stays `~> 4.52`. `.terraform.lock.hcl` left untouched (still cloudflare 4.52.7, AWS 5.100.0 — matches `main`).
- `output "worker_custom_domain_id"` re-pointed to a literal placeholder `"pending_v5_reimport_task_0085b"` so the output continues to plan cleanly without referencing the now-orphaned `cloudflare_workers_domain.console` symbol. Restored to a real attachment ID by Task 0085b's `import {}` block.
- README.md `Resources Managed` table and Outputs section updated to call out that this is Phase 1 of 2 of the v4→v5 migration; no functional doc change beyond the migration note.
- No provider bump, no `import {}` block, no apex/Worker/binding/`intent.yaml`/`component.yaml` changes in this PR — strict Phase 1 scope.
- PR #132 closed as superseded with a one-line comment pointing here (not merged; branch left for reference).

## Files Changed

Terraform component (`infra/terraform/cloudflare-domain/`):
- `terraform/main.tf` — added `removed{}` block, fenced/commented v4 resource, updated migration comment, re-pointed `worker_custom_domain_id` output to literal placeholder.
- `README.md` — updated Resources Managed table entry for `cloudflare_workers_domain.console`, replaced v4/v5 note with Phase 1 of 2 callout, updated Outputs entry for `worker_custom_domain_id`.

Docs trail (`ai/`):
- `ai/proposals/task-0085-spec-update.md` — `## Resolution` block already appended by orchestrator (2026-05-29). No further edit needed by implementer (the section recording the orchestrator's accept decision and the 0085a/0085b split is already in place).
- `ai/tasks/task-0085a.md` — task scope (delivered by orchestrator).
- `ai/reports/task-0085a-implementer.md` — this report.

No other paths touched. Diff confined to `infra/terraform/cloudflare-domain/**` + `ai/**` per task scope.

## Checks Run

Pre-push, from repo root:

```
$ /Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
✓ Intent is valid
✓ All validation passed

$ /Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
1 components × 3 envs → 2 jobs
  components: cloudflare-domain
  mode: changed-only
  plan: 2c24f81d91d6
  file: plan.json

$ /Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
▲ orun multi-tenant-saas
  Plan: 2c24f81d91d6
  Scope: 1 component · 2 jobs · 4× parallel · gha

  ● cloudflare-domain
  │  ├─ ✓ stage  Terraform  0.0s
  │  └─ ✓ prod  Terraform  0.0s

◌ Preview ready in 0.0s
  2 selected

$ terraform -chdir=infra/terraform/cloudflare-domain/terraform fmt -check -diff
(no output — clean)
```

`terraform validate` deferred to CI (no local cloudflare provider mirror; per the orchestrator-skill pitfall this is acceptable as long as CI passes). PR CI `plan` job runs `terraform init/validate/plan` under the `~> 4.52` lockfile.

Note: `kiox.lock` was incidentally bumped from `orun v2.3.0` → `v2.9.0` during local validation (kiox auto-resolves the latest matching version when the local cache is cold). Reverted with `git checkout -- kiox.lock` before committing — out of scope for Phase 1.

## Plan Diff Evidence

PR-CI run [26644076501](https://github.com/sourceplane/multi-tenant-saas/actions/runs/26644076501) — both env jobs PASS. Plan job PASS. Literal Terraform 1.15.x output per env (`removed { lifecycle { destroy = false } }` against a tracked resource):

**stage** ([job 78524741081](https://github.com/sourceplane/multi-tenant-saas/actions/runs/26644076501/job/78524741081)):

```
Terraform will perform the following actions:

 # cloudflare_workers_domain.console[0] will no longer be managed by Terraform, but will not be destroyed
 # (destroy = false is set in the configuration)
 . resource "cloudflare_workers_domain" "console" {
        id          = "052eaece5e989d5a7280b6c206e562c42950e3a6"
        # (5 unchanged attributes hidden)
    }

Plan: 0 to add, 0 to change, 0 to destroy.

Changes to Outputs:
  ~ worker_custom_domain_id = "052eaece5e989d5a7280b6c206e562c42950e3a6" -> "pending_v5_reimport_task_0085b"

Warning: Some objects will no longer be managed by Terraform

If you apply this plan, Terraform will discard its tracking information for
the following objects, but it will not delete them:
 - cloudflare_workers_domain.console[0]
```

**prod** ([job 78524741140](https://github.com/sourceplane/multi-tenant-saas/actions/runs/26644076501/job/78524741140)) — same shape with the prod ID:

```
 # cloudflare_workers_domain.console[0] will no longer be managed by Terraform, but will not be destroyed
        id          = "31e5f2ed1b1e4a5700e8ae0678846a0d753840e1"
Plan: 0 to add, 0 to change, 0 to destroy.
  ~ worker_custom_domain_id = "31e5f2ed1b1e4a5700e8ae0678846a0d753840e1" -> "pending_v5_reimport_task_0085b"
Warning: Some objects will no longer be managed by Terraform
 - cloudflare_workers_domain.console[0]
```

**Wording reconciliation:** The task scope anticipated `Plan: 0 to add, 0 to change, 1 to forget.` Terraform 1.15.x does NOT add a `to forget` count to the plan footer for `removed { lifecycle { destroy = false } }`; instead it shows the resource separately with action marker `.` (forget), the explanatory comment `# (destroy = false is set in the configuration)`, and the dedicated `Warning: Some objects will no longer be managed by Terraform` block that names the resource. The footer stays `Plan: 0 to add, 0 to change, 0 to destroy.` (note: zero on every count, including `to destroy` — which is the load-bearing invariant).

This matches Constraint #7 of the task scope exactly: `to destroy` is 0, the live Cloudflare resource is untouched, only the state file is mutated. The `Output diff` line is the cosmetic re-point of `worker_custom_domain_id` to the placeholder string (this is the secondary edit that lets `output {}` continue to plan cleanly once `cloudflare_workers_domain.console[0]` is no longer a referenceable symbol).

**Live IDs confirmed match the task scope:** stage `052eaece5e989d5a7280b6c206e562c42950e3a6` ✓, prod `31e5f2ed1b1e4a5700e8ae0678846a0d753840e1` ✓. These are the byte-identical IDs that must survive both phases.

The `removed {}` block as written:

```hcl
removed {
  from = cloudflare_workers_domain.console
  lifecycle {
    destroy = false
  }
}
```

The v4 `resource` block is fenced (commented) immediately below with a `# REMOVED IN 0085a, REPLACED IN 0085b` header explaining why it must not be uncommented.

## Pre-merge Probes

All four URLs return final 200 with `<title>Sourceplane Console</title>`:

```
200 https://stage.sourceplane.ai/
200 https://prod.sourceplane.ai/
200 https://sourceplane-web-console-next-stage.rahulvarghesepullely.workers.dev/
200 https://sourceplane-web-console-next-prod.rahulvarghesepullely.workers.dev/
```

(Initial `curl -sI` returns HTTP/2 307 — the console's standard `/` → `/login` redirect — which resolves to 200 with the expected title; both apex hostnames and both Worker rollback hatches are healthy pre-merge.)

## PR #132 Closure

Closed as superseded (not merged) with a one-line comment pointing to this PR:

```
  gh pr close 132 --comment "Superseded by #133 (Task 0085a — Phase 1 of the v4→v5 cloudflare-domain split per ai/proposals/task-0085-spec-update.md Resolution, orchestrator decision 2026-05-29). Branch left for reference; no rebase/salvage required (0085a starts a fresh branch off main). Phase 2 lands as Task 0085b after this merges and the post-merge 'forgotten' apply lands on both envs."
```

Branch `impl/task-0085-cloudflare-v5-workers-custom-domain` is left in place for historical reference (failed PR-CI runs 26642692516 + 26642904336 still reachable from it).

## Assumptions

- The `locals.workers_custom_domain_ids` map (mentioned in the task's "free to decide" section) was never present in the v4 source — there is nothing for 0085b to consume here, so the decision to "keep or strip" is moot. 0085b will add its own `import {}` blocks keyed by `var.environment` from scratch.
- `output "worker_custom_domain_id"` could not safely keep its old expression (`try(cloudflare_workers_domain.console[0].id, "pending")`) because the symbol no longer exists once the resource block is commented out — Terraform would fail validation. The literal placeholder `"pending_v5_reimport_task_0085b"` preserves the output's schema (string) and consumers' contract (a string that callers should treat as opaque). No downstream component currently reads `worker_custom_domain_id` (`grep` confirmed only this component's `output` block references it), so the placeholder window is safe.
- `.terraform.lock.hcl` deliberately not refreshed — staying byte-identical with `main`. No lock-file change is required for this phase since the provider pin stayed put.

## Spec Proposals

- `ai/proposals/task-0085-spec-update.md` — `## Resolution` block already in place (orchestrator decision, 2026-05-29: ACCEPTED, split into 0085a + 0085b). No new proposals required.

## Remaining Gaps

- Phase 2 (`Task 0085b`) is the load-bearing follow-up: provider bump to `~> 5.0`, replace the fenced v4 block with the v5 `cloudflare_workers_custom_domain.console`, and re-adopt the two live custom-domain resources by their immutable IDs (`052eaece5e989d5a7280b6c206e562c42950e3a6` stage, `31e5f2ed1b1e4a5700e8ae0678846a0d753840e1` prod) via `import {}`. Until 0085b lands, `output "worker_custom_domain_id"` is a literal placeholder and the live custom-domain resources are not Terraform-tracked.
- Risk: if 0085b is delayed indefinitely, the two live custom-domain attachments drift from Terraform's view (Cloudflare-side changes would not be detected by `terraform plan`). Mitigation: keep 0085b on the immediate orchestrator queue once this PR's post-merge `forgotten` apply lands cleanly on both envs.

## Next Task Dependencies

- **Task 0085b** — Phase 2: bump `required_providers.cloudflare.version` to `~> 5.0`; replace the fenced v4 block with `resource "cloudflare_workers_custom_domain" "console"`; add `import {}` blocks keyed by env that re-adopt by the immutable IDs above; restore `output "worker_custom_domain_id"` to the real attachment ID; refresh `.terraform.lock.hcl` to cloudflare 5.x (multi-arch). Orchestrator will scope after this task is verified, merged, and post-merge soak (`Apply complete! Resources: 0 added, 0 changed, 0 destroyed, 1 forgotten.` on both envs) is clean.

## PR Number

#133 (https://github.com/sourceplane/multi-tenant-saas/pull/133)
