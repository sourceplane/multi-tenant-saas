import { GitBranch, CheckCircle2, Clock, Package, AlertCircle } from "lucide-react";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

const repositories = [
  {
    id: "repo_001",
    name: "sourceplane/platform-repo",
    provider: "github",
    providerId: "123456",
    defaultBranch: "main",
    components: 12,
    lastSync: "5m ago",
    lastCommit: "abc1234",
    lastCommitMsg: "Update API edge worker routing",
    syncStatus: "success",
    linkedAt: "2024-01-15",
  },
  {
    id: "repo_002",
    name: "sourceplane/billing-repo",
    provider: "github",
    providerId: "234567",
    defaultBranch: "main",
    components: 5,
    lastSync: "15m ago",
    lastCommit: "def5678",
    lastCommitMsg: "Add payment webhook handlers",
    syncStatus: "success",
    linkedAt: "2024-02-01",
  },
  {
    id: "repo_003",
    name: "sourceplane/commerce-repo",
    provider: "github",
    providerId: "345678",
    defaultBranch: "main",
    components: 8,
    lastSync: "1h ago",
    lastCommit: "ghi9012",
    lastCommitMsg: "Refactor checkout flow",
    syncStatus: "failed",
    linkedAt: "2024-01-20",
  },
];

const syncConfig = {
  success: { label: "Synced", color: "text-green-500", icon: CheckCircle2 },
  failed: { label: "Sync Failed", color: "text-red-500", icon: AlertCircle },
  pending: { label: "Syncing", color: "text-blue-500", icon: Clock },
};

export function RepositoriesPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1>Repositories</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Linked Git repositories and catalog sync status
          </p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity">
          Link New Repository
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Repositories</p>
          <p className="text-2xl font-semibold mt-1">{repositories.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Components</p>
          <p className="text-2xl font-semibold mt-1">
            {repositories.reduce((sum, r) => sum + r.components, 0)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Sync Health</p>
          <p className="text-2xl font-semibold mt-1 text-green-500">
            {Math.round((repositories.filter(r => r.syncStatus === "success").length / repositories.length) * 100)}%
          </p>
        </Card>
      </div>

      <div className="space-y-4">
        {repositories.map((repo) => {
          const syncInfo = syncConfig[repo.syncStatus as keyof typeof syncConfig];
          const SyncIcon = syncInfo.icon;

          return (
            <Card key={repo.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-muted rounded">
                    <GitBranch className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-mono">{repo.name}</h3>
                      <Badge variant="outline" className="text-xs">{repo.provider}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {repo.components} components • Default branch: <span className="font-mono">{repo.defaultBranch}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <SyncIcon className={`w-4 h-4 ${syncInfo.color}`} />
                  <span className={`text-sm ${syncInfo.color}`}>{syncInfo.label}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Last Sync</p>
                  <p className="text-sm mt-1">{repo.lastSync}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Latest Commit</p>
                  <p className="text-sm font-mono mt-1">{repo.lastCommit}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Linked Since</p>
                  <p className="text-sm mt-1">{repo.linkedAt}</p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-muted/30 rounded">
                <p className="text-sm">
                  <span className="text-muted-foreground">Latest commit:</span> {repo.lastCommitMsg}
                </p>
              </div>

              <div className="flex gap-2 mt-4">
                <button className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  View Components
                </button>
                <button className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent">
                  Trigger Sync
                </button>
                <button className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent">
                  Configure
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-6 bg-muted/30">
        <h3 className="mb-3">How Catalog Sync Works</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground">1.</span>
            <p>GitHub Actions workflow runs <code className="px-1.5 py-0.5 bg-background rounded text-xs font-mono">orun plan</code> on every push</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground">2.</span>
            <p>Plan engine discovers components, dependencies, and changes</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground">3.</span>
            <p><code className="px-1.5 py-0.5 bg-background rounded text-xs font-mono">orun catalog export</code> generates component state snapshots</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground">4.</span>
            <p><code className="px-1.5 py-0.5 bg-background rounded text-xs font-mono">orun cloud sync</code> uploads signed envelope via GitHub OIDC</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground">5.</span>
            <p>Orun Cloud indexes data and updates catalog in real-time</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
