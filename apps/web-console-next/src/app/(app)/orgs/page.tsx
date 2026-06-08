"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ZodForm } from "@/components/ui/zod-form";
import { PreconditionInsight } from "@/components/precondition/insight";
import { pickAccountBillingOrg } from "@/components/billing/account-org";
import { useSession } from "@/lib/session";
import { readLastOrgSlug, clearLastOrgSlug } from "@/lib/last-org";
import { useApiQuery, qk, usePrefetch } from "@/lib/query";
import { useToast } from "@/components/ui/toast";
import { wrap, type ApiErrorBody } from "@/lib/api";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(64),
  slug: z
    .string()
    .regex(/^[a-z0-9-]*$/, "Lowercase letters, digits, hyphens")
    .max(48)
    .optional(),
});

export default function OrgsPage() {
  const { client } = useSession();
  const { toast } = useToast();
  const prefetch = usePrefetch();
  const orgs = useApiQuery(qk.orgs(), () =>
    wrap(async () => (await client.organizations.list()).organizations),
  );
  const [open, setOpen] = React.useState(false);
  const [precondition, setPrecondition] = React.useState<ApiErrorBody | null>(null);

  // Multi-org is gated on the account's billing parent (its earliest-created
  // org — same choice the membership-worker MO2 gate makes). The paywall's
  // "Upgrade plan" CTA starts a Business checkout for that org.
  const billingParent = React.useMemo(
    () => pickAccountBillingOrg(orgs.data ?? []),
    [orgs.data],
  );
  const onUpgrade = React.useCallback(async () => {
    if (!billingParent) return;
    const r = await wrap(() => client.billing.createCheckout(billingParent.id, { planCode: "business" }));
    if (!r.ok) {
      toast({ kind: "error", title: "Could not start checkout", description: r.error.message });
      return;
    }
    window.location.assign(r.data.checkoutUrl);
  }, [billingParent, client, toast]);

  // The org list is authoritative: if the remembered org isn't in it anymore,
  // forget it so the default landing doesn't point at an inaccessible org.
  React.useEffect(() => {
    const last = readLastOrgSlug();
    if (orgs.data && last && !orgs.data.some((o) => o.slug === last)) {
      clearLastOrgSlug();
    }
  }, [orgs.data]);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Organizations</h1>
          <p className="text-sm text-muted-foreground">
            Tenant root. Pick an org or create a new one.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1.5" />
              New organization
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create organization</DialogTitle>
              <DialogDescription>
                An organization is your tenant — it owns projects, members, and billing.
              </DialogDescription>
            </DialogHeader>
            <ZodForm
              schema={schema}
              defaultValues={{ name: "", slug: "" }}
              fields={[
                { name: "name", label: "Name", placeholder: "Acme Inc." },
                {
                  name: "slug",
                  label: "Slug",
                  placeholder: "acme",
                  hint: "Auto-filled from the name; edit to override.",
                },
              ]}
              deriveSlug={{ from: "name", to: "slug" }}
              submitLabel="Create"
              cancel={{ label: "Cancel", onClick: () => setOpen(false) }}
              onSubmit={async (v) => {
                const payload: { name: string; slug?: string } = { name: v.name };
                if (v.slug) payload.slug = v.slug;
                const r = await wrap(async () =>
                  (await client.organizations.create(payload)).organization,
                );
                if (!r.ok) {
                  if (r.error.code === "precondition_failed") {
                    setPrecondition(r.error);
                  } else {
                    toast({ kind: "error", title: "Create failed", description: r.error.message });
                  }
                  return;
                }
                toast({ kind: "success", title: "Organization created" });
                setOpen(false);
                orgs.reload();
              }}
            />
          </DialogContent>
        </Dialog>
      </header>

      {precondition && (
        <PreconditionInsight
          error={precondition}
          resource="organization"
          onUpgrade={() => void onUpgrade()}
          onDismiss={() => setPrecondition(null)}
        />
      )}

      {orgs.loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-3 w-44" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : orgs.error ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Failed to load organizations</CardTitle>
            <CardDescription>{orgs.error.message}</CardDescription>
          </CardHeader>
        </Card>
      ) : !orgs.data || orgs.data.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No organizations yet"
          description="Create your first organization to start provisioning projects and environments."
          primaryAction={{ label: "New organization", onClick: () => setOpen(true) }}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orgs.data.map((o) => (
            <Link
              key={o.id}
              href={`/orgs/${o.slug}/projects`}
              className="group"
              onMouseEnter={() =>
                prefetch(qk.projects(o.id), () =>
                  wrap(async () => (await client.projects.list(o.id)).projects),
                )
              }
            >
              <Card className="h-full transition-shadow group-hover:shadow-md group-hover:border-primary/40">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-md bg-gradient-to-br from-primary/40 to-primary/10 grid place-items-center text-sm font-semibold">
                      {o.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{o.name}</CardTitle>
                      <CardDescription className="text-xs">{o.slug}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    Created {new Date(o.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
