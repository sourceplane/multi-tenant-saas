# Current Context

Last updated: 2026-05-31 — Task 0118 VERIFIED + MERGED; Task 0119 SCOPED (orchestrator). Awaiting implementer.

PR #173 (Task 0118 `refactor(cli): fold cross-reads resolveOrgId onto shared
helper`) squash-merged to main as `eda4a3a`. Inline 8-phase verifier PASS adapted
for a 1-component `cli` turbo PR (no deploy lane): EXACTLY 2 files (+82/−13) on
the boundary — `packages/cli/src/commands/cross-reads.ts` (+5/−13: deleted the
private no-override `resolveOrgId`, imported the shared one from `./helpers.js`,
dropped the now-unused `MissingOrgContextError` import keeping `UsageError`,
updated the 3 call sites to pass `/* allowOverride */ false`),
`ai/reports/task-0118-implementer.md` NEW. Byte-equivalence confirmed
(`allowOverride=false` skips the `helpers.ts:39-42` override branch, leaving
lines 43-48 identical to the deleted fn). Quality gates: `@saas/cli` typecheck 0,
lint 0, test 164/164 (UNCHANGED count — proves pure refactor, zero behaviour
drift). Orun: validate ok, changed-plan `cbd6d4f3025d` = 1 component (cli) × 3
envs = 3 jobs, dry-run 3 selected green; no `kiox.lock` mutation. PR-CI run
26711637285 = 4/4 SUCCESS (`gh run view --log` confirms `cli·dev·Verify` ran
orun run = 4 steps passed 0 failed, not a no-op). 0 behind main at merge — no
update-branch needed. Post-merge main-CI run 26711737699 at `eda4a3a` = 4/4
SUCCESS. Reports: `ai/reports/task-0118-implementer.md`,
`ai/reports/task-0118-verifier.md`.

The CLI now carries a single source of truth for org-id resolution
(`helpers.ts`) — the last byte-equivalent copy is gone and the Task 0111
deferred Remaining Gap is closed. **main remains FULLY GREEN.**

Repo health: green. Working tree clean. main HEAD `eda4a3a`.

## Current task — 0119

**Bump the four deprecated Node-20-runtime GitHub Actions in
`.github/workflows/ci.yml` to Node-24 majors before the June 16 2026 hard
cutover.**

- Prompt: `ai/tasks/task-0119.md`
- Agent: Implementer
- Branch: `impl/task-0119-ci-actions-node24-bump`
- Sealed snapshot main: `eda4a3a` (Task 0118 squash).
- Trigger: every CI run now emits the Node 20 deprecation annotation for
  `actions/checkout@v4`, `actions/upload-artifact@v4`,
  `actions/download-artifact@v4`, `docker/login-action@v3`. Actions forced to
  Node 24 starting **June 16 2026**.
- PR boundary: 2 files exactly — `.github/workflows/ci.yml` (four single-token
  ref bumps: both `checkout@v4`→`@v6`, `upload-artifact@v4`→`@v7`,
  `download-artifact@v4`→`@v8`, `docker/login-action@v3`→`@v4`),
  `ai/reports/task-0119-implementer.md` (NEW, real PR#).
- Grounded versions (orchestrator research via `gh api` `action.yml` `using:`):
  checkout node24 from v5+ (latest v6.0.2), upload-artifact from v7 (latest
  v7.0.1), download-artifact from v8 (latest v8.0.1), docker/login-action from
  v4 (v4.2.0).
- Out of scope: `sourceplane/orun-action@v1.2.0` (org composite, not in the
  banner); `actions/cache@v4` (named in the banner but injected transitively by
  orun-action's tooling, not present in `ci.yml`, not addressable here).
- Behaviour-preserving: both `orun` step bodies + env + permissions + matrix +
  job names byte-identical. Expected: `orun plan --changed` likely EMPTY (keys
  off `intent.yaml` paths, not `.github/**`), so PR-CI shows only the `plan`
  job; that is the verification surface (plan job green on new majors + banner
  gone).
- Title: `ci(tooling): bump GitHub Actions off deprecated Node 20 runtimes`.

## Recommended next focus after 0119

1. **Delivery-attempts UX** — next B5 leg per `specs/roadmap.md` for a richer
   console or CLI slice now that endpoint-CRUD + SDK symmetry are fully closed.
2. **`VALID_CONTEXTS` drift-proofing (hygiene)** — derive the test array from
   the `BoundedContext` union via `as const` so the duplication fixed in Task
   0117 cannot re-break. Low priority; flagged in the Task 0117 implementer
   report as a future improvement.

Repo health: green. main HEAD `eda4a3a`.
