# Task ID

Task 0010 Verifier

# Agent

Verifier

# Current Repo Context

The reusable SaaS starter spec pack under `specs/**` is authoritative for this
verification. `specs-v2/**` is out of scope.

Task 0010 implementation is open as PR #47:

- URL: https://github.com/sourceplane/multi-tenant-saas/pull/47
- Branch: `codex/task-0010-api-edge-hyperdrive-binding`
- Head commit observed when this verifier prompt was written:
  `4c75289763fb61878ce09e057963258143fa4fbb`
- Base: `main` at `0c585fce606fec9ae48752eda9c55ddb7fc158cb`
- Current PR state: open, merge state clean
- Latest observed PR CI run: `26327010527`, all visible checks passed

Important repo reality:

- Task 0009.1 is complete. Active specs and compact context reference Orun
  `v2.3.0` as the verified runtime baseline.
- Task 0009 is verified PASS. Hyperdrive resources exist:
  - stage: `08f7c6055f544a3890a585d88fd92348`
    (`stg-multi-tenant-saas-stage`)
  - prod: `ab2c21c2db6245a59c91588fcac7107a`
    (`prod-multi-tenant-saas-prod`)
- PR #47 began as `apps/api-edge` Hyperdrive binding setup, but the current PR
  also refactors all Cloudflare Worker/Pages compositions and changes
  `apps/web-console`.
- PR #47 currently includes `combined.md`, a generated aggregate artifact. The
  original Task 0010 explicitly banned generated aggregate artifacts. Treat this
  as a serious scope issue unless it is removed before merge.
- The user explicitly requested that this verifier ensure the PR is verified,
  merged only when safe, and that the merge pipeline deploys the expected
  Cloudflare resources. The verifier must also use local Wrangler CLI checks to
  inspect the created resources and confirm environment boundaries.

# Objective

Independently verify PR #47 against Task 0010 and the user's deployment
verification addendum.

If PR #47 is production-safe after any required Task 0010-scoped fixes, merge
it, wait for the `main` merge pipeline, verify deployed Cloudflare resources
with local Wrangler CLI, confirm environment boundaries, sync local `main`, and
write a PASS report.

If it fails, leave the PR open, do not merge, and write a FAIL report with
concrete blockers.

# PR Boundary

This verifier task covers PR #47 only.

Allowed verifier changes are limited to:

- the Task 0010 verifier report at `ai/reports/task-0010-verifier.md`;
- small, strictly Task 0010-scoped fixes needed to make PR #47 safe to merge;
- removing generated/out-of-scope artifacts from PR #47;
- compact orchestration context/state updates that record the verification
  outcome after the verification is complete.

Do not start Task 0011. Do not add domain runtime/database adapter behavior.
Do not provision new Supabase, AWS, S3, Secrets Manager, or Terraform-managed
resources outside the PR's Cloudflare Worker/Pages deployment path.

# Read First

- `agents/orchestrator.md`
- `ai/tasks/task-0010.md`
- `ai/reports/task-0010-implementer.md`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `ai/state.json`
- `specs/constitution.md`
- `specs/repo.md`
- `specs/access-and-infra.md`
- `specs/components/00-foundation-and-tooling.md`
- `specs/components/01-edge-api.md`
- `specs/contracts/api-guidelines.md`
- `specs/contracts/tenancy-and-rbac.md`
- `infra/terraform/cloudflare-hyperdrive/README.md`
- `apps/api-edge/**`
- `apps/web-console/**`
- `stack-tectonic/compositions/cloudflare-worker-turbo/**`
- `stack-tectonic/compositions/cloudflare-worker/**`
- `stack-tectonic/compositions/cloudflare-pages-turbo/**`
- `stack-tectonic/compositions/cloudflare-pages/**`
- `stack-tectonic/compositions/cloudflare-pages-terraform/**`
- `stack-tectonic/compositions/cloudflare-pages-turbo-terraform/**`
- PR #47 diff, commits, checks, review state, and CI logs
- GitHub Actions run `26327010527`

# Required Outcomes

## PR Review

- Confirm PR #47 has a real PR number, is based on `main`, and is not draft.
- Inspect the actual PR diff, not just the summary.
- Verify PR #47 does not reintroduce reverted `packages/worker` work from PRs
  #37, #38, and #39.
- Verify `combined.md` or any other generated aggregate artifact is removed
  before merge. If it remains, mark verification FAIL and do not merge.
- Decide whether the broad Cloudflare composition refactor is required for Task
  0010's deployment/resource boundary. If it is not required, mark FAIL and ask
  for the PR to be split. If it is accepted, verify every affected composition,
  smoke fixture, and consumer component.
- Verify no secrets, connection strings, database passwords, Supabase API keys,
  Cloudflare API tokens, or AWS credentials are committed or logged.

## Api Edge Binding Boundary

- Verify `apps/api-edge/wrangler.jsonc` has:
  - top-level/local `ENVIRONMENT: "local"` and no top-level Hyperdrive binding;
  - `env.stage.vars.ENVIRONMENT: "stage"`;
  - `env.stage.hyperdrive[0].binding: "SOURCEPLANE_DB"`;
  - `env.stage.hyperdrive[0].id:
    "08f7c6055f544a3890a585d88fd92348"`;
  - `env.prod.vars.ENVIRONMENT: "prod"`;
  - `env.prod.hyperdrive[0].binding: "SOURCEPLANE_DB"`;
  - `env.prod.hyperdrive[0].id:
    "ab2c21c2db6245a59c91588fcac7107a"`.
- Verify `apps/api-edge/src/env.ts` uses a typed optional
  `SOURCEPLANE_DB?: Hyperdrive` binding and does not query the database.
- Verify `apps/api-edge/scripts/verify-bindings.mjs` fails on environment,
  binding-name, or ID drift.
- Verify no `dev` Worker config points at stage/prod Hyperdrive or Supabase
  resources.

## Orun And Deployment Boundary

- Inspect the rendered Orun PR plan and PR CI logs. PR CI must not perform live
  deploys.
- Inspect the rendered Orun main/push plan before or after merge. Main pipeline
  must deploy only the intended Cloudflare resources and only in their intended
  environments.
- For `api-edge`, do not pass verification if the live deploy command deploys
  the top-level/local Wrangler config when it is supposed to deploy `prod` or
  `stage`. A safe deploy must select the named Wrangler environment explicitly,
  for example with `wrangler deploy --env prod --config wrangler.jsonc` for
  prod, or an equivalent environment-specific mechanism.
- Confirm whether `stage` is intended to deploy live or only verify. If this PR
  represents Task 0010 live resource creation, the stage/prod behavior must be
  explicit in component profiles and CI logs. Do not allow accidental stage
  deploys, accidental prod deploys, or local/default deploys.
- Because PR #47 also changes `apps/web-console` and Pages compositions, verify
  any Pages deployment behavior too. If `web-console` is deployed on the merge
  pipeline, inspect that resource with Wrangler as well.

## Merge And Post-Merge Verification

- If all pre-merge checks pass, merge PR #47 using `gh`.
- After merge, wait for the `main` CI run created by the merge commit.
- Inspect `main` CI logs, not only status summaries. Confirm the merge pipeline
  ran the expected Orun plan/run jobs and deployed the expected Cloudflare
  resource(s).
- Use local Wrangler CLI to inspect the created Cloudflare resources after the
  merge pipeline:
  - `pnpm --filter @saas/api-edge exec wrangler whoami`
  - `pnpm --filter @saas/api-edge exec wrangler hyperdrive get 08f7c6055f544a3890a585d88fd92348`
  - `pnpm --filter @saas/api-edge exec wrangler hyperdrive get ab2c21c2db6245a59c91588fcac7107a`
  - `pnpm --filter @saas/api-edge exec wrangler deployments list --env stage --config wrangler.jsonc --json`
  - `pnpm --filter @saas/api-edge exec wrangler deployments list --env prod --config wrangler.jsonc --json`
  - `pnpm --filter @saas/api-edge exec wrangler deployments status --env prod --config wrangler.jsonc --json`
  - `pnpm --filter @saas/api-edge exec wrangler versions list --env prod --config wrangler.jsonc --json`
- If the merge pipeline deploys or updates `web-console`, also run a local
  Wrangler Pages inspection such as:
  - `pnpm --filter @saas/web-console exec wrangler pages deployment list --project-name sourceplane-web-console --environment production --json`
- Record only non-secret observed state in the verifier report: run IDs,
  deployment IDs, Worker names, version IDs, Hyperdrive IDs/names, and Pages
  deployment IDs are acceptable.
- If local Wrangler auth or permissions are missing, verification cannot pass
  the user's requested local resource check. Record the exact blocker and mark
  FAIL or BLOCKED rather than relying only on CI logs.

# Non-Goals

- No new Task 0011 runtime adapter.
- No domain SQL or database query from Worker runtime code.
- No identity, membership, projects, policy, events, billing, CLI product, or
  business behavior.
- No `dev` Supabase, `dev` Hyperdrive, or dev live Worker resource creation.
- No direct Terraform, Supabase, AWS, S3, or Secrets Manager mutation.
- No product-specific `specs-v2/**` work.
- No broad cleanup unrelated to PR #47 verification.

# Constraints

- Trust code, PR diff, rendered Orun plans, GitHub Actions logs, local
  Wrangler resource inspection, and provider-observed state over stale docs.
- Do not merge while PR checks are failing, while generated artifacts remain,
  or while environment-specific deploy commands are ambiguous.
- Do not log or report secret values.
- Do not commit ignored/generated outputs such as `.orun/**`, `plan.json`,
  `node_modules/`, `dist/`, `.wrangler/`, TypeScript build info, Terraform
  working directories, or generated aggregate files.
- If you need a small verification fix, keep it on PR #47's branch, push it,
  and wait for a replacement green CI run before deciding PASS/FAIL.
- If verification reveals a larger design/scope issue, do not fix it in the
  verifier task. Mark FAIL and recommend the next bounded implementer task.

# Acceptance Criteria

Verification passes only if all of the following are true:

- PR #47 is bounded enough to Task 0010 or its scope extension is explicitly
  justified and fully verified.
- `combined.md` and any other generated/out-of-scope artifacts are absent from
  the PR before merge.
- Local package checks pass:
  - `pnpm install --frozen-lockfile`
  - `pnpm --filter @saas/api-edge build`
  - `pnpm --filter @saas/api-edge typecheck`
  - `pnpm --filter @saas/api-edge lint`
  - `pnpm --filter @saas/api-edge verify-bindings`
  - if `web-console` remains changed:
    `pnpm --filter @saas/web-console build`,
    `pnpm --filter @saas/web-console typecheck`, and
    `pnpm --filter @saas/web-console lint`
- Orun checks pass:
  - `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`
  - `/Users/irinelinson/.local/bin/kiox -- orun component --intent intent.yaml --long`
  - `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json`
  - `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions`
- PR CI logs for the final head commit are green and show no live deploys on
  pull request.
- If PASS, PR #47 is merged.
- The post-merge `main` pipeline succeeds and deploys the expected Cloudflare
  resource(s) through Orun.
- Local Wrangler CLI checks prove the created or updated resources exist and
  that `stage`, `prod`, and local/default environment boundaries are correct.
- Local `main` is synced to `origin/main` after merge and the worktree is clean
  except for the verifier report/context changes if those are intentionally
  left as verification artifacts.
- `ai/reports/task-0010-verifier.md` clearly states `Result: PASS`,
  `Result: FAIL`, or `Result: BLOCKED`.

# Verification Procedure

Use the verifier merge protocol:

1. Inspect PR #47 metadata, final diff, commits, files, checks, and CI logs.
2. Run the local checks above.
3. Confirm config, Orun profile, and deploy command environment boundaries.
4. If a small fix is required, make it on PR #47, push, and wait for green CI.
5. If PASS pre-merge, merge PR #47.
6. Wait for and inspect the post-merge `main` run.
7. Run local Wrangler CLI resource inspection.
8. Sync local `main`.
9. Write the verifier report and compact context updates.

# PR Creation Requirement

PR #47 already exists and is the only implementation PR in scope. Do not open a
new implementation PR.

If verification artifacts need to land through a branch/PR, keep that PR
limited to verifier report/context updates only. Do not mix new feature work
with verification records.

# When Done Report

Write `ai/reports/task-0010-verifier.md` with:

- `Result: PASS`, `Result: FAIL`, or `Result: BLOCKED`
- `PR Review`
- `Scope Review`
- `Checks Run`
- `CI Log Review`
- `Merge Pipeline Evidence`
- `Wrangler Resource Evidence`
- `Environment Boundary Review`
- `Secret Handling Review`
- `Issues`
- `Spec Proposals`
- `Risk Notes`
- `Recommended Next Move`
- `PR Number`
