"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { z } from "zod";
import { Plus, FolderKanban } from "lucide-react";
import { OrgScope } from "@/components/shell/org-scope";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ZodForm } from "@/components/ui/zod-form";
import { PreconditionInsight } from "@/components/precondition/insight";
import { useSession } from "@/lib/session";
import { useAsync } from "@/lib/use-async";
import { useToast } from "@/components/ui/toast";
import type { ApiErrorBody } from "@/lib/api";

const schema = z.object({
  name: z.string().min(2).max(64),
  slug: z.string().regex(/^[a-z0-9-]*$/, "lowercase, digits, hyphens").max(48).optional(),
});

export default function ProjectsPage() {
  const params = useParams<{ orgSlug: string }>();
  const slug = params?.orgSlug ?? "";
  return <OrgScope slug={slug}>{(org) => <Inner orgId={org.id} orgSlug={org.slug} />}</OrgScope>;
}

function Inner({ orgId, orgSlug }: { orgId: string; orgSlug: string }) {
  const { client } = useSession();
  const { toast } = useToast();
  const projects = useAsync(() => client.listProjects(orgId), [client, orgId]);
  const [open, setOpen] = React.useState(false);
  const [precondition, setPrecondition] = React.useState<ApiErrorBody | null>(null);

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">Project containers for environments and configuration.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1.5" />
              New project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create project</DialogTitle>
            </DialogHeader>
            <ZodForm
              schema={schema}
              defaultValues={{ name: "", slug: "" }}
              fields={[
                { name: "name", label: "Name", placeholder: "Web app" },
                { name: "slug", label: "Slug", placeholder: "web-app", hint: "Optional URL identifier." },
              ]}
              submitLabel="Create"
              cancel={{ label: "Cancel", onClick: () => setOpen(false) }}
              onSubmit={async (v) => {
                const payload: { name: string; slug?: string } = { name: v.name };
                if (v.slug) payload.slug = v.slug;
                const r = await client.createProject(orgId, payload);
                if (!r.ok) {
                  if (r.error.code === "precondition_failed") setPrecondition(r.error);
                  else toast({ kind: "error", title: "Create failed", description: r.error.message });
                  return;
                }
                toast({ kind: "success", title: "Project created" });
                setOpen(false);
                projects.reload();
              }}
            />
          </DialogContent>
        </Dialog>
      </header>

      {precondition && (
        <PreconditionInsight
          error={precondition}
          resource="project"
          onDismiss={() => setPrecondition(null)}
        />
      )}

      {projects.loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : projects.error ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">{projects.error.code}</CardTitle>
            <CardDescription>{projects.error.message}</CardDescription>
          </CardHeader>
        </Card>
      ) : !projects.data || projects.data.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Group your environments and configuration by creating your first project."
          primaryAction={{ label: "New project", onClick: () => setOpen(true) }}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.data.map((p) => (
            <Link
              key={p.id}
              href={`/orgs/${orgSlug}/projects/${p.slug}/environments`}
              className="group"
            >
              <Card className="h-full transition-shadow group-hover:shadow-md group-hover:border-primary/40">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base truncate">{p.name}</CardTitle>
                    <Badge variant={p.status === "active" ? "success" : "secondary"}>{p.status}</Badge>
                  </div>
                  <CardDescription className="text-xs">{p.slug}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    Updated {new Date(p.updatedAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
