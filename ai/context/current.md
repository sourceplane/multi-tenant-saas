# Current Context

Last updated: 2026-05-30 (Task 0093 SCOPED — class-B lint cleanup
wave 1, 39 `no-unused-vars` errors across 9 workspaces, prompt at
`ai/tasks/task-0093.md`. `main` tip is `3cdde80` post-Task-0092
verifier squash. Repo health: green.)

## Active task: 0093 — class-B lint cleanup, wave 1

Goal: drive `pnpm -r --no-bail lint` to a clean exit (zero errors
across all 33 lint-bearing workspaces) by mechanically resolving the
39 `@typescript-eslint/no-unused-vars` errors in 9 residual
workspaces. Pure hygiene; warnings (`no-explicit-any`, `no-console`)
stay unchanged. Pre-existing in 3 workspaces, newly surfaced by Task
0092 in 6.

Workspaces and pre-PR error counts (must end at 0):

- `apps/config-worker` — 1 (unused `errorResponse` import)
- `apps/metering-worker` — 2 (unused `RecordUsageRequest`,
  `ListQuotaViolationsResponse` imports)
- `apps/projects-worker` — 1 (unused `CreateProjectRequest` import)
- `tests/db` — 10 (unused repo/type imports + 2 unused
  `projectMigrations` locals)
- `tests/identity-worker` — 2 (unused `encodeCursor` import + unused
  `userId` local)
- `tests/membership-worker` — 7 (unused `parseMemberPublicId` import +
  6 unused locals)
- `tests/projects-worker` — 7 (unused contract-type imports + unused
  `mockFn`)
- `tests/webhooks-worker` — 8 (unused contract / type imports +
  unused `attemptCounter`, `projectPublicId`)
- `tests/policy-worker` — 1 (unused `body` destructure)

Authorized fix vocabulary (no other patterns allowed):

- Delete unused imports / locals / declarations outright when
  nothing references them.
- `_`-prefix rename when the identifier must remain for shape /
  positional / harness reasons (the shared rule baseline at
  `tooling/eslint/index.js` honours `argsIgnorePattern: "^_"`).

Hard out-of-scope (would FAIL verification):

- Editing `tooling/eslint/index.js` (shared rule baseline).
- Editing any `eslint.config.js` re-export (must keep Task 0092
  canonical 2-line shape).
- Touching `pnpm-lock.yaml`, any `package.json`, `intent.yaml`,
  `component.yaml`, `wrangler.*`, `kiox.lock`, `infra/**`,
  `infra/terraform/cloudflare-domain/**`, the `cloudflare ~> 4.52`
  pin, or any `packages/**` source.
- `// eslint-disable*` comments.
- Behavioural changes in any prod handler — the 4 production-source
  errors are all top-level imports / response helpers and must stay
  import-level edits.
- `no-explicit-any` warning cleanup (separate future task if ever
  taken).

Prompt: `ai/tasks/task-0093.md`. Branch:
`impl/task-0093-lint-cleanup-wave-1`.

### Deferred (orchestrator skips, loop keeps moving)

1. **Real notifications provider swap** (Resend / Postmark / SES) —
   waiting on user provider choice. The adapter seam in
   `apps/notifications-worker/src/providers/` is ready and is now
   safety-unblocked by Task 0090's idempotency-key population.
2. **Task 0085b — cloudflare-domain v4 → v5 + re-import** — explicit
   user defer.
3. **`notifications-worker-dev` provisioning + dev binding (REFRAMED
   as `notifications-worker-dev-reframe`)** — needs a "dev-deploy
   lane" design pass before the dev-binding work has anywhere to
   land.

### Next-task candidates after 0093 (PASS)

1. **B3 — Edge idempotency and rate limiting** (specs/roadmap.md:54).
   Generalize idempotency at `api-edge` for unsafe POSTs;
   `idempotency-key` is already in `cors.ts`
   Access-Control-Allow-Headers but not yet in `packages/contracts`
   as a contract or wired through the edge. Builds directly on Task
   0090's caller-side idempotency keys for the V1 notifications
   path.
2. Real notifications provider swap (when user names a provider).
3. Dev-deploy lane design pass (the reframed
   `notifications-worker-dev` work).
4. Optional class-B warning cleanup wave (`no-explicit-any`) if user
   wants the deeper hygiene push.
5. Revive Task 0085b when defer lifts.

## Repo health: green

Apex hostnames `stage.sourceplane.ai` and `prod.sourceplane.ai` live on
the original Cloudflare Workers custom-domain attachments (stage id
`052eaece5e989d5a7280b6c206e562c42950e3a6`, prod id
`31e5f2ed1b1e4a5700e8ae0678846a0d753840e1`). Provider pin holds at
`cloudflare ~> 4.52` (Task 0085b deferred). `kiox.lock` pinned at orun
v2.9.0. `main` tip on `origin/main` is `3cdde80` (post Task 0092
verifier squash + verifier artifacts).

Workspace-wide `pnpm -r typecheck` exits 0 cleanly on a clean
checkout (Task 0091 outcome — holds through 0092). Workspace-wide
`pnpm -r --no-bail lint` reaches every lint-bearing workspace
(33/33 — Task 0092 outcome); residual non-zero exits are 9 class-B
rule-violation workspaces with 39 errors total (the explicit Task
0093 target). No class-A "couldn't find an eslint.config" failures
remain.

Notifications-worker V1 stays deployed on stage + prod (private,
`workers_dev: false`, `NOTIFICATIONS_PROVIDER=local-debug`). All
three V1 callers populate `idempotencyKey` on enqueue (Task 0090):

- identity-worker prod fires `auth.magic_link` with
  `idempotencyKey = auth.magic_link:${challengeId}`.
- membership-worker prod fires `invitation.created` with
  `idempotencyKey = invitation.created:${invitationPublicId(inv.id)}`.
- membership-worker prod fires `invitation.accepted` with
  `idempotencyKey =
  invitation.accepted:${invitationPublicId(inv.id)}:${memberPublicId(member.id)}`.

A retry of the same logical event collapses to one notification row
+ one provider attempt. Real provider swap is unblocked from a safety
standpoint.

## Recently completed — Task 0092 (ESLint v9 flat-config scaffold, PASS)

- **PR #140** (`impl/task-0092-eslint-config-scaffold`), squash
  `fde9723` at 2026-05-30. Files: 16 new `<workspace>/eslint.config.js`
  (canonical 2-line re-export of `tooling/eslint/index.js`) at
  `apps/{billing,config,events,metering,policy,projects,webhooks}-worker`,
  `packages/policy-engine`, and
  `tests/{billing,config,events,metering,policy-engine,policy,projects,webhooks}-worker`,
  plus implementer + verifier reports.
- PR-CI rollup: 31/31 SUCCESS at merge time (`mergeable: MERGEABLE`,
  `mergeStateStatus: CLEAN`).
- Post-merge main-CI run: `26669593757` = 31/31 SUCCESS on SHA
  `fde9723d`.
- Verifier-validated: `pnpm install --frozen-lockfile` exit 0;
  `grep -c "couldn't find an eslint.config" /tmp/lint-0092-verify.log`
  = 0 (class-A fully eliminated); `pnpm -r typecheck` exit 0;
  kiox/orun triple ✓ (plan id `06f7adbe00f9`, 30 jobs); zero diff on
  `tooling/eslint/index.js`; zero diff on `pnpm-lock.yaml`; zero
  secrets in any added file.
- Durable outcome: `pnpm -r --no-bail lint` now reaches every
  lint-bearing workspace. Residual class-B (rule-violation) surface
  on 9 workspaces is the explicit Task 0093 feed: 3 pre-existing
  (`tests/{db,identity-worker,membership-worker}`) + 6 newly surfaced
  (`apps/{config,metering,projects}-worker`,
  `tests/{policy,projects,webhooks}-worker`).
- Reports: `ai/reports/task-0092-implementer.md`,
  `ai/reports/task-0092-verifier.md`.

## Recently completed — Task 0091 (tests typecheck baseline, PASS)

- **PR #139** (`impl/task-0091-tests-typecheck-baseline`), squash
  `9081cff` at 2026-05-30. Files: `tests/identity-worker/tsconfig.json`
  (`lib += ["DOM"]`), `tests/policy-engine/tsconfig.json` (drop
  `"node"` from `compilerOptions.types`), ai/ reports.
- PR-CI run `26668674054` 3/3 SUCCESS.
- Post-merge main-CI run `26668839091` = 3/3 SUCCESS.
- Verifier-validated jest counts: 122/122 identity-worker-tests,
  177/177 policy-engine-tests (no regression).
- Workspace-wide `pnpm -r typecheck` exits 0 cleanly — first time on
  this repo.
- Reports: `ai/reports/task-0091-implementer.md`,
  `ai/reports/task-0091-verifier.md`.

## Recently completed — Task 0090 (V1 notifications idempotency-key population, PASS)

- **PR #138** (`impl/task-0090-notifications-idempotency-keys`),
  squash `a5aa47d` at 2026-05-29T23:53:44Z. Reports:
  `ai/reports/task-0090-{implementer,verifier}.md`.

## Recently completed — Task 0089 (shared notifications-client + accept-invitation invitation.accepted, PASS)

- **PR #137** (`impl/task-0089-shared-notifications-client`), squash
  `8d4eb26` at 2026-05-29T22:45:34Z. Reports:
  `ai/reports/task-0089-{implementer,verifier}.md`.

## Recently completed — Task 0088 (membership → notifications invitation.created wire, PASS)

- **PR #136** (`impl/task-0088-membership-notifications-wire`), squash
  `d9968ad` at 2026-05-29T19:59:13Z. Reports:
  `ai/reports/task-0088-{implementer,verifier}.md`.

## Deferred — Task 0085b (cloudflare-domain v4 → v5, Phase 2)

User has explicitly deferred 0085b. The narrow Terraform-tracking risk
window from Task 0085a remains open: the two live custom-domain
attachments are **not** Terraform-managed between the 0085a merge and
the eventual 0085b apply. Mitigation: no manual Cloudflare-dashboard
or wrangler edits to those attachments while 0085b is parked. Tasks
0086, 0087, 0088, 0089, 0090, 0091, and 0092 were verified post-merge
to NOT touch `infra/terraform/cloudflare-domain/**` so the window does
not widen. Task 0093 prompt explicitly preserves the same boundary.

## Orchestrator Policy — Deferred Decision Protocol

Per `agents/orchestrator.md`, candidates that would require human input
are **deferred to `/ai/deferred.md`** instead of pausing the loop.
`waiting_for_input` only flips to `"true"` if EVERY candidate is
genuinely blocked on a human decision. Currently deferred:

- Real notifications provider swap (Resend / Postmark / SES) —
  awaiting user provider choice.
- Task 0085b cloudflare-domain v4→v5 + import — explicit user defer.
- `notifications-worker-dev-reframe` — needs dev-deploy lane design.

## Roadmap Position

- Baseline cluster: B2 (notifications worker) shipped in Task 0086.
- B1 (real auth) progressed through Tasks 0087–0090. All three V1
  callers are now wired AND idempotency-hardened. Real provider swap
  is unblocked from a safety standpoint when the user picks a
  provider.
- Task 0091 cleared workspace typecheck baseline. Task 0092 cleared
  workspace ESLint config baseline. Task 0093 closes the remaining
  class-B `no-unused-vars` error surface so `pnpm -r lint` exits 0
  before the next big leap (B3 edge idempotency, U-cluster polish,
  or the deferred provider swap).

## Repo Reality

- Tasks 0001–0092 verified and merged (96 entries on the completed
  list).
- Task 0085 split into 0085a (Phase 1, DONE) + 0085b (Phase 2,
  EXPLICITLY DEFERRED by user).
- Task 0093 SCOPED, prompt at `ai/tasks/task-0093.md`, awaiting
  implementer.
- Active spec pack: reusable SaaS starter under `specs/**`.
- Console is live at `https://{stage,prod}.sourceplane.ai` (307 →
  `/orgs`).
- Notifications-worker V1 is internal-only, deployed on stage/prod;
  identity-worker prod (`auth.magic_link` + idempotencyKey),
  membership-worker prod (`invitation.created` + idempotencyKey),
  and membership-worker prod (`invitation.accepted` +
  idempotencyKey) are all live callers (local-debug provider).
- All three callers consume `@saas/notifications-client` workspace
  package; per-worker `notifications-client.ts` copies are deleted.
- 33/33 lint-bearing workspaces ship a working `eslint.config.js`
  (Task 0092 closed the 16-workspace gap). Workspace-wide
  `pnpm -r --no-bail lint` reaches every workspace; residual non-zero
  exits are 9 class-B rule-violation workspaces with 39
  `no-unused-vars` errors total (Task 0093 target).
