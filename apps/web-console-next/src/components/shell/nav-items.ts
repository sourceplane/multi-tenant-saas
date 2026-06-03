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

  // Account (Profile / Security activity) is not a nav section: the signed-in
  // identity lives in the account chip at the bottom of the sidebar (desktop)
  // and the drawer footer (mobile), matching Vercel's bottom-anchored user.

  if (orgBase) {
    // The primary sidebar is product-focused: the day-to-day surfaces an
    // operator works in. Organization administration (members, billing, API
    // keys, webhooks, config, audit, identity) lives behind a single Settings
    // entry, which opens the dedicated `/settings` surface with its own
    // secondary navigation (see `settings-nav.ts`).
    sections.push({
      id: "org",
      label: orgSlug ? `Org · ${orgSlug}` : "Organization",
      links: [
        { href: `${orgBase}/projects`, label: "Projects", icon: "FolderKanban" },
        { href: `${orgBase}/usage`, label: "Usage & quota", icon: "Gauge" },
        { href: `${orgBase}/settings`, label: "Settings", icon: "Settings" },
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
