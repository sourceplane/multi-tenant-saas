import type { IntegrationConnection } from "@saas/db/integrations";
import type { PublicConnection, IntegrationProviderId } from "@saas/contracts/integrations";
import { connectionPublicId, orgPublicId } from "./ids.js";

function isoOrNull(d: Date | null): string | null {
  return d == null ? null : d.toISOString();
}

/**
 * Safe projection: no installation id, no state fields, no timestamps the
 * contract doesn't declare. The repo layer already excludes the nonce hash.
 */
export function toPublicConnection(connection: IntegrationConnection): PublicConnection {
  return {
    id: connectionPublicId(connection.id),
    orgId: orgPublicId(connection.orgId),
    provider: connection.provider as IntegrationProviderId,
    status: connection.status,
    displayName: connection.displayName,
    externalAccountLogin: connection.externalAccountLogin,
    externalAccountType: connection.externalAccountType,
    repositorySelection: null,
    createdBy: connection.createdBy,
    connectedAt: isoOrNull(connection.connectedAt),
    revokedAt: isoOrNull(connection.revokedAt),
    suspendedAt: isoOrNull(connection.suspendedAt),
    createdAt: connection.createdAt.toISOString(),
    updatedAt: connection.updatedAt.toISOString(),
  };
}

/** Variant carrying the installation's repository selection when loaded. */
export function toPublicConnectionWithSelection(
  connection: IntegrationConnection,
  repositorySelection: string | null,
): PublicConnection {
  return { ...toPublicConnection(connection), repositorySelection };
}
