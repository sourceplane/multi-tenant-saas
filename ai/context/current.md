# Current Context

Last updated: 2026-05-29 (Task 0086 Verifier PASS — PR #134 merged at
`2bb088f`, post-merge main-CI 13/13 SUCCESS, live deploys + migration
confirmed on stage + prod)

## No active task

Task 0086 (notifications-worker V1 bring-up) is verified and merged.
Awaiting user selection of the next focus.

### Next-task candidates

1. **Notifications caller wiring** — wire `identity-worker` magic-link
   send and/or `membership-worker` invitation email through
   notifications-worker. Unblocks roadmap B1 (real auth).
2. **Real provider swap** — slot Resend / SES / Postmark into
   `apps/notifications-worker/src/providers/` and gate via
   `NOTIFICATIONS_PROVIDER`. Required before any real delivery.
3. **Revive Task 0085b** when the user lifts the defer
   (cloudflare-domain v4 → v5 provider bump + `import {}` re-adoption
   of the two known immutable IDs).
4. **Pre-existing `identity-worker-tests` `crypto` TS-type fix** —
   reproduces on a clean stash of `main`; unrelated to 0086, scoped as
   a separate small follow-up.

## Repo health: green

Apex hostnames `stage.sourceplane.ai` and `prod.sourceplane.ai` live on
the original Cloudflare Workers custom-domain attachments (stage id
`052eaece5e989d5a7280b6c206e562c42950e3a6`, prod id
`31e5f2ed1b1e4a5700e8ae0678846a0d753840e1`). Rollback hatch
`*.rahulvarghesepullely.workers.dev` still serves 200 on both envs.
Provider pin holds at `cloudflare ~> 4.52` (Task 0085b deferred).
`kiox.lock` pinned at orun v2.3.0. `main` tip on `origin/main` is
`2bb088f` (post Task 0086 verifier close-out).

notifications-worker V1 is now deployed on stage + prod (private —
`workers_dev: false`, no public custom domain). Migration
`120_notifications_core` applied on both Supabase projects. No caller
wires it yet — that is the highest-leverage next candidate.

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
  `orun-saas-verifier` skill). Acceptance criterion #8 recorded as
  met-in-spirit.
- Apex `stage.sourceplane.ai` / `prod.sourceplane.ai` still serve
  `Sourceplane Console` 200 (no regression on Task 0085a's `0 destroyed`
  invariant).
- Migration checksum
  `868cc1092b4b385b6ed3d203efe5302191865131bb98d0e9f5fe5ad6d16f01bb`
  recomputed match.
- `wrangler.jsonc` Hyperdrive + service-binding IDs confirmed to be the
  real shared values (identical to events-worker / membership-worker on
  `main`) — implementer Follow-up #3 closed informational.
- Post-merge `orun plan --changed` = `0 components × 3 envs → 0 jobs`
  (durability ✓).
- Reports: `ai/reports/task-0086-implementer.md`,
  `ai/reports/task-0086-verifier.md`.

## Deferred — Task 0085b (cloudflare-domain v4 → v5, Phase 2)

User has explicitly deferred 0085b. The narrow Terraform-tracking risk
window from Task 0085a remains open: the two live custom-domain
attachments are **not** Terraform-managed between the 0085a merge and
the eventual 0085b apply. Cloudflare-side drift would not be detected
by `terraform plan`. Mitigation: no manual Cloudflare-dashboard or
wrangler edits to those attachments while 0085b is parked. Task 0086
was verified post-merge to NOT touch
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
- Reports: `ai/reports/task-0084-implementer.md`,
  `ai/reports/task-0084-verifier.md`.

## Recently completed — Task 0083.1 (hotfix)

- **PR #130**, squash `2443826` at 2026-05-29T13:24Z. Promoted
  `CONSOLE_CUSTOM_DOMAIN` into `environments.{env}.parameterDefaults.terraform`
  in `intent.yaml`; removed shadowing component-level default. First
  real create of `cloudflare_workers_domain.console` on both envs.

## Recently completed — Task 0083 (Pages → Workers cutover)

- **PR #129** squash `927c5179` at 2026-05-29T12:30:01Z.
  `cloudflare_pages_domain.console` → `cloudflare_workers_domain.console`
  (v4 provider, pin bumped `~> 4.30` → `~> 4.52`); `apps/web-console/`
  deleted; api-edge CORS narrowed.

## Recently Merged — 0082 + 0082.1 + 0082.2 (Pages → Workers + Static Assets)

- **PR #125** Next.js 15 + App Router console at
  `apps/web-console-next/` via `@opennextjs/cloudflare@1.0.4`.
- **PR #126** `cloudflare-workers-assets-turbo` composition; rewired
  web-console-next from Pages to Workers + Static Assets.
- **PR #127** smoke `SIGPIPE` race fix (curl exit 23).
- **PR #128** api-edge CORS allow-list updated for new
  `*.rahulvarghesepullely.workers.dev` console origins.

## Recently Merged — 0079, 0080, 0081

- **0079** PR #122 — `projects-worker` gates project creation on
  `limit.projects`.
- **0080** PR #123 — `membership-worker` gates invitation creation on
  `limit.members`; dependency-graph flipped.
- **0081** PR #124 — `projects-worker` gates env creation on
  `limit.environments`; `decideQuantityGate` helper extracted.

All three share the same four-reason matrix (`disabled` /
`not_configured` / `malformed_limit` / `limit_reached`) and the same
fail-closed 503 envelope — the contract Task 0082's
`PreconditionInsight` UI surfaces.

## Current Task — 0087 (scoped, awaiting Implementer)

Wire `identity-worker` magic-link login through `notifications-worker`
over a new `NOTIFICATIONS_WORKER` service binding. First caller on the
Task 0086 surface. Best-effort delivery: notifications failure MUST NOT
5xx login. Uses existing `local-debug` provider on notifications-worker
— no real provider swap needed (that's deferred, see below).

- Prompt: `ai/tasks/task-0087.md`
- Branch (to be created): `impl/task-0087-identity-notifications-wire`
- Files in scope: `apps/identity-worker/wrangler.jsonc`,
  `apps/identity-worker/src/notifications-client.ts` (new),
  `apps/identity-worker/src/handlers/login-start.ts`, identity-worker
  unit tests. **No edits** outside identity-worker app + tests + this
  task's state files.
- Login response contract unchanged. `DEBUG_DELIVERY=true` still inlines
  the code and does NOT enqueue.

## Orchestrator Policy — Deferred Decision Protocol (NEW)

Per the updated `agents/orchestrator.md`, candidates that would require
human input are now **deferred to `/ai/deferred.md`** instead of pausing
the loop. `waiting_for_input` only flips to `"true"` if EVERY candidate
is genuinely blocked on a human decision. This keeps the loop moving
when the human is unavailable.

Currently deferred (see `/ai/deferred.md` for full entries):

- Real notifications provider swap (Resend / Postmark / SES) — awaiting
  user provider choice. Notifications-worker stays on `local-debug`
  until lifted; Task 0087 is unaffected.
- Task 0085b cloudflare-domain v4→v5 + import — explicit user defer
  carried over; narrow Terraform-tracking risk window on the two live
  custom-domain attachments remains open. No task may touch
  `infra/terraform/cloudflare-domain/**` or the cloudflare provider
  pin until 0085b is lifted.

## Roadmap Position

- Baseline cluster: B2 (notifications worker) shipped in Task 0086.
- Task 0087 begins B1 (real auth) by wiring the first caller (identity
  magic-link) onto B2. Membership-worker invitation-email wiring is the
  natural next caller (own task), then real provider swap when the user
  picks one.

## Repo Reality

- Tasks 0001–0086 verified and merged. Task 0087 scoped, Implementer up
  next.
- Task 0085 split into 0085a (Phase 1, DONE) + 0085b (Phase 2,
  EXPLICITLY DEFERRED by user) per accepted spec proposal.
- Active spec pack: reusable SaaS starter under `specs/**`.
- `specs-v2/**` remains out of scope unless the task is product-specific.
- The full auth flow is accessible through the public `api-edge`
  gateway at `api-edge-{env}.rahulvarghesepullely.workers.dev`.
- Console is live at `https://{stage,prod}.sourceplane.ai` on the
  original Cloudflare Workers custom-domain attachments (untracked
  by Terraform between 0085a merge and the eventual 0085b
  re-import).
- Notifications-worker V1 is internal-only, deployed on stage/prod,
  no public surface, no caller wires it yet (the next-task candidate
  list captures the wiring + provider-swap follow-ups).
