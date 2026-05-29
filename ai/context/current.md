# Current Context

Last updated: 2026-05-29 (Task 0086 Verifier FAIL — PR #134 left OPEN
on a single blocker; orchestrator to scope Task 0086.1 as a surgical
revert of the undisclosed `kiox.lock` bump)

## Current Task — 0086.1 scoping (orchestrator)

Task 0086 Verifier returned **FAIL** on PR #134
(`impl/task-0086-notifications-worker`, head
`b611398a89453f74dd3f96fd6d037a2295014aee`). Single blocker: the PR
carries an undisclosed `kiox.lock` bump
(orun runtime `v2.3.0` → `v2.9.0`, 4 lines: `source`, `version`,
`resolved` sha, `store` hash). The verifier prompt at
`ai/tasks/task-0086-verifier.md` lists `kiox.lock` in the "automatic
FAIL" surface and the surgical-commit allowance does not extend to
reverting it (prompt: "If the PR needs anything beyond the verifier
report add to pass, FAIL and surface to orchestrator").

PR #134 is **OPEN** with a FAIL comment posted. Verifier report is at
`ai/reports/task-0086-verifier.md`. State files updated to point at
`0086.1`.

### What 0086.1 needs to do (orchestrator-scoped)

Surgical revert of `kiox.lock` on `impl/task-0086-notifications-worker`
back to the four `main` lines (orun v2.3.0, sha
`0efcf1f8dc0500675ef43495977c17f7296f627e771a5018ddc04581b6fe7f4c`,
store `ad17befb8dc63f35e483be8f8b1769988b090e05a9b7f28236efd033e0db99dc`).
No other file change. Re-run PR-CI on #134. Once green, verifier
re-picks up #134 — every other check on the original verifier pass is
already green (see "What 0086 verified-clean below"), so the re-run is
just the lock-file diff + a fresh forbidden-surface diff.

### What 0086 verified-clean (carry-over for re-verify)

- Migration `120_notifications_core` checksum
  `868cc1092b4b385b6ed3d203efe5302191865131bb98d0e9f5fe5ad6d16f01bb`
  recomputes byte-identical ✓.
- All five canonical events present in `packages/contracts/src/notifications.ts`
  (`notification.queued/sent/failed/preference_updated/suppressed`).
- `templateData` excluded from all emitted event payloads (asserted by
  test at `tests/notifications-worker/src/notifications-service.test.ts:270`).
- Internal-actor gate on every non-health route in
  `apps/notifications-worker/src/router.ts`.
- `recipient_address` lower-cased at the repository layer
  (`createNotification`, `isSuppressed`, `createSuppression`).
- Hyperdrive IDs in `apps/notifications-worker/wrangler.jsonc` are
  real, NOT placeholders: stage `08f7c6055f544a3890a585d88fd92348`,
  prod `ab2c21c2db6245a59c91588fcac7107a` (match canonical
  events-worker/membership-worker bindings).
- `EVENTS_WORKER` service binding resolves to real
  `events-worker-{stage,prod}`.
- `orun validate` ✓, `orun component --changed --base main` returns
  exactly the 5 expected components, `orun plan --changed` ✓,
  `orun run --dry-run --runner github-actions` 12/12 ✓.
- Per-package build green for contracts + db + notifications-worker +
  notifications-worker-tests (4/4 turbo).
- Test suite `tests/notifications-worker` 20/20 passing locally.
- PR-CI run `26649268365` 13/13 SUCCESS (NB: green is incidental —
  v2.9.0 was already cached on runners from prior workflows; CI
  passing does not validate the bump).
- `db-migrate · {stage,prod} · Migrate` PR-CI jobs already applied
  `120_notifications_core` to both Supabase projects (jobs
  `78543110891` stage / `78543110838` prod). Post-merge main-CI
  db-migrate will be a no-op on this migration.
- Wrangler dry-run upload 150.63 KiB / gzip 34.80 KiB (stage+prod
  identical).
- Secrets in CI logs properly masked (`token: ***`, `password: ***`).
- No touch to `infra/terraform/cloudflare-domain/**` — Task 0085b
  deferred risk window honored.

### What blocked it

```
$ git diff origin/main...HEAD -- kiox.lock
-      source: ghcr.io/sourceplane/orun:v2.3.0
-      version: v2.3.0
-      resolved: ghcr.io/sourceplane/orun@sha256:0efcf1f8dc0500675ef43495977c17f7296f627e771a5018ddc04581b6fe7f4c
-      store: ad17befb8dc63f35e483be8f8b1769988b090e05a9b7f28236efd033e0db99dc
+      source: ghcr.io/sourceplane/orun:v2.9.0
+      version: v2.9.0
+      resolved: ghcr.io/sourceplane/orun@sha256:a57f8d8822f2d6ff2e11502e5797853316220bfa3c6371300e6e4807b190d23e
+      store: d018050502f49ac2116527f676477ffff028f3f45f98d48771a1f225dfb63ffc
```

Not mentioned in `ai/reports/task-0086-implementer.md`. Verifier
prompt invariant violated:
> `kiox.lock` is byte-identical to `main` (orun runtime stays v2.3.0;
> no incidental bump).

## Repo health: green (apex untouched)

Apex hostnames `stage.sourceplane.ai` and `prod.sourceplane.ai`
remain live on the original Cloudflare Workers custom-domain
attachments (stage id
`052eaece5e989d5a7280b6c206e562c42950e3a6`, prod id
`31e5f2ed1b1e4a5700e8ae0678846a0d753840e1`). Rollback hatch
`*.rahulvarghesepullely.workers.dev` still serves 200 on both envs.
Provider pin holds at `cloudflare ~> 4.52` (Task 0085b deferred).
`main` `kiox.lock` is pinned at orun v2.3.0 (this is the value
0086.1 must restore on the PR branch). `main` tip on `origin/main`
is `9f9ea1a` (post Task 0085a verifier close-out).

## Deferred — Task 0085b (cloudflare-domain v4 → v5, Phase 2)

User has explicitly deferred 0085b. The narrow Terraform-tracking
risk window from Task 0085a remains open: the two live
custom-domain attachments are **not** Terraform-managed between the
0085a merge and the eventual 0085b apply. Cloudflare-side drift
would not be detected by `terraform plan`. Mitigation: no manual
Cloudflare-dashboard or wrangler edits to those attachments while
0085b is parked. Task 0086 was verified at scoping time to NOT
touch `infra/terraform/cloudflare-domain/**` so the window does not
widen. 0086.1 (kiox.lock revert) also must not widen it.

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

## Next tasks after 0086.1 revert + 0086 verifier re-PASS

1. **Notifications caller wiring** — wire `identity-worker`
   magic-link send and/or `membership-worker` invitation email
   through notifications-worker. Unblocks roadmap B1 (real auth).
2. **Real provider swap** — slot Resend / SES / Postmark into
   `apps/notifications-worker/src/providers/` and gate via
   `NOTIFICATIONS_PROVIDER`. Required before any real delivery.
3. **Revive Task 0085b** when the user lifts the defer.
4. **Pre-existing identity-worker-tests `crypto` type fix** (unrelated
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
  but verifier FAIL on undisclosed `kiox.lock` bump — PR #134 OPEN,
  awaiting 0086.1 surgical revert.
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
- Notifications-worker V1 code is reviewable-clean on the PR branch
  but cannot merge until `kiox.lock` is reverted. No live deploy in
  stage/prod yet (PR-CI Verify-deploy jobs are green but the live
  Workers won't exist on the org until the post-merge main-CI
  Verify-deploy lands).
