/**
 * Admin API Type Contracts

export interface LatestProctoringRecordingResponse {
  artifact_id: string;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
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

export interface InterviewWindowResponse {
  id: number;
  name: string;
  description?: string;
  template_id: number;
  start_date: string;
  end_date: string;
  max_candidates: number;
  proctoring_enabled: boolean;
  is_active: boolean;
  lock_invites?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface InterviewWindowCreateRequest {
  name: string;
  description?: string;
  template_id: number;
  start_date: string;
  end_date: string;
  max_candidates: number;
  proctoring_enabled?: boolean;
}

export interface InterviewWindowUpdateRequest {
  name?: string;
  description?: string;
  template_id?: number;
  start_date?: string;
  end_date?: string;
  max_candidates?: number;
  proctoring_enabled?: boolean;
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
  items: ProctoringReviewQueueItemResponse[];
  limit: number;
  offset: number;
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
