import { useEffect, useState, type CSSProperties, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

const HERO_IMG = 'https://images.unsplash.com/photo-1562774053-701939374585?w=1600&q=80&auto=format&fit=crop';
const CARD_IMG = 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80&auto=format&fit=crop';
const MOCK_IMG = 'https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=900&q=80&auto=format&fit=crop';

const SERVICES = [
  {
    icon: 'route',
    title: 'Career Path Roadmap',
    desc: 'AI-driven step-by-step progression from your current level to your dream role — with skill milestones and industry insights built for your profile.',
    tag: 'Personalized',
    color: '#002E5D',
    bg: 'rgba(0,46,93,0.07)',
  },
  {
    icon: 'style',
    title: 'Interview Prep',
    desc: 'Curated flashcard library tailored to your chosen role and industry, continuously powered by real hiring data from top recruiters.',
    tag: 'AI-Curated',
    color: '#166534',
    bg: 'rgba(22,101,52,0.07)',
  },
  {
    icon: 'smart_toy',
    title: 'AI Mock Interview',
    desc: 'Simulate live interviews with an AI hiring manager that analyzes your tone, confidence, body language and answer depth in real time.',
    tag: 'Live Analysis',
    color: '#6b21a8',
    bg: 'rgba(107,33,168,0.07)',
  },
];

const STATS = [
  { val: '2,400+', label: 'Students Placed' },
  { val: '94%', label: 'Interview Success' },
  { val: '50+', label: 'Partner Companies' },
  { val: '3', label: 'AI Services' },
];

const landingThemeVars: CSSProperties = {
  ['--primary' as string]: '#001938',
  ['--primary-container' as string]: '#002E5D',
  ['--secondary' as string]: '#E9C349',
  ['--accent' as string]: '#7697CC',
};

const Landing = () => {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const toLogin = (event?: MouseEvent<HTMLElement>) => {
    event?.preventDefault();
    navigate('/login');
  };

  const toRegister = (event?: MouseEvent<HTMLElement>) => {
    event?.preventDefault();
    navigate('/register');
  };

  return (
    <div className="landing-new" style={landingThemeVars}>
      <nav style={{ position: 'relative', zIndex: 200 }}>
        <div style={{ background: 'rgba(0,25,56,0.7)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, background: 'rgba(255,255,255,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 18, fontStyle: 'italic', fontFamily: 'Noto Serif, serif' }}>S</div>
              <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', color: '#fff' }}>SRMAP</span>
            </div>
            <div style={{ display: 'flex', gap: 28 }}>
              {['Career Path', 'Interview Prep', 'Mock Interview'].map((label) => (
                <button
                  key={label}
                  onClick={toLogin}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', transition: 'color 0.2s' }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-ghost-white" style={{ padding: '10px 24px', fontSize: '0.8rem' }} onClick={toLogin}>Sign In</button>
              <button className="btn-secondary" style={{ padding: '10px 24px', fontSize: '0.8rem' }} onClick={toRegister}>Get Started</button>
            </div>
          </div>
        </div>
      </nav>

      <div>
        <section style={{
          minHeight: 'calc(100vh - 72px)',
          background: 'var(--primary)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          clipPath: 'polygon(0 0, 100% 0, 100% 94%, 0 100%)',
        }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.13, mixBlendMode: 'overlay' }}>
            <img src={HERO_IMG} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ position: 'absolute', top: '-15%', right: '-8%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(118,151,204,0.2) 0%, transparent 65%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-10%', left: '15%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,195,73,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '20%', right: '5%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,195,73,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />

          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 32px', width: '100%' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 72, alignItems: 'center' }}>
              <div>
                <div className="fade-in-up">
                  <span style={{ color: 'var(--secondary)', fontWeight: 900, letterSpacing: '0.28em', fontSize: '0.65rem', textTransform: 'uppercase', display: 'block', marginBottom: 28 }}>
                    ✦ AI-Powered Career Hub — SRM University AP
                  </span>
                </div>
                <h1 className="font-headline fade-in-up fade-in-up-delay-1" style={{
                  fontSize: 'clamp(3rem, 6.5vw, 5.5rem)',
                  color: '#fff', lineHeight: 1.06, fontWeight: 700, marginBottom: 28,
                }}>
                  Define Your<br />
                  <span style={{ color: 'var(--secondary)', fontStyle: 'italic' }}>Future Now.</span>
                </h1>
                <p className="fade-in-up fade-in-up-delay-2" style={{
                  color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem',
                  maxWidth: 520, lineHeight: 1.8, marginBottom: 48,
                }}>
                  From campus to career — an intelligent platform that maps your trajectory, sharpens your edge, and validates your readiness with AI precision.
                </p>

                <div className="fade-in-up fade-in-up-delay-3" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <button className="btn-secondary pulse-glow" onClick={toRegister} style={{ fontSize: '0.95rem', padding: '16px 40px' }}>
                    Get Started Free
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>
                  </button>
                  <button className="btn-ghost-white" onClick={toLogin} style={{ padding: '16px 32px', fontSize: '0.875rem' }}>
                    Sign In
                  </button>
                </div>

                <div className="fade-in-up fade-in-up-delay-4" style={{ display: 'flex', gap: 48, marginTop: 60 }}>
                  {STATS.map(({ val, label }) => (
                    <div key={label}>
                      <div className="font-headline" style={{ color: 'var(--secondary)', fontSize: '2rem', fontWeight: 700 }}>{val}</div>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="float-anim fade-in-up fade-in-up-delay-2">
                <div className="glass" style={{ borderRadius: 40, padding: 28 }}>
                  <div style={{ borderRadius: 28, overflow: 'hidden', marginBottom: 22, border: '1px solid rgba(255,255,255,0.08)', aspectRatio: '1/1' }}>
                    <img src={CARD_IMG} alt="Career Journey" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <h4 className="font-headline" style={{ color: '#fff', fontSize: '1.4rem', fontStyle: 'italic', marginBottom: 10 }}>
                    Tailored for You.
                  </h4>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', lineHeight: 1.7, marginBottom: 20 }}>
                    Choose your industry to unlock personalized career modules and AI-powered roadmap insights.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['FinTech', 'HealthTech', 'AI / ML'].map((tag) => (
                      <span key={tag} className="chip" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)' }}>{tag}</span>
                    ))}
                  </div>
                  <button className="btn-secondary" onClick={toRegister} style={{ width: '100%', justifyContent: 'center', marginTop: 24, padding: '14px' }}>
                    Begin Your Path
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>rocket_launch</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section style={{
          padding: '140px 32px 120px',
          background: '#fff',
          marginTop: '-4vh',
          clipPath: 'polygon(0 5%, 100% 0, 100% 95%, 0 100%)',
          position: 'relative',
        }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 80 }}>
              <span style={{ color: 'var(--primary-container)', fontWeight: 900, fontSize: '0.65rem', letterSpacing: '0.28em', textTransform: 'uppercase', display: 'block', marginBottom: 16 }}>
                Our Platform
              </span>
              <h2 className="font-headline" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.2rem)', color: 'var(--primary)', fontWeight: 700, lineHeight: 1.15 }}>
                Three Pillars of<br /><span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>Excellence.</span>
              </h2>
              <p style={{ color: '#64748b', fontSize: '1.05rem', maxWidth: 560, margin: '20px auto 0', lineHeight: 1.75 }}>
                Everything you need to go from student to standout professional — powered by AI, built for SRM AP.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }}>
              {SERVICES.map((service, index) => (
                <div
                  key={service.title}
                  className={`card fade-in-up fade-in-up-delay-${index + 1}`}
                  style={{
                    cursor: 'pointer',
                    border: hoveredCard === index ? `2px solid ${service.color}` : '2px solid transparent',
                    background: hoveredCard === index ? service.bg : '#fff',
                    transform: hoveredCard === index ? 'translateY(-8px)' : 'none',
                    boxShadow: hoveredCard === index ? '0 24px 60px rgba(0,0,0,0.12)' : '0 4px 24px rgba(0,0,0,0.05)',
                    transition: 'all 0.35s cubic-bezier(0.22,1,0.36,1)',
                    display: 'flex', flexDirection: 'column',
                    padding: 32, borderRadius: 28,
                  }}
                  onMouseEnter={() => setHoveredCard(index)}
                  onMouseLeave={() => setHoveredCard(null)}
                  onClick={toLogin}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                    <div style={{
                      width: 60, height: 60, borderRadius: 18,
                      background: hoveredCard === index ? `${service.color}15` : service.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.3s',
                    }}>
                      <span className="material-symbols-outlined" style={{ color: service.color, fontSize: 30, fontVariationSettings: `'FILL' 1` }}>{service.icon}</span>
                    </div>
                    <span style={{
                      padding: '4px 12px', borderRadius: 100, fontSize: '0.62rem', fontWeight: 900,
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      background: service.bg, color: service.color,
                    }}>{service.tag}</span>
                  </div>

                  <h3 className="font-headline" style={{ fontSize: '1.4rem', color: 'var(--primary)', fontWeight: 700, marginBottom: 14, lineHeight: 1.3 }}>
                    {service.title}
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.75, flex: 1, marginBottom: 28 }}>{service.desc}</p>

                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    color: service.color, fontWeight: 800, fontSize: '0.8rem',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}>
                    Get Started
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: 72 }}>
              <button className="btn-primary pulse-glow" onClick={toRegister} style={{ padding: '18px 56px', fontSize: '1rem' }}>
                Join SRM AP Career Hub
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>school</span>
              </button>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: 16 }}>
                Free for all SRM AP students · No credit card required
              </p>
            </div>
          </div>
        </section>

        <section style={{
          background: 'var(--primary)', padding: '140px 32px',
          clipPath: 'polygon(0 5%, 100% 0, 100% 95%, 0 100%)',
          marginTop: '-4vh', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(118,151,204,0.14), transparent)', pointerEvents: 'none' }} />
          <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <span style={{ color: 'var(--secondary)', fontWeight: 900, fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', display: 'block', marginBottom: 16 }}>
              Phase 03 / Validation
            </span>
            <h2 className="font-headline" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', color: '#fff', fontWeight: 700, marginBottom: 60 }}>
              The AI <span style={{ color: 'var(--secondary)', fontStyle: 'italic' }}>Mirror.</span>
            </h2>

            <div style={{
              position: 'relative', borderRadius: 48, overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 50px 120px rgba(0,0,0,0.6)',
              aspectRatio: '16/9', maxWidth: 960, margin: '0 auto 56px',
            }}>
              <img src={MOCK_IMG} alt="AI Mock Interview" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />

              <div style={{
                position: 'absolute', top: 24, left: 24,
                background: '#dc2626', color: '#fff', borderRadius: 100,
                padding: '6px 16px', fontSize: '0.7rem', fontWeight: 800,
                letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span className="blink" style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%', display: 'inline-block' }} />
                REC: LIVE SESSION
              </div>

              <div style={{
                position: 'absolute', top: 20, right: 20, bottom: 80, width: 240,
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                {[
                  { label: 'Confidence', val: '88%', bar: 88, icon: 'psychology' },
                  { label: 'Clarity', val: '92%', bar: 92, icon: 'record_voice_over' },
                ].map((item) => (
                  <div key={item.label} style={{
                    padding: 16, background: 'rgba(0,25,56,0.65)', backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: 16, fontVariationSettings: `'FILL' 1` }}>{item.icon}</span>
                      <span style={{ color: 'var(--secondary)', fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{item.label}</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 100, overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ height: '100%', width: `${item.bar}%`, background: 'var(--secondary)', borderRadius: 100 }} />
                    </div>
                    <span style={{ color: '#fff', fontWeight: 900, fontSize: '0.8rem' }}>{item.val}</span>
                  </div>
                ))}
              </div>

              <div style={{
                position: 'absolute', bottom: 20, left: 20, right: 20,
                background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(16px)',
                borderRadius: 100, padding: '14px 28px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#fff', fontSize: '0.875rem' }}>
                  <div style={{ width: 10, height: 10, background: '#22c55e', borderRadius: '50%' }} />
                  Scene: Distributed System Architect Review
                </div>
                <button className="btn-secondary" style={{ padding: '8px 20px', fontSize: '0.72rem' }} onClick={toRegister}>
                  Launch Interview
                </button>
              </div>
            </div>

            <button className="btn-secondary pulse-glow" onClick={toLogin} style={{ fontSize: '1rem', padding: '18px 52px' }}>
              Get Started Free
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>rocket_launch</span>
            </button>
          </div>
        </section>

        <footer style={{ background: '#000d1f', paddingTop: 80, paddingBottom: 40 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 56, marginBottom: 64 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 34, height: 34, background: 'var(--secondary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 900, fontSize: 15, fontStyle: 'italic', fontFamily: 'Noto Serif, serif' }}>S</div>
                  <span style={{ color: '#fff', fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.03em' }}>SRMAP</span>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem', lineHeight: 1.8, marginBottom: 28 }}>
                  SRM University AP, Andhra Pradesh.<br />
                  Empowering students through AI-driven career navigation.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  {['public', 'alternate_email', 'school'].map((icon) => (
                    <a
                      key={icon}
                      href="#"
                      style={{
                        width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.background = 'rgba(233,195,73,0.15)';
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18 }}>{icon}</span>
                    </a>
                  ))}
                </div>
              </div>

              {([
                ['Platform', ['Career Path Map', 'Interview Flashcards', 'Mock AI Simulator', 'Expert Consultation']],
                ['Institutional', ['University Site', 'Placements 2024', 'Student Portal', 'Contact Support']],
                ['Connect', ['LinkedIn', 'Instagram', 'Email Us', 'FAQ']],
              ] as Array<[string, string[]]>).map(([title, items]) => (
                <div key={title}>
                  <h5 style={{ color: 'var(--secondary)', fontWeight: 900, fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 24 }}>{title}</h5>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {(items as string[]).map((item) => (
                      <li key={item}>
                        <a
                          href="#"
                          onClick={toRegister}
                          style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem', textDecoration: 'none', transition: 'color 0.2s' }}
                          onMouseEnter={(event) => {
                            event.currentTarget.style.color = '#fff';
                          }}
                          onMouseLeave={(event) => {
                            event.currentTarget.style.color = 'rgba(255,255,255,0.45)';
                          }}
                        >
                          {item}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                © 2025 SRM University AP. All Rights Reserved.
              </p>
              <div style={{ display: 'flex', gap: 32 }}>
                {['Privacy', 'Terms', 'Credits'].map((label) => (
                  <a
                    key={label}
                    href="#"
                    style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.color = 'var(--secondary)';
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.color = 'rgba(255,255,255,0.18)';
                    }}
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Landing;
