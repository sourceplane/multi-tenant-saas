# Current Context

Last updated: 2026-05-29 (Task 0086 Implementer DONE — PR #134 OPEN with
13/13 PR-CI green; Task 0086 Verifier scoped and ready)

## Current Task — 0086 Verifier (notifications-worker V1 bring-up)

Implementer landed `apps/notifications-worker` V1 on branch
`impl/task-0086-notifications-worker` (tip `b611398`). PR #134 is
OPEN, MERGEABLE, base=`main`, 13/13 CI SUCCESS on run `26649268365`.
The verifier prompt at `ai/tasks/task-0086-verifier.md` carries the
full pre- and post-merge acceptance contract.

### What 0086 ships

- New Cloudflare Worker `apps/notifications-worker` exposing an
  internal-only HTTP API: `GET /health`, `POST /v1/notifications`,
  `GET /v1/notifications/:id`, `GET|PUT /v1/notifications/preferences`,
  `POST /v1/notifications/recipients/:recipient/suppress`.
- Internal-actor gate on every non-health route via
  `x-internal-actor` / `x-actor-subject-id` /
  `x-actor-subject-type`. Allow-list:
  `membership-worker`, `billing-worker`, `policy-worker`,
  `events-worker`, `api-edge`.
- Five canonical events emitted through `EVENTS_WORKER` service
  binding: `notification.queued`, `notification.sent`,
  `notification.failed`, `notification.preference_updated`,
  `notification.suppressed`. `templateData` is excluded from event
  payloads (asserted in tests).
- New Postgres schema `notifications` with four tables
  (`preferences`, `notifications`, `notification_attempts`,
  `suppressions`) added by migration `120_notifications_core`
  (claimed checksum
  `868cc1092b4b385b6ed3d203efe5302191865131bb98d0e9f5fe5ad6d16f01bb`
  — verifier recomputes).
- New `packages/contracts/src/notifications.ts` (V1 contract).
- New `packages/db/src/notifications/` repository (`pg`-backed,
  Result-typed, mirroring `packages/db/src/membership/`).
- New `tests/notifications-worker/` (Jest ESM; 20/20 passing).
- V1 provider: `local-debug` only (synthetic
  `local-debug-<short-id>` `providerMessageId`). Real provider swap
  is a follow-up task.

### What 0086 deliberately does NOT ship (verifier confirms)

- No caller wiring (no `identity-worker` magic-link hookup, no
  `membership-worker` invitation-email hookup, no `billing-worker`
  receipt hookup). The V1 surface is reviewable in isolation.
- No real provider adapter (Resend / SES / Postmark).
- No Queues / Durable Objects / KV / Cron Triggers.
- No `api-edge` route to notifications-worker — there is no public
  `/v1/notifications/*` surface in V1.
- **No touch to `infra/terraform/cloudflare-domain/**`** or any
  cloudflare provider pin. Task 0085b's deferred risk window is
  honored.
- No change to `intent.yaml` parameter defaults, `kiox.lock`, or
  `.terraform.lock.hcl`.
- No modification of any other worker's `src/**` or any other
  bounded context's `packages/db/src/**` folder.

### Verifier post-merge load-bearing checks

- `db-migrate · {stage,prod} · Migrate` apply main-CI jobs green;
  `120_notifications_core` lands in both Supabase projects.
- `notifications-worker · {stage,prod} · Verify deploy` main-CI jobs
  green; wrangler live deploy logged for both env Worker names.
- Live `/health` 200 on
  `https://sourceplane-notifications-worker-{stage,prod}.rahulvarghesepullely.workers.dev/health`
  (or whichever host the `wrangler.jsonc` `name` resolves to —
  verifier records the exact URL).
- Apex `stage.sourceplane.ai` / `prod.sourceplane.ai` still serve
  200 with `Sourceplane Console` body — Task 0085a's `0 destroyed`
  invariant on `cloudflare-domain` Terraform state must continue to
  hold on any apply triggered by the merge (likely 0 jobs selected
  because the diff does not touch that component; verifier
  records).

## Repo health: green

Apex hostnames `stage.sourceplane.ai` and `prod.sourceplane.ai`
remain live on the original Cloudflare Workers custom-domain
attachments (stage id
`052eaece5e989d5a7280b6c206e562c42950e3a6`, prod id
`31e5f2ed1b1e4a5700e8ae0678846a0d753840e1`). Rollback hatch
`*.rahulvarghesepullely.workers.dev` still serves 200 on both envs.
Provider pin holds at `cloudflare ~> 4.52` (Task 0085b deferred).
`kiox.lock` pinned at orun v2.3.0. `main` tip on `origin/main` is
`9f9ea1a` (post Task 0085a verifier close-out).

## Deferred — Task 0085b (cloudflare-domain v4 → v5, Phase 2)

User has explicitly deferred 0085b. The narrow Terraform-tracking
risk window from Task 0085a remains open: the two live
custom-domain attachments are **not** Terraform-managed between the
0085a merge and the eventual 0085b apply. Cloudflare-side drift
would not be detected by `terraform plan`. Mitigation: no manual
Cloudflare-dashboard or wrangler edits to those attachments while
0085b is parked. Task 0086 was verified at scoping time to NOT
touch `infra/terraform/cloudflare-domain/**` so the window does not
widen.

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

## Next task after 0086 verifier PASS

Candidates (orchestrator selects after verifier closes, based on
user priority):

1. **Notifications caller wiring** — wire `identity-worker`
   magic-link send and/or `membership-worker` invitation email
   through notifications-worker. Unblocks roadmap B1 (real auth).
2. **Real provider swap** — slot Resend / SES / Postmark into
   `apps/notifications-worker/src/providers/` and gate via
   `NOTIFICATIONS_PROVIDER`. Required before any real delivery.
3. **Real Hyperdrive + service-binding IDs** in
   `apps/notifications-worker/wrangler.jsonc` if the verifier's
   placeholder audit confirms the events-worker-copied placeholders
   are still in place. Scope depends on what the verifier finds.
4. **Revive Task 0085b** when the user lifts the defer.
5. **Pre-existing identity-worker-tests `crypto` type fix** (unrelated
   to 0086; implementer confirmed it fails on a clean stash too).

## Recently completed — Task 0085a (PASS, post-merge soak clean)

- **PR #133** (`impl/task-0085a-cloudflare-v4-removed-state-drop`),
  squash `efa539c` at 2026-05-29T15:06:12Z. 5 files: 2 in
  `infra/terraform/cloudflare-domain/` (`main.tf`, `README.md`) +
  3 ai/ docs (`tasks/task-0085a.md`,
  `reports/task-0085a-implementer.md`,
  `proposals/task-0085-spec-update.md`).
- PR CI run `26644307676` (3/3 SUCCESS); post-merge main-CI run
  `26645041830` (3/3 SUCCESS — `Apply complete! Resources: 0 added,
  0 changed, 0 destroyed.` on both envs).
- Reports: `ai/reports/task-0085a-implementer.md`,
  `ai/reports/task-0085a-verifier.md`.

## Recently completed — Task 0084 (PASS)

- **PR #131** (`impl/task-0084-drop-pages-residuals`), squash `305520a`
  at 2026-05-29T13:53Z. 4 files: 3 in
  `infra/terraform/cloudflare-domain/` + implementer report.
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

## Repo Reality

- Tasks 0001–0085a verified and merged. Task 0086 implementer DONE
  and PR #134 open; verifier scoped at `ai/tasks/task-0086-verifier.md`.
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
- Notifications-worker V1 is internal-only, no public surface; will
  go live in stage/prod after PR #134 merges and the post-merge
  Verify-deploy lands. No caller wires it yet (intentional —
  follow-up task).
