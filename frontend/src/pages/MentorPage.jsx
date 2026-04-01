import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { api } from '../api/client';
import { useStore } from '../store';
import { useSocket } from '../hooks/useSocket';
import TaskPanel from '../components/mentor/TaskPanel';
import MentorPanel from '../components/mentor/MentorPanel';
import ActionBar from '../components/mentor/ActionBar';
import ExplainModal from '../components/mentor/ExplainModal';
import { ArrowLeft, Loader2, Monitor, ShieldAlert, Zap, AlertTriangle, Lightbulb } from 'lucide-react';

export default function MentorPage() {
    const navigate = useNavigate();
    const { token, user } = useStore();

    const [project, setProject] = useState(null);
    const [task, setTask] = useState(null);
    const [milestones, setMilestones] = useState([]);
    const [feedback, setFeedback] = useState([]);
    const [hint, setHint] = useState('');
    const [level, setLevel] = useState(1);
    const [passed, setPassed] = useState(false);
    const [mentorMode, setMentorMode] = useState('normal');
    const [courseCompleted, setCourseCompleted] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [loading, setLoading] = useState(false);
    const [code, setCode] = useState('');
    const [showExplain, setShowExplain] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);



    // -- Real-time Sync State --
    const [previewContent, setPreviewContent] = useState(null); // { original, modified, hash, length }
    const [wsStatus, setWsStatus] = useState({ type: 'idle', message: '' });

    const fetchActiveProject = useCallback(async (isInitial = false) => {
        try {
            if (isInitial) setPageLoading(true);
            const entryRes = await api.getActiveProject();
            
            // PROJECT ENTRY SPEC
            if (!entryRes || !entryRes.projectId) { 
                navigate('/dashboard'); 
                return; 
            }
            
            setProject(entryRes);
            setMentorMode(entryRes.mode || 'self');
            
            if (!entryRes.current_task_id) {
                setCourseCompleted(true);
                return;
            }

            // TASK LOADING SPEC
            const taskRes = await api.getCurrentTask(entryRes.projectId, entryRes.current_task_id);
            if (!taskRes || taskRes.error) {
                setError('Failed to load active task.');
                return;
            }

            setTask(taskRes);
            setCourseCompleted(false);
            setPassed(false);
            setFeedback([]);
            
            const saved = localStorage.getItem(`executor_code_${taskRes.taskId}`);
            if (saved) setCode(saved);
            else setCode(taskRes.starter_template || '');
            
            // HARD REFRESH EXPLOIT FIX: Server-driven DB Lock
            if (taskRes.progress_status === 'awaiting_explanation') {
                setShowExplain(true);
            }
            
        } catch (e) {
            console.error('[ExecutionLoop] Load failed:', e);
            setError('Failed to load execution state. Please refresh.');
        } finally {
            if (isInitial) setPageLoading(false);
        }
    }, [navigate, token]);

    // -- WebSocket Integration --
    const { status, isPrimary, sendMessage, messages } = useSocket(project?.id, token);

    useEffect(() => {
        if (!token) { navigate('/login'); return; }
        fetchActiveProject(true);
    }, [token, fetchActiveProject]);

    // -- Real-time Event Listeners --
    useEffect(() => {
        const handlePreview = (e) => {
            const { original, modified, hash, length } = e.detail;
            setPreviewContent({ original, modified, hash, length });
        };
        const handleSoftDelay = (e) => setWsStatus({ type: 'warning', message: 'Delayed response... retrying.' });
        const handleFailure = (e) => setWsStatus({ type: 'error', message: 'Sync failed after 2 retries.' });
        const handleWarning = (e) => setWsStatus({ type: 'warning', message: e.detail });

        window.addEventListener('ws:code:preview', handlePreview);
        window.addEventListener('ws:soft-delay', handleSoftDelay);
        window.addEventListener('ws:failure', handleFailure);
        window.addEventListener('ws:warning', handleWarning);

        return () => {
            window.removeEventListener('ws:code:preview', handlePreview);
            window.removeEventListener('ws:soft-delay', handleSoftDelay);
            window.removeEventListener('ws:failure', handleFailure);
            window.removeEventListener('ws:warning', handleWarning);
        };
    }, []);

    const stringHash = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return hash;
    };

    const handleApplyPreview = () => {
        if (!previewContent) return;
        
        // Version Guard (Length + Hash)
        const currentHash = stringHash(code);
        if (code.length !== previewContent.length || currentHash !== previewContent.hash) {
            setError('Conflict: Your local code has changed since the mentor suggested these edits.');
            return;
        }

        const acceptedCode = previewContent.modified;
        setCode(acceptedCode);
        setPreviewContent(null);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);

        // LIVE MODE BYPASS FIX: Force validation immediately -> trigger Explain gate
        processAction('code', { code: acceptedCode });
    };

    const handleTakeControl = () => {
        sendMessage('take_control', {});
    };

    useEffect(() => {
        if (task?.taskId && code) {
            localStorage.setItem(`executor_code_${task.taskId}`, code);
        }
    }, [code, task?.taskId]);

    const handlePushPreview = () => {
        if (!code || !task) return;
        const hash = stringHash(code);
        sendMessage('code:preview', {
            original: task.starter_template || '',
            modified: code,
            hash,
            length: code.length
        });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
    };

    const processAction = useCallback(async (type, extra = {}) => {
        if (!task || loading) return;
        setLoading(true);
        setError('');
        try {
            if (type === 'code' && task.file_path) {
                await api.saveFile(task.file_path, extra.code);
            }

            const payload = { type, taskId: task.id, ...extra };
            const res = await api.learningProcess(payload);
            
            if (res.feedback) setFeedback(res.feedback);
            if (res.scaffold) setHint(res.scaffold);
            if (res.level !== undefined) setLevel(res.level);
            if (res.mentorMode) setMentorMode(res.mentorMode);
            
            if (res.action === 'explain') {
                setShowExplain(true);
            } else if (res.passed) {
                setPassed(true);
                setSuccess(true);
                setTimeout(() => {
                    fetchActiveProject();
                }, 2000);
            }
        } catch (e) {
            const msg = e.response?.data?.error || e.message;
            setError('Action failed: ' + msg);
            setFeedback([{ type: 'error', message: msg }]);
        } finally {
            setLoading(false);
        }
    }, [task, loading, fetchActiveProject]);

    const handlePaste = useCallback((e) => {
        const text = e.clipboardData?.getData('text') || '';
        if (text.length > 100 && task?.id) {
            api.logBehavior({
                taskId: task.id,
                type: 'paste',
                content: `Pasted ${text.length} chars`,
                cheatScore: 40
            }).catch(() => {});
        }
    }, [task?.id]);

    const handleRunCode = () => processAction('code', { code });
    const handleHint = () => processAction('hint');
    const handleExplain = (explanation) => {
        setShowExplain(false);
        processAction('explain', { explanation });
    };

    if (pageLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d1117', color: '#8b949e', gap: 12 }}>
                <Loader2 size={20} className="spin" /> Loading...
            </div>
        );
    }

    const getLanguage = (name = '') => {
        const n = name.toLowerCase();
        if (n.includes('jsx') || n.includes('js')) return 'javascript';
        if (n.includes('ts')) return 'typescript';
        if (n.includes('py')) return 'python';
        if (n.includes('html')) return 'html';
        if (n.includes('css')) return 'css';
        return 'javascript';
    };

    return (
        <div style={styles.page}>
            {/* Top Bar */}
            <div style={styles.topBar}>
                <button onClick={() => navigate('/marketplace')} style={styles.backBtn}>
                    <ArrowLeft size={14} /> Marketplace
                </button>
                <span style={styles.pageTitle}>AMIT-BODHIT MENTOR</span>
                {task && <span style={styles.taskBadge}>{task.title}</span>}

                {/* Connection Status & Control */}
                <div style={styles.socketStatusBox}>
                    <div style={{ ...styles.statusDot, background: status === 'open' ? (isPrimary ? '#3fb950' : '#f85149') : '#484f58' }} />
                    <span style={styles.statusText}>
                        {status === 'open' ? (mentorMode === 'live' || !isPrimary ? '🔴 LIVE SESSION' : 'SELF PACED') : 'OFFLINE'}
                    </span>
                    {status === 'open' && !isPrimary && user?.role === 'mentor' && (
                        <button onClick={handleTakeControl} style={styles.takeControlBtn}>Seize Control</button>
                    )}
                </div>
            </div>

            {/* Error/Success/WS Banners */}
            {wsStatus.message && (
                <div style={{ ...styles.errorBanner, background: wsStatus.type === 'error' ? '#842029' : '#9a6700' }}>
                    <AlertTriangle size={14} /> {wsStatus.message}
                </div>
            )}
            {error && <div style={styles.errorBanner}>{error}</div>}
            {success && <div style={styles.successBanner}>✔ Action Successful!</div>}

            {/* Main Layout: Left (Task) | Right (Mentor) */}
            <div style={styles.mainRow}>
                <div style={styles.leftCol}>
                    <TaskPanel task={task} project={project} />
                </div>
                <div style={styles.rightCol}>
                    <MentorPanel 
                        feedback={feedback} 
                        hint={hint} 
                        level={level} 
                        passed={passed} 
                        mentorMode={mentorMode} 
                        courseCompleted={courseCompleted} 
                        messages={messages}
                        onSendMessage={(txt) => sendMessage('chat:send', { text: txt })}
                        isPrimary={isPrimary}
                    />
                </div>
            </div>

            {/* Action Bar */}
            <ActionBar 
                userRole={user?.role}
                onRunCode={handleRunCode} 
                onHint={handleHint} 
                onExplain={() => setShowExplain(true)} 
                onPushPreview={handlePushPreview}
                loading={loading} 
                passed={passed} 
                courseCompleted={courseCompleted}
                onBack={() => navigate('/marketplace')}
                isPrimary={isPrimary}
            />

            {project && !isPrimary && (
                <div style={styles.readOnlyOverlay}>
                    <ShieldAlert size={24} />
                    <span>Another active session is controlling this project. <button onClick={handleTakeControl} style={styles.takeControlLink}>Take Control</button> to edit.</span>
                </div>
            )}

            {/* Monaco Editor */}
            <div style={styles.editorWrap} onPaste={handlePaste}>
                <Editor
                    height="100%"
                    language={getLanguage(task?.title)}
                    theme="vs-dark"
                    value={code}
                    onChange={val => setCode(val || '')}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        fontFamily: '"Fira Code", monospace',
                        padding: { top: 12 },
                        readOnly: loading || passed || !isPrimary
                    }}
                />
            </div>

            {/* Diff Modal (Safe Sync) */}
            {previewContent && (
                <div style={styles.modalOverlay}>
                    <div style={styles.diffModal}>
                        <div style={styles.modalHeader}>
                            <Zap size={18} style={{ color: '#f2cc60' }} />
                            <div>
                                <h3 style={{ margin: 0, fontSize: 16 }}>Mentor Suggestion</h3>
                                <p style={{ margin: 0, fontSize: 12, color: '#8b949e' }}>Compare changes and apply when ready</p>
                            </div>
                            <button onClick={() => setPreviewContent(null)} style={styles.closeBtn}>✕</button>
                        </div>
                        <div style={styles.diffWrapper}>
                            <DiffEditor
                                height="100%"
                                language={getLanguage(task?.title)}
                                theme="vs-dark"
                                original={previewContent.original}
                                modified={previewContent.modified}
                                options={{
                                    fontSize: 12,
                                    renderSideBySide: true,
                                    readOnly: true
                                }}
                            />
                        </div>
                        <div style={styles.modalFooter}>
                            <button onClick={() => setPreviewContent(null)} style={styles.cancelBtn}>Decline</button>
                            <button onClick={handleApplyPreview} style={styles.applyBtn}>Apply Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Explain Modal */}
            {showExplain && (
                <ExplainModal onSubmit={handleExplain} onClose={() => setShowExplain(false)} loading={loading} />
            )}
        </div>
    );
}

const styles = {
    page: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#0d1117', color: '#c9d1d9', fontFamily: 'var(--sans)', position: 'relative' },
    topBar: { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', background: '#010409', borderBottom: '1px solid #21262d', flexShrink: 0 },
    backBtn: { display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: 12, padding: '4px 8px' },
    pageTitle: { fontWeight: 800, fontSize: 12, color: '#58a6ff', letterSpacing: '0.05em' },
    errorBanner: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#842029', color: '#f8d7da', padding: '8px 16px', fontSize: 13, fontWeight: 600 },
    successBanner: { background: '#0f5132', color: '#d2f4ea', padding: '8px 16px', fontSize: 13, fontWeight: 600, textAlign: 'center' },
    taskBadge: { fontSize: 11, color: '#8b949e', background: '#161b22', padding: '4px 10px', borderRadius: 4, fontFamily: 'var(--mono)' },
    
    socketStatusBox: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, background: '#161b22', padding: '4px 8px', borderRadius: 6, border: '1px solid #30363d' },
    statusDot: { width: 8, height: 8, borderRadius: '50%' },
    statusText: { fontSize: 10, fontWeight: 700, color: '#8b949e' },
    takeControlBtn: { background: '#238636', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 10, cursor: 'pointer', fontWeight: 600 },
    
    mainRow: { display: 'flex', flex: 1, minHeight: 0, maxHeight: '42vh' },
    leftCol: { width: '35%', borderRight: '1px solid #21262d', overflow: 'hidden' },
    rightCol: { flex: 1, overflow: 'hidden' },
    editorWrap: { flex: 1, minHeight: 0, borderTop: '1px solid #21262d', position: 'relative' },
    
    readOnlyOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(1, 4, 9, 0.6)', backdropFilter: 'blur(2px)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#f0883e', fontSize: 14, fontWeight: 600 },
    takeControlLink: { background: 'none', border: 'none', color: '#58a6ff', textDecoration: 'underline', cursor: 'pointer', fontWeight: 'inherit', padding: 0 },

    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(1,4,9,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 },
    diffModal: { width: '90%', height: '85%', background: '#0d1117', border: '1px solid #30363d', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' },
    modalHeader: { padding: '16px 24px', borderBottom: '1px solid #30363d', display: 'flex', alignItems: 'center', gap: 16 },
    closeBtn: { marginLeft: 'auto', background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: 18 },
    diffWrapper: { flex: 1, background: '#010409' },
    modalFooter: { padding: '16px 24px', borderTop: '1px solid #30363d', display: 'flex', justifyContent: 'flex-end', gap: 12, background: '#161b22' },
    cancelBtn: { background: 'none', border: '1px solid #30363d', color: '#8b949e', padding: '8px 24px', borderRadius: 6, cursor: 'pointer' },
    applyBtn: { background: '#238636', border: 'none', color: '#fff', padding: '8px 24px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }
};
