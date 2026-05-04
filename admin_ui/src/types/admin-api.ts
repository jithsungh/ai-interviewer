/**
 * Admin API Type Contracts

export interface LatestProctoringRecordingResponse {
  artifact_id: string;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
  duration_ms?: number | null;
  created_at: string;
}

export interface ProctoringRecordingArtifactResponse {
  artifact_id: string;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
  duration_ms?: number | null;
  upload_started_at?: string | null;
  upload_completed_at?: string | null;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Proctoring Review Queue
// ═══════════════════════════════════════════════════════════════════════════

 * 
 * Aligned with backend/app/admin/api/contracts.py
 * Auto-sync recommended when backend API changes
 * 
 * synced: April 2026
 */

export type TemplateScope = 'public' | 'private' | 'super_org_only';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type QuestionType = 'behavioral' | 'technical' | 'situational' | 'coding';
export type ProgrammingLanguage = 'python' | 'javascript' | 'typescript' | 'java' | 'cpp' | 'go' | 'rust';
export type CodingProblemDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type InterviewScope = 'global' | 'local' | 'only_invited';

// ═══════════════════════════════════════════════════════════════════════════
// Templates
// ═══════════════════════════════════════════════════════════════════════════

export interface TemplateResponse {
  id: number;
  name: string;
  description?: string;
  scope: TemplateScope;
  organization_id?: number;
  template_structure: Record<string, any>;
  rules?: Record<string, any>;
  total_estimated_time_minutes?: number;
  version: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TemplateCreateRequest {
  name: string;
  description?: string;
  scope: TemplateScope;
  template_structure: Record<string, any>;
  rules?: Record<string, any>;
  total_estimated_time_minutes?: number;
}

export interface TemplateUpdateRequest {
  name?: string;
  description?: string;
  scope?: TemplateScope;
  template_structure?: Record<string, any>;
  rules?: Record<string, any>;
  total_estimated_time_minutes?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Roles
// ═══════════════════════════════════════════════════════════════════════════

export interface RoleResponse {
  id: number;
  name: string;
  description?: string;
  scope: TemplateScope;
  organization_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface RoleListResponse {
  data: RoleResponse[];
  pagination: PaginationMeta;
  meta: MetaInfo;
}

// ═══════════════════════════════════════════════════════════════════════════
// Questions
// ═══════════════════════════════════════════════════════════════════════════

export interface QuestionResponse {
  id: number;
  text: string;
  question_type: QuestionType;
  domain?: string;
  difficulty: DifficultyLevel;
  tags?: string[];
  rubric_id?: number;
  is_active: boolean;
  use_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface QuestionCreateRequest {
  text: string;
  question_type: QuestionType;
  domain?: string;
  difficulty: DifficultyLevel;
  tags?: string[];
  rubric_id?: number;
}

export interface QuestionUpdateRequest {
  text?: string;
  question_type?: QuestionType;
  domain?: string;
  difficulty?: DifficultyLevel;
  tags?: string[];
  rubric_id?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Coding Problems
// ═══════════════════════════════════════════════════════════════════════════

export interface CodingProblemResponse {
  id: number;
  title: string;
  description?: string;
  difficulty: CodingProblemDifficulty;
  supported_languages: ProgrammingLanguage[];
  test_cases_count: number;
  time_limit_seconds?: number;
  memory_limit_mb?: number;
  is_active: boolean;
  submission_count?: number;
  pass_rate?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CodingProblemCreateRequest {
  title: string;
  description?: string;
  difficulty: CodingProblemDifficulty;
  supported_languages: ProgrammingLanguage[];
  time_limit_seconds?: number;
  memory_limit_mb?: number;
}

export interface CodingProblemUpdateRequest {
  title?: string;
  description?: string;
  difficulty?: CodingProblemDifficulty;
  supported_languages?: ProgrammingLanguage[];
  time_limit_seconds?: number;
  memory_limit_mb?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Rubrics/Dimensions
// ═══════════════════════════════════════════════════════════════════════════

export interface RubricDimension {
  name: string;
  description?: string;
  weight: number;
  max_points: number;
}

export interface RubricResponse {
  id: number;
  name: string;
  description?: string;
  max_score: number;
  dimensions: RubricDimension[];
  is_active: boolean;
  usage_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface RubricCreateRequest {
  name: string;
  description?: string;
  max_score: number;
  dimensions: RubricDimension[];
}

export interface RubricUpdateRequest {
  name?: string;
  description?: string;
  max_score?: number;
  dimensions?: RubricDimension[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Interview Windows/Scheduling
// ═══════════════════════════════════════════════════════════════════════════

export interface WindowMappingRequest {
  role_id: number;
  template_id: number;
  selection_weight?: number;
}

export interface WindowMappingResponse {
  id?: number;
  window_id: number;
  role_id: number;
  template_id: number;
  selection_weight: number;
  created_at?: string;
}

export interface WindowMappingListResponse {
  data: WindowMappingResponse[];
  meta: MetaInfo;
}

export interface InterviewWindowResponse {
  id: number;
  organization_id: number;
  admin_id: number;
  name: string;
  scope: InterviewScope;
  start_time: string;
  end_time: string;
  timezone: string;
  max_allowed_submissions?: number | null;
  allow_after_end_time: boolean;
  allow_resubmission: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface InterviewWindowCreateRequest {
  name: string;
  scope: InterviewScope;
  start_time?: string;
  end_time?: string;
  timezone: string;
  start_date?: string;
  end_date?: string;
  template_id?: number;
  role_id?: number;
  role_ids?: number[];
  max_allowed_submissions?: number;
  allow_after_end_time?: boolean;
  allow_resubmission?: boolean;
  mappings: WindowMappingRequest[];
}

export interface InterviewWindowUpdateRequest {
  name?: string;
  scope?: InterviewScope;
  start_time?: string;
  end_time?: string;
  timezone?: string;
  max_allowed_submissions?: number;
  allow_after_end_time?: boolean;
  allow_resubmission?: boolean;
  mappings?: WindowMappingRequest[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Proctoring Review Queue
// ═══════════════════════════════════════════════════════════════════════════

export interface ProctoringReviewQueueItemResponse {
  submission_id: number;
  total_risk: number;
  classification: string;
  event_count: number;
  flagged: boolean;
  reviewed: boolean;
}

export interface ProctoringReviewQueueResponse {
  total: number;
  items: ProctoringReviewQueueItemResponse[];
  limit: number;
  offset: number;
}

export interface ProctoringMonitoringSessionsResponse {
  total: number;
  items: ProctoringMonitoringSessionItemResponse[];
  limit: number;
  offset: number;
}

export interface ProctoringMonitoringSessionItemResponse extends ProctoringReviewQueueItemResponse {
  submission_status: string;
  window_id?: number | null;
  window_name?: string | null;
  window_start_time?: string | null;
  window_end_time?: string | null;
  started_at?: string | null;
  submitted_at?: string | null;
}

export interface RiskScoreResponse {
  submission_id: number;
  total_risk: number;
  classification: string;
  recommended_action: string;
  event_count: number;
  breakdown_by_type: Record<string, any>;
  top_events: Array<Record<string, any>>;
  severity_counts: Record<string, number>;
  computation_algorithm: string;
  computed_at: string;
}

export interface ProctoringEventResponse {
  id: number;
  interview_submission_id: number;
  event_type: string;
  severity: string;
  risk_weight: number;
  evidence: Record<string, any>;
  occurred_at: string;
  created_at: string;
}

export interface LatestProctoringRecordingResponse {
  artifact_id: string;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Governance / Audit Logs
// ═══════════════════════════════════════════════════════════════════════════

export interface AuditLogResponse {
  id: number;
  user_id?: number | null;
  event_type: string;
  ip_address?: string | null;
  user_agent?: string | null;
  event_metadata?: Record<string, any> | null;
  created_at?: string | null;
}

export interface AuditLogListResponse {
  data: AuditLogResponse[];
  pagination: PaginationMeta;
  meta: MetaInfo;
}

// ═══════════════════════════════════════════════════════════════════════════
// Pagination & Response Envelopes
// ═══════════════════════════════════════════════════════════════════════════

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  pages: number;
}

export interface MetaInfo {
  timestamp?: string;
  request_id?: string;
}

export interface TemplateListResponse {
  data: TemplateResponse[];
  pagination: PaginationMeta;
  meta: MetaInfo;
}

export interface TemplateDetailResponse {
  data: TemplateResponse;
  meta: MetaInfo;
}

export interface QuestionListResponse {
  data: QuestionResponse[];
  pagination: PaginationMeta;
  meta: MetaInfo;
}

export interface QuestionDetailResponse {
  data: QuestionResponse;
  meta: MetaInfo;
}

export interface CodingProblemListResponse {
  data: CodingProblemResponse[];
  pagination: PaginationMeta;
  meta: MetaInfo;
}

export interface CodingProblemDetailResponse {
  data: CodingProblemResponse;
  meta: MetaInfo;
}

export interface RubricListResponse {
  data: RubricResponse[];
  pagination: PaginationMeta;
  meta: MetaInfo;
}

export interface RubricDetailResponse {
  data: RubricResponse;
  meta: MetaInfo;
}

export interface InterviewWindowListResponse {
  data: InterviewWindowResponse[];
  pagination: PaginationMeta;
  meta: MetaInfo;
}

export interface InterviewWindowDetailResponse {
  data: InterviewWindowResponse;
  meta: MetaInfo;
}

// Generic list response wrapper
export interface ListResponse<T> {
  data: T[];
  pagination: PaginationMeta;
  meta: MetaInfo;
}

// Generic detail response wrapper
export interface DetailResponse<T> {
  data: T;
  meta: MetaInfo;
}
