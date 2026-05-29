# Task 0083 — Implementer Report

**Branch**: `impl/task-0083-domain-cutover`
**Goal**: Cut the production/stage custom domains (`stage.sourceplane.ai`,
`prod.sourceplane.ai`) over from the Pages-hosted `apps/web-console` to the
Workers-hosted `apps/web-console-next`, delete the legacy app, clean up CORS
and specs, and ship as a single PR with a soak-cycle follow-up.

---

## Summary

This task closes the loop on the Pages → Workers + Static Assets migration
the web-console-next track has been building toward. Until now `web-console`
(Pages) was the production-facing app and `web-console-next` (Workers +
Static Assets) deployed only to its `*.workers.dev` shadow hostname. This PR:

1. Repoints the `cloudflare-domain` Terraform component from a
   `cloudflare_pages_domain` resource bound to the Pages project to a
   `cloudflare_workers_domain` resource bound to the `web-console-next`
   Worker, for both `stage` and `prod` environments.
2. Deletes `apps/web-console/` (and removes its lockfile / specs / README
   references repo-wide).
3. Removes the Pages origin entries from `apps/api-edge/src/cors.ts` so
   stage/prod no longer trust the deprecated Pages hostnames; tests rewritten
   accordingly.
4. Updates specs (`12-web-console.md`, `01-edge-api.md`, `16-admin-support.md`,
   `repo.md`) and READMEs to describe the new deployment model.

The legacy `pagesProjectPrefix` Terraform variable / `pages_project_name`
output are intentionally retained (read-only, unused by any resource) for one
soak cycle so the first post-merge `terraform plan` diff is easy to read.
They're scheduled for removal as a follow-up task once stage+prod have
applied cleanly.

### Key metrics

- 25 files changed: +330 / −5,517
- 9 files deleted (entire `apps/web-console/` tree)
- 1 Terraform resource swapped (Pages domain → Workers custom domain)
- 1 provider version bump (`~> 4.30` → `~> 4.52`)
- CORS test suite: 261/261 pass

---

## Implementation Details

### Terraform — `infra/terraform/cloudflare-domain`

- `terraform/main.tf`
  - Bumped Cloudflare provider constraint `~> 4.30` → `~> 4.52` (installed
    4.52.7 already; the `cloudflare_workers_domain` resource lives there).
  - Added `variable "workerNamePrefix"` (default
    `sourceplane-web-console-next`). Local `worker_name =
    "${var.workerNamePrefix}-${var.environment}"`.
  - Replaced `resource "cloudflare_pages_domain" "console"` with
    `resource "cloudflare_workers_domain" "console"` (account_id, zone_id,
    hostname = `local.console_custom_domain`, service = `local.worker_name`,
    environment = `"production"` — only valid value for Workers custom
    domains).
  - Kept `variable "pagesProjectPrefix"` and `local.pages_project_name` /
    `output "pages_project_name"` marked legacy/read-only with comments. No
    resource consumes them. Removal scheduled as follow-up.
  - Removed `output "pages_domain_status"`; added
    `output "worker_custom_domain_id"`.
  - Inline comment documents the v4 vs v5 resource-name distinction
    (`cloudflare_workers_domain` is v4; v5 renamed it to
    `cloudflare_workers_custom_domain` — not migrating in this PR).
- `terraform/.terraform.lock.hcl`: provider constraint bumped to `~> 4.52`.
- `component.yaml`: added `workerNamePrefix` parameter,
  `dependsOn.component: web-console` → `web-console-next`, kept
  `pagesProjectPrefix` with deprecation comment.
- `README.md`: rewritten Resources / Parameters / Outputs / Post-Merge
  Verification sections to describe `cloudflare_workers_domain` +
  `workerNamePrefix`, with `pagesProjectPrefix` marked legacy.

### `apps/web-console` deletion

Entire tree removed: `component.yaml`, `dist/`, `eslint.config.js`,
`index.html`, `node_modules/`, `package.json`, `src/`, `tsconfig.json`,
`tsconfig.tsbuildinfo`, `vite.config.ts`. `pnpm install` regenerated the
lockfile cleanly (no remaining `apps/web-console:` workspace entry).

### CORS — `apps/api-edge/src/cors.ts`

Removed both stage- and prod-branch entries of `PAGES_ORIGINS` and
`PREVIEW_RE` (the literal `sourceplane-web-console-{stage,prod}.pages.dev`
hostnames plus the preview regex). `WORKERS_ORIGINS` (the
`*.rahulvarghesepullely.workers.dev` shadow hostnames for
`web-console-next`) retained. Header comment explains the Task 0083 removal.

### Tests — `tests/api-edge/src/cors.test.ts`

Full rewrite (`write_file`, not patch — too many small flips across stage /
prod / fallback describe blocks). Legacy Pages hostnames are now asserted
`false` (rejected); `*.workers.dev` shadow hostnames asserted `true` only in
the matching env. All 261 tests across 9 suites pass.

### Specs & docs

- `specs/components/12-web-console.md`: `Primary monorepo targets`,
  `Cloudflare primitives`, `Agent Freedom` Next.js line, and the entire
  `Deployment Model` section rewritten for Workers + Static Assets +
  `cloudflare_workers_domain`. Historical-note footer added.
- `specs/components/01-edge-api.md`: CORS table reworked — Pages allowlist
  rows replaced with custom-domain + `*.workers.dev` shadow hostname; added
  paragraph citing Task 0083.
- `specs/components/16-admin-support.md`, `specs/repo.md`, `README.md`,
  `infra/terraform/cloudflare-hyperdrive/README.md`: `apps/web-console` →
  `apps/web-console-next`; `specs/repo.md` compositions table reworked
  (added `cloudflare-workers-assets-turbo`, dropped `cloudflare-pages-turbo`
  for the console).

---

## Validation Results

| Gate | Command | Result |
|------|---------|--------|
| Terraform fmt | `terraform fmt` in `infra/terraform/cloudflare-domain/terraform/` | clean |
| Terraform init | `terraform init -backend=false -upgrade` | provider 4.52.7 installed |
| Terraform validate | `terraform validate` | `Success! The configuration is valid.` |
| Orun intent | `kiox exec -- orun validate` | `✓ Intent is valid` / `✓ All validation passed` |
| Orun plan (stage) | `kiox exec -- orun plan --intent intent.yaml --env stage` | 20 components × 1 env → 20 jobs, plan `9952de9ac395` |
| Pnpm install | `pnpm install` | up to date; `apps/web-console:` removed from lockfile |
| Unit tests | `pnpm -F @saas/api-edge-tests test` | 9 suites, 261/261 pass |

Repo-wide grep for stray `web-console` (non-`-next`) references is now clean
for application/spec/infra surfaces. Remaining hits are all intentional or
out-of-scope:

- `referance/figma/...` — Figma reference scaffold, separate concern.
- `pnpm-lock.yaml:?` — no legacy workspace entry; `apps/web-console-next`
  only.
- `stack-tectonic/compositions/cloudflare-pages-turbo/tests/smoke/...` —
  composition test fixtures, intentionally illustrate `cloudflare-pages-turbo`
  with a fake `example/web-console` workspace; not a runtime reference.
- `apps/api-edge/src/cors.ts` and `tests/api-edge/src/cors.test.ts` — header
  comments citing Task 0083 deliberately mention the legacy app by name.
- `specs/components/12-web-console.md` historical-note footer (same).

---

## Deviations / Decisions

1. **Provider stayed on v4 (`~> 4.52`)** rather than jumping to v5. The v4
   resource name is `cloudflare_workers_domain`; v5 renamed it to
   `cloudflare_workers_custom_domain`. Sticking to v4 keeps blast radius to
   one Terraform resource swap. Documented inline in `main.tf`.
   - Verified the v4 resource name by `strings`-grepping the installed
     provider binary because `terraform providers schema` needed a real init
     (backend present); the binary inspection was faster.
2. **`pagesProjectPrefix` and `pages_project_name` kept read-only** for one
   soak cycle. No resource consumes them, so the first `terraform plan` on
   `main` shows a clean diff (one resource destroy + one resource create).
   Scheduled removal as a follow-up.
3. **CORS Pages origins removed entirely** rather than left in as a
   transitional allowlist. The legacy app no longer exists, so any request
   originating from those hostnames is invalid by definition.
4. **`environment = "production"`** on `cloudflare_workers_domain`. This is
   the only valid value for Workers custom domains (per provider schema).
5. **Tests rewritten via `write_file`** rather than incremental patches due
   to the volume of small flips across stage/prod/fallback describe blocks.

---

## Soak Plan / Follow-Ups

1. **Soak monitoring (verifier)**
   - After merge → `github-push-main` runs `terraform apply` for
     `cloudflare-domain` in both stage and prod.
   - Verifier should confirm Cloudflare dashboard → Workers →
     `sourceplane-web-console-next-{stage,prod}` → Triggers → Custom Domains
     shows both hostnames `active`.
   - Curl probes:
     - `curl -i https://stage.sourceplane.ai/` → 200, served by Workers.
     - `curl -i https://prod.sourceplane.ai/` → 200, served by Workers.
     - CORS preflight: `curl -i -X OPTIONS https://api.stage.sourceplane.ai/<path> -H "Origin: https://stage.sourceplane.ai" -H "Access-Control-Request-Method: POST"` → 204 with
       `access-control-allow-origin: https://stage.sourceplane.ai`.
2. **Follow-up task**: drop `pagesProjectPrefix` variable + `pages_project_name`
   output from `cloudflare-domain` once stage+prod have soaked for one cycle.
3. **Follow-up task** (optional): bump Cloudflare TF provider to v5 and
   rename the resource to `cloudflare_workers_custom_domain` for forward
   compatibility.

---

## No Secrets Logged

- [x] No tokens in code (CONSOLE_CUSTOM_DOMAIN sourced from `intent.yaml`
      env-level `env:` → `wrangler.jsonc` / `TF_VAR_*`).
- [x] No secrets in Terraform outputs.
- [x] CORS allowlist is exact-match per env; no wildcards.
- [x] `Vary: Origin` semantics preserved (unchanged in `cors.ts`).

---

## Open Questions for Verifier

1. Should we remove `pagesProjectPrefix` immediately on a follow-up PR (one
   cycle of soak) or hold it for two apply cycles?
2. Is there appetite for the v4 → v5 provider bump as a separate follow-up,
   or is the v4 `cloudflare_workers_domain` resource acceptable long-term?
3. Any other consumers of the legacy `*.pages.dev` console hostnames
   (analytics, OAuth redirect URIs, external monitors) that we should
   audit before the Pages projects themselves are deleted?

---

## References

- Task spec: `ai/tasks/task-0083.md`
- Spec updates: `specs/components/12-web-console.md`,
  `specs/components/01-edge-api.md`, `specs/repo.md`
- Terraform: `infra/terraform/cloudflare-domain/terraform/main.tf`,
  `infra/terraform/cloudflare-domain/component.yaml`,
  `infra/terraform/cloudflare-domain/README.md`
- CORS: `apps/api-edge/src/cors.ts`, `tests/api-edge/src/cors.test.ts`
- Plan: `.orun/plans/9952de9ac395.json` (local)
- Related skills: `orun-saas-implementer`,
  `frontend-hostname-cutover-checklist`
