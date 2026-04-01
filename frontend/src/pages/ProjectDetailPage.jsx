import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useStore } from '../store';
import { ArrowLeft, Play, Loader2, Clock, Star, CheckCircle } from 'lucide-react';

const DIFF_COLORS = {
    beginner: '#3fb950',
    intermediate: '#f0883e',
    advanced: '#f85149'
};

export default function ProjectDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useStore();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);

    useEffect(() => {
        if (!token) { navigate('/login'); return; }
        (async () => {
            try {
                const res = await api.getMarketplace();
                const found = (res.projects || []).find(p => p.id === id);
                setProject(found || null);
            } catch (e) {
                console.error('[Detail]', e);
            }
            setLoading(false);
        })();
    }, [id, token]);

    const handleStart = async () => {
        setStarting(true);
        try {
            // Navigate to mentor — the project will be loaded from active_project_id
            navigate('/mentor');
        } catch (e) {
            console.error('[Start]', e);
        }
        setStarting(false);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d1117', color: '#8b949e', gap: 12 }}>
                <Loader2 size={20} className="spin" /> Loading project...
            </div>
        );
    }

    if (!project) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d1117', color: '#8b949e', gap: 12 }}>
                <p>Project not found</p>
                <button onClick={() => navigate('/marketplace')} style={styles.backBtn}><ArrowLeft size={14} /> Back to Marketplace</button>
            </div>
        );
    }

    let techStack = [];
    try {
        techStack = Array.isArray(project.tech_stack) ? project.tech_stack : JSON.parse(project.tech_stack || '[]');
    } catch (e) {
        techStack = (project.tech_stack || '').split(',').map(s => s.trim()).filter(Boolean);
    }

    return (
        <div style={styles.page}>
            <button onClick={() => navigate('/marketplace')} style={styles.backBtn}>
                <ArrowLeft size={14} /> Back to Marketplace
            </button>

            <div style={styles.content}>
                {/* Header Section */}
                <div style={styles.headerSection}>
                    <div style={styles.headerTop}>
                        <span style={{
                            ...styles.badge,
                            background: project.badge === 'official' ? 'rgba(88, 166, 255, 0.15)' : 'rgba(240, 136, 62, 0.15)',
                            color: project.badge === 'official' ? '#58a6ff' : '#f0883e'
                        }}>
                            {project.badge === 'official' ? '🔵 Official' : '🟡 Community'}
                        </span>
                        <span style={{ color: DIFF_COLORS[project.difficulty] || '#8b949e', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
                            {project.difficulty || 'intermediate'}
                        </span>
                    </div>

                    <h1 style={styles.title}>{project.title}</h1>
                    <p style={styles.description}>{project.description}</p>
                </div>

                {/* Info Grid */}
                <div style={styles.infoGrid}>
                    {techStack.length > 0 && (
                        <div style={styles.infoCard}>
                            <h4 style={styles.infoTitle}>Tech Stack</h4>
                            <div style={styles.tagRow}>
                                {techStack.map((t, i) => (
                                    <span key={i} style={styles.techTag}>{t}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {project.estimated_hours && (
                        <div style={styles.infoCard}>
                            <h4 style={styles.infoTitle}>Estimated Time</h4>
                            <div style={styles.metaValue}>
                                <Clock size={16} style={{ color: '#58a6ff' }} />
                                <span>{project.estimated_hours} hours</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Start Button — EXECUTION FIRST */}
                <button onClick={handleStart} disabled={starting} style={styles.startBtn}>
                    {starting ? <Loader2 size={16} className="spin" /> : <Play size={16} />}
                    <span style={{ fontSize: 15, fontWeight: 700 }}>Start Project Now</span>
                </button>
            </div>
        </div>
    );
}

const styles = {
    page: { minHeight: '100vh', background: '#0d1117', color: '#c9d1d9', padding: '24px 32px', fontFamily: 'var(--sans)' },
    backBtn: { display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: 12, padding: '6px 0', marginBottom: 24 },
    content: { maxWidth: 720, margin: '0 auto' },
    headerSection: { marginBottom: 32 },
    headerTop: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
    badge: { fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6 },
    title: { fontSize: 28, fontWeight: 800, color: '#e6edf3', margin: '0 0 12px 0', lineHeight: 1.3 },
    description: { fontSize: 14, color: '#8b949e', lineHeight: 1.7 },
    infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 },
    infoCard: { background: '#161b22', border: '1px solid #21262d', borderRadius: 10, padding: 16 },
    infoTitle: { fontSize: 11, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px 0' },
    tagRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
    techTag: { padding: '4px 8px', borderRadius: 4, background: '#0d1117', color: '#7ee787', fontSize: 11, fontFamily: 'var(--mono)' },
    metaValue: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 700, color: '#e6edf3' },
    startBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '16px', borderRadius: 10, background: 'linear-gradient(135deg, #238636, #2ea043)', color: '#fff', border: 'none', fontSize: 14, cursor: 'pointer', transition: 'all 0.2s' }
};
