"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Building2, Copy, ShieldAlert } from "lucide-react";
import { OrgScope } from "@/components/shell/org-scope";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InfoTooltip } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast";

export default function OrgSettingsPage() {
  const params = useParams<{ orgSlug: string }>();
  const slug = params?.orgSlug ?? "";
  return <OrgScope slug={slug}>{(org) => <Inner org={org} />}</OrgScope>;
}

function Inner({ org }: { org: { id: string; name: string; slug: string } }) {
  const { toast } = useToast();
  const copy = (value: string, what: string) => {
    void navigator.clipboard?.writeText(value);
    toast({ kind: "success", title: `${what} copied` });
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Organization settings</h1>
        <p className="text-sm text-muted-foreground">Identity and lifecycle for this organization.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" /> General
          </CardTitle>
          <CardDescription>
            Renaming an organization isn&apos;t available from the console yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <ReadonlyField label="Name" value={org.name} />
          <ReadonlyField label="Slug" value={org.slug} onCopy={() => copy(org.slug, "Slug")} />
          <ReadonlyField label="Organization ID" value={org.id} mono onCopy={() => copy(org.id, "ID")} />
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-4 w-4" /> Danger zone
          </CardTitle>
          <CardDescription>Destructive actions for this organization.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">Delete organization</div>
              <p className="text-xs text-muted-foreground">
                Org deletion is handled by support to protect against accidental,
                irreversible data loss.
              </p>
            </div>
            <InfoTooltip label="Contact support to delete an organization.">
              <span>
                <Button variant="outline" disabled>
                  Delete…
                </Button>
              </span>
            </InfoTooltip>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReadonlyField({
  label,
  value,
  mono,
  onCopy,
}: {
  label: string;
  value: string;
  mono?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input value={value} disabled className={mono ? "font-mono text-xs" : ""} />
        {onCopy ? (
          <Button type="button" variant="ghost" size="icon" aria-label={`Copy ${label}`} onClick={onCopy}>
            <Copy className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
