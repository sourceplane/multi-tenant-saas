import {
  createIdentityRepository,
} from "@saas/db/identity";
import type { SqlExecutor, SqlExecutorResult, SqlRow } from "@saas/db/hyperdrive";

type QueryRecord = { text: string; params: unknown[] };

function createFakeExecutor(options?: {
  rows?: Record<string, unknown>[];
  error?: unknown;
  rowCount?: number;
}): { executor: SqlExecutor; queries: QueryRecord[] } {
  const queries: QueryRecord[] = [];
  const executor: SqlExecutor = {
    async execute<T extends SqlRow = SqlRow>(
      text: string,
      params?: unknown[],
    ): Promise<SqlExecutorResult<T>> {
      queries.push({ text, params: params ?? [] });
      if (options?.error) {
        throw options.error;
      }
      const rows = (options?.rows ?? []) as unknown as T[];
      return { rows, rowCount: options?.rowCount ?? rows.length };
    },
  };
  return { executor, queries };
}

const NOW = new Date("2026-01-15T10:00:00Z");
const FUTURE = new Date("2099-01-15T11:00:00Z");
const PAST = new Date("2020-01-15T09:00:00Z");

const SAMPLE_USER_ROW = {
  id: "u-001",
  email: "Test@Example.com",
  email_lower: "test@example.com",
  display_name: "Test User",
  status: "active",
  created_at: NOW.toISOString(),
  updated_at: NOW.toISOString(),
};

const SAMPLE_AUTH_IDENTITY_ROW = {
  id: "ai-001",
  user_id: "u-001",
  provider: "email",
  subject: "test@example.com",
  metadata: {},
  created_at: NOW.toISOString(),
  updated_at: NOW.toISOString(),
};

const SAMPLE_CHALLENGE_ROW = {
  id: "ch-001",
  user_id: "u-001",
  method: "email_code",
  code_hash: "sha256-hashed-code",
  expires_at: FUTURE.toISOString(),
  consumed_at: null,
  created_at: NOW.toISOString(),
};

const SAMPLE_SESSION_ROW = {
  id: "sess-001",
  user_id: "u-001",
  token_hash: "sha256-hashed-token",
  expires_at: FUTURE.toISOString(),
  revoked_at: null,
  created_at: NOW.toISOString(),
  last_seen_at: NOW.toISOString(),
};

describe("IdentityRepository", () => {
  describe("createUser", () => {
    it("uses parameterized query for user creation", async () => {
      const { executor, queries } = createFakeExecutor({ rows: [SAMPLE_USER_ROW] });
      const repo = createIdentityRepository(executor);

      await repo.createUser({
        id: "u-001",
        email: "Test@Example.com",
        emailLower: "test@example.com",
        displayName: "Test User",
        createdAt: NOW,
      });

      expect(queries).toHaveLength(1);
      expect(queries[0]!.text).toContain("$1");
      expect(queries[0]!.text).toContain("$2");
      expect(queries[0]!.text).toContain("$3");
      expect(queries[0]!.params).toEqual([
        "u-001",
        "Test@Example.com",
        "test@example.com",
        "Test User",
        NOW.toISOString(),
      ]);
    });

    it("maps returned row to User type", async () => {
      const { executor } = createFakeExecutor({ rows: [SAMPLE_USER_ROW] });
      const repo = createIdentityRepository(executor);

      const result = await repo.createUser({
        id: "u-001",
        email: "Test@Example.com",
        emailLower: "test@example.com",
        createdAt: NOW,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe("u-001");
        expect(result.value.email).toBe("Test@Example.com");
        expect(result.value.emailLower).toBe("test@example.com");
        expect(result.value.status).toBe("active");
        expect(result.value.createdAt).toEqual(NOW);
      }
    });

    it("returns conflict on duplicate user", async () => {
      const { executor } = createFakeExecutor({ rows: [], rowCount: 0 });
      const repo = createIdentityRepository(executor);

      const result = await repo.createUser({
        id: "u-001",
        email: "Test@Example.com",
        emailLower: "test@example.com",
        createdAt: NOW,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("conflict");
      }
    });

    it("returns conflict on unique violation error code", async () => {
      const { executor } = createFakeExecutor({
        error: Object.assign(new Error("unique_violation"), { code: "23505" }),
      });
      const repo = createIdentityRepository(executor);

      const result = await repo.createUser({
        id: "u-001",
        email: "Test@Example.com",
        emailLower: "test@example.com",
        createdAt: NOW,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("conflict");
      }
    });

    it("maps generic errors to safe internal error", async () => {
      const { executor } = createFakeExecutor({
        error: new Error("connection to host 10.0.0.1:5432 refused"),
      });
      const repo = createIdentityRepository(executor);

      const result = await repo.createUser({
        id: "u-001",
        email: "a@b.com",
        emailLower: "a@b.com",
        createdAt: NOW,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("internal");
        expect((result.error as { kind: "internal"; message: string }).message).not.toContain("10.0.0.1");
        expect((result.error as { kind: "internal"; message: string }).message).not.toContain("5432");
      }
    });
  });

  describe("getUserById", () => {
    it("uses parameterized query for lookup", async () => {
      const { executor, queries } = createFakeExecutor({ rows: [SAMPLE_USER_ROW] });
      const repo = createIdentityRepository(executor);

      await repo.getUserById("u-001");

      expect(queries[0]!.params).toEqual(["u-001"]);
      expect(queries[0]!.text).toContain("$1");
    });

    it("returns not_found when no rows", async () => {
      const { executor } = createFakeExecutor({ rows: [] });
      const repo = createIdentityRepository(executor);

      const result = await repo.getUserById("u-missing");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("not_found");
    });
  });

  describe("getUserByEmail", () => {
    it("uses normalized email in parameterized query", async () => {
      const { executor, queries } = createFakeExecutor({ rows: [SAMPLE_USER_ROW] });
      const repo = createIdentityRepository(executor);

      await repo.getUserByEmail("test@example.com");

      expect(queries[0]!.params).toEqual(["test@example.com"]);
      expect(queries[0]!.text).toContain("email_lower");
    });

    it("returns not_found for unknown email", async () => {
      const { executor } = createFakeExecutor({ rows: [] });
      const repo = createIdentityRepository(executor);

      const result = await repo.getUserByEmail("unknown@example.com");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("not_found");
    });
  });

  describe("createAuthIdentity", () => {
    it("uses parameterized query", async () => {
      const { executor, queries } = createFakeExecutor({ rows: [SAMPLE_AUTH_IDENTITY_ROW] });
      const repo = createIdentityRepository(executor);

      await repo.createAuthIdentity({
        id: "ai-001",
        userId: "u-001",
        provider: "email",
        subject: "test@example.com",
        createdAt: NOW,
      });

      expect(queries[0]!.text).toContain("$1");
      expect(queries[0]!.params[2]).toBe("email");
      expect(queries[0]!.params[3]).toBe("test@example.com");
    });

    it("returns conflict on duplicate provider+subject", async () => {
      const { executor } = createFakeExecutor({
        error: Object.assign(new Error("unique_violation"), { code: "23505" }),
      });
      const repo = createIdentityRepository(executor);

      const result = await repo.createAuthIdentity({
        id: "ai-002",
        userId: "u-001",
        provider: "email",
        subject: "test@example.com",
        createdAt: NOW,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("conflict");
    });
  });

  describe("getAuthIdentityByProviderSubject", () => {
    it("uses parameterized query with provider and subject", async () => {
      const { executor, queries } = createFakeExecutor({ rows: [SAMPLE_AUTH_IDENTITY_ROW] });
      const repo = createIdentityRepository(executor);

      await repo.getAuthIdentityByProviderSubject("email", "test@example.com");

      expect(queries[0]!.params).toEqual(["email", "test@example.com"]);
    });

    it("returns not_found for unknown provider+subject", async () => {
      const { executor } = createFakeExecutor({ rows: [] });
      const repo = createIdentityRepository(executor);

      const result = await repo.getAuthIdentityByProviderSubject("oauth", "unknown");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("not_found");
    });
  });

  describe("createLoginChallenge", () => {
    it("stores hashed code via parameterized query", async () => {
      const { executor, queries } = createFakeExecutor({ rows: [SAMPLE_CHALLENGE_ROW] });
      const repo = createIdentityRepository(executor);

      await repo.createLoginChallenge({
        id: "ch-001",
        userId: "u-001",
        method: "email_code",
        codeHash: "sha256-hashed-code",
        expiresAt: FUTURE,
        createdAt: NOW,
      });

      expect(queries[0]!.params[3]).toBe("sha256-hashed-code");
      expect(queries[0]!.text).toContain("$4");
    });
  });

  describe("getLoginChallengeById", () => {
    it("returns challenge for valid unconsumed challenge", async () => {
      const { executor } = createFakeExecutor({ rows: [SAMPLE_CHALLENGE_ROW] });
      const repo = createIdentityRepository(executor);

      const result = await repo.getLoginChallengeById("ch-001");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe("ch-001");
        expect(result.value.codeHash).toBe("sha256-hashed-code");
      }
    });

    it("returns already_consumed for consumed challenge", async () => {
      const { executor } = createFakeExecutor({
        rows: [{ ...SAMPLE_CHALLENGE_ROW, consumed_at: NOW.toISOString() }],
      });
      const repo = createIdentityRepository(executor);

      const result = await repo.getLoginChallengeById("ch-001");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("already_consumed");
    });

    it("returns expired for expired challenge", async () => {
      const { executor } = createFakeExecutor({
        rows: [{ ...SAMPLE_CHALLENGE_ROW, expires_at: PAST.toISOString() }],
      });
      const repo = createIdentityRepository(executor);

      const result = await repo.getLoginChallengeById("ch-001");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("expired");
    });

    it("returns not_found for missing challenge", async () => {
      const { executor } = createFakeExecutor({ rows: [] });
      const repo = createIdentityRepository(executor);

      const result = await repo.getLoginChallengeById("ch-missing");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("not_found");
    });
  });

  describe("consumeLoginChallenge", () => {
    it("uses parameterized update with consumed_at IS NULL guard", async () => {
      const { executor, queries } = createFakeExecutor({
        rows: [{ ...SAMPLE_CHALLENGE_ROW, consumed_at: NOW.toISOString() }],
      });
      const repo = createIdentityRepository(executor);

      await repo.consumeLoginChallenge("ch-001", NOW);

      expect(queries[0]!.text).toContain("consumed_at IS NULL");
      expect(queries[0]!.params).toEqual(["ch-001", NOW.toISOString()]);
    });

    it("returns already_consumed when no rows affected", async () => {
      const { executor } = createFakeExecutor({ rows: [], rowCount: 0 });
      const repo = createIdentityRepository(executor);

      const result = await repo.consumeLoginChallenge("ch-001", NOW);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("already_consumed");
    });
  });

  describe("createSession", () => {
    it("stores hashed token via parameterized query", async () => {
      const { executor, queries } = createFakeExecutor({ rows: [SAMPLE_SESSION_ROW] });
      const repo = createIdentityRepository(executor);

      await repo.createSession({
        id: "sess-001",
        userId: "u-001",
        tokenHash: "sha256-hashed-token",
        expiresAt: FUTURE,
        createdAt: NOW,
      });

      expect(queries[0]!.params[2]).toBe("sha256-hashed-token");
      expect(queries[0]!.text).toContain("$3");
    });

    it("returns conflict on duplicate token hash", async () => {
      const { executor } = createFakeExecutor({
        error: Object.assign(new Error("unique_violation"), { code: "23505" }),
      });
      const repo = createIdentityRepository(executor);

      const result = await repo.createSession({
        id: "sess-002",
        userId: "u-001",
        tokenHash: "sha256-hashed-token",
        expiresAt: FUTURE,
        createdAt: NOW,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("conflict");
    });
  });

  describe("getSessionByTokenHash", () => {
    it("uses parameterized query with token hash", async () => {
      const { executor, queries } = createFakeExecutor({ rows: [SAMPLE_SESSION_ROW] });
      const repo = createIdentityRepository(executor);

      await repo.getSessionByTokenHash("sha256-hashed-token");

      expect(queries[0]!.params).toEqual(["sha256-hashed-token"]);
      expect(queries[0]!.text).toContain("revoked_at IS NULL");
    });

    it("returns not_found for unknown token hash", async () => {
      const { executor } = createFakeExecutor({ rows: [] });
      const repo = createIdentityRepository(executor);

      const result = await repo.getSessionByTokenHash("unknown-hash");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("not_found");
    });

    it("returns expired for expired session", async () => {
      const { executor } = createFakeExecutor({
        rows: [{ ...SAMPLE_SESSION_ROW, expires_at: PAST.toISOString() }],
      });
      const repo = createIdentityRepository(executor);

      const result = await repo.getSessionByTokenHash("sha256-hashed-token");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("expired");
    });
  });

  describe("revokeSession", () => {
    it("uses parameterized update with revoked_at IS NULL guard", async () => {
      const { executor, queries } = createFakeExecutor({
        rows: [{ ...SAMPLE_SESSION_ROW, revoked_at: NOW.toISOString() }],
      });
      const repo = createIdentityRepository(executor);

      await repo.revokeSession("sess-001", NOW);

      expect(queries[0]!.text).toContain("revoked_at IS NULL");
      expect(queries[0]!.params).toEqual(["sess-001", NOW.toISOString()]);
    });

    it("returns not_found when session already revoked", async () => {
      const { executor } = createFakeExecutor({ rows: [], rowCount: 0 });
      const repo = createIdentityRepository(executor);

      const result = await repo.revokeSession("sess-001", NOW);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("not_found");
    });
  });

  describe("safe error handling", () => {
    it("never exposes raw SQL errors in repository outputs", async () => {
      const pgError = new Error(
        'relation "identity.users" does not exist at character 15',
      );
      const { executor } = createFakeExecutor({ error: pgError });
      const repo = createIdentityRepository(executor);

      const result = await repo.getUserById("u-001");

      expect(result.ok).toBe(false);
      if (!result.ok && result.error.kind === "internal") {
        expect(result.error.message).not.toContain("relation");
        expect(result.error.message).not.toContain("character 15");
      }
    });

    it("never exposes connection strings in errors", async () => {
      const connError = new Error(
        "could not connect to postgres://admin:secret@db.internal:5432/prod",
      );
      const { executor } = createFakeExecutor({ error: connError });
      const repo = createIdentityRepository(executor);

      const result = await repo.createUser({
        id: "u-001",
        email: "a@b.com",
        emailLower: "a@b.com",
        createdAt: NOW,
      });

      expect(result.ok).toBe(false);
      if (!result.ok && result.error.kind === "internal") {
        expect(result.error.message).not.toContain("admin");
        expect(result.error.message).not.toContain("secret");
        expect(result.error.message).not.toContain("db.internal");
      }
    });

    it("never exposes token hashes in error outputs", async () => {
      const { executor } = createFakeExecutor({
        error: new Error("duplicate key value (token_hash)=(abc123secret)"),
      });
      const repo = createIdentityRepository(executor);

      const result = await repo.createSession({
        id: "sess-001",
        userId: "u-001",
        tokenHash: "abc123secret",
        expiresAt: FUTURE,
        createdAt: NOW,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const serialized = JSON.stringify(result.error);
        expect(serialized).not.toContain("abc123secret");
      }
    });
  });

  describe("Worker-safe import isolation", () => {
    it("does not import runner-only modules", async () => {
      const mod = await import("@saas/db/identity");
      const exportKeys = Object.keys(mod);

      expect(exportKeys).toContain("createIdentityRepository");
      expect(exportKeys).not.toContain("runMigrations");
      expect(exportKeys).not.toContain("PgAdapter");
      expect(exportKeys).not.toContain("loadSecret");
      expect(exportKeys).not.toContain("SupabaseApiAdapter");
    });
  });
});
