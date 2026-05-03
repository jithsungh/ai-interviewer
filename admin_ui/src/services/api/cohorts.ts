/**
 * Cohorts API Service
 * 
 * Manages student cohorts/batches at the university level
 * (graduation year, program, campus, section).
 * 
 * SRS refs: FR-1 (interview scope), FR-2 (cohort management)
 */

import { adminApiClient } from './adminApiClient';

export interface CohortResponse {
  id: number;
  organization_id: number;
  name: string;
  description?: string;
  graduation_year: number;
  program: string;  // e.g., "B.Tech CS", "MBA"
  campus?: string;
  section?: string;
  total_students: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CohortCreateRequest {
  name: string;
  description?: string;
  graduation_year: number;
  program: string;
  campus?: string;
  section?: string;
}

export interface CohortUpdateRequest {
  name?: string;
  description?: string;
  program?: string;
  campus?: string;
  section?: string;
}

export interface CohortListResponse {
  data: CohortResponse[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  meta: Record<string, any>;
}

export interface CohortDetailResponse {
  data: CohortResponse;
  meta: Record<string, any>;
}

export const cohortsApi = {
  /**
   * List all cohorts with pagination
   * GET /api/v1/admin/cohorts
   */
  list: async (
    token: string,
    organizationId?: number,
    params?: { page?: number; per_page?: number; program?: string; graduation_year?: number },
  ): Promise<CohortListResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.per_page) query.append('per_page', String(params.per_page));
    if (params?.program) query.append('program', params.program);
    if (params?.graduation_year) query.append('graduation_year', String(params.graduation_year));

    const queryString = query.toString();
    const endpoint = queryString ? `/api/v1/admin/cohorts?${queryString}` : '/api/v1/admin/cohorts';

    return adminApiClient.get(endpoint, token, organizationId);
  },

  /**
   * Create new cohort
   * POST /api/v1/admin/cohorts
   */
  create: async (
    data: CohortCreateRequest,
    token: string,
    organizationId?: number,
  ): Promise<CohortDetailResponse> => {
    return adminApiClient.post('/api/v1/admin/cohorts', data, token, organizationId);
  },

  /**
   * Get cohort by ID
   * GET /api/v1/admin/cohorts/{cohort_id}
   */
  get: async (
    cohortId: number,
    token: string,
    organizationId?: number,
  ): Promise<CohortDetailResponse> => {
    return adminApiClient.get(`/api/v1/admin/cohorts/${cohortId}`, token, organizationId);
  },

  /**
   * Update cohort
   * PUT /api/v1/admin/cohorts/{cohort_id}
   */
  update: async (
    cohortId: number,
    data: CohortUpdateRequest,
    token: string,
    organizationId?: number,
  ): Promise<CohortDetailResponse> => {
    return adminApiClient.put(`/api/v1/admin/cohorts/${cohortId}`, data, token, organizationId);
  },

  /**
   * Deactivate cohort
   * DELETE /api/v1/admin/cohorts/{cohort_id}
   */
  delete: async (
    cohortId: number,
    token: string,
    organizationId?: number,
  ): Promise<void> => {
    await adminApiClient.delete(`/api/v1/admin/cohorts/${cohortId}`, token, organizationId);
  },
};
