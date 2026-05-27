import type { IdentityRepository, IdentityResult, User } from "@saas/db/identity";
import { hashSha256 } from "../crypto.js";
import {
  generateUserId,
  generateSessionId,
  generateChallengeId,
  generateAuthIdentityId,
  generateSecurityEventId,
  generateCode,
  generateTokenSecret,
  buildSessionToken,
  parseSessionToken,
  userPublicId,
  sessionPublicId,
  challengePublicId,
  parseChallengePublicId,
} from "../ids.js";

export interface RequestContext {
  requestId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface AuthServiceDeps {
  repo: IdentityRepository;
  now: () => Date;
  ctx?: RequestContext;
}

export interface StartLoginResult {
  challengeId: string;
  expiresAt: Date;
  emailHint: string;
  rawCode: string;
}

export interface StartLoginError {
  error: "internal_error";
  message: string;
}

export interface CompleteLoginResult {
  token: string;
  expiresAt: Date;
  user: { id: string; email: string; displayName: string | null };
}

export interface CompleteLoginError {
  error: "not_found" | "precondition_failed" | "internal_error";
  message: string;
}

export interface GetSessionResult {
  session: { id: string; expiresAt: Date; createdAt: Date };
  user: { id: string; email: string; displayName: string | null };
}

export interface GetSessionError {
  error: "unauthenticated";
  message: string;
}

export interface LogoutError {
  error: "unauthenticated" | "internal_error";
  message: string;
}

const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function emailHint(email: string): string {
  const at = email.indexOf("@");
  if (at < 1) return "***@***";
  return `${email[0]}***@${email.slice(at + 1)}`;
}

export function createAuthService(deps: AuthServiceDeps) {
  const { repo, now, ctx } = deps;

  function eventBase() {
    return {
      id: generateSecurityEventId(),
      requestId: ctx?.requestId ?? null,
      ip: ctx?.ip ?? null,
      userAgent: ctx?.userAgent ?? null,
      occurredAt: now(),
    };
  }

  async function resolveOrCreateUser(email: string, emailLower: string): Promise<IdentityResult<User>> {
    const existing = await repo.getUserByEmail(emailLower);
    if (existing.ok) return existing;

    const userId = generateUserId();
    const createResult = await repo.createUser({
      id: userId,
      email,
      emailLower,
      createdAt: now(),
    });

    if (!createResult.ok && createResult.error.kind === "conflict") {
      return repo.getUserByEmail(emailLower);
    }

    if (createResult.ok) {
      await repo.createAuthIdentity({
        id: generateAuthIdentityId(),
        userId,
        provider: "email",
        subject: emailLower,
        createdAt: now(),
      });
    }

    return createResult;
  }

  return {
    async startLogin(email: string): Promise<StartLoginResult | StartLoginError> {
      const emailLower = email.trim().toLowerCase();
      const userResult = await resolveOrCreateUser(email.trim(), emailLower);
      if (!userResult.ok) {
        return { error: "internal_error", message: "Failed to resolve user" };
      }

      const code = generateCode();
      const codeHash = await hashSha256(code);
      const challengeUuid = generateChallengeId();
      const currentTime = now();
      const expiresAt = new Date(currentTime.getTime() + CHALLENGE_TTL_MS);

      const challengeResult = await repo.createLoginChallenge({
        id: challengeUuid,
        userId: userResult.value.id,
        method: "email_code",
        codeHash,
        expiresAt,
        createdAt: currentTime,
      });

      if (!challengeResult.ok) {
        return { error: "internal_error", message: "Failed to create login challenge" };
      }

      const eventResult = await repo.recordSecurityEvent({
        ...eventBase(),
        eventType: "login.challenge.created",
        outcome: "success",
        userId: userResult.value.id,
        challengeId: challengeUuid,
        metadata: { method: "email_code" },
      });

      if (!eventResult.ok) {
        return { error: "internal_error", message: "Failed to record security event" };
      }

      return {
        challengeId: challengePublicId(challengeUuid),
        expiresAt,
        emailHint: emailHint(emailLower),
        rawCode: code,
      };
    },

    async completeLogin(challengeId: string, code: string): Promise<CompleteLoginResult | CompleteLoginError> {
      const challengeUuid = parseChallengePublicId(challengeId);
      if (!challengeUuid) {
        await repo.recordSecurityEvent({
          ...eventBase(),
          eventType: "login.complete.failed",
          outcome: "invalid_challenge_format",
          metadata: { method: "email_code" },
        });
        return { error: "not_found", message: "Challenge not found or code is invalid" };
      }

      const codeHash = await hashSha256(code);
      const consumeResult = await repo.consumeLoginChallenge(challengeUuid, codeHash, now());

      if (!consumeResult.ok) {
        const outcomeMap: Record<string, string> = {
          not_found: "invalid_code_or_challenge",
          expired: "expired_challenge",
          already_consumed: "already_consumed",
        };
        await repo.recordSecurityEvent({
          ...eventBase(),
          eventType: "login.complete.failed",
          outcome: outcomeMap[consumeResult.error.kind] ?? "internal_error",
          challengeId: challengeUuid,
          metadata: { method: "email_code" },
        });

        switch (consumeResult.error.kind) {
          case "not_found":
            return { error: "not_found", message: "Challenge not found or code is invalid" };
          case "expired":
            return { error: "precondition_failed", message: "Challenge has expired" };
          case "already_consumed":
            return { error: "precondition_failed", message: "Challenge has already been used" };
          default:
            return { error: "internal_error", message: "Failed to complete login" };
        }
      }

      const challenge = consumeResult.value;
      const userResult = await repo.getUserById(challenge.userId);
      if (!userResult.ok) {
        return { error: "internal_error", message: "Failed to resolve user" };
      }

      const sessionUuid = generateSessionId();
      const secret = generateTokenSecret();
      const tokenHash = await hashSha256(secret);
      const currentTime = now();
      const expiresAt = new Date(currentTime.getTime() + SESSION_TTL_MS);

      const sessionResult = await repo.createSession({
        id: sessionUuid,
        userId: challenge.userId,
        tokenHash,
        expiresAt,
        createdAt: currentTime,
      });

      if (!sessionResult.ok) {
        return { error: "internal_error", message: "Failed to create session" };
      }

      const eventResult = await repo.recordSecurityEvent({
        ...eventBase(),
        eventType: "session.created",
        outcome: "success",
        userId: challenge.userId,
        sessionId: sessionUuid,
        challengeId: challengeUuid,
        metadata: { method: "email_code" },
      });

      if (!eventResult.ok) {
        return { error: "internal_error", message: "Failed to record security event" };
      }

      const user = userResult.value;
      return {
        token: buildSessionToken(sessionUuid, secret),
        expiresAt,
        user: { id: userPublicId(user.id), email: user.email, displayName: user.displayName },
      };
    },

    async getSession(token: string): Promise<GetSessionResult | GetSessionError> {
      const parsed = parseSessionToken(token);
      if (!parsed) {
        return { error: "unauthenticated", message: "Invalid token format" };
      }

      const tokenHash = await hashSha256(parsed.secret);
      const sessionResult = await repo.getSessionByTokenHash(tokenHash);

      if (!sessionResult.ok) {
        return { error: "unauthenticated", message: "Session not found" };
      }

      const session = sessionResult.value;
      if (session.revokedAt !== null) {
        return { error: "unauthenticated", message: "Session has been revoked" };
      }
      if (session.expiresAt.getTime() <= now().getTime()) {
        return { error: "unauthenticated", message: "Session has expired" };
      }

      const userResult = await repo.getUserById(session.userId);
      if (!userResult.ok) {
        return { error: "unauthenticated", message: "User not found" };
      }

      const user = userResult.value;
      return {
        session: { id: sessionPublicId(session.id), expiresAt: session.expiresAt, createdAt: session.createdAt },
        user: { id: userPublicId(user.id), email: user.email, displayName: user.displayName },
      };
    },

    async logout(token: string): Promise<{ success: true } | LogoutError> {
      const parsed = parseSessionToken(token);
      if (!parsed) {
        return { error: "unauthenticated", message: "Invalid token format" };
      }

      const tokenHash = await hashSha256(parsed.secret);
      const sessionResult = await repo.getSessionByTokenHash(tokenHash);

      if (!sessionResult.ok) {
        return { error: "unauthenticated", message: "Session not found" };
      }

      const session = sessionResult.value;
      if (session.revokedAt === null) {
        await repo.revokeSession(session.id, now());

        const eventResult = await repo.recordSecurityEvent({
          ...eventBase(),
          eventType: "session.revoked",
          outcome: "success",
          userId: session.userId,
          sessionId: session.id,
          metadata: {},
        });

        if (!eventResult.ok) {
          return { error: "internal_error", message: "Failed to record security event" };
        }
      }

      return { success: true };
    },
  };
}
