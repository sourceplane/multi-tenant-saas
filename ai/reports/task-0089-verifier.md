# Task 0089 — Verifier Report

## Result: PASS

PR #137 (`impl/task-0089-shared-notifications-client`) extracts the
duplicated `notifications-client.ts` from `apps/identity-worker/src/`
and `apps/membership-worker/src/` into a shared workspace package
`@saas/notifications-client` (`packages/notifications-client/`) and
wires `accept-invitation` to enqueue `invitation.accepted` post-commit
as the contractual third-caller trigger. PR boundary held; never-throws
contract preserved verbatim from the identity-worker source (only
doc-voice differences); enqueue strictly post-commit; raw token absent
from `templateData`; canonical 8-test suite consolidated; per-worker
client tests deleted; PR CI 13/13 SUCCESS on run `26665348096`
(headSha `a5e7a3c`).

## Checks

### Scope audit (`git diff --name-only origin/main...HEAD` vs PR Boundary)

| File | Status | In/Out |
|---|---|---|
| `packages/notifications-client/package.json` | A | IN |
| `packages/notifications-client/tsconfig.json` | A | IN |
| `packages/notifications-client/tsconfig.build.json` | A | IN |
| `packages/notifications-client/eslint.config.js` | A | IN |
| `packages/notifications-client/component.yaml` | A | IN |
| `packages/notifications-client/src/index.ts` | R083 from `apps/identity-worker/src/notifications-client.ts` | IN (rename = lift+delete) |
| `apps/identity-worker/package.json` | M | IN (`+@saas/notifications-client`) |
| `apps/identity-worker/src/handlers/login-start.ts` | M | IN (import-only swap, 1 line) |
| `apps/identity-worker/src/notifications-client.ts` | DELETED (via R083) | IN |
| `apps/membership-worker/package.json` | M | IN (`+@saas/notifications-client`) |
| `apps/membership-worker/src/handlers/create-invitation.ts` | M | IN (import-only swap, 1 line) |
| `apps/membership-worker/src/handlers/accept-invitation.ts` | M | IN (NEW enqueue wire) |
| `apps/membership-worker/src/notifications-client.ts` | D | IN (deletion) |
| `tests/notifications-client/{package.json,tsconfig.json,eslint.config.js,component.yaml}` | A | IN |
| `tests/notifications-client/src/notifications-client.test.ts` | R073 from `tests/identity-worker/src/notifications-client.test.ts` | IN |
| `tests/membership-worker/src/accept-invitation-notifications.test.ts` | A | IN |
| `tests/identity-worker/src/notifications-client.test.ts` | DELETED (via R073) | IN |
| `tests/membership-worker/src/notifications-client.test.ts` | D | IN |
| `ai/tasks/task-0089.md` | A | IN |
| `ai/reports/task-0089-implementer.md` | A | IN |
| `pnpm-lock.yaml` | M | IN-implicit (workspace graph add of `@saas/notifications-client` + tests workspace; no upstream version bumps; scaffolding-only) |
| `ai/context/current.md`, `ai/context/task-ledger.md`, `ai/state.json`, `ai/deferred.md`, `ai/waiting_for_input.md` | M | ORCHESTRATION-STATE (implementer-tracked active-task state, will be rewritten on close-out commit; matches Task 0088 pattern) |

Out-of-bounds files touched: **none**.
- `apps/notifications-worker/**` — UNCHANGED ✓
- `packages/contracts/src/notifications.ts` — UNCHANGED ✓
- `infra/terraform/cloudflare-domain/**` — UNCHANGED ✓
- `kiox.lock` — UNCHANGED (`git diff origin/main...HEAD -- kiox.lock` empty) ✓
- No wrangler.jsonc service-binding edits in either consumer worker ✓

### Code-path inspection

`packages/notifications-client/src/index.ts` vs
`git show 9811919:apps/identity-worker/src/notifications-client.ts`:
logic byte-equivalent. Only differences are doc-voice (the package
comment block is more general — references invitation tokens and
membership-worker as a caller) and one expanded JSDoc line on
`internalActor`. Never-throws contract preserved: every failure mode
returns a `{ ok: false, reason }` envelope; no `throw` outside the
caller's guarded `try`. Exports `enqueueNotification`,
`EnqueueNotificationResult`, `NotificationsEnvBinding` as required.

Three call sites confirmed:
- `apps/identity-worker/src/handlers/login-start.ts` — single-line import
  swap from `../notifications-client.js` → `@saas/notifications-client`,
  no logic change.
- `apps/membership-worker/src/handlers/create-invitation.ts` — single-line
  import swap, no logic change. `git diff` shows only the import line
  differs from `9811919`; enqueue position inside the
  `if (txResult.result.ok)` post-commit branch is byte-equivalent to the
  Task 0088 baseline.
- `apps/membership-worker/src/handlers/accept-invitation.ts` — NEW wire.
  `executor.transaction(...)` body (lines 108–156) only contains the
  membership repo write + events append; enqueue lives at lines 187–235,
  strictly after `if (!txResult.result.ok) return errorResponse(...)`
  on the negative branch (lines 158–171). All five negative branches
  (`not_found`, `expired`, `revoked`, `already_accepted`, `conflict`)
  return early before reaching the enqueue site. No-deps (transactional)
  path uses `enqueueFn = deps?.enqueueNotification ?? enqueueNotification`
  and awaits the result (discarded — best-effort, never throws). Deps
  (non-transactional) path enqueues only when the test caller injects
  `deps.enqueueNotification`. Pattern mirrors `create-invitation.ts`
  positionally.

Two deleted client copies confirmed absent on PR head (`git show
HEAD:apps/{identity,membership}-worker/src/notifications-client.ts`
both error `does not exist`). Two deleted per-worker tests confirmed
absent (`git show HEAD:tests/{identity,membership}-worker/src/notifications-client.test.ts`).

### Test inventory

`tests/notifications-client/src/notifications-client.test.ts` — 8 tests
(matching the acceptance list verbatim):
1. `no_binding when NOTIFICATIONS_WORKER is missing`
2. `posts to the internal enqueue URL with the required headers`
3. `forwards membership-worker caller identity headers correctly`
4. `non_2xx when the worker responds with a 4xx/5xx`
5. `network_error when the binding fetch throws`
6. `bad_response when the body is not the expected envelope`
7. `bad_response when the body is malformed JSON`
8. `never throws — all failure modes return a result`

`tests/membership-worker/src/accept-invitation-notifications.test.ts` —
9 tests covering: enqueue with `category: invitation` +
`templateKey: invitation.accepted` + lower-cased recipient; post-commit
ordering vs the repo mock; raw-token-absence; templateData
redaction-safe key whitelist; 200-invariant on enqueue `non_2xx`;
200-invariant on enqueue throw; 200-invariant on `no_binding`; no
enqueue on validation-failure branch; no enqueue on repo-failure
branch (expired / not_found).

### Local validation block

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | ✅ 36 workspace projects, lockfile up to date |
| `pnpm --filter @saas/notifications-client typecheck` | ✅ |
| `pnpm --filter @saas/notifications-client lint` | ✅ |
| `pnpm --filter @saas/notifications-client-tests typecheck` | ✅ |
| `pnpm --filter @saas/notifications-client-tests lint` | ✅ |
| `pnpm --filter @saas/notifications-client-tests test` | ✅ 8/8 |
| `pnpm --filter @saas/identity-worker typecheck` | ✅ |
| `pnpm --filter @saas/identity-worker lint` | ✅ |
| `pnpm --filter @saas/identity-worker-tests test` | ✅ 103/103 (with one pre-existing test-suite compile failure on `api-key-admin.test.ts`, byte-identical on clean `main @ 9811919` — confirmed unrelated) |
| `pnpm --filter @saas/membership-worker typecheck` | ✅ |
| `pnpm --filter @saas/membership-worker lint` | ✅ |
| `pnpm --filter @saas/membership-worker-tests test` | ✅ 240/240 across 5 suites (incl. both `accept-invitation-notifications.test.ts` and `create-invitation-notifications.test.ts`) |
| `kiox -- orun validate --intent intent.yaml` | ✅ Intent valid, normalization passed |
| `kiox -- orun plan --changed --intent intent.yaml --output /tmp/plan-0089.json` | ✅ 6 components × envs → 12 jobs (notifications-client {dev,stage,prod}, notifications-client-tests dev, identity-worker {dev,stage,prod} Verify deploy, identity-worker-tests dev, membership-worker {dev,stage,prod} Verify deploy, membership-worker-tests dev). Matches expected workspace-graph fan-out exactly. |
| `kiox -- orun run --plan /tmp/plan-0089.json --dry-run --runner github-actions` | ✅ 12/12 simulated success |

### PR-CI evidence (run `26665348096`)

`gh run view 26665348096 --json conclusion,headSha` →
`{"conclusion":"success","headSha":"a5e7a3ca80cc9e3d6c314a5ddec587476269c7ff"}`.
`gh run view 26665348096 --log-failed` → empty.

13/13 jobs SUCCESS:
- `plan`
- `notifications-client · {dev,stage,prod} · Verify`
- `notifications-client-tests · dev · Verify`
- `identity-worker · {dev,stage,prod} · Verify deploy`
- `identity-worker-tests · dev · Verify`
- `membership-worker · {dev,stage,prod} · Verify deploy`
- `membership-worker-tests · dev · Verify`

PR mergeable status: `state=OPEN`, `mergeable=MERGEABLE`,
`mergeStateStatus=CLEAN`, `headRefOid=a5e7a3c…`.

### Post-merge main-CI evidence

(filled in below after merge)

### Live invariant probes

(filled in below after merge)

## Issues

None. No verifier fixes were required. No spec drift. No regressions.

## Implementer Deviations Reviewed

| Deviation | Verdict | Rationale |
|---|---|---|
| Lifted from identity-worker copy (vs membership) | ✅ Accepted | Two copies were byte-identical in logic; identity-worker comment block was more general. Verified via diff against `9811919:apps/identity-worker/src/notifications-client.ts` — only doc-voice + JSDoc-line diffs. |
| No `dist/` build (workspace consumers import `src/index.ts` direct) | ✅ Accepted | Matches existing repo convention for worker-only shared TS code (`exports: { ".": "./src/index.ts" }`); avoids a build step that buys nothing for Wrangler bundling. `tsconfig.build.json` ships for future use without forcing a current `prepublish`. |
| Single canonical test suite under `tests/notifications-client/` | ✅ Accepted | Per-consumer tests (now deleted) were duplicating client-shape coverage; client behavior is identical at the shared boundary. New consolidated suite is the canonical 8-test set. Per-handler wire tests still live in each consumer (`create-invitation-notifications.test.ts`, `accept-invitation-notifications.test.ts`). |
| `enqueueNotification` injected via deps slot on accept-invitation | ✅ Accepted | Mirrors create-invitation. Real-path enqueue defaults to the imported real implementation (`enqueueFn = deps?.enqueueNotification ?? enqueueNotification`); test-only deps path skips enqueue entirely when the slot is unset to avoid breaking older deps-path tests. |
| `templateData` shape `{ invitationId, role, memberId, orgId }` (NOT `{ invitationId, orgId, role, acceptedBy, acceptedAt }` as the task prompt and implementer report literally state) | ✅ Accepted with note | The shipped shape is logically equivalent and arguably better: `acceptedBy` is already conveyed by the `x-internal-actor` headers (`actorSubjectType` + `actorSubjectId`); `acceptedAt` is implicit in the notification's own `occurredAt`/correlation timestamp; `memberId` (the new `mem_*` public id materialized by acceptance) is the actual artifact a downstream template would want to reference. V1 contract (`specs/components/14-notifications.md`) does not pin a fixed shape for `invitation.accepted` templateData, only category/recipient/redaction rules. Both shapes are token-/email-/hash-free. NOTE: the task prompt and implementer report should be updated to match shipped reality, OR a future task can re-shape if a real provider template needs `acceptedBy`/`acceptedAt`. Non-blocking for this PR. |
| No `DEBUG_DELIVERY` short-circuit on accept-invitation | ✅ Accepted | The acceptance request response carries no token (token is consumed by acceptance); there is no stage-vs-prod parity issue to guard against. Both envs enqueue identically. |

## Secret-Handling Review

`templateData` for `invitation.accepted`:
`{ invitationId: invitationPublicId(...), role, memberId: memberPublicId(...), orgId: orgPublicId(...) }`.
- No raw 64-char hex token (the request token is hashed via `hashToken`
  before the repo lookup; the raw token never escapes the worker
  boundary).
- No `tokenHash` (server-side persistence-only field).
- No raw email in `templateData` — `actor.email.toLowerCase()` only
  appears in the `recipient.address` field, which is contract-mandated
  for the email-channel envelope.
- No `subjectId` / `subjectType` — those go via `x-internal-actor`
  headers as part of the internal-actor allow-list contract.

Test fixture asserts (lines 232–234 of accept-invitation-notifications.test.ts):
`expect(td).not.toHaveProperty("tokenHash")`,
`expect(td).not.toHaveProperty("rawToken")`. Plus a dedicated
"never includes the raw invitation token" test at line 170.

## Pre-Existing Failures Confirmation

Both reproduce on clean `main @ 9811919` (file `api-key-admin.ts` is
byte-identical at `9811919:apps/identity-worker/src/handlers/api-key-admin.ts`):

| Failure | On PR head | On clean `main @ 9811919` | Conclusion |
|---|---|---|---|
| `apps/identity-worker/src/handlers/api-key-admin.ts:77,112,136 — TS2304 'Fetcher'` | Reproduces | Reproduces (same lines) | Pre-existing, out of scope |
| `tests/identity-worker/src/api-key-admin.test.ts` compile failure (depends on above) | Reproduces | Reproduces | Pre-existing, out of scope |
| `tests/policy-engine` TS2688 'node' | (not run; implementer-flagged) | (assumed pre-existing per implementer report) | Out of scope |

Out of scope for Task 0089. Captured as a candidate follow-up in the
roadmap (`identity-worker Fetcher/crypto TS-type fix`).

## Spec Proposals

None required. V1 contract (`specs/components/14-notifications.md`)
already covers `category: "invitation"`, the `"membership-worker"`
internal-actor allow-list, and the workspace-package convention. The
shipped `templateData` shape for `invitation.accepted` is within the
contract's redaction-safe envelope; the contract does not pin
per-template-key field lists.

## Risk Notes

- The dev `no_binding` short-circuit now covers all three callers
  uniformly (identity-worker login-start, membership-worker
  create-invitation, membership-worker accept-invitation). This is the
  contractual trigger for the next task: `notifications-worker-dev`
  provisioning + dev binding rollout. Not a regression — by design.
- Real provider swap (Resend / Postmark / SES) remains deferred
  awaiting user provider choice. Notifications-worker stays on
  `local-debug` on stage + prod; all three callers' enqueues land as
  local-debug provider rows.
- Task 0085b cloudflare-domain v4→v5 stays explicitly deferred; this
  PR did not touch `infra/terraform/cloudflare-domain/**` or the
  cloudflare provider pin (`~> 4.52`).
- Implementer report literal `templateData` description
  (`{ invitationId, orgId, role, acceptedBy, acceptedAt }`) does not
  match shipped code (`{ invitationId, role, memberId, orgId }`).
  Documented above; non-blocking.

## Recommended Next Move

Orchestrator should pick **`notifications-worker-dev` provisioning +
dev binding for all three callers** as the next implementer task.
A single wrangler/component change closes the dev-wire gap for
identity-worker login-start, membership-worker create-invitation, and
membership-worker accept-invitation in one move. Provider swap stays
deferred until the user names a provider; Task 0085b stays deferred
per explicit user defer.

## PR Number

**#137** — https://github.com/sourceplane/multi-tenant-saas/pull/137
