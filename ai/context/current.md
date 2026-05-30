# Current Context

Last updated: 2026-05-30 (Task 0092 VERIFIED + MERGED at `fde9723`,
post-merge main-CI `26669593757` 31/31 SUCCESS; orchestrator awaiting
next-task selection. Leading candidate: Task 0093 — class-B lint
cleanup wave 1.)

## Active task: awaiting next orchestrator scope

No task currently in flight. The orchestrator selects the next task
on the next loop turn from the candidates listed below.

### Leading candidate: Task 0093 — class-B lint cleanup, wave 1

Goal: drive `pnpm -r --no-bail lint` to a clean exit by fixing
mechanical rule violations (`no-unused-vars` /
`@typescript-eslint/no-unused-vars`) in the 9 workspaces that exit
non-zero today. Task 0092 turned these from "config missing" into
"actual rule errors visible," making this the natural follow-up.

Workspaces with residual class-B errors:
- Pre-existing: `tests/db`, `tests/identity-worker`,
  `tests/membership-worker`.
- Newly surfaced by 0092 scaffold: `apps/config-worker`,
  `apps/metering-worker`, `apps/projects-worker`,
  `tests/policy-worker`, `tests/projects-worker`,
  `tests/webhooks-worker`.

Architect intent if scoped: smallest-diff `_unused` prefixing or
local removal — no shared rule baseline edits, no production-source
behaviour changes, no test-source semantic changes (purely lexical
rename for unused identifiers). Almost certainly fits in a single PR
or two waves.

### Deferred (orchestrator skips, loop keeps moving)

1. **Real notifications provider swap** (Resend / Postmark / SES) —
   waiting on user provider choice. The adapter seam in
   `apps/notifications-worker/src/providers/` is ready and is now
   safety-unblocked by Task 0090's idempotency-key population.
2. **Task 0085b — cloudflare-domain v4 → v5 + re-import** — explicit
   user defer.
3. **`notifications-worker-dev` provisioning + dev binding (REFRAMED
   as `notifications-worker-dev-reframe`)** — needs a "dev-deploy lane"
   design pass before the dev-binding work has anywhere to land.

### Next-task candidates after 0092 (PASS)

1. ESLint v9 rule-violation cleanup (the natural follow-up — fix the
   class-B errors that 0092 surfaces, e.g. tests/identity-worker
   `no-unused-vars`, tests/db `no-unused-vars`, plus whatever the
   newly-scaffolded workspaces surface).
2. **B3 — Edge idempotency and rate limiting** (specs/roadmap.md:54).
   Generalize idempotency at `api-edge` for unsafe POSTs;
   `idempotency-key` is already in `cors.ts` Access-Control-Allow-Headers
   but not yet in `packages/contracts` as a contract or wired through
   the edge. The named open risk ("duplicate POST creates duplicate
   pending invitations") is what Task 0090's caller-side idempotency
   keys mitigated for V1 notifications; B3 generalizes the same
   pattern at the edge for all unsafe POSTs.
3. Real notifications provider swap (when user names a provider).
4. Dev-deploy lane design pass (the reframed
   `notifications-worker-dev` work).
5. Revive Task 0085b when defer lifts.

## Repo health: green

Apex hostnames `stage.sourceplane.ai` and `prod.sourceplane.ai` live on
the original Cloudflare Workers custom-domain attachments (stage id
`052eaece5e989d5a7280b6c206e562c42950e3a6`, prod id
`31e5f2ed1b1e4a5700e8ae0678846a0d753840e1`). Provider pin holds at
`cloudflare ~> 4.52` (Task 0085b deferred). `kiox.lock` pinned at orun
v2.9.0. `main` tip on `origin/main` is `fde9723` (post Task 0092
squash merge).

Workspace-wide `pnpm -r typecheck` exits 0 cleanly on a clean
checkout (Task 0091 outcome — holds through 0092). Workspace-wide
`pnpm -r --no-bail lint` now reaches every lint-bearing workspace
(33/33 — Task 0092 outcome); residual non-zero exits are 9 class-B
rule-violation workspaces (Task 0093 candidate), no longer the
config-bootstrap (class-A) class.

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
  `tests/{billing,config,events,metering,policy-engine,policy,projects,
  webhooks}-worker`, plus implementer + verifier reports.
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
0086, 0087, 0088, 0089, 0090, and 0091 were verified post-merge to
NOT touch `infra/terraform/cloudflare-domain/**` so the window does
not widen.

## Orchestrator Policy — Deferred Decision Protocol

Per `agents/orchestrator.md`, candidates that would require human input
are **deferred to `/ai/deferred.md`** instead of pausing the loop.
`waiting_for_input` only flips to `"true"` if EVERY candidate is
genuinely blocked on a human decision. Currently deferred:

- Real notifications provider swap (Resend / Postmark / SES) —
  awaiting user provider choice. Notifications-worker stays on
  `local-debug`; Task 0090 V1 idempotency hardening keeps the
  eventual swap safe.
- Task 0085b cloudflare-domain v4→v5 + import — explicit user defer.
- `notifications-worker-dev-reframe` — needs dev-deploy lane design.

## Roadmap Position

- Baseline cluster: B2 (notifications worker) shipped in Task 0086.
- B1 (real auth) progressed through Tasks 0087–0090. All three V1
  callers are now wired AND idempotency-hardened. Real provider swap
  is unblocked from a safety standpoint when the user picks a
  provider.
- Task 0091 cleared workspace typecheck baseline. Task 0092 clears
  workspace ESLint config baseline. Together they restore `pnpm -r
  typecheck` and `pnpm -r lint` to "fails only on real problems"
  before the next big leap (B3 edge idempotency, U-cluster polish, or
  the deferred provider swap).

## Repo Reality

- Tasks 0001–0092 verified and merged (96 entries on the completed
  list).
- Task 0085 split into 0085a (Phase 1, DONE) + 0085b (Phase 2,
  EXPLICITLY DEFERRED by user).
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
  exits are 9 class-B rule-violation workspaces (Task 0093 feed).
