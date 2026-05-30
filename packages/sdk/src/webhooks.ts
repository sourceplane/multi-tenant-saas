import type {
  CreateWebhookEndpointRequest,
  CreateWebhookEndpointResponse,
  CreateWebhookSubscriptionRequest,
  CreateWebhookSubscriptionResponse,
  DeleteWebhookEndpointResponse,
  DeleteWebhookSubscriptionResponse,
  DisableWebhookEndpointRequest,
  DisableWebhookEndpointResponse,
  GetWebhookDeliveryAttemptResponse,
  GetWebhookEndpointResponse,
  GetWebhookSubscriptionResponse,
  ListWebhookDeliveryAttemptsResponse,
  ListWebhookEndpointsResponse,
  ListWebhookSubscriptionsResponse,
  RotateWebhookSecretResponse,
  UpdateWebhookEndpointRequest,
  UpdateWebhookEndpointResponse,
  UpdateWebhookSubscriptionRequest,
  UpdateWebhookSubscriptionResponse,
} from "@saas/contracts/webhooks";

import type { RequestOptions, Transport } from "./transport.js";

/**
 * Webhooks resource client.
 *
 * Backed by `apps/webhooks-worker` via the api-edge `webhooks-facade`. The
 * facade exposes both an org-scoped surface and a project-scoped surface for
 * endpoint listing/creation; subscriptions and delivery attempts are
 * org-scoped only.
 */
export class WebhooksClient {
  constructor(private readonly transport: Transport) {}

  // -------------------------------------------------------------------------
  // Endpoints — org scope
  // -------------------------------------------------------------------------

  /** GET /v1/organizations/:orgId/webhooks/endpoints */
  listEndpoints(
    orgId: string,
    opts: RequestOptions = {},
  ): Promise<ListWebhookEndpointsResponse> {
    return this.transport.request<ListWebhookEndpointsResponse>(
      {
        method: "GET",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/webhooks/endpoints`,
      },
      opts,
    );
  }

  /** GET /v1/organizations/:orgId/projects/:projectId/webhooks/endpoints */
  listProjectEndpoints(
    orgId: string,
    projectId: string,
    opts: RequestOptions = {},
  ): Promise<ListWebhookEndpointsResponse> {
    return this.transport.request<ListWebhookEndpointsResponse>(
      {
        method: "GET",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/projects/${encodeURIComponent(projectId)}/webhooks/endpoints`,
      },
      opts,
    );
  }

  /** GET /v1/organizations/:orgId/webhooks/endpoints/:endpointId */
  getEndpoint(
    orgId: string,
    endpointId: string,
    opts: RequestOptions = {},
  ): Promise<GetWebhookEndpointResponse> {
    return this.transport.request<GetWebhookEndpointResponse>(
      {
        method: "GET",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/webhooks/endpoints/${encodeURIComponent(endpointId)}`,
      },
      opts,
    );
  }

  /**
   * POST /v1/organizations/:orgId/webhooks/endpoints
   *
   * Pass `idempotencyKey` in `opts` for safe retry semantics.
   */
  createEndpoint(
    orgId: string,
    body: CreateWebhookEndpointRequest,
    opts: RequestOptions = {},
  ): Promise<CreateWebhookEndpointResponse> {
    return this.transport.request<CreateWebhookEndpointResponse>(
      {
        method: "POST",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/webhooks/endpoints`,
        body,
      },
      opts,
    );
  }

  /**
   * POST /v1/organizations/:orgId/projects/:projectId/webhooks/endpoints
   *
   * Project-scoped endpoint creation. Pass `idempotencyKey` for retry safety.
   */
  createProjectEndpoint(
    orgId: string,
    projectId: string,
    body: CreateWebhookEndpointRequest,
    opts: RequestOptions = {},
  ): Promise<CreateWebhookEndpointResponse> {
    return this.transport.request<CreateWebhookEndpointResponse>(
      {
        method: "POST",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/projects/${encodeURIComponent(projectId)}/webhooks/endpoints`,
        body,
      },
      opts,
    );
  }

  /** PATCH /v1/organizations/:orgId/webhooks/endpoints/:endpointId */
  updateEndpoint(
    orgId: string,
    endpointId: string,
    body: UpdateWebhookEndpointRequest,
    opts: RequestOptions = {},
  ): Promise<UpdateWebhookEndpointResponse> {
    return this.transport.request<UpdateWebhookEndpointResponse>(
      {
        method: "PATCH",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/webhooks/endpoints/${encodeURIComponent(endpointId)}`,
        body,
      },
      opts,
    );
  }

  /** POST /v1/organizations/:orgId/webhooks/endpoints/:endpointId/disable */
  disableEndpoint(
    orgId: string,
    endpointId: string,
    body: DisableWebhookEndpointRequest = {},
    opts: RequestOptions = {},
  ): Promise<DisableWebhookEndpointResponse> {
    return this.transport.request<DisableWebhookEndpointResponse>(
      {
        method: "POST",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/webhooks/endpoints/${encodeURIComponent(endpointId)}/disable`,
        body,
      },
      opts,
    );
  }

  /** DELETE /v1/organizations/:orgId/webhooks/endpoints/:endpointId */
  deleteEndpoint(
    orgId: string,
    endpointId: string,
    opts: RequestOptions = {},
  ): Promise<DeleteWebhookEndpointResponse> {
    return this.transport.request<DeleteWebhookEndpointResponse>(
      {
        method: "DELETE",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/webhooks/endpoints/${encodeURIComponent(endpointId)}`,
      },
      opts,
    );
  }

  /**
   * POST /v1/organizations/:orgId/webhooks/endpoints/:endpointId/rotate-secret
   *
   * Bumps the endpoint's `secretVersion`. The new secret material is delivered
   * out-of-band via the worker — the response carries only metadata.
   */
  rotateSecret(
    orgId: string,
    endpointId: string,
    opts: RequestOptions = {},
  ): Promise<RotateWebhookSecretResponse> {
    return this.transport.request<RotateWebhookSecretResponse>(
      {
        method: "POST",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/webhooks/endpoints/${encodeURIComponent(endpointId)}/rotate-secret`,
      },
      opts,
    );
  }

  // -------------------------------------------------------------------------
  // Subscriptions — org scope
  // -------------------------------------------------------------------------

  /** GET /v1/organizations/:orgId/webhooks/subscriptions */
  listSubscriptions(
    orgId: string,
    opts: RequestOptions = {},
  ): Promise<ListWebhookSubscriptionsResponse> {
    return this.transport.request<ListWebhookSubscriptionsResponse>(
      {
        method: "GET",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/webhooks/subscriptions`,
      },
      opts,
    );
  }

  /** GET /v1/organizations/:orgId/webhooks/subscriptions/:subscriptionId */
  getSubscription(
    orgId: string,
    subscriptionId: string,
    opts: RequestOptions = {},
  ): Promise<GetWebhookSubscriptionResponse> {
    return this.transport.request<GetWebhookSubscriptionResponse>(
      {
        method: "GET",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/webhooks/subscriptions/${encodeURIComponent(subscriptionId)}`,
      },
      opts,
    );
  }

  /**
   * POST /v1/organizations/:orgId/webhooks/subscriptions
   *
   * Pass `idempotencyKey` in `opts` for safe retry semantics.
   */
  createSubscription(
    orgId: string,
    body: CreateWebhookSubscriptionRequest,
    opts: RequestOptions = {},
  ): Promise<CreateWebhookSubscriptionResponse> {
    return this.transport.request<CreateWebhookSubscriptionResponse>(
      {
        method: "POST",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/webhooks/subscriptions`,
        body,
      },
      opts,
    );
  }

  /** PATCH /v1/organizations/:orgId/webhooks/subscriptions/:subscriptionId */
  updateSubscription(
    orgId: string,
    subscriptionId: string,
    body: UpdateWebhookSubscriptionRequest,
    opts: RequestOptions = {},
  ): Promise<UpdateWebhookSubscriptionResponse> {
    return this.transport.request<UpdateWebhookSubscriptionResponse>(
      {
        method: "PATCH",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/webhooks/subscriptions/${encodeURIComponent(subscriptionId)}`,
        body,
      },
      opts,
    );
  }

  /** DELETE /v1/organizations/:orgId/webhooks/subscriptions/:subscriptionId */
  deleteSubscription(
    orgId: string,
    subscriptionId: string,
    opts: RequestOptions = {},
  ): Promise<DeleteWebhookSubscriptionResponse> {
    return this.transport.request<DeleteWebhookSubscriptionResponse>(
      {
        method: "DELETE",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/webhooks/subscriptions/${encodeURIComponent(subscriptionId)}`,
      },
      opts,
    );
  }

  // -------------------------------------------------------------------------
  // Delivery attempts
  // -------------------------------------------------------------------------

  /** GET /v1/organizations/:orgId/webhooks/endpoints/:endpointId/delivery-attempts */
  listDeliveryAttempts(
    orgId: string,
    endpointId: string,
    opts: RequestOptions = {},
  ): Promise<ListWebhookDeliveryAttemptsResponse> {
    return this.transport.request<ListWebhookDeliveryAttemptsResponse>(
      {
        method: "GET",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/webhooks/endpoints/${encodeURIComponent(endpointId)}/delivery-attempts`,
      },
      opts,
    );
  }

  /** GET /v1/organizations/:orgId/webhooks/delivery-attempts/:attemptId */
  getDeliveryAttempt(
    orgId: string,
    attemptId: string,
    opts: RequestOptions = {},
  ): Promise<GetWebhookDeliveryAttemptResponse> {
    return this.transport.request<GetWebhookDeliveryAttemptResponse>(
      {
        method: "GET",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/webhooks/delivery-attempts/${encodeURIComponent(attemptId)}`,
      },
      opts,
    );
  }
}
