# Task 0085 — Implementer Report

**Status:** **BLOCKED** — see Spec Change Proposal
**Branch:** `impl/task-0085-cloudflare-v5-workers-custom-domain`
**PR:** [#132](https://github.com/sourceplane/multi-tenant-saas/pull/132)
  (converted to draft pending orchestrator decision)
**Spec Change Proposal:** [`ai/proposals/task-0085-spec-update.md`](../proposals/task-0085-spec-update.md)

## Summary

- Attempted the rename + provider bump as a single PR per task scope.
- Both v5-sanctioned state-migration patterns fail when packaged with
  the provider bump in the same PR:
  1. Bare `moved { from = cloudflare_workers_domain.console, to =
     cloudflare_workers_custom_domain.console }` →
     `Error: Unable to Move Resource State` (v5 provider doesn't
     implement cross-type MoveState for this rename).
  2. `removed { lifecycle { destroy = false } } + import {}` →
     `Error: no schema available for cloudflare_workers_domain.console[0]
     while reading state` (Terraform needs the v4 provider schema to
     read the existing v4-typed state entry; v4 is gone under a `~> 5.0`
     pin, and the provider sources can't coexist).
- Per Task 0085 Constraint #7, this is the "v5 provider forces a
  behavioral change that cannot be absorbed by a `moved` block"
  case — STOP and file a Spec Change Proposal rather than silently
  destroy + re-add the live custom-domain resources.
- Spec Change Proposal at `ai/proposals/task-0085-spec-update.md`
  proposes rescoping into two state-preserving phases: **0085a**
  (v4-pinned `removed{}` to drop v4 state entries) → real `apply`
  → **0085b** (v5 bump + `import{}` to re-adopt by known IDs).
  Both phases produce zero-resource-churn plans end-to-end and
  preserve the live resource IDs byte-identical.

## Files Changed (on branch, awaiting orchestrator decision)

- `infra/terraform/cloudflare-domain/terraform/main.tf` —
  provider bump + rename + v5 schema fixes + import block; still
  posted in PR #132 as evidence of the attempted shape.
- `infra/terraform/cloudflare-domain/terraform/.terraform.lock.hcl` —
  refreshed to cloudflare 5.19.1 across four platforms.
- `infra/terraform/cloudflare-domain/README.md` — v4/v5 note rewrite.
- `ai/tasks/task-0085.md` — orchestrator scope file tracked.
- `ai/proposals/task-0085-spec-update.md` — **this proposal.**

## Checks Run

| Command | Result |
|---|---|
| `terraform fmt -check` | ✓ |
| `terraform validate` (locally, no backend) | ✓ Success, one expected deprecation warning on `environment` |
| `kiox -- orun validate` | ✓ Intent is valid |
| `kiox -- orun plan --changed --intent intent.yaml --output plan.json` | ✓ 2 jobs (stage, prod, both plan-only) |
| `kiox -- orun run --plan plan.json --dry-run --runner github-actions` | ✓ |
| PR-CI run 26642692516 (`moved{}` shape) | ✗ `Unable to Move Resource State` on both envs |
| PR-CI run 26642904336 (`removed{}+import{}` shape) | ✗ `no schema available for cloudflare_workers_domain.console[0]` on both envs |

## Plan Diff Evidence

No clean zero-churn plan was achievable with the single-PR shape.
Captured failures are linked in the Spec Change Proposal under
References.

## Assumptions

- v5 upgrade guide's two-phase pattern (the
  `cloudflare_zone_settings_override` walkthrough) is the
  sanctioned migration shape for renames of this class.
- Live resource IDs `052eaece5e989d5a7280b6c206e562c42950e3a6`
  (stage) and `31e5f2ed1b1e4a5700e8ae0678846a0d753840e1` (prod)
  are immutable and stable enough to pin in source as the
  re-import target. (They have survived Tasks 0083, 0083.1, and
  0084 without change.)
- The orchestrator owns the rescope decision; the implementer
  does not unilaterally split a task into two without sign-off.

## Spec Proposals

- `ai/proposals/task-0085-spec-update.md` — rescope to 0085a +
  0085b. Reason: v5 provider cross-type rename is structurally a
  two-phase migration; cannot be absorbed by `moved{}` or by
  `removed{}+import{}` in a single PR.

## Remaining Gaps

The v4 debt remains until either 0085a/0085b is run, or the
orchestrator chooses an alternative path. Nothing on `main` is
regressed; the failing plan is contained to the open PR's
plan-only job.

## Next Task Dependencies

Orchestrator decision on the Spec Change Proposal. If accepted, the
follow-up tasks are 0085a (this PR closed as superseded) → 0085b.

## PR Number

**#132** — https://github.com/sourceplane/multi-tenant-saas/pull/132
(draft, pending orchestrator decision on the rescope proposal)
