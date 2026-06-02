# Task 0127 — U11 Vercel-standard console completion — Implementer Report

Milestone `U11-console-vercel-standard`. Delivered as a sequence of reviewable
PRs (per the task's suggested split). This report is updated per slice.

## Verification environment

Browser verification runs against the **live stage** `api-edge`
(`https://api-edge-stage.rahulvarghesepullely.workers.dev`) using a real
magic-link token (stage returns `local_debug` codes) pasted via the console's
bearer-token path. A throwaway org `U11 Verify Co` (`u11-verify`) was seeded for
verification. Playwright (chromium) drives `next dev` on `:3001`.

Two environment notes (not product bugs):
- Chromium rejects the workers.dev cert in this sandbox
  (`ERR_CERT_AUTHORITY_INVALID`, TLS interception) → Playwright contexts use
  `ignoreHTTPSErrors`.
- Project creation on the seeded org returns `412 precondition_failed /
  not_configured` (entitlement gate), so project/environment-scoped data is
  verified against the designed empty/upgrade states rather than live rows.

Pre-existing latent bug noted (not in this task's scope): `useRequireAuth`
redirects to `/login` on a hard load of a deep link before `SessionProvider`
hydrates the token from `localStorage` (child effects fire before the parent's).
Real users don't hit it (post-login navigation is client-side). Flagged for a
future polish slice.

---

## Slice A — design-system primitives + mobile nav + extensible Cmd-K registry

PR: `claude/u11-a-primitives`.

### What shipped
- **New primitives** (`apps/web-console-next/src/components/ui/`):
  - `select.tsx`, `tooltip.tsx` — Radix-backed (deps `@radix-ui/react-select` /
    `react-tooltip` were already present; no lockfile change).
  - `sheet.tsx` — slide-out panel on Radix Dialog (no new dep).
  - `switch.tsx`, `checkbox.tsx` — dependency-free, accessible
    (`role="switch"`/`"checkbox"`, `aria-checked`, keyboard) to avoid a new
    Radix dep + React-19-RC peer churn. **Decision:** Popover was *not* added —
    the named U11 surfaces are covered by Select + DropdownMenu + Tooltip, and
    the task forbids dead primitives.
  - `TooltipProvider` mounted once in `app/providers.tsx`.
- **Extensible Cmd-K registry** — `command-registry.ts` (pure, testable) builds
  scope-aware command descriptors; `command-palette.tsx` resolves icons, runs
  effects, and exposes `useRegisterCommands(...)` so each product area / slice
  contributes commands without editing the palette. Behavior parity with the
  old hardcoded palette, plus a visually-hidden `DialogTitle`/`DialogDescription`
  (fixes the Radix a11y warning the old palette emitted).
- **Shared nav model** — `nav-items.ts` (pure, testable) drives both the desktop
  `Sidebar` and the new mobile drawer; `sidebar.tsx` exports `NavContent`.
- **Mobile navigation** — `mobile-nav.tsx`: a hamburger in the topbar (md:hidden)
  opens the sidebar in a left `Sheet`, closing on navigation. Fixes the dead-end
  where the sidebar was `hidden md:flex` with no small-screen replacement.

To keep every PR independently non-broken on `main`, the nav/registry in this
slice link only to **routes that already exist**. Usage, account-profile,
notification-preferences, and org-settings entries are added by their own slices
alongside the routes they point at.

### Tests
- `tests/web-console-next/src/command-registry.test.ts` (scope-gating, compose
  override, stable group ordering, empty-group drop).
- `tests/web-console-next/src/nav-items.test.ts` (section gating, active-link
  longest-prefix matching incl. `/orgs` and `/account` exact-match cases).
- Full suite: **104 passing** (21 new).

### Gates
- `web-console-next` typecheck ✓, lint ✓; tests typecheck ✓, lint ✓.
- `next build` ✓ (all routes compile).
- Browser: login page, orgs list, global + org-scoped command palette
  (registry-driven, correct scope gating), desktop sidebar, and the mobile Sheet
  drawer all render correctly with **zero console errors**.

Merged: PR #204 (squash `d165578`).

---

## Slice B — Usage & quota surface

PR: `claude/u11-b-usage`.

### What shipped
- **New route** `app/(app)/orgs/[orgSlug]/usage/page.tsx` (org-scoped via
  `OrgScope`), with two sections:
  - **Consumption** — metric input (with `datalist` suggestions; no
    list-metrics API exists), `bucketType` + range `Select`s, over
    `metering.getUsageSummary`. Totals + a dependency-free CSS bar chart of
    per-bucket quantity. Prompts to choose a metric before fetching (metric is
    a required API param), and shows a designed empty state when no usage was
    recorded.
  - **Quota violations** — over `metering.listQuotaViolations` with an optional
    metric filter and cursor "Load more"; open/resolved + enforcement badges,
    overage %. Loads immediately (no metric required).
- **Nav + Cmd-K** — added the "Usage & quota" sidebar link and `nav.usage`
  command alongside the route (so the entries that were intentionally deferred
  in Slice A now point at a real page).
- Pure helper `components/usage/usage.ts`: preset→ISO window math (injectable
  `now`), bar normalization, compact number formatting, violations pagination
  accumulation, and view shapers.

### Tests & gates
- `usage.test.ts` (17 cases: query window math, bar normalization incl.
  divide-by-zero guard, compact formatting, violations append/de-dupe/cursor,
  overage guard). Full suite **121 passing**.
- typecheck ✓, lint ✓, `next build` ✓.
- Browser: Consumption + Quota-violations render; Select primitives work; a
  metric query resolves to the designed "No usage recorded" / "No quota
  violations" empty states against live stage; **zero console errors**.
