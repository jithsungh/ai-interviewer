/**
 * Rubrics API
 * 
 * Implements backend routes: POST/GET/PUT/DELETE /api/v1/admin/rubrics
 * 
 * SRS refs: FR-8.2 (evaluation rubric management)
 */

import { adminApiClient } from './adminApiClient';
import type {
  RubricResponse,
  RubricCreateRequest,
  RubricUpdateRequest,
  RubricListResponse,
  RubricDetailResponse,
} from '@/types/admin-api';

export const rubricsApi = {
  /**
   * List all rubrics with pagination and filters
   * GET /api/v1/admin/rubrics
   */
  list: async (
    token: string,
    organizationId?: number,
    params?: {
      page?: number;
      per_page?: number;
      is_active?: boolean;
    },
  ): Promise<RubricListResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.per_page) query.append('per_page', String(params.per_page));
    if (params?.is_active !== undefined) query.append('is_active', String(params.is_active));

    const queryString = query.toString();
    const endpoint = queryString ? `/api/v1/admin/rubrics?${queryString}` : '/api/v1/admin/rubrics';

    return adminApiClient.get(endpoint, token, organizationId);
  },

  /**
   * Create new rubric
   * POST /api/v1/admin/rubrics
   */
  create: async (
    data: RubricCreateRequest,
    token: string,
    organizationId?: number,
  ): Promise<RubricDetailResponse> => {
    return adminApiClient.post('/api/v1/admin/rubrics', data, token, organizationId);
  },

  /**
   * Get single rubric by ID
   * GET /api/v1/admin/rubrics/{id}
   */
  get: async (
    rubricId: number,
    token: string,
    organizationId?: number,
  ): Promise<RubricDetailResponse> => {
    return adminApiClient.get(
      `/api/v1/admin/rubrics/${rubricId}`,
      token,
      organizationId,
    );
  },

  /**
   * Update existing rubric
   * PUT /api/v1/admin/rubrics/{id}
   */
  update: async (
    rubricId: number,
    data: RubricUpdateRequest,
    token: string,
    organizationId?: number,
  ): Promise<RubricDetailResponse> => {
    return adminApiClient.put(
      `/api/v1/admin/rubrics/${rubricId}`,
      data,
      token,
      organizationId,
    );
  },

  /**
   * Soft-delete rubric (deactivate)
   * DELETE /api/v1/admin/rubrics/{id}
   */
  delete: async (
    rubricId: number,
    token: string,
    organizationId?: number,
  ): Promise<void> => {
    await adminApiClient.delete(
      `/api/v1/admin/rubrics/${rubricId}`,
      token,
      organizationId,
    );
  },
};
