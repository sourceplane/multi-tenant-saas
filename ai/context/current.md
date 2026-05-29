# Current Context

Last updated: 2026-05-29 (Task 0085a Implementer DONE — PR #133 open
3/3 SUCCESS; Verifier task scoped at `ai/tasks/task-0085a-verifier.md`)

## Current Task — 0085a (Verifier task scoped; PR #133 awaiting verify+merge)

Task 0085 ("bump cloudflare TF provider v4 → v5 + rename
`cloudflare_workers_domain` → `cloudflare_workers_custom_domain`") was
proven impossible as a single PR. Two implementer PR-CI runs hit hard
provider limits:

- run `26642692516` (bare `moved {}`): `Error: Unable to Move
  Resource State — Source Type cloudflare_workers_domain, Target Type
  cloudflare_workers_custom_domain`. The v5 provider does not
  implement cross-type `MoveState` for this rename.
- run `26642904336` (`removed{} + import{}` under `~> 5.0`):
  `Error: no schema available for cloudflare_workers_domain.console[0]
  while reading state`. Terraform needs the v4 schema to drop the
  v4-typed state entry, and v4 is gone under a `~> 5.0` pin.

Implementer filed `ai/proposals/task-0085-spec-update.md` proposing
the v5 upgrade guide's sanctioned **two-phase** pattern (same shape
`tf-migrate` produces for `cloudflare_zone_settings_override`).

**Orchestrator decision (2026-05-29): ACCEPTED.** Rescoped to:

- **Task 0085a** — Phase 1, under existing `cloudflare ~> 4.52`: add
  `removed { from = cloudflare_workers_domain.console; lifecycle {
  destroy = false } }`, fence/comment the live v4 resource block.
  Zero Cloudflare API writes. State-only mutation.
- **Task 0085b** — Phase 2, scoped only after 0085a verifier PASS +
  clean post-merge apply: provider bump to `~> 5.0`, replace fenced
  block with `cloudflare_workers_custom_domain.console`, re-import by
  the two known immutable IDs.

PR #132 (the failed single-PR attempt) was closed by the implementer
as superseded; branch left for reference.

### Task 0085a Implementer outcome (2026-05-29)

- **PR #133** (`impl/task-0085a-cloudflare-v4-workers-domain-state-drop`,
  branch `impl/task-0085a-cloudflare-v4-removed-state-drop`),
  `mergeable=MERGEABLE`, `mergeStateStatus=CLEAN`.
- PR-CI run `26644307676`: 3/3 SUCCESS (`plan`,
  `cloudflare-domain · stage · Terraform`,
  `cloudflare-domain · prod · Terraform`).
- Earlier PR-CI run `26644076501` captured the literal plan diff
  pasted into `ai/reports/task-0085a-implementer.md` — both env jobs
  show:

  ```
  # cloudflare_workers_domain.console[0] will no longer be managed by
    Terraform, but will not be destroyed
  # (destroy = false is set in the configuration)
   . resource "cloudflare_workers_domain" "console" {
        id          = "<known-id>"
   }

  Plan: 0 to add, 0 to change, 0 to destroy.

  Changes to Outputs:
    ~ worker_custom_domain_id = "<known-id>" -> "pending_v5_reimport_task_0085b"

  Warning: Some objects will no longer be managed by Terraform
   - cloudflare_workers_domain.console[0]
  ```

  with `<known-id>` = stage `052eaece5e989d5a7280b6c206e562c42950e3a6`
  and prod `31e5f2ed1b1e4a5700e8ae0678846a0d753840e1`.

  Wording-reconciliation note: Terraform 1.15.x does NOT add a
  `to forget` count to the plan footer for `removed { lifecycle {
  destroy = false } }`; the footer stays `Plan: 0 to add, 0 to
  change, 0 to destroy.` and the state-drop is communicated via the
  dedicated `Warning` block above. The load-bearing invariant is
  `to destroy = 0` AND the resource named in the warning block.

- Pre-merge probes all 200: stage + prod apex + both
  `*.rahulvarghesepullely.workers.dev` rollback hatches.

### Task 0085a Verifier (scoped 2026-05-29 — awaiting pickup)

- Prompt: `ai/tasks/task-0085a-verifier.md`
- PR-time check: confirm diff scope (only main.tf + README + impl
  report), confirm `removed{}` block + fenced v4 resource shape,
  confirm provider pin stays `~> 4.52`, confirm no
  `cloudflare_workers_custom_domain` symbol leaks, confirm CI logs
  contain the literal plan-diff strings on both envs.
- Merge per Verifier Merge Protocol (`agents/orchestrator.md`
  349–392).
- **Post-merge soak (load-bearing):** both
  `cloudflare-domain · {stage,prod} · Terraform · apply` jobs must
  log `Apply complete!` with `0 destroyed` AND a state-drop
  confirmation stanza for `cloudflare_workers_domain.console[0]`
  (`Removed from state` or the equivalent "no longer be managed"
  block). The four live probes must still return 200.
- **Failure mode (automatic FAIL + revert):** anything other than
  `0 destroyed` on the apply footer. A live Cloudflare API delete
  would unbind `stage.sourceplane.ai` and `prod.sourceplane.ai` from
  their Workers — a user-visible outage on the only two live
  custom-domain endpoints in the SaaS.

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

## Next task after 0085a

- **Task 0085b** — Phase 2: bump
  `required_providers.cloudflare.version` to `~> 5.0`, replace the
  fenced v4 block with `resource "cloudflare_workers_custom_domain"
  "console"`, add `import {}` blocks keyed by `var.environment`
  re-adopting the live resources by their immutable IDs (stage
  `052eaece5e989d5a7280b6c206e562c42950e3a6`, prod
  `31e5f2ed1b1e4a5700e8ae0678846a0d753840e1`). Restore
  `output worker_custom_domain_id` to the real attachment ID.
  Refresh `.terraform.lock.hcl` to cloudflare 5.x (multi-arch).
  Acceptance gate: PR-CI plan shows `Plan: 1 to import, 0 to add,
  0 to change, 0 to destroy.` on both envs; post-merge apply logs
  `Apply complete! Resources: 1 imported, 0 added, 0 changed, 0
  destroyed.` on both envs; live probes still 200.

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

- Tasks 0001–0084 verified and merged.
- Task 0085 split into 0085a (Phase 1) + 0085b (Phase 2) per accepted
  spec proposal. 0085a Implementer done (PR #133); Verifier scoped.
- Active spec pack: reusable SaaS starter under `specs/**`.
- `specs-v2/**` remains out of scope unless the task is product-specific.
- The full auth flow is accessible through the public `api-edge`
  gateway at `api-edge-{env}.rahulvarghesepullely.workers.dev`.
- Console is live at `https://{stage,prod}.sourceplane.ai` on
  `cloudflare_workers_domain.console`.
