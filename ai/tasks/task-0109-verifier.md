# Task 0109 — Verifier

Agent: Verifier

## Current Repo Context

- Task 0109 implementer is COMPLETE. PR #164 OPEN, MERGEABLE/CLEAN, all 5
  PR-CI required lanes SUCCESS at HEAD `f95befa6137b424fba286b4e96ca26a66cfacf82`
  on branch `impl/task-0109-webhook-console-reveal-once` (commits: 2).
- Sealed snapshot at PR open: main `828245d` (Task 0109 scope commit) atop
  `97ee29e` (Task 0108 verifier-PASS bookkeeping). At verifier dispatch,
  main advances to the orchestrator-dispatch commit; expect the recurring
  BEHIND-main pattern from 0103/0104/0105/0106/0107/0108 — handle with
  `gh pr update-branch 164` per Constraint 3.
- Diff: 12 files, +1170/-0, scope-clean — every path is under
  `apps/web-console-next/**`, `tests/web-console-next/**`,
  `ai/reports/task-0109-implementer.md`, or `pnpm-lock.yaml` (auto). Zero
  hits in `packages/contracts/**`, `packages/sdk/**`, `apps/api-edge/**`,
  `apps/webhooks-worker/**`, `packages/db/**`, or `infra/**` — pure
  console-only PR as scoped.
- Implementer chose to add a NEW workspace test package
  `tests/web-console-next/**` (mirroring `tests/contracts` shape) rather
  than wiring a test runner into `apps/web-console-next`. This is a
  legitimate scope-clean decision under latitude (see implementer report
  §"Decisions Taken Under Latitude"); structurally equivalent to the
  precedent set by `tests/contracts` and `tests/db`. Confirm
  `tests/web-console-next/component.yaml` mirrors a `turbo-package`
  shape so Orun selects it correctly without polluting deploy lanes.
- Implementer claims reveal-once invariant is enforced at the
  state-machine level: discriminated union (`idle` | `confirming` |
  `rotating` | `revealing`) where the `secret` field is statically only
  expressible on the `revealing` arm; `closeReveal` returns to `idle`
  dropping the secret. The 18-test suite includes a
  `JSON.stringify(state).includes("whsec_")` assertion after `closeReveal`
  — verify this is genuinely binding (not just on a stale variable).
- This is the **B5 webhook secret-rotation console slice** (downstream
  consumer of Task 0108's locked contract). Task 0110 (CLI rotate
  subcommand) is symmetric and parallel-safe; do not start it.

## Objective

Verify PR #164 against the Task 0109 implementer prompt
(`ai/tasks/task-0109.md`) and the Verifier Standard in
`agents/orchestrator.md` lines 392–434. Decide PASS/FAIL. If PASS, merge
per Verifier Merge Protocol; if FAIL, leave the PR open with clear
blockers documented in the verifier report.

## PR Boundary

12 paths total. All in scope:

1. `apps/web-console-next/src/app/(app)/orgs/[orgSlug]/webhooks/page.tsx` (NEW)
2. `apps/web-console-next/src/app/(app)/orgs/[orgSlug]/webhooks/[endpointId]/page.tsx` (NEW)
3. `apps/web-console-next/src/components/webhooks/rotate-flow.ts` (NEW — state machine + formatters)
4. `apps/web-console-next/src/components/webhooks/rotate-secret-dialog.tsx` (NEW — confirm + reveal-once dialogs)
5. `apps/web-console-next/src/components/shell/sidebar.tsx` (+2 lines: import + nav entry)
6. `tests/web-console-next/package.json` (NEW)
7. `tests/web-console-next/tsconfig.json` (NEW)
8. `tests/web-console-next/eslint.config.js` (NEW)
9. `tests/web-console-next/component.yaml` (NEW — `turbo-package` mirroring `tests/contracts`)
10. `tests/web-console-next/src/rotate-flow.test.ts` (NEW — 18 tests)
11. `pnpm-lock.yaml` (auto, only new dev workspace edge for `@saas/web-console-next-tests`)
12. `ai/reports/task-0109-implementer.md` (NEW)

Reject any path that breaches `apps/web-console-next/**` /
`tests/web-console-next/**` / report / lockfile.

## Read First

- `ai/tasks/task-0109.md` — implementer prompt (PR boundary, hard rules,
  acceptance criteria, Architect Brief).
- `ai/reports/task-0109-implementer.md` — implementer self-report.
- `agents/orchestrator.md` lines 392–434 — Verifier Standard + Merge
  Protocol.
- `apps/web-console-next/src/components/webhooks/rotate-flow.ts` — full
  file (verify the discriminated union really makes `secret` only
  expressible on `revealing`; verify `closeReveal` returns to `idle`
  with no secret carryover; verify formatters are pure).
- `apps/web-console-next/src/components/webhooks/rotate-secret-dialog.tsx`
  — full file (verify destructive-confirm gating, reveal-once render
  path, copy-to-clipboard, defensive `useEffect` cleanup on unmount, no
  storage / cache / global stash, no `node:*`).
- `apps/web-console-next/src/app/(app)/orgs/[orgSlug]/webhooks/page.tsx`
  + `[endpointId]/page.tsx` — confirm the secret is NOT rendered
  outside the reveal-once dialog (no list-row leak, no detail-page
  carryover, no toast leak, no error-envelope leak).
- `apps/web-console-next/src/components/shell/sidebar.tsx` — confirm
  exactly one new "Webhooks" nav entry under `Org · {orgSlug}`, placed
  between API keys and Config (per implementer choice).
- `tests/web-console-next/src/rotate-flow.test.ts` — confirm 18 tests
  actually exercise reveal-once invariant (the
  `JSON.stringify(state).includes("whsec_")` scrub is binding) and the
  rotate-confirm gating (no rotate without explicit confirm).
- `tests/web-console-next/component.yaml` — confirm `turbo-package`
  shape matching `tests/contracts/component.yaml` (3 envs Verify, no
  deploy lane).
- `packages/contracts/src/webhooks.ts` (READ-ONLY) — confirm consumer
  uses the locked Task 0108 shape (`secret?: string`,
  `previousSecretExpiresAt: string | null`, `gracePeriodSeconds: number`)
  without monkey-patching.
- `packages/sdk/src/webhooks.ts` (READ-ONLY) — confirm console calls
  `client.webhooks.rotateSecret` / `listEndpoints` and does NOT
  hand-roll `fetch()` to api-edge.

## Required Outcomes

- [ ] PR boundary matches prompt — all 12 paths in scope; no breach
      into `packages/contracts/**`, `packages/sdk/**`,
      `apps/api-edge/**`, `apps/webhooks-worker/**`, `packages/db/**`,
      `infra/**`, or any other `apps/**`.
- [ ] Hard-rules clean across the diff: zero new `eslint-disable`,
      `@ts-ignore`, `@ts-expect-error`, `as any`, `as unknown as`,
      `node:*` imports under any new path.
- [ ] No hand-rolled `fetch(` to api-edge under
      `apps/web-console-next/src/app/(app)/orgs/[orgSlug]/webhooks/**`
      or `apps/web-console-next/src/components/webhooks/**`. All wire
      I/O goes through `@saas/sdk` via `createClient` from
      `src/lib/api.ts`.
- [ ] `whsec_` literal appears ONLY inside
      `apps/web-console-next/src/components/webhooks/rotate-secret-dialog.tsx`
      (docstring is OK) and the test file
      `tests/web-console-next/src/rotate-flow.test.ts` (test fixtures +
      scrub assertion). Zero appearances in
      `webhooks/page.tsx`, `webhooks/[endpointId]/page.tsx`, or any
      toast / error / log / telemetry code path. Greppable evidence
      required.
- [ ] Reveal-once state machine is genuinely binding: read
      `rotate-flow.ts` and confirm (a) `secret` field is only on the
      `revealing` arm of the discriminated union, (b) `closeReveal`
      returns the union to `idle` (or equivalent secret-less state),
      (c) the dialog component does not capture `secret` in a closure
      that outlives the modal. The
      `JSON.stringify(state).includes("whsec_")` test assertion runs
      AFTER `closeReveal` and would fail any regression.
- [ ] Destructive-confirm gating: the confirm dialog requires explicit
      user action before `client.webhooks.rotateSecret` is called; no
      auto-confirm, no skip path. Tests cover this.
- [ ] Sidebar gains exactly one new "Webhooks" entry under
      `Org · {orgSlug}`. No other nav restructuring; no top-level
      additions outside the org scope.
- [ ] Legacy no-encryption-key case (`secret` undefined on response) is
      handled gracefully with a "rotation completed; secret was not
      returned" affordance — no crash, no placeholder string rendered
      as the secret.
- [ ] Component.yaml for `tests/web-console-next` mirrors a
      `turbo-package` shape (3 envs Verify, no deploy lane); does NOT
      pull in deploy lanes for `web-console-next` itself unless
      structurally forced.
- [ ] Quality gates locally:
      - `pnpm install --frozen-lockfile` clean.
      - `pnpm -F @saas/web-console-next typecheck` exit 0.
      - `pnpm -F @saas/web-console-next lint` exit 0.
      - `pnpm -F @saas/web-console-next-tests typecheck` exit 0.
      - `pnpm -F @saas/web-console-next-tests lint` exit 0.
      - `pnpm -F @saas/web-console-next-tests test` 18/18 pass.
      - `pnpm -w typecheck` (full repo) — all green; total workspace
        count consistent with adding +1 vs `main` (~40 workspaces).
      - `pnpm -w --no-bail lint` — 0 errors; warnings ALL pre-existing
        in `tests/api-edge/**` (no new warnings under
        `apps/web-console-next/**` or `tests/web-console-next/**`).
- [ ] Orun gates:
      - `kiox -- orun validate --intent intent.yaml` valid.
      - `kiox -- orun plan --changed --base origin/main --intent intent.yaml --output plan.json`
        selects ONLY `web-console-next` and `web-console-next-tests`
        across {dev,stage,prod} (4 jobs per implementer report;
        confirm).
      - `kiox -- orun run --plan plan.json --dry-run --runner github-actions`
        preview-green for all selected jobs.
- [ ] PR-CI all 5 required lanes SUCCESS via `gh run view --log` (NOT
      just summary). Inspect the `Run orun run \\` step output per
      lane to confirm typecheck/lint/test/build commands actually
      executed.
- [ ] Implementer report is committed on the PR branch.
- [ ] No secrets / plaintext credentials in PR diff or CI logs.

## Non-Goals

- CLI `webhook secrets rotate` subcommand (Task 0110).
- Webhook subscriptions UX, delivery-attempts UX, replay UX (later
  B5 follow-ups).
- Console-side endpoint **creation** UX (out of scope per prompt
  Required Outcome 8 / implementer report Remaining Gaps).
- Cmd-K command-palette entry (deferred per implementer report; not a
  blocker — re-evaluate when other "Rotate {x}" actions land).

## Constraints

1. NEVER merge a PR with failing CI checks.
2. NEVER merge a PR with unresolved verification blockers.
3. If PR is BEHIND `main` at merge time (recurring pattern across
   0103/0104/0105/0106/0107/0108), run `gh pr update-branch 164`,
   wait for fresh PR-CI green at the post-update HEAD, then merge.
   Note: at scope time, PR is CLEAN; this dispatch commit on main
   will likely flip it to BEHIND.
4. After squash merge with `--delete-branch`: checkout `main`,
   `git pull --ff-only origin main`, watch the post-merge main-CI run
   to completion. `web-console-next` ships via Cloudflare Pages
   `cloudflare-pages` composition — confirm the {dev,stage,prod}
   deploy lanes succeed and observe the deployment metadata via
   `wrangler pages deployment list --project-name=web-console-next-{stage,prod}`
   (or equivalent). Console-only — no migration apply lane.
5. Never leave a verifier-created local change unresolved; run
   `git status --short` before declaring PASS bookkeeping.

## Integration Notes

- **Cloudflare Pages deploy lanes.** Unlike Task 0108 (turbo-package
  + db-migrate), this PR's `web-console-next` component ships the
  `cloudflare-pages` composition. Expect 5 PR-CI lanes (plan +
  `web-console-next-tests · dev · Verify` + `web-console-next ·
  {dev,stage,prod} · Verify deploy`). Post-merge main-CI will deploy
  to {dev,stage,prod} Pages projects — confirm via Cloudflare API or
  `wrangler pages deployment list`.
- **Reveal-once is the security-critical invariant.** Spend extra
  time on the state-machine code review. The implementer claims
  type-system enforcement; confirm the discriminated union really
  makes the `secret` field unreachable from non-`revealing` states.
  Check that no `useRef`, no closure, no parent component holds the
  secret across the close transition.
- **`tests/web-console-next` workspace addition.** This is the first
  console-test workspace. Confirm it follows the `tests/contracts`
  precedent rather than introducing a new test-runner pattern.
  `pnpm-lock.yaml` delta should be a small workspace-edge addition,
  not a wholesale rewrite.
- **Live deployment evidence.** Verify the deployed Pages site (stage
  + prod) actually loads the new `/orgs/{orgSlug}/webhooks` route
  successfully (200 / 308→200 / no JS error) post-merge — this is the
  "production-grade basics" check. Use `curl -sIL` against the Pages
  hostname or the `wrangler pages deployment` output to capture
  deployment URL and status.

## Acceptance Criteria

✅ All Required Outcomes checked.
✅ PR-CI all 5 required lanes SUCCESS (`gh run view --log` evidence).
✅ Reveal-once state-machine code review confirms type-system
   enforcement is real (not just a runtime convention).
✅ `whsec_` literal scan clean across the rendered output of all new
   routes — not just the source diff.
✅ Local checks all green (typecheck, lint with no new warnings,
   tests 18/18 pass on the new workspace).
✅ Orun gates green (validate / plan --changed selects only
   web-console-next + web-console-next-tests / dry-run preview-green).
✅ PR squash-merged with `--delete-branch`; main fast-forward pulled;
   post-merge main-CI green including {dev,stage,prod} Pages deploy
   lanes; live deployment evidence captured (Pages deployment URL +
   status); verifier report committed on `main`; `state.json` /
   `current.md` / `task-ledger.md` advanced (Task 0109 → completed,
   `current_task` → `0110`).

## Verification (executable steps)

1. `git fetch origin && git checkout impl/task-0109-webhook-console-reveal-once && git pull --ff-only`.
2. `gh pr view 164 --json title,state,mergeable,mergeStateStatus,headRefOid` — sanity.
3. `gh pr diff 164 --name-only | sort -u` — file boundary check (12
   paths, all under documented subsystems).
4. Hazard scan over the diff:
   ```bash
   git diff origin/main...HEAD -- 'apps/web-console-next/**' 'tests/web-console-next/**' \
     | grep -nE 'eslint-disable|@ts-ignore|@ts-expect-error|as any|as unknown as|^\+.*from .node:'
   ```
   Expect zero hits.
5. SDK seam audit:
   ```bash
   git diff origin/main...HEAD -- 'apps/web-console-next/src/app/(app)/orgs/[orgSlug]/webhooks/**' \
     'apps/web-console-next/src/components/webhooks/**' \
     | grep -nE '^\+.*\bfetch\s*\('
   ```
   Expect zero hits (or only inside test mocks if any).
6. `whsec_` leak scan over rendered surfaces:
   ```bash
   grep -nE 'whsec_' apps/web-console-next/src/app/\(app\)/orgs/\[orgSlug\]/webhooks/*.tsx \
     apps/web-console-next/src/app/\(app\)/orgs/\[orgSlug\]/webhooks/\[endpointId\]/*.tsx \
     2>/dev/null
   ```
   Expect ZERO hits in the page/route files. The only legitimate
   appearance is in `rotate-secret-dialog.tsx` (docstring) and
   `tests/web-console-next/src/rotate-flow.test.ts`.
7. Reveal-once state-machine review: read
   `apps/web-console-next/src/components/webhooks/rotate-flow.ts` end
   to end. Confirm:
   - the discriminated union has `revealing` as the ONLY arm
     carrying `secret`;
   - `closeReveal` (or equivalent transition) returns a union arm
     without `secret`;
   - no exported helper carries the secret across transitions;
   - formatters are pure (no side effects, no global state).
8. Reveal-once dialog review: read
   `apps/web-console-next/src/components/webhooks/rotate-secret-dialog.tsx`
   end to end. Confirm:
   - secret is held in component-local React state only;
   - on close (or unmount), state is reset (defensive `useEffect`
     cleanup is acceptable belt-and-braces);
   - no `sessionStorage`, `localStorage`, query cache, URL, or
     global stash;
   - copy-to-clipboard uses `navigator.clipboard.writeText` (or
     equivalent) directly on the secret value, not on a persisted
     reference;
   - error envelope from `wrap()` does not leak the secret if
     rotation fails partway.
9. List + detail page review: read
   `apps/web-console-next/src/app/(app)/orgs/[orgSlug]/webhooks/page.tsx`
   and `[endpointId]/page.tsx`. Confirm the secret never appears
   outside the dialog (verified via the `whsec_` grep at step 6).
10. Sidebar review: read
    `apps/web-console-next/src/components/shell/sidebar.tsx`. Confirm
    exactly +2 lines (import + entry); no other nav changes.
11. Component.yaml review:
    ```bash
    diff <(yq -P 'sort_keys(..)' tests/contracts/component.yaml) \
         <(yq -P 'sort_keys(..)' tests/web-console-next/component.yaml)
    ```
    Differences should be limited to `name`, `description`, and any
    `dependsOn`. The composition shape (`turbo-package`,
    `starter-shared`, 3 envs Verify, no deploy lane) must match.
12. `pnpm install --frozen-lockfile` (must be clean — confirms the
    lockfile delta in the PR is the minimal new-workspace edge).
13. `pnpm -F @saas/web-console-next typecheck` exit 0.
14. `pnpm -F @saas/web-console-next lint` exit 0.
15. `pnpm -F @saas/web-console-next-tests typecheck` exit 0.
16. `pnpm -F @saas/web-console-next-tests lint` exit 0.
17. `pnpm -F @saas/web-console-next-tests test` — 18/18 pass.
18. `pnpm -w typecheck` (full repo). Expect all workspaces green.
    Record total workspace count (should be +1 vs main).
19. `pnpm -w --no-bail lint`. Expect 0 errors. Warnings should ALL
    be pre-existing under `tests/api-edge/**`. Capture the count
    delta.
20. `kiox -- orun validate --intent intent.yaml`.
21. `kiox -- orun plan --changed --base origin/main --intent intent.yaml --output plan.json`.
    Expected selection: `web-console-next` + `web-console-next-tests`
    only (4 jobs total per implementer report).
22. `kiox -- orun run --plan plan.json --dry-run --runner github-actions`
    — preview green for all selected jobs.
23. `gh pr checks 164 --watch` until all required lanes terminal.
24. For each lane in the PR-CI run (`plan` +
    `web-console-next-tests · dev · Verify` +
    `web-console-next · {dev,stage,prod} · Verify deploy`):
    `gh run view <run-id> --log` and grep for the actual command
    output (typecheck / lint / test / pages deploy). Confirm the
    commands ran (NOT just summary green).
25. If MERGEABLE/CLEAN and all checks green: proceed to merge. If
    BEHIND: `gh pr update-branch 164`, wait for fresh PR-CI green,
    then merge.
26. `gh pr merge 164 --squash --delete-branch`.
27. `git checkout main && git pull --ff-only origin main`.
28. `gh run watch <main-ci-run-id>` (post-merge main-CI). Confirm the
    Pages deploy lanes succeed for {dev,stage,prod}.
29. Live deployment evidence: capture the Pages deployment URL +
    status from the main-CI logs (or via
    `wrangler pages deployment list --project-name=web-console-next-stage`
    and the prod equivalent). Record the deployment ID + version in
    the verifier report.
30. Optional but recommended: `curl -sIL https://<pages-stage-host>/` —
    expect 200 / 308 → 200, no JS error in the HTML body.
31. Write `ai/reports/task-0109-verifier.md` with: Result, Checks,
    CI Log Review, Live Resource Evidence (Pages deployment IDs +
    URLs + status), Reveal-Once Code Review (state-machine + dialog),
    Hazard Scan, Plaintext Leak Scan, Issues, Risk Notes, Spec
    Proposals, Recommended Next Move.
32. Update `ai/state.json` (add `0109` to `completed`, advance
    `current_task` to `0110`, refresh `last_verified`,
    `task_agent` to the final report path), `ai/context/current.md`
    (Task 0109 closed, Task 0110 next), `ai/context/task-ledger.md`
    (append 0109 entry).
33. `git add ai/reports/task-0109-verifier.md ai/context/* ai/state.json
    && git commit -m "ai: Task 0109 verifier PASS — webhook console reveal-once UX merged"
    && git push origin main`.
34. `git status --short` — must be clean.

## PR Creation Requirement

The Implementer has already created the PR (#164). Your job is to
verify and merge it.

## When Done Report

Save to `ai/reports/task-0109-verifier.md` with these sections:

- `Result: PASS` or `Result: FAIL`
- `Checks` — full list of validation steps performed with actual
  outputs (typecheck / lint / test counts; Orun gate results;
  hazard-scan output; SDK-seam audit output; whsec_ leak scan).
- `Reveal-Once Code Review` — state-machine analysis (discriminated
  union arms, transitions, secret reachability) + dialog analysis
  (storage / cache / global stash audit, clipboard pathway, error
  envelope behavior).
- `Hazard Scan` — greppable evidence; zero new
  `eslint-disable`/`@ts-ignore`/`@ts-expect-error`/`as any`/`as
  unknown as`/`node:*` under PR diff.
- `Plaintext Leak Scan` — greppable evidence that `whsec_` appears
  ONLY in `rotate-secret-dialog.tsx` (docstring) and the test file.
- `CI Log Review` — PR-CI run IDs (HEAD `f95befa…` and any
  post-update-branch HEAD), post-merge main-CI run ID, with
  `gh run view --log` evidence per lane (plan + tests · dev · Verify
  + web-console-next · {dev,stage,prod} · Verify deploy).
- `Live Resource Evidence` — Cloudflare Pages deployment IDs + URLs
  + status for {dev,stage,prod}; optional `curl -sIL` 200 evidence
  on the new route.
- `Issues` — any problems found, severity-tagged.
- `Risk Notes` — residual risks (e.g., Cmd-K integration deferred,
  console-side endpoint creation UX still missing, narrow-viewport
  sidebar visual regression risk per implementer's Next Task
  Dependencies note).
- `Spec Proposals` — drift assessment; expected to be empty for
  this task.
- `Recommended Next Move` — Task 0110 (CLI rotate subcommand),
  symmetric and parallel-safe per ledger.
