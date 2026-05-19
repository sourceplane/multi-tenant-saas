# Task 0003 — Implementer Report

## Summary

Aligned `multi-tenant-saas` with the `aws-admin` Orun golden path: upgraded to
Orun v2.1.0, restructured environments to `dev`/`stage`/`prod` with promotion
chains, rewrote the Terraform composition to match `aws-admin`'s schema/profile
contract, migrated all components from `spec.inputs` to `spec.parameters`, and
updated CI to use `orun-action@v1.2.0` with conditional `--changed` planning.

## Files Changed

| File | Change |
| --- | --- |
| `kiox.yaml` | Orun v1.26.0 → v2.1.0 |
| `kiox.lock` | Regenerated for v2.1.0 |
| `.github/workflows/ci.yml` | orun-action@v1.2.0, conditional --changed, AWS env vars |
| `intent.yaml` | dir source, resolution bindings, dev/stage/prod with parameterDefaults.terraform, promotion chains |
| `stack-tectonic/stack.yaml` | Renamed, version bump, updated description |
| `stack-tectonic/compositions/terraform/schema.yaml` | inputs → parameters, added awsRegion/lane/namespace/etc fields |
| `stack-tectonic/compositions/terraform/composition.yaml` | Profiles: plan-only + apply (removed pull-request/verify/release) |
| `stack-tectonic/compositions/terraform/jobs/terraform-validate.yaml` | Added terraform.env, terraform.workspace capabilities; -chdir usage; S3 backend init; ORUN_ENV export |
| `stack-tectonic/compositions/terraform/profiles/terraform-plan-only.yaml` | New (replaces terraform-pull-request) |
| `stack-tectonic/compositions/terraform/profiles/terraform-apply.yaml` | New (replaces terraform-verify/release) |
| `stack-tectonic/compositions/terraform/profiles/terraform-pull-request.yaml` | Deleted |
| `stack-tectonic/compositions/terraform/profiles/terraform-verify.yaml` | Deleted |
| `stack-tectonic/compositions/terraform/profiles/terraform-release.yaml` | Deleted |
| `stack-tectonic/compositions/terraform/README.md` | Rewritten to aws-admin style |
| `stack-tectonic/compositions/turbo-package/schema.yaml` | inputs → parameters |
| `stack-tectonic/compositions/cloudflare-worker-turbo/schema.yaml` | inputs → parameters |
| `stack-tectonic/compositions/cloudflare-pages-turbo/schema.yaml` | inputs → parameters |
| `stack-tectonic/compositions/cloudflare-pages/schema.yaml` | inputs → parameters |
| `stack-tectonic/compositions/cloudflare-worker/schema.yaml` | inputs → parameters |
| `stack-tectonic/compositions/cloudflare-pages-terraform/schema.yaml` | inputs → parameters |
| `stack-tectonic/compositions/cloudflare-pages-turbo-terraform/schema.yaml` | inputs → parameters |
| `stack-tectonic/compositions/publish-stack/schema.yaml` | inputs → parameters |
| `infra/terraform/tf-state-r2/component.yaml` | spec.parameters, labels, plan-only/apply profiles, env hardening |
| `infra/terraform/tf-state-r2/README.md` | Rewritten to aws-admin style |
| `infra/terraform/core/component.yaml` | spec.parameters, labels, plan-only/apply profiles, env hardening, dependsOn |
| `infra/terraform/core/README.md` | Rewritten to aws-admin style |
| `packages/contracts/component.yaml` | inputs → parameters, staging/production → stage/prod |
| `packages/shared/component.yaml` | inputs → parameters, staging/production → stage/prod |
| `packages/testing/component.yaml` | inputs → parameters |
| `tests/contracts/component.yaml` | inputs → parameters |
| `apps/api-edge/component.yaml` | inputs → parameters, staging/production → stage/prod |
| `apps/web-console/component.yaml` | inputs → parameters, staging/production → stage/prod |
| `ai/context/current.md` | Updated to reflect post-0003 state |
| `ai/context/decisions.md` | Added dir-source and parameters decisions |
| `ai/context/open-risks.md` | Resolved drift risks, added S3 init risk |

## Orun Plan Impact

- 8 components × 3 environments → 20 jobs planned.
- Terraform components use `plan-only` profile on PRs, `apply` on push-main.
- Non-terraform components use existing profiles unchanged.
- DAG: `tf-state-r2` → `infra-terraform-core` dependency preserved.

## Checks Run

```
kiox -- orun validate --intent intent.yaml           ✓
kiox -- orun plan --changed --intent intent.yaml     ✓
kiox -- orun plan --intent intent.yaml --output plan.json  ✓ (20 jobs)
kiox -- orun run --plan plan.json --dry-run --runner github-actions  ✓
pnpm lint        ✓
pnpm typecheck   ✓
pnpm test        ✓
pnpm build       ✓
```

## Assumptions

- `kind: dir` composition source is correct for this repo since `stack-tectonic/`
  is committed locally and the OCI image (`saas-stack-tectonic:1.0.0`) may be
  stale relative to local changes.
- The `terraformDir: .` value for existing infra components is correct since
  `main.tf` lives at the component root, not in a `terraform/` subdirectory.
- Non-terraform component profile names (`quick-check`, `pull-request`) are
  assumed valid in their respective compositions and were not changed.
- S3 backend init will fail on live runs until IAM roles exist; this is
  acceptable for plan-only profile since `orun plan` compilation succeeds.

## Spec Proposals

None. The implementation follows existing specs without deviation.

## Remaining Gaps

- S3 backend init step will fail on actual CI runs until Task 0004 (IAM roles)
  and Task 0005 (S3 state migration) complete.
- The `tf-state-r2` component still targets Cloudflare R2. It should be
  decommissioned or replaced after S3 migration.
- Non-terraform composition job templates were not updated (out of scope).

## Next Task Dependencies

- **Task 0004** (`aws-admin`): Create `sourceplane/multi-tenant-saas` IAM
  component with plan + deploy roles.
- **Task 0005** (`multi-tenant-saas`): Wire S3 backend, consume IAM role,
  replace R2 state component.

## PR Number

[#25](https://github.com/sourceplane/multi-tenant-saas/pull/25)
