# Current Context

Last updated: 2026-05-30 (Task 0091 SCOPED — orchestrator pick after
Task 0090 close-out. Repo health 🟢 green, main `a5aa47d`,
post-merge main-CI `26668188122` 13/13 SUCCESS.)

## Active task: 0091 — Tests typecheck baseline cleanup

Prompt: `ai/tasks/task-0091.md`. Implementer agent.

Make `pnpm -F @saas/identity-worker-tests typecheck` and
`pnpm -F @saas/policy-engine-tests typecheck` exit 0 on a clean
checkout. Two pre-existing typecheck failures reproduce on `main @
a5aa47d`:

- 13× TS2339 `Property 'crypto' does not exist on type 'typeof
  globalThis'` across `tests/identity-worker/src/{auth-service,
  envelope,profile,resolve-bearer,security-events}.test.ts`.
- 1× TS2688 `Cannot find type definition file for 'node'` in
  `tests/policy-engine`.

These have been called out as out-of-scope on every recent task. They
are local noise that contaminates `pnpm -r typecheck`; cleaning them
unblocks a workspace-wide typecheck-clean baseline before any larger
refactor.

PR Boundary: tests-only. `tests/identity-worker/{tsconfig.json,package.json}`
and optionally a single `tests/identity-worker/types.d.ts`;
`tests/policy-engine/{tsconfig.json,package.json}`; `pnpm-lock.yaml`
(if a devDep is added). Zero edits to `apps/**`, `packages/**`,
`infra/**`, any `wrangler.jsonc`, any `component.yaml`, the
`cloudflare ~> 4.52` pin, or any orun intent.

Acceptance highlights: both target typecheck commands exit 0; jest pass
counts unchanged (122/122 identity-worker, policy-engine baseline);
kiox/orun triple green; PR opened with a real PR number; smallest diff
that achieves the goal.

### Deferred (orchestrator skips, loop keeps moving)

1. **Real notifications provider swap** (Resend / Postmark / SES) —
   waiting on user provider choice. The adapter seam in
   `apps/notifications-worker/src/providers/` is ready and now
   safety-unblocked by Task 0090's idempotency-key population.
2. **Task 0085b — cloudflare-domain v4 → v5 + re-import** — explicit
   user defer.
3. **`notifications-worker-dev` provisioning + dev binding (REFRAMED
   as `notifications-worker-dev-reframe`)** — needs a "dev-deploy lane"
   design pass before the dev-binding work has anywhere to land.

### Next-task candidates after 0091

1. Real notifications provider swap (when user names a provider).
2. Dev-deploy lane design pass (the reframed
   `notifications-worker-dev` work).
3. Other workspace typecheck/lint cleanup (projects-worker eslint v9
   migration, etc.) — small follow-ups that benefit from the clean
   baseline 0091 lands.
4. Revive Task 0085b when defer lifts.

## Repo health: green

Apex hostnames `stage.sourceplane.ai` and `prod.sourceplane.ai` live on
the original Cloudflare Workers custom-domain attachments (stage id
`052eaece5e989d5a7280b6c206e562c42950e3a6`, prod id
`31e5f2ed1b1e4a5700e8ae0678846a0d753840e1`). Provider pin holds at
`cloudflare ~> 4.52` (Task 0085b deferred). `kiox.lock` pinned at orun
v2.9.0. `main` tip on `origin/main` is `a5aa47d` (post Task 0090
squash merge).

Notifications-worker V1 stays deployed on stage + prod (private,
`workers_dev: false`, `NOTIFICATIONS_PROVIDER=local-debug`). It has
THREE real callers, all consuming the shared
`@saas/notifications-client` workspace package, and as of Task 0090
all three callers populate `idempotencyKey` on enqueue:

- identity-worker prod fires `auth.magic_link` enqueues with
  `idempotencyKey = auth.magic_link:${challengeId}` on every non-debug
  login.
- membership-worker prod fires `invitation.created` enqueues with
  `idempotencyKey = invitation.created:${invitationPublicId(inv.id)}`
  after every successful `executor.transaction()` commit on
  `POST /v1/organizations/:id/invitations`. Stage continues to
  short-circuit on `DEBUG_DELIVERY=true`.
- membership-worker prod fires `invitation.accepted` enqueues with
  `idempotencyKey = invitation.accepted:${invitationPublicId(inv.id)}:${memberPublicId(member.id)}`
  after every successful `executor.transaction()` commit on
  `POST /v1/invitations/:token/accept`. Stage and prod enqueue
  identically.

A retry of the same logical event now collapses to one notification
row + one provider attempt via the existing notifications-worker
`(orgId, idempotencyKey)` idempotent-hit path. Real provider swap is
unblocked from a safety standpoint.

## Recently completed — Task 0090 (V1 notifications idempotency-key population, PASS)

- **PR #138** (`impl/task-0090-notifications-idempotency-keys`),
  squash `a5aa47d` at 2026-05-29T23:53:44Z. Files: three caller
  handler files; `packages/notifications-client/src/index.ts` (additive
  `buildIdempotencyKey(scope, ...parts)` helper); three test files
  under `tests/{notifications-client,identity-worker,membership-worker}/`;
  `tests/identity-worker/package.json` (Jest moduleNameMapper); ai/
  tasks + reports.
- PR-CI run `26668028804` 13/13 SUCCESS.
- Post-merge main-CI run `26668188122` = 13/13 SUCCESS. Worker version
  IDs:
  `identity-worker-stage` @ `cd7e6c39-23b8-428c-87a0-30820ead3e18`,
  `identity-worker-prod`  @ `4d3d0944-16b4-45cd-a9c2-bcdcaebccd3a`,
  `membership-worker-stage` @ `ba8f0b9f-4fdb-4274-baa4-6d0411d54417`,
  `membership-worker-prod`  @ `149c3df0-adc8-412f-91e2-e3aef5f923a3`.
- Live curl post-merge: `https://stage.sourceplane.ai/` and
  `https://prod.sourceplane.ai/` → 307 → `/orgs`;
  notifications-worker private invariant intact (no public DNS).
- Reports: `ai/reports/task-0090-implementer.md`,
  `ai/reports/task-0090-verifier.md`.

## Recently completed — Task 0089 (shared notifications-client + accept-invitation invitation.accepted, PASS)

- **PR #137** (`impl/task-0089-shared-notifications-client`), squash
  `8d4eb26` at 2026-05-29T22:45:34Z. Reports:
  `ai/reports/task-0089-{implementer,verifier}.md`.

## Recently completed — Task 0088 (membership → notifications invitation.created wire, PASS)

- **PR #136** (`impl/task-0088-membership-notifications-wire`), squash
  `d9968ad` at 2026-05-29T19:59:13Z. Reports:
  `ai/reports/task-0088-{implementer,verifier}.md`.

## Recently completed — Task 0087 (identity → notifications magic-link wire, PASS)

- **PR #135** (`impl/task-0087-identity-notifications-wire`), squash
  `5192ffd` at 2026-05-29T19:19:59Z.

## Deferred — Task 0085b (cloudflare-domain v4 → v5, Phase 2)

User has explicitly deferred 0085b. The narrow Terraform-tracking risk
window from Task 0085a remains open: the two live custom-domain
attachments are **not** Terraform-managed between the 0085a merge and
the eventual 0085b apply. Mitigation: no manual Cloudflare-dashboard
or wrangler edits to those attachments while 0085b is parked. Tasks
0086, 0087, 0088, 0089, and 0090 were verified post-merge to NOT
touch `infra/terraform/cloudflare-domain/**` so the window does not
widen.

## Orchestrator Policy — Deferred Decision Protocol

Per `agents/orchestrator.md`, candidates that would require human input
are **deferred to `/ai/deferred.md`** instead of pausing the loop.
`waiting_for_input` only flips to `"true"` if EVERY candidate is
genuinely blocked on a human decision. Currently deferred:

- Real notifications provider swap (Resend / Postmark / SES) —
  awaiting user provider choice. Notifications-worker stays on
  `local-debug`; Task 0090 V1 idempotency hardening is now in place,
  making the eventual swap safe.
- Task 0085b cloudflare-domain v4→v5 + import — explicit user defer.
- `notifications-worker-dev-reframe` — needs dev-deploy lane design.

## Roadmap Position

- Baseline cluster: B2 (notifications worker) shipped in Task 0086.
- B1 (real auth) progressed through Tasks 0087–0090. All three V1
  callers are now wired AND idempotency-hardened. Real provider swap
  is unblocked from a safety standpoint when the user picks a
  provider.
- Task 0091 is a small repo-health PR (typecheck baseline) that clears
  background noise before the next big leap.

## Repo Reality

- Tasks 0001–0090 verified and merged (94 entries on the completed
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
