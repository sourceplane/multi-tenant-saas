# Proposal — `EnvironmentsClient` on `@saas/sdk`

# Found By
Task 0101 Implementer (CLI `env create` command).

# Related Task
Task 0101 (PR #155 — CLI write commands + cross-resource reads). Recommended
implementation target: Task 0102 (scoped concurrently with this proposal).

# Current Spec Text / Contract

`specs/components/13-cli-and-sdk.md` requires `sourceplane env create
<project-id> <name>` to create an environment. The api-edge route already
exists at:

```
POST /v1/organizations/:orgId/projects/:projectId/environments
GET  /v1/organizations/:orgId/projects/:projectId/environments
```

`packages/contracts/src/projects.ts` already defines the request/response
contracts:

- `CreateEnvironmentRequest`
- `PublicEnvironment`
- `CreateEnvironmentResponse`
- `ListEnvironmentsResponse` (and Get/Archive equivalents)

`@saas/sdk` (Task 0099 fan-out, PR #153) shipped 11 resource clients —
`organizations`, `projects`, `memberships`, `apiKeys`, `webhooks`,
`metering`, `billing`, `events`, `securityEvents`, `config`,
`notifications` — but **no `environments` client**.

# Repo Reality / New Information

To make `env create` ship in Task 0101, the CLI fell back to the public
`Transport`:

```ts
// packages/cli/src/commands/writes.ts:153–162
const { environment } = await sdk.transport.request<{ environment: PublicEnvironment }>({
  method: "POST",
  path: `/v1/organizations/${encodeURIComponent(orgId)}/projects/${encodeURIComponent(projectId)}/environments`,
  body: { name },
  idempotencyKey,
});
```

This is technically inside the public `@saas/sdk` contract (`Transport` is
exported), but the response shape is duplicated inline and the call sidesteps
the typed surface every other CLI write uses. It is an Idempotency-Key /
Stripe-parity-safe regression today, but it leaves the typed SDK surface
incomplete and means anyone else writing against the SDK will have to
reinvent this same workaround.

# Proposed Spec Change

Add an `EnvironmentsClient` to `packages/sdk/src/`, mirroring `ProjectsClient`:

```ts
class EnvironmentsClient {
  list(orgId: string, projectId: string,
       opts?: RequestOptions): Promise<ListEnvironmentsResponse>;
  get(orgId: string, projectId: string, envId: string,
      opts?: RequestOptions): Promise<GetEnvironmentResponse>;
  create(orgId: string, projectId: string, body: CreateEnvironmentRequest,
         opts?: RequestOptions): Promise<CreateEnvironmentResponse>;
  archive(orgId: string, projectId: string, envId: string,
          opts?: RequestOptions): Promise<ArchiveEnvironmentResponse>;
}
```

Wire it on `Sourceplane` as `client.environments`. All four methods consume
types directly from `@saas/contracts`. No contract edits.

`encodeURIComponent` on every dynamic segment. Caller-owned
`idempotencyKey` on `create` (Stripe parity). No CLI/SDK-side generation.

# Why This Is Needed

- Closes the `transport.fetchImpl`-based regression in `packages/cli`.
- Restores the invariant that **every** CLI write is dispatched through a
  typed SDK client, not the raw transport.
- Brings the SDK to feature parity against the api-edge route table for
  environments (currently the only project sub-resource missing).

# Impacted Files / Tasks

- `packages/sdk/src/environments.ts` (new, mirrors `projects.ts`).
- `packages/sdk/src/index.ts` — register `environments` on `Sourceplane`.
- `packages/sdk/src/__tests__/environments.test.ts` (new, mirrors
  `projects.test.ts` shape).
- `packages/cli/src/commands/writes.ts` — drop inline `Transport.request`,
  switch to `sdk.environments.create(...)`.
- `packages/cli/src/__tests__/writes-and-cross-reads.test.ts` — update fake
  SDK shape for the env-create test.
- `specs/components/13-cli-and-sdk.md` — no change required (the spec
  already implicitly assumes SDK surface; this just realigns reality).

# Compatibility / Migration Notes

- Net-additive on `@saas/sdk`. No breaking change to existing consumers.
- The CLI swap is a one-file edit in `packages/cli/src/commands/writes.ts`
  plus a test-shape update. The CLI's external contract (argv shape, output
  envelope, exit codes) is unchanged.
- `pnpm-lock.yaml` unchanged (no new runtime deps).

# Recommendation

**Accept.** Schedule as Task 0102 (alongside Proposal 2, see
`ai/proposals/task-0101-spec-update-audit-pagination.md`). Both gaps share
a single PR-sized fan-out: SDK gap closure + CLI re-wiring, no apps/contracts
churn, no infra surface.
