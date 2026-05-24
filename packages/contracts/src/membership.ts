export interface PublicOrganization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface CreateOrganizationRequest {
  name: string;
  slug?: string;
}

export interface CreateOrganizationResponse {
  organization: PublicOrganization;
  membership: {
    role: string;
    joinedAt: string;
  };
}

export interface ListOrganizationsResponse {
  organizations: PublicOrganization[];
}

export interface GetOrganizationResponse {
  organization: PublicOrganization;
}

export interface PublicMemberRoleAssignment {
  role: string;
  scopeKind: string;
}

export interface PublicMember {
  id: string;
  subjectType: string;
  subjectId: string;
  status: string;
  joinedAt: string;
  roles: PublicMemberRoleAssignment[];
}

export interface ListMembersResponse {
  members: PublicMember[];
}
