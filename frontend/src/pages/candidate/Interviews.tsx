import { useState, useEffect } from 'react';
import { CandidateHeader } from '@/components/layout/CandidateHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Clock,
  Building2,
  ArrowRight,
  Play,
  Archive,
  Info,
  ChevronRight,
  Loader2,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { getCandidateWindows, getCandidateSubmissions } from '@/services/candidateService';
import type { InterviewSubmissionWindow, InterviewSubmission } from '@/types/database';
import { format, isAfter, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';

const Interviews = () => {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'upcoming';
  const [windows, setWindows] = useState<InterviewSubmissionWindow[]>([]);
  const [submissions, setSubmissions] = useState<InterviewSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [w, s] = await Promise.all([getCandidateWindows(), getCandidateSubmissions()]);
        setWindows(w.data);
        setSubmissions(s.data);
      } catch (err) {
        console.error('Failed to load interviews', err);
      } finally {
        setLoading(false);
      }
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

  const upcomingWindows = windows.filter(w => isAfter(new Date(w.end_time), new Date()));
  const closedWindows = windows.filter(w => isBefore(new Date(w.end_time), new Date()));
  const pastSubmissions = submissions;
  const averageScore =
    pastSubmissions.length > 0
      ? Math.round(
          pastSubmissions.reduce((sum, row) => sum + (row.final_score ?? 0), 0) /
            Math.max(pastSubmissions.length, 1),
        )
      : 0;

  return (
    <div className="new-frontend-theme min-h-screen bg-background">
      <CandidateHeader />
      <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-8 md:px-8">
        <section className="mb-8 space-y-3">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Interview Hub</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Interviews & Sessions</h1>
          <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
            Manage active interview windows, launch practice sessions, and review submitted attempts in one place.
          </p>
        </section>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Upcoming Windows</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{upcomingWindows.length}</p>
              </div>
              <Calendar className="h-5 w-5 text-primary" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Closed Windows</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{closedWindows.length}</p>
              </div>
              <Archive className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Submissions</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{pastSubmissions.length}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Avg Score</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{averageScore}%</p>
              </div>
              <FileText className="h-5 w-5 text-blue-600" />
            </CardContent>
          </Card>
        </section>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link to="/interview/lobby">
                <div className="rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Play className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Start Mock Interview</p>
                    <p className="mt-1 text-xs text-muted-foreground">Launch the live interview lobby and begin a new session.</p>
                  </div>
                </div>
              </Link>
              <Link to="/candidate/reports">
                <div className="rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-blue-500/10 text-blue-700">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">View Reports</p>
                    <p className="mt-1 text-xs text-muted-foreground">Review previous submissions and performance breakdown.</p>
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList className="grid h-auto w-full max-w-md grid-cols-2 gap-2 rounded-lg border bg-muted/40 p-1">
            <TabsTrigger value="upcoming" className="gap-2 rounded-md py-2 text-sm">
              <Calendar className="h-4 w-4" />Upcoming
              {upcomingWindows.length > 0 && (
                <Badge className="ml-1 rounded-full bg-primary text-primary-foreground">
                  {upcomingWindows.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-2 rounded-md py-2 text-sm">
              <Archive className="h-4 w-4" />Past Submissions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {upcomingWindows.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-medium text-lg mb-1">No upcoming interviews</h3>
                  <p className="text-sm">Check back later or contact your admin for scheduling.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {upcomingWindows.map((window) => (
                  <Card key={window.id} className="transition-shadow hover:shadow-md">
                    <CardContent className="p-5 md:p-6">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-foreground">{window.name}</h3>
                            <Badge variant="outline" className="capitalize">{window.scope}</Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <Building2 className="h-4 w-4" />
                              {window.organization?.name}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(window.start_time), 'MMM d')} - {format(new Date(window.end_time), 'MMM d, yyyy')}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="h-4 w-4" />
                              {window.role_templates?.[0]?.template?.total_estimated_time_minutes || 60} min
                            </span>
                          </div>

                          {window.role_templates && window.role_templates.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {window.role_templates.map((roleTemplate) => (
                                <Badge key={roleTemplate.id} variant="secondary" className="text-xs">
                                  {roleTemplate.role?.name}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Info className="h-3.5 w-3.5" />
                            Max submissions: {window.max_allowed_submissions} ·
                            {window.allow_resubmission ? ' Resubmission allowed' : ' No resubmission'}
                          </p>
                        </div>

                        <Link to={`/candidate/interviews/${window.id}`} className="md:self-start">
                          <Button className="gap-2">
                            View Details <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past">
            {pastSubmissions.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground">
                  <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-medium text-lg mb-1">No past submissions</h3>
                  <p className="text-sm">Complete an interview to see your results here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {pastSubmissions.map((sub) => (
                  <Link key={sub.id} to={`/candidate/reports/${sub.id}`}>
                    <Card className="cursor-pointer transition-shadow hover:shadow-md">
                      <CardContent className="p-4 md:p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3 md:gap-4">
                            <div
                              className={cn(
                                'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
                                (sub.final_score || 0) >= 80
                                  ? 'bg-emerald-500/15 text-emerald-700'
                                  : (sub.final_score || 0) >= 60
                                    ? 'bg-amber-500/15 text-amber-700'
                                    : 'bg-destructive/15 text-destructive',
                              )}
                            >
                              {sub.final_score ?? '—'}
                            </div>

                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-semibold text-foreground md:text-base">{sub.role?.name}</h3>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground md:text-sm">
                                {sub.window?.organization?.name} ·{' '}
                                {sub.submitted_at ? format(new Date(sub.submitted_at), 'MMM d, yyyy') : '—'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 md:gap-3">
                            <Badge
                              variant={
                                sub.result?.result_status === 'pass'
                                  ? 'default'
                                  : sub.result?.result_status === 'borderline'
                                    ? 'secondary'
                                    : sub.status === 'completed'
                                      ? 'outline'
                                      : 'destructive'
                              }
                              className="capitalize"
                            >
                              {sub.result?.result_status || sub.status}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Interviews;
