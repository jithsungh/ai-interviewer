import { PageWrapper, itemVariant } from "@/components/PageWrapper";
import { StatCard } from "@/components/StatCard";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  AlertOctagon,
  CheckCircle,
  ClipboardCheck,
  Eye,
  Loader2,
  MessageSquare,
  Percent,
  Search,
  UserCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { proctoringApi } from "@/services/api/proctoring";
import { ProtectedAction } from "@/components/ProtectedAction";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ProctoringEventResponse, ProctoringReviewQueueItemResponse, RiskScoreResponse } from "@/types/admin-api";

const classificationBadge: Record<string, string> = {
  low: "status-badge-success",
  moderate: "status-badge-warning",
  high: "status-badge-danger",
  critical: "status-badge-danger",
};

const ReviewQueue = () => {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<ProctoringReviewQueueItemResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);
  const [riskScore, setRiskScore] = useState<RiskScoreResponse | null>(null);
  const [events, setEvents] = useState<ProctoringEventResponse[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (!accessToken) return;

    const loadQueue = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await proctoringApi.getReviewQueue(accessToken, { limit: 100, offset: 0 });
        setItems(response.items || []);
      } catch (err: any) {
        setError(err.message || "Failed to load review queue");
      } finally {
        setLoading(false);
      }
    };

    loadQueue();
  }, [accessToken]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const filterMatch =
        filter === "All"
          ? true
          : filter === "Pending"
            ? !item.reviewed
            : filter === "Finalized"
              ? item.reviewed
              : true;
      const searchMatch =
        String(item.submission_id).includes(search) ||
        item.classification.toLowerCase().includes(search.toLowerCase());
      return filterMatch && searchMatch;
    });
  }, [items, filter, search]);

  const pendingCount = items.filter((item) => item.flagged && !item.reviewed).length;
  const reviewedCount = items.filter((item) => item.reviewed).length;
  const inProgressCount = items.filter((item) => item.flagged && !item.reviewed).slice(0, 1).length;

  const openDetails = async (submissionId: number) => {
    if (!accessToken) return;
    try {
      setSelectedSubmissionId(submissionId);
      setLoadingDetails(true);
      setError(null);
      const [score, submissionEvents] = await Promise.all([
        proctoringApi.getRiskScore(submissionId, accessToken),
        proctoringApi.getEvents(submissionId, accessToken),
      ]);
      setRiskScore(score);
      setEvents(submissionEvents || []);
    } catch (err: any) {
      setError(err.message || "Failed to load submission details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDetails = () => {
    setSelectedSubmissionId(null);
    setRiskScore(null);
    setEvents([]);
  };

  return (
    <PageWrapper title="Review Queue" description="Review flagged submissions, inspect events, and assess risk details">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Pending Reviews" value={String(pendingCount)} icon={AlertOctagon} iconColor="text-destructive" />
        <StatCard title="In Progress" value={String(inProgressCount)} icon={MessageSquare} iconColor="text-info" />
        <StatCard title="Overrides Applied" value="0" icon={UserCheck} iconColor="text-warning" />
        <StatCard title="Finalized" value={String(reviewedCount)} icon={CheckCircle} iconColor="text-success" />
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {["All", "Pending", "Finalized"].map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${filter === value ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {value}
            </button>
          ))}
        </div>

        <div className="relative ml-auto min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 bg-muted border border-border rounded-lg text-sm w-full"
            placeholder="Search submissions..."
            disabled={loading}
          />
        </div>
      </div>

      <motion.div variants={itemVariant} className="glass-card p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading review queue...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No review items match the current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border/50">
                  <th className="pb-3 font-medium">Submission</th>
                  <th className="pb-3 font-medium">Risk</th>
                  <th className="pb-3 font-medium">Classification</th>
                  <th className="pb-3 font-medium">Events</th>
                  <th className="pb-3 font-medium">Flagged</th>
                  <th className="pb-3 font-medium">Reviewed</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.submission_id} className="data-table-row">
                    <td className="py-3 font-medium">#{item.submission_id}</td>
                    <td className="py-3">{item.total_risk.toFixed(1)}</td>
                    <td className="py-3">
                      <span className={classificationBadge[item.classification] || "status-badge-neutral"}>
                        {item.classification.charAt(0).toUpperCase() + item.classification.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground">{item.event_count}</td>
                    <td className="py-3"><span className={item.flagged ? "status-badge-warning" : "status-badge-secondary"}>{item.flagged ? "Yes" : "No"}</span></td>
                    <td className="py-3"><span className={item.reviewed ? "status-badge-success" : "status-badge-secondary"}>{item.reviewed ? "Yes" : "No"}</span></td>
                    <td className="py-3 flex gap-1">
                      <ProtectedAction action="view_proctoring_queue">
                        <button onClick={() => openDetails(item.submission_id)} className="p-1.5 rounded hover:bg-muted transition-colors" title="View details">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </ProtectedAction>
                      <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Add note" disabled>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Mark reviewed" disabled>
                        <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {selectedSubmissionId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={closeDetails}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold">Submission #{selectedSubmissionId}</h2>
                  <p className="text-sm text-muted-foreground">Risk and event breakdown</p>
                </div>
                <button onClick={closeDetails} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {loadingDetails ? (
                <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading details...
                </div>
              ) : (
                <div className="space-y-6">
                  {riskScore && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="rounded-lg border border-border bg-muted/30 p-4">
                        <div className="text-xs text-muted-foreground mb-1">Total Risk</div>
                        <div className="text-2xl font-semibold">{riskScore.total_risk.toFixed(1)}</div>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 p-4">
                        <div className="text-xs text-muted-foreground mb-1">Classification</div>
                        <div className={`inline-flex ${classificationBadge[riskScore.classification] || "status-badge-neutral"}`}>
                          {riskScore.classification.charAt(0).toUpperCase() + riskScore.classification.slice(1)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 p-4">
                        <div className="text-xs text-muted-foreground mb-1">Recommended Action</div>
                        <div className="text-sm font-medium">{riskScore.recommended_action}</div>
                      </div>
                    </div>
                  )}

                  {riskScore && (
                    <div className="rounded-lg border border-border p-4">
                      <h3 className="font-semibold mb-3">Risk Breakdown</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {Object.entries(riskScore.breakdown_by_type || {}).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                            <span className="text-muted-foreground">{key}</span>
                            <span className="font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg border border-border p-4">
                    <h3 className="font-semibold mb-3">Recent Events</h3>
                    <div className="space-y-2">
                      {events.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No events available.</div>
                      ) : (
                        events.map((event) => (
                          <div key={event.id} className="flex items-start justify-between gap-4 bg-muted/30 rounded-lg px-3 py-2 text-sm">
                            <div>
                              <div className="font-medium">{event.event_type}</div>
                              <div className="text-xs text-muted-foreground">Severity: {event.severity} · Weight: {event.risk_weight}</div>
                            </div>
                            <div className="text-xs text-muted-foreground text-right">
                              <div>{new Date(event.occurred_at).toLocaleString()}</div>
                              <div>{new Date(event.created_at).toLocaleString()}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
};

export default ReviewQueue;