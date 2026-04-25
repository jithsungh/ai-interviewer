import { useEffect, useState } from 'react';
import { CandidateHeader } from '../../components/layout/CandidateHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Play,
  Target,
  Trophy,
  Clock,
  Plus,
  Calendar,
  TrendingUp,
  ArrowRight,
  Repeat,
  Building2,
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  getCandidateStats,
  getCandidateWindows,
  getCandidateSubmissions,
  getCurrentUser,
  type CandidatePerformanceStatsUI,
} from '@/services/candidateService';
import type { InterviewSubmissionWindow, InterviewSubmission, User } from '@/types/database';
import { format, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

type DashboardUser = User & {
  isReturning?: boolean;
  role?: string;
  industry?: string;
  level?: string;
  dept?: string;
  progress?: number;
};

const SERVICES = [
  {
    id: 'roadmap',
    icon: 'route',
    title: 'Career Path Roadmap',
    desc: 'AI-generated step-by-step roadmap from your current level to your target role — with skill milestones tailored to your industry.',
    action: 'Continue with your Roadmap',
    color: '#002E5D',
    bg: 'rgba(0,46,93,0.06)',
    tag: 'Personalized',
    metrics: ['12 Milestones', 'FinTech Track', 'AI-Powered'],
  },
  {
    id: 'prep',
    icon: 'style',
    title: 'Interview Prep',
    desc: 'Backend-powered flashcards built from real database questions, with AI refinement and saved progress.',
    action: 'Open Study Studio',
    color: '#0F172A',
    bg: 'rgba(15,23,42,0.06)',
    tag: 'DB-Backed',
    metrics: ['Real Questions', 'Resume Progress', 'AI-Enhanced'],
  },
  {
    id: 'mock',
    icon: 'smart_toy',
    title: 'AI Mock Interview',
    desc: 'Simulate real interviews with an AI hiring manager who evaluates tone, confidence, body language and depth in real time.',
    action: 'Launch Mock Interview',
    color: '#6b21a8',
    bg: 'rgba(107,33,168,0.06)',
    tag: 'Live Analysis',
    metrics: ['Real-time Feedback', 'Body Language', 'Tone Analysis'],
  },
];

function NewUserBanner({ user }: { user: DashboardUser }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setVisible(true), 100);
    return () => window.clearTimeout(t);
  }, []);

  const firstName = user.name?.split(' ')[0] ?? 'there';

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)',
        borderRadius: 28,
        padding: '48px 52px',
        marginBottom: 44,
        position: 'relative',
        overflow: 'hidden',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: 'all 0.65s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          right: 40,
          top: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          opacity: 0.12,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 210, color: '#fff' }}>
          waving_hand
        </span>
      </div>
      <div
        style={{
          position: 'absolute',
          top: '-30%',
          right: '20%',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(233,195,73,0.15), transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <span
          style={{
            color: 'var(--secondary)',
            fontWeight: 900,
            fontSize: '0.65rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: 18,
          }}
        >
          ✦ First Time Here
        </span>
        <h2
          className="font-headline"
          style={{ color: '#fff', fontSize: '2.8rem', fontWeight: 700, marginBottom: 14, fontStyle: 'italic' }}
        >
          Welcome, {firstName}! 👋
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 580, lineHeight: 1.8, fontSize: '1.05rem', marginBottom: 32 }}>
          You're joining 2,400+ SRM AP students building elite careers. Start by exploring our three AI-powered services below — each one designed to accelerate your journey from campus to dream role.
        </p>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '8px 20px',
              background: 'rgba(233,195,73,0.2)',
              borderRadius: 100,
              color: 'var(--secondary)',
              fontSize: '0.82rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              flag
            </span>
            Set Your Career Goal First
          </div>
          <div
            style={{
              padding: '8px 20px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 100,
              color: 'rgba(255,255,255,0.7)',
              fontSize: '0.82rem',
              fontWeight: 700,
            }}
          >
            Takes only 2 mins
          </div>
        </div>
      </div>
    </div>
  );
}

function ReturningUserBanner({ user }: { user: DashboardUser }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setVisible(true), 100);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #001428 0%, #003060 100%)',
        borderRadius: 28,
        padding: '36px 52px',
        marginBottom: 44,
        position: 'relative',
        overflow: 'hidden',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: 'all 0.65s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 260, overflow: 'hidden', opacity: 0.18 }}>
        <img src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80&auto=format&fit=crop" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 340, background: 'linear-gradient(to right, #003060 20%, transparent)' }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: '50%',
                background: 'var(--secondary)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: 24,
              }}
            >
              {user.name.charAt(0)}
            </div>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Welcome back
              </div>
              <div className="font-headline" style={{ color: '#fff', fontSize: '1.7rem', fontWeight: 700, fontStyle: 'italic' }}>
                {user.name}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Role', val: user.role || 'Software Engineer' },
              { label: 'Industry', val: user.industry || 'FinTech' },
              { label: 'Level', val: user.level || 'Entry Level' },
              { label: 'Dept', val: user.dept || 'CS' },
            ].map((item) => (
              <div key={item.label} style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.09)', borderRadius: 100 }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.73rem' }}>{item.label}: </span>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.73rem' }}>{item.val}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
            Your Progress
          </div>
          <div className="font-headline" style={{ color: 'var(--secondary)', fontSize: '3rem', fontWeight: 700, lineHeight: 1 }}>
            {user.progress || 72}%
          </div>
          <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.75rem', marginTop: 4 }}>Roadmap Complete</div>
          <div style={{ marginTop: 12, width: 140, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 100, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${user.progress || 72}%`, background: 'var(--secondary)', borderRadius: 100 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PackageBar() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 32 }}>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 2, height: 28 }}>
        {[28, 22, 16, 10].map((h, i) => (
          <div key={i} style={{ width: 6, height: h, background: i < 2 ? '#09111F' : '#E2E8F0', borderRadius: 2 }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 2, height: 28 }}>
        {[32, 24, 18, 12].map((h, i) => (
          <div key={i} style={{ width: 6, height: h, background: i < 3 ? '#09111F' : '#E2E8F0', borderRadius: 2 }} />
        ))}
      </div>
    </div>
  );
}

const CandidateDashboard = () => {
  const [stats, setStats] = useState<CandidatePerformanceStatsUI | null>(null);
  const [windows, setWindows] = useState<InterviewSubmissionWindow[]>([]);
  const [submissions, setSubmissions] = useState<InterviewSubmission[]>([]);
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const results = await Promise.allSettled([
        getCandidateStats(),
        getCandidateWindows(),
        getCandidateSubmissions(),
        getCurrentUser(),
      ]);
      if (results[0].status === 'fulfilled') setStats(results[0].value);
      if (results[1].status === 'fulfilled') setWindows(results[1].value.data);
      if (results[2].status === 'fulfilled') setSubmissions(results[2].value.data);
      if (results[3].status === 'fulfilled') setUser(results[3].value as DashboardUser);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <CandidateHeader />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const upcomingWindows = windows.filter((w) => isAfter(new Date(w.end_time), new Date()));
  const s = stats ?? {
    totalInterviews: 3,
    averageScore: 83,
    passRate: 67,
    totalPracticeTime: '18h 30m',
    strongAreas: ['coding_round', 'problem_solving', 'behavioral'],
    improvementAreas: ['resume_analysis', 'self_introduction', 'system_design'],
    scoreHistory: [
      { date: '2025-10', score: 68 },
      { date: '2025-11', score: 74 },
      { date: '2025-12', score: 91 },
      { date: '2026-01', score: 72 },
      { date: '2026-02', score: 85 },
    ],
    skillBreakdown: [
      { skill: 'behavioral', score: 81 },
      { skill: 'coding_round', score: 89 },
      { skill: 'resume_analysis', score: 74 },
      { skill: 'self_introduction', score: 76 },
      { skill: 'problem_solving', score: 84 },
      { skill: 'system_design', score: 79 },
    ],
  };

  const isNew = !(user as DashboardUser | null)?.isReturning;

  const quickStats = [
    { icon: 'school', label: 'Campus Rank', val: '#24', color: 'var(--primary-container)' },
    { icon: 'emoji_events', label: 'Achievements', val: '7', color: '#d97706' },
    { icon: 'calendar_today', label: 'Days Active', val: '42', color: '#059669' },
    { icon: 'star', label: 'Prep Score', val: '88%', color: '#7c3aed' },
  ];

  return (
    <div className="new-frontend-theme candidate-dashboard-page min-h-screen bg-[#f9fafb]">
      <CandidateHeader />
      <main className="dashboard-main" style={{ maxWidth: 1280, margin: '0 auto', padding: '104px 32px 72px' }}>
        {user && (isNew ? <NewUserBanner user={user} /> : <ReturningUserBanner user={user} />)}

        <div className="dash-service-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
          <div>
            <span style={{ color: 'var(--primary-container)', fontWeight: 900, fontSize: '0.65rem', letterSpacing: '0.22em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Our Platform
            </span>
            <h2 className="font-headline" style={{ fontSize: '2.6rem', color: 'var(--primary)', fontWeight: 700 }}>
              Choose Your <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>Service</span>
            </h2>
          </div>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>3 services available</span>
        </div>

        <div className="dash-services-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28, marginBottom: 72 }}>
          {SERVICES.map((service, i) => (
            <div
              key={service.id}
              className={`dash-service-card fade-in-up fade-in-up-delay-${i + 1}`}
              style={{
                background: '#fff',
                borderRadius: 28,
                padding: 34,
                border: `2px solid ${hoveredCard === i ? service.color : 'transparent'}`,
                boxShadow: hoveredCard === i ? '0 24px 60px rgba(0,0,0,0.1)' : '0 4px 24px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                transition: 'all 0.32s cubic-bezier(0.22,1,0.36,1)',
                transform: hoveredCard === i ? 'translateY(-8px)' : 'none',
                display: 'flex',
                flexDirection: 'column',
              }}
              onMouseEnter={() => setHoveredCard(i)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div
                  style={{
                    width: 62,
                    height: 62,
                    borderRadius: 18,
                    background: hoveredCard === i ? `${service.color}12` : service.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ color: service.color, fontSize: 30, fontVariationSettings: "'FILL' 1" }}>
                    {service.icon}
                  </span>
                </div>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: 100,
                    fontSize: '0.62rem',
                    fontWeight: 900,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    background: service.bg,
                    color: service.color,
                  }}
                >
                  {service.tag}
                </span>
              </div>

              <h3 className="font-headline" style={{ fontSize: '1.45rem', color: 'var(--primary)', fontWeight: 700, marginBottom: 12, lineHeight: 1.3 }}>
                {service.title}
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.75, flex: 1, marginBottom: 24 }}>{service.desc}</p>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
                {service.metrics.map((m) => (
                  <span
                    key={m}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 100,
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      background: 'var(--surface-container)',
                      color: '#475569',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {m}
                  </span>
                ))}
              </div>

              <Button asChild className="w-full justify-center dash-service-btn" style={{ background: hoveredCard === i ? service.color : 'var(--primary-container)' }}>
                <Link to={service.id === 'mock' ? '/interview/lobby' : `/candidate/${service.id}`}>
                  {service.action}
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    arrow_forward
                  </span>
                </Link>
              </Button>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 32 }}>
          <h3 className="font-headline" style={{ fontSize: '1.4rem', color: 'var(--primary)', fontWeight: 700, marginBottom: 20 }}>
            Your Activity
          </h3>
          <div className="dash-quickstats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {quickStats.map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '22px 26px' }}>
                  <div style={{ width: 46, height: 46, borderRadius: 14, background: `${stat.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ color: stat.color, fontSize: 24, fontVariationSettings: "'FILL' 1" }}>
                      {stat.icon}
                    </span>
                  </div>
                  <div>
                    <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{stat.label}</div>
                    <div className="font-headline" style={{ color: 'var(--primary)', fontSize: '1.7rem', fontWeight: 700 }}>{stat.val}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Score Trend</CardTitle>
                <Badge variant="outline" className="gap-1">
                  <TrendingUp className="h-3 w-3" />+17% improvement
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={s.scoreHistory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis domain={[50, 100]} className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Skill Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={s.skillBreakdown}>
                  <PolarGrid className="stroke-border" />
                  <PolarAngleAxis dataKey="skill" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Upcoming Interviews</CardTitle>
                <Link to="/candidate/interviews">
                  <Button variant="ghost" size="sm" className="gap-1">
                    View All <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingWindows.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No upcoming interviews</p>
                </div>
              ) : (
                upcomingWindows.map((window) => (
                  <Link key={window.id} to={`/candidate/interviews/${window.id}`}>
                    <div className="p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-sm">{window.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {window.scope}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Building2 className="h-3 w-3" />
                        <span>{window.organization?.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(window.start_time), 'MMM d')} - {format(new Date(window.end_time), 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {window.role_templates?.[0]?.template?.total_estimated_time_minutes}m
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Recent Submissions</CardTitle>
                <Link to="/candidate/interviews?tab=past">
                  <Button variant="ghost" size="sm" className="gap-1">
                    View All <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {submissions.slice(0, 3).map((sub) => (
                <Link key={sub.id} to={`/candidate/reports/${sub.id}`}>
                  <div className="p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-sm">{sub.role?.name}</h3>
                        <p className="text-xs text-muted-foreground">{sub.window?.organization?.name}</p>
                      </div>
                      <div
                        className={cn(
                          'text-lg font-bold',
                          (sub.final_score || 0) >= 80
                            ? 'text-success'
                            : (sub.final_score || 0) >= 60
                              ? 'text-warning'
                              : 'text-destructive'
                        )}
                      >
                        {sub.final_score}%
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={
                          sub.result?.result_status === 'pass'
                            ? 'default'
                            : sub.result?.result_status === 'borderline'
                              ? 'secondary'
                              : 'destructive'
                        }
                        className="text-xs"
                      >
                        {sub.result?.result_status || sub.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {sub.submitted_at ? format(new Date(sub.submitted_at), 'MMM d, yyyy') : '—'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CandidateDashboard;
