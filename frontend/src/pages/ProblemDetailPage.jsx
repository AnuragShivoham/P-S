import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Sparkles, MapPin, Users, AlertTriangle, 
  CheckCircle2, Clock, Shield, Share2, Layers, Cpu, 
  Code, Compass, FolderPlus, BookOpen, Loader2, Play, 
  ExternalLink, FileText, ChevronRight, RefreshCw, ThumbsUp 
} from 'lucide-react';
import { api } from '../api/client';
import { getMediaUrl } from '../api/config';
import { useStore } from '../store';

const URGENCY_STYLES = {
  critical: { bg: 'rgba(248,81,73,0.15)', text: '#f85149', border: 'rgba(248,81,73,0.4)' },
  high: { bg: 'rgba(240,136,62,0.15)', text: '#f0883e', border: 'rgba(240,136,62,0.4)' },
  medium: { bg: 'rgba(88,166,255,0.15)', text: '#58a6ff', border: 'rgba(88,166,255,0.4)' },
  low: { bg: 'rgba(139,148,158,0.15)', text: '#8b949e', border: 'rgba(139,148,158,0.4)' },
};

export default function ProblemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role, token, setProjectId, setProject } = useStore();

  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'intelligence' | 'media' | 'opportunities'
  const [analyzing, setAnalyzing] = useState(false);
  const [converting, setConverting] = useState(false);
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [interestSubmitting, setInterestSubmitting] = useState(false);
  const [interestSuccess, setInterestSuccess] = useState(false);
  const [showAdoptModal, setShowAdoptModal] = useState(false);
  const [conversionResult, setConversionResult] = useState(null);
  const [adopting, setAdopting] = useState(false);
  const [adoptionSuccess, setAdoptionSuccess] = useState(false);
  const [adoptions, setAdoptions] = useState([]);
  const [aiCategories, setAiCategories] = useState([]);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');
  const [applying, setApplying] = useState(false);
  const [studentApplication, setStudentApplication] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProblemDetail();
  }, [id]);

  const loadAdoptions = async () => {
    if (!token || !['mentor', 'university', 'admin'].includes(role)) return;
    try {
      const res = await api.getProblemAdoptions(id);
      setAdoptions(res.adoptions || []);
    } catch (e) {
      console.warn('Could not load adoptions:', e);
    }
  };

  const loadAiCategories = async () => {
    if (!token || !['mentor', 'university', 'admin'].includes(role)) return;
    try {
      const res = await api.getProblemAiCategories(id);
      setAiCategories(res.suggestions || []);
    } catch (e) {
      console.warn('Could not load AI categories:', e);
    }
  };

  const loadStudentApplication = async (projectId) => {
    if (!token || role !== 'student' || !projectId) return;
    try {
      const res = await api.getMyProjectApplication(projectId);
      setStudentApplication(res.application || null);
    } catch (e) {
      console.warn('Could not load student application:', e);
    }
  };

  const loadProblemDetail = async () => {
    setLoading(true);
    try {
      const res = await api.getProblem(id);
      setProblem(res.problem || null);
      if (res.problem?.linked_project_id && role === 'student') {
        loadStudentApplication(res.problem.linked_project_id);
      }
      if (['mentor', 'university', 'admin'].includes(role)) {
        loadAdoptions();
        loadAiCategories();
      }
    } catch (err) {
      console.error('[ProblemDetail] Error:', err);
      setError(err.message || 'Failed to load problem details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdoptProblem = async () => {
    setAdopting(true);
    try {
      await api.adoptProblem(id);
      setAdoptionSuccess(true);
      await loadProblemDetail();
      await loadAdoptions();
    } catch (err) {
      alert('Adoption failed: ' + err.message);
    } finally {
      setAdopting(false);
    }
  };

  const handleReviewAiCategory = async (catId, status, category_id) => {
    try {
      await api.reviewAiCategory(id, catId, status, category_id);
      await loadAiCategories();
    } catch (err) {
      alert('Review category failed: ' + err.message);
    }
  };

  const handleApplyToProject = async (e) => {
    e.preventDefault();
    if (!problem?.linked_project_id) return;
    setApplying(true);
    try {
      await api.applyToProject(problem.linked_project_id, applyMessage);
      setShowApplyModal(false);
      setApplyMessage('');
      await loadStudentApplication(problem.linked_project_id);
      alert('Application submitted successfully!');
    } catch (err) {
      alert('Application failed: ' + err.message);
    } finally {
      setApplying(false);
    }
  };

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    try {
      await api.analyzeProblem(id);
      await loadProblemDetail();
    } catch (err) {
      alert('Analysis failed: ' + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExpressInterest = async (intent = 'solve') => {
    setInterestSubmitting(true);
    try {
      await api.expressProblemInterest(id, { intent });
      setInterestSuccess(true);
      setTimeout(() => setInterestSuccess(false), 4000);
    } catch (err) {
      alert('Could not submit interest: ' + err.message);
    } finally {
      setInterestSubmitting(false);
    }
  };

  const handleConvertToProject = async () => {
    setConverting(true);
    try {
      const res = await api.convertProblemToProject(id);
      setConversionResult(res);
      if (res.project?.id) {
        setProjectId(res.project.id);
        setProject(res.project);
      }
    } catch (err) {
      alert('Conversion failed: ' + err.message);
    } finally {
      setConverting(false);
    }
  };

  const handleCreateCourse = async () => {
    setCreatingCourse(true);
    try {
      const res = await api.createProblemCourse(id);
      if (res.course?.id) {
        navigate(`/builder/${res.course.id}`);
      } else {
        alert('Course generated successfully!');
        loadProblemDetail();
      }
    } catch (err) {
      alert('Course generation failed: ' + err.message);
    } finally {
      setCreatingCourse(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <Loader2 size={36} className="spin" color="#58a6ff" />
        <span style={{ color: '#8b949e', marginTop: 12 }}>Loading problem specification...</span>
      </div>
    );
  }

  if (!problem) {
    return (
      <div style={styles.errorContainer}>
        <AlertTriangle size={36} color="#f85149" />
        <h2>Problem Not Found</h2>
        <button onClick={() => navigate('/problems')} style={styles.secondaryBtn}>
          <ArrowLeft size={14} /> Back to Problems Marketplace
        </button>
      </div>
    );
  }

  const urgencyStyle = URGENCY_STYLES[problem.urgency] || URGENCY_STYLES.medium;
  const analysis = problem.ai_analysis || {};
  const media = problem.media || [];
  const location = problem.location || {};
  const duplicates = problem.duplicates || [];

  return (
    <div style={styles.page}>
      {/* Top breadcrumb & back */}
      <div style={styles.topNav}>
        <button onClick={() => navigate('/problems')} style={styles.backBtn}>
          <ArrowLeft size={14} /> All Societal Problems
        </button>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#8b949e' }}>Tracking ID:</span>
          <code style={styles.codeSnippet}>#{problem.id.slice(0, 8)}</code>
        </div>
      </div>

      {/* Main Header Banner */}
      <div style={styles.headerCard}>
        <div style={styles.headerMain}>
          <div style={styles.pillRow}>
            <span style={{
              ...styles.urgencyPill,
              background: urgencyStyle.bg,
              color: urgencyStyle.text,
              borderColor: urgencyStyle.border
            }}>
              {problem.urgency?.toUpperCase()} URGENCY
            </span>
            <span style={styles.typePill}>
              {problem.category_name || problem.problem_type || 'Civic'}
            </span>
            <span style={styles.statusPill}>
              {problem.status === 'published' ? 'Open for University Adoption' : problem.status}
            </span>
          </div>

          <h1 style={styles.problemTitle}>{problem.title}</h1>

          <div style={styles.headerMetaRow}>
            <span style={styles.metaItem}>
              <MapPin size={14} color="#8b949e" />
              {location.district ? `${location.district}, ${location.state || 'India'}` : (location.formatted_address || 'Regional Area')}
            </span>

            {problem.affected_population_estimate > 0 && (
              <span style={styles.metaItem}>
                <Users size={14} color="#58a6ff" />
                ~{Number(problem.affected_population_estimate).toLocaleString()} citizens affected
              </span>
            )}

            <span style={styles.metaItem}>
              <Clock size={14} color="#8b949e" />
              Submitted on {new Date(problem.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Adopt / Action CTA */}
        <div style={styles.headerActions}>
          {!token ? (
            <button 
              onClick={() => navigate('/login')}
              style={styles.adoptBtn}
            >
              Log in to Adopt or Contribute
            </button>
          ) : ['mentor', 'university', 'admin'].includes(role) ? (
            <>
              <button 
                onClick={handleAdoptProblem}
                disabled={adopting || adoptionSuccess || problem.status === 'ADOPTED'}
                style={{
                  ...styles.adoptBtn,
                  background: (adoptionSuccess || problem.status === 'ADOPTED') ? 'rgba(63,185,80,0.15)' : 'linear-gradient(135deg, #1f6feb 0%, #238636 100%)',
                  color: (adoptionSuccess || problem.status === 'ADOPTED') ? '#3fb950' : '#ffffff',
                  borderColor: (adoptionSuccess || problem.status === 'ADOPTED') ? 'rgba(63,185,80,0.4)' : '#2ea043'
                }}
              >
                {adopting ? <Loader2 size={16} className="spin" /> : <Shield size={16} />}
                {adoptionSuccess || problem.status === 'ADOPTED' ? 'Problem Adopted ✓' : 'Adopt Problem'}
              </button>

              {problem.linked_project_id ? (
                <button 
                  onClick={() => navigate(`/projects/${problem.linked_project_id}/architecture`)}
                  style={styles.primaryBtn}
                >
                  <Cpu size={15} style={{ marginRight: 6 }} /> Open Workspace
                </button>
              ) : (
                <button 
                  onClick={() => setShowAdoptModal(true)}
                  style={styles.primaryBtn}
                >
                  <FolderPlus size={15} style={{ marginRight: 6 }} /> Create Active Project
                </button>
              )}
            </>
          ) : role === 'student' ? (
            problem.linked_project_id ? (
              studentApplication ? (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: studentApplication.status === 'approved' ? 'rgba(63,185,80,0.15)' : 'rgba(210,153,34,0.15)',
                  color: studentApplication.status === 'approved' ? '#3fb950' : '#d29922',
                  border: `1px solid ${studentApplication.status === 'approved' ? '#3fb95044' : '#d2992244'}`
                }}>
                  <CheckCircle2 size={14} /> Application: {studentApplication.status.toUpperCase()}
                </span>
              ) : (
                <button 
                  onClick={() => setShowApplyModal(true)}
                  style={styles.adoptBtn}
                >
                  <Users size={16} /> Apply to Join Project
                </button>
              )
            ) : (
              <span style={{ fontSize: 12, color: '#8b949e', padding: '8px 12px' }}>
                Open for Mentor Adoption
              </span>
            )
          ) : (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 20, fontSize: 12,
              color: '#58a6ff', background: 'rgba(88,166,255,0.1)', border: '1px solid rgba(88,166,255,0.3)'
            }}>
              Citizen Issue: #{problem.id.slice(0, 8)}
            </span>
          )}

          <button 
            onClick={() => handleExpressInterest('endorse')}
            disabled={interestSubmitting}
            style={styles.interestBtn}
          >
            <ThumbsUp size={14} color={interestSuccess ? '#3fb950' : '#8b949e'} />
            {interestSuccess ? 'Endorsed!' : 'Endorse Issue'}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={styles.tabNav}>
        {[
          { id: 'overview', label: 'Problem Overview', icon: FileText },
          { id: 'intelligence', label: 'AI Problem Intelligence', icon: Sparkles, count: analysis.summary ? 'Ready' : null },
          { id: 'media', label: `Evidence & Proof (${media.length})`, icon: Layers },
          { id: 'opportunities', label: 'Student & Mentor Opportunities', icon: Code }
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                ...styles.tabBtn,
                color: isActive ? '#58a6ff' : '#8b949e',
                borderBottomColor: isActive ? '#58a6ff' : 'transparent'
              }}
            >
              <Icon size={14} />
              <span>{t.label}</span>
              {t.count && <span style={styles.tabBadge}>{t.count}</span>}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: Overview */}
      {activeTab === 'overview' && (
        <div style={styles.tabContentGrid}>
          <div style={styles.leftCol}>
            <div style={styles.sectionCard}>
              <h3 style={styles.cardHeaderTitle}>Problem Description</h3>
              <p style={styles.bodyParagraph}>{problem.description}</p>
            </div>

            {problem.existing_workarounds && (
              <div style={styles.sectionCard}>
                <h3 style={styles.cardHeaderTitle}>Current Citizen Workarounds</h3>
                <p style={styles.bodyParagraph}>{problem.existing_workarounds}</p>
              </div>
            )}

            {problem.financial_impact_estimate && (
              <div style={styles.sectionCard}>
                <h3 style={styles.cardHeaderTitle}>Financial & Economic Impact</h3>
                <p style={styles.bodyParagraph}>{problem.financial_impact_estimate}</p>
              </div>
            )}

            {/* Potential Duplicates / Overlapping issues */}
            {duplicates.length > 0 && (
              <div style={styles.duplicateAlertBox}>
                <AlertTriangle size={18} color="#f0883e" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, color: '#f0883e', fontSize: 13 }}>
                    AI Similarity Notice: {duplicates.length} Overlapping Problem(s) Detected
                  </div>
                  <div style={{ fontSize: 12, color: '#c9d1d9', marginTop: 4 }}>
                    Other citizens have submitted similar challenges in this geographic sector. 
                    Merging or cross-referencing efforts creates higher community impact.
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={styles.rightCol}>
            {/* Location Card */}
            <div style={styles.sideCard}>
              <div style={styles.sideCardTitle}>
                <MapPin size={15} color="#58a6ff" /> Geographic Context
              </div>
              <div style={styles.sideCardRow}>
                <span style={styles.sideLabel}>District:</span>
                <span style={styles.sideVal}>{location.district || 'Unspecified'}</span>
              </div>
              <div style={styles.sideCardRow}>
                <span style={styles.sideLabel}>State / Region:</span>
                <span style={styles.sideVal}>{location.state || 'India'}</span>
              </div>
              <div style={styles.sideCardRow}>
                <span style={styles.sideLabel}>Privacy Mode:</span>
                <span style={styles.sideVal}>{location.privacy_level || 'approximate'}</span>
              </div>
              {location.formatted_address && (
                <div style={{ marginTop: 10, fontSize: 12, color: '#8b949e', lineHeight: 1.4 }}>
                  {location.formatted_address}
                </div>
              )}
            </div>

            {/* Submitter Card */}
            <div style={styles.sideCard}>
              <div style={styles.sideCardTitle}>
                <Shield size={15} color="#3fb950" /> Citizen Submitter
              </div>
              <div style={styles.sideCardRow}>
                <span style={styles.sideLabel}>Attribution:</span>
                <span style={styles.sideVal}>
                  {problem.is_anonymous ? 'Anonymous Community Member' : (problem.submitter_name || 'Citizen')}
                </span>
              </div>
            </div>

            {/* Quick AI status */}
            <div style={styles.sideCard}>
              <div style={styles.sideCardTitle}>
                <Sparkles size={15} color="#bc8cff" /> AI Intelligence Status
              </div>
              <div style={{ fontSize: 12, color: '#c9d1d9', lineHeight: 1.4, marginBottom: 12 }}>
                {analysis.summary 
                  ? 'Requirements and technical architecture specs generated.' 
                  : 'Pending automated extraction.'}
              </div>
              <button 
                onClick={handleRunAnalysis} 
                disabled={analyzing}
                style={styles.refreshAnalysisBtn}
              >
                {analyzing ? (
                  <Loader2 size={13} className="spin" />
                ) : (
                  <RefreshCw size={13} />
                )}
                {analysis.summary ? 'Re-run AI Analysis' : 'Generate AI Breakdown'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: AI Intelligence */}
      {activeTab === 'intelligence' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {analysis.summary ? (
            <>
              {/* AI Summary Banner */}
              <div style={styles.aiHighlightCard}>
                <div style={styles.aiBadge}>
                  <Sparkles size={14} color="#58a6ff" /> SOCRATES Problem Intelligence Engine
                </div>
                <h3 style={styles.aiSummaryTitle}>{analysis.problem_statement || analysis.summary}</h3>
                <p style={styles.aiSummaryDesc}>{analysis.summary}</p>
              </div>

              <div style={styles.twoColGrid}>
                {/* Stakeholders & Root Causes */}
                <div style={styles.sectionCard}>
                  <h3 style={styles.cardHeaderTitle}>Key Stakeholders</h3>
                  <div style={styles.tagWrap}>
                    {(analysis.stakeholders || []).map((s, idx) => (
                      <span key={idx} style={styles.stakeholderTag}>
                        <Users size={12} style={{ marginRight: 4 }} /> {s}
                      </span>
                    ))}
                  </div>

                  <h3 style={{ ...styles.cardHeaderTitle, marginTop: 24 }}>Identified Root Causes</h3>
                  <ul style={styles.bulletList}>
                    {(analysis.root_causes || []).map((rc, idx) => (
                      <li key={idx} style={styles.bulletItem}>{rc}</li>
                    ))}
                  </ul>
                </div>

                {/* Skills & Recommended Domains */}
                <div style={styles.sectionCard}>
                  <h3 style={styles.cardHeaderTitle}>Recommended Developer Skills & Stack</h3>
                  <div style={styles.tagWrap}>
                    {(analysis.required_skills || []).map((sk, idx) => (
                      <span key={idx} style={styles.skillTag}>
                        <Code size={12} style={{ marginRight: 4 }} /> {sk}
                      </span>
                    ))}
                  </div>

                  <h3 style={{ ...styles.cardHeaderTitle, marginTop: 24 }}>System Domains</h3>
                  <div style={styles.tagWrap}>
                    {(analysis.domains || []).map((d, idx) => (
                      <span key={idx} style={styles.domainTag}>{d}</span>
                    ))}
                  </div>

                  <h3 style={{ ...styles.cardHeaderTitle, marginTop: 24 }}>System Constraints</h3>
                  <ul style={styles.bulletList}>
                    {(analysis.constraints || []).map((c, idx) => (
                      <li key={idx} style={styles.bulletItem}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Extracted Key Requirements for Student Projects */}
              <div style={styles.sectionCard}>
                <h3 style={styles.cardHeaderTitle}>Derived Technical Requirements</h3>
                <div style={styles.reqGrid}>
                  {(analysis.key_requirements || []).map((req, idx) => (
                    <div key={idx} style={styles.reqCard}>
                      <div style={styles.reqHeader}>
                        <span style={styles.reqNumber}>REQ-{String(idx + 1).padStart(2, '0')}</span>
                        <span style={styles.reqTypeBadge}>Functional</span>
                      </div>
                      <div style={styles.reqText}>{req}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={styles.emptyCard}>
              <Sparkles size={36} color="#58a6ff" style={{ marginBottom: 12 }} />
              <h3 style={{ color: '#e6edf3', margin: '0 0 8px 0' }}>AI Intelligence Analysis Ready</h3>
              <p style={{ color: '#8b949e', fontSize: 13, maxWidth: 460, margin: '0 0 16px 0' }}>
                Run automated problem analysis to decompose this societal issue into engineering 
                requirements, root causes, stakeholder maps, and developer skill tags.
              </p>
              <button 
                onClick={handleRunAnalysis} 
                disabled={analyzing}
                style={styles.primaryBtn}
              >
                {analyzing ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} style={{ marginRight: 6 }} />}
                Decompose Problem with AI
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Media Proof */}
      {activeTab === 'media' && (
        <div style={styles.sectionCard}>
          <h3 style={styles.cardHeaderTitle}>Photographic & Video Evidence</h3>
          {media.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#8b949e', fontSize: 13 }}>
              No media attachments were provided with this submission.
            </div>
          ) : (
            <div style={styles.mediaGrid}>
              {media.map((m, idx) => (
                <div key={idx} style={styles.mediaCard}>
                  {m.media_type === 'video' ? (
                    <video 
                      src={getMediaUrl(m.id)} 
                      controls 
                      style={styles.mediaItem} 
                    />
                  ) : (
                    <img 
                      src={getMediaUrl(m.id)} 
                      alt={m.caption || 'Evidence photo'} 
                      style={styles.mediaItem} 
                    />
                  )}
                  <div style={styles.mediaFooter}>
                    <span style={{ fontSize: 11, color: '#c9d1d9' }}>{m.caption || `Proof Attachment #${idx + 1}`}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Opportunities */}
      {activeTab === 'opportunities' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Institutional / Mentor Adoption Card */}
          <div style={styles.sectionCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={styles.cardHeaderTitle}>Problem Adoption & Sponsorship</h3>
                <p style={{ fontSize: 12, color: '#8b949e', margin: '4px 0 0 0' }}>
                  Institutional mentors and universities adopt societal problems to sponsor student engineering cohorts.
                </p>
              </div>

              {['mentor', 'university', 'admin'].includes(role) && (
                <button 
                  onClick={handleAdoptProblem}
                  disabled={adopting || adoptionSuccess || problem.status === 'ADOPTED'}
                  style={{
                    ...styles.primaryBtn,
                    background: (adoptionSuccess || problem.status === 'ADOPTED') ? 'rgba(63,185,80,0.15)' : undefined,
                    color: (adoptionSuccess || problem.status === 'ADOPTED') ? '#3fb950' : undefined,
                    borderColor: (adoptionSuccess || problem.status === 'ADOPTED') ? 'rgba(63,185,80,0.4)' : undefined
                  }}
                >
                  {adopting ? <Loader2 size={14} className="spin" /> : <Shield size={14} style={{ marginRight: 6 }} />}
                  {adoptionSuccess || problem.status === 'ADOPTED' ? 'Adopted by Mentor ✓' : 'Adopt This Problem'}
                </button>
              )}
            </div>

            {adoptions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                <div style={{ fontSize: 12, color: '#8b949e', fontWeight: 600 }}>Registered Adopters:</div>
                {adoptions.map((ad, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 8, background: '#161b22', border: '1px solid #30363d'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Shield size={16} color="#3fb950" />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>{ad.adopter_name || 'Academic Mentor'}</div>
                        <div style={{ fontSize: 11, color: '#8b949e' }}>Role: {ad.role} • Status: {ad.status}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: '#8b949e' }}>{new Date(ad.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(139,148,158,0.06)', border: '1px dashed #30363d', fontSize: 12, color: '#8b949e' }}>
                {problem.status === 'ADOPTED' ? 'This problem is marked as adopted.' : 'No mentor or university has officially recorded adoption intent yet. Mentors may adopt to lead an active cohort.'}
              </div>
            )}
          </div>

          {/* Active Engineering Project Card */}
          <div style={styles.sectionCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={styles.cardHeaderTitle}>Active Engineering Project</h3>
                <p style={{ fontSize: 12, color: '#8b949e', margin: '4px 0 0 0' }}>
                  {problem.linked_project_id 
                    ? 'An engineering project workspace has been created with automated technical specifications.'
                    : 'Transform this challenge into an active development project with architecture and requirements.'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button 
                  onClick={handleCreateCourse}
                  disabled={creatingCourse}
                  style={styles.secondaryBtn}
                >
                  {creatingCourse ? <Loader2 size={14} className="spin" /> : <BookOpen size={14} style={{ marginRight: 6 }} />}
                  Generate Course Curriculum
                </button>

                {problem.linked_project_id ? (
                  <button 
                    onClick={() => navigate(`/projects/${problem.linked_project_id}/architecture`)}
                    style={styles.primaryBtn}
                  >
                    <Cpu size={14} style={{ marginRight: 6 }} />
                    Open Architecture Workspace
                  </button>
                ) : ['mentor', 'university', 'admin'].includes(role) ? (
                  <button 
                    onClick={() => setShowAdoptModal(true)}
                    style={styles.primaryBtn}
                  >
                    <FolderPlus size={14} style={{ marginRight: 6 }} />
                    Initialize Project
                  </button>
                ) : null}
              </div>
            </div>

            {problem.linked_project_id ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 16 }}>
                <button 
                  onClick={() => navigate(`/projects/${problem.linked_project_id}/architecture`)}
                  style={{ ...styles.secondaryBtn, justifyContent: 'center', padding: '12px' }}
                >
                  <Cpu size={16} color="#58a6ff" style={{ marginRight: 8 }} /> Multi-Tier Architecture
                </button>
                <button 
                  onClick={() => navigate(`/projects/${problem.linked_project_id}/requirements`)}
                  style={{ ...styles.secondaryBtn, justifyContent: 'center', padding: '12px' }}
                >
                  <Layers size={16} color="#3fb950" style={{ marginRight: 8 }} /> Traceability Matrix
                </button>
                <button 
                  onClick={() => navigate(`/projects/${problem.linked_project_id}/team`)}
                  style={{ ...styles.secondaryBtn, justifyContent: 'center', padding: '12px' }}
                >
                  <Users size={16} color="#f0883e" style={{ marginRight: 8 }} /> Team & Applications
                </button>
                <button 
                  onClick={() => navigate(`/projects/${problem.linked_project_id}/impact`)}
                  style={{ ...styles.secondaryBtn, justifyContent: 'center', padding: '12px' }}
                >
                  <Sparkles size={16} color="#bc8cff" style={{ marginRight: 8 }} /> Real-World Impact
                </button>
              </div>
            ) : (
              <div style={styles.opportunityInfoBox}>
                <div style={styles.oppItem}>
                  <Cpu size={20} color="#58a6ff" />
                  <div>
                    <div style={{ fontWeight: 600, color: '#e6edf3', fontSize: 13 }}>Multi-Tier System Architecture</div>
                    <div style={{ fontSize: 12, color: '#8b949e' }}>
                      Once converted, AI will generate the component diagrams, REST APIs, database models, and deployment targets.
                    </div>
                  </div>
                </div>

                <div style={styles.oppItem}>
                  <Layers size={20} color="#3fb950" />
                  <div>
                    <div style={{ fontWeight: 600, color: '#e6edf3', fontSize: 13 }}>Requirement Traceability</div>
                    <div style={{ fontSize: 12, color: '#8b949e' }}>
                      Each code milestone is mapped back to the citizen's original problem statements for full verification.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Student Application Section */}
          {role === 'student' && problem.linked_project_id && (
            <div style={styles.sectionCard}>
              <h3 style={styles.cardHeaderTitle}>Student Engineering Participation</h3>
              {studentApplication ? (
                <div style={{
                  padding: '16px', borderRadius: 8, background: '#161b22', border: '1px solid #30363d',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12
                }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#e6edf3', fontSize: 13 }}>
                      Application Status: <span style={{ color: studentApplication.status === 'approved' ? '#3fb950' : '#d29922' }}>{studentApplication.status.toUpperCase()}</span>
                    </div>
                    {studentApplication.message && (
                      <div style={{ fontSize: 12, color: '#8b949e', marginTop: 4 }}>
                        "{studentApplication.message}"
                      </div>
                    )}
                  </div>
                  {studentApplication.status === 'approved' && (
                    <button 
                      onClick={() => navigate(`/projects/${problem.linked_project_id}/team`)}
                      style={styles.primaryBtn}
                    >
                      Go to Project Workspace <ChevronRight size={14} style={{ marginLeft: 4 }} />
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#8b949e' }}>
                    Join the active project team to collaborate on code, architecture, and deployment.
                  </span>
                  <button 
                    onClick={() => setShowApplyModal(true)}
                    style={styles.primaryBtn}
                  >
                    <Users size={14} style={{ marginRight: 6 }} /> Apply to Join Team
                  </button>
                </div>
              )}
            </div>
          )}

          {/* AI Category Review (Mentors & Admins) */}
          {['mentor', 'university', 'admin'].includes(role) && aiCategories.length > 0 && (
            <div style={styles.sectionCard}>
              <h3 style={styles.cardHeaderTitle}>AI Suggested Categories Review</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                {aiCategories.map((cat) => (
                  <div key={cat.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: 8, background: '#161b22', border: '1px solid #30363d'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#e6edf3', fontSize: 13 }}>
                        {cat.suggested_category_name}
                        <span style={{ fontSize: 11, marginLeft: 8, color: '#58a6ff', fontFamily: 'var(--mono)' }}>
                          {Math.round(cat.confidence * 100)}% match
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#8b949e', marginTop: 2 }}>{cat.reasoning}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        onClick={() => handleReviewAiCategory(cat.id, 'APPROVED')}
                        style={{ ...styles.secondaryBtn, color: '#3fb950', borderColor: 'rgba(63,185,80,0.4)', padding: '6px 12px' }}
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => handleReviewAiCategory(cat.id, 'REJECTED')}
                        style={{ ...styles.secondaryBtn, color: '#f85149', borderColor: 'rgba(248,81,73,0.4)', padding: '6px 12px' }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Initialize Project Modal */}
      {showAdoptModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#e6edf3', margin: '0 0 10px 0' }}>
              Initialize Active Engineering Project
            </h3>
            <p style={{ fontSize: 13, color: '#8b949e', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              This will create a dedicated engineering project workspace in SOCRATES. 
              The problem's technical requirements and constraints will be pre-seeded into the project backlog.
            </p>

            {conversionResult ? (
              <div style={styles.conversionSuccessBox}>
                <CheckCircle2 size={24} color="#3fb950" />
                <div>
                  <div style={{ fontWeight: 600, color: '#e6edf3', fontSize: 13 }}>
                    Project Created: {conversionResult.project?.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#8b949e', marginTop: 4 }}>
                    {conversionResult.requirements_created} requirements generated and linked to societal problem #{problem.id.slice(0, 8)}.
                  </div>
                </div>
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button 
                onClick={() => { setShowAdoptModal(false); setConversionResult(null); }}
                style={styles.secondaryBtn}
              >
                Close
              </button>

              {conversionResult ? (
                <button 
                  onClick={() => navigate(`/projects/${conversionResult.project?.id}/architecture`)}
                  style={styles.primaryBtn}
                >
                  Open System Architecture <ChevronRight size={14} style={{ marginLeft: 4 }} />
                </button>
              ) : (
                <button 
                  onClick={handleConvertToProject}
                  disabled={converting}
                  style={styles.primaryBtn}
                >
                  {converting ? <Loader2 size={15} className="spin" /> : 'Confirm & Initialize Project'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Student Apply Modal */}
      {showApplyModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#e6edf3', margin: '0 0 10px 0' }}>
              Apply to Join Project Team
            </h3>
            <p style={{ fontSize: 13, color: '#8b949e', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Submit an application to the mentor to contribute to the technical solution for <strong>{problem.title}</strong>.
            </p>

            <form onSubmit={handleApplyToProject}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#c9d1d9', marginBottom: 6 }}>
                  Motivation & Relevant Skills
                </label>
                <textarea
                  value={applyMessage}
                  onChange={(e) => setApplyMessage(e.target.value)}
                  placeholder="Share why you'd like to work on this issue, relevant technologies you know (e.g. React, Node.js, Python), or questions for the mentor..."
                  rows={4}
                  style={{
                    width: '100%',
                    background: '#0d1117',
                    border: '1px solid #30363d',
                    borderRadius: 8,
                    padding: '10px 12px',
                    color: '#c9d1d9',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button 
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  style={styles.secondaryBtn}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={applying}
                  style={styles.primaryBtn}
                >
                  {applying ? <Loader2 size={15} className="spin" /> : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    maxWidth: 1120,
    margin: '0 auto',
    padding: '24px 20px 80px',
    fontFamily: 'var(--sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
    color: '#c9d1d9'
  },
  topNav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: 'none',
    color: '#58a6ff',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0
  },
  codeSnippet: {
    background: '#161b22',
    border: '1px solid #30363d',
    padding: '2px 6px',
    borderRadius: 4,
    color: '#58a6ff',
    fontSize: 11
  },
  headerCard: {
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: 10,
    padding: 24,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 24,
    marginBottom: 20,
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    flexWrap: 'wrap'
  },
  headerMain: {
    flex: 1,
    minWidth: 320
  },
  pillRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap'
  },
  urgencyPill: {
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 12,
    border: '1px solid',
    letterSpacing: '0.04em'
  },
  typePill: {
    fontSize: 11,
    fontWeight: 600,
    color: '#8b949e',
    background: '#161b22',
    padding: '2px 8px',
    borderRadius: 4,
    border: '1px solid #30363d'
  },
  statusPill: {
    fontSize: 11,
    fontWeight: 600,
    color: '#3fb950',
    background: 'rgba(63,185,80,0.1)',
    padding: '2px 8px',
    borderRadius: 4,
    border: '1px solid rgba(63,185,80,0.3)'
  },
  problemTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#e6edf3',
    margin: '0 0 12px 0',
    letterSpacing: '-0.02em',
    lineHeight: 1.3
  },
  headerMetaRow: {
    display: 'flex',
    gap: 16,
    fontSize: 12,
    color: '#8b949e',
    flexWrap: 'wrap'
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6
  },
  headerActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    alignItems: 'flex-end'
  },
  adoptBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: '#238636',
    border: '1px solid rgba(240,246,252,0.1)',
    borderRadius: 6,
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 16px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 8px rgba(35,134,54,0.3)'
  },
  interestBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: '#21262d',
    border: '1px solid #30363d',
    borderRadius: 6,
    color: '#c9d1d9',
    fontSize: 12,
    fontWeight: 500,
    padding: '6px 12px',
    cursor: 'pointer'
  },
  tabNav: {
    display: 'flex',
    borderBottom: '1px solid #30363d',
    marginBottom: 20,
    gap: 8
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '10px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  tabBadge: {
    fontSize: 10,
    background: 'rgba(88,166,255,0.15)',
    color: '#58a6ff',
    padding: '1px 6px',
    borderRadius: 10,
    fontWeight: 700
  },
  tabContentGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: 20
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  sectionCard: {
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: 8,
    padding: 20
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#e6edf3',
    margin: '0 0 12px 0'
  },
  bodyParagraph: {
    fontSize: 13,
    color: '#c9d1d9',
    lineHeight: 1.6,
    margin: 0
  },
  sideCard: {
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: 8,
    padding: 16
  },
  sideCardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    fontWeight: 600,
    color: '#e6edf3',
    marginBottom: 12,
    borderBottom: '1px solid #21262d',
    paddingBottom: 8
  },
  sideCardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    marginBottom: 6
  },
  sideLabel: {
    color: '#8b949e'
  },
  sideVal: {
    color: '#e6edf3',
    fontWeight: 500
  },
  refreshAnalysisBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 6,
    color: '#58a6ff',
    fontSize: 12,
    fontWeight: 600,
    padding: '8px 12px',
    cursor: 'pointer'
  },
  aiHighlightCard: {
    background: 'rgba(88,166,255,0.05)',
    border: '1px solid rgba(88,166,255,0.3)',
    borderRadius: 10,
    padding: 22
  },
  aiBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    fontWeight: 700,
    color: '#58a6ff',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 8
  },
  aiSummaryTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#e6edf3',
    margin: '0 0 10px 0',
    lineHeight: 1.3
  },
  aiSummaryDesc: {
    fontSize: 13,
    color: '#c9d1d9',
    lineHeight: 1.6,
    margin: 0
  },
  twoColGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16
  },
  tagWrap: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap'
  },
  stakeholderTag: {
    display: 'inline-flex',
    alignItems: 'center',
    background: '#161b22',
    border: '1px solid #30363d',
    color: '#e6edf3',
    fontSize: 11,
    fontWeight: 500,
    padding: '4px 10px',
    borderRadius: 16
  },
  skillTag: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'rgba(88,166,255,0.1)',
    border: '1px solid rgba(88,166,255,0.3)',
    color: '#58a6ff',
    fontSize: 11,
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: 6
  },
  domainTag: {
    display: 'inline-flex',
    alignItems: 'center',
    background: '#161b22',
    border: '1px solid #21262d',
    color: '#8b949e',
    fontSize: 11,
    padding: '4px 10px',
    borderRadius: 4
  },
  bulletList: {
    margin: 0,
    paddingLeft: 18
  },
  bulletItem: {
    fontSize: 12,
    color: '#c9d1d9',
    marginBottom: 6,
    lineHeight: 1.4
  },
  reqGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 12
  },
  reqCard: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 6,
    padding: 12
  },
  reqHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  reqNumber: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 700,
    color: '#58a6ff'
  },
  reqTypeBadge: {
    fontSize: 10,
    color: '#3fb950',
    background: 'rgba(63,185,80,0.1)',
    padding: '2px 6px',
    borderRadius: 4
  },
  reqText: {
    fontSize: 12,
    color: '#c9d1d9',
    lineHeight: 1.45
  },
  duplicateAlertBox: {
    display: 'flex',
    gap: 12,
    background: 'rgba(240,136,62,0.1)',
    border: '1px solid rgba(240,136,62,0.3)',
    borderRadius: 8,
    padding: 14
  },
  mediaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: 16
  },
  mediaCard: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 8,
    overflow: 'hidden'
  },
  mediaItem: {
    width: '100%',
    height: 180,
    objectFit: 'cover',
    display: 'block'
  },
  mediaFooter: {
    padding: '8px 12px',
    background: '#0d1117',
    borderTop: '1px solid #21262d'
  },
  opportunityInfoBox: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
    marginTop: 16,
    background: '#161b22',
    border: '1px solid #21262d',
    borderRadius: 8,
    padding: 16
  },
  oppItem: {
    display: 'flex',
    gap: 12
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 20
  },
  modalContent: {
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: 10,
    padding: 24,
    maxWidth: 480,
    width: '100%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
  },
  conversionSuccessBox: {
    display: 'flex',
    gap: 12,
    background: 'rgba(63,185,80,0.1)',
    border: '1px solid rgba(63,185,80,0.3)',
    borderRadius: 8,
    padding: 14
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: '#238636',
    border: '1px solid rgba(240,246,252,0.1)',
    borderRadius: 6,
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 14px',
    cursor: 'pointer'
  },
  secondaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: '#21262d',
    border: '1px solid #30363d',
    borderRadius: 6,
    color: '#c9d1d9',
    fontSize: 13,
    fontWeight: 500,
    padding: '8px 14px',
    cursor: 'pointer'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400
  },
  errorContainer: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#c9d1d9'
  },
  emptyCard: {
    textAlign: 'center',
    padding: '60px 20px',
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: 8,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  }
};
