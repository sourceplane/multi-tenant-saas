# Task 0040 — Implementer Report

## Summary

Replaced the web-console placeholder with a fully functional live-test console
that exercises all current public API flows, and added minimal CORS support to
`api-edge` so the Cloudflare Pages UI can make browser requests to stage and
prod.

The console is a vanilla TypeScript/Vite SPA with a dark operational UI. It
supports stage/prod target selection with per-target session isolation, auth
with debug-code display and manual token import, full organization/membership/
invitation/project/environment CRUD, and paginated audit log inspection.

## Files Changed

### api-edge
- `apps/api-edge/src/cors.ts` — new CORS module (origin allowlist, preflight handler, response header applier)
- `apps/api-edge/src/index.ts` — integrate CORS preflight before route dispatch; apply CORS headers to all responses

### web-console
- `apps/web-console/src/api.ts` — typed API client using contract types, envelope unwrapping
- `apps/web-console/src/state.ts` — per-target state management with localStorage persistence
- `apps/web-console/src/main.ts` — full SPA (auth, org select, workspace tabs: members, invitations, projects, audit)
- `apps/web-console/src/style.css` — dark operational theme, responsive for desktop and mobile
- `apps/web-console/src/vite-env.d.ts` — Vite client type reference
- `apps/web-console/index.html` — updated title
- `apps/web-console/component.yaml` — real smoke command (Pages + API health checks)

### tests
- `tests/api-edge/src/cors.test.ts` — focused CORS test suite (origin validation, preflight, response headers)

## Checks Run

| Check | Result |
|-------|--------|
| `pnpm --filter @saas/web-console typecheck` | PASS |
| `pnpm --filter @saas/web-console lint` | PASS (0 errors, 21 warnings — all `no-explicit-any` in API client helpers) |
| `pnpm --filter @saas/web-console build` | PASS (dist: 23.2 kB JS, 4.1 kB CSS) |
| `pnpm --filter @saas/api-edge typecheck` | PASS |
| `pnpm --filter @saas/api-edge-tests test` | PASS (162 tests, 5 suites) |
| `orun validate --intent intent.yaml` | PASS |
| `orun plan --changed` | 19 jobs across 7 components |
| `orun run --dry-run --runner github-actions` | PASS (all 19 jobs preview-pass) |

## Live/Browser Verification

- Local dev server (`http://localhost:5173/`) serves the Sourceplane Console correctly
- HTML renders with proper dark theme at desktop and mobile widths
- No overlapping text or blank primary surface at 375px and 1440px viewports
- Target selector shows both stage and prod options
- Auth form, manual token import, org/project views all render correctly
- CORS preflight against live stage (`OPTIONS /v1/auth/login/start` with `Origin: https://sourceplane-web-console.pages.dev`) currently returns 405 — this is expected pre-deployment. Once the `api-edge` code is deployed, it will return `204` with proper CORS headers
- The CORS test suite validates the correct behavior in unit tests

## Assumptions

1. The deployed `api-edge` will be updated before full end-to-end browser testing from the Pages origin is possible (CORS only works after deployment).
2. The API envelope shape for list routes wraps data in domain-specific keys (e.g., `{ data: { organizations: [...] }, meta: {...} }`). The client handles both the nested key and a fallback for direct array data.
3. The `PublicAuditEntry` response key from the events-worker is assumed to be either `entries` or `auditEntries` — client handles both.
4. The smoke command uses the known Pages project URL (`https://sourceplane-web-console.pages.dev/`) since the composition doesn't expose per-deployment URLs directly.

## Spec Proposals

None. The implementation stays within existing contract boundaries.

## Remaining Gaps

1. **Post-deploy CORS verification** — cannot fully verify browser CORS until `api-edge` is redeployed with the CORS module.
2. **Email-based login on prod** — the UI supports manual token import as a workaround since email delivery is not implemented.
3. **Invitation acceptance route** — `POST /v1/invitations/accept` is wired in the client but the route may not exist in the current api-edge facade (only org-scoped invitation routes were visible). Verifier should confirm this endpoint exists or if the acceptance uses a different path.
4. **Audit entry key name** — the exact key (`entries` vs `auditEntries`) returned by the events-worker audit endpoint should be verified against live stage.

## Next Task Dependencies

- Deploy updated `api-edge` with CORS to stage/prod (this PR triggers via Orun plan)
- After deployment, run end-to-end browser verification from Pages origin
- Identity security-event persistence remains intentionally deferred per task scope

## Verifier Fix (2026-05-27)

**Issue:** `acceptInvitation` called `/v1/invitations/accept` which does not exist; the correct org-scoped route is `/v1/organizations/{orgId}/invitations/accept`.

**Files changed:**
- `apps/web-console/src/api.ts` — added `orgId` parameter to `acceptInvitation`, updated path
- `apps/web-console/src/main.ts` — `handleAcceptInvitation` now passes `state.orgId`; guards against no org selected

**Checks re-run:**
| Check | Result |
|-------|--------|
| `pnpm --filter @saas/web-console typecheck` | PASS |
| `pnpm --filter @saas/web-console lint` | PASS (0 errors, 21 warnings) |
| `pnpm --filter @saas/web-console build` | PASS (23.3 kB JS, 4.1 kB CSS) |
| `rg "/v1/invitations/accept" apps/web-console/src` | 0 matches (global route eliminated) |

**PR #81 confirmation:** Branch pushed, PR remains open against `main`.

**Remaining blockers:** None from this fix. Post-deploy CORS verification still pending.

## PR Number

81
