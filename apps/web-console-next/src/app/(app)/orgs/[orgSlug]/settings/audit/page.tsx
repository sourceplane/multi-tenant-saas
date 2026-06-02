"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Download, ScrollText } from "lucide-react";
import { OrgScope } from "@/components/shell/org-scope";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { wrap } from "@/lib/api";
import { useSession } from "@/lib/session";
import {
  appendAuditPage,
  buildAuditQuery,
  EMPTY_AUDIT_FILTERS,
  EMPTY_AUDIT_LOG,
  formatAuditActor,
  formatAuditTimestamp,
  hasActiveAuditFilters,
  hasMoreAudit,
  type AuditFilterFormValues,
  type AuditLogState,
} from "@/components/audit/audit-log";

export default function AuditPage() {
  const params = useParams<{ orgSlug: string }>();
  const slug = params?.orgSlug ?? "";
  return <OrgScope slug={slug}>{(org) => <Inner orgId={org.id} />}</OrgScope>;
}

function Inner({ orgId }: { orgId: string }) {
  const { client } = useSession();

  // Draft filter inputs vs the applied filters that actually drive fetches.
  const [draft, setDraft] = React.useState<AuditFilterFormValues>(EMPTY_AUDIT_FILTERS);
  const [applied, setApplied] = React.useState<AuditFilterFormValues>(EMPTY_AUDIT_FILTERS);

  const [log, setLog] = React.useState<AuditLogState>(EMPTY_AUDIT_LOG);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<{ code: string; message: string } | null>(null);
  const [exporting, setExporting] = React.useState(false);

  const setField = (key: keyof AuditFilterFormValues) => (value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));

  // Initial load + reload whenever the applied filters change.
  const loadFirstPage = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await wrap(() =>
      client.events.listAuditEntriesPage(orgId, buildAuditQuery(applied)),
    );
    if (res.ok) {
      setLog(appendAuditPage(EMPTY_AUDIT_LOG, res.data, /* reset */ true));
    } else {
      setError({ code: res.error.code, message: res.error.message });
      setLog(EMPTY_AUDIT_LOG);
    }
    setLoading(false);
  }, [client, orgId, applied]);

  React.useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  const loadMore = React.useCallback(async () => {
    if (log.cursor === null) return;
    setLoadingMore(true);
    const res = await wrap(() =>
      client.events.listAuditEntriesPage(orgId, buildAuditQuery(applied, log.cursor ?? undefined)),
    );
    if (res.ok) {
      setLog((prev) => appendAuditPage(prev, res.data));
    } else {
      setError({ code: res.error.code, message: res.error.message });
    }
    setLoadingMore(false);
  }, [client, orgId, applied, log.cursor]);

  // Export: walk every page of the filtered stream via the SDK NDJSON helper,
  // accumulate the lines, and trigger an in-browser download.
  const exportNdjson = React.useCallback(async () => {
    setExporting(true);
    setError(null);
    try {
      const lines: string[] = [];
      for await (const line of client.events.exportAuditEntriesNdjson(
        orgId,
        buildAuditQuery(applied),
      )) {
        lines.push(line);
      }
      const blob = new Blob(lines.length > 0 ? lines : [""], {
        type: "application/x-ndjson",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-${orgId}-${Date.now()}.ndjson`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError({
        code: "export_failed",
        message: e instanceof Error ? e.message : "export failed",
      });
    } finally {
      setExporting(false);
    }
  }, [client, orgId, applied]);

  const filtersActive = hasActiveAuditFilters(applied);

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Audit log</h1>
          <p className="text-sm text-muted-foreground">
            Immutable record of org-scoped events. Slice by actor, resource,
            action, or time range, and export the filtered stream as NDJSON.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void exportNdjson()}
          disabled={exporting || loading}
        >
          <Download className="mr-2 h-4 w-4" />
          {exporting ? "Exporting…" : "Export NDJSON"}
        </Button>
      </header>

      <Card>
        <CardContent className="pt-6">
          <form
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              setApplied(draft);
            }}
          >
            <FilterInput id="f-category" label="Category" placeholder="auth · membership · …" value={draft.category} onChange={setField("category")} />
            <FilterInput id="f-actor" label="Actor ID" placeholder="usr_… / svc_…" value={draft.actorId} onChange={setField("actorId")} />
            <FilterInput id="f-actor-type" label="Actor type" placeholder="user · service_principal · …" value={draft.actorType} onChange={setField("actorType")} />
            <FilterInput id="f-event-type" label="Event type" placeholder="member.role_changed" value={draft.eventType} onChange={setField("eventType")} />
            <FilterInput id="f-subject-kind" label="Subject kind" placeholder="project · member · …" value={draft.subjectKind} onChange={setField("subjectKind")} />
            <FilterInput id="f-subject-id" label="Subject ID" placeholder="prj_… / mem_…" value={draft.subjectId} onChange={setField("subjectId")} />
            <FilterInput id="f-from" label="From (ISO)" placeholder="2026-01-01T00:00:00.000Z" value={draft.from} onChange={setField("from")} />
            <FilterInput id="f-to" label="To (ISO)" placeholder="2026-12-31T23:59:59.999Z" value={draft.to} onChange={setField("to")} />
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
              <Button type="submit" variant="outline">
                Apply filters
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setDraft(EMPTY_AUDIT_FILTERS);
                  setApplied(EMPTY_AUDIT_FILTERS);
                }}
              >
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="pt-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">{error.code}</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      ) : log.entries.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No audit entries"
          description={
            filtersActive
              ? "No events match the current filters. Try widening or resetting them."
              : "Activity in this org will surface here as events are recorded."
          }
        />
      ) : (
        <div className="space-y-2">
          {log.entries.map((e) => (
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
                      {formatAuditActor(e)}
                    </span>
                  </div>
                  <div className="text-sm">{e.description}</div>
                  <div className="text-[11px] text-muted-foreground font-mono mt-1">
                    req {e.requestId} · subject {e.subject.kind}:{e.subject.id}
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {formatAuditTimestamp(e.occurredAt)}
                </div>
              </div>
            </Card>
          ))}

          {hasMoreAudit(log) ? (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadMore()}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading…" : "Load more"}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function FilterInput({
  id,
  label,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full"
      />
    </div>
  );
}
