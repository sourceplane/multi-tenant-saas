"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { ScrollText } from "lucide-react";
import { OrgScope } from "@/components/shell/org-scope";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/session";
import { useAsync } from "@/lib/use-async";

export default function AuditPage() {
  const params = useParams<{ orgSlug: string }>();
  const slug = params?.orgSlug ?? "";
  return <OrgScope slug={slug}>{(org) => <Inner orgId={org.id} />}</OrgScope>;
}

function Inner({ orgId }: { orgId: string }) {
  const { client } = useSession();
  const [category, setCategory] = React.useState("");
  const [appliedCategory, setAppliedCategory] = React.useState("");
  const audit = useAsync(
    () => client.listAudit(orgId, appliedCategory ? { category: appliedCategory } : undefined),
    [client, orgId, appliedCategory],
  );

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Audit log</h1>
          <p className="text-sm text-muted-foreground">
            Immutable record of org-scoped events. Filter by category for forensic queries.
          </p>
        </div>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setAppliedCategory(category.trim());
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="cat" className="text-xs">
              Category
            </Label>
            <Input
              id="cat"
              placeholder="auth · membership · projects · …"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-56"
            />
          </div>
          <Button type="submit" variant="outline">
            Filter
          </Button>
        </form>
      </header>

      {audit.loading ? (
        <Card>
          <CardContent className="pt-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : audit.error ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">{audit.error.code}</CardTitle>
            <CardDescription>{audit.error.message}</CardDescription>
          </CardHeader>
        </Card>
      ) : !audit.data || audit.data.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No audit entries"
          description={
            appliedCategory
              ? `No events match category “${appliedCategory}”.`
              : "Activity in this org will surface here as events are recorded."
          }
        />
      ) : (
        <div className="space-y-2">
          {audit.data.map((e) => (
            <Card key={e.id} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {e.eventType}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {e.category}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {e.actorType}:{e.actorId.slice(0, 12)}
                    </span>
                  </div>
                  <div className="text-sm">{e.description}</div>
                  <div className="text-[11px] text-muted-foreground font-mono mt-1">
                    req {e.requestId} · subject {e.subject.kind}:{e.subject.id}
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {new Date(e.occurredAt).toLocaleString()}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
