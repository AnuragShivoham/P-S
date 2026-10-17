import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { User, ArrowRight, Loader2, AlertCircle, CheckCircle2, Building2, BriefcaseBusiness } from 'lucide-react';
import { api } from '../api/client';
import { useStore } from '../store';
import { getDashboardPathForRole, getPrimaryRole } from '../utils/roleUtils';

export default function SignupPage() {
  const navigate = useNavigate();
  const { setAuth, token } = useStore();
  
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [role, setRole] = useState('student');
  const [roleProfile, setRoleProfile] = useState({ student: '', citizen: '', employer: '' });
  const [step, setStep] = useState('signup'); // signup, otp
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  // If already logged in, redirect
  useEffect(() => {
    if (token) navigate('/');
  }, [token, navigate]);

  const roleFieldMeta = {
    student: { label: 'School / College', placeholder: 'e.g. IIT Delhi' },
    citizen: { label: 'Your community focus', placeholder: 'e.g. Climate, education, health' },
    employer: { label: 'Company / Organization', placeholder: 'e.g. Example Technologies' },
  };

  const handleSendOtp = async () => {
    if (!email) return setError('Email is required');
    if (!name) return setError('Name is required');
    if (!roleProfile[role]) return setError(`${roleFieldMeta[role].label} is required`);
    setLoading(true);
    setError('');
    try {
      const res = await api.sendOtp(email, 'signup', {
        profile: {
          role,
          signup_detail: roleProfile[role] || '',
          selected_role: role,
        },
      });
      setMsg(res.message);
      setStep('otp');
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleGoogleSuccess = async (response) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.loginGoogle(response.credential, role, {
        role,
        signup_detail: roleProfile[role] || '',
        selected_role: role,
      });
      setAuth(res.user, res.token);
      const activeRole = getPrimaryRole(res.user);
      if (!res.user.onboarded && activeRole !== 'admin' && activeRole !== 'mentor' && activeRole !== 'university') {
        navigate('/onboarding');
      } else {
        navigate(getDashboardPathForRole(activeRole));
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp) return setError('OTP is required');
    if (!roleProfile[role]) return setError(`${roleFieldMeta[role].label} is required`);
    setLoading(true);
    setError('');
    try {
      const res = await api.verifyOtp(email, otp, name, role, 'signup', {
        profile: {
          role,
          signup_detail: roleProfile[role] || '',
          selected_role: role,
        },
      });
      setAuth(res.user, res.token);
      const activeRole = getPrimaryRole(res.user);
      if (!res.user.onboarded && activeRole !== 'admin' && activeRole !== 'mentor' && activeRole !== 'university') {
        navigate('/onboarding');
      } else {
        navigate(getDashboardPathForRole(activeRole));
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="goal-pg fade-in">
      <div className="goal-box" style={{ maxWidth: 420 }}>
        <div className="g-eye">CREATE ACCOUNT</div>
        <h1 className="g-h1">
          {step === 'signup' && 'Join SOCRATES'}
          {step === 'otp' && 'Verify Email'}
        </h1>
        <p className="g-sub">
          {step === 'signup' && 'Create your account to start your AI-guided journey.'}
          {step === 'otp' && `We've sent a 6-digit code to ${email}.`}
        </p>

        {error && (
          <div className="err" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {msg && !error && (
          <div className="succ" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, borderRadius: 8 }}>
            <CheckCircle2 size={16} /> {msg}
          </div>
        )}

        {step === 'signup' && (
          <div className="slide-down">
            <div style={{ marginBottom: 16 }}>
              <label className="lbl">Role Selection — choose the role for this account</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  onClick={() => setRole('student')}
                  className={`btn ${role === 'student' ? 'btn-p' : 'btn-g'}`}
                  style={{ justifyContent: 'center', fontSize: 10 }}
                >
                  <User size={13} /> Student
                </button>
                <button
                  onClick={() => setRole('citizen')}
                  className={`btn ${role === 'citizen' ? 'btn-p' : 'btn-g'}`}
                  style={{ justifyContent: 'center', fontSize: 10 }}
                >
                  🌍 Citizen
                </button>
                <button
                  onClick={() => navigate('/signup?role=university')}
                  className="btn btn-g"
                  style={{ justifyContent: 'center', fontSize: 10 }}
                >
                  <Building2 size={13} /> University
                </button>
                <button
                  onClick={() => setRole('employer')}
                  className={`btn ${role === 'employer' ? 'btn-p' : 'btn-g'}`}
                  style={{ justifyContent: 'center', fontSize: 10 }}
                >
                  <BriefcaseBusiness size={13} /> Company
                </button>
              </div>
              <p style={{ color: 'var(--tx-2)', fontSize: 11, margin: '8px 0 0' }}>{role === 'employer' ? 'Company accounts can create an employer profile and access employer features.' : 'Select a role to continue. University registration requires administrator approval.'}</p>
            </div>

            {role !== 'admin' && (
              <>
                <div style={{ marginTop: 24, marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Google Sign Up Failed')}
                    theme="filled_black"
                    shape="pill"
                    width="380"
                    text="signup_with"
                  />
                </div>

                <div style={{ position: 'relative', textAlign: 'center', marginBottom: 24 }}>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
                  <span style={{ 
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    background: 'var(--bg)', padding: '0 12px', color: 'var(--tx-m)', fontSize: 10, letterSpacing: '.1em'
                  }}>OR EMAIL</span>
                </div>
              </>
            )}

            <div style={{ marginBottom: 16 }}>
              <label className="lbl">Full Name</label>
              <input 
                type="text" 
                className="input" 
                placeholder="John Doe"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            {role !== 'admin' && (
              <div style={{ marginBottom: 16 }}>
                <label className="lbl">{roleFieldMeta[role]?.label}</label>
                <input
                  type="text"
                  className="input"
                  placeholder={roleFieldMeta[role]?.placeholder}
                  value={roleProfile[role] || ''}
                  onChange={(e) => setRoleProfile(prev => ({ ...prev, [role]: e.target.value }))}
                />
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label className="lbl">Email Address</label>
              <input 
                type="email" 
                className="input" 
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <button 
              className="btn btn-p" 
              style={{ width: '100%', justifyContent: 'center', height: 44 }}
              onClick={handleSendOtp}
              disabled={loading}
            >
              {loading ? <Loader2 className="spin" /> : <>Sign Up <ArrowRight size={16} /></>}
            </button>

            <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: 'var(--tx-2)' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#58a6ff', textDecoration: 'none' }}>
                Sign In
              </Link>
            </div>
          </div>
        )}

        {step === 'otp' && (
          <div className="slide-down">
            <div style={{ marginBottom: 20 }}>
              <label className="lbl">Verification Code</label>
              <input 
                type="text" 
                className="input" 
                placeholder="6-digit code"
                style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8, fontWeight: 800 }}
                value={otp}
                onChange={e => setOtp(e.target.value)}
                maxLength={6}
              />
            </div>

            <button 
              className="btn btn-p" 
              style={{ width: '100%', justifyContent: 'center', height: 44 }}
              onClick={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? <Loader2 className="spin" /> : <>Verify & Access <ArrowRight size={16} /></>}
            </button>
            <button 
              className="btn" 
              style={{ width: '100%', marginTop: 12, background: 'transparent', color: 'var(--tx-2)' }}
              onClick={() => setStep('signup')}
            >
              Back to Sign Up
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
