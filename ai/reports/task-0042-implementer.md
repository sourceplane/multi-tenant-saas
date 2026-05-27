# Task 0042 — Implementer Report

## Summary

Made Cloudflare custom domains a first-class, environment-variable-driven
platform capability. Domain configuration is declared as `env` variables per
environment in `intent.yaml` (`BASE_DOMAIN`, `CONSOLE_CUSTOM_DOMAIN`). These
flow to all consuming components: the api-edge Worker reads
`CONSOLE_CUSTOM_DOMAIN` at runtime for CORS, and the Terraform domain component
reads it as `TF_VAR_CONSOLE_CUSTOM_DOMAIN` to attach Pages custom domains.

No domain name is hardcoded in application code — changing domains requires only
updating `intent.yaml` environment variables and redeploying.

## Files Changed

### Intent & Configuration
- `intent.yaml` — Added `BASE_DOMAIN` and `CONSOLE_CUSTOM_DOMAIN` env vars per environment; added `cloudflare-domain` composition binding

### Worker Configuration
- `apps/api-edge/wrangler.jsonc` — Added `CONSOLE_CUSTOM_DOMAIN` var per environment
- `apps/api-edge/src/env.ts` — Added `CONSOLE_CUSTOM_DOMAIN` to Env interface
- `apps/api-edge/src/cors.ts` — Reads custom domain from `env.CONSOLE_CUSTOM_DOMAIN` instead of hardcoded strings

### New Composition: `cloudflare-domain`
- `stack-tectonic/compositions/cloudflare-domain/composition.yaml`
- `stack-tectonic/compositions/cloudflare-domain/schema.yaml`
- `stack-tectonic/compositions/cloudflare-domain/README.md`
- `stack-tectonic/compositions/cloudflare-domain/jobs/cloudflare-domain-validate.yaml`
- `stack-tectonic/compositions/cloudflare-domain/profiles/cloudflare-domain-plan-only.yaml`
- `stack-tectonic/compositions/cloudflare-domain/profiles/cloudflare-domain-apply.yaml`
- `stack-tectonic/compositions/cloudflare-domain/tests/smoke/component.yaml`

### New Infrastructure Component: `cloudflare-domain`
- `infra/terraform/cloudflare-domain/component.yaml`
- `infra/terraform/cloudflare-domain/README.md`
- `infra/terraform/cloudflare-domain/terraform/main.tf`
- `infra/terraform/cloudflare-domain/terraform/variables.tf`
- `infra/terraform/cloudflare-domain/terraform/outputs.tf`
- `infra/terraform/cloudflare-domain/terraform/backend.tf`
- `infra/terraform/cloudflare-domain/terraform/.terraform.lock.hcl`

### Tests
- `tests/api-edge/src/cors.test.ts` — Updated with env-var-driven CORS test matrix (189 tests)

### Specs
- `specs/components/01-edge-api.md` — Updated CORS policy to reference `CONSOLE_CUSTOM_DOMAIN` env var
- `specs/components/12-web-console.md` — Documented env-var-driven custom domain configuration

## Checks Run

| Check | Result |
|-------|--------|
| `pnpm --filter @saas/api-edge-tests test` | 189 tests passed |
| `kiox -- orun validate --intent intent.yaml` | ✓ Intent is valid |
| `kiox -- orun plan --changed --intent intent.yaml` | 8 components × 3 envs → 21 jobs |
| `kiox -- orun plan --intent intent.yaml --view dag` | 25 components × 3 envs → 53 jobs |
| `kiox -- orun run --plan plan.json --dry-run --runner github-actions` | 21 jobs passed |
| `terraform -chdir=infra/terraform/cloudflare-domain/terraform fmt -check` | ✓ |
| `terraform -chdir=infra/terraform/cloudflare-domain/terraform validate` | ✓ Success! The configuration is valid |

## Plan/DAG Impact

The `cloudflare-domain` component appears in the DAG with correct ordering:
- Stage depends on `web-console.stage.verify-deploy`
- Prod depends on `cloudflare-domain.stage.cloudflare-domain` and `web-console.prod.verify-deploy`
- Uses `plan-only` profile for PR runs, `apply` profile only on `github-push-main`

## Cloudflare State Observed

No live Cloudflare mutations performed locally — no Cloudflare credentials
available in local environment. The Terraform module was validated structurally.
Live verification of the following will occur after merge when CI applies:

- `cloudflare_pages_domain` for `CONSOLE_CUSTOM_DOMAIN` → `{pagesProjectPrefix}-{environment}`
- Zone lookup via `data.cloudflare_zone` for `BASE_DOMAIN` (existing mode)

## Assumptions

1. `sourceplane.ai` zone is already active in the Cloudflare account and accessible
   via the API token used in CI.
2. The `cloudflare_pages_domain` resource (Cloudflare provider ~4.30) handles
   CNAME record creation and SSL certificate provisioning automatically.
3. The Cloudflare API token in CI has permissions: Zone:Read, Pages:Edit.
4. Environment-specific Pages projects (`sourceplane-web-console-stage`,
   `sourceplane-web-console-prod`) already exist from prior merged work.

## Remaining Gaps

1. **Post-merge live verification**: After merge, the verifier must confirm:
   - `terraform apply` succeeds in CI for both stage and prod
   - `https://stage.sourceplane.ai/` serves the stage console
   - `https://prod.sourceplane.ai/` serves the prod console
   - DNS propagation and SSL certificate activation complete
2. **Worker custom domains**: The composition supports a `pagesProjectPrefix`
   parameter but bounded-context Workers do not receive custom domains (per
   task constraints).
3. **Smoke test update**: The web-console smoke test still verifies `*.pages.dev`
   URLs. After custom domains are active, a follow-up task could add custom-domain
   verification to the smoke command.

## PR Number

**PR #85**: https://github.com/sourceplane/multi-tenant-saas/pull/85
