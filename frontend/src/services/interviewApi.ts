// =============================================
// Interview API Service — REST endpoints
// Maps to /api/v1/interviews/* from openapi.json
// =============================================

import { apiClient } from '@/services/apiClient';
import type {
  APIInterviewSessionDTO,
  APIInterviewSessionDetailDTO,
  APIExchangeListResponse,
  APISectionProgressResponse,
} from '@/types/api';

export async function startInterview(data: {
  submission_id: number;
  consent_accepted: boolean;
}): Promise<APIInterviewSessionDTO> {
  return apiClient.post<APIInterviewSessionDTO>('/interviews/sessions/start', data);
}

export async function getSessionStatus(
  submissionId: number,
): Promise<APIInterviewSessionDetailDTO> {
  return apiClient.get<APIInterviewSessionDetailDTO>(
    `/interviews/sessions/${submissionId}/status`,
  );
}

export async function completeInterview(data: {
  submission_id: number;
}): Promise<APIInterviewSessionDTO> {
  return apiClient.post<APIInterviewSessionDTO>('/interviews/sessions/complete', data);
}

export async function getInterviewProgress(
  submissionId: number,
): Promise<APISectionProgressResponse> {
  return apiClient.get<APISectionProgressResponse>(
    `/interviews/${submissionId}/progress`,
  );
}

export async function getInterviewExchanges(
  submissionId: number,
  params?: { include_responses?: boolean; section?: string },
): Promise<APIExchangeListResponse> {
  return apiClient.get<APIExchangeListResponse>(
    `/interviews/${submissionId}/exchanges`,
    params as Record<string, string | number | boolean | undefined>,
  );
}
