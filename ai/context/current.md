# Current Context

Last updated: 2026-05-30 (Task 0090 SCOPED — orchestrator pick after
Task 0089 close-out. Repo health 🟢 green, main `8d4eb26`,
post-merge main-CI `26666036515` 13/13 SUCCESS still the latest
verified main run.)

## Active task: 0090 — Notifications V1 idempotency-key population

Prompt: `ai/tasks/task-0090.md`. Implementer agent.

Populate `idempotencyKey` on every notifications-V1 enqueue across the
three live callers so retries collapse to one notification row + one
provider attempt via the existing notifications-worker idempotent-hit
path. Closes the non-blocking V1 risk note logged by Task 0088
verifier; required hardening before any real provider swap can ship
safely.

PR Boundary: three caller files
(`apps/identity-worker/src/handlers/login-start.ts`,
`apps/membership-worker/src/handlers/create-invitation.ts`,
`apps/membership-worker/src/handlers/accept-invitation.ts`),
optionally a small helper in
`packages/notifications-client/src/index.ts`, plus tests under
`tests/notifications-client/`, `tests/identity-worker/src/`,
`tests/membership-worker/src/`. Zero edits to
`apps/notifications-worker/**`,
`packages/contracts/src/notifications.ts`, `packages/db/**`, any
`apps/*/wrangler.jsonc`, any `apps/*/component.yaml`,
`infra/terraform/cloudflare-domain/**`, or the
`cloudflare ~> 4.52` provider pin (Task 0085b risk window stays
sealed).

Acceptance highlights: `pnpm typecheck && pnpm lint` green; the three
per-package test suites green (pre-existing `api-key-admin.test.ts`
compile failure stays out of scope); kiox/orun triple green; PR
opened with a real PR number; idempotency keys are deterministic,
secret-free (no `rawCode`), and template-scoped.

### Deferred (orchestrator skips, loop keeps moving)

1. **Real notifications provider swap** (Resend / Postmark / SES) —
   waiting on user provider choice. The adapter seam in
   `apps/notifications-worker/src/providers/` is ready; this is a
   drop-in once the choice is made. Task 0090's idempotency keys are
   pre-requisite hardening for this swap.
2. **Task 0085b — cloudflare-domain v4 → v5 + re-import** — explicit
   user defer. Apex attachments stay Cloudflare-managed-only while
   parked.
3. **`notifications-worker-dev` provisioning + dev binding (REFRAMED)**
   — original framing was "single wrangler change unlocks dev
   enqueue", but dev profile is `verify`-only on every worker
   `component.yaml` (no `profileRules` adding `deploy` on dev). No
   live `*-dev` worker exists for any consumer in the repo, so
   provisioning `notifications-worker-dev` alone does not give the
   three callers a dev binding to consume. The candidate needs a
   larger "introduce dev-deploy lane" design pass before the
   dev-binding work has anywhere to land. Parked under a new key
   (`notifications-worker-dev-reframe`) in `state.json` deferred list.

### Next-task candidates after 0090

1. Real notifications provider swap (when user names a provider).
2. Pre-existing `identity-worker-tests` Fetcher/crypto TS-type fix
   (reproduces on clean `main @ 9811919`:
   `api-key-admin.ts:77,112,136 — TS2304 Cannot find name 'Fetcher'`,
   plus `tests/policy-engine` TS2688 'node'). Small follow-up.
3. Dev-deploy lane design (the reframed `notifications-worker-dev`
   work).
4. Revive Task 0085b when defer lifts.

## Repo health: green

Apex hostnames `stage.sourceplane.ai` and `prod.sourceplane.ai` live on
the original Cloudflare Workers custom-domain attachments (stage id
`052eaece5e989d5a7280b6c206e562c42950e3a6`, prod id
`31e5f2ed1b1e4a5700e8ae0678846a0d753840e1`). Provider pin holds at
`cloudflare ~> 4.52` (Task 0085b deferred). `kiox.lock` pinned at orun
v2.9.0. `main` tip on `origin/main` is `8d4eb26` (post Task 0089
squash merge).

notifications-worker V1 stays deployed on stage + prod (private,
`workers_dev: false`, `NOTIFICATIONS_PROVIDER=local-debug`). It now
has THREE real callers, all consuming the shared
`@saas/notifications-client` workspace package:

- identity-worker prod fires `auth.magic_link` enqueues on every
  non-debug login (Task 0087).
- membership-worker prod fires `invitation.created` enqueues after
  every successful `executor.transaction()` commit on
  `POST /v1/organizations/:id/invitations` (Task 0088). Stage
  continues to short-circuit on `DEBUG_DELIVERY=true`.
- membership-worker prod fires `invitation.accepted` enqueues after
  every successful `executor.transaction()` commit on
  `POST /v1/invitations/:token/accept` (Task 0089). Stage and prod
  enqueue identically (no DEBUG_DELIVERY short-circuit — the
  acceptance response carries no token to redact).

## Recently completed — Task 0089 (shared notifications-client + accept-invitation invitation.accepted, PASS)

- **PR #137** (`impl/task-0089-shared-notifications-client`), squash
  `8d4eb26` at 2026-05-29T22:45:34Z. Files: new
  `packages/notifications-client/` workspace package; new
  `tests/notifications-client/` workspace; `apps/identity-worker` +
  `apps/membership-worker` `package.json` workspace dep; three
  handler import-swaps (`login-start.ts`, `create-invitation.ts`,
  `accept-invitation.ts` — last is the new wire); two old per-worker
  `notifications-client.ts` deleted; two old per-worker
  `notifications-client.test.ts` deleted; new
  `accept-invitation-notifications.test.ts`; ai/ tasks + reports.
- PR-CI run `26665348096` (original head) and `4628bb7` post
  verifier-report commit both 13/13 SUCCESS.
- Post-merge main-CI run `26666036515` = 13/13 SUCCESS. Worker
  deploys logged `Current Version ID`:
  `identity-worker-stage` @ `3f3dc275-6af4-405b-9211-c60ae4b29c24`,
  `identity-worker-prod`  @ `bc663ade-3574-4273-987f-4a0fb80f9658`,
  `membership-worker-stage` @ `a8d5c614-2891-4b61-9aa5-bd7a337b1d1f`,
  `membership-worker-prod`  @ `04692796-ac62-48b6-9cff-c4427ee04a59`.
- Live curl post-merge: `https://stage.sourceplane.ai/` and
  `https://prod.sourceplane.ai/` → 200 (redirected to `/orgs`);
  notifications-worker private `1042` invariants intact on both envs.
- All six implementer deviations accepted by verifier with
  documented reasoning. Notable: shipped `templateData` shape for
  `invitation.accepted` is `{ invitationId, role, memberId, orgId }`
  vs implementer-report's literal `{ invitationId, orgId, role,
  acceptedBy, acceptedAt }` — accepted as logically equivalent and
  contract-compliant (V1 contract does not pin per-template-key
  field lists; `acceptedBy`/`acceptedAt` are conveyed via headers +
  notification timestamp; `memberId` is the actual artifact of
  acceptance).
- Reports: `ai/reports/task-0089-implementer.md`,
  `ai/reports/task-0089-verifier.md`.

## Recently completed — Task 0088 (membership → notifications invitation.created wire, PASS)

- **PR #136** (`impl/task-0088-membership-notifications-wire`), squash
  `d9968ad` at 2026-05-29T19:59:13Z.
- Reports: `ai/reports/task-0088-implementer.md`,
  `ai/reports/task-0088-verifier.md`.

## Recently completed — Task 0087 (identity → notifications magic-link wire, PASS)

- **PR #135** (`impl/task-0087-identity-notifications-wire`), squash
  `5192ffd` at 2026-05-29T19:19:59Z.
- Reports: `ai/reports/task-0087-implementer.md`,
  `ai/reports/task-0087-verifier.md`.

## Recently completed — Task 0086 (notifications-worker V1, PASS)

- **PR #134** (`impl/task-0086-notifications-worker`), squash `2bb088f`
  at 2026-05-29T18:03:51Z.
- Reports: `ai/reports/task-0086-implementer.md`,
  `ai/reports/task-0086-verifier.md`.

## Deferred — Task 0085b (cloudflare-domain v4 → v5, Phase 2)

User has explicitly deferred 0085b. The narrow Terraform-tracking risk
window from Task 0085a remains open: the two live custom-domain
attachments are **not** Terraform-managed between the 0085a merge and
the eventual 0085b apply. Mitigation: no manual Cloudflare-dashboard
or wrangler edits to those attachments while 0085b is parked. Tasks
0086, 0087, 0088, and 0089 were verified post-merge to NOT touch
`infra/terraform/cloudflare-domain/**` so the window does not widen.

When the user lifts the defer, scope 0085b as previously laid out:
bump `required_providers.cloudflare.version` from `~> 4.52` to
`~> 5.0`; replace the fenced v4 `cloudflare_workers_domain.console`
block with v5 `resource cloudflare_workers_custom_domain.console`;
add `import {}` blocks keyed by `var.environment` re-adopting the
two known immutable IDs; restore `output worker_custom_domain_id`
to the real attachment ID; refresh `.terraform.lock.hcl` to
cloudflare 5.x multi-arch; drop the `removed {}` block and Phase 1
fence comments.

## Orchestrator Policy — Deferred Decision Protocol

Per `agents/orchestrator.md`, candidates that would require human input
are **deferred to `/ai/deferred.md`** instead of pausing the loop.
`waiting_for_input` only flips to `"true"` if EVERY candidate is
genuinely blocked on a human decision. Currently deferred:

- Real notifications provider swap (Resend / Postmark / SES) —
  awaiting user provider choice. Notifications-worker stays on
  `local-debug`; Tasks 0087/0088/0089 are unaffected (best-effort
  enqueue + local-debug emission across all three callers).
- Task 0085b cloudflare-domain v4→v5 + import — explicit user defer.

## Roadmap Position

- Baseline cluster: B2 (notifications worker) shipped in Task 0086.
- B1 (real auth) progressed in Task 0087: identity magic-link wired
  to notifications V1. Task 0088 added a second real caller
  (membership-worker invitation-email). Task 0089 added the third
  caller (membership-worker accept-invitation `invitation.accepted`)
  AND retired the per-worker client duplication via the shared
  `@saas/notifications-client` workspace package. Real provider swap
  is the next big leap when the user picks one. Provisioning
  `notifications-worker-dev` is the narrow follow-up that closes the
  dev-wire gap for all three callers in one move.

## Repo Reality

- Tasks 0001–0089 verified and merged.
- Task 0085 split into 0085a (Phase 1, DONE) + 0085b (Phase 2,
  EXPLICITLY DEFERRED by user).
- Active spec pack: reusable SaaS starter under `specs/**`.
- Console is live at `https://{stage,prod}.sourceplane.ai`.
- Notifications-worker V1 is internal-only, deployed on stage/prod;
  identity-worker prod (`auth.magic_link`), membership-worker prod
  (`invitation.created`), and membership-worker prod
  (`invitation.accepted`) are all live callers (local-debug provider).
- All three callers consume `@saas/notifications-client` workspace
  package (`packages/notifications-client/src/index.ts`); per-worker
  `notifications-client.ts` copies have been deleted.
