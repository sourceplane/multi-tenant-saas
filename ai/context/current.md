# Current Context

Last updated: 2026-05-29 (Task 0085a Verifier PASS — PR #133 squash-merged
at `efa539c`; post-merge soak clean on both envs; next focus = scope 0085b)

## Current Task — 0085b (to be scoped; 0085a Phase 1 is live on main)

Phase 1 of the v4→v5 cloudflare-domain migration landed cleanly. The
v4-typed `cloudflare_workers_domain.console` state entry is dropped on
both envs via `removed { lifecycle { destroy = false } }`; the live
Cloudflare custom-domain attachments are untouched.

The two live attachments are now **untracked by Terraform** until 0085b
re-imports them under the v5 provider. This is a deliberate, narrow risk
window — keep 0085b on the immediate orchestrator queue.

### Task 0085a Verifier outcome (2026-05-29, PASS)

- **PR #133** (`impl/task-0085a-cloudflare-v4-removed-state-drop`),
  squash-merged at `efa539cdd662da8399fb1303ee497bf54684a1eb`
  (2026-05-29T15:06:12Z) via `--admin` (rollup 3/3 SUCCESS uncontested;
  branch was 1 commit behind on the unrelated orchestration-scoping
  commit `d43cf81` only — Terraform diff itself was clean).
- PR-CI run `26644307676`: 3/3 SUCCESS (`plan`,
  `cloudflare-domain · stage · Terraform` job `78525561837`,
  `cloudflare-domain · prod · Terraform` job `78525561825`). All
  load-bearing literal plan-diff strings present on both env jobs.
- Post-merge main-CI run `26645041830`: 3/3 SUCCESS
  (`cloudflare-domain · stage · Terraform · apply` job `78528178977`,
  `cloudflare-domain · prod · Terraform · apply` job `78528178968`).
  Both jobs logged:

  ```
  Apply complete! Resources: 0 added, 0 changed, 0 destroyed.
  worker_custom_domain_id = "pending_v5_reimport_task_0085b"
  ```

  State-drop confirmation surfaced via the
  `Warning: Some objects will no longer be managed by Terraform` block
  naming `cloudflare_workers_domain.console[0]` (Terraform 1.15.x does
  NOT emit a separate `Removed from state` line for `removed {
  lifecycle { destroy = false } }`; the warning block IS the canonical
  state-drop signal per the wording-reconciliation note).

  **0 destroyed on both envs is the load-bearing PASS invariant** — no
  Cloudflare API delete was issued; the two live custom-domain
  attachments survive byte-identically.

- Post-merge live probes (2026-05-29T15:08–15:09Z):
  - `https://stage.sourceplane.ai/` → 200 `Sourceplane Console`
  - `https://prod.sourceplane.ai/` → 200 `Sourceplane Console`
  - `https://sourceplane-web-console-next-stage.rahulvarghesepullely.workers.dev/`
    → 200 `Sourceplane Console`
  - `https://sourceplane-web-console-next-prod.rahulvarghesepullely.workers.dev/`
    → 200 `Sourceplane Console`

- Post-apply `orun plan --changed` selects 0 jobs — confirms state drop
  is durable; no hidden re-create queued.

- Reports: `ai/reports/task-0085a-implementer.md`,
  `ai/reports/task-0085a-verifier.md`.

### Risk window OPEN until 0085b

Between this merge and Task 0085b's `import {}` apply, the two live
custom-domain attachments are **not Terraform-tracked**. Cloudflare-side
drift would not be detected by `terraform plan`. The
`output "worker_custom_domain_id"` is a literal placeholder
`pending_v5_reimport_task_0085b` (no downstream consumers — `grep`
previously confirmed only this component's `output` block references
it). Mitigation: scope 0085b as the immediate next task; no manual
Cloudflare-dashboard or wrangler edits to these attachments during the
window.

## Repo health: green

Apex hostnames `stage.sourceplane.ai` and `prod.sourceplane.ai` remain
live on the original Cloudflare Workers custom-domain attachments (stage
id `052eaece5e989d5a7280b6c206e562c42950e3a6`, prod id
`31e5f2ed1b1e4a5700e8ae0678846a0d753840e1` — IDs verified intact via the
plan-diff and apply logs). Rollback hatch
`*.rahulvarghesepullely.workers.dev` still serves 200 on both envs.
Provider pin holds at `cloudflare ~> 4.52` (bumped in 0085b).
`kiox.lock` pinned at orun v2.3.0.

## Next task — 0085b

- **Task 0085b** — Phase 2 of v4→v5 cloudflare-domain migration:
  - Bump `required_providers.cloudflare.version` in
    `infra/terraform/cloudflare-domain/terraform/main.tf` from
    `~> 4.52` to `~> 5.0`.
  - Replace the fenced v4 `resource "cloudflare_workers_domain"
    "console"` block (currently commented at `main.tf` lines 224–232)
    with `resource "cloudflare_workers_custom_domain" "console"` using
    the v5 schema.
  - Add `import {}` blocks keyed by `var.environment` re-adopting the
    two known immutable IDs (stage
    `052eaece5e989d5a7280b6c206e562c42950e3a6`, prod
    `31e5f2ed1b1e4a5700e8ae0678846a0d753840e1`).
  - Restore `output "worker_custom_domain_id"` to reference the real
    attachment ID (drop the `pending_v5_reimport_task_0085b`
    placeholder).
  - Drop the `removed {}` block (its work is done) and clear the Phase 1
    fence comments.
  - Refresh `.terraform.lock.hcl` to cloudflare 5.x (multi-arch hashes:
    linux_amd64 + darwin_arm64 minimum).
- Acceptance gate: PR-CI plan shows `Plan: 1 to import, 0 to add,
  0 to change, 0 to destroy.` on both envs; post-merge apply logs
  `Apply complete! Resources: 1 imported, 0 added, 0 changed,
  0 destroyed.` on both envs; the four live probes still return 200.

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

- Tasks 0001–0084 and 0085a verified and merged.
- Task 0085 split into 0085a (Phase 1, DONE) + 0085b (Phase 2, queued)
  per accepted spec proposal.
- Active spec pack: reusable SaaS starter under `specs/**`.
- `specs-v2/**` remains out of scope unless the task is product-specific.
- The full auth flow is accessible through the public `api-edge`
  gateway at `api-edge-{env}.rahulvarghesepullely.workers.dev`.
- Console is live at `https://{stage,prod}.sourceplane.ai` on the
  original Cloudflare Workers custom-domain attachments (untracked by
  Terraform between 0085a merge and 0085b re-import).
