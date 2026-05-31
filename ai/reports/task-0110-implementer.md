# Task 0110 Implementer Report — `sourceplane webhook secrets rotate` CLI subcommand

## 1. Summary

Shipped the symmetric CLI surface to Task 0109's console reveal-once
rotate UX. New subcommand `sourceplane webhook secrets rotate
<endpointId>` calls the locked `client.webhooks.rotateSecret` SDK seam,
prints the reveal-once `whsec_<32hex>` plaintext exactly once on stdout
when present (or a clear "no encryption key" affordance when absent),
and exits 0. Idempotency-key passthrough is verbatim, no auto-generated
keys.

This is a ≤ 4-paths task because the surface is a pure SDK consumer of
an already-locked contract:

- One new command file (`webhook-secrets-rotate.ts`) — handler logic.
- One edit to `cli-runner.ts` — register the route, add one help line.
- One new test file (`webhook-secrets-rotate.test.ts`) — 13 cases.
- One new report (this file).

Zero changes to SDK, contracts, other CLI command files, or any
forbidden zone. No new dependencies, no `pnpm-lock.yaml` delta.

## 2. Files Changed

| Path | Status |
|---|---|
| `packages/cli/src/commands/webhook-secrets-rotate.ts` | NEW |
| `packages/cli/src/cli-runner.ts` | edit (+2 lines: import + register; +1 line: help) |
| `packages/cli/src/__tests__/webhook-secrets-rotate.test.ts` | NEW (13 cases) |
| `ai/reports/task-0110-implementer.md` | NEW |

## 3. Checks Run

| Gate | Exit | Evidence |
|---|---|---|
| `pnpm install --frozen-lockfile` | n/a | no dependency edits; existing workspace-edge to `@saas/sdk` reused |
| `pnpm -r typecheck` | 0 | all 39 workspaces — last lines show `tests/policy-worker typecheck: Done` |
| `pnpm -r --no-bail lint` | 0 | only `tests/api-edge` warnings (45, all `no-explicit-any`); zero new under `packages/cli` |
| `pnpm --filter @saas/cli build` | 0 | `tsc --project tsconfig.build.json && node scripts/bundle.mjs` clean |
| `pnpm --filter @saas/cli test` | 0 | 136 tests pass (123 prior + 13 new in `webhook-secrets-rotate.test.ts`) |
| `kiox -- orun validate --intent intent.yaml` | 0 | `✓ Intent is valid` / `✓ All validation passed` |
| `kiox -- orun plan --changed --intent intent.yaml --base origin/main --output plan.json` | 0 | `1 components × 3 envs → 3 jobs · components: cli` (only `cli`) |
| `kiox -- orun run --plan plan.json --dry-run --runner github-actions` | 0 | 3 lanes preview-success: `cli·dev·Verify ✓`, `cli·stage·Verify ✓`, `cli·prod·Verify ✓` |

## 4. Reveal-Once Audit

Production code (`packages/cli/src/commands/webhook-secrets-rotate.ts`):

- `response.secret` is read from the SDK response exactly **once**
  (line 130: `const secretPlaintext = response.secret;`).
- The plaintext is written to stdout exactly **once** (line 134:
  `ctx.stdout(\`  secret:           ${secretPlaintext}…\`);`).
- The literal substring `whsec_` does NOT appear anywhere in
  production code — neither in source nor in comments. The two read
  + write call sites are gated by a single `hasPlaintext` boolean.
- No interpolation of the secret into any wider object, no
  `JSON.stringify` of any object containing it (json-mode prints
  `JSON.stringify(response)` directly — that IS the single write per
  the spec), no debug toggle, no log statement, no error path
  reference.

`rg "whsec_" packages/cli/src/` results (filtered to relevant lines):

```
src/__tests__/webhook-secrets-rotate.test.ts:40:  // 32 hex chars … `whsec_`, matching the contract surface.
src/__tests__/webhook-secrets-rotate.test.ts:41:  const FIXTURE_SECRET_PLAINTEXT = "whsec_…";
src/__tests__/webhook-secrets-rotate.test.ts:144: it("human mode … literal whsec_<32hex>", …)
src/__tests__/webhook-secrets-rotate.test.ts:182: it("…no whsec_ in stdout", …)
src/__tests__/webhook-secrets-rotate.test.ts:189: expect(out).not.toContain("whsec_");
src/__tests__/webhook-secrets-rotate.test.ts:196: it("…no whsec_ in stdout", …)
src/__tests__/webhook-secrets-rotate.test.ts:211: expect(cap.stdout.join("\n")).not.toContain("whsec_");
src/__tests__/webhook-secrets-rotate.test.ts:325: // 11. SDK error propagates; no whsec_ in stderr/stdout.
src/__tests__/webhook-secrets-rotate.test.ts:326: it("SDK rejection … no whsec_ leaked", …)
src/__tests__/webhook-secrets-rotate.test.ts:332: expect(all).not.toContain("whsec_");
src/__tests__/webhook-secrets-rotate.test.ts:338: // 12. Reveal-once stdout discipline — exactly one whsec_ in stdout.
src/__tests__/webhook-secrets-rotate.test.ts:339: it("human mode prints whsec_ exactly once …", …)
src/__tests__/webhook-secrets-rotate.test.ts:344: const matches = stdout.match(/whsec_/g);
src/__tests__/writes-and-cross-reads.test.ts:88: secret: "whsec_x",   ← pre-existing fixture from `webhook create`; not in this PR
```

All hits in this PR are in the new test file, only as fixtures and
scrub assertions. The pre-existing `whsec_x` in
`writes-and-cross-reads.test.ts:88` is from `webhook create` and is
not touched by this PR.

## 5. Hard Rules Honoured

- ✅ **Reveal-once discipline** — `secret` is read exactly once
  (`response.secret`) and written exactly once (the `${secretPlaintext}`
  interpolation in the `secret:` line). No log strings, no objects
  beyond function scope, no debug toggles, no `JSON.stringify` of any
  wider object containing it (json-mode emits the contract response
  verbatim per the spec).
- ✅ **No `node:crypto` / `node:buffer` / Node-only crypto** — the
  command does no crypto; only `import` statements are
  `../router.js`, `../errors.js`, and the SDK type from `@saas/sdk`
  via `ctx.sdk()`.
- ✅ **No `fetch(`, no manual `/v1/` paths** — all I/O goes through
  `ctx.sdk()` → `sdk.webhooks.rotateSecret(orgId, endpointId, opts)`.
- ✅ **No new `eslint-disable` / `@ts-ignore` / `@ts-expect-error` /
  `as any` / `as unknown as`** under `packages/cli/**` for production
  code. (One `as unknown as Sourceplane` exists in the test harness
  to type the fake-SDK shape — this is a permitted test-only cast,
  not a production-code escape hatch.)
- ✅ **Idempotency-key passthrough only when supplied** —
  `readIdempotencyKey(ctx)` reads `ctx.flags["idempotency-key"]`;
  the SDK call passes `{ idempotencyKey }` only when defined,
  `{}` otherwise. No defaulting, no auto-generation.
- ✅ **Implementer report on PR branch** — this file is committed to
  the branch before opening the PR.
- ✅ **Subcommand path** is `["webhook", "secrets", "rotate"]` (three
  segments, plural "secrets") — see `cli-runner.ts:170`.

## 6. Test Coverage (13 cases)

1. Happy path human mode, secret present — exit 0, header line, literal
   `whsec_<32hex>` exactly once, reveal-once warning text, all metadata
   lines (`secretVersion: 7`, `gracePeriod: 86400s`).
2. Happy path JSON mode, secret present — exit 0, single-line JSON
   parse, all four contract keys present (`endpoint`, `secret`,
   `previousSecretExpiresAt`, `gracePeriodSeconds`).
3. Legacy no-key human mode — exit 0, no-key warning text rendered,
   stdout does NOT contain `whsec_`.
4. Legacy no-key JSON mode — exit 0, parsed JSON has no `secret` key
   (asserted via `Object.prototype.hasOwnProperty.call`), no `whsec_`
   in stdout.
5. `previousSecretExpiresAt: null` human mode — renders as `(none)`.
6. `previousSecretExpiresAt: <ISO>` human mode — renders the ISO
   string verbatim (`2099-12-31T23:59:59Z`).
7. `gracePeriodSeconds: 0` human mode — renders `0s` (not collapsed
   to `(none)`).
8. Missing positional `<endpointId>` → `UsageError`, exit 2; SDK was
   never called.
9. `--output=invalid` (`--output=yaml`) → `UsageError`, exit 2; SDK
   was never called.
10. Idempotency-key passthrough — `--idempotency-key=foo` produces
    SDK call with `opts === { idempotencyKey: "foo" }`; absence
    produces SDK call with `opts === {}` (exact shape match).
11. SDK rejection — non-zero exit propagates via `formatCliError`;
    no `whsec_` in stdout or stderr.
12. **Reveal-once stdout discipline** — `stdout.match(/whsec_/g)?.length
    === 1` in human mode with secret present.
13. Missing org context (no `--org` override exists for this command;
    no active org in context) → exit 5.

## 7. Assumptions

- **Inline `resolveActiveOrgId` helper** rather than importing
  `resolveOrgId` from `writes.ts`: the task explicitly forbids
  touching `writes.ts` (and refactoring through it), and
  `resolveOrgId` is `async function` (not `export`). Re-implementing
  the no-override branch inline (5 lines) was lower risk than
  exporting from `writes.ts` and threading through. The same
  observation applies to `readIdempotencyKey` — re-implemented
  inline (3 lines, identical logic).
- **No-key human-output copy** — followed the spec wording verbatim.
- **JSON-mode emission** — `JSON.stringify(response)` of the SDK
  response. Optional `secret` is naturally omitted by `JSON.stringify`
  when `undefined`, matching the contract's optional shape (test #4
  asserts no `"secret"` key).
- **Test harness style** — fake-SDK direct injection via `vi.fn` rather
  than the `withHarness` captured-fetch pattern in
  `writes-and-cross-reads.test.ts`. Direct injection lets us assert
  the exact `(orgId, endpointId, opts)` triple the SDK receives — the
  task's idempotency-passthrough requirement (test #10) is impossible
  to assert cleanly through the SDK transport layer.
- **Extra 13th test case** — added a "no active org → exit 5" case on
  top of the required 12; mirrors `writes-and-cross-reads.test.ts`
  parity for write commands.

## 8. Spec Proposals

None. This is a tactical CLI surface consuming an already-locked
contract.

## 9. Remaining Gaps

Out-of-scope follow-ups the verifier should NOT bundle:

- `webhook secrets list` — surface for listing rotation history.
- `webhook secrets reveal` — one-shot re-fetch of the latest
  plaintext; would require a new contract field.
- `webhook secrets revoke` — invalidate the previous secret early
  (cut the grace window short).
- `@saas/webhook-verifier` multi-key extension — accept previous +
  current secret in one verification call to support subscribers
  during the grace window (B5 tail item).

## 10. Next Task Dependencies

None.

## 11. PR Number

**165** — https://github.com/sourceplane/multi-tenant-saas/pull/165
