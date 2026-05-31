# Task 0109 — Implementer Report

Agent: Implementer
Branch: `impl/task-0109-webhook-console-reveal-once`
Sealed snapshot: main `28b3ca1` / `97ee29e`.

## Summary

- Shipped end-to-end reveal-once webhook signing-secret rotation UX in
  `apps/web-console-next`: list page at `/orgs/{orgSlug}/webhooks`, detail
  page at `/orgs/{orgSlug}/webhooks/{endpointId}`, destructive-confirm
  rotate flow with a dual-signature grace-window banner, and a
  reveal-once dialog that displays the plaintext `whsec_…` secret exactly
  once with copy-to-clipboard + grace-window context.
- Reveal-once invariant is enforced at the **state-machine** level
  (`rotate-flow.ts`): the `secret` field exists only on the `revealing`
  state, and `closeReveal` returns the discriminated union to `idle`,
  dropping the secret from React state. No `sessionStorage`,
  `localStorage`, query cache, URL, or global retains plaintext at any
  point. Defensive `useEffect` cleanup on the dialog scrubs state on
  unmount as a belt-and-braces guard.
- Sidebar gains exactly one new "Webhooks" entry under `Org · {orgSlug}`
  using `Webhook` from `lucide-react`, placed between "API keys" and
  "Config" as suggested.
- Legacy no-encryption-key case handled gracefully: when
  `RotateWebhookSecretResponse.secret` is `undefined`, the reveal dialog
  renders an amber-toned "rotation completed — secret not returned"
  affordance with operator-shaped explanation; no crash, no placeholder.
- Targeted Jest workspace `tests/web-console-next` covers the
  reveal-once invariant and rotate-confirm gating in pure logic — 18
  tests, all green. Includes a `JSON.stringify(state).includes("whsec_")`
  scrub assertion that fails any future regression where the secret
  leaks back into the active state object.

## Files Changed

Routes
- `apps/web-console-next/src/app/(app)/orgs/[orgSlug]/webhooks/page.tsx` (new)
- `apps/web-console-next/src/app/(app)/orgs/[orgSlug]/webhooks/[endpointId]/page.tsx` (new)

Components
- `apps/web-console-next/src/components/webhooks/rotate-flow.ts` (new — state machine + grace-window formatters, dependency-free)
- `apps/web-console-next/src/components/webhooks/rotate-secret-dialog.tsx` (new — confirm + reveal-once dialogs)

Shell
- `apps/web-console-next/src/components/shell/sidebar.tsx` (+2 lines: import + nav entry)

Tests workspace
- `tests/web-console-next/package.json` (new)
- `tests/web-console-next/tsconfig.json` (new)
- `tests/web-console-next/eslint.config.js` (new)
- `tests/web-console-next/component.yaml` (new — `turbo-package` mirroring `tests/contracts` shape)
- `tests/web-console-next/src/rotate-flow.test.ts` (new — 18 tests)

Lockfile
- `pnpm-lock.yaml` (auto-generated, new dev devDependencies for `@saas/web-console-next-tests`)

No backend, contracts, SDK, infra, db, or worker files touched.

## Checks Run

- `pnpm -F @saas/web-console-next typecheck` — exit 0
- `pnpm -F @saas/web-console-next lint` — exit 0
- `pnpm -F @saas/web-console-next-tests typecheck` — exit 0
- `pnpm -F @saas/web-console-next-tests lint` — exit 0
- `pnpm -F @saas/web-console-next-tests test` — 18/18 passing in 0.7s
- `kiox -- orun validate --intent intent.yaml` — `✓ Intent is valid`, `✓ All validation passed`
- `kiox -- orun plan --changed --intent intent.yaml --output /tmp/task-0109-plan.json` —
  `2 components × 3 envs → 4 jobs · components: web-console-next, web-console-next-tests`
- `kiox -- orun run --plan /tmp/task-0109-plan.json --dry-run --runner github-actions --intent intent.yaml` —
  `4 selected · Preview ready · all ✓`
- Hazard scan over staged diff (`git diff --cached`) for
  `eslint-disable | @ts-ignore | @ts-expect-error | as any | as unknown as | node:` — **0 hits**.
- `whsec_` leak scan over staged diff — only inside
  `rotate-secret-dialog.tsx` (a docstring comment, not user-visible) and
  inside `tests/web-console-next/src/rotate-flow.test.ts` (test fixtures
  + the scrub assertion). Zero appearances in list / detail / toast /
  error paths.
- PR-CI run id: filled in below once PR opened.

## Decisions Taken Under Latitude

- **Route shape**: chose two-page layout (`/webhooks` list +
  `/webhooks/[endpointId]` detail) over an inline drawer. Rationale:
  matches existing `members` / `api-keys` precedent, gives Next App
  Router clean route boundaries, leaves room for future
  delivery-attempts UX on the detail page without re-architecting.
- **Rotate action placement**: detail page only (not on the list row).
  Rationale: keeps destructive action behind one extra click, mirrors
  Stripe.
- **Sidebar icon**: `Webhook` from `lucide-react`. Rationale: brief
  suggestion, semantic, already in the bundle.
- **Detail page metadata**: surfaced `id`, `status`, `secretVersion`,
  `secretLastRotatedAt`, `createdAt`, `projectId`, `disabledAt` (with
  reason), `description` — all read-only as a `<dl>` grid. Rationale:
  every field on `PublicWebhookEndpoint` that's safely user-shaped, no
  secret material. `eventTypes` was skipped because it's not on
  `PublicWebhookEndpoint` itself (subscriptions live in a separate
  resource); not a regression vs. brief because the brief said "when
  present" and they aren't.
- **Grace-window formatter**: hand-rolled `formatGraceDuration` +
  `formatGraceWindow` using `Intl.DateTimeFormat` (no new deps).
  Rationale: `gracePeriodSeconds` is constrained to a small realistic
  range (server default 86400, operator override or 0); a full duration
  library is overkill. Special-cases 86400 → `"24 hours"` and shows both
  absolute timestamp + relative `"in ~24 hours"` per integration notes.
- **Cmd-K command palette entry**: deferred. Rationale: the existing
  palette wiring isn't already populated with per-resource actions, so
  adding one entry alone would feel orphaned; revisit when other
  "Rotate {x}" actions land.
- **Test layout**: created `tests/web-console-next` as a sibling
  workspace package mirroring the `tests/contracts` shape (Jest under
  `--experimental-vm-modules`, ts-jest ESM preset, `turbo-package`
  component.yaml, dev-only profile). Rationale: matches the established
  monorepo convention; `apps/web-console-next` itself has no test
  runner today, and adding one inside the Next app would force broader
  config decisions outside this PR's scope. Pure-logic coverage of the
  state machine + formatters is the strongest reveal-once invariant we
  can express without spinning up RTL / jsdom.
- **State-machine driven rotate flow**: factored the state into a
  discriminated union (`idle` | `confirming` | `rotating` | `revealing`)
  so the secret field is statically *only* expressible on the
  `revealing` arm. Rationale: makes the reveal-once invariant a
  type-system invariant, not a runtime convention. Tests assert it
  directly via `JSON.stringify(state).includes("whsec_")` after
  `closeReveal`.

## Assumptions

- `client.webhooks.listEndpoints` returns the same `PublicWebhookEndpoint`
  shape used by the detail page lookup (locked by Task 0104 / 0108
  contracts). The detail page derives the endpoint from the list
  response by id, avoiding an extra `getEndpoint` round-trip — if a
  future task introduces direct deep-link navigation to a stale
  endpoint id, switching to `client.webhooks.getEndpoint` is a one-line
  change.
- The `wrap()` envelope continues to surface `precondition_failed`
  with the body shape `PreconditionInsight` consumes; mirrors the
  api-keys precedent.

## Spec Proposals

None.

## Remaining Gaps

- Cmd-K command-palette entry for "Rotate webhook secret…" deferred.
- Webhook subscriptions UX, delivery-attempts UX, and replay UX are
  intentionally out of scope (separate B5 follow-ups).
- Console-side endpoint **creation** UX is out of scope; the empty
  state explicitly tells the operator to use API/CLI for now.

## Next Task Dependencies

- **Task 0110** ships the symmetric `sourceplane webhook secrets rotate`
  CLI subcommand on top of the same Task 0108 contract. Parallel-safe
  with this PR (no shared files).
- Verifier should additionally confirm: (a) sidebar entry placement
  doesn't visually regress on narrow viewports; (b) the `whsec_` grep
  is clean across the rendered output of all three new routes (not
  only the source diff); (c) the rotate confirm-then-reveal sequence
  cannot be skipped via Radix Dialog's `Escape`-key handling (we route
  Escape through `onOpenChange(false)` which `closeAll` resets — the
  state machine's `closeReveal` is idempotent).

## PR Number

PR **#164** — https://github.com/sourceplane/multi-tenant-saas/pull/164
