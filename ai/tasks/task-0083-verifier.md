# Task 0083 — Verifier

Agent: Verifier

## Current Repo Context

- Task 0083 Implementer is complete on branch
  `impl/task-0083-domain-cutover` (PR **#129**, head
  `28da48896cc3278cceae50dc83d28db676d0c0fa`). The PR cuts custom domains
  `stage.sourceplane.ai` and `prod.sourceplane.ai` over from the legacy
  `cloudflare_pages_domain` attachment on the vanilla `apps/web-console`
  Pages projects to a `cloudflare_workers_domain` attachment on the
  Workers-hosted `apps/web-console-next` (deployed via the new
  `cloudflare-workers-assets-turbo` composition introduced in Tasks
  0082.2 / 0082.2.1 / 0082.2.2 — PRs #126/#127/#128, all on `main`).
- `apps/web-console` directory is deleted in this PR (entire tree:
  `component.yaml`, `package.json`, `src/`, `index.html`, Vite config,
  built `dist/`, `node_modules/`, `tsconfig*`).
- Implementer report: `ai/reports/task-0083-implementer.md` (already on
  the PR branch as commit `28da488`).
- CI run for the PR head: `26631953781`. At handoff:
  `plan` SUCCESS; cloudflare-hyperdrive (stage+prod), policy-worker
  (dev+stage), billing-worker (dev) early greens; remaining
  `verify-deploy` jobs (including `web-console-next.{dev,stage,prod} ·
  Verify deploy`, `cloudflare-domain.{stage,prod} · Terraform`, and the
  api-edge / config / events / membership / projects / webhooks worker
  verify jobs) are still in `pending` and must be green before merge.

## Objective

Verify PR #129 against the Task 0083 spec, run quality gates, **merge
when green**, then perform the post-merge soak that proves the domain
swing actually landed and the apex hostnames are now served by the new
Workers. Close out the Pages → Workers + Static Assets migration begun
in Task 0082.

## PR Boundary (must match implementer)

The PR must change ONLY:

1. `infra/terraform/cloudflare-domain/terraform/main.tf` — Pages →
   Workers custom-domain resource swap, `workerNamePrefix` variable,
   provider pin bump (`~> 4.30` → `~> 4.52`), output rename
   (`pages_domain_status` → `worker_custom_domain_id`).
2. `infra/terraform/cloudflare-domain/terraform/.terraform.lock.hcl` —
   provider lockfile sync to `~> 4.52`.
3. `infra/terraform/cloudflare-domain/component.yaml` — adds
   `workerNamePrefix` parameter, flips `dependsOn.component` from
   `web-console` to `web-console-next`, keeps `pagesProjectPrefix` with
   a deprecation comment for one soak cycle.
4. `infra/terraform/cloudflare-domain/README.md` — rewritten
   Resources / Parameters / Outputs / Post-Merge Verification sections.
5. `infra/terraform/cloudflare-hyperdrive/README.md` — `apps/web-console`
   → `apps/web-console-next` reference fix only.
6. `apps/web-console/**` — entire tree deleted (9 file-group removals).
7. `apps/api-edge/src/cors.ts` — removes `sourceplane-web-console-
   {stage,prod}.pages.dev` PAGES_ORIGINS + the matching `PREVIEW_RE`;
   keeps the `*.rahulvarghesepullely.workers.dev` WORKERS_ORIGINS.
8. `tests/api-edge/src/cors.test.ts` — rewritten to assert the legacy
   Pages hostnames are now rejected and `*.workers.dev` shadow
   hostnames are accepted in their matching env. 261/261 expected.
9. `specs/components/12-web-console.md` — Deployment Model section
   rewritten for Workers + Static Assets + `cloudflare_workers_domain`.
10. `specs/components/01-edge-api.md` — CORS table reworked; cites
    Task 0083.
11. `specs/components/16-admin-support.md`, `specs/repo.md` —
    `apps/web-console` → `apps/web-console-next` and compositions table
    swap (`cloudflare-pages-turbo` → `cloudflare-workers-assets-turbo`
    for the console row).
12. `README.md` — `apps/web-console` → `apps/web-console-next`.
13. `pnpm-lock.yaml` — regenerated after `apps/web-console` removal;
    no other workspace deltas.
14. `ai/reports/task-0083-implementer.md` — new.

Out of scope (any of these = FAIL):

- Any change to `apps/web-console-next/**` (component.yaml, code,
  wrangler.jsonc, turbo.json, .gitignore).
- Any new orun composition.
- Any change to `intent.yaml` (`CONSOLE_CUSTOM_DOMAIN` values must
  stay `""`, `stage.sourceplane.ai`, `prod.sourceplane.ai`).
- Deletion of the legacy Cloudflare Pages projects themselves
  (`sourceplane-web-console-{dev,stage,prod}`) — soak follow-up.
- Adding a `deploy` profile rule for `dev` on `web-console-next`.
- Any worker/contract/db/policy/migration churn.

## Read First

- `ai/tasks/task-0083.md` (the implementer prompt)
- `ai/reports/task-0083-implementer.md`
- `agents/orchestrator.md` § Verifier Standard + § Verifier Merge
  Protocol (lines 349–392)
- `specs/components/12-web-console.md` (post-edit)
- `specs/components/01-edge-api.md` (post-edit)
- `infra/terraform/cloudflare-domain/terraform/main.tf` (post-edit)
- `infra/terraform/cloudflare-domain/component.yaml` (post-edit)

Skill: load `orun-saas-orchestration` reference
`references/post-merge-deploy-profile-gap.md` — this task is a
deploy-gated component, so PR-time green is necessary but not
sufficient.

## Required Outcomes

- [ ] Confirm PR #129 diff matches PR Boundary above; no overreach.
- [ ] PR CI run `26631953781` (or successor after any verifier-pushed
      fix) reaches 33/33 SUCCESS. `web-console-next ·
      {dev,stage,prod} · Verify deploy` and `cloudflare-domain ·
      {stage,prod} · Terraform` are the load-bearing jobs.
- [ ] Local Orun gates pass on the PR head:
      - `kiox -- orun validate --intent intent.yaml`
      - `kiox -- orun plan --changed --intent intent.yaml --output plan.json`
      - `kiox -- orun run --plan plan.json --dry-run --runner github-actions`
- [ ] Local Terraform gates pass in
      `infra/terraform/cloudflare-domain/terraform/`:
      - `terraform fmt -check`
      - `terraform init -backend=false -upgrade`
      - `terraform validate -no-color`
- [ ] Inspect the CI `plan` job log for `cloudflare-domain.stage` and
      `cloudflare-domain.prod` and confirm:
      - exactly one destroy (`cloudflare_pages_domain.console`) and
      - exactly one create (`cloudflare_workers_domain.console` —
        note: implementer used the v4 resource name
        `cloudflare_workers_domain`, NOT v5
        `cloudflare_workers_custom_domain`; task prompt named the v5
        spelling. The v4 name is acceptable; document the deviation in
        the verifier report).
      - `dev` shows no diff (still `has_custom_domain == false`).
- [ ] `git grep -nE 'sourceplane-web-console([^-]|$)'` returns hits
      only inside `ai/reports/**`, `ai/tasks/**`,
      `stack-tectonic/compositions/cloudflare-pages-turbo/tests/**`,
      `referance/figma/**`, and the deliberate Task 0083 header
      comments in `apps/api-edge/src/cors.ts` and
      `tests/api-edge/src/cors.test.ts`. No live runtime references.
- [ ] `apps/web-console/` does not exist on the PR branch.
- [ ] No secret material in diff, plan output, or CI logs (grep for
      `CLOUDFLARE_API_TOKEN`, `SUPABASE_DB_PASSWORD`,
      `SUPABASE_SERVICE_ROLE_KEY`, `sk_`, bearer headers).

## Verifier Merge Decision

- If all of the above PASS and PR CI is 33/33 green → **merge**
  PR #129 (squash), then run the **Post-Merge Soak** below.
- If any check fails OR CI has any FAILURE → leave PR #129 OPEN with
  a clear blocker list in the verifier report. Do not merge.

## Post-Merge Soak (mandatory; cannot PASS without it)

Per the `post-merge-deploy-profile-gap` skill: this PR's deploy +
domain attachment runs ONLY on the post-merge `main` CI run (`deploy`
profile / `triggerRef: github-push-main`). Verifier must:

1. After merge, watch the post-merge main CI run that includes
   `cloudflare-domain · {stage,prod} · Terraform · apply` jobs. Wait
   for it to complete green.
2. Confirm Terraform apply logs show
   `cloudflare_workers_domain.console: Creation complete` on both
   stage and prod (and the matching Pages-domain destroy on both).
3. Curl probes (with `-sf`, follow redirects):
   - `curl -sfL https://stage.sourceplane.ai/` → 200, body contains
     `Sourceplane Console`.
   - `curl -sfL https://prod.sourceplane.ai/` → 200, body contains
     `Sourceplane Console`.
   - (If TLS cert provisioning is still mid-flight Cloudflare may
     briefly return 525/526 — wait one cycle, retry once before
     reporting.)
4. CORS preflight sanity (one env):
   `curl -sI -X OPTIONS https://api.stage.sourceplane.ai/v1/auth/profile
    -H "Origin: https://stage.sourceplane.ai"
    -H "Access-Control-Request-Method: GET"`
   must return `access-control-allow-origin: https://stage.sourceplane.ai`.
5. Confirm `*.rahulvarghesepullely.workers.dev` shadow hostnames for
   `sourceplane-web-console-next-{stage,prod}` still serve 200 — they
   are the rollback hatch.

If any soak probe fails after one retry, the verifier report stays
PASS for the merge only if Terraform apply itself succeeded AND the
failure is documented as a Cloudflare propagation timing issue with a
follow-up task to re-probe within 24h. Anything stronger (apply
failure, 4xx/5xx that persists past one retry, missing CORS header)
means **roll back the merge commit** per the implementer's rollback
plan and leave a verifier report documenting the rollback.

## Verifier Cleanup On The PR Branch (allowed)

The verifier MAY push small focused commits on the PR branch before
merge for any of:

- adding the missing verifier report file at
  `ai/reports/task-0083-verifier.md` (always);
- fixing a stray legacy `sourceplane-web-console` reference in
  `apps/**` / `infra/**` / `specs/**` that should have been swept in
  the implementer's grep pass;
- a CORS test correction if the rewritten suite has a real bug.

Verifier MUST NOT push:

- any `apps/web-console-next/**` change;
- any spec or component restructuring beyond the implementer's intent;
- a v4 → v5 cloudflare provider migration (that's a follow-up task).

## Reporting

Write `ai/reports/task-0083-verifier.md` covering, in order:

- `Result: PASS` or `Result: FAIL`
- Checks (each local gate + CI run ID + per-job status table for
  `cloudflare-domain.{stage,prod}.Terraform` and
  `web-console-next.{dev,stage,prod}.Verify deploy`)
- Terraform plan/apply evidence (resource-diff snippets, env tier)
- Post-merge soak evidence (curl status + body fingerprint for both
  apex hostnames, CORS preflight response)
- Rollback hatch evidence (`*.workers.dev` shadow hostnames still 200)
- Secret-handling review
- Deviations vs. spec (most importantly the
  `cloudflare_workers_domain` vs. `cloudflare_workers_custom_domain`
  naming)
- Risk Notes (TLS cert provisioning timing, legacy Pages projects
  still alive, `pagesProjectPrefix` deprecation soak)
- Recommended Next Move (the two implementer-flagged follow-ups:
  drop `pagesProjectPrefix` after soak; optional v5 provider bump)

After PASS + merge, sync local `main` per the Verifier Merge
Protocol (`git checkout main && git pull --ff-only origin main`),
leave `git status --short` empty, and update orchestration state:

- Append `0083` to `completed` in `ai/state.json`, advance
  `current_task` to `"0084"` and `task_agent` to
  `"ai/tasks/task-0083-verifier.md"`, set `repo_health` to `"green"`,
  refresh `last_verified`, and rewrite `notes` for the merge.
- Append the Task 0083 entry to `ai/context/task-ledger.md`.
- Refresh `ai/context/current.md` to reflect Task 0083 PASS+merge
  and to pose the orchestrator's next-task question (likely:
  cleanup task to delete legacy Pages projects + drop
  `pagesProjectPrefix`, vs. starting the next billing/UX roadmap
  slice).
- Reset `ai/waiting_for_input.md` to "no input requested".

Commit those state updates to `main` directly as a single
`chore(orchestration): close out task 0083 ...` commit and push.
