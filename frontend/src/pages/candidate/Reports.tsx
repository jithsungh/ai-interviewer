import { useState, useEffect } from 'react';
import { CandidateHeader } from '@/components/layout/CandidateHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Download, FileText, Loader2, Award, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCandidateSubmissions, getSubmissionResults } from '@/services/candidateService';
import type { InterviewSubmission } from '@/types/database';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

function getScoreColor(score: number) {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
}

function getScoreStatus(score: number) {
  if (score >= 85) return 'EXCELLENT';
  if (score >= 70) return 'PROFICIENT';
  return 'NEEDS WORK';
}

function isLikelyId(value?: string | null) {
  if (!value) return false;
  const trimmed = value.trim();
  // Check if value is pure hex ID (e.g., "9c9d425d69")
  if (/^[a-f0-9]{8,}$/i.test(trimmed)) return true;
  // Also check if it contains a hex ID pattern (e.g., "Role 9c9d425d69")
  if (/[a-f0-9]{8,}/i.test(trimmed)) return true;
  return false;
}

function getDisplayRoleName(submission: InterviewSubmission) {
  const roleName = submission.role?.name;
  if (!roleName || isLikelyId(roleName)) return 'Practice Interview';
  return roleName;
}

function getDisplayWindowName(submission: InterviewSubmission) {
  const windowName = submission.window?.name;
  if (!windowName || windowName === '__practice__') return 'Practice Session';
  return windowName;
}

function getDisplayOrganizationName(submission: InterviewSubmission) {
  const orgName = submission.window?.organization?.name;
  if (!orgName || isLikelyId(orgName)) return 'Your Organization';
  return orgName;
}

const Reports = () => {
  const REPORTS_PER_PAGE = 6;
  const [pastSubmissions, setPastSubmissions] = useState<InterviewSubmission[]>([]);
  const [calculatedScores, setCalculatedScores] = useState<Record<number, number>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const submissionsData = await getCandidateSubmissions();
        setPastSubmissions(submissionsData.data);

        // For submissions with status='completed' but no final_score, fetch calculated score
        const scoreMap: Record<number, number> = {};
        const submissionsNeedingScore = submissionsData.data.filter(
          (s) => s.status === 'completed' && s.final_score == null
        );

        for (const sub of submissionsNeedingScore) {
          try {
            const result = await getSubmissionResults(sub.id);
            if (result?.normalized_score != null) {
              scoreMap[sub.id] = result.normalized_score;
            }
          } catch (err) {
            // Silently skip if evaluation not ready yet
            console.debug(`No evaluation ready for submission ${sub.id}`);
          }
        }

        setCalculatedScores(scoreMap);
      } catch (err) {
        console.error('Failed to load submissions', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <CandidateHeader />
        <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#09111F' }} />
          <p className="text-sm" style={{ color: '#94A3B8' }}>Loading your reports...</p>
        </div>
      </div>
    );
  }

  const avgScore = Math.round(
    pastSubmissions
      .map(s => s.final_score ?? calculatedScores[s.id])
      .filter((score): score is number => score != null)
      .reduce((sum, score) => sum + score, 0) /
    Math.max(
      pastSubmissions.filter(s => s.final_score != null || s.id in calculatedScores).length,
      1
    )
  );
  const passedCount = pastSubmissions.filter(s => s.result?.result_status === 'pass').length;
  const totalPages = Math.max(1, Math.ceil(pastSubmissions.length / REPORTS_PER_PAGE));
  const pageStart = (currentPage - 1) * REPORTS_PER_PAGE;
  const paginatedSubmissions = pastSubmissions.slice(pageStart, pageStart + REPORTS_PER_PAGE);

  return (
    <div className="min-h-screen bg-white">
      <CandidateHeader />
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 32px' }}>
        {/* Header with Subtitle */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}
        >
          <div>
            <div style={{ color: '#8a6a17', fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>Performance Intelligence</div>
            <h1 style={{ color: '#09111F', fontSize: '2.5rem', fontWeight: 700, marginBottom: 8, lineHeight: 1.1 }}>Interview<br/>Reports & Insights</h1>
            <p style={{ color: '#64748B', fontSize: '0.9rem' }}>A detailed synthesis of your communication, technical proficiency, and growth metrics across all sessions.</p>
          </div>
          <Button onClick={() => window.print()} style={{ background: '#09111F', color: '#fff', borderRadius: 8, padding: '12px 24px', gap: 8, display: 'flex', alignItems: 'center', fontSize: '0.75rem', fontWeight: 800, border: 'none', cursor: 'pointer' }}>
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        </motion.div>

        {/* Summary Stats Grid */}
        {pastSubmissions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 2.2fr', gap: 24, marginBottom: 40 }}
          >
            {/* Current Mastery Card */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 12px 32px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.02)' }}>
              <div style={{ fontWeight: 800, color: '#09111F', fontSize: '1.05rem', marginBottom: 4 }}>Current Mastery</div>
              <div style={{ fontSize: '0.6rem', color: '#94A3B8', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>Based on Avg Score</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 20 }}>
                <div style={{ fontSize: '4.5rem', fontWeight: 700, color: '#09111F', lineHeight: 0.9, fontFamily: 'Noto Serif, serif' }}>{avgScore}</div>
                <div style={{ color: '#64748B', fontWeight: 600, fontSize: '1.2rem', paddingBottom: 6 }}>/100</div>
                {avgScore >= 70 && (
                  <div style={{ padding: '4px 8px', background: 'rgba(34,197,94,0.15)', color: '#166534', borderRadius: 100, fontSize: '0.65rem', fontWeight: 800, marginBottom: 12 }}>+12%</div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                <span>Performance Level</span>
                <span style={{ color: getScoreColor(avgScore) }}>{getScoreStatus(avgScore)}</span>
              </div>
              <div style={{ height: 4, background: '#E2E8F0', borderRadius: 2 }}>
                <div style={{ width: `${Math.min(100, avgScore)}%`, height: '100%', background: '#09111F', borderRadius: 2, transition: 'width 0.3s' }} />
              </div>
            </div>

            {/* Performance Chart */}
            <div style={{ background: '#0A152A', borderRadius: 16, padding: 32, position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#fff', fontSize: '1.05rem', marginBottom: 4 }}>Session Trend</div>
                  <div style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Last {Math.min(5, pastSubmissions.length)} Sessions</div>
                </div>
                <div style={{ background: 'rgba(233,195,73,0.2)', color: '#C9A84C', padding: '4px 12px', borderRadius: 100, fontSize: '0.65rem', fontWeight: 800 }}>ACTIVE</div>
              </div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 180, background: 'linear-gradient(to top, rgba(14,165,233,0.1), transparent)' }}>
                <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100" style={{ position: 'absolute', bottom: 0, left: 0 }}>
                  <path d="M0,90 Q20,80 40,70 T80,40 T100,20 L100,100 L0,100 Z" fill="rgba(14,165,233,0.1)" />
                  <path d="M0,90 Q20,80 40,70 T80,40 T100,20" fill="none" stroke="#38BDF8" strokeWidth="2" />
                </svg>
              </div>
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', color: '#64748B', fontSize: '0.65rem', paddingTop: 60 }}>
                {pastSubmissions.slice(-5).map((_, i) => <span key={i}>S{i + 1}</span>)}
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats Cards */}
        {pastSubmissions.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 48 }}
          >
            <div style={{ background: '#F8FAFC', borderRadius: 16, padding: 24, border: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ background: '#E2E8F0', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText className="h-4 w-4" style={{ color: '#475569' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#09111F', fontSize: '0.85rem' }}>Total Reports</div>
                  <div style={{ fontSize: '0.65rem', color: '#94A3B8' }}>Completed interviews</div>
                </div>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#09111F', marginBottom: 8 }}>{pastSubmissions.length}</div>
            </div>

            <div style={{ background: '#F8FAFC', borderRadius: 16, padding: 24, border: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ background: 'rgba(5,150,105,0.1)', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Award className="h-4 w-4" style={{ color: '#059669' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#09111F', fontSize: '0.85rem' }}>Passed</div>
                  <div style={{ fontSize: '0.65rem', color: '#94A3B8' }}>Successful attempts</div>
                </div>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#059669', marginBottom: 8 }}>{passedCount}</div>
            </div>

            <div style={{ background: '#F8FAFC', borderRadius: 16, padding: 24, border: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ background: 'rgba(59,130,246,0.1)', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp className="h-4 w-4" style={{ color: '#3B82F6' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#09111F', fontSize: '0.85rem' }}>Avg Score</div>
                  <div style={{ fontSize: '0.65rem', color: '#94A3B8' }}>All sessions</div>
                </div>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#3B82F6', marginBottom: 8 }}>{avgScore}%</div>
            </div>
          </motion.div>
        )}

        {/* Reports List */}
        {pastSubmissions.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: '48px 32px', textAlign: 'center', border: '1px solid #F1F5F9', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: '#F1F5F9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <FileText className="h-7 w-7" style={{ color: '#CBD5E1' }} />
              </div>
              <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#09111F', marginBottom: 8 }}>No reports yet</h3>
              <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
                Complete an interview to see detailed AI-powered analysis reports and performance insights here.
              </p>
              <Link to="/candidate/interviews">
                <Button style={{ background: '#09111F', color: '#fff', borderRadius: 8, padding: '12px 24px', fontSize: '0.85rem', fontWeight: 800, border: 'none', cursor: 'pointer' }}>
                  Browse Interviews
                </Button>
              </Link>
            </div>
          </motion.div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 16, marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: '1.6rem', color: '#09111F', fontWeight: 700, marginBottom: 4 }}>All Reports</h2>
                <p style={{ color: '#64748B', fontSize: '0.85rem' }}>Click any report to view detailed analysis and feedback.</p>
              </div>
              <div style={{ padding: '6px 12px', background: '#F1F5F9', borderRadius: 100, fontSize: '0.65rem', fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, background: '#09111F', borderRadius: '50%' }} /> AI ANALYSIS ENGINE
              </div>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              {paginatedSubmissions.map((sub, index) => {
                // Use final_score if available, otherwise use calculated score
                const displayScore = sub.final_score ?? calculatedScores[sub.id];
                const hasScore = displayScore != null;
                const scoreValue = displayScore ?? 0;
                const roleName = getDisplayRoleName(sub);
                const orgName = getDisplayOrganizationName(sub);
                const windowName = getDisplayWindowName(sub);
                const submittedDate = sub.submitted_at ? format(new Date(sub.submitted_at), 'MMM d, yyyy') : 'In Progress';
                const status = sub.status ? sub.status.toUpperCase() : 'PENDING';
                const statusStyle =
                  status === 'COMPLETED'
                    ? { background: 'rgba(5,150,105,0.12)', color: '#059669' }
                    : status === 'IN_PROGRESS'
                      ? { background: 'rgba(245,158,11,0.12)', color: '#D97706' }
                      : status === 'PENDING'
                        ? { background: 'rgba(100,116,139,0.12)', color: '#475569' }
                        : { background: 'rgba(100,116,139,0.12)', color: '#475569' };

                return (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.03 * index }}
                  >
                    <Link to={`/candidate/reports/${sub.id}`}>
                      <div
                        style={{
                          background: '#fff',
                          borderRadius: 18,
                          padding: 18,
                          border: '1px solid #E5E7EB',
                          boxShadow: '0 6px 16px rgba(0,0,0,0.04)',
                          display: 'grid',
                          gridTemplateColumns: 'minmax(160px, 200px) minmax(240px, 1fr) minmax(160px, 200px) 28px',
                          gap: 18,
                          alignItems: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.25s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 16px 40px rgba(9,17,31,0.12)';
                          e.currentTarget.style.transform = 'translateY(-3px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.04)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <div
                          style={{
                            background: hasScore 
                              ? scoreValue >= 80 ? 'rgba(5,150,105,0.08)' : scoreValue >= 60 ? 'rgba(217,119,6,0.08)' : 'rgba(220,38,38,0.08)'
                              : 'rgba(148,163,184,0.06)',
                            border: hasScore
                              ? scoreValue >= 80 ? '1.5px solid rgba(5,150,105,0.2)' : scoreValue >= 60 ? '1.5px solid rgba(217,119,6,0.2)' : '1.5px solid rgba(220,38,38,0.2)'
                              : '1.5px solid rgba(148,163,184,0.2)',
                            borderRadius: 14,
                            padding: '16px 14px',
                          }}
                        >
                          <div style={{ fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.08em', color: '#475569', textTransform: 'uppercase', marginBottom: 10 }}>
                            Score
                          </div>
                          {hasScore ? (
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5 }}>
                              <span
                                style={{
                                  fontSize: '2.1rem',
                                  fontWeight: 800,
                                  color: scoreValue >= 80 ? '#059669' : scoreValue >= 60 ? '#D97706' : '#DC2626',
                                  lineHeight: 1,
                                  fontFamily: 'Noto Serif, serif',
                                }}
                              >
                                {scoreValue}
                              </span>
                              <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, marginBottom: 2 }}>/100</span>
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#94A3B8' }}>{status === 'COMPLETED' ? 'Scoring...' : 'Not Scored'}</div>
                          )}
                        </div>

                        <div>
                          <div style={{ fontWeight: 700, color: '#09111F', fontSize: '1.05rem', marginBottom: 6 }}>{roleName}</div>
                          <p style={{ color: '#64748B', fontSize: '0.84rem', marginBottom: 5 }}>
                            {orgName} • {windowName}
                          </p>
                          <p style={{ color: '#8a7355', fontSize: '0.76rem', fontWeight: 600 }}>{submittedDate}</p>
                        </div>

                        <div style={{ justifySelf: 'start' }}>
                          <div style={{ fontSize: '0.6rem', fontWeight: 900, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                            Status
                          </div>
                          <Badge
                            style={{
                              ...statusStyle,
                              borderRadius: 8,
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '6px 11px',
                              border: 'none',
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                            }}
                          >
                            {status}
                          </Badge>
                        </div>

                        <ChevronRight className="h-5 w-5" style={{ color: '#D1D5DB', justifySelf: 'end' }} />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 }}>
                <p style={{ color: '#64748B', fontSize: '0.82rem', fontWeight: 600 }}>
                  Showing {pageStart + 1}-{Math.min(pageStart + REPORTS_PER_PAGE, pastSubmissions.length)} of {pastSubmissions.length} reports
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Button
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    style={{ borderRadius: 8, fontWeight: 700 }}
                  >
                    Previous
                  </Button>
                  <span style={{ color: '#09111F', fontSize: '0.82rem', fontWeight: 700 }}>
                    Page {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    style={{ borderRadius: 8, fontWeight: 700 }}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

    </div>
  );
};

export default Reports;
