import {
  createMembershipRepository,
} from "@saas/db/membership";
import type { SqlExecutor, SqlExecutorResult, SqlRow } from "@saas/db/hyperdrive";

type QueryRecord = { text: string; params: unknown[] };

function createFakeExecutor(options?: {
  rows?: Record<string, unknown>[];
  error?: unknown;
  rowCount?: number;
  callResponses?: Array<{ rows?: Record<string, unknown>[]; rowCount?: number; error?: unknown }>;
}): { executor: SqlExecutor; queries: QueryRecord[] } {
  const queries: QueryRecord[] = [];
  let callIndex = 0;
  const executor: SqlExecutor = {
    async execute<T extends SqlRow = SqlRow>(
      text: string,
      params?: unknown[],
    ): Promise<SqlExecutorResult<T>> {
      queries.push({ text, params: params ?? [] });

      if (options?.callResponses && callIndex < options.callResponses.length) {
        const response = options.callResponses[callIndex]!;
        callIndex++;
        if (response.error) {
          throw response.error;
        }
        const rows = (response.rows ?? []) as unknown as T[];
        return { rows, rowCount: response.rowCount ?? rows.length };
      }

      if (options?.error) {
        throw options.error;
      }
      const rows = (options?.rows ?? []) as unknown as T[];
      return { rows, rowCount: options?.rowCount ?? rows.length };
    },
  };
  return { executor, queries };
}

const NOW = new Date("2026-01-15T10:00:00Z");
const FUTURE = new Date("2099-01-15T11:00:00Z");
const PAST = new Date("2020-01-15T09:00:00Z");

const SAMPLE_ORG_ROW = {
  id: "org-001",
  name: "Acme Corp",
  slug: "acme-corp",
  slug_lower: "acme-corp",
  status: "active",
  created_at: NOW.toISOString(),
  updated_at: NOW.toISOString(),
};

const SAMPLE_MEMBER_ROW = {
  id: "mem-001",
  org_id: "org-001",
  subject_id: "usr-001",
  subject_type: "user",
  status: "active",
  created_at: NOW.toISOString(),
  updated_at: NOW.toISOString(),
};

const SAMPLE_INVITATION_ROW = {
  id: "inv-001",
  org_id: "org-001",
  email: "Invite@Example.com",
  email_lower: "invite@example.com",
  role: "builder",
  status: "pending",
  invited_by: "usr-001",
  expires_at: FUTURE.toISOString(),
  accepted_at: null,
  revoked_at: null,
  created_at: NOW.toISOString(),
};

const SAMPLE_ROLE_ASSIGNMENT_ROW = {
  id: "ra-001",
  org_id: "org-001",
  subject_id: "usr-001",
  subject_type: "user",
  role: "owner",
  scope_kind: "organization",
  scope_ref: null,
  created_at: NOW.toISOString(),
  revoked_at: null,
};

describe("MembershipRepository", () => {
  describe("createOrganization", () => {
    it("uses parameterized query for organization creation", async () => {
      const { executor, queries } = createFakeExecutor({ rows: [SAMPLE_ORG_ROW] });
      const repo = createMembershipRepository(executor);

      await repo.createOrganization({
        id: "org-001",
        name: "Acme Corp",
        slug: "acme-corp",
        slugLower: "acme-corp",
        createdAt: NOW,
      });

      expect(queries).toHaveLength(1);
      expect(queries[0]!.text).toContain("$1");
      expect(queries[0]!.text).toContain("$2");
      expect(queries[0]!.text).toContain("$3");
      expect(queries[0]!.text).toContain("$4");
      expect(queries[0]!.params).toEqual([
        "org-001",
        "Acme Corp",
        "acme-corp",
        "acme-corp",
        NOW.toISOString(),
      ]);
    });

    it("maps returned row to Organization type", async () => {
      const { executor } = createFakeExecutor({ rows: [SAMPLE_ORG_ROW] });
      const repo = createMembershipRepository(executor);

      const result = await repo.createOrganization({
        id: "org-001",
        name: "Acme Corp",
        slug: "acme-corp",
        slugLower: "acme-corp",
        createdAt: NOW,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe("org-001");
        expect(result.value.name).toBe("Acme Corp");
        expect(result.value.slugLower).toBe("acme-corp");
        expect(result.value.status).toBe("active");
        expect(result.value.createdAt).toEqual(NOW);
      }
    });

    it("returns conflict on duplicate organization", async () => {
      const { executor } = createFakeExecutor({ rows: [], rowCount: 0 });
      const repo = createMembershipRepository(executor);

      const result = await repo.createOrganization({
        id: "org-001",
        name: "Acme Corp",
        slug: "acme-corp",
        slugLower: "acme-corp",
        createdAt: NOW,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("conflict");
      }
    });

    it("returns conflict on unique violation error code", async () => {
      const { executor } = createFakeExecutor({
        error: Object.assign(new Error("unique_violation"), { code: "23505" }),
      });
      const repo = createMembershipRepository(executor);

      const result = await repo.createOrganization({
        id: "org-002",
        name: "Acme Corp",
        slug: "acme-corp",
        slugLower: "acme-corp",
        createdAt: NOW,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("conflict");
      }
    });

    it("maps generic errors to safe internal error", async () => {
      const { executor } = createFakeExecutor({
        error: new Error("connection to host 10.0.0.1:5432 refused"),
      });
      const repo = createMembershipRepository(executor);

      const result = await repo.createOrganization({
        id: "org-001",
        name: "Test",
        slug: "test",
        slugLower: "test",
        createdAt: NOW,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("internal");
        expect((result.error as { kind: "internal"; message: string }).message).not.toContain("10.0.0.1");
        expect((result.error as { kind: "internal"; message: string }).message).not.toContain("5432");
      }
    });
  });

  describe("getOrganizationById", () => {
    it("uses parameterized query for lookup", async () => {
      const { executor, queries } = createFakeExecutor({ rows: [SAMPLE_ORG_ROW] });
      const repo = createMembershipRepository(executor);

      await repo.getOrganizationById("org-001");

      expect(queries[0]!.params).toEqual(["org-001"]);
      expect(queries[0]!.text).toContain("$1");
    });

    it("returns not_found when no rows", async () => {
      const { executor } = createFakeExecutor({ rows: [] });
      const repo = createMembershipRepository(executor);

      const result = await repo.getOrganizationById("org-missing");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("not_found");
    });
  });

  describe("getOrganizationBySlug", () => {
    it("uses normalized slug in parameterized query", async () => {
      const { executor, queries } = createFakeExecutor({ rows: [SAMPLE_ORG_ROW] });
      const repo = createMembershipRepository(executor);

      await repo.getOrganizationBySlug("acme-corp");

      expect(queries[0]!.params).toEqual(["acme-corp"]);
      expect(queries[0]!.text).toContain("slug_lower");
    });

    it("returns not_found for unknown slug", async () => {
      const { executor } = createFakeExecutor({ rows: [] });
      const repo = createMembershipRepository(executor);

      const result = await repo.getOrganizationBySlug("unknown-slug");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("not_found");
    });
  });

  describe("listOrganizationsForSubject", () => {
    it("uses parameterized query with subject_id", async () => {
      const { executor, queries } = createFakeExecutor({ rows: [SAMPLE_ORG_ROW] });
      const repo = createMembershipRepository(executor);

      await repo.listOrganizationsForSubject("usr-001");

      expect(queries[0]!.params).toEqual(["usr-001"]);
      expect(queries[0]!.text).toContain("$1");
      expect(queries[0]!.text).toContain("subject_id");
    });

    it("returns empty array when no organizations found", async () => {
      const { executor } = createFakeExecutor({ rows: [] });
      const repo = createMembershipRepository(executor);

      const result = await repo.listOrganizationsForSubject("usr-missing");

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual([]);
    });
  });

  describe("bootstrapOrganization", () => {
    it("creates org, member, and role assignment atomically in a single CTE statement", async () => {
      const { executor, queries } = createFakeExecutor({
        rows: [{
          org: SAMPLE_ORG_ROW,
          member: SAMPLE_MEMBER_ROW,
          role_assignment: SAMPLE_ROLE_ASSIGNMENT_ROW,
        }],
      });
      const repo = createMembershipRepository(executor);

      const result = await repo.bootstrapOrganization({
        org: { id: "org-001", name: "Acme Corp", slug: "acme-corp", slugLower: "acme-corp", createdAt: NOW },
        member: { id: "mem-001", orgId: "org-001", subjectId: "usr-001", subjectType: "user", createdAt: NOW },
        roleAssignment: { id: "ra-001", orgId: "org-001", subjectId: "usr-001", subjectType: "user", role: "owner", scopeKind: "organization", createdAt: NOW },
      });

      expect(queries).toHaveLength(1);
      expect(queries[0]!.text).toContain("WITH new_org AS");
      expect(queries[0]!.text).toContain("new_member AS");
      expect(queries[0]!.text).toContain("new_role AS");
      expect(queries[0]!.text).toContain("CROSS JOIN");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.org.id).toBe("org-001");
        expect(result.value.member.subjectId).toBe("usr-001");
        expect(result.value.roleAssignment.role).toBe("owner");
      }
    });

    it("uses parameterized query with all 18 parameters", async () => {
      const { executor, queries } = createFakeExecutor({
        rows: [{
          org: SAMPLE_ORG_ROW,
          member: SAMPLE_MEMBER_ROW,
          role_assignment: SAMPLE_ROLE_ASSIGNMENT_ROW,
        }],
      });
      const repo = createMembershipRepository(executor);

      await repo.bootstrapOrganization({
        org: { id: "org-001", name: "Acme Corp", slug: "acme-corp", slugLower: "acme-corp", createdAt: NOW },
        member: { id: "mem-001", orgId: "org-001", subjectId: "usr-001", subjectType: "user", createdAt: NOW },
        roleAssignment: { id: "ra-001", orgId: "org-001", subjectId: "usr-001", subjectType: "user", role: "owner", scopeKind: "organization", createdAt: NOW },
      });

      expect(queries[0]!.text).toContain("$1");
      expect(queries[0]!.text).toContain("$18");
      expect(queries[0]!.params.length).toBe(18);
    });

    it("returns conflict if organization already exists", async () => {
      const { executor } = createFakeExecutor({ rows: [], rowCount: 0 });
      const repo = createMembershipRepository(executor);

      const result = await repo.bootstrapOrganization({
        org: { id: "org-001", name: "Acme Corp", slug: "acme-corp", slugLower: "acme-corp", createdAt: NOW },
        member: { id: "mem-001", orgId: "org-001", subjectId: "usr-001", subjectType: "user", createdAt: NOW },
        roleAssignment: { id: "ra-001", orgId: "org-001", subjectId: "usr-001", subjectType: "user", role: "owner", scopeKind: "organization", createdAt: NOW },
      });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("conflict");
    });

    it("all-or-nothing: member and role depend on org via CTE chain", async () => {
      const { executor, queries } = createFakeExecutor({
        rows: [{
          org: SAMPLE_ORG_ROW,
          member: SAMPLE_MEMBER_ROW,
          role_assignment: SAMPLE_ROLE_ASSIGNMENT_ROW,
        }],
      });
      const repo = createMembershipRepository(executor);

      await repo.bootstrapOrganization({
        org: { id: "org-001", name: "Acme Corp", slug: "acme-corp", slugLower: "acme-corp", createdAt: NOW },
        member: { id: "mem-001", orgId: "org-001", subjectId: "usr-001", subjectType: "user", createdAt: NOW },
        roleAssignment: { id: "ra-001", orgId: "org-001", subjectId: "usr-001", subjectType: "user", role: "owner", scopeKind: "organization", createdAt: NOW },
      });

      expect(queries[0]!.text).toContain("FROM new_org");
      expect(queries[0]!.text).toContain("FROM new_member");
    });
  });

  describe("createMember", () => {
    it("uses parameterized query", async () => {
      const { executor, queries } = createFakeExecutor({ rows: [SAMPLE_MEMBER_ROW] });
      const repo = createMembershipRepository(executor);

      await repo.createMember({
        id: "mem-001",
        orgId: "org-001",
        subjectId: "usr-001",
        subjectType: "user",
        createdAt: NOW,
      });

      expect(queries[0]!.text).toContain("$1");
      expect(queries[0]!.params).toEqual([
        "mem-001",
        "org-001",
        "usr-001",
        "user",
        NOW.toISOString(),
      ]);
    });

    it("returns conflict on duplicate member", async () => {
      const { executor } = createFakeExecutor({
        error: Object.assign(new Error("unique_violation"), { code: "23505" }),
      });
      const repo = createMembershipRepository(executor);

      const result = await repo.createMember({
        id: "mem-002",
        orgId: "org-001",
        subjectId: "usr-001",
        subjectType: "user",
        createdAt: NOW,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("conflict");
    });
  });

  describe("getMemberById", () => {
    it("uses parameterized query with org_id and member_id", async () => {
      const { executor, queries } = createFakeExecutor({ rows: [SAMPLE_MEMBER_ROW] });
      const repo = createMembershipRepository(executor);

      await repo.getMemberById("org-001", "mem-001");

      expect(queries[0]!.params).toEqual(["org-001", "mem-001"]);
    });

    it("returns not_found when no rows", async () => {
      const { executor } = createFakeExecutor({ rows: [] });
      const repo = createMembershipRepository(executor);

      const result = await repo.getMemberById("org-001", "mem-missing");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("not_found");
    });

    it("returns removed for removed member", async () => {
      const { executor } = createFakeExecutor({
        rows: [{ ...SAMPLE_MEMBER_ROW, status: "removed" }],
      });
      const repo = createMembershipRepository(executor);

      const result = await repo.getMemberById("org-001", "mem-001");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("removed");
    });
  });

  describe("listMembers", () => {
    it("uses parameterized query for org_id", async () => {
      const { executor, queries } = createFakeExecutor({ rows: [SAMPLE_MEMBER_ROW] });
      const repo = createMembershipRepository(executor);

      await repo.listMembers("org-001");

      expect(queries[0]!.params).toEqual(["org-001"]);
      expect(queries[0]!.text).toContain("status = 'active'");
    });

    it("returns empty array when no members", async () => {
      const { executor } = createFakeExecutor({ rows: [] });
      const repo = createMembershipRepository(executor);

      const result = await repo.listMembers("org-empty");

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual([]);
    });
  });

  describe("removeMember", () => {
    it("uses parameterized update with status = 'active' guard", async () => {
      const { executor, queries } = createFakeExecutor({
        rows: [{ ...SAMPLE_MEMBER_ROW, status: "removed", updated_at: NOW.toISOString() }],
      });
      const repo = createMembershipRepository(executor);

      await repo.removeMember("org-001", "mem-001", NOW);

      expect(queries[0]!.text).toContain("status = 'active'");
      expect(queries[0]!.params).toEqual(["org-001", "mem-001", NOW.toISOString()]);
    });

    it("returns not_found when member already removed", async () => {
      const { executor } = createFakeExecutor({ rows: [], rowCount: 0 });
      const repo = createMembershipRepository(executor);

      const result = await repo.removeMember("org-001", "mem-001", NOW);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("not_found");
    });
  });

  describe("createInvitation", () => {
    it("stores hashed token via parameterized query", async () => {
      const { executor, queries } = createFakeExecutor({ rows: [SAMPLE_INVITATION_ROW] });
      const repo = createMembershipRepository(executor);

      await repo.createInvitation({
        id: "inv-001",
        orgId: "org-001",
        email: "Invite@Example.com",
        emailLower: "invite@example.com",
        role: "builder",
        tokenHash: "sha256-hashed-invite-token",
        invitedBy: "usr-001",
        expiresAt: FUTURE,
        createdAt: NOW,
      });

      expect(queries[0]!.params[5]).toBe("sha256-hashed-invite-token");
      expect(queries[0]!.text).toContain("$6");
    });

    it("does not expose token_hash in returned invitation", async () => {
      const { executor } = createFakeExecutor({ rows: [SAMPLE_INVITATION_ROW] });
      const repo = createMembershipRepository(executor);

      const result = await repo.createInvitation({
        id: "inv-001",
        orgId: "org-001",
        email: "Invite@Example.com",
        emailLower: "invite@example.com",
        role: "builder",
        tokenHash: "sha256-hashed-invite-token",
        invitedBy: "usr-001",
        expiresAt: FUTURE,
        createdAt: NOW,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).not.toHaveProperty("tokenHash");
        expect(result.value).not.toHaveProperty("token_hash");
      }
    });

    it("returns conflict on duplicate invitation", async () => {
      const { executor } = createFakeExecutor({
        error: Object.assign(new Error("unique_violation"), { code: "23505" }),
      });
      const repo = createMembershipRepository(executor);

      const result = await repo.createInvitation({
        id: "inv-002",
        orgId: "org-001",
        email: "test@example.com",
        emailLower: "test@example.com",
        role: "viewer",
        tokenHash: "sha256-another-hash",
        invitedBy: "usr-001",
        expiresAt: FUTURE,
        createdAt: NOW,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("conflict");
    });
  });

  describe("getInvitationById", () => {
    it("uses parameterized query with org_id and invitation_id", async () => {
      const { executor, queries } = createFakeExecutor({ rows: [SAMPLE_INVITATION_ROW] });
      const repo = createMembershipRepository(executor);

      await repo.getInvitationById("org-001", "inv-001");

      expect(queries[0]!.params).toEqual(["org-001", "inv-001"]);
    });

    it("returns not_found for missing invitation", async () => {
      const { executor } = createFakeExecutor({ rows: [] });
      const repo = createMembershipRepository(executor);

      const result = await repo.getInvitationById("org-001", "inv-missing");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("not_found");
    });

    it("returns revoked for revoked invitation", async () => {
      const { executor } = createFakeExecutor({
        rows: [{ ...SAMPLE_INVITATION_ROW, revoked_at: NOW.toISOString(), status: "revoked" }],
      });
      const repo = createMembershipRepository(executor);

      const result = await repo.getInvitationById("org-001", "inv-001");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("revoked");
    });

    it("returns already_accepted for accepted invitation", async () => {
      const { executor } = createFakeExecutor({
        rows: [{ ...SAMPLE_INVITATION_ROW, accepted_at: NOW.toISOString(), status: "accepted" }],
      });
      const repo = createMembershipRepository(executor);

      const result = await repo.getInvitationById("org-001", "inv-001");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("already_accepted");
    });

    it("returns expired for expired invitation", async () => {
      const { executor } = createFakeExecutor({
        rows: [{ ...SAMPLE_INVITATION_ROW, expires_at: PAST.toISOString() }],
      });
      const repo = createMembershipRepository(executor);

      const result = await repo.getInvitationById("org-001", "inv-001");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("expired");
    });

    it("does not expose token_hash in returned invitation", async () => {
      const { executor } = createFakeExecutor({ rows: [SAMPLE_INVITATION_ROW] });
      const repo = createMembershipRepository(executor);

      const result = await repo.getInvitationById("org-001", "inv-001");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).not.toHaveProperty("tokenHash");
        expect(result.value).not.toHaveProperty("token_hash");
      }
    });
  });

  describe("getInvitationByTokenHash", () => {
    it("uses parameterized query with token hash", async () => {
      const { executor, queries } = createFakeExecutor({ rows: [SAMPLE_INVITATION_ROW] });
      const repo = createMembershipRepository(executor);

      await repo.getInvitationByTokenHash("sha256-hashed-token");

      expect(queries[0]!.params).toEqual(["sha256-hashed-token"]);
      expect(queries[0]!.text).toContain("token_hash = $1");
    });

    it("returns not_found for unknown token hash", async () => {
      const { executor } = createFakeExecutor({ rows: [] });
      const repo = createMembershipRepository(executor);

      const result = await repo.getInvitationByTokenHash("unknown-hash");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("not_found");
    });

    it("returns revoked for revoked invitation", async () => {
      const { executor } = createFakeExecutor({
        rows: [{ ...SAMPLE_INVITATION_ROW, revoked_at: NOW.toISOString(), status: "revoked" }],
      });
      const repo = createMembershipRepository(executor);

      const result = await repo.getInvitationByTokenHash("sha256-hashed-token");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("revoked");
    });

    it("returns already_accepted for accepted invitation", async () => {
      const { executor } = createFakeExecutor({
        rows: [{ ...SAMPLE_INVITATION_ROW, accepted_at: NOW.toISOString(), status: "accepted" }],
      });
      const repo = createMembershipRepository(executor);

      const result = await repo.getInvitationByTokenHash("sha256-hashed-token");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("already_accepted");
    });

    it("returns expired for expired invitation", async () => {
      const { executor } = createFakeExecutor({
        rows: [{ ...SAMPLE_INVITATION_ROW, expires_at: PAST.toISOString() }],
      });
      const repo = createMembershipRepository(executor);

      const result = await repo.getInvitationByTokenHash("sha256-hashed-token");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("expired");
    });
  });

  describe("listInvitations", () => {
    it("uses parameterized query for org_id", async () => {
      const { executor, queries } = createFakeExecutor({ rows: [SAMPLE_INVITATION_ROW] });
      const repo = createMembershipRepository(executor);

      await repo.listInvitations("org-001");

      expect(queries[0]!.params).toEqual(["org-001"]);
    });

    it("returns empty array when no invitations", async () => {
      const { executor } = createFakeExecutor({ rows: [] });
      const repo = createMembershipRepository(executor);

      const result = await repo.listInvitations("org-empty");

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual([]);
    });
  });

  describe("revokeInvitation", () => {
    it("uses parameterized update with pending/null guards", async () => {
      const { executor, queries } = createFakeExecutor({
        rows: [{ ...SAMPLE_INVITATION_ROW, revoked_at: NOW.toISOString(), status: "revoked" }],
      });
      const repo = createMembershipRepository(executor);

      await repo.revokeInvitation("org-001", "inv-001", NOW);

      expect(queries[0]!.text).toContain("status = 'pending'");
      expect(queries[0]!.text).toContain("revoked_at IS NULL");
      expect(queries[0]!.params).toEqual(["org-001", "inv-001", NOW.toISOString()]);
    });

    it("returns not_found when invitation already revoked or accepted", async () => {
      const { executor } = createFakeExecutor({ rows: [], rowCount: 0 });
      const repo = createMembershipRepository(executor);

      const result = await repo.revokeInvitation("org-001", "inv-001", NOW);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("not_found");
    });
  });

  describe("acceptInvitation", () => {
    it("validates invitation state before atomic accept+member CTE", async () => {
      const { executor, queries } = createFakeExecutor({
        callResponses: [
          { rows: [SAMPLE_INVITATION_ROW], rowCount: 1 },
          { rows: [{ invitation: { ...SAMPLE_INVITATION_ROW, accepted_at: NOW.toISOString(), status: "accepted" }, member: SAMPLE_MEMBER_ROW }], rowCount: 1 },
        ],
      });
      const repo = createMembershipRepository(executor);

      const result = await repo.acceptInvitation(
        "sha256-hashed-token",
        "mem-002",
        { id: "mem-002", orgId: "org-001", subjectId: "usr-002", subjectType: "user", createdAt: NOW },
        NOW,
      );

      expect(queries).toHaveLength(2);
      expect(queries[0]!.text).toContain("token_hash = $1");
      expect(queries[1]!.text).toContain("WITH accepted_inv AS");
      expect(queries[1]!.text).toContain("expires_at > $2");
      expect(queries[1]!.text).toContain("CROSS JOIN");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.invitation.status).toBe("accepted");
        expect(result.value.member.subjectId).toBe("usr-001");
      }
    });

    it("returns not_found when invitation not found by token hash", async () => {
      const { executor } = createFakeExecutor({
        callResponses: [
          { rows: [], rowCount: 0 },
        ],
      });
      const repo = createMembershipRepository(executor);

      const result = await repo.acceptInvitation(
        "sha256-unknown-token",
        "mem-002",
        { id: "mem-002", orgId: "org-001", subjectId: "usr-002", subjectType: "user", createdAt: NOW },
        NOW,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("not_found");
    });

    it("returns expired when invitation past expiry without marking it accepted", async () => {
      const { executor, queries } = createFakeExecutor({
        callResponses: [
          { rows: [{ ...SAMPLE_INVITATION_ROW, expires_at: PAST.toISOString() }], rowCount: 1 },
        ],
      });
      const repo = createMembershipRepository(executor);

      const result = await repo.acceptInvitation(
        "sha256-hashed-token",
        "mem-002",
        { id: "mem-002", orgId: "org-001", subjectId: "usr-002", subjectType: "user", createdAt: NOW },
        NOW,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("expired");
      expect(queries).toHaveLength(1);
    });

    it("returns revoked when invitation is revoked", async () => {
      const { executor, queries } = createFakeExecutor({
        callResponses: [
          { rows: [{ ...SAMPLE_INVITATION_ROW, revoked_at: NOW.toISOString(), status: "revoked" }], rowCount: 1 },
        ],
      });
      const repo = createMembershipRepository(executor);

      const result = await repo.acceptInvitation(
        "sha256-hashed-token",
        "mem-002",
        { id: "mem-002", orgId: "org-001", subjectId: "usr-002", subjectType: "user", createdAt: NOW },
        NOW,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("revoked");
      expect(queries).toHaveLength(1);
    });

    it("returns already_accepted when invitation was already accepted", async () => {
      const { executor, queries } = createFakeExecutor({
        callResponses: [
          { rows: [{ ...SAMPLE_INVITATION_ROW, accepted_at: NOW.toISOString(), status: "accepted" }], rowCount: 1 },
        ],
      });
      const repo = createMembershipRepository(executor);

      const result = await repo.acceptInvitation(
        "sha256-hashed-token",
        "mem-002",
        { id: "mem-002", orgId: "org-001", subjectId: "usr-002", subjectType: "user", createdAt: NOW },
        NOW,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("already_accepted");
      expect(queries).toHaveLength(1);
    });

    it("does not expose token hash in invitation output", async () => {
      const { executor } = createFakeExecutor({
        callResponses: [
          { rows: [SAMPLE_INVITATION_ROW], rowCount: 1 },
          { rows: [{ invitation: { ...SAMPLE_INVITATION_ROW, accepted_at: NOW.toISOString(), status: "accepted" }, member: SAMPLE_MEMBER_ROW }], rowCount: 1 },
        ],
      });
      const repo = createMembershipRepository(executor);

      const result = await repo.acceptInvitation(
        "sha256-hashed-token",
        "mem-002",
        { id: "mem-002", orgId: "org-001", subjectId: "usr-002", subjectType: "user", createdAt: NOW },
        NOW,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.invitation).not.toHaveProperty("tokenHash");
        expect(result.value.invitation).not.toHaveProperty("token_hash");
      }
    });
  });

  describe("createRoleAssignment", () => {
    it("uses parameterized query for role assignment creation", async () => {
      const { executor, queries } = createFakeExecutor({ rows: [SAMPLE_ROLE_ASSIGNMENT_ROW] });
      const repo = createMembershipRepository(executor);

      await repo.createRoleAssignment({
        id: "ra-001",
        orgId: "org-001",
        subjectId: "usr-001",
        subjectType: "user",
        role: "owner",
        scopeKind: "organization",
        createdAt: NOW,
      });

      expect(queries[0]!.text).toContain("$1");
      expect(queries[0]!.params).toEqual([
        "ra-001",
        "org-001",
        "usr-001",
        "user",
        "owner",
        "organization",
        null,
        NOW.toISOString(),
      ]);
    });

    it("supports project-scoped role assignments", async () => {
      const projectRole = { ...SAMPLE_ROLE_ASSIGNMENT_ROW, role: "project_builder", scope_kind: "project", scope_ref: "prj-001" };
      const { executor, queries } = createFakeExecutor({ rows: [projectRole] });
      const repo = createMembershipRepository(executor);

      await repo.createRoleAssignment({
        id: "ra-002",
        orgId: "org-001",
        subjectId: "usr-001",
        subjectType: "user",
        role: "project_builder",
        scopeKind: "project",
        scopeRef: "prj-001",
        createdAt: NOW,
      });

      expect(queries[0]!.params[6]).toBe("prj-001");
    });

    it("returns conflict on duplicate active role assignment", async () => {
      const { executor } = createFakeExecutor({
        error: Object.assign(new Error("unique_violation"), { code: "23505" }),
      });
      const repo = createMembershipRepository(executor);

      const result = await repo.createRoleAssignment({
        id: "ra-003",
        orgId: "org-001",
        subjectId: "usr-001",
        subjectType: "user",
        role: "owner",
        scopeKind: "organization",
        createdAt: NOW,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("conflict");
    });
  });

  describe("listRoleAssignments", () => {
    it("uses parameterized query with org_id and subject_id", async () => {
      const { executor, queries } = createFakeExecutor({ rows: [SAMPLE_ROLE_ASSIGNMENT_ROW] });
      const repo = createMembershipRepository(executor);

      await repo.listRoleAssignments("org-001", "usr-001");

      expect(queries[0]!.params).toEqual(["org-001", "usr-001"]);
      expect(queries[0]!.text).toContain("revoked_at IS NULL");
    });

    it("returns empty array when no assignments", async () => {
      const { executor } = createFakeExecutor({ rows: [] });
      const repo = createMembershipRepository(executor);

      const result = await repo.listRoleAssignments("org-001", "usr-missing");

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual([]);
    });
  });

  describe("revokeRoleAssignment", () => {
    it("uses parameterized update with revoked_at IS NULL guard", async () => {
      const { executor, queries } = createFakeExecutor({
        rows: [{ ...SAMPLE_ROLE_ASSIGNMENT_ROW, revoked_at: NOW.toISOString() }],
      });
      const repo = createMembershipRepository(executor);

      await repo.revokeRoleAssignment("org-001", "ra-001", NOW);

      expect(queries[0]!.text).toContain("revoked_at IS NULL");
      expect(queries[0]!.params).toEqual(["org-001", "ra-001", NOW.toISOString()]);
    });

    it("returns not_found when assignment already revoked", async () => {
      const { executor } = createFakeExecutor({ rows: [], rowCount: 0 });
      const repo = createMembershipRepository(executor);

      const result = await repo.revokeRoleAssignment("org-001", "ra-001", NOW);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("not_found");
    });
  });

  describe("safe error handling", () => {
    it("never exposes raw SQL errors in repository outputs", async () => {
      const pgError = new Error(
        'relation "membership.organizations" does not exist at character 15',
      );
      const { executor } = createFakeExecutor({ error: pgError });
      const repo = createMembershipRepository(executor);

      const result = await repo.getOrganizationById("org-001");

      expect(result.ok).toBe(false);
      if (!result.ok && result.error.kind === "internal") {
        expect(result.error.message).not.toContain("relation");
        expect(result.error.message).not.toContain("character 15");
      }
    });

    it("never exposes connection strings in errors", async () => {
      const connError = new Error(
        "could not connect to postgres://admin:secret@db.internal:5432/prod",
      );
      const { executor } = createFakeExecutor({ error: connError });
      const repo = createMembershipRepository(executor);

      const result = await repo.createOrganization({
        id: "org-001",
        name: "Test",
        slug: "test",
        slugLower: "test",
        createdAt: NOW,
      });

      expect(result.ok).toBe(false);
      if (!result.ok && result.error.kind === "internal") {
        expect(result.error.message).not.toContain("admin");
        expect(result.error.message).not.toContain("secret");
        expect(result.error.message).not.toContain("db.internal");
      }
    });

    it("never exposes invitation token hashes in error outputs", async () => {
      const { executor } = createFakeExecutor({
        error: new Error("duplicate key value (token_hash)=(secret-token-hash-value)"),
      });
      const repo = createMembershipRepository(executor);

      const result = await repo.createInvitation({
        id: "inv-001",
        orgId: "org-001",
        email: "test@example.com",
        emailLower: "test@example.com",
        role: "viewer",
        tokenHash: "secret-token-hash-value",
        invitedBy: "usr-001",
        expiresAt: FUTURE,
        createdAt: NOW,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const serialized = JSON.stringify(result.error);
        expect(serialized).not.toContain("secret-token-hash-value");
      }
    });

    it("never exposes emails in internal error messages", async () => {
      const { executor } = createFakeExecutor({
        error: new Error("constraint violation for email user@secret-domain.com"),
      });
      const repo = createMembershipRepository(executor);

      const result = await repo.createInvitation({
        id: "inv-001",
        orgId: "org-001",
        email: "user@secret-domain.com",
        emailLower: "user@secret-domain.com",
        role: "viewer",
        tokenHash: "hash",
        invitedBy: "usr-001",
        expiresAt: FUTURE,
        createdAt: NOW,
      });

      expect(result.ok).toBe(false);
      if (!result.ok && result.error.kind === "internal") {
        expect(result.error.message).not.toContain("user@secret-domain.com");
      }
    });
  });

  describe("listOrganizationsForSubjectPaged", () => {
    it("uses parameterized query with deterministic ordering and limit+1", async () => {
      const { executor, queries } = createFakeExecutor({ rows: [SAMPLE_ORG_ROW] });
      const repo = createMembershipRepository(executor);

      await repo.listOrganizationsForSubjectPaged("usr-001", { limit: 10, cursor: null });

      expect(queries).toHaveLength(1);
      expect(queries[0]!.text).toContain("$1");
      expect(queries[0]!.text).toContain("$2");
      expect(queries[0]!.text).toContain("ORDER BY");
      expect(queries[0]!.text).toContain("LIMIT");
      expect(queries[0]!.params).toEqual(["usr-001", 11]);
    });

    it("applies cursor filtering with timestamp and id tie-breaker", async () => {
      const { executor, queries } = createFakeExecutor({ rows: [] });
      const repo = createMembershipRepository(executor);

      await repo.listOrganizationsForSubjectPaged("usr-001", {
        limit: 5,
        cursor: { createdAt: "2026-01-15T10:00:00.000Z", id: "org-001" },
      });

      expect(queries).toHaveLength(1);
      expect(queries[0]!.text).toContain("$3");
      expect(queries[0]!.text).toContain("$4");
      expect(queries[0]!.params).toEqual(["usr-001", 6, "2026-01-15T10:00:00.000Z", "org-001"]);
    });

    it("returns nextCursor when more rows exist", async () => {
      const rows = Array.from({ length: 3 }, (_, i) => ({
        ...SAMPLE_ORG_ROW,
        id: `org-${String(i).padStart(3, "0")}`,
        created_at: new Date(NOW.getTime() - i * 1000).toISOString(),
        updated_at: new Date(NOW.getTime() - i * 1000).toISOString(),
      }));
      const { executor } = createFakeExecutor({ rows });
      const repo = createMembershipRepository(executor);

      const result = await repo.listOrganizationsForSubjectPaged("usr-001", { limit: 2, cursor: null });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.items).toHaveLength(2);
        expect(result.value.nextCursor).not.toBeNull();
        expect(result.value.nextCursor!.id).toBe("org-001");
      }
    });

    it("returns null nextCursor when no more rows", async () => {
      const rows = [SAMPLE_ORG_ROW];
      const { executor } = createFakeExecutor({ rows });
      const repo = createMembershipRepository(executor);

      const result = await repo.listOrganizationsForSubjectPaged("usr-001", { limit: 10, cursor: null });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.nextCursor).toBeNull();
      }
    });

    it("returns empty result safely", async () => {
      const { executor } = createFakeExecutor({ rows: [] });
      const repo = createMembershipRepository(executor);

      const result = await repo.listOrganizationsForSubjectPaged("usr-001", { limit: 50, cursor: null });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.items).toHaveLength(0);
        expect(result.value.nextCursor).toBeNull();
      }
    });
  });

  describe("listMembersPaged", () => {
    it("uses parameterized query with deterministic ordering and limit+1", async () => {
      const { executor, queries } = createFakeExecutor({ rows: [SAMPLE_MEMBER_ROW] });
      const repo = createMembershipRepository(executor);

      await repo.listMembersPaged("org-001", { limit: 10, cursor: null });

      expect(queries).toHaveLength(1);
      expect(queries[0]!.text).toContain("$1");
      expect(queries[0]!.text).toContain("$2");
      expect(queries[0]!.text).toContain("ORDER BY");
      expect(queries[0]!.text).toContain("LIMIT");
      expect(queries[0]!.params).toEqual(["org-001", 11]);
    });

    it("applies cursor filtering with timestamp and id tie-breaker", async () => {
      const { executor, queries } = createFakeExecutor({ rows: [] });
      const repo = createMembershipRepository(executor);

      await repo.listMembersPaged("org-001", {
        limit: 5,
        cursor: { createdAt: "2026-01-15T10:00:00.000Z", id: "mem-001" },
      });

      expect(queries).toHaveLength(1);
      expect(queries[0]!.text).toContain("$3");
      expect(queries[0]!.text).toContain("$4");
      expect(queries[0]!.params).toEqual(["org-001", 6, "2026-01-15T10:00:00.000Z", "mem-001"]);
    });

    it("returns nextCursor when more rows exist", async () => {
      const rows = Array.from({ length: 3 }, (_, i) => ({
        ...SAMPLE_MEMBER_ROW,
        id: `mem-${String(i).padStart(3, "0")}`,
        created_at: new Date(NOW.getTime() - i * 1000).toISOString(),
        updated_at: new Date(NOW.getTime() - i * 1000).toISOString(),
      }));
      const { executor } = createFakeExecutor({ rows });
      const repo = createMembershipRepository(executor);

      const result = await repo.listMembersPaged("org-001", { limit: 2, cursor: null });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.items).toHaveLength(2);
        expect(result.value.nextCursor).not.toBeNull();
        expect(result.value.nextCursor!.id).toBe("mem-001");
      }
    });

    it("returns null nextCursor when no more rows", async () => {
      const rows = [SAMPLE_MEMBER_ROW];
      const { executor } = createFakeExecutor({ rows });
      const repo = createMembershipRepository(executor);

      const result = await repo.listMembersPaged("org-001", { limit: 10, cursor: null });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.nextCursor).toBeNull();
      }
    });

    it("returns empty result safely", async () => {
      const { executor } = createFakeExecutor({ rows: [] });
      const repo = createMembershipRepository(executor);

      const result = await repo.listMembersPaged("org-001", { limit: 50, cursor: null });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.items).toHaveLength(0);
        expect(result.value.nextCursor).toBeNull();
      }
    });
  });

  describe("Worker-safe import isolation", () => {
    it("does not import runner-only modules", async () => {
      const mod = await import("@saas/db/membership");
      const exportKeys = Object.keys(mod);

      expect(exportKeys).toContain("createMembershipRepository");
      expect(exportKeys).not.toContain("runMigrations");
      expect(exportKeys).not.toContain("PgAdapter");
      expect(exportKeys).not.toContain("loadSecret");
      expect(exportKeys).not.toContain("SupabaseApiAdapter");
    });
  });
});
