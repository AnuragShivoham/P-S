import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShieldAlert, Plus, Trash2, Power, PowerOff, Zap, Users, BarChart3,
    Settings, Save, ToggleLeft, ToggleRight, Puzzle, Globe, UserCog,
    AlertTriangle, CheckCircle, ChevronDown, ChevronRight, Shield
} from 'lucide-react';
import { api } from '../api/client';
import { useStore } from '../store';

const TABS = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 size={16} /> },
    { id: 'features', label: 'App Features', icon: <Settings size={16} /> },
    { id: 'extensions', label: 'Extensions', icon: <Puzzle size={16} /> },
    { id: 'users', label: 'User Management', icon: <Users size={16} /> },
    { id: 'university-applications', label: 'University Applications', icon: <Globe size={16} /> },
    { id: 'labour', label: 'Labour Sources', icon: <Globe size={16} /> },
    { id: 'interventions', label: 'Interventions', icon: <ShieldAlert size={16} /> },
];

const DEFAULT_FEATURES = {
    paste_protection: true,
    paste_protection_desc: 'Block code pasting in the editor to enforce typing practice',
    ai_mentor_enabled: true,
    ai_mentor_desc: 'AI-powered guidance chat in the IDE',
    live_preview: true,
    live_preview_desc: 'Real-time HTML preview panel',
    terminal_enabled: true,
    terminal_desc: 'Integrated terminal with WebSocket PTY',
    git_integration: true,
    git_integration_desc: 'Git clone, push, and version control from the IDE',
    local_sync: true,
    local_sync_desc: 'File System Access API to save files to local disk',
    marketplace_enabled: true,
    marketplace_desc: 'Community project marketplace for browsing and enrolling',
    course_builder: true,
    course_builder_desc: 'Mentor course creation and publishing system',
    behavior_tracking: true,
    behavior_tracking_desc: 'Monitor paste scores and typing patterns for cheating detection',
    mcp_tools: true,
    mcp_tools_desc: 'Model Context Protocol autonomous tool use via chat',
    zip_download: true,
    zip_download_desc: 'Download full workspace as a ZIP archive',
    max_hint_requests: 3,
    max_hint_requests_desc: 'Maximum hint requests per task',
    qa_pass_score: 70,
    qa_pass_score_desc: 'Minimum QA review score to pass a task (0-100)',
    max_sos_requests: 2,
    max_sos_requests_desc: 'Maximum student SOS requests per task',
    platform_name: 'SOCRATES',
    platform_tagline: 'AI Development Hub',
};

export default function AdminPage() {
    const navigate = useNavigate();
    const { role } = useStore();
    const [activeTab, setActiveTab] = useState('overview');
    const [extensions, setExtensions] = useState([]);
    const [newExt, setNewExt] = useState({ name: '', type: 'tool', description: '', command: '' });
    const [settings, setSettings] = useState({ ...DEFAULT_FEATURES });
    const [stats, setStats] = useState({});
    const [dashboardLoading, setDashboardLoading] = useState(true);
    const [dashboardError, setDashboardError] = useState('');
    const [users, setUsers] = useState([]);
    const [universityApplications, setUniversityApplications] = useState([]);
    const [universityApplicationsLoading, setUniversityApplicationsLoading] = useState(false);
    const [universityApplicationsError, setUniversityApplicationsError] = useState('');
    const [universityDecision, setUniversityDecision] = useState(null);
    const [universityDecisionBusy, setUniversityDecisionBusy] = useState(false);
    const [universityDecisionError, setUniversityDecisionError] = useState('');
    const [labourFeeds, setLabourFeeds] = useState([]);
    const [labourRuns, setLabourRuns] = useState([]);
    const [newSourceFeed, setNewSourceFeed] = useState({ name: '', url: '', source_type: 'job_description', organization: '', provider: 'manual', notes: '' });
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');
    const [mentorQueue, setMentorQueue] = useState([]);

    const loadUniversityApplications = async () => {
        setUniversityApplicationsLoading(true);
        setUniversityApplicationsError('');
        try {
            const result = await api.adminGetUniversityApplications();
            setUniversityApplications(Array.isArray(result.applications) ? result.applications : []);
        } catch (error) {
            setUniversityApplicationsError(error.message || 'Unable to load university applications.');
        } finally {
            setUniversityApplicationsLoading(false);
        }
    };

    const loadAll = async () => {
        loadUniversityApplications();
        setDashboardLoading(true);
        setDashboardError('');
        const load = async (label, request, onSuccess) => {
            try {
                const result = await request();
                onSuccess(result);
                return null;
            } catch (error) {
                console.error(`[Admin Dashboard] ${label} failed:`, error);
                return `${label}: ${error.message || 'Request failed'}`;
            }
        };

        const results = await Promise.all([
            load('Extensions', api.adminGetExtensions, result => setExtensions(result)),
            load('Settings', api.adminGetSettings, result => setSettings(previous => ({ ...previous, ...result }))),
            load('Platform stats', api.adminGetStats, result => setStats(result)),
            load('Users', api.adminGetUsers, result => setUsers(result)),
            load('Labour source feeds', api.getLabourSourceFeeds, result => setLabourFeeds(result.feeds || [])),
            load('Labour source runs', api.getLabourSourceRuns, result => setLabourRuns(result.runs || [])),
            load('Interventions', api.getMentorQueue, result => setMentorQueue(result)),
        ]);
        const errors = results.filter(Boolean);
        setDashboardError(errors.join(' · '));
        setDashboardLoading(false);
    };

    useEffect(() => { loadAll(); }, []);

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            await api.adminUpdateSettings(settings);
            setSaveMsg('Settings saved!');
            setTimeout(() => setSaveMsg(''), 3000);
        } catch (e) { alert(e.message); }
        setSaving(false);
    };

    const handleAddExt = async () => {
        if (!newExt.name) return;
        try {
            await api.adminAddExtension(newExt);
            setNewExt({ name: '', type: 'tool', description: '', command: '' });
            loadAll();
        } catch (e) { alert(e.message); }
    };

    const handleToggleExt = async (id, cur) => {
        await api.adminToggleExtension(id, !cur);
        loadAll();
    };

    const handleDeleteExt = async (id) => {
        if (!window.confirm('Remove this extension globally?')) return;
        await api.adminDeleteExtension(id);
        loadAll();
    };

    const handleRoleChange = async (userId, newRole) => {
        if (!window.confirm(`Change this user's role to "${newRole}"?`)) return;
        await api.adminUpdateUserRole(userId, newRole);
        loadAll();
    };

    const handleRoleRevoke = async (userId, roleToRemove) => {
        if (!window.confirm(`Revoke the ${roleToRemove} role from this user?`)) return;
        try {
            await api.adminRevokeUserRole(userId, roleToRemove);
            await loadAll();
        } catch (error) {
            window.alert(error.message);
        }
    };

    const handleUniversityDecision = async () => {
        if (!universityDecision || universityDecisionBusy) return;
        setUniversityDecisionBusy(true);
        setUniversityDecisionError('');
        try {
            const result = await api.adminDecideUniversityApplication(universityDecision.id, universityDecision.action);
            setSaveMsg(result.message || `University application ${universityDecision.action}d.`);
            setUniversityDecision(null);
            await loadUniversityApplications();
        } catch (error) {
            setUniversityDecisionError(error.message || 'Could not update this application.');
        } finally {
            setUniversityDecisionBusy(false);
        }
    };

    const handleCreateSourceFeed = async () => {
        if (!newSourceFeed.name) {
            alert('Source name is required.');
            return;
        }
        try {
            await api.createLabourSourceFeed(newSourceFeed);
            setNewSourceFeed({ name: '', url: '', source_type: 'job_description', organization: '', provider: 'manual', notes: '' });
            await loadAll();
        } catch (error) {
            alert(error.message);
        }
    };

    const handleRunSourceFeed = async (feedId) => {
        try {
            await api.runLabourSourceFeed(feedId, { raw_content: `Approved feed test: ${new Date().toISOString()}\nRole: Software Engineer\nRequirements: Docker, REST API, and automated testing.`, source_url: 'https://approved-feed.internal.example/preview' });
            await loadAll();
        } catch (error) {
            alert(error.message);
        }
    };

    const toggleFeature = (key) => setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    const setFeatureVal = (key, val) => setSettings(prev => ({ ...prev, [key]: val }));

    if (role !== 'admin') {
        return <div style={{ padding: 60, color: '#f85149', textAlign: 'center', fontSize: 18 }}><AlertTriangle size={32} style={{ marginBottom: 12 }} /><br />ACCESS DENIED — Admin Only</div>;
    }

    return (
        <div style={{ display: 'flex', minHeight: 'calc(100vh - 50px)', background: '#010409' }}>
            {universityDecision && <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(0,0,0,.72)' }}>
                <section role="dialog" aria-modal="true" aria-labelledby="university-decision-title" style={{ width: 'min(100%, 460px)', background: '#161b22', border: '1px solid #30363d', borderRadius: 14, padding: 24, boxShadow: '0 20px 70px rgba(0,0,0,.55)' }}>
                    <h2 id="university-decision-title" style={{ margin: '0 0 10px', color: '#e6edf3', fontSize: 20 }}>{universityDecision.action === 'approve' ? 'Approve university application?' : 'Reject university application?'}</h2>
                    <p style={{ margin: '0 0 8px', color: '#c9d1d9', fontWeight: 700 }}>{universityDecision.application.institution_name}</p>
                    <p style={{ margin: '0 0 18px', color: '#8b949e', fontSize: 13, lineHeight: 1.6 }}>
                        {universityDecision.action === 'approve'
                            ? `An email containing a secure sign-up link will be sent to ${universityDecision.application.email}. The link expires in 7 days.`
                            : `The request from ${universityDecision.application.email} will be marked rejected, and no account or institution will be created.`}
                    </p>
                    {universityDecisionError && <div role="alert" style={{ padding: 10, marginBottom: 14, borderRadius: 8, color: '#f85149', background: 'rgba(248,81,73,.1)', border: '1px solid rgba(248,81,73,.3)', fontSize: 12 }}>{universityDecisionError}</div>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9 }}>
                        <button type="button" disabled={universityDecisionBusy} onClick={() => { setUniversityDecision(null); setUniversityDecisionError(''); }} style={S.ghostBtn}>Cancel</button>
                        <button type="button" disabled={universityDecisionBusy} onClick={handleUniversityDecision} style={universityDecision.action === 'approve' ? S.greenBtn : S.dangerBtn}>
                            {universityDecisionBusy ? 'Processing…' : universityDecision.action === 'approve' ? 'Approve & email link' : 'Reject application'}
                        </button>
                    </div>
                </section>
            </div>}
            {/* SIDEBAR */}
            <div style={{ width: 220, background: '#0d1117', borderRight: '1px solid #21262d', padding: '24px 0' }}>
                <div style={{ padding: '0 16px 20px', borderBottom: '1px solid #21262d', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ShieldAlert size={20} color="#f85149" />
                        <span style={{ fontWeight: 800, fontSize: 14, color: '#e6edf3' }}>ADMIN PANEL</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#8b949e', marginTop: 4 }}>Platform Control Center</div>
                </div>
                {TABS.map(tab => (
                    <div
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id);
                            if (tab.id === 'university-applications') loadUniversityApplications();
                        }}
                        style={{
                            padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                            fontSize: 13, fontWeight: 600, margin: '2px 8px', borderRadius: 6,
                            background: activeTab === tab.id ? 'rgba(88,166,255,0.1)' : 'transparent',
                            color: activeTab === tab.id ? '#58a6ff' : '#8b949e',
                            borderLeft: activeTab === tab.id ? '3px solid #58a6ff' : '3px solid transparent',
                        }}
                    >
                        {tab.icon} {tab.label}
                    </div>
                ))}
            </div>

            {/* MAIN CONTENT */}
            <div style={{ flex: 1, padding: 32, overflowY: 'auto', maxHeight: 'calc(100vh - 50px)' }}>

                {/* ═══ OVERVIEW TAB ═══ */}
                {activeTab === 'overview' && (
                    <div>
                        {dashboardError && <div role="alert" style={{ background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 8, padding: 12, marginBottom: 16, color: '#f85149' }}>Some dashboard data could not be loaded: {dashboardError} <button type="button" onClick={loadAll} style={{ ...S.ghostBtn, marginLeft: 8 }}>{dashboardLoading ? 'Refreshing…' : 'Retry'}</button></div>}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h2 style={{ ...S.pageTitle, margin: 0 }}>Platform Overview</h2>
                            <button
                                onClick={() => navigate('/labour-intelligence')}
                                style={{ ...S.ghostBtn, display: 'flex', alignItems: 'center', gap: 6, color: '#58a6ff', borderColor: 'rgba(88,166,255,0.3)', padding: '6px 12px', fontSize: 12 }}
                            >
                                📊 Labour Intelligence →
                            </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
                            <StatCard label="Total Users" value={dashboardLoading ? '…' : stats.totalUsers ?? (dashboardError ? 'Error' : 0)} color="#58a6ff" />
                            <StatCard label="Students" value={dashboardLoading ? '…' : stats.students ?? (dashboardError ? 'Error' : 0)} color="#3fb950" />
                            <StatCard label="Mentors" value={dashboardLoading ? '…' : stats.mentors ?? (dashboardError ? 'Error' : 0)} color="#f2cc60" />
                            <StatCard label="Admins" value={dashboardLoading ? '…' : stats.admins ?? (dashboardError ? 'Error' : 0)} color="#f85149" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
                            <StatCard label="Total Projects" value={dashboardLoading ? '…' : stats.totalProjects ?? (dashboardError ? 'Error' : 0)} color="#a371f7" />
                            <StatCard label="Active Projects" value={dashboardLoading ? '…' : stats.activeProjects ?? (dashboardError ? 'Error' : 0)} color="#3fb950" />
                            <StatCard label="Courses" value={dashboardLoading ? '…' : `${stats.activeCourses ?? 0}/${stats.totalCourses ?? 0}`} color="#58a6ff" />
                            <StatCard label="Extensions" value={dashboardLoading ? '…' : stats.extensions ?? (dashboardError ? 'Error' : 0)} color="#f2cc60" />
                        </div>
                        {(stats.communityPending || 0) > 0 && (
                            <div style={{ background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 8, padding: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
                                <AlertTriangle size={20} color="#f85149" />
                                <span style={{ color: '#f85149', fontWeight: 600 }}>{stats.communityPending} community project(s) pending approval</span>
                            </div>
                        )}
                    </div>
                )}

                {/* ═══ APP FEATURES TAB ═══ */}
                {activeTab === 'features' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h2 style={S.pageTitle}>App Features & Configuration</h2>
                            <button onClick={handleSaveSettings} disabled={saving} style={S.saveBtn}>
                                <Save size={14} /> {saving ? 'Saving...' : 'Save All Changes'}
                            </button>
                        </div>
                        {saveMsg && <div style={{ background: 'rgba(63,185,80,0.1)', border: '1px solid rgba(63,185,80,0.4)', color: '#3fb950', padding: '8px 16px', borderRadius: 6, marginBottom: 16, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle size={14} /> {saveMsg}</div>}

                        <SectionTitle>Branding</SectionTitle>
                        <div style={S.card}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label style={S.label}>Platform Name</label>
                                    <input style={S.input} value={settings.platform_name || ''} onChange={e => setFeatureVal('platform_name', e.target.value)} />
                                </div>
                                <div>
                                    <label style={S.label}>Tagline</label>
                                    <input style={S.input} value={settings.platform_tagline || ''} onChange={e => setFeatureVal('platform_tagline', e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <SectionTitle>Core IDE Features</SectionTitle>
                        <div style={S.card}>
                            <FeatureToggle label="AI Mentor Chat" desc={settings.ai_mentor_desc} on={settings.ai_mentor_enabled} onToggle={() => toggleFeature('ai_mentor_enabled')} />
                            <FeatureToggle label="Live Preview" desc={settings.live_preview_desc} on={settings.live_preview} onToggle={() => toggleFeature('live_preview')} />
                            <FeatureToggle label="Integrated Terminal" desc={settings.terminal_desc} on={settings.terminal_enabled} onToggle={() => toggleFeature('terminal_enabled')} />
                            <FeatureToggle label="Git Integration" desc={settings.git_integration_desc} on={settings.git_integration} onToggle={() => toggleFeature('git_integration')} />
                            <FeatureToggle label="Local File Sync" desc={settings.local_sync_desc} on={settings.local_sync} onToggle={() => toggleFeature('local_sync')} />
                            <FeatureToggle label="ZIP Download" desc={settings.zip_download_desc} on={settings.zip_download} onToggle={() => toggleFeature('zip_download')} />
                            <FeatureToggle label="MCP Tools (Autonomous)" desc={settings.mcp_tools_desc} on={settings.mcp_tools} onToggle={() => toggleFeature('mcp_tools')} />
                        </div>

                        <SectionTitle>Learning & Security</SectionTitle>
                        <div style={S.card}>
                            <FeatureToggle label="Paste Protection" desc={settings.paste_protection_desc} on={settings.paste_protection} onToggle={() => toggleFeature('paste_protection')} />
                            <FeatureToggle label="Behavior Tracking" desc={settings.behavior_tracking_desc} on={settings.behavior_tracking} onToggle={() => toggleFeature('behavior_tracking')} />
                            <div style={S.featureRow}>
                                <div style={{ flex: 1 }}>
                                    <div style={S.featureLabel}>QA Pass Score</div>
                                    <div style={S.featureDesc}>{settings.qa_pass_score_desc}</div>
                                </div>
                                <input type="number" style={{ ...S.input, width: 80, textAlign: 'center' }} value={settings.qa_pass_score || 70} onChange={e => setFeatureVal('qa_pass_score', Number(e.target.value))} />
                            </div>
                            <div style={S.featureRow}>
                                <div style={{ flex: 1 }}>
                                    <div style={S.featureLabel}>Max Hint Requests</div>
                                    <div style={S.featureDesc}>{settings.max_hint_requests_desc}</div>
                                </div>
                                <input type="number" style={{ ...S.input, width: 80, textAlign: 'center' }} value={settings.max_hint_requests || 3} onChange={e => setFeatureVal('max_hint_requests', Number(e.target.value))} />
                            </div>
                            <div style={S.featureRow}>
                                <div style={{ flex: 1 }}>
                                    <div style={S.featureLabel}>Max SOS Requests</div>
                                    <div style={S.featureDesc}>{settings.max_sos_requests_desc}</div>
                                </div>
                                <input type="number" style={{ ...S.input, width: 80, textAlign: 'center' }} value={settings.max_sos_requests || 2} onChange={e => setFeatureVal('max_sos_requests', Number(e.target.value))} />
                            </div>
                        </div>

                        <SectionTitle>Platform Modules</SectionTitle>
                        <div style={S.card}>
                            <FeatureToggle label="Marketplace" desc={settings.marketplace_desc} on={settings.marketplace_enabled} onToggle={() => toggleFeature('marketplace_enabled')} />
                            <FeatureToggle label="Course Builder" desc={settings.course_builder_desc} on={settings.course_builder} onToggle={() => toggleFeature('course_builder')} />
                        </div>
                    </div>
                )}

                {/* ═══ EXTENSIONS TAB ═══ */}
                {activeTab === 'extensions' && (
                    <div>
                        <h2 style={S.pageTitle}>Global Extensions</h2>
                        <p style={{ color: '#8b949e', fontSize: 13, marginBottom: 24 }}>Extensions added here appear in every user's Extension Hub across all projects.</p>
                        <div style={S.card}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#e6edf3', marginBottom: 16 }}>Register New Extension</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                <input style={S.input} placeholder="Extension Name" value={newExt.name} onChange={e => setNewExt({ ...newExt, name: e.target.value })} />
                                <select style={S.input} value={newExt.type} onChange={e => setNewExt({ ...newExt, type: e.target.value })}>
                                    <option value="tool">Standard Tool</option>
                                    <option value="mcp">MCP Protocol Server</option>
                                    <option value="agent">Autonomous Agent</option>
                                </select>
                            </div>
                            <input style={{ ...S.input, marginBottom: 12 }} placeholder="Short description..." value={newExt.description} onChange={e => setNewExt({ ...newExt, description: e.target.value })} />
                            <input style={{ ...S.input, marginBottom: 12 }} placeholder="npx command (e.g., @modelcontextprotocol/server-postgres)" value={newExt.command} onChange={e => setNewExt({ ...newExt, command: e.target.value })} />
                            <button onClick={handleAddExt} style={S.greenBtn}><Plus size={14} /> Deploy to Platform</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
                            {extensions.map(ex => (
                                <div key={ex.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...S.card }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <span style={{ fontSize: 15, fontWeight: 700, color: '#e6edf3' }}>{ex.name}</span>
                                            <span style={S.badge(ex.type === 'mcp' ? '#f2cc60' : ex.type === 'agent' ? '#a371f7' : '#58a6ff')}>{ex.type.toUpperCase()}</span>
                                            <span style={S.badge(ex.is_active ? '#3fb950' : '#f85149')}>{ex.is_active ? 'ACTIVE' : 'OFF'}</span>
                                        </div>
                                        <div style={{ fontSize: 12, color: '#8b949e' }}>{ex.description}</div>
                                        {ex.command && <code style={{ fontSize: 11, color: '#58a6ff' }}>{ex.command}</code>}
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                        <button onClick={() => handleToggleExt(ex.id, ex.is_active)} style={S.ghostBtn}>{ex.is_active ? <><PowerOff size={14} /> Disable</> : <><Power size={14} /> Enable</>}</button>
                                        <button onClick={() => handleDeleteExt(ex.id)} style={S.dangerBtn}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                            {extensions.length === 0 && <div style={{ textAlign: 'center', color: '#484f58', padding: 32 }}>No extensions deployed yet.</div>}
                        </div>
                    </div>
                )}

                {/* ═══ USER MANAGEMENT TAB ═══ */}
                {activeTab === 'users' && (
                    <div>
                        <h2 style={S.pageTitle}>User Management</h2>
                        <p style={{ color: '#8b949e', fontSize: 13, marginBottom: 24 }}>Grant or revoke platform roles. Mentor and university capabilities require an explicit administrator grant; role changes are audited.</p>
                        <div style={{ background: '#0d1117', borderRadius: 8, border: '1px solid #21262d', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #21262d' }}>
                                        <th style={S.th}>Name</th>
                                        <th style={S.th}>Email</th>
                                        <th style={S.th}>Role</th>
                                        <th style={S.th}>Skill</th>
                                        <th style={S.th}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id} style={{ borderBottom: '1px solid #161b22' }}>
                                            <td style={S.td}>{u.name || '—'}</td>
                                            <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 11 }}>{u.email}</td>
                                            <td style={S.td}>
                                                {(Array.isArray(u.roles) ? u.roles : [u.role]).map(grantedRole => <span key={grantedRole} style={{ ...S.badge(grantedRole === 'admin' ? '#f85149' : grantedRole === 'mentor' || grantedRole === 'university' ? '#f2cc60' : '#3fb950'), marginRight: 5 }}>{grantedRole.toUpperCase()}</span>)}
                                            </td>
                                            <td style={S.td}>{u.skill_level || '—'}</td>
                                            <td style={S.td}>
                                                <select
                                                    style={{ ...S.input, width: 'auto', padding: '4px 8px', fontSize: 11 }}
                                                    value={u.role}
                                                    onChange={e => handleRoleChange(u.id, e.target.value)}
                                                >
                                                    <option value="student">Student</option>
                                                    <option value="citizen">Citizen</option>
                                                    <option value="mentor">Mentor</option>
                                                    <option value="university">University</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                                <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                                                    {(Array.isArray(u.roles) ? u.roles : [u.role]).filter(grantedRole => grantedRole !== 'student').map(grantedRole => (
                                                        <button key={grantedRole} onClick={() => handleRoleRevoke(u.id, grantedRole)} style={{ ...S.ghostBtn, padding: '3px 7px', fontSize: 10 }}>Revoke {grantedRole}</button>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {users.length === 0 && <div style={{ textAlign: 'center', color: '#484f58', padding: 32 }}>No users found.</div>}
                        </div>
                    </div>
                )}

                {activeTab === 'university-applications' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                            <h2 style={S.pageTitle}>University registration requests</h2>
                            <button type="button" onClick={loadUniversityApplications} disabled={universityApplicationsLoading} style={S.ghostBtn}>
                                {universityApplicationsLoading ? 'Refreshing…' : 'Refresh applications'}
                            </button>
                        </div>
                        <p style={{ color: '#8b949e', fontSize: 13, marginBottom: 24 }}>Review applications. New requests remain pending until reviewed. Approval sends a single-use, seven-day sign-up link.</p>
                        {universityApplicationsError && <div role="alert" style={{ background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 8, padding: 12, marginBottom: 16, color: '#f85149' }}>{universityApplicationsError}</div>}
                        <div style={{ display: 'grid', gap: 12 }}>
                            {universityApplications.map(application => (
                                <section key={application.id} style={{ ...S.card, display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <div>
                                        <div style={{ color: '#e6edf3', fontWeight: 700 }}>{application.institution_name}</div>
                                        <div style={{ color: '#8b949e', fontSize: 12, marginTop: 5 }}>{application.contact_name} · {application.email}</div>
                                        {application.website && <a href={application.website} target="_blank" rel="noreferrer" style={{ color: '#58a6ff', fontSize: 12 }}>{application.website}</a>}
                                        <div style={{ color: application.status === 'pending' ? '#d29922' : application.status === 'approved' ? '#3fb950' : '#f85149', fontSize: 10, textTransform: 'uppercase', marginTop: 6 }}>{application.status}</div>
                                    </div>
                                    {application.status === 'pending' && <div style={{ display: 'flex', gap: 8 }}>
                                        <button onClick={() => { setUniversityDecision({ id: application.id, application, action: 'approve' }); setUniversityDecisionError(''); }} style={S.greenBtn}><CheckCircle size={14} /> Approve & email link</button>
                                        <button onClick={() => { setUniversityDecision({ id: application.id, application, action: 'reject' }); setUniversityDecisionError(''); }} style={S.dangerBtn}><Trash2 size={14} /> Reject</button>
                                    </div>}
                                </section>
                            ))}
                            {!universityApplicationsLoading && !universityApplicationsError && universityApplications.length === 0 && <div style={{ textAlign: 'center', color: '#8b949e', padding: 32 }}>No university applications have been submitted.</div>}
                            {universityApplicationsLoading && universityApplications.length === 0 && <div role="status" style={{ textAlign: 'center', color: '#8b949e', padding: 32 }}>Loading university applications…</div>}
                        </div>
                    </div>
                )}

                {/* ═══ LABOUR SOURCE GOVERNANCE TAB ═══ */}
                {activeTab === 'labour' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <div>
                                <h2 style={{ ...S.pageTitle, margin: 0 }}>Labour Source Governance</h2>
                                <p style={{ color: '#8b949e', fontSize: 13, marginTop: 4, marginBottom: 0 }}>Approved feeds and ingestion runs are tracked centrally so the model is fed only through governed, deduplicated sources.</p>
                            </div>
                            <button
                                onClick={() => navigate('/labour-intelligence')}
                                style={{ ...S.greenBtn, background: 'rgba(88,166,255,0.15)', borderColor: 'rgba(88,166,255,0.4)', color: '#58a6ff', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12 }}
                            >
                                📊 Full Dataloka Intelligence Hub →
                            </button>
                        </div>

                        <div style={{ ...S.card, marginBottom: 20 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#e6edf3', marginBottom: 12 }}>Register Approved Source Feed</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                <input style={S.input} placeholder="Feed name" value={newSourceFeed.name} onChange={e => setNewSourceFeed({ ...newSourceFeed, name: e.target.value })} />
                                <select style={S.input} value={newSourceFeed.source_type} onChange={e => setNewSourceFeed({ ...newSourceFeed, source_type: e.target.value })}>
                                    <option value="job_description">Job Description</option>
                                    <option value="internship">Internship</option>
                                    <option value="employer_form">Employer Form</option>
                                    <option value="expert_input">Expert Input</option>
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                <input style={S.input} placeholder="Source URL" value={newSourceFeed.url} onChange={e => setNewSourceFeed({ ...newSourceFeed, url: e.target.value })} />
                                <input style={S.input} placeholder="Organization" value={newSourceFeed.organization} onChange={e => setNewSourceFeed({ ...newSourceFeed, organization: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                <select style={S.input} value={newSourceFeed.provider} onChange={e => setNewSourceFeed({ ...newSourceFeed, provider: e.target.value })}>
                                    <option value="manual">Manual</option>
                                    <option value="api">API</option>
                                    <option value="rss">RSS</option>
                                    <option value="sitemap">Sitemap</option>
                                </select>
                                <input style={S.input} placeholder="Cron expression (optional)" value={newSourceFeed.cron_expression || ''} onChange={e => setNewSourceFeed({ ...newSourceFeed, cron_expression: e.target.value })} />
                            </div>
                            <textarea style={{ ...S.input, minHeight: 80, marginBottom: 12 }} placeholder="Notes or intake rules" value={newSourceFeed.notes} onChange={e => setNewSourceFeed({ ...newSourceFeed, notes: e.target.value })} />
                            <button onClick={handleCreateSourceFeed} style={S.greenBtn}><Plus size={14} /> Save Approved Feed</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
                            <div style={S.card}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#e6edf3', marginBottom: 12 }}>Approved Source Feeds</div>
                                {labourFeeds.length === 0 ? <div style={{ color: '#8b949e' }}>No approved feeds yet.</div> : labourFeeds.map(feed => (
                                    <div key={feed.id} style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 8, padding: 12, marginBottom: 10 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <div style={{ fontWeight: 700, color: '#e6edf3' }}>{feed.name}</div>
                                            <span style={S.badge(feed.status === 'active' ? '#3fb950' : '#f2cc60')}>{feed.status || 'draft'}</span>
                                        </div>
                                        <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 6 }}>{feed.organization || 'Unspecified organization'} · {feed.provider || 'manual'}</div>
                                        <div style={{ fontSize: 11, color: '#58a6ff', wordBreak: 'break-word' }}>{feed.url || 'No URL configured'}</div>
                                        <button onClick={() => handleRunSourceFeed(feed.id)} style={{ ...S.ghostBtn, marginTop: 10 }}><Zap size={12} /> Run intake check</button>
                                    </div>
                                ))}
                            </div>

                            <div style={S.card}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#e6edf3', marginBottom: 12 }}>Recent Ingestion Runs</div>
                                {labourRuns.length === 0 ? <div style={{ color: '#8b949e' }}>No ingestion runs yet.</div> : labourRuns.map(run => (
                                    <div key={run.id} style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 8, padding: 12, marginBottom: 10 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                            <div style={{ fontWeight: 600, color: '#e6edf3' }}>{run.feed_name || 'Manual run'}</div>
                                            <span style={S.badge(run.status === 'success' ? '#3fb950' : run.status === 'duplicate' ? '#f2cc60' : '#58a6ff')}>{run.status}</span>
                                        </div>
                                        <div style={{ fontSize: 11, color: '#8b949e' }}>{run.created_at}</div>
                                        {run.summary && <div style={{ fontSize: 12, color: '#c9d1d9', marginTop: 8 }}>{run.summary}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══ INTERVENTIONS TAB ═══ */}
                {activeTab === 'interventions' && (
                    <div>
                        <h2 style={S.pageTitle}>Active Interventions</h2>
                        <p style={{ color: '#8b949e', fontSize: 13, marginBottom: 24 }}>Monitor all active student SOS requests and guide assignments.</p>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
                            {mentorQueue.map(item => (
                                <div key={item.projectId} style={{ ...S.card, borderLeft: `4px solid ${item.help_requested > 2 ? '#f85149' : '#f2cc60'}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                        <div>
                                            <div style={{ fontSize: 15, fontWeight: 800, color: '#e6edf3' }}>{item.studentName}</div>
                                            <div style={{ fontSize: 12, color: '#8b949e' }}>{item.taskTitle}</div>
                                        </div>
                                        <div style={S.badge(item.help_requested > 2 ? '#f85149' : '#f2cc60')}>SOS x{item.help_requested}</div>
                                    </div>

                                    <div style={{ background: '#0d1117', padding: 10, borderRadius: 6, marginBottom: 12 }}>
                                        <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>PROJECT CONTEXT</div>
                                        <div style={{ fontSize: 12, color: '#e6edf3', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                            {(item.projectStack ? (Array.isArray(JSON.parse(item.projectStack)) ? JSON.parse(item.projectStack) : []) : []).map(s => (
                                                <span key={s} style={{ background: '#21262d', padding: '2px 6px', borderRadius: 4 }}>{s}</span>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontSize: 11, color: item.timeStuckMinutes > 30 ? '#f85149' : '#8b949e' }}>
                                            Stuck for {Math.floor(item.timeStuckMinutes)}m
                                        </div>
                                        <div style={{ fontSize: 11, color: '#58a6ff', fontWeight: 700 }}>
                                            REQ MENTOR: {item.requested_mentor_id || 'ANY'}
                                        </div>
                                    </div>
                                    
                                    <div style={{ marginTop: 12, pt: 12, borderTop: '1px solid #21262d', display: 'flex', gap: 8 }}>
                                         <button onClick={() => window.location.href = '/mentor'} style={{ ...S.ghostBtn, flex: 1, justifyContent: 'center' }}>Open Mentor View</button>
                                    </div>
                                </div>
                            ))}
                            {mentorQueue.length === 0 && (
                                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 48, color: '#484f58' }}>
                                    <CheckCircle size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                                    <div>All students are clear. No pending interventions.</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Sub-components ──────────────────────────────────────────────
function StatCard({ label, value, color }) {
    return (
        <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 8, padding: 20, borderTop: `3px solid ${color}` }}>
            <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 12, color: '#8b949e', marginTop: 4 }}>{label}</div>
        </div>
    );
}

function SectionTitle({ children }) {
    return <div style={{ fontSize: 12, fontWeight: 800, color: '#8b949e', letterSpacing: '0.05em', margin: '24px 0 12px', textTransform: 'uppercase' }}>{children}</div>;
}

function FeatureToggle({ label, desc, on, onToggle }) {
    return (
        <div style={S.featureRow}>
            <div style={{ flex: 1 }}>
                <div style={S.featureLabel}>{label}</div>
                <div style={S.featureDesc}>{desc}</div>
            </div>
            <div onClick={onToggle} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                {on ? <ToggleRight size={28} color="#3fb950" /> : <ToggleLeft size={28} color="#484f58" />}
            </div>
        </div>
    );
}

// ─── Styles ──────────────────────────────────────────────────────
const S = {
    pageTitle: { margin: '0 0 8px', fontSize: 22, color: '#e6edf3', fontWeight: 800 },
    card: { background: '#161b22', border: '1px solid #21262d', borderRadius: 8, padding: 20, marginBottom: 12 },
    input: {
        width: '100%', background: '#010409', border: '1px solid #30363d', color: '#e6edf3',
        padding: '8px 12px', borderRadius: 6, fontSize: 13, outline: 'none'
    },
    label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#c9d1d9', marginBottom: 6 },
    saveBtn: {
        background: '#238636', color: 'white', border: '1px solid #2ea043', padding: '8px 20px',
        borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
    },
    greenBtn: {
        background: '#238636', color: 'white', border: '1px solid #2ea043', padding: '8px 16px',
        borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
    },
    ghostBtn: {
        background: '#21262d', border: '1px solid #30363d', color: '#c9d1d9', cursor: 'pointer',
        padding: '6px 12px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12
    },
    dangerBtn: {
        background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.4)', color: '#f85149',
        cursor: 'pointer', padding: '6px 10px', borderRadius: 6, display: 'flex', alignItems: 'center'
    },
    featureRow: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 0', borderBottom: '1px solid #21262d'
    },
    featureLabel: { fontSize: 14, fontWeight: 600, color: '#e6edf3' },
    featureDesc: { fontSize: 11, color: '#8b949e', marginTop: 2 },
    badge: (color) => ({
        fontSize: 10, fontWeight: 800, color, background: `${color}18`, padding: '2px 8px',
        borderRadius: 12, border: `1px solid ${color}60`
    }),
    th: {
        textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 800, color: '#8b949e',
        background: '#161b22', letterSpacing: '0.05em'
    },
    td: { padding: '10px 16px', fontSize: 13, color: '#c9d1d9' },
};
