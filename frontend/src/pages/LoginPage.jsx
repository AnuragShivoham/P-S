import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Shield, ShieldAlert, User, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { useStore } from '../store';
import { getDashboardPathForRole, getPrimaryRole } from '../utils/roleUtils';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth, token, roles } = useStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState(searchParams.get('role') === 'university' ? 'university' : 'student');
  const [step, setStep] = useState('login'); // login, otp, role
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  // If already logged in, redirect to dashboard or goal
  useEffect(() => {
    if (token) navigate('/');
  }, [token, navigate]);

  const sanitizeAuthError = (message) => {
    const text = String(message || '');
    if (role === 'university' && /email delivery failed|failed to send email|portal access|contact admin/i.test(text)) {
      return 'Unable to Access !! Contact ADMIN for PORTAL ACCESS';
    }
    return text;
  };

  const handleSendOtp = async () => {
    if (!email) return setError('Email is required');
    setLoading(true);
    setError('');
    try {
      const res = await api.sendOtp(email, 'login');
      setMsg(res.message);
      setStep('otp');
    } catch (e) {
      setError(sanitizeAuthError(e.message));
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp) return setError('OTP is required');
    setLoading(true);
    setError('');
    try {
      const res = await api.verifyOtp(email, otp, name, role, 'login');
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

  const handleGoogleSuccess = async (response) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.loginGoogle(response.credential, role);
      setAuth(res.user, res.token);
      const activeRole = getPrimaryRole(res.user);
      if (!res.user.onboarded && activeRole !== 'admin' && activeRole !== 'mentor' && activeRole !== 'university') {
        navigate('/onboarding');
      } else {
        navigate(getDashboardPathForRole(activeRole));
      }
    } catch (e) {
      setError(sanitizeAuthError(e.message));
    }
    setLoading(false);
  };

  const handleAdminLogin = async () => {
    if (!email || !password) return setError('Admin email and password are required');
    setLoading(true);
    setError('');
    try {
      const res = await api.loginAdmin(email, password);
      setAuth(res.user, res.token);
      navigate(getDashboardPathForRole(getPrimaryRole(res.user)));
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="goal-pg fade-in">
      <div className="goal-box" style={{ maxWidth: 420 }}>
        <div className="g-eye">{step === 'role' ? 'CHOOSE YOUR PATH' : 'SECURE ACCESS'}</div>
        <h1 className="g-h1">
          {step === 'login' && 'Welcome Back'}
          {step === 'otp' && 'Verify Identity'}
          {step === 'role' && 'Select Role'}
        </h1>
        <p className="g-sub">
          {step === 'login' && 'Sign in to access your AI mentor and project dashboard.'}
          {step === 'otp' && `We've sent a 6-digit code to ${email}.`}
          {step === 'role' && 'Are you here to learn or to guide others?'}
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

        {step === 'login' && (
          <div className="slide-down">
            <div style={{ marginBottom: 16 }}>
              <label className="lbl">Choose an approved account role</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
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
                {roles?.includes('mentor') && <button
                  onClick={() => setRole('mentor')}
                  className={`btn ${role === 'mentor' ? 'btn-p' : 'btn-g'}`}
                  style={{ justifyContent: 'center', fontSize: 10 }}
                ><Shield size={13} /> Mentor</button>}
                <button
                  onClick={() => setRole('university')}
                  className={`btn ${role === 'university' ? 'btn-p' : 'btn-g'}`}
                  style={{ justifyContent: 'center', fontSize: 10 }}
                >🎓 University</button>
                <button
                  onClick={() => setRole('admin')}
                  className={`btn ${role === 'admin' ? 'btn-p' : 'btn-g'}`}
                  style={{ justifyContent: 'center', fontSize: 10 }}
                >
                  <ShieldAlert size={13} /> Admin
                </button>
              </div>
            </div>

            {role !== 'admin' && (
              <>
                <div style={{ marginTop: 24, marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Google Login Failed')}
                    theme="filled_black"
                    shape="pill"
                    width="380"
                    text="signin_with"
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

            {role === 'admin' && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ color: 'var(--tx-2)', fontSize: 11, lineHeight: 1.5, marginBottom: 10 }}>
                  Admin accounts must sign in using the Admin option and password. This option does not create or grant admin access.
                </div>
                <label className="lbl">Admin Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            )}

            <button 
              className="btn btn-p" 
              style={{ width: '100%', justifyContent: 'center', height: 44 }}
              onClick={role === 'admin' ? handleAdminLogin : handleSendOtp}
              disabled={loading}
            >
              {loading ? <Loader2 className="spin" /> : <>{role === 'admin' ? 'Access Admin Dashboard' : 'Continue with Email'} <ArrowRight size={16} /></>}
            </button>

            <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: 'var(--tx-2)' }}>
              Don't have an account?{' '}
              <Link to={role === 'university' ? '/signup' : '/signup?standard=1'} style={{ color: '#58a6ff', textDecoration: 'none' }}>
                {role === 'university' ? 'Apply for university access' : 'Sign Up'}
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
              onClick={() => setStep('login')}
            >
              Back to Sign In
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
