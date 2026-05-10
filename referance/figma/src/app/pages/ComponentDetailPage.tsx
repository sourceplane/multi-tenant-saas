import { useParams, Link } from "react-router";
import { ArrowLeft, CheckCircle2, XCircle, GitBranch, Activity, Network, FileCode, FileText, Award, Zap, AlertTriangle } from "lucide-react";
import { Card } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const componentData: Record<string, any> = {
  "api-edge-worker": {
    name: "api-edge-worker",
    title: "API Edge Worker",
    type: "cloudflare-worker",
    status: "healthy",
    version: "v2.3.1",
    owner: "team-platform",
    system: "saas-platform",
    lifecycle: "production",
    repo: "sourceplane/platform-repo",
    repoPath: "apps/api-edge-worker",
    description: "Cloudflare Worker that serves the public API edge",
    tags: ["cloudflare", "edge", "api"],
    environments: [
      { name: "production", status: "healthy", lastDeploy: "12m ago" },
      { name: "staging", status: "healthy", lastDeploy: "2h ago" },
      { name: "dev", status: "healthy", lastDeploy: "1d ago" },
    ],
    score: 92,
  },
  "web-console": {
    name: "web-console",
    title: "Web Console",
    type: "cloudflare-pages",
    status: "degraded",
    version: "v3.2.0",
    owner: "team-frontend",
    system: "saas-platform",
    lifecycle: "production",
    repo: "sourceplane/platform-repo",
    repoPath: "apps/web-console",
    description: "React-based web console for platform management",
    tags: ["cloudflare", "frontend", "react"],
    environments: [
      { name: "production", status: "degraded", lastDeploy: "1h ago" },
      { name: "staging", status: "healthy", lastDeploy: "3h ago" },
    ],
    score: 78,
  },
};

const metricsData = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  requests: Math.floor(Math.random() * 1000) + 500,
  errors: Math.floor(Math.random() * 10),
  latency: Math.floor(Math.random() * 50) + 100,
}));

const runs = [
  { id: "run_abc123", commit: "abc1234", branch: "main", pr: "#184", environment: "production", jobs: 3, status: "success", duration: "2m 34s", triggeredBy: "alice@acme.com", timestamp: "12m ago" },
  { id: "run_def456", commit: "def5678", branch: "main", pr: "#184", environment: "staging", jobs: 3, status: "success", duration: "2m 12s", triggeredBy: "alice@acme.com", timestamp: "2h ago" },
  { id: "run_ghi789", commit: "ghi9012", branch: "feature/routing", pr: "#183", environment: "dev", jobs: 2, status: "success", duration: "1m 45s", triggeredBy: "bob@acme.com", timestamp: "1d ago" },
];

const prHistory = [
  {
    number: 184,
    title: "Update API worker routing",
    author: "alice@acme.com",
    mergedAt: "2h ago",
    filesChanged: ["apps/api-edge-worker/component.json", "apps/api-edge-worker/src/router.ts"],
    jobsAffected: ["api-edge-worker@production.deploy", "api-edge-worker@staging.deploy"],
    environmentsAffected: ["production", "staging"],
    riskScore: "low",
  },
  {
    number: 183,
    title: "Add rate limiting middleware",
    author: "bob@acme.com",
    mergedAt: "2d ago",
    filesChanged: ["apps/api-edge-worker/src/middleware/ratelimit.ts"],
    jobsAffected: ["api-edge-worker@dev.deploy"],
    environmentsAffected: ["dev"],
    riskScore: "medium",
  },
  {
    number: 175,
    title: "Refactor authentication flow",
    author: "charlie@acme.com",
    mergedAt: "1w ago",
    filesChanged: ["apps/api-edge-worker/src/auth.ts", "apps/api-edge-worker/component.json"],
    jobsAffected: ["api-edge-worker@production.deploy", "api-edge-worker@staging.deploy", "api-edge-worker@dev.deploy"],
    environmentsAffected: ["production", "staging", "dev"],
    riskScore: "high",
  },
];

const dependencies = [
  { name: "auth-worker", type: "component", direction: "downstream", status: "healthy" },
  { name: "identity-store", type: "resource", direction: "downstream", status: "healthy" },
  { name: "cloudflare-zone", type: "resource", direction: "consumes", status: "healthy" },
];

const scorecard = [
  { label: "Owner exists", status: "pass", weight: 10 },
  { label: "Production env declared", status: "pass", weight: 15 },
  { label: "Rollback job available", status: "pass", weight: 10 },
  { label: "SLO linked", status: "warn", weight: 5 },
  { label: "Runbook linked", status: "fail", weight: 5 },
  { label: "Last successful deploy < 7d", status: "pass", weight: 15 },
  { label: "All tests passing", status: "pass", weight: 10 },
  { label: "Security scan passed", status: "pass", weight: 10 },
  { label: "Dependencies up to date", status: "warn", weight: 10 },
  { label: "Documentation exists", status: "pass", weight: 10 },
];

export function ComponentDetailPage() {
  const { componentId } = useParams();
  const component = componentData[componentId || ""] || componentData["api-edge-worker"];

  const passCount = scorecard.filter(s => s.status === "pass").length;
  const totalScore = scorecard.reduce((sum, item) => sum + (item.status === "pass" ? item.weight : item.status === "warn" ? item.weight * 0.5 : 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/" className="p-2 hover:bg-accent rounded-md transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-mono">{component.name}</h1>
            <Badge variant="outline">{component.type}</Badge>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-sm capitalize">{component.status}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {component.description}
          </p>
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
            <span className="font-mono">{component.repo}</span>
            <span>•</span>
            <span>{component.owner}</span>
            <span>•</span>
            <span>{component.system}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors">
            Run Plan
          </button>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity">
            Deploy
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Version</p>
          <p className="text-xl font-mono mt-1">{component.version}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Lifecycle</p>
          <p className="text-xl capitalize mt-1">{component.lifecycle}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Latest Plan</p>
          <div className="flex items-center gap-1.5 mt-1">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-xl">Success</span>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Latest Deploy</p>
          <p className="text-xl mt-1">12m ago</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Score</p>
          <p className={`text-xl mt-1 font-semibold ${component.score >= 90 ? 'text-green-500' : component.score >= 80 ? 'text-yellow-500' : 'text-red-500'}`}>
            {component.score} / 100
          </p>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
          <TabsTrigger value="pr-history">PR History</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
          <TabsTrigger value="environments">Environments</TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
          <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="mb-3">Component Info</h3>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p className="mt-1 font-mono">{component.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <p className="mt-1">{component.type}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Owner</p>
                    <p className="mt-1">{component.owner}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">System</p>
                    <p className="mt-1">{component.system}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Repository Path</p>
                    <p className="mt-1 font-mono text-xs">{component.repoPath}</p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">Tags</p>
                  <div className="flex gap-1.5 mt-1.5">
                    {component.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="mb-4">Request Volume (24h)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={metricsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Line type="monotone" dataKey="requests" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4">Recent Activity</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                <div>
                  <p><span className="font-medium">production</span> deploy succeeded</p>
                  <p className="text-muted-foreground text-xs">12m ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                <div>
                  <p>Plan generated for commit <span className="font-mono">abc1234</span></p>
                  <p className="text-muted-foreground text-xs">15m ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <GitBranch className="w-4 h-4 text-blue-500 mt-0.5" />
                <div>
                  <p>PR #184 modified <span className="font-mono">router.ts</span> and <span className="font-mono">component.json</span></p>
                  <p className="text-muted-foreground text-xs">2h ago</p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="runs" className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-4">Pipeline Runs</h3>
            <div className="space-y-3">
              {runs.map((run) => (
                <div key={run.id} className="p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm">{run.id}</span>
                        <Badge variant="outline" className="text-xs">{run.environment}</Badge>
                        <Badge variant="outline" className="text-xs">{run.pr}</Badge>
                        {run.status === "success" ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="font-mono">{run.commit}</span>
                        <span>•</span>
                        <span>{run.branch}</span>
                        <span>•</span>
                        <span>{run.jobs} jobs</span>
                        <span>•</span>
                        <span>{run.duration}</span>
                        <span>•</span>
                        <span>{run.timestamp}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Triggered by {run.triggeredBy}</p>
                    </div>
                    <button className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent">
                      View Logs
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="pr-history" className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-4">Pull Request History</h3>
            <div className="space-y-4">
              {prHistory.map((pr) => (
                <div key={pr.number} className="p-4 rounded-lg border border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">PR #{pr.number}</span>
                        <Badge
                          variant={pr.riskScore === "low" ? "secondary" : pr.riskScore === "medium" ? "outline" : "destructive"}
                          className="text-xs"
                        >
                          {pr.riskScore} risk
                        </Badge>
                      </div>
                      <p className="text-sm mt-1">{pr.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Merged {pr.mergedAt} by {pr.author}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Files Changed</p>
                      <div className="mt-1 space-y-1">
                        {pr.filesChanged.map((file, i) => (
                          <div key={i} className="font-mono text-xs bg-muted px-2 py-1 rounded">
                            {file}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-muted-foreground text-xs">Jobs Affected</p>
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        {pr.jobsAffected.map((job, i) => (
                          <Badge key={i} variant="outline" className="text-xs font-mono">
                            {job}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-muted-foreground text-xs">Environments Affected</p>
                      <div className="flex gap-1.5 mt-1">
                        {pr.environmentsAffected.map((env, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {env}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="dependencies" className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-4">Dependency Graph</h3>
            <div className="bg-muted/30 rounded-lg p-6 font-mono text-sm">
              <div className="space-y-2">
                <div className="pl-0">
                  <span className="text-blue-500">api-edge-worker</span>
                </div>
                <div className="pl-4 border-l-2 border-muted-foreground/30">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">├─</span>
                    <span>depends on</span>
                    <span className="text-green-500">auth-worker</span>
                  </div>
                </div>
                <div className="pl-4 border-l-2 border-muted-foreground/30">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">├─</span>
                    <span>consumes</span>
                    <span className="text-purple-500">identity-store</span>
                  </div>
                </div>
                <div className="pl-4">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">└─</span>
                    <span>uses resource</span>
                    <span className="text-yellow-500">cloudflare-zone</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {dependencies.map((dep, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded border border-border">
                  <div className="flex items-center gap-3">
                    <Network className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-mono text-sm">{dep.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{dep.type} • {dep.direction}</p>
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="environments" className="space-y-6">
          <div className="grid gap-4">
            {component.environments.map((env: any) => (
              <Card key={env.name} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="capitalize">{env.name}</h3>
                    <p className="text-sm text-muted-foreground">Last deployed {env.lastDeploy}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="text-sm capitalize">{env.status}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent">
                    View Deployment
                  </button>
                  <button className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90">
                    Deploy Now
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="config" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3>component.json</h3>
              <button className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent">
                View in Repo
              </button>
            </div>
            <pre className="p-4 bg-muted rounded-lg font-mono text-xs overflow-x-auto border border-border">
{`{
  "apiVersion": "orun.io/v1",
  "kind": "Component",
  "metadata": {
    "name": "${component.name}",
    "title": "${component.title}",
    "description": "${component.description}",
    "tags": ${JSON.stringify(component.tags, null, 2)},
    "owner": "${component.owner}",
    "system": "${component.system}"
  },
  "spec": {
    "type": "${component.type}",
    "lifecycle": "${component.lifecycle}",
    "repoPath": "${component.repoPath}",
    "environments": ${JSON.stringify(component.environments.map((e: any) => e.name), null, 2)},
    "dependsOn": [
      "component:auth-worker"
    ]
  }
}`}
            </pre>
          </Card>
        </TabsContent>

        <TabsContent value="scorecard" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3>Production Readiness Score</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {passCount} of {scorecard.length} checks passing
                </p>
              </div>
              <div className={`text-4xl font-semibold ${totalScore >= 90 ? 'text-green-500' : totalScore >= 70 ? 'text-yellow-500' : 'text-red-500'}`}>
                {Math.round(totalScore)}
              </div>
            </div>

            <div className="space-y-3">
              {scorecard.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded border border-border">
                  <div className="flex items-center gap-3">
                    {item.status === "pass" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : item.status === "warn" ? (
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Weight: {item.weight}</span>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6 hover:bg-accent/50 transition-colors cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">Run Plan</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Generate execution plan for this component
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover:bg-accent/50 transition-colors cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-500/10 rounded">
                  <Activity className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h4 className="font-medium">Deploy to Staging</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Trigger deployment to staging environment
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover:bg-accent/50 transition-colors cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-500/10 rounded">
                  <GitBranch className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-medium">Create Rollback PR</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Generate PR to rollback to previous version
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover:bg-accent/50 transition-colors cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-500/10 rounded">
                  <FileText className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h4 className="font-medium">Generate README</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Auto-generate component documentation
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
