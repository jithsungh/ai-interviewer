import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { getCurrentUser } from '@/services/candidateService';
import type { User } from '@/types/database';

const navLinks = [
  { id: 'dashboard', label: 'Dashboard', path: '/candidate/dashboard' },
  { id: 'roadmap', label: 'Career Path', path: '/candidate/roadmap' },
  { id: 'prep', label: 'Interview Prep', path: '/candidate/interview-prep' },
  { id: 'interviews', label: 'Mock Interview', path: '/candidate/interviews' },
];

export function CandidateHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    getCurrentUser().then(setCurrentUser).catch(console.error);
  }, []);

  useEffect(() => {
    document.body.classList.add('has-candidate-header');
    return () => document.body.classList.remove('has-candidate-header');
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!profileMenuRef.current) return;
      if (!profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setShowProfileMenu(false);
  }, [location.pathname]);

  const getCurrentPageId = () => {
    for (const link of navLinks) {
      if (location.pathname === link.path || location.pathname.startsWith(link.path)) {
        return link.id;
      }
    }
    return 'dashboard';
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
    setShowProfileMenu(false);
    setMobileMenuOpen(false);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="candidate-header" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200 }}>
      <nav
        className="candidate-header-nav"
        style={{
          background: scrolled ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          transition: 'all 0.3s',
        }}
      >
        <div
          className="candidate-header-inner"
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '0 32px',
            height: 72,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            className="candidate-header-brand"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
            }}
            onClick={() => handleNavigate('/')}
          >
            <div
              style={{
                width: 38,
                height: 38,
                background: 'var(--primary-container, #001938)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 900,
                fontSize: 18,
                fontStyle: 'italic',
                fontFamily: "'Noto Serif', serif",
              }}
            >
              S
            </div>
            <span
              style={{
                fontSize: 22,
                fontWeight: 900,
                letterSpacing: '-0.04em',
                color: 'var(--primary, #001938)',
              }}
            >
              SRM AP
            </span>
            <span
              className="candidate-header-brand-text"
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#64748b',
                marginLeft: -4,
              }}
            >
              Career Portal
            </span>
          </div>

          <div className="candidate-header-links" style={{ display: 'flex', gap: 30, alignItems: 'center' }}>
            {navLinks.map((link) => {
              const isActive = getCurrentPageId() === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => handleNavigate(link.path)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: isActive ? 'var(--primary-container, #001938)' : '#64748b',
                    borderBottom: isActive
                      ? '2px solid var(--secondary, #E9C349)'
                      : '2px solid transparent',
                    paddingBottom: 2,
                    transition: 'all 0.2s',
                    fontFamily: "'Manrope', sans-serif",
                  }}
                >
                  {link.label}
                </button>
              );
            })}
          </div>

          <div className="candidate-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className="candidate-header-menu-toggle"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                border: '1px solid #E5E7EB',
                background: '#fff',
                color: '#0F172A',
                fontSize: 20,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'none',
              }}
            >
              {mobileMenuOpen ? '×' : '☰'}
            </button>

            <div style={{ position: 'relative' }} ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu((prev) => !prev)}
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'var(--primary-container, #001938)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: 15,
                cursor: 'pointer',
                border: 'none',
              }}
              title={currentUser?.name ?? 'Profile'}
            >
              {currentUser?.name?.charAt(0) || 'U'}
            </button>

            {showProfileMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: 46,
                  right: 0,
                  minWidth: 150,
                  background: '#fff',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: 10,
                  boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
                  overflow: 'hidden',
                  zIndex: 30,
                }}
              >
                <button
                  onClick={() => {
                    handleNavigate('/candidate/profile');
                    setShowProfileMenu(false);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    padding: '10px 12px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    color: '#1f2937',
                    fontFamily: "'Manrope', sans-serif",
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    padding: '10px 12px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    color: '#991b1b',
                    fontFamily: "'Manrope', sans-serif",
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#fef2f2';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  Logout
                </button>
              </div>
            )}
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="candidate-header-mobile-panel">
            <div className="candidate-header-mobile-links">
              {navLinks.map((link) => {
                const isActive = getCurrentPageId() === link.id;
                return (
                  <button
                    key={link.id}
                    onClick={() => handleNavigate(link.path)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      borderRadius: 10,
                      padding: '10px 12px',
                      background: isActive ? 'rgba(0,25,56,0.08)' : 'transparent',
                      color: isActive ? '#001938' : '#475569',
                      fontWeight: 800,
                      fontSize: '0.76rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                  >
                    {link.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
