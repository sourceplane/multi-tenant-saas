# Task 0066 — Implementer Report: Secret Management UI

## Summary

Added full secret lifecycle management (create, rotate, revoke) to the web-console Config tab. Previously secrets were displayed as read-only metadata; users can now manage the complete secret lifecycle from the UI.

**Key metrics:**
- 3 files changed, ~200 lines added
- 3 new API client methods
- 1 new UI form (rotate), 1 extended form (create), action buttons (rotate/revoke) per secret row

## Implementation Details

### API Client (`api.ts`)
- Added imports: `CreateSecretRequest`, `RotateSecretRequest`, `CreateSecretMetadataResponse`, `RotateSecretMetadataResponse`, `RevokeSecretMetadataResponse`
- `createSecret(orgId, body, opts)` — POST to config secrets path
- `rotateSecret(orgId, secretId, body, opts)` — POST to `{secretId}/rotate`
- `revokeSecret(orgId, secretId, opts)` — DELETE to secret path

### Config Tab UI (`main.ts`)
- **Tab label**: "Secrets Metadata" → "Secrets"
- **Subtitle**: Updated to mention secret management
- **Create form**: Extended `renderConfigCreateForm()` for secrets — key, password value, displayName, rotationPolicy, expiresAt fields with validation
- **List actions**: Added Rotate/Revoke buttons per secret row in `renderSecretMetadataList()`
- **Rotate form**: New `renderSecretRotateForm()` — inline form replacing the secret row with password input
- **Security**: All secret value inputs use `type="password"` + `autocomplete="off"`; values cleared immediately after API call regardless of success/failure
- **Revoke**: `window.confirm()` guard for destructive operation

### CSS (`style.css`)
- `.secret-write-only-hint` — warning-colored hint text
- `.secret-rotate-form input[type="password"]` — monospace font for secret inputs

## Validation Results

| Check | Result |
|-------|--------|
| TypeScript typecheck (`tsc --noEmit`) | ✅ Pass |
| Vite production build | ✅ Pass (56.41 kB JS, 15.23 kB CSS) |
| ESLint | ✅ Pass (0 errors, 43 warnings — all pre-existing `any` types) |
| No secrets committed | ✅ Confirmed |
| Only component files in commit | ✅ 3 files (api.ts, main.ts, style.css) |

## Security

- ✅ Secret values never stored in DOM state — cleared after submission
- ✅ Password input type prevents shoulder-surfing
- ✅ Autocomplete disabled on secret inputs
- ✅ No secrets in commit or logs
- ✅ Revoke requires explicit confirmation

## Open Questions for Verifier

1. Should the rotate form show the current rotation policy / expiry for reference?
2. Should there be a "copy secret ID" button for programmatic use?
3. Is `window.confirm()` sufficient for revoke, or should we use a modal with explicit key-name confirmation?

## Files Changed

- `apps/web-console/src/api.ts` — +43 lines (3 methods + imports)
- `apps/web-console/src/main.ts` — +155/-4 lines (create form, rotate form, action buttons)
- `apps/web-console/src/style.css` — +12 lines (secret UI styles)
