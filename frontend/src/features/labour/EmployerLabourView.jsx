import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Users, Plus, CheckCircle2, TrendingUp, 
  Search, Filter, ExternalLink, Award, FileText, ArrowUpRight 
} from 'lucide-react';
import { api } from '../../api/client';
import { Spinner } from '../../components/UI';

export default function EmployerLabourView({ providerHealth }) {
  const [candidatesData, setCandidatesData] = useState(null);
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState('software-engineer');
  const [showPostModal, setShowPostModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [activeCandidate, setActiveCandidate] = useState(null);

  // New Requisition Form State
  const [reqForm, setReqForm] = useState({
    title: 'Software Engineer - Distributed Systems',
    organization: 'FinTech Hiring Partner',
    role_id: 'software-engineer',
    location: 'Hybrid / Bengaluru',
    min_experience_years: 1,
    required_skills: ['docker', 'rest-api', 'testing'],
    preferred_skills: ['observability', 'oop'],
    raw_content: ''
  });

  // Feedback Form State
  const [feedbackForm, setFeedbackForm] = useState({
    hiring_status: 'hired',
    readiness_rating: 5,
    communication_rating: 4,
    gap_notes: 'Candidate demonstrated verified Docker and automated unit testing competency.'
  });

  const [notification, setNotification] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [resCands, resReqs] = await Promise.allSettled([
        api.getEmployerCandidates(),
        api.getEmployerRequisitions()
      ]);

      if (resCands.status === 'fulfilled') setCandidatesData(resCands.value);
      if (resReqs.status === 'fulfilled') setRequisitions(resReqs.value?.requisitions || []);
    } catch (err) {
      console.error('[Employer View] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateRequisition = async (e) => {
    e.preventDefault();
    try {
      await api.createEmployerRequisition(reqForm);
      setNotification('Job requisition published and ingested into market matrix!');
      setShowPostModal(false);
      loadData();
      setTimeout(() => setNotification(''), 4000);
    } catch (err) {
      alert(`Error publishing requisition: ${err.message}`);
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!activeCandidate) return;
    try {
      await api.submitEmployerFeedback({
        candidate_id: activeCandidate.student_id,
        role_id: selectedRole,
        hiring_status: feedbackForm.hiring_status,
        readiness_rating: feedbackForm.readiness_rating,
        communication_rating: feedbackForm.communication_rating,
        gap_notes: feedbackForm.gap_notes
      });
      setNotification(`Placement feedback recorded for ${activeCandidate.student_name}!`);
      setShowFeedbackModal(false);
      loadData();
      setTimeout(() => setNotification(''), 4000);
    } catch (err) {
      alert(`Error submitting feedback: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  const metrics = candidatesData?.metrics || {
    total_profiles_has_skills: 1472,
    total_jobs_has_skills: 283,
    total_job_hired: 65
  };

  const candidates = candidatesData?.candidates || [];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px', fontFamily: 'var(--sans, system-ui)' }}>
      {/* Toast Notification */}
      {notification && (
        <div style={{
          padding: '12px 18px', background: '#238636', color: '#fff',
          borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 600
        }}>
          ✓ {notification}
        </div>
      )}

      {/* Header matching TalentsForce design */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px 0', color: 'var(--tx, #c9d1d9)' }}>
            Engineering Talent & Requisitions
          </h1>
          <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--tx-m, #8b949e)', marginTop: 4 }}>
            <span>Jul 1, 2026 - Dec 1, 2026</span> · <span>Location: All</span> · <span>Engineering</span>
          </div>
        </div>

        <button
          onClick={() => setShowPostModal(true)}
          style={{
            background: '#238636', border: 'none', color: '#fff',
            padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          <Plus size={16} /> Post New Requisition
        </button>
      </div>

      {/* 3 Metric Cards matching TalentsForce */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'var(--bg-d, #0d1117)', border: '1px solid var(--border, #30363d)', borderRadius: 10, padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--tx-m, #8b949e)', marginBottom: 6 }}>Total profile has skills ⓘ</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--tx, #c9d1d9)' }}>{metrics.total_profiles_has_skills}</div>
          <div style={{ fontSize: 12, color: '#3fb950', marginTop: 4 }}>↗ 10% (307)</div>
        </div>

        <div style={{ background: 'var(--bg-d, #0d1117)', border: '1px solid var(--border, #30363d)', borderRadius: 10, padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--tx-m, #8b949e)', marginBottom: 6 }}>Total job has skills ⓘ</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--tx, #c9d1d9)' }}>{metrics.total_jobs_has_skills}</div>
          <div style={{ fontSize: 12, color: '#f85149', marginTop: 4 }}>↘ 8% (307)</div>
        </div>

        <div style={{ background: 'var(--bg-d, #0d1117)', border: '1px solid var(--border, #30363d)', borderRadius: 10, padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--tx-m, #8b949e)', marginBottom: 6 }}>Total job Hired ⓘ</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--tx, #c9d1d9)' }}>{metrics.total_job_hired}</div>
          <div style={{ fontSize: 12, color: '#3fb950', marginTop: 4 }}>↗ 10% (307)</div>
        </div>
      </div>

      {/* Requisitions vs Candidates Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 24 }}>
        {/* Left: Verified Candidate Explorer */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px 0', color: 'var(--tx, #c9d1d9)' }}>
            Verified Candidates ({candidates.length})
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {candidates.map(cand => (
              <div
                key={cand.student_id}
                style={{
                  background: 'var(--bg-d, #0d1117)', border: '1px solid var(--border, #30363d)',
                  borderRadius: 10, padding: 16
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#58a6ff' }}>{cand.student_name}</span>
                    <div style={{ fontSize: 12, color: 'var(--tx-m, #8b949e)' }}>{cand.email}</div>
                  </div>
                  <button
                    onClick={() => { setActiveCandidate(cand); setShowFeedbackModal(true); }}
                    style={{
                      background: 'rgba(56, 139, 253, 0.1)', border: '1px solid rgba(56, 139, 253, 0.3)',
                      color: '#58a6ff', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    Feedback / Hire
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {cand.competencies.map(c => (
                    <span
                      key={c.skill_id}
                      style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 4,
                        background: c.status === 'VERIFIED' ? 'rgba(46, 160, 67, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: c.status === 'VERIFIED' ? '#3fb950' : 'var(--tx-m, #8b949e)',
                        fontWeight: 500
                      }}
                    >
                      {c.skill_name || c.skill_id} ({c.status})
                    </span>
                  ))}
                </div>

                {cand.verified_evidence?.length > 0 && (
                  <div style={{ fontSize: 11, color: '#3fb950', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={13} /> {cand.verified_evidence.length} verified IDE execution artifact(s)
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Own Submitted Job Requisitions */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px 0', color: 'var(--tx, #c9d1d9)' }}>
            Your Job Requisitions ({requisitions.length})
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {requisitions.length === 0 ? (
              <div style={{ padding: 20, background: 'var(--bg-d, #0d1117)', border: '1px dashed var(--border, #30363d)', borderRadius: 10, textAlign: 'center', color: 'var(--tx-m, #8b949e)', fontSize: 13 }}>
                No active requisitions yet. Click "+ Post New Requisition" to publish your skill criteria.
              </div>
            ) : (
              requisitions.map(r => (
                <div key={r.id} style={{ background: 'var(--bg-d, #0d1117)', border: '1px solid var(--border, #30363d)', borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx, #c9d1d9)' }}>{r.title}</span>
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(56, 139, 253, 0.15)', color: '#58a6ff', fontWeight: 600 }}>
                      {r.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--tx-m, #8b949e)', marginBottom: 8 }}>
                    {r.organization} · {r.location} · {r.min_experience_years}+ yrs exp
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {(r.required_skills || []).map(s => (
                      <span key={s} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: 'rgba(255,255,255,0.06)', color: 'var(--tx, #c9d1d9)' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Post Requisition Modal */}
      {showPostModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: 'var(--bg-d, #0d1117)', border: '1px solid var(--border, #30363d)', borderRadius: 12, width: '100%', maxWidth: 500, padding: 20 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: 'var(--tx, #c9d1d9)' }}>Post Job Requisition</h3>
            <form onSubmit={handleCreateRequisition} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--tx-m, #8b949e)', display: 'block', marginBottom: 4 }}>Job Title</label>
                <input
                  type="text"
                  value={reqForm.title}
                  onChange={e => setReqForm({ ...reqForm, title: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-o, #161b22)', border: '1px solid var(--border, #30363d)', borderRadius: 6, color: 'var(--tx, #c9d1d9)' }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--tx-m, #8b949e)', display: 'block', marginBottom: 4 }}>Organization</label>
                <input
                  type="text"
                  value={reqForm.organization}
                  onChange={e => setReqForm({ ...reqForm, organization: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-o, #161b22)', border: '1px solid var(--border, #30363d)', borderRadius: 6, color: 'var(--tx, #c9d1d9)' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--tx-m, #8b949e)', display: 'block', marginBottom: 4 }}>Min Experience (Years)</label>
                  <input
                    type="number"
                    value={reqForm.min_experience_years}
                    onChange={e => setReqForm({ ...reqForm, min_experience_years: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-o, #161b22)', border: '1px solid var(--border, #30363d)', borderRadius: 6, color: 'var(--tx, #c9d1d9)' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--tx-m, #8b949e)', display: 'block', marginBottom: 4 }}>Location</label>
                  <input
                    type="text"
                    value={reqForm.location}
                    onChange={e => setReqForm({ ...reqForm, location: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-o, #161b22)', border: '1px solid var(--border, #30363d)', borderRadius: 6, color: 'var(--tx, #c9d1d9)' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowPostModal(false)} style={{ padding: '8px 14px', background: 'none', border: '1px solid var(--border, #30363d)', color: 'var(--tx, #c9d1d9)', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', background: '#238636', border: 'none', color: '#fff', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>Publish Requisition</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Outcome Feedback Modal */}
      {showFeedbackModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: 'var(--bg-d, #0d1117)', border: '1px solid var(--border, #30363d)', borderRadius: 12, width: '100%', maxWidth: 480, padding: 20 }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: 16, color: 'var(--tx, #c9d1d9)' }}>
              Placement Feedback for {activeCandidate?.student_name}
            </h3>
            <form onSubmit={handleSubmitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--tx-m, #8b949e)', display: 'block', marginBottom: 4 }}>Hiring Status</label>
                <select
                  value={feedbackForm.hiring_status}
                  onChange={e => setFeedbackForm({ ...feedbackForm, hiring_status: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-o, #161b22)', border: '1px solid var(--border, #30363d)', borderRadius: 6, color: 'var(--tx, #c9d1d9)' }}
                >
                  <option value="hired">Hired (Offer Accepted)</option>
                  <option value="placed">Placed (Campus Drive)</option>
                  <option value="interviewed">Interviewed</option>
                  <option value="rejected">Rejected (Competency Gap)</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--tx-m, #8b949e)', display: 'block', marginBottom: 4 }}>Technical Readiness (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={feedbackForm.readiness_rating}
                    onChange={e => setFeedbackForm({ ...feedbackForm, readiness_rating: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-o, #161b22)', border: '1px solid var(--border, #30363d)', borderRadius: 6, color: 'var(--tx, #c9d1d9)' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--tx-m, #8b949e)', display: 'block', marginBottom: 4 }}>Communication (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={feedbackForm.communication_rating}
                    onChange={e => setFeedbackForm({ ...feedbackForm, communication_rating: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-o, #161b22)', border: '1px solid var(--border, #30363d)', borderRadius: 6, color: 'var(--tx, #c9d1d9)' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--tx-m, #8b949e)', display: 'block', marginBottom: 4 }}>Notes on Gaps or Competency</label>
                <textarea
                  rows="3"
                  value={feedbackForm.gap_notes}
                  onChange={e => setFeedbackForm({ ...feedbackForm, gap_notes: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-o, #161b22)', border: '1px solid var(--border, #30363d)', borderRadius: 6, color: 'var(--tx, #c9d1d9)' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowFeedbackModal(false)} style={{ padding: '8px 14px', background: 'none', border: '1px solid var(--border, #30363d)', color: 'var(--tx, #c9d1d9)', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', background: '#238636', border: 'none', color: '#fff', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>Submit Feedback</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
