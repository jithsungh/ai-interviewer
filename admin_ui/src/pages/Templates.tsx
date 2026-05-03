import { PageWrapper, itemVariant } from "@/components/PageWrapper";
import { ContentBreadcrumb } from "@/components/ContentBreadcrumb";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Brain,
  ChevronDown,
  ChevronUp,
  Code,
  Copy,
  Edit,
  Eye,
  FileText,
  Loader2,
  Lock,
  MessageSquare,
  Mic,
  Plus,
  Search,
  Settings2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ElementType } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { templatesApi } from "@/services/api/templates";
import { getOrgContextFromUser } from "@/services/api/adminApiClient";
import { ProtectedAction } from "@/components/ProtectedAction";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRbac } from "@/hooks/useRbac";
import { clientAuditTrail } from "@/services/api/auditLogs";
import { validateTemplateRequest } from "@/lib/formValidation";
import type { TemplateCreateRequest, TemplateResponse, TemplateScope, TemplateUpdateRequest } from "@/types/admin-api";

interface TemplateSectionConfig {
  name: string;
  icon: ElementType;
  enabled: boolean;
  weight: number;
  description: string;
  details: Record<string, string | number | boolean | string[]>;
}

interface InterviewTemplate {
  id: number;
  name: string;
  version: string;
  status: "Published" | "Draft";
  inUse: boolean;
  targetLevel: string;
  estimatedDuration: number;
  totalQuestions: number;
  lastModified: string;
  passThreshold: number;
  proctoringEnabled: boolean;
  sections: TemplateSectionConfig[];
}

const defaultSections: TemplateSectionConfig[] = [
  {
    name: "Resume Analysis",
    icon: FileText,
    enabled: true,
    weight: 10,
    description: "ATS scoring and job description matching",
    details: {
      "Parse Resume": "true",
      Extract: "education, skills, experience, projects",
      "Skills Match Weight": 40,
      "Education Weight": 25,
      "Experience Weight": 20,
      "Resume Quality Weight": 15,
      "Min Match Score": 50,
    },
  },
  {
    name: "Self Introduction",
    icon: Mic,
    enabled: true,
    weight: 5,
    description: "Audio-analyzed self introduction",
    details: {
      "Max Duration": "120s",
      Mode: "Audio",
      "Track Metrics": "speech_rate, filler_words, confidence",
    },
  },
  {
    name: "Topics Assessment",
    icon: Brain,
    enabled: true,
    weight: 25,
    description: "Domain knowledge questions with adaptive difficulty",
    details: {
      "Total Questions": 5,
      Strategy: "Dynamic + Fixed",
      Topics: "DSA, OOP, OS, Networking",
      Difficulties: "Easy, Medium",
    },
  },
  {
    name: "Coding Round",
    icon: Code,
    enabled: true,
    weight: 30,
    description: "Hands-on coding with execution",
    details: {
      Problems: 2,
      "Max Duration": "20 min",
      Languages: "Python3, Java, C++",
      "Time Limit": "2000ms",
      "Memory Limit": "256MB",
      "Correctness Weight": 80,
      "Code Quality Weight": 20,
      "Min Pass": "50%",
    },
  },
  {
    name: "Complexity Analysis",
    icon: Settings2,
    enabled: true,
    weight: 10,
    description: "Time and space complexity evaluation",
    details: {
      Questions: 1,
      "Max Duration": "4 min",
      Expectations: "time_complexity, space_complexity",
    },
  },
  {
    name: "Behavioral",
    icon: MessageSquare,
    enabled: true,
    weight: 10,
    description: "Soft skills and cultural fit assessment",
    details: {
      Questions: 1,
      "Max Duration": "5 min",
      Topics: "teamwork, learning_ability, problem_solving",
    },
  },
];

const sectionIconMap: Record<string, ElementType> = {
  "Resume Analysis": FileText,
  "Self Introduction": Mic,
  "Topics Assessment": Brain,
  "Coding Round": Code,
  "Complexity Analysis": Settings2,
  Behavioral: MessageSquare,
};

const normalizeSection = (section: Partial<TemplateSectionConfig>): TemplateSectionConfig => ({
  name: section.name || "Untitled Section",
  icon: sectionIconMap[section.name || ""] || FileText,
  enabled: section.enabled ?? true,
  weight: Number(section.weight ?? 0),
  description: section.description || "",
  details: section.details || {},
});

const normalizeTemplate = (template: TemplateResponse): InterviewTemplate => {
  const rules = (template.rules || {}) as Record<string, any>;
  const structure = (template.template_structure || {}) as Record<string, any>;
  const sections = Array.isArray(structure.sections)
    ? structure.sections.map((section: Partial<TemplateSectionConfig>) => normalizeSection(section))
    : defaultSections.map((section) => ({ ...section }));

  return {
    id: template.id,
    name: template.name,
    version: `v${template.version}`,
    status: template.is_active ? "Published" : "Draft",
    inUse: Boolean(rules.in_use ?? rules.locked ?? false),
    targetLevel: String(rules.target_level ?? structure.target_level ?? "Entry Level"),
    estimatedDuration: Number(
      template.total_estimated_time_minutes ??
        rules.estimated_duration_minutes ??
        structure.estimated_duration_minutes ??
        45,
    ),
    totalQuestions: Number(rules.total_questions ?? structure.total_questions ?? sections.filter((section) => section.enabled).length),
    // Use actual timestamp from database, not hardcoded/formatted value (SRS: DR-1, NFR-11)
    lastModified: template.updated_at 
      ? new Date(template.updated_at).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : "—",
    passThreshold: Number(rules.pass_threshold ?? structure.pass_threshold ?? 60),
    proctoringEnabled: Boolean(rules.proctoring_enabled ?? structure.proctoring_enabled ?? true),
    sections,
  };
};

const Templates = () => {
  const { user, accessToken } = useAuth();
  const [templates, setTemplates] = useState<InterviewTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formName, setFormName] = useState("");
  const [formLevel, setFormLevel] = useState("Entry Level");
  const [formDuration, setFormDuration] = useState(45);
  const [formQuestions, setFormQuestions] = useState(10);
  const [formThreshold, setFormThreshold] = useState(60);
  const [formProctoring, setFormProctoring] = useState(true);
  const [formSections, setFormSections] = useState<TemplateSectionConfig[]>(defaultSections.map((section) => ({ ...section })));

  useEffect(() => {
    if (!user || !accessToken) return;

    const loadTemplates = async () => {
      try {
        setLoading(true);
        setError(null);
        const orgId = getOrgContextFromUser(user);
        const response = await templatesApi.list(accessToken, orgId, { per_page: 50 });
        setTemplates((response.data || []).map(normalizeTemplate));
      } catch (err: any) {
        setError(err.message || "Failed to load templates");
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, [user, accessToken]);

  const filtered = useMemo(
    () => templates.filter((template) => (template.name || "").toLowerCase().includes(search.toLowerCase())),
    [templates, search],
  );

  const resetForm = () => {
    setFormName("");
    setFormLevel("Entry Level");
    setFormDuration(45);
    setFormQuestions(10);
    setFormThreshold(60);
    setFormProctoring(true);
    setFormSections(defaultSections.map((section) => ({ ...section })));
  };

  const openCreate = () => {
    resetForm();
    setEditingId(null);
    setShowCreate(true);
  };

  const openEdit = (template: InterviewTemplate) => {
    setFormName(template.name);
    setFormLevel(template.targetLevel);
    setFormDuration(template.estimatedDuration);
    setFormQuestions(template.totalQuestions);
    setFormThreshold(template.passThreshold);
    setFormProctoring(template.proctoringEnabled);
    setFormSections(template.sections.map((section) => ({ ...section })));
    setEditingId(template.id);
    setShowCreate(true);
  };

  const buildPayload = (): TemplateCreateRequest | TemplateUpdateRequest => ({
    name: formName.trim(),
    description: `${formLevel} interview template`,
    scope: "private" as TemplateScope,
    template_structure: {
      target_level: formLevel,
      estimated_duration_minutes: formDuration,
      total_questions: formQuestions,
      sections: formSections.map((section) => ({
        name: section.name,
        enabled: section.enabled,
        weight: section.weight,
        description: section.description,
        details: section.details,
      })),
    },
    rules: {
      pass_threshold: formThreshold,
      proctoring_enabled: formProctoring,
      in_use: false,
    },
    total_estimated_time_minutes: formDuration,
  });

  const handleSave = async () => {
    if (!formName.trim() || !accessToken || !user) return;

    try {
      setSubmitting(true);
      setError(null);
      const orgId = getOrgContextFromUser(user);
      const payload = buildPayload();

      // Schema-based form validation (SRS: FR-2.3, DR-1)
      const validation = validateTemplateRequest(payload);
      if (!validation.valid) {
        const errorMsg = Object.values(validation.errors).join("; ");
        setError(errorMsg);
        return;
      }

      if (editingId) {
        // Update operation - audit trail must be recorded
        const response = await templatesApi.update(editingId, payload, accessToken, orgId);
        const normalized = normalizeTemplate(response.data);
        setTemplates((prev) => prev.map((template) => (template.id === editingId ? normalized : template)));
        
        // Record audit event (SRS: NFR-11.2 - immutable audit trail)
        clientAuditTrail.logUpdate(
          orgId,
          'interview_template',
          editingId,
          { name: formName, estimatedDuration: formDuration },
          response.data as any
        );
      } else {
        // Create operation - audit trail must be recorded
        const response = await templatesApi.create(payload as TemplateCreateRequest, accessToken, orgId);
        const normalized = normalizeTemplate(response.data);
        setTemplates((prev) => [normalized, ...prev]);
        
        // Record audit event (SRS: NFR-11.2)
        clientAuditTrail.logCreate(
          orgId,
          'interview_template',
          response.data.id,
          payload as any
        );
      }

      setShowCreate(false);
      resetForm();
      setEditingId(null);
    } catch (err: any) {
      setError(err.message || "Failed to save template");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!accessToken || !user) return;
    if (!confirm("Delete this template? This action cannot be undone.")) return;

    try {
      setSubmitting(true);
      setError(null);
      const orgId = getOrgContextFromUser(user);
      
      // Fetch template before deletion to record in audit trail
      const templateToDelete = templates.find((t) => t.id === id);
      
      await templatesApi.delete(id, accessToken, orgId);
      setTemplates((prev) => prev.filter((template) => template.id !== id));
      setExpandedId(null);

      // Record deletion audit event (SRS: NFR-11.2)
      if (templateToDelete) {
        clientAuditTrail.logDelete(
          orgId,
          'interview_template',
          id,
          { name: templateToDelete.name } as any
        );
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete template");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDuplicate = async (template: InterviewTemplate) => {
    if (!accessToken || !user) return;

    try {
      setSubmitting(true);
      setError(null);
      const orgId = getOrgContextFromUser(user);
      
      const duplicatePayload = {
        name: `${template.name} (Copy)`,
        description: `Copy of ${template.name}`,
        scope: "private" as TemplateScope,
        template_structure: {
          target_level: template.targetLevel,
          estimated_duration_minutes: template.estimatedDuration,
          total_questions: template.totalQuestions,
          sections: template.sections,
        },
        rules: {
          pass_threshold: template.passThreshold,
          proctoring_enabled: template.proctoringEnabled,
          in_use: false,
        },
        total_estimated_time_minutes: template.estimatedDuration,
      };

      // Validate before creation
      const validation = validateTemplateRequest(duplicatePayload);
      if (!validation.valid) {
        const errorMsg = Object.values(validation.errors).join("; ");
        setError(errorMsg);
        return;
      }

      const response = await templatesApi.create(
        duplicatePayload as TemplateCreateRequest,
        accessToken,
        orgId,
      );

      const normalized = normalizeTemplate(response.data);
      setTemplates((prev) => [normalized, ...prev]);

      // Record creation audit event (SRS: NFR-11.2)
      clientAuditTrail.logCreate(
        orgId,
        'interview_template',
        response.data.id,
        duplicatePayload as any
      );
    } catch (err: any) {
      setError(err.message || "Failed to duplicate template");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (id: number) => {
    if (!accessToken || !user) return;

    try {
      setSubmitting(true);
      setError(null);
      const orgId = getOrgContextFromUser(user);
      
      const response = await templatesApi.activate(id, accessToken, orgId);
      const normalized = normalizeTemplate(response.data);
      setTemplates((prev) => prev.map((template) => (template.id === id ? normalized : template)));

      // Record publish audit event (SRS: NFR-11.2)
      clientAuditTrail.logUpdate(
        orgId,
        'interview_template',
        id,
        { status: 'Draft' },
        { status: 'Published', is_active: true } as any
      );
    } catch (err: any) {
      setError(err.message || "Failed to publish template");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSection = (index: number) => {
    setFormSections((prev) => prev.map((section, i) => (i === index ? { ...section, enabled: !section.enabled } : section)));
  };

  const updateSectionWeight = (index: number, weight: number) => {
    setFormSections((prev) => prev.map((section, i) => (i === index ? { ...section, weight } : section)));
  };

  return (
    <PageWrapper title="Interview Templates" description="Create and version interview flow templates. In-use templates are immutable.">
      <ContentBreadcrumb current="Interview Templates" />

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-muted border border-border rounded-lg text-sm"
            placeholder="Search templates..."
            disabled={loading}
          />
        </div>
        <ProtectedAction action="create_template">
          <button
            onClick={openCreate}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            disabled={loading || submitting}
          >
            <Plus className="h-4 w-4" /> New Template
          </button>
        </ProtectedAction>
      </div>

      {loading ? (
        <div className="glass-card p-8 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading templates...
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">
          {templates.length === 0 ? "No templates found. Create one to get started." : "No templates match your search."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((template) => (
            <motion.div key={template.id} variants={itemVariant} layout className="glass-card p-5 group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-sm">{template.name}</h3>
                </div>
                {template.inUse && <Lock className="h-4 w-4 text-destructive" />}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Version</span>
                  <span className="text-foreground">{template.version}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Level</span>
                  <span className="text-foreground">{template.targetLevel}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Duration</span>
                  <span className="text-foreground">{template.estimatedDuration} min</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Questions</span>
                  <span className="text-foreground">{template.totalQuestions}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Pass Threshold</span>
                  <span className="text-foreground">{template.passThreshold}%</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Proctoring</span>
                  <span className={template.proctoringEnabled ? "text-success" : "text-muted-foreground"}>
                    {template.proctoringEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Status</span>
                  <span className={template.status === "Published" ? "status-badge-success" : "status-badge-warning"}>{template.status}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Modified</span>
                  <span className="text-foreground">{template.lastModified}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-border/50">
                <button
                  onClick={() => setExpandedId(expandedId === template.id ? null : template.id)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                  {expandedId === template.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {template.sections.filter((section) => section.enabled).length} Sections configured
                </button>

                <AnimatePresence>
                  {expandedId === template.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="mt-2 space-y-1.5">
                        {template.sections.filter((section) => section.enabled).map((section) => (
                          <div key={section.name} className="flex items-center justify-between text-xs bg-muted/50 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                              <section.icon className="h-3.5 w-3.5 text-primary" />
                              <span>{section.name}</span>
                            </div>
                            <span className="text-muted-foreground">{section.weight}%</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t border-border/50">
                <button
                  onClick={() => setExpandedId(expandedId === template.id ? null : template.id)}
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-xs transition-colors"
                >
                  <Eye className="h-3 w-3" /> View
                </button>

                {template.inUse ? (
                  <ProtectedAction action="create_template">
                    <button
                      onClick={() => handleDuplicate(template)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-xs transition-colors disabled:opacity-50"
                      disabled={submitting}
                    >
                      <Copy className="h-3 w-3" /> New Version
                    </button>
                  </ProtectedAction>
                ) : (
                  <>
                    <ProtectedAction action="edit_template">
                      <button
                        onClick={() => openEdit(template)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-xs transition-colors disabled:opacity-50"
                        disabled={submitting}
                      >
                        <Edit className="h-3 w-3" /> Edit
                      </button>
                    </ProtectedAction>
                    <ProtectedAction action="delete_template" hideIfDenied>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="flex items-center justify-center gap-1 px-3 py-2 bg-destructive/20 text-destructive hover:bg-destructive/30 rounded-lg text-xs transition-colors disabled:opacity-50"
                        disabled={submitting}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </ProtectedAction>
                  </>
                )}

                {!template.inUse && template.status === "Draft" && (
                  <ProtectedAction action="publish_template">
                    <button
                      onClick={() => handlePublish(template.id)}
                      className="flex items-center justify-center gap-1 px-3 py-2 bg-success/20 text-success hover:bg-success/30 rounded-lg text-xs transition-colors disabled:opacity-50"
                      disabled={submitting}
                    >
                      <Upload className="h-3 w-3" /> Publish
                    </button>
                  </ProtectedAction>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">{editingId ? "Edit Template" : "Create Interview Template"}</h2>
                <button onClick={() => setShowCreate(false)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Template Name</label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                    placeholder="e.g. Graduate Software Engineer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Target Level</label>
                    <select value={formLevel} onChange={(e) => setFormLevel(e.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground">
                      <option>Entry Level</option>
                      <option>Mid Level</option>
                      <option>Senior</option>
                      <option>Staff</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Duration (min)</label>
                    <input type="number" value={formDuration} onChange={(e) => setFormDuration(Number(e.target.value))} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Total Questions</label>
                    <input type="number" value={formQuestions} onChange={(e) => setFormQuestions(Number(e.target.value))} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Pass Threshold (%)</label>
                    <input type="number" value={formThreshold} onChange={(e) => setFormThreshold(Number(e.target.value))} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-sm text-muted-foreground">Proctoring</label>
                  <button onClick={() => setFormProctoring(!formProctoring)} className={`relative w-11 h-6 rounded-full transition-colors ${formProctoring ? "bg-success" : "bg-muted"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${formProctoring ? "translate-x-5" : ""}`} />
                  </button>
                  <span className="text-xs text-muted-foreground">{formProctoring ? "Enabled" : "Disabled"}</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Interview Sections</h3>
                    <span className="text-xs text-muted-foreground">{formSections.filter((section) => section.enabled).length} enabled</span>
                  </div>
                  <div className="space-y-2">
                    {formSections.map((section, index) => (
                      <div key={section.name} className={`rounded-lg border transition-colors ${section.enabled ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"} p-3`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <button
                              onClick={() => toggleSection(index)}
                              className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${section.enabled ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}
                            >
                              {section.enabled && "✓"}
                            </button>
                            <section.icon className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium truncate">{section.name}</span>
                          </div>
                          {section.enabled && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Weight:</span>
                              <input
                                type="number"
                                value={section.weight}
                                onChange={(e) => updateSectionWeight(index, Number(e.target.value))}
                                className="w-16 px-2 py-1 bg-muted border border-border rounded text-xs text-center"
                              />
                              <span className="text-xs text-muted-foreground">%</span>
                            </div>
                          )}
                        </div>
                        {section.enabled && <p className="text-xs text-muted-foreground mt-1 ml-6">{section.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-border/50">
                <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId ? "Save Changes" : "Create Template"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
};

export default Templates;