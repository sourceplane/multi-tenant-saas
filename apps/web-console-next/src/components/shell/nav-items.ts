/**
 * Pure navigation model for the sidebar and the mobile nav drawer (Task 0127 /
 * U11). Dependency-free (no React, no icons) so the section/link composition is
 * unit-testable and shared by both `sidebar.tsx` (desktop) and `mobile-nav.tsx`
 * (the Sheet drawer on small screens). Icon resolution happens in the renderer.
 */

export interface NavLink {
  href: string;
  label: string;
  /** lucide icon name, resolved by the renderer. */
  icon: string;
}

export interface NavSection {
  /** stable id for keys/tests. */
  id: string;
  label: string;
  links: NavLink[];
}

export interface NavScope {
  orgSlug?: string | null;
  projectSlug?: string | null;
}

/**
 * Build the sidebar sections for the current URL scope. Org and project
 * sections only appear when their slug is present, matching the URL-driven
 * scope invariant (no local navigation state).
 */
export function buildNavSections(scope: NavScope): NavSection[] {
  const sections: NavSection[] = [];
  const orgSlug = scope.orgSlug ?? null;
  const projectSlug = scope.projectSlug ?? null;
  const orgBase = orgSlug ? `/orgs/${orgSlug}` : null;
  const projectBase = orgSlug && projectSlug ? `/orgs/${orgSlug}/projects/${projectSlug}` : null;

  sections.push({
    id: "workspace",
    label: "Workspace",
    links: [{ href: "/orgs", label: "Organizations", icon: "Building2" }],
  });

  sections.push({
    id: "account",
    label: "Account",
    links: [
      { href: "/account", label: "Profile", icon: "User2" },
      { href: "/account/security", label: "Security activity", icon: "ShieldCheck" },
    ],
  });

  if (orgBase) {
    // Org-scoped links for routes that exist today. `usage` and `settings`
    // links are added by their respective U11 slices alongside their routes.
    sections.push({
      id: "org",
      label: orgSlug ? `Org · ${orgSlug}` : "Organization",
      links: [
        { href: `${orgBase}/projects`, label: "Projects", icon: "FolderKanban" },
        { href: `${orgBase}/members`, label: "Members", icon: "Users" },
        { href: `${orgBase}/invitations`, label: "Invitations", icon: "Mail" },
        { href: `${orgBase}/usage`, label: "Usage & quota", icon: "Gauge" },
        { href: `${orgBase}/api-keys`, label: "API keys", icon: "KeyRound" },
        { href: `${orgBase}/webhooks`, label: "Webhooks", icon: "Webhook" },
        { href: `${orgBase}/config`, label: "Config", icon: "Settings" },
        { href: `${orgBase}/audit`, label: "Audit log", icon: "ScrollText" },
        { href: `${orgBase}/billing`, label: "Billing", icon: "Receipt" },
        { href: `${orgBase}/settings`, label: "Settings", icon: "SlidersHorizontal" },
      ],
    });
  }

  if (projectBase) {
    sections.push({
      id: "project",
      label: projectSlug ? `Project · ${projectSlug}` : "Project",
      links: [{ href: `${projectBase}/environments`, label: "Environments", icon: "Boxes" }],
    });
  }

  return sections;
}

/**
 * Resolve the active link for a pathname: the longest matching `href` prefix
 * wins, so `/orgs/x/projects/y/environments` highlights Environments, not
 * Projects. `/orgs` (exact) only highlights when the path is exactly `/orgs`.
 */
export function isLinkActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (href === "/orgs") return pathname === "/orgs";
  if (href === "/account") return pathname === "/account";
  return pathname === href || pathname.startsWith(`${href}/`);
}
