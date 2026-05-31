"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  Boxes,
  KeyRound,
  Settings,
  ScrollText,
  Receipt,
  Users,
  Mail,
  Webhook,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function Sidebar() {
  const params = useParams<{ orgSlug?: string; projectSlug?: string }>();
  const pathname = usePathname();
  const orgSlug = params?.orgSlug;
  const projectSlug = params?.projectSlug;

  const orgBase = orgSlug ? `/orgs/${orgSlug}` : null;
  const projectBase = orgSlug && projectSlug ? `/orgs/${orgSlug}/projects/${projectSlug}` : null;

  const orgItems: NavItem[] = orgBase
    ? [
        { href: `${orgBase}/projects`, label: "Projects", icon: FolderKanban },
        { href: `${orgBase}/members`, label: "Members", icon: Users },
        { href: `${orgBase}/invitations`, label: "Invitations", icon: Mail },
        { href: `${orgBase}/api-keys`, label: "API keys", icon: KeyRound },
        { href: `${orgBase}/webhooks`, label: "Webhooks", icon: Webhook },
        { href: `${orgBase}/config`, label: "Config", icon: Settings },
        { href: `${orgBase}/audit`, label: "Audit log", icon: ScrollText },
        { href: `${orgBase}/billing`, label: "Billing", icon: Receipt },
      ]
    : [];

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-card/40">
      <div className="px-4 py-4 flex items-center gap-2">
        <div className="h-7 w-7 rounded-md bg-gradient-to-br from-primary to-primary/40 grid place-items-center text-primary-foreground text-xs font-bold">
          S
        </div>
        <div className="text-sm font-semibold tracking-tight">Sourceplane</div>
      </div>

      <nav className="px-2 pb-4 space-y-6 overflow-y-auto scrollbar-thin">
        <Section label="Workspace">
          <SidebarLink href="/orgs" icon={Building2} active={pathname === "/orgs"}>
            Organizations
          </SidebarLink>
        </Section>

        <Section label="Account">
          <SidebarLink
            href="/account/security"
            icon={ShieldCheck}
            active={pathname?.startsWith("/account/security") ?? false}
          >
            Security activity
          </SidebarLink>
        </Section>

        {orgBase && (
          <Section label={`Org · ${orgSlug}`}>
            {orgItems.map((it) => (
              <SidebarLink
                key={it.href}
                href={it.href}
                icon={it.icon}
                active={pathname?.startsWith(it.href) ?? false}
              >
                {it.label}
              </SidebarLink>
            ))}
          </Section>
        )}

        {projectBase && (
          <Section label={`Project · ${projectSlug}`}>
            <SidebarLink
              href={`${projectBase}/environments`}
              icon={Boxes}
              active={pathname?.startsWith(`${projectBase}/environments`) ?? false}
            >
              Environments
            </SidebarLink>
          </Section>
        )}
      </nav>

      <div className="mt-auto p-3 text-[10px] text-muted-foreground border-t">
        <div className="flex items-center justify-between">
          <span>v0.0 · next-console</span>
          <ChevronRight className="h-3 w-3 opacity-40" />
        </div>
      </div>
    </aside>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(true);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", !open && "-rotate-90")} />
      </button>
      {open && <div className="mt-1 space-y-0.5">{children}</div>}
    </div>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  active,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        active ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 opacity-80" />
      <span className="truncate">{children}</span>
    </Link>
  );
}
