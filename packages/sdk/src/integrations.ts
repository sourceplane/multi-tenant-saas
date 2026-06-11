import type {
  ConnectIntegrationRequest,
  ConnectIntegrationResponse,
  GetIntegrationResponse,
  ListIntegrationsResponse,
  RevokeIntegrationResponse,
} from "@saas/contracts/integrations";

import type { Transport, RequestOptions } from "./transport.js";

/**
 * Integrations resource client (GitHub App connections).
 *
 * Org-scoped: every method takes `orgId` as the first argument.
 * Maps to `apps/integrations-worker` via the api-edge `integrations-facade`.
 */
export class IntegrationsClient {
  constructor(private readonly transport: Transport) {}

  /** GET /v1/organizations/:orgId/integrations */
  list(orgId: string, opts: RequestOptions = {}): Promise<ListIntegrationsResponse> {
    return this.transport.request<ListIntegrationsResponse>(
      {
        method: "GET",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/integrations`,
      },
      opts,
    );
  }

  /** GET /v1/organizations/:orgId/integrations/:connectionId */
  get(orgId: string, connectionId: string, opts: RequestOptions = {}): Promise<GetIntegrationResponse> {
    return this.transport.request<GetIntegrationResponse>(
      {
        method: "GET",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/integrations/${encodeURIComponent(connectionId)}`,
      },
      opts,
    );
  }

  /**
   * POST /v1/organizations/:orgId/integrations/github/connect
   *
   * Returns a pending connection plus the provider install URL carrying the
   * signed single-use state; open the URL in a popup and poll `get` until the
   * connection turns `active`.
   */
  connectGithub(
    orgId: string,
    body: ConnectIntegrationRequest = {},
    opts: RequestOptions = {},
  ): Promise<ConnectIntegrationResponse> {
    return this.transport.request<ConnectIntegrationResponse>(
      {
        method: "POST",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/integrations/github/connect`,
        body,
      },
      opts,
    );
  }

  /** DELETE /v1/organizations/:orgId/integrations/:connectionId */
  revoke(
    orgId: string,
    connectionId: string,
    opts: RequestOptions = {},
  ): Promise<RevokeIntegrationResponse> {
    return this.transport.request<RevokeIntegrationResponse>(
      {
        method: "DELETE",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/integrations/${encodeURIComponent(connectionId)}`,
      },
      opts,
    );
  }
}
