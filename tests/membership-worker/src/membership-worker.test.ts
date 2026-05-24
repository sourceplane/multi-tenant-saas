import crypto from "node:crypto";
import { createOrganizationService } from "@membership-worker/services/organization";
import { orgPublicId, parseOrgPublicId } from "@membership-worker/ids";
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
    it("returns organization when user has active role", async () => {
      const repo = createFakeRepository();
      const service = createOrganizationService({ repo, now: () => fixedNow });

      const createResult = await service.createOrganization(
        { subjectId: "usr_owner", subjectType: "user" },
        { name: "My Org", slug: "my-org", slugLower: "my-org" },
      );
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const orgUuid = parseOrgPublicId(createResult.value.organization.id)!;
      const result = await service.getOrganization({ subjectId: "usr_owner", subjectType: "user" }, orgUuid);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.organization.name).toBe("My Org");
      expect(result.value.organization.id).toMatch(/^org_[0-9a-f]{32}$/);
    });

    it("returns not_found for inaccessible organization without leaking existence", async () => {
      const repo = createFakeRepository();
      const service = createOrganizationService({ repo, now: () => fixedNow });

      const createResult = await service.createOrganization(
        { subjectId: "usr_owner", subjectType: "user" },
        { name: "Secret", slug: "secret", slugLower: "secret" },
      );
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const orgUuid = parseOrgPublicId(createResult.value.organization.id)!;
      const result = await service.getOrganization({ subjectId: "usr_outsider", subjectType: "user" }, orgUuid);

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
      );

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
