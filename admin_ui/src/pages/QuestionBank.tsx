import { PageWrapper, itemVariant } from "@/components/PageWrapper";
import { ContentBreadcrumb } from "@/components/ContentBreadcrumb";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, Search, AlertCircle, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { questionsApi } from "@/services/api/questions";
import { useRbac } from "@/hooks/useRbac";
import { ProtectedAction } from "@/components/ProtectedAction";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { QuestionResponse, QuestionCreateRequest, QuestionUpdateRequest, DifficultyLevel, QuestionType } from "@/types/admin-api";
import { getOrgContextFromUser } from "@/services/api/adminApiClient";

const getDifficultyBadgeClass = (difficulty: DifficultyLevel | string) => {
  if (difficulty === "easy") return "status-badge-success";
  if (difficulty === "medium") return "status-badge-warning";
  if (difficulty === "hard") return "status-badge-danger";
  return "status-badge-neutral";
};

const normalizeQuestion = (question: Partial<QuestionResponse> & Record<string, any>): QuestionResponse => ({
  id: Number(question.id),
  text: String(question.text ?? question.question ?? question.prompt ?? ""),
  question_type: (question.question_type ?? question.type ?? "technical") as QuestionType,
  domain: question.domain ?? question.topic ?? "",
  difficulty: (question.difficulty ?? question.difficulty_level ?? "medium") as DifficultyLevel,
  tags: Array.isArray(question.tags) ? question.tags : [],
  rubric_id: question.rubric_id,
  is_active: Boolean(question.is_active ?? question.status === "Active" ?? true),
  use_count: Number(question.use_count ?? question.usedCount ?? 0),
  created_at: question.created_at,
  updated_at: question.updated_at,
});

interface QuestionFormData {
  text: string;
  question_type: QuestionType;
  domain: string;
  difficulty: DifficultyLevel;
  tags: string[];
}

const QuestionBank = () => {
  const { user, accessToken } = useAuth();
  const { can } = useRbac();
  
  // Data state
  const [questions, setQuestions] = useState<QuestionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filters
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<"" | DifficultyLevel>("");
  const [typeFilter, setTypeFilter] = useState<QuestionType | "">("");
  
  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<QuestionFormData>({
    text: "",
    question_type: "technical",
    domain: "",
    difficulty: "medium",
    tags: [],
  });
  const [submitting, setSubmitting] = useState(false);

  // Load questions on mount and when filters change
  useEffect(() => {
    if (!user || !accessToken) return;

    const loadQuestions = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const orgId = getOrgContextFromUser(user);
        const response = await questionsApi.list(accessToken, orgId, {
          page,
          per_page: 20,
          difficulty: difficultyFilter || undefined,
          question_type: typeFilter || undefined,
        });
        
        setQuestions((response.data || []).map(normalizeQuestion));
        setTotalPages(response.pagination.pages);
      } catch (err: any) {
        setError(err.message || "Failed to load questions");
        console.error("Error loading questions:", err);
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, [user, accessToken, page, difficultyFilter, typeFilter]);

  // Filter questions by search term (client-side)
  const filteredQuestions = questions.filter(q => 
    (q.text || "").toLowerCase().includes(search.toLowerCase()) ||
    (q.domain || "").toLowerCase().includes(search.toLowerCase())
  );

  // Handle create/edit form submission
  const handleSaveQuestion = async () => {
    if (!formData.text.trim()) {
      setError("Question text is required");
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
        const updateData: QuestionUpdateRequest = {
          text: formData.text,
          question_type: formData.question_type,
          domain: formData.domain,
          difficulty: formData.difficulty,
          tags: formData.tags,
        };
        const response = await questionsApi.update(editingId, updateData, accessToken, orgId);
        setQuestions(prev => prev.map(q => q.id === editingId ? response.data : q));
      } else {
        // Create new
        const createData: QuestionCreateRequest = {
          text: formData.text,
          question_type: formData.question_type,
          domain: formData.domain,
          difficulty: formData.difficulty,
          tags: formData.tags,
        };
        const response = await questionsApi.create(createData, accessToken, orgId);
        setQuestions(prev => [response.data, ...prev]);
      }
      
      setShowForm(false);
      setEditingId(null);
      resetForm();
    } catch (err: any) {
      setError(err.message || "Failed to save question");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!confirm("Delete this question? This action cannot be undone.")) return;

    if (!accessToken) {
      setError("Not authenticated");
      return;
    }

    try {
      setError(null);
      const orgId = getOrgContextFromUser(user);
      await questionsApi.delete(id, accessToken, orgId);
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete question");
    }
  };

  const handleEditQuestion = (q: QuestionResponse) => {
    setFormData({
      text: q.text,
      question_type: q.question_type,
      domain: q.domain || "",
      difficulty: q.difficulty,
      tags: q.tags || [],
    });
    setEditingId(q.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      text: "",
      question_type: "technical",
      domain: "",
      difficulty: "medium",
      tags: [],
    });
    setEditingId(null);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  return (
    <PageWrapper title="Question Bank" description="Add, edit, and manage interview questions">
      <ContentBreadcrumb current="Question Bank" />

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
            placeholder="Search questions..."
            disabled={loading}
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value as QuestionType | ""); setPage(1); }}
          className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground"
          disabled={loading}
        >
          <option value="">All Types</option>
          <option value="technical">Technical</option>
          <option value="behavioral">Behavioral</option>
          <option value="situational">Situational</option>
          <option value="coding">Coding</option>
        </select>

        <select
          value={difficultyFilter}
          onChange={(e) => { setDifficultyFilter(e.target.value as DifficultyLevel | ""); setPage(1); }}
          className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground"
          disabled={loading}
        >
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <ProtectedAction action="create_question">
          <button
            onClick={openCreateForm}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || submitting}
          >
            <Plus className="h-4 w-4" /> Add Question
          </button>
        </ProtectedAction>
      </div>

      {/* Questions Table */}
      <motion.div variants={itemVariant} className="glass-card p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading questions...</span>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {questions.length === 0 ? "No questions yet. Create one to get started." : "No questions match your filters."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border/50">
                  <th className="pb-3 font-medium">Question</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Domain</th>
                  <th className="pb-3 font-medium">Difficulty</th>
                  <th className="pb-3 font-medium">Tags</th>
                  <th className="pb-3 font-medium">Used</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuestions.map((q) => (
                  <tr key={q.id} className="data-table-row">
                    <td className="py-3 font-medium max-w-xs truncate">{q.text}</td>
                    <td className="py-3 text-muted-foreground text-xs capitalize">{q.question_type}</td>
                    <td className="py-3 text-muted-foreground">{q.domain || "-"}</td>
                    <td className="py-3">
                      <span className={getDifficultyBadgeClass(q.difficulty)}>
                        {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1 flex-wrap max-w-xs">
                        {(q.tags || []).slice(0, 2).map((t) => (
                          <span key={t} className="status-badge-neutral text-xs">{t}</span>
                        ))}
                        {(q.tags && q.tags.length > 2) && (
                          <span className="text-xs text-muted-foreground">+{q.tags.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-muted-foreground">{q.use_count || 0}×</td>
                    <td className="py-3">
                      <span className={q.is_active ? "status-badge-success" : "status-badge-secondary"}>
                        {q.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 flex gap-1">
                      <ProtectedAction action="edit_question" hideIfDenied>
                        <button
                          onClick={() => handleEditQuestion(q)}
                          className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
                          disabled={submitting}
                          title="Edit question"
                        >
                          <Edit className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </ProtectedAction>

                      <ProtectedAction action="delete_question" hideIfDenied>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
                          disabled={submitting}
                          title="Delete question"
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
            className="bg-background border border-border rounded-lg p-6 max-w-md w-full"
          >
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? "Edit Question" : "Create Question"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Question Text *</label>
                <textarea
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm resize-none"
                  rows={3}
                  placeholder="Enter question..."
                  disabled={submitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <select
                    value={formData.question_type}
                    onChange={(e) => setFormData({ ...formData, question_type: e.target.value as QuestionType })}
                    className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                    disabled={submitting}
                  >
                    <option value="technical">Technical</option>
                    <option value="behavioral">Behavioral</option>
                    <option value="situational">Situational</option>
                    <option value="coding">Coding</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Difficulty</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as DifficultyLevel })}
                    className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                    disabled={submitting}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Domain</label>
                <input
                  type="text"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                  placeholder="e.g., System Design"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formData.tags.join(", ")}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })}
                  className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                  placeholder="e.g., API, Architecture"
                  disabled={submitting}
                />
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
                onClick={handleSaveQuestion}
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

export default QuestionBank;
