import type {
  CheckBillingEntitlementRequest,
  CheckBillingEntitlementResponse,
  GetBillingCustomerResponse,
  GetBillingSummaryResponse,
  GetEntitlementsRequest,
  GetEntitlementsResponse,
  ListInvoicesRequest,
  ListInvoicesResponse,
  ListPlansRequest,
  ListPlansResponse,
} from "@saas/contracts/billing";

import type { RequestOptions, Transport } from "./transport.js";

/**
 * Billing resource client.
 *
 * Org-scoped surface served by `apps/billing-worker` via the api-edge
 * `billing-facade`. All endpoints are read-only at the public boundary —
 * subscription create/cancel flows are owned by provider-side checkout/portal
 * handoffs and are intentionally NOT exposed through the SDK.
 *
 * `checkEntitlement` targets the entitlement decision seam (POST against the
 * org-scoped entitlements path), letting callers gate product behaviour on a
 * stable entitlement key without reading billing tables directly.
 */
export class BillingClient {
  constructor(private readonly transport: Transport) {}

  /** GET /v1/organizations/:orgId/billing/plans */
  listPlans(
    orgId: string,
    query: ListPlansRequest = {},
    opts: RequestOptions = {},
  ): Promise<ListPlansResponse> {
    const params = buildQueryRecord({ status: query.status });
    return this.transport.request<ListPlansResponse>(
      {
        method: "GET",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/billing/plans`,
        query: params,
      },
      opts,
    );
  }

  /** GET /v1/organizations/:orgId/billing/customer */
  getCustomer(
    orgId: string,
    opts: RequestOptions = {},
  ): Promise<GetBillingCustomerResponse> {
    return this.transport.request<GetBillingCustomerResponse>(
      {
        method: "GET",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/billing/customer`,
      },
      opts,
    );
  }

  /** GET /v1/organizations/:orgId/billing/summary */
  getSummary(
    orgId: string,
    opts: RequestOptions = {},
  ): Promise<GetBillingSummaryResponse> {
    return this.transport.request<GetBillingSummaryResponse>(
      {
        method: "GET",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/billing/summary`,
      },
      opts,
    );
  }

  /** GET /v1/organizations/:orgId/billing/invoices */
  listInvoices(
    orgId: string,
    query: ListInvoicesRequest = {},
    opts: RequestOptions = {},
  ): Promise<ListInvoicesResponse> {
    const params = buildQueryRecord({
      subscriptionId: query.subscriptionId,
      status: query.status,
      limit: query.limit,
      cursor: query.cursor ? JSON.stringify(query.cursor) : undefined,
    });
    return this.transport.request<ListInvoicesResponse>(
      {
        method: "GET",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/billing/invoices`,
        query: params,
      },
      opts,
    );
  }

  /** GET /v1/organizations/:orgId/billing/entitlements */
  getEntitlements(
    orgId: string,
    query: GetEntitlementsRequest = {},
    opts: RequestOptions = {},
  ): Promise<GetEntitlementsResponse> {
    const params = buildQueryRecord({
      subscriptionId: query.subscriptionId,
      source: query.source,
    });
    return this.transport.request<GetEntitlementsResponse>(
      {
        method: "GET",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/billing/entitlements`,
        query: params,
      },
      opts,
    );
  }

  /**
   * POST /v1/organizations/:orgId/billing/entitlements/check
   *
   * Entitlement decision seam. The `orgId` argument is the URL scope; the
   * `entitlementKey` travels in the body. Missing entitlements surface as a
   * `denied` decision (not a 5xx) so callers can fail closed deterministically.
   */
  checkEntitlement(
    orgId: string,
    body: Pick<CheckBillingEntitlementRequest, "entitlementKey">,
    opts: RequestOptions = {},
  ): Promise<CheckBillingEntitlementResponse> {
    return this.transport.request<CheckBillingEntitlementResponse>(
      {
        method: "POST",
        path: `/v1/organizations/${encodeURIComponent(orgId)}/billing/entitlements/check`,
        body,
      },
      opts,
    );
  }
}

function buildQueryRecord(
  input: Record<string, string | number | null | undefined>,
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || v === null) continue;
    out[k] = v;
  }
  return out;
}
