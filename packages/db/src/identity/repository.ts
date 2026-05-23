import type { SqlExecutor } from "../hyperdrive/executor.js";
import type {
  AuthIdentity,
  CreateAuthIdentityInput,
  CreateLoginChallengeInput,
  CreateSessionInput,
  CreateUserInput,
  IdentityRepository,
  IdentityResult,
  LoginChallenge,
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
    codeHash: row.code_hash as string,
    expiresAt: new Date(row.expires_at as string),
    consumedAt: row.consumed_at ? new Date(row.consumed_at as string) : null,
    createdAt: new Date(row.created_at as string),
  };
}

function mapSession(row: Record<string, unknown>): Session {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    tokenHash: row.token_hash as string,
    expiresAt: new Date(row.expires_at as string),
    revokedAt: row.revoked_at ? new Date(row.revoked_at as string) : null,
    createdAt: new Date(row.created_at as string),
    lastSeenAt: new Date(row.last_seen_at as string),
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
          `SELECT * FROM identity.login_challenges WHERE id = $1`,
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

    async consumeLoginChallenge(id: string, consumedAt: Date): Promise<IdentityResult<LoginChallenge>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `UPDATE identity.login_challenges
           SET consumed_at = $2
           WHERE id = $1 AND consumed_at IS NULL
           RETURNING *`,
          [id, consumedAt.toISOString()],
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
          `SELECT * FROM identity.sessions WHERE token_hash = $1 AND revoked_at IS NULL`,
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
  };
}
