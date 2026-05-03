import { PageWrapper, itemVariant } from "@/components/PageWrapper";
import { StatCard } from "@/components/StatCard";
import { motion } from "framer-motion";
import { Users, Clock, AlertTriangle, Activity, TrendingUp, Calendar, BarChart3, Loader2, AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getOrgContextFromUser } from "@/services/api/adminApiClient";
import { auditLogsApi, codingProblemsApi, proctoringApi, questionsApi, windowsApi } from "@/services/api";
import type { AuditLogResponse, ProctoringReviewQueueItemResponse } from "@/types/admin-api";
import { Alert, AlertDescription } from "@/components/ui/alert";

const statusBadge = (eventType: string) => {
  if (eventType.includes("failure") || eventType.includes("suspicious")) return "status-badge-danger";
  if (eventType.includes("created") || eventType.includes("success")) return "status-badge-success";
  return "status-badge-neutral";
};

const Dashboard = () => {
  const { user, accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<AuditLogResponse[]>([]);
  const [queueItems, setQueueItems] = useState<ProctoringReviewQueueItemResponse[]>([]);
  const [metrics, setMetrics] = useState({
    totalInterviews: 0,
    activeSessions: 0,
    avgRisk: 0,
    pendingReviews: 0,
    questionCount: 0,
    codingCount: 0,
  });

  useEffect(() => {
    if (!user || !accessToken) return;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);
        const orgId = getOrgContextFromUser(user);

        const [windowsRes, queueRes, logsRes, questionsRes, codingRes] = await Promise.all([
          windowsApi.list(accessToken, orgId, { page: 1, per_page: 1 }),
          proctoringApi.getReviewQueue(accessToken, { limit: 100, offset: 0 }),
          auditLogsApi.list(accessToken, orgId, { page: 1, per_page: 10 }),
          questionsApi.list(accessToken, orgId, { page: 1, per_page: 1 }),
          codingProblemsApi.list(accessToken, orgId, { page: 1, per_page: 1 }),
        ]);

        const items = queueRes.items || [];
        const flaggedPending = items.filter((item) => item.flagged && !item.reviewed);
        const avgRisk = items.length ? items.reduce((sum, item) => sum + item.total_risk, 0) / items.length : 0;

        setQueueItems(items);
        setLogs(logsRes.data || []);
        setMetrics({
          totalInterviews: Number(windowsRes.pagination?.total ?? windowsRes.data?.length ?? 0),
          activeSessions: flaggedPending.length,
          avgRisk,
          pendingReviews: flaggedPending.length,
          questionCount: Number(questionsRes.pagination?.total ?? questionsRes.data?.length ?? 0),
          codingCount: Number(codingRes.pagination?.total ?? codingRes.data?.length ?? 0),
        });
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [user, accessToken]);

  const topRiskItems = useMemo(() => {
    return [...queueItems].sort((a, b) => b.total_risk - a.total_risk).slice(0, 5);
  }, [queueItems]);

  return (
  <PageWrapper title="Dashboard" description="Overview of your AI interview platform">
    {error && (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard title="Total Interviews" value={loading ? "..." : String(metrics.totalInterviews)} icon={Users} />
      <StatCard title="Active Sessions" value={loading ? "..." : String(metrics.activeSessions)} change={`${metrics.pendingReviews} pending review`} changeType="negative" icon={Activity} iconColor="text-orange" />
      <StatCard title="Avg. Risk" value={loading ? "..." : metrics.avgRisk.toFixed(1)} icon={TrendingUp} iconColor="text-success" />
      <StatCard title="Pending Reviews" value={loading ? "..." : String(metrics.pendingReviews)} icon={AlertTriangle} iconColor="text-destructive" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <motion.div variants={itemVariant} className="lg:col-span-2 glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">High Risk Queue</h2>
          <span className="text-xs text-muted-foreground">Top submissions by risk</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading dashboard metrics...
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border/50">
                <th className="pb-3 font-medium">Submission</th>
                <th className="pb-3 font-medium">Classification</th>
                <th className="pb-3 font-medium">Risk</th>
                <th className="pb-3 font-medium">Events</th>
                <th className="pb-3 font-medium">Reviewed</th>
              </tr>
            </thead>
            <tbody>
              {topRiskItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">No proctoring queue items available.</td>
                </tr>
              ) : topRiskItems.map((item) => (
                <tr key={item.submission_id} className="data-table-row">
                  <td className="py-3 font-medium">#{item.submission_id}</td>
                  <td className="py-3"><span className={statusBadge(item.classification)}>{item.classification}</span></td>
                  <td className="py-3">{item.total_risk.toFixed(1)}</td>
                  <td className="py-3 text-muted-foreground">{item.event_count}</td>
                  <td className="py-3 text-muted-foreground">{item.reviewed ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </motion.div>

      <motion.div variants={itemVariant} className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="space-y-3">
          {[
            { label: "Schedule Interview", icon: Calendar, color: "text-success" },
            { label: "Review Flagged", icon: AlertTriangle, color: "text-destructive" },
            { label: "View Reports", icon: BarChart3, color: "text-primary" },
            { label: "Monitor Live", icon: Activity, color: "text-orange" },
          ].map((a) => (
            <button key={a.label} className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/60 transition-all duration-200 text-sm group">
              <a.icon className={`h-4 w-4 ${a.color}`} />
              <span>{a.label}</span>
              <span className="ml-auto text-muted-foreground group-hover:translate-x-1 transition-transform">→</span>
            </button>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-border/50">
          <h3 className="text-sm font-medium mb-3">System Health</h3>
          <div className="space-y-2">
            {[
              { label: "Audit Events", value: String(logs.length), ok: logs.length >= 0 },
              { label: "Question Bank", value: String(metrics.questionCount), ok: metrics.questionCount > 0 },
              { label: "Coding Problems", value: String(metrics.codingCount), ok: metrics.codingCount > 0 },
              { label: "Queue Size", value: String(queueItems.length), ok: true },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{s.label}</span>
                <div className="flex items-center gap-2">
                  <span>{s.value}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.ok ? "bg-success" : "bg-destructive"}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  </PageWrapper>
);
};

export default Dashboard;
