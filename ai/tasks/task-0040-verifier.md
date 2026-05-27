# Task 0040 Verifier

# Agent

Verifier

# Current Repo Context

Task 0040 is active for PR #81:

`https://github.com/sourceplane/multi-tenant-saas/pull/81`

Branch:

`codex/task-0040-web-console-live-ui`

Task 0040 replaces the web-console scaffold with a live-test console and adds
minimal api-edge CORS support so the Cloudflare Pages UI can exercise the
current public API in stage and prod.

An earlier verifier report held the PR because invitation acceptance called the
wrong route. The implementer report now includes a "Verifier Fix" note claiming
the client was updated from:

`POST /v1/invitations/accept`

to the existing org-scoped contract:

`POST /v1/organizations/{orgId}/invitations/accept`

Your job is to independently verify the fix, verify PR #81, merge it if it
passes, then verify the live console after the main-branch deploy completes.

# Read First

- `ai/tasks/task-0040.md`
- `ai/tasks/task-0040-fix.md`
- `ai/reports/task-0040-implementer.md`
- `ai/reports/task-0040-verifier.md` if present
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `specs/components/12-web-console.md`
- `specs/contracts/api-guidelines.md`
- `apps/web-console/src/api.ts`
- `apps/web-console/src/main.ts`
- `apps/web-console/src/style.css`
- `apps/web-console/component.yaml`
- `apps/api-edge/src/cors.ts`
- `apps/api-edge/src/index.ts`
- `apps/api-edge/src/org-facade.ts`
- `tests/api-edge/src/cors.test.ts`
- `tests/api-edge/src/org-facade.test.ts`

# Verification Scope

Verify exactly Task 0040 plus its verifier-required fix. Do not expand scope
into new console modules, identity security-event implementation, API keys,
billing, usage, webhooks, notification settings, admin/support, custom domains,
or unrelated docs cleanup.

# Required Checks Before Merge

1. Confirm PR #81 is open, targets `main`, and uses branch
   `codex/task-0040-web-console-live-ui`.
2. Inspect the PR diff and confirm it stays inside the Task 0040 boundary:
   web-console, api-edge CORS integration, focused api-edge CORS tests,
   component smoke command, and task/report files.
3. Confirm the invitation acceptance bug is fixed:
   - `rg "/v1/invitations/accept" apps/web-console/src` returns no matches.
   - `ApiClient.acceptInvitation` requires `orgId`.
   - `handleAcceptInvitation` refuses to call the API without a selected org.
   - the web-console calls `/v1/organizations/{orgId}/invitations/accept`.
   - api-edge still exposes the org-scoped route; do not accept a new global
     `/v1/invitations/accept` backend route.
4. Run local verification:
   - `pnpm --filter @saas/web-console typecheck`
   - `pnpm --filter @saas/web-console lint`
   - `pnpm --filter @saas/web-console build`
   - `pnpm --filter @saas/api-edge typecheck`
   - `pnpm --filter @saas/api-edge-tests test`
   - `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`
   - `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json`
   - `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions`
5. Inspect GitHub Actions, not just status summaries:
   - find the latest PR #81 CI run after the verifier-fix commit;
   - confirm every check is successful;
   - inspect logs for the plan, web-console verify jobs, api-edge verify jobs,
     api-edge-tests, and any smoke command output.
6. Locally verify CORS behavior in code/tests. Pre-merge live CORS against
   deployed stage/prod may still reflect the old deployment; do not fail solely
   because live CORS is not updated before merge.

# Browser/UI Verification Before Merge

Run the web-console locally and inspect it at desktop and mobile widths.

Verify:

- it is the app surface, not a marketing or scaffold page;
- no primary text or controls overlap;
- stage/prod target selector is visible and understandable;
- auth form, manual token import, organization list/create, invitation,
  project/environment, and audit tabs render without blank primary states;
- no bearer token is exposed in URLs, reports, logs, or screenshots.

Prefer Browser/Playwright screenshots if available. Record the viewports used.

# Merge Protocol

If the local checks, PR diff review, route-fix verification, UI check, and PR CI
log inspection all pass:

1. Merge PR #81 using the repo's normal squash-merge flow.
2. Check out `main`.
3. Fast-forward local `main` from `origin/main`.
4. Wait for the post-merge main CI run to complete.
5. Inspect the main CI logs for:
   - web-console stage/prod deploy jobs;
   - api-edge stage/prod deploy jobs;
   - smoke command output;
   - any relevant Orun plan/run evidence.

If any blocker remains, do not merge. Leave PR #81 open and write a FAIL report
with exact file/line references and commands.

# Required Live Verification After Deploy

After the main-branch deploy completes, verify the live deployed console and
public APIs.

Live URLs:

- Console: `https://sourceplane-web-console.pages.dev/`
- Stage API: `https://api-edge-stage.rahulvarghesepullely.workers.dev`
- Prod API: `https://api-edge-prod.rahulvarghesepullely.workers.dev`

Required stage checks:

1. `GET /health` returns `status: "ok"` for stage.
2. Browser CORS preflight from `https://sourceplane-web-console.pages.dev`
   succeeds against stage for at least:
   - `/v1/auth/session`
   - `/v1/organizations`
   - `/v1/organizations/{orgId}/invitations/accept` when you have an org ID
3. Load the live Pages console, select stage, and complete an end-to-end
   non-secret test flow:
   - login/start with debug code;
   - login/complete;
   - create or select a clearly named test organization;
   - create/list a project;
   - create/list/fetch/archive an environment;
   - view organization audit entries;
   - log out.
4. Archive any stage resources the public API supports archiving. Record IDs
   only when non-secret.

Required prod checks:

1. `GET /health` returns `status: "ok"` for prod.
2. Browser CORS preflight from `https://sourceplane-web-console.pages.dev`
   succeeds against prod for at least:
   - `/v1/auth/session`
   - `/v1/organizations`
3. Load the live Pages console, select prod, and verify:
   - the prod target is clearly selected;
   - `login/start` returns `delivery.mode: "email"` and does not expose
     `delivery.code`;
   - manual token import UI is available for prod-safe testing;
   - if a valid prod bearer token is already available through a secure local
     workflow, use it to run non-mutating session and organization-list checks.
4. Do not create or mutate prod tenant data unless there is an existing,
   approved prod test fixture and you can keep the action non-destructive or
   reversible. Lack of a prod bearer token is not a blocker if prod console
   load, prod API health, prod CORS, and prod-safe login/manual-token behavior
   are verified and documented.

# Report Requirements

Write or replace `/ai/reports/task-0040-verifier.md`.

Use this structure:

- `Result: PASS|FAIL`
- `Summary`
- `Checks`
- `PR Review`
- `GitHub Actions Evidence`
- `Live Stage Verification`
- `Live Prod Verification`
- `Issues`
- `Risk Notes`
- `Spec Proposals`
- `Recommended Next Move`
- `PR Number`

For PASS, include:

- PR #81 merge commit SHA;
- post-merge main CI run ID;
- Cloudflare Pages live URL;
- stage/prod API health observations;
- CORS preflight observations;
- a concise account of live console verification for both stage and prod.

For FAIL, include:

- exact blocker;
- file and line references where applicable;
- whether PR #81 remains open;
- what the next implementer must fix.

# State Updates

If PASS:

- update `ai/state.json`:
  - add `"0040"` to `completed`;
  - set `current_task` to `null`;
  - set `repo_health` to `"green"`;
  - set `next_focus` to the next orchestrator-selected focus or `"none"`;
  - set `task_agent` to `/ai/reports/task-0040-verifier.md`;
  - record post-merge run and live verification notes.
- update `ai/context/current.md`, `ai/context/task-ledger.md`,
  `ai/context/decisions.md`, and `ai/context/open-risks.md` with the durable
  outcome and remaining gaps.
- keep `ai/waiting_for_input.md` as no input requested.

If FAIL:

- keep `current_task` as `"0040"`;
- set `repo_health` to `"yellow"` or `"red"` based on severity;
- set `task_agent` to `/ai/reports/task-0040-verifier.md`;
- update compact context with the blocker and leave PR #81 open.

Do not stage, commit, or push unrelated local historical task/report files.
