// =============================================
// API Response Types — derived from openapi.json
// These types represent the exact shape returned by the backend.
// Do NOT use these directly in UI components.
// =============================================

// ---- Pagination ----
export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

// ---- Auth ----
export interface LoginRequest {
  email: string;
  password: string;
}

export interface APIChangePasswordRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface APIChangePasswordResponse {
  message: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserProfileResponse;
}

export interface UserProfileResponse {
  user_id: number;
  email: string;
  user_type: 'admin' | 'candidate';
  admin_id?: number | null;
  organization_id?: number | null;
  admin_role?: 'superadmin' | 'admin' | 'read_only' | null;
  candidate_id?: number | null;
  full_name?: string | null;
}

export interface CurrentUserResponse extends UserProfileResponse {}

export interface RegistrationResponse {
  user_id: number;
  email: string;
  user_type: 'admin' | 'candidate';
  message: string;
}

export interface CandidateRegistrationRequest {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
  location?: string;
  bio?: string;
  experience_years?: number;
  skills?: string[];
  linkedin_url?: string;
  github_url?: string;
}

// ---- Candidate Profile ----
export interface APICandidateProfileResponse {
  candidate_id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
  experience_years?: number | null;
  cgpa?: number | null;
  skills: string[];
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  education: Record<string, unknown>[];
  work_experience: Record<string, unknown>[];
  plan: string;
  created_at?: string | null;
}

// ---- Candidate Settings ----
export interface APISettingsNotificationPreferences {
  email: boolean;
  interview: boolean;
  reports: boolean;
  marketing: boolean;
}

export interface APISettingsPrivacyPreferences {
  profileVisible: boolean;
  shareResults: boolean;
  allowAnalytics: boolean;
}

export interface APISettingsUiPreferences {
  theme: string;
  interview_customization?: Record<string, unknown>;
  interview_avatar?: Record<string, unknown>;
}

export interface APICandidateSettingsResponse {
  candidate_id: number;
  notification_preferences: APISettingsNotificationPreferences;
  privacy_preferences: APISettingsPrivacyPreferences;
  ui_preferences: APISettingsUiPreferences;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface APICandidateSettingsUpdateRequest {
  notification_preferences?: Partial<APISettingsNotificationPreferences>;
  privacy_preferences?: Partial<APISettingsPrivacyPreferences>;
  ui_preferences?: Partial<APISettingsUiPreferences>;
}

// ---- Candidate Career Path ----
export interface APICareerMarketInsight {
  role: string;
  industryTag: string;
  icon: string;
  skills: string[];
  minPackage: number;
  maxPackage: number;
  growth: number;
  trend: 'up' | 'stable' | 'down' | string;
}

export interface APIGenerateCareerInsightsRequest {
  industry: string;
  seniority: string;
  use_cached?: boolean;
}

export interface APIGenerateCareerInsightsResponse {
  run_id: number;
  industry: string;
  seniority: string;
  generation_source: string;
  model_provider?: string | null;
  model_name?: string | null;
  insights: APICareerMarketInsight[];
  created_at: string;
}

export interface APICareerRoadmapStep {
  level: number;
  levelLabel: 'INTERN' | 'JUNIOR' | 'SENIOR' | 'EXECUTIVE' | string;
  roleTitle: string;
  requiredCourses: string[];
  keyLearning: string;
  certification: string;
}

export interface APIGenerateCareerRoadmapRequest {
  role: string;
  industry: string;
  insight_run_id?: number;
  selected_insight?: APICareerMarketInsight;
}

export interface APICareerRoadmapResponse {
  roadmap_id: number;
  candidate_id: number;
  insight_run_id?: number | null;
  industry: string;
  target_role: string;
  selected_insight?: APICareerMarketInsight | null;
  steps: APICareerRoadmapStep[];
  completed_levels: number[];
  current_level: number;
  is_active: boolean;
  generation_source: string;
  model_provider?: string | null;
  model_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface APIActiveCareerRoadmapResponse {
  roadmap?: APICareerRoadmapResponse | null;
}

export interface APICareerRoadmapHistoryResponse {
  data: APICareerRoadmapResponse[];
  pagination: PaginationMeta;
}

export interface APIUpdateCareerRoadmapProgressRequest {
  completed_levels: number[];
  current_level?: number;
}

// ---- Candidate Stats ----
export interface APIScoreHistoryPoint {
  date: string;
  score?: number | null;
}

export interface APISkillBreakdownItem {
  skill: string;
  score?: number | null;
}

export interface APICandidateStatsResponse {
  total_interviews: number;
  average_score?: number | null;
  pass_rate?: number | null;
  total_practice_time_minutes: number;
  score_history: APIScoreHistoryPoint[];
  skill_breakdown: APISkillBreakdownItem[];
}

// ---- Candidate Windows ----
export interface APIWindowOrganizationDTO {
  id: number;
  name: string;
  organization_type?: string | null;
}

export interface APIWindowRoleDTO {
  id: number;
  name: string;
  description?: string | null;
  scope?: string | null;
}

export interface APIWindowTemplateDTO {
  id: number;
  name: string;
  scope?: string | null;
  total_estimated_time_minutes?: number | null;
  version?: number | null;
  is_active?: boolean | null;
}

export interface APIWindowRoleTemplateDTO {
  id: number;
  window_id: number;
  role_id: number;
  template_id: number;
  selection_weight: number;
  role: APIWindowRoleDTO;
  template: APIWindowTemplateDTO;
}

export interface APICandidateWindowDTO {
  id: number;
  name: string;
  scope: string;
  start_time: string;
  end_time: string;
  timezone?: string | null;
  organization: APIWindowOrganizationDTO;
  role_templates: APIWindowRoleTemplateDTO[];
  max_allowed_submissions?: number | null;
  allow_after_end_time: boolean;
  allow_resubmission: boolean;
  candidate_submission_count: number;
  status: string;
}

export interface APICandidateWindowListResponse {
  data: APICandidateWindowDTO[];
  pagination: PaginationMeta;
}

// ---- Candidate Submissions ----
export interface APISubmissionWindowDTO {
  id: number;
  name: string;
}

export interface APISubmissionOrganizationDTO {
  id: number;
  name: string;
}

export interface APISubmissionRoleDTO {
  id: number;
  name: string;
}

export interface APICandidateSubmissionDTO {
  submission_id: number;
  window: APISubmissionWindowDTO;
  organization: APISubmissionOrganizationDTO;
  role: APISubmissionRoleDTO;
  status: string;
  submitted_at?: string | null;
  started_at?: string | null;
  final_score?: number | null;
  result_status?: string | null;
  recommendation?: string | null;
}

export interface APICandidateSubmissionListResponse {
  data: APICandidateSubmissionDTO[];
  pagination: PaginationMeta;
}

// ---- Practice ----
export interface APIPracticeSkillDTO {
  id: string;
  name: string;
  question_count: number;
  completed_count: number;
}

export interface APIPracticeQuestionDTO {
  id: number;
  title: string;
  skill: string;
  difficulty: string;
  type: string;
  completed: boolean;
}

export interface APIPracticeQuestionListResponse {
  skills?: APIPracticeSkillDTO[];
  questions: APIPracticeQuestionDTO[];
  pagination: PaginationMeta;
}

export interface APIPracticeFlashcardDTO {
  source_question_id: number;
  topic: string;
  difficulty: string;
  question: string;
  answer: string;
  tags: string[];
  hint?: string | null;
}

export interface APIGeneratePracticeFlashcardsRequest {
  role: string;
  industry: string;
  question_type?: string | null;
  difficulty?: string | null;
  card_count: number;
  use_cached?: boolean;
}

export interface APIPracticeFlashcardDeckResponse {
  deck_id: number;
  candidate_id: number;
  role: string;
  industry: string;
  question_type?: string | null;
  difficulty?: string | null;
  card_count: number;
  source_question_ids: number[];
  flashcards: APIPracticeFlashcardDTO[];
  bookmarked_indices: number[];
  mastered_indices: number[];
  current_card_index: number;
  progress_percent: number;
  is_active: boolean;
  generation_source: string;
  model_provider?: string | null;
  model_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface APIPracticeFlashcardDeckSummaryDTO {
  deck_id: number;
  role: string;
  industry: string;
  question_type?: string | null;
  difficulty?: string | null;
  card_count: number;
  current_card_index: number;
  progress_percent: number;
  is_active: boolean;
  generation_source: string;
  created_at: string;
  updated_at: string;
}

export interface APIPracticeFlashcardDeckHistoryResponse {
  data: APIPracticeFlashcardDeckSummaryDTO[];
  pagination: PaginationMeta;
}

export interface APIPracticeFlashcardDeckActiveResponse {
  deck: APIPracticeFlashcardDeckResponse | null;
}

export interface APIUpdatePracticeFlashcardDeckProgressRequest {
  current_card_index: number;
  mastered_indices: number[];
  bookmarked_indices: number[];
}

export interface APIStartPracticeRequest {
  template_id: number;
  consent_accepted: boolean;
  experience_level?: string;
  target_company?: string;
  voice_interview?: boolean;
  video_recording?: boolean;
  ai_proctoring?: boolean;
}

export interface APIStartPracticeResponse {
  submission_id: number;
  status: string;
  started_at: string;
}

// ---- Practice Templates ----
export interface APIPracticeTemplateTopicDTO {
  topic_id: number;
  topic_name: string;
  weight?: number | null;
}

export interface APIPracticeTemplateSectionDTO {
  resume_analysis?: boolean;
  self_introduction?: boolean;
  topics_assessment?: boolean;
  coding_round?: boolean;
  complexity_analysis?: boolean;
  behavioral?: boolean;
}

export interface APIPracticeTemplateDTO {
  id: number;
  name: string;
  description?: string | null;
  category: string;
  total_estimated_time_minutes?: number | null;
  total_questions?: number | null;
  target_level?: string | null;
  topics: APIPracticeTemplateTopicDTO[];
  sections?: APIPracticeTemplateSectionDTO | null;
  difficulty_distribution?: Record<string, number> | null;
  is_active: boolean;
}

export interface APIPracticeTemplateListResponse {
  templates: APIPracticeTemplateDTO[];
}

// ---- Resumes ----
export interface APIResumeDTO {
  id: number;
  candidate_id: number;
  file_url?: string | null;
  file_name?: string | null;
  parsed_text?: string | null;
  extracted_data?: Record<string, unknown> | null;
  structured_json?: Record<string, unknown> | null;
  llm_feedback?: Record<string, unknown> | null;
  ats_score?: number | null;
  ats_feedback?: string | null;
  parse_status?: string | null;
  llm_analysis_status?: string | null;
  uploaded_at?: string | null;
  analyzed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface APIResumeListResponse {
  data: APIResumeDTO[];
}

export interface APIResumeUploadResponse {
  id: number;
  candidate_id: number;
  file_url: string;
  file_name?: string | null;
  parsed_text?: string | null;
  extracted_data?: Record<string, unknown> | null;
  structured_json?: Record<string, unknown> | null;
  llm_feedback?: Record<string, unknown> | null;
  ats_score?: number | null;
  ats_feedback?: string | null;
  parse_status?: string | null;
  llm_analysis_status?: string | null;
  uploaded_at?: string | null;
  analyzed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// ---- Interview Exchanges ----
export interface APIExchangeItemDTO {
  exchange_id: number;
  sequence_order: number;
  question_text: string;
  question_type?: string | null;
  difficulty_at_time: string;
  section_name?: string | null;
  response_text?: string | null;
  response_code?: string | null;
  response_language?: string | null;
  response_time_ms?: number | null;
  ai_followup_message?: string | null;
  created_at?: string | null;
}

export interface APIExchangeListResponse {
  submission_id: number;
  exchanges: APIExchangeItemDTO[];
  total_exchanges: number;
}

// ---- Interview Progress ----
export interface APISectionProgressDTO {
  section_name: string;
  questions_total: number;
  questions_answered: number;
  progress_percentage: number;
}

export interface APISectionProgressResponse {
  submission_id: number;
  overall_progress: number;
  sections: APISectionProgressDTO[];
}

// ---- Interview Sessions ----
export interface APIInterviewSessionDTO {
  submission_id: number;
  candidate_id: number;
  status: string;
  mode: string;
  consent_captured: boolean;
  started_at?: string | null;
  submitted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface APIInterviewExchangeDTO {
  id: number;
  sequence_order: number;
  question_text: string;
  difficulty_at_time: string;
  response_text?: string | null;
  response_time_ms?: number | null;
  created_at?: string | null;
}

export interface APIInterviewSessionDetailDTO {
  session: APIInterviewSessionDTO;
  exchanges?: APIInterviewExchangeDTO[];
}

// ---- Evaluations ----
export interface APIDimensionScoreResponse {
  dimension_id: number;
  rubric_dimension_id: number;
  dimension_name: string;
  score: number;
  max_score: number;
  weight: number;
  justification?: string | null;
}

export interface APIEvaluationResponse {
  evaluation_id: number;
  interview_exchange_id: number;
  rubric_id?: number | null;
  evaluator_type: string;
  total_score?: number | null;
  dimension_scores: APIDimensionScoreResponse[];
  explanation?: unknown;
  is_final: boolean;
  evaluated_at?: string | null;
  evaluated_by?: number | null;
  model_id?: number | null;
  scoring_version?: string | null;
  created_at?: string | null;
}

// ---- Interview Results ----
export interface APIInterviewResultResponse {
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
  model_id?: number | null;
  scoring_version?: string | null;
  is_current: boolean;
  computed_at?: string | null;
  created_at?: string | null;
}

export interface APISubmissionResultsResponse {
  interview_submission_id: number;
  results: APIInterviewResultResponse[];
  current_result_id?: number | null;
}

// ---- Supplementary Reports ----
export interface APISupplementaryReportResponse {
  report_id: number;
  report_type: string;
  content: unknown;
  generated_by: string;
  model_id?: number | null;
  created_at?: string | null;
}

export interface APISubmissionReportsResponse {
  interview_submission_id: number;
  reports: APISupplementaryReportResponse[];
}

// ---- Report Generation ----
export interface APIGenerateReportRequest {
  interview_submission_id: number;
  force_regenerate?: boolean;
}

// ---- Coding ----
export interface APITestCaseResultDTO {
  test_case_id: number;
  test_case_name: string;
  passed: boolean;
  visible: boolean;
  actual_output?: string | null;
  expected_output?: string | null;
  runtime_ms: number;
  memory_kb: number;
  feedback: string;
}

export interface APIExecutionStatusResponse {
  submission_id: number;
  interview_exchange_id: number;
  coding_problem_id: number;
  language: string;
  execution_status: string;
  score: number;
  execution_time_ms?: number | null;
  memory_kb?: number | null;
  compiler_output?: string | null;
  test_results: APITestCaseResultDTO[];
  submitted_at: string;
  executed_at?: string | null;
}

// ---- Proctoring ----
export interface APIProctoringEventResponse {
  id: number;
  interview_submission_id: number;
  event_type: string;
  severity: string;
  risk_weight: number;
  evidence: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
}

export interface APIRiskScoreResponse {
  submission_id: number;
  total_risk: number;
  classification: string;
  recommended_action: string;
  event_count: number;
  breakdown_by_type: Record<string, unknown>;
  top_events: Record<string, unknown>[];
  severity_counts: Record<string, number>;
  computation_algorithm: string;
  computed_at: string;
}

export interface APIProctoringEventInput {
  submission_id: number;
  event_type: string;
  timestamp: string;
  metadata?: Record<string, unknown> | null;
}

export interface APIProctoringEventIngestionResult {
  event_id?: number | null;
  status: 'accepted' | 'duplicate' | 'rejected' | string;
  message: string;
}
