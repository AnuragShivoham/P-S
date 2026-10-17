import React, { useState, useEffect } from 'react';
import { 
  Building2, TrendingUp, AlertTriangle, CheckCircle2, 
  Download, Filter, Layers, ArrowUpRight, ShieldCheck, BookOpen 
} from 'lucide-react';
import { api } from '../../api/client';
import { Spinner } from '../../components/UI';

export default function InstitutionLabourView({ providerHealth }) {
  const [analytics, setAnalytics] = useState(null);
  const [curriculumData, setCurriculumData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview'); // 'Overview' | 'Departments' | 'Cohorts' | 'Gap Analysis'

  const loadData = async () => {
    setLoading(true);
    try {
      const [resAnalytics, resCurriculum] = await Promise.allSettled([
        api.getInstitutionLabourAnalytics(),
        api.getInstitutionCurriculumAnalysis()
      ]);

      if (resAnalytics.status === 'fulfilled') setAnalytics(resAnalytics.value);
      if (resCurriculum.status === 'fulfilled') setCurriculumData(resCurriculum.value);
    } catch (err) {
      console.error('[Institution View] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  const m = analytics?.metrics || {
    eri_average: 68,
    eri_change_yoy: '+4 pts year-on-year',
    placement_rate: 72,
    placement_change_yoy: '+5% year-on-year',
    strongest_skill: 'Problem Solving',
    strongest_skill_score: 78,
    critical_gap: 'Industry Readiness',
    critical_gap_score: 58
  };

  const competencies = analytics?.competency_assessment || [];
  const departments = analytics?.department_performance || [];
  const trend = analytics?.longitudinal_trend || [];
  const curriculumReviews = curriculumData?.curriculum_reviews || [];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px', fontFamily: 'var(--sans, system-ui)' }}>
      {/* Top Banner Header matching TieOpp */}
      <div style={{
        background: '#0b1329', border: '1px solid #1e293b',
        borderRadius: 12, padding: '16px 20px', marginBottom: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', fontWeight: 700 }}>
              TIEOPE ERI™ · CAMPUS ANALYTICS PLATFORM
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>
                {analytics?.institution?.name || 'NMIT Bengaluru'}
              </span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#1e293b', color: '#94a3b8', fontWeight: 600 }}>
                AY 2026-27
              </span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }} />
                LIVE
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => window.print()}
            style={{
              background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9',
              padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <Download size={14} /> Export PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {['Overview', 'Departments', 'Cohorts', 'Gap Analysis'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: activeTab === tab ? '#1e293b' : 'transparent',
              color: activeTab === tab ? '#f8fafc' : '#94a3b8',
              border: activeTab === tab ? '1px solid #334155' : '1px solid transparent',
              padding: '6px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Top 4 KPI Cards matching TieOpp design */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 24 }}>
        {/* Card 1: ERI AVERAGE */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em' }}>ERI AVERAGE</span>
            <TrendingUp size={16} color="#38bdf8" />
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#f8fafc' }}>
            {m.eri_average}<span style={{ fontSize: 16, color: '#64748b', fontWeight: 500 }}>/100</span>
          </div>
          <div style={{ width: '100%', height: 4, background: '#1e293b', borderRadius: 2, margin: '12px 0 8px 0', overflow: 'hidden' }}>
            <div style={{ width: `${m.eri_average}%`, height: '100%', background: '#38bdf8' }} />
          </div>
          <div style={{ fontSize: 12, color: '#38bdf8', fontWeight: 600 }}>{m.eri_change_yoy}</div>
        </div>

        {/* Card 2: PLACEMENT RATE */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em' }}>PLACEMENT RATE</span>
            <ArrowUpRight size={16} color="#4ade80" />
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#f8fafc' }}>
            {m.placement_rate}<span style={{ fontSize: 20, color: '#64748b', fontWeight: 500 }}>%</span>
          </div>
          <div style={{ width: '100%', height: 4, background: '#1e293b', borderRadius: 2, margin: '12px 0 8px 0', overflow: 'hidden' }}>
            <div style={{ width: `${m.placement_rate}%`, height: '100%', background: '#4ade80' }} />
          </div>
          <div style={{ fontSize: 12, color: '#4ade80', fontWeight: 600 }}>{m.placement_change_yoy}</div>
        </div>

        {/* Card 3: STRONGEST SKILL */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em' }}>STRONGEST SKILL</span>
            <span style={{ fontSize: 12 }}>🏅</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {m.strongest_skill} <span style={{ fontSize: 14, color: '#64748b' }}>{m.strongest_skill_score}/100</span>
          </div>
          <div style={{ width: '100%', height: 4, background: '#1e293b', borderRadius: 2, margin: '12px 0 8px 0', overflow: 'hidden' }}>
            <div style={{ width: `${m.strongest_skill_score}%`, height: '100%', background: '#22c55e' }} />
          </div>
          <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>Campus-wide top skill</div>
        </div>

        {/* Card 4: CRITICAL GAP */}
        <div style={{ background: '#0f172a', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 10, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', letterSpacing: '0.05em' }}>CRITICAL GAP</span>
            <AlertTriangle size={16} color="#ef4444" />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#ef4444', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {m.critical_gap} <span style={{ fontSize: 14, color: '#94a3b8' }}>{m.critical_gap_score}/100</span>
          </div>
          <div style={{ width: '100%', height: 4, background: '#1e293b', borderRadius: 2, margin: '12px 0 8px 0', overflow: 'hidden' }}>
            <div style={{ width: `${m.critical_gap_score}%`, height: '100%', background: '#ef4444' }} />
          </div>
          <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>Needs immediate action</div>
        </div>
      </div>

      {/* Middle Section: Competencies vs Department Performance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)', gap: 20, marginBottom: 24 }}>
        {/* Left: Campus Skill Assessment */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: 14 }}>
            CAMPUS SKILL ASSESSMENT · ALL 6 COMPETENCIES
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {competencies.map(c => {
              const isTop = c.status === 'top';
              const isCrit = c.status === 'critical_gap';
              const barColor = isTop ? '#22c55e' : (isCrit ? '#ef4444' : '#f59e0b');

              return (
                <div key={c.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, fontSize: 13 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f8fafc', fontWeight: 500 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: barColor }} />
                      {c.name}
                    </span>
                    <span style={{ fontWeight: 700, color: '#f8fafc' }}>
                      {c.score}<span style={{ fontSize: 10, color: '#64748b' }}>/100</span>
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${c.score}%`, height: '100%', background: barColor, borderRadius: 3 }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 18, paddingTop: 14, borderTop: '1px solid #1e293b', fontSize: 11, color: '#94a3b8' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} /> Top 3 strengths
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} /> Bottom 3 gaps
            </span>
          </div>
        </div>

        {/* Right: Department Performance Bar Chart */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em' }}>
              DEPARTMENT PERFORMANCE · ERI SCORE VS PLACEMENT RATE
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#38bdf8' }}>
                <span style={{ width: 10, height: 4, background: '#38bdf8' }} /> ERI Score
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#0d9488' }}>
                <span style={{ width: 10, height: 4, background: '#0d9488' }} /> Placement %
              </span>
            </div>
          </div>

          {/* Simple CSS-based grouped bar chart */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: 180, paddingTop: 20, borderBottom: '1px solid #334155' }}>
            {departments.map(d => (
              <div key={d.department} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 140 }}>
                  <div style={{ width: 14, height: `${(d.eri_score / 100) * 140}px`, background: '#38bdf8', borderRadius: '3px 3px 0 0' }} title={`ERI: ${d.eri_score}`} />
                  <div style={{ width: 14, height: `${(d.placement_rate / 100) * 140}px`, background: '#0d9488', borderRadius: '3px 3px 0 0' }} title={`Placement: ${d.placement_rate}%`} />
                </div>
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{d.department}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Longitudinal Trend & Curriculum Reviews */}
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em' }}>
              LONGITUDINAL ANALYSIS · 5-YEAR ERI & PLACEMENT TREND
            </div>
          </div>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#1e293b', color: '#38bdf8', fontWeight: 600 }}>
            Incl. 2026 projection
          </span>
        </div>

        {/* 5-Year timeline row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, textAlign: 'center' }}>
          {trend.map((t, idx) => (
            <div key={t.year} style={{ padding: 12, background: '#0b1329', borderRadius: 8, border: '1px solid #1e293b' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>{t.year}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#38bdf8', marginTop: 4 }}>
                {t.eri} <span style={{ fontSize: 10, color: '#64748b' }}>ERI</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#4ade80', marginTop: 2 }}>
                {t.placement_pct}% <span style={{ fontSize: 10, color: '#64748b' }}>Placed</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
