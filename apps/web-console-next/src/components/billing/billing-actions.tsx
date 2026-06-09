"use client";

import * as React from "react";
import type { PublicPlan } from "@saas/contracts/billing";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { useToast } from "@/components/ui/toast";
import { useApiQuery } from "@/lib/query";
import { wrap } from "@/lib/api";
import { formatPlanPrice, hasManageableSubscription, selectUpgradePlans } from "./plan-actions";

const PORTAL_KEY = "__portal__";

/**
 * "Manage plan" card (BP2): self-serve upgrade checkout + customer portal.
 *
 * Upgrade buttons are derived from the catalog (purchasable plans above/aside
 * the current one); "Manage billing" appears once the org has a paid plan.
 * Both POST to the billing endpoints and redirect the browser to the hosted
 * provider URL. The plan change itself is applied by the verified webhook, not
 * here — so on return the summary reflects the new plan after the webhook lands.
 */
export function BillingActions({
  orgId,
  activePlanCode,
}: {
  orgId: string;
  activePlanCode: string | null;
}) {
  const { client } = useSession();
  const { toast } = useToast();
  const plans = useApiQuery<{ plans: PublicPlan[] }>(["billing", "plans", orgId], () =>
    wrap(() => client.billing.listPlans(orgId)),
  );
  const [busy, setBusy] = React.useState<string | null>(null);

  const upgrades = selectUpgradePlans(plans.data?.plans ?? [], activePlanCode);
  const canManage = hasManageableSubscription(activePlanCode);

  const startCheckout = React.useCallback(
    async (planCode: string) => {
      setBusy(planCode);
      const r = await wrap(() => client.billing.createCheckout(orgId, { planCode }));
      setBusy(null);
      if (!r.ok) {
        toast({ kind: "error", title: "Could not start checkout", description: r.error.message });
        return;
      }
      // Existing subscribers change plans in the customer portal (the provider
      // forbids a second checkout) — let them know before the redirect.
      if (r.data.mode === "portal") {
        toast({ kind: "default", title: "Manage your plan", description: "Opening your billing portal to change your plan." });
      }
      window.location.assign(r.data.checkoutUrl);
    },
    [client, orgId, toast],
  );

  const openPortal = React.useCallback(async () => {
    setBusy(PORTAL_KEY);
    const r = await wrap(() => client.billing.createPortalSession(orgId));
    setBusy(null);
    if (!r.ok) {
      toast({ kind: "error", title: "Could not open billing portal", description: r.error.message });
      return;
    }
    window.location.assign(r.data.portalUrl);
  }, [client, orgId, toast]);

  // Nothing to offer (e.g. already on the top tier with no portal yet).
  if (upgrades.length === 0 && !canManage) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Manage plan</CardTitle>
        <CardDescription>
          Upgrade your plan or manage your subscription and payment method.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        {upgrades.map((p) => (
          <Button
            key={p.code}
            loading={busy === p.code}
            disabled={busy !== null}
            onClick={() => void startCheckout(p.code)}
          >
            Upgrade to {p.name} · {formatPlanPrice(p)}
          </Button>
        ))}
        {canManage ? (
          <Button
            variant="outline"
            loading={busy === PORTAL_KEY}
            disabled={busy !== null}
            onClick={() => void openPortal()}
          >
            Manage billing
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
