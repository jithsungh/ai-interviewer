import { useState, useEffect } from 'react';
import { CandidateHeader } from '@/components/layout/CandidateHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateReport, getCandidateResumes, getExchangeEvaluations, getSubmissionExchanges, getSubmissionResults } from '@/services/candidateService';
import type { InterviewExchange, InterviewResult } from '@/types/database';
import type { APIResumeDTO } from '@/types/api';
import { 
  Download, 
  Share2, 
  Clock,
  Target,
  ArrowLeft,
  Loader2,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const parseInsightList = (raw?: string): string[] => {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    // fallback parsing below
  }

  return raw
    .split(/\n|•|\-/)
    .map((item) => item.trim().replace(/^"|"$/g, ''))
    .filter(Boolean);
};

const toPercentScore = (value: number): number => {
  if (value <= 10) return Number((value * 10).toFixed(1));
  return Number(value.toFixed(1));
};

const InterviewReport = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const submissionId = Number(id);
  const [exchanges, setExchanges] = useState<InterviewExchange[]>([]);
  const [result, setResult] = useState<InterviewResult | undefined>(undefined);
  const [latestResume, setLatestResume] = useState<APIResumeDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        
        // Fetch exchanges + latest resume context (used for this specific report screen)
        const [rawExchanges, resumeRows] = await Promise.all([
          getSubmissionExchanges(submissionId),
          getCandidateResumes(),
        ]);
        setLatestResume(resumeRows[0] ?? null);

        // Trigger report generation first (idempotent).
        // If report already exists, backend returns it immediately.
        // If not, backend generates and persists it.
        let resData: InterviewResult | undefined = undefined;
        try {
          resData = await generateReport(submissionId, false);
        } catch (err) {
          console.debug('Generate report trigger failed for submission', submissionId, err);
        }

        // Then fetch current result status/result state.
        // This keeps compatibility with existing report retrieval flow.
        if (!resData) {
          try {
            resData = await getSubmissionResults(submissionId);
          } catch (err) {
            console.debug('Evaluation results not ready yet for submission', submissionId);
          }
        }

        // Final fallback: try generate endpoint once more to handle
        // rare race conditions where first call succeeded server-side
        // but current result wasn't visible yet.
        if (!resData) {
          try {
            resData = await generateReport(submissionId, false);
          } catch (err) {
            console.debug('Report still generating for submission', submissionId);
          }
        }

        const enrichedExchanges = await Promise.all(
          rawExchanges.map(async (exchange) => {
            if (exchange.evaluation?.total_score != null) return exchange;

            try {
              const evalData = await getExchangeEvaluations(exchange.id);
              const finalEvaluation =
                evalData.evaluations.find((evaluation) => evaluation.is_final) ?? evalData.evaluations[0];

              if (!finalEvaluation) return exchange;

              return {
                ...exchange,
                evaluation: {
                  ...exchange.evaluation,
                  id: finalEvaluation.evaluation_id,
                  interview_exchange_id: finalEvaluation.interview_exchange_id,
                  evaluator_type: finalEvaluation.evaluator_type as any,
                  total_score: finalEvaluation.total_score ?? 0,
                  is_final: finalEvaluation.is_final,
                  evaluated_at: exchange.evaluation?.evaluated_at ?? exchange.created_at,
                  created_at: exchange.evaluation?.created_at ?? exchange.created_at,
                  dimension_scores: finalEvaluation.dimension_scores.map((dimension, index) => ({
                    id: index + 1,
                    evaluation_id: finalEvaluation.evaluation_id,
                    rubric_dimension_id: dimension.rubric_dimension_id,
                    score: dimension.score,
                    justification: dimension.justification ?? undefined,
                    dimension_name: dimension.dimension_name,
                    created_at: exchange.created_at,
                  })),
                },
              };
            } catch {
              return exchange;
            }
          }),
        );

        setExchanges(enrichedExchanges);
        setResult(resData);
      } catch (err) {
        console.error('Failed to load report', err);
        setError('Failed to load interview report. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [submissionId]);

  // Poll for result every 3 seconds when generating.
  // Sequence inside poll:
  //   1) Trigger generate-report (idempotent)
  //   2) Fetch /results/{submission_id} status/result
  useEffect(() => {
    if (!exchanges.length || result) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        await generateReport(submissionId, false);
      } catch {
        // Ignore and still try status fetch below.
      }

      try {
        const resData = await getSubmissionResults(submissionId);
        if (resData) {
          setResult(resData);
          console.log('Evaluation result ready!');
        }
        } catch (err) {
        // Still generating, keep polling
        console.debug('Still waiting for evaluation result...');
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [exchanges.length, result, submissionId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAFAFA' }}>
        <CandidateHeader />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#09111F' }} />
          <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>Loading interview report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAFAFA' }}>
        <CandidateHeader />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <div style={{ color: '#DC2626', fontSize: '1rem', fontWeight: 600 }}>⚠️ {error}</div>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  // Show "generating" state if exchanges but no evaluation yet
  if (exchanges.length > 0 && !result) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAFAFA' }}>
        <CandidateHeader />
        <main style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 32px 72px' }}>
          <div style={{ maxWidth: 1120, margin: '0 auto' }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/candidate/reports')}
              style={{ borderRadius: 12, background: '#fff', border: '1px solid #E5E7EB', color: '#09111F', marginBottom: 24 }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div style={{ textAlign: 'center', padding: '60px 32px' }}>
              <Loader2 className="h-12 w-12 animate-spin" style={{ color: '#09111F', margin: '0 auto 16px' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#09111F', marginBottom: 8 }}>Generating AI Report</h2>
              <p style={{ color: '#64748B', marginBottom: 24 }}>Your interview analysis is being generated. This typically takes 1-2 minutes.</p>
              <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>Page will auto-refresh when ready...</p>
              <Button 
                onClick={() => window.location.reload()}
                style={{ marginTop: 24, background: '#09111F', color: '#fff', borderRadius: 8 }}
              >
                Refresh Now
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const overallScore = result?.normalized_score ?? 0;
  const strengths = parseInsightList(result?.strengths);
  const weaknesses = parseInsightList(result?.weaknesses);
  const aiSummary = result?.summary_notes?.trim();
  const heroInsight = aiSummary || strengths[0] || 'Detailed insights generated from your answers and reasoning quality.';
  const scoredQuestions = exchanges.filter((exchange) => exchange.evaluation?.total_score != null);
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

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA' }}>
      <CandidateHeader />

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 32px 72px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/candidate/reports')}
              style={{ borderRadius: 12, background: '#fff', border: '1px solid #E5E7EB', color: '#09111F' }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#09111F', lineHeight: 1.2 }}>Interview Report</h1>
              <p style={{ color: '#64748B', fontSize: '0.9rem' }}>Submission #{submissionId}</p>
            </div>
          </div>

          <div
            style={{
              background: '#09111F',
              borderRadius: 24,
              padding: '32px 28px',
              marginBottom: 24,
              boxShadow: '0 20px 40px rgba(9,17,31,0.18)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <p style={{ color: '#C9A84C', fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Performance Intelligence
                </p>
                <h2 style={{ color: '#fff', fontSize: 'clamp(1.7rem, 3vw, 2.6rem)', fontWeight: 700, marginBottom: 8 }}>
                  Score: {overallScore}%
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.72)', maxWidth: 680, fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {heroInsight}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Button variant="outline" size="sm" style={{ borderColor: 'rgba(255,255,255,0.25)', color: '#fff', background: 'transparent' }}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" size="sm" style={{ borderColor: 'rgba(255,255,255,0.25)', color: '#fff', background: 'transparent' }}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.15rem', color: '#09111F' }}>Overview</h3>
                  <p style={{ color: '#94A3B8', fontSize: '0.82rem' }}>Fast summary of your submission quality</p>
                </div>
                <Badge style={{ background: 'rgba(201,168,76,0.14)', color: '#8a6a17', border: 'none', fontWeight: 800 }}>
                  Submission #{submissionId}
                </Badge>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <div style={{ borderRadius: 14, background: '#F8FAFC', padding: 16, border: '1px solid #EEF2F7' }}>
                  <div style={{ color: '#94A3B8', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                    Overall Score
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: overallScore >= 80 ? '#059669' : overallScore >= 60 ? '#D97706' : '#DC2626' }}>
                    {overallScore}%
                  </div>
                </div>

                <div style={{ borderRadius: 14, background: '#F8FAFC', padding: 16, border: '1px solid #EEF2F7' }}>
                  <div style={{ color: '#94A3B8', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                    Questions
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#09111F' }}>
                    {exchanges.length}
                  </div>
                </div>

                <div style={{ borderRadius: 14, background: '#F8FAFC', padding: 16, border: '1px solid #EEF2F7' }}>
                  <div style={{ color: '#94A3B8', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                    AI Scored
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#059669' }}>
                    {scoredQuestions.length}/{exchanges.length}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', padding: 24 }}>
              <h3 style={{ fontWeight: 700, fontSize: '1.15rem', color: '#09111F', marginBottom: 16 }}>Skill Breakdown</h3>
              {result?.section_scores ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {Object.entries(result.section_scores).map(([section, score]) => (
                    <div key={section}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 6 }}>
                        <span style={{ color: '#64748B', textTransform: 'capitalize', fontWeight: 600 }}>{section}</span>
                        <span style={{ color: '#09111F', fontWeight: 700 }}>{score}%</span>
                      </div>
                      <div style={{ height: 8, background: '#E5E7EB', borderRadius: 999 }}>
                        <div
                          style={{
                            width: `${Math.max(0, Math.min(100, Number(score)))}%`,
                            height: '100%',
                            borderRadius: 999,
                            background: 'linear-gradient(90deg,#09111F,#C9A84C)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.86rem', color: '#94A3B8' }}>Skill breakdown not yet available.</p>
              )}
            </div>
          </div>

          {latestResume && (
            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', padding: 24, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.05rem', color: '#09111F', marginBottom: 4 }}>Resume ATS Analysis</h3>
                  <p style={{ color: '#64748B', fontSize: '0.82rem' }}>{latestResume.file_name || 'Latest uploaded resume used in interview context'}</p>
                </div>
                <div style={{ padding: '6px 12px', borderRadius: 999, background: 'rgba(14,165,233,0.12)', color: '#0369A1', fontSize: '0.74rem', fontWeight: 800 }}>
                  ATS {latestResume.ats_score ?? '--'}
                </div>
              </div>

              {atsDimensions.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
                  {atsDimensions.slice(0, 4).map((dimension, index) => {
                    const rawScore = typeof dimension.score === 'number' ? dimension.score : 0;
                    const score = Math.round(rawScore);
                    const name = typeof dimension.name === 'string' ? dimension.name : `Dimension ${index + 1}`;
                    return (
                      <div key={`${name}-${index}`} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px' }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{name}</div>
                        <div style={{ fontSize: '1.1rem', color: '#09111F', fontWeight: 800 }}>{score}/100</div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.16)', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Strengths</div>
                  <p style={{ fontSize: '0.82rem', color: '#166534', lineHeight: 1.5 }}>{atsHighlights[0] || 'Resume relevance and structure are in good shape.'}</p>
                </div>
                <div style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.16)', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: '0.7rem', color: '#92400E', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Improvements</div>
                  <p style={{ fontSize: '0.82rem', color: '#92400E', lineHeight: 1.5 }}>{atsIssues[0] || 'Add quantified impact and role-aligned keywords.'}</p>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', padding: 24 }}>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#09111F', marginBottom: 12 }}>Overall Interview Feedback from AI</h3>
              <p style={{ fontSize: '0.88rem', color: '#64748B', lineHeight: 1.7 }}>
                {aiSummary || 'AI summary is not available yet for this submission.'}
              </p>
            </div>

            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', padding: 24 }}>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#09111F', marginBottom: 12 }}>AI Strengths</h3>
              {strengths.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {strengths.map((item, index) => (
                    <li key={`strength-${index}`} style={{ fontSize: '0.86rem', color: '#166534', lineHeight: 1.6 }}>
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontSize: '0.86rem', color: '#94A3B8' }}>No strengths captured yet.</p>
              )}
            </div>

            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', padding: 24 }}>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#09111F', marginBottom: 12 }}>AI Improvement Areas</h3>
              {weaknesses.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {weaknesses.map((item, index) => (
                    <li key={`weakness-${index}`} style={{ fontSize: '0.86rem', color: '#92400E', lineHeight: 1.6 }}>
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontSize: '0.86rem', color: '#94A3B8' }}>No improvement areas captured yet.</p>
              )}
            </div>
          </div>

          {exchanges.length > 0 && (
          <Tabs defaultValue={String(exchanges[0].id)} className="space-y-5">
            <TabsList
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                background: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: 14,
                padding: 8,
                height: 'auto',
                gap: 8,
                overflowX: 'auto',
              }}
            >
              {exchanges.map((ex, index) => (
                <TabsTrigger
                  key={ex.id}
                  value={String(ex.id)}
                  style={{ borderRadius: 10, fontWeight: 700, fontSize: '0.8rem', padding: '8px 12px', color: '#09111F' }}
                  className="data-[state=active]:bg-[#09111F] data-[state=active]:text-white"
                >
                  <span>Q{index + 1}</span>
                  {ex.evaluation && (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '999px',
                        display: 'inline-block',
                        background: ex.evaluation.total_score >= 80 ? '#10B981' : ex.evaluation.total_score >= 60 ? '#F59E0B' : '#EF4444',
                      }}
                    />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {exchanges.map((ex) => (
              <TabsContent key={ex.id} value={String(ex.id)}>
                <div style={{ padding: 24, borderRadius: 20, background: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#09111F', marginBottom: 10, lineHeight: 1.35 }}>{ex.question_text}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Badge style={{ background: '#F1F5F9', color: '#334155', border: 'none', textTransform: 'capitalize', fontWeight: 700 }}>
                          {ex.difficulty_at_time}
                        </Badge>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', color: '#94A3B8', fontWeight: 700 }}>
                          <Clock className="w-3.5 h-3.5" />
                          Evaluated response
                        </span>
                      </div>
                    </div>
                    {ex.evaluation && (
                      <div style={{ fontSize: '2.2rem', fontWeight: 800, color: ex.evaluation.total_score >= 80 ? '#059669' : ex.evaluation.total_score >= 60 ? '#D97706' : '#DC2626' }}>
                        {toPercentScore(ex.evaluation.total_score)}%
                      </div>
                    )}
                  </div>

                  <div style={{ padding: 16, borderRadius: 12, background: '#F8FAFC', border: '1px solid #EEF2F7', marginBottom: 20 }}>
                    <h4 style={{ fontWeight: 700, marginBottom: 8, color: '#09111F', fontSize: '0.95rem' }}>Your Response</h4>
                    {ex.response_text && <p style={{ fontSize: '0.86rem', color: '#64748B', lineHeight: 1.6 }}>{ex.response_text}</p>}
                    {ex.response_code && (
                      <pre style={{ marginTop: 10, padding: 12, borderRadius: 10, background: '#0F172A', color: '#E2E8F0', fontSize: '0.72rem', overflowX: 'auto' }}>
                        {ex.response_code}
                      </pre>
                    )}
                  </div>

                  {ex.evaluation?.dimension_scores && ex.evaluation.dimension_scores.length > 0 && (
                    <div style={{ marginTop: 16, paddingTop: 18, borderTop: '1px solid #E5E7EB' }}>
                      <h4 style={{ fontWeight: 700, marginBottom: 12, color: '#09111F', fontSize: '0.95rem' }}>Detailed Metrics</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                        {ex.evaluation.dimension_scores.map((ds, index) => (
                          <div key={`${ds.dimension_name}-${index}`} style={{ padding: 14, borderRadius: 12, background: '#F8FAFC', border: '1px solid #EEF2F7' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#64748B', marginBottom: 6 }}>
                              <Target className="w-4 h-4" />
                              {ds.dimension_name}
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#09111F' }}>{toPercentScore(ds.score)}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
          )}

          <div style={{ marginTop: 26, display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Button 
              size="lg" 
              onClick={() => navigate('/candidate/practice')}
              style={{ background: '#09111F', color: '#fff', borderRadius: 12, fontWeight: 800, letterSpacing: '0.04em' }}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Practice Similar Questions
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => navigate('/candidate/dashboard')}
              style={{ borderRadius: 12, borderColor: '#D1D5DB', color: '#09111F', fontWeight: 700 }}
            >
              Back to Dashboard
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InterviewReport;
