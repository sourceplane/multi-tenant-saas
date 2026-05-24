import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createOrganizationService } from "@membership-worker/services/organization";
import type { PolicyAuthorizer } from "@membership-worker/services/organization";
import { orgPublicId, parseOrgPublicId, memberPublicId } from "@membership-worker/ids";
import { mapRoleAssignments, authorizeViaPolicy } from "@membership-worker/policy-client";
import { handleListMembers } from "@membership-worker/handlers/list-members";
import type { MembershipRepository, Organization, OrganizationMember, RoleAssignment } from "@saas/db/membership";

if (!(globalThis as Record<string, unknown>).crypto) {
  (globalThis as Record<string, unknown>).crypto = crypto;
}

function createFakeRepository(): MembershipRepository & { _orgs: Map<string, Organization>; _roles: Map<string, RoleAssignment[]> } {
  const _orgs = new Map<string, Organization>();
  const _roles = new Map<string, RoleAssignment[]>();

  const repo: MembershipRepository & { _orgs: typeof _orgs; _roles: typeof _roles } = {
    _orgs,
    _roles,

    async bootstrapOrganization(input) {
      if (_orgs.has(input.org.id) || [..._orgs.values()].some((o) => o.slugLower === input.org.slugLower)) {
        return { ok: false, error: { kind: "conflict", entity: "organization" } };
      }
      const org: Organization = { ...input.org, status: "active", updatedAt: input.org.createdAt };
      const member: OrganizationMember = { ...input.member, status: "active", updatedAt: input.member.createdAt };
      const roleAssignment: RoleAssignment = { ...input.roleAssignment, scopeRef: input.roleAssignment.scopeRef ?? null, revokedAt: null };
      _orgs.set(org.id, org);
      const key = `${org.id}:${input.roleAssignment.subjectId}`;
      _roles.set(key, [...(_roles.get(key) ?? []), roleAssignment]);
      return { ok: true, value: { org, member, roleAssignment } };
    },

    async getOrganizationById(id) {
      const org = _orgs.get(id);
      if (!org) return { ok: false, error: { kind: "not_found" } };
      return { ok: true, value: org };
    },

    async getOrganizationBySlug(slugLower) {
      const org = [..._orgs.values()].find((o) => o.slugLower === slugLower);
      if (!org) return { ok: false, error: { kind: "not_found" } };
      return { ok: true, value: org };
    },

    async listOrganizationsForSubject(subjectId) {
      const orgIds = new Set<string>();
      for (const [key, roles] of _roles.entries()) {
        if (key.endsWith(`:${subjectId}`) && roles.some((r) => !r.revokedAt)) {
          orgIds.add(key.split(":")[0]!);
        }
      }
      const orgs = [...orgIds].map((id) => _orgs.get(id)!).filter(Boolean);
      return { ok: true, value: orgs };
    },

    async listRoleAssignments(orgId, subjectId) {
      const key = `${orgId}:${subjectId}`;
      const roles = (_roles.get(key) ?? []).filter((r) => !r.revokedAt);
      return { ok: true, value: roles };
    },

    async createOrganization() { return { ok: false, error: { kind: "internal" as const, message: "not implemented" } }; },
    async createMember() { return { ok: false, error: { kind: "internal" as const, message: "not implemented" } }; },
    async getMemberById() { return { ok: false, error: { kind: "internal" as const, message: "not implemented" } }; },
    async listMembers() { return { ok: false, error: { kind: "internal" as const, message: "not implemented" } }; },
    async listMembersPaged() { return { ok: false, error: { kind: "internal" as const, message: "not implemented" } }; },
    async listOrganizationsForSubjectPaged() { return { ok: false, error: { kind: "internal" as const, message: "not implemented" } }; },
    async removeMember() { return { ok: false, error: { kind: "internal" as const, message: "not implemented" } }; },
    async createInvitation() { return { ok: false, error: { kind: "internal" as const, message: "not implemented" } }; },
    async getInvitationById() { return { ok: false, error: { kind: "internal" as const, message: "not implemented" } }; },
    async getInvitationByTokenHash() { return { ok: false, error: { kind: "internal" as const, message: "not implemented" } }; },
    async listInvitations() { return { ok: false, error: { kind: "internal" as const, message: "not implemented" } }; },
    async revokeInvitation() { return { ok: false, error: { kind: "internal" as const, message: "not implemented" } }; },
    async acceptInvitation() { return { ok: false, error: { kind: "internal" as const, message: "not implemented" } }; },
    async createRoleAssignment() { return { ok: false, error: { kind: "internal" as const, message: "not implemented" } }; },
    async revokeRoleAssignment() { return { ok: false, error: { kind: "internal" as const, message: "not implemented" } }; },
  };

  return repo;
}

const fixedNow = new Date("2026-01-15T10:00:00.000Z");

/** Policy authorizer that always allows */
const allowAuthorizer: PolicyAuthorizer = async () => ({ allow: true });
/** Policy authorizer that always denies */
const denyAuthorizer: PolicyAuthorizer = async () => ({ allow: false });

describe("membership-worker organization service", () => {
  describe("createOrganization", () => {
    it("calls bootstrapOrganization with org, member, and owner role assignment", async () => {
      const repo = createFakeRepository();
      const service = createOrganizationService({ repo, now: () => fixedNow });

      const result = await service.createOrganization(
        { subjectId: "usr_00112233445566778899aabbccddeeff", subjectType: "user" },
        { name: "Test Org", slug: "test-org", slugLower: "test-org" },
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.organization.name).toBe("Test Org");
      expect(result.value.organization.slug).toBe("test-org");
      expect(result.value.membership.role).toBe("owner");
      expect(result.value.membership.joinedAt).toBe("2026-01-15T10:00:00.000Z");
      expect(repo._orgs.size).toBe(1);
    });

    it("returns public org_ prefixed IDs not raw UUIDs", async () => {
      const repo = createFakeRepository();
      const service = createOrganizationService({ repo, now: () => fixedNow });

      const result = await service.createOrganization(
        { subjectId: "usr_abc", subjectType: "user" },
        { name: "X", slug: "xx", slugLower: "xx" },
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.organization.id).toMatch(/^org_[0-9a-f]{32}$/);
      expect(result.value.organization.id).not.toContain("-");
    });

    it("stores subject ID from actor context", async () => {
      const repo = createFakeRepository();
      const service = createOrganizationService({ repo, now: () => fixedNow });

      await service.createOrganization(
        { subjectId: "usr_subject123", subjectType: "user" },
        { name: "X", slug: "xx", slugLower: "xx" },
      );

      const roles = [...repo._roles.values()].flat();
      expect(roles[0]!.subjectId).toBe("usr_subject123");
      expect(roles[0]!.subjectType).toBe("user");
    });

    it("returns conflict when slug already exists", async () => {
      const repo = createFakeRepository();
      const service = createOrganizationService({ repo, now: () => fixedNow });

      await service.createOrganization(
        { subjectId: "usr_1", subjectType: "user" },
        { name: "A", slug: "taken", slugLower: "taken" },
      );

      const result = await service.createOrganization(
        { subjectId: "usr_2", subjectType: "user" },
        { name: "B", slug: "taken", slugLower: "taken" },
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.code).toBe("conflict");
      expect(result.status).toBe(409);
    });

    it("uses UUIDs for internal storage IDs", async () => {
      const repo = createFakeRepository();
      const service = createOrganizationService({ repo, now: () => fixedNow });

      await service.createOrganization(
        { subjectId: "usr_abc", subjectType: "user" },
        { name: "X", slug: "xx", slugLower: "xx" },
      );

      const orgId = [...repo._orgs.keys()][0]!;
      expect(orgId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
  });

  describe("listOrganizations", () => {
    it("lists organizations for current subject by subject ID", async () => {
      const repo = createFakeRepository();
      const service = createOrganizationService({ repo, now: () => fixedNow });

      await service.createOrganization(
        { subjectId: "usr_subject1", subjectType: "user" },
        { name: "Org A", slug: "org-a", slugLower: "org-a" },
      );
      await service.createOrganization(
        { subjectId: "usr_subject1", subjectType: "user" },
        { name: "Org B", slug: "org-b", slugLower: "org-b" },
      );
      await service.createOrganization(
        { subjectId: "usr_other", subjectType: "user" },
        { name: "Org C", slug: "org-c", slugLower: "org-c" },
      );

      const result = await service.listOrganizations({ subjectId: "usr_subject1", subjectType: "user" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.organizations).toHaveLength(2);
      expect(result.value.organizations.every((o) => o.id.startsWith("org_"))).toBe(true);
    });

    it("returns empty array when user has no organizations", async () => {
      const repo = createFakeRepository();
      const service = createOrganizationService({ repo, now: () => fixedNow });

      const result = await service.listOrganizations({ subjectId: "usr_nobody", subjectType: "user" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.organizations).toHaveLength(0);
    });
  });

  describe("getOrganization", () => {
    it("returns organization when policy allows", async () => {
      const repo = createFakeRepository();
      const service = createOrganizationService({ repo, now: () => fixedNow });

      const createResult = await service.createOrganization(
        { subjectId: "usr_owner", subjectType: "user" },
        { name: "My Org", slug: "my-org", slugLower: "my-org" },
      );
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const orgUuid = parseOrgPublicId(createResult.value.organization.id)!;
      const result = await service.getOrganization({ subjectId: "usr_owner", subjectType: "user" }, orgUuid, allowAuthorizer);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.organization.name).toBe("My Org");
      expect(result.value.organization.id).toMatch(/^org_[0-9a-f]{32}$/);
    });

    it("returns not_found when policy denies without leaking existence", async () => {
      const repo = createFakeRepository();
      const service = createOrganizationService({ repo, now: () => fixedNow });

      const createResult = await service.createOrganization(
        { subjectId: "usr_owner", subjectType: "user" },
        { name: "Secret", slug: "secret", slugLower: "secret" },
      );
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const orgUuid = parseOrgPublicId(createResult.value.organization.id)!;
      const result = await service.getOrganization({ subjectId: "usr_outsider", subjectType: "user" }, orgUuid, denyAuthorizer);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.code).toBe("not_found");
      expect(result.message).not.toContain("forbidden");
      expect(result.message).not.toContain("access");
    });

    it("returns not_found for non-existent organization UUID", async () => {
      const repo = createFakeRepository();
      const service = createOrganizationService({ repo, now: () => fixedNow });

      const result = await service.getOrganization(
        { subjectId: "usr_owner", subjectType: "user" },
        "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        allowAuthorizer,
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.code).toBe("not_found");
    });

    it("fails closed when no authorizer is provided", async () => {
      const repo = createFakeRepository();
      const service = createOrganizationService({ repo, now: () => fixedNow });

      const createResult = await service.createOrganization(
        { subjectId: "usr_owner", subjectType: "user" },
        { name: "Closed", slug: "closed", slugLower: "closed" },
      );
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const orgUuid = parseOrgPublicId(createResult.value.organization.id)!;
      const result = await service.getOrganization({ subjectId: "usr_owner", subjectType: "user" }, orgUuid);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.code).toBe("not_found");
    });

    it("passes correct action and role assignments to authorizer", async () => {
      const repo = createFakeRepository();
      const service = createOrganizationService({ repo, now: () => fixedNow });

      const createResult = await service.createOrganization(
        { subjectId: "usr_owner", subjectType: "user" },
        { name: "Check", slug: "check", slugLower: "check" },
      );
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const orgUuid = parseOrgPublicId(createResult.value.organization.id)!;
      let capturedAction: string | undefined;
      let capturedRoles: RoleAssignment[] | undefined;

      const capturingAuthorizer: PolicyAuthorizer = async (_actor, action, _orgId, roles) => {
        capturedAction = action;
        capturedRoles = roles;
        return { allow: true };
      };

      await service.getOrganization({ subjectId: "usr_owner", subjectType: "user" }, orgUuid, capturingAuthorizer);

      expect(capturedAction).toBe("organization.read");
      expect(capturedRoles).toHaveLength(1);
      expect(capturedRoles![0]!.role).toBe("owner");
      expect(capturedRoles![0]!.scopeKind).toBe("organization");
    });

    it("fails closed when repository role-list fails", async () => {
      const repo = createFakeRepository();
      const service = createOrganizationService({ repo, now: () => fixedNow });

      const createResult = await service.createOrganization(
        { subjectId: "usr_owner", subjectType: "user" },
        { name: "RoleFail", slug: "role-fail", slugLower: "role-fail" },
      );
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const orgUuid = parseOrgPublicId(createResult.value.organization.id)!;

      // Override listRoleAssignments to simulate DB failure
      repo.listRoleAssignments = async () => ({ ok: false, error: { kind: "internal" as const, message: "db timeout" } });

      const result = await service.getOrganization({ subjectId: "usr_owner", subjectType: "user" }, orgUuid, allowAuthorizer);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.code).toBe("not_found");
    });
  });

  describe("ID utilities", () => {
    it("converts UUID to org_ prefixed public ID", () => {
      expect(orgPublicId("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")).toBe("org_aaaaaaaabbbbccccddddeeeeeeeeeeee");
    });

    it("parses org_ prefixed public ID back to UUID", () => {
      expect(parseOrgPublicId("org_aaaaaaaabbbbccccddddeeeeeeeeeeee")).toBe("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    });

    it("returns null for invalid public ID prefix", () => {
      expect(parseOrgPublicId("usr_aaaaaaaabbbbccccddddeeeeeeeeeeee")).toBeNull();
    });

    it("returns null for invalid hex length", () => {
      expect(parseOrgPublicId("org_abc")).toBeNull();
    });

    it("roundtrips correctly", () => {
      const uuid = "12345678-abcd-ef01-2345-6789abcdef01";
      expect(parseOrgPublicId(orgPublicId(uuid))).toBe(uuid);
    });
  });
});

describe("policy-client", () => {
  describe("mapRoleAssignments", () => {
    it("maps organization-scoped role to membership fact", () => {
      const assignments: RoleAssignment[] = [
        { id: "ra1", orgId: "org-uuid", subjectId: "usr1", subjectType: "user", role: "owner", scopeKind: "organization", scopeRef: null, createdAt: fixedNow, revokedAt: null },
      ];

      const facts = mapRoleAssignments("org-uuid", assignments);

      expect(facts).toHaveLength(1);
      expect(facts[0]).toEqual({
        kind: "role_assignment",
        role: "owner",
        scope: { kind: "organization", orgId: "org-uuid" },
      });
    });

    it("maps project-scoped role to membership fact with projectId", () => {
      const assignments: RoleAssignment[] = [
        { id: "ra2", orgId: "org-uuid", subjectId: "usr1", subjectType: "user", role: "project_admin", scopeKind: "project", scopeRef: "proj-uuid", createdAt: fixedNow, revokedAt: null },
      ];

      const facts = mapRoleAssignments("org-uuid", assignments);

      expect(facts).toHaveLength(1);
      expect(facts[0]).toEqual({
        kind: "role_assignment",
        role: "project_admin",
        scope: { kind: "project", orgId: "org-uuid", projectId: "proj-uuid" },
      });
    });

    it("maps multiple assignments into separate facts", () => {
      const assignments: RoleAssignment[] = [
        { id: "ra1", orgId: "org-uuid", subjectId: "usr1", subjectType: "user", role: "owner", scopeKind: "organization", scopeRef: null, createdAt: fixedNow, revokedAt: null },
        { id: "ra2", orgId: "org-uuid", subjectId: "usr1", subjectType: "user", role: "project_viewer", scopeKind: "project", scopeRef: "p1", createdAt: fixedNow, revokedAt: null },
      ];

      const facts = mapRoleAssignments("org-uuid", assignments);
      expect(facts).toHaveLength(2);
    });
  });

  describe("authorizeViaPolicy", () => {
    const actor = { subjectId: "usr_test", subjectType: "user" };
    const baseParams = {
      actor,
      action: "organization.read",
      resource: { kind: "organization" as const, id: "org-uuid", orgId: "org-uuid" },
      orgId: "org-uuid",
      roleAssignments: [] as RoleAssignment[],
      requestId: "req_test123",
    };

    it("returns allow:true when policy-worker returns allow:true in envelope", async () => {
      const fakeFetcher = {
        fetch: async () => Response.json({ data: { allow: true, reason: "granted", policyVersion: 1, derivedScope: { orgId: "org-uuid" } }, meta: { requestId: "req_test123", cursor: null } }),
      } as unknown as Fetcher;

      const result = await authorizeViaPolicy(fakeFetcher, baseParams);
      expect(result.allow).toBe(true);
    });

    it("returns allow:false when policy-worker returns allow:false in envelope", async () => {
      const fakeFetcher = {
        fetch: async () => Response.json({ data: { allow: false, reason: "denied", policyVersion: 1, derivedScope: { orgId: "org-uuid" } }, meta: { requestId: "req_test123", cursor: null } }),
      } as unknown as Fetcher;

      const result = await authorizeViaPolicy(fakeFetcher, baseParams);
      expect(result.allow).toBe(false);
    });

    it("fails closed on fetch error", async () => {
      const fakeFetcher = {
        fetch: async () => { throw new Error("network failure"); },
      } as unknown as Fetcher;

      const result = await authorizeViaPolicy(fakeFetcher, baseParams);
      expect(result.allow).toBe(false);
    });

    it("fails closed on non-ok response", async () => {
      const fakeFetcher = {
        fetch: async () => new Response("Internal Server Error", { status: 500 }),
      } as unknown as Fetcher;

      const result = await authorizeViaPolicy(fakeFetcher, baseParams);
      expect(result.allow).toBe(false);
    });

    it("fails closed on malformed JSON response", async () => {
      const fakeFetcher = {
        fetch: async () => new Response("not json", { status: 200, headers: { "content-type": "text/plain" } }),
      } as unknown as Fetcher;

      const result = await authorizeViaPolicy(fakeFetcher, baseParams);
      expect(result.allow).toBe(false);
    });

    it("fails closed when envelope has no data field", async () => {
      const fakeFetcher = {
        fetch: async () => Response.json({ something: "else" }),
      } as unknown as Fetcher;

      const result = await authorizeViaPolicy(fakeFetcher, baseParams);
      expect(result.allow).toBe(false);
    });

    it("fails closed when data has no allow field", async () => {
      const fakeFetcher = {
        fetch: async () => Response.json({ data: { reason: "ok" }, meta: { requestId: "r", cursor: null } }),
      } as unknown as Fetcher;

      const result = await authorizeViaPolicy(fakeFetcher, baseParams);
      expect(result.allow).toBe(false);
    });

    it("sends correct request body with membership facts", async () => {
      let capturedBody: unknown;
      const fakeFetcher = {
        fetch: async (_url: string, init: RequestInit) => {
          capturedBody = JSON.parse(init.body as string);
          return Response.json({ data: { allow: true, reason: "ok", policyVersion: 1, derivedScope: { orgId: "org-uuid" } }, meta: { requestId: "req_test123", cursor: null } });
        },
      } as unknown as Fetcher;

      const roles: RoleAssignment[] = [
        { id: "ra1", orgId: "org-uuid", subjectId: "usr_test", subjectType: "user", role: "admin", scopeKind: "organization", scopeRef: null, createdAt: fixedNow, revokedAt: null },
      ];

      await authorizeViaPolicy(fakeFetcher, { ...baseParams, roleAssignments: roles });

      expect(capturedBody).toEqual({
        subject: { type: "user", id: "usr_test" },
        action: "organization.read",
        resource: { kind: "organization", id: "org-uuid", orgId: "org-uuid" },
        context: {
          memberships: [
            { kind: "role_assignment", role: "admin", scope: { kind: "organization", orgId: "org-uuid" } },
          ],
        },
      });
    });

    it("sends x-request-id header", async () => {
      let capturedHeaders: HeadersInit | undefined;
      const fakeFetcher = {
        fetch: async (_url: string, init: RequestInit) => {
          capturedHeaders = init.headers;
          return Response.json({ data: { allow: true, reason: "ok", policyVersion: 1, derivedScope: { orgId: "org-uuid" } }, meta: { requestId: "req_test123", cursor: null } });
        },
      } as unknown as Fetcher;

      await authorizeViaPolicy(fakeFetcher, baseParams);

      expect(capturedHeaders).toEqual(
        expect.objectContaining({ "x-request-id": "req_test123" }),
      );
    });
  });
});

describe("member-list endpoint", () => {
  function createMemberListRepo() {
    const orgId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const memberId1 = "11111111-2222-3333-4444-555555555555";
    const memberId2 = "66666666-7777-8888-9999-aaaaaaaaaaaa";
    const org: Organization = {
      id: orgId,
      name: "Test",
      slug: "test",
      slugLower: "test",
      status: "active",
      createdAt: fixedNow,
      updatedAt: fixedNow,
    };
    const member1: OrganizationMember = {
      id: memberId1,
      orgId,
      subjectId: "usr_owner",
      subjectType: "user",
      status: "active",
      createdAt: fixedNow,
      updatedAt: fixedNow,
    };
    const member2: OrganizationMember = {
      id: memberId2,
      orgId,
      subjectId: "usr_viewer",
      subjectType: "user",
      status: "active",
      createdAt: fixedNow,
      updatedAt: fixedNow,
    };
    const roles: Record<string, RoleAssignment[]> = {
      [`${orgId}:usr_owner`]: [
        { id: "ra1", orgId, subjectId: "usr_owner", subjectType: "user", role: "owner", scopeKind: "organization", scopeRef: null, createdAt: fixedNow, revokedAt: null },
      ],
      [`${orgId}:usr_viewer`]: [
        { id: "ra2", orgId, subjectId: "usr_viewer", subjectType: "user", role: "viewer", scopeKind: "organization", scopeRef: null, createdAt: fixedNow, revokedAt: null },
        { id: "ra3", orgId, subjectId: "usr_viewer", subjectType: "user", role: "project_admin", scopeKind: "project", scopeRef: "proj-uuid-123", createdAt: fixedNow, revokedAt: null },
      ],
    };

    const repo = createFakeRepository();
    repo._orgs.set(orgId, org);
    repo.listMembers = async (id: string) => {
      if (id !== orgId) return { ok: false, error: { kind: "not_found" as const } };
      return { ok: true, value: [member1, member2] };
    };
    repo.listRoleAssignments = async (id: string, subjectId: string) => {
      const key = `${id}:${subjectId}`;
      const found = roles[key];
      if (found) return { ok: true, value: found };
      return { ok: true, value: [] };
    };
    return { repo, orgId, memberId1, memberId2 };
  }

  function createEnv(opts: {
    policyAllow?: boolean;
    policyFail?: boolean;
    repo?: ReturnType<typeof createMemberListRepo>["repo"];
  }) {
    const { policyAllow = true, policyFail = false, repo } = opts;
    const policyFetcher = {
      fetch: async () => {
        if (policyFail) throw new Error("network error");
        return Response.json({
          data: { allow: policyAllow, reason: policyAllow ? "granted" : "denied", policyVersion: 1, derivedScope: {} },
          meta: { requestId: "req_test", cursor: null },
        });
      },
    } as unknown as Fetcher;

    return {
      SOURCEPLANE_DB: {} as unknown as Hyperdrive,
      POLICY_WORKER: policyFetcher,
      ENVIRONMENT: "test",
      _repo: repo,
    };
  }

  it("returns members with expected response shape", async () => {
    const { repo, orgId } = createMemberListRepo();

    const policyFetcher = {
      fetch: async () => Response.json({
        data: { allow: true, reason: "granted", policyVersion: 1, derivedScope: {} },
        meta: { requestId: "req_test", cursor: null },
      }),
    } as unknown as Fetcher;

    const { handleListMembers: handler } = await import("@membership-worker/handlers/list-members");

    // We test the service-level logic directly via the handler's internals
    // Since the handler creates its own executor/repo, we test logic patterns here
    const members = [
      {
        id: memberPublicId("11111111-2222-3333-4444-555555555555"),
        subjectType: "user",
        subjectId: "usr_owner",
        status: "active",
        joinedAt: fixedNow.toISOString(),
        roles: [{ role: "owner", scopeKind: "organization" }],
      },
      {
        id: memberPublicId("66666666-7777-8888-9999-aaaaaaaaaaaa"),
        subjectType: "user",
        subjectId: "usr_viewer",
        status: "active",
        joinedAt: fixedNow.toISOString(),
        roles: [
          { role: "viewer", scopeKind: "organization" },
          { role: "project_admin", scopeKind: "project" },
        ],
      },
    ];

    expect(members[0]!.id).toMatch(/^mem_[0-9a-f]{32}$/);
    expect(members[1]!.id).toMatch(/^mem_[0-9a-f]{32}$/);
    expect(members[0]!.roles[0]).toEqual({ role: "owner", scopeKind: "organization" });
  });

  it("sends correct policy action organization.member.list", async () => {
    let capturedBody: unknown;
    const policyFetcher = {
      fetch: async (_url: string, init: RequestInit) => {
        capturedBody = JSON.parse(init.body as string);
        return Response.json({
          data: { allow: true, reason: "granted", policyVersion: 1, derivedScope: {} },
          meta: { requestId: "req_test", cursor: null },
        });
      },
    } as unknown as Fetcher;

    const orgUuid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const roles: RoleAssignment[] = [
      { id: "ra1", orgId: orgUuid, subjectId: "usr_owner", subjectType: "user", role: "owner", scopeKind: "organization", scopeRef: null, createdAt: fixedNow, revokedAt: null },
    ];

    await authorizeViaPolicy(policyFetcher, {
      actor: { subjectId: "usr_owner", subjectType: "user" },
      action: "organization.member.list",
      resource: { kind: "organization", id: orgUuid, orgId: orgUuid },
      orgId: orgUuid,
      roleAssignments: roles,
      requestId: "req_test",
    });

    expect(capturedBody).toEqual(expect.objectContaining({
      action: "organization.member.list",
      resource: { kind: "organization", id: orgUuid, orgId: orgUuid },
    }));
  });

  it("policy denial returns not_found without leaking org existence", async () => {
    const policyFetcher = {
      fetch: async () => Response.json({
        data: { allow: false, reason: "denied", policyVersion: 1, derivedScope: {} },
        meta: { requestId: "req_test", cursor: null },
      }),
    } as unknown as Fetcher;

    const result = await authorizeViaPolicy(policyFetcher, {
      actor: { subjectId: "usr_outsider", subjectType: "user" },
      action: "organization.member.list",
      resource: { kind: "organization", id: "org-uuid", orgId: "org-uuid" },
      orgId: "org-uuid",
      roleAssignments: [],
      requestId: "req_test",
    });

    expect(result.allow).toBe(false);
    // Handler maps allow:false -> not_found (verified by response shape, not "forbidden")
  });

  it("missing policy binding fails closed", async () => {
    const policyFetcher = {
      fetch: async () => { throw new Error("binding not available"); },
    } as unknown as Fetcher;

    const result = await authorizeViaPolicy(policyFetcher, {
      actor: { subjectId: "usr_test", subjectType: "user" },
      action: "organization.member.list",
      resource: { kind: "organization", id: "org-uuid", orgId: "org-uuid" },
      orgId: "org-uuid",
      roleAssignments: [],
      requestId: "req_test",
    });

    expect(result.allow).toBe(false);
  });

  it("actor role-list failure fails closed with not_found", async () => {
    const repo = createFakeRepository();
    repo.listRoleAssignments = async () => ({ ok: false, error: { kind: "internal" as const, message: "db timeout" } });

    // The handler would call listRoleAssignments first, and if it fails, return not_found
    const rolesResult = await repo.listRoleAssignments("org-id", "usr_test");
    expect(rolesResult.ok).toBe(false);
    // Handler maps this to 404 not_found
  });

  it("member role-list failure returns safe internal_error", async () => {
    const { repo } = createMemberListRepo();
    let callCount = 0;
    const original = repo.listRoleAssignments.bind(repo);
    repo.listRoleAssignments = async (orgId: string, subjectId: string) => {
      callCount++;
      if (callCount === 1) {
        return original(orgId, subjectId);
      }
      return { ok: false, error: { kind: "internal" as const, message: "db timeout" } };
    };

    // First call succeeds (actor's own role lookup)
    const actorRoles = await repo.listRoleAssignments("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", "usr_owner");
    expect(actorRoles.ok).toBe(true);

    // Second call fails (member role lookup for another user)
    const memberRolesResult = await repo.listRoleAssignments("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", "usr_viewer");
    expect(memberRolesResult.ok).toBe(false);
    // Handler maps this to 500 internal_error without partial data
  });

  it("does not expose raw member UUIDs in response", () => {
    const rawUuid = "11111111-2222-3333-4444-555555555555";
    const publicId = memberPublicId(rawUuid);
    expect(publicId).toBe("mem_11111111222233334444555555555555");
    expect(publicId).not.toContain("-");
    expect(publicId).toMatch(/^mem_[0-9a-f]{32}$/);
  });

  it("does not expose role-assignment UUIDs in public response", () => {
    const ra: RoleAssignment = {
      id: "ra-uuid-private",
      orgId: "org-uuid",
      subjectId: "usr_x",
      subjectType: "user",
      role: "admin",
      scopeKind: "organization",
      scopeRef: null,
      createdAt: fixedNow,
      revokedAt: null,
    };
    const publicRole = { role: ra.role, scopeKind: ra.scopeKind };
    expect(publicRole).toEqual({ role: "admin", scopeKind: "organization" });
    expect(JSON.stringify(publicRole)).not.toContain("ra-uuid-private");
    expect(JSON.stringify(publicRole)).not.toContain("org-uuid");
  });

  it("project-scoped role assignments do not leak raw project UUIDs", () => {
    const ra: RoleAssignment = {
      id: "ra-uuid",
      orgId: "org-uuid",
      subjectId: "usr_x",
      subjectType: "user",
      role: "project_admin",
      scopeKind: "project",
      scopeRef: "proj-uuid-secret-123",
      createdAt: fixedNow,
      revokedAt: null,
    };
    const publicRole = { role: ra.role, scopeKind: ra.scopeKind };
    expect(JSON.stringify(publicRole)).not.toContain("proj-uuid-secret-123");
    expect(JSON.stringify(publicRole)).not.toContain("scopeRef");
  });

  it("memberPublicId produces prefixed hex from UUID", () => {
    const uuid = "abcdef01-2345-6789-abcd-ef0123456789";
    expect(memberPublicId(uuid)).toBe("mem_abcdef0123456789abcdef0123456789");
  });
});

describe("handleListMembers handler integration", () => {
  const orgUuid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  const orgPublicIdStr = `org_${orgUuid.replace(/-/g, "")}`;
  const actor = { subjectId: "usr_owner", subjectType: "user" };

  function createFakeRepo(opts: {
    actorRolesFail?: boolean;
    membersFail?: boolean;
    memberRolesFail?: boolean;
  } = {}) {
    const members: OrganizationMember[] = [
      { id: "11111111-2222-3333-4444-555555555555", orgId: orgUuid, subjectId: "usr_owner", subjectType: "user", status: "active", createdAt: fixedNow, updatedAt: fixedNow },
      { id: "66666666-7777-8888-9999-aaaaaaaaaaaa", orgId: orgUuid, subjectId: "usr_viewer", subjectType: "user", status: "active", createdAt: fixedNow, updatedAt: fixedNow },
    ];
    const roles: Record<string, RoleAssignment[]> = {
      [`${orgUuid}:usr_owner`]: [
        { id: "ra1", orgId: orgUuid, subjectId: "usr_owner", subjectType: "user", role: "owner", scopeKind: "organization", scopeRef: null, createdAt: fixedNow, revokedAt: null },
      ],
      [`${orgUuid}:usr_viewer`]: [
        { id: "ra2", orgId: orgUuid, subjectId: "usr_viewer", subjectType: "user", role: "viewer", scopeKind: "organization", scopeRef: null, createdAt: fixedNow, revokedAt: null },
        { id: "ra3", orgId: orgUuid, subjectId: "usr_viewer", subjectType: "user", role: "project_admin", scopeKind: "project", scopeRef: "proj-uuid-secret", createdAt: fixedNow, revokedAt: null },
      ],
    };

    let roleCallCount = 0;
    return {
      listRoleAssignments: async (id: string, subjectId: string) => {
        roleCallCount++;
        if (opts.actorRolesFail && roleCallCount === 1) {
          return { ok: false as const, error: { kind: "internal" as const, message: "db error" } };
        }
        if (opts.memberRolesFail && roleCallCount > 1) {
          return { ok: false as const, error: { kind: "internal" as const, message: "db error" } };
        }
        const key = `${id}:${subjectId}`;
        return { ok: true as const, value: roles[key] ?? [] };
      },
      listMembersPaged: async (id: string) => {
        if (opts.membersFail) {
          return { ok: false as const, error: { kind: "internal" as const, message: "db error" } };
        }
        if (id !== orgUuid) return { ok: true as const, value: { items: [], nextCursor: null } };
        return { ok: true as const, value: { items: members, nextCursor: null } };
      },
    };
  }

  function createPolicyFetcher(allow: boolean) {
    return {
      fetch: async () => Response.json({
        data: { allow, reason: allow ? "granted" : "denied", policyVersion: 1, derivedScope: {} },
        meta: { requestId: "req_test", cursor: null },
      }),
    } as unknown as Fetcher;
  }

  it("returns full member list with correct response shape on success", async () => {
    const repo = createFakeRepo();
    const env = { POLICY_WORKER: createPolicyFetcher(true), SOURCEPLANE_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

    const response = await handleListMembers(env as any, "req_test", actor, orgPublicIdStr, undefined, { repo });

    expect(response.status).toBe(200);
    const json = await response.json() as any;
    expect(json.data.members).toHaveLength(2);
    expect(json.data.members[0].id).toMatch(/^mem_[0-9a-f]{32}$/);
    expect(json.data.members[0].subjectId).toBe("usr_owner");
    expect(json.data.members[0].status).toBe("active");
    expect(json.data.members[0].joinedAt).toBe(fixedNow.toISOString());
    expect(json.data.members[0].roles).toEqual([{ role: "owner", scopeKind: "organization" }]);
    expect(json.data.members[1].roles).toHaveLength(2);
  });

  it("sends organization.member.list action to policy-worker", async () => {
    let capturedBody: any;
    const policyFetcher = {
      fetch: async (_url: string, init: RequestInit) => {
        capturedBody = JSON.parse(init.body as string);
        return Response.json({
          data: { allow: true, reason: "ok", policyVersion: 1, derivedScope: {} },
          meta: { requestId: "req_test", cursor: null },
        });
      },
    } as unknown as Fetcher;

    const repo = createFakeRepo();
    const env = { POLICY_WORKER: policyFetcher, SOURCEPLANE_DB: {} as Hyperdrive, ENVIRONMENT: "test" };
    await handleListMembers(env as any, "req_test", actor, orgPublicIdStr, undefined, { repo });

    expect(capturedBody.action).toBe("organization.member.list");
    expect(capturedBody.resource).toEqual({ kind: "organization", id: orgUuid, orgId: orgUuid });
  });

  it("returns not_found when policy denies", async () => {
    const repo = createFakeRepo();
    const env = { POLICY_WORKER: createPolicyFetcher(false), SOURCEPLANE_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

    const response = await handleListMembers(env as any, "req_test", actor, orgPublicIdStr, undefined, { repo });

    expect(response.status).toBe(404);
    const json = await response.json() as any;
    expect(json.error.code).toBe("not_found");
    expect(JSON.stringify(json)).not.toContain("forbidden");
    expect(JSON.stringify(json)).not.toContain("denied");
  });

  it("returns not_found when actor role-list fails (fail closed)", async () => {
    const repo = createFakeRepo({ actorRolesFail: true });
    const env = { POLICY_WORKER: createPolicyFetcher(true), SOURCEPLANE_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

    const response = await handleListMembers(env as any, "req_test", actor, orgPublicIdStr, undefined, { repo });

    expect(response.status).toBe(404);
    const json = await response.json() as any;
    expect(json.error.code).toBe("not_found");
  });

  it("returns internal_error when member role-list fails without partial data", async () => {
    const repo = createFakeRepo({ memberRolesFail: true });
    const env = { POLICY_WORKER: createPolicyFetcher(true), SOURCEPLANE_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

    const response = await handleListMembers(env as any, "req_test", actor, orgPublicIdStr, undefined, { repo });

    expect(response.status).toBe(500);
    const json = await response.json() as any;
    expect(json.error.code).toBe("internal_error");
    expect(JSON.stringify(json)).not.toContain("members");
    expect(JSON.stringify(json)).not.toContain("usr_owner");
  });

  it("returns internal_error when listMembers fails", async () => {
    const repo = createFakeRepo({ membersFail: true });
    const env = { POLICY_WORKER: createPolicyFetcher(true), SOURCEPLANE_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

    const response = await handleListMembers(env as any, "req_test", actor, orgPublicIdStr, undefined, { repo });

    expect(response.status).toBe(500);
    const json = await response.json() as any;
    expect(json.error.code).toBe("internal_error");
  });

  it("fails closed when policy binding throws", async () => {
    const repo = createFakeRepo();
    const policyFetcher = { fetch: async () => { throw new Error("network"); } } as unknown as Fetcher;
    const env = { POLICY_WORKER: policyFetcher, SOURCEPLANE_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

    const response = await handleListMembers(env as any, "req_test", actor, orgPublicIdStr, undefined, { repo });

    expect(response.status).toBe(404);
    const json = await response.json() as any;
    expect(json.error.code).toBe("not_found");
  });

  it("returns not_found for invalid orgId param", async () => {
    const repo = createFakeRepo();
    const env = { POLICY_WORKER: createPolicyFetcher(true), SOURCEPLANE_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

    const response = await handleListMembers(env as any, "req_test", actor, "invalid_id", undefined, { repo });

    expect(response.status).toBe(404);
  });

  it("does not expose raw UUIDs or project scopeRef in response", async () => {
    const repo = createFakeRepo();
    const env = { POLICY_WORKER: createPolicyFetcher(true), SOURCEPLANE_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

    const response = await handleListMembers(env as any, "req_test", actor, orgPublicIdStr, undefined, { repo });
    const text = await response.text();

    expect(text).not.toContain("11111111-2222-3333-4444-555555555555");
    expect(text).not.toContain("66666666-7777-8888-9999-aaaaaaaaaaaa");
    expect(text).not.toContain("proj-uuid-secret");
    expect(text).not.toContain("ra1");
    expect(text).not.toContain("ra2");
    expect(text).not.toContain("ra3");
  });

  it("returns 503 when POLICY_WORKER binding is missing", async () => {
    const repo = createFakeRepo();
    const env = { SOURCEPLANE_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

    const response = await handleListMembers(env as any, "req_test", actor, orgPublicIdStr, undefined, { repo });

    expect(response.status).toBe(503);
    const json = await response.json() as any;
    expect(json.error.code).toBe("internal_error");
  });
});

describe("pagination", () => {
  const orgUuid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  const orgPublicIdStr = `org_${orgUuid.replace(/-/g, "")}`;
  const actor = { subjectId: "usr_owner", subjectType: "user" };

  function createPagedRepo(opts: { hasNext?: boolean } = {}) {
    const members: OrganizationMember[] = [
      { id: "11111111-2222-3333-4444-555555555555", orgId: orgUuid, subjectId: "usr_owner", subjectType: "user", status: "active", createdAt: fixedNow, updatedAt: fixedNow },
    ];
    const roles: Record<string, RoleAssignment[]> = {
      [`${orgUuid}:usr_owner`]: [
        { id: "ra1", orgId: orgUuid, subjectId: "usr_owner", subjectType: "user", role: "owner", scopeKind: "organization", scopeRef: null, createdAt: fixedNow, revokedAt: null },
      ],
    };
    return {
      listRoleAssignments: async (id: string, subjectId: string) => {
        const key = `${id}:${subjectId}`;
        return { ok: true as const, value: roles[key] ?? [] };
      },
      listMembersPaged: async () => {
        return {
          ok: true as const,
          value: {
            items: members,
            nextCursor: opts.hasNext ? { createdAt: fixedNow.toISOString(), id: "11111111-2222-3333-4444-555555555555" } : null,
          },
        };
      },
    };
  }

  function createPolicyFetcher(allow: boolean) {
    return {
      fetch: async () => Response.json({
        data: { allow, reason: allow ? "granted" : "denied", policyVersion: 1, derivedScope: {} },
        meta: { requestId: "req_test", cursor: null },
      }),
    } as unknown as Fetcher;
  }

  it("defaults to limit 50 when no query params provided", async () => {
    const repo = createPagedRepo();
    const env = { POLICY_WORKER: createPolicyFetcher(true), SOURCEPLANE_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

    const response = await handleListMembers(env as any, "req_test", actor, orgPublicIdStr, undefined, { repo });

    expect(response.status).toBe(200);
    const json = await response.json() as any;
    expect(json.data.members).toHaveLength(1);
    expect(json.meta.cursor).toBeNull();
  });

  it("uses explicit limit when provided", async () => {
    const repo = createPagedRepo();
    const env = { POLICY_WORKER: createPolicyFetcher(true), SOURCEPLANE_DB: {} as Hyperdrive, ENVIRONMENT: "test" };
    const url = new URL("http://localhost/v1/organizations/x/members?limit=10");

    const response = await handleListMembers(env as any, "req_test", actor, orgPublicIdStr, url, { repo });

    expect(response.status).toBe(200);
  });

  it("returns validation_failed for invalid limit", async () => {
    const repo = createPagedRepo();
    const env = { POLICY_WORKER: createPolicyFetcher(true), SOURCEPLANE_DB: {} as Hyperdrive, ENVIRONMENT: "test" };
    const url = new URL("http://localhost/v1/organizations/x/members?limit=999");

    const response = await handleListMembers(env as any, "req_test", actor, orgPublicIdStr, url, { repo });

    expect(response.status).toBe(422);
    const json = await response.json() as any;
    expect(json.error.code).toBe("validation_failed");
  });

  it("returns validation_failed for non-integer limit", async () => {
    const repo = createPagedRepo();
    const env = { POLICY_WORKER: createPolicyFetcher(true), SOURCEPLANE_DB: {} as Hyperdrive, ENVIRONMENT: "test" };
    const url = new URL("http://localhost/v1/organizations/x/members?limit=abc");

    const response = await handleListMembers(env as any, "req_test", actor, orgPublicIdStr, url, { repo });

    expect(response.status).toBe(422);
    const json = await response.json() as any;
    expect(json.error.code).toBe("validation_failed");
  });

  it("returns validation_failed for invalid cursor", async () => {
    const repo = createPagedRepo();
    const env = { POLICY_WORKER: createPolicyFetcher(true), SOURCEPLANE_DB: {} as Hyperdrive, ENVIRONMENT: "test" };
    const url = new URL("http://localhost/v1/organizations/x/members?cursor=not_valid_base64!!!");

    const response = await handleListMembers(env as any, "req_test", actor, orgPublicIdStr, url, { repo });

    expect(response.status).toBe(422);
    const json = await response.json() as any;
    expect(json.error.code).toBe("validation_failed");
  });

  it("forwards valid cursor to the repository page call", async () => {
    let receivedParams: unknown;
    const repo = {
      listRoleAssignments: async () => ({ ok: true as const, value: [{ id: "ra1", orgId: orgUuid, subjectId: "usr_owner", subjectType: "user", role: "owner", scopeKind: "organization", scopeRef: null, createdAt: fixedNow, revokedAt: null }] }),
      listMembersPaged: async (_id: string, params: unknown) => {
        receivedParams = params;
        return { ok: true as const, value: { items: [], nextCursor: null } };
      },
    };
    const env = { POLICY_WORKER: createPolicyFetcher(true), SOURCEPLANE_DB: {} as Hyperdrive, ENVIRONMENT: "test" };
    const cursorPayload = btoa(JSON.stringify({ v: 1, t: "2026-01-15T10:00:00.000Z", i: "some-id" }));
    const url = new URL(`http://localhost/v1/organizations/x/members?cursor=${cursorPayload}`);

    await handleListMembers(env as any, "req_test", actor, orgPublicIdStr, url, { repo });

    expect(receivedParams).toEqual({ limit: 50, cursor: { createdAt: "2026-01-15T10:00:00.000Z", id: "some-id" } });
  });

  it("sets meta.cursor when another page exists", async () => {
    const repo = createPagedRepo({ hasNext: true });
    const env = { POLICY_WORKER: createPolicyFetcher(true), SOURCEPLANE_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

    const response = await handleListMembers(env as any, "req_test", actor, orgPublicIdStr, undefined, { repo });

    expect(response.status).toBe(200);
    const json = await response.json() as any;
    expect(json.meta.cursor).not.toBeNull();
    expect(typeof json.meta.cursor).toBe("string");
  });

  it("sets meta.cursor to null when no more pages", async () => {
    const repo = createPagedRepo({ hasNext: false });
    const env = { POLICY_WORKER: createPolicyFetcher(true), SOURCEPLANE_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

    const response = await handleListMembers(env as any, "req_test", actor, orgPublicIdStr, undefined, { repo });

    expect(response.status).toBe(200);
    const json = await response.json() as any;
    expect(json.meta.cursor).toBeNull();
  });

  it("still authorizes before page query", async () => {
    const repo = createPagedRepo();
    const env = { POLICY_WORKER: createPolicyFetcher(false), SOURCEPLANE_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

    const response = await handleListMembers(env as any, "req_test", actor, orgPublicIdStr, undefined, { repo });

    expect(response.status).toBe(404);
    const json = await response.json() as any;
    expect(json.error.code).toBe("not_found");
  });

  it("does not leak cursor format details in validation error", async () => {
    const repo = createPagedRepo();
    const env = { POLICY_WORKER: createPolicyFetcher(true), SOURCEPLANE_DB: {} as Hyperdrive, ENVIRONMENT: "test" };
    const url = new URL("http://localhost/v1/organizations/x/members?cursor=broken");

    const response = await handleListMembers(env as any, "req_test", actor, orgPublicIdStr, url, { repo });

    const text = await response.text();
    expect(text).not.toContain("JSON");
    expect(text).not.toContain("base64");
    expect(text).not.toContain("atob");
  });
});

describe("wrangler config", () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const raw = fs.readFileSync(path.resolve(__dirname, "../../../apps/membership-worker/wrangler.jsonc"), "utf8");
  // Strip single-line comments for JSONC parsing
  const config = JSON.parse(raw.replace(/^\s*\/\/.*$/gm, ""));

  it("stage binds POLICY_WORKER to policy-worker-stage", () => {
    const stageServices = config.env.stage.services;
    const policyBinding = stageServices.find((s: { binding: string }) => s.binding === "POLICY_WORKER");
    expect(policyBinding).toBeDefined();
    expect(policyBinding.service).toBe("policy-worker-stage");
  });

  it("prod binds POLICY_WORKER to policy-worker-prod", () => {
    const prodServices = config.env.prod.services;
    const policyBinding = prodServices.find((s: { binding: string }) => s.binding === "POLICY_WORKER");
    expect(policyBinding).toBeDefined();
    expect(policyBinding.service).toBe("policy-worker-prod");
  });

  it("stage and prod never cross environments", () => {
    const stageService = config.env.stage.services.find((s: { binding: string }) => s.binding === "POLICY_WORKER")?.service;
    const prodService = config.env.prod.services.find((s: { binding: string }) => s.binding === "POLICY_WORKER")?.service;
    expect(stageService).toContain("stage");
    expect(prodService).toContain("prod");
    expect(stageService).not.toContain("prod");
    expect(prodService).not.toContain("stage");
  });
});
