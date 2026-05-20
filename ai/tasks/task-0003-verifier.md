# Task ID

Task 0003 Verifier

# Agent

Verifier

# Current Repo Context

Task 0003 has open PR #25:

- URL: https://github.com/sourceplane/multi-tenant-saas/pull/25
- Branch: `task-0003-orun-golden-path`
- Base: `main` at `01429e1`
- Current PR head: `fb0f2e4`
- Checks: passing on CI run `26110433274`

The task objective was to align `multi-tenant-saas` with the reusable SaaS Orun
golden path and `aws-admin` reference shape: Orun v2.1.0, `orun-action@v1.2.0`,
`dev`/`stage`/`prod`, Terraform `spec.parameters`, plan-only/apply profiles,
local `stack-tectonic/`, and Orun-only CI.

The PR needed a follow-up CI fix after non-Terraform jobs rendered
`actions/setup-node` with `<no value>`. Commit `01f57a7` updates non-Terraform
job templates to read `{{ .parameters.* }}` and Orun identity context. Commit
`fb0f2e4` removes AWS credential environment variables from CI. Verify both
commits as part of the same Task 0003 PR.

The local checkout may be behind the PR head and has an unrelated dirty
`agents/agent-loop.sh` file. Do not include that file in verifier changes.

# Objective

Independently verify PR #25 against Task 0003 and Task 0003 CI-fix acceptance
criteria. If it passes, merge PR #25, sync local `main` to `origin/main`, and
leave the local repo clean except for unrelated pre-existing local work.

# PR Boundary

This verifier task covers PR #25 only.

Allowed verifier changes are limited to a concise verifier report and any
small verification-only correction required to complete Task 0003. Do not add
Task 0004 work, `aws-admin` changes, S3 backend migration, Supabase/Cloudflare
resource creation, or domain behavior changes.

# Read First

- `ai/tasks/task-0003.md`
- `ai/tasks/task-0003-pr-completion.md`
- `ai/tasks/task-0003-ci-fix.md`
- `ai/reports/task-0003-implementer.md`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `specs/orun-golden-path.md`
- `specs/repo.md`
- `specs/access-and-infra.md`
- `specs/components/00-foundation-and-tooling.md`
- `intent.yaml`
- `kiox.yaml`
- `.github/workflows/ci.yml`
- `stack-tectonic/compositions/**`
- `infra/terraform/**`
- PR #25 diff, commits, and CI logs
- `../aws-admin/intent.yaml`
- `../aws-admin/kiox.yaml`
- `../aws-admin/.github/workflows/ci.yaml`
- `../aws-admin/stacks/aws-admin-terraform/**`

# Required Outcomes

- Confirm PR #25 maps to exactly one PR-sized task: Task 0003 Orun golden-path
  alignment plus the in-PR CI fix needed for that task.
- Inspect the PR diff and commits, including `fb0f2e4`, not just local files.
- Confirm `.github/workflows/ci.yml` remains Orun-only and does not use direct
  pnpm, turbo, Terraform, Wrangler, Supabase, or AWS apply jobs outside Orun.
- Confirm `kiox.yaml`, `kiox.lock`, and CI use Orun v2.1.0 and
  `sourceplane/orun-action@v1.2.0`.
- Confirm `intent.yaml` uses `dev`, `stage`, `prod`, local `stack-tectonic/`
  composition source, central type bindings, and Terraform parameter defaults
  aligned with `aws-admin`.
- Confirm component manifests moved from `spec.inputs` to `spec.parameters`
  and environment subscriptions moved from `staging`/`production` to
  `stage`/`prod` where applicable.
- Confirm Terraform composition behavior matches the bounded Task 0003 scope:
  typed `parameters`, `terraformDir`, pinned Terraform version, plan-only/apply
  profiles, S3 backend shape documented for future consumption, and no live
  AWS role or S3 migration requirement ahead of Task 0004/0005.
- Confirm all non-Terraform job templates affected by the parameter migration
  render concrete Node and pnpm versions, not `<no value>`.
- Confirm component READMEs and compact context changes are accurate enough for
  future tasks, noting any stale report text from the final CI credential
  cleanup commit if it is not behaviorally blocking.
- Inspect GitHub Actions logs for CI run `26110433274`, including successful
  jobs, and confirm expected Orun plan/run commands actually executed.
- Write `ai/reports/task-0003-verifier.md`.

# Non-Goals

- No Task 0004 implementation.
- No `aws-admin` PR or IAM role creation.
- No S3 backend migration or R2 cleanup.
- No Supabase project/database creation.
- No Cloudflare Hyperdrive, Worker, Pages, queue, or binding provisioning.
- No domain code, database migrations, UI, API, identity, billing, audit, or
  product-specific `specs-v2/**` work.
- No unrelated cleanup of `agents/agent-loop.sh`.

# Constraints

- Trust rendered Orun plans and PR CI logs over stale docs.
- Do not commit generated `.orun/**`, `plan.json`, Terraform state,
  `.terraform/**`, caches, or secrets.
- Do not rely only on `gh pr checks`; inspect CI logs for representative
  Terraform and non-Terraform jobs.
- Do not merge with unresolved verification blockers or unauthorized spec
  drift.
- If verification changes the PR, commit only the verifier-scoped change to
  the PR branch, push it, and wait for CI again before merging.
- Preserve unrelated local/user changes. Do not discard or include
  `agents/agent-loop.sh`.

# Integration Notes

- The implementer report says CI was awaiting green status after the CI fix,
  but PR checks are now green at head `fb0f2e4`.
- The report's early file table mentions AWS env vars in CI; reconcile that
  with the final `fb0f2e4` cleanup when writing risk notes.
- `tf-state-r2` still exists and remains a planned migration target. That is
  acceptable for Task 0003 if the PR does not require live S3 role access.
- Task 0004 in `aws-admin` remains blocked until PR #25 is verified and
  merged.

# Acceptance Criteria

- Local verification passes or exact blockers are reported:
  - `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`
  - `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json`
  - `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
- Rendered plan or dry-run output proves app, package, and test jobs use
  concrete `node-version` values.
- GitHub Actions run `26110433274` shows Orun plan/run behavior and all checks
  pass at PR head `fb0f2e4`.
- No secrets, Terraform state, generated credentials, or generated Orun files
  are committed.
- PR #25 does not create or mutate live AWS, Cloudflare, or Supabase resources.
- If PASS, PR #25 is merged, local `main` is fast-forwarded from `origin/main`,
  and `git status --short` is clean except for unrelated pre-existing local
  work that is explicitly called out in the verifier report.
- If FAIL, PR #25 remains open and the report lists concrete blockers.

# Verification

Use the verifier merge protocol from `agents/orchestrator.md`:

- inspect prompt, PR, report, diff, and CI logs;
- run local gates;
- inspect successful GitHub Actions logs, not only summaries;
- verify production-grade basics and spec alignment;
- write `ai/reports/task-0003-verifier.md`;
- merge only on PASS;
- sync local `main` after merge.

# When Done Report

Write `ai/reports/task-0003-verifier.md` with:

- Result: PASS or FAIL
- Checks
- Issues
- Risk Notes
- Spec Proposals
- Recommended Next Move
