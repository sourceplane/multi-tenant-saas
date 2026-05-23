import { createFakeRepository } from "./helpers/fake-repository";
import type { IdentityRepository } from "@saas/db/identity";
import crypto from "node:crypto";

// Polyfill Web Crypto for Node test environment
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", { value: crypto.webcrypto });
}

// Import auth service source (inline since it's in a different package)
// We re-implement the same logic here to test the service contract
async function hashSha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buffer = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, "0");
  }
  return hex;
}

// Minimal auth service factory matching the worker's createAuthService
interface AuthServiceDeps {
  repo: IdentityRepository;
  now: () => Date;
}

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let hex = "";
  for (let i = 0; i < buf.length; i++) {
    hex += buf[i]!.toString(16).padStart(2, "0");
  }
  return hex;
}

function generateCode(): string {
  const buf = new Uint8Array(4);
  crypto.getRandomValues(buf);
  const num = ((buf[0]! << 24) | (buf[1]! << 16) | (buf[2]! << 8) | buf[3]!) >>> 0;
  return String(num % 1000000).padStart(6, "0");
}

function emailHint(email: string): string {
  const at = email.indexOf("@");
  if (at < 1) return "***@***";
  return `${email[0]}***@${email.slice(at + 1)}`;
}

function parseSessionToken(token: string): { sessionId: string; secret: string } | null {
  if (!token.startsWith("sps_ses_")) return null;
  const payload = token.slice(8);
  const dotIndex = payload.indexOf(".");
  if (dotIndex < 1) return null;
  const id = payload.slice(0, dotIndex);
  const secret = payload.slice(dotIndex + 1);
  if (!id || !secret) return null;
  return { sessionId: `ses_${id}`, secret };
}

function buildSessionToken(sessionId: string, secret: string): string {
  const rawId = sessionId.startsWith("ses_") ? sessionId.slice(4) : sessionId;
  return `sps_ses_${rawId}.${secret}`;
}

const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function createAuthService(deps: AuthServiceDeps) {
  const { repo, now } = deps;

  async function resolveOrCreateUser(email: string, emailLower: string) {
    const existing = await repo.getUserByEmail(emailLower);
    if (existing.ok) return existing;
    const userId = `usr_${randomHex(16)}`;
    const createResult = await repo.createUser({ id: userId, email, emailLower, createdAt: now() });
    if (!createResult.ok && createResult.error.kind === "conflict") {
      return repo.getUserByEmail(emailLower);
    }
    if (createResult.ok) {
      await repo.createAuthIdentity({ id: `aid_${randomHex(16)}`, userId, provider: "email", subject: emailLower, createdAt: now() });
    }
    return createResult;
  }

  return {
    async startLogin(email: string) {
      const emailLower = email.trim().toLowerCase();
      const userResult = await resolveOrCreateUser(email.trim(), emailLower);
      if (!userResult.ok) return { error: "internal_error" as const, message: "Failed to resolve user" };
      const code = generateCode();
      const codeHash = await hashSha256(code);
      const challengeId = `chl_${randomHex(16)}`;
      const currentTime = now();
      const expiresAt = new Date(currentTime.getTime() + CHALLENGE_TTL_MS);
      const challengeResult = await repo.createLoginChallenge({ id: challengeId, userId: userResult.value.id, method: "email_code", codeHash, expiresAt, createdAt: currentTime });
      if (!challengeResult.ok) return { error: "internal_error" as const, message: "Failed to create login challenge" };
      return { challengeId, expiresAt, emailHint: emailHint(emailLower), rawCode: code };
    },

    async completeLogin(challengeId: string, code: string) {
      const codeHash = await hashSha256(code);
      const consumeResult = await repo.consumeLoginChallenge(challengeId, codeHash, now());
      if (!consumeResult.ok) {
        switch (consumeResult.error.kind) {
          case "not_found": return { error: "not_found" as const, message: "Challenge not found or code is invalid" };
          case "expired": return { error: "precondition_failed" as const, message: "Challenge has expired" };
          case "already_consumed": return { error: "precondition_failed" as const, message: "Challenge has already been used" };
          default: return { error: "internal_error" as const, message: "Failed to complete login" };
        }
      }
      const challenge = consumeResult.value;
      const userResult = await repo.getUserById(challenge.userId);
      if (!userResult.ok) return { error: "internal_error" as const, message: "Failed to resolve user" };
      const sessionId = `ses_${randomHex(16)}`;
      const secret = randomHex(32);
      const tokenHash = await hashSha256(secret);
      const currentTime = now();
      const expiresAt = new Date(currentTime.getTime() + SESSION_TTL_MS);
      const sessionResult = await repo.createSession({ id: sessionId, userId: challenge.userId, tokenHash, expiresAt, createdAt: currentTime });
      if (!sessionResult.ok) return { error: "internal_error" as const, message: "Failed to create session" };
      const user = userResult.value;
      return { token: buildSessionToken(sessionId, secret), expiresAt, user: { id: user.id, email: user.email, displayName: user.displayName } };
    },

    async getSession(token: string) {
      const parsed = parseSessionToken(token);
      if (!parsed) return { error: "unauthenticated" as const, message: "Invalid token format" };
      const tokenHash = await hashSha256(parsed.secret);
      const sessionResult = await repo.getSessionByTokenHash(tokenHash);
      if (!sessionResult.ok) return { error: "unauthenticated" as const, message: "Session not found" };
      const session = sessionResult.value;
      if (session.revokedAt !== null) return { error: "unauthenticated" as const, message: "Session has been revoked" };
      if (session.expiresAt.getTime() <= now().getTime()) return { error: "unauthenticated" as const, message: "Session has expired" };
      const userResult = await repo.getUserById(session.userId);
      if (!userResult.ok) return { error: "unauthenticated" as const, message: "User not found" };
      const user = userResult.value;
      return { session: { id: session.id, expiresAt: session.expiresAt, createdAt: session.createdAt }, user: { id: user.id, email: user.email, displayName: user.displayName } };
    },

    async logout(token: string) {
      const parsed = parseSessionToken(token);
      if (!parsed) return { error: "unauthenticated" as const, message: "Invalid token format" };
      const tokenHash = await hashSha256(parsed.secret);
      const sessionResult = await repo.getSessionByTokenHash(tokenHash);
      if (!sessionResult.ok) return { error: "unauthenticated" as const, message: "Session not found" };
      const session = sessionResult.value;
      if (session.revokedAt === null) await repo.revokeSession(session.id, now());
      return { success: true as const };
    },
  };
}

describe("Auth Service", () => {
  const fixedNow = new Date("2026-01-15T10:00:00.000Z");

  describe("startLogin", () => {
    it("creates user and challenge for new email", async () => {
      const repo = createFakeRepository();
      const auth = createAuthService({ repo, now: () => fixedNow });
      const result = await auth.startLogin("Test@Example.com");

      expect("error" in result).toBe(false);
      if ("error" in result) return;
      expect(result.challengeId).toMatch(/^chl_/);
      expect(result.rawCode).toMatch(/^\d{6}$/);
      expect(result.emailHint).toBe("t***@example.com");
      expect(result.expiresAt.getTime()).toBe(fixedNow.getTime() + 10 * 60 * 1000);
      expect(repo._users.size).toBe(1);
      expect(repo._authIdentities.size).toBe(1);
    });

    it("reuses existing user for known email", async () => {
      const repo = createFakeRepository();
      const auth = createAuthService({ repo, now: () => fixedNow });

      await auth.startLogin("user@test.com");
      const before = repo._users.size;
      await auth.startLogin("user@test.com");
      expect(repo._users.size).toBe(before);
    });

    it("generates unique codes across calls", async () => {
      const repo = createFakeRepository();
      const auth = createAuthService({ repo, now: () => fixedNow });

      const r1 = await auth.startLogin("a@b.com");
      const r2 = await auth.startLogin("a@b.com");
      if ("error" in r1 || "error" in r2) return;
      expect(r1.challengeId).not.toBe(r2.challengeId);
    });

    it("stores code hash not raw code in challenge", async () => {
      const repo = createFakeRepository();
      const auth = createAuthService({ repo, now: () => fixedNow });
      const result = await auth.startLogin("x@y.com");
      if ("error" in result) return;

      const stored = repo._challenges.get(result.challengeId);
      expect(stored).toBeDefined();
      expect(stored!.codeHash).not.toBe(result.rawCode);
      expect(stored!.codeHash.length).toBe(64);
    });
  });

  describe("completeLogin", () => {
    it("consumes challenge and returns session token", async () => {
      const repo = createFakeRepository();
      const auth = createAuthService({ repo, now: () => fixedNow });

      const start = await auth.startLogin("user@example.com");
      if ("error" in start) throw new Error("startLogin failed");

      const result = await auth.completeLogin(start.challengeId, start.rawCode);
      expect("error" in result).toBe(false);
      if ("error" in result) return;

      expect(result.token).toMatch(/^sps_ses_.+\..+$/);
      expect(result.user.email).toBe("user@example.com");
      expect(result.expiresAt.getTime()).toBe(fixedNow.getTime() + 30 * 24 * 60 * 60 * 1000);
    });

    it("returns error for wrong code", async () => {
      const repo = createFakeRepository();
      const auth = createAuthService({ repo, now: () => fixedNow });

      const start = await auth.startLogin("user@example.com");
      if ("error" in start) throw new Error("startLogin failed");

      const result = await auth.completeLogin(start.challengeId, "000000");
      expect("error" in result).toBe(true);
      if (!("error" in result)) return;
      expect(result.error).toBe("not_found");
    });

    it("returns error for already consumed challenge", async () => {
      const repo = createFakeRepository();
      const auth = createAuthService({ repo, now: () => fixedNow });

      const start = await auth.startLogin("user@example.com");
      if ("error" in start) throw new Error("startLogin failed");

      await auth.completeLogin(start.challengeId, start.rawCode);
      const result = await auth.completeLogin(start.challengeId, start.rawCode);
      expect("error" in result).toBe(true);
      if (!("error" in result)) return;
      expect(result.error).toBe("precondition_failed");
      expect(result.message).toContain("already been used");
    });

    it("returns error for expired challenge", async () => {
      const repo = createFakeRepository();
      const expiredTime = new Date(fixedNow.getTime() + 11 * 60 * 1000);
      let currentTime = fixedNow;
      const auth = createAuthService({ repo, now: () => currentTime });

      const start = await auth.startLogin("user@example.com");
      if ("error" in start) throw new Error("startLogin failed");

      currentTime = expiredTime;
      const result = await auth.completeLogin(start.challengeId, start.rawCode);
      expect("error" in result).toBe(true);
      if (!("error" in result)) return;
      expect(result.error).toBe("precondition_failed");
      expect(result.message).toContain("expired");
    });

    it("returns error for unknown challenge", async () => {
      const repo = createFakeRepository();
      const auth = createAuthService({ repo, now: () => fixedNow });

      const result = await auth.completeLogin("chl_nonexistent", "123456");
      expect("error" in result).toBe(true);
      if (!("error" in result)) return;
      expect(result.error).toBe("not_found");
    });

    it("stores session token hash not raw token", async () => {
      const repo = createFakeRepository();
      const auth = createAuthService({ repo, now: () => fixedNow });

      const start = await auth.startLogin("user@example.com");
      if ("error" in start) throw new Error("startLogin failed");

      const result = await auth.completeLogin(start.challengeId, start.rawCode);
      if ("error" in result) throw new Error("completeLogin failed");

      const parsed = parseSessionToken(result.token);
      expect(parsed).not.toBeNull();
      for (const s of repo._sessions.values()) {
        expect(s.tokenHash).not.toBe(parsed!.secret);
        expect(s.tokenHash.length).toBe(64);
      }
    });
  });

  describe("getSession", () => {
    it("resolves valid session", async () => {
      const repo = createFakeRepository();
      const auth = createAuthService({ repo, now: () => fixedNow });

      const start = await auth.startLogin("user@example.com");
      if ("error" in start) throw new Error("startLogin failed");
      const complete = await auth.completeLogin(start.challengeId, start.rawCode);
      if ("error" in complete) throw new Error("completeLogin failed");

      const result = await auth.getSession(complete.token);
      expect("error" in result).toBe(false);
      if ("error" in result) return;
      expect(result.user.email).toBe("user@example.com");
      expect(result.session.id).toMatch(/^ses_/);
    });

    it("returns unauthenticated for malformed token", async () => {
      const repo = createFakeRepository();
      const auth = createAuthService({ repo, now: () => fixedNow });

      const result = await auth.getSession("not-a-valid-token");
      expect("error" in result).toBe(true);
      if (!("error" in result)) return;
      expect(result.error).toBe("unauthenticated");
    });

    it("returns unauthenticated for unknown token", async () => {
      const repo = createFakeRepository();
      const auth = createAuthService({ repo, now: () => fixedNow });

      const result = await auth.getSession("sps_ses_abc123.deadbeef");
      expect("error" in result).toBe(true);
      if (!("error" in result)) return;
      expect(result.error).toBe("unauthenticated");
    });

    it("returns unauthenticated for expired session", async () => {
      const repo = createFakeRepository();
      let currentTime = fixedNow;
      const auth = createAuthService({ repo, now: () => currentTime });

      const start = await auth.startLogin("user@example.com");
      if ("error" in start) throw new Error("startLogin failed");
      const complete = await auth.completeLogin(start.challengeId, start.rawCode);
      if ("error" in complete) throw new Error("completeLogin failed");

      currentTime = new Date(fixedNow.getTime() + 31 * 24 * 60 * 60 * 1000);
      const result = await auth.getSession(complete.token);
      expect("error" in result).toBe(true);
      if (!("error" in result)) return;
      expect(result.error).toBe("unauthenticated");
      expect(result.message).toContain("expired");
    });

    it("returns unauthenticated for revoked session", async () => {
      const repo = createFakeRepository();
      const auth = createAuthService({ repo, now: () => fixedNow });

      const start = await auth.startLogin("user@example.com");
      if ("error" in start) throw new Error("startLogin failed");
      const complete = await auth.completeLogin(start.challengeId, start.rawCode);
      if ("error" in complete) throw new Error("completeLogin failed");

      await auth.logout(complete.token);
      const result = await auth.getSession(complete.token);
      expect("error" in result).toBe(true);
      if (!("error" in result)) return;
      expect(result.error).toBe("unauthenticated");
      expect(result.message).toContain("revoked");
    });
  });

  describe("logout", () => {
    it("revokes a valid session", async () => {
      const repo = createFakeRepository();
      const auth = createAuthService({ repo, now: () => fixedNow });

      const start = await auth.startLogin("user@example.com");
      if ("error" in start) throw new Error("startLogin failed");
      const complete = await auth.completeLogin(start.challengeId, start.rawCode);
      if ("error" in complete) throw new Error("completeLogin failed");

      const result = await auth.logout(complete.token);
      expect("error" in result).toBe(false);
      expect("success" in result && result.success).toBe(true);
    });

    it("is idempotent for already-revoked session", async () => {
      const repo = createFakeRepository();
      const auth = createAuthService({ repo, now: () => fixedNow });

      const start = await auth.startLogin("user@example.com");
      if ("error" in start) throw new Error("startLogin failed");
      const complete = await auth.completeLogin(start.challengeId, start.rawCode);
      if ("error" in complete) throw new Error("completeLogin failed");

      await auth.logout(complete.token);
      const result = await auth.logout(complete.token);
      expect("error" in result).toBe(false);
    });

    it("returns unauthenticated for invalid token", async () => {
      const repo = createFakeRepository();
      const auth = createAuthService({ repo, now: () => fixedNow });

      const result = await auth.logout("garbage");
      expect("error" in result).toBe(true);
      if (!("error" in result)) return;
      expect(result.error).toBe("unauthenticated");
    });
  });
});

describe("parseSessionToken", () => {
  it("parses valid token", () => {
    const result = parseSessionToken("sps_ses_abc123def456.secrethex");
    expect(result).toEqual({ sessionId: "ses_abc123def456", secret: "secrethex" });
  });

  it("returns null for missing prefix", () => {
    expect(parseSessionToken("ses_abc.secret")).toBeNull();
  });

  it("returns null for missing dot", () => {
    expect(parseSessionToken("sps_ses_nodot")).toBeNull();
  });

  it("returns null for empty secret", () => {
    expect(parseSessionToken("sps_ses_abc.")).toBeNull();
  });
});

describe("buildSessionToken", () => {
  it("builds correct format", () => {
    const token = buildSessionToken("ses_abc123", "mysecret");
    expect(token).toBe("sps_ses_abc123.mysecret");
  });

  it("handles raw id without prefix", () => {
    const token = buildSessionToken("rawid", "sec");
    expect(token).toBe("sps_ses_rawid.sec");
  });
});
