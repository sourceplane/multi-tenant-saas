"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, RefreshCcw, Webhook as WebhookIcon } from "lucide-react";
import { OrgScope } from "@/components/shell/org-scope";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useSession } from "@/lib/session";
import { useAsync } from "@/lib/use-async";
import { wrap } from "@/lib/api";
import { RotateSecretDialog } from "@/components/webhooks/rotate-secret-dialog";

export default function WebhookEndpointDetailPage() {
  const params = useParams<{ orgSlug: string; endpointId: string }>();
  const slug = params?.orgSlug ?? "";
  const endpointId = params?.endpointId ?? "";
  return (
    <OrgScope slug={slug}>
      {(org) => <Inner orgId={org.id} orgSlug={org.slug} endpointId={endpointId} />}
    </OrgScope>
  );
}

function Inner({
  orgId,
  orgSlug,
  endpointId,
}: {
  orgId: string;
  orgSlug: string;
  endpointId: string;
}) {
  const { client } = useSession();
  const endpoints = useAsync(
    () => wrap(async () => (await client.webhooks.listEndpoints(orgId)).endpoints),
    [client, orgId],
  );
  const [rotateOpen, setRotateOpen] = React.useState(false);

  const endpoint = React.useMemo(
    () => endpoints.data?.find((e) => e.id === endpointId) ?? null,
    [endpoints.data, endpointId],
  );

  if (endpoints.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Card>
          <CardContent className="pt-6 space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (endpoints.error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">{endpoints.error.code}</CardTitle>
          <CardDescription>{endpoints.error.message}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!endpoint) {
    return (
      <EmptyState
        icon={WebhookIcon}
        title="Webhook endpoint not found"
        description={`No endpoint matches id “${endpointId}”. It may have been deleted.`}
        primaryAction={{ label: "Back to webhooks", href: `/orgs/${orgSlug}/webhooks` }}
      />
    );
  }

  const label = endpoint.name ?? endpoint.url;

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={`/orgs/${orgSlug}/webhooks`}
          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3 w-3 mr-0.5" />
          Webhooks
        </Link>
      </div>

      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h1 className="text-xl font-semibold tracking-tight truncate">
            {endpoint.name ?? "Webhook endpoint"}
          </h1>
          <p className="text-xs text-muted-foreground font-mono break-all">
            {endpoint.url}
          </p>
        </div>
        <div className="shrink-0">
          <Button variant="destructive" onClick={() => setRotateOpen(true)}>
            <RefreshCcw className="h-4 w-4 mr-1.5" />
            Rotate signing secret
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Endpoint metadata</CardTitle>
          <CardDescription>
            Read-only fields. The signing secret is never displayed here — it is
            shown exactly once at rotation time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
            <Field label="ID" value={<span className="font-mono">{endpoint.id}</span>} />
            <Field
              label="Status"
              value={
                <Badge variant={endpoint.status === "active" ? "outline" : "destructive"}>
                  {endpoint.status}
                </Badge>
              }
            />
            <Field label="Secret version" value={`v${endpoint.secretVersion}`} />
            <Field
              label="Last rotated"
              value={
                endpoint.secretLastRotatedAt
                  ? new Date(endpoint.secretLastRotatedAt).toLocaleString()
                  : "never"
              }
            />
            <Field
              label="Created"
              value={new Date(endpoint.createdAt).toLocaleString()}
            />
            <Field
              label="Project"
              value={endpoint.projectId ?? <span className="text-muted-foreground">org-scoped</span>}
            />
            {endpoint.disabledAt && (
              <Field
                label="Disabled"
                value={`${new Date(endpoint.disabledAt).toLocaleString()}${
                  endpoint.disabledReason ? ` · ${endpoint.disabledReason}` : ""
                }`}
              />
            )}
            {endpoint.description && (
              <Field
                label="Description"
                value={<span className="text-muted-foreground">{endpoint.description}</span>}
              />
            )}
          </dl>
        </CardContent>
      </Card>

      <RotateSecretDialog
        orgId={orgId}
        endpointId={endpoint.id}
        endpointLabel={label}
        open={rotateOpen}
        onOpenChange={setRotateOpen}
        onRotated={() => endpoints.reload()}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
