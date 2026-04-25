import { useState, useEffect, type ChangeEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { CandidateHeader } from '@/components/layout/CandidateHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Edit,
  User as UserIcon,
  Bell,
  Shield,
  Trash2,
  Lock,
  Eye,
  Globe,
  AlertTriangle,
  MapPin,
  Briefcase,
  GraduationCap,
  Github,
  Linkedin,
  Save,
  Loader2,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  getCandidateProfile,
  getCandidateSettings,
  getCandidateResumes,
  uploadCandidateResume,
  updateCandidateProfile,
  updateCandidateSettings,
  changePassword,
} from '@/services/candidateService';
import type { APIResumeDTO } from '@/types/api';
import type { User, Candidate } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { cn, getInitials } from '@/lib/utils';

type AccountSection = 'overview' | 'edit' | 'notifications' | 'privacy' | 'data';

const sectionLabels: Record<AccountSection, string> = {
  overview: 'Profile Overview',
  edit: 'Edit Profile',
  notifications: 'Notifications',
  privacy: 'Privacy',
  data: 'Data & Deletion',
};

const isAccountSection = (value: string | null): value is AccountSection => {
  return value === 'overview' || value === 'edit' || value === 'notifications' || value === 'privacy' || value === 'data';
};

const getScoreColor = (score: number) => {
  if (score >= 85) return '#16A34A';
  if (score >= 70) return '#C9A84C';
  if (score >= 55) return '#D97706';
  return '#DC2626';
};

const getScoreTrack = (score: number) => {
  if (score >= 85) return 'rgba(22,163,74,0.16)';
  if (score >= 70) return 'rgba(201,168,76,0.2)';
  if (score >= 55) return 'rgba(217,119,6,0.18)';
  return 'rgba(220,38,38,0.16)';
};

const Profile = () => {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [applyingResumeSkills, setApplyingResumeSkills] = useState(false);
  const [activeSection, setActiveSection] = useState<AccountSection>('overview');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    interview: true,
    reports: true,
    marketing: false,
  });
  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    shareResults: false,
    allowAnalytics: true,
  });
  const [resumes, setResumes] = useState<APIResumeDTO[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [expandResumeSections, setExpandResumeSections] = useState(false);
  const { toast } = useToast();

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    location: '',
    experience_years: 0,
    cgpa: 0,
    bio: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
  });

  useEffect(() => {
    async function load() {
      try {
        const [profileResult, settingsResult] = await Promise.allSettled([
          getCandidateProfile(),
          getCandidateSettings(),
        ]);

        if (profileResult.status === 'fulfilled') {
          setUser(profileResult.value.user);
          setCandidate(profileResult.value.candidate);
        }

        if (settingsResult.status === 'fulfilled') {
          setNotifications(settingsResult.value.notification_preferences);
          setPrivacy(settingsResult.value.privacy_preferences);
        }
      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const loadResumes = async () => {
    setLoadingResumes(true);
    try {
      const rows = await getCandidateResumes();
      setResumes(rows);
      setResumeError(null);
    } catch (err) {
      console.error('Failed to load resumes', err);
      setResumeError('Could not load your resume analysis right now.');
    } finally {
      setLoadingResumes(false);
    }
  };

  useEffect(() => {
    void loadResumes();
  }, []);

  useEffect(() => {
    const section = new URLSearchParams(location.search).get('section');
    if (isAccountSection(section)) {
      setActiveSection(section);
      return;
    }
    setActiveSection('overview');
  }, [location.search]);

  useEffect(() => {
    if (!user || !candidate) return;
    const p = candidate.profile_metadata!;
    setEditForm({
      full_name: user.name || '',
      phone: p.phone || '',
      location: p.location || '',
      experience_years: p.experience_years || 0,
      cgpa: p.cgpa || 0,
      bio: p.bio || '',
      linkedin_url: p.linkedin_url || '',
      github_url: p.github_url || '',
      portfolio_url: p.portfolio_url || '',
    });
  }, [user, candidate]);

  const handleSave = async () => {
    setSavingProfile(true);
    try {
      const result = await updateCandidateProfile({
        full_name: editForm.full_name,
        phone: editForm.phone || null,
        location: editForm.location || null,
        bio: editForm.bio || null,
        experience_years: editForm.experience_years || null,
        cgpa: editForm.cgpa || null,
        linkedin_url: editForm.linkedin_url || null,
        github_url: editForm.github_url || null,
        portfolio_url: editForm.portfolio_url || null,
      });
      setUser(result.user);
      setCandidate(result.candidate);
      setActiveSection('overview');
      toast({ title: 'Profile updated successfully' });
    } catch (err) {
      console.error('Failed to update profile', err);
      toast({ title: 'Failed to save changes', variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  const saveNotifications = async () => {
    setSavingPreferences(true);
    try {
      await updateCandidateSettings({ notification_preferences: notifications });
      toast({ title: 'Notification preferences saved' });
    } catch (err) {
      console.error('Failed to save notification preferences', err);
      toast({ title: 'Failed to save preferences', variant: 'destructive' });
    } finally {
      setSavingPreferences(false);
    }
  };

  const savePrivacy = async () => {
    setSavingPreferences(true);
    try {
      await updateCandidateSettings({ privacy_preferences: privacy });
      toast({ title: 'Privacy preferences saved' });
    } catch (err) {
      console.error('Failed to save privacy preferences', err);
      toast({ title: 'Failed to save preferences', variant: 'destructive' });
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    if (!passwordForm.current_password.trim()) {
      setPasswordError('Enter your current password.');
      return;
    }
    if (!passwordForm.new_password.trim()) {
      setPasswordError('Enter a new password.');
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      const result = await changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
        confirm_password: passwordForm.confirm_password,
      });
      toast({ title: result.message || 'Password updated successfully' });
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      console.error('Failed to change password', err);
      setPasswordError('Password change failed. Check your current password and try again.');
      toast({ title: 'Password change failed', variant: 'destructive' });
    } finally {
      setSavingPassword(false);
    }
  };

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
    } catch (err) {
      console.error('Resume upload failed', err);
      setResumeError('Resume upload failed. Please try again.');
      toast({ title: 'Resume upload failed', variant: 'destructive' });
    } finally {
      setUploadingResume(false);
      event.target.value = '';
    }
  };

  const latestResume = resumes[0] ?? null;
  const latestFeedback = latestResume?.llm_feedback && typeof latestResume.llm_feedback === 'object'
    ? (latestResume.llm_feedback as Record<string, unknown>)
    : null;
  const atsAnalysis = latestFeedback?.ats_analysis && typeof latestFeedback.ats_analysis === 'object'
    ? (latestFeedback.ats_analysis as Record<string, unknown>)
    : null;
  const atsDimensions = Array.isArray(atsAnalysis?.dimensions)
    ? (atsAnalysis.dimensions as Array<Record<string, unknown>>)
    : [];
  const atsHighlights = Array.isArray(atsAnalysis?.highlights)
    ? (atsAnalysis.highlights as string[])
    : [];
  const atsIssues = Array.isArray(atsAnalysis?.issues)
    ? (atsAnalysis.issues as string[])
    : [];
  const atsNextSteps = Array.isArray(atsAnalysis?.next_steps)
    ? (atsAnalysis.next_steps as string[])
    : [];
  const overallAssessment = typeof latestFeedback?.overall_assessment === 'string'
    ? latestFeedback.overall_assessment
    : null;
  const latestExtracted = (latestResume?.extracted_data ?? null) as Record<string, unknown> | null;
  const latestStructured = (latestResume?.structured_json ?? null) as Record<string, unknown> | null;
  const structuredContact = latestStructured?.contact && typeof latestStructured.contact === 'object'
    ? (latestStructured.contact as Record<string, unknown>)
    : null;

  const structuredSkillGroups = Array.isArray(latestStructured?.skills)
    ? (latestStructured?.skills as Array<Record<string, unknown>>)
    : [];
  const structuredSkills = structuredSkillGroups.flatMap((group) => {
    const items = group?.items;
    if (!Array.isArray(items)) return [];
    return items.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  });

  const structuredExperience = Array.isArray(latestStructured?.experience)
    ? (latestStructured?.experience as Array<Record<string, unknown>>)
    : [];
  const structuredEducation = Array.isArray(latestStructured?.education)
    ? (latestStructured?.education as Array<Record<string, unknown>>)
    : [];
  const structuredProjects = Array.isArray(latestStructured?.projects)
    ? (latestStructured?.projects as Array<Record<string, unknown>>)
    : [];
  const structuredCertifications = Array.isArray(latestStructured?.certifications)
    ? (latestStructured?.certifications as Array<Record<string, unknown>>)
    : [];
  const structuredLanguages = Array.isArray(latestStructured?.languages)
    ? (latestStructured?.languages as string[])
    : [];

  const extractedSkills = Array.isArray(latestExtracted?.skills)
    ? (latestExtracted.skills as unknown[]).filter((item): item is string => typeof item === 'string')
    : [];
  const resumeSkills = Array.from(
    new Map(
      [...structuredSkills, ...extractedSkills]
        .map((skill) => skill?.trim())
        .filter((skill): skill is string => Boolean(skill))
        .map((skill) => [skill.toLowerCase(), skill])
    ).values()
  );

  const feedbackStrengths = Array.isArray(latestFeedback?.strengths)
    ? (latestFeedback.strengths as string[])
    : [];
  const feedbackWeaknesses = Array.isArray(latestFeedback?.weaknesses)
    ? (latestFeedback.weaknesses as string[])
    : [];
  const feedbackSuggestions = Array.isArray(latestFeedback?.suggestions)
    ? (latestFeedback.suggestions as string[])
    : [];

  const strengthsList = Array.from(new Set([...atsHighlights, ...feedbackStrengths])).slice(0, 4);
  const weaknessesList = Array.from(new Set([...atsIssues, ...feedbackWeaknesses])).slice(0, 4);
  const recommendationList = Array.from(new Set([...atsNextSteps, ...feedbackSuggestions])).slice(0, 3);

  const hasEmail = Boolean((structuredContact?.email as string) || (latestExtracted?.email as string));
  const hasPhone = Boolean((structuredContact?.phone as string) || (latestExtracted?.phone as string));
  const hasLocation = Boolean((structuredContact?.location as string) || (latestExtracted?.location as string));
  const hasExperienceSection = structuredExperience.length > 0;
  const hasSkillSection = resumeSkills.length > 0;

  const readinessChips = [
    { label: 'Email', pass: hasEmail },
    { label: 'Phone', pass: hasPhone },
    { label: 'Location', pass: hasLocation },
    { label: 'Experience', pass: hasExperienceSection },
    { label: 'Skills', pass: hasSkillSection },
  ];

  const analysisConfidence = Math.min(
    99,
    55
      + (latestResume?.parse_status === 'success' ? 15 : 0)
      + (latestResume?.llm_analysis_status === 'success' ? 15 : 0)
      + (atsDimensions.length >= 3 ? 10 : 0)
      + (structuredExperience.length > 0 ? 5 : 0)
  );

  const visibleExperience = expandResumeSections ? structuredExperience : structuredExperience.slice(0, 3);
  const visibleProjects = expandResumeSections ? structuredProjects : structuredProjects.slice(0, 3);

  const applyResumeSkillsToProfile = async () => {
    if (!resumeSkills.length) return;
    setApplyingResumeSkills(true);
    try {
      const result = await updateCandidateProfile({ skills: resumeSkills });
      setUser(result.user);
      setCandidate(result.candidate);
      toast({ title: 'Resume skills applied to your profile' });
    } catch (err) {
      console.error('Failed to apply resume skills', err);
      toast({ title: 'Could not apply resume skills', variant: 'destructive' });
    } finally {
      setApplyingResumeSkills(false);
    }
  };

  if (loading || !user || !candidate) {
    return (
      <div className="min-h-screen bg-muted/30">
        <CandidateHeader />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-foreground" />
        </div>
      </div>
    );
  }

  const profile = candidate.profile_metadata!;
  const sectionItems: Array<{ id: AccountSection; label: string; icon: typeof UserIcon }> = [
    { id: 'overview', label: 'Profile Overview', icon: UserIcon },
    { id: 'edit', label: 'Edit Profile', icon: Edit },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'data', label: 'Data & Deletion', icon: Trash2 },
  ];

  const handleSectionChange = (value: string) => {
    if (isAccountSection(value)) {
      setActiveSection(value);
    }
  };

  const renderSection = () => {
    if (activeSection === 'overview') {
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />Resume Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Label
                  htmlFor="resume-upload"
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
                    uploadingResume ? 'bg-muted text-muted-foreground' : 'bg-foreground text-background hover:bg-foreground/90'
                  )}
                >
                  {uploadingResume ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploadingResume ? 'Uploading...' : 'Upload Resume'}
                </Label>
                <input
                  id="resume-upload"
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={handleResumeUpload}
                  disabled={uploadingResume}
                />
                <span className="text-xs text-muted-foreground">Accepted: PDF, DOCX · Max 10MB</span>
              </div>

              {resumeError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {resumeError}
                </div>
              )}

              {loadingResumes ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading resume analysis...</span>
                </div>
              ) : !latestResume ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                  Upload your resume to generate extraction and profile-personalization insights.
                </div>
              ) : (
                <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">Latest analysis</span>
                    <span className="text-xs text-muted-foreground">Uploaded: {latestResume.uploaded_at ? new Date(latestResume.uploaded_at).toLocaleString() : '—'}</span>
                  </div>

                  {/* ATS Hero Summary */}
                  {latestResume.ats_score !== null && latestResume.ats_score !== undefined && (
                    <div className="rounded-xl border border-border bg-background p-5 space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ATS Readiness</p>
                          <div className="mt-1 flex items-end gap-3">
                            <span className="text-3xl font-bold leading-none" style={{ color: getScoreColor(latestResume.ats_score) }}>
                              {latestResume.ats_score}
                            </span>
                            <span className="pb-1 text-sm text-muted-foreground">/100</span>
                          </div>
                          {typeof atsAnalysis?.grade === 'string' && (
                            <Badge
                              variant="outline"
                              className="mt-2"
                              style={{
                                borderColor: getScoreColor(latestResume.ats_score),
                                color: getScoreColor(latestResume.ats_score),
                                background: getScoreTrack(latestResume.ats_score),
                              }}
                            >
                              {atsAnalysis.grade}
                            </Badge>
                          )}
                        </div>
                        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-right">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Analysis Confidence</p>
                          <p className="text-lg font-semibold">{analysisConfidence}%</p>
                        </div>
                      </div>
                      <div
                        className="h-2 w-full overflow-hidden rounded-full"
                        style={{ background: getScoreTrack(latestResume.ats_score) }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            backgroundColor: getScoreColor(latestResume.ats_score),
                            boxShadow: `0 0 0 1px ${getScoreColor(latestResume.ats_score)}22 inset`,
                            width: `${Math.max(0, Math.min(100, latestResume.ats_score))}%`,
                          }}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {readinessChips.map((chip) => (
                          <Badge
                            key={chip.label}
                            variant="outline"
                            className="gap-1"
                            style={{
                              borderColor: chip.pass ? '#16A34A55' : '#D9770655',
                              color: chip.pass ? '#166534' : '#B45309',
                              background: chip.pass ? 'rgba(22,163,74,0.08)' : 'rgba(217,119,6,0.1)',
                            }}
                          >
                            {chip.pass ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                            {chip.label}
                          </Badge>
                        ))}
                      </div>

                      {latestResume.ats_feedback && (
                        <p className="text-sm text-muted-foreground">{latestResume.ats_feedback}</p>
                      )}

                      {atsDimensions.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Score Breakdown</p>
                          <div className="space-y-2">
                            {atsDimensions.slice(0, 5).map((dimension, index) => {
                              const label = typeof dimension.label === 'string' ? dimension.label : `Dimension ${index + 1}`;
                              const score = typeof dimension.score === 'number' ? dimension.score : 0;
                              const reason = typeof dimension.reason === 'string' ? dimension.reason : '';
                              return (
                                <div
                                  key={`${label}-${index}`}
                                  className="rounded-md border border-border p-2"
                                  style={{ borderLeft: `3px solid ${getScoreColor(score)}` }}
                                >
                                  <div className="mb-1 flex items-center justify-between text-xs">
                                    <span className="font-medium">{label}</span>
                                    <span style={{ color: getScoreColor(score), fontWeight: 700 }}>{score}/100</span>
                                  </div>
                                  <div
                                    className="h-1.5 w-full overflow-hidden rounded-full"
                                    style={{ background: getScoreTrack(score) }}
                                  >
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{
                                        backgroundColor: getScoreColor(score),
                                        width: `${Math.max(0, Math.min(100, score))}%`,
                                      }}
                                    />
                                  </div>
                                  {reason && <p className="mt-1 text-xs text-muted-foreground">{reason}</p>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Strengths vs Gaps + Recommendations */}
                  {latestFeedback && (
                    <div className="space-y-4 rounded-lg bg-background p-4 border border-border">
                      {overallAssessment && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Overall Assessment</p>
                          <p className="text-sm">{overallAssessment}</p>
                        </div>
                      )}

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg border border-border bg-muted/20 p-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Strengths</p>
                          {strengthsList.length ? (
                            <ul className="text-sm space-y-1">
                              {strengthsList.map((highlight, i) => (
                                <li key={i} className="flex gap-2">
                                  <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span>
                                  <span>{highlight}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground">No major strengths detected yet.</p>
                          )}
                        </div>

                        <div className="rounded-lg border border-border bg-muted/20 p-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Weaknesses</p>
                          {weaknessesList.length ? (
                            <ul className="text-sm space-y-1">
                              {weaknessesList.map((issue, i) => (
                                <li key={i} className="flex gap-2">
                                  <span style={{ color: '#D97706', fontWeight: 800 }}>!</span>
                                  <span>{issue}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground">No major weaknesses detected.</p>
                          )}
                        </div>
                      </div>

                      {recommendationList.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Recommended Next Steps</p>
                          <div className="grid gap-2 md:grid-cols-3">
                            {recommendationList.map((suggestion, i) => (
                              <div key={i} className="rounded-md border border-border bg-muted/20 p-3">
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action {i + 1}</p>
                                <p className="text-sm leading-5">{suggestion}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(strengthsList.length > 0 || weaknessesList.length > 0) && (
                        <div className="rounded-md border border-dashed border-border p-3">
                          <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            <Sparkles className="h-3.5 w-3.5" />
                            Key Observations
                          </p>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            {strengthsList[0] && <li>- {strengthsList[0]}</li>}
                            {weaknessesList[0] && <li>- {weaknessesList[0]}</li>}
                            {recommendationList[0] && <li>- Focus next on: {recommendationList[0]}</li>}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Processing Status */}
                  {latestResume.parse_status || latestResume.llm_analysis_status ? (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {latestResume.parse_status && (
                        <div className="rounded px-2 py-1 bg-muted">
                          <span className="font-medium">Parse:</span>
                          <span className={latestResume.parse_status === 'success' ? ' text-green-600' : ' text-orange-600'}>
                            {' '}{latestResume.parse_status}
                          </span>
                        </div>
                      )}
                      {latestResume.llm_analysis_status && (
                        <div className="rounded px-2 py-1 bg-muted">
                          <span className="font-medium">LLM:</span>
                          <span className={latestResume.llm_analysis_status === 'success' ? ' text-green-600' : ' text-orange-600'}>
                            {' '}{latestResume.llm_analysis_status}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="border-t border-border pt-4 space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Name:</span>{' '}
                        <span className="font-medium">{(structuredContact?.name as string) || (latestExtracted?.name as string) || 'Not detected'}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Email:</span>{' '}
                        <span className="font-medium">{(structuredContact?.email as string) || (latestExtracted?.email as string) || 'Not detected'}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Phone:</span>{' '}
                        <span className="font-medium">{(structuredContact?.phone as string) || (latestExtracted?.phone as string) || 'Not detected'}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Experience:</span>{' '}
                        <span className="font-medium">
                          {typeof latestExtracted?.experience_years === 'number'
                            ? `${latestExtracted.experience_years} years`
                            : structuredExperience.length
                              ? `${structuredExperience.length} role${structuredExperience.length > 1 ? 's' : ''} detected`
                              : 'Not detected'}
                        </span>
                      </div>
                    </div>

                    {((typeof latestStructured?.summary === 'string' && latestStructured.summary) || (typeof latestExtracted?.summary === 'string' && latestExtracted.summary)) && (
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</p>
                        <p className="text-sm">{(latestStructured?.summary as string) || (latestExtracted?.summary as string)}</p>
                      </div>
                    )}

                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Detected Skills</p>
                      {resumeSkills.length ? (
                        <div className="flex flex-wrap gap-2">
                          {resumeSkills.map((skill) => (
                            <Badge key={skill} variant="secondary">{skill}</Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No skills detected from this resume.</p>
                      )}
                    </div>

                    {structuredExperience.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Experience</p>
                        <div className="space-y-2">
                          {visibleExperience.map((exp, index) => {
                            const title = typeof exp.title === 'string' ? exp.title : 'Role';
                            const company = typeof exp.company === 'string' ? exp.company : '';
                            const duration = typeof exp.duration === 'string' ? exp.duration : '';
                            const description = typeof exp.description === 'string' ? exp.description : '';
                            return (
                              <div key={`${title}-${company}-${index}`} className="rounded-md border border-border bg-background p-3">
                                <p className="text-sm font-medium">{title}{company ? ` · ${company}` : ''}</p>
                                {duration && <p className="text-xs text-muted-foreground">{duration}</p>}
                                {description && <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{description}</p>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="grid gap-3 md:grid-cols-2">
                      {structuredEducation.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Education</p>
                          <div className="space-y-2">
                            {structuredEducation.slice(0, 3).map((edu, index) => {
                              const degree = typeof edu.degree === 'string' ? edu.degree : 'Education';
                              const school = typeof edu.school === 'string' ? edu.school : '';
                              const date = typeof edu.graduation_date === 'string' ? edu.graduation_date : '';
                              return (
                                <div key={`${degree}-${school}-${index}`} className="rounded-md border border-border bg-background p-3">
                                  <p className="text-sm font-medium">{degree}</p>
                                  {school && <p className="text-xs text-muted-foreground">{school}</p>}
                                  {date && <p className="text-xs text-muted-foreground">{date}</p>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {structuredProjects.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Projects</p>
                          <div className="space-y-2">
                            {visibleProjects.map((project, index) => {
                              const title = typeof project.title === 'string' ? project.title : `Project ${index + 1}`;
                              const description = typeof project.description === 'string' ? project.description : '';
                              return (
                                <div key={`${title}-${index}`} className="rounded-md border border-border bg-background p-3">
                                  <p className="text-sm font-medium">{title}</p>
                                  {description && <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {(structuredExperience.length > 3 || structuredProjects.length > 3) && (
                      <div className="flex justify-start">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2"
                          onClick={() => setExpandResumeSections((prev) => !prev)}
                        >
                          {expandResumeSections ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          {expandResumeSections ? 'Show less details' : 'Show more details'}
                        </Button>
                      </div>
                    )}

                    {(structuredCertifications.length > 0 || structuredLanguages.length > 0) && (
                      <div className="grid gap-3 md:grid-cols-2">
                        {structuredCertifications.length > 0 && (
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Certifications</p>
                            <div className="flex flex-wrap gap-2">
                              {structuredCertifications.slice(0, 6).map((cert, index) => {
                                const certName = typeof cert.name === 'string' ? cert.name : `Certification ${index + 1}`;
                                return <Badge key={`${certName}-${index}`} variant="outline">{certName}</Badge>;
                              })}
                            </div>
                          </div>
                        )}

                        {structuredLanguages.length > 0 && (
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Languages</p>
                            <div className="flex flex-wrap gap-2">
                              {structuredLanguages.slice(0, 8).map((lang, index) => (
                                <Badge key={`${lang}-${index}`} variant="outline">{lang}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        onClick={applyResumeSkillsToProfile}
                        disabled={!resumeSkills.length || applyingResumeSkills}
                      >
                        {applyingResumeSkills ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Apply Skills To Profile
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />Education
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.education?.length ? profile.education.map((edu, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/50">
                    <h4 className="font-medium">{edu.institution}</h4>
                    <p className="text-sm text-muted-foreground">{edu.degree} in {edu.field}</p>
                    <p className="text-xs text-muted-foreground">{edu.start_year} - {edu.end_year || 'Present'}</p>
                    {edu.gpa && <Badge variant="outline" className="text-xs mt-1">GPA: {edu.gpa}</Badge>}
                  </div>
                )) : <p className="text-sm text-muted-foreground">No education details available.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />Experience
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.work_experience?.length ? profile.work_experience.map((work, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{work.title}</h4>
                      {work.is_current && <Badge className="text-xs bg-success/10 text-success">Current</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{work.company}</p>
                    <p className="text-xs text-muted-foreground">{work.start_date} - {work.end_date || 'Present'}</p>
                    {work.description && <p className="text-sm mt-2">{work.description}</p>}
                  </div>
                )) : <p className="text-sm text-muted-foreground">No work experience details available.</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    if (activeSection === 'edit') {
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Edit Your Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input defaultValue={user.email} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={editForm.location} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Experience (years)</Label>
                  <Input type="number" value={editForm.experience_years} onChange={e => setEditForm(f => ({ ...f, experience_years: Number(e.target.value) }))} />
                </div>
                <div className="space-y-2">
                  <Label>CGPA</Label>
                  <Input type="number" step="0.1" value={editForm.cgpa} onChange={e => setEditForm(f => ({ ...f, cgpa: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))} rows={3} />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>LinkedIn URL</Label>
                  <Input value={editForm.linkedin_url} onChange={e => setEditForm(f => ({ ...f, linkedin_url: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>GitHub URL</Label>
                  <Input value={editForm.github_url} onChange={e => setEditForm(f => ({ ...f, github_url: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Portfolio URL</Label>
                  <Input value={editForm.portfolio_url} onChange={e => setEditForm(f => ({ ...f, portfolio_url: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button variant="secondary" className="gap-2" onClick={handleSave} disabled={savingProfile || !editForm.full_name.trim()}>
                  {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
                <div>
                  <p className="text-sm font-medium">Update Password</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter your current password, then choose a new password and confirm it below.
                  </p>
                </div>

                {passwordError && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {passwordError}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showCurrentPassword ? <Eye className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordForm.new_password}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))}
                        placeholder="Create a new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showNewPassword ? <Eye className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={passwordForm.confirm_password}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm_password: e.target.value }))}
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showConfirmPassword ? <Eye className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    className="gap-2"
                    variant="secondary"
                    onClick={handleChangePassword}
                    disabled={savingPassword}
                  >
                    {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    {savingPassword ? 'Updating...' : 'Update Password'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (activeSection === 'notifications') {
      return (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Notifications</CardTitle>
            <Button size="sm" variant="secondary" className="gap-2" disabled={savingPreferences} onClick={saveNotifications}>
              <Save className="h-4 w-4" />
              {savingPreferences ? 'Saving...' : 'Save Preferences'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'email', label: 'Email Notifications', desc: 'Receive email updates about your account' },
              { key: 'interview', label: 'Interview Reminders', desc: 'Get notified before scheduled interviews' },
              { key: 'reports', label: 'Report Alerts', desc: 'Notification when interview results are ready' },
              { key: 'marketing', label: 'Marketing Emails', desc: 'Receive tips and product updates' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={notifications[item.key as keyof typeof notifications]}
                  onCheckedChange={(c) => setNotifications(p => ({ ...p, [item.key]: c }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      );
    }

    if (activeSection === 'privacy') {
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">Privacy Controls</CardTitle>
              <Button size="sm" variant="secondary" className="gap-2" disabled={savingPreferences} onClick={savePrivacy}>
                <Save className="h-4 w-4" />
                {savingPreferences ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'profileVisible', label: 'Profile Visibility', desc: 'Allow organizations to view your profile', icon: Globe },
                { key: 'shareResults', label: 'Share Results', desc: 'Allow sharing interview results with third parties', icon: Eye },
                { key: 'allowAnalytics', label: 'Analytics', desc: 'Allow usage analytics for platform improvement', icon: Bell },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                  <Switch
                    checked={privacy[item.key as keyof typeof privacy]}
                    onCheckedChange={(c) => setPrivacy(p => ({ ...p, [item.key]: c }))}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Data Privacy Commitment</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your interview data is encrypted and stored securely. Audio/video recordings are subject to retention policies and are deleted based on policy configuration.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Data Export</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Request a complete export of your profile, interview history, scores, and related records.
            </p>
            <Button variant="outline" className="gap-2" disabled>
              <Save className="h-4 w-4" />Request Data Export
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-lg text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
              <h4 className="font-medium text-sm mb-1">Delete All Interview Data</h4>
              <p className="text-xs text-muted-foreground mb-3">
                This permanently deletes interview recordings, transcripts, and evaluations.
              </p>
              <Button variant="destructive" size="sm" className="gap-2" disabled>
                <Trash2 className="h-4 w-4" />Delete Interview Data
              </Button>
            </div>

            <Separator />

            <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
              <h4 className="font-medium text-sm mb-1">Delete Account</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Permanently delete your account and all associated data.
              </p>
              <Button variant="destructive" size="sm" className="gap-2" disabled>
                <Trash2 className="h-4 w-4" />Delete My Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <CandidateHeader />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Profile</h1>
          <p className="text-muted-foreground">Manage your profile, resume analysis, preferences, and privacy controls.</p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="bg-foreground text-background text-2xl">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold">{user.name}</h1>
                    <p className="text-muted-foreground">{user.email}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{profile.location}</span>
                      <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{profile.experience_years} years exp.</span>
                      {profile.cgpa && <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" />CGPA: {profile.cgpa}</span>}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setActiveSection('edit')} className="gap-2">
                    <Edit className="h-4 w-4" />Edit Profile
                  </Button>
                </div>
                <p className="text-sm mt-3">{profile.bio}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {profile.skills.slice(0, 8).map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                  ))}
                  {profile.skills.length > 8 && (
                    <Badge variant="outline" className="text-xs">+{profile.skills.length - 8} more</Badge>
                  )}
                </div>
                <div className="flex gap-3 mt-3">
                  {profile.linkedin_url && (
                    <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                      <Linkedin className="h-4 w-4" />
                    </a>
                  )}
                  {profile.github_url && (
                    <a href={profile.github_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                      <Github className="h-4 w-4" />
                    </a>
                  )}
                  {profile.portfolio_url && (
                    <a href={profile.portfolio_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                      <Globe className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <Tabs value={activeSection} onValueChange={handleSectionChange}>
            <TabsList className="mb-2 flex w-full flex-wrap justify-start gap-2 bg-transparent p-0">
              {sectionItems.map((item) => (
                <TabsTrigger
                  key={item.id}
                  value={item.id}
                  className="gap-2 rounded-md border border-border bg-background data-[state=active]:border-foreground/20 data-[state=active]:bg-muted"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <h2 className="text-xl font-semibold">{sectionLabels[activeSection]}</h2>
          {renderSection()}
        </section>
      </main>
    </div>
  );
};

export default Profile;
