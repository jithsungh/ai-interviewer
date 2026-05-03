import { PageWrapper, itemVariant } from "@/components/PageWrapper";
import { StatCard } from "@/components/StatCard";
import { motion } from "framer-motion";
import { BarChart3, Download, Share, Filter, FileText, TrendingUp, Users, Clock, Loader2, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getOrgContextFromUser } from "@/services/api/adminApiClient";
import { auditLogsApi, proctoringApi } from "@/services/api";
import type { AuditLogResponse, ProctoringReviewQueueItemResponse } from "@/types/admin-api";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Reports = () => {
  const { user, accessToken } = useAuth();
  const [logs, setLogs] = useState<AuditLogResponse[]>([]);
  const [queueItems, setQueueItems] = useState<ProctoringReviewQueueItemResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !accessToken) return;

    const loadReportsData = async () => {
      try {
        setLoading(true);
        setError(null);
        const orgId = getOrgContextFromUser(user);
        const [logsResponse, queueResponse] = await Promise.all([
          auditLogsApi.list(accessToken, orgId, { page: 1, per_page: 100 }),
          proctoringApi.getReviewQueue(accessToken, { limit: 100, offset: 0 }),
        ]);

        setLogs(logsResponse.data || []);
        setQueueItems(queueResponse.items || []);
      } catch (err: any) {
        setError(err.message || "Failed to load reports data");
      } finally {
        setLoading(false);
      }
    };

    loadReportsData();
  }, [user, accessToken]);

  const monthlyData = useMemo(() => {
    const monthMap: Record<string, { month: string; interviews: number; passed: number }> = {};
    const now = new Date();

    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      monthMap[key] = {
        month: date.toLocaleString(undefined, { month: "short" }),
        interviews: 0,
        passed: 0,
      };
    }

    logs.forEach((entry) => {
      if (!entry.created_at) return;
      const date = new Date(entry.created_at);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!monthMap[key]) return;
      monthMap[key].interviews += 1;
      if ((entry.event_type || "").includes("success") || (entry.event_type || "").includes("review")) {
        monthMap[key].passed += 1;
      }
    });

    return Object.values(monthMap);
  }, [logs]);

  const scoreDistribution = useMemo(() => {
    const counters = { low: 0, moderate: 0, high: 0, critical: 0 };
    queueItems.forEach((item) => {
      const key = (item.classification || "").toLowerCase() as keyof typeof counters;
      if (key in counters) counters[key] += 1;
    });

    return [
      { name: "Low", value: counters.low, color: "hsl(142, 71%, 45%)" },
      { name: "Moderate", value: counters.moderate, color: "hsl(38, 92%, 50%)" },
      { name: "High", value: counters.high, color: "hsl(199, 89%, 48%)" },
      { name: "Critical", value: counters.critical, color: "hsl(0, 72%, 51%)" },
    ];
  }, [queueItems]);

  const publishedReports = useMemo(() => {
    return logs.slice(0, 10).map((entry) => ({
      name: entry.event_type.replaceAll("_", " "),
      type: "Audit",
      date: entry.created_at ? new Date(entry.created_at).toLocaleDateString() : "—",
      status: "Published",
    }));
  }, [logs]);

  const averageRisk = queueItems.length
    ? queueItems.reduce((sum, item) => sum + item.total_risk, 0) / queueItems.length
    : 0;

  return (
  <PageWrapper title="Reports & Analytics" description="Generate, filter, and publish interview reports">
    {error && (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard title="Total Reports" value={loading ? "..." : String(publishedReports.length)} icon={FileText} />
      <StatCard title="Interviews Analyzed" value={loading ? "..." : String(logs.length)} icon={Users} />
      <StatCard title="Avg. Queue Risk" value={loading ? "..." : averageRisk.toFixed(1)} icon={Clock} iconColor="text-teal" />
      <StatCard
        title="Pass Proxy"
        value={loading ? "..." : `${logs.length ? ((monthlyData.reduce((sum, row) => sum + row.passed, 0) / Math.max(1, monthlyData.reduce((sum, row) => sum + row.interviews, 0))) * 100).toFixed(1) : "0.0"}%`}
        icon={TrendingUp}
        iconColor="text-success"
      />
    </div>

    <div className="flex items-center gap-3 mb-6">
      <select className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground" disabled>
        <option>{user?.organizationId ? `Org #${user.organizationId}` : "Current Organization"}</option>
      </select>
      <button className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors">
        <Filter className="h-4 w-4" /> Filters
      </button>
      <div className="ml-auto flex gap-2">
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors">
          <BarChart3 className="h-4 w-4" /> Generate Report
        </button>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <motion.div variants={itemVariant} className="glass-card p-6">
        <h3 className="text-sm font-semibold mb-4">Interviews Over Time</h3>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading trend data...
          </div>
        ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" />
            <XAxis dataKey="month" stroke="hsl(215, 20%, 55%)" fontSize={12} />
            <YAxis stroke="hsl(215, 20%, 55%)" fontSize={12} />
            <Tooltip contentStyle={{ background: "hsl(222, 44%, 8%)", border: "1px solid hsl(217, 33%, 17%)", borderRadius: 8, color: "hsl(210, 40%, 96%)" }} />
            <Bar dataKey="interviews" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="passed" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        )}
      </motion.div>

      <motion.div variants={itemVariant} className="glass-card p-6">
        <h3 className="text-sm font-semibold mb-4">Score Distribution</h3>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading distribution data...
          </div>
        ) : (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={scoreDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
              {scoreDistribution.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "hsl(222, 44%, 8%)", border: "1px solid hsl(217, 33%, 17%)", borderRadius: 8, color: "hsl(210, 40%, 96%)" }} />
          </PieChart>
        </ResponsiveContainer>
        )}
        <div className="flex justify-center gap-4 mt-2">
          {scoreDistribution.map((s) => (
            <div key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              {s.name}
            </div>
          ))}
        </div>
      </motion.div>
    </div>

    <motion.div variants={itemVariant} className="glass-card p-6">
      <h3 className="text-sm font-semibold mb-4">Generated Reports</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border/50">
            <th className="pb-3 font-medium">Report Name</th>
            <th className="pb-3 font-medium">Type</th>
            <th className="pb-3 font-medium">Date</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {publishedReports.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-8 text-center text-muted-foreground">No generated reports found yet.</td>
            </tr>
          ) : publishedReports.map((r, index) => (
            <tr key={`${r.name}-${r.date}-${index}`} className="data-table-row">
              <td className="py-3 font-medium">{r.name}</td>
              <td className="py-3"><span className="status-badge-neutral">{r.type}</span></td>
              <td className="py-3 text-muted-foreground">{r.date}</td>
              <td className="py-3"><span className={r.status === "Published" ? "status-badge-success" : "status-badge-warning"}>{r.status}</span></td>
              <td className="py-3 flex gap-2">
                <button className="p-1.5 rounded hover:bg-muted transition-colors"><Download className="h-4 w-4 text-muted-foreground" /></button>
                <button className="p-1.5 rounded hover:bg-muted transition-colors"><Share className="h-4 w-4 text-muted-foreground" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  </PageWrapper>
);
};

export default Reports;
