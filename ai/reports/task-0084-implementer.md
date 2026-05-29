# Task 0084 — Implementer Report

**Status**: ✅ Complete (pending verifier post-merge soak)
**Branch**: `impl/task-0084-drop-pages-residuals`
**Agent**: Implementer
**Date**: 2026-05-29

## Summary

Removed the legacy Pages residuals from the `cloudflare-domain` component
that were retained "read-only for one soak cycle" after Task 0083 cut the
console over from Cloudflare Pages to Workers + Static Assets. Task 0083.1
verifier (2026-05-29T13:30Z) confirmed the soak was healthy, so these are
now dead code.

Also deleted the three orphaned legacy Pages projects out-of-band via
`wrangler pages project delete` (one of the three —
`sourceplane-web-console-dev` — turned out to never have existed; the
other two were deleted successfully).

## Changes (PR-scoped)

Three files, narrowly scoped to dead-code removal — no resource shape
change, no provider bump, no new env wiring.

### `infra/terraform/cloudflare-domain/terraform/main.tf`

- Removed `variable "pagesProjectPrefix"` block (lines 135–139).
- Removed `local.pages_project_name` binding (line 157).
- Removed `output "pages_project_name"` block (lines 226–229).

Resource `cloudflare_workers_domain.console`, all other variables,
locals, and outputs (`zone_id`, `zone_name`, `zone_status`,
`console_custom_domain`, `worker_name`, `worker_custom_domain_id`)
remain untouched. Provider pin stays `~> 4.52`.

### `infra/terraform/cloudflare-domain/component.yaml`

- Removed the four comment lines + `pagesProjectPrefix: sourceplane-web-console`
  parameter from `spec.parameters`.

All other parameters, env, dependsOn, subscribe rules unchanged.

### `infra/terraform/cloudflare-domain/README.md`

- Dropped the `pagesProjectPrefix` row from the Parameters table.
- Dropped the `pages_project_name` bullet from the Outputs list.

## Out-of-band: legacy Pages project deletion

Per task §4, the three legacy Pages projects had no Orun-managed handle
(the only managed resource — `cloudflare_pages_domain.console` — was
destroyed in Task 0083), so deletion is imperative.

### Pre-delete: `wrangler pages project list` (relevant rows only)

```
sourceplane-web-console-next-stage   sourceplane-web-console-next-stage.pages.dev   5 hours ago
sourceplane-web-console-prod         sourceplane-web-console-prod.pages.dev         11 hours ago
sourceplane-web-console-stage        sourceplane-web-console-stage.pages.dev        11 hours ago
sourceplane-web-console              sourceplane-web-console.pages.dev              2 days ago
```

(Out-of-scope projects elided.) Note: `sourceplane-web-console-dev`
does **not** appear — it was never created. Unsuffixed
`sourceplane-web-console` is **out of scope** (task explicitly targets
the `-{dev,stage,prod}` triple).

### Traffic check (pre-delete)

`wrangler pages deployment list` for both `sourceplane-web-console-stage`
and `sourceplane-web-console-prod` showed the most recent deployments
were 11 hours ago, with the same source SHAs (`5bf21b4`, `5cde36d`) that
fed the legacy web-console builds — i.e. stale CI residue, no new
traffic. No active deploy workflow in `.github/` or active `component.yaml`
in the repo still targets these names. The legacy `apps/web-console/`
directory itself is gone. Source CORS (`apps/api-edge/src/cors.ts`)
no longer references the legacy hosts (only the compiled `dist/`
bundle still does, which is a build artifact and will be regenerated
on the next api-edge deploy).

### Commands run

```bash
for p in sourceplane-web-console-dev sourceplane-web-console-stage sourceplane-web-console-prod; do
  wrangler pages project delete "$p" --yes
done
```

Output:

- `sourceplane-web-console-dev`: errored (project did not exist — expected).
- `sourceplane-web-console-stage`: `Successfully deleted sourceplane-web-console-stage`.
- `sourceplane-web-console-prod`: `Successfully deleted sourceplane-web-console-prod`.

### Post-delete: `wrangler pages project list` (relevant rows only)

```
sourceplane-web-console-next-stage   sourceplane-web-console-next-stage.pages.dev   5 hours ago
sourceplane-web-console              sourceplane-web-console.pages.dev              2 days ago
```

`sourceplane-web-console-{dev,stage,prod}` are all absent. Verifier
acceptance criterion §6 satisfied.

## Local validation

| Check | Result |
|------:|:-------|
| `terraform fmt -check` on `infra/terraform/cloudflare-domain/terraform/` | PASS |
| `./.workspace/bin/orun validate` | PASS — `✓ Intent is valid`, `✓ All validation passed` |
| `./.workspace/bin/orun plan --changed` | PASS — `1 components × 3 envs → 2 jobs`, plan `7d86ed7ead17` |
| Plan inspection (`jq` on `.jobs[]`) | Exactly 2 jobs: `cloudflare-domain.{stage,prod}.terraform`, profile `terraform.plan-only`, check names `cloudflare-domain · {stage,prod} · Terraform` |
| `./.workspace/bin/orun run --plan ... --dry-run --runner github-actions` | PASS — `2 selected`, both ✓ |
| `grep -rn "pages_project_name\|pagesProjectPrefix" infra/terraform/cloudflare-domain/` | No matches (clean removal) |

## Acceptance check

Pre-merge (orchestrator/CI):

- [x] `orun validate` PASS
- [x] `orun plan --changed` PASS — 2 cloudflare-domain plan-only jobs
- [x] `orun run --dry-run` PASS — 2 jobs selected
- [ ] PR CI green (pending push + GHA run)

Post-merge (verifier-owned soak):

- [ ] `cloudflare-domain · {stage,prod} · Terraform · apply`:
      `Apply complete! Resources: 0 added, 0 changed, 0 destroyed.`
- [ ] `curl -sfL https://stage.sourceplane.ai/` → 200 with `Sourceplane Console`
- [ ] `curl -sfL https://prod.sourceplane.ai/` → 200 with `Sourceplane Console`
- [ ] Rollback hatch `sourceplane-web-console-next-{stage,prod}.rahulvarghesepullely.workers.dev` → 200
- [x] `wrangler pages project list` does not list `sourceplane-web-console-{dev,stage,prod}` *(verified pre-merge; verifier should re-confirm post-merge)*

## Scope boundary audit

PR contains ONLY:

- `infra/terraform/cloudflare-domain/terraform/main.tf`
- `infra/terraform/cloudflare-domain/component.yaml`
- `infra/terraform/cloudflare-domain/README.md`
- `ai/reports/task-0084-implementer.md`

Touched but reverted (out of scope):

- `kiox.lock` — picked up an unrelated `orun v2.3.0 → v2.9.0` bump from
  the local kiox cache when `./.workspace/bin/orun` was first invoked.
  Reverted with `git checkout kiox.lock` so this PR stays surgical. A
  separate task should bump orun in a dedicated PR if desired.

No change to:

- `cloudflare_workers_domain.console` resource shape, count gate, or
  any other resource
- Cloudflare provider pin (`~> 4.52` — v5 rename deferred to Task 0085)
- `apps/web-console-next/**`, `apps/api-edge/**`, any worker, contract,
  db, policy, migration
- `intent.yaml`
- Any new orun composition or job template

## Open questions for verifier

1. Confirm the post-merge apply on both `stage` and `prod` cloudflare-domain
   Terraform jobs is a clean no-op (0/0/0) — this is the proof that the
   dropped variable/output were truly dead.
2. Re-run `wrangler pages project list` post-merge as a sanity check
   that the legacy projects haven't been silently re-created by some
   sleeper workflow.
3. (Future) The api-edge `dist/` bundle still has the legacy
   `sourceplane-web-console-{stage,prod}.pages.dev` regex in its CORS
   allowlist. Source no longer references it; the dist will be
   regenerated on the next api-edge deploy. Worth confirming nothing
   re-serves the old bundle in the interim.

## References

- Task spec: `ai/tasks/task-0084.md`
- Prior task closing the soak: Task 0083.1 verifier report
- Component README: `infra/terraform/cloudflare-domain/README.md`
- Follow-up task: Task 0085 (Cloudflare provider v4 → v5 + `cloudflare_workers_domain` → `cloudflare_workers_custom_domain` rename)
