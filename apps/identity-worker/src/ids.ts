function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let hex = "";
  for (let i = 0; i < buf.length; i++) {
    hex += buf[i]!.toString(16).padStart(2, "0");
  }
  return hex;
}

export function generateUserId(): string {
  return `usr_${randomHex(16)}`;
}

export function generateSessionId(): string {
  return `ses_${randomHex(16)}`;
}

export function generateChallengeId(): string {
  return `chl_${randomHex(16)}`;
}

export function generateRequestId(): string {
  return `req_${randomHex(12)}`;
}

export function generateAuthIdentityId(): string {
  return `aid_${randomHex(16)}`;
}

export function generateCode(): string {
  const buf = new Uint8Array(4);
  crypto.getRandomValues(buf);
  const num = ((buf[0]! << 24) | (buf[1]! << 16) | (buf[2]! << 8) | buf[3]!) >>> 0;
  return String(num % 1000000).padStart(6, "0");
}

export function generateTokenSecret(): string {
  return randomHex(32);
}

export function parseSessionToken(token: string): { sessionId: string; secret: string } | null {
  if (!token.startsWith("sps_ses_")) return null;
  const payload = token.slice(8);
  const dotIndex = payload.indexOf(".");
  if (dotIndex < 1) return null;
  const id = payload.slice(0, dotIndex);
  const secret = payload.slice(dotIndex + 1);
  if (!id || !secret) return null;
  return { sessionId: `ses_${id}`, secret };
}

export function buildSessionToken(sessionId: string, secret: string): string {
  const rawId = sessionId.startsWith("ses_") ? sessionId.slice(4) : sessionId;
  return `sps_ses_${rawId}.${secret}`;
}
