/**
 * Bulk Operations API Service
 * 
 * Support for bulk candidate onboarding, invites, publish, and other batch operations
 * for university career resource teams.
 * 
 * SRS refs: FR-2.6 (bulk operations), FR-2.7 (bulk invites)
 */

import { adminApiClient } from './adminApiClient';

export interface BulkCandidateImportRequest {
  cohort_id: number;
  candidates: Array<{
    email: string;
    name?: string;
    roll_number?: string;
    branch?: string;
    cgpa?: number;
    skills?: string[];
    certifications?: string[];
  }>;
  send_invitations?: boolean;
  template_id?: number;  // For auto-invites
}

export interface BulkCandidateImportResult {
  total_imported: number;
  successful: number;
  failed: number;
  errors: Array<{
    row: number;
    email: string;
    error: string;
  }>;
}

export interface BulkActionRequest {
  action: 'PUBLISH' | 'ARCHIVE' | 'REOPEN' | 'DELETE';
  entity_type: 'template' | 'window' | 'question' | 'role';
  entity_ids: number[];
  reason?: string;
}

export interface BulkInviteRequest {
  cohort_ids?: number[];
  role_ids?: number[];
  template_id: number;
  emails?: string[];  // Specific emails if not using cohort/role
  email_template?: 'default' | 'reminder' | 'urgent';
  schedule_for?: string;  // ISO datetime for scheduled sends
}

export interface BulkInviteResult {
  total_sent: number;
  scheduled: number;
  failed: number;
  errors: Array<{
    email: string;
    error: string;
  }>;
}

export interface BatchJobStatus {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress_percent: number;
  started_at: string;
  completed_at?: string;
  error_message?: string;
  result?: any;
}

export const bulkOperationsApi = {
  /**
   * Import candidates from CSV
   * POST /api/v1/admin/bulk/import-candidates
   */
  importCandidates: async (
    data: BulkCandidateImportRequest,
    token: string,
    organizationId?: number,
  ): Promise<BulkCandidateImportResult> => {
    return adminApiClient.post(
      '/api/v1/admin/bulk/import-candidates',
      data,
      token,
      organizationId,
    );
  },

  /**
   * Perform bulk action on resources (publish, archive, etc.)
   * POST /api/v1/admin/bulk/actions
   */
  performBulkAction: async (
    data: BulkActionRequest,
    token: string,
    organizationId?: number,
  ): Promise<{ updated_count: number; failed_count: number }> => {
    return adminApiClient.post(
      '/api/v1/admin/bulk/actions',
      data,
      token,
      organizationId,
    );
  },

  /**
   * Send bulk invitations
   * POST /api/v1/admin/bulk/invite
   */
  sendBulkInvites: async (
    data: BulkInviteRequest,
    token: string,
    organizationId?: number,
  ): Promise<BulkInviteResult> => {
    return adminApiClient.post(
      '/api/v1/admin/bulk/invite',
      data,
      token,
      organizationId,
    );
  },

  /**
   * Get status of bulk job
   * GET /api/v1/admin/bulk/jobs/{job_id}
   */
  getJobStatus: async (
    jobId: string,
    token: string,
    organizationId?: number,
  ): Promise<BatchJobStatus> => {
    return adminApiClient.get(
      `/api/v1/admin/bulk/jobs/${jobId}`,
      token,
      organizationId,
    );
  },

  /**
   * Cancel bulk job
   * DELETE /api/v1/admin/bulk/jobs/{job_id}
   */
  cancelJob: async (
    jobId: string,
    token: string,
    organizationId?: number,
  ): Promise<void> => {
    await adminApiClient.delete(
      `/api/v1/admin/bulk/jobs/${jobId}`,
      token,
      organizationId,
    );
  },
};

/**
 * Helper for tracking bulk job status
 */
export class BulkJobTracker {
  private jobId: string;
  private pollInterval = 1000;  // ms
  private maxAttempts = 300;  // 5 minutes max
  private currentAttempt = 0;

  constructor(jobId: string) {
    this.jobId = jobId;
  }

  async waitForCompletion(
    token: string,
    organizationId?: number,
    onProgress?: (status: BatchJobStatus) => void,
  ): Promise<BatchJobStatus> {
    while (this.currentAttempt < this.maxAttempts) {
      try {
        const status = await bulkOperationsApi.getJobStatus(this.jobId, token, organizationId);

        if (onProgress) {
          onProgress(status);
        }

        if (status.status === 'completed' || status.status === 'failed') {
          return status;
        }

        this.currentAttempt++;
        await new Promise(resolve => setTimeout(resolve, this.pollInterval));
      } catch (error) {
        console.error('Error checking job status:', error);
        this.currentAttempt++;
        await new Promise(resolve => setTimeout(resolve, this.pollInterval));
      }
    }

    throw new Error(`Job ${this.jobId} did not complete within timeout`);
  }
}
