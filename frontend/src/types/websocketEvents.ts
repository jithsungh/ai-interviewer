// =============================================
// WebSocket Event Types
// Exactly matches the protocol defined in FRONTEND-INTEGRATION-GUIDE.md
// =============================================

// ---- Client → Server Events ----

export interface JoinSessionEvent {
  event_type: 'join_session';
  submission_id: number;
}

export interface RequestNextQuestionEvent {
  event_type: 'request_next_question';
  submission_id: number;
}

export interface SubmitAnswerEvent {
  event_type: 'submit_answer';
  exchange_id: number;
  response_text: string;
  response_time_ms: number;
}

export interface SubmitCodeEvent {
  event_type: 'submit_code';
  exchange_id: number;
  response_code: string;
  response_language: 'python' | 'java' | 'cpp';
  response_time_ms: number;
}

export interface HeartbeatEvent {
  event_type: 'heartbeat';
  timestamp: string;
}

export type ClientEvent =
  | JoinSessionEvent
  | RequestNextQuestionEvent
  | SubmitAnswerEvent
  | SubmitCodeEvent
  | HeartbeatEvent;

// ---- Server → Client Events ----

export interface ConnectionEstablished {
  event_type: 'connection_established';
  submission_id: number;
  connection_id: string;
  server_time: string;
}

export interface SessionJoined {
  event_type: 'session_joined';
  submission_id: number;
  submission_status: string;
  current_sequence: number;
  total_questions: number;
  progress_percentage: number;
  time_remaining_seconds: number | null;
  started_at: string;
  expires_at: string | null;
}

export interface QuestionPayload {
  event_type: 'question_payload';
  exchange_id: number;
  sequence_order: number;
  question_text: string;
  question_type: 'behavioral' | 'technical' | 'situational' | 'coding';
  question_difficulty: 'easy' | 'medium' | 'hard';
  section_name: string;
  time_limit_seconds: number | null;
  is_final_question: boolean;
  starter_code?: string | null;
  test_cases?: { input: string; expected: string }[] | null;
}

export interface AnswerAccepted {
  event_type: 'answer_accepted';
  exchange_id: number;
  sequence_order: number;
  next_sequence: number | null;
  progress_percentage: number;
  message: string;
}

export interface CodeSubmissionAccepted {
  event_type: 'code_submission_accepted';
  exchange_id: number;
  code_submission_id: number | null;
  execution_status: string;
  message: string;
  estimated_execution_time_seconds: number;
}

export interface CodeExecutionCompleted {
  event_type: 'code_execution_completed';
  exchange_id: number;
  code_submission_id: number | null;
  execution_status: 'success' | 'error' | 'timeout' | string;
  score: number | null;
  test_results_summary: string | null;
  execution_time_ms: number | null;
  next_sequence: number | null;
  progress_percentage: number | null;
}

export interface TimerUpdate {
  event_type: 'timer_update';
  time_remaining_seconds: number;
  progress_percentage: number;
  current_sequence: number;
  total_questions: number;
}

export interface ProgressUpdate {
  event_type: 'progress_update';
  current_sequence: number;
  total_questions: number;
  progress_percentage: number;
  section_progress?: Record<string, { completed: number; total: number }>;
}

export interface InterviewCompleted {
  event_type: 'interview_completed';
  submission_id: number;
  completion_reason: 'all_questions_answered' | 'submitted';
  submitted_at: string;
  exchanges_completed: number;
  total_questions: number;
  message: string;
  next_steps: string;
}

export interface InterviewExpired {
  event_type: 'interview_expired';
  submission_id: number;
  expired_at: string;
  exchanges_completed: number;
  total_questions: number;
  auto_submitted: boolean;
  message: string;
}

export interface ConnectionReplaced {
  event_type: 'connection_replaced';
  message: string;
  new_connection_id: string;
  timestamp: string;
}

export interface HeartbeatAck {
  event_type: 'heartbeat_ack';
  server_time: string;
  time_remaining_seconds: number | null;
}

export interface ErrorEvent {
  event_type: 'error_event';
  error_code:
    | 'VALIDATION_ERROR'
    | 'NOT_FOUND'
    | 'CONFLICT'
    | 'INTERVIEW_NOT_ACTIVE'
    | 'UNAUTHORIZED'
    | 'AUTHENTICATION_ERROR'
    | 'SERVER_ERROR';
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export type ServerEvent =
  | ConnectionEstablished
  | SessionJoined
  | QuestionPayload
  | AnswerAccepted
  | CodeSubmissionAccepted
  | CodeExecutionCompleted
  | TimerUpdate
  | ProgressUpdate
  | InterviewCompleted
  | InterviewExpired
  | ConnectionReplaced
  | HeartbeatAck
  | ErrorEvent;

// ---- Fatal error codes ----
export const FATAL_ERROR_CODES = new Set([
  'INTERVIEW_NOT_ACTIVE',
  'UNAUTHORIZED',
  'SERVER_ERROR',
]);
