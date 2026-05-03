import { PageWrapper, itemVariant } from "@/components/PageWrapper";
import { motion } from "framer-motion";
import { Lock, Clock, Trash2, Download, Loader2, AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getOrgContextFromUser } from "@/services/api/adminApiClient";
import { auditLogsApi } from "@/services/api";
import type { AuditLogResponse } from "@/types/admin-api";
import { Alert, AlertDescription } from "@/components/ui/alert";

const toTitleCase = (value: string) =>
  value
    .split("_")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
    .join(" ");

const Governance = () => {
  const { user, accessToken } = useAuth();
  const [logs, setLogs] = useState<AuditLogResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !accessToken) return;

    const loadLogs = async () => {
      try {
        setLoading(true);
        setError(null);
        const orgId = getOrgContextFromUser(user);
        const response = await auditLogsApi.list(accessToken, orgId, { page: 1, per_page: 50 });
        setLogs(response.data || []);
      } catch (err: any) {
        setError(err.message || "Failed to load audit logs");
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [user, accessToken]);

  const deletionRequests = useMemo(() => {
    return logs.filter((entry) => {
      const event = (entry.event_type || "").toLowerCase();
      return event.includes("delete") || event.includes("erasure") || event.includes("gdpr");
    });
  }, [logs]);

  const retentionPolicies = useMemo(() => {
    return [
      {
        id: 1,
        type: "Auth Audit Logs",
        retention: "Configured by backend policy",
        autoDelete: false,
        status: logs.length > 0 ? "Tracked" : "No data",
      },
      {
        id: 2,
        type: "Deletion Requests",
        retention: "Policy-defined",
        autoDelete: false,
        status: deletionRequests.length > 0 ? "Observed" : "No requests",
      },
    ];
  }, [logs.length, deletionRequests.length]);

  return (
    <PageWrapper title="Governance & Compliance" description="Audit logs, data retention, consent records, and deletion requests">
      <div className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <motion.div variants={itemVariant} className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Lock className="h-5 w-5 text-purple" /><h2 className="text-lg font-semibold">Audit Logs</h2></div>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg text-xs transition-colors" disabled>
              <Download className="h-3 w-3" /> Export
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading audit logs...
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border/50">
                  <th className="pb-3 font-medium">Action</th>
                  <th className="pb-3 font-medium">Actor</th>
                  <th className="pb-3 font-medium">Target</th>
                  <th className="pb-3 font-medium">Timestamp</th>
                  <th className="pb-3 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">No audit logs available.</td>
                  </tr>
                ) : (
                  logs.map((entry) => {
                    const target =
                      (entry.event_metadata &&
                        (entry.event_metadata.target ||
                          entry.event_metadata.resource ||
                          entry.event_metadata.email ||
                          entry.event_metadata.submission_id)) ||
                      "—";
                    return (
                      <tr key={entry.id} className="data-table-row">
                        <td className="py-3 font-medium">{toTitleCase(entry.event_type)}</td>
                        <td className="py-3 text-muted-foreground">{entry.user_id ? `User #${entry.user_id}` : "System"}</td>
                        <td className="py-3">{String(target)}</td>
                        <td className="py-3 text-muted-foreground text-xs">{entry.created_at ? new Date(entry.created_at).toLocaleString() : "—"}</td>
                        <td className="py-3 text-xs font-mono text-muted-foreground">{entry.ip_address || "—"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div variants={itemVariant} className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4"><Clock className="h-5 w-5 text-info" /><h2 className="text-lg font-semibold">Retention Policies</h2></div>
            <div className="space-y-3">
              {retentionPolicies.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg text-sm">
                  <div>
                    <div className="font-medium">{p.type}</div>
                    <div className="text-xs text-muted-foreground">Retention: {p.retention} · Auto-delete: {p.autoDelete ? "Yes" : "No"}</div>
                  </div>
                  <span className={p.status === "No data" ? "status-badge-warning" : "status-badge-success"}>{p.status}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={itemVariant} className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4"><Trash2 className="h-5 w-5 text-destructive" /><h2 className="text-lg font-semibold">Deletion Requests</h2></div>
            <div className="space-y-3">
              {deletionRequests.length === 0 ? (
                <div className="p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">No deletion-related requests found in audit logs.</div>
              ) : (
                deletionRequests.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg text-sm">
                    <div>
                      <div className="font-medium">{entry.user_id ? `User #${entry.user_id}` : "System"}</div>
                      <div className="text-xs text-muted-foreground">
                        {toTitleCase(entry.event_type)} · {entry.created_at ? new Date(entry.created_at).toLocaleDateString() : "—"}
                      </div>
                    </div>
                    <span className="status-badge-warning">Observed</span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default Governance;
