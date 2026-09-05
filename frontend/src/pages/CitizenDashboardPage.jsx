import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle, Eye, Edit2, Trash2, RefreshCw, AlertTriangle,
  CheckCircle2, Clock, Layers, Lock, MapPin, Users, Globe, Loader2
} from 'lucide-react';
import { api } from '../api/client';
import { useStore } from '../store';

const STATUS_META = {
  SUBMITTED:           { label: 'Submitted',         color: '#8b949e', bg: 'rgba(139,148,158,0.12)' },
  REVIEW_REQUIRED:     { label: 'Under Review',       color: '#d29922', bg: 'rgba(210,153,34,0.12)' },
  APPROVED:            { label: 'Approved',           color: '#3fb950', bg: 'rgba(63,185,80,0.12)' },
  PUBLISHED:           { label: 'Published',          color: '#58a6ff', bg: 'rgba(88,166,255,0.12)' },
  NEEDS_CLARIFICATION: { label: 'Needs Clarification',color: '#f78166', bg: 'rgba(247,129,102,0.12)' },
  REJECTED:            { label: 'Rejected',           color: '#f85149', bg: 'rgba(248,81,73,0.12)' },
  ADOPTED:             { label: 'Adopted ✓',          color: '#bc8cff', bg: 'rgba(188,140,255,0.12)' },
};

function StatusPill({ status }) {
  const meta = STATUS_META[status] || { label: status, color: '#8b949e', bg: 'rgba(139,148,158,0.1)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      color: meta.color, background: meta.bg, border: `1px solid ${meta.color}33`,
      fontFamily: 'var(--mono)', letterSpacing: '0.04em', whiteSpace: 'nowrap'
    }}>
      {meta.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      background: 'var(--bg-o)', border: '1px solid var(--border)', borderRadius: 12,
      padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16,
      transition: 'border-color 0.2s',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = color}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: `${color}18`, border: `1px solid ${color}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--tx-1)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: 'var(--tx-2)', marginTop: 4, fontFamily: 'var(--sans)' }}>{label}</div>
      </div>
    </div>
  );
}

const LOCKED_STATUSES = ['PUBLISHED', 'ADOPTED'];

export default function CitizenDashboardPage() {
  const navigate = useNavigate();
  const { userName } = useStore();

  const [stats, setStats] = useState(null);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null); // problem id
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');

  const fetchProblems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 10 };
      if (filterStatus) params.status = filterStatus;
      const res = await api.getMyProblems(params);
      setProblems(res.problems || []);
      setPagination(res.pagination);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [page, filterStatus]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const s = await api.getMyProblemStats();
      setStats(s);
    } catch (e) {
      /* non-critical */
    }
    setStatsLoading(false);
  }, []);

  useEffect(() => { fetchProblems(); }, [fetchProblems]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await api.deleteProblem(id);
      setDeleteConfirm(null);
      fetchProblems();
      fetchStats();
    } catch (e) {
      setError(e.message);
    }
    setDeleting(false);
  };

  const isLocked = (p) => LOCKED_STATUSES.includes(p.status) || p.has_adopted_project;

  return (
    <div style={{ minHeight: 'calc(100vh - 52px)', overflowY: 'auto', background: 'var(--bg)', padding: '0 0 60px' }}>
      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(88,166,255,0.08) 0%, rgba(63,185,80,0.04) 100%)',
        borderBottom: '1px solid var(--border)', padding: '32px 40px 28px'
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: '#58a6ff', fontFamily: 'var(--mono)', letterSpacing: '0.12em', marginBottom: 8 }}>
                CITIZEN PORTAL
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--tx-1)', margin: 0, lineHeight: 1.2 }}>
                Welcome back, {userName || 'Citizen'} 👋
              </h1>
              <p style={{ color: 'var(--tx-2)', fontSize: 13, margin: '8px 0 0', fontFamily: 'var(--sans)' }}>
                Track and manage the societal problems you've reported. Published problems can be adopted by mentors and universities to create student-led projects.
              </p>
            </div>
            <button
              className="btn btn-p"
              style={{ height: 44, gap: 8, fontSize: 13, fontWeight: 700, padding: '0 20px' }}
              onClick={() => navigate('/problems/submit')}
            >
              <PlusCircle size={16} /> Submit New Problem
            </button>
          </div>

          {/* Stats */}
          {!statsLoading && stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 28 }}>
              <StatCard icon={Layers} label="Total Submitted" value={stats.total} color="#8b949e" />
              <StatCard icon={Clock} label="Under Review" value={stats.under_review} color="#d29922" />
              <StatCard icon={Globe} label="Published" value={stats.published} color="#58a6ff" />
              <StatCard icon={CheckCircle2} label="Adopted into Projects" value={stats.adopted} color="#3fb950" />
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 40px 0' }}>
        {/* Filter Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx-1)' }}>My Problems</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: 'var(--tx-2)' }}>Filter:</span>
          {['', 'SUBMITTED', 'REVIEW_REQUIRED', 'APPROVED', 'PUBLISHED', 'NEEDS_CLARIFICATION', 'REJECTED'].map(s => (
            <button
              key={s}
              onClick={() => { setFilterStatus(s); setPage(1); }}
              style={{
                fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20, cursor: 'pointer',
                background: filterStatus === s ? 'rgba(88,166,255,0.15)' : 'none',
                border: filterStatus === s ? '1px solid rgba(88,166,255,0.4)' : '1px solid var(--border)',
                color: filterStatus === s ? '#58a6ff' : 'var(--tx-2)',
                transition: 'all 0.15s', fontFamily: 'var(--mono)'
              }}
            >
              {s || 'All'}
            </button>
          ))}
          <button
            onClick={() => { fetchProblems(); fetchStats(); }}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', color: 'var(--tx-2)' }}
            title="Refresh"
          >
            <RefreshCw size={13} />
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 10, color: '#f85149', fontSize: 13
          }}>
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#58a6ff' }} />
          </div>
        ) : problems.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            background: 'var(--bg-o)', border: '1px dashed var(--border)', borderRadius: 16
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📭</div>
            <div style={{ fontWeight: 700, color: 'var(--tx-1)', marginBottom: 8 }}>
              {filterStatus ? `No problems with status "${STATUS_META[filterStatus]?.label || filterStatus}"` : 'No problems submitted yet'}
            </div>
            <p style={{ color: 'var(--tx-2)', fontSize: 13, maxWidth: 360, margin: '0 auto 24px', fontFamily: 'var(--sans)' }}>
              Describe a real-world problem you want to see solved. Your submission can become an AI-planned student project.
            </p>
            <button
              className="btn btn-p"
              onClick={() => navigate('/problems/submit')}
              style={{ margin: '0 auto', gap: 8 }}
            >
              <PlusCircle size={15} /> Submit Your First Problem
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {problems.map(p => (
              <div key={p.id} style={{
                background: 'var(--bg-o)', border: '1px solid var(--border)', borderRadius: 14,
                padding: '18px 22px', transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(88,166,255,0.3)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                      <StatusPill status={p.has_adopted_project ? 'ADOPTED' : p.status} />
                      {p.category_icon && (
                        <span style={{ fontSize: 11, color: 'var(--tx-2)', fontFamily: 'var(--mono)' }}>
                          {p.category_name || p.category_icon}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: 'var(--tx-m)', fontFamily: 'var(--mono)' }}>
                        {p.urgency?.toUpperCase()}
                      </span>
                    </div>

                    <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: 'var(--tx-1)', lineHeight: 1.3 }}>
                      {p.title}
                    </h3>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--tx-2)', lineHeight: 1.6, fontFamily: 'var(--sans)' }}>
                      {p.description?.slice(0, 150)}{p.description?.length > 150 ? '...' : ''}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
                      {p.location?.district && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--tx-2)', fontFamily: 'var(--sans)' }}>
                          <MapPin size={11} /> {p.location.district}{p.location.state ? `, ${p.location.state}` : ''}
                        </span>
                      )}
                      {p.people_affected && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--tx-2)', fontFamily: 'var(--sans)' }}>
                          <Users size={11} /> {p.people_affected} affected
                        </span>
                      )}
                      {p.media_count > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--tx-2)', fontFamily: 'var(--sans)' }}>
                          📎 {p.media_count} attachment{p.media_count > 1 ? 's' : ''}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: 'var(--tx-m)', fontFamily: 'var(--mono)' }}>
                        {new Date(p.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {p.has_adopted_project && p.linked_project_id && (
                      <div style={{
                        marginTop: 12, padding: '8px 12px', borderRadius: 8,
                        background: 'rgba(188,140,255,0.08)', border: '1px solid rgba(188,140,255,0.25)',
                        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap'
                      }}>
                        <CheckCircle2 size={13} color="#bc8cff" />
                        <span style={{ fontSize: 12, color: '#bc8cff', fontWeight: 600 }}>
                          Adopted! A mentor has created a project based on your submission.
                        </span>
                        <button
                          onClick={() => navigate(`/projects/${p.linked_project_id}/architecture`)}
                          style={{ fontSize: 11, color: '#bc8cff', background: 'none', border: '1px solid rgba(188,140,255,0.4)', borderRadius: 6, padding: '2px 10px', cursor: 'pointer' }}
                        >
                          View Project →
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
                    <button
                      onClick={() => navigate(`/problems/${p.id}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600,
                        padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                        background: 'none', border: '1px solid var(--border)', color: 'var(--tx-1)',
                        transition: 'all 0.15s',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#58a6ff'; e.currentTarget.style.color = '#58a6ff'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--tx-1)'; }}
                    >
                      <Eye size={13} /> View
                    </button>

                    {isLocked(p) ? (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
                        padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(139,148,158,0.2)',
                        color: 'var(--tx-m)', cursor: 'not-allowed', opacity: 0.6, whiteSpace: 'nowrap'
                      }}
                      title={`Cannot edit: problem is ${p.has_adopted_project ? 'adopted into a project' : 'published'}`}
                      >
                        <Lock size={13} /> Locked
                      </div>
                    ) : (
                      <button
                        onClick={() => navigate(`/problems/${p.id}`)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600,
                          padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                          background: 'none', border: '1px solid var(--border)', color: 'var(--tx-1)',
                          transition: 'all 0.15s', whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#d29922'; e.currentTarget.style.color = '#d29922'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--tx-1)'; }}
                        title="Edit Problem (opens detail page)"
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                    )}

                    {!isLocked(p) && (
                      <button
                        onClick={() => setDeleteConfirm(p.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600,
                          padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                          background: 'none', border: '1px solid var(--border)', color: 'var(--tx-m)',
                          transition: 'all 0.15s', whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#f85149'; e.currentTarget.style.color = '#f85149'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--tx-m)'; }}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 28 }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              style={{
                padding: '7px 18px', borderRadius: 8, cursor: page <= 1 ? 'not-allowed' : 'pointer',
                background: 'none', border: '1px solid var(--border)', color: page <= 1 ? 'var(--tx-m)' : 'var(--tx-1)',
                fontSize: 12, opacity: page <= 1 ? 0.5 : 1
              }}
            >
              ← Prev
            </button>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: 'var(--tx-2)', padding: '0 12px' }}>
              Page {page} of {pagination.pages}
            </span>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(p => p + 1)}
              style={{
                padding: '7px 18px', borderRadius: 8, cursor: page >= pagination.pages ? 'not-allowed' : 'pointer',
                background: 'none', border: '1px solid var(--border)', color: page >= pagination.pages ? 'var(--tx-m)' : 'var(--tx-1)',
                fontSize: 12, opacity: page >= pagination.pages ? 0.5 : 1
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}
        onClick={() => !deleting && setDeleteConfirm(null)}
        >
          <div style={{
            background: 'var(--bg)', border: '1px solid rgba(248,81,73,0.4)',
            borderRadius: 16, padding: '32px 36px', maxWidth: 400, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }}
          onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(248,81,73,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={20} color="#f85149" />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--tx-1)' }}>Delete Problem?</h3>
            </div>
            <p style={{ color: 'var(--tx-2)', fontSize: 13, margin: '0 0 24px', fontFamily: 'var(--sans)', lineHeight: 1.6 }}>
              This action is permanent and cannot be undone. The problem and all its media will be removed from the platform.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                style={{ flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer', background: 'none', border: '1px solid var(--border)', color: 'var(--tx-1)', fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer',
                  background: '#f85149', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
              >
                {deleting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
