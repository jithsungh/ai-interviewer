import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerCandidate } from '@/services/authService';
import { useToast } from '@/hooks/use-toast';
import './Login.css';

type Step = 1 | 2 | 3;

interface FormData {
  // Step 1: Account
  email: string;
  password: string;
  confirmPassword: string;
  // Step 2: Basic Info
  full_name: string;
  phone: string;
  location: string;
  // Step 3: Professional
  bio: string;
  experience_years: string;
  skills: string[];
  linkedin_url: string;
  github_url: string;

  // Compliance
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  acceptHonorCode: boolean;
}

const STEPS = [
  { id: 1, title: 'University Account', description: 'Use your institutional email and secure password' },
  { id: 2, title: 'Profile Basics', description: 'Fill required profile details' },
  { id: 3, title: 'Professional & Compliance', description: 'Complete profile and required acknowledgements' },
];

const UNIVERSITY_EMAIL_REGEX = /^[^\s@]+@srmap\.edu\.in$/i;

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    location: '',
    bio: '',
    experience_years: '',
    skills: [],
    linkedin_url: '',
    github_url: '',
    acceptTerms: false,
    acceptPrivacy: false,
    acceptHonorCode: false,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const updateField = (field: keyof FormData, value: string | string[] | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateStep1 = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    } else if (!UNIVERSITY_EMAIL_REGEX.test(formData.email)) {
      newErrors.email = 'Use your university email (example: you@srmap.edu.in)';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    if (formData.phone.trim() && !/^[+]?[-()\d\s]{8,20}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Enter a valid phone number';
    }

    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (formData.experience_years && Number(formData.experience_years) < 0) {
      newErrors.experience_years = 'Experience cannot be negative';
    }

    if (formData.linkedin_url.trim() && !/^https?:\/\//i.test(formData.linkedin_url.trim())) {
      newErrors.linkedin_url = 'LinkedIn URL must start with http:// or https://';
    }

    if (formData.github_url.trim() && !/^https?:\/\//i.test(formData.github_url.trim())) {
      newErrors.github_url = 'GitHub URL must start with http:// or https://';
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept terms and conditions';
    }

    if (!formData.acceptPrivacy) {
      newErrors.acceptPrivacy = 'You must accept privacy and data processing terms';
    }

    if (!formData.acceptHonorCode) {
      newErrors.acceptHonorCode = 'You must acknowledge academic integrity expectations';
    }

    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep < 3) setCurrentStep((currentStep + 1) as Step);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((currentStep - 1) as Step);
  };

  const addSkill = () => {
    const skill = skillInput.trim();
    if (skill && !formData.skills.includes(skill) && formData.skills.length < 20) {
      updateField('skills', [...formData.skills, skill]);
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    updateField('skills', formData.skills.filter(s => s !== skillToRemove));
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  const handleSubmit = async () => {
    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }

    if (!validateStep2()) {
      setCurrentStep(2);
      return;
    }

    if (!validateStep3()) {
      setCurrentStep(3);
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await registerCandidate({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name || undefined,
        phone: formData.phone || undefined,
        location: formData.location || undefined,
        bio: formData.bio || undefined,
        experience_years: formData.experience_years ? parseInt(formData.experience_years) : undefined,
        skills: formData.skills.length > 0 ? formData.skills : undefined,
        linkedin_url: formData.linkedin_url || undefined,
        github_url: formData.github_url || undefined,
      });

      toast({
        title: 'Registration Successful!',
        description: 'You can now sign in with your credentials.',
      });
      navigate('/login');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Registration failed. Please check your details and try again.');
      toast({
        title: 'Registration Failed',
        description: error.message || 'Please check your details and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
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
    fontSize: '1.02rem',
    outline: 'none',
    transition: 'border-color 0.3s, box-shadow 0.3s',
    WebkitTextFillColor: '#fff',
    caretColor: 'var(--secondary)',
  } as const;

  const stepLine = (stepId: number) => currentStep >= stepId ? '#E9C349' : 'rgba(255,255,255,0.18)';

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

      <div className="login-bg-overlay" />
      <div className="login-orb login-orb-left" />
      <div className="login-orb login-orb-right" />

      <div className="login-shell page-enter">
        <div className="login-left fade-in-up">
          <span className="login-kicker">✦ New Candidate Setup</span>
          <h1 className="font-headline login-title">Create your<br /><span>Account.</span></h1>
          <p className="login-copy">Use your university credentials, complete profile details, and agree to compliance terms to get started.</p>

          <div className="login-feature-list">
            <div className="login-feature">
              <div className="login-feature-icon"><span className="material-symbols-outlined login-symbol" style={{ fontVariationSettings: `'FILL' 1` }}>school</span></div>
              <span>Institutional Email Verification</span>
            </div>
            <div className="login-feature">
              <div className="login-feature-icon"><span className="material-symbols-outlined login-symbol" style={{ fontVariationSettings: `'FILL' 1` }}>policy</span></div>
              <span>Compliance & Integrity Acknowledgement</span>
            </div>
            <div className="login-feature">
              <div className="login-feature-icon"><span className="material-symbols-outlined login-symbol" style={{ fontVariationSettings: `'FILL' 1` }}>rocket_launch</span></div>
              <span>Access Interview Prep and Mock Sessions</span>
            </div>
          </div>

          <div className="login-left-footer">
            <p>
              Already registered?{' '}
              <Link to="/login" className="login-link-inline">
                Sign In →
              </Link>
            </p>
          </div>
        </div>

        <div className="login-form-card fade-in-up fade-in-up-delay-1">
          <h2 className="font-headline login-form-title">Create Account</h2>
          <p className="login-form-subtitle">Step {currentStep} of 3 · {STEPS[currentStep - 1].title}</p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ width: 26, height: 26, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${stepLine(1)}`, color: stepLine(1), fontSize: 12, fontWeight: 700 }}>1</span>
            <span style={{ flex: 1, height: 2, background: stepLine(2) }} />
            <span style={{ width: 26, height: 26, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${stepLine(2)}`, color: stepLine(2), fontSize: 12, fontWeight: 700 }}>2</span>
            <span style={{ flex: 1, height: 2, background: stepLine(3) }} />
            <span style={{ width: 26, height: 26, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${stepLine(3)}`, color: stepLine(3), fontSize: 12, fontWeight: 700 }}>3</span>
          </div>

          <div className="login-form-stack">
            {error && (
              <div className="login-error" role="alert">
                <span className="material-symbols-outlined login-symbol">error</span>
                <span>{error}</span>
              </div>
            )}

            {currentStep === 1 && (
              <>
                <div>
                  <label className="login-label">University Email</label>
                  <input
                    type="email"
                    placeholder="you@srmap.edu.in"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    style={inputBase}
                  />
                  {errors.email && <div className="login-error" style={{ marginTop: 8 }}><span>{errors.email}</span></div>}
                </div>

                <div>
                  <label className="login-label">Password</label>
                  <div className="login-password-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create password"
                      value={formData.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      style={{ ...inputBase, paddingRight: 40 }}
                    />
                    <button type="button" onClick={() => setShowPassword((value) => !value)} className="login-icon-button">
                      <span className="material-symbols-outlined login-symbol">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                  {errors.password && <div className="login-error" style={{ marginTop: 8 }}><span>{errors.password}</span></div>}
                </div>

                <div>
                  <label className="login-label">Confirm Password</label>
                  <div className="login-password-wrap">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm password"
                      value={formData.confirmPassword}
                      onChange={(e) => updateField('confirmPassword', e.target.value)}
                      style={{ ...inputBase, paddingRight: 40 }}
                    />
                    <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className="login-icon-button">
                      <span className="material-symbols-outlined login-symbol">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                  {errors.confirmPassword && <div className="login-error" style={{ marginTop: 8 }}><span>{errors.confirmPassword}</span></div>}
                </div>
              </>
            )}

            {currentStep === 2 && (
              <>
                <div>
                  <label className="login-label">Full Name</label>
                  <input
                    type="text"
                    placeholder="Your full name"
                    value={formData.full_name}
                    onChange={(e) => updateField('full_name', e.target.value)}
                    style={inputBase}
                  />
                  {errors.full_name && <div className="login-error" style={{ marginTop: 8 }}><span>{errors.full_name}</span></div>}
                </div>

                <div>
                  <label className="login-label">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91..."
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    style={inputBase}
                  />
                  {errors.phone && <div className="login-error" style={{ marginTop: 8 }}><span>{errors.phone}</span></div>}
                </div>

                <div>
                  <label className="login-label">Location</label>
                  <input
                    type="text"
                    placeholder="City, State"
                    value={formData.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    style={inputBase}
                  />
                </div>
              </>
            )}

            {currentStep === 3 && (
              <>
                <div>
                  <label className="login-label">Years of Experience</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    placeholder="0"
                    value={formData.experience_years}
                    onChange={(e) => updateField('experience_years', e.target.value)}
                    style={inputBase}
                  />
                  {errors.experience_years && <div className="login-error" style={{ marginTop: 8 }}><span>{errors.experience_years}</span></div>}
                </div>

                <div>
                  <label className="login-label">Skills</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      placeholder="Add skill and press Enter"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={handleSkillKeyDown}
                      style={{ ...inputBase, flex: 1 }}
                    />
                    <button type="button" className="login-google" style={{ width: 44, minWidth: 44, padding: 0 }} onClick={addSkill}>+</button>
                  </div>
                  {formData.skills.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {formData.skills.map((skill) => (
                        <span key={skill} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 12 }}>
                          {skill}
                          <button type="button" onClick={() => removeSkill(skill)} style={{ color: '#C9A84C' }}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="login-label">Bio / Summary</label>
                  <textarea
                    placeholder="Tell us about yourself"
                    value={formData.bio}
                    onChange={(e) => updateField('bio', e.target.value)}
                    rows={3}
                    style={{ ...inputBase, resize: 'vertical', minHeight: 86 }}
                  />
                </div>

                <div>
                  <label className="login-label">LinkedIn URL</label>
                  <input
                    type="url"
                    placeholder="https://linkedin.com/in/..."
                    value={formData.linkedin_url}
                    onChange={(e) => updateField('linkedin_url', e.target.value)}
                    style={inputBase}
                  />
                  {errors.linkedin_url && <div className="login-error" style={{ marginTop: 8 }}><span>{errors.linkedin_url}</span></div>}
                </div>

                <div>
                  <label className="login-label">GitHub URL</label>
                  <input
                    type="url"
                    placeholder="https://github.com/..."
                    value={formData.github_url}
                    onChange={(e) => updateField('github_url', e.target.value)}
                    style={inputBase}
                  />
                  {errors.github_url && <div className="login-error" style={{ marginTop: 8 }}><span>{errors.github_url}</span></div>}
                </div>

                <div style={{ border: '1px solid rgba(255,255,255,0.16)', borderRadius: 12, padding: 12, background: 'rgba(255,255,255,0.04)' }}>
                  <div style={{ color: '#C9A84C', fontWeight: 700, fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Compliance Acknowledgements</div>

                  <label style={{ display: 'flex', gap: 8, color: '#fff', fontSize: 13, marginBottom: 8 }}>
                    <input type="checkbox" checked={formData.acceptTerms} onChange={(e) => updateField('acceptTerms', e.target.checked)} />
                    <span>I accept the platform terms and conditions.</span>
                  </label>
                  {errors.acceptTerms && <div className="login-error" style={{ marginTop: 6, marginBottom: 8 }}><span>{errors.acceptTerms}</span></div>}

                  <label style={{ display: 'flex', gap: 8, color: '#fff', fontSize: 13, marginBottom: 8 }}>
                    <input type="checkbox" checked={formData.acceptPrivacy} onChange={(e) => updateField('acceptPrivacy', e.target.checked)} />
                    <span>I consent to privacy and required data processing.</span>
                  </label>
                  {errors.acceptPrivacy && <div className="login-error" style={{ marginTop: 6, marginBottom: 8 }}><span>{errors.acceptPrivacy}</span></div>}

                  <label style={{ display: 'flex', gap: 8, color: '#fff', fontSize: 13 }}>
                    <input type="checkbox" checked={formData.acceptHonorCode} onChange={(e) => updateField('acceptHonorCode', e.target.checked)} />
                    <span>I acknowledge academic integrity expectations.</span>
                  </label>
                  {errors.acceptHonorCode && <div className="login-error" style={{ marginTop: 6 }}><span>{errors.acceptHonorCode}</span></div>}
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              {currentStep > 1 && (
                <button type="button" className="login-google" onClick={handleBack} style={{ flex: 1 }}>
                  <span className="material-symbols-outlined login-symbol">arrow_back</span>
                  Back
                </button>
              )}

              {currentStep < 3 ? (
                <button type="button" className="btn-secondary login-submit" onClick={handleNext} style={{ flex: 1 }}>
                  Next
                  <span className="material-symbols-outlined login-symbol">arrow_forward</span>
                </button>
              ) : (
                <button type="button" className="btn-secondary login-submit" onClick={handleSubmit} disabled={isLoading} style={{ flex: 1 }}>
                  {isLoading ? (
                    <>
                      <span className="login-spinner login-symbol">progress_activity</span>
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <span className="material-symbols-outlined login-symbol">arrow_forward</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {currentStep < 3 && (
              <button
                type="button"
                className="login-text-button"
                onClick={() => {
                  if (currentStep === 1 && !validateStep1()) return;
                  if (currentStep === 2 && !validateStep2()) return;
                  handleSubmit();
                }}
                style={{ width: '100%', textAlign: 'center' }}
              >
                Skip optional steps & create account
              </button>
            )}
          </div>

          <div className="text-sm text-center text-muted-foreground" style={{ marginTop: 16 }}>
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
