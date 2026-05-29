# Current Context

Last updated: 2026-05-29 (Task 0084 verified PASS and merged; repo
healthy; Task 0085 unblocked as next candidate)

## Current Task — none scoped (Task 0084 closed; Task 0085 candidate)

Task 0084 ("drop legacy Pages residuals from cloudflare-domain")
verified PASS and merged via PR #131 (squash `305520a`,
2026-05-29T13:53Z). Post-merge soak on main CI run `26641282273` was a
clean no-op on both stage and prod:

```
cloudflare-domain · stage · Terraform · apply
  Apply complete! Resources: 0 added, 0 changed, 0 destroyed.
cloudflare-domain · prod · Terraform · apply
  Apply complete! Resources: 0 added, 0 changed, 0 destroyed.
```

This is the load-bearing proof that the dropped `pagesProjectPrefix`
variable, the `local.pages_project_name` binding, and the
`output "pages_project_name"` were truly dead — removing them touched
zero live Cloudflare resources.

Verifier report: `ai/reports/task-0084-verifier.md`.

## Repo health: green

Apex hostnames `stage.sourceplane.ai` and `prod.sourceplane.ai` remain
live on `cloudflare_workers_domain.console` (stage id
`052eaece5e989d5a7280b6c206e562c42950e3a6`, prod id
`31e5f2ed1b1e4a5700e8ae0678846a0d753840e1`). Rollback hatch
`*.rahulvarghesepullely.workers.dev` still serves 200 on both envs.
`wrangler pages project list` confirms the three legacy
`sourceplane-web-console-{dev,stage,prod}` Pages projects stay absent.
Provider pin holds at `cloudflare ~> 4.52`. orun toolchain pinned at
v2.3.0 in `kiox.lock`.

## Recently completed — Task 0084 (PASS)

- **PR #131** (`impl/task-0084-drop-pages-residuals`), squash `305520a`
  at 2026-05-29T13:53Z. 4 files: 3 in
  `infra/terraform/cloudflare-domain/` + implementer report.
- PR CI run `26640690294` (3/3 SUCCESS); post-merge main-CI run
  `26641282273` (3/3 SUCCESS).
- Plan diff was purely `Changes to Outputs: pages_project_name -> null`
  — zero resource churn.
- Out-of-band wrangler deletion of legacy Pages projects (done by
  implementer) confirmed persistent post-merge.
- Reports: `ai/reports/task-0084-implementer.md`,
  `ai/reports/task-0084-verifier.md`.

## Next candidates

- **Task 0085** — bump Cloudflare TF provider `~> 4.52` → `~> 5.x` and
  rename `cloudflare_workers_domain` → `cloudflare_workers_custom_domain`
  in `infra/terraform/cloudflare-domain/terraform/main.tf`. Requires a
  `moved {}` block (or `terraform state mv`) to preserve the two live
  resource IDs through the upgrade. Acceptance gate: post-merge apply
  on both envs shows `0 added, 0 changed, 0 destroyed.` (or a documented
  `moved` no-op) AND apex + rollback hatches still 200. Verifier should
  load `references/post-merge-deploy-profile-gap.md` and treat the soak
  as load-bearing (same discipline as 0083.1 + 0084).
- **Alternate** — spec-pack sweep to remove any remaining Pages-era
  references now that the soak is fully closed. Low-risk housekeeping,
  no infra change.

## Recently completed — Task 0083.1 (hotfix)

- **PR #130**, squash `2443826` at 2026-05-29T13:24Z.
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

- Tasks 0001–0084 verified and merged.
- Task 0083 cutover (Pages → Workers + Static Assets) fully live as of
  2026-05-29T13:30Z; Task 0084 housekeeping (drop dead variable/output +
  remove legacy Pages projects) closed at 2026-05-29T13:53Z.
- Active spec pack: reusable SaaS starter under `specs/**`.
- `specs-v2/**` remains out of scope unless the task is product-specific.
- The full auth flow is accessible through the public `api-edge`
  gateway at `api-edge-{env}.rahulvarghesepullely.workers.dev`.
- Console is live at `https://{stage,prod}.sourceplane.ai` on
  `cloudflare_workers_domain.console`.
