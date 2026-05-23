export type { SqlExecutor, SqlExecutorResult, SqlRow } from "../hyperdrive/executor.js";

export type IdentityRepositoryError =
  | { kind: "not_found" }
  | { kind: "conflict"; entity: string }
  | { kind: "expired" }
  | { kind: "already_consumed" }
  | { kind: "internal"; message: string };

export type IdentityResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: IdentityRepositoryError };

export interface User {
  id: string;
  email: string;
  emailLower: string;
  displayName: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthIdentity {
  id: string;
  userId: string;
  provider: string;
  subject: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginChallenge {
  id: string;
  userId: string;
  method: string;
  codeHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  lastSeenAt: Date;
}

export interface CreateUserInput {
  id: string;
  email: string;
  emailLower: string;
  displayName?: string | null;
  createdAt: Date;
}

export interface CreateAuthIdentityInput {
  id: string;
  userId: string;
  provider: string;
  subject: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface CreateLoginChallengeInput {
  id: string;
  userId: string;
  method: string;
  codeHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface CreateSessionInput {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface IdentityRepository {
  createUser(input: CreateUserInput): Promise<IdentityResult<User>>;
  getUserById(id: string): Promise<IdentityResult<User>>;
  getUserByEmail(emailLower: string): Promise<IdentityResult<User>>;

  createAuthIdentity(input: CreateAuthIdentityInput): Promise<IdentityResult<AuthIdentity>>;
  getAuthIdentityByProviderSubject(provider: string, subject: string): Promise<IdentityResult<AuthIdentity>>;

  createLoginChallenge(input: CreateLoginChallengeInput): Promise<IdentityResult<LoginChallenge>>;
  getLoginChallengeById(id: string): Promise<IdentityResult<LoginChallenge>>;
  consumeLoginChallenge(id: string, consumedAt: Date): Promise<IdentityResult<LoginChallenge>>;

  createSession(input: CreateSessionInput): Promise<IdentityResult<Session>>;
  getSessionByTokenHash(tokenHash: string): Promise<IdentityResult<Session>>;
  revokeSession(id: string, revokedAt: Date): Promise<IdentityResult<Session>>;
}
