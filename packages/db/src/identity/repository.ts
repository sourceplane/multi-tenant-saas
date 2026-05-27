import type { SqlExecutor } from "../hyperdrive/executor.js";
import type {
  AuthIdentity,
  CreateAuthIdentityInput,
  CreateLoginChallengeInput,
  CreateSecurityEventInput,
  CreateSessionInput,
  CreateUserInput,
  IdentityRepository,
  IdentityResult,
  LoginChallenge,
  SecurityEvent,
  SecurityEventPagedResult,
  SecurityEventPageQueryParams,
  Session,
  User,
} from "./types.js";

function mapUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    emailLower: row.email_lower as string,
    displayName: (row.display_name as string) ?? null,
    status: row.status as string,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

function mapAuthIdentity(row: Record<string, unknown>): AuthIdentity {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    provider: row.provider as string,
    subject: row.subject as string,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

function mapLoginChallenge(row: Record<string, unknown>): LoginChallenge {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    method: row.method as string,
    expiresAt: new Date(row.expires_at as string),
    consumedAt: row.consumed_at ? new Date(row.consumed_at as string) : null,
    createdAt: new Date(row.created_at as string),
  };
}

function mapSession(row: Record<string, unknown>): Session {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    expiresAt: new Date(row.expires_at as string),
    revokedAt: row.revoked_at ? new Date(row.revoked_at as string) : null,
    createdAt: new Date(row.created_at as string),
    lastSeenAt: new Date(row.last_seen_at as string),
  };
}

function mapSecurityEvent(row: Record<string, unknown>): SecurityEvent {
  return {
    id: row.id as string,
    eventType: row.event_type as string,
    outcome: row.outcome as string,
    userId: (row.user_id as string) ?? null,
    sessionId: (row.session_id as string) ?? null,
    challengeId: (row.challenge_id as string) ?? null,
    requestId: (row.request_id as string) ?? null,
    correlationId: (row.correlation_id as string) ?? null,
    ip: (row.ip as string) ?? null,
    userAgent: (row.user_agent as string) ?? null,
    occurredAt: new Date(row.occurred_at as string),
    createdAt: new Date(row.created_at as string),
    metadata: (typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata ?? {}) as Record<string, unknown>,
    redactPaths: (typeof row.redact_paths === "string" ? JSON.parse(row.redact_paths) : row.redact_paths ?? []) as string[],
  };
}

function safeError(message: string): IdentityResult<never> {
  return { ok: false, error: { kind: "internal", message } };
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}

export function createIdentityRepository(executor: SqlExecutor): IdentityRepository {
  return {
    async createUser(input: CreateUserInput): Promise<IdentityResult<User>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `INSERT INTO identity.users (id, email, email_lower, display_name, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $5)
           ON CONFLICT (id) DO NOTHING
           RETURNING *`,
          [input.id, input.email, input.emailLower, input.displayName ?? null, input.createdAt.toISOString()],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "conflict", entity: "user" } };
        }
        return { ok: true, value: mapUser(result.rows[0]!) };
      } catch (err: unknown) {
        if (isUniqueViolation(err)) {
          return { ok: false, error: { kind: "conflict", entity: "user" } };
        }
        return safeError("Failed to create user");
      }
    },

    async getUserById(id: string): Promise<IdentityResult<User>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT * FROM identity.users WHERE id = $1`,
          [id],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "not_found" } };
        }
        return { ok: true, value: mapUser(result.rows[0]!) };
      } catch {
        return safeError("Failed to get user");
      }
    },

    async getUserByEmail(emailLower: string): Promise<IdentityResult<User>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT * FROM identity.users WHERE email_lower = $1`,
          [emailLower],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "not_found" } };
        }
        return { ok: true, value: mapUser(result.rows[0]!) };
      } catch {
        return safeError("Failed to get user by email");
      }
    },

    async createAuthIdentity(input: CreateAuthIdentityInput): Promise<IdentityResult<AuthIdentity>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `INSERT INTO identity.auth_identities (id, user_id, provider, subject, metadata, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $6)
           ON CONFLICT (id) DO NOTHING
           RETURNING *`,
          [input.id, input.userId, input.provider, input.subject, JSON.stringify(input.metadata ?? {}), input.createdAt.toISOString()],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "conflict", entity: "auth_identity" } };
        }
        return { ok: true, value: mapAuthIdentity(result.rows[0]!) };
      } catch (err: unknown) {
        if (isUniqueViolation(err)) {
          return { ok: false, error: { kind: "conflict", entity: "auth_identity" } };
        }
        return safeError("Failed to create auth identity");
      }
    },

    async getAuthIdentityByProviderSubject(provider: string, subject: string): Promise<IdentityResult<AuthIdentity>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT * FROM identity.auth_identities WHERE provider = $1 AND subject = $2`,
          [provider, subject],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "not_found" } };
        }
        return { ok: true, value: mapAuthIdentity(result.rows[0]!) };
      } catch {
        return safeError("Failed to get auth identity");
      }
    },

    async createLoginChallenge(input: CreateLoginChallengeInput): Promise<IdentityResult<LoginChallenge>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `INSERT INTO identity.login_challenges (id, user_id, method, code_hash, expires_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING
           RETURNING *`,
          [input.id, input.userId, input.method, input.codeHash, input.expiresAt.toISOString(), input.createdAt.toISOString()],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "conflict", entity: "login_challenge" } };
        }
        return { ok: true, value: mapLoginChallenge(result.rows[0]!) };
      } catch (err: unknown) {
        if (isUniqueViolation(err)) {
          return { ok: false, error: { kind: "conflict", entity: "login_challenge" } };
        }
        return safeError("Failed to create login challenge");
      }
    },

    async getLoginChallengeById(id: string): Promise<IdentityResult<LoginChallenge>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT id, user_id, method, expires_at, consumed_at, created_at FROM identity.login_challenges WHERE id = $1`,
          [id],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "not_found" } };
        }
        const challenge = mapLoginChallenge(result.rows[0]!);
        if (challenge.consumedAt !== null) {
          return { ok: false, error: { kind: "already_consumed" } };
        }
        if (challenge.expiresAt < new Date()) {
          return { ok: false, error: { kind: "expired" } };
        }
        return { ok: true, value: challenge };
      } catch {
        return safeError("Failed to get login challenge");
      }
    },

    async consumeLoginChallenge(id: string, codeHash: string, consumedAt: Date): Promise<IdentityResult<LoginChallenge>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `UPDATE identity.login_challenges
           SET consumed_at = $3
           WHERE id = $1 AND code_hash = $2 AND consumed_at IS NULL
           RETURNING *`,
          [id, codeHash, consumedAt.toISOString()],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "already_consumed" } };
        }
        return { ok: true, value: mapLoginChallenge(result.rows[0]!) };
      } catch {
        return safeError("Failed to consume login challenge");
      }
    },

    async createSession(input: CreateSessionInput): Promise<IdentityResult<Session>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `INSERT INTO identity.sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at)
           VALUES ($1, $2, $3, $4, $5, $5)
           ON CONFLICT (id) DO NOTHING
           RETURNING *`,
          [input.id, input.userId, input.tokenHash, input.expiresAt.toISOString(), input.createdAt.toISOString()],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "conflict", entity: "session" } };
        }
        return { ok: true, value: mapSession(result.rows[0]!) };
      } catch (err: unknown) {
        if (isUniqueViolation(err)) {
          return { ok: false, error: { kind: "conflict", entity: "session" } };
        }
        return safeError("Failed to create session");
      }
    },

    async getSessionByTokenHash(tokenHash: string): Promise<IdentityResult<Session>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT id, user_id, expires_at, revoked_at, created_at, last_seen_at FROM identity.sessions WHERE token_hash = $1 AND revoked_at IS NULL`,
          [tokenHash],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "not_found" } };
        }
        const session = mapSession(result.rows[0]!);
        if (session.expiresAt < new Date()) {
          return { ok: false, error: { kind: "expired" } };
        }
        return { ok: true, value: session };
      } catch {
        return safeError("Failed to get session");
      }
    },

    async revokeSession(id: string, revokedAt: Date): Promise<IdentityResult<Session>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `UPDATE identity.sessions
           SET revoked_at = $2
           WHERE id = $1 AND revoked_at IS NULL
           RETURNING *`,
          [id, revokedAt.toISOString()],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "not_found" } };
        }
        return { ok: true, value: mapSession(result.rows[0]!) };
      } catch {
        return safeError("Failed to revoke session");
      }
    },

    async recordSecurityEvent(input: CreateSecurityEventInput): Promise<IdentityResult<SecurityEvent>> {
      try {
        const occurredAt = input.occurredAt ?? new Date();
        const result = await executor.execute<Record<string, unknown>>(
          `INSERT INTO identity.security_events (id, event_type, outcome, user_id, session_id, challenge_id, request_id, correlation_id, ip, user_agent, occurred_at, metadata, redact_paths)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           RETURNING *`,
          [
            input.id,
            input.eventType,
            input.outcome,
            input.userId ?? null,
            input.sessionId ?? null,
            input.challengeId ?? null,
            input.requestId ?? null,
            input.correlationId ?? null,
            input.ip ?? null,
            input.userAgent ?? null,
            occurredAt.toISOString(),
            JSON.stringify(input.metadata ?? {}),
            JSON.stringify(input.redactPaths ?? []),
          ],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "conflict", entity: "security_event" } };
        }
        return { ok: true, value: mapSecurityEvent(result.rows[0]!) };
      } catch (err: unknown) {
        if (isUniqueViolation(err)) {
          return { ok: false, error: { kind: "conflict", entity: "security_event" } };
        }
        return safeError("Failed to record security event");
      }
    },

    async querySecurityEventsByUser(params: SecurityEventPageQueryParams): Promise<IdentityResult<SecurityEventPagedResult>> {
      try {
        const fetchLimit = params.limit + 1;
        let sql: string;
        let values: unknown[];

        if (params.cursor) {
          sql = `SELECT * FROM identity.security_events
           WHERE user_id = $1
             AND (occurred_at, id) < ($3, $4)
           ORDER BY occurred_at DESC, id DESC
           LIMIT $2`;
          values = [params.userId, fetchLimit, params.cursor.occurredAt, params.cursor.id];
        } else {
          sql = `SELECT * FROM identity.security_events
           WHERE user_id = $1
           ORDER BY occurred_at DESC, id DESC
           LIMIT $2`;
          values = [params.userId, fetchLimit];
        }

        const result = await executor.execute<Record<string, unknown>>(sql, values);
        const rows = result.rows.map(mapSecurityEvent);

        let nextCursor: import("./types.js").SecurityEventCursorPosition | null = null;
        if (rows.length > params.limit) {
          rows.pop();
          const last = rows[rows.length - 1]!;
          nextCursor = { occurredAt: last.occurredAt.toISOString(), id: last.id };
        }

        return { ok: true, value: { items: rows, nextCursor } };
      } catch {
        return safeError("Failed to query security events");
      }
    },
  };
}
