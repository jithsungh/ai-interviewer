import { PageWrapper, itemVariant } from "@/components/PageWrapper";
import { ContentBreadcrumb } from "@/components/ContentBreadcrumb";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, AlertCircle, Loader2, Trash } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { rubricsApi } from "@/services/api/rubrics";
import { useRbac } from "@/hooks/useRbac";
import { ProtectedAction } from "@/components/ProtectedAction";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { RubricResponse, RubricCreateRequest, RubricUpdateRequest, RubricDimension } from "@/types/admin-api";
import { getOrgContextFromUser } from "@/services/api/adminApiClient";

interface RubricFormData {
  name: string;
  description: string;
  max_score: number;
  dimensions: RubricDimension[];
}

const Rubrics = () => {
  const { user, accessToken } = useAuth();
  const { can } = useRbac();
  
  // Data state
  const [rubrics, setRubrics] = useState<RubricResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<RubricFormData>({
    name: "",
    description: "",
    max_score: 100,
    dimensions: [
      { name: "Dimension 1", weight: 33, max_points: 33 },
      { name: "Dimension 2", weight: 34, max_points: 34 },
      { name: "Dimension 3", weight: 33, max_points: 33 },
    ],
  });
  const [submitting, setSubmitting] = useState(false);

  // Load rubrics on mount
  useEffect(() => {
    if (!user || !accessToken) return;

    const loadRubrics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const orgId = getOrgContextFromUser(user);
        const response = await rubricsApi.list(accessToken, orgId, {
          page,
          per_page: 20,
        });
        
        setRubrics(response.data);
        setTotalPages(response.pagination.pages);
      } catch (err: any) {
        setError(err.message || "Failed to load rubrics");
        console.error("Error loading rubrics:", err);
      } finally {
        setLoading(false);
      }
    };

    loadRubrics();
  }, [user, accessToken, page]);

  // Handle create/edit form submission
  const handleSaveRubric = async () => {
    if (!formData.name.trim()) {
      setError("Rubric name is required");
      return;
    }

    if (formData.dimensions.length === 0) {
      setError("At least one dimension is required");
      return;
    }

    if (!accessToken) {
      setError("Not authenticated");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const orgId = getOrgContextFromUser(user);

      if (editingId) {
        // Update existing
        const updateData: RubricUpdateRequest = {
          name: formData.name,
          description: formData.description,
          max_score: formData.max_score,
          dimensions: formData.dimensions,
        };
        const response = await rubricsApi.update(editingId, updateData, accessToken, orgId);
        setRubrics(prev => prev.map(r => r.id === editingId ? response.data : r));
      } else {
        // Create new
        const createData: RubricCreateRequest = {
          name: formData.name,
          description: formData.description,
          max_score: formData.max_score,
          dimensions: formData.dimensions,
        };
        const response = await rubricsApi.create(createData, accessToken, orgId);
        setRubrics(prev => [response.data, ...prev]);
      }
      
      setShowForm(false);
      setEditingId(null);
      resetForm();
    } catch (err: any) {
      setError(err.message || "Failed to save rubric");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRubric = async (id: number) => {
    if (!confirm("Delete this rubric? This action cannot be undone.")) return;

    if (!accessToken) {
      setError("Not authenticated");
      return;
    }

    try {
      setError(null);
      const orgId = getOrgContextFromUser(user);
      await rubricsApi.delete(id, accessToken, orgId);
      setRubrics(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete rubric");
    }
  };

  const handleEditRubric = (r: RubricResponse) => {
    setFormData({
      name: r.name,
      description: r.description || "",
      max_score: r.max_score,
      dimensions: r.dimensions || [],
    });
    setEditingId(r.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      max_score: 100,
      dimensions: [
        { name: "Dimension 1", weight: 33, max_points: 33 },
        { name: "Dimension 2", weight: 34, max_points: 34 },
        { name: "Dimension 3", weight: 33, max_points: 33 },
      ],
    });
    setEditingId(null);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const addDimension = () => {
    setFormData({
      ...formData,
      dimensions: [...formData.dimensions, { name: "", weight: 0, max_points: 0 }],
    });
  };

  const removeDimension = (index: number) => {
    setFormData({
      ...formData,
      dimensions: formData.dimensions.filter((_, i) => i !== index),
    });
  };

  const updateDimension = (index: number, field: keyof RubricDimension, value: any) => {
    const updated = [...formData.dimensions];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, dimensions: updated });
  };

  return (
    <PageWrapper title="Evaluation Rubrics" description="Define scoring dimensions, weights, and activation">
      <ContentBreadcrumb current="Evaluation Rubrics" />

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 mb-6">
        <ProtectedAction action="create_rubric">
          <button
            onClick={openCreateForm}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || submitting}
          >
            <Plus className="h-4 w-4" /> Create Rubric
          </button>
        </ProtectedAction>
      </div>

      {/* Rubrics Table */}
      <motion.div variants={itemVariant} className="glass-card p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading rubrics...</span>
          </div>
        ) : rubrics.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No rubrics yet. Create one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border/50">
                  <th className="pb-3 font-medium">Rubric Name</th>
                  <th className="pb-3 font-medium">Dimensions</th>
                  <th className="pb-3 font-medium">Max Score</th>
                  <th className="pb-3 font-medium">Used In</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rubrics.map((r) => (
                  <tr key={r.id} className="data-table-row">
                    <td className="py-3 font-medium max-w-xs">{r.name}</td>
                    <td className="py-3 text-muted-foreground">
                      {r.dimensions.length} {r.dimensions.length === 1 ? "dimension" : "dimensions"}
                    </td>
                    <td className="py-3">{r.max_score}</td>
                    <td className="py-3 text-muted-foreground">{r.usage_count || 0} templates</td>
                    <td className="py-3">
                      <span className={r.is_active ? "status-badge-success" : "status-badge-secondary"}>
                        {r.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 flex gap-1">
                      <ProtectedAction action="edit_rubric" hideIfDenied>
                        <button
                          onClick={() => handleEditRubric(r)}
                          className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
                          disabled={submitting}
                          title="Edit rubric"
                        >
                          <Edit className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </ProtectedAction>

                      <ProtectedAction action="delete_rubric" hideIfDenied>
                        <button
                          onClick={() => handleDeleteRubric(r.id)}
                          className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
                          disabled={submitting}
                          title="Delete rubric"
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
              {editingId ? "Edit Rubric" : "Create Rubric"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Rubric Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                  placeholder="e.g., Technical Proficiency"
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
                  placeholder="Rubric description..."
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Max Score *</label>
                <input
                  type="number"
                  value={formData.max_score}
                  onChange={(e) => setFormData({ ...formData, max_score: parseInt(e.target.value) || 100 })}
                  className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                  min="1"
                  disabled={submitting}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Dimensions *</label>
                  <button
                    onClick={addDimension}
                    className="text-xs px-2 py-1 bg-muted border border-border rounded hover:bg-muted/80 transition-colors disabled:opacity-50"
                    disabled={submitting}
                  >
                    + Add Dimension
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {formData.dimensions.map((dim, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={dim.name}
                        onChange={(e) => updateDimension(idx, 'name', e.target.value)}
                        className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                        placeholder="Dimension name"
                        disabled={submitting}
                      />
                      <input
                        type="number"
                        value={dim.weight}
                        onChange={(e) => updateDimension(idx, 'weight', parseFloat(e.target.value) || 0)}
                        className="w-20 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                        placeholder="Weight %"
                        min="0"
                        max="100"
                        disabled={submitting}
                      />
                      <input
                        type="number"
                        value={dim.max_points}
                        onChange={(e) => updateDimension(idx, 'max_points', parseInt(e.target.value) || 0)}
                        className="w-24 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                        placeholder="Points"
                        min="0"
                        disabled={submitting}
                      />
                      <button
                        onClick={() => removeDimension(idx)}
                        className="p-2 rounded hover:bg-destructive/10 transition-colors disabled:opacity-50"
                        disabled={submitting || formData.dimensions.length === 1}
                        title="Remove dimension"
                      >
                        <Trash className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
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
                onClick={handleSaveRubric}
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

export default Rubrics;
