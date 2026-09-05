import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Cpu, ArrowLeft, Sparkles, CheckCircle2, Shield, 
  Layers, Database, Globe, Server, Terminal, Loader2, 
  RefreshCw, Check, AlertCircle, ArrowRight, ExternalLink 
} from 'lucide-react';
import { api } from '../api/client';
import { useStore } from '../store';

const TIER_ICONS = {
  frontend: Globe,
  backend: Server,
  database: Database,
  external: Layers,
  ai_pipeline: Sparkles
};

export default function ProjectArchitecturePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role, setProjectId } = useStore();

  const [architecture, setArchitecture] = useState(null);
  const [allVersions, setAllVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [genNotes, setGenNotes] = useState('');
  const [showGenModal, setShowGenModal] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      setProjectId(id);
      loadArchitecture();
    }
  }, [id]);

  const loadArchitecture = async () => {
    setLoading(true);
    try {
      const res = await api.getProjectArchitecture(id);
      setArchitecture(res.architecture || null);
      setAllVersions(res.all_versions || []);
    } catch (err) {
      console.error('[ArchitecturePage] Error:', err);
      setError(err.message || 'Failed to load project architecture.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateArchitecture = async () => {
    setGenerating(true);
    try {
      const res = await api.generateProjectArchitecture(id, genNotes);
      setArchitecture(res.architecture);
      setShowGenModal(false);
      setGenNotes('');
      await loadArchitecture();
    } catch (err) {
      alert('Generation failed: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleApproveArchitecture = async () => {
    if (!architecture) return;
    setApproving(true);
    try {
      await api.approveProjectArchitecture(id, architecture.version);
      setArchitecture(prev => ({ ...prev, status: 'approved' }));
    } catch (err) {
      alert('Approval failed: ' + err.message);
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <Loader2 size={36} className="spin" color="#58a6ff" />
        <span style={{ color: '#8b949e', marginTop: 12 }}>Loading System Architecture...</span>
      </div>
    );
  }

  const spec = architecture?.spec || {};
  const tiers = spec.tiers || [];
  const connections = spec.connections || [];
  const techStack = spec.recommended_tech_stack || [];
  const rationale = spec.architecture_rationale || '';

  return (
    <div style={styles.page}>
      {/* Top Breadcrumb */}
      <div style={styles.topNav}>
        <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>
          <ArrowLeft size={14} /> Back to Project Dashboard
        </button>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {/* Version Switcher */}
          {allVersions.length > 1 && (
            <select
              value={architecture?.version}
              onChange={(e) => {
                const found = allVersions.find(v => v.version === Number(e.target.value));
                if (found) setArchitecture(found);
              }}
              style={styles.versionSelect}
            >
              {allVersions.map(v => (
                <option key={v.version} value={v.version}>
                  Version {v.version} ({v.status})
                </option>
              ))}
            </select>
          )}

          <button 
            onClick={() => setShowGenModal(true)}
            style={styles.regenerateBtn}
          >
            <Sparkles size={14} /> Refine Architecture with AI
          </button>
        </div>
      </div>

      {/* Main Header */}
      <div style={styles.headerCard}>
        <div>
          <div style={styles.badgeRow}>
            <span style={styles.versionBadge}>
              Architecture v{architecture?.version || 1}
            </span>
            <span style={{
              ...styles.statusBadge,
              background: architecture?.status === 'approved' ? 'rgba(63,185,80,0.1)' : 'rgba(227,179,65,0.1)',
              color: architecture?.status === 'approved' ? '#3fb950' : '#e3b341',
              borderColor: architecture?.status === 'approved' ? 'rgba(63,185,80,0.3)' : 'rgba(227,179,65,0.3)'
            }}>
              {architecture?.status === 'approved' ? 'Approved by Mentor' : 'Draft Proposal'}
            </span>
          </div>
          <h1 style={styles.title}>System Architecture & Technical Blueprint</h1>
          <p style={styles.subtitle}>
            Multi-tier component graph, data contracts, and recommended frameworks tailored for this societal challenge.
          </p>
        </div>

        <div style={styles.headerActions}>
          {architecture?.status !== 'approved' && (
            <button 
              onClick={handleApproveArchitecture}
              disabled={approving}
              style={styles.approveBtn}
            >
              {approving ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
              Approve Architecture
            </button>
          )}
          <button 
            onClick={() => navigate('/ide')}
            style={styles.openIdeBtn}
          >
            Open in Web IDE <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Rationale Callout */}
      {rationale && (
        <div style={styles.rationaleBox}>
          <Cpu size={20} color="#58a6ff" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 600, color: '#e6edf3', fontSize: 13 }}>Architecture Rationale</div>
            <div style={{ fontSize: 12, color: '#c9d1d9', marginTop: 4, lineHeight: 1.5 }}>
              {rationale}
            </div>
          </div>
        </div>
      )}

      {/* Tiers & Visual Components */}
      <div style={styles.tiersContainer}>
        <h3 style={styles.sectionHeading}>Component Graph & System Tiers</h3>

        <div style={styles.tiersGrid}>
          {tiers.map((tier, idx) => {
            const Icon = TIER_ICONS[tier.id] || Server;
            return (
              <div key={tier.id || idx} style={styles.tierCard}>
                <div style={styles.tierHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={styles.tierIconWrap}>
                      <Icon size={16} color="#58a6ff" />
                    </div>
                    <div>
                      <h4 style={styles.tierName}>{tier.name}</h4>
                      <span style={styles.tierType}>{tier.id}</span>
                    </div>
                  </div>
                </div>

                <div style={styles.componentList}>
                  {(tier.components || []).map((comp, cIdx) => (
                    <div key={cIdx} style={styles.componentItem}>
                      <div style={styles.compTitleRow}>
                        <span style={styles.compName}>{comp.name}</span>
                        {comp.tech && <span style={styles.compTechBadge}>{comp.tech}</span>}
                      </div>
                      {comp.description && (
                        <p style={styles.compDesc}>{comp.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommended Tech Stack Grid */}
      {techStack.length > 0 && (
        <div style={styles.techStackCard}>
          <h3 style={styles.sectionHeading}>Recommended Technology Stack</h3>
          <div style={styles.stackGrid}>
            {techStack.map((item, idx) => (
              <div key={idx} style={styles.stackItem}>
                <div style={styles.stackCategory}>{item.category}</div>
                <div style={styles.stackTechName}>{item.technology}</div>
                <div style={styles.stackRationale}>{item.rationale}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: AI Refinement */}
      {showGenModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ fontSize: 18, color: '#e6edf3', margin: '0 0 10px 0' }}>
              Refine Architecture with AI
            </h3>
            <p style={{ fontSize: 13, color: '#8b949e', margin: '0 0 16px 0' }}>
              Provide additional context or architectural constraints (e.g., "Must run offline-first with PWA", "Use PostgreSQL with PostGIS").
            </p>

            <textarea
              rows={4}
              value={genNotes}
              onChange={e => setGenNotes(e.target.value)}
              placeholder="e.g. Focus on mobile browser compatibility and low bandwidth rural networks..."
              style={styles.modalTextarea}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button 
                onClick={() => setShowGenModal(false)}
                style={styles.secondaryBtn}
              >
                Cancel
              </button>
              <button 
                onClick={handleGenerateArchitecture}
                disabled={generating}
                style={styles.primaryBtn}
              >
                {generating ? <Loader2 size={15} className="spin" /> : 'Generate Blueprint'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    maxWidth: 1160,
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
  versionSelect: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 6,
    color: '#e6edf3',
    fontSize: 12,
    padding: '5px 10px',
    outline: 'none'
  },
  regenerateBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: '#21262d',
    border: '1px solid #30363d',
    borderRadius: 6,
    color: '#58a6ff',
    fontSize: 12,
    fontWeight: 600,
    padding: '6px 12px',
    cursor: 'pointer'
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
  badgeRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    marginBottom: 10
  },
  versionBadge: {
    fontSize: 11,
    fontWeight: 700,
    background: '#161b22',
    border: '1px solid #30363d',
    color: '#58a6ff',
    padding: '2px 8px',
    borderRadius: 4
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 4,
    border: '1px solid'
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
    margin: 0,
    lineHeight: 1.5
  },
  headerActions: {
    display: 'flex',
    gap: 10,
    alignItems: 'center'
  },
  approveBtn: {
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
  openIdeBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: '#1f6feb',
    border: '1px solid rgba(240,246,252,0.1)',
    borderRadius: 6,
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 14px',
    cursor: 'pointer'
  },
  rationaleBox: {
    display: 'flex',
    gap: 12,
    background: 'rgba(88,166,255,0.06)',
    border: '1px solid rgba(88,166,255,0.25)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: 600,
    color: '#e6edf3',
    margin: '0 0 14px 0'
  },
  tiersContainer: {
    marginBottom: 24
  },
  tiersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 16
  },
  tierCard: {
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: 8,
    padding: 18,
    display: 'flex',
    flexDirection: 'column'
  },
  tierHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottom: '1px solid #21262d',
    paddingBottom: 10
  },
  tierIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 6,
    background: '#161b22',
    border: '1px solid #30363d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  tierName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#e6edf3',
    margin: 0
  },
  tierType: {
    fontSize: 11,
    color: '#8b949e',
    textTransform: 'uppercase'
  },
  componentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10
  },
  componentItem: {
    background: '#161b22',
    border: '1px solid #21262d',
    borderRadius: 6,
    padding: 12
  },
  compTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  compName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#e6edf3'
  },
  compTechBadge: {
    fontSize: 10,
    color: '#58a6ff',
    background: 'rgba(88,166,255,0.1)',
    padding: '2px 6px',
    borderRadius: 4
  },
  compDesc: {
    fontSize: 11,
    color: '#8b949e',
    margin: 0,
    lineHeight: 1.4
  },
  techStackCard: {
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: 8,
    padding: 20
  },
  stackGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: 14
  },
  stackItem: {
    background: '#161b22',
    border: '1px solid #21262d',
    borderRadius: 6,
    padding: 12
  },
  stackCategory: {
    fontSize: 10,
    color: '#8b949e',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 4
  },
  stackTechName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#e6edf3',
    marginBottom: 4
  },
  stackRationale: {
    fontSize: 11,
    color: '#8b949e',
    lineHeight: 1.4
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
  modalTextarea: {
    width: '100%',
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 6,
    padding: '10px 12px',
    color: '#e6edf3',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical'
  },
  primaryBtn: {
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
  }
};
