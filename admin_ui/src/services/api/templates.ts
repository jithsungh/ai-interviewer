/**
 * Template Management API
 * 
 * Implements backend routes: POST/GET/PUT/DELETE /api/v1/admin/templates
 * with support for overrides (tenant-specific customizations)
 * 
 * SRS refs: FR-8.3 (knowledge base), DR-9 (versioning)
 */

import { adminApiClient } from './adminApiClient';
import type {
  TemplateResponse,
  TemplateCreateRequest,
  TemplateUpdateRequest,
  TemplateListResponse,
  TemplateDetailResponse,
} from '@/types/admin-api';

export const templatesApi = {
  /**
   * List all templates with pagination
   * GET /api/v1/admin/templates
   */
  list: async (
    token: string,
    organizationId?: number,
    params?: { page?: number; per_page?: number; is_active?: boolean },
  ): Promise<TemplateListResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.per_page) query.append('per_page', String(params.per_page));
    if (params?.is_active !== undefined) query.append('is_active', String(params.is_active));

    const queryString = query.toString();
    const endpoint = queryString ? `/api/v1/admin/templates?${queryString}` : '/api/v1/admin/templates';

    return adminApiClient.get(endpoint, token, organizationId);
  },

  /**
   * Create new interview template
   * POST /api/v1/admin/templates
   */
  create: async (
    data: TemplateCreateRequest,
    token: string,
    organizationId?: number,
  ): Promise<TemplateDetailResponse> => {
    return adminApiClient.post('/api/v1/admin/templates', data, token, organizationId);
  },

  /**
   * Get single template by ID
   * GET /api/v1/admin/templates/{template_id}
   */
  get: async (
    templateId: number,
    token: string,
    organizationId?: number,
  ): Promise<TemplateDetailResponse> => {
    return adminApiClient.get(
      `/api/v1/admin/templates/${templateId}`,
      token,
      organizationId,
    );
  },

  /**
   * Update existing template
   * PUT /api/v1/admin/templates/{template_id}
   */
  update: async (
    templateId: number,
    data: TemplateUpdateRequest,
    token: string,
    organizationId?: number,
  ): Promise<TemplateDetailResponse> => {
    return adminApiClient.put(
      `/api/v1/admin/templates/${templateId}`,
      data,
      token,
      organizationId,
    );
  },

  /**
   * Soft-delete template (deactivate)
   * DELETE /api/v1/admin/templates/{template_id}
   */
  delete: async (
    templateId: number,
    token: string,
    organizationId?: number,
  ): Promise<void> => {
    await adminApiClient.delete(
      `/api/v1/admin/templates/${templateId}`,
      token,
      organizationId,
    );
  },

  /**
   * Reactivate deactivated template
   * PUT /api/v1/admin/templates/{template_id}/activate
   */
  activate: async (
    templateId: number,
    token: string,
    organizationId?: number,
  ): Promise<TemplateDetailResponse> => {
    return adminApiClient.put(
      `/api/v1/admin/templates/${templateId}/activate`,
      {},
      token,
      organizationId,
    );
  },

  /**
   * Create organization-specific override for base template
   * POST /api/v1/admin/templates/{template_id}/overrides
   */
  createOverride: async (
    templateId: number,
    data: any,
    token: string,
    organizationId?: number,
  ): Promise<any> => {
    return adminApiClient.post(
      `/api/v1/admin/templates/${templateId}/overrides`,
      data,
      token,
      organizationId,
    );
  },

  /**
   * Get current org's template override
   * GET /api/v1/admin/templates/{template_id}/overrides
   */
  getOverride: async (
    templateId: number,
    token: string,
    organizationId?: number,
  ): Promise<any> => {
    return adminApiClient.get(
      `/api/v1/admin/templates/${templateId}/overrides`,
      token,
      organizationId,
    );
  },

  /**
   * Update template override
   * PUT /api/v1/admin/templates/{template_id}/overrides
   */
  updateOverride: async (
    templateId: number,
    data: any,
    token: string,
    organizationId?: number,
  ): Promise<any> => {
    return adminApiClient.put(
      `/api/v1/admin/templates/${templateId}/overrides`,
      data,
      token,
      organizationId,
    );
  },

  /**
   * Delete override (revert to base template)
   * DELETE /api/v1/admin/templates/{template_id}/overrides
   */
  deleteOverride: async (
    templateId: number,
    token: string,
    organizationId?: number,
  ): Promise<void> => {
    await adminApiClient.delete(
      `/api/v1/admin/templates/${templateId}/overrides`,
      token,
      organizationId,
    );
  },
};
