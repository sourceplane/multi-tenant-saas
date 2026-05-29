# Current Context

Last updated: 2026-05-30 (Task 0089 SCOPED — `accept-invitation` →
notifications-worker `invitation.accepted` wire AS the trigger to
extract shared `@saas/notifications-client` workspace package
consumed by all three current callers.)

## Active task: 0089

- Agent: Implementer
- Prompt: `ai/tasks/task-0089.md`
- Branch (to be created): `impl/task-0089-shared-notifications-client`

### Objective recap

Wire `accept-invitation` to enqueue `invitation.accepted` through
notifications-worker (third caller of the V1 enqueue contract), AND
extract the duplicated `notifications-client.ts` (currently mirrored
byte-near-identically across `apps/identity-worker/src/` and
`apps/membership-worker/src/`) into a shared
`packages/notifications-client/` workspace package consumed by:

1. identity-worker login-start (`auth.magic_link`)
2. membership-worker create-invitation (`invitation.created`)
3. membership-worker accept-invitation (`invitation.accepted`) **NEW**

Tasks 0087 and 0088 explicitly deferred this extraction "until a third
caller appears" — Task 0089 is that third caller, so feature wire +
refactor land in one coherent PR (extracting earlier would have
produced a 2-consumer abstraction identical to the duplication).

### PR boundary (in)

1. New `packages/notifications-client/` workspace package.
2. identity-worker: delete local copy, depend on `@saas/notifications-client`.
3. membership-worker create-invitation: delete local copy, depend on
   `@saas/notifications-client`.
4. membership-worker accept-invitation: import from
   `@saas/notifications-client`, enqueue `invitation.accepted`
   STRICTLY OUTSIDE `executor.transaction()` (mirror create-invitation
   pattern, lines 280–340).
5. Tests: canonical client tests on the shared package; new
   accept-invitation enqueue-wire tests on the worker.

### PR boundary (out, hard non-goals)

- No notifications-worker code changes.
- No new templates / no provider swap (Resend/Postmark/SES still deferred).
- No `apps/membership-worker/wrangler.jsonc` or
  `apps/identity-worker/wrangler.jsonc` edits — service binding already
  on stage/prod, dev intentionally bindings-less.
- No notifications-worker-dev provisioning.
- No `infra/terraform/cloudflare-domain/**` edits.
- No `cloudflare ~> 4.52` provider-pin bump.
- No unrelated refactors / formatting churn.

### Acceptance gates

- `pnpm typecheck && pnpm lint` from repo root green.
- New package + worker filter tests green.
- Local Orun triple green: `kiox -- orun validate --intent intent.yaml`,
  `kiox -- orun plan --changed --intent intent.yaml --output plan.json`,
  `kiox -- orun run --plan plan.json --dry-run --runner github-actions`.
- PR opened with real PR number written back to the implementer report
  (no `TBD`).
- Best-effort contract preserved: enqueue failure cannot 5xx
  acceptance.
- No raw invitation token in `templateData`.

## Repo health: green

`main` tip on `origin/main` is `9811919` (Task 0088 close-out).
Apex hostnames `stage.sourceplane.ai` and `prod.sourceplane.ai` live on
the original Cloudflare Workers custom-domain attachments (stage id
`052eaece5e989d5a7280b6c206e562c42950e3a6`, prod id
`31e5f2ed1b1e4a5700e8ae0678846a0d753840e1`). Provider pin holds at
`cloudflare ~> 4.52` (Task 0085b deferred). `kiox.lock` pinned at
orun v2.9.0.

notifications-worker V1 deployed on stage + prod (private,
`workers_dev: false`, `NOTIFICATIONS_PROVIDER=local-debug`). Real
production callers:

- identity-worker prod fires `auth.magic_link` enqueues on every
  non-debug login (Task 0087).
- membership-worker prod fires `invitation.created` enqueues after
  every successful `executor.transaction()` commit on
  `POST /v1/organizations/:id/invitations` (Task 0088).

After Task 0089:

- membership-worker prod will fire `invitation.accepted` enqueues on
  every successful `POST /v1/organizations/:id/invitations/accept`.
- The three callers will all import from a single
  `@saas/notifications-client` workspace package.

## Deferred (orchestrator continues, do not reach into these in 0089)

- **Real notifications provider swap** (Resend / Postmark / SES) —
  awaiting user provider choice. Notifications-worker stays on
  `local-debug`. See `ai/deferred.md`.
- **Task 0085b** cloudflare-domain v4 → v5 + import — explicit user
  defer. The narrow Terraform-tracking risk window from Task 0085a
  remains open: do not edit `infra/terraform/cloudflare-domain/**`,
  do not bump the cloudflare provider pin. Task 0089 must not touch
  these.
- **notifications-worker-dev provisioning** — narrow follow-up parked
  behind Task 0089. After 0089 lands, both identity-worker and the two
  membership-worker handlers' dev blocks remain bindings-less because
  no `notifications-worker-dev` exists. Single-PR follow-up unblocks
  the dev enqueue path for ALL THREE callers.

## Recently completed — Task 0088 (membership create-invitation → notifications invitation.created, PASS)

- **PR #136** (`impl/task-0088-membership-notifications-wire`), squash
  `d9968ad` at 2026-05-29T19:59:13Z.
- Post-merge main-CI run `26659213313` = 5/5 SUCCESS.
- `notifications-client.ts` flagged in implementer + verifier reports
  as duplicated across identity-worker AND membership-worker; shared
  `@saas/notifications-client` extraction deferred to "third caller" —
  resolved in Task 0089.
- Reports: `ai/reports/task-0088-implementer.md`,
  `ai/reports/task-0088-verifier.md`.

## Recently completed — Task 0087 (identity → notifications magic-link, PASS)

- **PR #135** (`impl/task-0087-identity-notifications-wire`), squash
  `5192ffd` at 2026-05-29T19:19:59Z. identity-worker prod now fires an
  `auth.magic_link` enqueue on every non-debug login. Best-effort
  contract held.
- Reports: `ai/reports/task-0087-implementer.md`,
  `ai/reports/task-0087-verifier.md`.

## Recently completed — Task 0086 (notifications-worker V1, PASS)

- **PR #134** (`impl/task-0086-notifications-worker`), squash `2bb088f`
  at 2026-05-29T18:03:51Z.
- Reports: `ai/reports/task-0086-implementer.md`,
  `ai/reports/task-0086-verifier.md`.

## Orchestrator Policy — Deferred Decision Protocol

Per `agents/orchestrator.md`, candidates that would require human input
are deferred to `/ai/deferred.md` instead of pausing the loop.
`waiting_for_input` only flips to `"true"` if EVERY candidate is
genuinely blocked on a human decision. Task 0089 is human-independent
and proceeding.

## Roadmap Position

- Baseline cluster: B2 (notifications worker) shipped in Task 0086.
- B1 (real auth) progressed in Task 0087: identity magic-link wired
  to notifications V1.
- Task 0088 added a second real caller (membership create-invitation
  → invitation-email).
- Task 0089 adds a third caller (membership accept-invitation →
  acceptance-email) AND consolidates all three behind a shared
  `@saas/notifications-client` package — payment for Tasks 0087/0088
  duplication coming due exactly when the third caller arrives.
- After 0089: real provider swap is the next big leap (deferred on
  user choice). notifications-worker-dev provisioning is a narrow
  follow-up that closes the dev-binding gap for all three callers in
  one change.

## Next Task After 0089

1. **Provision `notifications-worker-dev` + dev binding for all three
   callers** — closes the dev-wire gap exposed in Tasks 0087 and 0088
   (now also in 0089 by construction). Single wrangler/component
   change unblocks the dev enqueue path for identity-worker,
   membership-worker create-invitation, and membership-worker
   accept-invitation.
2. **Real notifications provider swap** — Resend / Postmark / SES into
   `apps/notifications-worker/src/providers/` once user picks one.
3. **Pre-existing `identity-worker-tests` Fetcher/crypto TS-type fix**
   — pre-existing, reproduces on clean `main`. Small follow-up.
4. **Revive Task 0085b** when user lifts the defer.

## Repo Reality

- Tasks 0001–0088 verified and merged. Task 0089 scoped this tick.
- Task 0085 split into 0085a (Phase 1, DONE) + 0085b (Phase 2,
  EXPLICITLY DEFERRED by user).
- Active spec pack: reusable SaaS starter under `specs/**`.
- Console live at `https://{stage,prod}.sourceplane.ai`.
- Notifications-worker V1 internal-only on stage/prod; identity-worker
  prod (`auth.magic_link`) AND membership-worker prod
  (`invitation.created`) live callers (local-debug provider). Task
  0089 adds membership-worker `invitation.accepted` and consolidates
  all three onto `@saas/notifications-client`.
