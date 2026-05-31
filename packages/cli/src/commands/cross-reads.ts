// Cross-resource read commands (Task 0101 → 0102 SDK rewire).
//
// `usage summary` and `billing summary` are thin wrappers over single-shot
// SDK reads. `audit list` adds pagination on top of the SDK with two modes:
//
//   - default (no `--all`): returns the first page via
//     `client.events.listAuditEntriesPage()`, which exposes the
//     server-issued `meta.cursor` alongside the entries. JSON output emits
//     `{ auditEntries, next_cursor }`; human mode prints a small
//     id/eventType/occurredAt/actor table with the next cursor in the
//     title when present.
//   - `--all`: drives `client.events.iterAuditEntries()` to walk every
//     page until the server returns `cursor: null`. JSON mode emits one
//     JSON document per page (newline-delimited / JSON Lines); human mode
//     concatenates rows under a single header.
//
// Task 0102 swapped the hand-rolled envelope fetch through the public
// transport for the typed SDK surface (`EventsClient`), removing the
// need for the CLI to know envelope shape, header construction, or
// loop guards.

import type { CommandContext, CommandResult } from "../router.js";
import { formatOutput } from "../output/index.js";
import { MissingOrgContextError, UsageError } from "../errors.js";
import type { ListAuditEntriesQuery } from "@saas/sdk";

interface PublicAuditEntryShape {
  id: string;
  eventType: string;
  category: string;
  occurredAt: string;
  actorType: string;
  actorId: string;
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
// Default mode: one-shot fetch via `client.events.listAuditEntriesPage()`.
// `--all` mode: drives `client.events.iterAuditEntries()` and batches
// entries back into per-page JSON Lines / a flat human table.
// ---------------------------------------------------------------------------

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

  // Build the discriminated `by:"org"` query the SDK accepts. We never
  // pass `cursor` here in --all mode (already validated above); in default
  // mode we forward it verbatim.
  function buildQuery(forCursor: string | undefined): ListAuditEntriesQuery {
    return {
      by: "org",
      ...(category !== undefined ? { category } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(forCursor !== undefined ? { cursor: forCursor } : {}),
    };
  }

  if (!all) {
    const page = await sdk.events.listAuditEntriesPage(orgId, buildQuery(cursor));
    if (ctx.outputMode === "json") {
      ctx.stdout(
        formatOutput({
          mode: "json",
          data: {
            auditEntries: page.entries,
            next_cursor: page.cursor,
          },
        }),
      );
      return { exitCode: 0 };
    }
    const { columns, rows } = renderAuditRows(page.entries);
    ctx.stdout(
      formatOutput({
        mode: "human",
        columns,
        rows,
        title:
          `Audit entries for ${orgId}` +
          (page.cursor !== null ? ` (next cursor: ${page.cursor})` : ""),
      }),
    );
    return { exitCode: 0 };
  }

  // --all: drive the SDK iterator, batching entries back into per-page
  // groups for JSON Lines output. We can't observe page boundaries from a
  // simple `for await (entry of iter)` loop, so we use the iterator
  // protocol directly and ask `listAuditEntriesPage` for each page.
  const allRows: Record<string, string>[] = [];
  let nextCursor: string | undefined = undefined;
  let columns: ReadonlyArray<string> = [];
  let iterations = 0;
  const seenCursors = new Set<string>();

  while (iterations < 1000) {
    iterations += 1;
    const page = await sdk.events.listAuditEntriesPage(orgId, buildQuery(nextCursor));
    if (ctx.outputMode === "json") {
      ctx.stdout(
        formatOutput({
          mode: "json",
          data: {
            auditEntries: page.entries,
            next_cursor: page.cursor,
          },
        }),
      );
    } else {
      const rendered = renderAuditRows(page.entries);
      columns = rendered.columns;
      for (const row of rendered.rows) allRows.push(row);
    }
    if (page.cursor === null) break;
    if (seenCursors.has(page.cursor)) {
      throw new Error(`audit pagination loop detected at cursor ${page.cursor}`);
    }
    seenCursors.add(page.cursor);
    nextCursor = page.cursor;
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
