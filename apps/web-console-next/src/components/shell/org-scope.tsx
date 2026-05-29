"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useOrgBySlug } from "@/lib/use-org";
import { AlertTriangle } from "lucide-react";

/**
 * Shared wrapper for per-org pages: resolves slug → org, surfaces
 * loading and not-found states uniformly so each page can stay focused
 * on its resource.
 */
export function OrgScope({
  slug,
  children,
}: {
  slug: string;
  children: (org: { id: string; name: string; slug: string }) => React.ReactNode;
}) {
  const { org, loading, error } = useOrgBySlug(slug);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-3 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Failed to load organization
          </CardTitle>
          <CardDescription>{error.message}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!org) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Organization not found"
        description={`No org matches slug “${slug}”. It may have been archived or you no longer have access.`}
        primaryAction={{ label: "Back to organizations", href: "/orgs" }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{org.slug}</Badge>
        <span className="text-sm text-muted-foreground">{org.name}</span>
      </div>
      {children(org)}
    </div>
  );
}
