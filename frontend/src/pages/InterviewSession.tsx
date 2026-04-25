import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CodeEditor } from '@/components/interview/CodeEditor';
import { ChatInterface } from '@/components/interview/ChatInterface';
import { SpeakingQuestion } from '@/components/interview/SpeakingQuestion';
import { ConsentForm, ConsentData } from '@/components/interview/ConsentForm';
import { NetworkStatusBadge } from '@/components/interview/NetworkStatusBadge';
import { useInterview } from '@/hooks/useInterview';
import { 
  Clock, 
  Mic, 
  MicOff, 
  Video,
  VideoOff,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Monitor
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useProctoringMonitor } from '@/hooks/useProctoringMonitor';
import { persistScreenRecording } from '@/lib/proctoringRecordingStorage';
import { useToast } from '@/hooks/use-toast';
import { getCandidateSettings } from '@/services/candidateService';
import {
  DEFAULT_INTERVIEW_CUSTOMIZATION,
  INTERVIEW_AVATAR_CATALOG,
  interviewCustomizationStorageKey,
  type InterviewCustomization,
} from '@/types/interviewCustomization';

const InterviewSession = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const submissionIdParam = searchParams.get('submission_id');
  const submissionId = submissionIdParam ? Number(submissionIdParam) : null;
  const interviewThemeVars: CSSProperties = {
    ['--primary' as any]: '#001938',
    ['--primary-foreground' as any]: '#ffffff',
    ['--secondary' as any]: '#E9C349',
    ['--secondary-foreground' as any]: '#001938',
    ['--accent' as any]: '#7697CC',
    ['--background' as any]: '#FAFAFA',
    ['--surface' as any]: '#F5F7FA',
    ['--card' as any]: '#ffffff',
    ['--muted' as any]: '#f3f3f3',
    ['--muted-foreground' as any]: '#64748B',
    ['--border' as any]: 'rgba(0,25,56,0.10)',
    ['--ring' as any]: '#E9C349',
    ['--gradient-primary' as any]: 'linear-gradient(135deg, #E9C349 0%, #F7E6A0 100%)',
    ['--gradient-hero' as any]: 'linear-gradient(180deg, #FAFAFA 0%, rgba(233,195,73,0.08) 100%)',
    ['--gradient-card' as any]: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
    ['--shadow-glow' as any]: '0 0 40px rgba(233,195,73,0.22)',
    ['--shadow-card' as any]: '0 4px 24px rgba(0,25,56,0.08)',
    ['--shadow-elevated' as any]: '0 8px 32px rgba(0,25,56,0.12)',
  };

  const {
    state,
    startSession,
    submitAnswer,
    submitCode,
    requestNextAfterCodeResult,
    endInterviewEarly,
    saveDraftAnswer,
    loadDraft,
  } = useInterview(submissionId);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [consentData, setConsentData] = useState<ConsentData | null>(null);
  const [interviewCustomization, setInterviewCustomization] = useState<InterviewCustomization>(DEFAULT_INTERVIEW_CUSTOMIZATION);
  const [screenRecordingState, setScreenRecordingState] = useState<'idle' | 'recording' | 'error' | 'unsupported'>('idle');
  const [screenRecordingError, setScreenRecordingError] = useState<string | null>(null);
  const shownNoticeIdsRef = useRef<Set<string>>(new Set());
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenRecorderRef = useRef<MediaRecorder | null>(null);
  const screenChunksRef = useRef<BlobPart[]>([]);
  const screenStartedAtRef = useRef<number | null>(null);

  const currentQuestion = state.currentQuestion;
  const currentDraft = currentQuestion ? loadDraft(currentQuestion.exchange_id) : null;
  const { toast } = useToast();
  const effectiveSubmissionId = state.submissionId ?? submissionId;
  const consentStorageKey = effectiveSubmissionId ? `interview_consent_${effectiveSubmissionId}` : null;
  const isInterviewActive = state.phase !== 'consent' && state.phase !== 'completed' && state.phase !== 'error' && state.phase !== 'expired';

  const {
    integrityLevel,
    notices: proctoringNotices,
    tabSwitchCount,
    focusLossCount,
    dismissNotice,
    reportEvent,
  } = useProctoringMonitor({
    submissionId: effectiveSubmissionId,
    enabled: isInterviewActive,
  });

  useEffect(() => {
    proctoringNotices.forEach((notice) => {
      if (shownNoticeIdsRef.current.has(notice.id)) return;
      shownNoticeIdsRef.current.add(notice.id);

      if (notice.severity === 'high') {
        window.alert(`Integrity alert: ${notice.message}`);
      } else {
        toast({
          title: 'Proctoring notice',
          description: notice.message,
          variant: notice.severity === 'medium' ? 'destructive' : 'default',
        });
      }

      dismissNotice(notice.id);
    });
  }, [proctoringNotices, dismissNotice, toast]);

  useEffect(() => {
    if (!screenRecordingError) return;
    toast({
      title: 'Screen recording notice',
      description: screenRecordingError,
      variant: 'destructive',
    });
  }, [screenRecordingError, toast]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Navigate to completion page when interview completes
  useEffect(() => {
    if (state.phase === 'completed') {
      navigate('/interview/complete', {
        state: {
          submissionId: state.submissionId,
          completionData: state.completionData,
          questionsCompleted: state.currentSequence,
          totalQuestions: state.totalQuestions,
        },
      });
    }
  }, [state.phase, state.submissionId, state.completionData, state.currentSequence, state.totalQuestions, navigate]);

  const handleConsent = (_consentData: ConsentData) => {
    setConsentData(_consentData);
    if (consentStorageKey) {
      try {
        localStorage.setItem(consentStorageKey, JSON.stringify(_consentData));
      } catch {
      }
    }
    startSession(true);
  };

  const handleConsentCancel = () => {
    navigate('/candidate/interviews');
  };

  const handleSpeakingComplete = () => {
    // This is called when the speaking question UI finishes — does nothing.
    // The answer will be submitted via handleSpeakingAnswer.
  };

  const handleSpeakingAnswer = (answer: string) => {
    submitAnswer(answer);
  };

  const handleCodeSubmit = (code: string, language: string) => {
    submitCode(code, language as 'python' | 'java' | 'cpp');
  };

  const handleCodeResultContinue = () => {
    requestNextAfterCodeResult();
  };

  useEffect(() => {
    if (!effectiveSubmissionId) return;
    try {
      const raw = localStorage.getItem(interviewCustomizationStorageKey(effectiveSubmissionId));
      if (raw) {
        const parsed = JSON.parse(raw) as InterviewCustomization;
        const avatar = INTERVIEW_AVATAR_CATALOG.find((item) => item.id === parsed.avatarId)
          ?? INTERVIEW_AVATAR_CATALOG.find((item) => item.modelPath === parsed.avatarModelPath)
          ?? INTERVIEW_AVATAR_CATALOG[0];
        setInterviewCustomization({
          avatarId: avatar.id,
          avatarGender: avatar.gender,
          avatarName: avatar.name,
          avatarModelPath: avatar.modelPath,
          avatarImagePath: avatar.imagePath,
          voiceType: parsed.voiceType ?? avatar.gender,
          voiceName: parsed.voiceName ?? null,
          wordsPerMinute: parsed.wordsPerMinute ?? DEFAULT_INTERVIEW_CUSTOMIZATION.wordsPerMinute,
        });
        return;
      }
    } catch {
      setInterviewCustomization(DEFAULT_INTERVIEW_CUSTOMIZATION);
    }

    getCandidateSettings()
      .then((settings) => {
        const rawCustomization = settings.ui_preferences?.interview_customization ?? settings.ui_preferences?.interview_avatar;
        if (!rawCustomization || typeof rawCustomization !== 'object') {
          return;
        }

        const parsed = rawCustomization as Partial<InterviewCustomization>;
        const avatar = INTERVIEW_AVATAR_CATALOG.find((item) => item.id === parsed.avatarId)
          ?? INTERVIEW_AVATAR_CATALOG.find((item) => item.modelPath === parsed.avatarModelPath)
          ?? INTERVIEW_AVATAR_CATALOG[0];
        setInterviewCustomization({
          avatarId: avatar.id,
          avatarGender: avatar.gender,
          avatarName: avatar.name,
          avatarModelPath: avatar.modelPath,
          avatarImagePath: avatar.imagePath,
          voiceType: parsed.voiceType ?? avatar.gender,
          voiceName: parsed.voiceName ?? null,
          wordsPerMinute: parsed.wordsPerMinute ?? DEFAULT_INTERVIEW_CUSTOMIZATION.wordsPerMinute,
        });
      })
      .catch(() => {
      });
  }, [effectiveSubmissionId]);

  useEffect(() => {
    if (!consentStorageKey) return;
    try {
      const raw = localStorage.getItem(consentStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as ConsentData;
        setConsentData(parsed);
      }
    } catch {
    }
  }, [consentStorageKey]);

  useEffect(() => {
    const shouldRecordScreen = Boolean(consentData?.screenRecording) && Boolean(effectiveSubmissionId) && isInterviewActive;
    if (!shouldRecordScreen) {
      return;
    }
    if (screenRecorderRef.current || screenStreamRef.current) {
      return;
    }

    let cancelled = false;

    const startScreenRecording = async () => {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        setScreenRecordingState('unsupported');
        setScreenRecordingError('Screen recording is not supported in this browser.');
        reportEvent('screen_recording_unavailable', 'low', 'Screen recording is unavailable in this browser.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 10 },
          audio: false,
        });

        const [videoTrack] = stream.getVideoTracks();
        const surface = videoTrack?.getSettings?.().displaySurface;
        if (surface !== 'monitor') {
          stream.getTracks().forEach((track) => track.stop());
          setScreenRecordingState('error');
          setScreenRecordingError('Only full-screen sharing is allowed. Please share the Entire Screen.');
          reportEvent('screen_share_not_fullscreen', 'medium', 'Screen-share rejected because selected surface was not full-screen monitor.');
          return;
        }

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        screenStreamRef.current = stream;
        screenChunksRef.current = [];
        screenStartedAtRef.current = Date.now();

        const recorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
            ? 'video/webm;codecs=vp8'
            : 'video/webm',
        });

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            screenChunksRef.current.push(event.data);
          }
        };

        recorder.onerror = () => {
          setScreenRecordingState('error');
          setScreenRecordingError('Screen recording failed during capture.');
          reportEvent('screen_recording_error', 'medium', 'Screen recording failed during capture.');
        };

        recorder.onstop = async () => {
          const submissionForPersist = effectiveSubmissionId;
          const durationMs = screenStartedAtRef.current ? Date.now() - screenStartedAtRef.current : 0;
          const blob = new Blob(screenChunksRef.current, { type: 'video/webm' });

          if (submissionForPersist && blob.size > 0) {
            try {
              const { artifactId, sizeBytes } = await persistScreenRecording(submissionForPersist, blob);
              reportEvent('screen_recording_persisted', 'low', 'Screen recording artifact persisted.', {
                artifact_id: artifactId,
                size_bytes: sizeBytes,
                duration_ms: durationMs,
              });
            } catch {
              reportEvent('screen_recording_persist_failed', 'medium', 'Screen recording artifact persistence failed.', {
                size_bytes: blob.size,
                duration_ms: durationMs,
              });
            }
          }

          screenChunksRef.current = [];
          setScreenRecordingState('idle');
        };

        stream.getVideoTracks().forEach((track) => {
          track.onended = () => {
            setScreenRecordingError('Screen sharing stopped. Interview continues, but please re-share full screen to maintain proctoring compliance.');
            reportEvent('screen_share_ended', 'medium', 'Screen sharing ended during interview.');
            if (screenRecorderRef.current?.state === 'recording') {
              screenRecorderRef.current.stop();
            }
          };
        });

        screenRecorderRef.current = recorder;
        recorder.start(3000);
        setScreenRecordingError(null);
        setScreenRecordingState('recording');
        reportEvent('screen_recording_started', 'low', 'Screen recording started for proctoring.');
      } catch (error) {
        setScreenRecordingState('error');
        setScreenRecordingError('Screen recording permission denied or unavailable.');
        reportEvent('screen_recording_denied', 'medium', 'Screen recording permission denied or unavailable.', {
          error: error instanceof Error ? error.message : 'unknown_error',
        });
      }
    };

    startScreenRecording();

    return () => {
      cancelled = true;
      if (screenRecorderRef.current && screenRecorderRef.current.state !== 'inactive') {
        try {
          screenRecorderRef.current.stop();
        } catch {
        }
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      screenRecorderRef.current = null;
      screenStreamRef.current = null;
    };
  }, [consentData?.screenRecording, effectiveSubmissionId, isInterviewActive, reportEvent]);

  // Consent Phase
  if (state.phase === 'consent') {
    if (!submissionId) {
      return (
        <div className="new-frontend-theme min-h-screen bg-[var(--surface)] flex items-center justify-center" style={interviewThemeVars}>
          <div className="text-center max-w-md">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Interview Link</h2>
            <p className="text-muted-foreground mb-4">The interview session identifier is missing or invalid.</p>
            <Button onClick={() => navigate('/candidate/dashboard')}>Return to Dashboard</Button>
          </div>
        </div>
      );
    }

    return (
      <ConsentForm
        onConsent={handleConsent}
        onCancel={handleConsentCancel}
        interviewType={searchParams.get('type')?.replace('-', ' ').toUpperCase() || 'INTERVIEW'}
        duration={60}
      />
    );
  }

  // Connecting phase
  if (state.phase === 'restoring' || state.phase === 'connecting' || (state.phase === 'question_loading' && !currentQuestion)) {
    const message = state.phase === 'restoring'
      ? 'Restoring your interview session...'
      : state.phase === 'question_loading'
        ? 'Loading the next question...'
        : 'Connecting to Interview...';

    return (
      <div className="new-frontend-theme min-h-screen bg-[var(--surface)] flex items-center justify-center" style={interviewThemeVars}>
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">{message}</h2>
          <p className="text-muted-foreground">Please wait while we set up your session.</p>
        </div>
      </div>
    );
  }

  // Error phase
  if (state.phase === 'error') {
    return (
      <div className="new-frontend-theme min-h-screen bg-[var(--surface)] flex items-center justify-center" style={interviewThemeVars}>
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Interview Error</h2>
          <p className="text-muted-foreground mb-4">{state.error}</p>
          <Button onClick={() => navigate('/candidate/dashboard')}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  // Expired phase
  if (state.phase === 'expired') {
    return (
      <div className="new-frontend-theme min-h-screen bg-[var(--surface)] flex items-center justify-center" style={interviewThemeVars}>
        <div className="text-center max-w-md">
          <Clock className="h-12 w-12 text-warning mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Interview Time Expired</h2>
          <p className="text-muted-foreground mb-4">{state.error}</p>
          <Button onClick={() => navigate('/candidate/dashboard')}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  // Waiting for question (after connect but before first question_payload)
  if (!currentQuestion && (state.phase === 'answering' || state.phase === 'submitting')) {
    return (
      <div className="new-frontend-theme min-h-screen bg-[var(--surface)] flex items-center justify-center" style={interviewThemeVars}>
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Loading question...</h2>
        </div>
      </div>
    );
  }

  // Speaking Question Phases (non-coding questions)
  if (currentQuestion && currentQuestion.question_type !== 'coding') {
    return (
      <SpeakingQuestion
        submissionId={effectiveSubmissionId}
        question={currentQuestion.question_text}
        questionNumber={state.currentSequence}
        totalQuestions={state.totalQuestions}
        timeRemainingSeconds={state.timeRemainingSeconds}
        avatarModelPath={interviewCustomization.avatarModelPath}
        preferredVoiceType={interviewCustomization.voiceType}
        preferredVoiceName={interviewCustomization.voiceName}
        speechRate={Math.max(0.75, Math.min(1.35, interviewCustomization.wordsPerMinute / 160))}
        difficulty={currentQuestion.question_difficulty}
        topic={currentQuestion.section_name}
        onComplete={handleSpeakingComplete}
        onAnswer={handleSpeakingAnswer}
        initialAnswer={currentDraft ?? ''}
        onAnswerDraftChange={saveDraftAnswer}
        phase={currentQuestion.question_type}
        integrityLevel={integrityLevel}
        tabSwitchCount={tabSwitchCount}
        focusLossCount={focusLossCount}
        onProctoringEvent={reportEvent}
      />
    );
  }

  // Build execution output for CodeEditor from code_execution_completed event
  const codeExecResult = state.codeExecutionResult;
  const executionOutput = codeExecResult
    ? `Status: ${codeExecResult.execution_status}\nScore: ${codeExecResult.score}\n${codeExecResult.test_results_summary}\nExecution Time: ${codeExecResult.execution_time_ms}ms`
    : null;

  // Coding Phase - Split Screen
  return (
    <div className="new-frontend-theme min-h-screen bg-[var(--surface)] flex flex-col" style={interviewThemeVars}>
      {/* Header */}
      <header className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 bg-[var(--card)]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">InterviewAI</span>
          </div>
          <Badge variant="secondary">Coding Challenge</Badge>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Question</span>
            <span className="font-semibold">{state.currentSequence}/{state.totalQuestions}</span>
          </div>
          
          {state.timeRemainingSeconds != null && (
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full",
              state.timeRemainingSeconds < 60 ? "bg-destructive/10 text-destructive" : "bg-muted"
            )}>
              <Clock className="w-4 h-4" />
              <span className="font-mono font-semibold">{formatTime(state.timeRemainingSeconds)}</span>
            </div>
          )}

          <NetworkStatusBadge />
          <Badge
            className={cn(
              'border-0',
              integrityLevel === 'good' && 'bg-emerald-500/15 text-emerald-700',
              integrityLevel === 'warning' && 'bg-amber-500/15 text-amber-700',
              integrityLevel === 'critical' && 'bg-rose-500/15 text-rose-700',
            )}
          >
            {integrityLevel === 'good' ? <ShieldCheck className="mr-1 h-3.5 w-3.5" /> : <ShieldAlert className="mr-1 h-3.5 w-3.5" />}
            Integrity {integrityLevel.toUpperCase()}
          </Badge>
          {consentData?.screenRecording && (
            <Badge className={cn('border-0', screenRecordingState === 'recording' ? 'bg-blue-500/15 text-blue-700' : 'bg-muted text-muted-foreground')}>
              <Monitor className="mr-1 h-3.5 w-3.5" />
              {screenRecordingState === 'recording' ? 'Screen Rec On' : 'Screen Rec Off'}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setIsVideoOn(!isVideoOn)}
          >
            {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => setShowEndDialog(true)}
          >
            End Interview
          </Button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1">
        <Progress value={state.progress} className="h-full rounded-none" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Question Panel */}
        <div className="w-1/2 border-r border-[var(--border)] flex flex-col bg-[var(--background)]">
          <div className="p-4 border-b border-[var(--border)] bg-[var(--surface)]">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Coding Challenge</h2>
              <div className="flex items-center gap-2">
                <Badge 
                  className={cn(
                    currentQuestion?.question_difficulty === 'easy' && 'bg-success/10 text-success',
                    currentQuestion?.question_difficulty === 'medium' && 'bg-warning/10 text-warning',
                    currentQuestion?.question_difficulty === 'hard' && 'bg-destructive/10 text-destructive'
                  )}
                >
                  {currentQuestion?.question_difficulty}
                </Badge>
                <Badge variant="outline">{currentQuestion?.section_name}</Badge>
              </div>
            </div>
          </div>

          <Tabs defaultValue="question" className="flex-1 flex flex-col">
            <TabsList className="mx-4 mt-4 w-fit">
              <TabsTrigger value="question">Question</TabsTrigger>
              <TabsTrigger value="chat">AI Assistant</TabsTrigger>
            </TabsList>

            <TabsContent value="question" className="flex-1 overflow-auto p-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ 
                  __html: (currentQuestion?.question_text || '').replace(/\n/g, '<br>').replace(/`([^`]+)`/g, '<code>$1</code>')
                }} />
              </div>

              {currentQuestion?.test_cases && currentQuestion.test_cases.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Test Cases</h3>
                  <div className="space-y-2">
                    {currentQuestion.test_cases.map((tc, i) => (
                      <div key={i} className="p-3 rounded-lg bg-[var(--card)] border border-[var(--border)] font-mono text-sm">
                        <div className="flex gap-2">
                          <span className="text-muted-foreground">Input:</span>
                          <span>{tc.input}</span>
                        </div>
                        <div className="flex gap-2 mt-1">
                          <span className="text-muted-foreground">Output:</span>
                          <span>{tc.expected}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="chat" className="flex-1 overflow-hidden p-4">
              <ChatInterface />
            </TabsContent>
          </Tabs>

          <div className="p-4 border-t border-[var(--border)] bg-[var(--card)]">
            {codeExecResult ? (
              <Button
                className="w-full"
                onClick={handleCodeResultContinue}
                disabled={state.phase === 'question_loading'}
              >
                {state.phase === 'question_loading' ? 'Loading next question...' : 'Continue to Next Question'}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                className="w-full"
                disabled={state.phase === 'submitting' || state.phase === 'code_executing'}
              >
                {state.phase === 'submitting' ? 'Submitting...' :
                 state.phase === 'code_executing' ? 'Executing...' :
                 'Use "Run Code" to submit'}
              </Button>
            )}
          </div>
        </div>

        {/* Code Editor Panel */}
        <div className="w-1/2 flex flex-col">
          <CodeEditor 
            initialCode={(currentDraft ?? currentQuestion?.starter_code) || '# Write your code here'}
            language="python"
            onSubmit={handleCodeSubmit}
            onCodeChange={(code) => saveDraftAnswer(code)}
            isExecuting={state.phase === 'code_executing'}
            executionOutput={executionOutput}
          />
        </div>
      </div>

      {/* End Interview Dialog */}
      {showEndDialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-xl border border-border shadow-elevated max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold">End Interview?</h3>
                <p className="text-sm text-muted-foreground">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              You have completed {state.currentSequence} out of {state.totalQuestions} questions. 
              Are you sure you want to end the interview now?
            </p>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowEndDialog(false)}
              >
                Continue Interview
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={endInterviewEarly}
              >
                End Interview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewSession;
