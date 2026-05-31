"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Webhook, ArrowRight } from "lucide-react";
import { OrgScope } from "@/components/shell/org-scope";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useSession } from "@/lib/session";
import { useAsync } from "@/lib/use-async";
import { wrap } from "@/lib/api";

export default function WebhooksListPage() {
  const params = useParams<{ orgSlug: string }>();
  const slug = params?.orgSlug ?? "";
  return (
    <OrgScope slug={slug}>
      {(org) => <Inner orgId={org.id} orgSlug={org.slug} />}
    </OrgScope>
  );
}

function Inner({ orgId, orgSlug }: { orgId: string; orgSlug: string }) {
  const { client } = useSession();
  const endpoints = useAsync(
    () => wrap(async () => (await client.webhooks.listEndpoints(orgId)).endpoints),
    [client, orgId],
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Webhooks</h1>
        <p className="text-sm text-muted-foreground">
          Endpoints that receive signed event deliveries from this organization.
          Open an endpoint to inspect its signing-secret version or rotate it.
        </p>
      </header>

      {endpoints.loading ? (
        <Card>
          <CardContent className="pt-6 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : endpoints.error ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">{endpoints.error.code}</CardTitle>
            <CardDescription>{endpoints.error.message}</CardDescription>
          </CardHeader>
        </Card>
      ) : !endpoints.data || endpoints.data.length === 0 ? (
        <EmptyState
          icon={Webhook}
          title="No webhook endpoints"
          description="When you create a webhook endpoint, it'll appear here. Use the API or CLI to create one — UI creation is coming in a follow-up."
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Secret version</TableHead>
                <TableHead>Last rotated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {endpoints.data.map((ep) => (
                <TableRow key={ep.id}>
                  <TableCell className="font-mono text-xs break-all max-w-[26rem]">
                    {ep.name ? (
                      <span>
                        <span className="font-sans font-medium not-italic">{ep.name}</span>
                        <span className="text-muted-foreground"> · </span>
                        {ep.url}
                      </span>
                    ) : (
                      ep.url
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ep.status === "active" ? "outline" : "destructive"}>
                      {ep.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">v{ep.secretVersion}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {ep.secretLastRotatedAt
                      ? new Date(ep.secretLastRotatedAt).toLocaleDateString()
                      : "never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/orgs/${orgSlug}/webhooks/${ep.id}`}
                      className="text-xs font-medium inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Open
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
