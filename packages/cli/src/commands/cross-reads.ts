// Cross-resource read commands (Task 0101).
//
// `usage summary` and `billing summary` are thin wrappers over single-shot
// SDK reads. `audit list` adds pagination on top of the SDK with two modes:
//
//   - default (no `--all`): returns the first page. JSON output emits the
//     SDK's response shape (`{ auditEntries }`); human mode prints a small
//     id/eventType/occurredAt/actor table. Cursor surfaces as
//     `next_cursor` in the JSON envelope when present.
//   - `--all`: loops until the server returns `cursor: null`, emitting one
//     JSON document per page on stdout (newline-delimited / JSON Lines)
//     when `--output=json`, or appending pages into a single flat human
//     table otherwise.
//
// Why pagination is hand-rolled here: `client.events.listAuditEntries()`
// returns the unwrapped `data` payload only (the SDK transport drops
// `meta`), so pulling `meta.cursor` off the response requires hitting the
// transport directly. We do that through `client.transport.fetchImpl` to
// stay inside the public SDK contract — no edits to `packages/sdk/**`.
// The implementer report's spec proposal recommends a typed pagination
// helper on the SDK in a follow-up task.

import type { CommandContext, CommandResult } from "../router.js";
import { formatOutput } from "../output/index.js";
import { MissingOrgContextError, UsageError } from "../errors.js";
import { decodeError } from "@saas/sdk";
import type { Sourceplane } from "@saas/sdk";

interface PublicAuditEntryShape {
  id: string;
  eventType: string;
  category: string;
  occurredAt: string;
  actorType: string;
  actorId: string;
}

interface AuditEnvelopePage {
  data: { auditEntries: PublicAuditEntryShape[] };
  meta: { requestId: string; cursor: string | null };
}

async function resolveOrgId(ctx: CommandContext): Promise<string> {
  const cliCtx = await ctx.contextStore.load();
  const orgId = cliCtx.activeOrgId;
  if (orgId === undefined || orgId.length === 0) {
    throw new MissingOrgContextError();
  }
  return orgId;
}

function parseLimit(flag: string | boolean | undefined): number | undefined {
  if (typeof flag !== "string" || flag.length === 0) return undefined;
  const n = Number.parseInt(flag, 10);
  if (!Number.isFinite(n) || n <= 0) {
    throw new UsageError(`--limit must be a positive integer (got ${flag})`);
  }
  return n;
}

// ---------------------------------------------------------------------------
// usage summary [--metric=METRIC] [--from=ISO] [--to=ISO]
//
// SDK pick: `client.metering.getUsageSummary(orgId, query)` —
// GET /v1/organizations/:orgId/usage/summary. The contract requires
// `metric` so the CLI defaults to "requests" (the canonical org-level
// rollup metric) when the user omits `--metric`. `--from` / `--to` map to
// the contract's `startTime` / `endTime` ISO 8601 fields.
// ---------------------------------------------------------------------------

export async function usageSummaryCommand(ctx: CommandContext): Promise<CommandResult> {
  const metricFlag = ctx.flags["metric"];
  const fromFlag = ctx.flags["from"];
  const toFlag = ctx.flags["to"];
  const metric = typeof metricFlag === "string" && metricFlag.length > 0 ? metricFlag : "requests";

  const orgId = await resolveOrgId(ctx);
  const sdk = await ctx.sdk();
  const result = await sdk.metering.getUsageSummary(orgId, {
    metric,
    ...(typeof fromFlag === "string" && fromFlag.length > 0 ? { startTime: fromFlag } : {}),
    ...(typeof toFlag === "string" && toFlag.length > 0 ? { endTime: toFlag } : {}),
  });

  if (ctx.outputMode === "json") {
    ctx.stdout(formatOutput({ mode: "json", data: result }));
    return { exitCode: 0 };
  }

  const rows = result.rollups.map((r) => ({
    bucketStart: r.bucketStart,
    bucketType: r.bucketType,
    quantity: String(r.quantity),
    recordCount: String(r.recordCount),
    projectId: r.projectId ?? "",
    environmentId: r.environmentId ?? "",
  }));
  ctx.stdout(
    formatOutput({
      mode: "human",
      columns: ["bucketStart", "bucketType", "quantity", "recordCount", "projectId", "environmentId"],
      rows,
      title: `Usage summary for ${orgId} (metric=${metric})`,
    }),
  );
  return { exitCode: 0 };
}

// ---------------------------------------------------------------------------
// billing summary
//
// SDK pick: `client.billing.getSummary(orgId)` —
// GET /v1/organizations/:orgId/billing/summary. The response carries
// `customer`, `activeSubscription`, `plan`, and `entitlements`; we render
// a key/value summary in human mode and the SDK shape verbatim in JSON.
// ---------------------------------------------------------------------------

export async function billingSummaryCommand(ctx: CommandContext): Promise<CommandResult> {
  const orgId = await resolveOrgId(ctx);
  const sdk = await ctx.sdk();
  const result = await sdk.billing.getSummary(orgId);

  if (ctx.outputMode === "json") {
    ctx.stdout(formatOutput({ mode: "json", data: result }));
    return { exitCode: 0 };
  }

  ctx.stdout(
    formatOutput({
      mode: "human",
      record: {
        customer: result.customer ? result.customer.id : "(none)",
        plan: result.plan ? `${result.plan.name} (${result.plan.id})` : "(none)",
        subscription: result.activeSubscription
          ? `${result.activeSubscription.id} [${result.activeSubscription.status}]`
          : "(none)",
        entitlements: String(result.entitlements.length),
      },
      title: `Billing summary for ${orgId}`,
    }),
  );
  return { exitCode: 0 };
}

// ---------------------------------------------------------------------------
// audit list [--limit=N] [--cursor=CURSOR] [--category=CAT] [--all]
//
// First-page mode (default) emits one JSON document or one human table;
// `--all` walks every page until the server returns `cursor: null`.
// In `--all` JSON mode we emit JSON Lines (one document per page) so a
// downstream pipeline can stream without buffering. Human mode in `--all`
// concatenates rows under a single header.
// ---------------------------------------------------------------------------

async function fetchAuditPage(
  sdk: Sourceplane,
  orgId: string,
  query: { category?: string; limit?: number; cursor?: string },
): Promise<AuditEnvelopePage> {
  const params = new URLSearchParams();
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.cursor !== undefined) params.set("cursor", query.cursor);
  if (query.category !== undefined) params.set("category", query.category);
  const qs = params.toString();
  const url =
    `${sdk.transport.baseUrl}/v1/organizations/${encodeURIComponent(orgId)}/audit` +
    (qs.length > 0 ? `?${qs}` : "");

  const headers = new Headers();
  for (const [k, v] of Object.entries(sdk.transport.defaultHeaders)) headers.set(k, v);
  const auth = sdk.transport.auth;
  if (auth !== undefined) {
    if (auth.kind === "bearer") headers.set("authorization", `Bearer ${auth.token}`);
    else headers.set("cookie", auth.cookie);
  }
  headers.set("accept", "application/json");

  // We deliberately do NOT set `x-request-id` here — the api-edge worker
  // mints one server-side and returns it on the response and on errors.
  // Skipping the client-generated id keeps the CLI off the hazardous
  // random-id-generation rail (the same one that bars CLI-side
  // idempotency-key auto-mint).

  const response = await sdk.transport.fetchImpl(url, { method: "GET", headers });
  if (!response.ok) {
    throw await decodeError(response, "");
  }
  const parsed = (await response.json()) as AuditEnvelopePage;
  return parsed;
}

function renderAuditRows(entries: ReadonlyArray<PublicAuditEntryShape>): {
  columns: ReadonlyArray<string>;
  rows: ReadonlyArray<Record<string, string>>;
} {
  return {
    columns: ["occurredAt", "category", "eventType", "actor", "id"],
    rows: entries.map((e) => ({
      occurredAt: e.occurredAt,
      category: e.category,
      eventType: e.eventType,
      actor: `${e.actorType}:${e.actorId}`,
      id: e.id,
    })),
  };
}

export async function auditListCommand(ctx: CommandContext): Promise<CommandResult> {
  const limit = parseLimit(ctx.flags["limit"]);
  const cursorFlag = ctx.flags["cursor"];
  const cursor = typeof cursorFlag === "string" && cursorFlag.length > 0 ? cursorFlag : undefined;
  const categoryFlag = ctx.flags["category"];
  const category = typeof categoryFlag === "string" && categoryFlag.length > 0 ? categoryFlag : undefined;
  const all = ctx.flags["all"] === true;

  if (all && cursor !== undefined) {
    throw new UsageError("--all and --cursor are mutually exclusive");
  }

  const orgId = await resolveOrgId(ctx);
  const sdk = await ctx.sdk();

  if (!all) {
    const page = await fetchAuditPage(sdk, orgId, {
      ...(limit !== undefined ? { limit } : {}),
      ...(cursor !== undefined ? { cursor } : {}),
      ...(category !== undefined ? { category } : {}),
    });
    if (ctx.outputMode === "json") {
      ctx.stdout(
        formatOutput({
          mode: "json",
          data: {
            auditEntries: page.data.auditEntries,
            next_cursor: page.meta.cursor,
          },
        }),
      );
      return { exitCode: 0 };
    }
    const { columns, rows } = renderAuditRows(page.data.auditEntries);
    ctx.stdout(
      formatOutput({
        mode: "human",
        columns,
        rows,
        title:
          `Audit entries for ${orgId}` +
          (page.meta.cursor !== null ? ` (next cursor: ${page.meta.cursor})` : ""),
      }),
    );
    return { exitCode: 0 };
  }

  // --all: walk pages until cursor is null. Bounded loop guard prevents an
  // infinite loop if the server somehow returns the same cursor twice.
  const allRows: Record<string, string>[] = [];
  let nextCursor: string | undefined = cursor;
  const seenCursors = new Set<string>();
  let iterations = 0;
  let columns: ReadonlyArray<string> = [];

  while (iterations < 1000) {
    iterations += 1;
    const page = await fetchAuditPage(sdk, orgId, {
      ...(limit !== undefined ? { limit } : {}),
      ...(nextCursor !== undefined ? { cursor: nextCursor } : {}),
      ...(category !== undefined ? { category } : {}),
    });
    if (ctx.outputMode === "json") {
      ctx.stdout(
        formatOutput({
          mode: "json",
          data: {
            auditEntries: page.data.auditEntries,
            next_cursor: page.meta.cursor,
          },
        }),
      );
    } else {
      const rendered = renderAuditRows(page.data.auditEntries);
      columns = rendered.columns;
      for (const row of rendered.rows) allRows.push(row);
    }
    if (page.meta.cursor === null) break;
    if (seenCursors.has(page.meta.cursor)) {
      throw new Error(`audit pagination loop detected at cursor ${page.meta.cursor}`);
    }
    seenCursors.add(page.meta.cursor);
    nextCursor = page.meta.cursor;
  }

  if (ctx.outputMode === "human") {
    ctx.stdout(
      formatOutput({
        mode: "human",
        columns,
        rows: allRows,
        title: `All audit entries for ${orgId} (${allRows.length} rows)`,
      }),
    );
  }
  return { exitCode: 0 };
}
