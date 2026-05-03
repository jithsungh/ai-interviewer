/**
 * Eligibility Rules Management Page
 * 
 * Define filtering rules for candidate eligibility
 * (CGPA, backlog, branch, skills, certifications).
 * 
 * SRS refs: FR-1.4 (eligibility), FR-2.4 (eligibility engine)
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  Edit,
  Trash2,
  Eye,
  Filter,
  Search,
  X,
  Save,
  Play,
} from 'lucide-react';
import { PageWrapper, itemVariant } from '@/components/PageWrapper';
import { ContentBreadcrumb } from '@/components/ContentBreadcrumb';
import { StatCard } from '@/components/StatCard';
import { ProtectedAction } from '@/components/ProtectedAction';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useRbac } from '@/hooks/useRbac';
import { getErrorMessage } from '@/lib/errorUtils';
import { getOrgContextFromUser } from '@/services/api/adminApiClient';
import { eligibilityRulesApi } from '@/services/api/eligibilityRules';
import { clientAuditTrail } from '@/services/api/auditLogs';
import type { EligibilityRuleSet, EligibilityRuleSetCreateRequest } from '@/services/api/eligibilityRules';

interface RuleSetFormData extends EligibilityRuleSetCreateRequest {}

const EligibilityRules = () => {
  const { user, accessToken } = useAuth();
  const { can } = useRbac();

  // Data state
  const [ruleSets, setRuleSets] = useState<EligibilityRuleSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<RuleSetFormData>({
    name: '',
    description: '',
    rules: [],
    logic: 'AND',
    apply_to_cohorts: [],
    apply_to_roles: [],
  });
  const [submitting, setSubmitting] = useState(false);

  // Load rule sets
  useEffect(() => {
    if (!user || !accessToken) return;
    loadRuleSets();
  }, [user, accessToken, page]);

  const loadRuleSets = async () => {
    if (!user || !accessToken) return;

    try {
      setLoading(true);
      setError(null);
      const orgId = getOrgContextFromUser(user);

      const response = await eligibilityRulesApi.list(accessToken, orgId, {
        page,
        per_page: 20,
      });

      setRuleSets(response.data);
      setTotalPages(response.pagination.total_pages);
    } catch (err: any) {
      const errorMsg = getErrorMessage(err, 'Failed to load eligibility rules');
      setError(errorMsg);
      console.error('Error loading rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRuleSet = () => {
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      rules: [],
      logic: 'AND',
      apply_to_cohorts: [],
      apply_to_roles: [],
    });
    setShowForm(true);
  };

  const handleEditRuleSet = (ruleSet: EligibilityRuleSet) => {
    setEditingId(ruleSet.id);
    setFormData({
      name: ruleSet.name,
      description: ruleSet.description,
      rules: ruleSet.rules,
      logic: ruleSet.logic,
      apply_to_cohorts: ruleSet.apply_to_cohorts,
      apply_to_roles: ruleSet.apply_to_roles,
    });
    setShowForm(true);
  };

  const handleSaveRuleSet = async () => {
    if (!user || !accessToken) return;
    if (!formData.name) {
      setError('Name is required');
      return;
    }
    if (formData.rules.length === 0) {
      setError('At least one rule must be defined');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const orgId = getOrgContextFromUser(user);

      if (editingId) {
        await eligibilityRulesApi.update(editingId, formData, accessToken, orgId);
        clientAuditTrail.logUpdate(orgId, 'eligibility_rule_set', editingId, {}, formData as any);
        setSuccess('Rule set updated successfully');
      } else {
        const response = await eligibilityRulesApi.create(formData, accessToken, orgId);
        clientAuditTrail.logCreate(orgId, 'eligibility_rule_set', response.data.id, formData as any);
        setSuccess('Rule set created successfully');
      }

      setShowForm(false);
      loadRuleSets();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      const errorMsg = getErrorMessage(err, 'Failed to save rule set');
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRuleSet = async (ruleSetId: number) => {
    if (!window.confirm('Are you sure you want to delete this rule set?')) return;

    if (!user || !accessToken) return;

    try {
      setError(null);
      const orgId = getOrgContextFromUser(user);
      const ruleSet = ruleSets.find(r => r.id === ruleSetId);

      await eligibilityRulesApi.delete(ruleSetId, accessToken, orgId);
      clientAuditTrail.logDelete(orgId, 'eligibility_rule_set', ruleSetId, { name: ruleSet?.name || '' });

      setSuccess('Rule set deleted successfully');
      loadRuleSets();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      const errorMsg = getErrorMessage(err, 'Failed to delete rule set');
      setError(errorMsg);
    }
  };

  const filteredRuleSets = ruleSets.filter(rs =>
    rs.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const stats = [
    {
      title: 'Rule Sets',
      value: ruleSets.length,
      icon: Filter,
      trend: 'Active rule sets',
    },
    {
      title: 'Total Rules',
      value: ruleSets.reduce((sum, rs) => sum + rs.rules.length, 0),
      icon: Filter,
      trend: 'Across all sets',
    },
    {
      title: 'Logic Types',
      value: Math.min(2, ruleSets.length),
      icon: Filter,
      trend: 'AND / OR',
    },
  ];

  return (
    <PageWrapper title="Eligibility Rules">
      <ContentBreadcrumb current="Eligibility Rules" />

      <motion.div className="py-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Eligibility Rules</h1>
            <p className="text-slate-600 mt-1">Define filtering rules for candidate eligibility</p>
          </div>
          <ProtectedAction action="manage_eligibility_rules">
            <button
              onClick={handleAddRuleSet}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Rule Set
            </button>
          </ProtectedAction>
        </div>

        {/* Alerts */}
        <div className="space-y-3 mb-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {stats.map((stat, idx) => (
            <motion.div key={idx} variants={itemVariant}>
              <StatCard {...stat} />
            </motion.div>
          ))}
        </div>

        {/* Search */}
        <motion.div variants={itemVariant} className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search rule sets..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </motion.div>

        {/* Rule Sets List */}
        <motion.div variants={itemVariant} className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-12 bg-white rounded-lg">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : filteredRuleSets.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-lg">
              <Filter className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">No rule sets found</p>
              <p className="text-slate-500 text-sm">Create one to define eligibility criteria</p>
            </div>
          ) : (
            filteredRuleSets.map((ruleSet, idx) => (
              <motion.div
                key={ruleSet.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-lg shadow p-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{ruleSet.name}</h3>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-mono">
                        {ruleSet.logic}
                      </span>
                      {ruleSet.is_active && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                          Active
                        </span>
                      )}
                    </div>
                    {ruleSet.description && (
                      <p className="text-slate-600 text-sm mb-3">{ruleSet.description}</p>
                    )}
                    
                    {/* Rules Summary */}
                    <div className="mb-3">
                      <p className="text-xs font-medium text-slate-700 mb-2">Rules ({ruleSet.rules.length}):</p>
                      <div className="flex flex-wrap gap-2">
                        {ruleSet.rules.map((rule, rIdx) => (
                          <span key={rIdx} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded">
                            {rule.field} {rule.operator} {JSON.stringify(rule.value).substring(0, 20)}...
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Application Scope */}
                    {(ruleSet.apply_to_cohorts?.length || ruleSet.apply_to_roles?.length) && (
                      <p className="text-xs text-slate-500">
                        Applied to: {ruleSet.apply_to_cohorts?.length || 0} cohort(s), {ruleSet.apply_to_roles?.length || 0} role(s)
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 ml-4">
                    <ProtectedAction action="manage_eligibility_rules">
                      <button className="p-2 hover:bg-blue-100 rounded">
                        <Eye className="w-4 h-4 text-blue-600" />
                      </button>
                    </ProtectedAction>
                    {can('manage_eligibility_rules') && (
                      <>
                        <button
                          onClick={() => handleEditRuleSet(ruleSet)}
                          className="p-2 hover:bg-yellow-100 rounded"
                        >
                          <Edit className="w-4 h-4 text-yellow-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteRuleSet(ruleSet.id)}
                          className="p-2 hover:bg-red-100 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t bg-white rounded-lg flex justify-between items-center">
              <span className="text-sm text-slate-600">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Create/Edit Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={() => !submitting && setShowForm(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">
                    {editingId ? 'Edit Rule Set' : 'New Rule Set'}
                  </h2>
                  <button onClick={() => setShowForm(false)}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., CS Batch Eligible"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                      placeholder="Optional description..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Logic Operator</label>
                    <select
                      value={formData.logic}
                      onChange={e => setFormData({ ...formData, logic: e.target.value as 'AND' | 'OR' })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="AND">All rules must match (AND)</option>
                      <option value="OR">Any rule can match (OR)</option>
                    </select>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                    <p className="font-medium mb-2">Rules Configuration</p>
                    <p>Configure rules in the advanced editor. Common fields:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>CGPA (numeric)</li>
                      <li>Backlog count (numeric)</li>
                      <li>Branch (text)</li>
                      <li>Skills (list)</li>
                      <li>Certifications (list)</li>
                    </ul>
                  </div>

                  {formData.rules.length === 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>At least one rule must be defined</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowForm(false)}
                    disabled={submitting}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveRuleSet}
                    disabled={submitting || formData.rules.length === 0}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Rule Set
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </PageWrapper>
  );
};

export default EligibilityRules;
