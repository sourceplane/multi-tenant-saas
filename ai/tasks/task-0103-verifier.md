# Task 0103 Verifier

Agent: Verifier

This prompt is **sealed at scoping time** and activates immediately —
PR #158 is already OPEN, MERGEABLE/CLEAN, and 4/4 PR-CI green at sealing
(run 26699737104). Run the seven phases below in order. Do not expand
scope into Task 0096f territory, Task 0104 territory, or any other
workspace.

## Sealing Snapshot

- Sealed at: 2026-05-31 (orchestrator close pass after Task 0102 squash
  `bced5fa` + verifier bookkeeping `b7efb89` + orchestrator scoping
  commit `3102a74` landed on `main`).
- `main` snapshot at sealing: `3102a74` ("orchestrator: scope Task 0103
  (sdk AuthClient) — last SDK gap before U10").
- Implementer prompt: `ai/tasks/task-0103.md`
- Implementer report: `ai/reports/task-0103-implementer.md`
- **Branch (as shipped):** `impl/task-0103-sdk-auth-client`
- **PR:** #158 — base `main`, head `impl/task-0103-sdk-auth-client`,
  state `OPEN`, mergeable `MERGEABLE`, mergeStateStatus `CLEAN`.
  Title: "Task 0103: AuthClient — 13th SDK resource client (U10
  unblock)". Authored 2026-05-31T01:14:20Z.
- PR-CI at sealing: run `26699737104` — `plan` SUCCESS,
  `sdk · {dev,stage,prod} · Verify` all SUCCESS (4/4). No deploy step
  expected for an SDK-only PR.
- Mirror reference (turbo-package quick-check shape):
  `packages/sdk/component.yaml`. Must be **byte-identical** in this PR
  vs `main` (zero `component.yaml` edits — Task 0103 is pure source +
  tests).
- Lint baseline at sealing: `pnpm -r --no-bail lint` exit 0 with **≤ 45
  residual warnings**, ALL in `tests/api-edge` (Task 0096f territory).
  SDK must contribute **0**.
- Implementer reports **17 new it() blocks** (target was ≥10), bringing
  SDK total from 89 → 106. Verifier confirms count locally.
- No spec proposals expected. Implementer report §Spec Proposals = none;
  all 6 method signatures map cleanly to existing `@saas/contracts/auth`
  types. If verifier finds an undocumented contract widening or
  undeclared type addition under `packages/contracts/**`, that is an
  immediate Phase 2 FAIL.

## Out-Of-Scope Territory

Do NOT inspect, comment on, or block on any of:

- `tests/api-edge/**` (Task 0096f / parallel)
- `apps/**` (Task 0104 will swap `apps/web-console-next/src/lib/api.ts`
  — not in this PR)
- `packages/cli/**` (CLI auth flow migration is parked per Task 0103
  Non-Goals — explicitly out of scope)
- `packages/contracts/**` (proposal-then-defer if a type was missing;
  no proposal exists, so no contracts edits should be present)
- `packages/db/**`
- `infra/terraform/cloudflare-domain/**` and the cloudflare provider
  pin (deferred 0085b)
- `apps/notifications-worker/**` (deferred provider-swap and
  dev-reframe)
- `tooling/eslint/**` (sealed since Task 0092)

If the PR diff touches any of the above, that is an immediate **FAIL**
in Phase 2 with no further investigation.

## Latitude Exercised By Implementer (per task-0103.md)

- **Test file shape** — implementer split into a dedicated
  `packages/sdk/src/__tests__/auth.test.ts` mirroring
  `environments.test.ts` (capturing fetch impl, envelope helper,
  error-response helper). Accept this; do not require an
  alternate split.
- **`updateProfile` HTTP verb** — implementer uses `PATCH`, justified
  per `auth-facade.ts:15` (`new Set(["GET", "PATCH"])`). Accept PATCH
  (do not require PUT).
- **`logout` body shape** — implementer sends no body (POST with
  `body: undefined`); transport then omits `content-type` + body on
  the wire. Accept; do not require a `{}` body.
- **Internal-route exclusions** — `/v1/auth/resolve` (service-binding
  bearer resolution) intentionally not exposed; `/v1/auth/security-events`
  already on `SecurityEventsClient` from Task 0099, not duplicated.
  Accept both exclusions per Task 0103 Non-Goals.

Verifier MUST NOT require additional methods beyond the 6 declared
(`loginStart`, `loginComplete`, `getSession`, `logout`, `getProfile`,
`updateProfile`). Verifier MUST require Stripe-parity (caller-owned
`Idempotency-Key` on every POST, never SDK-generated),
`encodeURIComponent` on any dynamic segments (none expected — these
endpoints have no path params, but the principle applies if added),
public-API preservation (`Transport.request<T>` shape unchanged,
existing 12 resource clients unchanged), and zero new hazards under
`packages/sdk/**`.

---

## Phase 1 — PR sanity & shape

1. `gh pr view 158 --json state,mergeable,mergeStateStatus,headRefName,baseRefName,additions,deletions,files,statusCheckRollup`
2. Confirm:
   - `state == "OPEN"` (or `"MERGED"` if you arrive after merge — then
     skip to Phase 7 read-only audit).
   - `baseRefName == "main"`.
   - `headRefName == "impl/task-0103-sdk-auth-client"`.
   - `files` ⊆ {
       `packages/sdk/src/auth.ts` (new),
       `packages/sdk/src/index.ts` (modified),
       `packages/sdk/src/__tests__/auth.test.ts` (new),
       `ai/reports/task-0103-implementer.md` (new)
     }.
   - No diff in `packages/sdk/src/transport.ts`,
     `packages/sdk/component.yaml`, any other resource client,
     `packages/contracts/**`, `packages/cli/**`, `apps/**`,
     `infra/**`, `tests/api-edge/**`.
3. `gh pr checkout 158` and confirm `git status --short` is clean.
4. Confirm sealing-snapshot still reflects truth:
   `git log --oneline main..HEAD` should show only the Task 0103
   implementer commits (no surprise sweeper commits, no merge
   commits, no unrelated drift).
5. **One-task / one-PR mapping:** confirm the PR maps to exactly Task
   0103. If the diff includes any U10 / Console refactor scope,
   `transport.ts` edits, or new resource clients beyond `AuthClient`,
   that is overreach → FAIL.

If any check fails, write FAIL bookkeeping (Phase 7 FAIL path) and
stop.

## Phase 2 — Hazard + boundary scan

Run from repo root on the PR checkout:

```sh
git diff main -- packages/sdk/ | rg -nE 'eslint-disable|@ts-ignore|@ts-expect-error|as unknown as|as any|node:' || echo OK
```

Expected: `OK` (zero hits). Any hit on a NEW line introduced by this
PR → FAIL. (Pre-existing matches on context lines unchanged by the
PR are tolerable; use `git diff main -- packages/sdk/ | rg '^\+' |
rg -nE 'eslint-disable|@ts-ignore|@ts-expect-error|as unknown as|as any|node:'`
to filter to additions only.)

Also run:

```sh
git diff main --stat -- packages/sdk/component.yaml
git diff main -- packages/sdk/component.yaml
```

Expected: empty (byte-identical).

Public-API preservation:

```sh
git diff main -- packages/sdk/src/transport.ts
git diff main -- packages/sdk/src/index.ts
```

`transport.ts` must be empty diff. `index.ts` may add only:
- `import { AuthClient } from "./auth.js";` (or equivalent)
- `readonly auth: AuthClient;` field declaration
- `this.auth = new AuthClient(this.transport);` in constructor
- `export { AuthClient } from "./auth.js";`
- Auth contract type re-exports from `@saas/contracts/auth`
  (LoginStart*, LoginComplete*, Session*, Logout*, Profile*,
  UpdateProfile*, AuthUser).

No deletions, no edits to existing client wirings. Any deletion or
shape change to existing resource clients → FAIL.

## Phase 3 — Local quality gates

From repo root (PR checkout):

```sh
pnpm install --frozen-lockfile
pnpm --filter @saas/sdk typecheck     # exit 0
pnpm --filter @saas/sdk lint          # exit 0, 0 warnings
pnpm --filter @saas/sdk test           # exit 0, ≥106 passed (89 baseline + ≥17)
pnpm --filter @saas/sdk build          # exit 0
pnpm -r typecheck                      # exit 0 across 38 workspaces
pnpm -r --no-bail lint                 # exit 0, ≤45 warnings, ALL in tests/api-edge
```

Lint-baseline guard: if total warnings drift above 45, or any new
warning lands outside `tests/api-edge`, FAIL with the offending file
list.

Test-coverage guard: count `it(` occurrences in
`packages/sdk/src/__tests__/auth.test.ts`. Must be ≥10 (target was
≥10; implementer reports 17). Coverage shape MUST include at minimum:

- URL shape per method (loginStart → POST `/v1/auth/login/start`,
  loginComplete → POST `/v1/auth/login/complete`, getSession → GET
  `/v1/auth/session`, logout → POST `/v1/auth/logout`, getProfile →
  GET `/v1/auth/profile`, updateProfile → PATCH `/v1/auth/profile`).
- HTTP verb assertion per method (GET vs POST vs PATCH).
- Body serialization on POST/PATCH (loginStart, loginComplete,
  updateProfile have bodies; logout does not — assert `init.body`
  undefined).
- **Stripe parity:** at least one test asserts caller-supplied
  `opts.idempotencyKey` is forwarded verbatim on a POST.
- **Stripe parity (negative):** at least one test asserts that when
  `opts.idempotencyKey` is omitted, the SDK does NOT auto-generate
  one (i.e. `Idempotency-Key` header is absent).
- At least one typed-error decode test (one of
  Unauthenticated/Validation/RateLimit/Internal — the implementer
  report claims all four; spot-check at least one).

If any of the above coverage shapes is missing, FAIL with the list of
missing assertions.

## Phase 4 — Orun validate / plan / run --dry-run

```sh
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
```

Expected:
- validate: `✓ All validation passed`
- plan: detects `packages/sdk/**` change → `1 components × 3 envs → 3
  jobs` (sdk · {dev,stage,prod} · Verify). No deploy step
  (turbo-package quick-check profile). If plan emits anything else
  (e.g. CLI lanes, deploy lanes, contracts lanes), FAIL — that
  signals a `component.yaml` byte drift Phase 2 missed.
- run --dry-run: 3/3 ✓.

`component.yaml` byte-identity is the precondition: re-run the Phase
2 byte-identity check if plan output is unexpected.

## Phase 5 — PR-CI confirmation

```sh
gh pr checks 158
gh run list --branch impl/task-0103-sdk-auth-client --limit 5
gh run view <latest-PR-run-id> --log-failed   # if any failure
```

Expected: 4/4 SUCCESS on (`plan`, `sdk · dev · Verify`,
`sdk · stage · Verify`, `sdk · prod · Verify`). Sealing snapshot:
run `26699737104`. If the PR head was force-pushed since sealing,
re-fetch and confirm the latest run is still 4/4.

If a verifier-side fixup commit becomes necessary (e.g. lint baseline
drift cleanup, tiny test gap fill), commit on the PR branch with a
`verifier:` prefix, push, wait for CI, then continue. Do NOT add
feature scope.

## Phase 6 — Squash merge + post-merge main-CI watch

If Phases 1–5 are all green:

```sh
gh pr merge 158 --squash --delete-branch
# if the PR is BEHIND main due to merge-time drift, retry with --admin:
gh pr merge 158 --squash --delete-branch --admin
```

Then watch post-merge main-CI:

```sh
git checkout main
git pull --ff-only origin main
gh run list --branch main --limit 5
gh run watch <run-id>
```

Expected: 4/4 SUCCESS (plan + sdk · {dev,stage,prod} · Verify). No
deploy step (sdk is a turbo-package, not deployable).

If post-merge main-CI fails:
- Capture the failing job log via
  `gh run view <run-id> --log-failed`.
- Determine whether the failure is task-introduced or transient
  (re-run is acceptable for transient infra hiccups; task-introduced
  failures require a follow-up fixup PR with `fix:` scope).
- Document in the verifier report.

After merge: confirm `git status --short` is clean and the local
`impl/task-0103-sdk-auth-client` branch is gone (`git branch -D` if
still present locally).

## Phase 7 — PASS bookkeeping

Write `ai/reports/task-0103-verifier.md` with the following sections:

```
# Task 0103 Verifier Report

## Result: PASS

## Checks
- Phase 1 PR sanity: PR #158 base=main, head=impl/task-0103-sdk-auth-client, files=4 (auth.ts new, index.ts modified, auth.test.ts new, implementer report), no out-of-scope diff
- Phase 2 hazard scan: 0 hits on eslint-disable / @ts-ignore / @ts-expect-error / as unknown as / as any / node: under packages/sdk/**; component.yaml byte-identical; transport.ts byte-identical
- Phase 3 quality gates: pnpm --filter @saas/sdk typecheck/lint/test/build all exit 0; SDK tests = <N> (89 → <N>); pnpm -r typecheck exit 0; pnpm -r --no-bail lint = <N> warnings, all in tests/api-edge
- Phase 3 coverage shapes: URL/verb/body/idempotency-passthrough/idempotency-omitted/typed-error all asserted
- Phase 4 orun: validate/plan/run --dry-run all exit 0; plan emitted 1×3 sdk Verify lanes only
- Phase 5 PR-CI: run <run-id> 4/4 SUCCESS
- Phase 6 merge: squash <commit-sha>; post-merge main-CI run <run-id> 4/4 SUCCESS

## Issues
None.

## Risk Notes
- Stripe parity: caller-owned idempotency-key on all 3 POSTs (loginStart, loginComplete, logout); SDK never auto-generates. Tests pin both directions.
- /v1/auth/resolve intentionally excluded (internal service-binding); /v1/auth/security-events already on SecurityEventsClient from Task 0099.
- AuthClient is the 13th typed resource client. Task 0104 (U10 console refactor) is now a pure consumer-side swap.

## Spec Proposals
None. All 6 method signatures map cleanly to existing @saas/contracts/auth types.

## Recommended Next Move
Scope Task 0104 — Console U10 SDK refactor. Drop apps/web-console-next/src/lib/api.ts (297 LOC, 8 consumer call sites), replace with Sourceplane from @saas/sdk. Pure consumer-side swap; estimated single PR. Will subsume the auth flow in apps/web-console-next/src/app/login/page.tsx through client.auth.*. Branch impl/task-0104-console-u10-sdk-refactor. Apps lane (web-console-next) on PR-CI.
```

Then update bookkeeping on `main`:

1. **`ai/state.json`:**
   - Add `"0103"` to `completed`.
   - Set `current_task` to `"0104"` (or whatever the next-scoped
     task ends up being if the orchestrator pivots — defer to the
     orchestrator's next pass).
   - Update `last_verified` to today's UTC date.
   - Update `task_agent` to the verifier report path
     (`ai/reports/task-0103-verifier.md`).
   - Append a `notes` entry summarizing PR #158 close + post-merge
     main-CI run id.

2. **`ai/context/current.md`:** rewrite Current Task section to
   reflect Task 0103 verified+merged, and update the recap +
   Next-Task-After block (next is Task 0104 — Console U10 SDK
   refactor).

3. **`ai/context/task-ledger.md`:** append a "## Task 0103" closure
   entry mirroring the Task 0102 closure entry shape (Agent /
   Prompt / Verifier prompt / Reports / Status / Implementation /
   PR-CI / Post-merge / Objective / Scope / Durable outcome /
   Unlocks).

4. Commit on `main` directly:
   ```sh
   git add ai/state.json ai/context/current.md ai/context/task-ledger.md ai/reports/task-0103-verifier.md
   git commit -m "verifier: close Task 0103 (PR #158) — AuthClient (13th SDK client), Track B4 + U10-prereq complete"
   git push origin main
   ```

5. Confirm `git status --short` clean. Confirm
   `git log --oneline -3 main` reflects the verifier commit.

## Phase 7 (alt) — FAIL bookkeeping

If any phase fails:

1. Leave PR #158 OPEN.
2. Write `ai/reports/task-0103-verifier.md` with `## Result: FAIL`
   and an `## Issues` list (specific blockers, file:line where
   relevant).
3. Add a PR comment on #158 summarizing the blocker(s) and what the
   implementer must do to clear them. Do NOT dump the full verifier
   report — link to it on the PR branch instead.
4. Optionally commit the verifier report on the PR branch (NOT on
   `main`) with a `verifier:` prefix so the implementer can read it
   in context.
5. Do NOT update `ai/state.json` `completed`. Leave `current_task`
   at `"0103"`. Set `repo_health` to `"yellow"` if the failure is
   structural (CI failure, hazard hit, lint baseline drift).
6. The orchestrator will re-evaluate on the next pass.

---

## Verifier Merge Protocol Reminder

Per `agents/orchestrator.md` Verifier Merge Protocol:

- Run `kiox -- orun validate / plan / run --dry-run` locally before
  merge.
- Inspect PR CI logs (not just the rollup summary) — confirm the
  expected commands actually ran on each Verify lane.
- If a verifier-side fixup commit is needed, commit on the PR
  branch, push, wait for CI, then merge. Do NOT add feature scope.
- After merge, `git checkout main && git pull --ff-only`.
- `git status --short` must be clean before ending the task.
- Never merge a PR with unresolved verification blockers.
