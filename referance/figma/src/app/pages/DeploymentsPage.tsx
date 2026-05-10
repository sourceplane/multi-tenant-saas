import { CheckCircle2, XCircle, Clock, GitBranch, Rocket } from "lucide-react";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

const deployments = [
  {
    id: "deploy_001",
    component: "api-edge-worker",
    version: "v2.3.1",
    environment: "production",
    status: "success",
    triggeredBy: "alice@acme.com",
    startedAt: "12m ago",
    duration: "2m 34s",
    pr: "#184",
    commit: "abc1234",
    jobsExecuted: 3,
  },
  {
    id: "deploy_002",
    component: "web-console",
    version: "v3.2.0",
    environment: "staging",
    status: "success",
    triggeredBy: "bob@acme.com",
    startedAt: "1h ago",
    duration: "3m 12s",
    pr: "#182",
    commit: "def5678",
    jobsExecuted: 4,
  },
  {
    id: "deploy_003",
    component: "billing-worker",
    version: "v1.5.3",
    environment: "production",
    status: "failed",
    triggeredBy: "charlie@acme.com",
    startedAt: "2h ago",
    duration: "1m 45s",
    pr: "#180",
    commit: "ghi9012",
    jobsExecuted: 2,
  },
  {
    id: "deploy_004",
    component: "auth-worker",
    version: "v1.8.2",
    environment: "production",
    status: "running",
    triggeredBy: "alice@acme.com",
    startedAt: "5m ago",
    duration: "2m 10s",
    pr: "#183",
    commit: "jkl3456",
    jobsExecuted: 2,
  },
];

const statusConfig = {
  success: { label: "Success", color: "text-green-500", bg: "bg-green-500/10", icon: CheckCircle2 },
  failed: { label: "Failed", color: "text-red-500", bg: "bg-red-500/10", icon: XCircle },
  running: { label: "Running", color: "text-blue-500", bg: "bg-blue-500/10", icon: Clock },
};

const environmentStats = [
  { name: "production", deployments: 145, successRate: 96.5, lastDeploy: "12m ago" },
  { name: "staging", deployments: 234, successRate: 98.2, lastDeploy: "1h ago" },
  { name: "dev", deployments: 412, successRate: 94.1, lastDeploy: "30m ago" },
];

export function DeploymentsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1>Deployments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track component deployments across all environments
          </p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-2">
          <Rocket className="w-4 h-4" />
          New Deployment
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Today</p>
          <p className="text-2xl font-semibold mt-1">28</p>
          <p className="text-xs text-green-600 mt-2">+5 from yesterday</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Success Rate (7d)</p>
          <p className="text-2xl font-semibold mt-1">96.2%</p>
          <p className="text-xs text-green-600 mt-2">+1.3% from last week</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Avg Duration</p>
          <p className="text-2xl font-semibold mt-1">2m 48s</p>
          <p className="text-xs text-red-600 mt-2">+12s from last week</p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="mb-4">Environment Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {environmentStats.map((env) => (
            <div key={env.name} className="p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-3">
                <h4 className="capitalize font-medium">{env.name}</h4>
                <Badge variant="secondary" className="text-xs">
                  {env.deployments} deploys
                </Badge>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Success Rate</span>
                    <span className="font-semibold text-green-500">{env.successRate}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${env.successRate}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Last deploy: {env.lastDeploy}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-4">Recent Deployments</h3>
        <div className="space-y-3">
          {deployments.map((deploy) => {
            const statusInfo = statusConfig[deploy.status as keyof typeof statusConfig];
            const StatusIcon = statusInfo.icon;

            return (
              <div key={deploy.id} className="p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded ${statusInfo.bg} flex-shrink-0`}>
                    <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-mono font-medium">{deploy.component}</span>
                      <Badge variant="outline" className="text-xs">{deploy.version}</Badge>
                      <Badge variant="outline" className="text-xs">{deploy.environment}</Badge>
                      <span className={`text-sm ${statusInfo.color}`}>{statusInfo.label}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <div className="flex items-center gap-1">
                        <GitBranch className="w-3 h-3" />
                        <span>{deploy.pr}</span>
                      </div>
                      <span>•</span>
                      <span className="font-mono">{deploy.commit}</span>
                      <span>•</span>
                      <span>{deploy.jobsExecuted} jobs</span>
                      <span>•</span>
                      <span>{deploy.duration}</span>
                      <span>•</span>
                      <span>{deploy.startedAt}</span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-2">
                      Triggered by {deploy.triggeredBy}
                    </p>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    {deploy.status === "failed" && (
                      <button className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent">
                        Rollback
                      </button>
                    )}
                    <button className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent">
                      View Logs
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
