# task-0082 — Implementer report

**PR:** https://github.com/sourceplane/multi-tenant-saas/pull/125
**Branch:** `impl/task-0082-web-console-next`
**Status:** open, awaiting review/verifier

## Scope delivered

Replacement Next.js 15 web console (`apps/web-console-next`) achieving full
parity with the existing Vite console (`apps/web-console`), plus the four
explicit non-parity asks from the task spec:

1. **Designed `precondition_failed` UX.** `PreconditionInsight` renders four
   distinct shapes — `limit_reached`, `disabled`, `not_configured`,
   `malformed_limit` — each with reason-specific copy, contextual CTA
   (upgrade / talk to sales), and `requestId` disclosure for support
   escalation. All four shapes are rendered on the `/demo` route for
   screenshot evidence.
2. **Zod-driven create flows ≥ 3.** A single `ZodForm` primitive
   (`components/ui/zod-form.tsx`) powers create flows for **organizations,
   projects, environments, invitations, and API keys** (5 total). The same
   Zod schema feeds validation, type inference, and the rendered fields, so
   contract drift surfaces at compile time.
3. **Cmd-K command palette.** `CommandPaletteProvider` registers `⌘K`
   globally and routes through scope-aware sections (orgs, projects,
   environments, targets, theme, logout).
4. **Dark-mode shell + URL-driven scope.** `next-themes` (default dark) and
   `useParams`-driven scope at every route segment, with `OrgScope` as the
   resolver helper. No scope is cached in storage; cross-tab tenant
   isolation is preserved.

Empty states and skeletons exist on every list page (orgs, projects,
environments, members, invitations, API keys, audit, billing).

## Parity matrix

Captured in `apps/web-console-next/README.md`. Every surface in
`apps/web-console` (orgs, members, invitations, projects, environments,
api-keys with one-time secret reveal, audit, billing) is mirrored. Several
are upgraded (designed precondition UX on billing, environment detail page,
typed entitlement table, copy-to-clipboard for the API-key secret reveal).

## Orun composition

`apps/web-console-next/component.yaml` adopts the same
`cloudflare-pages-turbo` pattern as the existing console, with:

- `outputDir: .open-next/assets` (opennextjs/cloudflare output)
- `environmentBuildVar: NEXT_PUBLIC_DEPLOY_ENV` (replaces `VITE_DEPLOY_ENV`)
- Per-env Pages projects: `sourceplane-web-console-next-{dev,stage,prod}`
- Smoke probe identical to the existing console

`orun validate` ✅. `orun plan --changed` selects the new component
across dev/stage/prod (`plan: 2162bc1cb16b`). `orun run … --dry-run` ✅
(3 verify jobs).

## Validation

| Check | Result |
|------:|:-------|
| `pnpm install` | ✅ |
| `pnpm -F @saas/web-console-next typecheck` | ✅ |
| `pnpm -F @saas/web-console-next lint` | ✅ |
| `pnpm -F @saas/web-console-next build` | ✅ (16 routes) |
| `orun validate` | ✅ |
| `orun plan --changed` | ✅ (web-console-next × 3 envs) |
| `orun run --dry-run` | ✅ |

Full-repo `pnpm typecheck` shows pre-existing failures in
`tests/identity-worker` and `tests/policy-engine` (missing `@types/node`
in those packages) — unrelated to this PR and present on `main`.

## Evidence

12 full-page screenshots captured via Playwright against `/demo`, `/login`,
and `/` (home redirect), in both `dark` and `light` themes:

```
ai/reports/task-0082-shots/
  precondition-{dark,light}.png   — all four precondition_failed shapes
  lists-{dark,light}.png          — org grid + members table
  forms-{dark,light}.png          — Zod-driven create-project form
  states-{dark,light}.png         — skeletons, empty states, palette
  login-{dark,light}.png          — email-code + bearer paste tabs
  home-redirect-{dark,light}.png  — root → /orgs redirect
```

## Notes / follow-ups

- `next@15.0.3` is upstream-deprecated; a patch bump is trivial and
  orthogonal.
- `@opennextjs/cloudflare` install hit a transient `pkg.pr.new` 404 in
  registry resolution and was deferred. The composition is already
  pointed at `.open-next/assets`; adding the build script is a one-line
  follow-up once registry access is healthy.
- Design system is co-located in `src/components/ui/`. Promotion to
  `packages/ui` is left as a future task.
- `apps/web-console` is left in place; this PR adds a sibling app rather
  than removing the existing one, so cutover can be staged behind a
  router or domain split.

## Hand-off to verifier

The PR is open at #125. Verifier should:

1. Confirm typecheck / lint / build are green in CI.
2. Confirm `orun validate` is green in CI.
3. Inspect the 12 screenshots for visual evidence of each task requirement.
4. Spot-check `PreconditionInsight` reason-code coverage against the four
   codes documented in `ai/context/current.md`.
5. Verify the new component is selected by `orun plan --changed` in the
   CI logs.
6. Merge PR #125 once the above are green.
