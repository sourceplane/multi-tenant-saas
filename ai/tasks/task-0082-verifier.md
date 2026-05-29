# Task 0082 — Verifier

Agent: Verifier

## Current Repo Context

- Task 0082 (Implementer) opened PR #125
  (`impl/task-0082-web-console-next`) at `https://github.com/sourceplane/multi-tenant-saas/pull/125`.
- The PR introduces a greenfield Next.js 15 (App Router) web console at
  `apps/web-console-next/` alongside the existing vanilla `apps/web-console`.
  The old console is unmodified.
- Implementer report: `ai/reports/task-0082-implementer.md`. 12 Playwright
  screenshots are claimed under `ai/reports/task-0082-shots/`.
- **PR CI is RED.** Run `26622616478` shows `plan = SUCCESS` and all three
  `web-console-next · {dev,stage,prod} · Verify deploy` jobs = `FAILURE`.
  Stage/prod fail because dev fails (dependency block); the root failure is
  on `web-console-next · dev · Verify deploy`.
- Root cause from the dev verify-deploy log:
  - `Error occurred prerendering page "/demo".`
  - `TypeError: Cannot read properties of undefined (reading 'url')` thrown
    inside `useMemo` during the static export of `/demo`.
  - The build aborts with `Export encountered an error on /demo/page: /demo,
    exiting the build.` and `pnpm run build` exits 1.
  - This is the canonical Next.js 15 App Router pattern of calling a
    navigation hook (`useSearchParams`, `useRouter`, `usePathname`) at the
    top of a client component that gets statically prerendered without a
    `<Suspense>` boundary, or rendering a component that reads
    `window.location` / `document` inside a `useMemo` at module evaluation
    time. See https://nextjs.org/docs/messages/prerender-error and
    https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout.
- Tasks 0079, 0080, 0081 are merged on `main`
  (PRs #122 / #123 / #124). The entitlement quota gates for projects,
  members, and environments are live. No quota work blocks 0082.

## Objective

Verify PR #125 against Task 0082's acceptance criteria AND get PR CI green.
PASS requires both verification PASS and PR CI green; the verifier MUST
NOT merge with `web-console-next · * · Verify deploy = FAILURE`.

The verifier is empowered to commit a **scoped, surgical fix** to the PR
branch for the `/demo` prerender failure (the recurring "small verifier
fix on the PR branch" pattern used through Tasks 0027, 0031–0034, 0052,
0055, 0059, 0078). The fix may not expand scope, may not touch any worker
/ contract / db / policy / api-edge / Terraform file, and must be a
single coherent commit on the PR branch with a one-line rationale.

If the failure can be resolved by **either** of these minimal options the
verifier should prefer it without enlarging the diff:

1. Wrap the offending hook usage in `/demo/page.tsx` (or whichever
   client component is invoked under `/demo`) with `<Suspense fallback={...}>`,
   per Next.js 15 guidance for `useSearchParams` and friends.
2. Force the `/demo` route to render dynamically by adding
   `export const dynamic = "force-dynamic"` (and/or
   `export const runtime = "edge"` if appropriate) at the top of the route,
   so it is not statically prerendered at build time. This is acceptable
   because `/demo` is a screenshot/preview surface only — the implementer
   report names it as the location of the four `precondition_failed`
   shape examples.

If neither lands cleanly within ~one focused pass, FAIL the PR with a
clear blocker pointing at this root cause and leave the PR open.

## PR Boundary For The Verifier

The verifier's allowed in-PR-branch changes (if any) are:

1. The minimal `/demo` prerender fix described in the Objective.
2. Adding the implementer report and/or the verifier report to the PR
   branch if either is missing on the branch at merge time (recurring
   "implementer report not committed to PR" pattern).
3. Re-running CI by pushing the above to the PR branch.

The verifier MUST NOT:

- Modify any file outside `apps/web-console-next/**`.
- Modify any worker, any package in `packages/contracts`, any migration,
  any policy/billing/events behavior, any Terraform under
  `infra/terraform/**`, or `apps/api-edge`.
- Modify the existing `apps/web-console/**`.
- Add new dependencies beyond what is already in `package.json` for the
  new app.
- Re-point Cloudflare Pages projects.

## Read First

- `ai/tasks/task-0082.md` — the implementer task contract, especially
  acceptance criteria, constraints, and the "designed precondition_failed
  UX" requirement.
- `ai/reports/task-0082-implementer.md` — implementer self-report,
  including the parity-matrix claim and the 12 screenshot index.
- `apps/web-console-next/README.md` — parity-status table (verifier
  should spot-check at least three rows).
- `apps/web-console-next/component.yaml` — Orun composition,
  `environmentBuildVar: NEXT_PUBLIC_DEPLOY_ENV`, per-env Pages projects.
- `specs/components/12-web-console.md` — agent freedom on framework,
  design system, deploy model.
- `specs/constitution.md` — extraction seams, API/CLI/UI parity rule.
- `ai/context/current.md` — current entitlement `precondition_failed`
  reason codes and the cutover-stays-out-of-scope framing.
- `agents/orchestrator.md` Verifier Standard and Verifier Merge Protocol.

## Required Outcomes

- [ ] PR #125 mergeStateStatus is `CLEAN` at merge time.
- [ ] Every CI check on PR #125 head SHA = SUCCESS, in particular all
      three `web-console-next · {dev,stage,prod} · Verify deploy` jobs.
- [ ] `apps/web-console` (the old vanilla console) is byte-identical on
      the PR branch — `git diff origin/main..HEAD -- apps/web-console` is
      empty. The verifier must assert this.
- [ ] No worker, contract, db, policy, api-edge, or Terraform file is
      modified by this PR.
- [ ] The implementer report is committed to the PR branch (commit it
      from the verifier if missing).
- [ ] Screenshot directory `ai/reports/task-0082-shots/` exists with at
      least the screenshots listed in the implementer report.
- [ ] `PreconditionInsight` (or equivalent) renders four distinct shapes
      for `limit_reached`, `disabled`, `not_configured`, `malformed_limit`
      — confirmed via the screenshots and a code spot-check.
- [ ] Cmd-K palette is wired globally (one code spot-check).
- [ ] At least three create flows are wired through Zod schemas tied to
      `packages/contracts`. (Implementer claims five: orgs, projects,
      environments, invitations, API keys.) Spot-check two.
- [ ] URL is the source of truth for org/project/env scope; no
      `sessionStorage`-based routing in the new app. Spot-check with
      `search_files target='content' pattern='sessionStorage'
      path='apps/web-console-next'`.
- [ ] Verifier report committed at `ai/reports/task-0082-verifier.md`
      with the required sections.

## Non-Goals

- Cutover from `apps/web-console` to `apps/web-console-next` is a
  follow-up task (Task 0083 candidate). Do not switch Pages projects to
  the new app.
- No production deploy verification beyond CI verify-deploy is required.
- No A11y audit, no Lighthouse score requirement, no visual regression
  suite.

## Constraints

1. PR must be merged only when both verification PASS and all required
   CI checks are SUCCESS. A PR with `precondition_failed = FAILURE` or
   `web-console-next · * · Verify deploy = FAILURE` MUST stay open.
2. Verifier fixes on the PR branch must remain within
   `apps/web-console-next/**` and `ai/reports/**` and `ai/tasks/**`.
3. No secret material, full bearer tokens, or live credentials may
   appear in the verifier report, screenshots audit, or any committed
   file. The bearer-token paste affordance in the new app must redact on
   display — spot-check the relevant component.
4. The old `apps/web-console` must remain buildable and unchanged.

## Acceptance Criteria

✅ PR #125 CI rollup is all-green at merge time. In particular:
   - `plan` = SUCCESS
   - `web-console-next · dev · Verify deploy` = SUCCESS
   - `web-console-next · stage · Verify deploy` = SUCCESS
   - `web-console-next · prod · Verify deploy` = SUCCESS

✅ Local replay passes if attempted:
```bash
pnpm install
pnpm --filter @saas/web-console-next typecheck
pnpm --filter @saas/web-console-next lint
pnpm --filter @saas/web-console-next build
pnpm --filter @saas/web-console typecheck   # old console still healthy
pnpm --filter @saas/web-console build       # old console still healthy
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
```

✅ `git diff origin/main..HEAD -- apps/web-console` is empty.

✅ `search_files` confirms zero matches for `sessionStorage` used as a
   navigation source under `apps/web-console-next/src/`.

✅ Implementer report is committed to the PR branch.

✅ If PASS: PR #125 squash-merged, local `main` fast-forwarded, branch
   cleaned up.

✅ If FAIL: PR #125 left open with explicit blockers in the verifier
   report. The `/demo` prerender failure must be named as the
   primary blocker if it remains.

## Verification

1. Read the implementer report and parity table.
2. Reproduce or inspect the failing CI log (run `26622616478`) to
   confirm the root cause is the `/demo` prerender `TypeError: Cannot
   read properties of undefined (reading 'url')` inside `useMemo`.
3. Apply the minimal fix described in the Objective (Suspense wrapper
   OR `export const dynamic = "force-dynamic"`), commit + push to
   `impl/task-0082-web-console-next` with a one-line rationale.
4. Wait for fresh CI to go green. If it doesn't, FAIL.
5. Spot-check: `PreconditionInsight` reason coverage; Cmd-K wiring;
   one Zod-driven create form; URL scope routing; old console
   untouched; no secret leak in code/report.
6. Confirm `mergeStateStatus = CLEAN` and merge via squash.
7. Local: `git checkout main && git pull --ff-only origin main`.
8. Write the verifier report.

## PR Creation Requirement

The Implementer has already created the PR (#125). Your job is to verify
it, optionally apply a scoped fix to its branch, and merge it when both
verification and CI are green.

## When Done Report

Write `ai/reports/task-0082-verifier.md` with:

- `Result: PASS` or `Result: FAIL`
- `Summary`
- `Checks` (table mirroring Task 0080/0081 verifier reports)
- `CI Log Review` (must name the specific failing/green job and run IDs)
- `Verifier Fix` (if any: one-line rationale + commit SHA on the PR
  branch)
- `Secret Handling Review`
- `Issues`
- `Risk Notes`
- `Spec Proposals`
- `Live Resource Evidence` (Pages preview URLs if the build produced
  them; otherwise note CI verify-deploy is the evidence)
- `Recommended Next Move` (likely: scope Task 0083 = cutover from
  `apps/web-console` to `apps/web-console-next`, behind a Pages
  project rename or domain split)
- `PR Number`
