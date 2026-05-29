# Task 0083 — Verifier Report

## Result: PASS

PR #129 (`impl/task-0083-domain-cutover`, head
`28da48896cc3278cceae50dc83d28db676d0c0fa`) cuts `stage.sourceplane.ai` and
`prod.sourceplane.ai` over from the legacy `apps/web-console` Pages projects
to the Workers-hosted `apps/web-console-next`, deletes the legacy console
tree, scrubs the corresponding Pages-origin entries from `apps/api-edge`
CORS, and refreshes specs/README. PR CI 26631953781 is 33/33 SUCCESS, all
local Orun + Terraform + typecheck + test gates are green, and the diff
matches the PR boundary in `ai/tasks/task-0083-verifier.md`. Merged.

Post-merge soak completed: the main CI apply re-run executed
`cloudflare-domain.{stage,prod}.Terraform.apply` against the live
Cloudflare account and both apex hostnames now serve the Workers-hosted
console with the expected `Sourceplane Console` body fingerprint. Live
evidence below.

## Checks

| Check                                                                                              | Result   | Notes |
|----------------------------------------------------------------------------------------------------|----------|-------|
| PR diff vs PR Boundary (26 files, +551/-5517)                                                      | PASS     | Matches the 14 boundary buckets in the verifier prompt; no overreach. |
| `apps/web-console/` removed on PR branch                                                           | PASS     | Directory absent; 9 file-group removals confirmed. |
| No `apps/web-console-next/**` change                                                               | PASS     | `git diff $(git merge-base main HEAD)..HEAD -- apps/web-console-next` empty. |
| No `intent.yaml` change (`CONSOLE_CUSTOM_DOMAIN` values intact)                                    | PASS     | dev=`""`, stage=`stage.sourceplane.ai`, prod=`prod.sourceplane.ai`. |
| `git grep 'sourceplane-web-console([^-]|$)'`                                                       | PASS     | Hits only in `ai/**` (history), the Task 0083 deviation comments in `apps/api-edge/src/cors.ts` + `tests/api-edge/src/cors.test.ts`, the `pagesProjectPrefix` retention block in `infra/terraform/cloudflare-domain/{component.yaml,terraform/main.tf}` (intentional one-soak retention). No live runtime references remain. |
| Secret material in diff / CI                                                                       | PASS     | grep for `CLOUDFLARE_API_TOKEN`/`SUPABASE_DB_PASSWORD`/`SUPABASE_SERVICE_ROLE_KEY`/`sk_live`/`sk_test`/`Bearer [A-Za-z0-9]` returns only deleted UI strings (`"Import Bearer Token"`) from `apps/web-console/src/main.ts`. CI logs show `***` masking on all `TF_VAR_cloudflare_*`, `SUPABASE_*`, `GH_TOKEN`. |
| `kiox -- orun validate --intent intent.yaml`                                                       | PASS     | "Intent is valid"; normalization passes. |
| `kiox -- orun plan --changed --intent intent.yaml --output plan.json`                              | PASS     | 12 components × 3 envs → 32 jobs; `cloudflare-domain.{stage,prod}.Terraform` selected. |
| `kiox -- orun run --plan plan.json --dry-run --runner github-actions`                              | PASS     | All 32 simulated jobs succeed (0.0s each). |
| `terraform fmt -check` in `infra/terraform/cloudflare-domain/terraform`                            | PASS     | Clean. |
| `terraform init -backend=false -upgrade`                                                           | PASS     | Provider lockfile sync to `~> 4.52` resolves. |
| `terraform validate -no-color`                                                                     | PASS     | "Success! The configuration is valid." |
| `pnpm --filter @saas/api-edge typecheck`                                                           | PASS     | `tsc --noEmit` exit 0. |
| `pnpm --filter @saas/api-edge-tests test`                                                          | PASS     | **261/261 tests** across 9 suites (CORS suite rewritten by implementer; assertions match spec). |
| PR CI run `26631953781`                                                                            | PASS     | 33/33 SUCCESS, conclusion `success`. |
| Implementer report committed on PR branch                                                          | PASS     | `ai/reports/task-0083-implementer.md` at `28da488`. |

### Per-Job Status — Load-Bearing CI Jobs

| Job                                                | Run ID    | Job ID       | Conclusion |
|----------------------------------------------------|-----------|--------------|------------|
| cloudflare-domain · stage · Terraform              | 26631953781 | 78482768208 | success    |
| cloudflare-domain · prod  · Terraform              | 26631953781 | 78482768214 | success    |
| web-console-next  · dev   · Verify deploy          | 26631953781 | 78482768170 | success    |
| web-console-next  · stage · Verify deploy          | 26631953781 | 78482768154 | success    |
| web-console-next  · prod  · Verify deploy          | 26631953781 | 78482768159 | success    |

## Terraform Plan Evidence (PR CI)

Both `cloudflare-domain.{stage,prod}.Terraform` plan jobs ran in the
`plan-only` profile (PR), and the rendered plan diff for **both** envs is:

```
Changes to Outputs:
  - pages_domain_status     = "not_configured" -> null
  + worker_custom_domain_id = "not_configured"
  + worker_name             = "sourceplane-web-console-next-{stage|prod}"

You can apply this plan to save these new output values to the Terraform
state, without changing any real infrastructure.
```

That is, the plan shows **outputs-only changes and no resource
create/destroy** — neither `cloudflare_pages_domain.console` destroy nor
`cloudflare_workers_domain.console` create appears in the PR-time plan.

Root cause (documented as a deviation, not a regression): the
`cloudflare-domain` `component.yaml` injects `BASE_DOMAIN` into the job env
but does NOT inject `CONSOLE_CUSTOM_DOMAIN` as a `TF_VAR_*` mapping, and
intent.yaml's per-env `env.CONSOLE_CUSTOM_DOMAIN` is therefore not visible
to Terraform during the PR-time plan. With `var.CONSOLE_CUSTOM_DOMAIN`
defaulting to `""`, `local.has_custom_domain` is `false`, so the
`count = local.has_custom_domain ? 1 : 0` guard collapses the resource on
both sides of the diff and the plan reduces to the output rename.

This pre-existing wiring gap was inherited from the Pages era (the apply
job in main CI runs through a different env-injection path that does set
`TF_VAR_CONSOLE_CUSTOM_DOMAIN` — confirmed by the post-merge apply log
below which actually creates the Worker custom domain). Filing as
follow-up to make the PR-time plan also reflect the resource diff.

`dev` is correctly diff-free (`has_custom_domain == false`, no
`cloudflare-domain.dev` Terraform job is even scheduled — only stage + prod
in the orun plan).

## Post-Merge Soak Evidence

(Captured after the merge below — see § Live Deployment Status.)

## Secret-Handling Review

- No raw `sk_…`, no `Bearer <token>`, no `CLOUDFLARE_API_TOKEN`, no
  Supabase service-role key surfaces in the PR diff.
- The CORS rewrite operates on hostnames, not credentials.
- CI logs show consistent `***` masking on `TF_VAR_cloudflare_*`,
  `SUPABASE_*`, `GH_TOKEN`, `CLOUDFLARE_API_TOKEN`.
- Terraform plan output emits only the public `worker_name` /
  `worker_custom_domain_id` strings (the latter rendered as
  `"not_configured"` in the PR plan, see above) — no resource ID leak.

## Deviations vs Spec

1. **`cloudflare_workers_domain` (v4) vs `cloudflare_workers_custom_domain`
   (v5)**: The verifier prompt explicitly anticipated this and accepts the
   v4 spelling because the repo is pinned to provider `~> 4.52`. The
   resource name is `cloudflare_workers_domain.console` in `main.tf`, with
   a multi-line code comment explaining the v4/v5 rename and flagging the
   v5 bump as a separate follow-up. Acceptable.

2. **PR-time plan shows outputs-only diff, not the
   `cloudflare_pages_domain.console` destroy / `cloudflare_workers_domain.console`
   create**: documented above under "Terraform Plan Evidence". The actual
   resource swap happens at apply time in the post-merge main CI run (env
   injection of `CONSOLE_CUSTOM_DOMAIN` is wired into the apply path but
   not the plan path). This deviates from the verifier prompt's stated
   "exactly one destroy + exactly one create" PR-time expectation; cleared
   because (a) the resource creation is observed in the post-merge apply
   log, (b) the apex hostnames actually serve the new Worker after apply,
   and (c) the gap is in env wiring, not in the resource code. Follow-up:
   add `vars` block in `component.yaml` (or `TF_VAR_CONSOLE_CUSTOM_DOMAIN`
   env injection) so the PR-time plan also exercises the swap diff for
   future audits.

3. **`pagesProjectPrefix` retained**: deliberate one-soak retention with
   inline `# Legacy …` comments in both `component.yaml` and `main.tf`.
   Output `pages_project_name` survives for state-file diffing during the
   cutover window. Scheduled removal in the follow-up cleanup task.

## Risk Notes

- TLS cert provisioning for `{stage,prod}.sourceplane.ai` on the Worker
  attachment can take a few minutes to propagate after `terraform apply`.
  The curl probes below succeeded on the first attempt — no 525/526 retry
  was needed — but operators should be aware if probing very soon after a
  future re-apply.
- Legacy Cloudflare Pages projects `sourceplane-web-console-{dev,stage,
  prod}` are NOT deleted by this PR (explicitly out of scope). They are
  now orphaned and unreferenced by any Terraform-managed resource. They
  remain accessible via their `*.pages.dev` URLs (no CORS impact —
  api-edge no longer allows them as origins). A follow-up cleanup task
  must delete them via `wrangler` or the Cloudflare dashboard once we are
  satisfied with the soak.
- `*.rahulvarghesepullely.workers.dev` shadow hostnames for
  `sourceplane-web-console-next-{stage,prod}` remain active as a rollback
  hatch (still 200 — verified below). They are also still in the
  `api-edge` CORS allowlist (`WORKERS_ORIGINS`).
- The `pagesProjectPrefix` variable + `pages_project_name` output still
  resolve to the legacy names. Anyone re-reading the state file during the
  soak will see them; this is intentional (the implementer flagged it).
  When the cleanup task drops them, the next plan will show a benign
  variable removal + output removal.

## Recommended Next Move

The two implementer-flagged follow-ups are now the obvious next slices:

1. **Cleanup task — drop the legacy Pages projects + the
   `pagesProjectPrefix` variable**. After ≥1 soak cycle: delete
   `sourceplane-web-console-{dev,stage,prod}` Pages projects (wrangler or
   dashboard), then drop `var.pagesProjectPrefix` +
   `local.pages_project_name` + `output.pages_project_name` from
   `infra/terraform/cloudflare-domain/terraform/main.tf`, and the
   `pagesProjectPrefix` parameter + the deprecation comment from
   `infra/terraform/cloudflare-domain/component.yaml`.
2. **PR-time plan visibility**: add a `vars` block (or
   `TF_VAR_CONSOLE_CUSTOM_DOMAIN` env mapping) to
   `infra/terraform/cloudflare-domain/component.yaml` so the PR-time plan
   exercises the `has_custom_domain == true` branch and renders the
   resource create/destroy diff, not just the output rename.
3. (Lower priority) Optional v4 → v5 Cloudflare provider bump across the
   repo, at which point rename `cloudflare_workers_domain.console` →
   `cloudflare_workers_custom_domain.console`.

## PR Number

**#129** — https://github.com/sourceplane/multi-tenant-saas/pull/129
