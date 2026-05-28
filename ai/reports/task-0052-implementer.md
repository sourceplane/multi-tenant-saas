# Task 0052 — Implementer Report

## Summary

Added the first web-console API-key management surface. An authenticated organization user can now create, list, and revoke API keys through the already-live public API from the workspace UI.

## Files Changed

| File | Change |
|------|--------|
| `packages/contracts/src/api-keys.ts` | New — typed public API-key contracts |
| `packages/contracts/src/index.ts` | Re-export `./api-keys.js` |
| `packages/contracts/package.json` | Add `./api-keys` export path |
| `apps/web-console/src/api.ts` | Add `listApiKeys`, `createApiKey`, `revokeApiKey` methods to `ApiClient` |
| `apps/web-console/src/main.ts` | Add `API Keys` tab to workspace with list/create/revoke flows |
| `apps/web-console/src/style.css` | API key styles (secret box, revoked state, row layout) |

## Checks Run

```
$ pnpm --filter @saas/web-console typecheck
✓ pass (0 errors)

$ pnpm --filter @saas/web-console lint
✓ 0 errors, 26 warnings (all pre-existing @typescript-eslint/no-explicit-any)

$ pnpm --filter @saas/web-console build
✓ built in 162ms (3 output files)

$ kiox -- orun validate --intent intent.yaml
✓ All validation passed

$ kiox -- orun plan --changed --intent intent.yaml --output plan.json
✓ 2 components × 3 envs → 6 jobs (contracts, web-console)

$ kiox -- orun run --plan plan.json --dry-run --runner github-actions
✓ 6/6 jobs pass
```

## API-Key UI Surface

- **Tab location**: `API Keys` tab in the selected-organization workspace, between `Projects` and `Audit`
- **List view**: Shows `label`, `prefix`, `role`, `projectId`, `createdAt`, `expiresAt`, `lastUsedAt`, `revokedAt` for each key. Revoked keys are visually dimmed with a `REVOKED` badge.
- **Create form**: Inputs for `label` (required), `role` (select), `projectId` (optional, placeholder explains project_* roles need it), `expiresAt` (optional, datetime-local).
- **One-time secret**: Displayed in a green-bordered box immediately after create. Copy button uses `navigator.clipboard`. Dismiss button clears it. Secret is held only in module-level variable, never persisted.
- **Revoke**: `Revoke` button on each active key row. Uses `confirm()` dialog. After revoke, list refreshes showing revoked state.
- **Pagination**: `Load More` button appears when cursor is present.

## Browser / Manual Verification

- No automated frontend test harness exists for this surface. Verification is manual/build-based.
- Typecheck, lint, and build all pass confirming the code compiles correctly with the existing patterns.
- The console remains a Vite SPA with the same DOM rendering pattern used by Members, Invitations, Projects, Audit, and Account Security.
- Existing tabs remain in place; the `API Keys` tab is inserted between `Projects` and `Audit`.

## Secret Handling

- Raw API-key secret is displayed only in the immediate create-success path via a module-level variable (`apiKeysCreatedSecret`).
- Secret is never stored in `localStorage`, `sessionStorage`, URL params, or any persisted state.
- Secret is cleared from memory when the user clicks "Dismiss" or navigates away from the tab.
- List view never shows raw secret material — only `prefix` is shown.
- After page reload, the secret is gone; list data is re-fetched from the backend which never returns raw secrets.

## Assumptions

1. The live backend at `api-edge` already handles all three routes (`POST`, `GET`, `DELETE`) under `/v1/organizations/{orgId}/api-keys[/{apiKeyId}]` as verified by Task 0051.
2. The response shapes match what `api-key-admin.ts` returns: `data.apiKey` for create/revoke, `data.apiKeys` for list.
3. The `navigator.clipboard.writeText` API is available in the browser environment; fallback is `select()` on the input.
4. No new dependencies were added; the UI uses the same vanilla DOM patterns as the rest of the console.

## Spec Proposals

None. The implementation follows existing specs and patterns.

## Remaining Gaps

1. **No projectId filter UI**: The `projectId` query parameter is supported by the API client but no filter control is exposed in the UI yet. This is optional per the task spec.
2. **No automated browser tests**: The web-console has no dedicated test harness. This was explicitly out of scope per the task constraints.
3. **Role validation UX**: The create form doesn't dynamically show/hide the projectId field based on whether a project-scoped role is selected. The backend validates this and returns a clear error.

## Next Task Dependencies

- Verifier task to confirm the UI renders correctly against stage/prod and that create/list/revoke flows work end-to-end.
- Future tasks may add projectId filtering, role-aware form validation, or automated browser tests.

## PR Number

**PR #95** — https://github.com/sourceplane/multi-tenant-saas/pull/95
