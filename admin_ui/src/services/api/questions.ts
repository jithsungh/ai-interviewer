/**
 * Question Bank API
 * 
 * Implements backend routes: POST/GET/PUT/DELETE /api/v1/admin/questions
 * with support for overrides (tenant-specific customizations)
 * 
 * SRS refs: FR-8.3 (knowledge base management)
 */

import { adminApiClient } from './adminApiClient';
import type {
  QuestionResponse,
  QuestionCreateRequest,
  QuestionUpdateRequest,
  QuestionListResponse,
  QuestionDetailResponse,
} from '@/types/admin-api';

export const questionsApi = {
  /**
   * List all questions with pagination and filters
   * GET /api/v1/admin/questions
   */
  list: async (
    token: string,
    organizationId?: number,
    params?: {
      page?: number;
      per_page?: number;
      question_type?: string;
      difficulty?: string;
      domain?: string;
      is_active?: boolean;
    },
  ): Promise<QuestionListResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.per_page) query.append('per_page', String(params.per_page));
    if (params?.question_type) query.append('question_type', params.question_type);
    if (params?.difficulty) query.append('difficulty', params.difficulty);
    if (params?.domain) query.append('domain', params.domain);
    if (params?.is_active !== undefined) query.append('is_active', String(params.is_active));

    const queryString = query.toString();
    const endpoint = queryString ? `/api/v1/admin/questions?${queryString}` : '/api/v1/admin/questions';

    return adminApiClient.get(endpoint, token, organizationId);
  },

  /**
   * Create new question
   * POST /api/v1/admin/questions
   */
  create: async (
    data: QuestionCreateRequest,
    token: string,
    organizationId?: number,
  ): Promise<QuestionDetailResponse> => {
    return adminApiClient.post('/api/v1/admin/questions', data, token, organizationId);
  },

  /**
   * Get single question by ID
   * GET /api/v1/admin/questions/{id}
   */
  get: async (
    questionId: number,
    token: string,
    organizationId?: number,
  ): Promise<QuestionDetailResponse> => {
    return adminApiClient.get(
      `/api/v1/admin/questions/${questionId}`,
      token,
      organizationId,
    );
  },

  /**
   * Update existing question
   * PUT /api/v1/admin/questions/{id}
   */
  update: async (
    questionId: number,
    data: QuestionUpdateRequest,
    token: string,
    organizationId?: number,
  ): Promise<QuestionDetailResponse> => {
    return adminApiClient.put(
      `/api/v1/admin/questions/${questionId}`,
      data,
      token,
      organizationId,
    );
  },

  /**
   * Soft-delete question (deactivate)
   * DELETE /api/v1/admin/questions/{id}
   */
  delete: async (
    questionId: number,
    token: string,
    organizationId?: number,
  ): Promise<void> => {
    await adminApiClient.delete(
      `/api/v1/admin/questions/${questionId}`,
      token,
      organizationId,
    );
  },

  /**
   * Create organization-specific override for base question
   * POST /api/v1/admin/questions/{id}/overrides
   */
  createOverride: async (
    questionId: number,
    data: any,
    token: string,
    organizationId?: number,
  ): Promise<any> => {
    return adminApiClient.post(
      `/api/v1/admin/questions/${questionId}/overrides`,
      data,
      token,
      organizationId,
    );
  },
};
