// =============================================
// Candidate Service — API calls + adapter mapping
// =============================================

import { apiClient } from '@/services/apiClient';
import {
  mapCurrentUser,
  mapCandidateProfile,
  mapCandidateStats,
  mapCandidateWindows,
  mapCandidateSubmissions,
  mapInterviewResult,
  mapExchangeItems,
  mapPracticeSkill,
  mapPracticeQuestion,
  type CandidatePerformanceStatsUI,
  type PracticeSkillUI,
  type PracticeQuestionUI,
} from '@/adapters/candidateAdapters';

import type {
  CurrentUserResponse,
  APICandidateProfileResponse,
  APICandidateSettingsResponse,
  APICandidateSettingsUpdateRequest,
  APIActiveCareerRoadmapResponse,
  APICareerRoadmapHistoryResponse,
  APICareerRoadmapResponse,
  APIGenerateCareerInsightsRequest,
  APIGenerateCareerInsightsResponse,
  APIGenerateCareerRoadmapRequest,
  APICandidateStatsResponse,
  APICandidateWindowListResponse,
  APICandidateSubmissionListResponse,
  APIUpdateCareerRoadmapProgressRequest,
  APIExchangeListResponse,
  APISubmissionResultsResponse,
  APIPracticeQuestionListResponse,
  APIGeneratePracticeFlashcardsRequest,
  APIPracticeFlashcardDeckActiveResponse,
  APIPracticeFlashcardDeckHistoryResponse,
  APIPracticeFlashcardDeckResponse,
  APIUpdatePracticeFlashcardDeckProgressRequest,
  APIPracticeTemplateListResponse,
  APIPracticeTemplateDTO,
  APIStartPracticeRequest,
  APIStartPracticeResponse,
  APIResumeDTO,
  APIResumeListResponse,
  APIResumeUploadResponse,
  APIChangePasswordRequest,
  APIChangePasswordResponse,
  APIProctoringEventInput,
  APIProctoringEventIngestionResult,
  APIRiskScoreResponse,
  LoginRequest,
  LoginResponse,
} from '@/types/api';

import type {
  User,
  Candidate,
  InterviewSubmissionWindow,
  InterviewSubmission,
  InterviewExchange,
  InterviewResult,
} from '@/types/database';

// Re-export for convenience
export type { CandidatePerformanceStatsUI, PracticeSkillUI, PracticeQuestionUI };
export type { APIPracticeTemplateDTO } from '@/types/api';

// =============================================
// Service Methods
// =============================================

// ---- Auth ----

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>('/auth/login', credentials);
}

export async function changePassword(
  data: APIChangePasswordRequest,
): Promise<APIChangePasswordResponse> {
  return apiClient.post<APIChangePasswordResponse>('/auth/change-password', data);
}

export async function getCurrentUser(): Promise<User> {
  const response = await apiClient.get<CurrentUserResponse>('/auth/me');
  return mapCurrentUser(response);
}

// ---- Profile ----

export async function getCandidateProfile(): Promise<{
  user: User;
  candidate: Candidate;
}> {
  const response = await apiClient.get<APICandidateProfileResponse>('/candidate/profile');
  return mapCandidateProfile(response);
}

export async function updateCandidateProfile(
  data: Partial<APICandidateProfileResponse>,
): Promise<{ user: User; candidate: Candidate }> {
  const response = await apiClient.put<APICandidateProfileResponse>('/candidate/profile', data);
  return mapCandidateProfile(response);
}

// ---- Settings ----

export async function getCandidateSettings(): Promise<APICandidateSettingsResponse> {
  return apiClient.get<APICandidateSettingsResponse>('/candidate/settings');
}

export async function updateCandidateSettings(
  data: APICandidateSettingsUpdateRequest,
): Promise<APICandidateSettingsResponse> {
  return apiClient.put<APICandidateSettingsResponse>('/candidate/settings', data);
}

// ---- Career Path ----

export async function generateCareerInsights(
  data: APIGenerateCareerInsightsRequest,
): Promise<APIGenerateCareerInsightsResponse> {
  return apiClient.post<APIGenerateCareerInsightsResponse>(
    '/candidate/career-path/insights/generate',
    data,
  );
}

export async function generateCareerRoadmap(
  data: APIGenerateCareerRoadmapRequest,
): Promise<APICareerRoadmapResponse> {
  return apiClient.post<APICareerRoadmapResponse>(
    '/candidate/career-path/roadmap/generate',
    data,
  );
}

export async function getActiveCareerRoadmap(): Promise<APICareerRoadmapResponse | null> {
  const response = await apiClient.get<APIActiveCareerRoadmapResponse>(
    '/candidate/career-path/roadmap/active',
  );
  return response.roadmap ?? null;
}

export async function getCareerRoadmapHistory(params?: {
  page?: number;
  per_page?: number;
}): Promise<APICareerRoadmapHistoryResponse> {
  return apiClient.get<APICareerRoadmapHistoryResponse>(
    '/candidate/career-path/roadmap/history',
    params,
  );
}

export async function updateCareerRoadmapProgress(
  roadmapId: number,
  data: APIUpdateCareerRoadmapProgressRequest,
): Promise<APICareerRoadmapResponse> {
  return apiClient.put<APICareerRoadmapResponse>(
    `/candidate/career-path/roadmap/${roadmapId}/progress`,
    data,
  );
}

// ---- Stats ----

export async function getCandidateStats(): Promise<CandidatePerformanceStatsUI> {
  const response = await apiClient.get<APICandidateStatsResponse>('/candidate/stats');
  return mapCandidateStats(response);
}

// ---- Windows ----

export async function getCandidateWindows(params?: {
  page?: number;
  per_page?: number;
}): Promise<{ data: InterviewSubmissionWindow[]; total: number }> {
  const response = await apiClient.get<APICandidateWindowListResponse>(
    '/candidate/windows',
    params,
  );
  return {
    data: mapCandidateWindows(response.data),
    total: response.pagination.total,
  };
}

// ---- Submissions ----

export async function getCandidateSubmissions(params?: {
  page?: number;
  per_page?: number;
  status?: string;
}): Promise<{ data: InterviewSubmission[]; total: number }> {
  const response = await apiClient.get<APICandidateSubmissionListResponse>(
    '/candidate/submissions',
    params,
  );
  return {
    data: mapCandidateSubmissions(response.data),
    total: response.pagination.total,
  };
}

// ---- Exchanges (for submission report) ----

export async function getSubmissionExchanges(
  submissionId: number,
): Promise<InterviewExchange[]> {
  const response = await apiClient.get<APIExchangeListResponse>(
    `/interviews/${submissionId}/exchanges`,
  );
  return mapExchangeItems(response.exchanges);
}

// ---- Results (for submission report) ----

export async function getSubmissionResults(
  submissionId: number,
): Promise<InterviewResult | undefined> {
  const response = await apiClient.get<APISubmissionResultsResponse>(
    `/evaluations/results/${submissionId}`,
  );
  const current = response.results.find((r) => r.result_id === response.current_result_id);
  if (!current) return response.results[0] ? mapInterviewResult(response.results[0]) : undefined;
  return mapInterviewResult(current);
}

// ---- Practice ----

export async function getPracticeQuestions(params?: {
  skill?: string;
  difficulty?: string;
  page?: number;
  per_page?: number;
}): Promise<{
  skills: PracticeSkillUI[];
  questions: PracticeQuestionUI[];
}> {
  const response = await apiClient.get<APIPracticeQuestionListResponse>(
    '/candidate/practice/questions',
    params,
  );
  return {
    skills: (response.skills ?? []).map(mapPracticeSkill),
    questions: response.questions.map(mapPracticeQuestion),
  };
}

export async function getPracticeTemplates(): Promise<APIPracticeTemplateDTO[]> {
  const response = await apiClient.get<APIPracticeTemplateListResponse>(
    '/candidate/practice/templates',
  );
  return response.templates;
}

export async function generatePracticeFlashcards(
  data: APIGeneratePracticeFlashcardsRequest,
): Promise<APIPracticeFlashcardDeckResponse> {
  return apiClient.post<APIPracticeFlashcardDeckResponse>(
    '/candidate/practice/decks/generate',
    data,
  );
}

export async function getActivePracticeFlashcardDeck(): Promise<APIPracticeFlashcardDeckResponse | null> {
  const response = await apiClient.get<APIPracticeFlashcardDeckActiveResponse>(
    '/candidate/practice/decks/active',
  );
  return response.deck ?? null;
}

export async function getPracticeFlashcardDeckHistory(params?: {
  page?: number;
  per_page?: number;
}): Promise<APIPracticeFlashcardDeckHistoryResponse> {
  return apiClient.get<APIPracticeFlashcardDeckHistoryResponse>(
    '/candidate/practice/decks/history',
    params,
  );
}

export async function getPracticeFlashcardDeck(deckId: number): Promise<APIPracticeFlashcardDeckResponse> {
  return apiClient.get<APIPracticeFlashcardDeckResponse>(`/candidate/practice/decks/${deckId}`);
}

export async function updatePracticeFlashcardDeckProgress(
  deckId: number,
  data: APIUpdatePracticeFlashcardDeckProgressRequest,
): Promise<APIPracticeFlashcardDeckResponse> {
  return apiClient.put<APIPracticeFlashcardDeckResponse>(
    `/candidate/practice/decks/${deckId}/progress`,
    data,
  );
}

export async function startPracticeSession(data: APIStartPracticeRequest): Promise<APIStartPracticeResponse> {
  return apiClient.post<APIStartPracticeResponse>('/candidate/practice/start', data);
}

// ---- Resumes ----

export async function getCandidateResumes(): Promise<APIResumeDTO[]> {
  const response = await apiClient.get<APIResumeListResponse>('/candidate/resumes');
  return response.data;
}

export async function uploadCandidateResume(file: File): Promise<APIResumeUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.postForm<APIResumeUploadResponse>('/candidate/resumes', formData);
}

// ---- Interview Session (start / complete) ----

export async function startInterviewSession(data: {
  submission_id: number;
  consent_accepted: boolean;
}) {
  return apiClient.post('/interviews/sessions/start', data);
}

export async function completeInterviewSession(data: { submission_id: number }) {
  return apiClient.post('/interviews/sessions/complete', data);
}

// ---- Report Generation ----

export async function generateReport(
  submissionId: number,
  forceRegenerate = false,
): Promise<InterviewResult | undefined> {
  const response = await apiClient.post<{
    result_id: number;
    interview_submission_id: number;
    final_score?: number | null;
    normalized_score?: number | null;
    result_status?: string | null;
    recommendation?: string | null;
    section_scores?: Record<string, number>;
    strengths?: string | null;
    weaknesses?: string | null;
    summary_notes?: string | null;
    generated_by: string;
    is_current: boolean;
    computed_at?: string | null;
    created_at?: string | null;
  }>('/evaluations/generate-report', {
    interview_submission_id: submissionId,
    force_regenerate: forceRegenerate,
  });
  return mapInterviewResult(response as any);
}

// ---- Exchange Evaluations (for report) ----

export interface ExchangeEvaluationData {
  exchange_id: number;
  evaluations: Array<{
    evaluation_id: number;
    interview_exchange_id: number;
    evaluator_type: string;
    total_score?: number | null;
    dimension_scores: Array<{
      rubric_dimension_id: number;
      dimension_name: string;
      score: number;
      max_score?: number | null;
      weight?: number | null;
      justification?: string | null;
    }>;
    is_final: boolean;
  }>;
  current_evaluation_id?: number | null;
}

export async function getExchangeEvaluations(
  exchangeId: number,
): Promise<ExchangeEvaluationData> {
  return apiClient.get<ExchangeEvaluationData>(
    `/evaluations/exchanges/${exchangeId}/evaluations`,
  );
}

// ---- Proctoring ----

export async function ingestProctoringEvent(
  data: APIProctoringEventInput,
): Promise<APIProctoringEventIngestionResult> {
  return apiClient.post<APIProctoringEventIngestionResult>('/proctoring/events', data);
}

export async function getProctoringRiskScore(
  submissionId: number,
): Promise<APIRiskScoreResponse> {
  return apiClient.get<APIRiskScoreResponse>(`/proctoring/risk/${submissionId}`);
}
