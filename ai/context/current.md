# Current Context

Last updated: 2026-05-29 (Task 0083.1 verified PASS and merged; Task
0084 scoped and ready for Implementer)

## Current Task — 0084 (SCOPED, ready for Implementer)

**Prompt**: `ai/tasks/task-0084.md`
**Branch**: `impl/task-0084-drop-pages-residuals`

Drop the now-dead `pagesProjectPrefix` variable +
`pages_project_name` output from
`infra/terraform/cloudflare-domain/` (kept for one soak cycle
post-Task 0083; soak cycle complete) and imperatively delete the
legacy `sourceplane-web-console-{dev,stage,prod}` Cloudflare Pages
projects via wrangler. Apply step expected to be a clean no-op.

PR boundary: 3 files in `infra/terraform/cloudflare-domain/` +
implementer report. NO change to resource shape, provider pin, api-edge,
worker, contract, db, policy, migration, or `intent.yaml`.

**Acceptance** (post-merge):
- `cloudflare-domain · {stage,prod} · Terraform · apply` clean no-op.
- `curl -sfL https://{stage,prod}.sourceplane.ai/` → 200.
- `wrangler pages project list` does not list the three legacy projects.

## Repo health: green

Task 0083 (Pages → Workers + Static Assets cutover, PR #129, squash
`927c5179`) merged at 2026-05-29T12:30:01Z, followed by hotfix Task
0083.1 (`CONSOLE_CUSTOM_DOMAIN` TF_VAR wiring, PR #130, squash
`2443826`) merged at 2026-05-29T13:24Z. Apex hostnames
`stage.sourceplane.ai` and `prod.sourceplane.ai` are live on
`cloudflare_workers_domain.console` (stage
id=`052eaece5e989d5a7280b6c206e562c42950e3a6`, prod
id=`31e5f2ed1b1e4a5700e8ae0678846a0d753840e1`). CORS preflight from
both apex origins to `api-edge-{env}.rahulvarghesepullely.workers.dev`
returns 204 with matching `access-control-allow-origin` reflection.
Rollback hatch `*.rahulvarghesepullely.workers.dev` still serves 200.

Verifier report: `ai/reports/task-0083.1-verifier.md`.

## Recently completed — Task 0083.1 (hotfix)

- **PR #130**, squash merge `2443826` at 2026-05-29T13:24Z.
- Fix shape: option (c) — promoted `CONSOLE_CUSTOM_DOMAIN` from
  `environments.{env}.env` into `environments.{env}.parameterDefaults.terraform`
  for dev/stage/prod in `intent.yaml`; removed shadowing component-level
  default `CONSOLE_CUSTOM_DOMAIN: ""` from
  `infra/terraform/cloudflare-domain/component.yaml`. The job
  template's existing
  `range $key, $value := .parameters` → `TF_VAR_<key>` loop in
  `stack-tectonic/compositions/cloudflare-domain/jobs/cloudflare-domain-validate.yaml`
  exports `TF_VAR_CONSOLE_CUSTOM_DOMAIN` automatically — no
  job-template edits.
- PR CI run `26639655361` (3/3 SUCCESS); post-merge main-CI run
  `26639840823` (SUCCESS). First real create of
  `cloudflare_workers_domain.console` on both envs.
- Out-of-scope drift caught: local `kiox.lock` v2.3.0→v2.9.0 toolchain
  bump was reverted before pushing the impl branch.

## Recently completed — Task 0083 (Pages → Workers cutover)

- **PR #129** squash `927c5179` at 2026-05-29T12:30:01Z.
- `cloudflare_pages_domain.console` → `cloudflare_workers_domain.console`
  (v4 provider, pin bumped `~> 4.30` → `~> 4.52`); `apps/web-console/`
  deleted; api-edge CORS narrowed (removed `*.pages.dev` origins); spec
  sweep; `intent.yaml` `stage.promotion.dependsOn=[dev]` removed; orun
  toolchain v2.3.0 → v2.9.0.
- Verifier report (overwritten per addendum): FAIL on post-merge soak
  (apply was no-op due to missing TF_VAR wiring — fixed by Task 0083.1).

## Next candidates after 0084

- **Task 0085** — bump cloudflare TF provider to v5 and rename
  `cloudflare_workers_domain` → `cloudflare_workers_custom_domain` for
  forward compatibility. Deferred to keep blast radius small.

## Recently Merged — 0082 + 0082.1 + 0082.2 (Pages → Workers + Static Assets)

- **PR #125** (`impl/task-0082-web-console-next`) — squash
  `b73cd54c` at 2026-05-29T08:29:38Z. Next.js 15 + App Router console
  at `apps/web-console-next/` via `@opennextjs/cloudflare@1.0.4` +
  `@opennextjs/aws@3.6.2`; designed `precondition_failed` UX
  (`limit_reached`, `disabled`, `not_configured`, `malformed_limit`),
  `cmdk` palette, Zod-driven create forms, dark-mode default.
- **PR #126** (Task 0082.2) — `cloudflare-workers-assets-turbo`
  composition; rewired web-console-next from Pages to Workers +
  Static Assets after the white-page incident.
- **PR #127** (Task 0082.2.1) — smoke `SIGPIPE` race fix (curl exit
  23) on web-console-next prod.
- **PR #128** (Task 0082.2.2) — api-edge CORS allow-list updated with
  the new `*.rahulvarghesepullely.workers.dev` console origins.

## Recently Merged — 0079, 0080, 0081

- **Task 0079** — PR #122 (`ab78aea`) — `projects-worker` gates
  `POST /v1/organizations/{orgId}/projects` on `limit.projects` via
  the Task 0078 entitlement seam. Billing-worker internal route
  hardened with an `x-internal-caller` allow-list.
- **Task 0080** — PR #123 (`009d853`) — `membership-worker` gates
  invitation creation on `limit.members`. `countBillableMembers(orgId,
  now)` counts active members + pending non-expired invitations.
  Caller allow-list on billing-worker tightened to exactly
  `projects-worker` + `membership-worker`. Dependency-graph flip:
  `billing-worker → membership-worker` removed,
  `membership-worker → billing-worker` added (acyclic).
- **Task 0081** — PR #124 (`2037922`) — `projects-worker` gates
  environment creation on `limit.environments`. `decideQuantityGate`
  helper extracted; `decideProjectsLimit` behavior bit-identical.

All three entitlement gates share the same four-reason matrix
(`disabled` / `not_configured` / `malformed_limit` / `limit_reached`)
and the same fail-closed 503 envelope for service errors — the
contract Task 0082's `PreconditionInsight` UI surfaces.

## Repo Reality

- Tasks 0001–0083.1 verified and merged.
- Task 0083 cutover (Pages → Workers + Static Assets) fully live as of
  2026-05-29T13:30Z.
- Active spec pack: reusable SaaS starter under `specs/**`.
- `specs-v2/**` remains out of scope unless the task is product-specific.
- The full auth flow is accessible through the public `api-edge`
  gateway at `api-edge-{env}.rahulvarghesepullely.workers.dev`.
- Console is live at `https://{stage,prod}.sourceplane.ai` on
  `cloudflare_workers_domain.console`.
