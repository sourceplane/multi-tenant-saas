import type {
  IdentityRepository,
  IdentityResult,
  User,
  AuthIdentity,
  LoginChallenge,
  Session,
  CreateUserInput,
  CreateAuthIdentityInput,
  CreateLoginChallengeInput,
  CreateSessionInput,
} from "@saas/db/identity";

interface StoredChallenge extends LoginChallenge {
  codeHash: string;
}

interface StoredSession extends Session {
  tokenHash: string;
}

export function createFakeRepository(): IdentityRepository & {
  _users: Map<string, User>;
  _authIdentities: Map<string, AuthIdentity>;
  _challenges: Map<string, StoredChallenge>;
  _sessions: Map<string, StoredSession>;
} {
  const users = new Map<string, User>();
  const authIdentities = new Map<string, AuthIdentity>();
  const challenges = new Map<string, StoredChallenge>();
  const sessions = new Map<string, StoredSession>();

  const repo: IdentityRepository & {
    _users: Map<string, User>;
    _authIdentities: Map<string, AuthIdentity>;
    _challenges: Map<string, StoredChallenge>;
    _sessions: Map<string, StoredSession>;
  } = {
    _users: users,
    _authIdentities: authIdentities,
    _challenges: challenges,
    _sessions: sessions,

    async createUser(input: CreateUserInput): Promise<IdentityResult<User>> {
      if (users.has(input.id)) {
        return { ok: false, error: { kind: "conflict", entity: "user" } };
      }
      for (const u of users.values()) {
        if (u.emailLower === input.emailLower) {
          return { ok: false, error: { kind: "conflict", entity: "user" } };
        }
      }
      const user: User = {
        id: input.id,
        email: input.email,
        emailLower: input.emailLower,
        displayName: input.displayName ?? null,
        status: "active",
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
      };
      users.set(input.id, user);
      return { ok: true, value: user };
    },

    async getUserById(id: string): Promise<IdentityResult<User>> {
      const user = users.get(id);
      if (!user) return { ok: false, error: { kind: "not_found" } };
      return { ok: true, value: user };
    },

    async getUserByEmail(emailLower: string): Promise<IdentityResult<User>> {
      for (const u of users.values()) {
        if (u.emailLower === emailLower) return { ok: true, value: u };
      }
      return { ok: false, error: { kind: "not_found" } };
    },

    async createAuthIdentity(input: CreateAuthIdentityInput): Promise<IdentityResult<AuthIdentity>> {
      const identity: AuthIdentity = {
        id: input.id,
        userId: input.userId,
        provider: input.provider,
        subject: input.subject,
        metadata: input.metadata ?? {},
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
      };
      authIdentities.set(input.id, identity);
      return { ok: true, value: identity };
    },

    async getAuthIdentityByProviderSubject(provider: string, subject: string): Promise<IdentityResult<AuthIdentity>> {
      for (const ai of authIdentities.values()) {
        if (ai.provider === provider && ai.subject === subject) {
          return { ok: true, value: ai };
        }
      }
      return { ok: false, error: { kind: "not_found" } };
    },

    async createLoginChallenge(input: CreateLoginChallengeInput): Promise<IdentityResult<LoginChallenge>> {
      const challenge: StoredChallenge = {
        id: input.id,
        userId: input.userId,
        method: input.method,
        expiresAt: input.expiresAt,
        consumedAt: null,
        createdAt: input.createdAt,
        codeHash: input.codeHash,
      };
      challenges.set(input.id, challenge);
      return { ok: true, value: challenge };
    },

    async getLoginChallengeById(id: string): Promise<IdentityResult<LoginChallenge>> {
      const c = challenges.get(id);
      if (!c) return { ok: false, error: { kind: "not_found" } };
      return { ok: true, value: c };
    },

    async consumeLoginChallenge(id: string, codeHash: string, consumedAt: Date): Promise<IdentityResult<LoginChallenge>> {
      const c = challenges.get(id);
      if (!c) return { ok: false, error: { kind: "not_found" } };
      if (c.consumedAt !== null) return { ok: false, error: { kind: "already_consumed" } };
      if (c.expiresAt.getTime() <= consumedAt.getTime()) return { ok: false, error: { kind: "expired" } };
      if (c.codeHash !== codeHash) return { ok: false, error: { kind: "not_found" } };
      c.consumedAt = consumedAt;
      return { ok: true, value: c };
    },

    async createSession(input: CreateSessionInput): Promise<IdentityResult<Session>> {
      const session: StoredSession = {
        id: input.id,
        userId: input.userId,
        expiresAt: input.expiresAt,
        revokedAt: null,
        createdAt: input.createdAt,
        lastSeenAt: input.createdAt,
        tokenHash: input.tokenHash,
      };
      sessions.set(input.id, session);
      return { ok: true, value: session };
    },

    async getSessionByTokenHash(tokenHash: string): Promise<IdentityResult<Session>> {
      for (const s of sessions.values()) {
        if (s.tokenHash === tokenHash) return { ok: true, value: s };
      }
      return { ok: false, error: { kind: "not_found" } };
    },

    async revokeSession(id: string, revokedAt: Date): Promise<IdentityResult<Session>> {
      const s = sessions.get(id);
      if (!s) return { ok: false, error: { kind: "not_found" } };
      s.revokedAt = revokedAt;
      return { ok: true, value: s };
    },
  };

  return repo;
}
