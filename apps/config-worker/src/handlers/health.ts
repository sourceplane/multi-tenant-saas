import type { Env } from "../env.js";
import { successResponse, errorResponse } from "../http.js";

export function handleHealth(env: Env, requestId: string): Response {
  const dbConfigured = !!env.SOURCEPLANE_DB;
  const membershipConfigured = !!env.MEMBERSHIP_WORKER;
  const policyConfigured = !!env.POLICY_WORKER;

  return successResponse(
    {
      service: "config-worker",
      environment: env.ENVIRONMENT ?? "local",
      checks: {
        database: { configured: dbConfigured },
        membership: { configured: membershipConfigured },
        policy: { configured: policyConfigured },
      },
    },
    requestId,
  );
}
