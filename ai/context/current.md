# Current Context

Last updated: 2026-05-19

## Repo Reality

- `main` is synced with `origin/main` at `01429e1`.
- The local worktree is dirty with Task 0003 implementation changes and
  `ai/reports/task-0003-implementer.md`, but there is no open GitHub PR.
- `agents/agent-loop.sh` is also locally modified and was not described in the
  Task 0003 report; keep it out of the Task 0003 PR unless proven in scope.
- Tasks 0001, 0001.1, and 0002 are verified and merged.
- Task 0003 needs PR completion before verification/merge.
- The repo uses Orun v2.1.0 with `sourceplane/orun-action@v1.2.0`.
- Environments are `dev`, `stage`, `prod` with promotion chains and
  `parameterDefaults.terraform` matching `aws-admin`.
- Composition source is `kind: dir` pointing to `stack-tectonic/`, bound as
  the `terraform` type. Non-terraform compositions (turbo-package,
  cloudflare-worker-turbo, cloudflare-pages-turbo) are also resolved from the
  same local stack.
- Terraform components use `spec.parameters`, `plan-only`/`apply` profiles,
  explicit `dependsOn`, and colocated READMEs in `aws-admin` style.
- All non-terraform components migrated from `spec.inputs` to `spec.parameters`
  and from old environment names (`staging`/`production`) to `stage`/`prod`.
- CI uses the same plan/run shape as `aws-admin` with conditional `--changed`.
- `aws-admin` IAM roles for this repo do not yet exist (Task 0004).
- S3 backend consumption is deferred to Task 0005.

## Current Roadmap Position

- Active spec pack: reusable SaaS starter under `specs/**`.
- Current phase: Week 0 / operations foundation aligned with golden path.
- Next focus: AWS-admin IAM access (Task 0004), then S3 state migration
  (Task 0005), then Supabase infra (Task 0006).

## Current Task

- Task 0003 is implemented locally but not yet committed, pushed, or opened as
  a PR.
- Next implementer task: `ai/tasks/task-0003-pr-completion.md`.
- Task 0004 in `aws-admin` remains blocked until Task 0003 has a PR,
  verification, and merge.
