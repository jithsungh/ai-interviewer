import { useState, useEffect, useCallback } from 'react';
import { CandidateHeader } from '@/components/layout/CandidateHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Download, Share2, CheckCircle2, XCircle, TrendingUp,
  MessageSquare, Code2, Target, Clock, Shield, Loader2,
  Sparkles, Award, AlertTriangle, ChevronRight, BarChart3, Brain
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import {
  getCandidateSubmissions,
  getSubmissionExchanges,
  getSubmissionResults,
  generateReport,
  getExchangeEvaluations,
  type ExchangeEvaluationData,
} from '@/services/candidateService';
import type { InterviewSubmission, InterviewExchange, InterviewResult } from '@/types/database';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// ── Types for enriched exchange with evaluation ──
interface EnrichedExchange extends InterviewExchange {
  evaluation?: {
    evaluation_id: number;
    total_score: number;
    dimension_scores: Array<{
      rubric_dimension_id: number;
      dimension_name: string;
      score: number;
      max_score?: number | null;
      weight?: number | null;
      justification?: string | null;
    }>;
    evaluator_type: string;
    is_final: boolean;
  };
  section_name?: string;
}

// ── Helpers ──
function getScoreColor(score: number, max = 100) {
  const pct = (score / max) * 100;
  if (pct >= 80) return 'text-emerald-500';
  if (pct >= 60) return 'text-amber-500';
  return 'text-red-500';
}

function getScoreBg(score: number, max = 100) {
  const pct = (score / max) * 100;
  if (pct >= 80) return 'bg-emerald-500/10';
  if (pct >= 60) return 'bg-amber-500/10';
  return 'bg-red-500/10';
}

function getStatusBadgeClass(status?: string) {
  switch (status) {
    case 'pass': return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20';
    case 'borderline': return 'bg-amber-500/15 text-amber-600 border-amber-500/20';
    case 'fail': return 'bg-red-500/15 text-red-600 border-red-500/20';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getRecommendationLabel(rec?: string) {
  switch (rec) {
    case 'strong_hire': return '🌟 Strong Hire';
    case 'hire': return '✅ Hire';
    case 'review': return '🔍 Needs Review';
    case 'no_hire': return '❌ No Hire';
    default: return rec?.replace('_', ' ') ?? '—';
  }
}

function parseStrengths(raw?: string): string[] {
  if (!raw) return [];
  // Try JSON array first
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* not JSON */ }
  // Fall back to splitting by newlines or bullet points
  return raw.split(/[\n•\-]/).map(s => s.trim()).filter(Boolean);
}

const SubmissionReport = () => {
  const { id } = useParams();
  const submissionId = Number(id);
  const [submission, setSubmission] = useState<InterviewSubmission | null>(null);
  const [exchanges, setExchanges] = useState<EnrichedExchange[]>([]);
  const [result, setResult] = useState<InterviewResult | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('');

  const loadReport = useCallback(async () => {
    try {
      const [subsData, exData] = await Promise.all([
        getCandidateSubmissions(),
        getSubmissionExchanges(submissionId),
      ]);
      const found = subsData.data.find(s => s.id === submissionId);
      setSubmission(found ?? subsData.data[0] ?? null);

      // Enrich exchanges with evaluation data
      const enriched: EnrichedExchange[] = await Promise.all(
        exData.map(async (ex: InterviewExchange) => {
          try {
            const evalData: ExchangeEvaluationData = await getExchangeEvaluations(ex.id);
            const finalEval = evalData.evaluations?.find(e => e.is_final) ?? evalData.evaluations?.[0];
            return {
              ...ex,
              section_name: (ex as any).section_name ?? (ex.content_metadata as any)?.section_name,
              evaluation: finalEval ? {
                evaluation_id: finalEval.evaluation_id,
                total_score: finalEval.total_score ?? 0,
                dimension_scores: finalEval.dimension_scores ?? [],
                evaluator_type: finalEval.evaluator_type,
                is_final: finalEval.is_final,
              } : undefined,
            };
          } catch {
            return {
              ...ex,
              section_name: (ex as any).section_name ?? (ex.content_metadata as any)?.section_name
            };
          }
        }),
      );
      setExchanges(enriched);
      if (enriched.length > 0) setActiveTab(String(enriched[0].id));

      // Always trigger report generation endpoint on page open.
      // Backend will return existing result if already generated (force_regenerate=false).
      setReportGenerating(true);
      try {
        const genResult = await generateReport(submissionId, false);
        setResult(genResult);
      } catch (err) {
        console.error('Report generation failed', err);
        try {
          const existingResult = await getSubmissionResults(submissionId);
          setResult(existingResult);
        } catch (fallbackErr) {
          console.error('Failed to fetch existing report result', fallbackErr);
        }
      } finally {
        setReportGenerating(false);
      }
    } catch (err) {
      console.error('Failed to load submission report', err);
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  if (loading || !submission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
        <CandidateHeader />
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading your interview report...</p>
        </div>
      </div>
    );
  }

  const strengths = parseStrengths(result?.strengths);
  const weaknesses = parseStrengths(result?.weaknesses);
  const sectionScores = result?.section_scores ?? {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <CandidateHeader />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <Link to="/candidate/interviews?tab=past">
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/5">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">Interview Report</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {submission.role?.name} • {submission.window?.organization?.name}
              {submission.submitted_at && ` • ${format(new Date(submission.submitted_at), 'MMMM d, yyyy')}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2 rounded-lg">
              <Share2 className="h-4 w-4" />Share
            </Button>
            <Button variant="outline" size="sm" className="gap-2 rounded-lg">
              <Download className="h-4 w-4" />Export PDF
            </Button>
          </div>
        </motion.div>

        {/* ── Report generating indicator ── */}
        {reportGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3"
          >
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <div>
              <p className="font-medium text-sm">AI is analyzing your interview...</p>
              <p className="text-xs text-muted-foreground">This may take a minute. Evaluating each response.</p>
            </div>
          </motion.div>
        )}

        {/* ── Overview Section ── */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid md:grid-cols-12 gap-5 mb-8"
          >
            {/* Score Card */}
            <Card className="md:col-span-3 overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
              <CardContent className="p-6 flex flex-col items-center justify-center h-full">
                <div className="relative mb-3">
                  <svg className="w-28 h-28" viewBox="0 0 36 36">
                    <path
                      className="text-muted/20"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className={getScoreColor(result.normalized_score)}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray={`${result.normalized_score}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={cn('text-3xl font-bold', getScoreColor(result.normalized_score))}>
                      {result.normalized_score}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Score</span>
                  </div>
                </div>
                <Badge className={cn('text-xs px-3 py-1 font-medium rounded-full', getStatusBadgeClass(result.result_status))}>
                  {result.result_status?.toUpperCase()}
                </Badge>
                {result.recommendation && (
                  <p className="mt-2 text-xs font-medium text-muted-foreground">
                    {getRecommendationLabel(result.recommendation)}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Section Scores + Strengths/Weaknesses */}
            <Card className="md:col-span-9 border-0 shadow-lg">
              <CardContent className="p-6">
                {/* Section Scores */}
                {Object.keys(sectionScores).length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />Section Performance
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {Object.entries(sectionScores).map(([section, score]) => (
                        <div
                          key={section}
                          className={cn(
                            'p-4 rounded-xl text-center transition-all hover:scale-[1.02]',
                            getScoreBg(score as number, 10),
                          )}
                        >
                          <div className={cn('text-2xl font-bold', getScoreColor(score as number, 10))}>
                            {score}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 capitalize font-medium">
                            {section.replace(/_/g, ' ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strengths and Weaknesses */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                      Strengths
                    </h4>
                    {strengths.length > 0 ? (
                      <ul className="space-y-2">
                        {strengths.map((s, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">{result.strengths || 'No strengths data available yet.'}</p>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
                      </div>
                      Areas to Improve
                    </h4>
                    {weaknesses.length > 0 ? (
                      <ul className="space-y-2">
                        {weaknesses.map((w, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                            {w}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">{result.weaknesses || 'No improvement areas data available yet.'}</p>
                    )}
                  </div>
                </div>

                {/* Summary Notes */}
                {result.summary_notes && (
                  <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-border/30">
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-primary" />AI Summary
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{result.summary_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Question-by-Question Review ── */}
        {exchanges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="mb-8 border-0 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-muted/30 to-transparent border-b border-border/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Question-by-Question Review</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Detailed analysis of each interview question and your response
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-6 flex-wrap h-auto gap-1.5 bg-muted/30 p-1 rounded-xl">
                    {exchanges.map((ex, i) => {
                      const score = ex.evaluation?.total_score;
                      return (
                        <TabsTrigger
                          key={ex.id}
                          value={String(ex.id)}
                          className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4"
                        >
                          <span className="font-semibold">Q{i + 1}</span>
                          {score != null && (
                            <span className={cn(
                              'w-2.5 h-2.5 rounded-full',
                              score >= 80 ? 'bg-emerald-500' :
                              score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                            )} />
                          )}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  {exchanges.map((ex, i) => (
                    <TabsContent key={ex.id} value={String(ex.id)}>
                      <div className="space-y-5">
                        {/* Question Card */}
                        <div className="p-5 rounded-xl bg-gradient-to-br from-muted/40 to-muted/20 border border-border/30">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="outline" className="text-xs capitalize rounded-md font-medium">
                              {ex.difficulty_at_time}
                            </Badge>
                            {ex.section_name && (
                              <Badge className="text-xs bg-primary/10 text-primary rounded-md">
                                {ex.section_name.replace(/_/g, ' ')}
                              </Badge>
                            )}
                            {ex.coding_problem_id && (
                              <Badge className="text-xs bg-chart-5/10 text-chart-5 rounded-md">
                                <Code2 className="h-3 w-3 mr-1" />Coding
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium leading-relaxed">{ex.question_text}</p>
                        </div>

                        {/* Response Card */}
                        <div className="p-5 rounded-xl border border-border/40 bg-card">
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-primary" />Your Response
                          </h4>
                          {ex.response_text && (
                            <p className="text-sm text-muted-foreground leading-relaxed">{ex.response_text}</p>
                          )}
                          {ex.response_code && (
                            <pre className="mt-3 p-4 rounded-lg bg-[#1e1e2e] text-[#cdd6f4] text-xs font-mono overflow-x-auto border border-border/20">
                              {ex.response_code}
                            </pre>
                          )}
                          {!ex.response_text && !ex.response_code && (
                            <p className="text-sm text-muted-foreground italic">No response recorded</p>
                          )}
                          {ex.response_time_ms && (
                            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              Response time: {Math.round(ex.response_time_ms / 1000)}s
                            </p>
                          )}
                        </div>

                        {/* Evaluation Card */}
                        {ex.evaluation && (
                          <div className="p-5 rounded-xl border border-border/40 bg-card">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-sm font-semibold flex items-center gap-2">
                                <Award className="h-4 w-4 text-primary" />AI Evaluation
                              </h4>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  'text-2xl font-bold',
                                  getScoreColor(ex.evaluation.total_score)
                                )}>
                                  {Math.round(ex.evaluation.total_score)}%
                                </span>
                              </div>
                            </div>

                            {/* Dimension Scores Grid */}
                            {ex.evaluation.dimension_scores?.length > 0 && (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {ex.evaluation.dimension_scores.map((ds) => {
                                  const maxScore = ds.max_score ?? 10;
                                  const pct = maxScore > 0 ? (ds.score / maxScore) * 100 : 0;
                                  return (
                                    <div
                                      key={ds.rubric_dimension_id}
                                      className="p-3.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group"
                                    >
                                      <p className="text-xs text-muted-foreground capitalize font-medium mb-1">
                                        {ds.dimension_name?.replace(/_/g, ' ')}
                                      </p>
                                      <div className="flex items-baseline gap-1">
                                        <span className={cn('text-lg font-bold', getScoreColor(pct))}>
                                          {ds.score}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          /{maxScore}
                                        </span>
                                      </div>
                                      <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                                        <div
                                          className={cn(
                                            'h-full rounded-full transition-all',
                                            pct >= 80 ? 'bg-emerald-500' :
                                            pct >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                          )}
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                      {ds.justification && (
                                        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">
                                          {ds.justification}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* AI Follow-up */}
                        {ex.ai_followup_message && (
                          <div className="p-4 rounded-xl bg-primary/5 border border-primary/15">
                            <h4 className="text-xs font-semibold text-primary mb-1.5 flex items-center gap-1.5">
                              <Sparkles className="h-3.5 w-3.5" />AI Follow-up
                            </h4>
                            <p className="text-sm text-muted-foreground">{ex.ai_followup_message}</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Review Status ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardContent className="p-8 text-center">
              <Badge className={cn(
                'text-sm px-5 py-1.5 rounded-full font-medium',
                submission.status === 'reviewed' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                submission.status === 'completed' ? 'bg-primary/10 text-primary border-primary/20' :
                'bg-amber-500/10 text-amber-600 border-amber-500/20'
              )}>
                {submission.status === 'reviewed' ? '✅ Review Complete' :
                 submission.status === 'completed' ? '⏳ AI Evaluated' :
                 '📝 ' + submission.status}
              </Badge>
              <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">
                {submission.status === 'reviewed'
                  ? 'Your interview has been fully evaluated. The scores above are final.'
                  : result
                    ? 'AI evaluation is complete. An admin may review and finalize the scores.'
                    : 'Your submission is being processed. Report will be available shortly.'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default SubmissionReport;
