// OAuth provider registry + env-driven enablement.
//
// Adding a provider (e.g. Google) is: implement `OAuthProvider` in its own
// module, register it in `PROVIDERS`, and teach `getConfiguredProvider` how to
// read its client id/secret from `Env`. The handlers and service stay generic.

import type { OAuthProviderInfo } from "@saas/contracts/auth";
import type { Env } from "../env.js";
import { getRedirectBaseOrigin, getStateSecret } from "./config.js";
import { githubProvider } from "./github.js";

/** A stable, provider-scoped subject + the profile facts we trust. */
export interface OAuthIdentity {
  /** Stable provider user id (NOT email/login). */
  subject: string;
  email: string | null;
  /** Whether the provider asserts the email is verified. Gates account linking. */
  emailVerified: boolean;
  displayName: string | null;
}

export interface OAuthProvider {
  id: string;
  displayName: string;
  buildAuthorizeUrl(input: { clientId: string; redirectUri: string; state: string }): string;
  exchangeCode(input: {
    clientId: string;
    clientSecret: string;
    code: string;
    redirectUri: string;
  }): Promise<string | null>;
  fetchIdentity(accessToken: string): Promise<OAuthIdentity | null>;
}

export interface ConfiguredProvider {
  provider: OAuthProvider;
  clientId: string;
  clientSecret: string;
}

const PROVIDERS: Record<string, OAuthProvider> = {
  [githubProvider.id]: githubProvider,
};

/** Per-provider client credentials read from `Env`, or null when not set. */
function readClientCredentials(env: Env, providerId: string): { clientId: string; clientSecret: string } | null {
  if (providerId === "github") {
    const clientId = env.GITHUB_OAUTH_CLIENT_ID;
    const clientSecret = env.GITHUB_OAUTH_CLIENT_SECRET;
    if (typeof clientId === "string" && clientId && typeof clientSecret === "string" && clientSecret) {
      return { clientId, clientSecret };
    }
    return null;
  }
  return null;
}

/**
 * Resolve a fully-usable provider config, or null when the provider is unknown
 * or missing client credentials. (Runtime-readiness — state secret + redirect
 * base — is checked separately by callers that need it.)
 */
export function getConfiguredProvider(env: Env, providerId: string): ConfiguredProvider | null {
  const provider = PROVIDERS[providerId];
  if (!provider) return null;
  const creds = readClientCredentials(env, providerId);
  if (!creds) return null;
  return { provider, clientId: creds.clientId, clientSecret: creds.clientSecret };
}

/** Is the shared OAuth runtime config (state secret + redirect base) present? */
export function oauthRuntimeReady(env: Env): boolean {
  return getStateSecret(env) !== null && getRedirectBaseOrigin(env) !== null;
}

/**
 * The providers that are fully wired (credentials + runtime config). The
 * console renders a sign-in button only for these.
 */
export function listEnabledProviderInfos(env: Env): OAuthProviderInfo[] {
  if (!oauthRuntimeReady(env)) return [];
  const infos: OAuthProviderInfo[] = [];
  for (const id of Object.keys(PROVIDERS)) {
    if (getConfiguredProvider(env, id)) {
      const provider = PROVIDERS[id]!;
      infos.push({ id: provider.id, displayName: provider.displayName });
    }
  }
  return infos;
}
