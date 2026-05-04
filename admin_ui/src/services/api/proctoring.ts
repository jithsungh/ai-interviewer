/**
 * Proctoring API
 * 
 * Provides review queue, risk score, and event inspection endpoints.
 */

import { adminApiClient } from './adminApiClient';
import type {
  ProctoringMonitoringSessionsResponse,
  ProctoringReviewQueueResponse,
  RiskScoreResponse,
  ProctoringEventResponse,
  LatestProctoringRecordingResponse,
  ProctoringRecordingArtifactResponse,
} from '@/types/admin-api';

export const proctoringApi = {
  /**
   * Get the admin review queue for flagged submissions.
   * GET /api/v1/proctoring/review-queue
   */
  getReviewQueue: async (
    token: string,
    params?: { limit?: number; offset?: number },
  ): Promise<ProctoringReviewQueueResponse> => {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));
    const queryString = query.toString();
    const endpoint = queryString ? `/api/v1/proctoring/review-queue?${queryString}` : '/api/v1/proctoring/review-queue';
    return adminApiClient.get(endpoint, token);
  },

  /**
   * Get in-progress submissions for live monitoring.
   * GET /api/v1/proctoring/monitoring-sessions
   */
  getMonitoringSessions: async (
    token: string,
    params?: { limit?: number; offset?: number; status?: string; window_id?: number },
  ): Promise<ProctoringMonitoringSessionsResponse> => {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));
    if (params?.status) query.append('status', params.status);
    if (typeof params?.window_id === 'number') query.append('window_id', String(params.window_id));
    const queryString = query.toString();
    const endpoint = queryString
      ? `/api/v1/proctoring/monitoring-sessions?${queryString}`
      : '/api/v1/proctoring/monitoring-sessions';
    return adminApiClient.get(endpoint, token);
  },

  /**
   * Get risk score details for a submission.
   * GET /api/v1/proctoring/risk/{submission_id}
   */
  getRiskScore: async (
    submissionId: number,
    token: string,
  ): Promise<RiskScoreResponse> => {
    return adminApiClient.get(`/api/v1/proctoring/risk/${submissionId}`, token);
  },

  /**
   * Get proctoring events for a submission.
   * GET /api/v1/proctoring/events/{submission_id}
   */
  getEvents: async (
    submissionId: number,
    token: string,
  ): Promise<ProctoringEventResponse[]> => {
    return adminApiClient.get(`/api/v1/proctoring/events/${submissionId}`, token);
  },

  /**
   * Get the newest recording artifact for a submission.
   * GET /api/v1/proctoring/recordings/{submission_id}/latest
   * Throws ApiError with 404 if no recording exists.
   */
  getLatestRecording: async (
    submissionId: number,
    token: string,
  ): Promise<LatestProctoringRecordingResponse> => {
    return adminApiClient.get(`/api/v1/proctoring/recordings/${submissionId}/latest`, token);
  },

  /**
   * List recording artifacts for a submission.
   * GET /api/v1/proctoring/recordings/{submission_id}
   */
  getRecordings: async (
    submissionId: number,
    token: string,
  ): Promise<ProctoringRecordingArtifactResponse[]> => {
    return adminApiClient.get(`/api/v1/proctoring/recordings/${submissionId}`, token);
  },

  /**
   * Resolve a recording artifact to a playable URL.
   * GET /api/v1/proctoring/recordings/{submission_id}/playback/{artifact_id}
   */
  getPlayback: async (
    submissionId: number,
    artifactId: string,
    token: string,
  ): Promise<{ presigned_url?: string; error?: string }> => {
    return adminApiClient.get(`/api/v1/proctoring/recordings/${submissionId}/playback/${artifactId}`, token);
  },
};
