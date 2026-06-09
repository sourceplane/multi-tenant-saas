"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { Loader2 } from "lucide-react";
import type { ListPaymentMethodsResponse, PublicPlan } from "@saas/contracts/billing";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { useToast } from "@/components/ui/toast";
import { useApiQuery, qk } from "@/lib/query";
import { wrap } from "@/lib/api";
import {
  formatPlanPrice,
  hasManageableSubscription,
  selectUpgradePlans,
  selectDowngradePlans,
  pollForPlanChange,
} from "./plan-actions";

const PORTAL_KEY = "__portal__";

/** How long to wait for the provider webhook to apply the plan after checkout. */
const POLL_ATTEMPTS = 20;
const POLL_INTERVAL_MS = 1500;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * "Manage plan" card (BP2 + embedded-checkout UX).
 *
 * Upgrades open Polar's checkout as an **in-app embedded overlay** (the buyer
 * never leaves the console). On success the plan is applied asynchronously by
 * the verified webhook, so we show a "Finalizing your upgrade…" state and poll
 * the billing summary until the new plan lands, then refresh the page's billing
 * queries. Existing subscribers' plan changes still hand off to the hosted
 * customer portal (the provider forbids a second checkout), which is a redirect.
 */
export function BillingActions({
  orgId,
  activePlanCode,
  providerManaged,
}: {
  orgId: string;
  activePlanCode: string | null;
  /**
   * Whether the active subscription is backed by a provider subscription we can
   * act on. A paid plan assigned administratively (no provider subscription)
   * can't be changed/canceled/charged here, so those actions are hidden.
   */
  providerManaged: boolean;
}) {
  const { client } = useSession();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { resolvedTheme } = useTheme();
  const plans = useApiQuery<{ plans: PublicPlan[] }>(["billing", "plans", orgId], () =>
    wrap(() => client.billing.listPlans(orgId)),
  );
  const [busy, setBusy] = React.useState<string | null>(null);
  const [finalizing, setFinalizing] = React.useState(false);
  const [statusMsg, setStatusMsg] = React.useState("Finalizing your upgrade…");
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  const [canceling, setCanceling] = React.useState(false);
  const [confirmChange, setConfirmChange] = React.useState<string | null>(null);

  const upgrades = selectUpgradePlans(plans.data?.plans ?? [], activePlanCode);
  const downgrades = selectDowngradePlans(plans.data?.plans ?? [], activePlanCode);
  const isPaid = hasManageableSubscription(activePlanCode);
  // Provider-backed self-serve actions need a provider subscription.
  const manageable = isPaid && providerManaged;
  // A paid plan with no provider subscription (e.g. assigned by an admin) — show
  // an explanation instead of actions that would fail at the provider.
  const unmanagedPaid = isPaid && !providerManaged;

  // Card on file — only relevant once there's a paid subscription.
  const pm = useApiQuery<ListPaymentMethodsResponse>(
    ["billing", "paymentMethods", orgId],
    () => wrap(() => client.billing.listPaymentMethods(orgId)),
    { enabled: manageable },
  );
  const card = pm.data?.paymentMethods?.[0] ?? null;

  const refreshBilling = React.useCallback(() => {
    void qc.invalidateQueries({ queryKey: qk.billingSummary(orgId) });
    void qc.invalidateQueries({ queryKey: qk.entitlements(orgId) });
    void qc.invalidateQueries({ queryKey: qk.invoices(orgId) });
    void qc.invalidateQueries({ queryKey: ["billing", "plans", orgId] });
  }, [qc, orgId]);

  // After the embedded checkout reports success, wait for the webhook to apply
  // the plan, then refresh the page so it reflects the new state.
  const onCheckoutSuccess = React.useCallback(async () => {
    setStatusMsg("Finalizing your upgrade…");
    setFinalizing(true);
    const result = await pollForPlanChange({
      fromPlanCode: activePlanCode,
      attempts: POLL_ATTEMPTS,
      intervalMs: POLL_INTERVAL_MS,
      sleep,
      fetchPlanCode: async () => {
        const r = await wrap(() => client.billing.getSummary(orgId));
        return r.ok ? (r.data.plan?.code ?? null) : activePlanCode;
      },
    });
    refreshBilling();
    setFinalizing(false);
    setBusy(null);
    if (result.changed) {
      toast({ kind: "success", title: "Upgrade complete", description: "Your new plan is active." });
    } else {
      toast({
        kind: "default",
        title: "Payment received",
        description: "We're finalizing your upgrade — it'll appear here shortly.",
      });
    }
  }, [activePlanCode, client, orgId, refreshBilling, toast]);

  // Hosted (non-embedded) fallback return: the provider redirects the buyer back
  // to this page with `?checkout=complete`. Mirror the embed's finalizing flow —
  // poll until the (first-purchase) plan goes paid, then refresh — and strip the
  // flag so a manual refresh doesn't re-trigger it.
  const handledReturn = React.useRef(false);
  React.useEffect(() => {
    if (handledReturn.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "complete") return;
    handledReturn.current = true;
    params.delete("checkout");
    const qs = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));

    const isPaid = (c: string | null) => c !== null && c !== "free";
    void (async () => {
      if (isPaid(activePlanCode)) {
        refreshBilling();
        toast({ kind: "success", title: "Upgrade complete", description: "Your new plan is active." });
        return;
      }
      setFinalizing(true);
      const res = await pollForPlanChange({
        fromPlanCode: "free", // checkout is always a first purchase (free → paid)
        attempts: POLL_ATTEMPTS,
        intervalMs: POLL_INTERVAL_MS,
        sleep,
        fetchPlanCode: async () => {
          const r = await wrap(() => client.billing.getSummary(orgId));
          return r.ok ? (r.data.plan?.code ?? null) : null;
        },
      });
      refreshBilling();
      setFinalizing(false);
      toast(
        res.changed
          ? { kind: "success", title: "Upgrade complete", description: "Your new plan is active." }
          : { kind: "default", title: "Payment received", description: "We're finalizing your upgrade — it'll appear here shortly." },
      );
    })();
  }, [activePlanCode, client, orgId, refreshBilling, toast]);

  const startCheckout = React.useCallback(
    async (planCode: string) => {
      setBusy(planCode);

      // Existing provider-managed subscriber → change the plan natively (no
      // hosted-portal redirect). The webhook re-materializes the new plan, so
      // poll until it lands, mirroring the upgrade-finalize flow.
      if (manageable) {
        const r = await wrap(() => client.billing.changePlan(orgId, { planCode }));
        if (!r.ok) {
          setBusy(null);
          toast({ kind: "error", title: "Could not change plan", description: r.error.message });
          return;
        }
        setStatusMsg("Updating your plan…");
        setFinalizing(true);
        const res = await pollForPlanChange({
          fromPlanCode: activePlanCode,
          attempts: POLL_ATTEMPTS,
          intervalMs: POLL_INTERVAL_MS,
          sleep,
          fetchPlanCode: async () => {
            const r2 = await wrap(() => client.billing.getSummary(orgId));
            return r2.ok ? (r2.data.plan?.code ?? null) : activePlanCode;
          },
        });
        refreshBilling();
        setFinalizing(false);
        setBusy(null);
        toast(
          res.changed
            ? { kind: "success", title: "Plan updated", description: "Your new plan is active." }
            : { kind: "default", title: "Change received", description: "Your plan update is being processed." },
        );
        return;
      }

      // First purchase → embedded checkout.
      const r = await wrap(() =>
        client.billing.createCheckout(orgId, {
          planCode,
          embedOrigin: window.location.origin,
          // Where the hosted (non-embedded) fallback returns the buyer: back to
          // this billing page, flagged so it shows the finalizing state on return.
          returnPath: `${window.location.pathname}?checkout=complete`,
        }),
      );
      if (!r.ok) {
        setBusy(null);
        toast({ kind: "error", title: "Could not start checkout", description: r.error.message });
        return;
      }

      // Safety net: if the server still routes to the hosted portal (e.g. our
      // billing state lagged), follow the redirect rather than failing.
      if (r.data.mode === "portal") {
        window.location.assign(r.data.checkoutUrl);
        return;
      }

      // Embed Polar's checkout in-app. Fall back to a full-page redirect if the
      // embed can't load (e.g. script/network failure).
      try {
        const { PolarEmbedCheckout } = await import("@polar-sh/checkout/embed");
        // Match the console's theme so the overlay doesn't clash with the app.
        const theme = resolvedTheme === "light" ? "light" : "dark";
        const checkout = await PolarEmbedCheckout.create(r.data.checkoutUrl, { theme });
        checkout.addEventListener("success", () => {
          checkout.close();
          void onCheckoutSuccess();
        });
        checkout.addEventListener("close", () => {
          setBusy((b) => (b === planCode ? null : b));
        });
      } catch {
        window.location.assign(r.data.checkoutUrl);
      }
    },
    [manageable, activePlanCode, client, orgId, toast, onCheckoutSuccess, resolvedTheme, refreshBilling],
  );

  // Updating the card is the one PCI-gated action that must stay on the hosted
  // portal (card details never touch our servers) — a brief deep-link out.
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

  // Native cancellation — no hosted-portal redirect. The provider schedules the
  // cancel; the verified webhook applies the downgrade, so we poll until the plan
  // changes (mirrors the upgrade-finalize flow).
  const doCancel = React.useCallback(async () => {
    setCanceling(true);
    const r = await wrap(() => client.billing.cancelSubscription(orgId));
    if (!r.ok) {
      setCanceling(false);
      setConfirmCancel(false);
      toast({ kind: "error", title: "Could not cancel", description: r.error.message });
      return;
    }
    setConfirmCancel(false);
    setStatusMsg("Updating your plan…");
    setFinalizing(true);
    const res = await pollForPlanChange({
      fromPlanCode: activePlanCode,
      attempts: POLL_ATTEMPTS,
      intervalMs: POLL_INTERVAL_MS,
      sleep,
      fetchPlanCode: async () => {
        const r2 = await wrap(() => client.billing.getSummary(orgId));
        return r2.ok ? (r2.data.plan?.code ?? null) : activePlanCode;
      },
    });
    refreshBilling();
    setFinalizing(false);
    setCanceling(false);
    toast(
      res.changed
        ? { kind: "success", title: "Subscription canceled", description: "You've moved to the Free plan." }
        : { kind: "default", title: "Cancellation received", description: "Your plan change is being processed." },
    );
  }, [activePlanCode, client, orgId, refreshBilling, toast]);

  // Nothing to offer (e.g. free with no upgrade and nothing to manage).
  if (upgrades.length === 0 && downgrades.length === 0 && !isPaid) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Manage plan</CardTitle>
        <CardDescription>
          Upgrade, downgrade, or manage your subscription and payment method.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {finalizing ? (
          <div
            role="status"
            className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            {statusMsg}
          </div>
        ) : null}
        {unmanagedPaid ? (
          <p className="text-sm text-muted-foreground">
            This plan was assigned by an administrator and isn’t managed through self-serve billing.
            Contact support to change or cancel it.
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          {!unmanagedPaid &&
            upgrades.map((p) => (
              <Button
                key={p.code}
                loading={busy === p.code}
                disabled={busy !== null || finalizing || canceling}
                onClick={() => void startCheckout(p.code)}
              >
                Upgrade to {p.name} · {formatPlanPrice(p)}
              </Button>
            ))}
          {manageable &&
            downgrades.map((p) =>
            confirmChange === p.code ? (
              <span key={p.code} className="flex items-center gap-2 text-sm text-muted-foreground">
                Switch to {p.name} ({formatPlanPrice(p)})?
                <Button
                  variant="outline"
                  loading={busy === p.code}
                  disabled={finalizing || canceling}
                  onClick={() => {
                    setConfirmChange(null);
                    void startCheckout(p.code);
                  }}
                >
                  Confirm
                </Button>
                <Button variant="ghost" disabled={busy !== null} onClick={() => setConfirmChange(null)}>
                  Keep current
                </Button>
              </span>
            ) : (
              <Button
                key={p.code}
                variant="outline"
                disabled={busy !== null || finalizing || canceling || confirmChange !== null}
                onClick={() => setConfirmChange(p.code)}
              >
                Downgrade to {p.name} · {formatPlanPrice(p)}
              </Button>
            ),
          )}
          {manageable ? (
            <span className="flex items-center gap-2">
              {card ? (
                <span className="text-sm text-muted-foreground">
                  {capitalize(card.brand)} •••• {card.last4}
                  <span className="text-muted-foreground/70">
                    {" "}· exp {String(card.expMonth).padStart(2, "0")}/{String(card.expYear).slice(-2)}
                  </span>
                </span>
              ) : null}
              <Button
                variant="outline"
                loading={busy === PORTAL_KEY}
                disabled={busy !== null || finalizing || canceling}
                onClick={() => void openPortal()}
              >
                {card ? "Update payment method" : "Add payment method"}
              </Button>
            </span>
          ) : null}
          {manageable && !confirmCancel ? (
            <Button
              variant="ghost"
              disabled={busy !== null || finalizing || canceling}
              onClick={() => setConfirmCancel(true)}
            >
              Cancel plan
            </Button>
          ) : null}
          {manageable && confirmCancel ? (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              Cancel your plan and move to Free?
              <Button variant="destructive" loading={canceling} disabled={finalizing} onClick={() => void doCancel()}>
                Yes, cancel
              </Button>
              <Button variant="ghost" disabled={canceling} onClick={() => setConfirmCancel(false)}>
                Keep plan
              </Button>
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
