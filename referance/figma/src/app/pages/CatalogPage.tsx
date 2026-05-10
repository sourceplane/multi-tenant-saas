import { Link } from "react-router";
import { Search, Filter, LayoutGrid, Table2, CheckCircle2, AlertCircle, Clock, GitBranch } from "lucide-react";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";

const components = [
  {
    id: "api-edge-worker",
    name: "api-edge-worker",
    type: "cloudflare-worker",
    status: "healthy",
    owner: "team-platform",
    system: "saas-platform",
    repo: "sourceplane/platform-repo",
    repoShort: "platform-repo",
    lastDeploy: "12m ago",
    version: "v2.3.1",
    lifecycle: "production",
    environments: ["dev", "staging", "production"],
    tags: ["cloudflare", "edge", "api"],
    lastPR: "#184",
    planStatus: "success",
    score: 92,
  },
  {
    id: "web-console",
    name: "web-console",
    type: "cloudflare-pages",
    status: "degraded",
    owner: "team-frontend",
    system: "saas-platform",
    repo: "sourceplane/platform-repo",
    repoShort: "platform-repo",
    lastDeploy: "1h ago",
    version: "v3.2.0",
    lifecycle: "production",
    environments: ["staging", "production"],
    tags: ["cloudflare", "frontend", "react"],
    lastPR: "#182",
    planStatus: "failed",
    score: 78,
  },
  {
    id: "billing-worker",
    name: "billing-worker",
    type: "worker",
    status: "healthy",
    owner: "team-billing",
    system: "billing",
    repo: "sourceplane/billing-repo",
    repoShort: "billing-repo",
    lastDeploy: "2d ago",
    version: "v1.5.3",
    lifecycle: "production",
    environments: ["production"],
    tags: ["billing", "payments"],
    lastPR: "#45",
    planStatus: "success",
    score: 88,
  },
  {
    id: "checkout-chart",
    name: "checkout-chart",
    type: "helm-chart",
    status: "healthy",
    owner: "team-commerce",
    system: "commerce",
    repo: "sourceplane/commerce-repo",
    repoShort: "commerce-repo",
    lastDeploy: "5h ago",
    version: "v2.1.0",
    lifecycle: "production",
    environments: ["dev", "staging", "production"],
    tags: ["kubernetes", "commerce"],
    lastPR: "#67",
    planStatus: "success",
    score: 95,
  },
  {
    id: "auth-worker",
    name: "auth-worker",
    type: "cloudflare-worker",
    status: "healthy",
    owner: "team-platform",
    system: "saas-platform",
    repo: "sourceplane/platform-repo",
    repoShort: "platform-repo",
    lastDeploy: "30m ago",
    version: "v1.8.2",
    lifecycle: "production",
    environments: ["dev", "staging", "production"],
    tags: ["cloudflare", "auth", "security"],
    lastPR: "#183",
    planStatus: "success",
    score: 90,
  },
  {
    id: "identity-store",
    name: "identity-store",
    type: "database",
    status: "healthy",
    owner: "team-platform",
    system: "saas-platform",
    repo: "sourceplane/platform-repo",
    repoShort: "platform-repo",
    lastDeploy: "7d ago",
    version: "v5.2.1",
    lifecycle: "production",
    environments: ["staging", "production"],
    tags: ["database", "postgres"],
    lastPR: "#175",
    planStatus: "success",
    score: 85,
  },
];

const statusConfig = {
  healthy: { label: "Healthy", color: "text-green-500", bg: "bg-green-500", icon: CheckCircle2 },
  degraded: { label: "Degraded", color: "text-yellow-500", bg: "bg-yellow-500", icon: AlertCircle },
  stale: { label: "Stale", color: "text-gray-400", bg: "bg-gray-400", icon: Clock },
};

export function CatalogPage() {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredComponents = components.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.type.toLowerCase().includes(search.toLowerCase()) ||
      c.owner.toLowerCase().includes(search.toLowerCase()) ||
      c.system.toLowerCase().includes(search.toLowerCase());

    const matchesType = filterType === "all" || c.type === filterType;
    const matchesStatus = filterStatus === "all" || c.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const types = Array.from(new Set(components.map(c => c.type)));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div>
            <div className="flex items-center gap-2">
              <h1>Catalog</h1>
              <Badge variant="outline" className="text-xs font-mono">Git-native</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {components.length} components across {new Set(components.map(c => c.repo)).size} repositories
            </p>
          </div>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity">
          Link Repository
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, type, owner, or system..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <select
            className="px-3 py-2 border border-border rounded-md bg-background text-sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Types</option>
            {types.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select
            className="px-3 py-2 border border-border rounded-md bg-background text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="healthy">Healthy</option>
            <option value="degraded">Degraded</option>
            <option value="stale">Stale</option>
          </select>

          <div className="flex border border-border rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode("card")}
              className={`px-3 py-2 ${viewMode === "card" ? "bg-accent" : "bg-background"} hover:bg-accent transition-colors`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-2 ${viewMode === "table" ? "bg-accent" : "bg-background"} hover:bg-accent transition-colors border-l border-border`}
            >
              <Table2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Badge variant="outline" className="text-xs">
          By Repository
        </Badge>
        <Badge variant="outline" className="text-xs">
          By System
        </Badge>
        <Badge variant="outline" className="text-xs">
          By Environment
        </Badge>
        <Badge variant="outline" className="text-xs">
          By Tags
        </Badge>
        <Badge variant="outline" className="text-xs">
          Recently Changed
        </Badge>
        <Badge variant="outline" className="text-xs">
          Missing Owner
        </Badge>
      </div>

      {viewMode === "card" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredComponents.map((component) => {
            const statusInfo = statusConfig[component.status as keyof typeof statusConfig];
            const StatusIcon = statusInfo.icon;

            return (
              <Link key={component.id} to={`/components/${component.id}`}>
                <Card className="p-5 hover:bg-accent/50 transition-colors cursor-pointer h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full mt-2 ${statusInfo.bg}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-mono truncate">{component.name}</h3>
                          <Badge variant="outline" className="text-xs">{component.type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {component.owner} • {component.system}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-muted-foreground">Score</div>
                      <div className={`text-lg font-semibold ${component.score >= 90 ? 'text-green-500' : component.score >= 80 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {component.score}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Repository</p>
                      <p className="font-mono truncate" title={component.repo}>{component.repoShort}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Lifecycle</p>
                      <p className="capitalize">{component.lifecycle}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Latest Deploy</p>
                      <p>{component.lastDeploy}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Plan Status</p>
                      <div className="flex items-center gap-1">
                        {component.planStatus === "success" ? (
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-red-500" />
                        )}
                        <span className="capitalize">{component.planStatus}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border flex-wrap">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <GitBranch className="w-3 h-3" />
                      <span>{component.lastPR}</span>
                    </div>
                    {component.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Component</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Repository</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Owner</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Environments</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Score</th>
                </tr>
              </thead>
              <tbody>
                {filteredComponents.map((component) => {
                  const statusInfo = statusConfig[component.status as keyof typeof statusConfig];
                  const StatusIcon = statusInfo.icon;

                  return (
                    <tr key={component.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                      <td className="p-3">
                        <Link to={`/components/${component.id}`} className="block">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${statusInfo.bg}`} />
                            <span className="font-mono text-sm">{component.name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{component.system}</div>
                        </Link>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">{component.type}</Badge>
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-sm">{component.repoShort}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm">{component.owner}</span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {component.environments.map(env => (
                            <Badge key={env} variant="secondary" className="text-xs">
                              {env}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                          <span className="text-sm capitalize">{component.status}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`text-sm font-semibold ${component.score >= 90 ? 'text-green-500' : component.score >= 80 ? 'text-yellow-500' : 'text-red-500'}`}>
                          {component.score}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
