# Task 0101 — Implementer Report

**Task:** Round out the `@saas/cli` (`sourceplane`) command surface so every flow listed in `specs/components/13-cli-and-sdk.md` is reachable from the CLI.
**Branch:** `feat/cli-task-0101-write-and-cross-read-commands`
**PR:** https://github.com/sourceplane/multi-tenant-saas/pull/155
**Status:** Pushed; awaiting verifier review.

---

## Summary

Added five write commands and three cross-resource read commands to the `sourceplane` CLI. The CLI never auto-mints an `Idempotency-Key`; all writes accept `--idempotency-key=KEY` and forward it verbatim into `RequestOptions.idempotencyKey` (Stripe parity). Active-org resolution stays strict: only `org invite` accepts a `--org=ORG_ID` override, everything else throws `MissingOrgContextError` (exit 5) when the user has not run `sourceplane org use <org-id>`.

44 new `it()` blocks (target ≥ 30) cover happy paths, the full exit-code matrix (0/2/3/5), header forwarding, query-param forwarding, multi-page audit pagination, and JSON shape round-trips. The hazard set under `packages/cli/src/**` is empty (no `eslint-disable`, no `@ts-ignore`/`@ts-expect-error`, no `Math.random`, no `crypto.randomUUID`). All eight gates pass: typecheck, lint, test, build, hazard grep, `orun validate`, `orun plan --changed`, `orun run --dry-run`.

Two spec gaps hit during implementation are written up as proposals (below) — both are SDK-surface follow-ups, neither blocks Task 0101's CLI shipment.

---

## What landed

### New files

| File | Purpose | Approx. LOC |
|---|---|---|
| `packages/cli/src/commands/writes.ts` | Write command handlers (`org invite`, `project create`, `env create`, `api-key create`, `webhook create`). | 340 |
| `packages/cli/src/commands/cross-reads.ts` | Cross-resource read handlers (`usage summary`, `billing summary`, `audit list`, including `--all` paginator). | 305 |
| `packages/cli/src/__tests__/writes-and-cross-reads.test.ts` | 44 `it()` tests across 8 describe blocks. | 920 |

### Edits

| File | Change |
|---|---|
| `packages/cli/src/cli-runner.ts` | Registered 8 new routes; expanded help text; left the dispatch shape intact. |
| `packages/cli/README.md` | Promoted "Pilot commands" → full "Commands" catalogue; added exit-code table, idempotency policy, audit-pagination semantics. |

### Commands

```
# Writes
sourceplane org invite <email>      [--role=ROLE] [--idempotency-key=KEY] [--org=ORG_ID]
sourceplane project create <name>   [--idempotency-key=KEY]
sourceplane env create <pid> <name> [--idempotency-key=KEY]
sourceplane api-key create <name>   [--scope=SCOPE] [--idempotency-key=KEY]
sourceplane webhook create <url>    [--event=EVENT[,EVENT2,...]] [--idempotency-key=KEY]

# Cross-resource reads
sourceplane usage summary           [--metric=METRIC] [--from=ISO] [--to=ISO]
sourceplane billing summary
sourceplane audit list              [--limit=N] [--cursor=CURSOR] [--category=CAT] [--all]
```

---

## Boundary discipline

- **No edits under `packages/sdk/**`.** Verified with `git diff --name-only origin/main...HEAD`. The CLI uses only `Sourceplane`, the resource clients (`memberships`, `projects`, `apiKeys`, `webhooks`, `metering`, `billing`), and the public `Transport` (`transport.request`, `transport.fetchImpl`, `transport.baseUrl`, `transport.defaultHeaders`, `transport.auth`).
- **Idempotency-Key is caller-owned.** When `--idempotency-key=KEY` is supplied, the SDK adds the header verbatim. When it is absent, the SDK omits the header. The CLI never invokes `crypto.randomUUID` or `Math.random` to fabricate a key. Webhook child writes (subscriptions) deterministically suffix the user's root key (`KEY:sub:0`, `KEY:sub:1`, …) so the whole `webhook create` invocation stays retry-safe even if a subscription POST fails mid-flight.
- **Active org.** Only `org invite` honours `--org=ORG_ID`. `project create`, `env create`, `api-key create`, `webhook create`, and all three cross-reads resolve from `ContextStore.activeOrgId` and throw `MissingOrgContextError` (exit 5) when unset. Test `commands — project create › does NOT honour --org override` enforces this.
- **JSON output is deterministic.** The CLI emits no timestamps. JSON mode either echoes the SDK response shape verbatim (`org invite`, `project create`, `env create`, `api-key create`, `webhook create`, `usage summary`, `billing summary`) or wraps audit pages with `{ auditEntries, next_cursor }`. The `--all` JSON mode emits one document per page (JSON Lines) so a downstream pipeline can stream without buffering.
- **Hazards:**
  ```
  $ grep -rnE "eslint-disable|@ts-ignore|@ts-expect-error|Math\.random|crypto\.randomUUID" \
       packages/cli/src/ --include='*.ts' | grep -v __tests__
  (no matches)
  ```

---

## Validation results

| Gate | Command | Result |
|---|---|---|
| Typecheck | `pnpm --filter @saas/cli typecheck` | ✓ |
| Lint | `pnpm --filter @saas/cli lint` | ✓ (0 errors, 0 warnings in CLI src) |
| Tests | `pnpm --filter @saas/cli test` | ✓ 7 files, **95 / 95 tests** (44 new) |
| Build | `pnpm --filter @saas/cli build` | ✓ |
| Hazard grep | (see above) | ✓ no matches |
| Repo-wide typecheck | `pnpm typecheck` | ✓ 41/41 turbo tasks |
| Repo-wide lint | `pnpm lint` | ✓ 35/35 (only pre-existing warnings in unrelated packages) |
| `orun validate` | `./.workspace/bin/orun validate` | ✓ Intent valid, all validation passed |
| `orun plan --changed` | `./.workspace/bin/orun plan --changed --base origin/main --output /tmp/plan-0101.json` | ✓ 1 component × 3 envs → 3 jobs (`cli`) |
| `orun run --dry-run` | `./.workspace/bin/orun run --plan /tmp/plan-0101.json --dry-run --runner github-actions` | ✓ 3 / 3 lanes simulated (dev / stage / prod) |

---

## Test coverage map (44 new `it()` blocks)

```
commands — org invite              (8 tests)
  ✓ POSTs to invitations endpoint with default role
  ✓ forwards --idempotency-key as header
  ✓ does NOT auto-mint Idempotency-Key
  ✓ --org overrides active-org
  ✓ --org works with no active-org
  ✓ missing org context → exit 5
  ✓ missing email → exit 2
  ✓ JSON round-trip

commands — project create          (5 tests)
commands — env create              (4 tests)   ← incl. transport.request path
commands — api-key create          (5 tests)   ← incl. one-time secret reveal
commands — webhook create          (5 tests)   ← incl. KEY:sub:N suffixing
commands — usage summary           (4 tests)
commands — billing summary         (3 tests)
commands — audit list              (8 tests)   ← incl. --all multi-page loop,
                                                  --all + --cursor mutual excl.,
                                                  bearer header on raw fetch
```

---

## Spec proposals

Both gaps are SDK-side; neither blocks Task 0101. Each is annotated in code at the workaround site.

### Proposal 1 — `EnvironmentsClient` on the SDK

**Gap:** `Sourceplane` exposes no client for environments. The api-edge route exists at `/v1/organizations/:orgId/projects/:projectId/environments` (POST + GET) and `packages/contracts/src/projects.ts` defines `CreateEnvironmentRequest` / `PublicEnvironment` / `CreateEnvironmentResponse`. The SDK simply hasn't been updated to surface them.

**CLI workaround:** `env create` calls the public `sdk.transport.request<{ environment: ... }>({ method: "POST", path: "/v1/organizations/.../environments", body })`. Annotated at `packages/cli/src/commands/writes.ts:153–162`. The path stays inside the public SDK contract (`Transport` is exported from `@saas/sdk`), but the response shape is duplicated inline and the call sidesteps the typed surface every other CLI write uses.

**Recommendation:** add `EnvironmentsClient` to `packages/sdk/src/`, mirroring `ProjectsClient`. Suggested surface:

```ts
class EnvironmentsClient {
  list(orgId: string, projectId: string, opts?: RequestOptions): Promise<ListEnvironmentsResponse>;
  get(orgId: string, projectId: string, envId: string, opts?: RequestOptions): Promise<GetEnvironmentResponse>;
  create(orgId: string, projectId: string, body: CreateEnvironmentRequest, opts?: RequestOptions): Promise<CreateEnvironmentResponse>;
  archive(orgId: string, projectId: string, envId: string, opts?: RequestOptions): Promise<ArchiveEnvironmentResponse>;
}
```

When this lands, `env create` should drop the inline type and call `sdk.environments.create(...)` like every other write.

### Proposal 2 — paginated iterator that surfaces `meta.cursor`

**Gap:** `Transport.request<T>` returns `parsed.data as T` and drops `parsed.meta`. So `client.events.listAuditEntries()` returns `{ auditEntries }` only — `meta.cursor` is unreachable through the typed surface, even though the api-edge envelope carries it. This makes pagination impossible without falling back to the raw HTTP layer.

**CLI workaround:** `audit list --all` walks pages via `sdk.transport.fetchImpl(url, { method: "GET", headers })` directly, parsing the full envelope (`{ data, meta }`) so it can read `meta.cursor`. Annotated at `packages/cli/src/commands/cross-reads.ts:155–191`. Auth headers are reapplied manually from `sdk.transport.auth`. Loop guard prevents infinite paging on misbehaving servers (1000 pages cap + `seenCursors` set).

**Recommendation:** expose pagination at the SDK level. Two shapes work:

1. **Async iterator:** `client.events.iterAuditEntries(orgId, query)` returning `AsyncIterable<PublicAuditEntry>`, with an internal cursor loop. The CLI's `--all` loop becomes `for await (const e of sdk.events.iterAuditEntries(orgId, query)) {...}`.
2. **Page object:** `client.events.listAuditEntries(orgId, query)` returns `{ auditEntries, nextCursor }` (i.e. surface `meta.cursor` as a typed field on the returned object). The CLI calls it in a loop until `nextCursor === null`.

Either drops the `transport.fetchImpl` workaround. Option 1 is closer to the JS ecosystem (Stripe's `autoPagingIterator`, AWS SDK v3 `paginateXxx`).

---

## Open questions for the verifier

1. **Default invitation role.** I default `org invite` to `--role=viewer` when the flag is absent. Is `viewer` the right least-privilege default, or should the CLI refuse to invite without an explicit `--role` (forcing the user to make a conscious RBAC decision)?
2. **`api-key create` `--scope` mapping.** I map `--scope=SCOPE` → `CreateApiKeyRequest.role` and default to `viewer`. The CLI does not enforce the role enum (api-edge does). Should the CLI also gate against a known role list to fail fast on typos, or is server-side rejection the cleaner contract?
3. **`webhook create --event` multi-value parsing.** I accept comma-separated events (`--event=a,b`) because the existing argv parser collapses repeated `--event=...` into the last value. If multi-flag (`--event=a --event=b`) is preferred, the parser needs an array-aware mode — happy to extend it in a follow-up. Documented in `packages/cli/src/commands/writes.ts:266–278` and the README.
4. **`audit list --all` JSON shape.** I emit JSON Lines (one document per page). An alternative is buffering all pages and emitting a single envelope with the full `auditEntries[]`. JSON Lines is friendlier for streaming pipelines but breaks naive `JSON.parse(stdout)`. Preference?
5. **`usage summary` default metric.** I default `--metric=requests` when omitted because the contract requires `metric`. Is "requests" the canonical org-level rollup, or should the CLI list candidate metrics and refuse without `--metric`?

---

## Next steps for the verifier

1. Pull the branch and run the full gate set (the same eight gates listed above).
2. Inspect the four files I added/edited under `packages/cli/src/` for boundary compliance — in particular confirm there are no SDK edits, no CLI-side `Idempotency-Key` mint paths, and that `--org` honours/ignores the override per the rule.
3. Smoke-test the SDK-bypass paths (`env create`, `audit list --all`) against a real api-edge if possible — the unit tests use a captured `fetch`, so the integration shape is asserted but not exercised end-to-end.
4. Decide on the five open questions above; any tightening goes into a follow-up CLI task.
5. Triage the two spec proposals — both are clean follow-up tasks (small, isolated, no breaking change to existing SDK consumers).

---

## References

- `specs/components/13-cli-and-sdk.md` — required CLI capabilities.
- `packages/cli/src/errors.ts` — exit-code catalogue (0/1/2/3/4/5/6) used throughout.
- `packages/cli/src/output/index.ts` — `formatOutput()` (`record` for writes, `columns`+`rows` for tables, JSON for `--output=json`).
- `packages/sdk/src/transport.ts` — public `Transport` surface (`request`, `fetchImpl`, `baseUrl`, `defaultHeaders`, `auth`).
- `packages/contracts/src/projects.ts` — `CreateEnvironmentRequest` / `PublicEnvironment` / `CreateEnvironmentResponse` (SDK gap, see Proposal 1).
- `packages/contracts/src/events.ts` — `PublicAuditEntry` and `ListAuditEntriesResponse`; `meta.cursor` lives in the api-edge envelope, not the typed return shape (SDK gap, see Proposal 2).
- PR: https://github.com/sourceplane/multi-tenant-saas/pull/155
