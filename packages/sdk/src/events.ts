import type { ListAuditEntriesResponse } from "@saas/contracts/events";

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

export class EventsClient {
  constructor(private readonly transport: Transport) {}

  /** GET /v1/organizations/:orgId/audit */
  listAuditEntries(
    orgId: string,
    query: ListAuditEntriesQuery = { by: "org" },
    opts: RequestOptions = {},
  ): Promise<ListAuditEntriesResult> {
    const params: Record<string, string | number> = {};
    if (query.limit !== undefined) params.limit = query.limit;
    if (query.cursor !== undefined) params.cursor = query.cursor;
    if (query.by === "org") {
      if (query.category !== undefined) params.category = query.category;
    } else {
      params.subjectKind = query.subjectKind;
      params.subjectId = query.subjectId;
    }
    return this.transport.request<ListAuditEntriesResult>(
      {
        method: "GET",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/audit`,
        query: params,
      },
      opts,
    );
  }
}
