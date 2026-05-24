import type { SqlExecutor } from "../hyperdrive/executor.js";
import type {
  BootstrapOrganizationInput,
  CreateInvitationInput,
  CreateOrganizationInput,
  CreateOrganizationMemberInput,
  CreateRoleAssignmentInput,
  MembershipRepository,
  MembershipResult,
  Organization,
  OrganizationInvitation,
  OrganizationMember,
  RoleAssignment,
} from "./types.js";

function mapOrganization(row: Record<string, unknown>): Organization {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    slugLower: row.slug_lower as string,
    status: row.status as string,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

function mapMember(row: Record<string, unknown>): OrganizationMember {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    subjectId: row.subject_id as string,
    subjectType: row.subject_type as string,
    status: row.status as string,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

function mapInvitation(row: Record<string, unknown>): OrganizationInvitation {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    email: row.email as string,
    emailLower: row.email_lower as string,
    role: row.role as string,
    status: row.status as string,
    invitedBy: row.invited_by as string,
    expiresAt: new Date(row.expires_at as string),
    acceptedAt: row.accepted_at ? new Date(row.accepted_at as string) : null,
    revokedAt: row.revoked_at ? new Date(row.revoked_at as string) : null,
    createdAt: new Date(row.created_at as string),
  };
}

function mapRoleAssignment(row: Record<string, unknown>): RoleAssignment {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    subjectId: row.subject_id as string,
    subjectType: row.subject_type as string,
    role: row.role as string,
    scopeKind: row.scope_kind as string,
    scopeRef: (row.scope_ref as string) ?? null,
    createdAt: new Date(row.created_at as string),
    revokedAt: row.revoked_at ? new Date(row.revoked_at as string) : null,
  };
}

function safeError(message: string): MembershipResult<never> {
  return { ok: false, error: { kind: "internal", message } };
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}

export function createMembershipRepository(executor: SqlExecutor): MembershipRepository {
  return {
    async createOrganization(input: CreateOrganizationInput): Promise<MembershipResult<Organization>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `INSERT INTO membership.organizations (id, name, slug, slug_lower, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $5)
           ON CONFLICT (id) DO NOTHING
           RETURNING *`,
          [input.id, input.name, input.slug, input.slugLower, input.createdAt.toISOString()],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "conflict", entity: "organization" } };
        }
        return { ok: true, value: mapOrganization(result.rows[0]!) };
      } catch (err: unknown) {
        if (isUniqueViolation(err)) {
          return { ok: false, error: { kind: "conflict", entity: "organization" } };
        }
        return safeError("Failed to create organization");
      }
    },

    async getOrganizationById(id: string): Promise<MembershipResult<Organization>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT * FROM membership.organizations WHERE id = $1`,
          [id],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "not_found" } };
        }
        return { ok: true, value: mapOrganization(result.rows[0]!) };
      } catch {
        return safeError("Failed to get organization");
      }
    },

    async getOrganizationBySlug(slugLower: string): Promise<MembershipResult<Organization>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT * FROM membership.organizations WHERE slug_lower = $1`,
          [slugLower],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "not_found" } };
        }
        return { ok: true, value: mapOrganization(result.rows[0]!) };
      } catch {
        return safeError("Failed to get organization by slug");
      }
    },

    async listOrganizationsForSubject(subjectId: string): Promise<MembershipResult<Organization[]>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT o.* FROM membership.organizations o
           INNER JOIN membership.organization_members m ON m.org_id = o.id
           WHERE m.subject_id = $1 AND m.status = 'active'`,
          [subjectId],
        );
        return { ok: true, value: result.rows.map(mapOrganization) };
      } catch {
        return safeError("Failed to list organizations for subject");
      }
    },

    async bootstrapOrganization(input: BootstrapOrganizationInput): Promise<MembershipResult<{ org: Organization; member: OrganizationMember; roleAssignment: RoleAssignment }>> {
      try {
        const orgResult = await executor.execute<Record<string, unknown>>(
          `INSERT INTO membership.organizations (id, name, slug, slug_lower, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $5)
           ON CONFLICT (id) DO NOTHING
           RETURNING *`,
          [input.org.id, input.org.name, input.org.slug, input.org.slugLower, input.org.createdAt.toISOString()],
        );
        if (orgResult.rowCount === 0) {
          return { ok: false, error: { kind: "conflict", entity: "organization" } };
        }

        const memberResult = await executor.execute<Record<string, unknown>>(
          `INSERT INTO membership.organization_members (id, org_id, subject_id, subject_type, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $5)
           ON CONFLICT (id) DO NOTHING
           RETURNING *`,
          [input.member.id, input.member.orgId, input.member.subjectId, input.member.subjectType, input.member.createdAt.toISOString()],
        );
        if (memberResult.rowCount === 0) {
          return { ok: false, error: { kind: "conflict", entity: "organization_member" } };
        }

        const roleResult = await executor.execute<Record<string, unknown>>(
          `INSERT INTO membership.role_assignments (id, org_id, subject_id, subject_type, role, scope_kind, scope_ref, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO NOTHING
           RETURNING *`,
          [
            input.roleAssignment.id,
            input.roleAssignment.orgId,
            input.roleAssignment.subjectId,
            input.roleAssignment.subjectType,
            input.roleAssignment.role,
            input.roleAssignment.scopeKind,
            input.roleAssignment.scopeRef ?? null,
            input.roleAssignment.createdAt.toISOString(),
          ],
        );
        if (roleResult.rowCount === 0) {
          return { ok: false, error: { kind: "conflict", entity: "role_assignment" } };
        }

        return {
          ok: true,
          value: {
            org: mapOrganization(orgResult.rows[0]!),
            member: mapMember(memberResult.rows[0]!),
            roleAssignment: mapRoleAssignment(roleResult.rows[0]!),
          },
        };
      } catch (err: unknown) {
        if (isUniqueViolation(err)) {
          return { ok: false, error: { kind: "conflict", entity: "organization" } };
        }
        return safeError("Failed to bootstrap organization");
      }
    },

    async createMember(input: CreateOrganizationMemberInput): Promise<MembershipResult<OrganizationMember>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `INSERT INTO membership.organization_members (id, org_id, subject_id, subject_type, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $5)
           ON CONFLICT (id) DO NOTHING
           RETURNING *`,
          [input.id, input.orgId, input.subjectId, input.subjectType, input.createdAt.toISOString()],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "conflict", entity: "organization_member" } };
        }
        return { ok: true, value: mapMember(result.rows[0]!) };
      } catch (err: unknown) {
        if (isUniqueViolation(err)) {
          return { ok: false, error: { kind: "conflict", entity: "organization_member" } };
        }
        return safeError("Failed to create member");
      }
    },

    async getMemberById(orgId: string, memberId: string): Promise<MembershipResult<OrganizationMember>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT * FROM membership.organization_members WHERE org_id = $1 AND id = $2`,
          [orgId, memberId],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "not_found" } };
        }
        const member = mapMember(result.rows[0]!);
        if (member.status === "removed") {
          return { ok: false, error: { kind: "removed" } };
        }
        return { ok: true, value: member };
      } catch {
        return safeError("Failed to get member");
      }
    },

    async listMembers(orgId: string): Promise<MembershipResult<OrganizationMember[]>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT * FROM membership.organization_members WHERE org_id = $1 AND status = 'active'`,
          [orgId],
        );
        return { ok: true, value: result.rows.map(mapMember) };
      } catch {
        return safeError("Failed to list members");
      }
    },

    async removeMember(orgId: string, memberId: string, updatedAt: Date): Promise<MembershipResult<OrganizationMember>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `UPDATE membership.organization_members
           SET status = 'removed', updated_at = $3
           WHERE org_id = $1 AND id = $2 AND status = 'active'
           RETURNING *`,
          [orgId, memberId, updatedAt.toISOString()],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "not_found" } };
        }
        return { ok: true, value: mapMember(result.rows[0]!) };
      } catch {
        return safeError("Failed to remove member");
      }
    },

    async createInvitation(input: CreateInvitationInput): Promise<MembershipResult<OrganizationInvitation>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `INSERT INTO membership.organization_invitations (id, org_id, email, email_lower, role, token_hash, invited_by, expires_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO NOTHING
           RETURNING id, org_id, email, email_lower, role, status, invited_by, expires_at, accepted_at, revoked_at, created_at`,
          [input.id, input.orgId, input.email, input.emailLower, input.role, input.tokenHash, input.invitedBy, input.expiresAt.toISOString(), input.createdAt.toISOString()],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "conflict", entity: "invitation" } };
        }
        return { ok: true, value: mapInvitation(result.rows[0]!) };
      } catch (err: unknown) {
        if (isUniqueViolation(err)) {
          return { ok: false, error: { kind: "conflict", entity: "invitation" } };
        }
        return safeError("Failed to create invitation");
      }
    },

    async getInvitationById(orgId: string, invitationId: string): Promise<MembershipResult<OrganizationInvitation>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT id, org_id, email, email_lower, role, status, invited_by, expires_at, accepted_at, revoked_at, created_at
           FROM membership.organization_invitations WHERE org_id = $1 AND id = $2`,
          [orgId, invitationId],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "not_found" } };
        }
        const inv = mapInvitation(result.rows[0]!);
        if (inv.revokedAt !== null) {
          return { ok: false, error: { kind: "revoked" } };
        }
        if (inv.acceptedAt !== null) {
          return { ok: false, error: { kind: "already_accepted" } };
        }
        if (inv.expiresAt < new Date()) {
          return { ok: false, error: { kind: "expired" } };
        }
        return { ok: true, value: inv };
      } catch {
        return safeError("Failed to get invitation");
      }
    },

    async getInvitationByTokenHash(tokenHash: string): Promise<MembershipResult<OrganizationInvitation>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT id, org_id, email, email_lower, role, status, invited_by, expires_at, accepted_at, revoked_at, created_at
           FROM membership.organization_invitations WHERE token_hash = $1`,
          [tokenHash],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "not_found" } };
        }
        const inv = mapInvitation(result.rows[0]!);
        if (inv.revokedAt !== null) {
          return { ok: false, error: { kind: "revoked" } };
        }
        if (inv.acceptedAt !== null) {
          return { ok: false, error: { kind: "already_accepted" } };
        }
        if (inv.expiresAt < new Date()) {
          return { ok: false, error: { kind: "expired" } };
        }
        return { ok: true, value: inv };
      } catch {
        return safeError("Failed to get invitation by token");
      }
    },

    async listInvitations(orgId: string): Promise<MembershipResult<OrganizationInvitation[]>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT id, org_id, email, email_lower, role, status, invited_by, expires_at, accepted_at, revoked_at, created_at
           FROM membership.organization_invitations WHERE org_id = $1`,
          [orgId],
        );
        return { ok: true, value: result.rows.map(mapInvitation) };
      } catch {
        return safeError("Failed to list invitations");
      }
    },

    async revokeInvitation(orgId: string, invitationId: string, revokedAt: Date): Promise<MembershipResult<OrganizationInvitation>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `UPDATE membership.organization_invitations
           SET status = 'revoked', revoked_at = $3
           WHERE org_id = $1 AND id = $2 AND status = 'pending' AND revoked_at IS NULL AND accepted_at IS NULL
           RETURNING id, org_id, email, email_lower, role, status, invited_by, expires_at, accepted_at, revoked_at, created_at`,
          [orgId, invitationId, revokedAt.toISOString()],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "not_found" } };
        }
        return { ok: true, value: mapInvitation(result.rows[0]!) };
      } catch {
        return safeError("Failed to revoke invitation");
      }
    },

    async acceptInvitation(tokenHash: string, memberId: string, memberInput: CreateOrganizationMemberInput, acceptedAt: Date): Promise<MembershipResult<{ invitation: OrganizationInvitation; member: OrganizationMember }>> {
      try {
        const invResult = await executor.execute<Record<string, unknown>>(
          `UPDATE membership.organization_invitations
           SET status = 'accepted', accepted_at = $2
           WHERE token_hash = $1 AND status = 'pending' AND revoked_at IS NULL AND accepted_at IS NULL
           RETURNING id, org_id, email, email_lower, role, status, invited_by, expires_at, accepted_at, revoked_at, created_at`,
          [tokenHash, acceptedAt.toISOString()],
        );
        if (invResult.rowCount === 0) {
          return { ok: false, error: { kind: "not_found" } };
        }
        const invitation = mapInvitation(invResult.rows[0]!);
        if (invitation.expiresAt < acceptedAt) {
          return { ok: false, error: { kind: "expired" } };
        }

        const memberResult = await executor.execute<Record<string, unknown>>(
          `INSERT INTO membership.organization_members (id, org_id, subject_id, subject_type, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $5)
           ON CONFLICT (id) DO NOTHING
           RETURNING *`,
          [memberId, memberInput.orgId, memberInput.subjectId, memberInput.subjectType, memberInput.createdAt.toISOString()],
        );
        if (memberResult.rowCount === 0) {
          return { ok: false, error: { kind: "conflict", entity: "organization_member" } };
        }

        return {
          ok: true,
          value: {
            invitation,
            member: mapMember(memberResult.rows[0]!),
          },
        };
      } catch (err: unknown) {
        if (isUniqueViolation(err)) {
          return { ok: false, error: { kind: "conflict", entity: "organization_member" } };
        }
        return safeError("Failed to accept invitation");
      }
    },

    async createRoleAssignment(input: CreateRoleAssignmentInput): Promise<MembershipResult<RoleAssignment>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `INSERT INTO membership.role_assignments (id, org_id, subject_id, subject_type, role, scope_kind, scope_ref, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO NOTHING
           RETURNING *`,
          [input.id, input.orgId, input.subjectId, input.subjectType, input.role, input.scopeKind, input.scopeRef ?? null, input.createdAt.toISOString()],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "conflict", entity: "role_assignment" } };
        }
        return { ok: true, value: mapRoleAssignment(result.rows[0]!) };
      } catch (err: unknown) {
        if (isUniqueViolation(err)) {
          return { ok: false, error: { kind: "conflict", entity: "role_assignment" } };
        }
        return safeError("Failed to create role assignment");
      }
    },

    async listRoleAssignments(orgId: string, subjectId: string): Promise<MembershipResult<RoleAssignment[]>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT * FROM membership.role_assignments WHERE org_id = $1 AND subject_id = $2 AND revoked_at IS NULL`,
          [orgId, subjectId],
        );
        return { ok: true, value: result.rows.map(mapRoleAssignment) };
      } catch {
        return safeError("Failed to list role assignments");
      }
    },

    async revokeRoleAssignment(orgId: string, assignmentId: string, revokedAt: Date): Promise<MembershipResult<RoleAssignment>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `UPDATE membership.role_assignments
           SET revoked_at = $3
           WHERE org_id = $1 AND id = $2 AND revoked_at IS NULL
           RETURNING *`,
          [orgId, assignmentId, revokedAt.toISOString()],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "not_found" } };
        }
        return { ok: true, value: mapRoleAssignment(result.rows[0]!) };
      } catch {
        return safeError("Failed to revoke role assignment");
      }
    },
  };
}
