// Tenancy contract types
// Every resource must be traceable to an organization.

export interface OrgScoped {
  orgId: string;
}

export interface ProjectScoped extends OrgScoped {
  projectId: string;
}

export interface TenantContext {
  orgId: string;
  projectId?: string;
  actorId: string;
  actorKind: "user" | "service_principal" | "workflow" | "system";
}
