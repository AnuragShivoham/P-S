import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  TrendingUp, ArrowLeft, Plus, ShieldCheck, Heart, 
  Users, Award, BarChart3, Loader2, CheckCircle2 
} from 'lucide-react';
import { api } from '../api/client';
import { useStore } from '../store';

export default function ProjectImpactPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [impactData, setImpactData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [metricName, setMetricName] = useState('');
  const [metricValue, setMetricValue] = useState('');
  const [metricUnit, setMetricUnit] = useState('');
  const [metricCategory, setMetricCategory] = useState('citizens_reached');
  const [notes, setNotes] = useState('');
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    loadImpact();
  }, [id]);

  const loadImpact = async () => {
    setLoading(true);
    try {
      const res = await api.getProjectImpact(id);
      setImpactData(res);
    } catch (err) {
      console.error('[ImpactPage] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogMetric = async (e) => {
    e.preventDefault();
    if (!metricName.trim() || !metricValue) return;
    setLogging(true);
    try {
      await api.logProjectImpact(id, {
        metric_name: metricName.trim(),
        metric_value: parseFloat(metricValue),
        metric_unit: metricUnit.trim(),
        metric_category: metricCategory,
        notes: notes.trim()
      });
      setShowLogModal(false);
      setMetricName('');
      setMetricValue('');
      setMetricUnit('');
      setNotes('');
      loadImpact();
    } catch (err) {
      alert('Failed to log metric: ' + err.message);
    } finally {
      setLogging(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <Loader2 size={36} className="spin" color="#58a6ff" />
        <span style={{ color: '#8b949e', marginTop: 12 }}>Loading Impact Metrics...</span>
      </div>
    );
  }

  const metrics = impactData?.metrics || [];
  const totalCitizens = impactData?.total_citizens_served || 0;

  return (
    <div style={styles.page}>
      {/* Top Nav */}
      <div style={styles.topNav}>
        <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>
          <ArrowLeft size={14} /> Back to Project Dashboard
        </button>

        <button 
          onClick={() => setShowLogModal(true)}
          style={styles.primaryBtn}
        >
          <Plus size={14} /> Log Impact Metric
        </button>
      </div>

      {/* Main Banner */}
      <div style={styles.headerCard}>
        <div>
          <h1 style={styles.title}>Real-World Societal Impact</h1>
          <p style={styles.subtitle}>
            Empirical measurements, verified citizen outcomes, and public performance data.
          </p>
        </div>

        <div style={styles.metricWrap}>
          <div style={styles.metricBig}>{Number(totalCitizens).toLocaleString()}</div>
          <div style={styles.metricLabel}>Total Citizens Reached</div>
        </div>
      </div>

      {/* Key Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statBox}>
          <Users size={24} color="#58a6ff" />
          <div style={styles.statVal}>{Number(totalCitizens).toLocaleString()}</div>
          <div style={styles.statTitle}>Citizens Benefited</div>
        </div>

        <div style={styles.statBox}>
          <CheckCircle2 size={24} color="#3fb950" />
          <div style={styles.statVal}>{metrics.filter(m => m.verified_by).length}</div>
          <div style={styles.statTitle}>Verified Metric Records</div>
        </div>

        <div style={styles.statBox}>
          <Award size={24} color="#bc8cff" />
          <div style={styles.statVal}>{metrics.length}</div>
          <div style={styles.statTitle}>Total Impact Logs</div>
        </div>
      </div>

      {/* Metric Log Table */}
      <div style={styles.tableCard}>
        <h3 style={styles.cardHeaderTitle}>Metric Log History</h3>

        <div style={styles.tableHeaderRow}>
          <span style={{ flex: 2, fontWeight: 600 }}>Metric</span>
          <span style={{ flex: 1.5, fontWeight: 600 }}>Value & Unit</span>
          <span style={{ flex: 1.5, fontWeight: 600 }}>Category</span>
          <span style={{ flex: 1.5, fontWeight: 600 }}>Recorded Date</span>
          <span style={{ flex: 1.5, fontWeight: 600 }}>Verification</span>
        </div>

        {metrics.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#8b949e', fontSize: 13 }}>
            No impact metrics logged yet. Log the first field outcome or deployment statistic.
          </div>
        ) : (
          metrics.map(m => (
            <div key={m.id} style={styles.tableRow}>
              <div style={{ flex: 2 }}>
                <div style={{ fontWeight: 600, color: '#e6edf3', fontSize: 13 }}>{m.metric_name}</div>
                {m.notes && <div style={{ color: '#8b949e', fontSize: 11, marginTop: 2 }}>{m.notes}</div>}
              </div>
              <div style={{ flex: 1.5, fontFamily: 'monospace', color: '#58a6ff', fontSize: 13, fontWeight: 700 }}>
                {m.metric_value} {m.metric_unit}
              </div>
              <div style={{ flex: 1.5, textTransform: 'capitalize', color: '#8b949e', fontSize: 12 }}>
                {m.metric_category?.replace('_', ' ')}
              </div>
              <div style={{ flex: 1.5, color: '#8b949e', fontSize: 12 }}>
                {new Date(m.measured_at).toLocaleDateString()}
              </div>
              <div style={{ flex: 1.5 }}>
                {m.verified_by ? (
                  <span style={styles.verifiedBadge}>
                    <ShieldCheck size={12} /> Verified
                  </span>
                ) : (
                  <span style={styles.pendingBadge}>Self-reported</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Log Modal */}
      {showLogModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ fontSize: 18, color: '#e6edf3', margin: '0 0 10px 0' }}>Log Field Impact</h3>
            <form onSubmit={handleLogMetric}>
              <div style={{ marginBottom: 12 }}>
                <label style={styles.inputLabel}>Metric Name</label>
                <input
                  type="text"
                  value={metricName}
                  onChange={e => setMetricName(e.target.value)}
                  placeholder="e.g. Daily Water Contamination Reports Resolved"
                  required
                  style={styles.modalInput}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.inputLabel}>Numerical Value</label>
                  <input
                    type="number"
                    step="any"
                    value={metricValue}
                    onChange={e => setMetricValue(e.target.value)}
                    placeholder="e.g. 450"
                    required
                    style={styles.modalInput}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.inputLabel}>Unit</label>
                  <input
                    type="text"
                    value={metricUnit}
                    onChange={e => setMetricUnit(e.target.value)}
                    placeholder="e.g. citizens, %, hours"
                    style={styles.modalInput}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={styles.inputLabel}>Category</label>
                <select
                  value={metricCategory}
                  onChange={e => setMetricCategory(e.target.value)}
                  style={styles.modalSelect}
                >
                  <option value="citizens_reached">Citizens Reached</option>
                  <option value="time_saved">Time Saved / Hours</option>
                  <option value="accuracy_gain">Accuracy / Reduction in Errors</option>
                  <option value="cost_saved">Cost / Resources Saved</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={styles.inputLabel}>Notes & Context</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Field validation source or survey link..."
                  style={styles.modalTextarea}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button 
                  type="button" 
                  onClick={() => setShowLogModal(false)}
                  style={styles.secondaryBtn}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={logging}
                  style={styles.primaryBtn}
                >
                  {logging ? <Loader2 size={14} className="spin" /> : 'Record Metric'}
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
  metricWrap: {
    textAlign: 'right'
  },
  metricBig: {
    fontSize: 32,
    fontWeight: 800,
    color: '#58a6ff',
    fontFamily: 'monospace'
  },
  metricLabel: {
    fontSize: 11,
    color: '#8b949e'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
    marginBottom: 24
  },
  statBox: {
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: 8,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center'
  },
  statVal: {
    fontSize: 26,
    fontWeight: 700,
    color: '#e6edf3',
    margin: '10px 0 4px'
  },
  statTitle: {
    fontSize: 12,
    color: '#8b949e'
  },
  tableCard: {
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
  tableHeaderRow: {
    display: 'flex',
    padding: '10px 14px',
    background: '#161b22',
    borderBottom: '1px solid #30363d',
    fontSize: 12,
    color: '#8b949e'
  },
  tableRow: {
    display: 'flex',
    padding: '14px',
    borderBottom: '1px solid #21262d',
    alignItems: 'center'
  },
  verifiedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    color: '#3fb950',
    background: 'rgba(63,185,80,0.1)',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600
  },
  pendingBadge: {
    color: '#8b949e',
    background: '#161b22',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 11
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
