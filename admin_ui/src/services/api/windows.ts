/**
 * Interview Windows API
 * 
 * Implements backend routes: POST/GET/PUT/DELETE /api/v1/admin/windows
 * 
 * SRS refs: FR-4 (scheduling), FR-6 (interview windows)
 */

import { adminApiClient } from './adminApiClient';
import type {
  InterviewWindowResponse,
  InterviewWindowCreateRequest,
  InterviewWindowUpdateRequest,
  InterviewWindowListResponse,
  InterviewWindowDetailResponse,
} from '@/types/admin-api';

export const windowsApi = {
  /**
   * List all interview windows with pagination and filters
   * GET /api/v1/admin/windows
   */
  list: async (
    token: string,
    organizationId?: number,
    params?: {
      page?: number;
      per_page?: number;
      is_active?: boolean;
    },
  ): Promise<InterviewWindowListResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.per_page) query.append('per_page', String(params.per_page));
    if (params?.is_active !== undefined) query.append('is_active', String(params.is_active));

    const queryString = query.toString();
    const endpoint = queryString ? `/api/v1/admin/windows?${queryString}` : '/api/v1/admin/windows';

    return adminApiClient.get(endpoint, token, organizationId);
  },

  /**
   * Create new interview window
   * POST /api/v1/admin/windows
   */
  create: async (
    data: InterviewWindowCreateRequest,
    token: string,
    organizationId?: number,
  ): Promise<InterviewWindowDetailResponse> => {
    return adminApiClient.post('/api/v1/admin/windows', data, token, organizationId);
  },

  /**
   * Get single interview window by ID
   * GET /api/v1/admin/windows/{id}
   */
  get: async (
    windowId: number,
    token: string,
    organizationId?: number,
  ): Promise<InterviewWindowDetailResponse> => {
    return adminApiClient.get(
      `/api/v1/admin/windows/${windowId}`,
      token,
      organizationId,
    );
  },

  /**
   * Update existing interview window
   * PUT /api/v1/admin/windows/{id}
   */
  update: async (
    windowId: number,
    data: InterviewWindowUpdateRequest,
    token: string,
    organizationId?: number,
  ): Promise<InterviewWindowDetailResponse> => {
    return adminApiClient.put(
      `/api/v1/admin/windows/${windowId}`,
      data,
      token,
      organizationId,
    );
  },

  /**
   * Soft-delete interview window (deactivate/archive)
   * DELETE /api/v1/admin/windows/{id}
   */
  delete: async (
    windowId: number,
    token: string,
    organizationId?: number,
  ): Promise<void> => {
    await adminApiClient.delete(
      `/api/v1/admin/windows/${windowId}`,
      token,
      organizationId,
    );
  },
};
