import { PageWrapper, itemVariant } from "@/components/PageWrapper";
import { ContentBreadcrumb } from "@/components/ContentBreadcrumb";
import { StatCard } from "@/components/StatCard";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, Search, AlertCircle, Loader2, Calendar, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { windowsApi } from "@/services/api/windows";
import { templatesApi } from "@/services/api/templates";
import { rolesApi } from "@/services/api/roles";
import { ProtectedAction } from "@/components/ProtectedAction";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { clientAuditTrail } from "@/services/api/auditLogs";
import { validateWindowRequest, validateOrgScope } from "@/lib/formValidation";
import type { InterviewWindowResponse, InterviewWindowCreateRequest, InterviewWindowUpdateRequest, TemplateResponse, RoleResponse, InterviewScope } from "@/types/admin-api";
import { getOrgContextFromUser } from "@/services/api/adminApiClient";

interface WindowFormData {
  name: string;
  scope: InterviewScope;
  start_time: string;
  end_time: string;
  timezone: string;
  max_allowed_submissions?: number;
  allow_after_end_time: boolean;
  allow_resubmission: boolean;
}

interface WindowMappingRow {
  id: string;
  role_id: number;
  template_id: number;
  selection_weight: number;
}

const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const SCOPE_OPTIONS: Array<{ value: InterviewScope; label: string }> = [
  { value: "global", label: "Global" },
  { value: "local", label: "Local" },
  { value: "only_invited", label: "Only Invited" },
];

const TIMEZONE_OPTIONS = Array.from(new Set([
  DEFAULT_TIMEZONE,
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
]));

const toDateTimeLocal = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toIsoDateTime = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
};

const Scheduling = () => {
  const { user, accessToken } = useAuth();
  // Data state
  const [windows, setWindows] = useState<InterviewWindowResponse[]>([]);
  const [templates, setTemplates] = useState<TemplateResponse[]>([]);
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingMappings, setLoadingMappings] = useState(false);
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
    scope: "global",
    start_time: "",
    end_time: "",
    timezone: DEFAULT_TIMEZONE,
    max_allowed_submissions: undefined,
    allow_after_end_time: false,
    allow_resubmission: false,
  });
  const [mappings, setMappings] = useState<WindowMappingRow[]>([
    { id: "1", role_id: 0, template_id: 0, selection_weight: 1 },
  ]);
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

  // Load roles on mount
  useEffect(() => {
    if (!user || !accessToken) return;

    const loadRoles = async () => {
      try {
        setLoadingRoles(true);
        const orgId = getOrgContextFromUser(user);
        const response = await rolesApi.list(accessToken, orgId, { per_page: 100 });
        setRoles(response.data);
      } catch (err: any) {
        console.error("Error loading roles:", err);
      } finally {
        setLoadingRoles(false);
      }
    };

    loadRoles();
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

  const isWindowOpen = (window: InterviewWindowResponse) => {
    const start = new Date(window.start_time);
    const end = new Date(window.end_time);
    const now = new Date();
    return now >= start && now <= end;
  };

  const getWindowStatus = (window: InterviewWindowResponse) => {
    const start = new Date(window.start_time);
    const end = new Date(window.end_time);
    const now = new Date();
    if (now < start) return "Scheduled";
    if (now > end) return "Closed";
    return "Open";
  };

  // Calculate statistics
  const activeWindowsCount = windows.filter(isWindowOpen).length;
  const resubmissionCount = windows.filter(w => w.allow_resubmission).length;

  // Handle create/edit form submission

  const handleSaveWindow = async () => {
    // Backend schema validation (SRS: FR-2.3, DR-1)
    const validation = validateWindowRequest(
      {
        ...formData,
        mappings: mappings.map((mapping) => ({
          role_id: mapping.role_id,
          template_id: mapping.template_id,
          selection_weight: mapping.selection_weight,
        })),
      },
      { requireMappings: true },
    );
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
        const mappingPayload = mappings.map((mapping) => ({
          role_id: mapping.role_id,
          template_id: mapping.template_id,
          selection_weight: mapping.selection_weight || 1,
        }));
        const updateData: InterviewWindowUpdateRequest = {
          name: formData.name,
          scope: formData.scope,
          start_time: toIsoDateTime(formData.start_time),
          end_time: toIsoDateTime(formData.end_time),
          timezone: formData.timezone,
          max_allowed_submissions: formData.max_allowed_submissions,
          allow_after_end_time: formData.allow_after_end_time,
          allow_resubmission: formData.allow_resubmission,
          mappings: mappingPayload,
        };
        const response = await windowsApi.update(editingId, updateData, accessToken, orgId);
        setWindows(prev => prev.map(w => w.id === editingId ? response.data : w));
        
        // Record update audit event (SRS: NFR-11.2 - immutable audit trail)
        clientAuditTrail.logUpdate(
          orgId,
          'interview_window',
          editingId,
          { name: formData.name, start_time: updateData.start_time, end_time: updateData.end_time },
          response.data as any
        );
      } else {
        // Create new - must record audit trail
        const mappingPayload = mappings.map((mapping) => ({
          role_id: mapping.role_id,
          template_id: mapping.template_id,
          selection_weight: mapping.selection_weight || 1,
        }));
        const createData: InterviewWindowCreateRequest = {
          name: formData.name,
          scope: formData.scope,
          start_time: toIsoDateTime(formData.start_time),
          end_time: toIsoDateTime(formData.end_time),
          timezone: formData.timezone,
          max_allowed_submissions: formData.max_allowed_submissions,
          allow_after_end_time: formData.allow_after_end_time,
          allow_resubmission: formData.allow_resubmission,
          mappings: mappingPayload,
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
  const handleEditWindow = async (w: InterviewWindowResponse) => {
    setFormData({
      name: w.name,
      scope: w.scope,
      start_time: toDateTimeLocal(w.start_time),
      end_time: toDateTimeLocal(w.end_time),
      timezone: w.timezone || DEFAULT_TIMEZONE,
      max_allowed_submissions: w.max_allowed_submissions ?? undefined,
      allow_after_end_time: w.allow_after_end_time,
      allow_resubmission: w.allow_resubmission,
    });
    setEditingId(w.id);
    setShowForm(true);

    if (!accessToken || !user) return;
    try {
      const currentOrgId = getOrgContextFromUser(user);
      const orgId = w.organization_id ?? currentOrgId;

      if (orgId !== currentOrgId) {
        setLoadingRoles(true);
        setLoadingTemplates(true);
        const [rolesResponse, templatesResponse] = await Promise.all([
          rolesApi.list(accessToken, orgId, { per_page: 100 }),
          templatesApi.list(accessToken, orgId, { per_page: 100 }),
        ]);
        setRoles(rolesResponse.data);
        setTemplates(templatesResponse.data);
      }

      setLoadingMappings(true);
      const response = await windowsApi.getMappings(w.id, accessToken, orgId);
      const rows = response.data.length > 0
        ? response.data.map((mapping) => ({
            id: String(mapping.id ?? `${mapping.role_id}-${mapping.template_id}`),
            role_id: mapping.role_id,
            template_id: mapping.template_id,
            selection_weight: mapping.selection_weight ?? 1,
          }))
        : [{ id: "1", role_id: 0, template_id: 0, selection_weight: 1 }];
      setMappings(rows);
    } catch (err: any) {
      setError(err.message || "Failed to load window mappings");
    } finally {
      setLoadingRoles(false);
      setLoadingTemplates(false);
      setLoadingMappings(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      scope: "global",
      start_time: "",
      end_time: "",
      timezone: DEFAULT_TIMEZONE,
      max_allowed_submissions: undefined,
      allow_after_end_time: false,
      allow_resubmission: false,
    });
    setMappings([{ id: "1", role_id: 0, template_id: 0, selection_weight: 1 }]);
    setEditingId(null);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const createMappingRow = (): WindowMappingRow => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role_id: 0,
    template_id: 0,
    selection_weight: 1,
  });

  const handleAddMapping = () => {
    setMappings((prev) => [...prev, createMappingRow()]);
  };

  const handleRemoveMapping = (id: string) => {
    setMappings((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== id) : prev));
  };

  const handleUpdateMapping = (id: string, changes: Partial<WindowMappingRow>) => {
    setMappings((prev) => prev.map((row) => (row.id === id ? { ...row, ...changes } : row)));
  };

  return (
    <PageWrapper title="Interview Scheduling" description="Create windows and map roles to interview templates">
      <ContentBreadcrumb current="Interview Scheduling" />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard title="Active Windows" value={String(activeWindowsCount)} icon={Calendar} />
        <StatCard title="Resubmission Enabled" value={String(resubmissionCount)} icon={Users} iconColor="text-orange" />
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
            disabled={loading || submitting || loadingTemplates || loadingRoles}
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
                  <th className="pb-3 font-medium">Scope</th>
                  <th className="pb-3 font-medium">Time Range</th>
                  <th className="pb-3 font-medium">Timezone</th>
                  <th className="pb-3 font-medium">Max Submissions</th>
                  <th className="pb-3 font-medium">Resubmission</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWindows.map((w) => (
                  <tr key={w.id} className="data-table-row">
                    <td className="py-3 font-medium max-w-xs truncate">{w.name}</td>
                    <td className="py-3 text-muted-foreground text-sm capitalize">{w.scope.replace("_", " ")}</td>
                    <td className="py-3 text-muted-foreground text-sm">
                      {new Date(w.start_time).toLocaleString()} – {new Date(w.end_time).toLocaleString()}
                    </td>
                    <td className="py-3 text-muted-foreground text-sm">{w.timezone}</td>
                    <td className="py-3 text-muted-foreground">
                      {w.max_allowed_submissions ?? "—"}
                    </td>
                    <td className="py-3">
                      <span className={w.allow_resubmission ? "status-badge-success" : "status-badge-secondary"}>
                        {w.allow_resubmission ? "Allowed" : "No"}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={isWindowOpen(w) ? "status-badge-success" : "status-badge-secondary"}>
                        {getWindowStatus(w)}
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
            className="bg-background border border-border rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
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
                <label className="text-sm font-medium">Scope *</label>
                <select
                  value={formData.scope}
                  onChange={(e) => setFormData({ ...formData, scope: e.target.value as InterviewScope })}
                  className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                  disabled={submitting}
                >
                  {SCOPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Start Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm text-text"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">End Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm text-text"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Timezone *</label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                  disabled={submitting}
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Max Allowed Submissions</label>
                <input
                  type="number"
                  value={formData.max_allowed_submissions ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({
                      ...formData,
                      max_allowed_submissions: value ? Number(value) : undefined,
                    });
                  }}
                  className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                  min="1"
                  placeholder="Optional"
                  disabled={submitting}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={formData.allow_after_end_time}
                    onChange={(e) => setFormData({ ...formData, allow_after_end_time: e.target.checked })}
                    className="w-4 h-4 rounded border border-border cursor-pointer"
                    disabled={submitting}
                  />
                  Allow after end time
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={formData.allow_resubmission}
                    onChange={(e) => setFormData({ ...formData, allow_resubmission: e.target.checked })}
                    className="w-4 h-4 rounded border border-border cursor-pointer"
                    disabled={submitting}
                  />
                  Allow resubmission
                </label>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Role to Template Mapping *</label>
                  <button
                    type="button"
                    onClick={handleAddMapping}
                    className="text-xs px-2 py-1 border border-border rounded hover:bg-muted"
                    disabled={submitting || loadingRoles || loadingTemplates || loadingMappings}
                  >
                    Add Role
                  </button>
                </div>
                {loadingMappings ? (
                  <div className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-lg p-3">
                    Loading mappings...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {mappings.map((row) => (
                      <div key={row.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-center">
                        <select
                          value={row.role_id}
                          onChange={(e) => handleUpdateMapping(row.id, { role_id: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                          disabled={submitting || loadingRoles}
                        >
                          <option value={0}>Select role...</option>
                          {roles.map((role) => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                          ))}
                        </select>
                        <select
                          value={row.template_id}
                          onChange={(e) => handleUpdateMapping(row.id, { template_id: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                          disabled={submitting || loadingTemplates}
                        >
                          <option value={0}>Select template...</option>
                          {templates.map((template) => (
                            <option key={template.id} value={template.id}>{template.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveMapping(row.id)}
                          className="px-2 py-2 border border-border rounded-lg text-xs hover:bg-muted disabled:opacity-50"
                          disabled={mappings.length <= 1 || submitting}
                          title="Remove mapping"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
