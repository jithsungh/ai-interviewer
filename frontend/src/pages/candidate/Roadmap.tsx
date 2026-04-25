import { useEffect, useState } from 'react';
import { CandidateHeader } from '../../components/layout/CandidateHeader';
import {
  generateCareerInsights,
  generateCareerRoadmap,
  getActiveCareerRoadmap,
  updateCareerRoadmapProgress,
} from '@/services/candidateService';
import type {
  APICareerMarketInsight,
  APICareerRoadmapResponse,
  APICareerRoadmapStep,
} from '@/types/api';

type MarketInsight = APICareerMarketInsight;
type RoleRoadmapStep = APICareerRoadmapStep;

const INDUSTRIES = [
  'Artificial Intelligence & ML', 'FinTech', 'HealthTech', 'E-Commerce',
  'Cybersecurity', 'EdTech', 'Blockchain', 'Gaming', 'Data Science', 'Product Management',
];

const SENIORITY = ['Intern', 'Junior', 'Senior', 'Executive'];

const ICON_MAP: Record<string, string> = {
  smart_toy: 'smart_toy', account_balance: 'account_balance', security: 'security',
  school: 'school', shopping_cart: 'shopping_cart', local_hospital: 'local_hospital',
  sports_esports: 'sports_esports', currency_bitcoin: 'currency_bitcoin',
  engineering: 'engineering', analytics: 'analytics',
};

const ROADMAP_IMGS = [
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
  'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80',
];

const MENTOR_IMG = 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=700&q=80';

function PackageBar({ min, max }: { min: number; max: number }) {
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

function InsightsScreen({
  onSelectRole,
  activeRoadmap,
  onResumeRoadmap,
}: {
  onSelectRole: (role: MarketInsight, insightRunId?: number) => void;
  activeRoadmap: APICareerRoadmapResponse | null;
  onResumeRoadmap: () => void;
}) {
  const [industry, setIndustry] = useState('Artificial Intelligence & ML');
  const [seniority, setSeniority] = useState('Intern');
  const [insights, setInsights] = useState<MarketInsight[] | null>(null);
  const [insightRunId, setInsightRunId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await generateCareerInsights({
        industry,
        seniority,
        use_cached: true,
      });
      setInsights(data.insights);
      setInsightRunId(data.run_id);
    } catch (e) {
      console.error(e);
      setError('Could not load market insights right now. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="roadmap-page roadmap-insights-screen" style={{ minHeight: '100vh', background: '#FAFAFA', fontFamily: 'Manrope, sans-serif' }}>
      <div className="roadmap-shell" style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 48px 0' }}>
        <div style={{ marginBottom: 48 }}>
          <span style={{ fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', display: 'block', marginBottom: 12 }}>THE SCHOLARLY ATELIER</span>
          <h1 style={{ fontSize: 'clamp(2.8rem, 6vw, 5rem)', fontWeight: 700, color: '#09111F', lineHeight: 1.05, margin: 0 }}>
            Design Your <em style={{ fontStyle: 'italic', fontWeight: 400 }}>Trajectory.</em>
          </h1>
          <p style={{ color: '#6B7280', fontSize: '0.9rem', marginTop: 16, maxWidth: 520, lineHeight: 1.6 }}>
            SRM University AP&apos;s intelligent path-planning ecosystem. Map your academic journey to global industry benchmarks through curated data insights.
          </p>
          {activeRoadmap && (
            <div style={{ marginTop: 20, background: '#09111F', borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.82rem' }}>Resume your active roadmap</div>
                <div style={{ color: '#9CA3AF', fontSize: '0.72rem', marginTop: 4 }}>
                  {activeRoadmap.target_role} · {activeRoadmap.industry}
                </div>
              </div>
              <button className="roadmap-btn roadmap-btn-gold" onClick={onResumeRoadmap} style={{ border: 'none', background: '#C9A84C', color: '#09111F', padding: '10px 14px', borderRadius: 8, fontWeight: 900, fontSize: '0.66rem', letterSpacing: '0.08em', cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                RESUME ROADMAP
              </button>
            </div>
          )}
          {error && (
            <div style={{ marginTop: 14, color: '#B91C1C', fontSize: '0.8rem', fontWeight: 700 }}>
              {error}
            </div>
          )}
        </div>

        <div className="roadmap-insights-grid" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 48, alignItems: 'start' }}>
          <div>
            <div style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#09111F' }}>bolt</span>
                </div>
                <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#09111F' }}>Aspire Tool</span>
              </div>

              <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9CA3AF', marginBottom: 8 }}>Preferred Industry</label>
              <div style={{ position: 'relative', marginBottom: 24 }}>
                <select value={industry} onChange={e => setIndustry(e.target.value)} style={{ width: '100%', appearance: 'none', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 32px 10px 12px', fontSize: '0.82rem', fontWeight: 600, color: '#09111F', cursor: 'pointer', outline: 'none', fontFamily: 'Manrope, sans-serif' }}>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
                <span className="material-symbols-outlined" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#6B7280', pointerEvents: 'none' }}>expand_more</span>
              </div>

              <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9CA3AF', marginBottom: 10 }}>Target Seniority</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 28 }}>
                {SENIORITY.map(s => (
                  <button className={`roadmap-btn roadmap-chip-btn ${seniority === s ? 'roadmap-chip-btn-active' : ''}`} key={s} onClick={() => setSeniority(s)} style={{ padding: '9px 6px', borderRadius: 8, border: `1.5px solid ${seniority === s ? '#09111F' : '#E5E7EB'}`, background: seniority === s ? '#09111F' : '#fff', color: seniority === s ? '#fff' : '#6B7280', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Manrope, sans-serif' }}>
                    {s}
                  </button>
                ))}
              </div>

              <button className="roadmap-btn roadmap-btn-dark" onClick={handleGenerate} disabled={loading} style={{ width: '100%', padding: '14px 20px', background: loading ? '#6B7280' : '#09111F', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: '0.72rem', letterSpacing: '0.12em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Manrope, sans-serif', transition: 'background 0.2s' }}>
                {loading ? 'ANALYZING...' : 'GENERATE INSIGHTS'}
                {!loading && <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>}
                {loading && <div className="spin-slow" style={{ display: 'inline-block' }}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>autorenew</span></div>}
              </button>
            </div>

            <div style={{ background: '#09111F', borderRadius: 16, padding: 24 }}>
              <span style={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#C9A84C', display: 'block', marginBottom: 16 }}>Current Alignment</span>
              {[{ label: 'CORE TECHNICAL', val: 86 }, { label: 'SYSTEM DESIGN', val: 62 }].map(item => (
                <div key={item.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.58rem', fontWeight: 900, letterSpacing: '0.1em', color: '#9CA3AF' }}>{item.label}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#fff' }}>{item.val}%</span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${item.val}%`, background: item.val > 75 ? '#C9A84C' : '#fff', borderRadius: 2, transition: 'width 1s' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            {!insights && !loading && (
              <div style={{ background: '#fff', borderRadius: 16, padding: '40px 32px', border: '1px dashed #E5E7EB', textAlign: 'center', minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#D1D5DB', marginBottom: 16 }}>insights</span>
                <p style={{ color: '#9CA3AF', fontWeight: 600, fontSize: '0.9rem' }}>Select your industry and seniority level, then click &quot;Generate Insights&quot; to see market roles.</p>
              </div>
            )}

            {loading && (
              <div style={{ background: '#fff', borderRadius: 16, padding: '40px 32px', textAlign: 'center', minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spin-slow" style={{ marginBottom: 20 }}><span className="material-symbols-outlined" style={{ fontSize: 40, color: '#C9A84C' }}>neurology</span></div>
                <p style={{ color: '#6B7280', fontWeight: 600 }}>Analyzing market for {seniority}-level roles in {industry}...</p>
              </div>
            )}

            {insights && !loading && (
              <div className="roadmap-insights-table" style={{ background: '#fff', borderRadius: 16, border: '1px solid #F3F4F6', overflow: 'hidden' }}>
                <div style={{ padding: '20px 28px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ fontWeight: 900, fontSize: '1.05rem', color: '#09111F' }}>Market Insights</span>
                  <span style={{ fontSize: '0.65rem', color: '#9CA3AF', fontWeight: 600 }}>Updated: Nov 2024</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr 0.8fr', padding: '10px 28px', background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
                  {['ROLE & INDUSTRY', 'CORE SKILLS', 'AVG. PACKAGE (CTC)', 'GROWTH'].map(h => (
                    <span key={h} style={{ fontSize: '0.58rem', fontWeight: 900, letterSpacing: '0.08em', color: '#9CA3AF' }}>{h}</span>
                  ))}
                </div>

                {insights.map((item, i) => (
                  <div key={i} onClick={() => onSelectRole(item, insightRunId)} className="roadmap-insight-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr 0.8fr', padding: '18px 28px', borderBottom: '1px solid #F9FAFB', alignItems: 'center', cursor: 'pointer', transition: 'background 0.18s' }}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#374151' }}>{ICON_MAP[item.icon] || 'work'}</span>
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#09111F', marginBottom: 2 }}>{item.role}</div>
                        <div style={{ fontSize: '0.65rem', color: '#9CA3AF', fontWeight: 600 }}>{item.industryTag}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {item.skills?.slice(0, 2).map((s, si) => (
                        <span key={si} style={{ padding: '3px 8px', background: '#F3F4F6', borderRadius: 4, fontSize: '0.58rem', fontWeight: 900, color: '#374151', letterSpacing: '0.05em' }}>{s.toUpperCase()}</span>
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <PackageBar min={item.minPackage} max={item.maxPackage} />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#09111F' }}>{item.minPackage} - {item.maxPackage} LPA</div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 900, fontSize: '0.82rem', color: item.trend === 'up' ? '#16A34A' : item.trend === 'down' ? '#DC2626' : '#D97706' }}>
                        {item.trend === 'up' ? '↑' : item.trend === 'down' ? '↓' : '→'} {String(item.growth).padStart(2, '0')}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 64, marginBottom: 80 }}>
          <div style={{ borderRadius: 20, overflow: 'hidden', position: 'relative', minHeight: 220 }}>
            <img src={MENTOR_IMG} alt="Collaborative Lab" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(9,17,31,0.85) 40%, transparent)' }} />
            <div style={{ position: 'absolute', bottom: 24, left: 24 }}>
              <div style={{ fontWeight: 900, fontSize: '1.2rem', color: '#fff' }}>Collaborative Lab</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>Connect with peers aiming for similar trajectories.</div>
            </div>
          </div>

          <div style={{ padding: '32px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C9A84C', display: 'block', marginBottom: 16 }}>Premium Mentorship</span>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#09111F', lineHeight: 1.15, marginBottom: 16 }}>Connect with the <em style={{ textDecoration: 'underline', fontStyle: 'italic' }}>Luminaries.</em></h2>
            <p style={{ color: '#6B7280', fontSize: '0.875rem', lineHeight: 1.7, maxWidth: 420, marginBottom: 28 }}>Access our private network of alumni working at FAANG and top-tier investment firms. Our mentorship program bridges the gap between scholarly theory and atelier practice.</p>
            <button className="roadmap-btn roadmap-btn-dark" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: '#09111F', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 24px', fontWeight: 900, fontSize: '0.72rem', letterSpacing: '0.12em', cursor: 'pointer', width: 'fit-content', fontFamily: 'Manrope, sans-serif' }}>
              REQUEST A MENTOR
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#09111F' }}>arrow_forward</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div style={{ background: '#09111F', padding: '28px 48px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: '0.95rem' }}>SRM AP</div>
            <div style={{ color: '#6B7280', fontSize: '0.65rem', marginTop: 4 }}>© 2026 SRM University AP. The Scholarly Atelier.</div>
          </div>
          <div style={{ display: 'flex', gap: 28 }}>
            {['Privacy Policy', 'Academic Integrity', 'Support'].map(l => (
              <span key={l} style={{ color: '#6B7280', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' }}>{l}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RoadmapScreen({
  selectedRole,
  industry,
  insightRunId,
  existingRoadmap,
  onRoadmapGenerated,
  onBack,
}: {
  selectedRole: MarketInsight;
  industry: string;
  insightRunId?: number;
  existingRoadmap: APICareerRoadmapResponse | null;
  onRoadmapGenerated: (roadmap: APICareerRoadmapResponse) => void;
  onBack: () => void;
}) {
  const [path, setPath] = useState<RoleRoadmapStep[] | null>(null);
  const [roadmapId, setRoadmapId] = useState<number | null>(null);
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const generate = async () => {
      setLoading(true);
      setError(null);
      try {
        if (existingRoadmap && existingRoadmap.target_role === selectedRole.role && existingRoadmap.industry === industry) {
          if (active) {
            setPath(existingRoadmap.steps);
            setRoadmapId(existingRoadmap.roadmap_id);
            setCompletedLevels(existingRoadmap.completed_levels || []);
            setCurrentLevel(existingRoadmap.current_level || 1);
            setLoading(false);
          }
          return;
        }

        const data = await generateCareerRoadmap({
          role: selectedRole.role,
          industry,
          insight_run_id: insightRunId,
          selected_insight: selectedRole,
        });

        if (active) {
          setPath(data.steps);
          setRoadmapId(data.roadmap_id);
          setCompletedLevels(data.completed_levels || []);
          setCurrentLevel(data.current_level || 1);
          onRoadmapGenerated(data);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (active) setError('Failed to load your roadmap. Please try again.');
        if (active) setLoading(false);
      }
    };
    generate();
    return () => {
      active = false;
    };
  }, [existingRoadmap, industry, insightRunId, onRoadmapGenerated, selectedRole]);

  const handleToggleLevel = async (level: number) => {
    if (!roadmapId) return;

    const wasCompleted = completedLevels.includes(level);
    const nextCompleted = wasCompleted
      ? completedLevels.filter((item) => item !== level)
      : [...completedLevels, level].sort((a, b) => a - b);
    const nextCurrent = nextCompleted.length > 0
      ? Math.min(4, Math.max(...nextCompleted) + 1)
      : 1;

    setCompletedLevels(nextCompleted);
    setCurrentLevel(nextCurrent);
    setError(null);

    try {
      const updated = await updateCareerRoadmapProgress(roadmapId, {
        completed_levels: nextCompleted,
        current_level: nextCurrent,
      });
      setCompletedLevels(updated.completed_levels || []);
      setCurrentLevel(updated.current_level || 1);
      onRoadmapGenerated(updated);
    } catch (e) {
      console.error(e);
      setError('Could not sync roadmap progress. Please try again.');
      setCompletedLevels(completedLevels);
      setCurrentLevel(currentLevel);
    }
  };

  return (
    <div className="roadmap-page roadmap-detail-screen" style={{ minHeight: '100vh', background: '#FAFAFA', fontFamily: 'Manrope, sans-serif' }}>
      <div className="roadmap-shell roadmap-detail-shell" style={{ maxWidth: 900, margin: '0 auto', padding: '56px 48px 0' }}>
        <button className="roadmap-btn roadmap-back-btn" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#6B7280', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', marginBottom: 32, padding: 0, fontFamily: 'Manrope, sans-serif' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span> Back to market insights
        </button>

        <div className="roadmap-detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 64 }}>
          <div>
            <span style={{ fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9CA3AF', display: 'block', marginBottom: 12 }}>PROFESSIONAL ROADMAP</span>
            <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 700, color: '#09111F', lineHeight: 1.05, margin: '0 0 16px' }}>{selectedRole.role}</h1>
            <p style={{ color: '#6B7280', fontSize: '0.88rem', lineHeight: 1.65, maxWidth: 480 }}>
              A curated journey from foundational skills to high-level expertise. Master the art of scalable, resilient, and elegant technological growth.
            </p>
          </div>
          <div style={{ textAlign: 'right', borderLeft: '2px solid #09111F', paddingLeft: 20 }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.1em', color: '#9CA3AF', display: 'block', marginBottom: 4 }}>THE SCHOLARLY</span>
            <span style={{ fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.1em', color: '#9CA3AF', display: 'block' }}>ATELIER</span>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div className="spin-slow" style={{ display: 'inline-block', marginBottom: 20 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#C9A84C' }}>neurology</span>
            </div>
            <p style={{ color: '#6B7280', fontWeight: 600 }}>Generating your career ladder for {selectedRole.role}...</p>
          </div>
        )}

        {error && (
          <div style={{ marginBottom: 24, color: '#B91C1C', fontSize: '0.8rem', fontWeight: 700 }}>
            {error}
          </div>
        )}

        {path && !loading && (
          <div>
            <div style={{ marginBottom: 24, background: '#fff', borderRadius: 12, border: '1px solid #F3F4F6', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ color: '#6B7280', fontSize: '0.76rem', fontWeight: 700 }}>
                Progress: {completedLevels.length}/4 levels completed
              </span>
              <span style={{ color: '#09111F', fontSize: '0.76rem', fontWeight: 900 }}>
                Current focus: Level {currentLevel}
              </span>
            </div>
            {path.map((step, i) => {
              const isEven = i % 2 === 0;
              const isExecutive = step.levelLabel === 'EXECUTIVE';
              const img = ROADMAP_IMGS[i];
              const isCompleted = completedLevels.includes(step.level);

              return (
                <div key={i} className="roadmap-timeline-row" style={{ display: 'flex', gap: 0, marginBottom: 48, alignItems: 'stretch', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 12, height: 12, borderRadius: '50%', background: '#C9A84C', border: '3px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,0.15)', zIndex: 10 }} />

                  {isEven && (
                    <>
                      <div style={{ flex: 1, background: isExecutive ? '#09111F' : '#fff', borderRadius: 16, padding: '36px 40px', border: isExecutive ? 'none' : '1px solid #F3F4F6', boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                          <span style={{ fontSize: '1.8rem', fontWeight: 900, color: isExecutive ? 'rgba(255,255,255,0.15)' : '#F3F4F6' }}>
                            {String(step.level).padStart(2, '0')}
                          </span>
                          <span style={{ background: isExecutive ? '#C9A84C' : '#09111F', color: '#fff', padding: '4px 12px', borderRadius: 100, fontSize: '0.55rem', fontWeight: 900, letterSpacing: '0.12em' }}>
                            {step.levelLabel}
                          </span>
                        </div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: isExecutive ? '#fff' : '#09111F', marginBottom: 20 }}>{step.roleTitle}</h3>

                        <button
                          className={`roadmap-btn roadmap-complete-btn ${isCompleted ? 'roadmap-complete-btn-done' : ''}`}
                          onClick={() => handleToggleLevel(step.level)}
                          style={{ marginBottom: 16, border: 'none', background: isCompleted ? '#16A34A' : '#09111F', color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.06em', cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}
                        >
                          {isCompleted ? 'COMPLETED' : 'MARK COMPLETE'}
                        </button>

                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: isExecutive ? '#9CA3AF' : '#6B7280', marginBottom: 8 }}>Required Courses</div>
                          {step.requiredCourses?.map((c, ci) => (
                            <div key={ci} style={{ color: isExecutive ? 'rgba(255,255,255,0.75)' : '#374151', fontSize: '0.82rem', marginBottom: 4, display: 'flex', gap: 8 }}>
                              <span style={{ color: '#C9A84C', fontWeight: 900 }}>·</span> {c}
                            </div>
                          ))}
                        </div>

                        <div style={{ paddingBottom: 16, marginBottom: 16, borderBottom: `1px solid ${isExecutive ? 'rgba(255,255,255,0.08)' : '#F3F4F6'}` }}>
                          <div style={{ fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: isExecutive ? '#9CA3AF' : '#6B7280', marginBottom: 8 }}>Key Learning</div>
                          <p style={{ color: isExecutive ? 'rgba(255,255,255,0.6)' : '#6B7280', fontSize: '0.82rem', lineHeight: 1.6, fontStyle: 'italic', margin: 0 }}>{step.keyLearning}</p>
                        </div>

                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: isExecutive ? 'rgba(255,255,255,0.08)' : '#F9FAFB', padding: '6px 12px', borderRadius: 6 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#C9A84C' }}>workspace_premium</span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: isExecutive ? '#D1D5DB' : '#374151' }}>{step.certification}</span>
                        </div>
                      </div>

                      <div style={{ width: 24 }} />
                      <div style={{ flex: 1, borderRadius: 16, overflow: 'hidden', minHeight: 280 }}>
                        <img src={img} alt={step.roleTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    </>
                  )}

                  {!isEven && (
                    <>
                      <div style={{ flex: 1, borderRadius: 16, overflow: 'hidden', minHeight: 280 }}>
                        <img src={img} alt={step.roleTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>

                      <div style={{ width: 24 }} />
                      <div style={{ flex: 1, background: isExecutive ? '#09111F' : '#fff', borderRadius: 16, padding: '36px 40px', border: isExecutive ? 'none' : '1px solid #F3F4F6', boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                          <span style={{ fontSize: '1.8rem', fontWeight: 900, color: isExecutive ? 'rgba(255,255,255,0.15)' : '#F3F4F6' }}>
                            {String(step.level).padStart(2, '0')}
                          </span>
                          <span style={{ background: isExecutive ? '#C9A84C' : '#09111F', color: '#fff', padding: '4px 12px', borderRadius: 100, fontSize: '0.55rem', fontWeight: 900, letterSpacing: '0.12em' }}>
                            {step.levelLabel}
                          </span>
                        </div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: isExecutive ? '#fff' : '#09111F', marginBottom: 20 }}>{step.roleTitle}</h3>

                        <button
                          className={`roadmap-btn roadmap-complete-btn ${isCompleted ? 'roadmap-complete-btn-done' : ''}`}
                          onClick={() => handleToggleLevel(step.level)}
                          style={{ marginBottom: 16, border: 'none', background: isCompleted ? '#16A34A' : '#09111F', color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.06em', cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}
                        >
                          {isCompleted ? 'COMPLETED' : 'MARK COMPLETE'}
                        </button>

                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: isExecutive ? '#9CA3AF' : '#6B7280', marginBottom: 8 }}>Required Courses</div>
                          {step.requiredCourses?.map((c, ci) => (
                            <div key={ci} style={{ color: isExecutive ? 'rgba(255,255,255,0.75)' : '#374151', fontSize: '0.82rem', marginBottom: 4, display: 'flex', gap: 8 }}>
                              <span style={{ color: '#C9A84C', fontWeight: 900 }}>·</span> {c}
                            </div>
                          ))}
                        </div>

                        <div style={{ paddingBottom: 16, marginBottom: 16, borderBottom: `1px solid ${isExecutive ? 'rgba(255,255,255,0.08)' : '#F3F4F6'}` }}>
                          <div style={{ fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: isExecutive ? '#9CA3AF' : '#6B7280', marginBottom: 8 }}>Key Learning</div>
                          <p style={{ color: isExecutive ? 'rgba(255,255,255,0.6)' : '#6B7280', fontSize: '0.82rem', lineHeight: 1.6, fontStyle: 'italic', margin: 0 }}>{step.keyLearning}</p>
                        </div>

                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: isExecutive ? 'rgba(255,255,255,0.08)' : '#F9FAFB', padding: '6px 12px', borderRadius: 6 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#C9A84C' }}>workspace_premium</span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: isExecutive ? '#D1D5DB' : '#374151' }}>{step.certification}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            <div style={{ textAlign: 'center', padding: '80px 0 64px' }}>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 700, color: '#09111F', marginBottom: 12 }}>Ready to Build the Future?</h2>
              <p style={{ color: '#9CA3AF', fontSize: '0.875rem', marginBottom: 36 }}>
                Connect with our industry mentors as you roadmap a curriculum journey that is tailor made for you.
              </p>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', right: -60, top: -20, fontSize: 80, color: '#F3F4F6', zIndex: 0 }}>architecture</span>
                <button className="roadmap-btn roadmap-btn-dark" style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: 12, background: '#09111F', color: '#fff', border: 'none', borderRadius: 10, padding: '16px 32px', fontWeight: 900, fontSize: '0.78rem', letterSpacing: '0.1em', cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                  Consult Academic Mentor <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ background: '#09111F', padding: '28px 48px', marginTop: 40 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <span style={{ color: '#C9A84C', fontWeight: 900, fontSize: '0.8rem' }}>SRM University AP</span>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Terms of Service', 'Academic Integrity', 'Support'].map(l => (
              <span key={l} style={{ color: '#6B7280', fontSize: '0.62rem', fontWeight: 700 }}>{l}</span>
            ))}
          </div>
          <span style={{ color: '#6B7280', fontSize: '0.62rem' }}>© 2026 SRM University AP. The Scholarly Atelier.</span>
        </div>
      </div>
    </div>
  );
}

export default function Roadmap() {
  const [selectedRole, setSelectedRole] = useState<MarketInsight | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState('Artificial Intelligence & ML');
  const [activeRoadmap, setActiveRoadmap] = useState<APICareerRoadmapResponse | null>(null);
  const [selectedInsightRunId, setSelectedInsightRunId] = useState<number | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    const loadActiveRoadmap = async () => {
      try {
        const roadmap = await getActiveCareerRoadmap();
        if (!mounted) return;
        setActiveRoadmap(roadmap);
      } catch (error) {
        console.error(error);
      }
    };

    loadActiveRoadmap();

    return () => {
      mounted = false;
    };
  }, []);

  const handleResumeRoadmap = () => {
    if (!activeRoadmap) return;
    setSelectedIndustry(activeRoadmap.industry);
    setSelectedRole(
      activeRoadmap.selected_insight ?? {
        role: activeRoadmap.target_role,
        industryTag: activeRoadmap.industry,
        icon: 'engineering',
        skills: [],
        minPackage: 0,
        maxPackage: 0,
        growth: 0,
        trend: 'stable',
      },
    );
    setSelectedInsightRunId(activeRoadmap.insight_run_id ?? undefined);
  };

  return (
    <div className="new-frontend-theme">
      <CandidateHeader />
      {selectedRole ? (
        <RoadmapScreen
          selectedRole={selectedRole}
          industry={selectedIndustry}
          insightRunId={selectedInsightRunId}
          existingRoadmap={activeRoadmap}
          onRoadmapGenerated={setActiveRoadmap}
          onBack={() => setSelectedRole(null)}
        />
      ) : (
        <InsightsScreen
          activeRoadmap={activeRoadmap}
          onResumeRoadmap={handleResumeRoadmap}
          onSelectRole={(role, insightRunId) => {
            setSelectedIndustry(role.industryTag || selectedIndustry);
            setSelectedInsightRunId(insightRunId);
            setSelectedRole(role);
          }}
        />
      )}
    </div>
  );
}
