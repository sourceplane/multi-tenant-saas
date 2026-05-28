// Auth contract types for the identity-worker API surface.

export interface LoginStartRequest {
  email: string;
}

export interface LoginCompleteRequest {
  challengeId: string;
  code: string;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface LoginStartResponse {
  challengeId: string;
  expiresAt: string;
  delivery: {
    mode: "local_debug" | "email";
    emailHint: string;
    code?: string;
  };
}

export interface LoginCompleteResponse {
  token: string;
  tokenType: "bearer";
  expiresAt: string;
  user: AuthUser;
}

export interface SessionResponse {
  session: {
    id: string;
    expiresAt: string;
    createdAt: string;
  };
  user: AuthUser;
}

export interface LogoutResponse {
  success: true;
}

// Actor context returned by bearer resolution.
// Backward-compatible: user-session flows return actorType "user";
// API-key flows return actorType "service_principal".
export interface ActorContext {
  actorType: "user" | "service_principal";
  actorId: string;
  orgId?: string;
  projectId?: string | null;
  displayName?: string | null;
  email?: string | null;
}

// Extended session response with optional actor context.
// When `actor` is absent, the caller should infer actorType "user"
// from the existing `user` field for backward compatibility.
export interface BearerResolutionResponse {
  actor: ActorContext;
  session?: {
    id: string;
    expiresAt: string;
    createdAt: string;
  };
  user?: AuthUser;
}

export interface ApiSuccessEnvelope<T> {
  data: T;
  meta: {
    requestId: string;
    cursor: string | null;
  };
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
  };
}
