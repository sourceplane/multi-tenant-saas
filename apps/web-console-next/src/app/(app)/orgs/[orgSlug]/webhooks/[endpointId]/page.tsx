"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  RefreshCcw,
  Webhook as WebhookIcon,
  Pencil,
  ShieldOff,
  ShieldCheck,
  Trash2,
} from "lucide-react";
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
import { EditEndpointDialog } from "@/components/webhooks/edit-endpoint-dialog";
import { DisableEndpointDialog } from "@/components/webhooks/disable-endpoint-dialog";
import { EnableEndpointDialog } from "@/components/webhooks/enable-endpoint-dialog";
import { DeleteEndpointDialog } from "@/components/webhooks/delete-endpoint-dialog";

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
  const router = useRouter();
  const endpoints = useAsync(
    () => wrap(async () => (await client.webhooks.listEndpoints(orgId)).endpoints),
    [client, orgId],
  );
  const [rotateOpen, setRotateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [disableOpen, setDisableOpen] = React.useState(false);
  const [enableOpen, setEnableOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

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
  const isDisabled = endpoint.status === "disabled";

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
        <div className="shrink-0 flex items-center gap-2 flex-wrap justify-end">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-1.5" />
            Edit
          </Button>
          {!isDisabled && (
            <Button variant="outline" onClick={() => setDisableOpen(true)}>
              <ShieldOff className="h-4 w-4 mr-1.5" />
              Disable
            </Button>
          )}
          {isDisabled && (
            <Button variant="outline" onClick={() => setEnableOpen(true)}>
              <ShieldCheck className="h-4 w-4 mr-1.5" />
              Re-enable endpoint
            </Button>
          )}
          <Button variant="outline" onClick={() => setRotateOpen(true)}>
            <RefreshCcw className="h-4 w-4 mr-1.5" />
            Rotate secret
          </Button>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 mr-1.5" />
            Delete
          </Button>
        </div>
      </header>

      {isDisabled && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">This endpoint is disabled</CardTitle>
            <CardDescription>
              No deliveries are being attempted. Use{" "}
              <span className="font-medium">Re-enable endpoint</span> above
              to resume delivery on the next matching event — the signing
              secret is preserved.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

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
      <EditEndpointDialog
        orgId={orgId}
        endpointId={endpoint.id}
        current={{
          url: endpoint.url,
          name: endpoint.name,
          description: endpoint.description,
        }}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdated={() => endpoints.reload()}
      />
      <DisableEndpointDialog
        orgId={orgId}
        endpointId={endpoint.id}
        endpointLabel={label}
        open={disableOpen}
        onOpenChange={setDisableOpen}
        onDisabled={() => endpoints.reload()}
      />
      <EnableEndpointDialog
        orgId={orgId}
        endpointId={endpoint.id}
        endpointLabel={label}
        open={enableOpen}
        onOpenChange={setEnableOpen}
        onEnabled={() => endpoints.reload()}
      />
      <DeleteEndpointDialog
        orgId={orgId}
        endpointId={endpoint.id}
        endpointUrl={endpoint.url}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.push(`/orgs/${orgSlug}/webhooks`)}
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
