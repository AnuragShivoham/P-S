import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, ArrowLeft, Plus, ShieldCheck, Clock, 
  Layers, AlertTriangle, Loader2, Code, ChevronRight 
} from 'lucide-react';
import { api } from '../api/client';
import { useStore } from '../store';

const STATUS_CONFIG = {
  verified: { label: 'Verified by QA', color: '#3fb950', bg: 'rgba(63,185,80,0.1)' },
  in_progress: { label: 'In Development', color: '#58a6ff', bg: 'rgba(88,166,255,0.1)' },
  pending: { label: 'Pending Code', color: '#e3b341', bg: 'rgba(227,179,65,0.1)' },
  failed: { label: 'QA Failed', color: '#f85149', bg: 'rgba(248,81,73,0.1)' },
};

export default function ProjectRequirementsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqPriority, setReqPriority] = useState('high');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadRequirements();
  }, [id]);

  const loadRequirements = async () => {
    setLoading(true);
    try {
      const res = await api.getProjectRequirements(id);
      setRequirements(res.requirements || []);
    } catch (err) {
      console.error('[RequirementsPage] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRequirement = async (e) => {
    e.preventDefault();
    if (!reqTitle.trim()) return;
    setAdding(true);
    try {
      await api.addProjectRequirement(id, {
        title: reqTitle.trim(),
        description: reqDesc.trim(),
        priority: reqPriority
      });
      setShowAddModal(false);
      setReqTitle('');
      setReqDesc('');
      loadRequirements();
    } catch (err) {
      alert('Failed to add requirement: ' + err.message);
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <Loader2 size={36} className="spin" color="#58a6ff" />
        <span style={{ color: '#8b949e', marginTop: 12 }}>Loading Traceability Matrix...</span>
      </div>
    );
  }

  const verifiedCount = requirements.filter(r => r.status === 'verified').length;
  const progressPct = requirements.length ? Math.round((verifiedCount / requirements.length) * 100) : 0;

  return (
    <div style={styles.page}>
      {/* Top Nav */}
      <div style={styles.topNav}>
        <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>
          <ArrowLeft size={14} /> Back to Project Dashboard
        </button>

        <button 
          onClick={() => setShowAddModal(true)}
          style={styles.primaryBtn}
        >
          <Plus size={14} /> Add Requirement
        </button>
      </div>

      {/* Main Banner */}
      <div style={styles.headerCard}>
        <div>
          <h1 style={styles.title}>Requirement Traceability Matrix</h1>
          <p style={styles.subtitle}>
            Direct bidirectional traceability from citizen problem statements to student tasks and QA test results.
          </p>
        </div>

        <div style={styles.metricWrap}>
          <div style={styles.metricBig}>{progressPct}%</div>
          <div style={styles.metricLabel}>{verifiedCount} of {requirements.length} Verified</div>
        </div>
      </div>

      {/* Requirements Table */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeaderRow}>
          <span style={{ flex: 1, fontWeight: 600 }}>Code / Key</span>
          <span style={{ flex: 3, fontWeight: 600 }}>Requirement Statement</span>
          <span style={{ flex: 1, fontWeight: 600 }}>Priority</span>
          <span style={{ flex: 1.5, fontWeight: 600 }}>QA Status</span>
        </div>

        {requirements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#8b949e', fontSize: 13 }}>
            No requirements logged yet. Adopt a societal problem or add custom specifications.
          </div>
        ) : (
          requirements.map((req, idx) => {
            const statusConfig = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
            return (
              <div key={req.id} style={styles.tableRow}>
                <div style={{ flex: 1, fontFamily: 'monospace', color: '#58a6ff', fontSize: 12 }}>
                  {req.requirement_code || `REQ-${String(idx + 1).padStart(2, '0')}`}
                </div>
                <div style={{ flex: 3 }}>
                  <div style={{ fontWeight: 600, color: '#e6edf3', fontSize: 13 }}>{req.title}</div>
                  {req.description && (
                    <div style={{ color: '#8b949e', fontSize: 12, marginTop: 4 }}>{req.description}</div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{
                    fontSize: 11,
                    textTransform: 'capitalize',
                    color: req.priority === 'critical' || req.priority === 'high' ? '#f0883e' : '#8b949e'
                  }}>
                    {req.priority || 'Medium'}
                  </span>
                </div>
                <div style={{ flex: 1.5 }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 600,
                    color: statusConfig.color,
                    background: statusConfig.bg,
                    padding: '3px 8px',
                    borderRadius: 4
                  }}>
                    {statusConfig.label}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ fontSize: 18, color: '#e6edf3', margin: '0 0 10px 0' }}>Add Requirement</h3>
            <form onSubmit={handleAddRequirement}>
              <div style={{ marginBottom: 14 }}>
                <label style={styles.inputLabel}>Title</label>
                <input
                  type="text"
                  value={reqTitle}
                  onChange={e => setReqTitle(e.target.value)}
                  placeholder="e.g. Offline incident reporting queue"
                  required
                  style={styles.modalInput}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={styles.inputLabel}>Description / Acceptance Criteria</label>
                <textarea
                  rows={3}
                  value={reqDesc}
                  onChange={e => setReqDesc(e.target.value)}
                  placeholder="Must store pending submissions in IndexedDB when offline..."
                  style={styles.modalTextarea}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={styles.inputLabel}>Priority</label>
                <select
                  value={reqPriority}
                  onChange={e => setReqPriority(e.target.value)}
                  style={styles.modalSelect}
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  style={styles.secondaryBtn}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={adding}
                  style={styles.primaryBtn}
                >
                  {adding ? <Loader2 size={14} className="spin" /> : 'Save Requirement'}
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
    maxWidth: 1100,
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
  metricWrap: {
    textAlign: 'right'
  },
  metricBig: {
    fontSize: 32,
    fontWeight: 800,
    color: '#3fb950',
    fontFamily: 'monospace'
  },
  metricLabel: {
    fontSize: 11,
    color: '#8b949e'
  },
  tableCard: {
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: 8,
    overflow: 'hidden'
  },
  tableHeaderRow: {
    display: 'flex',
    padding: '12px 16px',
    background: '#161b22',
    borderBottom: '1px solid #30363d',
    fontSize: 12,
    color: '#8b949e'
  },
  tableRow: {
    display: 'flex',
    padding: '14px 16px',
    borderBottom: '1px solid #21262d',
    alignItems: 'center'
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
    maxWidth: 440,
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
  modalTextarea: {
    width: '100%',
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 6,
    padding: '8px 12px',
    color: '#e6edf3',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical'
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
