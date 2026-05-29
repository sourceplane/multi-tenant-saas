"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Receipt } from "lucide-react";
import { OrgScope } from "@/components/shell/org-scope";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { PreconditionInsight } from "@/components/precondition/insight";
import { useSession } from "@/lib/session";
import { useAsync } from "@/lib/use-async";

export default function BillingPage() {
  const params = useParams<{ orgSlug: string }>();
  const slug = params?.orgSlug ?? "";
  return <OrgScope slug={slug}>{(org) => <Inner orgId={org.id} />}</OrgScope>;
}

function Inner({ orgId }: { orgId: string }) {
  const { client } = useSession();
  const summary = useAsync(() => client.getBillingSummary(orgId), [client, orgId]);
  const ents = useAsync(() => client.getEntitlements(orgId), [client, orgId]);
  const inv = useAsync(() => client.listInvoices(orgId), [client, orgId]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">Plan, entitlements, and invoices for this organization.</p>
      </header>

      {/* Plan / customer */}
      {summary.loading ? (
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      ) : summary.error ? (
        summary.error.code === "precondition_failed" ? (
          <PreconditionInsight
            error={{ code: summary.error.code, message: summary.error.message }}
            resource="billing"
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">{summary.error.code}</CardTitle>
              <CardDescription>{summary.error.message}</CardDescription>
            </CardHeader>
          </Card>
        )
      ) : summary.data ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {summary.data.plan ? summary.data.plan.name : "No active plan"}
            </CardTitle>
            <CardDescription>
              {summary.data.activeSubscription
                ? `Subscription · ${summary.data.activeSubscription.status}`
                : "No active subscription"}
              {summary.data.customer?.provider ? ` · ${summary.data.customer.provider}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <Stat
                label="Plan code"
                value={summary.data.plan?.code ?? "—"}
              />
              <Stat
                label="Interval"
                value={summary.data.plan?.billingInterval ?? "—"}
              />
              <Stat
                label="Customer"
                value={summary.data.customer?.displayName ?? summary.data.customer?.email ?? "—"}
              />
              <Stat
                label="Status"
                value={summary.data.activeSubscription?.status ?? "—"}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Entitlements */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Entitlements
        </h2>
        {ents.loading ? (
          <Skeleton className="h-32 w-full" />
        ) : ents.error ? (
          ents.error.code === "precondition_failed" ? (
            <PreconditionInsight
              error={{ code: ents.error.code, message: ents.error.message }}
              resource="entitlement"
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-destructive text-sm">{ents.error.code}</CardTitle>
                <CardDescription>{ents.error.message}</CardDescription>
              </CardHeader>
            </Card>
          )
        ) : !ents.data || ents.data.entitlements.length === 0 ? (
          <EmptyState icon={Receipt} title="No entitlements" description="No entitlement records configured." />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Limit</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ents.data.entitlements.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.entitlementKey}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{e.valueType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={e.enabled ? "success" : "destructive"}>
                        {e.enabled ? "yes" : "no"}
                      </Badge>
                    </TableCell>
                    <TableCell>{e.limitValue === null ? "unlimited" : e.limitValue}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{e.source}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </section>

      {/* Invoices */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Invoices</h2>
        {inv.loading ? (
          <Skeleton className="h-24 w-full" />
        ) : inv.error ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive text-sm">{inv.error.code}</CardTitle>
              <CardDescription>{inv.error.message}</CardDescription>
            </CardHeader>
          </Card>
        ) : !inv.data || inv.data.invoices.length === 0 ? (
          <EmptyState icon={Receipt} title="No invoices" description="Invoices will appear here after first billing cycle." />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Issued</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inv.data.invoices.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono text-xs">{i.number ?? i.id.slice(0, 12)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          i.status === "paid" ? "success" : i.status === "void" ? "secondary" : "warning"
                        }
                      >
                        {i.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(i.amountDueCents / 100).toFixed(2)} {i.currency.toUpperCase()}
                    </TableCell>
                    <TableCell>
                      {(i.amountPaidCents / 100).toFixed(2)} {i.currency.toUpperCase()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {i.issuedAt ? new Date(i.issuedAt).toLocaleDateString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium truncate">{value}</div>
    </div>
  );
}
