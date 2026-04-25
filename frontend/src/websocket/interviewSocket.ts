// =============================================
// Interview WebSocket Service
// Implements the WebSocket protocol from FRONTEND-INTEGRATION-GUIDE.md
// =============================================

import type {
  ClientEvent,
  ServerEvent,
  ConnectionEstablished,
  SessionJoined,
  QuestionPayload,
  AnswerAccepted,
  CodeSubmissionAccepted,
  CodeExecutionCompleted,
  TimerUpdate,
  ProgressUpdate,
  InterviewCompleted,
  InterviewExpired,
  ConnectionReplaced,
  HeartbeatAck,
  ErrorEvent,
  FATAL_ERROR_CODES,
} from '@/types/websocketEvents';

export type ServerEventHandler = {
  onConnectionEstablished?: (event: ConnectionEstablished) => void;
  onSessionJoined?: (event: SessionJoined) => void;
  onQuestionPayload?: (event: QuestionPayload) => void;
  onAnswerAccepted?: (event: AnswerAccepted) => void;
  onCodeSubmissionAccepted?: (event: CodeSubmissionAccepted) => void;
  onCodeExecutionCompleted?: (event: CodeExecutionCompleted) => void;
  onTimerUpdate?: (event: TimerUpdate) => void;
  onProgressUpdate?: (event: ProgressUpdate) => void;
  onInterviewCompleted?: (event: InterviewCompleted) => void;
  onInterviewExpired?: (event: InterviewExpired) => void;
  onConnectionReplaced?: (event: ConnectionReplaced) => void;
  onHeartbeatAck?: (event: HeartbeatAck) => void;
  onError?: (event: ErrorEvent) => void;
  onClose?: (code: number, reason: string) => void;
  onReconnecting?: (attempt: number) => void;
  onReconnected?: () => void;
};

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ?? 'ws://localhost:8000';
const HEARTBEAT_INTERVAL_MS = 30_000;
const MAX_RECONNECT_ATTEMPTS = 5;

export class InterviewSocket {
  private ws: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;
  private submissionId: number;
  private handlers: ServerEventHandler;
  private shouldReconnect = true;
  private getToken: () => string | null;

  constructor(
    submissionId: number,
    getToken: () => string | null,
    handlers: ServerEventHandler,
  ) {
    this.submissionId = submissionId;
    this.getToken = getToken;
    this.handlers = handlers;
  }

  // ---- Connection ----

  connect(): void {
    const token = this.getToken();
    if (!token) {
      console.error('[InterviewSocket] No token available');
      return;
    }

    const url = `${WS_BASE_URL}/ws/interview/${this.submissionId}?token=${encodeURIComponent(token)}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.ws.onclose = (event) => {
      this.stopHeartbeat();

      if (event.code === 1000) {
        // Normal close
        this.handlers.onClose?.(event.code, event.reason);
        return;
      }

      if (this.shouldReconnect && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30_000);
        this.reconnectAttempts++;
        this.handlers.onReconnecting?.(this.reconnectAttempts);
        setTimeout(() => this.connect(), delay);
      } else {
        this.handlers.onClose?.(event.code, event.reason);
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror
    };
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  // ---- Send helpers ----

  send(event: ClientEvent): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  joinSession(): void {
    this.send({
      event_type: 'join_session',
      submission_id: this.submissionId,
    });
  }

  requestNextQuestion(): void {
    this.send({
      event_type: 'request_next_question',
      submission_id: this.submissionId,
    });
  }

  submitAnswer(exchangeId: number, responseText: string, responseTimeMs: number): void {
    this.send({
      event_type: 'submit_answer',
      exchange_id: exchangeId,
      response_text: responseText,
      response_time_ms: responseTimeMs,
    });
  }

  submitCode(
    exchangeId: number,
    responseCode: string,
    responseLanguage: 'python' | 'java' | 'cpp',
    responseTimeMs: number,
  ): void {
    this.send({
      event_type: 'submit_code',
      exchange_id: exchangeId,
      response_code: responseCode,
      response_language: responseLanguage,
      response_time_ms: responseTimeMs,
    });
  }

  // ---- Heartbeat ----

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({
        event_type: 'heartbeat',
        timestamp: new Date().toISOString(),
      });
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ---- Message dispatcher ----

  private handleMessage(raw: string): void {
    let data: ServerEvent;
    try {
      data = JSON.parse(raw) as ServerEvent;
    } catch {
      console.error('[InterviewSocket] Invalid JSON:', raw);
      return;
    }

    switch (data.event_type) {
      case 'connection_established':
        this.handlers.onConnectionEstablished?.(data as ConnectionEstablished);
        break;
      case 'session_joined':
        if (this.reconnectAttempts === 0) {
          this.handlers.onSessionJoined?.(data as SessionJoined);
        } else {
          this.handlers.onReconnected?.();
          this.handlers.onSessionJoined?.(data as SessionJoined);
        }
        break;
      case 'question_payload':
        this.handlers.onQuestionPayload?.(data as QuestionPayload);
        break;
      case 'answer_accepted':
        this.handlers.onAnswerAccepted?.(data as AnswerAccepted);
        break;
      case 'code_submission_accepted':
        this.handlers.onCodeSubmissionAccepted?.(data as CodeSubmissionAccepted);
        break;
      case 'code_execution_completed':
        this.handlers.onCodeExecutionCompleted?.(data as CodeExecutionCompleted);
        break;
      case 'timer_update':
        this.handlers.onTimerUpdate?.(data as TimerUpdate);
        break;
      case 'progress_update':
        this.handlers.onProgressUpdate?.(data as ProgressUpdate);
        break;
      case 'interview_completed':
        this.handlers.onInterviewCompleted?.(data as InterviewCompleted);
        break;
      case 'interview_expired':
        this.handlers.onInterviewExpired?.(data as InterviewExpired);
        break;
      case 'connection_replaced':
        this.shouldReconnect = false;
        this.handlers.onConnectionReplaced?.(data as ConnectionReplaced);
        break;
      case 'heartbeat_ack':
        this.handlers.onHeartbeatAck?.(data as HeartbeatAck);
        break;
      case 'error_event':
        this.handlers.onError?.(data as ErrorEvent);
        break;
      default:
        console.warn('[InterviewSocket] Unknown event:', (data as { event_type: string }).event_type);
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
