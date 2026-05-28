import type { Env } from "./env.js";
import type { Scope } from "@saas/db/config";
import { handleHealth } from "./handlers/health.js";
import { handleListSettings } from "./handlers/list-settings.js";
import { handleListFeatureFlags } from "./handlers/list-feature-flags.js";
import { handleListSecrets } from "./handlers/list-secrets.js";
import { errorResponse, notFound, methodNotAllowed } from "./http.js";
import { generateRequestId, parseOrgPublicId, parseProjectPublicId, parseEnvironmentPublicId } from "./ids.js";

const REQUEST_ID_RE = /^[\w-]{1,128}$/;

export interface ActorContext {
  subjectId: string;
  subjectType: string;
}

function resolveRequestId(request: Request): string {
  const header = request.headers.get("x-request-id");
  if (header && REQUEST_ID_RE.test(header)) return header;
  return generateRequestId();
}

function resolveActor(request: Request): ActorContext | null {
  const subjectId = request.headers.get("x-actor-subject-id");
  const subjectType = request.headers.get("x-actor-subject-type");
  if (!subjectId || !subjectType) return null;
  return { subjectId, subjectType };
}

// ── Route patterns ──────────────────────────────────────────
// Organization scope
const ORG_SETTINGS_RE = /^\/v1\/organizations\/([^/]+)\/config\/settings$/;
const ORG_FEATURE_FLAGS_RE = /^\/v1\/organizations\/([^/]+)\/config\/feature-flags$/;
const ORG_SECRETS_RE = /^\/v1\/organizations\/([^/]+)\/config\/secrets$/;

// Project scope
const PRJ_SETTINGS_RE = /^\/v1\/organizations\/([^/]+)\/projects\/([^/]+)\/config\/settings$/;
const PRJ_FEATURE_FLAGS_RE = /^\/v1\/organizations\/([^/]+)\/projects\/([^/]+)\/config\/feature-flags$/;
const PRJ_SECRETS_RE = /^\/v1\/organizations\/([^/]+)\/projects\/([^/]+)\/config\/secrets$/;

// Environment scope
const ENV_SETTINGS_RE = /^\/v1\/organizations\/([^/]+)\/projects\/([^/]+)\/environments\/([^/]+)\/config\/settings$/;
const ENV_FEATURE_FLAGS_RE = /^\/v1\/organizations\/([^/]+)\/projects\/([^/]+)\/environments\/([^/]+)\/config\/feature-flags$/;
const ENV_SECRETS_RE = /^\/v1\/organizations\/([^/]+)\/projects\/([^/]+)\/environments\/([^/]+)\/config\/secrets$/;

type ConfigResource = "settings" | "feature-flags" | "secrets";

interface MatchedRoute {
  scope: Scope;
  resource: ConfigResource;
}

function matchRoute(pathname: string): MatchedRoute | null {
  // Environment scope (most specific first)
  let m = pathname.match(ENV_SETTINGS_RE);
  if (m) {
    const orgId = parseOrgPublicId(m[1]!);
    const projectId = parseProjectPublicId(m[2]!);
    const environmentId = parseEnvironmentPublicId(m[3]!);
    if (!orgId || !projectId || !environmentId) return null;
    return { scope: { kind: "environment", orgId, projectId, environmentId }, resource: "settings" };
  }

  m = pathname.match(ENV_FEATURE_FLAGS_RE);
  if (m) {
    const orgId = parseOrgPublicId(m[1]!);
    const projectId = parseProjectPublicId(m[2]!);
    const environmentId = parseEnvironmentPublicId(m[3]!);
    if (!orgId || !projectId || !environmentId) return null;
    return { scope: { kind: "environment", orgId, projectId, environmentId }, resource: "feature-flags" };
  }

  m = pathname.match(ENV_SECRETS_RE);
  if (m) {
    const orgId = parseOrgPublicId(m[1]!);
    const projectId = parseProjectPublicId(m[2]!);
    const environmentId = parseEnvironmentPublicId(m[3]!);
    if (!orgId || !projectId || !environmentId) return null;
    return { scope: { kind: "environment", orgId, projectId, environmentId }, resource: "secrets" };
  }

  // Project scope
  m = pathname.match(PRJ_SETTINGS_RE);
  if (m) {
    const orgId = parseOrgPublicId(m[1]!);
    const projectId = parseProjectPublicId(m[2]!);
    if (!orgId || !projectId) return null;
    return { scope: { kind: "project", orgId, projectId }, resource: "settings" };
  }

  m = pathname.match(PRJ_FEATURE_FLAGS_RE);
  if (m) {
    const orgId = parseOrgPublicId(m[1]!);
    const projectId = parseProjectPublicId(m[2]!);
    if (!orgId || !projectId) return null;
    return { scope: { kind: "project", orgId, projectId }, resource: "feature-flags" };
  }

  m = pathname.match(PRJ_SECRETS_RE);
  if (m) {
    const orgId = parseOrgPublicId(m[1]!);
    const projectId = parseProjectPublicId(m[2]!);
    if (!orgId || !projectId) return null;
    return { scope: { kind: "project", orgId, projectId }, resource: "secrets" };
  }

  // Organization scope
  m = pathname.match(ORG_SETTINGS_RE);
  if (m) {
    const orgId = parseOrgPublicId(m[1]!);
    if (!orgId) return null;
    return { scope: { kind: "organization", orgId }, resource: "settings" };
  }

  m = pathname.match(ORG_FEATURE_FLAGS_RE);
  if (m) {
    const orgId = parseOrgPublicId(m[1]!);
    if (!orgId) return null;
    return { scope: { kind: "organization", orgId }, resource: "feature-flags" };
  }

  m = pathname.match(ORG_SECRETS_RE);
  if (m) {
    const orgId = parseOrgPublicId(m[1]!);
    if (!orgId) return null;
    return { scope: { kind: "organization", orgId }, resource: "secrets" };
  }

  return null;
}

export async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const requestId = resolveRequestId(request);

  try {
    if (url.pathname === "/health" && request.method === "GET") {
      return handleHealth(env, requestId);
    }

    const matched = matchRoute(url.pathname);
    if (!matched) {
      return notFound(requestId, url.pathname);
    }

    // All config list routes are GET-only (read-only surface)
    if (request.method !== "GET") {
      return methodNotAllowed(requestId);
    }

    const actor = resolveActor(request);
    if (!actor) {
      return errorResponse("unauthenticated", "Authentication required", 401, requestId);
    }

    switch (matched.resource) {
      case "settings":
        return handleListSettings(request, env, requestId, actor, matched.scope);
      case "feature-flags":
        return handleListFeatureFlags(request, env, requestId, actor, matched.scope);
      case "secrets":
        return handleListSecrets(request, env, requestId, actor, matched.scope);
    }
  } catch {
    return errorResponse("internal_error", "Internal error", 500, requestId);
  }
}
