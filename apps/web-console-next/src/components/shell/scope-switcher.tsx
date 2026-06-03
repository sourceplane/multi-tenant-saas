"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronsUpDown, Slash, Building2, FolderKanban, Boxes } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/session";
import type { ApiClient } from "@/lib/api";
import type { PublicOrganization } from "@saas/contracts/membership";
import type { PublicProject, PublicEnvironment } from "@saas/contracts/projects";

/**
 * URL-driven scope switcher.
 *
 * - Reads org/project/env slugs from the URL params (NOT sessionStorage).
 * - Surfaces the multi-tenant scope on every page so tenant isolation is
 *   always visible to the operator.
 * - Lets the user jump scopes via a single dropdown; selection re-writes the
 *   URL, never local state.
 */
export function ScopeSwitcher() {
  const params = useParams<{ orgSlug?: string; projectSlug?: string; envSlug?: string }>();
  const router = useRouter();
  const { client, token } = useSession();

  const orgSlug = params?.orgSlug ?? null;
  const projectSlug = params?.projectSlug ?? null;
  const envSlug = params?.envSlug ?? null;

  const [orgs, setOrgs] = React.useState<PublicOrganization[] | null>(null);
  const [projects, setProjects] = React.useState<PublicProject[] | null>(null);
  const [envs, setEnvs] = React.useState<PublicEnvironment[] | null>(null);

  React.useEffect(() => {
    if (!token) return;
    void loadOrgs(client, setOrgs);
  }, [token, client]);

  const currentOrg = React.useMemo(() => orgs?.find((o) => o.slug === orgSlug) ?? null, [orgs, orgSlug]);

  React.useEffect(() => {
    if (!currentOrg) {
      setProjects(null);
      return;
    }
    void loadProjects(client, currentOrg.id, setProjects);
  }, [client, currentOrg]);

  const currentProject = React.useMemo(
    () => projects?.find((p) => p.slug === projectSlug) ?? null,
    [projects, projectSlug],
  );

  React.useEffect(() => {
    if (!currentOrg || !currentProject) {
      setEnvs(null);
      return;
    }
    void loadEnvs(client, currentOrg.id, currentProject.id, setEnvs);
  }, [client, currentOrg, currentProject]);

  return (
    <div className="flex min-w-0 items-center gap-1 text-sm">
      <Crumb
        icon={<Building2 className="h-3.5 w-3.5" />}
        label={currentOrg?.name ?? orgSlug ?? "Select organization"}
        muted={!orgSlug}
      >
        {orgs?.length ? (
          <>
            <DropdownMenuLabel>Organizations</DropdownMenuLabel>
            {orgs.map((o) => (
              <DropdownMenuItem key={o.id} onSelect={() => router.push(`/orgs/${o.slug}/projects`)}>
                <Building2 className="h-4 w-4 opacity-70" /> {o.name}
                <span className="ml-auto text-[10px] text-muted-foreground">{o.slug}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem onSelect={() => router.push("/orgs")}>View all organizations…</DropdownMenuItem>
      </Crumb>

      {orgSlug && (
        <div className="hidden min-w-0 items-center md:flex">
          <Slash className="h-3 w-3 text-muted-foreground/60 mx-0.5" />
          <Crumb
            icon={<FolderKanban className="h-3.5 w-3.5" />}
            label={currentProject?.name ?? projectSlug ?? "Select project"}
            muted={!projectSlug}
          >
            {projects?.length ? (
              <>
                <DropdownMenuLabel>Projects</DropdownMenuLabel>
                {projects.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onSelect={() =>
                      router.push(`/orgs/${orgSlug}/projects/${p.slug}/environments`)
                    }
                  >
                    <FolderKanban className="h-4 w-4 opacity-70" /> {p.name}
                    <span className="ml-auto text-[10px] text-muted-foreground">{p.slug}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            ) : null}
            <DropdownMenuItem onSelect={() => router.push(`/orgs/${orgSlug}/projects`)}>
              View all projects…
            </DropdownMenuItem>
          </Crumb>
        </div>
      )}

      {orgSlug && projectSlug && (
        <div className="hidden min-w-0 items-center md:flex">
          <Slash className="h-3 w-3 text-muted-foreground/60 mx-0.5" />
          <Crumb
            icon={<Boxes className="h-3.5 w-3.5" />}
            label={envs?.find((e) => e.slug === envSlug)?.name ?? envSlug ?? "All environments"}
            muted={!envSlug}
          >
            {envs?.length ? (
              <>
                <DropdownMenuLabel>Environments</DropdownMenuLabel>
                {envs.map((e) => (
                  <DropdownMenuItem
                    key={e.id}
                    onSelect={() =>
                      router.push(`/orgs/${orgSlug}/projects/${projectSlug}/environments/${e.slug}`)
                    }
                  >
                    <Boxes className="h-4 w-4 opacity-70" /> {e.name}
                    <span className="ml-auto text-[10px] text-muted-foreground">{e.slug}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            ) : null}
            <DropdownMenuItem
              onSelect={() => router.push(`/orgs/${orgSlug}/projects/${projectSlug}/environments`)}
            >
              View all environments…
            </DropdownMenuItem>
          </Crumb>
        </div>
      )}
    </div>
  );
}

function Crumb({
  icon,
  label,
  muted,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "group inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm border border-transparent",
          "hover:bg-accent hover:border-border transition-colors",
          muted && "text-muted-foreground",
        )}
      >
        {icon}
        <span className="max-w-[44vw] truncate font-medium sm:max-w-[160px]">{label}</span>
        <ChevronsUpDown className="h-3 w-3 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[240px]">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

async function loadOrgs(
  client: ApiClient,
  setOrgs: (o: PublicOrganization[] | null) => void,
) {
  try {
    const r = await client.organizations.list();
    setOrgs(r.organizations);
  } catch {
    setOrgs([]);
  }
}
async function loadProjects(
  client: ApiClient,
  orgId: string,
  setProjects: (p: PublicProject[] | null) => void,
) {
  try {
    const r = await client.projects.list(orgId);
    setProjects(r.projects);
  } catch {
    setProjects([]);
  }
}
async function loadEnvs(
  client: ApiClient,
  orgId: string,
  projectId: string,
  setEnvs: (e: PublicEnvironment[] | null) => void,
) {
  try {
    const r = await client.environments.list(orgId, projectId);
    setEnvs(r.environments);
  } catch {
    setEnvs([]);
  }
}

void Link;
