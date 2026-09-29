import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Plus, Filter, Sparkles, MapPin, Users, 
  Clock, AlertTriangle, Layers, ArrowRight, Loader2, 
  CheckCircle2, Compass, Tag, ShieldCheck, Heart 
} from 'lucide-react';
import { api } from '../api/client';
import { useStore } from '../store';

const URGENCY_COLORS = {
  critical: { bg: 'rgba(248,81,73,0.15)', text: '#f85149', border: 'rgba(248,81,73,0.4)' },
  high: { bg: 'rgba(240,136,62,0.15)', text: '#f0883e', border: 'rgba(240,136,62,0.4)' },
  medium: { bg: 'rgba(88,166,255,0.15)', text: '#58a6ff', border: 'rgba(88,166,255,0.4)' },
  low: { bg: 'rgba(139,148,158,0.15)', text: '#8b949e', border: 'rgba(139,148,158,0.4)' },
};

const STATUS_LABELS = {
  submitted: { label: 'Under Review', color: '#e3b341' },
  analyzed: { label: 'AI Analyzed', color: '#58a6ff' },
  approved: { label: 'Approved', color: '#3fb950' },
  published: { label: 'Open for Adoption', color: '#3fb950' },
  in_development: { label: 'In Active Development', color: '#bc8cff' },
  resolved: { label: 'Solution Delivered', color: '#2ea043' },
};

export default function SocietalProblemsPage() {
  const navigate = useNavigate();
  const { role, token } = useStore();

  const [problems, setProblems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [urgency, setUrgency] = useState('');
  const [status, setStatus] = useState('');
  const [district, setDistrict] = useState('');

  useEffect(() => {
    loadCategories();
    loadProblems();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await api.getProblemCategories();
      setCategories(res.categories || []);
    } catch (e) {
      console.warn('Could not load categories:', e);
    }
  };

  const loadProblems = async (customParams = {}) => {
    setLoading(true);
    try {
      const params = {
        search: customParams.search !== undefined ? customParams.search : search,
        category_id: customParams.category !== undefined ? customParams.category : category,
        urgency: customParams.urgency !== undefined ? customParams.urgency : urgency,
        status: customParams.status !== undefined ? customParams.status : status,
        district: customParams.district !== undefined ? customParams.district : district,
        limit: 50
      };
      const res = await api.getProblems(params);
      setProblems(res.problems || []);
      setTotalCount(res.total || res.problems?.length || 0);
    } catch (err) {
      console.error('[SocietalProblemsPage] Load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadProblems();
  };

  const resetFilters = () => {
    setSearch('');
    setCategory('');
    setUrgency('');
    setStatus('');
    setDistrict('');
    loadProblems({ search: '', category: '', urgency: '', status: '', district: '' });
  };

  return (
    <div style={styles.page}>
      {/* Hero Banner */}
      <div style={styles.hero}>
        <div style={styles.heroContent}>
          <div style={styles.badge}>
            <Sparkles size={13} color="#58a6ff" />
            <span>Civic Problem Marketplace</span>
          </div>
          <h1 style={styles.heroTitle}>Real-World Societal Problems</h1>
          <p style={styles.heroSub}>
            Surface real community challenges, run AI problem intelligence, and connect them with 
            university engineering teams and mentors to engineer high-impact open software solutions.
          </p>
        </div>

        <div style={styles.heroActions}>
          <button 
            onClick={() => navigate('/problems/submit')}
            style={styles.submitBtn}
          >
            <Plus size={16} /> Submit a Problem
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div style={styles.filterCard}>
        <form onSubmit={handleSearchSubmit} style={styles.searchRow}>
          <div style={styles.searchWrap}>
            <Search size={16} color="#8b949e" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by keywords, city, or problem title..."
              style={styles.searchInput}
            />
          </div>
          <button type="submit" style={styles.filterApplyBtn}>Search</button>
        </form>

        <div style={styles.filterControls}>
          <div style={styles.filterItem}>
            <label style={styles.filterLabel}>Category</label>
            <select
              value={category}
              onChange={e => { setCategory(e.target.value); loadProblems({ category: e.target.value }); }}
              style={styles.select}
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterItem}>
            <label style={styles.filterLabel}>Urgency</label>
            <select
              value={urgency}
              onChange={e => { setUrgency(e.target.value); loadProblems({ urgency: e.target.value }); }}
              style={styles.select}
            >
              <option value="">All Urgencies</option>
              <option value="critical">🚨 Critical</option>
              <option value="high">⚠️ High</option>
              <option value="medium">⚡ Medium</option>
              <option value="low">🌱 Low</option>
            </select>
          </div>

          <div style={styles.filterItem}>
            <label style={styles.filterLabel}>Status</label>
            <select
              value={status}
              onChange={e => { setStatus(e.target.value); loadProblems({ status: e.target.value }); }}
              style={styles.select}
            >
              <option value="">All Statuses</option>
              <option value="published">Open for Adoption</option>
              <option value="in_development">In Active Development</option>
              <option value="analyzed">AI Analyzed</option>
              <option value="submitted">Under Review</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {(search || category || urgency || status || district) && (
            <button onClick={resetFilters} style={styles.clearBtn}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div style={styles.statsBar}>
        <div style={styles.statText}>
          Found <strong style={{ color: '#e6edf3' }}>{totalCount}</strong> societal problems
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={styles.legendPill}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3fb950' }} />
            Open for University Adoption
          </span>
          <span style={styles.legendPill}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#bc8cff' }} />
            Student Teams Building
          </span>
        </div>
      </div>

      {/* Grid of Problem Cards */}
      {loading ? (
        <div style={styles.loadingWrap}>
          <Loader2 size={32} className="spin" color="#58a6ff" />
          <span style={{ color: '#8b949e', fontSize: 13, marginTop: 12 }}>Loading civic problems...</span>
        </div>
      ) : problems.length === 0 ? (
        <div style={styles.emptyCard}>
          <Compass size={40} color="#8b949e" style={{ opacity: 0.5, marginBottom: 12 }} />
          <h3 style={{ fontSize: 18, color: '#e6edf3', margin: '0 0 6px 0' }}>No matching problems found</h3>
          <p style={{ color: '#8b949e', fontSize: 13, maxWidth: 440, margin: '0 0 16px 0' }}>
            There are currently no problems matching your search criteria. Submit a new real-world challenge
            or clear filters to explore other issues.
          </p>
          <button 
            onClick={() => navigate('/problems/submit')}
            style={styles.submitBtn}
          >
            <Plus size={16} /> Submit a New Problem
          </button>
        </div>
      ) : (
        <div style={styles.grid}>
          {problems.map(prob => {
            const urgencyStyle = URGENCY_COLORS[prob.urgency] || URGENCY_COLORS.medium;
            const statusConfig = STATUS_LABELS[prob.status] || { label: prob.status, color: '#8b949e' };
            const locationStr = prob.district ? `${prob.district}, ${prob.state || 'India'}` : (prob.formatted_address || 'Regional Area');

            return (
              <div 
                key={prob.id} 
                style={styles.card}
                onClick={() => navigate(`/problems/${prob.id}`)}
              >
                <div style={styles.cardHeader}>
                  <span style={{
                    ...styles.urgencyBadge,
                    background: urgencyStyle.bg,
                    color: urgencyStyle.text,
                    borderColor: urgencyStyle.border
                  }}>
                    {prob.urgency?.toUpperCase()} URGENCY
                  </span>

                  <span style={{
                    ...styles.statusBadge,
                    color: statusConfig.color,
                    borderColor: statusConfig.color
                  }}>
                    {statusConfig.label}
                  </span>
                </div>

                <h3 style={styles.cardTitle}>{prob.title}</h3>
                <p style={styles.cardDesc}>{prob.description}</p>

                {/* Location & Impact Stats */}
                <div style={styles.cardMetaRow}>
                  <div style={styles.metaItem}>
                    <MapPin size={13} color="#8b949e" />
                    <span>{locationStr}</span>
                  </div>

                  {prob.affected_population_estimate > 0 && (
                    <div style={styles.metaItem}>
                      <Users size={13} color="#58a6ff" />
                      <span>~{Number(prob.affected_population_estimate).toLocaleString()} citizens</span>
                    </div>
                  )}
                </div>

                {/* AI Analysis Badges if ready */}
                {prob.ai_summary && (
                  <div style={styles.aiSnippet}>
                    <Sparkles size={12} color="#58a6ff" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={styles.aiSnippetText}>
                      {prob.ai_summary}
                    </span>
                  </div>
                )}

                {/* Category & Action Footer */}
                <div style={styles.cardFooter}>
                  <span style={styles.categoryPill}>
                    <Tag size={11} style={{ marginRight: 4 }} />
                    {prob.category_name || prob.problem_type || 'Civic'}
                  </span>

                  <button 
                    style={styles.exploreBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/problems/${prob.id}`);
                    }}
                  >
                    View Project <ArrowRight size={13} style={{ marginLeft: 4 }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    maxWidth: 1180,
    margin: '0 auto',
    padding: '24px 20px 80px',
    fontFamily: 'var(--sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
    color: '#c9d1d9'
  },
  hero: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 24,
    marginBottom: 24,
    paddingBottom: 24,
    borderBottom: '1px solid #21262d',
    flexWrap: 'wrap'
  },
  heroContent: {
    maxWidth: 720
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '3px 10px',
    borderRadius: 20,
    background: 'rgba(88,166,255,0.1)',
    border: '1px solid rgba(88,166,255,0.3)',
    color: '#58a6ff',
    fontSize: 11,
    fontWeight: 600,
    marginBottom: 10,
    letterSpacing: '0.04em'
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: '#e6edf3',
    margin: '0 0 8px 0',
    letterSpacing: '-0.02em'
  },
  heroSub: {
    fontSize: 14,
    color: '#8b949e',
    margin: 0,
    lineHeight: 1.5
  },
  heroActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  submitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: '#238636',
    border: '1px solid rgba(240,246,252,0.1)',
    borderRadius: 6,
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 16px',
    cursor: 'pointer',
    transition: 'background 0.2s',
    boxShadow: '0 2px 8px rgba(35,134,54,0.3)'
  },
  filterCard: {
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20
  },
  searchRow: {
    display: 'flex',
    gap: 10,
    marginBottom: 14
  },
  searchWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 6,
    padding: '0 12px'
  },
  searchInput: {
    width: '100%',
    background: 'none',
    border: 'none',
    color: '#e6edf3',
    fontSize: 13,
    padding: '10px 0',
    outline: 'none'
  },
  filterApplyBtn: {
    background: '#21262d',
    border: '1px solid #30363d',
    borderRadius: 6,
    color: '#c9d1d9',
    fontSize: 13,
    fontWeight: 600,
    padding: '0 16px',
    cursor: 'pointer'
  },
  filterControls: {
    display: 'flex',
    gap: 16,
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  filterItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  filterLabel: {
    fontSize: 12,
    color: '#8b949e',
    fontWeight: 500
  },
  select: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 6,
    color: '#e6edf3',
    fontSize: 12,
    padding: '6px 10px',
    outline: 'none',
    cursor: 'pointer'
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: '#58a6ff',
    fontSize: 12,
    cursor: 'pointer',
    padding: '4px 8px',
    textDecoration: 'underline'
  },
  statsBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 12,
    color: '#8b949e',
    marginBottom: 16,
    padding: '0 4px'
  },
  statText: {
    fontSize: 13
  },
  legendPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: '#8b949e'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: 16
  },
  card: {
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: 8,
    padding: 18,
    display: 'flex',
    flexDirection: 'column',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    ':hover': {
      borderColor: '#58a6ff',
      transform: 'translateY(-2px)'
    }
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  urgencyBadge: {
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 12,
    border: '1px solid',
    letterSpacing: '0.04em'
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: 4,
    border: '1px solid'
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#e6edf3',
    margin: '0 0 8px 0',
    lineHeight: 1.35
  },
  cardDesc: {
    fontSize: 12,
    color: '#8b949e',
    margin: '0 0 14px 0',
    lineHeight: 1.45,
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  },
  cardMetaRow: {
    display: 'flex',
    gap: 14,
    fontSize: 11,
    color: '#8b949e',
    marginBottom: 12,
    flexWrap: 'wrap'
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 5
  },
  aiSnippet: {
    display: 'flex',
    gap: 8,
    background: 'rgba(88,166,255,0.06)',
    border: '1px solid rgba(88,166,255,0.15)',
    borderRadius: 6,
    padding: '8px 10px',
    marginBottom: 14
  },
  aiSnippetText: {
    fontSize: 11,
    color: '#c9d1d9',
    lineHeight: 1.4,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  },
  cardFooter: {
    marginTop: 'auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTop: '1px solid #21262d'
  },
  categoryPill: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: 11,
    color: '#8b949e',
    background: '#161b22',
    padding: '3px 8px',
    borderRadius: 4,
    border: '1px solid #21262d'
  },
  exploreBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'none',
    border: 'none',
    color: '#58a6ff',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0
  },
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px'
  },
  emptyCard: {
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: 8,
    padding: '60px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  }
};
