/**
 * Pure helpers for the org-scoped audit-log panel.
 *
 * Kept dependency-free (no React, no `next/*`, no DOM) so the filter-query
 * building, "Load more" pagination accumulation, timestamp formatting, and
 * NDJSON export shaping can be unit-tested in isolation. The React wiring lives
 * in the audit page (`app/(app)/orgs/[orgSlug]/audit/page.tsx`); this file owns:
 *
 *   - the filter form → SDK `by:"org"` query builder (`buildAuditQuery`)
 *   - the "Load more" accumulation reducer (`appendAuditPage`)
 *   - the timestamp + actor view-model shapers
 *   - the NDJSON serializer for the in-browser export download
 *
 * Cursor handling mirrors the SDK contract: the continuation cursor is an
 * opaque base64 token surfaced by `EventsClient.listAuditEntriesPage` as
 * `cursor` (sourced from `meta.cursor`, NOT a body field). Callers MUST pass it
 * back verbatim — never construct or parse it. Filters never alter the cursor
 * keyset; they only narrow the eligible rows.
 */

import type { EventActorType, PublicAuditEntry } from "@saas/contracts/events";
import type { ListAuditEntriesQuery } from "@saas/sdk";

/** Raw, unvalidated values straight from the filter form inputs. */
export interface AuditFilterFormValues {
  category: string;
  actorId: string;
  actorType: string;
  subjectKind: string;
  subjectId: string;
  eventType: string;
  from: string;
  to: string;
}

export const EMPTY_AUDIT_FILTERS: AuditFilterFormValues = {
  category: "",
  actorId: "",
  actorType: "",
  subjectKind: "",
  subjectId: "",
  eventType: "",
  from: "",
  to: "",
};

/** Trim a form value; treat empty / whitespace-only as "unset". */
function clean(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Build the discriminated `by:"org"` SDK query from the filter form values.
 * Only non-empty fields are included, so an all-blank form yields the bare
 * `{ by: "org" }` query (every entry). The worker is the authoritative
 * validator; this builder only forwards trimmed, non-empty strings.
 *
 * `cursor` is threaded in for "Load more"; omit it for the first page.
 */
export function buildAuditQuery(
  values: AuditFilterFormValues,
  cursor?: string,
): ListAuditEntriesQuery {
  const category = clean(values.category);
  const actorId = clean(values.actorId);
  const actorType = clean(values.actorType);
  const subjectKind = clean(values.subjectKind);
  const subjectId = clean(values.subjectId);
  const eventType = clean(values.eventType);
  const from = clean(values.from);
  const to = clean(values.to);
  return {
    by: "org",
    ...(category !== undefined ? { category } : {}),
    ...(actorId !== undefined ? { actorId } : {}),
    ...(actorType !== undefined
      ? { actorType: actorType as EventActorType }
      : {}),
    ...(subjectKind !== undefined ? { subjectKind } : {}),
    ...(subjectId !== undefined ? { subjectId } : {}),
    ...(eventType !== undefined ? { eventType } : {}),
    ...(from !== undefined ? { from } : {}),
    ...(to !== undefined ? { to } : {}),
    ...(cursor !== undefined ? { cursor } : {}),
  } as ListAuditEntriesQuery;
}

/** Whether the form has at least one active filter. */
export function hasActiveAuditFilters(values: AuditFilterFormValues): boolean {
  return (
    clean(values.category) !== undefined ||
    clean(values.actorId) !== undefined ||
    clean(values.actorType) !== undefined ||
    clean(values.subjectKind) !== undefined ||
    clean(values.subjectId) !== undefined ||
    clean(values.eventType) !== undefined ||
    clean(values.from) !== undefined ||
    clean(values.to) !== undefined
  );
}

/**
 * Format an ISO timestamp to a short local date+time, tolerating null and
 * malformed values (returns the supplied fallback rather than "Invalid Date").
 */
export function formatAuditTimestamp(
  value: string | null | undefined,
  fallback = "—",
): string {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleString();
}

/** Short `actorType:actorId` label, truncating long opaque ids for display. */
export function formatAuditActor(
  entry: Pick<PublicAuditEntry, "actorType" | "actorId">,
  maxIdChars = 12,
): string {
  const id =
    entry.actorId.length > maxIdChars
      ? entry.actorId.slice(0, maxIdChars)
      : entry.actorId;
  return `${entry.actorType}:${id}`;
}

/** Accumulated state for the cursor-paginated audit list. */
export interface AuditLogState {
  entries: ReadonlyArray<PublicAuditEntry>;
  /** Opaque continuation cursor; null when the last page has been reached. */
  cursor: string | null;
}

export const EMPTY_AUDIT_LOG: AuditLogState = {
  entries: [],
  cursor: null,
};

/**
 * Fold a freshly-fetched page into the accumulated state.
 *
 * `reset` distinguishes the initial / refreshed load (replace the list) from a
 * "Load more" append (concatenate). De-duplication by entry id guards against
 * a boundary entry appearing on two adjacent pages — append is idempotent on id.
 */
export function appendAuditPage(
  prev: AuditLogState,
  page: {
    entries: ReadonlyArray<PublicAuditEntry>;
    cursor: string | null;
  },
  reset = false,
): AuditLogState {
  if (reset) {
    return { entries: page.entries.slice(), cursor: page.cursor };
  }
  const seen = new Set(prev.entries.map((e) => e.id));
  const merged = prev.entries.slice();
  for (const e of page.entries) {
    if (!seen.has(e.id)) {
      seen.add(e.id);
      merged.push(e);
    }
  }
  return { entries: merged, cursor: page.cursor };
}

/** Whether a "Load more" affordance should be shown. */
export function hasMoreAudit(state: AuditLogState): boolean {
  return state.cursor !== null;
}

/**
 * Serialize a set of audit entries to an NDJSON string (one JSON document per
 * line, trailing newline). Mirrors the SDK's `exportAuditEntriesNdjson` line
 * shape exactly so a Console download and a CLI export are byte-identical for
 * the same entries. Used by the in-browser "Export NDJSON" Blob download.
 */
export function auditEntriesToNdjson(
  entries: ReadonlyArray<PublicAuditEntry>,
): string {
  if (entries.length === 0) return "";
  return entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
}
