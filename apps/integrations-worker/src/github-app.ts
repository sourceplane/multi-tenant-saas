// GitHub App HTTP client: RS256 App JWT minting and the App-authenticated
// installation endpoints. The App private key signs for EVERY tenant (R4) —
// it enters this module as a PEM string from a worker secret and never leaves
// as anything but a short-lived JWT.

const API_BASE = "https://api.github.com";
const USER_AGENT = "sourceplane-integrations-worker";
/** App JWTs are short-lived: iat 60s in the past (clock drift), exp +9 min. */
const JWT_BACKDATE_SECONDS = 60;
const JWT_TTL_SECONDS = 540;

export interface GithubInstallationFacts {
  installationId: number;
  accountLogin: string | null;
  accountId: number | null;
  accountType: string | null;
  repositorySelection: string | null;
  permissions: Record<string, unknown> | null;
  events: unknown[] | null;
  suspendedAt: string | null;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

function bytesToBase64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function stringToBase64url(s: string): string {
  return bytesToBase64url(new TextEncoder().encode(s));
}

function pemToDer(pem: string): ArrayBuffer | null {
  const body = pem
    .replace(/-----BEGIN [A-Z ]+-----/g, "")
    .replace(/-----END [A-Z ]+-----/g, "")
    .replace(/\s+/g, "");
  if (!body) return null;
  try {
    const bin = atob(body);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  } catch {
    return null;
  }
}

/**
 * Mint a short-lived RS256 App JWT (GitHub App authentication). Returns null
 * on a malformed key rather than throwing — callers fail closed.
 * Requires a PKCS#8 PEM ("BEGIN PRIVATE KEY"); GitHub's downloads are PKCS#1
 * ("BEGIN RSA PRIVATE KEY") and must be converted once at registration time
 * (`openssl pkcs8 -topk8 -nocrypt`) — documented with the D1 runbook.
 */
export async function mintAppJwt(
  appId: string,
  privateKeyPem: string,
  nowMs: number,
): Promise<string | null> {
  const der = pemToDer(privateKeyPem);
  if (!der) return null;

  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey(
      "pkcs8",
      der,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );
  } catch {
    return null;
  }

  const nowSec = Math.floor(nowMs / 1000);
  const header = stringToBase64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = stringToBase64url(
    JSON.stringify({
      iat: nowSec - JWT_BACKDATE_SECONDS,
      exp: nowSec + JWT_TTL_SECONDS,
      iss: appId,
    }),
  );
  const signingInput = `${header}.${payload}`;

  try {
    const sig = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(signingInput),
    );
    return `${signingInput}.${bytesToBase64url(new Uint8Array(sig))}`;
  } catch {
    return null;
  }
}

function appHeaders(jwt: string): Record<string, string> {
  return {
    authorization: `Bearer ${jwt}`,
    accept: "application/vnd.github+json",
    "user-agent": USER_AGENT,
  };
}

/** GET /app/installations/{id} — verified installation facts from GitHub. */
export async function fetchInstallation(
  jwt: string,
  installationId: number,
  fetchImpl: FetchLike = fetch,
): Promise<GithubInstallationFacts | null> {
  let res: Response;
  try {
    res = await fetchImpl(`${API_BASE}/app/installations/${installationId}`, {
      method: "GET",
      headers: appHeaders(jwt),
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  let data: Record<string, unknown>;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (typeof data.id !== "number") return null;

  const account = (data.account ?? null) as Record<string, unknown> | null;
  return {
    installationId: data.id,
    accountLogin: account && typeof account.login === "string" ? account.login : null,
    accountId: account && typeof account.id === "number" ? account.id : null,
    accountType: account && typeof account.type === "string" ? account.type : null,
    repositorySelection:
      typeof data.repository_selection === "string" ? data.repository_selection : null,
    permissions: (data.permissions as Record<string, unknown>) ?? null,
    events: Array.isArray(data.events) ? data.events : null,
    suspendedAt: typeof data.suspended_at === "string" ? data.suspended_at : null,
  };
}

/**
 * DELETE /app/installations/{id} — best-effort GitHub-side uninstall on
 * platform revoke. Returns true on 204/404 (gone either way).
 */
export async function deleteInstallation(
  jwt: string,
  installationId: number,
  fetchImpl: FetchLike = fetch,
): Promise<boolean> {
  try {
    const res = await fetchImpl(`${API_BASE}/app/installations/${installationId}`, {
      method: "DELETE",
      headers: appHeaders(jwt),
    });
    return res.status === 204 || res.status === 404;
  } catch {
    return false;
  }
}
