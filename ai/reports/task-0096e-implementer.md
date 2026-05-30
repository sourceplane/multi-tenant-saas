# Task 0096e Implementer Report — Class-B Warning Cleanup Wave 5 (5-Workspace Mop-up)

## Scope

Eliminate the residual `@typescript-eslint/no-explicit-any` warnings across five test
workspaces (events-worker, policy-engine, policy-worker, webhooks-worker,
projects-worker) — 26 anys total — by replacing them with locally-defined,
narrowly-typed envelopes / cast targets. No production code, no eslint-disable, no
ts-ignore, no `as unknown as`.

## Per-File Deltas

| File | Anys Before | Anys After | Approach |
|------|-------------|------------|----------|
| tests/events-worker/src/events-worker.test.ts | 7 | 0 | Local `JsonResp` envelope + narrow casts |
| tests/policy-engine/src/api-key-policy.test.ts | 2 | 0 | Local typed cast |
| tests/policy-engine/src/policy-engine.test.ts | 5 | 0 | Local typed cast |
| tests/policy-worker/src/policy-worker.test.ts | 1 | 0 | Local typed cast |
| tests/webhooks-worker/src/delivery.test.ts | 1 | 0 | Local typed cast |
| tests/projects-worker/src/projects-worker.test.ts | 10 | 0 | Local `JsonResp` envelope + `{ limit: number }` cast for `listCalls` index reads |
| **Total** | **26** | **0** | — |

## Pattern (projects-worker.test.ts)

```ts
type JsonResp = {
  data: {
    project: { id: string; orgId: string; name?: string };
    projects: Array<{ id: string; orgId: string; name?: string }>;
    environment: { id: string; orgId: string; projectId: string; name?: string };
    environments: Array<{ id: string; orgId: string; projectId: string; name?: string }>;
  };
  meta: { cursor: string | null };
  error: { code: string; message?: string };
};

const json = (await response.json()) as JsonResp;
expect(json.data.projects[0]!.id).toBe(TEST_PROJECT_PUBLIC);

expect((listCalls[0]![1] as { limit: number }).limit).toBe(10);
```

The 8 `(await response.json()) as any` sites and 2 `listCalls[0]![N] as any`
sites all collapse cleanly to the typed envelope and a narrow `{ limit: number }`
cast respectively. The non-null `[0]!` assertion is required after the array
type tightened (no longer optional in the envelope), matching the previous
runtime semantics where the test asserts `toHaveLength(1)` on the prior line.

## Validation

- `pnpm --filter @saas/projects-worker-tests lint` — 0 warnings
- `pnpm --filter @saas/projects-worker-tests test` — 1 file / 170 it() / 170 passed (parity)
- `pnpm -r typecheck` — exit 0 (clean)
- `pnpm -r --no-bail lint` — 251 residual warnings (config-worker 126, api-edge 45, identity-worker 80) — matches target ceiling, no regressions in any of the 5 touched workspaces
- `git diff origin/main -- tests/webhooks-worker/src/webhooks-worker.test.ts` — empty (byte-identical)
- Hazard scan (`+` lines containing `eslint-disable | @ts-ignore | @ts-expect-error | as unknown as`) — empty across all 5 workspaces

## Files Modified

- tests/events-worker/src/events-worker.test.ts
- tests/policy-engine/src/api-key-policy.test.ts
- tests/policy-engine/src/policy-engine.test.ts
- tests/policy-worker/src/policy-worker.test.ts
- tests/webhooks-worker/src/delivery.test.ts
- tests/projects-worker/src/projects-worker.test.ts
- ai/reports/task-0096e-implementer.md (this file)

## Notes

No production source touched. No new test cases added or removed. All
elimination is purely type-narrowing on already-existing JSON parse / mock
call-args reads. `[0]!` non-null assertions used where the test logic already
asserts array length on the line above.
