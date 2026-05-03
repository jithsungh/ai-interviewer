/**
 * Eligibility Rules API Service
 * 
 * Manages eligibility filtering rules for candidates
 * (CGPA, backlog, branch, skills, certifications).
 * 
 * SRS refs: FR-1.4 (placement eligibility), FR-2.4 (eligibility engine)
 */

import { adminApiClient } from './adminApiClient';

export interface EligibilityRule {
  id?: number;
  field: 'cgpa' | 'backlog_count' | 'branch' | 'skills' | 'certifications' | 'custom';
  operator: '==' | '!=' | '>' | '>=' | '<' | '<=' | 'in' | 'not_in' | 'contains';
  value: string | number | string[];
  weight?: number;  // Priority/importance (0-100)
}

export interface EligibilityRuleSet {
  id: number;
  organization_id: number;
  name: string;
  description?: string;
  rules: EligibilityRule[];
  logic: 'AND' | 'OR';  // How to combine rules
  apply_to_cohorts?: number[];  // Cohort IDs this applies to
  apply_to_roles?: number[];  // Role IDs this applies to
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EligibilityRuleSetCreateRequest {
  name: string;
  description?: string;
  rules: EligibilityRule[];
  logic?: 'AND' | 'OR';
  apply_to_cohorts?: number[];
  apply_to_roles?: number[];
}

export interface EligibilityRuleSetUpdateRequest {
  name?: string;
  description?: string;
  rules?: EligibilityRule[];
  logic?: 'AND' | 'OR';
  apply_to_cohorts?: number[];
  apply_to_roles?: number[];
}

export interface EligibilityRuleSetListResponse {
  data: EligibilityRuleSet[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  meta: Record<string, any>;
}

export interface EligibilityRuleSetDetailResponse {
  data: EligibilityRuleSet;
  meta: Record<string, any>;
}

export const eligibilityRulesApi = {
  /**
   * List all eligibility rule sets
   * GET /api/v1/admin/eligibility-rules
   */
  list: async (
    token: string,
    organizationId?: number,
    params?: { page?: number; per_page?: number; is_active?: boolean },
  ): Promise<EligibilityRuleSetListResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.per_page) query.append('per_page', String(params.per_page));
    if (params?.is_active !== undefined) query.append('is_active', String(params.is_active));

    const queryString = query.toString();
    const endpoint = queryString
      ? `/api/v1/admin/eligibility-rules?${queryString}`
      : '/api/v1/admin/eligibility-rules';

    return adminApiClient.get(endpoint, token, organizationId);
  },

  /**
   * Create new eligibility rule set
   * POST /api/v1/admin/eligibility-rules
   */
  create: async (
    data: EligibilityRuleSetCreateRequest,
    token: string,
    organizationId?: number,
  ): Promise<EligibilityRuleSetDetailResponse> => {
    return adminApiClient.post('/api/v1/admin/eligibility-rules', data, token, organizationId);
  },

  /**
   * Get eligibility rule set by ID
   * GET /api/v1/admin/eligibility-rules/{id}
   */
  get: async (
    ruleSetId: number,
    token: string,
    organizationId?: number,
  ): Promise<EligibilityRuleSetDetailResponse> => {
    return adminApiClient.get(
      `/api/v1/admin/eligibility-rules/${ruleSetId}`,
      token,
      organizationId,
    );
  },

  /**
   * Update eligibility rule set
   * PUT /api/v1/admin/eligibility-rules/{id}
   */
  update: async (
    ruleSetId: number,
    data: EligibilityRuleSetUpdateRequest,
    token: string,
    organizationId?: number,
  ): Promise<EligibilityRuleSetDetailResponse> => {
    return adminApiClient.put(
      `/api/v1/admin/eligibility-rules/${ruleSetId}`,
      data,
      token,
      organizationId,
    );
  },

  /**
   * Delete eligibility rule set
   * DELETE /api/v1/admin/eligibility-rules/{id}
   */
  delete: async (
    ruleSetId: number,
    token: string,
    organizationId?: number,
  ): Promise<void> => {
    await adminApiClient.delete(
      `/api/v1/admin/eligibility-rules/${ruleSetId}`,
      token,
      organizationId,
    );
  },

  /**
   * Test eligibility rules against a candidate
   * POST /api/v1/admin/eligibility-rules/{id}/test
   */
  test: async (
    ruleSetId: number,
    candidateData: Record<string, any>,
    token: string,
    organizationId?: number,
  ): Promise<{ eligible: boolean; matched_rules: number[] }> => {
    return adminApiClient.post(
      `/api/v1/admin/eligibility-rules/${ruleSetId}/test`,
      candidateData,
      token,
      organizationId,
    );
  },
};
