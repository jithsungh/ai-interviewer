import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react';
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
import { enqueueRecordingUpload } from '@/lib/recordingUploader';
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
    sendIntentGap,
    requestNextAfterCodeResult,
    forceNextQuestion,
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
  const [isFullscreenActive, setIsFullscreenActive] = useState<boolean>(Boolean(document.fullscreenElement));
  const [forceConsentGate, setForceConsentGate] = useState(false);
  const shownNoticeIdsRef = useRef<Set<string>>(new Set());
  const screenStreamRef = useRef<MediaStream | null>(null);
  const pendingScreenStreamRef = useRef<MediaStream | null>(null);
  const screenRecorderRef = useRef<MediaRecorder | null>(null);
  const screenChunksRef = useRef<BlobPart[]>([]);
  const screenStartedAtRef = useRef<number | null>(null);
  const screenStopRequestedRef = useRef(false);
  const screenShareEndedAtRef = useRef<number | null>(null);
  const publisherPcRef = useRef<RTCPeerConnection | null>(null);
  const publisherWsRef = useRef<WebSocket | null>(null);
  const publisherRetryCountRef = useRef(0);
  const publisherRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentQuestion = state.currentQuestion;
  const currentDraft = currentQuestion ? loadDraft(currentQuestion.exchange_id) : null;
  const { toast } = useToast();
  const effectiveSubmissionId = state.submissionId ?? submissionId;
  const consentStorageKey = effectiveSubmissionId ? `interview_consent_${effectiveSubmissionId}` : null;
  const isInterviewActive = !forceConsentGate && (state.phase === 'question_loading'
    || state.phase === 'answering'
    || state.phase === 'submitting'
    || state.phase === 'code_executing');

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
      if (!screenStopRequestedRef.current) {
        screenStopRequestedRef.current = true;
        if (screenRecorderRef.current && screenRecorderRef.current.state !== 'inactive') {
          console.info('[InterviewSession Recorder] stopping due to interview completion');
          try {
            screenRecorderRef.current.requestData();
          } catch {}
          try {
            screenRecorderRef.current.stop();
          } catch {}
        }
      }
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

  const handleConsent = (_consentData: ConsentData, screenStream: MediaStream | null) => {
    setConsentData(_consentData);
    pendingScreenStreamRef.current = screenStream;
    setForceConsentGate(false);
    setScreenRecordingError(null);
    if (consentStorageKey) {
      try {
        localStorage.setItem(consentStorageKey, JSON.stringify(_consentData));
      } catch {
      }
    }
    startSession(true, _consentData as unknown as Record<string, unknown>);
  };

  const handleConsentCancel = () => {
    navigate('/candidate/interviews');
  };

  const handleEndInterview = () => {
    if (!screenStopRequestedRef.current) {
      screenStopRequestedRef.current = true;
      if (screenRecorderRef.current && screenRecorderRef.current.state !== 'inactive') {
        console.info('[InterviewSession Recorder] stopping due to manual end');
        try {
          screenRecorderRef.current.requestData();
        } catch {}
        try {
          screenRecorderRef.current.stop();
        } catch {}
      }
    }
    endInterviewEarly();
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

  const requestFullscreenMode = useCallback(async () => {
    if (!document.documentElement.requestFullscreen) {
      setScreenRecordingError('Fullscreen mode is not supported in this browser.');
      return false;
    }

    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreenActive(true);
      return true;
    } catch {
      setScreenRecordingError('Fullscreen is required for this interview. Please enable fullscreen and continue.');
      return false;
    }
  }, []);

  const startScreenRecording = useCallback(async () => {
    console.info('[InterviewSession Recorder] startScreenRecording invoked', {
      submissionId: effectiveSubmissionId,
      consentScreenRecording: consentData?.screenRecording,
      isInterviewActive,
    });
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setScreenRecordingState('unsupported');
      setScreenRecordingError('Screen recording is not supported in this browser.');
      reportEvent('screen_recording_unavailable', 'low', 'Screen recording is unavailable in this browser.');
      return;
    }

    try {
      let stream = pendingScreenStreamRef.current;
      if (stream) {
        pendingScreenStreamRef.current = null;
      } else {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 10 },
          audio: false,
        });
      }

      if (!stream) {
        setScreenRecordingState('error');
        setScreenRecordingError('Screen recording could not start. Please retry screen sharing.');
        reportEvent('screen_recording_error', 'medium', 'Screen recording could not start (no stream).');
        return;
      }

      const [videoTrack] = stream.getVideoTracks();
      const surface = videoTrack?.getSettings?.().displaySurface;
      if (surface !== 'monitor') {
        stream.getTracks().forEach((track) => track.stop());
        setScreenRecordingState('error');
        setScreenRecordingError('Only full-screen sharing is allowed. Please share the Entire Screen.');
        reportEvent('screen_share_not_fullscreen', 'medium', 'Screen-share rejected because selected surface was not full-screen monitor.');
        return;
      }

      if (effectiveSubmissionId) {
        const offKey = `screen_share_ended_at_${effectiveSubmissionId}`;
        const storedEnded = localStorage.getItem(offKey);
        const endedAt = storedEnded ? Number(storedEnded) : screenShareEndedAtRef.current;
        if (endedAt && Number.isFinite(endedAt)) {
          const resumedAt = Date.now();
          const offDurationMs = Math.max(0, resumedAt - endedAt);
          reportEvent('screen_share_off_time', 'low', 'Screen share was inactive between sessions.', {
            off_duration_ms: offDurationMs,
            ended_at: new Date(endedAt).toISOString(),
            resumed_at: new Date(resumedAt).toISOString(),
          });
          screenShareEndedAtRef.current = null;
          localStorage.removeItem(offKey);
        }
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
          console.debug('[InterviewSession Recorder] dataavailable chunk received', {
            size: event.data.size,
            type: event.data.type,
          });
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
        console.debug('[InterviewSession Recorder] stopped', {
          submissionId: submissionForPersist,
          durationMs,
          chunkCount: screenChunksRef.current.length,
          blobSize: blob.size,
        });

        if (submissionForPersist && blob.size > 0) {
          try {
            const { artifactId, sizeBytes } = await persistScreenRecording(submissionForPersist, blob, durationMs);
            reportEvent('screen_recording_persisted', 'low', 'Screen recording artifact persisted.', {
              artifact_id: artifactId,
              size_bytes: sizeBytes,
              duration_ms: durationMs,
            });

            enqueueRecordingUpload(artifactId);
          } catch {
            reportEvent('screen_recording_persist_failed', 'medium', 'Screen recording artifact persistence failed.', {
              size_bytes: blob.size,
              duration_ms: durationMs,
            });
          }
        }

        reportEvent('screen_recording_stopped', 'low', 'Screen recording stopped.', {
          duration_ms: durationMs,
          size_bytes: blob.size,
        });

        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach((track) => track.stop());
        }
        // Cleanup publisher if active
        try {
          publisherWsRef.current?.close();
        } catch {}
        try {
          publisherPcRef.current?.getSenders().forEach((s) => s.track?.stop());
          publisherPcRef.current?.close();
        } catch {}
        publisherPcRef.current = null;
        publisherWsRef.current = null;
        screenChunksRef.current = [];
        screenStartedAtRef.current = null;
        screenStreamRef.current = null;
        screenRecorderRef.current = null;
        setScreenRecordingState('idle');
      };

      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          const endedAt = Date.now();
          screenShareEndedAtRef.current = endedAt;
          if (effectiveSubmissionId) {
            const offKey = `screen_share_ended_at_${effectiveSubmissionId}`;
            try {
              localStorage.setItem(offKey, String(endedAt));
            } catch {
            }
          }
          setForceConsentGate(true);
          setScreenRecordingError('Screen sharing stopped. Please re-share full screen to continue the interview.');
          reportEvent('screen_share_ended', 'medium', 'Screen sharing ended during interview.');
          if (screenRecorderRef.current?.state === 'recording') {
            try {
              screenRecorderRef.current.requestData();
            } catch {}
            screenRecorderRef.current.stop();
          }
        };
      });

      screenRecorderRef.current = recorder;

      const resolveWsBase = () => {
        const envBase = import.meta.env.VITE_WS_BASE_URL as string | undefined;
        let base = envBase
          ? (envBase.startsWith('http') ? envBase.replace(/^http/, 'ws') : envBase)
          : window.location.origin.replace(/^http/, 'ws');

        if (window.location.protocol === 'https:' && base.startsWith('ws://')) {
          base = base.replace(/^ws:\/\//, 'wss://');
        }

        return base;
      };

      const startPublisher = (mediaStream: MediaStream) => {
        try {
          if (publisherRetryTimerRef.current) {
            clearTimeout(publisherRetryTimerRef.current);
            publisherRetryTimerRef.current = null;
          }
          try { publisherWsRef.current?.close(); } catch {}
          try { publisherPcRef.current?.getSenders().forEach((s) => s.track?.stop()); } catch {}
          try { publisherPcRef.current?.close(); } catch {}

          const wsBase = resolveWsBase();
          const publishUrl = `${wsBase.replace(/\/$/, '')}/api/v1/proctoring/signaling/publish/${effectiveSubmissionId}`;
          console.debug('[InterviewSession Publisher] Using WS base', {
            wsBase,
            location: window.location.origin,
          });
          if (window.location.protocol === 'https:' && wsBase.startsWith('ws://')) {
            console.warn('[InterviewSession Publisher] Mixed content blocked: page is https but WS base is ws://');
          }
          const pc = new RTCPeerConnection({iceServers: [{urls: ['stun:stun.l.google.com:19302']}]});
          publisherPcRef.current = pc;

          console.debug('[InterviewSession Publisher] Creating RTCPeerConnection for submission', effectiveSubmissionId);

          mediaStream.getTracks().forEach((track) => pc.addTrack(track, mediaStream));
          console.debug('[InterviewSession Publisher] Added tracks to RTCPeerConnection');

          const ws = new WebSocket(publishUrl);
          publisherWsRef.current = ws;
          console.debug('[InterviewSession Publisher] WebSocket connecting to', publishUrl);

          let offerInFlight = false;
          const schedulePublisherReconnect = (reason: string) => {
            if (screenRecorderRef.current?.state !== 'recording') return;
            if (publisherRetryCountRef.current >= 5) return;
            publisherRetryCountRef.current += 1;
            const delayMs = 1000 * publisherRetryCountRef.current;
            console.info('[InterviewSession Publisher] reconnecting in', delayMs, 'ms', reason);
            if (publisherRetryTimerRef.current) {
              clearTimeout(publisherRetryTimerRef.current);
            }
            publisherRetryTimerRef.current = setTimeout(() => startPublisher(mediaStream), delayMs);
          };
          const sendOffer = async (reason: string) => {
            if (offerInFlight) {
              console.debug('[InterviewSession Publisher] Offer already in-flight, skipping', reason);
              return;
            }
            if (pc.signalingState !== 'stable') {
              if (pc.signalingState === 'have-local-offer') {
                try {
                  console.debug('[InterviewSession Publisher] Rolling back stale offer', { reason });
                  await pc.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit);
                } catch (err) {
                  console.warn('[InterviewSession Publisher] Rollback failed, reconnecting publisher', err);
                  schedulePublisherReconnect('rollback_failed');
                  return;
                }
              } else {
                console.debug('[InterviewSession Publisher] Signaling not stable, skipping offer', {
                  reason,
                  signalingState: pc.signalingState,
                });
                return;
              }
            }
            if (ws.readyState !== WebSocket.OPEN) {
              console.debug('[InterviewSession Publisher] WS not open, skipping offer', {
                reason,
                readyState: ws.readyState,
              });
              return;
            }

            offerInFlight = true;
            try {
              console.debug('[InterviewSession Publisher] Creating offer', { reason });
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              ws.send(JSON.stringify({ type: 'offer', sdp: pc.localDescription }));
            } catch (err) {
              console.error('[InterviewSession Publisher] Failed to create/send offer', err);
            } finally {
              offerInFlight = false;
            }
          };

          pc.onicecandidate = (e) => {
            if (e.candidate && ws.readyState === WebSocket.OPEN) {
              console.debug('[InterviewSession Publisher] Sending ICE candidate');
              ws.send(JSON.stringify({type: 'candidate', candidate: e.candidate}));
            } else if (e.candidate) {
              console.debug('[InterviewSession Publisher] ICE candidate (but WS not open)', ws.readyState);
            }
          };

          ws.onopen = async () => {
            publisherRetryCountRef.current = 0;
            await sendOffer('ws_open');
          };

          ws.onmessage = async (evt) => {
            try {
              const msg = JSON.parse(evt.data);
              console.debug('[InterviewSession Publisher] Received message from broker', msg.type || msg);
              if (msg.type === 'answer' || msg.sdp?.type === 'answer') {
                const answer = msg.sdp ?? msg.answer ?? msg;
                if (pc.signalingState !== 'have-local-offer') {
                  console.debug('[InterviewSession Publisher] Ignoring duplicate/late answer', {
                    signalingState: pc.signalingState,
                    hasRemote: Boolean(pc.currentRemoteDescription),
                  });
                } else {
                  console.debug('[InterviewSession Publisher] Setting remote description (answer)');
                  try {
                    await pc.setRemoteDescription(answer);
                    console.debug('[InterviewSession Publisher] Successfully set remote answer');
                  } catch (err) {
                    if (err instanceof DOMException && err.name === 'InvalidStateError') {
                      console.debug('[InterviewSession Publisher] Ignoring InvalidStateError on answer', {
                        signalingState: pc.signalingState,
                      });
                    } else {
                      throw err;
                    }
                  }
                }
              }
              if (msg.type === 'watch' || msg.type === 'watcher_joined') {
                await sendOffer(msg.type);
              }
              if (msg.type === 'candidate' && msg.candidate) {
                try { await pc.addIceCandidate(msg.candidate); } catch(e){ console.error('[InterviewSession Publisher] ICE candidate error', e); }
              } else if (msg.type === 'candidate') {
                console.debug('[InterviewSession Publisher] Received candidate message but no candidate field', msg);
              }
            } catch (e) {
              console.error('[InterviewSession Publisher] WebSocket message handling error', e);
            }
          };

          pc.onconnectionstatechange = () => {
            console.debug('[InterviewSession Publisher] RTCPeerConnection state:', pc.connectionState);
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
              schedulePublisherReconnect('pc_connection');
            }
          };
          pc.oniceconnectionstatechange = () => {
            console.debug('[InterviewSession Publisher] RTCPeerConnection ICE state:', pc.iceConnectionState);
            if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
              schedulePublisherReconnect('ice_connection');
            }
          };

          ws.onerror = (e) => console.error('[InterviewSession Publisher] WebSocket error', e);
          ws.onclose = (event) => {
            console.info('[InterviewSession Publisher] WebSocket closed', {
              code: event.code,
              reason: event.reason,
              wasClean: event.wasClean,
            });
            schedulePublisherReconnect('ws_close');
          };
        } catch (e) {
          console.error('[InterviewSession Publisher] Failed to start publisher', e);
        }
      };

      // --- Start in-process WebRTC publisher (development broker) ---
      startPublisher(stream);

      recorder.start(3000);
      setScreenRecordingError(null);
      setScreenRecordingState('recording');
      reportEvent('screen_recording_started', 'low', 'Screen recording started for proctoring.');
    } catch (error) {
      setScreenRecordingState('error');
      setScreenRecordingError('Screen recording permission denied or unavailable. Click "Enable Screen Sharing" to try again.');
      reportEvent('screen_recording_denied', 'medium', 'Screen recording permission denied or unavailable.', {
        error: error instanceof Error ? error.message : 'unknown_error',
      });
    }
  }, [effectiveSubmissionId, reportEvent]);

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
        return;
      }
    } catch {
    }
  }, [consentStorageKey]);


  useEffect(() => {
    if (!isInterviewActive) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isInterviewActive]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreenActive(active);

      if (!active && isInterviewActive && consentData?.screenRecording) {
        reportEvent('window_focus_lost', 'medium', 'Fullscreen mode exited during interview.');
        setScreenRecordingError('Fullscreen mode exited. Please re-enter fullscreen to maintain interview integrity.');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [consentData?.screenRecording, isInterviewActive, reportEvent]);

  useEffect(() => {
    if (!isInterviewActive || !consentData?.screenRecording) return;
    void requestFullscreenMode();
  }, [consentData?.screenRecording, isInterviewActive, requestFullscreenMode]);

  useEffect(() => {
    const shouldRecordScreen = Boolean(consentData?.screenRecording) && Boolean(effectiveSubmissionId) && isInterviewActive;
    if (!shouldRecordScreen) {
      console.info('[InterviewSession Recorder] screen recording not started', {
        consentScreenRecording: consentData?.screenRecording,
        effectiveSubmissionId,
        isInterviewActive,
      });
      return;
    }
    if (screenRecorderRef.current || screenStreamRef.current) {
      console.info('[InterviewSession Recorder] screen recording already active, skipping start');
      return;
    }
    void startScreenRecording();

    return () => {
      if (screenRecorderRef.current && screenRecorderRef.current.state !== 'inactive') {
        try {
          screenRecorderRef.current.requestData();
          screenRecorderRef.current.stop();
        } catch {
        }
      }
      if (publisherRetryTimerRef.current) {
        clearTimeout(publisherRetryTimerRef.current);
        publisherRetryTimerRef.current = null;
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      // Cleanup publisher if still present
      try { publisherWsRef.current?.close(); } catch {}
      try { publisherPcRef.current?.getSenders().forEach((s) => s.track?.stop()); publisherPcRef.current?.close(); } catch {}
      publisherPcRef.current = null;
      publisherWsRef.current = null;
      screenRecorderRef.current = null;
      screenStreamRef.current = null;
    };
  }, [consentData?.screenRecording, effectiveSubmissionId, isInterviewActive, startScreenRecording]);

  // Consent Phase
  if (state.phase === 'consent' || forceConsentGate) {
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
        onForceNext={forceNextQuestion}
        initialAnswer={currentDraft ?? ''}
        onAnswerDraftChange={saveDraftAnswer}
        onIntentGap={sendIntentGap}
        clarificationResponse={state.lastClarification}
        intentDecision={state.lastIntentDecision}
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
      <header className="border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--card)]/90">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 px-4 py-3 lg:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary shadow-glow">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold tracking-tight text-[var(--primary)]">InterviewAI</span>
                  <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-[0.08em]">
                    Coding Challenge
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Live interview session · question {state.currentSequence} of {state.totalQuestions}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Badge className="rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--primary)]">
                Question {state.currentSequence}/{state.totalQuestions}
              </Badge>

              {state.timeRemainingSeconds != null && (
                <div className={cn(
                  'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold',
                  state.timeRemainingSeconds < 60 ? 'bg-destructive/10 text-destructive' : 'bg-[var(--surface)] text-[var(--primary)]'
                )}>
                  <Clock className="h-4 w-4" />
                  <span className="font-mono">{formatTime(state.timeRemainingSeconds)}</span>
                </div>
              )}

              <NetworkStatusBadge />

              <Badge
                className={cn(
                  'rounded-full border-0 px-3 py-1.5',
                  integrityLevel === 'good' && 'bg-emerald-500/15 text-emerald-700',
                  integrityLevel === 'warning' && 'bg-amber-500/15 text-amber-700',
                  integrityLevel === 'critical' && 'bg-rose-500/15 text-rose-700',
                )}
              >
                {integrityLevel === 'good' ? <ShieldCheck className="mr-1 h-3.5 w-3.5" /> : <ShieldAlert className="mr-1 h-3.5 w-3.5" />}
                Integrity {integrityLevel.toUpperCase()}
              </Badge>

              {consentData?.screenRecording && (
                <Badge className={cn('rounded-full border-0 px-3 py-1.5', screenRecordingState === 'recording' ? 'bg-blue-500/15 text-blue-700' : 'bg-muted text-muted-foreground')}>
                  <Monitor className="mr-1 h-3.5 w-3.5" />
                  {screenRecordingState === 'recording' ? 'Screen Rec On' : 'Screen Rec Off'}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {isInterviewActive && (
              <Badge variant="outline" className="rounded-full border-[var(--border)] bg-[var(--surface)] text-[var(--primary)]">
                Focus {focusLossCount}
              </Badge>
            )}
            {isInterviewActive && (
              <Badge variant="outline" className="rounded-full border-[var(--border)] bg-[var(--surface)] text-[var(--primary)]">
                Tabs {tabSwitchCount}
              </Badge>
            )}
            {consentData?.screenRecording && screenRecordingError && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-800">
                {screenRecordingError}
              </span>
            )}
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-3 lg:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
              className="border border-[var(--border)] bg-[var(--surface)] shadow-sm"
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsVideoOn(!isVideoOn)}
              className="border border-[var(--border)] bg-[var(--surface)] shadow-sm"
            >
              {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setShowEndDialog(true)}
              className="shadow-sm"
            >
              End Interview
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {isInterviewActive ? (
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-700">Interview active</span>
            ) : (
              <span className="rounded-full bg-muted px-3 py-1">Session in transition</span>
            )}
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1">
        <Progress value={state.progress} className="h-full rounded-none" />
      </div>

      {consentData?.screenRecording && screenRecordingState !== 'recording' && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-amber-900">Screen sharing is required</p>
              <p className="text-sm text-amber-800">
                Enable fullscreen, then share Entire Screen in the browser picker.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => {
                void (async () => {
                  const fullscreenReady = await requestFullscreenMode();
                  if (!fullscreenReady) return;
                  await startScreenRecording();
                })();
              }}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {isFullscreenActive ? 'Enable Screen Sharing' : 'Enable Fullscreen + Screen Sharing'}
            </Button>
          </div>
        </div>
      )}

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
                onClick={handleEndInterview}
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
