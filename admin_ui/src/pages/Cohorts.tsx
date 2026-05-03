/**
 * Cohorts Management Page
 * 
 * University admin interface for managing student cohorts/batches
 * (graduation year, program, campus, section).
 * 
 * SRS refs: FR-1 (cohort management), FR-2.1 (batch operations)
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
  Users,
  Calendar,
  MapPin,
  Search,
  X,
  Save,
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
import { cohortsApi } from '@/services/api/cohorts';
import { clientAuditTrail } from '@/services/api/auditLogs';
import type { CohortResponse, CohortCreateRequest } from '@/services/api/cohorts';

interface CohortFormData extends CohortCreateRequest {}

const Cohorts = () => {
  const { user, accessToken } = useAuth();
  const { can } = useRbac();

  // Data state
  const [cohorts, setCohorts] = useState<CohortResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProgram, setFilterProgram] = useState('');

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CohortFormData>({
    name: '',
    description: '',
    graduation_year: new Date().getFullYear(),
    program: '',
    campus: '',
    section: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Load cohorts on mount and when filters change
  useEffect(() => {
    if (!user || !accessToken) return;
    loadCohorts();
  }, [user, accessToken, page, filterProgram]);

  const loadCohorts = async () => {
    if (!user || !accessToken) return;

    try {
      setLoading(true);
      setError(null);
      const orgId = getOrgContextFromUser(user);

      const response = await cohortsApi.list(accessToken, orgId, {
        page,
        per_page: 20,
        program: filterProgram || undefined,
      });

      setCohorts(response.data);
      setTotalPages(response.pagination.total_pages);
    } catch (err: any) {
      const errorMsg = getErrorMessage(err, 'Failed to load cohorts');
      setError(errorMsg);
      console.error('Error loading cohorts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCohort = () => {
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      graduation_year: new Date().getFullYear(),
      program: '',
      campus: '',
      section: '',
    });
    setShowForm(true);
  };

  const handleEditCohort = (cohort: CohortResponse) => {
    setEditingId(cohort.id);
    setFormData({
      name: cohort.name,
      description: cohort.description,
      graduation_year: cohort.graduation_year,
      program: cohort.program,
      campus: cohort.campus,
      section: cohort.section,
    });
    setShowForm(true);
  };

  const handleSaveCohort = async () => {
    if (!user || !accessToken) return;
    if (!formData.name || !formData.program) {
      setError('Name and program are required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const orgId = getOrgContextFromUser(user);

      if (editingId) {
        await cohortsApi.update(editingId, formData, accessToken, orgId);
        clientAuditTrail.logUpdate(orgId, 'cohort', editingId, {}, formData as any);
        setSuccess('Cohort updated successfully');
      } else {
        const response = await cohortsApi.create(formData, accessToken, orgId);
        clientAuditTrail.logCreate(orgId, 'cohort', response.data.id, formData as any);
        setSuccess('Cohort created successfully');
      }

      setShowForm(false);
      loadCohorts();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      const errorMsg = getErrorMessage(err, 'Failed to save cohort');
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCohort = async (cohortId: number) => {
    if (!window.confirm('Are you sure you want to delete this cohort?')) return;

    if (!user || !accessToken) return;

    try {
      setError(null);
      const orgId = getOrgContextFromUser(user);
      const cohort = cohorts.find(c => c.id === cohortId);

      await cohortsApi.delete(cohortId, accessToken, orgId);
      clientAuditTrail.logDelete(orgId, 'cohort', cohortId, { name: cohort?.name || '' });

      setSuccess('Cohort deleted successfully');
      loadCohorts();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      const errorMsg = getErrorMessage(err, 'Failed to delete cohort');
      setError(errorMsg);
    }
  };

  const filteredCohorts = cohorts.filter(cohort =>
    cohort.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const stats = [
    {
      title: 'Total Cohorts',
      value: cohorts.length,
      icon: Users,
      trend: 'Active cohorts',
    },
    {
      title: 'Total Students',
      value: cohorts.reduce((sum, c) => sum + c.total_students, 0),
      icon: Users,
      trend: `Across ${cohorts.length} cohort(s)`,
    },
    {
      title: 'Programs',
      value: new Set(cohorts.map(c => c.program)).size,
      icon: MapPin,
      trend: 'Unique programs',
    },
    {
      title: 'Graduation Years',
      value: new Set(cohorts.map(c => c.graduation_year)).size,
      icon: Calendar,
      trend: 'Year range',
    },
  ];

  return (
    <PageWrapper title="Cohorts Management">
      <ContentBreadcrumb current="Cohorts Management" />

      <motion.div className="py-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Cohorts Management</h1>
            <p className="text-slate-600 mt-1">Manage student batches and groups</p>
          </div>
          <ProtectedAction action="manage_cohorts">
            <button
              onClick={handleAddCohort}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Cohort
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, idx) => (
            <motion.div key={idx} variants={itemVariant}>
              <StatCard {...stat} />
            </motion.div>
          ))}
        </div>

        {/* Search and Filters */}
        <motion.div variants={itemVariant} className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search cohorts by name..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterProgram}
              onChange={e => {
                setFilterProgram(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Programs</option>
              {Array.from(new Set(cohorts.map(c => c.program))).map(prog => (
                <option key={prog} value={prog}>
                  {prog}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Cohorts List */}
        <motion.div variants={itemVariant} className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : filteredCohorts.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">No cohorts found</p>
              <p className="text-slate-500 text-sm">Create a new cohort to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-semibold">Name</th>
                    <th className="text-left p-4 font-semibold">Program</th>
                    <th className="text-left p-4 font-semibold">Graduation Year</th>
                    <th className="text-left p-4 font-semibold">Campus</th>
                    <th className="text-left p-4 font-semibold">Students</th>
                    <th className="text-left p-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCohorts.map((cohort, idx) => (
                    <motion.tr
                      key={cohort.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="border-b hover:bg-slate-50"
                    >
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{cohort.name}</p>
                          {cohort.description && (
                            <p className="text-sm text-slate-500">{cohort.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">{cohort.program}</td>
                      <td className="p-4">{cohort.graduation_year}</td>
                      <td className="p-4">{cohort.campus || '-'}</td>
                      <td className="p-4">{cohort.total_students}</td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          <ProtectedAction action="manage_cohorts">
                            <button className="p-1 hover:bg-blue-100 rounded">
                              <Eye className="w-4 h-4 text-blue-600" />
                            </button>
                          </ProtectedAction>
                          {can('manage_cohorts') && (
                            <>
                              <button
                                onClick={() => handleEditCohort(cohort)}
                                className="p-1 hover:bg-yellow-100 rounded"
                              >
                                <Edit className="w-4 h-4 text-yellow-600" />
                              </button>
                              <button
                                onClick={() => handleDeleteCohort(cohort.id)}
                                className="p-1 hover:bg-red-100 rounded"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t flex justify-between items-center">
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

        {/* Add/Edit Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
              onClick={() => !submitting && setShowForm(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-lg shadow-lg max-w-md w-full p-6"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">
                    {editingId ? 'Edit Cohort' : 'New Cohort'}
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
                      placeholder="e.g., 2024 Batch A"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Program *</label>
                    <input
                      type="text"
                      value={formData.program}
                      onChange={e => setFormData({ ...formData, program: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., B.Tech CS"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Graduation Year</label>
                    <input
                      type="number"
                      value={formData.graduation_year}
                      onChange={e =>
                        setFormData({ ...formData, graduation_year: parseInt(e.target.value) })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Campus</label>
                    <input
                      type="text"
                      value={formData.campus || ''}
                      onChange={e => setFormData({ ...formData, campus: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Bangalore"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Optional description..."
                    />
                  </div>
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
                    onClick={handleSaveCohort}
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
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

export default Cohorts;
