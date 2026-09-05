import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, ChevronLeft, Briefcase, User, GraduationCap, Code2, Package, Palette, Building2, BookOpen, HelpCircle } from 'lucide-react';
import { useStore } from '../store';
import { api } from '../api/client';

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = ['use_case', 'profession', 'team_size', 'goals', 'referral'];

const USE_CASES = [
  { id: 'work',     icon: Briefcase,     label: 'For work or business',   sub: 'Ship products, manage teams, grow your business' },
  { id: 'personal', icon: User,          label: 'For personal projects',  sub: 'Side projects, hobbies, and self-improvement' },
  { id: 'school',   icon: GraduationCap, label: 'For school / education', sub: 'Assignments, research, and learning' },
];

const ROLES = [
  { id: 'engineer',  icon: Code2,      label: 'Software Engineer' },
  { id: 'pm',        icon: Package,    label: 'Product Manager' },
  { id: 'designer',  icon: Palette,    label: 'Designer' },
  { id: 'founder',   icon: Building2,  label: 'Founder / Executive' },
  { id: 'student',   icon: BookOpen,   label: 'Student' },
  { id: 'other',     icon: HelpCircle, label: 'Other' },
];

const TEAM_SIZES = ['Just me', '2–10', '11–50', '51–200', '200+'];

const GOALS = [
  'Learn programming from scratch',
  'Build projects faster with AI',
  'Improve code quality',
  'Prepare for interviews',
  'Launch a product or startup',
  'Upskill my team',
  'Explore new technologies',
  'Get career guidance',
];

const REFERRALS = [
  'Twitter / X',
  'Google Search',
  'YouTube',
  'Friend or Colleague',
  'ProductHunt',
  'Other',
];

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--tx-2)', fontFamily: 'var(--mono)', letterSpacing: '.08em' }}>
          STEP {current} OF {total}
        </span>
        <span style={{ fontSize: 11, color: 'var(--tx-2)', fontFamily: 'var(--mono)' }}>{pct}%</span>
      </div>
      <div style={{ height: 3, background: 'var(--bg-o)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: 'linear-gradient(90deg, #58a6ff, #3fb950)',
          borderRadius: 4,
          transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
    </div>
  );
}

// ─── Card option (large) ──────────────────────────────────────────────────────
function SelectCard({ icon: Icon, label, sub, selected, onClick, index }) {
  return (
    <button
      onClick={onClick}
      data-index={index}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '16px 18px',
        borderRadius: 12,
        border: selected ? '1.5px solid #58a6ff' : '1.5px solid var(--border)',
        background: selected ? 'rgba(88,166,255,0.08)' : 'var(--bg-o)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.18s ease',
        boxShadow: selected ? '0 0 0 3px rgba(88,166,255,0.12)' : 'none',
        outline: 'none',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = 'rgba(88,166,255,0.4)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: selected ? 'rgba(88,166,255,0.15)' : 'rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.18s',
      }}>
        <Icon size={18} color={selected ? '#58a6ff' : 'var(--tx-2)'} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: selected ? '#e6edf3' : 'var(--tx-m)', fontFamily: 'var(--sans)', marginBottom: sub ? 2 : 0 }}>
          {label}
        </div>
        {sub && <div style={{ fontSize: 12, color: 'var(--tx-2)', fontFamily: 'var(--sans)' }}>{sub}</div>}
      </div>
      {selected && (
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#58a6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Check size={13} color="#0d1117" strokeWidth={3} />
        </div>
      )}
    </button>
  );
}

// ─── Grid card (small) ────────────────────────────────────────────────────────
function GridCard({ icon: Icon, label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 8, padding: '16px 10px', borderRadius: 12,
        border: selected ? '1.5px solid #58a6ff' : '1.5px solid var(--border)',
        background: selected ? 'rgba(88,166,255,0.08)' : 'var(--bg-o)',
        cursor: 'pointer', transition: 'all 0.18s ease', outline: 'none',
        boxShadow: selected ? '0 0 0 3px rgba(88,166,255,0.12)' : 'none',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = 'rgba(88,166,255,0.4)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <Icon size={20} color={selected ? '#58a6ff' : 'var(--tx-2)'} />
      <span style={{ fontSize: 11, fontWeight: 600, color: selected ? '#e6edf3' : 'var(--tx-m)', textAlign: 'center', lineHeight: 1.3, fontFamily: 'var(--sans)' }}>
        {label}
      </span>
    </button>
  );
}

// ─── Pill (multi-select) ──────────────────────────────────────────────────────
function Pill({ label, selected, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled && !selected}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 14px', borderRadius: 100,
        border: selected ? '1.5px solid #58a6ff' : '1.5px solid var(--border)',
        background: selected ? 'rgba(88,166,255,0.12)' : 'var(--bg-o)',
        color: selected ? '#58a6ff' : 'var(--tx-m)',
        cursor: disabled && !selected ? 'not-allowed' : 'pointer',
        opacity: disabled && !selected ? 0.4 : 1,
        fontSize: 12, fontWeight: 500, fontFamily: 'var(--sans)',
        transition: 'all 0.15s ease', outline: 'none',
      }}
    >
      {selected && <Check size={12} strokeWidth={3} />}
      {label}
    </button>
  );
}

// ─── Referral option ──────────────────────────────────────────────────────────
function ReferralOption({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', padding: '12px 16px', borderRadius: 10,
        border: selected ? '1.5px solid #58a6ff' : '1.5px solid var(--border)',
        background: selected ? 'rgba(88,166,255,0.08)' : 'var(--bg-o)',
        color: selected ? '#58a6ff' : 'var(--tx-m)',
        cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'var(--sans)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'all 0.15s ease', outline: 'none',
      }}
    >
      {label}
      {selected && <Check size={14} strokeWidth={3} />}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const navigate = useNavigate();
  const { token, role, setOnboarded } = useStore();

  // Answers
  const [useCase,   setUseCase]   = useState('');
  const [profession, setProfession] = useState('');
  const [teamSize,  setTeamSize]  = useState('');
  const [goals,     setGoals]     = useState([]);
  const [referral,  setReferral]  = useState('');

  // UI state
  const [stepIdx, setStepIdx] = useState(0);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [animDir, setAnimDir] = useState('forward'); // 'forward' | 'back'
  const [visible, setVisible] = useState(true);

  // Build dynamic steps array (skip team_size if not 'work')
  const steps = STEPS.filter(s => {
    if (s === 'team_size') return useCase === 'work';
    return true;
  });

  const currentStep = steps[stepIdx];
  const totalSteps  = steps.length;
  const stepNum     = stepIdx + 1;

  // ── Validation: is current step satisfied? ──
  const canContinue = (() => {
    if (currentStep === 'use_case')   return !!useCase;
    if (currentStep === 'profession') return !!profession;
    if (currentStep === 'team_size')  return !!teamSize;
    if (currentStep === 'goals')      return goals.length > 0;
    if (currentStep === 'referral')   return !!referral;
    return false;
  })();

  // ── Navigation ──
  const goTo = useCallback((dir) => {
    setAnimDir(dir === 1 ? 'forward' : 'back');
    setVisible(false);
    setTimeout(() => {
      setStepIdx(i => i + dir);
      setVisible(true);
    }, 180);
  }, []);

  const handleBack = () => { if (stepIdx > 0) goTo(-1); };
  const handleNext = () => { if (stepIdx < totalSteps - 1) goTo(1); };

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Enter' && canContinue) {
        if (stepIdx < totalSteps - 1) goTo(1);
      }
      if (e.key === 'Backspace' && stepIdx > 0) {
        goTo(-1);
      }
      // Number shortcuts 1-9 for option selection
      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 1) {
        if (currentStep === 'use_case'   && num <= USE_CASES.length) setUseCase(USE_CASES[num - 1].id);
        if (currentStep === 'profession' && num <= ROLES.length)    setProfession(ROLES[num - 1].id);
        if (currentStep === 'team_size'  && num <= TEAM_SIZES.length) setTeamSize(TEAM_SIZES[num - 1]);
        if (currentStep === 'referral'   && num <= REFERRALS.length) setReferral(REFERRALS[num - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stepIdx, canContinue, totalSteps, goTo, currentStep]);

  // ── Submit ──
  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/auth/onboard', {
        use_case: useCase,
        profession,
        team_size: teamSize || null,
        primary_goals: goals,
        referral_source: referral,
      });
      setOnboarded(true, res.token, res.user);
      navigate('/projects');
    } catch (e) {
      setError(e.message || 'Failed to save. Please try again.');
      setSaving(false);
    }
  };

  // ── Toggle goal ──
  const toggleGoal = (g) => {
    setGoals(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : prev.length < 3 ? [...prev, g] : prev
    );
  };

  // ── Animation style ──
  const slideStyle = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : animDir === 'forward' ? 'translateY(12px)' : 'translateY(-12px)',
    transition: 'opacity 0.18s ease, transform 0.18s ease',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 16px', boxSizing: 'border-box', background: 'var(--bg)',
    }}>
      <div style={{
        width: '100%', maxWidth: 520,
        background: 'var(--bg-1)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '36px 40px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, letterSpacing: '.15em', color: '#58a6ff', fontFamily: 'var(--mono)', marginBottom: 4 }}>
            AMIT-BODHIT
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#e6edf3', fontFamily: 'var(--sans)', margin: 0 }}>
            Let's personalise your experience
          </h1>
          <p style={{ fontSize: 13, color: 'var(--tx-2)', fontFamily: 'var(--sans)', marginTop: 6, marginBottom: 0 }}>
            Answer a few quick questions so we can tailor your journey.
          </p>
        </div>

        {/* Skip link */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button
            onClick={async () => {
              setSaving(true);
              try {
                const res = await api.post('/auth/onboard', { primary_goals: [] });
                setOnboarded(true, res.token, res.user);
                navigate('/projects');
              } catch {
                setOnboarded(true);
                navigate('/projects');
              }
            }}
            style={{ background: 'none', border: 'none', color: 'var(--tx-2)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'var(--sans)', padding: 0 }}
          >
            Skip for now
          </button>
        </div>

        <ProgressBar current={stepNum} total={totalSteps} />

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 8, color: '#f85149', fontSize: 12, fontFamily: 'var(--sans)' }}>
            {error}
          </div>
        )}

        {/* Step content */}
        <div style={slideStyle}>

          {/* STEP: Intended Use */}
          {currentStep === 'use_case' && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#e6edf3', marginBottom: 6, fontFamily: 'var(--sans)' }}>
                How do you plan to use AMIT-BODHIT?
              </div>
              <div style={{ fontSize: 12, color: 'var(--tx-2)', marginBottom: 20, fontFamily: 'var(--sans)' }}>
                Press <kbd style={{ background: 'var(--bg-o)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px', fontSize: 10 }}>1</kbd>–<kbd style={{ background: 'var(--bg-o)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px', fontSize: 10 }}>{USE_CASES.length}</kbd> to select quickly
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {USE_CASES.map((opt, i) => (
                  <SelectCard key={opt.id} index={i + 1} icon={opt.icon} label={opt.label} sub={opt.sub} selected={useCase === opt.id} onClick={() => setUseCase(opt.id)} />
                ))}
              </div>
            </div>
          )}

          {/* STEP: Role */}
          {currentStep === 'profession' && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#e6edf3', marginBottom: 6, fontFamily: 'var(--sans)' }}>
                What best describes your primary role?
              </div>
              <div style={{ fontSize: 12, color: 'var(--tx-2)', marginBottom: 20, fontFamily: 'var(--sans)' }}>
                Press <kbd style={{ background: 'var(--bg-o)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px', fontSize: 10 }}>1</kbd>–<kbd style={{ background: 'var(--bg-o)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px', fontSize: 10 }}>{ROLES.length}</kbd> to pick
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {ROLES.map((r) => (
                  <GridCard key={r.id} icon={r.icon} label={r.label} selected={profession === r.id} onClick={() => setProfession(r.id)} />
                ))}
              </div>
            </div>
          )}

          {/* STEP: Team Size (only for 'work') */}
          {currentStep === 'team_size' && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#e6edf3', marginBottom: 6, fontFamily: 'var(--sans)' }}>
                How many people are on your team?
              </div>
              <div style={{ fontSize: 12, color: 'var(--tx-2)', marginBottom: 20, fontFamily: 'var(--sans)' }}>
                Press <kbd style={{ background: 'var(--bg-o)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px', fontSize: 10 }}>1</kbd>–<kbd style={{ background: 'var(--bg-o)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px', fontSize: 10 }}>{TEAM_SIZES.length}</kbd> to select
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {TEAM_SIZES.map((size, i) => (
                  <SelectCard key={size} index={i + 1} icon={User} label={size} selected={teamSize === size} onClick={() => setTeamSize(size)} />
                ))}
              </div>
            </div>
          )}

          {/* STEP: Goals */}
          {currentStep === 'goals' && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#e6edf3', marginBottom: 6, fontFamily: 'var(--sans)' }}>
                What are your main goals?
              </div>
              <div style={{ fontSize: 12, color: 'var(--tx-2)', marginBottom: 20, fontFamily: 'var(--sans)' }}>
                Select up to 3 &nbsp;·&nbsp; {goals.length}/3 chosen
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {GOALS.map(g => (
                  <Pill key={g} label={g} selected={goals.includes(g)} disabled={goals.length >= 3} onClick={() => toggleGoal(g)} />
                ))}
              </div>
            </div>
          )}

          {/* STEP: Referral */}
          {currentStep === 'referral' && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#e6edf3', marginBottom: 6, fontFamily: 'var(--sans)' }}>
                How did you hear about us?
              </div>
              <div style={{ fontSize: 12, color: 'var(--tx-2)', marginBottom: 20, fontFamily: 'var(--sans)' }}>
                Press <kbd style={{ background: 'var(--bg-o)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px', fontSize: 10 }}>1</kbd>–<kbd style={{ background: 'var(--bg-o)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px', fontSize: 10 }}>{REFERRALS.length}</kbd> to pick
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {REFERRALS.map(r => (
                  <ReferralOption key={r} label={r} selected={referral === r} onClick={() => setReferral(r)} />
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 28 }}>
          {stepIdx > 0 && (
            <button
              onClick={handleBack}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '10px 18px',
                borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-o)',
                color: 'var(--tx-m)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                fontFamily: 'var(--sans)', transition: 'all 0.15s',
              }}
            >
              <ChevronLeft size={15} /> Back
            </button>
          )}

          {stepIdx < totalSteps - 1 ? (
            <button
              onClick={handleNext}
              disabled={!canContinue}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '11px 20px', borderRadius: 10,
                border: 'none',
                background: canContinue ? 'linear-gradient(135deg, #58a6ff, #3fb950)' : 'var(--bg-o)',
                color: canContinue ? '#0d1117' : 'var(--tx-2)',
                cursor: canContinue ? 'pointer' : 'not-allowed',
                fontSize: 14, fontWeight: 700, fontFamily: 'var(--sans)',
                transition: 'all 0.2s', boxShadow: canContinue ? '0 4px 16px rgba(88,166,255,0.25)' : 'none',
              }}
            >
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canContinue || saving}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '11px 20px', borderRadius: 10, border: 'none',
                background: canContinue ? 'linear-gradient(135deg, #58a6ff, #3fb950)' : 'var(--bg-o)',
                color: canContinue ? '#0d1117' : 'var(--tx-2)',
                cursor: canContinue && !saving ? 'pointer' : 'not-allowed',
                fontSize: 14, fontWeight: 700, fontFamily: 'var(--sans)',
                transition: 'all 0.2s', boxShadow: canContinue ? '0 4px 16px rgba(88,166,255,0.25)' : 'none',
              }}
            >
              {saving ? 'Saving…' : <>Get Started <Check size={16} strokeWidth={3} /></>}
            </button>
          )}
        </div>

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 11, color: 'var(--tx-2)', fontFamily: 'var(--sans)' }}>
          Press <kbd style={{ background: 'var(--bg-o)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px' }}>Enter</kbd> to advance &nbsp;·&nbsp;
          <kbd style={{ background: 'var(--bg-o)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px' }}>Backspace</kbd> to go back
        </div>
      </div>
    </div>
  );
}
