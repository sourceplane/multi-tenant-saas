import type { MembershipRepository, MembershipResult, Organization, OrganizationMember, RoleAssignment } from "@saas/db/membership";
import { orgPublicId } from "../ids.js";

export interface ActorContext {
  subjectId: string;
  subjectType: string;
}

export interface OrganizationServiceDeps {
  repo: MembershipRepository;
  now: () => Date;
}

export interface CreateOrgInput {
  name: string;
  slug: string;
  slugLower: string;
}

export interface CreateOrgSuccess {
  organization: { id: string; name: string; slug: string; createdAt: string };
  membership: { role: string; joinedAt: string };
}

export type CreateOrgResult =
  | { ok: true; value: CreateOrgSuccess }
  | { ok: false; code: string; message: string; status: number };

export type ListOrgsResult =
  | { ok: true; value: { organizations: Array<{ id: string; name: string; slug: string; createdAt: string }> } }
  | { ok: false; code: string; message: string; status: number };

export type GetOrgResult =
  | { ok: true; value: { organization: { id: string; name: string; slug: string; createdAt: string } } }
  | { ok: false; code: string; message: string; status: number };

export function createOrganizationService(deps: OrganizationServiceDeps) {
  const { repo, now } = deps;

  return {
    async createOrganization(actor: ActorContext, input: CreateOrgInput): Promise<CreateOrgResult> {
      const orgId = crypto.randomUUID();
      const memberId = crypto.randomUUID();
      const roleAssignmentId = crypto.randomUUID();
      const timestamp = now();

      const result = await repo.bootstrapOrganization({
        org: {
          id: orgId,
          name: input.name,
          slug: input.slug,
          slugLower: input.slugLower,
          createdAt: timestamp,
        },
        member: {
          id: memberId,
          orgId,
          subjectId: actor.subjectId,
          subjectType: actor.subjectType,
          createdAt: timestamp,
        },
        roleAssignment: {
          id: roleAssignmentId,
          orgId,
          subjectId: actor.subjectId,
          subjectType: actor.subjectType,
          role: "owner",
          scopeKind: "organization",
          scopeRef: null,
          createdAt: timestamp,
        },
      });

      if (!result.ok) {
        if (result.error.kind === "conflict") {
          return { ok: false, code: "conflict", message: "Organization already exists", status: 409 };
        }
        return { ok: false, code: "internal_error", message: "Failed to create organization", status: 500 };
      }

      const { org, member, roleAssignment } = result.value;
      return {
        ok: true,
        value: {
          organization: {
            id: orgPublicId(org.id),
            name: org.name,
            slug: org.slug,
            createdAt: org.createdAt.toISOString(),
          },
          membership: {
            role: roleAssignment.role,
            joinedAt: member.createdAt.toISOString(),
          },
        },
      };
    },

    async listOrganizations(actor: ActorContext): Promise<ListOrgsResult> {
      const result = await repo.listOrganizationsForSubject(actor.subjectId);
      if (!result.ok) {
        return { ok: false, code: "internal_error", message: "Failed to list organizations", status: 500 };
      }
      return {
        ok: true,
        value: {
          organizations: result.value.map((org) => ({
            id: orgPublicId(org.id),
            name: org.name,
            slug: org.slug,
            createdAt: org.createdAt.toISOString(),
          })),
        },
      };
    },

    async getOrganization(actor: ActorContext, orgUuid: string): Promise<GetOrgResult> {
      const rolesResult = await repo.listRoleAssignments(orgUuid, actor.subjectId);
      if (!rolesResult.ok || rolesResult.value.length === 0) {
        return { ok: false, code: "not_found", message: "Organization not found", status: 404 };
      }

      const orgResult = await repo.getOrganizationById(orgUuid);
      if (!orgResult.ok) {
        return { ok: false, code: "not_found", message: "Organization not found", status: 404 };
      }

      const org = orgResult.value;
      return {
        ok: true,
        value: {
          organization: {
            id: orgPublicId(org.id),
            name: org.name,
            slug: org.slug,
            createdAt: org.createdAt.toISOString(),
          },
        },
      };
    },
  };
}
