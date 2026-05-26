export type { SqlExecutor, SqlExecutorResult, SqlRow } from "../hyperdrive/executor.js";

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export type EventsRepositoryError =
  | { kind: "conflict"; entity: string }
  | { kind: "internal"; message: string };

export type EventsResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: EventsRepositoryError };

// ---------------------------------------------------------------------------
// Domain entities (mapped from DB rows)
// ---------------------------------------------------------------------------

export interface StoredEvent {
  id: string;
  type: string;
  version: number;
  source: string;
  occurredAt: Date;
  actorType: string;
  actorId: string;
  actorSessionId: string | null;
  actorIp: string | null;
  orgId: string;
  projectId: string | null;
  environmentId: string | null;
  subjectKind: string;
  subjectId: string;
  subjectName: string | null;
  requestId: string;
  correlationId: string | null;
  causationId: string | null;
  idempotencyKey: string | null;
  payload: Record<string, unknown>;
  redactPaths: string[];
  createdAt: Date;
}

export interface StoredAuditEntry {
  id: string;
  eventId: string;
  orgId: string;
  projectId: string | null;
  environmentId: string | null;
  actorType: string;
  actorId: string;
  eventType: string;
  eventVersion: number;
  source: string;
  subjectKind: string;
  subjectId: string;
  subjectName: string | null;
  category: string;
  description: string;
  occurredAt: Date;
  requestId: string;
  correlationId: string | null;
  payload: Record<string, unknown>;
  redactPaths: string[];
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface AppendEventInput {
  id: string;
  type: string;
  version: number;
  source: string;
  occurredAt: Date;
  actorType: string;
  actorId: string;
  actorSessionId?: string | null;
  actorIp?: string | null;
  orgId: string;
  projectId?: string | null;
  environmentId?: string | null;
  subjectKind: string;
  subjectId: string;
  subjectName?: string | null;
  requestId: string;
  correlationId?: string | null;
  causationId?: string | null;
  idempotencyKey?: string | null;
  payload: Record<string, unknown>;
  redactPaths?: string[];
}

export interface AppendAuditInput {
  id: string;
  eventId: string;
  orgId: string;
  projectId?: string | null;
  environmentId?: string | null;
  actorType: string;
  actorId: string;
  eventType: string;
  eventVersion: number;
  source: string;
  subjectKind: string;
  subjectId: string;
  subjectName?: string | null;
  category?: string;
  description?: string;
  occurredAt: Date;
  requestId: string;
  correlationId?: string | null;
  payload: Record<string, unknown>;
  redactPaths?: string[];
}

export interface AppendEventWithAuditInput {
  event: AppendEventInput;
  audit: Omit<AppendAuditInput, "eventId" | "orgId" | "actorType" | "actorId" | "eventType" | "eventVersion" | "source" | "subjectKind" | "subjectId" | "subjectName" | "occurredAt" | "requestId" | "correlationId" | "payload" | "redactPaths"> & {
    id: string;
    category?: string;
    description?: string;
    projectId?: string | null;
    environmentId?: string | null;
  };
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface EventsCursorPosition {
  occurredAt: string;
  id: string;
}

export interface EventsPageQueryParams {
  limit: number;
  cursor: EventsCursorPosition | null;
}

export interface EventsPagedResult<T> {
  items: T[];
  nextCursor: EventsCursorPosition | null;
}

// ---------------------------------------------------------------------------
// Repository interface
// ---------------------------------------------------------------------------

export interface EventsRepository {
  appendEvent(input: AppendEventInput): Promise<EventsResult<StoredEvent>>;
  appendEventWithAudit(input: AppendEventWithAuditInput): Promise<EventsResult<{ event: StoredEvent; audit: StoredAuditEntry }>>;
  queryAuditByOrg(orgId: string, params: EventsPageQueryParams, category?: string): Promise<EventsResult<EventsPagedResult<StoredAuditEntry>>>;
  queryAuditByTarget(orgId: string, subjectKind: string, subjectId: string, params: EventsPageQueryParams): Promise<EventsResult<EventsPagedResult<StoredAuditEntry>>>;
}
