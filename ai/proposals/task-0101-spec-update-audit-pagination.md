# Proposal — Surface `meta.cursor` on `@saas/sdk` paginated reads

# Found By
Task 0101 Implementer (CLI `audit list --all` command).

# Related Task
Task 0101 (PR #155 — CLI cross-resource read commands). Recommended
implementation target: Task 0102 (scoped concurrently with this proposal).

# Current Spec Text / Contract

`@saas/sdk` `Transport.request<T>(...)` returns `parsed.data as T`,
discarding `parsed.meta`. The wire envelope is:

```ts
// packages/sdk/src/transport.ts
{ data: T, meta: { requestId: string; cursor?: string | null } }
```

`EventsClient.listAuditEntries(...)` therefore returns
`{ auditEntries: PublicAuditEntry[] }` only — the cursor is lost between
the wire and the typed return.

`specs/components/13-cli-and-sdk.md` requires `sourceplane audit list
[--all]` to stream every page. With the SDK shape today, the CLI cannot
paginate via the typed surface.

# Repo Reality / New Information

Task 0101 worked around this by walking the api-edge directly:

```ts
// packages/cli/src/commands/cross-reads.ts:155–191
while (true) {
  const res = await sdk.transport.fetchImpl(url, {
    method: "GET",
    headers: { ...sdk.transport.defaultHeaders, ...authHeaders },
  });
  const envelope = await res.json();          // { data, meta }
  emit(envelope.data.auditEntries);
  if (!envelope.meta.cursor) break;
  if (++pages > 1000 || seenCursors.has(envelope.meta.cursor)) break;
  seenCursors.add(envelope.meta.cursor);
}
```

This bypasses every typed surface in the SDK (`EventsClient`, response
parsing, error normalisation). It also reapplies auth headers manually
from `sdk.transport.auth`, which leaks transport internals into a CLI
command.

# Proposed Spec Change

Surface pagination at the SDK level. Two acceptable shapes (verifier's
choice during implementation):

**Option 1 — async iterator (preferred, matches Stripe / AWS SDK v3):**

```ts
class EventsClient {
  iterAuditEntries(
    orgId: string,
    query?: ListAuditEntriesQuery,
    opts?: RequestOptions,
  ): AsyncIterable<PublicAuditEntry>;
}
```

Internal implementation loops on `meta.cursor` until null/undefined.
The CLI's `--all` loop becomes:

```ts
for await (const entry of sdk.events.iterAuditEntries(orgId, query)) { ... }
```

**Option 2 — page object:**

```ts
type AuditEntriesPage = { auditEntries: PublicAuditEntry[]; nextCursor: string | null };
class EventsClient {
  listAuditEntries(orgId: string, query?: ..., opts?: ...): Promise<AuditEntriesPage>;
}
```

Caller loops until `nextCursor === null`.

Either shape MUST:
- Drop the `transport.fetchImpl` workaround in `packages/cli/src/commands/cross-reads.ts`.
- Apply the same loop-guard pattern (max-page cap + `seenCursors` Set) inside
  the SDK so a misbehaving server cannot infinite-loop a CLI consumer.
- Preserve `RequestOptions.idempotencyKey` semantics (N/A on reads, but
  `RequestOptions` shape must remain stable).

# Why This Is Needed

- Closes the second `transport.fetchImpl` regression in `packages/cli`.
- Establishes a uniform pagination idiom on the SDK that the console
  (U10) will inherit instead of reinventing.
- Caps server-side runaway behaviour at the SDK boundary, not the CLI.

# Impacted Files / Tasks

- `packages/sdk/src/events.ts` — add `iterAuditEntries` (or change
  `listAuditEntries` return shape).
- `packages/sdk/src/transport.ts` — optional: expose a typed
  `requestWithEnvelope<T>()` that returns `{ data, meta }` so other
  paginated reads (security events, future feeds) can adopt the same
  pattern without each one re-implementing cursor handling.
- `packages/sdk/src/__tests__/events.test.ts` — extend.
- `packages/cli/src/commands/cross-reads.ts` — drop fetchImpl workaround.
- `packages/cli/src/__tests__/writes-and-cross-reads.test.ts` — update fake
  SDK shape for the audit-list-`--all` test.

# Compatibility / Migration Notes

- **Option 1** is purely additive (new method); zero breaking change.
- **Option 2** changes the return type of `listAuditEntries`. Currently the
  only consumer is `packages/cli`; PR #155 (Task 0101) would need a one-line
  edit to consume `nextCursor`. No external SDK consumers exist yet.
- Recommend **Option 1** to keep the migration zero-cost and to leave room
  for `listAuditEntries` to remain a single-page primitive.
- `pnpm-lock.yaml` unchanged (no new runtime deps).

# Recommendation

**Accept Option 1 (async iterator).** Schedule as Task 0102 alongside the
EnvironmentsClient gap. Single PR closes both regressions; the CLI's
`transport.fetchImpl` paths disappear entirely.
