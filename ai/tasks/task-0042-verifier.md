# Task 0042 — Verifier

## Agent

Verifier

## Current Repo Context

Task 0041 is verified and live: the web console now deploys as separate
environment-specific Cloudflare Pages projects:

- `sourceplane-web-console-stage`
- `sourceplane-web-console-prod`

Task 0042's implementer PR is open:

- PR: #85
- URL: https://github.com/sourceplane/multi-tenant-saas/pull/85
- Branch: `codex/task-0042-cloudflare-custom-domains`
- Head SHA: `fedc3047a34bde185a5b5ce74508774cf1fa5ffc`
- Status at verifier handoff: OPEN, MERGEABLE, all 22 PR checks SUCCESS
- PR CI run: `26501416473`

The PR adds intent-driven Cloudflare custom-domain support, a new
`cloudflare-domain` component type, a concrete `infra/terraform/cloudflare-domain`
component, api-edge CORS updates, and custom-domain docs/spec updates.

## Objective

Verify that PR #85 correctly implements Task 0042 and is safe to merge. This is
an infrastructure-facing PR with live Cloudflare effects after merge, so verify
code, Orun plan behavior, Terraform/provider correctness, CI logs, secret
handling, and post-merge live state before reporting PASS.

## Read First

- `ai/tasks/task-0042.md`
- `ai/reports/task-0042-implementer.md`
- PR #85 diff
- `agents/orchestrator.md`
- `specs/orun-golden-path.md`
- `specs/access-and-infra.md`
- `intent.yaml`
- `apps/api-edge/src/cors.ts`
- `apps/api-edge/wrangler.jsonc`
- `infra/terraform/cloudflare-domain/**`
- `stack-tectonic/compositions/cloudflare-domain/**`
- `specs/components/01-edge-api.md`
- `specs/components/12-web-console.md`

Also check current official Cloudflare references before judging resource/API
behavior:

- https://developers.cloudflare.com/pages/configuration/custom-domains/
- https://developers.cloudflare.com/api/resources/pages/
- https://developers.cloudflare.com/api/terraform/resources/pages/
- https://developers.cloudflare.com/api/terraform/resources/zones/
- https://developers.cloudflare.com/workers/configuration/routing/custom-domains/

## Required Outcomes

- [ ] Verify PR #85 matches Task 0042 scope and does not include unrelated work.
- [ ] Confirm `intent.yaml` is the true source of truth for:
  - `sourceplane.ai`
  - `stage.sourceplane.ai`
  - `prod.sourceplane.ai`
- [ ] Confirm another context can change the base/custom domains without
  editing application source. Watch for duplicate literals in component
  parameters that can drift from `intent.yaml`.
- [ ] Verify the new `cloudflare-domain` composition is Orun-native: schema,
  profiles, job template, fixture/docs, plan-only in PR, apply only on
  `github-push-main`.
- [ ] Verify the Terraform module supports explicit existing-zone/adopt and
  managed-zone/create modes without trying to duplicate `sourceplane.ai`.
- [ ] Verify the Pages custom-domain attachment is correct for:
  - `stage.sourceplane.ai` -> `sourceplane-web-console-stage`
  - `prod.sourceplane.ai` -> `sourceplane-web-console-prod`
- [ ] Verify the PR either implements the Task 0042 typed optional Worker
  custom-domain contract or clearly fails that acceptance item. Do not accept
  "Workers deferred" if it contradicts the task prompt.
- [ ] Confirm bounded-context Workers are not given new public custom domains.
- [ ] Verify api-edge CORS allows only the matching custom console origin,
  matching Pages URL/preview origins, and local dev origins.
- [ ] Verify cross-environment custom-domain CORS requests are denied.
- [ ] Confirm no secrets, Cloudflare tokens, Terraform state contents, or
  generated credentials appear in source, logs, reports, or commit messages.

## High-Risk Review Targets

Pay special attention to these possible acceptance risks:

1. `intent.yaml` versus component literals:
   The implementer report says domains are intent-driven. Confirm
   `baseDomain` and custom hostnames are not maintained in two independent
   places that can drift.

2. Worker custom-domain support:
   Task 0042 required typed optional Worker support for public Workers such as
   `api-edge`. The file list at handoff does not show changes to
   `cloudflare-worker-turbo`; verify whether the requirement is actually met.

3. Cloudflare Terraform resource schema:
   Validate the exact provider version locked in the PR and the actual
   supported fields for `cloudflare_pages_domain`, `cloudflare_zone`, and
   `data.cloudflare_zone`. Do not rely only on memory or stale examples.

4. Pages domain DNS behavior:
   Confirm whether `cloudflare_pages_domain` alone manages the required DNS
   record for a zone already hosted in Cloudflare, or whether an explicit DNS
   record is required for reliable activation.

5. Apply credentials and profiles:
   Confirm the `apply` profile runs only for `github-push-main`, and that the
   role/token path is acceptable for live Cloudflare mutations and S3 backend
   state access.

## Required Checks

Run locally on the PR branch when possible and record exact results:

- `pnpm --filter @saas/api-edge-tests test`
- any focused web-console/domain checks affected by the PR
- composition/schema fixture checks for `cloudflare-domain`
- `kiox -- orun validate --intent intent.yaml`
- `kiox -- orun plan --changed --intent intent.yaml`
- `kiox -- orun plan --intent intent.yaml --view dag`
- `kiox -- orun run --plan plan.json --dry-run --runner github-actions`
- `terraform -chdir=infra/terraform/cloudflare-domain/terraform fmt -check`
- `terraform -chdir=infra/terraform/cloudflare-domain/terraform validate`

Inspect GitHub PR CI logs for run `26501416473`, especially:

- `cloudflare-domain · stage · Cloudflare domain`
- `cloudflare-domain · prod · Cloudflare domain`
- `api-edge-tests · dev · Verify`
- `api-edge · stage · Verify deploy`
- `api-edge · prod · Verify deploy`

Do not rely only on green check summaries. Confirm the expected commands ran and
that no secrets were printed.

## Merge And Live Verification

Merge PR #85 only if verification passes. After merge:

1. Inspect the main-branch CI run for the merge commit.
2. Confirm `cloudflare-domain` stage/prod jobs applied successfully on
   `github-push-main`.
3. Verify live custom domains:
   - `https://stage.sourceplane.ai/` serves Sourceplane Console.
   - `https://prod.sourceplane.ai/` serves Sourceplane Console.
4. Verify stage/prod API health still works.
5. Verify CORS from custom domains:
   - stage custom domain -> stage API allowed
   - stage custom domain -> prod API denied
   - prod custom domain -> prod API allowed
   - prod custom domain -> stage API denied
6. If DNS or certificate activation is pending, record the exact observed
   Cloudflare status and leave the task FAIL or pending rather than guessing.

## Non-Goals

- Do not implement additional custom-domain behavior in the verifier unless it
  is required to fix a Task 0042 blocker.
- Do not expose bounded-context Workers publicly.
- Do not delete any legacy or environment-specific `*.pages.dev` project/URL.
- Do not add `dev` live domain provisioning.
- Do not work on deferred identity security-event implementation.
- Do not read or apply `specs-v2/**`.

## Acceptance Criteria

- PR #85 satisfies every Task 0042 acceptance item or remains open with clear
  blockers.
- All local checks and PR CI pass.
- Orun plan/DAG proves `cloudflare-domain` is plan-only in PR and apply-only on
  main push.
- Terraform provider/resource usage is correct for the locked provider version.
- `intent.yaml` owns the current domain config without unsafe drift.
- CORS tests cover custom-domain and cross-environment denial behavior.
- No new public custom domains are attached to bounded-context Workers.
- Post-merge main CI applies the domain component successfully.
- Live custom domains and CORS behavior are independently verified.
- Verifier report is written and committed to the PR branch if fixes/report
  updates are needed before merge.

## Report

Write `ai/reports/task-0042-verifier.md` with:

- Result: PASS or FAIL
- Summary
- PR/CI Evidence
- Checks Run
- Code/Infra Review Notes
- Cloudflare State Observed
- Live Verification
- Secret Handling Review
- Issues Found
- Remaining Risks
- Recommended Next Move
