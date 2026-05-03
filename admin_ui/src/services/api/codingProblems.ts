/**
 * Coding Problems API
 * 
 * Implements backend routes: POST/GET/PUT/DELETE /api/v1/admin/coding-problems
 * 
 * SRS refs: FR-8.4 (coding assessment management)
 */

import { adminApiClient } from './adminApiClient';
import type {
  CodingProblemResponse,
  CodingProblemCreateRequest,
  CodingProblemUpdateRequest,
  CodingProblemListResponse,
  CodingProblemDetailResponse,
} from '@/types/admin-api';

export const codingProblemsApi = {
  /**
   * List all coding problems with pagination and filters
   * GET /api/v1/admin/coding-problems
   */
  list: async (
    token: string,
    organizationId?: number,
    params?: {
      page?: number;
      per_page?: number;
      difficulty?: string;
      language?: string;
      is_active?: boolean;
    },
  ): Promise<CodingProblemListResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.per_page) query.append('per_page', String(params.per_page));
    if (params?.difficulty) query.append('difficulty', params.difficulty);
    if (params?.language) query.append('language', params.language);
    if (params?.is_active !== undefined) query.append('is_active', String(params.is_active));

    const queryString = query.toString();
    const endpoint = queryString ? `/api/v1/admin/coding-problems?${queryString}` : '/api/v1/admin/coding-problems';

    return adminApiClient.get(endpoint, token, organizationId);
  },

  /**
   * Create new coding problem
   * POST /api/v1/admin/coding-problems
   */
  create: async (
    data: CodingProblemCreateRequest,
    token: string,
    organizationId?: number,
  ): Promise<CodingProblemDetailResponse> => {
    return adminApiClient.post('/api/v1/admin/coding-problems', data, token, organizationId);
  },

  /**
   * Get single coding problem by ID
   * GET /api/v1/admin/coding-problems/{id}
   */
  get: async (
    problemId: number,
    token: string,
    organizationId?: number,
  ): Promise<CodingProblemDetailResponse> => {
    return adminApiClient.get(
      `/api/v1/admin/coding-problems/${problemId}`,
      token,
      organizationId,
    );
  },

  /**
   * Update existing coding problem
   * PUT /api/v1/admin/coding-problems/{id}
   */
  update: async (
    problemId: number,
    data: CodingProblemUpdateRequest,
    token: string,
    organizationId?: number,
  ): Promise<CodingProblemDetailResponse> => {
    return adminApiClient.put(
      `/api/v1/admin/coding-problems/${problemId}`,
      data,
      token,
      organizationId,
    );
  },

  /**
   * Soft-delete coding problem (deactivate)
   * DELETE /api/v1/admin/coding-problems/{id}
   */
  delete: async (
    problemId: number,
    token: string,
    organizationId?: number,
  ): Promise<void> => {
    await adminApiClient.delete(
      `/api/v1/admin/coding-problems/${problemId}`,
      token,
      organizationId,
    );
  },
};
