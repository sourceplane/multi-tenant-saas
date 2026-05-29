# Spec Change Proposal — Task 0085

**Status:** Proposed (blocking Task 0085 implementation)
**Author:** implementer (Task 0085)
**PR:** https://github.com/sourceplane/multi-tenant-saas/pull/132 (BLOCKED — see Verification below)

## Problem

Task 0085 ("bump cloudflare provider to v5 and rename
`cloudflare_workers_domain.console` →
`cloudflare_workers_custom_domain.console`") is scoped as a single
PR that bumps the provider and carries the rename through
Terraform state via a `moved {}` block, with zero resource churn
and byte-identical live resource IDs.

The cloudflare provider v5 does not actually support this in a
single PR. Both of the migration patterns the v5 upgrade guide
exposes fail when packaged together:

1. **Bare `moved { from = cloudflare_workers_domain.console, to =
   cloudflare_workers_custom_domain.console }`** — fails at plan
   time with:

   ```
   Error: Unable to Move Resource State
   Source Provider Address: registry.terraform.io/cloudflare/cloudflare
   Source Resource Type: cloudflare_workers_domain
   Target Resource Type: cloudflare_workers_custom_domain
   ```

   The v5 provider does not implement cross-resource-type
   `MoveState` for this rename. Terraform cannot reinterpret a
   v4-typed state entry as the v5 type without provider help.
   Confirmed on PR-CI run 26642692516 (jobs 78519805192 stage,
   78519805176 prod).

2. **`removed { from = cloudflare_workers_domain.console, lifecycle
   { destroy = false } }` + `import { id =
   "<account_id>/<domain_id>", to =
   cloudflare_workers_custom_domain.console[…] }`** — produces a
   `Plan: 1 to import, 0 to add, 1 to change, 0 to destroy` but
   then fails with:

   ```
   Error: no schema available for cloudflare_workers_domain.console[0]
   while reading state; this is a bug in Terraform and should be
   reported
   ```

   Terraform requires the v4 provider schema to read the existing
   v4-typed state entry before it can drop it via `removed{}`.
   Under a `~> 5.0` pin only v5 is installed, so the existing
   state entry is unreadable. Confirmed on PR-CI run 26642904336.

   Terraform doesn't allow two majors of the same provider source
   to coexist (provider aliases must share a source address), so
   "install v4 alongside v5" is not a workaround.

The v5 upgrade guide's own resolution for this class of rename
(see the `cloudflare_zone_settings_override` walkthrough) is a
**two-phase migration**, gated on a real v4 apply between the
phases:

- **Phase 1** keeps the provider on `~> 4.52`, adds the `removed
  { lifecycle { destroy = false } }` block for the v4-typed
  resource. CI applies this with the v4 provider, which drops the
  state entry without touching the live resource.
- **Phase 2** (separate PR, after phase 1 has merged AND applied
  on both envs) bumps the provider to `~> 5.0`, adds the v5
  `cloudflare_workers_custom_domain.console` resource, and uses
  an `import {}` block to re-adopt the live resource by its known
  immutable ID.

This is exactly the pattern `tf-migrate` automates for
`cloudflare_zone_settings_override`. It is not possible to
collapse into a single PR.

## Why this triggers Task 0085 Constraint #7

> 7. If the v5 provider forces a behavioral change that cannot be
> absorbed by a `moved` block (e.g. the resource is split,
> removed, or its lifecycle changes), STOP and file a Spec Change
> Proposal under `ai/proposals/task-0085-spec-update.md` rather
> than silently destroying the live resource.

The change here is precisely "the rename cannot be absorbed by a
`moved` block," and the only safe alternative is a two-phase
sequence that requires an in-between `terraform apply` against
the live state. That is structurally outside one PR.

## Proposal

Re-scope Task 0085 into two implementer tasks, both
state-preserving and zero-resource-churn end-to-end:

### Task 0085a — Phase 1: drop v4 state entries (no provider bump)

Branch: `impl/task-0085a-cloudflare-v4-removed-state-drop`
Single PR. Scope:

1. `infra/terraform/cloudflare-domain/terraform/main.tf` — under
   the existing `cloudflare ~> 4.52` pin, add:

   ```hcl
   removed {
     from = cloudflare_workers_domain.console
     lifecycle {
       destroy = false
     }
   }
   ```

   and comment out (do NOT delete) the
   `resource "cloudflare_workers_domain" "console"` block so it
   isn't re-created on the next apply.

2. Expected PR-CI plan diff per env:

   ```
   Plan: 0 to add, 0 to change, 1 to forget.
   ```

   ("forget" is Terraform's term for the no-op state drop under
   `lifecycle { destroy = false }`.)

3. Post-merge `apply` on stage and prod logs `Apply complete!
   Resources: 0 added, 0 changed, 0 destroyed, 1 forgotten` and
   leaves the two live Cloudflare custom-domain resources running
   (verifiable via apex + rollback-hatch probes returning 200).

### Task 0085b — Phase 2: bump to v5 and re-import

Branch: `impl/task-0085b-cloudflare-v5-workers-custom-domain`
Single PR, opened ONLY after 0085a has merged and main-CI applies
have completed on both envs (state drop visible in S3 state).
Scope:

1. `infra/terraform/cloudflare-domain/terraform/main.tf`:
   - `required_providers.cloudflare.version`: `~> 4.52` → `~> 5.0`
   - Replace the commented-out v4 resource with the v5
     `resource "cloudflare_workers_custom_domain" "console"`
     (attribute shape identical except `environment` is now a
     deprecated-but-accepted optional).
   - Migrate `data "cloudflare_zone" "existing"` to the v5
     nested `filter` block.
   - Migrate `cloudflare_zone.managed` (count=0) to the v5 shape
     (`account = { id = ... }`, `name`, drop `plan`).
   - Update `output "worker_custom_domain_id"` to read from the
     renamed resource.
   - Add `import {}` blocks (one per env, keyed by `var.environment`
     against a locals map) re-adopting the live resources by their
     known IDs:
       - stage: `052eaece5e989d5a7280b6c206e562c42950e3a6`
       - prod:  `31e5f2ed1b1e4a5700e8ae0678846a0d753840e1`
   - Remove the `removed {}` block from 0085a.

2. `.terraform.lock.hcl` refresh (cloudflare 5.19.1, multi-arch).

3. `README.md` flip the v4-vs-v5 note to "migration complete; on
   v5" and update the Outputs section.

Expected PR-CI plan diff per env:

```
Plan: 1 to import, 0 to add, 0 to change, 0 to destroy.
```

Post-merge `apply` per env logs `Apply complete! Resources: 1
imported, 0 added, 0 changed, 0 destroyed.` and the resource IDs
in the v5 state are byte-identical to the pre-0085a values.

## Failure mode this avoids

The single-PR shape that Task 0085 currently mandates either (a)
fails CI before merge (as observed) and the v4 debt stays put, or
(b) tempts an implementer to "fix" the failing plan by deleting
the resource block and accepting a `1 to destroy, 1 to add` plan,
which would briefly unbind the apex hostnames `stage.sourceplane.ai`
and `prod.sourceplane.ai` from their Workers — a real, user-visible
outage. The two-phase split is the lowest-risk path that keeps
each PR's plan diff strictly state-only and human-reviewable.

## Decision requested

Orchestrator: accept the rescope (close PR #132 as superseded;
generate Task 0085a + Task 0085b scope docs), or reject and
provide an alternative single-PR path I have not considered.

## References

- v5 upgrade guide, "Phased migration for
  `cloudflare_zone_settings_override`" (same removed{}+two-phase
  pattern):
  https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/guides/version-5-upgrade
- PR #132 (this implementation attempt):
  https://github.com/sourceplane/multi-tenant-saas/pull/132
- PR-CI failed run with the bare `moved{}` shape:
  https://github.com/sourceplane/multi-tenant-saas/actions/runs/26642692516
- PR-CI failed run with the `removed{}+import{}` shape:
  https://github.com/sourceplane/multi-tenant-saas/actions/runs/26642904336
