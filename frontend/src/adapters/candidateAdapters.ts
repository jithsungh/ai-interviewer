// =============================================
// Adapters: API Response → UI Model Mappers
// These functions translate backend API shapes
// into the UI data structures used by components.
// =============================================

import type {
  APICandidateProfileResponse,
  APICandidateStatsResponse,
  APICandidateWindowDTO,
  APICandidateSubmissionDTO,
  APIPracticeSkillDTO,
  APIPracticeQuestionDTO,
  APIExchangeItemDTO,
  APIInterviewResultResponse,
  CurrentUserResponse,
} from '@/types/api';

import type {
  User,
  Candidate,
  CandidateProfile,
  InterviewSubmissionWindow,
  InterviewSubmission,
  InterviewExchange,
  InterviewResult,
  Organization,
  Role,
  InterviewTemplate,
} from '@/types/database';

// ---- Auth / Current User ----

export function mapCurrentUser(api: CurrentUserResponse): User {
  return {
    id: api.user_id,
    name: api.full_name ?? '',
    email: api.email,
    status: 'active',
    user_type: api.user_type,
    created_at: '',
    updated_at: '',
  };
}

// ---- Candidate Profile ----

export function mapCandidateProfile(api: APICandidateProfileResponse): {
  user: User;
  candidate: Candidate;
} {
  const user: User = {
    id: api.candidate_id,
    name: api.full_name,
    email: api.email,
    status: 'active',
    user_type: 'candidate',
    created_at: api.created_at ?? '',
    updated_at: api.created_at ?? '',
  };

  const profileMetadata: CandidateProfile = {
    phone: api.phone ?? undefined,
    experience_years: api.experience_years ?? 0,
    cgpa: api.cgpa ?? undefined,
    skills: api.skills ?? [],
    bio: api.bio ?? undefined,
    location: api.location ?? undefined,
    linkedin_url: api.linkedin_url ?? undefined,
    github_url: api.github_url ?? undefined,
    portfolio_url: api.portfolio_url ?? undefined,
    education: (api.education ?? []).map((ed: Record<string, unknown>) => ({
      institution: (ed.institution as string) ?? '',
      degree: (ed.degree as string) ?? '',
      field: (ed.field as string) ?? '',
      start_year: (ed.start_year as number) ?? 0,
      end_year: ed.end_year as number | undefined,
      gpa: ed.gpa as number | undefined,
    })),
    work_experience: (api.work_experience ?? []).map((we: Record<string, unknown>) => ({
      company: (we.company as string) ?? '',
      title: (we.title as string) ?? '',
      start_date: (we.start_date as string) ?? '',
      end_date: we.end_date as string | undefined,
      description: we.description as string | undefined,
      is_current: (we.is_current as boolean) ?? false,
    })),
  };

  const candidate: Candidate = {
    id: api.candidate_id,
    user_id: api.candidate_id,
    plan: api.plan as 'free' | 'pro' | 'prime',
    status: 'active',
    profile_metadata: profileMetadata,
    created_at: api.created_at ?? '',
    updated_at: api.created_at ?? '',
  };

  return { user, candidate };
}

// ---- Candidate Stats ----

export interface CandidatePerformanceStatsUI {
  totalInterviews: number;
  averageScore: number;
  passRate: number;
  totalPracticeTime: string;
  strongAreas: string[];
  improvementAreas: string[];
  scoreHistory: Array<{ date: string; score: number }>;
  skillBreakdown: Array<{ skill: string; score: number }>;
}

export function mapCandidateStats(api: APICandidateStatsResponse): CandidatePerformanceStatsUI {
  const sortedSkills = [...api.skill_breakdown].sort(
    (a, b) => (b.score ?? 0) - (a.score ?? 0)
  );
  const threshold = 75;
  const strongAreas = sortedSkills
    .filter((s) => (s.score ?? 0) >= threshold)
    .map((s) => s.skill);
  const improvementAreas = sortedSkills
    .filter((s) => (s.score ?? 0) < threshold)
    .map((s) => s.skill);

  const totalMinutes = api.total_practice_time_minutes ?? 0;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const totalPracticeTime = `${hours}h ${mins}m`;

  return {
    totalInterviews: api.total_interviews,
    averageScore: api.average_score ?? 0,
    passRate: api.pass_rate ?? 0,
    totalPracticeTime,
    strongAreas,
    improvementAreas,
    scoreHistory: api.score_history.map((p) => ({
      date: p.date,
      score: p.score ?? 0,
    })),
    skillBreakdown: api.skill_breakdown.map((s) => ({
      skill: s.skill,
      score: s.score ?? 0,
    })),
  };
}

// ---- Candidate Windows ----

/**
 * Maps a flat API CandidateWindowDTO to the nested
 * InterviewSubmissionWindow structure the UI expects.
 *
 * Note: the API returns a single role per window (flat).
 * The UI expects role_templates[] with nested role + template objects.
 * The API does not return template details in the window DTO —
 * duration_minutes is used as a proxy for total_estimated_time_minutes.
 */
export function mapCandidateWindow(api: APICandidateWindowDTO): InterviewSubmissionWindow {
  const org: Organization = {
    id: api.organization.id,
    name: api.organization.name,
    organization_type: 'company',
    plan: 'enterprise',
    status: 'active',
    created_at: '',
    updated_at: '',
  };

  const roleTemplates = (api.role_templates ?? []).map((rt) => {
    const role: Role = {
      id: rt.role.id,
      name: rt.role.name,
      scope: (rt.role.scope as 'public' | 'private') ?? 'public',
      created_at: '',
      updated_at: '',
    };
    const template: InterviewTemplate = {
      id: rt.template.id,
      name: rt.template.name,
      scope: (rt.template.scope as 'public' | 'private') ?? 'public',
      total_estimated_time_minutes: rt.template.total_estimated_time_minutes ?? 60,
      version: rt.template.version ?? 1,
      is_active: rt.template.is_active ?? true,
      created_at: '',
      updated_at: '',
    };
    return {
      id: rt.id,
      window_id: api.id,
      role_id: rt.role_id,
      template_id: rt.template_id,
      selection_weight: rt.selection_weight,
      created_at: '',
      role,
      template,
    };
  });

  return {
    id: api.id,
    organization_id: api.organization.id,
    admin_id: 0,
    name: api.name,
    scope: api.scope as 'global' | 'local' | 'only_invited',
    start_time: api.start_time,
    end_time: api.end_time,
    timezone: api.timezone ?? 'UTC',
    max_allowed_submissions: api.max_allowed_submissions ?? 1,
    allow_after_end_time: api.allow_after_end_time ?? false,
    allow_resubmission: api.allow_resubmission,
    created_at: '',
    updated_at: '',
    organization: org,
    role_templates: roleTemplates,
  };
}

export function mapCandidateWindows(apiWindows: APICandidateWindowDTO[]): InterviewSubmissionWindow[] {
  return apiWindows.map(mapCandidateWindow);
}

// ---- Candidate Submissions ----

/**
 * Maps a flat API CandidateSubmissionDTO to the nested
 * InterviewSubmission structure the UI expects.
 *
 * The API flattens result_status and recommendation into
 * top-level fields. The UI expects a nested `result` object.
 */
export function mapCandidateSubmission(api: APICandidateSubmissionDTO): InterviewSubmission {
  const role: Role = {
    id: api.role.id,
    name: api.role.name,
    scope: 'public',
    created_at: '',
    updated_at: '',
  };

  const window: InterviewSubmissionWindow = {
    id: api.window.id,
    organization_id: api.organization.id,
    admin_id: 0,
    name: api.window.name,
    scope: 'global',
    start_time: '',
    end_time: '',
    timezone: 'UTC',
    max_allowed_submissions: 1,
    allow_after_end_time: false,
    allow_resubmission: false,
    created_at: '',
    updated_at: '',
    organization: {
      id: api.organization.id,
      name: api.organization.name,
      organization_type: 'company',
      plan: 'enterprise',
      status: 'active',
      created_at: '',
      updated_at: '',
    },
  };

  const result: InterviewResult | undefined =
    api.result_status || api.final_score != null
      ? {
          id: 0,
          interview_submission_id: api.submission_id,
          final_score: api.final_score ?? 0,
          normalized_score: api.final_score ?? 0,
          result_status: (api.result_status as 'pass' | 'fail' | 'borderline' | 'incomplete') ?? 'incomplete',
          recommendation: (api.recommendation as 'hire' | 'no_hire' | 'review' | 'strong_hire') ?? 'review',
          is_current: true,
          computed_at: api.submitted_at ?? '',
          created_at: api.submitted_at ?? '',
        }
      : undefined;

  return {
    id: api.submission_id,
    candidate_id: 0,
    window_id: api.window.id,
    role_id: api.role.id,
    template_id: 0,
    mode: 'live',
    status: api.status as 'pending' | 'in_progress' | 'completed' | 'reviewed',
    final_score: api.final_score ?? undefined,
    consent_captured: true,
    started_at: api.started_at ?? undefined,
    submitted_at: api.submitted_at ?? undefined,
    created_at: api.submitted_at ?? '',
    updated_at: api.submitted_at ?? '',
    window,
    role,
    result,
  };
}

export function mapCandidateSubmissions(apiSubmissions: APICandidateSubmissionDTO[]): InterviewSubmission[] {
  return apiSubmissions.map(mapCandidateSubmission);
}

// ---- Interview Result (detailed) ----

export function mapInterviewResult(api: APIInterviewResultResponse): InterviewResult {
  return {
    id: api.result_id,
    interview_submission_id: api.interview_submission_id,
    final_score: api.final_score ?? 0,
    normalized_score: api.normalized_score ?? 0,
    result_status: (api.result_status as 'pass' | 'fail' | 'borderline' | 'incomplete') ?? 'incomplete',
    recommendation: (api.recommendation as 'hire' | 'no_hire' | 'review' | 'strong_hire') ?? 'review',
    section_scores: api.section_scores,
    strengths: api.strengths ?? undefined,
    weaknesses: api.weaknesses ?? undefined,
    summary_notes: api.summary_notes ?? undefined,
    generated_by: api.generated_by,
    is_current: api.is_current,
    computed_at: api.computed_at ?? '',
    created_at: api.created_at ?? '',
  };
}

// ---- Interview Exchanges ----

export function mapExchangeItem(api: APIExchangeItemDTO): InterviewExchange {
  return {
    id: api.exchange_id,
    interview_submission_id: 0,
    sequence_order: api.sequence_order,
    question_text: api.question_text,
    difficulty_at_time: api.difficulty_at_time as 'easy' | 'medium' | 'hard',
    response_text: api.response_text ?? undefined,
    response_code: api.response_code ?? undefined,
    response_time_ms: api.response_time_ms ?? undefined,
    ai_followup_message: api.ai_followup_message ?? undefined,
    created_at: api.created_at ?? '',
  };
}

export function mapExchangeItems(apiExchanges: APIExchangeItemDTO[]): InterviewExchange[] {
  return apiExchanges.map(mapExchangeItem);
}

// ---- Practice ----

export interface PracticeSkillUI {
  id: string;
  name: string;
  icon: string;
  questionCount: number;
  completedCount: number;
  color: string;
}

export interface PracticeQuestionUI {
  id: string;
  skill: string;
  question: string;
  questionType: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number;
  completed: boolean;
}

const SKILL_ICON_MAP: Record<string, string> = {
  arrays: '📊',
  trees: '🌳',
  dp: '🧩',
  'system-design': '🏗️',
  'api-design': '🔗',
  behavioral: '🗣️',
  sql: '🗄️',
  oop: '⚙️',
};

const SKILL_COLOR_MAP: Record<string, string> = {
  arrays: 'bg-chart-1/10 text-chart-1',
  trees: 'bg-chart-2/10 text-chart-2',
  dp: 'bg-chart-3/10 text-chart-3',
  'system-design': 'bg-chart-4/10 text-chart-4',
  'api-design': 'bg-chart-5/10 text-chart-5',
  behavioral: 'bg-chart-1/10 text-chart-1',
  sql: 'bg-chart-2/10 text-chart-2',
  oop: 'bg-chart-3/10 text-chart-3',
};

export function mapPracticeSkill(api: APIPracticeSkillDTO): PracticeSkillUI {
  return {
    id: api.id,
    name: api.name,
    icon: SKILL_ICON_MAP[api.id] ?? '📝',
    questionCount: api.question_count,
    completedCount: api.completed_count,
    color: SKILL_COLOR_MAP[api.id] ?? 'bg-chart-1/10 text-chart-1',
  };
}

export function mapPracticeQuestion(api: APIPracticeQuestionDTO): PracticeQuestionUI {
  return {
    id: String(api.id),
    skill: api.skill,
    question: api.title,
    questionType: api.type,
    difficulty: api.difficulty as 'easy' | 'medium' | 'hard',
    estimatedTime: 15,
    completed: api.completed,
  };
}
