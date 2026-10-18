import React, { useState, useEffect, useRef } from 'react';
import { 
  Award, Briefcase, BookOpen, AlertCircle, Sparkles, CheckCircle2, 
  ArrowRight, ShieldCheck, ChevronRight, Layers, ExternalLink, Code2,
  Compass, Target, GraduationCap, CheckCircle, Rocket, CircleDot
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Spinner } from '../../components/UI';

export default function StudentLabourView({ providerHealth }) {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview'); // 'Overview' | 'Hard Skills' | 'Soft Skills'
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [selectedMarketSkill, setSelectedMarketSkill] = useState(null);
  const [gapAnalysis, setGapAnalysis] = useState(null);
  const [analyzingGap, setAnalyzingGap] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState('');

  // Zero-Input Guidance State
  const [selectedRoleId, setSelectedRoleId] = useState('software-engineering-intern');
  const [rolesList, setRolesList] = useState([]);
  const [guidanceReport, setGuidanceReport] = useState(null);
  const [guidanceLoading, setGuidanceLoading] = useState(false);
  const [guidanceError, setGuidanceError] = useState('');

  const roleSelectRef = useRef(null);
  const marketSkillsRef = useRef(null);

  // Load available roles from ontology
  const loadRoles = async () => {
    try {
      const res = await api.getRolesOntology();
      if (res?.roles?.length > 0) {
        setRolesList(res.roles);
      } else {
        // Fallback default roles
        setRolesList([
          { id: 'software-engineering-intern', title: 'Software Engineering Intern', category: 'Engineering' },
          { id: 'software-engineer', title: 'Software Engineer', category: 'Engineering' },
          { id: 'backend-engineer', title: 'Backend Engineer', category: 'Backend' },
          { id: 'frontend-engineer', title: 'Frontend Engineer', category: 'Frontend' },
          { id: 'devops-engineer', title: 'DevOps & Site Reliability Engineer', category: 'Infrastructure' },
          { id: 'data-engineer', title: 'Data Engineer', category: 'Data' }
        ]);
      }
    } catch (e) {
      console.warn('[Student View] Using fallback roles ontology:', e.message);
      setRolesList([
        { id: 'software-engineering-intern', title: 'Software Engineering Intern', category: 'Engineering' },
        { id: 'software-engineer', title: 'Software Engineer', category: 'Engineering' },
        { id: 'backend-engineer', title: 'Backend Engineer', category: 'Backend' },
        { id: 'frontend-engineer', title: 'Frontend Engineer', category: 'Frontend' },
        { id: 'devops-engineer', title: 'DevOps & Site Reliability Engineer', category: 'Infrastructure' },
        { id: 'data-engineer', title: 'Data Engineer', category: 'Data' }
      ]);
    }
  };

  // Load student profile
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

  // Load Zero-Input role-level guidance report
  const loadGuidance = async (roleId) => {
    setGuidanceLoading(true);
    setGuidanceError('');
    try {
      const report = await api.getStudentGuidance(roleId);
      setGuidanceReport(report);
      // Auto-select first market skill if none selected
      if (report?.competencies?.length > 0 && !selectedMarketSkill) {
        setSelectedMarketSkill(report.competencies[0]);
      }
    } catch (err) {
      console.error('[Student View] Failed to load guidance report:', err);
      setGuidanceError('Unable to retrieve role guidance. Showing cached market baseline.');
    } finally {
      setGuidanceLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
    loadProfile();
  }, []);

  useEffect(() => {
    loadGuidance(selectedRoleId);
  }, [selectedRoleId]);

  useEffect(() => {
    if (selectedSkill) {
      handleRunGap(selectedSkill.skill_id);
    }
  }, [selectedSkill?.skill_id, selectedRoleId]);

  const handleRunGap = async (skillId) => {
    setAnalyzingGap(true);
    setUpgradeMsg('');
    try {
      const gap = await api.analyzeStudentGap({
        skill_id: skillId,
        role_id: selectedRoleId
      });
      setGapAnalysis(gap);
    } catch (err) {
      console.error('Gap analysis error:', err);
    } finally {
      setAnalyzingGap(false);
    }
  };

  const handleApplyUpgrade = async (targetProjectId, targetSkillId) => {
    const projId = targetProjectId || gapAnalysis?.recommended_project_id || guidanceReport?.recommended_projects?.[0]?.project_id;
    const skillId = targetSkillId || selectedSkill?.skill_id || selectedMarketSkill?.skill_id;

    if (!projId || !skillId) return;
    setUpgrading(true);
    setUpgradeMsg('');
    try {
      const res = await api.upgradeStudentProject({
        project_id: projId,
        target_skill_id: skillId,
        target_requirement_id: gapAnalysis?.target_requirement_id || null
      });
      setUpgradeMsg(res.message || 'Project successfully upgraded with target milestone!');
      loadProfile();
      loadGuidance(selectedRoleId);
    } catch (err) {
      setUpgradeMsg(`Upgrade failed: ${err.message}`);
    } finally {
      setUpgrading(false);
    }
  };

  const handleStartNewProject = () => {
    navigate('/projects');
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
  const isZeroInputState = competencies.length === 0;

  // Filter skills based on tab for student's actual competencies
  const filteredSkills = competencies.filter(c => {
    if (activeTab === 'Soft Skills') {
      return /communication|teamwork|leadership|problem-solving/i.test(c.skill_id || c.skill_name || c.skill_category);
    }
    if (activeTab === 'Hard Skills') {
      return !/communication|teamwork|leadership/i.test(c.skill_id || c.skill_name || c.skill_category);
    }
    return true;
  });

  // Filter skills based on tab for market guidance in zero-input state
  const marketCompetencies = guidanceReport?.competencies || [];
  const filteredMarketSkills = marketCompetencies.filter(c => {
    if (activeTab === 'Soft Skills') {
      return /communication|teamwork|leadership|problem-solving/i.test(c.skill_id || c.skill_name || c.category);
    }
    if (activeTab === 'Hard Skills') {
      return !/communication|teamwork|leadership/i.test(c.skill_id || c.skill_name || c.category);
    }
    return true;
  });

  const activeRoleTitle = rolesList.find(r => r.id === selectedRoleId)?.title || guidanceReport?.role?.title || 'Software Engineering Intern';

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

      {/* Header matching Pathly & SOCRATES design */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: 'rgba(56, 139, 253, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#58a6ff'
              }}>
                <GraduationCap size={18} />
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: 'var(--tx, #c9d1d9)', letterSpacing: '-0.02em' }}>
                Skill Competency
              </h1>
              {isZeroInputState && (
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 12,
                  background: 'rgba(56, 139, 253, 0.15)', color: '#58a6ff', fontWeight: 600,
                  border: '1px solid rgba(56, 139, 253, 0.3)'
                }}>
                  Starter report
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--tx-m, #8b949e)' }}>
              {isZeroInputState ? 'Market-aligned learning and project guidance' : 'Track your academic skills, get AI-powered recommendations, and monitor your progress throughout your education'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* Target Career Path Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--tx-m, #8b949e)', fontWeight: 500 }}>Target Role:</label>
              <select
                ref={roleSelectRef}
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                style={{
                  background: 'var(--bg-d, #0d1117)',
                  border: '1px solid var(--border, #30363d)',
                  borderRadius: 6,
                  color: 'var(--tx, #c9d1d9)',
                  padding: '5px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {rolesList.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.title}
                  </option>
                ))}
              </select>
            </div>

            <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: 'rgba(56, 139, 253, 0.15)', color: '#58a6ff', fontWeight: 600 }}>
              🎓 {profileData?.student?.name || 'Student Account'}
            </span>
          </div>
        </div>

        {/* Tab Pills */}
        <div style={{ display: 'flex', gap: 8, marginTop: 18, borderBottom: '1px solid var(--border, #30363d)', paddingBottom: 10 }}>
          {['Overview', 'Hard Skills', 'Soft Skills'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? 'var(--bg-o, #161b22)' : 'transparent',
                border: activeTab === tab ? '1px solid var(--border, #30363d)' : '1px solid transparent',
                borderBottom: activeTab === tab ? '2px solid #58a6ff' : '1px solid transparent',
                color: activeTab === tab ? '#58a6ff' : 'var(--tx-m, #8b949e)',
                padding: '6px 16px', borderRadius: '6px 6px 0 0', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                transition: 'all 0.15s ease'
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
        
        {/* Left Column: Zero-Input Starter State OR Populated Skills Grid */}
        <div>
          {isZeroInputState ? (
            /* ── ZERO-INPUT INTELLIGENT EMPTY STATE ── */
            <div>
              {/* Start with industry requirements banner */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(56, 139, 253, 0.08) 0%, rgba(31, 111, 235, 0.03) 100%)',
                border: '1px solid rgba(56, 139, 253, 0.25)',
                borderRadius: 12, padding: '18px 20px', marginBottom: 24
              }}>
                <h3 style={{ margin: '0 0 6px 0', fontSize: 15, fontWeight: 700, color: 'var(--tx, #c9d1d9)' }}>
                  Start with industry requirements
                </h3>
                <p style={{ margin: '0 0 14px 0', fontSize: 13, color: 'var(--tx-m, #8b949e)', lineHeight: 1.5 }}>
                  Your personalized competency profile is not yet assessed. Explore what your target role requires and how to demonstrate those skills through I.D.E. projects.
                  <br />
                  <span style={{ fontSize: 12, color: '#8b949e', opacity: 0.9 }}>
                    No CV or personal information is required to begin.
                  </span>
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => roleSelectRef.current?.focus()}
                    style={{
                      background: '#1f6feb', color: '#fff', border: 'none',
                      padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    <Compass size={14} />
                    Explore a career path
                  </button>
                  <button
                    onClick={() => marketSkillsRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)', color: 'var(--tx, #c9d1d9)',
                      border: '1px solid var(--border, #30363d)',
                      padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    <Target size={14} />
                    View market skills
                  </button>
                </div>
              </div>

              {/* Market-required skills header */}
              <div ref={marketSkillsRef} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--tx, #c9d1d9)' }}>
                    Market-required skills
                  </h2>
                  <span style={{ fontSize: 11, color: 'var(--tx-m, #8b949e)', background: 'var(--bg-o, #161b22)', padding: '2px 8px', borderRadius: 10, border: '1px solid var(--border, #30363d)' }}>
                    {guidanceReport?.market_data?.status === 'GENERAL_TEMPLATE' ? 'General Template' : `Signals: ${guidanceReport?.market_data?.source_count || 0}`}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#58a6ff', fontWeight: 600, marginTop: 4 }}>
                  Example: {activeRoleTitle}
                </div>
                <div style={{ fontSize: 11, color: 'var(--tx-m, #8b949e)', marginTop: 2 }}>
                  Illustrative role baseline, not a verified personal profile
                </div>
              </div>

              {/* Market skills list matching image 4 */}
              {guidanceLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Spinner size="md" />
                  <div style={{ fontSize: 12, color: 'var(--tx-m, #8b949e)', marginTop: 8 }}>Retrieving verified role requirements...</div>
                </div>
              ) : filteredMarketSkills.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', background: 'var(--bg-d, #0d1117)', borderRadius: 10, border: '1px solid var(--border, #30363d)', color: 'var(--tx-m, #8b949e)', fontSize: 13 }}>
                  No market requirements found for this role category. Try selecting another career path.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filteredMarketSkills.map(skill => {
                    const isSelected = selectedMarketSkill?.skill_id === skill.skill_id;
                    return (
                      <div
                        key={skill.skill_id}
                        onClick={() => setSelectedMarketSkill(skill)}
                        style={{
                          background: isSelected ? 'rgba(56, 139, 253, 0.08)' : 'var(--bg-d, #0d1117)',
                          border: isSelected ? '1px solid #58a6ff' : '1px solid var(--border, #30363d)',
                          borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 0 0 1px rgba(88, 166, 255, 0.3)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                          <div style={{ color: isSelected ? '#58a6ff' : 'var(--tx-m, #8b949e)', flexShrink: 0 }}>
                            <CircleDot size={16} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx, #c9d1d9)', marginBottom: 2 }}>
                              {skill.skill_name}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--tx-m, #8b949e)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {skill.description}
                            </div>
                          </div>
                        </div>

                        <div style={{ flexShrink: 0 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 12,
                            background: 'rgba(139, 148, 158, 0.12)', color: '#8b949e',
                            border: '1px solid rgba(139, 148, 158, 0.25)'
                          }}>
                            Unassessed
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ── POPULATED SKILLS STATE (FOR STUDENTS WITH ASSESSED SKILLS) ── */
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
          )}
        </div>

        {/* Right Column: Target Readiness & Upgrade Plan Panel */}
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

          {isZeroInputState ? (
            /* ── ZERO-INPUT ROADMAP & I.D.E. GUIDANCE PANEL ── */
            <div>
              {/* Selected Market Competency Detail (if clicked) */}
              {selectedMarketSkill ? (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ padding: 12, background: 'var(--bg-o, #161b22)', borderRadius: 8, marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--tx-m, #8b949e)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Selected Competency
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#58a6ff', marginTop: 2 }}>
                      {selectedMarketSkill.skill_name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--tx-m, #8b949e)', marginTop: 4 }}>
                      Required Level: <strong style={{ color: 'var(--tx, #c9d1d9)' }}>{selectedMarketSkill.required_level}</strong>
                    </div>
                  </div>

                  <div style={{
                    padding: 12, borderRadius: 8, marginBottom: 14,
                    background: 'rgba(56, 139, 253, 0.06)', border: '1px solid rgba(56, 139, 253, 0.2)'
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#58a6ff', marginBottom: 4 }}>
                      Market Requirement Basis
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--tx, #c9d1d9)', lineHeight: 1.4 }}>
                      {selectedMarketSkill.description}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--tx-m, #8b949e)', marginTop: 6 }}>
                      Source: {selectedMarketSkill.source_reference}
                    </div>
                  </div>

                  <div style={{
                    padding: 10, borderRadius: 6, marginBottom: 14,
                    background: 'rgba(210, 153, 34, 0.08)', border: '1px solid rgba(210, 153, 34, 0.25)',
                    fontSize: 12, color: '#d29922'
                  }}>
                    <strong>Personal Assessment:</strong> Evidence needed. This competency is currently unassessed.
                  </div>

                  {/* Project Action for this competency */}
                  {projects.length > 0 ? (
                    <button
                      onClick={() => handleApplyUpgrade(projects[0].id, selectedMarketSkill.skill_id)}
                      disabled={upgrading}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 8, border: 'none',
                        background: 'linear-gradient(180deg, #238636 0%, #2ea043 100%)',
                        color: '#fff', fontWeight: 600, fontSize: 13, cursor: upgrading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                      }}
                    >
                      <Code2 size={16} />
                      {upgrading ? 'Upgrading Project...' : `Upgrade ${projects[0].title || 'Project'} in I.D.E.`}
                    </button>
                  ) : (
                    <button
                      onClick={handleStartNewProject}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 8, border: 'none',
                        background: 'linear-gradient(180deg, #1f6feb 0%, #388bfd 100%)',
                        color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                      }}
                    >
                      <Rocket size={16} />
                      Start Project in I.D.E.
                    </button>
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

                  <div style={{ marginTop: 14, textAlign: 'center' }}>
                    <button
                      onClick={() => setSelectedMarketSkill(null)}
                      style={{ background: 'transparent', border: 'none', color: '#58a6ff', fontSize: 12, cursor: 'pointer' }}
                    >
                      ← View full learning roadmap
                    </button>
                  </div>
                </div>
              ) : (
                /* Starter Roadmap matching image 4 */
                <div>
                  <p style={{ margin: '0 0 12px 0', fontSize: 12, color: 'var(--tx-m, #8b949e)', lineHeight: 1.5 }}>
                    Your starting roadmap is ready to explore. Confirm your skills later to calculate a more accurate personal gap.
                  </p>

                  <div style={{
                    padding: '10px 12px', background: 'var(--bg-o, #161b22)', borderRadius: 8,
                    fontSize: 12, fontWeight: 600, color: '#58a6ff', marginBottom: 16,
                    lineHeight: 1.5
                  }}>
                    1. Learn the fundamentals → 2. Build a project → 3. Validate evidence → 4. Reassess readiness
                  </div>

                  {/* Progressive Roadmap Phases */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                    {guidanceReport?.roadmap?.map((step) => (
                      <div key={step.order} style={{
                        padding: 10, borderRadius: 6, background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.06)'
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx, #c9d1d9)', marginBottom: 2 }}>
                          {step.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--tx-m, #8b949e)', lineHeight: 1.4 }}>
                          {step.deliverable}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Primary Action Button */}
                  {projects.length > 0 ? (
                    <button
                      onClick={() => handleApplyUpgrade(projects[0].id, filteredMarketSkills[0]?.skill_id)}
                      disabled={upgrading}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 8, border: 'none',
                        background: 'linear-gradient(180deg, #238636 0%, #2ea043 100%)',
                        color: '#fff', fontWeight: 600, fontSize: 13, cursor: upgrading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                      }}
                    >
                      <Code2 size={16} />
                      {upgrading ? 'Upgrading Project...' : `1-Click Upgrade Project in I.D.E.`}
                    </button>
                  ) : (
                    <button
                      onClick={handleStartNewProject}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 8, border: 'none',
                        background: 'linear-gradient(180deg, #1f6feb 0%, #388bfd 100%)',
                        color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                      }}
                    >
                      <Rocket size={16} />
                      Start Project in I.D.E.
                    </button>
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
              )}
            </div>
          ) : (
            /* ── POPULATED STATE GAP DRAWER (FOR STUDENTS WITH SKILLS) ── */
            <div>
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
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx, #c9d1d9)' }}>{activeRoleTitle}</span>
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
                            onClick={() => handleApplyUpgrade(gapAnalysis.recommended_project_id, selectedSkill.skill_id)}
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
          )}
        </div>
      </div>
    </div>
  );
}
