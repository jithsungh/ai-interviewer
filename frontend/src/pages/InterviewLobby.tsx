import { useState, useEffect, type ChangeEvent } from 'react';
import { CandidateHeader } from '@/components/layout/CandidateHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, AlertTriangle, Upload, FileText } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getCandidateResumes,
  getCandidateSettings,
  getCurrentUser,
  getPracticeTemplates,
  startPracticeSession,
  updateCandidateSettings,
  uploadCandidateResume,
  type APIPracticeTemplateDTO,
} from '@/services/candidateService';
import type { APIResumeDTO } from '@/types/api';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, Clock, CheckCircle2, Mic, Video, Shield, Sparkles } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  DEFAULT_INTERVIEW_CUSTOMIZATION,
  INTERVIEW_AVATAR_CATALOG,
  draftInterviewCustomizationStorageKey,
  interviewCustomizationStorageKey,
  type InterviewCustomization,
  type InterviewVoiceType,
} from '@/types/interviewCustomization';

type CategoryTheme = {
  card: string;
  pill: string;
  selected: string;
};

const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  dsa: {
    card: 'border-blue-400 bg-blue-50/60',
    pill: 'bg-blue-100 text-blue-900',
    selected: 'ring-blue-500',
  },
  coding: {
    card: 'border-teal-400 bg-teal-50/60',
    pill: 'bg-teal-100 text-teal-900',
    selected: 'ring-teal-500',
  },
  'system-design': {
    card: 'border-violet-400 bg-violet-50/60',
    pill: 'bg-violet-100 text-violet-900',
    selected: 'ring-violet-500',
  },
  system_design: {
    card: 'border-violet-400 bg-violet-50/60',
    pill: 'bg-violet-100 text-violet-900',
    selected: 'ring-violet-500',
  },
  backend: {
    card: 'border-emerald-400 bg-emerald-50/60',
    pill: 'bg-emerald-100 text-emerald-900',
    selected: 'ring-emerald-500',
  },
  frontend: {
    card: 'border-orange-400 bg-orange-50/70',
    pill: 'bg-orange-100 text-orange-900',
    selected: 'ring-orange-500',
  },
  behavioral: {
    card: 'border-pink-400 bg-pink-50/70',
    pill: 'bg-pink-100 text-pink-900',
    selected: 'ring-pink-500',
  },
  devops: {
    card: 'border-sky-400 bg-sky-50/60',
    pill: 'bg-sky-100 text-sky-900',
    selected: 'ring-sky-500',
  },
  technical: {
    card: 'border-cyan-400 bg-cyan-50/60',
    pill: 'bg-cyan-100 text-cyan-900',
    selected: 'ring-cyan-500',
  },
  fullstack: {
    card: 'border-amber-400 bg-amber-50/70',
    pill: 'bg-amber-100 text-amber-900',
    selected: 'ring-amber-500',
  },
  ml: {
    card: 'border-fuchsia-400 bg-fuchsia-50/60',
    pill: 'bg-fuchsia-100 text-fuchsia-900',
    selected: 'ring-fuchsia-500',
  },
};

const DEFAULT_THEME: CategoryTheme = {
  card: 'border-slate-300 bg-slate-50/70',
  pill: 'bg-slate-100 text-slate-900',
  selected: 'ring-slate-500',
};

const EXPERIENCE_LEVEL_OPTIONS = [
  { value: 'junior', label: 'Junior (0-2 years)' },
  { value: 'mid_level', label: 'Mid-Level (3-5 years)' },
  { value: 'senior', label: 'Senior (6+ years)' },
] as const;

const COMPANY_PATTERNS = [
  'FAANG Style',
  'Product Company',
  'Startup',
  'Enterprise',
  'Service Company',
] as const;

const CATEGORY_ALIASES: Record<string, string> = {
  'data-structures-and-algorithms': 'dsa',
  datastructuresandalgorithms: 'dsa',
  'system-design': 'system-design',
  systemdesign: 'system-design',
  'system-design-interview': 'system-design',
  'software-engineering': 'coding',
  'behavioral-interview': 'behavioral',
  'devops-cloud': 'devops',
  devopsandcloud: 'devops',
};

const resolveCategoryTheme = (category: string): CategoryTheme => {
  const normalized = category
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const compact = normalized.replace(/-/g, '');
  const mapped = CATEGORY_ALIASES[normalized] ?? CATEGORY_ALIASES[compact] ?? normalized;

  return CATEGORY_THEMES[mapped] ?? CATEGORY_THEMES[compact] ?? DEFAULT_THEME;
};

const formatExperienceLabel = (value: string): string => {
  const option = EXPERIENCE_LEVEL_OPTIONS.find((item) => item.value === value);
  if (option) {
    return option.label.split(' (')[0];
  }

  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const InterviewLobby = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');

  const [templates, setTemplates] = useState<APIPracticeTemplateDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<APIPracticeTemplateDTO | null>(null);
  const [experienceLevel, setExperienceLevel] = useState('mid_level');
  const [targetCompany, setTargetCompany] = useState('');
  const [enableVoice, setEnableVoice] = useState(true);
  const [enableVideo, setEnableVideo] = useState(false);
  const [enableProctoring, setEnableProctoring] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isCheckingReadiness, setIsCheckingReadiness] = useState(false);
  const [readinessError, setReadinessError] = useState<string | null>(null);
  const [readinessChecklist, setReadinessChecklist] = useState<Array<{ label: string; ok: boolean }>>([]);
  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);
  const [customization, setCustomization] = useState<InterviewCustomization>(DEFAULT_INTERVIEW_CUSTOMIZATION);
  const [customizationStep, setCustomizationStep] = useState<'interviewer' | 'voices' | 'speed'>('interviewer');
  const [candidateName, setCandidateName] = useState('Candidate');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [resumes, setResumes] = useState<APIResumeDTO[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  useEffect(() => {
    getPracticeTemplates()
      .then((data) => {
        setTemplates(data);
        // Pre-select template matching category param if provided
        if (categoryParam && data.length > 0) {
          const matchingTemplate = data.find((t) => 
            t.category.toLowerCase() === categoryParam.toLowerCase()
          );
          setSelectedTemplate(matchingTemplate || data[0]);
        } else if (data.length > 0) {
          setSelectedTemplate(data[0]);
        }
      })
      .catch(() => {
        toast({ title: 'Failed to load interview types', variant: 'destructive' });
      })
      .finally(() => setIsLoading(false));
  }, [categoryParam]);

  useEffect(() => {
    const hydrateVoices = () => {
      const voices = window.speechSynthesis?.getVoices?.() ?? [];
      setAvailableVoices(voices);
    };

    hydrateVoices();
    window.speechSynthesis?.addEventListener?.('voiceschanged', hydrateVoices);
    return () => {
      window.speechSynthesis?.removeEventListener?.('voiceschanged', hydrateVoices);
    };
  }, []);

  const loadResumes = async () => {
    setLoadingResumes(true);
    try {
      const rows = await getCandidateResumes();
      setResumes(rows);
      setResumeError(null);
    } catch {
      setResumeError('Could not load resume analysis right now.');
    } finally {
      setLoadingResumes(false);
    }
  };

  useEffect(() => {
    void loadResumes();
  }, []);

  const handleResumeUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const maxSizeMb = 10;
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const lowerName = file.name.toLowerCase();
    const isAllowedExt = lowerName.endsWith('.pdf') || lowerName.endsWith('.docx');

    if (!allowedTypes.includes(file.type) || !isAllowedExt) {
      setResumeError('Only PDF and DOCX files are allowed.');
      event.target.value = '';
      return;
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
      setResumeError(`File size must be ${maxSizeMb}MB or less.`);
      event.target.value = '';
      return;
    }

    setUploadingResume(true);
    setResumeError(null);
    try {
      await uploadCandidateResume(file);
      await loadResumes();
      toast({ title: 'Resume uploaded and analyzed successfully' });
    } catch {
      setResumeError('Resume upload failed. Please try again.');
      toast({ title: 'Resume upload failed', variant: 'destructive' });
    } finally {
      setUploadingResume(false);
      event.target.value = '';
    }
  };

  useEffect(() => {
    const applyCustomization = (rawValue: unknown) => {
      if (!rawValue || typeof rawValue !== 'object') return;
      const parsed = rawValue as Partial<InterviewCustomization>;
      const avatarId = parsed.avatarId ?? DEFAULT_INTERVIEW_CUSTOMIZATION.avatarId;
      const avatar = INTERVIEW_AVATAR_CATALOG.find((item) => item.id === avatarId) ?? INTERVIEW_AVATAR_CATALOG[0];
      setCustomization({
        avatarId: avatar.id,
        avatarGender: avatar.gender,
        avatarName: avatar.name,
        avatarModelPath: avatar.modelPath,
        avatarImagePath: avatar.imagePath,
        voiceType: parsed.voiceType ?? avatar.gender,
        voiceName: parsed.voiceName ?? null,
        wordsPerMinute: parsed.wordsPerMinute ?? DEFAULT_INTERVIEW_CUSTOMIZATION.wordsPerMinute,
      });
    };

    try {
      const raw = localStorage.getItem(draftInterviewCustomizationStorageKey);
      if (raw) {
        applyCustomization(JSON.parse(raw));
        return;
      }
    } catch {
    }

    getCandidateSettings()
      .then((settings) => {
        applyCustomization(settings.ui_preferences?.interview_customization ?? settings.ui_preferences?.interview_avatar);
      })
      .catch(() => {
      });
  }, []);

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        setCandidateName(user.name?.trim() || 'Candidate');
      })
      .catch(() => {
        setCandidateName('Candidate');
      });
  }, []);

  const persistDraftCustomization = (next: InterviewCustomization) => {
    setCustomization(next);
    try {
      localStorage.setItem(draftInterviewCustomizationStorageKey, JSON.stringify(next));
    } catch {
    }
  };

  const persistCustomizationToDb = async (next: InterviewCustomization) => {
    persistDraftCustomization(next);
    try {
      await updateCandidateSettings({
        ui_preferences: {
          theme: 'system',
          interview_customization: next as unknown as Record<string, unknown>,
        },
      });
    } catch {
      // Best-effort: local draft still preserves preferences if backend is unavailable.
    }
  };

  const previewLine = `Hello ${candidateName}, this is your interview voice preview.`;
  const selectedAvatar = INTERVIEW_AVATAR_CATALOG.find((item) => item.id === customization.avatarId) ?? INTERVIEW_AVATAR_CATALOG[0];
  const latestResume = resumes[0] ?? null;

  useEffect(() => {
    if (isCustomizationOpen) {
      setCustomizationStep('interviewer');
    }
  }, [isCustomizationOpen]);

  const maleVoiceHint = /(male|david|alex|daniel|james|mark|tom|guy|man)/i;
  const femaleVoiceHint = /(female|zira|susan|samantha|victoria|karen|hazel|aria|jenny|woman|girl)/i;
  const maleHint = maleVoiceHint;
  const femaleHint = femaleVoiceHint;

  const classifyVoice = (voice: SpeechSynthesisVoice) => {
    if (femaleVoiceHint.test(voice.name)) return 'female';
    if (maleVoiceHint.test(voice.name)) return 'male';
    return 'neutral';
  };

  const filteredVoices = availableVoices
    .filter((voice) => voice.lang.toLowerCase().startsWith('en'))
    .filter((voice) => classifyVoice(voice) === customization.avatarGender);

  const selectVoice = (voiceGender: InterviewVoiceType | 'male' | 'female', voiceName?: string | null) => {
    const voices = availableVoices;
    if (voices.length === 0) {
      return null;
    }

    const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'));
    const source = englishVoices.length > 0 ? englishVoices : voices;

    if (voiceName) {
      const exact = source.find((voice) => voice.name === voiceName);
      if (exact) return exact;
    }

    if (voiceGender === 'male') {
      return source.find((voice) => maleVoiceHint.test(voice.name)) ?? source[0];
    }
    if (voiceGender === 'female') {
      return source.find((voice) => femaleVoiceHint.test(voice.name)) ?? source[0];
    }

    return source[0];
  };

  const previewVoice = () => {
    if (!('speechSynthesis' in window)) {
      toast({ title: 'Voice preview unavailable', description: 'Speech synthesis is not supported in this browser.', variant: 'destructive' });
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(previewLine);
    utterance.lang = 'en-US';
    utterance.rate = Math.max(0.75, Math.min(1.35, customization.wordsPerMinute / 160));
    const selectedVoice = selectVoice(customization.avatarGender, customization.voiceName);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    window.speechSynthesis.speak(utterance);
  };

  const openInterviewers = () => setCustomizationStep('interviewer');
  const openVoices = () => setCustomizationStep('voices');
  const openSpeed = () => setCustomizationStep('speed');

  const startInterview = async () => {
    if (!selectedTemplate) return;
    setIsCheckingReadiness(true);
    setReadinessError(null);

    const needsMic = enableVoice || enableProctoring;
    const needsCam = enableVideo || enableProctoring;

    try {
      if (needsMic || needsCam) {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('This browser does not support camera or microphone access.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: needsMic,
          video: needsCam,
        });
        stream.getTracks().forEach((track) => track.stop());
      }

      setReadinessChecklist([
        { label: 'Interview type selected', ok: true },
        { label: needsMic ? 'Microphone permission ready' : 'Microphone not required', ok: true },
        { label: needsCam ? 'Camera permission ready' : 'Camera not required', ok: true },
        { label: 'Stable connection check', ok: true },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to verify camera/microphone permissions.';
      setReadinessError(message);
      setReadinessChecklist([
        { label: 'Interview type selected', ok: true },
        { label: needsMic ? 'Microphone permission ready' : 'Microphone not required', ok: !needsMic },
        { label: needsCam ? 'Camera permission ready' : 'Camera not required', ok: !needsCam },
        { label: 'Stable connection check', ok: false },
      ]);
      toast({ title: 'Readiness check failed', description: message, variant: 'destructive' });
      setIsCheckingReadiness(false);
      return;
    }

    setIsStarting(true);
    try {
      const response = await startPracticeSession({
        template_id: selectedTemplate.id,
        experience_level: experienceLevel,
        target_company: targetCompany || undefined,
        voice_interview: enableVoice,
        video_recording: enableVideo,
        ai_proctoring: enableProctoring,
        consent_accepted: true,
      });

      const effectiveCustomization: InterviewCustomization = {
        ...customization,
        avatarId: selectedAvatar.id,
        avatarGender: selectedAvatar.gender,
        avatarName: selectedAvatar.name,
        avatarModelPath: selectedAvatar.modelPath,
        avatarImagePath: selectedAvatar.imagePath,
        voiceType: selectedAvatar.gender,
      };

      try {
        localStorage.setItem(
          interviewCustomizationStorageKey(response.submission_id),
          JSON.stringify(effectiveCustomization),
        );
        localStorage.setItem(draftInterviewCustomizationStorageKey, JSON.stringify(effectiveCustomization));
        await updateCandidateSettings({
          ui_preferences: {
            theme: 'system',
            interview_customization: effectiveCustomization as unknown as Record<string, unknown>,
          },
        });
      } catch {
      }

      navigate(`/interview/session?submission_id=${response.submission_id}`);
    } catch (err) {
      console.error('Failed to start interview', err);
      toast({ title: 'Failed to start interview', variant: 'destructive' });
    } finally {
      setIsStarting(false);
      setIsCheckingReadiness(false);
    }
  };

  const diffDist = selectedTemplate?.difficulty_distribution;

  return (
    <div className="new-frontend-theme" style={{ minHeight: '100vh', background: '#FAFAFA' }}>
      {!isCustomizationOpen && <CandidateHeader />}
      
      {/* Hero Header Section */}
      <div style={{ background: '#0A1629', padding: '80px 0 120px', position: 'relative' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px' }}>
          <div style={{ color: '#C9A84C', fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 16 }}>Simulation Lab</div>
          <h1 style={{ color: '#fff', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, marginBottom: 16, lineHeight: 1.2 }}>Master Interview<br/>Fundamentals</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', lineHeight: 1.6, maxWidth: 600 }}>Configure your practice session to match your target role. Our AI adapts difficulty and question types in real-time.</p>
        </div>
      </div>
      
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 32px' }}>

        {/* Interview Type Selection */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#09111F', marginBottom: 6 }}>Select Interview Type</h2>
            <p style={{ fontSize: '0.9rem', color: '#64748B' }}>Choose the category that matches your target role and study goals</p>
          </div>
            {isLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-36 rounded-xl" />
                ))}
              </div>
            ) : templates.length === 0 ? (
              <p style={{ color: '#94A3B8' }}>No interview types available.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {templates.map((tpl) => {
                  const isSelected = selectedTemplate?.id === tpl.id;

                  return (
                    <button
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl)}
                      style={{
                        padding: 24,
                        borderRadius: 16,
                        border: isSelected ? '2px solid #C9A84C' : '1px solid #E5E7EB',
                        background: isSelected ? 'rgba(201,168,76,0.08)' : '#fff',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 12px 32px rgba(201,168,76,0.15)' : '0 4px 12px rgba(0,0,0,0.04)'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)';
                          e.currentTarget.style.borderColor = '#D1D5DB';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.02)';
                          e.currentTarget.style.borderColor = '#E5E7EB';
                        }
                      }}
                    >
                      <Badge style={{ 
                        marginBottom: 12, 
                        borderRadius: 100,
                        padding: '6px 12px',
                        fontSize: '0.6rem',
                        fontWeight: 900,
                        color: isSelected ? '#8a6a17' : '#64748B',
                        background: isSelected ? 'rgba(201,168,76,0.2)' : '#F3F4F6',
                        border: 'none'
                      }}>
                        {tpl.category.replace(/[-_]/g, ' ').toUpperCase()}
                      </Badge>
                      <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8, color: '#09111F' }}>{tpl.name}</h3>
                      {tpl.description && (
                        <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: 16, lineHeight: 1.5 }}>{tpl.description}</p>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>
                        {tpl.total_estimated_time_minutes != null && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Clock className="w-3 h-3" />
                            <span>{tpl.total_estimated_time_minutes}m</span>
                          </div>
                        )}
                        {tpl.total_questions != null && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{tpl.total_questions} Questions</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        {/* Configuration Section */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#09111F', marginBottom: 28 }}>Configure Your Session</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            {/* Left: Settings */}
            <div style={{ padding: 32, borderRadius: 20, background: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 24, color: '#09111F' }}>Your Preferences</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <Label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, display: 'block' }}>Experience Level</Label>
                  <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                    <SelectTrigger style={{ marginTop: 8, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', fontSize: '0.9rem', fontWeight: 600, color: '#09111F' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPERIENCE_LEVEL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, display: 'block' }}>Target Company Pattern</Label>
                  <Select value={targetCompany} onValueChange={setTargetCompany}>
                    <SelectTrigger style={{ marginTop: 8, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', fontSize: '0.9rem', fontWeight: 600, color: '#09111F' }}>
                      <SelectValue placeholder="Select company pattern" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_PATTERNS.map((company) => (
                        <SelectItem key={company} value={company}>
                          {company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div style={{ padding: 16, border: '1px solid #E5E7EB', borderRadius: 12, background: '#F8FAFC' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText className="w-4 h-4" style={{ color: '#64748B' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#09111F', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Resume for ATS Round
                      </span>
                    </div>
                    <label htmlFor="lobby-resume-upload">
                      <input
                        id="lobby-resume-upload"
                        type="file"
                        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleResumeUpload}
                        className="hidden"
                        disabled={uploadingResume}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        asChild
                        disabled={uploadingResume}
                        style={{ borderRadius: 8, padding: '6px 12px', fontSize: '0.75rem', fontWeight: 700 }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: uploadingResume ? 'not-allowed' : 'pointer' }}>
                          {uploadingResume ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                          {uploadingResume ? 'Uploading...' : 'Upload'}
                        </span>
                      </Button>
                    </label>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#64748B', lineHeight: 1.5, marginBottom: 8 }}>
                    Upload your resume before interview. ATS and analysis will be shown in your final interview report.
                  </p>
                  {loadingResumes ? (
                    <p style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Loading resume status...</p>
                  ) : latestResume ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {latestResume.file_name || 'Latest resume'}
                      </span>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.78rem', color: '#94A3B8' }}>No resume uploaded yet.</p>
                  )}
                  {resumeError && (
                    <p style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: 8 }}>{resumeError}</p>
                  )}
                </div>

                <div style={{ paddingTop: 16, borderTop: '1px solid #E5E7EB' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 16, color: '#09111F', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Capture Modes</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid #E5E7EB' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Mic className="w-4 h-4" style={{ color: '#94A3B8' }} />
                        <Label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#09111F', cursor: 'pointer' }}>Voice Interview</Label>
                      </div>
                      <Switch checked={enableVoice} onCheckedChange={setEnableVoice} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid #E5E7EB' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Video className="w-4 h-4" style={{ color: '#94A3B8' }} />
                        <Label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#09111F', cursor: 'pointer' }}>Video Recording</Label>
                      </div>
                      <Switch checked={enableVideo} onCheckedChange={setEnableVideo} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Shield className="w-4 h-4" style={{ color: '#94A3B8' }} />
                        <Label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#09111F', cursor: 'pointer' }}>AI Proctoring</Label>
                      </div>
                      <Switch checked={enableProctoring} onCheckedChange={setEnableProctoring} />
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setIsCustomizationOpen(true)}
                    style={{ marginTop: 16, width: '100%', borderRadius: 10, fontWeight: 700 }}
                  >
                    Customize Interview (Avatar, Voice, Speed)
                  </Button>
                </div>
              </div>
            </div>

            {/* Right: Summary */}
            <div style={{ padding: 32, borderRadius: 20, background: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 24 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#09111F' }}>Session Overview</h3>
              
              {selectedTemplate ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: '#94A3B8', fontWeight: 600 }}>Interview Type</span>
                      <span style={{ color: '#09111F', fontWeight: 700 }}>{selectedTemplate.name}</span>
                    </div>
                    {selectedTemplate.total_estimated_time_minutes != null && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: '#94A3B8', fontWeight: 600 }}>Duration</span>
                        <span style={{ color: '#09111F', fontWeight: 700 }}>{selectedTemplate.total_estimated_time_minutes} min</span>
                      </div>
                    )}
                    {selectedTemplate.total_questions != null && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: '#94A3B8', fontWeight: 600 }}>Questions</span>
                        <span style={{ color: '#09111F', fontWeight: 700 }}>{selectedTemplate.total_questions}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: '#94A3B8', fontWeight: 600 }}>Experience Level</span>
                      <span style={{ color: '#09111F', fontWeight: 700 }}>{formatExperienceLabel(experienceLevel)}</span>
                    </div>
                  </div>

                  {diffDist && Object.keys(diffDist).length > 0 && (
                    <div style={{ padding: 16, borderRadius: 12, background: '#F8FAFC', marginBottom: 24 }}>
                      <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 12, color: '#09111F', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Difficulty Spread</h3>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {diffDist.easy != null && (
                          <span style={{ fontSize: '0.7rem', padding: '6px 12px', borderRadius: 6, background: 'rgba(34,197,94,0.1)', color: '#166534', fontWeight: 700 }}>
                            Easy: {diffDist.easy}
                          </span>
                        )}
                        {diffDist.medium != null && (
                          <span style={{ fontSize: '0.7rem', padding: '6px 12px', borderRadius: 6, background: 'rgba(245,158,11,0.1)', color: '#92400e', fontWeight: 700 }}>
                            Medium: {diffDist.medium}
                          </span>
                        )}
                        {diffDist.hard != null && (
                          <span style={{ fontSize: '0.7rem', padding: '6px 12px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', color: '#7f1d1d', fontWeight: 700 }}>
                            Hard: {diffDist.hard}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedTemplate.topics.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                      {selectedTemplate.topics.map((t) => (
                        <span
                          key={t.topic_id}
                          style={{ fontSize: '0.7rem', padding: '6px 12px', borderRadius: 6, background: 'rgba(201,168,76,0.15)', color: '#8a6a17', fontWeight: 700 }}
                        >
                          {t.topic_name}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginBottom: 24 }}>Select an interview category to see details.</p>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 16, borderRadius: 12, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', fontSize: '0.85rem', marginBottom: 24, color: '#64748B' }}>
                <Sparkles className="w-4 h-4" style={{ color: '#C9A84C', flexShrink: 0 }} />
                <span>Questions adapt dynamically based on your responses</span>
              </div>

              {readinessError && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{readinessError}</span>
                </div>
              )}

              <Button 
                onClick={startInterview}
                disabled={isStarting || isCheckingReadiness || !selectedTemplate || isLoading}
                style={{ 
                  width: '100%', 
                  padding: '16px', 
                  background: isStarting || isCheckingReadiness || !selectedTemplate || isLoading ? '#CBD5E1' : '#09111F',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  cursor: isStarting || isCheckingReadiness || !selectedTemplate || isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  letterSpacing: '0.05em'
                }}
              >
                {isStarting || isCheckingReadiness ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" fill="#fff" style={{ marginRight: 2 }} />}
                {isStarting ? 'Starting...' : isCheckingReadiness ? 'Checking readiness...' : 'START INTERVIEW'}
              </Button>
            </div>
          </div>
        </div>

        {/* Pre-flight Checks */}
        <div style={{ padding: 40, borderRadius: 20, background: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 28, color: '#09111F' }}>Pre-Interview Checklist</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {(readinessChecklist.length > 0 ? readinessChecklist : [
                { label: 'Stable Internet Connection', ok: true },
                { label: 'Microphone Ready', ok: true },
                { label: 'Quiet Environment', ok: true },
              ]).map((item) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, background: item.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: item.ok ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(239,68,68,0.2)' }}>
                  {item.ok ? <CheckCircle2 className="w-5 h-5" style={{ color: '#059669', flexShrink: 0 }} /> : <AlertTriangle className="w-5 h-5" style={{ color: '#dc2626', flexShrink: 0 }} />}
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#09111F' }}>{item.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Permissions are checked just before launch so the session starts with the right hardware enabled.</span>
            </div>
          </div>
      </main>

      <Dialog open={isCustomizationOpen} onOpenChange={setIsCustomizationOpen}>
        <DialogContent className="sm:max-w-[860px] max-h-[84vh] overflow-y-auto border-0 bg-[linear-gradient(180deg,#001938_0%,#09111F_38%,#FAFAFA_38%,#FAFAFA_100%)] p-0 text-slate-900 shadow-2xl">
          <DialogHeader>
            <div className="rounded-t-lg bg-[linear-gradient(135deg,#001938_0%,#0A1629_100%)] px-6 py-5 text-white">
              <DialogTitle className="text-xl text-white">Customize Interview</DialogTitle>
              <DialogDescription className="text-white/75">
                Set your interviewer, voice, and speed step by step.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-4 px-6 py-6">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <button type="button" className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left" onClick={openInterviewers}>
                <div>
                  <p className="text-sm font-semibold text-[var(--primary)]">Interviewer</p>
                  <p className="text-sm text-muted-foreground">Choose the interviewer you like</p>
                </div>
                <Badge className="bg-[rgba(233,195,73,0.14)] text-[var(--primary)] hover:bg-[rgba(233,195,73,0.14)]">{customizationStep === 'interviewer' ? 'Open' : 'Saved'}</Badge>
              </button>
              {customizationStep === 'interviewer' ? (
                <div className="border-t px-4 py-4">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {INTERVIEW_AVATAR_CATALOG.map((avatar) => {
                      const isActive = customization.avatarId === avatar.id;
                      return (
                        <button
                          key={avatar.id}
                          type="button"
                          onClick={() => {
                            persistDraftCustomization({
                              ...customization,
                              avatarId: avatar.id,
                              avatarGender: avatar.gender,
                              avatarName: avatar.name,
                              avatarModelPath: avatar.modelPath,
                              avatarImagePath: avatar.imagePath,
                              voiceType: avatar.gender,
                              voiceName: null,
                            });
                            setCustomizationStep('voices');
                          }}
                          className={cn(
                            'overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg',
                            isActive ? 'border-[var(--secondary)] ring-2 ring-[var(--secondary)]' : 'border-slate-200',
                          )}
                        >
                          <div className="flex items-center gap-3 p-3">
                            <img src={avatar.imagePath} alt={avatar.name} className="h-16 w-16 rounded-xl object-cover" />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-[var(--primary)]">{avatar.name}</p>
                              <p className="text-sm text-muted-foreground">{avatar.gender.toUpperCase()}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="border-t px-4 py-3">
                  <button type="button" className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left hover:bg-slate-100" onClick={openInterviewers}>
                    <img src={selectedAvatar.imagePath} alt={selectedAvatar.name} className="h-12 w-12 rounded-full object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{selectedAvatar.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedAvatar.gender.toUpperCase()}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <button type="button" className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left" onClick={openVoices}>
                <div>
                  <p className="text-sm font-semibold text-[var(--primary)]">Voice</p>
                  <p className="text-sm text-muted-foreground">Only voices that match your interviewer</p>
                </div>
                <Badge className="bg-[rgba(233,195,73,0.14)] text-[var(--primary)] hover:bg-[rgba(233,195,73,0.14)]">{customizationStep === 'voices' ? 'Open' : customization.voiceName ? 'Saved' : 'Next'}</Badge>
              </button>
              {customizationStep === 'voices' ? (
                <div className="border-t px-4 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">Voices for {customization.avatarGender.toUpperCase()}</p>
                    <span className="text-sm text-muted-foreground">{filteredVoices.length} voices</span>
                  </div>
                  <div className="grid gap-2">
                    {filteredVoices.map((voice) => {
                      const isActive = customization.voiceName === voice.name;
                      return (
                        <button
                          key={`${voice.name}-${voice.lang}`}
                          type="button"
                          onClick={() => {
                            persistDraftCustomization({ ...customization, voiceName: voice.name, voiceType: customization.avatarGender });
                            setCustomizationStep('speed');
                          }}
                          className={cn(
                            'flex items-center justify-between rounded-xl border px-3 py-2 text-left transition',
                            isActive ? 'border-[var(--secondary)] bg-[rgba(233,195,73,0.12)]' : 'border-slate-200 bg-white hover:bg-slate-100',
                          )}
                        >
                          <div>
                            <p className="font-medium text-slate-900">{voice.name}</p>
                            <p className="text-xs text-slate-500">{voice.lang} • {voice.default ? 'default' : 'alternate'}</p>
                          </div>
                          <Badge variant="outline" className="border-slate-200">{classifyVoice(voice)}</Badge>
                        </button>
                      );
                    })}
                    {filteredVoices.length === 0 && (
                      <p className="p-3 text-sm text-muted-foreground">No matching voices found for this gender.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border-t px-4 py-3">
                  <button type="button" className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left hover:bg-slate-100" onClick={openVoices}>
                    <div>
                      <p className="font-semibold text-slate-900">{customization.voiceName || 'Choose a voice'}</p>
                      <p className="text-sm text-muted-foreground">Matching voices only</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <button type="button" className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left" onClick={openSpeed}>
                <div>
                  <p className="text-sm font-semibold text-[var(--primary)]">Speed</p>
                  <p className="text-sm text-muted-foreground">Pick how fast the voice speaks</p>
                </div>
                <Badge className="bg-[rgba(233,195,73,0.14)] text-[var(--primary)] hover:bg-[rgba(233,195,73,0.14)]">{customizationStep === 'speed' ? 'Open' : `${customization.wordsPerMinute} WPM`}</Badge>
              </button>
              {customizationStep === 'speed' ? (
                <div className="border-t px-4 py-4">
                  <div className="mb-2 flex items-center justify-between">
                    <Label className="text-slate-800">Speech speed</Label>
                    <span className="text-sm text-muted-foreground">{customization.wordsPerMinute} WPM</span>
                  </div>
                  <Slider
                    value={[customization.wordsPerMinute]}
                    min={120}
                    max={220}
                    step={10}
                    className="[&>.relative]:bg-[rgba(0,25,56,0.16)]"
                    onValueChange={(value) => {
                      const [wpm] = value;
                      persistDraftCustomization({ ...customization, wordsPerMinute: wpm });
                    }}
                  />
                  <div className="mt-4 rounded-2xl border border-[rgba(0,25,56,0.12)] bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 text-sm shadow-sm">
                    <p className="font-semibold text-[var(--primary)]">Preview</p>
                    <p className="text-muted-foreground">Audio preview line:</p>
                    <p className="mt-2 rounded-xl border border-[rgba(0,25,56,0.10)] bg-white px-3 py-2 font-mono text-xs text-foreground">
                      {previewLine}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="border-t px-4 py-3">
                  <button type="button" className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left hover:bg-slate-100" onClick={openSpeed}>
                    <div>
                      <p className="font-semibold text-slate-900">{customization.wordsPerMinute} WPM</p>
                      <p className="text-sm text-muted-foreground">Tap to adjust speed</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={previewVoice} className="border-[var(--primary)] text-[var(--primary)] hover:bg-[rgba(0,25,56,0.04)]">
              Play Preview
            </Button>
            <Button type="button" onClick={() => setIsCustomizationOpen(false)} className="bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InterviewLobby;
