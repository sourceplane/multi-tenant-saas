// API client for web-console-next.
//
// Adapted from apps/web-console/src/api.ts. Same wire shape, same typed
// envelope, single source of truth: `@saas/contracts`. The only behavioral
// changes vs. the vanilla console:
//   - the build-time env-var lock is renamed VITE_DEPLOY_ENV -> NEXT_PUBLIC_DEPLOY_ENV
//   - the client is constructed per-target rather than baked into a module
//   - error envelopes preserve the `meta.requestId` on the failure branch too,
//     so the precondition_failed upgrade UX can surface request IDs

import type {
  LoginStartResponse,
  LoginCompleteResponse,
  SessionResponse,
  ProfileResponse,
} from "@saas/contracts/auth";
import type {
  PublicOrganization,
  PublicMember,
  PublicInvitation,
  CreateInvitationResponse,
} from "@saas/contracts/membership";
import type {
  PublicProject,
  PublicEnvironment,
} from "@saas/contracts/projects";
import type { PublicAuditEntry } from "@saas/contracts/events";
import type {
  PublicApiKey,
  PublicApiKeyCreateResult,
  CreateApiKeyRequest,
} from "@saas/contracts/api-keys";
import type {
  GetEntitlementsResponse,
  GetBillingSummaryResponse,
  ListPlansResponse,
  ListInvoicesResponse,
} from "@saas/contracts/billing";

export interface ApiTarget {
  name: string;
  url: string;
}

const ALL_TARGETS: ApiTarget[] = [
  { name: "stage", url: "https://api-edge-stage.rahulvarghesepullely.workers.dev" },
  { name: "prod", url: "https://api-edge-prod.rahulvarghesepullely.workers.dev" },
];

// Single-environment lock — mirror of the existing `VITE_DEPLOY_ENV`
// invariant. Set at build time. Cross-env switching is only allowed when
// unset (which happens in local dev or in the demo route).
export const DEPLOY_ENV: string | undefined =
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_DEPLOY_ENV || undefined : undefined;

export const TARGETS: ApiTarget[] = DEPLOY_ENV
  ? ALL_TARGETS.filter((t) => t.name === DEPLOY_ENV)
  : ALL_TARGETS;

export const IS_LOCKED: boolean = TARGETS.length === 1 && !!DEPLOY_ENV;

export interface ApiErrorBody {
  code: string;
  message: string;
  reason?: string | undefined;
  details?: Record<string, unknown> | undefined;
  requestId?: string | undefined;
}

export type ApiResult<T> =
  | { ok: true; data: T; meta: { requestId: string; cursor: string | null } }
  | { ok: false; error: ApiErrorBody; status: number };

export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(target: ApiTarget) {
    this.baseUrl = target.url;
  }

  setToken(token: string | null): void {
    this.token = token;
  }
  getToken(): string | null {
    return this.token;
  }

  private async raw<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string>,
  ): Promise<ApiResult<T>> {
    let url = `${this.baseUrl}${path}`;
    if (query) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) if (v) params.set(k, v);
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }
    const headers: Record<string, string> = {};
    if (this.token) headers["authorization"] = `Bearer ${this.token}`;
    if (body) headers["content-type"] = "application/json";

    let res: Response;
    try {
      res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });
    } catch (e) {
      return {
        ok: false,
        status: 0,
        error: { code: "network_error", message: (e as Error).message || "network unreachable" },
      };
    }

    let json: Record<string, unknown> = {};
    try {
      json = (await res.json()) as Record<string, unknown>;
    } catch {
      return {
        ok: false,
        status: res.status,
        error: { code: "invalid_response", message: `non-JSON response (status ${res.status})` },
      };
    }

    if (json.error) {
      const err = json.error as ApiErrorBody;
      const meta = (json.meta ?? {}) as { requestId?: string };
      const requestId = err.requestId ?? meta.requestId;
      const merged: ApiErrorBody = { ...err };
      if (requestId !== undefined) merged.requestId = requestId;
      return { ok: false, status: res.status, error: merged };
    }

    return {
      ok: true,
      data: json.data as T,
      meta: (json.meta as { requestId: string; cursor: string | null }) ?? {
        requestId: "",
        cursor: null,
      },
    };
  }

  // ---- Auth ----
  loginStart(email: string) {
    return this.raw<LoginStartResponse>("POST", "/v1/auth/login/start", { email });
  }
  loginComplete(challengeId: string, code: string) {
    return this.raw<LoginCompleteResponse>("POST", "/v1/auth/login/complete", { challengeId, code });
  }
  getSession() {
    return this.raw<SessionResponse>("GET", "/v1/auth/session");
  }
  logout() {
    return this.raw<{ success: boolean }>("POST", "/v1/auth/logout");
  }
  getProfile() {
    return this.raw<ProfileResponse>("GET", "/v1/auth/profile");
  }

  // ---- Organizations ----
  async listOrganizations(cursor?: string): Promise<ApiResult<PublicOrganization[]>> {
    const r = await this.raw<{ organizations?: PublicOrganization[] } | PublicOrganization[]>(
      "GET",
      "/v1/organizations",
      undefined,
      cursor ? { cursor } : {},
    );
    if (!r.ok) return r;
    const arr = Array.isArray(r.data) ? r.data : r.data.organizations ?? [];
    return { ok: true, data: arr, meta: r.meta };
  }
  async createOrganization(data: { name: string; slug?: string }): Promise<ApiResult<PublicOrganization>> {
    const r = await this.raw<{ organization?: PublicOrganization } & PublicOrganization>(
      "POST",
      "/v1/organizations",
      data,
    );
    if (!r.ok) return r;
    const org = r.data.organization ?? (r.data as PublicOrganization);
    return { ok: true, data: org, meta: r.meta };
  }

  // ---- Members / Invitations ----
  async listMembers(orgId: string): Promise<ApiResult<PublicMember[]>> {
    const r = await this.raw<{ members?: PublicMember[] } | PublicMember[]>(
      "GET",
      `/v1/organizations/${orgId}/members`,
    );
    if (!r.ok) return r;
    const arr = Array.isArray(r.data) ? r.data : r.data.members ?? [];
    return { ok: true, data: arr, meta: r.meta };
  }
  async removeMember(orgId: string, memberId: string) {
    return this.raw<PublicMember>("DELETE", `/v1/organizations/${orgId}/members/${memberId}`);
  }
  async listInvitations(orgId: string): Promise<ApiResult<PublicInvitation[]>> {
    const r = await this.raw<{ invitations?: PublicInvitation[] } | PublicInvitation[]>(
      "GET",
      `/v1/organizations/${orgId}/invitations`,
    );
    if (!r.ok) return r;
    const arr = Array.isArray(r.data) ? r.data : r.data.invitations ?? [];
    return { ok: true, data: arr, meta: r.meta };
  }
  createInvitation(orgId: string, data: { email: string; role: string }) {
    return this.raw<CreateInvitationResponse>("POST", `/v1/organizations/${orgId}/invitations`, data);
  }
  revokeInvitation(orgId: string, invId: string) {
    return this.raw<PublicInvitation>("DELETE", `/v1/organizations/${orgId}/invitations/${invId}`);
  }

  // ---- Projects / Environments ----
  async listProjects(orgId: string): Promise<ApiResult<PublicProject[]>> {
    const r = await this.raw<{ projects?: PublicProject[] } | PublicProject[]>(
      "GET",
      `/v1/organizations/${orgId}/projects`,
    );
    if (!r.ok) return r;
    const arr = Array.isArray(r.data) ? r.data : r.data.projects ?? [];
    return { ok: true, data: arr, meta: r.meta };
  }
  createProject(orgId: string, data: { name: string; slug?: string }) {
    return this.raw<PublicProject>("POST", `/v1/organizations/${orgId}/projects`, data);
  }
  archiveProject(orgId: string, projectId: string) {
    return this.raw<PublicProject>("DELETE", `/v1/organizations/${orgId}/projects/${projectId}`);
  }
  async listEnvironments(orgId: string, projectId: string): Promise<ApiResult<PublicEnvironment[]>> {
    const r = await this.raw<{ environments?: PublicEnvironment[] } | PublicEnvironment[]>(
      "GET",
      `/v1/organizations/${orgId}/projects/${projectId}/environments`,
    );
    if (!r.ok) return r;
    const arr = Array.isArray(r.data) ? r.data : r.data.environments ?? [];
    return { ok: true, data: arr, meta: r.meta };
  }
  createEnvironment(orgId: string, projectId: string, data: { name: string; slug?: string }) {
    return this.raw<PublicEnvironment>("POST", `/v1/organizations/${orgId}/projects/${projectId}/environments`, data);
  }
  archiveEnvironment(orgId: string, projectId: string, envId: string) {
    return this.raw<PublicEnvironment>(
      "DELETE",
      `/v1/organizations/${orgId}/projects/${projectId}/environments/${envId}`,
    );
  }

  // ---- API keys ----
  async listApiKeys(orgId: string): Promise<ApiResult<PublicApiKey[]>> {
    const r = await this.raw<{ apiKeys?: PublicApiKey[] } | PublicApiKey[]>(
      "GET",
      `/v1/organizations/${orgId}/api-keys`,
    );
    if (!r.ok) return r;
    const arr = Array.isArray(r.data) ? r.data : r.data.apiKeys ?? [];
    return { ok: true, data: arr, meta: r.meta };
  }
  createApiKey(orgId: string, data: CreateApiKeyRequest) {
    return this.raw<PublicApiKeyCreateResult>("POST", `/v1/organizations/${orgId}/api-keys`, data);
  }
  revokeApiKey(orgId: string, keyId: string) {
    return this.raw<PublicApiKey>("DELETE", `/v1/organizations/${orgId}/api-keys/${keyId}`);
  }

  // ---- Audit ----
  async listAudit(orgId: string, opts?: { category?: string; cursor?: string }): Promise<ApiResult<PublicAuditEntry[]>> {
    const q: Record<string, string> = {};
    if (opts?.category) q.category = opts.category;
    if (opts?.cursor) q.cursor = opts.cursor;
    const r = await this.raw<{ entries?: PublicAuditEntry[]; auditEntries?: PublicAuditEntry[] } | PublicAuditEntry[]>(
      "GET",
      `/v1/organizations/${orgId}/audit`,
      undefined,
      q,
    );
    if (!r.ok) return r;
    const arr = Array.isArray(r.data) ? r.data : r.data.entries ?? r.data.auditEntries ?? [];
    return { ok: true, data: arr, meta: r.meta };
  }

  // ---- Billing ----
  listPlans() {
    return this.raw<ListPlansResponse>("GET", "/v1/billing/plans");
  }
  getBillingSummary(orgId: string) {
    return this.raw<GetBillingSummaryResponse>("GET", `/v1/organizations/${orgId}/billing/summary`);
  }
  getEntitlements(orgId: string) {
    return this.raw<GetEntitlementsResponse>("GET", `/v1/organizations/${orgId}/billing/entitlements`);
  }
  listInvoices(orgId: string) {
    return this.raw<ListInvoicesResponse>("GET", `/v1/organizations/${orgId}/billing/invoices`);
  }
}
