import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { ArrowRight, Building2, CheckCircle2, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';
import { useStore } from '../store';
import { getDashboardPathForRole } from '../utils/roleUtils';

export default function UniversitySignupPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth, token } = useStore();
  const registrationToken = params.get('university_token') || '';
  const [application, setApplication] = useState({ contact_name: '', email: '', institution_name: '', website: '' });
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(registrationToken ? 'checking' : 'application');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) navigate('/', { replace: true });
  }, [token, navigate]);

  useEffect(() => {
    if (!registrationToken) return undefined;
    let cancelled = false;
    api.getUniversityRegistration(registrationToken)
      .then(({ registration }) => {
        if (cancelled) return;
        setApplication({ contact_name: registration.contact_name, email: registration.email, institution_name: registration.institution_name, website: '' });
        setStep('approved');
      })
      .catch(err => { if (!cancelled) { setError(err.message); setStep('invalid'); } });
    return () => { cancelled = true; };
  }, [registrationToken]);

  const completeLogin = result => {
    setAuth(result.user, result.token);
    navigate(getDashboardPathForRole('university'), { replace: true });
  };

  const submitApplication = async event => {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await api.submitUniversityApplication(application);
      setMessage(result.message);
      setStep('submitted');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const sendOtp = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await api.sendOtp(application.email, 'signup', {
        registration_token: registrationToken,
        profile: { role: 'university', signup_detail: application.institution_name, selected_role: 'university' },
      });
      setMessage(result.message || `A verification code was sent to ${application.email}.`);
      setStep('otp');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const verifyOtp = async event => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const result = await api.verifyOtp(application.email, otp, application.contact_name, 'university', 'signup', {
        registration_token: registrationToken,
        profile: { role: 'university', signup_detail: application.institution_name, institution_name: application.institution_name },
      });
      completeLogin(result);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const googleSuccess = async response => {
    setBusy(true); setError('');
    try {
      const result = await api.loginGoogle(response.credential, 'university', {
        registration_token: registrationToken,
        role: 'university', signup_detail: application.institution_name, institution_name: application.institution_name,
      });
      completeLogin(result);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const title = step === 'application' ? 'University registration' : step === 'submitted' ? 'Application submitted' : step === 'invalid' ? 'Link unavailable' : step === 'otp' ? 'Verify your email' : 'Complete university sign-up';

  return <main className="goal-pg fade-in" style={{ minHeight: 'calc(100vh - 52px)', padding: '30px 16px' }}>
    <section className="goal-box" style={{ maxWidth: 520, width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14, color: '#58a6ff' }}><Building2 size={30} /></div>
      <div className="g-eye">SOCRATES · UNIVERSITY ACCESS</div>
      <h1 className="g-h1">{title}</h1>
      <p className="g-sub">{step === 'application' && 'Submit your institution details. A platform administrator must approve the request before account sign-up is enabled.'}{step === 'submitted' && 'Your request is awaiting administrator review. If approved, a secure sign-up link will be sent to your email.'}{step === 'checking' && 'Checking your administrator-approved, single-use sign-up link…'}{step === 'approved' && `Administrator approval confirmed for ${application.institution_name}. Sign up with ${application.email}.`}{step === 'otp' && `Enter the verification code sent to ${application.email}.`}{step === 'invalid' && 'Request a new approval link from the university registration page.'}</p>

      {error && <div role="alert" className="err" style={{ marginBottom: 16 }}>{error}</div>}
      {message && <div role="status" className="succ" style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}><CheckCircle2 size={16} />{message}</div>}

      {step === 'application' && <form onSubmit={submitApplication} style={{ display: 'grid', gap: 13 }}>
        <label className="lbl">Contact name<input className="input" required minLength={2} maxLength={120} autoComplete="name" value={application.contact_name} onChange={event => setApplication({ ...application, contact_name: event.target.value })} placeholder="Your full name" /></label>
        <label className="lbl">Institution name<input className="input" required minLength={2} maxLength={160} value={application.institution_name} onChange={event => setApplication({ ...application, institution_name: event.target.value })} placeholder="Example University" /></label>
        <label className="lbl">Institutional email<input className="input" type="email" required autoComplete="email" value={application.email} onChange={event => setApplication({ ...application, email: event.target.value })} placeholder="you@university.edu" /></label>
        <label className="lbl">Institution website <span style={{ color: 'var(--tx-m)' }}>(optional)</span><input className="input" type="url" value={application.website} onChange={event => setApplication({ ...application, website: event.target.value })} placeholder="https://university.edu" /></label>
        <button className="btn btn-p" type="submit" disabled={busy} style={{ width: '100%', justifyContent: 'center', height: 44 }}>{busy ? <Loader2 className="spin" /> : <><ShieldCheck size={16} /> Submit for admin review</>}</button>
      </form>}

      {step === 'checking' && <div style={{ textAlign: 'center', padding: 16 }}><Loader2 className="spin" /></div>}
      {step === 'approved' && <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ padding: 13, borderRadius: 9, background: 'rgba(63,185,80,.1)', color: '#3fb950', display: 'flex', gap: 9, alignItems: 'center' }}><ShieldCheck size={18} />Approved by a platform administrator</div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0' }}><GoogleLogin onSuccess={googleSuccess} onError={() => setError('Google sign-up failed. Try email OTP instead.')} theme="filled_black" shape="pill" text="signup_with" /></div>
        <div style={{ textAlign: 'center', color: 'var(--tx-m)', fontSize: 11 }}>OR VERIFY BY EMAIL CODE</div>
        <button className="btn btn-p" disabled={busy} style={{ width: '100%', justifyContent: 'center', height: 44 }} onClick={sendOtp}>{busy ? <Loader2 className="spin" /> : <><Mail size={16} /> Send OTP to approved email</>}</button>
      </div>}
      {step === 'otp' && <form onSubmit={verifyOtp} style={{ display: 'grid', gap: 12 }}>
        <label className="lbl">6-digit verification code<input className="input" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8 }} /></label>
        <button className="btn btn-p" type="submit" disabled={busy || otp.length !== 6} style={{ width: '100%', justifyContent: 'center', height: 44 }}>{busy ? <Loader2 className="spin" /> : <>Verify and continue <ArrowRight size={16} /></>}</button>
      </form>}

      {step === 'submitted' && <div style={{ textAlign: 'center', color: '#3fb950' }}><CheckCircle2 size={30} /></div>}
      {step === 'invalid' && <Link className="btn btn-p" to="/signup" style={{ width: '100%', justifyContent: 'center' }}>Apply again</Link>}
      {step === 'application' && <div style={{ marginTop: 18, textAlign: 'center', fontSize: 12, color: 'var(--tx-2)' }}>Already approved? <Link to="/login" style={{ color: '#58a6ff' }}>Sign in</Link> · Need a regular account? <Link to="/signup?standard=1" style={{ color: '#58a6ff' }}>Student or citizen sign-up</Link></div>}
      {(step === 'approved' || step === 'otp') && <div style={{ marginTop: 18, textAlign: 'center', fontSize: 12, color: 'var(--tx-2)' }}>Already registered? <Link to="/login?role=university" style={{ color: '#58a6ff' }}>Sign in</Link></div>}
    </section>
  </main>;
}
