import type {
  ListAuditEntriesResponse,
  PublicAuditEntry,
} from "@saas/contracts/events";

import type { RequestOptions, Transport } from "./transport.js";

/**
 * Events (audit) resource client.
 *
 * Org-scoped surface served by `apps/events-worker` via the api-edge
 * `audit-facade`. Returns the immutable audit-entry projection with redacted
 * payload paths already applied server-side.
 *
 * `listAuditEntries` accepts a discriminated query object so callers can ask
 * for entries by org or by a specific subject (kind + id) — mirroring the
 * `AuditQueryByOrg` / `AuditQueryByTarget` contract shapes without having to
 * import them at the call site.
 */

export type ListAuditEntriesQuery =
  | {
      by: "org";
      category?: string;
      limit?: number;
      cursor?: string;
    }
  | {
      by: "target";
      subjectKind: string;
      subjectId: string;
      limit?: number;
      cursor?: string;
    };

/**
 * SDK-facing audit list response. The api-edge sends
 * `{ data: { auditEntries }, meta: { requestId, cursor } }` and the transport
 * unwraps to `.data`, so the SDK return type mirrors the contract's `data`
 * payload directly.
 */
export type ListAuditEntriesResult = ListAuditEntriesResponse["data"];

/**
 * Hard upper bound on pages walked by `iterAuditEntries`. A misbehaving server
 * that cycles cursors will abort with an error before this limit is reached
 * (`seenCursors` guard), but the cap is a defence-in-depth so a server that
 * returns a fresh cursor on every call cannot keep us in an infinite loop.
 *
 * Exported for tests; consumers should not rely on the exact number.
 */
export const AUDIT_ITERATOR_MAX_PAGES = 1000;

export class EventsClient {
  constructor(private readonly transport: Transport) {}

  /** GET /v1/organizations/:orgId/audit */
  listAuditEntries(
    orgId: string,
    query: ListAuditEntriesQuery = { by: "org" },
    opts: RequestOptions = {},
  ): Promise<ListAuditEntriesResult> {
    return this.transport.request<ListAuditEntriesResult>(
      buildAuditRequest(orgId, query),
      opts,
    );
  }

  /**
   * Single-page audit fetch that also exposes the server-issued continuation
   * cursor. Use this when the caller needs the cursor for a paginated UI
   * (default `audit list` CLI mode); use `iterAuditEntries` when the caller
   * wants every entry across every page.
   *
   * `cursor` is `null` when the server has no further entries, mirroring
   * the api-edge `meta.cursor` field exactly.
   */
  async listAuditEntriesPage(
    orgId: string,
    query: ListAuditEntriesQuery = { by: "org" },
    opts: RequestOptions = {},
  ): Promise<{ entries: ReadonlyArray<PublicAuditEntry>; cursor: string | null }> {
    const { data, meta } = await this.transport.requestWithEnvelope<
      ListAuditEntriesResult
    >(buildAuditRequest(orgId, query), opts);
    return {
      entries: data.auditEntries,
      cursor: meta.cursor ?? null,
    };
  }

  /**
   * Async iterator that walks every page of audit entries until the server
   * returns `meta.cursor === null` (or `undefined`). Yields one
   * `PublicAuditEntry` at a time, in server order.
   *
   * The iterator drives `Transport.requestWithEnvelope` so it can read
   * `meta.cursor` without reaching into raw `fetchImpl`. Loop guards:
   *
   *  - hard cap of `AUDIT_ITERATOR_MAX_PAGES` page reads,
   *  - `seenCursors` Set: if the server ever returns a cursor we've already
   *    walked, the iterator throws rather than risking an infinite loop.
   *
   * Designed to be a drop-in replacement for the hand-rolled `--all` loop
   * that the CLI shipped in Task 0101 against the public `Transport`.
   */
  iterAuditEntries(
    orgId: string,
    query: ListAuditEntriesQuery = { by: "org" },
    opts: RequestOptions = {},
  ): AsyncIterable<PublicAuditEntry> {
    const transport = this.transport;
    return {
      [Symbol.asyncIterator](): AsyncIterator<PublicAuditEntry> {
        return createAuditIterator(transport, orgId, query, opts);
      },
    };
  }
}

interface AuditRequestInput {
  method: "GET";
  path: string;
  query: Record<string, string | number | undefined>;
}

function buildAuditRequest(
  orgId: string,
  query: ListAuditEntriesQuery,
): AuditRequestInput {
  const params: Record<string, string | number | undefined> = {};
  if (query.limit !== undefined) params.limit = query.limit;
  if (query.cursor !== undefined) params.cursor = query.cursor;
  if (query.by === "org") {
    if (query.category !== undefined) params.category = query.category;
  } else {
    params.subjectKind = query.subjectKind;
    params.subjectId = query.subjectId;
  }
  return {
    method: "GET",
    path: `/v1/organizations/${encodeURIComponent(orgId)}/audit`,
    query: params,
  };
}

function createAuditIterator(
  transport: Transport,
  orgId: string,
  initialQuery: ListAuditEntriesQuery,
  opts: RequestOptions,
): AsyncIterator<PublicAuditEntry> {
  let bufferedEntries: PublicAuditEntry[] = [];
  let bufferIndex = 0;
  let nextCursor: string | undefined = initialQuery.cursor;
  let pagesRead = 0;
  let exhausted = false;
  const seenCursors = new Set<string>();

  return {
    async next(): Promise<IteratorResult<PublicAuditEntry>> {
      while (true) {
        if (bufferIndex < bufferedEntries.length) {
          const value = bufferedEntries[bufferIndex] as PublicAuditEntry;
          bufferIndex += 1;
          return { value, done: false };
        }
        if (exhausted) {
          return { value: undefined, done: true };
        }
        if (pagesRead >= AUDIT_ITERATOR_MAX_PAGES) {
          throw new Error(
            `audit iterator exceeded ${AUDIT_ITERATOR_MAX_PAGES} page reads — refusing to continue`,
          );
        }

        const queryForPage: ListAuditEntriesQuery =
          initialQuery.by === "org"
            ? {
                by: "org",
                ...(initialQuery.category !== undefined
                  ? { category: initialQuery.category }
                  : {}),
                ...(initialQuery.limit !== undefined
                  ? { limit: initialQuery.limit }
                  : {}),
                ...(nextCursor !== undefined ? { cursor: nextCursor } : {}),
              }
            : {
                by: "target",
                subjectKind: initialQuery.subjectKind,
                subjectId: initialQuery.subjectId,
                ...(initialQuery.limit !== undefined
                  ? { limit: initialQuery.limit }
                  : {}),
                ...(nextCursor !== undefined ? { cursor: nextCursor } : {}),
              };

        const { data, meta } = await transport.requestWithEnvelope<
          ListAuditEntriesResult
        >(buildAuditRequest(orgId, queryForPage), opts);
        pagesRead += 1;

        bufferedEntries = data.auditEntries.slice();
        bufferIndex = 0;

        const cursor = meta.cursor;
        if (cursor === null || cursor === undefined) {
          exhausted = true;
          nextCursor = undefined;
        } else {
          if (seenCursors.has(cursor)) {
            throw new Error(
              `audit iterator detected a repeated cursor (${cursor}); aborting to avoid an infinite loop`,
            );
          }
          seenCursors.add(cursor);
          nextCursor = cursor;
        }
      }
    },
  };
}
