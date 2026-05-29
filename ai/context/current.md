# Current Context

Last updated: 2026-05-29 (Task 0087 Verifier PASS — PR #135 merged at
`5192ffd`, post-merge main-CI `26657375953` 5/5 SUCCESS, live smoke on
api-edge stage + prod confirmed the wire works without 5xx)

## No active task

Task 0087 (identity-worker → notifications-worker magic-link wire) is
verified and merged. Awaiting next orchestrator tick.

### Next-task candidates

1. **`membership-worker` invitation-email wiring** — second real caller
   on notifications V1, same `NOTIFICATIONS_WORKER` service-binding
   pattern as 0087. `invitation` is in the contract enum,
   `membership-worker` is in the internal-actor allow-list, and the
   existing `create-invitation.ts` / `revoke-invitation.ts` handlers
   already use the `executor.transaction()` pattern. Highest-leverage
   next caller; consolidates a second real-world wiring before any
   provider swap.
2. **Provision `notifications-worker-dev` + dev binding** — closes the
   dev-wire gap exposed in 0087 Deviation #3 so the enqueue path is
   locally testable for both identity-worker and (post-1) membership-worker.
3. **Real provider swap** — slot Resend / SES / Postmark into
   `apps/notifications-worker/src/providers/` once the user picks one.
   Currently deferred awaiting user choice.
4. **Pre-existing `identity-worker-tests` Fetcher/crypto TS-type fix**
   — reproduces on a clean stash of `main`; the `api-key-admin.test.ts`
   suite fails to load on `tsc --noEmit` because it references the
   `Fetcher` global without the workers-types lib pulled in. Scoped as
   a small follow-up. (Did not block 0087 — actual test count is
   110/110 passing.)
5. **Revive Task 0085b** when the user lifts the defer
   (cloudflare-domain v4 → v5 provider bump + `import {}` re-adoption
   of the two known immutable IDs).

## Repo health: green

Apex hostnames `stage.sourceplane.ai` and `prod.sourceplane.ai` live on
the original Cloudflare Workers custom-domain attachments (stage id
`052eaece5e989d5a7280b6c206e562c42950e3a6`, prod id
`31e5f2ed1b1e4a5700e8ae0678846a0d753840e1`). Rollback hatch
`*.rahulvarghesepullely.workers.dev` still serves 200 on both envs.
Provider pin holds at `cloudflare ~> 4.52` (Task 0085b deferred).
`kiox.lock` pinned at orun v2.9.0. `main` tip on `origin/main` is
`5192ffd` (post Task 0087 squash merge).

notifications-worker V1 stays deployed on stage + prod (private,
`workers_dev: false`, `NOTIFICATIONS_PROVIDER=local-debug`). It now has
its first real caller: identity-worker prod fires `auth.magic_link`
enqueues on every non-debug login. Stage continues to short-circuit on
`DEBUG_DELIVERY=true` and return the raw code inline (intentional,
pre-existing).

## Recently completed — Task 0087 (identity → notifications magic-link wire, PASS)

- **PR #135** (`impl/task-0087-identity-notifications-wire`), squash
  `5192ffd` at 2026-05-29T19:19:59Z. Files: `apps/identity-worker/{wrangler.jsonc,src/env.ts,src/handlers/login-start.ts,src/notifications-client.ts}`,
  `tests/identity-worker/src/notifications-client.test.ts`, ai/
  reports.
- PR-CI run `26656687952` (original head) and `26657256957` (with
  verifier report commit) both 5/5 SUCCESS.
- Post-merge main-CI run `26657375953` = 5/5 SUCCESS. Worker deploys:
  `identity-worker-stage` @ `5b84bcce-e14e-4fd8-9332-e313f94e7084`,
  `identity-worker-prod` @ `5ca2ff26-9e06-4d02-ae12-6f316df97d4e`.
  Total upload 199.63 KiB / 42.96 KiB gzip (+~0.1 KiB gzip for the
  new client).
- Live smoke `POST /v1/auth/login/start` against
  `api-edge-{stage,prod}.rahulvarghesepullely.workers.dev` with
  synthetic emails:
  - Stage HTTP 200, `delivery.mode = "local_debug"`, `code` present
    (DEBUG_DELIVERY=true baseline preserved → enqueue skipped).
  - Prod HTTP 200, `delivery.mode = "email"`, **no `code` field**
    (non-debug → enqueue fired → notifications outage cannot 5xx
    login, contract held).
- Three implementer deviations all accepted by verifier with
  documented reasoning:
  - `category: "security"` — V1 contract enum has no `"transactional"`;
    spec 14 (L72, L96) explicitly maps auth flows to `security`.
  - `orgId: SYSTEM_ORG_ID` (zero UUID) — no FK / no RLS on
    `notifications.org_id`, sentinel established by migrations 070 / 080.
  - `env.dev` binding omitted — dev block is bindings-less, no
    `notifications-worker-dev` exists, `DEBUG_DELIVERY=true`
    short-circuits the enqueue in dev. Recorded as a Remaining Gap,
    not a FAIL.
- Apex hostnames + notifications-worker private 1042 invariants
  re-confirmed post-merge. Post-merge `orun plan --changed` =
  `0 components × 3 envs → 0 jobs` (plan id `f13a079b58c7`)
  — durability intact.
- Reports: `ai/reports/task-0087-implementer.md`,
  `ai/reports/task-0087-verifier.md`.

## Recently completed — Task 0086 (notifications-worker V1, PASS)

- **PR #134** (`impl/task-0086-notifications-worker`), squash `2bb088f`
  at 2026-05-29T18:03:51Z. Files: `apps/notifications-worker/**`,
  `packages/contracts/src/notifications.ts`,
  `packages/db/src/{migrations/120_notifications_core,notifications,manifest.ts}`,
  `tests/notifications-worker/**`, `pnpm-lock.yaml`, ai/ docs.
- PR-CI run `26649268365` (3/3 envs + db-migrate stage+prod + worker
  Verify deploy stage+prod + tests on dev) = 13/13 SUCCESS.
- Post-merge main-CI run `26653759859` = 13/13 SUCCESS. Real wrangler
  uploads: notifications-worker-stage (1.23s), notifications-worker-prod
  (1.57s). Migration `120_notifications_core` in `applied` array on
  both env jobs.
- Live `/health` on `sourceplane-notifications-worker-{stage,prod}.rahulvarghesepullely.workers.dev`
  returns HTTP 404 + Cloudflare error `1042` — EXPECTED (private
  worker, matches membership-worker pattern, documented in
  `orun-saas-verifier` skill).
- Reports: `ai/reports/task-0086-implementer.md`,
  `ai/reports/task-0086-verifier.md`.

## Deferred — Task 0085b (cloudflare-domain v4 → v5, Phase 2)

User has explicitly deferred 0085b. The narrow Terraform-tracking risk
window from Task 0085a remains open: the two live custom-domain
attachments are **not** Terraform-managed between the 0085a merge and
the eventual 0085b apply. Cloudflare-side drift would not be detected
by `terraform plan`. Mitigation: no manual Cloudflare-dashboard or
wrangler edits to those attachments while 0085b is parked. Tasks 0086
and 0087 were verified post-merge to NOT touch
`infra/terraform/cloudflare-domain/**` so the window does not widen.

When the user lifts the defer, scope 0085b as previously laid out:
bump `required_providers.cloudflare.version` from `~> 4.52` to
`~> 5.0`; replace the fenced v4 `cloudflare_workers_domain.console`
block with v5 `resource cloudflare_workers_custom_domain.console`;
add `import {}` blocks keyed by `var.environment` re-adopting the
two known immutable IDs; restore `output worker_custom_domain_id`
to the real attachment ID; refresh `.terraform.lock.hcl` to
cloudflare 5.x multi-arch; drop the `removed {}` block and Phase 1
fence comments. Acceptance: PR-CI plan
`Plan: 1 to import, 0 to add, 0 to change, 0 to destroy.` on both
envs; post-merge apply
`Apply complete! Resources: 1 imported, 0 added, 0 changed, 0 destroyed.`
on both envs; four live probes still 200.

## Recently completed — Task 0085a (PASS, post-merge soak clean)

- **PR #133** (`impl/task-0085a-cloudflare-v4-removed-state-drop`),
  squash `efa539c` at 2026-05-29T15:06:12Z.
- PR CI run `26644307676` (3/3 SUCCESS); post-merge main-CI run
  `26645041830` (3/3 SUCCESS — `Apply complete! Resources: 0 added,
  0 changed, 0 destroyed.` on both envs).
- Reports: `ai/reports/task-0085a-implementer.md`,
  `ai/reports/task-0085a-verifier.md`.

## Recently completed — Task 0084 (PASS)

- **PR #131** (`impl/task-0084-drop-pages-residuals`), squash `305520a`
  at 2026-05-29T13:53Z.
- PR CI run `26640690294` (3/3 SUCCESS); post-merge main-CI run
  `26641282273` (3/3 SUCCESS) — clean no-op apply on both envs.

## Orchestrator Policy — Deferred Decision Protocol

Per `agents/orchestrator.md`, candidates that would require human input
are **deferred to `/ai/deferred.md`** instead of pausing the loop.
`waiting_for_input` only flips to `"true"` if EVERY candidate is
genuinely blocked on a human decision. Currently deferred (see
`/ai/deferred.md`):

- Real notifications provider swap (Resend / Postmark / SES) — awaiting
  user provider choice. Notifications-worker stays on `local-debug`;
  Task 0087 is unaffected (best-effort enqueue + local-debug emission).
- Task 0085b cloudflare-domain v4→v5 + import — explicit user defer.
  No task may touch `infra/terraform/cloudflare-domain/**` or the
  cloudflare provider pin until 0085b is lifted.

## Roadmap Position

- Baseline cluster: B2 (notifications worker) shipped in Task 0086.
- B1 (real auth) progressed in Task 0087: identity magic-link is now
  wired to notifications V1. Membership-worker invitation-email wiring
  is the natural next caller (own task), then real provider swap when
  the user picks one.

## Repo Reality

- Tasks 0001–0087 verified and merged.
- Task 0085 split into 0085a (Phase 1, DONE) + 0085b (Phase 2,
  EXPLICITLY DEFERRED by user) per accepted spec proposal.
- Active spec pack: reusable SaaS starter under `specs/**`.
- `specs-v2/**` remains out of scope unless the task is product-specific.
- The full auth flow is accessible through the public `api-edge`
  gateway at `api-edge-{env}.rahulvarghesepullely.workers.dev`. Live
  magic-link login now fans out a notifications enqueue on prod.
- Console is live at `https://{stage,prod}.sourceplane.ai` on the
  original Cloudflare Workers custom-domain attachments (untracked
  by Terraform between 0085a merge and the eventual 0085b
  re-import).
- Notifications-worker V1 is internal-only, deployed on stage/prod;
  identity-worker prod is its first live caller (local-debug provider).
