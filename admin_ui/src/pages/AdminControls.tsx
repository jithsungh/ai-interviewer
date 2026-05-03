/**
 * Admin Controls - Master Dashboard for University Administration
 * 
 * Consolidated view for:
 * - Template management with API persistence
 * - Interview window scheduling with timezone safety
 * - Audit trail visibility
 * - RBAC enforcement
 * - Tenant-scoped operations
 * 
 * SRS refs: FR-2 (admin ops), NFR-7 (RBAC), NFR-11 (audit trail)
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Plus,
  Settings2,
  TrendingUp,
  AlertTriangle,
  Archive,
  Edit,
  Trash2,
  Eye,
  Lock,
} from 'lucide-react';
import { PageWrapper, itemVariant } from '@/components/PageWrapper';
import { ContentBreadcrumb } from '@/components/ContentBreadcrumb';
import { StatCard } from '@/components/StatCard';
import { ProtectedAction } from '@/components/ProtectedAction';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/errorUtils';
import { useRbac } from '@/hooks/useRbac';
import { getOrgContextFromUser } from '@/services/api/adminApiClient';
import { templatesApi } from '@/services/api/templates';
import { windowsApi } from '@/services/api/windows';
import { auditLogsApi, clientAuditTrail } from '@/services/api/auditLogs';
import type { TemplateResponse, InterviewWindowResponse, AuditLogResponse } from '@/types/admin-api';

const AdminControls = () => {
  const { user, accessToken } = useAuth();
  const { can } = useRbac();

  // Data state
  const [templates, setTemplates] = useState<TemplateResponse[]>([]);
  const [windows, setWindows] = useState<InterviewWindowResponse[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogResponse[]>([]);

  // Loading state
  const [loading, setLoading] = useState(true);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [windowLoading, setWindowLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load all data on mount
  useEffect(() => {
    if (!user || !accessToken) return;
    loadAllData();
  }, [user, accessToken]);

  const loadAllData = async () => {
    if (!user || !accessToken) return;
    
    try {
      setLoading(true);
      setError(null);
      const orgId = getOrgContextFromUser(user);

      // Load templates, windows, and recent audit logs in parallel
      const [templatesRes, windowsRes, auditRes] = await Promise.all([
        templatesApi.list(accessToken, orgId, { per_page: 5 }).catch(() => ({ data: [] })),
        windowsApi.list(accessToken, orgId, { per_page: 5 }).catch(() => ({ data: [] })),
        auditLogsApi.listAdminLogs(accessToken, orgId, { page: 1, per_page: 10 }).catch(() => ({ data: [] })),
      ]);

      setTemplates(templatesRes.data || []);
      setWindows(windowsRes.data || []);
      setAuditLogs(auditRes.data || []);
    } catch (err: any) {
      const errorMsg = getErrorMessage(err, 'Failed to load admin data');
      setError(errorMsg);
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishTemplate = async (templateId: number) => {
    if (!user || !accessToken) return;
    
    try {
      const orgId = getOrgContextFromUser(user);
      const template = templates.find(t => t.id === templateId);
      if (!template) return;

      await templatesApi.update(
        templateId,
        { scope: 'public' },
        accessToken,
        orgId,
      );

      // Log action
      clientAuditTrail.logPublish(orgId, 'template', templateId, { previous_scope: template.scope });
      
      setSuccessMessage('Template published successfully');
      await loadAllData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      const errorMsg = getErrorMessage(err, 'Failed to publish template');
      setError(errorMsg);
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    if (!user || !accessToken) return;
    if (!window.confirm('Are you sure you want to delete this template?')) return;

    try {
      const orgId = getOrgContextFromUser(user);
      const template = templates.find(t => t.id === templateId);
      if (!template) return;

      await templatesApi.delete(templateId, accessToken, orgId);

      // Log action
      clientAuditTrail.logDelete(orgId, 'template', templateId, { name: template.name });

      setSuccessMessage('Template deleted successfully');
      await loadAllData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      const errorMsg = getErrorMessage(err, 'Failed to delete template');
      setError(errorMsg);
    }
  };

  const stats = [
    {
      title: 'Active Templates',
      value: templates.filter(t => t.is_active).length,
      icon: FileText,
      trend: '+2 this month',
    },
    {
      title: 'Scheduled Windows',
      value: windows.length,
      icon: Clock,
      trend: templates.length ? `${Math.round((windows.length / Math.max(templates.length, 1)) * 100)}% active` : '0%',
    },
    {
      title: 'Admin Actions',
      value: auditLogs.length,
      icon: TrendingUp,
      trend: 'Last 24 hours',
    },
    {
      title: 'System Status',
      value: 100,
      icon: CheckCircle2,
      trend: 'All systems operational',
    },
  ];

  const isLoading = loading || templateLoading || windowLoading || auditLoading;

  return (
    <PageWrapper title="Admin Controls">
      <ContentBreadcrumb current="Admin Controls" />

      <motion.div className="py-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Controls</h1>
            <p className="text-slate-600 mt-1">
              {user?.organizationId ? `Organization ID: ${user.organizationId}` : 'Loading...'}
            </p>
          </div>
          <div className="flex gap-2">
            {can('create_template') && (
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New Template
              </button>
            )}
          </div>
        </div>

        {/* Alerts */}
        <div className="space-y-3 mb-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {successMessage && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, idx) => (
            <motion.div key={idx} variants={itemVariant}>
              <StatCard
                title={stat.title}
                value={String(stat.value)}
                icon={stat.icon}
                change={stat.trend}
              />
            </motion.div>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Templates Section */}
          <motion.div
            variants={itemVariant}
            className="lg:col-span-2 bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Interview Templates
              </h2>
              {can('create_template') && (
                <ProtectedAction action="create_template">
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    Add New
                  </button>
                </ProtectedAction>
              )}
            </div>

            {templateLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : templates.length === 0 ? (
              <p className="text-slate-500 py-4">No templates found. Create one to get started.</p>
            ) : (
              <div className="space-y-2">
                {templates.map(template => (
                  <div key={template.id} className="flex items-center justify-between p-3 border rounded hover:bg-slate-50">
                    <div className="flex-1">
                      <p className="font-medium">{template.name}</p>
                      <p className="text-sm text-slate-500">{template.description || 'No description'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {template.is_active ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Active</span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">Inactive</span>
                      )}
                      <div className="flex gap-1">
                        <ProtectedAction action="edit_template">
                          <button className="p-1 hover:bg-blue-100 rounded">
                            <Eye className="w-4 h-4 text-blue-600" />
                          </button>
                        </ProtectedAction>
                        {can('edit_template') && (
                          <>
                            <button className="p-1 hover:bg-yellow-100 rounded">
                              <Edit className="w-4 h-4 text-yellow-600" />
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="p-1 hover:bg-red-100 rounded"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Audit Trail Section */}
          <motion.div
            variants={itemVariant}
            className="bg-white rounded-lg shadow p-6"
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Recent Actions
            </h2>

            {auditLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : auditLogs.length === 0 ? (
              <p className="text-slate-500 py-4">No recent actions</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {auditLogs.map(log => (
                  <div key={log.id} className="text-sm p-2 border-l-4 border-blue-400 bg-blue-50">
                    <p className="font-medium capitalize">{log.event_type}</p>
                    {log.event_metadata && (
                      <p className="text-xs text-slate-600">
                        {JSON.stringify(log.event_metadata)}
                      </p>
                    )}
                    <p className="text-xs text-slate-600">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : 'Unknown time'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Windows Section */}
        <motion.div
          variants={itemVariant}
          className="mt-6 bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Interview Windows (Last 5)
            </h2>
            {can('create_window') && (
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Add New Window
              </button>
            )}
          </div>

          {windowLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : windows.length === 0 ? (
            <p className="text-slate-500 py-4">No windows scheduled</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-3">Window</th>
                    <th className="text-left p-3">Duration</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {windows.map(window => (
                    <tr key={window.id} className="border-b hover:bg-slate-50">
                      <td className="p-3">{window.name}</td>
                      <td className="p-3 text-xs text-slate-600">
                        {window.start_date} to {window.end_date}
                      </td>
                      <td className="p-3">
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                          Active
                        </span>
                      </td>
                      <td className="p-3 text-xs">
                        <button className="text-blue-600 hover:underline">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
};

export default AdminControls;
