import { PageWrapper, itemVariant } from "@/components/PageWrapper";
import { ContentBreadcrumb } from "@/components/ContentBreadcrumb";
import { StatCard } from "@/components/StatCard";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, Search, AlertCircle, Loader2, Calendar, Users, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { windowsApi } from "@/services/api/windows";
import { templatesApi } from "@/services/api/templates";
import { useRbac } from "@/hooks/useRbac";
import { ProtectedAction } from "@/components/ProtectedAction";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { clientAuditTrail } from "@/services/api/auditLogs";
import { validateWindowRequest, validateOrgScope } from "@/lib/formValidation";
import type { InterviewWindowResponse, InterviewWindowCreateRequest, InterviewWindowUpdateRequest, TemplateResponse } from "@/types/admin-api";
import { getOrgContextFromUser } from "@/services/api/adminApiClient";

interface WindowFormData {
  name: string;
  description: string;
  template_id: number;
  start_date: string;
  end_date: string;
  max_candidates: number;
  proctoring_enabled: boolean;
}

const Scheduling = () => {
  const { user, accessToken } = useAuth();
  const { can } = useRbac();
  
  // Data state
  const [windows, setWindows] = useState<InterviewWindowResponse[]>([]);
  const [templates, setTemplates] = useState<TemplateResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filters
  const [search, setSearch] = useState("");
  
  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<WindowFormData>({
    name: "",
    description: "",
    template_id: 0,
    start_date: "",
    end_date: "",
    max_candidates: 0,
    proctoring_enabled: true,
  });
  const [submitting, setSubmitting] = useState(false);

  // Load templates on mount
  useEffect(() => {
    if (!user || !accessToken) return;

    const loadTemplates = async () => {
      try {
        setLoadingTemplates(true);
        const orgId = getOrgContextFromUser(user);
        const response = await templatesApi.list(accessToken, orgId, { per_page: 100 });
        setTemplates(response.data);
      } catch (err: any) {
        console.error("Error loading templates:", err);
      } finally {
        setLoadingTemplates(false);
      }
    };

    loadTemplates();
  }, [user, accessToken]);

  // Load windows on mount and when filters change
  useEffect(() => {
    if (!user || !accessToken) return;

    const loadWindows = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const orgId = getOrgContextFromUser(user);
        const response = await windowsApi.list(accessToken, orgId, {
          page,
          per_page: 20,
        });
        
        setWindows(response.data);
        setTotalPages(response.pagination.pages);
      } catch (err: any) {
        setError(err.message || "Failed to load interview windows");
        console.error("Error loading windows:", err);
      } finally {
        setLoading(false);
      }
    };

    loadWindows();
  }, [user, accessToken, page]);

  // Filter windows by search term (client-side)
  const filteredWindows = windows.filter(w => 
    w.name.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate statistics
  const activeWindowsCount = windows.filter(w => w.is_active).length;
  const proctoredCount = windows.filter(w => w.proctoring_enabled).length;

  // Handle create/edit form submission

  const handleSaveWindow = async () => {
    // Backend schema validation (SRS: FR-2.3, DR-1)
    const validation = validateWindowRequest(formData);
    if (!validation.valid) {
      const errorMsg = Object.values(validation.errors).join("; ");
      setError(errorMsg);
      return;
    }

    if (!accessToken || !user) {
      setError("Not authenticated");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const orgId = getOrgContextFromUser(user);

      // Validate tenant scope before submission (SRS: NFR-7.1 - tenant isolation)
      if (!validateOrgScope(orgId, orgId, false)) {
        setError("Permission denied: Invalid organization scope");
        return;
      }

      if (editingId) {
        // Update existing - must record audit trail
        const updateData: InterviewWindowUpdateRequest = {
          name: formData.name,
          description: formData.description,
          template_id: formData.template_id,
          start_date: formData.start_date,
          end_date: formData.end_date,
          max_candidates: formData.max_candidates,
          proctoring_enabled: formData.proctoring_enabled,
        };
        const response = await windowsApi.update(editingId, updateData, accessToken, orgId);
        setWindows(prev => prev.map(w => w.id === editingId ? response.data : w));
        
        // Record update audit event (SRS: NFR-11.2 - immutable audit trail)
        clientAuditTrail.logUpdate(
          orgId,
          'interview_window',
          editingId,
          { name: formData.name, start_date: formData.start_date, end_date: formData.end_date },
          response.data as any
        );
      } else {
        // Create new - must record audit trail
        const createData: InterviewWindowCreateRequest = {
          name: formData.name,
          description: formData.description,
          template_id: formData.template_id,
          start_date: formData.start_date,
          end_date: formData.end_date,
          max_candidates: formData.max_candidates,
          proctoring_enabled: formData.proctoring_enabled,
        };
        const response = await windowsApi.create(createData, accessToken, orgId);
        setWindows(prev => [response.data, ...prev]);
        
        // Record creation audit event (SRS: NFR-11.2)
        clientAuditTrail.logCreate(
          orgId,
          'interview_window',
          response.data.id,
          createData as any
        );
      }
      
      setShowForm(false);
      setEditingId(null);
      resetForm();
    } catch (err: any) {
      setError(err.message || "Failed to save window");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWindow = async (id: number) => {
    if (!confirm("Archive this interview window? This removes it from active scheduling.")) return;

    if (!accessToken || !user) {
      setError("Not authenticated");
      return;
    }

    try {
      setError(null);
      const orgId = getOrgContextFromUser(user);
      
      // Fetch window before deletion to record in audit trail
      const windowToDelete = windows.find(w => w.id === id);
      
      await windowsApi.delete(id, accessToken, orgId);
      setWindows(prev => prev.filter(w => w.id !== id));
      
      // Record deletion audit event (SRS: NFR-11.2)
      if (windowToDelete) {
        clientAuditTrail.logDelete(
          orgId,
          'interview_window',
          id,
          { name: windowToDelete.name } as any
        );
      }
    } catch (err: any) {
      setError(err.message || "Failed to archive window");
    }
  };
  const handleEditWindow = (w: InterviewWindowResponse) => {
    setFormData({
      name: w.name,
      description: w.description || "",
      template_id: w.template_id,
      start_date: w.start_date,
      end_date: w.end_date,
      max_candidates: w.max_candidates,
      proctoring_enabled: w.proctoring_enabled,
    });
    setEditingId(w.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      template_id: templates.length > 0 ? templates[0].id : 0,
      start_date: "",
      end_date: "",
      max_candidates: 0,
      proctoring_enabled: true,
    });
    setEditingId(null);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const getTemplateName = (templateId: number) => {
    return templates.find(t => t.id === templateId)?.name || `Template ${templateId}`;
  };

  return (
    <PageWrapper title="Interview Scheduling" description="Create windows, attach templates, configure proctoring">
      <ContentBreadcrumb current="Interview Scheduling" />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard title="Active Windows" value={String(activeWindowsCount)} icon={Calendar} />
        <StatCard title="Proctored" value={String(proctoredCount)} icon={Eye} iconColor="text-orange" />
        <StatCard title="Total Windows" value={String(windows.length)} icon={Users} iconColor="text-teal" />
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-muted border border-border rounded-lg text-sm"
            placeholder="Search windows..."
            disabled={loading}
          />
        </div>

        <ProtectedAction action="create_window">
          <button
            onClick={openCreateForm}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || submitting || loadingTemplates}
          >
            <Plus className="h-4 w-4" /> Create Window
          </button>
        </ProtectedAction>
      </div>

      {/* Windows Table */}
      <motion.div variants={itemVariant} className="glass-card p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading interview windows...</span>
          </div>
        ) : filteredWindows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {windows.length === 0 ? "No interview windows yet. Create one to get started." : "No windows match your search."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border/50">
                  <th className="pb-3 font-medium">Window Name</th>
                  <th className="pb-3 font-medium">Template</th>
                  <th className="pb-3 font-medium">Date Range</th>
                  <th className="pb-3 font-medium">Max Candidates</th>
                  <th className="pb-3 font-medium">Proctoring</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWindows.map((w) => (
                  <tr key={w.id} className="data-table-row">
                    <td className="py-3 font-medium max-w-xs truncate">{w.name}</td>
                    <td className="py-3 text-muted-foreground text-sm">{getTemplateName(w.template_id)}</td>
                    <td className="py-3 text-muted-foreground text-sm">
                      {new Date(w.start_date).toLocaleDateString()} – {new Date(w.end_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-muted-foreground">{w.max_candidates}</td>
                    <td className="py-3">
                      <span className={w.proctoring_enabled ? "status-badge-success" : "status-badge-secondary"}>
                        {w.proctoring_enabled ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={w.is_active ? "status-badge-success" : "status-badge-secondary"}>
                        {w.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 flex gap-1">
                      <ProtectedAction action="edit_window" hideIfDenied>
                        <button
                          onClick={() => handleEditWindow(w)}
                          className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
                          disabled={submitting}
                          title="Edit window"
                        >
                          <Edit className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </ProtectedAction>

                      <ProtectedAction action="delete_window" hideIfDenied>
                        <button
                          onClick={() => handleDeleteWindow(w.id)}
                          className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
                          disabled={submitting}
                          title="Archive window"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </ProtectedAction>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="px-3 py-1 bg-muted border border-border rounded text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            className="px-3 py-1 bg-muted border border-border rounded text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-background border border-border rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? "Edit Window" : "Create Interview Window"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Window Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                  placeholder="e.g., Frontend Batch 13"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm resize-none"
                  rows={2}
                  placeholder="Window description..."
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Interview Template *</label>
                <select
                  value={formData.template_id}
                  onChange={(e) => setFormData({ ...formData, template_id: parseInt(e.target.value) })}
                  className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                  disabled={submitting || loadingTemplates}
                >
                  <option value={0}>Select a template...</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Start Date *</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm text-text"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">End Date *</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm text-text"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Max Candidates</label>
                <input
                  type="number"
                  value={formData.max_candidates}
                  onChange={(e) => setFormData({ ...formData, max_candidates: parseInt(e.target.value) || 0 })}
                  className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                  min="0"
                  disabled={submitting}
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="text-sm font-medium">Proctoring</label>
                <input
                  type="checkbox"
                  checked={formData.proctoring_enabled}
                  onChange={(e) => setFormData({ ...formData, proctoring_enabled: e.target.checked })}
                  className="w-4 h-4 rounded border border-border cursor-pointer"
                  disabled={submitting}
                />
                <span className="text-xs text-muted-foreground">{formData.proctoring_enabled ? "Enabled" : "Disabled"}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors disabled:opacity-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWindow}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Update" : "Create"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </PageWrapper>
  );
};

export default Scheduling;
