import type { SecurityEventListResponse } from "@saas/contracts/security-events";

import type { RequestOptions, Transport } from "./transport.js";

/**
 * Security Events resource client.
 *
 * The api-edge exposes this surface at `GET /v1/auth/security-events`
 * (note: actor-scoped, not org-scoped — backed by `apps/identity-worker`
 * via the `auth-facade`). Returns the public security-event projection
 * with secrets, codes, and credential material already stripped by the
 * worker.
 */
export class SecurityEventsClient {
  constructor(private readonly transport: Transport) {}

  /** GET /v1/auth/security-events */
  list(opts: RequestOptions = {}): Promise<SecurityEventListResponse> {
    return this.transport.request<SecurityEventListResponse>(
      { method: "GET", path: "/v1/auth/security-events" },
      opts,
    );
  }
}
