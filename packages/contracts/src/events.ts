/**
 * Event envelope and audit contract types.
 *
 * These types match the durable event-envelope schema defined in
 * specs/contracts/event-envelope.schema.yaml. They are transport-safe,
 * package-safe, and contain no platform clients or database row types.
 */

// ---------------------------------------------------------------------------
// Actor
// ---------------------------------------------------------------------------

export type EventActorType = "user" | "service_principal" | "workflow" | "system";

export interface EventActor {
  type: EventActorType;
  id: string;
  sessionId?: string | null;
  ip?: string | null;
}

// ---------------------------------------------------------------------------
// Tenant
// ---------------------------------------------------------------------------

export interface EventTenant {
  orgId: string;
  projectId?: string | null;
  environmentId?: string | null;
}

// ---------------------------------------------------------------------------
// Subject
// ---------------------------------------------------------------------------

export interface EventSubject {
  kind: string;
  id: string;
  name?: string | null;
}

// ---------------------------------------------------------------------------
// Trace
// ---------------------------------------------------------------------------

export interface EventTrace {
  requestId: string;
  correlationId?: string | null;
  causationId?: string | null;
  idempotencyKey?: string | null;
}

// ---------------------------------------------------------------------------
// Audit metadata
// ---------------------------------------------------------------------------

export interface EventAuditMeta {
  redact?: string[];
}

// ---------------------------------------------------------------------------
// Event Envelope
// ---------------------------------------------------------------------------

export interface EventEnvelope {
  id: string;
  type: string;
  version: number;
  source: string;
  occurredAt: string;
  actor: EventActor;
  tenant: EventTenant;
  subject: EventSubject;
  trace: EventTrace;
  payload: Record<string, unknown>;
  audit?: EventAuditMeta;
}

// ---------------------------------------------------------------------------
// Audit Entry (immutable projection for querying)
// ---------------------------------------------------------------------------

export interface AuditEntry {
  id: string;
  eventId: string;
  orgId: string;
  projectId: string | null;
  environmentId: string | null;
  actorType: EventActorType;
  actorId: string;
  eventType: string;
  eventVersion: number;
  source: string;
  subjectKind: string;
  subjectId: string;
  subjectName: string | null;
  category: string;
  description: string;
  occurredAt: string;
  requestId: string;
  correlationId: string | null;
  payload: Record<string, unknown>;
  redactPaths: string[];
}

// ---------------------------------------------------------------------------
// Audit Query Filters
// ---------------------------------------------------------------------------

export interface AuditQueryByOrg {
  orgId: string;
  category?: string;
  limit: number;
  cursor?: string | null;
}

export interface AuditQueryByTarget {
  orgId: string;
  subjectKind: string;
  subjectId: string;
  limit: number;
  cursor?: string | null;
}
