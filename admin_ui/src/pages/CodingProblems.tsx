import { PageWrapper, itemVariant } from "@/components/PageWrapper";
import { ContentBreadcrumb } from "@/components/ContentBreadcrumb";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, Search, AlertCircle, Loader2, Code } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { codingProblemsApi } from "@/services/api/codingProblems";
import { useRbac } from "@/hooks/useRbac";
import { ProtectedAction } from "@/components/ProtectedAction";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { CodingProblemResponse, CodingProblemCreateRequest, CodingProblemUpdateRequest, CodingProblemDifficulty, ProgrammingLanguage } from "@/types/admin-api";
import { getOrgContextFromUser } from "@/services/api/adminApiClient";

const getDifficultyBadgeClass = (difficulty: CodingProblemDifficulty | string) => {
  if (difficulty === "easy") return "status-badge-success";
  if (difficulty === "medium") return "status-badge-warning";
  if (difficulty === "hard") return "status-badge-danger";
  if (difficulty === "expert") return "status-badge-destructive";
  return "status-badge-neutral";
};

interface ProblemFormData {
  title: string;
  description: string;
  difficulty: CodingProblemDifficulty;
  supported_languages: ProgrammingLanguage[];
  time_limit_seconds: number;
  memory_limit_mb: number;
}

const CodingProblems = () => {
  const { user, accessToken } = useAuth();
  const { can } = useRbac();
  
  // Data state
  const [problems, setProblems] = useState<CodingProblemResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filters
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<"" | CodingProblemDifficulty>("");
  
  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ProblemFormData>({
    title: "",
    description: "",
    difficulty: "medium",
    supported_languages: ["python", "javascript"],
    time_limit_seconds: 5,
    memory_limit_mb: 256,
  });
  const [submitting, setSubmitting] = useState(false);

  // Load problems on mount and when filters change
  useEffect(() => {
    if (!user || !accessToken) return;

    const loadProblems = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const orgId = getOrgContextFromUser(user);
        const response = await codingProblemsApi.list(accessToken, orgId, {
          page,
          per_page: 20,
          difficulty: difficultyFilter || undefined,
        });
        
        setProblems(response.data);
        setTotalPages(response.pagination.pages);
      } catch (err: any) {
        setError(err.message || "Failed to load coding problems");
        console.error("Error loading problems:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProblems();
  }, [user, accessToken, page, difficultyFilter]);

  // Filter problems by search term (client-side)
  const filteredProblems = problems.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  // Handle create/edit form submission
  const handleSaveProblem = async () => {
    if (!formData.title.trim()) {
      setError("Problem title is required");
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
        const updateData: CodingProblemUpdateRequest = {
          title: formData.title,
          description: formData.description,
          difficulty: formData.difficulty,
          supported_languages: formData.supported_languages,
          time_limit_seconds: formData.time_limit_seconds,
          memory_limit_mb: formData.memory_limit_mb,
        };
        const response = await codingProblemsApi.update(editingId, updateData, accessToken, orgId);
        setProblems(prev => prev.map(p => p.id === editingId ? response.data : p));
      } else {
        // Create new
        const createData: CodingProblemCreateRequest = {
          title: formData.title,
          description: formData.description,
          difficulty: formData.difficulty,
          supported_languages: formData.supported_languages,
          time_limit_seconds: formData.time_limit_seconds,
          memory_limit_mb: formData.memory_limit_mb,
        };
        const response = await codingProblemsApi.create(createData, accessToken, orgId);
        setProblems(prev => [response.data, ...prev]);
      }
      
      setShowForm(false);
      setEditingId(null);
      resetForm();
    } catch (err: any) {
      setError(err.message || "Failed to save problem");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProblem = async (id: number) => {
    if (!confirm("Delete this problem? This action cannot be undone.")) return;

    if (!accessToken) {
      setError("Not authenticated");
      return;
    }

    try {
      setError(null);
      const orgId = getOrgContextFromUser(user);
      await codingProblemsApi.delete(id, accessToken, orgId);
      setProblems(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete problem");
    }
  };

  const handleEditProblem = (p: CodingProblemResponse) => {
    setFormData({
      title: p.title,
      description: p.description || "",
      difficulty: p.difficulty as CodingProblemDifficulty,
      supported_languages: p.supported_languages,
      time_limit_seconds: p.time_limit_seconds || 5,
      memory_limit_mb: p.memory_limit_mb || 256,
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      difficulty: "medium",
      supported_languages: ["python", "javascript"],
      time_limit_seconds: 5,
      memory_limit_mb: 256,
    });
    setEditingId(null);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const languageOptions: ProgrammingLanguage[] = ["python", "javascript", "typescript", "java", "cpp", "go", "rust"];

  return (
    <PageWrapper title="Coding Problems" description="Manage coding challenges, test cases, and difficulty levels">
      <ContentBreadcrumb current="Coding Problems" />

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
            placeholder="Search problems..."
            disabled={loading}
          />
        </div>

        <select
          value={difficultyFilter}
          onChange={(e) => { setDifficultyFilter(e.target.value as CodingProblemDifficulty | ""); setPage(1); }}
          className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground"
          disabled={loading}
        >
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
          <option value="expert">Expert</option>
        </select>

        <ProtectedAction action="create_problem">
          <button
            onClick={openCreateForm}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || submitting}
          >
            <Plus className="h-4 w-4" /> Add Problem
          </button>
        </ProtectedAction>
      </div>

      {/* Problems Table */}
      <motion.div variants={itemVariant} className="glass-card p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading problems...</span>
          </div>
        ) : filteredProblems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {problems.length === 0 ? "No coding problems yet. Create one to get started." : "No problems match your filters."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border/50">
                  <th className="pb-3 font-medium">Problem</th>
                  <th className="pb-3 font-medium">Difficulty</th>
                  <th className="pb-3 font-medium">Languages</th>
                  <th className="pb-3 font-medium">Time Limit</th>
                  <th className="pb-3 font-medium">Memory Limit</th>
                  <th className="pb-3 font-medium">Submissions</th>
                  <th className="pb-3 font-medium">Pass Rate</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProblems.map((p) => (
                  <tr key={p.id} className="data-table-row">
                    <td className="py-3 font-medium flex items-center gap-2 max-w-xs truncate">
                      <Code className="h-4 w-4 text-info flex-shrink-0" />
                      {p.title}
                    </td>
                    <td className="py-3">
                      <span className={getDifficultyBadgeClass(p.difficulty)}>
                        {p.difficulty.charAt(0).toUpperCase() + p.difficulty.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground text-xs">
                      {p.supported_languages.slice(0, 2).join(", ")}
                      {p.supported_languages.length > 2 && ` +${p.supported_languages.length - 2}`}
                    </td>
                    <td className="py-3 text-muted-foreground">{p.time_limit_seconds}s</td>
                    <td className="py-3 text-muted-foreground">{p.memory_limit_mb}MB</td>
                    <td className="py-3 text-muted-foreground">{p.submission_count || 0}</td>
                    <td className="py-3 text-muted-foreground">
                      {p.pass_rate ? `${(p.pass_rate * 100).toFixed(0)}%` : "—"}
                    </td>
                    <td className="py-3">
                      <span className={p.is_active ? "status-badge-success" : "status-badge-secondary"}>
                        {p.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 flex gap-1">
                      <ProtectedAction action="edit_problem" hideIfDenied>
                        <button
                          onClick={() => handleEditProblem(p)}
                          className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
                          disabled={submitting}
                          title="Edit problem"
                        >
                          <Edit className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </ProtectedAction>

                      <ProtectedAction action="delete_problem" hideIfDenied>
                        <button
                          onClick={() => handleDeleteProblem(p.id)}
                          className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
                          disabled={submitting}
                          title="Delete problem"
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
              {editingId ? "Edit Problem" : "Create Problem"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Problem Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                  placeholder="e.g., Two Sum"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm resize-none"
                  rows={3}
                  placeholder="Problem description..."
                  disabled={submitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Difficulty</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as CodingProblemDifficulty })}
                    className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                    disabled={submitting}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Time Limit (s)</label>
                  <input
                    type="number"
                    value={formData.time_limit_seconds}
                    onChange={(e) => setFormData({ ...formData, time_limit_seconds: parseInt(e.target.value) || 5 })}
                    className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                    min="1"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Memory Limit (MB)</label>
                  <input
                    type="number"
                    value={formData.memory_limit_mb}
                    onChange={(e) => setFormData({ ...formData, memory_limit_mb: parseInt(e.target.value) || 256 })}
                    className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                    min="1"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Supported Languages</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {languageOptions.map((lang) => (
                    <label key={lang} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.supported_languages.includes(lang)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, supported_languages: [...formData.supported_languages, lang] });
                          } else {
                            setFormData({ ...formData, supported_languages: formData.supported_languages.filter(l => l !== lang) });
                          }
                        }}
                        disabled={submitting}
                      />
                      <span className="capitalize">{lang}</span>
                    </label>
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
                onClick={handleSaveProblem}
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

export default CodingProblems;
