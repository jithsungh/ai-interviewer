import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, VolumeX, SkipForward, Pause, Play, Loader2, CheckCircle2, ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InterviewAvatar } from '@/components/interview/InterviewAvatar';
import { NetworkStatusBadge } from '@/components/interview/NetworkStatusBadge';
import { useToast } from '@/hooks/use-toast';
import type { IntegrityLevel } from '@/hooks/useProctoringMonitor';
import type { InterviewVoiceType } from '@/types/interviewCustomization';

interface SpeakingQuestionProps {
  submissionId?: number | null;
  question: string;
  questionNumber: number;
  totalQuestions: number;
  timeRemainingSeconds?: number | null;
  avatarModelPath?: string;
  preferredVoiceType?: InterviewVoiceType;
  preferredVoiceName?: string | null;
  speechRate?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  topic?: string;
  onComplete: () => void;
  onAnswer?: (answer: string) => void;
  initialAnswer?: string;
  onAnswerDraftChange?: (answer: string) => void;
  phase: string;
  integrityLevel?: IntegrityLevel;
  tabSwitchCount?: number;
  focusLossCount?: number;
  onProctoringEvent?: (
    eventType: string,
    severity: 'low' | 'medium' | 'high',
    message: string,
    metadata?: Record<string, unknown>,
  ) => void;
}

export const SpeakingQuestion = ({
  submissionId,
  question,
  questionNumber,
  totalQuestions,
  timeRemainingSeconds = null,
  avatarModelPath = '/models/maya.glb',
  preferredVoiceType = 'female',
  preferredVoiceName = null,
  speechRate = 0.95,
  difficulty,
  topic,
  onComplete,
  onAnswer,
  initialAnswer = '',
  onAnswerDraftChange,
  phase,
  integrityLevel = 'good',
  tabSwitchCount = 0,
  focusLossCount = 0,
  onProctoringEvent,
}: SpeakingQuestionProps) => {
  const isDev = import.meta.env.DEV;
  const { toast } = useToast();
  const interviewThemeVars: CSSProperties = {
    ['--primary' as any]: '#001938',
    ['--primary-foreground' as any]: '#ffffff',
    ['--secondary' as any]: '#E9C349',
    ['--secondary-foreground' as any]: '#001938',
    ['--accent' as any]: '#7697CC',
    ['--background' as any]: '#FAFAFA',
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

  const [words, setWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [isReading, setIsReading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [userResponse, setUserResponse] = useState(initialAnswer);
  const [interimText, setInterimText] = useState('');
  const [hasFinishedReading, setHasFinishedReading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [clarificationInput, setClarificationInput] = useState('');
  const [clarificationLog, setClarificationLog] = useState<Array<{ from: 'candidate' | 'ai'; text: string }>>([]);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [microphoneReady, setMicrophoneReady] = useState(true);
  const [microphoneError, setMicrophoneError] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [headTurnWarning, setHeadTurnWarning] = useState(false);
  const [postureMetrics, setPostureMetrics] = useState({
    eyeContact: 100,
    headTurns: 0,
    lookAwayCount: 0,
  });
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPausedRef = useRef(false);
  const candidateVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const microphoneProbeStreamRef = useRef<MediaStream | null>(null);
  const readStartLockRef = useRef(false);
  const postureRef = useRef({
    eyeContact: 100,
    headTurns: 0,
    lookAwayCount: 0,
    frames: 0,
    faceFrames: 0,
  });
  const headTurnRef = useRef(false);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const proctoringCooldownRef = useRef<Record<string, number>>({});

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const setCandidateVideoElement = useCallback((node: HTMLVideoElement | null) => {
    candidateVideoRef.current = node;
    if (node && cameraStreamRef.current) {
      node.srcObject = cameraStreamRef.current;
      node.play().catch(() => undefined);
      setCameraReady(true);
    }
  }, []);

  // Reset all state when question changes
  useEffect(() => {
    // Stop any ongoing speech/listening
    window.speechSynthesis.cancel();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }

    const questionWords = question.split(/\s+/).filter(word => word.length > 0);
    setWords(questionWords);
    setCurrentWordIndex(-1);
    setHasFinishedReading(false);
    setIsReading(false);
    setIsListening(false);
    setUserResponse('');
    setInterimText('');
    setElapsedSeconds(0);
    setClarificationInput('');
    setClarificationLog([]);
    setIsPaused(false);
    setIsSubmittingAnswer(false);
    setMicrophoneReady(true);
    setMicrophoneError('');
    readStartLockRef.current = false;
  }, [question]);

  useEffect(() => {
    setUserResponse(initialAnswer);
  }, [initialAnswer, question]);

  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [question, isPaused]);

  const startCameraPreview = useCallback(async () => {
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError('Camera API is unavailable in this browser context.');
        setCameraReady(false);
        onProctoringEvent?.('camera_permission_unavailable', 'medium', 'Camera API is unavailable in this browser context.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          setCameraReady(false);
          setCameraError('Camera stream stopped. Re-enable camera to continue proctoring.');
          onProctoringEvent?.('camera_stream_ended', 'medium', 'Camera stream ended during speaking question.', {
            submission_id: submissionId ?? null,
          });
        };
      });

      cameraStreamRef.current = stream;
      if (candidateVideoRef.current) {
        candidateVideoRef.current.srcObject = stream;
        await candidateVideoRef.current.play().catch(() => undefined);
      }
      setCameraError('');
      setCameraReady(true);
    } catch (error) {
      console.error('Camera preview failed:', error);
      setCameraReady(false);
      setCameraError('Unable to access camera. Allow permission and retry.');
      onProctoringEvent?.('camera_permission_denied', 'medium', 'Unable to access camera. Allow permission and retry.', {
        submission_id: submissionId ?? null,
      });
    }
  }, [onProctoringEvent, submissionId]);

  useEffect(() => {
    startCameraPreview();

    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (microphoneProbeStreamRef.current) {
        microphoneProbeStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCameraPreview]);

  useEffect(() => {
    if (candidateVideoRef.current && cameraStreamRef.current && candidateVideoRef.current.srcObject !== cameraStreamRef.current) {
      candidateVideoRef.current.srcObject = cameraStreamRef.current;
      candidateVideoRef.current.play().catch(() => undefined);
      setCameraReady(true);
    }
  }, [cameraReady]);

  useEffect(() => {
    if (!cameraReady || !candidateVideoRef.current) {
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return;
    }

    let rafId = 0;
    let frameCounter = 0;

    const emitProctoringEventWithCooldown = (
      key: string,
      eventType: string,
      severity: 'low' | 'medium' | 'high',
      message: string,
      metadata?: Record<string, unknown>,
      cooldownMs = 30000,
    ) => {
      const now = Date.now();
      const last = proctoringCooldownRef.current[key] ?? 0;
      if (now - last < cooldownMs) return;
      proctoringCooldownRef.current[key] = now;

      const toastVariant = severity === 'high' ? 'destructive' : 'default';
      toast({
        title: severity === 'high' ? 'Proctoring alert' : 'Proctoring notice',
        description: message,
        variant: toastVariant,
      });

      onProctoringEvent?.(eventType, severity, message, metadata);
    };

    const detectPosture = () => {
      const video = candidateVideoRef.current;
      if (!video || video.readyState < 2 || isPausedRef.current) {
        rafId = requestAnimationFrame(detectPosture);
        return;
      }

      frameCounter += 1;
      if (frameCounter % 4 !== 0) {
        rafId = requestAnimationFrame(detectPosture);
        return;
      }

      const width = video.videoWidth || 320;
      const height = video.videoHeight || 240;
      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(video, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      let leftPixels = 0;
      let rightPixels = 0;
      let totalSkin = 0;
      const midX = width / 2;

      for (let i = 0; i < data.length; i += 24) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) {
          totalSkin += 1;
          const pixelIndex = Math.floor(i / 4);
          const x = pixelIndex % width;
          if (x < midX) leftPixels += 1;
          else rightPixels += 1;
        }
      }

      postureRef.current.frames += 1;
      const hasFace = totalSkin > 180;
      if (hasFace) postureRef.current.faceFrames += 1;

      const ratio = totalSkin > 40 ? leftPixels / (leftPixels + rightPixels) : 0.5;
      const turned = hasFace && (ratio < 0.28 || ratio > 0.72);

      if (turned && !headTurnRef.current) {
        headTurnRef.current = true;
        postureRef.current.headTurns += 1;
        postureRef.current.lookAwayCount += 1;
        setHeadTurnWarning(true);
        if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
        warningTimeoutRef.current = setTimeout(() => setHeadTurnWarning(false), 2600);

        emitProctoringEventWithCooldown(
          'head-turn',
          'frequent_head_turn',
          'medium',
          'Frequent head-turn or look-away behavior detected.',
          {
            submission_id: submissionId ?? null,
            head_turns: postureRef.current.headTurns,
          },
          12000,
        );
      } else if (!turned) {
        headTurnRef.current = false;
      }

      if (postureRef.current.frames % 45 === 0) {
        const eyeContact = postureRef.current.frames > 0
          ? Math.round((postureRef.current.faceFrames / postureRef.current.frames) * 100)
          : 100;

        const next = {
          eyeContact: Math.min(Math.max(eyeContact, 0), 100),
          headTurns: postureRef.current.headTurns,
          lookAwayCount: postureRef.current.lookAwayCount,
        };
        setPostureMetrics(next);

        if (next.eyeContact < 55) {
          emitProctoringEventWithCooldown(
            'low-eye-contact',
            'no_eye_contact',
            'medium',
            'Low eye-contact confidence detected during speaking response.',
            {
              submission_id: submissionId ?? null,
              eye_contact: next.eyeContact,
            },
            30000,
          );
        }
      }

      rafId = requestAnimationFrame(detectPosture);
    };

    rafId = requestAnimationFrame(detectPosture);

    return () => {
      cancelAnimationFrame(rafId);
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
        warningTimeoutRef.current = null;
      }
    };
  }, [cameraReady, onProctoringEvent, submissionId]);

  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    const handleDeviceChange = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasMic = devices.some((device) => device.kind === 'audioinput');
        const hasCam = devices.some((device) => device.kind === 'videoinput');

        if (!hasMic) {
          setMicrophoneReady(false);
          setMicrophoneError('No microphone device detected. Connect a microphone and retry.');
          onProctoringEvent?.('microphone_device_missing', 'high', 'No microphone device detected during interview.');
        }

        if (!hasCam) {
          setCameraReady(false);
          setCameraError('No camera device detected. Connect a camera and retry.');
          onProctoringEvent?.('camera_device_missing', 'high', 'No camera device detected during interview.');
        }
      } catch {
      }
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [onProctoringEvent]);

    const verifyMicrophoneAccess = useCallback(async (): Promise<boolean> => {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setMicrophoneReady(false);
        setMicrophoneError('Microphone API is unavailable in this browser.');
        onProctoringEvent?.('microphone_permission_unavailable', 'medium', 'Microphone API is unavailable in this browser.');
        return false;
      }

      try {
        if (microphoneProbeStreamRef.current) {
          microphoneProbeStreamRef.current.getTracks().forEach((track) => track.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        microphoneProbeStreamRef.current = stream;
        setMicrophoneReady(true);
        setMicrophoneError('');
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Microphone permission denied or unavailable.';
        setMicrophoneReady(false);
        setMicrophoneError(`Microphone unavailable: ${message}`);
        onProctoringEvent?.('microphone_permission_denied', 'medium', `Microphone unavailable: ${message}`);
        return false;
      }
    }, [onProctoringEvent]);

  const startListening = useCallback(() => {
    if (isPausedRef.current) return;

    const beginListening = async () => {
      const microphoneAllowed = await verifyMicrophoneAccess();
      if (!microphoneAllowed) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const windowWithSpeech = window as any;
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('Speech recognition not supported');
        setMicrophoneReady(false);
        setMicrophoneError('Speech recognition is not supported in this browser.');
        onProctoringEvent?.('microphone_unsupported', 'medium', 'Speech recognition is not supported in this browser.');
        return;
      }

      const SpeechRecognition = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      let heardSpeechThisTurn = false;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      const resetSilenceTimeout = () => {
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        silenceTimeoutRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
        }, 4000);
      };

      recognition.onstart = () => {
        setIsListening(true);
        resetSilenceTimeout();
      };

      recognition.onresult = (event: any) => {
        resetSilenceTimeout();
        let finalTranscript = '';
        let interim = '';

        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interim += transcript;
          }
        }

        if (finalTranscript.trim() || interim.trim()) {
          heardSpeechThisTurn = true;
        }

        setUserResponse(finalTranscript);
        setInterimText(interim);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }

        const criticalMicError = ['not-allowed', 'service-not-allowed', 'audio-capture'].includes(event.error);
        if (criticalMicError) {
          setMicrophoneReady(false);
          setMicrophoneError('Microphone access was lost or blocked. Retry microphone and continue.');
        }

        onProctoringEvent?.('microphone_error', 'medium', `Microphone recognition error: ${event.error || 'unknown'}`);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        if (isPausedRef.current) return;

        const activeElement = document.activeElement;
        const isTypingInAnswerField = activeElement instanceof HTMLTextAreaElement && activeElement.id === 'candidate-answer-input';

        if (!heardSpeechThisTurn || isTypingInAnswerField) {
          return;
        }

        setTimeout(() => {
          const nextBtn = document.getElementById('auto-advance-btn');
          if (nextBtn) nextBtn.click();
        }, 100);
      };

      recognitionRef.current = recognition;
      recognition.start();
    };

    void beginListening();
  }, [onProctoringEvent, verifyMicrophoneAccess]);

  const startReading = useCallback(() => {
    if (isMuted || words.length === 0 || isPausedRef.current || readStartLockRef.current) return;

    readStartLockRef.current = true;
    
    window.speechSynthesis.cancel();
    setIsReading(true);
    setCurrentWordIndex(0);

    const utterance = new SpeechSynthesisUtterance(question);
    utterance.lang = 'en-US';
    utterance.rate = speechRate;
    utterance.pitch = 1.0;
    
    // Select a natural English voice (avoid locale mismatch mispronunciations)
    const voices = window.speechSynthesis.getVoices();
    const englishVoices = voices.filter(v => v.lang.toLowerCase().startsWith('en'));

    const premiumEnglishVoice = englishVoices.find(v => 
      v.name.includes('Premium') ||
      v.name.includes('Natural') ||
      v.name.includes('Google') ||
      v.name.includes('Neural')
    );
    const maleHint = /(male|david|alex|daniel|james|mark|tom|guy|man)/i;
    const femaleHint = /(female|zira|susan|samantha|victoria|karen|hazel|aria|jenny|woman|girl)/i;
    const exactPreferredVoice = preferredVoiceName
      ? englishVoices.find((voice) => voice.name === preferredVoiceName)
      : undefined;
    const preferredVoice = preferredVoiceType === 'male'
      ? englishVoices.find((voice) => maleHint.test(voice.name))
      : preferredVoiceType === 'female'
        ? englishVoices.find((voice) => femaleHint.test(voice.name))
        : undefined;
    const usEnglishVoice = englishVoices.find(v => v.lang.toLowerCase().startsWith('en-us'));
    const gbEnglishVoice = englishVoices.find(v => v.lang.toLowerCase().startsWith('en-gb'));
    const fallbackEnglishVoice = englishVoices[0];
    
    utterance.voice = exactPreferredVoice || preferredVoice || premiumEnglishVoice || usEnglishVoice || gbEnglishVoice || fallbackEnglishVoice || null;

    // Fallback timer in case the speech synthesis engine doesn't fire `onboundary`
    let fallbackTimer: NodeJS.Timeout | null = null;
    let expectedWordIdx = 0;
    let hasBoundaryEvents = false;

    const getWordDelayMs = (rawWord: string) => {
      const word = rawWord || '';
      const cleanWord = word.replace(/^[^\w]+|[^\w]+$/g, '');
      const normalizedRate = utterance.rate > 0 ? utterance.rate : 1;

      // Base speaking pace per word
      let delay = 250 / normalizedRate;

      // Long words naturally take more time (e.g., asynchronous)
      if (cleanWord.length >= 10) {
        delay += Math.min(220, (cleanWord.length - 9) * 18);
      }

      // Abbreviation/short-form pause (HTTP, WWW, API, etc.)
      const isAbbreviation = /^[A-Z]{2,}$/.test(cleanWord) || /^(?:[A-Za-z]\.){2,}$/.test(cleanWord);
      if (isAbbreviation) {
        delay += 220;
      }

      // Punctuation pauses
      if (/[,:;]$/.test(word)) {
        delay += 170;
      }
      if (/[.!?]$/.test(word)) {
        delay += 320;
      }
      if (/\.\.\.$/.test(word)) {
        delay += 220;
      }

      return Math.max(120, Math.round(delay));
    };

    utterance.onstart = () => {
      // Start fallback only if boundary events are not available
      const advanceFallback = () => {
        if (hasBoundaryEvents) return;

        expectedWordIdx++;
        if (expectedWordIdx < words.length) {
          setCurrentWordIndex((prev) => Math.max(prev, expectedWordIdx));
          fallbackTimer = setTimeout(
            advanceFallback,
            getWordDelayMs(words[expectedWordIdx] || '')
          );
        }
      };

      fallbackTimer = setTimeout(() => {
        if (!hasBoundaryEvents) {
          fallbackTimer = setTimeout(advanceFallback, getWordDelayMs(words[0] || ''));
        }
      }, 700);
    };

    utterance.onboundary = (event) => {
      // Some browsers emit reliable word boundaries; others emit sparse/ambiguous boundaries.
      // Only switch off fallback timing after we confirm boundary progression.
      const textToCurrentPos = question.substring(0, Math.max(0, event.charIndex));
      const wordCount = textToCurrentPos.trim() ? textToCurrentPos.trim().split(/\s+/).length : 0;
      const nextWordIndex = Math.min(words.length - 1, Math.max(0, wordCount));
      const boundaryProgressed = nextWordIndex > expectedWordIdx;
      const explicitWordBoundary = event.name === 'word';

      if (explicitWordBoundary || boundaryProgressed) {
        hasBoundaryEvents = true;
        if (fallbackTimer) {
          clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }

        setCurrentWordIndex(nextWordIndex);
        expectedWordIdx = nextWordIndex;
      }
    };

    utterance.onend = () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      readStartLockRef.current = false;
      setIsReading(false);
      setCurrentWordIndex(words.length);
      setHasFinishedReading(true);
      if (isPausedRef.current) return;
      // Auto-start listening after reading
      setTimeout(() => {
        startListening();
      }, 500);
    };

    utterance.onerror = () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      readStartLockRef.current = false;
      setIsReading(false);
      setHasFinishedReading(true);
    };

    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [question, words, isMuted, startListening, preferredVoiceType, preferredVoiceName, speechRate]);

  // Start reading when words are ready
  useEffect(() => {
    if (words.length === 0 || isMuted || isPaused || isReading || hasFinishedReading) return;

    let cancelled = false;
    let retries = 0;
    const maxRetries = 12;
    let retryTimer: NodeJS.Timeout | null = null;

    const tryStartReading = () => {
      if (cancelled) return;

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0 || retries >= maxRetries) {
        startReading();
        return;
      }

      retries += 1;
      retryTimer = setTimeout(tryStartReading, 150);
    };

    const handleVoicesChanged = () => {
      tryStartReading();
    };

    retryTimer = setTimeout(tryStartReading, 100);
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);

    return () => {
      cancelled = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
    };
  }, [words, isMuted, isPaused, isReading, hasFinishedReading, startReading]);



  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimText('');
    }
  }, []);

  const toggleMute = () => {
    if (!isMuted) {
      window.speechSynthesis.cancel();
      readStartLockRef.current = false;
      setIsReading(false);
    }
    setIsMuted(!isMuted);
  };

  const handleNext = useCallback(() => {
    if (isPaused || isSubmittingAnswer) return;

    setIsSubmittingAnswer(true);

    window.speechSynthesis.cancel();
    stopListening();
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    
    const finalAnswer = userResponse.trim() ? userResponse : "No response provided.";
    if (onAnswer) {
      onAnswer(finalAnswer);
    }
    onComplete();
  }, [isPaused, isSubmittingAnswer, userResponse, onAnswer, onComplete, stopListening]);

  const togglePauseInterview = useCallback(() => {
    setIsPaused((prev) => {
      const nextPaused = !prev;

      if (nextPaused) {
        window.speechSynthesis.cancel();
        readStartLockRef.current = false;
        setIsReading(false);
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {
          }
        }
        setIsListening(false);
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
      }

      return nextPaused;
    });
  }, []);

  const handleClarificationSend = useCallback(() => {
    const text = clarificationInput.trim();
    if (!text) return;

    const aiReply = `Clarification: focus on a short STAR structure (Situation, Task, Action, Result), and answer this question with one specific real example.`;
    setClarificationLog((prev) => [...prev, { from: 'candidate', text }, { from: 'ai', text: aiReply }]);
    setClarificationInput('');
  }, [clarificationInput]);

  const formatTimer = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }, []);

  const isTimeCritical = timeRemainingSeconds != null && timeRemainingSeconds <= 60;
  const isTimeWarning = timeRemainingSeconds != null && timeRemainingSeconds <= 180;

  const getPhaseLabel = () => {
    switch (phase) {
      case 'intro': return 'Self Introduction';
      case 'technical': return 'Technical Question';
      case 'complexity': return 'Complexity Analysis';
      default: return 'Question';
    }
  };

  return (
    <div className="new-frontend-theme h-screen overflow-hidden bg-gradient-to-br from-background via-background to-muted/30 flex flex-col" style={interviewThemeVars}>
      {/* Top Title Bar */}
      <div className="border-b border-[rgba(0,25,56,0.08)] bg-[rgba(255,255,255,0.92)] px-4 py-3 backdrop-blur-sm md:px-6">
        <div className="mx-auto w-full max-w-[1480px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-0 bg-[rgba(233,195,73,0.2)] text-[var(--primary)]">Question {questionNumber}/{totalQuestions}</Badge>
              {difficulty && <Badge className={cn('border-0', difficulty === 'easy' && 'bg-emerald-700/20 text-emerald-900', difficulty === 'medium' && 'bg-amber-700/20 text-amber-900', difficulty === 'hard' && 'bg-rose-700/20 text-rose-900')}>{difficulty}</Badge>}
              {topic && <Badge className="border-0 bg-[rgba(118,151,204,0.22)] text-[var(--primary)]">{topic}</Badge>}
              <span className="text-sm text-muted-foreground">{getPhaseLabel()} · {formatTimer(elapsedSeconds)} elapsed</span>
            </div>

            <div className="flex items-center gap-2">
              <Badge className="border-0 bg-[rgba(34,197,94,0.2)] text-emerald-900">Voice {isMuted ? 'Off' : 'On'}</Badge>
              <Badge className="border-0 bg-[rgba(59,130,246,0.2)] text-blue-900">Timer {formatTimer(elapsedSeconds)}</Badge>
              <Badge className={cn('border-0', postureMetrics.eyeContact >= 70 ? 'bg-emerald-500/20 text-emerald-900' : 'bg-amber-500/20 text-amber-900')}>
                Eye Contact {cameraReady ? `${postureMetrics.eyeContact}%` : 'N/A'}
              </Badge>
              <Badge className={cn('border-0', postureMetrics.headTurns <= 2 ? 'bg-emerald-500/20 text-emerald-900' : 'bg-rose-500/20 text-rose-900')}>
                Head Turns {cameraReady ? postureMetrics.headTurns : 'N/A'}
              </Badge>
              {timeRemainingSeconds != null && (
                <div
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold',
                    isTimeCritical && 'bg-rose-500/20 text-rose-900 animate-pulse',
                    !isTimeCritical && isTimeWarning && 'bg-amber-500/20 text-amber-900',
                    !isTimeCritical && !isTimeWarning && 'bg-emerald-500/20 text-emerald-900',
                  )}
                >
                  <AlertTriangle className="h-4 w-4" />
                  Time Left {formatTimer(timeRemainingSeconds)}
                </div>
              )}
              <Badge
                className={cn(
                  'border-0',
                  integrityLevel === 'good' && 'bg-emerald-500/20 text-emerald-900',
                  integrityLevel === 'warning' && 'bg-amber-500/20 text-amber-900',
                  integrityLevel === 'critical' && 'bg-rose-500/20 text-rose-900',
                )}
              >
                {integrityLevel === 'good' ? <ShieldCheck className="mr-1 h-3.5 w-3.5" /> : <ShieldAlert className="mr-1 h-3.5 w-3.5" />}
                Integrity {integrityLevel.toUpperCase()}
              </Badge>
              <Badge className="border-0 bg-[rgba(148,163,184,0.2)] text-slate-800">
                Focus {focusLossCount} • Tabs {tabSwitchCount}
              </Badge>
              <NetworkStatusBadge />
              {isDev && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={togglePauseInterview}
                  className="h-8 border-[rgba(0,25,56,0.2)] bg-white/80 text-[var(--primary)] hover:bg-white"
                >
                  {isPaused ? <Play className="mr-1.5 h-4 w-4" /> : <Pause className="mr-1.5 h-4 w-4" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={toggleMute} className="shrink-0">
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[rgba(0,25,56,0.12)]">
            <motion.div className="h-full gradient-primary" initial={{ width: 0 }} animate={{ width: `${(questionNumber / totalQuestions) * 100}%` }} transition={{ duration: 0.5 }} />
          </div>
        </div>
      </div>

      {/* Main Content - Strict 30/70 Layout */}
      <main className="flex-1 min-h-0 overflow-hidden px-4 py-4 md:px-6 md:py-4">
          {timeRemainingSeconds != null && (isTimeWarning || isTimeCritical) && (
            <div
              className={cn(
                'mx-auto mb-3 w-full max-w-[1480px] rounded-xl border px-3 py-2 text-sm',
                isTimeCritical
                  ? 'border-rose-400/50 bg-rose-500/20 text-rose-100'
                  : 'border-amber-400/50 bg-amber-500/15 text-amber-100',
              )}
            >
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4" />
                {isTimeCritical
                  ? `Critical time left: ${formatTimer(timeRemainingSeconds)}. Please finish your answer.`
                  : `Low time remaining: ${formatTimer(timeRemainingSeconds)}. Keep your response concise.`}
              </div>
            </div>
          )}

          <div
            className="mx-auto grid h-full w-full max-w-[1480px] gap-4 lg:grid-cols-[30%_70%]"
          >
            <aside className="grid min-h-0 grid-rows-2 gap-4">
              <div className="rounded-[24px] border border-[rgba(255,255,255,0.12)] bg-[rgba(0,25,56,0.66)] p-3 shadow-[0_20px_40px_rgba(0,25,56,0.35)] backdrop-blur-sm">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.78)]">AI Interviewer</p>
                  <Badge className="bg-[rgba(233,195,73,0.2)] text-[var(--secondary)] border-0">{isReading ? 'Speaking' : 'Ready'}</Badge>
                </div>
                <InterviewAvatar
                  currentWord={words[currentWordIndex] || ''}
                  isSpeaking={isReading}
                  modelPath={avatarModelPath}
                  className="h-[calc(100%-2.2rem)] min-h-[260px] w-full overflow-hidden rounded-[18px] border border-[rgba(255,255,255,0.14)] bg-[linear-gradient(180deg,#fff_0%,#edf2f9_100%)]"
                />
              </div>

              <div className="rounded-[24px] border border-[rgba(255,255,255,0.12)] bg-[rgba(0,25,56,0.66)] p-3 shadow-[0_20px_40px_rgba(0,25,56,0.35)] backdrop-blur-sm">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.78)]">Candidate Camera</p>
                  <Badge className={cn('border-0', cameraReady ? 'bg-[rgba(34,197,94,0.18)] text-emerald-200' : 'bg-[rgba(239,68,68,0.2)] text-rose-200')}>
                    {cameraReady ? 'Cam OK' : 'Cam Off'}
                  </Badge>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.05)] px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(255,255,255,0.6)]">Eye Contact</p>
                    <div className="mt-1 flex items-center justify-between text-xs text-white">
                      <span>{cameraReady ? `${postureMetrics.eyeContact}%` : 'N/A'}</span>
                      <span className={cn(postureMetrics.eyeContact >= 70 ? 'text-emerald-300' : 'text-amber-300')}>
                        {postureMetrics.eyeContact >= 70 ? 'Good' : 'Low'}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.05)] px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(255,255,255,0.6)]">Head Turns</p>
                    <div className="mt-1 flex items-center justify-between text-xs text-white">
                      <span>{cameraReady ? postureMetrics.headTurns : 'N/A'}</span>
                      <span className={cn(postureMetrics.headTurns <= 2 ? 'text-emerald-300' : 'text-rose-300')}>
                        {postureMetrics.headTurns <= 2 ? 'Stable' : 'Distracted'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="relative h-[calc(100%-2.2rem)] min-h-[260px] overflow-hidden rounded-[18px] border border-[rgba(255,255,255,0.14)] bg-[rgba(2,12,28,0.72)]">
                  {cameraReady ? (
                    <video ref={setCandidateVideoElement} autoPlay muted playsInline className="h-full w-full object-cover scale-x-[-1]" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-sm text-[rgba(255,255,255,0.68)]">
                      <p>{cameraError || 'Camera preview unavailable.'}</p>
                      <Button variant="outline" onClick={startCameraPreview} className="border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.14)]">
                        Start Camera Preview
                      </Button>
                    </div>
                  )}

                  {cameraReady && (
                    <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1 text-[11px] text-white">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                      Live Proctoring
                    </div>
                  )}

                  {headTurnWarning && (
                    <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-rose-300/30 bg-rose-500/85 px-3 py-1 text-[11px] font-semibold text-white shadow-lg">
                      Keep your eyes on the camera
                    </div>
                  )}
                </div>
              </div>
            </aside>

            <section className="min-h-0 rounded-[24px] border border-[rgba(255,255,255,0.12)] bg-[rgba(0,25,56,0.72)] p-4 shadow-[0_20px_40px_rgba(0,25,56,0.4)] backdrop-blur-sm">
              <div className="flex h-full min-h-0 flex-col gap-3">
                <div className="flex-1 overflow-y-auto rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(2,12,28,0.72)] p-4">
                  {isPaused && (
                    <div className="mb-3 inline-flex items-center rounded-full border border-[rgba(255,255,255,0.2)] bg-[rgba(245,158,11,0.2)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-100">
                      Interview paused (dev)
                    </div>
                  )}
                  <div className="mb-3 max-w-[88%] rounded-2xl rounded-bl-sm border border-[rgba(118,151,204,0.48)] bg-[rgba(118,151,204,0.14)] p-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-100">AI Question</p>
                    <p className="text-[1rem] leading-8 text-white">
                      {words.map((word, index) => (
                        <motion.span
                          key={`${word}-${index}`}
                          className={cn('mx-[3px] inline-block rounded-md px-1 py-0.5 transition-all', index === currentWordIndex && isReading ? 'bg-[rgba(233,195,73,0.26)] text-[var(--secondary)] font-semibold scale-105' : index < currentWordIndex ? 'text-white' : 'text-white/75')}
                          initial={{ opacity: 0.5 }}
                          animate={{ opacity: index <= currentWordIndex || hasFinishedReading ? 1 : 0.5 }}
                          transition={{ duration: 0.15 }}
                        >
                          {word}
                        </motion.span>
                      ))}
                    </p>
                  </div>

                  {clarificationLog.map((entry, index) => (
                    <div key={`${entry.from}-${index}`} className={cn('mb-3 flex', entry.from === 'candidate' ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[86%] rounded-2xl p-3', entry.from === 'candidate' ? 'rounded-br-sm border border-[rgba(233,195,73,0.5)] bg-[rgba(233,195,73,0.2)] text-[var(--secondary-foreground)]' : 'rounded-bl-sm border border-[rgba(118,151,204,0.48)] bg-[rgba(118,151,204,0.14)] text-white')}>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em]">{entry.from === 'candidate' ? 'Candidate Clarification' : 'AI Clarification'}</p>
                        <p className="leading-7">{entry.text}</p>
                      </div>
                    </div>
                  ))}

                  {(userResponse || interimText || isListening) && (
                    <div className="mt-2 flex justify-end">
                      <div className="max-w-[86%] rounded-2xl rounded-br-sm border border-[rgba(233,195,73,0.5)] bg-[rgba(233,195,73,0.2)] p-3 text-[var(--secondary-foreground)]">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em]">Candidate Answer</p>
                        <p className="leading-7">
                          {userResponse || ''}
                          {interimText && <span className="italic text-[var(--secondary-foreground)]/80"> {interimText}</span>}
                          {!userResponse && !interimText && isListening && 'Listening...'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(2,12,28,0.72)] p-3">
                  {(cameraError || microphoneError) && (
                    <div className="mb-3 rounded-xl border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="flex-1 space-y-2">
                          {cameraError && <p>{cameraError}</p>}
                          {microphoneError && <p>{microphoneError}</p>}
                          <div className="flex flex-wrap gap-2">
                            {cameraError && (
                              <Button variant="outline" size="sm" onClick={startCameraPreview} className="border-amber-300/40 bg-transparent text-amber-100 hover:bg-amber-500/20">
                                Retry Camera
                              </Button>
                            )}
                            {microphoneError && (
                              <Button variant="outline" size="sm" onClick={() => { void verifyMicrophoneAccess(); }} className="border-amber-300/40 bg-transparent text-amber-100 hover:bg-amber-500/20">
                                Retry Microphone
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mb-2 flex gap-2">
                    <input
                      value={clarificationInput}
                      onChange={(e) => setClarificationInput(e.target.value)}
                      placeholder="Ask clarification for this same question..."
                      disabled={isSubmittingAnswer}
                      className="h-10 flex-1 rounded-xl border border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.06)] px-3 text-sm text-white placeholder:text-white/50 outline-none"
                    />
                    <Button onClick={handleClarificationSend} disabled={!clarificationInput.trim() || isSubmittingAnswer} className="h-10 bg-[rgba(118,151,204,0.9)] text-white hover:bg-[rgba(118,151,204,1)]">
                      Send
                    </Button>
                  </div>

                  <textarea
                    id="candidate-answer-input"
                    value={userResponse}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setUserResponse(nextValue);
                      onAnswerDraftChange?.(nextValue);
                    }}
                    placeholder="Speak or type your answer here..."
                    disabled={isSubmittingAnswer}
                    className="min-h-[98px] w-full rounded-xl border border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.06)] p-3 text-sm leading-7 text-white placeholder:text-white/50 outline-none"
                  />

                  {isSubmittingAnswer && (
                    <div className="mt-3 rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Answer submitted. Loading next question...</span>
                        <Loader2 className="ml-auto h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      variant={isListening ? 'destructive' : 'default'}
                      size="lg"
                      onClick={isListening ? stopListening : startListening}
                      disabled={isPaused || isSubmittingAnswer || (!microphoneReady && !isListening)}
                      className="gap-2"
                    >
                      {isListening ? (
                        <>
                          <MicOff className="h-5 w-5" />
                          Stop Speaking
                        </>
                      ) : (
                        <>
                          <Mic className="h-5 w-5" />
                          Start Speaking
                        </>
                      )}
                    </Button>

                    <Button id="auto-advance-btn" size="lg" onClick={handleNext} disabled={isPaused || isSubmittingAnswer} className="gap-2 gradient-primary text-primary-foreground shadow-glow">
                      <SkipForward className="h-5 w-5" />
                      {isSubmittingAnswer
                        ? 'Submitting...'
                        : phase === 'complexity'
                          ? 'Finish Interview'
                          : 'Next Question'}
                    </Button>

                    {isReading && (
                      <div className="ml-auto flex items-center gap-2 text-xs text-blue-100">
                        <span className="h-2 w-2 rounded-full bg-[var(--secondary)]" />
                        AI reading in progress
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
      </main>
    </div>
  );
};
