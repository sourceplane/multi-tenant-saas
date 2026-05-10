import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Users, Key, Building2, Webhook } from "lucide-react";

const members = [
  { name: "Alice Johnson", email: "alice@acme.com", role: "Owner", status: "active" },
  { name: "Bob Smith", email: "bob@acme.com", role: "Admin", status: "active" },
  { name: "Charlie Davis", email: "charlie@acme.com", role: "Developer", status: "active" },
];

const apiKeys = [
  { name: "CI/CD Pipeline Key", key: "orun_prod_••••••••••••3a2f", created: "2024-01-15", lastUsed: "5 minutes ago", scopes: ["catalog:write", "plans:read"] },
  { name: "Monitoring Integration", key: "orun_mon_••••••••••••8b1c", created: "2024-02-20", lastUsed: "2 hours ago", scopes: ["catalog:read"] },
];

const webhooks = [
  { url: "https://hooks.slack.com/services/...", events: ["component.deployed", "plan.failed"], status: "active" },
  { url: "https://api.datadog.com/webhook/...", events: ["component.changed", "run.completed"], status: "active" },
];

export function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1>Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your tenant configuration and access</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">
            <Building2 className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="w-4 h-4 mr-2" />
            Members
          </TabsTrigger>
          <TabsTrigger value="api-keys">
            <Key className="w-4 h-4 mr-2" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            <Webhook className="w-4 h-4 mr-2" />
            Webhooks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-4">Tenant Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2">Tenant Name</label>
                <Input defaultValue="Acme Corp" />
              </div>
              <div>
                <label className="block text-sm mb-2">Tenant ID</label>
                <Input defaultValue="org_2kj3h4k2j3h4" disabled className="font-mono text-sm" />
              </div>
              <div>
                <label className="block text-sm mb-2">Plan</label>
                <div className="flex items-center gap-2">
                  <Input defaultValue="Pro" disabled />
                  <button className="px-4 py-2 border border-border rounded-md hover:bg-accent whitespace-nowrap">
                    Upgrade
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity">
                  Save Changes
                </button>
                <button className="px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4">GitHub Integration</h3>
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded border border-border">
              <div>
                <p className="font-medium">GitHub App Installed</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Connected to sourceplane organization
                </p>
              </div>
              <Badge>Active</Badge>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">OIDC Audience:</span>
                <code className="px-2 py-1 bg-muted rounded text-xs font-mono">orun-cloud</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Sync Endpoint:</span>
                <code className="px-2 py-1 bg-muted rounded text-xs font-mono">https://api.orun.dev/v1/catalog/sync</code>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-destructive">
            <h3 className="mb-2">Danger Zone</h3>
            <p className="text-sm text-muted-foreground mb-4">Irreversible actions that affect your tenant</p>
            <button className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:opacity-90 transition-opacity">
              Delete Tenant
            </button>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3>Team Members</h3>
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity">
                Invite Member
              </button>
            </div>
            <div className="space-y-3">
              {members.map((member, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{member.role}</Badge>
                    <button className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent">
                      Manage
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 bg-muted/30">
            <h4 className="mb-2">Role Permissions</h4>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Owner:</span> Full access including billing and deletion</div>
              <div><span className="font-medium">Admin:</span> Manage repositories, components, and members</div>
              <div><span className="font-medium">Developer:</span> View catalog, trigger deploys, view runs</div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="api-keys" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3>API Keys</h3>
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity">
                Create API Key
              </button>
            </div>
            <div className="space-y-3">
              {apiKeys.map((key, i) => (
                <div key={i} className="p-4 rounded-lg border border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{key.name}</p>
                        <Badge variant="outline" className="text-xs font-mono">{key.key}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Created {key.created} • Last used {key.lastUsed}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent">
                        Rotate
                      </button>
                      <button className="px-3 py-1.5 text-sm border border-destructive text-destructive rounded-md hover:bg-destructive/10">
                        Revoke
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {key.scopes.map((scope, j) => (
                      <Badge key={j} variant="secondary" className="text-xs font-mono">
                        {scope}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 bg-muted/30">
            <h4 className="mb-3">Using API Keys in CI/CD</h4>
            <pre className="p-4 bg-background rounded-lg font-mono text-xs overflow-x-auto border border-border">
{`# GitHub Actions example
- name: Upload to Orun Cloud
  run: |
    orun cloud sync \\
      --endpoint https://api.orun.dev \\
      --file catalog-sync.json \\
      --oidc-audience orun-cloud

# Or with API key (not recommended)
export ORUN_API_KEY=\${{ secrets.ORUN_API_KEY }}`}
            </pre>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3>Webhooks</h3>
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity">
                Add Webhook
              </button>
            </div>
            <div className="space-y-3">
              {webhooks.map((webhook, i) => (
                <div key={i} className="p-4 rounded-lg border border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm truncate">{webhook.url}</p>
                        <Badge variant={webhook.status === "active" ? "default" : "outline"} className="text-xs">
                          {webhook.status}
                        </Badge>
                      </div>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {webhook.events.map((event, j) => (
                          <Badge key={j} variant="secondary" className="text-xs font-mono">
                            {event}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent">
                        Test
                      </button>
                      <button className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent">
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 bg-muted/30">
            <h4 className="mb-2">Available Events</h4>
            <div className="grid grid-cols-2 gap-2 text-sm font-mono">
              <div>component.created</div>
              <div>component.changed</div>
              <div>component.deployed</div>
              <div>plan.generated</div>
              <div>plan.failed</div>
              <div>run.started</div>
              <div>run.completed</div>
              <div>run.failed</div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
