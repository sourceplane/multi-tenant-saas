# Task 0084 — Verifier Report

## Result: PASS

Task 0084 (drop legacy Pages residuals from `cloudflare-domain`) verified
PASS pre-merge, merged via PR #131 squash `305520a`, and confirmed clean
no-op post-merge soak on both `stage` and `prod`. Apex hostnames remain
live, rollback hatch remains live, and the three legacy
`sourceplane-web-console-{dev,stage,prod}` Pages projects stay absent
from the account.

## Checks

### Pre-merge

| Check | Command | Result |
|---|---|---|
| Diff-scope audit | `gh pr view 131 --json files` | 4 files: `infra/terraform/cloudflare-domain/{terraform/main.tf,component.yaml,README.md}` + `ai/reports/task-0084-implementer.md`. No out-of-scope paths. |
| Residual identifier grep | `grep -rn "pages_project_name\|pagesProjectPrefix" infra/terraform/cloudflare-domain/` | No matches. |
| `cloudflare_workers_domain.console` byte-identical | `git diff origin/main -- infra/terraform/cloudflare-domain/terraform/main.tf` | Diff contains only the three deletions (`variable "pagesProjectPrefix"`, `local.pages_project_name`, `output "pages_project_name"`). The `cloudflare_workers_domain.console` resource block and `cloudflare ~> 4.52` provider pin are untouched. |
| Terraform fmt | `terraform -chdir=infra/terraform/cloudflare-domain/terraform fmt -check` | exit 0. |
| Orun validate | `./.workspace/bin/orun validate --intent intent.yaml` | `✓ All validation passed`. |
| Orun changed-plan | `./.workspace/bin/orun plan --changed --intent intent.yaml --output plan.json` | 2 jobs: `cloudflare-domain.{stage,prod}.terraform`, profile `terraform.plan-only`. |
| Orun dry-run | `./.workspace/bin/orun run --plan plan.json --dry-run --runner github-actions` | Both jobs selected, 2 selected, no failures. |
| PR CI rollup | `gh pr view 131 --json statusCheckRollup` | `plan` SUCCESS, `cloudflare-domain · stage · Terraform` SUCCESS, `cloudflare-domain · prod · Terraform` SUCCESS (workflow run `26640690294`). |
| PR CI plan content | `gh run view --job 78512649133 --log` / `78512649095` | Both plans show only `Changes to Outputs: - pages_project_name = "<name>" -> null`. Zero resource diff. `data.cloudflare_zone.existing[0]` + `cloudflare_workers_domain.console[0]` refreshed without drift. |
| `kiox.lock` unchanged | `git show 47e34485:kiox.lock` vs `git show origin/main:kiox.lock` | Identical (orun v2.3.0 pinned). |
| Mergeability | `gh pr view 131 --json mergeable,mergeStateStatus` | `MERGEABLE` / `CLEAN`. |

### Merge

| Check | Command | Result |
|---|---|---|
| Squash merge | `gh pr merge 131 --squash --delete-branch` | Branch deleted; merge fast-forwarded local main to `305520a chore(infra): Task 0084 - drop legacy Pages residuals from cloudflare-domain (#131)`. |
| Local main sync | `git pull --ff-only origin main` | Fast-forward `8706beb..305520a`. |

### Post-merge

| Check | Command | Result |
|---|---|---|
| Post-merge main CI run | `gh run list --branch main --limit 1` + `gh run watch 26641282273` | Run `26641282273` conclusion `success`. Jobs: `plan` SUCCESS, `cloudflare-domain · stage · Terraform` SUCCESS (`78514773064`), `cloudflare-domain · prod · Terraform` SUCCESS (`78514773088`). |
| Stage clean no-op | `gh run view --job 78514773064 --log` | `Apply complete! Resources: 0 added, 0 changed, 0 destroyed.` |
| Prod clean no-op | `gh run view --job 78514773088 --log` | `Apply complete! Resources: 0 added, 0 changed, 0 destroyed.` |
| Stage apex probe | `curl -sfL https://stage.sourceplane.ai/` | 200, body contains `<title>Sourceplane Console</title>`. |
| Prod apex probe | `curl -sfL https://prod.sourceplane.ai/` | 200, body contains `<title>Sourceplane Console</title>`. |
| Stage rollback hatch | `curl -sfL https://sourceplane-web-console-next-stage.rahulvarghesepullely.workers.dev/` | 200, body contains `<title>Sourceplane Console</title>`. |
| Prod rollback hatch | `curl -sfL https://sourceplane-web-console-next-prod.rahulvarghesepullely.workers.dev/` | 200, body contains `<title>Sourceplane Console</title>`. |
| Legacy Pages project absence | `wrangler pages project list` | None of `sourceplane-web-console-dev`, `sourceplane-web-console-stage`, `sourceplane-web-console-prod` present. The unsuffixed `sourceplane-web-console` and the `sourceplane-web-console-next-stage` siblings remain (out of scope per spec). |

## CI Log Review

### PR CI — workflow run `26640690294`

Both Terraform jobs ran in plan-only profile. Verbatim plan-output lines
(only output-removal diff; zero resource changes):

Stage (`78512649133`):
```
data.cloudflare_zone.existing[0]: Read complete after 0s [id=757281400d91eb0a7b08cd6bba7e0577]
cloudflare_workers_domain.console[0]: Refreshing state... [id=052eaece5e989d5a7280b6c206e562c42950e3a6]

Changes to Outputs:
  - pages_project_name      = "sourceplane-web-console-stage" -> null

You can apply this plan to save these new output values to the Terraform
state, without changing any real infrastructure.
```

Prod (`78512649095`) — same shape:
```
cloudflare_workers_domain.console[0]: Refreshing state... [id=31e5f2ed1b1e4a5700e8ae0678846a0d753840e1]
Changes to Outputs:
  - pages_project_name      = "sourceplane-web-console-prod" -> null
```

Note on the "No changes." literal in the acceptance criteria: the plan
shows `Changes to Outputs:` for the dropped `pages_project_name` output,
followed by the explicit reassurance line `You can apply this plan to
save these new output values to the Terraform state, **without changing
any real infrastructure.**` This is a state-irrelevant output-only diff
(exactly the shape the task description anticipates: "the plan diff is
purely the variable/output removal"). Zero resource diff. Post-merge
apply confirms the no-op via `0 added, 0 changed, 0 destroyed`.

### Post-merge main CI — workflow run `26641282273`

Stage (`78514773064`) apply log, verbatim:
```
cloudflare_workers_domain.console[0]: Refreshing state... [id=052eaece5e989d5a7280b6c206e562c42950e3a6]
  - pages_project_name      = "sourceplane-web-console-stage" -> null
Apply complete! Resources: 0 added, 0 changed, 0 destroyed.
```

Prod (`78514773088`) apply log, verbatim:
```
cloudflare_workers_domain.console[0]: Refreshing state... [id=31e5f2ed1b1e4a5700e8ae0678846a0d753840e1]
  - pages_project_name      = "sourceplane-web-console-prod" -> null
Apply complete! Resources: 0 added, 0 changed, 0 destroyed.
```

This is the load-bearing proof that `pagesProjectPrefix` and the
`pages_project_name` output were truly dead: removing them touched zero
real Cloudflare resources on either env.

## Live Resource Evidence

| URL | HTTP | Body marker |
|---|---|---|
| https://stage.sourceplane.ai/ | 200 | `<title>Sourceplane Console</title>` |
| https://prod.sourceplane.ai/ | 200 | `<title>Sourceplane Console</title>` |
| https://sourceplane-web-console-next-stage.rahulvarghesepullely.workers.dev/ | 200 | `<title>Sourceplane Console</title>` |
| https://sourceplane-web-console-next-prod.rahulvarghesepullely.workers.dev/ | 200 | `<title>Sourceplane Console</title>` |

`wrangler pages project list` (post-merge) excerpt, projects of interest:

```
sourceplane-web-console-next-stage  → sourceplane-web-console-next-stage.pages.dev  (out of scope, ok)
sourceplane-web-console             → sourceplane-web-console.pages.dev             (unsuffixed, out of scope, ok)
```

Absent (as required):
- `sourceplane-web-console-dev` — never existed.
- `sourceplane-web-console-stage` — deleted out-of-band by implementer.
- `sourceplane-web-console-prod` — deleted out-of-band by implementer.

Implementer's pre/post wrangler deletion evidence retained in
`ai/reports/task-0084-implementer.md`; verifier confirms persistence
post-merge.

## Secret Handling Review

No new env-var wiring, no secret-shaped strings in the diff. CI logs
contain no `TF_VAR_cloudflare_api_token` leaks (Hermes redaction also
verified on the verifier's own log extracts). Verifier introduced zero
new secrets.

## Spec Proposals

None required. The dropped `pagesProjectPrefix` parameter had no
spec-level consumer (it was already documented as "Legacy / kept
read-only for one soak cycle"); removing it is consistent with the
specs as they stand.

Task 0085's v4 → v5 cloudflare provider rename
(`cloudflare_workers_domain` → `cloudflare_workers_custom_domain`) will
need its own spec/proposal review if it touches the
`environment = "production"` argument or any output shape, but that's
scoped to 0085, not 0084.

## Risk Notes

Residual risk after this merge: ~zero.

- The dropped variable/output were already provably orphaned (read-only
  for one soak cycle, no resource consumer); apply confirms no state
  movement.
- `cloudflare_workers_domain.console` shape, provider pin, and intent
  wiring untouched — Task 0083.1's apex live state is preserved.
- Legacy Pages projects deleted out-of-band and confirmed absent;
  reintroducing them would require either explicit Terraform code or
  another imperative wrangler create — neither is in flight.
- One latent provider concern unchanged from prior cycles: cloudflare
  v4.x line is on a deprecation glidepath toward v5, which renames the
  resource. Task 0085 addresses this; until then we remain on `~> 4.52`
  with no functional issue.

## Recommended Next Move

**Scope Task 0085** — bump the Cloudflare Terraform provider from
`~> 4.52` to `~> 5.x` and rename
`resource "cloudflare_workers_domain" "console"` →
`cloudflare_workers_custom_domain` in
`infra/terraform/cloudflare-domain/terraform/main.tf`. The rename will
require either a `moved {}` block or a `terraform state mv` so the two
live resources (stage id `052eaec…`, prod id `31e5f2e…`) preserve their
identity through the upgrade with a clean no-op apply. Task 0085 should
keep the same "post-merge soak proves the rename was non-destructive"
discipline that 0083.1 + 0084 just exercised — load `references/
post-merge-deploy-profile-gap.md` and require `Apply complete!
Resources: 0 added, 0 changed, 0 destroyed.` (or a documented `moved`
no-op) on both envs as the PASS gate.

If 0085 is judged too narrow to schedule next, an alternate focus is the
spec-pack sweep to remove every remaining Pages-era reference (now that
the soak is fully closed) — a low-risk housekeeping task with no infra
change.

## PR Number

**#131** — https://github.com/sourceplane/multi-tenant-saas/pull/131
(squash `305520a`, merged 2026-05-29).
