import { CheckCircle2, XCircle, Clock, GitBranch, Play } from "lucide-react";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { useState } from "react";

const runs = [
  {
    id: "run_abc123",
    planId: "plan_xyz789",
    commit: "abc1234",
    branch: "main",
    pr: "#184",
    repository: "platform-repo",
    environment: "production",
    components: ["api-edge-worker", "auth-worker"],
    jobs: 5,
    status: "success",
    duration: "3m 45s",
    triggeredBy: "alice@acme.com",
    timestamp: "12m ago",
    checksum: "sha256:a1b2c3...",
  },
  {
    id: "run_def456",
    planId: "plan_uvw456",
    commit: "def5678",
    branch: "main",
    pr: "#184",
    repository: "platform-repo",
    environment: "staging",
    components: ["api-edge-worker", "auth-worker", "web-console"],
    jobs: 7,
    status: "success",
    duration: "4m 12s",
    triggeredBy: "alice@acme.com",
    timestamp: "2h ago",
    checksum: "sha256:d4e5f6...",
  },
  {
    id: "run_ghi789",
    planId: "plan_rst123",
    commit: "ghi9012",
    branch: "feature/new-feature",
    pr: "#185",
    repository: "billing-repo",
    environment: "dev",
    components: ["billing-worker"],
    jobs: 2,
    status: "failed",
    duration: "1m 23s",
    triggeredBy: "bob@acme.com",
    timestamp: "3h ago",
    checksum: "sha256:g7h8i9...",
  },
  {
    id: "run_jkl012",
    planId: "plan_opq789",
    commit: "jkl3456",
    branch: "main",
    pr: null,
    repository: "commerce-repo",
    environment: "production",
    components: ["checkout-chart"],
    jobs: 3,
    status: "running",
    duration: "1m 45s",
    triggeredBy: "charlie@acme.com",
    timestamp: "5m ago",
    checksum: "sha256:j1k2l3...",
  },
];

const statusConfig = {
  success: { label: "Success", color: "text-green-500", bg: "bg-green-500/10", icon: CheckCircle2 },
  failed: { label: "Failed", color: "text-red-500", bg: "bg-red-500/10", icon: XCircle },
  running: { label: "Running", color: "text-blue-500", bg: "bg-blue-500/10", icon: Clock },
};

export function RunsPage() {
  const [search, setSearch] = useState("");

  const filteredRuns = runs.filter(r =>
    r.id.toLowerCase().includes(search.toLowerCase()) ||
    r.repository.toLowerCase().includes(search.toLowerCase()) ||
    r.branch.toLowerCase().includes(search.toLowerCase()) ||
    r.components.some(c => c.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1>Pipeline Runs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track all Orun plan executions and CI pipelines
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Runs (24h)</p>
          <p className="text-2xl font-semibold mt-1">47</p>
          <p className="text-xs text-green-600 mt-2">+12 from yesterday</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Success Rate</p>
          <p className="text-2xl font-semibold mt-1">94.2%</p>
          <p className="text-xs text-green-600 mt-2">+2.1% from last week</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Avg Duration</p>
          <p className="text-2xl font-semibold mt-1">3m 12s</p>
          <p className="text-xs text-red-600 mt-2">+18s from last week</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Active Now</p>
          <p className="text-2xl font-semibold mt-1">2</p>
          <p className="text-xs text-muted-foreground mt-2">Currently running</p>
        </Card>
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Search by run ID, repository, branch, or component..."
          className="flex-1 max-w-md"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filteredRuns.map((run) => {
          const statusInfo = statusConfig[run.status as keyof typeof statusConfig];
          const StatusIcon = statusInfo.icon;

          return (
            <Card key={run.id} className="p-5 hover:bg-accent/50 transition-colors cursor-pointer">
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded ${statusInfo.bg} flex-shrink-0`}>
                  <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-mono text-sm font-medium">{run.id}</span>
                    <Badge variant="outline" className="text-xs font-mono">{run.planId}</Badge>
                    <Badge variant="outline" className="text-xs">{run.environment}</Badge>
                    {run.pr && <Badge variant="outline" className="text-xs">{run.pr}</Badge>}
                    <span className={`text-sm ${statusInfo.color}`}>{statusInfo.label}</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      <span className="font-mono">{run.repository}</span>
                      <span>/</span>
                      <span>{run.branch}</span>
                    </div>
                    <span>•</span>
                    <span className="font-mono">{run.commit}</span>
                    <span>•</span>
                    <span>{run.jobs} jobs</span>
                    <span>•</span>
                    <span>{run.duration}</span>
                    <span>•</span>
                    <span>{run.timestamp}</span>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">Components:</span>
                    {run.components.slice(0, 3).map(comp => (
                      <Badge key={comp} variant="secondary" className="text-xs font-mono">
                        {comp}
                      </Badge>
                    ))}
                    {run.components.length > 3 && (
                      <span className="text-xs text-muted-foreground">+{run.components.length - 3} more</span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mt-2">
                    Triggered by {run.triggeredBy}
                  </p>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <button className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent">
                    View Plan
                  </button>
                  <button className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent">
                    Logs
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
