"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Boxes } from "lucide-react";
import { OrgScope } from "@/components/shell/org-scope";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { wrap } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useAsync } from "@/lib/use-async";

export default function EnvironmentDetail() {
  const params = useParams<{ orgSlug: string; projectSlug: string; envSlug: string }>();
  const orgSlug = params?.orgSlug ?? "";
  const projectSlug = params?.projectSlug ?? "";
  const envSlug = params?.envSlug ?? "";
  return (
    <OrgScope slug={orgSlug}>
      {(org) => <Inner orgId={org.id} projectSlug={projectSlug} envSlug={envSlug} />}
    </OrgScope>
  );
}

function Inner({
  orgId,
  projectSlug,
  envSlug,
}: {
  orgId: string;
  projectSlug: string;
  envSlug: string;
}) {
  const { client } = useSession();
  const projects = useAsync(
    () => wrap(async () => (await client.projects.list(orgId)).projects),
    [client, orgId],
  );
  const project = projects.data?.find((p) => p.slug === projectSlug) ?? null;
  const envs = useAsync(
    () =>
      project
        ? wrap(async () => (await client.environments.list(orgId, project.id)).environments)
        : Promise.resolve({
            ok: false as const,
            status: 0,
            error: { code: "pending", message: "loading project" },
          }),
    [client, orgId, project?.id],
  );
  const env = envs.data?.find((e) => e.slug === envSlug) ?? null;

  if (projects.loading || envs.loading) return <Skeleton className="h-32 w-full" />;
  if (!project || !env) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Environment not found</CardTitle>
          <CardDescription>
            No environment matches {projectSlug}/{envSlug}.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2">
        <Boxes className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">{env.name}</h1>
        <Badge variant={env.status === "active" ? "success" : "secondary"}>{env.status}</Badge>
      </header>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identity</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Pair k="Project" v={project.name} />
            <Pair k="Project slug" v={project.slug} />
            <Pair k="Environment" v={env.name} />
            <Pair k="Environment slug" v={env.slug} />
            <Pair k="Environment ID" v={env.id} mono />
            <Pair k="Project ID" v={env.projectId} mono />
            <Pair k="Created" v={new Date(env.createdAt).toLocaleString()} />
            <Pair k="Updated" v={new Date(env.updatedAt).toLocaleString()} />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function Pair({ k, v, mono = false }: { k: string; v: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase text-muted-foreground">{k}</div>
      <div className={mono ? "font-mono text-xs break-all" : "font-medium"}>{v}</div>
    </div>
  );
}
