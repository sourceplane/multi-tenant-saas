# Task 0086 — Verifier Report

## Result: FAIL

**Single blocker:** PR #134 contains an undisclosed `kiox.lock` bump
(orun runtime `v2.3.0` → `v2.9.0`). The verifier prompt explicitly forbids
this surface and lists `kiox.lock` in the "automatic FAIL" set. The
verifier's surgical-commit allowance does not extend to reverting this
bump (the prompt says "If the PR needs anything beyond the verifier
report add to pass, FAIL and surface to orchestrator"). PR #134 is being
left OPEN for an orchestrator-scoped revert.

Everything else on the PR passes — the code is clean, all 12 PR-CI
jobs are green, the migration applies cleanly, internal-actor gates
work, no secret leaks, no Task 0085b surface drift. This is a single
out-of-scope surface that just needs to be reverted before merge.

PR head: `b611398a89453f74dd3f96fd6d037a2295014aee` (verified against
`gh pr view 134 --json headRefOid`).

---

## Checks

### Forbidden-surface diff — FAIL

```
$ git diff origin/main...verify-0086 -- infra/ kiox.lock .terraform.lock.hcl intent.yaml stack-tectonic/
diff --git a/kiox.lock b/kiox.lock
@@ -5,7 +5,7 @@ metadata:
 providers:
     - alias: orun
       provider: sourceplane/orun
-      source: ghcr.io/sourceplane/orun:v2.3.0
-      version: v2.3.0
-      resolved: ghcr.io/sourceplane/orun@sha256:0efcf1f8dc0500675ef43495977c17f7296f627e771a5018ddc04581b6fe7f4c
-      store: ad17befb8dc63f35e483be8f8b1769988b090e05a9b7f28236efd033e0db99dc
+      source: ghcr.io/sourceplane/orun:v2.9.0
+      version: v2.9.0
+      resolved: ghcr.io/sourceplane/orun@sha256:a57f8d8822f2d6ff2e11502e5797853316220bfa3c6371300e6e4807b190d23e
+      store: d018050502f49ac2116527f676477ffff028f3f45f98d48771a1f225dfb63ffc
```

Verifier prompt §"Pre-merge" acceptance criterion (verbatim):
> `kiox.lock` is byte-identical to `main` (orun runtime stays v2.3.0;
> no incidental bump).

And:
> Any file outside that set — and in particular any change under …
> `kiox.lock`, or `.terraform.lock.hcl` — is an automatic FAIL.

PR-CI runners already pull `orun-Linux-X64-v2.9.0` from cache regardless,
so CI is green despite the bump. The implementer report does not
disclose the bump (no mention of "kiox", "v2.9", "v2.3", or "runtime").

### Everything else — PASS

| Check | Command | Result |
|---|---|---|
| PR head SHA | `gh pr view 134 --json headRefOid` | `b611398a89453f74dd3f96fd6d037a2295014aee` ✓ |
| Diff scope (subsystem level) | `git diff --name-only origin/main...verify-0086` | All other paths in scope (notifications-worker, contracts/notifications.ts, db/notifications + migration 120, tests, db.types.ts widen, contracts.index.ts re-export, manifest.ts append, pnpm-lock.yaml, ai/ docs). One out-of-scope file: kiox.lock. ✓ except FAIL above. |
| Task 0085b surface untouched | `git diff origin/main...verify-0086 -- infra/terraform/cloudflare-domain/` | empty ✓ |
| cloudflare-domain symbol set unchanged | grep `cloudflare_workers_domain\|cloudflare_workers_custom_domain` in `infra/terraform/cloudflare-domain/` | identical to main ✓ |
| Manifest checksum | `shasum -a 256 packages/db/src/migrations/120_notifications_core/up.sql` | `868cc1092b4b385b6ed3d203efe5302191865131bb98d0e9f5fe5ad6d16f01bb` — matches `manifest.ts` byte-for-byte ✓ |
| orun validate | `kiox -- orun validate --intent intent.yaml` | `✓ Intent is valid`, `✓ All validation passed` ✓ |
| orun changed components | `kiox -- orun component --changed --base main` | exactly 5: contracts, db, db-migrate, notifications-worker, notifications-worker-tests ✓ |
| orun plan | `kiox -- orun plan --changed --intent intent.yaml --output plan.json` | `5 components × 3 envs → 12 jobs` ✓ |
| orun dry-run | `kiox -- orun run --plan plan.json --dry-run --runner github-actions` | 12/12 ✓ in preview ✓ |
| turbo build | `pnpm exec turbo run build --filter=@saas/notifications-worker --filter=@saas/notifications-worker-tests --filter=@saas/contracts --filter=@saas/db` | 4/4 ok (FULL TURBO cache) ✓ |
| notifications-worker tests | `cd tests/notifications-worker && pnpm test` | `Test Suites: 2 passed, 2 total`, `Tests: 20 passed, 20 total` ✓ |
| Internal-actor gate code path | read `apps/notifications-worker/src/router.ts` | every non-health route resolves actor and returns 403 + standard envelope when absent/unknown ✓ |
| Service create→emit→dispatch→record→mark→emit sequence | read `apps/notifications-worker/src/services/notifications.ts` | matches spec ✓ |
| `templateData` event-payload exclusion | grep `templateData` in services + tests | persisted on row (lines 187/235), excluded from all 5 emit calls (queued/sent/failed/suppressed/preference); test 270 explicitly asserts `expect(ev.payload).not.toHaveProperty("templateData")` ✓ |
| Recipient lowercasing | grep `toLowerCase\|LOWER(` | applied at `packages/db/src/notifications/repository.ts:143` (createNotification.recipientAddress), `:332` (isSuppressed.address), `:355` (createSuppression.address) ✓ |
| PR CI rollup | `gh pr view 134 --json statusCheckRollup` | 13/13 SUCCESS (plan + 4 contracts/db × envs + db-migrate stage/prod + notifications-worker × 3 envs + notifications-worker-tests dev) ✓ |
| PR-CI stage Verify deploy bindings | run `26649268365` job `78543110941` | resolved real `SOURCEPLANE_DB (08f7c6055f544a3890a585d88fd92348)` Hyperdrive + `EVENTS_WORKER (events-worker-stage)` service binding; Total Upload 150.63 KiB / gzip 34.80 KiB ✓ |
| PR-CI prod Verify deploy bindings | run `26649268365` job `78543110922` | resolved real `SOURCEPLANE_DB (ab2c21c2db6245a59c91588fcac7107a)` + `EVENTS_WORKER (events-worker-prod)`; same upload size ✓ |
| PR-CI db-migrate stage Apply | run `26649268365` job `78543110891` | `"applied": [ "120_notifications_core" ]`; `✓ Migrate completed · 29.9s` ✓ |
| PR-CI db-migrate prod Apply | run `26649268365` job `78543110838` | `"applied": [ "120_notifications_core" ]` ✓ |
| Secret-shape audit on PR CI logs | grep `password\|token\|secret\|postgres://[^@]*:` | only `password: ***`, `token: ***`, `GH_TOKEN: ***` (Actions-masked) ✓ |

---

## Scope Audit

Full file list from `git diff --name-only origin/main...verify-0086`,
grouped by subsystem:

### In scope per task (38 files)

- **`apps/notifications-worker/` (new worker, 19 files)** — in scope ✓
  - `component.yaml`, `eslint.config.js`, `package.json`, `tsconfig.json`, `wrangler.jsonc`
  - `src/env.ts`, `src/events-client.ts`, `src/http.ts`, `src/ids.ts`, `src/index.ts`, `src/router.ts`
  - `src/handlers/{create-suppression,enqueue,get-notification,get-preferences,health,put-preferences}.ts`
  - `src/providers/{index,local-debug}.ts`
  - `src/services/notifications.ts`
- **`packages/contracts/` (3 files)** — in scope ✓
  - `src/notifications.ts` (new)
  - `src/index.ts` (re-export only)
  - `package.json` (export wiring)
- **`packages/db/` (5 files)** — in scope ✓
  - `src/notifications/{index,repository,types}.ts` (new)
  - `src/migrations/120_notifications_core/up.sql` (new)
  - `src/manifest.ts` (append `120_notifications_core` entry)
  - `src/types.ts` (`BoundedContext` union widen: `"notifications"`)
  - `package.json` (export wiring)
- **`tests/notifications-worker/` (6 files)** — in scope ✓
  - `component.yaml`, `eslint.config.js`, `package.json`, `tsconfig.json`
  - `src/notifications-service.test.ts`, `src/router.test.ts`
- **`pnpm-lock.yaml`** — in scope ✓ (regen for the new packages)
- **`ai/tasks/task-0086.md`** + **`ai/reports/task-0086-implementer.md`** — in scope ✓

### Out of scope — FAIL

- **`kiox.lock`** — orun runtime `v2.3.0` → `v2.9.0`. Verifier prompt
  explicitly forbids this surface and the implementer report does not
  disclose it. **Automatic FAIL per prompt.** This must be reverted on
  the PR branch (by the orchestrator-scoped follow-up) before the PR
  can merge.

---

## Spec Conformance

Pasted verbatim from `packages/contracts/src/notifications.ts`:

### Five event-type constants — present ✓

```ts
export const NOTIFICATION_EVENT_TYPES = {
  QUEUED: "notification.queued",
  SENT: "notification.sent",
  FAILED: "notification.failed",
  PREFERENCE_UPDATED: "notification.preference_updated",
  SUPPRESSED: "notification.suppressed",
} as const;
```

### Channel enum — open to extension ✓

```ts
export type NotificationChannel = "email";
```

V1 ships email only; declared as a `type` union so future channels
extend the type without breaking the contract.

### Internal-actor allow-list ✓

```ts
export const NOTIFICATIONS_INTERNAL_ACTOR_HEADER = "x-internal-actor";
export const NOTIFICATIONS_INTERNAL_ACTOR_VALUES = [
  "identity-worker",
  "membership-worker",
  "billing-worker",
  "webhooks-worker",
  "events-worker",
  "policy-worker",
  "projects-worker",
  "config-worker",
  "metering-worker",
  "notifications-worker",
] as const;
```

This list is broader than the implementer-report claim
(`membership-worker, billing-worker, policy-worker, events-worker,
api-edge`), but spec 14 (`specs/components/14-notifications.md`) does
not enumerate the allow-list — so no spec drift. Notable: `api-edge` is
NOT on the allow-list (consistent with the V1 "internal-only, no public
edge facade" stance); `notifications-worker` is self-allow-listed for
internal re-entry. Recommend orchestrator review whether to narrow
this in a follow-up if the broader surface widens blast radius.

### Surface shapes — present ✓

- `EnqueueNotificationRequest` / `EnqueueNotificationResponse` ✓
- `GetNotificationResponse` ✓
- `GetNotificationPreferencesQuery` / `GetNotificationPreferencesResponse` /
  `UpdateNotificationPreferencesRequest` / `UpdateNotificationPreferencesResponse` ✓
- `SuppressRecipientRequest` / `SuppressRecipientResponse` ✓

---

## Tenancy Invariants

Read `packages/db/src/migrations/120_notifications_core/up.sql`:

- Every table in `notifications` schema has `org_id UUID NOT NULL`:
  `notification_preferences` (line 43), `notifications` (line 78),
  `notification_attempts` (line 140), `notification_suppressions`
  (line 172). ✓
- Idempotency unique index is **composite (org_id, idempotency_key)**:
  ```sql
  CREATE UNIQUE INDEX IF NOT EXISTS notifications_idempotency_idx
    ON notifications.notifications (org_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;
  ```
  Partial-index `WHERE idempotency_key IS NOT NULL` is correct — allows
  optional idempotency-key. ✓
- `recipient_address` lower-cased at write time:
  - `packages/db/src/notifications/repository.ts:143` —
    `input.recipientAddress.toLowerCase()` on createNotification
  - `:332` — `address.toLowerCase()` on `isSuppressed` lookup
  - `:355` — `input.address.toLowerCase()` on createSuppression
  Suppression lookup uses the same lower-cased form, so
  case-mismatched suppressions match the canonical row. ✓
- Migration is fully `IF NOT EXISTS` (schema, all 4 tables, all 8
  indexes). No DROP statements. Additive only. ✓

---

## Manifest Checksum

| Source | Value |
|---|---|
| Computed `shasum -a 256 packages/db/src/migrations/120_notifications_core/up.sql` | `868cc1092b4b385b6ed3d203efe5302191865131bb98d0e9f5fe5ad6d16f01bb` |
| Claimed in `packages/db/src/manifest.ts:119` | `868cc1092b4b385b6ed3d203efe5302191865131bb98d0e9f5fe5ad6d16f01bb` |

Match — byte-identical. PASS. ✓

---

## CI Log Review

PR-CI run ID: **`26649268365`** (13/13 SUCCESS).

### `notifications-worker · stage · Verify deploy` (job 78543110941)

```
> wrangler deploy --dry-run --outdir dist
 ⛅️ wrangler 4.90.0
Total Upload: 150.63 KiB / gzip: 34.80 KiB
Your Worker has access to the following bindings:
env.SOURCEPLANE_DB (08f7c6055f544a3890a585d88fd92348)              Hyperdrive Config
env.EVENTS_WORKER (events-worker-stage)                            Worker
--dry-run: exiting now.
✓  07 deploy-dry-run  0.9s  ·  ⛅️ wrangler 4.90.0
```

Note: PR-CI runs `wrangler deploy --dry-run --outdir dist` — the
package gets uploaded structurally but no live deploy hits the Cloudflare
edge. The actual live deploy runs on the post-merge main-CI run under
the `deploy` profile (`profileRules.when.triggerRef: github-push-main`).

### `notifications-worker · prod · Verify deploy` (job 78543110922)

```
Total Upload: 150.63 KiB / gzip: 34.80 KiB
env.SOURCEPLANE_DB (ab2c21c2db6245a59c91588fcac7107a)              Hyperdrive Config
env.EVENTS_WORKER (events-worker-prod)                             Worker
```

### `db-migrate · stage · Migrate` (job 78543110891)

```
"applied": [
    "120_notifications_core"
✓ Migrate completed · 29.9s
```

### `db-migrate · prod · Migrate` (job 78543110838)

```
"applied": [
    "120_notifications_core"
```

**Important note for post-merge expectations:** PR-CI on this profile
**applies** the migration (not plan-only). That means the migration is
already on both Supabase projects from the PR-CI run, and the
post-merge main-CI `db-migrate` jobs will report "already applied" /
no-op rather than a fresh apply.

### `notifications-worker-tests · dev · Verify` (job 78543110811)

The Jest stdout/test summary was not captured in the CI log tail
(the orun runner consolidates child-process logs and the
`Tests: 20 passed` line did not surface in the visible tail), but the
job exited SUCCESS and local `pnpm test` from the same checkout
reproduces `Test Suites: 2 passed, 2 total — Tests: 20 passed, 20 total`.
Treating the local reproduction as sufficient cross-check. ✓

---

## `wrangler.jsonc` Placeholder Audit

Read `apps/notifications-worker/wrangler.jsonc`:

```jsonc
"stage": {
  "hyperdrive": [{ "binding": "SOURCEPLANE_DB", "id": "08f7c6055f544a3890a585d88fd92348" }],
  "services":   [{ "binding": "EVENTS_WORKER",  "service": "events-worker-stage" }]
},
"prod": {
  "hyperdrive": [{ "binding": "SOURCEPLANE_DB", "id": "ab2c21c2db6245a59c91588fcac7107a" }],
  "services":   [{ "binding": "EVENTS_WORKER",  "service": "events-worker-prod"  }]
}
```

Cross-checked against the canonical IDs already in production:

- `events-worker/wrangler.jsonc`: stage `08f7c6055f544a3890a585d88fd92348`,
  prod `ab2c21c2db6245a59c91588fcac7107a` ✓
- `membership-worker/wrangler.jsonc`: identical IDs ✓

**Finding: NOT placeholders.** These are the canonical shared Hyperdrive
cluster IDs in active use by `events-worker` and `membership-worker`,
and the `EVENTS_WORKER` service binding points at the real
`events-worker-{env}` services. The implementer Follow-up #3 concern
about "shared placeholders from events-worker" is overstated — they're
the right IDs because all workers share the same Hyperdrive cluster
per env.

PR-CI Verify-deploy logs confirm the wrangler binding-resolution step
listed the bindings as `Hyperdrive Config` and `Worker` (not as
placeholders / not as unresolved). The bindings will work post-merge.

No placeholder-swap follow-up required.

---

## Live Resource Evidence

**Not run.** Result is FAIL — PR did not merge — so the post-merge
live probes do not apply for this verifier pass. The four URLs the
prompt enumerates remain on `main` in their pre-0086 state:

- `https://sourceplane-notifications-worker-stage.rahulvarghesepullely.workers.dev/health` — not deployed yet
- `https://sourceplane-notifications-worker-prod.rahulvarghesepullely.workers.dev/health`  — not deployed yet
- `https://stage.sourceplane.ai/` — unchanged from Task 0085a
- `https://prod.sourceplane.ai/`  — unchanged from Task 0085a

These will be re-run by the next verifier pass after the kiox.lock
revert + merge.

---

## Secret Handling Review

PR-CI db-migrate logs grepped for secret-shape strings: only
`password: ***`, `token: ***`, `GH_TOKEN: ***` (Actions-masked).
No raw token / connection-string / API-key surface in any logs.
Code review of services + handlers: no logged credentials, no raw
provider payloads in event envelopes, `last_error` field carries
bounded human-readable strings only per the migration's column
comment (line 130). ✓

---

## Spec Proposals

None required. Spec 14 is silent on the internal-actor allow-list
membership, so the broader-than-claimed list is not drift. No new
proposal file.

---

## Risk Notes

1. **Undisclosed `kiox.lock` bump (the FAIL itself).** orun runtime
   v2.3.0 → v2.9.0 sneaked in. PR-CI is green because runners already
   cache v2.9.0, but `main` still pins v2.3.0. A follow-up scoped by
   the orchestrator should:
   - Either revert kiox.lock to v2.3.0 on the PR #134 branch (single
     commit) and re-run CI, then verifier re-runs the merge protocol;
   - Or, if the user wants the bump, scope a separate runtime-bump
     task that lands kiox.lock alone (with disclosure + intent), then
     rebase #134 on top.
2. **PR-CI `db-migrate` mode is APPLY, not plan-only.** Worth
   confirming this matches the intended profile shape — it means the
   migration is already on stage+prod Supabase **as of PR-CI time**,
   not after merge. Post-merge `db-migrate` will be a no-op for
   `120_notifications_core`. This is the same shape Task 0086 was
   scoped to expect (the verifier prompt acknowledges "record which
   mode this profile uses on PRs"). Not a blocker, just worth
   surfacing.
3. **Notifications worker is dark in production until caller wiring.**
   Once #134 merges, the worker is deployed but no caller wires it
   yet. Follow-up needed: either `identity-worker` magic-link or
   `membership-worker` invitation-email integration.
4. **Internal-actor allow-list breadth.** The contract whitelists 10
   workers including `notifications-worker` (self-call), `webhooks-worker`,
   `projects-worker`, `config-worker`, `metering-worker`. Some of these
   have no plausible enqueue reason in V1. Consider tightening before
   real provider lands.
5. **Pre-existing `@saas/identity-worker-tests` `crypto` type error**
   on `main` is unaffected by 0086 and remains a separate follow-up.

---

## Recommended Next Move

**Orchestrator should scope `task-0086.1` (single-commit kiox.lock
revert) to land before merging #134.** Scope:

- Branch off `impl/task-0086-notifications-worker` (the PR #134 branch).
- `git checkout origin/main -- kiox.lock` to restore v2.3.0.
- Commit `revert(orun): drop incidental kiox.lock bump from task-0086 (v2.9.0 → v2.3.0)`.
- Push to the PR branch. PR-CI re-runs.
- Verifier re-runs Phases 1, 3, 5-7 (Phase 2 code inspection is already
  captured here). Expected: clean PASS, merge, post-merge soak, live
  probes.

After that, the next orchestration cycle picks among the three
candidates already in `current.md`:

- (a) caller-wiring follow-up — magic-link via identity-worker or
  invitation-email via membership-worker;
- (b) real-provider swap — Resend / SES / Postmark;
- (c) revive Task 0085b when the user lifts the defer.

## PR Number

**#134** — https://github.com/sourceplane/multi-tenant-saas/pull/134
(left OPEN; not merged).
