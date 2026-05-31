"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/session";
import { wrap } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { ZodForm } from "@/components/ui/zod-form";

const emailSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

export default function LoginPage() {
  const router = useRouter();
  const { client, target, availableTargets, setTarget, setToken, isLocked } = useSession();
  const { toast } = useToast();
  const [stage, setStage] = React.useState<"email" | "code">("email");
  const [challengeId, setChallengeId] = React.useState<string | null>(null);
  const [emailHint, setEmailHint] = React.useState<string>("");
  const [debugCode, setDebugCode] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [tokenInput, setTokenInput] = React.useState("");

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-background via-background to-primary/5 px-4">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary/40 grid place-items-center text-primary-foreground font-bold">
            S
          </div>
          <div>
            <div className="text-base font-semibold tracking-tight">Sourceplane Console</div>
            <div className="text-xs text-muted-foreground">
              {isLocked ? `locked to ${target.name}` : `target: ${target.name}`}
            </div>
          </div>
        </div>

        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Use email code or paste a bearer token for prod testing.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email">Email code</TabsTrigger>
                <TabsTrigger value="token">Bearer token</TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="space-y-3 pt-2">
                {stage === "email" && (
                  <ZodForm
                    schema={emailSchema}
                    defaultValues={{ email: "" }}
                    fields={[
                      {
                        name: "email",
                        label: "Email",
                        type: "email",
                        autoComplete: "email",
                        placeholder: "you@company.com",
                      },
                    ]}
                    submitLabel="Send code"
                    onSubmit={async ({ email }) => {
                      const r = await wrap(() => client.auth.loginStart({ email }));
                      if (!r.ok) {
                        toast({ kind: "error", title: "Login failed", description: r.error.message });
                        return;
                      }
                      setChallengeId(r.data.challengeId);
                      setEmailHint(r.data.delivery.emailHint);
                      setDebugCode(r.data.delivery.code ?? null);
                      setStage("code");
                    }}
                  />
                )}
                {stage === "code" && (
                  <div className="space-y-3">
                    <div className="rounded-md border bg-muted/30 p-3 text-xs">
                      Code sent to <strong>{emailHint}</strong>.
                      {debugCode && (
                        <>
                          {" "}
                          <span className="text-muted-foreground">debug code:</span>{" "}
                          <code className="font-mono">{debugCode}</code>
                        </>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="code">Verification code</Label>
                      <Input
                        id="code"
                        autoComplete="one-time-code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="123456"
                      />
                    </div>
                    <div className="flex justify-between">
                      <Button variant="ghost" onClick={() => setStage("email")}>
                        Back
                      </Button>
                      <Button
                        disabled={busy || code.length < 4}
                        onClick={async () => {
                          if (!challengeId) return;
                          setBusy(true);
                          const r = await wrap(() =>
                            client.auth.loginComplete({ challengeId, code }),
                          );
                          setBusy(false);
                          if (!r.ok) {
                            toast({ kind: "error", title: "Code rejected", description: r.error.message });
                            return;
                          }
                          setToken(r.data.token);
                          toast({ kind: "success", title: "Signed in" });
                          router.push("/orgs");
                        }}
                      >
                        Sign in
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="token" className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="bearer">Bearer token</Label>
                  <Input
                    id="bearer"
                    type="password"
                    placeholder="paste prod token…"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Stored locally only. Use this path for prod parity testing.
                  </p>
                </div>
                <Button
                  className="w-full"
                  disabled={!tokenInput}
                  onClick={() => {
                    setToken(tokenInput);
                    toast({ kind: "success", title: "Token set" });
                    router.push("/orgs");
                  }}
                >
                  Continue
                </Button>
              </TabsContent>
            </Tabs>

            {!isLocked && availableTargets.length > 1 && (
              <div className="mt-4 border-t pt-3 space-y-1.5">
                <Label className="text-xs">API target</Label>
                <div className="flex flex-wrap gap-2">
                  {availableTargets.map((t) => (
                    <Button
                      key={t.name}
                      size="sm"
                      variant={t.name === target.name ? "default" : "outline"}
                      onClick={() => setTarget(t)}
                    >
                      {t.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground">
          By signing in you agree to the Acceptable Use Policy.
        </p>
      </div>
    </div>
  );
}
