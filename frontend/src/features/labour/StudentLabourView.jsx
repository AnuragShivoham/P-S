import React, { useState, useEffect } from 'react';
import { 
  Award, Briefcase, BookOpen, AlertCircle, Sparkles, CheckCircle2, 
  ArrowRight, ShieldCheck, ChevronRight, Layers, ExternalLink, Code2 
} from 'lucide-react';
import { api } from '../../api/client';
import { Spinner } from '../../components/UI';

export default function StudentLabourView({ providerHealth }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview'); // 'Overview' | 'Hard Skills' | 'Soft Skills'
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [gapAnalysis, setGapAnalysis] = useState(null);
  const [analyzingGap, setAnalyzingGap] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState('');

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await api.getStudentLabourProfile();
      setProfileData(res);
      if (res.competencies?.length > 0 && !selectedSkill) {
        setSelectedSkill(res.competencies[0]);
      }
    } catch (err) {
      console.error('[Student View] Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (selectedSkill) {
      handleRunGap(selectedSkill.skill_id);
    }
  }, [selectedSkill?.skill_id]);

  const handleRunGap = async (skillId) => {
    setAnalyzingGap(true);
    setUpgradeMsg('');
    try {
      const gap = await api.analyzeStudentGap({
        skill_id: skillId,
        role_id: 'software-engineering-intern'
      });
      setGapAnalysis(gap);
    } catch (err) {
      console.error('Gap analysis error:', err);
    } finally {
      setAnalyzingGap(false);
    }
  };

  const handleApplyUpgrade = async () => {
    if (!gapAnalysis?.recommended_project_id || !selectedSkill) return;
    setUpgrading(true);
    try {
      const res = await api.upgradeStudentProject({
        project_id: gapAnalysis.recommended_project_id,
        target_skill_id: selectedSkill.skill_id,
        target_requirement_id: gapAnalysis.target_requirement_id
      });
      setUpgradeMsg(res.message || 'Project successfully upgraded with target milestone!');
      loadProfile();
    } catch (err) {
      setUpgradeMsg(`Upgrade failed: ${err.message}`);
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  const competencies = profileData?.competencies || [];
  const verifiedEvidence = profileData?.verified_evidence || [];
  const projects = profileData?.projects || [];

  // Filter skills based on tab
  const filteredSkills = competencies.filter(c => {
    if (activeTab === 'Soft Skills') {
      return /communication|teamwork|leadership|problem-solving/i.test(c.skill_id || c.skill_name);
    }
    if (activeTab === 'Hard Skills') {
      return !/communication|teamwork|leadership/i.test(c.skill_id || c.skill_name);
    }
    return true;
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px', fontFamily: 'var(--sans, system-ui)' }}>
      {/* Degraded mode ambient banner */}
      {providerHealth?.fallback_active && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
          background: 'rgba(210, 153, 34, 0.1)', border: '1px solid rgba(210, 153, 34, 0.3)',
          borderRadius: 8, marginBottom: 20, fontSize: 13, color: '#d29922'
        }}>
          <AlertCircle size={16} />
          <span><strong>AI Provider Degraded:</strong> Deterministic compiler active. Recommendations are derived from verified rubric rules.</span>
        </div>
      )}

      {/* Header matching Pathly UI */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 6px 0', color: 'var(--tx, #c9d1d9)', letterSpacing: '-0.02em' }}>
              Skill Competency
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--tx-m, #8b949e)' }}>
              Track your academic skills, get AI-powered recommendations, and monitor your progress throughout your education
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: 'rgba(56, 139, 253, 0.15)', color: '#58a6ff', fontWeight: 600 }}>
              🎓 {profileData?.student?.name || 'Student Account'}
            </span>
          </div>
        </div>

        {/* Tab Pills */}
        <div style={{ display: 'flex', gap: 8, marginTop: 20, borderBottom: '1px solid var(--border, #30363d)', paddingBottom: 10 }}>
          {['Overview', 'Hard Skills', 'Soft Skills'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? 'var(--bg-o, #161b22)' : 'transparent',
                border: activeTab === tab ? '1px solid var(--border, #30363d)' : '1px solid transparent',
                borderBottom: activeTab === tab ? '2px solid #58a6ff' : '1px solid transparent',
                color: activeTab === tab ? '#58a6ff' : 'var(--tx-m, #8b949e)',
                padding: '6px 16px', borderRadius: '6px 6px 0 0', cursor: 'pointer', fontSize: 13, fontWeight: 600
              }}
            >
              {tab === 'Overview' && '📊 '}
              {tab === 'Hard Skills' && '💻 '}
              {tab === 'Soft Skills' && '🤝 '}
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(320px, 1fr)', gap: 24, alignItems: 'start' }}>
        {/* Left Column: Current Skills Grid */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px 0', color: 'var(--tx, #c9d1d9)' }}>
            Current Skills ({filteredSkills.length})
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {filteredSkills.map(skill => {
              const isSelected = selectedSkill?.skill_id === skill.skill_id;
              const prof = (skill.proficiency_level || 'beginner').toLowerCase();
              const badgeBg = prof === 'advanced' ? 'rgba(46, 160, 67, 0.15)' : (prof === 'intermediate' ? 'rgba(56, 139, 253, 0.15)' : 'rgba(210, 153, 34, 0.15)');
              const badgeColor = prof === 'advanced' ? '#3fb950' : (prof === 'intermediate' ? '#58a6ff' : '#d29922');
              const dotColor = prof === 'advanced' ? '#2ea043' : (prof === 'intermediate' ? '#1f6feb' : '#d29922');

              // Associated counts
              const skillEvCount = verifiedEvidence.filter(e => e.skill_id === skill.skill_id).length;
              const skillProjCount = projects.filter(p => (p.tech_stack || '').toLowerCase().includes(skill.skill_id)).length;
              const courseCount = prof === 'advanced' ? 2 : (prof === 'intermediate' ? 1 : 0);

              return (
                <div
                  key={skill.id || skill.skill_id}
                  onClick={() => setSelectedSkill(skill)}
                  style={{
                    background: isSelected ? 'rgba(56, 139, 253, 0.08)' : 'var(--bg-d, #0d1117)',
                    border: isSelected ? '1px solid #58a6ff' : '1px solid var(--border, #30363d)',
                    borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 0 0 2px rgba(88, 166, 255, 0.2)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx, #c9d1d9)' }}>
                      {skill.skill_name || skill.skill_id}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12,
                      background: badgeBg, color: badgeColor, textTransform: 'lowercase'
                    }}>
                      {prof}
                    </span>
                  </div>

                  {/* 3 counter columns matching Pathly design */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center', padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--tx, #c9d1d9)' }}>{skillEvCount}</div>
                      <div style={{ fontSize: 10, color: 'var(--tx-m, #8b949e)', marginTop: 2 }}>Certificates</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--tx, #c9d1d9)' }}>{skillProjCount}</div>
                      <div style={{ fontSize: 10, color: 'var(--tx-m, #8b949e)', marginTop: 2 }}>Projects</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--tx, #c9d1d9)' }}>{courseCount}</div>
                      <div style={{ fontSize: 10, color: 'var(--tx-m, #8b949e)', marginTop: 2 }}>Courses</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 11, color: 'var(--tx-m, #8b949e)' }}>
                    <span>Total: {skillEvCount + skillProjCount + courseCount} items</span>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: AI Competency Gap & Upgrade Drawer */}
        <div style={{
          background: 'var(--bg-d, #0d1117)', border: '1px solid var(--border, #30363d)',
          borderRadius: 14, padding: 20, position: 'sticky', top: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Sparkles size={18} color="#58a6ff" />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--tx, #c9d1d9)' }}>
              Target Readiness & Upgrade Plan
            </h3>
          </div>

          {selectedSkill ? (
            <div>
              <div style={{ padding: 12, background: 'var(--bg-o, #161b22)', borderRadius: 8, marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--tx-m, #8b949e)' }}>Selected Target Competency</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#58a6ff', marginTop: 2 }}>
                  {selectedSkill.skill_name || selectedSkill.skill_id}
                </div>
              </div>

              {analyzingGap ? (
                <div style={{ textAlign: 'center', padding: '30px 0' }}>
                  <Spinner size="md" />
                  <div style={{ fontSize: 12, color: 'var(--tx-m, #8b949e)', marginTop: 8 }}>Analyzing IDE repos & market signals...</div>
                </div>
              ) : gapAnalysis ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: 'var(--tx-m, #8b949e)' }}>Target Role:</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx, #c9d1d9)' }}>Software Engineering Intern</span>
                  </div>

                  <div style={{
                    padding: 12, borderRadius: 8, marginBottom: 14,
                    background: gapAnalysis.recommendation_type === 'UPGRADE_EXISTING_PROJECT' ? 'rgba(56, 139, 253, 0.1)' : 'rgba(46, 160, 67, 0.1)',
                    border: `1px solid ${gapAnalysis.recommendation_type === 'UPGRADE_EXISTING_PROJECT' ? 'rgba(56, 139, 253, 0.3)' : 'rgba(46, 160, 67, 0.3)'}`
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: gapAnalysis.recommendation_type === 'UPGRADE_EXISTING_PROJECT' ? '#58a6ff' : '#3fb950', marginBottom: 4 }}>
                      Decision: {gapAnalysis.recommendation_type}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--tx, #c9d1d9)', lineHeight: 1.4 }}>
                      {gapAnalysis.rationale || 'Competency gap detected between market signal and IDE code evidence.'}
                    </div>
                  </div>

                  {gapAnalysis.recommendation_type === 'UPGRADE_EXISTING_PROJECT' && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 12, color: 'var(--tx-m, #8b949e)', marginBottom: 6 }}>
                        Recommended Project to Upgrade: <strong>{gapAnalysis.recommended_project_title || 'Active Project'}</strong>
                      </div>
                      <button
                        onClick={handleApplyUpgrade}
                        disabled={upgrading}
                        style={{
                          width: '100%', padding: '10px 14px', borderRadius: 8, border: 'none',
                          background: 'linear-gradient(180deg, #238636 0%, #2ea043 100%)',
                          color: '#fff', fontWeight: 600, fontSize: 13, cursor: upgrading ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                        }}
                      >
                        <Code2 size={16} />
                        {upgrading ? 'Upgrading Project...' : '1-Click Upgrade Project in IDE'}
                      </button>
                    </div>
                  )}

                  {upgradeMsg && (
                    <div style={{
                      padding: 10, borderRadius: 6, fontSize: 12, marginTop: 10,
                      background: upgradeMsg.includes('failed') ? 'rgba(248, 81, 73, 0.1)' : 'rgba(46, 160, 67, 0.1)',
                      color: upgradeMsg.includes('failed') ? '#f85149' : '#3fb950'
                    }}>
                      {upgradeMsg}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--tx-m, #8b949e)', textAlign: 'center', padding: '20px 0' }}>
              Select any skill card on the left to inspect market alignment and project upgrades.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
