"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { writeLastOrgSlug } from "@/lib/last-org";

/**
 * Invisible recorder: whenever the URL is scoped to an org, persist that slug as
 * the last-used org. Mounted once in the app shell so it covers every org-scoped
 * route without each page having to opt in.
 */
export function LastOrgRecorder() {
  const params = useParams<{ orgSlug?: string }>();
  const orgSlug = params?.orgSlug ?? null;
  React.useEffect(() => {
    if (orgSlug) writeLastOrgSlug(orgSlug);
  }, [orgSlug]);
  return null;
}
