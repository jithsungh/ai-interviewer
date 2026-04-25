// =============================================
// ENUMS
// =============================================

export type UserStatus = 'active' | 'inactive' | 'banned';
export type OrganizationType = 'company' | 'non_profit' | 'educational';
export type OrganizationPlan = 'free' | 'pro' | 'enterprise';
export type OrganizationStatus = 'active' | 'inactive' | 'suspended';
export type AdminRole = 'superadmin' | 'admin' | 'read_only';
export type AdminStatus = 'active' | 'inactive' | 'suspended';
export type CandidatePlan = 'free' | 'pro' | 'prime';
export type TemplateScope = 'public' | 'organization' | 'private';
export type InterviewScope = 'global' | 'local' | 'only_invited';
export type InterviewMode = 'async' | 'live' | 'hybrid';
export type SubmissionStatus = 'pending' | 'in_progress' | 'completed' | 'reviewed';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type QuestionType = 'behavioral' | 'technical' | 'situational' | 'coding';
export type CodingTopicType = 'data_structure' | 'algorithm' | 'pattern' | 'system_design' | 'language_specific' | 'traversal';
export type CodeExecutionStatus = 'pending' | 'running' | 'passed' | 'failed' | 'error' | 'timeout' | 'memory_exceeded';
export type ProctoringEventType = 'tab_switch' | 'face_missing' | 'multiple_faces' | 'audio_anomaly' | 'window_switch' | 'device_detected';
export type ProctoringRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ReportType = 'candidate_summary' | 'technical_breakdown' | 'behavioral_analysis' | 'proctoring_risk';
export type EvaluatorType = 'ai' | 'human' | 'hybrid';
export type MediaType = 'video' | 'audio' | 'screen_recording';
export type ResultStatus = 'pass' | 'fail' | 'borderline' | 'incomplete';
export type Recommendation = 'hire' | 'no_hire' | 'review' | 'strong_hire';

// =============================================
// CORE ENTITIES
// =============================================

export interface User {
  id: number;
  name: string;
  email: string;
  status: UserStatus;
  user_type: 'admin' | 'candidate';
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface Organization {
  id: number;
  name: string;
  organization_type: OrganizationType;
  plan: OrganizationPlan;
  domain?: string;
  status: OrganizationStatus;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: number;
  user_id: number;
  plan: CandidatePlan;
  status: UserStatus;
  profile_metadata?: CandidateProfile;
  created_at: string;
  updated_at: string;
}

export interface CandidateProfile {
  phone?: string;
  experience_years: number;
  cgpa?: number;
  skills: string[];
  bio?: string;
  location?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  education?: Education[];
  work_experience?: WorkExperience[];
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  start_year: number;
  end_year?: number;
  gpa?: number;
}

export interface WorkExperience {
  company: string;
  title: string;
  start_date: string;
  end_date?: string;
  description?: string;
  is_current: boolean;
}

export interface Admin {
  id: number;
  user_id: number;
  organization_id: number;
  role: AdminRole;
  status: AdminStatus;
  created_at: string;
  updated_at: string;
}

// =============================================
// ROLES & TOPICS
// =============================================

export interface Role {
  id: number;
  name: string;
  description?: string;
  scope: TemplateScope;
  organization_id?: number;
  created_at: string;
  updated_at: string;
}

export interface Topic {
  id: number;
  name: string;
  description?: string;
  parent_topic_id?: number;
  scope: TemplateScope;
  organization_id?: number;
  estimated_time_minutes?: number;
  created_at: string;
  updated_at: string;
}

export interface CodingTopic {
  id: number;
  name: string;
  description?: string;
  topic_type: CodingTopicType;
  parent_topic_id?: number;
  scope: TemplateScope;
  organization_id?: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// =============================================
// INTERVIEW TEMPLATES
// =============================================

export interface InterviewTemplate {
  id: number;
  name: string;
  description?: string;
  scope: TemplateScope;
  organization_id?: number;
  template_structure?: Record<string, unknown>;
  rules?: Record<string, unknown>;
  total_estimated_time_minutes: number;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================
// SUBMISSION WINDOWS
// =============================================

export interface InterviewSubmissionWindow {
  id: number;
  organization_id: number;
  admin_id: number;
  name: string;
  scope: InterviewScope;
  start_time: string;
  end_time: string;
  timezone: string;
  max_allowed_submissions: number;
  allow_after_end_time: boolean;
  allow_resubmission: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  organization?: Organization;
  role_templates?: WindowRoleTemplate[];
}

export interface WindowRoleTemplate {
  id: number;
  window_id: number;
  role_id: number;
  template_id: number;
  selection_weight: number;
  created_at: string;
  // Joined data
  role?: Role;
  template?: InterviewTemplate;
}

// =============================================
// QUESTIONS
// =============================================

export interface Question {
  id: number;
  question_text: string;
  answer_text?: string;
  question_type: QuestionType;
  difficulty: DifficultyLevel;
  scope: TemplateScope;
  organization_id?: number;
  source_type?: string;
  estimated_time_minutes?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  topics?: Topic[];
}

// =============================================
// CODING PROBLEMS
// =============================================

export interface CodingProblem {
  id: number;
  body?: string;
  difficulty: DifficultyLevel;
  scope: TemplateScope;
  organization_id?: number;
  constraints?: string;
  estimated_time_minutes?: number;
  is_active: boolean;
  title: string;
  description?: string;
  examples?: CodingExample[];
  hints?: string[];
  code_snippets?: Record<string, string>;
  created_at: string;
  updated_at: string;
  test_cases?: CodingTestCase[];
  topics?: CodingTopic[];
}

export interface CodingExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface CodingTestCase {
  id: number;
  coding_problem_id: number;
  input_data: string;
  expected_output: string;
  is_hidden: boolean;
  weight: number;
  created_at: string;
}

// =============================================
// PROGRAMMING LANGUAGES
// =============================================

export interface ProgrammingLanguage {
  id: number;
  name: string;
  slug: string;
  version?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// =============================================
// RUBRICS
// =============================================

export interface Rubric {
  id: number;
  organization_id?: number;
  name: string;
  description?: string;
  scope: TemplateScope;
  is_active: boolean;
  dimensions?: RubricDimension[];
  created_at: string;
  updated_at: string;
}

export interface RubricDimension {
  id: number;
  rubric_id: number;
  dimension_name: string;
  description?: string;
  max_score: number;
  weight: number;
  criteria?: Record<string, unknown>;
  sequence_order: number;
  created_at: string;
}

// =============================================
// INTERVIEW SUBMISSIONS
// =============================================

export interface InterviewSubmission {
  id: number;
  candidate_id: number;
  window_id: number;
  role_id: number;
  template_id: number;
  mode: InterviewMode;
  status: SubmissionStatus;
  final_score?: number;
  consent_captured: boolean;
  scheduled_start?: string;
  scheduled_end?: string;
  started_at?: string;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
  // Joined
  window?: InterviewSubmissionWindow;
  role?: Role;
  template?: InterviewTemplate;
  exchanges?: InterviewExchange[];
  result?: InterviewResult;
  proctoring_events?: ProctoringEvent[];
}

// =============================================
// INTERVIEW EXCHANGES
// =============================================

export interface InterviewExchange {
  id: number;
  interview_submission_id: number;
  sequence_order: number;
  question_id?: number;
  coding_problem_id?: number;
  question_text: string;
  expected_answer?: string;
  difficulty_at_time: DifficultyLevel;
  response_text?: string;
  response_code?: string;
  response_time_ms?: number;
  ai_followup_message?: string;
  content_metadata?: Record<string, unknown>;
  created_at: string;
  // Joined
  evaluation?: Evaluation;
  code_submission?: CodeSubmission;
  audio_analytics?: AudioAnalytics;
  media_artifacts?: MediaArtifact[];
}

// =============================================
// MEDIA ARTIFACTS
// =============================================

export interface MediaArtifact {
  id: number;
  interview_exchange_id: number;
  media_type: MediaType;
  storage_uri: string;
  duration_seconds?: number;
  file_size_bytes?: number;
  captured_at: string;
  retention_expiry?: string;
  created_at: string;
}

// =============================================
// AUDIO ANALYTICS
// =============================================

export interface AudioAnalytics {
  id: number;
  interview_exchange_id: number;
  transcript?: string;
  confidence_score?: number;
  speech_rate_wpm?: number;
  filler_word_count?: number;
  sentiment_score?: number;
  analysis_metadata?: Record<string, unknown>;
  created_at: string;
}

// =============================================
// EVALUATIONS
// =============================================

export interface Evaluation {
  id: number;
  interview_exchange_id: number;
  rubric_id?: number;
  model_id?: number;
  evaluator_type: EvaluatorType;
  total_score: number;
  explanation?: Record<string, unknown>;
  is_final: boolean;
  evaluated_at: string;
  created_at: string;
  dimension_scores?: EvaluationDimensionScore[];
}

export interface EvaluationDimensionScore {
  id: number;
  evaluation_id: number;
  rubric_dimension_id: number;
  score: number;
  justification?: string;
  dimension_name?: string;
  created_at: string;
}

// =============================================
// CODE SUBMISSIONS
// =============================================

export interface CodeSubmission {
  id: number;
  interview_exchange_id: number;
  coding_problem_id: number;
  language: string;
  source_code: string;
  execution_status: CodeExecutionStatus;
  score?: number;
  execution_time_ms?: number;
  memory_kb?: number;
  submitted_at: string;
  created_at: string;
  executed_at?: string;
  execution_results?: CodeExecutionResult[];
}

export interface CodeExecutionResult {
  id: number;
  code_submission_id: number;
  test_case_id: number;
  passed: boolean;
  actual_output?: string;
  runtime_ms?: number;
  memory_kb?: number;
  compiler_output?: string;
  runtime_output?: string;
  feedback?: string;
  exit_code?: number;
  created_at: string;
}

// =============================================
// PROCTORING
// =============================================

export interface ProctoringEvent {
  id: number;
  interview_submission_id: number;
  event_type: ProctoringEventType;
  severity: ProctoringRiskLevel;
  risk_weight: number;
  evidence?: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
}

// =============================================
// INTERVIEW RESULTS
// =============================================

export interface InterviewResult {
  id: number;
  interview_submission_id: number;
  final_score: number;
  normalized_score: number;
  result_status: ResultStatus;
  recommendation: Recommendation;
  scoring_version?: string;
  rubric_snapshot?: Record<string, unknown>;
  section_scores?: Record<string, number>;
  strengths?: string;
  weaknesses?: string;
  summary_notes?: string;
  generated_by?: string;
  is_current: boolean;
  computed_at: string;
  created_at: string;
}

// =============================================
// SUPPLEMENTARY REPORTS
// =============================================

export interface SupplementaryReport {
  id: number;
  interview_submission_id: number;
  report_type: ReportType;
  content: Record<string, unknown>;
  generated_by?: string;
  created_at: string;
}

// =============================================
// RESUMES
// =============================================

export interface Resume {
  id: number;
  candidate_id: number;
  file_url: string;
  parsed_text?: string;
  extracted_data?: ResumeExtractedData;
  uploaded_at: string;
  created_at: string;
}

export interface ResumeExtractedData {
  name?: string;
  email?: string;
  phone?: string;
  skills?: string[];
  experience_years?: number;
  education?: Education[];
  work_experience?: WorkExperience[];
  certifications?: string[];
  summary?: string;
  match_score?: number;
  feedback?: ResumeFeedbackItem[];
}

export interface ResumeFeedbackItem {
  category: string;
  score: number;
  feedback: string;
  suggestions: string[];
}

// =============================================
// JOB DESCRIPTIONS
// =============================================

export interface JobDescription {
  id: number;
  organization_id: number;
  role_id: number;
  title: string;
  description_text?: string;
  requirements?: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
