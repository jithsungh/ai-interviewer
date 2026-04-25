// =============================================
// useInterview Hook
// Manages WebSocket connection, interview state, and actions
// for the InterviewSession page.
// =============================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { InterviewSocket } from '@/websocket/interviewSocket';
import { getAccessToken } from '@/services/apiClient';
import { startInterview, completeInterview, getSessionStatus } from '@/services/interviewApi';
import { FATAL_ERROR_CODES } from '@/types/websocketEvents';
import type {
  QuestionPayload,
  SessionJoined,
  CodeExecutionCompleted,
  InterviewCompleted as InterviewCompletedEvent,
  ErrorEvent,
} from '@/types/websocketEvents';
import { toast } from '@/hooks/use-toast';

export type InterviewPhase =
  | 'consent'
  | 'restoring'
  | 'connecting'
  | 'question_loading'
  | 'answering'
  | 'submitting'
  | 'code_executing'
  | 'completed'
  | 'expired'
  | 'error';

export interface InterviewState {
  phase: InterviewPhase;
  submissionId: number | null;
  currentQuestion: QuestionPayload | null;
  progress: number;
  currentSequence: number;
  totalQuestions: number;
  timeRemainingSeconds: number | null;
  codeExecutionResult: CodeExecutionCompleted | null;
  completionData: InterviewCompletedEvent | null;
  error: string | null;
  isConnected: boolean;
}

const INITIAL_STATE: InterviewState = {
  phase: 'consent',
  submissionId: null,
  currentQuestion: null,
  progress: 0,
  currentSequence: 0,
  totalQuestions: 0,
  timeRemainingSeconds: null,
  codeExecutionResult: null,
  completionData: null,
  error: null,
  isConnected: false,
};

// Auto-save drafts to localStorage
const DRAFT_KEY_PREFIX = 'interview_draft_';

function saveDraft(submissionId: number, exchangeId: number, content: string) {
  try {
    localStorage.setItem(`${DRAFT_KEY_PREFIX}${submissionId}_${exchangeId}`, content);
  } catch { /* localStorage may be full */ }
}

export function loadDraft(submissionId: number, exchangeId: number): string | null {
  try {
    return localStorage.getItem(`${DRAFT_KEY_PREFIX}${submissionId}_${exchangeId}`);
  } catch {
    return null;
  }
}

function clearDraft(submissionId: number, exchangeId: number) {
  try {
    localStorage.removeItem(`${DRAFT_KEY_PREFIX}${submissionId}_${exchangeId}`);
  } catch { /* ignore */ }
}

export function useInterview(submissionId: number | null) {
  const navigate = useNavigate();
  const [state, setState] = useState<InterviewState>(INITIAL_STATE);
  const socketRef = useRef<InterviewSocket | null>(null);
  const questionStartTimeRef = useRef<number>(Date.now());
  const questionLoadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoreAttemptedRef = useRef(false);

  // ---- Helper: Set timeout for question loading ----
  
  const setQuestionLoadTimeout = useCallback(() => {
    // Clear any existing timeout
    if (questionLoadTimeoutRef.current) {
      clearTimeout(questionLoadTimeoutRef.current);
    }
    
    // Set a 15-second timeout for question loading
    questionLoadTimeoutRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        phase: 'error',
        error: 'Failed to load question. The interview session may have encountered an error. Please try starting a new interview or contact support.',
      }));
      toast({
        title: 'Question Load Timeout',
        description: 'The question failed to load. There may be an issue with your interview session.',
        variant: 'destructive',
      });
    }, 15000); // 15 seconds
  }, []);
  
  const clearQuestionLoadTimeout = useCallback(() => {
    if (questionLoadTimeoutRef.current) {
      clearTimeout(questionLoadTimeoutRef.current);
      questionLoadTimeoutRef.current = null;
    }
  }, []);

  const setTransitionLoading = useCallback((message?: string) => {
    clearQuestionLoadTimeout();
    setState(prev => ({
      ...prev,
      phase: 'question_loading',
      error: null,
    }));
    setQuestionLoadTimeout();
  }, [clearQuestionLoadTimeout, setQuestionLoadTimeout]);

  const createSocket = useCallback(() => {
    if (!submissionId) return null;

    return new InterviewSocket(
      submissionId,
      getAccessToken,
      {
        onConnectionEstablished: () => {
          setState(prev => ({ ...prev, isConnected: true }));
          socketRef.current?.joinSession();
        },

        onSessionJoined: (event: SessionJoined) => {
          console.log('✅ Session joined:', event);
          setState(prev => ({
            ...prev,
            phase: 'question_loading',
            currentSequence: event.current_sequence,
            totalQuestions: event.total_questions,
            progress: event.progress_percentage,
            timeRemainingSeconds: event.time_remaining_seconds,
            error: null,
          }));
          setQuestionLoadTimeout();
          socketRef.current?.requestNextQuestion();
        },

        onQuestionPayload: (event: QuestionPayload) => {
          console.log('📝 Question received:', event);
          clearQuestionLoadTimeout();
          questionStartTimeRef.current = Date.now();
          setState(prev => ({
            ...prev,
            phase: 'answering',
            currentQuestion: event,
            currentSequence: event.sequence_order,
            codeExecutionResult: null,
            error: null,
          }));
        },

        onAnswerAccepted: (event) => {
          if (state.currentQuestion) {
            clearDraft(submissionId, state.currentQuestion.exchange_id);
          }
          setState(prev => ({
            ...prev,
            progress: event.progress_percentage,
            phase: 'question_loading',
          }));
          setQuestionLoadTimeout();
          socketRef.current?.requestNextQuestion();
        },

        onCodeSubmissionAccepted: () => {
          setState(prev => ({ ...prev, phase: 'code_executing' }));
        },

        onCodeExecutionCompleted: (event: CodeExecutionCompleted) => {
          if (state.currentQuestion) {
            clearDraft(submissionId, state.currentQuestion.exchange_id);
          }
          setState(prev => ({
            ...prev,
            phase: 'answering',
            codeExecutionResult: event,
            progress: event.progress_percentage,
          }));
        },

        onTimerUpdate: (event) => {
          setState(prev => ({
            ...prev,
            timeRemainingSeconds: event.time_remaining_seconds,
            progress: event.progress_percentage,
          }));
        },

        onProgressUpdate: (event) => {
          setState(prev => ({
            ...prev,
            progress: event.progress_percentage,
            currentSequence: event.current_sequence,
            totalQuestions: event.total_questions,
          }));
        },

        onInterviewCompleted: (event) => {
          console.log('⚠️ Interview completed event received:', event);
          clearQuestionLoadTimeout();

          if (event.exchanges_completed === 0 && event.total_questions === 0) {
            console.error('Interview completed with 0 questions - backend configuration error');
            setState(prev => ({
              ...prev,
              phase: 'error',
              error: 'Interview session failed to load questions. This may be due to incomplete interview template configuration. Please try a different interview type or contact support.',
            }));
            toast({
              title: 'Interview Configuration Error',
              description: 'No questions were loaded. Please try a different interview template.',
              variant: 'destructive',
            });
            return;
          }

          if (submissionId) {
            completeInterview({ submission_id: submissionId })
              .catch(err => console.error('Failed to complete interview on backend:', err));
          }

          setState(prev => ({
            ...prev,
            phase: 'completed',
            completionData: event,
          }));
        },

        onInterviewExpired: (event) => {
          clearQuestionLoadTimeout();
          setState(prev => ({
            ...prev,
            phase: 'expired',
            error: event.message,
          }));
          toast({
            title: 'Interview Expired',
            description: event.message,
            variant: 'destructive',
          });
        },

        onConnectionReplaced: (event) => {
          clearQuestionLoadTimeout();
          setState(prev => ({
            ...prev,
            phase: 'error',
            error: event.message,
            isConnected: false,
          }));
          toast({
            title: 'Connection Replaced',
            description: event.message,
            variant: 'destructive',
          });
        },

        onHeartbeatAck: (event) => {
          setState(prev => ({
            ...prev,
            timeRemainingSeconds: event.time_remaining_seconds,
          }));
        },

        onError: (event: ErrorEvent) => {
          console.error('❌ WebSocket error:', event);
          if (FATAL_ERROR_CODES.has(event.error_code)) {
            clearQuestionLoadTimeout();
            setState(prev => ({
              ...prev,
              phase: 'error',
              error: event.message,
            }));
            toast({
              title: 'Interview Error',
              description: event.message,
              variant: 'destructive',
            });
            socketRef.current?.disconnect();
            setTimeout(() => navigate('/candidate/dashboard'), 3000);
          } else {
            toast({
              title: 'Error',
              description: event.message,
              variant: 'destructive',
            });
          }
        },

        onClose: (code, _reason) => {
          setState(prev => {
            if (code !== 1000 && prev.phase !== 'completed' && prev.phase !== 'expired') {
              return {
                ...prev,
                isConnected: false,
                phase: 'error',
                error: prev.error || 'Connection to the interview was lost. Please refresh the page to rejoin the session.',
              };
            }

            return { ...prev, isConnected: false };
          });
        },

        onReconnecting: (attempt) => {
          setState(prev => ({ ...prev, phase: 'restoring' }));
          toast({
            title: 'Reconnecting...',
            description: `Attempt ${attempt} of 5`,
          });
        },

        onReconnected: () => {
          setState(prev => ({ ...prev, isConnected: true }));
          toast({
            title: 'Reconnected',
            description: 'Connection restored.',
          });
        },
      },
    );
  }, [clearQuestionLoadTimeout, navigate, state.currentQuestion, submissionId, setQuestionLoadTimeout]);

  const connectInterview = useCallback(() => {
    if (!submissionId) return;

    socketRef.current?.disconnect();
    const socket = createSocket();
    if (!socket) return;
    socketRef.current = socket;
    socket.connect();
  }, [createSocket, submissionId]);

  // ---- Start interview (REST call + WS connect) ----

  const startSession = useCallback(async (consentAccepted: boolean) => {
    if (!submissionId) return;

    setState(prev => ({ ...prev, phase: 'connecting', submissionId }));

    try {
      await startInterview({
        submission_id: submissionId,
        consent_accepted: consentAccepted,
      });
    } catch (err) {
      // If the session is already in_progress (CONFLICT), we can still proceed to connect
      const isConflict = err instanceof Error && 'status' in err && (err as { status: number }).status === 409;
      if (!isConflict) {
        setState(prev => ({ ...prev, phase: 'error', error: 'Failed to start interview session.' }));
        return;
      }
    }

    connectInterview();
  }, [submissionId, connectInterview]);

  useEffect(() => {
    if (!submissionId || restoreAttemptedRef.current) {
      return;
    }

    restoreAttemptedRef.current = true;

    const restore = async () => {
      setState(prev => ({ ...prev, phase: 'restoring', submissionId }));

      try {
        const detail = await getSessionStatus(submissionId);
        const status = detail.session.status;

        if (status === 'in_progress') {
          setState(prev => ({
            ...prev,
            submissionId,
            phase: 'connecting',
            currentSequence: detail.exchanges?.length ?? 0,
            error: null,
          }));
          connectInterview();
          return;
        }

        setState(prev => ({
          ...prev,
          phase: 'expired',
          error: status === 'completed'
            ? 'This interview has already been completed. Please open the interview report or start a new session if allowed.'
            : 'This interview link is no longer active. The session has expired or is not available anymore.',
        }));
      } catch (err) {
        const isConflict = err instanceof Error && 'status' in err && (err as { status: number }).status === 409;
        if (isConflict) {
          setState(prev => ({ ...prev, phase: 'connecting', submissionId }));
          connectInterview();
          return;
        }

        setState(prev => ({
          ...prev,
          phase: 'error',
          error: 'Unable to restore this interview session. The link may be invalid or the session may have already ended.',
        }));
      }
    };

    restore();
  }, [submissionId, connectInterview]);

  // ---- Actions ----

  const submitAnswer = useCallback((responseText: string) => {
    const socket = socketRef.current;
    const question = state.currentQuestion;
    if (!socket || !question) return;

    const responseTimeMs = Date.now() - questionStartTimeRef.current;
    setState(prev => ({ ...prev, phase: 'submitting' }));
    socket.submitAnswer(question.exchange_id, responseText, responseTimeMs);
  }, [state.currentQuestion]);

  const submitCode = useCallback((
    responseCode: string,
    responseLanguage: 'python' | 'java' | 'cpp',
  ) => {
    const socket = socketRef.current;
    const question = state.currentQuestion;
    if (!socket || !question) return;

    const responseTimeMs = Date.now() - questionStartTimeRef.current;
    setState(prev => ({ ...prev, phase: 'submitting' }));
    socket.submitCode(question.exchange_id, responseCode, responseLanguage, responseTimeMs);
  }, [state.currentQuestion]);

  const requestNextAfterCodeResult = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;
    setTransitionLoading('Loading next question...');
    socket.requestNextQuestion();
  }, [setTransitionLoading]);

  const endInterviewEarly = useCallback(async () => {
    if (!submissionId) return;
    try {
      await completeInterview({ submission_id: submissionId });
    } catch { /* ignore — server may have already completed */ }
    socketRef.current?.disconnect();
    navigate('/interview/complete', {
      state: {
        submissionId,
        questionsCompleted: state.currentSequence,
        totalQuestions: state.totalQuestions,
      },
    });
  }, [submissionId, navigate, state.currentSequence, state.totalQuestions]);

  const saveDraftAnswer = useCallback((content: string) => {
    if (submissionId && state.currentQuestion) {
      saveDraft(submissionId, state.currentQuestion.exchange_id, content);
    }
  }, [submissionId, state.currentQuestion]);

  // ---- Cleanup ----

  useEffect(() => {
    return () => {
      clearQuestionLoadTimeout();
      socketRef.current?.disconnect();
    };
  }, [clearQuestionLoadTimeout]);

  return {
    state,
    startSession,
    submitAnswer,
    submitCode,
    requestNextAfterCodeResult,
    endInterviewEarly,
    saveDraftAnswer,
    loadDraft: (exchangeId: number) =>
      submissionId ? loadDraft(submissionId, exchangeId) : null,
  };
}
