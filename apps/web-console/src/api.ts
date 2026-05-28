import type {
  LoginStartResponse,
  LoginCompleteResponse,
  SessionResponse,
  ProfileResponse,
  UpdateProfileRequest,
  ApiErrorEnvelope,
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
import type { PublicSecurityEvent } from "@saas/contracts/security-events";
import type {
  PublicApiKey,
  PublicApiKeyCreateResult,
  PublicApiKeyRevokeResult,
  CreateApiKeyRequest,
} from "@saas/contracts/api-keys";
import type {
  PublicSetting,
  PublicFeatureFlag,
  PublicSecretMetadata,
  CreateSettingRequest,
  UpdateSettingRequest,
  CreateSettingResponse,
  UpdateSettingResponse,
  CreateFeatureFlagRequest,
  UpdateFeatureFlagRequest,
  CreateFeatureFlagResponse,
  UpdateFeatureFlagResponse,
  CreateSecretRequest,
  RotateSecretRequest,
  CreateSecretMetadataResponse,
  RotateSecretMetadataResponse,
  RevokeSecretMetadataResponse,
} from "@saas/contracts/config";

export interface ApiTarget {
  name: string;
  url: string;
}

const ALL_TARGETS: ApiTarget[] = [
  { name: "stage", url: "https://api-edge-stage.rahulvarghesepullely.workers.dev" },
  { name: "prod", url: "https://api-edge-prod.rahulvarghesepullely.workers.dev" },
];

export const DEPLOY_ENV: string | undefined = import.meta.env.VITE_DEPLOY_ENV;

export const TARGETS: ApiTarget[] = DEPLOY_ENV
  ? ALL_TARGETS.filter((t) => t.name === DEPLOY_ENV)
  : ALL_TARGETS;

export const IS_LOCKED: boolean = TARGETS.length === 1 && !!DEPLOY_ENV;

export type ApiResult<T> =
  | { ok: true; data: T; meta: { requestId: string; cursor: string | null } }
  | { ok: false; error: ApiErrorEnvelope["error"] };

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

  private async raw(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string>,
  ): Promise<{ json: Record<string, unknown>; meta: { requestId: string; cursor: string | null } } | { error: ApiErrorEnvelope["error"] }> {
    let url = `${this.baseUrl}${path}`;
    if (query) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v) params.set(k, v);
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    const headers: Record<string, string> = {};
    if (this.token) headers["authorization"] = `Bearer ${this.token}`;
    if (body) headers["content-type"] = "application/json";

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });

    const json = await res.json() as Record<string, unknown>;

    if (json.error) {
      return { error: json.error as ApiErrorEnvelope["error"] };
    }

    return {
      json: json.data as Record<string, unknown>,
      meta: json.meta as { requestId: string; cursor: string | null },
    };
  }

  private wrapOk<T>(data: T, meta: { requestId: string; cursor: string | null }): ApiResult<T> {
    return { ok: true, data, meta };
  }

  private wrapErr<T>(error: ApiErrorEnvelope["error"]): ApiResult<T> {
    return { ok: false, error };
  }

  // Auth
  async loginStart(email: string): Promise<ApiResult<LoginStartResponse>> {
    const r = await this.raw("POST", "/v1/auth/login/start", { email });
    if ("error" in r) return this.wrapErr(r.error);
    return this.wrapOk(r.json as unknown as LoginStartResponse, r.meta);
  }

  async loginComplete(challengeId: string, code: string): Promise<ApiResult<LoginCompleteResponse>> {
    const r = await this.raw("POST", "/v1/auth/login/complete", { challengeId, code });
    if ("error" in r) return this.wrapErr(r.error);
    return this.wrapOk(r.json as unknown as LoginCompleteResponse, r.meta);
  }

  async getSession(): Promise<ApiResult<SessionResponse>> {
    const r = await this.raw("GET", "/v1/auth/session");
    if ("error" in r) return this.wrapErr(r.error);
    return this.wrapOk(r.json as unknown as SessionResponse, r.meta);
  }

  async logout(): Promise<ApiResult<{ success: boolean }>> {
    const r = await this.raw("POST", "/v1/auth/logout");
    if ("error" in r) return this.wrapErr(r.error);
    return this.wrapOk(r.json as unknown as { success: boolean }, r.meta);
  }

  // Profile (self-scoped)
  async getProfile(): Promise<ApiResult<ProfileResponse>> {
    const r = await this.raw("GET", "/v1/auth/profile");
    if ("error" in r) return this.wrapErr(r.error);
    return this.wrapOk(r.json as unknown as ProfileResponse, r.meta);
  }

  async updateProfile(data: UpdateProfileRequest): Promise<ApiResult<ProfileResponse>> {
    const r = await this.raw("PATCH", "/v1/auth/profile", data);
    if ("error" in r) return this.wrapErr(r.error);
    return this.wrapOk(r.json as unknown as ProfileResponse, r.meta);
  }

  // Organizations
  async listOrganizations(cursor?: string): Promise<ApiResult<PublicOrganization[]>> {
    const r = await this.raw("GET", "/v1/organizations", undefined, cursor ? { cursor } : {});
    if ("error" in r) return this.wrapErr(r.error);
    const orgs = (r.json as any).organizations ?? r.json;
    return this.wrapOk(Array.isArray(orgs) ? orgs : [], r.meta);
  }

  async createOrganization(data: { name: string; slug?: string }): Promise<ApiResult<PublicOrganization>> {
    const r = await this.raw("POST", "/v1/organizations", data);
    if ("error" in r) return this.wrapErr(r.error);
    const org = (r.json as any).organization ?? r.json;
    return this.wrapOk(org, r.meta);
  }

  async getOrganization(orgId: string): Promise<ApiResult<PublicOrganization>> {
    const r = await this.raw("GET", `/v1/organizations/${orgId}`);
    if ("error" in r) return this.wrapErr(r.error);
    const org = (r.json as any).organization ?? r.json;
    return this.wrapOk(org, r.meta);
  }

  // Members
  async listMembers(orgId: string, cursor?: string): Promise<ApiResult<PublicMember[]>> {
    const r = await this.raw("GET", `/v1/organizations/${orgId}/members`, undefined, cursor ? { cursor } : {});
    if ("error" in r) return this.wrapErr(r.error);
    const members = (r.json as any).members ?? r.json;
    return this.wrapOk(Array.isArray(members) ? members : [], r.meta);
  }

  async updateMemberRole(orgId: string, memberId: string, data: { role: string }): Promise<ApiResult<PublicMember>> {
    const r = await this.raw("PATCH", `/v1/organizations/${orgId}/members/${memberId}`, data);
    if ("error" in r) return this.wrapErr(r.error);
    const member = (r.json as any).member ?? r.json;
    return this.wrapOk(member, r.meta);
  }

  async removeMember(orgId: string, memberId: string): Promise<ApiResult<PublicMember>> {
    const r = await this.raw("DELETE", `/v1/organizations/${orgId}/members/${memberId}`);
    if ("error" in r) return this.wrapErr(r.error);
    const member = (r.json as any).member ?? r.json;
    return this.wrapOk(member, r.meta);
  }

  // Invitations
  async listInvitations(orgId: string, cursor?: string): Promise<ApiResult<PublicInvitation[]>> {
    const r = await this.raw("GET", `/v1/organizations/${orgId}/invitations`, undefined, cursor ? { cursor } : {});
    if ("error" in r) return this.wrapErr(r.error);
    const invitations = (r.json as any).invitations ?? r.json;
    return this.wrapOk(Array.isArray(invitations) ? invitations : [], r.meta);
  }

  async createInvitation(orgId: string, data: { email: string; role: string }): Promise<ApiResult<CreateInvitationResponse>> {
    const r = await this.raw("POST", `/v1/organizations/${orgId}/invitations`, data);
    if ("error" in r) return this.wrapErr(r.error);
    return this.wrapOk(r.json as unknown as CreateInvitationResponse, r.meta);
  }

  async revokeInvitation(orgId: string, invitationId: string): Promise<ApiResult<PublicInvitation>> {
    const r = await this.raw("DELETE", `/v1/organizations/${orgId}/invitations/${invitationId}`);
    if ("error" in r) return this.wrapErr(r.error);
    const inv = (r.json as any).invitation ?? r.json;
    return this.wrapOk(inv, r.meta);
  }

  async acceptInvitation(orgId: string, token: string): Promise<ApiResult<{ invitation: PublicInvitation; membership: unknown }>> {
    const r = await this.raw("POST", `/v1/organizations/${orgId}/invitations/accept`, { token });
    if ("error" in r) return this.wrapErr(r.error);
    return this.wrapOk(r.json as unknown as { invitation: PublicInvitation; membership: unknown }, r.meta);
  }

  // Projects
  async listProjects(orgId: string, cursor?: string): Promise<ApiResult<PublicProject[]>> {
    const r = await this.raw("GET", `/v1/organizations/${orgId}/projects`, undefined, cursor ? { cursor } : {});
    if ("error" in r) return this.wrapErr(r.error);
    const projects = (r.json as any).projects ?? r.json;
    return this.wrapOk(Array.isArray(projects) ? projects : [], r.meta);
  }

  async createProject(orgId: string, data: { name: string; slug?: string }): Promise<ApiResult<PublicProject>> {
    const r = await this.raw("POST", `/v1/organizations/${orgId}/projects`, data);
    if ("error" in r) return this.wrapErr(r.error);
    const project = (r.json as any).project ?? r.json;
    return this.wrapOk(project, r.meta);
  }

  async getProject(orgId: string, projectId: string): Promise<ApiResult<PublicProject>> {
    const r = await this.raw("GET", `/v1/organizations/${orgId}/projects/${projectId}`);
    if ("error" in r) return this.wrapErr(r.error);
    const project = (r.json as any).project ?? r.json;
    return this.wrapOk(project, r.meta);
  }

  async archiveProject(orgId: string, projectId: string): Promise<ApiResult<PublicProject>> {
    const r = await this.raw("DELETE", `/v1/organizations/${orgId}/projects/${projectId}`);
    if ("error" in r) return this.wrapErr(r.error);
    const project = (r.json as any).project ?? r.json;
    return this.wrapOk(project, r.meta);
  }

  // Environments
  async listEnvironments(orgId: string, projectId: string, cursor?: string): Promise<ApiResult<PublicEnvironment[]>> {
    const r = await this.raw("GET", `/v1/organizations/${orgId}/projects/${projectId}/environments`, undefined, cursor ? { cursor } : {});
    if ("error" in r) return this.wrapErr(r.error);
    const environments = (r.json as any).environments ?? r.json;
    return this.wrapOk(Array.isArray(environments) ? environments : [], r.meta);
  }

  async createEnvironment(orgId: string, projectId: string, data: { name: string; slug?: string }): Promise<ApiResult<PublicEnvironment>> {
    const r = await this.raw("POST", `/v1/organizations/${orgId}/projects/${projectId}/environments`, data);
    if ("error" in r) return this.wrapErr(r.error);
    const env = (r.json as any).environment ?? r.json;
    return this.wrapOk(env, r.meta);
  }

  async getEnvironment(orgId: string, projectId: string, envId: string): Promise<ApiResult<PublicEnvironment>> {
    const r = await this.raw("GET", `/v1/organizations/${orgId}/projects/${projectId}/environments/${envId}`);
    if ("error" in r) return this.wrapErr(r.error);
    const env = (r.json as any).environment ?? r.json;
    return this.wrapOk(env, r.meta);
  }

  async archiveEnvironment(orgId: string, projectId: string, envId: string): Promise<ApiResult<PublicEnvironment>> {
    const r = await this.raw("DELETE", `/v1/organizations/${orgId}/projects/${projectId}/environments/${envId}`);
    if ("error" in r) return this.wrapErr(r.error);
    const env = (r.json as any).environment ?? r.json;
    return this.wrapOk(env, r.meta);
  }

  // Audit
  async listAuditEntries(
    orgId: string,
    opts?: { category?: string; cursor?: string; limit?: string },
  ): Promise<ApiResult<PublicAuditEntry[]>> {
    const query: Record<string, string> = {};
    if (opts?.category) query.category = opts.category;
    if (opts?.cursor) query.cursor = opts.cursor;
    if (opts?.limit) query.limit = opts.limit;
    const r = await this.raw("GET", `/v1/organizations/${orgId}/audit`, undefined, query);
    if ("error" in r) return this.wrapErr(r.error);
    const entries = (r.json as any).entries ?? (r.json as any).auditEntries ?? r.json;
    return this.wrapOk(Array.isArray(entries) ? entries : [], r.meta);
  }

  // Security Events (user-scoped, no orgId required)
  async listSecurityEvents(
    opts?: { cursor?: string; limit?: string },
  ): Promise<ApiResult<PublicSecurityEvent[]>> {
    const query: Record<string, string> = {};
    if (opts?.cursor) query.cursor = opts.cursor;
    if (opts?.limit) query.limit = opts.limit;
    const r = await this.raw("GET", "/v1/auth/security-events", undefined, query);
    if ("error" in r) return this.wrapErr(r.error);
    const events = (r.json as any).securityEvents ?? r.json;
    return this.wrapOk(Array.isArray(events) ? events : [], r.meta);
  }

  // API Keys (org-scoped)
  async listApiKeys(
    orgId: string,
    opts?: { cursor?: string; limit?: string; projectId?: string },
  ): Promise<ApiResult<PublicApiKey[]>> {
    const query: Record<string, string> = {};
    if (opts?.cursor) query.cursor = opts.cursor;
    if (opts?.limit) query.limit = opts.limit;
    if (opts?.projectId) query.projectId = opts.projectId;
    const r = await this.raw("GET", `/v1/organizations/${orgId}/api-keys`, undefined, query);
    if ("error" in r) return this.wrapErr(r.error);
    const keys = (r.json as any).apiKeys ?? r.json;
    return this.wrapOk(Array.isArray(keys) ? keys : [], r.meta);
  }

  async createApiKey(
    orgId: string,
    data: CreateApiKeyRequest,
  ): Promise<ApiResult<PublicApiKeyCreateResult>> {
    const r = await this.raw("POST", `/v1/organizations/${orgId}/api-keys`, data);
    if ("error" in r) return this.wrapErr(r.error);
    const apiKey = (r.json as any).apiKey ?? r.json;
    return this.wrapOk(apiKey, r.meta);
  }

  async revokeApiKey(
    orgId: string,
    apiKeyId: string,
  ): Promise<ApiResult<PublicApiKeyRevokeResult>> {
    const r = await this.raw("DELETE", `/v1/organizations/${orgId}/api-keys/${apiKeyId}`);
    if ("error" in r) return this.wrapErr(r.error);
    const apiKey = (r.json as any).apiKey ?? r.json;
    return this.wrapOk(apiKey, r.meta);
  }

  // Config — Settings
  async listConfigSettings(
    orgId: string,
    opts?: { projectId?: string; environmentId?: string; cursor?: string; limit?: string },
  ): Promise<ApiResult<PublicSetting[]>> {
    const query: Record<string, string> = {};
    if (opts?.cursor) query.cursor = opts.cursor;
    if (opts?.limit) query.limit = opts.limit;
    let path: string;
    if (opts?.projectId && opts?.environmentId) {
      path = `/v1/organizations/${orgId}/projects/${opts.projectId}/environments/${opts.environmentId}/config/settings`;
    } else if (opts?.projectId) {
      path = `/v1/organizations/${orgId}/projects/${opts.projectId}/config/settings`;
    } else {
      path = `/v1/organizations/${orgId}/config/settings`;
    }
    const r = await this.raw("GET", path, undefined, query);
    if ("error" in r) return this.wrapErr(r.error);
    const settings = (r.json as any).settings ?? r.json;
    return this.wrapOk(Array.isArray(settings) ? settings : [], r.meta);
  }

  // Config — Feature Flags
  async listFeatureFlags(
    orgId: string,
    opts?: { projectId?: string; environmentId?: string; cursor?: string; limit?: string },
  ): Promise<ApiResult<PublicFeatureFlag[]>> {
    const query: Record<string, string> = {};
    if (opts?.cursor) query.cursor = opts.cursor;
    if (opts?.limit) query.limit = opts.limit;
    let path: string;
    if (opts?.projectId && opts?.environmentId) {
      path = `/v1/organizations/${orgId}/projects/${opts.projectId}/environments/${opts.environmentId}/config/feature-flags`;
    } else if (opts?.projectId) {
      path = `/v1/organizations/${orgId}/projects/${opts.projectId}/config/feature-flags`;
    } else {
      path = `/v1/organizations/${orgId}/config/feature-flags`;
    }
    const r = await this.raw("GET", path, undefined, query);
    if ("error" in r) return this.wrapErr(r.error);
    const flags = (r.json as any).featureFlags ?? r.json;
    return this.wrapOk(Array.isArray(flags) ? flags : [], r.meta);
  }

  // Config — scoped path helper
  private configPath(
    orgId: string,
    resource: string,
    opts?: { projectId?: string; environmentId?: string },
    itemId?: string,
  ): string {
    let base: string;
    if (opts?.projectId && opts?.environmentId) {
      base = `/v1/organizations/${orgId}/projects/${opts.projectId}/environments/${opts.environmentId}/config/${resource}`;
    } else if (opts?.projectId) {
      base = `/v1/organizations/${orgId}/projects/${opts.projectId}/config/${resource}`;
    } else {
      base = `/v1/organizations/${orgId}/config/${resource}`;
    }
    return itemId ? `${base}/${itemId}` : base;
  }

  // Config — Setting Mutations
  async createSetting(
    orgId: string,
    data: CreateSettingRequest,
    opts?: { projectId?: string; environmentId?: string },
  ): Promise<ApiResult<CreateSettingResponse>> {
    const path = this.configPath(orgId, "settings", opts);
    const r = await this.raw("POST", path, data);
    if ("error" in r) return this.wrapErr(r.error);
    const setting = (r.json as any).setting ?? r.json;
    return this.wrapOk({ setting }, r.meta);
  }

  async updateSetting(
    orgId: string,
    settingId: string,
    data: UpdateSettingRequest,
    opts?: { projectId?: string; environmentId?: string },
  ): Promise<ApiResult<UpdateSettingResponse>> {
    const path = this.configPath(orgId, "settings", opts, settingId);
    const r = await this.raw("PATCH", path, data);
    if ("error" in r) return this.wrapErr(r.error);
    const setting = (r.json as any).setting ?? r.json;
    return this.wrapOk({ setting }, r.meta);
  }

  // Config — Feature Flag Mutations
  async createFeatureFlag(
    orgId: string,
    data: CreateFeatureFlagRequest,
    opts?: { projectId?: string; environmentId?: string },
  ): Promise<ApiResult<CreateFeatureFlagResponse>> {
    const path = this.configPath(orgId, "feature-flags", opts);
    const r = await this.raw("POST", path, data);
    if ("error" in r) return this.wrapErr(r.error);
    const featureFlag = (r.json as any).featureFlag ?? r.json;
    return this.wrapOk({ featureFlag }, r.meta);
  }

  async updateFeatureFlag(
    orgId: string,
    flagId: string,
    data: UpdateFeatureFlagRequest,
    opts?: { projectId?: string; environmentId?: string },
  ): Promise<ApiResult<UpdateFeatureFlagResponse>> {
    const path = this.configPath(orgId, "feature-flags", opts, flagId);
    const r = await this.raw("PATCH", path, data);
    if ("error" in r) return this.wrapErr(r.error);
    const featureFlag = (r.json as any).featureFlag ?? r.json;
    return this.wrapOk({ featureFlag }, r.meta);
  }

  // Config — Secret Mutations
  async createSecret(
    orgId: string,
    data: CreateSecretRequest,
    opts?: { projectId?: string; environmentId?: string },
  ): Promise<ApiResult<CreateSecretMetadataResponse>> {
    const path = this.configPath(orgId, "secrets", opts);
    const r = await this.raw("POST", path, data);
    if ("error" in r) return this.wrapErr(r.error);
    const secret = (r.json as any).secret ?? r.json;
    return this.wrapOk({ secret }, r.meta);
  }

  async rotateSecret(
    orgId: string,
    secretId: string,
    data: RotateSecretRequest,
    opts?: { projectId?: string; environmentId?: string },
  ): Promise<ApiResult<RotateSecretMetadataResponse>> {
    const path = this.configPath(orgId, "secrets", opts, secretId) + "/rotate";
    const r = await this.raw("POST", path, data);
    if ("error" in r) return this.wrapErr(r.error);
    const secret = (r.json as any).secret ?? r.json;
    return this.wrapOk({ secret }, r.meta);
  }

  async revokeSecret(
    orgId: string,
    secretId: string,
    opts?: { projectId?: string; environmentId?: string },
  ): Promise<ApiResult<RevokeSecretMetadataResponse>> {
    const path = this.configPath(orgId, "secrets", opts, secretId);
    const r = await this.raw("DELETE", path);
    if ("error" in r) return this.wrapErr(r.error);
    const secret = (r.json as any).secret ?? r.json;
    return this.wrapOk({ secret }, r.meta);
  }

  // Config — Secret Metadata
  async listSecretMetadata(
    orgId: string,
    opts?: { projectId?: string; environmentId?: string; cursor?: string; limit?: string },
  ): Promise<ApiResult<PublicSecretMetadata[]>> {
    const query: Record<string, string> = {};
    if (opts?.cursor) query.cursor = opts.cursor;
    if (opts?.limit) query.limit = opts.limit;
    let path: string;
    if (opts?.projectId && opts?.environmentId) {
      path = `/v1/organizations/${orgId}/projects/${opts.projectId}/environments/${opts.environmentId}/config/secrets`;
    } else if (opts?.projectId) {
      path = `/v1/organizations/${orgId}/projects/${opts.projectId}/config/secrets`;
    } else {
      path = `/v1/organizations/${orgId}/config/secrets`;
    }
    const r = await this.raw("GET", path, undefined, query);
    if ("error" in r) return this.wrapErr(r.error);
    const secrets = (r.json as any).secrets ?? r.json;
    return this.wrapOk(Array.isArray(secrets) ? secrets : [], r.meta);
  }
}
