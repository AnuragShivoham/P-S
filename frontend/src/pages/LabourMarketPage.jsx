import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Briefcase, Award, CheckCircle2, AlertTriangle, 
  Sparkles, FileText, ArrowRight, ShieldCheck, RefreshCw, 
  TrendingUp, Users, BookOpen, Layers, CheckCircle, Clock, 
  Sliders, ShieldAlert, Cpu
} from 'lucide-react';
import { api } from '../api/client';
import { useStore } from '../store';
import { getPrimaryRole } from '../utils/roleUtils';
import { Spinner } from '../components/UI';

// 4 Reference UI Modular Views
import StudentLabourView from '../features/labour/StudentLabourView';
import InstitutionLabourView from '../features/labour/InstitutionLabourView';
import EmployerLabourView from '../features/labour/EmployerLabourView';
import AdminLabourView from '../features/labour/AdminLabourView';

export default function LabourMarketPage() {
  const navigate = useNavigate();
  const { role, roles, userName } = useStore();
  const primaryRole = getPrimaryRole({ role, roles });

  // Map primary role to one of 'student' | 'institution' | 'employer' | 'admin'
  const resolveInitialView = (r) => {
    const norm = String(r || 'student').toLowerCase();
    if (norm === 'admin') return 'admin';
    if (norm === 'employer') return 'employer';
    if (norm === 'university' || norm === 'institution') return 'institution';
    return 'student';
  };

  const [activeRoleView, setActiveRoleView] = useState(() => resolveInitialView(primaryRole));
  const [providerHealth, setProviderHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Fetch AI provider diagnostic on load
  const loadProviderHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await api.getLabourProviderHealth();
      setProviderHealth(res);
    } catch (err) {
      console.warn('[LabourMarketPage] Could not probe provider health:', err);
      setProviderHealth({
        status: 'degraded',
        fallback_mode: true,
        message: 'Could not connect to health probe endpoint'
      });
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    loadProviderHealth();
  }, []);

  // Update view when user primaryRole changes
  useEffect(() => {
    setActiveRoleView(resolveInitialView(primaryRole));
  }, [primaryRole]);

  const canSwitchViews = primaryRole === 'admin' || primaryRole === 'mentor';

  const roleTabs = [
    { id: 'student', label: 'Student Pathly', roleLabel: 'Student', icon: Award, tone: '#58a6ff' },
    { id: 'institution', label: 'Institution TieOpp', roleLabel: 'Institution', icon: Building2, tone: '#3fb950' },
    { id: 'employer', label: 'Employer TalentsForce', roleLabel: 'Employer', icon: Briefcase, tone: '#d29922' },
    { id: 'admin', label: 'Admin Dataloka', roleLabel: 'Admin Ingestion', icon: Cpu, tone: '#f85149' }
  ];

  return (
    <div style={{ maxWidth: 1380, margin: '0 auto', padding: '24px 20px', fontFamily: 'var(--sans)', color: 'var(--tx)' }}>
      {/* ── System Header & Degraded Fallback Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(13, 17, 23, 0.98) 0%, rgba(22, 27, 34, 0.95) 100%)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '20px 24px',
        marginBottom: 20,
        boxShadow: '0 16px 36px rgba(0,0,0,0.35)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(88,166,255,0.12)',
                border: '1px solid rgba(88,166,255,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Building2 size={20} color="#58a6ff" />
              </div>
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--tx-m)', fontWeight: 600 }}>
                  SOCRATES I.D.E. • Labour Intelligence Hub
                </div>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#f0f6fc' }}>
                  Labour-Market Intelligence & Competency Alignment
                </h1>
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--tx-m)', marginTop: 6, maxWidth: 640 }}>
              Connecting real-time hiring requisitions, curriculum outcomes, and student project proof artifacts through verifiable competency records.
            </div>
          </div>

          {/* Role switcher (available to Admins & Mentors, or for evaluating views) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--tx-m)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Active Persona:
              </span>
              <span style={{
                background: 'rgba(88, 166, 255, 0.1)',
                color: '#58a6ff',
                border: '1px solid rgba(88, 166, 255, 0.3)',
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'var(--mono)'
              }}>
                {userName || 'User'} ({primaryRole})
              </span>
            </div>

            {canSwitchViews && (
              <div style={{
                display: 'flex',
                background: 'rgba(1, 4, 9, 0.6)',
                border: '1px solid var(--border)',
                borderRadius: 999,
                padding: 3,
                gap: 4
              }}>
                {roleTabs.map(tab => {
                  const Icon = tab.icon;
                  const active = activeRoleView === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveRoleView(tab.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        border: 'none',
                        background: active ? tab.tone : 'transparent',
                        color: active ? '#0d1117' : 'var(--tx-m)',
                        padding: '6px 14px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: active ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Icon size={13} color={active ? '#0d1117' : tab.tone} />
                      {tab.roleLabel}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── AI Provider Health Status Indicator ── */}
        {providerHealth && (
          <div style={{
            marginTop: 16,
            padding: '10px 14px',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            fontSize: 12,
            background: providerHealth.status === 'healthy' 
              ? 'rgba(46, 160, 67, 0.1)' 
              : 'rgba(210, 153, 34, 0.1)',
            border: providerHealth.status === 'healthy' 
              ? '1px solid rgba(46, 160, 67, 0.3)' 
              : '1px solid rgba(210, 153, 34, 0.3)',
            color: providerHealth.status === 'healthy' ? '#3fb950' : '#d29922'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {providerHealth.status === 'healthy' ? (
                <CheckCircle2 size={15} color="#3fb950" />
              ) : (
                <ShieldAlert size={15} color="#d29922" />
              )}
              <span>
                <strong>System Extraction Pipeline:</strong>{' '}
                {providerHealth.status === 'healthy' ? (
                  `Live AI Provider Online (${providerHealth.active_provider || 'Groq'}). Continuous automated signal inference active.`
                ) : (
                  `Operating in Transparent Deterministic Fallback Mode (${providerHealth.active_provider || 'Groq'}: ${providerHealth.details || 'key invalid/offline'}). Extracted signals are mapped deterministically via SOCRATES Ontology with verified provenance and zero hallucination.`
                )}
              </span>
            </div>
            <button
              onClick={loadProviderHealth}
              disabled={healthLoading}
              title="Refresh provider status"
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                opacity: 0.8
              }}
            >
              <RefreshCw size={12} className={healthLoading ? 'spin' : ''} />
              Re-check
            </button>
          </div>
        )}
      </div>

      {/* ── Role-Specific View Rendering ── */}
      <main>
        {activeRoleView === 'student' && (
          <StudentLabourView providerHealth={providerHealth} />
        )}

        {activeRoleView === 'institution' && (
          <InstitutionLabourView providerHealth={providerHealth} />
        )}

        {activeRoleView === 'employer' && (
          <EmployerLabourView providerHealth={providerHealth} />
        )}

        {activeRoleView === 'admin' && (
          <AdminLabourView providerHealth={providerHealth} />
        )}
      </main>
    </div>
  );
}
