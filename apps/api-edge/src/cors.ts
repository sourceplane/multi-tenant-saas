import type { Env } from "./env";

const STAGE_ORIGINS = [
  "https://sourceplane-web-console-stage.pages.dev",
];

const PROD_ORIGINS = [
  "https://sourceplane-web-console-prod.pages.dev",
];

const STAGE_PREVIEW_RE = /^https:\/\/[a-z0-9-]+\.sourceplane-web-console-stage\.pages\.dev$/;
const PROD_PREVIEW_RE = /^https:\/\/[a-z0-9-]+\.sourceplane-web-console-prod\.pages\.dev$/;
const LOCALHOST_RE = /^https?:\/\/localhost(:\d+)?$/;
const VITE_DEV_RE = /^https?:\/\/127\.0\.0\.1(:\d+)?$/;

const ALLOWED_HEADERS = [
  "authorization",
  "content-type",
  "x-request-id",
  "traceparent",
  "idempotency-key",
].join(", ");

const EXPOSED_HEADERS = [
  "x-request-id",
].join(", ");

const ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
const MAX_AGE = "86400";

export function isAllowedOrigin(origin: string | null, env: Env): boolean {
  if (!origin) return false;

  if (LOCALHOST_RE.test(origin)) return true;
  if (VITE_DEV_RE.test(origin)) return true;

  const environment = env.ENVIRONMENT;

  if (environment === "stage") {
    if (STAGE_ORIGINS.includes(origin)) return true;
    if (STAGE_PREVIEW_RE.test(origin)) return true;
    return false;
  }

  if (environment === "prod") {
    if (PROD_ORIGINS.includes(origin)) return true;
    if (PROD_PREVIEW_RE.test(origin)) return true;
    return false;
  }

  if (STAGE_ORIGINS.includes(origin)) return true;
  if (PROD_ORIGINS.includes(origin)) return true;
  if (STAGE_PREVIEW_RE.test(origin)) return true;
  if (PROD_PREVIEW_RE.test(origin)) return true;

  return false;
}

export function handlePreflight(request: Request, env: Env): Response | null {
  if (request.method !== "OPTIONS") return null;

  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin, env)) {
    return new Response(null, { status: 204 });
  }

  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": origin!,
      "access-control-allow-methods": ALLOWED_METHODS,
      "access-control-allow-headers": ALLOWED_HEADERS,
      "access-control-expose-headers": EXPOSED_HEADERS,
      "access-control-max-age": MAX_AGE,
      "access-control-allow-credentials": "true",
      vary: "Origin",
    },
  });
}

export function applyCorsHeaders(response: Response, request: Request, env: Env): Response {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin, env)) return response;

  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", origin!);
  headers.set("access-control-allow-credentials", "true");
  headers.set("access-control-expose-headers", EXPOSED_HEADERS);
  headers.set("vary", "Origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
