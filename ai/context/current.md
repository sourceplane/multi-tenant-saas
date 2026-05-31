# Current Context

Last updated: 2026-05-31 — Task 0109 VERIFIED PASS + MERGED. PR #164 squash-merged
as `84a69c2` on main; post-merge main-CI 5/5 SUCCESS; stage + prod Workers live.
Next: Task 0110 (CLI `webhook secrets rotate` subcommand).

## Just-merged — 0109

**Branch (deleted):** `impl/task-0109-webhook-console-reveal-once`
**Squash merge:** `84a69c2` (merged 2026-05-31T06:27:59Z)
**PR:** #164 — https://github.com/sourceplane/multi-tenant-saas/pull/164
**PR-CI lanes (all SUCCESS, post-update-branch HEAD `5aab758`):** plan +
`web-console-next-tests · dev · Verify` +
`web-console-next · {dev,stage,prod} · Verify deploy`.
**Post-merge main-CI:** run `26705368955` 5/5 SUCCESS.
**Live Workers:**
- stage: https://sourceplane-web-console-next-stage.rahulvarghesepullely.workers.dev
  (version `37a3e7ff-f0b4-4235-b8fe-c2c38836b331`, HTTP/2 307 → /orgs).
- prod: https://sourceplane-web-console-next-prod.rahulvarghesepullely.workers.dev
  (version `b209ca74-031a-49ae-992e-1753e702fec8`, HTTP/2 307 → /orgs).

**Reports:**
- Implementer: `ai/reports/task-0109-implementer.md`
- Verifier: `ai/reports/task-0109-verifier.md`

**Durable outcome on main:**

1. New routes `/orgs/{orgSlug}/webhooks` (list) and
   `/orgs/{orgSlug}/webhooks/{endpointId}` (detail) — read-only fields plus
   "Rotate signing secret" action.
2. Reveal-once rotation flow enforced at the **type-system level**:
   `RotateState` is a discriminated union where the `secret` field exists
   only on the `revealing` arm; `closeReveal` returns `{ phase: "idle" }`
   dropping the secret. Defensive `useEffect` cleanup on unmount.
3. Confirm dialog → reveal dialog with copy-to-clipboard via
   `navigator.clipboard.writeText` directly on the discriminated-union
   local; no `sessionStorage`/`localStorage`/query-cache/global-stash.
4. Legacy no-encryption-key path renders an amber-toned "rotation
   completed — secret not returned" affordance (no placeholder).
5. Sidebar gains exactly one new "Webhooks" entry under `Org · {orgSlug}`,
   between API keys and Config (`Webhook` icon from `lucide-react`).
6. New workspace `tests/web-console-next` (mirroring `tests/contracts`
   shape) with 18-test Jest suite, including
   `JSON.stringify(state).includes("whsec_")` scrub after `closeReveal`
   and after `rotateFailed`.

## Pipeline status

- **Active task:** none — Task 0109 closed; Task 0110 next.
- **Open PRs:** none.
- **`main` HEAD:** `84a69c2` (Task 0109 squash) + a verifier-PASS bookkeeping
  commit on top.
- **B5 webhook-helper dogfood arc:** CLOSED (0105/0106/0107 merged).
- **B5 secret-rotation arc:** backend (0108) + console (0109) MERGED.
  CLI rotate (0110) is the remaining symmetric slice.

## Next Tasks

- **Task 0110 — `sourceplane webhook secrets rotate` CLI subcommand.**
  Symmetric CLI surface to the 0109 console flow; pure SDK consumer of
  the now-locked `client.webhooks.rotateSecret` shape. Mirrors 0106/0107
  conventions (turbo-package · cli · {dev,stage,prod} · Verify; no deploy
  lane; `--output human|json`; reveal-once secret printed to stdout
  exactly once). File-disjoint from anything else in flight.
- **B5 — replay UI / failure-budget alerts** (console-side; consumer
  of existing events-worker read APIs once SDK delivery-history is final).
- **B5 — webhook subscriptions UX / delivery-attempts UX** (console;
  separate B5 follow-ups deferred from 0109).
- **B5 (record-only) — Cmd-K palette entry for "Rotate signing secret"**;
  re-evaluate when other "Rotate {x}" actions land.
- **B5 (record-only) — console-side endpoint creation UX** (was out of
  scope per 0109 prompt).
- **B7 — Audit-log UX expansion.**
- **B8 — admin-worker scaffold** (greenfield single-PR breather).

## Spec Proposals (non-blocking)

- Webhook docs update for the new `X-Webhook-Signature-Previous` header +
  grace-window operational guidance for subscribers (verify-either-key
  during the window) — outstanding from 0108.
- `@saas/webhook-verifier` multi-key extension (out-of-scope per 0108
  spec): accept an array of secrets and validate against any. Track as a
  B5 tail item.

## Deferred (unchanged)

- `0085b` — see `ai/deferred.md`.
- `notifications-provider-swap` — see `ai/deferred.md`.
- `notifications-worker-dev-reframe` — see `ai/deferred.md`.
- `optional-spec-13-commands` — see `ai/deferred.md`.
