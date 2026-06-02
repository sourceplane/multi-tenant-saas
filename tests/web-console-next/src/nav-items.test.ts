import { buildNavSections, isLinkActive } from "@web-console-next/components/shell/nav-items";

describe("buildNavSections", () => {
  it("always includes Workspace and Account sections", () => {
    const ids = buildNavSections({}).map((s) => s.id);
    expect(ids).toContain("workspace");
    expect(ids).toContain("account");
  });

  it("exposes the profile + security activity links in the account section", () => {
    const account = buildNavSections({}).find((s) => s.id === "account")!;
    const hrefs = account.links.map((l) => l.href);
    expect(hrefs).toEqual(["/account", "/account/security"]);
  });

  it("omits org/project sections without slugs", () => {
    const ids = buildNavSections({}).map((s) => s.id);
    expect(ids).not.toContain("org");
    expect(ids).not.toContain("project");
  });

  it("adds the org section when orgSlug is present", () => {
    const org = buildNavSections({ orgSlug: "acme" }).find((s) => s.id === "org")!;
    const hrefs = org.links.map((l) => l.href);
    expect(hrefs).toContain("/orgs/acme/projects");
    expect(hrefs).toContain("/orgs/acme/billing");
    expect(org.label).toBe("Org · acme");
  });

  it("adds the project section only when both slugs are present", () => {
    expect(buildNavSections({ orgSlug: "acme" }).find((s) => s.id === "project")).toBeUndefined();
    const project = buildNavSections({ orgSlug: "acme", projectSlug: "web" }).find((s) => s.id === "project")!;
    expect(project.links[0]!.href).toBe("/orgs/acme/projects/web/environments");
  });
});

describe("isLinkActive", () => {
  it("matches /orgs only exactly (not nested org pages)", () => {
    expect(isLinkActive("/orgs", "/orgs")).toBe(true);
    expect(isLinkActive("/orgs", "/orgs/acme/projects")).toBe(false);
  });

  it("matches /account exactly so it does not swallow /account/security", () => {
    expect(isLinkActive("/account", "/account")).toBe(true);
    expect(isLinkActive("/account", "/account/security")).toBe(false);
    expect(isLinkActive("/account/security", "/account/security")).toBe(true);
  });

  it("matches a link when the path is the href or a child of it", () => {
    expect(isLinkActive("/orgs/acme/usage", "/orgs/acme/usage")).toBe(true);
    expect(isLinkActive("/orgs/acme/webhooks", "/orgs/acme/webhooks/ep_123")).toBe(true);
  });

  it("does not match sibling prefixes", () => {
    expect(isLinkActive("/orgs/acme/api-keys", "/orgs/acme/api-keys-archive")).toBe(false);
  });

  it("returns false for a null pathname", () => {
    expect(isLinkActive("/orgs", null)).toBe(false);
  });
});
