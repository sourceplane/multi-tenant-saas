"use client";

import * as React from "react";
import { useSession } from "@/lib/session";
import { useAsync } from "@/lib/use-async";
import type { PublicOrganization } from "@saas/contracts/membership";

/**
 * Resolves an organization slug to its full record.
 * URL-driven scope (we never store the resolved id in localStorage).
 */
export function useOrgBySlug(slug: string) {
  const { client } = useSession();
  const state = useAsync(() => client.listOrganizations(), [client, slug]);
  const org: PublicOrganization | null = React.useMemo(() => {
    if (!state.data) return null;
    return state.data.find((o) => o.slug === slug) ?? null;
  }, [state.data, slug]);
  return { org, loading: state.loading, error: state.error, reload: state.reload };
}
