import { PageWrapper, itemVariant } from "@/components/PageWrapper";
import { motion } from "framer-motion";
import { Users, Cpu, Zap, ToggleLeft, Plus, Edit, Trash2, Shield, Loader2, AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getOrgContextFromUser } from "@/services/api/adminApiClient";
import { templatesApi } from "@/services/api";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Settings = () => {
  const { user, accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState("admins");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptTemplates, setPromptTemplates] = useState<Array<{ id: number; name: string; model: string; tokens: number; lastUpdated: string }>>([]);
  const [featureFlags, setFeatureFlags] = useState<Array<{ id: number; name: string; description: string; enabled: boolean }>>([]);

  useEffect(() => {
    if (!user || !accessToken) return;

    const loadSettingsData = async () => {
      try {
        setLoading(true);
        setError(null);
        const orgId = getOrgContextFromUser(user);
        const templatesResponse = await templatesApi.list(accessToken, orgId, { page: 1, per_page: 50 });

        setPromptTemplates(
          (templatesResponse.data || []).slice(0, 10).map((template) => ({
            id: template.id,
            name: template.name,
            model: "Configured by backend",
            tokens: template.total_estimated_time_minutes ?? 0,
            lastUpdated: template.updated_at ? new Date(template.updated_at).toLocaleDateString() : "—",
          })),
        );
      } catch (err: any) {
        setError(err.message || "Failed to load settings data");
      } finally {
        setLoading(false);
      }
    };

    loadSettingsData();
  }, [user, accessToken]);

  useEffect(() => {
    const runtimeFlags = [
      { id: 1, name: "VITE_API_BASE_URL", description: "Frontend API base URL configured", enabled: Boolean(import.meta.env.VITE_API_BASE_URL) },
      { id: 2, name: "VITE_ENV", description: "Runtime environment value present", enabled: Boolean(import.meta.env.VITE_ENV) },
      { id: 3, name: "VITE_ENABLE_PROCTORING", description: "Proctoring feature toggle", enabled: String(import.meta.env.VITE_ENABLE_PROCTORING || "").toLowerCase() === "true" },
      { id: 4, name: "VITE_ENABLE_REPORTS", description: "Reports feature toggle", enabled: String(import.meta.env.VITE_ENABLE_REPORTS || "").toLowerCase() === "true" },
    ];
    setFeatureFlags(runtimeFlags);
  }, []);

  const toggleFlag = (id: number) => {
    setFeatureFlags((prev) => prev.map((f) => f.id === id ? { ...f, enabled: !f.enabled } : f));
  };

  const admins = useMemo(() => {
    if (!user) return [];
    return [{
      id: user.id,
      name: user.fullName || user.email.split("@")[0],
      email: user.email,
      role: user.adminRole ? user.adminRole.replace("_", " ") : "admin",
      lastActive: "Active session",
      status: "Online",
    }];
  }, [user]);

  const tabs = [
    { id: "admins", label: "Manage Admins", icon: Users },
    { id: "models", label: "Model Registry", icon: Cpu },
    { id: "prompts", label: "Prompt Templates", icon: Zap },
    { id: "flags", label: "Feature Flags", icon: ToggleLeft },
  ];

  return (
    <PageWrapper title="Settings" description="Manage admins, AI models, prompts, and feature flags">
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-1 bg-muted rounded-lg p-1 mb-6 w-fit">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${activeTab === t.id ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
      </div>

      {activeTab === "admins" && (
        <motion.div variants={itemVariant} className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Admin Users</h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"><Plus className="h-4 w-4" /> Add Admin</button>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground border-b border-border/50">
              <th className="pb-3 font-medium">Name</th><th className="pb-3 font-medium">Email</th><th className="pb-3 font-medium">Role</th><th className="pb-3 font-medium">Last Active</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {admins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">No admin data available.</td>
                </tr>
              ) : admins.map((a) => (
                <tr key={a.id} className="data-table-row">
                  <td className="py-3 font-medium flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary">{a.name[0]}</div>{a.name}</td>
                  <td className="py-3 text-muted-foreground">{a.email}</td>
                  <td className="py-3"><span className="status-badge-neutral"><Shield className="h-3 w-3" />{a.role}</span></td>
                  <td className="py-3 text-muted-foreground">{a.lastActive}</td>
                  <td className="py-3"><span className={a.status === "Online" ? "status-badge-success" : "status-badge-neutral"}>{a.status === "Online" && <span className="pulse-dot bg-success" />}{a.status}</span></td>
                  <td className="py-3 flex gap-1">
                    <button className="p-1.5 rounded hover:bg-muted transition-colors"><Edit className="h-4 w-4 text-muted-foreground" /></button>
                    <button className="p-1.5 rounded hover:bg-muted transition-colors"><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {activeTab === "models" && (
        <motion.div variants={itemVariant} className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4">AI Model Registry</h2>
          <div className="p-4 bg-muted/30 rounded-lg border border-border/50 text-sm text-muted-foreground">
            Model registry API is not exposed in this backend yet. This section now avoids mock rows.
          </div>
        </motion.div>
      )}

      {activeTab === "prompts" && (
        <motion.div variants={itemVariant} className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Prompt Templates</h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"><Plus className="h-4 w-4" /> New Template</button>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground border-b border-border/50">
              <th className="pb-3 font-medium">Name</th><th className="pb-3 font-medium">Model</th><th className="pb-3 font-medium">Max Tokens</th><th className="pb-3 font-medium">Last Updated</th><th className="pb-3 font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    <div className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading templates...</div>
                  </td>
                </tr>
              ) : promptTemplates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">No templates available.</td>
                </tr>
              ) : promptTemplates.map((p) => (
                <tr key={p.id} className="data-table-row">
                  <td className="py-3 font-medium flex items-center gap-2"><Zap className="h-4 w-4 text-warning" />{p.name}</td>
                  <td className="py-3 text-muted-foreground">{p.model}</td>
                  <td className="py-3">{p.tokens}</td>
                  <td className="py-3 text-muted-foreground">{p.lastUpdated}</td>
                  <td className="py-3 flex gap-1">
                    <button className="p-1.5 rounded hover:bg-muted transition-colors"><Edit className="h-4 w-4 text-muted-foreground" /></button>
                    <button className="p-1.5 rounded hover:bg-muted transition-colors"><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {activeTab === "flags" && (
        <motion.div variants={itemVariant} className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4">Feature Flags</h2>
          <div className="space-y-3">
            {featureFlags.length === 0 ? (
              <div className="p-4 bg-muted/30 rounded-lg border border-border/50 text-sm text-muted-foreground">No runtime feature flags found.</div>
            ) : featureFlags.map((f) => (
              <div key={f.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
                <div>
                  <div className="font-medium text-sm font-mono">{f.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{f.description}</div>
                </div>
                <button onClick={() => toggleFlag(f.id)} className={`relative w-11 h-6 rounded-full transition-colors ${f.enabled ? "bg-success" : "bg-muted"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-foreground rounded-full transition-transform ${f.enabled ? "left-5.5 translate-x-0" : "left-0.5"}`} style={{ left: f.enabled ? "22px" : "2px" }} />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </PageWrapper>
  );
};

export default Settings;
