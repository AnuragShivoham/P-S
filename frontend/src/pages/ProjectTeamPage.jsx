import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Users, UserPlus, ArrowLeft, Shield, CheckCircle2, 
  Copy, Check, Share2, Loader2, Mail, ExternalLink, Video 
} from 'lucide-react';
import { api } from '../api/client';
import { useStore } from '../store';

const ROLE_COLORS = {
  owner: '#f0883e',
  lead: '#bc8cff',
  developer: '#58a6ff',
  qa: '#3fb950',
  mentor: '#e3b341'
};

export default function ProjectTeamPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userName, role } = useStore();

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUserId, setInviteUserId] = useState('');
  const [inviteRole, setInviteRole] = useState('developer');
  const [inviting, setInviting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Live session
  const [session, setSession] = useState(null);
  const [startingSession, setStartingSession] = useState(false);

  // Student Applications
  const [applications, setApplications] = useState([]);
  const [reviewingAppId, setReviewingAppId] = useState(null);

  useEffect(() => {
    loadTeam();
    loadSession();
    loadApplications();
  }, [id, role]);

  const loadApplications = async () => {
    if (!['mentor', 'university', 'admin'].includes(role)) return;
    try {
      const res = await api.getProjectApplications(id);
      setApplications(res.applications || []);
    } catch (e) {
      console.warn('Could not load applications:', e);
    }
  };

  const handleReviewApplication = async (appId, status) => {
    setReviewingAppId(appId);
    try {
      await api.reviewProjectApplication(id, appId, status);
      await loadApplications();
      await loadTeam();
    } catch (err) {
      alert('Review failed: ' + err.message);
    } finally {
      setReviewingAppId(null);
    }
  };

  const loadTeam = async () => {
    setLoading(true);
    try {
      const res = await api.getProjectTeam(id);
      setTeam(res.team || null);
    } catch (err) {
      console.error('[TeamPage] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSession = async () => {
    try {
      const res = await api.getCollaborationSession(id);
      setSession(res.session || null);
    } catch (e) {
      console.warn('No active session:', e);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteUserId.trim()) return;
    setInviting(true);
    try {
      await api.inviteProjectTeamMember(id, {
        user_id: inviteUserId.trim(),
        role: inviteRole
      });
      setShowInviteModal(false);
      setInviteUserId('');
      loadTeam();
    } catch (err) {
      alert('Invite failed: ' + err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleStartSession = async () => {
    setStartingSession(true);
    try {
      const res = await api.startCollaborationSession(id, {
        session_type: 'web_monaco',
        max_participants: 6
      });
      setSession(res.session);
    } catch (err) {
      alert('Could not start live session: ' + err.message);
    } finally {
      setStartingSession(false);
    }
  };

  const copySessionLink = () => {
    const link = window.location.origin + `/ide?session=${session?.id || id}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <Loader2 size={36} className="spin" color="#58a6ff" />
        <span style={{ color: '#8b949e', marginTop: 12 }}>Loading team members...</span>
      </div>
    );
  }

  const members = team?.members || [];

  return (
    <div style={styles.page}>
      {/* Top Nav */}
      <div style={styles.topNav}>
        <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>
          <ArrowLeft size={14} /> Back to Project Dashboard
        </button>

        <button 
          onClick={() => setShowInviteModal(true)}
          style={styles.primaryBtn}
        >
          <UserPlus size={14} /> Invite Teammate
        </button>
      </div>

      {/* Main Banner */}
      <div style={styles.headerCard}>
        <div>
          <h1 style={styles.title}>Collaborative Engineering Team</h1>
          <p style={styles.subtitle}>
            Student developers, university leads, and mentors building solutions together.
          </p>
        </div>

        {/* Live Pair Programming / Session */}
        <div style={styles.sessionBox}>
          {session ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3fb950', boxShadow: '0 0 8px #3fb950' }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#e6edf3' }}>Live Workspace Active</div>
                <div style={{ fontSize: 11, color: '#8b949e' }}>Session #{session.id?.slice(0, 8)}</div>
              </div>
              <button onClick={copySessionLink} style={styles.copyBtn}>
                {copiedLink ? <Check size={12} color="#3fb950" /> : <Copy size={12} />}
                {copiedLink ? 'Copied' : 'Share Link'}
              </button>
            </div>
          ) : (
            <button 
              onClick={handleStartSession}
              disabled={startingSession}
              style={styles.startSessionBtn}
            >
              {startingSession ? <Loader2 size={13} className="spin" /> : <Share2 size={13} />}
              Start Live Coding Session
            </button>
          )}
        </div>
      </div>

      {/* Team Roster */}
      <div style={styles.rosterCard}>
        <h3 style={styles.cardHeaderTitle}>Active Members ({members.length})</h3>

        <div style={styles.memberGrid}>
          {members.map(m => {
            const roleColor = ROLE_COLORS[m.role] || '#8b949e';
            return (
              <div key={m.id} style={styles.memberCard}>
                <div style={styles.memberAvatar}>
                  {m.name ? m.name.charAt(0).toUpperCase() : 'U'}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={styles.memberName}>{m.name || m.user_id}</div>
                  <div style={styles.memberEmail}>{m.email || 'Project Collaborator'}</div>
                  <div style={{ marginTop: 6 }}>
                    <span style={{
                      ...styles.roleBadge,
                      color: roleColor,
                      borderColor: roleColor,
                      background: `${roleColor}15`
                    }}>
                      {m.role?.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Incoming Student Applications (Mentors & Admins) */}
      {['mentor', 'university', 'admin'].includes(role) && applications.length > 0 && (
        <div style={{ ...styles.rosterCard, marginTop: 20 }}>
          <h3 style={styles.cardHeaderTitle}>Student Applications ({applications.length})</h3>
          <p style={{ fontSize: 12, color: '#8b949e', margin: '4px 0 16px 0' }}>
            Review students requesting to join this active societal engineering team.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {applications.map((app) => (
              <div key={app.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', borderRadius: 8, background: '#161b22', border: '1px solid #30363d',
                flexWrap: 'wrap', gap: 12
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, color: '#e6edf3', fontSize: 13 }}>{app.student_name || 'Student Candidate'}</span>
                    <span style={{ fontSize: 11, color: '#8b949e' }}>({app.student_email || app.student_id})</span>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700,
                      background: app.status === 'approved' ? 'rgba(63,185,80,0.15)' : app.status === 'rejected' ? 'rgba(248,81,73,0.15)' : 'rgba(210,153,34,0.15)',
                      color: app.status === 'approved' ? '#3fb950' : app.status === 'rejected' ? '#f85149' : '#d29922',
                      border: '1px solid currentColor'
                    }}>
                      {app.status.toUpperCase()}
                    </span>
                  </div>
                  {app.message && (
                    <div style={{ fontSize: 12, color: '#8b949e', marginTop: 4, fontStyle: 'italic' }}>
                      "{app.message}"
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#6e7681', marginTop: 4 }}>
                    Applied: {new Date(app.created_at).toLocaleDateString()}
                  </div>
                </div>

                {app.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleReviewApplication(app.id, 'approved')}
                      disabled={reviewingAppId === app.id}
                      style={{ ...styles.secondaryBtn, color: '#3fb950', borderColor: 'rgba(63,185,80,0.4)', padding: '6px 14px' }}
                    >
                      {reviewingAppId === app.id ? <Loader2 size={12} className="spin" /> : 'Approve & Admit'}
                    </button>
                    <button
                      onClick={() => handleReviewApplication(app.id, 'rejected')}
                      disabled={reviewingAppId === app.id}
                      style={{ ...styles.secondaryBtn, color: '#f85149', borderColor: 'rgba(248,81,73,0.4)', padding: '6px 14px' }}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ fontSize: 18, color: '#e6edf3', margin: '0 0 10px 0' }}>
              Invite Team Member
            </h3>
            <p style={{ fontSize: 13, color: '#8b949e', margin: '0 0 16px 0' }}>
              Add another student engineer or mentor to collaborate on this societal solution.
            </p>

            <form onSubmit={handleInvite}>
              <div style={{ marginBottom: 14 }}>
                <label style={styles.inputLabel}>Username or User ID</label>
                <input
                  type="text"
                  value={inviteUserId}
                  onChange={e => setInviteUserId(e.target.value)}
                  placeholder="e.g. dev_user or student1"
                  required
                  style={styles.modalInput}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={styles.inputLabel}>Role</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  style={styles.modalSelect}
                >
                  <option value="developer">Developer (Frontend / Backend)</option>
                  <option value="lead">Technical Lead</option>
                  <option value="qa">QA Critic & Verification Engineer</option>
                  <option value="mentor">Academic / Industry Mentor</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button 
                  type="button" 
                  onClick={() => setShowInviteModal(false)}
                  style={styles.secondaryBtn}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={inviting}
                  style={styles.primaryBtn}
                >
                  {inviting ? <Loader2 size={14} className="spin" /> : 'Send Invite'}
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
    maxWidth: 1080,
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
  headerCard: {
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: 10,
    padding: 24,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 24,
    marginBottom: 20,
    flexWrap: 'wrap'
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: '#e6edf3',
    margin: '0 0 6px 0'
  },
  subtitle: {
    fontSize: 13,
    color: '#8b949e',
    margin: 0
  },
  sessionBox: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 8,
    padding: '10px 16px'
  },
  startSessionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: '#1f6feb',
    border: 'none',
    borderRadius: 6,
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    padding: '6px 14px',
    cursor: 'pointer'
  },
  copyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: '#21262d',
    border: '1px solid #30363d',
    borderRadius: 4,
    color: '#c9d1d9',
    fontSize: 11,
    padding: '4px 8px',
    cursor: 'pointer'
  },
  rosterCard: {
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: 8,
    padding: 20
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#e6edf3',
    margin: '0 0 16px 0'
  },
  memberGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16
  },
  memberCard: {
    background: '#161b22',
    border: '1px solid #21262d',
    borderRadius: 8,
    padding: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 14
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    background: '#21262d',
    border: '1px solid #30363d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: 700,
    color: '#58a6ff'
  },
  memberName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#e6edf3'
  },
  memberEmail: {
    fontSize: 12,
    color: '#8b949e',
    marginTop: 2
  },
  roleBadge: {
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: 4,
    border: '1px solid',
    display: 'inline-block'
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
    maxWidth: 420,
    width: '100%'
  },
  inputLabel: {
    display: 'block',
    fontSize: 12,
    color: '#c9d1d9',
    fontWeight: 600,
    marginBottom: 6
  },
  modalInput: {
    width: '100%',
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 6,
    padding: '8px 12px',
    color: '#e6edf3',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box'
  },
  modalSelect: {
    width: '100%',
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 6,
    padding: '8px 12px',
    color: '#e6edf3',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box'
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: '#238636',
    border: 'none',
    borderRadius: 6,
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 14px',
    cursor: 'pointer'
  },
  secondaryBtn: {
    background: '#21262d',
    border: '1px solid #30363d',
    borderRadius: 6,
    color: '#c9d1d9',
    fontSize: 13,
    fontWeight: 500,
    padding: '8px 14px',
    cursor: 'pointer'
  },
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400
  }
};
