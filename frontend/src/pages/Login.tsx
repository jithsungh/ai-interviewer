import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '@/services/apiClient';
import { initAuth, isAuthenticated, login } from '@/services/authService';
import './Login.css';

const HERO_IMG = 'https://images.unsplash.com/photo-1562774053-701939374585?w=1600&q=80&auto=format&fit=crop';

const KNOWN_USERS: Record<string, {
  name: string;
  regNo: string;
  dept: string;
  role: string;
  industry: string;
  level: string;
  progress: number;
}> = {
  'arjun@srmap.edu.in': {
    name: 'Arjun Sharma',
    regNo: 'AP22110010042',
    dept: 'Computer Science',
    role: 'Software Engineer',
    industry: 'FinTech',
    level: 'Entry Level',
    progress: 72,
  },
  'priya@srmap.edu.in': {
    name: 'Priya Mehta',
    regNo: 'AP22110011020',
    dept: 'Data Science',
    role: 'ML Engineer',
    industry: 'Artificial Intelligence',
    level: 'Junior',
    progress: 45,
  },
};

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [detected, setDetected] = useState<null | (typeof KNOWN_USERS)[string]>(null);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/candidate/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleEmailBlur = () => {
    setDetected(KNOWN_USERS[normalizedEmail] || null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setError('');
    setIsLoading(true);
    try {
      await login({ email, password });
      initAuth();
      navigate('/candidate/dashboard', { replace: true });
    } catch (err) {
      const message = err instanceof ApiError
        ? (typeof err.body === 'object' && err.body && 'detail' in err.body
          ? String((err.body as { detail?: unknown }).detail ?? 'Invalid email or password. Please try again.')
          : 'Invalid email or password. Please try again.')
        : 'Login failed. Please check your connection and try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setError('Password reset is not configured in this deployment yet.');
  };

  const handleGoogleSignIn = () => {
    setError('Google sign-in is not enabled in this deployment yet.');
  };

  const inputBase = {
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 12,
    color: '#fff',
    padding: '14px 16px',
    fontFamily: 'Noto Serif, serif',
    fontStyle: 'italic',
    fontSize: '1.1rem',
    outline: 'none',
    transition: 'border-color 0.3s, box-shadow 0.3s',
    WebkitTextFillColor: '#fff',
    caretColor: 'var(--secondary)',
  } as const;

  return (
    <div className="login-new">
      <header className="login-topbar">
        <div className="login-topbar-inner">
          <Link to="/" className="login-brand" aria-label="Go to home">
            <div className="login-brand-icon">S</div>
            <span className="login-brand-text">SRM AP <span>Career Portal</span></span>
          </Link>

          <Link to="/" className="login-home-link">
            <span className="material-symbols-outlined login-symbol">arrow_back</span>
            Back to Home
          </Link>
        </div>
      </header>

      <div className="login-bg-overlay">
        <img src={HERO_IMG} alt="" className="login-bg-image" />
      </div>
      <div className="login-orb login-orb-left" />
      <div className="login-orb login-orb-right" />

      <div className="login-shell page-enter">
        <div className="login-left fade-in-up">
          <span className="login-kicker">✦ Welcome Back to SRMAP</span>
          <h1 className="font-headline login-title">Your Career<br /><span>Awaits.</span></h1>
          <p className="login-copy">Sign in to access your personalized roadmap, AI-curated prep materials, and the mock interview coach.</p>

          <div className="login-feature-list">
            {[
              { icon: 'route', text: 'Career Path Roadmap' },
              { icon: 'style', text: 'Interview Prep Flashcards' },
              { icon: 'smart_toy', text: 'AI Mock Interview Coach' },
            ].map((feature, index) => (
              <div key={feature.text} className={`login-feature login-feature-delay-${index + 1}`}>
                <div className="login-feature-icon">
                  <span className="material-symbols-outlined login-symbol" style={{ fontVariationSettings: `'FILL' 1` }}>{feature.icon}</span>
                </div>
                <span>{feature.text}</span>
              </div>
            ))}
          </div>

          <div className="login-left-footer">
            <p>
              New student?{' '}
              <Link to="/register" className="login-link-inline">
                Create Account →
              </Link>
            </p>
          </div>
        </div>

        {detected && (
          <div className="login-detected slide-in-right">
            <div className="login-detected-header">
              <div className="login-avatar">{detected.name.charAt(0)}</div>
              <div>
                <div className="login-detected-name">{detected.name}</div>
                <div className="login-detected-meta">{detected.regNo}</div>
              </div>
            </div>

            <div className="login-returning-label">✦ Returning User</div>

            {[
              { label: 'Department', val: detected.dept },
              { label: 'Target Role', val: detected.role },
              { label: 'Industry', val: detected.industry },
              { label: 'Level', val: detected.level },
            ].map((item) => (
              <div key={item.label} className="login-info-row">
                <span>{item.label}</span>
                <span>{item.val}</span>
              </div>
            ))}

            <div className="login-progress-block">
              <div className="login-progress-top">
                <span>Roadmap Progress</span>
                <span>{detected.progress}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${detected.progress}%` }} />
              </div>
            </div>

            <div className="login-status-chip">
              <span className="material-symbols-outlined login-symbol" style={{ fontVariationSettings: `'FILL' 1` }}>trending_up</span>
              <span>Your roadmap is ready to continue</span>
            </div>
          </div>
        )}

        <div className="login-form-card fade-in-up fade-in-up-delay-1">
          <h2 className="font-headline login-form-title">
            {detected ? `Welcome back, ${detected.name.split(' ')[0]}` : 'Sign In'}
          </h2>
          <p className="login-form-subtitle">Enter your university credentials to continue.</p>

          <form onSubmit={handleLogin}>
            <div className="login-form-stack">
              <div>
                <label className="login-label">University Email</label>
                <input
                  type="email"
                  placeholder="yourname@srmap.edu.in"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                    setDetected(null);
                  }}
                  style={inputBase}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--secondary)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(233,195,73,0.15)';
                  }}
                  onBlur={(e) => {
                    handleEmailBlur();
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div>
                <label className="login-label">Password</label>
                <div className="login-password-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    style={{ ...inputBase, paddingRight: 40 }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--secondary)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(233,195,73,0.15)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="login-icon-button"
                  >
                    <span className="material-symbols-outlined login-symbol">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="login-forgot-row">
                <button type="button" className="login-text-button" onClick={handleForgotPassword}>
                  Forgot password?
                </button>
              </div>

              {error && (
                <div className="login-error" role="alert">
                  <span className="material-symbols-outlined login-symbol">error</span>
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="btn-secondary login-submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="login-spinner login-symbol">progress_activity</span>
                    Signing In...
                  </>
                ) : (
                  <>
                    Sign In
                    <span className="material-symbols-outlined login-symbol">arrow_forward</span>
                  </>
                )}
              </button>

              <div className="login-divider">
                <span />
                <span>or continue with</span>
                <span />
              </div>

              <button type="button" className="login-google" onClick={handleGoogleSignIn}>
                <svg width="18" height="18" viewBox="0 0 488 512" aria-hidden="true">
                  <path fill="#4285F4" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"/>
                </svg>
                Continue with Google
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`@keyframes loginSpin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
};

export default Login;
