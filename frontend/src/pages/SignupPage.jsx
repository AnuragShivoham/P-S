import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { User, Shield, GraduationCap, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { useStore } from '../store';

export default function SignupPage() {
  const navigate = useNavigate();
  const { setAuth, token } = useStore();
  
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [role, setRole] = useState('student');
  const [step, setStep] = useState('signup'); // signup, otp
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const isProvisionedRole = ['mentor', 'university'].includes(role);
  const accountAction = isProvisionedRole ? 'login' : 'signup';

  // If already logged in, redirect
  useEffect(() => {
    if (token) navigate('/');
  }, [token, navigate]);

  const handleSendOtp = async () => {
    if (!email) return setError('Email is required');
    if (!isProvisionedRole && !name) return setError('Name is required');
    setLoading(true);
    setError('');
    try {
      const res = await api.sendOtp(email.trim(), accountAction);
      setMsg(res.message);
      setStep('otp');
    } catch (e) {
      setError(isProvisionedRole && e.message.includes('Account not found')
        ? `No ${role} account is provisioned for this email. Ask an administrator to create the account first.`
        : e.message);
    }
    setLoading(false);
  };

  const handleGoogleSuccess = async (response) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.loginGoogle(response.credential, role);
      setAuth(res.user, res.token);
      if (res.user.role === 'citizen') {
        navigate('/citizen-dashboard');
      } else if (res.user.role === 'mentor' || res.user.role === 'university') {
        navigate('/mentor');
      } else if (res.user.role === 'admin') {
        navigate('/admin');
      } else if (!res.user.onboarded) {
        navigate('/onboarding');
      } else {
        navigate('/projects');
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp) return setError('OTP is required');
    setLoading(true);
    setError('');
    try {
      const res = await api.verifyOtp(email.trim(), otp, name, role, accountAction);
      setAuth(res.user, res.token);
      if (res.user.role === 'citizen') {
        navigate('/citizen-dashboard');
      } else if (res.user.role === 'mentor' || res.user.role === 'university') {
        navigate('/mentor');
      } else if (res.user.role === 'admin') {
        navigate('/admin');
      } else if (!res.user.onboarded) {
        navigate('/onboarding');
      } else {
        navigate('/projects');
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="goal-pg fade-in">
      <div className="goal-box" style={{ maxWidth: 420 }}>
        <div className="g-eye">{isProvisionedRole ? 'PROVISIONED ACCOUNT ACCESS' : 'CREATE ACCOUNT'}</div>
        <h1 className="g-h1">
          {step === 'signup' && (isProvisionedRole ? `Sign in as ${role === 'mentor' ? 'Mentor' : 'University'}` : 'Join SOCRATES')}
          {step === 'otp' && 'Verify Email'}
        </h1>
        <p className="g-sub">
          {step === 'signup' && (isProvisionedRole
            ? 'Mentor and University accounts must be created by an administrator. Enter your provisioned email to receive a sign-in code.'
            : 'Create a student or citizen account. Mentor, University, and Admin roles are assigned by an administrator.')}
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
              <label className="lbl">Role Selection</label>
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
                  onClick={() => setRole('mentor')}
                  className={`btn ${role === 'mentor' ? 'btn-p' : 'btn-g'}`}
                  style={{ justifyContent: 'center', fontSize: 10 }}
                >
                  <Shield size={13} /> Mentor
                </button>
                <button
                  onClick={() => setRole('university')}
                  className={`btn ${role === 'university' ? 'btn-p' : 'btn-g'}`}
                  style={{ justifyContent: 'center', fontSize: 10 }}
                >
                  <GraduationCap size={13} /> University
                </button>
              </div>
            </div>

            <div style={{ marginTop: 24, marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google sign-in is blocked. Check the Google OAuth Authorized JavaScript origins for this site.')}
                theme="filled_black"
                shape="pill"
                width="380"
                text={isProvisionedRole ? 'signin_with' : 'signup_with'}
              />
            </div>

            <div style={{ position: 'relative', textAlign: 'center', marginBottom: 24 }}>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
              <span style={{ 
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                background: 'var(--bg)', padding: '0 12px', color: 'var(--tx-m)', fontSize: 10, letterSpacing: '.1em'
              }}>OR EMAIL</span>
            </div>

            {!isProvisionedRole && (
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
              {loading ? <Loader2 className="spin" /> : <>{isProvisionedRole ? 'Continue to Sign In' : 'Sign Up'} <ArrowRight size={16} /></>}
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
