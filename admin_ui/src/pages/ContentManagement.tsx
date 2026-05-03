import { PageWrapper, itemVariant } from "@/components/PageWrapper";
import { motion } from "framer-motion";
import { HelpCircle, Code, FileText, List, Plus, Edit, Tag, Archive, Search, Loader2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getOrgContextFromUser } from "@/services/api/adminApiClient";
import { codingProblemsApi, questionsApi, rubricsApi, templatesApi } from "@/services/api";
import type { QuestionResponse } from "@/types/admin-api";
import { Alert, AlertDescription } from "@/components/ui/alert";

const normalizeQuestion = (question: Partial<QuestionResponse> & Record<string, any>) => ({
  id: Number(question.id),
  text: String(question.text ?? question.question_text ?? question.prompt ?? ""),
  domain: String(question.domain ?? question.topic ?? "—"),
  difficulty: String(question.difficulty ?? "medium"),
  tags: Array.isArray(question.tags) ? question.tags : [],
});

const difficultyBadge = (difficulty: string) => {
  const normalized = difficulty.toLowerCase();
  if (normalized === "easy") return "status-badge-success";
  if (normalized === "medium") return "status-badge-warning";
  if (normalized === "hard") return "status-badge-danger";
  return "status-badge-neutral";
};

const ContentManagement = () => {
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState({
    questions: 0,
    coding: 0,
    templates: 0,
    rubrics: 0,
  });
  const [recentQuestions, setRecentQuestions] = useState<Array<ReturnType<typeof normalizeQuestion>>>([]);

  useEffect(() => {
    if (!user || !accessToken) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const orgId = getOrgContextFromUser(user);

        const [questionsRes, codingRes, templatesRes, rubricsRes] = await Promise.all([
          questionsApi.list(accessToken, orgId, { page: 1, per_page: 10 }),
          codingProblemsApi.list(accessToken, orgId, { page: 1, per_page: 1 }),
          templatesApi.list(accessToken, orgId, { page: 1, per_page: 1 }),
          rubricsApi.list(accessToken, orgId, { page: 1, per_page: 1 }),
        ]);

        setCounts({
          questions: Number(questionsRes.pagination?.total ?? questionsRes.data?.length ?? 0),
          coding: Number(codingRes.pagination?.total ?? codingRes.data?.length ?? 0),
          templates: Number(templatesRes.pagination?.total ?? templatesRes.data?.length ?? 0),
          rubrics: Number(rubricsRes.pagination?.total ?? rubricsRes.data?.length ?? 0),
        });
        setRecentQuestions((questionsRes.data || []).map(normalizeQuestion));
      } catch (err: any) {
        setError(err.message || "Failed to load content data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, accessToken]);

  const sections = [
    { title: "Question Bank", description: "Manage interview questions across domains", icon: HelpCircle, count: counts.questions, route: "/content/questions", color: "text-teal" },
    { title: "Coding Problems", description: "Technical coding challenges with test cases", icon: Code, count: counts.coding, route: "/content/coding", color: "text-info" },
    { title: "Interview Templates", description: "Reusable interview flow templates", icon: FileText, count: counts.templates, route: "/content/templates", color: "text-primary" },
    { title: "Evaluation Rubrics", description: "Scoring criteria and dimensions", icon: List, count: counts.rubrics, route: "/content/rubrics", color: "text-orange" },
  ];

  const filteredQuestions = useMemo(() => {
    return recentQuestions.filter((question) =>
      question.text.toLowerCase().includes(search.toLowerCase()) ||
      question.domain.toLowerCase().includes(search.toLowerCase()),
    );
  }, [recentQuestions, search]);

  return (
    <PageWrapper title="Content Management" description="Manage questions, problems, templates, and rubrics">
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {sections.map((s) => (
          <motion.div
            key={s.title}
            variants={itemVariant}
            onClick={() => navigate(s.route)}
            className="stat-card cursor-pointer group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{s.title}</p>
                <p className="text-3xl font-bold mt-2">{loading ? "..." : s.count}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
              </div>
              <div className={`p-3 rounded-xl bg-muted/50 ${s.color} group-hover:scale-110 transition-transform`}>
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div variants={itemVariant} className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Questions</h2>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                className="pl-9 pr-3 py-2 bg-muted border border-border rounded-lg text-sm w-64"
                placeholder="Search questions..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <button onClick={() => navigate("/content/questions")} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" /> Add Question
            </button>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading content...
          </div>
        ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border/50">
              <th className="pb-3 font-medium">Question</th>
              <th className="pb-3 font-medium">Domain</th>
              <th className="pb-3 font-medium">Difficulty</th>
              <th className="pb-3 font-medium">Tags</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuestions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground">No questions found.</td>
              </tr>
            ) : filteredQuestions.map((q) => (
              <tr key={q.id} className="data-table-row">
                <td className="py-3 font-medium max-w-sm truncate">{q.text}</td>
                <td className="py-3 text-muted-foreground">{q.domain}</td>
                <td className="py-3"><span className={difficultyBadge(q.difficulty)}>{q.difficulty}</span></td>
                <td className="py-3">
                  <div className="flex gap-1">{q.tags.slice(0, 3).map((t) => <span key={t} className="status-badge-neutral">{t}</span>)}</div>
                </td>
                <td className="py-3 flex gap-1">
                  <button className="p-1.5 rounded hover:bg-muted transition-colors"><Edit className="h-4 w-4 text-muted-foreground" /></button>
                  <button className="p-1.5 rounded hover:bg-muted transition-colors"><Tag className="h-4 w-4 text-muted-foreground" /></button>
                  <button className="p-1.5 rounded hover:bg-muted transition-colors"><Archive className="h-4 w-4 text-muted-foreground" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </motion.div>
    </PageWrapper>
  );
};

export default ContentManagement;
